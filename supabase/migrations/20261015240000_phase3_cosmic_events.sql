-- Phase 3 cosmic events: one sky moment per milestone.

create table public.cosmic_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  milestone_id uuid not null unique references public.milestones(id) on delete cascade,
  kind text not null check (kind in ('aurora', 'meteor_shower', 'planet_bloom')),
  event_date date not null,
  created_at timestamptz not null default now()
);

create index cosmic_events_couple_date_idx
  on public.cosmic_events (couple_id, event_date desc);

create function private.cosmic_event_kind(p_kind text, p_key text)
returns text
language sql immutable
set search_path = ''
as $$
  select case
    when p_kind = 'anniversary' then 'aurora'
    when p_kind = 'days' and p_key = '100' then 'meteor_shower'
    when p_kind = 'days' and p_key = '365' then 'planet_bloom'
    else null
  end;
$$;

create function private.refresh_cosmic_events()
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

  insert into public.cosmic_events (couple_id, milestone_id, kind, event_date)
  select
    milestone.couple_id,
    milestone.id,
    private.cosmic_event_kind(milestone.kind, milestone.key),
    milestone.reached_on
  from public.milestones as milestone
  where milestone.couple_id = v_couple_id
    and private.cosmic_event_kind(milestone.kind, milestone.key) is not null
  on conflict (milestone_id) do nothing;
end;
$$;

create function public.refresh_cosmic_events()
returns void language sql security invoker set search_path = ''
as $$ select private.refresh_cosmic_events(); $$;

alter table public.cosmic_events enable row level security;
revoke all on public.cosmic_events from anon, authenticated;
grant select on public.cosmic_events to authenticated;

create policy "members can read cosmic events" on public.cosmic_events
  for select to authenticated using (private.is_couple_member(couple_id));

revoke execute on function private.cosmic_event_kind(text, text) from public, anon, authenticated;
revoke execute on function private.refresh_cosmic_events() from public, anon, authenticated;
grant execute on function private.refresh_cosmic_events() to authenticated;

revoke execute on function public.refresh_cosmic_events() from public, anon;
grant execute on function public.refresh_cosmic_events() to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.cosmic_events;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
