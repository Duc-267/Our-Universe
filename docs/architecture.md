# Architecture Notes

## Layers
- Dependency direction: requirements/docs -> skill scripts -> hook/CI entrypoints.
- Forbidden reverse dependencies: skill scripts must not modify docs or git state; hooks and CI only orchestrate checks.

### Application (Phase 0)
- Browser UI -> Next.js App Router routes and server actions -> Supabase Auth/PostgreSQL. The browser may use only the public Supabase key and user-scoped access; it never receives a service-role key.
- PostgreSQL constraints and Row Level Security (RLS) are the final authorization boundary for couple data. UI route guards improve navigation but do not grant access.
- Server-only invitation operations call narrowly scoped database functions. Invitation acceptance and membership changes happen in one database transaction.
- Phase 1's 3D universe and photo pipeline attach to this foundation later; they do not determine Phase 0's authentication or membership rules.

### Application (Phase 1)
- `/universe` renders a dependency-free canvas scene: a rose-gold nebula, a central planet with a tilted ring, a decorative background starfield, and one persistent star per memory. Memory stars take their hue from category. Stars are projected with a lightweight 3D rotation and stay at the position stored at creation time. Later object types (moons, comets, twin stars, constellation lines) should be extra draw passes on the same projector.
- Memory writes go through `private.create_memory`, `private.update_memory`, and `private.delete_memory`. Creation inserts the memory, its `MEMORY_CREATED` relationship event, and its star in one transaction. Updates are author-only and refresh the star's type, scale, and brightness when importance changes; they never move the star. Deletion removes the event and star with the memory.
- The first Universe Engine rule maps importance to visuals: importance >= 8 renders `BRIGHT_STAR` with higher brightness and scale; other memories render `STAR`.
- The scene supports pointer, touch, and keyboard camera controls, and the page keeps a semantic, keyboard-operable star list and native detail dialog for accessibility. `prefers-reduced-motion` disables idle drift and twinkle.
- Relationship age and the next-anniversary countdown derive from the couple's relationship start date interpreted in the configured IANA timezone.
- Memory photos are resized in the browser and stored in the private `universe-media` bucket. The canvas never loads them. Lists and memory detail use signed thumbnail URLs; the optimized image is signed only when someone opens it.
- A secret capsule's title, message, and image path live in `capsule_contents`. RLS shows that row to the creator and, after opening, to both members. The partner can still see the capsule row and its `COMET` before then.

### Application (Phase 2)
- A daily check-in is one row per member per local date. `private.save_checkin` computes that date from `now()` in the couple timezone and upserts the mood and optional note. Both of today's moods tint the canvas and choose the duck's pose. One mood uses that pose. Two different moods alternate, and their tints stack. No check-in leaves a curious, unhurried duck. The pose is not a relationship score.
- `/universe` subscribes to Supabase realtime changes on `cosmic_objects`, `daily_checkins`, `capsules`, `memory_photos`, `same_moments`, `same_moment_submissions`, and `milestones` for the couple and refreshes the server render. A failed subscription still leaves the saved rows visible after reload. A star that appears after the first paint, including one opened with `?star=`, plays a short birth ring unless reduced motion is requested.
- A Same Moment is one open invitation per couple, with a two-hour window and a blind flag. Submissions stay unread by the partner until that partner submits when blind mode is on. The second submission creates one relationship event and two `TWIN_STAR` objects. The open invitation on `/universe` is the notification.

### Application (Phase 3 — moons and milestones)
- `private.refresh_milestones` runs on `/universe` load. It reads `relationship_start_date` and the couple timezone, then inserts missing `milestones` rows for each completed calendar anniversary and for 100 / 365 days together. Anniversary rows also create one `MOON` cosmic object and an `ANNIVERSARY_REACHED` event. Day rows create a `MILESTONE_REACHED` event only. Unique `(couple_id, kind, key)` and one-moon-per-milestone indexes keep refreshes idempotent.
- Anniversary dates clamp short months the same way as `src/features/couple/age.ts` (Feb 29 becomes Feb 28 in non-leap years). Moon positions are deterministic from the milestone id and anniversary number and are drawn as an extra canvas pass.

### Application (Phase 3 — quests)
- A couple may have one open `quests` row at a time. Publishing copies a fixed catalog entry (title, instructions, response type, reward kind) and a 48-hour expiry. Each member submits once through `private.submit_quest`; photo responses reuse the private media bucket under `<couple>/quests/...`.
- Both submissions complete the quest, write `QUEST_COMPLETED`, and create one `QUEST_REWARD` cosmic object whose `metadata.reward_kind` is fragment, asteroid, flower, nebula, or special star. Expiry with fewer than two submissions marks the quest incomplete and creates no reward. `/universe` calls `refresh_quests` and draws rewards as an extra canvas pass.

