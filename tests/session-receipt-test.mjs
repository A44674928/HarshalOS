/* Priority 7: local demo session/ledger binding and termination receipts.
   Run: node --test tests/session-receipt-test.mjs */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";

async function createKernel() {
  const sandbox = {
    console,
    crypto: webcrypto,
    TextEncoder,
    setInterval: () => 1,
    clearInterval: () => {}
  };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  for (const file of ["js/crypto.js", "js/data.js", "js/kernel.js"]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    vm.runInContext(source, sandbox, { filename: file });
  }
  const HOS = sandbox.HOS;
  await HOS.ready;
  return HOS;
}

function eventPayload(row, prefix) {
  assert.ok(row.event.startsWith(prefix), `expected ${prefix} row`);
  return JSON.parse(row.event.slice(prefix.length));
}

test("P7: termination receipt binds Session-ID, Boot-ID, PDH-ID, attestation ID, and ledger roots", async () => {
  const HOS = await createKernel();
  const initialClose = await HOS.closeSession("nothing to close");
  assert.equal(initialClose.ok, false);
  assert.equal(initialClose.code, "NO-ACTIVE-SESSION");

  const attestation = await HOS.demoAttest(HOS.DEMO_CHALLENGE);
  assert.equal(attestation.ok, true);
  const attested = HOS.observe();
  assert.match(attested.bootId, /^BOOT-[a-f0-9]{32}$/);
  assert.match(attested.attestation.humanAttestationId, /^HAT-[A-F0-9]{64}$/);
  assert.equal(attested.security.mode, "DEMO");
  assert.equal(attested.security.independentReceiptSignatureAvailable, false);

  const binding = HOS.bindSession("WhyExample", "activate");
  assert.equal(binding.ok, true);
  assert.equal(binding.mode, "DEMO");
  assert.equal(binding.executionScope, "LOCAL-DEMO-ONLY");
  assert.match(binding.sessionId, /^SID-[a-f0-9]{32}$/);
  assert.equal(binding.bootId, attested.bootId);
  assert.equal(binding.humanAttestationId, attested.attestation.humanAttestationId);
  assert.equal(binding.pdhId, `PDH-${attested.declared.declarationHash.slice(2)}`);

  const active = HOS.observe();
  assert.equal(active.session.sessionId, binding.sessionId);
  assert.equal(active.session.bootId, binding.bootId);
  assert.equal(active.session.pdhId, binding.pdhId);
  assert.equal(active.session.humanAttestationId, binding.humanAttestationId);
  assert.equal("bound" in active.session, false, "the caller-supplied binding stays private");

  const firstClose = HOS.closeSession("operator closed demo session");
  const racingClose = HOS.closeSession("racing duplicate close");
  const [receipt, raceResult] = await Promise.all([firstClose, racingClose]);
  assert.equal(receipt.ok, true);
  assert.equal(raceResult.ok, false);
  assert.equal(raceResult.code, "NO-ACTIVE-SESSION", "two closes in one turn cannot mint duplicate receipts");
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(receipt.schema, "HOS-DEMO-SESSION-RECEIPT-1");
  assert.equal(receipt.assurance, "LOCAL-DEMO-INTEGRITY-NOT-AUTHENTICATION");
  assert.equal(receipt.mode, "DEMO");
  assert.equal(receipt.executionScope, "LOCAL-DEMO-ONLY");
  assert.equal(receipt.sessionId, binding.sessionId);
  assert.equal(receipt.bootId, binding.bootId);
  assert.equal(receipt.pdhId, binding.pdhId);
  assert.equal(receipt.humanAttestationId, binding.humanAttestationId);
  assert.equal(receipt.operation, "activate");
  assert.equal(receipt.terminationStatus, "CLOSED");
  assert.equal(receipt.terminationReason, "operator closed demo session");
  assert.match(receipt.receiptHash, /^0x[A-F0-9]{64}$/);
  assert.match(receipt.bindingLedgerRoot, /^[a-f0-9]{64}$/);
  assert.match(receipt.terminationLedgerRoot, /^[a-f0-9]{64}$/);
  assert.match(receipt.ledgerRoot, /^[a-f0-9]{64}$/);
  assert.equal("signature" in receipt, false, "the local digest is not represented as a signature");
  assert.equal(HOS.observe().session.state, "non-acting");
  assert.equal(HOS.observe().session.burned, 1);

  const rows = HOS.getLedger();
  const bindingRow = rows.find(row => row.hash === receipt.bindingLedgerRoot);
  const terminationRow = rows.find(row => row.hash === receipt.terminationLedgerRoot);
  const receiptRow = rows.find(row => row.hash === receipt.ledgerRoot);
  assert.ok(bindingRow && terminationRow && receiptRow);
  assert.ok(bindingRow.id < terminationRow.id && terminationRow.id < receiptRow.id);
  assert.equal(receiptRow.id, receipt.receiptLedgerId);

  const bindingEvent = eventPayload(bindingRow, "HOS_DEMO_SESSION_BINDING ");
  const terminationEvent = eventPayload(terminationRow, "HOS_DEMO_SESSION_TERMINATION ");
  const receiptEvent = eventPayload(receiptRow, "HOS_DEMO_SESSION_RECEIPT ");
  for (const key of ["sessionId", "bootId", "pdhId", "humanAttestationId", "operation", "openedAt"]) {
    assert.equal(bindingEvent[key], receipt[key], `binding event agrees on ${key}`);
    assert.equal(terminationEvent[key], receipt[key], `termination event agrees on ${key}`);
  }
  assert.equal(terminationEvent.terminationStatus, receipt.terminationStatus);
  assert.equal(terminationEvent.terminationReason, receipt.terminationReason);
  assert.equal(receiptEvent.receiptHash, receipt.receiptHash);
  assert.equal(receiptRow.hash, receipt.ledgerRoot, "the receipt event's chain hash is the returned Ledger-Root");
  assert.equal(terminationRow.hash, receipt.terminationLedgerRoot);
  assert.equal(bindingRow.hash, receipt.bindingLedgerRoot);

  const verified = await HOS.verifySessionReceipt(receipt, rows);
  assert.equal(verified.ok, true);
  assert.equal(verified.verified, true);
  assert.equal(verified.sessionId, receipt.sessionId);
  assert.equal(verified.ledgerRoot, receipt.ledgerRoot);
  assert.equal(verified.executionScope, "LOCAL-DEMO-ONLY");
  await HOS.record("info", "later ledger row after the receipt root");
  assert.equal((await HOS.verifySessionReceipt(receipt, HOS.getLedger())).verified, true,
    "the receipt remains verifiable as an immutable ledger prefix after later appends");

  const alteredReceipt = { ...receipt, humanAttestationId: `HAT-${"0".repeat(64)}` };
  const alteredCheck = await HOS.verifySessionReceipt(alteredReceipt, rows);
  assert.equal(alteredCheck.ok, false);
  assert.equal(alteredCheck.code, "SESSION-RECEIPT-HASH-MISMATCH");

  const alteredRows = rows.map(row => ({ ...row }));
  const bindingIndex = alteredRows.findIndex(row => row.hash === receipt.bindingLedgerRoot);
  alteredRows[bindingIndex].event += " tampered";
  const ledgerCheck = await HOS.verifySessionReceipt(receipt, alteredRows);
  assert.equal(ledgerCheck.ok, false);
  assert.equal(ledgerCheck.code, "SESSION-LEDGER-CHAIN-INVALID");

  const truncatedCheck = await HOS.verifySessionReceipt(receipt, rows.slice(-3));
  assert.equal(truncatedCheck.ok, false, "a receipt without its genesis-to-root ledger prefix is not locally verifiable");
  const duplicateClose = await HOS.closeSession("duplicate close");
  assert.equal(duplicateClose.ok, false);
  assert.equal(duplicateClose.code, "NO-ACTIVE-SESSION");
});

