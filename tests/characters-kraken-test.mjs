/* Kraken-only Characters Disc3 ranking, exact-pair bars, and shared pacing. */

import assert from "node:assert/strict";
import { after, test } from "node:test";
import { handleCharactersBeat, clearCharactersBeatCache } from "../worker/characters-beat.mjs";
import { handleCharactersDiscCatalog, clearCharactersCryptoRankingCache } from "../worker/characters-crypto-ranking.mjs";
import { getKrakenDailyMarketContext, clearKrakenDailyBarCache } from "../worker/characters-kraken.mjs";
import { createTickerbotLedgerDb } from "./helpers/tickerbot-ledger-db.mjs";

const NOW = Date.parse("2026-10-03T12:00:00.000Z");
const ROUTE = "https://os.example.test/api/characters/v1/beat";
const fixture = createTickerbotLedgerDb();
const env = { COMMUNITY_DB: fixture.db };
const beat = query => new Request(`${ROUTE}?${query}`);
const reset = () => {
  clearCharactersBeatCache();
  clearCharactersCryptoRankingCache();
  clearKrakenDailyBarCache();
};
const resetKrakenDb = () => fixture.sql.exec(`
  DELETE FROM kraken_public_call_ledger;
  DELETE FROM characters_crypto_ranking_cache;
  DELETE FROM characters_kraken_daily_bar_cache;
`);

after(() => {
  reset();
  fixture.sql.close();
});

function tickerPayload() {
  const symbols = ["BTC", "ETH", ...Array.from({ length: 50 }, (_, index) => `C${String(index).padStart(3, "0")}`)];
  const result = Object.fromEntries(symbols.map((symbol, index) => {
    const volume = 100_000 - index;
    const vwap = 50_000 - index * 100;
    return [`${symbol}/USD`, {
      c: [String(vwap)],
      v: [String(volume + 20), String(volume)],
      p: [String(vwap + 10), String(vwap)]
    }];
  }));
  // A documented assetVersion=1 response uses display names with slash pairs;
  // a fiat base is ignored rather than treated as crypto to pad the roster.
  result["USD/USD"] = { c: ["1"], v: ["100000000", "100000000"], p: ["1", "1"] };
  return { error: [], result };
}

function ohlcPayload(pair = "BTC/USD") {
  const yesterday = Math.floor((NOW - 86_400_000) / 1000);
  const today = Math.floor((NOW + 1_000 - 3_600_000) / 1000);
  return {
    error: [],
    result: {
      [pair]: [
        [yesterday - 86_400, "98", "104", "96", "102", "101", "12.5", 31],
        [yesterday, "102", "107", "100", "105", "103", "8.25", 22],
        [today, "105", "108", "103", "106", "106", "2.5", 7]
      ],
      last: today
    }
  };
}

test("Characters Disc3 ranks the Kraken rolling-24h USD roster from assetVersion=1 display pairs", async () => {
  reset();
  resetKrakenDb();
  const calls = [];
  const response = await handleCharactersDiscCatalog(
    new Request("https://os.example.test/api/characters/v1/discs?disc=crypto"), env,
    {
      now: () => NOW,
      fetch: async (input, options) => {
        const url = new URL(input);
        calls.push({ url, options });
        assert.equal(url.origin, "https://api.kraken.com");
        assert.equal(url.pathname, "/0/public/Ticker");
        return Response.json(tickerPayload());
      }
    }
  );
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.searchParams.get("assetVersion"), "1");
  assert.equal(payload.ranking.provider, "Kraken");
  assert.equal(payload.ranking.venue, "Kraken Spot");
  assert.equal(payload.ranking.sourceWindow, "rolling-24h");
  assert.equal(payload.instruments.length, 52);
  assert.equal(payload.instruments[0].symbol, "BTC");
  assert.equal(payload.instruments[0].providerId, "BTC/USD");
  assert.equal(payload.instruments[0].krakenPair, "BTC/USD");
  assert.equal(payload.instruments[0].marketCapUsd, null);
  assert.match(payload.instruments[0].audit.join(" "), /missing-market-cap/);
  assert.equal(fixture.sql.prepare("SELECT attempted_calls AS calls FROM kraken_public_call_ledger").get().calls, 1);
});

