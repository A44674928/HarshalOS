/* D1 rows-written accounting.
 *
 * D1 bills rows written, and an index is a row written of its own, so the
 * scheduler's statement budget and the account's daily allowance are different
 * units. These tests hold the model in `worker/d1-rows-written.mjs` to the
 * schema in `migrations/community/` and to the SQL the Orb 2 write path
 * actually issues: an index added in a migration, or a write added to a table
 * nobody modelled, has to be accounted for before it can merge. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  D1_WRITE_COST,
  D1_FREE_ROWS_WRITTEN_PER_DAY,
  ORB2_FIELD_TICKS_PER_DAY,
  ORB2_FIELD_D1_ROWS_WRITTEN_DAILY_SHARE,
  ORB2_FIELD_SCHEDULER_MAX_D1_ROWS_WRITTEN,
  ORB2_FIELD_SCHEDULER_RESERVED_D1_ROWS_WRITTEN,
  countRowsWritten,
  createRowsWrittenLedger,
  estimateRowsWritten,
  formatRowsWrittenBreakdown,
  observedRowsWritten,
  parseWriteStatement,
  rowsWrittenForStatement
} from "../worker/d1-rows-written.mjs";

const MIGRATION_DIR = new URL("../migrations/community/", import.meta.url);
const MIGRATIONS = readdirSync(MIGRATION_DIR).filter(file => file.endsWith(".sql")).sort();

/* ── the schema, derived ──────────────────────────────────────────────────
 *
 * Indexes dropped by a later migration, so the derived model reflects the
 * schema as it will be, not as each file left it.
 */
const droppedIndexes = new Set();

/* Derivation helpers: the same job the model does by hand, done from the
 * migration files. If the two disagree, the migration moved and the model did
 * not.
 */
function splitColumns(body) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const character of body) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) { parts.push(current.trim()); current = ""; continue; }
    current += character;
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

