import test from "node:test";
import assert from "node:assert/strict";
import {
  MASSIVE_OPTIONS_CONTRACT_LIMIT_MAX,
  MASSIVE_OPTIONS_CONTRACT_ORDERS,
  MASSIVE_OPTIONS_CONTRACT_SORT,
  MASSIVE_OPTIONS_CONTRACT_SORT_FIELDS,
  MASSIVE_OPTIONS_MAX_LOG_STRIKE_DISTANCE,
  discoverMassiveOptionContracts,
  fetchMassiveOptionDailyBar,
  optionLogStrikeDistance,
  optionStrikeWithinLogBound,
  selectLogBoundedOptionContracts
} from "../worker/options-massive.mjs";

const contracts = [
  { ticker: "O:TMO260110C00650000", contract_type: "call", expiration_date: "2026-01-10", strike_price: 65 },
  { ticker: "O:TMO260110C00750000", contract_type: "call", expiration_date: "2026-01-10", strike_price: 75 },
  { ticker: "O:TMO260110C00800000", contract_type: "call", expiration_date: "2026-01-10", strike_price: 80 },
  { ticker: "O:TMO260110C01000000", contract_type: "call", expiration_date: "2026-01-10", strike_price: 100 },
  { ticker: "O:TMO260110P00650000", contract_type: "put", expiration_date: "2026-01-10", strike_price: 65 },
  { ticker: "O:TMO260110P00750000", contract_type: "put", expiration_date: "2026-01-10", strike_price: 75 },
  { ticker: "O:TMO260110P00800000", contract_type: "put", expiration_date: "2026-01-10", strike_price: 80 },
  { ticker: "O:TMO260110P01000000", contract_type: "put", expiration_date: "2026-01-10", strike_price: 100 },
  { ticker: "O:TMO260117C00800000", contract_type: "call", expiration_date: "2026-01-17", strike_price: 80 }
];

test("options strike distance is logarithmic and sign-preserving", () => {
  const up = optionLogStrikeDistance(125, 100);
  const down = optionLogStrikeDistance(80, 100);
  assert.ok(up > 0);
  assert.ok(down < 0);
  assert.equal(optionLogStrikeDistance(100, 100), 0);
  assert.ok(Math.abs(up) > Math.abs(down));
});

test("options eligibility is bounded by log strike distance, not dollar distance", () => {
  assert.equal(optionStrikeWithinLogBound(125, 100), true);
  assert.equal(optionStrikeWithinLogBound(80, 100), true);
  assert.equal(optionStrikeWithinLogBound(130, 100), false);
  assert.equal(optionStrikeWithinLogBound(75, 100), false);
});

test("selection uses a fixed four-contract budget rather than increasing density with distance", () => {
  const selected = selectLogBoundedOptionContracts(contracts, 100, { today: "2026-01-01" });
  assert.equal(selected.length, 4);
  assert.deepEqual(selected.map(item => item.contractType), ["call", "call", "put", "put"]);
  assert.ok(selected.every(item => Math.abs(item.logStrikeDistance) <= MASSIVE_OPTIONS_MAX_LOG_STRIKE_DISTANCE));
  assert.equal(new Set(selected.map(item => item.expirationDate)).size, 1);
});

test("selection ignores contracts outside the logarithmic envelope", () => {
  const selected = selectLogBoundedOptionContracts([
    { ticker: "O:TMO260110C01300000", contract_type: "call", expiration_date: "2026-01-10", strike_price: 130 },
    { ticker: "O:TMO260110P00700000", contract_type: "put", expiration_date: "2026-01-10", strike_price: 70 },
    ...contracts
  ], 100, { today: "2026-01-01" });
  assert.ok(selected.every(item => item.strikePrice !== 130 && item.strikePrice !== 70));
});

test("Massive options discovery and EOD bars use bounded reviewed requests", async () => {
  const calls = [];
  const fetcher = async (input, init = {}) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    if (url.pathname === "/v3/reference/options/contracts") {
      return Response.json({ results: [
        { ticker: "O:TMO260110C01000000", contract_type: "call", expiration_date: "2026-01-10", strike_price: 100, underlying_ticker: "TMO" },
        { ticker: "O:TMO260110P01000000", contract_type: "put", expiration_date: "2026-01-10", strike_price: 100, underlying_ticker: "TMO" },
        { ticker: "O:OTHER260110C01000000", contract_type: "call", expiration_date: "2026-01-10", strike_price: 100, underlying_ticker: "OTHER" },
        { ticker: "not-an-option", contract_type: "call", expiration_date: "2026-01-10", strike_price: 100, underlying_ticker: "TMO" }
      ] });
    }
    return Response.json({ results: [{ t: 1768003200000, o: 2.1, h: 2.5, l: 2.0, c: 2.4, v: 120 }] });
  };
  const discovered = await discoverMassiveOptionContracts({
    underlying: "TMO", apiKey: "options-test-key", today: "2026-01-01", fetcher
  });
  assert.equal(discovered.ok, true);
  assert.equal(discovered.contracts.length, 2);
  assert.equal(calls[0].url.pathname, "/v3/reference/options/contracts");
  assert.equal(calls[0].url.searchParams.get("underlying_ticker"), "TMO");
  assert.equal(calls[0].url.searchParams.get("limit"), "250");
  assert.equal(calls[0].init.headers.Authorization, "Bearer options-test-key");

  const bar = await fetchMassiveOptionDailyBar({
    optionsTicker: discovered.contracts[0].ticker, apiKey: "options-test-key", date: "2026-01-10", fetcher
  });
  assert.equal(bar.ok, true);
  assert.equal(bar.bar.confirmed, true);
  assert.equal(bar.bar.close, 2.4);
  assert.ok(calls[1].url.pathname.includes("/v2/aggs/ticker/O%3ATMO"));
  assert.equal(calls[1].url.searchParams.get("limit"), "1");
});

