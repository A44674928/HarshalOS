import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const migration = readFileSync(new URL("../../migrations/community/0005_tickerbot_call_ledger.sql", import.meta.url), "utf8");

/* Small node:sqlite-backed stand-in for the D1 prepare/bind/first surface used by the
   Tickerbot allowance. Each test gets a new in-memory database, never a real Cloudflare DB. */
export function createTickerbotLedgerDb() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(migration);
  const db = {
    prepare(text) {
      let parameters = [];
      const statement = {
        bind(...args) { parameters = args; return statement; },
        async first() { return sql.prepare(text).get(...parameters) ?? null; }
      };
      return statement;
    }
  };
  return { db, sql };
}
