/* Apple separation: Apple-platform code is classified AVOID (caustic · compromised).
   It lives only under AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED/, and nothing on the
   supported side (website, Worker, scripts, tests, CI, deploy allowlist) may depend on it. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AVOID = "AVOID-APPLE-ECOSYSTEM-CAUSTIC-COMPROMISED";
const SELF = "tests/apple-separation-test.mjs";

const tracked = spawnSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" });
assert.equal(tracked.status, 0, tracked.stderr || "git ls-files should succeed");
const files = tracked.stdout.split("\0").filter(Boolean);

/* Apple-platform source, project, and packaging formats. */
const APPLE_FORMAT = /(Info\.plist$|\.swift|\.xcodeproj\/|\.xcworkspace\/|\.xcscheme|\.pbxproj|\.entitlements|\.storyboard|\.xib|\.xcassets\/)/i;

/* Supported surface: anything the website, the Worker, the build, the tests, or CI can touch. */
const SUPPORTED_ROOTS = ["js/", "css/", "worker/", "scripts/", "tests/", "migrations/", ".github/"];
const SUPPORTED_FILES = ["index.html", "about.html", "account.html", "audits.html", "observations.html", "serve.js", "package.json", "wrangler.jsonc", "wrangler.staging.jsonc", ".assetsignore", ".gitignore"];
const isSupported = file => SUPPORTED_FILES.includes(file) || SUPPORTED_ROOTS.some(root => file.startsWith(root));

/* Tokens that mean "this depends on Apple's platform". Negative boundary prose
   such as "no CloudKit record" is deliberately not matched. */
const APPLE_TOKENS = /apple-touch-icon|apple-mobile-web-app|SwiftUI|WatchConnectivity|xcodebuild|xcrun|codesign|HKHealthStore|HarshalNativeWatch|runs-on:\s*macos|AVOID-APPLE-ECOSYSTEM/;

test("Apple-platform source and project files exist only under the AVOID folder", () => {
  const stray = files.filter(file => APPLE_FORMAT.test(file) && !file.startsWith(`${AVOID}/`));
  assert.deepEqual(stray, [], "Apple-platform files must stay inside the AVOID folder");
});

test("the AVOID folder is labelled caustic, compromised, and avoid", async () => {
  const label = await readFile(path.join(ROOT, AVOID, "README.md"), "utf8");
  for (const word of ["AVOID", "CAUSTIC", "COMPROMISED", "Do not build", "Nothing outside this folder may depend on it"]) {
    assert.ok(label.includes(word), `label must state: ${word}`);
  }
});

test("the supported side never references Apple tooling or the quarantined path", () => {
  const offenders = [];
  for (const file of files) {
    if (file === SELF || !isSupported(file)) continue;
    const abs = path.join(ROOT, file);
    if (!existsSync(abs)) continue;
    const text = readFileSync(abs, "utf8");
    const match = text.match(APPLE_TOKENS);
    if (match) offenders.push(`${file}: ${match[0]}`);
  }
  assert.deepEqual(offenders, [], "the website, Worker, scripts, tests, and CI must not depend on Apple tooling");
});

test("the website ships no Apple home-screen icon", () => {
  assert.equal(existsSync(path.join(ROOT, "assets/apple-touch-icon.png")), false);
  const html = readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.equal(/apple-touch-icon/i.test(html), false);
  assert.ok(existsSync(path.join(ROOT, AVOID, "apple-web-artifacts/apple-touch-icon.png")), "the icon is kept, labelled, under AVOID");
});

test("the README and SECURITY classify the Apple work as AVOID", () => {
  const readme = readFileSync(path.join(ROOT, "README.md"), "utf8");
  const security = readFileSync(path.join(ROOT, "SECURITY.md"), "utf8");
  assert.ok(readme.includes(`${AVOID}/README.md`), "README points at the labelled folder");
  assert.ok(/AVOID \(caustic · compromised\)/.test(readme), "README states the classification");
  assert.ok(security.includes("classified AVOID"), "SECURITY states the classification");
});
