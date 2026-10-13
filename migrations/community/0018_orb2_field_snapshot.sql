-- Orb 2 field publication: the precomputed document, its per-berth fragments, and
-- the slice cursor that builds them one invocation at a time.
--
-- Why this exists. Reading the field used to mean a dozen D1 statements, a JSON
-- parse per stored payload, a read-time re-composition, and a `JSON.stringify` of
-- the whole ~600 KB document on the request that pays for it — work that scales
-- with the field and has to fit Workers Free's 10 ms CPU budget. Instead the field
-- is built incrementally and stored pre-serialized:
--
--   · `orb2_field_snapshots.body` is the complete response envelope the GET route
--     returns, already serialized. Serving it is one SELECT, no parse, no
--     stringify — the whole point of the precomputation.
--   · The same row keeps the document's *pieces* (the status head without its
--     counts and Disc status, the whole-field counts, the beat-type counts, the
--     Disc status, the DS reference), already serialized. A filtered read
--     (disc / symbols / types) splices those pieces together with the
--     pre-serialized fragments below, so it does not parse the document either.
--   · `orb2_field_fragments` holds one row per reviewed berth per interval: the
--     serialized observation plus the things SQL must be able to count without
--     parsing (the market/confirmed flags and the beat-type mask). A fragment is
--     rewritten only when its stored payload changes or when its freshness label
--     ages out, which is a handful of rows a minute — far below D1 Free's
--     100,000 written rows a day.
--   · `orb2_field_build_state` is the saved cursor: one row per interval, one
--     bounded page per invocation, so no single Cron invocation carries the build.
--
-- Sizes: the assembled 1d document is roughly 600 KB with a fully warm 171-berth
-- field. D1 documents a 2,000,000-byte limit for a string, BLOB, or table row; the
-- builder refuses to publish above ORB2_FIELD_SNAPSHOT_MAX_BYTES (900,000) and
-- keeps the previous document rather than storing a truncated one.

CREATE TABLE IF NOT EXISTS orb2_field_snapshots (
  interval TEXT PRIMARY KEY,
  -- Strong validator for the stored body. It changes with built_at, so publishing
  -- never has to hash ~600 KB.
  etag TEXT NOT NULL DEFAULT '',
  -- The complete `{ success, environment, data }` envelope, pre-serialized.
  body TEXT NOT NULL DEFAULT '',
  bytes INTEGER NOT NULL DEFAULT 0,
  observations INTEGER NOT NULL DEFAULT 0,
  built_at INTEGER NOT NULL DEFAULT 0,
  -- 'worker-cron' | 'github-actions' | 'local-runner' — which publisher wrote it.
  source TEXT NOT NULL DEFAULT 'worker-cron',
  -- The document's pieces, each already serialized. `status_head` ends immediately
  -- before the `"counts":` member of `data.status` (trailing comma included) and
  -- `discs` is the array that follows it, so an assembly splices the members
  -- together with `+` instead of re-serializing the large Disc status.
  status_head TEXT NOT NULL DEFAULT '',
  counts_all TEXT NOT NULL DEFAULT '{}',
  beat_counts TEXT NOT NULL DEFAULT '{}',
  discs TEXT NOT NULL DEFAULT '[]',
  ds TEXT NOT NULL DEFAULT 'null',
  updated_at INTEGER NOT NULL DEFAULT 0
);

-- One row per reviewed berth per interval. `fragment` is the observation JSON
-- exactly as the response carries it (freshness and composition included).
CREATE TABLE IF NOT EXISTS orb2_field_fragments (
  interval TEXT NOT NULL,
  symbol TEXT NOT NULL,
  disc_id TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT '',
  observed_at INTEGER NOT NULL DEFAULT 0,
  confirmed INTEGER NOT NULL DEFAULT 0,
  is_market INTEGER NOT NULL DEFAULT 0,
  -- Bit i is set when ORB2_FIELD_BEAT_TYPES[i] applies to this observation, so the
  -- document's beat counts are SUM(beat_mask & 2^i) instead of a parse per row.
  beat_mask INTEGER NOT NULL DEFAULT 0,
  -- The compact member inputs behind `status.discs[].members[]` (provider, freshness
  -- label, code, message, confirmed, has-market). About 120 bytes per berth, which
  -- is what lets the Disc status be rebuilt without parsing the big fragments.
  member_json TEXT NOT NULL DEFAULT '{}',
  fragment TEXT NOT NULL DEFAULT '',
  -- observed_at + the interval's staleMs: the moment this fragment's "fresh" label
  -- ages out and the fragment has to be rewritten even though nothing was beaten.
  fresh_until INTEGER NOT NULL DEFAULT 0,
  -- The observation row's updated_at this fragment was built from; together with the
  -- cursor's watermark it is what makes the rebuild scoped instead of a full scan.
  source_updated_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (interval, symbol)
);

-- The published document's own order: observed_at descending, then symbol in byte
-- order (SQLite's default BINARY collation). The index carries it so neither the
-- unfiltered read nor a Disc-filtered read has to sort the stored field.
CREATE INDEX IF NOT EXISTS idx_orb2_field_fragments_shape
  ON orb2_field_fragments (interval, disc_id, observed_at DESC, symbol ASC);

-- The aged-fragment scan: `fresh_until <= now` inside one interval.
CREATE INDEX IF NOT EXISTS idx_orb2_field_fragments_fresh
  ON orb2_field_fragments (interval, fresh_until);

-- The change scan is `updated_at > ?` (with a rowid tie-break for a page boundary
-- that lands mid-millisecond) over the observations table. Without this index every
-- slice would read the whole stored field just to find the two or three rows this
-- minute's beat actually wrote. `rowid` cannot be listed in an index, so the
-- tie-break rides on the table's own rowid.
CREATE INDEX IF NOT EXISTS idx_orb2_field_observations_updated
  ON orb2_field_observations (interval, updated_at);

-- One row per interval: the saved cursor for the sliced builder. `stage` is what the
-- next invocation does for this interval — `fragments` (draining changes),
-- `status` (rebuild the pieces), `assemble` (publish). `watermark_*` is the
-- composite (updated_at, rowid) high-water mark of the change scan: a page boundary
-- can never skip a row that shares its updated_at with the previous page's last row.
-- `assembled_at` orders the intervals, so the interval whose document is oldest is
-- the one that gets the next publish, and no interval starves.
CREATE TABLE IF NOT EXISTS orb2_field_build_state (
  interval TEXT PRIMARY KEY,
  stage TEXT NOT NULL DEFAULT 'fragments',
  watermark_at INTEGER NOT NULL DEFAULT 0,
  watermark_rowid INTEGER NOT NULL DEFAULT 0,
  slices INTEGER NOT NULL DEFAULT 0,
  passes INTEGER NOT NULL DEFAULT 0,
  fragments_at INTEGER NOT NULL DEFAULT 0,
  status_at INTEGER NOT NULL DEFAULT 0,
  assembled_at INTEGER NOT NULL DEFAULT 0,
  last_stage TEXT NOT NULL DEFAULT '',
  last_stage_ms INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0
);
