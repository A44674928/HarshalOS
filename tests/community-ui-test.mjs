import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
const html = readFileSync(new URL('../account.html', import.meta.url), 'utf8').replace(/<script[^>]*>.*?<\/script>/g, '');
const script = readFileSync(new URL('../js/community.js', import.meta.url), 'utf8');
const newsScript = readFileSync(new URL('../js/apps-news.js', import.meta.url), 'utf8');
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

test('Account UI: deletion is confirmed, sends only the loaded revision, and never invents authority', async t => {
  const run = { id: '22222222-2222-4222-8222-222222222222', revision: 1, phase: 'NAB', createdAt: 1000 };
  const f = await fixture(t, (url, options) => {
    if (url.endsWith('/me')) return Response.json({ user: { id: 'alice' } });
    if (options.method === 'DELETE') return Response.json({ deleted: true });
    if (/\/runs$/.test(url)) return Response.json({ runs: [run], nextCursor: null });
    if (url.endsWith('/drafts')) return Response.json({ drafts: [saved], nextCursor: null });
    return Response.json({ draft: saved });
  });
  const remove = scope => [...f.$(scope).querySelectorAll('button')].find(button => button.textContent === 'Delete');
  f.window.confirm = () => false;
  remove('drafts').click(); await f.flush();
  assert.equal(f.calls.some(call => call.options.method === 'DELETE'), false);
  f.window.confirm = () => true;
  remove('drafts').click(); await f.flush();
  const draftDelete = f.calls.find(call => call.options.method === 'DELETE');
  assert.equal(draftDelete.url, '/api/community/drafts/' + saved.id);
  assert.deepEqual(JSON.parse(draftDelete.options.body), { revision: 1 });
  assert.equal('ownerId' in JSON.parse(draftDelete.options.body), false);
  f.$('drafts').querySelector('button').click(); await f.flush();
  f.$('history').click(); await f.flush();
  remove('run-history').click(); await f.flush();
  const runDelete = f.calls.filter(call => call.options.method === 'DELETE').pop();
  assert.equal(runDelete.url, '/api/community/drafts/' + saved.id + '/runs/' + run.id);
  assert.deepEqual(JSON.parse(runDelete.options.body), {});
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
    assert.equal($('publication-export').hidden, removed); assert.equal($('publication-newsml-export').hidden, removed); assert.equal($('report-form').hidden, removed);
    assert.equal($('publication-newsml-export').getAttribute('href'), removed ? '#' : '/api/community/publications/pub-id/newsml');
    if (removed) assert.equal($('publication-json').textContent, ''); else assert.match($('publication-state').textContent, /UNREVIEWED/);
  }
});

