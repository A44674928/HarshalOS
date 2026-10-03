import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../worker/index.mjs';
import { compile, emitSeed, renderArtifacts, withFrozenClock } from '../scripts/case-studies-d1.mjs';
import { canonical, evaluateSavedInput, sha256 } from '../worker/community-audit.mjs';

const origin = 'https://os.example';
const registry = JSON.parse(readFileSync(new URL('../case-studies/pdh-registry.json', import.meta.url), 'utf8'));
const { manifest } = await compile({ revision: 1, verbose: false });
const seedSql = emitSeed(manifest);

function migratedDatabase(t) {
  const sql = new DatabaseSync(':memory:');
  t.after(() => sql.close());
  sql.exec('PRAGMA foreign_keys=ON');
  for (const file of ['0001_private_drafts.sql', '0002_auth_sessions.sql', '0003_private_runs.sql', '0004_publication.sql', '0005_tickerbot_call_ledger.sql']) {
    sql.exec(readFileSync(new URL('../migrations/community/' + file, import.meta.url), 'utf8'));
  }
  let intercept = null;
  const db = {
    prepare(text) {
      if (intercept) { const fn = intercept; intercept = null; fn(); }
      let args = [];
      const q = {
        bind(...values) { args = values; return q; },
        exec() { return sql.prepare(text).run(...args); },
        async run() { return q.exec(); },
        async first() { return sql.prepare(text).get(...args) ?? null; },
        async all() { return { results: sql.prepare(text).all(...args) }; }
      };
      return q;
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try { const results = statements.map(q => q.exec()); sql.exec('COMMIT'); return results; }
      catch (error) { sql.exec('ROLLBACK'); throw error; }
    }
  };
  const env = {
    COMMUNITY_ENABLED: 'true', COMMUNITY_DB: db, COMMUNITY_ORIGIN: origin,
    OIDC_ISSUER: 'https://issuer.example/', OIDC_CLIENT_ID: 'client', OIDC_CLIENT_SECRET: 'secret',
    COMMUNITY_RATE_SECRET: 'r'.repeat(64), OIDC_ADMIN_SUBJECTS: 'moderator'
  };
  const call = path => worker.fetch(new Request(origin + '/api/community/' + path, {
    headers: { 'CF-Connecting-IP': '192.0.2.7' }
  }), env);
  return { sql, db, env, call, intercept: fn => { intercept = fn; } };
}

test('Case studies: every register record is reproduced by the real Ground-0 engine', async () => {
  assert.equal(manifest.records.length, registry.headers.length, 'one processed record per register header');
  assert.equal(new Set(manifest.records.map(record => record.evidenceFile)).size, 21, '23 headers span 21 audit files');
  assert.equal(registry.counts.entities, 23);
  const byHeader = new Map(registry.headers.map(header => [header.header_id, header]));
  for (const record of manifest.records) {
    const header = byHeader.get(record.headerId);
    assert.ok(header, `registry header ${record.headerId}`);
    assert.equal(record.evidenceFile, header.evidence_file);
    assert.equal(record.entity, header.subject_entity);
    assert.equal(record.basePhase, record.engine.phase, `${record.headerId} reproduces the register base phase`);
    assert.equal(record.scopedPhase, /→/.test(header.detected_phase) ? header.detected_phase.split('→')[1].trim().split('(')[0].trim() : null);
    assert.equal(record.publicReport.register.auditRecordSha256, header.audit_record_sha256);
    assert.equal(record.publicReport.register.issuanceRecordSha256, header.issuance_record_sha256);
    assert.equal(record.publicReport.register.ledgerEntryId, header.header_id.replace('PDH-R-', 'PDH-'));
    assert.equal(record.publicReport.register.constraintRecord.count, header.constraint_record.count);
    assert.equal(record.hashes.publicReportHash, await sha256(record.publicReport), 'public report hash is canonical');
    assert.equal(record.hashes.privateReportHash, await sha256(record.privateReport), 'private run hash is canonical');
    assert.equal(record.privateReport.schema, 'ground0-private-run-v1');
    assert.equal(record.privateReport.reviewStatus, 'UNREVIEWED');
    assert.equal(record.privateReport.platformCertification, 'NONE');
    assert.equal(record.privateReport.result.phase, record.engine.phase);
    assert.equal(record.publicReport.result.pdh.status, 'MISSING', 'no entity declaration exists for any audited entity');
    assert.equal('rawInputHash' in record.publicReport, false, 'private input hash never reaches the public report');
  }
});

