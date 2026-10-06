/*
 * Good Intelligence — Dollar Strength (DS) bridge.
 *
 * This browser module contains no fetches and no synthetic fixtures. It only
 * derives a display-only daily reference from six confirmed, timestamp-aligned
 * Massive FX closes already returned by the same-origin Characters Worker.
 */
"use strict";

(() => {
  const SCHEMA = "good-intelligence-dollar-strength-v1";
  const DS_CONSTANT = 50.14348112;
  const MAX_INPUT_AGE_MS = 4 * 24 * 60 * 60_000;
  /* Catalog symbols are all quoted USD per one foreign-currency unit. ICE Rule
     15.01 expresses each rate in European terms (foreign units per USD), so
     every supplied USD-per-foreign close is inverted: close ^ -weight. */
  const COMPONENTS = Object.freeze([
    Object.freeze({ symbol: "EURUSD", currency: "EUR", weight: 0.576, quote: "USD per EUR" }),
    Object.freeze({ symbol: "JPYUSD", currency: "JPY", weight: 0.136, quote: "USD per JPY" }),
    Object.freeze({ symbol: "GBPUSD", currency: "GBP", weight: 0.119, quote: "USD per GBP" }),
    Object.freeze({ symbol: "CADUSD", currency: "CAD", weight: 0.091, quote: "USD per CAD" }),
    Object.freeze({ symbol: "SEKUSD", currency: "SEK", weight: 0.042, quote: "USD per SEK" }),
    Object.freeze({ symbol: "CHFUSD", currency: "CHF", weight: 0.036, quote: "USD per CHF" })
  ]);
  const REQUIRED_ASSETS = 52;
  const MIN_SECTOR_SIZE = 4;
  const MAX_SECTOR_SIZE = 7;
  const finite = value => typeof value === "number" && Number.isFinite(value);
  const cleanSymbol = value => String(value || "").trim().toUpperCase();

  function confirmedDailyClose(observation, { symbol = "", discId = "fx", maxAgeMs = MAX_INPUT_AGE_MS, now = Date.now() } = {}) {
    const expectedSymbol = cleanSymbol(symbol);
    if (!observation || typeof observation !== "object") return { ok: false, code: "missing", message: "No provider observation is available." };
    if (expectedSymbol && cleanSymbol(observation.symbol) !== expectedSymbol) {
      return { ok: false, code: "symbol-mismatch", message: "The observation symbol does not match the reviewed component." };
    }
    if (observation.discId !== discId || observation.providerMode !== "massive" || observation.interval !== "1d") {
      return { ok: false, code: "provider-mismatch", message: "Only a Massive 1d observation on the reviewed Disc can supply this input." };
    }
    if (!observation.market || observation.status === "unavailable") {
      return { ok: false, code: "unavailable", message: "The provider did not supply a market observation." };
    }
    if (observation.market.synthetic === true) {
      return { ok: false, code: "synthetic", message: "Synthetic observations are not accepted." };
    }
    if (observation.market.timeframe !== "1d") {
      return { ok: false, code: "interval-mismatch", message: "The provider packet is not a daily series." };
    }
    const bar = observation.market.latestBar;
    const time = bar && Number(bar.time);
    const close = bar && Number(bar.close);
    if (!bar || bar.confirmed !== true || !finite(time) || time <= 0) {
      return { ok: false, code: "unconfirmed", message: "The latest daily close is not confirmed." };
    }
    if (!finite(close) || close <= 0) {
      return { ok: false, code: "invalid-rate", message: "The provider did not supply a positive finite close." };
    }
    const age = Number(now) - time;
    if (!finite(age) || age < -5 * 60_000 || age > maxAgeMs) {
      return { ok: false, code: "stale", message: "The confirmed daily close is outside the current reference window." };
    }
    return { ok: true, symbol: cleanSymbol(observation.symbol), close, time };
  }

  function evaluate(observations, now = Date.now()) {
    const records = Array.isArray(observations) ? observations : [];
    const bySymbol = new Map();
    for (const observation of records) {
      const symbol = cleanSymbol(observation && observation.symbol);
      if (symbol && !bySymbol.has(symbol)) bySymbol.set(symbol, observation);
    }
    const rates = [];
    const missing = [];
    const invalid = [];
    for (const component of COMPONENTS) {
      const observation = bySymbol.get(component.symbol);
      if (!observation) {
        missing.push(component.symbol);
        continue;
      }
      const result = confirmedDailyClose(observation, { symbol: component.symbol, discId: "fx", now });
      if (!result.ok) {
        invalid.push({ symbol: component.symbol, code: result.code, message: result.message, time: Number(observation.market?.latestBar?.time) || null });
        continue;
      }
      rates.push({ ...component, close: result.close, time: result.time });
    }
    if (missing.length || invalid.length) {
      return Object.freeze({
        ok: false,
        status: missing.length ? "waiting" : invalid.some(item => item.code === "stale") ? "stale" : "held",
        missing: Object.freeze(missing),
        invalid: Object.freeze(invalid),
        rates: Object.freeze(rates),
        reason: missing.length
          ? `Awaiting ${missing.length} confirmed Dollar Strength (DS) component close${missing.length === 1 ? "" : "s"}.`
          : invalid[0].message
      });
    }

    const timestamps = [...new Set(rates.map(rate => rate.time))];
    if (timestamps.length !== 1) {
      const oldestTime = Math.min(...rates.map(rate => rate.time));
      const refreshSymbol = rates.find(rate => rate.time === oldestTime)?.symbol || COMPONENTS[0].symbol;
      return Object.freeze({
        ok: false,
        status: "unaligned",
        missing: Object.freeze([]),
        invalid: Object.freeze([]),
        rates: Object.freeze(rates),
        refreshSymbol,
        reason: "The six confirmed FX closes have different bar timestamps; Dollar Strength (DS) remains held until they align."
      });
    }

    /* Log space avoids intermediate overflow and mirrors ICE's geometric form. */
    const logValue = Math.log(DS_CONSTANT) + rates.reduce((total, rate) => total - rate.weight * Math.log(rate.close), 0);
    const value = Math.exp(logValue);
    if (!finite(value) || value <= 0) {
      return Object.freeze({
        ok: false, status: "held", missing: Object.freeze([]), invalid: Object.freeze([]),
        rates: Object.freeze(rates), reason: "The aligned FX closes did not produce a finite Dollar Strength (DS) reference."
      });
    }
    return Object.freeze({
      ok: true,
      status: "ready",
      value,
      asOf: timestamps[0],
      inputCount: rates.length,
      inputs: Object.freeze(rates.map(rate => Object.freeze({ symbol: rate.symbol, currency: rate.currency, weight: rate.weight, close: rate.close, time: rate.time }))),
      source: "Massive confirmed 1d FX closes · ICE USDX Rule 15.01 weights",
      note: "Daily component-derived reference, not the licensed real-time ICE-distributed Dollar Strength (DS) value."
    });
  }

  function buildFiringOrder(assets) {
    const entries = Array.isArray(assets) ? assets : [];
    const groups = new Map();
    for (const asset of entries) {
      if (!asset || typeof asset !== "object") continue;
      const sector = String(asset.sector || "Unassigned").trim();
      if (!groups.has(sector)) groups.set(sector, []);
      groups.get(sector).push(asset);
    }
    const sortedGroups = [...groups.entries()].map(([sector, members]) => ({
      sector,
      members: [...members].sort((left, right) => {
        const capDifference = Number(right.marketCapUsd) - Number(left.marketCapUsd);
        return (Number.isFinite(capDifference) && capDifference !== 0 ? capDifference : 0) ||
          cleanSymbol(left.symbol).localeCompare(cleanSymbol(right.symbol));
      })
    })).sort((left, right) => {
      const capDifference = Number(right.members[0]?.marketCapUsd) - Number(left.members[0]?.marketCapUsd);
      return (Number.isFinite(capDifference) && capDifference !== 0 ? capDifference : 0) || left.sector.localeCompare(right.sector);
    });
    let sequenceOrder = 0;
    return Object.freeze(sortedGroups.flatMap(group => group.members.map((asset, sectorPosition) => Object.freeze({
      ...asset,
      firingOrder: ++sequenceOrder,
      sectorPosition: sectorPosition + 1,
      sectorSize: group.members.length
    }))));
  }

  function validateFiringRoster(assets, { expectedCount = REQUIRED_ASSETS, minSectorSize = MIN_SECTOR_SIZE, maxSectorSize = MAX_SECTOR_SIZE } = {}) {
    const entries = Array.isArray(assets) ? assets : [];
    const errors = [];
    if (entries.length !== expectedCount) errors.push(`Expected ${expectedCount} ticker assets; received ${entries.length}.`);
    const symbols = entries.map(asset => cleanSymbol(asset && asset.symbol));
    if (symbols.some(symbol => !/^[A-Z][A-Z0-9.-]{0,15}$/.test(symbol))) errors.push("Every roster entry must have a reviewed ticker symbol.");
    if (new Set(symbols).size !== symbols.length) errors.push("Ticker symbols must be unique.");
    for (const asset of entries) {
      if (!asset || typeof asset.sector !== "string" || !asset.sector.trim()) errors.push("Every ticker needs a sourced sector classification.");
      if (!finite(Number(asset.marketCapUsd)) || Number(asset.marketCapUsd) <= 0) errors.push(`${cleanSymbol(asset && asset.symbol) || "Unknown"} has no positive market-cap snapshot.`);
      if (!Number.isSafeInteger(Number(asset.sectorRank)) || Number(asset.sectorRank) <= 0) errors.push(`${cleanSymbol(asset && asset.symbol) || "Unknown"} has no sector rank.`);
      if (!asset.marketCapAsOf || !asset.marketCapSourceUrl) errors.push(`${cleanSymbol(asset && asset.symbol) || "Unknown"} is missing market-cap provenance.`);
    }
    const counts = new Map();
    for (const asset of entries) {
      const sector = String(asset && asset.sector || "Unassigned");
      counts.set(sector, (counts.get(sector) || 0) + 1);
    }
    for (const [sector, count] of counts) {
      if (count < minSectorSize || count > maxSectorSize) errors.push(`${sector} has ${count} tickers; expected ${minSectorSize}–${maxSectorSize}.`);
      const members = entries.filter(asset => asset.sector === sector);
      for (let index = 1; index < members.length; index += 1) {
        if (Number(members[index - 1].marketCapUsd) < Number(members[index].marketCapUsd)) {
          errors.push(`${sector} is not in descending market-cap order at ${members[index].symbol}.`);
          break;
        }
      }
    }
    return Object.freeze({
      ok: errors.length === 0,
      errors: Object.freeze(errors),
      count: entries.length,
      sectors: Object.freeze([...counts.entries()].map(([sector, count]) => Object.freeze({ sector, count }))),
      firingOrder: buildFiringOrder(entries)
    });
  }

  window.GoodIntelligenceDollarStrength = Object.freeze({
    SCHEMA,
    DS_CONSTANT,
    MAX_INPUT_AGE_MS,
    COMPONENTS,
    REQUIRED_ASSETS,
    MIN_SECTOR_SIZE,
    MAX_SECTOR_SIZE,
    confirmedDailyClose,
    evaluate,
    buildFiringOrder,
    validateFiringRoster
  });
})();
