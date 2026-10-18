-- Future dreams. Runs after phase3-cosmic-events.sql.

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

select test.reject_sql($$select public.create_dream('', null, null, 'everyday')$$);
select test.reject_sql($$select public.create_dream('A hope', null, null, 'nope')$$);

select public.create_dream('See the aurora', 'North of the city', '2020-01-15'::date, 'special') as dream_id \gset
select test.assert_true(
  (select status = 'dream' and title = 'See the aurora' from public.future_dreams where id = :'dream_id'),
  'dream is stored');
select test.assert_true(
  (select count(*) = 1 from public.cosmic_objects where dream_id = :'dream_id' and object_type = 'DISTANT_OBJECT'),
  'open dream creates one distant object');
select test.assert_true(
  (select sqrt(position_x * position_x + position_y * position_y + position_z * position_z) > 110
   from public.cosmic_objects where dream_id = :'dream_id'),
  'distant object sits beyond the star band');

select public.update_dream(:'dream_id', 'See the aurora', 'North of the city', '2020-01-15', 'special', 'planned');
select test.assert_true(
  (select status = 'planned' from public.future_dreams where id = :'dream_id'),
  'dream can be planned');
select test.assert_true(
  (select count(*) = 1 from public.cosmic_objects where dream_id = :'dream_id' and object_type = 'DISTANT_OBJECT'),
  'planning keeps one distant object');

select public.update_dream(:'dream_id', 'See the aurora', 'North of the city', '2020-01-15', 'special', 'completed');
select memory_id as dream_memory from public.future_dreams where id = :'dream_id' \gset
select test.assert_true(
  (select status = 'completed' and memory_id = :'dream_memory' from public.future_dreams where id = :'dream_id'),
  'completed dream points at a memory');
select test.assert_true(
  (select title = 'See the aurora' and category = 'special' and memory_date = '2020-01-15'::date
   from public.memories where id = :'dream_memory'),
  'completed dream becomes a memory');
select test.assert_true(
  (select object_type = 'STAR' from public.cosmic_objects where memory_id = :'dream_memory'),
  'completed dream becomes a star');
select test.assert_true(
  (select count(*) = 0 from public.cosmic_objects where dream_id = :'dream_id'),
  'completion removes the distant object');
select test.assert_true(
  (select count(*) = 0 from public.relationship_events
   where event_type = 'DREAM_RECORDED' and source_entity_id = :'dream_id'),
  'completion removes the dream event');
select test.reject_sql(
  format('select public.update_dream(%L, %L, null, null, %L, %L)', :'dream_id', 'Changed', 'special', 'dream')
);

select public.create_dream('Learn to dance', null, null, 'date') as spare_dream \gset
select public.delete_dream(:'spare_dream');
select test.assert_true(
  (select count(*) = 0 from public.future_dreams where id = :'spare_dream'),
  'open dream can be deleted');
select test.assert_true(
  (select count(*) = 0 from public.cosmic_objects where dream_id = :'spare_dream'),
  'deleting an open dream removes its object');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select test.assert_true(
  (select count(*) = 0 from public.future_dreams where couple_id = :'couple_a'),
  'other couple cannot read dreams');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select test.assert_true(
  (select count(*) = 1 from public.future_dreams where id = :'dream_id'),
  'owner still sees the completed dream');

reset role;
