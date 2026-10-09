# Our Universe

This repository contains the Our Universe product specification, a requirement-first development harness, and the Phase 0 application in `src/app`. Phase 0 behavior is tracked in `docs/requirements/phase-0-foundation.md`; database and live authentication checks still require a configured Supabase project.

## Application scaffold

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env.local`, set the Supabase project URL and publishable key, and set the app URL to the local origin. Apply the migrations in `supabase/migrations/` before trying the couple flows.

The current development project and its migration-history handoff are recorded in [`docs/deployment.md`](docs/deployment.md).

Use `npm run lint`, `npm run typecheck`, `npm run test:db:local`, and `npm run build` to validate the application. `test:db:local` applies the migration to an in-memory PGlite database and checks the main membership and RLS flows without Docker. The concurrent acceptance suite needs a disposable PostgreSQL 17 database and `psql` configured through the usual `PG*` environment variables; run `bash scripts/test-db.sh` only against that disposable database. CI starts one automatically. This suite creates fixture roles and an `auth` schema and is not meant for a Supabase project database.

For a live Phase 0 check, create a Supabase project, apply the versioned migration, configure email confirmation and the callback URL (`<NEXT_PUBLIC_APP_URL>/auth/callback`), then use two test accounts to exercise the acceptance scenarios in `docs/requirements/phase-0-foundation.md`. Keep `.env.local` local and use a Node.js 22+ runtime.

## Development harness

The harness focuses on:

- **Context**: structured documents for agent execution
- **Feedback loop**: local git hooks + CI checks
- **Skill orchestration**: manifest-driven skill execution

## Quick start

1. Run `scripts/install-hooks.sh` if hooks are not already configured.
2. Create a requirement doc from `docs/requirements/feature-template.md` and keep `docs/architecture.md` up to date.
3. Run `scripts/run-skills.sh --mode local --stage manual`.
4. Customize `skills/enabled.txt` and each skill script as application checks are added.

## Structure

```text
.
├── AGENTS.md
├── docs/
│   ├── architecture.md
│   └── requirements/
│       └── feature-template.md
├── skills/
│   ├── enabled.txt
│   ├── core/
│   │   └── requirements-check.sh
│   ├── docs/
│   │   └── architecture-check.sh
│   └── quality/
│       └── dod-check.sh
├── scripts/
│   ├── install-hooks.sh
│   └── run-skills.sh
├── src/app/                # Next.js scaffold
├── package.json
├── .githooks/
│   ├── pre-commit
│   └── pre-push
└── .github/workflows/ci.yml
```
