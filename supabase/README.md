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
| `20260902090000` | `friendship_like_integrity.sql` | may be absent | User applied it manually in Supabase SQL Editor after a clean preflight; postflight confirmed its CHECK, NOT NULL changes, and four indexes. |

The absent history entries must **not** be repaired automatically. `supabase migration repair`
changes remote history without changing objects; use it only after an approved object-level audit.

The manual application of `20260902090000_friendship_like_integrity.sql` was
recorded in this repository on 2026-09-02. The preflight returned zero rows for
self-friendships and nullable `one_verse_likes` IDs. The operator's postflight
then confirmed `friendships_no_self_reference`, `NOT NULL` for both like IDs,
and all four candidate indexes. SQL Editor application does not automatically
update Supabase migration history, so the linked history may still omit this
version. Do not run `db push`, `migration repair`, or re-run this migration to
resolve that discrepancy without a separately approved object-level plan.

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

## Friendship and One Verse integrity follow-up

`diagnostics/friendship_like_preflight.sql` is the required read-only preflight
for `20260902090000_friendship_like_integrity.sql`. Run it in the Supabase SQL
Editor immediately before requesting approval to apply that migration.

The candidate migration is safe only when its self-friendship and nullable-like
ID prerequisite queries return no rows. It then adds:

- `friendships_no_self_reference`, preventing `user_id = friend_id`.
- `NOT NULL` on `one_verse_likes.liker_id` and `author_id`, so the existing
  `(liker_id, author_id, day_index)` unique key cannot be bypassed with NULLs.
- Query indexes for incoming/outgoing friendship status, friend-feed One Verse
  ordering, and likes by verse author/day.

An accepted friendship intentionally has two directed rows: `(A, B)` and
`(B, A)`. The preflight reports a missing reverse accepted row as inconsistent
data; it must not be deduplicated automatically. A pending request may have no
reverse row.

For a production rollout, first run the preflight in SQL Editor and retain its
results with the change request. If the prerequisite queries are empty, review
the informational status/reverse/self-like/day-range results, then obtain
approval for the migration. Do not use `db push` to apply this candidate while
the linked project's manual migration-history gap remains unresolved.

The candidate SQL was statically reviewed, but an isolated Docker syntax run
could not complete because the local Supabase PostgreSQL image exited during
startup. It has not been run against any remote database. Re-run it in a stable
disposable Supabase stack before requesting production application.

No RLS policy change is included. The snapshot shows that `friendships`,
`one_verse_likes`, `profiles`, and `reading_records` have unrestricted SELECT
policies; `friendships` also has duplicate INSERT and DELETE policies. The
current friend search, arbitrary friend profile route, friend feed, and like
display rely on cross-user reads, while `reading_records.one_verse` can contain
user-authored memo data. Narrowing these policies needs an explicit product
decision about public profiles, public One Verse, and private memo visibility,
followed by role-level integration tests.

`invite_code` remains non-unique by design in this candidate. The active invite
flow uses the primary-key UUID (`invites.id`) as its opaque token; any legacy
code uniqueness decision must first use `invite_friendship_preflight.sql` and a
separate migration.

### Applied manual rollout record: 20260902090000

`20260902090000_friendship_like_integrity.sql` is no longer a pending production
candidate. It was manually applied through Supabase SQL Editor after the
required preflight passed. Its result is reflected in `schema/public.sql`:

- `friendships_no_self_reference` prevents self-relations.
- `one_verse_likes.liker_id` and `.author_id` are `NOT NULL`.
- `idx_friendships_friend_status`, `idx_friendships_user_status`,
  `idx_reading_records_user_completed_one_verse`, and
  `idx_one_verse_likes_author_day` exist.

The snapshot update is a careful DDL reconciliation from the operator-provided
postflight and the reviewed migration, rather than a fresh CLI dump: Docker was
not available and the local Supabase CLI could not write its telemetry file.
Run a future read-only `supabase db dump --linked --schema public` only in a
working Docker/CLI environment, then compare it before committing. Never use a
dump command as a reason to apply or repair migrations on production.

### Manual rollout record and future verification: 20260902090000

