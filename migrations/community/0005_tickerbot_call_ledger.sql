-- One aggregate monthly counter for every Worker route using TICKERBOT_API_KEY.
-- No per-symbol/per-request history is stored; each outbound attempt atomically
-- increments one indexed row, shared across isolates and devices.
CREATE TABLE tickerbot_call_ledger (
  utc_month TEXT PRIMARY KEY NOT NULL
    CHECK (length(utc_month) = 7 AND substr(utc_month, 5, 1) = '-'),
  attempted_calls INTEGER NOT NULL DEFAULT 0 CHECK (attempted_calls >= 0),
  provider_budget INTEGER NOT NULL CHECK (provider_budget > 0),
  worker_limit INTEGER NOT NULL CHECK (worker_limit > 0 AND worker_limit <= provider_budget),
  updated_at INTEGER NOT NULL CHECK (updated_at >= 0)
);
