-- Phase 2 daily check-ins. One row per member per local day, written only
-- through private.save_checkin. The couple timezone decides which day it is.

alter table public.relationship_events
  drop constraint relationship_events_event_type_check;

alter table public.relationship_events
  add constraint relationship_events_event_type_check
  check (event_type in ('MEMORY_CREATED', 'CHECKIN_CREATED'));

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_user_id uuid not null references auth.users(id),
  local_date date not null,
  mood text not null check (mood in (
    'happy', 'calm', 'tired', 'stressed', 'sad', 'excited', 'need_space', 'miss_you'
  )),
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (author_user_id, local_date)
);

create index daily_checkins_couple_date_idx
  on public.daily_checkins (couple_id, local_date desc);

alter table public.daily_checkins enable row level security;

revoke all on public.daily_checkins from anon, authenticated;
grant select on public.daily_checkins to authenticated;

create policy "members can read check-ins" on public.daily_checkins
  for select to authenticated using (private.is_couple_member(couple_id));

create function private.save_checkin(p_mood text, p_note text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_timezone text;
  v_today date;
  v_note text;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_couple_member';
  end if;
  select couple_id into v_couple_id
  from public.couple_members
  where user_id = v_user_id;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_couple_member';
  end if;

  select timezone into v_timezone
  from public.couple_settings
  where couple_id = v_couple_id;
  v_today := (now() at time zone v_timezone)::date;
  v_note := nullif(pg_catalog.btrim(coalesce(p_note, '')), '');

  if p_mood is null
    or p_mood not in ('happy', 'calm', 'tired', 'stressed', 'sad', 'excited', 'need_space', 'miss_you')
    or char_length(coalesce(v_note, '')) > 280 then
    raise exception 'invalid_checkin';
  end if;

  insert into public.daily_checkins (couple_id, author_user_id, local_date, mood, note)
  values (v_couple_id, v_user_id, v_today, p_mood, v_note)
  on conflict (author_user_id, local_date) do update
    set mood = excluded.mood,
        note = excluded.note,
        updated_at = now()
  returning id into v_id;

  insert into public.relationship_events (
    couple_id, event_type, source_entity_id, actor_user_id, event_date, metadata
  )
  values (
    v_couple_id, 'CHECKIN_CREATED', v_id, v_user_id, v_today,
    jsonb_build_object('mood', p_mood)
  )
  on conflict (event_type, source_entity_id) do update
    set metadata = excluded.metadata,
        event_date = excluded.event_date;

  return v_id;
end;
$$;

create function public.save_checkin(p_mood text, p_note text)
returns uuid
language sql security invoker
set search_path = ''
as $$ select private.save_checkin(p_mood, p_note); $$;

revoke execute on function private.save_checkin(text, text)
  from public, anon, authenticated;
grant execute on function private.save_checkin(text, text) to authenticated;

revoke execute on function public.save_checkin(text, text) from public, anon;
grant execute on function public.save_checkin(text, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.daily_checkins;
    exception when duplicate_object then
      null;
    end;
    begin
      alter publication supabase_realtime add table public.cosmic_objects;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;
