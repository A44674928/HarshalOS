/* Orb 2 company-feed cut. With ORB2_COMPANY_FEEDS unset, the Orb 2 pipeline calls no
   company provider and touches no database. Every provider fetch is a spy that fails
   the test, and every database handle throws if it is used. */
import assert from "node:assert/strict";
import test from "node:test";
import { orb2CompanyFeedsEnabled, ORB2_COMPANY_FEEDS_CUT_MESSAGE, refuseCompanyFetch } from "../worker/orb2-company-feed-gate.mjs";
import { runOrb2FieldTick, handleOrb2Field } from "../worker/orb2-field.mjs";
import { handleGoodIntelligenceTickerbot } from "../worker/good-intelligence-tickerbot.mjs";

const ORIGIN = "https://os.example";
const NOW = Date.parse("2026-10-11T12:00:00.000Z");

function providerSpy() {
  const calls = [];
  const fetch = async (url) => {
    calls.push(String(url));
    throw new Error(`provider reached while the cut holds: ${url}`);
  };
  return { calls, fetch };
}

function touchedDb() {
  const touches = [];
  return {
    touches,
    prepare(sql) {
      touches.push(String(sql));
      throw new Error("D1 was touched while the company-feed cut holds");
    }
  };
}

test("the feed switch is closed by default and opens only for the exact value on", () => {
  assert.equal(orb2CompanyFeedsEnabled({}), false, "unset is off");
  assert.equal(orb2CompanyFeedsEnabled(null), false);
  assert.equal(orb2CompanyFeedsEnabled({ ORB2_COMPANY_FEEDS: "" }), false);
  assert.equal(orb2CompanyFeedsEnabled({ ORB2_COMPANY_FEEDS: "1" }), false, "only the word on opens it");
  assert.equal(orb2CompanyFeedsEnabled({ ORB2_COMPANY_FEEDS: "off" }), false);
  assert.equal(orb2CompanyFeedsEnabled({ ORB2_COMPANY_FEEDS: "on" }), true);
  assert.equal(orb2CompanyFeedsEnabled({ ORB2_COMPANY_FEEDS: " ON " }), true);
});

test("the cut provider fetch refuses every request", async () => {
  await assert.rejects(refuseCompanyFetch()("https://api.massive.com/v2/aggs"), new RegExp(ORB2_COMPANY_FEEDS_CUT_MESSAGE.slice(0, 30)));
});

test("the scheduled and manual tick do nothing while the cut holds: no provider call, no database", async () => {
  const spy = providerSpy();
  const db = touchedDb();
  const env = { COMMUNITY_DB: db, MASSIVE_API_KEY: "k", TICKERBOT_API_KEY: "k", ALPHA_VANTAGE_API_KEY: "k" };
  const summary = await runOrb2FieldTick(env, null, { now: () => NOW, fetch: spy.fetch });
  assert.equal(summary.companyFeedsCut, true);
  assert.equal(summary.ok, false);
  assert.ok(summary.errors.includes(ORB2_COMPANY_FEEDS_CUT_MESSAGE));
  assert.equal(spy.calls.length, 0, "no company was contacted");
  assert.equal(db.touches.length, 0, "no D1 claim, lease, or write was attempted");
});

test("the field route refuses POST actions while the cut holds, and nothing is enqueued", async () => {
  const db = touchedDb();
  const request = new Request(`${ORIGIN}/api/good-intelligence/v1/orb2/field`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify({ schema: "gi-orb2-field-request-v1", action: "tick", interval: "1d" })
  });
  const response = await handleOrb2Field(request, { COMMUNITY_DB: db }, { now: () => NOW, fetch: providerSpy().fetch });
  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.ok(JSON.stringify(payload).includes("Company feeds are cut"), "the refusal says why");
  assert.equal(db.touches.length, 0, "no queue row was written");
});

test("the Tickerbot market route refuses while the cut holds, even with a key present", async () => {
  const spy = providerSpy();
  const request = new Request(`${ORIGIN}/api/good-intelligence/v1/market/tickerbot/bars?symbol=AAPL&interval=1h`);
  const response = await handleGoodIntelligenceTickerbot(request, { TICKERBOT_API_KEY: "test-only-key" }, { now: () => NOW, fetch: spy.fetch });
  assert.equal(response.status, 503);
  assert.equal(spy.calls.length, 0, "api.tickerbot.io was not contacted");
});

test("with the switch on, the same tick does reach the providers (the cut is the only thing stopping them)", async () => {
  const spy = providerSpy();
  const env = { COMMUNITY_DB: touchedDb(), ORB2_COMPANY_FEEDS: "on" };
  const summary = await runOrb2FieldTick(env, null, { now: () => NOW, fetch: spy.fetch });
  assert.equal(summary.companyFeedsCut, undefined, "the cut is not reported when the feeds are on");
  assert.ok(!summary.errors.includes(ORB2_COMPANY_FEEDS_CUT_MESSAGE));
});