/* Regression for the production 400 ERR recorded against
   GET /v3/reference/options/contracts: the adapter used to send the
   comma-joined composite `sort=expiration_date,strike_price,ticker`. Massive
   publishes `sort` as a single field (ticker | underlying_ticker |
   expiration_date | strike_price) and rejects any other value before reading
   data. This test pins the whole emitted query string, not just its pathname. */
test("options discovery emits one published sort field and a fully documented query string", async () => {
  const calls = [];
  const fetcher = async input => {
    calls.push(new URL(String(input)));
    return Response.json({ results: [] });
  };
  const result = await discoverMassiveOptionContracts({
    underlying: "TMO", apiKey: "options-test-key", today: "2026-01-01", fetcher
  });
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  const url = calls[0];
  assert.equal(url.origin, "https://api.massive.com");
  assert.equal(url.pathname, "/v3/reference/options/contracts");
  assert.equal(url.searchParams.get("underlying_ticker"), "TMO");
  assert.equal(url.searchParams.get("expiration_date.gte"), "2026-01-01");
  assert.equal(url.searchParams.get("order"), "asc");
  assert.equal(url.searchParams.get("sort"), MASSIVE_OPTIONS_CONTRACT_SORT);
  assert.equal(url.searchParams.get("limit"), "250");
  assert.ok(MASSIVE_OPTIONS_CONTRACT_SORT_FIELDS.includes(url.searchParams.get("sort")),
    "sort must be one published single field");
  assert.ok(!String(url.searchParams.get("sort")).includes(","),
    "a comma-joined composite sort is the exact 400 ERR failure mode");
  assert.ok(MASSIVE_OPTIONS_CONTRACT_ORDERS.includes(url.searchParams.get("order")),
    "order must be one published direction");
  assert.ok(Number(url.searchParams.get("limit")) <= MASSIVE_OPTIONS_CONTRACT_LIMIT_MAX,
    "limit must stay inside the documented maximum");
  assert.equal(
    url.search,
    "?underlying_ticker=TMO&expiration_date.gte=2026-01-01&order=asc&sort=expiration_date&limit=250",
    "the final query string is the audited request shape"
  );
  const documentedNames = new Set([
    "underlying_ticker", "ticker", "contract_type", "expiration_date", "as_of", "strike_price",
    "expired", "underlying_ticker.gte", "underlying_ticker.gt", "underlying_ticker.lte",
    "underlying_ticker.lt", "expiration_date.gte", "expiration_date.gt", "expiration_date.lte",
    "expiration_date.lt", "strike_price.gte", "strike_price.gt", "strike_price.lte",
    "strike_price.lt", "order", "limit", "sort"
  ]);
  for (const [name, value] of url.searchParams) {
    assert.ok(documentedNames.has(name), `${name} is not a documented options contracts parameter`);
    assert.ok(String(value).trim() !== "" && !/^(undefined|null|nan|infinity)$/i.test(String(value)),
      `${name} must carry a real value`);
  }
});

test("options discovery refuses malformed input instead of emitting an invalid request", async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; return Response.json({ results: [] }); };
  const refused = [
    [{ underlying: "", apiKey: "options-test-key", today: "2026-01-01" }, "options-underlying-refused"],
    [{ underlying: "not a ticker", apiKey: "options-test-key", today: "2026-01-01" }, "options-underlying-refused"],
    [{ underlying: "TMO", apiKey: "   ", today: "2026-01-01" }, "massive-options-not-configured"],
    [{ underlying: "TMO", apiKey: "options-test-key", today: "2026-1-1" }, "options-date-refused"],
    [{ underlying: "TMO", apiKey: "options-test-key", today: "not-a-date" }, "options-date-refused"]
  ];
  for (const [options, code] of refused) {
    const result = await discoverMassiveOptionContracts({ ...options, fetcher });
    assert.equal(result.ok, false, `${code} must fail closed`);
    assert.equal(result.attempted, false, `${code} must not reach Massive`);
    assert.equal(result.code, code);
  }
  assert.equal(calls, 0, "no provider request is emitted for an invalid request shape");

  /* A well-formed date padded with whitespace is a legitimate caller input: it
     must be trimmed and still produce a valid request, not be rejected. */
  const padded = [];
  const trimmed = await discoverMassiveOptionContracts({
    underlying: "TMO", apiKey: "options-test-key", today: " 2026-01-01 ",
    fetcher: async input => { padded.push(new URL(String(input))); return Response.json({ results: [] }); }
  });
  assert.equal(trimmed.ok, true);
  assert.equal(padded[0].searchParams.get("expiration_date.gte"), "2026-01-01");
});

test("Massive options bars fail closed on malformed OHLC", async () => {
  const result = await fetchMassiveOptionDailyBar({
    optionsTicker: "O:TMO260110C01000000", apiKey: "options-test-key", date: "2026-01-10",
    fetcher: async () => Response.json({ results: [{ o: 2, h: 1, l: 1.5, c: 1.8 }] })
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "massive-options-invalid-bar");
});
