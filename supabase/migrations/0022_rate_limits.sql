-- ============================================================
-- Parosa 0022 — per-visitor rate limits + bookings through the server
--
-- 1. parosa_rate_hit(key, limit, window): a counter the website's server
--    routes use to cap requests per visitor (IP) — WhatsApp codes, kitchen
--    sign-in, bookings. Only the server (service key) can call it.
-- 2. Table bookings go through the website's /api/book route (bot check +
--    rate limit) — the public key can no longer call reservation_create
--    directly.
--
-- Safe to run more than once.
-- ============================================================

create table if not exists public.api_hits (
  key text not null,
  at timestamptz not null default now()
);
create index if not exists api_hits_key_at on public.api_hits (key, at desc);
alter table public.api_hits enable row level security;   -- no policies: server only

-- true = allowed (and counted); false = over the limit for this window
create or replace function public.parosa_rate_hit(p_key text, p_limit int, p_window_s int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from api_hits where key = p_key and at > now() - make_interval(secs => p_window_s);
  if n >= p_limit then return false; end if;
  insert into api_hits (key) values (p_key);
  -- tidy up now and then (about 1 call in 50)
  if random() < 0.02 then delete from api_hits where at < now() - interval '1 day'; end if;
  return true;
end $$;
revoke all on function public.parosa_rate_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.parosa_rate_hit(text, int, int) to service_role;

-- bookings: only the server route (which checks the bot test and rate limit)
revoke execute on function public.reservation_create(uuid, uuid, timestamptz, int, text, text, text) from public, anon, authenticated;
grant execute on function public.reservation_create(uuid, uuid, timestamptz, int, text, text, text) to service_role;

notify pgrst, 'reload schema';

select 'rate limits ok' as result;
