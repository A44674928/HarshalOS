# Orb 2 beat runner: the provider beats off Cloudflare, still $0

Workers Free gives a Cron Trigger **10 ms of CPU**, and the Orb 2 provider
beats grow with the reviewed roster while that budget does not. The way out
that costs nothing is to keep the field precomputed (see
`docs/deployment/ORB2-CRON-PLAN.md`) and, when the beats alone stop fitting,
run them on a machine whose budget is minutes:

- workflow: `.github/workflows/orb2-beats.yml`, every five minutes;
- runner: `scripts/orb2-beat-runner.mjs`;
- transport: `scripts/orb2-d1-client.mjs` (D1 over HTTP).

The runner is not a second implementation. It imports `worker/orb2-field.mjs`
and `worker/orb2-field-publish.mjs` and runs the same tick and the same sliced
publisher the Worker runs — the reviews, sanitizers, ledgers, lane cursors and
the publication document are the checked-in ones. Only the transport differs:
D1's HTTP API instead of the binding, behind the same
`prepare(...).bind(...).first()/.all()/.run()` and `db.batch()` shape.

## It is inert until the secrets name a database

Without configuration the runner prints one line and exits **0**, having read
and written nothing:

```
Orb 2 beat runner is inert: ORB2_D1_DATABASE_ID, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN are not configured.
Nothing was read or written. See docs/deployment/ORB2-BEAT-RUNNER.md.
```

That is the merged state of the workflow: it can live in the repository before
the secrets exist, it never fails a scheduled run for being unconfigured, and
it never falls back to a default database id. `tests/orb2-beat-runner-test.mjs`
asserts that behaviour, the refusal path, and that the document published over
the HTTP transport is the same document the Worker publishes.

## Configure it

Repository secrets (Settings → Secrets and variables → Actions):

| Secret | Needed for | Notes |
| --- | --- | --- |
| `ORB2_D1_DATABASE_ID` | naming the target database | Required. Production is `ea508a07-e00c-4d41-a657-428937ba8110` (`wrangler.jsonc`); staging is `74f281fe-3ab9-49b1-bff6-4686cb768ca7`. Pick one deliberately — whichever you pick, that is the only database the run may touch. |
| `CLOUDFLARE_ACCOUNT_ID` | naming the account | Required. |
| `CLOUDFLARE_API_TOKEN` | D1 access | Required. Scope it to **D1 Edit** on that account only; it needs no Workers, KV, R2 or DNS permission. |
| `MASSIVE_API_KEY` | FX, futures, indices lanes | Optional — a lane without its key is skipped, not failed. |
| `TWELVEDATA_API_KEY` | the FX fallback lane | Optional, same rule. |
| `TICKERBOT_API_KEY` | the Stocks lane | Optional, same rule. |
| `ALPHA_VANTAGE_API_KEY` | the second FX fallback lane | Optional, same rule. |

Repository variables (same page, **Variables** tab):

| Variable | Default | Meaning |
| --- | --- | --- |
| `ORB2_D1_DATABASE_NAME` | unset | When set (`community_db` for production, `community_db_staging` for staging), the run looks the database up first and **refuses to write** unless that id answers to that name. Fail closed, not fail wrong. |
| `ORB2_RUNNER_ITERATIONS` | `1` | Tick cycles per fire (1–12). Each cycle is one bounded tick, exactly as a Cron invocation is. |
| `ORB2_RUNNER_PUBLISH` | `on` | `off` skips the publication step, so a run only beats. |

Verify without writing anything:

```
node scripts/orb2-beat-runner.mjs --dry-run
```

It resolves the guards (including the name check) and prints what it would do.

## Switch over

1. Add the secrets. Watch one manual run (Actions → **Orb 2 beat runner** →
   **Run workflow**) and confirm `status.lastTickAt` advanced.
2. Set the Worker variable `ORB2_FIELD_TICK=off` (dashboard → Workers & Pages
   → `harshalos` → Settings → Variables and Secrets, or `wrangler.jsonc`).
   The publication slice keeps running on the Cron Trigger, so the served
   document stays current, but the Worker stops claiming provider calls.
3. Confirm the beats are the runner's: the field document's `source` column and
   `X-Orb2-Field` header read `github-actions`, and `status.lastTickAt` keeps
   moving between runner fires.
4. To go back: delete `ORB2_FIELD_TICK=off`. The Worker's own tick resumes on
   the next minute; nothing else changes.

Both tickers share one lease in D1 (`orb2_field_runs.lock_owner`), so even if
both are enabled they cannot beat the same lane in the same minute. The Worker
tick stays on by default precisely so that a repository with no secrets keeps
beating on its own.

## Cost

- **Cloudflare:** $0 either way. The runner writes to the same D1 database and
  its traffic counts against the same free daily rows-read/rows-written
  budgets; one runner fire is a few hundred rows in total.
- **GitHub Actions:** the job checks out the repository and runs Node — it
  deliberately skips `npm ci`, because every import in the runner's chain
  resolves inside this repository. A fire costs roughly 15–30 seconds of
  runner time. At `*/5` that is on the order of 400–900 minutes a month, which
  fits the 2,000 free minutes a private repository gets; tighten it by lowering
  `ORB2_RUNNER_ITERATIONS` or by accepting a sparser beat rotation.
- The five-minute cadence is GitHub's floor for `schedule`, and GitHub may
  delay a scheduled run under load. That is why the Worker keeps its own
  publication slice: a delayed or disabled runner can never freeze the served
  document, only slow the beats.

## Reading a run

Each fire logs one line per tick and one for the publication:

```
2026-10-12T04:05:12.001Z providers: MASSIVE_API_KEY, TICKERBOT_API_KEY
2026-10-12T04:05:14.882Z tick 1/1: 3 observed, 0 held, 4 provider calls, 4 work units, 12 reads / 9 writes, 2881 ms
2026-10-12T04:05:21.004Z publish: ok in 6122 ms — 15m, 1h, 1d
2026-10-12T04:05:21.006Z done: 9005 ms total
```

- A **non-zero exit** means either the tick or the publication reported an
  error, and the failure lines are printed at the end.
- A provider lane's own failure (a held berth, a rate limit) is a warning, not
  a run failure: the scheduler's rotation advances past it and the next fire
  retries.
- Wall-clock milliseconds are fine here — this is a Node process, not a Worker
  isolate. `cpuTimeMs` remains the measurement of record for the Worker's own
  invocations.

## Boundaries

- The runner is a *scheduler driver*, not a second source of truth: it writes
  observations into `orb2_field_observations` and publishes
  `orb2_field_snapshots` through the same modules, so the served field cannot
  disagree with the Worker's own build.
- It never reads a provider from a browser and never touches a database its
  secrets do not name. A token scoped to one account with one database id in
  the environment is the whole authority it has.
- An unset `ORB2_D1_DATABASE_NAME` still means "the id the secrets gave". Set
  the name variable when the account holds more than one database — that is the
  guard against a copied secret pointing a staging workflow at production.
