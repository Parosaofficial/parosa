-- Parosa 0001 — initial schema.
-- Reconstructed from the original setup scripts that were run by hand in the
-- SQL Editor (schema, storage bucket, grants), so a fresh Supabase project can
-- be rebuilt by running 0001 → latest in order.
--
-- NOTE: the RLS and storage policies here are the ORIGINAL open demo policies.
-- They are replaced by 0002 (per-owner tables) and 0006 (storage). Never run
-- 0001 on its own against a live project.


create extension if not exists "pgcrypto";

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  owner_name text,
  owner_email text,
  phone text,
  type text,
  visitors text,
  logo_url text,
  gstin text,
  fssai text,
  address text,
  city text,
  tagline text,
  template text default 'virasat',
  upi_id text,
  created_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  name text not null,
  description text,
  price int default 0,
  is_veg boolean default true,
  tag text default '',
  available boolean default true,
  photo_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  order_no text,
  table_number text,
  status text default 'new',
  subtotal int default 0,
  gst int default 0,
  total int default 0,
  payment_status text default 'unpaid',
  payment_method text,
  customer_phone text,
  created_at timestamptz default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  dish_id uuid references dishes(id),
  name text,
  qty int default 1,
  price int default 0
);

create index if not exists idx_categories_rest on categories(restaurant_id);
create index if not exists idx_dishes_rest on dishes(restaurant_id);
create index if not exists idx_dishes_cat on dishes(category_id);
create index if not exists idx_orders_rest on orders(restaurant_id);
create index if not exists idx_orderitems_order on order_items(order_id);

-- ============================================================
-- RLS — DEMO policies (open). TODO: tighten with Supabase Auth
-- before public launch so only the owner can edit their data.
-- ============================================================
alter table restaurants enable row level security;
alter table categories enable row level security;
alter table dishes enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists p_rest_all on restaurants;
drop policy if exists p_cat_all on categories;
drop policy if exists p_dish_all on dishes;
drop policy if exists p_order_all on orders;
drop policy if exists p_item_all on order_items;

create policy p_rest_all on restaurants for all using (true) with check (true);
create policy p_cat_all on categories for all using (true) with check (true);
create policy p_dish_all on dishes for all using (true) with check (true);
create policy p_order_all on orders for all using (true) with check (true);
create policy p_item_all on order_items for all using (true) with check (true);

-- realtime for live orders on the dashboard
alter publication supabase_realtime add table orders;


-- ---- storage: public bucket for logos, dish photos and licence scans ----
-- Public bucket for dish/logo photos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists p_photos_read on storage.objects;
drop policy if exists p_photos_write on storage.objects;

create policy p_photos_read on storage.objects
  for select using (bucket_id = 'photos');
create policy p_photos_write on storage.objects
  for all using (bucket_id = 'photos') with check (bucket_id = 'photos');

grant all on storage.objects to anon, authenticated;


-- ---- API grants (RLS decides what each role can actually touch) ----
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  restaurants, categories, dishes, orders, order_items
  to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
