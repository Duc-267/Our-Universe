-- Phase 3 constellations: named groups of memory stars with canvas line overlays.

alter table public.relationship_events
  drop constraint relationship_events_event_type_check;
alter table public.relationship_events
  add constraint relationship_events_event_type_check
  check (event_type in (
    'MEMORY_CREATED', 'CHECKIN_CREATED', 'CAPSULE_CREATED', 'CAPSULE_OPENED',
    'SAME_MOMENT', 'ANNIVERSARY_REACHED', 'MILESTONE_REACHED', 'QUEST_COMPLETED',
    'TRIP_PLANET', 'CONSTELLATION_CREATED'
  ));

create table public.constellations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint constellations_name_len check (char_length(name) between 1 and 80),
  constraint constellations_note_len check (note is null or char_length(note) between 1 and 500)
);

create index constellations_couple_idx on public.constellations (couple_id, created_at desc);

create table public.constellation_members (
  constellation_id uuid not null references public.constellations(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (constellation_id, memory_id)
);

create index constellation_members_memory_idx on public.constellation_members (memory_id);

create function private.touch_constellation_updated_at()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger constellations_touch_updated_at
  before update on public.constellations
  for each row execute function private.touch_constellation_updated_at();

create function private.replace_constellation_members(p_constellation_id uuid, p_memory_ids uuid[])
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_couple_id uuid;
  v_memory_id uuid;
  v_memory public.memories%rowtype;
  v_seen uuid[] := array[]::uuid[];
begin
  select couple_id into v_couple_id from public.constellations where id = p_constellation_id;
  if not found then
    raise exception 'not_couple_member';
  end if;

  if p_memory_ids is null or cardinality(p_memory_ids) < 2 then
    raise exception 'invalid_constellation';
  end if;

  foreach v_memory_id in array p_memory_ids
  loop
    if v_memory_id = any(v_seen) then
      continue;
    end if;
    select * into v_memory from public.memories where id = v_memory_id;
    if not found or v_memory.couple_id <> v_couple_id then
      raise exception 'not_couple_member';
    end if;
    v_seen := array_append(v_seen, v_memory_id);
  end loop;

  if cardinality(v_seen) < 2 then
    raise exception 'invalid_constellation';
  end if;

  delete from public.constellation_members where constellation_id = p_constellation_id;
  insert into public.constellation_members (constellation_id, memory_id, couple_id)
  select p_constellation_id, seen.id, v_couple_id
  from unnest(v_seen) as seen(id);
end;
$$;

create function private.create_constellation(p_name text, p_note text, p_memory_ids uuid[])
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_name text := pg_catalog.btrim(coalesce(p_name, ''));
  v_note text := nullif(pg_catalog.btrim(coalesce(p_note, '')), '');
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_couple_member';
  end if;
  select couple_id into v_couple_id from public.couple_members where user_id = v_user_id;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_couple_member';
  end if;
  if char_length(v_name) not between 1 and 80
    or (v_note is not null and char_length(v_note) > 500) then
    raise exception 'invalid_constellation';
  end if;

  insert into public.constellations (couple_id, created_by, name, note)
  values (v_couple_id, v_user_id, v_name, v_note)
  returning id into v_id;

  perform private.replace_constellation_members(v_id, p_memory_ids);

  insert into public.relationship_events (
    couple_id, event_type, source_entity_id, actor_user_id, event_date, metadata
  )
  values (
    v_couple_id, 'CONSTELLATION_CREATED', v_id, v_user_id, (now() at time zone 'utc')::date,
    jsonb_build_object('name', v_name)
  )
  on conflict (event_type, source_entity_id) do update
    set metadata = excluded.metadata;

  return v_id;
end;
$$;

create function private.update_constellation(
  p_constellation_id uuid,
  p_name text,
  p_note text,
  p_memory_ids uuid[]
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.constellations%rowtype;
  v_name text := pg_catalog.btrim(coalesce(p_name, ''));
  v_note text := nullif(pg_catalog.btrim(coalesce(p_note, '')), '');
begin
  select * into v_row from public.constellations where id = p_constellation_id for update;
  if not found or v_user_id is null or not private.is_couple_member(v_row.couple_id) then
    raise exception 'not_couple_member';
  end if;
  if char_length(v_name) not between 1 and 80
    or (v_note is not null and char_length(v_note) > 500) then
    raise exception 'invalid_constellation';
  end if;

  update public.constellations
  set name = v_name, note = v_note
  where id = p_constellation_id;
  perform private.replace_constellation_members(p_constellation_id, p_memory_ids);

  update public.relationship_events
  set metadata = jsonb_build_object('name', v_name)
  where event_type = 'CONSTELLATION_CREATED' and source_entity_id = p_constellation_id;
end;
$$;

create function private.delete_constellation(p_constellation_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.constellations%rowtype;
begin
  select * into v_row from public.constellations where id = p_constellation_id for update;
  if not found or v_user_id is null or not private.is_couple_member(v_row.couple_id) then
    raise exception 'not_couple_member';
  end if;
  delete from public.relationship_events
  where event_type = 'CONSTELLATION_CREATED' and source_entity_id = p_constellation_id;
  delete from public.constellations where id = p_constellation_id;
end;
$$;

create function public.create_constellation(p_name text, p_note text, p_memory_ids uuid[])
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_constellation(p_name, p_note, p_memory_ids); $$;

create function public.update_constellation(
  p_constellation_id uuid, p_name text, p_note text, p_memory_ids uuid[]
)
returns void language sql security invoker set search_path = ''
as $$ select private.update_constellation(p_constellation_id, p_name, p_note, p_memory_ids); $$;

create function public.delete_constellation(p_constellation_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.delete_constellation(p_constellation_id); $$;

alter table public.constellations enable row level security;
alter table public.constellation_members enable row level security;
revoke all on public.constellations, public.constellation_members from anon, authenticated;
grant select on public.constellations, public.constellation_members to authenticated;

create policy "members can read constellations" on public.constellations
  for select to authenticated using (private.is_couple_member(couple_id));
create policy "members can read constellation members" on public.constellation_members
  for select to authenticated using (private.is_couple_member(couple_id));

revoke execute on function private.replace_constellation_members(uuid, uuid[]) from public, anon, authenticated;
revoke execute on function private.create_constellation(text, text, uuid[]) from public, anon, authenticated;
revoke execute on function private.update_constellation(uuid, text, text, uuid[]) from public, anon, authenticated;
revoke execute on function private.delete_constellation(uuid) from public, anon, authenticated;
grant execute on function private.create_constellation(text, text, uuid[]) to authenticated;
grant execute on function private.update_constellation(uuid, text, text, uuid[]) to authenticated;
grant execute on function private.delete_constellation(uuid) to authenticated;

revoke execute on function
  public.create_constellation(text, text, uuid[]),
  public.update_constellation(uuid, text, text, uuid[]),
  public.delete_constellation(uuid)
  from public, anon;
grant execute on function
  public.create_constellation(text, text, uuid[]),
  public.update_constellation(uuid, text, text, uuid[]),
  public.delete_constellation(uuid)
  to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.constellations;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.constellation_members;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
