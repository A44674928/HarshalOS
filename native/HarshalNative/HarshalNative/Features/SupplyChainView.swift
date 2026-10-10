import HarshalCore
import SwiftUI

/// A native SCAV++ security dashboard. It exposes enforced app-controlled
/// boundaries and research provenance; it intentionally does not let a local
/// picker manufacture provenance, identity, or integration approval.
struct SupplyChainView: View {
    var body: some View {
        NavigationStack {
            Form {
                corpusRecordSection
                accountabilityResearchSection
                supplyChainResearchSection
                sourceTranslationSection
                corpusMapSection
                controlledSurfacesSection
                enforcedRefusalsSection
                shipmentProvenanceSection
                reviewBoundarySection
                limitationsSection
            }
            .scrollContentBackground(.hidden)
            .background(HarshalTheme.canvas)
            .navigationTitle("SCAV++ security")
        }
    }

    private var corpusRecordSection: some View {
        Section("AGS v0.2 text-based source corpus") {
            VStack(alignment: .leading, spacing: 8) {
                Label(AGSv02PublishedCorpus.title, systemImage: "books.vertical.fill")
                    .font(.headline)
                Text(AGSv02PublishedCorpus.sourceRule)
                    .foregroundStyle(HarshalTheme.secondaryText)
                LabeledContent("Corpus identifier", value: AGSv02PublishedCorpus.identifier)
                LabeledContent("Edition", value: AGSv02PublishedCorpus.edition)
                LabeledContent("Author", value: AGSv02PublishedCorpus.author)
                LabeledContent("PDF pages", value: "\(AGSv02PublishedCorpus.pdfPageCount)")
                LabeledContent("Tracked source", value: "Production KDP interior")
                LabeledContent("SHA-256", value: "6c67feae…f839823")
            }

            Text(AGSv02PublishedCorpus.runtimeBoundary)
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)
        }
    }

    private var accountabilityResearchSection: some View {
        Section("Part XVIII accountability research") {
            VStack(alignment: .leading, spacing: 8) {
                Label(AccountabilityResearchReference.title, systemImage: "person.badge.shield.checkmark")
                    .font(.headline)
                Text(AccountabilityResearchReference.summary)
                    .foregroundStyle(HarshalTheme.secondaryText)
                LabeledContent("Published part", value: AccountabilityResearchReference.sourcePart)
                LabeledContent("Corpus document", value: AccountabilityResearchReference.documentID)
                LabeledContent("Printed / PDF page", value: "\(AccountabilityResearchReference.printedStartPage) / \(AccountabilityResearchReference.pdfStartPage)")
                LabeledContent("Provenance", value: AccountabilityResearchReference.provenanceClass)
                LabeledContent("Status", value: AccountabilityResearchReference.statusTaxonomy)
                LabeledContent("Research layer", value: AccountabilityResearchReference.researchLayer)
                LabeledContent("Evidence boundary", value: AccountabilityResearchReference.evidenceStatus)
            }

            Text("The prior repository corpus path is retained as a legacy companion record only. The published AGS v0.2 numbering is the source of record for this native screen.")
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)
        }
    }

    private var supplyChainResearchSection: some View {
        Section("Part XIX supply-chain threat-research boundary") {
            VStack(alignment: .leading, spacing: 8) {
                Label(SupplyChainResearchReference.title, systemImage: "shield.lefthalf.filled")
                    .font(.headline)
                Text(SupplyChainResearchReference.summary)
                    .foregroundStyle(HarshalTheme.secondaryText)
                LabeledContent("Boundary identifier", value: SupplyChainResearchReference.identifier)
                LabeledContent("Published part", value: SupplyChainResearchReference.sourcePart)
                LabeledContent("Corpus document", value: SupplyChainResearchReference.documentID)
                LabeledContent("Printed / PDF page", value: "\(SupplyChainResearchReference.printedStartPage) / \(SupplyChainResearchReference.pdfStartPage)")
                LabeledContent("Provenance", value: SupplyChainResearchReference.provenanceClass)
                LabeledContent("Status", value: SupplyChainResearchReference.statusTaxonomy)
                LabeledContent("Research layer", value: SupplyChainResearchReference.researchLayer)
                LabeledContent("Evidence boundary", value: SupplyChainResearchReference.evidenceStatus)
            }

            Label("Cataloged boundary only", systemImage: "hand.raised.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(HarshalTheme.warning)
            Text("This SCAV++ screen displays no Part XIX scenario material and derives or operationalizes none of it. The separate read-only Library can render the complete owner-provided published book with its source classifications, but offers no scanner, attack workflow, targeting mechanism, device guidance, activation path, or incident-response authority.")
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)
        }
    }

    private var sourceTranslationSection: some View {
        Section("Published corpus → native constraints") {
            ForEach(PublishedCorpusNativeBoundaryTranslation.allCases) { principle in
                VStack(alignment: .leading, spacing: 5) {
                    Label(principle.title, systemImage: "arrow.down.forward.and.arrow.up.backward")
                        .font(.subheadline.weight(.semibold))
                    Text(principle.sourcePart)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(HarshalTheme.electricBlue)
                    Text(principle.nativeTranslation)
                        .font(.footnote)
                        .foregroundStyle(HarshalTheme.secondaryText)
                    Text("Limit: \(principle.explicitLimit)")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(HarshalTheme.warning)
                }
                .padding(.vertical, 2)
            }
        }
    }

    private var corpusMapSection: some View {
        Section("Full text operating-system source map") {
            Text("The whole published volume is the source corpus; each entry retains its own evidence class and native-use boundary.")
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)

            DisclosureGroup("View \(AGSv02PublishedCorpus.sections.count) source sections") {
                ForEach(AGSv02PublishedCorpus.sections) { section in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(section.id)
                            .font(.caption.monospaced().weight(.semibold))
                            .foregroundStyle(HarshalTheme.electricBlue)
                        Text(section.title)
                            .font(.subheadline.weight(.semibold))
                        Text("\(section.sourceClassification) · print p. \(section.printedStartPage) · PDF p. \(section.pdfStartPage)")
                            .font(.caption)
                            .foregroundStyle(HarshalTheme.secondaryText)
                        Text(section.nativeDisposition.label)
                            .font(.caption.weight(.medium))
                            .foregroundStyle(HarshalTheme.warning)
                        Text(section.nativeDisposition.boundary)
                            .font(.caption)
                            .foregroundStyle(HarshalTheme.secondaryText)
                    }
                    .padding(.vertical, 3)
                }
            }
        }
    }

    private var controlledSurfacesSection: some View {
        Section("Controlled native surfaces") {
            ForEach(HarshalControlledSurface.allCases) { surface in
                VStack(alignment: .leading, spacing: 4) {
                    Text(surface.dataClassification.rawValue)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(HarshalTheme.electricBlue)
                    Text(surface.boundary)
                        .font(.footnote)
                        .foregroundStyle(HarshalTheme.secondaryText)
                }
                .padding(.vertical, 2)
            }

            LabeledContent("Egress policy", value: HarshalDataEgressPolicy.version)
            Text("The Community adapter can encode only a typed phase snapshot, exact public-note text, and public pseudonym. Private-core identifiers, declaration labels, ledger data, gate state, CloudKit data, market records, and handoff capabilities have no field in that payload.")
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)
            Text("Short-lived Community claim/status capabilities are held in Keychain and excluded from persisted observation metadata.")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(HarshalTheme.secondaryText)
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

    private var shipmentProvenanceSection: some View {
        Section("Shipping provenance baseline") {
            Label("No active shipment decision", systemImage: "shippingbox.and.arrow.backward")
                .font(.headline)
                .foregroundStyle(HarshalTheme.warning)
            LabeledContent("Baseline", value: ShipmentProvenanceBaseline.version)
            LabeledContent("Default", value: "HOLD FOR AUTHORIZED REVIEW")
            Text("This app has no local acceptance button. A record can reach verified continuity only when it was pre-registered with a trusted origin/release signature, scoped unexpired route authorization, current signed revocation snapshot, every expected dual-signed custody handoff, and a separate accountable review bound to the same component digest.")
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)
            Text("A missing, altered, expired, replayed, unknown-source, route-deviating, or untrusted-network record remains on hold. A present part, post-hoc explanation, router report, or locally selected label cannot fill a missing proof.")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(HarshalTheme.secondaryText)
            Text("A suspected network incident remains an unproven evidence item for independent authorized review. It does not identify an attacker, location, country, or intent, and cannot itself authorize rerouting, deployment, or external action.")
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)
            Text(ShipmentProvenanceBaseline.limitation)
                .font(.caption)
                .foregroundStyle(HarshalTheme.secondaryText)
        }
    }

    private var reviewBoundarySection: some View {
        Section("Integration review boundary") {
            Label("No self-attestation approval path", systemImage: "checkmark.shield")
                .font(.headline)
                .foregroundStyle(HarshalTheme.warning)
            Text("This build does not turn a local evidence selector, reviewer label, or app-generated receipt into provenance verification or a permit. No third-party integration-registration endpoint is exposed.")
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)
            Text("If a future relationship needs review, it must carry independently reviewable origin, release-integrity, update-continuity, accountable-owner, scope, expiry, and revocation evidence outside this screen. Until then, the result is refusal.")
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)
        }
    }

    private var limitationsSection: some View {
        Section("Boundary limits") {
            Text(SupplyChainBoundary.limitation)
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)
            Text("Platform code signing, Keychain, encrypted local state, App Sandbox, and Hardened Runtime improve application protection where configured; they do not independently verify a person, remote service, device, source-code copy, or external binary.")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(HarshalTheme.secondaryText)
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
                .foregroundStyle(HarshalTheme.warning)
            Text(code.rawValue)
                .font(.caption.monospaced())
                .foregroundStyle(HarshalTheme.secondaryText)
            Text(detail)
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)
        }
        .padding(.vertical, 2)
    }
}
