alter table restaurants add column if not exists tables_count int default 0;
select 'ok' as result, (select tables_count from restaurants where slug='raj-darbar') as raj_tables;
