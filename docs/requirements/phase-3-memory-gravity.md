# Feature: Phase 3 — Memory gravity

## Goal

Deliver Epic 3.7 from `SPEC.md`: derive an importance score from signals already stored for a memory, and let that score make the star more prominent. The original memory row stays unchanged. Cosmic events and future dreams stay later.

## Definition of Done

- [x] `refresh_memory_gravity` writes a 0–100 gravity score onto each of the couple's memory stars. The score is `importance * 6`, plus 6 for each attached photo up to 4, plus 6 for each constellation or trip link up to 4, capped at 100.
- [x] Refresh does not change the memory's title, description, importance, date, or category, and it does not move the star.
- [x] `/universe` refreshes gravity on load. Higher gravity draws the star larger and brighter. The memory card shows the score.
- [x] A member of another couple cannot change this couple's gravity scores.
- [x] Migration and database checks cover the score, content stability, fixed orbit, and privacy.
- [x] `docs/architecture.md` records gravity as a derived star score, not a rewrite of the memory.
- [x] Lint, typecheck, database checks, production build, and the repository skill loop pass locally; CI passes on the pull request into `main`.

## Acceptance scenarios

1. **Importance:** A memory marked 9 scores higher than a memory marked 4 with no photos or links.
2. **Signals:** Adding a photo, or linking the memory into a constellation, raises that star's score by 6 and leaves the memory text alone.
3. **Orbit:** Refreshing gravity keeps the stored star position.
4. **Privacy:** Another couple's refresh does not change these scores.

## Constraints

- Keep the canvas projector. Gravity changes draw size and opacity; it does not create a new cosmic object type. No React Three Fiber.
- Views and reactions are not collected yet, so they are not part of this score.
- Follow `AGENTS.md`: dedicated branch, requirement first, architecture note, skill loop, PR into `main`, green CI.

## Out of scope

- View counts, reactions, orbit migration, cosmic event flourishes, and future dreams.
