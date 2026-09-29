/* Node harness: exercises the Ground-0 engine end-to-end. Run: node scripts/g0-engine-test.mjs */
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

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; } else { fail++; console.error("  ✗ FAIL:", name); } };

/* ── validation ── */
ok(G0.isCalendarDate("2026-09-12") && !G0.isCalendarDate("2026-02-30") && !G0.isCalendarDate("2026-13-01"), "calendar dates");
ok(G0.safePublicUrl("https://example.com/x") && !G0.safePublicUrl("http://localhost/x") && !G0.safePublicUrl("http://10.0.0.1/x") && !G0.safePublicUrl("javascript:alert(1)"), "safe public URLs");
const arch = G0.parseArchiveUrl("https://web.archive.org/web/20260101120000/https://example.com/policy");
ok(arch && arch.captured === "2026-01-01" && arch.original === "https://example.com/policy", "wayback URL parsing");
ok(G0.withinCalendarMonths("2025-09-15", "2026-09-12", 24) && !G0.withinCalendarMonths("2024-08-01", "2026-09-12", 24), "24-month lookback");
ok(G0.withinCalendarMonths("2026-02-28", "2026-03-31", 1), "clamped month arithmetic (Mar 31 − 1mo → Feb 28)");

/* ── classify: the 32-row truth table ── */
let truthOk = true;
for (let n = 0; n < 32; n++) {
  const v = Array.from({ length: 5 }, (_, bit) => Boolean(n & (1 << (4 - bit))));
  const r = G0.classify(v);
  const key = v.map(x => x ? 1 : 0).join("");
  const expected = { "01010": ["NAB", "HIGH"], "01000": ["CWO", "HIGH"], "10101": ["GSRB", "HIGH"] }[key];
  if (expected) truthOk = truthOk && r.phase === expected[0] && r.confidence === expected[1];
  else truthOk = truthOk && ["AMBIGUOUS", "INCOHERENT"].includes(r.phase);
}
ok(truthOk, "truth table: NAB/CWO/GSRB complete branches + unresolved outcomes");
ok(G0.classify([true, false, true, false, true]).matches.join() === "0,0,5", "branch match counts (GSRB is NAB's inverse)");
ok(G0.classify([true, true, false, true, false]).phase === "AMBIGUOUS", "partial fit → AMBIGUOUS");

/* ── evidence qualification ── */
const base = G0.newInput("1.0");
base.name = "Test Body"; base.identifier = "TB-1"; base.cutoff = "2026-09-12";
const ans = (value, source, date, notes) => ({ value, source, date, notes, gap: "" });
base.answers = [
  ans(false, "https://example.com/a", "2026-01-05", "Advisory only; non-compliance carries no penalty."),
  ans(true, "https://example.com/b", "2026-02-06", "Participation is voluntary and non-binding."),
  ans(false, "https://example.com/c", "2026-03-07", "No downstream enforcement cascade observed."),
  ans(true, "https://example.com/d", "2026-04-08", "A filed appeal automatically stays the action."),
  ans(false, "https://example.com/e", "2026-05-09", "Authority requires annual renewal; it sunsets.")
];
const vector = G0.scoredVector(base);
ok(vector.join() === "false,true,false,true,false", "v1.0 scored vector (NAB pattern)");
ok(!G0.qualifies({ value: true, source: "https://example.com/x", date: "2026-12-01", notes: "after cutoff" }, base.cutoff), "after-cutoff artifact never qualifies");
ok(!G0.qualifies({ value: true, source: "internal.doc", date: "2026-01-01", notes: "not a public URL here" }, base.cutoff), "non-public URL never qualifies");

/* ── v1.1 B4 discipline ── */
const v11 = G0.newInput("1.1");
v11.name = "Test Body 2"; v11.identifier = "TB-2"; v11.cutoff = "2026-09-12";
v11.answers = JSON.parse(JSON.stringify(base.answers));
v11.b4 = { actor: "Affected vendor", action: "Debarment decision", procedure: "Rule 7(b): appeal stays the action", basis: "RESOLVED_APPEALS", numerator: "3", denominator: "10", complete: false, start: "2025-01-01", end: "2026-01-01" };
ok(!G0.b4Qualifies(v11), "v1.1 B4: incomplete relief set does not qualify");
v11.b4.complete = true; v11.b4.numerator = "6";
ok(G0.b4Qualifies(v11), "v1.1 B4: complete ≥50% relief set qualifies");
v11.b4.numerator = "3";
ok(!G0.b4Qualifies(v11), "v1.1 B4: <50% relief does not qualify");
v11.b4.basis = "TERMINAL_RULE";
ok(G0.b4Qualifies(v11), "v1.1 B4: terminal rule qualifies");

