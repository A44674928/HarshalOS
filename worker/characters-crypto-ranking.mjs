/* Live Disc3 ranking source: CoinGecko's public markets endpoint, sorted by trailing
   24-hour total_volume in USD. This is ranking metadata only; prices and monthly bars
   still come from Alpha Vantage after the Worker validates the selected ticker. */
const COINGECKO_ORIGIN = "https://api.coingecko.com";
const RANKING_PATH = "/api/v3/coins/markets";
export const CHARACTERS_CRYPTO_RANKING_TTL_MS = 15 * 60_000;
export const CHARACTERS_CRYPTO_RANKING_SIZE = 52;
const FETCH_TIMEOUT_MS = 8_000;
let cached = null;

const failure = (code, message) => ({ ok: false, code, message });

function normalizeCoinMarkets(payload, at) {
  if (!Array.isArray(payload)) return null;
  const sorted = payload.map((coin, index) => ({ coin, index }))
    .filter(({ coin }) => coin && typeof coin === "object" && !Array.isArray(coin))
    .sort((a, b) => (Number(b.coin.total_volume) || 0) - (Number(a.coin.total_volume) || 0) || a.index - b.index);
  const seenTickers = new Set();
  const instruments = [];
  const stablecoinHints = /stablecoin|tether|usd coin|dai stable/i;
  const stablecoinSymbols = /^(USDT|USDC|USDE|DAI|USDS|USDD|FDUSD|TUSD|PYUSD|USDP|GUSD|FRAX|USDX)$/;
  for (const { coin, index } of sorted) {
    const symbol = typeof coin.symbol === "string" ? coin.symbol.trim().toUpperCase() : "";
    const providerId = typeof coin.id === "string" ? coin.id.trim().toLowerCase() : "";
    const name = typeof coin.name === "string" ? coin.name.trim().slice(0, 80) : "";
    const volumeUsd = Number(coin.total_volume);
    const currentPriceUsd = Number(coin.current_price);
    const marketCapUsd = Number(coin.market_cap);
    if (!/^[A-Z0-9]{2,12}$/.test(symbol) || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(providerId) ||
        !name || !Number.isFinite(volumeUsd) || volumeUsd <= 0 || seenTickers.has(symbol)) continue;
    seenTickers.add(symbol);
    const assetAudit = [];
    if (stablecoinSymbols.test(symbol) || stablecoinHints.test(name)) assetAudit.push("stablecoin-candidate");
    if (!(Number.isFinite(marketCapUsd) && marketCapUsd > 0)) assetAudit.push("missing-market-cap");
    if (Number.isFinite(currentPriceUsd) && currentPriceUsd >= 1_000_000) assetAudit.push("extreme-nominal-price");
    instruments.push(Object.freeze({
      symbol,
      displaySymbol: `${symbol}/USD`,
      name,
      sector: "Cryptocurrency",
      assetClass: "crypto",
      discId: "crypto",
      dataShape: "ohlcv",
      quoteCurrency: "USD",
      rankingProvider: "CoinGecko",
      providerId,
      rank: instruments.length + 1,
      providerRank: index + 1,
      volumeUsd,
      currentPriceUsd: Number.isFinite(currentPriceUsd) && currentPriceUsd > 0 ? currentPriceUsd : null,
      marketCapUsd: Number.isFinite(marketCapUsd) && marketCapUsd > 0 ? marketCapUsd : null,
      audit: Object.freeze(assetAudit)
    }));
    if (instruments.length === CHARACTERS_CRYPTO_RANKING_SIZE) break;
  }
  if (instruments.length !== CHARACTERS_CRYPTO_RANKING_SIZE) return null;
  const stablecoinCandidates = instruments.filter(instrument => instrument.audit.includes("stablecoin-candidate"))
    .map(instrument => ({ rank: instrument.rank, symbol: instrument.symbol, name: instrument.name }));
  const extremeNominalPriceCandidates = instruments.filter(instrument => instrument.currentPriceUsd !== null && instrument.currentPriceUsd >= 1_000_000)
    .map(instrument => ({ rank: instrument.rank, symbol: instrument.symbol, name: instrument.name, currentPriceUsd: instrument.currentPriceUsd }));
  const audit = Object.freeze({
    policy: "Unique ticker symbols from CoinGecko's first 100 volume_desc markets with positive 24-hour USD volume; no investment-quality or listing-legitimacy screen.",
    candidateCount: instruments.length,
    stablecoinCandidateCount: stablecoinCandidates.length,
    stablecoinCandidates: Object.freeze(stablecoinCandidates),
    missingMarketCapCount: instruments.filter(instrument => instrument.marketCapUsd === null).length,
    extremeNominalPriceCandidates: Object.freeze(extremeNominalPriceCandidates),
    warnings: Object.freeze([
      "Provisional live ranking; constituents are not manually vetted.",
      "Stablecoins remain eligible by volume and are flagged for operator review.",
      "Extreme nominal prices are review flags only, not automatic exclusions."
    ])
  });
  return Object.freeze({
    provider: "CoinGecko",
    metric: "trailing 24-hour total_volume, USD",
    rankedAt: new Date(Number(at)).toISOString(),
    audit,
    instruments: Object.freeze(instruments)
  });
}

