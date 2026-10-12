# Phase 0 Supabase environment

## Development project

- Project: Our Universe, in Duc-267's Org (Free plan)
- Project ref: `etfqfpgnkpymmivftsig`
- Region: Southeast Asia (Singapore)
- Public project URL: `https://etfqfpgnkpymmivftsig.supabase.co`
- Local app URL: `http://localhost:3000`
- Authentication redirect allowlist: `http://localhost:3000/**`
- Email provider and email confirmation: enabled
- Confirm signup email template: the Free plan's default email service does not allow editing the template. Its link verifies the email at Supabase, then redirects to `/auth/callback?next=...`. When the link opens in a different browser, the PKCE verifier cookie is absent; the callback then asks the user to sign in with the password they created. If custom SMTP is configured later, replace the confirmation link with `<a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">Confirm your email</a>` so the callback can verify the token and create a session across browsers.
- Data API: enabled; automatic exposure of new tables: disabled; automatic RLS: enabled

Do not put database passwords or secret/service-role API keys in this repository. The local app reads only the project URL and publishable key from ignored `.env.local`.

## Migration history

On 2026-10-08, `supabase/migrations/20261008000100_phase0_foundation.sql` was applied to this new project through the Dashboard SQL Editor. The editor reported `Success. No rows returned.` SQL Editor did not record it in the CLI migration history. On 2026-10-09, after verifying the Phase 0 tables and RLS in the live project, the Supabase CLI linked the project and recorded the existing migration with `migration repair 20261008000100 --status applied`. A subsequent `migration list` showed `20261008000100` in both the local and remote columns.

To verify the migration history before any future schema changes:

```sh
supabase migration list
```

`migration repair` updated history only; it did not re-run the SQL. See the [Supabase migration guidance](https://supabase.com/docs/guides/deployment/database-migrations#diagnosing-and-fixing-sync-errors).

For later schema changes, add a new versioned migration and apply it through the CLI so history stays in sync. Do not re-run the initial migration on this project.

## Phase 1 migration

`supabase/migrations/20261011145341_phase1_universe_memories.sql` adds `memories`, `relationship_events`, and `cosmic_objects` with their RLS policies and private functions. Verify history, then apply it through the CLI so the recorded history stays in sync:

```sh
supabase migration list
supabase db push
```

Verified on 2026-10-12: after applying the migration, the Data API already serves all three tables — `GET /rest/v1/<table>` with the publishable key returns the 42501 privilege error for the anon role (table found, denied by design), not the PGRST205 "Could not find the table" error that missing or unexposed tables return. No dashboard exposure step is required; `/universe` reads these tables with the authenticated role.
