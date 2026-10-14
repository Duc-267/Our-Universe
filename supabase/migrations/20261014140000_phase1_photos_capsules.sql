-- Phase 1 photos and secret capsules. Media lives in the private
-- universe-media bucket under paths that start with the couple id:
--   <couple>/memories/<memory>/<photo>/{full|thumb}.{webp|jpg}
--   <couple>/capsules/<capsule>/{full|thumb}.{webp|jpg}
-- Capsule title, message, and image path live in capsule_contents so RLS can
-- hide them from the partner until the capsule is opened.

alter table public.relationship_events
  drop constraint relationship_events_event_type_check;
alter table public.relationship_events
  add constraint relationship_events_event_type_check
  check (event_type in ('MEMORY_CREATED', 'CHECKIN_CREATED', 'CAPSULE_CREATED', 'CAPSULE_OPENED'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('universe-media', 'universe-media', false, 5242880, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table public.memory_photos (
  id uuid primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  uploader_user_id uuid not null references auth.users(id),
  full_path text not null unique,
  thumb_path text not null unique,
  width integer not null check (width between 1 and 1600),
  height integer not null check (height between 1 and 1600),
  created_at timestamptz not null default now()
);

create index memory_photos_memory_idx on public.memory_photos (memory_id, created_at);
create index memory_photos_couple_idx on public.memory_photos (couple_id);

create table public.capsules (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  creator_user_id uuid not null references auth.users(id),
  unlock_date date not null,
  unlock_at timestamptz not null,
  opened_at timestamptz,
  opened_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint capsules_opened_pair check ((opened_at is null) = (opened_by is null)),
  constraint capsules_opened_after_unlock check (opened_at is null or opened_at >= unlock_at)
);

create index capsules_couple_unlock_idx on public.capsules (couple_id, unlock_at);

create table public.capsule_contents (
  capsule_id uuid primary key references public.capsules(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  message text not null check (char_length(btrim(message)) between 1 and 4000),
  image_full_path text unique,
  image_thumb_path text unique,
  image_width integer check (image_width between 1 and 1600),
  image_height integer check (image_height between 1 and 1600),
  constraint capsule_contents_image_pair check (
    (image_full_path is null) = (image_thumb_path is null)
    and (image_full_path is null) = (image_width is null)
    and (image_full_path is null) = (image_height is null)
  )
);

alter table public.cosmic_objects
  drop constraint cosmic_objects_object_type_check;
alter table public.cosmic_objects
  add constraint cosmic_objects_object_type_check
  check (object_type in ('STAR', 'BRIGHT_STAR', 'COMET'));
alter table public.cosmic_objects
  add column capsule_id uuid references public.capsules(id) on delete cascade;
create unique index cosmic_objects_one_per_capsule
  on public.cosmic_objects (capsule_id) where capsule_id is not null;

-- Capsules orbit farther out than memory stars, so they read as distant objects.
create function private.capsule_object_values(p_capsule_id uuid)
returns jsonb
language plpgsql immutable
set search_path = ''
as $$
declare
  v_hash bytea := extensions.digest(p_capsule_id::text, 'sha256');
  v_theta double precision;
  v_phi double precision;
  v_radius double precision;
begin
  v_theta := 2.0 * pi() * (
    get_byte(v_hash, 0)::double precision
    + get_byte(v_hash, 1)::double precision * 256.0
    + get_byte(v_hash, 2)::double precision * 65536.0
  ) / 16777215.0;
  v_phi := 0.35 * pi() + 0.3 * pi() * (
    get_byte(v_hash, 4)::double precision + get_byte(v_hash, 5)::double precision * 256.0
  ) / 65535.0;
  v_radius := 84.0 + (get_byte(v_hash, 8)::int % 12);
  return jsonb_build_object(
    'position_x', v_radius * sin(v_phi) * cos(v_theta),
    'position_y', v_radius * cos(v_phi),
    'position_z', v_radius * sin(v_phi) * sin(v_theta),
    'scale', 1.0 + (get_byte(v_hash, 10)::int % 16)::double precision / 100.0,
    'rotation', 2.0 * pi() * (get_byte(v_hash, 12)::double precision / 255.0),
    'visual_seed', (get_byte(v_hash, 0)::int << 16) + (get_byte(v_hash, 1)::int << 8)
      + get_byte(v_hash, 2)::int
  );
end;
$$;

create function private.can_read_capsule_content(p_capsule_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.capsules c
    where c.id = p_capsule_id
      and private.is_couple_member(c.couple_id)
      and (c.creator_user_id = (select auth.uid()) or c.opened_at is not null)
  );
$$;

create function private.can_read_media(p_name text)
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
  return false;
end;
$$;

create function private.can_write_media(p_name text)
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
  return false;
end;
$$;

-- Both files of an upload must exist and belong to the caller before a row
-- points at them.
create function private.uploaded_pair_exists(p_base text, p_extension text, p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select count(*) = 2 from storage.objects o
  where o.bucket_id = 'universe-media'
    and o.name in (p_base || 'full.' || p_extension, p_base || 'thumb.' || p_extension)
    and coalesce(o.owner_id, o.owner::text) = p_user_id::text;
$$;

create function private.add_memory_photo(
  p_memory_id uuid,
  p_photo_id uuid,
  p_extension text,
  p_width integer,
  p_height integer
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_base text;
begin
  select couple_id into v_couple_id from public.memories
  where id = p_memory_id and author_user_id = v_user_id
  for update;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_memory_author';
  end if;
  if p_photo_id is null
    or coalesce(p_extension, '') not in ('webp', 'jpg')
    or coalesce(p_width, 0) not between 1 and 1600
    or coalesce(p_height, 0) not between 1 and 1600 then
    raise exception 'invalid_photo';
  end if;
  if (select count(*) from public.memory_photos where memory_id = p_memory_id) >= 6 then
    raise exception 'photo_limit_reached';
  end if;

  v_base := v_couple_id::text || '/memories/' || p_memory_id::text || '/' || p_photo_id::text || '/';
  if not private.uploaded_pair_exists(v_base, p_extension, v_user_id) then
    raise exception 'photo_files_missing';
  end if;

  insert into public.memory_photos (
    id, couple_id, memory_id, uploader_user_id, full_path, thumb_path, width, height
  )
  values (
    p_photo_id, v_couple_id, p_memory_id, v_user_id,
    v_base || 'full.' || p_extension, v_base || 'thumb.' || p_extension,
    p_width, p_height
  );
  return p_photo_id;
end;
$$;

create function private.delete_memory_photo(p_photo_id uuid)
returns text[]
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_full text;
  v_thumb text;
begin
  delete from public.memory_photos p
  using public.memories m
  where p.id = p_photo_id
    and m.id = p.memory_id
    and m.author_user_id = v_user_id
    and private.is_couple_member(p.couple_id)
  returning p.full_path, p.thumb_path into v_full, v_thumb;
  if v_full is null then
    raise exception 'not_memory_author';
  end if;
  return array[v_full, v_thumb];
end;
$$;

create function private.create_capsule(
  p_couple_id uuid,
  p_title text,
  p_message text,
  p_unlock_date date
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_today date;
  v_capsule_id uuid;
  v_event_id uuid;
  v_object jsonb;
begin
  if v_user_id is null or not private.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;
  select timezone into v_timezone from public.couple_settings where couple_id = p_couple_id;
  v_today := (now() at time zone v_timezone)::date;
  if char_length(pg_catalog.btrim(coalesce(p_title, ''))) not between 1 and 120
    or char_length(pg_catalog.btrim(coalesce(p_message, ''))) not between 1 and 4000
    or p_unlock_date is null
    or p_unlock_date <= v_today
    or p_unlock_date > v_today + 365 * 50 then
    raise exception 'invalid_capsule';
  end if;

  insert into public.capsules (couple_id, creator_user_id, unlock_date, unlock_at)
  values (p_couple_id, v_user_id, p_unlock_date, p_unlock_date::timestamp at time zone v_timezone)
  returning id into v_capsule_id;

  insert into public.capsule_contents (capsule_id, couple_id, title, message)
  values (v_capsule_id, p_couple_id, pg_catalog.btrim(p_title), pg_catalog.btrim(p_message));

  insert into public.relationship_events (
    couple_id, event_type, source_entity_id, actor_user_id, event_date, metadata
  )
  values (
    p_couple_id, 'CAPSULE_CREATED', v_capsule_id, v_user_id, v_today,
    jsonb_build_object('unlock_date', p_unlock_date)
  )
  returning id into v_event_id;

  v_object := private.capsule_object_values(v_capsule_id);
  insert into public.cosmic_objects (
    couple_id, relationship_event_id, capsule_id, object_type,
    position_x, position_y, position_z, scale, brightness, rotation, visual_seed,
    metadata
  )
  values (
    p_couple_id, v_event_id, v_capsule_id, 'COMET',
    (v_object ->> 'position_x')::double precision,
    (v_object ->> 'position_y')::double precision,
    (v_object ->> 'position_z')::double precision,
    (v_object ->> 'scale')::double precision,
    0.45,
    (v_object ->> 'rotation')::double precision,
    (v_object ->> 'visual_seed')::integer,
    jsonb_build_object('unlock_date', p_unlock_date)
  );

  return v_capsule_id;
end;
$$;

create function private.attach_capsule_image(
  p_capsule_id uuid,
  p_extension text,
  p_width integer,
  p_height integer
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_base text;
begin
  select couple_id into v_couple_id from public.capsules
  where id = p_capsule_id and creator_user_id = v_user_id and opened_at is null
  for update;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_capsule_creator';
  end if;
  if coalesce(p_extension, '') not in ('webp', 'jpg')
    or coalesce(p_width, 0) not between 1 and 1600
    or coalesce(p_height, 0) not between 1 and 1600 then
    raise exception 'invalid_photo';
  end if;
  if exists (
    select 1 from public.capsule_contents
    where capsule_id = p_capsule_id and image_full_path is not null
  ) then
    raise exception 'capsule_image_exists';
  end if;

  v_base := v_couple_id::text || '/capsules/' || p_capsule_id::text || '/';
  if not private.uploaded_pair_exists(v_base, p_extension, v_user_id) then
    raise exception 'photo_files_missing';
  end if;

  update public.capsule_contents
  set image_full_path = v_base || 'full.' || p_extension,
      image_thumb_path = v_base || 'thumb.' || p_extension,
      image_width = p_width,
      image_height = p_height
  where capsule_id = p_capsule_id;
end;
$$;

create function private.open_capsule(p_capsule_id uuid)
returns timestamptz
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_capsule public.capsules%rowtype;
  v_opened timestamptz;
  v_timezone text;
begin
  select * into v_capsule from public.capsules where id = p_capsule_id for update;
  if not found or v_user_id is null or not private.is_couple_member(v_capsule.couple_id) then
    raise exception 'not_couple_member';
  end if;
  if v_capsule.opened_at is not null then
    return v_capsule.opened_at;
  end if;
  if now() < v_capsule.unlock_at then
    raise exception 'capsule_locked';
  end if;

  update public.capsules
  set opened_at = now(), opened_by = v_user_id
  where id = p_capsule_id
  returning opened_at into v_opened;

  select timezone into v_timezone from public.couple_settings where couple_id = v_capsule.couple_id;
  insert into public.relationship_events (
    couple_id, event_type, source_entity_id, actor_user_id, event_date, metadata
  )
  values (
    v_capsule.couple_id, 'CAPSULE_OPENED', p_capsule_id, v_user_id,
    (v_opened at time zone v_timezone)::date, '{}'::jsonb
  )
  on conflict (event_type, source_entity_id) do nothing;

  return v_opened;
end;
$$;

create function private.delete_capsule(p_capsule_id uuid)
returns text[]
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_paths text[];
begin
  select couple_id into v_couple_id from public.capsules
  where id = p_capsule_id and creator_user_id = v_user_id and opened_at is null
  for update;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_capsule_creator';
  end if;
  select array_remove(array[image_full_path, image_thumb_path], null) into v_paths
  from public.capsule_contents where capsule_id = p_capsule_id;

  delete from public.relationship_events
  where event_type in ('CAPSULE_CREATED', 'CAPSULE_OPENED') and source_entity_id = p_capsule_id;
  delete from public.capsules where id = p_capsule_id;
  return coalesce(v_paths, array[]::text[]);
end;
$$;

alter table public.memory_photos enable row level security;
alter table public.capsules enable row level security;
alter table public.capsule_contents enable row level security;

revoke all on public.memory_photos, public.capsules, public.capsule_contents
  from anon, authenticated;
grant select on public.memory_photos, public.capsules, public.capsule_contents
  to authenticated;

create policy "members can read memory photos" on public.memory_photos
  for select to authenticated using (private.is_couple_member(couple_id));
create policy "members can read capsules" on public.capsules
  for select to authenticated using (private.is_couple_member(couple_id));
create policy "creator or opened capsule content" on public.capsule_contents
  for select to authenticated using (private.can_read_capsule_content(capsule_id));

create policy "members read universe media" on storage.objects
  for select to authenticated
  using (bucket_id = 'universe-media' and private.can_read_media(name));
create policy "authors upload universe media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'universe-media' and private.can_write_media(name));
create policy "uploaders delete universe media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'universe-media'
    and coalesce(owner_id, owner::text) = (select auth.uid())::text
  );

create function public.add_memory_photo(
  p_memory_id uuid, p_photo_id uuid, p_extension text, p_width integer, p_height integer
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_memory_photo(p_memory_id, p_photo_id, p_extension, p_width, p_height); $$;

create function public.delete_memory_photo(p_photo_id uuid)
returns text[] language sql security invoker set search_path = ''
as $$ select private.delete_memory_photo(p_photo_id); $$;

create function public.create_capsule(
  p_couple_id uuid, p_title text, p_message text, p_unlock_date date
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_capsule(p_couple_id, p_title, p_message, p_unlock_date); $$;

create function public.attach_capsule_image(
  p_capsule_id uuid, p_extension text, p_width integer, p_height integer
)
returns void language sql security invoker set search_path = ''
as $$ select private.attach_capsule_image(p_capsule_id, p_extension, p_width, p_height); $$;

create function public.open_capsule(p_capsule_id uuid)
returns timestamptz language sql security invoker set search_path = ''
as $$ select private.open_capsule(p_capsule_id); $$;

create function public.delete_capsule(p_capsule_id uuid)
returns text[] language sql security invoker set search_path = ''
as $$ select private.delete_capsule(p_capsule_id); $$;

revoke execute on function
  private.capsule_object_values(uuid),
  private.can_read_capsule_content(uuid),
  private.can_read_media(text),
  private.can_write_media(text),
  private.uploaded_pair_exists(text, text, uuid),
  private.add_memory_photo(uuid, uuid, text, integer, integer),
  private.delete_memory_photo(uuid),
  private.create_capsule(uuid, text, text, date),
  private.attach_capsule_image(uuid, text, integer, integer),
  private.open_capsule(uuid),
  private.delete_capsule(uuid)
  from public, anon, authenticated;
grant execute on function
  private.can_read_capsule_content(uuid),
  private.can_read_media(text),
  private.can_write_media(text),
  private.add_memory_photo(uuid, uuid, text, integer, integer),
  private.delete_memory_photo(uuid),
  private.create_capsule(uuid, text, text, date),
  private.attach_capsule_image(uuid, text, integer, integer),
  private.open_capsule(uuid),
  private.delete_capsule(uuid)
  to authenticated;

revoke execute on function
  public.add_memory_photo(uuid, uuid, text, integer, integer),
  public.delete_memory_photo(uuid),
  public.create_capsule(uuid, text, text, date),
  public.attach_capsule_image(uuid, text, integer, integer),
  public.open_capsule(uuid),
  public.delete_capsule(uuid)
  from public, anon;
grant execute on function
  public.add_memory_photo(uuid, uuid, text, integer, integer),
  public.delete_memory_photo(uuid),
  public.create_capsule(uuid, text, text, date),
  public.attach_capsule_image(uuid, text, integer, integer),
  public.open_capsule(uuid),
  public.delete_capsule(uuid)
  to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.capsules;
    exception when duplicate_object then
      null;
    end;
    begin
      alter publication supabase_realtime add table public.memory_photos;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;
