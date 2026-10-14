/*
 * HarshalOS — D1 rows-written accounting.
 *
 * Why this module exists. D1 Free allows 100,000 rows written per day, and the
 * platform counts *rows written*, not write statements: "Indexes will add an
 * additional written row when writes include the indexed column, as there are
 * two rows written: one to the table itself, and one to the index" (Cloudflare
 * D1 pricing). Inside SQLite that is literally what happens — a statement
 * maintains one b-tree entry per index whose columns it touches, plus the
 * table's own row — so a single `INSERT` into a table with a compound TEXT
 * primary key and two secondary indexes costs four rows, not one.
 *
 * The Orb 2 field ticks 1,440 times a day. A budget denominated in statements
 * (the one `createSchedulerD1Budget` keeps) can therefore sit comfortably under
 * its own limit while the account walks past the real one, and the failure mode
 * is silent: the database simply stops answering until 00:00 UTC.
 *
 * So this module carries two numbers and keeps both honest:
 *
 *   · `observedRowsWritten(result)` — what D1 actually charged, read from the
 *     `meta.rows_written` the driver returns for every query. Production ground
 *     truth, and it costs nothing to read.
 *   · `rowsWrittenForStatement(query)` — what a statement *will* cost, derived
 *     from the checked-in schema. This is the one that can refuse work before
 *     it is sent, because a write that already happened cannot be un-billed.
 *
 * `tests/d1-rows-written-test.mjs` re-derives the schema model below from
 * `migrations/community/` and fails when the two drift, so an index added in a
 * migration has to be accounted for here before it can merge.
 */

/* ── the allowance ────────────────────────────────────────────────────────
 *
 * D1 Free: 100,000 rows written per day, resetting 00:00 UTC. The whole
 * account draws on that one number — the beat tick, the publication slice, the
 * nightly backup, the community tables, and anything run by hand from Wrangler.
 * The tick is the only one of those that runs 1,440 times a day, so it is the
 * one that has to be bounded: the rest are event-driven and can be reasoned
 * about per event.
 */
export const D1_FREE_ROWS_WRITTEN_PER_DAY = 100_000;
/** Cron Triggers run UTC; the field's every-minute schedule is 1,440 a day. */
export const ORB2_FIELD_TICKS_PER_DAY = 1440;
/**
 * What the beat tick is planned to spend on an average day. Measured against
 * the reviewed roster it is roughly 25 rows a tick — about 36,000 a day — with
 * the rest of the 100,000 left for the publication slice, the nightly backup,
 * community writes, manual ticks, and the burst days (deploy warm-up, priority
 * refreshes, provider retries) that are exactly when a cap is felt.
 */
export const ORB2_FIELD_D1_ROWS_WRITTEN_DAILY_SHARE = 45_000;
/** Kept back inside every tick for its own bookkeeping: lease, result, release. */
export const ORB2_FIELD_SCHEDULER_RESERVED_D1_ROWS_WRITTEN = 6;
/**
 * The reviewed worst case for a *single* invocation, not a slice of the daily
 * allowance: this ceiling and the day are different units, and conflating them
 * is what makes a statement budget look safe while the account is not.
 *
 * A Tickerbot turn beats twelve instruments inside one invocation, and the
 * scheduler's own statement ceiling (104) permits the burst: measured against
 * the reviewed roster that is up to ~130 rows written. The ceiling sits above
 * it so a legitimate burst is never refused closed, and below anything a
 * runaway path would produce — a quiet minute is 11, a rotation minute 18.
 *
 * The day is bounded by the rotation and by the `[orb2-d1]` line every
 * invocation logs, not by this number.
 */
export const ORB2_FIELD_SCHEDULER_MAX_D1_ROWS_WRITTEN = 160;

/* ── the schema model ─────────────────────────────────────────────────────
 *
 * Every table the Orb 2 write path touches, described by the b-trees a write
 * maintains. `rowid: true` means the table keeps its own rowid b-tree, which is
 * every SQLite table except `WITHOUT ROWID` ones; when such a table also
 * declares a PRIMARY KEY, that PK is a *separate* index and is charged on every
 * INSERT and DELETE. `INTEGER PRIMARY KEY` is the rowid itself, so those tables
 * list `primaryKey: []` — there is no second b-tree to maintain.
 *
 * The source of truth is `migrations/community/`. This map describes the schema
 * *after* all migrations, including 0020.
 */
