import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { auditTemplate, evaluateSavedInput, normalizeRunInput, sha256 } from '../worker/community-audit.mjs';
import { ENGINE_SHA256, EVALUATOR_SHA256 } from '../worker/community-engine-version.mjs';
import { digest } from '../worker/community-auth.mjs';
import worker from '../worker/index.mjs';
const engineSource = readFileSync(new URL('../js/g0-engine.js', import.meta.url));
function input(version = '1.0', vector = [false, true, false, true, false]) {
  const value = auditTemplate(version); value.name = 'Example'; value.identifier = 'ENTITY-001'; value.cutoff = version === '1.1' ? globalThis.G0.makeUtsCutoff('2026-10-02T23:59:59.999Z') : '2026-10-02';
  value.answers = vector.map(value => ({ value, source: 'https://example.com/policy', date: '2026-09-01', notes: 'An author-submitted policy claim.', gap: '' }));
  value.constraints = Array.from({ length: 4 }, () => ({ value: false, source: '', date: '', notes: '', gap: 'Not demonstrated by the submitted evidence.' }));
  Object.assign(value.b4, { actor: 'Example', action: 'Decision', procedure: 'Appeal', basis: 'TERMINAL_RULE' });
  return value;
}
function completeC2() {
  return {
    publishedRoute: { sourceId: 'route', criteria: 'Appeals are filed through the published review portal.' },
    invocation: { sourceId: 'invocation', criteria: 'The cited request meets the published filing criteria.' },
    outcomeSet: {
      sourceIds: ['set'], complete: true, periodStart: '2026-01-01', periodEnd: '2026-09-30', numerator: '1', denominator: '2',
      outcomes: [
        { caseId: 'case-1', outcome: 'RELIEF', date: '2026-08-01', sourceIds: ['outcome-1'] },
        { caseId: 'case-2', outcome: 'NO_RELIEF', date: '2026-09-01', sourceIds: ['outcome-2'] }
      ]
    },
    sources: [
      { id: 'route', role: 'ROUTE', url: 'https://example.com/appeals', date: '2026-06-01', locator: 'Appeals section', claim: 'Published appeals route and criteria.' },
      { id: 'invocation', role: 'INVOCATION', url: 'https://example.com/filing', date: '2026-06-02', locator: 'Filing record', claim: 'The filing record meets the stated criteria.' },
      { id: 'set', role: 'OUTCOME_SET', url: 'https://example.com/report', date: '2026-09-30', locator: 'Table 2, all cases', claim: 'Complete resolved appeal outcome set.' },
      { id: 'outcome-1', role: 'OUTCOME', url: 'https://example.com/case-1', date: '2026-08-01', locator: 'Case 1 disposition', claim: 'Case 1 was reversed and relief granted.' },
      { id: 'outcome-2', role: 'OUTCOME', url: 'https://example.com/case-2', date: '2026-09-01', locator: 'Case 2 disposition', claim: 'Case 2 appeal was denied without relief.' }
    ]
  };
}
test('Runs: source fingerprints pin the shared engine and evaluation adapter', () => {
  const adapter = readFileSync(new URL('../worker/community-audit.mjs', import.meta.url));
  assert.equal(ENGINE_SHA256, createHash('sha256').update(engineSource).digest('hex'));
  assert.equal(EVALUATOR_SHA256, createHash('sha256').update(engineSource).update('\0').update(adapter).digest('hex'));
});
test('Runs: v1.1 input is versioned, timestamped, and provenance-validated on the Worker', async () => {
  const v10 = auditTemplate('1.0');
  assert.equal(typeof v10.cutoff, 'string');
  assert.equal(Object.hasOwn(v10, 'inputSchema'), false);
  const v11 = auditTemplate('1.1');
  assert.equal(v11.version, '1.1');
  assert.equal(v11.inputSchema, globalThis.G0.G0_INPUT_SCHEMA_V11);
  assert.equal(globalThis.G0.isUtsCutoff(v11.cutoff), true);
  assert.equal(normalizeRunInput(input('1.1')).version, '1.1');

  const dateOnly = input('1.1'); dateOnly.cutoff = '2026-10-02';
  assert.throws(() => normalizeRunInput(dateOnly), error => error.status === 422 && /valid UTC timestamp/.test(error.message));
  const missingFlag = input('1.1'); delete missingFlag.b4.terminatesAction;
  assert.throws(() => normalizeRunInput(missingFlag), error => error.status === 422 && /B4/.test(error.message));
  const incompleteC2 = input('1.1');
  incompleteC2.constraints[1] = { value: true, source: 'https://example.com/appeals', date: '2026-09-01', notes: 'A published appeal route.', gap: '' };
  assert.throws(() => normalizeRunInput(incompleteC2), error => error.status === 422 && /C2 conformance failed/.test(error.message));

  const complete = input('1.1');
  complete.constraints[1] = { value: true, source: 'https://example.com/report', date: '2026-09-30', notes: 'The published complete outcome set demonstrates at least fifty percent relief.', gap: '' };
  complete.c2 = completeC2();
  assert.doesNotThrow(() => normalizeRunInput(complete));
  const evaluated = await evaluateSavedInput(complete);
  assert.equal(evaluated.report.engine.specificationStatus, 'NORMATIVE AMENDMENT');
  assert.equal(evaluated.report.input.version, '1.1');
  assert.equal(evaluated.report.input.constraints[1].value, true);
});
test('Runs: Worker/browser parity across all 32 vectors in both supported versions', async () => {
  const context = vm.createContext({ window: { crypto: webcrypto }, crypto: webcrypto, URL, TextEncoder, TextDecoder, atob, btoa });
  vm.runInContext(engineSource.toString(), context);
  for (const version of ['1.0', '1.1']) for (let bits = 0; bits < 32; bits++) {
    const raw = input(version, Array.from({ length: 5 }, (_, i) => !!(bits & (1 << i))));
    const browser = await context.window.G0.createAudit(context.window.G0.normalizeAuditInput(raw, version), []);
    const { report } = await evaluateSavedInput(raw);
    for (const key of ['phase', 'confidence', 'compliance', 'severity', 'finding']) assert.equal(report.result[key], browser[key]);
    assert.equal(report.result.computedBadge, browser.badge); assert.equal(report.result.recordStatus, browser.status);
    assert.equal(report.engine.version, version);
  }
});
test('Runs: deterministic report hashes, no fetch, no client results, no private provider traces', async () => {
  const raw = input('1.1'); raw.report = { phase: 'FAKE_VERIFIED' };
  raw.automation = { method: 'llm-reading', reviewRequired: true, provider: 'SECRET_PROVIDER', llm: { note: 'SECRET_TRACE' }, sources: [{ url: 'https://example.com/policy', kind: 'official', dateBasis: 'publication', scoringEligible: true, published: '2026-09-01', retrieved: '2026-10-02T00:00:00Z', text: 'SECRET_BODY'.repeat(10), excerpt: 'Submitted excerpt' }] };
  const oldFetch = globalThis.fetch; let calls = 0; globalThis.fetch = () => { calls++; throw new Error('Network not allowed'); };
  try {
    const first = await evaluateSavedInput(raw), second = await evaluateSavedInput(raw);
    assert.equal(first.reportHash, second.reportHash); assert.equal(first.reportHash, await sha256(first.report));
    assert.equal(first.report.platformCertification, 'NONE'); assert.equal(first.report.reviewStatus, 'UNREVIEWED');
    assert.equal(first.report.result.computedBadge, 'Unissued'); assert.equal(first.report.result.automationReviewRequired, true);
    for (const text of ['SECRET_PROVIDER', 'SECRET_TRACE', 'SECRET_BODY', 'FAKE_VERIFIED']) assert.ok(!first.json.includes(text));
    assert.equal(first.report.input.automation.sources[0].scoringEligible, true); assert.equal(calls, 0);
    /* The removed reading method is not recognized any more, and its block is dropped. */
    assert.equal(normalizeRunInput(raw).automation.method, 'public-lookup');
    assert.equal(normalizeRunInput(raw).automation.llm, undefined);
    raw.automation.sources[0].kind = 'news';
    assert.ok((await evaluateSavedInput(raw)).report.result.activatorVector.every(x => x.Scored_Answer === 'NO'));
  } finally { globalThis.fetch = oldFetch; }
});
test('Runs: invalid cutoff/version/types cannot be silently defaulted; unknowns stay unknown', async () => {
  for (const patch of [{ cutoff: '2026-02-30' }, { cutoff: undefined }, { version: '2.0' }, { name: '' }, { answers: [] }, { automation: true }, { b4: { complete: 'true' } }]) {
    await assert.rejects(evaluateSavedInput({ ...input(), ...patch }), e => e.status === 422);
  }
  const unknown = input(); unknown.answers[0].value = null;
  assert.equal(normalizeRunInput(unknown).answers[0].value, null);
  assert.equal((await evaluateSavedInput(unknown)).report.result.confidence, 'NONE');
});
test('Runs: a cryptographically valid supplied PDH is not independent identity verification', async () => {
  const raw = input();
  const header = JSON.parse(globalThis.G0.headerExample);
  header['Header-ID'] = 'PDH-2026-10-02-00001'; header['Effective-Timestamp'] = '2026-10-02T00:00:00Z';
  const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const payload = JSON.stringify(Object.fromEntries(Object.keys(header).filter(k => k !== 'Declaration-Hash').sort().map(k => [k, header[k]])));
  header['Declaration-Hash'] = Buffer.from(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, new TextEncoder().encode(payload))).toString('base64url');
  raw.headerText = JSON.stringify(header); raw.publicKeyText = JSON.stringify(await crypto.subtle.exportKey('jwk', keys.publicKey));
  const { report } = await evaluateSavedInput(raw);
  assert.equal(report.result.pdh.status, 'VALID'); assert.equal(report.result.computedBadge, 'Confirmed');
  assert.equal(report.scope.independentIdentityVerification, false); assert.equal(report.scope.temporalHistoryEvaluated, false);
  assert.equal(report.platformCertification, 'NONE');
});

