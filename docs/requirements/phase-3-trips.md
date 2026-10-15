# Feature: Phase 3 — Trips become planets

## Goal

Deliver Epic 3.3 from `SPEC.md`: record shared trips with destination, dates, and linked memories; marking a trip significant creates a persistent planet in the universe. Constellations stay a later requirement.

## Definition of Done

- [x] A member can create a trip with destination, start date, end date (end on or after start), and an optional note of at most 500 characters.
- [x] Either member can link or unlink existing couple memories to a trip. Linked memories stay readable as before; deleting a memory removes the link.
- [x] Marking a trip significant creates one `PLANET` cosmic object and a relationship event. Unmarking removes that planet. Refreshing does not duplicate planets.
- [x] `/universe` lists trips, draws significant planets on the canvas, and opens trip detail (destination, dates, linked memories with thumbnails) when a planet or trip row is selected.
- [x] Members can update destination, dates, note, and significance, and delete a trip (removing its planet). Cross-couple access is denied.
- [x] Migration, RLS, and database checks cover date rules, memory linking, significant planet creation/removal, and privacy.
- [x] `docs/architecture.md` records trips and planets.
- [x] Lint, typecheck, database checks, production build, and the repository skill loop pass locally; CI passes on the pull request into `main`.

## Acceptance scenarios

1. **Significant trip:** Alex creates "Hanoi" with dates and marks it significant. A planet appears; opening it shows the trip detail.
2. **Memories:** Linking two memories shows their titles and thumbnails on the trip card.
3. **Unmark:** Clearing significant removes the planet; the trip row remains.
4. **Dates:** An end date before the start date is rejected.
5. **Privacy:** A user from another couple cannot read the trip or its links.

## Constraints

- Trip photos in this slice come from linked memory photos, not a separate upload path.
- Keep the canvas projector; planets are an extra draw pass. No React Three Fiber.
- Follow `AGENTS.md`: dedicated branch, requirement first, architecture note, skill loop, PR into `main`, green CI.

## Out of scope

- Constellations, custom quest authoring, and AI summaries.
- Standalone trip photo uploads beyond linked memories.
