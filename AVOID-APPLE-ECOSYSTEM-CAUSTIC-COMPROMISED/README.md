# AVOID — Apple ecosystem — CAUSTIC · COMPROMISED

**Classification: AVOID.** Everything in this folder belongs to Apple's platform ecosystem
(Swift, SwiftUI, Xcode, iOS / iPadOS / macOS / watchOS, CloudKit, the Keychain, and Apple-only
web artifacts). It is classified caustic and compromised. It is kept here for the record only.

## What is in here

| Path | What it is |
| --- | --- |
| [`apple-swift-native/`](apple-swift-native/) | The Swift / SwiftUI app, its Watch companion, Xcode projects, and its Swift packages. |
| [`NOTE-APPLE-WATCH.md`](NOTE-APPLE-WATCH.md) | Why HarshalOS does not use Apple Watches. |
| [`apple-web-artifacts/`](apple-web-artifacts/) | `apple-touch-icon.png`, the iOS home-screen icon. It was removed from the website's `index.html`. |

## Rules

1. **Do not build, test, deploy, or extend anything in this folder.** It has no CI job and no test suite.
2. **Nothing outside this folder may depend on it.** The website, the Cloudflare Worker, the scripts, the tests, and the deploy allowlist must not import from it or reference Swift, SwiftUI, Xcode, watchOS, CloudKit, or Apple-only tooling. `tests/apple-separation-test.mjs` enforces this.
3. **Do not copy code out of it** into the browser app, the Worker, or any shared package.
4. Git history keeps every file. Deleting it is not required, and it is not done here.

This label is a classification of the repository layout. It makes no claim about any person,
product, or organisation beyond the stated engineering and security judgement.
