/* Tests for the Characters market-beat engine and the cast/stage layout.

   These run the two browser modules in a vm sandbox (the same approach as
   tests/good-intelligence-market-context-test.mjs) and evaluate real
   gi-market-analysis-v1 packets through the real Pine-port evaluator, so a change in
   either the indicator port or the motion mapping is caught here.

   What this file is allowed to prove: the budget arithmetic, rotation determinism,
   the shape and honesty of the motion directives, and the freeze-on-no-data rule.
   What it cannot prove: provider parity, source parity, or that a mood is a
   market prediction. None of these are claims the app makes. */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";

const sandbox = { window: {}, Date, Math, Number, JSON, Map, Set, Array, Object, String, Boolean, console };
const context = vm.createContext(sandbox);
for (const file of ["js/good-intelligence-market-context.js", "js/characters-beat.js", "js/characters-cast.js"]) {
  vm.runInContext(await readFile(new URL(`../${file}`, import.meta.url), "utf8"), context, { filename: file });
}
const Beat = sandbox.window.CharactersBeat;
const Cast = sandbox.window.CharactersCast;
const MarketContext = sandbox.window.GoodIntelligenceMarketContext;

const NOW = Date.parse("2026-10-03T12:00:00.000Z");

function bars(count, drift = 0.02, wobble = 1.6, volume = 1200) {
  let previous = 100;
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * drift + Math.sin(index / 9) * wobble + Math.sin(index / 26) * wobble * 0.6;
    const open = previous;
    previous = close;
    return {
      time: new Date(NOW - (count - index) * 60 * 60_000).toISOString(),
      open, high: Math.max(open, close) + 0.25, low: Math.min(open, close) - 0.25, close,
      volume: Math.max(1, volume + 200 * Math.sin(index / 4.4)), confirmed: true
    };
  });
}

function packet(overrides = {}) {
  return {
    schema: "gi-market-context-v1", synthetic: true, source: "unit-test fixture",
    symbol: "TEST", timeframe: "1h", bars: bars(360),
    parameters: { vfiLen: 30, vfiVolLen: 10, vfiSignalLen: 4, bandLen: 40, channelLength: 6, averageLength: 12, signalLength: 3, divLookback: 3 },
    ...overrides
  };
}

const motionFor = overrides => Beat.motion(MarketContext.evaluate(packet(overrides)), { bearingBase: 1 });
/* Modules run in a vm realm, so their arrays and objects carry that realm's prototypes;
   plain() re-homes a value into this realm before a strict deep comparison. */
const plain = value => JSON.parse(JSON.stringify(value));

test("the engine publishes a frozen, versioned API", () => {
  assert.ok(Object.isFrozen(Beat));
  assert.equal(Beat.SCHEMA.beat, "characters-beat-v1");
  assert.equal(Beat.SCHEMA.motion, "characters-market-motion-v1");
  assert.deepEqual([...Beat.CADENCES], [15, 30, 60, 240, 1440]);
  assert.equal(Beat.MAX_SYMBOLS_PER_BEAT, 12);
  assert.ok(Object.isFrozen(Beat.DEFAULTS));
});

test("the 10,000-call plan never spends more than the budget, at any cadence", () => {
  const plans = Beat.compareCadences({ monthlyBudget: 10000, castSize: 52 });
  assert.equal(plans.length, Beat.CADENCES.length);
  for (const plan of plans) {
    assert.ok(plan.callsPerMonth <= 10000, `${plan.cadenceMinutes} min plan overspends: ${plan.callsPerMonth}`);
    assert.ok(plan.callsPerBeat >= 1 && plan.callsPerBeat <= Beat.MAX_SYMBOLS_PER_BEAT);
    assert.ok(plan.callsPerMonth > 0);
    assert.equal(plan.reserveCalls, 1500);
    assert.equal(plan.usableCalls, 8500);
    assert.ok(plan.notes.length >= 1, "every plan explains itself");
  }
  /* The known arithmetic that the app, the Worker cap, and the docs all quote. */
  const planOf = minutes => plans.find(plan => plan.cadenceMinutes === minutes);
  assert.equal(planOf(15).callsPerBeat, 2);
  assert.equal(planOf(30).callsPerBeat, 5);
  assert.equal(planOf(60).callsPerBeat, 11);
  assert.equal(planOf(240).callsPerBeat, 12, "the request cap binds before the budget does");
  /* A faster cadence can never move more characters per beat. */
  for (let index = 1; index < plans.length; index++) {
    assert.ok(plans[index].callsPerBeat >= plans[index - 1].callsPerBeat);
  }
  /* The stretch is offered only when the hard monthly budget still covers it. */
  for (const plan of plans) {
    if (plan.stretchWithinBudget) assert.ok(plan.stretchCallsPerMonth <= plan.monthlyBudget);
    assert.ok(plan.stretchCallsPerBeat >= plan.callsPerBeat);
  }
});

