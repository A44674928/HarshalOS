import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const html = readFileSync(new URL('../observations.html', import.meta.url), 'utf8').replace(/<script[^>]*>.*?<\/script>/g, '');
const script = readFileSync(new URL('../js/community-observations.js', import.meta.url), 'utf8');
const observation = {
  id: '11111111-1111-4111-8111-111111111111',
  state: 'published',
  author: '<img src=x onerror=alert(1)>',
  phase: 'CWO',
  text: '<script>bad()</script> bounded public note',
  contentHash: 'a'.repeat(64),
  publishedAt: 1_790_000_000_000,
  changedAt: 1_790_000_000_000,
  reviewStatus: 'UNREVIEWED',
  schema: 'harshalos-public-observation-v1'
};

async function fixture(t, handler) {
  const window = new Window({ url: 'https://os.example/observations', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  t.after(() => window.happyDOM.abort());
  const calls = [];
  window.confirm = () => true;
  window.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return handler(url, options);
  };
  window.document.write(html);
  window.eval(script);
  await window.happyDOM.waitUntilComplete();
  return { window, calls, $: id => window.document.getElementById(id), flush: () => window.happyDOM.waitUntilComplete() };
}

test('Public observations UI renders public values as text and exposes no private-origin fields', async t => {
  const f = await fixture(t, url => {
    if (url.endsWith('/observations')) return Response.json({ observations: [observation], nextCursor: null });
    if (url.endsWith('/me')) return Response.json({ user: { id: 'alice' } });
    if (url.endsWith('/observation-profile')) return Response.json({ profile: { pseudonym: 'Profile', updatedAt: 1 } });
    if (url.endsWith('/my-observations')) return Response.json({ observations: [], nextCursor: null });
    return Response.json({ error: 'Unexpected route' }, { status: 404 });
  });
  assert.equal(f.$('observation-feed').querySelector('img, script'), null);
  assert.match(f.$('observation-feed').textContent, /<script>bad\(\)<\/script>/);
  assert.match(f.$('observation-feed').textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(script.includes('innerHTML'), false);
  assert.equal(html.includes('universe-core'), true);
  assert.equal(html.includes('declaration label'), true);
  assert.equal(f.$('publisher-workspace').hidden, false);
});

test('Public observations UI sends a profile, one-time code, and publication acknowledgement only through explicit actions', async t => {
  const candidate = {
    id: '22222222-2222-4222-8222-222222222222',
    phase: 'NAB',
    text: '<img src=x onerror=alert(1)> exact candidate',
    suggestedPseudonym: 'Suggested label',
    expiresAt: Date.now() + 60_000,
    profile: { pseudonym: null, updatedAt: null }
  };
  const f = await fixture(t, (url, options) => {
    if (url.endsWith('/observations')) return Response.json({ observations: [], nextCursor: null });
    if (url.endsWith('/me')) return Response.json({ user: { id: 'alice' } });
    if (url.endsWith('/observation-profile') && (!options.method || options.method === 'GET')) return Response.json({ profile: { pseudonym: null, updatedAt: null } });
    if (url.endsWith('/observation-profile') && options.method === 'PUT') return Response.json({ profile: { pseudonym: 'Public Profile', updatedAt: Date.now() } });
    if (url.endsWith('/my-observations')) return Response.json({ observations: [], nextCursor: null });
    if (url.endsWith('/observation-handoffs/claim')) return Response.json({ handoff: candidate });
    if (url.endsWith('/observation-handoffs/' + candidate.id + '/publish')) return Response.json({ observation });
    return Response.json({ error: 'Unexpected route' }, { status: 404 });
  });

  f.$('profile-pseudonym').value = 'Public Profile';
  f.$('save-profile').click();
  await f.flush();
  const profileCall = f.calls.find(call => call.url.endsWith('/observation-profile') && call.options.method === 'PUT');
  assert.deepEqual(JSON.parse(profileCall.options.body), { pseudonym: 'Public Profile' });

  f.$('claim-code').value = 'ABCD-EFGH-JKLM-NPQR';
  f.$('claim-observation').click();
  await f.flush();
  const claimCall = f.calls.find(call => call.url.endsWith('/observation-handoffs/claim'));
  assert.deepEqual(JSON.parse(claimCall.options.body), { claimCode: 'ABCD-EFGH-JKLM-NPQR' });
  assert.equal(f.$('claimed-text').querySelector('img, script'), null);
  assert.match(f.$('claimed-text').textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(f.$('publish-observation').disabled, true);

  f.$('publish-consent').checked = true;
  f.$('publish-consent').dispatchEvent(new f.window.Event('change'));
  assert.equal(f.$('publish-observation').disabled, false);
  f.$('publish-observation').click();
  await f.flush();
  const publishCall = f.calls.find(call => call.url.endsWith('/observation-handoffs/' + candidate.id + '/publish'));
  assert.deepEqual(JSON.parse(publishCall.options.body), { acknowledgement: 'PUBLISH_PUBLIC_OBSERVATION' });
  assert.equal(JSON.stringify(publishCall.options.body).includes('text'), false);
});
