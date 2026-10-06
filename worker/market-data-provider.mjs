/*
 * Good Intelligence — common market-data provider contract.
 *
 * This module does not fetch data. It defines the boundary every real provider
 * adapter can use to describe provenance, history capacity, and safe availability
 * without manufacturing observations or silently substituting another source.
 */

export const MARKET_DATA_PROVIDER_CONTRACT = "gi-market-provider-v1";
export const MARKET_DATA_SCHEMA = "gi-market-context-v1";

export const MARKET_DATA_STATES = Object.freeze([
  "available",
  "unavailable",
  "insufficient-history",
  "unsupported",
  "misconfigured"
]);

const PROVIDER_ID = /^[a-z0-9][a-z0-9._-]{0,47}$/;
const ASSET_CLASS = /^[a-z][a-z0-9_-]{0,31}$/;
const INTERVAL = /^[0-9]+(?:s|m|h|d|w|mo)$/;
const finite = value => typeof value === "number" && Number.isFinite(value);
const nonNegativeInteger = value => Number.isSafeInteger(value) && value >= 0;
const text = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";

function freezeRecord(value) {
  return Object.freeze(value);
}

/**
 * Describe the capacity of a provider before an indicator asks it for more history.
 * requiredBars is deliberately a consumer requirement, not a provider claim.
 */
export function describeHistoryCapability({ availableBars, requiredBars } = {}) {
  const available = nonNegativeInteger(availableBars) ? availableBars : null;
  const required = nonNegativeInteger(requiredBars) ? requiredBars : null;
  let state = "unknown";
  if (available !== null && required !== null) state = available >= required ? "available" : "insufficient-history";
  else if (available !== null) state = available > 0 ? "available" : "unavailable";

  return freezeRecord({
    state,
    ...(available !== null ? { availableBars: available } : {}),
    ...(required !== null ? { requiredBars: required } : {})
  });
}

/**
 * Create provider provenance for a normalized market-context packet.
 * Provider identity is explicit and never inferred from source text.
 */
export function createProviderProvenance({
  provider,
  providerId,
  instrument,
  assetClass,
  timeframe,
  retrievedAt,
  availableBars,
  historyLimit,
  source
} = {}) {
  const id = text(provider, 48).toLowerCase();
  if (!PROVIDER_ID.test(id)) throw new TypeError("provider must be a stable lowercase provider identifier");

  const provenance = {
    contract: MARKET_DATA_PROVIDER_CONTRACT,
    provider: id
  };

  const idValue = text(providerId, 120);
  if (idValue) provenance.providerId = idValue;
  const instrumentValue = text(instrument, 80);
  if (instrumentValue) provenance.instrument = instrumentValue;
  const assetValue = text(assetClass, 32).toLowerCase();
  if (assetValue) {
    if (!ASSET_CLASS.test(assetValue)) throw new TypeError("assetClass must be a simple asset-class identifier");
    provenance.assetClass = assetValue;
  }
  const timeframeValue = text(timeframe, 24);
  if (timeframeValue) {
    if (!INTERVAL.test(timeframeValue)) throw new TypeError("timeframe must use the normalized interval grammar");
    provenance.timeframe = timeframeValue;
  }
  if (nonNegativeInteger(retrievedAt)) provenance.retrievedAt = retrievedAt;
  if (nonNegativeInteger(availableBars)) provenance.availableBars = availableBars;
  if (nonNegativeInteger(historyLimit)) provenance.historyLimit = historyLimit;
  const sourceValue = text(source, 160);
  if (sourceValue) provenance.source = sourceValue;

  return freezeRecord(provenance);
}

/**
 * Attach provenance without changing observations. Existing packet fields remain intact.
 */
export function withProviderProvenance(packet, provenance) {
  if (!packet || typeof packet !== "object" || Array.isArray(packet) || packet.schema !== MARKET_DATA_SCHEMA) {
    throw new TypeError("packet must be a gi-market-context-v1 object");
  }
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance) ||
      provenance.contract !== MARKET_DATA_PROVIDER_CONTRACT || !PROVIDER_ID.test(String(provenance.provider || ""))) {
    throw new TypeError("provenance must be a gi-market-provider-v1 object");
  }
  return freezeRecord({ ...packet, provenance: freezeRecord({ ...provenance }) });
}

/**
 * Stable, structured provider failure. Adapter-specific codes remain available so
 * callers can preserve their existing HTTP/UI mappings.
 */
export function marketDataUnavailable({
  provider,
  code,
  message,
  state = "unavailable",
  instrument,
  timeframe,
  availableBars,
  requiredBars,
  retryAfterMs
} = {}) {
  const providerValue = text(provider, 48).toLowerCase();
  if (!PROVIDER_ID.test(providerValue)) throw new TypeError("provider must be a stable lowercase provider identifier");
  if (!MARKET_DATA_STATES.includes(state)) throw new TypeError(`Unsupported market-data state: ${state}`);
  const history = describeHistoryCapability({ availableBars, requiredBars });
  const result = {
    ok: false,
    code: text(code, 64) || "market-data-unavailable",
    message: text(message, 240) || "The provider cannot supply the requested market data.",
    marketData: freezeRecord({
      contract: MARKET_DATA_PROVIDER_CONTRACT,
      state,
      provider: providerValue,
      ...(text(instrument, 80) ? { instrument: text(instrument, 80) } : {}),
      ...(text(timeframe, 24) ? { timeframe: text(timeframe, 24) } : {}),
      ...history
    })
  };
  if (nonNegativeInteger(retryAfterMs)) result.retryAfterMs = retryAfterMs;
  return freezeRecord(result);
}
