/*
 * HarshalOS — nightly D1-to-R2 backup, one small page per scheduled tick.
 *
 * The per-minute Orb 2 tick already runs 24/7, so the backup rides it instead
 * of owning a second schedule: `runScheduledBackup()` processes exactly one
 * page (one D1 read, one R2 PUT) per invocation and returns. A full pass over
 * every table drains in the minutes after UTC midnight; the rest of the day
 * each tick spends a single progress read and no-ops.
 *
 * Why paged: serializing whole tables at once would spend a whole invocation's
 * CPU budget on JSON and die the same Free-plan death the tick itself had to
 * be slimmed for. Pages are 25 rows — roughly 100 KiB of JSON on the largest
 * table — which keeps the added CPU per tick to a millisecond or two.
 *
 * What is covered: every table holding irreplaceable or expensive-to-rebuild
 * state, in a fixed order, written as one JSON part object per page plus a
 * manifest when the day completes:
 *
 *   d1-backup/<UTC day>/<table>/part-<offset>.json
 *   d1-backup/<UTC day>/manifest.json
 *
 * Deliberately excluded: community_auth_flows, community_sessions and
 * community_auth_rates (short-lived credentials and quota buckets — restoring
 * yesterday's sessions would resurrect expired logins), and this job's own
 * progress table. Restores are manual (see docs/deployment/D1-BACKUP.md):
 * there is deliberately no code path that writes a backup back into D1, so a
 * bug here can waste R2 objects but can never corrupt the live database.
 */

export const D1_BACKUP_SCHEMA = "hos-d1-backup-v1";
export const D1_BACKUP_MANIFEST_SCHEMA = "hos-d1-backup-manifest-v1";
export const D1_BACKUP_PREFIX = "d1-backup";
export const D1_BACKUP_PAGE_ROWS = 25;

/* Fixed order, small and irreplaceable first, largest regenerable cache last.
   `_manifest` is not a table: it is the final cursor step, which writes the
   day's manifest from the progress rows so a crash between the last table and
   the manifest cannot leave a day permanently manifest-less. */
export const D1_BACKUP_TABLES = Object.freeze([
  "community_schema",
  "community_users",
  "community_drafts",
  "community_runs",
  "community_public_series",
  "community_previews",
  "community_publications",
  "community_public_events",
  "community_reports",
  "community_moderation_actions",
  "tickerbot_call_ledger",
  "alpha_vantage_daily_call_ledger",
  "massive_daily_call_ledger",
  "kraken_public_call_ledger",
  "ai_neuron_ledger",
  "orb2_field_runs",
  "orb2_field_control",
  "orb2_field_queue",
  "orb2_saved_beats",
  "characters_crypto_ranking_cache",
  "massive_futures_contract_cache",
  "characters_kraken_daily_bar_cache",
  "orb2_options_observations",
  "orb2_field_observations",
  "_manifest"
]);

const TABLE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const zeroPad = (value, width) => String(value).padStart(width, "0");

export function d1BackupDay(at = Date.now()) {
  const timestamp = Number(at);
  return new Date(Number.isFinite(timestamp) ? timestamp : Date.now()).toISOString().slice(0, 10);
}

export function d1BackupPartKey(day, table, offset) {
  return `${D1_BACKUP_PREFIX}/${day}/${table}/part-${zeroPad(offset, 6)}.json`;
}

export function d1BackupManifestKey(day) {
  return `${D1_BACKUP_PREFIX}/${day}/manifest.json`;
}

/*
 * Process one backup page for the current UTC day. Returns a small summary and
 * never throws for expected states (missing bucket/DB, unmigrated database);
 * unexpected failures reject so the scheduled caller can log them.
 */
