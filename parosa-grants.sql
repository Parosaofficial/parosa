grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  restaurants, categories, dishes, orders, order_items
  to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
select 'grants applied' as result;
