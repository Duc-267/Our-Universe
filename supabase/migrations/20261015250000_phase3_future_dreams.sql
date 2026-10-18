-- Phase 3 future dreams: distant objects that become memories when completed.

alter table public.relationship_events
  drop constraint relationship_events_event_type_check;
alter table public.relationship_events
  add constraint relationship_events_event_type_check
  check (event_type in (
    'MEMORY_CREATED', 'CHECKIN_CREATED', 'CAPSULE_CREATED', 'CAPSULE_OPENED',
    'SAME_MOMENT', 'ANNIVERSARY_REACHED', 'MILESTONE_REACHED', 'QUEST_COMPLETED',
    'TRIP_PLANET', 'CONSTELLATION_CREATED', 'DREAM_RECORDED'
  ));

alter table public.cosmic_objects
  drop constraint cosmic_objects_object_type_check;
alter table public.cosmic_objects
  add constraint cosmic_objects_object_type_check
  check (object_type in (
    'STAR', 'BRIGHT_STAR', 'COMET', 'TWIN_STAR', 'MOON', 'QUEST_REWARD', 'PLANET',
    'DISTANT_OBJECT'
  ));

create table public.future_dreams (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null,
  description text,
  target_date date,
  category text not null,
  status text not null default 'dream',
  memory_id uuid references public.memories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint future_dreams_title_len check (char_length(title) between 1 and 120),
  constraint future_dreams_description_len check (description is null or char_length(description) <= 2000),
  constraint future_dreams_category_check check (
    category in ('everyday', 'date', 'trip', 'funny', 'special', 'difficult', 'random')
  ),
  constraint future_dreams_status_check check (status in ('dream', 'planned', 'completed'))
);

create index future_dreams_couple_created_idx
  on public.future_dreams (couple_id, created_at desc);

alter table public.cosmic_objects
  add column dream_id uuid references public.future_dreams(id) on delete cascade;

create unique index cosmic_objects_one_per_dream
  on public.cosmic_objects (dream_id) where dream_id is not null;

create function private.touch_dream_updated_at()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger future_dreams_touch_updated_at
  before update on public.future_dreams
  for each row execute function private.touch_dream_updated_at();

create function private.dream_object_values(p_dream_id uuid)
returns jsonb
language plpgsql immutable
set search_path = ''
as $$
declare
  v_hash bytea := extensions.digest(p_dream_id::text, 'sha256');
  v_theta double precision;
  v_phi double precision;
  v_radius double precision := 128.0 + (get_byte(v_hash, 8)::int % 22);
begin
  v_theta := 2.0 * pi() * (get_byte(v_hash, 0)::double precision / 255.0);
  v_phi := 0.35 * pi() + 0.3 * pi() * (get_byte(v_hash, 4)::double precision / 255.0);
  return jsonb_build_object(
    'position_x', v_radius * sin(v_phi) * cos(v_theta),
    'position_y', v_radius * cos(v_phi) * 0.4,
    'position_z', v_radius * sin(v_phi) * sin(v_theta),
    'scale', 0.55 + (get_byte(v_hash, 10)::int % 11)::double precision / 100.0,
    'rotation', (get_byte(v_hash, 11)::double precision / 255.0) * pi(),
    'visual_seed', get_byte(v_hash, 12)::integer
  );
end;
$$;

