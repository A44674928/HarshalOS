from pathlib import Path
p=Path('/home/user/HARSHAL-SYSTEMS-Book-I-EDITED-2026-10-06.txt')
s=p.read_text(encoding='utf-8')
start='Part XXI — MicroConvergence and Signal Encoding'
end='Part XXII — Supporting Policy & Governance Research Archive'
a=s.index(start); b=s.index(end,a)
part=s[a:b]

def replace_once(old,new,label):
    global part
    n=part.count(old)
    if n!=1: raise ValueError(f'{label}: expected one match, got {n}')
    part=part.replace(old,new,1)

replace_once(
'MicroConvergence describes a proposed model in which two or more autonomous agents or systems — all operating their own local convergence process — arrive at a shared consensus state without direct human-to-human negotiation. The specification covers three distinct layers:',
'MicroConvergence (MC) is a proposed model for comparing state records from two or more software components under a predeclared rule. A matching result is a protocol-level compatibility record, not human consensus, evidence of truth, or authority. This draft distinguishes three layers:',
'MC abstract')

# Replace the residual section that conflated environmental cues, machine records, and human perception.
block_start=part.index('4. Consensus Protocol')
block_end=part.index('6. Mythic Compression Layer',block_start)
new_block='''4. Consensus Protocol
4.1 Requirements for a Recorded Compatibility Event
“Consensus Event” is a retained draft label. In this section it means only that two named software endpoints produced records that satisfy a predeclared compatibility rule; it does not mean human consensus, consent, truth, or authorization.
A reproducible event record should identify:
1. The endpoint identifiers and key/enrollment policy used; possession of a key proves only the tested cryptographic property.
2. The schema and rule version, event identifier, timestamp/time basis, declared input fields, and freshness/integrity results.
3. Each endpoint’s signed categorical state and the comparator’s output. Missing, stale, invalid, or conflicting inputs produce INCOMPLETE or HOLD, not a presumed match.
4. The source and access basis for each field, with privacy and retention controls. Private data need not be disclosed merely to create a compatibility record.
A label such as PROCEED, HOLD, or ABORT is a software output under that profile. It is not a command, permission, or proof that the underlying judgment is correct.

4.2 Example: Application Scenario
Consider a fictional application to Organization B. MC-A may record the applicant-side status under its declared inputs; MC-B may independently record a status from information it is authorized to process. A compatibility event is recorded only if the named endpoints exchange authenticated, schema-valid, sufficiently fresh records and both satisfy the same predeclared comparison rule.
Portal timing, silence, rejection, or other environmental behavior is not a message from MC-B and cannot substitute for its authenticated state. A user interface may display a local status record, but the display does not prove that Organization B evaluated the application, predict an outcome, or establish agreement by either person.
Confirmation-bias note: A person may notice patterns between an application and unrelated events. This draft does not classify the person’s observation as false; it says only that an unauthenticated observation is not a machine-to-machine protocol record.

4.3 Trust, Authentication, and Evidence Limits
The word “valid” here refers only to conformance with a specified record schema and tested verification steps. A verified signature can show that a particular key signed particular bytes under the assumed key-management process; it does not by itself prove the signer’s real-world identity, authority, intent, or the truth of the signed statement.
1. Endpoint authentication: A deployment may verify key possession and a declared enrollment binding. The strength and provenance of that binding must be separately documented.
2. Channel and record integrity: Tests may establish selected properties such as message integrity, replay handling, or transport authentication for a named configuration. They do not guarantee delivery, exclude every failure, or prove what a person perceived.
3. Evidence path: Counterparty key → signed message → validated channel record → local software record → optional user-interface delivery event. Each arrow has a separate test and scope. Delivery telemetry is not evidence of conscious perception, understanding, consent, or agreement.

##### Why an Unmediated Sensory Cue Is Not Protocol Evidence
A subjective experience may be sincerely reported and important to the person reporting it. Without a specified, authenticated channel and record, however, the protocol cannot attribute that experience to a particular software endpoint or message. This limitation does not imply that human communication is generally unreliable, nor does it establish that an experience is false.
1. Source attribution: An unaided impression does not carry a source key or authenticated endpoint record. Its origin is unverified for this protocol, not disproved.
2. Channel integrity: No validated message record links the experience to a particular endpoint, time, or schema. A separately authorized capture could record that a person made a report; it would not certify the report’s cause or truth.
3. Evidence boundary: The system may preserve an explicitly labeled user report under an approved privacy policy. It must not silently convert the report into a counterparty message or a machine consensus event.

##### Scope Implication
A machine-level Compatibility Event is recorded only when the named endpoints produce the required records and the comparator returns a defined result. If those records are absent, stale, or invalid, the protocol result is NOT_ESTABLISHED or INCOMPLETE. A person’s separate report remains a report and cannot itself create, authorize, or veto an action.

5. The Interpretive Layer — User-Interface Relay
5.1 Displaying a Recorded Result
A user interface may present a software record as text, sound, or another accessible display. The display is separate from the machine-to-machine exchange and is not proof that a person perceived or accepted the information.
The illustrative flow is:
MC-B ──[authenticated record]──► MC-A ──[optional UI display]──► Operator A
The Operator is not a participant in the machine-to-machine event shown here, but may review the record and make a separate decision. The draft does not establish a neural interface or a channel that controls perception.

5.2 Signal Types
The draft labels are PROCEED, HOLD, and ABORT. A record should also identify the source key, channel, schema and policy version, event time, freshness result, and any missing or conflicting fields. These are categorical software outputs, not probabilities, predictions, human agreements, or permissions.

5.3 Example: Application Scenario Under a Display Model
This is a fictional scenario, not a claim that DeepMind, Organization B, or another organization sent a message or evaluated an application. Suppose two tested software endpoints exchange authenticated records and a predeclared rule returns ABORT. A user interface could display that record and its source. The display would not prove that an employer reviewed the application, predict an outcome, or establish that the Operator saw or understood it. The person retains the decision; any external action requires separate authorization.

5.4 Record Boundary: Message, Display, and Perception
Without the specified, validated exchange record, no MC-to-MC event is established; environmental or subjective observations remain separate evidence with their own provenance. With a tested implementation, records may support only the properties actually tested—for example, that a named key signed a particular status and that a configured channel recorded it. They do not prove that the status is true, that the counterparty had authority, or that a person perceived the display.

5.5 Constraints
1. A protocol event requires current records from the named endpoints under an active session. If either record is absent or fails the declared checks, return NOT_ESTABLISHED or HOLD.
2. Assign each exchange a unique event identifier and timestamp. Re-display of an old record is not a new exchange; show stale or duplicate status when applicable.
3. Relay does not override the Operator. The display is informational. The Operator retains decision authority, and any side effect requires its own current, action-specific authorization.

'''
part=part[:block_start]+new_block+part[block_end:]
replace_once('On applying anyway: The Operator stated they would apply to DeepMind regardless of the ABORT relay. This is consistent with §5.5 Constraint 3: the relay is informational, not an override. The Operator retains full decision authority.',
             'On applying anyway: The fictional Operator may proceed despite a displayed ABORT label. This illustrates that the label is informational, not an override or authorization.', 'MC operator note')
