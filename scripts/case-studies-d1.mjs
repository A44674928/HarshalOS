#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   HarshalOS — case-study register processor (news application / D1)

   Turns the 23 register-issued PDH-R headers in
   `case-studies/pdh-registry.json` into processed public records for
   the D1-backed News application:

     1. Verify the audit record and issuance hashes of every source
        case study (Appendix C stripped, exactly as the issuer hashed it).
     2. Extract the recorded B1–B5 behavioral answers, the C1–C4
        constraint answers, and the Appendix B evidence index.
     3. Re-run the real Ground-0 engine (`js/g0-engine.js` through
        `worker/community-audit.mjs`) over those answers, with the
        register's cited public artifacts as answer sources.
     4. Refuse to emit anything unless the engine reproduces the
        register's base detected phase for every header.
     5. Compile public report envelopes (`ground0-public-v1`) that satisfy
        the D1 publication CHECK constraints, and emit:

          case-studies/d1/case-studies-d1.json   compiled records (source of truth)
          case-studies/d1/case-studies-seed.sql  idempotent D1 seed for the News app

   Deterministic by construction: the engine runs with a clock frozen to
   the register's issuance timestamp, IDs are SHA-256 derived, and
   artifact order follows the registry. `--check` re-renders in memory and
   fails if the committed artifacts differ.

   Boundaries: a PDH-R is a statement about an audit, not an entity
   declaration, certification, legal finding, safety rating, or authority.
   Everything emitted here stays UNREVIEWED / UNATTESTED, and PDH_VALID
   for every audited entity remains FALSE. No private drafts, runs, or
   previews are read or written; only the explicit public register is fed.
   ═══════════════════════════════════════════════════════════════ */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_SHA256, EVALUATOR_SHA256 } from '../worker/community-engine-version.mjs';
import { evaluateSavedInput, sha256 } from '../worker/community-audit.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CASE_STUDIES = path.join(ROOT, 'case-studies');
const OUT_DIR = path.join(CASE_STUDIES, 'd1');
const REGISTRY_FILE = path.join(CASE_STUDIES, 'pdh-registry.json');

const FORMAT = 'ground0-case-study-d1-v1';
const AUTHOR = 'Ground-0 audit register';
const APPENDIX_C = '\n---\n\n## APPENDIX C — PDH-R ISSUANCE RECORDS';
const BASE_PHASES = ['NAB', 'CWO', 'NAB-Constrained', 'GSRB', 'AMBIGUOUS', 'INCOHERENT'];

const fail = message => { throw new Error(message); };
const hex = value => createHash('sha256').update(value, 'utf8').digest('hex');
const bytes = value => new TextEncoder().encode(value).byteLength;

/** Deterministic UUID (v5-shaped) from a namespace string: no counters, no clock. */
function uuidFrom(seed) {
  const digest = hex(`harshalos-case-studies-d1:${seed}`);
  const version = `5${digest.slice(13, 16)}`;
  const variant = ((Number.parseInt(digest[16], 16) & 0x3) | 0x8).toString(16) + digest.slice(17, 20);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${version}-${variant}-${digest.slice(20, 32)}`;
}

/** Run in a frozen clock so engine timestamps are reproducible. */
async function withFrozenClock(iso, fn) {
  const RealDate = Date;
  const frozen = RealDate.parse(iso);
  if (!Number.isFinite(frozen)) fail(`Invalid frozen clock: ${iso}`);
  class FrozenDate extends RealDate {
    constructor(...args) { if (args.length === 0) super(frozen); else super(...args); }
    static now() { return frozen; }
  }
  globalThis.Date = FrozenDate;
  try { return await fn(); } finally { globalThis.Date = RealDate; }
}

/* ── Markdown parsing ───────────────────────────────────────────
   The 21 case-study records share one register structure but not one
   literal layout (v1.1 re-audits use `### QUESTION B1`, the dual-entity
   files use bold inline lines plus per-entity table columns). These
   helpers read both without guessing: values come from the Section III /
   Section IV tables, prose and citations come from Section II, and the
   two must agree. */