create function private.sync_dream_object(p_dream_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_dream public.future_dreams%rowtype;
  v_event_id uuid;
  v_object jsonb;
begin
  select * into v_dream from public.future_dreams where id = p_dream_id for update;
  if not found or v_dream.status = 'completed' then
    delete from public.relationship_events
    where event_type = 'DREAM_RECORDED' and source_entity_id = p_dream_id;
    return;
  end if;

  insert into public.relationship_events (
    couple_id, event_type, source_entity_id, actor_user_id, event_date, metadata
  )
  values (
    v_dream.couple_id, 'DREAM_RECORDED', p_dream_id, v_dream.created_by,
    coalesce(v_dream.target_date, (now() at time zone 'UTC')::date),
    jsonb_build_object('title', v_dream.title, 'status', v_dream.status)
  )
  on conflict (event_type, source_entity_id) do update
    set metadata = excluded.metadata,
        event_date = excluded.event_date
  returning id into v_event_id;

  if exists (select 1 from public.cosmic_objects where dream_id = p_dream_id) then
    update public.cosmic_objects
    set relationship_event_id = v_event_id,
        metadata = jsonb_build_object('title', v_dream.title, 'status', v_dream.status)
    where dream_id = p_dream_id;
    return;
  end if;

  v_object := private.dream_object_values(p_dream_id);
  insert into public.cosmic_objects (
    couple_id, relationship_event_id, dream_id, object_type,
    position_x, position_y, position_z, scale, brightness, rotation, visual_seed, metadata
  )
  values (
    v_dream.couple_id, v_event_id, p_dream_id, 'DISTANT_OBJECT',
    (v_object ->> 'position_x')::double precision,
    (v_object ->> 'position_y')::double precision,
    (v_object ->> 'position_z')::double precision,
    (v_object ->> 'scale')::double precision,
    0.34,
    (v_object ->> 'rotation')::double precision,
    (v_object ->> 'visual_seed')::integer,
    jsonb_build_object('title', v_dream.title, 'status', v_dream.status)
  );
end;
$$;

create function private.couple_local_today(p_couple_id uuid)
returns date
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_timezone text;
begin
  select timezone into v_timezone from public.couple_settings where couple_id = p_couple_id;
  if v_timezone is null then
    return (now() at time zone 'UTC')::date;
  end if;
  return (now() at time zone v_timezone)::date;
end;
$$;

create function private.complete_dream(p_dream_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_dream public.future_dreams%rowtype;
  v_today date;
  v_memory_date date;
  v_memory_id uuid;
begin
  select * into v_dream from public.future_dreams where id = p_dream_id for update;
  if not found then
    raise exception 'not_couple_member';
  end if;
  if v_dream.status = 'completed' then
    raise exception 'dream_completed';
  end if;
  v_today := private.couple_local_today(v_dream.couple_id);
  v_memory_date := case
    when v_dream.target_date is not null and v_dream.target_date <= v_today then v_dream.target_date
    else v_today
  end;
  v_memory_id := private.create_memory(
    v_dream.couple_id,
    v_dream.title,
    v_memory_date,
    v_dream.description,
    null::text,
    v_dream.category,
    5::smallint,
    null::text
  );
  update public.future_dreams
  set status = 'completed',
      memory_id = v_memory_id
  where id = p_dream_id;
  delete from public.relationship_events
  where event_type = 'DREAM_RECORDED' and source_entity_id = p_dream_id;
  return v_memory_id;
end;
$$;

create function private.create_dream(
  p_title text,
  p_description text,
  p_target_date date,
  p_category text
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_title text := pg_catalog.btrim(coalesce(p_title, ''));
  v_description text := nullif(pg_catalog.btrim(coalesce(p_description, '')), '');
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_couple_member';
  end if;
  select couple_id into v_couple_id from public.couple_members where user_id = v_user_id;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_couple_member';
  end if;
  if char_length(v_title) not between 1 and 120
    or (v_description is not null and char_length(v_description) > 2000)
    or p_category is null
    or p_category not in ('everyday', 'date', 'trip', 'funny', 'special', 'difficult', 'random') then
    raise exception 'invalid_dream';
  end if;

  insert into public.future_dreams (
    couple_id, created_by, title, description, target_date, category, status
  )
  values (v_couple_id, v_user_id, v_title, v_description, p_target_date, p_category, 'dream')
  returning id into v_id;
  perform private.sync_dream_object(v_id);
  return v_id;
end;
$$;

create function private.update_dream(
  p_dream_id uuid,
  p_title text,
  p_description text,
  p_target_date date,
  p_category text,
  p_status text
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_dream public.future_dreams%rowtype;
  v_title text := pg_catalog.btrim(coalesce(p_title, ''));
  v_description text := nullif(pg_catalog.btrim(coalesce(p_description, '')), '');
begin
  select * into v_dream from public.future_dreams where id = p_dream_id for update;
  if not found or v_user_id is null or not private.is_couple_member(v_dream.couple_id) then
    raise exception 'not_couple_member';
  end if;
  if v_dream.status = 'completed' then
    raise exception 'dream_completed';
  end if;
  if char_length(v_title) not between 1 and 120
    or (v_description is not null and char_length(v_description) > 2000)
    or p_category is null
    or p_category not in ('everyday', 'date', 'trip', 'funny', 'special', 'difficult', 'random')
    or p_status is null
    or p_status not in ('dream', 'planned', 'completed') then
    raise exception 'invalid_dream';
  end if;

  update public.future_dreams
  set title = v_title,
      description = v_description,
      target_date = p_target_date,
      category = p_category
  where id = p_dream_id;

  if p_status = 'completed' then
    perform private.complete_dream(p_dream_id);
    return;
  end if;

  update public.future_dreams set status = p_status where id = p_dream_id;
  perform private.sync_dream_object(p_dream_id);
end;
$$;

create function private.delete_dream(p_dream_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_dream public.future_dreams%rowtype;
begin
  select * into v_dream from public.future_dreams where id = p_dream_id for update;
  if not found or v_user_id is null or not private.is_couple_member(v_dream.couple_id) then
    raise exception 'not_couple_member';
  end if;
  if v_dream.status = 'completed' then
    raise exception 'dream_completed';
  end if;
  delete from public.relationship_events
  where event_type = 'DREAM_RECORDED' and source_entity_id = p_dream_id;
  delete from public.future_dreams where id = p_dream_id;
end;
$$;

create function public.create_dream(
  p_title text, p_description text, p_target_date date, p_category text
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_dream(p_title, p_description, p_target_date, p_category); $$;

create function public.update_dream(
  p_dream_id uuid, p_title text, p_description text, p_target_date date, p_category text, p_status text
)
returns void language sql security invoker set search_path = ''
as $$ select private.update_dream(p_dream_id, p_title, p_description, p_target_date, p_category, p_status); $$;

create function public.delete_dream(p_dream_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.delete_dream(p_dream_id); $$;

alter table public.future_dreams enable row level security;
revoke all on public.future_dreams from anon, authenticated;
grant select on public.future_dreams to authenticated;

create policy "members can read future dreams" on public.future_dreams
  for select to authenticated using (private.is_couple_member(couple_id));

revoke execute on function private.dream_object_values(uuid) from public, anon, authenticated;
revoke execute on function private.sync_dream_object(uuid) from public, anon, authenticated;
revoke execute on function private.couple_local_today(uuid) from public, anon, authenticated;
revoke execute on function private.complete_dream(uuid) from public, anon, authenticated;
revoke execute on function private.create_dream(text, text, date, text) from public, anon, authenticated;
revoke execute on function private.update_dream(uuid, text, text, date, text, text) from public, anon, authenticated;
revoke execute on function private.delete_dream(uuid) from public, anon, authenticated;
grant execute on function private.create_dream(text, text, date, text) to authenticated;
grant execute on function private.update_dream(uuid, text, text, date, text, text) to authenticated;
grant execute on function private.delete_dream(uuid) to authenticated;

revoke execute on function
  public.create_dream(text, text, date, text),
  public.update_dream(uuid, text, text, date, text, text),
  public.delete_dream(uuid)
  from public, anon;
grant execute on function
  public.create_dream(text, text, date, text),
  public.update_dream(uuid, text, text, date, text, text),
  public.delete_dream(uuid)
  to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.future_dreams;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
