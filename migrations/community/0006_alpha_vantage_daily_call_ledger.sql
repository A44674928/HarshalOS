-- Independent daily hard cap for Characters' Alpha Vantage fallback.
-- One compact aggregate row per UTC day; no symbols, keys, or request history are stored.
CREATE TABLE alpha_vantage_daily_call_ledger (
  utc_day TEXT PRIMARY KEY NOT NULL
    CHECK (length(utc_day) = 10 AND substr(utc_day, 5, 1) = '-' AND substr(utc_day, 8, 1) = '-'),
  attempted_calls INTEGER NOT NULL DEFAULT 0 CHECK (attempted_calls >= 0),
  daily_limit INTEGER NOT NULL CHECK (daily_limit > 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= 0)
);
