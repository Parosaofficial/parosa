-- ============================================================
-- Parosa 0016 — permanent table links, guest requests, Seat Reserve
--
-- • Table links never change: a deleted table's number is retired
--   (restaurants.table_code_hi), and an Off table answers "not taking orders"
--   instead of silently letting guests order without a session.
-- • Guests can call a waiter / ask for the bill from their phone; the owner
--   sees it on the live floor. Orders get a kitchen note.
-- • Seat Reserve: a sky-grid floor of halls (each with an entry side the
--   owner picks); tables sit in equal slots inside a hall (area = hall name,
--   floor_slot = order). Each table has a booking price. Public booking page
--   /<slug>/book and a reservations list. No payment up front — the booking
--   charge is added to the table bill.
--
-- Safe to run more than once.
-- ============================================================

-- 1) Permanent links ------------------------------------------
alter table public.restaurants add column if not exists table_code_hi int not null default 0;

update public.restaurants r
   set table_code_hi = greatest(r.table_code_hi, coalesce((
     select max(t.code::int) from public.restaurant_tables t
      where t.restaurant_id = r.id and t.code ~ '^[0-9]{1,6}$'), 0));

-- every new numeric code raises the high-water mark, so a deleted number is never handed out again
create or replace function public.rtables_code_hi() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.code ~ '^[0-9]{1,6}$' then
    update restaurants set table_code_hi = greatest(table_code_hi, new.code::int) where id = new.restaurant_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_rtables_code_hi on public.restaurant_tables;
create trigger trg_rtables_code_hi after insert on public.restaurant_tables
  for each row execute function public.rtables_code_hi();

-- the code in the QR link can't be edited once printed
create or replace function public.rtables_code_lock() returns trigger
language plpgsql as $$
begin
  if new.code <> old.code then raise exception 'A table''s QR code can''t be changed'; end if;
  return new;
end $$;
drop trigger if exists trg_rtables_code_lock on public.restaurant_tables;
create trigger trg_rtables_code_lock before update on public.restaurant_tables
  for each row execute function public.rtables_code_lock();

-- 2) Floor plan + booking price on each table ------------------
alter table public.restaurant_tables
  add column if not exists on_floor   boolean not null default false,
  add column if not exists floor_slot int     not null default 0,      -- order inside its hall
  add column if not exists bookable   boolean not null default true,
  add column if not exists book_price int     not null default 0;

-- halls, in order: [{ "name": "Main hall", "entry": "bottom" }] — entry is top | bottom | left | right
alter table public.restaurants
  add column if not exists floor_halls      jsonb   not null default '[]'::jsonb,
  add column if not exists reserve_on       boolean not null default false,
  add column if not exists reserve_hold_min int     not null default 120,
  add column if not exists reserve_days     int     not null default 7,
  add column if not exists reserve_from     text    not null default '12:00',
  add column if not exists reserve_to       text    not null default '22:30';

-- 3) Guest requests + kitchen note -----------------------------
alter table public.table_sessions
  add column if not exists waiter_call_at   timestamptz,
  add column if not exists bill_asked_at    timestamptz,
  add column if not exists booking_charge   int not null default 0,
  add column if not exists reservation_id   uuid;

alter table public.orders add column if not exists note text;

-- 4) Reservations -----------------------------------------------
create table if not exists public.reservations (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id      uuid not null references public.restaurant_tables(id) on delete cascade,
  code          text not null,                 -- B-4K7Q, shown to the guest
  guest_name    text not null,
  phone         text not null,
  people        int  not null default 2,
  note          text,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  price         int  not null default 0,
  status        text not null default 'booked' check (status in ('booked', 'seated', 'cancelled', 'noshow')),
  created_at    timestamptz not null default now()
);
create index if not exists idx_resv_rest on public.reservations(restaurant_id, starts_at);
create index if not exists idx_resv_table on public.reservations(table_id, starts_at);

alter table public.reservations enable row level security;
revoke all on public.reservations from anon;
grant select, update on public.reservations to authenticated;
drop policy if exists p_resv_owner_read on public.reservations;
create policy p_resv_owner_read on public.reservations for select to authenticated
  using (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));
drop policy if exists p_resv_owner_update on public.reservations;
create policy p_resv_owner_update on public.reservations for update to authenticated
  using      (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'reservations') then
    alter publication supabase_realtime add table public.reservations;
  end if;
end $$;

