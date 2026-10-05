/* Massive Futures active-contract discovery: strict validation, D1 scope and fail-closed retries. */

import assert from "node:assert/strict";
import test from "node:test";
import {
  MASSIVE_FUTURES_CONTRACT_CACHE_TTL_MS,
  MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS,
  getMassiveActiveFuturesContract,
  normalizeMassiveActiveFuturesContract,
  readMassiveFuturesContractState,
  resetMassiveFuturesContractFlightsForTests
} from "../worker/characters-futures-contracts.mjs";
import { createTickerbotLedgerDb } from "./helpers/tickerbot-ledger-db.mjs";

const NOW = Date.parse("2026-10-05T12:00:00.000Z");
const KEY = "massive-contract-test-key";
const activeRow = (overrides = {}) => ({
  ticker: "CLX6", product_code: "CL", active: true, type: "single",
  date: "2026-10-05", last_trade_date: "2026-11-20", days_to_maturity: 46,
  name: "WTI crude oil", ...overrides
});
const reservation = async () => ({ ok: true });

function fixture(t) {
  const created = createTickerbotLedgerDb();
  t.after(() => created.sql.close());
  return created;
}

test("the contract normalizer chooses the nearest valid active single and rejects unsupported rows", () => {
  const contract = normalizeMassiveActiveFuturesContract({ results: [
    activeRow({ ticker: "CLZ6", last_trade_date: "2026-12-20", name: "Later WTI" }),
    activeRow({ ticker: "CLX6", last_trade_date: "2026-11-20" }),
    activeRow({ ticker: "CLV6", active: false }),
    activeRow({ ticker: "NGX6", product_code: "NG" }),
    activeRow({ ticker: "CLX6", type: "spread" }),
    activeRow({ ticker: "CLX6", last_trade_date: "2026-10-04" }),
    activeRow({ ticker: "CLX6", date: "2026-10-04" })
  ] }, { productCode: "cl", date: "2026-10-05" });
  assert.deepEqual(contract, {
    ticker: "CLX6", productCode: "CL", provider: "Massive", asOfDate: "2026-10-05",
    lastTradeDate: "2026-11-20", daysToMaturity: 46, name: "WTI crude oil"
  });
  const optionalMaturityOmitted = normalizeMassiveActiveFuturesContract({
    results: [activeRow({ days_to_maturity: null })]
  }, { productCode: "CL", date: "2026-10-05" });
  assert.equal(Object.hasOwn(optionalMaturityOmitted, "daysToMaturity"), false,
    "a missing provider maturity value stays missing instead of becoming zero");
  assert.equal(normalizeMassiveActiveFuturesContract({ results: [activeRow({ active: "false" })] }, {
    productCode: "CL", date: "2026-10-05"
  }), null);
  assert.equal(normalizeMassiveActiveFuturesContract({ results: [activeRow({ ticker: "CLX6", product_code: "NG" })] }, {
    productCode: "CL", date: "2026-10-05"
  }), null);
  assert.equal(normalizeMassiveActiveFuturesContract({ results: [activeRow({ date: "" })] }, {
    productCode: "CL", date: "2026-10-05"
  }), null, "the point-in-time row must identify the date that was requested");
  assert.equal(normalizeMassiveActiveFuturesContract({ next_url: "https://api.massive.com/futures/v1/contracts?cursor=…", results: [activeRow()] }, {
    productCode: "CL", date: "2026-10-05"
  }), null, "a partial paginated result set is not treated as a complete active roster");
  assert.equal(normalizeMassiveActiveFuturesContract({ results: [activeRow()] }, {
    productCode: "CL", date: "2026-02-31"
  }), null);
});

