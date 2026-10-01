import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generateKeyPair, SignJWT } from 'jose';
import { handleApi, authenticate } from '../worker/index.mjs';
import { CREATOR_ID_FORMULA, MAX_BYTES, validateLedger, validateSnapshot, assertPrefix } from '../worker/storage.mjs';

const owner = 'owner@example.com';
function fixture() {
  const collections = new Map(); let closed = 0;
  const collection = name => {
    if (!collections.has(name)) collections.set(name, new Map());
    const docs = collections.get(name);
    return {
      async findOne({ _id }) { return structuredClone(docs.get(_id) || null); },
      async insertOne(doc) { if (docs.has(doc._id)) throw Object.assign(new Error('duplicate'), { code: 11000 }); docs.set(doc._id, structuredClone(doc)); },
      async updateOne(filter, update) {
        const doc = docs.get(filter._id);
        if (!doc || doc.revision !== filter.revision) return { matchedCount: 0 };
        docs.set(filter._id, { ...doc, ...structuredClone(update.$set) }); return { matchedCount: 1 };
      },
      find({ owner: email }) { return { sort() { return this; }, limit() { return this; }, async toArray() { return [...docs.values()].filter(d => d.owner === email).map(({ session, receivedAt }) => ({ session, receivedAt })); } }; }
    };
  };
  return {
    dependencies: { authenticate: async () => owner, database: async () => ({ db: { collection, command: async () => ({ ok: 1 }) }, close: async () => { closed++; } }) },
    get closed() { return closed; }
  };
}
function req(path, method = 'GET', data, headers = {}) {
  return new Request('https://os.example.com/api/storage/' + path, { method, headers: { Origin: 'https://os.example.com', 'Content-Type': 'application/json', ...headers }, body: data === undefined ? undefined : typeof data === 'string' ? data : JSON.stringify(data) });
}
const call = (f, path, method, data, headers) => handleApi(req(path, method, data, headers), {}, f.dependencies);
function row(id, prevHash, event = 'Event') {
  const r = { id, ts: '2026-09-30T12:00:00.000Z', severity: 'permit', event, declaredPhase: 'NAB', prevHash };
  r.hash = createHash('sha256').update([id, r.ts, r.severity, event, prevHash, CREATOR_ID_FORMULA].join('|')).digest('hex');
  return r;
}
function legacyRow(id, prevHash, event = 'Legacy event') {
  const r = { id, ts: '2026-09-29T12:00:00.000Z', severity: 'info', event, declaredPhase: 'NAB', prevHash };
  r.hash = createHash('sha256').update([id, r.ts, r.severity, event, prevHash, 'HARSHAL'].join('|')).digest('hex');
  return r;
}

