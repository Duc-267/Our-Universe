-- Optional star icon chosen by the memory author. Existing rows take the
-- category default. Calls that omit the icon keep that default on create
-- and leave a stored icon unchanged on update.

alter table public.memories
  add column icon text;

update public.memories
set icon = case category
  when 'date' then 'heart'
  when 'trip' then 'plane'
  when 'funny' then 'smile'
  when 'special' then 'spark'
  when 'difficult' then 'moon'
  when 'random' then 'star'
  else 'coffee'
end
where icon is null;

alter table public.memories
  alter column icon set default 'spark',
  alter column icon set not null,
  add constraint memories_icon_check check (icon in (
    'heart', 'coffee', 'plane', 'smile', 'spark', 'moon', 'star',
    'sun', 'flower', 'music', 'camera', 'home', 'ring', 'letter'
  ));

create function private.resolve_memory_icon(p_icon text, p_category text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_icon is null or pg_catalog.btrim(p_icon) = '' then
      case p_category
        when 'date' then 'heart'
        when 'trip' then 'plane'
        when 'funny' then 'smile'
        when 'special' then 'spark'
        when 'difficult' then 'moon'
        when 'random' then 'star'
        else 'coffee'
      end
    when pg_catalog.btrim(p_icon) in (
      'heart', 'coffee', 'plane', 'smile', 'spark', 'moon', 'star',
      'sun', 'flower', 'music', 'camera', 'home', 'ring', 'letter'
    ) then pg_catalog.btrim(p_icon)
    else null
  end
$$;

drop function public.create_memory(uuid, text, date, text, text, text, smallint);
drop function public.update_memory(uuid, text, date, text, text, text, smallint);
drop function private.create_memory(uuid, text, date, text, text, text, smallint);
drop function private.update_memory(uuid, text, date, text, text, text, smallint);

create function private.create_memory(
  p_couple_id uuid,
  p_title text,
  p_memory_date date,
  p_description text,
  p_location_text text,
  p_category text,
  p_importance smallint,
  p_icon text default null
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
  v_icon text;
begin
  if v_user_id is null or not private.is_couple_member(p_couple_id) then
    raise exception 'not_couple_member';
  end if;
  v_icon := private.resolve_memory_icon(p_icon, p_category);
  if p_memory_date is null
    or char_length(pg_catalog.btrim(coalesce(p_title, ''))) not between 1 and 120
    or char_length(coalesce(p_description, '')) > 2000
    or char_length(pg_catalog.btrim(coalesce(p_location_text, ''))) > 120
    or p_category is null
    or p_category not in ('everyday', 'date', 'trip', 'funny', 'special', 'difficult', 'random')
    or p_importance is null
    or p_importance not between 1 and 10
    or v_icon is null then
    raise exception 'invalid_memory_data';
  end if;

  insert into public.memories (
    couple_id, author_user_id, title, memory_date, description, location_text,
    category, importance, icon
  )
  values (
    p_couple_id, v_user_id, pg_catalog.btrim(p_title), p_memory_date,
    nullif(pg_catalog.btrim(coalesce(p_description, '')), ''),
    nullif(pg_catalog.btrim(coalesce(p_location_text, '')), ''),
    p_category, p_importance, v_icon
  )
  returning id into v_memory_id;

  insert into public.relationship_events (
    couple_id, event_type, source_entity_id, actor_user_id, event_date, metadata
  )
  values (
    p_couple_id, 'MEMORY_CREATED', v_memory_id, v_user_id, p_memory_date,
    jsonb_build_object('category', p_category, 'importance', p_importance, 'icon', v_icon)
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
    jsonb_build_object('category', p_category, 'importance', p_importance, 'icon', v_icon)
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
  p_importance smallint,
  p_icon text default null
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_star jsonb;
  v_icon text;
begin
  select couple_id, icon into v_couple_id, v_icon from public.memories
  where id = p_memory_id and author_user_id = v_user_id;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_memory_author';
  end if;
  if p_icon is not null and pg_catalog.btrim(p_icon) <> '' then
    v_icon := private.resolve_memory_icon(p_icon, p_category);
  end if;
  if p_memory_date is null
    or char_length(pg_catalog.btrim(coalesce(p_title, ''))) not between 1 and 120
    or char_length(coalesce(p_description, '')) > 2000
    or char_length(pg_catalog.btrim(coalesce(p_location_text, ''))) > 120
    or p_category is null
    or p_category not in ('everyday', 'date', 'trip', 'funny', 'special', 'difficult', 'random')
    or p_importance is null
    or p_importance not between 1 and 10
    or v_icon is null then
    raise exception 'invalid_memory_data';
  end if;

  update public.memories
  set title = pg_catalog.btrim(p_title),
      memory_date = p_memory_date,
      description = nullif(pg_catalog.btrim(coalesce(p_description, '')), ''),
      location_text = nullif(pg_catalog.btrim(coalesce(p_location_text, '')), ''),
      category = p_category,
      importance = p_importance,
      icon = v_icon
  where id = p_memory_id;

  update public.relationship_events
  set event_date = p_memory_date,
      metadata = jsonb_build_object('category', p_category, 'importance', p_importance, 'icon', v_icon)
  where event_type = 'MEMORY_CREATED' and source_entity_id = p_memory_id;

  v_star := private.memory_star_values(p_memory_id, p_importance);
  update public.cosmic_objects
  set object_type = v_star ->> 'object_type',
      scale = (v_star ->> 'scale')::double precision,
      brightness = (v_star ->> 'brightness')::double precision,
      metadata = jsonb_build_object('category', p_category, 'importance', p_importance, 'icon', v_icon)
  where memory_id = p_memory_id;
end;
$$;

create function public.create_memory(
  p_couple_id uuid, p_title text, p_memory_date date, p_description text,
  p_location_text text, p_category text, p_importance smallint,
  p_icon text default null
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_memory(
  p_couple_id, p_title, p_memory_date, p_description, p_location_text,
  p_category, p_importance, p_icon
); $$;

create function public.update_memory(
  p_memory_id uuid, p_title text, p_memory_date date, p_description text,
  p_location_text text, p_category text, p_importance smallint,
  p_icon text default null
)
returns void language sql security invoker set search_path = ''
as $$ select private.update_memory(
  p_memory_id, p_title, p_memory_date, p_description, p_location_text,
  p_category, p_importance, p_icon
); $$;

revoke execute on function private.resolve_memory_icon(text, text),
  private.create_memory(uuid, text, date, text, text, text, smallint, text),
  private.update_memory(uuid, text, date, text, text, text, smallint, text)
  from public, anon, authenticated;
grant execute on function
  private.create_memory(uuid, text, date, text, text, text, smallint, text),
  private.update_memory(uuid, text, date, text, text, text, smallint, text)
  to authenticated;

revoke execute on function
  public.create_memory(uuid, text, date, text, text, text, smallint, text),
  public.update_memory(uuid, text, date, text, text, text, smallint, text)
  from public, anon;
grant execute on function
  public.create_memory(uuid, text, date, text, text, text, smallint, text),
  public.update_memory(uuid, text, date, text, text, text, smallint, text)
  to authenticated;
