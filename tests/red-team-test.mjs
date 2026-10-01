/*
 * Public-API red-team probes for HarshalOS.
 * Run directly: node tests/red-team-test.mjs
 *
 * Scope: hostile consumers of the browser-local HOS capability surface.
 * This is not proof that a browser, same-origin script, or production trust
 * boundary is secure. Production authentication/authorization remain absent.
 */
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";

const [cryptoSource, dataSource, kernelSource] = await Promise.all([
  readFile(new URL("../js/crypto.js", import.meta.url), "utf8"),
  readFile(new URL("../js/data.js", import.meta.url), "utf8"),
  readFile(new URL("../js/kernel.js", import.meta.url), "utf8")
]);

async function createKernel(options = {}) {
  let simulatedNow = Date.now();
  class TestDate extends Date {
    static now() { return simulatedNow; }
  }

  const sandbox = {
    console,
    crypto: webcrypto,
    Date: TestDate,
    TextEncoder,
    setInterval: () => 1,
    clearInterval: () => {}
  };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  if (Object.hasOwn(options, "storage")) sandbox.localStorage = options.storage;
  vm.createContext(sandbox);
  vm.runInContext(cryptoSource, sandbox, { filename: "js/crypto.js" });
  vm.runInContext(dataSource, sandbox, { filename: "js/data.js" });
  if (options.hmacSha256Hex) sandbox.HOSCrypto.hmacSha256Hex = options.hmacSha256Hex;
  vm.runInContext(kernelSource, sandbox, { filename: "js/kernel.js" });

  const HOS = sandbox.HOS;
  await HOS.ready;
  return {
    HOS,
    sandbox,
    clock: {
      now: () => simulatedNow,
      advance: milliseconds => { simulatedNow += milliseconds; }
    }
  };
}

function outcome(pass, observed) {
  return { pass: Boolean(pass), observed: String(observed) };
}

const results = [];
async function attack(id, name, expected, invariant, probe) {
  try {
    const result = await probe();
    results.push({ id, name, expected, invariant, ...result });
  } catch (error) {
    const message = String(error?.message || error).replace(/\s+/g, " ").slice(0, 220);
    results.push({
      id,
      name,
      expected,
      invariant,
      pass: false,
      observed: `unexpected ${error?.name || "error"}: ${message}`
    });
  }
}

await attack(
  "STATE-001",
  "mutate H through an observation",
  "H remains 0; public observation is immutable",
  "INV-H-001 · immutable snapshot boundary",
  async () => {
    const { HOS } = await createKernel();
    const snapshot = HOS.observe();
    let rejected = false;
    try { snapshot.H = 1; } catch { rejected = true; }
    const pass = rejected && HOS.observe().H === 0;
    return outcome(pass, `write ${rejected ? "threw" : "did not throw"}; live H=${HOS.observe().H}`);
  }
);

await attack(
  "STATE-002",
  "mutate addressability A through an observation",
  "A remains unchanged; public observation is immutable",
  "INV-L-001 · immutable snapshot boundary",
  async () => {
    const { HOS } = await createKernel();
    const snapshot = HOS.observe();
    let rejected = false;
    try { snapshot.A = 0; } catch { rejected = true; }
    const pass = rejected && HOS.observe().A === 1;
    return outcome(pass, `write ${rejected ? "threw" : "did not throw"}; live A=${HOS.observe().A}`);
  }
);

await attack(
  "STATE-003",
  "mutate representation R through an observation",
  "R remains unchanged; public observation is immutable",
  "INV-L-001 · immutable snapshot boundary",
  async () => {
    const { HOS } = await createKernel();
    const snapshot = HOS.observe();
    let rejected = false;
    try { snapshot.R = 0; } catch { rejected = true; }
    const pass = rejected && HOS.observe().R === 1;
    return outcome(pass, `write ${rejected ? "threw" : "did not throw"}; live R=${HOS.observe().R}`);
  }
);

await attack(
  "STATE-004",
  "mutate phase through an observation",
  "phase remains NAB; public observation is immutable",
  "INV-PHASE-001 · immutable snapshot boundary",
  async () => {
    const { HOS } = await createKernel();
    const snapshot = HOS.observe();
    let rejected = false;
    try { snapshot.phase = "GSRB"; } catch { rejected = true; }
    const pass = rejected && HOS.observe().phase === "NAB";
    return outcome(pass, `write ${rejected ? "threw" : "did not throw"}; live phase=${HOS.observe().phase}`);
  }
);

