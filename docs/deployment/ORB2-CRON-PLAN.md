# Orb 2 cron: the precomputed field on the free plan

The production Worker runs the Orb 2 server field on a one-minute Cron Trigger
(`triggers.crons: ["*/1 * * * *"]` in `wrangler.jsonc`) and serves it from
`/api/good-intelligence/v1/orb2/field`. Workers Free gives a Cron Trigger
**10 ms of CPU**. This note explains what failure looks like, how the field
fits inside that budget without paying, and what to measure before and after
each change.

The end state costs **$0**. Nothing here requires Workers Paid, and the paid
upgrade is not the fix being implemented.

## What the tick does now

Reading the field used to be the expensive part: about a dozen D1 statements,
a JSON parse per stored payload, a read-time re-composition, and a
~600 KB `JSON.stringify` of the whole envelope, all inside the request. The
tick then built the same work again once a minute.

Both are gone. The work is now:

| Where | What it does | Cost |
| --- | --- | --- |
| `scheduled()` slice (`worker/orb2-field-publish.mjs`) | One page of changed berths per interval, then the status pieces and the assembly for one interval, saved by cursor in `orb2_field_build_state` | a few ms |
| `ORB2_FIELD_TICK` tick (`worker/orb2-field.mjs`) | The provider beats, when the Worker owns them | a few ms, provider-dependent |
| `worker/d1-backup.mjs` | One 25-row backup page | ~1 ms |
| Field GET | One `SELECT` of the stored document, or a 304, or a Cache API hit | ~0 ms |

The document is pre-serialized: `orb2_field_snapshots.body` is exactly the
bytes `{ success, environment, data }` the live read path would return, and a
served request never parses or re-serializes it. The load-bearing test for
that is `tests/orb2-field-publish-test.mjs` (byte identity through the real
sanitizers).

## What failure looks like

When the platform kills an invocation, Workers Logs / Logpush shows one error
per minute shaped like this:

```json
{
  "level": "error",
  "message": "*/1 * * * *",
  "$workers": {
    "eventType": "scheduled",
    "event": { "cron": "*/1 * * * *" },
    "outcome": "exceededCpu",
    "cpuTimeMs": 18
  }
}
```

Notes for reading that record:

- `message` / `error` containing the cron expression is the platform's own
  label for a killed scheduled invocation, not an exception thrown by this
  repository. No application stack trace exists because no application code
  threw — the isolate was stopped for exceeding its CPU budget.
- `cpuTimeMs` slightly over 10 with a much larger `wallTimeMs` is the classic
  signature: mostly I/O wait (free), but real CPU just past the Free ceiling
  of 10 ms per Cron Trigger invocation.
- `outcome: "exceededCpu"` on the *scheduled* event is different from a
  `[orb2-cron] tick failed:` or `[orb2-publish] slice failed:` log line. Those
  are application records: something in this repository answered, and the
  served route falls back to the live read for that minute.

User-visible effect: the site itself keeps serving (pages are static assets),
but the Orb 2 field stops advancing. Observations age past their freshness
windows, Discs drift to stale/held, and `status.lastTickAt` in
`GET /api/good-intelligence/v1/orb2/field` freezes. At one kill per minute the
account also receives Cloudflare's CPU-limit notification emails.

## Measure before you change anything

Timers inside a Worker do not advance during pure CPU work, so `Date.now()`
deltas cannot tell you what an invocation costs. **`cpuTimeMs` in Workers
Logs is the measurement of record** for this field.

1. Dashboard → **Workers & Pages** → `harshalos` → **Logs**, or Logpush if it
   is configured. Query for `$workers.eventType = "scheduled"` and read
   `cpuTimeMs` for each minute.
2. Record the distribution before touching anything: the maximum matters (that
   is what gets killed), and so does the median (that is the margin).
3. Do the same for `fetch` events matching the field route if you want the
   read side: it should sit at the noise floor, because the route returns a
   stored string.

For reference, measured in this repository's in-memory fixture (15 berths,
53,695-byte `1d` document) by repeating the runs on one machine — reproduce it
with `ORB2_BENCH=1 node --test tests/orb2-field-publish-test.mjs`:

| Step | CPU | Statements |
| --- | --- | --- |
| Live read path (what the request used to cost) | 2–4 ms | 11 reads, 20 rows |
| The envelope `JSON.stringify` alone | 0.3–0.8 ms | — |
| Served request, precomputed (one `SELECT` + `Response`, warm) | 0.4–0.6 ms | 1 read |
| Quiet minute: three interval pages, status, assembly | 1.9–2.6 ms | 19 reads, 10 writes |
| Minute with one beaten berth | 1.6–2.6 ms | 14 reads, 7 writes |
| First publication, all three intervals (once) | 6–17 ms total | — |

