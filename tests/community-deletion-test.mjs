import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker/index.mjs';
import { auditTemplate } from '../worker/community-audit.mjs';
import { digest } from '../worker/community-auth.mjs';
import { createDraft, deleteDraft, deleteRun } from '../worker/community-db.mjs';
const origin = 'https://os.example';
const count = (sql, table, column, value) => sql.prepare(`SELECT count(*) n FROM ${table} WHERE ${column} = ?`).get(value).n;
async function fixture(t) {
  const sql = new DatabaseSync(':memory:'); t.after(() => sql.close()); sql.exec('PRAGMA foreign_keys=ON');
  for (const file of ['0001_private_drafts.sql', '0002_auth_sessions.sql', '0003_private_runs.sql', '0004_publication.sql']) {
    sql.exec(readFileSync(new URL('../migrations/community/' + file, import.meta.url), 'utf8'));
  }
  const db = {
    prepare(text) {
      let args = [];
      const q = { bind(...a) { args = a; return q; }, exec() { return sql.prepare(text).run(...args); },
        async run() { return q.exec(); }, async first() { return sql.prepare(text).get(...args) ?? null; },
        async all() { return { results: sql.prepare(text).all(...args) }; } };
      return q;
    },
    async batch(statements) { sql.exec('BEGIN'); try { const results = statements.map(q => q.exec()); sql.exec('COMMIT'); return results; } catch (error) { sql.exec('ROLLBACK'); throw error; } }
  };
  const now = Math.floor(Date.now() / 1000);
  for (const id of ['alice', 'bob', 'moderator']) {
    sql.prepare('INSERT INTO community_users VALUES (?, ?, ?, 0, ?)').run(id, 'https://issuer.example/', id, now * 1000);
    sql.prepare('INSERT INTO community_sessions VALUES (?, ?, ?, ?, ?, ?)').run(await digest(id[0].repeat(43)), id, 'https://issuer.example/', 'client', now, now + 86400);
  }
  const env = { COMMUNITY_ENABLED: 'true', COMMUNITY_DB: db, COMMUNITY_ORIGIN: origin, OIDC_ISSUER: 'https://issuer.example/',
    OIDC_CLIENT_ID: 'client', OIDC_CLIENT_SECRET: 'secret', COMMUNITY_RATE_SECRET: 'r'.repeat(64), OIDC_ADMIN_SUBJECTS: 'moderator' };
  async function call(path, { method = 'GET', user = 'alice', data, requestOrigin = origin } = {}) {
    const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' };
    if (user) headers.Cookie = '__Host-hos_session=' + user[0].repeat(43);
    if (requestOrigin) headers.Origin = requestOrigin;
    return worker.fetch(new Request(origin + '/api/community/' + path, { method, headers, body: data ? JSON.stringify(data) : undefined }), env);
  }
  async function saved(title = 'Private draft') {
    const input = auditTemplate(); input.name = 'Example'; input.cutoff = '2026-10-02';
    const draft = (await (await call('drafts', { method: 'POST', data: { title, input, privateNotes: 'PRIVATE_NOTES' } })).json()).draft;
    const run = (await (await call(`drafts/${draft.id}/runs`, { method: 'POST', data: { revision: 1 } })).json()).run;
    return { draft, run, input };
  }
  async function publish(subject) {
    const preview = await (await call('public-preview', { method: 'POST', data: { runId: subject.run.id, input: subject.input, author: 'Public pseudonym' } })).json();
    const response = await call('publish', { method: 'POST', data: { token: preview.token, acknowledgement: 'PUBLISH_PUBLIC_UNREVIEWED' } });
    assert.equal(response.status, 201, await response.clone().text());
    return (await response.json()).publication;
  }
  return { sql, db, env, call, saved, publish };
}
test('Deletion: a draft, its runs, previews and orphan series are removed transactionally', async t => {
  const f = await fixture(t), keep = await f.saved('Keep'), remove = await f.saved('Remove');
  assert.equal((await f.call('public-preview', { method: 'POST', data: { runId: remove.run.id, input: remove.input, author: 'Never published' } })).status, 200);
  assert.equal(count(f.sql, 'community_public_series', 'draft_id', remove.draft.id), 1);
  const response = await f.call('drafts/' + remove.draft.id, { method: 'DELETE', data: { revision: 1 } });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { deleted: true });
  assert.equal(count(f.sql, 'community_drafts', 'id', remove.draft.id), 0);
  assert.equal(count(f.sql, 'community_runs', 'draft_id', remove.draft.id), 0);
  assert.equal(count(f.sql, 'community_previews', 'draft_id', remove.draft.id), 0);
  assert.equal(count(f.sql, 'community_public_series', 'draft_id', remove.draft.id), 0);
  assert.equal((await f.call('drafts/' + remove.draft.id)).status, 404);
  assert.equal(count(f.sql, 'community_drafts', 'id', keep.draft.id), 1);
  assert.equal(count(f.sql, 'community_runs', 'draft_id', keep.draft.id), 1);
  assert.equal((await (await f.call('drafts')).json()).drafts.length, 1);
});
test('Deletion: a published draft or run is refused and public history survives unchanged', async t => {
  const f = await fixture(t), subject = await f.saved(), publication = await f.publish(subject);
  const draftRefusal = await f.call('drafts/' + subject.draft.id, { method: 'DELETE', data: { revision: 1 } });
  assert.equal(draftRefusal.status, 409); assert.match((await draftRefusal.json()).error, /withdraw/i);
  const runRefusal = await f.call(`drafts/${subject.draft.id}/runs/${subject.run.id}`, { method: 'DELETE', data: {} });
  assert.equal(runRefusal.status, 409); assert.match((await runRefusal.json()).error, /withdraw/i);
  assert.equal(count(f.sql, 'community_drafts', 'id', subject.draft.id), 1);
  assert.equal(count(f.sql, 'community_runs', 'id', subject.run.id), 1);
  const detail = await (await f.call('publications/' + publication.id, { user: null })).json();
  assert.equal(detail.publication.reportHash, publication.reportHash); assert.equal(detail.publication.state, 'published');
  assert.equal(count(f.sql, 'community_public_events', 'publication_id', publication.id), 1);
});
test('Deletion: stale revisions, extra fields, cross-owner and cross-origin requests change nothing', async t => {
  const f = await fixture(t), subject = await f.saved();
  assert.equal((await f.call('drafts/' + subject.draft.id, { method: 'DELETE', data: { revision: 2 } })).status, 409);
  assert.equal((await f.call('drafts/' + subject.draft.id, { method: 'DELETE', data: { revision: 1, title: 'sneak' } })).status, 400);
  assert.equal((await f.call('drafts/' + subject.draft.id, { method: 'DELETE', data: { revision: '1' } })).status, 400);
  assert.equal((await f.call('drafts/' + subject.draft.id, { method: 'DELETE', user: 'bob', data: { revision: 1 } })).status, 409);
  assert.equal((await f.call('drafts/' + subject.draft.id, { method: 'DELETE', user: null, data: { revision: 1 } })).status, 401);
  assert.equal((await f.call('drafts/' + subject.draft.id, { method: 'DELETE', requestOrigin: 'https://evil.example', data: { revision: 1 } })).status, 403);
  assert.equal((await f.call('drafts', { method: 'DELETE', data: { revision: 1 } })).status, 405);
  assert.equal(count(f.sql, 'community_drafts', 'id', subject.draft.id), 1);
  assert.equal(count(f.sql, 'community_runs', 'draft_id', subject.draft.id), 1);
  f.sql.exec("UPDATE community_users SET blocked = 1 WHERE id = 'alice'");
  assert.equal((await f.call('drafts/' + subject.draft.id, { method: 'DELETE', data: { revision: 1 } })).status, 401);
  assert.equal(count(f.sql, 'community_drafts', 'id', subject.draft.id), 1);
});
test('Deletion: a private run is deleted by id with an empty body; unknown owners fail closed', async t => {
  const f = await fixture(t), subject = await f.saved(), other = await f.saved('Other');
  assert.equal((await f.call(`drafts/${subject.draft.id}/runs/${subject.run.id}`, { method: 'DELETE', data: { junk: true } })).status, 400);
  assert.equal((await f.call(`drafts/${subject.draft.id}/runs/${subject.run.id}`, { method: 'DELETE', data: { revision: 1 } })).status, 400);
  // An unexpired preview is a regenerable candidate, not published history: deleting the run discards it.
  assert.equal((await f.call('public-preview', { method: 'POST', data: { runId: subject.run.id, input: subject.input, author: 'Candidate' } })).status, 200);
  const removed = await f.call(`drafts/${subject.draft.id}/runs/${subject.run.id}`, { method: 'DELETE', data: {} });
  assert.equal(removed.status, 200); assert.deepEqual(await removed.json(), { deleted: true });
  assert.equal((await f.call(`drafts/${subject.draft.id}/runs/${subject.run.id}`)).status, 404);
  assert.equal((await (await f.call(`drafts/${subject.draft.id}/runs`)).json()).runs.length, 0);
  assert.equal(count(f.sql, 'community_previews', 'run_id', subject.run.id), 0);
  assert.equal(count(f.sql, 'community_runs', 'draft_id', other.draft.id), 1);
  assert.equal((await f.call(`drafts/${other.draft.id}/runs/${subject.run.id}`, { method: 'DELETE', data: {} })).status, 404);
  assert.equal((await f.call(`drafts/${subject.draft.id}/runs/${subject.run.id}`, { method: 'DELETE', user: 'bob', data: {} })).status, 404);
  assert.equal((await f.call(`drafts/${other.draft.id}/runs/${other.run.id}`, { method: 'DELETE', data: { revision: 1 } })).status, 400);
  assert.equal(count(f.sql, 'community_runs', 'id', other.run.id), 1);
});
test('Deletion: database helpers enforce the same ownership and publication guards', async t => {
  const f = await fixture(t), subject = await f.saved('Guarded');
  await assert.rejects(deleteDraft(f.db, 'bob', subject.draft.id, 1), error => error.status === 409);
  await assert.rejects(deleteDraft(f.db, 'alice', subject.draft.id, 1_000), error => error.status === 409);
  await assert.rejects(deleteDraft(f.db, 'alice', subject.draft.id, 0), error => error.status === 400);
  await assert.rejects(deleteRun(f.db, 'alice', subject.draft.id, 'not-a-run'), error => error.status === 404);
  const publication = await f.publish(subject);
  await assert.rejects(deleteDraft(f.db, 'alice', subject.draft.id, 1), error => error.status === 409 && /withdraw/i.test(error.message));
  await assert.rejects(deleteRun(f.db, 'alice', subject.draft.id, subject.run.id), error => error.status === 409 && /withdraw/i.test(error.message));
  assert.throws(() => f.sql.exec(`DELETE FROM community_publications WHERE id = '${publication.id}'`), /tombstone/);
  assert.equal(count(f.sql, 'community_publications', 'id', publication.id), 1);
});
test('Deletion: deleting a private draft releases the account draft quota', async t => {
  const f = await fixture(t), value = { title: 'Quota', input: { entity: 'Example' }, privateNotes: '' };
  const first = await createDraft(f.db, 'alice', value);
  for (let n = 1; n < 100; n++) await createDraft(f.db, 'alice', value);
  await assert.rejects(createDraft(f.db, 'alice', value), error => error.status === 403);
  assert.deepEqual(await deleteDraft(f.db, 'alice', first.id, 1), { deleted: true });
  assert.equal((await createDraft(f.db, 'alice', value)).revision, 1);
});
