create schema test;
create table test.race_tokens (n integer primary key, token text not null);
create function test.assert_true(ok boolean, message text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'TEST FAILED: %', message; end if;
end;
$$;
create function test.reject_invitation(p_token text)
returns void language plpgsql security invoker as $$
declare rejected boolean := false;
begin
  begin
    perform public.accept_invitation(p_token);
  exception when others then
    rejected := true;
  end;
  if not rejected then raise exception 'TEST FAILED: invitation should be rejected'; end if;
end;
$$;
grant usage on schema test to authenticated;
grant execute on function test.assert_true(boolean, text), test.reject_invitation(text) to authenticated;
grant insert on test.race_tokens to authenticated;

select test.assert_true(not has_table_privilege('anon', 'public.couples', 'SELECT'), 'anon has no couple read grant');
select test.assert_true(not has_table_privilege('authenticated', 'public.couple_members', 'INSERT'), 'members cannot be inserted directly');
select test.assert_true(not has_function_privilege('anon', 'public.accept_invitation(text)', 'EXECUTE'), 'anon cannot redeem');

-- The fixture user rows predate the profile trigger, so add their profiles explicitly.
insert into public.profiles (id, display_name)
select id, raw_user_meta_data ->> 'display_name' from auth.users;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select public.create_couple('Alex and Blair', '2024-01-02', null, 'Asia/Bangkok') as couple_a \gset
select test.assert_true((select count(*) = 1 from public.universes where couple_id = :'couple_a'), 'universe created');
select test.assert_true((select count(*) = 1 from public.couple_members where couple_id = :'couple_a'), 'creator membership created');
select public.create_invitation(:'couple_a') as invitation_a \gset
select :'invitation_a'::jsonb ->> 'token' as token_a \gset
select test.assert_true((select count(*) = 1 from public.couple_invitations where couple_id = :'couple_a' and encode(token_hash, 'hex') <> :'token_a'), 'only token hash stored');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select public.create_couple('Casey and Drew', '2023-04-05', null, 'UTC') as couple_c \gset
select test.assert_true((select count(*) = 0 from public.couples where id = :'couple_a'), 'cross-couple read denied');
select test.assert_true((select count(*) = 0 from public.couple_invitations where couple_id = :'couple_a'), 'cross-couple invitation read denied');
select test.reject_invitation(:'token_a');
select public.create_invitation(:'couple_c') as expired_invitation \gset
select :'expired_invitation'::jsonb ->> 'token' as expired_token \gset
reset role;
update public.couple_invitations set expires_at = now() - interval '1 second'
where token_hash = extensions.digest(:'expired_token', 'sha256');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
select test.reject_invitation(:'expired_token');
select test.assert_true((select count(*) = 0 from public.couple_members where user_id = auth.uid()), 'expired invitation adds no member');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select public.create_invitation(:'couple_c') as revoked_invitation \gset
select :'revoked_invitation'::jsonb ->> 'token' as revoked_token \gset
select :'revoked_invitation'::jsonb ->> 'id' as revoked_id \gset
select public.revoke_invitation(:'revoked_id');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
select test.reject_invitation(:'revoked_token');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select public.accept_invitation(:'token_a');
select test.assert_true((select count(*) = 2 from public.couple_members where couple_id = :'couple_a'), 'partner joined');
select test.assert_true((select count(*) = 1 from public.profiles where id = '00000000-0000-0000-0000-000000000001'), 'partner profile visible');
select test.reject_invitation(:'token_a');
select public.update_couple_settings(:'couple_a', 'Our Place', '2024-01-02', 'Asia/Bangkok', '2026-12-20', 'Blair');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select test.assert_true((select name = 'Our Place' from public.couples where id = :'couple_a'), 'partner update visible');
select test.assert_true((select next_meeting_date = '2026-12-20' from public.couple_settings where couple_id = :'couple_a'), 'meeting date visible');

-- Two independent invitation rows target the same empty partner slot.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
select public.create_couple('Evan and partner', '2024-06-07', null, 'UTC') as couple_e \gset
insert into test.race_tokens
select 1, public.create_invitation(:'couple_e') ->> 'token';
insert into test.race_tokens
select 2, public.create_invitation(:'couple_e') ->> 'token';
reset role;
