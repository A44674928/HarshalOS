import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { digest } from '../worker/community-auth.mjs';
import worker from '../worker/index.mjs';
const origin = 'https://os.example';
const draft = { title: 'Draft', input: { entity: 'Example' }, privateNotes: 'Private note' };
async function fixture(t) {
  const sql = new DatabaseSync(':memory:'); t.after(() => sql.close()); sql.exec('PRAGMA foreign_keys=ON');
  for (const file of ['0001_private_drafts.sql', '0002_auth_sessions.sql']) sql.exec(readFileSync(new URL('../migrations/community/' + file, import.meta.url), 'utf8'));
  const db = { prepare(text) { let args = []; const q = { bind(...a) { args = a; return q; }, async first() { return sql.prepare(text).get(...args) ?? null; }, async run() { return sql.prepare(text).run(...args); }, async all() { return { results: sql.prepare(text).all(...args) }; } }; return q; } };
  const now = Math.floor(Date.now() / 1000);
  for (const id of ['alice', 'bob']) {
    sql.prepare('INSERT INTO community_users VALUES (?, ?, ?, 0, ?)').run(id, 'https://issuer.example/', id, now * 1000);
    sql.prepare('INSERT INTO community_sessions VALUES (?, ?, ?, ?, ?, ?)').run(await digest(id[0].repeat(43)), id, 'https://issuer.example/', 'client', now, now + 86400);
  }
  const env = { COMMUNITY_ENABLED: 'true', COMMUNITY_DB: db, COMMUNITY_ORIGIN: origin, OIDC_ISSUER: 'https://issuer.example/', OIDC_CLIENT_ID: 'client', OIDC_CLIENT_SECRET: 'secret', COMMUNITY_RATE_SECRET: 'r'.repeat(64) };
  async function call(path = '', { method = 'GET', user = 'alice', data, raw, requestOrigin = origin, type = 'application/json', ip = '192.0.2.1' } = {}) {
    const headers = { 'Content-Type': type, 'CF-Connecting-IP': ip };
    if (user) headers.Cookie = '__Host-hos_session=' + user[0].repeat(43);
    if (requestOrigin) headers.Origin = requestOrigin;
    return worker.fetch(new Request(origin + '/api/community/drafts' + path, { method, headers, body: raw ?? (data ? JSON.stringify(data) : undefined) }), env);
  }
  return { sql, env, call };
}
test('Draft HTTP: session-owned create, read, list and CAS update; no client owner authority', async t => {
  const f = await fixture(t);
  const created = await f.call('', { method: 'POST', data: draft }); assert.equal(created.status, 201);
  const saved = (await created.json()).draft;
  assert.equal((await (await f.call('/' + saved.id)).json()).draft.privateNotes, draft.privateNotes);
  const list = await (await f.call()).json(); assert.equal(list.drafts.length, 1); assert.equal('privateNotes' in list.drafts[0], false);
  assert.equal((await f.call('/' + saved.id, { user: 'bob' })).status, 404);
  assert.deepEqual((await (await f.call('', { user: 'bob' })).json()).drafts, []);
  assert.equal((await f.call('/' + saved.id, { user: 'bob', method: 'PUT', data: { ...draft, revision: 1 } })).status, 409);
  const updated = await f.call('/' + saved.id, { method: 'PUT', data: { ...draft, revision: 1 } }); assert.equal(updated.status, 200);
  assert.equal((await updated.json()).draft.revision, 2);
  assert.equal((await f.call('/' + saved.id, { method: 'PUT', data: { ...draft, revision: 1 } })).status, 409);
  assert.equal((await f.call('', { method: 'POST', data: { ...draft, ownerId: 'bob' } })).status, 400);
});
test('Draft HTTP: unauthorized, blocked, expired, disabled, cross-origin and malformed requests fail', async t => {
  const f = await fixture(t);
  assert.equal((await f.call('', { user: null })).status, 401);
  for (const requestOrigin of [null, 'https://evil.example']) assert.equal((await f.call('', { method: 'POST', data: draft, requestOrigin })).status, 403);
  assert.equal((await f.call('', { method: 'POST', raw: '[]' })).status, 400);
  assert.equal((await f.call('', { method: 'POST', raw: '{' })).status, 400);
  assert.equal((await f.call('', { method: 'POST', data: draft, type: 'text/plain' })).status, 415);
  assert.equal((await f.call('', { method: 'POST', raw: 'x'.repeat(98305) })).status, 413);
  assert.equal((await f.call('', { method: 'POST', data: { ...draft, input: { text: '😀'.repeat(20000) } } })).status, 413);
  assert.equal((await f.call('?after=not-a-uuid')).status, 400);
  assert.equal((await f.call('', { method: 'DELETE' })).status, 405);
  f.sql.exec("UPDATE community_users SET blocked=1 WHERE id='alice'"); assert.equal((await f.call()).status, 401);
  f.sql.exec('UPDATE community_sessions SET expires_at = 2, created_at = 1');
  assert.equal((await f.call('', { user: 'bob' })).status, 401);
  f.env.COMMUNITY_ENABLED = 'false'; assert.equal((await f.call()).status, 503);
});
test('Draft HTTP: paginated summaries are owner-scoped and bounded', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 27; i++) await f.call('', { method: 'POST', data: { ...draft, title: String(i) } });
  const first = await (await f.call()).json(); assert.equal(first.drafts.length, 25); assert.ok(first.nextCursor);
  const last = await (await f.call('?after=' + first.nextCursor)).json(); assert.equal(last.drafts.length, 2); assert.equal(last.nextCursor, null);
  assert.equal(new Set([...first.drafts, ...last.drafts].map(x => x.id)).size, 27);
});
test('Draft HTTP: write quota is account-scoped across IPs', async t => {
  const f = await fixture(t);
  for (let i = 0; i < 60; i++) assert.equal((await f.call('', { method: 'POST', data: draft, ip: '192.0.2.' + i })).status, 201);
  assert.equal((await f.call('', { method: 'POST', data: draft, ip: '192.0.2.250' })).status, 429);
  assert.equal((await f.call('', { method: 'POST', data: draft, user: 'bob' })).status, 201);
});
test('Account HTML: canonical and .html paths carry privacy/security headers', async () => {
  for (const path of ['/account', '/account.html', '/audits', '/audits.html']) {
    const response = await worker.fetch(new Request(origin + path), { COMMUNITY_ENABLED: 'true', ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }) } });
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
    assert.match(response.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  }
});