const SECTIONS = /^## (?!#)/m;
const SUBSECTIONS = /^#{2,4} /m;

function headingBlock(text, headingRe) {
  const match = headingRe.exec(text);
  if (!match) return '';
  const after = text.slice(match.index + match[0].length).replace(/^\s*/, '');
  const stop = SECTIONS.exec(after);
  return stop ? after.slice(0, stop.index) : after;
}
const section = (text, roman) => headingBlock(text, new RegExp(`^## ${roman}\\b.*$`, 'm'));

function subBlock(text, pattern) {
  const match = pattern.exec(text);
  if (!match) return '';
  const after = text.slice(match.index + match[0].length).replace(/^\s*/, '');
  const stop = SUBSECTIONS.exec(after);
  return stop ? after.slice(0, stop.index) : after;
}

function table(sectionText) {
  const lines = sectionText.split('\n').filter(line => /^\s*\|/.test(line));
  if (!lines.length) return { header: [], rows: [] };
  const cells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
  const header = cells(lines[0]);
  const rows = [];
  for (const line of lines.slice(1)) {
    const row = cells(line);
    if (row.every(cell => /^:?-{2,}:?$/.test(cell))) continue;
    rows.push(row);
  }
  return { header, rows };
}

const stripRules = text => text.replace(/<[^>]+>/g, '');
const plain = text => stripRules(text)
  .replace(/\[[A-Za-z]{1,3}\d+\]/g, '')
  .replace(/\*\*|__|\*|`|[_>#]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const citations = text => [...new Set([...text.matchAll(/\[([A-Za-z]{1,3}\d+)\]/g)].map(match => match[1]))];
/* Answer markers only: prose that argues a negative must never be read as a
   recorded answer, so explicit chips, table cells, and label markers win. */
function answerFrom(text) {
  const cleaned = stripRules(text).replace(/\*\*|`/g, '').trim();
  const chip = /[✓✔✗✘×]\s*\**\s*(YES|NO)\b/i.exec(cleaned);
  if (chip) return chip[1].toUpperCase() === 'YES';
  const lead = /^(YES|NO)\b/i.exec(cleaned);
  if (lead) return lead[1].toUpperCase() === 'YES';
  const explicit = /Answer:\s*\**\s*(YES|NO)\b/i.exec(text);
  if (explicit) return explicit[1].toUpperCase() === 'YES';
  const inline = /(?:—|–|-)\s*\**\s*(YES|NO)\b/i.exec(text);
  return inline ? inline[1].toUpperCase() === 'YES' : null;
}

/** Appendix B: `| ID | Artifact — URL | Date | Class | Supports |` */
function evidenceIndex(auditText) {
  const appendix = section(auditText, 'APPENDIX B');
  const entries = new Map();
  const rowRe = /^\|\s*([A-Za-z]{1,3}\d+)\s*\|(.+?)\|\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*\|\s*([^|]*)\|\s*([^|]*)\|$/gm;
  let match;
  while ((match = rowRe.exec(appendix))) {
    const artifact = match[2].trim();
    const url = (artifact.match(/https?:\/\/[^\s|)]+/) || [null])[0];
    entries.set(match[1], {
      code: match[1],
      title: artifact.split('—')[0].trim(),
      artifact,
      url: url ? url.replace(/[.,;]+$/, '') : null,
      date: match[3],
      className: match[4].trim()
    });
  }
  return entries;
}

/** Resolve the first cited code that carries a dated public URL at or before the cutoff. */
function resolveSource(codes, index, cutoff) {
  for (const code of codes) {
    const entry = index.get(code);
    if (entry?.url && entry.date && entry.date <= cutoff) return entry;
  }
  return null;
}

