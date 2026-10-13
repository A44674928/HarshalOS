# D1 rows-written budget

**What this is.** D1 Free allows **100,000 rows written per day** and **5 million
rows read per day**, both resetting at 00:00 UTC. The Orb 2 field writes to D1
**1,440 times a day** (one Cron invocation a minute), so the write allowance —
the smaller one by a factor of fifty — is the number that decides whether the
field keeps beating after a busy afternoon.

This note is the arithmetic behind the guard in
[`worker/d1-rows-written.mjs`](../../worker/d1-rows-written.mjs), the measured
costs it was calibrated against, and the levers that are still on the table.

---

## 1. The unit is rows, not statements

From the [D1 pricing page](https://developers.cloudflare.com/d1/platform/pricing/):

> Rows written measure how many rows were written to D1 database. Write
> operations include `INSERT`, `UPDATE`, and `DELETE` … **Indexes will add an
> additional written row when writes include the indexed column**, as there are
> two rows written: one to the table itself, and one to the index.

That is literally what SQLite does: a statement maintains one b-tree entry per
index whose columns it touches, plus the table's own row. Consequences that are
easy to miss:

| Belief | Reality |
| :--- | :--- |
| One `INSERT` costs one row written. | It costs one row **per b-tree**: the table, the primary key's index (unless the PK *is* the rowid), every `UNIQUE` constraint's index, and every secondary index. |
| An `UPDATE` that changes nothing is free. | It writes the table's row, and it is billed. Guard it with a comparison (`WHERE col <> ?`) or skip it in code. |
| An `UPDATE` costs an index write if the table has indexes. | Only for indexes containing a column the statement assigns. `UPDATE orb2_field_runs SET last_tick_at = ?` leaves `utc_day` alone, so the primary-key index is untouched: **one** row. |
| `meta.changes` is the billed number. | No — `changes` counts table rows. The billed number is `meta.rows_written`, which D1 returns for every query. |

The scheduler's existing budget (`ORB2_FIELD_SCHEDULER_MAX_D1_WRITES`) counts
**statements**. Measured against the reviewed roster, a rotation minute is 11
write statements and **18 rows written**; a Tickerbot twelve-beat burst is 65
statements and **128 rows written**. The statement budget was never wrong about
what it counted — it counted the wrong thing. A tick could sit at 65/104
statements and, at ~2 rows per statement, spend 128 of the day's ~69-row
per-minute allowance.

At 1,440 minutes a day, the difference between the two units is the difference
between "inside budget" and a database that stops answering at 00:00 UTC.

---

## 2. What a tick actually costs

Measured by running the real Worker modules against an in-memory D1 built from
the checked-in migrations (the scheduler and publication suites), with every
write attributed to its table. The roster is the reviewed one; the numbers
scale with it.

### The beat tick (`runOrb2FieldTick`)

| Minute | Statements | **Rows written** | Where they go |
| ---: | ---: | ---: | :--- |
| Quiet minute | 6 | **11** | queue 6, runs 5 |
| Rotation minute (one beat) | 11 | **18** | queue 6, observations 5, runs 5, Kraken cache 2 |
| Busy minute | 12 | **17** | as above, plus a futures contract cache row |
| Tickerbot twelve-beat burst | 41–65 | **80–128** | observations 60, queue 39, runs 5, control 1 |

Rows per statement: **1.6×** on a rotation minute, **~2×** on a burst.

### The publication slice (`runOrb2FieldBuildSlice`)

| Slice | **Rows written** |
| ---: | ---: |
| Idle minute (no berth changed; document republished) | **12–13** |
| 3 berths changed | 25 |
| 15 berths changed | 73 |
| 24 berths changed | 102 |

An idle minute is not free: the build-state cursor, the status pieces, and the
assembled document are rows regardless of whether anything moved.

### The day

| Consumer | Rows/day | Share of the 100 k |
| :--- | ---: | ---: |
| Beat tick (~25 rows × 1,440) | ~36,000 | 36% |
| Publication slice (~13 rows × 1,440) | ~18,700 | 19% |
| **Steady-state total** | **~55,000** | **~55%** |
| Deploy warm burst (171 berths enqueued, then drained) | +~2,000 | +2% |
| Nightly D1 backup, community tables, manual ticks | variable | the remaining margin |

The steady state leaves roughly 2× headroom. What closes it is not the average
minute but the tails: a deploy day, a burst of user priority refreshes, a
provider retry storm, or a roster that grows.

---

## 3. What is in place

**1. Real numbers where the platform gives them.** Every query D1 runs returns
`meta.rows_written`; the tick and the publication slice read it and settle the
running total against it. Where a driver reports nothing (every in-memory
fixture in the tests), a schema-derived model in `worker/d1-rows-written.mjs`
stands in. Production logs therefore carry the billed number, not an estimate.

**2. A per-tick ceiling in the right unit.** `ORB2_FIELD_SCHEDULER_MAX_D1_ROWS_WRITTEN`
(160, less 6 reserved for the tick's own bookkeeping) is charged **before** a
write is sent, because a write that already happened cannot be un-billed. It
sits above the measured worst case for one legitimate invocation (a twelve-beat
burst is ~130 rows) and far below anything a runaway path would produce. It is
an anomaly guard for a single invocation — the *day* is bounded by the rotation
and by the logs, not by this number, which is exactly why the logs exist.

**3. One log line per invocation, per stage**, with a per-table breakdown:

```text
[orb2-d1] stage=tick day=2026-10-13 rowsWritten=18 statements=11 modeled=11 observed=0 orb2_field_queue=6,orb2_field_observations=5,orb2_field_runs=5
[orb2-d1] stage=publish day=2026-10-13 rowsWritten=13 modeled=13 observed=0 orb2_field_build_state=6,orb2_field_snapshots=7
```

Query them in Workers Logs with `$workers.eventType = "scheduled"` and read
`rowsWritten` by day. The counter is deliberately **not** stored in D1: a row
that counts writes is itself a write.

**4. Migration 0020** retires `idx_orb2_field_observations_observed`. It cost a
row written on every upsert against the write-hottest table and it only ever
served the precomputed-document fallback (`ORB2_FIELD_SNAPSHOT=off`), which
reads the same ~170 rows either way and simply sorts them. The per-tick sweep
query and the publication's change scan never used it. See the migration file
for the `EXPLAIN QUERY PLAN` measurements and the one-line revert.

**5. Byte-identical payloads are no longer rewritten.** `refreshStoredComposition`
compares the recomposed payload with the stored one and skips the write when
they match. This fires for every berth whose composition is time-invariant —
the whole daily-only roster (crypto, FX, futures, indices) and any stock whose
15-minute residual has aged out — because composition only decays with `now`
when there is a fresh intraday bar to decay. Two rows a beat, on the majority
of beats.

---

## 4. Levers not taken, and why

| Idea | Verdict |
| :--- | :--- |
| **`WITHOUT ROWID` on the `TEXT` primary-key tables** | Saves one row per `INSERT` (the PK stops being a second b-tree) and **nothing** on `UPDATE` — and almost everything the field writes is an `UPDATE` of a row that already exists. It also breaks two things this schema depends on: migration 0018 pages the publication's change scan on `orb2_field_observations.rowid`, and `worker/d1-backup.mjs` pages the nightly backup with `ORDER BY rowid` on every table it copies. Both would have to move to primary-key order first. Revisit only if cold drains become the dominant cost. |
| **Partial index on `orb2_field_queue`** (`WHERE lane IN ('hot','sweep')`) | Measured: the claim query drops from `SEARCH … USING INDEX` to a full `SCAN` with a temp b-tree sort. Wrong side of the trade for a query that runs every minute. |
| **Dropping the change-scan index** (`interval, updated_at`) | It is what makes the sliced publication possible — without it every slice re-scans the whole field. Keep. |
| **A durable UTC-day counter in D1** | Spends the resource it meters. Workers Logs is the durable record and costs no rows. |
| **Workers Paid** | 50 M rows written/month included, i.e. ~1.6 M/day. The right answer the moment the roster or the rotation outgrows the free tier — not before, since the steady state sits at ~55%. |

---

## 5. Next levers, in order of return

1. **Move the scheduler cursor out of `orb2_field_queue`.** It is the largest
   single line in the quiet-minute breakdown: **6 rows a minute, ~8,600 a day**,
   to advance two cursor rows. The queue carries a `UNIQUE` conflict target and
   a lane index, so each cursor upsert is charged 3. A dedicated cursor table
   with an `INTEGER PRIMARY KEY` (the rowid, so no second b-tree) and no
   secondary indexes costs **1** — a saving of ~5,700 rows/day. Needs a
   migration plus `readSchedulerState` / `writeSchedulerState`.
2. **Compose at publish time instead of storing composition in the observation
   payload.** Two of the five rows a beat costs are the composition rewrite. The
   published fragment is built from these rows anyway, and the fallback live
   read already composes on read (`composePair` in the read path), so the stored
   copy is a cache. Moving it into the fragment builder removes ~40% of the
   beat's write at the price of one extra read per changed berth in the slice.
3. **Fold `recordTickResult` into the lease release.** Three `UPDATE`s of
   `orb2_field_runs` a tick (lease, result, release) is ~4,300 rows/day for
   bookkeeping that could be two writes. Small, and it touches the lease
   protocol, so do it last.

---

## 6. Reading the dashboard

**Storage & Databases → D1 → Metrics**, `Rows written`. Compare the day's total
against the sum of the `[orb2-d1]` lines for the same UTC day.

- **Lines and dashboard agree.** The model is calibrated; nothing to do.
- **Dashboard is higher.** Look at the gap's timing: a burst of writes outside
  the two logged stages is community traffic, a manual `wrangler d1 execute`,
  or the backup. `unmodelled=…` in the log names any table the model has never
  heard of (it is charged one row, which is an under-count for an indexed
  table, and
  `tests/d1-rows-written-test.mjs` fails until it is added to `D1_WRITE_COST`).
- **A tick is refused with `rows-written budget exceeded`.** The field stops
  beating for that minute and the error is logged. It means a path started
  writing more than the reviewed worst case: check whether a lane's burst grew,
  then either fix the path or raise the ceiling **with** the new measurement
  recorded here.
---

## 7. Writes on the request path

The tick is not the only writer. A second pass over the codebase looked for
writes that fire per *request* rather than per *minute*, because those are the
ones whose cost is set by traffic instead of by the schedule. What it found,
and what changed:

| Site | Cost per request, before | Now |
| :--- | :--- | :--- |
| `orb2_saved_beats`, **two** POST routes (`orb2-saved-beats.mjs`, `good-intelligence-orb2-beats.mjs`) | An unbounded global `DELETE ... WHERE expires_at <= ?` — every session's stale rows in one request, at **4 rows written each** (compound PK + two secondary indexes) | One bounded page per save: `WHERE (session_id, beat_id) IN (SELECT … ORDER BY expires_at LIMIT 200)`. The next save retires the next page; expired rows are never served either way, since every read filters `expires_at > ?`. |
| `orb2_saved_beats` **GET** | A `DELETE` of the session's expired rows — a write on a read path, 4 rows per row retired | Removed. The `SELECT` already excludes those rows, and the write path retires them. |
| `allowCommunityPublicRead` | Up to 20 expired rate buckets swept per anonymous read, 3 rows each (**60 rows per page view**), and rate buckets expire every 60 s by construction, so there is always something to sweep | Removed. `cleanupAuth` retires the same rows, bounded at 100, on the sign-in path. |
| `authorizeDevice` (paper market) | `last_used_at` re-stamped on every authenticated device request — 1 row, up to 5,000/day per device for a "last seen" field | Throttled to once per five minutes per token (`AND COALESCE(last_used_at,0) < ?`); `MAX()` keeps the stamp monotonic. |
| `cleanupAuth` | Three `DELETE` statements per call even when nothing is expired | Probed first with `SELECT 1 … LIMIT 1`. This one is latency, not rows: a `DELETE` that matches no rows writes none. |

Two things deliberately left alone:

- **The rate-limit row itself** (`rate()` in `community-auth.mjs`) writes on
  every rate-limited request: 2 rows for a new bucket, 1 for an existing one.
  That is what durable rate limiting costs in D1. The standard answer is to
  move the counter to KV (or Cloudflare's Rate Limiting API) and keep D1 out of
  it — a design change, not a tweak. Community publication is disabled in
  production today (`COMMUNITY_ENABLED=false`), so this is latent, not live.
- **`deleteOrphanFragments`** (publication slice) reconciles fragments whose
  observation row disappeared. It uses covering indexes, but it still walks
  every fragment in the interval and probes the observations table for each:
  ~342 rows read per interval per slice, ~0.5 M a day, ~10% of the read cap,
  to find orphans that are almost never there. It is a safety net for an
  out-of-band D1 edit, so gating it on the slice counter (say, every 30th slice
  plus cold passes) would cut that ~30× at the price of letting a stale
  fragment linger for up to ~30 minutes after such an edit. Say the word and
  it is a three-line change.

---

## 8. What the standard advice gets right — and wrong — here

Checked item by item against this codebase:

| Advice | Verdict |
| :--- | :--- |
| Never run `CREATE INDEX` / DDL on the hot path | **Clean.** The only DDL outside `migrations/` is the guarded `ALTER TABLE … ADD COLUMN kraken_calls` self-heal in `ensureRunRow`, which reads `sqlite_schema` once per isolate and caches the answer. |
| Batch row-by-row `INSERT`s | **Already done** where it matters (`enqueueJobs`, `refreshStoredComposition`, both saved-beat routes). Note the reason this item gives is wrong: batching cuts round trips and CPU, **not rows written** — D1 bills per row either way. Worth doing for the 10 ms budget, useless for this cap. |
| `UPDATE` needs a precise `WHERE` | **Clean.** Every write statement in `worker/` was enumerated: all target a primary key or a reviewed composite key. No broad `UPDATE`/`DELETE` scans. |
| `DELETE` frequently on large tables; use a TTL job instead | **This was the real find** — see §7. Both saved-beat routes ran an unbounded global expiry delete per save. |
| Drop indexes on write-heavy tables | Done in migration 0020. A full sweep of the remaining indexes found exactly one with no reader: `community_public_observation_moderation_actions_observation`, on an append-only moderator audit table written a handful of times a year. Left in place. |
| Use `INTEGER PRIMARY KEY` (rowid) — "lookups are free" | Reads are never free: a PK lookup is a row read like any other. And swapping a `TEXT` PK for a surrogate `INTEGER` PK plus a `UNIQUE` index keeps the same number of b-trees, so there is no write win either. The lever that *would* help is `WITHOUT ROWID` (§4), which is blocked by the backup's `ORDER BY rowid` paging and migration 0018's `rowid` watermark. |
| Buffer hot-path writes in KV/memory, flush on a cron | Correct in principle; the concrete instance is the rate-limit row (§7), which needs a design decision rather than a patch. |
| Avoid `ORDER BY RANDOM()` | Not used. |
