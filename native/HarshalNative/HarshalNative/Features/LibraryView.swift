import Combine
import CryptoKit
import Foundation
import HarshalCore
import PDFKit
import SwiftUI

#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

/// Read-only native Library for the exact published AGS v0.2 KDP interior and
/// its explicitly classified Night Reading Edition. Each local PDF is verified
/// against its own bundled-artifact checksum before display; repository
/// companions open through the platform browser rather than a web wrapper or
/// remote content fetch inside the app.
struct LibraryView: View {
    let isPreview: Bool

    @StateObject private var reader = LibraryBookReaderModel()
    @State private var selectedEdition: AGSv02LibraryEdition = .published
    @State private var selectedSectionID: String? = "FRONT-MATTER"
    @State private var requestedPage = "1"

    init(isPreview: Bool = false) {
        self.isPreview = isPreview
    }

    var body: some View {
        NavigationSplitView {
            List(selection: $selectedSectionID) {
                Section("Reading edition") {
                    Picker("Edition", selection: $selectedEdition) {
                        ForEach(AGSv02LibraryEdition.allCases) { edition in
                            Label(edition.title, systemImage: edition.symbolName)
                                .tag(edition)
                        }
                    }
                    .pickerStyle(.inline)

                    VStack(alignment: .leading, spacing: 5) {
                        Text(selectedEdition.classification)
                            .font(.caption.monospaced().weight(.semibold))
                            .foregroundStyle(HarshalTheme.electricBlue)
                        Text(selectedEdition.summary)
                            .font(.caption)
                            .foregroundStyle(HarshalTheme.secondaryText)
                        Text(selectedEdition.integrityBoundary)
                            .font(.caption)
                            .foregroundStyle(HarshalTheme.warning)
                    }
                    .padding(.vertical, 3)
                }

                Section("AGS v0.2 source corpus") {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(AGSv02PublishedCorpus.title)
                            .font(.headline)
                        Text(AGSv02PublishedCorpus.edition)
                            .font(.caption)
                            .foregroundStyle(HarshalTheme.secondaryText)
                        Text("548-page local, read-only source navigation")
                            .font(.caption)
                            .foregroundStyle(HarshalTheme.electricBlue)
                    }
                    .padding(.vertical, 3)
                }

                Section("Book navigation") {
                    ForEach(AGSv02PublishedCorpus.sections) { section in
                        LibrarySectionRow(section: section)
                            .tag(section.id)
                    }
                }

                Section("Repository companions") {
                    Text(HarshalRepositoryCompanionCatalog.summary)
                        .font(.caption)
                        .foregroundStyle(HarshalTheme.secondaryText)

                    ForEach(HarshalRepositoryCompanionCatalog.entries) { companion in
                        if let url = companion.githubURL {
                            Link(destination: url) {
                                RepositoryCompanionRow(companion: companion)
                            }
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(HarshalTheme.canvas)
            .navigationTitle("Library")
            .onChange(of: selectedEdition) { _, edition in
                reader.select(edition)
                requestedPage = "\(reader.currentPageIndex + 1)"
            }
            .onChange(of: selectedSectionID) { _, identifier in
                guard let identifier,
                      let section = AGSv02PublishedCorpus.section(identifier) else {
                    return
                }
                reader.go(to: section)
                requestedPage = "\(section.pdfStartPage)"
            }
        } detail: {
            readerDetail
        }
        .navigationSplitViewStyle(.balanced)
    }

    @ViewBuilder
    private var readerDetail: some View {
        if let document = reader.document {
            VStack(spacing: 0) {
                readerControls

                NativePDFDocumentView(
                    document: document,
                    currentPageIndex: Binding(
                        get: { reader.currentPageIndex },
                        set: { reader.recordDisplayedPage($0) }
                    )
                )
                .accessibilityLabel("\(reader.edition.title) AGS v0.2 book reader")
            }
            .navigationTitle(isPreview ? "Library preview" : reader.edition.title)
            .navigationBarTitleDisplayMode(.inline)
        } else {
            ContentUnavailableView(
                "\(reader.edition.title) unavailable",
                systemImage: reader.edition.symbolName,
                description: Text(reader.issue ?? "The selected bundled AGS v0.2 edition is not available in this build.")
            )
            .overlay(alignment: .bottom) {
                Button("Retry bundled edition") {
                    reader.reloadBundledBook()
                }
                .buttonStyle(.bordered)
                .padding()
            }
            .navigationTitle("Library")
        }
    }

    private var readerControls: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Label(reader.edition.title, systemImage: reader.edition.symbolName)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(HarshalTheme.electricBlue)
                Text(reader.edition.classification)
                    .font(.caption.monospaced())
                    .foregroundStyle(HarshalTheme.secondaryText)
                Spacer(minLength: 8)
            }

            HStack(spacing: 12) {
                Button {
                    reader.goToPreviousPage()
                    requestedPage = "\(reader.currentPageIndex + 1)"
                } label: {
                    Label("Previous page", systemImage: "chevron.left")
                }
                .disabled(!reader.canGoToPreviousPage)

                Button {
                    reader.goToNextPage()
                    requestedPage = "\(reader.currentPageIndex + 1)"
                } label: {
                    Label("Next page", systemImage: "chevron.right")
                }
                .disabled(!reader.canGoToNextPage)

                Spacer(minLength: 8)

                Text("Page \(reader.currentPageIndex + 1) of \(reader.pageCount)")
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(HarshalTheme.secondaryText)
            }

            HStack(spacing: 8) {
                if let section = reader.currentSection {
                    Label(section.id, systemImage: "bookmark")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(HarshalTheme.electricBlue)
                    Text(section.title)
                        .font(.caption)
                        .lineLimit(1)
                        .foregroundStyle(HarshalTheme.secondaryText)
                }

                Spacer(minLength: 8)

                TextField("PDF page", text: $requestedPage)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 88)
#if os(iOS)
                    .keyboardType(.numberPad)
#endif
                Button("Go") {
                    let page = Int(requestedPage) ?? reader.currentPageIndex + 1
                    reader.go(toPDFPage: page)
                    requestedPage = "\(reader.currentPageIndex + 1)"
                }
                .buttonStyle(.bordered)
            }

            HStack(alignment: .top, spacing: 8) {
                Image(systemName: reader.isSourceVerified ? "checkmark.seal.fill" : "exclamationmark.triangle.fill")
                    .foregroundStyle(reader.isSourceVerified ? HarshalTheme.verified : HarshalTheme.warning)
                Text(reader.sourceStatus)
                    .font(.caption)
                    .foregroundStyle(HarshalTheme.secondaryText)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(HarshalTheme.elevatedSurface)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(HarshalTheme.panelStroke.opacity(0.7))
                .frame(height: 1)
        }
        .accessibilityElement(children: .contain)
    }
}

