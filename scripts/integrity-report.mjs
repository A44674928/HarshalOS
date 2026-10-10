#!/usr/bin/env node
/*
 * Run the complete regression suite, named subsystem suites, and deployment
 * dry-run. Print a compact report locally and append the same Markdown to the
 * GitHub Actions job summary when GITHUB_STEP_SUMMARY is available.
 */
import { appendFileSync, readdirSync } from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TESTS_DIR = path.join(ROOT, "tests");
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

const SUITES = [
  { area: "Production config and hidden-path safeguards", script: "test:production", files: ["production-config-test.mjs", "worker-routing-security-test.mjs"] },
  { area: "Staging target isolation", script: "test:staging", files: ["staging-config-test.mjs"] },
  {
    area: "D1 community database and OIDC sessions (local tests)",
    script: "test:community",
    files: ["community-db-test.mjs", "community-auth-test.mjs", "community-drafts-test.mjs", "community-ui-test.mjs", "community-runs-test.mjs", "community-publication-test.mjs", "community-deletion-test.mjs", "case-studies-d1-test.mjs", "turnstile-test.mjs", "d1-backup-test.mjs"]
  },
  {
    area: "Kernel, phase, temporal, PDH, ledger & session",
    script: "test:kernel",
    files: ["kernel-api-test.mjs", "session-receipt-test.mjs"]
  },
  {
    area: "Ground-0 engine",
    script: "test:engine",
    files: ["g0-engine-test.mjs"]
  },
  {
    area: "Ground-0 research & evidence",
    script: "test:research",
    files: ["g0-research-test.mjs"]
  },
  {
    area: "Approximate Moon and Sun display context",
    script: "test:celestial",
    files: ["celestial-context-test.mjs"]
  },
  {
    area: "Desktop apps, guided demo & Good Intelligence assurance & market data",
    script: "test:app",
    files: ["g0-app-test.mjs", "g0-desktop-test.mjs", "core-book-reader-test.mjs", "book-library-index-test.mjs", "grand-architecture-test.mjs", "ocm-directory-test.mjs", "g0-storage-race-test.mjs", "guided-demo-test.mjs", "good-intelligence-test.mjs", "good-intelligence-assurance-test.mjs", "good-intelligence-demo-api-test.mjs", "good-intelligence-verification-test.mjs", "good-intelligence-market-context-test.mjs", "good-intelligence-dxy-test.mjs", "good-intelligence-tickerbot-test.mjs", "good-intelligence-orb2-test.mjs", "good-intelligence-orb2-worker-test.mjs", "orb2-baseline-test.mjs", "orb2-composition-test.mjs", "orb2-scenarios-test.mjs", "orb2-field-scheduler-test.mjs", "ocm-engine-test.mjs", "pine-scripts-docs-test.mjs", "good-intelligence-card-test.mjs"]
  },
  {
    area: "Market-data provider foundation",
    script: "test:market-data-provider",
    files: ["market-data-provider-test.mjs", "fx-provider-test.mjs", "options-massive-test.mjs"]
  },
  {
    area: "HF Data Library historical ingestion boundary",
    script: "test:hf-data-library",
    files: ["hf-data-library-test.mjs"]
  },
  {
    area: "Characters market beat and shared D1 call ledger",
    script: "test:characters",
    files: ["characters-beat-test.mjs", "characters-beat-api-test.mjs", "characters-ui-test.mjs", "characters-call-ledger-test.mjs", "characters-alpha-vantage-test.mjs", "characters-massive-test.mjs", "characters-disc-test.mjs", "characters-futures-contracts-test.mjs", "characters-kraken-test.mjs", "orb2-saved-beats-test.mjs"]
  },
  {
    area: "Materials Project lookup and Worker proxy (stubbed upstream)",
    script: "test:materials-project",
    files: ["materials-project-api-test.mjs", "materials-project-ui-test.mjs"]
  },
  {
    area: "Retained Massive REST adapter and retired-desktop guard (stubbed upstream)",
    script: "test:massive",
    files: ["massive-api-test.mjs", "massive-ui-test.mjs"]
  },
  {
    area: "Character material matching and multi-Disc spheroids",
    script: "test:character-materials",
    files: ["character-material-model-test.mjs", "character-materials-ui-test.mjs"]
  },
  {
    area: "LLM data / authority boundary",
    script: "test:llm",
    files: ["llm-test.mjs", "llm-authority-test.mjs", "g0-llm-diagnostics-test.mjs"]
  },
  {
    area: "LLM relay providers and Neuron ledger (Worker)",
    script: "test:relay",
    files: ["llm-relay-test.mjs", "llm-workers-ai-test.mjs", "ai-neuron-ledger-test.mjs"]
  },
  {
    area: "Cloud storage and server-side containment",
    script: "test:cloud",
    files: ["cloud-test.mjs", "symbolic-firewall-test.mjs"]
  },
  {
    area: "Red-team hostile-caller probes",
    script: "test:red-team",
    files: ["red-team-test.mjs"]
  },
  {
    area: "Repository layout & public-asset allowlist",
    script: "test:layout",
    files: ["repository-layout-test.mjs", "spec-consistency-test.mjs"]
  },
  {
    area: "Update package arithmetic (UTS generator, Grand River recalculation, project scale-up)",
    script: "test:updates",
    files: ["uts-generator-test.mjs", "grand-river-recalculation-test.mjs", "project-scale-up-test.mjs"]
  },
  {
    area: "Manuscript index, plaintext reading view & preview routes",
    script: "test:manuscript",
    files: ["manuscript-test.mjs"]
  },
  {
    area: "NAB composite registry, composite field, and primary orb renderer",
    script: "test:nab",
    files: ["nab-sectors-test.mjs", "nab-composites-test.mjs", "nab-discs-ui-test.mjs", "nab-orb-renderer-test.mjs"]
  },
  {
    area: "Harshal's Palace roster sync, authored profiles, weather & moon",
    script: "test:palace",
    files: ["palace-day-test.mjs"]
  }
];