test('Case studies: a frozen-clock engine run reproduces every stored private run byte for byte', async () => {
  const issuedAt = manifest.registry.issuedAt;
  for (const record of manifest.records) {
    const replayed = await withFrozenClock(issuedAt, () => evaluateSavedInput(record.input));
    assert.equal(replayed.reportHash, record.hashes.privateReportHash, `${record.headerId} private run is reproducible`);
    assert.equal(replayed.json, canonical(record.privateReport), `${record.headerId} stored run JSON is byte-identical`);
  }
});

test('Case studies: the committed D1 artifacts match a fresh build', async () => {
  const artifacts = renderArtifacts(manifest);
  const json = readFileSync(new URL('../case-studies/d1/case-studies-d1.json', import.meta.url), 'utf8');
  const sql = readFileSync(new URL('../case-studies/d1/case-studies-seed.sql', import.meta.url), 'utf8');
  assert.equal(json, artifacts.json, 'case-studies/d1/case-studies-d1.json is current');
  assert.equal(sql, artifacts.sql, 'case-studies/d1/case-studies-seed.sql is current');
});

test('Case studies: the seed publishes 23 UNREVIEWED register rows and never touches private tables', async t => {
  const f = migratedDatabase(t);
  f.sql.exec(seedSql);
  const publications = f.sql.prepare("SELECT id, series_id, version, state, title, author, phase, report_json, report_hash FROM community_publications ORDER BY seq").all();
  assert.equal(publications.length, 23);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM community_public_series').get().n, 23);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM community_public_events').get().n, 23);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM community_sessions').get().n, 0, 'the register account holds no session');
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM community_previews').get().n, 0);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM community_users').get().n, 1);
  assert.deepEqual(
    { ...f.sql.prepare("SELECT component, version FROM community_schema WHERE component = 'case-studies-d1'").get() },
    { component: 'case-studies-d1', version: 1 }
  );
  const records = new Map(manifest.records.map(record => [record.hashes.publicReportHash, record]));
  for (const publication of publications) {
    const record = records.get(publication.report_hash);
    assert.ok(record, `published hash belongs to a processed record: ${publication.report_hash}`);
    assert.equal(publication.state, 'published');
    assert.equal(publication.version, 1);
    assert.equal(publication.series_id, record.ids.seriesId);
    assert.equal(publication.author, 'Ground-0 audit register');
    assert.equal(publication.title, record.entity);
    assert.equal(publication.phase, record.engine.phase);
    assert.equal(await sha256(JSON.parse(publication.report_json)), publication.report_hash, 'stored JSON matches its hash');
    assert.equal(JSON.parse(publication.report_json).reviewStatus, 'UNREVIEWED');
    assert.equal(JSON.parse(publication.report_json).platformCertification, 'NONE');
  }
  const registerId = f.sql.prepare('SELECT id FROM community_users').get().id;
  const privateText = JSON.stringify(f.sql.prepare('SELECT * FROM community_runs').all());
  assert.ok(privateText.includes('ground0-private-run-v1'), 'runs keep the private envelope');
  for (const record of manifest.records) assert.equal(record.publicReport.register.headerId.startsWith('PDH-R-'), true);
  assert.equal(f.sql.prepare('SELECT id FROM community_users').get().id, registerId);
});

