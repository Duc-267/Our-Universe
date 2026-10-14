-- Phase 2 check-in photos and Same Moment. Check-in photos use
-- <couple>/checkins/<checkin>/{full|thumb}.{webp|jpg}.
-- Same Moment photos use
-- <couple>/moments/<moment>/<author>/{full|thumb}.{webp|jpg}.

alter table public.relationship_events
  drop constraint relationship_events_event_type_check;
alter table public.relationship_events
  add constraint relationship_events_event_type_check
  check (event_type in (
    'MEMORY_CREATED', 'CHECKIN_CREATED', 'CAPSULE_CREATED', 'CAPSULE_OPENED', 'SAME_MOMENT'
  ));

alter table public.cosmic_objects
  drop constraint cosmic_objects_object_type_check;
alter table public.cosmic_objects
  add constraint cosmic_objects_object_type_check
  check (object_type in ('STAR', 'BRIGHT_STAR', 'COMET', 'TWIN_STAR'));

alter table public.daily_checkins
  add column image_full_path text unique,
  add column image_thumb_path text unique,
  add column image_width integer,
  add column image_height integer,
  add constraint daily_checkins_image_pair check (
    (image_full_path is null) = (image_thumb_path is null)
    and (image_full_path is null) = (image_width is null)
    and (image_full_path is null) = (image_height is null)
    and (image_width is null or image_width between 1 and 1600)
    and (image_height is null or image_height between 1 and 1600)
  );

create table public.same_moments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  blind boolean not null default true,
  status text not null default 'open' check (status in ('open', 'complete', 'incomplete')),
  window_ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint same_moments_window_after_start check (window_ends_at > created_at),
  constraint same_moments_complete_pair check ((status = 'complete') = (completed_at is not null))
);

create unique index same_moments_one_open
  on public.same_moments (couple_id) where status = 'open';
create index same_moments_couple_created_idx
  on public.same_moments (couple_id, created_at desc);

