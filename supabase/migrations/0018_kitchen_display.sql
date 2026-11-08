-- ============================================================
-- Parosa 0018 — Kitchen Display (KDS)
--
-- • orders.cooking_at / ready_at / served_at, stamped automatically whenever
--   the status changes (from the kitchen screen, Overview or anywhere).
-- • order_items.done: the cook ticks items one by one.
-- • Kitchen screen RPCs, gated by the staff daily code like the POS:
--   kitchen_orders, kitchen_set_status, kitchen_item_done.
-- • staff_ready: orders the kitchen marked Ready, for the waiter's phone.
-- • Stations: kitchen_stations on the restaurant ([{name, categories:[ids]}])
--   so each kitchen screen can show only its own dishes.
--
-- Safe to run more than once. Needs 0017 (parosa_staff_ok).
-- ============================================================

alter table public.orders
  add column if not exists cooking_at timestamptz,
  add column if not exists ready_at   timestamptz,
  add column if not exists served_at  timestamptz;

alter table public.order_items add column if not exists done boolean not null default false;

alter table public.restaurants
  add column if not exists kitchen_stations jsonb not null default '[]'::jsonb,
  add column if not exists kds_amber_min int not null default 10,
  add column if not exists kds_red_min   int not null default 20;

-- stamp the time of each kitchen step, whoever changes the status
create or replace function public.orders_kitchen_times() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'cooking' then new.cooking_at := coalesce(new.cooking_at, now()); new.ready_at := null; new.served_at := null; end if;
    if new.status = 'ready'   then new.ready_at := now(); new.served_at := null; end if;
    if new.status = 'served'  then new.served_at := now(); end if;
    if new.status = 'new'     then new.cooking_at := null; new.ready_at := null; new.served_at := null; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_orders_kitchen_times on public.orders;
create trigger trg_orders_kitchen_times before update on public.orders
  for each row execute function public.orders_kitchen_times();

-- one order as the kitchen sees it
create or replace function public.parosa_kitchen_order(o public.orders)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', o.id, 'order_no', o.order_no, 'status', o.status, 'note', o.note,
    'table_number', o.table_number,
    'table_name', (select t.name from restaurant_tables t where t.restaurant_id = o.restaurant_id and t.code = o.table_number limit 1),
    'staff_name', o.staff_name,
    'waiter_name', (select split_part(trim(st.name), ' ', 1) from table_sessions s join staff st on st.id = s.waiter_id where s.id = o.session_id),
    'created_at', o.created_at, 'cooking_at', o.cooking_at, 'ready_at', o.ready_at, 'served_at', o.served_at,
    'items', coalesce((
      select json_agg(json_build_object('id', i.id, 'name', i.name, 'qty', i.qty, 'done', i.done,
                                        'category_id', d.category_id, 'is_veg', d.is_veg) order by i.name)
      from order_items i left join dishes d on d.id = i.dish_id where i.order_id = o.id), '[]'::json)
  );
$$;
revoke all on function public.parosa_kitchen_order(public.orders) from public;

-- the kitchen screen: open orders (last 18 hours) + the last served ones for Recall
create or replace function public.kitchen_orders(p_restaurant uuid, p_code text, p_staff uuid)
returns json language plpgsql security definer set search_path = public as $$
declare r restaurants%rowtype;
begin
  if not parosa_staff_ok(p_restaurant, p_code, p_staff) then return null; end if;
  select * into r from restaurants where id = p_restaurant;
  return json_build_object(
    'stations', r.kitchen_stations, 'amber_min', r.kds_amber_min, 'red_min', r.kds_red_min,
    'orders', coalesce((
      select json_agg(parosa_kitchen_order(o) order by o.created_at)
      from orders o where o.restaurant_id = p_restaurant and o.status in ('new', 'cooking', 'ready')
        and o.created_at > now() - interval '18 hours'), '[]'::json),
    'recent', coalesce((
      select json_agg(x.j order by x.t desc) from (
        select parosa_kitchen_order(o) j, o.served_at t from orders o
         where o.restaurant_id = p_restaurant and o.status = 'served' and o.served_at > now() - interval '45 minutes'
         order by o.served_at desc limit 12) x), '[]'::json)
  );
end $$;
grant execute on function public.kitchen_orders(uuid, text, uuid) to anon, authenticated;

create or replace function public.kitchen_set_status(p_restaurant uuid, p_code text, p_staff uuid, p_order uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('new', 'cooking', 'ready', 'served') then raise exception 'Unknown status'; end if;
  if not parosa_staff_ok(p_restaurant, p_code, p_staff) then return false; end if;
  update orders set status = p_status where id = p_order and restaurant_id = p_restaurant;
  return found;
end $$;
grant execute on function public.kitchen_set_status(uuid, text, uuid, uuid, text) to anon, authenticated;

create or replace function public.kitchen_item_done(p_restaurant uuid, p_code text, p_staff uuid, p_item uuid, p_done boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not parosa_staff_ok(p_restaurant, p_code, p_staff) then return false; end if;
  update order_items i set done = p_done
    from orders o where i.id = p_item and o.id = i.order_id and o.restaurant_id = p_restaurant;
  return found;
end $$;
grant execute on function public.kitchen_item_done(uuid, text, uuid, uuid, boolean) to anon, authenticated;

-- the waiter's phone: food ready for this waiter's tables (or tables with no waiter yet)
create or replace function public.staff_ready(p_restaurant uuid, p_code text, p_staff uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not parosa_staff_ok(p_restaurant, p_code, p_staff) then return '[]'::json; end if;
  return coalesce((
    select json_agg(json_build_object(
      'order_id', o.id, 'order_no', o.order_no, 'ready_at', o.ready_at,
      'table_name', coalesce((select t.name from restaurant_tables t where t.restaurant_id = o.restaurant_id and t.code = o.table_number limit 1), o.table_number),
      'mine', s.waiter_id = p_staff
    ) order by o.ready_at)
    from orders o join table_sessions s on s.id = o.session_id
    where o.restaurant_id = p_restaurant and o.status = 'ready' and s.status = 'open'
      and (s.waiter_id = p_staff or s.waiter_id is null)
  ), '[]'::json);
end $$;
grant execute on function public.staff_ready(uuid, text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';

select 'kitchen display ok' as result;