### Application (Phase 3 — trips)
- `trips` store destination, start/end dates, optional note, and a `significant` flag. `trip_memories` links existing couple memories (and therefore their photos) to a trip. Marking significant runs `private.sync_trip_planet`, which upserts a `TRIP_PLANET` event and one `PLANET` cosmic object; unmarking removes both. Planets are drawn as an extra canvas pass and open trip detail.

### Application (Phase 3 — constellations)
- `constellations` name a group of existing memory stars; `constellation_members` requires at least two memories from the same couple. There is no new cosmic object type — the canvas draws soft closed lines through the member stars' stored positions and opens the collection detail on select. Deleting a memory cascades the membership row away.

### Application (Phase 3 — memory gravity)
- `private.refresh_memory_gravity` runs on `/universe` load and writes a 0–100 `gravity` score onto each memory star. The score is manual importance times 6, plus 6 per photo and per constellation or trip link, each capped at four. It does not rewrite the memory row and does not move the stored orbit. The canvas uses the score only to scale and fade the sticker.

### Application (Phase 3 — cosmic events)
- `private.refresh_cosmic_events` inserts one `cosmic_events` row per milestone. Anniversaries are an aurora, 100 days a meteor shower, and 365 days a planet bloom. The unique milestone key makes a second refresh a no-op. The canvas plays that sky only when the couple's local today matches `event_date`.

### Application (Phase 3 — future dreams)
- `future_dreams` stores a title, optional description, optional target date, a memory category, and status `dream`, `planned`, or `completed`. Creating one writes `DREAM_RECORDED` and a single `DISTANT_OBJECT` placed beyond the memory-star band. Planning keeps that same object.
- Marking it completed calls `private.create_memory` (importance 5) and deletes the dream event, so the distant object leaves and a normal star remains. The dream row stays and points at `memory_id`. A completed dream cannot be edited or deleted. Open dreams can be deleted, which removes the distant object.

## Core modules
- `scripts/run-skills.sh`: reads `skills/enabled.txt`, executes each skill script, and aggregates failures into a single exit code.
- `skills/*/*.sh`: small, composable validation units for requirements presence, architecture quality, and DoD completeness.

### Application (Phase 0)
- `src/app/`: Next.js routes and layouts. Initial routes will cover sign-in/sign-up, couple creation, invitation acceptance, and an empty `/universe` state.
- `src/lib/supabase/`: server and browser Supabase client factories. Server code reads the authenticated user from the verified session; client code has no privileged database credentials.
- `src/features/couple/`: validation and application logic for couple settings, membership, and invitations. Database constraints/functions remain authoritative when two requests race.
- `supabase/migrations/`: versioned schema, indexes, RLS policies, and transactional invitation functions. Migrations are the reproducible source of truth for database setup.
- `scripts/test-db-pglite.mjs`: an in-memory migration and authorization check runnable on Windows without a container. CI also runs the PostgreSQL 17 integration suite in `scripts/test-db.sh` to test independent concurrent transactions.

### Application (Phase 1)
- `src/components/universe-scene.tsx`: canvas renderer with 3D projection, pointer/touch/wheel/keyboard camera controls, and hit-tested star selection.
- `src/components/universe-view.tsx`: universe toolbar with relationship age, empty state, semantic star list, and the memory detail dialog with author-only edit and delete.
- `src/features/memory/`: server actions and validation for creating, updating, and deleting memories through the private database functions.
- `src/features/couple/age.ts`: timezone-correct relationship age and anniversary countdown.
- `supabase/tests/phase1.sql`: PostgreSQL 17 checks for memory ownership, cross-couple privacy, and star consistency, running in CI after the Phase 0 suite.

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
- Memories, relationship events, and cosmic objects are couple-scoped with RLS select policies for active members. Authenticated clients hold no INSERT, UPDATE, or DELETE grants on them: every write goes through private security-definer functions that re-check membership and authorship inside the transaction.
- `cosmic_objects.memory_id` is the Phase 1 star-to-memory reference, and a partial unique index enforces exactly one star per memory. Deleting a memory removes its star through the cascade and its relationship event in the same function call.
- Data API exposure needs no dashboard step: tables created by migrations in the `public` schema are served by the Data API, verified on 2026-10-12 through the 42501-versus-PGRST205 response contrast against the live project (see `docs/deployment.md`).

