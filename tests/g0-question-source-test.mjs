/* Node harness: the question, the answer and the variable come from one source.
   Run: node --test tests/g0-question-source-test.mjs

   A variable that is retyped into a document instead of generated from the
   instrument is a variable waiting to drift. It already has: the engine
   calls B4's variable refusal_terminal, and twenty-two places in the case
   studies print refusal_override for the same answer, because v1.0 named the
   exception rather than the negation. That is defensible as a convention and
   indefensible as a coincidence, so the convention lives here, in one table,
   and the documents are held to it. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";

globalThis.window = globalThis;
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
globalThis.URL.createObjectURL = () => "";
globalThis.URL.revokeObjectURL = () => {};

await import("../js/g0-engine.js");
const G0 = globalThis.G0;

const markdownUnder = root => {
  const out = [];
  const walk = dir => {
    for (const entry of readdirSync(dir)) {
      const path = `${dir}/${entry}`;
      if (statSync(path).isDirectory()) walk(path);
      else if (entry.endsWith(".md")) out.push(path);
    }
  };
  walk(root);
  return out;
};

/* The hand-authored documents: the specs and the case studies themselves.
   case-studies/d1 is generated, and is excluded — it carries the residue of
   a separate bug, fixed in js/g0-research.js, that stripped underscores out
   of identifiers when stripping markdown emphasis. */
const documents = [
  ...markdownUnder("specs"),
  ...readdirSync("case-studies").filter(name => name.endsWith(".md")).map(name => `case-studies/${name}`)
];

const TAGS = /\(([A-Za-z0-9_]+)\s*=\s*(TRUE|FALSE)\)/g;

test("every behavioural question has one declared variable, and the engine agrees with it", () => {
  for (const code of ["B1", "B2", "B3", "B4", "B5"]) {
    const names = G0.ANSWER_VARIABLES[code];
    assert.ok(names, `${code} declares its variables`);
    assert.equal(G0.variableFor(code), names.yes, `${code}'s canonical variable is the affirmative`);
    const question = G0.questionByCode(code);
    assert.equal(question.variable, names.yes, `and the question names the same one (${question.variable})`);
  }
});

test("the tag for an answer is built from the table, so it cannot be mistyped", () => {
  assert.equal(G0.answerTag("B1", true), "(enforcement_present = TRUE)");
  assert.equal(G0.answerTag("B1", false), "(enforcement_present = FALSE)");
  assert.equal(G0.answerTag("B2", false), "(decisions_optional = FALSE)");
  assert.equal(G0.answerTag("B4", true), "(refusal_terminal = TRUE)");
  /* The v1.0 name: refusal_override is TRUE when B4 is NO, which is the
     convention that reads as drift everywhere it is not declared. */
  assert.equal(G0.answerTag("B4", false), "(refusal_override = TRUE)");
  assert.equal(G0.answerTag("B5", false), "(authority_time_bound = TRUE)");
  assert.equal(G0.answerTag("B4", null), "(refusal_terminal = UNKNOWN)");
  assert.equal(G0.answerTag("Z9", true), "", "and an unasked question has no tag");
});

test("every variable printed in the specs and the case studies is one the instrument declares", () => {
  const declared = new Set(G0.INSTRUMENT_VARIABLES);
  for (const names of Object.values(G0.ANSWER_VARIABLES)) {
    declared.add(names.yes);
    declared.add(names.no);
  }
  const unknown = new Map();
  let seen = 0;
  for (const path of documents) {
    const text = readFileSync(path, "utf8");
    for (const match of text.matchAll(TAGS)) {
      seen += 1;
      if (!declared.has(match[1])) unknown.set(match[1], (unknown.get(match[1]) || 0) + 1);
    }
  }
  assert.ok(seen > 100, `the documents print ${seen} answer tags, so the guard is looking at them`);
  assert.deepEqual([...unknown.keys()], [],
    `undeclared variable names in the documents: ${[...unknown.entries()].map(([name, n]) => `${name} ×${n}`).join(", ")}`);
});

test("no identifier is mangled: stripping markdown emphasis keeps the underscores inside a name", () => {
  const source = readFileSync("js/g0-research.js", "utf8");
  assert.doesNotMatch(source, /replace\(\/\[\*_#`\]\/g/, "underscores are no longer stripped wholesale");
  assert.match(source, /replace\(\/\[\*#`\]\/g/, "asterisks, hashes and backticks still are");
  assert.match(source, /\(\^\|\[\^A-Za-z0-9\]\)_\+/, "an underscore at a word edge is emphasis");
  assert.match(source, /_\+\(\?!\[A-Za-z0-9\]\)/, "and one between two word characters is part of the name");
});

test("the instrument's own documentation agrees with the table it documents", () => {
  const source = readFileSync("js/g0-app.js", "utf8");
  for (const [code, names] of Object.entries(G0.ANSWER_VARIABLES)) {
    const question = G0.questionByCode(code);
    assert.ok(source.includes(`"${code} ·`), `${code} is documented for the reader`);
    assert.ok(source.includes(names.yes), `${code}'s affirmative name (${names.yes}) appears in the table`);
    if (names.yes !== names.no) {
      assert.ok(source.includes(names.no), `${code}'s exception name (${names.no}) is disclosed, not left to be discovered`);
    }
    assert.ok(question && question.title, `${code} has a title`);
  }
});
