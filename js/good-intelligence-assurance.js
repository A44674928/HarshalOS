/* Good Intelligence — transparent read-only assurance model.
   Scores evidence coverage, never truth, legal authority, or permission to act. */
"use strict";

window.GoodIntelligenceAssurance = (() => {
  const MODEL_VERSION = "GI-ASSURANCE-0.1";
  const PDH_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
  const PHASES = new Set(["NAB", "CWO", "NAB-Constrained", "GSRB"]);
  const SOURCE_WEIGHTS = Object.freeze([
    Object.freeze({ id: "identity", label: "Source identity", weight: 20 }),
    Object.freeze({ id: "phase", label: "Ground-0 phase review", weight: 25 }),
    Object.freeze({ id: "pdh", label: "PDH signature, consistency & freshness", weight: 25 }),
    Object.freeze({ id: "legitimacy", label: "External legitimacy freshness", weight: 30 })
  ]);
  const SIGNAL_WEIGHTS = Object.freeze([
    Object.freeze({ id: "provenance", label: "Claim evidence provenance", weight: 25 }),
    Object.freeze({ id: "corroboration", label: "Independent corroboration", weight: 25 }),
    Object.freeze({ id: "conflicts", label: "Conflict review", weight: 20 }),
    Object.freeze({ id: "freshness", label: "Claim validity window", weight: 15 }),
    Object.freeze({ id: "scope", label: "Decision scope", weight: 15 })
  ]);
  const text = (value, limit = 240) => typeof value === "string" ? value.trim().slice(0, limit) : "";
  const isObject = value => !!value && typeof value === "object" && !Array.isArray(value);
  const time = value => {
    if (typeof value !== "string" || !value.trim()) return null;
    const result = Date.parse(value);
    return Number.isFinite(result) ? result : null;
  };
  const safeUrl = value => {
    const raw = text(value, 1000);
    try {
      const url = new URL(raw);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  };
  const enumValue = (value, allowed) => {
    const normalized = text(value, 60).toLowerCase();
    return allowed.has(normalized) ? normalized : "";
  };

  function normalizePacket(value) {
    if (!isObject(value) || value.schema !== "gi-assurance-v1") return null;
    const rawSource = isObject(value.source) ? value.source : {};
    const rawIdentity = isObject(rawSource.identity) ? rawSource.identity : {};
    const rawPhase = isObject(rawSource.ground0) ? rawSource.ground0 : {};
    const rawPdh = isObject(rawSource.pdh) ? rawSource.pdh : {};
    const rawLegitimacy = isObject(rawSource.legitimacy) ? rawSource.legitimacy : {};
    const rawSignal = isObject(value.signal) ? value.signal : {};
    const rawScope = isObject(rawSignal.scope) ? rawSignal.scope : null;
    const rawEvidence = Array.isArray(rawSignal.evidence) ? rawSignal.evidence.slice(0, 40) : null;
    const rawConflicts = Array.isArray(rawSignal.conflicts) ? rawSignal.conflicts.slice(0, 40) : null;

    return {
      schema: "gi-assurance-v1",
      assessmentId: text(value.assessmentId, 100),
      assessedAt: text(value.assessedAt, 80),
      source: {
        identity: {
          status: enumValue(rawIdentity.status, new Set(["verified", "unverified", "invalid", "revoked"])),
          method: text(rawIdentity.method, 80),
          verifiedAt: text(rawIdentity.verifiedAt, 80)
        },
        ground0: {
          status: enumValue(rawPhase.status, new Set(["verified", "unverified", "invalid", "missing"])),
          phase: PHASES.has(text(rawPhase.phase, 40)) ? text(rawPhase.phase, 40) : "",
          badgeStatus: enumValue(rawPhase.badgeStatus, new Set(["confirmed", "reclassified", "conditional", "invalid", "unissued"])),
          version: text(rawPhase.version, 20),
          auditId: text(rawPhase.auditId, 100),
          assessedAt: text(rawPhase.assessedAt, 80)
        },
        pdh: {
          status: enumValue(rawPdh.status, new Set(["valid", "invalid", "missing", "stale"])),
          signatureVerified: rawPdh.signatureVerified === true,
          consistent: rawPdh.consistent === true,
          effectiveAt: text(rawPdh.effectiveAt, 80),
          originKeyId: text(rawPdh.originKeyId, 120)
        },
        legitimacy: {
          status: enumValue(rawLegitimacy.status, new Set(["verified", "unverified", "invalid", "expired", "revoked"])),
          issuer: text(rawLegitimacy.issuer, 160),
          signatureVerified: rawLegitimacy.signatureVerified === true,
          validFrom: text(rawLegitimacy.validFrom, 80),
          validUntil: text(rawLegitimacy.validUntil, 80),
          reference: safeUrl(rawLegitimacy.reference),
          attestation: isObject(rawLegitimacy.attestation) ? {
            algorithm: text(rawLegitimacy.attestation.algorithm, 60),
            keyId: text(rawLegitimacy.attestation.keyId, 120),
            signature: text(rawLegitimacy.attestation.signature, 200)
          } : null
        }
      },
      signal: {
        publishedAt: text(rawSignal.publishedAt, 80),
        validUntil: text(rawSignal.validUntil, 80),
        reviewStatus: enumValue(rawSignal.reviewStatus, new Set(["reviewed", "pending", "rejected"])),
        evidence: rawEvidence === null ? null : rawEvidence.filter(isObject).map(item => ({
          url: safeUrl(item.url),
          sourceId: text(item.sourceId, 120),
          kind: enumValue(item.kind, new Set(["primary", "secondary"])),
          status: enumValue(item.status, new Set(["verified", "unverified", "rejected"])),
          independent: item.independent === true
        })),
        conflictsReviewed: typeof rawSignal.conflictsReviewed === "boolean" ? rawSignal.conflictsReviewed : null,
        conflicts: rawConflicts === null ? null : rawConflicts.filter(isObject).map(item => ({
          status: enumValue(item.status, new Set(["resolved", "dismissed", "unresolved"]))
        })),
        scope: rawScope ? {
          description: text(rawScope.description, 500),
          decisionContext: text(rawScope.decisionContext, 300),
          jurisdiction: text(rawScope.jurisdiction, 160)
        } : null
      }
    };
  }

  function readLocalGround0Audits() {
    try {
      const raw = window.localStorage && window.localStorage.getItem("ground-0-audits-v1");
      if (!raw || !window.G0 || typeof window.G0.normalizeAuditRecord !== "function") return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(window.G0.normalizeAuditRecord).filter(Boolean) : [];
    } catch { return []; }
  }

  function identityKey(value) {
    const raw = text(value, 300);
    if (!raw) return "";
    try {
      const url = new URL(raw);
      if (url.protocol === "http:" || url.protocol === "https:") {
        const host = url.host.toLowerCase().replace(/^www\./, "");
        const path = url.pathname.replace(/\/+$/, "");
        return `${host}${path === "/" ? "" : path}`;
      }
    } catch { /* Wallet addresses and registered identifiers are not URLs. */ }
    return raw.toLowerCase().replace(/\s+/g, " ").replace(/^www\./, "").replace(/\/+$/, "");
  }

  function latest(records) {
    const timestamp = value => typeof value === "number" && Number.isFinite(value) ? value : time(value) || 0;
    return records.slice().sort((a, b) => {
      const cutoff = text(b.cutoff).localeCompare(text(a.cutoff));
      return cutoff || timestamp(b.createdAt) - timestamp(a.createdAt);
    })[0] || null;
  }

  function matchLocalGround0Audit(item, audits = []) {
    if (!isObject(item) || !Array.isArray(audits)) return { audit: null, match: "none" };
    const ids = [item.sourceId, item.address].map(identityKey).filter(Boolean);
    if (ids.length) {
      const matches = audits.filter(audit => audit && ids.includes(identityKey(audit.identifier)));
      return matches.length ? { audit: latest(matches), match: "identifier" } : { audit: null, match: "none" };
    }
    const names = [item.providerName].map(identityKey).filter(Boolean);
    if (names.length) {
      const matches = audits.filter(audit => audit && names.includes(identityKey(audit.name)));
      const entities = new Set(matches.map(audit => identityKey(audit.identifier) || identityKey(audit.name)));
      if (entities.size === 1 && matches.length) return { audit: latest(matches), match: "exact-name" };
      if (entities.size > 1) return { audit: null, match: "ambiguous" };
    }
    return { audit: null, match: "none" };
  }

  function factor(id, label, weight, score, status, detail) {
    return { id, label, weight, score, status, detail };
  }

  function scoreSet(definitions, factors) {
    const complete = factors.length === definitions.length && factors.every(item => Number.isFinite(item.score));
    const coverage = Math.round(factors.reduce((sum, item) => sum + (Number.isFinite(item.score) ? item.weight : 0), 0));
    const score = complete ? Math.round(factors.reduce((sum, item) => sum + item.score * item.weight / 100, 0)) : null;
    return { score, coverage, factors };
  }

  function sourceFactors(packet, localAudit, now, sourceVerification = null) {
    const source = packet ? packet.source : null;
    const identity = source && source.identity;
    const identityChecked = identity ? time(identity.verifiedAt) : null;
    const identityCurrent = identityChecked !== null && identityChecked <= now && now - identityChecked <= PDH_MAX_AGE_MS;
    const identityScore = !identity || !identity.status ? null : identity.status === "verified" && identity.method && identityCurrent ? 100 : 0;
    const identityDetail = identityScore === null ? "No source identity assertion supplied." : identityScore ? `Identity is reported verified by ${identity.method}; the check is within the 90-day model window.` : `Identity is not verified or its verification is missing, future-dated, or older than 90 days.`;

    const ground0 = source && source.ground0;
    let phaseScore = null;
    let phaseDetail = "No matching local Ground-0 audit or API phase assessment is available.";
    if (ground0 && ground0.status) {
      const assessed = time(ground0.assessedAt);
      const age = assessed === null ? null : now - assessed;
      const fresh = age !== null && age >= 0 && age <= PDH_MAX_AGE_MS;
      phaseScore = ground0.status === "verified" && ground0.version === "1.0" && fresh &&
        PHASES.has(ground0.phase) && ["confirmed", "reclassified"].includes(ground0.badgeStatus) ? 100 : 0;
      phaseDetail = phaseScore ? "The packet reports a current, complete Ground-0 v1.0 phase badge. The phase describes operating behavior, not claim truth." : "The phase assessment is missing, stale, unissued, invalid, or not on the normative v1.0 baseline.";
    } else if (localAudit) {
      const cutoff = /^\d{4}-\d{2}-\d{2}$/.test(text(localAudit.cutoff)) ? time(`${localAudit.cutoff}T23:59:59.999Z`) : null;
      const age = cutoff === null ? null : now - cutoff;
      const fresh = age !== null && age >= 0 && age <= PDH_MAX_AGE_MS;
      const localPdh = localAudit.pdh || {};
      const pdhClaimsValid = localPdh.status === "VALID" && localPdh.signature === true && localPdh.consistency === true;
      const badgeIssued = localAudit.version === "1.0" && localAudit.status === "Complete" && fresh && pdhClaimsValid &&
        ["Confirmed", "Reclassified"].includes(localAudit.badge) && PHASES.has(localAudit.phase);
      phaseScore = badgeIssued ? 100 : 0;
      phaseDetail = badgeIssued
        ? "A matching complete local Ground-0 v1.0 phase assessment is within the model’s 90-day review window; local browser records are not independently anchored. The phase describes operating behavior, not claim truth."
        : "A matching local Ground-0 record exists, but it is draft, stale, or has no complete issued phase badge; local browser records are not independently anchored.";
    }

    const pdh = source && source.pdh;
    let pdhScore = null;
    let pdhDetail = "No signed phase-declaration freshness result supplied.";
    if (pdh && pdh.status) {
      const effective = time(pdh.effectiveAt);
      const age = effective === null ? null : now - effective;
      const fresh = age !== null && age >= 0 && age <= PDH_MAX_AGE_MS;
      pdhScore = pdh.status === "valid" && pdh.signatureVerified && pdh.consistent && fresh ? 100 : 0;
      pdhDetail = pdhScore ? `Signed, consistent PDH; ${Math.floor(age / 86400000)} days old (90-day maximum).` : pdh.status === "stale" || (age !== null && !fresh) ? "PDH is stale or future-dated; revalidation is required." : "PDH signature, consistency, or validity was not confirmed.";
    } else if (localAudit && localAudit.pdh) {
      const effective = time(localAudit.pdh.effectiveTimestamp);
      const age = effective === null ? null : now - effective;
      const fresh = age !== null && age >= 0 && age <= PDH_MAX_AGE_MS;
      pdhScore = localAudit.pdh.status === "VALID" && localAudit.pdh.signature === true && localAudit.pdh.consistency === true && fresh ? 100 : 0;
      pdhDetail = pdhScore ? `Local Ground-0 record reports a signed, consistent PDH; ${Math.floor(age / 86400000)} days old. Not independently anchored.` : "Local Ground-0 record has no currently valid PDH; not independently anchored.";
    }

    const legitimacy = source && source.legitimacy;
    let legitimacyScore = null;
    let legitimacyDetail = "No external source-authorization attestation supplied.";
    if (legitimacy && legitimacy.status) {
      const from = time(legitimacy.validFrom);
      const until = time(legitimacy.validUntil);
      const inWindow = from !== null && until !== null && from <= now && now < until;
      if (legitimacy.attestation) {
        if (!sourceVerification || sourceVerification.status === "unavailable") {
          legitimacyDetail = "Signed source authorization has not been locally verified; this factor remains unknown.";
        } else if (!sourceVerification.verified) {
          legitimacyScore = 0;
          legitimacyDetail = `Source-authorization signature failed local verification: ${sourceVerification.reason}`;
        } else {
          legitimacyScore = legitimacy.status === "verified" && !!legitimacy.issuer && inWindow ? 100 : 0;
          legitimacyDetail = legitimacyScore
            ? `Source-authorization signature verified with the ${sourceVerification.trust} pinned root; currently within its stated validity window.`
            : ["expired", "revoked", "invalid"].includes(legitimacy.status) || (until !== null && now >= until) ? "Cryptographically signed authorization is expired, revoked, or invalid." : "Signed authorization issuer or validity window is incomplete.";
        }
      } else {
        legitimacyScore = legitimacy.status === "verified" && legitimacy.signatureVerified && !!legitimacy.issuer && inWindow ? 100 : 0;
        legitimacyDetail = legitimacyScore ? `Signed attestation reported by ${legitimacy.issuer}; currently within its stated validity window.`
          : ["expired", "revoked", "invalid"].includes(legitimacy.status) || (until !== null && now >= until) ? "External authorization is expired, revoked, or invalid." : "External authorization signature, issuer, or validity window is incomplete.";
      }
    }

    return [
      factor("identity", "Source identity", 20, identityScore, identityScore === null ? "unknown" : identityScore ? "reported-verified" : "not-verified", identityDetail),
      factor("phase", "Ground-0 phase review", 25, phaseScore, phaseScore === null ? "context-only" : phaseScore ? "reported-verified" : "not-verified", phaseDetail),
      factor("pdh", "PDH signature, consistency & freshness", 25, pdhScore, pdhScore === null ? "unknown" : pdhScore ? "current" : "stale-or-invalid", pdhDetail),
      factor("legitimacy", "External legitimacy freshness", 30, legitimacyScore, legitimacyScore === null ? "unknown" : legitimacyScore ? "current" : "stale-or-invalid", legitimacyDetail)
    ];
  }

  function signalFactors(packet, now, item) {
    const signal = packet && packet.signal;
    if (!signal) return SIGNAL_WEIGHTS.map(def => factor(def.id, def.label, def.weight, null, "unknown", "No claim assurance packet supplied."));

    const evidence = signal.evidence;
    const validEvidence = Array.isArray(evidence) ? evidence.filter(entry => entry.status === "verified" && entry.url && entry.sourceId) : null;
    const primary = validEvidence && validEvidence.some(entry => entry.kind === "primary");
    let provenanceScore = null;
    if (validEvidence !== null && signal.reviewStatus) {
      if (signal.reviewStatus === "rejected") provenanceScore = 0;
      else if (signal.reviewStatus === "pending") provenanceScore = validEvidence.length ? 50 : 0;
      else provenanceScore = primary ? 100 : validEvidence.length ? 60 : 0;
    }
    const provenanceDetail = provenanceScore === null ? "Evidence references or a claim-review status were not supplied." : provenanceScore ? `${validEvidence.length} API-reported verified reference(s); ${primary ? "includes a primary source" : "no primary source marked"}; review ${signal.reviewStatus}.` : `No verified primary evidence is available or claim review is ${signal.reviewStatus}.`;

    let corroborationScore = null;
    let corroborationDetail = "Independent-source relationships were not supplied.";
    if (validEvidence !== null) {
      const independent = new Set(validEvidence.filter(entry => entry.independent).map(entry => entry.sourceId));
      corroborationScore = independent.size >= 2 ? 100 : independent.size === 1 ? 50 : 0;
      corroborationDetail = `${independent.size} API-reported independent source(s); two are required for full corroboration credit.`;
    }

    let conflictScore = null;
    let conflictDetail = "Conflict review has not been reported.";
    if (typeof signal.conflictsReviewed === "boolean") {
      if (!signal.conflictsReviewed || !Array.isArray(signal.conflicts)) {
        conflictScore = 0;
        conflictDetail = "Conflicts have not been completely reviewed.";
      } else {
        const open = signal.conflicts.filter(entry => !["resolved", "dismissed"].includes(entry.status)).length;
        conflictScore = open === 0 ? 100 : 0;
        conflictDetail = open === 0 ? "Conflicts reviewed; none remain unresolved." : `${open} conflict(s) remain unresolved.`;
      }
    }

    const publishedAt = time(signal.publishedAt || (item && item.date));
    const validUntil = time(signal.validUntil);
    let freshnessScore = null;
    let freshnessDetail = "A claim-specific validity window is required; no global freshness period is assumed.";
    if (signal.validUntil || signal.publishedAt || (item && item.date)) {
      freshnessScore = publishedAt !== null && validUntil !== null && publishedAt <= now && now < validUntil ? 100 : 0;
      freshnessDetail = freshnessScore ? `Published ${new Date(publishedAt).toISOString()}; valid through ${new Date(validUntil).toISOString()}.` : "Claim is future-dated, expired, or missing a valid-through time.";
    }

    let scopeScore = null;
    let scopeDetail = "No decision scope supplied.";
    if (signal.scope) {
      scopeScore = signal.scope.description && signal.scope.decisionContext ? 100 : 0;
      scopeDetail = scopeScore ? `${signal.scope.description} · ${signal.scope.decisionContext}` : "Scope needs both a bounded description and decision context.";
    }

    return [
      factor("provenance", "Claim evidence provenance", 25, provenanceScore, provenanceScore === null ? "unknown" : provenanceScore ? "reported" : "missing", provenanceDetail),
      factor("corroboration", "Independent corroboration", 25, corroborationScore, corroborationScore === null ? "unknown" : corroborationScore === 100 ? "corroborated" : corroborationScore === 50 ? "limited" : "not-corroborated", corroborationDetail),
      factor("conflicts", "Conflict review", 20, conflictScore, conflictScore === null ? "unknown" : conflictScore ? "reviewed" : "open-or-unreviewed", conflictDetail),
      factor("freshness", "Claim validity window", 15, freshnessScore, freshnessScore === null ? "unknown" : freshnessScore ? "current" : "stale-or-incomplete", freshnessDetail),
      factor("scope", "Decision scope", 15, scopeScore, scopeScore === null ? "unknown" : scopeScore ? "bounded" : "unbounded", scopeDetail)
    ];
  }

  function grade(score) {
    if (!Number.isFinite(score)) return "Not scored";
    if (score >= 85) return "High evidence coverage";
    if (score >= 65) return "Moderate evidence coverage";
    if (score >= 40) return "Limited evidence coverage";
    return "Low evidence coverage";
  }

  function evaluate(packetValue, localAudit = null, item = null, at = Date.now(), sourceVerification = null) {
    const packet = normalizePacket(packetValue);
    const now = Number.isFinite(at) ? at : Date.now();
    const source = scoreSet(SOURCE_WEIGHTS, sourceFactors(packet, localAudit, now, sourceVerification));
    const signal = scoreSet(SIGNAL_WEIGHTS, signalFactors(packet, now, item));
    const score = source.score !== null && signal.score !== null ? Math.round(source.score * 0.4 + signal.score * 0.6) : null;
    const coverage = Math.round(source.coverage * 0.4 + signal.coverage * 0.6);
    const gates = [...source.factors, ...signal.factors];
    const blockers = [];
    if (gates.some(entry => entry.id === "identity" && entry.score === 0)) blockers.push("Source identity is invalid or not verified.");
    if (gates.some(entry => entry.id === "phase" && entry.score === 0)) blockers.push("No current, issued Ground-0 phase assessment is available.");
    if (gates.some(entry => entry.id === "legitimacy" && entry.score === 0)) blockers.push("Source authorization is expired, invalid, or unverified.");
    if (gates.some(entry => entry.id === "pdh" && entry.score === 0)) blockers.push("The phase declaration is stale or invalid.");
    if (gates.some(entry => entry.id === "freshness" && entry.score === 0)) blockers.push("The claim is expired or lacks a valid freshness window.");
    if (gates.some(entry => entry.id === "conflicts" && entry.score === 0)) blockers.push("Material conflicts remain unresolved or unreviewed.");
    if (gates.some(entry => entry.id === "scope" && entry.score === 0)) blockers.push("Decision scope is missing or unbounded.");
    if (gates.some(entry => entry.id === "provenance" && entry.score !== null && entry.score !== 100)) blockers.push("Verified primary claim provenance is incomplete.");
    if (gates.some(entry => entry.id === "corroboration" && entry.score !== null && entry.score !== 100)) blockers.push("Two independent corroborating sources are not established.");
    const missing = gates.filter(entry => entry.score === null).length;
    let actionability = "UNASSESSED";
    if (!packet && !localAudit) actionability = "UNASSESSED";
    else if (blockers.length) actionability = "HOLD · NOT ACTIONABLE";
    else if (missing) actionability = "INCOMPLETE · HUMAN REVIEW REQUIRED";
    else actionability = "REVIEW-READY · HUMAN DECISION REQUIRED";

    return {
      modelVersion: MODEL_VERSION,
      score,
      grade: grade(score),
      coverage,
      source,
      signal,
      actionability,
      blockers,
      missingFactors: missing,
      caveat: "Provisional v0.1 weights are not an approved Good Intelligence policy. Evidence coverage only: this does not establish truth, guarantee reliability, or authorize an action; assurance fields are API-reported unless independently verified."
    };
  }

  return Object.freeze({
    MODEL_VERSION, SOURCE_WEIGHTS, SIGNAL_WEIGHTS, normalizePacket,
    readLocalGround0Audits, matchLocalGround0Audit, evaluate, grade
  });
})();
