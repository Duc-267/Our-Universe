-- Photos and secret capsules. Runs after the Phase 2 checks, in the same database.

select couple_id as couple_a
from public.couple_members where user_id = '00000000-0000-0000-0000-000000000001' \gset

select id as memory_walk
from public.memories where title = 'First evening walk' \gset

create or replace function test.reject_sql(p_sql text)
returns void language plpgsql as $$
declare rejected boolean := false;
begin
  begin
    execute p_sql;
  exception when others then
    rejected := true;
  end;
  if not rejected then raise exception 'TEST FAILED: % should be rejected', p_sql; end if;
end;
$$;

create or replace function test.fill_memory_photos(p_memory uuid, p_count int)
returns void language plpgsql as $$
declare
  i int;
  photo uuid;
  base text;
  couple uuid;
begin
  select couple_id into couple from public.memories where id = p_memory;
  for i in 1..p_count loop
    photo := gen_random_uuid();
    base := couple::text || '/memories/' || p_memory::text || '/' || photo::text || '/';
    insert into storage.objects (id, bucket_id, name, owner_id) values
      (gen_random_uuid(), 'universe-media', base || 'full.webp', auth.uid()::text),
      (gen_random_uuid(), 'universe-media', base || 'thumb.webp', auth.uid()::text);
    perform public.add_memory_photo(p_memory, photo, 'webp', 800, 600);
  end loop;
end;
$$;

grant execute on function test.reject_sql(text), test.fill_memory_photos(uuid, int) to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

select public.create_capsule(:'couple_a', 'Later', 'secret words', current_date + 30) as capsule_id \gset
select test.assert_true(
  (select object_type = 'COMET' and position_x ^ 2 + position_y ^ 2 + position_z ^ 2 between 84 ^ 2 and 96 ^ 2
   from public.cosmic_objects where capsule_id = :'capsule_id'),
  'capsule appears as a distant comet');
select test.assert_true(
  (select metadata::text not like '%secret words%' from public.relationship_events
   where event_type = 'CAPSULE_CREATED' and source_entity_id = :'capsule_id'),
  'capsule event does not store the message');
select test.assert_true(
  (select title = 'Later' and message = 'secret words' from public.capsule_contents where capsule_id = :'capsule_id'),
  'creator can read the sealed message');
select test.reject_sql(format('select public.open_capsule(%L)', :'capsule_id'));
select test.reject_sql(format('select public.create_capsule(%L, ''Past'', ''nope'', ''2000-01-01'')', :'couple_a'));
select test.reject_sql(format('select public.create_capsule(%L, ''Too far'', ''nope'', ''2200-01-01'')', :'couple_a'));

select test.fill_memory_photos(:'memory_walk', 6);
select test.assert_true(
  (select count(*) = 6 from public.memory_photos where memory_id = :'memory_walk'),
  'memory accepts six photos');
select test.reject_sql(format('select test.fill_memory_photos(%L, 1)', :'memory_walk'));
select test.assert_true(
  (select count(*) = 6 from public.memory_photos where memory_id = :'memory_walk'),
  'seventh photo is rejected');

insert into storage.objects (id, bucket_id, name, owner_id) values
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/capsules/' || :'capsule_id' || '/full.webp', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/capsules/' || :'capsule_id' || '/thumb.webp', '00000000-0000-0000-0000-000000000001');
select public.attach_capsule_image(:'capsule_id', 'webp', 640, 480);
select test.assert_true(
  (select image_full_path is not null from public.capsule_contents where capsule_id = :'capsule_id'),
  'creator can attach one capsule image');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select test.assert_true(
  (select count(*) = 1 from public.capsules where id = :'capsule_id'),
  'partner can see the sealed capsule');
select test.assert_true(
  (select count(*) = 1 from public.cosmic_objects where capsule_id = :'capsule_id'),
  'partner can see the comet');
select test.assert_true(
  (select count(*) = 0 from public.capsule_contents where capsule_id = :'capsule_id'),
  'partner cannot read the sealed message');
select test.assert_true(
  (select count(*) = 0 from storage.objects where name like :'couple_a' || '/capsules/%'),
  'partner cannot read the sealed image');
select test.assert_true(
  (select count(*) = 12 from storage.objects where name like :'couple_a' || '/memories/%'),
  'partner can read memory photo files');
select test.reject_sql(format('select public.open_capsule(%L)', :'capsule_id'));

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select test.assert_true(
  (select count(*) = 0 from public.capsules where couple_id = :'couple_a'),
  'outside user cannot see the capsule');
select test.assert_true(
  (select count(*) = 0 from public.memory_photos where couple_id = :'couple_a'),
  'outside user cannot see memory photos');
select test.assert_true(
  (select count(*) = 0 from storage.objects where name like :'couple_a' || '/%'),
  'outside user cannot read media files');
select test.reject_sql(format(
  'insert into storage.objects (id, bucket_id, name, owner_id) values (gen_random_uuid(), ''universe-media'', %L, auth.uid()::text)',
  :'couple_a' || '/capsules/' || :'capsule_id' || '/full.webp'
));

reset role;
update public.capsules set unlock_at = now() - interval '1 minute' where id = :'capsule_id';

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select public.open_capsule(:'capsule_id') as opened_at \gset
select test.assert_true(
  (select opened_at = :'opened_at'::timestamptz and opened_by = '00000000-0000-0000-0000-000000000002'
   from public.capsules where id = :'capsule_id'),
  'opening stores the timestamp and opener');
select test.assert_true(
  (select message = 'secret words' from public.capsule_contents where capsule_id = :'capsule_id'),
  'opened message stays readable');
select test.assert_true(
  (select count(*) = 2 from storage.objects where name like :'couple_a' || '/capsules/%'),
  'opened image becomes readable');
select public.open_capsule(:'capsule_id') as opened_again \gset
select test.assert_true(:'opened_again' = :'opened_at', 'opening again keeps the original timestamp');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.create_capsule(:'couple_a', 'Unsent', 'still sealed', current_date + 60) as spare_capsule \gset
select public.delete_capsule(:'spare_capsule');
select test.assert_true(
  (select count(*) = 0 from public.capsules where id = :'spare_capsule'),
  'creator can remove a sealed capsule');
select test.assert_true(
  (select count(*) = 0 from public.cosmic_objects where capsule_id = :'spare_capsule'),
  'removing a capsule removes its comet');
select test.reject_sql(format('select public.delete_capsule(%L)', :'capsule_id'));

reset role;
select test.assert_true(
  not has_table_privilege('authenticated', 'public.memory_photos', 'INSERT'),
  'photos cannot be inserted directly');
select test.assert_true(
  not has_table_privilege('authenticated', 'public.capsule_contents', 'UPDATE'),
  'capsule content cannot be updated directly');
select test.assert_true(
  not has_function_privilege('anon', 'public.create_capsule(uuid, text, text, date)', 'EXECUTE'),
  'anon cannot create capsules');
select test.assert_true(
  (select file_size_limit = 5242880 and "public" = false from storage.buckets where id = 'universe-media'),
  'media bucket is private and size limited');
