import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleCommunity } from '../worker/community.mjs';

const text = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
// These configs use JSON with standalone line comments, not arbitrary JSONC.
const production = JSON.parse(text('wrangler.jsonc').replace(/^\s*\/\/.*$/gm, ''));
const staging = JSON.parse(text('wrangler.staging.jsonc'));
const scripts = JSON.parse(text('package.json')).scripts;

test('production retains its identity, dashboard text variables and the enabled community decision', () => {
  assert.equal(production.name, 'harshalos');
  assert.equal(production.keep_vars, true);
  // The enablement decision: explicit file value, so a dashboard 'false' cannot win.
  assert.equal(production.vars.COMMUNITY_ENABLED, 'true');
  assert.equal(production.vars.MONGODB_DATABASE, 'harshalos');
  assert.equal(production.workers_dev, false);
  assert.equal(production.preview_urls, false);
  // Do not override owner-managed issuer/client/origin or Access configuration.
  assert.deepEqual(Object.keys(production.vars).sort(), ['COMMUNITY_ENABLED', 'MONGODB_DATABASE', 'OIDC_ADMIN_SUBJECTS']);
});

test('production declares the confirmed D1 and R2 targets without sharing them with staging', () => {
  assert.deepEqual(production.d1_databases, [{ binding: 'COMMUNITY_DB', database_name: 'community_db', database_id: 'ea508a07-e00c-4d41-a657-428937ba8110', migrations_dir: 'migrations/community' }]);
  assert.deepEqual(production.r2_buckets, [{ binding: 'STORAGE_BUCKET', bucket_name: 'main-empty-domains' }]);
  assert.notEqual(production.d1_databases[0].database_id, staging.d1_databases[0].database_id);
  assert.equal(staging.r2_buckets, undefined);
  for (const secret of ['OIDC_CLIENT_SECRET', 'COMMUNITY_RATE_SECRET', 'MONGODB_URI']) {
    assert.equal(secret in production.vars, false);
    assert.equal(secret in staging.vars, false);
  }
});

test('production branch-preview overrides contain no production D1 or R2 and keep community disabled', () => {
  assert.deepEqual(production.previews.d1_databases, []);
  assert.deepEqual(production.previews.r2_buckets, []);
  assert.equal(production.previews.vars.COMMUNITY_ENABLED, 'false');
  assert.equal(production.previews.vars.MONGODB_DATABASE, 'harshalos_preview');
});

test('production deployment remains separate from migration and staging deployment', () => {
  assert.equal(scripts.deploy, 'npm run prepare:assets && wrangler deploy');
  assert.equal(production.build.command, 'node scripts/prepare-assets.mjs');
  assert.equal(scripts['deploy:staging'], 'wrangler deploy --config wrangler.staging.jsonc');
  assert.equal(scripts['check:deploy'], 'npm run prepare:assets && wrangler deploy --dry-run');
});

test('production keeps community pages worker-first and uses the allowlisted assets', () => {
  assert.equal(production.main, 'worker/index.mjs');
  assert.equal(production.assets.binding, 'ASSETS');
  assert.equal(production.assets.directory, '.site-assets');
  assert.deepEqual(production.assets.run_worker_first, ['/api/*', '/account', '/account.html', '/audits', '/audits.html']);
});

test('enabled release rejects unconfigured community routes before any D1 query', async () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const routes = [
    ['GET', 'me'], ['GET', 'auth/login'], ['GET', 'auth/callback'], ['POST', 'auth/logout'],
    ['GET', 'drafts'], ['POST', 'drafts'], ['GET', `drafts/${id}`], ['PUT', `drafts/${id}`], ['DELETE', `drafts/${id}`],
    ['GET', `drafts/${id}/runs`], ['POST', `drafts/${id}/runs`], ['DELETE', `drafts/${id}/runs/${id}`], ['GET', 'audit-template'],
    ['GET', 'status'], ['GET', 'publications'], ['GET', 'public-log'], ['POST', 'public-preview'],
    ['POST', 'publish'], ['GET', 'my-publications'], ['GET', 'moderation'],
    ['POST', `publications/${id}/withdraw`], ['POST', `publications/${id}/report`]
  ];
  // The origin/OIDC variables and secrets are owner-managed in the dashboard and
  // absent here, exactly as they are absent from wrangler.jsonc. An enabled Worker
  // must fail closed on every route and must not query D1 first.
  let queries = 0;
  const env = { COMMUNITY_ENABLED: production.vars.COMMUNITY_ENABLED,
    COMMUNITY_DB: { prepare() { queries++; throw new Error('Unconfigured request reached D1'); } } };
  for (const [method, path] of routes) {
    const response = await handleCommunity(new Request('https://main.empty.domains/api/community/' + path, { method }), env);
    assert.equal(response.status, 503, method + ' ' + path);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.doesNotMatch(await response.text(), /prepare|community_auth_rates|sqlite/i);
  }
  assert.equal(queries, 0, 'no route may touch D1 before the origin/OIDC configuration passes');
});
