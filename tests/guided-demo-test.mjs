/* Exercises the guided scenario against two real kernel instances.
   The demo clock is virtualized; no browser wall-clock wait is required. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { TextEncoder } from "node:util";
import { webcrypto } from "node:crypto";

const [cryptoSource, dataSource, kernelSource, runnerSource] = await Promise.all([
  readFile(new URL("../js/crypto.js", import.meta.url), "utf8"),
  readFile(new URL("../js/data.js", import.meta.url), "utf8"),
  readFile(new URL("../js/kernel.js", import.meta.url), "utf8"),
  readFile(new URL("../js/guided-demo.js", import.meta.url), "utf8")
]);

function createKernel() {
  let timestamp = Date.now();
  class DemoDate extends Date {
    constructor(...args) { super(...(args.length ? args : [timestamp])); }
    static now() { return timestamp; }
  }
  const sandbox = {
    console,
    crypto: webcrypto,
    Date: DemoDate,
    TextEncoder,
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const [filename, source] of [
    ["js/crypto.js", cryptoSource],
    ["js/data.js", dataSource],
    ["js/kernel.js", kernelSource],
    ["js/guided-demo.js", runnerSource]
  ]) vm.runInContext(source, sandbox, { filename });
  return {
    sandbox,
    HOS: sandbox.HOS,
    clock: {
      now: () => timestamp,
      advance: milliseconds => { timestamp += milliseconds; }
    }
  };
}

function operationalSnapshot(HOS) {
  const snapshot = HOS.observe();
  return JSON.stringify({
    bootId: snapshot.bootId,
    H: snapshot.H,
    A: snapshot.A,
    R: snapshot.R,
    phase: snapshot.phase,
    declared: snapshot.declared,
    attestation: snapshot.attestation,
    session: snapshot.session,
    gsrbAck: snapshot.gsrbAck,
    ledger: HOS.getLedger()
  });
}

test("guided refusal demo runs seven ordered gates in a disposable HOS instance", async () => {
  const live = createKernel();
  const demo = createKernel();
  await Promise.all([live.HOS.ready, demo.HOS.ready]);

  assert.equal((await live.HOS.demoAttest(live.HOS.DEMO_CHALLENGE)).ok, true);
  assert.equal(live.HOS.setAddressability(0.75).ok, true);
  await live.HOS.record("info", "guided-demo live-state baseline barrier");
  const activeSnapshot = operationalSnapshot(live.HOS);

  const emitted = [];
  const result = await demo.sandbox.HOSGuidedDemo.run(demo.HOS, {
    onStep: step => emitted.push(step),
    wait: async milliseconds => {
      demo.clock.advance(milliseconds * demo.sandbox.HOSGuidedDemo.CLOCK_SCALE);
      await new Promise(resolve => setImmediate(resolve));
    }
  });

  assert.equal(result.ok, true, "all scenario expectations and sandbox ledger checks should pass");
  assert.equal(result.completed, 7);
  assert.equal(result.total, 7);
  assert.deepEqual(emitted.map(step => step.id), [
    "no-human-key",
    "human-key-present",
    "degraded-addressability",
    "expired-time",
    "reattestation",
    "cwo-refusal",
    "gsrb-override"
  ]);
  assert.equal(operationalSnapshot(live.HOS), activeSnapshot, "the active desktop kernel state and ledger are untouched");

  const [noKey, key, addressability, expiry, reattested, cwo, gsrb] = emitted;
  assert.equal(noKey.code, "NO-DEMO-CONFIRMATION");
  assert.equal(noKey.state.H, 0);
  assert.equal(key.code, "DEMO-PERMITTED");
  assert.equal(key.state.H, 1);
  assert.ok(key.state.legitimacy >= live.HOS.TAU);
  assert.equal(addressability.code, "L-BELOW-TAU");
  assert.equal(addressability.state.A, 0.25);
  assert.ok(addressability.state.legitimacy < demo.HOS.TAU);
  assert.equal(expiry.code, "STALE-PERMISSION");
  assert.ok(expiry.state.deltaSeconds >= demo.HOS.DELTA_MAX);
  assert.equal(reattested.code, "DEMO-PERMITTED");
  assert.equal(reattested.state.H, 1);
  assert.ok(reattested.state.legitimacy >= demo.HOS.TAU);
  assert.equal(cwo.code, "CWO-FORBIDDEN");
  assert.equal(cwo.secondaryCode, "CWO-FORBIDDEN", "CWO also refuses when legitimacy is above threshold");
  assert.equal(cwo.secondaryLabel, "AT HIGH L");
  assert.match(cwo.details, /At high L=(?:0\.[5-9]\d*|1\.000)/);
  assert.equal(cwo.state.phase, "CWO");
  assert.equal(cwo.state.legitimacy, 0, "the witness-only denial holds even at L=0");
  assert.equal(gsrb.code, "DEMO-GSRB-OVERRIDE");
  assert.equal(gsrb.secondaryCode, "L-BELOW-TAU");
  assert.equal(gsrb.state.phase, "GSRB");
  assert.equal(gsrb.state.legitimacy, 0);
  assert.equal(gsrb.permitted, true, "the explicit local GSRB option overrides the modeled legitimacy threshold");

  for (const step of emitted) {
    assert.equal(step.pass, true, `${step.id} meets its expected gate result`);
    assert.equal(step.ledger.verified, true, `${step.id} has a verified sandbox ledger row`);
    assert.match(step.ledger.hash, /^[a-f0-9]{64}$/);
  }
  assert.equal(demo.HOS.observe().phase, "GSRB", "the final GSRB state exists only in the disposable kernel");
  assert.equal(live.HOS.observe().phase, "NAB", "the active page remains in its original phase");
});
