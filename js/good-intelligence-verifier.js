/* Good Intelligence — cryptographic verification for the synthetic demo fixtures.
   The embedded key is a throwaway demo root, never a production authority. */
"use strict";

window.GoodIntelligenceVerifier = (() => {
  const DEMO_KEY_ID = "empty-domains-demo-root-v1";
  const DEMO_PUBLIC_JWK = Object.freeze({
    kty: "EC", crv: "P-256", x: "-nZ5wTv9ogaXDGjBQXD-5mbD7mBgt8i8uZxQGGERtvs",
    y: "9VA6MDBwBcnHmaraX9RLMI676kmHo7rBO1tsXNG4N5M", key_ops: ["verify"], ext: true
  });
  const keyCache = new Map();
  const subtle = () => window.crypto && window.crypto.subtle;

  function decodeBase64Url(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
    try {
      const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
      const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
      return Uint8Array.from(binary, character => character.charCodeAt(0));
    } catch { return null; }
  }

  function canonicalLegitimacyPayload(sourceId, legitimacy) {
    return JSON.stringify({
      schema: "gi-source-legitimacy-v1", sourceId, status: legitimacy.status,
      issuer: legitimacy.issuer, validFrom: legitimacy.validFrom,
      validUntil: legitimacy.validUntil, reference: legitimacy.reference
    });
  }

  function importedDemoKey() {
    if (!keyCache.has(DEMO_KEY_ID)) {
      const cryptoSubtle = subtle();
      if (!cryptoSubtle) return Promise.reject(new Error("Web Crypto is unavailable."));
      keyCache.set(DEMO_KEY_ID, cryptoSubtle.importKey(
        "jwk", DEMO_PUBLIC_JWK, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]
      ));
    }
    return keyCache.get(DEMO_KEY_ID);
  }

  async function verifySourceLegitimacy(item, { allowDemoRoot = false } = {}) {
    const legitimacy = item && item.assurance && item.assurance.source && item.assurance.source.legitimacy;
    const attestation = legitimacy && legitimacy.attestation;
    if (!attestation) return { verified: false, status: "missing", keyId: "", trust: "none", reason: "No signature supplied." };
    if (!allowDemoRoot || item.demo !== true) return { verified: false, status: "untrusted", keyId: String(attestation.keyId || ""), trust: "none", reason: "The demo root is trusted only for the built-in empty.domains demo endpoint." };
    if (attestation.keyId !== DEMO_KEY_ID || attestation.algorithm !== "ECDSA-P256-SHA256") {
      return { verified: false, status: "untrusted", keyId: String(attestation.keyId || ""), trust: "none", reason: "No configured trust root matches this signature." };
    }
    if (typeof item.sourceId !== "string" || !item.sourceId.trim()) {
      return { verified: false, status: "invalid", keyId: DEMO_KEY_ID, trust: "demo-only", reason: "A source identifier is required." };
    }
    const signature = decodeBase64Url(attestation.signature);
    if (!signature) return { verified: false, status: "invalid", keyId: DEMO_KEY_ID, trust: "demo-only", reason: "The signature encoding is invalid." };

    try {
      const cryptoSubtle = subtle();
      if (!cryptoSubtle) throw new Error("Web Crypto is unavailable.");
      const key = await importedDemoKey();
      const verified = await cryptoSubtle.verify(
        { name: "ECDSA", hash: "SHA-256" }, key, signature,
        new TextEncoder().encode(canonicalLegitimacyPayload(item.sourceId, legitimacy))
      );
      return verified
        ? { verified: true, status: "verified", keyId: DEMO_KEY_ID, trust: "demo-only", reason: "Signature matches the pinned synthetic demo key." }
        : { verified: false, status: "invalid", keyId: DEMO_KEY_ID, trust: "demo-only", reason: "Signed source-authorization fields do not match this packet." };
    } catch {
      return { verified: false, status: "unavailable", keyId: DEMO_KEY_ID, trust: "demo-only", reason: "Local cryptographic verification could not be completed." };
    }
  }

  return Object.freeze({ DEMO_KEY_ID, verifySourceLegitimacy });
})();
