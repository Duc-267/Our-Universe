-- Anniversary moons and day milestones. Runs after phase2-same-moment.sql.

select couple_id as couple_a
from public.couple_members where user_id = '00000000-0000-0000-0000-000000000001' \gset

select couple_id as couple_c
from public.couple_members where user_id = '00000000-0000-0000-0000-000000000003' \gset

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

reset role;
update public.couples
set relationship_start_date = (current_date - 400)
where id = :'couple_a';
update public.couple_settings
set timezone = 'UTC'
where couple_id = :'couple_a';

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

select public.refresh_milestones();
select test.assert_true(
  (select count(*) = 1 from public.milestones where couple_id = :'couple_a' and kind = 'anniversary' and key = '1'),
  'first anniversary milestone is recorded');
select test.assert_true(
  (select count(*) = 1 from public.cosmic_objects where couple_id = :'couple_a' and object_type = 'MOON'
     and milestone_id = (
       select id from public.milestones
       where couple_id = :'couple_a' and kind = 'anniversary' and key = '1'
     )),
  'first anniversary creates one moon');
select test.assert_true(
  (select count(*) = 1 from public.milestones where couple_id = :'couple_a' and kind = 'days' and key = '100'),
  '100-day milestone is recorded');
select test.assert_true(
  (select count(*) = 1 from public.milestones where couple_id = :'couple_a' and kind = 'days' and key = '365'),
  '365-day milestone is recorded');
select test.assert_true(
  (select count(*) = 0 from public.cosmic_objects co
     join public.milestones m on m.id = co.milestone_id
     where m.couple_id = :'couple_a' and m.kind = 'days'),
  'day milestones do not create moons');

select public.refresh_milestones();
select test.assert_true(
  (select count(*) = 1 from public.milestones where couple_id = :'couple_a' and kind = 'anniversary' and key = '1'),
  'refresh is idempotent for anniversary');
select test.assert_true(
  (select count(*) = 1 from public.cosmic_objects where couple_id = :'couple_a' and object_type = 'MOON'),
  'refresh does not duplicate moons');
select test.assert_true(
  (select count(*) = 1 from public.milestones where couple_id = :'couple_a' and kind = 'days' and key = '100'),
  'refresh is idempotent for 100 days');

reset role;
delete from public.relationship_events
where couple_id = :'couple_a'
  and event_type in ('ANNIVERSARY_REACHED', 'MILESTONE_REACHED');
delete from public.milestones where couple_id = :'couple_a';
update public.couples set relationship_start_date = '2020-02-29' where id = :'couple_a';

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.refresh_milestones();
select test.assert_true(
  (select reached_on = '2021-02-28' from public.milestones
   where couple_id = :'couple_a' and kind = 'anniversary' and key = '1'),
  'Feb 29 start clamps to Feb 28 in a non-leap year');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select test.assert_true(
  (select count(*) = 0 from public.milestones where couple_id = :'couple_a'),
  'other couple cannot read milestones');
select test.assert_true(
  (select count(*) = 0 from public.cosmic_objects where couple_id = :'couple_a' and object_type = 'MOON'),
  'other couple cannot read moons');
select test.reject_sql(format('select private.refresh_milestones(%L::uuid)', :'couple_a'));

reset role;