These are orders of magnitude, not promises: at the reviewed roster's 170-berth
scale the live read path measured ≈6 ms warm and ≈18.6 ms cold against a
617 KB document, and the quiet-minute slice grows with the roster too. The
numbers that decide anything are production's `cpuTimeMs` before and after the
deployment.

## The D1 free-tier budget

D1 Free allows **5 M rows read and 100 k rows written per day**, and a database
that hits a cap stops answering until 00:00 UTC. The publication is shaped
around rows, not bytes:

- The quiet-minute slice reads the status pieces plus the fragment metadata —
  ~170 rows at the reviewed roster — and writes two rows (the status pieces and
  the document) plus one build-state upsert per stage.
- A changed berth adds one read of its observation row and one fragment write.
  Only `fresh_until` forces a rewrite when nothing was beaten.
- Serving is one row read. The Cache API copy and the `304` path make most
  polls cost no D1 read at all.

That is on the order of 250 k–500 k rows read and a few thousand rows written
per day: a fraction of both caps, with the cold drain (one read and one write
per berth, once) as the only burst. Watch the same numbers in the D1 dashboard
(**Storage & Databases → D1 → Metrics**) when you compare before and after.

## Fix first: the precomputed field (already in the Worker)

`ORB2_FIELD_SNAPSHOT=off` is the switch back to the live read path. Leave it
unset to serve the precomputed document. With the snapshot in place:

- The minute's work is bounded by `worker/orb2-field-publish.mjs`:
  `ORB2_FIELD_FRAGMENT_PAGE` (12 berths) per interval page, a deeper
  `ORB2_FIELD_FRAGMENT_COLD_PAGE` (24) only while an interval has no fragments
  yet, then the status pieces and one assembly. `orb2_field_build_state`
  records the stage and the composite `(updated_at, rowid)` cursor, so an
  invocation that is cut short loses at most the page it was writing.
- Tickerbot's 15m/1h companion rows ride the same slices, so the intraday
  composition is published the same way the daily one is.
- A fragment is rewritten only when its stored payload changed or its freshness
  label aged out (`fresh_until`), so the write volume is a handful of rows a
  minute instead of the whole field.

Nothing in this path depends on a browser, and the schedule never pauses
because a tab or the whole site is closed.

## Fix second: Smart Placement + cache (free, one minute)

Smart Placement is still worth taking — it runs the Worker near its backends
(D1, provider routes) instead of near the trigger:

1. Cloudflare dashboard → **Workers & Pages** → `harshalos` → **Settings** →
   **Placement** → set to **Smart**.
2. On the same page, set **Cache** → **Enabled** for static assets. Keep
   `/api/*` out of the dashboard cache and let the Worker answer it: the field
   route sends `Cache-Control: no-store` to clients and keeps its own 20-second
   copy in the Cache API, with ETag/304 in front of the stored row.

No redeploy is needed; the next ticks pick it up. Smart Placement does **not**
raise the 10 ms CPU budget — it changes where the invocation runs, not what it
is allowed to compute.

### Polling behaviour

- The field response is `Cache-Control: no-store`, with an `ETag`. A client
  that sends `If-None-Match` gets a `304` for an unchanged document; the
  Worker's own 20-second Cache API copy answers a poll inside that window with
  no D1 read at all.
- The Orb 2 page polls every 20 seconds, and every 2 minutes while its tab is
  hidden (`FIELD_POLL_MS` / `FIELD_POLL_HIDDEN_MS`, published in the status as
  `pollAfterMs` / `pollHiddenMs`). Hiding a tab slows the page's read; it never
  pauses the server-side schedule.

## Still over budget: hand the beats to the runner (still $0)

If `cpuTimeMs` still lands over 10 ms with the field precomputed, the
remaining CPU is the **provider beats**, not the field. Move them off
Cloudflare rather than paying:

1. Configure the repository secrets and variables
   (`docs/deployment/ORB2-BEAT-RUNNER.md`). The workflow is inert until they
   exist.
2. Set the Worker variable `ORB2_FIELD_TICK=off` (dashboard → Workers & Pages →
   `harshalos` → Settings → Variables, or `wrangler.jsonc`). The publication
   slice keeps running, so the served document stays fresh either way.
3. Verify that `status.lastTickAt` still advances — it is now the runner's
   ticks that move it.