function gitValue(args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "unavailable";
  }
}

function lastMatch(text, expression) {
  let result = null;
  for (const match of text.matchAll(expression)) result = match;
  return result;
}

function tapSummary(output) {
  const tests = lastMatch(output, /^# tests\s+(\d+)\s*$/gm);
  const passed = lastMatch(output, /^# pass\s+(\d+)\s*$/gm);
  const failed = lastMatch(output, /^# fail\s+(\d+)\s*$/gm);
  if (!tests || !passed || !failed) return null;
  return { tests: Number(tests[1]), passed: Number(passed[1]), failed: Number(failed[1]) };
}

function harnessSummaries(output) {
  return [...output.matchAll(/^#\s*(\d+)\s+passed,\s*(\d+)\s+failed\s*$/gm)]
    .map(match => ({ passed: Number(match[1]), failed: Number(match[2]) }));
}

function redTeamSummary(output) {
  const match = lastMatch(output, /^#\s*SUMMARY:\s*(\d+)\/(\d+)\s+passed;\s*(\d+)\s+failed\.?\s*$/gm);
  return match ? { passed: Number(match[1]), total: Number(match[2]), failed: Number(match[3]) } : null;
}

function runCommand(area, args) {
  console.log(`Running ${area}…`);
  const result = spawnSync(NPM, args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: MAX_OUTPUT_BYTES,
    env: { ...process.env, FORCE_COLOR: "0" }
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const passed = !result.error && result.status === 0;
  const report = { area, passed, output, error: result.error || null, tap: tapSummary(output) };
  if (!passed) {
    console.error(`\n--- ${area} failed${result.signal ? ` (${result.signal})` : ""} ---`);
    if (result.error) console.error(result.error.message);
    if (output.trim()) console.error(output.trimEnd());
  }
  return report;
}

function markdownEscape(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("`", "\\`").replaceAll("\n", " ").replaceAll("\r", " ");
}

const discoveredTests = readdirSync(TESTS_DIR)
  .filter(file => file.endsWith("-test.mjs"))
  .sort();
const assignedTests = SUITES.flatMap(suite => suite.files).sort();
const duplicateTests = assignedTests.filter((file, index) => assignedTests.indexOf(file) !== index);
const missingFromSuites = discoveredTests.filter(file => !assignedTests.includes(file));
const staleInSuites = assignedTests.filter(file => !discoveredTests.includes(file));
const inventoryPassed = duplicateTests.length === 0 && missingFromSuites.length === 0 && staleInSuites.length === 0;
const inventoryDetails = inventoryPassed
  ? `${discoveredTests.length} test files are assigned to a named suite`
  : [
      duplicateTests.length ? `duplicate: ${[...new Set(duplicateTests)].join(", ")}` : "",
      missingFromSuites.length ? `unassigned: ${missingFromSuites.join(", ")}` : "",
      staleInSuites.length ? `missing files: ${staleInSuites.join(", ")}` : ""
    ].filter(Boolean).join("; ");

const results = [{ area: "Test inventory / suite mapping", passed: inventoryPassed, details: inventoryDetails }];

// Run the normal all-files entry point, so a newly added test is still executed
// even if the suite mapping check below correctly flags it for classification.
const full = runCommand("Full regression suite (npm test)", ["test"]);
results.push(full);

for (const suite of SUITES) {
  results.push(runCommand(suite.area, ["run", suite.script]));
}

results.push(runCommand("Deployment bundle (Wrangler dry-run)", ["run", "check:deploy"]));
results.push(runCommand("Staging bundle (Wrangler dry-run)", ["run", "check:deploy:staging"]));

const rows = results.map(result => {
  let details = result.details || "";
  if (!details && result.tap) details = `TAP ${result.tap.passed}/${result.tap.tests}; ${result.tap.failed} failed`;
  const internal = result.output ? harnessSummaries(result.output) : [];
  if (internal.length) {
    const passed = internal.reduce((sum, summary) => sum + summary.passed, 0);
    const failed = internal.reduce((sum, summary) => sum + summary.failed, 0);
    details = [details, `harness ${passed}/${passed + failed}`].filter(Boolean).join("; ");
  }
  if (result.area === "Red-team hostile-caller probes" && result.output) {
    const redTeam = redTeamSummary(result.output);
    if (redTeam) details = `${redTeam.passed}/${redTeam.total} attacks; ${redTeam.failed} failed`;
    else if (!details) details = "attack summary not found";
  }
  if (result.area === "Deployment bundle (Wrangler dry-run)" && result.passed) details = "asset staging + Wrangler dry-run";
  return `| ${markdownEscape(result.area)} | **${result.passed ? "PASS" : "FAIL"}** | ${markdownEscape(details || "see command output")} |`;
});

const passedCount = results.filter(result => result.passed).length;
const overallPassed = passedCount === results.length;
const commit = gitValue(["rev-parse", "--short=12", "HEAD"]);
const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || gitValue(["branch", "--show-current"]);
const worktreeStatus = gitValue(["status", "--porcelain", "--untracked-files=all"]);
const changedPaths = worktreeStatus ? worktreeStatus.split(/\r?\n/).filter(Boolean).length : 0;
const worktree = changedPaths ? `dirty (${changedPaths} changed paths; results include the working tree)` : "clean";
const report = [
  "# HARSHALOS INTEGRITY REPORT",
  "",
  `**Generated:** ${new Date().toISOString()}  `,
  `**Branch:** \`${markdownEscape(branch || "unknown")}\` · **Commit:** \`${markdownEscape(commit)}\`  `,
  `**Worktree:** ${markdownEscape(worktree)}`,
  "",
  "| Check | Result | Evidence |",
  "|---|---:|---|",
  ...rows,
  "",
  `## Overall: ${overallPassed ? "PASS" : "FAIL"}`,
  "",
  "A passing report means the listed automated tests and deployment dry-run completed successfully for this revision. It is regression evidence—not formal verification, a browser-integrity guarantee, or a security audit.",
  ""
].join("\n");

console.log(`\n${report}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`, "utf8");
  } catch (error) {
    console.error(`Could not append GitHub job summary: ${error.message}`);
    process.exitCode = 1;
  }
}

if (!overallPassed) process.exitCode = 1;
