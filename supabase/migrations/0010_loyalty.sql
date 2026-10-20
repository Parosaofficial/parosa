-- ============================================================
-- Parosa — Digital stamp cards (loyalty)
--
-- A guest earns one stamp each time an order carrying their phone number is
-- marked PAID (and meets the restaurant's minimum). Stamps are added by a
-- database trigger, so no client can fake a visit. When stamps reach the goal
-- the reward is ready; owner or staff redeem it, which takes `goal` stamps off.
--
-- Safe to run more than once.
-- ============================================================

-- 1) Owner settings on the restaurant ----------------------
alter table restaurants
  add column if not exists loyalty_enabled boolean default false,
  add column if not exists loyalty_goal    int     default 8,
  add column if not exists loyalty_min     int     default 0,
  add column if not exists loyalty_reward  text;

-- 2) Each order stamps at most once -------------------------
alter table orders
  add column if not exists stamped boolean default false;

-- 3) One card per guest phone per restaurant ----------------
create table if not exists loyalty_cards (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references restaurants(id) on delete cascade,
  phone            text not null,                       -- last 10 digits
  token            uuid not null unique default gen_random_uuid(), -- the guest's private card link
  stamps           int  not null default 0,
  rewards_redeemed int  not null default 0,
  last_stamp_at    timestamptz,
  created_at       timestamptz default now(),
  unique (restaurant_id, phone)
);
create index if not exists idx_loyalty_rest on loyalty_cards(restaurant_id);

alter table loyalty_cards enable row level security;
revoke all on loyalty_cards from anon;
grant select, update on loyalty_cards to authenticated;
drop policy if exists p_loyalty_owner_select on loyalty_cards;
create policy p_loyalty_owner_select on loyalty_cards for select to authenticated
  using (restaurant_id in (select id from restaurants where owner_id = auth.uid()));
drop policy if exists p_loyalty_owner_update on loyalty_cards;
create policy p_loyalty_owner_update on loyalty_cards for update to authenticated
  using      (restaurant_id in (select id from restaurants where owner_id = auth.uid()))
  with check (restaurant_id in (select id from restaurants where owner_id = auth.uid()) and stamps >= 0);

-- helper: normalise any phone to its last 10 digits ('' if too short)
create or replace function loyalty_phone(p text) returns text
language sql immutable as $$
  select case when length(d) >= 10 then right(d, 10) else '' end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x;
$$;

-- 4) The stamping trigger -----------------------------------
create or replace function loyalty_on_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r  restaurants%rowtype;
  ph text := loyalty_phone(new.customer_phone);
begin
  if ph = '' then return new; end if;
  select * into r from restaurants where id = new.restaurant_id;
  if not coalesce(r.loyalty_enabled, false) then return new; end if;

  -- make sure the guest has a card (so the bill can link to it even before paying)
  insert into loyalty_cards (restaurant_id, phone) values (new.restaurant_id, ph)
  on conflict (restaurant_id, phone) do nothing;

  if new.payment_status = 'paid'
     and not coalesce(new.stamped, false)
     and coalesce(new.total, 0) >= coalesce(r.loyalty_min, 0) then
    update loyalty_cards set stamps = stamps + 1, last_stamp_at = now()
    where restaurant_id = new.restaurant_id and phone = ph;
    new.stamped := true;
  end if;
  return new;
end $$;

drop trigger if exists trg_loyalty_on_order on orders;
create trigger trg_loyalty_on_order
  before insert or update of payment_status, customer_phone on orders
  for each row execute function loyalty_on_order();

-- 5) Guest: read a card by its private token ----------------
create or replace function loyalty_card(p_token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'restaurant_name', r.name, 'slug', r.slug, 'logo_url', r.logo_url,
    'enabled', coalesce(r.loyalty_enabled, false),
    'goal', coalesce(r.loyalty_goal, 8), 'min', coalesce(r.loyalty_min, 0),
    'reward', r.loyalty_reward,
    'stamps', c.stamps, 'rewards_redeemed', c.rewards_redeemed,
    'phone_tail', right(c.phone, 2), 'last_stamp_at', c.last_stamp_at)
  from loyalty_cards c join restaurants r on r.id = c.restaurant_id
  where c.token = p_token;
$$;
grant execute on function loyalty_card(uuid) to anon, authenticated;

-- 6) Guest: the card link for an order they just placed ----
create or replace function loyalty_token_for_order(p_order uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select c.token from orders o
  join loyalty_cards c on c.restaurant_id = o.restaurant_id and c.phone = loyalty_phone(o.customer_phone)
  where o.id = p_order;
$$;
grant execute on function loyalty_token_for_order(uuid) to anon, authenticated;

-- 7) Owner: redeem a reward ---------------------------------
create or replace function loyalty_redeem(p_card uuid)
returns int language plpgsql security definer set search_path = public as $$
declare g int; s int;
begin
  select coalesce(r.loyalty_goal, 8), c.stamps into g, s
  from loyalty_cards c join restaurants r on r.id = c.restaurant_id
  where c.id = p_card and r.owner_id = auth.uid();
  if g is null then raise exception 'not allowed'; end if;
  if s < g then raise exception 'not enough stamps'; end if;
  update loyalty_cards set stamps = stamps - g, rewards_redeemed = rewards_redeemed + 1 where id = p_card;
  return s - g;
end $$;
grant execute on function loyalty_redeem(uuid) to authenticated;

-- 8) Staff (POS): look up / redeem, gated by today's code ---
create or replace function staff_loyalty(p_restaurant_id uuid, p_code text, p_phone text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'enabled', coalesce(r.loyalty_enabled, false),
    'goal', coalesce(r.loyalty_goal, 8), 'reward', r.loyalty_reward,
    'stamps', coalesce(c.stamps, 0))
  from restaurants r
  left join loyalty_cards c on c.restaurant_id = r.id and c.phone = loyalty_phone(p_phone)
  where r.id = p_restaurant_id
    and r.staff_code = p_code and r.staff_code_date = current_date;
$$;
grant execute on function staff_loyalty(uuid, text, text) to anon, authenticated;

create or replace function staff_loyalty_redeem(p_restaurant_id uuid, p_code text, p_phone text)
returns int language plpgsql security definer set search_path = public as $$
declare g int; s int; cid uuid;
begin
  select coalesce(r.loyalty_goal, 8), c.stamps, c.id into g, s, cid
  from restaurants r
  join loyalty_cards c on c.restaurant_id = r.id and c.phone = loyalty_phone(p_phone)
  where r.id = p_restaurant_id and r.staff_code = p_code and r.staff_code_date = current_date;
  if cid is null then raise exception 'not allowed'; end if;
  if s < g then raise exception 'not enough stamps'; end if;
  update loyalty_cards set stamps = stamps - g, rewards_redeemed = rewards_redeemed + 1 where id = cid;
  return s - g;
end $$;
grant execute on function staff_loyalty_redeem(uuid, text, text) to anon, authenticated;