const table = (primaryKey = [], { rowid = true, unique = [], indexes = [] } = {}) =>
  ({ rowid, primaryKey: [...primaryKey], unique: unique.map(entry => [...entry]), indexes: indexes.map(entry => [...entry]) });

export const D1_WRITE_COST = Object.freeze({
  /* The hot table. One row per reviewed berth per interval, rewritten on every
     beat. Migration 0020 dropped `idx_orb2_field_observations_observed`: it
     cost a row written on every upsert and it only ever served the fallback
     live read (`ORB2_FIELD_SNAPSHOT=off`), which reads the same ~170 rows
     through this index as through the PK and simply sorts them. The table must
     stay a rowid table: migration 0018's change scan pages on `rowid`. */
  orb2_field_observations: table(["interval", "symbol"], {
    indexes: [["interval", "updated_at"]]
  }),
  /* One row per UTC day. Written three times a tick (lease, result, release);
     each is an UPDATE that leaves `utc_day` alone, so the PK index is not
     touched and the cost is the table's own row. */
  orb2_field_runs: table(["utc_day"]),
  orb2_field_control: table([], { rowid: true }),
  /* `id INTEGER PRIMARY KEY AUTOINCREMENT` is the rowid, so the only two
     b-trees beyond the table are the UNIQUE conflict target and the lane
     index. A warm burst is one INSERT per berth: three rows each, then two for
     the claim and three for the delete that retires it. */
  orb2_field_queue: table([], {
    unique: [["interval", "symbol", "reason"]],
    indexes: [["lane", "claimed_at", "id"]]
  }),
  /* One row per reviewed berth per interval. A rewrite that changes the payload
     and its freshness label touches the shape index (when the sort keys moved)
     and the freshness index; a rewrite that only re-serializes the same
     observation touches the table alone. */
  orb2_field_fragments: table(["interval", "symbol"], {
    indexes: [["interval", "disc_id", "observed_at", "symbol"], ["interval", "fresh_until"]]
  }),
  orb2_field_snapshots: table(["interval"]),
  orb2_field_build_state: table(["interval"]),
  orb2_options_observations: table(["symbol"], { indexes: [["observed_at"]] }),
  orb2_saved_beats: table(["session_id", "beat_id"], {
    indexes: [["session_id", "beat_at"], ["expires_at"]]
  }),
  /* Provider call ledgers: one row per UTC day (or month), UPDATEd once per
     call. The PK index is charged only on the day's first INSERT. */
  massive_daily_call_ledger: table(["utc_day"]),
  twelvedata_daily_credit_ledger: table(["utc_day"]),
  alpha_vantage_daily_call_ledger: table(["utc_day"]),
  tickerbot_call_ledger: table(["utc_month"]),
  kraken_public_call_ledger: table([], { rowid: true }),
  d1_backup_progress: table(["utc_day", "table_name"]),
  characters_kraken_daily_bar_cache: table(["pair"], { indexes: [["expires_at", "retry_after_at"]] }),
  massive_futures_contract_cache: table(["product_code"]),
  characters_crypto_ranking_cache: table([], { rowid: true })
});

/* ── estimation ───────────────────────────────────────────────────────────*/

