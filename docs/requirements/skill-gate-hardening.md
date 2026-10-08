# Feature: skill-gate-hardening

## Goal
Tighten baseline validation so this boilerplate catches placeholder docs and unfinished delivery criteria before push/PR.

## Definition of Done
- [x] `requirements-check` validates required requirement sections and enforces at least one non-template requirement in `pre-push`/`pr-check`.
- [x] `architecture-check` fails when architecture placeholders are left unresolved.
- [x] `dod-check` ignores the template file and enforces zero unchecked DoD items in `pre-push`/`pr-check`.
- [x] Architecture and agent overview docs are updated with concrete baseline content.
- [x] Skill loop passes for `manual` and `ci` stages.

## Constraints
- Required API/library: POSIX shell + existing repository scripts only.
- Related conventions from AGENTS.md: requirement-first workflow, explicit DoD tracking, and validation before PR.

## Out of scope
- Adding language-specific build/test/lint tools.
- Introducing non-shell validation frameworks.
