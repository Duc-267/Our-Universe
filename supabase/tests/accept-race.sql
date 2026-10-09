set role authenticated;
select set_config('request.jwt.claim.sub', :'user_id', false);
select public.accept_invitation(:'token');
