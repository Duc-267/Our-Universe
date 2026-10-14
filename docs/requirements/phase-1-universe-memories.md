# Feature: Phase 1 — Universe and memories

## Goal

Let both members of a private couple create, explore, and maintain memory stars in their shared universe. This delivers Epics 1.1–1.4 and 1.8 from `SPEC.md`. Photo upload and Secret Capsules remain separate follow-up requirements because they need an object-storage integration and their own access model.

## Definition of Done

- [x] A couple member lands on `/universe` after authentication and can see a central planet, decorative background stars, the persisted memory stars, and a usable empty state.
- [x] The universe works with pointer, keyboard, and touch controls: users can select a cosmic object and adjust the view scale without losing access to the primary actions on desktop or mobile.
- [x] A member can create a memory with a title, calendar date, optional description, optional location, category, and importance. Server validation rejects invalid values.
- [x] Creating a memory atomically creates its relationship event and exactly one persistent star with a stable position, size, brightness, and memory reference.
- [x] Both couple members can view every memory and its star; users outside the couple cannot access either by guessed IDs or direct data API calls.
- [x] Selecting a star opens detail with title, date, description, location, category, importance, and author. An author can edit or delete only their own memory.
- [x] Deleting a memory removes its related event and star from the universe.
- [x] Relationship age is calculated from the couple relationship-start date in the configured IANA timezone.
- [x] Schema, RLS policies, and database functions are versioned in a new repository migration and have automated checks for ownership, cross-couple privacy, and star consistency.
- [x] Lint, typecheck, database checks, production build, and repository skill loop pass locally; CI passes on the pull request.

## Acceptance scenarios

1. **Empty universe:** A signed-in couple member opens `/universe` and sees the planet, an accessible empty-state message, and a clear way to add the first memory.
2. **New star:** A member saves an important memory. The server creates a private memory and one bright, stable star; both members see it after refresh.
3. **Explore:** A member selects a star from the scene or keyboard list, reads its detail, then closes the detail and returns to the universe.
4. **Ownership:** The memory author changes or deletes the memory. Their partner sees the persisted change; a third user cannot edit or read it.
5. **Timezone:** Relationship age uses the couple's configured timezone around date boundaries.

## Constraints

- Build on the Phase 0 membership/RLS model. Every couple-scoped query and mutation must be authorized in PostgreSQL, not just in UI route guards.
- Keep the first universe renderer light enough for supported mobile browsers; preserve a semantic, keyboard-operable object list for accessibility.
- Memory dates are calendar dates. Event timestamps are stored as UTC instants. Do not put raw user photo URLs or object-storage credentials in this scope.
- Use only public Supabase client credentials in browser code. Privileged database logic stays in the private schema with explicit grants.
- Follow `AGENTS.md`: requirement first, architecture decision recorded, skill loop, PR, and CI.

## Out of scope

- Photo upload and Secret Capsules are delivered by `docs/requirements/phase-1-photos-capsules.md`.
- Realtime, star-birth animation, Same Moment, quests, trips, constellations, AI summaries, and public sharing.
