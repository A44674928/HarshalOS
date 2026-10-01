import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import vm from "node:vm";
import test from "node:test";
import { handleGoodIntelligenceDemo } from "../worker/good-intelligence-demo.mjs";

const verifierSource = await readFile(new URL("../js/good-intelligence-verifier.js", import.meta.url), "utf8");
const assuranceSource = await readFile(new URL("../js/good-intelligence-assurance.js", import.meta.url), "utf8");
const clientSource = await readFile(new URL("../js/good-intelligence-client.js", import.meta.url), "utf8");
const NOW = Date.parse("2026-09-30T12:00:00.000Z");

function modules() {
  const values = new Map();
  const window = {
    crypto: webcrypto,
    location: { origin: "https://hos.example" },
    localStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); }
    }
  };
  const context = vm.createContext({ window, URL, Date, TextEncoder, atob, AbortController, setTimeout, clearTimeout, crypto: webcrypto });
  vm.runInContext(assuranceSource, context, { filename: "js/good-intelligence-assurance.js" });
  vm.runInContext(verifierSource, context, { filename: "js/good-intelligence-verifier.js" });
  vm.runInContext(clientSource, context, { filename: "js/good-intelligence-client.js" });
  return { assurance: window.GoodIntelligenceAssurance, verifier: window.GoodIntelligenceVerifier, client: window.GoodIntelligenceClient };
}

async function fixtureFeed() {
  const response = await handleGoodIntelligenceDemo(
    new Request("https://empty.domains/api/good-intelligence/v1/content/me"), NOW
  );
  assert.equal(response.status, 200);
  return (await response.json()).data;
}

test("synthetic API legitimacy signatures verify against the pinned demo root", async () => {
  const { verifier, client } = modules();
  const [raw] = await fixtureFeed();
  const item = client.normalizeIntel(raw);
  const verification = await verifier.verifySourceLegitimacy(item, { allowDemoRoot: true });
  assert.equal(item.demo, true);
  assert.equal(item.assurance.source.legitimacy.attestation.algorithm, "ECDSA-P256-SHA256");
  assert.equal(verification.verified, true);
  assert.equal(verification.status, "verified");
  assert.equal(verification.keyId, "empty-domains-demo-root-v1");
  assert.equal(verification.trust, "demo-only");
});

test("tampering with signed source fields, source identity, or key id is rejected", async () => {
  const { verifier, client } = modules();
  const [raw] = await fixtureFeed();
  const item = client.normalizeIntel(raw);

  const changedIssuer = structuredClone(item);
  changedIssuer.assurance.source.legitimacy.issuer = "Impersonated Registry";
  assert.equal((await verifier.verifySourceLegitimacy(changedIssuer, { allowDemoRoot: true })).status, "invalid");

  const changedSourceId = { ...item, sourceId: "different-source" };
  assert.equal((await verifier.verifySourceLegitimacy(changedSourceId, { allowDemoRoot: true })).status, "invalid");

  const changedStatus = structuredClone(item);
  changedStatus.assurance.source.legitimacy.status = "revoked";
  assert.equal((await verifier.verifySourceLegitimacy(changedStatus, { allowDemoRoot: true })).status, "invalid");

  const unknownKey = structuredClone(item);
  unknownKey.assurance.source.legitimacy.attestation.keyId = "unregistered-root";
  assert.equal((await verifier.verifySourceLegitimacy(unknownKey, { allowDemoRoot: true })).status, "untrusted");
});

test("demo key is not trusted for non-demo API records or unsigned packets", async () => {
  const { verifier, client } = modules();
  const [raw] = await fixtureFeed();
  const item = client.normalizeIntel(raw);
  assert.equal((await verifier.verifySourceLegitimacy(item)).status, "untrusted");
  assert.equal((await verifier.verifySourceLegitimacy({ ...item, demo: false }, { allowDemoRoot: true })).status, "untrusted");
  assert.equal((await verifier.verifySourceLegitimacy({ ...item, assurance: null })).status, "missing");
});

test("attestation verification gates the source score and does not trust an API boolean", async () => {
  const { assurance, verifier, client } = modules();
  const [raw] = await fixtureFeed();
  const item = client.normalizeIntel(raw);
  const valid = await verifier.verifySourceLegitimacy(item, { allowDemoRoot: true });
  const validResult = assurance.evaluate(item.assurance, null, item, NOW, valid);
  assert.equal(validResult.source.factors.find(factor => factor.id === "legitimacy").score, 100);

  const altered = structuredClone(item);
  altered.assurance.source.legitimacy.attestation.signature = "invalid-signature";
  // The packet still says signatureVerified=true; a failed local check must override that claim.
  const invalid = await verifier.verifySourceLegitimacy(altered, { allowDemoRoot: true });
  const invalidResult = assurance.evaluate(altered.assurance, null, altered, NOW, invalid);
  assert.equal(invalidResult.source.factors.find(factor => factor.id === "legitimacy").score, 0);
  assert.match(invalidResult.source.factors.find(factor => factor.id === "legitimacy").detail, /failed local verification/);
});

test("stale but authentic demo authorization stays expired", async () => {
  const { assurance, verifier, client } = modules();
  const [, rawStale] = await fixtureFeed();
  const item = client.normalizeIntel(rawStale);
  const verification = await verifier.verifySourceLegitimacy(item, { allowDemoRoot: true });
  assert.equal(verification.verified, true);
  const result = assurance.evaluate(item.assurance, null, item, NOW, verification);
  assert.equal(result.source.factors.find(factor => factor.id === "legitimacy").score, 0);
  assert.match(result.source.factors.find(factor => factor.id === "legitimacy").detail, /expired/);
});