The following is the reported production index inventory from the SQL Editor as
of the review: only the primary/unique indexes on `friendships`,
`one_verse_likes`, and `reading_records` were present. In particular, the four
indexes created by `20260902090000_friendship_like_integrity.sql` were absent.
This observation is not a substitute for a fresh preflight immediately before
the change.

The migration was applied as an **all-or-nothing reviewed rollout**. Do not
copy only its `CREATE INDEX` statements into production or re-run the migration:
that would create an untracked partial state or fail against existing objects.

The index choices match the current client queries in `src/lib/social.ts`:

- `idx_friendships_friend_status` serves incoming pending requests by
  `(friend_id, status)`.
- `idx_friendships_user_status` serves sent requests and accepted friend lists
  by `(user_id, status)`.
- `idx_reading_records_user_completed_one_verse` serves the batch friend feed:
  `user_id IN (...)`, non-null One Verse/completion filtering, then newest
  `completed_at` first. It excludes rows that cannot appear in that feed.
- `idx_one_verse_likes_author_day` serves the batch likes lookup by verse
  author and day. The existing unique index starts with `liker_id`, so it does
  not cover this access pattern.

Each index adds write cost to its table. They are deliberately limited to the
two friendship lookup directions, feed-eligible reading records, and the
author/day like lookup used by the current feed. Do not add an `invite_code`
unique constraint in this rollout; it is a legacy-data/product decision.

The completed operator sequence was (and is the required template for any
future, separately approved constraint migration):

1. In Supabase SQL Editor, run
   `supabase/diagnostics/friendship_like_preflight.sql` in its entirety.
2. Stop if either prerequisite data query returns rows: self-friendships, or
   likes with nullable `liker_id` / `author_id`. Also stop if the final
   constraint/index name checks return rows: that indicates a prior partial or
   manual application that requires an object-level review.
3. Review the informational reverse friendship, status, orphan, duplicate,
   self-like, day-range, RLS, and index results. Do not delete or repair data
   automatically.
4. When the prerequisite and name-conflict result sets were empty, the approved
   operator ran the complete migration once in SQL Editor. This step is already
   complete; do not repeat it. Do not use `db push`, `migration repair`, or
   `db reset`.
5. Run `supabase/diagnostics/friendship_like_postflight.sql`. It must show the
   self-reference check, `NO` nullable flags for both like IDs, and all four
   candidate indexes.
6. Verify friend list/request views, the batched friend One Verse feed, and
   like add/remove in the application. Keep the SQL Editor results with the
   production change record.

## Pending manual rollout: One Verse candidates

`migrations/20260902100000_one_verse_candidates.sql` adds persistent candidates
that a user can save before completing a reading day. It creates the private
`public.one_verse_candidates` table rather than adding incomplete rows to
`reading_records`; this keeps completion statistics and public friend-feed
queries limited to completed reading records.

- The primary key `(user_id, day_index, book, chapter, verse)` prevents a user
  from saving the same candidate twice for one Day.
- RLS permits only the owner to select, insert, or delete candidates. There is
  no public candidate feed and no update policy because candidate rows are
  immutable until removed.
- The primary key starts with `(user_id, day_index)`, covering the app's
  per-user/per-Day candidate lookup. No extra index is required.

This migration is **not applied** to production and is intentionally absent
from `schema/public.sql`, which remains a snapshot of the current operational
schema. Before enabling the feature for production, an approved operator must:

1. Review the full migration in Supabase SQL Editor.
2. Run the complete contents of
   `supabase/migrations/20260902100000_one_verse_candidates.sql` exactly once.
3. Verify the table, primary key, RLS enabled state, three owner-only policies,
   and authenticated `SELECT`/`INSERT`/`DELETE` grants in SQL Editor.
4. Regenerate `src/types/supabase.ts` from the updated linked schema and take a
   new read-only `public` schema dump before updating the canonical snapshot.

Do not use `supabase db push`, `supabase db reset`, or `supabase migration
repair` for this rollout. Until the migration is applied and generated types
are refreshed, the app uses a deliberately local provisional row type for this
pending table; it mirrors the migration and avoids claiming that the current
remote generated schema already contains it.
