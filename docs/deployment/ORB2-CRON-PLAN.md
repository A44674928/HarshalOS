# Orb 2 cron: keeping the one-minute beat alive

The production Worker runs the Orb 2 server-field beat on a one-minute Cron
Trigger (`triggers.crons: ["*/1 * * * *"]` in `wrangler.jsonc`). This note
explains what failure looks like, the cheapest fix first, and the paid
backstop if the cheap fix does not hold.

## What failure looks like

When the platform kills the tick, Workers Logs / Logpush shows one error per
minute shaped like this:

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

User-visible effect: the site itself keeps serving (pages are static assets),
but the Orb 2 field stops advancing. Observations age past their freshness
windows, Discs drift to stale/held, and `status.lastTickAt` in
`GET /api/good-intelligence/v1/orb2/field` freezes. At one kill per minute the
account also receives Cloudflare's CPU-limit notification emails.

## Fix first: Smart Placement + cache (free, one minute)

After repeated cron failures the dashboard offers a smarter placement. Take
it — it has revived this exact beat before:

1. Cloudflare dashboard → **Workers & Pages** → `harshalos` → **Settings** →
   **Placement** → set to **Smart**.
2. On the same page, set **Cache** → **Enabled**.

No redeploy is needed; the next ticks pick it up. Why this can work: Smart
Placement runs the Worker near its backends (D1, provider routes) instead of
near the trigger, which cuts round-trip latency and isolate churn on this
I/O-heavy tick. Honest caveat: it does **not** raise the 10 ms Free CPU
budget, so treat it as the first try, not a guarantee — verify below, and use
the backstop if kills persist.

### If the page shows "the server field answered HTTP 500" after enabling cache

The field route only ever returns 200/400/503 from Worker code, so a 500 is
an edge-served error — typically a transient failure captured during the
Placement switch and then kept on repeat by the new cache. Confirm it with a
cache-busting read (the extra parameter is ignored by the Worker, but makes a
unique cache key):

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

## Backstop if kills persist: Workers Paid

Cloudflare budgets CPU time per Cron Trigger invocation: **10 ms on Workers
Free**, 30 seconds on Workers Paid for sub-hourly crons (15 minutes wall time
on both). A normal Orb 2 tick — six provider lanes, D1 cursor/ledger reads,
provider fetches, and the shared market-context + motion evaluation per
instrument — uses roughly 18 ms of CPU: comfortably inside Paid,
structurally over Free.

If the placement fix does not hold (especially during quiet overnight hours,
when cold isolates bite hardest):

1. Upgrade the account to **Workers Paid** (dashboard → Workers & Pages →
   Plans). The default 30 s CPU limit for sub-hourly crons is enough; no
   `limits` change is needed in `wrangler.jsonc`.
2. Do not "fix" this by slowing the cron: a sparser schedule still exceeds
   10 ms per tick and additionally breaks the documented
   one-unit-per-lane-per-minute rotation the field status and tests describe.

## Verify recovery

- `GET /api/good-intelligence/v1/orb2/field` → `status.lastTickAt` advances
  and Disc `active` counts climb back as the rotation re-covers the roster.
  This is the beat-health signal that matters.
- Workers → `harshalos` → Metrics → Errors: on Free with Smart Placement,
  expect a steady state of *fewer* `exceededCpu` records, not zero. Ticks
  that land on cold isolates can still trip the 10 ms budget; the rotation
  is crash-safe (each lane cursor persists before its provider call, and the
  tick lease expires after 75 s), so a killed tick just skips its minute and
  the next surviving tick resumes. Residual errors with an advancing
  `lastTickAt` mean the site is working as designed on Free.
- Full zero on the error graph is what Workers Paid buys. A genuine tick
  failure (as opposed to a platform kill) logs
  `[orb2-cron] tick failed: …` from the Worker's `scheduled()` handler.

## Boundaries

- Staging (`wrangler.staging.jsonc`) deliberately declares no triggers, so it
  never beats the shared provider budgets and never needs this plan for cron.
- The manual `action=tick` POST runs the same tick on demand and is subject to
  the same CPU budget; it is for diagnosis, not a substitute for the schedule.

## Sharing the tick: the nightly D1 backup

The same `scheduled()` handler runs one 25-row D1-backup page per invocation
after the Orb 2 tick (`worker/d1-backup.mjs`). It adds about a millisecond of
CPU per tick, never throws, and logs only genuine faults as
`[d1-backup] page failed: …`. If you are reading the error graph, backup
faults are distinct from `[orb2-cron] tick failed` and from platform
`exceededCpu` kills — and a backup fault never costs the beat its minute.
Details: `docs/deployment/D1-BACKUP.md`.

## Related runbooks

- `docs/deployment/D1-BACKUP.md` — the job riding this tick.
- `docs/deployment/WORKERS-AI-PROVIDER.md` — the relay's free-tier provider.
- `docs/deployment/TURNSTILE.md` — human verification for public writes.
- `docs/deployment/UPTIME-MONITORING.md` — external eyes on the site.
- `docs/deployment/WEB-ANALYTICS.md` — cookie-free traffic metrics.
