// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "HarshalLedger",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "HarshalLedger", targets: ["HarshalLedger"])
    ],
    dependencies: [
        .package(path: "../HarshalCore")
    ],
    targets: [
        .target(
            name: "HarshalLedger",
            dependencies: ["HarshalCore"]
        ),
        .testTarget(
            name: "HarshalLedgerTests",
            dependencies: ["HarshalLedger", "HarshalCore"]
        )
    ]
)
