-- Phase 3 trips and significant-trip planets.

alter table public.relationship_events
  drop constraint relationship_events_event_type_check;
alter table public.relationship_events
  add constraint relationship_events_event_type_check
  check (event_type in (
    'MEMORY_CREATED', 'CHECKIN_CREATED', 'CAPSULE_CREATED', 'CAPSULE_OPENED',
    'SAME_MOMENT', 'ANNIVERSARY_REACHED', 'MILESTONE_REACHED', 'QUEST_COMPLETED',
    'TRIP_PLANET'
  ));

alter table public.cosmic_objects
  drop constraint cosmic_objects_object_type_check;
alter table public.cosmic_objects
  add constraint cosmic_objects_object_type_check
  check (object_type in (
    'STAR', 'BRIGHT_STAR', 'COMET', 'TWIN_STAR', 'MOON', 'QUEST_REWARD', 'PLANET'
  ));

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  destination text not null,
  start_date date not null,
  end_date date not null,
  note text,
  significant boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_destination_len check (char_length(destination) between 1 and 120),
  constraint trips_note_len check (note is null or char_length(note) between 1 and 500),
  constraint trips_dates check (end_date >= start_date)
);

create index trips_couple_start_idx on public.trips (couple_id, start_date desc);

create table public.trip_memories (
  trip_id uuid not null references public.trips(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trip_id, memory_id)
);

create index trip_memories_memory_idx on public.trip_memories (memory_id);

alter table public.cosmic_objects
  add column trip_id uuid references public.trips(id) on delete cascade;

create unique index cosmic_objects_one_per_trip
  on public.cosmic_objects (trip_id) where trip_id is not null;

create function private.touch_trip_updated_at()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trips_touch_updated_at
  before update on public.trips
  for each row execute function private.touch_trip_updated_at();

create function private.planet_object_values(p_trip_id uuid)
returns jsonb
language plpgsql immutable
set search_path = ''
as $$
declare
  v_hash bytea := extensions.digest(p_trip_id::text, 'sha256');
  v_theta double precision;
  v_phi double precision;
  v_radius double precision := 78.0 + (get_byte(v_hash, 8)::int % 16);
begin
  v_theta := 2.0 * pi() * (get_byte(v_hash, 0)::double precision / 255.0);
  v_phi := 0.48 * pi() + 0.22 * pi() * (get_byte(v_hash, 4)::double precision / 255.0);
  return jsonb_build_object(
    'position_x', v_radius * sin(v_phi) * cos(v_theta),
    'position_y', v_radius * cos(v_phi) * 0.45,
    'position_z', v_radius * sin(v_phi) * sin(v_theta),
    'scale', 1.55 + (get_byte(v_hash, 10)::int % 21)::double precision / 100.0,
    'rotation', (get_byte(v_hash, 11)::double precision / 255.0) * pi(),
    'visual_seed', get_byte(v_hash, 12)::integer
  );
end;
$$;

