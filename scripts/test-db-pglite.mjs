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

  console.log("Phase 0 PGlite checks passed.");
} finally {
  await database.close();
}
