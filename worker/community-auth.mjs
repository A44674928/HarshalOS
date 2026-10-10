import { createRemoteJWKSet, customFetch, jwtVerify } from 'jose';
import { CommunityError } from './community-db.mjs';

const SESSION = '__Host-hos_session';
const FLOW = '__Host-hos_flow';
const encoder = new TextEncoder();
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async value => b64(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const cookie = (name, value, age) => `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
function readCookie(request, name) {
  const values = (request.headers.get('Cookie') || '').split(';').map(x => x.trim()).filter(x => x.startsWith(name + '='));
  if (values.length !== 1) return '';
  const value = values[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : '';
}
export function authJson(data, status = 200, extra = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', ...extra } });
}
function https(value) {
  let url;
  try { url = new URL(value); } catch { throw new CommunityError(503, 'Invalid community authentication configuration.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new CommunityError(503, 'Invalid community authentication configuration.');
  return url;
}
function configuration(request, env) {
  const origin = https(env.COMMUNITY_ORIGIN);
  const issuer = https(env.OIDC_ISSUER);
  if (env.COMMUNITY_ORIGIN !== origin.origin || new URL(request.url).origin !== origin.origin) throw new CommunityError(403, 'Community origin mismatch.');
  if (!env.COMMUNITY_DB || !env.OIDC_CLIENT_ID || !env.OIDC_CLIENT_SECRET || typeof env.COMMUNITY_RATE_SECRET !== 'string' || env.COMMUNITY_RATE_SECRET.length < 32) throw new CommunityError(503, 'Community authentication is not configured.');
  return { origin: origin.origin, issuer: env.OIDC_ISSUER, issuerOrigin: issuer.origin, client: env.OIDC_CLIENT_ID, callback: origin.origin + '/api/community/auth/callback' };
}
// Bounded provider responses; do not follow redirects or expose provider errors.
async function providerJson(fetcher, url, init = {}) {
  const response = await fetcher(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(10000) });
  if (!response.ok || !response.body) throw new CommunityError(502, 'Identity provider unavailable.');
  const reader = response.body.getReader();
  const parts = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); throw new CommunityError(502, 'Identity provider response too large.'); }
    parts.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new CommunityError(502, 'Invalid identity provider response.'); }
}
async function discovery(config, fetcher) {
  const doc = await providerJson(fetcher, config.issuer.replace(/\/$/, '') + '/.well-known/openid-configuration');
  if (doc.issuer !== config.issuer || !doc.response_types_supported?.includes('code') || !doc.code_challenge_methods_supported?.includes('S256') || !doc.token_endpoint_auth_methods_supported?.includes('client_secret_post')) throw new CommunityError(503, 'Identity provider is not compatible with this configuration.');
  for (const key of ['authorization_endpoint', 'token_endpoint', 'jwks_uri']) {
    if (https(doc[key]).origin !== config.issuerOrigin) throw new CommunityError(503, 'Identity provider endpoints must share its HTTPS origin.');
  }
  return doc;
}
async function rate(db, secret, scope, ip, limit, seconds, now) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const window = Math.floor(now / seconds);
  const bucket = b64(await crypto.subtle.sign('HMAC', key, encoder.encode(`${scope}:${window}:${ip}`)));
  const row = await db.prepare(`INSERT INTO community_auth_rates(bucket, hits, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1 WHERE hits < ? RETURNING hits`)
    .bind(bucket, (window + 1) * seconds, limit).first();
  if (!row) throw new CommunityError(429, 'Too many authentication requests. Try again later.');
}
export async function cleanupAuth(db, now = Math.floor(Date.now() / 1000)) {
  // Bounded indexed cleanup; never removes accounts or draft data.
  for (const [table, key] of [['community_auth_flows', 'state_hash'], ['community_sessions', 'token_hash'], ['community_auth_rates', 'bucket']]) {
    await db.prepare(`DELETE FROM ${table} WHERE ${key} IN (SELECT ${key} FROM ${table} WHERE expires_at <= ? ORDER BY expires_at LIMIT 100)`).bind(now).run();
  }
}
async function currentUser(request, env, config, now) {
  const token = readCookie(request, SESSION);
  if (!token) throw new CommunityError(401, 'Sign in to continue.');
  const row = await env.COMMUNITY_DB.prepare(`SELECT u.id, u.oidc_subject, u.oidc_issuer FROM community_sessions s
    JOIN community_users u ON s.user_id = u.id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.blocked = 0
      AND s.issuer = ? AND s.client_id = ? AND u.oidc_issuer = s.issuer`)
    .bind(await digest(token), now, config.issuer, config.client).first();
  if (!row) throw new CommunityError(401, 'Session expired or unavailable.');
  return { id: row.id, moderator: (env.OIDC_ADMIN_SUBJECTS || '').split(',').map(x => x.trim()).includes(row.oidc_subject) };
}

// Dependencies are test-only function arguments, never environment/request data.
export async function handleCommunityAuth(request, env, dependencies = {}) {
  const path = new URL(request.url).pathname;
  const callback = path === '/api/community/auth/callback';
  try {
    if (env.COMMUNITY_ENABLED !== 'true') throw new CommunityError(503, 'Community is disabled.');
    const routes = { '/api/community/auth/login': 'GET', '/api/community/auth/callback': 'GET', '/api/community/auth/logout': 'POST', '/api/community/me': 'GET' };
    if (!(path in routes)) throw new CommunityError(404, 'Unknown authentication route.');
    if (request.method !== routes[path]) return authJson({ error: 'Method not allowed.' }, 405, { Allow: routes[path] });
    const config = configuration(request, env);
    if (request.method === 'POST' && request.headers.get('Origin') !== config.origin) throw new CommunityError(403, 'Same-origin request required.');
    const now = dependencies.now ?? Math.floor(Date.now() / 1000);
    const db = env.COMMUNITY_DB;
    const schema = await db.prepare("SELECT version FROM community_schema WHERE component = 'authentication'").first();
    if (schema?.version !== 1) throw new CommunityError(503, 'Authentication migration is required.');
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    await rate(db, env.COMMUNITY_RATE_SECRET, 'all', ip, 90, 60, now);
    if (path === '/api/community/me') return authJson({ user: await currentUser(request, env, config, now) });
    if (path.endsWith('/logout')) {
      const token = readCookie(request, SESSION);
      if (token) await db.prepare('DELETE FROM community_sessions WHERE token_hash = ?').bind(await digest(token)).run();
      const browser = readCookie(request, FLOW);
      if (browser) await db.prepare('DELETE FROM community_auth_flows WHERE browser_hash = ?').bind(await digest(browser)).run();
      const response = authJson({ signedOut: true }, 200, { 'Set-Cookie': cookie(SESSION, '', 0) });
      response.headers.append('Set-Cookie', cookie(FLOW, '', 0));
      return response;
    }
    await rate(db, env.COMMUNITY_RATE_SECRET, 'login', ip, 20, 900, now);
    await cleanupAuth(db, now);
    const fetcher = dependencies.fetch || fetch;
    if (path.endsWith('/login')) {
      const doc = await discovery(config, fetcher);
      const state = random(), browser = random(), nonce = random(), verifier = random();
      await db.prepare(`INSERT INTO community_auth_flows
        (state_hash, browser_hash, nonce_hash, verifier, issuer, client_id, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(await digest(state), await digest(browser), await digest(nonce), verifier, config.issuer, config.client, now + 600).run();
      const destination = new URL(doc.authorization_endpoint);
      destination.search = new URLSearchParams({ client_id: config.client, redirect_uri: config.callback,
        response_type: 'code', scope: 'openid', state, nonce, code_challenge: await digest(verifier), code_challenge_method: 'S256' }).toString();
      return new Response(null, { status: 302, headers: { Location: destination.href, 'Set-Cookie': cookie(FLOW, browser, 600), 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
    }
    const url = new URL(request.url);
    const state = url.searchParams.get('state'), browser = readCookie(request, FLOW);
    if (!state || !/^[A-Za-z0-9_-]{43}$/.test(state) || !browser || url.searchParams.getAll('state').length !== 1) throw new CommunityError(400, 'Invalid sign-in state. Start sign-in again.');
    const flow = await db.prepare(`DELETE FROM community_auth_flows
      WHERE state_hash = ? AND browser_hash = ? AND expires_at > ? AND issuer = ? AND client_id = ? RETURNING *`)
      .bind(await digest(state), await digest(browser), now, config.issuer, config.client).first();
    if (!flow) throw new CommunityError(400, 'Sign-in expired or already used. Start again.');
    const code = url.searchParams.get('code');
    if (url.searchParams.has('error') || !code || code.length > 4096 || url.searchParams.getAll('code').length !== 1) throw new CommunityError(400, 'Sign-in did not complete. Start again.');
    const doc = await discovery(config, fetcher);
    const token = await providerJson(fetcher, doc.token_endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: config.callback, client_id: config.client,
        client_secret: env.OIDC_CLIENT_SECRET, code_verifier: flow.verifier }).toString() });
    let payload;
    try {
      if (typeof token.id_token !== 'string' || token.id_token.length > 32768) throw new Error('Missing ID token');
      const keys = createRemoteJWKSet(new URL(doc.jwks_uri), { [customFetch]: async (url, init) => Response.json(await providerJson(fetcher, url, init)) });
      ({ payload } = await jwtVerify(token.id_token, keys, { issuer: config.issuer, audience: config.client,
        algorithms: ['RS256', 'ES256'], requiredClaims: ['sub', 'exp', 'iat', 'nonce'], maxTokenAge: '10m', clockTolerance: 5, currentDate: new Date(now * 1000) }));
      if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 512 || typeof payload.nonce !== 'string' || await digest(payload.nonce) !== flow.nonce_hash) throw new Error('Invalid subject/nonce');
      if ((Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== config.client) || (payload.azp !== undefined && payload.azp !== config.client)) throw new Error('Invalid authorized party');
    } catch { throw new CommunityError(401, 'Identity token could not be verified.'); }
    const user = await db.prepare(`INSERT INTO community_users (id, oidc_issuer, oidc_subject, created_at)
      VALUES (?, ?, ?, ?) ON CONFLICT(oidc_issuer, oidc_subject) DO UPDATE SET oidc_subject = excluded.oidc_subject RETURNING id, blocked`)
      .bind(crypto.randomUUID(), config.issuer, payload.sub, now * 1000).first();
    if (user.blocked) throw new CommunityError(403, 'Account unavailable.');
    const session = random();
    const saved = await db.prepare(`INSERT INTO community_sessions(token_hash, user_id, issuer, client_id, created_at, expires_at)
      SELECT ?, id, ?, ?, ?, ? FROM community_users WHERE id = ? AND blocked = 0 RETURNING user_id`)
      .bind(await digest(session), config.issuer, config.client, now, now + 86400, user.id).first();
    if (!saved) throw new CommunityError(403, 'Account unavailable.');
    // Revoke this browser's previous session rather than reusing its identifier.
    const old = readCookie(request, SESSION);
    if (old) await db.prepare('DELETE FROM community_sessions WHERE token_hash = ?').bind(await digest(old)).run();
    const headers = new Headers({ Location: config.origin + '/account', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    headers.append('Set-Cookie', cookie(SESSION, session, 86400));
    headers.append('Set-Cookie', cookie(FLOW, '', 0));
    return new Response(null, { status: 303, headers });
  } catch (error) {
    return authJson({ error: error instanceof CommunityError ? error.message : 'Community authentication unavailable. Please retry later.' },
      error instanceof CommunityError ? error.status : 503, callback ? { 'Set-Cookie': cookie(FLOW, '', 0) } : {});
  }
}

// Shared guard for private APIs. Caller identity is always session-derived.
export async function authorizeCommunity(request, env, { write = false, now = Math.floor(Date.now() / 1000) } = {}) {
  if (env.COMMUNITY_ENABLED !== 'true') throw new CommunityError(503, 'Community is disabled.');
  const config = configuration(request, env);
  if (write && request.headers.get('Origin') !== config.origin) throw new CommunityError(403, 'Same-origin request required.');
  const schema = await env.COMMUNITY_DB.prepare("SELECT version FROM community_schema WHERE component = 'authentication'").first();
  if (schema?.version !== 1) throw new CommunityError(503, 'Authentication migration is required.');
  await rate(env.COMMUNITY_DB, env.COMMUNITY_RATE_SECRET, 'all', request.headers.get('CF-Connecting-IP') || 'unknown', 90, 60, now);
  const user = await currentUser(request, env, config, now);
  if (write) await rate(env.COMMUNITY_DB, env.COMMUNITY_RATE_SECRET, 'draft-write:' + user.id, '', 60, 86400, now);
  return user;
}

export async function limitCommunityRuns(env, userId) {
  await rate(env.COMMUNITY_DB, env.COMMUNITY_RATE_SECRET, 'private-run:' + userId, '', 20, 86400, Math.floor(Date.now() / 1000));
}

export async function allowCommunityPublicRead(request, env) {
  if (env.COMMUNITY_ENABLED !== 'true') throw new CommunityError(503, 'Community is disabled.');
  configuration(request, env);
  const now = Math.floor(Date.now() / 1000);
  await rate(env.COMMUNITY_DB, env.COMMUNITY_RATE_SECRET, 'public-read', request.headers.get('CF-Connecting-IP') || 'unknown', 180, 60, now);
  await env.COMMUNITY_DB.prepare('DELETE FROM community_auth_rates WHERE bucket IN (SELECT bucket FROM community_auth_rates WHERE expires_at<=? ORDER BY expires_at LIMIT 20)').bind(now).run();
}
export async function limitCommunityAction(env, userId, action, limit) {
  await rate(env.COMMUNITY_DB, env.COMMUNITY_RATE_SECRET, action + ':' + userId, '', limit, 86400, Math.floor(Date.now() / 1000));
}

// Narrow unauthenticated actions, such as a native-to-browser publication
// handoff, still need the configured exact HTTPS Community origin and a
// durable HMAC-pseudonymized edge-IP quota. This helper never authenticates or
// identifies a caller; routes using it must remain safe before account claim.
export async function limitCommunityIpAction(request, env, action, limit, seconds) {
  if (env.COMMUNITY_ENABLED !== 'true') throw new CommunityError(503, 'Community is disabled.');
  if (!/^[a-z0-9-]{1,80}$/.test(action) || !Number.isSafeInteger(limit) || limit < 1
    || !Number.isSafeInteger(seconds) || seconds < 1) throw new CommunityError(503, 'Invalid community rate-limit configuration.');
  configuration(request, env);
  await rate(
    env.COMMUNITY_DB,
    env.COMMUNITY_RATE_SECRET,
    action,
    request.headers.get('CF-Connecting-IP') || 'unknown',
    limit,
    seconds,
    Math.floor(Date.now() / 1000)
  );
}