export async function runD1BackupPage({ db, bucket, now = Date.now() } = {}) {
  if (!db || typeof db.prepare !== "function") return { ok: false, ran: false, reason: "no-database" };
  if (!bucket || typeof bucket.put !== "function") return { ok: false, ran: false, reason: "no-bucket" };
  const timestamp = Number(now);
  const at = Number.isFinite(timestamp) && timestamp >= 0 ? Math.floor(timestamp) : Date.now();
  const day = d1BackupDay(at);

  let progress;
  try {
    const rows = await db.prepare(
      "SELECT table_name, next_offset, rows_backed_up, done FROM d1_backup_progress WHERE utc_day = ?"
    ).bind(day).all();
    progress = new Map((rows?.results || []).map(row => [String(row.table_name), row]));
  } catch {
    return { ok: false, ran: false, reason: "backup-migration-required" };
  }

  const next = D1_BACKUP_TABLES.find(table => {
    const row = progress.get(table);
    return !row || Number(row.done) !== 1;
  });
  if (!next) return { ok: true, ran: false, done: true, day };

  if (next === "_manifest") {
    const tables = D1_BACKUP_TABLES.filter(table => table !== "_manifest").map(table => {
      const row = progress.get(table);
      const rows = Math.max(0, Math.floor(Number(row?.rows_backed_up) || 0));
      /* Every processed table wrote at least its first (possibly empty) part. */
      return { table, rows, parts: rows === 0 ? 1 : Math.ceil(rows / D1_BACKUP_PAGE_ROWS) };
    });
    const manifest = {
      schema: D1_BACKUP_MANIFEST_SCHEMA,
      day,
      tables,
      rows: tables.reduce((sum, table) => sum + table.rows, 0),
      completedAt: at
    };
    await bucket.put(d1BackupManifestKey(day), JSON.stringify(manifest));
    await db.prepare(
      `INSERT INTO d1_backup_progress (utc_day, table_name, next_offset, rows_backed_up, done, updated_at)
       VALUES (?, '_manifest', 0, 0, 1, ?)
       ON CONFLICT(utc_day, table_name) DO UPDATE SET done = 1, updated_at = excluded.updated_at`
    ).bind(day, at).run();
    return { ok: true, ran: true, done: true, day, table: "_manifest", rows: 0 };
  }

  if (!TABLE_PATTERN.test(next)) return { ok: false, ran: false, reason: "backup-table-not-allowed" };
  const offset = Math.max(0, Math.floor(Number(progress.get(next)?.next_offset) || 0));
  /* rowid order is append-stable: concurrent end-appends cannot shift the
     pages already read, so a page boundary never skips or duplicates rows. */
  const page = await db.prepare(`SELECT * FROM ${next} ORDER BY rowid LIMIT ? OFFSET ?`)
    .bind(D1_BACKUP_PAGE_ROWS, offset).all();
  const rows = Array.isArray(page?.results) ? page.results : [];
  const part = {
    schema: D1_BACKUP_SCHEMA,
    day,
    table: next,
    offset,
    rows,
    complete: rows.length < D1_BACKUP_PAGE_ROWS,
    backedUpAt: at
  };
  const bytes = JSON.stringify(part);
  await bucket.put(d1BackupPartKey(day, next, offset), bytes);
  const done = rows.length < D1_BACKUP_PAGE_ROWS ? 1 : 0;
  await db.prepare(
    `INSERT INTO d1_backup_progress (utc_day, table_name, next_offset, rows_backed_up, done, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(utc_day, table_name) DO UPDATE SET
       next_offset = excluded.next_offset, rows_backed_up = excluded.rows_backed_up,
       done = excluded.done, updated_at = excluded.updated_at`
  ).bind(day, next, offset + rows.length, offset + rows.length, done, at).run();
  return { ok: true, ran: true, done: false, day, table: next, offset, rows: rows.length, bytes: bytes.length };
}

/* Scheduled-tick entry point: never throws, so a backup fault cannot fail the beat. */
export async function runScheduledBackup(env = {}, now = Date.now()) {
  try {
    return await runD1BackupPage({ db: env.COMMUNITY_DB, bucket: env.STORAGE_BUCKET, now });
  } catch (error) {
    return { ok: false, ran: false, reason: "backup-error", error: String((error && error.message) || error).slice(0, 200) };
  }
}
