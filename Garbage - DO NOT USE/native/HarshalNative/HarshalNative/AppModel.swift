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
    /// Legacy device-only paper records retained for review. They are never
    /// silently uploaded or merged into the account-scoped remote PAPER_TEST
    /// ledger; the server ledger below is the shared-authority surface.
    var paperLedgerState = PaperLedgerState.empty

    /// The combined Markets · NEO ORB surface: tucked-away settings, the
    /// paper trading simulator, the ticker board, and the Watch/biometric
    /// gate. Its account is persisted through the same encrypted local state
    /// as every other private record.
    var marketsOrb = MarketsOrbModel()
    /// Durable simulator account restored at bootstrap and replaced on change.
    var simulatorAccount: TradingSimulator.Account?

    /// Last validated account-scoped server snapshot. It is memory-only so a
    /// stale network response cannot be mistaken for a durable local ledger.
    var remotePaperMarketSnapshot: RemotePaperMarketSnapshot?
    /// Short-lived pairing material is Keychain-backed. It is displayed only to
    /// help the owner complete an explicit browser approval and is never stored
    /// in LocalStateStore, CloudKit, a URL, or a note.
    var remotePaperMarketPairing: PaperMarketPairingCapability?
    var remotePaperMarketPairingStatus: RemotePaperMarketPairingStatus?
    var remotePaperMarketStatus = "PAPER_TEST is not paired on this device."
    var isRemotePaperMarketBusy = false
    private var remotePaperMarketCredential: PaperMarketDeviceCredential?

    /// Owner-authored notes for the current private universe core. A public
    /// note is still local until its manual Community publication is confirmed.
    var observationNotes: [ObservationNote] = []
    /// Reusable self-chosen public author label. It deliberately remains
    /// separate from a private declaration label and verified identity.
    var publicProfilePseudonym = ""

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
    /// Guards the explicit handoff button against duplicate concurrent staging
    /// requests; it does not represent publication or authorization.
    var isPreparingPublicObservation = false
    var errorMessage: String?
    private(set) var didBootstrap = false

    /// Short-lived Community bearer material held only in memory after a
    /// Keychain read. Persisted notes carry a handoff ID and receipt metadata,
    /// never the claim code or status capability itself.
    private var publicObservationCapabilities: [UUID: PublicObservationHandoffCapability] = [:]
    private var didReportSecurePersistenceFailure = false

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

        marketsOrb.appModel = self
        marketsOrb.bootstrap()

        guard let stored = LocalStateStore.load() else {
            marketsOrb.restore(account: nil)
            await restoreRemotePaperMarketCapabilities()
            return
        }
        declaration = stored.declaration
        receipt = stored.receipt
        await ledger.replaceRecoveredEntries(stored.ledgerEntries)
        ledgerEntries = stored.ledgerEntries
        if let recoveredPaperLedger = stored.paperLedgerState {
            do {
                try await paperLedger.replaceRecoveredState(recoveredPaperLedger)
                paperLedgerState = recoveredPaperLedger
            } catch {
                appendRecoveryError("Recovered paper-market records failed validation and were not restored. The local paper ledger remains empty; review the prior device record before recreating it.")
            }
        }
        // The paper simulator account restores only through its own schema
        // validation; a corrupt blob starts fresh rather than partially.
        simulatorAccount = stored.simulatorAccount
        marketsOrb.restore(account: stored.simulatorAccount)
        if let recoveredNotes = stored.observationNotes {
            do {
                try validateRecoveredNotes(recoveredNotes, declaration: stored.declaration)
                observationNotes = try migrateAndRestorePublicationCapabilities(from: recoveredNotes)
            } catch {
                appendRecoveryError("Recovered observation notes failed validation and were not restored.")
            }
        }
        if let recoveredPseudonym = stored.publicProfilePseudonym {
            do {
                publicProfilePseudonym = try PublicProfilePseudonym(recoveredPseudonym).value
            } catch {
                appendRecoveryError("Recovered public profile pseudonym failed validation and was not restored.")
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
                appendRecoveryError("Recovered local ledger verification failed. The app remains fail-closed; create a new declaration after reviewing the record.")
            }
        }
        // Rewrites legacy persisted metadata without bearer fields after any
        // Keychain migration attempt. Only remove the old preferences cache
        // after the encrypted write succeeds.
        if await refreshLedgerAndPersist() {
            LocalStateStore.removeLegacyCache()
        }
        await restoreRemotePaperMarketCapabilities()
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

    // MARK: - Account-scoped server PAPER_TEST market

    var hasRemotePaperMarketCredential: Bool {
        remotePaperMarketCredential != nil && remotePaperMarketCredential?.isExpired == false
    }

    /// Restores only Keychain-held capability material. The shared server state
    /// is fetched anew; no local fixture or cached ledger becomes authority.
    private func restoreRemotePaperMarketCapabilities() async {
        do {
            let service = try PaperMarketService.configured()
            remotePaperMarketPairing = try service.restorePairing()
            remotePaperMarketCredential = try service.restoreCredential()
            if let pairing = remotePaperMarketPairing {
                remotePaperMarketStatus = pairing.isExpired
                    ? "The local native pairing expired. Start a new pairing."
                    : "Native pairing awaiting browser approval."
            }
            if remotePaperMarketCredential != nil {
                remotePaperMarketStatus = "PAPER_TEST device credential restored. Refreshing the server ledger."
                await refreshRemotePaperMarket()
            }
        } catch {
            remotePaperMarketCredential = nil
            remotePaperMarketPairing = nil
            remotePaperMarketStatus = "PAPER_TEST secure capability recovery failed. Pair this device again; no credential was assumed."
        }
    }

    func beginRemotePaperMarketPairing(deviceLabel: String) async {
        guard !isRemotePaperMarketBusy else { return }
        isRemotePaperMarketBusy = true
        defer { isRemotePaperMarketBusy = false }
        do {
            let service = try PaperMarketService.configured()
            let pairing = try await service.beginPairing(deviceLabel: deviceLabel)
            remotePaperMarketPairing = pairing
            remotePaperMarketPairingStatus = nil
            remotePaperMarketStatus = "Enter the displayed code in the signed-in HarshalOS browser account, then check this pairing status."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func refreshRemotePaperMarketPairing() async {
        guard !isRemotePaperMarketBusy else { return }
        guard let pairing = remotePaperMarketPairing else {
            errorMessage = "Start a native PAPER_TEST device pairing before checking its browser approval status."
            return
        }
        guard !pairing.isExpired else {
            clearRemotePaperMarketPairing(with: "The native device pairing expired. Start a new pairing.")
            return
        }
        isRemotePaperMarketBusy = true
        defer { isRemotePaperMarketBusy = false }
        do {
            let service = try PaperMarketService.configured()
            let status = try await service.pairingStatus(pairing)
            remotePaperMarketPairingStatus = status
            switch status.state {
            case "approved":
                remotePaperMarketStatus = "Browser approval confirmed. Redeem the scoped device credential explicitly on this device."
            case "pending":
                remotePaperMarketStatus = "This pairing is still waiting for signed-in browser approval."
            default:
                clearRemotePaperMarketPairing(with: "This native device pairing is no longer active. Start a new pairing.")
            }
        } catch {
            if error.localizedDescription.localizedCaseInsensitiveContains("pairing")
                || error.localizedDescription.localizedCaseInsensitiveContains("capability") {
                clearRemotePaperMarketPairing(with: "This native device pairing is unavailable. Start a new pairing.")
            } else {
                errorMessage = error.localizedDescription
            }
        }
    }

    func redeemRemotePaperMarketPairing() async {
        guard !isRemotePaperMarketBusy else { return }
        guard let pairing = remotePaperMarketPairing,
              remotePaperMarketPairingStatus?.state == "approved",
              remotePaperMarketPairingStatus?.canRedeem == true else {
            errorMessage = "Wait for the signed-in browser approval, then explicitly redeem this native device pairing."
            return
        }
        isRemotePaperMarketBusy = true
        defer { isRemotePaperMarketBusy = false }
        do {
            let service = try PaperMarketService.configured()
            let credential = try await service.redeemPairing(pairing)
            // The service has committed the new bearer to Keychain before it
            // returns. If that storage fails it throws and we do not retain it.
            remotePaperMarketCredential = credential
            remotePaperMarketPairing = nil
            remotePaperMarketPairingStatus = nil
            try await loadRemotePaperMarketSnapshot(using: service, credential: credential)
            remotePaperMarketStatus = "PAPER_TEST device paired. The shared server ledger is now the market authority for this app."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func cancelRemotePaperMarketPairing() {
        clearRemotePaperMarketPairing(with: "The local pairing capability was removed. Any unredeemed server pairing will expire; start a new pairing when ready.")
    }

    /// Removes only this device's local copy of a credential. Revocation remains
    /// a deliberately browser-confirmed account action, so a lost device cannot
    /// silently alter account device administration.
    func forgetRemotePaperMarketCredential() {
        do {
            try PaperMarketCapabilityVault.removeCredential()
            remotePaperMarketCredential = nil
            remotePaperMarketSnapshot = nil
            remotePaperMarketStatus = "This device no longer holds a PAPER_TEST credential. Re-pair it through the signed-in browser account to reconnect."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func refreshRemotePaperMarket() async {
        guard !isRemotePaperMarketBusy else { return }
        guard let credential = remotePaperMarketCredential, !credential.isExpired else {
            remotePaperMarketCredential = nil
            remotePaperMarketSnapshot = nil
            remotePaperMarketStatus = "No active PAPER_TEST device credential is available. Pair this device through the signed-in browser account."
            return
        }
        isRemotePaperMarketBusy = true
        defer { isRemotePaperMarketBusy = false }
        do {
            let service = try PaperMarketService.configured()
            try await loadRemotePaperMarketSnapshot(using: service, credential: credential)
            remotePaperMarketStatus = remotePaperMarketSnapshot?.market.sourceAvailability == "UNAVAILABLE"
                ? "Server ledger loaded; the Orb 2 field is unavailable, so no current mark or valuation is shown."
                : "Shared PAPER_TEST server snapshot refreshed."
        } catch {
            remotePaperMarketStatus = "Shared PAPER_TEST ledger unavailable: \(error.localizedDescription)"
        }
    }

    func recordRemotePaperMarketDeclaration(
        instrumentID: String,
        direction: String,
        thesis: String,
        targetDate: Date
    ) async {
        guard let declaration else {
            errorMessage = "Create a phase declaration before recording a shared PAPER_TEST market declaration."
            return
        }
        guard let credential = remotePaperMarketCredential, !credential.isExpired else {
            errorMessage = "Pair this device to the signed-in browser account before recording a shared PAPER_TEST declaration."
            return
        }
        let eligibility = PaperTradingPolicy.evaluate(phase: declaration.phase, activity: .marketDeclaration)
        guard eligibility.isEligible else { errorMessage = eligibility.reason; return }
        guard !isRemotePaperMarketBusy else { return }
        isRemotePaperMarketBusy = true
        defer { isRemotePaperMarketBusy = false }
        do {
            let service = try PaperMarketService.configured()
            _ = try await service.recordDeclaration(
                phase: declaration.phase.rawValue,
                instrumentID: instrumentID,
                direction: direction,
                thesis: thesis,
                targetAt: targetDate,
                credential: credential
            )
            _ = try? await ledger.append(
                severity: .info,
                event: "PAPER_TEST_REMOTE_DECLARATION_RECORDED authority=SERVER scope=PAPER_ONLY",
                declaredPhase: declaration.phase
            )
            try await loadRemotePaperMarketSnapshot(using: service, credential: credential)
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func openRemotePaperMarketPosition(declarationID: UUID, side: String, quantity: String) async {
        guard declaration != nil else {
            errorMessage = "Create a phase declaration before opening a shared PAPER_TEST position."
            return
        }
        guard let remoteDeclaration = remotePaperMarketSnapshot?.ledger.declarations.first(where: { $0.id == declarationID }),
              let credential = remotePaperMarketCredential, !credential.isExpired else {
            errorMessage = "Refresh the shared PAPER_TEST ledger and choose a remote declaration before opening a position."
            return
        }
        guard let remotePhase = DeclaredPhase(rawValue: remoteDeclaration.phase) else {
            errorMessage = "The selected server PAPER_TEST declaration has an unsupported phase label. Refresh without opening a position."
            return
        }
        let eligibility = PaperTradingPolicy.evaluate(phase: remotePhase, activity: .openPosition)
        guard eligibility.isEligible else {
            errorMessage = eligibility.reason
            return
        }
        guard !isRemotePaperMarketBusy else { return }
        isRemotePaperMarketBusy = true
        defer { isRemotePaperMarketBusy = false }
        do {
            let service = try PaperMarketService.configured()
            let quote = try await service.quote(instrumentID: remoteDeclaration.instrumentID, credential: credential)
            _ = try await service.openPosition(declarationID: declarationID, side: side, quantity: quantity, quote: quote, credential: credential)
            _ = try? await ledger.append(
                severity: .info,
                event: "PAPER_TEST_REMOTE_POSITION_OPENED authority=SERVER scope=PAPER_ONLY",
                declaredPhase: remotePhase
            )
            try await loadRemotePaperMarketSnapshot(using: service, credential: credential)
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func closeRemotePaperMarketPosition(id: UUID) async {
        guard let position = remotePaperMarketSnapshot?.ledger.positions.first(where: { $0.id == id }),
              declaration != nil,
              let credential = remotePaperMarketCredential, !credential.isExpired,
              let remotePhase = DeclaredPhase(rawValue: position.phase) else {
            errorMessage = "Refresh the shared PAPER_TEST ledger before closing a position."
            return
        }
        let eligibility = PaperTradingPolicy.evaluate(phase: remotePhase, activity: .closePosition)
        guard eligibility.isEligible, position.state == "OPEN" else {
            errorMessage = eligibility.reason
            return
        }
        guard !isRemotePaperMarketBusy else { return }
        isRemotePaperMarketBusy = true
        defer { isRemotePaperMarketBusy = false }
        do {
            let service = try PaperMarketService.configured()
            let quote = try await service.quote(instrumentID: position.instrumentID, credential: credential)
            _ = try await service.closePosition(id, quote: quote, credential: credential)
            _ = try? await ledger.append(
                severity: .info,
                event: "PAPER_TEST_REMOTE_POSITION_CLOSED authority=SERVER scope=PAPER_ONLY",
                declaredPhase: remotePhase
            )
            try await loadRemotePaperMarketSnapshot(using: service, credential: credential)
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func withdrawRemotePaperMarketPosition(id: UUID) async {
        guard let position = remotePaperMarketSnapshot?.ledger.positions.first(where: { $0.id == id }),
              declaration != nil,
              let credential = remotePaperMarketCredential, !credential.isExpired,
              let remotePhase = DeclaredPhase(rawValue: position.phase) else {
            errorMessage = "Refresh the shared PAPER_TEST ledger before withdrawing a position."
            return
        }
        let eligibility = PaperTradingPolicy.evaluate(phase: remotePhase, activity: .withdrawPosition)
        guard eligibility.isEligible, position.state == "OPEN" else {
            errorMessage = eligibility.reason
            return
        }
        guard !isRemotePaperMarketBusy else { return }
        isRemotePaperMarketBusy = true
        defer { isRemotePaperMarketBusy = false }
        do {
            let service = try PaperMarketService.configured()
            _ = try await service.withdrawPosition(id, credential: credential)
            _ = try? await ledger.append(
                severity: .warning,
                event: "PAPER_TEST_REMOTE_POSITION_WITHDRAWN authority=SERVER scope=PAPER_ONLY",
                declaredPhase: remotePhase
            )
            try await loadRemotePaperMarketSnapshot(using: service, credential: credential)
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadRemotePaperMarketSnapshot(
        using service: PaperMarketService,
        credential: PaperMarketDeviceCredential
    ) async throws {
        let snapshot = try await service.snapshot(credential: credential)
        remotePaperMarketSnapshot = snapshot
    }

    private func clearRemotePaperMarketPairing(with status: String) {
        try? PaperMarketCapabilityVault.removePairing()
        remotePaperMarketPairing = nil
        remotePaperMarketPairingStatus = nil
        remotePaperMarketStatus = status
    }

    /// Records an owner-authored observation in the current private universe
    /// core. Public-note drafts remain local until the owner later prepares a
    /// short-lived Community handoff and manually confirms publication. The
    /// text remains separate from the global ledger event.
    func recordObservation(
        text: String,
        visibility: ObservationNoteVisibility
    ) async {
        guard let declaration else {
            errorMessage = "Create a phase declaration before recording an observation."
            return
        }

        do {
            let note = try ObservationNote(
                universeCoreID: declaration.id,
                phase: declaration.phase,
                text: text,
                visibility: visibility
            )
            _ = try await ledger.append(
                severity: .info,
                event: "OBSERVATION_NOTE_RECORDED id=\(note.id.uuidString.uppercased()) visibility=\(visibility.rawValue) characters=\(note.text.count)",
                declaredPhase: declaration.phase
            )
            observationNotes.append(note)
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Stores a reusable local suggestion for the Community public profile. The
    /// Community site remains the authority that confirms the actual profile
    /// before a public note is published.
    func savePublicProfilePseudonym(_ source: String) async {
        do {
            publicProfilePseudonym = try PublicProfilePseudonym(source).value
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Sends only the selected public note's phase snapshot, text, and public
    /// pseudonym to a short-lived unlisted handoff. It intentionally excludes
    /// the universe core ID, declaration label, private notes, ledger rows,
    /// CloudKit state, market records, and gate state. A browser claim and
    /// explicit web confirmation are still required before publication.
    func preparePublicObservationPublication(noteID: UUID) async {
        guard !isPreparingPublicObservation else { return }
        isPreparingPublicObservation = true
        defer { isPreparingPublicObservation = false }

        guard let declaration else {
            errorMessage = "Create a phase declaration before preparing a public observation."
            return
        }
        guard let index = observationNotes.firstIndex(where: { $0.id == noteID }) else {
            errorMessage = "The selected observation is no longer available."
            return
        }
        let note = observationNotes[index]
        guard note.universeCoreID == declaration.id, note.visibility.isPublicNote else {
            errorMessage = "Only a public note from the active declaration can enter the publication flow."
            return
        }
        if let existingPublication = note.publicPublication {
            switch existingPublication.state {
            case .awaitingClaim, .claimed:
                if existingPublication.expiresAt <= .now {
                    do {
                        try await markPublicationExpired(at: index, note: note, publication: existingPublication)
                    } catch {
                        errorMessage = error.localizedDescription
                        return
                    }
                } else {
                    errorMessage = "This observation already has an active manual-publication handoff. Use its claim code or check its status."
                    return
                }
            case .published, .withdrawn, .hidden:
                errorMessage = "This observation already has a public publication record. Publish a new observation for a correction."
                return
            case .expired:
                break
            }
        }

        do {
            let pseudonym = try PublicProfilePseudonym(publicProfilePseudonym)
            let publisher = try CommunityObservationPublisher.configured()
            let prepared = try await publisher.prepare(note: note, author: pseudonym)
            try PublicObservationCapabilityVault.store(
                prepared.capability,
                for: prepared.publication.handoffID
            )
            publicObservationCapabilities[prepared.publication.handoffID] = prepared.capability
            observationNotes[index] = try note.replacingPublicPublication(prepared.publication)
            _ = try await ledger.append(
                severity: .info,
                event: "OBSERVATION_PUBLICATION_HANDOFF_CREATED note=\(note.id.uuidString.uppercased()) handoff=\(prepared.publication.handoffID.uuidString.uppercased()) characters=\(note.text.count) egress=\(HarshalDataEgressPolicy.version)",
                declaredPhase: note.phase
            )
            _ = try await ledger.append(
                severity: .info,
                event: "SCAV_CAPABILITY_STORED surface=PUBLIC_OBSERVATION_HANDOFF handoff=\(prepared.publication.handoffID.uuidString.uppercased()) expires=\(prepared.capability.expiresAt.timeIntervalSince1970)",
                declaredPhase: note.phase
            )
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Polls the status-only Keychain capability for a prepared public
    /// observation. The app marks the note Published only after the Community
    /// feed returns a public observation ID and URL; it never infers success
    /// from a browser claim code.
    func refreshPublicObservationPublication(noteID: UUID) async {
        guard let index = observationNotes.firstIndex(where: { $0.id == noteID }),
              let existingPublication = observationNotes[index].publicPublication else {
            errorMessage = "Prepare a public observation before checking its publication status."
            return
        }
        let note = observationNotes[index]

        do {
            if existingPublication.expiresAt <= .now {
                try await markPublicationExpired(at: index, note: note, publication: existingPublication)
                errorMessage = "The local handoff has expired. The note remains unpublished; prepare a fresh explicit handoff if needed."
                return
            }
            guard let capability = try activeCapability(for: existingPublication) else {
                errorMessage = "The local status capability is unavailable. The app will not infer publication or expiry; this handoff remains unconfirmed until its server expiry or a recovered browser review."
                return
            }

            let publisher = try CommunityObservationPublisher.configured()
            let refreshedPublication = try await publisher.refresh(
                existingPublication,
                capability: capability
            )

            switch refreshedPublication.state {
            case .awaitingClaim, .claimed:
                let retainedCapability = try capability.replacingExpiration(refreshedPublication.expiresAt)
                try PublicObservationCapabilityVault.store(
                    retainedCapability,
                    for: refreshedPublication.handoffID
                )
                publicObservationCapabilities[refreshedPublication.handoffID] = retainedCapability
            case .published, .withdrawn, .hidden, .expired:
                try PublicObservationCapabilityVault.remove(for: refreshedPublication.handoffID)
                publicObservationCapabilities.removeValue(forKey: refreshedPublication.handoffID)
                _ = try await ledger.append(
                    severity: .info,
                    event: "SCAV_CAPABILITY_REMOVED surface=PUBLIC_OBSERVATION_HANDOFF handoff=\(refreshedPublication.handoffID.uuidString.uppercased()) terminal=\(refreshedPublication.state.rawValue)",
                    declaredPhase: note.phase
                )
            }

            observationNotes[index] = try note.replacingPublicPublication(refreshedPublication)
            if refreshedPublication.state != existingPublication.state {
                let severity: LedgerSeverity
                switch refreshedPublication.state {
                case .published, .claimed:
                    severity = .info
                case .awaitingClaim, .withdrawn, .hidden, .expired:
                    severity = .warning
                }
                let publicID = refreshedPublication.publicObservationID?.uuidString.uppercased() ?? "NONE"
                _ = try await ledger.append(
                    severity: severity,
                    event: "OBSERVATION_PUBLICATION_STATUS note=\(note.id.uuidString.uppercased()) handoff=\(refreshedPublication.handoffID.uuidString.uppercased()) state=\(refreshedPublication.state.rawValue) publicID=\(publicID)",
                    declaredPhase: note.phase
                )
            }
            await refreshLedgerAndPersist()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// The browser claim code is only available while its Keychain-backed
    /// capability remains active. It is never read from persisted note data.
    func claimCode(for noteID: UUID) -> String? {
        guard let publication = observationNotes.first(where: { $0.id == noteID })?.publicPublication,
              publication.state == .awaitingClaim || publication.state == .claimed else {
            return nil
        }
        if let capability = publicObservationCapabilities[publication.handoffID] {
            return capability.claimCode
        }
        guard let capability = try? PublicObservationCapabilityVault.load(for: publication.handoffID) else {
            return nil
        }
        publicObservationCapabilities[publication.handoffID] = capability
        return capability.claimCode
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
        for publication in observationNotes.compactMap(\.publicPublication) {
            try? PublicObservationCapabilityVault.remove(for: publication.handoffID)
        }
        publicObservationCapabilities = [:]
        observationNotes = []
        // A reusable public pseudonym is not part of the private universe core.
        // Starting a new declaration clears local notes but cannot withdraw an
        // already-public remote note or cancel an unclaimed handoff; an
        // unclaimed handoff expires server-side after its short lifetime.
        persistCurrentState()
    }

    @discardableResult
    private func refreshLedgerAndPersist() async -> Bool {
        ledgerEntries = await ledger.snapshot()
        paperLedgerState = await paperLedger.snapshot()
        return persistCurrentState()
    }

    /// Persist a simulator account change through the encrypted local-state
    /// pipeline. Called by `MarketsOrbModel` after every validated action.
    func persistSimulatorAccount(_ account: TradingSimulator.Account) async {
        simulatorAccount = account
        _ = persistCurrentState()
    }

    @discardableResult
    private func persistCurrentState() -> Bool {
        let persisted = LocalStateStore.save(
            PersistedNativeState(
                declaration: declaration,
                receipt: receipt,
                ledgerEntries: ledgerEntries,
                paperLedgerState: paperLedgerState,
                observationNotes: observationNotes,
                publicProfilePseudonym: publicProfilePseudonym,
                simulatorAccount: simulatorAccount
            )
        )
        if persisted {
            didReportSecurePersistenceFailure = false
        } else if !didReportSecurePersistenceFailure {
            didReportSecurePersistenceFailure = true
            appendRecoveryError("Secure local state could not be saved. Do not assume current changes will survive a restart or serve as durable evidence.")
        }
        return persisted
    }

    /// Migrates capabilities written by pre-v2 builds into Keychain, then
    /// returns records with capability fields stripped. Missing Keychain state
    /// fails closed: a staged handoff can never be refreshed or claimed from a
    /// persisted plaintext token.
    private func migrateAndRestorePublicationCapabilities(
        from notes: [ObservationNote]
    ) throws -> [ObservationNote] {
        var restored: [ObservationNote] = []
        for originalNote in notes {
            guard let publication = originalNote.publicPublication else {
                restored.append(originalNote)
                continue
            }

            switch publication.state {
            case .awaitingClaim, .claimed:
                if let legacyStatusToken = publication.statusToken,
                   let legacyClaimCode = publication.claimCode {
                    do {
                        let legacyCapability = try PublicObservationHandoffCapability(
                            claimCode: legacyClaimCode,
                            statusToken: legacyStatusToken,
                            expiresAt: publication.expiresAt
                        )
                        try PublicObservationCapabilityVault.store(
                            legacyCapability,
                            for: publication.handoffID
                        )
                    } catch {
                        appendRecoveryError("A legacy public-observation capability could not be moved into secure storage. Its staged handoff remains unpublished and cannot be refreshed from this device.")
                    }
                }

                do {
                    if let capability = try PublicObservationCapabilityVault.load(for: publication.handoffID) {
                        publicObservationCapabilities[publication.handoffID] = capability
                    } else if publication.expiresAt > .now {
                        appendRecoveryError("An active public-observation handoff has no secure local capability. It remains unpublished; prepare a fresh explicit handoff if needed.")
                    }
                } catch {
                    appendRecoveryError("A public-observation capability could not be recovered from secure storage. The handoff remains unpublished on this device.")
                }

            case .published, .withdrawn, .hidden, .expired:
                try? PublicObservationCapabilityVault.remove(for: publication.handoffID)
                publicObservationCapabilities.removeValue(forKey: publication.handoffID)
            }

            let redactedPublication = try publication.strippingLocalCapabilities()
            restored.append(try originalNote.replacingPublicPublication(redactedPublication))
        }
        return restored
    }

    private func activeCapability(
        for publication: PublicObservationPublication
    ) throws -> PublicObservationHandoffCapability? {
        guard publication.state == .awaitingClaim || publication.state == .claimed,
              publication.expiresAt > .now else {
            try? PublicObservationCapabilityVault.remove(for: publication.handoffID)
            publicObservationCapabilities.removeValue(forKey: publication.handoffID)
            return nil
        }
        if let capability = publicObservationCapabilities[publication.handoffID] {
            return capability
        }
        let capability = try PublicObservationCapabilityVault.load(for: publication.handoffID)
        if let capability {
            publicObservationCapabilities[publication.handoffID] = capability
        }
        return capability
    }

    private func markPublicationExpired(
        at index: Int,
        note: ObservationNote,
        publication: PublicObservationPublication
    ) async throws {
        guard publication.state == .awaitingClaim || publication.state == .claimed else {
            return
        }
        try PublicObservationCapabilityVault.remove(for: publication.handoffID)
        publicObservationCapabilities.removeValue(forKey: publication.handoffID)
        let expired = try PublicObservationPublication(
            handoffID: publication.handoffID,
            author: publication.author,
            publisherURL: publication.publisherURL,
            expiresAt: publication.expiresAt,
            state: .expired
        )
        observationNotes[index] = try note.replacingPublicPublication(expired)
        _ = try await ledger.append(
            severity: .warning,
            event: "SCAV_CAPABILITY_EXPIRED surface=PUBLIC_OBSERVATION_HANDOFF handoff=\(publication.handoffID.uuidString.uppercased())",
            declaredPhase: note.phase
        )
        await refreshLedgerAndPersist()
    }

    private func validateRecoveredNotes(
        _ notes: [ObservationNote],
        declaration: PhaseDeclaration?
    ) throws {
        guard let declaration else {
            guard notes.isEmpty else {
                throw ObservationNoteError.invalidText
            }
            return
        }
        var identifiers = Set<UUID>()
        for note in notes {
            try note.validate()
            guard note.universeCoreID == declaration.id,
                  identifiers.insert(note.id).inserted else {
                throw ObservationNoteError.invalidText
            }
        }
    }

    private func appendRecoveryError(_ message: String) {
        if let errorMessage {
            self.errorMessage = "\(errorMessage)\n\n\(message)"
        } else {
            errorMessage = message
        }
    }

    private func decimalString(_ value: Decimal) -> String {
        NSDecimalNumber(decimal: value).stringValue
    }
}
