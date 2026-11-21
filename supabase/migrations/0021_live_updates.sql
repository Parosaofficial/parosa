-- ============================================================
-- Parosa 0021 — live updates instead of constant checking
--
-- When an order, order item or table session changes, the database sends a
-- tiny "something changed" signal (Supabase Realtime broadcast). Screens that
-- listen fetch the latest through their usual checked functions — the signal
-- itself carries NO order data, only which table changed.
--
--   live:<restaurants.live_key>  — kitchen screens + staff phones
--       (live_key is a secret per restaurant: not in restaurant_profiles,
--        handed out only by kitchen_orders and staff_live_key)
--   session:<table_sessions.id>  — the guests' phones at that table
--
-- The kitchen, waiter and guest screens keep a slow check as a safety net.
-- Safe to run more than once. Needs 0018 + 0019.
-- ============================================================

alter table public.restaurants add column if not exists live_key uuid not null default gen_random_uuid();

-- send the signal; never lets a Realtime hiccup block an order
create or replace function public.parosa_ping(p_restaurant uuid, p_session uuid, p_what text)
returns void language plpgsql security definer set search_path = public as $$
declare k uuid;
begin
  select live_key into k from restaurants where id = p_restaurant;
  if k is not null then
    perform realtime.send(jsonb_build_object('t', p_what), 'change', 'live:' || k::text, false);
  end if;
  if p_session is not null then
    perform realtime.send(jsonb_build_object('t', p_what), 'change', 'session:' || p_session::text, false);
  end if;
exception when others then
  null; -- the screens' slow check still catches up
end $$;
revoke all on function public.parosa_ping(uuid, uuid, text) from public;

create or replace function public.parosa_ping_orders() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform parosa_ping(new.restaurant_id, new.session_id, 'orders');
  return null;
end $$;
drop trigger if exists trg_ping_orders on public.orders;
create trigger trg_ping_orders after insert or update on public.orders
  for each row execute function public.parosa_ping_orders();

create or replace function public.parosa_ping_items() returns trigger
language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
begin
  select * into o from orders where id = new.order_id;
  if o.id is not null then perform parosa_ping(o.restaurant_id, o.session_id, 'items'); end if;
  return null;
end $$;
drop trigger if exists trg_ping_items on public.order_items;
create trigger trg_ping_items after update on public.order_items
  for each row execute function public.parosa_ping_items();

create or replace function public.parosa_ping_sessions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform parosa_ping(new.restaurant_id, new.id, 'sessions');
  return null;
end $$;
drop trigger if exists trg_ping_sessions on public.table_sessions;
create trigger trg_ping_sessions after insert or update on public.table_sessions
  for each row execute function public.parosa_ping_sessions();

-- the kitchen screen gets the live key with its board
create or replace function public.kitchen_orders(p_restaurant uuid, p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare r restaurants%rowtype;
begin
  if not parosa_kitchen_ok(p_restaurant, p_token) then return null; end if;
  select * into r from restaurants where id = p_restaurant;
  return json_build_object(
    'stations', r.kitchen_stations, 'amber_min', r.kds_amber_min, 'red_min', r.kds_red_min,
    'live', r.live_key,
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
grant execute on function public.kitchen_orders(uuid, text) to anon, authenticated;

-- staff phones (POS / waiter alerts) ask for the key with today's code
create or replace function public.staff_live_key(p_restaurant uuid, p_code text, p_staff uuid)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if not parosa_staff_ok(p_restaurant, p_code, p_staff) then return null; end if;
  return (select live_key from restaurants where id = p_restaurant);
end $$;
grant execute on function public.staff_live_key(uuid, text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';

select 'live updates ok' as result;
