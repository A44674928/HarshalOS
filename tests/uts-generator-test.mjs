import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SCRIPT_DIR = path.join(ROOT, "updates/2026-10-02/02-Frameworks/Universal-Timekeeping-System");
const SCRIPT = path.join(SCRIPT_DIR, "uts_generator.py");

function runPython(args) {
  const result = spawnSync(process.env.PYTHON || "python3", args, { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

test("Book I Part XX keeps corrected UTS units separate from Earth-year narrative dates", () => {
  const part = readFileSync(path.join(ROOT, "docs/harshal-systems/20-supply-chain.md"), "utf8");
  assert.match(part, /Entry Title: The Universal Timekeeping System \(Corrected Reference, 2026-10-02\)/);
  assert.match(part, /Universal Day \(UDay\) = 24 UH = 86,400 US/);
  assert.match(part, /narrative-date clarification/i);
  assert.match(part, /13\.800000 billion Earth Julian years after the Big Bang/);
  assert.doesNotMatch(part, /13\.800000 UY/);
  assert.doesNotMatch(part, /13\.800 - 13\.805 Billion UY/);
});

test("UTS timestamp is anchored in approximate Universal Years, not overloaded UDay", () => {
  const output = runPython([SCRIPT, "--date", "2026-10-02T00:00:00Z"]);
  assert.match(output, /Earth UTC:\s+2026-10-02 00:00:00/);
  assert.match(output, /UDate 4136836127942000000\.000000 UY since Big Bang/);
  assert.match(output, /Model note: epoch age is approximate/);

  const offsetOutput = runPython([SCRIPT, "--date", "2026-10-02T12:00:00-07:00", "--precision", "compact"]);
  assert.match(offsetOutput, /Earth UTC:\s+2026-10-02 19:00:00/);
  assert.match(offsetOutput, /UDate 4136836127942649789\.721880 UY/);
});

test("Python duration helpers preserve the corrected c-based conversion", () => {
  const code = [
    "import sys",
    "sys.path.insert(0, sys.argv[1])",
    "import uts_generator as u",
    "print(u.earth_to_uts(1)['US'])",
    "print(u.uts_to_earth(31_557_600 * 299_792_458)['seconds'])",
    "print(u.earth_to_uts(1)['UY'])"
  ].join("; ");
  const output = runPython(["-c", code, SCRIPT_DIR]).trim().split(/\r?\n/);
  assert.equal(output[0], "299792458");
  assert.equal(output[1], "31557600");
  assert.ok(Math.abs(Number(output[2]) - 9.499849735087586) < 1e-12);
});

test("file timestamp replacement updates only the generated UTS front matter", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "harshalos-uts-test-"));
  try {
    const file = path.join(dir, "fixture.md");
    writeFileSync(file, "# Kept body\n\nThis text stays exactly once.\n", "utf8");
    const epoch = new Date("2026-10-02T00:00:00Z");
    utimesSync(file, epoch, epoch);
    runPython([SCRIPT, "--file", file, "--format", "prepend"]);
    let text = readFileSync(file, "utf8");
    assert.match(text, /UTS Timestamp: UDate 4136836127942000000\.000000 UY/);
    assert.equal((text.match(/This text stays exactly once\./g) || []).length, 1);

    runPython([SCRIPT, "--file", file, "--format", "replace"]);
    text = readFileSync(file, "utf8");
    assert.equal((text.match(/UTS Timestamp:/g) || []).length, 1);
    assert.equal((text.match(/This text stays exactly once\./g) || []).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
