import Foundation
import HarshalCore
import HarshalLedger
import Observation

@MainActor
@Observable
final class AppModel {
    var declarationDraft = PhaseDeclarationDraft()
    var declaration: PhaseDeclaration?
    var receipt: LocalLedgerReceipt?
    var ledgerEntries: [LedgerEntry] = []
    var receiptVerification: LedgerVerification?

    var localAttestation: LocalAttestationState = .absent
    var attestedAt: Date?
    var actionName = "Read local reference"
    var addressability = 1.0
    var representation = 1.0
    var authorizationActive = false
    var sessionBound = false
    var technicalAttribution = false
    var operationalAccountability = false
    var gateEvaluation: GateEvaluation?

    var cloudKitState: CloudKitMirrorState = .notConfigured
    var isSubmittingDeclaration = false
    var errorMessage: String?
    private(set) var didBootstrap = false

    // Supersedes a delayed local acknowledgement when it is revoked, replaced,
    // or a new declaration begins. This is local state-machine hygiene only,
    // not proof of liveness or identity.
    private var acknowledgementGeneration = 0
    private let ledger = LocalLedger()

    func bootstrap() async {
        guard !didBootstrap else { return }
        didBootstrap = true

        guard let stored = LocalStateStore.load() else { return }
        declaration = stored.declaration
        receipt = stored.receipt
        await ledger.replaceRecoveredEntries(stored.ledgerEntries)
        ledgerEntries = stored.ledgerEntries

        // A local acknowledgement is intentionally not restored across launches.
        localAttestation = .absent
        attestedAt = nil
        authorizationActive = false
        sessionBound = false
        technicalAttribution = false
        operationalAccountability = false

        if let receipt {
            let verification = await ledger.verify(receipt)
            receiptVerification = verification
            if !verification.verified {
                errorMessage = "Recovered local ledger verification failed. The app remains fail-closed; create a new declaration after reviewing the record."
            }
        }
    }

    func acknowledgeNextGSrbCollapseStep() {
        guard let step = declarationDraft.nextGSrbCollapseAcknowledgment else {
            errorMessage = "The GSRB collapse protocol is complete, unavailable for this phase, or malformed. Change the phase to reset it."
            return
        }
        declarationDraft.collapseAcknowledgments.append(step)
    }

    func createDeclaration() async {
        guard !isSubmittingDeclaration else { return }
        isSubmittingDeclaration = true
        defer { isSubmittingDeclaration = false }

        do {
            let created = try PhaseDeclarationFactory.make(from: declarationDraft)
            acknowledgementGeneration += 1
            localAttestation = .absent
            attestedAt = nil
            authorizationActive = false
            sessionBound = false
            technicalAttribution = false
            operationalAccountability = false
            gateEvaluation = nil

            _ = try await ledger.append(
                severity: .info,
                event: "PHASE_DECLARATION_CREATED id=\(created.id.uuidString.uppercased()) verification=\(created.verification.rawValue)",
                declaredPhase: created.phase
            )
            let issuedReceipt = try await ledger.issueReceipt(
                subjectType: "PHASE_DECLARATION",
                subjectID: created.id
            )
            declaration = created
            receipt = issuedReceipt
            receiptVerification = await ledger.verify(issuedReceipt)
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Starts a deliberately local acknowledgement ceremony. It does not invoke
    /// a human authenticator or claim to assess identity, honesty, intent, or
    /// legal eligibility.
    func activateLocalAcknowledgement() async {
        guard let declaration else {
            errorMessage = "Create a phase declaration before recording a local acknowledgement."
            return
        }
        guard localAttestation != .pending else { return }

        acknowledgementGeneration += 1
        let generation = acknowledgementGeneration
        localAttestation = .pending
        try? await Task.sleep(nanoseconds: 250_000_000)
        guard !Task.isCancelled,
              generation == acknowledgementGeneration,
              localAttestation == .pending else {
            return
        }

        localAttestation = .active
        attestedAt = .now
        _ = try? await ledger.append(
            severity: .info,
            event: "LOCAL_ACKNOWLEDGEMENT_ACTIVE declaration=\(declaration.id.uuidString.uppercased()) not-authentication",
            declaredPhase: declaration.phase
        )
        await refreshLedgerAndPersist()
    }

    func revokeLocalAcknowledgement() async {
        acknowledgementGeneration += 1
        localAttestation = .revoked
        attestedAt = nil
        authorizationActive = false
        sessionBound = false
        gateEvaluation = nil
        if let declaration {
            _ = try? await ledger.append(
                severity: .warning,
                event: "LOCAL_ACKNOWLEDGEMENT_REVOKED declaration=\(declaration.id.uuidString.uppercased())",
                declaredPhase: declaration.phase
            )
            await refreshLedgerAndPersist()
        }
    }

    func evaluateGate() {
        guard let declaration else {
            errorMessage = "Create a phase declaration before evaluating the local gate."
            return
        }

        let result = RefusalGate.evaluate(
            GateInput(
                actionName: actionName,
                phase: declaration.phase,
                attestation: localAttestation,
                attestedAt: attestedAt,
                addressability: addressability,
                representation: representation,
                authorizationActive: authorizationActive,
                sessionBound: sessionBound,
                technicalAttribution: technicalAttribution,
                operationalAccountability: operationalAccountability
            )
        )
        gateEvaluation = result

        Task {
            let severity: LedgerSeverity = result.permitted ? .permit : .refusal
            _ = try? await ledger.append(
                severity: severity,
                event: "LOCAL_GATE action=\(actionName.prefix(128)) code=\(result.code.rawValue) legitimacy=\(String(format: "%.3f", result.legitimacy))",
                declaredPhase: declaration.phase
            )
            await refreshLedgerAndPersist()
        }
    }

    func verifyReceipt() async {
        guard let receipt else {
            errorMessage = "No local receipt has been issued."
            return
        }
        receiptVerification = await ledger.verify(receipt)
    }

    func checkCloudKit() async {
        cloudKitState = .checking
        cloudKitState = await CloudKitMirror.accountState()
    }

    func syncDeclarationToCloudKit() async {
        guard let declaration, let receipt else {
            errorMessage = "Create a declaration and receipt before requesting a private CloudKit mirror."
            return
        }
        cloudKitState = .syncing
        do {
            try await CloudKitMirror.mirror(declaration: declaration, receipt: receipt)
            cloudKitState = .synced(.now)
        } catch {
            cloudKitState = .failed(error.localizedDescription)
        }
    }

    func startNewDeclaration() async {
        acknowledgementGeneration += 1
        await ledger.replaceRecoveredEntries([])
        declaration = nil
        receipt = nil
        declarationDraft = PhaseDeclarationDraft()
        localAttestation = .absent
        attestedAt = nil
        authorizationActive = false
        sessionBound = false
        technicalAttribution = false
        operationalAccountability = false
        gateEvaluation = nil
        receiptVerification = nil
        ledgerEntries = []
        LocalStateStore.removeAll()
    }

    private func refreshLedgerAndPersist() async {
        ledgerEntries = await ledger.snapshot()
        LocalStateStore.save(
            PersistedNativeState(
                declaration: declaration,
                receipt: receipt,
                ledgerEntries: ledgerEntries
            )
        )
    }
}