test("active contract discovery uses Massive's date/product filters and caches only through UTC midnight", async t => {
  resetMassiveFuturesContractFlightsForTests();
  const { db, sql } = fixture(t);
  const calls = [];
  let reservations = 0;
  const fetcher = async (input, options) => {
    const url = new URL(input);
    calls.push({ url, options });
    return Response.json({ results: [activeRow()] });
  };
  const result = await getMassiveActiveFuturesContract({
    productCode: "CL", apiKey: KEY, db, fetcher, now: NOW,
    beforeFetch: async () => { reservations += 1; return reservation(); }
  });
  assert.equal(result.ok, true);
  assert.equal(result.cached, false);
  assert.equal(reservations, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin, "https://api.massive.com");
  assert.equal(calls[0].url.pathname, "/futures/v1/contracts");
  assert.equal(calls[0].url.searchParams.get("product_code"), "CL");
  assert.equal(calls[0].url.searchParams.get("date"), "2026-10-05");
  assert.equal(calls[0].url.searchParams.get("active"), "true");
  assert.equal(calls[0].url.searchParams.get("type"), "single");
  assert.equal(calls[0].url.searchParams.get("limit"), "100");
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${KEY}`);
  assert.equal(calls[0].url.searchParams.has("apiKey"), false);
  assert.equal(MASSIVE_FUTURES_CONTRACT_CACHE_TTL_MS, 24 * 60 * 60_000);

  const row = sql.prepare("SELECT contract_json, source_date, expires_at FROM massive_futures_contract_cache WHERE product_code='CL'").get();
  assert.equal(row.source_date, "2026-10-05");
  assert.equal(row.expires_at, Date.parse("2026-10-06T00:00:00.000Z"));
  assert.equal(JSON.parse(row.contract_json).provider, "Massive");

  const cached = await getMassiveActiveFuturesContract({
    productCode: "CL", db, now: NOW + 60_000,
    beforeFetch: async () => { throw new Error("D1 hit must not reserve provider budget"); },
    fetcher: async () => { throw new Error("D1 hit must not call Massive"); }
  });
  assert.equal(cached.ok, true);
  assert.equal(cached.cached, true);
  assert.equal(cached.contract.ticker, "CLX6");
  assert.equal(calls.length, 1);
  const state = await readMassiveFuturesContractState({ db, now: NOW + 60_000 });
  assert.equal(state.ok, true);
  assert.equal(state.contracts.CL.ticker, "CLX6");
});

test("a new UTC day never reuses yesterday's active contract, and no result remains held", async t => {
  resetMassiveFuturesContractFlightsForTests();
  const { db } = fixture(t);
  const first = await getMassiveActiveFuturesContract({
    productCode: "CL", apiKey: KEY, db, now: NOW, beforeFetch: reservation,
    fetcher: async () => Response.json({ results: [activeRow()] })
  });
  assert.equal(first.ok, true);

  const nextDay = Date.parse("2026-10-06T01:00:00.000Z");
  let calls = 0;
  const unavailable = await getMassiveActiveFuturesContract({
    productCode: "CL", apiKey: KEY, db, now: nextDay, beforeFetch: reservation,
    fetcher: async () => { calls += 1; return Response.json({ results: [] }); }
  });
  assert.equal(calls, 1);
  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.code, "massive-futures-contract-unavailable");
  assert.equal(unavailable.message.includes("CLX6"), false, "yesterday's ticker is not offered as fallback");
  const state = await readMassiveFuturesContractState({ db, now: nextDay });
  assert.equal(state.ok, true);
  assert.equal(state.contracts.CL, undefined);
});

test("failed lookups cool down, and no key/guard means no upstream request", async t => {
  resetMassiveFuturesContractFlightsForTests();
  const { db } = fixture(t);
  let calls = 0;
  let reservations = 0;
  const limited = await getMassiveActiveFuturesContract({
    productCode: "CL", apiKey: KEY, db, now: NOW,
    beforeFetch: async () => { reservations += 1; return reservation(); },
    fetcher: async () => { calls += 1; return new Response("private provider body", { status: 429 }); }
  });
  assert.equal(limited.ok, false);
  assert.equal(limited.code, "massive-futures-contract-rate-limited");
  assert.equal(limited.retryAfter, MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS);

  const cooled = await getMassiveActiveFuturesContract({
    productCode: "CL", apiKey: KEY, db, now: NOW + 60_000, beforeFetch: reservation,
    fetcher: async () => { calls += 1; throw new Error("cooldown suppresses fetch"); }
  });
  assert.equal(cooled.code, "massive-futures-contract-cooldown");
  assert.equal(calls, 1);
  assert.equal(reservations, 1);

  const noKey = await getMassiveActiveFuturesContract({
    productCode: "NG", db, now: NOW, beforeFetch: reservation,
    fetcher: async () => { calls += 1; throw new Error("no key must suppress fetch"); }
  });
  assert.equal(noKey.code, "massive-not-configured");
  const noGuard = await getMassiveActiveFuturesContract({
    productCode: "NG", apiKey: KEY, db, now: NOW,
    fetcher: async () => { calls += 1; throw new Error("missing guard must suppress fetch"); }
  });
  assert.equal(noGuard.code, "massive-call-guard-required");
  const circuitOpen = await getMassiveActiveFuturesContract({
    productCode: "NG", apiKey: KEY, db, now: NOW + 60_000,
    beforeFetch: async () => { reservations += 1; return reservation(); },
    fetcher: async () => { calls += 1; throw new Error("the global endpoint cooldown suppresses another product lookup"); }
  });
  assert.equal(circuitOpen.code, "massive-futures-contract-circuit-open");
  assert.equal(calls, 1);
  assert.equal(reservations, 1, "the account-level cooldown prevents further budget reservations");
});