test('Access fails closed before database access', async () => {
  assert.equal((await handleApi(req('status'), {})).status, 503);
  const env = { ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com', ACCESS_AUD: 'aud', OWNER_EMAIL: owner };
  assert.equal((await handleApi(req('status'), env)).status, 401);
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const token = async (aud = 'aud', email = owner, expiry = '1h', issuer = 'https://example.cloudflareaccess.com') => new SignJWT({ email }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setSubject('owner-sub').setIssuer(issuer).setAudience(aud).setExpirationTime(expiry).sign(privateKey);
  const verify = async t => authenticate(req('status', 'GET', undefined, { 'Cf-Access-Jwt-Assertion': t }), env, publicKey);
  assert.equal(await verify(await token('aud', owner.toUpperCase())), owner);
  for (const t of [await token('wrong'), await token('aud', 'other@example.com'), await token('aud', owner, '0s'), await token('aud', owner, '1h', 'https://evil.example'), 'invalid']) {
    await assert.rejects(verify(t), error => error.status === 403);
  }
});

test('RACE-006: atomic snapshots serialize concurrent creates and updates', async () => {
  const f = fixture();
  assert.equal((await (await call(f, 'snapshot')).json()).revision, null);
  const initial = { revision: null, audits: [{ id: 'a', name: 'Test', phase: 'INCOHERENT' }], evidence: [] };
  const creates = await Promise.all([call(f, 'snapshot', 'PUT', initial), call(f, 'snapshot', 'PUT', initial)]);
  assert.deepEqual(creates.map(r => r.status).sort(), [200, 409]);
  const saved = await (await call(f, 'snapshot')).json();
  const updates = await Promise.all([call(f, 'snapshot', 'PUT', saved), call(f, 'snapshot', 'PUT', saved)]);
  assert.deepEqual(updates.map(r => r.status).sort(), [200, 409]);
  assert.equal((await call(f, 'snapshot', 'PUT', initial)).status, 409);
  assert.equal(f.closed, 7);
});

test('write boundaries and redacted backend errors', async () => {
  const f = fixture(); const data = { revision: null, audits: [], evidence: [] };
  assert.equal((await call(f, 'snapshot', 'PUT', data, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await call(f, 'snapshot', 'PUT', data, { Origin: '' })).status, 403);
  assert.equal((await call(f, 'snapshot', 'POST', data)).status, 405);
  assert.equal((await call(f, 'snapshot', 'PUT', data, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await call(f, 'snapshot', 'PUT', '{bad')).status, 400);
  assert.equal((await call(f, 'snapshot', 'PUT', 'x'.repeat(MAX_BYTES + 1))).status, 413);
  assert.equal((await call(f, 'snapshot', 'PUT', { audits: [], evidence: [] })).status, 400);
  assert.equal((await call(f, 'unknown')).status, 404);
  f.dependencies.database = async () => { throw new Error('mongodb://password-secret'); };
  const response = await call(f, 'status');
  assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('password-secret'));
});

test('REPLAY-005: ledger archive is idempotent, prefix-protected, and downloadable', async () => {
  const f = fixture(); const session = '12345678-1234-1234-1234-123456789abc'; const path = 'ledger/' + session;
  const first = row(1, '0'.repeat(64)); const second = row(2, first.hash);
  assert.equal((await call(f, path, 'PUT', { rows: [first] })).status, 200);
  assert.equal((await call(f, path, 'PUT', { rows: [first] })).status, 200);
  assert.equal((await call(f, path, 'PUT', { rows: [first, second] })).status, 200);
  assert.equal((await call(f, path, 'PUT', { rows: [first] })).status, 409);
  assert.equal((await call(f, path, 'PUT', { rows: [{ ...first, declaredPhase: 'GSRB' }, second] })).status, 409);
  assert.equal((await call(f, path, 'PUT', { rows: [{ ...first, event: 'tampered' }] })).status, 400);
  assert.deepEqual((await (await call(f, path)).json()).rows, [first, second]);
  assert.equal((await (await call(f, 'ledgers')).json()).sessions[0].session, session);
  await assert.rejects(validateLedger([second]));
  assert.throws(() => assertPrefix([first], []));
});

test('ledger archives accept legacy Creator-ID rows and append the section-formula chain', async () => {
  assert.equal(CREATOR_ID_FORMULA, '§HARSHAL§ + HARSHAL + (HARSHAL)');
  const oldRow = legacyRow(1, '0'.repeat(64));
  const newRow = row(2, oldRow.hash, 'New Creator-ID formula row');
  const checked = await validateLedger([oldRow, newRow]);
  assert.deepEqual(checked.map(item => item.hash), [oldRow.hash, newRow.hash]);
  const incorrectlyRehashed = { ...oldRow, hash: createHash('sha256').update([oldRow.id, oldRow.ts, oldRow.severity, oldRow.event, oldRow.prevHash, 'OTHER'].join('|')).digest('hex') };
  await assert.rejects(validateLedger([incorrectlyRehashed]), /Ledger hash mismatch/);
});

test('snapshot validates record shape and duplicates; no arbitrary top-level keys retained', () => {
  assert.deepEqual(validateSnapshot({ audits: [], evidence: [], apiKey: 'do-not-store' }), { audits: [], evidence: [] });
  assert.throws(() => validateSnapshot({ audits: [{ id: 'a', name: 'a', phase: 'bogus' }], evidence: [] }));
  assert.throws(() => validateSnapshot({ audits: [], evidence: [{ id: 'e' }, { id: 'e' }] }));
});
