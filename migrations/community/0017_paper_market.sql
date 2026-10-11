-- Account-scoped PAPER_TEST market ledger and native device pairing.
-- This is an additive Community component. It is deliberately isolated from
-- private declaration cores, CloudKit records, broker/custody data, and public
-- publication tables. Every write is a paper-only record.

-- A pairing is created by a native app, explicitly approved by an already
-- signed-in browser account, then redeemed once by that app. Both capabilities
-- are stored only as hashes. Expired/redeemed rows retain a minimal audit state
-- but no usable capability material.
CREATE TABLE paper_market_device_pairings (
  id TEXT PRIMARY KEY NOT NULL,
  pairing_code_hash TEXT UNIQUE,
  poll_token_hash TEXT UNIQUE,
  owner_id TEXT REFERENCES community_users(id) ON DELETE SET NULL,
  device_label TEXT NOT NULL CHECK (length(device_label) BETWEEN 1 AND 80),
  state TEXT NOT NULL CHECK (state IN ('pending', 'approved', 'redeemed', 'expired', 'revoked')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  approved_at INTEGER,
  redeemed_at INTEGER,
  CHECK (
    (state = 'pending' AND owner_id IS NULL AND pairing_code_hash IS NOT NULL AND poll_token_hash IS NOT NULL
      AND approved_at IS NULL AND redeemed_at IS NULL)
    OR (state = 'approved' AND owner_id IS NOT NULL AND pairing_code_hash IS NULL AND poll_token_hash IS NOT NULL
      AND approved_at IS NOT NULL AND redeemed_at IS NULL)
    OR (state = 'redeemed' AND owner_id IS NOT NULL AND pairing_code_hash IS NULL AND poll_token_hash IS NULL
      AND approved_at IS NOT NULL AND redeemed_at IS NOT NULL)
    OR (state = 'expired' AND pairing_code_hash IS NULL AND poll_token_hash IS NULL)
    OR (state = 'revoked' AND pairing_code_hash IS NULL AND poll_token_hash IS NULL)
  )
);
CREATE INDEX paper_market_device_pairings_expiry ON paper_market_device_pairings(state, expires_at);
CREATE INDEX paper_market_device_pairings_owner ON paper_market_device_pairings(owner_id, created_at);

-- A device token grants only owner-scoped PAPER_TEST API access. It is not an
-- OIDC session, browser cookie, provider credential, brokerage authorization,
-- or permanent account secret. Revocation and expiry are checked on every use.
CREATE TABLE paper_market_device_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
  pairing_id TEXT NOT NULL UNIQUE REFERENCES paper_market_device_pairings(id) ON DELETE RESTRICT,
  device_label TEXT NOT NULL CHECK (length(device_label) BETWEEN 1 AND 80),
  scope TEXT NOT NULL CHECK (scope = 'PAPER_TEST'),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  last_used_at INTEGER,
  revoked_at INTEGER
);
CREATE INDEX paper_market_device_tokens_owner ON paper_market_device_tokens(owner_id, revoked_at, expires_at);
CREATE INDEX paper_market_device_tokens_expiry ON paper_market_device_tokens(expires_at, revoked_at);

-- A quote snapshot is an immutable, server-issued reference. Paper-position
-- entry/exit writes can only point to one of these rows; clients cannot supply
-- a price, provider, timestamp, or quote provenance.
CREATE TABLE paper_market_quote_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
  instrument_id TEXT NOT NULL CHECK (length(instrument_id) BETWEEN 1 AND 128),
  symbol TEXT NOT NULL CHECK (length(symbol) BETWEEN 1 AND 32),
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  asset_class TEXT NOT NULL CHECK (asset_class IN ('EQUITY', 'INDEX', 'FOREIGN_EXCHANGE', 'COMMODITY')),
  venue TEXT NOT NULL CHECK (length(venue) BETWEEN 1 AND 48),
  quote_currency TEXT NOT NULL CHECK (length(quote_currency) = 3),
  price_text TEXT NOT NULL CHECK (length(price_text) BETWEEN 1 AND 48),
  provider TEXT NOT NULL CHECK (length(provider) BETWEEN 1 AND 48),
  source_label TEXT NOT NULL CHECK (length(source_label) BETWEEN 1 AND 240),
  interval TEXT NOT NULL CHECK (length(interval) BETWEEN 1 AND 24),
  freshness TEXT NOT NULL CHECK (length(freshness) BETWEEN 1 AND 32),
  observed_at INTEGER NOT NULL,
  retrieved_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > retrieved_at),
  availability TEXT NOT NULL CHECK (availability = 'AVAILABLE'),
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 128),
  UNIQUE(owner_id, idempotency_key)
);
CREATE INDEX paper_market_quote_snapshots_owner ON paper_market_quote_snapshots(owner_id, retrieved_at DESC);
CREATE INDEX paper_market_quote_snapshots_expiry ON paper_market_quote_snapshots(owner_id, expires_at);

