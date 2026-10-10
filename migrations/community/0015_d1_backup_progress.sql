-- Durable cursor for the nightly D1-to-R2 backup (worker/d1-backup.mjs).
-- One row per UTC day and table tracks the next page offset; the scheduled
-- tick processes exactly one small page per invocation, so the backup drains
-- in the minutes after midnight without ever spending a whole invocation's
-- CPU budget on serialization.
CREATE TABLE d1_backup_progress (
  utc_day TEXT NOT NULL
    CHECK (length(utc_day) = 10 AND substr(utc_day, 5, 1) = '-' AND substr(utc_day, 8, 1) = '-'),
  table_name TEXT NOT NULL CHECK (length(table_name) BETWEEN 1 AND 64),
  next_offset INTEGER NOT NULL DEFAULT 0 CHECK (next_offset >= 0),
  rows_backed_up INTEGER NOT NULL DEFAULT 0 CHECK (rows_backed_up >= 0),
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  updated_at INTEGER NOT NULL CHECK (updated_at >= 0),
  PRIMARY KEY (utc_day, table_name)
);
