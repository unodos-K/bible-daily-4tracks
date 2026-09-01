# Supabase schema operations

## Source of truth and current status

The connected Supabase project's **current `public` schema** is the operational
source of truth. Migrations in `supabase/migrations/` are additive history, not a
complete bootstrap: the repository has no initial table/RLS/function migration.
Do not treat them alone as sufficient to create a production-equivalent database.

On 2026-09-01, a read-only comparison found the following remote migration history:

| Version | Local file | Remote history | Interpretation |
| --- | --- | --- | --- |
| `20260823033422` | `fix_schema_structure.sql` | present | Recorded remote migration. |
| `20260823205000` | `split_invites_and_friends.sql` | absent | SQL Editor/manual application is possible; verify objects, not history alone. |
| `20260901090000` | `secure_invite_acceptance.sql` | absent | Confirmed through remote generated types: `expires_at`, `accepted_at`, `create_invite`, and `accept_invite` exist. It was applied manually in SQL Editor. |

The absent history entries must **not** be repaired automatically. `supabase migration repair`
changes remote history without changing objects; use it only after an approved object-level audit.

`src/types/supabase.ts` was regenerated from the linked remote `public` schema on
2026-09-01. It is a type representation, not a schema dump: it does not preserve
RLS, policies, indexes, triggers, grants, or function bodies.

## Safe schema-only export and drift audit

Run these commands from the repository root. They must never include data:

```bash
supabase migration list --linked
supabase db dump --linked --schema public --file supabase/schema/public.sql
supabase gen types typescript --linked --schema public > src/types/supabase.ts
```

`supabase db dump` requires Docker because the CLI uses its PostgreSQL tooling.
If Docker is unavailable, do not fabricate a snapshot. Instead run
`supabase/diagnostics/schema_drift_audit.sql` in the Supabase SQL Editor and save
only its metadata results for review. The query does not select application rows.

Before committing a future dump, review it to ensure it contains only DDL:

```bash
rg -n "^(COPY|INSERT INTO)|access_token|refresh_token|password|service_role" supabase/schema/public.sql
```

Any matches must be investigated; production data, credentials, and connection
strings never belong in this repository.

## Reproducibility plan

The safe strategy is **a canonical schema snapshot after a verified schema-only
dump** (strategy B). Keep legacy migrations unchanged. Add the reviewed DDL as
`supabase/schema/public.sql` together with a short comparison record, and use it
only to bootstrap a new empty environment or compare drift. Do not apply that
snapshot to the existing production project and do not run `db push` as part of
this baseline work.

After the snapshot and its empty-database bootstrap harness exist, test them only
against a disposable local database. The current migrations alone cannot provide
that test because they do not create the initial tables. A future bootstrap must
apply the snapshot to an empty database before any additive migrations that it
supersedes; it must never be pointed at the linked project.

```bash
supabase start
<run the reviewed local-only snapshot bootstrap>
supabase gen types typescript --local --schema public > /tmp/supabase-types.ts
npx tsc --noEmit
npm run lint
npm run build
```

`db reset` is allowed solely for local disposable environments once their complete
bootstrap is established. Never run it with `--linked`, and never use it against
production.

## Migration workflow

1. Inspect remote and local history with `supabase migration list --linked`.
2. Use the metadata audit or a reviewed schema-only dump to identify drift.
3. Add a new, forward-only migration. Do not edit historical files.
4. Run diagnostics against existing data before proposing constraints.
5. Review the SQL and get approval before applying anything to production.
6. Regenerate `src/types/supabase.ts`, then run TypeScript, lint, and build.

Do not use `supabase db push`, `supabase db reset`, or `supabase migration repair`
on the linked production project without explicit approval and a reviewed plan.

## Invite security verification

The manual invite security migration is represented by
`20260901090000_secure_invite_acceptance.sql`. Verify the following in the audit:

- `invites` has RLS enabled; `System can view all invites for processing` is absent.
- The only invite select policy limits rows to inviter or invitee.
- `create_invite()` and `accept_invite(uuid)` are `SECURITY DEFINER`, set a fixed
  `search_path`, require `auth.uid()`, and grant execute only to `authenticated`.
- `invites.expires_at` and `invites.accepted_at` exist.
- `anon` has no execute privilege on either RPC.

Run `invite_friendship_preflight.sql` before any future unique/check constraint
work. It is read-only. Friendship duplicate prevention is currently enforced in
the acceptance RPC with transaction locks; adding global database constraints
requires a separately approved data and compatibility review.
