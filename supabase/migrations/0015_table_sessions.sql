-- ============================================================
-- Parosa 0015 — tables with types + live table sessions
--
-- • restaurant_tables: one row per table (name, type, seats, shape, area).
--   `code` is what the QR link carries (/<slug>/menu/<code>) so printed QRs
--   keep working; existing restaurants are back-filled from tables_count.
-- • table_sessions: a guest scan opens (or joins) the table's session. It
--   closes when the owner confirms payment, frees the table, or after N hours
--   with no activity. One open session per table.
-- • Location check: guests must be within restaurants.geofence_m metres of the
--   GPS pin saved at signup (0011). Done in the database, not the browser.
-- • orders.session_id ties every order to its table session.
--
-- Safe to run more than once.
-- ============================================================

-- 1) Owner settings ------------------------------------------
alter table public.restaurants
  add column if not exists geofence_on        boolean not null default true,
  add column if not exists geofence_m         int     not null default 150,
  add column if not exists session_idle_hours int     not null default 3;

-- 2) Tables ---------------------------------------------------
create table if not exists public.restaurant_tables (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  code          text not null,                       -- in the QR link
  name          text not null,                       -- shown to guests and staff (T1, F1…)
  kind          text not null default '4-seater',    -- 2-seater, 4-seater, Family sofa, or custom
  seats         int  not null default 4,
  shape         text not null default 'four' check (shape in ('two', 'four', 'sofa')),
  area          text,                                -- Inside, Outside, Family hall…
  active        boolean not null default true,
  sort          int not null default 0,
  created_at    timestamptz default now(),
  unique (restaurant_id, code)
);
create index if not exists idx_rtables_rest on public.restaurant_tables(restaurant_id, sort);

alter table public.restaurant_tables enable row level security;
grant select on public.restaurant_tables to anon, authenticated;
grant insert, update, delete on public.restaurant_tables to authenticated;
drop policy if exists p_rtables_read on public.restaurant_tables;
create policy p_rtables_read on public.restaurant_tables for select using (true);
drop policy if exists p_rtables_owner on public.restaurant_tables;
create policy p_rtables_owner on public.restaurant_tables for all to authenticated
  using      (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));

-- back-fill: every restaurant without rows gets T1..Tn from its old table count
insert into public.restaurant_tables (restaurant_id, code, name, kind, seats, shape, sort)
select r.id, g::text, 'T' || g, '4-seater', 4, 'four', g
from public.restaurants r
cross join lateral generate_series(1, greatest(coalesce(r.tables_count, 0), 0)) g
where not exists (select 1 from public.restaurant_tables t where t.restaurant_id = r.id)
on conflict (restaurant_id, code) do nothing;

-- 3) Sessions -------------------------------------------------
create table if not exists public.table_sessions (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references public.restaurants(id) on delete cascade,
  table_id         uuid references public.restaurant_tables(id) on delete set null,
  table_code       text not null,
  code             text not null,                    -- short id shown on screen: S-7K2Q
  status           text not null default 'open' check (status in ('open', 'closed')),
  phones           int  not null default 1,
  waiter_id        uuid references public.staff(id) on delete set null,
  opened_at        timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  closed_at        timestamptz,
  close_reason     text check (close_reason in ('paid', 'freed', 'timeout')),
  payment_method   text
);
create unique index if not exists uq_tsess_open on public.table_sessions(restaurant_id, table_code) where status = 'open';
create index if not exists idx_tsess_rest on public.table_sessions(restaurant_id, status, opened_at desc);

alter table public.table_sessions enable row level security;
revoke all on public.table_sessions from anon;
grant select, update on public.table_sessions to authenticated;
drop policy if exists p_tsess_owner_read on public.table_sessions;
create policy p_tsess_owner_read on public.table_sessions for select to authenticated
  using (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));
drop policy if exists p_tsess_owner_update on public.table_sessions;
create policy p_tsess_owner_update on public.table_sessions for update to authenticated
  using      (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'table_sessions') then
    alter publication supabase_realtime add table public.table_sessions;
  end if;
end $$;

alter table public.orders add column if not exists session_id uuid references public.table_sessions(id) on delete set null;
create index if not exists idx_orders_session on public.orders(session_id);

-- 4) Helpers --------------------------------------------------
create or replace function public.parosa_distance_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- close sessions that have been quiet longer than the restaurant allows
create or replace function public.table_sessions_sweep(p_restaurant uuid)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update table_sessions s
     set status = 'closed', closed_at = now(), close_reason = 'timeout'
    from restaurants r
   where s.restaurant_id = p_restaurant and r.id = s.restaurant_id
     and s.status = 'open'
     and s.last_activity_at < now() - make_interval(hours => greatest(coalesce(r.session_idle_hours, 3), 1));
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.table_sessions_sweep(uuid) to anon, authenticated;

