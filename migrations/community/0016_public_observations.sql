-- Explicit publication of bounded native Observation notes. These rows are
-- deliberately separate from Ground-0 public reports and never contain a
-- universe-core ID, declaration label, CloudKit record, or private-note payload.

CREATE TABLE community_observation_profiles (
  owner_id TEXT PRIMARY KEY NOT NULL REFERENCES community_users(id) ON DELETE CASCADE,
  pseudonym TEXT NOT NULL CHECK (length(pseudonym) BETWEEN 1 AND 80),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at)
);

-- A native app may create a short-lived, unlisted handoff without embedding a
-- Community credential. A high-entropy manual claim code is entered only by a
-- signed-in person on the same HarshalOS origin. The separate status token lets
-- the originating app poll its own state; neither token is returned in public
-- DTOs. Expiry redacts all staged candidate fields rather than publishing them.
CREATE TABLE community_observation_handoffs (
  id TEXT PRIMARY KEY NOT NULL,
  status_token_hash TEXT NOT NULL UNIQUE,
  claim_code_hash TEXT UNIQUE,
  owner_id TEXT REFERENCES community_users(id) ON DELETE SET NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'claimed', 'published', 'expired')),
  suggested_pseudonym TEXT CHECK (suggested_pseudonym IS NULL OR length(suggested_pseudonym) BETWEEN 1 AND 80),
  phase TEXT CHECK (phase IS NULL OR phase IN ('NAB', 'CWO', 'GSRB')),
  note_text TEXT CHECK (note_text IS NULL OR length(note_text) BETWEEN 1 AND 2000),
  note_hash TEXT CHECK (note_hash IS NULL OR (length(note_hash) = 64 AND note_hash NOT GLOB '*[^0-9a-f]*')),
  claimed_at INTEGER,
  published_observation_id TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL CHECK (expires_at > created_at),
  CHECK (
    (state = 'pending' AND owner_id IS NULL AND claim_code_hash IS NOT NULL
      AND suggested_pseudonym IS NOT NULL AND phase IS NOT NULL AND note_text IS NOT NULL AND note_hash IS NOT NULL
      AND claimed_at IS NULL AND published_observation_id IS NULL)
    OR (state = 'claimed' AND owner_id IS NOT NULL AND claim_code_hash IS NOT NULL
      AND suggested_pseudonym IS NOT NULL AND phase IS NOT NULL AND note_text IS NOT NULL AND note_hash IS NOT NULL
      AND claimed_at IS NOT NULL AND published_observation_id IS NULL)
    OR (state = 'published' AND owner_id IS NOT NULL AND claim_code_hash IS NULL
      AND suggested_pseudonym IS NULL AND phase IS NULL AND note_text IS NULL AND note_hash IS NULL
      AND claimed_at IS NOT NULL AND published_observation_id IS NOT NULL)
    OR (state = 'expired' AND owner_id IS NULL AND claim_code_hash IS NULL AND suggested_pseudonym IS NULL
      AND phase IS NULL AND note_text IS NULL AND note_hash IS NULL AND claimed_at IS NULL
      AND published_observation_id IS NULL)
  )
);
CREATE INDEX community_observation_handoffs_expiry ON community_observation_handoffs(expires_at, state);
CREATE INDEX community_observation_handoffs_owner ON community_observation_handoffs(owner_id, created_at);

-- Published notes copy a server-side profile pseudonym at publication time.
-- They have no editable body: correction means a new note and withdrawal
-- redacts the public body/author/phase while retaining only a minimal tombstone.
CREATE TABLE community_public_observations (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  handoff_id TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL REFERENCES community_users(id),
  state TEXT NOT NULL CHECK (state IN ('published', 'withdrawn', 'hidden')),
  author TEXT,
  phase TEXT,
  note_text TEXT,
  content_hash TEXT NOT NULL CHECK (length(content_hash) = 64 AND content_hash NOT GLOB '*[^0-9a-f]*'),
  created_at INTEGER NOT NULL,
  changed_at INTEGER NOT NULL,
  CHECK (
    (state = 'published' AND author IS NOT NULL AND phase IN ('NAB', 'CWO', 'GSRB')
      AND note_text IS NOT NULL AND length(note_text) BETWEEN 1 AND 2000)
    OR (state != 'published' AND author IS NULL AND phase IS NULL AND note_text IS NULL)
  )
);
CREATE INDEX community_public_observations_feed ON community_public_observations(state, seq);
CREATE INDEX community_public_observations_owner ON community_public_observations(owner_id, seq);

