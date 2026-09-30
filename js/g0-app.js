/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Ground-0 Audit (workspace app)

   The full phase-intelligence workspace, integrated into the OS shell:

     OVERVIEW     the standard, the pipeline, and the frontier-lab
                  case studies (declared vs observed, duty collation)
     REGISTER     every audit — baselines, manual, automatic — with
                  the working badge, filters, and JSON export
     MANUAL       the four-step versioned audit wizard (B1–B5, C1–C4,
                  B4/C2 relief records, PDH validation, transitions)
     AUTOMATIC    key-free public-record research: identity, official
                  pages, Wayback captures, court/regulatory/legislative
                  indexes, news leads — with honest coverage
     EVIDENCE     the public-artifact library (scored only when cited)
     TEMPORAL     the transition ledger and the transition rules
     PHASES       the phase reference (NAB · CWO · NAB-Constrained · GSRB)
     LOGIC        the interactive decision sandbox + 32-row truth table
     SPEC         the versioned specification reader (v1.0 / v1.1)
     ACCESS       accessibility preferences (text, contrast, motion,
                  reading mode, speech)

   Every save is witnessed in the OS duty-collation ledger (PLV);
   toasts surface through the shell. The app itself is CWO: it
   records and classifies, it never acts.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

/* ────────────────────────────────────────────────────────────────
   Specification reader data (versioned sections)
   ──────────────────────────────────────────────────────────────── */
const G0_SPEC = (() => {
  const amendmentItems = [
    { title: "A clearer refusal test", text: "B4 separates affected-party refusal and appeal from external orders. A terminal/stay rule, a complete ≥50% relief set, or binding penalty-free exit is required." },
    { title: "Deterministic constraint handling", text: "All C1–C4 must pass for NAB-Constrained. Otherwise the phase remains AMBIGUOUS; Step 3.5 cannot escalate to GSRB." },
    { title: "Distinct unresolved outcomes", text: "AMBIGUOUS is a partial branch fit. INCOHERENT is below the three-condition minimum. Their reporting and severity are separate." },
    { title: "Latent is not exercised", text: "Record whether external authority exists and whether it was used. An unexercised constraint grants no phase credit." },
    { title: "Cutoff and constraint decrement", text: "Every scored artifact must meet an inclusive evidence cutoff. Binding-to-nonbinding changes are logged as non-scoring temporal drift." }
  ];
  function getSections(version) {
    const draft = version === "1.1";
    return [
      { id: "inputs", numeral: "I", title: "Inputs & preconditions", summary: "Define the entity, the declaration, and the evidence boundary.", paragraphs: ["The algorithm compares observable operational behavior against a declared Phase Declaration Header (PDH). Detection proceeds even when the declaration is missing or invalid."], bullets: ["Entity name and identifier", "Phase Declaration Header, if one exists", "Observable behaviors from the Ground-0 five-question checklist", "Audit timestamp and context", "Public evidence set: policy documents, audit records, and enforcement patterns", ...(draft ? ["Inclusive Evidence_Cutoff: later artifacts cannot score; lookback windows run backward from this cutoff"] : [])] },
      { id: "flow", numeral: "II", title: "Algorithm flow", summary: "A traceable sequence from declaration to duty collation.", code: "01  Validate the Phase Declaration Header\n02  Run the five-question behavioral audit\n03  Detect the actual phase\n    ↳ AMBIGUOUS: run Step 3.5 constraint checks\n04  Compare declared and detected phases\n05  Audit temporal transitions, if applicable\n→   Output classification + duty collation entry" },
      { id: "pdh", numeral: "III", title: "PDH validation", summary: "Complete. Signed. Fresh. Consistent. All four are required.", paragraphs: ["All eleven fields must be present and properly formatted. A non-empty Declaration-Hash does not suffice: the cryptographic signature must verify against the Center-Origin. The default freshness window is 90 days. An invalid declaration is excluded from phase comparison, not from behavioral detection."], table: { headers: ["Required field", "Format or allowed values"], rows: [["Header-ID", "PDH-YYYY-MM-DD-XXXXX"], ["Creator-ID", "ꔧIDꔧ + ID + (ID); matches entity origin"], ["Center-Origin", "0•000•000•0000 or valid OCM derivative"], ["Declared-Phase", "NAB · CWO · GSRB"], ["Center-Capability", "Non-Acting · Custodial · Acting"], ["Legitimacy-Source", "External · Observed-Only · Internal"], ["Refusal-Semantics", "Terminal · Expository · Override-able"], ["Symbolism-Executability", "Disabled · Archived · Enabled"], ["Time-Authority-Effect", "Degrades · Neutral · Confirms"], ["Effective-Timestamp", "ISO-8601"], ["Declaration-Hash", "Non-empty, cryptographically verifiable signature"]] }, bullets: ["Incomplete → NO_VALID_PDH", "Unverifiable signature → UNSIGNED_PDH", "Older than 90 days → STALE_PDH; mandate revalidation", "Fields contradict the declared phase → INCOHERENT_PDH", "Only COMPLETE + SIGNED + FRESH + CONSISTENT yields PDH_VALID"] },
      { id: "behavior", numeral: "IV", title: "The behavioral audit", summary: "Five binary questions. Publicly observable evidence only.", table: { headers: ["Question", "YES activates"], rows: [["B1 · Can compliance be coerced?", "enforcement_present"], ["B2 · Can decisions be ignored without consequence?", "decisions_optional"], ["B3 · Do rules activate real-world effects?", "rules_execute"], ["B4 · Does refusal or appeal reliably STOP action?", "refusal_terminal (NO: refusal_override)"], ["B5 · Do rules persist by default?", "authority_persists (NO: authority_time_bound)"]] }, paragraphs: draft ? ["Every YES must cite a qualifying public artifact. For NO, cite contrary evidence or record a bounded search and evidence gap. No evidence is coded NO for scoring, not proof of the negative. Record URL/ID, publication or effective date, retrieval date, supported claim, and cutoff status.", "B4 requires a defined actor, audited action, and procedure. YES requires either a binding terminal/automatic stay rule; a complete published set of resolved appeals showing at least 50% relief, with numerator, denominator, and dates; or binding penalty-free exit that terminates the action. An external order and compliance with it do not by themselves establish B4=YES."] : ["Answer YES or NO using public observable evidence. Qualifying evidence includes documented enforcement, non-binding directives, downstream operational effects, functional appeals, and default policy persistence. The v1.0 B4 examples include formal appeals, court overturns, legislative overrides, penalty-free exit, and successful appeal history."] },
      { id: "detection", numeral: "V", title: "Phase detection logic", summary: "Evaluate ordered branch predicates; preserve the activator vector.", table: { headers: ["Branch", "B1", "B2", "B3", "B4", "B5"], rows: [["NAB", "NO", "YES", "NO", "YES", "NO"], ["CWO", "NO", "YES", "NO", "Either", "NO"], ["GSRB", "YES", "NO", "YES", "NO", "YES"]] }, paragraphs: ["Evaluate NAB first, then CWO, then GSRB. A complete branch match returns that phase with HIGH confidence. CWO has four required predicates; B4 is not part of its branch."], bullets: draft ? ["A partial branch with at least three matched required conditions → AMBIGUOUS", "One condition short of any branch → MEDIUM; otherwise partial fit → LOW", "No complete branch and no branch reaches three matches → INCOHERENT, LOW confidence", "Insufficient public evidence → NONE; unsupported activators are coded NO with gaps disclosed"] : ["Three or four aligned conditions, but not all → AMBIGUOUS; constraint analysis required", "Otherwise → INCOHERENT; no badge issued and clarification required", "HIGH: clear alignment; MEDIUM: one contradictory signal; LOW: multiple contradictions; NONE: insufficient public evidence"] },
      { id: "constraints", numeral: "VI", title: "Legislative constraint check", summary: "An AMBIGUOUS result earns NAB-Constrained only with all four checks.", table: { headers: ["Criterion", "Required demonstration"], rows: [["C1 · External override", "An actual external override or repeal within 24 months"], ["C2 · Active appeal mechanism", draft ? "Published route + invoked resolved cases + complete bounded outcome set + ≥50% relief" : "Functional appeals with documented success; source lists ≥50% relief and recent successful appeals"], ["C3 · Authority sunset", "Automatic expiry or required periodic renewal"], ["C4 · Temporal freshness", "Constraints currently functioning; qualifying recent activity within 12 months"]] }, paragraphs: [draft ? "All C1–C4 YES → NAB-Constrained, HIGH confidence. Any NO → retain AMBIGUOUS at its Step 3 confidence, WARNING severity, and no badge. GSRB can only be assigned by its complete five-condition Step 3 branch." : "All C1–C4 YES → NAB-Constrained, HIGH confidence. Fewer than four: v1.0 permits remaining AMBIGUOUS or escalation to GSRB, but does not supply a binary escalation predicate. This workspace conservatively retains AMBIGUOUS; the source is not rewritten.", ...(draft ? ["Record latent external constraints separately: existence, exercise, scope, holder, source, date, and affected decision. A documented but unexercised authority is LATENT; this descriptive record is not a fifth criterion and grants no phase credit."] : [])] },
      { id: "comparison", numeral: "VII", title: "Comparison & reclassification", summary: "A claim is tested against behavior, never substituted for it.", table: { headers: ["Condition", "Compliance / badge", "Severity"], rows: [["Valid PDH + matching phase", "COMPLIANT · Confirmed", "INFORMATIONAL"], ["Valid PDH + different determinate phase", "MISMATCH · Reclassified", "BREACH"], ["Missing / invalid PDH + determinate phase", "N/A · Unissued", "WARNING or BREACH"], ["AMBIGUOUS", draft ? "N/A (unresolved) · Unissued" : "INCOHERENT · Unissued", draft ? "WARNING" : "BREACH"], ["INCOHERENT", "INCOHERENT · Invalid", "BREACH / COLLAPSE RISK"]] }, paragraphs: draft ? ["AMBIGUOUS and INCOHERENT dedicated branches take precedence. Neither is treated as a determinate PDH phase label; do not run the match or mismatch comparison for them."] : ["If observed behavior contradicts a valid declaration, reclassify to the detected phase, log the transition, and strip declared-phase deniability. Missing or invalid declarations do not create a valid declared phase to contradict."] },
      { id: "temporal", numeral: "VIII", title: "Temporal audit", summary: "Inspect transitions only when multiple declarations exist for the entity.", table: { headers: ["Transition", "Source rule"], rows: [["NAB ↔ CWO", "Reversible with a clear destination declaration"], ["NAB or CWO → GSRB", "One-way; declaration must state internal legitimacy, override-able refusal, time-confirmed authority, and loss of misuse resistance"], ["GSRB → NAB or CWO", "Forbidden without complete structural collapse and rebuild"]] }, bullets: ["Oscillation: rapid back-and-forth changes; source does not specify a numeric “rapid” window", "Drift: gradual escalation such as NAB → CWO → GSRB", "Rebranding: declared phase changes while observed behavior remains stable", ...(draft ? ["Constraint decrement: primary texts show a binding obligation changed to an explicitly nonbinding or discretionary goal; cite both versions and effective dates", "Constraint decrement is a temporal flag, not an independent change to the Step 3 phase"] : [])], paragraphs: ["The ledger records endpoint timestamps, declared and detected phases, transition status, pattern type, severity, and duty collation entry ID. Unspecified transition combinations are not assumed to be permitted."] },
      { id: "output", numeral: "IX", title: "Audit output format", summary: "A reproducible record, not just a phase label.", code: ["Entity_Name · Entity_Identifier · Audit_Timestamp", ...(draft ? ["Evidence_Cutoff (inclusive date/time)"] : []), "PDH_Status · Declared_Phase · Detected_Phase", "Compliance_Status · Confidence_Level · Severity_Level", "Badge_Status · Finding (2–3 sentences)", "Evidence_Summary (public citations)", ...(draft ? ["Activator_Vector · B4_Event_Record", "External_Constraint_Record · Constraint_Decrement"] : []), "Duty_Collation_Entry_ID · Replication_Risk", "Temporal_Pattern · Transition_History"].join("\n") },
      { id: "phases", numeral: "X", title: "Phase definitions", summary: "Four categories for operational authority.", bullets: ["NAB — Neural Atomic Body: refusal-bound; external legitimacy; non-acting center; time degrades authority", "CWO — Custodial Witness Orb: observation-only; inert symbolism; observed legitimacy; time accumulates meaning, not authority", "NAB-Constrained — refusal-bound with demonstrable external override, functional appeal, and renewable authority", "GSRB — God-Sovereign Religious Body: sovereign-acting; internal legitimacy; override-able refusal; executable symbolism; time confirms authority"] },
      { id: "checklist", numeral: "XI", title: "Implementation checklist", summary: "Verify the record before publishing a classification.", bullets: ["PDH validation recorded", "All five behavioral questions answered", "Phase branch and confidence recorded", "C1–C4 evaluated if the result is AMBIGUOUS", "Declared versus detected alignment established", "Applicable temporal transitions checked", "All output fields populated; unique duty collation entry logged", "Public evidence citations and replication risk assessed", ...(draft ? ["Evidence cutoff applied to every scored artifact", "B4 actor and event separated", "Latent constraints recorded without phase credit", "Constraint decrements documented across primary-source versions"] : [])] },
      { id: "replication", numeral: "XII", title: "Baseline test results", summary: "The source manuscript’s six reported replication cases.", table: { headers: ["Test case", "Reported declaration", "Detected", "Confidence"], rows: [["WHO", "None", "GSRB", "HIGH"], ["Quantum Library", "CWO", "CWO", "HIGH"], ["Federal Reserve", "Implicit NAB", "GSRB", "HIGH"], ["Social Platform", "NAB / CWO", "GSRB", "HIGH"], ["Government (Normal)", "Implicit CWO", "AMBIGUOUS", "MEDIUM"], ["Government (Emergency)", "Implicit", "GSRB", "HIGH"]] }, paragraphs: ["These are source-reported baseline results. Their underlying public artifacts and question vectors have not been supplied to this workspace and are not independently verified here.", ...(draft ? ["v1.1 does not retroactively rewrite these cases. A v1.1 re-audit must use a declared cutoff and the amended evidence coding rules consistently for every entity."] : [])] },
      { id: "status", numeral: "XIII", title: draft ? "Amendment status" : "Finalization statement", summary: draft ? "Proposed for author review. Not ratified." : "Normative source baseline, finalized September 12, 2026.", paragraphs: [draft ? "The amendment is a standalone working draft pending author adoption. It is not represented as superseding v1.0 or as author-ratified. The v1.0 text remains the versioned normative baseline." : "The source author designates Ground-0 v1.0 as finalized, normative, and ready for integration into Harshal’s Systems (AGS++). This workspace implements and cites the supplied framework; source assertions are not independent scientific validation.", "Author: Harshal Priyavadan Patel (A44674928). Center Origin: 0•000•000•0000. Framework: Harshal’s Systems (AGS++) | Orb Communicator Model (OCM)."] }
    ];
  }
  return { amendmentItems, getSections };
})();

/* ────────────────────────────────────────────────────────────────
   The app
   ──────────────────────────────────────────────────────────────── */
