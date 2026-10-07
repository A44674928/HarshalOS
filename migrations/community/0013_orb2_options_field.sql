-- Server-side EOD Options Field for reviewed Stock Characters.
--
-- One compact row per underlying. The selected contract universe is itself
-- persisted so the daily scheduler does not rediscover the chain on every tick.
-- The selection remains bounded by logarithmic strike distance from the
-- underlying EOD price and by a fixed contract count.

CREATE TABLE IF NOT EXISTS orb2_options_observations (
  symbol TEXT PRIMARY KEY,
  underlying_price REAL,
  selection_json TEXT NOT NULL,
  bars_json TEXT NOT NULL,
  status TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orb2_options_observations_observed
  ON orb2_options_observations(observed_at);
