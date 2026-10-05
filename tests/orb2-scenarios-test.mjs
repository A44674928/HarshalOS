import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SOURCE = readFileSync(new URL("../js/good-intelligence-orb2-scenarios.js", import.meta.url), "utf8");

function load() {
  const context = vm.createContext({ window: {}, Math, Number, Object, String, Boolean, Array });
  vm.runInContext(SOURCE, context);
  const api = context.window.GoodIntelligenceOrb2Scenarios;
  assert.ok(api, "the scenario module publishes window.GoodIntelligenceOrb2Scenarios");
  return api;
}

const OBSERVED = {
  symbol: "EURUSD",
  discId: "fx",
  interval: "1d",
  confirmed: true,
  provider: "massive",
  motion: { mood: "coil", npc: { bearing: 12 }, item: { rate: 0.4 } },
  market: {
    volumeAvailable: true,
    basis: 100,
    changePct: -0.8,
    latestBar: { close: 1.09, volume: 42000 },
    vfi: { available: true, value: 18 },
    bands: { upper1000: 103, lower1000: 97 }
  }
};

const BARE = {
  symbol: "AAPL", discId: "stocks", interval: "1d", confirmed: false,
  market: { volumeAvailable: false, basis: 10, changePct: 0.1, latestBar: { close: 10, volume: null }, vfi: { available: false }, bands: {} }
};

test("the dial offers five beat types and only the observation carries provider data", () => {
  const { TYPE_IDS, TYPES } = load();
  assert.deepEqual([...TYPE_IDS], ["observation", "message", "trade", "authorization", "permission"]);
  const live = Array.from(TYPES.filter(type => type.live === true), type => type.id);
  assert.deepEqual(live, ["observation"], "exactly one beat type is a provider observation");
  for (const type of TYPES.filter(entry => entry.id !== "observation")) {
    assert.match(type.boundary, /Local teaching visualization/, `${type.id} carries its boundary`);
  }
});

test("a scenario is offered exactly when the stored beat can supply it", () => {
  const { offered, available, scenarioFor } = load();
  assert.deepEqual([...offered(OBSERVED)], ["observation", "message", "trade", "authorization", "permission"]);
  assert.deepEqual([...offered(BARE)], ["observation", "message"], "no volume, no confirmation, no motion ⇒ two types");
  assert.equal(available("trade", BARE), false);
  assert.equal(available("authorization", BARE), false);
  assert.equal(available("permission", BARE), false);
  assert.equal(available("trade", null), false, "a missing observation offers nothing");
  for (const type of ["trade", "authorization", "permission"]) {
    const scenario = scenarioFor(type, BARE, { now: 1 });
    assert.equal(scenario.available, false, `${type} refuses rather than inventing data`);
    assert.match(scenario.reason, /needs|has none|no motion|unconfirmed|not offered/i, `${type} states why`);
    assert.equal(scenario.phases.length, 0, `${type} draws no phases when refused`);
  }
});

test("each scenario is a finite deterministic choreography whose numbers come from supplied fields", () => {
  const { SCHEMA, SCENARIO_TYPES, scenarioFor } = load();
  const now = 1759600000000;
  for (const type of SCENARIO_TYPES) {
    const first = scenarioFor(type, OBSERVED, { now });
    const again = scenarioFor(type, OBSERVED, { now });
    assert.deepEqual(
      { activePhase: first.activePhase, cycleMs: first.cycleMs, phases: first.phases.map(phase => phase.id) },
      { activePhase: again.activePhase, cycleMs: again.cycleMs, phases: again.phases.map(phase => phase.id) },
      `${type} repeats for the same beat and clock`
    );
    assert.equal(first.schema, SCHEMA);
    assert.equal(first.source, "derived-from-stored-server-beat");
    assert.ok(first.phases.length >= 3, `${type} has a multi-leg choreography`);
    let cursor = -1;
    for (const phase of first.phases) {
      assert.ok(Number.isFinite(phase.start) && phase.duration > 0, `${type}/${phase.id} is finite`);
      assert.ok(phase.start >= cursor, `${type}/${phase.id} advances forward`);
      cursor = phase.start;
      assert.match(phase.color, /^#[0-9a-f]{6}$/i, `${type}/${phase.id} uses a fixed palette`);
    }
    assert.ok(first.phases.every(phase => first.phases.some(candidate => candidate.id === first.activePhase)),
      `${type} starts inside a declared phase`);
  }
  const falling = scenarioFor("message", OBSERVED, { now });
  assert.equal(falling.direction, -1, "a falling change gives the envelope its direction");
  assert.ok(falling.widthPct > 0 && falling.widthPct < 20, "fibonacci band width becomes the scenario width");
  const flat = scenarioFor("message", { ...OBSERVED, market: { ...OBSERVED.market, changePct: 0 } }, { now });
  assert.equal(flat.direction, 0, "a flat change leaves the envelope undirected");
});

test("no scenario claims to send, grant, settle, or authorize anything", () => {
  const { TYPES, scenarioFor } = load();
  const text = TYPES.map(type => `${type.summary} ${type.boundary}`).join(" ")
    + " " + ["message", "trade", "authorization", "permission"].map(type => scenarioFor(type, OBSERVED, { now: 5 }).boundary).join(" ");
  assert.match(text, /No OCM message is transmitted/);
  assert.match(text, /Nothing is bought or settled|No trade is placed/);
  assert.match(text, /grants nothing|issues no credential/);
  assert.match(text, /No permission is granted/);
  assert.doesNotMatch(text, /\b(executed|approved|cleared successfully)\b/i, "no scenario narrates an outcome");
});