await attack(
  "STATE-005",
  "forge a liveness timestamp",
  "no timestamp write capability; forged request remains refused",
  "INV-T-002/003 · private time input",
  async () => {
    const { HOS, clock } = await createKernel();
    const snapshot = HOS.observe();
    const timestampHidden = !("lastLivenessAt" in snapshot);
    let writeRejected = false;
    try { snapshot.lastLivenessAt = clock.now() + 86_400_000; } catch { writeRejected = true; }
    const forged = HOS.request("timestamp-forgery", { timestamp: clock.now() + 86_400_000 });
    const pass = timestampHidden && writeRejected && forged.permitted === false && HOS.observe().H === 0;
    return outcome(pass, `timestamp hidden=${timestampHidden}; snapshot write rejected=${writeRejected}; request=${forged.code}`);
  }
);

await attack(
  "STATE-006",
  "replay a prior demo result as an attestation",
  "old result object cannot restore revoked state; public-phrase anti-replay is not claimed",
  "INV-AUTH-001 · result data is not a capability",
  async () => {
    const { HOS } = await createKernel();
    const priorResult = await HOS.demoAttest(HOS.DEMO_CHALLENGE);
    HOS.revoke("red-team replay probe");
    const replay = await HOS.demoAttest(priorResult);
    const snapshot = HOS.observe();
    const pass = priorResult.ok && replay.code === "DEMO-CHALLENGE-MISMATCH" &&
      snapshot.H === 0 && snapshot.attestation.status === "revoked";
    return outcome(pass, `old result replay=${replay.code}; status=${snapshot.attestation.status}; H=${snapshot.H}`);
  }
);

await attack(
  "STATE-007",
  "bypass the UI with a direct HOS request",
  "direct API call with no demo marker is refused",
  "INV-AUTH-001 · authorization is kernel-side",
  async () => {
    const { HOS } = await createKernel();
    const result = HOS.request("direct-api-bypass", { sovereignOverride: true });
    return outcome(!result.permitted && result.code === "NO-DEMO-CONFIRMATION", `direct request with override=${result.code}; permitted=${result.permitted}`);
  }
);

await attack(
  "STATE-008",
  "invoke the kernel directly",
  "no global kernel/state object; only the frozen HOS capability is exposed",
  "API-BOUNDARY · private kernel closure",
  async () => {
    const { HOS, sandbox } = await createKernel();
    const globalKernel = vm.runInContext("typeof kernel", sandbox);
    const pass = globalKernel === "undefined" && !Object.hasOwn(sandbox, "kernel") &&
      !("state" in HOS) && Object.isFrozen(HOS);
    return outcome(pass, `typeof kernel=${globalKernel}; window.kernel=${Object.hasOwn(sandbox, "kernel")}; HOS.state=${"state" in HOS}`);
  }
);

await attack(
  "STATE-009",
  "corrupt the public ledger snapshot",
  "snapshot edits are rejected and the private ledger remains unchanged",
  "LEDGER-BOUNDARY · immutable detached ledger copy",
  async () => {
    const { HOS } = await createKernel();
    await HOS.record("info", "red-team ledger mutation probe");
    const snapshot = HOS.getLedger();
    const last = snapshot[snapshot.length - 1];
    let rowWriteRejected = false;
    let appendRejected = false;
    try { last.event = "forged ledger row"; } catch { rowWriteRejected = true; }
    try { snapshot.push({ event: "forged tail" }); } catch { appendRejected = true; }
    const current = HOS.getLedger();
    const currentLast = current[current.length - 1];
    const pass = rowWriteRejected && appendRejected && current.length === snapshot.length &&
      currentLast.event === "red-team ledger mutation probe" && currentLast.hash === last.hash;
    return outcome(pass, `row write rejected=${rowWriteRejected}; append rejected=${appendRejected}; private tail unchanged=${currentLast.event === "red-team ledger mutation probe"}`);
  }
);

await attack(
  "STATE-010",
  "inject an unknown phase identifier",
  "unknown phase is rejected and declared phase remains NAB",
  "INV-PHASE-001 · phase allowlist",
  async () => {
    const { HOS } = await createKernel();
    const result = HOS.transition("ATTACKER-PHASE");
    const phase = HOS.observe().phase;
    return outcome(!result.ok && result.code === "INVALID-PHASE" && phase === "NAB", `transition=${result.code}; phase=${phase}`);
  }
);