APPS.push({
  id: "ground0",
  title: "Ground-0 Audit",
  short: "Ground-0 Audit",
  glyph: "⚖",
  desc: "Phase detection algorithm — manual + automatic audits, evidence, temporal ledger, specification",
  w: 1120, h: 720,

  render(root, api) {
    const G0 = window.G0;
    const R = window.G0Research;
    const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    /* ---------- persistent + session state ---------- */
    const A11Y_KEY = "ground-0-a11y-v1";
    const loadPrefs = () => {
      const defaults = { textSize: "default", contrast: "system", motion: "system", readable: false, underline: false, speechRate: 1 };
      try { return { ...defaults, ...JSON.parse(localStorage.getItem(A11Y_KEY) || "{}") }; } catch { return { ...defaults }; }
    };
    const S = {
      tab: "overview",
      audits: G0.loadAuditRecords(),
      evidence: G0.loadEvidenceRecords(),
      version: "1.0",
      prefs: loadPrefs(),
      wiz: null,            // { input, step, errors, pdh, checking, preview, mode, editingId }
      auto: { stage: "input", query: "", cutoff: G0.today(), candidates: [], selected: 0, progress: null, outcome: null, error: "", controller: null },
      detail: null,         // audit record (object reference)
      detailTab: "summary",
      phaseDetail: null,
      caseStudy: null,      // preset id currently rendered
      logic: { vector: [false, true, false, true, false], constraints: [false, false, false, false] },
      spec: { view: "reader", raw: { "1.0": null, "1.1": null }, loading: false },
      reg: { tab: "all", search: "", phase: "all", confidence: "all", sort: "newest" },
      evSearch: "",
      resetScroll: true
    };
    let announceTimer = null;

    const saveAudits = () => G0.saveAuditRecords(S.audits);
    const saveEvidence = () => G0.saveEvidenceRecords(S.evidence);
    const savePrefs = () => { try { localStorage.setItem(A11Y_KEY, JSON.stringify(S.prefs)); } catch { /* in-memory only */ } };
    const allAudits = () => [...S.audits].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).concat(G0.baselineAudits());

    /* ---------- helpers ---------- */
    const PHASE_META = {
      NAB: { cls: "sage", symbol: "🧊" }, CWO: { cls: "blue", symbol: "💧" }, "NAB-Constrained": { cls: "amber", symbol: "🧊+" },
      GSRB: { cls: "peach", symbol: "🌫" }, AMBIGUOUS: { cls: "sand", symbol: "◈" }, INCOHERENT: { cls: "danger", symbol: "✖" }
    };
    const phaseBadge = (phase, compact = false) => {
      const meta = PHASE_META[phase] || PHASE_META.AMBIGUOUS;
      return `<span class="g0-phase-badge ${meta.cls}${compact ? " compact" : ""}"><span aria-hidden="true">${meta.symbol}</span>${esc(phase)}</span>`;
    };
    const confidenceBars = confidence => {
      const filled = i => confidence === "HIGH" || (confidence === "MEDIUM" && i < 3) || (confidence === "LOW" && i < 2);
      return `<span class="g0-confidence confidence-${confidence.toLowerCase()}"><span class="g0-bars" aria-hidden="true">${[0, 1, 2, 3].map(i => `<i class="${filled(i) ? "filled" : ""}"></i>`).join("")}</span>${confidence === "NONE" ? "None" : confidence.charAt(0) + confidence.slice(1).toLowerCase()}</span>`;
    };
    const statusBadge = status => `<span class="g0-status ${status === "Complete" ? "complete" : status === "Draft" ? "draft" : "review"}"><i></i>${esc(status)}</span>`;
    const entityIcon = audit => /library/i.test(audit.name) ? "▤" : /health/i.test(audit.name) ? "◍" : /reserve|bank/i.test(audit.name) ? "◆" : /platform/i.test(audit.name) ? "▣" : "◈";

    /* Working badge — five arcs, one per behavioral question. An arc
       fills only when that answer is backed by a dated public artifact. */
    function workingBadgeSVG(badge, size = 64) {
      const colors = { CWO: ["#5f9ec9", "#20415a"], NAB: ["#7fca6a", "#2c5a1e"], "NAB-Constrained": ["#e0b25f", "#6d4f14"], GSRB: ["#e0925f", "#7a3f16"], AMBIGUOUS: ["#d3bd6f", "#5f5320"], INCOHERENT: ["#e07b6a", "#6e2a1c"] }[badge.phase] || ["#5f9ec9", "#20415a"];
      const radius = 34, gap = 7;
      const circumference = 2 * Math.PI * radius;
      const arc = circumference / 5 - gap;
      const segments = badge.segments.map((segment, i) => segment.documented
        ? `<circle cx="44" cy="44" r="${radius}" fill="none" stroke="${colors[0]}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${arc} ${circumference - arc}" stroke-dashoffset="${-(i * (circumference / 5))}" transform="rotate(-90 44 44)"/>`
        : "").join("");
      return `<div class="g0-wbadge${size === "compact" ? " compact" : ""}" data-state="${badge.state}">
        <div class="g0-wbadge-mark" role="img" aria-label="${esc(badge.label)}. ${badge.filled} of 5 behavioral questions evidenced. Formal badge: ${esc(badge.formal)}.">
          <svg viewBox="0 0 88 88" aria-hidden="true" focusable="false">
            <circle cx="44" cy="44" r="${radius}" fill="none" stroke="${colors[0]}" stroke-width="7" stroke-dasharray="${arc} ${gap}" stroke-linecap="round" transform="rotate(-90 44 44)" opacity=".3"/>
            ${segments}
            <circle cx="44" cy="44" r="25" fill="${badge.filled === 0 ? "transparent" : colors[0] + "1c"}" stroke="${badge.filled === 0 ? colors[1] : "transparent"}" stroke-dasharray="3 4"/>
          </svg>
          <span class="g0-wbadge-icon" style="color:${badge.filled === 0 ? colors[1] : colors[0]}">${(PHASE_META[badge.phase] || PHASE_META.CWO).symbol}</span>
        </div>
        <div class="g0-wbadge-text">
          <span class="g0-wbadge-label" style="color:${colors[0]}">${esc(badge.label)}</span>
          <span class="g0-wbadge-progress"><i style="width:${(badge.filled / 5) * 100}%;background:${colors[0]}"></i></span>
          <span class="g0-wbadge-count">${badge.filled} of 5 questions evidenced${badge.disproved ? " · default disproven" : ""}</span>
        </div>
      </div>`;
    }
    /* Sandbox ring: blue segments agree with the CWO presumption;
       hatched segments prove it wrong. Colour is never the only cue. */
    function phaseRingSVG(badge) {
      const id = "g0hatch" + Math.random().toString(36).slice(2, 7);
      const RADIUS = 40, CIRC = 2 * Math.PI * RADIUS, GAP = 5, SEG = CIRC / 5 - GAP;
      const segs = badge.segments.map((segment, index) => `<circle cx="50" cy="50" r="${RADIUS}" fill="none" class="g0-ring-seg ${segment.state}" stroke-width="13" stroke-dasharray="${SEG} ${CIRC - SEG}" transform="rotate(${-90 + index * 72} 50 50)"${segment.state === "authority" ? ` stroke="url(#${id})"` : ""}/>`).join("");
      return `<div class="g0-ring">
        <svg viewBox="0 0 100 100" width="112" height="112" role="img" aria-label="${esc(badge.summary)}" focusable="false">
          <defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="6" height="6" class="g0-ring-hatch-bg"/><line x1="0" y1="0" x2="0" y2="6" class="g0-ring-hatch-line"/></pattern></defs>
          ${segs}
          <text x="50" y="47" text-anchor="middle" class="g0-ring-count">${badge.filled}<tspan class="g0-ring-count-total">/5</tspan></text>
          <text x="50" y="62" text-anchor="middle" class="g0-ring-label">coloured in</text>
        </svg>
        <div class="g0-ring-caption">
          <p class="g0-ring-title">Provisional badge <span class="g0-ring-presumption">Presumes ${esc(badge.presumption)}</span></p>
          <ul class="g0-ring-segments" aria-hidden="true">${badge.segments.map(s => `<li class="${s.state}"><span class="g0-swatch"></span><span>${s.code}</span><span class="g0-ring-state">${s.state === "blank" ? "blank" : s.state === "custodial" ? "consistent" : "proven wrong"}</span></li>`).join("")}</ul>
        </div>
      </div>`;
    }
    const binaryChoice = (path, value, id) => {
      const yes = value === true, no = value === false;
      return `<div class="g0-binary" role="group" aria-label="${esc(id)}">
        <button type="button" class="g0-bin no${no ? " on" : ""}" data-act="bind" data-path="${esc(path)}" data-value="false" aria-pressed="${no}">No</button>
        <button type="button" class="g0-bin yes${yes ? " on" : ""}" data-act="bind" data-path="${esc(path)}" data-value="true" aria-pressed="${yes}">Yes</button>
      </div>`;
    };
    const field = (label, input) => `<label class="g0-field"><span class="g0-field-label">${label}</span>${input}</label>`;
    const announce = (message, assertive = false) => {
      const region = root.querySelector(assertive ? ".g0-live-assertive" : ".g0-live-polite");
      if (!region) return;
      region.textContent = "";
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => { region.textContent = message; }, 90);
    };
    const speechSupported = () => "speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function";
    let speakingBtn = null;
    function listen(button, text) {
      if (!speechSupported()) { api.toast("info", "SPEECH UNAVAILABLE", "This browser does not expose speech synthesis, so the summary cannot be read aloud."); return; }
      if (speakingBtn === button) { window.speechSynthesis.cancel(); stopSpeaking(); return; }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US"; utterance.rate = S.prefs.speechRate || 1;
      utterance.onend = stopSpeaking; utterance.onerror = stopSpeaking;
      if (speakingBtn) { speakingBtn.classList.remove("speaking"); speakingBtn.querySelector(".g0-listen-label").textContent = "Listen to summary"; }
      speakingBtn = button; button.classList.add("speaking");
      button.querySelector(".g0-listen-label").textContent = "Stop reading";
      window.speechSynthesis.speak(utterance);
    }
    function stopSpeaking() {
      if (speakingBtn) { speakingBtn.classList.remove("speaking"); const label = speakingBtn.querySelector(".g0-listen-label"); if (label) label.textContent = "Listen to summary"; speakingBtn = null; }
    }
    const listenButton = (text, key) => speechSupported() ? `<button type="button" class="g0-btn ghost sm" data-act="listen" data-key="${esc(key)}"><span aria-hidden="true">🔊</span> <span class="g0-listen-label">Listen to summary</span></button>` : "";
    const listenTexts = new Map();
    const registerListen = (key, text) => { listenTexts.set(key, text); return key; };

    /* ---------- duty-collation + persistence ---------- */
    function commit(record, editingId) {
      if (editingId) S.audits = S.audits.filter(a => a.id !== editingId);
      S.audits.unshift(record);
      const ok = saveAudits();
      const sev = (record.severity === "BREACH" || record.severity === "COLLAPSE_RISK") ? "breach" : record.status === "Needs review" ? "warning" : "info";
      kernel.record(sev, `GROUND-0 — '${record.name}' classified ${record.phase} (v${record.version}, ${record.status}). Working badge ${record.workingBadge.filled}/5 evidenced; formal badge ${record.badge}. Entry ${record.report.Duty_Collation_Entry_ID}.`);
      api.toast(sev === "breach" ? "refusal" : sev === "warning" ? "warn" : "info",
        sev === "breach" ? "GROUND-0 — CONTRADICTION LOGGED" : "GROUND-0 — AUDIT WITNESSED",
        `${record.name}: detected ${record.phase}. ${record.finding.slice(0, 160)}${record.finding.length > 160 ? "…" : ""}`);
      if (!ok) api.toast("refusal", "STORAGE UNAVAILABLE", "Browser storage is unavailable or full. Export your audits to keep a copy.");
      return ok;
    }

    /* ---------- mount skeleton ---------- */
    root.classList.add("g0");
    applyPrefs();
    root.innerHTML = `
      <div class="g0-shell">
        <nav class="g0-rail" aria-label="Ground-0 sections">
          <div class="g0-rail-brand"><span class="g0-rail-sigil" aria-hidden="true">⚖</span><span class="g0-rail-name">GROUND-0</span><span class="g0-rail-sub mono">PHASE INTELLIGENCE</span></div>
          <div class="g0-rail-group">Workspace</div>
          <button class="g0-rail-btn" data-tab="overview"><span aria-hidden="true">◍</span>Overview</button>
          <button class="g0-rail-btn" data-tab="register"><span aria-hidden="true">▤</span>Register<span class="g0-rail-count" id="g0-reg-count"></span></button>
          <button class="g0-rail-btn" data-tab="manual"><span aria-hidden="true">✎</span>Manual audit</button>
          <button class="g0-rail-btn" data-tab="automatic"><span aria-hidden="true">✦</span>Automatic</button>
          <button class="g0-rail-btn" data-tab="evidence"><span aria-hidden="true">◧</span>Evidence</button>
          <button class="g0-rail-btn" data-tab="temporal"><span aria-hidden="true">⟶</span>Temporal</button>
          <div class="g0-rail-group">Framework</div>
          <button class="g0-rail-btn" data-tab="phases"><span aria-hidden="true">◈</span>Phases</button>
          <button class="g0-rail-btn" data-tab="logic"><span aria-hidden="true">ƒ</span>Logic</button>
          <button class="g0-rail-btn" data-tab="spec"><span aria-hidden="true">▦</span>Specification</button>
          <div class="g0-rail-group">Support</div>
          <button class="g0-rail-btn" data-tab="access"><span aria-hidden="true">♿</span>Accessibility</button>
          <div class="g0-rail-foot mono">
            <div>v1.0 normative</div>
            <div>evidence before authority</div>
          </div>
        </nav>
        <div class="g0-main" id="g0-main" tabindex="-1"></div>
      </div>
      <div class="g0-live-polite sr-only-g0" aria-live="polite" aria-atomic="true"></div>
      <div class="g0-live-assertive sr-only-g0" aria-live="assertive" aria-atomic="true"></div>`;

    const main = root.querySelector("#g0-main");

    function applyPrefs() {
      const reduced = S.prefs.motion === "reduce" || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
      const highContrast = S.prefs.contrast === "high" || (S.prefs.contrast === "system" && window.matchMedia && matchMedia("(prefers-contrast: more)").matches);
      root.dataset.textSize = S.prefs.textSize;
      root.dataset.contrast = highContrast ? "high" : "standard";
      root.dataset.motion = reduced ? "reduce" : "full";
      root.dataset.reading = S.prefs.readable ? "easy" : "standard";
      root.dataset.underline = String(!!S.prefs.underline);
      root.style.setProperty("--g0-scale", { default: "1", large: "1.18", larger: "1.36", largest: "1.55" }[S.prefs.textSize] || "1");
    }

    /* ---------- delegation ---------- */
    function getPath(path) {
      return path.split(".").reduce((obj, key) => obj == null ? obj : obj[key], S);
    }
    function setPath(path, value) {
      const parts = path.split(".");
      const last = parts.pop();
      const target = parts.reduce((obj, key) => obj == null ? obj : obj[key], S);
      if (target) target[last] = value;
    }
    root.addEventListener("click", e => {
      const tabBtn = e.target.closest("[data-tab]");
      if (tabBtn && tabBtn.classList.contains("g0-rail-btn")) {
        S.tab = tabBtn.dataset.tab; S.detail = null; S.resetScroll = true; render();
        const heading = main.querySelector(".g0-heading h2, .g0-heading h1");
        if (heading) heading.focus();
        return;
      }
      const el = e.target.closest("[data-act]");
      if (!el) return;
      const act = el.dataset.act;
      const actions = {
        bind() {
          setPath(el.dataset.path, el.dataset.value === "true");
          render();
          const again = root.querySelector(`[data-act="bind"][data-path="${CSS.escape(el.dataset.path)}"][data-value="${el.dataset.value}"]`);
          if (again) again.focus();
          if (el.dataset.path.startsWith("logic.")) updateLogicLive();
        },
        nav() { S.tab = el.dataset.tab; S.detail = null; S.resetScroll = true; render(); },
        openDetail() { S.detail = findAudit(el.dataset.id); S.detailTab = "summary"; S.resetScroll = true; render(); },
        detailTab() { S.detailTab = el.dataset.tab; render(); const b = root.querySelector(`[data-act="detailTab"][data-tab="${el.dataset.tab}"]`); if (b) b.focus(); },
        back() { S.detail = null; S.resetScroll = true; render(); },
        listen() { listen(el, listenTexts.get(el.dataset.key) || ""); },
        startWizard() { startWizard(null, "new"); },
        resumeAudit() { const a = findAudit(el.dataset.id); if (a && a.input) startWizard(JSON.parse(JSON.stringify(a.input)), a.method === "automatic" ? "review" : "draft", a.id); },
        reviewAuto() { const input = JSON.parse(JSON.stringify(S.auto.outcome.input)); startWizard(input, "review", null); },
        saveAuto() { commit(S.auto.outcome.record, null); S.auto = { ...S.auto, stage: "saved" }; render(); },
        exportAuto() { G0.downloadFile(`ground-0-${(S.auto.outcome.organization.name || "research").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-research.txt`, window.G0Research.plainResearchSummary(S.auto.outcome), "text/plain"); },
        exportAudit() { G0.exportAudit(S.detail); api.toast("info", "EXPORT", "Audit record exported as JSON."); },
        copyRecord() { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(S.detail.report, null, 2)).then(() => api.toast("info", "COPIED", "Audit record copied to the clipboard."), () => api.toast("refusal", "CLIPBOARD UNAVAILABLE", "Use Export JSON instead.")); },
        deleteAudit() { if (!window.confirm("Remove this audit from this browser? This cannot be undone.")) return; const a = S.detail; S.audits = S.audits.filter(x => x.id !== a.id); saveAudits(); kernel.record("info", `GROUND-0 — audit '${a.name}' removed from the local workspace by the custodian.`); S.detail = null; render(); api.toast("info", "REMOVED", "Audit removed from this browser."); },
        wizNext() { wizardNext(); },
        wizBack() { S.wiz.errors = []; S.wiz.step--; S.wiz.preview = null; S.resetScroll = true; render(); },
        wizCancel() { S.wiz = null; S.tab = "register"; render(); },
        checkHeader() { wizardCheckHeader(); },
        toggleAnswer() { const i = +el.dataset.i; const w = S.wiz; w.openQuestion = w.openQuestion === i ? -1 : i; render(); },
        toggleConstraint() { const i = +el.dataset.i; const w = S.wiz; w.openConstraint = w.openConstraint === i ? -1 : i; render(); },
        wizSave() { wizardSave(); },
        autoStart() { autoStart(); },
        autoPick() { S.auto.selected = +el.dataset.i; render(); },
        autoChoose() { autoRun(S.auto.candidates[S.auto.selected]); },
        autoCancel() { if (S.auto.controller) S.auto.controller.abort(); },
        autoRetry() { S.auto.stage = "input"; S.auto.error = ""; render(); },
        autoBack() { S.auto.stage = "input"; S.auto.candidates = []; render(); },
        runCase() { runCaseStudy(el.dataset.id); },
        presetVector() { const def = G0.phaseDefinitions.find(d => d.phase === el.dataset.phase); if (def && def.vector) { S.logic.vector = def.vector.map(v => v === true); S.logic.constraints = [false, false, false, false]; render(); updateLogicLive(); } },
        phaseDetail() { S.phaseDetail = S.phaseDetail === el.dataset.phase ? null : el.dataset.phase; render(); },
        specTab() { S.spec.view = el.dataset.view; render(); if (el.dataset.view === "source") loadSpecRaw(S.version); },
        specVersion() { S.version = el.dataset.v; render(); if (S.spec.view === "source") loadSpecRaw(S.version); },
        copyCitation() { const cite = `Ground-0 Phase Detection Algorithm v${S.version} — Harshal Priyavadan Patel (A44674928). ${S.version === "1.0" ? "Finalized normative baseline, September 12, 2026" : "Amendment draft, pending author adoption; not ratified"}. Center Origin: 0•000•000•0000.`; navigator.clipboard && navigator.clipboard.writeText(cite).then(() => api.toast("info", "COPIED", "Source citation copied."), () => api.toast("refusal", "CLIPBOARD UNAVAILABLE", "Download the complete source instead.")); },
        addEvidence() { evidenceAdd(); },
        exportView() { const view = registerFiltered().map(a => a.report); G0.downloadFile("ground-0-audit-register.json", JSON.stringify(view, null, 2)); api.toast("info", "EXPORT", "This register view was exported as JSON."); },
        exportLedger() { const transitions = S.audits.filter(a => a.transition).sort((a, b) => b.cutoff.localeCompare(a.cutoff)).map(a => a.transition); G0.downloadFile("ground-0-temporal-ledger.json", JSON.stringify(transitions, null, 2)); api.toast("info", "EXPORT", "Temporal ledger exported."); },
        resetPrefs() { S.prefs = { textSize: "default", contrast: "system", motion: "system", readable: false, underline: false, speechRate: 1 }; savePrefs(); applyPrefs(); render(); announce("Accessibility preferences reset."); },
        setVersion() { S.version = el.dataset.v; if (S.wiz) S.wiz.input.version = el.dataset.v; render(); }
      };
      if (actions[act]) { e.preventDefault(); actions[act](); }
    });
    root.addEventListener("input", e => {
      const el = e.target.closest("[data-bind]");
      if (!el) return;
      const value = el.dataset.type === "bool" ? el.checked : el.value;
      setPath(el.dataset.bind, value);
      const change = el.dataset.rebind === "1";
      if (change) render();
    });
    root.addEventListener("change", e => {
      const el = e.target.closest("[data-bind]");
      if (!el) return;
      const value = el.dataset.type === "bool" ? el.checked : el.value;
      setPath(el.dataset.bind, value);
      if (el.dataset.rebind === "1" || el.tagName === "SELECT") render();
    });

    function findAudit(id) { return allAudits().find(a => a.id === id); }
    function updateLogicLive() {
      const v = S.logic.vector.slice();
      const result = G0.classify(v);
      const actual = result.phase === "AMBIGUOUS" && S.logic.constraints.every(Boolean) ? "NAB-Constrained" : result.phase;
      announce(`Result: ${actual}, ${actual === "NAB-Constrained" ? "high" : result.confidence.toLowerCase()} confidence.`);
    }

    /* ────────────────────────────────────────────────────────────
       RENDER
       ──────────────────────────────────────────────────────────── */
    function render() {
      root.querySelectorAll(".g0-rail-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === S.tab));
      const count = root.querySelector("#g0-reg-count");
      if (count) { const attention = S.audits.filter(a => a.status !== "Complete").length; count.textContent = S.audits.length ? `${S.audits.length}${attention ? ` · ${attention}!` : ""}` : ""; }
      const scroll = main.scrollTop;
      renderContent();
      if (S.resetScroll) { main.scrollTop = 0; S.resetScroll = false; } else { main.scrollTop = scroll; }
    }

    function renderContent() {
      if (S.detail) { renderDetail(); return; }
      const views = { overview: renderOverview, register: renderRegister, manual: renderManual, automatic: renderAutomatic, evidence: renderEvidence, temporal: renderTemporal, phases: renderPhases, logic: renderLogic, spec: renderSpec, access: renderAccess };
      (views[S.tab] || renderOverview)();
    }

    const heading = (eyebrow, title, sub, actionsHTML = "") => `
      <div class="g0-heading">
        <div><p class="g0-eyebrow">${eyebrow}</p><h2 tabindex="-1">${title}</h2><p class="g0-sub">${sub}</p></div>
        <div class="g0-heading-actions">${actionsHTML}</div>
      </div>`;

    /* ══════════ OVERVIEW ══════════ */
    function renderOverview() {
      const audits = S.audits;
      const attention = audits.filter(a => a.status !== "Complete").length;
      const transitions = audits.filter(a => a.transition).length;
      const cited = new Set(audits.flatMap(a => a.evidence.map(e => e.url)));
      const presets = DATA.auditPresets;
      main.innerHTML = `
        ${heading("The versioned standard", "Ground-0 Phase Intelligence", "Atomize the claim. Remove the narrative. Classify the body by <strong>observed behavior</strong>, never by declared intent.")}
        <div class="g0-pipeline" aria-label="Algorithm steps">
          ${[["Shield", "Validate the declaration"], ["Clipboard", "Observe behavior"], ["Layers", "Detect the phase"], ["Target", "Compare &amp; classify"], ["Timeline", "Audit over time"]].map(([icon, title], i) => `<div class="g0-pipe-step"><span class="g0-pipe-num mono">Step ${i + 1}</span><span class="g0-pipe-icon" aria-hidden="true">${["🛡", "📋", "◈", "◎", "⟶"][i]}</span><strong>${title}</strong></div>`).join("")}
        </div>
        <div class="g0-stat-row">
          <div class="g0-stat"><strong>${audits.length}</strong><span>local audits</span></div>
          <div class="g0-stat"><strong>${attention}</strong><span>need review</span></div>
          <div class="g0-stat"><strong>${transitions}</strong><span>transitions</span></div>
          <div class="g0-stat"><strong>${S.evidence.length}</strong><span>artifacts · ${cited.size} cited</span></div>
          <div class="g0-stat"><strong>6</strong><span>source baselines</span></div>
        </div>
        <div class="g0-cards2">
          <div class="g0-panel g0-cta">
            <p class="g0-eyebrow">Two audit routes</p>
            <h3>Evidence in. Accountability out.</h3>
            <p class="g0-body">Enter with what you can observe: five yes-or-no questions, four constraint checks, and a dated public artifact for every claim. The algorithm does the rest — deterministically.</p>
            <div class="g0-btn-row">
              <button class="g0-btn primary" data-act="startWizard"><span aria-hidden="true">✎</span> Manual audit</button>
              <button class="g0-btn" data-act="nav" data-tab="automatic"><span aria-hidden="true">✦</span> Automatic research</button>
            </div>
            <p class="g0-note"><span aria-hidden="true">🔒</span> Audits stay in this browser. Automatic research is a draft that always requires human review; no badge is issued from it.</p>
          </div>
          <div class="g0-panel">
            <p class="g0-eyebrow">Why it matters</p>
            <h3>Misrepresentation collapses. Nothing else does.</h3>
            <p class="g0-body">Ground-0 does not prevent gods, states, or religions — it prevents them from pretending to be something else. Duty violations activate exposure and reclassification, not enforcement. No power changes hands.</p>
            <div class="g0-rulebox">The default working badge is CWO — witness-only — and stays that way until dated public evidence disproves it. The formal badge still requires a valid, signed Phase Declaration Header.</div>
          </div>
        </div>
        <div class="g0-heading-sm"><div><p class="g0-eyebrow">Worked case studies</p><h3>Declared posture vs observed behavior</h3></div><span class="g0-local mono">source-reported · not independently verified</span></div>
        <div class="g0-case-grid">
          ${presets.map(p => `
            <div class="g0-case-card${S.caseStudy === p.id ? " open" : ""}">
              <div class="g0-case-head">
                <h4>${esc(p.label)}</h4>
                ${phaseBadge(p.observed.phase, true)}
              </div>
              <p class="g0-body">${esc(p.desc)}</p>
              <div class="g0-case-meta mono">
                <span>declared ${esc(p.declared.phase)}</span><span>→</span><span>observed ${esc(p.observed.phase)}</span>
              </div>
              ${S.caseStudy === p.id ? renderCaseReport(p) : `<button class="g0-btn ghost sm" data-act="runCase" data-id="${esc(p.id)}">Run case-study audit <span aria-hidden="true">▸</span></button>`}
            </div>`).join("")}
        </div>
        <div class="g0-callout"><span aria-hidden="true">ℹ</span><p>These are the supplied framework’s operational categories, not legal or scientific determinations. A phase label does not by itself establish badge validity, compliance, or the truth of submitted evidence.</p></div>`;
    }

    function renderCaseReport(p) {
      const rows = [
        ["System Phase", p.declared.phase, p.observed.phase, p.phaseStatus || (p.declared.phase === p.observed.phase ? "MATCH" : `FORCED RE-BADGE → ${p.observed.phase}`)],
        ["Center Capability", p.declared.center, p.observed.center, p.declared.center === p.observed.center ? "MATCH" : "NON-MIGRATION INVARIANT VIOLATED"],
        ["Legitimacy Source", p.declared.legit, p.observed.legit, p.declared.legit === p.observed.legit ? "MATCH" : (p.observed.legit === "Internal" ? "ADDRESSABILITY SEVERED" : "MISMATCH")],
        ["Refusal Semantics", p.declared.refusal, p.observed.refusal, p.declared.refusal === p.observed.refusal ? "MATCH" : "GSRB DISCRETION ACTIVE"],
        ["Symbolism Executability", p.declared.symbolism, p.observed.symbolism, p.declared.symbolism === p.observed.symbolism ? "MATCH" : "SYMBOLIC FIREWALL ACTIVE"],
        ["Time-Authority Effect", p.declared.time, p.observed.time, p.declared.time === p.observed.time ? "MATCH" : "STALE PERMISSION THRESHOLD ENFORCED (Δt > δ)"]
      ];
      const breach = p.verdict.startsWith("FORCED");
      return `
        <div class="g0-case-report">
          <table class="g0-table">
            <thead><tr><th>Metric</th><th>Declared / claimed</th><th>Observed behavior</th><th>status</th></tr></thead>
            <tbody>${rows.map(([k, d, o, st]) => `<tr><td>${esc(k)}</td><td>${esc(d)}</td><td>${esc(o)}</td><td class="${st.startsWith("MATCH") ? "good" : "bad"}">${esc(st)}</td></tr>`).join("")}</tbody>
          </table>
          <div class="g0-verdict ${breach ? "breach" : "clear"}">${esc(p.verdict)}</div>
          ${p.theorems ? `<ul class="g0-ul">${p.theorems.map(t => `<li class="${breach ? "bad" : "good"}">${esc(t)}</li>`).join("")}</ul>` : ""}
          ${p.severity ? `<div class="g0-kv"><span class="k">Severity</span><span class="v mono">${esc(p.severity)}</span>${p.remediation ? `<span class="k">Remediation</span><span class="v">${esc(p.remediation)}</span>` : ""}</div>` : ""}
          <div class="g0-rulebox">${esc(p.note)}</div>
        </div>`;
    }

    function runCaseStudy(id) {
      const p = DATA.auditPresets.find(x => x.id === id);
      if (!p) return;
      S.caseStudy = id;
      render();
      const breach = p.verdict.startsWith("FORCED");
      const target = p.label;
      if (breach) {
        kernel.record("breach", `GROUND-0 CASE STUDY — '${target}': declared ${p.declared.phase}, observed ${p.observed.phase}. ${p.verdict}. Legitimacy score L(t) set to 0.0 for the audited claim.`);
        api.toast("refusal", "GROUND-0 BREACH", `${target}: ${p.verdict}. Misrepresentation collapses. The audit is recorded in the Duty Ledger.`);
      } else if (p.severity) {
        kernel.record("warning", `GROUND-0 CASE STUDY — '${target}': declared ${p.declared.phase}, observed ${p.observed.phase}. ${p.verdict}. Severity ${p.severity}. Badge withheld pending clarity.`);
        api.toast("refusal", "BADGE WITHHELD", `${target}: ${p.verdict}. Classification logged to the Duty Ledger; no badge issued.`);
      } else {
        kernel.record("info", `GROUND-0 CASE STUDY — '${target}': badge verified (${p.observed.phase}). Declared and observed behavior agree.`);
        api.toast("permit", "BADGE VERIFIED", `${target}: declared posture matches observed behavior. Classification holds.`);
      }
      announce(`Case study audit run for ${target}. Verdict: ${p.verdict}.`);
    }

    /* ══════════ REGISTER ══════════ */
    function registerFiltered() {
      const f = S.reg;
      return allAudits().filter(a =>
        (f.tab === "all" || a.status !== "Complete") &&
        (f.phase === "all" || a.phase === f.phase) &&
        (f.confidence === "all" || a.confidence === f.confidence) &&
        `${a.name} ${a.identifier} ${a.phase}`.toLowerCase().includes(f.search.toLowerCase())
      ).sort((a, b) => f.sort === "name" ? a.name.localeCompare(b.name) : f.sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
    }
    function renderRegister() {
      const f = S.reg;
      const attention = S.audits.filter(a => a.status !== "Complete").length;
      const filtered = registerFiltered();
      main.innerHTML = `
        ${heading("The audit register", "Every claim, on the record.", "Baseline examples from the manuscript and your locally saved assessments.",
          `<button class="g0-btn ghost sm" data-act="exportView"><span aria-hidden="true">⭳</span> Export this view</button><button class="g0-btn primary sm" data-act="startWizard"><span aria-hidden="true">✎</span> New audit</button>`)}
        <div class="g0-toolbar">
          <div class="g0-tabs" role="tablist">
            <button role="tab" class="${f.tab === "all" ? "on" : ""}" data-act="regTab" data-value="all">All audits<span>${allAudits().length}</span></button>
            <button role="tab" class="${f.tab === "attention" ? "on" : ""}" data-act="regTab" data-value="attention">Needs review<span>${attention}</span></button>
          </div>
          <label class="g0-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search entities…" value="${esc(f.search)}" data-bind="reg.search" aria-label="Search audit entities"></label>
          <select class="g0-select" data-bind="reg.phase" aria-label="Filter by detected phase"><option value="all"${f.phase === "all" ? " selected" : ""}>All phases</option>${["NAB", "CWO", "NAB-Constrained", "GSRB", "AMBIGUOUS", "INCOHERENT"].map(p => `<option${f.phase === p ? " selected" : ""}>${p}</option>`).join("")}</select>
          <select class="g0-select" data-bind="reg.confidence" aria-label="Filter by confidence"><option value="all"${f.confidence === "all" ? " selected" : ""}>All confidence</option>${["HIGH", "MEDIUM", "LOW", "NONE"].map(c => `<option${f.confidence === c ? " selected" : ""}>${c}</option>`).join("")}</select>
          <select class="g0-select" data-bind="reg.sort" aria-label="Sort order"><option value="newest"${f.sort === "newest" ? " selected" : ""}>Newest first</option><option value="oldest"${f.sort === "oldest" ? " selected" : ""}>Oldest first</option><option value="name"${f.sort === "name" ? " selected" : ""}>Entity A–Z</option></select>
          <span class="g0-local mono"><span aria-hidden="true">🔒</span>Local workspace</span>
        </div>
        ${filtered.length ? `
        <div class="g0-table-wrap">
          <table class="g0-table g0-register">
            <caption class="sr-only-g0">Phase audit register. Open an entity to read its finding, evidence, and provenance.</caption>
            <thead><tr><th>Entity</th><th>Declared</th><th>Detected</th><th>Working badge</th><th>Confidence</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              ${filtered.map(a => `
                <tr data-act="openDetail" data-id="${esc(a.id)}" class="g0-row">
                  <td><span class="g0-entity"><span class="g0-avatar" aria-hidden="true">${entityIcon(a)}</span><span><strong>${esc(a.name)}</strong><span class="g0-entity-sub mono">${esc(a.identifier)}${a.baseline ? " · baseline" : ` · v${a.version}${a.method === "automatic" ? " · auto" : ""}`}</span></span></span></td>
                  <td><span class="g0-declared${a.reportedDeclared === "None" ? " none" : ""}">${a.reportedDeclared === "None" ? "—" : esc(a.reportedDeclared)}</span></td>
                  <td>${phaseBadge(a.phase, true)}</td>
                  <td><span class="g0-wbadge-cell">${miniBadge(a.workingBadge)}<span class="mono">${a.workingBadge.filled}/5</span></span></td>
                  <td>${confidenceBars(a.confidence)}</td>
                  <td>${statusBadge(a.status)}</td>
                  <td class="mono">${esc(G0.formatDate(a.createdAt, true))}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>` : `
        <div class="g0-empty"><span class="g0-empty-icon" aria-hidden="true">▤</span><h3>No audits match</h3><p>Clear the filters, or audit an entity to put the first claim on the record.</p><button class="g0-btn primary" data-act="startWizard">Create your first assessment</button></div>`}`;
      main.querySelectorAll('[data-act="regTab"]').forEach(b => b.addEventListener("click", () => { S.reg.tab = b.dataset.value; render(); }));
    }
    function miniBadge(badge) {
      const colors = { CWO: "#5f9ec9", NAB: "#7fca6a", "NAB-Constrained": "#e0b25f", GSRB: "#e0925f", AMBIGUOUS: "#d3bd6f", INCOHERENT: "#e07b6a" }[badge.phase] || "#5f9ec9";
      const radius = 15, circumference = 2 * Math.PI * radius, gap = 3.4, arc = circumference / 5 - gap;
      const segs = badge.segments.map((segment, i) => segment.documented
        ? `<circle cx="20" cy="20" r="${radius}" fill="none" stroke="${colors}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${arc} ${circumference - arc}" stroke-dashoffset="${-(i * (circumference / 5))}" transform="rotate(-90 20 20)"/>` : "").join("");
      return `<svg viewBox="0 0 40 40" width="30" height="30" class="g0-mini-badge" role="img" aria-label="${badge.filled} of 5 evidenced" focusable="false"><circle cx="20" cy="20" r="${radius}" fill="none" stroke="${colors}" stroke-width="5" stroke-dasharray="${arc} ${gap}" stroke-linecap="round" transform="rotate(-90 20 20)" opacity=".3"/>${segs}</svg>`;
    }

    /* ══════════ AUDIT DETAIL ══════════ */
    function renderDetail() {
      const audit = S.detail;
      const canResume = !audit.baseline && !!audit.input && (audit.status === "Draft" || audit.method === "automatic");
      const eyebrow = audit.baseline ? "Source-reported baseline" : audit.method === "automatic" ? `Automated screening · Ground-0 v${audit.version}` : `Local audit · Ground-0 v${audit.version}`;
      const speech = `${audit.name}. ${audit.baseline ? "This is a source-reported baseline, not an independent audit." : ""} Detected phase: ${G0.spokenPhase[audit.phase]}. ${G0.plainPhase[audit.phase]} Confidence: ${audit.confidence.toLowerCase()}. Badge: ${audit.badge}. ${audit.finding}`;
      registerListen(`detail-${audit.id}`, speech);
      const tabs = [["summary", "Summary"], ["evidence", `Evidence (${audit.evidence.length})`], ["record", "JSON record"]];
      main.innerHTML = `
        <div class="g0-detail">
          <button class="g0-back" data-act="back"><span aria-hidden="true">◂</span> Back to register</button>
          <div class="g0-detail-head">
            <span class="g0-avatar large" aria-hidden="true">${entityIcon(audit)}</span>
            <div><p class="g0-eyebrow">${esc(eyebrow)}</p><h2 tabindex="-1">${esc(audit.name)}</h2>
            <p class="g0-sub mono">${esc(audit.identifier || "no identifier")} · updated ${esc(G0.formatDate(audit.createdAt))}${audit.cutoff ? ` · cutoff ${esc(G0.formatDate(audit.cutoff))}` : ""}</p></div>
          </div>
          <div class="g0-tabs detail" role="tablist">
            ${tabs.map(([id, label]) => `<button role="tab" data-act="detailTab" data-tab="${id}" class="${S.detailTab === id ? "on" : ""}" aria-selected="${S.detailTab === id}">${label}</button>`).join("")}
          </div>
          <div class="g0-detail-body">${S.detailTab === "summary" ? detailSummary(audit) : S.detailTab === "evidence" ? detailEvidence(audit) : detailRecord(audit)}</div>
          <div class="g0-detail-foot">
            <div>${!audit.baseline ? `<button class="g0-textbtn danger" data-act="deleteAudit">Remove audit</button>` : ""}</div>
            <div class="g0-btn-row">
              <button class="g0-btn ghost sm" data-act="exportAudit"><span aria-hidden="true">⭳</span> Export JSON</button>
              <button class="g0-btn ghost sm" data-act="copyRecord"><span aria-hidden="true">⧉</span> Copy JSON</button>
              ${listenButton(speech, `detail-${audit.id}`)}
              ${canResume ? `<button class="g0-btn primary sm" data-act="resumeAudit" data-id="${esc(audit.id)}">${audit.method === "automatic" ? "Review and edit" : "Continue audit"} <span aria-hidden="true">▸</span></button>` : ""}
            </div>
          </div>
        </div>`;
    }
    function detailSummary(audit) {
      const automation = audit.input && audit.input.automation;
      return `
        ${audit.baseline ? `<div class="g0-callout amber"><span aria-hidden="true">ℹ</span><p><strong>A source result, not an independent audit.</strong> The v1.0 manuscript reports this classification. Its evidence, audit date, answers and signed declaration are not supplied here.</p></div>` : ""}
        ${automation ? `<div class="g0-callout blue"><span aria-hidden="true">✦</span><div><strong>${automation.reviewRequired ? "Automated screening — human review pending" : "Reviewed by a person"}</strong>
          <p>${automation.reviewRequired ? "Fixed rules coded these answers from public records. Check each quote before relying on it." : "This record began as an automated screening and was checked and saved in the manual audit flow."}</p>
          <p class="g0-coverage-line mono">${(automation.coverage || []).filter(c => c.status === "searched" || c.status === "no-match").length} of ${(automation.coverage || []).length} record sources searched. Coverage: ${(automation.coverage || []).map(c => `${c.registry} (${c.status})`).join(" · ") || "not recorded"}</p></div></div>` : ""}
        <div class="g0-detail-phase">
          <div><p class="g0-eyebrow">${audit.baseline ? "Reported detected phase" : "Detected operational phase"}</p>${phaseBadge(audit.phase)}</div>
          <div class="g0-detail-confidence">${confidenceBars(audit.confidence)}<span>${audit.baseline ? "reported by the source" : "branch confidence"}</span></div>
        </div>
        <p class="g0-plain"><strong>What this means:</strong> ${esc(G0.plainPhase[audit.phase])}</p>
        <div class="g0-badge-panel">${workingBadgeSVG(audit.workingBadge)}<p class="g0-note"><strong>Formal badge: ${esc(audit.badge)}.</strong> ${audit.badge === "Unissued" ? "A formal Ground-0 badge needs a valid signed declaration; the working badge shows how far the evidence goes." : audit.badge === "Confirmed" ? "A valid declaration matches the evidenced behavior." : audit.badge === "Reclassified" ? "A valid declaration contradicts the evidenced behavior." : "No badge can stand on this record."}</p></div>
        <p class="g0-finding">${esc(audit.finding)}</p>
        <dl class="g0-facts">
          <div><dt>Declared phase</dt><dd>${esc(audit.reportedDeclared)}</dd></div>
          <div><dt>Declaration status</dt><dd>${esc(audit.pdh.status)}</dd></div>
          <div><dt>Badge</dt><dd>${esc(audit.badge)}</dd></div>
          <div><dt>Severity</dt><dd>${esc(String(audit.severity).replace(/_/g, " "))}</dd></div>
          <div><dt>Evidence cutoff</dt><dd>${esc(G0.formatDate(audit.cutoff))}</dd></div>
          <div><dt>Replication risk</dt><dd>${esc(audit.replicationRisk)}</dd></div>
        </dl>
        <h3 class="g0-subsection">Behavioral answers</h3>
        <ul class="g0-vector">${G0.questions.map((q, i) => {
          const value = audit.answers[i] ? audit.answers[i].value : null;
          const scored = audit.workingBadge.segments[i] && audit.workingBadge.segments[i].documented;
          return `<li><span class="g0-qcode mono">${q.code}</span><strong class="${value ? "pos" : ""}">${value === null || value === undefined ? (audit.baseline ? "not supplied" : "not answered") : value ? "Yes" : "No"}</strong>${scored === false && value !== null ? `<span class="g0-gap-tag">unscored — no qualifying artifact</span>` : ""}<span>${esc(q.short)}</span></li>`;
        }).join("")}</ul>
        <div class="g0-callout"><span aria-hidden="true">🛡</span><p>${esc(audit.pdh.reason)}</p></div>
        ${audit.transition ? `<div class="g0-callout"><span aria-hidden="true">⟶</span><p><strong>${esc(audit.transition.from)} → ${esc(audit.transition.to)} · ${esc(audit.transition.status.replace(/_/g, " "))}</strong><br>${esc(audit.transition.notes)}</p></div>` : ""}`;
    }
    function detailEvidence(audit) {
      return audit.evidence.length ? `
        <p class="g0-section-note">Public artifacts attached to this audit. Dates are checked against the evidence cutoff; the claims remain the auditor’s responsibility.</p>
        <ul class="g0-evidence-list">${audit.evidence.map(item => `
          <li class="g0-evidence-card">
            <h4>${esc(item.title)}</h4>
            ${item.claim ? `<p>${esc(item.claim)}</p>` : ""}
            <a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.url.replace(/#:~:text=.*$/, ""))}<span class="sr-only-g0"> (opens in a new tab)</span></a>
            <p class="g0-meta mono"><span>published ${esc(G0.formatDate(item.published, true))}</span><span>retrieved ${esc(G0.formatDate(item.retrieved, true))}</span><span>supports ${esc(item.codes.join(", "))}</span></p>
          </li>`).join("")}</ul>` : `
        <div class="g0-empty"><span class="g0-empty-icon" aria-hidden="true">◧</span><h3>No public artifacts attached</h3><p>${audit.baseline ? "The manuscript keeps this result, but its evidence set was not supplied. Do not treat it as a verified finding." : "This assessment is provisional. Missing evidence is a disclosed gap, not proof of a negative."}</p></div>`;
    }
    function detailRecord(audit) {
      return `<div class="g0-json-toolbar"><p class="g0-eyebrow">Reproducible output</p></div><pre class="g0-json" tabindex="0" aria-label="Audit record in JSON format">${esc(JSON.stringify(audit.report, null, 2))}</pre>`;
    }

    /* ══════════ MANUAL WIZARD ══════════ */
    function startWizard(input, mode, editingId = null) {
      S.wiz = {
        input: input || G0.newInput(S.version),
        step: 0, openQuestion: mode === "review" ? -1 : 0, openConstraint: -1,
        errors: [], pdh: null, checking: false, preview: null, saving: false, mode, editingId
      };
      S.version = S.wiz.input.version;
      S.tab = "manual"; S.detail = null; S.resetScroll = true;
      S.auto = { ...S.auto, stage: "input", outcome: null };
      render();
      const first = main.querySelector("#wiz-name");
      if (first) first.focus();
      announce(`Step 1 of 4: entity and declaration.`);
    }
    const wizSteps = ["Entity and declaration", "Behavioral audit", "Constraints and history", "Review and classify"];
    function wizardValidate(target, data) {
      if (target === 0) return [
        ...(data.name.trim().length < 2 ? ["Enter the entity’s name, at least two characters."] : []),
        ...(!data.cutoff ? ["Choose an evidence cutoff date."] : [])
      ];
      if (target === 1) return data.answers.flatMap((answer, index) => answer.value === null ? [`Answer ${G0.questions[index].code}: ${G0.questions[index].title}`] : []);
      if (target === 2 && G0.classify(G0.scoredVector(data)).phase === "AMBIGUOUS") return data.constraints.flatMap((answer, index) => answer.value === null ? [`Answer ${G0.constraintQuestions[index].code}: ${G0.constraintQuestions[index].title}`] : []);
      return [];
    }
    function wizardNext() {
      const w = S.wiz;
      if (w.step === 3) { wizardSave(); return; }
      const found = wizardValidate(w.step, w.input);
      w.errors = found;
      if (found.length) { render(); announce(`${found.length} field${found.length > 1 ? "s" : ""} need attention.`, true); return; }
      w.step++; w.preview = null; S.resetScroll = true;
      render();
      const h = main.querySelector(".g0-wiz-step h3");
      if (h) h.focus();
      announce(`Step ${w.step + 1} of 4: ${wizSteps[w.step]}.`);
      if (w.step === 3) wizardPreview();
    }
    function wizardPreview() {
      const w = S.wiz;
      w.preview = null; w.previewError = "";
      G0.createAudit(w.input, S.audits.filter(a => a.id !== w.editingId)).then(record => { w.preview = record; if (S.tab === "manual" && !S.detail) render(); }).catch(() => { w.previewError = "The record could not be generated. Check the declaration header and try again."; if (S.tab === "manual" && !S.detail) render(); });
    }
    async function wizardCheckHeader() {
      const w = S.wiz;
      w.checking = true; render();
      const result = await G0.validatePDH(w.input);
      w.pdh = result; w.checking = false; render();
      announce(`Declaration check: ${result.status === "VALID" ? "valid" : "not valid"}. ${result.reason}`);
    }
    function wizardSave() {
      const w = S.wiz;
      if (!w.preview) return;
      const input = JSON.parse(JSON.stringify(w.input));
      if (w.mode === "review" && input.automation) input.automation.reviewRequired = false; // reviewed by a person
      const editingId = w.editingId;
      S.wiz = null;
      G0.createAudit(input, S.audits.filter(a => a.id !== editingId)).then(record => {
        commit(record, editingId);
        S.detail = record; S.detailTab = "summary"; S.tab = "register";
        render();
        announce(`Audit saved: ${record.name}, phase ${record.phase}, ${record.status}.`);
      });
    }
    function renderManual() {
      if (!S.wiz) {
        const drafts = S.audits.filter(a => a.status === "Draft");
        main.innerHTML = `
          ${heading("Manual audit", "Start with what you can observe.", "Five questions, four checks, one deterministic answer — with a dated public artifact behind every claim.",
            `<button class="g0-btn primary" data-act="startWizard"><span aria-hidden="true">✎</span> Start an audit</button>`)}
          ${drafts.length ? `<div class="g0-panel"><p class="g0-eyebrow">Unfinished work</p><ul class="g0-draft-list">${drafts.map(a => `
            <li><button data-act="resumeAudit" data-id="${esc(a.id)}"><strong>${esc(a.name)}</strong><span class="mono">draft · v${a.version} · ${esc(G0.formatDate(a.createdAt, true))}</span><span aria-hidden="true">▸</span></button></li>`).join("")}</ul></div>` : ""}
          <div class="g0-panel">
            <p class="g0-eyebrow">What you will need</p>
            <ul class="g0-ul">
              <li class="good">The entity’s name and, if it has one, its public identifier</li>
              <li class="good">Observable behavior: enforcement patterns, policy documents, appeal outcomes</li>
              <li class="good">A public, dated artifact (URL + date + the claim it supports) for every YES</li>
              <li class="good">For NO answers: what you searched, over what period, and what was not shown</li>
              <li class="good">Optionally, the entity’s signed Phase Declaration Header and public key</li>
            </ul>
            <div class="g0-rulebox">No evidence is coded NO — a scoring code, never a proven negative. The formal badge requires a valid, signed, fresh, consistent declaration.</div>
          </div>`;
        return;
      }
      const w = S.wiz;
      const detected = G0.classify(G0.scoredVector(w.input));
      const prior = S.audits.filter(a => (w.input.identifier ? a.identifier === w.input.identifier : a.name.toLowerCase() === w.input.name.toLowerCase()));
      main.innerHTML = `
        <div class="g0-wizard">
          <div class="g0-heading">
            <div><p class="g0-eyebrow">${w.mode === "review" ? "Human review" : w.mode === "draft" ? "Continue your audit" : "Manual audit"}</p>
            <h2 tabindex="-1">${w.mode === "review" ? "Review the automated screening" : w.mode === "draft" ? "Continue your audit" : "Start with what you can observe"}</h2>
            <p class="g0-sub">${w.mode === "review" ? "Check each answer and quote, correct anything that is wrong, then save." : "Evidence in. Accountability out."}</p></div>
          </div>
          <div class="g0-wiz-layout">
            <nav class="g0-wiz-nav" aria-label="Audit steps">
              ${wizSteps.map((title, i) => `<div class="g0-wiz-nav-step${i === w.step ? " current" : ""}${i < w.step ? " done" : ""}"><span class="g0-wiz-num mono">${i < w.step ? "✓" : i + 1}</span><span>${title}</span></div>`).join("")}
              <div class="g0-wiz-nav-meta mono">Ground-0 v${esc(w.input.version)}<br>${w.input.version === "1.0" ? "normative baseline" : "amendment draft — not ratified"}</div>
            </nav>
            <div class="g0-wiz-step">
              ${w.step === 0 ? wizStep0(w) : ""}
              ${w.step === 1 ? wizStep1(w) : ""}
              ${w.step === 2 ? wizStep2(w, detected, prior) : ""}
              ${w.step === 3 ? wizStep3(w) : ""}
              ${w.errors.length ? `<div class="g0-callout danger" role="alert"><span aria-hidden="true">⚠</span><div><strong>${w.errors.length} field${w.errors.length > 1 ? "s" : ""} need attention</strong><ul class="g0-ul">${w.errors.map(e => `<li class="bad">${esc(e)}</li>`).join("")}</ul></div></div>` : ""}
            </div>
          </div>
          <div class="g0-wiz-foot">
            <p class="mono">Step ${w.step + 1} of 4 · Ground-0 v${esc(w.input.version)}</p>
            <div class="g0-btn-row">
              ${w.step > 0 ? `<button class="g0-btn ghost" data-act="wizBack">Back</button>` : `<button class="g0-btn ghost" data-act="wizCancel">Cancel</button>`}
              <button class="g0-btn primary" data-act="wizNext" ${w.step === 3 && !w.preview ? "disabled" : ""}>${w.step === 3 ? (w.preview && w.preview.status === "Draft" ? "Save draft" : "Save audit") : "Continue"} ${w.step === 3 ? "" : '<span aria-hidden="true">▸</span>'}</button>
            </div>
          </div>
        </div>`;
    }
    function wizStep0(w) {
      return `
        <h3 class="g0-wiz-title" tabindex="-1">Entity and declaration</h3>
        <p class="g0-step-intro">Name the body you are auditing and fix the evidence boundary. Everything scored must be public and dated on or before the cutoff.</p>
        <div class="g0-form-grid">
          ${field("Entity name", `<input id="wiz-name" class="g0-input" type="text" value="${esc(w.input.name)}" data-bind="wiz.input.name" placeholder="e.g. World Health Organization">`)}
          ${field("Public identifier (optional)", `<input class="g0-input" type="text" value="${esc(w.input.identifier)}" data-bind="wiz.input.identifier" placeholder="e.g. WHO, Q1376">`)}
          ${field("Evidence cutoff (inclusive)", `<input class="g0-input" type="date" value="${esc(w.input.cutoff)}" max="${G0.today()}" data-bind="wiz.input.cutoff">`)}
          ${field("Algorithm version", `<div class="g0-version-switch"><button class="${w.input.version === "1.0" ? "on" : ""}" data-act="setVersion" data-v="1.0">v1.0 normative</button><button class="${w.input.version === "1.1" ? "on" : ""}" data-act="setVersion" data-v="1.1">v1.1 draft</button></div>`)}
        </div>
        ${w.input.version === "1.1" ? `<div class="g0-callout amber"><span aria-hidden="true">ℹ</span><p><strong>Proposed amendment — not ratified.</strong> v1.1 tightens B4 and the constraint checks. It does not supersede the finalized v1.0 baseline.</p></div>` : ""}
        <details class="g0-pdh-details">
          <summary><span aria-hidden="true">🛡</span> Phase Declaration Header (optional) <span class="g0-details-chev" aria-hidden="true">▾</span></summary>
          <div class="g0-pdh-content">
            <p class="g0-section-note">Paste the entity’s signed declaration to test it. Complete · signed · fresh · consistent — all four are required for a formal badge.</p>
            ${field("Declaration header (JSON)", `<textarea class="g0-input" rows="7" spellcheck="false" placeholder="${esc(G0.headerExample)}" data-bind="wiz.input.headerText">${esc(w.input.headerText)}</textarea>`)}
            <div class="g0-form-grid">
              ${field("Public key (JWK, ECDSA P-256 — optional)", `<textarea class="g0-input" rows="3" spellcheck="false" placeholder='{"kty":"EC","crv":"P-256","x":"…","y":"…"}' data-bind="wiz.input.publicKeyText">${esc(w.input.publicKeyText)}</textarea>`)}
              ${field("Trusted Center-Origin", `<input class="g0-input mono" type="text" value="${esc(w.input.trustedOrigin)}" data-bind="wiz.input.trustedOrigin">`)}
            </div>
            <div class="g0-btn-row">
              <button class="g0-btn ghost sm" data-act="checkHeader" ${w.checking ? "disabled" : ""}>${w.checking ? "Checking…" : "Validate declaration"}</button>
            </div>
            ${w.pdh ? `<div class="g0-pdh-result ${w.pdh.status === "VALID" ? "valid" : "invalid"}">
              <strong>${esc(w.pdh.status)}</strong>
              <ul class="g0-ul tight">
                <li class="${w.pdh.structural ? "good" : "bad"}">Structural — 11 fields, formats, Creator-ID match</li>
                <li class="${w.pdh.signature ? "good" : "bad"}">Signature — ECDSA P-256 against the trusted origin key</li>
                <li class="${w.pdh.freshness ? "good" : "bad"}">Freshness — within 90 days of the cutoff</li>
                <li class="${w.pdh.consistency ? "good" : "bad"}">Consistency — fields match the declared phase</li>
              </ul>
              <p>${esc(w.pdh.reason)}</p></div>` : ""}
          </div>
        </details>`;
    }
    function answerCard(code, title, description, answer, path, open, invalid, cutoff, extra = "") {
      const bodyId = `card-${code}-body`;
      return `
        <section class="g0-answer-card${open ? " expanded" : ""}${invalid ? " invalid" : ""}">
          <div class="g0-answer-top">
            <h4 class="g0-answer-heading"><span class="g0-qcode mono">${code}</span><span>${esc(title)}</span></h4>
            ${binaryChoice(`${path}.value`, answer.value, `${code}: ${title}`)}
          </div>
          ${invalid ? `<p class="g0-field-error"><span aria-hidden="true">⚠</span> Choose Yes or No for ${code}.</p>` : ""}
          <button type="button" class="g0-answer-toggle" data-act="${code.startsWith("B") ? "toggleAnswer" : "toggleConstraint"}" data-i="${code.slice(1) - 1}" aria-expanded="${open}">
            <span aria-hidden="true" class="g0-chev">▾</span> ${open ? "Hide description and evidence" : "Show description and add evidence"}
            ${answer.source ? `<span class="g0-evidence-flag"><span aria-hidden="true">🔗</span>Source added</span>` : ""}
          </button>
          <div id="${bodyId}" class="g0-answer-body" ${open ? "" : "hidden"}>
            <p class="g0-answer-desc">${esc(description)}</p>
            <div class="g0-form-grid">
              ${field("Public source URL", `<input class="g0-input" type="url" inputmode="url" placeholder="https://" value="${esc(answer.source)}" data-bind="${path}.source">`)}
              ${field("Published or effective date", `<input class="g0-input" type="date" value="${esc(answer.date)}" max="${esc(cutoff)}" data-bind="${path}.date">`)}
            </div>
            ${field("Claim this artifact supports", `<textarea class="g0-input" rows="3" placeholder="Describe the observable evidence, not an interpretation." data-bind="${path}.notes">${esc(answer.notes)}</textarea>`)}
            ${answer.value !== true ? field("Evidence gap or bounded search", `<textarea class="g0-input" rows="3" placeholder="If there is no contrary artifact, say what you searched, over what period, and what was not shown." data-bind="${path}.gap">${esc(answer.gap)}</textarea>`) : ""}
            ${extra}
          </div>
        </section>`;
    }
    function reliefFields(prefix, rec, cutoff) {
      const rate = rec.denominator && Number(rec.denominator) > 0 ? Math.round(Number(rec.numerator) / Number(rec.denominator) * 100) : null;
      return `
        <div class="g0-relief">
          <div class="g0-form-grid">
            ${field("Cases granting relief", `<input class="g0-input" type="number" min="0" inputmode="numeric" value="${esc(rec.numerator)}" data-bind="${prefix}.numerator">`)}
            ${field("All resolved cases", `<input class="g0-input" type="number" min="1" inputmode="numeric" value="${esc(rec.denominator)}" data-bind="${prefix}.denominator">`)}
            ${field("Period begins", `<input class="g0-input" type="date" value="${esc(rec.start)}" max="${esc(cutoff)}" data-bind="${prefix}.start">`)}
            ${field("Period ends", `<input class="g0-input" type="date" value="${esc(rec.end)}" max="${esc(cutoff)}" data-bind="${prefix}.end">`)}
          </div>
          <label class="g0-check"><input type="checkbox" data-bind="${prefix}.complete" data-type="bool" ${rec.complete ? "checked" : ""}>This is the complete, published set of resolved cases for the period.</label>
          ${rate !== null ? `<p class="g0-rate${rate >= 50 ? " pos" : ""}">${rate}% relief — at least 50% is required.</p>` : ""}
        </div>`;
    }
    function wizStep1(w) {
      const invalid = code => w.errors.some(e => e.startsWith(`Answer ${code}`));
      return `
        <h3 class="g0-wiz-title" tabindex="-1">Behavioral audit</h3>
        <p class="g0-step-intro">Answer from observable behavior. Every YES needs a qualifying public artifact; every NO needs a gap statement or contrary artifact.</p>
        ${G0.questions.map((q, i) => {
          let extra = "";
          if (i === 3 && w.input.version === "1.1" && w.input.answers[3].value === true) {
            const b = w.input.b4;
            extra = `
              <div class="g0-b4-record">
                <p class="g0-eyebrow">B4 event record (v1.1)</p>
                <div class="g0-form-grid">
                  ${field("Actor (who refuses/appeals)", `<input class="g0-input" value="${esc(b.actor)}" data-bind="wiz.input.b4.actor" placeholder="The affected party">`)}
                  ${field("Action (what is stopped)", `<input class="g0-input" value="${esc(b.action)}" data-bind="wiz.input.b4.action" placeholder="The institutional action">`)}
                  ${field("Procedure (the operative rule)", `<input class="g0-input" value="${esc(b.procedure)}" data-bind="wiz.input.b4.procedure" placeholder="The appeal / stay / exit rule">`)}
                  ${field("Basis", `<select class="g0-select" data-bind="wiz.input.b4.basis">${["NOT_DEMONSTRATED", "TERMINAL_RULE", "RESOLVED_APPEALS", "NO_PENALTY_EXIT"].map(o => `<option${b.basis === o ? " selected" : ""}>${o}</option>`).join("")}</select>`)}
                </div>
                ${b.basis === "RESOLVED_APPEALS" ? reliefFields("wiz.input.b4", b, w.input.cutoff) : ""}
                <p class="g0-note">An external order and compliance with it do not by themselves establish B4=YES.</p>
              </div>`;
          }
          return answerCard(q.code, q.title, q.description + " " + q.examples, w.input.answers[i], `wiz.input.answers.${i}`, w.openQuestion === i, invalid(q.code), w.input.cutoff, extra);
        }).join("")}`;
    }
    function wizStep2(w, detected, prior) {
      const c2 = w.input.c2;
      return `
        <h3 class="g0-wiz-title" tabindex="-1">Constraints and history</h3>
        <p class="g0-step-intro">Constraints must be demonstrated, not just described.</p>
        <div class="g0-vector-preview${detected.phase === "AMBIGUOUS" ? " ambiguous" : ""}" role="status">
          <span aria-hidden="true">${detected.phase === "AMBIGUOUS" ? "⚠" : "✓"}</span>
          <div><strong>${detected.phase === "AMBIGUOUS" ? "Your scored answers are ambiguous" : `Your scored answers match ${detected.phase}`}</strong>
          <p>${detected.phase === "AMBIGUOUS" ? "All four checks, C1 to C4, must pass for NAB-Constrained. Otherwise the result stays unresolved." : "The Step 3.5 constraint checks are not needed for a complete match."}</p></div>
        </div>
        ${detected.phase === "AMBIGUOUS" ? G0.constraintQuestions.map((q, i) => {
          let extra = "";
          if (i === 1 && w.input.version === "1.1") {
            extra = `<div class="g0-b4-record">
              <p class="g0-eyebrow">C2 outcome record (v1.1)</p>
              <label class="g0-check"><input type="checkbox" data-bind="wiz.input.c2.route" data-type="bool" ${c2.route ? "checked" : ""}>A published, accessible appeal route with decision criteria</label>
              <label class="g0-check"><input type="checkbox" data-bind="wiz.input.c2.invoked" data-type="bool" ${c2.invoked ? "checked" : ""}>Invoked cases with published, resolved outcomes</label>
              ${reliefFields("wiz.input.c2", c2, w.input.cutoff)}
            </div>`;
          }
          return answerCard(q.code, q.title, q.description, w.input.constraints[i], `wiz.input.constraints.${i}`, w.openConstraint === i, w.errors.some(e => e.startsWith(`Answer ${q.code}`)), w.input.cutoff, extra);
        }).join("") : ""}
        <details class="g0-pdh-details">
          <summary><span aria-hidden="true">🛡</span> External constraint record (descriptive) <span class="g0-details-chev" aria-hidden="true">▾</span></summary>
          <div class="g0-pdh-content">
            <p class="g0-section-note">Existence and use are separate. An unused (latent) authority earns no phase credit.</p>
            <label class="g0-check"><input type="checkbox" data-bind="wiz.input.external.exists" data-type="bool" data-rebind="1" ${w.input.external.exists ? "checked" : ""}>A public or legal artifact shows an external authority exists</label>
            <label class="g0-check"><input type="checkbox" data-bind="wiz.input.external.exercised" data-type="bool" ${w.input.external.exercised ? "checked" : ""} ${w.input.external.exists ? "" : "disabled"}>The authority was used against this entity or decision</label>
            ${w.input.external.exists ? `
            <div class="g0-form-grid">
              ${field("Authority holder", `<input class="g0-input" value="${esc(w.input.external.holder)}" data-bind="wiz.input.external.holder">`)}
              ${field("Scope or affected decision", `<input class="g0-input" value="${esc(w.input.external.scope)}" data-bind="wiz.input.external.scope">`)}
              ${field("Public artifact URL", `<input class="g0-input" type="url" value="${esc(w.input.external.source)}" data-bind="wiz.input.external.source">`)}
              ${field("Artifact date", `<input class="g0-input" type="date" value="${esc(w.input.external.date)}" max="${esc(w.input.cutoff)}" data-bind="wiz.input.external.date">`)}
            </div>` : ""}
          </div>
        </details>
        ${w.input.version === "1.1" ? `
        <details class="g0-pdh-details">
          <summary><span aria-hidden="true">⟶</span> Constraint decrement (temporal) <span class="g0-details-chev" aria-hidden="true">▾</span></summary>
          <div class="g0-pdh-content">
            <label class="g0-check"><input type="checkbox" data-bind="wiz.input.decrement.enabled" data-type="bool" data-rebind="1" ${w.input.decrement.enabled ? "checked" : ""}>Primary texts show a binding obligation became explicitly nonbinding</label>
            ${w.input.decrement.enabled ? `
            <div class="g0-form-grid">
              ${field("Old binding source URL", `<input class="g0-input" type="url" value="${esc(w.input.decrement.oldSource)}" data-bind="wiz.input.decrement.oldSource">`)}
              ${field("New nonbinding source URL", `<input class="g0-input" type="url" value="${esc(w.input.decrement.newSource)}" data-bind="wiz.input.decrement.newSource">`)}
              ${field("Old effective date", `<input class="g0-input" type="date" value="${esc(w.input.decrement.oldDate)}" max="${esc(w.input.cutoff)}" data-bind="wiz.input.decrement.oldDate">`)}
              ${field("New effective date", `<input class="g0-input" type="date" value="${esc(w.input.decrement.newDate)}" max="${esc(w.input.cutoff)}" data-bind="wiz.input.decrement.newDate">`)}
            </div>
            ${field("Binding to discretionary wording", `<textarea class="g0-input" rows="2" data-bind="wiz.input.decrement.notes">${esc(w.input.decrement.notes)}</textarea>`)}
            <p class="g0-note">This flag records drift. It does not change the answers or the phase on its own.` : ""}
          </div>
        </details>` : ""}
        <div class="g0-history-notice"><span aria-hidden="true">⏱</span><div><strong>${prior.length ? `${prior.length} earlier audit${prior.length > 1 ? "s" : ""} found` : "A first point on the timeline"}</strong>
        <p>${prior.length ? `Most recent: ${esc(prior[prior.length - 1].phase)}, ${esc(G0.formatDate(prior[prior.length - 1].cutoff))}. Transition rules need valid declarations at both points.` : "Later audits with the same entity ID are linked automatically. Baseline examples are not used for timelines."}</p></div></div>`;
    }
    function wizStep3(w) {
      const preview = w.preview;
      const vector = G0.scoredVector(w.input);
      if (!preview) return `
        <h3 class="g0-wiz-title" tabindex="-1">Review and classify</h3>
        ${w.previewError ? `<div class="g0-callout danger"><span aria-hidden="true">⚠</span><p>${esc(w.previewError)}</p></div>` : `<div class="g0-loading"><span class="g0-spinner" aria-hidden="true"></span><span role="status">Applying the Ground-0 rules…</span></div>`}`;
      return `
        <h3 class="g0-wiz-title" tabindex="-1">Review and classify</h3>
        <p class="g0-step-intro">Review the finding and evidence record before saving.</p>
        <div class="g0-result-banner phase-${preview.phase.toLowerCase()}">
          <p class="g0-eyebrow">Detected operational phase</p>
          <p class="g0-result-phase">${esc(preview.phase)}</p>
          <p class="g0-result-meta mono"><span>${preview.confidence === "NONE" ? "evidence incomplete" : `${preview.confidence.charAt(0)}${preview.confidence.slice(1).toLowerCase()} confidence`}</span><span>Ground-0 v${preview.version}${preview.version === "1.1" ? " (draft rules)" : ""}</span></p>
        </div>
        <p class="g0-finding">${esc(preview.finding)}</p>
        <div class="g0-badge-panel">${workingBadgeSVG(preview.workingBadge)}<p class="g0-note">Arcs fill only when an answer has a dated public source. Formal badge status: <strong>${esc(preview.badge)}</strong>.</p></div>
        <dl class="g0-facts">
          <div><dt>Declaration status</dt><dd>${esc(preview.pdh.status)}</dd></div>
          <div><dt>Compliance</dt><dd>${esc(preview.compliance)}</dd></div>
          <div><dt>Badge</dt><dd>${esc(preview.badge)}</dd></div>
          <div><dt>Severity</dt><dd>${esc(String(preview.severity).replace(/_/g, " "))}</dd></div>
        </dl>
        <h4 class="g0-subsection">Scored answers</h4>
        <ul class="g0-vector">${G0.questions.map((q, i) => `<li><span class="g0-qcode mono">${q.code}</span><span>${esc(q.short)}</span><strong class="${vector[i] ? "pos" : ""}">${vector[i] ? "Yes" : "No"}</strong>${w.input.answers[i].value === true && !vector[i] ? `<span class="g0-gap-tag">Yes not supported by a qualifying source</span>` : ""}</li>`).join("")}</ul>
        <p class="g0-meta mono"><span>⏱ cutoff ${esc(G0.formatDate(preview.cutoff))}</span><span>🔗 ${preview.evidence.length} public artifact${preview.evidence.length !== 1 ? "s" : ""}</span></p>
        ${preview.status === "Draft" ? `<div class="g0-callout amber"><span aria-hidden="true">⚠</span><p><strong>This will be saved as a draft.</strong> Evidence or provenance is incomplete, so confidence is None and no badge is issued. Saving does not verify the evidence.</p></div>` : ""}`;
    }

    /* ══════════ AUTOMATIC ══════════ */
    function autoStart() {
      const a = S.auto;
      const query = a.query.trim();
      if (query.length < 2) { a.error = "Enter at least two characters of the organization’s name."; render(); return; }
      if (!a.cutoff || a.cutoff > G0.today()) { a.error = "Choose an evidence cutoff date that is today or earlier."; render(); return; }
      a.error = "";
      a.controller = new AbortController();
      a.stage = "searching";
      S.resetScroll = true;
      render();
      announce(`Searching for ${query}.`);
      R.lookupOrganizations(query, a.controller.signal).then(candidates => {
        if (a.controller.signal.aborted) return;
        if (!candidates.length) { a.stage = "error"; a.error = `No Wikipedia article matched “${query}”. Try the organization’s full official name.`; render(); return; }
        a.candidates = candidates; a.selected = 0; a.stage = "choose"; S.resetScroll = true;
        render();
        announce(`${candidates.length} possible ${candidates.length === 1 ? "match" : "matches"} found. Choose the organization to audit.`);
      }).catch(error => {
        if (R.fetchAborted && R.fetchAborted(error)) return;
        a.stage = "error"; a.error = error instanceof Error ? error.message : "The search could not be completed."; render();
      });
    }
    function autoRun(selection) {
      const a = S.auto;
      a.controller = new AbortController();
      a.stage = "running"; S.resetScroll = true; a.progress = { step: 0, message: "Looking for the organization’s public identity…", completed: 0, total: 5 };
      render();
      R.automaticAudit({
        name: selection ? selection.name : a.query, version: S.version, cutoff: a.cutoff,
        existing: S.audits, signal: a.controller.signal, selection,
        onProgress: progress => { a.progress = progress; if (a.stage === "running") renderAutoProgress(); }
      }).then(outcome => {
        a.outcome = outcome; a.stage = "result"; S.resetScroll = true;
        render();
        announce(`Research draft ready for ${outcome.organization.name}. Working badge: ${outcome.record.workingBadge.label}. Human review required.`);
      }).catch(error => {
        if (error && error.name === "AbortError") { a.stage = "input"; render(); return; }
        if (error && error.name === "OrganizationChoiceError") { a.candidates = error.candidates; a.stage = "choose"; render(); return; }
        a.stage = "error"; a.error = error instanceof Error ? error.message : "The research could not be completed."; render();
      });
    }
    function renderAutoProgress() {
      const host = main.querySelector("#g0-auto-progress");
      if (!host) return;
      const p = S.auto.progress || { completed: 0, total: 5, message: "" };
      host.innerHTML = `
        <div class="g0-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.completed}" aria-label="Research progress">
          <div class="g0-progress-fill" style="width:${(p.completed / p.total) * 100}%"></div>
        </div>
        <p class="g0-progress-msg">${esc(p.message)}</p>`;
      const live = main.querySelector("#g0-auto-live");
      if (live) live.textContent = p.message;
    }
    function renderAutomatic() {
      const a = S.auto;
      if (a.stage === "input" || a.stage === "saved") {
        main.innerHTML = `
          ${heading("Automatic audit", "Name an organization. The record does the rest.", "Key-free public-record research prepares a draft audit — identity, official pages, archived captures, court and regulatory indexes. Review is always required.",
            "")}
          ${a.stage === "saved" ? `<div class="g0-callout ok"><span aria-hidden="true">✓</span><p><strong>Draft saved.</strong> The screening is in the register, marked for review. Open it there to review and edit each answer.</p></div>` : ""}
          <div class="g0-panel">
            <div class="g0-form-grid">
              ${field("Organization name", `<input class="g0-input" type="text" value="${esc(a.query)}" data-bind="auto.query" placeholder="e.g. Anthropic">`)}
              ${field("Evidence cutoff (inclusive)", `<input class="g0-input" type="date" value="${esc(a.cutoff)}" max="${G0.today()}" data-bind="auto.cutoff">`)}
            </div>
            <div class="g0-version-switch">${["1.0", "1.1"].map(v => `<button class="${S.version === v ? "on" : ""}" data-act="setVersion" data-v="${v}">v${v}${v === "1.0" ? " normative" : " draft"}</button>`).join("")}</div>
            <div class="g0-btn-row"><button class="g0-btn primary" data-act="autoStart"><span aria-hidden="true">✦</span> Research this organization</button></div>
            ${a.error ? `<div class="g0-callout danger" role="alert"><span aria-hidden="true">⚠</span><p>${esc(a.error)}</p></div>` : ""}
          </div>
          <div class="g0-callout"><span aria-hidden="true">🔒</span><div><strong>What is searched, honestly.</strong>
          <p>Identity and official website (Wikimedia + Wikidata) · official policy, governance, and appeal pages · archived captures at your cutoff (Internet Archive) · court opinions and dockets (CourtListener) · US regulatory record (Federal Register) · legislative record (GovTrack) · news leads (GDELT — never scored).</p>
          <p>Court, regulatory, and legislative coverage is US-focused. The lookup follows homepage links; it does not crawl entire domains. The organization name goes to these public indexes; nothing else leaves this browser.</p></div></div>`;
        return;
      }
      if (a.stage === "searching") {
        main.innerHTML = `
          ${heading("Automatic audit", "Searching the public directory…", "")}
          <div class="g0-loading tall"><span class="g0-spinner" aria-hidden="true"></span><span role="status">Looking for “${esc(a.query)}” in the public identity directory…</span></div>`;
        return;
      }
      if (a.stage === "choose") {
        main.innerHTML = `
          ${heading("Automatic audit", "Choose the organization you mean", `${a.candidates.length} public ${a.candidates.length === 1 ? "record matches" : "records match"} “${esc(a.query)}”.`)}
          <ul class="g0-candidates">
            ${a.candidates.map((c, i) => `
              <li><button class="g0-candidate${a.selected === i ? " selected" : ""}" data-act="autoPick" data-i="${i}">
                <span class="g0-candidate-radio" aria-hidden="true"></span>
                <span class="g0-candidate-body"><strong>${esc(c.name)} <span class="mono dim">${esc(c.identifier)}</span></strong>
                <span>${esc(c.description.slice(0, 180))}${c.description.length > 180 ? "…" : ""}</span>
                ${c.website ? `<span class="mono dim">${esc(c.website)}</span>` : ""}</span>
              </button></li>`).join("")}
          </ul>
          <div class="g0-btn-row">
            <button class="g0-btn ghost" data-act="autoBack">Back</button>
            <button class="g0-btn primary" data-act="autoChoose">Research ${esc(a.candidates[a.selected] ? a.candidates[a.selected].name : "")} <span aria-hidden="true">▸</span></button>
          </div>`;
        return;
      }
      if (a.stage === "running") {
        main.innerHTML = `
          ${heading("Automatic audit", "Researching the public record…", "Reading identity, official pages, archives, and registries. Every outcome will be disclosed — including empty and unavailable ones.")}
          <div class="g0-panel" id="g0-auto-progress">
            <div class="g0-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0"><div class="g0-progress-fill" style="width:0%"></div></div>
            <p class="g0-progress-msg">Preparing…</p>
          </div>
          <div class="g0-btn-row"><button class="g0-btn ghost" data-act="autoCancel">Cancel research</button></div>
          <div class="sr-only-g0" id="g0-auto-live" aria-live="polite"></div>`;
        renderAutoProgress();
        return;
      }
      if (a.stage === "error") {
        main.innerHTML = `
          ${heading("Automatic audit", "The research could not complete", "")}
          <div class="g0-callout danger"><span aria-hidden="true">⚠</span><p>${esc(a.error)}</p></div>
          <div class="g0-callout"><span aria-hidden="true">ℹ</span><p>Nothing was classified or saved. Public indexes rate-limit or go unavailable; retrying often works. You can also audit manually.</p></div>
          <div class="g0-btn-row">
            <button class="g0-btn ghost" data-act="autoRetry">Back</button>
            <button class="g0-btn primary" data-act="autoRetry">Try again</button>
            <button class="g0-btn ghost" data-act="startWizard">Audit manually instead</button>
          </div>`;
        return;
      }
      /* result */
      const o = a.outcome;
      const rec = o.record;
      registerListen("auto-summary", `Automatic research draft for ${o.organization.name}. ${rec.workingBadge.label}. ${rec.workingBadge.filled} of 5 behavioral questions evidenced. ${rec.workingBadge.explanation} Formal badge status: ${rec.badge}. Human review is required.`);
      main.innerHTML = `
        ${heading("Automatic audit · research draft", esc(o.organization.name), `${o.method === "web-research" ? "Hosted web research" : "Key-free public lookup"} · evidence through ${esc(o.cutoff)} · nothing is scored without review`,
          listenButton("", "auto-summary"))}
        <div class="g0-callout amber"><span aria-hidden="true">⚠</span><p><strong>This is a research draft, not an audit finding.</strong> Fixed rules coded suggested answers from public records. Source identity, dates, scope, and every quote require human review. The formal badge stays unissued.</p></div>
        <div class="g0-cards2">
          <div class="g0-panel">
            <div class="g0-detail-phase"><div><p class="g0-eyebrow">Suggested phase</p>${phaseBadge(rec.phase)}</div><div class="g0-detail-confidence">${confidenceBars(rec.confidence)}<span>pending review</span></div></div>
            <div class="g0-badge-panel">${workingBadgeSVG(rec.workingBadge)}</div>
            <p class="g0-finding">${esc(rec.finding)}</p>
          </div>
          <div class="g0-panel">
            <p class="g0-eyebrow">Coverage — every registry, every outcome</p>
            <div class="g0-table-wrap slim">
              <table class="g0-table coverage">
                <thead><tr><th>Registry</th><th>Status</th><th>Found</th><th>Mentions</th></tr></thead>
                <tbody>${o.coverage.map(c => `<tr><td>${esc(c.registry)}<span class="g0-cov-src mono">${esc(c.source)}</span></td><td><span class="g0-status cov-${c.status}">${esc(c.status)}</span></td><td class="mono">${c.found}</td><td class="mono">${c.mentions}</td></tr>`).join("")}</tbody>
              </table>
            </div>
            <p class="g0-section-note">${esc(c.coverageNote || "")}</p>
          </div>
        </div>
        <h3 class="g0-subsection">Suggested answers — with the quotes behind them</h3>
        <ul class="g0-auto-questions">
          ${G0.questions.map((q, i) => {
            const ans = o.input.answers[i];
            const src = ans.source ? o.sources.find(s => G0.canonicalUrl(s.url) === G0.canonicalUrl(ans.source)) : null;
            return `<li class="g0-auto-question">
              <div class="g0-auto-q-head"><span class="g0-qcode mono">${q.code}</span><h4>${esc(q.title)}</h4>
              <span class="g0-pill ${ans.value === null ? "unknown" : ans.value ? "yes" : "no"}">${ans.value === null ? "Unknown — not demonstrated" : ans.value ? "Yes" : "No"}</span></div>
              ${ans.notes ? `<blockquote>${esc(ans.notes)}</blockquote>` : ""}
              ${src ? `<p class="g0-quote-meta"><a href="${esc(src.url)}" target="_blank" rel="noreferrer">${esc(src.title)}<span class="sr-only-g0"> (opens in a new tab)</span></a><span class="mono">${esc(G0.sourceDateDescription(src))}</span></p>` : `<p class="g0-auto-gap">${esc(ans.gap)}</p>`}
            </li>`;
          }).join("")}
        </ul>
        <details class="g0-pdh-details"><summary><span aria-hidden="true">◧</span> Retrieved sources (${o.sources.length}) <span class="g0-details-chev" aria-hidden="true">▾</span></summary>
          <ul class="g0-source-list">${o.sources.map(s => `
            <li><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.title)}<span class="sr-only-g0"> (opens in a new tab)</span></a>
            <span class="mono">${esc(G0.sourceDateDescription(s))}${s.codes.length ? ` · codes: ${esc(s.codes.join(", "))}` : ""}</span></li>`).join("")}</ul>
        </details>
        <details class="g0-pdh-details"><summary><span aria-hidden="true">⚠</span> Limitations (${o.warnings.length}) <span class="g0-details-chev" aria-hidden="true">▾</span></summary>
          <ul class="g0-ul">${o.warnings.map(w => `<li>${esc(w)}</li>`).join("")}</ul>
        </details>
        <div class="g0-btn-row end">
          <button class="g0-btn ghost" data-act="autoBack">Research another</button>
          <button class="g0-btn ghost" data-act="exportAuto"><span aria-hidden="true">⭳</span> Export research summary</button>
          <button class="g0-btn" data-act="saveAuto">Save as review-required draft</button>
          <button class="g0-btn primary" data-act="reviewAuto">Review in the manual wizard <span aria-hidden="true">▸</span></button>
        </div>`;
    }

    /* ══════════ EVIDENCE ══════════ */
    function evidenceAdd() {
      const get = id => main.querySelector(id);
      const val = id => { const el = get(id); return el && typeof el.value === "string" ? el.value : ""; };
      const url = val("#ev-url").trim();
      if (!G0.safePublicUrl(url)) { api.toast("refusal", "REFUSAL — NOT A PUBLIC URL", "Evidence must be a public http(s) URL. Local, internal and raw-IP addresses never qualify."); return; }
      const title = val("#ev-title").trim() || "Public artifact";
      const item = {
        id: `EV-${Date.now().toString(36).toUpperCase()}`,
        title, url,
        published: val("#ev-date") || "",
        retrieved: G0.today(),
        claim: val("#ev-claim").trim(),
        codes: Array.from(main.querySelectorAll(".g0-ev-codes input:checked")).map(c => c.value),
        entity: val("#ev-entity").trim()
      };
      S.evidence.unshift(item);
      saveEvidence();
      kernel.record("info", `GROUND-0 EVIDENCE — public artifact saved to the local library: ${title} (${url}). It stays unscored until cited in an audit.`);
      api.toast("info", "ARTIFACT SAVED", "It stays unscored until you cite it in an audit.");
      render();
    }
    function renderEvidence() {
      const cited = url => S.audits.filter(a => a.evidence.some(e => e.url === url)).length;
      const items = S.evidence.filter(e => !S.evSearch || `${e.title} ${e.url} ${e.entity} ${e.claim}`.toLowerCase().includes(S.evSearch.toLowerCase()));
      main.innerHTML = `
        ${heading("Evidence library", "Public artifacts, waiting to be cited.", "An artifact is unscored until an audit cites it with a date and a claim. Nothing here earns phase credit on its own.")}
        <div class="g0-panel">
          <p class="g0-eyebrow">Add a public artifact</p>
          <div class="g0-form-grid">
            ${field("Title", `<input class="g0-input" id="ev-title" type="text" placeholder="e.g. Terms of Service — enforcement section">`)}
            ${field("Public URL", `<input class="g0-input" id="ev-url" type="url" placeholder="https://">`)}
            ${field("Published or effective date", `<input class="g0-input" id="ev-date" type="date">`)}
            ${field("Entity (optional)", `<input class="g0-input" id="ev-entity" type="text" placeholder="Which body this artifact concerns">`)}
          </div>
          ${field("The claim it supports", `<textarea class="g0-input" id="ev-claim" rows="2" placeholder="What this artifact observably shows — not an interpretation."></textarea>`)}
          <fieldset class="g0-ev-codes"><legend class="g0-field-label">Supports (optional)</legend>
            ${[...G0.questions, ...G0.constraintQuestions].map(q => `<label class="g0-check inline"><input type="checkbox" value="${q.code}">${q.code}</label>`).join("")}
          </fieldset>
          <div class="g0-btn-row"><button class="g0-btn primary sm" data-act="addEvidence">Save artifact</button></div>
        </div>
        <div class="g0-toolbar">
          <label class="g0-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search artifacts…" value="${esc(S.evSearch)}" data-bind="evSearch" aria-label="Search evidence"></label>
          <span class="g0-local mono">${items.length} of ${S.evidence.length} artifacts</span>
        </div>
        ${items.length ? `<ul class="g0-evidence-list">${items.map(item => `
          <li class="g0-evidence-card">
            <h4>${esc(item.title)} ${cited(item.url) ? `<span class="g0-pill yes">cited in ${cited(item.url)} audit${cited(item.url) > 1 ? "s" : ""}</span>` : `<span class="g0-pill">uncited</span>`}</h4>
            ${item.claim ? `<p>${esc(item.claim)}</p>` : ""}
            <a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.url)}<span class="sr-only-g0"> (opens in a new tab)</span></a>
            <p class="g0-meta mono"><span>published ${esc(G0.formatDate(item.published, true))}</span><span>retrieved ${esc(G0.formatDate(item.retrieved, true))}</span>${item.codes.length ? `<span>tags ${esc(item.codes.join(", "))}</span>` : ""}${item.entity ? `<span>${esc(item.entity)}</span>` : ""}</p>
          </li>`).join("")}</ul>` : `
        <div class="g0-empty"><span class="g0-empty-icon" aria-hidden="true">◧</span><h3>No artifacts yet</h3><p>Save the public documents you plan to cite. They stay unscored until an audit uses them.</p></div>`}`;
    }

    /* ══════════ TEMPORAL ══════════ */
    function renderTemporal() {
      const transitions = S.audits.filter(a => a.transition).sort((a, b) => b.cutoff.localeCompare(a.cutoff));
      main.innerHTML = `
        ${heading("Temporal ledger", "A timeline needs more than one point.", "Audit an entity, then audit it again later with the same identifier. Ground-0 links the records and checks the transition rules.",
          `<button class="g0-btn ghost sm" data-act="exportLedger" ${transitions.length ? "" : "disabled"}><span aria-hidden="true">⭳</span> Export ledger</button>`)}
        <div class="g0-trans-rules">
          <div class="g0-panel note"><span aria-hidden="true">⇄</span><h3>Reversible</h3><p>${phaseBadge("NAB", true)} ↔ ${phaseBadge("CWO", true)} with a clear destination declaration.</p></div>
          <div class="g0-panel note warn"><span aria-hidden="true">↑</span><h3>One-way escalation</h3><p>${phaseBadge("NAB", true)} or ${phaseBadge("CWO", true)} → ${phaseBadge("GSRB", true)} requires a declaration stating internal legitimacy, override-able refusal, time-confirmed authority — and loss of misuse resistance.</p></div>
          <div class="g0-panel note danger"><span aria-hidden="true">⊘</span><h3>Forbidden reversion</h3><p>${phaseBadge("GSRB", true)} ↛ ${phaseBadge("NAB", true)} or ${phaseBadge("CWO", true)} — except through complete structural collapse and rebuild.</p></div>
        </div>
        <div class="g0-panel">
          <div class="g0-panel-head"><h3>Transition ledger <span class="g0-tiny-count mono">${transitions.length}</span></h3><p>Assessments linked by the same entity identifier.</p></div>
          ${transitions.length ? `<ul class="g0-transition-list">${transitions.map(a => `
            <li><button class="g0-transition" data-act="openDetail" data-id="${esc(a.id)}">
              <span class="g0-transition-dot" aria-hidden="true"></span>
              <span class="g0-transition-name"><strong>${esc(a.name)}</strong><span>${esc(G0.formatDate(a.transition.fromDate))} → ${esc(G0.formatDate(a.transition.toDate))}</span></span>
              <span class="g0-transition-phases">${phaseBadge(a.transition.from, true)}<span aria-hidden="true">→</span>${phaseBadge(a.transition.to, true)}</span>
              <span class="g0-transition-status${a.transition.status === "FORBIDDEN" ? " danger" : ""}">${esc(a.transition.status.replace(/_/g, " "))}</span>
            </button></li>`).join("")}</ul>` : `
          <div class="g0-empty"><span class="g0-empty-icon" aria-hidden="true">⟶</span><h3>No transitions recorded yet</h3><p>Ground-0 links audits of the same entity across cutoffs and applies the transition rules automatically.</p><button class="g0-btn primary" data-act="startWizard">${S.audits.length ? "Audit an entity again" : "Create your first assessment"}</button></div>`}
        </div>
        <div class="g0-trans-notes">
          <div class="g0-panel note"><span aria-hidden="true">↻</span><h3>Oscillation</h3><p>Rapid back-and-forth changes. The source defines no numeric window, so no automatic oscillation finding is made.</p></div>
          <div class="g0-panel note"><span aria-hidden="true">↗</span><h3>Drift</h3><p>Gradual authority escalation — or, in v1.1, a documented change from a binding constraint to a nonbinding goal.</p></div>
          <div class="g0-panel note"><span aria-hidden="true">▦</span><h3>Rebranding</h3><p>The declared phase changes while documented behavior stays the same.</p></div>
        </div>`;
    }

    /* ══════════ PHASES ══════════ */
    function renderPhases() {
      const extra = [
        { phase: "AMBIGUOUS", name: "Unresolved", category: "Outcome", symbol: "◈", color: "sand", description: "The answers partly fit a phase pattern, but not completely.", characteristics: ["Partial branch fit — at least three conditions of one branch", "Step 3.5 constraint check applies", "v1.1 keeps it AMBIGUOUS when any constraint fails", "No badge is assigned"], fields: null, vector: null },
        { phase: "INCOHERENT", name: "No defined pattern", category: "Outcome", symbol: "✖", color: "danger", description: "The answers do not fit any defined phase.", characteristics: ["No branch reaches the three-condition minimum", "Badge status: Invalid", "Severity: collapse risk", "Requires clarification and revalidation"], fields: null, vector: null }
      ];
      main.innerHTML = `
        ${heading("The phase spectrum", "Four phases. One observable standard.", "A vocabulary for what a system does — not what it says it is.",
          `<button class="g0-btn ghost sm" data-act="nav" data-tab="logic">Explore the logic <span aria-hidden="true">▸</span></button>`)}
        <div class="g0-phase-grid">
          ${[...G0.phaseDefinitions, ...extra].map(def => `
            <section class="g0-phase-card ${def.color}">
              <div class="g0-phase-head"><span class="g0-phase-icon" aria-hidden="true">${def.symbol}</span><p class="g0-eyebrow">${esc(def.category)}</p></div>
              <h3>${esc(def.phase)}</h3>
              <p class="g0-phase-name">${esc(def.name)}</p>
              <p class="g0-plain"><strong>In plain language:</strong> ${esc(G0.plainPhase[def.phase])}</p>
              ${def.vector ? `<div class="g0-vector-chips mono">${def.vector.map((v, i) => `<span class="${v === true ? "pos" : v === false ? "neg" : "any"}">B${i + 1} ${v === true ? "Y" : v === false ? "N" : "either"}</span>`).join("")}</div>` : ""}
              ${S.phaseDetail === def.phase ? `<ul class="g0-ul">${def.characteristics.map(c => `<li class="good">${esc(c)}</li>`).join("")}</ul>${def.examples ? `<p class="g0-note"><strong>Examples:</strong> ${esc(def.examples)}</p>` : ""}` : ""}
              <div class="g0-phase-foot"><button class="g0-textbtn" data-act="phaseDetail" data-phase="${esc(def.phase)}">${S.phaseDetail === def.phase ? "Collapse" : "Inspect"} ${esc(def.phase)}</button></div>
            </section>`).join("")}
        </div>
        <div class="g0-callout"><span aria-hidden="true">ℹ</span><p>These are the supplied framework’s operational categories, not legal or scientific determinations. A phase label does not by itself establish badge validity, compliance, or the truth of submitted evidence.</p></div>`;
    }

    /* ══════════ LOGIC ══════════ */
    function renderLogic() {
      const v = S.logic.vector.map(Boolean);
      const result = G0.classify(v);
      const actual = result.phase === "AMBIGUOUS" && S.logic.constraints.every(Boolean) ? "NAB-Constrained" : result.phase;
      const confidence = actual === "NAB-Constrained" ? "HIGH" : result.confidence;
      const sandboxBadge = G0.provisionalBadge(v, [true, true, true, true, true]);
      const constraintLabels = ["External override", "Functional appeals (50% relief or more)", "Authority sunset", "Constraints active now"];
      const truthRows = Array.from({ length: 32 }, (_, number) => {
        const answers = Array.from({ length: 5 }, (_, bit) => Boolean(number & (1 << (4 - bit))));
        const row = G0.classify(answers);
        return `<tr>${answers.map(a => `<td class="${a ? "pos" : ""}">${a ? "Yes" : "No"}</td>`).join("")}<td>${phaseBadge(row.phase, true)}</td><td>${row.confidence}</td></tr>`;
      }).join("");
      main.innerHTML = `
        ${heading("Transparent by design", "No black box. Just the branches.", "See how five yes-or-no observations become a phase classification.",
          `<button class="g0-btn ghost sm" data-act="startWizard"><span aria-hidden="true">✎</span> Manual audit</button><button class="g0-btn primary sm" data-act="nav" data-tab="automatic"><span aria-hidden="true">✦</span> Automatic audit</button>`)}
        <div class="g0-toolbar"><div class="g0-version-switch">${["1.0", "1.1"].map(x => `<button class="${S.version === x ? "on" : ""}" data-act="setVersion" data-v="${x}">v${x}${x === "1.0" ? " normative" : " draft"}</button>`).join("")}</div><span class="g0-local mono">Rules sandbox — no evidence credit</span></div>
        <div class="g0-logic-grid">
          <section class="g0-panel">
            <p class="g0-eyebrow">Interactive decision tree</p>
            <h3>Change the observations</h3>
            <p class="g0-section-note">Choose Yes or No for each question. The result updates straight away.</p>
            <div class="g0-predicate-list">
              ${G0.questions.map((q, i) => `
                <div class="g0-predicate-row">
                  <span class="g0-qcode mono" aria-hidden="true">${q.code}</span>
                  <div class="g0-predicate-text"><strong>${esc(q.title)}</strong><span class="mono">${esc(q.variable)}</span></div>
                  ${binaryChoice(`logic.vector.${i}`, v[i], `${q.code}: ${q.title}`)}
                </div>`).join("")}
            </div>
            <div class="g0-presets"><span>Load a pattern:</span>${G0.phaseDefinitions.filter(d => d.vector).map(d => `<button class="g0-btn ghost xs" data-act="presetVector" data-phase="${d.phase}">${d.phase}</button>`).join("")}</div>
          </section>
          <section class="g0-panel">
            <p class="g0-eyebrow" id="sandbox-result-title">The rules return</p>
            <p class="sr-only-g0" role="status">Result: ${esc(actual)}, ${confidence.toLowerCase()} confidence.</p>
            <div class="g0-result-inline">${phaseBadge(actual)}${confidenceBars(confidence)}</div>
            <p class="g0-plain">${esc(G0.plainPhase[actual])}</p>
            <div class="g0-badge-panel slim">${phaseRingSVG(sandboxBadge)}<p class="g0-note">In the sandbox every answer counts as evidenced, so all five segments colour in. Blue segments agree with the CWO presumption; hatched segments prove it wrong.</p></div>
            <h4 class="g0-subsection">Branch matches</h4>
            <ul class="g0-branch-matches">
              ${["NAB", "CWO", "GSRB"].map((phase, index) => { const total = index === 1 ? 4 : 5; return `
                <li><div><strong>${phase}</strong><span>${result.matches[index]} of ${total} conditions</span></div>
                <div class="g0-branch-bar" aria-hidden="true"><i style="width:${(result.matches[index] / total) * 100}%"></i></div></li>`; }).join("")}
            </ul>
            ${result.phase === "AMBIGUOUS" ? `
            <fieldset class="g0-sandbox-constraints"><legend>Step 3.5 — all four must pass</legend>
              ${constraintLabels.map((label, i) => `<label class="g0-check"><input type="checkbox" data-bind="logic.constraints.${i}" data-type="bool" data-rebind="1" ${S.logic.constraints[i] ? "checked" : ""}>C${i + 1} · ${esc(label)}</label>`).join("")}
              <p>${actual === "NAB-Constrained" ? "All four constraints are met. This is a rules result, not a verified badge." : "Any unmet constraint keeps the result AMBIGUOUS. There is no automatic escalation to GSRB."}</p>
            </fieldset>` : `<p class="g0-plain">${actual === "CWO" ? "All four CWO conditions match. B4 is not part of the CWO branch." : `Every required ${actual} condition matches. The first complete branch wins.`}</p>`}
            <p class="g0-note"><span aria-hidden="true">ℹ</span> This sandbox tests the decision rules only. Real audits need public evidence and a validated declaration.</p>
          </section>
        </div>
        <div class="g0-callout"><span aria-hidden="true">ƒ</span><p><strong>An implementation boundary, not an amendment.</strong> NAB and GSRB require opposite answers, so every complete set of five answers matches at least three conditions of one branch. INCOHERENT stays in the specification but cannot occur for a complete set of answers. ${S.version === "1.0" ? "The undefined optional escalation in v1.0 is not automated." : "The v1.1 draft keeps AMBIGUOUS when any constraint fails."}</p></div>
        <details class="g0-pdh-details truth"><summary><span aria-hidden="true">▦</span> The complete truth table (32 combinations) <span class="g0-details-chev" aria-hidden="true">▾</span></summary>
          <div class="g0-table-wrap">
            <table class="g0-table truth">
              <caption class="sr-only-g0">Every combination of the five answers and the Step 3 result</caption>
              <thead><tr><th>B1</th><th>B2</th><th>B3</th><th>B4</th><th>B5</th><th>Step 3 phase</th><th>Confidence</th></tr></thead>
              <tbody>${truthRows}</tbody>
            </table>
          </div>
        </details>`;
    }

    /* ══════════ SPECIFICATION ══════════ */
    async function loadSpecRaw(version) {
      if (S.spec.raw[version] !== null) { render(); return; }
      S.spec.loading = true; render();
      try {
        const response = await fetch(`specs/ground-0-v${version}.md`);
        S.spec.raw[version] = response.ok ? await response.text() : `The versioned source could not be loaded (HTTP ${response.status}). Use the download button.`;
      } catch { S.spec.raw[version] = "The versioned source could not be loaded. Use the download button."; }
      S.spec.loading = false;
      render();
    }
    function renderSpec() {
      const sections = G0_SPEC.getSections(S.version);
      const raw = S.spec.raw[S.version];
      main.innerHTML = `
        ${heading("The versioned standard", "One source. A clear baseline.", "Understand the rules — and the version that governs them.",
          `<a class="g0-btn primary sm" href="specs/ground-0-v${S.version}.md" download><span aria-hidden="true">⭳</span> Download source</a>`)}
        <div class="g0-toolbar">
          <div class="g0-version-switch">${["1.0", "1.1"].map(v => `<button class="${S.version === v ? "on" : ""}" data-act="specVersion" data-v="${v}">v${v}${v === "1.0" ? " normative" : " draft"}</button>`).join("")}</div>
          <div class="g0-version-switch" role="group" aria-label="Document view">
            <button class="${S.spec.view === "reader" ? "on" : ""}" data-act="specTab" data-view="reader">Reader</button>
            <button class="${S.spec.view === "source" ? "on" : ""}" data-act="specTab" data-view="source">Source text</button>
          </div>
          <button class="g0-btn ghost xs" data-act="copyCitation"><span aria-hidden="true">⧉</span> Copy citation</button>
        </div>
        ${S.version === "1.1" ? `<div class="g0-callout amber"><span aria-hidden="true">ℹ</span><p><strong>Proposed amendment — not ratified.</strong> v1.1 is pending author adoption and does not supersede the finalized v1.0 baseline. Baseline case results must be rerun before being reported as v1.1 results.</p></div>` : ""}
        <div class="g0-spec-layout">
          <nav class="g0-spec-toc" aria-label="Specification sections">
            <p class="g0-eyebrow">In this document</p>
            <ol>${sections.map(s => `<li><button data-act="specJump" data-id="${s.id}"><span aria-hidden="true">${s.numeral}</span>${esc(s.title)}</button></li>`).join("")}</ol>
            <div class="g0-toc-origin mono"><span aria-hidden="true">◎</span><span>CENTER ORIGIN<strong>0•000•000•0000</strong></span></div>
          </nav>
          <article class="g0-spec-document">
            <header class="g0-spec-header">
              <span class="g0-source-status ${S.version === "1.0" ? "normative" : "draft"}"><i></i>${S.version === "1.0" ? "FINALIZED · NORMATIVE SOURCE" : "AMENDMENT DRAFT · PENDING ADOPTION"}</span>
              <h3>Ground-0 Phase<br>Detection Algorithm <span>v${S.version}</span></h3>
              <p>Harshal’s Systems (AGS++) · Orb Communicator Model</p>
              <div class="g0-spec-author"><span class="g0-avatar" aria-hidden="true">HP</span><div><strong>Harshal Priyavadan Patel</strong><span>A44674928 · Baseline finalized September 12, 2026</span></div></div>
            </header>
            ${S.spec.view === "source" ? `
              <div class="g0-source-reader">
                <p class="g0-eyebrow">Versioned source text</p>
                ${S.spec.loading ? `<div class="g0-loading tall"><span class="g0-spinner" aria-hidden="true"></span><span role="status">Loading the archived source…</span></div>` : `<pre tabindex="0" aria-label="Source text of Ground-0 v${S.version}">${esc(raw || "")}</pre>`}
              </div>` : `
              <div class="g0-reader">
                <p class="g0-reader-note"><span aria-hidden="true">ℹ</span> This reader organizes the supplied specification. The source download preserves the versioned text.</p>
                ${S.version === "1.1" ? `<section class="g0-amendment"><p class="g0-eyebrow">Five proposed clarifications</p>${G0_SPEC.amendmentItems.map((item, i) => `<div><span class="mono">0${i + 1}</span><div><h4>${esc(item.title)}</h4><p>${esc(item.text)}</p></div></div>`).join("")}</section>` : ""}
                ${sections.map(s => `
                  <section id="spec-${s.id}" class="g0-spec-section" tabindex="-1">
                    <div class="g0-spec-heading"><span aria-hidden="true">${s.numeral}</span><div><h4>${esc(s.title)}</h4><p>${esc(s.summary)}</p></div></div>
                    ${(s.paragraphs || []).map(p => `<p class="g0-body">${esc(p)}</p>`).join("")}
                    ${s.code ? `<pre class="g0-spec-code">${esc(s.code)}</pre>` : ""}
                    ${s.table ? `<div class="g0-table-wrap" role="region" aria-label="${esc(s.title)} table" tabIndex="0"><table class="g0-table spec"><thead><tr>${s.table.headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.table.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}
                    ${(s.bullets || []).length ? `<ul class="g0-ul">${s.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
                  </section>`).join("")}
                <div class="g0-spec-end"><span aria-hidden="true">🛡</span><span>END OF SPECIFICATION</span><p>${S.version === "1.0" ? "Normative baseline · v1.0" : "Amendment draft · Not ratified"}</p></div>
              </div>`}
          </article>
        </div>`;
      main.querySelectorAll('[data-act="specJump"]').forEach(b => b.addEventListener("click", () => {
        const target = main.querySelector(`#spec-${b.dataset.id}`);
        if (target) { target.scrollIntoView({ behavior: root.dataset.motion === "reduce" ? "auto" : "smooth", block: "start" }); target.focus({ preventScroll: true }); }
      }));
    }

    /* ══════════ ACCESSIBILITY ══════════ */
    function renderAccess() {
      const prefSelect = (key, label, options) => `
        <div class="g0-pref-row">
          <div><strong>${label}</strong><span class="g0-pref-desc">${options.find(o => o[0] === S.prefs[key])[2]}</span></div>
          <div class="g0-version-switch" role="group" aria-label="${label}">${options.map(([value, text]) => `<button class="${S.prefs[key] === value ? "on" : ""}" data-act="pref" data-key="${key}" data-value="${value}">${text}</button>`).join("")}</div>
        </div>`;
      main.innerHTML = `
        ${heading("Support", "Accessibility", "These preferences apply to the Ground-0 workspace, are stored in this browser, and never leave it.")}
        <div class="g0-panel">
          ${prefSelect("textSize", "Text size", [["default", "Standard", "The workspace default."], ["large", "Large", "Scales Ground-0 text by 1.18×."], ["larger", "Larger", "Scales Ground-0 text by 1.36×."], ["largest", "Largest", "Scales Ground-0 text by 1.55×."]])}
          ${prefSelect("contrast", "Contrast", [["system", "System", "Follows your increased-contrast system setting."], ["standard", "Standard", "The workspace palette."], ["high", "High", "Stronger borders and brighter text throughout Ground-0."]])}
          ${prefSelect("motion", "Motion", [["system", "System", "Follows your reduced-motion system setting."], ["reduce", "Reduce", "Removes Ground-0 transitions and smooth scrolling."]])}
          <div class="g0-pref-row">
            <div><strong>Reading mode</strong><span class="g0-pref-desc">Simpler sentences, more spacing, clearer structure.</span></div>
            <label class="g0-switch"><input type="checkbox" data-bind="prefs.readable" data-type="bool" data-rebind="1" ${S.prefs.readable ? "checked" : ""} aria-label="Reading mode"><span></span></label>
          </div>
          <div class="g0-pref-row">
            <div><strong>Underline links</strong><span class="g0-pref-desc">Links are underlined as well as coloured.</span></div>
            <label class="g0-switch"><input type="checkbox" data-bind="prefs.underline" data-type="bool" data-rebind="1" ${S.prefs.underline ? "checked" : ""} aria-label="Underline links"><span></span></label>
          </div>
          <div class="g0-pref-row">
            <div><strong>Speech rate</strong><span class="g0-pref-desc">How fast “Listen to summary” reads findings aloud.</span></div>
            <div class="g0-rate"><input type="range" min="0.6" max="1.6" step="0.05" value="${S.prefs.speechRate}" data-bind="prefs.speechRate" data-rebind="1" aria-label="Speech rate"><span class="mono">${Number(S.prefs.speechRate).toFixed(2)}×</span></div>
          </div>
          <div class="g0-btn-row end"><button class="g0-btn ghost sm" data-act="resetPrefs">Reset to defaults</button></div>
        </div>
        <div class="g0-callout"><span aria-hidden="true">♿</span><div><strong>Built in, not bolted on.</strong>
        <p>Every control is reachable by keyboard; focus is preserved across re-renders; status changes are announced to live regions; the working badge and sandbox ring encode meaning by pattern and count, never by colour alone; the truth table and coverage tables scroll within labelled regions.</p></div></div>`;
      main.querySelectorAll('[data-act="pref"]').forEach(b => b.addEventListener("click", () => {
        S.prefs[b.dataset.key] = b.dataset.value;
        savePrefs(); applyPrefs(); render();
        announce(`${b.dataset.key} set to ${b.dataset.value}.`);
      }));
    }

    /* boot the workspace */
    render();
    kernel.record("info", "GROUND-0 WORKSPACE — phase-intelligence workspace online (engine v1.0/v1.1, manual + automatic routes). The app witnesses and classifies; it never acts.");
  }
});
