import Foundation
import HarshalCore
import HarshalLedger
import HarshalMarkets
import Observation

@MainActor
@Observable
final class AppModel {
    var declarationDraft = PhaseDeclarationDraft()
    var declaration: PhaseDeclaration?
    var receipt: LocalLedgerReceipt?
    var ledgerEntries: [LedgerEntry] = []
    var receiptVerification: LedgerVerification?
    /// Local, fixture-driven paper-market records for the current private
    /// universe core. They never create a broker instruction or public post.
    var paperLedgerState = PaperLedgerState.empty

    var localAttestation: LocalAttestationState = .absent
    var attestedAt: Date?
    var actionName = "Modeled external action"
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
    private let paperLedger = PaperLedger()

    var marketFixtures: [MarketFixture] {
        HarshalMarketFixtures.all
    }

    func bootstrap() async {
        guard !didBootstrap else { return }
        didBootstrap = true

        guard let stored = LocalStateStore.load() else { return }
        declaration = stored.declaration
        receipt = stored.receipt
        await ledger.replaceRecoveredEntries(stored.ledgerEntries)
        ledgerEntries = stored.ledgerEntries
        if let recoveredPaperLedger = stored.paperLedgerState {
            do {
                try await paperLedger.replaceRecoveredState(recoveredPaperLedger)
                paperLedgerState = recoveredPaperLedger
            } catch {
                errorMessage = "Recovered paper-market records failed validation and were not restored. The local paper ledger remains empty; review the prior device record before recreating it."
            }
        }

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
            errorMessage = "The God-Sovereign Religious Body (GSRB) collapse protocol is complete, unavailable for this phase, or malformed. Change the phase to reset it."
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

    /// Records one local, non-executing market declaration. A public visibility
    /// intent is retained as metadata only; this build does not publish it.
    func recordMarketDeclaration(
        instrument: MarketInstrument,
        direction: MarketDirection,
        thesis: String,
        targetDate: Date,
        visibilityIntent: MarketVisibilityIntent
    ) async {
        guard let declaration else {
            errorMessage = "Create a phase declaration before recording a paper-market declaration."
            return
        }

        let eligibility = PaperTradingPolicy.evaluate(phase: declaration.phase, activity: .marketDeclaration)
        guard eligibility.isEligible else {
            errorMessage = eligibility.reason
            return
        }

        do {
            let marketDeclaration = try MarketDeclaration(
                universeCoreID: declaration.id,
                phase: declaration.phase,
                instrument: instrument,
                direction: direction,
                thesis: thesis,
                targetDate: targetDate,
                visibilityIntent: visibilityIntent
            )
            _ = try await paperLedger.recordDeclaration(marketDeclaration)
            _ = try await ledger.append(
                severity: .info,
                event: "PAPER_MARKET_DECLARATION id=\(marketDeclaration.id.uuidString.uppercased()) instrument=\(instrument.id) direction=\(direction.rawValue) scope=PAPER_ONLY",
                declaredPhase: declaration.phase
            )
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Opens a position against a bundled deterministic observation. It is a
    /// local simulation record only and never contacts a broker or market API.
    func openPaperPosition(
        declarationID: UUID,
        side: PaperPositionSide,
        quantity: Decimal,
        entryObservation: MarketObservation
    ) async {
        guard let marketDeclaration = paperLedgerState.declarations.first(where: { $0.id == declarationID }) else {
            errorMessage = "Choose a local market declaration before opening a paper position."
            return
        }

        let eligibility = PaperTradingPolicy.evaluate(phase: marketDeclaration.phase, activity: .openPosition)
        guard eligibility.isEligible else {
            errorMessage = eligibility.reason
            return
        }

        do {
            let position = try PaperPosition(
                universeCoreID: marketDeclaration.universeCoreID,
                declarationID: marketDeclaration.id,
                phase: marketDeclaration.phase,
                instrument: marketDeclaration.instrument,
                side: side,
                quantity: quantity,
                entryObservation: entryObservation
            )
            _ = try await paperLedger.openPosition(position)
            _ = try await ledger.append(
                severity: .info,
                event: "PAPER_POSITION_OPENED id=\(position.id.uuidString.uppercased()) declaration=\(marketDeclaration.id.uuidString.uppercased()) side=\(side.rawValue) quantity=\(decimalString(quantity)) scope=PAPER_ONLY",
                declaredPhase: marketDeclaration.phase
            )
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func closePaperPosition(id: UUID, observation: MarketObservation) async {
        guard let existing = paperLedgerState.positions.first(where: { $0.id == id }) else {
            errorMessage = "The selected local paper position no longer exists."
            return
        }

        let eligibility = PaperTradingPolicy.evaluate(phase: existing.phase, activity: .closePosition)
        guard eligibility.isEligible else {
            errorMessage = eligibility.reason
            return
        }

        do {
            let closed = try await paperLedger.closePosition(id: id, observation: observation)
            _ = try await ledger.append(
                severity: .info,
                event: "PAPER_POSITION_CLOSED id=\(closed.id.uuidString.uppercased()) exit=\(decimalString(observation.price ?? 0)) scope=PAPER_ONLY",
                declaredPhase: closed.phase
            )
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func withdrawPaperPosition(id: UUID) async {
        guard let existing = paperLedgerState.positions.first(where: { $0.id == id }) else {
            errorMessage = "The selected local paper position no longer exists."
            return
        }

        do {
            let withdrawn = try await paperLedger.withdrawPosition(id: id)
            _ = try await ledger.append(
                severity: .warning,
                event: "PAPER_POSITION_WITHDRAWN id=\(withdrawn.id.uuidString.uppercased()) scope=PAPER_ONLY",
                declaredPhase: existing.phase
            )
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
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
        try? await paperLedger.replaceRecoveredState(.empty)
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
        paperLedgerState = .empty
        LocalStateStore.removeAll()
    }

    private func refreshLedgerAndPersist() async {
        ledgerEntries = await ledger.snapshot()
        paperLedgerState = await paperLedger.snapshot()
        LocalStateStore.save(
            PersistedNativeState(
                declaration: declaration,
                receipt: receipt,
                ledgerEntries: ledgerEntries,
                paperLedgerState: paperLedgerState
            )
        )
    }

    private func decimalString(_ value: Decimal) -> String {
        NSDecimalNumber(decimal: value).stringValue
    }
}
