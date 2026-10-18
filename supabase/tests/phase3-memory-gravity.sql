-- Memory gravity. Runs after phase3-constellations.sql.

select couple_id as couple_a
from public.couple_members where user_id = '00000000-0000-0000-0000-000000000001' \gset

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

select public.create_memory(
  :'couple_a', 'Quiet morning', '2025-07-01', 'Tea on the balcony', null, 'everyday', 4::smallint
) as memory_low \gset
select public.create_memory(
  :'couple_a', 'The proposal', '2025-07-02', null, null, 'special', 9::smallint
) as memory_high \gset

create temporary table gravity_before as
select position_x, position_y, position_z, brightness
from public.cosmic_objects where memory_id = :'memory_low';

select public.refresh_memory_gravity();

select test.assert_true(
  (select gravity = 24 from public.cosmic_objects where memory_id = :'memory_low'),
  'importance 4 with no photos or links scores 24');
select test.assert_true(
  (select gravity = 54 from public.cosmic_objects where memory_id = :'memory_high'),
  'importance 9 scores higher than importance 4');
select test.assert_true(
  (select title = 'Quiet morning' and importance = 4 and description = 'Tea on the balcony'
   from public.memories where id = :'memory_low'),
  'gravity refresh leaves the memory content unchanged');
select test.assert_true(
  (select o.position_x = b.position_x and o.position_y = b.position_y and o.position_z = b.position_z
   from public.cosmic_objects o, gravity_before b
   where o.memory_id = :'memory_low'),
  'gravity refresh does not move the star');
select test.assert_true(
  (select o.brightness = b.brightness
   from public.cosmic_objects o, gravity_before b
   where o.memory_id = :'memory_low'),
  'gravity refresh keeps the stored base brightness');

reset role;
insert into public.memory_photos (
  id, couple_id, memory_id, uploader_user_id, full_path, thumb_path, width, height
)
values (
  gen_random_uuid(), :'couple_a', :'memory_low', '00000000-0000-0000-0000-000000000001',
  :'couple_a' || '/gravity/full.webp', :'couple_a' || '/gravity/thumb.webp', 800, 600
);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.refresh_memory_gravity();
select test.assert_true(
  (select gravity = 30 from public.cosmic_objects where memory_id = :'memory_low'),
  'one photo raises gravity by 6');

select public.create_constellation(
  'Quiet and loud',
  null,
  array[:'memory_low', :'memory_high']::uuid[]
);
select public.refresh_memory_gravity();
select test.assert_true(
  (select gravity = 36 from public.cosmic_objects where memory_id = :'memory_low'),
  'a constellation link raises gravity by another 6');
select test.assert_true(
  (select title = 'Quiet morning' and importance = 4 from public.memories where id = :'memory_low'),
  'linking does not rewrite the memory through gravity refresh');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select public.refresh_memory_gravity();
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select test.assert_true(
  (select gravity = 36 from public.cosmic_objects where memory_id = :'memory_low'),
  'another couple refresh does not change these scores');

reset role;
