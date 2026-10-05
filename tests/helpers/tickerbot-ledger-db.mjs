import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const migrations = ["0005_tickerbot_call_ledger.sql", "0006_alpha_vantage_daily_call_ledger.sql", "0007_massive_daily_call_ledger.sql", "0010_characters_crypto_ranking_cache.sql", "0011_massive_futures_contract_cache.sql"]
  .map(file => readFileSync(new URL(`../../migrations/community/${file}`, import.meta.url), "utf8"));

/* Small node:sqlite-backed stand-in for the D1 prepare/bind/first surface used by
   Characters' independent provider allowances. Each test gets an in-memory database. */
export function createTickerbotLedgerDb() {
  const sql = new DatabaseSync(":memory:");
  migrations.forEach(migration => sql.exec(migration));
  const db = {
    prepare(text) {
      let parameters = [];
      const statement = {
        bind(...args) { parameters = args; return statement; },
        async first() { return sql.prepare(text).get(...parameters) ?? null; },
        async run() { return sql.prepare(text).run(...parameters); },
        async all() { return { results: sql.prepare(text).all(...parameters) }; }
      };
      return statement;
    }
  };
  return { db, sql };
}
