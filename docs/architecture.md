# Architecture Notes

## Layers
- Dependency direction: requirements/docs -> skill scripts -> hook/CI entrypoints.
- Forbidden reverse dependencies: skill scripts must not modify docs or git state; hooks and CI only orchestrate checks.

### Application (Phase 0)
- Browser UI -> Next.js App Router routes and server actions -> Supabase Auth/PostgreSQL. The browser may use only the public Supabase key and user-scoped access; it never receives a service-role key.
- PostgreSQL constraints and Row Level Security (RLS) are the final authorization boundary for couple data. UI route guards improve navigation but do not grant access.
- Server-only invitation operations call narrowly scoped database functions. Invitation acceptance and membership changes happen in one database transaction.
- Phase 1's 3D universe and photo pipeline attach to this foundation later; they do not determine Phase 0's authentication or membership rules.

## Core modules
- `scripts/run-skills.sh`: reads `skills/enabled.txt`, executes each skill script, and aggregates failures into a single exit code.
- `skills/*/*.sh`: small, composable validation units for requirements presence, architecture quality, and DoD completeness.

### Application (Phase 0)
- `src/app/`: Next.js routes and layouts. Initial routes will cover sign-in/sign-up, couple creation, invitation acceptance, and an empty `/universe` state.
- `src/lib/supabase/`: server and browser Supabase client factories. Server code reads the authenticated user from the verified session; client code has no privileged database credentials.
- `src/features/couple/`: validation and application logic for couple settings, membership, and invitations. Database constraints/functions remain authoritative when two requests race.
- `supabase/migrations/`: versioned schema, indexes, RLS policies, and transactional invitation functions. Migrations are the reproducible source of truth for database setup.
- `scripts/test-db-pglite.mjs`: an in-memory migration and authorization check runnable on Windows without a container. CI also runs the PostgreSQL 17 integration suite in `scripts/test-db.sh` to test independent concurrent transactions.

### Data and security decisions
- Supabase Auth owns email/password credentials and sessions. Next.js receives the session through cookies using the supported SSR integration; private routes revalidate the user on the server.
- The default Supabase confirmation email verifies the address before redirecting to the app. SSR PKCE session exchange succeeds only when the callback has the verifier cookie from sign-up; a callback in another browser offers password sign-in after confirmation. A custom `token_hash` link can support cross-browser session creation when editable email templates become available.
- `couples` owns the name and relationship start date. `couple_members` links authenticated users to couples. A database uniqueness constraint permits at most one active couple per user; a transaction with a locked couple row enforces the two-active-member maximum.
- `universes` has one row per couple from creation, even with no cosmic objects. Phase 0 renders this as an empty state; later phases add `relationship_events` and `cosmic_objects`.
- `couple_settings` stores the IANA timezone and optional next-meeting date. Relationship start date is a calendar date in that timezone; event timestamps are stored as UTC instants and converted for display.
- `profiles` stores user-facing display name and optional avatar reference. Every couple-scoped table carries `couple_id` or joins to a table that does, and RLS checks active membership for reads and permitted writes.
- `couple_invitations` stores a hash of a cryptographically random, single-use token, couple ID, creator, expiration, and redemption/revocation timestamps. A server-side redemption path checks the hash and expiry and adds the member atomically. Raw tokens appear only in the invitation link and are never logged.
- Couple and profile settings exposed in one form are saved by one database function, so a failed update rolls back every field in that submission.
- Media storage is deferred until Phase 1. The proposed image store is Cloudflare R2 as stated in `SPEC.md`; no bucket or public image access is required for Phase 0. A later architecture decision will record the final upload and access pattern before implementing photos.
- Vercel is the intended Next.js deployment target. Supabase remains the authentication and primary data provider. This does not require Vercel-specific storage or auth products.

## Decision records
- 2026-07-13: Enforce stage-aware quality gates. `pre-push`/`pr-check` now require at least one non-template requirement and no unchecked DoD items in real requirement docs.
- 2026-10-08: Use a root-level Next.js App Router application with TypeScript for Our Universe. Its first implementation follows `docs/requirements/phase-0-foundation.md`; the repo's POSIX harness remains the validation entrypoint.
- 2026-10-08: Use Supabase Auth and PostgreSQL with RLS for Phase 0. Membership, invite capacity, and cross-couple access must be enforced in the database, including concurrent requests.
- 2026-10-08: Defer React Three Fiber, realtime, and Cloudflare R2 integration until the Phase 1 requirements that need them. The empty universe is represented by a persistent universe record from couple creation.
- 2026-10-08: Keep invitation tokens in URL fragments while opening the join page and in tab session storage during sign-in. The database stores only a SHA-256 digest, and redemption locks both the invitation and couple rows before adding a member.
- 2026-10-09: Keep the Supabase Free plan's default confirmation email and distinguish a failed cross-browser PKCE sign-in from an expired link. Template editing requires custom SMTP or a paid plan, so automatic cross-browser sign-in is deferred until an editable `token_hash` template is available.