-- 5) Guest: open or join the table's session ------------------
-- Returns { status: ok | joined | new | far | need_location | no_table, ... }.
-- p_session: the session this phone already belongs to (from the last scan), if any.
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
  select * into t from restaurant_tables where restaurant_id = p_restaurant and code = p_table and active;
  if t.id is null then return json_build_object('status', 'no_table'); end if;

  perform table_sessions_sweep(p_restaurant);

  -- already in this table's open session (reopening the menu) → no new location check
  if p_session is not null then
    select * into s from table_sessions where id = p_session and restaurant_id = p_restaurant and table_code = p_table and status = 'open';
    if s.id is not null then
      update table_sessions set last_activity_at = now() where id = s.id;
      return json_build_object('status', 'ok', 'session_id', s.id, 'code', s.code, 'table_name', t.name, 'kind', t.kind, 'phones', s.phones);
    end if;
  end if;

  -- location check (skipped when the owner turned it off or never saved a pin)
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
      -- two phones scanned at the same instant: join the one that won
      select * into s from table_sessions where restaurant_id = p_restaurant and table_code = p_table and status = 'open';
      update table_sessions set phones = phones + 1, last_activity_at = now() where id = s.id returning * into s;
      st := 'joined';
    end;
  end if;
  return json_build_object('status', st, 'session_id', s.id, 'code', s.code, 'table_name', t.name, 'kind', t.kind, 'phones', s.phones);
end $$;
grant execute on function public.table_session_join(uuid, text, double precision, double precision, uuid) to anon, authenticated;

-- guest: is my session still open? (after the owner closes it, the phone starts fresh)
create or replace function public.table_session_status(p_session uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('status', s.status, 'close_reason', s.close_reason, 'table_code', s.table_code)
  from table_sessions s where s.id = p_session;
$$;
grant execute on function public.table_session_status(uuid) to anon, authenticated;

-- 6) Orders join their session; a closed session takes no new orders ---------
create or replace function public.orders_session_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare s table_sessions%rowtype;
begin
  if new.session_id is null then return new; end if;
  select * into s from table_sessions where id = new.session_id;
  if s.id is null or s.status <> 'open' or s.restaurant_id <> new.restaurant_id then
    raise exception 'This table session has ended. Please scan the QR again.';
  end if;
  update table_sessions set last_activity_at = now() where id = s.id;
  return new;
end $$;
drop trigger if exists trg_orders_session_guard on public.orders;
create trigger trg_orders_session_guard
  before insert on public.orders
  for each row execute function public.orders_session_guard();

-- 7) Owner: payment received → mark every order paid and close ----------------
-- Marking paid fires the loyalty trigger (0010), so stamp cards get their tick.
create or replace function public.table_session_close(p_session uuid, p_method text default 'UPI')
returns int language plpgsql security definer set search_path = public as $$
declare s table_sessions%rowtype; n int;
begin
  select * into s from table_sessions where id = p_session for update;
  if s.id is null then raise exception 'Session not found'; end if;
  if not exists (select 1 from restaurants where id = s.restaurant_id and owner_id = auth.uid()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update orders set payment_status = 'paid', payment_method = coalesce(nullif(p_method, ''), 'UPI')
   where session_id = p_session and payment_status <> 'paid';
  get diagnostics n = row_count;
  update table_sessions set status = 'closed', closed_at = now(), close_reason = 'paid', payment_method = coalesce(nullif(p_method, ''), 'UPI')
   where id = p_session and status = 'open';
  return n;
end $$;
revoke all on function public.table_session_close(uuid, text) from public;
grant execute on function public.table_session_close(uuid, text) to authenticated;

-- 8) Owner: free the table without payment (guests left, wrong scan) ---------
create or replace function public.table_session_free(p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s table_sessions%rowtype;
begin
  select * into s from table_sessions where id = p_session;
  if s.id is null then raise exception 'Session not found'; end if;
  if not exists (select 1 from restaurants where id = s.restaurant_id and owner_id = auth.uid()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update table_sessions set status = 'closed', closed_at = now(), close_reason = 'freed' where id = p_session and status = 'open';
end $$;
revoke all on function public.table_session_free(uuid) from public;
grant execute on function public.table_session_free(uuid) to authenticated;

notify pgrst, 'reload schema';

select 'table sessions ok' as result,
  (select count(*) from public.restaurant_tables) as tables,
  (select count(*) from public.table_sessions) as sessions;