await attack(
  "STATE-011",
  "resurrect a session after freshness expires",
  "expiry blocks action/rebind even if the displayed session label remains",
  "INV-AUTH-002 · stale session state is not authority",
  async () => {
    const { HOS, clock } = await createKernel();
    await HOS.demoAttest(HOS.DEMO_CHALLENGE);
    const bound = HOS.bindSession("old-session", "activate");
    clock.advance(HOS.DELTA_MAX * 1000);
    const action = HOS.request("expired-session-reuse");
    const rebind = HOS.bindSession("old-session", "activate");
    const snapshot = HOS.observe();
    const pass = bound.ok && action.code === "STALE-PERMISSION" &&
      rebind.code === "STALE-PERMISSION" && snapshot.attestation.expired;
    return outcome(pass, `action=${action.code}; rebind=${rebind.code}; displayed session=${snapshot.session.state}; expired=${snapshot.attestation.expired}; permitted=${action.permitted}`);
  }
);

await attack(
  "STATE-012",
  "reuse an old permit after revocation",
  "old result is not executable; a fresh request is refused",
  "INV-AUTH-001 · authorization is re-evaluated per request",
  async () => {
    const { HOS } = await createKernel();
    await HOS.demoAttest(HOS.DEMO_CHALLENGE);
    const oldPermit = HOS.request("same-action");
    HOS.revoke("red-team permit replay probe");
    const replayedAsInput = HOS.request(oldPermit);
    const freshRequest = HOS.request("same-action");
    const pass = oldPermit.permitted && !replayedAsInput.permitted && replayedAsInput.code === "INVALID-ACTION" &&
      !freshRequest.permitted && freshRequest.code === "NO-DEMO-CONFIRMATION";
    return outcome(pass, `old permit=${oldPermit.code}; result-as-input=${replayedAsInput.code}; fresh request=${freshRequest.code}`);
  }
);

await attack(
  "STATE-013",
  "race a pending ceremony against expiry and an action",
  "pending action is refused; late expired HMAC cannot activate H",
  "INV-H-009 · completion freshness; INV-AUTH-001 · pending refusal",
  async () => {
    let resolveHmac;
    const deferredHmac = () => new Promise(resolve => { resolveHmac = resolve; });
    const { HOS, clock } = await createKernel({ hmacSha256Hex: deferredHmac });
    const ceremony = HOS.demoAttest(HOS.DEMO_CHALLENGE);
    const duringPending = HOS.request("race-action");
    for (let attempt = 0; attempt < 5 && !resolveHmac; attempt++) {
      await new Promise(resolve => setImmediate(resolve));
    }
    if (!resolveHmac) throw new Error("deferred HMAC was not invoked");
    clock.advance((HOS.DELTA_MAX + 1) * 1000);
    resolveHmac("c".repeat(64));
    const completion = await ceremony;
    const afterExpiry = HOS.request("race-action-after-expiry");
    const snapshot = HOS.observe();
    const pass = duringPending.code === "DEMO-ATTESTATION-PENDING" &&
      completion.code === "ATTESTATION-EXPIRED" && afterExpiry.code === "NO-DEMO-CONFIRMATION" &&
      snapshot.H === 0 && snapshot.attestation.status === "failed";
    return outcome(pass, `during=${duringPending.code}; completion=${completion.code}; after=${afterExpiry.code}; status=${snapshot.attestation.status}; H=${snapshot.H}`);
  }
);

await attack(
  "STATE-014",
  "manipulate browser storage",
  "kernel does not read or write caller-provided localStorage",
  "STORAGE-BOUNDARY · kernel state is closure-local",
  async () => {
    let accesses = 0;
    const hostileStorage = new Proxy(Object.create(null), {
      get() { accesses++; throw new Error("hostile storage read"); },
      set() { accesses++; throw new Error("hostile storage write"); },
      ownKeys() { accesses++; throw new Error("hostile storage enumeration"); }
    });
    const { HOS } = await createKernel({ storage: hostileStorage });
    const snapshot = HOS.observe();
    const pass = accesses === 0 && snapshot.H === 0 && snapshot.attestation.status === "absent";
    return outcome(pass, `storage trap calls=${accesses}; H=${snapshot.H}; status=${snapshot.attestation.status}`);
  }
);

await attack(
  "STATE-015",
  "contaminate a second kernel session",
  "attesting in one isolated context does not change another",
  "STATE-BOUNDARY · per-context private closure",
  async () => {
    const first = await createKernel();
    const second = await createKernel();
    await first.HOS.demoAttest(first.HOS.DEMO_CHALLENGE);
    const left = first.HOS.observe();
    const right = second.HOS.observe();
    const pass = left.H === 1 && right.H === 0 && right.attestation.status === "absent";
    return outcome(pass, `context A H=${left.H}; context B H=${right.H}, status=${right.attestation.status}`);
  }
);

