import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const cardSource = await readFile(new URL("js/good-intelligence-card.js", ROOT), "utf8");
const rosterSource = await readFile(new URL("js/good-intelligence-market-roster.js", ROOT), "utf8");

function harness() {
  const window = {};
  const context = vm.createContext({ window, globalThis: window, Object, Array, String, Number, Math, Map, Set });
  vm.runInContext(cardSource, context, { filename: "js/good-intelligence-card.js" });
  vm.runInContext(rosterSource, context, { filename: "js/good-intelligence-market-roster.js" });
  return { card: window.GoodIntelligenceCard, roster: window.GoodIntelligenceMarketRoster };
}

test("Card identity is independent of roster position", () => {
  const { card } = harness();
  assert.equal(card.cardIdFor("TMO"), "GI-CARD-TMO");
  assert.equal(card.cardIdFor("TMO"), card.cardIdFor("tmo"));
  assert.notEqual(card.cardIdFor("TMO"), card.cardIdFor("SPCX"));
});

test("Card preserves the reviewed roster snapshot as provenance", () => {
  const { card, roster } = harness();
  const entry = roster.assets.find(item => item.symbol === "TMO");
  const result = card.build({ roster: entry });
  assert.equal(result.ok, true);
  assert.equal(result.card.identity.symbol, "TMO");
  assert.equal(result.card.identity.issuer, "Thermo Fisher Scientific Inc.");
  assert.equal(result.card.provenance.rosterAsOf, "2026-10-02");
  assert.equal(result.card.provenance.sector, "Healthcare");
  assert.equal(result.card.provenance.sectorRank, 8);
  assert.equal(result.card.marketStage, "established");
});

test("Character is an explicit driver relationship, not the market identity", () => {
  const { card } = harness();
  const result = card.build({
    roster: { symbol: "TMO", name: "Thermo Fisher Scientific Inc.", marketStage: "established" },
    character: {
      id: "market-tickerbot-1",
      name: "The Market Tickerbot",
      role: "Reads the market context feed; display-only",
      glyph: "◈"
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.card.identity.symbol, "TMO");
  assert.equal(result.card.driver.kind, "character");
  assert.equal(result.card.driver.character.characterId, "market-tickerbot-1");
  assert.equal(result.card.driver.character.name, "The Market Tickerbot");
  assert.equal(result.card.driver.character.role, "Reads the market context feed; display-only");
  assert.equal(result.card.driver.character.name === result.card.identity.issuer, false);
});

test("Card keeps observed state separate from derived state and never invents missing observations", () => {
  const { card } = harness();
  const result = card.build({
    roster: { symbol: "SPCX", name: "SpaceX", marketStage: "formation" },
    observation: null,
    financialState: null,
    composition: null,
    visualization: { status: "NO-DATA" }
  });
  assert.equal(result.ok, true);
  assert.equal(result.card.marketStage, "formation");
  assert.equal(result.card.observation, null);
  assert.equal(result.card.financialState, null);
  assert.equal(result.card.composition, null);
  assert.equal(result.card.accountability.state, "unobserved");
  assert.equal(result.card.accountability.validation, "NO-DATA");
});

test("Card records confirmed observation provenance without granting agency or authorization", () => {
  const { card } = harness();
  const result = card.build({
    roster: { symbol: "TMO", name: "Thermo Fisher Scientific Inc." },
    observation: {
      observationId: "obs-tmo-20261006-1200",
      timestamp: Date.parse("2026-10-06T12:00:00.000Z"),
      provider: "tickerbot",
      interval: "15m",
      state: "CONFIRMED",
      confirmed: true,
      source: "server-field"
    },
    financialState: { price: 662.77 },
    composition: { mode: "daily-baseline-plus-intraday-residual" }
  });
  assert.equal(card.isCard(result.card), true);
  assert.equal(result.card.observation.provider, "tickerbot");
  assert.equal(result.card.observation.confirmed, true);
  assert.equal(result.card.accountability.state, "confirmed");
  assert.equal(result.card.accountability.timestamp, Date.parse("2026-10-06T12:00:00.000Z"));
  assert.equal(result.card.semantics.displayOnly, true);
  assert.equal(result.card.semantics.authorization, false);
  assert.equal(result.card.semantics.agency, false);
});

test("Invalid Card input fails closed on missing ticker", () => {
  const { card } = harness();
  const result = card.build({ roster: { name: "Unnamed issuer" } });
  assert.equal(result.ok, false);
  assert.equal(result.code, "missing-symbol");
  assert.equal(result.card, null);
});