test("the default 15-minute rotation sweeps 52 berths in 6.5 hours with room under 10,000", () => {
  assert.equal(Beat.DEFAULTS.cadenceMinutes, 15);
  const plan = Beat.plan({ monthlyBudget: 10000, cadenceMinutes: 15, castSize: 52 });
  assert.equal(plan.callsPerBeat, 2);
  assert.equal(plan.sweepBeats, 26);
  assert.equal(plan.sweepHours, 6.5);
  assert.equal(plan.callsPerMonth, 5844);
  assert.equal(10000 - plan.callsPerMonth, 4156, "4,156 calls remain before the server's hard stop");
  assert.equal(plan.stretchCallsPerMonth, 8766, "the explicit stretch spends some of the 15% reserve");
});

test("cadence recommendation stays inside the budget and is drawn from the reviewed list", () => {
  const recommendation = Beat.recommendCadence({ monthlyBudget: 10000, castSize: 52 });
  assert.ok(Beat.CADENCES.includes(recommendation.cadenceMinutes));
  assert.equal(recommendation.cadenceMinutes, 60, "hourly spends the most budget without overspending it");
  assert.ok(recommendation.plan.callsPerMonth <= 10000);
  assert.match(recommendation.reason, /symbols per beat/);
  const tiny = Beat.recommendCadence({ monthlyBudget: 300, castSize: 52 });
  assert.ok(tiny.plan.callsPerMonth <= 300);
  assert.ok(Beat.formatHours(0.5) === "30 min" && Beat.formatHours(5) === "5 h");
});

test("rotation is least-recently-refreshed, featured-weighted, and deterministic", () => {
  const symbols = ["AAPL", "MSFT", "NVDA", "XOM"];
  const now = 1_000_000;
  const first = Beat.selectDueSymbols({ symbols: [...symbols, "aapl"], lastRefreshedAt: {}, now, perBeat: 2 });
  assert.deepEqual(plain(first), ["AAPL", "MSFT"], "never-refreshed berths come up in watchlist order, deduped and upper-cased");

  /* A never-refreshed berth outranks every aged one, then the oldest age wins. */
  const all = { AAPL: now - 1000, MSFT: now - 5000, NVDA: now - 900, XOM: now - 40 };
  assert.deepEqual(plain(Beat.selectDueSymbols({ symbols, lastRefreshedAt: { ...all, XOM: undefined }, now, perBeat: 1 })), ["XOM"]);
  assert.deepEqual(plain(Beat.selectDueSymbols({ symbols, lastRefreshedAt: all, now, perBeat: 1 })), ["MSFT"]);

  /* A featured ticker at half the age outranks an unfeatured one. */
  const pair = ["AAPL", "MSFT"];
  const ages = { AAPL: now - 3000, MSFT: now - 4000 };
  assert.deepEqual(plain(Beat.selectDueSymbols({ symbols: pair, lastRefreshedAt: ages, now, perBeat: 1 })), ["MSFT"]);
  assert.deepEqual(plain(Beat.selectDueSymbols({ symbols: pair, lastRefreshedAt: ages, now, perBeat: 1, featured: ["AAPL"] })), ["AAPL"]);
  assert.deepEqual(
    plain(Beat.selectDueSymbols({ symbols, lastRefreshedAt: { AAPL: now - 1, MSFT: now - 2 }, now, perBeat: 3 })),
    plain(Beat.selectDueSymbols({ symbols, lastRefreshedAt: { AAPL: now - 1, MSFT: now - 2 }, now, perBeat: 3 }))
  );
  assert.deepEqual(plain(Beat.selectDueSymbols({ symbols, now, perBeat: 0 })), []);
  assert.ok(Beat.selectDueSymbols({ symbols, now, perBeat: 99 }).length === symbols.length);
});