const normalize = columns => (Array.isArray(columns) ? columns : [])
  .map(column => String(column).trim().toLowerCase().replace(/^["`[]+|["`\]]+$/g, ""))
  .filter(Boolean);

/**
 * Rows D1 will charge for one write against `table`.
 *
 * `columns` is the set of columns the statement assigns. An index is charged
 * only when a column it contains is written — SQLite leaves an index entry
 * alone when none of its columns changed — so `UPDATE ... SET payload = ?` on
 * `orb2_field_runs` costs one row, not two. A null column set means "unknown",
 * and every b-tree is charged: the estimate is an upper bound, never a
 * discount.
 */
export function estimateRowsWritten(name, { operation = "update", columns = null } = {}) {
  const entry = D1_WRITE_COST[String(name)];
  if (!entry) return { rows: 1, known: false, table: String(name), operation };
  /* The table's own b-tree: one row, always. */
  const trees = [];
  if (entry.rowid && entry.primaryKey.length) trees.push(entry.primaryKey);
  for (const constraint of entry.unique) trees.push(constraint);
  for (const index of entry.indexes) trees.push(index);
  if (operation === "insert" || operation === "replace" || operation === "delete") {
    return { rows: 1 + trees.length, known: true, table: String(name), operation };
  }
  const assigned = columns ? new Set(normalize(columns)) : null;
  const touched = assigned
    ? trees.filter(tree => normalize(tree).some(column => assigned.has(column))).length
    : trees.length;
  return { rows: 1 + touched, known: true, table: String(name), operation };
}

/* ── statement parsing ────────────────────────────────────────────────────*/

const unquote = value => String(value).trim().replace(/^["`[]+|["`\]]+$/g, "");

/** The assigned columns of a `SET` clause: `a = ?, b = excluded.b, c = c + 1`. */
function assignedColumns(clause) {
  const found = [];
  const pattern = /(?:^|,)\s*([A-Za-z_][\w]*)\s*=/g;
  let match = null;
  while ((match = pattern.exec(String(clause || ""))) !== null) found.push(match[1]);
  return found;
}

/**
 * Classify one SQL string as a write and name the table and columns it touches.
 * Returns `null` for anything that does not mutate (SELECT, WITH, PRAGMA,
 * EXPLAIN, or an unrecognised statement — which the caller treats as a read,
 * matching the scheduler's own classifier).
 */
export function parseWriteStatement(query) {
  const sql = String(query || "").replace(/\/\*[\s\S]*?\*\//g, " ").trim();
  let match = null;
  if ((match = /^UPDATE\s+(?:OR\s+\w+\s+)?(["`[\w.]+)\s+SET\s+([\s\S]*?)(?=\s+WHERE\s|$)/i.exec(sql))) {
    return { operation: "update", table: unquote(match[1]), columns: assignedColumns(match[2]) };
  }
  if ((match = /^DELETE\s+FROM\s+(["`[\w.]+)/i.exec(sql))) {
    return { operation: "delete", table: unquote(match[1]), columns: null };
  }
  if ((match = /^REPLACE\s+INTO\s+(["`[\w.]+)/i.exec(sql))) {
    return { operation: "replace", table: unquote(match[1]), columns: null };
  }
  if ((match = /^INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(["`[\w.]+)\s*(?:\(([^)]*)\))?([\s\S]*)$/i.exec(sql))) {
    const rest = match[3] || "";
    const listed = match[2] ? match[2].split(",").map(unquote).filter(Boolean) : null;
    const upsert = /ON\s+CONFLICT[\s\S]*?DO\s+UPDATE\s+SET\s+([\s\S]*?)(?=\s+WHERE\s[\s\S]*$|$)/i.exec(rest);
    return {
      operation: "insert",
      table: unquote(match[1]),
      columns: listed,
      upsertColumns: upsert ? assignedColumns(upsert[1]) : null
    };
  }
  return null;
}

/**
 * What one statement will cost, in rows written. An `INSERT ... ON CONFLICT DO
 * UPDATE` is charged the worse of its two paths: a row that does not yet exist
 * costs every b-tree, and the estimate has to hold whichever way it lands.
 */
export function rowsWrittenForStatement(query) {
  const parsed = parseWriteStatement(query);
  if (!parsed) return { rows: 0, known: true, table: "", operation: "read" };
  if (parsed.operation === "insert" && parsed.upsertColumns) {
    const insert = estimateRowsWritten(parsed.table, { operation: "insert", columns: parsed.columns });
    const update = estimateRowsWritten(parsed.table, { operation: "update", columns: parsed.upsertColumns });
    return {
      rows: Math.max(insert.rows, update.rows),
      known: insert.known && update.known,
      table: parsed.table,
      operation: "upsert"
    };
  }
  return estimateRowsWritten(parsed.table, { operation: parsed.operation, columns: parsed.columns });
}

/* ── observation ──────────────────────────────────────────────────────────*/

/**
 * What D1 charged, from the `meta.rows_written` it returns for every query.
 * `null` when the driver does not report it — which is the case for every
 * in-memory fixture in the tests, and the reason the model above exists.
 */
export function observedRowsWritten(result) {
  const value = Number(result && result.meta ? result.meta.rows_written : NaN);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/* ── the ledger ───────────────────────────────────────────────────────────*/

/**
 * A running total of rows written, kept in memory for the life of one
 * invocation. Deliberately **not** stored in D1: a counter that persists by
 * writing a row is spending the thing it is counting. The durable record is the
 * `[orb2-d1]` / `[orb2-publish]` line each invocation logs, which Workers Logs
 * keeps and can be queried by day.
 */
export function createRowsWrittenLedger() {
  return {
    /** Rows written: observed where D1 reported them, modelled otherwise. */
    rows: 0,
    /** The same total split by table, because "the tick spent 18 rows" is a
        number and "twelve of them were the observations table" is a fix. */
    byTable: Object.create(null),
    /** Statements charged from the model, because the driver reported nothing. */
    modeled: 0,
    /** Statements whose real cost D1 reported. */
    observed: 0,
    /** Write statements that actually executed. */
    statements: 0,
    /** Tables missing from `D1_WRITE_COST`, charged one row and reported. */
    unmodelled: []
  };
}

/** Add one executed write to a ledger, preferring D1's own number. */
export function recordRowsWritten(ledger, { query, result }) {
  const estimate = rowsWrittenForStatement(query);
  const actual = observedRowsWritten(result);
  ledger.statements += 1;
  const charged = actual === null ? estimate.rows : actual;
  /* A batch result carries no query of its own, so its rows are attributed to
     the table the statement named — or to `unknown`, which is itself a signal
     worth seeing in the log. */
  const table = estimate.table || "unknown";
  ledger.byTable[table] = (ledger.byTable[table] || 0) + charged;
  if (actual === null) {
    ledger.modeled += 1;
    if (!estimate.known) ledger.unmodelled.push(estimate.table);
    ledger.rows += estimate.rows;
    return estimate;
  }
  ledger.observed += 1;
  ledger.rows += actual;
  return { ...estimate, rows: actual, observed: true };
}

/**
 * The ledger's breakdown as `table=rows` pairs, largest first, capped so one
 * line of Workers Logs stays one line.
 */
export function formatRowsWrittenBreakdown(ledger, limit = 4) {
  /* A ledger carries `byTable`; a tick summary carries the same map under its
     own name. Either shape works, so one line of logging covers both. */
  const byTable = (ledger && ledger.byTable) || ledger || {};
  const entries = Object.entries(byTable)
    .filter(([, rows]) => rows > 0)
    .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
    .slice(0, Math.max(1, limit));
  return entries.map(([table, rows]) => `${table}=${rows}`).join(",");
}

/**
 * Wrap a D1 handle so every write it issues is counted. Used by the publication
 * slice, which builds its fragments through its own handle rather than the
 * scheduler's budgeted one.
 */
export function countRowsWritten(db, ledger = createRowsWrittenLedger()) {
  /* The query text rides on the wrapper, not on the prepared statement: a D1
     statement object is opaque and in some runtimes frozen, and the model needs
     the SQL to name the table and the columns a write touches. */
  const wrap = (statement, query) => {
    const wrapper = {
      query,
      unwrap() { return statement; },
      bind(...values) { return wrap(statement.bind(...values), query); },
      first(...args) { return statement.first(...args); },
      all(...args) { return statement.all(...args); },
      async run(...args) {
        const result = await statement.run(...args);
        recordRowsWritten(ledger, { query, result });
        return result;
      }
    };
    /* Only advertise what the driver actually has: callers feature-detect
       `raw()` to pick a fast path, and a wrapper that always claims it would
       send them into a method that does not exist. */
    if (typeof statement.raw === "function") wrapper.raw = (...args) => statement.raw(...args);
    return wrapper;
  };
  const unwrap = statement => (statement && typeof statement.unwrap === "function" ? statement.unwrap() : statement);
  return {
    db: {
      prepare(query) { return wrap(db.prepare(query), String(query)); },
      async batch(statements) {
        const list = Array.isArray(statements) ? statements : [];
        const results = await db.batch(list.map(unwrap));
        /* A batch returns one result per statement, in order, so each write is
           charged against its own `meta` — the real number where D1 gave one. */
        const returned = Array.isArray(results) ? results : [];
        for (let index = 0; index < list.length; index += 1) {
          const statement = list[index];
          if (statement && typeof statement.run !== "function") continue;
          recordRowsWritten(ledger, { query: String(statement && statement.query ? statement.query : ""), result: returned[index] });
        }
        return results;
      }
    },
    ledger
  };
}
