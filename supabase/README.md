# Supabase schema operations

## Source of truth and current status

The connected Supabase project's **current `public` schema** is the operational
source of truth. `schema/public.sql` is its data-free, canonical DDL snapshot,
created with `supabase db dump --linked --schema public`. It contains public
tables, constraints, indexes, functions, RLS policies, and grants, but no table
rows. There are no triggers whose target table is in `public`; the
`handle_new_user` trigger function is included, while its `auth.users` trigger
is intentionally outside this public-only snapshot. It is a reference and
empty-environment bootstrap input; never apply it to the existing linked
production project.

Migrations in `supabase/migrations/` are additive history, not a complete
bootstrap: the repository has no initial table/RLS/function migration. Do not
treat them alone as sufficient to create a production-equivalent database.

On 2026-09-01, a read-only comparison found the following remote migration history:

| Version | Local file | Remote history | Interpretation |
| --- | --- | --- | --- |
| `20260823033422` | `fix_schema_structure.sql` | present | Recorded remote migration. |
| `20260823205000` | `split_invites_and_friends.sql` | absent | SQL Editor/manual application is possible; verify objects, not history alone. |
| `20260901090000` | `secure_invite_acceptance.sql` | absent | Confirmed through remote generated types: `expires_at`, `accepted_at`, `create_invite`, and `accept_invite` exist. It was applied manually in SQL Editor. |

The absent history entries must **not** be repaired automatically. `supabase migration repair`
changes remote history without changing objects; use it only after an approved object-level audit.

`src/types/supabase.ts` was regenerated from the linked remote `public` schema on
2026-09-02. It is a type representation, not a schema dump: it does not preserve
RLS, policies, indexes, triggers, grants, or function bodies.

## Snapshot comparison: 2026-09-02

| Object | Canonical production snapshot | Existing migration coverage | Difference / action |
| --- | --- | --- | --- |
| `profiles` | PK `id`, FK to `auth.users`; public read policy | No initial creation migration | Captured in snapshot. |
| `reading_settings` / `reading_records` | PKs, FK to both `auth.users` and `profiles`, owner-only write policies | `20260823033422` adds the `profiles` FKs only | Initial tables, PKs, auth FKs, and policies were untracked. |
| `friendships` | Composite PK `(user_id, friend_id)`; FKs to `auth.users` and `profiles`; nullable `status`; no self-pair check | `20260823033422` adds profile FKs; `20260823205000` adds `status` and policies | Snapshot reveals duplicate insert/delete policies and an unrestricted SELECT policy. Do not alter without a separate RLS review. |
| `one_verse_likes` | PK `id`; unique `(liker_id, author_id, day_index)`; FKs to `auth.users` and `profiles` | `20260823033422` adds profile FKs only | Initial unique constraint, auth FKs, and policies were untracked. |
| `invites` | PK `id`; inviter/invitee indexes; `expires_at`, `accepted_at`; restricted owner/invitee SELECT | `20260823205000` creates initial table; `20260901090000` adds security fields/policy/RPCs | Objects are present remotely but neither manual SQL Editor change appears in remote migration history. |
| RPC/functions | `create_invite`, `accept_invite`, `handle_new_user` | Invite RPCs in `20260901090000`; initial profile function untracked | Invite RPCs use `SECURITY DEFINER`, fixed `search_path`, and authenticated execute grants. `handle_new_user` is captured as a public function; a trigger outside `public` is intentionally outside this snapshot scope. |

The snapshot confirms that the obsolete `System can view all invites for
processing` policy is absent. The invite RPCs are present with the expected
one-time/expiry fields. `GRANT ALL ON FUNCTION` in PostgreSQL's dump is the
normalized representation of the effective execute grants for functions.

The CLI does not provide a safe ad-hoc SQL execution path for this repository's
linked project, so `diagnostics/schema_drift_audit.sql` was not executed as part
of the automated dump. Its object inventory is available for a future Supabase
SQL Editor review; the snapshot and `supabase migration list --linked` supplied
the comparison recorded above.

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

The selected strategy is **B: canonical schema snapshot**. Keep legacy migrations
unchanged. `supabase/schema/public.sql` is the reviewed DDL snapshot and this
document is its comparison record. Use it only to bootstrap a new empty
environment or compare drift. Do not apply it to the existing production project
and do not run `db push` as part of baseline work.

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

On 2026-09-02, the isolated local validation was started but could not complete
within the automation session because Supabase's initial local image downloads
were still in progress. No production connection, migration, or data operation
was performed. To complete the pending local check after images are cached,
create a temporary Supabase project, start it without `--linked`, apply
`schema/public.sql` through its local PostgreSQL connection with
`ON_ERROR_STOP=1`, and query for the six public tables, 21 policies, and the two
invite RPCs before stopping the temporary stack.

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

## Deferred production hardening

The snapshot records current production state; it does not endorse every policy.
Before any production change, separately review and diagnose:

- Unrestricted SELECT policies on `friendships`, `one_verse_likes`, `profiles`,
  and `reading_records`, including overlap with the narrower friendship policy.
- Duplicate friendship INSERT and DELETE policies.
- A `CHECK (user_id <> friend_id)` on `friendships` after the preflight query
  confirms no existing self-relations.
- Whether nullable `one_verse_likes.liker_id` / `author_id` should become
  `NOT NULL`; the existing composite unique constraint allows multiple NULLs.
- Whether `invites.invite_code` needs a unique constraint for legacy data; the
  new opaque ID flow relies on the already-unique `invites.id` instead.
