// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "NeoOrb",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "NeoOrb", targets: ["NeoOrb"])
    ],
    targets: [
        .target(name: "NeoOrb"),
        .testTarget(name: "NeoOrbTests", dependencies: ["NeoOrb"])
    ]
)