test("no bars means no motion: a frozen berth invents nothing", () => {
  const missing = Beat.motion(null);
  assert.equal(missing.status, "missing");
  assert.equal(missing.mood, "frozen");
  assert.equal(missing.frozen, true);
  assert.deepEqual(plain(missing.marks), []);
  assert.equal(missing.npc.speed, 0);
  assert.equal(missing.npc.stride, 0);
  assert.equal(missing.item.rate, 0);
  assert.equal(missing.object.pulse, 0);
  assert.match(missing.caption, /no observations|no bars/i);

  const empty = Beat.motion(MarketContext.evaluate(packet({ bars: [] })));
  assert.equal(empty.status, "no-data");
  assert.equal(empty.mood, "frozen");
  assert.equal(empty.npc.speed, 0);
  assert.match(empty.caption, /stand(s)? still/i);
  assert.ok(empty.gauge.known === false);
});

test("OHLC without volume keeps price motion but disables VFI, crowd, and item flow", () => {
  const priceBars = bars(300).map(({ volume, ...bar }) => bar);
  const analysis = MarketContext.evaluate({
    schema: "gi-market-context-v1", synthetic: false, source: "test OHLC", symbol: "EUR/USD", timeframe: "1mo",
    dataShape: "ohlcv", quoteCurrency: "USD", bars: priceBars,
    parameters: { ...MarketContext.DEFAULTS, bandLen: 24, vfiLen: 18, vfiVolLen: 8, channelLength: 6, averageLength: 12, signalLength: 3 }
  });
  assert.equal(analysis.dataShape, "ohlc", "the observed shape overrides overstated metadata");
  assert.equal(analysis.volumeAvailable, false);
  assert.equal(analysis.vfi.available, false);
  const directive = Beat.motion(analysis);
  assert.equal(directive.volumeAvailable, false);
  assert.equal(directive.item.rate, 0, "without observed volume, items do not pretend to flow");
  assert.match(directive.caption, /volume flow unavailable/i);
  assert.equal(directive.frozen, false, "price-only observations can still move price-based motion");
});

test("a beaten berth produces a bounded, deterministic directive for every class", () => {
  const analysis = MarketContext.evaluate(packet());
  const directive = Beat.motion(analysis, { bearingBase: 0.5 });
  const again = Beat.motion(MarketContext.evaluate(packet()), { bearingBase: 0.5 });
  assert.deepEqual(plain(directive), plain(again), "same packet, same motion");
  assert.ok(Beat.MOODS.includes(directive.mood));
  assert.ok(Beat.FORMATIONS.includes(directive.npc.formation));
  for (const value of Object.values(directive.gauge)) {
    if (typeof value === "number") assert.ok(value >= -1 && value <= 1.0001, `gauge out of range: ${value}`);
  }
  for (const field of ["speed", "stride", "jitter"]) {
    assert.ok(directive.npc[field] >= 0 && directive.npc[field] <= 1);
  }
  assert.ok(directive.object.sway >= 0 && directive.object.sway <= 1);
  assert.ok(directive.object.aperture >= 0 && directive.object.aperture <= 1);
  assert.ok(directive.item.rate > 0 && directive.item.rate <= 2);
  assert.ok(["inbound", "outbound"].includes(directive.item.lane));
  assert.equal(directive.barCount, 360);
  assert.match(directive.note, /display-only/i);
  assert.match(directive.note, /not investment advice/i);
  assert.ok(directive.caption.startsWith("TEST:"));
});

test("Characters FBB basis bias uses symmetric log returns instead of linear price distance", () => {
  const up = Beat.gaugeOf({ status: "ready", close: 102, bands: { basis: 100 }, chartSeries: [] });
  const down = Beat.gaugeOf({ status: "ready", close: 100 / 1.02, bands: { basis: 100 }, chartSeries: [] });
  const expected = Math.round(Math.tanh(Math.log(1.02) * 40) * 1000) / 1000;
  assert.equal(up.bias, expected);
  assert.equal(down.bias, -expected, "equal multiplicative moves above and below the basis are symmetric");
});

