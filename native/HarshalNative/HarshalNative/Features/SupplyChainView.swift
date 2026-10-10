import HarshalCore
import SwiftUI

/// A native SCAV++ security dashboard. It exposes enforced app-controlled
/// boundaries and research provenance; it intentionally does not let a local
/// picker manufacture provenance, identity, or integration approval.
struct SupplyChainView: View {
    var body: some View {
        NavigationStack {
            Form {
                researchRecordSection
                controlledSurfacesSection
                shipmentAdmissionSection
                enforcedRefusalsSection
                reviewBoundarySection
                limitationsSection
            }
            .navigationTitle("SCAV++ security")
        }
    }

    private var researchRecordSection: some View {
        Section("Threat-research record") {
            VStack(alignment: .leading, spacing: 8) {
                Label(SupplyChainResearchReference.title, systemImage: "shield.lefthalf.filled")
                    .font(.headline)
                Text(SupplyChainResearchReference.summary)
                    .foregroundStyle(.secondary)
                LabeledContent("Reference", value: SupplyChainResearchReference.identifier)
                LabeledContent("Corpus document", value: SupplyChainResearchReference.documentID)
                LabeledContent("Provenance", value: SupplyChainResearchReference.provenanceClass)
                LabeledContent("Status", value: SupplyChainResearchReference.statusTaxonomy)
                LabeledContent("Research layer", value: SupplyChainResearchReference.researchLayer)
                LabeledContent("Evidence status", value: SupplyChainResearchReference.evidenceStatus)
            }

            Text("The original text remains a corpus source. This native surface carries defensive boundary controls only; it does not reproduce scenario mechanics or turn them into a workflow.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private var controlledSurfacesSection: some View {
        Section("Controlled native surfaces") {
            ForEach(HarshalControlledSurface.allCases) { surface in
                VStack(alignment: .leading, spacing: 4) {
                    Text(surface.dataClassification.rawValue)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.teal)
                    Text(surface.boundary)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 2)
            }

            LabeledContent("Egress policy", value: HarshalDataEgressPolicy.version)
            Text("The Community adapter can encode only a typed phase snapshot, exact public-note text, and public pseudonym. Private-core identifiers, declaration labels, ledger data, gate state, CloudKit data, market records, and handoff capabilities have no field in that payload.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            Text("Short-lived Community claim/status capabilities are held in Keychain and excluded from persisted observation metadata.")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)
        }
    }

    private var shipmentAdmissionSection: some View {
        Section("Defensive shipment admission baseline") {
            LabeledContent("Policy", value: ShipmentProvenancePolicy.version)
            Label("Physical arrival is not admission", systemImage: "shippingbox.fill")
                .font(.headline)
                .foregroundStyle(.orange)
            Text("A future shipping adapter must bind an expected manifest to independently verified expiry/revocation-capable governance, then require exact ordered custody, separately referenced governance and receiving review roles, receiving identity, physical inspection, artifact integrity, and accountable review before a record can become review-ready.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            Text("A router or network route observation is corroborating/alerting evidence only. A conflict produces HOLD FOR AUTHORIZED REVIEW; a consistent observation can never substitute for custody continuity.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            Text("Even a complete record returns CONTINUITY COMPLETE REQUIRES AUTHORIZED RELEASE—not acceptance, dispatch, installation, or external operational authority.")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)
        }
    }

    private var enforcedRefusalsSection: some View {
        Section("Hard refusals") {
            refusalRow(
                code: .componentEmbeddingRefused,
                title: "No component embedding",
                detail: "Harshal Native is not an SDK, plug-in host, downstream dependency, or reusable authority component."
            )
            refusalRow(
                code: .authorityDelegationRefused,
                title: "No delegated authority",
                detail: "A declaration, receipt, model result, or local app state cannot authorize another person or system."
            )
            refusalRow(
                code: .externalAutomationRefused,
                title: "No external automation",
                detail: "The supply-chain boundary creates no execution channel or external-action capability."
            )
            refusalRow(
                code: .capabilityExceedsBoundary,
                title: "No privileged integration capability",
                detail: "Private state, identity/account data, network access, and external action are denied to a proposed downstream relationship."
            )
        }
    }

    private var reviewBoundarySection: some View {
        Section("Integration review boundary") {
            Label("No self-attestation approval path", systemImage: "checkmark.shield")
                .font(.headline)
                .foregroundStyle(.orange)
            Text("This build does not turn a local evidence selector, reviewer label, or app-generated receipt into provenance verification or a permit. No third-party integration-registration endpoint is exposed.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            Text("If a future relationship needs review, it must carry independently reviewable origin, release-integrity, update-continuity, accountable-owner, scope, expiry, and revocation evidence outside this screen. Until then, the result is refusal.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private var limitationsSection: some View {
        Section("Boundary limits") {
            Text(SupplyChainBoundary.limitation)
                .font(.footnote)
                .foregroundStyle(.secondary)
            Text("Platform code signing, Keychain, encrypted local state, App Sandbox, and Hardened Runtime improve application protection where configured; they do not independently verify a person, remote service, device, source-code copy, or external binary.")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)
        }
    }

    private func refusalRow(
        code: SupplyChainBoundaryCode,
        title: String,
        detail: String
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Label(title, systemImage: "xmark.shield.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.orange)
            Text(code.rawValue)
                .font(.caption.monospaced())
                .foregroundStyle(.secondary)
            Text(detail)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}
