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
