-- Phase 1: universe and memories. Runs after phase0.sql on the same database.
-- Users 1 (Alex) and 2 (Blair) share couple_a; user 3 (Casey) belongs to couple_c.
-- The race-test fixtures (users 5-7, couple_e) are left untouched.

select couple_id as couple_a
from public.couple_members where user_id = '00000000-0000-0000-0000-000000000001' \gset

select test.assert_true(not has_table_privilege('anon', 'public.memories', 'SELECT'), 'anon has no memory read grant');
select test.assert_true(not has_table_privilege('anon', 'public.cosmic_objects', 'SELECT'), 'anon has no cosmic object read grant');
select test.assert_true(not has_table_privilege('anon', 'public.relationship_events', 'SELECT'), 'anon has no event read grant');
select test.assert_true(not has_table_privilege('authenticated', 'public.memories', 'INSERT'), 'memories cannot be inserted directly');
select test.assert_true(not has_table_privilege('authenticated', 'public.cosmic_objects', 'INSERT'), 'cosmic objects cannot be inserted directly');
select test.assert_true(not has_table_privilege('authenticated', 'public.relationship_events', 'INSERT'), 'relationship events cannot be inserted directly');
select test.assert_true(not has_function_privilege('anon', 'public.create_memory(uuid, text, date, text, text, text, smallint, text)', 'EXECUTE'), 'anon cannot create memories');

create or replace function test.reject_create(
  p_couple_id uuid, p_title text, p_memory_date date, p_category text, p_importance smallint
) returns void language plpgsql security invoker as $$
declare rejected boolean := false;
begin
  begin
    perform public.create_memory(p_couple_id, p_title, p_memory_date, null, null, p_category, p_importance);
  exception when others then
    rejected := true;
  end;
  if not rejected then raise exception 'TEST FAILED: create should be rejected'; end if;
end;
$$;

create or replace function test.reject_update(
  p_memory_id uuid, p_title text, p_memory_date date, p_category text, p_importance smallint
) returns void language plpgsql security invoker as $$
declare rejected boolean := false;
begin
  begin
    perform public.update_memory(p_memory_id, p_title, p_memory_date, null, null, p_category, p_importance);
  exception when others then
    rejected := true;
  end;
  if not rejected then raise exception 'TEST FAILED: update should be rejected'; end if;
end;
$$;

create or replace function test.reject_delete(p_memory_id uuid)
returns void language plpgsql security invoker as $$
declare rejected boolean := false;
begin
  begin
    perform public.delete_memory(p_memory_id);
  exception when others then
    rejected := true;
  end;
  if not rejected then raise exception 'TEST FAILED: delete should be rejected'; end if;
end;
$$;

grant execute on function test.reject_create(uuid, text, date, text, smallint),
  test.reject_update(uuid, text, date, text, smallint),
  test.reject_delete(uuid) to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

select public.create_memory(:'couple_a', 'First evening walk', '2024-03-04', 'We walked along the river.', 'Riverside park', 'everyday', 5::smallint) as memory_walk \gset
select test.assert_true(
  (select count(*) = 1 from public.memories where id = :'memory_walk'),
  'memory created');
select test.assert_true(
  (select count(*) = 1 from public.relationship_events
   where event_type = 'MEMORY_CREATED' and source_entity_id = :'memory_walk'),
  'exactly one relationship event per memory');
select test.assert_true(
  (select metadata ->> 'category' = 'everyday' from public.relationship_events
   where source_entity_id = :'memory_walk'),
  'event metadata records the category');
select test.assert_true(
  (select object_type = 'STAR' and brightness = 0.55 from public.cosmic_objects
   where memory_id = :'memory_walk'),
  'normal memory renders a star');
select test.assert_true(
  (select icon = 'coffee' from public.memories where id = :'memory_walk'),
  'everyday memory defaults to the coffee icon');
