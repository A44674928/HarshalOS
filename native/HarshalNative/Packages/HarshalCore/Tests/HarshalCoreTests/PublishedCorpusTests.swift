import XCTest
@testable import HarshalCore

final class PublishedCorpusTests: XCTestCase {
    func testPublishedAndNightReadingEditionsRemainSeparateArtifacts() {
        let published = AGSv02LibraryEdition.published
        let night = AGSv02LibraryEdition.nightReading

        XCTAssertEqual(AGSv02LibraryEdition.allCases.count, 2)
        XCTAssertTrue(published.isExactPublishedArtifact)
        XCTAssertFalse(night.isExactPublishedArtifact)
        XCTAssertEqual(published.classification, "EXACT_PUBLISHED_ARTIFACT")
        XCTAssertEqual(night.classification, "PRESENTATION_ONLY_DERIVATIVE")
        XCTAssertEqual(published.expectedPageCount, AGSv02PublishedCorpus.pdfPageCount)
        XCTAssertEqual(night.expectedPageCount, AGSv02PublishedCorpus.pdfPageCount)
        XCTAssertEqual(published.artifactPath, AGSv02PublishedCorpus.sourceArtifactPath)
        XCTAssertNotEqual(published.artifactPath, night.artifactPath)
        XCTAssertNotEqual(published.resourceName, night.resourceName)
        XCTAssertNotEqual(published.expectedSHA256, night.expectedSHA256)
    }

    func testNightReadingEditionHasTheRecordedDerivativeChecksum() {
        XCTAssertEqual(
            AGSv02LibraryEdition.nightReading.expectedSHA256,
            "cd46c3c47aea1deb2e54dd32ebc324e3f1ce6106c13a6eeb9b3ccec07e348f7c"
        )
        XCTAssertTrue(AGSv02LibraryEdition.nightReading.integrityBoundary.contains("does not supersede"))
    }
}