function parseName(value) {
  return String(value).trim().replace(/^["`[]+|["`\]]+$/g, "");
}

function deriveSchema() {
  const tables = {};
  const indexOwner = new Map();
  for (const file of MIGRATIONS) {
    const sql = readFileSync(new URL(file, MIGRATION_DIR), "utf8").replace(/--[^\n]*/g, "");
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map(entry => entry.trim()).filter(Boolean)) {
      const created = /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\S+)\s*\(([\s\S]*)\)([^)]*)$/i.exec(statement);
      if (created) {
        const name = parseName(created[1]);
        const columns = splitColumns(created[2]);
        const withoutRowid = /WITHOUT\s+ROWID/i.test(statement);
        let primaryKey = [];
        const unique = [];
        /* A single-column INTEGER PRIMARY KEY *is* the rowid, so it is not a
           second b-tree — exactly the distinction the model encodes as an empty
           `primaryKey` with `rowid: true`. */
        let rowidAlias = false;
        for (const column of columns) {
          if (/^(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|CONSTRAINT)\b/i.test(column)) {
            const inlineKey = /^PRIMARY\s+KEY\s*\(([^)]*)\)/i.exec(column);
            const inlineUnique = /^UNIQUE\s*\(([^)]*)\)/i.exec(column);
            if (inlineKey) primaryKey = inlineKey[1].split(",").map(parseName);
            if (inlineUnique) unique.push(inlineUnique[1].split(",").map(parseName));
            continue;
          }
          const columnName = parseName(column.split(/\s+/)[0]);
          if (/\bPRIMARY\s+KEY\b/i.test(column)) {
            /* The type sits after the column name: `id INTEGER PRIMARY KEY`. */
          if (/\bINTEGER\s+PRIMARY\s+KEY\b/i.test(column)) rowidAlias = true;
            primaryKey = [columnName];
          }
          if (/\bUNIQUE\b/i.test(column)) unique.push([columnName]);
        }
        tables[name] = {
          rowid: !withoutRowid,
          primaryKey: rowidAlias ? [] : primaryKey,
          unique,
          indexes: [],
          file
        };
        continue;
      }
      const index = /^CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\S+)\s+ON\s+(\S+)\s*\(([\s\S]*?)\)\s*(WHERE\s+[\s\S]*)?$/i.exec(statement);
      if (index && tables[parseName(index[3])]) {
        const entry = tables[parseName(index[3])];
        const columns = index[4].split(",").map(item => parseName(item).split(/\s+/)[0]);
        if (index[1]) {
          entry.unique.push(columns);
          indexOwner.set(parseName(index[2]), { table: parseName(index[3]), kind: "unique", columns });
        } else {
          entry.indexes.push(columns);
          indexOwner.set(parseName(index[2]), { table: parseName(index[3]), kind: "index", columns });
        }
        continue;
      }
      /* DROP INDEX is the other half of the story: a dropped index is one fewer
         row written per INSERT, and the model has to say so. */
      const dropped = /^DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?(\S+)/i.exec(statement);
      if (dropped) {
        const owner = indexOwner.get(parseName(dropped[1]));
        droppedIndexes.add(parseName(dropped[1]));
        if (owner) {
          const entry = tables[owner.table];
          const droppedColumns = owner.columns.slice().sort().join(",");
          const keep = list => list.filter(columns => columns.slice().sort().join(",") !== droppedColumns);
          /* Retire that one index, not the table's whole index list. */
          if (owner.kind === "unique") entry.unique = keep(entry.unique);
          else entry.indexes = keep(entry.indexes);
        }
      }
    }
  }
  return tables;
}

const derived = deriveSchema();

test("every modelled table matches the migrations, index for index", () => {
  const problems = [];
  for (const [name, model] of Object.entries(D1_WRITE_COST)) {
    const actual = derived[name];
    if (!actual) { problems.push(`${name}: modelled but no CREATE TABLE in migrations/`); continue; }
    if (actual.rowid !== model.rowid) problems.push(`${name}: rowid ${model.rowid} vs migration ${actual.rowid}`);
    const same = (left, right) => String(left).toLowerCase() === String(right).toLowerCase();
    const compare = (label, expected, found) => {
      const left = (expected || []).map(columns => columns.map(same_ => same_.toLowerCase()).sort().join(","));
      const right = (found || []).map(columns => columns.map(same_ => same_.toLowerCase()).sort().join(","));
      if (left.slice().sort().join(" | ") !== right.slice().sort().join(" | ")) {
        problems.push(`${name}: ${label} ${JSON.stringify(left)} vs migrations ${JSON.stringify(right)}`);
      }
    };
    const lower = columns => columns.map(column => String(column).toLowerCase()).sort().join(",");
    const primary = model.primaryKey.length ? [lower(model.primaryKey)] : [];
    const actualPrimary = actual.primaryKey.length ? [lower(actual.primaryKey)] : [];
    if (primary.join(" | ") !== actualPrimary.join(" | ")) {
      problems.push(`${name}: primaryKey ${JSON.stringify(primary)} vs migrations ${JSON.stringify(actualPrimary)}`);
    }
    compare("unique", model.unique, actual.unique);
    compare("indexes", model.indexes, actual.indexes);
  }
  assert.deepEqual(problems, [], `D1_WRITE_COST drifted from migrations/community/:\n${problems.join("\n")}`);
});

test("migration 0020 really does retire the index the model no longer counts", () => {
  const migration = readFileSync(new URL("0020_d1_rows_written.sql", MIGRATION_DIR), "utf8");
  assert.match(migration, /DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?idx_orb2_field_observations_observed/i);
  /* The model is the *post*-migration schema, so the dropped index must not be
     counted anywhere in it. */
  assert.equal(droppedIndexes.has("idx_orb2_field_observations_observed"), true);
  const observations = D1_WRITE_COST.orb2_field_observations;
  assert.deepEqual(observations.indexes, [["interval", "updated_at"]],
    "the observations table keeps the change-scan index and nothing else");
});

test("every table the Orb 2 write path writes is modelled", () => {
  /* The tick hands adapters a wrapped handle, so the ledger, cache, and contract
     writes ride the same budget as the beat writes. A write to a table this
     model has never heard of is charged one row and reported as `unmodelled` —
     which is a silent under-count for anything with an index. */
  const sources = [
    "orb2-field.mjs", "orb2-field-publish.mjs", "massive-daily-call-ledger.mjs",
    "tickerbot-call-ledger.mjs", "kraken-call-ledger.mjs", "alpha-vantage-call-ledger.mjs",
    "twelvedata-daily-credit-ledger.mjs", "ai-neuron-ledger.mjs",
    "characters-crypto-ranking.mjs", "characters-kraken.mjs",
    "characters-futures-contracts.mjs", "d1-backup.mjs"
  ];
  const unmodelled = new Set();
  for (const file of sources) {
    const source = readFileSync(new URL(`../worker/${file}`, import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ");
    const pattern = /\b(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|REPLACE\s+INTO|UPDATE|DELETE\s+FROM)\s+([A-Za-z_][\w]*)/gi;
    let match = null;
    while ((match = pattern.exec(source)) !== null) {
      /* Only real tables: `${next}` and other interpolation is not one. */
      if (derived[match[1]] && !D1_WRITE_COST[match[1]]) unmodelled.add(`${file}:${match[1]}`);
    }
  }
  assert.deepEqual([...unmodelled].sort(), [],
    "add these tables to D1_WRITE_COST so the rows-written budget can see them");
});

/* ── statement parsing ───────────────────────────────────────────────────*/

test("parseWriteStatement names the table and the columns a write touches", () => {
  assert.deepEqual(parseWriteStatement("SELECT 1"), null);
  assert.deepEqual(parseWriteStatement("WITH x AS (SELECT 1) SELECT * FROM x"), null);
  assert.deepEqual(parseWriteStatement(`INSERT INTO orb2_field_runs (utc_day, updated_at) VALUES (?, ?)
    ON CONFLICT(utc_day) DO NOTHING`),
    { operation: "insert", table: "orb2_field_runs", columns: ["utc_day", "updated_at"], upsertColumns: null });
  assert.deepEqual(parseWriteStatement("UPDATE orb2_field_runs SET lock_owner = ?, lock_at = ?, updated_at = ? WHERE utc_day = ?"),
    { operation: "update", table: "orb2_field_runs", columns: ["lock_owner", "lock_at", "updated_at"] });
  assert.deepEqual(parseWriteStatement("DELETE FROM orb2_field_queue WHERE id = ?"),
    { operation: "delete", table: "orb2_field_queue", columns: null });
  /* The upsert's DO UPDATE SET list is what decides which indexes an existing
     row's rewrite touches, so it is parsed separately from the insert list. */
  const upsert = parseWriteStatement(`INSERT INTO orb2_field_observations
      (interval, symbol, payload, observed_at, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(interval, symbol) DO UPDATE SET payload = excluded.payload,
      observed_at = excluded.observed_at, updated_at = excluded.updated_at
    WHERE excluded.observed_at >= orb2_field_observations.observed_at`);
  assert.equal(upsert.operation, "insert");
  assert.equal(upsert.table, "orb2_field_observations");
  assert.deepEqual(upsert.upsertColumns, ["payload", "observed_at", "updated_at"]);
});

/* ── the arithmetic ──────────────────────────────────────────────────────*/

test("an index is charged only when a statement writes a column it contains", () => {
  /* The runs row is rewritten three times a tick and never writes utc_day, so
     its primary-key index is not touched: one row, not two. */
  assert.equal(estimateRowsWritten("orb2_field_runs", { operation: "update", columns: ["last_tick_at", "updated_at"] }).rows, 1);
  assert.equal(estimateRowsWritten("orb2_field_runs", { operation: "insert" }).rows, 2);
  /* The hot table. A new berth pays for three b-trees: the table, the primary
     key's own index, and the change-scan index on (interval, updated_at). */
  assert.equal(estimateRowsWritten("orb2_field_observations", { operation: "insert" }).rows, 3);
  /* An upsert against a row that already exists leaves the primary key alone,
     so it is the table plus whichever secondary indexes the SET list touches.
     `updated_at` is in the change-scan index, and every write bumps it. */
  assert.equal(estimateRowsWritten("orb2_field_observations",
    { operation: "update", columns: ["payload", "observed_at", "updated_at"] }).rows, 2);
  /* A composition rewrite that moves payload and updated_at costs the same.
     Before migration 0020 it cost three: the retired (interval, observed_at)
     index was in the statement's way too. */
  assert.equal(estimateRowsWritten("orb2_field_observations",
    { operation: "update", columns: ["payload", "updated_at"] }).rows, 2);
  /* A write that touches no indexed column is exactly one row. */
  assert.equal(estimateRowsWritten("orb2_field_observations", { operation: "update", columns: ["payload"] }).rows, 1);
  /* An unknown column set is an upper bound, never a discount. */
  assert.equal(estimateRowsWritten("orb2_field_observations", { operation: "update" }).rows, 3);
  /* Deletes pay for every b-tree, like inserts. */
  assert.equal(estimateRowsWritten("orb2_field_queue", { operation: "delete" }).rows, 3);
  /* An unmodelled table is charged one row and reported, so it cannot hide. */
  const unknown = estimateRowsWritten("some_table_nobody_modelled", { operation: "insert" });
  assert.equal(unknown.known, false);
  assert.equal(unknown.rows, 1);
});

test("an upsert is charged the worse of its two paths", () => {
  const query = `INSERT INTO orb2_field_observations
      (interval, symbol, payload, observed_at, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(interval, symbol) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`;
  const estimate = rowsWrittenForStatement(query);
  assert.equal(estimate.operation, "upsert");
  /* New berth: table + primary key + change-scan index = three. Existing berth:
     table + change-scan index = two. The estimate has to hold whichever way it
     lands, so it is the worse of the two. */
  assert.equal(estimate.rows, 3);
});

test("reads cost nothing, and the allowance arithmetic is coherent", () => {
  assert.equal(rowsWrittenForStatement("SELECT payload FROM orb2_field_observations WHERE interval = ?").rows, 0);
  assert.equal(D1_FREE_ROWS_WRITTEN_PER_DAY, 100_000);
  assert.equal(ORB2_FIELD_TICKS_PER_DAY, 1440);
  assert.ok(ORB2_FIELD_D1_ROWS_WRITTEN_DAILY_SHARE < D1_FREE_ROWS_WRITTEN_PER_DAY,
    "the tick's share leaves room for the publication slice, the backup, and manual writes");
  assert.ok(ORB2_FIELD_SCHEDULER_RESERVED_D1_ROWS_WRITTEN < ORB2_FIELD_SCHEDULER_MAX_D1_ROWS_WRITTEN);
});

/* ── observation beats estimation ────────────────────────────────────────*/

test("D1's own meta.rows_written replaces the estimate", async () => {
  assert.equal(observedRowsWritten({ meta: { rows_written: 7 } }), 7);
  assert.equal(observedRowsWritten({ meta: { changes: 1 } }), null,
    "`changes` counts table rows, not index rows; it is not the billed number");
  assert.equal(observedRowsWritten(undefined), null);

  const ledger = createRowsWrittenLedger();
  const { db } = countRowsWritten(fakeD1(9), ledger);
  /* The model says three (table + primary key + change-scan index); D1 charged
     nine, and nine is what the account is billed. */
  await db.prepare("INSERT INTO orb2_field_observations (interval, symbol, payload, observed_at, updated_at) VALUES (?,?,?,?,?)")
    .bind("1d", "NVDA", "{}", 1, 1).run();
  assert.equal(ledger.rows, 9);
  assert.equal(ledger.observed, 1);
  assert.equal(ledger.modeled, 0);
  assert.equal(ledger.byTable.orb2_field_observations, 9);
});

test("the ledger falls back to the model when the driver reports nothing", async () => {
  const ledger = createRowsWrittenLedger();
  const { db } = countRowsWritten(fakeD1(null), ledger);
  await db.prepare("UPDATE orb2_field_runs SET last_tick_at = ?, updated_at = ? WHERE utc_day = ?").bind(1, 1, "2026-10-05").run();
  assert.equal(ledger.rows, 1, "an UPDATE that leaves the primary key alone writes the table's row only");
  assert.equal(ledger.modeled, 1);
  assert.equal(ledger.observed, 0);
  assert.equal(formatRowsWrittenBreakdown(ledger), "orb2_field_runs=1");
});

test("a batched write is charged against its own result", async () => {
  const ledger = createRowsWrittenLedger();
  const driver = {
    prepare(query) {
      const statement = {
        bind(...values) { return statement; },
        async run() { return { success: true, meta: { rows_written: 2 } }; }
      };
      return statement;
    },
    async batch(statements) {
      assert.equal(statements.length, 2);
      return statements.map(() => ({ success: true, meta: { rows_written: 2 } }));
    }
  };
  const { db } = countRowsWritten(driver, ledger);
  await db.batch([
    db.prepare("UPDATE orb2_field_observations SET payload = ?, updated_at = ? WHERE interval = ? AND symbol = ?"),
    db.prepare("UPDATE orb2_field_observations SET payload = ?, updated_at = ? WHERE interval = ? AND symbol = ?")
  ]);
  assert.equal(ledger.rows, 4, "one row per statement, from each statement's own meta");
  assert.equal(ledger.observed, 2);
});

test("the model agrees with what SQLite maintains, table by table", () => {
  /* Not a proof of D1's billing — only D1 reports that — but it is a check that
     the model describes the schema that actually exists: if a table in the model
     has an index the database does not, the estimate is wrong in production. */
  const sql = new DatabaseSync(":memory:");
  for (const file of MIGRATIONS) sql.exec(readFileSync(new URL(file, MIGRATION_DIR), "utf8"));
  const indexes = sql.prepare("SELECT name, tbl_name FROM sqlite_schema WHERE type = 'index'").all();
  for (const [name, model] of Object.entries(D1_WRITE_COST)) {
    const own = indexes.filter(index => index.tbl_name === name).map(index => index.name);
    const automatic = own.filter(index => index.startsWith("sqlite_autoindex")).length;
    const named = own.length - automatic;
    /* SQLite implements a PRIMARY KEY and every UNIQUE constraint as an
       automatic index; everything else is an index the migrations named. */
    const expectedAutomatic = (model.rowid && model.primaryKey.length ? 1 : 0) + model.unique.length;
    assert.equal(automatic, expectedAutomatic, `${name}: automatic indexes (primary key + UNIQUE)`);
    assert.equal(named, model.indexes.length, `${name}: named secondary indexes`);
  }
  sql.close();
});

/* ── helpers ─────────────────────────────────────────────────────────────*/

/** A D1-shaped driver whose `run()` reports `rowsWritten` (or nothing at all). */
function fakeD1(rowsWritten) {
  return {
    prepare() {
      const statement = {
        bind(...values) { return statement; },
        async run() {
          return rowsWritten === null
            ? { success: true }
            : { success: true, meta: { rows_written: rowsWritten } };
        }
      };
      return statement;
    }
  };
}
