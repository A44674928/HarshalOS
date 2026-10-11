import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.mjs';

const ORIGIN = 'https://harshalos.example';
const SOURCE_CONTROL_AND_ENV_PATHS = [
  '/.git/HEAD',
  '/.git/config',
  '/.git/index',
  '/.git/description',
  '/.git/logs/HEAD',
  '/.git/refs/heads/main',
  '/.git/refs/heads/master',
  '/.env',
  '/.env.local'
];

function assetTrap(calls, response = () => new Response('asset binding was reached', { status: 200 })) {
  return {
    ASSETS: {
      async fetch(request) {
        calls.push(new URL(request.url).pathname);
        return response(request);
      }
    }
  };
}

test('source-control metadata and environment files are rejected before route matching or Assets.fetch', async () => {
  const assetCalls = [];
  const env = assetTrap(assetCalls);
  for (const path of SOURCE_CONTROL_AND_ENV_PATHS) {
    const response = await worker.fetch(new Request(ORIGIN + path), env);
    assert.equal(response.status, 404, `GET ${path}`);
    assert.equal(response.headers.get('Cache-Control'), 'no-store', `GET ${path}`);
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff', `GET ${path}`);
    assert.equal(await response.text(), '', `GET ${path} returns no file content`);
  }
  assert.deepEqual(assetCalls, [], 'blocked paths must not enter the normal Assets/catch-all path');
});

test('encoded, separator, case, and traversal variants stay outside the Assets path', async () => {
  const variants = [
    '/%2egit/HEAD',                         // encoded dot
    '/.%67it/config',                       // encoded letter
    '/.%2567it/config',                     // double-encoded letter
    '/.git%2fconfig',                       // encoded separator
    '/.git%252flogs%252fHEAD',              // double-encoded separators
    '/.%67it%5cconfig',                     // encoded backslash separator
    '/%2e%2e/.git/config',                  // URL-normalized traversal
    '/%2e%2e%2f.git/config',                // encoded traversal separator
    '/nested/%2e%2e/.GIT/refs/heads/main',   // case variant after traversal
    '/%2eenv',                              // encoded .env
    '/.%65nv%2elocal',                      // encoded .env.local
    '/.%2565nv%252elocal',                  // double-encoded .env.local
    '/.git/config?attempt=1'                 // query must not alter the route decision
  ];
  const assetCalls = [];
  const env = assetTrap(assetCalls);
  for (const path of variants) {
    const response = await worker.fetch(new Request(ORIGIN + path), env);
    assert.equal(response.status, 404, `GET ${path}`);
    assert.equal(await response.text(), '', `GET ${path} returns no file content`);
  }
  assert.deepEqual(assetCalls, [], 'encoded metadata probes must not enter Assets.fetch');
});

test('ordinary public routes still use the Assets binding', async () => {
  const assetCalls = [];
  const env = assetTrap(assetCalls, () => new Response('public index', { status: 200 }));
  const response = await worker.fetch(new Request(ORIGIN + '/index.html'), env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'public index');
  assert.deepEqual(assetCalls, ['/index.html']);
});

test('Community page aliases fetch extensionless canonical assets and avoid HTML redirect loops', async () => {
  const assetCalls = [];
  const env = assetTrap(assetCalls, () => new Response('community page', { status: 200 }));
  for (const path of ['/account', '/account.html', '/audits', '/audits.html', '/observations', '/observations.html']) {
    const response = await worker.fetch(new Request(ORIGIN + path + '?id=abc'), env);
    assert.equal(response.status, 200, path);
    assert.equal(await response.text(), 'community page', path);
  }
  assert.deepEqual(assetCalls, [
    '/account', '/account', '/audits', '/audits', '/observations', '/observations'
  ], 'both URL forms must fetch canonical extensionless paths from Assets');
  const response = await worker.fetch(new Request(ORIGIN + '/observations?id=abc'), env);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.match(response.headers.get('Content-Security-Policy'), /connect-src 'self'/);

  const rejected = await worker.fetch(new Request(ORIGIN + '/observations', { method: 'POST' }), env);
  assert.equal(rejected.status, 405);
  assert.equal(rejected.headers.get('Allow'), 'GET, HEAD');
  assert.equal(assetCalls.length, 7, 'non-GET Community page requests do not reach Assets');
});

test('deployment configuration, Worker source, and arbitrary repo paths are not served as assets', async () => {
  const assetCalls = [];
  const published = new Set(['/index.html', '/about.html', '/account.html', '/audits.html', '/observations.html']);
  const env = assetTrap(assetCalls, request => {
    const pathname = new URL(request.url).pathname;
    return published.has(pathname)
      ? new Response('allowlisted public document', { status: 200 })
      : new Response(null, { status: 404 });
  });
  const paths = [
    '/wrangler.jsonc',
    '/wrangler.staging.jsonc',
    '/worker/index.mjs',
    '/serve.js',
    '/README.md',
    '/.env',
    '/.env.local',
    '/.git/config'
  ];
  for (const path of paths) {
    const response = await worker.fetch(new Request(ORIGIN + path), env);
    assert.equal(response.status, 404, `GET ${path}`);
    assert.equal(await response.text(), '', `GET ${path} returns no repository contents`);
  }
  assert.deepEqual(assetCalls, [
    '/wrangler.jsonc', '/wrangler.staging.jsonc', '/worker/index.mjs', '/serve.js', '/README.md'
  ], 'dotfile and .git routes are denied before Assets; other unknown paths only query the static binding');
});
