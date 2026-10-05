-- Date-scoped Massive active-contract selections for the reviewed Disc4 products.
--
-- The Worker discovers one active single-contract ticker per product code from
-- /futures/v1/contracts. Dated selections are cached only through UTC midnight;
-- failed lookups retain a bounded per-product retry timestamp but never keep an
-- expired contract as a fallback. The reserved __GLOBAL__ row records an
-- endpoint-wide circuit-breaker cooldown after authentication/transport errors.

CREATE TABLE IF NOT EXISTS massive_futures_contract_cache (
  product_code TEXT PRIMARY KEY,
  contract_json TEXT,
  source_date TEXT,
  fetched_at INTEGER,
  expires_at INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
