/*
 * HF Data Library historical-data boundary.
 * Full Parquet archives live in R2; the Worker reads only a bounded normalized tail.
 */
import {
  MARKET_DATA_PROVIDER_CONTRACT,
  MARKET_DATA_SCHEMA,
  createProviderProvenance,
  marketDataUnavailable
} from "./market-data-provider.mjs";

export const HF_DATA_LIBRARY_PROVIDER = "hf-data-library";
export const HF_DATA_LIBRARY_TIMEFRAME = "1m";
export const HF_DATA_LIBRARY_TAIL_LIMIT = 5000;
export const HF_DATA_LIBRARY_SCHEMA = "gi-hf-history-v1";
export const HF_DATA_LIBRARY_PREFIX = "hf-data-library";

const TICKER = /^[A-Z][A-Z0-9.-]{0,11}$/;
const positive = value => typeof value === "number" && Number.isFinite(value) && value > 0;
const nonNegative = value => typeof value === "number" && Number.isFinite(value) && value >= 0;

export function hfRawKey(symbol, version = "clean") {
  const ticker = String(symbol || "").trim().toUpperCase();
  if (!TICKER.test(ticker)) throw new TypeError("Invalid HF Data Library ticker.");
  if (!["clean", "raw"].includes(version)) throw new TypeError("HF Data Library version must be clean or raw.");
  return \`\${HF_DATA_LIBRARY_PREFIX}/raw/\${version}/\${ticker}.parquet\`;
}

export function hfNormalizedKey(symbol, version = "clean") {
  const ticker = String(symbol || "").trim().toUpperCase();
  if (!TICKER.test(ticker)) throw new TypeError("Invalid HF Data Library ticker.");
  if (!["clean", "raw"].includes(version)) throw new TypeError("HF Data Library version must be clean or raw.");
  return \`\${HF_DATA_LIBRARY_PREFIX}/normalized/\${version}/\${ticker}/1m-tail.json.gz\`;
}

function normalizeBar(value) {
  if (!value || typeof value !== "object") return null;
  const time = typeof value.time === "string" ? value.time : null;
  const open = Number(value.open), high = Number(value.high);
  const low = Number(value.low), close = Number(value.close), volume = Number(value.volume);
  if (!time || !positive(open) || !positive(high) || !positive(low) || !positive(close) || !nonNegative(volume)) return null;
  return { time, open, high, low, close, volume, confirmed: value.confirmed === true };
}

export function parseHfNormalizedArtifact(value, now = Date.now()) {
  if (!value || typeof value !== "object" || value.schema !== HF_DATA_LIBRARY_SCHEMA) {
    return { ok: false, message: "Invalid HF Data Library normalized artifact." };
  }
  const symbol = String(value.symbol || "").trim().toUpperCase();
  if (!TICKER.test(symbol)) return { ok: false, message: "Invalid normalized HF ticker." };
  if (value.provider !== HF_DATA_LIBRARY_PROVIDER || value.timeframe !== HF_DATA_LIBRARY_TIMEFRAME) {
    return { ok: false, message: "HF provider identity or timeframe is invalid." };
  }
  if (!Array.isArray(value.bars) || value.bars.length === 0 || value.bars.length > HF_DATA_LIBRARY_TAIL_LIMIT) {
    return { ok: false, message: "Normalized HF history must contain 1–5000 bars." };
  }
  const bars = value.bars.map(normalizeBar);
  if (bars.some(bar => !bar)) return { ok: false, message: "Normalized HF history contains an invalid bar." };
  for (let i = 1; i < bars.length; i += 1) {
    if (Date.parse(bars[i - 1].time) >= Date.parse(bars[i].time)) {
      return { ok: false, message: "Normalized HF history must be strictly chronological." };
    }
  }
  const retrievedAt = Number(value.retrievedAt);
  if (!Number.isSafeInteger(retrievedAt) || retrievedAt < Date.parse("2020-01-01T00:00:00Z") || retrievedAt > now + 300_000) {
    return { ok: false, message: "Normalized HF retrieval timestamp is invalid." };
  }
  return {
    ok: true,
    artifact: {
      schema: HF_DATA_LIBRARY_SCHEMA, provider: HF_DATA_LIBRARY_PROVIDER,
      providerContract: MARKET_DATA_PROVIDER_CONTRACT, symbol,
      timeframe: HF_DATA_LIBRARY_TIMEFRAME,
      version: value.version === "raw" ? "raw" : "clean",
      retrievedAt, availableBars: bars.length,
      sourceRows: Number.isSafeInteger(value.sourceRows) && value.sourceRows >= bars.length ? value.sourceRows : bars.length,
      bars
    }
  };
}

export function buildHfMarketContext(artifact, now = Date.now()) {
  const parsed = parseHfNormalizedArtifact(artifact, now);
  if (!parsed.ok) return marketDataUnavailable({
    provider: HF_DATA_LIBRARY_PROVIDER, code: "hf-history-invalid",
    message: parsed.message, instrument: artifact?.symbol, timeframe: HF_DATA_LIBRARY_TIMEFRAME
  });
  const value = parsed.artifact;
  const provenance = createProviderProvenance({
    provider: HF_DATA_LIBRARY_PROVIDER, providerId: value.symbol, instrument: value.symbol,
    assetClass: "equity", timeframe: HF_DATA_LIBRARY_TIMEFRAME,
    retrievedAt: value.retrievedAt, availableBars: value.availableBars,
    historyLimit: HF_DATA_LIBRARY_TAIL_LIMIT,
    source: \`HF Data Library \${value.version} 1-minute OHLCV normalized tail\`
  });
  return {
    ok: true,
    packet: {
      schema: MARKET_DATA_SCHEMA, synthetic: false, symbol: value.symbol,
      timeframe: HF_DATA_LIBRARY_TIMEFRAME, dataShape: "ohlcv", quoteCurrency: "USD",
      bars: value.bars, provenance
    }
  };
}

export async function readHfHistory(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/good-intelligence/v1/market/hf-history") {
    return Response.json({ error: "HF history route not found." }, { status: 404 });
  }
  if (request.method !== "GET") return Response.json({ error: "HF history supports GET only." }, { status: 405 });
  const symbol = String(url.searchParams.get("symbol") || "").trim().toUpperCase();
  if (!TICKER.test(symbol)) return Response.json({ error: "A reviewed ticker is required." }, { status: 400 });
  const version = url.searchParams.get("version") === "raw" ? "raw" : "clean";
  const bucket = env.STORAGE_BUCKET;
  if (!bucket || typeof bucket.get !== "function") {
    return Response.json({ error: "R2 historical storage is not configured." }, { status: 503 });
  }
  try {
    const object = await bucket.get(hfNormalizedKey(symbol, version));
    if (!object?.body) return Response.json(marketDataUnavailable({
      provider: HF_DATA_LIBRARY_PROVIDER, code: "hf-history-not-ingested",
      message: \`\${symbol} has no normalized HF Data Library history in R2.\`,
      instrument: symbol, timeframe: HF_DATA_LIBRARY_TIMEFRAME
    }), { status: 503 });
    const bytes = await new Response(object.body).arrayBuffer();
    const text = await new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))
    ).text();
    const result = buildHfMarketContext(JSON.parse(text));
    if (!result.ok) return Response.json(result, { status: 503 });
    return Response.json(result.packet, {
      headers: { "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" }
    });
  } catch {
    return Response.json({ error: "HF historical artifact could not be read from R2." }, { status: 503 });
  }
}