test('Case studies: the News application feed, detail, and NewsML export serve register records', async t => {
  const f = migratedDatabase(t);
  f.sql.exec(seedSql);

  const feedResponse = await f.call('publications');
  assert.equal(feedResponse.status, 200);
  const feed = await feedResponse.json();
  assert.equal(feed.publications.length, 23);
  assert.equal(feed.nextCursor, null);
  for (const summary of feed.publications) {
    assert.equal(summary.state, 'published');
    assert.equal(summary.reviewStatus, 'UNREVIEWED');
    assert.equal(typeof summary.title, 'string');
    assert.equal('report' in summary, false, 'the feed carries summaries only');
  }

  const first = manifest.records[0];
  const feedIds = new Set(feed.publications.map(summary => summary.id));
  for (const record of manifest.records) assert.equal(feedIds.has(record.ids.publicationId), true);
  assert.equal(feed.publications[0].id, manifest.records.at(-1).ids.publicationId, 'the feed is newest first');

  const detailResponse = await f.call(`publications/${first.ids.publicationId}`);
  assert.equal(detailResponse.status, 200);
  const { publication } = await detailResponse.json();
  assert.deepEqual(publication.report, first.publicReport);
  assert.equal(publication.report.register.headerId, first.headerId);
  assert.equal(publication.report.reviewStatus, 'UNREVIEWED');
  assert.equal(publication.report.platformCertification, 'NONE');
  assert.equal(publication.report.input.name, publication.title);
  assert.equal(publication.report.result.phase, publication.phase);

  const newsmlResponse = await f.call(`publications/${first.ids.publicationId}/newsml`);
  assert.equal(newsmlResponse.status, 200, 'the export re-verifies the stored report hash');
  assert.match(newsmlResponse.headers.get('Content-Type'), /newsitem\+xml/);
  const xml = await newsmlResponse.text();
  assert.match(xml, new RegExp(first.hashes.publicReportHash));
  assert.match(xml, /UNREVIEWED/);
  assert.match(xml, new RegExp(`community-${first.ids.seriesId}`));
  const inline = /<inlineData contenttype="application\/json" encoding="base64">([^<]+)<\/inlineData>/.exec(xml);
  assert.ok(inline, 'the export carries the exact report JSON');
  const exported = Buffer.from(inline[1], 'base64').toString('utf8');
  assert.equal(exported, f.sql.prepare('SELECT report_json FROM community_publications WHERE id=?').get(first.ids.publicationId).report_json);

  const json = JSON.stringify(publication.report);
  for (const secret of ['rawInputHash', 'oidc_subject', 'private_notes', 'preview_hash']) {
    assert.equal(json.includes(secret), false, `public report never exposes ${secret}`);
  }
});

test('Case studies: the seed is idempotent and aborts loudly when a published revision changed', async t => {
  const f = migratedDatabase(t);
  f.sql.exec(seedSql);
  f.sql.exec(seedSql);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM community_publications').get().n, 23, 're-applying changes nothing');
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM community_public_events').get().n, 23, 'no duplicate publication events');

  const target = manifest.records[3];
  assert.throws(() => f.sql.prepare("UPDATE community_publications SET title='Changed'").run(), /cannot be edited or restored/,
    'published versions are immutable at the database level');

  // A rebuild that keeps the same revision while the audit content moved forward must abort.
  const next = (await compile({ revision: 2, verbose: false })).manifest;
  assert.notEqual(next.records[3].hashes.publicReportHash, target.hashes.publicReportHash);
  assert.throws(() => f.sql.exec(emitSeed({ ...next, revision: 1 })), /CHECK constraint failed/,
    'a changed revision aborts instead of silently replacing published content');
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM community_publications').get().n, 23, 'the aborted seed inserted nothing');

  // The sanctioned path is a new revision, which appends new versions to each series.
  f.sql.exec(emitSeed(next));
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM community_publications').get().n, 46);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM community_publications WHERE series_id=?').get(target.ids.seriesId).n, 2);
  const versions = f.sql.prepare('SELECT version FROM community_publications WHERE series_id=? ORDER BY version').all(target.ids.seriesId);
  assert.deepEqual(versions.map(row => row.version), [1, 2], 'corrections are new versions in one series');
});

test('Case studies: withdrawn register rows stop exporting and remove the payload', async t => {
  const f = migratedDatabase(t);
  f.sql.exec(seedSql);
  const target = manifest.records[10];
  f.sql.prepare("UPDATE community_publications SET state='withdrawn', title=NULL, author=NULL, phase=NULL, report_json=NULL WHERE id=?").run(target.ids.publicationId);
  const response = await f.call(`publications/${target.ids.publicationId}/newsml`);
  assert.equal(response.status, 404);
  const detail = await (await f.call(`publications/${target.ids.publicationId}`)).json();
  assert.equal(detail.publication.state, 'withdrawn');
  assert.equal('report' in detail.publication, false);
  const feed = await (await f.call('publications')).json();
  assert.equal(feed.publications.length, 22, 'the feed lists active publications only');
});
