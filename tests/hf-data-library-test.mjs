import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HF_DATA_LIBRARY_PROVIDER, HF_DATA_LIBRARY_SCHEMA,
  hfRawKey, hfNormalizedKey, parseHfNormalizedArtifact, buildHfMarketContext
} from "../worker/hf-data-library.mjs";

const bars = Array.from({ length: 3 }, (_, i) => ({
  time: \`2026-10-01T13:3\${i}:00.000Z\`,
  open: 100 + i, high: 101 + i, low: 99 + i, close: 100.5 + i,
  volume: 1000 + i, confirmed: true
}));

test("HF R2 keys are deterministic and provider-scoped", () => {
  assert.equal(hfRawKey("aapl"), "hf-data-library/raw/clean/AAPL.parquet");
  assert.equal(hfNormalizedKey("AAPL"), "hf-data-library/normalized/clean/AAPL/1m-tail.json.gz");
  assert.throws(() => hfRawKey("not a ticker!"), /Invalid HF Data Library ticker/);
});

test("normalized HF history is chronological and bounded", () => {
  const result = parseHfNormalizedArtifact({
    schema: HF_DATA_LIBRARY_SCHEMA, provider: HF_DATA_LIBRARY_PROVIDER,
    symbol: "AAPL", timeframe: "1m", version: "clean",
    retrievedAt: Date.now(), sourceRows: 100, bars
  });
  assert.equal(result.ok, true);
  assert.equal(result.artifact.availableBars, 3);
  assert.equal(result.artifact.sourceRows, 100);
});

test("normalized HF history rejects malformed chronology", () => {
  const result = parseHfNormalizedArtifact({
    schema: HF_DATA_LIBRARY_SCHEMA, provider: HF_DATA_LIBRARY_PROVIDER,
    symbol: "AAPL", timeframe: "1m", version: "clean",
    retrievedAt: Date.now(), bars: [bars[1], bars[0]]
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /chronological/);
});

test("HF history becomes a gi-market-context-v1 packet with provenance", () => {
  const result = buildHfMarketContext({
    schema: HF_DATA_LIBRARY_SCHEMA, provider: HF_DATA_LIBRARY_PROVIDER,
    symbol: "AAPL", timeframe: "1m", version: "clean",
    retrievedAt: Date.now(), sourceRows: 3, bars
  });
  assert.equal(result.ok, true);
  assert.equal(result.packet.schema, "gi-market-context-v1");
  assert.equal(result.packet.provenance.provider, "hf-data-library");
  assert.equal(result.packet.provenance.providerId, "AAPL");
  assert.equal(result.packet.provenance.availableBars, 3);
  assert.equal(result.packet.bars.length, 3);
  assert.equal(result.packet.synthetic, false);
});

test("HF history never silently substitutes another provider", () => {
  const result = buildHfMarketContext({
    schema: HF_DATA_LIBRARY_SCHEMA, provider: "tickerbot",
    symbol: "AAPL", timeframe: "1m", retrievedAt: Date.now(), bars
  });
  assert.equal(result.ok, false);
});
