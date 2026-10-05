/* Alpha Vantage is retired from new Characters reads and writes. */

import assert from "node:assert/strict";
import { test } from "node:test";
import { handleCharactersBeat, clearCharactersBeatCache } from "../worker/characters-beat.mjs";

const ROUTE = "https://os.example.test/api/characters/v1/beat";
const NOW = Date.parse("2026-10-03T12:00:00.000Z");
const beat = query => new Request(`${ROUTE}?${query}`);

test("Characters refuses Alpha and 1mo without making provider calls", async () => {
  clearCharactersBeatCache();
  let fetches = 0;
  const env = {
    TICKERBOT_API_KEY: "tickerbot-test-secret",
    ALPHA_VANTAGE_API_KEY: "alpha-must-not-be-used",
    MASSIVE_API_KEY: "massive-test-secret"
  };
  const dependencies = {
    now: () => NOW,
    fetch: async () => {
      fetches += 1;
      return Response.json({ results: [] });
    }
  };

  for (const query of [
    "disc=stocks&symbols=AAPL&interval=1mo",
    "disc=stocks&provider=alpha&symbols=AAPL&interval=1mo&cadence=60",
    "disc=stocks&provider=tickerbot&symbols=AAPL&interval=1mo&cadence=60",
    "disc=fx&provider=alpha&symbols=EURUSD&interval=1d",
    "disc=stocks&provider=alpha&symbols=AAPL&interval=1d"
  ]) {
    const response = await handleCharactersBeat(beat(query), env, dependencies);
    assert.equal(response.status, 400, query);
    assert.doesNotMatch(await response.text(), /alpha-must-not-be-used|tickerbot-test-secret|massive-test-secret/);
  }
  assert.equal(fetches, 0, "Alpha and mismatched provider requests fail before outbound work");
});
