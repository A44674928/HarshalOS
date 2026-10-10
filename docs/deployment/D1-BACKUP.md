# Nightly D1 backup to R2

Every table holding irreplaceable or expensive-to-rebuild state is copied to
the account's R2 bucket once a day. The job has no schedule of its own: it
rides the Orb 2 one-minute tick (`scheduled()` in `worker/index.mjs`) and
processes exactly one 25-row page per invocation — one D1 read, one R2 PUT —
so a full pass drains in the minutes after UTC midnight at roughly a
millisecond of added CPU per tick. The backup can never fail the beat:
`runScheduledBackup()` never throws, and a faulted page is logged, never
fatal.

Implementation: `worker/d1-backup.mjs`, cursor table `d1_backup_progress`
(migration `0015`), fixed table order in `D1_BACKUP_TABLES`.

## What lands in R2

Under the existing `STORAGE_BUCKET` bucket (`main-empty-domains`):

- `d1-backup/<UTC day>/<table>/part-<offset>.json` — one JSON object per page:
  `{ schema: "hos-d1-backup-v1", day, table, offset, rows, complete,
  backedUpAt }`, with `rows` as plain row objects.
- `d1-backup/<UTC day>/manifest.json` — `{ schema:
  "hos-d1-backup-manifest-v1", day, tables: [{ table, rows, parts }], rows,
  completedAt }`, written as the final cursor step so a crash cannot leave a
  day permanently manifest-less.

Tables are covered in fixed order, small and irreplaceable first
(`community_schema` … `community_reports`), ledgers and caches after, the
large `orb2_field_observations` last.

Deliberately excluded: `community_auth_flows`, `community_sessions`,
`community_auth_rates` (short-lived credentials and quota buckets — restoring
yesterday's sessions would resurrect expired logins), and the progress table
itself. There is deliberately no code path that writes a backup back into D1:
a bug here can waste R2 objects but can never corrupt the live database.

## Retention (dashboard, one minute)

R2 has no per-prefix expiry in code; set it on the bucket once: R2 →
`main-empty-domains` → Management → Object lifecycle rules → add a rule with
prefix `d1-backup/` expiring objects after 30 days. Nightly volume is small
(tens of parts, single-digit megabytes), comfortably inside the free tier.

## How to tell it ran

- Today's prefix exists and `manifest.json` has `completedAt` within the last
  24 hours.
- `SELECT utc_day, COUNT(*), SUM(done) FROM d1_backup_progress WHERE utc_day =
  '<today>'` shows every table `done = 1` (25 rows: 24 tables + `_manifest`).
- Workers Logs: no `[d1-backup] page failed` lines. Expected quiet states —
  unmigrated database, finished day — log nothing.

## Restore (manual, rare)

Restores are manual `wrangler` work, appropriate for their rarity and for the
fact that blindly replaying rows would violate several tables' invariants.
Sketch for one table:

1. `wrangler r2 object get main-empty-domains/d1-backup/<day>/<table>/part-000000.json`
   (repeat per part; the manifest lists part counts).
2. Rebuild `INSERT` statements from the page JSON offline, in `offset` order.
3. Apply with `wrangler d1 execute COMMUNITY_DB --remote --file restore.sql`
   against a scratch database first, verify row counts against the manifest,
   then against production during a maintenance window.

Never restore the excluded session/auth tables; users re-authenticate.

Tests: `tests/d1-backup-test.mjs` (via `npm run test:community`).
Related: `docs/deployment/ORB2-CRON-PLAN.md` (the tick it rides),
`docs/deployment/WORKERS-AI-PROVIDER.md` (the ledger is backed up).
