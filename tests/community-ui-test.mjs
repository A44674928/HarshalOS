import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
const html = readFileSync(new URL('../account.html', import.meta.url), 'utf8').replace(/<script[^>]*>.*?<\/script>/g, '');
const script = readFileSync(new URL('../js/community.js', import.meta.url), 'utf8');
const saved = { id: '11111111-1111-4111-8111-111111111111', revision: 1, title: '<img src=x onerror=alert(1)>', input: { entity: 'Example' }, privateNotes: 'Secret note', updatedAt: 1000 };
async function fixture(t, handler) {
  const window = new Window({ url: 'https://os.example/account', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  t.after(() => window.happyDOM.abort());
  const calls = []; window.fetch = async (url, options) => { calls.push({ url, options }); return handler(url, options); };
  window.confirm = () => true; window.document.write(html); window.eval(script);
  await window.happyDOM.waitUntilComplete();
  return { window, calls, $: id => window.document.getElementById(id), flush: () => window.happyDOM.waitUntilComplete() };
}
test('Account UI: disabled state has no login action or private editor', async t => {
  const f = await fixture(t, () => Response.json({ code: 'COMMUNITY_DISABLED' }, { status: 503 }));
  assert.equal(f.$('workspace').hidden, true); assert.equal(f.$('login').hidden, true);
  assert.match(f.$('notice').textContent, /not enabled/); assert.equal(f.calls.length, 1);
});
test('Account UI: titles are text-only and conflicting saves preserve unsaved edits', async t => {
  const f = await fixture(t, (url, options) => {
    if (url.endsWith('/me')) return Response.json({ user: { id: 'alice' } });
    if (options.method === 'PUT') return Response.json({ error: 'Conflict' }, { status: 409 });
    if (url.endsWith('/drafts')) return Response.json({ drafts: [saved], nextCursor: null });
    return Response.json({ draft: saved });
  });
  assert.equal(f.$('drafts').querySelector('img'), null);
  f.$('drafts').querySelector('button').click(); await f.flush();
  f.$('title').value = 'Unsaved change'; f.$('title').dispatchEvent(new f.window.Event('input', { bubbles: true }));
  f.$('form').dispatchEvent(new f.window.Event('submit', { cancelable: true })); await f.flush();
  assert.equal(f.$('title').value, 'Unsaved change'); assert.match(f.$('notice').textContent, /Export.*before reloading/);
  const request = f.calls.find(x => x.options.method === 'PUT');
  assert.equal(JSON.parse(request.options.body).revision, 1);
  assert.equal('ownerId' in JSON.parse(request.options.body), false);
});
test('Account UI: import stays local until explicit save, then logout clears private content', async t => {
  const f = await fixture(t, (url, options) => {
    if (url.endsWith('/me')) return Response.json({ user: { id: 'alice' } });
    if (url.endsWith('/logout')) return Response.json({ signedOut: true });
    if (options.method === 'POST') return Response.json({ draft: { ...saved, ...JSON.parse(options.body) } }, { status: 201 });
    return Response.json({ drafts: [], nextCursor: null });
  });
  const before = f.calls.length;
  const transfer = new f.window.DataTransfer();
  transfer.items.add(new f.window.File([JSON.stringify({ format: 'harshalos-private-draft-v1', ...saved })], 'draft.json', { type: 'application/json' }));
  f.$('import').files = transfer.files; f.$('import').dispatchEvent(new f.window.Event('change')); await f.flush();
  assert.equal(f.calls.length, before); assert.equal(f.$('notes').value, saved.privateNotes);
  f.$('form').dispatchEvent(new f.window.Event('submit', { cancelable: true })); await f.flush();
  const request = f.calls.find(x => x.options.method === 'POST'); assert.equal(request.url, '/api/community/drafts');
  assert.equal(JSON.parse(request.options.body).revision, undefined);
  f.$('logout').click(); await f.flush();
  assert.equal(f.$('workspace').hidden, true); assert.equal(f.$('notes').value, ''); assert.equal(f.$('title').value, '');
  assert.equal(f.$('login').hidden, false);
});

test('Account UI: run sends only saved revision, renders as text and invalidates on edits', async t => {
  const run = { id: saved.id, revision: 1, createdAt: 1000, reportHash: 'a'.repeat(64), report: { engine: { specificationStatus: 'NORMATIVE BASELINE' }, result: { phase: 'NAB', recordStatus: 'Draft', finding: '<img src=x onerror=alert(1)>' } } };
  const f = await fixture(t, (url, options) => {
    if (url.endsWith('/me')) return Response.json({ user: { id: 'alice' } });
    if (url.endsWith('/runs') && options.method === 'POST') return Response.json({ run, reused: false }, { status: 201 });
    if (url.endsWith('/drafts')) return Response.json({ drafts: [saved], nextCursor: null });
    return Response.json({ draft: saved });
  });
  assert.equal(f.$('run').disabled, true);
  f.$('drafts').querySelector('button').click(); await f.flush();
  assert.equal(f.$('run').disabled, false);
  f.$('run').click(); await f.flush();
  assert.deepEqual(JSON.parse(f.calls.find(x => x.options.method === 'POST').options.body), { revision: 1 });
  assert.equal(f.$('execution').hidden, false); assert.equal(f.$('run-finding').querySelector('img'), null);
  assert.match(f.$('run-summary').textContent, /UNREVIEWED/);
  f.$('input').value = '{}'; f.$('input').dispatchEvent(new f.window.Event('input', { bubbles: true }));
  assert.equal(f.$('run').disabled, true); assert.equal(f.$('execution').hidden, true); assert.equal(f.$('run-json').textContent, '');
});

test('Account UI: template fills editor without saving; historical runs are labeled older', async t => {
  const oldRun = { id: saved.id, revision: 1, createdAt: 1000, reportHash: 'b'.repeat(64), report: { engine: { specificationStatus: 'AMENDMENT DRAFT — NOT RATIFIED' }, result: { phase: 'AMBIGUOUS', recordStatus: 'Draft', finding: 'Unreviewed' } } };
  const f = await fixture(t, (url) => {
    if (url.endsWith('/me')) return Response.json({ user: { id: 'alice' } });
    if (url.includes('audit-template')) return Response.json({ input: { version: '1.0', name: '', cutoff: '2026-10-02' } });
    if (url.endsWith('/runs')) return Response.json({ runs: [{ ...oldRun, phase: 'AMBIGUOUS' }], nextCursor: null });
    if (url.includes('/runs/')) return Response.json({ run: oldRun });
    if (url.endsWith('/drafts')) return Response.json({ drafts: [saved], nextCursor: null });
    return Response.json({ draft: { ...saved, revision: 2 } });
  });
  f.$('drafts').querySelector('button').click(); await f.flush();
  f.$('history').click(); await f.flush();
  f.$('run-history').querySelector('button').click(); await f.flush();
  assert.match(f.$('run-source').textContent, /older than the current draft/);
  f.$('template').click(); await f.flush();
  assert.equal(JSON.parse(f.$('input').value).version, '1.0'); assert.equal(f.$('execution').hidden, true);
  assert.equal(f.calls.filter(x => x.options.method === 'POST' || x.options.method === 'PUT').length, 0);
  assert.equal(f.$('run').disabled, true);
});

test('Account UI: public preview requires consent, sends token only, and is invalidated by edits', async t => {
  const input = { name: 'Entity', version: '1.0', cutoff: '2026-10-02', headerText: 'PRIVATE_DECLARATION', publicKeyText: 'PRIVATE_KEY_FIELD', trustedOrigin: 'PRIVATE_ORIGIN' };
  const run = { id: saved.id, revision: 1, createdAt: 1000, reportHash: 'a'.repeat(64), report: { input, engine: { specificationStatus: 'NORMATIVE BASELINE' }, result: { phase: 'NAB', recordStatus: 'Draft', finding: 'Private calculation' } } };
  const report = { schema: 'ground0-public-v1', reviewStatus: 'UNREVIEWED', input: { name: '<img src=x onerror=alert(1)>' } };
  const f = await fixture(t, (url, options) => {
    if (url.endsWith('/me')) return Response.json({ user: { id: 'alice' } });
    if (url.endsWith('/runs')) return Response.json({ run });
    if (url.endsWith('/public-preview')) return Response.json({ token: 't'.repeat(43), expiresAt: Date.now() + 900000, reportHash: 'b'.repeat(64), report });
    if (url.endsWith('/publish')) return Response.json({ publication: { id: saved.id, state: 'published' } });
    if (url.endsWith('/my-publications')) return Response.json({ publications: [], nextCursor: null });
    if (url.endsWith('/drafts')) return Response.json({ drafts: [saved], nextCursor: null });
    return Response.json({ draft: saved });
  });
  f.$('drafts').querySelector('button').click(); await f.flush(); f.$('run').click(); await f.flush();
  const candidate = JSON.parse(f.$('public-input').value); assert.equal(candidate.headerText, ''); assert.equal(candidate.publicKeyText, ''); assert.equal(candidate.trustedOrigin, '');
  f.$('public-author').value = 'Pseudonym'; f.$('preview-public').click(); await f.flush();
  assert.equal(f.$('public-preview').hidden, false); assert.equal(f.$('preview-json').querySelector('img'), null); assert.equal(f.$('publish-public').disabled, true);
  f.$('public-consent').checked = true; f.$('public-consent').dispatchEvent(new f.window.Event('change')); assert.equal(f.$('publish-public').disabled, false);
  f.$('public-author').dispatchEvent(new f.window.Event('input', { bubbles: true })); assert.equal(f.$('public-preview').hidden, true); assert.equal(f.$('public-consent').checked, false);
  f.$('preview-public').click(); await f.flush(); f.$('public-consent').checked = true; f.$('public-consent').dispatchEvent(new f.window.Event('change')); f.$('publish-public').click(); await f.flush();
  const submitted = JSON.parse(f.calls.find(x => x.url.endsWith('/publish')).options.body);
  assert.deepEqual(submitted, { token: 't'.repeat(43), acknowledgement: 'PUBLISH_PUBLIC_UNREVIEWED' });
  assert.equal(f.$('public-preview').hidden, true);
});

test('Public register UI: untrusted report text is not HTML; removed reports expose no payload', async t => {
  for (const removed of [false, true]) {
    const window = new Window({ url: 'https://os.example/audits?id=pub-id', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
    t.after(() => window.happyDOM.abort());
    const publication = { id: 'pub-id', seriesId: 'series', version: 1, state: removed ? 'withdrawn' : 'published', reportHash: 'a'.repeat(64), publishedAt: 1000,
      ...(removed ? {} : { title: '<img src=x onerror=alert(1)>', author: '<script>bad()</script>', phase: 'NAB', report: { reviewStatus: 'UNREVIEWED', note: '<script>bad()</script>' } }) };
    window.fetch = async url => Response.json(url.endsWith('/public-log') ? { events: [], nextCursor: null } : url.endsWith('/publications') || url.endsWith('/history') ? { publications: [publication], nextCursor: null } : { publication });
    window.document.write(readFileSync(new URL('../audits.html', import.meta.url), 'utf8').replace(/<script[^>]*>.*?<\/script>/g, ''));
    window.eval(readFileSync(new URL('../js/community-public.js', import.meta.url), 'utf8')); await window.happyDOM.waitUntilComplete();
    const $ = id => window.document.getElementById(id);
    assert.equal($('public-list').querySelector('img'), null); assert.equal($('publication-json').querySelector('script'), null);
    assert.equal($('publication-export').hidden, removed); assert.equal($('report-form').hidden, removed);
    if (removed) assert.equal($('publication-json').textContent, ''); else assert.match($('publication-state').textContent, /UNREVIEWED/);
  }
});
