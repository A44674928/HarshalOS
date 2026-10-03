-- Additive foundation only. Never drop or alter Cloudflare's _cf_KV table.
CREATE TABLE community_users (
  id TEXT PRIMARY KEY NOT NULL,
  oidc_issuer TEXT NOT NULL,
  oidc_subject TEXT NOT NULL,
  blocked INTEGER NOT NULL DEFAULT 0 CHECK (blocked IN (0, 1)),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  UNIQUE (oidc_issuer, oidc_subject)
);
CREATE TABLE community_drafts (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES community_users(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  input_json TEXT NOT NULL CHECK (json_valid(input_json)
    AND json_type(input_json) = 'object' AND length(CAST(input_json AS BLOB)) <= 65536),
  private_notes TEXT NOT NULL DEFAULT '' CHECK (length(private_notes) <= 4000),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  updated_at INTEGER NOT NULL CHECK (updated_at >= created_at)
);
CREATE INDEX community_drafts_owner ON community_drafts(owner_id, id);
CREATE TRIGGER community_drafts_revision_guard
BEFORE UPDATE ON community_drafts
WHEN NEW.id != OLD.id OR NEW.owner_id != OLD.owner_id
  OR NEW.created_at != OLD.created_at OR NEW.revision != OLD.revision + 1
BEGIN
  SELECT RAISE(ABORT, 'Draft identity is immutable; revision must advance by one');
END;
CREATE TABLE community_schema (
  component TEXT PRIMARY KEY NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1)
);
INSERT INTO community_schema VALUES ('private-drafts', 1);