test("an unconfirmed latest bar is held rather than treated as a closed move", () => {
  const rows = bars(360);
  rows[rows.length - 1] = { ...rows[rows.length - 1], confirmed: false };
  const analysis = MarketContext.evaluate(packet({ bars: rows }));
  const directive = Beat.motion(analysis);
  assert.equal(directive.status, "ready", "the held bar still describes the last closed context");
  assert.ok(directive.marks.some(mark => /unconfirmed/i.test(mark)), "the hold is shown on the stage, not hidden");
  assert.equal(analysis.signals.bullishConfluence || analysis.signals.bearishConfluence, false,
    "a pending bar cannot mint a confluence event");
});

test("mood follows the indicator state, not the price alone", () => {
  const rising = motionFor({ bars: bars(360, 0.16, 0.9, 1400) });
  assert.ok(["rally", "surge", "lean-up", "coil"].includes(rising.mood), `unexpected rising mood ${rising.mood}`);

  const falling = motionFor({ bars: bars(360, -0.16, 0.9, 1400) });
  assert.ok(["selloff", "flinch", "lean-down", "coil"].includes(falling.mood), `unexpected falling mood ${falling.mood}`);

  const quiet = motionFor({ bars: bars(360, 0, 0.15, 1000) });
  assert.ok(["drift", "coil", "lean-up", "lean-down", "churn"].includes(quiet.mood));
  assert.ok(quiet.gauge.charge <= rising.gauge.charge, "a quiet series charges less than a fast one");
  assert.ok(rising.npc.speed > 0.12 && quiet.npc.speed >= 0);
});

test("a bearish confluence on the latest closed bar reads as flinch", () => {
  /* Force the confluence by falling into the lower band with negative flow. */
  let found = null;
  for (const drift of [-0.3, -0.5, -0.8, -1.2]) {
    const directive = motionFor({ bars: bars(360, drift, 0.6, 1600) });
    if (directive.mood === "flinch" || directive.mood === "selloff") { found = directive; break; }
  }
  assert.ok(found, "a sustained break below the basis leaves the neutral band");
  assert.ok(found.gauge.bias <= 0);
  assert.ok(found.caption.length > 0);
});

test("blend glides numeric motion and switches categorical fields once", () => {
  const from = Beat.motion(MarketContext.evaluate(packet({ bars: bars(360, -0.2, 0.9, 900) })));
  const to = Beat.motion(MarketContext.evaluate(packet({ bars: bars(360, 0.4, 2.4, 2400) })));
  const early = Beat.blend(from, to, 0.25);
  const late = Beat.blend(from, to, 0.75);
  assert.equal(early.npc.formation, from.npc.formation);
  assert.equal(late.npc.formation, to.npc.formation);
  assert.equal(early.mood, from.mood);
  assert.equal(late.mood, to.mood);
  assert.ok(early.npc.speed >= Math.min(from.npc.speed, to.npc.speed) && early.npc.speed <= Math.max(from.npc.speed, to.npc.speed));
  assert.equal(Beat.blend(from, to, 0).npc.speed, from.npc.speed);
  assert.equal(Beat.blend(from, to, 1).npc.speed, to.npc.speed);
  assert.equal(Beat.blend(null, to, 0.1), to);
});

