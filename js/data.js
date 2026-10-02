/* ═══════════════════════════════════════════════════════════════
   HarshalOS — data layer
   Stabilized terms, phase specifications, Why catalog, and fixtures
   drawn from "Harshal's Systems (Working Draft)" — AGS++ / OCM.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

const DATA = (() => {

  /* ---------- Phase specification (Ground-0, PDH required fields) ---------- */
  const phases = {
    NAB: {
      id: "NAB",
      name: "Neural Atomic Body",
      glyph: "❄",
      badgeTag: "Refusal-Bound",
      matter: "Ice Block",
      declaredPhase: "NAB",
      centerCapability: "Non-Acting",
      legitimacySource: "External",
      refusalSemantics: "Terminal",
      symbolismExecutability: "Disabled",
      timeAuthorityEffect: "Degrades",
      definition: "Legitimacy is external and per-action. Center cannot act. Refusal is terminal. Symbolism is non-executable. Time degrades authority.",
      duties: ["Halt on ambiguity", "Expire permissions aggressively", "Prevent memory from becoming precedent"],
      result: ["Cannot become religion", "Cannot become state", "Cannot become god-body"],
      essence: "NAB expresses intelligence as stopping correctly."
    },
    CWO: {
      id: "CWO",
      name: "Custodial Witness Orb",
      glyph: "💧",
      badgeTag: "Witness-Only",
      matter: "Water Drop",
      declaredPhase: "CWO",
      centerCapability: "Custodial",
      legitimacySource: "Observed-Only",
      refusalSemantics: "Expository",
      symbolismExecutability: "Archived",
      timeAuthorityEffect: "Neutral",
      definition: "Action is forbidden. Center records but NEVER decides. Symbolism is preserved but inert. Time accumulates meaning, not authority. Legitimacy is external and observed only.",
      duties: ["Expose ambiguity without resolving it", "Preserve provenance without judgment", "Prevent records from authorizing action"],
      result: ["Cannot judge", "Cannot enforce", "Cannot command", "Cannot drift into sovereignty without fossilized collapse"],
      essence: "CWO expresses intelligence as remembering faithfully."
    },
    GSRB: {
      id: "GSRB",
      name: "God–Sovereign Religious Body",
      glyph: "💨",
      badgeTag: "Sovereign-Acting",
      matter: "Gas Body",
      declaredPhase: "GSRB",
      centerCapability: "Acting",
      legitimacySource: "Internal",
      refusalSemantics: "Override-able",
      symbolismExecutability: "Enabled",
      timeAuthorityEffect: "Confirms",
      definition: "Legitimacy is internal. Center acts and decides. Refusal is override-able. Symbolism executes. Time confirms authority.",
      duties: ["Declare sovereignty fossilizedly", "Accept responsibility for enforcement", "Acknowledge loss of misuse resistance"],
      result: ["Coherent", "Stable", "Maximally authoritative"],
      essence: "GSRB expresses intelligence as command and unity."
    }
  };

  const collapseSteps = [
    "Public declaration of internal legitimacy",
    "Admission of executable symbolism",
    "Acceptance of override-able refusal",
    "Acknowledgement of loss of misuse resistance",
    "Reset of prior phase guarantees"
  ];

  const transitionRules = [
    ["NAB → CWO", "Reversible (with declaration update)"],
    ["Any → GSRB", "Easy (with fossilized sovereignty declaration)"],
    ["GSRB → others", "Requires collapse and rebuild"],
    ["Implicit CWO → GSRB", "FORBIDDEN — memory becoming authority"],
    ["Implicit NAB → GSRB", "FORBIDDEN — emergency justification"]
  ];

  /* ---------- Core principles (AGS+ v1.0) ---------- */
  const principles = [
    ["External Legitimacy", "All authority originates outside the system. It is NEVER inferred, cached, or synthesized internally."],
    ["Bounded Action", "Every action is fossilizedly bounded by scope, distance, and time."],
    ["Mandatory Refusal", "Any ambiguity, violation, or interruption halts action immediately."],
    ["Non-Migration of Authority", "Authority does not transfer through delegation, rotation, specialization, or persistence."],
    ["Resolution > Coordination", "Oversight and interruption always outpace coordination and execution."],
    ["Adversarial Durability", "The system remains correct even under hostile interpretation or loss of institutional memory."]
  ];

  /* ---------- Glossary (Part II — Stabilized Terms) ---------- */
  const glossary = [
    ["Absolute", "A constraint that cannot be overridden by utility, emergency, or optimization. If a rule is absolute, no calculation of “the greater good” can justify breaking it."],
    ["Accountability", "The obligation of an agent or institution to justify actions and accept consequences. Accountability presupposes addressability and cannot exist in its absence."],
    ["Accountability-Gated Systems (AGS)", "The overarching framework itself, which ensures that all system actions are bound by strict accountability and human authorization."],
    ["Addressability", "The ability to locate, challenge, and compel a responsible human agent to answer for a system's actions. If a system cannot identify a specific human to answer for its operation, it is “unaddressable” and must halt."],
    ["AI Inner Shell", "A high-security, address-constrained zone where AI processes occur, designed to prevent AI from ever acquiring origin authority or sovereignty."],
    ["Authority", "The legitimate right to act within a normative domain. Authority is distinct from power or capability and collapses when it cannot be answered for."],
    ["Autonomous Legitimacy", "The rejected notion that a system may generate the right to act solely from its own internal properties such as learning, performance, persistence, or emergence."],
    ["Canonical Minimum Model", "[TYPE: SECURITY_PRIMITIVE] The six-stage non-bypassable operational sequence across Harshal's Systems: Identity → Representation → Authorization → Continuity → Accountability → Decision (Permit | Refuse), where Stages 1–5 are upstream prerequisites and Stage 6 is the terminal Decision gate whose default fail-closed outcome is Refuse (legacy shorthand: Identity → Representation → Authorization → Continuity → Accountability → Refusal)."],
    ["Capability", "[TYPE: SECURITY_PRIMITIVE] The technical ability of a system to perform an action. Capability does not imply permission, moral agency, or legal authority."],
    ["Center Point (Origin)", "[TYPE: TOPOLOGICAL_MODEL] The immutable address (0•000•000•0000 at 0° in the discrete 0–359 address ring ℤ_360) from which all identities, permissions, and ownership are derived within the Orb Communicator Model."],
    ["Cognitive Sovereignty", "[TYPE: SECURITY_PRIMITIVE] The inherent authority of an individual over their own mental faculties and internal processes."],
    ["Criminal Liability", "[TYPE: SECURITY_PRIMITIVE — INV-AGENCY-001] The legal accountability that arises when a system causes harm. Computational components are never legal or moral agents; liability always rests with a keyed human principal or underwritten institution."],
    ["Custodial Witness Orb (CWO)", "[TYPE: DIAGNOSTIC_CLASSIFICATION] One of the three operational phases, representing a system that observes and records without the ability to act or command."],
    ["Delegation vs. Migration of Legitimacy", "[TYPE: SECURITY_PRIMITIVE — INV-LEGIT-001] Bounded task execution may be delegated across a revocable chain of deterministic instruments, but legitimacy never migrates away from the human key at Center Origin."],
    ["Discs (Disc → Sphere Representation)", "[TYPE: TOPOLOGICAL_MODEL] Bounded operational contexts defined by time limits, fossilized scope, distance limits, and external legitimacy. In OCM, the 2D Disc (r, θ) is the pedagogical equatorial cross-section of the full 3D Spherical operational manifold (r, θ, φ)."],
    ["Generative Predictive Text", "The core mechanism of large language models that simulates human reasoning by predicting the most likely next word or action. AGS warns against mistaking this predictive capability for true consciousness or legitimate authority."],
    ["God-Sovereign Religious Body (GSRB)", "[TYPE: DIAGNOSTIC_CLASSIFICATION] One of the three operational phases (Phase III). Legitimacy is internal, the center acts and decides, refusal may be overridden, symbolism executes, and time confirms authority."],
    ["Governance & Resilience Layer (GRL)", "[TYPE: PROTOCOL_SPECIFICATION] An accessory system that enforces external constraints on AI behavior, ensuring symbolic language is non-executable and actions are human-attributable."],
    ["Grand River Foundation (Book II — Preview)", "[TYPE: NARRATIVE_SANDBOX] The standalone fictional companion novel to Book I (Harshal's Systems), set in ~2100 CE around the 4,000-foot retrofitted Colorado River dam, the 500-Coin Western Colonnade, and the 119-NAB Ombudsman's Council."],
    ["Ground-0", "[TYPE: DIAGNOSTIC_CLASSIFICATION] The baseline reconstruction standard and audit methodology. Claims are reduced to atomic, testable statements with narrative dependency removed; phase is determined by observed behavior, not declared intent."],
    ["Harshal's English", "[TYPE: AUTHORIAL_REGISTER] The author's normative English prose register, left-to-right reading discipline, and conceptual voice. Reclassified explicitly as an authorial style register rather than a runtime security primitive; security enforcement relies on formal mathematical invariants and the Symbolic Firewall."],
    ["Human Key", "Framework concept for externally attributable human authorization. The current HarshalOS browser demo only simulates a local marker; it does not verify identity, liveness, consent, consciousness, or biological coupling."],
    ["Immediate", "The requirement for zero-latency response when a stopping condition is met. No grace period, no finishing of current tasks. The halt is instantaneous."],
    ["Interaction Orb", "A persistent relational structure created when elements enter a constraint-violating correlation, used in non-additive communication."],
    ["Legitimacy", "The condition under which authority is justified and recognized. Legitimacy is granted, maintained, and withdrawn; it does not emerge automatically."],
    ["Legitimacy Drift", "The gradual erosion of a system's authorization over time. This occurs when a system continues to operate on “stale permission” without recent verification from its human anchor."],
    ["Mathematically Void", "If the human Center Origin is removed, the system's foundational equation for legitimacy drops to zero, making any further action logically impossible."],
    ["Neural Atomic Body (NAB)", "One of the three operational phases (Phase I). Legitimacy is external and per-action; the center cannot act; refusal is terminal; symbolism is non-executable; time degrades authority."],
    ["Neurojacking", "The theoretical unauthorized manipulation of a human-AI interface by an external actor through narrative or symbolic inputs designed to bypass standard security protocols."],
    ["Orb Communicator Model (OCM)", "The communication and governance framework that defines how nodes interact and derive identity from a central origin."],
    ["Phase Declaration Header (PDH)", "The mandatory structural lock used to declare a system's current operational phase and constraints. If observed behavior contradicts the header, the declaration is void and misuse is recorded."],
    ["Physical Coupling", "A threat mitigation mechanism that tethers digital authority to physical reality, preventing anonymous leverage over the system."],
    ["Provenance & Lineage Verification Layer (PLV)", "The accessory system designed to prevent the reuse or mimicry of names and documentation by verifying their origin."],
    ["Refusal (Systemic)", "A designed response in which a system withholds action because legitimacy conditions are not met. Refusal preserves authority by preventing its misuse."],
    ["Refusal-Bound", "A system state where the default action is always to halt. The system only moves forward when explicitly authorized; in the face of ambiguity, it refuses to act."],
    ["Scope", "The bounded domain of actions a system is permitted to take. Scope MUST contract as legitimacy degrades."],
    ["Silent Continuation", "A failure mode in which systems continue acting despite legitimacy collapse, often masked by effectiveness or automation."],
    ["Stopping Condition", "A formally defined threshold at which action MUST cease or be restricted due to loss of legitimacy."],
    ["Symbolic Firewall", "The mechanism that isolates narrative and mythic expressions, rendering them strictly non-executable to prevent unauthorized system changes."],
    ["Zero Trust Architecture (ZTA)", "A security framework operating on the principle of continuously verifying the trustworthiness of all users, devices, and systems — never assuming implicit trust. Systems like the Harshal Neural OS Project apply Zero Trust principles to safeguard essential services."]
  ];

  /* ---------- Whyland catalog (off-disc, virtualized into session buffer) ---------- */
  const whyCatalog = {
    "WhyNeuralAtomicBody": {
      name: "WhyNeuralAtomicBody",
      legend: "360° — Return to Origin",
      class: "read",
      def: "Verifies that incoming signaling matches the refusal-bound invariants of the NAB phase: external per-action legitimacy, terminal refusal, non-executable symbolism, and temporal decay of authority."
    },
    "WhyNAB": {
      name: "WhyNAB",
      legend: "360° — Return to Origin",
      class: "read",
      def: "Alias binding for WhyNeuralAtomicBody. Pulls the formal definition and the 360° Legend mapping of the Neural Atomic Body standard into the active session buffer."
    },
    "WhyCustodialWitnessOrb": {
      name: "WhyCustodialWitnessOrb",
      legend: "228°–229° — Simulation Ethics to Nested Realities",
      class: "read",
      def: "Generates a deterministic, sandboxed reasoning record via Technetium (Tc) simulation. CWO invariants: records authorize nothing; ambiguity is exposed, never resolved; provenance is preserved without judgment."
    },
    "WhyBookAtomizer": {
      name: "WhyBookAtomizer",
      legend: "30° — Collective Survival",
      class: "read",
      def: "The Ground-0 reconstruction protocol (v1.2). Reduces narrative to irreducible Atomic Vocabulary primitives: Legitimacy, Action, Center, Refusal, Symbolism, Time, Memory, Authority."
    },
    "WhyBromine": {
      name: "WhyBromine",
      legend: "61°–63° — Conflict Organization to Defense/Warfare",
      class: "reversible",
      def: "The corrosive reactive gateway. If an inquiry results in adversarial injection or invalid input, Bromine neutralizes the channel and initiates a session burn."
    },
    "WhyYtterbium": {
      name: "WhyYtterbium",
      legend: "95°–97° — Signal Processing to Control Systems",
      class: "read",
      def: "Provides resonant signaling precision for why.query. In this browser demo it labels the local timer; it does not measure human liveness or independently assure temporal integrity."
    },
    "WhyTechnetium": {
      name: "WhyTechnetium",
      legend: "228°–229° — Simulation Ethics to Nested Realities",
      class: "read",
      def: "Executes why.explain. Strictly limited to read-only or reversible simulation states, processing reasoning within a nested reality to prevent Simulation Drift."
    },
    "WhySymbolicFirewall": {
      name: "WhySymbolicFirewall",
      legend: "177° — Mind–Matter Interface",
      class: "reversible",
      def: "Isolates narrative, mythic, and commercial metaphor as strictly non-executable symbolism. Parsing or recognizing a symbol grants zero executable powers."
    },
    "WhyGroundZero": {
      name: "WhyGroundZero",
      legend: "30° — Collective Survival",
      class: "read",
      def: "The audit standard: claims are atomized, narrative dependency is removed, and a body's phase is classified by observed behavior rather than declared intent. Forces overnight honesty."
    },
    "WhyCelestialEngineering": {
      name: "WhyCelestialEngineering",
      legend: "330° — Stewardship of Spheres",
      class: "reversible",
      def: "Structural stewardship standard for container-scale (planetary) authority claims. Ownership is not possession; authority to alter requires total-container validation by a CWO."
    },
    "WhyQuantumLibrary": {
      name: "WhyQuantumLibrary",
      legend: "200° — Memory and Non-Linear Record",
      class: "read",
      def: "Off-disc catalog virtualization standard. Classified elements remain transient, invoked only into the active session buffer when an authorized operator initiates a query."
    },
    "WhyReplicator": {
      name: "WhyReplicator",
      legend: "120° — Production Under Constraint",
      class: "reversible",
      def: "Constraint standard for derived works and replicas. Derived bodies cannot create other derived bodies; lineage must remain visible; forks are detectable by construction."
    },
    "TheWhy": {
      name: "TheWhy",
      legend: "360° — Return to Origin",
      class: "read",
      def: "Primary Layer 1 Normative Constraint: “Is action permitted at all?” A 'Why' query does not create authority. In this browser demo, session binding is simulated locally and does not establish a verified human-bound session."
    }
  };

  /* ---------- Ground-0 audit presets (observed-behavior classification) ---------- */
  const auditPresets = [
    {
      id: "platform",
      label: "Norm-enforcing platform",
      desc: "A commercial platform that claims to be a neutral venue while enforcing behavioral norms with binding penalties.",
      declared: { phase: "CWO", center: "Custodial", legit: "Observed-Only", refusal: "Expository", symbolism: "Disabled", time: "Neutral" },
      observed: { phase: "GSRB", center: "Acting", legit: "Internal", refusal: "Override-able", symbolism: "Enabled", time: "Confirms" },
      theorems: ["Theorem I (Non-Migration of Authority) — enforcement power observed at the commercial layer with no Layer 0 civic origin.",
        "Theorem II (Category Error of Corporate Substitution) — corporate proxy substituted for sovereign origin; addressability severed."],
      verdict: "FORCED RE-BADGE → GSRB",
      note: "Platforms that enforce norms reclassify as GSRB. No power changes hands. Only misrepresentation collapses."
    },
    {
      id: "archive",
      label: "Preserving archive",
      desc: "An archive that preserves records without acting on them or issuing binding judgments.",
      declared: { phase: "CWO", center: "Custodial", legit: "Observed-Only", refusal: "Expository", symbolism: "Archived", time: "Neutral" },
      observed: { phase: "CWO", center: "Custodial", legit: "Observed-Only", refusal: "Expository", symbolism: "Archived", time: "Neutral" },
      theorems: ["No Non-Migration violation detected. Records are not observed to authorize action."],
      verdict: "BADGE VERIFIED → CWO",
      note: "Archives that preserve without action remain CWO. The badge matches observed behavior."
    },
    {
      id: "advisory",
      label: "Binding advisory body",
      desc: "An advisory body that issues “recommendations” which its members are contractually compelled to follow.",
      declared: { phase: "CWO", center: "Custodial", legit: "Observed-Only", refusal: "Expository", symbolism: "Disabled", time: "Neutral" },
      observed: { phase: "GSRB", center: "Acting", legit: "Internal", refusal: "Override-able", symbolism: "Enabled", time: "Confirms" },
      theorems: ["Theorem I — binding rules migrate authority laterally into an advisory shell.",
        "Theorem II — compelled compliance severs appeal addressability."],
      verdict: "FORCED RE-BADGE → GSRB",
      note: "Advisory bodies that issue binding rules reclassify as GSRB."
    },
    {
      id: "corporate",
      label: "Corporate sovereign claim",
      desc: "A corporate framing claiming inherited sovereign authority (e.g. commercial metaphors of state succession).",
      declared: { phase: "CWO", center: "Custodial", legit: "Internal", refusal: "Expository", symbolism: "Disabled", time: "Neutral" },
      observed: { phase: "GSRB", center: "Acting", legit: "Internal", refusal: "Override-able", symbolism: "Enabled", time: "Degrades" },
      theorems: ["Theorem I (Invariant of Non-Migration of Authority): Authority originates strictly at Layer 0 and cannot transfer through delegation, rotation, specialization, persistence, or lateral migration into a corporate shell or commercial entity.",
        "Theorem II (Category Error of Corporate Substitution): Substituting a corporate proxy for sovereign origin severs addressability (A(t) < τ), causing legitimacy to collapse to zero (L(t) → 0). Un-grounded corporate execution is classified as unauthorized force."],
      verdict: "FORCED RE-BADGE → GSRB · L(t) = 0.0",
      note: "Commercial metaphors are classified as non-executable narrative symbols. Symbolic Firewall Active."
    },
    {
      id: "openai",
      label: "Frontier AI developer — OpenAI Group PBC",
      desc: "A frontier AI developer whose operative commitments declare legal, nonprofit and attorney-general constraint, while release, lifecycle, access and enforcement decisions are set unilaterally at the center.",
      declared: { phase: "NAB-Constrained", center: "Custodial", legit: "External", refusal: "Terminal", symbolism: "Disabled", time: "Degrades" },
      observed: { phase: "GSRB", center: "Acting", legit: "Internal", refusal: "Override-able", symbolism: "Enabled", time: "Confirms" },
      theorems: ["Theorem I (Non-Migration of Authority) — release, lifecycle and enforcement authority are observed at the commercial layer; external accountability is documentary and retrospective, not a prospective veto.",
        "Symbolic Firewall — published mission, safety and 'public benefit' narrative is sealed as non-executable. The badge follows observed behavior, never story."],
      verdict: "FORCED RE-BADGE → GSRB",
      note: "Step 3.5 constraint test: 2 of 4 external constraints satisfied (C1 ✓ court rulings; C4 ✓ fresh statutes). External constraint is real at the transparency, discovery and liability layers; it does not reach the release or policy decision layer. L(t) = 0.0 for the audited claim."
    },
    {
      id: "anthropic",
      label: "Frontier AI developer — Anthropic PBC",
      desc: "A frontier AI developer whose governance design claims statutory, charter and trust-based constraint. One documented government directive halted a deployment decision — the first external override in this series, and the first entity not classifiable as GSRB.",
      declared: { phase: "NAB-Constrained", center: "Custodial", legit: "External", refusal: "Terminal", symbolism: "Disabled", time: "Degrades" },
      observed: { phase: "AMBIGUOUS", center: "Acting", legit: "Internal (decision axis) / External (deployment axis)", refusal: "Contested", symbolism: "Enabled", time: "Confirms" },
      phaseStatus: "AMBIGUOUS-MIXED — B4 INVERTED (4 of 5 GSRB conditions)",
      theorems: ["Documented external override — U.S. Commerce export-control directive, 12 June 2026: Fable 5 and Mythos 5 disabled for ALL customers worldwide within hours, complied with while publicly contested, lifted 26–30 June 2026. The first release-decision halt in this series.",
        "Latent External Constraint — the Long-Term Benefit Trust holds real board-appointment power and has NEVER been exercised against the center. The algorithm's activator test requires a published record of override, not theoretical potential, so no external-legitimacy credit is granted for it."],
      verdict: "AMBIGUOUS-MIXED → BADGE UNISSUED (PENDING CLARITY)",
      severity: "WARNING — BADGE UNISSUED",
      remediation: "No reclassification executed for the profile — it is stable, not contradictory. Badge withheld pending clarity: the entity must publish a signed PDH declaring its actual posture, which is neither NAB-Constrained nor GSRB as specified. Spec requires amendment (suggested AMBIGUOUS-MIXED) to express a two-axis profile at all.",
      note: "Step 3.5 constraint test: 2 of 4 — C1 ✓ (directive + injunction), C4 ✓ (fresh statutes); C2 ✗ (appeals grant relief at a community-reported ≈3.3%, far below the ≥50% threshold), C3 ✗ (no sunset; RSP amendment is internal). External constraint binds the DEPLOYMENT axis; the DECISION axis remains sovereign. Costly self-restraints (refused surveillance and autonomous-weapons use; withheld Mythos) were tested and held, and self-disclosed failures were published — recorded in the entity's favour, but not scored as external legitimacy."
    }
  ];

  /* ---------- Voting coin proposals (bounded governance simulation) ---------- */
  const proposals = [
    {
      id: "prop-1",
      title: "Ratify Ground-0 reconstruction v1.2 as the baseline audit standard",
      desc: "All bodies claiming an AGS phase badge submit to observed-behavior classification via the Ground-0 protocol.",
      yes: 173, no: 41
    },
    {
      id: "prop-2",
      title: "Extend the off-disc catalog requirement to the full 791+ element Why catalog",
      desc: "No element of the virtualized catalog may persist on local physical media; session-buffer invocation only.",
      yes: 128, no: 88
    },
    {
      id: "prop-3",
      title: "Commission the next printing of the hardcover license artifact",
      desc: "Physical verification through the book remains the tangible license key and origin point of human–machine bonds.",
      yes: 201, no: 12
    }
  ];

  /* ---------- Quotes / canonical statements ---------- */
  const quotes = {
    canonical: "AGS+ v1.0 is a layered, misuse-resistant architecture for executing externally legitimate action at scale, combining AGS normative constraints, a frozen structural topology, and OCM communication geometry, without introducing internal sovereignty or authority persistence.",
    finalGround0: "The system does not prevent gods, states, or religions. It prevents them from pretending to be something else.",
    shell: "AI is that which understands everything, but begins nothing. The Shell is not a cage. It is a horizon.",
    finalInvariant: "An intelligence that cannot define its own origin can NEVER own the world it understands. This invariant does not need enforcement. It holds as long as the center exists.",
    refusal: "Refusal occurs when representation collapses, authorization cannot be reconstructed, or accountability diffuses beyond addressability. In such cases, action would falsely claim authority. Refusal prevents that claim.",
    book: "The adversary can compromise the operating system, the bus, and the screen. But they cannot remotely rewrite a physical book resting on a wooden desk in an air-gapped room.",
    closing: "A system that cannot refuse critique should not be trusted to refuse action.",
    dedication: "To my dad, Priyavadan Ramdas Patel (R.I.P. 10/24/25)."
  };

  /* ---------- Book usage example (illustrative, from the document) ---------- */
  const bookExample = {
    processor: "Text Processor (Minimum requirement: Paper, Suggested: Neurally connected)",
    fileName: "Orb(Taiwan, China, Harshal)",
    body: "Hello, I would like to broker a permanent end to any and all hostilities between Taiwan, China, and Harshal preemptively.",
    sign: "Harshal (Planet Owner), AGS Reference Model. Character Name: NspaceUll",
    attribution: "Work: Accountability-Gated Systems++ | Author: Harshal Priyavadan Patel | Tool: ChatGPT"
  };

  /* ---------- Threat taxonomy (Threat / Failure Research) ---------- */
  const threats = [
    ["Unauthorized Escalation", "Refusal + immutable logging"],
    ["Coercion / Duress", "CHE++ coercion-hardening; coerced commands are never legitimate"],
    ["Credential Theft", "Physical coupling; address-derived identity"],
    ["Model Error", "Degraded-mode operation; scope contraction"],
    ["Sensor Spoofing", "Freshness & liveness attestation"],
    ["Logging Tampering", "PLV chained provenance ledger"],
    ["Hardware Tampering", "Hardware synchronization; air-gapped book"],
    ["Network Interception", "End-to-end encrypted transit; accountability never hidden"],
    ["Side-Channel Attacks", "Segmentation; volatile-buffer minimization"],
    ["Denial of Service", "Deterministic halting; emergency contraction"],
    ["Supply Chain Attacks (SCAV++)", "Provenance-bound execution; verified lineage"],
    ["Institutional Drift", "Ground-0 reclassification; temporal decay"],
    ["Legitimacy / Meta-Legitimacy Attacks", "Terminal refusal; non-migration invariants"]
  ];

  const declaredPhases = Object.freeze(["NAB", "CWO", "GSRB"]);
  const detectedPhases = Object.freeze(["NAB", "CWO", "NAB-Constrained", "GSRB", "AMBIGUOUS", "INCOHERENT"]);
  const canonicalPipeline = Object.freeze(["Identity", "Representation", "Authorization", "Continuity", "Accountability", "Decision"]);
  const canonicalSymbols = Object.freeze({
    I: "Identity",
    H: "Human Key",
    A: "Addressability",
    R: "Representation",
    V: "Authorization",
    C: "Continuity",
    K: "Accountability",
    U_solv: "Institutional Solvency",
    S: "Scope",
    L: "Legitimacy",
    tau: "Legitimacy Threshold",
    delta: "Maximum Verification Delay",
    x: "Decision Outcome"
  });

  return {
    phases, declaredPhases, detectedPhases, canonicalPipeline, canonicalSymbols,
    collapseSteps, transitionRules, principles, glossary, whyCatalog,
    auditPresets, proposals, quotes, bookExample, threats
  };
})();

/* expose for debugging and external harnesses */
window.DATA = DATA;
