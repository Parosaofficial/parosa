-- ============================================================
-- Parosa — add plan + pincode, and fix order_items FK so dishes
-- (and restaurants) with past orders can be deleted.
-- Safe to run more than once.
-- How to apply: paste into the Supabase SQL Editor and Run.
-- ============================================================
alter table restaurants
  add column if not exists plan    text default 'basic',
  add column if not exists pincode text;

-- Keep order history when a dish is deleted: null the reference
-- instead of blocking the delete (the item keeps its saved name/price).
alter table order_items drop constraint if exists order_items_dish_id_fkey;
alter table order_items
  add constraint order_items_dish_id_fkey
  foreign key (dish_id) references dishes(id) on delete set null;

select 'ok' as result,
  (select count(*) from information_schema.columns
    where table_name='restaurants' and column_name in ('plan','pincode')) as new_columns;
