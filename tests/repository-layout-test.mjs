import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { access, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SITE = path.join(ROOT, ".site-assets");
const exists = async file => access(file).then(() => true, () => false);

async function listFiles(directory, prefix = "") {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) output.push(...await listFiles(path.join(directory, entry.name), relative));
    else if (entry.isFile()) output.push(relative);
  }
  return output;
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

function waitForPreview(child) {
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
  child.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`preview server did not start; stderr: ${stderr}`)), 5000);
    const ready = () => {
      if (!stdout.includes("HarshalOS static server")) return;
      clearTimeout(timeout);
      resolve();
    };
    child.stdout.on("data", ready);
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`preview server exited before listening (${code ?? signal}); stderr: ${stderr}`));
    });
  });
}

test("P13: repository content is separated by status and purpose", async () => {
  const expected = [
    "specs/normative/ground-0-v1.0.md",
    "specs/draft/ground-0-v1.1.md",
    "docs/deployment/MONGODB-SETUP.md",
    "docs/source-material/Ground-0 Phase Detection Algorithm.md",
    "docs/REPOSITORY-STRUCTURE.md",
    "case-studies/GROUND-0 CASE STUDY - Anthropic.md",
    "case-studies/GROUND-0 CASE STUDY - OpenAI.md",
    "research/reports/Research_report_Anthropic_Compliance_and_Enforcement_Mechani.md",
    "archives/ground-0/ground-0-phase-detection-algorithm.zip",
    "archives/ground-0/ground-0-phase-detection-algorithm-2.zip",
    "tests/kernel-api-test.mjs",
    "tests/repository-layout-test.mjs"
  ];
  for (const relative of expected) assert.equal(await exists(path.join(ROOT, relative)), true, `expected organized path: ${relative}`);
  for (const legacy of [
    "specs/ground-0-v1.0.md",
    "specs/ground-0-v1.1.md",
    "MONGODB-SETUP.md",
    "GROUND-0 CASE STUDY - Anthropic.md",
    "GROUND-0 CASE STUDY - OpenAI.md",
    "Research_report_Anthropic_Compliance_and_Enforcement_Mechani.md",
    "ground-0-phase-detection-algorithm.zip",
    "scripts/kernel-api-test.mjs"
  ]) assert.equal(await exists(path.join(ROOT, legacy)), false, `legacy root/script path should be retired: ${legacy}`);
});

test("P13: public asset staging includes only runtime assets and the normative/draft specs", async () => {
  try {
    const result = spawnSync(process.execPath, ["scripts/prepare-assets.mjs"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 30000
    });
    assert.equal(result.error, undefined, result.error && result.error.message);
    assert.equal(result.status, 0, `${result.stdout || ""}\n${result.stderr || ""}`);

    const topLevel = (await readdir(SITE)).sort();
    assert.deepEqual(topLevel, ["about.html", "assets", "css", "index.html", "js", "specs"]);

    const specFiles = (await listFiles(path.join(SITE, "specs"), "specs")).sort();
    assert.deepEqual(specFiles, [
      "specs/draft/ground-0-v1.1.md",
      "specs/normative/ground-0-v1.0.md"
    ]);

    for (const excluded of ["docs", "case-studies", "research", "archives", "tests", "scripts", "worker", "Business Plan", "SECURITY.md", "README.md"]) {
      assert.equal(await exists(path.join(SITE, excluded)), false, `repository-only content must not be staged: ${excluded}`);
    }
  } finally {
    await rm(SITE, { recursive: true, force: true });
  }
});

test("P13: local preview serves the new spec paths and keeps repository documents private", async () => {
  const port = await reservePort();
  const child = spawn(process.execPath, ["serve.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  try {
    await waitForPreview(child);
    const base = `http://127.0.0.1:${port}`;
    for (const [pathname, marker] of [
      ["/specs/normative/ground-0-v1.0.md", "Ground-0 Phase Detection Algorithm"],
      ["/specs/draft/ground-0-v1.1.md", "Proposed amendment"]
    ]) {
      const response = await fetch(`${base}${pathname}`);
      assert.equal(response.status, 200, `${pathname} should be served`);
      assert.match(response.headers.get("content-type"), /text\/markdown/);
      assert.ok((await response.text()).includes(marker), `${pathname} should return its actual spec content`);
    }
    for (const pathname of [
      "/docs/REPOSITORY-STRUCTURE.md",
      "/tests/repository-layout-test.mjs",
      "/specs/source-material.md"
    ]) {
      const response = await fetch(`${base}${pathname}`);
      assert.equal(response.status, 404, `${pathname} must stay outside the public preview allowlist`);
    }
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const stopped = once(child, "exit").catch(() => {});
      child.kill("SIGTERM");
      await stopped;
    }
  }
});
