-- ============================================================
-- Parosa 0018 — Kitchen Display (KDS)
--
-- • orders.cooking_at / ready_at / served_at, stamped automatically whenever
--   the status changes (from the kitchen screen, Overview or anywhere).
-- • order_items.done: the cook ticks items one by one.
-- • Kitchen sign-in, separate from staff: Restaurant ID + the restaurant's
--   registered mobile + a 6-digit OTP (WhatsApp once Meta is connected; until
--   then the owner sees it on Kitchen display). A correct OTP gives that
--   tablet its own device token; the owner can remove devices any time.
-- • Kitchen screen RPCs, gated by that device token:
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

-- ---------------- kitchen sign-in (OTP -> device token) ----------------
create table if not exists public.kitchen_otps (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  code text not null,
  attempts int not null default 0,
  used boolean not null default false,
  sent_whatsapp boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
create index if not exists kitchen_otps_rest on public.kitchen_otps (restaurant_id, created_at desc);
alter table public.kitchen_otps enable row level security;
drop policy if exists kitchen_otps_owner_read on public.kitchen_otps;
create policy kitchen_otps_owner_read on public.kitchen_otps for select
  using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));

create table if not exists public.kitchen_devices (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  token_hash text not null unique,
  name text not null default 'Kitchen screen',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.kitchen_devices enable row level security;
drop policy if exists kitchen_devices_owner_read on public.kitchen_devices;
create policy kitchen_devices_owner_read on public.kitchen_devices for select
  using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));
drop policy if exists kitchen_devices_owner_delete on public.kitchen_devices;
create policy kitchen_devices_owner_delete on public.kitchen_devices for delete
  using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));

-- last 10 digits, so "+91 98765 43210" and "9876543210" match
create or replace function public.parosa_phone10(p text) returns text
language sql immutable as $$ select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10) $$;

-- step 1: Restaurant ID + registered mobile -> a new 6-digit code (10 min)
create or replace function public.kitchen_request_otp(p_slug text, p_phone text)
returns json language plpgsql security definer set search_path = public as $$
declare r restaurants%rowtype; v_code text; v_id uuid;
begin
  select * into r from restaurants where lower(slug) = lower(trim(p_slug));
  if not found or length(parosa_phone10(r.phone)) < 10 or parosa_phone10(r.phone) <> parosa_phone10(p_phone) then
    return json_build_object('ok', false, 'error', 'nomatch');
  end if;
  if (select count(*) from kitchen_otps where restaurant_id = r.id and created_at > now() - interval '1 hour') >= 6 then
    return json_build_object('ok', false, 'error', 'toomany');
  end if;
  update kitchen_otps set used = true where restaurant_id = r.id and not used;   -- only the newest code works
  v_code := lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 1000000)::text, 6, '0');
  insert into kitchen_otps (restaurant_id, code) values (r.id, v_code) returning id into v_id;
  return json_build_object('ok', true, 'otp_id', v_id, 'restaurant_name', r.name,
                           'phone_end', right(parosa_phone10(r.phone), 4));
end $$;
grant execute on function public.kitchen_request_otp(text, text) to anon, authenticated;

-- step 2: the code -> a device token for this tablet (returned once, stored hashed)
create or replace function public.kitchen_verify_otp(p_slug text, p_phone text, p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare r restaurants%rowtype; o kitchen_otps%rowtype; v_token text;
begin
  select * into r from restaurants where lower(slug) = lower(trim(p_slug));
  if not found or parosa_phone10(r.phone) <> parosa_phone10(p_phone) then
    return json_build_object('ok', false, 'error', 'nomatch');
  end if;
  select * into o from kitchen_otps where restaurant_id = r.id and not used and expires_at > now()
    order by created_at desc limit 1 for update;
  if not found then return json_build_object('ok', false, 'error', 'expired'); end if;
  if o.code <> trim(p_code) then
    update kitchen_otps set attempts = attempts + 1, used = (attempts + 1 >= 5) where id = o.id;
    return json_build_object('ok', false, 'error', case when o.attempts + 1 >= 5 then 'expired' else 'wrong' end,
                             'left', 4 - o.attempts);
  end if;
  update kitchen_otps set used = true where id = o.id;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into kitchen_devices (restaurant_id, token_hash, name)
    values (r.id, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
            'Kitchen screen ' || (select count(*) + 1 from kitchen_devices where restaurant_id = r.id));
  return json_build_object('ok', true, 'token', v_token, 'restaurant_id', r.id,
                           'restaurant_name', r.name, 'slug', r.slug);
end $$;
grant execute on function public.kitchen_verify_otp(text, text, text) to anon, authenticated;

-- is this tablet still signed in? (also notes when it was last seen)
create or replace function public.parosa_kitchen_ok(p_restaurant uuid, p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_seen timestamptz;
begin
  select id, last_seen into v_id, v_seen from kitchen_devices
   where restaurant_id = p_restaurant and token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  if v_id is null then return false; end if;
  if v_seen < now() - interval '5 minutes' then update kitchen_devices set last_seen = now() where id = v_id; end if;
  return true;
end $$;
revoke all on function public.parosa_kitchen_ok(uuid, text) from public;

create or replace function public.kitchen_sign_out(p_restaurant uuid, p_token text)
returns void language sql security definer set search_path = public as $$
  delete from kitchen_devices
   where restaurant_id = p_restaurant and token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;
grant execute on function public.kitchen_sign_out(uuid, text) to anon, authenticated;

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
create or replace function public.kitchen_orders(p_restaurant uuid, p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare r restaurants%rowtype;
begin
  if not parosa_kitchen_ok(p_restaurant, p_token) then return null; end if;
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
grant execute on function public.kitchen_orders(uuid, text) to anon, authenticated;

create or replace function public.kitchen_set_status(p_restaurant uuid, p_token text, p_order uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('new', 'cooking', 'ready', 'served') then raise exception 'Unknown status'; end if;
  if not parosa_kitchen_ok(p_restaurant, p_token) then return false; end if;
  update orders set status = p_status where id = p_order and restaurant_id = p_restaurant;
  return found;
end $$;
grant execute on function public.kitchen_set_status(uuid, text, uuid, text) to anon, authenticated;

create or replace function public.kitchen_item_done(p_restaurant uuid, p_token text, p_item uuid, p_done boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not parosa_kitchen_ok(p_restaurant, p_token) then return false; end if;
  update order_items i set done = p_done
    from orders o where i.id = p_item and o.id = i.order_id and o.restaurant_id = p_restaurant;
  return found;
end $$;
grant execute on function public.kitchen_item_done(uuid, text, uuid, boolean) to anon, authenticated;

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

-- the waiter's phone: "Served" on a ready order
create or replace function public.staff_served(p_restaurant uuid, p_code text, p_staff uuid, p_order uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not parosa_staff_ok(p_restaurant, p_code, p_staff) then return false; end if;
  update orders set status = 'served' where id = p_order and restaurant_id = p_restaurant and status = 'ready';
  return found;
end $$;
grant execute on function public.staff_served(uuid, text, uuid, uuid) to anon, authenticated;

notify pgrst, 'reload schema';

select 'kitchen display ok' as result;
