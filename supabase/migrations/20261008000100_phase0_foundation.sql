-- Phase 0: private couple foundation. Apply through Supabase migrations.
create schema if not exists private;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now()
);

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  relationship_start_date date not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  member_role text not null check (member_role in ('creator', 'partner')),
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create unique index one_creator_per_couple
  on public.couple_members (couple_id) where member_role = 'creator';

create table public.couple_settings (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  timezone text not null default 'UTC',
  next_meeting_date date,
  updated_at timestamptz not null default now(),
  check (char_length(timezone) between 1 and 100)
);

create table public.universes (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.couple_invitations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  token_hash bytea not null unique,
  created_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (redeemed_at is null or redeemed_by is not null),
  check (redeemed_at is null or revoked_at is null)
);

create index couple_invitations_couple_id_idx on public.couple_invitations (couple_id);
create index couple_members_user_id_idx on public.couple_members (user_id);

create function private.is_valid_timezone(p_timezone text)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from pg_catalog.pg_timezone_names
    where name = p_timezone
  );
$$;

alter table public.couple_settings
  add constraint couple_settings_timezone_valid
  check (private.is_valid_timezone(timezone));

create function private.is_couple_member(p_couple_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.couple_members
    where couple_id = p_couple_id and user_id = (select auth.uid())
  );
$$;

