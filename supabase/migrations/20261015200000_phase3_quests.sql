-- Phase 3 couple quests and persistent cosmic rewards.
-- Quest photos: <couple>/quests/<quest>/<author>/{full|thumb}.{webp|jpg}.

alter table public.relationship_events
  drop constraint relationship_events_event_type_check;
alter table public.relationship_events
  add constraint relationship_events_event_type_check
  check (event_type in (
    'MEMORY_CREATED', 'CHECKIN_CREATED', 'CAPSULE_CREATED', 'CAPSULE_OPENED',
    'SAME_MOMENT', 'ANNIVERSARY_REACHED', 'MILESTONE_REACHED', 'QUEST_COMPLETED'
  ));

alter table public.cosmic_objects
  drop constraint cosmic_objects_object_type_check;
alter table public.cosmic_objects
  add constraint cosmic_objects_object_type_check
  check (object_type in (
    'STAR', 'BRIGHT_STAR', 'COMET', 'TWIN_STAR', 'MOON', 'QUEST_REWARD'
  ));

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  template_key text not null check (template_key in (
    'photograph_sky', 'favorite_song', 'what_eating',
    'want_to_do', 'recreate_photo', 'best_moment'
  )),
  title text not null,
  instructions text not null,
  response_type text not null check (response_type in ('photo', 'text', 'photo_text')),
  reward_kind text not null check (reward_kind in (
    'FRAGMENT', 'ASTEROID', 'FLOWER', 'NEBULA', 'SPECIAL_STAR'
  )),
  status text not null default 'open' check (status in ('open', 'complete', 'incomplete')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint quests_window_after_start check (expires_at > created_at),
  constraint quests_complete_pair check ((status = 'complete') = (completed_at is not null))
);

create unique index quests_one_open on public.quests (couple_id) where status = 'open';
create index quests_couple_created_idx on public.quests (couple_id, created_at desc);

create table public.quest_submissions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_user_id uuid not null references auth.users(id),
  body text,
  image_full_path text unique,
  image_thumb_path text unique,
  image_width integer,
  image_height integer,
  created_at timestamptz not null default now(),
  constraint quest_submissions_one_per_author unique (quest_id, author_user_id),
  constraint quest_submissions_image_pair check (
    (image_full_path is null) = (image_thumb_path is null)
    and (image_full_path is null) = (image_width is null)
    and (image_full_path is null) = (image_height is null)
    and (image_width is null or image_width between 1 and 1600)
    and (image_height is null or image_height between 1 and 1600)
  ),
  constraint quest_submissions_body_len check (body is null or char_length(body) between 1 and 280)
);

create index quest_submissions_quest_idx on public.quest_submissions (quest_id);

alter table public.cosmic_objects
  add column quest_id uuid references public.quests(id) on delete cascade;

create unique index cosmic_objects_one_per_quest
  on public.cosmic_objects (quest_id) where quest_id is not null;

create function private.quest_template(p_key text)
returns jsonb
language sql immutable
set search_path = ''
as $$
  select case p_key
    when 'photograph_sky' then jsonb_build_object(
      'title', 'Photograph the sky',
      'instructions', 'Step outside or to a window and capture the sky where you are.',
      'response_type', 'photo',
      'reward_kind', 'FRAGMENT'
    )
    when 'favorite_song' then jsonb_build_object(
      'title', 'Share today''s favorite song',
      'instructions', 'Name the song that stuck with you today, and why in a sentence.',
      'response_type', 'text',
      'reward_kind', 'ASTEROID'
    )
    when 'what_eating' then jsonb_build_object(
      'title', 'Show what you''re eating',
      'instructions', 'Send a photo of a meal or snack and a short note.',
      'response_type', 'photo_text',
      'reward_kind', 'FLOWER'
    )
    when 'want_to_do' then jsonb_build_object(
      'title', 'One thing to do together',
      'instructions', 'Write one thing you want to do together soon.',
      'response_type', 'text',
      'reward_kind', 'NEBULA'
    )
    when 'recreate_photo' then jsonb_build_object(
      'title', 'Recreate an old photo',
      'instructions', 'Recreate a shared memory in a new photo from where you are.',
      'response_type', 'photo',
      'reward_kind', 'SPECIAL_STAR'
    )
    when 'best_moment' then jsonb_build_object(
      'title', 'Today''s best moment',
      'instructions', 'Describe the best small moment of your day.',
      'response_type', 'text',
      'reward_kind', 'FRAGMENT'
    )
    else null
  end;
$$;

create function private.quest_reward_values(p_quest_id uuid)
returns jsonb
language plpgsql immutable
set search_path = ''
as $$
declare
  v_hash bytea := extensions.digest(p_quest_id::text, 'sha256');
  v_theta double precision;
  v_phi double precision;
  v_radius double precision := 62.0 + (get_byte(v_hash, 8)::int % 12);
