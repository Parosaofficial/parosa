-- ============================================================
-- Parosa 0019 — security pack (Nov 2026)
--
--  1. Orders only through place_order(): needs an open table session (or the
--     staff code, or the guest's location for menus without tables), prices
--     come from the menu, quantities are capped, and a table can't flood the
--     kitchen. The public "insert any order" permission is removed.
--  2. Private restaurant details (staff code, owner email, admin notes,
--     documents…) are no longer readable with the public key. Menus, booking
--     pages and bills read restaurant_profiles, which has only public fields.
--  3. Staff login: 5 wrong codes → that phone waits 15 minutes.
--  4. GPS is always required to open a table (no location pinned → "ask the
--     staff"). Optional: staff accept each new table before it can order.
--  5. Table bookings: max 2 upcoming per phone per restaurant, 30 an hour.
--  6. Plan limits (tables, staff, kitchen screens) checked in the database.
--  7. Staff Aadhaar: only the last 4 digits are kept.
--  8. Owner "forgot password" by WhatsApp: owner_otps (server-only).
--
-- Safe to run more than once. Needs 0015–0018.
-- ============================================================

/* ---------------------------------------------------------------
   2. Public restaurant profile + owner-only restaurants table
   --------------------------------------------------------------- */
create or replace view public.restaurant_profiles as
  select id, slug, name, name_hi, tagline, description, type, logo_url, theme, template, tags,
         phone, whatsapp, address, area, city, district, state, pincode, latitude, longitude,
         hours, upi_id, gstin, fssai, google_review_url, review_prompt,
         loyalty_enabled, loyalty_goal, loyalty_min, loyalty_reward,
         reserve_on, reserve_days, reserve_from, reserve_to, reserve_hold_min, floor_halls,
         session_idle_hours, food_court_id, tables_count, plan, status, created_at
    from public.restaurants;
grant select on public.restaurant_profiles to anon, authenticated;

drop policy if exists p_rest_read on public.restaurants;
drop policy if exists p_rest_owner_read on public.restaurants;
create policy p_rest_owner_read on public.restaurants for select to authenticated
  using (owner_id = auth.uid());

/* ---------------------------------------------------------------
   4. Table sessions: GPS always, optional staff acceptance
   --------------------------------------------------------------- */
alter table public.restaurants add column if not exists accept_tables boolean not null default false;
alter table public.table_sessions add column if not exists accepted boolean not null default true;

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
    if not exists (select 1 from restaurant_tables where restaurant_id = p_restaurant) then
      return json_build_object('status', 'no_table');
    end if;
    return json_build_object('status', 'unknown');
  end if;
  if not t.active then return json_build_object('status', 'off', 'table_name', t.name); end if;

  perform table_sessions_sweep(p_restaurant);

  -- this phone already confirmed the table (its location was checked then)
  if p_session is not null then
    select * into s from table_sessions where id = p_session and restaurant_id = p_restaurant and table_code = p_table and status = 'open';
    if s.id is not null then
      update table_sessions set last_activity_at = now() where id = s.id;
      return json_build_object('status', case when s.accepted then 'ok' else 'waiting' end,
        'session_id', s.id, 'code', s.code, 'table_name', t.name, 'kind', t.kind, 'phones', s.phones);
    end if;
  end if;

  -- GPS is always required; a restaurant without a pinned location can't open tables yet
  if r.latitude is null or r.longitude is null then
    return json_build_object('status', 'setup', 'table_name', t.name);
  end if;
  if p_lat is null or p_lng is null then
    return json_build_object('status', 'need_location', 'table_name', t.name);
  end if;
  d := parosa_distance_m(p_lat, p_lng, r.latitude, r.longitude);
  if d > greatest(coalesce(r.geofence_m, 150), 50) then
    return json_build_object('status', 'far', 'distance_m', round(d), 'table_name', t.name);
  end if;

  select * into s from table_sessions where restaurant_id = p_restaurant and table_code = p_table and status = 'open';
  if s.id is not null then
    update table_sessions set phones = phones + 1, last_activity_at = now() where id = s.id returning * into s;
    st := 'joined';
  else
    begin
      insert into table_sessions (restaurant_id, table_id, table_code, code, accepted)
      values (p_restaurant, t.id, p_table, 'S-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4)),
              not coalesce(r.accept_tables, false))
      returning * into s;
      st := 'new';
    exception when unique_violation then
      select * into s from table_sessions where restaurant_id = p_restaurant and table_code = p_table and status = 'open';
      update table_sessions set phones = phones + 1, last_activity_at = now() where id = s.id returning * into s;
      st := 'joined';
    end;
  end if;
  if not s.accepted then st := 'waiting'; end if;
  return json_build_object('status', st, 'session_id', s.id, 'code', s.code, 'table_name', t.name, 'kind', t.kind, 'phones', s.phones);
end $$;
grant execute on function public.table_session_join(uuid, text, double precision, double precision, uuid) to anon, authenticated;

-- menus without tables: is the guest at the restaurant? (the menu stays hidden until yes)
create or replace function public.restaurant_here(p_restaurant uuid, p_lat double precision default null, p_lng double precision default null)
returns json language plpgsql security definer set search_path = public as $$
declare r restaurants%rowtype; d double precision;
begin
  select * into r from restaurants where id = p_restaurant;
  if r.id is null then return json_build_object('status', 'unknown'); end if;
  if r.latitude is null or r.longitude is null then return json_build_object('status', 'setup'); end if;
  if p_lat is null or p_lng is null then return json_build_object('status', 'need_location'); end if;
  d := parosa_distance_m(p_lat, p_lng, r.latitude, r.longitude);
  if d > greatest(coalesce(r.geofence_m, 150), 50) then return json_build_object('status', 'far', 'distance_m', round(d)); end if;
  return json_build_object('status', 'ok');
end $$;
grant execute on function public.restaurant_here(uuid, double precision, double precision) to anon, authenticated;

-- owner accepts a new table (Overview)
create or replace function public.table_session_accept(p_session uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update table_sessions s set accepted = true
   where s.id = p_session and s.status = 'open'
     and exists (select 1 from restaurants r where r.id = s.restaurant_id and r.owner_id = auth.uid());
  return found;
end $$;
revoke all on function public.table_session_accept(uuid) from public;
grant execute on function public.table_session_accept(uuid) to authenticated;

-- the waiter's phone: tables waiting to be accepted, and accepting one
create or replace function public.staff_pending_tables(p_restaurant uuid, p_code text, p_staff uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not parosa_staff_ok(p_restaurant, p_code, p_staff) then return '[]'::json; end if;
  return coalesce((
    select json_agg(json_build_object('session_id', s.id, 'code', s.code, 'opened_at', s.opened_at, 'phones', s.phones,
      'table_name', coalesce((select t.name from restaurant_tables t where t.id = s.table_id), s.table_code)) order by s.opened_at)
    from table_sessions s where s.restaurant_id = p_restaurant and s.status = 'open' and not s.accepted), '[]'::json);
end $$;
grant execute on function public.staff_pending_tables(uuid, text, uuid) to anon, authenticated;

create or replace function public.staff_session_accept(p_restaurant uuid, p_code text, p_staff uuid, p_session uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not parosa_staff_ok(p_restaurant, p_code, p_staff) then return false; end if;
  update table_sessions set accepted = true where id = p_session and restaurant_id = p_restaurant and status = 'open';
  return found;
end $$;
grant execute on function public.staff_session_accept(uuid, text, uuid, uuid) to anon, authenticated;

/* ---------------------------------------------------------------
   1. Orders only through place_order()
   --------------------------------------------------------------- */
create or replace function public.place_order(
  p_restaurant uuid,
  p_table text,
  p_items jsonb,                          -- [{dish_id, qty} | {dish_id: null, name, qty, price}]
  p_session uuid default null,
  p_note text default null,
  p_phone text default null,
  p_name text default null,
  p_staff uuid default null,              -- POS: staff id + today's code instead of a session
  p_code text default null,
  p_lat double precision default null,    -- menus without tables: the guest's location
  p_lng double precision default null,
  p_court uuid default null               -- food-court orders
) returns json language plpgsql security definer set search_path = public as $$
declare
  r restaurants%rowtype;
  s table_sessions%rowtype;
  it jsonb;
  d dishes%rowtype;
  q int; pr int; nm text;
  lines jsonb := '[]'::jsonb;
  sub int := 0; dish_sub int := 0; customs int := 0;
  oid uuid := gen_random_uuid();
  ono text;
  g int;
  staff_nm text;
  dist double precision;
  tbl text := nullif(left(trim(coalesce(p_table, '')), 20), '');
begin
  select * into r from restaurants where id = p_restaurant;
  if r.id is null then raise exception 'Restaurant not found'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Your order is empty'; end if;
  if jsonb_array_length(p_items) > 40 then raise exception 'Too many items in one order'; end if;

  if p_staff is not null then
    -- POS
    if not parosa_staff_ok(p_restaurant, p_code, p_staff) then raise exception 'Your staff sign-in has expired. Please log in again.'; end if;
    select name into staff_nm from staff where id = p_staff;
  elsif p_court is not null then
    -- food court: the store must be in that court; a few orders a minute per store
    if r.food_court_id is distinct from p_court then raise exception 'This store isn''t in that food court'; end if;
    if (select count(*) from orders where restaurant_id = p_restaurant and food_court_id = p_court and created_at > now() - interval '1 minute') >= 20 then
      raise exception 'Too many orders right now. Please wait a minute.';
    end if;
  elsif exists (select 1 from restaurant_tables where restaurant_id = p_restaurant) then
    -- table QR: an open, accepted session for this restaurant
    if p_session is null then raise exception 'Please confirm you''re at the table first.'; end if;
    select * into s from table_sessions where id = p_session and restaurant_id = p_restaurant and status = 'open';
    if s.id is null then raise exception 'This table session has ended. Please scan the QR again.'; end if;
    if not s.accepted then raise exception 'Waiting for the staff to confirm your table.'; end if;
    if (select count(*) from orders where session_id = s.id and created_at > now() - interval '1 minute') >= 3
       or (select count(*) from orders where session_id = s.id) >= 40 then
      raise exception 'Too many orders from this table. Please ask the staff.';
    end if;
    tbl := s.table_code;
  else
    -- an older menu without tables: check the guest's location here
    if r.latitude is null or r.longitude is null then raise exception 'This restaurant isn''t taking QR orders yet. Please ask the staff.'; end if;
    if p_lat is null or p_lng is null then raise exception 'Please allow location to order.'; end if;
    dist := parosa_distance_m(p_lat, p_lng, r.latitude, r.longitude);
    if dist > greatest(coalesce(r.geofence_m, 150), 50) then raise exception 'Ordering works only at the restaurant.'; end if;
    if (select count(*) from orders where restaurant_id = p_restaurant and staff_name is null
          and coalesce(table_number, '') = coalesce(tbl, '') and created_at > now() - interval '1 minute') >= 3 then
      raise exception 'Too many orders. Please wait a minute.';
    end if;
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    q := coalesce((it->>'qty')::int, 0);
    if q < 1 or q > 50 then raise exception 'Please check the quantities'; end if;
    if nullif(it->>'dish_id', '') is not null then
      select * into d from dishes where id = (it->>'dish_id')::uuid and restaurant_id = p_restaurant;
      if d.id is null then raise exception 'An item is no longer on the menu. Please refresh the menu.'; end if;
      if not coalesce(d.available, true) then raise exception '% is sold out right now', d.name; end if;
      pr := coalesce(d.price, 0);
      nm := d.name;
      dish_sub := dish_sub + pr * q;
    else
      -- a guest's custom request: their price, capped; the staff confirm it with the guest
      if p_staff is not null then raise exception 'Pick dishes from the menu'; end if;
      customs := customs + 1;
      if customs > 3 then raise exception 'Too many custom requests in one order'; end if;
      nm := regexp_replace(left(trim(coalesce(it->>'name', '')), 90), '^Custom:\s*', '');
      if length(nm) < 3 then raise exception 'Tell the kitchen what you''d like.'; end if;
      nm := 'Custom: ' || nm;
      pr := least(greatest(coalesce((it->>'price')::int, 0), 0), 5000);
    end if;
    lines := lines || jsonb_build_object('dish_id', nullif(it->>'dish_id', ''), 'name', nm, 'qty', q, 'price', pr);
    sub := sub + pr * q;
  end loop;

  g := round(dish_sub * 0.05);
  ono := 'A-' || (200 + floor(random() * 799))::int;
  insert into orders (id, restaurant_id, table_number, order_no, subtotal, gst, total, status, payment_status,
                      customer_phone, customer_name, staff_name, session_id, note, food_court_id)
  values (oid, p_restaurant, tbl, ono, sub, g, sub + g, 'new', 'unpaid',
          nullif(trim(coalesce(p_phone, '')), ''), nullif(left(trim(coalesce(p_name, '')), 60), ''),
          staff_nm, s.id, nullif(left(trim(coalesce(p_note, '')), 200), ''), p_court);
  insert into order_items (order_id, dish_id, name, qty, price)
  select oid, nullif(x->>'dish_id', '')::uuid, x->>'name', (x->>'qty')::int, (x->>'price')::int
    from jsonb_array_elements(lines) x;
  return json_build_object('id', oid, 'order_no', ono, 'subtotal', sub, 'gst', g, 'total', sub + g,
                           'table_number', tbl, 'created_at', now());
end $$;
revoke all on function public.place_order(uuid, text, jsonb, uuid, text, text, text, uuid, text, double precision, double precision, uuid) from public;
grant execute on function public.place_order(uuid, text, jsonb, uuid, text, text, text, uuid, text, double precision, double precision, uuid) to anon, authenticated;

-- nobody inserts orders directly any more, except an owner into their own restaurant
drop policy if exists p_order_insert on public.orders;
drop policy if exists p_order_insert_owner on public.orders;
create policy p_order_insert_owner on public.orders for insert to authenticated
  with check (exists (select 1 from restaurants x where x.id = restaurant_id and x.owner_id = auth.uid()));
drop policy if exists p_item_insert on public.order_items;
drop policy if exists p_item_insert_owner on public.order_items;
create policy p_item_insert_owner on public.order_items for insert to authenticated
  with check (exists (select 1 from orders o join restaurants x on x.id = o.restaurant_id
                      where o.id = order_id and x.owner_id = auth.uid()));

/* ---------------------------------------------------------------
   3. Staff login: 5 wrong codes → 15 minutes wait
   --------------------------------------------------------------- */
create table if not exists public.staff_login_tries (
  phone text not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists staff_login_tries_phone on public.staff_login_tries (phone, at desc);
alter table public.staff_login_tries enable row level security;

drop function if exists public.staff_login(text, text);
create function public.staff_login(p_phone text, p_code text)
returns table(restaurant_id uuid, slug text, restaurant_name text, staff_id uuid, staff_name text)
language plpgsql security definer set search_path = public as $$
declare ph text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
begin
  if (select count(*) from staff_login_tries t where t.phone = ph and not t.ok and t.at > now() - interval '15 minutes') >= 5 then
    raise exception 'Too many wrong codes. Please wait 15 minutes and try again.';
  end if;
  return query
    select r.id, r.slug, r.name, s.id, s.name
      from staff s join restaurants r on r.id = s.restaurant_id
     where s.phone = p_phone and s.active
       and r.staff_code is not null and r.staff_code = p_code and r.staff_code_date = current_date
     limit 1;
  insert into staff_login_tries (phone, ok) values (ph, found);
  delete from staff_login_tries where at < now() - interval '2 days';
end $$;
grant execute on function public.staff_login(text, text) to anon, authenticated;

/* ---------------------------------------------------------------
   5. Table bookings: limits per phone and per hour
   --------------------------------------------------------------- */
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
  if (select count(*) from reservations x where x.restaurant_id = p_restaurant and x.phone = right(digits, 10)
        and x.status = 'booked' and x.starts_at > now()) >= 2 then
    raise exception 'You already have 2 bookings here. Please call the restaurant to book more.';
  end if;
  if (select count(*) from reservations x where x.restaurant_id = p_restaurant and x.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many bookings right now. Please try again in a while.';
  end if;
  hold := greatest(coalesce(r.reserve_hold_min, 120), 30);

  perform 1 from restaurant_tables where id = t.id for update;
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

/* ---------------------------------------------------------------
   6. Plan limits in the database
   founders (joined before 10 Nov 2026) and 14-day trials: no limits
   --------------------------------------------------------------- */
create or replace function public.parosa_plan_limit(p_restaurant uuid, p_kind text)
returns int language sql stable security definer set search_path = public as $$
  select case
    when r.created_at < timestamptz '2026-11-10 00:00:00+05:30' then null
    when r.created_at > now() - interval '14 days' then null
    when coalesce(r.plan, 'basic') = 'basic' then case p_kind when 'tables' then 5 when 'staff' then 2 when 'kitchen' then 1 end
    when r.plan = 'growth' then case p_kind when 'tables' then 10 when 'staff' then 5 end
    else null end
  from restaurants r where r.id = p_restaurant;
$$;

create or replace function public.parosa_limit_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int; n int; kind text := tg_argv[0];
begin
  lim := parosa_plan_limit(new.restaurant_id, kind);
  if lim is null then return new; end if;
  if kind = 'tables' then select count(*) into n from restaurant_tables where restaurant_id = new.restaurant_id;
  elsif kind = 'staff' then select count(*) into n from staff where restaurant_id = new.restaurant_id;
  else select count(*) into n from kitchen_devices where restaurant_id = new.restaurant_id; end if;
  if n >= lim then
    raise exception 'Your plan includes % % — upgrade in Settings → Plan.', lim,
      case kind when 'tables' then 'tables' when 'staff' then 'staff logins' else 'kitchen screen(s)' end;
  end if;
  return new;
end $$;
drop trigger if exists trg_limit_tables on public.restaurant_tables;
create trigger trg_limit_tables before insert on public.restaurant_tables for each row execute function public.parosa_limit_guard('tables');
drop trigger if exists trg_limit_staff on public.staff;
create trigger trg_limit_staff before insert on public.staff for each row execute function public.parosa_limit_guard('staff');
drop trigger if exists trg_limit_kitchen on public.kitchen_devices;
create trigger trg_limit_kitchen before insert on public.kitchen_devices for each row execute function public.parosa_limit_guard('kitchen');

/* ---------------------------------------------------------------
   7. Staff Aadhaar: keep only the last 4 digits
   --------------------------------------------------------------- */
create or replace function public.staff_aadhaar_mask() returns trigger language plpgsql as $$
declare dg text := regexp_replace(coalesce(new.aadhaar, ''), '\D', '', 'g');
begin
  new.aadhaar := case when length(dg) >= 4 then 'XXXX XXXX ' || right(dg, 4) else null end;
  return new;
end $$;
drop trigger if exists trg_staff_aadhaar on public.staff;
create trigger trg_staff_aadhaar before insert or update of aadhaar on public.staff for each row execute function public.staff_aadhaar_mask();
update public.staff set aadhaar = aadhaar where aadhaar is not null and aadhaar !~ '^XXXX XXXX \d{4}$';

/* ---------------------------------------------------------------
   8. Owner "forgot password" by WhatsApp (used only by the server)
   --------------------------------------------------------------- */
create table if not exists public.owner_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  phone text not null,
  code_hash text not null,
  attempts int not null default 0,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
create index if not exists owner_otps_phone on public.owner_otps (phone, created_at desc);
alter table public.owner_otps enable row level security;   -- no policies: only the server (service key) reads it

notify pgrst, 'reload schema';

select 'security pack ok' as result;
