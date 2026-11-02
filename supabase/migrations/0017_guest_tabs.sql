-- ============================================================
-- Parosa 0017 — guest Waiter tab + calls on the waiter's phone
--
-- • table_session_status also returns the assigned waiter's first name and
--   whether a call is waiting, so the guest's Waiter tab can show
--   "Ravi is looking after your table".
-- • staff_calls / staff_call_seen: the staff POS (signed in with the daily
--   code) checks for tables calling it — the assigned waiter's tables, plus
--   tables nobody is assigned to — and marks them "on my way".
--
-- Safe to run more than once.
-- ============================================================

create or replace function public.table_session_status(p_session uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'status', s.status, 'close_reason', s.close_reason, 'table_code', s.table_code,
    'bill_asked', s.bill_asked_at is not null,
    'waiter_called', s.waiter_call_at is not null,
    -- first name only: guests don't need the waiter's full name
    'waiter_name', (select split_part(trim(st.name), ' ', 1) from staff st where st.id = s.waiter_id)
  )
  from table_sessions s where s.id = p_session;
$$;
grant execute on function public.table_session_status(uuid) to anon, authenticated;

-- is this a valid staff member signed in with today's code?
create or replace function public.parosa_staff_ok(p_restaurant uuid, p_code text, p_staff uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from restaurants r join staff st on st.restaurant_id = r.id
     where r.id = p_restaurant and st.id = p_staff and coalesce(st.active, true)
       and r.staff_code is not null and r.staff_code = p_code and r.staff_code_date = current_date
  );
$$;
revoke all on function public.parosa_staff_ok(uuid, text, uuid) from public;

-- tables calling this waiter (or calling with no waiter assigned yet)
create or replace function public.staff_calls(p_restaurant uuid, p_code text, p_staff uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not parosa_staff_ok(p_restaurant, p_code, p_staff) then return '[]'::json; end if;
  return coalesce((
    select json_agg(json_build_object(
      'session_id', s.id, 'code', s.code, 'table_code', s.table_code,
      'table_name', coalesce(t.name, s.table_code), 'called_at', s.waiter_call_at,
      'mine', s.waiter_id = p_staff
    ) order by s.waiter_call_at)
    from table_sessions s left join restaurant_tables t on t.id = s.table_id
    where s.restaurant_id = p_restaurant and s.status = 'open' and s.waiter_call_at is not null
      and (s.waiter_id = p_staff or s.waiter_id is null)
  ), '[]'::json);
end $$;
grant execute on function public.staff_calls(uuid, text, uuid) to anon, authenticated;

-- "On my way": clears the call; an unassigned table becomes this waiter's
create or replace function public.staff_call_seen(p_restaurant uuid, p_code text, p_staff uuid, p_session uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not parosa_staff_ok(p_restaurant, p_code, p_staff) then return false; end if;
  update table_sessions
     set waiter_call_at = null, waiter_id = coalesce(waiter_id, p_staff)
   where id = p_session and restaurant_id = p_restaurant and status = 'open';
  return found;
end $$;
grant execute on function public.staff_call_seen(uuid, text, uuid, uuid) to anon, authenticated;

notify pgrst, 'reload schema';

select 'guest tabs ok' as result;
