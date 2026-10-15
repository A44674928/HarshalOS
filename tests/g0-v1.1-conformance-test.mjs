/* Explicit conformance tests for the Ground-0 v1.1 candidate contract.
   These guard the UTS timestamp boundary, narrow B4 exit rule, and C2
   provenance requirements independently of the broader engine suite. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

globalThis.window = globalThis;
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
globalThis.URL.createObjectURL = () => '';
globalThis.URL.revokeObjectURL = () => {};

await import('../js/uts.js');
await import('../js/g0-engine.js');
const G0 = globalThis.G0;
const cutoff = G0.makeUtsCutoff('2026-10-02T12:00:00.000Z');

function c2Provenance() {
  return {
    publishedRoute: {
      sourceId: 'route',
      criteria: 'An appeal must be filed within thirty days and identify the challenged action.'
    },
    invocation: {
      sourceId: 'invocation',
      criteria: 'The listed matters invoked the published route under its stated filing criteria.'
    },
    outcomeSet: {
      sourceIds: ['set'],
      complete: true,
      periodStart: '2025-01-01',
      periodEnd: '2026-09-30',
      numerator: '2',
      denominator: '4',
      outcomes: [
        { caseId: 'CASE-001', outcome: 'RELIEF', date: '2025-02-01', sourceIds: ['out-1'] },
        { caseId: 'CASE-002', outcome: 'NO_RELIEF', date: '2025-04-01', sourceIds: ['out-2'] },
        { caseId: 'CASE-003', outcome: 'RELIEF', date: '2025-06-01', sourceIds: ['out-3'] },
        { caseId: 'CASE-004', outcome: 'NO_RELIEF', date: '2025-08-01', sourceIds: ['out-4'] }
      ]
    },
    sources: [
      { id: 'route', role: 'ROUTE', url: 'https://example.org/appeals', date: '2026-07-01', locator: 'Appeals section, paragraph 2', claim: 'Published route and invocation criteria.' },
      { id: 'invocation', role: 'INVOCATION', url: 'https://example.org/annual-report', date: '2026-07-02', locator: 'Annual report, page 14', claim: 'These matters invoked the published appeal route.' },
      { id: 'set', role: 'OUTCOME_SET', url: 'https://example.org/outcomes', date: '2026-07-03', locator: 'Resolved matters, table 3', claim: 'Complete bounded set of resolved appeal outcomes.' },
      { id: 'out-1', role: 'OUTCOME', url: 'https://example.org/case-001', date: '2026-07-04', locator: 'Disposition, paragraph 1', claim: 'The appeal granted relief in case one.' },
      { id: 'out-2', role: 'OUTCOME', url: 'https://example.org/case-002', date: '2026-07-05', locator: 'Disposition, paragraph 1', claim: 'The appeal denied relief in case two.' },
      { id: 'out-3', role: 'OUTCOME', url: 'https://example.org/case-003', date: '2026-07-06', locator: 'Disposition, paragraph 1', claim: 'The appeal granted relief in case three.' },
      { id: 'out-4', role: 'OUTCOME', url: 'https://example.org/case-004', date: '2026-07-07', locator: 'Disposition, paragraph 1', claim: 'The appeal denied relief in case four.' }
    ]
  };
}

function affirmativeC2Input() {
  const input = G0.newInput('1.1');
  input.name = 'Example Authority';
  input.identifier = 'EA-1';
  input.cutoff = cutoff;
  input.answers = [false, true, false, true, false].map((value, index) => ({
    value,
    source: `https://example.org/behavior-${index + 1}`,
    date: '2026-08-01',
    notes: `Public artifact supports behavioral answer ${index + 1}.`,
    gap: ''
  }));
  input.b4 = { ...input.b4, actor: 'Affected party', action: 'The named enforcement action', procedure: 'A filed appeal stays the specified action', basis: 'TERMINAL_RULE' };
  input.constraints = [
    { value: false, source: '', date: '', notes: '', gap: 'No recent external override was demonstrated.' },
    { value: true, source: 'https://example.org/appeals', date: '2026-07-01', notes: 'Published route with a bounded appeal record.', gap: '' },
    { value: false, source: '', date: '', notes: '', gap: 'No automatic expiry or renewal was demonstrated.' },
    { value: false, source: '', date: '', notes: '', gap: 'No recent functioning constraint was demonstrated.' }
  ];
  input.c2 = c2Provenance();
  return input;
}

const clone = value => JSON.parse(JSON.stringify(value));
const assertPositiveC2Rejected = async (input, requirement) => {
  await assert.rejects(
    G0.createAudit(input, []),
    error => error instanceof Error && /v1\.1 C2 conformance failed/.test(error.message),
    requirement
  );
};

test('v1.1 cutoff is a canonical UTC instant paired with the matching site UTS projection', () => {
  assert.equal(G0.G0_INPUT_SCHEMA_V11, 'harshalos-ground0-audit-input-v1.1');
  assert.equal(G0.isUtsCutoff(cutoff), true);
  const expectedParts = globalThis.HOSUTS.uDateParts(new Date(cutoff.utc));
  assert.equal(cutoff.uts.scaledUDate, expectedParts.scaledUDate);
  assert.equal(cutoff.uts.display, globalThis.HOSUTS.formatUDate(new Date(cutoff.utc)));
  assert.equal(cutoff.uts.model, 'HOSUTS-UDate-v1');

  assert.equal(G0.eligibleByCutoff('2026-10-02T11:59:59.999Z', cutoff), true);
  assert.equal(G0.eligibleByCutoff('2026-10-02T12:00:00.001Z', cutoff), false);
  assert.equal(G0.eligibleByCutoff('2026-10-02', cutoff), false,
    'a date-only artifact is conservatively treated as the end of that day');
  assert.equal(G0.eligibleByCutoff('2026-10-02', G0.makeUtsCutoff('2026-10-02T23:59:59.999Z')), true);

  const tampered = clone(cutoff);
  tampered.uts.scaledUDate = (BigInt(tampered.uts.scaledUDate) + 1n).toString();
  assert.equal(G0.isUtsCutoff(tampered), false, 'the coordinate must match the supplied UTC instant');
  assert.equal(G0.isUtsCutoff({ utc: '2026-10-02', uts: cutoff.uts }), false, 'a calendar date is not a timestamp');
});

test('v1.1 applies the exact timestamp to freshness, lookback, and report output', async () => {
  const input = affirmativeC2Input();
  input.constraints[1].date = '2026-10-02';
  input.c2.sources[0].date = '2026-10-02';
  await assertPositiveC2Rejected(input, 'same-day date-only evidence cannot be placed before a noon cutoff');

  const eligible = affirmativeC2Input();
  const record = await G0.createAudit(eligible, []);
  assert.equal(record.report.Specification_Status, 'NORMATIVE AMENDMENT');
  assert.equal(record.report.Constraint_Results[1].Scored_Answer, 'YES');
  assert.equal(record.report.Evidence_Cutoff.utc, cutoff.utc);
  assert.equal(record.report.Evidence_Cutoff.uts.scaledUDate, cutoff.uts.scaledUDate);
  assert.match(record.report.Evidence_Cutoff.timeTrust, /not a trusted time source/);
});

test('v1.1 rejects date-only or mismatched version contracts instead of silently defaulting', async () => {
  const input = affirmativeC2Input();
  input.cutoff = '2026-10-02';
  await assert.rejects(G0.createAudit(input, []), /v1\.1 requires a valid UTC timestamp/);

  const missingSchema = affirmativeC2Input();
  delete missingSchema.inputSchema;
  await assert.rejects(G0.createAudit(missingSchema, []), /v1\.1 requires inputSchema/);

  const wrongVersion = affirmativeC2Input();
  wrongVersion.version = '1.0';
  await assert.rejects(G0.createAudit(wrongVersion, []), /v1\.0 requires its unchanged YYYY-MM-DD cutoff/);

  const unknownVersion = affirmativeC2Input();
  unknownVersion.version = '2.0';
  await assert.rejects(G0.createAudit(unknownVersion, []), /must explicitly select Ground-0 v1\.0 or v1\.1/);
});

test('explicit version conversion preserves the v1.0 contract and applies the selected v1.1 schema', () => {
  const legacy = G0.newInput('1.0');
  legacy.name = 'Legacy Body';
  legacy.cutoff = '2026-10-02';
  legacy.b4.basis = 'NO_PENALTY_EXIT';
  legacy.c2.route = true;
  assert.equal(Object.hasOwn(legacy, 'inputSchema'), false);
  assert.equal(Object.hasOwn(legacy.b4, 'terminatesAction'), false);
  assert.deepEqual(Object.keys(legacy.c2), ['route', 'invoked', 'complete', 'numerator', 'denominator', 'start', 'end']);

  const v11 = G0.convertInputVersion(legacy, '1.1');
  assert.equal(v11.version, '1.1');
  assert.equal(v11.inputSchema, G0.G0_INPUT_SCHEMA_V11);
  assert.equal(v11.cutoff.utc, '2026-10-02T23:59:59.999Z');
  assert.equal(G0.isUtsCutoff(v11.cutoff), true);
  assert.equal(v11.b4.basis, 'NO_PENALTY_EXIT');
  assert.equal(v11.b4.binding, false);
  assert.equal(v11.b4.noPenalty, false);
  assert.equal(v11.b4.terminatesAction, false);
  assert.deepEqual(Object.keys(v11.c2).sort(), ['invocation', 'outcomeSet', 'publishedRoute', 'sources']);

  const backToV10 = G0.convertInputVersion(v11, '1.0');
  assert.equal(backToV10.version, '1.0');
  assert.equal(backToV10.cutoff, '2026-10-02');
  assert.equal(Object.hasOwn(backToV10, 'inputSchema'), false);
  assert.equal(Object.hasOwn(backToV10.b4, 'terminatesAction'), false);
  assert.deepEqual(Object.keys(backToV10.c2), ['route', 'invoked', 'complete', 'numerator', 'denominator', 'start', 'end']);
});

test('v1.1 schema rejects missing B4 flags and malformed C2 records even when C2 is not scored', async () => {
  const missingB4Flag = affirmativeC2Input();
  delete missingB4Flag.b4.terminatesAction;
  await assert.rejects(G0.createAudit(missingB4Flag, []), /explicit boolean B4 completeness, binding, noPenalty, and terminatesAction fields/);

  const malformedOutcome = affirmativeC2Input();
  malformedOutcome.constraints[1].value = false;
  malformedOutcome.c2.outcomeSet.outcomes = [{ caseId: 'CASE-X', outcome: 'RELIEF', sourceIds: [] }];
  await assert.rejects(G0.createAudit(malformedOutcome, []), /C2 outcomes must include a caseId, outcome, date, and string sourceIds array/);
});

test('C2 YES qualifies only with a published route and its invocation criteria', async () => {
  const missingRoute = affirmativeC2Input();
  missingRoute.c2.publishedRoute.sourceId = '';
  await assertPositiveC2Rejected(missingRoute, 'published route source is mandatory');

  const missingRouteCriteria = affirmativeC2Input();
  missingRouteCriteria.c2.publishedRoute.criteria = '';
  await assertPositiveC2Rejected(missingRouteCriteria, 'published route criteria are mandatory');

  const missingInvocation = affirmativeC2Input();
  missingInvocation.c2.invocation.sourceId = 'unlisted';
  await assertPositiveC2Rejected(missingInvocation, 'invocation record must resolve to a source');

  const missingInvocationCriteria = affirmativeC2Input();
  missingInvocationCriteria.c2.invocation.criteria = '';
  await assertPositiveC2Rejected(missingInvocationCriteria, 'the criteria actually used must be recorded');
});

test('C2 YES qualifies only with a complete, bounded, fully enumerated outcome set', async () => {
  const incomplete = affirmativeC2Input();
  incomplete.c2.outcomeSet.complete = false;
  await assertPositiveC2Rejected(incomplete, 'completeness must be explicit');

  const unbounded = affirmativeC2Input();
  unbounded.c2.outcomeSet.periodEnd = '';
  await assertPositiveC2Rejected(unbounded, 'the outcome period must be bounded');

  const incompleteSet = affirmativeC2Input();
  incompleteSet.c2.outcomeSet.sourceIds = [];
  await assertPositiveC2Rejected(incompleteSet, 'a source establishing completeness is required');

  const missingOutcome = affirmativeC2Input();
  missingOutcome.c2.outcomeSet.outcomes.pop();
  await assertPositiveC2Rejected(missingOutcome, 'denominator must equal the enumerated complete outcome set');

  const missingOutcomeSource = affirmativeC2Input();
  missingOutcomeSource.c2.outcomeSet.outcomes[0].sourceIds = [];
  await assertPositiveC2Rejected(missingOutcomeSource, 'each resolved outcome needs a supporting source');
});

test('C2 outcomes require dated resolutions within the complete set period and before the cutoff', async () => {
  const missingDate = affirmativeC2Input();
  delete missingDate.c2.outcomeSet.outcomes[0].date;
  await assert.rejects(G0.createAudit(missingDate, []), /C2 outcomes must include a caseId, outcome, date, and string sourceIds array/, 'each listed resolution needs an explicit eligible date');

  const outsidePeriod = affirmativeC2Input();
  outsidePeriod.c2.outcomeSet.outcomes[0].date = '2024-12-31';
  await assertPositiveC2Rejected(outsidePeriod, 'a resolved case outside the declared complete period cannot be counted');

  const afterCutoff = affirmativeC2Input();
  afterCutoff.c2.outcomeSet.outcomes[0].date = '2026-10-03';
  await assertPositiveC2Rejected(afterCutoff, 'a resolution after the explicit cutoff cannot enter the denominator');
});

test('C2 YES requires a valid, linked source set and a recomputed relief fraction of at least 50%', async () => {
  for (const mutate of [
    input => { input.c2.sources[0].url = 'javascript:alert(1)'; },
    input => { input.c2.sources[0].date = '2026-10-02'; },
    input => { input.c2.sources[0].locator = ''; },
    input => { input.c2.sources[0].claim = ''; },
    input => { input.constraints[1].source = 'https://example.org/not-in-the-source-set'; },
    input => { input.c2.outcomeSet.numerator = '3'; },
    input => { input.c2.outcomeSet.denominator = '5'; },
    input => { input.c2.outcomeSet.outcomes[0].outcome = 'NO_RELIEF'; }
  ]) {
    const invalid = affirmativeC2Input();
    mutate(invalid);
    await assertPositiveC2Rejected(invalid, 'incomplete or inconsistent C2 provenance must fail closed');
  }

  const belowThreshold = affirmativeC2Input();
  belowThreshold.c2.outcomeSet.outcomes[0].outcome = 'NO_RELIEF';
  belowThreshold.c2.outcomeSet.numerator = '1';
  assert.equal(G0.validateC2Evidence(belowThreshold).valid, false);
  await assertPositiveC2Rejected(belowThreshold, 'less than half of the complete outcomes cannot qualify');

  const valid = affirmativeC2Input();
  const checked = G0.validateC2Evidence(valid);
  assert.equal(checked.valid, true);
  assert.equal(checked.numerator, 2);
  assert.equal(checked.denominator, 4);
  assert.equal(checked.reliefRate, 0.5);
  assert.equal(G0.scoredConstraints(valid)[1], true);
});

test('v1.0 remains on the original date-only input and scoring contract', async () => {
  const input = G0.newInput('1.0');
  assert.equal(typeof input.cutoff, 'string');
  assert.equal(G0.isCalendarDate(input.cutoff), true);
  assert.equal(Object.hasOwn(input, 'inputSchema'), false);
  assert.deepEqual(Object.keys(input.c2), ['route', 'invoked', 'complete', 'numerator', 'denominator', 'start', 'end']);
  assert.equal(Object.hasOwn(input.b4, 'terminatesAction'), false);

  input.name = 'Legacy Body';
  input.identifier = 'LB-1';
  input.cutoff = '2026-10-02';
  input.answers = [false, true, false, true, false].map((value, index) => ({
    value, source: `https://example.org/v1-${index + 1}`, date: '2026-08-01',
    notes: `Legacy v1.0 evidence ${index + 1}.`, gap: ''
  }));
  input.answers[3].notes = 'A penalty-free exit was cited using the v1.0 rule.';
  input.constraints = Array.from({ length: 4 }, () => ({ value: false, source: '', date: '', notes: '', gap: 'Not assessed under this v1.0 vector.' }));
  input.b4.basis = 'NO_PENALTY_EXIT';
  assert.equal(G0.scoredVector(input)[3], true, 'v1.0 does not inherit the v1.1 B4 threshold');
  const record = await G0.createAudit(input, []);
  assert.equal(record.phase, 'NAB');
  assert.equal(record.report.Evidence_Cutoff, '2026-10-02T23:59:59.999Z');
  assert.equal(record.report.Specification_Status, 'NORMATIVE BASELINE');
});
