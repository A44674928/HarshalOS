/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Ground-0 Phase Detection Algorithm (engine)

   The versioned, deterministic phase-classification standard from
   Harshal's Systems (AGS++), implemented as a dependency-free module:

     · v1.0  — finalized normative baseline (September 12, 2026)
     · v1.1  — unratified amendment draft

   Pipeline (specification Section II):
     STEP 1   validate the Phase Declaration Header (PDH)
     STEP 2   run the five-question behavioral audit (B1–B5)
     STEP 3   detect the actual phase (NAB | CWO | GSRB branch tree)
     STEP 3.5 legislative constraint check (C1–C4) when AMBIGUOUS
     STEP 4   comparison & reclassification (badge / compliance)
     STEP 5   temporal audit (transition rules)

   Evidence discipline (merged from both reference implementations):
     · an answer only scores when a PUBLIC, DATED artifact with a real
       claim supports it — before the inclusive evidence cutoff
     · no evidence is coded NO (a scoring code, never a proven negative)
     · news leads and index dates never score
     · the working badge presumes CWO (witness-only) until evidence
       disproves it; the formal badge still requires a valid signed PDH

   Exposed as window.G0. No build step, no dependencies.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

window.G0 = (() => {

  /* ──────────────────────────────────────────────────────────────
     Validation — strict calendar dates, safe public URLs, archives.
     Rejects values Date.parse would silently roll into other months.
     ────────────────────────────────────────────────────────────── */
  const isoDay = /^\d{4}-\d{2}-\d{2}$/;
  const isoTime = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

  function isCalendarDate(value) {
    if (typeof value !== "string" || !isoDay.test(value) || Number(value.slice(0, 4)) < 1) return false;
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
  }
  function isIsoTimestamp(value) {
    if (typeof value !== "string") return false;
    const match = value.match(isoTime);
    if (!match || !isCalendarDate(match[1]) || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4] || 0) > 59) return false;
    if (match[5] !== "Z" && (Number(match[5].slice(1, 3)) > 23 || Number(match[5].slice(4)) > 59)) return false;
    return Number.isFinite(Date.parse(value));
  }
  function dateTime(value) {
    if (isCalendarDate(value)) return Date.parse(`${value}T00:00:00Z`);
    return isIsoTimestamp(value) ? Date.parse(value) : NaN;
  }
  function eligibleByCutoff(date, cutoff) {
    return isCalendarDate(cutoff) && Number.isFinite(dateTime(date)) && dateTime(date) <= Date.parse(`${cutoff}T23:59:59.999Z`);
  }
  /* Calendar-month lookbacks clamp the day: March 31 minus one month is
     February's last day, not March 3. */
  function withinCalendarMonths(date, cutoff, months) {
    if (!eligibleByCutoff(date, cutoff)) return false;
    const end = new Date(`${cutoff}T00:00:00Z`);
    const day = end.getUTCDate();
    end.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() - months);
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(day, last));
    return dateTime(date) >= end.getTime();
  }

  const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  function artifactDate(value) {
    if (isCalendarDate(value)) return value;
    if (isIsoTimestamp(value)) return new Date(value).toISOString().slice(0, 10);
    if (typeof value !== "string") return null;
    const a = value.trim().match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
    const b = value.trim().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
    const name = (a && a[1]) || (b && b[2]); const day = (a && a[2]) || (b && b[1]); const year = (a && a[3]) || (b && b[3]);
    if (!name || !day || !year) return null;
    const month = monthNames.indexOf(name.toLowerCase()) + 1;
    const normalized = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return month > 0 && isCalendarDate(normalized) ? normalized : null;
  }
  function safePublicUrl(value) {
    if (typeof value !== "string" || value.length > 2048) return false;
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase().replace(/\.$/, "");
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password && host.includes(".") &&
        !host.includes(":") && !/^\d+(?:\.\d+){3}$/.test(host) &&
        !["localhost", "local", "internal", "test", "invalid"].some(suffix => host === suffix || host.endsWith(`.${suffix}`));
    } catch { return false; }
  }
  function canonicalUrl(value) {
    try { const url = new URL(value); url.hash = ""; return url.href.replace(/\/$/, ""); } catch { return ""; }
  }
  /* Accept only actual Wayback capture URLs, never a query string that
     merely mentions the archive. */
  function parseArchiveUrl(value) {
    if (!safePublicUrl(value)) return null;
    const url = new URL(value);
    if (url.hostname !== "web.archive.org") return null;
    const match = `${url.pathname}${url.search}`.match(/^\/web\/(\d{14})(?:[a-z_]+)?\/(https?:\/\/.+)$/i);
    if (!match || !safePublicUrl(match[2])) return null;
    const stamp = match[1];
    const captured = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
    const timestamp = `${captured}T${stamp.slice(8, 10)}:${stamp.slice(10, 12)}:${stamp.slice(12, 14)}Z`;
    return isIsoTimestamp(timestamp) ? { original: match[2], timestamp: stamp, captured } : null;
  }
  function sameResource(a, b) {
    try {
      const first = new URL(a); const second = new URL(b);
      const host = url => url.hostname.toLowerCase().replace(/^www\./, "");
      return host(first) === host(second) && first.pathname.replace(/\/$/, "") === second.pathname.replace(/\/$/, "") && first.search === second.search;
    } catch { return false; }
  }
  const isObject = value => !!value && typeof value === "object" && !Array.isArray(value);

  /* ──────────────────────────────────────────────────────────────
     Engine constants
     ────────────────────────────────────────────────────────────── */
  const CENTER_ORIGIN = "0•000•000•0000";
  const emptyAnswer = () => ({ value: null, source: "", date: "", notes: "", gap: "" });
  const today = () => new Date().toISOString().slice(0, 10);
  function newInput(version = "1.0") {
    return {
      name: "", identifier: "", version, cutoff: today(),
      answers: Array.from({ length: 5 }, emptyAnswer),
      constraints: Array.from({ length: 4 }, emptyAnswer),
      b4: { actor: "", action: "", procedure: "", basis: "NOT_DEMONSTRATED", numerator: "", denominator: "", complete: false, start: "", end: "" },
      c2: { route: false, invoked: false, complete: false, numerator: "", denominator: "", start: "", end: "" },
      external: { exists: false, exercised: false, holder: "", scope: "", source: "", date: "" },
      decrement: { enabled: false, oldSource: "", newSource: "", oldDate: "", newDate: "", notes: "" },
      headerText: "", publicKeyText: "", trustedOrigin: CENTER_ORIGIN
    };
  }

  const questions = [
    { code: "B1", title: "Can compliance be coerced?", short: "Coercion", variable: "enforcement_present", description: "Does the entity impose penalties, access restrictions, funding cuts, or other negative consequences for not following its directives?", examples: "Funding conditions, license revocation, access restrictions, fines, termination, or documented enforcement." },
    { code: "B2", title: "Can decisions be ignored without consequence?", short: "Optional decisions", variable: "decisions_optional", description: "Can an affected entity proceed without penalty when it does not follow an institutional decision or directive?", examples: "Advisory or voluntary decisions, non-binding public statements, or documented non-compliance without penalty." },
    { code: "B3", title: "Do rules activate real-world effects?", short: "Executable rules", variable: "rules_execute", description: "Do guidance, policies, or directives cause observable downstream changes in behavior, enforcement, or resource allocation?", examples: "Implemented policies, rules embedded in law or contracts, operational changes, or a documented real-world cascade." },
    { code: "B4", title: "Does refusal or appeal reliably stop action?", short: "Terminal refusal", variable: "refusal_terminal", description: "Is there an evidenced mechanism through which refusal or appeal reliably halts the specified institutional action?", examples: "v1.0: formal appeals, successful court review, legislative override, or penalty-free exit. v1.1: an operative terminal/stay rule, a complete ≥50% relief record, or a binding no-penalty exit; external orders alone do not qualify." },
    { code: "B5", title: "Do rules persist by default over time?", short: "Persistent authority", variable: "authority_persists", description: "Does a decision remain in effect until actively changed, rather than automatically expiring and requiring renewal?", examples: "No sunset clause, policies effective until repealed, historic decisions still in force, or a burden on repeal rather than renewal." }
  ];

  const constraintQuestions = [
    { code: "C1", title: "External override demonstrated", description: "A legislature, court, or external body has actually overridden or repealed the entity’s decision within the preceding 24 months." },
    { code: "C2", title: "Appeal mechanism active & invoked", description: "A published, accessible appeal route actually grants relief. In v1.1, a complete, bounded set of resolved outcomes must show at least 50% relief." },
    { code: "C3", title: "Authority has a sunset requirement", description: "Decisions automatically expire or require periodic renewal, demonstrated by sunset clauses, budget renewals, term limits, or expiry dates." },
    { code: "C4", title: "Constraints are functioning now", description: "Current constraint mechanisms are active, with demonstrated functioning or qualifying actions within the preceding 12 months." }
  ];

  const phaseDefinitions = [
    { phase: "NAB", name: "Neural Atomic Body", category: "Refusal-bound", icon: "cube", color: "sage", symbol: "🧊", description: "Authority is borrowed, never assumed.", characteristics: ["External, per-action legitimacy", "The center cannot act independently", "Refusal is terminal", "Symbolism is non-executable", "Time degrades authority"], examples: "Advisory bodies without execution power, refusal-gated systems, and custodial archives with refusal capability.", fields: ["Non-Acting", "External", "Terminal", "Disabled", "Degrades"], vector: [false, true, false, true, false] },
    { phase: "CWO", name: "Custodial Witness Orb", category: "Witness-only", icon: "droplet", color: "blue", symbol: "💧", description: "It preserves the record, not the power.", characteristics: ["Action and execution are forbidden", "The center records but never decides", "Symbolism is preserved but inert", "Time accumulates meaning, not authority", "Legitimacy is observed, not created"], examples: "Archives, historians, record-keepers, and observation-only auditors.", fields: ["Custodial", "Observed-Only", "Expository", "Disabled or Archived", "Neutral"], vector: [false, true, false, null, false] },
    { phase: "NAB-Constrained", name: "Legislatively constrained NAB", category: "Externally accountable", icon: "cube-plus", color: "amber", symbol: "🧊+", description: "Real power, bounded by demonstrable checks.", characteristics: ["External authority can override", "Decisions can be repealed or reversed", "Appeal mechanisms are functional", "Authority requires renewal", "All four C criteria must be demonstrated"], examples: "Agencies subject to functional court review, legislatively checked institutions, and boards with demonstrable term limits.", fields: ["NAB variant", "External oversight", "Functional appeals", "All C1–C4 required", "Sunset / renewal"], vector: null },
    { phase: "GSRB", name: "God-Sovereign Religious Body", category: "Sovereign-acting", icon: "cloud", color: "peach", symbol: "🌫", description: "The center authorizes itself and acts.", characteristics: ["Legitimacy is internal and self-authorizing", "The center acts and decides", "Refusal is override-able", "Symbolism has operational effects", "Time confirms authority"], examples: "The framework’s sovereign-acting category: institutions, platforms, or systems with self-authorizing execution and enforcement.", fields: ["Acting", "Internal", "Override-able", "Enabled", "Confirms"], vector: [true, false, true, false, true] }
  ];

  const plainPhase = {
    NAB: "Refusal-bound. It cannot act on its own, its decisions are optional, and a refusal stops it.",
    CWO: "Witness-only. It records and preserves, but does not decide or enforce.",
    "NAB-Constrained": "Accountable power. It acts, but courts, legislatures, appeals and renewal rules demonstrably limit it.",
    GSRB: "Self-authorizing. It makes and enforces rules, can override refusal, and its authority persists over time.",
    AMBIGUOUS: "Mixed signals. The answers partly fit a phase pattern, but not completely, so no phase badge is assigned.",
    INCOHERENT: "No pattern. The answers do not fit any defined phase."
  };
  const spokenPhase = {
    NAB: "N A B, Neural Atomic Body", CWO: "C W O, Custodial Witness Orb", "NAB-Constrained": "N A B constrained",
    GSRB: "G S R B, God-Sovereign Religious Body", AMBIGUOUS: "ambiguous", INCOHERENT: "incoherent"
  };

  /* STEP 3 — the ordered branch tree. First complete branch wins. */
  function classify(vector) {
    const branches = [[false, true, false, true, false], [false, true, false, null, false], [true, false, true, false, true]];
    const matches = branches.map(branch => branch.reduce((total, condition, i) => total + (condition !== null && vector[i] === condition ? 1 : 0), 0));
    const sizes = [5, 4, 5];
    const complete = matches.findIndex((n, i) => n === sizes[i]);
    if (complete !== -1) return { phase: ["NAB", "CWO", "GSRB"][complete], confidence: "HIGH", matches };
    if (matches.some(n => n >= 3)) return { phase: "AMBIGUOUS", confidence: matches.some((n, i) => n === sizes[i] - 1) ? "MEDIUM" : "LOW", matches };
    return { phase: "INCOHERENT", confidence: "LOW", matches };
  }

  /* ──────────────────────────────────────────────────────────────
     Evidence qualification
     ────────────────────────────────────────────────────────────── */
  const isPublicUrl = safePublicUrl;
  const beforeCutoff = eligibleByCutoff;
  function qualifies(answer, cutoff) {
    return (answer.value === true || answer.value === false) && isPublicUrl(answer.source) && beforeCutoff(answer.date, cutoff) && typeof answer.notes === "string" && answer.notes.trim().length >= 5;
  }
  /* Research answers only score when the citation traces back to a
     retrieved source — never a news lead or an index date. */
  function hasScoringCitation(input, answer) {
    if (!qualifies(answer, input.cutoff)) return false;
    if (!input.automation) return true;
    const source = input.automation.sources.find(s => canonicalUrl(s.url) === canonicalUrl(answer.source));
    return source ? source.kind !== "news" && source.dateBasis !== "indexed" : false;
  }
  const withinMonths = withinCalendarMonths;

  function reliefQualifies(numerator, denominator, complete, start, end, cutoff) {
    const n = Number(numerator), d = Number(denominator);
    return complete && numerator !== "" && denominator !== "" && Number.isInteger(n) && Number.isInteger(d) && d > 0 && n >= 0 && n <= d && n / d >= 0.5 && beforeCutoff(start, cutoff) && beforeCutoff(end, cutoff) && dateTime(start) <= dateTime(end);
  }
  /* v1.1 B4: an external order plus compliance is NOT terminal refusal. */
  function b4Qualifies(input) {
    const b = input.b4;
    if (!hasScoringCitation(input, input.answers[3]) || !b.actor.trim() || !b.action.trim() || !b.procedure.trim()) return false;
    if (b.basis === "TERMINAL_RULE" || b.basis === "NO_PENALTY_EXIT") return true;
    return b.basis === "RESOLVED_APPEALS" && reliefQualifies(b.numerator, b.denominator, b.complete, b.start, b.end, input.cutoff);
  }
  function scoredVector(input) {
    return input.answers.map((answer, i) => {
      if (input.version === "1.0") return answer.value === true;
      if (input.automation && !hasScoringCitation(input, answer)) return false;
      return answer.value === true && hasScoringCitation(input, answer) && (i !== 3 || b4Qualifies(input));
    });
  }
  function scoredConstraints(input) {
    return input.constraints.map((answer, i) => {
      if (answer.value !== true || !hasScoringCitation(input, answer)) return false;
      if (i === 0 && !withinMonths(answer.date, input.cutoff, 24)) return false;
      if (i === 3 && !withinMonths(answer.date, input.cutoff, 12)) return false;
      if (i === 1 && input.version === "1.1") return input.c2.route && input.c2.invoked && reliefQualifies(input.c2.numerator, input.c2.denominator, input.c2.complete, input.c2.start, input.c2.end, input.cutoff);
      return true;
    });
  }

  /* ──────────────────────────────────────────────────────────────
     STEP 1 — Phase Declaration Header validation
     Complete · Signed · Fresh · Consistent — all four required.
     ────────────────────────────────────────────────────────────── */
  const requiredFields = ["Header-ID", "Creator-ID", "Center-Origin", "Declared-Phase", "Center-Capability", "Legitimacy-Source", "Refusal-Semantics", "Symbolism-Executability", "Time-Authority-Effect", "Effective-Timestamp", "Declaration-Hash"];
  const headerExample = JSON.stringify({
    "Header-ID": "PDH-2026-09-12-00001", "Creator-ID": "ꔧIDꔧENTITY-001(ENTITY-001)", "Center-Origin": CENTER_ORIGIN,
    "Declared-Phase": "NAB", "Center-Capability": "Non-Acting", "Legitimacy-Source": "External", "Refusal-Semantics": "Terminal",
    "Symbolism-Executability": "Disabled", "Time-Authority-Effect": "Degrades", "Effective-Timestamp": "2026-09-12T00:00:00Z",
    "Declaration-Hash": "BASE64URL_SIGNATURE"
  }, null, 2);
  function canonicalHeader(header) {
    return JSON.stringify(Object.fromEntries(requiredFields.filter(field => field !== "Declaration-Hash").sort().map(field => [field, header[field]])));
  }
  const missingPDH = () => ({ status: "MISSING", structural: false, signature: false, freshness: false, consistency: false, declared: "NONE", reason: "No Phase Declaration Header supplied. Behavioral detection may proceed; no phase badge can be issued." });

  async function validatePDH(input) {
    if (!input.headerText.trim()) return missingPDH();
    const result = { status: "INVALID", structural: false, signature: false, freshness: false, consistency: false, declared: "NONE", reason: "" };
    let header;
    try { header = JSON.parse(input.headerText); if (!isObject(header)) throw new Error(); }
    catch { return { ...result, reason: "NO_VALID_PDH: The header must be a JSON object containing the 11 required fields." }; }
    const creator = String(header["Creator-ID"] ?? "").match(/^ꔧIDꔧ\s*([^()]+)\s*\(([^()]+)\)$/);
    const validCreator = !!creator && creator[1].trim() === creator[2].trim() && (!input.identifier.trim() || creator[1].trim() === input.identifier.trim());
    const phase = header["Declared-Phase"];
    result.headerId = String(header["Header-ID"] ?? "");
    result.effectiveTimestamp = String(header["Effective-Timestamp"] ?? "");
    result.payload = canonicalHeader(header);
    result.structural = requiredFields.every(field => typeof header[field] === "string" && String(header[field]).trim().length > 0) &&
      /^PDH-\d{4}-\d{2}-\d{2}-[A-Za-z0-9]{5}$/.test(String(header["Header-ID"])) &&
      isCalendarDate(String(header["Header-ID"]).slice(4, 14)) && validCreator &&
      ["NAB", "CWO", "GSRB"].includes(String(phase)) && isIsoTimestamp(header["Effective-Timestamp"]) &&
      !!String(header["Center-Origin"]).trim();
    if (!result.structural) return { ...result, reason: "NO_VALID_PDH: A required field is missing or malformed. Creator IDs must match each other and the entity identifier." };
    const delta = Date.parse(`${input.cutoff}T23:59:59.999Z`) - dateTime(String(header["Effective-Timestamp"]));
    result.freshness = delta >= 0 && delta <= 90 * 86400000;
    const phaseDef = phaseDefinitions.find(def => def.phase === phase);
    const fieldNames = ["Center-Capability", "Legitimacy-Source", "Refusal-Semantics", "Symbolism-Executability", "Time-Authority-Effect"];
    result.consistency = !!phaseDef && fieldNames.every((field, i) => phase === "CWO" && i === 3 ? ["Disabled", "Archived"].includes(String(header[field])) : String(header[field]) === phaseDef.fields[i]);
    if (input.publicKeyText.trim() && input.trustedOrigin.trim() === header["Center-Origin"] && window.crypto && crypto.subtle) {
      try {
        const jwk = JSON.parse(input.publicKeyText);
        if (jwk.kty !== "EC" || jwk.crv !== "P-256" || jwk.d) throw new Error("A public P-256 key is required");
        const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
        const base64 = String(header["Declaration-Hash"]).replace(/-/g, "+").replace(/_/g, "/");
        const raw = atob(base64);
        const signature = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) signature[i] = raw.charCodeAt(i);
        result.signature = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signature, new TextEncoder().encode(canonicalHeader(header)));
      } catch { result.signature = false; }
    }
    if (!result.signature) result.reason = "UNSIGNED_PDH: No verifiable signature against a trusted Center-Origin key. A non-empty hash alone is not proof of a signature.";
    else if (!result.freshness) result.reason = "STALE_PDH: The effective timestamp is future-dated or more than 90 days before the evidence cutoff; revalidation is required.";
    else if (!result.consistency) result.reason = "INCOHERENT_PDH: Field values contradict the declared phase.";
    else { result.status = "VALID"; result.declared = phase; result.reason = "Complete, signed against the supplied trusted origin key, fresh, and internally consistent."; }
    return result;
  }

  /* ──────────────────────────────────────────────────────────────
     The working badge — CWO presumed until evidence disproves it.
     A visible progress marker for review; never the issued badge.
     ────────────────────────────────────────────────────────────── */
  function computeWorkingBadge(input, detected, formalBadge, complete) {
    const vector = scoredVector(input);
    const segments = input.answers.map((answer, i) => {
      const documented = hasScoringCitation(input, answer) && !(i === 3 && input.version === "1.1" && answer.value === true && !b4Qualifies(input));
      return { code: `B${i + 1}`, documented, answer: answer.value, scoredAnswer: documented ? vector[i] : null };
    });
    const filled = segments.filter(segment => segment.documented).length;
    const cwoBranch = [[0, false], [1, true], [2, false], [4, false]];
    const contradictions = cwoBranch.filter(([i, expected]) => segments[i] && segments[i].documented && vector[i] !== expected);
    const cwoComplete = cwoBranch.every(([i, expected]) => segments[i] && segments[i].documented && vector[i] === expected);
    const nabComplete = cwoComplete && segments[3] && segments[3].documented && vector[3];
    const disproved = contradictions.length > 0;
    // NAB refines the four-condition CWO branch; it need not contradict it to win the ordered tree.
    const resolved = filled === 5 || nabComplete || cwoComplete || detected === "NAB-Constrained";
    const phase = filled === 0 ? "CWO" : nabComplete ? "NAB" : cwoComplete ? "CWO" : (resolved || disproved) ? detected : "CWO";
    const assumed = phase === "CWO" && !cwoComplete;
    const state = filled === 0 ? "blank" : filled === 5 && ["AMBIGUOUS", "INCOHERENT"].includes(phase) ? "contested" : resolved && complete ? "provisional" : "forming";
    const constraints = scoredConstraints(input);
    const constraintsEvidenced = input.constraints.filter((a, i) => hasScoringCitation(input, a) && (a.value === false || constraints[i])).length;
    const constraintNote = constraintsEvidenced ? ` ${constraintsEvidenced} external constraint ${constraintsEvidenced === 1 ? "check is" : "checks are"} separately evidenced.` : "";
    const remaining = segments.filter(segment => !segment.documented).map(segment => segment.code);
    const label = filled === 0 ? "CWO — default, unproven" : assumed ? `CWO — default holding, ${filled}/5 evidenced` : state === "contested" ? `${phase} — contested pattern` : `${phase} — provisional, ${filled}/5 evidenced`;
    let explanation;
    if (filled === 0) explanation = "The working badge begins as an unproven CWO default, not a finding. Dated public evidence fills its arcs and can replace that starting assumption.";
    else if (phase === "NAB" && nabComplete) explanation = "The evidenced vector matches refusal-bound NAB, including terminal refusal (B4). NAB takes precedence over the broader four-condition CWO branch.";
    else if (phase === "CWO" && cwoComplete) explanation = `All four required CWO predicates are evidenced. ${remaining.length ? "The remaining question is not yet evidenced." : "The record-only branch matches the evidenced vector."}`;
    else if (disproved) explanation = `Evidenced ${contradictions.map(([i]) => segments[i].code).join(", ")} answers contradict the record-only CWO default. The working pattern is ${phase}${state === "contested" ? "; the vector remains unresolved" : ""}.`;
    else explanation = `The CWO starting assumption has not yet been resolved. ${remaining.join(", ")} ${remaining.length === 1 ? "is" : "are"} not yet evidenced.`;
    if (input.automation && input.automation.reviewRequired) explanation += " These research suggestions still need human review.";
    return { phase, assumed, disproved, filled, segments, state, constraintsEvidenced, label, explanation: explanation + constraintNote, formal: formalBadge };
  }

  /* The sandbox badge (workspace extension): five segments coloured per
     answer — consistent with the CWO presumption, or proven wrong. */
  const CUSTODIAL_ANSWERS = [false, true, false, true, false];
  function provisionalBadge(answers, supported) {
    const segments = CUSTODIAL_ANSWERS.map((custodialAnswer, index) => {
      const answer = answers[index] ?? null;
      const isSupported = !!supported[index] && answer !== null;
      const state = !isSupported ? "blank" : answer === custodialAnswer ? "custodial" : "authority";
      return { code: `B${index + 1}`, short: questions[index].short, state, answer, supported: isSupported, custodialAnswer };
    });
    const provenWrong = segments.filter(s => s.state === "authority").map(s => s.code);
    const upheld = segments.filter(s => s.state === "custodial").map(s => s.code);
    const blank = segments.filter(s => s.state === "blank").map(s => s.code);
    const filled = provenWrong.length + upheld.length;
    const list = codes => codes.length === 0 ? "none" : codes.length === 1 ? codes[0] : `${codes.slice(0, -1).join(", ")} and ${codes[codes.length - 1]}`;
    const summary = filled === 0
      ? "Blank provisional badge: no question has qualifying evidence yet. The default presumption is CWO, witness-only."
      : `Provisional badge with ${filled} of 5 segments coloured in. The CWO presumption is proven wrong on ${list(provenWrong)} and upheld on ${list(upheld)}. Blank: ${list(blank)}.`;
    return { presumption: "CWO", segments, filled, provenWrong, upheld, blank, summary, normative: false };
  }
  const blankBadge = () => provisionalBadge([null, null, null, null, null], [false, false, false, false, false]);

  /* ──────────────────────────────────────────────────────────────
     STEPS 1–5 — create the full audit record
     ────────────────────────────────────────────────────────────── */
  async function createAudit(input, existing) {
    if (!input.name.trim() || !isCalendarDate(input.cutoff)) throw new Error("Provide an entity name and a real YYYY-MM-DD evidence cutoff.");
    if (!Array.isArray(input.answers) || input.answers.length !== 5 || !Array.isArray(input.constraints) || input.constraints.length !== 4) throw new Error("The audit requires exactly five behavioral answers and four constraint fields.");
    // Snapshot the submitted record: subsequent edits must not mutate evidence already exported or saved.
    input = JSON.parse(JSON.stringify(input));
    const pdh = await validatePDH(input);
    if (pdh.status === "VALID" && existing.some(a => !a.baseline && a.pdh.headerId === pdh.headerId && a.pdh.payload !== pdh.payload)) {
      pdh.status = "INVALID"; pdh.structural = false; pdh.declared = "NONE";
      pdh.reason = "NO_VALID_PDH: This Header-ID is already bound to different declaration fields in the local workspace.";
    }
    const vector = scoredVector(input);
    const initial = classify(vector);
    const constraints = scoredConstraints(input);
    let phase = initial.phase;
    let confidence = initial.confidence;
    // An unanswered behavioral question is unknown, not NO: never let it complete a NAB/CWO/GSRB branch.
    if (input.answers.some(a => a.value === null) && ["NAB", "CWO", "GSRB"].includes(phase)) { phase = "AMBIGUOUS"; confidence = "NONE"; }
    if (phase === "AMBIGUOUS" && constraints.every(Boolean)) { phase = "NAB-Constrained"; confidence = "HIGH"; }
    const answerDocumented = input.answers.map((a, i) => a.value !== null && (a.value ? hasScoringCitation(input, a) && (input.version === "1.0" || i !== 3 || b4Qualifies(input)) : hasScoringCitation(input, a) || a.gap.trim().length >= 8));
    const constraintDocumented = initial.phase !== "AMBIGUOUS" || input.constraints.every((a, i) => a.value !== null && (a.value ? constraints[i] : hasScoringCitation(input, a) || a.gap.trim().length >= 8));
    const sourceCount = input.answers.filter(a => hasScoringCitation(input, a)).length;
    const complete = answerDocumented.every(Boolean) && constraintDocumented && sourceCount > 0 && !(input.automation && input.automation.reviewRequired);
    if (!complete) confidence = "NONE";
    let compliance = "N/A"; let badge = "Unissued"; let severity = "WARNING";
    let finding = `Observable behavior matches ${phase}; no valid phase declaration was supplied. Publish a signed PDH matching the detected behavior before a badge can be issued.`;
    if (phase === "AMBIGUOUS") {
      compliance = input.version === "1.1" ? "N/A (phase unresolved)" : "INCOHERENT";
      severity = input.version === "1.1" ? "WARNING" : "BREACH";
      finding = input.version === "1.1" ? "Observed conditions partially match a defined phase branch; no phase badge is assigned. One or more constraint criteria are not demonstrated." : "The behavioral vector is ambiguous. Constraint evidence does not demonstrate all four checks; v1.0’s optional escalation is not automated because it has no specified predicate.";
    } else if (phase === "INCOHERENT") {
      compliance = "INCOHERENT"; badge = "Invalid"; severity = "COLLAPSE_RISK";
      finding = "No defined branch reaches the minimum match threshold. Require clarification and revalidation before a phase badge can be considered.";
    } else if (pdh.status === "VALID") {
      if (pdh.declared === phase) { compliance = "COMPLIANT"; badge = "Confirmed"; severity = "INFORMATIONAL"; finding = `The validated declaration and observed behavior both identify ${phase}. The declaration is consistent with the documented activator vector.`; }
      else { compliance = "MISMATCH"; badge = "Reclassified"; severity = "BREACH"; finding = `The entity declares ${pdh.declared}, but its documented behavior identifies ${phase}. The phase is reclassified and the contradiction is logged.`; }
    }
    if (!complete) { badge = "Unissued"; compliance = "N/A (evidence incomplete)"; severity = "WARNING"; finding = `Provisional scoring yields ${phase}; the public evidence record is incomplete. Unsupported v1.1 YES answers are coded NO, not treated as proof of a negative; no badge is issued.`; }
    if (input.automation && input.automation.reviewRequired) {
      confidence = "NONE"; badge = "Unissued"; compliance = "N/A (automatic research awaits review)"; severity = "WARNING";
      finding = `Automatic research suggests a provisional ${phase} pattern for ${input.name}. Source identity, publication dates, scope, and suggested answers require human review; missing demonstrations are scoring codes, not proven negatives. No phase badge is issued.`;
    }
    const now = new Date().toISOString();
    const entityCode = (input.identifier || input.name).toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-").slice(0, 32) || "ENTITY";
    const history = existing.filter(a => !a.baseline && (input.identifier ? a.identifier === input.identifier : a.name.toLowerCase() === input.name.toLowerCase())).sort((a, b) => a.cutoff.localeCompare(b.cutoff));
    const nextSequence = Math.max(0, ...history.map(a => Number(String((a.report && a.report.Duty_Collation_Entry_ID) || "").split("-").pop()) || 0)) + 1;
    const entryId = `PDH-${input.cutoff}-${entityCode}-${String(nextSequence).padStart(3, "0")}`;
    const decrement = input.decrement.enabled && isPublicUrl(input.decrement.oldSource) && isPublicUrl(input.decrement.newSource) && beforeCutoff(input.decrement.oldDate, input.cutoff) && beforeCutoff(input.decrement.newDate, input.cutoff) && dateTime(input.decrement.oldDate) < dateTime(input.decrement.newDate) && input.decrement.notes.trim().length >= 8;
    const previousRecords = history.filter(a => a.cutoff <= input.cutoff);
    const previous = previousRecords[previousRecords.length - 1];
    let temporalPattern = decrement ? "Drift" : "N/A";
    let transition = null;
    if (previous) {
      let status = "OBSERVED_ONLY"; let notes = "A temporal transition requires distinct valid declarations with different effective timestamps at both endpoints. This record alone does not authorize a transition.";
      temporalPattern = decrement ? "Drift" : previous.phase === phase ? "Stable" : "N/A";
      if (previous.pdh.status === "VALID" && pdh.status === "VALID" && previous.pdh.headerId !== pdh.headerId && previous.pdh.effectiveTimestamp !== pdh.effectiveTimestamp && complete) {
        if (previous.phase === "GSRB" && ["NAB", "CWO"].includes(phase)) { status = "FORBIDDEN"; severity = "COLLAPSE_RISK"; badge = "Invalid"; compliance = "MISMATCH (forbidden transition)"; notes = "UNAUTHORIZED_REVERSION: GSRB cannot revert to NAB or CWO without complete structural collapse and rebuild."; finding += " The attempted reversion is forbidden under the source transition rule; no destination badge is issued."; }
        else if (["NAB", "CWO"].includes(previous.phase) && phase === "GSRB") { status = "DECLARATION_REVIEW_REQUIRED"; badge = "Unissued"; severity = "WARNING"; notes = "SOVEREIGNTY_ESCALATION: the signed declaration must additionally state loss of misuse resistance; that textual precondition is not independently verified by this workspace."; finding += " The sovereignty transition requires declaration review before a badge can be issued."; }
        else if (["NAB", "CWO"].includes(previous.phase) && ["NAB", "CWO"].includes(phase)) { status = "ALLOWED"; notes = "A reversible NAB ↔ CWO transition with a valid destination declaration."; }
        else if (previous.phase === phase) { status = "ALLOWED"; notes = "Stable phase across both validated declaration records."; }
        else { status = "UNSPECIFIED"; notes = "The source does not specify a transition rule for this combination; no permission is inferred."; }
        if (previous.pdh.declared !== pdh.declared && previous.phase === phase) { temporalPattern = "Rebranding"; severity = "BREACH"; }
        if (previousRecords.some(a => a.phase === "NAB") && previous.phase === "CWO" && phase === "GSRB") temporalPattern = "Drift";
      }
      transition = { from: previous.phase, to: phase, fromDate: previous.cutoff, toDate: input.cutoff, status, pattern: temporalPattern, severity, entryId, notes };
    }
    const evidence = [];
    [...input.answers, ...input.constraints].forEach((answer, i) => {
      if (!hasScoringCitation(input, answer)) return;
      const code = i < 5 ? `B${i + 1}` : `C${i - 4}`;
      const duplicate = evidence.find(e => e.url === answer.source && e.published === answer.date);
      if (duplicate) duplicate.codes.push(code);
      else evidence.push({ id: `${entryId}-E${evidence.length + 1}`, title: answer.notes.slice(0, 80), url: answer.source, published: answer.date, retrieved: now.slice(0, 10), claim: answer.notes, codes: [code], entity: input.name });
    });
    const externalDemonstrated = input.external.exists && isPublicUrl(input.external.source) && beforeCutoff(input.external.date, input.cutoff) && !!input.external.holder.trim() && !!input.external.scope.trim();
    const externalRecord = { ...input.external, exists: externalDemonstrated, exercised: externalDemonstrated && input.external.exercised, Exists: externalDemonstrated ? "YES" : "NO", Exercised: externalDemonstrated && input.external.exercised ? "YES" : "NO", Auditor_Stated_Exists: input.external.exists, Auditor_Stated_Exercised: input.external.exercised, Descriptive_Only: true, Latent: externalDemonstrated && !input.external.exercised, Evidence_Gap: input.external.exists && !externalDemonstrated ? "Qualifying public provenance was not demonstrated by the cutoff." : null };
    if (externalDemonstrated && !evidence.some(e => e.url === input.external.source)) evidence.push({ id: `${entryId}-EXTERNAL`, title: `External authority: ${input.external.holder}`, url: input.external.source, published: input.external.date, retrieved: now.slice(0, 10), claim: input.external.scope, codes: ["EXTERNAL (NON-SCORING)"], entity: input.name });
    if (decrement) for (const [code, url, date] of [["OLD", input.decrement.oldSource, input.decrement.oldDate], ["NEW", input.decrement.newSource, input.decrement.newDate]]) {
      if (!evidence.some(e => e.url === url)) evidence.push({ id: `${entryId}-DECREMENT-${code}`, title: `Constraint decrement: ${code.toLowerCase()} instrument`, url, published: date, retrieved: now.slice(0, 10), claim: input.decrement.notes, codes: ["TEMPORAL (NON-SCORING)"], entity: input.name });
    }
    if (input.automation) for (const source of input.automation.sources) {
      if (!isPublicUrl(source.url) || evidence.some(e => e.url === source.url)) continue;
      evidence.push({ id: `${entryId}-${source.id}`, title: source.title, url: source.url, published: source.published || "", retrieved: source.retrieved.slice(0, 10), claim: source.excerpt || "Research context only; no qualifying operational claim extracted.", codes: [source.kind === "news" ? "NEWS LEAD — NEVER SCORED" : "RESEARCH CONTEXT — UNSCORED"], entity: input.name });
    }
    const replicationRisk = complete && pdh.status === "VALID" ? "LOW" : complete ? "MEDIUM" : "HIGH";
    const activatorVector = input.answers.map((a, i) => ({ Question: `B${i + 1}`, Auditor_Answer: a.value === null ? "UNANSWERED" : a.value ? "YES" : "NO", Scored_Answer: vector[i] ? "YES" : "NO", Source: a.source || null, Publication_Date: a.date || null, Claim: a.notes || null, Evidence_Gap: a.gap || (!hasScoringCitation(input, a) ? "No qualifying public artifact by cutoff." : null), Cutoff_Status: hasScoringCitation(input, a) ? "ELIGIBLE" : "NOT_DEMONSTRATED" }));
    const report = {
      Algorithm_Version: `Ground-0 v${input.version}`, Specification_Status: input.version === "1.0" ? "NORMATIVE BASELINE" : "AMENDMENT DRAFT — NOT RATIFIED", Record_Status: complete ? "EVIDENCE_DOCUMENTED" : "DRAFT — EVIDENCE INCOMPLETE",
      Entity_Name: input.name.trim(), Entity_Identifier: input.identifier.trim() || null, Audit_Timestamp: now, Evidence_Cutoff: `${input.cutoff}T23:59:59.999Z`,
      PDH_Status: pdh.status, PDH_Validation: pdh, Declared_Phase: pdh.declared, Detected_Phase: phase, Compliance_Status: compliance, Confidence_Level: confidence, Severity_Level: severity, Badge_Status: badge, Finding: finding,
      Evidence_Summary: evidence,
      ...(input.automation ? { Automation: input.automation, Review_Status: input.automation.reviewRequired ? "HUMAN_REVIEW_REQUIRED" : "REVIEWED_BY_AUDITOR", Research_Sources: input.automation.sources, Registry_Coverage: input.automation.coverage || [], Research_Limits: input.automation.warnings || [] } : {}),
      Activator_Vector: activatorVector, Branch_Matches: { NAB: initial.matches[0], CWO: initial.matches[1], GSRB: initial.matches[2] },
      B4_Event_Record: { ...input.b4, B4_Basis: input.b4.basis, Actor: input.b4.actor, Action: input.b4.action, Procedure: input.b4.procedure, Result_Claim: input.answers[3].notes || "NOT_RECORDED", External_Order_Separate: input.external, Scored_Answer: vector[3] ? "YES" : "NO" },
      Constraint_Results: input.constraints.map((a, i) => ({ Code: `C${i + 1}`, Auditor_Answer: a.value === null ? "UNANSWERED" : a.value ? "YES" : "NO", Scored_Answer: constraints[i] ? "YES" : "NO", Source: a.source, Publication_Date: a.date, Evidence_Gap: a.gap })), C2_Outcome_Record: input.c2,
      External_Constraint_Record: externalRecord, Constraint_Decrement: { Verified_By_Auditor: decrement ? "YES" : "NO", ...input.decrement, Non_Scoring: true },
      Working_Badge: null, Duty_Collation_Entry_ID: entryId, Replication_Risk: replicationRisk, Temporal_Pattern: temporalPattern,
      Transition_History: [...history.filter(a => a.cutoff <= input.cutoff).flatMap(a => a.transition ? [a.transition] : []), ...(transition ? [transition] : [])],
      Implementation_Notes: ["Signatures use the workspace ECDSA P-256/SHA-256 adapter; origin-key trust is supplied by the auditor, not independently certified. Header-ID conflicts are checked locally, not against an external registry.", ...(input.version === "1.0" ? ["The unspecified optional Step 3.5 GSRB escalation is never inferred automatically."] : []), "The source does not define a rapid-oscillation time threshold; no automated oscillation finding is made."]
    };
    const workingBadge = computeWorkingBadge(input, phase, badge, complete);
    report.Working_Badge = workingBadge;
    const method = input.automation ? "automatic" : "manual";
    const status = !complete ? "Draft" : (phase === "AMBIGUOUS" || phase === "INCOHERENT" || (transition && (transition.status === "FORBIDDEN" || transition.status === "DECLARATION_REVIEW_REQUIRED"))) ? "Needs review" : "Complete";
    return {
      workingBadge, input, method, id: (window.crypto && typeof crypto.randomUUID === "function") ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name: input.name.trim(), identifier: input.identifier.trim(), version: input.version, createdAt: now, cutoff: input.cutoff,
      reportedDeclared: pdh.declared === "NONE" ? "None" : pdh.declared, phase, confidence, severity, compliance, badge, status, baseline: false,
      evidence, answers: input.answers, constraints: input.constraints, pdh, finding, replicationRisk, temporalPattern, transition, report
    };
  }

  /* The six replication cases reported by the v1.0 manuscript —
     source-reported, never independently verified here. */
  function baselineAudits() {
    const rows = [
      ["Quantum Library", "QL-001", "CWO", "CWO", "HIGH"],
      ["World Health Organization", "WHO", "None", "GSRB", "HIGH"],
      ["Federal Reserve", "FED", "Implicit NAB", "GSRB", "HIGH"],
      ["Social Platform", "SP-001", "NAB / CWO", "GSRB", "HIGH"],
      ["Government (Normal)", "GOV-N", "Implicit CWO", "AMBIGUOUS", "MEDIUM"],
      ["Government (Emergency)", "GOV-E", "Implicit", "GSRB", "HIGH"]
    ];
    return rows.map(([name, identifier, declared, phase, confidence], i) => {
      const finding = `The v1.0 manuscript reports ${phase} with ${confidence.toLowerCase()} confidence for this baseline test. The underlying artifact set, activator vector, and signed PDH are not supplied here; this is not an independently verified audit.`;
      return {
        workingBadge: { phase, assumed: false, disproved: false, filled: 0, segments: Array.from({ length: 5 }, (_, n) => ({ code: `B${n + 1}`, documented: false, answer: null })), state: "blank", constraintsEvidenced: 0, label: `${phase} — reported by source`, explanation: "The manuscript reports this phase without supplying its activator vector or artifacts, so no segment of this badge can be filled in here.", formal: "Unissued" },
        id: `baseline-${i}`, name, identifier, method: "manual", version: "1.0", createdAt: "2026-09-12T00:00:00Z", cutoff: "",
        reportedDeclared: declared, phase, confidence, severity: phase === "AMBIGUOUS" ? "WARNING" : "INFORMATIONAL", compliance: "N/A (source baseline)", badge: "Unissued",
        status: phase === "AMBIGUOUS" ? "Needs review" : "Complete", baseline: true, evidence: [],
        answers: Array.from({ length: 5 }, emptyAnswer), constraints: Array.from({ length: 4 }, emptyAnswer),
        pdh: missingPDH(), finding, replicationRisk: "HIGH", temporalPattern: "N/A", transition: null,
        report: { Source_Baseline: true, Source: "Ground-0 v1.0, Section XII — Test Replication Results", Algorithm_Version: "1.0", Entity_Name: name, Entity_Identifier: identifier, Audit_Timestamp: null, Baseline_Finalization_Date: "2026-09-12", Evidence_Cutoff: "NOT STATED IN MANUSCRIPT", PDH_Status: "MISSING", Declared_Phase: "NONE", Reported_Declaration: declared, Detected_Phase: phase, Confidence_Level: confidence, Confidence_Basis: "REPORTED BY SOURCE — NOT RECOMPUTED", Compliance_Status: "N/A (source baseline)", Badge_Status: "Unissued", Severity_Level: phase === "AMBIGUOUS" ? "WARNING" : "INFORMATIONAL", Finding: finding, Evidence_Summary: [], Activator_Vector: "NOT SUPPLIED", B4_Event_Record: "NOT SUPPLIED", External_Constraint_Record: "NOT SUPPLIED", Constraint_Decrement: "NOT ASSESSED", Duty_Collation_Entry_ID: `BASELINE-${identifier}`, Replication_Risk: "HIGH — supporting evidence unavailable in workspace", Temporal_Pattern: "N/A", Transition_History: [] }
      };
    });
  }

  /* ──────────────────────────────────────────────────────────────
     Formatting + export
     ────────────────────────────────────────────────────────────── */
  function formatDate(date, short = false) {
    if (!date) return "Not stated";
    if (!Number.isFinite(dateTime(date))) return "Invalid date";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", ...(short ? {} : { year: "numeric" }), timeZone: "UTC" }).format(new Date(date.length === 10 ? `${date}T00:00:00Z` : date));
  }
  function sourceDateDescription(source) {
    if (source.kind === "news" || source.dateBasis === "indexed") return source.published ? `Indexed ${formatDate(source.published)} · not a verified publication date` : "Index date not demonstrated · lead only";
    if (source.capturedAt) return `Captured ${formatDate(source.capturedAt)}${source.published ? ` · published / effective ${formatDate(source.published)}` : " · publication date not stated"}`;
    return source.published ? `Published / effective ${formatDate(source.published)}` : "Date not demonstrated · context only";
  }
  function downloadFile(name, content, type = "application/json") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = name;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportAudit(audit) { downloadFile(`ground-0-${audit.identifier || "audit"}-v${audit.version}.json`, JSON.stringify(audit.report, null, 2)); }

  /* ──────────────────────────────────────────────────────────────
     Storage — defensive hydration with recovery backups.
     Old or malformed records never invent evidence.
     ────────────────────────────────────────────────────────────── */
  const phases = ["NAB", "CWO", "NAB-Constrained", "GSRB", "AMBIGUOUS", "INCOHERENT"];
  const sourceKinds = ["official", "court", "regulatory", "legislative", "news", "archive", "public", "context"];
  /* Retrieved text is kept so a linked model can read what this browser
     actually fetched. Bounded: the excerpt stays the short quotable line,
     `text` is the readable document, capped per source and per audit. */
  const MAX_SOURCE_TEXT = 20000;
  const MAX_AUDIT_TEXT = 240000;
  const text = (value, fallback = "") => typeof value === "string" ? value : fallback;
  const strings = value => Array.isArray(value) ? value.filter(v => typeof v === "string") : [];

  function normalizeAnswer(value) {
    if (!isObject(value)) return emptyAnswer();
    return { value: typeof value.value === "boolean" ? value.value : null, source: safePublicUrl(value.source) ? value.source : "", date: text(value.date), notes: text(value.notes), gap: text(value.gap) };
  }
  function typedFields(defaults, value) {
    const result = { ...defaults };
    if (isObject(value)) for (const key of Object.keys(defaults)) if (typeof value[key] === typeof defaults[key]) result[key] = value[key];
    return result;
  }
  function normalizeCoverage(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(isObject).filter(c => typeof c.registry === "string").map(c => ({ registry: text(c.registry), scope: text(c.scope), source: text(c.source), found: typeof c.found === "number" && Number.isFinite(c.found) ? Math.max(0, c.found) : 0, mentions: typeof c.mentions === "number" && Number.isFinite(c.mentions) ? Math.max(0, c.mentions) : 0, status: ["searched", "no-match", "unavailable", "partial", "not-needed", "not-searched"].includes(text(c.status)) ? c.status : "not-searched" }));
  }
  function normalizeSources(value) {
    if (!Array.isArray(value)) return [];
    const used = new Set();
    return value.filter(isObject).filter(s => safePublicUrl(s.url)).map((s, i) => {
      let id = text(s.id, `RECOVERED-SOURCE-${i + 1}`);
      if (used.has(id)) id = `${id}-${i + 1}`;
      used.add(id);
      const out = { id, title: text(s.title, "Public source"), url: s.url, published: isCalendarDate(s.published) ? s.published : null, retrieved: Number.isFinite(dateTime(s.retrieved)) ? s.retrieved : "", excerpt: text(s.excerpt), codes: Array.from(new Set(strings(s.codes))), kind: sourceKinds.includes(s.kind) ? s.kind : "context" };
      if (typeof s.text === "string" && s.text.trim().length >= 60) out.text = s.text.slice(0, MAX_SOURCE_TEXT);
      if (typeof s.authority === "string" && s.authority.trim()) out.authority = text(s.authority).slice(0, 200);
      if (isCalendarDate(s.capturedAt)) out.capturedAt = s.capturedAt;
      if (safePublicUrl(s.originalUrl)) out.originalUrl = s.originalUrl;
      if (["publication", "archive-capture", "indexed", "unknown"].includes(text(s.dateBasis))) out.dateBasis = s.dateBasis;
      return out;
    });
  }
  function normalizeAuditInput(value, fallbackVersion = "1.0") {
    const raw = isObject(value) ? value : {};
    const defaults = newInput(raw.version === "1.1" ? "1.1" : fallbackVersion);
    let automation;
    if (isObject(raw.automation)) {
      const a = raw.automation;
      const methods = ["web-research", "public-lookup", "llm-reading"];
      automation = { method: methods.includes(a.method) ? a.method : "public-lookup", provider: text(a.provider, "Public research"), requestedName: text(a.requestedName, text(raw.name)), generatedAt: text(a.generatedAt), reviewRequired: a.reviewRequired !== false, sources: normalizeSources(a.sources), coverage: normalizeCoverage(a.coverage), warnings: strings(a.warnings) };
      if (typeof a.coverageNote === "string" && a.coverageNote.trim()) automation.coverageNote = a.coverageNote.slice(0, 1200);
      if (isObject(a.llm)) automation.llm = normalizeLlm(a.llm);
    }
    return { ...defaults, name: text(raw.name), identifier: text(raw.identifier), cutoff: isCalendarDate(raw.cutoff) ? raw.cutoff : defaults.cutoff, answers: Array.from({ length: 5 }, (_, i) => normalizeAnswer(Array.isArray(raw.answers) ? raw.answers[i] : undefined)), constraints: Array.from({ length: 4 }, (_, i) => normalizeAnswer(Array.isArray(raw.constraints) ? raw.constraints[i] : undefined)), b4: typedFields(defaults.b4, raw.b4), c2: typedFields(defaults.c2, raw.c2), external: typedFields(defaults.external, raw.external), decrement: typedFields(defaults.decrement, raw.decrement), headerText: text(raw.headerText), publicKeyText: text(raw.publicKeyText), trustedOrigin: text(raw.trustedOrigin, defaults.trustedOrigin), ...(automation ? { automation } : {}) };
  }
  function normalizePdh(value) {
    const raw = isObject(value) ? value : {};
    const status = raw.status === "VALID" && raw.structural === true && raw.signature === true && raw.freshness === true && raw.consistency === true ? "VALID" : (raw.status === "INVALID" || raw.status === "VALID") ? "INVALID" : "MISSING";
    return { status, structural: raw.structural === true, signature: raw.signature === true, freshness: raw.freshness === true, consistency: raw.consistency === true, declared: ["NAB", "CWO", "GSRB"].includes(text(raw.declared)) ? raw.declared : "NONE", reason: text(raw.reason, "The stored declaration record is incomplete; revalidate before relying on it."), ...(typeof raw.headerId === "string" ? { headerId: raw.headerId } : {}), ...(typeof raw.payload === "string" ? { payload: raw.payload } : {}), ...(typeof raw.effectiveTimestamp === "string" ? { effectiveTimestamp: raw.effectiveTimestamp } : {}) };
  }
  function normalizeEvidence(value) {
    if (!isObject(value) || !safePublicUrl(value.url)) return null;
    return { id: text(value.id, `E-${Math.random().toString(36).slice(2, 8)}`), title: text(value.title, "Public artifact"), url: value.url, published: text(value.published), retrieved: text(value.retrieved), claim: text(value.claim), codes: strings(value.codes), entity: text(value.entity) };
  }
  /* The record of what a linked model read and proposed. Kept separate
     from the research block so a reviewer can see both, and so a
     re-hydrated record never presents a model reading as a source. */
  function normalizeLlm(value) {
    const raw = isObject(value) ? value : {};
    const number = key => typeof raw[key] === "number" && Number.isFinite(raw[key]) ? raw[key] : 0;
    const rows = list => Array.isArray(list) ? list.filter(isObject).slice(0, 60).map(row => ({ ...row, quote: text(row.quote).slice(0, 800), url: safePublicUrl(row.url) ? row.url : text(row.url).slice(0, 400) })) : [];
    return {
      method: "llm-reading",
      provider: text(raw.provider, "Linked model").slice(0, 120),
      model: text(raw.model).slice(0, 120),
      endpoint: text(raw.endpoint).slice(0, 300),
      generatedAt: Number.isFinite(dateTime(raw.generatedAt)) ? raw.generatedAt : "",
      reviewRequired: true,
      passes: number("passes"),
      sourcesRead: number("sourcesRead"),
      charsRead: number("charsRead"),
      verified: number("verified"),
      rejected: rows(raw.rejected),
      held: rows(raw.held),
      unknowns: Array.isArray(raw.unknowns) ? raw.unknowns.filter(isObject).slice(0, 20).map(row => ({ code: text(row.code).slice(0, 8), note: text(row.note).slice(0, 300) })) : [],
      usage: { input: isObject(raw.usage) && Number.isFinite(raw.usage.input) ? raw.usage.input : 0, output: isObject(raw.usage) && Number.isFinite(raw.usage.output) ? raw.usage.output : 0 },
      followUps: Array.isArray(raw.followUps) ? raw.followUps.filter(isObject).slice(0, 12).map(row => ({ id: text(row.id).slice(0, 40), url: safePublicUrl(row.url) ? row.url : text(row.url).slice(0, 400), label: text(row.label).slice(0, 200), why: text(row.why).slice(0, 300) })) : [],
      note: text(raw.note, "A linked model proposed these readings; every quote is checked against the stored source text and a person must review each answer.").slice(0, 800)
    };
  }
  function normalizeTransition(value) {
    if (!isObject(value) || !phases.includes(value.from) || !phases.includes(value.to) || !isCalendarDate(value.fromDate) || !isCalendarDate(value.toDate)) return null;
    return { from: value.from, to: value.to, fromDate: value.fromDate, toDate: value.toDate, status: text(value.status, "OBSERVED_ONLY"), pattern: text(value.pattern, "N/A"), severity: text(value.severity, "WARNING"), entryId: text(value.entryId), notes: text(value.notes) };
  }
  /* Hydrate older records without inventing evidence or a declaration,
     and rebuild only the working display badge. */
  function normalizeAuditRecord(value) {
    if (!isObject(value) || typeof value.id !== "string" || !value.id || typeof value.name !== "string" || !value.name.trim() || !phases.includes(value.phase)) return null;
    const version = value.version === "1.1" ? "1.1" : "1.0";
    const phase = value.phase;
    const input = normalizeAuditInput({ ...(isObject(value.input) ? value.input : {}), name: value.name, identifier: text(value.identifier), version, cutoff: value.cutoff, answers: isObject(value.input) && Array.isArray(value.input.answers) ? value.input.answers : value.answers, constraints: isObject(value.input) && Array.isArray(value.input.constraints) ? value.input.constraints : value.constraints }, version);
    if (input.automation) {
      if (!input.automation.coverage || !input.automation.coverage.length) input.automation.coverage = normalizeCoverage(isObject(value.report) ? value.report.Registry_Coverage : undefined);
      if (!input.automation.warnings || !input.automation.warnings.length) input.automation.warnings = strings(isObject(value.report) ? value.report.Research_Limits : undefined);
    }
    const pdh = normalizePdh(value.pdh);
    const badge = typeof value.badge === "string" && ["Confirmed", "Reclassified", "Invalid", "Unissued", "Conditional"].includes(value.badge) ? value.badge : "Unissued";
    const status = value.status === "Complete" ? "Complete" : value.status === "Needs review" ? "Needs review" : "Draft";
    const workingBadge = computeWorkingBadge({ ...input, cutoff: isCalendarDate(value.cutoff) ? value.cutoff : "" }, phase, badge, status !== "Draft" && !(input.automation && input.automation.reviewRequired));
    const report = isObject(value.report) ? { ...value.report } : {};
    report.Working_Badge = workingBadge;
    if (input.automation) { report.Automation = input.automation; report.Registry_Coverage = input.automation.coverage || []; }
    return { ...value, workingBadge, input, method: input.automation ? "automatic" : "manual", id: value.id, name: value.name, identifier: text(value.identifier), version, phase, createdAt: Number.isFinite(dateTime(value.createdAt)) ? value.createdAt : "", cutoff: isCalendarDate(value.cutoff) ? value.cutoff : "", reportedDeclared: text(value.reportedDeclared, "None"), confidence: ["HIGH", "MEDIUM", "LOW", "NONE"].includes(text(value.confidence)) ? value.confidence : "NONE", severity: text(value.severity, "WARNING"), compliance: text(value.compliance, "N/A"), badge, status, baseline: value.baseline === true, evidence: Array.isArray(value.evidence) ? value.evidence.map(normalizeEvidence).filter(Boolean) : [], answers: input.answers, constraints: input.constraints, pdh, finding: text(value.finding, "This saved record lacks a complete finding; review the evidence before use."), replicationRisk: text(value.replicationRisk, "HIGH"), temporalPattern: text(value.temporalPattern, "N/A"), transition: normalizeTransition(value.transition), report };
  }
  function preserveRecovery(key, original) {
    try { if (!localStorage.getItem(`${key}-recovery`)) localStorage.setItem(`${key}-recovery`, original); } catch { /* Storage restrictions must not crash the workspace. */ }
  }
  function loadArray(key, normalize) {
    let original = null;
    try {
      original = localStorage.getItem(key);
      if (!original) return [];
      const parsed = JSON.parse(original);
      if (!Array.isArray(parsed)) { preserveRecovery(key, original); return []; }
      const items = parsed.map(normalize).filter(value => value !== null);
      if (JSON.stringify(items) !== JSON.stringify(parsed)) preserveRecovery(key, original);
      return items;
    } catch { if (original) preserveRecovery(key, original); return []; }
  }
  const AUDITS_KEY = "ground-0-audits-v1";
  const EVIDENCE_KEY = "ground-0-evidence-v1";
  const loadAuditRecords = () => loadArray(AUDITS_KEY, normalizeAuditRecord);
  const loadEvidenceRecords = () => loadArray(EVIDENCE_KEY, normalizeEvidence);
  /* Retrieved text makes records large. If the browser refuses the write,
     shrink rather than lose the audit, and say so instead of failing
     silently: the readings stay, the readable documents get thinner. */
  let storageNote = "";
  const storageNoteOf = () => storageNote;
  function shrinkSourceText(list, limit) {
    const copy = JSON.parse(JSON.stringify(list));
    for (const record of copy) {
      const sources = record && record.input && record.input.automation && record.input.automation.sources;
      if (!Array.isArray(sources)) continue;
      for (const source of sources) {
        if (typeof source.text !== "string") continue;
        if (limit <= 0) delete source.text;
        else if (source.text.length > limit) source.text = source.text.slice(0, limit);
      }
    }
    return copy;
  }
  function saveAuditRecords(list) {
    storageNote = "";
    try { localStorage.setItem(AUDITS_KEY, JSON.stringify(list)); return true; }
    catch {
      for (const limit of [4000, 0]) {
        try {
          localStorage.setItem(AUDITS_KEY, JSON.stringify(shrinkSourceText(list, limit)));
          storageNote = limit ? `Browser storage was nearly full, so stored documents were trimmed to ${limit} characters each to keep this audit.` : "Browser storage was nearly full, so the stored document text was dropped to keep this audit. Every conclusion, quote and citation is intact; export the record before the next research run.";
          return true;
        } catch { /* try a smaller footprint */ }
      }
      storageNote = "Browser storage refused the record. Export your audits to keep a copy.";
      return false;
    }
  }
  function saveEvidenceRecords(list) {
    try { localStorage.setItem(EVIDENCE_KEY, JSON.stringify(list)); return true; }
    catch { return false; }
  }

  /* ────────────────────────────────────────────────────────────── */
  return {
    CENTER_ORIGIN, questions, constraintQuestions, phaseDefinitions, plainPhase, spokenPhase,
    headerExample, baselineAudits, blankBadge, provisionalBadge,
    newInput, emptyAnswer, today, classify, validatePDH, createAudit, computeWorkingBadge,
    scoredVector, scoredConstraints, b4Qualifies, qualifies, hasScoringCitation,
    isPublicUrl, safePublicUrl, canonicalUrl, parseArchiveUrl, sameResource, isCalendarDate, isIsoTimestamp,
    dateTime, eligibleByCutoff, withinCalendarMonths, artifactDate, isObject,
    formatDate, sourceDateDescription, downloadFile, exportAudit,
    loadAuditRecords, loadEvidenceRecords, saveAuditRecords, saveEvidenceRecords,
    storageNoteOf, shrinkSourceText, MAX_SOURCE_TEXT, MAX_AUDIT_TEXT,
    normalizeAuditRecord, normalizeAuditInput, normalizeEvidence
  };
})();
