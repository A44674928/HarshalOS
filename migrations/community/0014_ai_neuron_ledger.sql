-- One aggregate daily counter for every Worker-routed Workers AI call.
-- The free allocation is 10,000 Neurons per UTC day; each outbound attempt
-- atomically claims its conservative estimate immediately before generation
-- and is refused once the Worker limit is reached. No per-request history is
-- stored; estimates are ceilings (input chars plus the reserved output
-- ceiling), so the ledger can only over-count, never silently overspend.
CREATE TABLE ai_neuron_ledger (
  utc_day TEXT PRIMARY KEY NOT NULL
    CHECK (length(utc_day) = 10 AND substr(utc_day, 5, 1) = '-' AND substr(utc_day, 8, 1) = '-'),
  neurons INTEGER NOT NULL DEFAULT 0 CHECK (neurons >= 0),
  attempted_calls INTEGER NOT NULL DEFAULT 0 CHECK (attempted_calls >= 0),
  provider_budget INTEGER NOT NULL CHECK (provider_budget > 0),
  worker_limit INTEGER NOT NULL CHECK (worker_limit > 0 AND worker_limit <= provider_budget),
  updated_at INTEGER NOT NULL CHECK (updated_at >= 0)
);
