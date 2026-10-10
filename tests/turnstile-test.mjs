/* Node harness: Turnstile human verification for public writes.
   Unit tests cover worker/turnstile.mjs with mock fetchers; enforcement tests
   drive publish/report through worker.fetch with the siteverify endpoint
   stubbed (no network). Run: node --test tests/turnstile-test.mjs */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import worker from "../worker/index.mjs";
import { auditTemplate } from "../worker/community-audit.mjs";
import { digest } from "../worker/community-auth.mjs";
import {
  TURNSTILE_VERIFY_URL,
  turnstileConfigured,
  turnstileStatus,
  verifyTurnstile
} from "../worker/turnstile.mjs";

const origin = "https://os.example";
const SECRET = "test-turnstile-secret";
const SITE_KEY = "test-turnstile-site-key";

function stubSiteverify(t, handler) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: String(options?.body || ""), signal: options?.signal });
    return handler(calls.length, options);
  };
  t.after(() => { globalThis.fetch = real; });
  return calls;
}

const verifyResponse = (payload, status = 200) => Response.json(payload, { status });

test("Turnstile: the verifier posts the secret and token to the fixed siteverify origin", async t => {
  const calls = stubSiteverify(t, () => verifyResponse({ success: true, hostname: "os.example" }));
  const result = await verifyTurnstile({ env: { TURNSTILE_SECRET_KEY: SECRET, COMMUNITY_ORIGIN: origin }, token: "widget-token", ip: "192.0.2.1" });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, TURNSTILE_VERIFY_URL);
  assert.ok(calls[0].body.includes(`secret=${encodeURIComponent(SECRET)}`));
  assert.ok(calls[0].body.includes("response=widget-token"));
  assert.ok(calls[0].body.includes("remoteip=192.0.2.1"));
});

test("Turnstile: failures split into retryable outages and final refusals", async t => {
  const env = { TURNSTILE_SECRET: SECRET, COMMUNITY_ORIGIN: origin };
  assert.equal((await verifyTurnstile({ env, token: "  " })).code, "turnstile-missing");
  assert.equal((await verifyTurnstile({ env: { COMMUNITY_ORIGIN: origin }, token: "x" })).code, "turnstile-misconfigured");
  const refused = await verifyTurnstile({ env, token: "bad", fetcher: async () => verifyResponse({ success: false, "error-codes": ["invalid-input-response"] }) });
  assert.equal(refused.ok, false);
  assert.equal(refused.retryable, false);
  const wrongHost = await verifyTurnstile({ env, token: "foreign", fetcher: async () => verifyResponse({ success: true, hostname: "evil.example" }) });
  assert.equal(wrongHost.code, "turnstile-invalid");
  const down = await verifyTurnstile({ env, token: "x", fetcher: async () => { throw new Error("socket hangup"); } });
  assert.equal(down.code, "turnstile-unreachable");
  assert.equal(down.retryable, true);
  const hanging = await verifyTurnstile({ env, token: "x", timeoutMs: 20, fetcher: () => new Promise(() => {}) });
  assert.equal(hanging.code, "turnstile-unreachable");
});

test("Turnstile: configuration helpers never disclose the secret", () => {
  assert.equal(turnstileConfigured({}), false);
  assert.equal(turnstileConfigured({ TURNSTILE_SECRET_KEY: "  " }), false);
  assert.equal(turnstileConfigured({ TURNSTILE_SECRET_KEY: SECRET }), true);
  assert.deepEqual(turnstileStatus({}), { required: false, siteKey: "" });
  assert.deepEqual(turnstileStatus({ TURNSTILE_SECRET_KEY: SECRET, TURNSTILE_SITE_KEY: SITE_KEY }), { required: true, siteKey: SITE_KEY });
  assert.ok(!JSON.stringify(turnstileStatus({ TURNSTILE_SECRET_KEY: SECRET })).includes(SECRET));
});

