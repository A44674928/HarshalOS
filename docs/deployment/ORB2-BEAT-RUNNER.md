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

## Running it on your own Mac instead

The runner has no third-party imports. Its whole import chain is 29 files in
this repository plus Node built-ins, so there is no `npm ci` and no build step:
a `git clone` is the installation. That makes a Mac a workable beat host, and
it avoids the Actions-minute arithmetic above entirely. A tick costs
electricity and nothing else, so the cadence can be one minute rather than five.

Use one ticker at a time. Both tickers share the D1 lease, so an overlap is
harmless, but the runner exits **1** with `already-running` and logs a red
line each time it loses the lease.

### 1. Install

Node 22 or later is what CI and the tests use. Node 18 or later also works.

```sh
node --version
git clone https://github.com/A44674928/HarshalOS.git ~/HarshalOS
```

Create a Cloudflare API token (My Profile → API Tokens → Create Custom Token)
with `Account → D1 → Edit`, scoped to the one account. It is the same token as
the Actions path.

### 2. Secrets file, outside the checkout

Keep the secrets in `~/.orb2/env`, not in the repository. `.env` is covered by
`.gitignore`, but `git clean -xfd` deletes ignored files, so the file is safer
outside the checkout altogether.

```sh
mkdir -p ~/.orb2 && chmod 700 ~/.orb2
cat > ~/.orb2/env <<'EOF'
CLOUDFLARE_ACCOUNT_ID=<your account id>
CLOUDFLARE_API_TOKEN=<the D1 Edit token>
ORB2_D1_DATABASE_ID=ea508a07-e00c-4d41-a657-428937ba8110
ORB2_D1_DATABASE_NAME=community_db
MASSIVE_API_KEY=<same value the Worker uses>
TICKERBOT_API_KEY=<same value the Worker uses>
ORB2_RUNNER_PUBLISH=off
EOF
chmod 600 ~/.orb2/env
```

> **Delete any optional key you do not have; do not leave its placeholder.**
> The runner treats any non-empty value as configured. A line such as
> `TWELVEDATA_API_KEY=<optional>` is not skipped: the literal string
> `<optional>` is sent to the provider as a key. Add `TWELVEDATA_API_KEY` or
> `ALPHA_VANTAGE_API_KEY` only when you have a real value for it.

`ORB2_RUNNER_PUBLISH=off` is the recommended setting for a Mac. The Worker's
Cron Trigger keeps publishing the document, which fits its 10 ms budget, so the
served field stays fresh while the Mac sleeps. The Mac only beats. The two
never build the same document twice. It also means the publication step never
runs on the Mac, so the `github-actions` source label described above does not
appear for Mac beats.

### 3. Test before scheduling

```sh
cd ~/HarshalOS
node scripts/orb2-beat-runner.mjs --dry-run      # resolves the guards, writes nothing
set -a; source ~/.orb2/env; set +a
node scripts/orb2-beat-runner.mjs                # one real tick
```

A healthy tick prints `tick 1/1: N observed, …, X ms`. Only then flip the
Worker over, in this order:

1. Dashboard → **Workers & Pages → harshalos → Settings → Variables and
   Secrets** → `ORB2_FIELD_TICK` = `off` → Save.

Doing it the other way round means a runner fire while the Worker tick holds
the lease returns `already-running`, which exits 1. That is safe, but red.

### 4. Schedule it with launchd

`~/.orb2/run-beat.sh`, made executable with `chmod 700`:

```sh
#!/bin/zsh
set -euo pipefail
set -a; source "$HOME/.orb2/env"; set +a
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
exec /usr/bin/env node "$HOME/HarshalOS/scripts/orb2-beat-runner.mjs"
```

`~/Library/LaunchAgents/com.harshalos.orb2beat.plist`, with `YOU` replaced by
your short username:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.harshalos.orb2beat</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-l</string>
    <string>-c</string>
    <string>exec "$HOME/.orb2/run-beat.sh"</string>
  </array>
  <key>StartInterval</key><integer>60</integer>
  <key>RunAtLoad</key><true/>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>/Users/YOU/Library/Logs/orb2-beat.log</string>
  <key>StandardErrorPath</key><string>/Users/YOU/Library/Logs/orb2-beat.log</string>
