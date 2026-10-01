/* Adversarial checks for the public kernel-state boundary and transition layer.
   Run: node --test tests/kernel-api-test.mjs */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { createHash, webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";

async function createKernel({ hmacSha256Hex } = {}) {
  let simulatedNow = Date.now();
  let nowReadHook = null;
  class TestDate extends Date {
    static now() {
      const current = simulatedNow;
      if (nowReadHook) nowReadHook(current);
      return current;
    }
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
  vm.createContext(sandbox);

  for (const file of ["js/crypto.js", "js/data.js"]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    vm.runInContext(source, sandbox, { filename: file });
  }
  if (hmacSha256Hex) sandbox.HOSCrypto.hmacSha256Hex = hmacSha256Hex;
  const kernelSource = await readFile(new URL("../js/kernel.js", import.meta.url), "utf8");
  vm.runInContext(kernelSource, sandbox, { filename: "js/kernel.js" });

  const HOS = sandbox.HOS;
  await HOS.ready;
  return {
    HOS,
    sandbox,
    clock: {
      now: () => simulatedNow,
      set: timestamp => { simulatedNow = timestamp; },
      advance: milliseconds => { simulatedNow += milliseconds; },
      setNowReadHook: hook => { nowReadHook = typeof hook === "function" ? hook : null; }
    }
  };
}

function createDeferredHmac() {
  const calls = [];
  return {
    calls,
    hmacSha256Hex(...args) {
      return new Promise((resolve, reject) => calls.push({ resolve, reject, args }));
    }
  };
}

test("Creator-ID formula binds the local demo MAC key and payload", async () => {
  let captured = null;
  const { HOS } = await createKernel({
    hmacSha256Hex: async (key, payload) => {
      captured = { key, payload };
      return "a".repeat(64);
    }
  });
  assert.equal(HOS.CREATOR_ID_FORMULA, "§HARSHAL§ + HARSHAL + (HARSHAL)");
  assert.equal((await HOS.demoAttest(HOS.DEMO_CHALLENGE)).ok, true);
  assert.equal(captured.key, `HARSHALOS-DEMO-ONLY::${HOS.CREATOR_ID_FORMULA}`);
  assert.equal(JSON.parse(captured.payload).creatorId, HOS.CREATOR_ID_FORMULA);
});

async function waitForHmacCalls(deferred, count) {
  for (let attempt = 0; attempt < 5 && deferred.calls.length < count; attempt++) {
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(deferred.calls.length, count, `expected ${count} deferred HMAC call(s)`);
}

test("kernel state is private and public observations are immutable copies", async () => {
  const { HOS, sandbox } = await createKernel();

  assert.equal(vm.runInContext("typeof kernel", sandbox), "undefined", "no global kernel binding is created");
  assert.equal("kernel" in sandbox, false, "window.kernel is not published");
  assert.equal(Object.isFrozen(HOS), true, "the public API cannot be replaced through property writes");
  assert.equal(Object.getPrototypeOf(HOS), null, "the capability object has no mutable prototype");
  assert.equal("state" in HOS, false, "there is no live state property");
  assert.equal("ledger" in HOS, false, "the internal ledger array is not exposed");
  assert.equal(HOS.attest, undefined, "there is no ambiguous generic attestation capability");
  assert.equal(HOS.CREATOR_ID, "HARSHAL", "the atomic creator value remains available for the Header-ID suffix");
  assert.equal(HOS.CREATOR_ID_FORMULA, "§HARSHAL§ + HARSHAL + (HARSHAL)", "the canonical Creator-ID uses the requested notation");
  const genesis = HOS.observe().declared;
  const expectedGenesisHash = await sandbox.HOSCrypto.sha256Hex([
    genesis.declaredPhase, genesis.centerCapability, genesis.legitimacySource,
    genesis.refusalSemantics, genesis.symbolismExecutability, genesis.timeAuthorityEffect,
    genesis.effectiveTimestamp, HOS.CREATOR_ID_FORMULA, HOS.CENTER
  ].join("|"));
  assert.equal(genesis.declarationHash, `0x${expectedGenesisHash.toUpperCase()}`, "PDH binds the full Creator-ID formula");
  assert.equal(HOS.securityProfile.mode, "DEMO");
  assert.equal(HOS.securityProfile.productionAuthenticatorAvailable, false);
  assert.equal(HOS.securityProfile.productionAuthorizationAvailable, false);
  assert.equal(Object.isFrozen(HOS.securityProfile), true);

  const productionAttempt = await HOS.requestProductionAttestation();
  assert.equal(productionAttempt.ok, false);
  assert.equal(productionAttempt.code, "PRODUCTION-AUTHENTICATOR-UNAVAILABLE");
  assert.equal(productionAttempt.mode, "DEMO");
  assert.equal(productionAttempt.executionScope, "LOCAL-DEMO-ONLY");
  assert.equal(HOS.observe().H, 0, "production authentication fails closed without changing demo state");
  const wrongDemoPhrase = await HOS.demoAttest("NOT-THE-PUBLIC-CHALLENGE");
  assert.equal(wrongDemoPhrase.ok, false);
  assert.equal(wrongDemoPhrase.code, "DEMO-CHALLENGE-MISMATCH");
  assert.equal(HOS.observe().H, 0, "a mismatched demo phrase cannot change state");

  const before = HOS.observe();
  assert.equal(Object.isFrozen(before), true);
  assert.equal(Object.isFrozen(before.session), true);
  assert.equal(Object.isFrozen(before.declared), true);
  assert.equal(Object.isFrozen(before.metrics), true);
  assert.equal(Object.isFrozen(before.attestation), true);
  assert.equal(Object.isFrozen(before.security), true);
  assert.equal(before.H, 0);
  assert.equal(before.security.mode, "DEMO");
  assert.equal(before.security.productionAuthenticatorAvailable, false);
  assert.equal(before.attestation.mode, "DEMO");
  assert.equal(before.attestation.status, "absent");
  assert.equal("keySig" in before, false, "raw attestation material is not observable");
  assert.equal("keyFp" in before, false, "attestation fingerprints are not observable");
  assert.equal("lastLivenessAt" in before, false, "the internal liveness timestamp is not observable");
  assert.equal("bound" in before.session, false, "bound identifiers are not observable");
  assert.throws(() => { before.H = 1; }, TypeError);
  assert.throws(() => { before.session.state = "authorized"; }, TypeError);

  assert.equal(HOS.setAddressability(0.25).ok, true);
  assert.equal(HOS.observe().A, 0.25);
  assert.equal(before.A, 1, "an earlier snapshot does not change with internal state");
  for (const invalid of [1.01, -0.01, NaN, Infinity, "0.5"]) {
    assert.equal(HOS.setRepresentation(invalid).ok, false, `invalid factor ${String(invalid)} is rejected`);
  }
  assert.equal(HOS.observe().R, 1, "a rejected factor does not mutate state");

  const invalidPhase = HOS.transition("UNKNOWN-PHASE");
  assert.equal(invalidPhase.ok, false);
  assert.equal(invalidPhase.code, "INVALID-PHASE");
  assert.equal(HOS.observe().phase, "NAB", "unknown phase input cannot corrupt the declared phase");
  const unauthenticatedAck = HOS.acknowledgeCollapseStep(0);
  assert.equal(unauthenticatedAck.ok, false, "collapse acknowledgements require fresh human authorization");
  assert.equal(unauthenticatedAck.code, "NO-DEMO-CONFIRMATION");
  assert.equal(HOS.observe().gsrbAck, 0);
  assert.equal(HOS.request("no-demo-marker").code, "NO-DEMO-CONFIRMATION");
  assert.equal(HOS.transition("GSRB").code, "NO-DEMO-CONFIRMATION", "the public transition API cannot enter GSRB without local demo confirmation");
  const unauthorizedPublish = await HOS.publishDeclaration();
  assert.equal(unauthorizedPublish.ok, false, "PDH publication uses the authorization gate");

  let callbackSnapshot;
  const unsubscribe = HOS.subscribe("state", snapshot => { callbackSnapshot = snapshot; });
  HOS.setAddressability(0.5);
  unsubscribe();
  assert.equal(Object.isFrozen(callbackSnapshot), true, "event consumers only receive immutable snapshots");
  assert.throws(() => { callbackSnapshot.A = 0; }, TypeError);

  const attestation = await HOS.demoAttest(HOS.DEMO_CHALLENGE);
  assert.equal(attestation.ok, true);
  assert.equal(attestation.mode, "DEMO");
  assert.equal(attestation.executionScope, "LOCAL-DEMO-ONLY");
  assert.equal(HOS.observe().H, 1);
  assert.equal(HOS.observe().attestation.status, "active");
  assert.equal(HOS.observe().attestation.fresh, true);
  assert.equal(HOS.observe().attestation.expired, false);
  const productionAfterDemo = await HOS.requestProductionAttestation();
  assert.equal(productionAfterDemo.ok, false);
  assert.equal(productionAfterDemo.code, "PRODUCTION-AUTHENTICATOR-UNAVAILABLE");
  assert.equal(HOS.observe().H, 1, "a production request cannot reinterpret or upgrade the demo marker");
  HOS.setAddressability(1);
  const published = await HOS.publishDeclaration();
  assert.equal(published.ok, true);
  assert.equal(Object.isFrozen(published), true, "PDH callers receive an immutable copy");
  assert.equal(Object.isFrozen(HOS.observe().declared), true);
  const permitted = HOS.request("read-only-test");
  assert.equal(permitted.permitted, true);
  assert.equal(permitted.code, "DEMO-PERMITTED");
  assert.equal(permitted.mode, "DEMO");
  assert.equal(permitted.executionScope, "LOCAL-DEMO-ONLY");
  assert.equal(Object.isFrozen(permitted), true);
  assert.equal(Object.isFrozen(permitted.opts), true);

  const invalidRequest = HOS.request({ toString: () => "not-a-string" });
  assert.equal(invalidRequest.permitted, false);
  assert.equal(invalidRequest.code, "INVALID-ACTION");

  const row = await HOS.record("info", "kernel API boundary test");
  assert.equal(Object.isFrozen(row), true, "record() returns a detached frozen row");
  assert.throws(() => { row.event = "rewritten"; }, TypeError);
  const ledger = HOS.getLedger();
  assert.equal(Object.isFrozen(ledger), true);
  assert.equal(Object.isFrozen(ledger[0]), true);
  assert.throws(() => { ledger.push({ event: "forged" }); }, error => error?.name === "TypeError");
  assert.throws(() => { ledger[0].event = "rewritten"; }, TypeError);

  assert.equal(HOS.bindSession("WhyExample", "activate").ok, true);
  assert.equal(HOS.observe().session.state, "authorized");
  const cwoTransition = HOS.transition("CWO");
  assert.equal(cwoTransition.ok, true);
  assert.equal(cwoTransition.mode, "DEMO");
  assert.equal(cwoTransition.executionScope, "LOCAL-DEMO-ONLY");
  assert.equal(HOS.observe().session.state, "non-acting", "CWO transition atomically clears any active session");
  assert.equal(HOS.request("forbidden-in-cwo").code, "CWO-FORBIDDEN");
  assert.equal(HOS.bindSession("WhyExample", "activate").code, "CWO-FORBIDDEN", "CWO cannot bind an active session");
  assert.equal(HOS.transition("NAB").ok, true);

  const collapseRequired = HOS.transition("GSRB");
  assert.equal(collapseRequired.code, "COLLAPSE-REQUIRED", "GSRB requires the complete collapse sequence");
  assert.equal(collapseRequired.needsCollapse, true, "the UI can surface the guided collapse protocol");
  assert.equal(HOS.acknowledgeCollapseStep(-1).code, "INVALID-COLLAPSE-STEP");
  for (let step = 0; step < 5; step++) {
    const result = HOS.acknowledgeCollapseStep(step);
    assert.equal(result.ok, true, `collapse step ${step + 1} is acknowledged in order`);
  }
  assert.equal(HOS.transition("GSRB").phase, "GSRB");
  const override = HOS.request("demo-sovereign-override", { sovereignOverride: true });
  assert.equal(override.permitted, true);
  assert.equal(override.code, "DEMO-GSRB-OVERRIDE");
  assert.equal(override.executionScope, "LOCAL-DEMO-ONLY");
  assert.equal(HOS.transition("NAB").code, "GSRB-REBUILD-REQUIRED", "GSRB cannot silently transition back");
});

test("pending attestation keeps H(t)=0, refuses actions, and a new ceremony clears prior demo state", async () => {
  const deferred = createDeferredHmac();
  const { HOS } = await createKernel({ hmacSha256Hex: deferred.hmacSha256Hex });

  const firstCeremony = HOS.demoAttest(HOS.DEMO_CHALLENGE);
  let snapshot = HOS.observe();
  assert.equal(snapshot.H, 0, "H(t) remains zero while the asynchronous HMAC is pending");
  assert.equal(snapshot.attestation.status, "pending");
  assert.equal(snapshot.attestation.fresh, false);
  assert.equal(snapshot.metrics.demoTimerFresh, false);
  assert.equal(HOS.request("during-pending").code, "DEMO-ATTESTATION-PENDING");
  assert.equal(HOS.bindSession("pending-session", "activate").code, "DEMO-ATTESTATION-PENDING");
  assert.equal(HOS.acknowledgeCollapseStep(0).code, "DEMO-ATTESTATION-PENDING");
  assert.equal(HOS.transition("GSRB").code, "DEMO-ATTESTATION-PENDING");
  assert.equal((await HOS.publishDeclaration()).code, "DEMO-ATTESTATION-PENDING");

  await waitForHmacCalls(deferred, 1);
  deferred.calls[0].resolve("a".repeat(64));
  const firstResult = await firstCeremony;
  assert.equal(firstResult.ok, true);
  assert.equal(firstResult.status, "active");
  snapshot = HOS.observe();
  assert.equal(snapshot.H, 1);
  assert.equal(snapshot.attestation.status, "active");
  assert.equal(snapshot.attestation.fresh, true);
  assert.equal(HOS.request("after-pending").permitted, true, "only completed fresh demo attestation opens the local demo gate");

  assert.equal(HOS.bindSession("prior-demo-session", "activate").ok, true);
  assert.equal(HOS.acknowledgeCollapseStep(0).ok, true);
  assert.equal(HOS.observe().gsrbAck, 1);
  const renewed = HOS.demoAttest(HOS.DEMO_CHALLENGE);
  snapshot = HOS.observe();
  assert.equal(snapshot.H, 0, "renewal immediately deactivates the prior demo marker");
  assert.equal(snapshot.attestation.status, "pending");
  assert.equal(snapshot.session.state, "non-acting", "renewal clears the prior session binding");
  assert.equal(snapshot.gsrbAck, 0, "renewal clears partial collapse acknowledgements");
  assert.equal(HOS.request("during-renewal").code, "DEMO-ATTESTATION-PENDING");
  assert.equal(HOS.bindSession("new-session", "activate").code, "DEMO-ATTESTATION-PENDING");
  await waitForHmacCalls(deferred, 2);
  deferred.calls[1].resolve("b".repeat(64));
  assert.equal((await renewed).ok, true);
  assert.equal(HOS.observe().attestation.status, "active");
});

test("REPLAY-001 / RACE-001: newer ceremonies and revocation supersede deferred HMAC completions", async () => {
  const deferred = createDeferredHmac();
  const { HOS } = await createKernel({ hmacSha256Hex: deferred.hmacSha256Hex });

  const older = HOS.demoAttest(HOS.DEMO_CHALLENGE);
  await waitForHmacCalls(deferred, 1);
  const newer = HOS.demoAttest(HOS.DEMO_CHALLENGE);
  assert.equal(HOS.observe().H, 0);
  assert.equal(HOS.observe().attestation.status, "pending");
  await waitForHmacCalls(deferred, 2);

  deferred.calls[1].resolve("2".repeat(64));
  assert.equal((await newer).ok, true);
  deferred.calls[0].resolve("1".repeat(64));
  const lateOlder = await older;
  assert.equal(lateOlder.ok, false);
  assert.equal(lateOlder.code, "ATTESTATION-SUPERSEDED");
  assert.equal(HOS.observe().H, 1, "the stale result does not replace the newer active ceremony");
  assert.equal(HOS.observe().attestation.status, "active");

  const pendingRevocation = HOS.demoAttest(HOS.DEMO_CHALLENGE);
  await waitForHmacCalls(deferred, 3);
  assert.equal(HOS.observe().H, 0);
  const revoked = HOS.revoke("deferred race test");
  assert.equal(revoked.ok, true);
  assert.equal(HOS.observe().attestation.status, "revoked");
  deferred.calls[2].resolve("3".repeat(64));
  const lateAfterRevoke = await pendingRevocation;
  assert.equal(lateAfterRevoke.ok, false);
  assert.equal(lateAfterRevoke.code, "ATTESTATION-SUPERSEDED");
  assert.equal(HOS.observe().H, 0);
  assert.equal(HOS.observe().attestation.status, "revoked", "a late completion cannot undo revocation");
});

test("HMAC failures and completions after freshness expiry remain inactive", async () => {
  const rejected = await createKernel({ hmacSha256Hex: () => Promise.reject(new Error("simulated crypto rejection")) });
  const rejectionResult = await rejected.HOS.demoAttest(rejected.HOS.DEMO_CHALLENGE);
  assert.equal(rejectionResult.ok, false);
  assert.equal(rejectionResult.code, "DEMO-CRYPTO-FAILURE");
  assert.equal(rejected.HOS.observe().H, 0);
  assert.equal(rejected.HOS.observe().attestation.status, "failed");
  assert.equal(rejected.HOS.request("after-crypto-failure").code, "NO-DEMO-CONFIRMATION");

  const thrown = await createKernel({ hmacSha256Hex: () => { throw new Error("simulated synchronous crypto failure"); } });
  const thrownResult = await thrown.HOS.demoAttest(thrown.HOS.DEMO_CHALLENGE);
  assert.equal(thrownResult.ok, false);
  assert.equal(thrownResult.code, "DEMO-CRYPTO-FAILURE");
  assert.equal(thrown.HOS.observe().attestation.status, "failed");
  assert.equal(thrown.HOS.observe().H, 0);

  const deferred = createDeferredHmac();
  const expired = await createKernel({ hmacSha256Hex: deferred.hmacSha256Hex });
  const completion = expired.HOS.demoAttest(expired.HOS.DEMO_CHALLENGE);
  await waitForHmacCalls(deferred, 1);
  expired.clock.advance((expired.HOS.DELTA_MAX + 1) * 1000);
  deferred.calls[0].resolve("e".repeat(64));
  const expiredResult = await completion;
  assert.equal(expiredResult.ok, false);
  assert.equal(expiredResult.code, "ATTESTATION-EXPIRED");
  assert.equal(expired.HOS.observe().H, 0);
  assert.equal(expired.HOS.observe().attestation.status, "failed");
  assert.equal(expired.HOS.request("after-expired-completion").code, "NO-DEMO-CONFIRMATION");
});

test("authority-bearing mutations commit valid candidates and revocation supersedes pending attestation", async () => {
  const { HOS } = await createKernel();

  const first = await HOS.demoAttest(HOS.DEMO_CHALLENGE);
  assert.equal(first.ok, true);
  const activation = HOS.bindSession("WhyExample", "activate");
  assert.equal(activation.ok, true);
  assert.equal(activation.mode, "DEMO");
  assert.equal(activation.executionScope, "LOCAL-DEMO-ONLY");
  assert.equal(HOS.observe().session.state, "authorized");
  assert.equal(HOS.bindSession("WhyExample", "unknown").code, "INVALID-SESSION-BINDING");
  assert.equal(HOS.observe().session.state, "authorized", "rejected session binding leaves the candidate uncommitted");

  const burn = HOS.burnSession("API test burn");
  assert.equal(burn.ok, true);
  assert.equal(burn.burned, 1);
  assert.equal(HOS.observe().session.state, "non-acting");
  assert.equal(HOS.observe().session.burned, 1);

  // Revoke immediately after starting the next asynchronous HMAC. The delayed
  // completion must not restore H(t) or attestation material after revocation.
  const pending = HOS.demoAttest(HOS.DEMO_CHALLENGE);
  assert.equal(HOS.observe().attestation.status, "pending");
  const revoked = HOS.revoke("API test revocation");
  assert.equal(revoked.ok, true);
  assert.equal(revoked.mode, "DEMO");
  assert.equal(revoked.executionScope, "LOCAL-DEMO-ONLY");
  assert.equal(HOS.observe().H, 0);
  assert.equal(HOS.observe().attestation.status, "revoked");
  assert.equal(HOS.observe().session.state, "non-acting");
  assert.equal(HOS.observe().session.burned, 1, "revocation preserves the monotonic burn counter");
  const lateAttestation = await pending;
  assert.equal(lateAttestation.ok, false);
  assert.equal(lateAttestation.code, "ATTESTATION-SUPERSEDED");
  assert.equal(HOS.observe().H, 0, "a stale async completion cannot restore authority");

  const restored = await HOS.demoAttest(HOS.DEMO_CHALLENGE);
  assert.equal(restored.ok, true);
  assert.equal(HOS.observe().H, 1);
  assert.equal(HOS.observe().attestation.status, "active");
  assert.equal(HOS.observe().session.state, "non-acting");
});

test("temporal invariant and authorization checks fail closed at expiry and clock rollback", async () => {
  const { HOS, clock } = await createKernel();
  assert.equal((await HOS.demoAttest(HOS.DEMO_CHALLENGE)).ok, true);

  const freshStamp = clock.now();
  clock.advance((HOS.DELTA_MAX + 1) * 1000);
  assert.equal(HOS.observe().metrics.demoTimerFresh, false);
  assert.equal(HOS.observe().attestation.status, "active", "expiry is derived from freshness, not a separate stored state");
  assert.equal(HOS.observe().attestation.expired, true);
  assert.equal(HOS.observe().H, 1, "the local marker remains distinguishable from its expired freshness window");
  assert.equal(HOS.request("stale-action").code, "STALE-PERMISSION");
  assert.equal(HOS.bindSession("WhyExample", "activate").code, "STALE-PERMISSION");
  assert.equal(HOS.acknowledgeCollapseStep(0).code, "STALE-PERMISSION");
  assert.equal(HOS.transition("GSRB").code, "STALE-PERMISSION");
  assert.equal((await HOS.publishDeclaration()).code, "STALE-PERMISSION");
  assert.equal(HOS.observe().gsrbAck, 0, "stale authorization cannot advance collapse state");

  clock.set(freshStamp - 1000);
  assert.equal(HOS.observe().metrics.demoTimerFresh, false);
  assert.equal(HOS.observe().metrics.deltaSeconds, Infinity, "clock rollback is represented as invalid time");
  assert.equal(HOS.request("clock-rollback").code, "KERNEL-INVARIANT-FAIL");
});

test("REPLAY-002: an old permit result is data, not reusable authorization", async () => {
  const { HOS } = await createKernel();
  assert.equal((await HOS.demoAttest(HOS.DEMO_CHALLENGE)).ok, true);
  const priorPermit = HOS.request("historical-action");
  assert.equal(priorPermit.permitted, true);
  assert.equal(priorPermit.executionScope, "LOCAL-DEMO-ONLY");

  HOS.revoke("replay authorization result");
  const resultAsActionName = HOS.request(priorPermit);
  const freshRequest = HOS.request("historical-action");
  assert.equal(resultAsActionName.code, "INVALID-ACTION", "a prior result object is not accepted as an action capability");
  assert.equal(freshRequest.code, "NO-DEMO-CONFIRMATION", "a fresh request re-evaluates current authority after revocation");
  assert.equal(freshRequest.permitted, false);
});

test("REPLAY-003: prior session identifiers do not bind without current authorization", async () => {
  const { HOS } = await createKernel();
  assert.equal((await HOS.demoAttest(HOS.DEMO_CHALLENGE)).ok, true);
  const sessionId = "historical-session-id";
  assert.equal(HOS.bindSession(sessionId, "activate").ok, true);
  assert.equal(HOS.revoke("replay old session identifier" ).ok, true);

  const replay = HOS.bindSession(sessionId, "activate");
  assert.equal(replay.ok, false);
  assert.equal(replay.code, "NO-DEMO-CONFIRMATION");
  assert.equal(HOS.observe().session.state, "non-acting");
  assert.equal(HOS.observe().H, 0);
});

test("REPLAY-006: collapse acknowledgements cannot be replayed out of order", async () => {
  const { HOS } = await createKernel();
  assert.equal((await HOS.demoAttest(HOS.DEMO_CHALLENGE)).ok, true);

  assert.equal(HOS.acknowledgeCollapseStep(0).ok, true);
  const firstReplay = HOS.acknowledgeCollapseStep(0);
  assert.equal(firstReplay.code, "INVALID-COLLAPSE-STEP");
  assert.equal(HOS.observe().gsrbAck, 1, "a duplicate acknowledgement does not advance the protocol");
  assert.equal(HOS.acknowledgeCollapseStep(1).ok, true);
  const secondReplay = HOS.acknowledgeCollapseStep(1);
  assert.equal(secondReplay.code, "INVALID-COLLAPSE-STEP");
  assert.equal(HOS.observe().gsrbAck, 2);
});

test("RACE-002: an action whose authorization window expires mid-check is refused", async () => {
  const { HOS, clock } = await createKernel();
  assert.equal((await HOS.demoAttest(HOS.DEMO_CHALLENGE)).ok, true);
  clock.advance((HOS.DELTA_MAX - 1) * 1000);

  let timeReads = 0;
  clock.setNowReadHook(() => {
    timeReads++;
    // requestAction reads time for Δt, its result timestamp, and state
    // validation before assertAuthorization performs its own freshness check.
    // Expire immediately after that validation read to exercise the TOCTOU edge.
    if (timeReads === 3) clock.advance(1000);
  });
  const result = HOS.request("expiry-during-authorization");
  clock.setNowReadHook(null);

  assert.equal(timeReads >= 4, true, "the test crossed the independent authorization-time read");
  assert.equal(result.permitted, false);
  assert.equal(result.code, "STALE-PERMISSION");
  assert.equal(HOS.observe().attestation.expired, true);
});

test("RACE-003: two same-turn action requests are independently checked and immutable", async () => {
  const { HOS } = await createKernel();
  assert.equal((await HOS.demoAttest(HOS.DEMO_CHALLENGE)).ok, true);

  const results = await Promise.all([
    Promise.resolve().then(() => HOS.request("parallel-action-A")),
    Promise.resolve().then(() => HOS.request("parallel-action-B"))
  ]);
  assert.deepEqual(results.map(result => result.name), ["parallel-action-A", "parallel-action-B"]);
  assert.equal(results.every(result => result.permitted && result.code === "DEMO-PERMITTED"), true);
  assert.equal(results.every(Object.isFrozen), true, "each response is a detached immutable result");
  assert.equal(HOS.observe().attestation.status, "active", "requests do not mutate or consume the local demo marker");
});

test("RACE-004: phase-transition/action orderings obey the current declared phase", async () => {
  const transitionFirst = await createKernel();
  assert.equal((await transitionFirst.HOS.demoAttest(transitionFirst.HOS.DEMO_CHALLENGE)).ok, true);
  const [phaseResult, afterTransition] = await Promise.all([
    Promise.resolve().then(() => transitionFirst.HOS.transition("CWO")),
    Promise.resolve().then(() => transitionFirst.HOS.request("action-after-transition"))
  ]);
  assert.equal(phaseResult.ok, true);
  assert.equal(afterTransition.code, "CWO-FORBIDDEN");
  assert.equal(transitionFirst.HOS.observe().phase, "CWO");

  const actionFirst = await createKernel();
  assert.equal((await actionFirst.HOS.demoAttest(actionFirst.HOS.DEMO_CHALLENGE)).ok, true);
  const [beforeTransition, laterTransition] = await Promise.all([
    Promise.resolve().then(() => actionFirst.HOS.request("action-before-transition")),
    Promise.resolve().then(() => actionFirst.HOS.transition("CWO"))
  ]);
  assert.equal(beforeTransition.permitted, true, "the request is checked before the phase transition runs");
  assert.equal(laterTransition.ok, true);
  assert.equal(actionFirst.HOS.request("action-in-cwo").code, "CWO-FORBIDDEN");
});

test("RACE-005: concurrent ledger appends serialize into a verifiable hash chain", async () => {
  const { HOS } = await createKernel();
  await HOS.record("info", "RACE-005 barrier");
  const labels = ["RACE-005 append A", "RACE-005 append B", "RACE-005 append C"];
  const returnedRows = await Promise.all(labels.map(label => HOS.record("info", label)));
  const ledger = HOS.getLedger();
  const appended = ledger.filter(row => labels.includes(row.event));

  assert.equal(appended.map(row => row.event).join("|"), labels.join("|"), "concurrent calls preserve invocation order");
  assert.equal(returnedRows.map(row => row.event).join("|"), labels.join("|"));
  for (let index = 0; index < appended.length; index++) {
    const row = appended[index];
    const previous = ledger[ledger.findIndex(candidate => candidate.id === row.id) - 1];
    assert.equal(row.prevHash, previous.hash, `row ${row.id} links to the immediately preceding row`);
    const expectedHash = createHash("sha256")
      .update([row.id, row.ts, row.severity, row.event, row.prevHash, HOS.CREATOR_ID_FORMULA].join("|"))
      .digest("hex");
    assert.equal(row.hash, expectedHash, `row ${row.id} hashes its canonical fields`);
    if (index > 0) assert.equal(row.id, appended[index - 1].id + 1, "concurrent rows receive contiguous IDs");
  }
});

test("GSRB sovereign override bypasses low legitimacy only while the local Human Key is fresh", async () => {
  const { HOS, clock } = await createKernel();
  assert.equal((await HOS.demoAttest(HOS.DEMO_CHALLENGE)).ok, true);
  assert.equal(HOS.setAddressability(0).ok, true);
  for (let index = 0; index < 5; index++) assert.equal(HOS.acknowledgeCollapseStep(index).ok, true);
  assert.equal(HOS.transition("GSRB").ok, true);

  const ordinary = HOS.request("gsrb-low-legitimacy-without-override");
  assert.equal(ordinary.permitted, false);
  assert.equal(ordinary.code, "L-BELOW-TAU");
  assert.equal(ordinary.L, 0);

  const override = HOS.request("gsrb-explicit-low-legitimacy-override", { sovereignOverride: true });
  assert.equal(override.permitted, true);
  assert.equal(override.code, "DEMO-GSRB-OVERRIDE");
  assert.equal(override.L, 0, "the explicit GSRB option demonstrably bypasses the legitimacy threshold");
  assert.equal(override.executionScope, "LOCAL-DEMO-ONLY");

  clock.advance((HOS.DELTA_MAX + 1) * 1000);
  assert.equal(HOS.request("gsrb-stale-override", { sovereignOverride: true }).code, "STALE-PERMISSION", "override does not bypass temporal freshness");
  assert.equal((await HOS.demoAttest(HOS.DEMO_CHALLENGE)).ok, true);
  assert.equal(HOS.revoke("guided test").ok, true);
  assert.equal(HOS.request("gsrb-no-key-override", { sovereignOverride: true }).code, "NO-DEMO-CONFIRMATION", "override does not bypass the absent Human Key gate");
});

test("PROP-001: seeded command sequences preserve core kernel invariants", async () => {
  const seeds = [0x00c0ffee, 0x0badc0de, 0x5eed1234, 0x6a09e667];
  const knownPhases = new Set(["NAB", "CWO", "GSRB"]);
  const statuses = new Set(["absent", "pending", "active", "failed", "revoked"]);
  const operations = ["attest", "revoke", "request", "bad-phase", "factor-a", "factor-r", "bind", "burn", "ack", "phase", "advance", "publish", "production", "bad-factor"];

  function randomFor(seed) {
    let value = seed >>> 0;
    return () => {
      value ^= value << 13;
      value ^= value >>> 17;
      value ^= value << 5;
      return (value >>> 0) / 0x1_0000_0000;
    };
  }

  for (const seed of seeds) {
    const { HOS, clock } = await createKernel();
    const random = randomFor(seed);
    const trace = [];
    let previousBurned = HOS.observe().session.burned;

    for (let step = 0; step < 60; step++) {
      const operation = operations[Math.floor(random() * operations.length)];
      trace.push(operation);
      switch (operation) {
        case "attest": {
          const completion = HOS.demoAttest(HOS.DEMO_CHALLENGE);
          const pending = HOS.observe();
          assert.equal(pending.attestation.status, "pending", `seed=${seed} step=${step} trace=${trace.join(",")}`);
          assert.equal(pending.H, 0, `seed=${seed} step=${step}: pending never raises H`);
          assert.equal(HOS.request(`pending-${seed}-${step}`).permitted, false, `seed=${seed} step=${step}: pending request refused`);
          await completion;
          break;
        }
        case "revoke":
          HOS.revoke(`property seed ${seed} step ${step}`);
          break;
        case "request":
          HOS.request(`property action ${seed}-${step}`, { sovereignOverride: random() < 0.5 });
          break;
        case "bad-phase":
          HOS.transition(`UNKNOWN-${seed}-${step}`);
          break;
        case "factor-a":
          HOS.setAddressability(random());
          break;
        case "factor-r":
          HOS.setRepresentation(random());
          break;
        case "bind":
          HOS.bindSession(`property-session-${seed}-${step}`, ["query", "activate", "explain"][Math.floor(random() * 3)]);
          break;
        case "burn":
          HOS.burnSession(`property seed ${seed} step ${step}`);
          break;
        case "ack":
          HOS.acknowledgeCollapseStep(HOS.observe().gsrbAck);
          break;
        case "phase":
          HOS.transition(["NAB", "CWO", "GSRB"][Math.floor(random() * 3)]);
          break;
        case "advance":
          clock.advance(Math.floor(random() * (HOS.DELTA_MAX + 30) * 1000));
          break;
        case "publish":
          await HOS.publishDeclaration();
          break;
        case "production":
          assert.equal(HOS.requestProductionAttestation().code, "PRODUCTION-AUTHENTICATOR-UNAVAILABLE");
          break;
        case "bad-factor":
          assert.equal(HOS.setRepresentation(Number.NaN).code, "INVALID-FACTOR");
          break;
      }

      const snapshot = HOS.observe();
      const context = `seed=${seed} step=${step} op=${operation} trace=${trace.join(",")}`;
      assert.equal(knownPhases.has(snapshot.phase), true, `${context}: phase allowlist`);
      assert.equal(statuses.has(snapshot.attestation.status), true, `${context}: attestation status allowlist`);
      assert.equal(Number.isInteger(snapshot.gsrbAck) && snapshot.gsrbAck >= 0 && snapshot.gsrbAck <= 5, true, `${context}: collapse bounds`);
      assert.equal(snapshot.phase !== "GSRB" || snapshot.gsrbAck === 0, true, `${context}: GSRB consumes collapse acknowledgements`);
      assert.equal(snapshot.declared.declaredPhase, snapshot.phase, `${context}: declaration matches current phase`);
      assert.equal(snapshot.session.state === "non-acting" || snapshot.H === 1, true, `${context}: active session requires H=1`);
      assert.equal(snapshot.session.burned >= previousBurned, true, `${context}: session burn counter is monotonic`);
      previousBurned = snapshot.session.burned;

      if (snapshot.attestation.status === "active") {
        assert.equal(snapshot.H, 1, `${context}: active attestation requires H=1`);
      } else {
        assert.equal(snapshot.H, 0, `${context}: non-active attestation requires H=0`);
      }
      if (snapshot.attestation.fresh) {
        assert.equal(snapshot.attestation.status, "active", `${context}: only active attestation can be fresh`);
        assert.equal(snapshot.metrics.demoTimerFresh, true, `${context}: freshness telemetry agrees`);
      }
      if (snapshot.attestation.expired) {
        assert.equal(snapshot.attestation.status, "active", `${context}: expiry is derived only for active state`);
        assert.equal(snapshot.metrics.demoTimerFresh, false, `${context}: expired state is not fresh`);
      }

      const checkedAction = HOS.request(`property invariant check ${seed}-${step}`);
      if (snapshot.H === 0 || snapshot.attestation.expired || snapshot.phase === "CWO") {
        assert.equal(checkedAction.permitted, false, `${context}: absent, expired, or CWO state cannot permit`);
      }
      assert.equal(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.attestation) && Object.isFrozen(snapshot.session), true, `${context}: observations remain immutable`);
    }
  }
});