async function fixture(t, extraEnv = {}) {
  const sql = new DatabaseSync(":memory:");
  t.after(() => sql.close());
  sql.exec("PRAGMA foreign_keys=ON");
  for (const file of ["0001_private_drafts.sql", "0002_auth_sessions.sql", "0003_private_runs.sql", "0004_publication.sql"]) {
    sql.exec(readFileSync(new URL("../migrations/community/" + file, import.meta.url), "utf8"));
  }
  const db = {
    prepare(text) {
      let args = [];
      const q = {
        bind(...a) { args = a; return q; },
        async run() { return sql.prepare(text).run(...args); },
        async first() { return sql.prepare(text).get(...args) ?? null; },
        async all() { return { results: sql.prepare(text).all(...args) }; }
      };
      return q;
    },
    async batch(statements) {
      sql.exec("BEGIN");
      try { const results = statements.map(q => sql.prepare(q.text ?? "").run(...(q.args ?? []))); sql.exec("COMMIT"); return results; }
      catch (error) { sql.exec("ROLLBACK"); throw error; }
    }
  };
  const now = Math.floor(Date.now() / 1000);
  for (const id of ["alice", "moderator"]) {
    sql.prepare("INSERT INTO community_users VALUES(?,?,?,0,?)").run(id, "https://issuer.example/", id, now * 1000);
    sql.prepare("INSERT INTO community_sessions VALUES(?,?,?,?,?,?)").run(await digest(id[0].repeat(43)), id, "https://issuer.example/", "client", now, now + 86400);
  }
  const env = {
    COMMUNITY_ENABLED: "true", COMMUNITY_DB: db, COMMUNITY_ORIGIN: origin,
    OIDC_ISSUER: "https://issuer.example/", OIDC_CLIENT_ID: "client", OIDC_CLIENT_SECRET: "secret",
    COMMUNITY_RATE_SECRET: "r".repeat(64), OIDC_ADMIN_SUBJECTS: "moderator", ...extraEnv
  };
  async function call(path, { method = "GET", user = "alice", data, requestOrigin = origin } = {}) {
    const headers = { "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" };
    if (user) headers.Cookie = "__Host-hos_session=" + user[0].repeat(43);
    if (requestOrigin) headers.Origin = requestOrigin;
    return worker.fetch(new Request(origin + "/api/community/" + path, { method, headers, body: data ? JSON.stringify(data) : undefined }), env);
  }
  const input = auditTemplate();
  input.name = "Public entity";
  input.cutoff = "2026-10-02";
  const draft = (await (await call("drafts", { method: "POST", data: { title: "Draft", input, privateNotes: "" } })).json()).draft;
  const run = (await (await call(`drafts/${draft.id}/runs`, { method: "POST", data: { revision: 1 } })).json()).run;
  const preview = await (await call("public-preview", { method: "POST", data: { runId: run.id, input, author: "Pseudonym" } })).json();
  return { env, call, preview };
}

test("Turnstile: status discloses the requirement and site key, never the secret", async t => {
  const plain = await fixture(t);
  assert.deepEqual((await (await plain.call("status", { user: null })).json()).turnstile, { required: false, siteKey: "" });
  const guarded = await fixture(t, { TURNSTILE_SECRET_KEY: SECRET, TURNSTILE_SITE_KEY: SITE_KEY });
  const status = await (await guarded.call("status", { user: null })).json();
  assert.deepEqual(status.turnstile, { required: true, siteKey: SITE_KEY });
  assert.ok(!JSON.stringify(status).includes(SECRET));
});