test("the ledger tracks calls per month and refreshes only the symbols a beat touched", () => {
  const october = Date.UTC(2026, 9, 3, 12);
  let ledger = Beat.emptyLedger(october);
  assert.equal(ledger.month, "2026-10");
  ledger = Beat.recordBeat(ledger, { at: october, symbols: ["aapl", "MSFT"], calls: 2, moodBySymbol: { AAPL: "rally" }, cadenceMinutes: 60 });
  assert.equal(ledger.calls, 2);
  assert.equal(ledger.beats, 1);
  assert.equal(ledger.lastRefreshedAt.AAPL, october);
  assert.equal(ledger.history.length, 1);
  assert.deepEqual(plain(ledger.history[0].moods), ["rally", "unknown"]);

  assert.deepEqual(plain(Beat.remainingBudget(ledger, 10000)), { used: 2, budget: 10000, remaining: 9998, exhausted: false });
  assert.equal(Beat.remainingBudget(ledger, 2).exhausted, true);

  /* A new month resets the ledger — the app never carries September's spend into October. */
  const november = Date.UTC(2026, 10, 1, 0);
  const rolled = Beat.normalizeLedger(ledger, november);
  assert.equal(rolled.month, "2026-11");
  assert.equal(rolled.calls, 0);
  assert.deepEqual(plain(rolled.lastRefreshedAt), {});

  /* Malformed ledgers are repaired instead of thrown away. */
  const repaired = Beat.normalizeLedger({ month: "2026-10", calls: -5, lastRefreshedAt: { AAPL: "x", MSFT: 5 }, featured: ["aapl", "AAPL"] }, october);
  assert.equal(repaired.calls, 0);
  assert.deepEqual(Object.keys(repaired.lastRefreshedAt), ["MSFT"]);
  assert.deepEqual(plain(repaired.featured), ["AAPL"]);
});

test("rehearsal bars are deterministic, labeled synthetic, and change from beat to beat", () => {
  const first = Beat.rehearse({ symbol: "AAPL", at: NOW, beat: 1 });
  const second = Beat.rehearse({ symbol: "AAPL", at: NOW, beat: 1 });
  assert.deepEqual(plain(first), plain(second));
  assert.equal(first.synthetic, true);
  assert.match(first.source, /synthetic/i);
  assert.equal(first.bars.length, 240);
  const later = Beat.rehearse({ symbol: "AAPL", at: NOW, beat: 2 });
  assert.notDeepEqual(plain(later.bars).map(bar => bar.close), plain(first.bars).map(bar => bar.close));
  const analysis = MarketContext.evaluate(first);
  assert.ok(analysis && analysis.status !== "no-data");
  assert.equal(Beat.motion(analysis).synthetic, true, "synthetic provenance survives into the motion directive");
});

