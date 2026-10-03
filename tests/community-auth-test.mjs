import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { handleCommunityAuth, digest, cleanupAuth } from '../worker/community-auth.mjs';
import worker from '../worker/index.mjs';
const now = 1800000000;
const origin = 'https://os.example';
const issuer = 'https://tenant.example/';
const pair = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(pair.publicKey), kid: 'test', alg: 'RS256', use: 'sig' };
const cookiePair = response => response.headers.getSetCookie().map(x => x.split(';')[0]).join('; ');
function fixture(t) {
  const sql = new DatabaseSync(':memory:'); t.after(() => sql.close()); sql.exec('PRAGMA foreign_keys=ON');
  for (const file of ['0001_private_drafts.sql', '0002_auth_sessions.sql']) sql.exec(readFileSync(new URL('../migrations/community/' + file, import.meta.url), 'utf8'));
  const db = { prepare(text) {
    let args = [];
    const statement = { bind(...values) { args = values; return statement; }, async first() { return sql.prepare(text).get(...args) ?? null; }, async run() { return sql.prepare(text).run(...args); } };
    return statement;
  } };
  const env = { COMMUNITY_DB: db, COMMUNITY_ENABLED: 'true', COMMUNITY_ORIGIN: origin, COMMUNITY_RATE_SECRET: 'r'.repeat(64),
    OIDC_ISSUER: issuer, OIDC_CLIENT_ID: 'client', OIDC_CLIENT_SECRET: 'DO-NOT-EXPOSE', OIDC_ADMIN_SUBJECTS: 'account-1' };
  let nonce, challenge;
  let overrides = {};
  let failToken = false;
  let corrupt = false;
  let badDiscovery = false;
  let fetched = 0;
  const fetcher = async (url, init) => {
    fetched++;
    assert.equal(init.redirect, 'manual');
    if (String(url).endsWith('openid-configuration')) return Response.json({ issuer, authorization_endpoint: issuer + 'authorize', token_endpoint: issuer + 'token', jwks_uri: badDiscovery ? 'https://evil.example/jwks' : issuer + 'jwks', response_types_supported: ['code'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['client_secret_post'] });
    if (String(url).endsWith('/jwks')) return Response.json({ keys: [jwk] });
    assert.equal(String(url), issuer + 'token');
    const form = new URLSearchParams(init.body);
    assert.equal(form.get('client_secret'), env.OIDC_CLIENT_SECRET);
    assert.equal(await digest(form.get('code_verifier')), challenge);
    assert.equal(form.get('redirect_uri'), origin + '/api/community/auth/callback');
    if (failToken) return new Response(env.OIDC_CLIENT_SECRET, { status: 302, headers: { Location: 'https://evil.example/' } });
    const claims = { iss: issuer, aud: 'client', sub: 'account-1', nonce, iat: now, exp: now + 300, ...overrides };
    let id_token = await new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'test' }).sign(pair.privateKey);
    if (corrupt) { const parts = id_token.split('.'); parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1); id_token = parts.join('.'); }
    return Response.json({ id_token, access_token: 'must-not-be-stored' });
  };
  async function call(path, { method = 'GET', cookies = '', requestOrigin, at = now, targetEnv = env, urlOrigin = origin } = {}) {
    const headers = { Cookie: cookies, 'CF-Connecting-IP': '192.0.2.1' };
    if (requestOrigin) headers.Origin = requestOrigin;
    return handleCommunityAuth(new Request(urlOrigin + '/api/community/' + path, { method, headers }), targetEnv, { fetch: fetcher, now: at });
  }
  async function login() {
    const response = await call('auth/login'); assert.equal(response.status, 302);
    const destination = new URL(response.headers.get('Location'));
    nonce = destination.searchParams.get('nonce'); challenge = destination.searchParams.get('code_challenge');
    assert.equal(destination.searchParams.get('scope'), 'openid');
    assert.equal(destination.searchParams.get('code_challenge_method'), 'S256');
    assert.match(response.headers.get('Set-Cookie'), /Secure; HttpOnly; SameSite=Lax/);
    return { path: 'auth/callback?code=one-use-code&state=' + destination.searchParams.get('state'), cookies: cookiePair(response), response };
  }
  return { sql, env, call, login, corruptSignature: () => { corrupt = true; }, setClaims: value => { overrides = value; }, failProvider: () => { failToken = true; }, badDiscovery: () => { badDiscovery = true; }, fetched: () => fetched };
}

