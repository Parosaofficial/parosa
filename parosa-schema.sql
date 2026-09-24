-- ============================================================
-- Parosa schema — restaurants, categories, dishes, orders, items
-- ============================================================
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

-- ============================================================
-- Seed: Raj Darbar demo restaurant + menu (idempotent)
-- ============================================================
do $$
declare
  rid uuid;
  c_tandoor uuid; c_curries uuid; c_biryani uuid; c_chinese uuid; c_sweets uuid; c_drinks uuid;
begin
  select id into rid from restaurants where slug = 'raj-darbar';
  if rid is null then
    insert into restaurants (slug, name, owner_name, type, visitors, gstin, fssai, address, city, tagline)
    values ('raj-darbar','Raj Darbar','Owner','Restaurant','50–100','06ABCDE1234F1Z5','10012345000123','NH-48, Kherki Daula, Gurugram','Gurugram','Royal North-Indian since 1994')
    returning id into rid;
  end if;

  if not exists (select 1 from categories where restaurant_id = rid) then
    insert into categories (restaurant_id,name,sort_order) values (rid,'Tandoor',1) returning id into c_tandoor;
    insert into categories (restaurant_id,name,sort_order) values (rid,'Curries',2) returning id into c_curries;
    insert into categories (restaurant_id,name,sort_order) values (rid,'Biryani',3) returning id into c_biryani;
    insert into categories (restaurant_id,name,sort_order) values (rid,'Chinese',4) returning id into c_chinese;
    insert into categories (restaurant_id,name,sort_order) values (rid,'Sweets',5) returning id into c_sweets;
    insert into categories (restaurant_id,name,sort_order) values (rid,'Drinks',6) returning id into c_drinks;

    insert into dishes (restaurant_id,category_id,name,description,price,is_veg,tag,available,sort_order) values
      (rid,c_tandoor,'Tandoori Chicken','Clay-oven charred · 24-hr marinade',320,false,'best',true,1),
      (rid,c_tandoor,'Paneer Tikka','Chargrilled · mint chutney',240,true,'',true,2),
      (rid,c_tandoor,'Malai Soya Chaap','Creamy · mildly spiced',220,true,'',false,3),
      (rid,c_tandoor,'Tandoori Prawns','Jumbo prawns · lemon butter',420,false,'new',true,4),
      (rid,c_curries,'Butter Chicken','Silky tomato gravy · cream',340,false,'best',true,1),
      (rid,c_curries,'Dal Makhani','Black lentils · overnight · ghee',220,true,'',true,2),
      (rid,c_curries,'Paneer Butter Masala','Cashew-tomato · soft paneer',260,true,'',true,3),
      (rid,c_biryani,'Hyderabadi Biryani','Dum chicken · saffron · raita',280,false,'best',true,1),
      (rid,c_biryani,'Veg Dum Biryani','Basmati · seasonal veg · raita',220,true,'',true,2),
      (rid,c_chinese,'Chilli Paneer','Crispy · sweet-hot',230,true,'',true,1),
      (rid,c_chinese,'Hakka Noodles','Wok-tossed · garlic · veg',190,true,'',true,2),
      (rid,c_sweets,'Gulab Jamun','2 pcs · warm · cardamom syrup',90,true,'',true,1),
      (rid,c_drinks,'Sweet Lassi','Thick · malai · chilled',80,true,'',true,1),
      (rid,c_drinks,'Masala Chai','Ginger-cardamom · kettle-brewed',40,true,'',true,2);
  end if;
end $$;

select 'ok' as result,
  (select count(*) from restaurants) as restaurants,
  (select count(*) from categories) as categories,
  (select count(*) from dishes) as dishes;
