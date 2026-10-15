-- Constellations. Runs after phase3-trips.sql.

select couple_id as couple_a
from public.couple_members where user_id = '00000000-0000-0000-0000-000000000001' \gset

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

select public.create_memory(
  :'couple_a', 'Midnight snack run', '2025-06-01', null, null, 'everyday', 4::smallint
) as memory_extra \gset

select array_agg(id order by created_at) as memory_ids
from (
  select id, created_at from public.memories
  where couple_id = :'couple_a'
  order by created_at
  limit 3
) m \gset

select test.reject_sql(
  format(
    'select public.create_constellation(%L, null, array[%L]::uuid[])',
    'Too few',
    :'memory_extra'
  )
);

select public.create_constellation(
  'Late Night Calls',
  'Whispers after midnight',
  :'memory_ids'::uuid[]
) as constellation_id \gset

select test.assert_true(
  (select name = 'Late Night Calls' from public.constellations where id = :'constellation_id'),
  'constellation is stored');
select test.assert_true(
  (select count(*) = 3 from public.constellation_members where constellation_id = :'constellation_id'),
  'three memories are linked');
select test.assert_true(
  (select count(*) = 1 from public.relationship_events
   where event_type = 'CONSTELLATION_CREATED' and source_entity_id = :'constellation_id'),
  'creation writes an event');

select public.update_constellation(
  :'constellation_id',
  'Night Calls',
  null,
  (
    select array_agg(memory_id order by memory_id)
    from (
      select memory_id from public.constellation_members
      where constellation_id = :'constellation_id'
      order by memory_id
      limit 2
    ) s
  )
);

select test.assert_true(
  (select name = 'Night Calls' and note is null from public.constellations where id = :'constellation_id'),
  'constellation can be renamed');
select test.assert_true(
  (select count(*) = 2 from public.constellation_members where constellation_id = :'constellation_id'),
  'members can be reduced to two');

select test.reject_sql(
  format(
    'select public.update_constellation(%L::uuid, %L, null, array[%L]::uuid[])',
    :'constellation_id',
    'Solo',
    (select memory_id from public.constellation_members where constellation_id = :'constellation_id' limit 1)
  )
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select test.assert_true(
  (select count(*) = 0 from public.constellations where couple_id = :'couple_a'),
  'other couple cannot read constellations');
select test.assert_true(
  (select count(*) = 0 from public.constellation_members where couple_id = :'couple_a'),
  'other couple cannot read constellation members');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.delete_constellation(:'constellation_id');
select test.assert_true(
  (select count(*) = 0 from public.constellations where id = :'constellation_id'),
  'constellation can be deleted');
select test.assert_true(
  (select count(*) = 0 from public.relationship_events
   where event_type = 'CONSTELLATION_CREATED' and source_entity_id = :'constellation_id'),
  'deleting removes the event');

reset role;
