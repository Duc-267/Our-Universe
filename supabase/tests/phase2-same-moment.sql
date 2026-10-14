-- Same Moment and check-in photos. Runs after phase1-media.sql.

select couple_id as couple_a
from public.couple_members where user_id = '00000000-0000-0000-0000-000000000001' \gset

select id as checkin_id
from public.daily_checkins
where author_user_id = '00000000-0000-0000-0000-000000000001'
order by updated_at desc
limit 1 \gset

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
grant execute on function test.reject_sql(text) to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

insert into storage.objects (id, bucket_id, name, owner_id) values
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/checkins/' || :'checkin_id' || '/full.webp', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/checkins/' || :'checkin_id' || '/thumb.webp', '00000000-0000-0000-0000-000000000001');
select public.attach_checkin_photo(:'checkin_id', 'webp', 640, 480);
select test.assert_true(
  (select image_full_path is not null from public.daily_checkins where id = :'checkin_id'),
  'check-in can keep one photo');

select public.start_same_moment(true) as moment_id \gset
select test.assert_true(
  (select status = 'open' and blind and window_ends_at > now() from public.same_moments where id = :'moment_id'),
  'same moment opens with a window');
select test.reject_sql('select public.start_same_moment(true)');

insert into storage.objects (id, bucket_id, name, owner_id) values
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/moments/' || :'moment_id' || '/00000000-0000-0000-0000-000000000001/full.webp', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/moments/' || :'moment_id' || '/00000000-0000-0000-0000-000000000001/thumb.webp', '00000000-0000-0000-0000-000000000001');
select public.submit_same_moment(:'moment_id', 'webp', 800, 600, 'From Alex') as alex_submission \gset
select test.assert_true(
  (select count(*) = 1 from public.same_moment_submissions where same_moment_id = :'moment_id'),
  'first submission stored');
select test.assert_true(
  (select status = 'open' from public.same_moments where id = :'moment_id'),
  'one submission leaves the moment open');
select test.reject_sql(format('select public.submit_same_moment(%L, ''webp'', 800, 600, ''again'')', :'moment_id'));

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select test.assert_true(
  (select count(*) = 1 from public.same_moments where id = :'moment_id'),
  'partner sees the open moment');
select test.assert_true(
  (select count(*) = 0 from public.same_moment_submissions where same_moment_id = :'moment_id'),
  'blind mode hides the partner submission');
select test.assert_true(
  (select count(*) = 0 from storage.objects where name like :'couple_a' || '/moments/' || :'moment_id' || '/%'),
  'blind mode hides the partner photo files');

insert into storage.objects (id, bucket_id, name, owner_id) values
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/moments/' || :'moment_id' || '/00000000-0000-0000-0000-000000000002/full.webp', '00000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/moments/' || :'moment_id' || '/00000000-0000-0000-0000-000000000002/thumb.webp', '00000000-0000-0000-0000-000000000002');
select public.submit_same_moment(:'moment_id', 'webp', 720, 540, 'From Blair');
select test.assert_true(
  (select status = 'complete' and completed_at is not null from public.same_moments where id = :'moment_id'),
  'second submission completes the moment');
select test.assert_true(
  (select count(*) = 2 from public.same_moment_submissions where same_moment_id = :'moment_id'),
  'both submissions become readable');
select test.assert_true(
  (select count(*) = 2 from public.cosmic_objects where same_moment_id = :'moment_id' and object_type = 'TWIN_STAR'),
  'complete moment creates twin stars');
select test.assert_true(
  (select count(*) = 1 from public.relationship_events where event_type = 'SAME_MOMENT' and source_entity_id = :'moment_id'),
  'one same-moment relationship event');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select test.assert_true(
  (select count(*) = 0 from public.same_moments where couple_id = :'couple_a'),
  'outside user cannot see same moments');
select test.assert_true(
  (select count(*) = 0 from public.same_moment_submissions where couple_id = :'couple_a'),
  'outside user cannot see submissions');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.start_same_moment(false) as open_moment \gset
insert into storage.objects (id, bucket_id, name, owner_id) values
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/moments/' || :'open_moment' || '/00000000-0000-0000-0000-000000000001/full.webp', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/moments/' || :'open_moment' || '/00000000-0000-0000-0000-000000000001/thumb.webp', '00000000-0000-0000-0000-000000000001');
select public.submit_same_moment(:'open_moment', 'webp', 640, 480, 'visible');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select test.assert_true(
  (select count(*) = 1 from public.same_moment_submissions where same_moment_id = :'open_moment'),
  'non-blind partner can see the first photo');

reset role;
update public.same_moments
set created_at = now() - interval '3 minutes',
    window_ends_at = now() - interval '1 minute'
where id = :'open_moment';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select public.refresh_same_moments();
select test.assert_true(
  (select status = 'incomplete' from public.same_moments where id = :'open_moment'),
  'expired one-sided moment becomes incomplete');
select test.assert_true(
  (select count(*) = 0 from public.cosmic_objects where same_moment_id = :'open_moment'),
  'incomplete moment creates no twin stars');

reset role;
select test.assert_true(
  not has_table_privilege('authenticated', 'public.same_moments', 'INSERT'),
  'same moments cannot be inserted directly');
select test.assert_true(
  not has_function_privilege('anon', 'public.start_same_moment(boolean)', 'EXECUTE'),
  'anon cannot start a same moment');