private struct LibrarySectionRow: View {
    let section: AGSv02CorpusSection

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(section.id)
                .font(.caption.monospaced().weight(.semibold))
                .foregroundStyle(HarshalTheme.electricBlue)
            Text(section.title)
                .font(.subheadline.weight(.medium))
                .lineLimit(2)
            Text("Print p. \(section.printedStartPage) · PDF p. \(section.pdfStartPage)")
                .font(.caption)
                .foregroundStyle(HarshalTheme.secondaryText)
            Text(section.nativeDisposition.label)
                .font(.caption)
                .foregroundStyle(HarshalTheme.warning)
        }
        .padding(.vertical, 2)
        .accessibilityLabel("\(section.id), \(section.title), PDF page \(section.pdfStartPage), \(section.nativeDisposition.label)")
    }
}

private struct RepositoryCompanionRow: View {
    let companion: HarshalRepositoryCompanion

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: 3) {
                Text(companion.title)
                    .font(.subheadline.weight(.medium))
                Text(companion.repositoryPath)
                    .font(.caption.monospaced())
                    .foregroundStyle(HarshalTheme.electricBlue)
                    .lineLimit(1)
                Text(companion.summary)
                    .font(.caption)
                    .foregroundStyle(HarshalTheme.secondaryText)
                    .lineLimit(2)
                Text(companion.boundary)
                    .font(.caption)
                    .foregroundStyle(HarshalTheme.warning)
                    .lineLimit(2)
            }
            Spacer(minLength: 4)
            Image(systemName: "arrow.up.right.square")
                .foregroundStyle(HarshalTheme.secondaryText)
        }
        .padding(.vertical, 2)
        .accessibilityLabel("Open GitHub companion: \(companion.title)")
    }
}

@MainActor
private final class LibraryBookReaderModel: ObservableObject {
    @Published private(set) var document: PDFDocument?
    @Published private(set) var edition: AGSv02LibraryEdition = .published
    @Published private(set) var currentPageIndex = 0
    @Published private(set) var issue: String?
    @Published private(set) var isSourceVerified = false

    init() {
        reloadBundledBook()
    }

    var pageCount: Int {
        document?.pageCount ?? edition.expectedPageCount
    }

    var canGoToPreviousPage: Bool {
        currentPageIndex > 0
    }

    var canGoToNextPage: Bool {
        currentPageIndex < pageCount - 1
    }

    var currentSection: AGSv02CorpusSection? {
        let displayedPage = currentPageIndex + 1
        return AGSv02PublishedCorpus.sections.last { $0.pdfStartPage <= displayedPage }
    }

    var sourceStatus: String {
        guard isSourceVerified else {
            return issue ?? "Bundled-edition verification has not completed."
        }

        switch edition {
        case .published:
            return "Exact published KDP source verified against the AGS v0.2 publication checksum. This read-only reader does not execute text or grant authority."
        case .nightReading:
            return "Night Reading Edition verified against its own bundled derivative checksum. It preserves the 548-page source map for local reading, but is a presentation-only derivative and not the exact published KDP artifact."
        }
    }

    func select(_ newEdition: AGSv02LibraryEdition) {
        guard newEdition != edition else { return }
        let preservedPageIndex = currentPageIndex
        edition = newEdition
        reloadBundledBook(restoringPageIndex: preservedPageIndex)
    }

