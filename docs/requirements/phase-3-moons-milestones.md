# Feature: Phase 3 — Anniversary moons and day milestones

## Goal

Start Phase 3 from `SPEC.md` (Epics 3.4 and 3.5) so the universe gains anniversary moons and day milestones as the relationship ages. Quests, trips, and constellations stay later requirements.

## Definition of Done

- [x] When a couple reaches a completed anniversary year (calendar anniversary of `relationship_start_date` in the couple timezone), the universe gains one persistent `MOON` for that year number. Refreshing again does not create duplicates.
- [x] When days together reach 100 or 365 (calendar days in the couple timezone), a milestone event is recorded once. These day milestones do not create moons.
- [x] `/universe` refreshes missing moons and day milestones on load through a private database function. Members can read them; users outside the couple cannot.
- [x] Moons appear on the canvas, distinct from stars, comets, and twin stars. Selecting a moon opens a detail card with the anniversary number and reached date.
- [x] A milestones list on `/universe` shows anniversary and day milestones from newest to oldest.
- [x] Schema, RLS, and database checks cover idempotent creation, anniversary date clamping for short months, and cross-couple privacy.
- [x] `docs/architecture.md` records how moons and day milestones are derived.
- [x] Lint, typecheck, database checks, production build, and the repository skill loop pass locally; CI passes on the pull request into `main`.

## Acceptance scenarios

1. **First anniversary:** A couple whose start date was one year ago today gains anniversary #1 and one moon after `/universe` loads.
2. **Idempotent:** Loading `/universe` twice does not add a second moon or second 100-day milestone.
3. **100 days:** After 100 calendar days together, the milestones list shows "100 days" and no moon is created for that row.
4. **Feb 29:** A Feb 29 start lands on Feb 28 in a non-leap anniversary year and still creates the moon once.
5. **Privacy:** A user from another couple cannot read the milestones or moons.

## Constraints

- Derive dates in PostgreSQL from the couple IANA timezone, matching `src/features/couple/age.ts` day and anniversary rules.
- Keep the existing canvas projector; moons are an extra draw pass. Do not introduce React Three Fiber in this requirement.
- Follow `AGENTS.md`: dedicated branch, requirement first, architecture note, skill loop, pull request into `main`, and green CI.

## Out of scope

- Quests, trip planets, constellations, memory gravity, cosmic event flourishes, and future dreams.
- Custom milestones entered by the couple.
- Animations beyond the existing reduced-motion-aware scene.
