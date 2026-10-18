-- Cosmic events. Runs after phase3-memory-gravity.sql.

select couple_id as couple_a
from public.couple_members where user_id = '00000000-0000-0000-0000-000000000001' \gset

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

select public.refresh_milestones();
select public.refresh_cosmic_events();

select test.assert_true(
  (select count(*) = (
      select count(*) from public.milestones where couple_id = :'couple_a'
    )
   from public.cosmic_events where couple_id = :'couple_a'),
  'each milestone records one cosmic event');
select test.assert_true(
  (select bool_and(event.kind = 'aurora')
   from public.cosmic_events event
   join public.milestones milestone on milestone.id = event.milestone_id
   where milestone.couple_id = :'couple_a' and milestone.kind = 'anniversary'),
  'anniversaries become an aurora');
select test.assert_true(
  (select kind = 'meteor_shower' from public.cosmic_events event
   join public.milestones milestone on milestone.id = event.milestone_id
   where milestone.couple_id = :'couple_a' and milestone.kind = 'days' and milestone.key = '100'),
  '100 days becomes a meteor shower');
select test.assert_true(
  (select kind = 'planet_bloom' from public.cosmic_events event
   join public.milestones milestone on milestone.id = event.milestone_id
   where milestone.couple_id = :'couple_a' and milestone.kind = 'days' and milestone.key = '365'),
  '365 days becomes a planet bloom');

select public.refresh_cosmic_events();
select test.assert_true(
  (select count(*) = (
      select count(*) from public.milestones where couple_id = :'couple_a'
    )
   from public.cosmic_events where couple_id = :'couple_a'),
  'refresh does not duplicate cosmic events');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select public.refresh_cosmic_events();
select test.assert_true(
  (select count(*) = 0 from public.cosmic_events where couple_id = :'couple_a'),
  'other couple cannot read cosmic events');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select test.assert_true(
  (select count(*) = (
      select count(*) from public.milestones where couple_id = :'couple_a'
    )
   from public.cosmic_events where couple_id = :'couple_a'),
  'another couple refresh does not add events here');

reset role;
