-- Public bucket for dish/logo photos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists p_photos_read on storage.objects;
drop policy if exists p_photos_write on storage.objects;

create policy p_photos_read on storage.objects
  for select using (bucket_id = 'photos');
create policy p_photos_write on storage.objects
  for all using (bucket_id = 'photos') with check (bucket_id = 'photos');

grant all on storage.objects to anon, authenticated;

select 'storage ready' as result;