const origin = 'https://os.example';
async function fixture(t) {
  const sql = new DatabaseSync(':memory:'); t.after(() => sql.close()); sql.exec('PRAGMA foreign_keys=ON');
  for (const name of ['0001_private_drafts.sql', '0002_auth_sessions.sql', '0003_private_runs.sql']) sql.exec(readFileSync(new URL('../migrations/community/' + name, import.meta.url), 'utf8'));
  let beforeInsert;
  const db = { prepare(text) {
    if (text.startsWith('INSERT INTO community_runs') && beforeInsert) { const fn = beforeInsert; beforeInsert = null; fn(); }
    let args = []; const q = { bind(...a) { args = a; return q; }, async first() { return sql.prepare(text).get(...args) ?? null; }, async run() { return sql.prepare(text).run(...args); }, async all() { return { results: sql.prepare(text).all(...args) }; } }; return q;
  } };
  const now = Math.floor(Date.now() / 1000);
  for (const id of ['alice', 'bob']) {
    sql.prepare('INSERT INTO community_users VALUES (?, ?, ?, 0, ?)').run(id, 'https://issuer.example/', id, now * 1000);
    sql.prepare('INSERT INTO community_sessions VALUES (?, ?, ?, ?, ?, ?)').run(await digest(id[0].repeat(43)), id, 'https://issuer.example/', 'client', now, now + 86400);
  }
  const env = { COMMUNITY_ENABLED: 'true', COMMUNITY_DB: db, COMMUNITY_ORIGIN: origin, OIDC_ISSUER: 'https://issuer.example/', OIDC_CLIENT_ID: 'client', OIDC_CLIENT_SECRET: 'secret', COMMUNITY_RATE_SECRET: 'r'.repeat(64) };
  async function call(path, { method = 'GET', user = 'alice', data, raw, requestOrigin = origin } = {}) {
    const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' };
    if (user) headers.Cookie = '__Host-hos_session=' + user[0].repeat(43);
    if (requestOrigin) headers.Origin = requestOrigin;
    return worker.fetch(new Request(origin + '/api/community/' + path, { method, headers, body: raw ?? (data ? JSON.stringify(data) : undefined) }), env);
  }
  const created = await call('drafts', { method: 'POST', data: { title: 'Private title', input: input(), privateNotes: 'NEVER_COPY_NOTES' } });
  const draft = (await created.json()).draft;
  return { sql, env, call, draft, beforeInsert: fn => { beforeInsert = fn; } };
}
test('Run HTTP: stored-revision execution, ownership, idempotency and immutable history', async t => {
  const f = await fixture(t), path = `drafts/${f.draft.id}/runs`;
  const response = await f.call(path, { method: 'POST', data: { revision: 1 } }); assert.equal(response.status, 201);
  const { run } = await response.json(); assert.equal(run.report.result.phase, 'NAB'); assert.equal(run.revision, 1);
  assert.ok(!JSON.stringify(run).includes('NEVER_COPY_NOTES'));
  assert.equal((await (await f.call(path, { method: 'POST', data: { revision: 1 } })).json()).run.id, run.id);
  assert.equal((await f.call(path, { user: 'bob' })).status, 404);
  assert.equal((await f.call(path + '/' + run.id, { user: 'bob' })).status, 404);
  assert.equal((await f.call(path, { method: 'POST', user: 'bob', data: { revision: 1 } })).status, 404);
  assert.throws(() => f.sql.exec("UPDATE community_runs SET phase = 'GSRB'"), /immutable/);
  const edited = await f.call('drafts/' + f.draft.id, { method: 'PUT', data: { title: 'Changed', input: input('1.1'), revision: 1 } }); assert.equal(edited.status, 200);
  assert.equal((await f.call(path, { method: 'POST', data: { revision: 1 } })).status, 409);
  assert.equal((await (await f.call(path + '/' + run.id)).json()).run.report.engine.version, '1.0');
  const next = await f.call(path, { method: 'POST', data: { revision: 2 } }); assert.equal(next.status, 201);
  const history = await (await f.call(path)).json(); assert.equal(history.runs.length, 2);
  assert.equal(history.runs[0].revision, 2); assert.equal('report' in history.runs[0], false);
});
test('Run HTTP: replay races produce one record; stale revision and block races save nothing', async t => {
  const f = await fixture(t), path = `drafts/${f.draft.id}/runs`;
  const responses = await Promise.all([f.call(path, { method: 'POST', data: { revision: 1 } }), f.call(path, { method: 'POST', data: { revision: 1 } })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 201]);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_runs').get().n, 1);
  for (const block of [false, true]) await t.test(block ? 'blocked during execution' : 'edited during execution', async t => {
    const f = await fixture(t);
    f.beforeInsert(() => f.sql.exec(block ? "UPDATE community_users SET blocked=1 WHERE id='alice'" : 'UPDATE community_drafts SET revision=revision+1'));
    assert.equal((await f.call(`drafts/${f.draft.id}/runs`, { method: 'POST', data: { revision: 1 } })).status, 409);
    assert.equal(f.sql.prepare('SELECT count(*) n FROM community_runs').get().n, 0);
  });
});
test('Run HTTP: authenticated template and closed/malformed/forged requests', async t => {
  const f = await fixture(t), path = `drafts/${f.draft.id}/runs`;
  const template = await (await f.call('audit-template')).json(); assert.equal(template.input.version, '1.0'); assert.equal(template.input.answers.length, 5);
  assert.equal((await f.call('audit-template', { user: null })).status, 401);
  assert.equal((await f.call(path, { user: null })).status, 401);
  assert.equal((await f.call(path, { method: 'POST', requestOrigin: 'https://evil.example', data: { revision: 1 } })).status, 403);
  for (const data of [{ revision: 1, input: { name: 'forged' } }, { revision: 1, result: { phase: 'VERIFIED' } }, { revision: '1' }]) assert.equal((await f.call(path, { method: 'POST', data })).status, 400);
  assert.equal((await f.call(path, { method: 'POST', raw: 'x'.repeat(1025) })).status, 413);
  assert.equal((await f.call(path, { method: 'DELETE' })).status, 405);
  f.sql.exec("DELETE FROM community_schema WHERE component='private-runs'");
  assert.equal((await f.call(path, { method: 'POST', data: { revision: 1 } })).status, 503);
  f.env.COMMUNITY_ENABLED = 'false'; assert.equal((await f.call('audit-template')).status, 503);
  assert.equal((await f.call('publications', { method: 'POST', data: {} })).status, 503);
});
test('Run HTTP: history pagination and per-account 200-record cap', async t => {
  const f = await fixture(t), path = `drafts/${f.draft.id}/runs`;
  const seed = f.sql.prepare(`INSERT INTO community_runs(id,draft_id,owner_id,revision,engine_hash,evaluator_hash,report_hash,phase,report_json,created_at) VALUES (?,?,'alice',1,?,?,?,'NAB',?,1)`);
  const report = await evaluateSavedInput(input());
  for (let i = 0; i < 200; i++) seed.run(crypto.randomUUID(), f.draft.id, ENGINE_SHA256, i.toString(16).padStart(64, '0'), report.reportHash, report.json);
  const page = await (await f.call(path)).json(); assert.equal(page.runs.length, 25); assert.ok(page.nextCursor);
  const next = await (await f.call(path + '?after=' + page.nextCursor)).json(); assert.equal(next.runs.length, 25);
  assert.equal(new Set([...page.runs, ...next.runs].map(r => r.id)).size, 50);
  assert.equal((await f.call(path, { method: 'POST', data: { revision: 1 } })).status, 409);
});

test('Run HTTP: 20 new attempts per account/day, failed validations included', async t => {
  const f = await fixture(t), path = `drafts/${f.draft.id}/runs`;
  await f.call('drafts/' + f.draft.id, { method: 'PUT', data: { title: 'Invalid input', input: {}, revision: 1 } });
  for (let i = 0; i < 20; i++) assert.equal((await f.call(path, { method: 'POST', data: { revision: 2 } })).status, 422);
  assert.equal((await f.call(path, { method: 'POST', data: { revision: 2 } })).status, 429);
  assert.equal(f.sql.prepare('SELECT count(*) n FROM community_runs').get().n, 0);
});