    func reloadBundledBook() {
        reloadBundledBook(restoringPageIndex: currentPageIndex)
    }

    private func reloadBundledBook(restoringPageIndex: Int) {
        document = nil
        isSourceVerified = false
        issue = nil

        let activeEdition = edition
        guard let url = Bundle.main.url(forResource: activeEdition.resourceName, withExtension: "pdf") else {
            issue = "The \(activeEdition.title) PDF resource is missing. Confirm that this edition is included in both app targets."
            return
        }

        do {
            let data = try Data(contentsOf: url, options: .mappedIfSafe)
            let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
            guard digest == activeEdition.expectedSHA256 else {
                issue = "The bundled \(activeEdition.title) did not match its expected checksum, so the reader will not open it."
                return
            }
            guard let document = PDFDocument(url: url) else {
                issue = "The bundled \(activeEdition.title) could not be opened as a PDF document."
                return
            }
            guard document.pageCount == activeEdition.expectedPageCount else {
                issue = "The bundled \(activeEdition.title) has \(document.pageCount) pages; this edition requires \(activeEdition.expectedPageCount)."
                return
            }

            self.document = document
            currentPageIndex = min(max(restoringPageIndex, 0), document.pageCount - 1)
            isSourceVerified = true
        } catch {
            issue = "The bundled \(activeEdition.title) could not be read: \(error.localizedDescription)"
        }
    }

    func go(to section: AGSv02CorpusSection) {
        go(toPDFPage: section.pdfStartPage)
    }

    func go(toPDFPage displayedPage: Int) {
        let boundedPage = min(max(displayedPage, 1), pageCount)
        currentPageIndex = boundedPage - 1
    }

    func goToPreviousPage() {
        guard canGoToPreviousPage else { return }
        currentPageIndex -= 1
    }

    func goToNextPage() {
        guard canGoToNextPage else { return }
        currentPageIndex += 1
    }

    func recordDisplayedPage(_ index: Int) {
        guard index >= 0, index < pageCount, currentPageIndex != index else { return }
        currentPageIndex = index
    }
}
#if os(iOS)
private struct NativePDFDocumentView: UIViewRepresentable {
    let document: PDFDocument
    @Binding var currentPageIndex: Int

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        configure(view)
        context.coordinator.startObserving(view)
        return view
    }

    func updateUIView(_ uiView: PDFView, context: Context) {
        context.coordinator.parent = self
        if uiView.document !== document {
            uiView.document = document
        }
        guard let page = document.page(at: currentPageIndex), uiView.currentPage !== page else { return }
        uiView.go(to: page)
    }

    private func configure(_ view: PDFView) {
        view.document = document
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.displayDirection = .vertical
        view.displaysPageBreaks = true
        view.pageBreakMargins = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        view.backgroundColor = .black
    }

    final class Coordinator {
        var parent: NativePDFDocumentView
        private var pageObserver: NSObjectProtocol?

        init(parent: NativePDFDocumentView) {
            self.parent = parent
        }

        deinit {
            if let pageObserver {
                NotificationCenter.default.removeObserver(pageObserver)
            }
        }

        func startObserving(_ view: PDFView) {
            pageObserver = NotificationCenter.default.addObserver(
                forName: .PDFViewPageChanged,
                object: view,
                queue: .main
            ) { [weak self, weak view] _ in
                guard let self,
                      let view,
                      let document = view.document,
                      let page = view.currentPage else {
                    return
                }
                self.parent.currentPageIndex = document.index(for: page)
            }
        }
    }
}
#elseif os(macOS)
private struct NativePDFDocumentView: NSViewRepresentable {
    let document: PDFDocument
    @Binding var currentPageIndex: Int

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeNSView(context: Context) -> PDFView {
        let view = PDFView()
        configure(view)
        context.coordinator.startObserving(view)
        return view
    }

    func updateNSView(_ nsView: PDFView, context: Context) {
        context.coordinator.parent = self
        if nsView.document !== document {
            nsView.document = document
        }
        guard let page = document.page(at: currentPageIndex), nsView.currentPage !== page else { return }
        nsView.go(to: page)
    }

    private func configure(_ view: PDFView) {
        view.document = document
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.displayDirection = .vertical
        view.displaysPageBreaks = true
        view.pageBreakMargins = NSEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        view.backgroundColor = .black
    }

    final class Coordinator {
        var parent: NativePDFDocumentView
        private var pageObserver: NSObjectProtocol?

        init(parent: NativePDFDocumentView) {
            self.parent = parent
        }

        deinit {
            if let pageObserver {
                NotificationCenter.default.removeObserver(pageObserver)
            }
        }

        func startObserving(_ view: PDFView) {
            pageObserver = NotificationCenter.default.addObserver(
                forName: .PDFViewPageChanged,
                object: view,
                queue: .main
            ) { [weak self, weak view] _ in
                guard let self,
                      let view,
                      let document = view.document,
                      let page = view.currentPage else {
                    return
                }
                self.parent.currentPageIndex = document.index(for: page)
            }
        }
    }
}
#endif
