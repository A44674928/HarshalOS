// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "HarshalFlame",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "HarshalFlame", targets: ["HarshalFlame"])
    ],
    targets: [
        .target(
            name: "HarshalFlame",
            resources: [
                .copy("Resources/Demo.flame"),
                .copy("Resources/OuterOrb.flame")
            ]
        ),
        .testTarget(
            name: "HarshalFlameTests",
            dependencies: ["HarshalFlame"]
        )
    ]
)
