-- Parosa 0005 — Google review link + scan-to-pay settings.
-- upi_id already exists on restaurants (0001); this adds the review side.

alter table public.restaurants
  add column if not exists google_review_url text,
  add column if not exists review_prompt boolean not null default true;

-- Both are public-by-design (they're printed on bills and shown on the guest
-- menu), and restaurants already has a public SELECT policy + owner-only
-- UPDATE policy, so no new RLS is needed.

-- The pay page (/pay/<order id>) linked from the WhatsApp bill.
-- Orders are private to the owner under RLS, so a guest can't SELECT them.
-- This returns ONLY what the pay page needs — amount, bill no., the
-- restaurant's UPI ID — and nothing about the customer (no phone, no name).
-- The order id is a random UUID, so the link itself is the key.
create or replace function public.order_pay_info(p_order uuid)
returns table (
  restaurant_name text,
  logo_url text,
  upi_id text,
  google_review_url text,
  review_prompt boolean,
  order_no text,
  table_number text,
  total int,
  payment_status text,
  payment_method text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.name, r.logo_url, r.upi_id, r.google_review_url, r.review_prompt,
         o.order_no, o.table_number, o.total, o.payment_status, o.payment_method
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where o.id = p_order;
$$;

revoke all on function public.order_pay_info(uuid) from public;
grant execute on function public.order_pay_info(uuid) to anon, authenticated;