create function private.sync_trip_planet(p_trip_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_trip public.trips%rowtype;
  v_event_id uuid;
  v_planet jsonb;
  v_timezone text;
begin
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found then
    return;
  end if;

  if not v_trip.significant then
    delete from public.relationship_events
    where event_type = 'TRIP_PLANET' and source_entity_id = p_trip_id;
    delete from public.cosmic_objects where trip_id = p_trip_id;
    return;
  end if;

  select timezone into v_timezone from public.couple_settings where couple_id = v_trip.couple_id;
  insert into public.relationship_events (
    couple_id, event_type, source_entity_id, actor_user_id, event_date, metadata
  )
  values (
    v_trip.couple_id, 'TRIP_PLANET', p_trip_id, v_trip.created_by,
    v_trip.start_date,
    jsonb_build_object('destination', v_trip.destination)
  )
  on conflict (event_type, source_entity_id) do update
    set metadata = excluded.metadata
  returning id into v_event_id;

  if exists (select 1 from public.cosmic_objects where trip_id = p_trip_id) then
    update public.cosmic_objects
    set relationship_event_id = v_event_id,
        metadata = jsonb_build_object('destination', v_trip.destination)
    where trip_id = p_trip_id;
    return;
  end if;

  v_planet := private.planet_object_values(p_trip_id);
  insert into public.cosmic_objects (
    couple_id, relationship_event_id, trip_id, object_type,
    position_x, position_y, position_z, scale, brightness, rotation, visual_seed, metadata
  )
  values (
    v_trip.couple_id, v_event_id, p_trip_id, 'PLANET',
    (v_planet ->> 'position_x')::double precision,
    (v_planet ->> 'position_y')::double precision,
    (v_planet ->> 'position_z')::double precision,
    (v_planet ->> 'scale')::double precision,
    0.88,
    (v_planet ->> 'rotation')::double precision,
    (v_planet ->> 'visual_seed')::integer,
    jsonb_build_object('destination', v_trip.destination)
  );
end;
$$;

create function private.create_trip(
  p_destination text,
  p_start_date date,
  p_end_date date,
  p_note text,
  p_significant boolean
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_note text := nullif(pg_catalog.btrim(coalesce(p_note, '')), '');
  v_destination text := pg_catalog.btrim(coalesce(p_destination, ''));
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_couple_member';
  end if;
  select couple_id into v_couple_id from public.couple_members where user_id = v_user_id;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_couple_member';
  end if;
  if char_length(v_destination) not between 1 and 120
    or p_start_date is null or p_end_date is null or p_end_date < p_start_date
    or (v_note is not null and char_length(v_note) > 500) then
    raise exception 'invalid_trip';
  end if;

  insert into public.trips (
    couple_id, created_by, destination, start_date, end_date, note, significant
  )
  values (
    v_couple_id, v_user_id, v_destination, p_start_date, p_end_date, v_note,
    coalesce(p_significant, false)
  )
  returning id into v_id;
  perform private.sync_trip_planet(v_id);
  return v_id;
end;
$$;

create function private.update_trip(
  p_trip_id uuid,
  p_destination text,
  p_start_date date,
  p_end_date date,
  p_note text,
  p_significant boolean
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip public.trips%rowtype;
  v_note text := nullif(pg_catalog.btrim(coalesce(p_note, '')), '');
  v_destination text := pg_catalog.btrim(coalesce(p_destination, ''));
begin
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found or v_user_id is null or not private.is_couple_member(v_trip.couple_id) then
    raise exception 'not_couple_member';
  end if;
  if char_length(v_destination) not between 1 and 120
    or p_start_date is null or p_end_date is null or p_end_date < p_start_date
    or (v_note is not null and char_length(v_note) > 500) then
    raise exception 'invalid_trip';
  end if;

  update public.trips
  set destination = v_destination,
      start_date = p_start_date,
      end_date = p_end_date,
      note = v_note,
      significant = coalesce(p_significant, false)
  where id = p_trip_id;
  perform private.sync_trip_planet(p_trip_id);
end;
$$;

create function private.link_trip_memory(p_trip_id uuid, p_memory_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip public.trips%rowtype;
  v_memory public.memories%rowtype;
begin
  select * into v_trip from public.trips where id = p_trip_id for update;
  select * into v_memory from public.memories where id = p_memory_id;
  if v_user_id is null or not found
    or not private.is_couple_member(v_trip.couple_id)
    or v_memory.couple_id <> v_trip.couple_id then
    raise exception 'not_couple_member';
  end if;
  insert into public.trip_memories (trip_id, memory_id, couple_id)
  values (p_trip_id, p_memory_id, v_trip.couple_id)
  on conflict do nothing;
end;
$$;

create function private.unlink_trip_memory(p_trip_id uuid, p_memory_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip public.trips%rowtype;
begin
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found or v_user_id is null or not private.is_couple_member(v_trip.couple_id) then
    raise exception 'not_couple_member';
  end if;
  delete from public.trip_memories
  where trip_id = p_trip_id and memory_id = p_memory_id;
end;
$$;

create function private.delete_trip(p_trip_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip public.trips%rowtype;
begin
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found or v_user_id is null or not private.is_couple_member(v_trip.couple_id) then
    raise exception 'not_couple_member';
  end if;
  delete from public.relationship_events
  where event_type = 'TRIP_PLANET' and source_entity_id = p_trip_id;
  delete from public.trips where id = p_trip_id;
end;
$$;

create function public.create_trip(
  p_destination text, p_start_date date, p_end_date date, p_note text, p_significant boolean
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_trip(p_destination, p_start_date, p_end_date, p_note, p_significant); $$;

create function public.update_trip(
  p_trip_id uuid, p_destination text, p_start_date date, p_end_date date, p_note text, p_significant boolean
)
returns void language sql security invoker set search_path = ''
as $$ select private.update_trip(p_trip_id, p_destination, p_start_date, p_end_date, p_note, p_significant); $$;

create function public.link_trip_memory(p_trip_id uuid, p_memory_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.link_trip_memory(p_trip_id, p_memory_id); $$;

create function public.unlink_trip_memory(p_trip_id uuid, p_memory_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.unlink_trip_memory(p_trip_id, p_memory_id); $$;

create function public.delete_trip(p_trip_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.delete_trip(p_trip_id); $$;

alter table public.trips enable row level security;
alter table public.trip_memories enable row level security;
revoke all on public.trips, public.trip_memories from anon, authenticated;
grant select on public.trips, public.trip_memories to authenticated;

create policy "members can read trips" on public.trips
  for select to authenticated using (private.is_couple_member(couple_id));
create policy "members can read trip memories" on public.trip_memories
  for select to authenticated using (private.is_couple_member(couple_id));

revoke execute on function private.planet_object_values(uuid) from public, anon, authenticated;
revoke execute on function private.sync_trip_planet(uuid) from public, anon, authenticated;
revoke execute on function private.create_trip(text, date, date, text, boolean) from public, anon, authenticated;
revoke execute on function private.update_trip(uuid, text, date, date, text, boolean) from public, anon, authenticated;
revoke execute on function private.link_trip_memory(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.unlink_trip_memory(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.delete_trip(uuid) from public, anon, authenticated;
grant execute on function private.create_trip(text, date, date, text, boolean) to authenticated;
grant execute on function private.update_trip(uuid, text, date, date, text, boolean) to authenticated;
grant execute on function private.link_trip_memory(uuid, uuid) to authenticated;
grant execute on function private.unlink_trip_memory(uuid, uuid) to authenticated;
grant execute on function private.delete_trip(uuid) to authenticated;

revoke execute on function
  public.create_trip(text, date, date, text, boolean),
  public.update_trip(uuid, text, date, date, text, boolean),
  public.link_trip_memory(uuid, uuid),
  public.unlink_trip_memory(uuid, uuid),
  public.delete_trip(uuid)
  from public, anon;
grant execute on function
  public.create_trip(text, date, date, text, boolean),
  public.update_trip(uuid, text, date, date, text, boolean),
  public.link_trip_memory(uuid, uuid),
  public.unlink_trip_memory(uuid, uuid),
  public.delete_trip(uuid)
  to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.trips;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.trip_memories;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