test("Crypto beat keeps the exact Kraken pair and the shared one-request-per-second gate", async () => {
  reset();
  resetKrakenDb();
  const calls = [];
  const ticker = await handleCharactersDiscCatalog(
    new Request("https://os.example.test/api/characters/v1/discs?disc=crypto"), env,
    { now: () => NOW, fetch: async input => { calls.push(new URL(input)); return Response.json(tickerPayload()); } }
  );
  assert.equal(ticker.status, 200);

  const sameSecond = await handleCharactersBeat(beat("disc=crypto&provider=kraken&symbols=BTC&interval=1d&cadence=1"), env, {
    now: () => NOW,
    fetch: async input => {
      calls.push(new URL(input));
      return Response.json(ohlcPayload());
    }
  });
  const held = await sameSecond.json();
  assert.equal(sameSecond.status, 429, "the ranking call consumes the shared Kraken second");
  assert.equal(calls.length, 1, "the pair-bar request is held before provider work");
  assert.equal(held.data.spend.krakenRankingAttempts, 0, "the ranking came from D1");
  assert.equal(held.data.spend.krakenBarAttempts, 0);
  assert.equal(held.data.instruments[0].status, "unavailable");
  assert.equal(held.data.instruments[0].code, "kraken-rate-limit");

  clearCharactersBeatCache();
  const later = await handleCharactersBeat(beat("disc=crypto&provider=kraken&symbols=BTC&interval=1d&cadence=1"), env, {
    now: () => NOW + 1_000,
    fetch: async (input, options) => {
      const url = new URL(input);
      calls.push(url);
      assert.equal(options.method, "GET");
      assert.equal(url.origin, "https://api.kraken.com");
      assert.equal(url.pathname, "/0/public/OHLC");
      assert.equal(url.searchParams.get("pair"), "BTCUSD");
      assert.equal(url.searchParams.get("interval"), "1440");
      assert.equal(url.searchParams.get("assetVersion"), "1");
      return Response.json(ohlcPayload());
    }
  });
  const payload = await later.json();
  assert.equal(later.status, 200);
  assert.equal(calls.length, 2, "the second request is the exact-pair daily OHLC call");
  assert.equal(payload.data.provider, "kraken");
  assert.deepEqual(payload.data.sourceIdentities, [{
    symbol: "BTC", channel: "crypto", providerId: "BTC/USD", rankingProvider: "Kraken", krakenPair: "BTC/USD"
  }]);
  assert.equal(payload.data.spend.krakenRankingAttempts, 0);
  assert.equal(payload.data.spend.krakenBarAttempts, 1);
  assert.equal(payload.data.spend.krakenDaily.calls, 2);
  const instrument = payload.data.instruments[0];
  assert.equal(instrument.status, "bars");
  assert.equal(instrument.marketContext.providerId, "BTC/USD");
  assert.equal(instrument.marketContext.timeframe, "1d");
  assert.equal(instrument.marketContext.dataShape, "ohlcv");
  assert.equal(instrument.marketContext.bars.length, 3);
  assert.equal(instrument.marketContext.bars[0].confirmed, true);
  assert.equal(instrument.marketContext.bars[2].confirmed, false);
  assert.equal(instrument.marketContext.bars[2].volume, 2.5);
  assert.doesNotMatch(JSON.stringify(payload), /fabricated|fallback|massive-test-secret/);
  assert.equal(fixture.sql.prepare("SELECT COUNT(*) AS n FROM characters_kraken_daily_bar_cache").get().n, 1);
});

test("the Kraken bar adapter refuses a pair whose ranking identity does not match", async () => {
  reset();
  let calls = 0;
  const result = await getKrakenDailyMarketContext({
    instrument: {
      symbol: "BTC", assetClass: "crypto", discId: "crypto", rankingProvider: "Kraken",
      providerId: "ETH/USD", krakenPair: "BTC/USD"
    },
    db: env.COMMUNITY_DB,
    now: NOW,
    fetcher: async () => { calls += 1; return Response.json(ohlcPayload()); },
    beforeFetch: async () => ({ ok: true })
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "kraken-instrument-refused");
  assert.equal(calls, 0, "an identity mismatch is rejected before either the ledger or network is used");
});

test("Characters rejects Massive, Tickerbot, and unknown providers for Disc3", async () => {
  reset();
  let calls = 0;
  for (const provider of ["massive", "tickerbot", "alpha", "mystery"]) {
    const response = await handleCharactersBeat(beat(`disc=crypto&provider=${provider}&symbols=BTC&interval=1d&cadence=1`), env, {
      now: () => NOW, fetch: async () => { calls += 1; return Response.json(tickerPayload()); }
    });
    assert.equal(response.status, 400, `${provider} cannot take the crypto path`);
  }
  assert.equal(calls, 0);
});