-- Phase is a bounded paper-record label only. There is no universe-core ID,
-- declaration label, gate state, or identity assertion in the remote ledger.
CREATE TABLE paper_market_declarations (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('NAB', 'CWO', 'GSRB')),
  instrument_id TEXT NOT NULL CHECK (length(instrument_id) BETWEEN 1 AND 128),
  direction TEXT NOT NULL CHECK (direction IN ('HIGHER', 'LOWER', 'NEUTRAL')),
  thesis TEXT NOT NULL CHECK (length(thesis) BETWEEN 1 AND 2000),
  target_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 128),
  UNIQUE(owner_id, idempotency_key)
);
CREATE INDEX paper_market_declarations_owner ON paper_market_declarations(owner_id, created_at DESC);

CREATE TABLE paper_market_positions (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
  declaration_id TEXT NOT NULL REFERENCES paper_market_declarations(id) ON DELETE RESTRICT,
  phase TEXT NOT NULL CHECK (phase IN ('NAB', 'CWO', 'GSRB')),
  instrument_id TEXT NOT NULL CHECK (length(instrument_id) BETWEEN 1 AND 128),
  side TEXT NOT NULL CHECK (side IN ('LONG', 'SHORT')),
  quantity_text TEXT NOT NULL CHECK (length(quantity_text) BETWEEN 1 AND 48),
  entry_snapshot_id TEXT NOT NULL REFERENCES paper_market_quote_snapshots(id) ON DELETE RESTRICT,
  exit_snapshot_id TEXT REFERENCES paper_market_quote_snapshots(id) ON DELETE RESTRICT,
  state TEXT NOT NULL CHECK (state IN ('OPEN', 'CLOSED', 'WITHDRAWN')),
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  open_idempotency_key TEXT NOT NULL CHECK (length(open_idempotency_key) BETWEEN 16 AND 128),
  close_idempotency_key TEXT UNIQUE CHECK (close_idempotency_key IS NULL OR length(close_idempotency_key) BETWEEN 16 AND 128),
  withdraw_idempotency_key TEXT UNIQUE CHECK (withdraw_idempotency_key IS NULL OR length(withdraw_idempotency_key) BETWEEN 16 AND 128),
  UNIQUE(owner_id, open_idempotency_key),
  CHECK (
    (state = 'OPEN' AND exit_snapshot_id IS NULL AND closed_at IS NULL AND close_idempotency_key IS NULL AND withdraw_idempotency_key IS NULL)
    OR (state = 'CLOSED' AND exit_snapshot_id IS NOT NULL AND closed_at IS NOT NULL AND close_idempotency_key IS NOT NULL AND withdraw_idempotency_key IS NULL)
    OR (state = 'WITHDRAWN' AND exit_snapshot_id IS NULL AND closed_at IS NOT NULL AND close_idempotency_key IS NULL AND withdraw_idempotency_key IS NOT NULL)
  )
);
CREATE INDEX paper_market_positions_owner ON paper_market_positions(owner_id, state, opened_at DESC);
CREATE INDEX paper_market_positions_declaration ON paper_market_positions(owner_id, declaration_id);

-- Retention ceilings are also D1-enforced so concurrent requests cannot exceed
-- the bounded account history even if they race the Worker-side preflight.
CREATE TRIGGER paper_market_quote_capacity BEFORE INSERT ON paper_market_quote_snapshots
WHEN (SELECT COUNT(*) FROM paper_market_quote_snapshots WHERE owner_id=NEW.owner_id) >= 5000
BEGIN
  SELECT RAISE(ABORT, 'Paper market quote snapshot retention limit reached');
