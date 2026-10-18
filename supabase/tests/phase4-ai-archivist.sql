-- Archive summaries. Runs after phase3-future-dreams.sql.

select couple_id as couple_a
from public.couple_members where user_id = '00000000-0000-0000-0000-000000000001' \gset

select couple_id as couple_c
from public.couple_members where user_id = '00000000-0000-0000-0000-000000000003' \gset

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

select public.refresh_archive();
select public.refresh_archive();
select test.assert_true(
  (select count(*) = 1 from public.archive_summaries where couple_id = :'couple_a'),
  'refresh keeps one archive row');
select test.assert_true(
  (select memory_count = (select count(*) from public.memories where couple_id = :'couple_a')
   from public.archive_summaries where couple_id = :'couple_a'),
  'archive memory count matches stored memories');
select test.assert_true(
  (select dream_count = (select count(*) from public.future_dreams where couple_id = :'couple_a')
   from public.archive_summaries where couple_id = :'couple_a'),
  'archive dream count matches stored dreams');
select test.assert_true(
  (select top_category = (
     select category from public.memories
     where couple_id = :'couple_a'
     group by category
     order by count(*) desc, category asc
     limit 1
   )
   from public.archive_summaries where couple_id = :'couple_a'),
  'archive names the most recorded category');
select test.assert_true(
  (select body like ('%The category recorded most often is ' || top_category || '.%')
      and body like '%Moments kept here include %'
      and body !~* 'should|advice|healthy|compatib|break up|score'
   from public.archive_summaries where couple_id = :'couple_a'),
  'archive recounts records without advice');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select test.assert_true(
  (select count(*) = 0 from public.archive_summaries where couple_id = :'couple_a'),
  'other couple cannot read the archive');
select public.refresh_archive();
select test.assert_true(
  (select count(*) = 1 from public.archive_summaries where couple_id = :'couple_c'),
  'other couple gets their own archive');
select test.assert_true(
  (select case
     when memory_count = 0 and checkin_count = 0 and same_moment_count = 0
      and trip_count = 0 and quest_count = 0 and milestone_count = 0
      and constellation_count = 0 and dream_count = 0
     then body = 'Nothing is written in this archive yet.'
     else body <> 'Nothing is written in this archive yet.'
   end
   from public.archive_summaries where couple_id = :'couple_c'),
  'an empty archive uses the quiet sentence');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select test.assert_true(
  (select count(*) = 1 from public.archive_summaries where couple_id = :'couple_a'),
  'owner still sees their archive');

reset role;