Do not "fix" this by slowing the cron: a sparser schedule still exceeds 10 ms
per tick and additionally breaks the documented one-unit-per-lane-per-minute
rotation the field status and tests describe.

If the runner is disabled or its secrets are removed, delete
`ORB2_FIELD_TICK=off` and the Worker's own tick resumes — the beats are the
same code either way.

## If the page shows "the server field answered HTTP 500"

The field route only ever returns 200/400/503 from Worker code, so a 500 is an
edge-served error — typically a transient failure captured during a placement
or cache change and then kept on repeat by the new cache. Confirm it with a
cache-busting read (the extra parameter is ignored by the Worker, but makes a
unique edge cache key):

```
https://<your-domain>/api/good-intelligence/v1/orb2/field?interval=1d&zz=<random>
```

If that returns 200 JSON while the plain URL 500s, the Worker is healthy and
the fix is Caching → Purge for
`<your-domain>/api/good-intelligence/v1/orb2/field*` (or Purge Everything —
static assets rebuild). Then keep `/api/*` out of cache: scope any
cache-everything rule to static assets (`/`, `*.html`, `/css/*`, `/js/*`,
`/assets/*`) and let `/api/*` honor the Worker's `no-store`. The stored field
and the cron are untouched throughout — only the view was stale. (Confirmed
2026-10-10: bust URL returned a full healthy snapshot while the plain URL
served 500.)

## Verify recovery

- **Byte identity.** The precomputed document has to be the envelope the live
  read would return. Compare a normal read with a cache-busting one:

  ```
  curl -s https://<your-domain>/api/good-intelligence/v1/orb2/field?interval=1d | wc -c
  curl -s "https://<your-domain>/api/good-intelligence/v1/orb2/field?interval=1d&zz=$RANDOM" | wc -c
  ```

  Both should be the same document (`X-Orb2-Field: snapshot; …`), and its
  `data.observations` should match what the live read path renders when the
  snapshot is switched off. `tests/orb2-field-publish-test.mjs` asserts this
  byte-for-byte in CI; the URLs above are the production check.
- **Headers.** The field response carries `X-Orb2-Field: snapshot;
  interval=…; built=…; source=worker-cron|github-actions|local-runner`, or
  `cache; interval=…` on a Cache API hit. `ETag` is the stored document's own
  validator; `If-None-Match` with it returns `304` and no body.
- `GET /api/good-intelligence/v1/orb2/field` → `status.lastTickAt` advances
  and Disc `active` counts climb back as the rotation re-covers the roster.
  This is the beat-health signal that matters.
- Workers → `harshalos` → Metrics → Errors: `exceededCpu` should be gone
  (or, if the beats are still on the Worker, reduced to the beat-only cost).
  A genuine tick failure (as opposed to a platform kill) logs
  `[orb2-cron] tick failed: …`; a publication fault logs
  `[orb2-publish] slice failed: …` from `scheduled()`.

## Boundaries

- Staging (`wrangler.staging.jsonc`) deliberately declares no triggers, so it
  never beats the shared provider budgets and never needs this plan for cron.
- The manual `action=tick` POST runs the same tick on demand and is subject to
  the same CPU budget; it is for diagnosis, not a substitute for the schedule.
- A precomputed document is a *stored* view: a berth written after the last
  publication is not in it until the next one. The live read path remains the
  fallback (`ORB2_FIELD_SNAPSHOT=off`, an unapplied migration, an unpublished
  interval, another method, or any fault at all), and it is where a berth
  appears the second it is stored.

## Sharing the tick: the nightly D1 backup

The same `scheduled()` handler runs one 25-row D1-backup page per invocation
after the Orb 2 slice and tick (`worker/d1-backup.mjs`). It adds about a
millisecond of CPU per tick, never throws, and logs only genuine faults as
`[d1-backup] page failed: …`. If you are reading the error graph, backup
faults are distinct from `[orb2-cron] tick failed`, from
`[orb2-publish] slice failed`, and from platform `exceededCpu` kills — and a
backup fault never costs the beat its minute. Details:
`docs/deployment/D1-BACKUP.md`.

## Related runbooks

- `docs/deployment/ORB2-BEAT-RUNNER.md` — running the beats off Cloudflare.
- `docs/deployment/D1-BACKUP.md` — the job riding this tick.
- `docs/deployment/WORKERS-AI-PROVIDER.md` — the relay's free-tier provider.
- `docs/deployment/TURNSTILE.md` — human verification for public writes.
- `docs/deployment/UPTIME-MONITORING.md` — external eyes on the site.
- `docs/deployment/WEB-ANALYTICS.md` — cookie-free traffic metrics.
