#!/usr/bin/env bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261008000100_phase0_foundation.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261011145341_phase1_universe_memories.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261013231000_memory_icons.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261013233000_phase2_checkins.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261014140000_phase1_photos_capsules.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261014153000_phase2_same_moment.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261015120000_phase3_moons_milestones.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261015200000_phase3_quests.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261015210000_phase3_trips.sql
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261015220000_phase3_constellations.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/phase0.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/phase1.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/phase2.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/phase1-media.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/phase2-same-moment.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/phase3-moons-milestones.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/phase3-quests.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/phase3-trips.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/phase3-constellations.sql

mapfile -t tokens < <(psql -At -v ON_ERROR_STOP=1 -c 'select token from test.race_tokens order by n')
test "${#tokens[@]}" -eq 2

first_log=$(mktemp)
second_log=$(mktemp)
trap 'rm -f "$first_log" "$second_log"' EXIT

psql -v ON_ERROR_STOP=1 -v user_id=00000000-0000-0000-0000-000000000006 \
  -v race_invite="${tokens[0]}" -f supabase/tests/accept-race.sql >"$first_log" 2>&1 &
first_pid=$!
psql -v ON_ERROR_STOP=1 -v user_id=00000000-0000-0000-0000-000000000007 \
  -v race_invite="${tokens[1]}" -f supabase/tests/accept-race.sql >"$second_log" 2>&1 &
second_pid=$!

first_status=0
second_status=0
wait "$first_pid" || first_status=$?
wait "$second_pid" || second_status=$?
if [ "$first_status" -eq "$second_status" ]; then
  cat "$first_log" "$second_log"
  echo 'Expected exactly one concurrent invitation acceptance to succeed.' >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 -c "select test.assert_true(
  (select count(*) = 2 from public.couple_members where couple_id =
    (select couple_id from public.couple_members where user_id = '00000000-0000-0000-0000-000000000005')),
  'concurrent acceptance kept two-member limit'
)"
echo 'Phase 0 and Phase 1 database checks passed.'