select test.assert_true(
  (select position_x ^ 2 + position_y ^ 2 + position_z ^ 2 between 46 ^ 2 and 80 ^ 2
   from public.cosmic_objects where memory_id = :'memory_walk'),
  'star sits inside the orbit band');

select position_x as before_x, position_y as before_y, position_z as before_z
from public.cosmic_objects where memory_id = :'memory_walk' \gset

select public.create_memory(:'couple_a', 'She said yes to the trip', '2025-12-24', null, 'Da Lat', 'special', 9::smallint) as memory_bright \gset
select test.assert_true(
  (select object_type = 'BRIGHT_STAR' from public.cosmic_objects where memory_id = :'memory_bright'),
  'important memory renders a bright star');
select test.assert_true(
  (select b.brightness > s.brightness from public.cosmic_objects b, public.cosmic_objects s
   where b.memory_id = :'memory_bright' and s.memory_id = :'memory_walk'),
  'bright star is brighter than a normal star');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select test.assert_true(
  (select count(*) = 2 from public.memories where couple_id = :'couple_a'),
  'partner sees both memories');
select test.assert_true(
  (select count(*) = 2 from public.cosmic_objects where couple_id = :'couple_a'),
  'partner sees both stars');
select test.reject_update(:'memory_walk', 'Changed by partner', '2024-03-04', 'everyday', 5::smallint);
select test.reject_delete(:'memory_walk');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select test.assert_true(
  (select count(*) = 0 from public.memories where couple_id = :'couple_a'),
  'cross-couple memory read denied');
select test.assert_true(
  (select count(*) = 0 from public.cosmic_objects where couple_id = :'couple_a'),
  'cross-couple star read denied');
select test.assert_true(
  (select count(*) = 0 from public.relationship_events where couple_id = :'couple_a'),
  'cross-couple event read denied');
select test.reject_create(:'couple_a', 'Stolen star', '2024-03-04', 'everyday', 5::smallint);
select test.reject_update(:'memory_walk', 'Stolen edit', '2024-03-04', 'everyday', 5::smallint);
select test.reject_delete(:'memory_walk');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.update_memory(:'memory_walk', 'First evening walk', '2024-03-05', 'We walked along the river at dusk.', 'Riverside park', 'special', 9::smallint);
select test.assert_true(
  (select object_type = 'BRIGHT_STAR' from public.cosmic_objects where memory_id = :'memory_walk'),
  'importance update promotes the star');
select test.assert_true(
  (select position_x = :'before_x'::double precision
     and position_y = :'before_y'::double precision
     and position_z = :'before_z'::double precision
   from public.cosmic_objects where memory_id = :'memory_walk'),
  'star position is stable across edits');
select test.assert_true(
  (select memory_date = '2024-03-05' from public.memories where id = :'memory_walk'),
  'memory date updated');
select test.assert_true(
  (select event_date = '2024-03-05' from public.relationship_events
   where event_type = 'MEMORY_CREATED' and source_entity_id = :'memory_walk'),
  'event date follows the memory');

select test.reject_create(:'couple_a', '', '2024-03-04', 'everyday', 5::smallint);
select test.reject_create(:'couple_a', 'Bad category', '2024-03-04', 'nonsense', 5::smallint);
select test.reject_create(:'couple_a', 'Too important', '2024-03-04', 'everyday', 11::smallint);
select test.assert_true(
  (select count(*) = 2 from public.memories where couple_id = :'couple_a'),
  'rejected creates leave no rows behind');

select public.delete_memory(:'memory_bright');
select test.assert_true(
  (select count(*) = 0 from public.memories where id = :'memory_bright'),
  'memory deleted');
select test.assert_true(
  (select count(*) = 0 from public.relationship_events where source_entity_id = :'memory_bright'),
  'event removed with the memory');
select test.assert_true(
  (select count(*) = 0 from public.cosmic_objects where memory_id = :'memory_bright'),
  'star removed with the memory');
select test.assert_true(
  (select count(*) = 1 from public.cosmic_objects where memory_id = :'memory_walk'),
  'other stars remain');

reset role;
