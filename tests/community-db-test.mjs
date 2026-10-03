import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { checkCommunitySchema, createDraft, getDraft, updateDraft } from '../worker/community-db.mjs';
import worker from '../worker/index.mjs';
const migration = readFileSync(new URL('../migrations/community/0001_private_drafts.sql', import.meta.url), 'utf8');
const draft = { title: 'Private example', input: { entity: 'Example', ownerId: 'not-authority' }, privateNotes: 'Not for publication' };
const status = code => error => error.status === code;
function fixture(t) {
  const sql = new DatabaseSync(':memory:');
  t.after(() => sql.close());
  sql.exec('PRAGMA foreign_keys = ON'); sql.exec(migration);
  const insert = sql.prepare('INSERT INTO community_users VALUES (?, ?, ?, 0, 1)');
  for (const id of ['alice', 'bob']) insert.run(id, 'https://issuer.example/', id);
  const db = { prepare(text) {
    let params = [];
    const statement = { bind(...args) { params = args; return statement; }, async first() { return sql.prepare(text).get(...params) ?? null; } };
    return statement;
  } };
  return { sql, db };
}
test('D1: schema and issuer-scoped identity uniqueness', async t => {
  const { sql, db } = fixture(t);
  assert.deepEqual(await checkCommunitySchema(db), { component: 'private-drafts', version: 1 });
  const insert = sql.prepare('INSERT INTO community_users VALUES (?, ?, ?, 0, 1)');
  assert.throws(() => insert.run('duplicate', 'https://issuer.example/', 'alice'), /UNIQUE/);
  insert.run('another-issuer', 'https://other.example/', 'alice');
});
test('D1: private reads and writes use server-supplied ownership', async t => {
  const { db } = fixture(t);
  const saved = await createDraft(db, 'alice', draft, 10);
  assert.equal(saved.revision, 1);
  assert.deepEqual((await getDraft(db, 'alice', saved.id)).input, draft.input);
  assert.equal(saved.privateNotes, draft.privateNotes);
  assert.equal('owner_id' in saved, false);
  await assert.rejects(getDraft(db, 'bob', saved.id), status(404));
  await assert.rejects(getDraft(db, 'bob', 'missing'), status(404));
  await assert.rejects(updateDraft(db, 'bob', saved.id, 1, draft), status(409));
  assert.equal((await getDraft(db, 'alice', saved.id)).revision, 1);
  await assert.rejects(createDraft(db, '', draft), status(401));
});
test('D1: competing saves reject a stale revision without overwriting', async t => {
  const { db } = fixture(t);
  const saved = await createDraft(db, 'alice', draft, 10);
  const results = await Promise.allSettled([
    updateDraft(db, 'alice', saved.id, 1, { ...draft, title: 'First' }, 11),
    updateDraft(db, 'alice', saved.id, 1, { ...draft, title: 'Second' }, 12)
  ]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(results.find(x => x.status === 'rejected').reason.status, 409);
  const current = await getDraft(db, 'alice', saved.id);
  assert.equal(current.revision, 2);
  assert.equal((await updateDraft(db, 'alice', saved.id, 2, draft, 1)).updatedAt, current.updatedAt);
  await assert.rejects(updateDraft(db, 'alice', saved.id, 0, draft), status(400));
});
test('D1: blocked accounts cannot read or write', async t => {
  const { sql, db } = fixture(t);
  const saved = await createDraft(db, 'alice', draft);
  sql.exec("UPDATE community_users SET blocked = 1 WHERE id = 'alice'");
  await assert.rejects(getDraft(db, 'alice', saved.id), status(404));
  await assert.rejects(createDraft(db, 'alice', draft), status(403));
  await assert.rejects(updateDraft(db, 'alice', saved.id, 1, draft), status(409));
});
test('D1: account existence and per-account quota are enforced within INSERT', async t => {
  const { db } = fixture(t);
  await assert.rejects(createDraft(db, 'unknown', draft), status(403));
  for (let n = 0; n < 100; n++) await createDraft(db, 'alice', draft);
  await assert.rejects(createDraft(db, 'alice', draft), status(403));
  assert.equal((await createDraft(db, 'bob', draft)).revision, 1);
});
test('D1: SQL rejects identity mutation, revision jumps and invalid input', async t => {
  const { db, sql } = fixture(t);
  const saved = await createDraft(db, 'alice', draft);
  assert.throws(() => sql.prepare('UPDATE community_drafts SET owner_id = ?, revision = 2 WHERE id = ?').run('bob', saved.id), /immutable/);
  assert.throws(() => sql.prepare('UPDATE community_drafts SET revision = 5 WHERE id = ?').run(saved.id), /revision/);
  assert.throws(() => sql.prepare('UPDATE community_drafts SET revision = 2, input_json = ? WHERE id = ?').run('[]', saved.id), /CHECK/);
  assert.throws(() => sql.prepare('UPDATE community_drafts SET revision = 2, input_json = ? WHERE id = ?').run('invalid', saved.id));
  assert.throws(() => sql.exec("DELETE FROM community_users WHERE id = 'alice'"), /FOREIGN KEY/);
});
test('D1: envelope limits count bytes and reject malformed values', async t => {
  const { db } = fixture(t);
  await assert.rejects(createDraft(db, 'alice', { ...draft, input: { text: '😀'.repeat(20000) } }), status(413));
  await assert.rejects(createDraft(db, 'alice', { ...draft, privateNotes: 'x'.repeat(4001) }), status(400));
  for (const invalid of [null, [], { ...draft, title: ' ' }, { ...draft, input: [] }]) {
    await assert.rejects(createDraft(db, 'alice', invalid), status(400));
  }
  const circular = {}; circular.self = circular;
  await assert.rejects(createDraft(db, 'alice', { ...draft, input: circular }), status(400));
});
test('D1: schema probe rejects missing/unsupported schema without SQL details', async t => {
  const { db, sql } = fixture(t);
  sql.exec('UPDATE community_schema SET version = 2');
  await assert.rejects(checkCommunitySchema(db), status(503));
  sql.exec('DROP TABLE community_schema');
  await assert.rejects(checkCommunitySchema(db), error => error.status === 503 && !error.message.includes('SELECT'));
  await assert.rejects(checkCommunitySchema(undefined), status(503));
});
test('D1: publication HTTP stays closed even if enabled; legacy storage remains protected', async () => {
  const db = { prepare() { throw new Error('Must not access D1 through HTTP yet'); } };
  for (const env of [{}, { COMMUNITY_ENABLED: 'false', COMMUNITY_DB: db }, { COMMUNITY_ENABLED: 'true' }, { COMMUNITY_ENABLED: 'true', COMMUNITY_DB: db }]) {
    for (const path of ['/api/community/status', '/api/community/publications']) {
      for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
        const response = await worker.fetch(new Request('https://os.example' + path, { method }), env);
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
        assert.equal((await response.json()).ready, false);
      }
    }
  }
  const response = await worker.fetch(new Request('https://os.example/api/storage/status'), {});
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Private storage authentication/);
});
