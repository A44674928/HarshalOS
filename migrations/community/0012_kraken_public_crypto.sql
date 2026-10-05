-- Kraken public Spot support for Characters Disc3 and Orb 2.
-- The existing ranking cache table (0010) is reused but provider-validated by
-- code. Clear its old Massive roster once so it cannot be mistaken for Kraken.
UPDATE characters_crypto_ranking_cache
  SET ranking_json = NULL,
      fetched_at = NULL,
      expires_at = 0,
      last_attempt_at = 0,
      updated_at = 0
  WHERE id = 1;

-- Shared application-level public-API pacing across Worker isolates. The
-- 160-call UTC-day ceiling is an internal safety bound, not a Kraken quota.
CREATE TABLE IF NOT EXISTS kraken_public_call_ledger (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  utc_day TEXT NOT NULL,
  attempted_calls INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL,
  last_call_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- One validated daily packet per Kraken USD Spot pair. Expired packets are
-- never returned; retry_after_at protects an unavailable pair after a failed
-- or interrupted refresh without extending a successful packet past UTC day.
CREATE TABLE IF NOT EXISTS characters_kraken_daily_bar_cache (
  pair TEXT PRIMARY KEY,
  packet_json TEXT,
  fetched_at INTEGER,
  expires_at INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER NOT NULL DEFAULT 0,
  retry_after_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_characters_kraken_daily_bar_cache_expiry
  ON characters_kraken_daily_bar_cache (expires_at, retry_after_at);

-- Drop legacy Orb 2 rows for the two Discs whose provider contract changed.
-- They cannot be relabeled as Tickerbot/Kraken observations; the scheduled
-- rotation will repopulate each row under its exact new provider identity.
DELETE FROM orb2_field_observations
  WHERE provider = 'massive' AND disc_id IN ('stocks', 'crypto');

-- Orb 2 accounting separates Kraken attempts from the Massive and Tickerbot
-- counters, matching the provider identities stored on observations.
ALTER TABLE orb2_field_runs ADD COLUMN kraken_calls INTEGER NOT NULL DEFAULT 0;
