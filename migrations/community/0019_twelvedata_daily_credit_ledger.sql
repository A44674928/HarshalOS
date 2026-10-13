-- Durable per-UTC-day Twelve Data credit ledger for the Orb 2 field.
--
-- Twelve Data's free Basic plan allows 800 API credits a day (and 8 a minute). One
-- compact aggregate row per UTC day counts the credits the Worker and the off-Cloudflare
-- runner have spent. A row is claimed atomically before every provider call, so the
-- two cannot both spend the last credits. No symbols, keys or request history are stored.
CREATE TABLE IF NOT EXISTS twelvedata_daily_credit_ledger (
  utc_day TEXT PRIMARY KEY NOT NULL
    CHECK (length(utc_day) = 10 AND substr(utc_day, 5, 1) = '-' AND substr(utc_day, 8, 1) = '-'),
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  daily_limit INTEGER NOT NULL CHECK (daily_limit > 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= 0)
);