test('OIDC: login, PKCE exchange, hashed session, account status, logout and replay rejection', async t => {
  const f = fixture(t); const flow = await f.login();
  const response = await f.call(flow.path, { cookies: flow.cookies }); assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), origin + '/');
  const cookies = cookiePair(response);
  const raw = /__Host-hos_session=([^;]+)/.exec(cookies)[1];
  const stored = f.sql.prepare('SELECT * FROM community_sessions').get();
  assert.equal(stored.token_hash, await digest(raw)); assert.notEqual(stored.token_hash, raw);
  assert.equal(stored.expires_at - stored.created_at, 86400);
  const me = await f.call('me', { cookies }); const account = await me.json();
  assert.equal(me.status, 200); assert.equal(account.user.moderator, true);
  assert.equal('oidc_subject' in account.user, false);
  assert.equal((await f.call(flow.path, { cookies: flow.cookies })).status, 400);
  assert.equal((await f.call('auth/logout', { method: 'POST', cookies, requestOrigin: origin })).status, 200);
  assert.equal((await f.call('me', { cookies })).status, 401);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_users').get().n, 1);
});

test('OIDC: browser binding and expired flow cannot create sessions', async t => {
  const f = fixture(t); const flow = await f.login();
  assert.equal((await f.call(flow.path)).status, 400);
  assert.equal((await f.call(flow.path, { cookies: '__Host-hos_flow=' + 'x'.repeat(43) })).status, 400);
  assert.equal((await f.call(flow.path, { cookies: flow.cookies, at: now + 601 })).status, 400);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_sessions').get().n, 0);
});

test('OIDC: rejects wrong issuer, audience, nonce, azp, expired/old/future claims', async t => {
  for (const claims of [{ iss: 'https://evil.example/' }, { aud: 'other' }, { nonce: 'wrong' }, { azp: 'other' }, { aud: ['client', 'other'] }, { exp: now - 10 }, { iat: now - 700 }, { iat: now + 100 }, { sub: '' }]) {
    await t.test(JSON.stringify(claims), async t => {
      const f = fixture(t); const flow = await f.login(); f.setClaims(claims);
      const response = await f.call(flow.path, { cookies: flow.cookies });
      assert.equal(response.status, 401);
      assert.equal(f.sql.prepare('SELECT count(*) n FROM community_users').get().n, 0);
      assert.equal(f.sql.prepare('SELECT count(*) n FROM community_sessions').get().n, 0);
    });
  }
});

test('OIDC: revoked, blocked and expired sessions fail; issuer/client changes invalidate sessions', async t => {
  const f = fixture(t); const flow = await f.login();
  const response = await f.call(flow.path, { cookies: flow.cookies }); const cookies = cookiePair(response);
  assert.equal((await f.call('me', { cookies, at: now + 86401 })).status, 401);
  assert.equal((await f.call('me', { cookies, targetEnv: { ...f.env, OIDC_CLIENT_ID: 'other' } })).status, 401);
  assert.equal((await f.call('me', { cookies, targetEnv: { ...f.env, OIDC_ISSUER: 'https://other.example/' } })).status, 401);
  f.sql.exec('UPDATE community_users SET blocked = 1');
  assert.equal((await f.call('me', { cookies })).status, 401);
  const next = await f.login();
  assert.equal((await f.call(next.path, { cookies: next.cookies })).status, 403);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_users').get().n, 1);
});

test('OIDC: wrong-origin logout and wrong methods cannot revoke a session', async t => {
  const f = fixture(t); const flow = await f.login();
  const response = await f.call(flow.path, { cookies: flow.cookies }); const cookies = cookiePair(response);
  for (const requestOrigin of [undefined, 'https://evil.example']) assert.equal((await f.call('auth/logout', { method: 'POST', cookies, requestOrigin })).status, 403);
  assert.equal((await f.call('auth/logout', { cookies })).status, 405);
  assert.equal((await f.call('me', { cookies })).status, 200);
  assert.equal((await f.call('auth/login', { urlOrigin: 'https://other.example' })).status, 403);
});

