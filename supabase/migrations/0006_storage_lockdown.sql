-- Parosa 0006 — lock down photo storage.
-- The original demo policy (p_photos_write) let ANYONE, including anonymous
-- visitors holding the public anon key, upload, overwrite or delete any file
-- in the photos bucket. Now:
--   * anyone can still VIEW photos (menus are public),
--   * only signed-in owners can upload,
--   * a file can only be replaced or deleted by the account that uploaded it.
-- Every upload in the app (signup, Settings logo, Menu editor) happens after
-- sign-in, so nothing in the app changes.

drop policy if exists p_photos_write  on storage.objects;
drop policy if exists p_photos_insert on storage.objects;
drop policy if exists p_photos_update on storage.objects;
drop policy if exists p_photos_delete on storage.objects;

create policy p_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos');

create policy p_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'photos');

create policy p_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and owner_id = (select auth.uid())::text);

-- p_photos_read (public SELECT on the photos bucket) is unchanged.