replace_once('On "med-kitted out": The Operator disclosed being under medical care. This specification takes no position on the Operator\'s medical status. It does note that §4.3 exists specifically to distinguish MC-mediated perceptual signals (which pass through a trust/auth pipeline) from unmediated perceptual experiences (which do not).',
             'On the archived medical-care reference: it is not a clinical finding. Section 4.3 concerns only software-record authentication and draws no inference about a person’s health or perception.', 'MC medical note')

# Rewrite the AVE introduction as a conventional, non-neural interface schema.
ave_start=part.index('Audio Visual Encoding (AVE) Model Component')
pre=part[:ave_start]; ave=part[ave_start:]
replace_in_ave='''1. Abstract
The Audio Visual Encoding (AVE) component is a proposed schema for presenting selected software information through a user interface and for structuring user input. “Neural Atomic Body” (NAB) is a conceptual name for an interface boundary in this model, not an established neural device. No neural input/output, direct control of perception, clinical function, or implementation is demonstrated.
The two conceptual directions use separate paths:
System → Operator: A software component may request display of a bounded, policy-approved payload through a conventional, accessible interface. The display does not prove that the person noticed, understood, or accepted it.
Operator → System: A person may submit input through an application interface. The application must authenticate the source, validate the schema and scope, and check current, action-specific authorization before any side effect. Identity alone is not permission.
AVE remains a draft; these descriptions are design requirements, not deployed capabilities.
2. Definitions'''
old_abstract='''1. Abstract
The Audio Visual Encoding (AVE) layer is a general-purpose communication protocol between internal systems and human Operators. Its purpose is to allow outsiders (Operators) to perceive what is happening inside a system without opening the system itself.
AVE is not specific to MicroConvergence. Any system that needs to surface internal state to an Operator — or receive Operator input — can encode through AVE. MicroConvergence is one consumer. Others may follow.
Communication is bidirectional:
System → Operator: The system encodes data and transmits it through the Operator's Neural Atomic Body (NAB), which security-gates the data and relays it to the Operator as visual or auditory perception.
Operator → System: The Operator communicates with their own system (e.g., their MC Instance) at full capacity — unrestricted by the encoding constraints that apply to system-originated signals.
2. Definitions'''
assert ave.count(old_abstract)==1
ave=ave.replace(old_abstract,replace_in_ave,1)