CREATE TABLE community_public_observation_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  observation_id TEXT NOT NULL REFERENCES community_public_observations(id),
  kind TEXT NOT NULL CHECK (kind IN ('published', 'withdrawn', 'hidden')),
  created_at INTEGER NOT NULL
);
CREATE INDEX community_public_observation_events_feed ON community_public_observation_events(seq);

-- Moderator actions are internal audit records. Their notes never enter a
-- public DTO, but a hide must retain an accountable reason in addition to the
-- public minimal tombstone.
CREATE TABLE community_public_observation_moderation_actions (
  id TEXT PRIMARY KEY NOT NULL,
  observation_id TEXT NOT NULL REFERENCES community_public_observations(id),
  moderator_id TEXT NOT NULL REFERENCES community_users(id),
  action TEXT NOT NULL CHECK (action = 'hide'),
  note TEXT NOT NULL CHECK (length(note) BETWEEN 1 AND 2000),
  created_at INTEGER NOT NULL
);
CREATE INDEX community_public_observation_moderation_actions_observation ON community_public_observation_moderation_actions(observation_id, created_at);

CREATE TRIGGER community_public_observations_immutable BEFORE UPDATE ON community_public_observations
WHEN NOT (OLD.state = 'published' AND NEW.state IN ('withdrawn', 'hidden'))
  OR NEW.id IS NOT OLD.id OR NEW.seq IS NOT OLD.seq OR NEW.handoff_id IS NOT OLD.handoff_id
  OR NEW.owner_id IS NOT OLD.owner_id OR NEW.content_hash IS NOT OLD.content_hash
  OR NEW.created_at IS NOT OLD.created_at
BEGIN
  SELECT RAISE(ABORT, 'Published observations cannot be edited or restored');
END;

CREATE TRIGGER community_public_observation_created AFTER INSERT ON community_public_observations
BEGIN
  INSERT INTO community_public_observation_events(observation_id, kind, created_at)
  VALUES (NEW.id, 'published', NEW.created_at);
END;

CREATE TRIGGER community_public_observation_redacted AFTER UPDATE OF state ON community_public_observations
BEGIN
  INSERT INTO community_public_observation_events(observation_id, kind, created_at)
  VALUES (NEW.id, NEW.state, NEW.changed_at);
END;

CREATE TRIGGER community_public_observation_no_delete BEFORE DELETE ON community_public_observations
BEGIN
  SELECT RAISE(ABORT, 'Withdraw or hide the observation; retain a minimal tombstone');
END;

CREATE TRIGGER community_public_observation_events_no_update BEFORE UPDATE ON community_public_observation_events
BEGIN
  SELECT RAISE(ABORT, 'Public observation events are append-only');
END;

CREATE TRIGGER community_public_observation_events_no_delete BEFORE DELETE ON community_public_observation_events
BEGIN
  SELECT RAISE(ABORT, 'Public observation events are append-only');
END;

CREATE TRIGGER community_public_observation_moderation_no_update BEFORE UPDATE ON community_public_observation_moderation_actions
BEGIN
  SELECT RAISE(ABORT, 'Public observation moderation actions are append-only');
END;

CREATE TRIGGER community_public_observation_moderation_no_delete BEFORE DELETE ON community_public_observation_moderation_actions
BEGIN
  SELECT RAISE(ABORT, 'Public observation moderation actions are append-only');
END;

INSERT INTO community_schema VALUES ('public-observations', 1);
