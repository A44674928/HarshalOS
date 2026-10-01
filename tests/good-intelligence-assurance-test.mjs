import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const moduleSource = await readFile(new URL("../js/good-intelligence-assurance.js", import.meta.url), "utf8");
const NOW = Date.parse("2026-09-30T12:00:00.000Z");

function harness({ storedAudits = null, normalizeAuditRecord = value => value } = {}) {
  const values = new Map();
  const writes = [];
  if (storedAudits !== null) values.set("ground-0-audits-v1", JSON.stringify(storedAudits));
  const window = {
    localStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { writes.push([key, String(value)]); values.set(key, String(value)); }
    },
    G0: { normalizeAuditRecord }
  };
  const context = vm.createContext({ window, URL, Date });
  vm.runInContext(moduleSource, context, { filename: "js/good-intelligence-assurance.js" });
  return { Assurance: window.GoodIntelligenceAssurance, writes };
}

function completePacket(overrides = {}) {
  return {
    schema: "gi-assurance-v1",
    assessmentId: "assessment-1",
    assessedAt: "2026-09-30T10:00:00.000Z",
    source: {
      identity: { status: "verified", method: "signed-registry", verifiedAt: "2026-09-30T10:00:00.000Z" },
      ground0: { status: "verified", phase: "NAB", badgeStatus: "confirmed", version: "1.0", auditId: "g0-1", assessedAt: "2026-09-29T10:00:00.000Z" },
      pdh: { status: "valid", signatureVerified: true, consistent: true, effectiveAt: "2026-09-20T10:00:00.000Z", originKeyId: "key-1" },
      legitimacy: { status: "verified", issuer: "GI Registry", signatureVerified: true, validFrom: "2026-09-01T00:00:00.000Z", validUntil: "2026-10-30T00:00:00.000Z", reference: "https://registry.example.test/source-1" }
    },
    signal: {
      publishedAt: "2026-09-29T09:00:00.000Z",
      validUntil: "2026-10-01T00:00:00.000Z",
      reviewStatus: "reviewed",
      evidence: [
        { url: "https://primary.example.test/report", sourceId: "primary-source", kind: "primary", status: "verified", independent: true },
        { url: "https://independent.example.test/story", sourceId: "independent-source", kind: "secondary", status: "verified", independent: true }
      ],
      conflictsReviewed: true,
      conflicts: [],
      scope: { description: "Regional supply notice", decisionContext: "Review before the stated expiry", jurisdiction: "North district" }
    },
    ...overrides
  };
}

test("missing assurance data stays unscored instead of becoming a fabricated zero", () => {
  const { Assurance } = harness();
  const result = Assurance.evaluate(null, null, { date: "2026-09-29T09:00:00.000Z" }, NOW);
  assert.equal(result.modelVersion, "GI-ASSURANCE-0.1");
  assert.equal(result.score, null);
  assert.equal(result.source.score, null);
  assert.equal(result.signal.score, null);
  assert.equal(result.coverage, 0);
  assert.equal(result.actionability, "UNASSESSED");
  assert.equal(result.grade, "Not scored");
});

test("complete, current API-reported dimensions produce the documented weighted index but never permission", () => {
  const { Assurance } = harness();
  const result = Assurance.evaluate(completePacket(), null, {}, NOW);
  assert.equal(result.source.score, 100);
  assert.equal(result.signal.score, 100);
  assert.equal(result.score, 100);
  assert.equal(result.coverage, 100);
  assert.equal(result.grade, "High evidence coverage");
  assert.equal(result.actionability, "REVIEW-READY · HUMAN DECISION REQUIRED");
  assert.match(result.caveat, /does not establish truth/);
});

test("phase identity is context, not a truth score multiplier", () => {
  const { Assurance } = harness();
  const nab = Assurance.evaluate(completePacket(), null, {}, NOW);
  const gsrbPacket = completePacket();
  gsrbPacket.source.ground0.phase = "GSRB";
  const gsrb = Assurance.evaluate(gsrbPacket, null, {}, NOW);
  assert.equal(nab.score, gsrb.score);
  assert.equal(nab.source.score, gsrb.source.score);
});

test("stale authorization, expired claims, and unresolved conflicts hold the signal", () => {
  const { Assurance } = harness();
  const packet = completePacket();
  packet.source.legitimacy.validUntil = "2026-09-30T11:00:00.000Z";
  packet.source.pdh.effectiveAt = "2026-06-01T00:00:00.000Z";
  packet.signal.validUntil = "2026-09-30T11:00:00.000Z";
  packet.signal.conflicts = [{ status: "unresolved" }];
  const result = Assurance.evaluate(packet, null, {}, NOW);
  assert.equal(result.score, 57);
  assert.equal(result.actionability, "HOLD · NOT ACTIONABLE");
  assert.ok(result.blockers.some(message => /authorization is expired/.test(message)));
  assert.ok(result.blockers.some(message => /phase declaration is stale/.test(message)));
  assert.ok(result.blockers.some(message => /claim is expired/.test(message)));
  assert.ok(result.blockers.some(message => /conflict/.test(message)));
});

test("Ground-0 linkage is exact, read-only, and exposes no ambiguous name match", () => {
  const audits = [
    { id: "a1", identifier: "0xabc", name: "Source One", phase: "NAB", badge: "Confirmed", status: "Complete", version: "1.0", cutoff: "2026-09-29", createdAt: NOW },
    { id: "a2", identifier: "0xdef", name: "Source One", phase: "GSRB", badge: "Reclassified", status: "Complete", version: "1.0", cutoff: "2026-09-29", createdAt: NOW }
  ];
  const { Assurance, writes } = harness({ storedAudits: audits });
  const loaded = Assurance.readLocalGround0Audits();
  assert.equal(loaded.length, 2);
  assert.equal(writes.length, 0);
  assert.equal(Assurance.matchLocalGround0Audit({ address: "0xabc", providerName: "Source One" }, loaded).audit.id, "a1");
  assert.equal(Assurance.matchLocalGround0Audit({ providerName: "Source One" }, loaded).match, "ambiguous");
  assert.equal(Assurance.matchLocalGround0Audit({ address: "0xmissing" }, loaded).match, "none");
  assert.equal(Assurance.matchLocalGround0Audit({ address: "0xmissing", providerName: "Source One" }, loaded).match, "none");
});

test("packet normalization rejects unsupported schemas and unsafe evidence URLs", () => {
  const { Assurance } = harness();
  assert.equal(Assurance.normalizePacket({ schema: "unknown" }), null);
  const packet = Assurance.normalizePacket(completePacket());
  assert.equal(packet.signal.evidence.length, 2);
  const hostile = completePacket();
  hostile.signal.evidence[0].url = "javascript:alert(1)";
  const safe = Assurance.normalizePacket(hostile);
  assert.equal(safe.signal.evidence[0].url, "");
});