## Decision records
- 2026-07-13: Enforce stage-aware quality gates. `pre-push`/`pr-check` now require at least one non-template requirement and no unchecked DoD items in real requirement docs.
- 2026-10-08: Use a root-level Next.js App Router application with TypeScript for Our Universe. Its first implementation follows `docs/requirements/phase-0-foundation.md`; the repo's POSIX harness remains the validation entrypoint.
- 2026-10-08: Use Supabase Auth and PostgreSQL with RLS for Phase 0. Membership, invite capacity, and cross-couple access must be enforced in the database, including concurrent requests.
- 2026-10-08: Defer React Three Fiber, realtime, and Cloudflare R2 integration until the Phase 1 requirements that need them. The empty universe is represented by a persistent universe record from couple creation.
- 2026-10-08: Keep invitation tokens in URL fragments while opening the join page and in tab session storage during sign-in. The database stores only a SHA-256 digest, and redemption locks both the invitation and couple rows before adding a member.
- 2026-10-09: Keep the Supabase Free plan's default confirmation email and distinguish a failed cross-browser PKCE sign-in from an expired link. Template editing requires custom SMTP or a paid plan, so automatic cross-browser sign-in is deferred until an editable `token_hash` template is available.
- 2026-10-12: Render the Phase 1 universe with a dependency-free 2D-canvas component using a 3D projection instead of React Three Fiber. This keeps the first renderer light enough for supported mobile browsers as the Phase 1 requirement demands; React Three Fiber remains the planned path when Phase 3 adds planets, moons, and constellations.
- 2026-10-12: Derive star positions deterministically from a SHA-256 digest of the memory id at creation and store them on the cosmic object. Updates may change a star's type, scale, and brightness but never its position, so stars stay consistent between sessions.
- 2026-10-12: Map memory importance to the first Universe Engine rule: importance >= 8 becomes a `BRIGHT_STAR` with brightness 0.85 and a larger scale; otherwise a `STAR` with brightness 0.55.
- 2026-10-12: Keep memory creation, update, and deletion in private schema functions so the memory, its relationship event, and its star stay consistent in one transaction; direct table writes stay revoked from authenticated clients.
- 2026-10-13: Enrich the Phase 1 sky on the existing canvas projector — painted nebula, a depth-split ring, and category hues — instead of adopting React Three Fiber now. The projector, hit testing, and reduced-motion behavior stay shared so later cosmic objects can be new draw passes. React Three Fiber remains the path when moons, trip planets, or constellation geometry need real meshes.
- 2026-10-13: Each memory star is drawn as a chosen icon, stored on `memories.icon`. Omitting the icon uses the category default. The allow-list lives in the database check and in `private.resolve_memory_icon`, so a client cannot invent a glyph.
- 2026-10-13: Daily check-ins are couple-scoped rows with the calendar day decided in the database. Emotional weather reads both of today's moods. Realtime is a refresh signal, not a second source of truth.
- 2026-10-14: A Same Moment stores its window and blind flag on the invitation, and its photo and caption on a submission row. Blind mode is a storage and row-security rule, not a hidden field in the client. Two twin stars are created only when both submissions exist.
- 2026-10-14: The central figure is a flat rubber-duck SVG sitting on the canvas center, not a 3D mesh. Both of today's moods choose its pose. A new star makes it hop; a check-in lifts a heart. Reduced motion keeps it still. React Three Fiber stays deferred.
- 2026-10-14: One storybook style covers the whole app (`docs/requirements/universe-visual-refresh.md`): a flat night sky with clouds and a moon on the canvas, each memory drawn as its own chosen icon as an outlined sticker in its category color from `src/features/memory/palette.ts`, chunky outlined buttons, and Fredoka/Nunito loaded through `next/font`. Visuals are drawn in code rather than generated images so they stay crisp, themeable by mood, and free of extra assets. The scene uses two canvases around the duck: objects farther than the duck draw on the back canvas, nearer ones and labels on a pointer-transparent front canvas, so stars pass both behind and in front of it.
- 2026-10-14: Treat `main` as the sole integration and release branch. Every phase and repository change starts on a dedicated branch and reaches `main` through a pull request after local validation and required CI pass; direct feature commits and local feature merges into `main` are not part of the delivery flow.
- 2026-10-14: Store Phase 1 photos and capsule images in private Supabase Storage instead of Cloudflare R2. One bucket keeps media authorization in PostgreSQL RLS beside the couple data. The browser resizes uploads and sends only the optimized image and thumbnail; hidden capsule content stays in `capsule_contents`, not in the visible capsule row.
- 2026-10-15: Phase 3 moons and day milestones stay on the canvas projector. A `milestones` table owns anniversary and day keys; moons are cosmic objects keyed by `milestone_id`. React Three Fiber remains deferred.
- 2026-10-15: Couple quests use a fixed catalog in PostgreSQL and TypeScript, one open quest per couple, and a single `QUEST_REWARD` object type with `reward_kind` metadata so the canvas can vary shape without new object-type churn.
- 2026-10-15: Significant trips become `PLANET` objects keyed by `trip_id`. Trip photos in this slice are the linked memories' photos rather than a separate upload path, keeping Storage rules unchanged.
- 2026-10-15: Constellations are membership overlays on existing stars, not new cosmic objects. Lines are an extra canvas pass; React Three Fiber stays deferred.
- 2026-10-18: Memory gravity is a derived score on the existing star. It changes draw size and opacity and leaves the memory row and stored orbit untouched.
- 2026-10-18: Cosmic events are one sky per milestone. The flourish draws on the existing canvas only on the event date, so a refresh cannot schedule the same anniversary twice.
- 2026-10-18: A future dream is a `DISTANT_OBJECT` until the couple marks it completed. Completion writes a real memory star and removes the distant object, so the hope does not stay in the sky beside the memory.
