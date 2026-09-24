delete from restaurants where slug like 'an-%' or slug like 'ux-%' or slug like 'test-%' or slug like 'bell-%' or slug like 'dlg-%' or slug like 'ui-demo-%';
select slug, name from restaurants order by created_at;
