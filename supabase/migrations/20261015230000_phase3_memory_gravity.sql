-- Phase 3 memory gravity: a derived score on existing memory stars.

alter table public.cosmic_objects
  add column gravity smallint not null default 0
  constraint cosmic_objects_gravity_range check (gravity between 0 and 100);

create function private.memory_gravity_score(
  p_importance smallint,
  p_photo_count integer,
  p_link_count integer
)
returns smallint
language sql immutable
set search_path = ''
as $$
  select least(100, greatest(0,
    coalesce(p_importance, 0) * 6
    + least(greatest(coalesce(p_photo_count, 0), 0), 4) * 6
    + least(greatest(coalesce(p_link_count, 0), 0), 4) * 6
  ))::smallint;
$$;

create function private.refresh_memory_gravity()
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

  update public.cosmic_objects as object
  set gravity = private.memory_gravity_score(
    memory.importance,
    (
      select count(*)::integer from public.memory_photos as photo
      where photo.memory_id = memory.id
    ),
    (
      select count(*)::integer from public.constellation_members as member
      where member.memory_id = memory.id
    ) + (
      select count(*)::integer from public.trip_memories as link
      where link.memory_id = memory.id
    )
  )
  from public.memories as memory
  where object.memory_id = memory.id
    and object.couple_id = v_couple_id
    and object.object_type in ('STAR', 'BRIGHT_STAR');
end;
$$;

create function public.refresh_memory_gravity()
returns void language sql security invoker set search_path = ''
as $$ select private.refresh_memory_gravity(); $$;

revoke execute on function private.memory_gravity_score(smallint, integer, integer) from public, anon, authenticated;
revoke execute on function private.refresh_memory_gravity() from public, anon, authenticated;
grant execute on function private.refresh_memory_gravity() to authenticated;

revoke execute on function public.refresh_memory_gravity() from public, anon;
grant execute on function public.refresh_memory_gravity() to authenticated;
