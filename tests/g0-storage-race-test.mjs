/*
 * Cross-tab storage staleness probe for the local Ground-0 workspace.
 * Run directly: node --test tests/g0-storage-race-test.mjs
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";

const [engineSource, cloudSource] = await Promise.all([
  readFile(new URL("../js/g0-engine.js", import.meta.url), "utf8"),
  readFile(new URL("../js/apps-cloud.js", import.meta.url), "utf8")
]);

function makeSharedStorage() {
  const data = new Map([["hos-cloud-storage-epoch", "epoch-0"]]);
  return {
    data,
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function createTab(storage) {
  const listeners = new Map();
  const sandbox = {
    console,
    crypto: webcrypto,
    TextEncoder,
    localStorage: storage,
    APPS: [],
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    }
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.dispatch = (type, event) => {
    for (const callback of listeners.get(type) || []) callback(event);
  };
  vm.createContext(sandbox);
  vm.runInContext(engineSource, sandbox, { filename: "js/g0-engine.js" });
  vm.runInContext(cloudSource, sandbox, { filename: "js/apps-cloud.js" });
  return { sandbox, G0: sandbox.G0 };
}

test("RACE-007: another tab's storage event blocks stale Ground-0 writes", () => {
  const storage = makeSharedStorage();
  const tabA = createTab(storage);
  const tabB = createTab(storage);
  const auditsA = [{ id: "tab-a-audit", name: "Tab A version", phase: "NAB" }];
  const auditsB = [{ id: "tab-b-audit", name: "Tab B stale edit", phase: "CWO" }];

  assert.equal(tabA.sandbox.HOSCloudStorageGuard(), true);
  assert.equal(tabB.sandbox.HOSCloudStorageGuard(), true);
  assert.equal(tabA.G0.saveAuditRecords(auditsA), true, "the first tab saves against its current storage epoch");

  // A browser dispatches a storage event to the other document after the
  // shared storage mutation. Deliver that event before the second tab writes.
  tabB.sandbox.dispatch("storage", { key: "ground-0-audits-v1" });
  assert.equal(tabB.sandbox.HOSCloudStorageGuard(), false, "the second tab detects its stale local snapshot");
  assert.equal(tabB.G0.saveAuditRecords(auditsB), false, "stale write is refused rather than overwriting the first save");
  assert.match(tabB.G0.storageNoteOf(), /Another tab changed saved data/);
  assert.deepEqual(JSON.parse(storage.getItem("ground-0-audits-v1")), auditsA);
});
