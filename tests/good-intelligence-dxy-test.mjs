/* ICE-weighted DXY display bridge and dated 52-asset firing roster tests. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const [dxySource, rosterSource] = await Promise.all([
  readFile(new URL("js/good-intelligence-dxy.js", ROOT), "utf8"),
  readFile(new URL("js/good-intelligence-market-roster.js", ROOT), "utf8")
]);
const browser = { window: {} };
browser.globalThis = browser.window;
vm.runInNewContext(rosterSource, browser, { filename: "js/good-intelligence-market-roster.js" });
vm.runInNewContext(dxySource, browser, { filename: "js/good-intelligence-dxy.js" });
const Dxy = browser.window.GoodIntelligenceDxy;
const roster = browser.window.GoodIntelligenceMarketRoster;
const NOW = Date.parse("2026-10-04T12:00:00.000Z");
const CLOSES = Object.freeze({ EURUSD: 1.17, JPYUSD: 1 / 151, GBPUSD: 1.34, CADUSD: 1 / 1.37, SEKUSD: 1 / 9.4, CHFUSD: 1 / 0.8 });

function fxObservation(symbol, close = CLOSES[symbol], time = NOW - 86_400_000, overrides = {}) {
  return {
    symbol,
    discId: "fx",
    providerMode: "massive",
    interval: "1d",
    status: "bars",
    market: {
      synthetic: false,
      timeframe: "1d",
      latestBar: { time, close, confirmed: true }
    },
    ...overrides
  };
}

function sixCloses(overrides = {}) {
  return Dxy.COMPONENTS.map(component => fxObservation(component.symbol, CLOSES[component.symbol], NOW - 86_400_000, overrides[component.symbol] || {}));
}

test("DXY uses the current six ICE weights with the reviewed USD-per-foreign quote orientation", () => {
  assert.deepEqual(Array.from(Dxy.COMPONENTS, ({ symbol, weight }) => [symbol, weight]), [
    ["EURUSD", 0.576], ["JPYUSD", 0.136], ["GBPUSD", 0.119],
    ["CADUSD", 0.091], ["SEKUSD", 0.042], ["CHFUSD", 0.036]
  ]);
  const result = Dxy.evaluate(sixCloses(), NOW);
  const expected = Dxy.ICE_USDX_CONSTANT * Dxy.COMPONENTS.reduce((value, component) =>
    value * CLOSES[component.symbol] ** -component.weight, 1);
  assert.equal(result.ok, true);
  assert.equal(result.status, "ready");
  assert.ok(Math.abs(result.value - expected) < 1e-10);
  assert.equal(result.asOf, NOW - 86_400_000);
  assert.equal(result.inputCount, 6);
  assert.match(result.note, /not the licensed real-time/i);
});

test("DXY holds missing, synthetic, stale, unconfirmed, provider-mismatched and unaligned inputs", () => {
  const missing = Dxy.evaluate(sixCloses().slice(0, 5), NOW);
  assert.equal(missing.ok, false);
  assert.equal(missing.status, "waiting");
  assert.deepEqual([...missing.missing], ["CHFUSD"]);

  const syntheticInputs = sixCloses();
  syntheticInputs[0] = fxObservation("EURUSD", CLOSES.EURUSD, NOW - 86_400_000, { market: {
    synthetic: true, timeframe: "1d", latestBar: { time: NOW - 86_400_000, close: CLOSES.EURUSD, confirmed: true }
  } });
  const synthetic = Dxy.evaluate(syntheticInputs, NOW);
  assert.equal(synthetic.ok, false);
  assert.equal(synthetic.status, "held");
  assert.equal(synthetic.invalid[0].code, "synthetic");

  const staleInputs = sixCloses();
  staleInputs[0] = fxObservation("EURUSD", CLOSES.EURUSD, NOW - 5 * 86_400_000);
  assert.equal(Dxy.evaluate(staleInputs, NOW).status, "stale");

  const unconfirmedInputs = sixCloses();
  unconfirmedInputs[0] = fxObservation("EURUSD", CLOSES.EURUSD, NOW - 86_400_000, { market: {
    synthetic: false, timeframe: "1d", latestBar: { time: NOW - 86_400_000, close: CLOSES.EURUSD, confirmed: false }
  } });
  assert.equal(Dxy.evaluate(unconfirmedInputs, NOW).invalid[0].code, "unconfirmed");

  const wrongProviderInputs = sixCloses();
  wrongProviderInputs[0] = { ...wrongProviderInputs[0], providerMode: "tickerbot" };
  assert.equal(Dxy.evaluate(wrongProviderInputs, NOW).invalid[0].code, "provider-mismatch");

  const unalignedInputs = sixCloses();
  unalignedInputs[0] = fxObservation("EURUSD", CLOSES.EURUSD, NOW - 2 * 86_400_000);
  const unaligned = Dxy.evaluate(unalignedInputs, NOW);
  assert.equal(unaligned.status, "unaligned");
  assert.equal(unaligned.refreshSymbol, "EURUSD");
  assert.equal(unaligned.ok, false);
});

test("the static market roster has exactly 52 sourced assets and 4–7 descending-cap tickers per sector", () => {
  assert.equal(roster.SCHEMA, "good-intelligence-market-roster-v1");
  const validation = Dxy.validateFiringRoster(roster.assets);
  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.equal(validation.count, 52);
  assert.equal(validation.firingOrder.length, 52);
  assert.deepEqual(Array.from(validation.sectors, ({ count }) => count).sort((a, b) => a - b), [6, 6, 6, 6, 7, 7, 7, 7]);
  assert.deepEqual(Array.from(validation.firingOrder, asset => asset.firingOrder), Array.from({ length: 52 }, (_, index) => index + 1));
  for (const { sector, count } of validation.sectors) {
    assert.ok(count >= 4 && count <= 7, `${sector} contains ${count} assets`);
    const members = validation.firingOrder.filter(asset => asset.sector === sector);
    for (let index = 1; index < members.length; index += 1) {
      assert.ok(members[index - 1].marketCapUsd >= members[index].marketCapUsd,
        `${sector} descends by market cap at ${members[index].symbol}`);
    }
  }
  assert.ok(validation.firingOrder.every(asset => asset.marketCapAsOf === "2026-10-02" && asset.marketCapSourceUrl));
});

test("the DXY browser helper has no network path or synthetic fixture", () => {
  assert.doesNotMatch(dxySource, /\bfetch\s*\(/);
  assert.doesNotMatch(dxySource, /synthetic\s*:\s*true/i);
  assert.match(dxySource, /Rule 15\.01/);
});