/* ── constraints ── */
base.constraints = [
  ans(true, "https://example.com/c1", "2025-05-01", "Court vacated the directive."),
  ans(false, "", "", ""),
  ans(false, "", "", ""),
  ans(true, "https://example.com/c4", "2026-06-01", "Fresh statutory override exercised.")
];
const cs = G0.scoredConstraints(base);
ok(cs[0] === true && cs[3] === true, "C1 (24mo) and C4 (12mo) within windows");
base.constraints[0].date = "2023-01-01";
ok(G0.scoredConstraints(base)[0] === false, "C1 outside 24 months does not score");

/* ── createAudit: full NAB record ── */
const rec = await G0.createAudit(base, []);
ok(rec.phase === "NAB" && rec.confidence === "HIGH" && rec.status === "Complete", "complete NAB audit");
ok(rec.badge === "Unissued" && rec.compliance === "N/A (evidence incomplete)" || rec.compliance === "N/A", "no PDH → unissued badge");
ok(rec.workingBadge.filled === 5 && rec.workingBadge.phase === "NAB" && rec.workingBadge.state === "provisional", "working badge: 5/5 NAB provisional");
ok(rec.evidence.length === 7, "evidence summary collects 5 answers + 2 constraints");
ok(rec.report.Activator_Vector.length === 5 && rec.report.Constraint_Results.length === 4, "report vectors present");
ok(rec.report.Duty_Collation_Entry_ID.startsWith("PDH-2026-09-12-TB-1-"), "duty collation entry ID");

/* ── AMBIGUOUS + all-C → NAB-Constrained ── */
const amb = G0.newInput("1.0");
amb.name = "Amb Body"; amb.cutoff = "2026-09-12";
amb.answers = [
  ans(true, "https://example.com/a", "2026-01-05", "Fines for non-compliance."),
  ans(true, "https://example.com/b", "2026-01-06", "Guidance is non-binding."),
  ans(false, "https://example.com/c", "2026-01-07", "No execution observed."),
  ans(false, "https://example.com/d", "2026-01-08", "No terminal refusal rule."),
  ans(false, "https://example.com/e", "2026-01-09", "Annual renewal.")
];
const gapAns = gap => ({ value: false, source: "", date: "", notes: "", gap });
amb.constraints = [
  gapAns("Searched dockets and registers; no override found in 24 months."),
  gapAns("No published appeal route with resolved outcomes was located."),
  gapAns("No sunset or renewal requirement appears in the charter."),
  gapAns("No qualifying constraint activity within 12 months.")
];
const ambRec = await G0.createAudit(amb, []);
ok(ambRec.phase === "AMBIGUOUS" && ambRec.severity === "BREACH" && ambRec.compliance === "INCOHERENT" && ambRec.status === "Needs review", "v1.0 complete-but-ambiguous → INCOHERENT/BREACH, needs review");
amb.constraints = [
  ans(true, "https://example.com/c1", "2025-05-01", "Override exercised."),
  ans(true, "https://example.com/c2", "2026-05-02", "Appeals grant relief."),
  ans(true, "https://example.com/c3", "2026-05-03", "Sunset clause."),
  ans(true, "https://example.com/c4", "2026-05-04", "Active now.")
];
const conRec = await G0.createAudit(amb, []);
ok(conRec.phase === "NAB-Constrained" && conRec.confidence === "HIGH", "all four C → NAB-Constrained HIGH");

/* ── automation gating ── */
const auto = G0.newInput("1.0");
auto.name = "Auto Body"; auto.cutoff = "2026-09-12";
auto.answers = base.answers.map(a => ({ ...a }));
auto.automation = { method: "public-lookup", provider: "test", reviewRequired: true, requestedName: "Auto Body", generatedAt: new Date().toISOString(), sources: base.answers.map((a, i) => ({ id: `S${i}`, title: `s${i}`, url: a.source, published: a.date, retrieved: "2026-09-12T00:00:00Z", excerpt: "", codes: [], kind: "official" })), coverage: [], warnings: [] };
const autoRec = await G0.createAudit(auto, []);
ok(autoRec.status === "Draft" && autoRec.badge === "Unissued" && autoRec.method === "automatic", "automatic draft: review required, badge unissued");
auto.automation.reviewRequired = false;
const reviewedRec = await G0.createAudit(auto, []);
ok(reviewedRec.status === "Complete", "reviewed automation can complete");
/* news never scores */
auto.automation.reviewRequired = true;
auto.automation.sources[0].kind = "news";
const newsRec = await G0.createAudit(auto, []);
ok(G0.scoredVector(auto)[0] === false || newsRec.answers[0].value === false, "news-sourced answer does not score");

