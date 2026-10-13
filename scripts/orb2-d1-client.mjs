#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   HarshalOS — D1 over HTTP

   A `db`-shaped client for the checked-in Worker modules, so the
   off-Cloudflare beat runner (`scripts/orb2-beat-runner.mjs`) runs the
   exact scheduler and publisher code the Cron Trigger runs, against the
   same database, with the same migrations. Nothing is re-implemented here
   except the transport:

     prepare(sql).bind(...).first() / .all() / .run()   one POST per call
     db.batch([...])                                    one POST per batch

   Two deliberate properties:

     · no `raw()` — the publisher's documented fallback (the first column of
       each object row) is the path this client exercises on every run, so a
       transport that cannot return arrays can never silently return nothing;
     · retries only cover transport and 5xx failures. A SQL error is
       deterministic, and the field's writes are idempotent upserts, so a
       retried tick is the runner's next fire rather than a retry loop here.

   The client is constructed from an explicit account id, database id and API
   token. There are no defaults and no ambient configuration: a caller that
   cannot name a database cannot build a client.
   ═══════════════════════════════════════════════════════════════ */

export const D1_API_BASE = "https://api.cloudflare.com/client/v4";

const rowsOf = result => (Array.isArray(result && result.results) ? result.results : []);
const metaOf = result => (result && typeof result.meta === "object" && result.meta ? result.meta : {});
const changesOf = result => {
  const meta = metaOf(result);
  if (Number.isFinite(Number(meta.changes))) return Number(meta.changes);
  return Number.isFinite(Number(result && result.changes)) ? Number(result.changes) : 0;
};

const errorText = payload => {
  const errors = payload && Array.isArray(payload.errors) ? payload.errors : [];
  return errors.map(entry => String((entry && entry.message) || entry || "").trim())
    .filter(Boolean).slice(0, 3).join(" | ");
};

class TransportError extends Error {
  constructor(message) { super(message); this.name = "TransportError"; }
}

export function createD1HttpClient({
  accountId, databaseId, apiToken, baseUrl = D1_API_BASE, fetchImpl = globalThis.fetch, retries = 1
} = {}) {
  for (const [name, value] of [["accountId", accountId], ["databaseId", databaseId], ["apiToken", apiToken]]) {
    if (!String(value || "").trim()) throw new Error(`The D1 client needs an explicit ${name}.`);
  }
  if (typeof fetchImpl !== "function") throw new Error("The D1 client needs a fetch implementation.");
  const endpoint = `${baseUrl}/accounts/${accountId}/d1/database/${databaseId}/query`;
  const headers = { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" };

  const send = async body => {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST", headers, body: JSON.stringify(body)
        });
        const payload = await response.json().catch(() => null);
        if (!payload || payload.success !== true) {
          const message = errorText(payload) || `D1 answered HTTP ${response.status}`;
          /* A 4xx is about the request, not the network: retrying it repeats the
             same rejection, and this client has no business guessing otherwise. */
          if (response.status >= 400 && response.status < 500) throw new Error(message);
          throw new TransportError(message);
        }
        return Array.isArray(payload.result) ? payload.result : [];
      } catch (error) {
        lastError = error;
        if (!(error instanceof TransportError) || attempt === retries) throw error;
      }
    }
    throw lastError || new Error("The D1 request failed.");
  };

  const statement = (sql, params) => {
    const bound = {
      sql, params,
      bind(...values) { return statement(sql, values); },
      async all() {
        const [result] = await send({ sql, params });
        return { results: rowsOf(result), meta: metaOf(result) };
      },
      async first() {
        const { results } = await bound.all();
        return results.length ? results[0] : null;
      },
      async run() {
        const [result] = await send({ sql, params });
        return { changes: changesOf(result), meta: metaOf(result) };
      }
    };
    return bound;
  };

  return {
    prepare: sql => statement(sql, []),
    /* D1's query endpoint takes an array of statements as one batch. A runtime
       that answers it statement-by-statement (or refuses it) still gets the same
       results from the sequential path, in the same order. */
    batch: async statements => {
      const list = Array.isArray(statements) ? statements : [];
      if (!list.length) return [];
      const envelope = result => ({
        results: rowsOf(result), meta: metaOf(result), changes: changesOf(result)
      });
      try {
        const results = await send(list.map(item => ({ sql: item.sql, params: item.params })));
        if (results.length === list.length) return results.map(envelope);
      } catch { /* the sequential path below is the fallback */ }
      const output = [];
      for (const item of list) {
        const [result] = await send({ sql: item.sql, params: item.params });
        output.push(envelope(result));
      }
      return output;
    }
  };
}

/** The database this client may write to, as Cloudflare describes it. Used by the
 * runner's name guard: the secrets have to name the database, not just its id. */
export async function describeD1Database({
  accountId, databaseId, apiToken, baseUrl = D1_API_BASE, fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("The D1 lookup needs a fetch implementation.");
  const response = await fetchImpl(
    `${baseUrl}/accounts/${accountId}/d1/database/${databaseId}`,
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );
  const payload = await response.json().catch(() => null);
  if (!payload || payload.success !== true) {
    throw new Error(errorText(payload) || `D1 answered HTTP ${response.status} for the database lookup`);
  }
  return payload.result || null;
}

/**
 * The name guard: refuse to run when the named database is not the database these
 * secrets mean. Optional — an unset name means "the id the secrets gave", which is
 * still an explicit choice — and it fails closed when it is set.
 */
export async function assertD1DatabaseName({
  accountId, databaseId, apiToken, expectedName, baseUrl = D1_API_BASE, fetchImpl = globalThis.fetch
} = {}) {
  const wanted = String(expectedName || "").trim();
  if (!wanted) return null;
  const described = await describeD1Database({ accountId, databaseId, apiToken, baseUrl, fetchImpl });
  const actual = String((described && described.name) || "").trim();
  if (actual !== wanted) {
    throw new Error(`Refusing to write: ${databaseId} is named "${actual || "(unnamed)"}", not "${wanted}".`);
  }
  return described;
}