begin
  v_theta := 2.0 * pi() * (get_byte(v_hash, 0)::double precision / 255.0);
  v_phi := 0.55 * pi() + 0.25 * pi() * (get_byte(v_hash, 4)::double precision / 255.0);
  return jsonb_build_object(
    'position_x', v_radius * sin(v_phi) * cos(v_theta),
    'position_y', v_radius * cos(v_phi) * 0.7,
    'position_z', v_radius * sin(v_phi) * sin(v_theta),
    'scale', 1.2,
    'rotation', (get_byte(v_hash, 10)::double precision / 255.0) * pi(),
    'visual_seed', get_byte(v_hash, 12)::integer
  );
end;
$$;

create function private.expire_open_quests(p_couple_id uuid)
returns void
language sql security definer
set search_path = ''
as $$
  update public.quests
  set status = 'incomplete'
  where couple_id = p_couple_id and status = 'open' and expires_at <= now();
$$;

create function private.finish_quest(p_quest_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_quest public.quests%rowtype;
  v_event_id uuid;
  v_reward jsonb;
  v_timezone text;
begin
  select * into v_quest from public.quests where id = p_quest_id for update;
  if v_quest.status = 'complete' then
    return;
  end if;
  if (select count(*) from public.quest_submissions where quest_id = p_quest_id) < 2 then
    return;
  end if;

  update public.quests
  set status = 'complete', completed_at = now()
  where id = p_quest_id;

  select timezone into v_timezone from public.couple_settings where couple_id = v_quest.couple_id;
  insert into public.relationship_events (
    couple_id, event_type, source_entity_id, actor_user_id, event_date, metadata
  )
  values (
    v_quest.couple_id, 'QUEST_COMPLETED', p_quest_id, v_quest.created_by,
    (now() at time zone v_timezone)::date,
    jsonb_build_object('template_key', v_quest.template_key, 'reward_kind', v_quest.reward_kind)
  )
  on conflict (event_type, source_entity_id) do update
    set metadata = excluded.metadata
  returning id into v_event_id;

  if exists (select 1 from public.cosmic_objects where quest_id = p_quest_id) then
    return;
  end if;

  v_reward := private.quest_reward_values(p_quest_id);
  insert into public.cosmic_objects (
    couple_id, relationship_event_id, quest_id, object_type,
    position_x, position_y, position_z, scale, brightness, rotation, visual_seed, metadata
  )
  values (
    v_quest.couple_id, v_event_id, p_quest_id, 'QUEST_REWARD',
    (v_reward ->> 'position_x')::double precision,
    (v_reward ->> 'position_y')::double precision,
    (v_reward ->> 'position_z')::double precision,
    (v_reward ->> 'scale')::double precision,
    0.82,
    (v_reward ->> 'rotation')::double precision,
    (v_reward ->> 'visual_seed')::integer,
    jsonb_build_object('reward_kind', v_quest.reward_kind, 'title', v_quest.title)
  );
end;
$$;

create function private.start_quest(p_template_key text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_template jsonb;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_couple_member';
  end if;
  select couple_id into v_couple_id from public.couple_members where user_id = v_user_id;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_couple_member';
  end if;

  perform private.expire_open_quests(v_couple_id);
  if exists (select 1 from public.quests where couple_id = v_couple_id and status = 'open') then
    raise exception 'quest_open';
  end if;

  v_template := private.quest_template(p_template_key);
  if v_template is null then
    raise exception 'invalid_quest';
  end if;

  insert into public.quests (
    couple_id, created_by, template_key, title, instructions,
    response_type, reward_kind, expires_at
  )
  values (
    v_couple_id, v_user_id, p_template_key,
    v_template ->> 'title',
    v_template ->> 'instructions',
    v_template ->> 'response_type',
    v_template ->> 'reward_kind',
    now() + interval '48 hours'
  )
  returning id into v_id;
  return v_id;
end;
$$;

create function private.submit_quest(
  p_quest_id uuid,
  p_body text,
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
  v_quest public.quests%rowtype;
  v_body text := nullif(pg_catalog.btrim(coalesce(p_body, '')), '');
  v_base text;
  v_id uuid;
  v_needs_photo boolean;
  v_needs_text boolean;
begin
  select * into v_quest from public.quests where id = p_quest_id for update;
  if not found or v_user_id is null or not private.is_couple_member(v_quest.couple_id) then
    raise exception 'not_couple_member';
  end if;
  if v_quest.status <> 'open' or v_quest.expires_at <= now() then
    perform private.expire_open_quests(v_quest.couple_id);
    raise exception 'quest_closed';
  end if;
  if exists (
    select 1 from public.quest_submissions
    where quest_id = p_quest_id and author_user_id = v_user_id
  ) then
    raise exception 'already_submitted';
  end if;

  v_needs_photo := v_quest.response_type in ('photo', 'photo_text');
  v_needs_text := v_quest.response_type in ('text', 'photo_text');

  if v_needs_text and (v_body is null or char_length(v_body) > 280) then
    raise exception 'invalid_response';
  end if;
  if not v_needs_text then
    v_body := null;
  end if;

  if v_needs_photo then
    if coalesce(p_extension, '') not in ('webp', 'jpg')
      or coalesce(p_width, 0) not between 1 and 1600
      or coalesce(p_height, 0) not between 1 and 1600 then
      raise exception 'invalid_photo';
    end if;
    v_base := v_quest.couple_id::text || '/quests/' || p_quest_id::text || '/' || v_user_id::text || '/';
    if not private.uploaded_pair_exists(v_base, p_extension, v_user_id) then
      raise exception 'photo_files_missing';
    end if;
    insert into public.quest_submissions (
      quest_id, couple_id, author_user_id, body,
      image_full_path, image_thumb_path, image_width, image_height
    )
    values (
      p_quest_id, v_quest.couple_id, v_user_id, v_body,
      v_base || 'full.' || p_extension, v_base || 'thumb.' || p_extension,
      p_width, p_height
    )
    returning id into v_id;
  else
    if p_extension is not null or p_width is not null or p_height is not null then
      raise exception 'invalid_photo';
    end if;
    insert into public.quest_submissions (
      quest_id, couple_id, author_user_id, body
    )
    values (p_quest_id, v_quest.couple_id, v_user_id, v_body)
    returning id into v_id;
  end if;

  perform private.finish_quest(p_quest_id);
  return v_id;
end;
$$;

create function private.refresh_quests()
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
  perform private.expire_open_quests(v_couple_id);
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
  if v_length = 5 and v_parts[2] = 'quests' and v_parts[4] = v_user_id::text then
    return exists (
      select 1 from public.quests q
      where q.id = v_parts[3]::uuid and q.couple_id = v_parts[1]::uuid
        and q.status = 'open' and q.expires_at > now()
        and q.response_type in ('photo', 'photo_text')
    ) and not exists (
      select 1 from public.quest_submissions s
      where s.quest_id = v_parts[3]::uuid and s.author_user_id = v_user_id
    );
  end if;
  return false;
end;
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
  if v_length = 5 and v_parts[2] = 'quests' and coalesce(v_parts[4], '') ~ v_uuid then
    return exists (
      select 1 from public.quests q
      where q.id = v_parts[3]::uuid and q.couple_id = v_parts[1]::uuid
        and private.is_couple_member(q.couple_id)
    );
  end if;
  return false;
end;
$$;

create function public.start_quest(p_template_key text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.start_quest(p_template_key); $$;

create function public.submit_quest(
  p_quest_id uuid, p_body text, p_extension text, p_width integer, p_height integer
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.submit_quest(p_quest_id, p_body, p_extension, p_width, p_height); $$;

create function public.refresh_quests()
returns void language sql security invoker set search_path = ''
as $$ select private.refresh_quests(); $$;

alter table public.quests enable row level security;
alter table public.quest_submissions enable row level security;
revoke all on public.quests, public.quest_submissions from anon, authenticated;
grant select on public.quests, public.quest_submissions to authenticated;

create policy "members can read quests" on public.quests
  for select to authenticated using (private.is_couple_member(couple_id));
create policy "members can read quest submissions" on public.quest_submissions
  for select to authenticated using (private.is_couple_member(couple_id));

revoke execute on function private.quest_template(text) from public, anon, authenticated;
revoke execute on function private.quest_reward_values(uuid) from public, anon, authenticated;
revoke execute on function private.expire_open_quests(uuid) from public, anon, authenticated;
revoke execute on function private.finish_quest(uuid) from public, anon, authenticated;
revoke execute on function private.start_quest(text) from public, anon, authenticated;
revoke execute on function private.submit_quest(uuid, text, text, integer, integer) from public, anon, authenticated;
revoke execute on function private.refresh_quests() from public, anon, authenticated;
grant execute on function private.start_quest(text) to authenticated;
grant execute on function private.submit_quest(uuid, text, text, integer, integer) to authenticated;
grant execute on function private.refresh_quests() to authenticated;

revoke execute on function public.start_quest(text) from public, anon;
revoke execute on function public.submit_quest(uuid, text, text, integer, integer) from public, anon;
revoke execute on function public.refresh_quests() from public, anon;
grant execute on function public.start_quest(text) to authenticated;
grant execute on function public.submit_quest(uuid, text, text, integer, integer) to authenticated;
grant execute on function public.refresh_quests() to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.quests;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.quest_submissions;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