END;
CREATE TRIGGER paper_market_declaration_capacity BEFORE INSERT ON paper_market_declarations
WHEN (SELECT COUNT(*) FROM paper_market_declarations WHERE owner_id=NEW.owner_id) >= 1000
BEGIN
  SELECT RAISE(ABORT, 'Paper market declaration retention limit reached');
END;
CREATE TRIGGER paper_market_position_capacity BEFORE INSERT ON paper_market_positions
WHEN (SELECT COUNT(*) FROM paper_market_positions WHERE owner_id=NEW.owner_id) >= 1000
BEGIN
  SELECT RAISE(ABORT, 'Paper market position retention limit reached');
END;

-- The history is append-only and private to the account. It keeps the event
-- record separate from the mutable status projection above, and has no public
-- route or public owner fields.
CREATE TABLE paper_market_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('DECLARATION_RECORDED', 'POSITION_OPENED', 'POSITION_CLOSED', 'POSITION_WITHDRAWN', 'DEVICE_PAIRED', 'DEVICE_REVOKED')),
  declaration_id TEXT REFERENCES paper_market_declarations(id) ON DELETE RESTRICT,
  position_id TEXT REFERENCES paper_market_positions(id) ON DELETE RESTRICT,
  quote_snapshot_id TEXT REFERENCES paper_market_quote_snapshots(id) ON DELETE RESTRICT,
  detail TEXT NOT NULL CHECK (length(detail) BETWEEN 1 AND 280),
  created_at INTEGER NOT NULL
);
CREATE INDEX paper_market_events_owner ON paper_market_events(owner_id, seq DESC);

-- Position references must stay in the same account and preserve the declaration
-- phase/instrument identity. Worker validation makes this the ordinary path;
-- these D1 checks keep a direct SQL mistake from crossing account provenance.
CREATE TRIGGER paper_market_positions_owned_insert BEFORE INSERT ON paper_market_positions
WHEN NOT EXISTS (
  SELECT 1 FROM paper_market_declarations d
  WHERE d.id=NEW.declaration_id AND d.owner_id=NEW.owner_id
    AND d.phase=NEW.phase AND d.instrument_id=NEW.instrument_id
) OR NOT EXISTS (
  SELECT 1 FROM paper_market_quote_snapshots q
  WHERE q.id=NEW.entry_snapshot_id AND q.owner_id=NEW.owner_id
    AND q.instrument_id=NEW.instrument_id AND q.availability='AVAILABLE'
)
BEGIN
  SELECT RAISE(ABORT, 'Paper market position references must belong to its account and instrument');
END;
CREATE TRIGGER paper_market_positions_owned_exit BEFORE UPDATE OF exit_snapshot_id ON paper_market_positions
WHEN NEW.exit_snapshot_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM paper_market_quote_snapshots q
  WHERE q.id=NEW.exit_snapshot_id AND q.owner_id=NEW.owner_id
    AND q.instrument_id=NEW.instrument_id AND q.availability='AVAILABLE'
)
BEGIN
  SELECT RAISE(ABORT, 'Paper market exit quote must belong to its account and instrument');
END;

-- Projection transitions are deliberately narrow: an open position can only
-- close against an immutable server quote or be explicitly withdrawn. Amount,
-- declaration, phase, entry provenance, and timestamps cannot be rewritten.
CREATE TRIGGER paper_market_positions_narrow_update BEFORE UPDATE ON paper_market_positions
WHEN NOT (
  OLD.state = 'OPEN'
  AND (
    (NEW.state = 'CLOSED' AND NEW.exit_snapshot_id IS NOT NULL AND NEW.closed_at IS NOT NULL
      AND NEW.close_idempotency_key IS NOT NULL AND NEW.withdraw_idempotency_key IS NULL)
    OR (NEW.state = 'WITHDRAWN' AND NEW.exit_snapshot_id IS NULL AND NEW.closed_at IS NOT NULL
      AND NEW.close_idempotency_key IS NULL AND NEW.withdraw_idempotency_key IS NOT NULL)
  )
  AND NEW.id IS OLD.id AND NEW.owner_id IS OLD.owner_id AND NEW.declaration_id IS OLD.declaration_id
  AND NEW.phase IS OLD.phase AND NEW.instrument_id IS OLD.instrument_id AND NEW.side IS OLD.side
  AND NEW.quantity_text IS OLD.quantity_text AND NEW.entry_snapshot_id IS OLD.entry_snapshot_id
  AND NEW.opened_at IS OLD.opened_at AND NEW.open_idempotency_key IS OLD.open_idempotency_key
)
BEGIN
  SELECT RAISE(ABORT, 'Paper market positions may only close or withdraw once');