-- no-shows: a booking nobody turned up for frees its table 20 minutes after the time
create or replace function public.reservations_sweep(p_restaurant uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update reservations set status = 'noshow'
   where restaurant_id = p_restaurant and status = 'booked' and starts_at < now() - interval '20 minutes';
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.reservations_sweep(uuid) to anon, authenticated;

-- 5) Guest: open or join the table's session (now knows Off / unknown tables) --
create or replace function public.table_session_join(
  p_restaurant uuid, p_table text, p_lat double precision default null, p_lng double precision default null, p_session uuid default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  r restaurants%rowtype;
  t restaurant_tables%rowtype;
  s table_sessions%rowtype;
  d double precision;
  st text;
begin
  select * into r from restaurants where id = p_restaurant;
  if r.id is null then return json_build_object('status', 'no_table'); end if;
  select * into t from restaurant_tables where restaurant_id = p_restaurant and code = p_table;
  if t.id is null then
    -- restaurants that never set up tables keep the old "order without a session" menu
    if not exists (select 1 from restaurant_tables where restaurant_id = p_restaurant) then
      return json_build_object('status', 'no_table');
    end if;
    return json_build_object('status', 'unknown');
  end if;
  if not t.active then return json_build_object('status', 'off', 'table_name', t.name); end if;

  perform table_sessions_sweep(p_restaurant);

  if p_session is not null then
    select * into s from table_sessions where id = p_session and restaurant_id = p_restaurant and table_code = p_table and status = 'open';
    if s.id is not null then
      update table_sessions set last_activity_at = now() where id = s.id;
      return json_build_object('status', 'ok', 'session_id', s.id, 'code', s.code, 'table_name', t.name, 'kind', t.kind, 'phones', s.phones);
    end if;
  end if;

  if coalesce(r.geofence_on, true) and r.latitude is not null and r.longitude is not null then
    if p_lat is null or p_lng is null then
      return json_build_object('status', 'need_location', 'table_name', t.name);
    end if;
    d := parosa_distance_m(p_lat, p_lng, r.latitude, r.longitude);
    if d > greatest(coalesce(r.geofence_m, 150), 50) then
      return json_build_object('status', 'far', 'distance_m', round(d), 'table_name', t.name);
    end if;
  end if;

  select * into s from table_sessions where restaurant_id = p_restaurant and table_code = p_table and status = 'open';
  if s.id is not null then
    update table_sessions set phones = phones + 1, last_activity_at = now() where id = s.id returning * into s;
    st := 'joined';
  else
    begin
      insert into table_sessions (restaurant_id, table_id, table_code, code)
      values (p_restaurant, t.id, p_table, 'S-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4)))
      returning * into s;
      st := 'new';
    exception when unique_violation then
      select * into s from table_sessions where restaurant_id = p_restaurant and table_code = p_table and status = 'open';
      update table_sessions set phones = phones + 1, last_activity_at = now() where id = s.id returning * into s;
      st := 'joined';
    end;
  end if;
  return json_build_object('status', st, 'session_id', s.id, 'code', s.code, 'table_name', t.name, 'kind', t.kind, 'phones', s.phones);
end $$;
grant execute on function public.table_session_join(uuid, text, double precision, double precision, uuid) to anon, authenticated;

-- 6) Guest: call a waiter / ask for the bill ------------------
create or replace function public.table_session_request(p_session uuid, p_kind text)
returns json language plpgsql security definer set search_path = public as $$
declare s table_sessions%rowtype;
begin
  select * into s from table_sessions where id = p_session and status = 'open';
  if s.id is null then raise exception 'This table session has ended. Please scan the QR again.'; end if;
  if p_kind = 'waiter' then
    update table_sessions set waiter_call_at = now(), last_activity_at = now() where id = s.id;
  elsif p_kind = 'bill' then
    update table_sessions set bill_asked_at = coalesce(bill_asked_at, now()), last_activity_at = now() where id = s.id;
  else
    raise exception 'Unknown request';
  end if;
  return json_build_object('ok', true);
end $$;
grant execute on function public.table_session_request(uuid, text) to anon, authenticated;

-- guest: the table bill so far (every phone at the table sees the same bill)
create or replace function public.table_session_bill(p_session uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'code', s.code,
    'status', s.status,
    'booking_charge', s.booking_charge,
    'bill_asked', s.bill_asked_at is not null,
    'orders', coalesce((
      select json_agg(json_build_object(
        'order_no', o.order_no, 'total', o.total, 'status', o.status,
        'items', (select coalesce(json_agg(json_build_object('name', i.name, 'qty', i.qty, 'price', i.price)), '[]'::json)
                    from order_items i where i.order_id = o.id)
      ) order by o.created_at)
      from orders o where o.session_id = s.id), '[]'::json)
  ) from table_sessions s where s.id = p_session;
$$;
grant execute on function public.table_session_bill(uuid) to anon, authenticated;

-- status now also tells the phone whether the bill was asked for
create or replace function public.table_session_status(p_session uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('status', s.status, 'close_reason', s.close_reason, 'table_code', s.table_code, 'bill_asked', s.bill_asked_at is not null)
  from table_sessions s where s.id = p_session;
$$;
grant execute on function public.table_session_status(uuid) to anon, authenticated;

-- 7) Public booking page: the floor at a time -------------------
-- Occupied = an open table session right now; booked = an overlapping booking.
-- Guest names and numbers never leave the database.
create or replace function public.reserve_floor(p_restaurant uuid, p_at timestamptz default null)
returns json language plpgsql security definer set search_path = public as $$
declare r restaurants%rowtype; hold int; t_end timestamptz;
begin
  select * into r from restaurants where id = p_restaurant;
  if r.id is null then return null; end if;
  perform table_sessions_sweep(p_restaurant);
  perform reservations_sweep(p_restaurant);
  hold := greatest(coalesce(r.reserve_hold_min, 120), 30);
  t_end := coalesce(p_at, now()) + make_interval(mins => hold);
  return json_build_object(
    'reserve_on', r.reserve_on, 'hold_min', hold, 'days', r.reserve_days,
    'from', r.reserve_from, 'to', r.reserve_to, 'halls', r.floor_halls,
    'tables', coalesce((
      select json_agg(json_build_object(
        'id', t.id, 'name', t.name, 'kind', t.kind, 'seats', t.seats, 'shape', t.shape, 'area', t.area,
        'slot', t.floor_slot, 'price', t.book_price, 'bookable', t.bookable,
        'occupied', exists (select 1 from table_sessions s where s.restaurant_id = r.id and s.table_code = t.code and s.status = 'open'),
        'booked', p_at is not null and exists (
          select 1 from reservations b where b.table_id = t.id and b.status in ('booked', 'seated')
             and b.starts_at < t_end and b.ends_at > p_at)
      ) order by t.floor_slot, t.name)
      from restaurant_tables t where t.restaurant_id = r.id and t.active and t.on_floor), '[]'::json)
  );
end $$;
grant execute on function public.reserve_floor(uuid, timestamptz) to anon, authenticated;

create or replace function public.reservation_create(
  p_restaurant uuid, p_table uuid, p_at timestamptz, p_people int, p_name text, p_phone text, p_note text default null
) returns json language plpgsql security definer set search_path = public as $$
declare r restaurants%rowtype; t restaurant_tables%rowtype; hold int; b reservations%rowtype; digits text;
begin
  select * into r from restaurants where id = p_restaurant;
  if r.id is null or not r.reserve_on then raise exception 'Bookings are closed right now'; end if;
  select * into t from restaurant_tables where id = p_table and restaurant_id = p_restaurant and active and on_floor and bookable;
  if t.id is null then raise exception 'This table can''t be booked'; end if;
  if p_at < now() - interval '5 minutes' or p_at > now() + make_interval(days => greatest(coalesce(r.reserve_days, 7), 1)) then
    raise exception 'Please pick another time';
  end if;
  digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(digits) < 10 then raise exception 'Please enter a 10-digit mobile number'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Please enter your name'; end if;
  hold := greatest(coalesce(r.reserve_hold_min, 120), 30);

  perform 1 from restaurant_tables where id = t.id for update; -- one booking at a time per table
  if exists (select 1 from reservations x where x.table_id = t.id and x.status in ('booked', 'seated')
               and x.starts_at < p_at + make_interval(mins => hold) and x.ends_at > p_at) then
    raise exception 'Someone just booked this table. Please pick another.';
  end if;

  insert into reservations (restaurant_id, table_id, code, guest_name, phone, people, note, starts_at, ends_at, price)
  values (p_restaurant, t.id, 'B-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4)),
          left(trim(p_name), 60), right(digits, 10), least(greatest(coalesce(p_people, 2), 1), 40),
          nullif(left(trim(coalesce(p_note, '')), 200), ''), p_at, p_at + make_interval(mins => hold), t.book_price)
  returning * into b;
  return json_build_object('code', b.code, 'table_name', t.name, 'kind', t.kind, 'starts_at', b.starts_at, 'price', b.price, 'people', b.people);
end $$;
grant execute on function public.reservation_create(uuid, uuid, timestamptz, int, text, text, text) to anon, authenticated;

-- 8) Owner: the guests arrived → open the table's session with the booking charge
create or replace function public.reservation_seat(p_reservation uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare b reservations%rowtype; t restaurant_tables%rowtype; s table_sessions%rowtype;
begin
  select * into b from reservations where id = p_reservation for update;
  if b.id is null then raise exception 'Booking not found'; end if;
  if not exists (select 1 from restaurants where id = b.restaurant_id and owner_id = auth.uid()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into t from restaurant_tables where id = b.table_id;
  perform table_sessions_sweep(b.restaurant_id);
  select * into s from table_sessions where restaurant_id = b.restaurant_id and table_code = t.code and status = 'open';
  if s.id is null then
    insert into table_sessions (restaurant_id, table_id, table_code, code, phones, booking_charge, reservation_id)
    values (b.restaurant_id, t.id, t.code, 'S-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4)), 0, b.price, b.id)
    returning * into s;
  else
    update table_sessions set booking_charge = b.price, reservation_id = b.id where id = s.id returning * into s;
  end if;
  update reservations set status = 'seated' where id = b.id;
  return s.id;
end $$;
revoke all on function public.reservation_seat(uuid) from public;
grant execute on function public.reservation_seat(uuid) to authenticated;

notify pgrst, 'reload schema';

select 'seat reserve ok' as result,
  (select count(*) from public.reservations) as reservations,
  (select count(*) from public.restaurants where table_code_hi > 0) as restaurants_with_codes;
