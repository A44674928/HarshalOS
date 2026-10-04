-- Anonymous, per-browser Orb 2 beat history. Each row is one compact observation
-- snapshot (not a provider credential, full bar history, identity, or action record).
-- The Worker retains at most 120 unexpired rows for each opaque random session id.
CREATE TABLE orb2_saved_beats (
  session_id TEXT NOT NULL
    CHECK (length(session_id) = 36),
  beat_id TEXT NOT NULL
    CHECK (length(beat_id) = 36),
  beat_at INTEGER NOT NULL CHECK (beat_at >= 0),
  provider TEXT NOT NULL CHECK (provider IN ('massive', 'tickerbot', 'alpha', 'rehearsal')),
  disc_id TEXT NOT NULL CHECK (disc_id IN ('stocks', 'fx', 'crypto', 'commodities', 'indices')),
  payload TEXT NOT NULL CHECK (length(payload) <= 40960),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  PRIMARY KEY (session_id, beat_id)
);

CREATE INDEX orb2_saved_beats_by_session_time
  ON orb2_saved_beats (session_id, beat_at DESC);

CREATE INDEX orb2_saved_beats_by_expiry
  ON orb2_saved_beats (expires_at);
