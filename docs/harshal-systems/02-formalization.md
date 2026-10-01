# Part II — Formalization

> Formal constraint sketches, the gating equations, and the stabilized glossary of terms used consistently throughout the rest of the manual.

**Source range:** lines 575–785 of the Owner’s Working Draft · **Words:** 2,586

---

This work is intentionally incomplete, offering no final doctrine and no universal closure. Any system addressing authority, responsibility, and ethics must avoid premature resolution. Authority without accountable representation is strictly prohibited. When representation collapses, responsibility diffuses, or authority persists without answerability, you must mark continuation as ethically suspect and initiate a halt. Stopping is not failure; stopping is signal. You must not encode full ethics into machines, nor automate moral agency, nor claim that complexity or emergence justifies authority. Accountability requires human addressability at all times. Therefore, operational frameworks must remain mutable; arguments will evolve, terms will sharpen, and examples will shift. This revision is not weakness, but compliance with accountability. Systems must self-monitor for legitimacy, and if that legitimacy is lost, they must halt. A refusal to act is fidelity, not abdication. Ultimately, intelligence is defined as a system that halts upon the loss of legitimacy, for persistence without accountability is failure. Systems that know how to stop demonstrate superior intelligence.
Formal Appendix: Equations and Glossary
This appendix accompanies Accountability-Gated Systems and is intended as a reference document rather than a narrative chapter. It formalizes constraints introduced in the main text and stabilizes terminology without claiming completeness. All definitions and relations remain provisional and subject to revision.
Part I - Formal Constraint Sketches
A.1 PURPOSE AND SCOPE
The equations presented here do not encode ethics, values, or moral reasoning. They encode conditions of permission. Their sole purpose is to express when a system is allowed to act at all, independent of how well it could perform the action. These relations are intentionally minimal. They are not optimization targets, loss functions, or utility models.
A.2 CORE VARIABLES
Let the following symbols denote structural properties of a system at time t:
- H(t) - The Human Key: A binary state representing verifiable, conscious human intent (1 = present, 0 = absent).
- A(t) - Addressability: The degree to which a responsible human agent can be located and compelled to answer.
- R(t) - Representation Integrity: The validity of delegation chains linking system action to an authorized representative.
- S(t) - Scope: The domain of actions the system is permitted to take.
- L(t) - Legitimacy: A derived permission state, dependent on the Human Key, addressability, representation, and scope.
A.3 LEGITIMACY AS A GATING FUNCTION
Legitimacy is treated as a precondition, not an outcome. It is mathematically gated by the Human Key.
L(t) = H(t) × f(A(t), R(t), S(t))
Note: If H(t) = 0, the system is Mathematically Void. Legitimacy immediately drops to zero, regardless of Addressability or Representation.
A.4 ACTION PERMISSION CONDITION (REFUSAL-BOUND) The default state of the system is refusal. Action is only permitted as a temporary, highly constrained exception.
{ Permitted   if L(t) >= tau
x(t) = {
   { Refusal   if L(t) < tau
Note: The threshold tau is an Absolute constraint. No utility function, emergency parameter, or optimization target may redefine or lower it.
A.5 TEMPORAL DECAY AND SCOPE REDUCTION
Addressability and representation are time-sensitive. As time passes since the last verification (Δt), the permitted scope S(t) automatically contracts.
S(t) = Smax × max(0,1 - Δt/δ)
Where δ is the maximum acceptable delay. If Δt >= δ, the transition of L(t) ￫ 0 is Immediate (zero-latency), triggering an instantaneous halt.
A.6 PRECEDENCE RULE
No optimization objective may override a violated stopping condition. Formally:
For all objectives O(i): if L(t) < tau, then argmax(O(i)) is undefined
This rule ensures legitimacy cannot be traded for performance.

Part II — Glossary (Stabilized Terms)

100% Hardened & Production-Ready
A state of complete operational readiness where the system is fully isolated (partitioned) from unauthorized inputs, resilient (hardened) against external attacks or internal drift, and stable enough for real-world, high-stakes deployment.

Absolute
A constraint that cannot be overridden by utility, emergency, or optimization. If a rule is absolute, no calculation of "the greater good" can justify breaking it.

Accountability
The obligation of an agent or institution to justify actions and accept consequences. Accountability presupposes addressability and cannot exist in its absence.

Accountability-Gated Systems (AGS)
The overarching framework itself, which ensures that all system actions are bound by strict accountability and human authorization.

Addressability
The condition under which authority can be located, confronted, and made to answer by those subject to its effects. Authority without addressability is illegitimate in practice. Or in other words, the ability to locate, challenge, and compel a responsible human agent to answer for a system's actions. If a system cannot identify a specific human to answer for its operation, it is "unaddressable" and must halt.

Advanced Threat Detection
A cybersecurity approach that leverages artificial intelligence (AI) and machine learning to identify and respond to threats in real time, enabling proactive defense against complex and decentralized attack chains.

AI Inner Shell
A high-security, address-constrained zone where AI processes occur, designed to prevent AI from ever acquiring origin authority or sovereignty.

Antivirus and Anti-Malware Software
Programs designed to detect, prevent, and remove malicious software, including viruses, worms, trojans, and spyware. These tools provide real-time protection and system scans to safeguard computers and networks from security threats.

Authority
The legitimate right to act within a normative domain. Authority is distinct from power or capability and collapses when it cannot be answered for.

Autonomous Legitimacy
The rejected notion that a system may generate the right to act solely from its own internal properties such as learning, performance, persistence, or emergence.

Behavioral Analysis
A cybersecurity technique that monitors and evaluates device activities to identify unusual patterns or deviations from normal behavior. These deviations may indicate that a device has been compromised. Even a single misplaced bit or byte can lead to severe vulnerabilities.

Capability
The technical ability of a system to perform an action. Capability does not imply permission.

Center Point (Origin)
The immutable address from which all identities, permissions, and ownership are derived within the Orb Communicator Model.


Cloud
External, distributed computational infrastructure. In a post-alignment framework, reliance on the cloud introduces "Addressability" risks, as the physical location of the processing may be separated from the human "Center Origin."

Cognitive Sovereignty
The inherent authority of an individual over their own mental faculties and internal processes.

Company-Issued Devices
Hardware such as laptops or desktops provided by the company for employee use. These devices are pre-configured with the organization’s security settings, software, and policies to ensure compliance and protect company data.

Criminal Liability
The legal accountability that arises when a system causes harm. The framework insists that liability must always rest with a human or institution, explicitly rejecting the idea that an AI can be held legally or morally responsible for its actions.

Custodial Witness Orb (CWO)
One of the three operational phases, representing a system that observes and records without the ability to act or command.

Decentralized Attack Coordination
A method used in cyberattacks where compromised devices or systems operate without a central command server, making the attack harder to detect and disrupt. In this model, each compromised device can communicate and coordinate with others, often forming a peer-to-peer network. This approach increases the attack’s resilience and reduces the risk of a single point of failure. For example, if a network like the Bitcoin blockchain were hijacked in such a manner, the combined processing power could be misused for malicious purposes once a critical mass is reached.

Delegation
A revocable grant of authority allowing an agent or system to act on behalf of others. Delegation is bounded by scope, time, and answerability.

Discs
Bounded operational contexts used within the structural model, defined by time limits, scope, and external legitimacy.

Encryption
The process of converting data into a coded format to prevent unauthorized access. Devices should employ full-disk encryption to safeguard data stored on the device (data at rest).

Generative Predictive Text
The core mechanism of large language models that simulates human reasoning by predicting the most likely next word or action. The AGS framework warns against mistaking this predictive capability for true consciousness or legitimate authority.

God-Sovereign Religious Body (GSRB)
One of the three operational phases (Phase III). A system in this phase treats its legitimacy as internal, acts and decides from its own center, allows refusal to be overridden, lets symbolism execute, and treats time as confirming its authority. It must declare its sovereignty, accept responsibility for enforcement, and acknowledge the loss of misuse resistance.

Governance & Resilience Layer (GRL)
An accessory system that enforces external constraints on AI behavior, ensuring symbolic language is non-executable and actions are human-attributable.

Ground-0
The baseline reconstruction standard and audit methodology of Harshal's Systems. Claims are reduced to atomic, testable statements with narrative dependency removed, and a system's phase is determined by its observed behavior rather than its declared intent.

Hardware Synchronization
The alignment of physical infrastructure with logical system commands to ensure operational boundaries are physically enforced.

Harshal's English
The specific linguistic syntax required for interpreting the system's logic and preventing "neurojacking."

Human Key
The verifiable, conscious intent of the human host or operator. This is the only valid authorization for a system to transition from a passive state to an active one.

Immediate
The requirement for zero-latency response when a stopping condition is met. There is no "grace period," no finishing of current tasks, and no waiting for a better moment to pause. The halt is instantaneous.

Intellectual Property
The legal and moral right to the creations of one’s own mind.

Interaction Orb
A persistent relational structure created when elements enter a constraint-violating correlation, used in non-additive communication.

Internet of Things (IoT) Devices
IoT devices are network-connected objects, such as smart TVs, thermostats, lightbulbs, streaming devices (e.g., Roku, Google Chromecast, Apple TV), and other smart electronics. These devices often have lower built-in security and can serve as potential entry points for attackers. Vulnerabilities may exist in the devices themselves, their HDMI ports, or in the data streams they interact with. Compromised servers can inject decentralized attack vectors into normal content, turning everyday devices into critical points of exposure within a network.

Legitimacy
The condition under which authority is justified and recognized. Legitimacy is granted, maintained, and withdrawn; it does not emerge automatically.

Legitimacy Drift
The gradual erosion of a system's authorization over time. This occurs when a system continues to operate on "stale permission" without recent verification from its human anchor.

Mathematically Void
A condition where the operational logic of a system becomes entirely invalid. In the AGS framework, if the human "Center Origin" is removed, the system does not just become less effective; its foundational equation for legitimacy drops to zero, making any further action logically impossible.

Neural Atomic Body (NAB)
One of the three operational phases (Phase I). A system in this phase takes its legitimacy from outside itself and per action, cannot act from its own center, treats refusal as terminal, keeps symbolic content non-executable, and lets authority degrade over time.
Neurojacking
The theoretical unauthorized manipulation of a human-AI interface by an external actor, often through the use of narrative or symbolic inputs designed to bypass standard security protocols.

Orb Communicator Model (OCM)
The communication and governance framework that defines how nodes interact and derive identity from a central origin.

Phase Declaration Header (PDH)
The mandatory structural lock used to declare a system's current operational phase and constraints.

Phase Field
Bounded environment where authorized intelligence operates under constraints.

Physical Coupling
A threat mitigation mechanism that tethers digital authority to physical reality, preventing anonymous leverage over the system.

Physical Security Measures
Policies, procedures, and controls implemented to protect physical environments and assets from unauthorized access, tampering, or the introduction of compromised devices. These measures include securing entry points, restricting device access, and maintaining an approved and thoroughly tested list of hardware to ensure only trusted equipment enters secure areas. By mitigating risks associated with sourcing components from regions with less stringent security protocols, physical security measures help prevent potential attack vectors, such as compromised devices being introduced into sensitive environments.

Provenance & Lineage Verification Layer (PLV)
The accessory system designed to prevent the reuse or mimicry of names and documentation by verifying their origin.

Refusal (Systemic)
A designed response in which a system withholds action because legitimacy conditions are not met. Refusal preserves authority by preventing its misuse. See Refusal-Bound, the system state.
Refusal-Bound
A system state where the default action is always to halt. The system only moves forward when explicitly authorized; in the face of ambiguity, it "refuses" to act. See Refusal (Systemic), the enacted response.

Regular Updates
The practice of promptly updating all software and firmware to the latest versions to maintain security and reduce the risk of vulnerabilities.

Representation
A mechanism for scaling action while preserving accountability, achieved by acting through identifiable, answerable agents.

Scope
The bounded domain of actions a system is permitted to take. Scope MUST contract as legitimacy degrades.

Segmentation
Segmentation is the practice of dividing a network into isolated sections or layers to limit the spread of attacks and contain compromised devices. By creating multiple layers of segmented networks, attackers are forced to navigate through many barriers, each acting as a separate checkpoint. This layered approach, similar to stacking multiple chessboards or nodes, makes it increasingly difficult for an intruder to find and access valuable assets. Effective segmentation ensures that even if one section is compromised, the attack is confined and sensitive data remains protected.

Server-Side Security Measures
Server-side security measures are protective actions and protocols implemented on the server to safeguard data, applications, and services from unauthorized access, attacks, and breaches. These measures include activities such as input validation, encrypted communication, authentication and authorization systems, intrusion detection, and regular patching or updates. By controlling access and monitoring activity at the server level, these measures help prevent malicious exploits and ensure the integrity and availability of back-end systems.

Service Provider
The corporate or institutional entity that maintains the infrastructure. Under the principle of "Accountability," the provider must remain legally addressable and cannot hide behind the complexity of the technology to evade responsibility.

Silent Continuation
A failure mode in which systems continue acting despite legitimacy collapse, often masked by effectiveness or automation.

Stopping Condition
A formally defined threshold at which action MUST cease or be restricted due to loss of legitimacy.

Supply Chain Attack Vector++ (SCAV++)
A comprehensive model designed for identifying and mitigating vulnerabilities within complex operational supply chains.

Supply Chain Vulnerabilities
Weaknesses or security gaps within the process of sourcing, manufacturing, and delivering components, where compromised parts can be introduced at any stage. These vulnerabilities can lead to cascading and potentially catastrophic impacts, especially in critical applications such as nuclear reactors or power grids, if not properly mitigated with stringent security protocols.

Symbolic Firewall
The mechanism that isolates narrative and mythic expressions, rendering them strictly non-executable to prevent unauthorized system changes.

Systemic Protections
The necessary safeguards established to prevent the exploitation and subjugation of human labor.

Zero Trust Architecture (ZTA)
Zero Trust Architecture is a security framework that operates on the principle of continuously verifying the trustworthiness of all users, devices, and systems—never assuming implicit trust. This approach extends beyond simply authenticating devices and users, encompassing organizational infrastructure and operations to ensure comprehensive protection. In the context of critical infrastructure, such as energy grids, ZTA mitigates risks where malicious actors or compromised management could exploit systems over time. By enforcing continuous verification and strict access controls, ZTA reduces the likelihood of successful attacks, even if insiders or sophisticated external threats attempt to manipulate or weaponize resources. Systems like the Harshal Neural OS Project apply Zero Trust principles to safeguard essential services and national assets while supporting large-scale domestic energy operations.


______________________________________________________________________
