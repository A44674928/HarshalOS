import '../js/g0-engine.js';
import { CommunityError } from './community-db.mjs';
import { ENGINE_SHA256, EVALUATOR_SHA256 } from './community-engine-version.mjs';
const engine = (typeof window !== 'undefined' ? window : globalThis).G0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new CommunityError(422, message); };
export function canonical(value, depth = 0) {
  if (depth > 32) fail('Input nesting exceeds 32 levels.');
  if (Array.isArray(value)) return '[' + value.map(v => canonical(v, depth + 1)).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k], depth + 1)).join(',') + '}';
  if (value === undefined || (typeof value === 'number' && !Number.isFinite(value))) fail('Input contains a non-JSON value.');
  return JSON.stringify(value);
}
export async function sha256(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
}
export function auditTemplate(version = '1.0') {
  if (!['1.0', '1.1'].includes(version)) fail('Choose Ground-0 1.0 or 1.1.');
  return engine.newInput(version);
}
function typed(raw, defaults, path) {
  if (!object(raw)) fail(`${path} must be an object.`);
  for (const key of Object.keys(defaults)) {
    if (raw[key] !== undefined && typeof raw[key] !== typeof defaults[key]) fail(`${path}.${key} has an invalid type.`);
  }
}
export function normalizeRunInput(raw) {
  if (!object(raw)) fail('Audit input must be an object.');
  if (!['1.0', '1.1'].includes(raw.version)) fail('Input.version must explicitly be "1.0" or "1.1".');
  if (typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 200) fail('Input.name must contain 1–200 characters.');
  if (!engine.isCalendarDate(raw.cutoff)) fail('Input.cutoff must be a real YYYY-MM-DD date; it is never filled in silently.');
  for (const [field, count] of [['answers', 5], ['constraints', 4]]) {
    if (!Array.isArray(raw[field]) || raw[field].length !== count) fail(`Input.${field} must contain exactly ${count} answers.`);
    for (const answer of raw[field]) {
      if (!object(answer) || ![true, false, null].includes(answer.value)) fail(`${field} values must be true, false or null (unknown).`);
      for (const key of ['source', 'date', 'notes', 'gap']) if (answer[key] !== undefined && typeof answer[key] !== 'string') fail(`${field}.${key} must be text.`);
    }
  }
  const defaults = engine.newInput(raw.version);
  for (const key of ['identifier', 'headerText', 'publicKeyText', 'trustedOrigin']) if (raw[key] !== undefined && typeof raw[key] !== 'string') fail(`Input.${key} must be text.`);
  for (const key of ['b4', 'c2', 'external', 'decrement']) if (raw[key] !== undefined) typed(raw[key], defaults[key], key);
  if (raw.automation !== undefined) {
    if (!object(raw.automation)) fail('Automation provenance must be an object, not removed or coerced.');
    if (raw.automation.reviewRequired !== undefined && typeof raw.automation.reviewRequired !== 'boolean') fail('automation.reviewRequired must be boolean.');
    if (raw.automation.sources !== undefined && (!Array.isArray(raw.automation.sources) || raw.automation.sources.length > 100)) fail('Automation sources must be an array of at most 100 entries.');
    for (const source of raw.automation.sources || []) {
      if (!object(source)) fail('Each automation source must be an object.');
      if (source.scoringEligible !== undefined && typeof source.scoringEligible !== 'boolean') fail('Source scoringEligible must be boolean.');
      if (source.kind !== undefined && !['official', 'court', 'regulatory', 'legislative', 'news', 'archive', 'public', 'context'].includes(source.kind)) fail('Invalid source kind.');
      if (source.dateBasis !== undefined && !['publication', 'archive-capture', 'indexed', 'unknown'].includes(source.dateBasis)) fail('Invalid source date basis.');
    }
  }
  // The browser's exact normalizer, retaining unknown answers and automation gates.
  const input = engine.normalizeAuditInput(raw, raw.version);
  if (input.automation) {
    // Text bodies/provider diagnostics do not participate in scoring. Preserve all
    // operative source eligibility flags and the author's reviewRequired claim.
    const { method, reviewRequired, sources } = input.automation;
    input.automation = { method, reviewRequired, sources: sources.map(({ text, ...source }) => source) };
  }
  return input;
}
export async function evaluateSavedInput(raw) {
  const rawInputHash = await sha256(raw);
  const input = normalizeRunInput(raw);
  // Deliberate single-record scope. Draft runs are NOT accepted temporal evidence.
  const record = await engine.createAudit(input, []);
  const report = {
    schema: 'ground0-private-run-v1', reviewStatus: 'UNREVIEWED', platformCertification: 'NONE',
    engine: { version: input.version, sourceSha256: ENGINE_SHA256, evaluatorSha256: EVALUATOR_SHA256,
      specificationStatus: input.version === '1.0' ? 'NORMATIVE BASELINE' : 'AMENDMENT DRAFT — NOT RATIFIED' },
    scope: { mode: 'SINGLE_RECORD', externalSourcesFetched: false, independentEvidenceVerification: false,
      independentIdentityVerification: false, globalDeclarationRegistryChecked: false, crossRunDeclarationConflictsChecked: false, temporalHistoryEvaluated: false,
      notes: 'Rules applied to author-submitted claims only. Source eligibility is not source verification. Signature checks use the supplied key/origin, not a certified identity. NO is sometimes a scoring code, not proof of absence. Engine badge/completeness labels are not platform certification.' },
    rawInputHash, input,
    result: { phase: record.phase, confidence: record.confidence, severity: record.severity,
      compliance: record.compliance, computedBadge: record.badge, recordStatus: record.status,
      finding: record.finding, pdh: record.pdh, workingBadge: record.workingBadge,
      activatorVector: record.report.Activator_Vector, constraintResults: record.report.Constraint_Results,
      branchMatches: record.report.Branch_Matches, replicationRisk: record.replicationRisk,
      automationReviewRequired: input.automation ? input.automation.reviewRequired : null }
  };
  const json = canonical(report);
  if (new TextEncoder().encode(json).length > 196608) throw new CommunityError(413, 'Evaluated report exceeds 192 KiB. Reduce input size before running.');
  return { report, json, reportHash: await sha256(report) };
}
