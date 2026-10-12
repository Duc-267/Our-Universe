-- Phase 1: universe and memories. Apply through Supabase migrations.
create schema if not exists private;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Memories are couple-scoped rows written only through private functions so that
-- the relationship event and the cosmic object are created in the same transaction.
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_user_id uuid not null references auth.users(id),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  memory_date date not null,
  description text check (description is null or char_length(description) <= 2000),
  location_text text check (location_text is null or char_length(btrim(location_text)) <= 120),
  category text not null default 'everyday'
    check (category in ('everyday', 'date', 'trip', 'funny', 'special', 'difficult', 'random')),
  importance smallint not null default 5 check (importance between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memories_couple_id_idx on public.memories (couple_id);

-- Relationship events are the immutable history the universe is derived from.
-- event_type is deliberately narrow here; later phases extend the allowed list.
create table public.relationship_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  event_type text not null check (event_type in ('MEMORY_CREATED')),
  source_entity_id uuid not null,
  actor_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  event_date date not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint relationship_events_one_per_source unique (event_type, source_entity_id)
);

create index relationship_events_couple_id_idx on public.relationship_events (couple_id);

-- Cosmic objects render the universe. memory_id is the Phase 1 star-to-memory
-- reference; future object types (planets, moons) may leave it null.
create table public.cosmic_objects (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  relationship_event_id uuid not null references public.relationship_events(id) on delete cascade,
  memory_id uuid references public.memories(id) on delete cascade,
  object_type text not null check (object_type in ('STAR', 'BRIGHT_STAR')),
  position_x double precision not null,
  position_y double precision not null,
  position_z double precision not null,
  scale double precision not null check (scale > 0),
  brightness double precision not null check (brightness between 0 and 1),
  rotation double precision not null,
  visual_seed integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index cosmic_objects_couple_id_idx on public.cosmic_objects (couple_id);
create unique index cosmic_objects_one_per_memory
  on public.cosmic_objects (memory_id) where memory_id is not null;

create function private.touch_memory_updated_at()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger memories_touch_updated_at
  before update on public.memories
  for each row execute function private.touch_memory_updated_at();

-- Universe Engine, first rule: derive a deterministic star from the memory id.
-- The same memory id always maps to the same position, scale, and rotation, so
-- positions stay stable between sessions and across repeat renders.
create function private.memory_star_values(p_memory_id uuid, p_importance smallint)
returns jsonb
language plpgsql immutable
set search_path = ''
as $$
declare
  v_hash bytea := extensions.digest(p_memory_id::text, 'sha256');
  v_theta double precision;
  v_phi double precision;
  v_radius double precision;
  v_bright boolean := p_importance >= 8;
  v_base_scale double precision := case when v_bright then 1.35 else 1.0 end;
begin
  v_theta := 2.0 * pi() * (
    get_byte(v_hash, 0)::double precision
    + get_byte(v_hash, 1)::double precision * 256.0
    + get_byte(v_hash, 2)::double precision * 65536.0
    + get_byte(v_hash, 3)::double precision * 16777216.0
  ) / 4294967295.0;
  v_phi := pi() * (
    get_byte(v_hash, 4)::double precision
    + get_byte(v_hash, 5)::double precision * 256.0
    + get_byte(v_hash, 6)::double precision * 65536.0
    + get_byte(v_hash, 7)::double precision * 16777216.0
  ) / 4294967295.0;
  v_radius := 46.0 + (
    (get_byte(v_hash, 8)::bigint * 256 + get_byte(v_hash, 9)::bigint) % 34
  );
  return jsonb_build_object(
    'object_type', case when v_bright then 'BRIGHT_STAR' else 'STAR' end,
    'position_x', v_radius * sin(v_phi) * cos(v_theta),
    'position_y', v_radius * cos(v_phi),
    'position_z', v_radius * sin(v_phi) * sin(v_theta),
    'scale', v_base_scale * (0.9 + (get_byte(v_hash, 10)::int % 21)::double precision / 100.0),
    'brightness', case when v_bright then 0.85 else 0.55 end,
    'rotation', 2.0 * pi() * (get_byte(v_hash, 12)::double precision / 255.0),
    'visual_seed', (get_byte(v_hash, 0)::int << 24) + (get_byte(v_hash, 1)::int << 16)
      + (get_byte(v_hash, 2)::int << 8) + get_byte(v_hash, 3)::int
  );
end;
$$;

create function private.create_memory(
  p_couple_id uuid,
  p_title text,
  p_memory_date date,
  p_description text,
  p_location_text text,
  p_category text,
  p_importance smallint
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_memory_id uuid;
  v_event_id uuid;
  v_star jsonb;
begin
  if v_user_id is null or not private.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;
  if p_memory_date is null
    or char_length(pg_catalog.btrim(coalesce(p_title, ''))) not between 1 and 120
    or char_length(coalesce(p_description, '')) > 2000
    or char_length(pg_catalog.btrim(coalesce(p_location_text, ''))) > 120
    or p_category is null
    or p_category not in ('everyday', 'date', 'trip', 'funny', 'special', 'difficult', 'random')
    or p_importance is null
    or p_importance not between 1 and 10 then
    raise exception 'invalid_memory_data';
  end if;

  insert into public.memories (
    couple_id, author_user_id, title, memory_date, description, location_text,
    category, importance
  )
  values (
    p_couple_id, v_user_id, pg_catalog.btrim(p_title), p_memory_date,
    nullif(pg_catalog.btrim(coalesce(p_description, '')), ''),
    nullif(pg_catalog.btrim(coalesce(p_location_text, '')), ''),
    p_category, p_importance
  )
  returning id into v_memory_id;

  insert into public.relationship_events (
    couple_id, event_type, source_entity_id, actor_user_id, event_date, metadata
  )
  values (
    p_couple_id, 'MEMORY_CREATED', v_memory_id, v_user_id, p_memory_date,
    jsonb_build_object('category', p_category, 'importance', p_importance)
  )
  returning id into v_event_id;

  v_star := private.memory_star_values(v_memory_id, p_importance);

  insert into public.cosmic_objects (
    couple_id, relationship_event_id, memory_id, object_type,
    position_x, position_y, position_z, scale, brightness, rotation, visual_seed,
    metadata
  )
  values (
    p_couple_id, v_event_id, v_memory_id, v_star ->> 'object_type',
    (v_star ->> 'position_x')::double precision,
    (v_star ->> 'position_y')::double precision,
    (v_star ->> 'position_z')::double precision,
    (v_star ->> 'scale')::double precision,
    (v_star ->> 'brightness')::double precision,
    (v_star ->> 'rotation')::double precision,
    (v_star ->> 'visual_seed')::integer,
    jsonb_build_object('category', p_category, 'importance', p_importance)
  );

  return v_memory_id;
end;
$$;

create function private.update_memory(
  p_memory_id uuid,
  p_title text,
  p_memory_date date,
  p_description text,
  p_location_text text,
  p_category text,
  p_importance smallint
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_star jsonb;
begin
  select couple_id into v_couple_id from public.memories
  where id = p_memory_id and author_user_id = v_user_id;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_memory_author';
  end if;
  if p_memory_date is null
    or char_length(pg_catalog.btrim(coalesce(p_title, ''))) not between 1 and 120
    or char_length(coalesce(p_description, '')) > 2000
    or char_length(pg_catalog.btrim(coalesce(p_location_text, ''))) > 120
    or p_category is null
    or p_category not in ('everyday', 'date', 'trip', 'funny', 'special', 'difficult', 'random')
    or p_importance is null
    or p_importance not between 1 and 10 then
    raise exception 'invalid_memory_data';
  end if;

  update public.memories
  set title = pg_catalog.btrim(p_title),
      memory_date = p_memory_date,
      description = nullif(pg_catalog.btrim(coalesce(p_description, '')), ''),
      location_text = nullif(pg_catalog.btrim(coalesce(p_location_text, '')), ''),
      category = p_category,
      importance = p_importance
  where id = p_memory_id;

  update public.relationship_events
  set event_date = p_memory_date,
      metadata = jsonb_build_object('category', p_category, 'importance', p_importance)
  where event_type = 'MEMORY_CREATED' and source_entity_id = p_memory_id;

  v_star := private.memory_star_values(p_memory_id, p_importance);
  update public.cosmic_objects
  set object_type = v_star ->> 'object_type',
      scale = (v_star ->> 'scale')::double precision,
      brightness = (v_star ->> 'brightness')::double precision
  where memory_id = p_memory_id;
end;
$$;

create function private.delete_memory(p_memory_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
begin
  select couple_id into v_couple_id from public.memories
  where id = p_memory_id and author_user_id = v_user_id;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_memory_author';
  end if;

  delete from public.relationship_events
  where event_type = 'MEMORY_CREATED' and source_entity_id = p_memory_id;
  delete from public.memories where id = p_memory_id;
end;
$$;

alter table public.memories enable row level security;
alter table public.relationship_events enable row level security;
alter table public.cosmic_objects enable row level security;

revoke all on public.memories, public.relationship_events, public.cosmic_objects
  from anon, authenticated;

grant select on public.memories, public.relationship_events, public.cosmic_objects
  to authenticated;

create policy "members can read memories" on public.memories
  for select to authenticated using (private.is_couple_member(couple_id));
create policy "members can read relationship events" on public.relationship_events
  for select to authenticated using (private.is_couple_member(couple_id));
create policy "members can read cosmic objects" on public.cosmic_objects
  for select to authenticated using (private.is_couple_member(couple_id));

-- Data API wrappers are invoker functions; privileged logic stays in private.
create function public.create_memory(
  p_couple_id uuid, p_title text, p_memory_date date, p_description text,
  p_location_text text, p_category text, p_importance smallint
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_memory(
  p_couple_id, p_title, p_memory_date, p_description, p_location_text,
  p_category, p_importance
); $$;

create function public.update_memory(
  p_memory_id uuid, p_title text, p_memory_date date, p_description text,
  p_location_text text, p_category text, p_importance smallint
)
returns void language sql security invoker set search_path = ''
as $$ select private.update_memory(
  p_memory_id, p_title, p_memory_date, p_description, p_location_text,
  p_category, p_importance
); $$;

create function public.delete_memory(p_memory_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.delete_memory(p_memory_id); $$;

revoke execute on function private.memory_star_values(uuid, smallint),
  private.create_memory(uuid, text, date, text, text, text, smallint),
  private.update_memory(uuid, text, date, text, text, text, smallint),
  private.delete_memory(uuid),
  private.touch_memory_updated_at()
  from public, anon, authenticated;
grant execute on function private.create_memory(uuid, text, date, text, text, text, smallint),
  private.update_memory(uuid, text, date, text, text, text, smallint),
  private.delete_memory(uuid) to authenticated;

revoke execute on function public.create_memory(uuid, text, date, text, text, text, smallint),
  public.update_memory(uuid, text, date, text, text, text, smallint),
  public.delete_memory(uuid) from public, anon;
grant execute on function public.create_memory(uuid, text, date, text, text, text, smallint),
  public.update_memory(uuid, text, date, text, text, text, smallint),
  public.delete_memory(uuid) to authenticated;
