import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const database = new PGlite({ extensions: { pgcrypto } });
const userIds = {
  alex: "00000000-0000-0000-0000-000000000001",
  blair: "00000000-0000-0000-0000-000000000002",
  casey: "00000000-0000-0000-0000-000000000003",
  drew: "00000000-0000-0000-0000-000000000004",
};

async function query(sql, params = []) {
  return (await database.query(sql, params)).rows;
}

async function asUser(userId) {
  await database.exec("set role authenticated;");
  await query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
}

async function asOwner() {
  await database.exec("reset role;");
}

async function rejected(action, label) {
  await assert.rejects(action, undefined, label);
}

try {
  await database.exec(readFileSync("supabase/tests/bootstrap.sql", "utf8"));
  await database.exec(readFileSync("supabase/migrations/20261008000100_phase0_foundation.sql", "utf8"));
  await database.exec(readFileSync("supabase/migrations/20261011145341_phase1_universe_memories.sql", "utf8"));
  await database.exec(readFileSync("supabase/migrations/20261013231000_memory_icons.sql", "utf8"));
  await query("insert into public.profiles (id, display_name) select id, raw_user_meta_data ->> 'display_name' from auth.users");
  await query(
    "insert into auth.users(id, raw_user_meta_data) values ($1, $2::jsonb)",
    ["00000000-0000-0000-0000-000000000008", JSON.stringify({ display_name: "Harper" })],
  );
  assert.equal((await query("select display_name from public.profiles where id = $1", ["00000000-0000-0000-0000-000000000008"]))[0].display_name, "Harper");

  await asUser(userIds.alex);
  const [{ create_couple: coupleA }] = await query(
    "select public.create_couple($1, $2::date, $3, $4)",
    ["Alex and Blair", "2024-01-02", null, "Asia/Bangkok"],
  );
  assert.equal((await query("select count(*)::int as n from public.universes where couple_id = $1", [coupleA]))[0].n, 1);
  await rejected(
    () => query("select public.create_couple($1, $2::date, $3, $4)",
      ["Second couple", "2024-02-03", null, "UTC"]),
    "member cannot create a second couple",
  );
  const [{ create_invitation: invitationA }] = await query(
    "select public.create_invitation($1)", [coupleA],
  );
  assert.match(invitationA.token, /^[0-9a-f]{64}$/);
  assert.equal((await query("select count(*)::int as n from public.couple_invitations where encode(token_hash, 'hex') <> $1", [invitationA.token]))[0].n, 1);

  await asUser(userIds.casey);
  const [{ create_couple: coupleC }] = await query(
    "select public.create_couple($1, $2::date, $3, $4)",
    ["Casey and Drew", "2023-04-05", null, "UTC"],
  );
  assert.equal((await query("select count(*)::int as n from public.couples where id = $1", [coupleA]))[0].n, 0);
  assert.equal((await query("select count(*)::int as n from public.couple_settings where couple_id = $1", [coupleA]))[0].n, 0);
  assert.equal((await query("select count(*)::int as n from public.couple_invitations where couple_id = $1", [coupleA]))[0].n, 0);
  await rejected(
    () => query("select public.update_couple_settings($1, $2, $3::date, $4, $5::date, $6)",
      [coupleA, "Stolen", "2024-01-02", "UTC", null, "Casey"]),
    "other couple cannot change settings",
  );
  await rejected(() => query("select public.accept_invitation($1)", [invitationA.token]), "existing member cannot join another couple");

  const [{ create_invitation: expired }] = await query("select public.create_invitation($1)", [coupleC]);
  await asOwner();
  await query("update public.couple_invitations set expires_at = now() - interval '1 second' where token_hash = extensions.digest($1, 'sha256')", [expired.token]);
  await asUser(userIds.drew);
  await rejected(() => query("select public.accept_invitation($1)", [expired.token]), "expired invitation must fail");

  await asUser(userIds.casey);
  const [{ create_invitation: revoked }] = await query("select public.create_invitation($1)", [coupleC]);
  await query("select public.revoke_invitation($1)", [revoked.id]);
  await asUser(userIds.drew);
  await rejected(() => query("select public.accept_invitation($1)", [revoked.token]), "revoked invitation must fail");
  await rejected(() => query("select public.accept_invitation($1)", ["0".repeat(64)]), "unknown invitation must fail");
  await rejected(() => query("insert into public.couple_members(couple_id, user_id, member_role) values ($1, $2, 'partner')", [coupleC, userIds.drew]), "direct membership insert must fail");

  await asUser(userIds.blair);
  const [{ accept_invitation: joinedCouple }] = await query("select public.accept_invitation($1)", [invitationA.token]);
  assert.equal(joinedCouple, coupleA);
  await rejected(() => query("select public.accept_invitation($1)", [invitationA.token]), "used invitation must fail");
  await query(
    "select public.update_couple_settings($1, $2, $3::date, $4, $5::date, $6)",
    [coupleA, "Our Place", "2024-01-02", "Asia/Bangkok", "2026-12-20", "Blair"],
  );
  await asUser(userIds.alex);
  assert.equal((await query("select name from public.couples where id = $1", [coupleA]))[0].name, "Our Place");
  assert.equal((await query("select count(*)::int as n from public.profiles where id = $1", [userIds.blair]))[0].n, 1);
  assert.equal((await query("select count(*)::int as n from public.couple_members where couple_id = $1", [coupleA]))[0].n, 2);
  await rejected(
    () => query("select public.update_couple_settings($1, $2, $3::date, $4, $5::date, $6)",
      [coupleA, "Should Roll Back", "2024-01-02", "Invalid/Timezone", null, "Alex"]),
    "invalid timezone must roll back settings",
  );
  assert.equal((await query("select name from public.couples where id = $1", [coupleA]))[0].name, "Our Place");
  await rejected(() => query("select public.create_invitation($1)", [coupleA]), "full couple cannot invite");

  // ---- Phase 1: universe and memories ----
  await asUser(userIds.alex);
  const [{ create_memory: memoryWalk }] = await query(
    "select public.create_memory($1, $2, $3::date, $4, $5, $6, $7)",
    [coupleA, "First evening walk", "2024-03-04", "We walked along the river.", "Riverside park", "everyday", 5],
  );
  assert.equal(
    (await query("select title, category, importance from public.memories where id = $1", [memoryWalk]))[0].title,
    "First evening walk",
  );
  assert.equal((await query("select icon from public.memories where id = $1", [memoryWalk]))[0].icon, "coffee");
  await rejected(
    () => query("select public.create_memory($1, $2, $3::date, $4, $5, $6, $7, $8)",
      [coupleA, "Nope", "2024-04-02", null, null, "random", 4, "dragon"]),
    "unknown icon must fail",
  );
  assert.equal(
    (await query(
      "select count(*)::int as n from public.relationship_events where event_type = 'MEMORY_CREATED' and source_entity_id = $1",
      [memoryWalk],
    ))[0].n,
    1,
  );
  const starWalk = (
    await query(
      "select object_type, position_x, position_y, position_z, scale, brightness from public.cosmic_objects where memory_id = $1",
      [memoryWalk],
    )
  )[0];
  assert.equal(starWalk.object_type, "STAR");
  assert.equal(starWalk.brightness, 0.55);
  const radiusWalk = Math.sqrt(
    starWalk.position_x ** 2 + starWalk.position_y ** 2 + starWalk.position_z ** 2,
  );
  assert.ok(radiusWalk >= 46 && radiusWalk <= 80, "star sits inside the orbit band");

  const [{ create_memory: memoryBright }] = await query(
    "select public.create_memory($1, $2, $3::date, $4, $5, $6, $7)",
    [coupleA, "She said yes to the trip", "2025-12-24", null, "Da Lat", "special", 9],
  );
  const starBright = (
    await query("select object_type, brightness from public.cosmic_objects where memory_id = $1", [memoryBright])
  )[0];
  assert.equal(starBright.object_type, "BRIGHT_STAR");
  assert.ok(starBright.brightness > starWalk.brightness, "bright star is brighter");

  await asUser(userIds.blair);
  assert.equal((await query("select count(*)::int as n from public.memories where couple_id = $1", [coupleA]))[0].n, 2);
  assert.equal((await query("select count(*)::int as n from public.cosmic_objects where couple_id = $1", [coupleA]))[0].n, 2);
  await rejected(
    () => query("select public.update_memory($1, $2, $3::date, $4, $5, $6, $7)",
      [memoryWalk, "Changed by partner", "2024-03-04", null, null, "everyday", 5]),
    "partner cannot edit another author's memory",
  );
  await rejected(
    () => query("select public.delete_memory($1)", [memoryWalk]),
    "partner cannot delete another author's memory",
  );

  await asUser(userIds.casey);
  assert.equal((await query("select count(*)::int as n from public.memories where couple_id = $1", [coupleA]))[0].n, 0);
  assert.equal((await query("select count(*)::int as n from public.cosmic_objects where couple_id = $1", [coupleA]))[0].n, 0);
  assert.equal((await query("select count(*)::int as n from public.relationship_events where couple_id = $1", [coupleA]))[0].n, 0);
  await rejected(
    () => query("select public.create_memory($1, $2, $3::date, $4, $5, $6, $7)",
      [coupleA, "Stolen star", "2024-03-04", null, null, "everyday", 5]),
    "outside user cannot create a memory in another couple",
  );
  await rejected(
    () => query("select public.update_memory($1, $2, $3::date, $4, $5, $6, $7)",
      [memoryWalk, "Stolen edit", "2024-03-04", null, null, "everyday", 5]),
    "outside user cannot edit another couple's memory",
  );
  await rejected(
    () => query("select public.delete_memory($1)", [memoryWalk]),
    "outside user cannot delete another couple's memory",
  );

  await asUser(userIds.alex);
  const before = (
    await query(
      "select position_x, position_y, position_z from public.cosmic_objects where memory_id = $1",
      [memoryWalk],
    )
  )[0];
  await query(
    "select public.update_memory($1, $2, $3::date, $4, $5, $6, $7)",
    [memoryWalk, "First evening walk", "2024-03-05", "We walked along the river at dusk.", "Riverside park", "special", 9],
  );
  const after = (
    await query(
      `select o.object_type, o.position_x, o.position_y, o.position_z, m.memory_date, e.event_date
       from public.cosmic_objects o
       join public.memories m on m.id = o.memory_id
       join public.relationship_events e on e.source_entity_id = m.id
       where o.memory_id = $1`,
      [memoryWalk],
    )
  )[0];
  assert.equal(after.object_type, "BRIGHT_STAR");
  assert.equal(after.position_x, before.position_x);
  assert.equal(after.position_y, before.position_y);
  assert.equal(after.position_z, before.position_z);
  assert.equal(new Date(after.memory_date).toISOString().slice(0, 10), "2024-03-05");
  assert.equal(new Date(after.event_date).toISOString().slice(0, 10), "2024-03-05");
  assert.equal((await query("select icon from public.memories where id = $1", [memoryWalk]))[0].icon, "coffee");
  await query(
    "select public.update_memory($1, $2, $3::date, $4, $5, $6, $7, $8)",
    [memoryWalk, "First evening walk", "2024-03-05", "We walked along the river at dusk.", "Riverside park", "special", 9, "heart"],
  );
  assert.equal((await query("select icon from public.memories where id = $1", [memoryWalk]))[0].icon, "heart");

  await rejected(
    () => query("select public.create_memory($1, $2, $3::date, $4, $5, $6, $7)",
      [coupleA, "", "2024-03-04", null, null, "everyday", 5]),
    "empty title rejected",
  );
  await rejected(
    () => query("select public.create_memory($1, $2, $3::date, $4, $5, $6, $7)",
      [coupleA, "Bad category", "2024-03-04", null, null, "nonsense", 5]),
    "unknown category rejected",
  );
  await rejected(
    () => query("select public.create_memory($1, $2, $3::date, $4, $5, $6, $7)",
      [coupleA, "Too important", "2024-03-04", null, null, "everyday", 11]),
    "importance above 10 rejected",
  );
  await rejected(
    () => query("select public.create_memory($1, $2, $3::date, $4, $5, $6, $7)",
      [coupleA, "Bad date", null, null, null, "everyday", 5]),
    "missing date rejected",
  );
  assert.equal((await query("select count(*)::int as n from public.memories where couple_id = $1", [coupleA]))[0].n, 2);

  await rejected(
    () => query(
      "insert into public.memories (couple_id, author_user_id, title, memory_date) values ($1, $2, 'Direct', '2024-01-01')",
      [coupleA, userIds.alex],
    ),
    "direct memory insert must fail",
  );
  await rejected(
    () => query(
      "insert into public.relationship_events (couple_id, event_type, source_entity_id, actor_user_id, event_date) values ($1, 'MEMORY_CREATED', $2, $3, '2024-01-01')",
      [coupleA, "00000000-0000-0000-0000-0000000000aa", userIds.alex],
    ),
    "direct relationship event insert must fail",
  );
  await rejected(
    () => query(
      `insert into public.cosmic_objects
         (couple_id, relationship_event_id, memory_id, object_type,
          position_x, position_y, position_z, scale, brightness, rotation, visual_seed)
       select couple_id, id, $2, 'STAR', 0, 0, 0, 1, 0.5, 0, 1
       from public.relationship_events where source_entity_id = $2`,
      [coupleA, memoryWalk],
    ),
    "direct cosmic object insert must fail",
  );

  await query("select public.delete_memory($1)", [memoryBright]);
  assert.equal((await query("select count(*)::int as n from public.memories where id = $1", [memoryBright]))[0].n, 0);
  assert.equal(
    (await query("select count(*)::int as n from public.relationship_events where source_entity_id = $1", [memoryBright]))[0].n,
    0,
  );
  assert.equal((await query("select count(*)::int as n from public.cosmic_objects where memory_id = $1", [memoryBright]))[0].n, 0);
  assert.equal((await query("select count(*)::int as n from public.cosmic_objects where memory_id = $1", [memoryWalk]))[0].n, 1);

  await asOwner();
  assert.equal(
    (await query("select has_table_privilege('anon', 'public.memories', 'SELECT')"))[0].has_table_privilege,
    false,
  );
  assert.equal(
    (await query("select has_table_privilege('anon', 'public.cosmic_objects', 'SELECT')"))[0].has_table_privilege,
    false,
  );
  assert.equal(
    (await query(
      "select has_function_privilege('anon', 'public.create_memory(uuid, text, date, text, text, text, smallint, text)', 'EXECUTE')",
    ))[0].has_function_privilege,
    false,
  );
  assert.equal(
    (await query("select has_table_privilege('authenticated', 'public.memories', 'INSERT')"))[0].has_table_privilege,
    false,
  );

  console.log("Phase 0 and Phase 1 PGlite checks passed.");
} finally {
  await database.close();
}