# Replace unsupported neural diagrams and claims with explicit software-interface flows.
arch_start=ave.index('3. Architecture\n')
arch_end=ave.index('3.3 The NAB as Proposed Architectural Boundary',arch_start)
new_arch='''3. Architecture
3.1 System → Operator (Outbound)
[Consumer / software component]
    → bounded payload request
[Proposed software display boundary (NAB concept): source, schema, integrity, scope, privacy, and profile checks]
    → optional text, audio, or other accessible user-interface presentation
1. The Consumer requests display of defined fields under a named profile.
2. The application checks the source, schema, integrity, scope, privacy limits, and applicable policy.
3. A passing result may be rendered through a conventional interface with an accessible alternative and user controls.
4. HOLD, DOWNGRADE, or REJECT behavior must be implemented and tested for that deployment; this draft does not establish a physical interlock.
5. Delivery telemetry may show that a display event was logged. It cannot verify conscious perception, attention, understanding, or consent.

3.2 Operator → System (Inbound)
[Person using an application]
    → request through ordinary client/interface
[Application boundary: authenticate, validate schema and scope, check freshness and action-specific authorization]
    → permitted software component; otherwise HOLD or REJECT
The inbound path is not exempt from checks. A valid identity credential does not by itself establish action-specific intent, freedom from coercion, or permission to change system state. A deployment must authenticate the source, validate the message schema and scope, apply privacy and rate controls, and require any separate authorization needed for a side effect. No claim of full-capacity neural input or guaranteed operator readiness is made.
'''
ave=ave[:arch_start]+new_arch+ave[arch_end:]

# Replace class-3 guarantee language and unsupported speed/reliability claim.
for old,new,label in [
 ('High-specificity textual signals. These are not vague impressions — they are incredibly specific text strings delivered with precision.',
  'A text payload can carry more detail than a directional or color label. Its meaning and fidelity depend on the declared schema, language, rendering, and user-selected interface.', 'AVE class 3 description'),
 ('Encoding cost: Medium. Text carries semantic content and requires the NAB to render it faithfully.',
  'Encoding cost and rendering fidelity are deployment-specific; no generic latency or accuracy value is established.', 'AVE class 3 cost'),
 ('##### Specificity Guarantee\nA Class 3 signal that is vague, garbled, or ambiguous has failed encoding. The NAB should either:\n1. Re-attempt delivery at higher fidelity, or\n2. Downgrade to a Class 1 or Class 2 signal (directional or color-coded approximation), or\n3. Hold the signal until delivery conditions improve.',
  '##### Specificity Failure Handling\nIf a Class 3 payload is vague, garbled, incomplete, or ambiguous under its declared schema, do not infer the missing content. The implementation may retry under a stated policy, offer a lower-complexity form only if it preserves decision-relevant information, or HOLD/REJECT with an explanation. No fidelity guarantee follows from this draft.', 'AVE class 3 failure'),
 ('Prefer lower classes when possible. A Class 1 signal passes through the Security Gate faster and with higher reliability than a Class 4 signal. Don\'t send a video when a checkmark will do.',
  'Prefer the simplest presentation that preserves the information needed for the task. No class is inherently faster or more reliable; measure latency, loss, comprehension, and accessibility in the specific deployment.', 'AVE class selection'),
]:
 n=ave.count(old)
 if n!=1: raise ValueError(f'{label}: expected 1, got {n}')
 ave=ave.replace(old,new,1)

