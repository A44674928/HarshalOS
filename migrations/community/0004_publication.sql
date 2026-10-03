-- Explicit opt-in publication only. Private IDs never appear in public DTOs.
CREATE TABLE community_public_series (
  id TEXT PRIMARY KEY NOT NULL,
  draft_id TEXT NOT NULL UNIQUE REFERENCES community_drafts(id) ON DELETE RESTRICT
);
CREATE TABLE community_previews (
  token_hash TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES community_users(id),
  draft_id TEXT NOT NULL REFERENCES community_drafts(id),
  run_id TEXT NOT NULL REFERENCES community_runs(id),
  revision INTEGER NOT NULL,
  series_id TEXT NOT NULL REFERENCES community_public_series(id),
  report_json TEXT NOT NULL CHECK (json_valid(report_json) AND length(CAST(report_json AS BLOB)) <= 196608),
  report_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TRIGGER community_previews_immutable BEFORE UPDATE ON community_previews
WHEN NEW.token_hash IS NOT OLD.token_hash OR NEW.owner_id IS NOT OLD.owner_id
  OR NEW.draft_id IS NOT OLD.draft_id OR NEW.run_id IS NOT OLD.run_id OR NEW.revision IS NOT OLD.revision
  OR NEW.series_id IS NOT OLD.series_id OR NEW.report_json IS NOT OLD.report_json
  OR NEW.report_hash IS NOT OLD.report_hash OR NEW.expires_at > OLD.expires_at
BEGIN SELECT RAISE(ABORT, 'Preview content is immutable and expiry cannot be extended'); END;
CREATE INDEX community_previews_expiry ON community_previews(expires_at);
CREATE TABLE community_publications (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL REFERENCES community_users(id),
  draft_id TEXT NOT NULL REFERENCES community_drafts(id),
  run_id TEXT NOT NULL REFERENCES community_runs(id),
  revision INTEGER NOT NULL,
  series_id TEXT NOT NULL REFERENCES community_public_series(id),
  version INTEGER NOT NULL CHECK (version >= 1),
  preview_hash TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('published', 'withdrawn', 'hidden')),
  title TEXT,
  author TEXT,
  phase TEXT,
  report_json TEXT,
  report_hash TEXT NOT NULL CHECK (length(report_hash)=64 AND report_hash NOT GLOB '*[^0-9a-f]*'),
  created_at INTEGER NOT NULL,
  changed_at INTEGER NOT NULL,
  UNIQUE(draft_id, revision),
  UNIQUE(series_id, version),
  CHECK ((state='published' AND title IS NOT NULL AND author IS NOT NULL AND phase IS NOT NULL
    AND report_json IS NOT NULL AND json_valid(report_json) AND length(CAST(report_json AS BLOB)) <= 196608
    AND json_extract(report_json,'$.reviewStatus') IS 'UNREVIEWED'
    AND json_extract(report_json,'$.platformCertification') IS 'NONE'
    AND json_extract(report_json,'$.schema') IS 'ground0-public-v1')
    OR (state!='published' AND title IS NULL AND author IS NULL AND phase IS NULL AND report_json IS NULL))
);
CREATE INDEX community_publications_feed ON community_publications(state, seq);
CREATE INDEX community_publications_owner ON community_publications(owner_id, seq);
CREATE TABLE community_public_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  publication_id TEXT NOT NULL REFERENCES community_publications(id),
  kind TEXT NOT NULL CHECK (kind IN ('published', 'withdrawn', 'hidden')),
  created_at INTEGER NOT NULL
);
CREATE TRIGGER community_publications_immutable BEFORE UPDATE ON community_publications
WHEN NOT (OLD.state='published' AND NEW.state IN ('withdrawn','hidden'))
  OR NEW.id IS NOT OLD.id OR NEW.seq IS NOT OLD.seq OR NEW.owner_id IS NOT OLD.owner_id
  OR NEW.draft_id IS NOT OLD.draft_id OR NEW.run_id IS NOT OLD.run_id OR NEW.revision IS NOT OLD.revision
  OR NEW.series_id IS NOT OLD.series_id OR NEW.version IS NOT OLD.version OR NEW.preview_hash IS NOT OLD.preview_hash
  OR NEW.report_hash IS NOT OLD.report_hash OR NEW.created_at IS NOT OLD.created_at
BEGIN SELECT RAISE(ABORT, 'Published versions cannot be edited or restored'); END;
CREATE TRIGGER community_publication_created AFTER INSERT ON community_publications
BEGIN INSERT INTO community_public_events(publication_id,kind,created_at) VALUES(NEW.id,'published',NEW.created_at); END;
CREATE TRIGGER community_publication_redacted AFTER UPDATE OF state ON community_publications
BEGIN INSERT INTO community_public_events(publication_id,kind,created_at) VALUES(NEW.id,NEW.state,NEW.changed_at); END;
CREATE TRIGGER community_publications_no_delete BEFORE DELETE ON community_publications
BEGIN SELECT RAISE(ABORT,'Withdraw or hide the report; retain a minimal tombstone'); END;
CREATE TRIGGER community_public_events_no_update BEFORE UPDATE ON community_public_events
BEGIN SELECT RAISE(ABORT,'Public events are append-only'); END;
CREATE TRIGGER community_public_events_no_delete BEFORE DELETE ON community_public_events
BEGIN SELECT RAISE(ABORT,'Public events are append-only'); END;
CREATE TABLE community_reports (
  id TEXT PRIMARY KEY NOT NULL,
  publication_id TEXT NOT NULL REFERENCES community_publications(id),
  reporter_id TEXT NOT NULL REFERENCES community_users(id),
  details TEXT NOT NULL CHECK(length(details) BETWEEN 1 AND 2000),
  state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','resolved')),
  resolution_id TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  UNIQUE(publication_id, reporter_id)
);
CREATE INDEX community_reports_queue ON community_reports(state, created_at);
CREATE TABLE community_moderation_actions (
  id TEXT PRIMARY KEY NOT NULL,
  moderator_id TEXT NOT NULL REFERENCES community_users(id),
  report_id TEXT NOT NULL REFERENCES community_reports(id),
  action TEXT NOT NULL CHECK(action IN ('dismiss','hide','hide-and-block')),
  note TEXT NOT NULL CHECK(length(note)<=2000),
  created_at INTEGER NOT NULL
);
INSERT INTO community_schema VALUES ('publication',1);
