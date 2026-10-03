-- Immutable private execution records. No public tables/routes are created.
CREATE UNIQUE INDEX community_drafts_identity ON community_drafts(id, owner_id);
CREATE TABLE community_runs (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  draft_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  engine_hash TEXT NOT NULL CHECK (length(engine_hash) = 64 AND engine_hash NOT GLOB '*[^0-9a-f]*'),
  evaluator_hash TEXT NOT NULL CHECK (length(evaluator_hash) = 64 AND evaluator_hash NOT GLOB '*[^0-9a-f]*'),
  report_hash TEXT NOT NULL CHECK (length(report_hash) = 64 AND report_hash NOT GLOB '*[^0-9a-f]*'),
  phase TEXT NOT NULL CHECK (phase IN ('NAB', 'CWO', 'NAB-Constrained', 'GSRB', 'AMBIGUOUS', 'INCOHERENT')),
  report_json TEXT NOT NULL CHECK (json_valid(report_json) AND json_type(report_json) = 'object'
    AND length(CAST(report_json AS BLOB)) <= 196608),
  created_at INTEGER NOT NULL CHECK (created_at >= 0),
  UNIQUE(draft_id, revision, evaluator_hash),
  FOREIGN KEY(draft_id, owner_id) REFERENCES community_drafts(id, owner_id) ON DELETE RESTRICT,
  CHECK (json_extract(report_json, '$.result.phase') IS NOT NULL AND phase = json_extract(report_json, '$.result.phase')),
  CHECK (json_extract(report_json, '$.reviewStatus') IS 'UNREVIEWED'
    AND json_extract(report_json, '$.platformCertification') IS 'NONE'
    AND json_extract(report_json, '$.schema') IS 'ground0-private-run-v1')
);
CREATE INDEX community_runs_owner ON community_runs(owner_id, draft_id, seq);
CREATE TRIGGER community_runs_immutable BEFORE UPDATE ON community_runs
BEGIN
  SELECT RAISE(ABORT, 'Execution records are immutable; save a new draft revision');
END;
INSERT INTO community_schema VALUES ('private-runs', 1);
