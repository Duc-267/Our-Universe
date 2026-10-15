# Feature: Phase 3 — Couple quests and rewards

## Goal

Deliver Epics 3.1 and 3.2 from `SPEC.md`: publish a shared quest, collect both partners' responses, and grow the universe with a persistent cosmic reward. Trips and constellations stay later requirements.

## Definition of Done

- [x] Either member can publish one open quest from a fixed catalog (title, instructions, response type, expiry). A second open quest is rejected until the current one completes or expires.
- [x] Each member can submit once before expiry. Response type is `photo`, `text`, or `photo_text`. Invalid or duplicate submissions are rejected in PostgreSQL.
- [x] The quest completes only when both members have submitted. Completion creates one relationship event and one persistent `QUEST_REWARD` cosmic object (fragment, asteroid, flower, nebula, or special star).
- [x] If the window ends with fewer than two submissions, the quest becomes incomplete and creates no reward.
- [x] `/universe` shows the open quest, lets each person submit, lists recent quest history, and draws completed rewards on the canvas. Selecting a reward opens the quest card with both responses when readable.
- [x] Quest photos use the private `universe-media` bucket and browser resize pipeline. Cross-couple reads of quests, submissions, and photos are denied.
- [x] Migration, RLS, storage rules, and database checks cover one-open, both-submit completion, expiry, and privacy.
- [x] `docs/architecture.md` records quest publication, completion, and rewards.
- [x] Lint, typecheck, database checks, production build, and the repository skill loop pass locally; CI passes on the pull request into `main`.

## Acceptance scenarios

1. **Photo quest:** Alex publishes "Photograph the sky." Both upload a photo before expiry. A reward appears and both photos are visible in the card.
2. **Text quest:** A text-only quest accepts captions without photos and still creates a reward when both submit.
3. **Incomplete:** The window ends after one submission. History shows incomplete and no reward exists.
4. **One open:** Starting a second quest while one is open is rejected.
5. **Privacy:** A user from another couple cannot read the quest, submissions, or photos.

## Constraints

- Reuse private Supabase Storage and browser resizing from Phase 1 photos. The canvas never loads quest photo files.
- Expiry and completion are enforced in PostgreSQL. Keep the canvas projector; rewards are an extra draw pass.
- Follow `AGENTS.md`: dedicated branch, requirement first, architecture note, skill loop, pull request into `main`, and green CI.

## Out of scope

- Custom quest authoring, push notifications, and editing a submission after send.
- Trip planets, constellations, memory gravity, and future dreams.
