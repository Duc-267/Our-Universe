# Feature: Phase 3 — Cosmic events

## Goal

Deliver Epic 3.8 from `SPEC.md`: mark rare sky moments when a relationship milestone is reached, and show that sky only on the day it belongs to. Future dreams stay a later requirement.

## Definition of Done

- [x] `refresh_cosmic_events` creates one cosmic event per existing milestone. An anniversary becomes an aurora, 100 days becomes a meteor shower, and 365 days becomes a planet bloom.
- [x] Refreshing again does not add a second event for the same milestone.
- [x] `/universe` lists these events. When the couple's local today matches an event date, the canvas plays that sky (aurora bands, meteor streaks, or a bloom around the center). Other days keep the record and skip the animation.
- [x] A member of another couple cannot read these events, and their refresh does not create events for this couple.
- [x] Migration, RLS, and database checks cover the one-event-per-milestone rule, kind mapping, and privacy.
- [x] `docs/architecture.md` records cosmic events as milestone-keyed sky moments, not new orbiting objects.
- [x] Lint, typecheck, database checks, production build, and the repository skill loop pass locally; CI passes on the pull request into `main`.

## Acceptance scenarios

1. **Anniversary:** Reaching an anniversary records one aurora. Opening the universe on that date shows the aurora.
2. **Day marks:** 100 days records a meteor shower and 365 days records a planet bloom.
3. **Once:** Running refresh again leaves the same number of events.
4. **Privacy:** Another couple cannot read the events.

## Constraints

- Keep the canvas projector. The flourish is an extra draw pass and respects reduced motion by holding still. No React Three Fiber.
- The event key is the milestone, so the same anniversary cannot schedule a second sky.
- Follow `AGENTS.md`: dedicated branch, requirement first, architecture note, skill loop, PR into `main`, green CI.

## Out of scope

- Scheduled events that are not milestones, quest-triggered supernovas, and future dreams.