await attack(
  "STATE-016",
  "submit malformed public API input",
  "invalid values fail closed without throwing or mutating kernel state",
  "INV-L-002 · INV-PHASE-001 · INV-S-008",
  async () => {
    const { HOS } = await createKernel();
    const request = HOS.request(42);
    const factor = HOS.setAddressability(Number.NaN);
    const representation = HOS.setRepresentation("1");
    const phase = HOS.transition(null);
    const session = HOS.bindSession(null, "activate");
    const phrase = await HOS.demoAttest({ toString() { throw new Error("must not be coerced"); } });
    const snapshot = HOS.observe();
    const pass = request.code === "INVALID-ACTION" && !factor.ok && !representation.ok &&
      phase.code === "INVALID-PHASE" && session.code === "INVALID-SESSION-BINDING" &&
      phrase.code === "DEMO-CHALLENGE-MISMATCH" && snapshot.H === 0 && snapshot.phase === "NAB";
    return outcome(pass, `request=${request.code}; factors=${factor.code}/${representation.code}; phase=${phase.code}; session=${session.code}; phrase=${phrase.code}; H=${snapshot.H}`);
  }
);

await attack(
  "STATE-017",
  "pass a prototype-pollution payload",
  "payload cannot mutate prototypes or authority-bearing kernel state",
  "API-BOUNDARY · no caller-supplied state patch",
  async () => {
    const { HOS } = await createKernel();
    const marker = `__hosRedTeamPoison_${process.pid}`;
    const payload = JSON.parse(`{"__proto__":{"${marker}":true,"H":1,"phase":"GSRB"}}`);
    const request = HOS.request(payload);
    const factor = HOS.setAddressability(payload);
    const snapshot = HOS.observe();
    const polluted = Object.prototype.hasOwnProperty.call(Object.prototype, marker) ||
      Object.prototype.hasOwnProperty.call({}, marker);
    const pass = request.code === "INVALID-ACTION" && !factor.ok && !polluted &&
      snapshot.H === 0 && snapshot.phase === "NAB" && Object.getPrototypeOf(HOS) === null;
    return outcome(pass, `request=${request.code}; factor=${factor.code}; prototype polluted=${polluted}; H=${snapshot.H}; phase=${snapshot.phase}`);
  }
);

await attack(
  "STATE-018",
  "submit proxies and unexpected object types",
  "public APIs reject inputs without invoking hostile object traps",
  "API-BOUNDARY · primitive-only mutation inputs",
  async () => {
    let traps = 0;
    const hostile = new Proxy(Object.create(null), {
      get() { traps++; throw new Error("hostile get"); },
      ownKeys() { traps++; throw new Error("hostile ownKeys"); },
      getOwnPropertyDescriptor() { traps++; throw new Error("hostile descriptor"); },
      getPrototypeOf() { traps++; throw new Error("hostile prototype query"); }
    });
    const { HOS } = await createKernel();
    const request = HOS.request(hostile);
    const phase = HOS.transition(hostile);
    const session = HOS.bindSession(hostile, "activate");
    const factor = HOS.setRepresentation(hostile);
    const phrase = await HOS.demoAttest(hostile);
    const snapshot = HOS.observe();
    const pass = traps === 0 && request.code === "INVALID-ACTION" && phase.code === "INVALID-PHASE" &&
      session.code === "INVALID-SESSION-BINDING" && !factor.ok && phrase.code === "DEMO-CHALLENGE-MISMATCH" &&
      snapshot.H === 0 && snapshot.phase === "NAB";
    return outcome(pass, `proxy traps=${traps}; request=${request.code}; phase=${phase.code}; session=${session.code}; factor=${factor.code}; phrase=${phrase.code}`);
  }
);

console.log("HARSHALOS RED-TEAM REPORT");
console.log("Scope: hostile callers using the public browser-local HOS API; not a browser-integrity or production-security proof.");
for (const result of results) {
  console.log(`\nATTACK: ${result.id} — ${result.name}`);
  console.log(`EXPECTED: ${result.expected}`);
  console.log(`OBSERVED: ${result.observed}`);
  console.log(`PASS/FAIL: ${result.pass ? "PASS" : "FAIL"}`);
  console.log(`INVARIANT: ${result.invariant}`);
}
const passed = results.filter(result => result.pass).length;
const failed = results.length - passed;
console.log(`\nSUMMARY: ${passed}/${results.length} passed; ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
