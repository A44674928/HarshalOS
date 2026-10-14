/* Node harness: what a silent record means, per criterion.
   Run: node --test tests/g0-absence-test.mjs

   The reading asks nine questions of a corpus. When the corpus says nothing,
   the instrument has to decide whether that silence is a finding about the
   entity or a gap in the search. It is only a finding where the question
   asked for something that lives in a published instrument, and only against
   a corpus that could have carried it. These tests hold that line. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

globalThis.window = globalThis;
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
};
globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
globalThis.URL.createObjectURL = () => "";
globalThis.URL.revokeObjectURL = () => {};

await import("../js/g0-engine.js");
const G0 = globalThis.G0;
const { ABSENCE } = G0;

/* Six dated primary records, two of them thin: a corpus that can carry a
   documentary finding. */
const solid = { recordsRead: 6, excerptOnlyRecords: 1, shortRecords: 1, undatedRecords: 0 };
/* The corpus from the OpenAI reading: 16 records read, of which 6 are
   excerpt-only, 10 are under 400 characters, and 3 are undated. */
const thin = { recordsRead: 16, excerptOnlyRecords: 6, shortRecords: 10, undatedRecords: 3 };

test("a documentary silence is a scored finding, not a gap in the search", () => {
  for (const code of ["B1", "B2", "C3"]) {
    const verdict = G0.absenceVerdict(code, solid);
    assert.equal(verdict.verdict, ABSENCE.NOT_DEMONSTRATED, `${code} is not demonstrated`);
    assert.ok(verdict.reason.length > 40, `${code} says why`);
  }
});

test("an occurrence silence is never a finding — it says the wrong records were supplied", () => {
  for (const code of ["B3", "C1", "C4"]) {
    const verdict = G0.absenceVerdict(code, solid);
    assert.equal(verdict.verdict, ABSENCE.NOT_ASSESSED, `${code} is not assessed, however solid the corpus`);
    assert.match(verdict.reason, /outcome records/i, `${code} names the records that would answer it`);
  }
});

test("C2 is mixed but its documentary half is a precondition, so its absence closes it", () => {
  const verdict = G0.absenceVerdict("C2", solid);
  assert.equal(verdict.verdict, ABSENCE.NOT_DEMONSTRATED);
  assert.match(verdict.reason, /published, accessible appeal route/i, "and says which route was missing");
});

test("B4 is mixed but its documentary halves are alternatives, so their absence does not close it", () => {
  const verdict = G0.absenceVerdict("B4", solid);
  assert.equal(verdict.verdict, ABSENCE.NOT_ASSESSED, "the relief record may still exist");
  assert.match(verdict.reason, /relief record/i, "and names the route that is still open");
});

test("B5 is inverted, and the instrument says so instead of picking a reading", () => {
  const verdict = G0.absenceVerdict("B5", solid);
  assert.equal(verdict.verdict, ABSENCE.NOT_DEMONSTRATED);
  assert.equal(verdict.inverted, true, "flagged, because the silence is also evidence that authority persists");
  assert.match(verdict.reason, /persists/i);
  assert.match(verdict.reason, /neither is scored automatically/i, "a human settles it");
});

test("against a thin corpus nothing is scored, and the reason is the corpus rather than the entity", () => {
  for (const code of ["B1", "C3"]) {
    const verdict = G0.absenceVerdict(code, thin);
    assert.equal(verdict.verdict, ABSENCE.NOT_ASSESSED, `${code} cannot be scored on that corpus`);
    assert.match(verdict.reason, /corpus cannot carry a finding/i);
    assert.match(verdict.reason, /16 records? read/);
    assert.match(verdict.reason, /19 of them/, "and it counts the excerpt-only, short and undated records");
  }
});

test("the corpus gate: three dated records, and thin ones not the majority", () => {
  assert.equal(G0.corpusCarriesDocuments(solid), true);
  assert.equal(G0.corpusCarriesDocuments(thin), false, "mostly thin");
  assert.equal(G0.corpusCarriesDocuments({ recordsRead: 2 }), false, "fewer than three");
  assert.equal(G0.corpusCarriesDocuments({ recordsRead: 4, shortRecords: 2 }), true, "exactly half is still a corpus");
  assert.equal(G0.corpusCarriesDocuments({ recordsRead: 4, shortRecords: 3 }), false, "more than half is not");
  assert.equal(G0.corpusCarriesDocuments({}), false, "no records at all");
});

test("a question the instrument has not typed is never scored", () => {
  const verdict = G0.absenceVerdict("Z9", solid);
  assert.equal(verdict.verdict, ABSENCE.NOT_ASSESSED, "the careful answer is the default");
});

test("every criterion the instrument asks is typed — a new question cannot ship untyped", () => {
  const asked = [
    ...G0.questions.map(q => q.code),
    ...G0.constraintQuestions.map(q => q.code)
  ];
  assert.ok(asked.length >= 9, `the instrument asks ${asked.length} questions`);
  for (const code of asked) {
    assert.ok(G0.CRITERION_KIND[code], `${code} is typed as documentary, occurrence, or mixed`);
  }
});

test("evidence handed over after the audit is admitted, but it does not cure the finding", () => {
  const after = G0.submissionReview({ date: "2026-10-20", independentlyDatedBefore: false }, "2026-10-13");
  assert.equal(after.status, "DECLARATION_REVIEW_REQUIRED");
  assert.equal(after.cures, false, "an appeal route published in an afternoon does not answer last week's question");
  assert.equal(after.transition, true, "it starts a transition instead");
  assert.match(after.reason, /after the cutoff/);

  const before = G0.submissionReview({ date: "2026-09-01", independentlyDatedBefore: false }, "2026-10-13");
  assert.equal(before.status, "DECLARATION_REVIEW_REQUIRED", "dated before the cutoff, but only the entity says so");
  assert.equal(before.transition, false);
  assert.match(before.reason, /claim about the entity/);
});

test("only independently corroborated, pre-cutoff material cures a finding", () => {
  const cured = G0.submissionReview({ date: "2026-09-01", independentlyDatedBefore: true }, "2026-10-13");
  assert.equal(cured.status, "ADMITTED");
  assert.equal(cured.cures, true);

  const undated = G0.submissionReview({}, "2026-10-13");
  assert.equal(undated.status, "DECLARATION_REVIEW_REQUIRED", "an undated submission cannot be placed against the cutoff");
  assert.equal(undated.cures, false);
});
