// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "HarshalMarkets",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "HarshalMarkets", targets: ["HarshalMarkets"])
    ],
    dependencies: [
        .package(path: "../HarshalCore")
    ],
    targets: [
        .target(
            name: "HarshalMarkets",
            dependencies: ["HarshalCore"]
        ),
        .testTarget(
            name: "HarshalMarketsTests",
            dependencies: ["HarshalMarkets", "HarshalCore"]
        )
    ]
)
