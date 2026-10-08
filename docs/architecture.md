# Architecture Notes

## Layers
- Dependency direction: requirements/docs -> skill scripts -> hook/CI entrypoints.
- Forbidden reverse dependencies: skill scripts must not modify docs or git state; hooks and CI only orchestrate checks.

## Core modules
- `scripts/run-skills.sh`: reads `skills/enabled.txt`, executes each skill script, and aggregates failures into a single exit code.
- `skills/*/*.sh`: small, composable validation units for requirements presence, architecture quality, and DoD completeness.

## Decision records
- 2026-07-13: Enforce stage-aware quality gates. `pre-push`/`pr-check` now require at least one non-template requirement and no unchecked DoD items in real requirement docs.
