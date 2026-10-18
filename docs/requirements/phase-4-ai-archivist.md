# Feature: Phase 4 — AI archivist

## Goal

Deliver Epic 4.1 from `SPEC.md`: summarize the couple's shared history so patterns and moments are easier to rediscover. The summary only recounts records already stored. It does not judge, diagnose, score, or advise. Monthly stories, constellation naming, and Wrapped stay later.

## Definition of Done

- [x] `refresh_archive` writes one `archive_summaries` row for the caller's couple. A second refresh updates that same row.
- [x] The summary states the memory count, the category recorded most often, up to three recent memory titles, and the counts of check-ins, completed Same Moments, trips, completed quests, milestones, constellations, and dreams.
- [x] When the couple has none of those records, the summary is exactly `Nothing is written in this archive yet.`
- [x] The wording does not tell the couple what they should do, and it does not describe the relationship as healthy, compatible, or scored.
- [x] `/universe` refreshes the archive on load and shows the paragraph. A member of another couple cannot read it, and their refresh does not replace this couple's row.
- [x] Migration, RLS, and database checks cover the counts, the single-row refresh, the empty sentence, and privacy.
- [x] `docs/architecture.md` records the archive as a factual recount, not a model judgment.
- [x] Lint, typecheck, database checks, production build, and the repository skill loop pass locally; CI passes on the pull request into `main`.

## Acceptance scenarios

1. **Recount:** After several memories, opening the universe shows how many there are, which category was recorded most, and a few recent titles.
2. **Once:** Refreshing again leaves one summary row and updates its text.
3. **Empty:** A couple with no records sees the quiet empty sentence.
4. **Privacy:** Another couple cannot read the summary.

## Constraints

- Build the paragraph in PostgreSQL from counts and titles. Do not call an external model in this epic.
- Do not add a relationship score, advice, or a new cosmic object.
- Follow `AGENTS.md`: dedicated branch, requirement first, architecture note, skill loop, pull request into `main`, and green CI.

## Out of scope

- Monthly cosmic journal, AI constellation names, yearly Wrapped, and the timeline slider.
- Disabling a model summary. There is no model call to disable yet.
