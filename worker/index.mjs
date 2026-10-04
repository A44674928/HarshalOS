import { handleCommunity } from './community.mjs';
import { MongoClient } from 'mongodb';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiError, MAX_BYTES, validateSnapshot, validateLedger, assertPrefix } from './storage.mjs';
import { handleGoodIntelligenceDemo } from './good-intelligence-demo.mjs';
import { handleGoodIntelligenceTickerbot } from './good-intelligence-tickerbot.mjs';
import { handleGoodIntelligenceOrb2Beats } from './good-intelligence-orb2-beats.mjs';
import { handleCharactersBeat } from './characters-beat.mjs';
import { handleCharactersDiscCatalog } from './characters-crypto-ranking.mjs';
import { handleLlmRelay } from './llm-relay.mjs';
import { handleMaterialsProject } from './materials-project.mjs';
import { handleMassive } from './massive.mjs';

const keySets = new Map();
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

export async function authenticate(request, env, testKeys) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.OWNER_EMAIL) throw new ApiError(503, 'Private storage authentication is not configured.');
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN)) throw new ApiError(503, 'Invalid Access team configuration.');
  const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
  let keys = keySets.get(issuer);
  if (!keys) { keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)); keySets.set(issuer, keys); }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new ApiError(401, 'Sign in through Cloudflare Access to use private storage.');
  try {
    const { payload } = await jwtVerify(token, testKeys || keys, { issuer, audience: env.ACCESS_AUD, algorithms: ['RS256'], requiredClaims: ['exp', 'sub', 'email'] });
    if (typeof payload.email !== 'string' || payload.email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) throw new Error('Not owner');
    return payload.email.toLowerCase();
  } catch { throw new ApiError(403, 'Access identity is invalid or is not the storage owner.'); }
}

async function database(env) {
  if (!env.MONGODB_URI) throw new ApiError(503, 'MongoDB storage is not configured.');
  const client = new MongoClient(env.MONGODB_URI, { maxPoolSize: 1, minPoolSize: 0, serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 10000, writeConcern: { w: 'majority' } });
  try {
    await client.connect();
    return { db: client.db(env.MONGODB_DATABASE || 'harshalos'), close: () => client.close() };
  } catch (error) { await client.close().catch(() => {}); throw error; }
}

async function body(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new ApiError(415, 'Send application/json.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Missing request body.');
  let size = 0; const parts = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new ApiError(413, 'Upload exceeds 4 MiB. Export locally or split the data.'); }
    parts.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new ApiError(400, 'Invalid JSON.'); }
}