test("Turnstile: publishing is refused without a token and allowed with a verified one", async t => {
  const f = await fixture(t, { TURNSTILE_SECRET_KEY: SECRET, TURNSTILE_SITE_KEY: SITE_KEY });
  const missing = await f.call("publish", { method: "POST", data: { token: f.preview.token, acknowledgement: "PUBLISH_PUBLIC_UNREVIEWED" } });
  assert.equal(missing.status, 403);
  assert.match((await missing.json()).error, /human verification/i);

  const calls = stubSiteverify(t, async (_n, options) => verifyResponse(
    options.body.includes("response=good-token") ? { success: true, hostname: "os.example" } : { success: false }
  ));
  const refused = await f.call("publish", { method: "POST", data: { token: f.preview.token, acknowledgement: "PUBLISH_PUBLIC_UNREVIEWED", turnstileToken: "bad-token" } });
  assert.equal(refused.status, 403);
  const response = await f.call("publish", { method: "POST", data: { token: f.preview.token, acknowledgement: "PUBLISH_PUBLIC_UNREVIEWED", turnstileToken: "good-token" } });
  assert.equal(response.status, 201);
  assert.equal(calls.length, 2);
});

test("Turnstile: a siteverify outage fails closed with a retryable 503 and publishes nothing", async t => {
  const f = await fixture(t, { TURNSTILE_SECRET_KEY: SECRET, TURNSTILE_SITE_KEY: SITE_KEY });
  stubSiteverify(t, async () => { throw new Error("connection reset"); });
  const response = await f.call("publish", { method: "POST", data: { token: f.preview.token, acknowledgement: "PUBLISH_PUBLIC_UNREVIEWED", turnstileToken: "good-token" } });
  assert.equal(response.status, 503);
  const publications = await (await f.call("publications", { user: null })).json();
  assert.equal(publications.publications.length, 0);
});

test("Turnstile: reports carry the same requirement once a report is public", async t => {
  const f = await fixture(t, { TURNSTILE_SECRET_KEY: SECRET, TURNSTILE_SITE_KEY: SITE_KEY });
  stubSiteverify(t, () => verifyResponse({ success: true, hostname: "os.example" }));
  const publication = (await (await f.call("publish", { method: "POST", data: { token: f.preview.token, acknowledgement: "PUBLISH_PUBLIC_UNREVIEWED", turnstileToken: "good-token" } })).json()).publication;
  const missing = await f.call(`publications/${publication.id}/report`, { method: "POST", data: { details: "A concern." } });
  assert.equal(missing.status, 403);
  const sent = await f.call(`publications/${publication.id}/report`, { method: "POST", data: { details: "A concern.", turnstileToken: "good-token" } });
  assert.deepEqual(await sent.json(), { reported: true });
});

test("Turnstile: unconfigured deployments publish and report exactly as before", async t => {
  const f = await fixture(t);
  const publication = (await (await f.call("publish", { method: "POST", data: { token: f.preview.token, acknowledgement: "PUBLISH_PUBLIC_UNREVIEWED" } })).json()).publication;
  assert.equal(publication.state, "published");
  const sent = await f.call(`publications/${publication.id}/report`, { method: "POST", data: { details: "A concern." } });
  assert.deepEqual(await sent.json(), { reported: true });
});

test("Turnstile: the account/register CSP admits the widget only when a site key is set", async t => {
  const locked = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; object-src 'none'; frame-ancestors 'none'";
  const assets = { fetch: async () => new Response("<!doctype html><title>x</title>", { headers: { "Content-Type": "text/html" } }) };
  const plain = await worker.fetch(new Request(origin + "/account"), { COMMUNITY_ENABLED: "true", ASSETS: assets });
  assert.equal(plain.headers.get("Content-Security-Policy"), locked);
  const guarded = await worker.fetch(new Request(origin + "/audits"), { COMMUNITY_ENABLED: "true", TURNSTILE_SITE_KEY: SITE_KEY, ASSETS: assets });
  const csp = guarded.headers.get("Content-Security-Policy");
  assert.match(csp, /script-src 'self' https:\/\/challenges\.cloudflare\.com/);
  assert.match(csp, /frame-src https:\/\/challenges\.cloudflare\.com/);
  assert.match(csp, /frame-ancestors 'none'/);
});
