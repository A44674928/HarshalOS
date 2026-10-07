import test from "node:test";
import assert from "node:assert/strict";
import {
  MASSIVE_OPTIONS_MAX_LOG_STRIKE_DISTANCE,
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
