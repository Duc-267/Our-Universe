# Main Branch Delivery Flow

## Goal
Make `main` the single integration branch and require every phase or repository change to reach it through a reviewed, green pull request.

## Definition of Done
- [x] `AGENTS.md` identifies `main` as the canonical branch.
- [x] Work starts from an up-to-date `main` and is committed on a dedicated branch.
- [x] Direct feature commits and direct merges to `main` are prohibited.
- [x] Every change is submitted as a pull request targeting `main`.
- [x] Local validation passes before the pull request is opened.
- [x] Required CI checks pass before the pull request is merged.
- [x] The CI workflow runs for pull requests targeting `main`.

## Constraints
- Repository delivery instructions and CI pull-request targeting.
- Git-host branch protection remains a repository setting and should require the checks defined in `.github/workflows/ci.yml`.

## Out of scope
- Application behavior and deployment configuration.