END;

CREATE TRIGGER paper_market_quote_snapshots_no_update BEFORE UPDATE ON paper_market_quote_snapshots
BEGIN
  SELECT RAISE(ABORT, 'Paper market quote snapshots are immutable');
END;
CREATE TRIGGER paper_market_quote_snapshots_no_delete BEFORE DELETE ON paper_market_quote_snapshots
BEGIN
  SELECT RAISE(ABORT, 'Paper market quote snapshots are retained for paper-ledger provenance');
END;
CREATE TRIGGER paper_market_declarations_no_update BEFORE UPDATE ON paper_market_declarations
BEGIN
  SELECT RAISE(ABORT, 'Paper market declarations are immutable');
END;
CREATE TRIGGER paper_market_declarations_no_delete BEFORE DELETE ON paper_market_declarations
BEGIN
  SELECT RAISE(ABORT, 'Paper market declarations are retained for event provenance');
END;
CREATE TRIGGER paper_market_positions_no_delete BEFORE DELETE ON paper_market_positions
BEGIN
  SELECT RAISE(ABORT, 'Paper market positions are retained for event provenance');
END;
-- Event emission is in D1 triggers, so a committed declaration or position
-- transition cannot appear in the projection without its corresponding
-- append-only receipt even if the Worker restarts after the SQL batch.
CREATE TRIGGER paper_market_declaration_event AFTER INSERT ON paper_market_declarations
BEGIN
  INSERT INTO paper_market_events(id, owner_id, kind, declaration_id, position_id, quote_snapshot_id, detail, created_at)
  VALUES ('evt-' || lower(hex(randomblob(16))), NEW.owner_id, 'DECLARATION_RECORDED', NEW.id, NULL, NULL,
    'PAPER_TEST declaration recorded for ' || NEW.instrument_id, NEW.created_at);
END;
CREATE TRIGGER paper_market_position_open_event AFTER INSERT ON paper_market_positions
BEGIN
  INSERT INTO paper_market_events(id, owner_id, kind, declaration_id, position_id, quote_snapshot_id, detail, created_at)
  VALUES ('evt-' || lower(hex(randomblob(16))), NEW.owner_id, 'POSITION_OPENED', NEW.declaration_id, NEW.id, NEW.entry_snapshot_id,
    'PAPER_TEST position opened for ' || NEW.instrument_id, NEW.opened_at);
END;
CREATE TRIGGER paper_market_position_close_event AFTER UPDATE OF state ON paper_market_positions
WHEN OLD.state = 'OPEN' AND NEW.state = 'CLOSED'
BEGIN
  INSERT INTO paper_market_events(id, owner_id, kind, declaration_id, position_id, quote_snapshot_id, detail, created_at)
  VALUES ('evt-' || lower(hex(randomblob(16))), NEW.owner_id, 'POSITION_CLOSED', NEW.declaration_id, NEW.id, NEW.exit_snapshot_id,
    'PAPER_TEST position closed for ' || NEW.instrument_id, NEW.closed_at);
END;
CREATE TRIGGER paper_market_position_withdraw_event AFTER UPDATE OF state ON paper_market_positions
WHEN OLD.state = 'OPEN' AND NEW.state = 'WITHDRAWN'
BEGIN
  INSERT INTO paper_market_events(id, owner_id, kind, declaration_id, position_id, quote_snapshot_id, detail, created_at)
  VALUES ('evt-' || lower(hex(randomblob(16))), NEW.owner_id, 'POSITION_WITHDRAWN', NEW.declaration_id, NEW.id, NULL,
    'PAPER_TEST position withdrawn for ' || NEW.instrument_id, NEW.closed_at);
END;

CREATE TRIGGER paper_market_events_no_update BEFORE UPDATE ON paper_market_events
BEGIN
  SELECT RAISE(ABORT, 'Paper market events are append-only');
END;
CREATE TRIGGER paper_market_events_no_delete BEFORE DELETE ON paper_market_events
BEGIN
  SELECT RAISE(ABORT, 'Paper market events are append-only');
END;

INSERT INTO community_schema VALUES ('paper-market', 1);
