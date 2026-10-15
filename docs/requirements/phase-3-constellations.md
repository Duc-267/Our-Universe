# Feature: Phase 3 — Constellations

## Goal

Deliver Epic 3.6 from `SPEC.md`: group related memory stars into named constellations with connecting lines on the canvas. Automatic grouping and AI name suggestions stay later.

## Definition of Done

- [x] A member can create a constellation with a name (1–80 characters), an optional note of at most 500 characters, and at least two existing couple memories.
- [x] Either member can rename, update the note, add or remove member memories (always keeping at least two), and delete a constellation.
- [x] `/universe` lists constellations, draws soft lines between each constellation's member stars on the canvas projector, and opens the collection detail when a constellation or its list row is selected.
- [x] Cross-couple access to constellations and membership is denied. Deleting a memory removes it from any constellation.
- [x] Migration, RLS, and database checks cover member count rules, privacy, and cascade cleanup.
- [x] `docs/architecture.md` records constellations as canvas line overlays (no new cosmic object type).
- [x] Lint, typecheck, database checks, production build, and the repository skill loop pass locally; CI passes on the pull request into `main`.

## Acceptance scenarios

1. **Create:** Alex creates "Late Night Calls" with three memories. Lines connect those stars; opening the constellation lists the memories.
2. **Edit:** Removing members down to one is rejected; deleting the constellation clears the lines.
3. **Privacy:** A user from another couple cannot read the constellation or its members.

## Constraints

- Keep the canvas projector; constellation lines are an extra draw pass over existing star positions. No React Three Fiber.
- Constellations do not create a new `cosmic_objects` row — they reference existing memory stars.
- Follow `AGENTS.md`: dedicated branch, requirement first, architecture note, skill loop, PR into `main`, green CI.

## Out of scope

- Automatic constellation creation, AI name suggestions, memory gravity, and cosmic event flourishes.