/** Pick the entity's own column when a table carries several entities. */
function entityColumn(header, entity, fallback = 1) {
  const token = entity.split(/[(—–]/)[0].trim().toLowerCase();
  for (let i = 1; i < header.length; i++) {
    const cell = plain(header[i]).toLowerCase();
    if (cell && (cell === token || token.startsWith(cell) || cell.startsWith(token.split(' ')[0]))) return i;
  }
  return fallback;
}

function entitySection(text, entity) {
  const token = entity.split(/[(—–]/)[0].trim().toLowerCase();
  const pattern = new RegExp(`^#{3,4}\\s*(?:The\\s+)?${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b.*$`, 'mi');
  const block = subBlock(text, pattern);
  return block || text;
}

function questionChunks(text) {
  const chunks = new Map();
  const pattern = /^(?:#{2,4}\s*|\*\*)(?:QUESTION\s+)?(B[1-5])\b[^\n]*$/gm;
  const matches = [...text.matchAll(pattern)];
  matches.forEach((match, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    if (!chunks.has(match[1])) chunks.set(match[1], text.slice(match.index, end));
  });
  return chunks;
}

function compileInput({ entity, inputVersion, cutoff, auditText, header, index, warnings }) {
  const behavior = section(auditText, 'SECTION II');
  const detected = section(auditText, 'SECTION III');
  const constraints = section(auditText, 'SECTION IV');
  const scoped = entitySection(behavior, entity);
  const chunks = questionChunks(scoped);
  const chunkAll = questionChunks(behavior);

  const behaviorTable = table(detected);
  if (!behaviorTable.rows.length) fail(`${header.header_id}: no Section III table found in ${header.evidence_file}.`);
  const behaviorColumn = entityColumn(behaviorTable.header, entity);
  const constraintTable = table(constraints);
  if (!constraintTable.rows.length) fail(`${header.header_id}: no Section IV table found in ${header.evidence_file}.`);
  const constraintColumn = entityColumn(constraintTable.header, entity);
  const hasEvidenceColumn = constraintTable.header.some(cell => /evidence|detail|prose/i.test(plain(cell)));

  const answers = [];
  for (let i = 1; i <= 5; i++) {
    const code = `B${i}`;
    const row = behaviorTable.rows.find(cells => new RegExp(`^\\**${code}\\**$`).test(cells[0] || ''));
    if (!row) fail(`${header.header_id}: Section III is missing ${code}.`);
    const tableValue = answerFrom(row[behaviorColumn] ?? '');
    const chunk = chunks.get(code) || chunkAll.get(code) || '';
    const proseValue = answerFrom(chunk.slice(0, 400));
    if (tableValue === null) fail(`${header.header_id}: ${code} has no recorded YES/NO in Section III.`);
    if (proseValue !== null && proseValue !== tableValue) {
      fail(`${header.header_id}: ${code} disagrees between Section II prose and the Section III table.`);
    }
    const citationCodes = citations(chunk);
    const source = resolveSource(citationCodes, index, cutoff);
    const notes = plain(chunk).slice(0, 900);
    if (!notes) fail(`${header.header_id}: ${code} has no recorded reasoning.`);
    answers.push({
      value: tableValue,
      source: source?.url || '',
      date: source?.date || '',
      notes,
      gap: source ? '' : `No qualifying public artifact by cutoff ${cutoff}; register coding retained.`
    });
  }

  const constraintAnswers = [];
  for (let i = 1; i <= 4; i++) {
    const code = `C${i}`;
    const row = constraintTable.rows.find(cells => new RegExp(`^\\**${code}\\b`).test(cells[0] || ''));
    if (!row) fail(`${header.header_id}: Section IV is missing ${code}.`);
    const text = row[constraintColumn] ?? '';
    const value = answerFrom(text);
    if (value === null) fail(`${header.header_id}: ${code} has no recorded YES/NO in Section IV.`);
    const evidenceText = hasEvidenceColumn && constraintColumn === 1 ? (row[2] ?? '') : '';
    const prose = plain(`${text} ${evidenceText}`).slice(0, 900);
    const source = resolveSource(citations(`${text} ${evidenceText}`), index, cutoff);
    constraintAnswers.push({
      value,
      source: source?.url || '',
      date: source?.date || '',
      notes: prose,
      gap: source ? '' : `No qualifying public artifact by cutoff ${cutoff}; register coding retained.`
    });
  }

  const c1 = constraintAnswers[0];
  const external = c1.value === true && c1.source
    ? {
        exists: true,
        exercised: true,
        holder: (resolveSource(citations(`${c1.notes}`), index, cutoff)?.title || 'External authority').slice(0, 120),
        scope: c1.notes.slice(0, 300),
        source: c1.source,
        date: c1.date
      }
    : undefined;

  return {
    version: inputVersion,
    name: entity,
    identifier: header.header_id.replace(/^PDH-R-\d{4}-\d{4}-/, '').replace(/-\d{3}$/, ''),
    cutoff,
    answers,
    constraints: constraintAnswers,
    ...(external ? { external } : {})
  };
}

/* ── Record metadata ────────────────────────────────────────── */
function parseMetadata(header, auditText) {
  const titleLine = auditText.match(/^## Institutional Governance Audit:\s*(.+)$/m)?.[1]?.trim() || header.subject_entity;
  const methodology = auditText.match(/^\*\*Methodology:\*\*\s*(.+)$/m)?.[1]?.replace(/\s+/g, ' ').trim() || '';
  const cutoffStamp = auditText.match(/Evidence[_ ]Cutoff:?\*{0,2}\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i)?.[1]
    || auditText.match(/Audit Timestamp[^\n]*?([0-9]{4}-[0-9]{2}-[0-9]{2})/i)?.[1] || '';
  const summary = section(auditText, 'EXECUTIVE SUMMARY');
  const inferred = summary.match(/Declared\s*\(inferred[^)]*\)\s*=\s*\**\s*([A-Za-z-]+)/i)?.[1] || null;
  const finding = plain(summary.match(/\*\*Finding:\*\*([\s\S]*?)(?:\n\n|$)/)?.[1] || '').slice(0, 1400);
  const significance = plain(summary.match(/\*\*Significance:\*\*([\s\S]*?)(?:\n\n|$)/)?.[1] || '').slice(0, 1400);
  const scope = auditText.match(/^\*\*Audit Scope[^:]*:\*\*\s*(.+)$/m)?.[1]?.replace(/\s+/g, ' ').trim() || '';
  return { titleLine, methodology, cutoffStamp, inferred, finding, significance, scope };
}

function basePhase(detected) {
  const first = String(detected).split(/[(—–→]/)[0].trim();
  const word = /^(GSRB|NAB-Constrained|NAB|CWO|AMBIGUOUS|INCOHERENT)/.exec(first)?.[1];
  if (!word || !BASE_PHASES.includes(word)) fail(`Unreadable register phase: ${detected}`);
  return word;
}

/** The register's duty-collation ledger entry is the PDH-R header ID without the issuer infix. */
const ledgerEntryId = headerId => String(headerId).replace('PDH-R-', 'PDH-');

function scopedPhase(detected) {
  const match = /→\s*(.+?)\s*\(/.exec(String(detected));
  return match ? match[1].trim() : null;
}

/* ── Compilation ────────────────────────────────────────────── */
async function compile({ revision, verbose }) {
  const registry = JSON.parse(await readFile(REGISTRY_FILE, 'utf8'));
  if (!Array.isArray(registry.headers) || !registry.headers.length) fail('Registry has no headers.');
  const issuedAt = registry.issued_at;
  const issuedMs = Date.parse(issuedAt);
  if (!Number.isFinite(issuedMs)) fail('Registry issuance timestamp is invalid.');

  const files = new Map();
  const records = [];
  const warnings = [];
  const account = {
    id: uuidFrom('register-account'),
    oidcIssuer: 'urn:harshalos:register',
    oidcSubject: 'ground-0-audit-register',
    createdAt: issuedMs - 60000
  };

  for (const header of registry.headers) {
    const sourcePath = path.join(CASE_STUDIES, header.evidence_file);
    if (!files.has(header.evidence_file)) files.set(header.evidence_file, await readFile(sourcePath, 'utf8'));
    const raw = files.get(header.evidence_file);
    const cut = raw.includes(APPENDIX_C) ? raw.slice(0, raw.indexOf(APPENDIX_C)) : raw;
    const auditText = cut.trimEnd();
    if (hex(auditText) !== header.audit_record_sha256) {
      fail(`${header.header_id}: audit record hash does not match ${header.evidence_file}. Run the issuer first.`);
    }
    if (hex(raw) !== header.issuance_record_sha256) {
      fail(`${header.header_id}: issuance record hash does not match ${header.evidence_file}.`);
    }
    const metadata = parseMetadata(header, auditText);
    const inputVersion = /v1\.1/.test(auditText.slice(0, 4000)) ? '1.1' : '1.0';
    if (inputVersion !== '1.1') fail(`${header.header_id}: registry records require v1.1 coding (found ${inputVersion}).`);
    const cutoff = metadata.cutoffStamp || String(header.evidence_cutoff).slice(0, 10);
    if (cutoff !== String(header.evidence_cutoff).slice(0, 10)) {
      fail(`${header.header_id}: evidence cutoff ${cutoff} disagrees with the registry (${header.evidence_cutoff}).`);
    }
    const index = evidenceIndex(auditText);
    const input = compileInput({ entity: header.subject_entity, inputVersion, cutoff, auditText, header, index, warnings });

    const evaluated = await withFrozenClock(issuedAt, () => evaluateSavedInput(input));
    const enginePhase = evaluated.report.result.phase;
    const expectedPhase = basePhase(header.detected_phase);
    if (enginePhase !== expectedPhase) {
      fail(`${header.header_id}: engine reproduced ${enginePhase}, but the register records ${expectedPhase}. `
        + 'Refusing to publish an unreproducible record; inspect the source sections before rebuilding.');
    }
    if (evaluated.report.result.pdh.status !== 'MISSING') {
      fail(`${header.header_id}: no entity declaration should be present (PDH status ${evaluated.report.result.pdh.status}).`);
    }
    const { rawInputHash, ...content } = evaluated.report;
    const publicReport = {
      ...content,
      schema: 'ground0-public-v1',
      author: AUTHOR,
      publicInputHash: await sha256(content.input),
      register: {
        instrument: 'PDH-R (register-issued Phase Declaration Header)',
        format: FORMAT,
        revision,
        headerId: header.header_id,
        headerClass: 'PDH-R',
        ledgerEntryId: ledgerEntryId(header.header_id),
        issuerClass: registry.issuer_class,
        issuer: registry.issuer,
        centerOrigin: registry.center_origin,
        creatorId: registry.creator_id,
        badgeClass: header.badge_class,
        declaredPhase: header.declared_phase,
        basePhase: expectedPhase,
        scopedPhase: scopedPhase(header.detected_phase),
        scopeTag: header.scope_tag,
        caveat: header.caveat,
        entityAttestation: header.entity_attestation,
        pdhESupersession: header.pdh_e_supersession,
        evidenceFile: header.evidence_file,
        evidenceCutoff: header.evidence_cutoff,
        effectiveTimestamp: header.effective_timestamp,
        expiresAt: header.expires,
        auditRecordSha256: header.audit_record_sha256,
        issuanceRecordSha256: header.issuance_record_sha256,
        documentTitle: metadata.titleLine,
        methodology: metadata.methodology,
        inferredDeclaredPhase: metadata.inferred,
        engine: {
          basePhase: enginePhase,
          confidence: evaluated.report.result.confidence,
          recordStatus: evaluated.report.result.recordStatus,
          replicationRisk: evaluated.report.result.replicationRisk,
          engineSha256: ENGINE_SHA256,
          evaluatorSha256: EVALUATOR_SHA256
        },
        constraintRecord: header.constraint_record,
        nonClaims: registry.non_claims,
        summary: { finding: metadata.finding, significance: metadata.significance },
        auditScope: metadata.scope
      }
    };
    const publicJson = JSON.stringify(publicReport);
    const publicHash = await sha256(publicReport);
    const privateHash = await sha256(evaluated.report);
    const seriesSeed = `series:${header.slug}`;
    records.push({
      headerId: header.header_id,
      slug: header.slug,
      entity: header.subject_entity,
      badgeClass: header.badge_class,
      evidenceFile: header.evidence_file,
      documentTitle: metadata.titleLine,
      methodology: metadata.methodology,
      evidenceCutoff: header.effective_timestamp,
      effectiveTimestamp: header.effective_timestamp,
      expiresAt: header.expires,
      basePhase: expectedPhase,
      scopedPhase: scopedPhase(header.detected_phase),
      engine: {
        phase: enginePhase,
        confidence: evaluated.report.result.confidence,
        severity: evaluated.report.result.severity,
        recordStatus: evaluated.report.result.recordStatus,
        replicationRisk: evaluated.report.result.replicationRisk,
        ledgerEntryId: ledgerEntryId(header.header_id),
        finding: evaluated.report.result.finding
      },
      ids: {
        // One ingest draft per content revision; the series ID is stable across
        // revisions so corrections stay in one history, exactly as owner
        // publications do.
        draftId: uuidFrom(`draft:${header.header_id}:v${revision}`),
        runId: uuidFrom(`run:${header.header_id}:v${revision}`),
        seriesId: uuidFrom(seriesSeed),
        publicationId: uuidFrom(`publication:${header.header_id}:v${revision}`)
      },
      hashes: { rawInputHash, privateReportHash: privateHash, publicReportHash: publicHash },
      input,
      privateReport: evaluated.report,
      publicReport
    });
    if (verbose) {
      console.log(`  ${header.header_id}  ${expectedPhase.padEnd(11)} ${enginePhase.padEnd(11)} ${evaluated.report.result.recordStatus}`);
    }
  }

  const manifest = {
    format: FORMAT,
    generator: 'scripts/case-studies-d1.mjs',
    revision,
    registry: {
      file: 'case-studies/pdh-registry.json',
      version: registry.version,
      instrument: registry.instrument,
      issuer: registry.issuer,
      issuedAt,
      evidenceCutoff: registry.evidence_cutoff,
      expiresAt: registry.expires_at,
      counts: registry.counts
    },
    publishedBy: {
      author: AUTHOR,
      account,
      engineSha256: ENGINE_SHA256,
      evaluatorSha256: EVALUATOR_SHA256
    },
    policy: {
      reviewStatus: 'UNREVIEWED',
      platformCertification: 'NONE',
      entityAttestation: 'ABSENT',
      pdhValid: false,
      notes: [
        'Register-issued PDH-R records only: no entity declaration (PDH-E) exists for any audited entity.',
        'A rebuild with changed source content publishes a new revision; published versions are never edited.',
        'The engine is re-run over the register\'s recorded answers; the base phase must reproduce before emission.'
      ]
    },
    records
  };
  return { manifest, warnings };
}

/* ── D1 seed ────────────────────────────────────────────────── */
const sqlText = value => `'${String(value).replaceAll("'", "''")}'`;

function emitSeed(manifest) {
  const { records, publishedBy } = manifest;
  const lines = [];
  lines.push('-- Ground-0 case-study register → D1 public register seed (generated; do not edit).',
    '--',
    `-- Format ${manifest.format} · content revision ${manifest.revision} · ${records.length} register-issued PDH-R records.`,
    '-- Source of truth: case-studies/d1/case-studies-d1.json, rebuilt by `npm run case-studies:build`.',
    '--',
    '-- Apply (owner-run):',
    '--   local:      npx wrangler d1 execute COMMUNITY_DB --local --config tests/fixtures/community-d1-local.jsonc \\',
    '--                 --persist-to .wrangler/community-foundation-tests --file case-studies/d1/case-studies-seed.sql',
    '--   staging:    npx wrangler d1 execute COMMUNITY_DB --config wrangler.staging.jsonc --remote --file case-studies/d1/case-studies-seed.sql',
    '--   production: npx wrangler d1 execute COMMUNITY_DB --remote --file case-studies/d1/case-studies-seed.sql (after the gate in docs/deployment/COMMUNITY-D1.md)',
    '--',
    '-- Idempotent: every insert is ON CONFLICT DO NOTHING and each row identity is derived from its',
    '-- PDH-R header ID. Re-running unchanged content changes nothing. If a record with the same',
    '-- series and revision already exists with different content, the guards below abort the file',
    '-- instead of silently replacing a published version — corrections are new versions:',
    '--   npm run case-studies:build -- --revision ' + (manifest.revision + 1),
    '--',
    '-- Every row here is register-issued, UNREVIEWED and UNATTESTED; entity attestation is ABSENT and',
    '-- PDH_VALID remains FALSE for every audited entity. This seed writes only the public register:',
    '-- no community_sessions, community_previews, or private-draft data is created or read.',
    '');
  lines.push('-- 1/4 · conflict guards (abort before any insert if a published revision changed content)');
  for (const record of records) {
    lines.push(`INSERT INTO community_schema (component, version)`,
      `  SELECT ${sqlText(`case-studies-d1:conflict:${record.headerId}`)}, 0`,
      `  WHERE EXISTS (SELECT 1 FROM community_publications`,
      `    WHERE series_id = ${sqlText(record.ids.seriesId)} AND version = ${manifest.revision}`,
      `      AND preview_hash <> ${sqlText(record.hashes.publicReportHash)});`);
  }
  lines.push('', '-- 2/4 · register ingest account (synthetic owner: no session, no sign-in path, issuer namespace never asserted by the provider)');
  lines.push(`INSERT INTO community_users (id, oidc_issuer, oidc_subject, blocked, created_at)`,
    `  VALUES (${sqlText(publishedBy.account.id)}, ${sqlText(publishedBy.account.oidcIssuer)}, ${sqlText(publishedBy.account.oidcSubject)}, 0, ${publishedBy.account.createdAt})`,
    `  ON CONFLICT DO NOTHING;`, '');
  lines.push('-- 3/4 · process marker (applied content revision)');
  lines.push(`INSERT INTO community_schema (component, version) VALUES ('case-studies-d1', ${manifest.revision})`,
    `  ON CONFLICT(component) DO UPDATE SET version = excluded.version WHERE excluded.version > community_schema.version;`, '');
  lines.push('-- 4/4 · drafts, runs, series, and publications');
  for (const record of records) {
    const inputJson = JSON.stringify(record.input);
    lines.push(`/* ${record.headerId} · ${record.entity} · ${record.engine.phase} (${record.engine.confidence}) · ${record.hashes.publicReportHash.slice(0, 16)}… */`,
      `INSERT INTO community_drafts (id, owner_id, revision, title, input_json, private_notes, created_at, updated_at)`,
      `  VALUES (${sqlText(record.ids.draftId)}, ${sqlText(publishedBy.account.id)}, 1,`,
      `    ${sqlText(`Register ingest · ${record.headerId}`)}, ${sqlText(inputJson)}, '', ${publishedBy.account.createdAt}, ${publishedBy.account.createdAt})`,
      `  ON CONFLICT DO NOTHING;`,
      `INSERT INTO community_runs (id, draft_id, owner_id, revision, engine_hash, evaluator_hash, report_hash, phase, report_json, created_at)`,
      `  VALUES (${sqlText(record.ids.runId)}, ${sqlText(record.ids.draftId)}, ${sqlText(publishedBy.account.id)}, 1,`,
      `    ${sqlText(ENGINE_SHA256)}, ${sqlText(EVALUATOR_SHA256)}, ${sqlText(record.hashes.privateReportHash)}, ${sqlText(record.engine.phase)},`,
      `    ${sqlText(JSON.stringify(record.privateReport))}, ${Date.parse(record.effectiveTimestamp)})`,
      `  ON CONFLICT DO NOTHING;`,
      `INSERT INTO community_public_series (id, draft_id)`,
      `  VALUES (${sqlText(record.ids.seriesId)}, ${sqlText(record.ids.draftId)}) ON CONFLICT DO NOTHING;`,
      `INSERT INTO community_publications (id, owner_id, draft_id, run_id, revision, series_id, version, preview_hash, state, title, author, phase, report_json, report_hash, created_at, changed_at)`,
      `  SELECT ${sqlText(record.ids.publicationId)}, ${sqlText(publishedBy.account.id)}, ${sqlText(record.ids.draftId)}, ${sqlText(record.ids.runId)}, 1,`,
      `    ${sqlText(record.ids.seriesId)}, ${manifest.revision}, ${sqlText(record.hashes.publicReportHash)}, 'published',`,
      `    json_extract(record.report, '$.input.name'), json_extract(record.report, '$.author'), json_extract(record.report, '$.result.phase'),`,
      `    record.report, ${sqlText(record.hashes.publicReportHash)},`,
      `    ${Date.parse(record.effectiveTimestamp)}, ${Date.parse(record.effectiveTimestamp)}`,
      `  FROM (SELECT ${sqlText(JSON.stringify(record.publicReport))} AS report) AS record`,
      `  WHERE NOT EXISTS (SELECT 1 FROM community_publications WHERE series_id = ${sqlText(record.ids.seriesId)} AND version = ${manifest.revision});`);
  }
  lines.push('', '-- Verification (read-only): the applied register rows for the News application.');
  lines.push(`SELECT p.seq, p.version, p.state, p.phase, p.title, p.report_hash`,
    `  FROM community_publications p WHERE p.owner_id = ${sqlText(publishedBy.account.id)}`,
    `  ORDER BY p.seq;`);
  lines.push(`SELECT (SELECT COUNT(*) FROM community_publications WHERE owner_id = ${sqlText(publishedBy.account.id)}) AS register_rows,`,
    `       (SELECT COUNT(*) FROM community_public_series WHERE id IN (${records.map(r => sqlText(r.ids.seriesId)).join(', ')})) AS register_series;`);
  lines.push('');
  return lines.join('\n');
}

function renderArtifacts(manifest) {
  // The private run envelope is part of the published chain (community_runs) and is
  // carried in the seed; the review JSON keeps its hash without duplicating the body.
  const review = { ...manifest, records: manifest.records.map(({ privateReport, ...rest }) => rest) };
  return {
    json: JSON.stringify(review, null, 2) + '\n',
    sql: emitSeed(manifest)
  };
}

/* ── CLI ────────────────────────────────────────────────────── */
export { compile, renderArtifacts, emitSeed, withFrozenClock };

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!isMain) {
  // Imported by tests or tooling: expose the functions without running the CLI.
} else {
const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const index = argv.indexOf(name);
  return index === -1 ? fallback : argv[index + 1];
};
const check = argv.includes('--check');
const verbose = argv.includes('--verbose');
const revision = Number(option('--revision', '1'));
if (!Number.isSafeInteger(revision) || revision < 1) fail('--revision must be a positive integer.');

const { manifest, warnings } = await compile({ revision, verbose });
const artifacts = renderArtifacts(manifest);
const jsonPath = path.join(OUT_DIR, 'case-studies-d1.json');
const sqlPath = path.join(OUT_DIR, 'case-studies-seed.sql');

if (check) {
  const [existingJson, existingSql] = await Promise.all([
    readFile(jsonPath, 'utf8').catch(() => null),
    readFile(sqlPath, 'utf8').catch(() => null)
  ]);
  const stale = [];
  if (existingJson !== artifacts.json) stale.push('case-studies/d1/case-studies-d1.json');
  if (existingSql !== artifacts.sql) stale.push('case-studies/d1/case-studies-seed.sql');
  if (stale.length) {
    console.error(`Stale generated artifact(s): ${stale.join(', ')}. Run: npm run case-studies:build`);
    process.exit(1);
  }
  console.log(`Checked ${manifest.records.length} register records: artifacts match the case-studies sources.`);
} else {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(jsonPath, artifacts.json, 'utf8');
  await writeFile(sqlPath, artifacts.sql, 'utf8');
  console.log(`Processed ${manifest.records.length} register records (revision ${revision}) — engine phases reproduced.`);
  console.log(`  wrote case-studies/d1/case-studies-d1.json (${bytes(artifacts.json)} bytes)`);
  console.log(`  wrote case-studies/d1/case-studies-seed.sql (${bytes(artifacts.sql)} bytes)`);
}
for (const warning of warnings) console.warn(`warning: ${warning}`);
}
