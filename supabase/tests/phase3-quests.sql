-- Couple quests and rewards. Runs after phase3-moons-milestones.sql.

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

select public.start_quest('photograph_sky') as quest_id \gset
select test.assert_true(
  (select status = 'open' and response_type = 'photo' and expires_at > now() from public.quests where id = :'quest_id'),
  'quest opens from the catalog');
select test.reject_sql('select public.start_quest(''favorite_song'')');

insert into storage.objects (id, bucket_id, name, owner_id) values
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/quests/' || :'quest_id' || '/00000000-0000-0000-0000-000000000001/full.webp', '00000000-0000-0000-0000-000000000001'),
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/quests/' || :'quest_id' || '/00000000-0000-0000-0000-000000000001/thumb.webp', '00000000-0000-0000-0000-000000000001');
select public.submit_quest(:'quest_id', null, 'webp', 800, 600);
select test.assert_true(
  (select status = 'open' from public.quests where id = :'quest_id'),
  'one submission leaves the quest open');
select test.reject_sql(format('select public.submit_quest(%L, null, ''webp'', 800, 600)', :'quest_id'));

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
insert into storage.objects (id, bucket_id, name, owner_id) values
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/quests/' || :'quest_id' || '/00000000-0000-0000-0000-000000000002/full.webp', '00000000-0000-0000-0000-000000000002'),
  (gen_random_uuid(), 'universe-media', :'couple_a' || '/quests/' || :'quest_id' || '/00000000-0000-0000-0000-000000000002/thumb.webp', '00000000-0000-0000-0000-000000000002');
select public.submit_quest(:'quest_id', null, 'webp', 720, 540);
select test.assert_true(
  (select status = 'complete' and completed_at is not null from public.quests where id = :'quest_id'),
  'second submission completes the quest');
select test.assert_true(
  (select count(*) = 1 from public.cosmic_objects where quest_id = :'quest_id' and object_type = 'QUEST_REWARD'),
  'complete quest creates one reward');
select test.assert_true(
  (select count(*) = 1 from public.relationship_events where event_type = 'QUEST_COMPLETED' and source_entity_id = :'quest_id'),
  'complete quest writes a relationship event');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.start_quest('favorite_song') as text_quest \gset
select public.submit_quest(:'text_quest', 'A soft jazz track', null, null, null);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select public.submit_quest(:'text_quest', 'The same chorus on repeat', null, null, null);
select test.assert_true(
  (select status = 'complete' from public.quests where id = :'text_quest'),
  'text quest completes without photos');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.start_quest('best_moment') as incomplete_quest \gset
select public.submit_quest(:'incomplete_quest', 'Coffee on the balcony', null, null, null);
reset role;
update public.quests
set expires_at = now() - interval '1 minute', created_at = now() - interval '2 hours'
where id = :'incomplete_quest';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.refresh_quests();
select test.assert_true(
  (select status = 'incomplete' from public.quests where id = :'incomplete_quest'),
  'expired one-sided quest becomes incomplete');
select test.assert_true(
  (select count(*) = 0 from public.cosmic_objects where quest_id = :'incomplete_quest'),
  'incomplete quest creates no reward');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select test.assert_true(
  (select count(*) = 0 from public.quests where couple_id = :'couple_a'),
  'other couple cannot read quests');
select test.assert_true(
  (select count(*) = 0 from public.quest_submissions where couple_id = :'couple_a'),
  'other couple cannot read quest submissions');

reset role;
