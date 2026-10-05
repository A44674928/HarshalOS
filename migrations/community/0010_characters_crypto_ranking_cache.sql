-- Massive-only crypto constituent cache shared by the Characters selector and Orb 2.
--
-- The payload is one compact, validated 52-pair ranking from Massive's grouped
-- daily crypto aggregates. It contains no provider secret or full bar history.
-- `last_attempt_at` is a cross-isolate retry guard; failed refreshes do not make
-- the prior payload fresh, so expired rankings are never silently substituted.

CREATE TABLE IF NOT EXISTS characters_crypto_ranking_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  ranking_json TEXT,
  fetched_at INTEGER,
  expires_at INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
