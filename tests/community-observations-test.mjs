import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker/index.mjs';
import { digest } from '../worker/community-auth.mjs';
import { sha256 } from '../worker/community-audit.mjs';

const origin = 'https://os.example';

async function fixture(t) {
  const sql = new DatabaseSync(':memory:');
  t.after(() => sql.close());
  sql.exec('PRAGMA foreign_keys=ON');
  for (const file of ['0001_private_drafts.sql', '0002_auth_sessions.sql', '0016_public_observations.sql']) {
    sql.exec(readFileSync(new URL('../migrations/community/' + file, import.meta.url), 'utf8'));
  }
  const db = {
    prepare(source) {
      let args = [];
      const statement = {
        bind(...values) { args = values; return statement; },
        exec() { return sql.prepare(source).run(...args); },
        async run() { return statement.exec(); },
        async first() { return sql.prepare(source).get(...args) ?? null; },
        async all() { return { results: sql.prepare(source).all(...args) }; }
      };
      return statement;
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try {
        const result = statements.map(statement => statement.exec());
        sql.exec('COMMIT');
        return result;
      } catch (error) {
        sql.exec('ROLLBACK');
        throw error;
      }
    }
  };
  const now = Math.floor(Date.now() / 1000);
  for (const id of ['alice', 'bob', 'moderator']) {
    sql.prepare('INSERT INTO community_users VALUES(?,?,?,0,?)').run(id, 'https://issuer.example/', id, now * 1000);
    sql.prepare('INSERT INTO community_sessions VALUES(?,?,?,?,?,?)')
      .run(await digest(id[0].repeat(43)), id, 'https://issuer.example/', 'client', now, now + 86400);
  }
  const env = {
    COMMUNITY_ENABLED: 'true',
    COMMUNITY_DB: db,
    COMMUNITY_ORIGIN: origin,
    OIDC_ISSUER: 'https://issuer.example/',
    OIDC_CLIENT_ID: 'client',
    OIDC_CLIENT_SECRET: 'secret',
    COMMUNITY_RATE_SECRET: 'r'.repeat(64),
    OIDC_ADMIN_SUBJECTS: 'moderator'
  };
  async function call(path, { method = 'GET', user = null, data, requestOrigin = origin, urlOrigin = origin, headers = {} } = {}) {
    const requestHeaders = { 'CF-Connecting-IP': '192.0.2.1', ...headers };
    if (data !== undefined) requestHeaders['Content-Type'] = 'application/json';
    if (user) {
      requestHeaders.Cookie = '__Host-hos_session=' + user[0].repeat(43);
      if (requestOrigin) requestHeaders.Origin = requestOrigin;
    }
    return worker.fetch(new Request(urlOrigin + '/api/community/' + path, {
      method,
      headers: requestHeaders,
      body: data === undefined ? undefined : JSON.stringify(data)
    }), env);
  }
  async function create(overrides = {}) {
    const response = await call('observation-handoffs', {
      method: 'POST',
      data: { phase: 'CWO', text: 'A bounded public observation from a native ledger.', author: 'Native Pseudonym', ...overrides }
    });
    assert.equal(response.status, 201, await response.clone().text());
    return (await response.json()).handoff;
  }
  return { sql, env, call, create };
}