create function private.shares_couple(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.couple_members mine
    join public.couple_members theirs on theirs.couple_id = mine.couple_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

create function private.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_settings enable row level security;
alter table public.universes enable row level security;
alter table public.couple_invitations enable row level security;

revoke all on public.profiles, public.couples, public.couple_members,
  public.couple_settings, public.universes, public.couple_invitations
  from anon, authenticated;

grant select on public.profiles, public.couples, public.couple_members,
  public.couple_settings, public.universes, public.couple_invitations
  to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant update (name, relationship_start_date) on public.couples to authenticated;
grant update (timezone, next_meeting_date) on public.couple_settings to authenticated;

create policy "self and partner can read profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_couple(id));
create policy "user can update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "members can read couple" on public.couples
  for select to authenticated using (private.is_couple_member(id));
create policy "members can update couple" on public.couples
  for update to authenticated
  using (private.is_couple_member(id)) with check (private.is_couple_member(id));
create policy "members can read membership" on public.couple_members
  for select to authenticated using (private.is_couple_member(couple_id));
create policy "members can read settings" on public.couple_settings
  for select to authenticated using (private.is_couple_member(couple_id));
create policy "members can update settings" on public.couple_settings
  for update to authenticated
  using (private.is_couple_member(couple_id)) with check (private.is_couple_member(couple_id));
create policy "members can read universe" on public.universes
  for select to authenticated using (private.is_couple_member(couple_id));
create policy "creator can read own invitations" on public.couple_invitations
  for select to authenticated
  using (created_by = (select auth.uid()) and private.is_couple_member(couple_id));

create function private.create_couple(
  p_name text, p_relationship_start_date date, p_nickname text, p_timezone text
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if char_length(pg_catalog.btrim(coalesce(p_name, ''))) not between 1 and 80
    or p_relationship_start_date is null
    or not private.is_valid_timezone(p_timezone)
    or char_length(coalesce(p_nickname, '')) > 80 then
    raise exception 'invalid_couple_data';
  end if;
  if exists (select 1 from public.couple_members where user_id = v_user_id) then
    raise exception 'already_in_couple';
  end if;

  insert into public.couples (name, relationship_start_date, created_by)
  values (pg_catalog.btrim(p_name), p_relationship_start_date, v_user_id)
  returning id into v_couple_id;
  insert into public.couple_members (couple_id, user_id, member_role)
  values (v_couple_id, v_user_id, 'creator');
  insert into public.couple_settings (couple_id, timezone)
  values (v_couple_id, p_timezone);
  insert into public.universes (couple_id) values (v_couple_id);
  if p_nickname is not null and pg_catalog.btrim(p_nickname) <> '' then
    update public.profiles set display_name = pg_catalog.btrim(p_nickname)
    where id = v_user_id;
  end if;
  return v_couple_id;
exception
  when unique_violation then
    raise exception 'already_in_couple';
end;
$$;

create function private.create_invitation(p_couple_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_token text := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if v_user_id is null or not exists (
    select 1 from public.couples
    where id = p_couple_id and created_by = v_user_id
  ) then
    raise exception 'not_couple_creator';
  end if;
  if (select count(*) from public.couple_members where couple_id = p_couple_id) >= 2 then
    raise exception 'couple_full';
  end if;
  insert into public.couple_invitations
    (couple_id, token_hash, created_by, expires_at)
  values
    (p_couple_id, extensions.digest(v_token, 'sha256'), v_user_id, v_expires_at)
  returning id into v_id;
  return pg_catalog.jsonb_build_object(
    'id', v_id, 'token', v_token, 'expires_at', v_expires_at
  );
end;
$$;

create function private.accept_invitation(p_token text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation public.couple_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_invitation';
  end if;
  select * into v_invitation from public.couple_invitations
  where token_hash = extensions.digest(p_token, 'sha256') for update;
  if not found or v_invitation.expires_at <= now()
    or v_invitation.redeemed_at is not null or v_invitation.revoked_at is not null then
    raise exception 'invalid_invitation';
  end if;
  perform 1 from public.couples where id = v_invitation.couple_id for update;
  if exists (select 1 from public.couple_members where user_id = v_user_id) then
    raise exception 'already_in_couple';
  end if;
  if (select count(*) from public.couple_members where couple_id = v_invitation.couple_id) >= 2 then
    raise exception 'couple_full';
  end if;
  insert into public.couple_members (couple_id, user_id, member_role)
  values (v_invitation.couple_id, v_user_id, 'partner');
  update public.couple_invitations
  set redeemed_at = now(), redeemed_by = v_user_id
  where id = v_invitation.id;
  return v_invitation.couple_id;
exception
  when unique_violation then
    raise exception 'already_in_couple';
end;
$$;

create function private.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  update public.couple_invitations i
  set revoked_at = now()
  where i.id = p_invitation_id and i.created_by = v_user_id
    and i.redeemed_at is null and i.revoked_at is null;
  if not found then
    raise exception 'invitation_not_found';
  end if;
end;
$$;

create function private.update_couple_settings(
  p_couple_id uuid, p_name text, p_relationship_start_date date,
  p_timezone text, p_next_meeting_date date, p_display_name text
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not private.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;
  if char_length(pg_catalog.btrim(coalesce(p_name, ''))) not between 1 and 80
    or p_relationship_start_date is null
    or not private.is_valid_timezone(p_timezone)
    or char_length(coalesce(p_display_name, '')) > 80 then
    raise exception 'invalid_couple_data';
  end if;
  update public.couples
  set name = pg_catalog.btrim(p_name), relationship_start_date = p_relationship_start_date
  where id = p_couple_id;
  if not found then raise exception 'couple_not_found'; end if;
  update public.couple_settings
  set timezone = p_timezone, next_meeting_date = p_next_meeting_date, updated_at = now()
  where couple_id = p_couple_id;
  if not found then raise exception 'settings_not_found'; end if;
  update public.profiles
  set display_name = pg_catalog.btrim(coalesce(p_display_name, ''))
  where id = v_user_id;
  if not found then raise exception 'profile_not_found'; end if;
end;
$$;

-- Data API wrappers are invoker functions; privileged logic stays in private.
create function public.create_couple(
  p_name text, p_relationship_start_date date, p_nickname text, p_timezone text
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_couple(p_name, p_relationship_start_date, p_nickname, p_timezone); $$;

create function public.create_invitation(p_couple_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.create_invitation(p_couple_id); $$;

create function public.accept_invitation(p_token text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.accept_invitation(p_token); $$;

create function public.revoke_invitation(p_invitation_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.revoke_invitation(p_invitation_id); $$;

create function public.update_couple_settings(
  p_couple_id uuid, p_name text, p_relationship_start_date date,
  p_timezone text, p_next_meeting_date date, p_display_name text
)
returns void language sql security invoker set search_path = ''
as $$ select private.update_couple_settings(
  p_couple_id, p_name, p_relationship_start_date,
  p_timezone, p_next_meeting_date, p_display_name
); $$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_valid_timezone(text), private.is_couple_member(uuid),
  private.shares_couple(uuid), private.create_couple(text, date, text, text),
  private.create_invitation(uuid), private.accept_invitation(text),
  private.revoke_invitation(uuid),
  private.update_couple_settings(uuid, text, date, text, date, text) to authenticated;

revoke execute on function public.create_couple(text, date, text, text),
  public.create_invitation(uuid), public.accept_invitation(text),
  public.revoke_invitation(uuid),
  public.update_couple_settings(uuid, text, date, text, date, text) from public, anon;
grant execute on function public.create_couple(text, date, text, text),
  public.create_invitation(uuid), public.accept_invitation(text),
  public.revoke_invitation(uuid),
  public.update_couple_settings(uuid, text, date, text, date, text) to authenticated;