test("P7: re-binding records the previous tuple's termination before opening the next session", async () => {
  const HOS = await createKernel();
  assert.equal((await HOS.demoAttest(HOS.DEMO_CHALLENGE)).ok, true);

  const first = HOS.bindSession("first-binding", "query");
  const second = HOS.bindSession("second-binding", "explain");
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.notEqual(first.sessionId, second.sessionId);

  const receipt = await HOS.closeSession("close replacement session");
  assert.equal(receipt.ok, true);
  const rows = HOS.getLedger();
  const priorTermination = rows
    .map(row => ({ row, event: row.event.startsWith("HOS_DEMO_SESSION_TERMINATION ")
      ? JSON.parse(row.event.slice("HOS_DEMO_SESSION_TERMINATION ".length)) : null }))
    .find(entry => entry.event?.sessionId === first.sessionId);
  assert.ok(priorTermination, "the replaced session has a structured termination event");
  assert.equal(priorTermination.event.terminationStatus, "REPLACED-BY-NEW-SESSION");
  assert.equal(priorTermination.event.bootId, first.bootId);
  assert.equal(priorTermination.event.pdhId, first.pdhId);
  assert.equal(priorTermination.event.humanAttestationId, first.humanAttestationId);
  assert.ok(priorTermination.row.id < rows.find(row => row.hash === receipt.bindingLedgerRoot).id);
  assert.equal((await HOS.verifySessionReceipt(receipt, rows)).verified, true);
});

test("P7: burn termination rows bind the same four IDs even when no receipt is requested", async () => {
  const HOS = await createKernel();
  assert.equal((await HOS.demoAttest(HOS.DEMO_CHALLENGE)).ok, true);
  const binding = HOS.bindSession("burn-me", "query");
  assert.equal(binding.ok, true);
  const burned = HOS.burnSession("operator burn");
  assert.equal(burned.ok, true);
  assert.equal(burned.terminated, true);
  await HOS.record("info", "flush pending session events for the assertion");

  const row = HOS.getLedger().find(entry => entry.event.startsWith("HOS_DEMO_SESSION_TERMINATION ") &&
    JSON.parse(entry.event.slice("HOS_DEMO_SESSION_TERMINATION ".length)).sessionId === binding.sessionId);
  assert.ok(row);
  const event = eventPayload(row, "HOS_DEMO_SESSION_TERMINATION ");
  assert.equal(event.terminationStatus, "BURNED");
  assert.equal(event.sessionId, binding.sessionId);
  assert.equal(event.bootId, binding.bootId);
  assert.equal(event.pdhId, binding.pdhId);
  assert.equal(event.humanAttestationId, binding.humanAttestationId);
  assert.equal(HOS.observe().session.state, "non-acting");
});

test("P7: independent demo kernels receive distinct per-boot and per-session IDs", async () => {
  const left = await createKernel();
  const right = await createKernel();
  assert.notEqual(left.observe().bootId, right.observe().bootId);
  assert.equal((await left.demoAttest(left.DEMO_CHALLENGE)).ok, true);
  assert.equal((await right.demoAttest(right.DEMO_CHALLENGE)).ok, true);
  const leftSession = left.bindSession("same-caller-label", "query");
  const rightSession = right.bindSession("same-caller-label", "query");
  assert.equal(leftSession.ok, true);
  assert.equal(rightSession.ok, true);
  assert.notEqual(leftSession.sessionId, rightSession.sessionId);
});
