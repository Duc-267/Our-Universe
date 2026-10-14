# Feature: Phase 2 — Check-in photos and Same Moment

## Goal

Finish Phase 2 from `SPEC.md`. Epics 2.1–2.4 already cover the daily mood, weather, realtime refresh, and star birth. This requirement adds the optional check-in photo from Epic 2.1 and Epics 2.5–2.7: Same Moment, Twin Stars, and Same Moment history.

## Definition of Done

- [x] A member can attach one optional photo to today's check-in. It is resized in the browser, stored in the private media bucket, and visible to the partner. Replacing it the same day keeps a single photo.
- [x] Either member can start one open Same Moment. It records the start time, a two-hour response window, and whether blind mode is on. Both members see that invitation on `/universe` without a manual reload.
- [x] Each member can submit one photo and an optional caption before the window ends. A second submission from the same person is rejected.
- [x] With blind mode on, neither person can read the other's photo or caption before submitting their own, including through Storage. With blind mode off, the partner can see a submission immediately.
- [x] When both people submit, the moment is complete and the universe gains two linked twin stars. One submission at the end of the window leaves the moment incomplete and creates no twin stars.
- [x] Selecting the twin stars, or a row in the history, opens one card with the timestamp, both captions, and both photos when the viewer is allowed to see them.
- [x] History lists past Same Moments from newest to oldest. Complete moments show both photos. Incomplete moments are labeled and do not pretend a second photo exists.
- [x] Realtime refresh on `/universe` includes a new memory, a check-in, a capsule opening, and a Same Moment start or submission. A failed subscription still shows the saved rows after reload.
- [x] The migration, RLS, storage rules, and database checks cover blind mode, the single open moment, twin-star creation, expiry, and cross-couple privacy.
- [x] Lint, typecheck, database checks, production build, and the repository skill loop pass locally; CI passes on the pull request into `main`.

## Acceptance scenarios

1. **Check-in photo:** A member adds a photo to today's mood. Their partner sees the thumbnail. Updating the mood without a new photo keeps it.
2. **Blind pair:** Alex starts a blind Same Moment. Alex submits a photo. Blair sees the invitation and not the photo. After Blair submits, both see both photos and two connected stars.
3. **Open pair:** With blind mode off, Blair can see Alex's photo before submitting.
4. **Incomplete:** The window ends after one submission. The history row says incomplete and no twin stars exist.
5. **Privacy:** A user from another couple cannot read the moment, its photos, or the check-in photo.

## Constraints

- Reuse the private `universe-media` bucket and browser resizing from `docs/requirements/phase-1-photos-capsules.md`. The scene never loads the photo files.
- The response window and blind rule are enforced in PostgreSQL. The in-app invitation is the notification; this app has no push-notification channel.
- Follow `AGENTS.md`: dedicated branch, requirement first, architecture note, skill loop, pull request into `main`, and green CI.

## Out of scope

- Push notifications, email, and reminders after the window.
- More than one photo per person per Same Moment, or editing a submission after it is sent.
- Quests, trips, and AI summaries.
