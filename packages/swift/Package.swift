// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "HypervideoVideo",
    platforms: [
        .iOS(.v14)
    ],
    products: [
        .library(
            name: "HypervideoVideo",
            targets: ["HypervideoVideo"]),
    ],
    targets: [
        .target(
            name: "HypervideoVideo",
            dependencies: [],
            path: "Sources/HypervideoVideo"
        ),
    ]
)
