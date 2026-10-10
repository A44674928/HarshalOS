import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const text = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const staging = JSON.parse(text('wrangler.staging.jsonc'));
const production = text('wrangler.jsonc');
const scripts = JSON.parse(text('package.json')).scripts;

test('staging uses the dedicated Worker, origin, domain and D1 ID only', () => {
  assert.equal(staging.name, 'harshalos-staging');
  assert.equal(staging.vars.COMMUNITY_ORIGIN, 'https://staging.empty.domains');
  assert.deepEqual(staging.routes, [{ pattern: 'staging.empty.domains', custom_domain: true }]);
  assert.deepEqual(staging.d1_databases, [{ binding: 'COMMUNITY_DB', database_name: 'community_db_staging', database_id: '74f281fe-3ab9-49b1-bff6-4686cb768ca7', migrations_dir: 'migrations/community' }]);
  assert.ok(!JSON.stringify(staging).includes('ea508a07-e00c-4d41-a657-428937ba8110'));
  assert.match(production, /"name": "harshalos"/);
  assert.match(production, /ea508a07-e00c-4d41-a657-428937ba8110/);
  assert.ok(!production.includes('74f281fe-3ab9-49b1-bff6-4686cb768ca7'));
});

test('staging stays disabled, retains dashboard variables and contains no credentials', () => {
  assert.equal(staging.vars.COMMUNITY_ENABLED, 'false');
  assert.equal(staging.keep_vars, true);
  assert.equal(staging.workers_dev, false);
  assert.equal(staging.preview_urls, false);
  assert.equal(staging.observability.enabled, false);
  assert.deepEqual(Object.keys(staging.vars).sort(), ['COMMUNITY_ENABLED', 'COMMUNITY_ORIGIN']);
  for (const key of ['r2_buckets', 'services', 'kv_namespaces', 'env', 'previews']) assert.equal(key in staging, false);
  // Production enablement never leaks into branch previews: the override still wins there.
  const previews = JSON.parse(production.replace(/^\s*\/\/.*$/gm, '')).previews;
  assert.equal(previews.vars.COMMUNITY_ENABLED, 'false');
});

test('staging commands always name the staging config; deploy never applies migrations', () => {
  for (const key of ['deploy:staging','check:deploy:staging','db:staging:inspect','db:staging:migrations:list','db:staging:migrate']) {
    assert.match(scripts[key], /--config wrangler\.staging\.jsonc/);
    assert.ok(!scripts[key].includes('--env'));
  }
  assert.equal(scripts['deploy:staging'], 'wrangler deploy --config wrangler.staging.jsonc');
  assert.match(scripts['check:deploy:staging'], /--dry-run/);
  assert.match(scripts['db:staging:inspect'], /SELECT name, sql FROM sqlite_schema/);
  assert.match(scripts['db:staging:migrate'], /migrations apply COMMUNITY_DB/);
  assert.equal(staging.build.command, 'node scripts/prepare-assets.mjs');
});

test('staging uses the same worker-first privacy routes and allowlisted assets', () => {
  assert.equal(staging.main, 'worker/index.mjs');
  assert.equal(staging.assets.directory, '.site-assets');
  assert.equal(staging.assets.binding, 'ASSETS');
  assert.deepEqual(staging.assets.run_worker_first, ['/api/*','/account','/account.html','/audits','/audits.html','/observations','/observations.html','/.git','/.git/*','/.env*']);
  assert.equal(staging.assets.not_found_handling, 'none', 'missing assets must not fall through to an SPA index');
  assert.ok(!text('.assetsignore').includes('!wrangler'));
});