test('Public observations: native handoff is unlisted, bounded, and has separate manual/status capabilities', async t => {
  const f = await fixture(t);
  const handoff = await f.create();
  assert.match(handoff.id, /^[0-9a-f-]{36}$/);
  assert.match(handoff.claimCode, /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$/);
  assert.match(handoff.statusToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(handoff.publisherURL, origin + '/observations');

  const feed = await f.call('observations');
  assert.deepEqual((await feed.json()).observations, []);
  const status = await f.call('observation-handoffs/' + handoff.id, {
    headers: { 'X-HOS-Observation-Status': handoff.statusToken }
  });
  assert.equal(status.status, 200);
  const response = await status.json();
  assert.equal(response.handoff.state, 'pending');
  assert.equal('text' in response.handoff, false);
  assert.equal('author' in response.handoff, false);

  const raw = f.sql.prepare('SELECT * FROM community_observation_handoffs WHERE id=?').get(handoff.id);
  assert.notEqual(raw.claim_code_hash, handoff.claimCode);
  assert.notEqual(raw.status_token_hash, handoff.statusToken);
  assert.equal(raw.note_text, 'A bounded public observation from a native ledger.');
  assert.equal((await f.call('observation-handoffs/' + handoff.id)).status, 401);
  assert.equal((await f.call('observation-handoffs', {
    method: 'POST', data: { phase: 'CWO', text: 'x', author: 'p', universeCoreID: 'must-not-be-accepted' }
  })).status, 400);
});

test('Public observations: account claim, profile pseudonym, explicit publish, and public feed exclude native/private identifiers', async t => {
  const f = await fixture(t);
  const handoff = await f.create({ phase: 'NAB', author: 'Suggested Native Label' });
  assert.equal((await f.call('observation-handoffs/' + handoff.id + '/publish', { method: 'POST', data: { acknowledgement: 'PUBLISH_PUBLIC_OBSERVATION' } })).status, 403);

  const claim = await f.call('observation-handoffs/claim', {
    method: 'POST', user: 'alice', data: { claimCode: handoff.claimCode }
  });
  assert.equal(claim.status, 200, await claim.clone().text());
  const candidate = (await claim.json()).handoff;
  assert.equal(candidate.phase, 'NAB');
  assert.equal(candidate.text, 'A bounded public observation from a native ledger.');
  assert.equal(candidate.suggestedPseudonym, 'Suggested Native Label');
  assert.equal((await f.call('observation-handoffs/claim', {
    method: 'POST', user: 'bob', data: { claimCode: handoff.claimCode }
  })).status, 409);
  const recoveredClaim = await f.call('observation-handoffs/claim', {
    method: 'POST', user: 'alice', data: { claimCode: handoff.claimCode }
  });
  assert.equal(recoveredClaim.status, 200, await recoveredClaim.clone().text());
  assert.equal((await recoveredClaim.json()).handoff.id, candidate.id);

  const profile = await f.call('observation-profile', {
    method: 'PUT', user: 'alice', data: { pseudonym: 'Account-owned profile' }
  });
  assert.equal((await profile.json()).profile.pseudonym, 'Account-owned profile');

  const missingAcknowledgement = await f.call('observation-handoffs/' + handoff.id + '/publish', {
    method: 'POST', user: 'alice', data: {}
  });
  assert.equal(missingAcknowledgement.status, 400);
  const publicationResponse = await f.call('observation-handoffs/' + handoff.id + '/publish', {
    method: 'POST', user: 'alice', data: { acknowledgement: 'PUBLISH_PUBLIC_OBSERVATION' }
  });
  assert.equal(publicationResponse.status, 201, await publicationResponse.clone().text());
  const publication = (await publicationResponse.json()).observation;
  assert.equal(publication.state, 'published');
  assert.equal(publication.author, 'Account-owned profile');
  assert.equal(publication.phase, 'NAB');
  assert.equal(publication.reviewStatus, 'UNREVIEWED');
  assert.equal(publication.schema, 'harshalos-public-observation-v1');
  assert.equal(publication.text, 'A bounded public observation from a native ledger.');
  assert.equal(publication.contentHash, await sha256({
    schema: 'harshalos-public-observation-v1', reviewStatus: 'UNREVIEWED', author: 'Account-owned profile', phase: 'NAB', text: publication.text
  }));

  const feed = await (await f.call('observations')).json();
  assert.equal(feed.observations.length, 1);
  assert.deepEqual(feed.observations[0], publication);
  const detail = await (await f.call('observations/' + publication.id)).json();
  const publicText = JSON.stringify({ feed, detail });
  for (const privateValue of [handoff.id, handoff.claimCode, handoff.statusToken, 'alice', 'Suggested Native Label', 'owner_id']) {
    assert.equal(publicText.includes(privateValue), false, `public DTO must not reveal ${privateValue}`);
  }

  const status = await (await f.call('observation-handoffs/' + handoff.id, {
    headers: { 'X-HOS-Observation-Status': handoff.statusToken }
  })).json();
  assert.equal(status.handoff.state, 'published');
  assert.equal(status.handoff.publication.id, publication.id);
  assert.equal(status.handoff.publication.author, 'Account-owned profile');
  assert.equal('text' in status.handoff.publication, false, 'the status capability never returns a note body');
  assert.equal(status.handoff.publicURL, origin + '/observations?id=' + publication.id);
  const clearedHandoff = f.sql.prepare('SELECT phase,note_text,note_hash,suggested_pseudonym,claim_code_hash FROM community_observation_handoffs WHERE id=?').get(handoff.id);
  assert.equal(clearedHandoff.phase, null);
  assert.equal(clearedHandoff.note_text, null);
  assert.equal(clearedHandoff.note_hash, null);
  assert.equal(clearedHandoff.suggested_pseudonym, null);
  assert.equal(clearedHandoff.claim_code_hash, null);
  assert.equal(f.sql.prepare('SELECT count(*) AS count FROM community_public_observation_events').get().count, 1);
});

test('Public observations: publish refuses a staged-payload hash mismatch instead of silently changing the reviewed candidate', async t => {
  const f = await fixture(t);
  const handoff = await f.create();
  await f.call('observation-handoffs/claim', { method: 'POST', user: 'alice', data: { claimCode: handoff.claimCode } });
  await f.call('observation-profile', { method: 'PUT', user: 'alice', data: { pseudonym: 'Integrity Author' } });
  f.sql.prepare("UPDATE community_observation_handoffs SET note_text='Different staged text.' WHERE id=?").run(handoff.id);
  const publish = await f.call('observation-handoffs/' + handoff.id + '/publish', {
    method: 'POST', user: 'alice', data: { acknowledgement: 'PUBLISH_PUBLIC_OBSERVATION' }
  });
  assert.equal(publish.status, 409);
  assert.equal(f.sql.prepare('SELECT count(*) AS count FROM community_public_observations').get().count, 0);
});

test('Public observations: withdrawal redacts public text and author while retaining a minimal eventful tombstone', async t => {
  const f = await fixture(t);
  const handoff = await f.create();
  await f.call('observation-handoffs/claim', { method: 'POST', user: 'alice', data: { claimCode: handoff.claimCode } });
  await f.call('observation-profile', { method: 'PUT', user: 'alice', data: { pseudonym: 'Withdrawer' } });
  const published = (await (await f.call('observation-handoffs/' + handoff.id + '/publish', {
    method: 'POST', user: 'alice', data: { acknowledgement: 'PUBLISH_PUBLIC_OBSERVATION' }
  })).json()).observation;

  assert.equal((await f.call('observations/' + published.id + '/withdraw', { method: 'POST', user: 'bob', data: {} })).status, 404);
  const withdrawn = await f.call('observations/' + published.id + '/withdraw', { method: 'POST', user: 'alice', data: {} });
  assert.equal(withdrawn.status, 200);
  const tombstone = (await withdrawn.json()).observation;
  assert.equal(tombstone.state, 'withdrawn');
  assert.equal(tombstone.contentHash, published.contentHash);
  for (const key of ['author', 'phase', 'text', 'reviewStatus', 'schema']) assert.equal(key in tombstone, false);
  assert.equal((await (await f.call('observations')).json()).observations.length, 0);
  const publicDetail = await (await f.call('observations/' + published.id)).json();
  assert.equal(publicDetail.observation.state, 'withdrawn');
  assert.equal(JSON.stringify(publicDetail).includes(published.text), false);
  assert.equal(f.sql.prepare('SELECT count(*) AS count FROM community_public_observation_events').get().count, 2);
  assert.throws(() => f.sql.exec("UPDATE community_public_observations SET note_text='tampered'"), /cannot be edited/);
});

test('Public observations: configured moderator can hide an active note with a private append-only action record', async t => {
  const f = await fixture(t);
  const handoff = await f.create();
  await f.call('observation-handoffs/claim', { method: 'POST', user: 'alice', data: { claimCode: handoff.claimCode } });
  await f.call('observation-profile', { method: 'PUT', user: 'alice', data: { pseudonym: 'Moderated Author' } });
  const published = (await (await f.call('observation-handoffs/' + handoff.id + '/publish', {
    method: 'POST', user: 'alice', data: { acknowledgement: 'PUBLISH_PUBLIC_OBSERVATION' }
  })).json()).observation;

  assert.equal((await f.call('observations/' + published.id + '/hide', {
    method: 'POST', user: 'bob', data: { note: 'Not a moderator.' }
  })).status, 403);
  const hidden = await f.call('observations/' + published.id + '/hide', {
    method: 'POST', user: 'moderator', data: { note: 'Synthetic moderation exercise.' }
  });
  assert.equal(hidden.status, 200, await hidden.clone().text());
  assert.equal((await hidden.json()).observation.state, 'hidden');
  const detail = await (await f.call('observations/' + published.id)).json();
  assert.equal(detail.observation.state, 'hidden');
  assert.equal(JSON.stringify(detail).includes(published.text), false);
  assert.equal(f.sql.prepare('SELECT count(*) AS count FROM community_public_observation_moderation_actions').get().count, 1);
  assert.equal(f.sql.prepare('SELECT count(*) AS count FROM community_public_observation_events').get().count, 2);

  const status = await (await f.call('observation-handoffs/' + handoff.id, {
    headers: { 'X-HOS-Observation-Status': handoff.statusToken }
  })).json();
  assert.equal(status.handoff.state, 'published');
  assert.equal(status.handoff.publication.state, 'hidden');
  const ownerAttempt = await f.call('observations/' + published.id + '/withdraw', {
    method: 'POST', user: 'alice', data: {}
  });
  assert.equal(ownerAttempt.status, 200);
  assert.equal((await ownerAttempt.json()).observation.state, 'hidden', 'owner cannot restore or alter a hidden record');
});

test('Public observations: expired handoffs redact all staged fields and cannot be claimed or published', async t => {
  const f = await fixture(t);
  const handoff = await f.create();
  assert.equal((await f.call('observation-handoffs/claim', {
    method: 'POST', user: 'alice', data: { claimCode: handoff.claimCode }
  })).status, 200);
  f.sql.prepare('UPDATE community_observation_handoffs SET expires_at=created_at+1 WHERE id=?').run(handoff.id);
  const status = await f.call('observation-handoffs/' + handoff.id, { headers: { 'X-HOS-Observation-Status': handoff.statusToken } });
  assert.equal(status.status, 200);
  assert.equal((await status.json()).handoff.state, 'expired');
  const stored = f.sql.prepare('SELECT state,owner_id,phase,note_text,note_hash,suggested_pseudonym,claim_code_hash,claimed_at FROM community_observation_handoffs WHERE id=?').get(handoff.id);
  assert.equal(stored.state, 'expired');
  assert.equal(stored.owner_id, null);
  assert.equal(stored.phase, null);
  assert.equal(stored.note_text, null);
  assert.equal(stored.note_hash, null);
  assert.equal(stored.suggested_pseudonym, null);
  assert.equal(stored.claim_code_hash, null);
  assert.equal(stored.claimed_at, null);
  assert.equal((await f.call('observation-handoffs/claim', {
    method: 'POST', user: 'alice', data: { claimCode: handoff.claimCode }
  })).status, 409);
  await f.call('observation-profile', { method: 'PUT', user: 'alice', data: { pseudonym: 'Expired Author' } });
  assert.equal((await f.call('observation-handoffs/' + handoff.id + '/publish', {
    method: 'POST', user: 'alice', data: { acknowledgement: 'PUBLISH_PUBLIC_OBSERVATION' }
  })).status, 404);
});

test('Public observations: exact community origin, public schema gate, and bounded handoff envelope fail closed', async t => {
  const f = await fixture(t);
  assert.equal((await f.call('observation-handoffs', {
    method: 'POST', urlOrigin: 'https://evil.example', data: { phase: 'CWO', text: 'No cross-origin handoff.', author: 'Label' }
  })).status, 403);
  assert.equal((await f.call('observation-handoffs', {
    method: 'POST', data: { phase: 'BAD', text: 'No unsupported phase.', author: 'Label' }
  })).status, 400);
  assert.equal((await f.call('observation-handoffs', {
    method: 'POST', data: { phase: 'CWO', text: '🙂'.repeat(1_001), author: 'Label' }
  })).status, 400, 'UTF-16 bounds reject 2,002-unit text');
  const unicodeBoundary = await f.call('observation-handoffs', {
    method: 'POST', data: { phase: 'CWO', text: '🙂'.repeat(1_000), author: '🙂'.repeat(40) }
  });
  assert.equal(unicodeBoundary.status, 201, await unicodeBoundary.clone().text());
  assert.equal((await f.call('observation-handoffs', {
    method: 'POST', data: { phase: 'CWO', text: 'Bounded note.', author: '🙂'.repeat(41) }
  })).status, 400, 'UTF-16 bounds reject an 82-unit pseudonym');
  f.sql.exec("DELETE FROM community_schema WHERE component='public-observations'");
  assert.equal((await f.call('observations')).status, 503);
});