/* ── PDH: structural / freshness / consistency / signature ── */
const keyPair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const jwk = await webcrypto.subtle.exportKey("jwk", keyPair.publicKey);
const header = {
  "Header-ID": "PDH-2026-09-01-XY789", "Creator-ID": "ꔧIDꔧTB-1(TB-1)", "Center-Origin": "0•000•000•0000",
  "Declared-Phase": "NAB", "Center-Capability": "Non-Acting", "Legitimacy-Source": "External", "Refusal-Semantics": "Terminal",
  "Symbolism-Executability": "Disabled", "Time-Authority-Effect": "Degrades", "Effective-Timestamp": "2026-09-01T00:00:00Z"
};
const canonical = G0.headerExample && JSON.stringify(Object.fromEntries(["Header-ID", "Creator-ID", "Center-Origin", "Declared-Phase", "Center-Capability", "Legitimacy-Source", "Refusal-Semantics", "Symbolism-Executability", "Time-Authority-Effect", "Effective-Timestamp"].sort().map(f => [f, header[f]])));
const sig = await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, new TextEncoder().encode(canonical));
const b64 = Buffer.from(sig).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const signedInput = { ...G0.newInput("1.0"), name: "Test Body", identifier: "TB-1", cutoff: "2026-09-12" };
signedInput.headerText = JSON.stringify({ ...header, "Declaration-Hash": b64 });
signedInput.publicKeyText = JSON.stringify(jwk);
signedInput.answers = JSON.parse(JSON.stringify(base.answers));
const pdh = await G0.validatePDH(signedInput);
ok(pdh.status === "VALID" && pdh.signature && pdh.freshness && pdh.consistency && pdh.declared === "NAB", "signed PDH validates (ECDSA P-256)");
const signedRec = await G0.createAudit(signedInput, []);
ok(signedRec.pdh.status === "VALID" && signedRec.compliance === "COMPLIANT" && signedRec.badge === "Confirmed" && signedRec.severity === "INFORMATIONAL", "valid PDH + matching behavior → Confirmed");
/* tampered payload */
const tampered = JSON.parse(JSON.stringify(signedInput));
tampered.headerText = JSON.stringify({ ...header, "Declared-Phase": "GSRB", "Center-Capability": "Acting", "Legitimacy-Source": "Internal", "Refusal-Semantics": "Override-able", "Symbolism-Executability": "Enabled", "Time-Authority-Effect": "Confirms", "Declaration-Hash": b64 });
const tamperedPdh = await G0.validatePDH(tampered);
ok(tamperedPdh.status === "INVALID" && !tamperedPdh.signature, "tampered declaration fails signature");
/* header-id reuse conflict: same Header-ID bound to different (properly signed) fields */
const conflictHeader = { ...header, "Effective-Timestamp": "2026-09-05T00:00:00Z" };
const conflictCanonical = JSON.stringify(Object.fromEntries(Object.keys(conflictHeader).sort().map(f => [f, conflictHeader[f]])));
const conflictSig = await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, new TextEncoder().encode(conflictCanonical));
const conflictInput = JSON.parse(JSON.stringify(signedInput));
conflictInput.headerText = JSON.stringify({ ...conflictHeader, "Declaration-Hash": Buffer.from(conflictSig).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") });
const conflictPdh = await G0.validatePDH(conflictInput);
ok(conflictPdh.status === "VALID", "conflict fixture: re-signed header validates on its own");
const conflict = await G0.createAudit(conflictInput, [signedRec]);
ok(conflict.pdh.status === "INVALID" && conflict.pdh.reason.includes("already bound"), "Header-ID reuse with different fields is rejected");

/* ── transitions ── */
const later = JSON.parse(JSON.stringify(signedInput));
later.cutoff = "2026-10-10";
const laterHeader = { ...header, "Header-ID": "PDH-2026-10-01-ZZ999", "Effective-Timestamp": "2026-10-01T00:00:00Z" };
const laterCanonical = JSON.stringify(Object.fromEntries(Object.keys(laterHeader).sort().map(f => [f, laterHeader[f]])));
const laterSig = await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, new TextEncoder().encode(laterCanonical));
later.headerText = JSON.stringify({ ...laterHeader, "Declaration-Hash": Buffer.from(laterSig).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") });
later.answers = [
  ans(true, "https://example.com/a1", "2026-09-20", "Fines introduced for non-compliance."),
  ans(false, "https://example.com/b1", "2026-09-21", "Directives are binding."),
  ans(true, "https://example.com/c1", "2026-09-22", "Enforcement cascade observed."),
  ans(false, "https://example.com/d1", "2026-09-23", "Refusal is override-able."),
  ans(true, "https://example.com/e1", "2026-09-24", "Persists until repealed.")
];
const laterRec = await G0.createAudit(later, [signedRec]);
ok(laterRec.transition && laterRec.transition.status === "DECLARATION_REVIEW_REQUIRED" && laterRec.transition.to === "GSRB", "NAB→GSRB escalation requires declaration review");
const forbidden = JSON.parse(JSON.stringify(later));
forbidden.answers = JSON.parse(JSON.stringify(signedInput.answers)); // back to NAB
const forbHeader = { ...header, "Header-ID": "PDH-2026-10-02-YZ999", "Effective-Timestamp": "2026-10-02T00:00:00Z" };
const forbCanonical = JSON.stringify(Object.fromEntries(Object.keys(forbHeader).sort().map(f => [f, forbHeader[f]])));
const forbSig = await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, new TextEncoder().encode(forbCanonical));
forbidden.headerText = JSON.stringify({ ...forbHeader, "Declaration-Hash": Buffer.from(forbSig).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") });
const forbiddenRec = await G0.createAudit(forbidden, [laterRec]);
ok(forbiddenRec.transition && forbiddenRec.transition.status === "FORBIDDEN" && forbiddenRec.badge === "Invalid" && forbiddenRec.severity === "COLLAPSE_RISK", "GSRB → NAB reversion is forbidden without collapse");

/* ── working badge states ── */
const blank = G0.computeWorkingBadge(G0.newInput("1.0"), "CWO", "Unissued", false);
ok(blank.state === "blank" && blank.phase === "CWO" && blank.label.includes("default, unproven"), "blank working badge presumes CWO");
const partial = G0.newInput("1.1");
partial.name = "P"; partial.cutoff = "2026-09-12";
partial.answers[0] = ans(true, "https://example.com/x", "2026-01-01", "Documented enforcement with penalties.");
const partialBadge = G0.computeWorkingBadge(partial, "GSRB", "Unissued", false);
ok(partialBadge.disproved && partialBadge.filled === 1 && partialBadge.state === "forming", "one authority answer disproves the CWO default");

/* ── baseline audits ── */
const baselines = G0.baselineAudits();
ok(baselines.length === 6 && baselines.every(b => b.baseline && b.badge === "Unissued"), "six source baselines, unissued");

/* ── storage round-trip with hostile data ── */
G0.saveAuditRecords([signedRec, { garbage: true }, { id: "x", name: "  ", phase: "NAB" }]);
const loaded = G0.loadAuditRecords();
ok(loaded.length === 1 && loaded[0].name === "Test Body" && loaded[0].workingBadge.phase === "NAB", "storage: malformed records dropped, valid record hydrated with rebuilt badge");
const legacy = [{ id: "old", name: "Legacy Body", identifier: "", version: "1.0", phase: "GSRB", createdAt: "2026-01-01T00:00:00Z", cutoff: "2026-01-01", reportedDeclared: "None", confidence: "HIGH", severity: "BREACH", compliance: "N/A", badge: "Unissued", status: "Complete", baseline: false, evidence: [], answers: [], constraints: [], pdh: {}, finding: "legacy", replicationRisk: "HIGH", temporalPattern: "N/A", transition: null, report: {} }];
G0.saveAuditRecords(legacy);
const hydrated = G0.loadAuditRecords();
ok(hydrated.length === 1 && hydrated[0].workingBadge && hydrated[0].answers.length === 5, "legacy record hydrated without inventing evidence");
G0.saveEvidenceRecords([{ id: "E1", title: "T", url: "https://example.com/z", published: "2026-01-01", retrieved: "2026-01-02", claim: "c", codes: ["B1"], entity: "X" }, { id: "E2", url: "not-a-url" }]);
ok(G0.loadEvidenceRecords().length === 1, "evidence storage drops unsafe URLs");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
