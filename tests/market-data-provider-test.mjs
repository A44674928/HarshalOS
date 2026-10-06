import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MARKET_DATA_PROVIDER_CONTRACT,
  MARKET_DATA_SCHEMA,
  describeHistoryCapability,
  createProviderProvenance,
  withProviderProvenance,
  marketDataUnavailable
} from "../worker/market-data-provider.mjs";

test("history capability distinguishes sufficient and insufficient history", () => {
  assert.deepEqual(
    describeHistoryCapability({ availableBars: 60, requiredBars: 200 }),
    { state: "insufficient-history", availableBars: 60, requiredBars: 200 }
  );
  assert.deepEqual(
    describeHistoryCapability({ availableBars: 200, requiredBars: 200 }),
    { state: "available", availableBars: 200, requiredBars: 200 }
  );
});

test("history capability reports provider capacity without inventing a requirement", () => {
  assert.deepEqual(
    describeHistoryCapability({ availableBars: 60 }),
    { state: "available", availableBars: 60 }
  );
  assert.deepEqual(
    describeHistoryCapability({ availableBars: 0 }),
    { state: "unavailable", availableBars: 0 }
  );
  assert.deepEqual(
    describeHistoryCapability({}),
    { state: "unknown" }
  );
});

test("provider provenance has an explicit stable identity", () => {
  const provenance = createProviderProvenance({
    provider: "Kraken",
    providerId: "BTC/USD",
    instrument: "BTC",
    assetClass: "crypto",
    timeframe: "1d",
    retrievedAt: 1_759_488_000_000,
    availableBars: 60,
    historyLimit: 60,
    source: "Kraken Spot public OHLC · BTC/USD · 1d bars"
  });

  assert.equal(provenance.contract, MARKET_DATA_PROVIDER_CONTRACT);
  assert.equal(provenance.provider, "kraken");
  assert.equal(provenance.providerId, "BTC/USD");
  assert.equal(provenance.availableBars, 60);
  assert.equal(Object.isFrozen(provenance), true);
});

test("provider provenance rejects ambiguous provider identity", () => {
  assert.throws(() => createProviderProvenance({ provider: "Kraken Spot public OHLC" }), /stable lowercase/);
  assert.throws(() => createProviderProvenance({ provider: "kraken", timeframe: "daily" }), /interval grammar/);
});

test("provenance attaches without altering market observations", () => {
  const packet = {
    schema: MARKET_DATA_SCHEMA,
    synthetic: false,
    symbol: "BTC",
    timeframe: "1d",
    dataShape: "ohlcv",
    bars: [{ time: 1, open: 10, high: 12, low: 9, close: 11, volume: 4, confirmed: true }]
  };
  const provenance = createProviderProvenance({
    provider: "kraken",
    providerId: "BTC/USD",
    instrument: "BTC",
    assetClass: "crypto",
    timeframe: "1d",
    availableBars: 1,
    historyLimit: 60
  });
  const result = withProviderProvenance(packet, provenance);

  assert.deepEqual(result.bars, packet.bars);
  assert.deepEqual(result.provenance, provenance);
  assert.equal(Object.isFrozen(result), true);
});

test("structured unavailability preserves provider and history facts", () => {
  const result = marketDataUnavailable({
    provider: "kraken",
    code: "indicator-insufficient-history",
    message: "FBB-200 cannot be computed from the available series.",
    state: "insufficient-history",
    instrument: "BTC",
    timeframe: "1d",
    availableBars: 60,
    requiredBars: 200
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "indicator-insufficient-history");
  assert.deepEqual(result.marketData, {
    contract: MARKET_DATA_PROVIDER_CONTRACT,
    state: "insufficient-history",
    provider: "kraken",
    instrument: "BTC",
    timeframe: "1d",
    state: "insufficient-history",
    availableBars: 60,
    requiredBars: 200
  });
});

test("structured unavailability validates state", () => {
  assert.throws(() => marketDataUnavailable({
    provider: "kraken",
    state: "fake-state"
  }), /Unsupported market-data state/);
});