test('OIDC: provider redirects and hostile discovery are refused without secret leaks', async t => {
  const f = fixture(t); const flow = await f.login(); f.failProvider();
  const response = await f.call(flow.path, { cookies: flow.cookies });
  assert.equal(response.status, 502); assert.ok(!(await response.text()).includes(f.env.OIDC_CLIENT_SECRET));
  f.badDiscovery(); assert.equal((await f.call('auth/login')).status, 503);
});

test('OIDC: durable rate limits and expiry cleanup', async t => {
  const f = fixture(t);
  for (let i = 0; i < 20; i++) await f.login();
  assert.equal((await f.call('auth/login')).status, 429);
  const buckets = f.sql.prepare('SELECT bucket FROM community_auth_rates').all();
  assert.ok(buckets.every(x => !x.bucket.includes('192.0.2.1')));
  await cleanupAuth(f.env.COMMUNITY_DB, now + 1000);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_auth_flows').get().n, 0);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_auth_rates').get().n, 0);
});

test('OIDC: disabled/configuration/migration gates fail closed without contacting provider', async t => {
  const f = fixture(t);
  assert.equal((await f.call('auth/login', { targetEnv: { ...f.env, COMMUNITY_ENABLED: 'false' } })).status, 503);
  assert.equal((await f.call('auth/login', { targetEnv: { ...f.env, OIDC_CLIENT_SECRET: '' } })).status, 503);
  assert.equal((await f.call('auth/login', { targetEnv: { ...f.env, COMMUNITY_ORIGIN: 'http://os.example' } })).status, 503);
  f.sql.exec("DELETE FROM community_schema WHERE component = 'authentication'");
  assert.equal((await f.call('auth/login')).status, 503); assert.equal(f.fetched(), 0);
  const response = await worker.fetch(new Request(origin + '/api/community/me'), { COMMUNITY_ENABLED: 'false' });
  assert.equal(response.status, 503);
});

test('OIDC: invalid signature cannot create an account', async t => {
  const f = fixture(t); const flow = await f.login(); f.corruptSignature();
  assert.equal((await f.call(flow.path, { cookies: flow.cookies })).status, 401);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_users').get().n, 0);
});

test('OIDC: repeated sign-in reuses account, rotates session and reflects moderator removal', async t => {
  const f = fixture(t); const first = await f.login();
  const firstResponse = await f.call(first.path, { cookies: first.cookies });
  const oldCookies = cookiePair(firstResponse).split('; ').filter(x => x.startsWith('__Host-hos_session=')).join('; ');
  const second = await f.login();
  const secondResponse = await f.call(second.path, { cookies: second.cookies + '; ' + oldCookies });
  assert.equal(secondResponse.status, 303);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_users').get().n, 1);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_sessions').get().n, 1);
  assert.equal((await f.call('me', { cookies: oldCookies })).status, 401);
  const response = await f.call('me', { cookies: cookiePair(secondResponse), targetEnv: { ...f.env, OIDC_ADMIN_SUBJECTS: '' } });
  assert.equal((await response.json()).user.moderator, false);
});

test('OIDC: logout cancels an in-flight browser login', async t => {
  const f = fixture(t); const flow = await f.login();
  const response = await f.call('auth/logout', { method: 'POST', cookies: flow.cookies, requestOrigin: origin });
  assert.equal(response.status, 200); assert.equal(response.headers.getSetCookie().length, 2);
  assert.equal((await f.call(flow.path, { cookies: flow.cookies })).status, 400);
});

test('OIDC: concurrent callbacks consume a flow once; cleanup preserves accounts', async t => {
  const f = fixture(t); const flow = await f.login();
  const results = await Promise.all([f.call(flow.path, { cookies: flow.cookies }), f.call(flow.path, { cookies: flow.cookies })]);
  assert.deepEqual(results.map(x => x.status).sort(), [303, 400]);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_sessions').get().n, 1);
  await cleanupAuth(f.env.COMMUNITY_DB, now + 86401);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_sessions').get().n, 0);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_users').get().n, 1);
});
