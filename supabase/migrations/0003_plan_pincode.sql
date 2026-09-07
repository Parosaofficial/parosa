-- ============================================================
-- Parosa — add plan + pincode to restaurants
-- Safe to run more than once.
-- How to apply: paste into the Supabase SQL Editor and Run.
-- ============================================================
alter table restaurants
  add column if not exists plan    text default 'basic',
  add column if not exists pincode text;

select 'ok' as result,
  (select count(*) from information_schema.columns
    where table_name='restaurants' and column_name in ('plan','pincode')) as new_columns;
