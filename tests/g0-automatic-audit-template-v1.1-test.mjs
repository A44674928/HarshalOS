import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import '../js/g0-engine.js';

const template = await readFile(new URL('../docs/GROUND-0-AUTOMATIC-AUDIT-TEMPLATE-v1.1.md', import.meta.url), 'utf8');
const blocks = [...template.matchAll(/<!-- G0_AUDIT_INPUT_START -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- G0_AUDIT_INPUT_END -->/g)];
assert.equal(blocks.length, 1, 'v1.1 template has one bounded machine-input block');
const packet = JSON.parse(blocks[0][1]);
const G0 = globalThis.G0;

test('v1.1 automatic audit input has an explicit, separate versioned schema', () => {
  assert.equal(packet.schema, 'harshalos-ground0-audit-input-v1.1');
  assert.equal(packet.specificationVersion, '1.1');
  assert.equal(packet.input.version, '1.1');
  assert.equal(packet.input.inputSchema, G0.G0_INPUT_SCHEMA_V11);
  assert.deepEqual(Object.keys(packet.input).sort(), Object.keys(G0.newInput('1.1')).sort());
  assert.equal(packet.metadata.status, 'UNREVIEWED');
  assert.match(template, /ratified normative amendment.*specs\/normative\/ground-0-v1\.1\.md.*adopted 2026-10-14/);
  assert.match(template, /No API key needs to be stored in or sent from the HarshalOS website/);
  assert.match(template, /not\*\* a trusted clock, timestamp authority, or attestation of Ground-0/);
});

test('v1.1 cutoff starter is UTS-shaped but intentionally invalid until populated', () => {
  assert.deepEqual(Object.keys(packet.input.cutoff).sort(), ['utc', 'uts']);
  assert.deepEqual(Object.keys(packet.input.cutoff.uts).sort(), ['display', 'model', 'scale', 'scaledUDate']);
  assert.equal(packet.input.cutoff.uts.model, 'HOSUTS-UDate-v1');
  assert.equal(packet.input.cutoff.uts.scale, 6);
  assert.equal(G0.isUtsCutoff(packet.input.cutoff), false, 'blank sample fields cannot pass timestamp validation');
  assert.match(template, /conservatively treated as the end of its UTC day/);
});

test('v1.1 B4 and C2 template fields are the exact engine contract', () => {
  assert.deepEqual(Object.keys(packet.input.b4).sort(), [
    'action', 'actor', 'basis', 'binding', 'complete', 'denominator', 'end',
    'noPenalty', 'numerator', 'procedure', 'start', 'terminatesAction'
  ]);
  assert.deepEqual(Object.keys(packet.input.c2).sort(), ['invocation', 'outcomeSet', 'publishedRoute', 'sources']);
  assert.deepEqual(Object.keys(packet.input.c2.publishedRoute).sort(), ['criteria', 'sourceId']);
  assert.deepEqual(Object.keys(packet.input.c2.invocation).sort(), ['criteria', 'sourceId']);
  assert.deepEqual(Object.keys(packet.input.c2.outcomeSet).sort(), [
    'complete', 'denominator', 'numerator', 'outcomes', 'periodEnd', 'periodStart', 'sourceIds'
  ]);
  assert.deepEqual(packet.input.c2.sources, []);
  assert.match(template, /explicitly terminates the specified action/);
  assert.match(template, /the criteria actually used to invoke that route/);
  assert.match(template, /a source for every listed outcome/);
  assert.match(template, /explicit timezone/);
  assert.match(template, /explicit resolution `date`/);
  assert.match(template, /explicit resolution `date`/);
  assert.match(template, /at least 50% relief/);
});

test('template separates unreviewed input from engine-generated output', () => {
  for (const field of ['Entity_Name', 'Audit_Timestamp', 'Evidence_Cutoff', 'PDH_Status', 'Detected_Phase', 'Confidence_Level', 'Badge_Status', 'Duty_Collation_Entry_ID', 'Transition_History']) {
    assert.ok(template.includes(`\`${field}\``), `${field} remains an output-only field`);
  }
  assert.match(template, /candidateResult/);
  assert.match(template, /Never present an external AI's calculation as the site's result/);
});
