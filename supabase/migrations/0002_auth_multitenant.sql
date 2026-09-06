-- ============================================================
-- Parosa — Auth + multi-tenant migration
-- Adds owner_id + profile columns, and replaces the open demo
-- RLS policies with strict per-owner isolation.
-- Safe to run more than once (idempotent).
--
-- How to apply: paste into the Supabase SQL Editor and Run,
-- or run scripts/run-sql.mjs with a Management API token.
-- ============================================================

-- 1) New columns on restaurants ------------------------------
alter table restaurants
  add column if not exists owner_id   uuid references auth.users(id) on delete cascade,
  add column if not exists name_hi    text,
  add column if not exists description text,
  add column if not exists whatsapp   text,
  add column if not exists hours      jsonb,
  add column if not exists gstin_url  text,
  add column if not exists fssai_url  text,
  add column if not exists tables_count int default 0;

create index if not exists idx_rest_owner on restaurants(owner_id);

-- 2) Table-level grants (RLS still gates the rows) -----------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on restaurants, categories, dishes, orders, order_items to anon, authenticated;

-- 3) Ensure RLS is on ---------------------------------------
alter table restaurants enable row level security;
alter table categories  enable row level security;
alter table dishes      enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;

-- 4) Drop every old policy ----------------------------------
drop policy if exists p_rest_all  on restaurants;
drop policy if exists p_rest_read on restaurants;
drop policy if exists p_rest_ins  on restaurants;
drop policy if exists p_rest_upd  on restaurants;
drop policy if exists p_rest_del  on restaurants;
drop policy if exists p_cat_all   on categories;
drop policy if exists p_cat_read  on categories;
drop policy if exists p_cat_write on categories;
drop policy if exists p_dish_all   on dishes;
drop policy if exists p_dish_read  on dishes;
drop policy if exists p_dish_write on dishes;
drop policy if exists p_order_all    on orders;
drop policy if exists p_order_read   on orders;
drop policy if exists p_order_insert on orders;
drop policy if exists p_order_update on orders;
drop policy if exists p_item_all    on order_items;
drop policy if exists p_item_read   on order_items;
drop policy if exists p_item_insert on order_items;

-- 5) Restaurants -------------------------------------------
create policy p_rest_read on restaurants for select using (true);
create policy p_rest_ins on restaurants for insert to authenticated with check (owner_id = auth.uid());
create policy p_rest_upd on restaurants for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy p_rest_del on restaurants for delete to authenticated using (owner_id = auth.uid());

-- 6) Categories --------------------------------------------
create policy p_cat_read  on categories for select using (true);
create policy p_cat_write on categories for all to authenticated
  using      (restaurant_id in (select id from restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from restaurants where owner_id = auth.uid()));

-- 7) Dishes ------------------------------------------------
create policy p_dish_read  on dishes for select using (true);
create policy p_dish_write on dishes for all to authenticated
  using      (restaurant_id in (select id from restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from restaurants where owner_id = auth.uid()));

-- 8) Orders ------------------------------------------------
create policy p_order_insert on orders for insert to anon, authenticated with check (true);
create policy p_order_read   on orders for select to authenticated
  using (restaurant_id in (select id from restaurants where owner_id = auth.uid()));
create policy p_order_update on orders for update to authenticated
  using      (restaurant_id in (select id from restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from restaurants where owner_id = auth.uid()));

-- 9) Order items -------------------------------------------
create policy p_item_insert on order_items for insert to anon, authenticated with check (true);
create policy p_item_read   on order_items for select to authenticated
  using (order_id in (
    select o.id from orders o
    where o.restaurant_id in (select id from restaurants where owner_id = auth.uid())
  ));

-- 10) Realtime for live orders -----------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders') then
    alter publication supabase_realtime add table orders;
  end if;
end $$;

select 'migration ok' as result,
  (select count(*) from restaurants) as restaurants,
  (select count(*) from pg_policies where schemaname='public') as policies;