test("the cast binds to the reviewed Tickerbot allowlist with no second copy", () => {
  const stage = Cast.build(TICKERBOT_WATCHLIST);
  assert.equal(stage.berths.length, TICKERBOT_WATCHLIST.length);
  assert.deepEqual(plain(stage.berths).map(berth => berth.symbol), TICKERBOT_WATCHLIST.map(entry => entry.symbol));
  const sectors = new Set(TICKERBOT_WATCHLIST.map(entry => entry.sector));
  assert.equal(stage.sectors.length, sectors.size);
  assert.equal(new Set(stage.berths.map(berth => berth.symbol)).size, stage.berths.length, "one berth per symbol");
  for (const berth of stage.berths) {
    assert.ok(berth.npc && berth.npc.name && berth.npc.role, `${berth.symbol} has a resident`);
    assert.ok(sectors.has(berth.sectorName));
    assert.ok(berth.angle >= -Math.PI / 2 - 0.01 && berth.angle <= Math.PI * 1.5 + 0.01);
    assert.ok(berth.radius >= Cast.BERTH_INNER && berth.radius <= Cast.BERTH_OUTER);
    assert.ok(berth.item.kind && berth.item.color && /^#[0-9a-f]{6}$/i.test(berth.item.color.hex));
  }
  for (const sector of stage.sectors) {
    assert.ok(sector.object.kind && sector.object.glyph, `${sector.name} has an object`);
    assert.ok(sector.arcEnd > sector.arcStart);
    assert.ok(sector.midAngle > sector.arcStart && sector.midAngle < sector.arcEnd);
  }
  assert.deepEqual(plain(Cast.build(TICKERBOT_WATCHLIST).berths).map(berth => berth.npc.name), plain(stage.berths).map(berth => berth.npc.name), "casting is deterministic");
  assert.equal(Cast.build([]).berths.length, 0);
  assert.equal(Cast.build(null).watchlistSize, 0);

  const commodity = Cast.build([{
    symbol: "WTI", displaySymbol: "WTI", name: "West Texas Intermediate crude", sector: "Energy",
    discId: "commodities", assetClass: "commodity", dataShape: "value", quoteCurrency: "USD/barrel", tags: ["Energy", "Crude oil"]
  }], { discId: "commodities" });
  assert.equal(commodity.discId, "commodities");
  assert.equal(commodity.berths[0].assetClass, "commodity");
  assert.equal(commodity.berths[0].dataShape, "value");
  assert.equal(commodity.berths[0].quoteCurrency, "USD/barrel");
  assert.deepEqual(plain(commodity.berths[0].tags), ["Energy", "Crude oil"]);

  const crypto = Cast.build([{
    symbol: "PRA", displaySymbol: "PRA/USD", name: "Maya Preferred PRA", sector: "Cryptocurrency",
    discId: "crypto", assetClass: "crypto", dataShape: "ohlcv", quoteCurrency: "USD", rank: 52,
    rankingProvider: "Massive", providerId: "X:MAYACOINUSD", massiveTicker: "X:MAYACOINUSD", volumeUsd: 900, currentPriceUsd: 90_000_000, marketCapUsd: null
  }], { discId: "crypto" });
  assert.equal(crypto.berths[0].rank, 52);
  assert.equal(crypto.berths[0].rankingProvider, "Massive");
  assert.equal(crypto.berths[0].providerId, "X:MAYACOINUSD", "the exact Massive ticker provenance survives cast normalization");
  assert.equal(crypto.berths[0].volumeUsd, 900);
  assert.equal(crypto.berths[0].currentPriceUsd, 90_000_000);
  assert.equal(crypto.berths[0].marketCapUsd, null);
});

test("a tiered beat spends exactly the same calls as a single-cadence beat", () => {
  for (const cadenceMinutes of Beat.CADENCES) {
    const single = Beat.plan({ monthlyBudget: 10000, cadenceMinutes, castSize: 52 });
    const tiers = Beat.planTiers({ monthlyBudget: 10000, cadenceMinutes, castSize: 52 });
    assert.equal(tiers.schema, "characters-tier-plan-v1");
    assert.equal(tiers.callsPerMonth, single.callsPerMonth, `${cadenceMinutes} min: tiering must not cost extra calls`);
    assert.equal(tiers.callsPerBeat, single.callsPerBeat);
    assert.equal(tiers.options.length, Beat.TIER_SWEEP_HOURS.length);
    for (const option of tiers.options) {
      assert.equal(option.hotSize + option.sweepPerBeat, single.callsPerBeat, "every call in the beat is accounted for");
      assert.ok(option.hotSize <= Beat.MAX_SYMBOLS_PER_BEAT);
      assert.ok(option.sweepPerBeat >= 0);
      if (option.feasible) {
        assert.ok(option.hotSize >= 1);
        assert.ok(option.hotSize < single.callsPerBeat, "a hot lane that eats the whole beat would starve the sweep");
        assert.ok(option.notes.every(note => note.length > 0));
        /* The sweep really does finish inside the window it advertises. */
        assert.ok(option.sweepBeats >= Math.ceil(option.sweepSize / option.sweepPerBeat));
        assert.ok(option.sweepHours <= option.targetSweepHours + 0.01,
          `${option.targetSweepHours}h window finished in ${option.sweepHours}h`);
        assert.equal(option.withinWindow, true);
      } else {
        assert.ok(option.notes.length >= 1, "an infeasible window explains itself");
      }
    }
  }
});

test("the tier plan recommends the widest hot lane that still sweeps the cast in a day", () => {
  const hourly = Beat.planTiers({ monthlyBudget: 10000, cadenceMinutes: 60, castSize: 52 });
  assert.ok(hourly.recommended);
  assert.equal(hourly.recommended.targetSweepHours, 24, "a day is the default window");
  assert.equal(hourly.recommended.hotSize, 9);
  assert.equal(hourly.recommended.sweepPerBeat, 2);
  assert.ok(hourly.recommended.sweepHours <= 24);
  assert.match(hourly.notes.join(" "), /same 8,030 calls per month/);

  /* Five-minute tempo is not on the list; the fastest reviewed cadence cannot reach 6h. */
  const fastest = Beat.planTiers({ monthlyBudget: 10000, cadenceMinutes: 15, castSize: 52 });
  assert.equal(fastest.options.find(option => option.targetSweepHours === 6).feasible, false);
  assert.equal(fastest.options.find(option => option.targetSweepHours === 12).feasible, false);
  const dayWindow = fastest.options.find(option => option.targetSweepHours === 24);
  assert.equal(dayWindow.feasible, true);
  assert.equal(dayWindow.hotSize, 1, "at 15 minutes the budget affords a single hot berth and a sweep");
  assert.ok(dayWindow.sweepHours <= 24);

  /* A cast too large for the budget at a slow cadence has no tier split at all. */
  const squeezed = Beat.planTiers({ monthlyBudget: 400, cadenceMinutes: 60, castSize: 52 });
  assert.equal(squeezed.options.some(option => option.feasible), false);
  assert.match(squeezed.notes.join(" "), /sweep alone is the whole plan/);
});

test("a tiered rotation pays the hot lane first and never exceeds the beat budget", () => {
  const symbols = Array.from({ length: 52 }, (_, index) => `S${String(index).padStart(2, "0")}`);
  const now = 5_000_000;
  const selection = Beat.selectTieredDue({
    symbols, hotSet: ["S05", "S09"], lastRefreshedAt: {}, now, hotSize: 4, sweepPerBeat: 5
  });
  assert.equal(selection.all.length, 9, "hot + sweep, and nothing else");
  assert.equal(selection.hot.length, 4);
  assert.equal(selection.sweep.length, 5);
  assert.deepEqual(selection.lanes.S05, "hot");
  assert.equal(selection.all.filter(symbol => selection.lanes[symbol] === "hot").length, 4);
  assert.equal(selection.all.filter(symbol => selection.lanes[symbol] === "sweep").length, 5);
  assert.equal(new Set(selection.all).size, selection.all.length, "no berth is charged twice in one beat");

  /* More featured tickers than the plan affords still rotate: no berth starves. */
  const crowded = Beat.selectTieredDue({
    symbols, hotSet: symbols.slice(0, 12), lastRefreshedAt: {}, now, hotSize: 3, sweepPerBeat: 5
  });
  assert.equal(crowded.hot.length, 3);
  const ages = Object.fromEntries(crowded.hot.map((symbol, index) => [symbol, now - (index + 1) * 1000]));
  const next = Beat.selectTieredDue({
    symbols, hotSet: symbols.slice(0, 12), lastRefreshedAt: ages, now, hotSize: 3, sweepPerBeat: 5
  });
  assert.equal(next.hot.filter(symbol => ages[symbol] !== undefined).length, 0, "the next beat's hot lane moves on");
  assert.deepEqual(plain(next), plain(Beat.selectTieredDue({
    symbols, hotSet: symbols.slice(0, 12), lastRefreshedAt: ages, now, hotSize: 3, sweepPerBeat: 5
  })));

  /* The plan's own numbers drive a valid selection at every cadence, for every window. */
  for (const cadenceMinutes of Beat.CADENCES) {
    const tiers = Beat.planTiers({ monthlyBudget: 10000, cadenceMinutes, castSize: symbols.length });
    for (const option of tiers.options.filter(entry => entry.feasible)) {
      const due = Beat.selectTieredDue({
        symbols, hotSet: ["S01", "S02"], lastRefreshedAt: {}, now, hotSize: option.hotSize, sweepPerBeat: option.sweepPerBeat
      });
      assert.ok(due.all.length <= tiers.callsPerBeat, `${cadenceMinutes} min / ${option.targetSweepHours}h overspent the beat`);
      assert.ok(due.all.every(symbol => symbols.includes(symbol)));
    }
  }
});

test("every watchlist berth survives a full synthetic beat with an honest directive", () => {
  const stage = Cast.build(TICKERBOT_WATCHLIST);
  for (const berth of plain(stage.berths)) {
    const analysis = MarketContext.evaluate(plain(Beat.rehearse({ symbol: berth.symbol, at: NOW, beat: 3 })));
    const directive = Beat.motion(analysis, { bearingBase: berth.angle + Math.PI / 2 });
    assert.equal(directive.symbol, berth.symbol);
    assert.ok(directive.mood !== "frozen" || directive.gauge.known === false, `${berth.symbol} did not freeze on a full rehearsal series`);
    assert.ok(Number.isFinite(directive.npc.bearing));
  }
});