create table public.same_moment_submissions (
  id uuid primary key default gen_random_uuid(),
  same_moment_id uuid not null references public.same_moments(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_user_id uuid not null references auth.users(id),
  caption text check (caption is null or char_length(caption) <= 280),
  image_full_path text not null unique,
  image_thumb_path text not null unique,
  image_width integer not null check (image_width between 1 and 1600),
  image_height integer not null check (image_height between 1 and 1600),
  created_at timestamptz not null default now(),
  unique (same_moment_id, author_user_id)
);

create index same_moment_submissions_moment_idx
  on public.same_moment_submissions (same_moment_id, created_at);

alter table public.cosmic_objects
  add column same_moment_id uuid references public.same_moments(id) on delete cascade,
  add column twin_slot smallint check (twin_slot in (1, 2));
create unique index cosmic_objects_one_twin_slot
  on public.cosmic_objects (same_moment_id, twin_slot) where same_moment_id is not null;

create function private.can_read_same_submission(p_moment_id uuid, p_author uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.same_moments m
    where m.id = p_moment_id
      and private.is_couple_member(m.couple_id)
      and (
        p_author = (select auth.uid())
        or not m.blind
        or exists (
          select 1 from public.same_moment_submissions mine
          where mine.same_moment_id = m.id and mine.author_user_id = (select auth.uid())
        )
      )
  );
$$;

create or replace function private.can_read_media(p_name text)
returns boolean
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_parts text[] := pg_catalog.string_to_array(coalesce(p_name, ''), '/');
  v_length integer := coalesce(pg_catalog.array_length(v_parts, 1), 0);
begin
  if v_length < 4 or coalesce(v_parts[1], '') !~ v_uuid or coalesce(v_parts[3], '') !~ v_uuid then
    return false;
  end if;
  if not private.is_couple_member(v_parts[1]::uuid) then
    return false;
  end if;
  if v_length = 5 and v_parts[2] = 'memories' then
    return exists (
      select 1 from public.memories m
      where m.id = v_parts[3]::uuid and m.couple_id = v_parts[1]::uuid
    );
  end if;
  if v_length = 4 and v_parts[2] = 'capsules' then
    return exists (
      select 1 from public.capsules c
      where c.id = v_parts[3]::uuid and c.couple_id = v_parts[1]::uuid
        and (c.creator_user_id = (select auth.uid()) or c.opened_at is not null)
    );
  end if;
  if v_length = 4 and v_parts[2] = 'checkins' then
    return exists (
      select 1 from public.daily_checkins c
      where c.id = v_parts[3]::uuid and c.couple_id = v_parts[1]::uuid
    );
  end if;
  if v_length = 5 and v_parts[2] = 'moments' and coalesce(v_parts[4], '') ~ v_uuid then
    return private.can_read_same_submission(v_parts[3]::uuid, v_parts[4]::uuid);
  end if;
  return false;
end;
$$;

create or replace function private.can_write_media(p_name text)
returns boolean
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_files constant text[] := array['full.webp', 'full.jpg', 'thumb.webp', 'thumb.jpg'];
  v_parts text[] := pg_catalog.string_to_array(coalesce(p_name, ''), '/');
  v_length integer := coalesce(pg_catalog.array_length(v_parts, 1), 0);
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or v_length < 4
    or coalesce(v_parts[1], '') !~ v_uuid or coalesce(v_parts[3], '') !~ v_uuid
    or not (v_parts[v_length] = any (v_files)) then
    return false;
  end if;
  if not private.is_couple_member(v_parts[1]::uuid) then
    return false;
  end if;
  if v_length = 5 and v_parts[2] = 'memories' and coalesce(v_parts[4], '') ~ v_uuid then
    return exists (
      select 1 from public.memories m
      where m.id = v_parts[3]::uuid and m.couple_id = v_parts[1]::uuid
        and m.author_user_id = v_user_id
    ) and not exists (
      select 1 from public.memory_photos p where p.id = v_parts[4]::uuid
    );
  end if;
  if v_length = 4 and v_parts[2] = 'capsules' then
    return exists (
      select 1 from public.capsules c
      join public.capsule_contents cc on cc.capsule_id = c.id
      where c.id = v_parts[3]::uuid and c.couple_id = v_parts[1]::uuid
        and c.creator_user_id = v_user_id and c.opened_at is null
        and cc.image_full_path is null
    );
  end if;
  if v_length = 4 and v_parts[2] = 'checkins' then
    return exists (
      select 1 from public.daily_checkins c
      join public.couple_settings s on s.couple_id = c.couple_id
      where c.id = v_parts[3]::uuid and c.couple_id = v_parts[1]::uuid
        and c.author_user_id = v_user_id
        and c.local_date = (now() at time zone s.timezone)::date
    );
  end if;
  if v_length = 5 and v_parts[2] = 'moments' and v_parts[4] = v_user_id::text then
    return exists (
      select 1 from public.same_moments m
      where m.id = v_parts[3]::uuid and m.couple_id = v_parts[1]::uuid
        and m.status = 'open' and m.window_ends_at > now()
    ) and not exists (
      select 1 from public.same_moment_submissions s
      where s.same_moment_id = v_parts[3]::uuid and s.author_user_id = v_user_id
    );
  end if;
  return false;
end;
$$;

create function private.attach_checkin_photo(
  p_checkin_id uuid,
  p_extension text,
  p_width integer,
  p_height integer
)
returns text[]
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.daily_checkins%rowtype;
  v_timezone text;
  v_base text;
  v_old text[];
begin
  select * into v_row from public.daily_checkins
  where id = p_checkin_id and author_user_id = v_user_id
  for update;
  if not found or not private.is_couple_member(v_row.couple_id) then
    raise exception 'not_checkin_author';
  end if;
  select timezone into v_timezone from public.couple_settings where couple_id = v_row.couple_id;
  if v_row.local_date <> (now() at time zone v_timezone)::date
    or coalesce(p_extension, '') not in ('webp', 'jpg')
    or coalesce(p_width, 0) not between 1 and 1600
    or coalesce(p_height, 0) not between 1 and 1600 then
    raise exception 'invalid_photo';
  end if;
  v_base := v_row.couple_id::text || '/checkins/' || p_checkin_id::text || '/';
  if not private.uploaded_pair_exists(v_base, p_extension, v_user_id) then
    raise exception 'photo_files_missing';
  end if;
  v_old := array_remove(array[v_row.image_full_path, v_row.image_thumb_path], null);
  update public.daily_checkins
  set image_full_path = v_base || 'full.' || p_extension,
      image_thumb_path = v_base || 'thumb.' || p_extension,
      image_width = p_width,
      image_height = p_height
  where id = p_checkin_id;
  return coalesce(v_old, array[]::text[]);
end;
$$;

create function private.expire_open_moments(p_couple_id uuid)
returns void
language sql security definer
set search_path = ''
as $$
  update public.same_moments
  set status = 'incomplete'
  where couple_id = p_couple_id and status = 'open' and window_ends_at <= now();
$$;

create function private.twin_star_values(p_moment_id uuid, p_slot smallint)
returns jsonb
language plpgsql immutable
set search_path = ''
as $$
declare
  v_hash bytea := extensions.digest(p_moment_id::text, 'sha256');
  v_theta double precision;
  v_phi double precision;
  v_radius double precision := 54.0 + (get_byte(v_hash, 8)::int % 8);
  v_offset double precision := case when p_slot = 1 then -0.16 else 0.16 end;
begin
  v_theta := 2.0 * pi() * (get_byte(v_hash, 0)::double precision / 255.0) + v_offset;
  v_phi := 0.45 * pi() + 0.2 * pi() * (get_byte(v_hash, 4)::double precision / 255.0);
  return jsonb_build_object(
    'position_x', v_radius * sin(v_phi) * cos(v_theta),
    'position_y', v_radius * cos(v_phi) + v_offset * 8.0,
    'position_z', v_radius * sin(v_phi) * sin(v_theta),
    'scale', 1.05,
    'rotation', v_offset,
    'visual_seed', get_byte(v_hash, p_slot)::int
  );
end;
$$;

create function private.finish_same_moment(p_moment_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_moment public.same_moments%rowtype;
  v_event_id uuid;
  v_slot smallint;
  v_star jsonb;
  v_timezone text;
begin
  select * into v_moment from public.same_moments where id = p_moment_id for update;
  if v_moment.status = 'complete' then
    return;
  end if;
  if (select count(*) from public.same_moment_submissions where same_moment_id = p_moment_id) < 2 then
    return;
  end if;
  update public.same_moments
  set status = 'complete', completed_at = now()
  where id = p_moment_id;

  select timezone into v_timezone from public.couple_settings where couple_id = v_moment.couple_id;
  insert into public.relationship_events (
    couple_id, event_type, source_entity_id, actor_user_id, event_date, metadata
  )
  values (
    v_moment.couple_id, 'SAME_MOMENT', p_moment_id, v_moment.created_by,
    (now() at time zone v_timezone)::date, jsonb_build_object('blind', v_moment.blind)
  )
  on conflict (event_type, source_entity_id) do update
    set metadata = excluded.metadata
  returning id into v_event_id;

  if exists (select 1 from public.cosmic_objects where same_moment_id = p_moment_id) then
    return;
  end if;
  for v_slot in 1..2 loop
    v_star := private.twin_star_values(p_moment_id, v_slot::smallint);
    insert into public.cosmic_objects (
      couple_id, relationship_event_id, same_moment_id, twin_slot, object_type,
      position_x, position_y, position_z, scale, brightness, rotation, visual_seed, metadata
    )
    values (
      v_moment.couple_id, v_event_id, p_moment_id, v_slot, 'TWIN_STAR',
      (v_star ->> 'position_x')::double precision,
      (v_star ->> 'position_y')::double precision,
      (v_star ->> 'position_z')::double precision,
      (v_star ->> 'scale')::double precision,
      0.75,
      (v_star ->> 'rotation')::double precision,
      (v_star ->> 'visual_seed')::integer,
      jsonb_build_object('slot', v_slot)
    );
  end loop;
end;
$$;

create function private.start_same_moment(p_blind boolean)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_couple_member';
  end if;
  select couple_id into v_couple_id from public.couple_members where user_id = v_user_id;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_couple_member';
  end if;
  perform private.expire_open_moments(v_couple_id);
  if exists (
    select 1 from public.same_moments where couple_id = v_couple_id and status = 'open'
  ) then
    raise exception 'same_moment_open';
  end if;
  insert into public.same_moments (couple_id, created_by, blind, window_ends_at)
  values (v_couple_id, v_user_id, coalesce(p_blind, true), now() + interval '2 hours')
  returning id into v_id;
  return v_id;
end;
$$;

create function private.submit_same_moment(
  p_moment_id uuid,
  p_extension text,
  p_width integer,
  p_height integer,
  p_caption text
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_moment public.same_moments%rowtype;
  v_caption text := nullif(pg_catalog.btrim(coalesce(p_caption, '')), '');
  v_base text;
  v_id uuid;
begin
  select * into v_moment from public.same_moments where id = p_moment_id for update;
  if not found or v_user_id is null or not private.is_couple_member(v_moment.couple_id) then
    raise exception 'not_couple_member';
  end if;
  if v_moment.status <> 'open' or v_moment.window_ends_at <= now() then
    perform private.expire_open_moments(v_moment.couple_id);
    raise exception 'same_moment_closed';
  end if;
  if char_length(coalesce(v_caption, '')) > 280
    or coalesce(p_extension, '') not in ('webp', 'jpg')
    or coalesce(p_width, 0) not between 1 and 1600
    or coalesce(p_height, 0) not between 1 and 1600 then
    raise exception 'invalid_photo';
  end if;
  if exists (
    select 1 from public.same_moment_submissions
    where same_moment_id = p_moment_id and author_user_id = v_user_id
  ) then
    raise exception 'already_submitted';
  end if;
  v_base := v_moment.couple_id::text || '/moments/' || p_moment_id::text || '/' || v_user_id::text || '/';
  if not private.uploaded_pair_exists(v_base, p_extension, v_user_id) then
    raise exception 'photo_files_missing';
  end if;
  insert into public.same_moment_submissions (
    same_moment_id, couple_id, author_user_id, caption,
    image_full_path, image_thumb_path, image_width, image_height
  )
  values (
    p_moment_id, v_moment.couple_id, v_user_id, v_caption,
    v_base || 'full.' || p_extension, v_base || 'thumb.' || p_extension,
    p_width, p_height
  )
  returning id into v_id;
  perform private.finish_same_moment(p_moment_id);
  return v_id;
end;
$$;

create function private.refresh_same_moments()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_couple_member';
  end if;
  select couple_id into v_couple_id from public.couple_members where user_id = v_user_id;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_couple_member';
  end if;
  perform private.expire_open_moments(v_couple_id);
end;
$$;

alter table public.same_moments enable row level security;
alter table public.same_moment_submissions enable row level security;
revoke all on public.same_moments, public.same_moment_submissions from anon, authenticated;
grant select on public.same_moments, public.same_moment_submissions to authenticated;

create policy "members can read same moments" on public.same_moments
  for select to authenticated using (private.is_couple_member(couple_id));
create policy "visible same moment submissions" on public.same_moment_submissions
  for select to authenticated
  using (private.can_read_same_submission(same_moment_id, author_user_id));

-- Check-in photo replacement reuses the same object path.
create policy "authors replace universe media" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'universe-media'
    and coalesce(owner_id, owner::text) = (select auth.uid())::text
    and private.can_write_media(name)
  )
  with check (
    bucket_id = 'universe-media'
    and private.can_write_media(name)
  );

create function public.attach_checkin_photo(
  p_checkin_id uuid, p_extension text, p_width integer, p_height integer
)
returns text[] language sql security invoker set search_path = ''
as $$ select private.attach_checkin_photo(p_checkin_id, p_extension, p_width, p_height); $$;

create function public.start_same_moment(p_blind boolean)
returns uuid language sql security invoker set search_path = ''
as $$ select private.start_same_moment(p_blind); $$;

create function public.submit_same_moment(
  p_moment_id uuid, p_extension text, p_width integer, p_height integer, p_caption text
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.submit_same_moment(p_moment_id, p_extension, p_width, p_height, p_caption); $$;

create function public.refresh_same_moments()
returns void language sql security invoker set search_path = ''
as $$ select private.refresh_same_moments(); $$;

revoke execute on function
  private.can_read_same_submission(uuid, uuid),
  private.attach_checkin_photo(uuid, text, integer, integer),
  private.expire_open_moments(uuid),
  private.twin_star_values(uuid, smallint),
  private.finish_same_moment(uuid),
  private.start_same_moment(boolean),
  private.submit_same_moment(uuid, text, integer, integer, text),
  private.refresh_same_moments()
  from public, anon, authenticated;
grant execute on function
  private.can_read_same_submission(uuid, uuid),
  private.attach_checkin_photo(uuid, text, integer, integer),
  private.start_same_moment(boolean),
  private.submit_same_moment(uuid, text, integer, integer, text),
  private.refresh_same_moments()
  to authenticated;

revoke execute on function
  public.attach_checkin_photo(uuid, text, integer, integer),
  public.start_same_moment(boolean),
  public.submit_same_moment(uuid, text, integer, integer, text),
  public.refresh_same_moments()
  from public, anon;
grant execute on function
  public.attach_checkin_photo(uuid, text, integer, integer),
  public.start_same_moment(boolean),
  public.submit_same_moment(uuid, text, integer, integer, text),
  public.refresh_same_moments()
  to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.same_moments;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.same_moment_submissions;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
