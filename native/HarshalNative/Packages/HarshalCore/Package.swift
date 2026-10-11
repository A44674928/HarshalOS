// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "HarshalCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "HarshalCore", targets: ["HarshalCore"])
    ],
    targets: [
        .target(name: "HarshalCore"),
        .testTarget(name: "HarshalCoreTests", dependencies: ["HarshalCore"])
    ]
)