async function newsFixture(t, handler) {
  const window = new Window({ url: 'https://os.example/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  t.after(() => window.happyDOM.abort());
  const calls = [];
  window.APPS = [];
  window.fetch = async (url, options = {}) => { calls.push({ url, options }); return handler(url, options); };
  window.document.body.innerHTML = '<div id="news-host"></div>';
  window.eval(newsScript);
  const app = window.APPS.find(candidate => candidate.id === 'news');
  assert.ok(app, 'News is registered as its own desktop application');
  app.render(window.document.getElementById('news-host'));
  await window.happyDOM.waitUntilComplete();
  return { window, app, calls, root: window.document.querySelector('.news-app'), $: selector => window.document.querySelector(selector), flush: () => window.happyDOM.waitUntilComplete() };
}

test('News app: reads only active public D1 reports and renders untrusted report content as text', async t => {
  const summary = {
    id: 'pub-id', seriesId: 'series-id', version: 2, state: 'published',
    reportHash: 'a'.repeat(64), publishedAt: 1790966400000,
    title: '<img src=x onerror=alert(1)>', author: '<script>bad()</script>', phase: 'NAB', reviewStatus: 'UNREVIEWED'
  };
  const publication = {
    ...summary,
    report: {
      schema: 'ground0-public-v1', reviewStatus: 'UNREVIEWED', platformCertification: 'NONE',
      author: summary.author, input: { name: summary.title },
      scope: { notes: 'Rules applied to author-submitted claims only.' },
      result: { phase: 'NAB', finding: '<svg onload=alert(1)>Unreviewed finding</svg>' }
    }
  };
  const f = await newsFixture(t, url => {
    if (url === '/api/community/publications') return Response.json({ publications: [summary], nextCursor: null });
    if (url === '/api/community/publications/pub-id') return Response.json({ publication });
    return Response.json({ error: 'Unexpected route.' }, { status: 404 });
  });

  assert.equal(f.app.title, 'News');
  assert.equal(f.$('#news-status').dataset.state, 'ready');
  assert.equal(f.$('#news-headline').textContent, summary.title);
  assert.equal(f.$('#news-finding').textContent, publication.report.result.finding);
  assert.equal(f.$('#news-headline').querySelector('img'), null);
  assert.equal(f.root.querySelector('img, script, svg'), null);
  assert.match(f.$('#news-json').textContent, /ground0-public-v1/);
  assert.match(f.$('#news-json').textContent, /<svg onload=alert\(1\)>/);
  assert.match(f.$('#news-kicker').textContent, /UNREVIEWED/);
  assert.equal(f.$('#news-newsml').hidden, false);
  assert.equal(f.$('#news-newsml').getAttribute('href'), '/api/community/publications/pub-id/newsml');
  assert.equal(f.$('#news-full-record').getAttribute('href'), '/audits?id=pub-id');
  assert.match(f.$('#news-feed').textContent, /<script>bad\(\)<\/script>/);
  assert.equal(f.$('#news-feed').querySelector('script'), null);
  assert.deepEqual(f.calls.map(call => call.url), ['/api/community/publications', '/api/community/publications/pub-id']);
  for (const call of f.calls) {
    assert.equal(call.options.credentials, 'same-origin');
    assert.equal(call.options.cache, 'no-store');
    assert.equal(call.url.includes('/drafts'), false);
    assert.equal(call.url.includes('/runs'), false);
    assert.equal(call.url.includes('/public-preview'), false);
  }
});

test('News app: disabled public register fails closed without substituting private workspace data', async t => {
  const f = await newsFixture(t, () => Response.json({ error: 'Community is disabled.' }, { status: 503 }));
  assert.equal(f.$('#news-status').dataset.state, 'error');
  assert.match(f.$('#news-status').textContent, /Public register unavailable/);
  assert.match(f.$('#news-feed').textContent, /No drafts, runs, or previews/);
  assert.match(f.$('#news-reader-empty').textContent, /may be disabled/);
  assert.equal(f.$('#news-newsml').hidden, true);
  assert.deepEqual(f.calls.map(call => call.url), ['/api/community/publications']);
});

test('News app: withdrawn report tombstone does not retain its cached story or export link', async t => {
  const summary = { id: 'pub-id', version: 1, state: 'published', publishedAt: 1790966400000, title: 'A published report', author: 'Public label', phase: 'NAB', reviewStatus: 'UNREVIEWED' };
  const f = await newsFixture(t, url => url === '/api/community/publications'
    ? Response.json({ publications: [summary], nextCursor: null })
    : Response.json({ publication: { id: 'pub-id', version: 1, state: 'withdrawn', publishedAt: summary.publishedAt, reportHash: 'b'.repeat(64) } }));
  assert.equal(f.$('#news-newsml').hidden, true);
  assert.equal(f.$('#news-json').textContent, '');
  assert.match(f.$('#news-reader-empty').textContent, /no longer active/);
  assert.doesNotMatch(f.$('#news-reader-empty').textContent, /A published report|Public label/);
  assert.doesNotMatch(f.$('#news-feed').textContent, /A published report|Public label/);
  assert.equal(f.$('#news-count').textContent, '0');
  assert.match(f.$('#news-status').textContent, /no longer active/);
});

test('News app: mismatched report envelope is refused instead of appearing reviewed or certified', async t => {
  const summary = { id: 'pub-id', version: 1, state: 'published', publishedAt: 1790966400000, title: 'Report', author: 'Public label', phase: 'NAB', reviewStatus: 'UNREVIEWED' };
  const publication = { ...summary, report: {
    schema: 'ground0-public-v1', reviewStatus: 'REVIEWED', platformCertification: 'CERTIFIED',
    author: summary.author, input: { name: summary.title }, result: { phase: summary.phase, finding: 'Must not be shown' }
  } };
  const f = await newsFixture(t, url => url === '/api/community/publications'
    ? Response.json({ publications: [summary], nextCursor: null })
    : Response.json({ publication }));
  assert.equal(f.$('#news-newsml').hidden, true);
  assert.equal(f.$('#news-json').textContent, '');
  assert.match(f.$('#news-reader-empty').textContent, /required UNREVIEWED record envelope/);
  assert.match(f.$('#news-status').textContent, /envelope check failed/);
  assert.doesNotMatch(f.root.textContent, /Must not be shown/);
});
