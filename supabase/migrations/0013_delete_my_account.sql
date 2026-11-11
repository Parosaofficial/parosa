-- 0013 — "Delete my account" for the mobile app (Google Play requires that a
-- user who can sign up in the app can also delete their account from it).
--
-- Removes the signed-in owner's restaurant(s) — categories, dishes, orders,
-- staff and loyalty cards cascade — and then their Supabase Auth user.
-- Runs as the function owner so it can reach auth.users; it only ever touches
-- the caller's own rows (auth.uid()).

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from public.restaurants where owner_id = uid;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
