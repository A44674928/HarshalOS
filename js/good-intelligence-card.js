/*
 * HarshalOS — Good Intelligence / Card semantic contract.
 *
 * A Card is the attributable semantic container for one reviewed market entity.
 * It is deliberately thinner than Orb 2: it does not fetch providers, calculate
 * indicators, assign authority, make recommendations, or render a scene.
 *
 * Character is the display/behavior driver attached to the Card. The Character
 * does not become the market entity and does not gain authority from the
 * relationship. Existing CharactersCast assignment remains the source of the
 * driver relationship until a later integration pass makes that relationship
 * explicit at the Card boundary.
 *
 * Observed values and derived values remain separate. Missing information is a
 * state, never a zero. Derived visualization state must identify its source.
 */
"use strict";

(() => {
  const SCHEMA = "gi-card-v1";
  const ID_PREFIX = "GI-CARD-";
  const MARKET_STAGES = Object.freeze(["established", "formation"]);
  const OBSERVATION_STATES = Object.freeze([
    "OBSERVED", "CONFIRMED", "UNCONFIRMED", "PARTIAL", "WARMING-UP",
    "NO-DATA", "UNAVAILABLE", "HELD"
  ]);

  const text = (value, fallback = "", max = 160) => {
    const normalized = String(value ?? "").trim();
    return (normalized || fallback).slice(0, max);
  };

  const finite = value => typeof value === "number" && Number.isFinite(value);

  const slug = value => text(value).toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  function cardIdFor(symbol) {
    const key = slug(symbol);
    return key ? `${ID_PREFIX}${key}` : "";
  }

  function freezeObject(value) {
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return Object.freeze(value.map(freezeObject));
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freezeObject(item)])));
  }

  function normalizeCharacter(character) {
    if (!character || typeof character !== "object") return null;
    const name = text(character.name, "", 96);
    if (!name) return null;
    return {
      characterId: text(character.characterId || character.id, `CHAR-${slug(name)}`, 96),
      name,
      role: text(character.role, "", 160),
      glyph: text(character.glyph, "", 8),
      assignment: text(character.assignment, "characters-cast-v1", 80)
    };
  }

  function normalizeObservation(observation) {
    if (!observation || typeof observation !== "object") return null;
    const state = text(observation.state, "UNCONFIRMED", 32).toUpperCase();
    return {
      observationId: text(observation.observationId || observation.id, "", 128),
      timestamp: finite(observation.timestamp) ? observation.timestamp : null,
      provider: text(observation.provider, "", 80),
      interval: text(observation.interval, "", 24),
      state: OBSERVATION_STATES.includes(state) ? state : "UNCONFIRMED",
      confirmed: observation.confirmed === true,
      held: observation.held === true,
      source: text(observation.source, "", 200)
    };
  }

  function normalizeMarketStage(value) {
    const stage = text(value, "established", 32).toLowerCase();
    return MARKET_STAGES.includes(stage) ? stage : "established";
  }

  function build(input = {}) {
    const roster = input.roster && typeof input.roster === "object" ? input.roster : {};
    const symbol = text(roster.symbol || input.symbol, "", 32).toUpperCase();
    if (!symbol) {
      return Object.freeze({ schema: SCHEMA, ok: false, code: "missing-symbol", card: null });
    }

    const observation = normalizeObservation(input.observation);
    const character = normalizeCharacter(input.character);
    const marketStage = normalizeMarketStage(roster.marketStage || input.marketStage);
    const provenance = {
      rosterSource: text(roster.marketCapSource || input.rosterSource, "", 200),
      rosterAsOf: text(roster.marketCapAsOf || input.rosterAsOf, "", 32),
      sector: text(roster.sector || input.sector, "", 80),
      sectorRank: Number.isSafeInteger(Number(roster.sectorRank)) && Number(roster.sectorRank) > 0
        ? Number(roster.sectorRank) : null,
      marketCapUsd: finite(Number(roster.marketCapUsd)) && Number(roster.marketCapUsd) > 0
        ? Number(roster.marketCapUsd) : null,
      marketCapSourceUrl: text(roster.marketCapSourceUrl || input.marketCapSourceUrl, "", 400)
    };

    const card = {
      schema: SCHEMA,
      cardId: cardIdFor(symbol),
      identity: {
        cardId: cardIdFor(symbol),
        symbol,
        issuer: text(roster.name || input.issuer, symbol, 120),
        assetClass: text(roster.assetClass || input.assetClass, "equity", 32)
      },
      provenance,
      marketStage,
      driver: {
        kind: "character",
        character
      },
      observation,
      financialState: input.financialState && typeof input.financialState === "object"
        ? input.financialState : null,
      maturityState: input.maturityState && typeof input.maturityState === "object"
        ? input.maturityState : null,
      composition: input.composition && typeof input.composition === "object"
        ? input.composition : null,
      nabState: input.nabState && typeof input.nabState === "object"
        ? input.nabState : null,
      visualization: input.visualization && typeof input.visualization === "object"
        ? input.visualization : null,
      accountability: {
        source: observation?.provider || provenance.rosterSource || "",
        timestamp: observation?.timestamp ?? null,
        validation: observation?.state || "NO-DATA",
        state: observation ? (observation.confirmed ? "confirmed" : "unconfirmed") : "unobserved"
      },
      semantics: Object.freeze({
        displayOnly: true,
        financialInstruction: false,
        authorization: false,
        agency: false,
        derivedStateMustBeAttributable: true
      })
    };

    return Object.freeze({ schema: SCHEMA, ok: true, code: "ok", card: freezeObject(card) });
  }

  function isCard(value) {
    return Boolean(value && value.schema === SCHEMA && value.cardId && value.identity
      && value.identity.symbol && value.semantics?.displayOnly === true
      && value.semantics?.authorization === false && value.semantics?.agency === false);
  }

  window.GoodIntelligenceCard = Object.freeze({
    SCHEMA,
    ID_PREFIX,
    MARKET_STAGES,
    OBSERVATION_STATES,
    cardIdFor,
    build,
    isCard
  });
})();
