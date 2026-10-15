-- Phase 3 anniversary moons and day milestones (100 / 365 days).

alter table public.relationship_events
  drop constraint relationship_events_event_type_check;
alter table public.relationship_events
  add constraint relationship_events_event_type_check
  check (event_type in (
    'MEMORY_CREATED', 'CHECKIN_CREATED', 'CAPSULE_CREATED', 'CAPSULE_OPENED',
    'SAME_MOMENT', 'ANNIVERSARY_REACHED', 'MILESTONE_REACHED'
  ));

alter table public.cosmic_objects
  drop constraint cosmic_objects_object_type_check;
alter table public.cosmic_objects
  add constraint cosmic_objects_object_type_check
  check (object_type in ('STAR', 'BRIGHT_STAR', 'COMET', 'TWIN_STAR', 'MOON'));

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  kind text not null check (kind in ('anniversary', 'days')),
  key text not null,
  reached_on date not null,
  created_at timestamptz not null default now(),
  constraint milestones_key_shape check (
    (kind = 'anniversary' and key ~ '^[1-9][0-9]*$')
    or (kind = 'days' and key in ('100', '365'))
  ),
  constraint milestones_unique_per_couple unique (couple_id, kind, key)
);

create index milestones_couple_reached_idx
  on public.milestones (couple_id, reached_on desc);

alter table public.cosmic_objects
  add column milestone_id uuid references public.milestones(id) on delete cascade;

create unique index cosmic_objects_one_per_milestone
  on public.cosmic_objects (milestone_id) where milestone_id is not null;

create function private.anniversary_on(p_start date, p_year integer)
returns date
language plpgsql immutable
set search_path = ''
as $$
declare
  v_month integer := extract(month from p_start)::integer;
  v_day integer := extract(day from p_start)::integer;
  v_last integer;
begin
  v_last := extract(
    day from (make_date(p_year, v_month, 1) + interval '1 month - 1 day')
  )::integer;
  return make_date(p_year, v_month, least(v_day, v_last));
end;
$$;

create function private.moon_object_values(p_milestone_id uuid, p_number integer)
returns jsonb
language plpgsql immutable
set search_path = ''
as $$
declare
  v_hash bytea := extensions.digest(p_milestone_id::text, 'sha256');
  v_theta double precision;
  v_phi double precision;
  v_radius double precision := 30.0 + ((p_number - 1) % 5) * 2.4
    + (get_byte(v_hash, 8)::double precision / 255.0) * 2.0;
begin
  v_theta := 2.0 * pi() * (get_byte(v_hash, 0)::double precision / 255.0)
    + p_number * 0.85;
  v_phi := 0.32 * pi() + 0.12 * pi() * (get_byte(v_hash, 4)::double precision / 255.0);
  return jsonb_build_object(
    'position_x', v_radius * sin(v_phi) * cos(v_theta),
    'position_y', v_radius * cos(v_phi) * 0.55,
    'position_z', v_radius * sin(v_phi) * sin(v_theta),
    'scale', 1.15 + least(p_number, 5) * 0.04,
    'rotation', (get_byte(v_hash, 10)::double precision / 255.0) * pi(),
    'visual_seed', get_byte(v_hash, 12)::integer
  );
end;
$$;

