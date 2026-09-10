-- ============================================================
-- Parosa — Staff (phone + daily code) + customer capture
-- Safe to run more than once. Paste into Supabase SQL Editor and Run.
-- ============================================================

-- 1) Daily staff code on the restaurant --------------------
alter table restaurants
  add column if not exists staff_code      text,
  add column if not exists staff_code_date date;

-- 2) Capture customer name + who took the order ------------
alter table orders
  add column if not exists customer_name text,
  add column if not exists staff_name    text;

-- 3) Staff directory (owner-managed) -----------------------
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  dob date,
  aadhaar text,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_staff_rest on staff(restaurant_id);

alter table staff enable row level security;
grant select, insert, update, delete on staff to anon, authenticated;
drop policy if exists p_staff_all on staff;
create policy p_staff_all on staff for all to authenticated
  using      (restaurant_id in (select id from restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from restaurants where owner_id = auth.uid()));

-- 4) Staff login — validate phone + TODAY's code -----------
-- SECURITY DEFINER: runs with owner rights so it can check across restaurants
-- without exposing any table to anon. Returns only identity info on success.
create or replace function staff_login(p_phone text, p_code text)
returns table(restaurant_id uuid, slug text, restaurant_name text, staff_id uuid, staff_name text)
language sql security definer set search_path = public as $$
  select r.id, r.slug, r.name, s.id, s.name
  from staff s
  join restaurants r on r.id = s.restaurant_id
  where s.phone = p_phone
    and s.active
    and r.staff_code is not null
    and r.staff_code = p_code
    and r.staff_code_date = current_date
  limit 1;
$$;
grant execute on function staff_login(text, text) to anon, authenticated;

-- 5) Customer name lookup for the POS (gated by the daily code) ----
create or replace function staff_customer_lookup(p_restaurant_id uuid, p_code text, p_phone text)
returns text
language sql security definer set search_path = public as $$
  select o.customer_name
  from orders o
  where o.restaurant_id = p_restaurant_id
    and o.customer_phone = p_phone
    and coalesce(o.customer_name, '') <> ''
    and exists (
      select 1 from restaurants r
      where r.id = p_restaurant_id and r.staff_code = p_code and r.staff_code_date = current_date
    )
  order by o.created_at desc
  limit 1;
$$;
grant execute on function staff_customer_lookup(uuid, text, text) to anon, authenticated;

select 'staff migration ok' as result,
  (select count(*) from information_schema.tables where table_name = 'staff') as staff_table;
