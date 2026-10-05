-- Orb 2 server-side beat field.
--
-- Automatic market beats are produced by the Worker (Cron Trigger + this database),
-- never by a browser tab. These tables hold the newest validated observation per
-- reviewed instrument, the per-UTC-day sweep accounting, and the bounded job queue
-- used by the deploy warm burst and by user-requested priority refreshes.
--
-- No provider secret, browser session id, or full bar series is stored here: one
-- compact observation (price tuple + Characters motion directive) per instrument.

CREATE TABLE IF NOT EXISTS orb2_field_observations (
  interval TEXT NOT NULL,
  symbol TEXT NOT NULL,
  disc_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  beat_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  bar_time INTEGER,
  confirmed INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (interval, symbol)
);

CREATE INDEX IF NOT EXISTS idx_orb2_field_observations_observed
  ON orb2_field_observations (interval, observed_at);

-- One accounting row per UTC day. `lock_at` is the single-writer lease that keeps
-- overlapping Cron ticks from double-spending the provider envelope.
CREATE TABLE IF NOT EXISTS orb2_field_runs (
  utc_day TEXT PRIMARY KEY,
  massive_calls INTEGER NOT NULL DEFAULT 0,
  tickerbot_calls INTEGER NOT NULL DEFAULT 0,
  sweeps_completed INTEGER NOT NULL DEFAULT 0,
  last_tick_at INTEGER,
  last_observation_at INTEGER,
  last_sweep_completed_at INTEGER,
  last_error TEXT NOT NULL DEFAULT '',
  lock_owner TEXT,
  lock_at INTEGER,
  updated_at INTEGER NOT NULL
);

-- Singleton control row: when the field was last warmed, and the deploy marker.
CREATE TABLE IF NOT EXISTS orb2_field_control (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  deploy_warm_at INTEGER,
  manual_warm_at INTEGER,
  warm_bursts INTEGER NOT NULL DEFAULT 0,
  ranking_attempt_at INTEGER,
  updated_at INTEGER NOT NULL
);

-- Bounded job queue. `lane` is 'hot' for a user-requested priority refresh and
-- 'sweep' for the deploy warm burst. Rows are claimed with a lease so a Worker
-- restart never loses the burst.
CREATE TABLE IF NOT EXISTS orb2_field_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  interval TEXT NOT NULL,
  symbol TEXT NOT NULL,
  reason TEXT NOT NULL,
  lane TEXT NOT NULL DEFAULT 'sweep',
  claimed_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  UNIQUE (interval, symbol, reason)
);

CREATE INDEX IF NOT EXISTS idx_orb2_field_queue_lane
  ON orb2_field_queue (lane, claimed_at, id);