export function clearCharactersCryptoRankingCache() {
  cached = null;
}

export async function getCharactersCryptoRanking({
  fetcher = globalThis.fetch,
  now = Date.now(),
  timeoutMs = FETCH_TIMEOUT_MS,
  forceRefresh = false
} = {}) {
  if (!forceRefresh && cached && cached.expiresAt > now) return { ok: true, ranking: cached.ranking, cached: true };
  if (typeof fetcher !== "function") return failure("crypto-ranking-unavailable", "CoinGecko's crypto ranking feed is unavailable in this Worker runtime.");

  const url = new URL(RANKING_PATH, COINGECKO_ORIGIN);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("order", "volume_desc");
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", "1");
  url.searchParams.set("sparkline", "false");
  url.searchParams.set("localization", "false");

  const timeout = Number.isFinite(Number(timeoutMs)) ? Math.max(1, Number(timeoutMs)) : FETCH_TIMEOUT_MS;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
  try {
    const response = await fetcher(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "manual",
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!response || !response.ok) {
      const status = Number(response && response.status) || 0;
      return failure(status === 429 ? "crypto-ranking-rate-limit" : "crypto-ranking-upstream",
        status === 429
          ? "CoinGecko's public ranking endpoint is rate-limiting requests; the crypto Disc was not refreshed."
          : "CoinGecko's public ranking endpoint could not provide the crypto Disc right now.");
    }
    let payload;
    try { payload = await response.json(); }
    catch { return failure("crypto-ranking-unreadable", "CoinGecko returned unreadable crypto ranking data."); }
    const ranking = normalizeCoinMarkets(payload, now);
    if (!ranking) return failure("crypto-ranking-unreadable", "CoinGecko did not return 52 unique, volume-ranked crypto tickers.");
    cached = { ranking, expiresAt: now + CHARACTERS_CRYPTO_RANKING_TTL_MS };
    return { ok: true, ranking, cached: false };
  } catch (error) {
    return failure(error && error.name === "AbortError" ? "crypto-ranking-timeout" : "crypto-ranking-unreachable",
      error && error.name === "AbortError"
        ? "CoinGecko's crypto ranking request timed out. Try again shortly."
        : "CoinGecko's public ranking endpoint could not be reached from this Worker.");
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

export async function handleCharactersDiscCatalog(request, dependencies = {}) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/characters/v1/discs") {
    return Response.json({ success: false, message: "Characters Disc catalog route not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (request.method !== "GET") {
    return Response.json({ success: false, message: "The Characters Disc catalog is read-only." }, { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" } });
  }
  const disc = (url.searchParams.get("disc") || "").trim().toLowerCase();
  if (disc !== "crypto") {
    return Response.json({ success: false, message: "Only the live crypto ranking is served by this catalog route." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const result = await getCharactersCryptoRanking(dependencies);
  if (!result.ok) {
    const status = result.code === "crypto-ranking-rate-limit" ? 429
      : result.code === "crypto-ranking-timeout" ? 504 : 502;
    return Response.json({ success: false, message: result.message, code: result.code }, { status, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({
    success: true,
    disc: "crypto",
    ranking: {
      provider: result.ranking.provider,
      metric: result.ranking.metric,
      rankedAt: result.ranking.rankedAt,
      cached: result.cached,
      audit: result.ranking.audit
    },
    instruments: result.ranking.instruments
  }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export const charactersCryptoRankingInternals = Object.freeze({ normalizeCoinMarkets });
