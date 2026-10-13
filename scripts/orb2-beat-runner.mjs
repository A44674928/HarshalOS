#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Orb 2 beat runner (off-Cloudflare, still $0)

   The free Workers plan gives a Cron Trigger 10 ms of CPU. The field's
   provider beats are the part of the tick that will not fit there on a large
   roster, so this script runs them where the budget is a GitHub Actions job
   instead of a Cron Trigger, against the same D1 database the Worker serves
   from:

     1. Claim the tick (the scheduler's own lease, the same one the Worker's
        Cron Trigger takes, so the two can never beat the same lane twice).
     2. Beat whatever the scheduler's rotation says is due.
     3. Publish the field documents — the same sliced build the Cron Trigger
        runs, run to completion because a runner has minutes, not 10 ms.

   Configuration. Everything comes from the environment, and the runner is
   inert until it names a database:

     ORB2_D1_DATABASE_ID     required — the database this run may write to
     CLOUDFLARE_ACCOUNT_ID   required — together with the id it names the target
     CLOUDFLARE_API_TOKEN    required — needs D1 Edit on that account
     ORB2_D1_DATABASE_NAME   optional — a name that database has to answer to,
                                       so a wrong id fails closed instead of
                                       writing to somebody else's database
     MASSIVE_API_KEY / TWELVEDATA_API_KEY / TICKERBOT_API_KEY /
     ALPHA_VANTAGE_API_KEY   optional — a lane without its key is skipped
     ORB2_RUNNER_ITERATIONS  optional — tick cycles per run (default 1)
     ORB2_RUNNER_PUBLISH     optional — `off` skips the publication step

   Usage:
     node scripts/orb2-beat-runner.mjs             run it
     node scripts/orb2-beat-runner.mjs --dry-run   verify the guards, write nothing

   See `docs/deployment/ORB2-BEAT-RUNNER.md` for the switch-over procedure and
   the Actions-minutes arithmetic.
   ═══════════════════════════════════════════════════════════════ */

import { ORB2_FIELD_INTERVALS, runOrb2FieldTick } from "../worker/orb2-field.mjs";
import { publishOrb2FieldDocument } from "../worker/orb2-field-publish.mjs";
import { assertD1DatabaseName, createD1HttpClient } from "./orb2-d1-client.mjs";

const REQUIRED = ["ORB2_D1_DATABASE_ID", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"];
const PROVIDER_KEYS = ["MASSIVE_API_KEY", "TWELVEDATA_API_KEY", "TICKERBOT_API_KEY", "ALPHA_VANTAGE_API_KEY"];
const readEnv = name => String(process.env[name] === undefined ? "" : process.env[name]).trim();
const off = value => value.trim().toLowerCase() === "off";

const dryRun = process.argv.slice(2).includes("--dry-run");
const missing = REQUIRED.filter(name => !readEnv(name));
if (missing.length) {
  /* Inert by design: an unconfigured run reads nothing and writes nothing. It is
     a successful run, because a repository that has not connected Cloudflare yet
     is the normal state of this workflow, not a failure. */
  console.log(`Orb 2 beat runner is inert: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not configured.`);
  console.log("Nothing was read or written. See docs/deployment/ORB2-BEAT-RUNNER.md.");
  process.exit(0);
}

const accountId = readEnv("CLOUDFLARE_ACCOUNT_ID");
const databaseId = readEnv("ORB2_D1_DATABASE_ID");
const apiToken = readEnv("CLOUDFLARE_API_TOKEN");
const expectedName = readEnv("ORB2_D1_DATABASE_NAME");
const publishEnabled = !off(readEnv("ORB2_RUNNER_PUBLISH") || "on");
const iterations = Math.max(1, Math.min(12, Math.floor(Number(readEnv("ORB2_RUNNER_ITERATIONS")) || 1)));

const started = Date.now();
const log = (step, detail) => console.log(`${new Date().toISOString()} ${step}${detail ? `: ${detail}` : ""}`);

/* The name guard is the difference between "these secrets point at a database"
   and "these secrets point at the database I meant". It is optional so a first
   run can be deliberate, and it fails closed when it is set. */
const described = await assertD1DatabaseName({ accountId, databaseId, apiToken, expectedName })
  .catch(error => {
    console.error(`Refusing to run: ${error.message}`);
    process.exit(1);
  });
if (described) log("database", `${described.name} (${databaseId})`);

if (dryRun) {
  log("dry run", `would tick ${iterations}× and ${publishEnabled ? "publish " + ORB2_FIELD_INTERVALS.join(", ") : "skip the publication"}`);
  process.exit(0);
}

const db = createD1HttpClient({ accountId, databaseId, apiToken });
const env = { COMMUNITY_DB: db };
const provided = PROVIDER_KEYS.filter(name => readEnv(name));
for (const name of provided) env[name] = readEnv(name);
log("providers", provided.length ? provided.join(", ") : "none (every provider lane will be skipped)");

const failures = [];
for (let iteration = 1; iteration <= iterations; iteration += 1) {
  const tickStarted = Date.now();
  const summary = await runOrb2FieldTick(env, null, { now: () => Date.now() }).catch(error => ({
    ok: false, errors: [String((error && error.message) || error)]
  }));
  const elapsed = Date.now() - tickStarted;
  if (summary.ok !== true) {
    failures.push(`tick ${iteration}: ${(summary.errors || []).slice(0, 3).join(" | ") || "unknown scheduler error"}`);
    console.error(`[orb2-runner] tick ${iteration} failed after ${elapsed} ms:`, failures[failures.length - 1]);
    break;
  }
  log(`tick ${iteration}/${iterations}`, [
    `${summary.observed || 0} observed`, `${summary.held || 0} held`,
    `${summary.providerRequests || 0} provider calls`, `${summary.workUnits || 0} work units`,
    `${summary.d1Reads || 0} reads / ${summary.d1Writes || 0} writes`,
    `${elapsed} ms`
  ].join(", "));
  /* Per-provider counts, so the log shows who spent the calls. Zero counts are omitted. */
  const byProvider = [
    ["massive", summary.massiveCalls], ["twelvedata", summary.twelvedataCalls],
    ["tickerbot", summary.tickerbotCalls], ["kraken", summary.krakenCalls],
    ["alphavantage", summary.alphaVantageCalls]
  ].filter(([, count]) => Number(count) > 0).map(([name, count]) => `${name} ${count}`);
  if (byProvider.length) log(`tick ${iteration}/${iterations} calls by provider`, byProvider.join(", "));
  if (Array.isArray(summary.errors) && summary.errors.length) {
    /* A per-lane provider failure is not a runner failure: the rotation advances
       past it and the next fire retries. It is still worth seeing in the log. */
    console.warn(`[orb2-runner] tick ${iteration} notes:`, summary.errors.slice(0, 3).join(" | "));
  }
}

if (publishEnabled) {
  const publishStarted = Date.now();
  const publication = await publishOrb2FieldDocument(env, { now: Date.now(), source: "github-actions" });
  log("publish", `${publication.ok ? "ok" : "failed"} in ${Date.now() - publishStarted} ms` +
    ` — ${publication.intervals.map(entry => `${entry.interval}${entry.published ? "" : " (not published)"}`).join(", ")}`);
  if (!publication.ok) failures.push(...publication.errors.slice(0, 3));
}

log("done", `${Date.now() - started} ms total${failures.length ? `, ${failures.length} failure(s)` : ""}`);
if (failures.length) {
  for (const failure of failures) console.error(`[orb2-runner] ${failure}`);
  process.exit(1);
}
