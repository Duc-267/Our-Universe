-- Phase 4 archivist: one factual summary of records the couple already kept.

create table public.archive_summaries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null unique references public.couples(id) on delete cascade,
  body text not null,
  memory_count integer not null,
  checkin_count integer not null,
  same_moment_count integer not null,
  trip_count integer not null,
  quest_count integer not null,
  milestone_count integer not null,
  constellation_count integer not null,
  dream_count integer not null,
  top_category text,
  refreshed_at timestamptz not null default now()
);

create function private.archive_count_phrase(p_count integer, p_singular text, p_plural text)
returns text
language sql immutable
set search_path = ''
as $$
  select p_count::text || ' ' || case when p_count = 1 then p_singular else p_plural end;
$$;

create function private.refresh_archive()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_memory_count integer;
  v_checkin_count integer;
  v_same_moment_count integer;
  v_trip_count integer;
  v_quest_count integer;
  v_milestone_count integer;
  v_constellation_count integer;
  v_dream_count integer;
  v_top text;
  v_titles text;
  v_body text;
begin
  if v_user_id is null then
    raise exception 'not_couple_member';
  end if;
  select couple_id into v_couple_id from public.couple_members where user_id = v_user_id;
  if not found or not private.is_couple_member(v_couple_id) then
    raise exception 'not_couple_member';
  end if;

  select count(*)::integer into v_memory_count from public.memories where couple_id = v_couple_id;
  select count(*)::integer into v_checkin_count from public.daily_checkins where couple_id = v_couple_id;
  select count(*)::integer into v_same_moment_count from public.same_moments
    where couple_id = v_couple_id and status = 'complete';
  select count(*)::integer into v_trip_count from public.trips where couple_id = v_couple_id;
  select count(*)::integer into v_quest_count from public.quests
    where couple_id = v_couple_id and status = 'complete';
  select count(*)::integer into v_milestone_count from public.milestones where couple_id = v_couple_id;
  select count(*)::integer into v_constellation_count from public.constellations where couple_id = v_couple_id;
  select count(*)::integer into v_dream_count from public.future_dreams where couple_id = v_couple_id;

  select category into v_top
  from public.memories
  where couple_id = v_couple_id
  group by category
  order by count(*) desc, category asc
  limit 1;

  select pg_catalog.string_agg(recent.title, ', ' order by recent.memory_date desc, recent.created_at desc)
  into v_titles
  from (
    select title, memory_date, created_at
    from public.memories
    where couple_id = v_couple_id
    order by memory_date desc, created_at desc
    limit 3
  ) recent;

  if v_memory_count = 0 and v_checkin_count = 0 and v_same_moment_count = 0
    and v_trip_count = 0 and v_quest_count = 0 and v_milestone_count = 0
    and v_constellation_count = 0 and v_dream_count = 0 then
    v_body := 'Nothing is written in this archive yet.';
  else
    v_body := 'This archive holds ' || private.archive_count_phrase(v_memory_count, 'memory', 'memories') || '.';
    if v_top is not null then
      v_body := v_body || ' The category recorded most often is ' || v_top || '.';
    end if;
    if coalesce(v_titles, '') <> '' then
      v_body := v_body || ' Moments kept here include ' || v_titles || '.';
    end if;
    v_body := v_body || ' Also recorded: '
      || private.archive_count_phrase(v_checkin_count, 'check-in', 'check-ins') || ', '
      || private.archive_count_phrase(v_same_moment_count, 'Same Moment', 'Same Moments') || ', '
      || private.archive_count_phrase(v_trip_count, 'trip', 'trips') || ', '
      || private.archive_count_phrase(v_quest_count, 'completed quest', 'completed quests') || ', '
      || private.archive_count_phrase(v_milestone_count, 'milestone', 'milestones') || ', '
      || private.archive_count_phrase(v_constellation_count, 'constellation', 'constellations') || ', and '
      || private.archive_count_phrase(v_dream_count, 'dream', 'dreams') || '.';
  end if;

  insert into public.archive_summaries (
    couple_id, body, memory_count, checkin_count, same_moment_count, trip_count,
    quest_count, milestone_count, constellation_count, dream_count, top_category, refreshed_at
  )
  values (
    v_couple_id, v_body, v_memory_count, v_checkin_count, v_same_moment_count, v_trip_count,
    v_quest_count, v_milestone_count, v_constellation_count, v_dream_count, v_top, now()
  )
  on conflict (couple_id) do update
  set body = excluded.body,
      memory_count = excluded.memory_count,
      checkin_count = excluded.checkin_count,
      same_moment_count = excluded.same_moment_count,
      trip_count = excluded.trip_count,
      quest_count = excluded.quest_count,
      milestone_count = excluded.milestone_count,
      constellation_count = excluded.constellation_count,
      dream_count = excluded.dream_count,
      top_category = excluded.top_category,
      refreshed_at = now();
end;
$$;

create function public.refresh_archive()
returns void language sql security invoker set search_path = ''
as $$ select private.refresh_archive(); $$;

alter table public.archive_summaries enable row level security;
revoke all on public.archive_summaries from anon, authenticated;
grant select on public.archive_summaries to authenticated;

create policy "members can read archive summaries" on public.archive_summaries
  for select to authenticated using (private.is_couple_member(couple_id));

revoke execute on function private.archive_count_phrase(integer, text, text) from public, anon, authenticated;
revoke execute on function private.refresh_archive() from public, anon, authenticated;
grant execute on function private.refresh_archive() to authenticated;

revoke execute on function public.refresh_archive() from public, anon;
grant execute on function public.refresh_archive() to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.archive_summaries;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
