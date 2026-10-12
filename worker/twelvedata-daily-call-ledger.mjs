// Bounded Worker wrapper over kv.massiveDailyCallLedger for Twelve Data daily beats.
// Free tier: 800/day global (shared across all symbols).
function tailIsoDay({ now = Date.now } = {}) {
  const ts = typeof now === "function" ? now() : Date.now();
  const d = new Date(ts - 30 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

const LEDGER_ROWS_KEY = "v0:twelvedata:daily-ledger:rows";
const LEDGER_BYTES_SOFT_CAP = 2 * 1024 * 1024;
const LEDGER_PRUNE_BYTES_TARGET = 1 * 1024 * 1024;
const ALLOWED_TARGETS = new Set(["twelvedata"]);

function safeRecordsFromParsed(json) {
  return Array.isArray(json?.records) ? json.records : [];
}

function daylightRecord(record, options = {}) {
  const { tailIsoDay: tailDay = tailIsoDay } = options;
  return record && typeof record === "object" && !Array.isArray(record) &&
    typeof record.day === "string" && /^2\d{3}-[01]\d-[0-3]\d$/.test(record.day) &&
    typeof record.target === "string" && ALLOWED_TARGETS.has(record.target) &&
    typeof record.count === "number" && Number.isFinite(record.count) && record.count >= 0 &&
    record.day >= tailDay();
}

function normalizeRecord(raw, options = {}) {
  const { normalizeTimestamp = Date.now } = options;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const ts = typeof raw.timestamp === "number" && Number.isFinite(raw.timestamp) ? raw.timestamp : normalizeTimestamp();
  const r = { day: raw.day, target: raw.target, count: raw.count, timestamp: ts };
  if (raw.callsRemaining !== undefined) r.callsRemaining = raw.callsRemaining;
  return daylightRecord(r, options) ? r : null;
}

export function sortLedgerRecords(a, b) {
  const dayCmp = String(a?.day || "").localeCompare(String(b?.day || ""));
  if (dayCmp !== 0) return dayCmp;
  const targetCmp = String(a?.target || "").localeCompare(String(b?.target || ""));
  if (targetCmp !== 0) return targetCmp;
  return (a?.timestamp || 0) - (b?.timestamp || 0);
}

function clampLedger(rows) {
  return rows.filter((e) => daylightRecord(e)).sort(sortLedgerRecords).slice(-20);
}

function byteLength(utf8) {
  if (typeof TextEncoder !== "undefined") {
    try { return new TextEncoder().encode(utf8).length; } catch { return utf8.length; }
  }
  return utf8.length;
}

export async function boundedLoadTwelveDataDailyCallLedger(kv, options = {}) {
  const { now = Date.now, kvGet = null } = options;
  let json;
  if (kvGet) json = await kvGet(LEDGER_ROWS_KEY);
  else if (kv?.getJson) json = await kv.getJson(LEDGER_ROWS_KEY, null);
  else if (kv?.get) {
    const raw = await kv.get(LEDGER_ROWS_KEY);
    json = raw ? JSON.parse(raw) : null;
  } else return { checked: true, reason: "ledger-unavailable", persisted: false, records: [], tailDay: tailIsoDay({ now }), byteLength: 0 };
  const parsed = json;
  if (!parsed || typeof byteLength !== "function") {
    return { checked: true, reason: parsed ? "unreadable-ledger" : "fresh", persisted: false, records: [], tailDay: tailIsoDay({ now }), byteLength: 0 };
  }
  const records = safeRecordsFromParsed(parsed).map((r) => normalizeRecord(r, { normalizeTimestamp: now })).filter(Boolean);
  const text = JSON.stringify({ nextSequence: parsed.nextSequence, records });
  return {
    checked: true,
    reason: parsed ? "loaded" : "fresh",
    persisted: !!parsed,
    records,
    tailDay: tailIsoDay({ now }),
    byteLength: byteLength(text)
  };
}

export async function loadTwelveDataDailyCallLedger(kv, options = {}) {
  const report = await boundedLoadTwelveDataDailyCallLedger(kv, options);
  if (report.reason === "unreadable-ledger" || report.byteLength > LEDGER_BYTES_SOFT_CAP * 2) return { records: [], nextSequence: 0 };
  if (report.byteLength > LEDGER_BYTES_SOFT_CAP) {
    return { records: report.records.slice(-10), nextSequence: 0 };
  }
  return { records: clampLedger(report.records), nextSequence: 0 };
}

export async function appendTwelveDataDailyCallLedger(kv, rowsToAdd, options = {}) {
  const { now = Date.now, kvPutJson = null } = options;
  if (!kv) return { appended: false, reason: "ledger-unavailable" };
  const toAdd = Array.isArray(rowsToAdd) ? rowsToAdd.map((r) => normalizeRecord(r, { normalizeTimestamp: now })).filter(Boolean) : [];
  if (!toAdd.length) return { appended: false, reason: "no-valid-rows" };
  try {
    const existing = await boundedLoadTwelveDataDailyCallLedger(kv, options);
    let records = clampLedger([...(existing.records || []), ...toAdd]);
    if (existing.byteLength > LEDGER_BYTES_SOFT_CAP) {
      records = records.slice(-10);
    }
    const payload = { nextSequence: Date.now(), records };
    const text = JSON.stringify(payload);
    if (byteLength(text) > LEDGER_BYTES_SOFT_CAP * 2) {
      records = records.slice(-5);
      payload.records = records;
    }
    if (kvPutJson) await kvPutJson(LEDGER_ROWS_KEY, payload);
    else if (kv.putJson) await kv.putJson(LEDGER_ROWS_KEY, payload);
    else if (kv.put) await kv.put(LEDGER_ROWS_KEY, JSON.stringify(payload));
    return { appended: true, records };
  } catch { return { appended: false, reason: "kv-failed" }; }
}

export const twelveDataLedgerInternals = Object.freeze({ daylightRecord, normalizeRecord, sortLedgerRecords, clampLedger });