</dict>
</plist>
```

```sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.harshalos.orb2beat.plist
launchctl list | grep orb2beat                # loaded; the second column is the last exit status
tail -f ~/Library/Logs/orb2-beat.log          # one block per minute
```

To stop it, run `launchctl bootout gui/$(id -u)/com.harshalos.orb2beat`. To
restart it, bootstrap the plist again. launchd does not start a second copy
while one is still running, and `StartInterval` does not hot-loop after a
failure.

Keep the checkout current with `git pull` now and then. The runner executes
whatever is in the checkout.

### 5. Sleep

A sleeping Mac beats nothing. launchd coalesces missed intervals and does not
replay the ticks it missed. That is survivable, because the rotation is
age-based: on wake it resumes where it stopped, and the field catches up over
the following rotations. The lane cursors are persisted before each provider
call, so an interruption does not corrupt anything.

To keep the Mac awake on power:

```sh
sudo pmset -c sleep 0        # never sleep on the power adapter
pmset -g                     # verify: "sleep 0" under AC Power
```

A closed lid sleeps on Apple Silicon unless the Mac is in clamshell mode with an
external display and power. The simplest reliable setup is to keep the lid
open. To let the display sleep while the machine stays awake, run the wrapper
under `caffeinate -s`, or enable *Prevent automatic sleeping on power adapter
when the display is off* in System Settings.

### 6. Knowing it is alive

- **Log:** one block per minute in `~/Library/Logs/orb2-beat.log`, a few
  hundred KB a day. Trim it monthly.
- **Field:** `https://<your-domain>/api/good-intelligence/v1/orb2/field`.
  `status.lastTickAt` should be within a minute or two. Because the Worker's own
  tick is off, that is the number an uptime monitor should read, and "stuck"
  means more than 15 minutes without an advance (see `UPTIME-MONITORING.md`).
- **D1:**

  ```sh
  npx wrangler d1 execute COMMUNITY_DB --remote --command "SELECT last_tick_at, sweeps_completed FROM orb2_field_runs WHERE utc_day = date('now');"
  ```

### Provider limits and what the code enforces

| Provider | Plan limit | Enforced where |
| --- | --- | --- |
| Massive | 5 requests/minute per asset class (Options, Indices, Currencies, Stocks, Futures) | Per-minute window in `worker/massive.mjs`, per isolate or process. The daily count in `massive_daily_call_ledger` is telemetry only and refuses nothing. |
| Twelve Data | 800 API credits/day (Basic); 8/minute | Per-minute window in `worker/twelvedata-call-guard.mjs`. The daily allowance in `twelvedata_daily_credit_ledger` (migration 0019), charged one credit per call before the request, including failed calls. |
| Tickerbot | 10,000 calls/month | `tickerbot_call_ledger`, one row per UTC month, claimed before each call. |
| Kraken public | one request/second; daily ceiling | `kraken_public_call_ledger`. |
| Alpha Vantage | daily allowance | `alpha_vantage_daily_call_ledger`. |

The Massive and Twelve Data windows are not shared across the Worker and the runner
processes; each one keeps its own. The provider's own 429 response remains the final
word. Only one ticker runs at a time (the D1 lease), so in practice the windows do not
overlap. The durable ledgers (Twelve Data, Tickerbot, Kraken, Alpha Vantage) are shared
through D1 and cover both tickers.

Each tick's log now includes the calls by provider, for example
`tick 1/1 calls by provider: massive 4, tickerbot 1`.

Twelve Data's day is the UTC day in this code. Twelve Data's own reset time is not
documented in the code, so confirm it with the provider before relying on the boundary.

### Limits

- A **user** LaunchAgent runs only while you are logged in. If macOS reboots to
  the login window, beats pause until you log in. A system LaunchDaemon would
  run without login, but as root, so it is not recommended for a Mac you use
  yourself.
- macOS updates, a battery drained to sleep, and closed-lid sessions all pause
  beats. All of them are recoverable, and none corrupts state.
- The Mac is a single point of failure for the beats only. The Worker still
  publishes the document when the Mac is asleep, so the field goes stale, not
  wrong. If you want a fallback, the GitHub workflow can run alongside at a
  sparse cadence such as `*/30`, so it does not spend the Actions allowance.

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
