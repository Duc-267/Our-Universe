-- Trips and planets. Runs after phase3-quests.sql.

select couple_id as couple_a
from public.couple_members where user_id = '00000000-0000-0000-0000-000000000001' \gset

select id as memory_a
from public.memories
where couple_id = :'couple_a'
order by created_at
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

select test.reject_sql(
  format('select public.create_trip(%L, %L::date, %L::date, null, false)', 'Bad', '2026-05-10', '2026-05-01')
);

select public.create_trip('Hanoi', '2026-03-01', '2026-03-05', 'Street food week', true) as trip_id \gset
select test.assert_true(
  (select significant and destination = 'Hanoi' from public.trips where id = :'trip_id'),
  'significant trip is stored');
select test.assert_true(
  (select count(*) = 1 from public.cosmic_objects where trip_id = :'trip_id' and object_type = 'PLANET'),
  'significant trip creates a planet');
select test.assert_true(
  (select count(*) = 1 from public.relationship_events where event_type = 'TRIP_PLANET' and source_entity_id = :'trip_id'),
  'significant trip writes an event');

select public.link_trip_memory(:'trip_id', :'memory_a');
select test.assert_true(
  (select count(*) = 1 from public.trip_memories where trip_id = :'trip_id' and memory_id = :'memory_a'),
  'memory can link to a trip');
select public.link_trip_memory(:'trip_id', :'memory_a');
select test.assert_true(
  (select count(*) = 1 from public.trip_memories where trip_id = :'trip_id'),
  'linking twice is idempotent');

select public.update_trip(:'trip_id', 'Hanoi', '2026-03-01', '2026-03-05', 'Street food week', false);
select test.assert_true(
  (select significant = false from public.trips where id = :'trip_id'),
  'trip can be unmarked');
select test.assert_true(
  (select count(*) = 0 from public.cosmic_objects where trip_id = :'trip_id'),
  'unmarking removes the planet');
select test.assert_true(
  (select count(*) = 0 from public.relationship_events where event_type = 'TRIP_PLANET' and source_entity_id = :'trip_id'),
  'unmarking removes the trip planet event');

select public.update_trip(:'trip_id', 'Hanoi', '2026-03-01', '2026-03-05', null, true);
select test.assert_true(
  (select count(*) = 1 from public.cosmic_objects where trip_id = :'trip_id' and object_type = 'PLANET'),
  'remarking recreates one planet');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select test.assert_true(
  (select count(*) = 0 from public.trips where couple_id = :'couple_a'),
  'other couple cannot read trips');
select test.assert_true(
  (select count(*) = 0 from public.trip_memories where couple_id = :'couple_a'),
  'other couple cannot read trip memories');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.delete_trip(:'trip_id');
select test.assert_true(
  (select count(*) = 0 from public.trips where id = :'trip_id'),
  'trip can be deleted');
select test.assert_true(
  (select count(*) = 0 from public.cosmic_objects where trip_id = :'trip_id'),
  'deleting a trip removes its planet');

reset role;
