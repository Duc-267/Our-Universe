# Feature: Phase 2 — Daily check-in

## Goal

Let both partners share one mood for the local day, see each other's check-in, and have that mood quietly change the universe. This covers Epics 2.1, 2.2, 2.3, and 2.4 of `SPEC.md`. Same Moment and Twin Stars stay a later requirement.

## Definition of Done

- [x] Each member can save at most one check-in per local day in the couple timezone, with a mood and an optional note of at most 280 characters. Saving again the same day updates that check-in.
- [x] The partner can read today's check-in and earlier check-ins. A user outside the couple cannot read or write them, including by calling the data API directly.
- [x] The universe atmosphere follows the most recently updated check-in from today. With no check-in today, the sky stays as it was. The sky does not score or label the relationship.
- [x] A newly appeared memory star plays a short birth animation that does not block the scene. `prefers-reduced-motion` skips that animation.
- [x] While a partner is on `/universe`, a new memory or check-in from the other partner updates the page without a manual reload. If realtime is unavailable, a reload still shows the saved data.
- [x] Schema, RLS, and the check-in function are versioned in a migration. Local database checks cover the one-per-day rule, an update the same day, a rejected mood, and cross-couple privacy.
- [x] `docs/architecture.md` records the check-in day boundary, the weather rule, and the realtime fallback.

## Acceptance scenarios

1. **Today:** A member saves a mood and a short note. Their partner sees it on `/universe`. Saving again the same day changes the mood and does not add a second row.
2. **Privacy:** A user from another couple cannot read the check-in by id.
3. **Weather:** After a check-in, the sky shifts subtly. An empty day does not invent a mood.
4. **New star:** Creating a memory shows a brief birth glow. Reduced motion leaves the star still.
5. **Reload:** With realtime disconnected, refreshing `/universe` still shows the check-in and any new star.

## Constraints

- The local day is computed in the couple's IANA timezone inside the database function, not trusted from the browser.
- Check-in writes go through one private function. Authenticated clients have no direct insert or update grant.
- Optional check-in photos stay out of scope until the shared image pipeline exists.
- Effects stay subtle and must not describe the relationship as good or bad.
- Follow `AGENTS.md`: requirement first, architecture note, skill loop, and CI.

## Out of scope

- Check-in photos.
- Same Moment, blind mode, Twin Stars, and Same Moment history (Epics 2.5–2.7).
- Secret capsules, quests, and AI summaries.