create function private.ensure_anniversary_milestone(
  p_couple_id uuid,
  p_number integer,
  p_reached_on date,
  p_actor uuid
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_milestone_id uuid;
  v_event_id uuid;
  v_moon jsonb;
begin
  insert into public.milestones (couple_id, kind, key, reached_on)
  values (p_couple_id, 'anniversary', p_number::text, p_reached_on)
  on conflict (couple_id, kind, key) do update
    set reached_on = public.milestones.reached_on
  returning id into v_milestone_id;

  insert into public.relationship_events (
    couple_id, event_type, source_entity_id, actor_user_id, event_date, metadata
  )
  values (
    p_couple_id, 'ANNIVERSARY_REACHED', v_milestone_id, p_actor, p_reached_on,
    jsonb_build_object('kind', 'anniversary', 'number', p_number)
  )
  on conflict (event_type, source_entity_id) do update
    set metadata = excluded.metadata
  returning id into v_event_id;

  if exists (select 1 from public.cosmic_objects where milestone_id = v_milestone_id) then
    return;
  end if;

  v_moon := private.moon_object_values(v_milestone_id, p_number);
  insert into public.cosmic_objects (
    couple_id, relationship_event_id, milestone_id, object_type,
    position_x, position_y, position_z, scale, brightness, rotation, visual_seed, metadata
  )
  values (
    p_couple_id, v_event_id, v_milestone_id, 'MOON',
    (v_moon ->> 'position_x')::double precision,
    (v_moon ->> 'position_y')::double precision,
    (v_moon ->> 'position_z')::double precision,
    (v_moon ->> 'scale')::double precision,
    0.8,
    (v_moon ->> 'rotation')::double precision,
    (v_moon ->> 'visual_seed')::integer,
    jsonb_build_object('kind', 'anniversary', 'number', p_number)
  );
end;
$$;

create function private.ensure_day_milestone(
  p_couple_id uuid,
  p_days integer,
  p_reached_on date,
  p_actor uuid
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_milestone_id uuid;
begin
  insert into public.milestones (couple_id, kind, key, reached_on)
  values (p_couple_id, 'days', p_days::text, p_reached_on)
  on conflict (couple_id, kind, key) do update
    set reached_on = public.milestones.reached_on
  returning id into v_milestone_id;

  insert into public.relationship_events (
    couple_id, event_type, source_entity_id, actor_user_id, event_date, metadata
  )
  values (
    p_couple_id, 'MILESTONE_REACHED', v_milestone_id, p_actor, p_reached_on,
    jsonb_build_object('kind', 'days', 'days', p_days)
  )
  on conflict (event_type, source_entity_id) do nothing;
end;
$$;

create function private.refresh_milestones(p_couple_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_start date;
  v_timezone text;
  v_today date;
  v_days integer;
  v_year integer;
  v_number integer;
  v_anniv date;
begin
  if v_actor is null or not private.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;

  select c.relationship_start_date, s.timezone
  into v_start, v_timezone
  from public.couples c
  join public.couple_settings s on s.couple_id = c.id
  where c.id = p_couple_id;

  if v_start is null then
    return;
  end if;

  begin
    v_today := (now() at time zone v_timezone)::date;
  exception when others then
    v_today := (now() at time zone 'UTC')::date;
  end;

  if v_today < v_start then
    return;
  end if;

  v_days := v_today - v_start;

  for v_year in extract(year from v_start)::integer + 1
    .. extract(year from v_today)::integer + 1
  loop
    v_anniv := private.anniversary_on(v_start, v_year);
    if v_anniv <= v_today then
      v_number := v_year - extract(year from v_start)::integer;
      if v_number >= 1 then
        perform private.ensure_anniversary_milestone(p_couple_id, v_number, v_anniv, v_actor);
      end if;
    end if;
  end loop;

  if v_days >= 100 then
    perform private.ensure_day_milestone(
      p_couple_id, 100, (v_start + 100), v_actor
    );
  end if;
  if v_days >= 365 then
    perform private.ensure_day_milestone(
      p_couple_id, 365, (v_start + 365), v_actor
    );
  end if;
end;
$$;

create function private.refresh_milestones()
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
  if not found then
    raise exception 'not_couple_member';
  end if;
  perform private.refresh_milestones(v_couple_id);
end;
$$;

create function public.refresh_milestones()
returns void
language sql security invoker
set search_path = ''
as $$ select private.refresh_milestones(); $$;

alter table public.milestones enable row level security;
revoke all on public.milestones from anon, authenticated;
grant select on public.milestones to authenticated;

create policy "members can read milestones" on public.milestones
  for select to authenticated using (private.is_couple_member(couple_id));

revoke execute on function private.anniversary_on(date, integer) from public, anon, authenticated;
revoke execute on function private.moon_object_values(uuid, integer) from public, anon, authenticated;
revoke execute on function private.ensure_anniversary_milestone(uuid, integer, date, uuid) from public, anon, authenticated;
revoke execute on function private.ensure_day_milestone(uuid, integer, date, uuid) from public, anon, authenticated;
revoke execute on function private.refresh_milestones(uuid) from public, anon, authenticated;
revoke execute on function private.refresh_milestones() from public, anon, authenticated;
grant execute on function private.refresh_milestones() to authenticated;

revoke execute on function public.refresh_milestones() from public, anon;
grant execute on function public.refresh_milestones() to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.milestones;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
