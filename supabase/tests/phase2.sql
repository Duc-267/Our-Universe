-- Phase 2 daily check-ins. Runs after phase1.sql.

select couple_id as couple_a
from public.couple_members where user_id = '00000000-0000-0000-0000-000000000001' \gset

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

select public.save_checkin('calm', 'Quiet morning') as checkin_id \gset
select public.save_checkin('happy', 'Better now') as checkin_again \gset

select test.assert_true(:'checkin_id' = :'checkin_again', 'same day updates the existing check-in');
select test.assert_true(
  (select count(*) = 1 from public.daily_checkins where author_user_id = '00000000-0000-0000-0000-000000000001'),
  'only one check-in row for the day');
select test.assert_true(
  (select mood = 'happy' and note = 'Better now' from public.daily_checkins where id = :'checkin_id'),
  'updated mood is stored');
select test.assert_true(
  (select count(*) = 1 from public.relationship_events where event_type = 'CHECKIN_CREATED' and source_entity_id = :'checkin_id'),
  'one check-in event');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select test.assert_true(
  (select count(*) = 1 from public.daily_checkins where couple_id = :'couple_a'),
  'partner can read the check-in');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select test.assert_true(
  (select count(*) = 0 from public.daily_checkins where couple_id = :'couple_a'),
  'outside user cannot read the check-in');

reset role;
select test.assert_true(
  not has_table_privilege('authenticated', 'public.daily_checkins', 'INSERT'),
  'check-ins cannot be inserted directly');
select test.assert_true(
  not has_function_privilege('anon', 'public.save_checkin(text, text)', 'EXECUTE'),
  'anon cannot save a check-in');
