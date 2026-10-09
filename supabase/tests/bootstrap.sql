create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', '{"display_name":"Alex"}'),
  ('00000000-0000-0000-0000-000000000002', '{"display_name":"Blair"}'),
  ('00000000-0000-0000-0000-000000000003', '{"display_name":"Casey"}'),
  ('00000000-0000-0000-0000-000000000004', '{"display_name":"Drew"}'),
  ('00000000-0000-0000-0000-000000000005', '{"display_name":"Evan"}'),
  ('00000000-0000-0000-0000-000000000006', '{"display_name":"Frankie"}'),
  ('00000000-0000-0000-0000-000000000007', '{"display_name":"Gray"}');

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
