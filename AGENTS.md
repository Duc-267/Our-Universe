# AGENTS.md

## Project overview
- Purpose: Provide a language-agnostic execution harness for agent-driven implementation workflows.
- Key outcomes: consistent requirement-first delivery, repeatable local/CI checks, and explicit Definition of Done enforcement.
- Tech stack: POSIX shell scripts, git hooks, and GitHub Actions.

## Working context rules
- `main` is the canonical integration and release branch.
- All feature work must start from `docs/requirements/*.md`.
- Keep architecture decisions in `docs/architecture.md`.
- Follow the implementation cycle: plan -> implement -> validate -> PR.
- Start each phase or repository change from an up-to-date `main` and work on a dedicated branch.
- Do not commit feature work directly to `main` or merge a feature branch into `main` locally.
- Every change must be delivered through a pull request whose base branch is `main`.

## Definition of Done
- [ ] Requirement checklist is fully satisfied.
- [ ] Relevant tests/checks pass.
- [ ] No convention violations.
- [ ] A pull request targets `main`.
- [ ] Required CI checks pass before merge.

## Implementation cycle
1. Update local `main`, then create a dedicated branch for the phase or change.
2. Write or update the requirement file in `docs/requirements/`.
3. Implement code based on requirement scope only.
4. Run relevant checks and the skill loop (`scripts/run-skills.sh`).
5. Resolve failures and rerun until green.
6. Commit and push the dedicated branch.
7. Open a pull request targeting `main`.
8. Confirm all required CI checks pass before merging the pull request.
