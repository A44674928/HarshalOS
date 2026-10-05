/* Anonymous, short-lived, per-browser saved Orb 2 observation snapshots. */
const ROUTE = "/api/orb2/v1/beats";
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PAYLOAD_BYTES = 40_960;
const MAX_ROWS_PER_SESSION = 120;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDERS = new Set(["massive", "tickerbot", "kraken", "rehearsal"]);
const DISCS = new Set(["stocks", "fx", "crypto", "commodities", "indices"]);
const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
});

function fail(status, message) { return json({ success: false, message }, status); }
function validUuid(value) { return typeof value === "string" && UUID.test(value); }

async function readJson(request) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) throw new Error("content-type");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body");
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_PAYLOAD_BYTES + 2048) { await reader.cancel(); throw new Error("size"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error("json"); }
}

function validateRecord(record, now = Date.now()) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("record");
  const { sessionId, beatId, beatAt, provider, discId, payload } = record;
  if (!validUuid(sessionId) || !validUuid(beatId)) throw new Error("id");
  if (!Number.isSafeInteger(beatAt) || beatAt < 0 || beatAt > now + 5 * 60_000) throw new Error("time");
  if (!PROVIDERS.has(provider) || !DISCS.has(discId)) throw new Error("scope");
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.schema !== "orb2-beat-v1" ||
      !Array.isArray(payload.observations) || !payload.entry || typeof payload.entry !== "object" || Array.isArray(payload.entry)) throw new Error("payload");
  const entryDisc = String(payload.entry.disc || "").trim().toLowerCase();
  const entryProvider = String(payload.entry.provider || "").trim().toLowerCase();
  const interval = String(payload.entry.interval || "").trim();
  if (entryDisc !== discId || !interval || interval === "1mo") throw new Error("scope");
  const activePath = provider === "tickerbot" && discId === "stocks" && ["1h", "1d"].includes(interval) && entryProvider === "tickerbot"
    || provider === "kraken" && discId === "crypto" && interval === "1d" && entryProvider === "kraken"
    || provider === "massive" && ["fx", "commodities", "indices"].includes(discId) && interval === "1d" && entryProvider === "massive"
    || provider === "rehearsal" && ["stocks", "fx", "crypto", "commodities", "indices"].includes(discId) &&
      ["1h", "1d"].includes(interval) && entryProvider === "synthetic" && payload.entry.source === "rehearsal";
  if (!activePath) throw new Error("scope");
  const serialized = JSON.stringify(payload);
  if (new TextEncoder().encode(serialized).byteLength > MAX_PAYLOAD_BYTES) throw new Error("size");
  if (payload.observations.length > 200) throw new Error("count");
  return { sessionId, beatId, beatAt, provider, discId, serialized };
}

export async function handleOrb2SavedBeats(request, env = {}, dependencies = {}) {
  const now = dependencies.now?.() ?? Date.now();
  try {
    const url = new URL(request.url);
    if (url.pathname !== ROUTE) return fail(404, "Unknown Orb 2 saved-beats route.");
    if (!env.COMMUNITY_DB) return fail(503, "Orb 2 saved beats are unavailable: COMMUNITY_DB is not bound.");
    if (!new Set(["GET", "POST"]).has(request.method)) return fail(405, "Method not allowed.");
    if (request.headers.get("Origin") && request.headers.get("Origin") !== url.origin) return fail(403, "Same-origin request required.");
    const db = env.COMMUNITY_DB;

    if (request.method === "GET") {
      const sessionId = url.searchParams.get("sessionId");
      if (!validUuid(sessionId)) return fail(400, "A valid browser session id is required.");
      await db.prepare("DELETE FROM orb2_saved_beats WHERE session_id = ? AND expires_at <= ?").bind(sessionId, now).run();
      const result = await db.prepare(`SELECT beat_id, beat_at, provider, disc_id, payload, created_at, expires_at
        FROM orb2_saved_beats WHERE session_id = ? AND expires_at > ?
        ORDER BY beat_at DESC LIMIT ?`).bind(sessionId, now, MAX_ROWS_PER_SESSION).all();
      const beats = (result.results || []).map(row => ({
        beatId: row.beat_id, beatAt: row.beat_at, provider: row.provider, discId: row.disc_id,
        payload: JSON.parse(row.payload), createdAt: row.created_at, expiresAt: row.expires_at
      }));
      return json({ success: true, beats });
    }

    let record;
    try { record = validateRecord(await readJson(request), now); }
    catch (error) {
      const code = error.message === "size" ? 413 : 400;
      return fail(code, code === 413 ? "Saved beat exceeds the compact snapshot size limit." : "Saved beat payload is invalid.");
    }
    const createdAt = now;
    const expiresAt = now + RETENTION_MS;
    const statements = [
      db.prepare("DELETE FROM orb2_saved_beats WHERE expires_at <= ?").bind(now),
      db.prepare(`INSERT INTO orb2_saved_beats
        (session_id, beat_id, beat_at, provider, disc_id, payload, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(session_id, beat_id) DO NOTHING`)
        .bind(record.sessionId, record.beatId, record.beatAt, record.provider, record.discId, record.serialized, createdAt, expiresAt),
      db.prepare(`DELETE FROM orb2_saved_beats WHERE session_id = ? AND beat_id NOT IN
        (SELECT beat_id FROM orb2_saved_beats WHERE session_id = ? ORDER BY beat_at DESC, created_at DESC LIMIT ?)`)
        .bind(record.sessionId, record.sessionId, MAX_ROWS_PER_SESSION)
    ];
    await db.batch(statements);
    return json({ success: true, beatId: record.beatId, expiresAt });
  } catch {
    return fail(503, "Orb 2 saved beats are unavailable. The current session can continue locally; retry storage later.");
  }
}

export const ORB2_SAVED_BEATS = Object.freeze({ ROUTE, RETENTION_MS, MAX_PAYLOAD_BYTES, MAX_ROWS_PER_SESSION });
