import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import '../js/g0-engine.js';

const template = await readFile(new URL('../docs/GROUND-0-AUTOMATIC-AUDIT-TEMPLATE-v1.0.md', import.meta.url), 'utf8');
const blocks = [...template.matchAll(/<!-- G0_AUDIT_INPUT_START -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- G0_AUDIT_INPUT_END -->/g)];
assert.equal(blocks.length, 1, 'template has exactly one bounded machine-input block');
const packet = JSON.parse(blocks[0][1]);
const G0 = globalThis.G0;

test('Ground-0 automatic audit template is explicitly locked to textbook v1.0', () => {
  assert.equal(packet.schema, 'harshalos-ground0-audit-input-v1');
  assert.equal(packet.specificationVersion, '1.0');
  assert.equal(packet.input.version, '1.0');
  assert.equal(packet.metadata.status, 'UNREVIEWED');
  assert.match(template, /No API key needs to be stored in or sent from the HarshalOS website/);
  assert.match(template, /must not imply that it discovered or independently verified that evidence/);
  assert.match(template, /Part XI/);
  assert.match(template, /specs\/normative\/ground-0-v1\.0\.md/);
  assert.match(template, /does \*\*not\*\* silently incorporate the ratified \[v1\.1 normative amendment\]/);
  assert.match(template, /do not apply a v1\.1 B4 threshold/i);
});

test('machine input matches the current Ground-0 engine input shape', () => {
  assert.deepEqual(Object.keys(packet.input).sort(), Object.keys(G0.newInput('1.0')).sort());
  assert.equal(packet.input.answers.length, 5);
  assert.equal(packet.input.constraints.length, 4);
  for (const answer of [...packet.input.answers, ...packet.input.constraints]) {
    assert.deepEqual(Object.keys(answer).sort(), ['date', 'gap', 'notes', 'source', 'value']);
    assert.equal(answer.value, null);
  }
  assert.deepEqual(Object.keys(packet.evidence[0]).sort(), [
    'claimSupported', 'directUrl', 'effectiveDate', 'evidenceClass', 'exactQuote', 'id',
    'locator', 'publicationDate', 'retrievedAt', 'sourceType', 'supports', 'title', 'url'
  ]);
});

test('unknowns are explicit and cannot be silently scored as negative or complete', () => {
  assert.match(template, /`null` is never a negative finding/);
  assert.match(template, /Every B1–B5 answer must be binary/);
  assert.match(template, /If Step 3 is AMBIGUOUS, all four C answers must be binary/);
  assert.match(template, /never coerce `null` to `false`/);
  assert.match(template, /NOT_ASSESSED — Step 3\.5 not triggered/);
  assert.match(template, /starter E1 object.*placeholder, not a source/);
});

test('template carries locatable public evidence and preserves all textbook output fields', () => {
  for (const field of ['directUrl', 'locator', 'exactQuote', 'claimSupported', 'retrievedAt']) {
    assert.ok(template.includes(`"${field}"`), `${field} supports later source review`);
  }
  for (const field of [
    'Entity_Name', 'Entity_Identifier', 'Audit_Timestamp', 'PDH_Status', 'Declared_Phase',
    'Detected_Phase', 'Compliance_Status', 'Confidence_Level', 'Severity_Level',
    'Badge_Status', 'Finding', 'Evidence_Summary', 'Duty_Collation_Entry_ID',
    'Replication_Risk', 'Temporal_Pattern', 'Transition_History'
  ]) assert.ok(template.includes(`\`${field}\``), `${field} is retained from the textbook output contract`);
  assert.match(template, /does not provide a predicate for choosing between those outcomes/);
});