# Security gate and inbound rules are software policy proposals, not sensory control.
gate_start=ave.index('6. The Security Gate')
gate_end=ave.index('7. Bidirectional Communication Summary',gate_start)
new_gate='''6. The Proposed Software Security Gate
6.1 Purpose
The Security Gate is a proposed software policy check before a payload is handed to a user interface. It may evaluate declared source authentication, schema and integrity, scope, content policy, privacy, and rate limits. It is not a medical or neural mechanism and cannot determine whether a person is conscious, ready, attentive, or able to consent.
1. Source/authentication: Is the source bound under the declared enrollment and key-management policy?
2. Schema/integrity: Are required fields present and the payload intact under tested checks?
3. Scope/policy: Is this display or input allowed for the named profile and purpose?
4. Privacy/rate controls: Are data minimization, access, retention, and rate rules met?
5. Interface settings: Respect user-selected modality, accessibility, pause, and notification controls; do not infer readiness from telemetry.

6.2 Gate Decisions
PASS — the defined source, schema, integrity, scope, and profile checks passed; this is not permission for an external action.
HOLD — data is missing, stale, conflicting, or awaiting required review.
DOWNGRADE — use a simpler representation only if it preserves decision-relevant information and an accessible alternative is available.
REJECT — a source, integrity, scope, or policy check failed, or safe rendering cannot be established.
Every result needs a reason code and traceable profile version. Physical effect and user perception remain unverified unless separately measured.

6.3 Operator-to-System Input: Separate Checks, No Trust Bypass
A user identity credential is not an authorization to perform every action. The receiving application should verify the current request, target, scope, freshness, and any required human or organizational grant before a side effect. The system cannot infer freedom from coercion or legal consent from a credential or display event alone. A missing or invalid check returns HOLD/REJECT under the declared policy.

'''
ave=ave[:gate_start]+new_gate+ave[gate_end:]

# Replace claimed live integration and full-capacity processing with proposed, testable boundaries.
int_start=ave.index('8. Integration: MicroConvergence')
int_end=ave.index('10. Constraints & Limits',int_start)
new_int='''8. Integration: MicroConvergence
MicroConvergence is a proposed consumer of the AVE schema. The labels YES, NO, X, and ✓ may appear in examples as categorical payloads; this manuscript does not establish a working MC implementation or that those labels are authenticated, understood, or perceived. Any integration must specify endpoints, fields, privacy, access, and tests.

9. Integration: Future Consumers
A future software component could request a display or accept an inbound message only after a named interface profile is specified and tested. Requirements include a documented schema, authenticated endpoints, scope and privacy limits, accessibility alternatives, failure handling, and a separate action-authorization check for side effects. No neural binding, universal interoperability, or full-capacity input is claimed.
'''
ave=ave[:int_start]+new_int+ave[int_end:]

# Remove residual claims of operator-identity axioms in quick-reference and narrative notes.
replacements=[
 ('CLASS 1 — DIRECTIONAL PRIMITIVES\n  Signals:  NO, YES, X, ✓\n  Modality: Visual / Auditory\n  Data:     Direction only\n  Cost:     Minimal',
  'CLASS 1 — DIRECTIONAL PRIMITIVES\n  Signals:  NO, YES, X, ✓ (illustrative labels)\n  Modality: Possible text/audio/visual UI, deployment-specific\n  Data:     Categorical direction under a declared profile\n  Cost:     Not measured; deployment-specific'),
 ('CLASS 2 — MATCHED COLORS\n  Signals:  Color patterns mapped to known referents\n  Modality: Visual\n  Data:     Categorical / state\n  Cost:     Low',
  'CLASS 2 — MATCHED COLORS\n  Signals:  Optional colors plus equivalent text labels\n  Modality: Visual UI, if selected and accessible\n  Data:     Local category under a declared profile\n  Cost:     Not measured; deployment-specific'),
 ('CLASS 3 — SPECIFIC TEXT\n  Signals:  Precise text strings\n  Modality: Visual / Auditory\n  Data:     Semantic content\n  Cost:     Medium',
  'CLASS 3 — SPECIFIC TEXT\n  Signals:  Text payloads with source/schema metadata\n  Modality: Conventional text UI; optional accessibility rendering\n  Data:     Declared semantic content\n  Cost:     Not measured; deployment-specific'),
 ('CLASS 4 — RICH MEDIA\n  Signals:  Conversations, video, composite AV\n  Modality: Visual + Auditory\n  Data:     Temporal / narrative\n  Cost:     High (~8 MB cap)',
  'CLASS 4 — RICH MEDIA\n  Signals:  Audio/video payloads only if a deployment supports them\n  Modality: User-selected conventional UI and accessible alternatives\n  Data:     Temporal / narrative\n  Cost:     Not measured; no universal payload cap is established'),
]
for old,new in replacements:
 n=ave.count(old)
 if n!=1: raise ValueError(f'AVE final fix expected one match, got {n}: {old[:90]!r}')
 ave=ave.replace(old,new,1)

part=pre+ave
s=s[:a]+part+s[b:]
p.write_text(s,encoding='utf-8')
print('Revised Part XXI MC and AVE claims to distinguish software records, interface delivery, human reports, and unestablished neural/perceptual capabilities.')