export async function handleApi(request, env, dependencies = {}) {
  let connection;
  try {
    const url = new URL(request.url);
    if (!['GET', 'PUT'].includes(request.method)) throw new ApiError(405, 'Method not allowed.');
    if (request.method === 'PUT' && request.headers.get('Origin') !== url.origin) throw new ApiError(403, 'Same-origin request required.');
    const owner = await (dependencies.authenticate || authenticate)(request, env);
    connection = await (dependencies.database || database)(env);
    const db = connection.db;
    if (url.pathname === '/api/storage/status' && request.method === 'GET') {
      await db.command({ ping: 1 });
      return json({ connected: true, owner });
    }
    if (url.pathname === '/api/storage/snapshot') {
      const coll = db.collection('snapshots');
      if (request.method === 'GET') {
        const doc = await coll.findOne({ _id: owner });
        return json(doc ? { revision: doc.revision, updatedAt: doc.updatedAt, audits: doc.audits, evidence: doc.evidence } : { revision: null, audits: [], evidence: [] });
      }
      const data = await body(request);
      const snapshot = validateSnapshot(data);
      if (data.revision !== null && typeof data.revision !== 'string') throw new ApiError(400, 'A revision is required.');
      const revision = crypto.randomUUID();
      const updatedAt = new Date().toISOString();
      if (data.revision === null) {
        try { await coll.insertOne({ _id: owner, revision, updatedAt, ...snapshot }); }
        catch (e) { if (e.code === 11000) throw new ApiError(409, 'Cloud data already exists. Download and review it before saving.'); throw e; }
      } else {
        const result = await coll.updateOne({ _id: owner, revision: data.revision }, { $set: { revision, updatedAt, ...snapshot } });
        if (!result.matchedCount) throw new ApiError(409, 'Cloud data changed. Download and review it before saving.');
      }
      return json({ revision, updatedAt });
    }
    if (url.pathname === '/api/storage/ledgers' && request.method === 'GET') {
      const sessions = await db.collection('ledger_sessions').find({ owner }, { projection: { _id: 0, session: 1, receivedAt: 1 } }).sort({ receivedAt: -1 }).limit(100).toArray();
      return json({ sessions });
    }
    const match = /^\/api\/storage\/ledger\/([0-9a-f-]{36})$/.exec(url.pathname);
    if (match) {
      const coll = db.collection('ledger_sessions');
      const id = `${owner}:${match[1]}`;
      const old = await coll.findOne({ _id: id });
      if (request.method === 'GET') {
        if (!old) throw new ApiError(404, 'No archived ledger for this session.');
        return json({ session: match[1], rows: old.rows, receivedAt: old.receivedAt });
      }
      const rows = await validateLedger((await body(request)).rows);
      if (old) {
        assertPrefix(old.rows, rows);
        if (old.rows.length === rows.length) return json({ saved: rows.length, receivedAt: old.receivedAt });
      }
      const revision = crypto.randomUUID(); const receivedAt = new Date().toISOString();
      if (!old) {
        try { await coll.insertOne({ _id: id, owner, session: match[1], revision, rows, receivedAt }); }
        catch (e) { if (e.code === 11000) throw new ApiError(409, 'Ledger changed; retry the archive.'); throw e; }
      } else {
        const result = await coll.updateOne({ _id: id, revision: old.revision }, { $set: { revision, rows, receivedAt } });
        if (!result.matchedCount) throw new ApiError(409, 'Ledger changed; retry the archive.');
      }
      return json({ saved: rows.length, receivedAt });
    }
    throw new ApiError(404, 'Unknown storage endpoint.');
  } catch (error) {
    // Never return or log driver errors: they can include connection credentials.
    return json({ error: error instanceof ApiError ? error.message : 'Storage unavailable. Check backend configuration and retry; keep a local export.' }, error instanceof ApiError ? error.status : 503);
  } finally { if (connection) await connection.close().catch(() => {}); }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/account' || path === '/account.html' || path === '/audits' || path === '/audits.html') {
      const asset = await env.ASSETS.fetch(request);
      const response = new Response(asset.body, asset);
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('Referrer-Policy', 'no-referrer');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; object-src 'none'" + (env.COMMUNITY_ENABLED === 'true' ? "; frame-ancestors 'none'" : ''));
      return response;
    }
    if (path === '/api/community' || path.startsWith('/api/community/')) return handleCommunity(request, env);
    if (path === '/api/good-intelligence/v1/market/tickerbot/bars') return handleGoodIntelligenceTickerbot(request, env);
    if (path === '/api/good-intelligence/v1/orb2/beats') return handleGoodIntelligenceOrb2Beats(request, env);
    if (path === '/api/characters/v1/discs') return handleCharactersDiscCatalog(request);
    // Characters has three narrow providers: Massive automatic daily Disc beats,
    // Tickerbot on-demand stock beats, and Alpha Vantage Disc1 monthly spotlight beats.
    if (path === '/api/characters/v1/beat') return handleCharactersBeat(request, env);
    if (path === '/api/materials-project/v1/search') return handleMaterialsProject(request, env);
    // Massive REST market data (display-only): validated queries only, the
    // MASSIVE_API_KEY secret stays in the Worker, pacing is best-effort in-memory.
    if (path === '/api/massive/v1' || path.startsWith('/api/massive/v1/')) return handleMassive(request, env);
    if (path === '/api/good-intelligence/v1' || path.startsWith('/api/good-intelligence/v1/')) return handleGoodIntelligenceDemo(request);
    // The model relay is not behind Access: it serves the free tier only, requires a
    // same-origin POST, and paces each caller and the deployment as a whole
    // over sliding windows. See worker/llm-relay.mjs.
    if (path === '/api/llm' || path.startsWith('/api/llm/')) return handleLlmRelay(request, env);
    if (path.startsWith('/api/')) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  }
};
