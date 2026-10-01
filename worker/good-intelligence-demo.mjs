/*
 * Empty.domains Good Intelligence demonstration API.
 * Synthetic fixtures only; every route is explicitly read-only and carries a demo header.
 */
const PREFIX = "/api/good-intelligence/v1";
const json = (data, status = 200) => Response.json(data, {
  status,
  headers: {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-HOS-Demo-API": "true"
  }
});
const ago = (now, minutes) => new Date(now - minutes * 60_000).toISOString();
const fromNow = (now, minutes) => new Date(now + minutes * 60_000).toISOString();
const DEMO_KEY_ID = "empty-domains-demo-root-v1";
// Throwaway test key only. It is intentionally not an operational source-authorization key.
const DEMO_PRIVATE_JWK = Object.freeze({
  kty: "EC", crv: "P-256", x: "-nZ5wTv9ogaXDGjBQXD-5mbD7mBgt8i8uZxQGGERtvs",
  y: "9VA6MDBwBcnHmaraX9RLMI676kmHo7rBO1tsXNG4N5M", d: "OLr8TovYPkQSLOSvmZ83vRtVgzFvjYWJJZs5vonnKO4",
  key_ops: ["sign"], ext: true
});
const encoder = new TextEncoder();
let signingKeyPromise;

function canonicalLegitimacyPayload(sourceId, legitimacy) {
  return JSON.stringify({
    schema: "gi-source-legitimacy-v1", sourceId, status: legitimacy.status,
    issuer: legitimacy.issuer, validFrom: legitimacy.validFrom,
    validUntil: legitimacy.validUntil, reference: legitimacy.reference
  });
}

async function signDemoLegitimacy(sourceId, legitimacy) {
  signingKeyPromise ||= crypto.subtle.importKey("jwk", DEMO_PRIVATE_JWK, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const key = await signingKeyPromise;
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(canonicalLegitimacyPayload(sourceId, legitimacy))
  ));
  let binary = "";
  signature.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function fixturePacket(now, variant = "fresh", sourceId = "") {
  const pending = variant === "contested";
  const stale = variant === "stale";
  const originTime = stale ? now - 96 * 24 * 60 * 60_000 : now - 24 * 60 * 60_000;
  const packet = {
    schema: "gi-assurance-v1",
    assessmentId: `EMPTY-DEMO-${variant.toUpperCase()}`,
    assessedAt: ago(now, 30),
    source: {
      identity: { status: "verified", method: "empty.domains sandbox registry", verifiedAt: ago(now, 60) },
      ground0: {
        status: "verified", phase: pending ? "GSRB" : "NAB", badgeStatus: "confirmed", version: "1.0",
        auditId: `EMPTY-DEMO-G0-${variant.toUpperCase()}`, assessedAt: ago(now, 45)
      },
      pdh: {
        status: stale ? "stale" : "valid", signatureVerified: true, consistent: true,
        effectiveAt: new Date(originTime).toISOString(), originKeyId: "EMPTY-DOMAINS-DEMO-KEY"
      },
      legitimacy: {
        status: stale ? "expired" : "verified", issuer: "empty.domains Demo Registry", signatureVerified: true,
        validFrom: ago(now, 60), validUntil: stale ? ago(now, 1) : fromNow(now, 7 * 24 * 60),
        reference: `https://empty.domains/demo/sources/${variant}`
      }
    },
    signal: {
      publishedAt: ago(now, 20),
      validUntil: stale ? ago(now, 1) : fromNow(now, 6 * 60),
      reviewStatus: pending ? "pending" : "reviewed",
      evidence: pending ? [] : [
        { url: "https://primary.example.test/demo-bulletin", sourceId: "fixture-primary-01", kind: "primary", status: "verified", independent: true },
        { url: "https://independent.example.test/demo-check", sourceId: "fixture-independent-02", kind: "secondary", status: "verified", independent: true }
      ],
      conflictsReviewed: !pending,
      conflicts: pending ? [{ status: "unresolved" }] : [],
      scope: {
        description: "Synthetic regional exercise only",
        decisionContext: "Training and UI validation; do not operationalize",
        jurisdiction: "Empty.domains sandbox"
      }
    }
  };
  const legitimacy = packet.source.legitimacy;
  legitimacy.attestation = {
    algorithm: "ECDSA-P256-SHA256",
    keyId: DEMO_KEY_ID,
    signature: await signDemoLegitimacy(sourceId, legitimacy)
  };
  return packet;
}

function demoMarketBars(now, profile, count = 360) {
  const hour = 60 * 60_000;
  const latestClose = Math.floor(now / hour) * hour;
  const bars = [];
  let previousClose = null;
  for (let index = 0; index < count; index++) {
    const close = profile.base + index * profile.drift +
      Math.sin(index / 9 + profile.phase) * profile.amplitude +
      Math.sin(index / 3.5 + profile.phase) * profile.amplitude * 0.33 +
      Math.sin(index / 26 + profile.phase) * profile.longWave;
    const open = previousClose === null ? close - 0.12 : previousClose;
    const high = Math.max(open, close) + 0.15 + 0.12 * (1 + Math.sin(index * 2.3));
    const low = Math.min(open, close) - 0.15 - 0.12 * (1 + Math.cos(index * 1.9));
    const volume = profile.volume + profile.volumeSwing * (1 + Math.sin(index / 4.4 + profile.phase)) +
      profile.volumeSwing * 0.3 * (1 + Math.cos(index / 10.3));
    bars.push({
      time: new Date(latestClose - (count - index - 1) * hour).toISOString(),
      open, high, low, close, volume: Math.max(1, volume), confirmed: true
    });
    previousClose = close;
  }
  return bars;
}

function demoMarketFixtures(now) {
  // Eight deterministic synthetic profiles: the three original demo history series plus the
  // headline names of the Tickerbot allowlist (INTC, AMD, NET, CVX, XOM), so the no-key demo
  // still shows a sector spread. Every profile is generated, labeled, and never a real price.
  const profiles = [
    { symbol: "AAPL-DEMO", label: "AAPL", base: 190, drift: 0.025, amplitude: 4.2, longWave: 2.8, phase: 0, volume: 1500, volumeSwing: 380 },
    { symbol: "MSFT-DEMO", label: "MSFT", base: 420, drift: 0.04, amplitude: 8.5, longWave: 5.2, phase: 1.1, volume: 1100, volumeSwing: 240 },
    { symbol: "NVDA-DEMO", label: "NVDA", base: 130, drift: 0.08, amplitude: 11, longWave: 7.5, phase: 2.4, volume: 2400, volumeSwing: 900 },
    { symbol: "INTC-DEMO", label: "INTC", base: 24.5, drift: -0.004, amplitude: 0.9, longWave: 0.6, phase: 0.7, volume: 5200, volumeSwing: 1400 },
    { symbol: "AMD-DEMO", label: "AMD", base: 155, drift: 0.05, amplitude: 6.5, longWave: 4.4, phase: 3.1, volume: 2600, volumeSwing: 780 },
    { symbol: "NET-DEMO", label: "NET", base: 78, drift: 0.045, amplitude: 3.8, longWave: 2.6, phase: 1.8, volume: 900, volumeSwing: 320 },
    { symbol: "CVX-DEMO", label: "CVX", base: 152, drift: 0.008, amplitude: 2.4, longWave: 1.7, phase: 2.9, volume: 700, volumeSwing: 190 },
    { symbol: "XOM-DEMO", label: "XOM", base: 112, drift: 0.006, amplitude: 1.9, longWave: 1.3, phase: 4.2, volume: 1200, volumeSwing: 300 }
  ];
  return profiles.map((profile, index) => ({
    _id: `empty-demo-market-${String(index + 1).padStart(2, "0")}`,
    title: `[DEMO] ${profile.label} simulated price and flow`,
    body: `Synthetic ${profile.label} ticker exercise. These generated hourly prices and volumes are not real market data.`,
    category: "Markets",
    address: `EMPTY-DEMO-MARKET-${String(index + 1).padStart(2, "0")}`,
    sourceId: `empty-demo-market-${String(index + 1).padStart(2, "0")}`,
    providerName: "Synthetic Market Fixture",
    publishedAt: ago(now, 5),
    block: `SIM-MKT-${String(index + 1).padStart(2, "0")}`,
    marketContext: {
      schema: "gi-market-context-v1",
      synthetic: true,
      source: "Deterministic synthetic fixture generator; not real prices",
      symbol: profile.symbol,
      timeframe: "1h",
      bars: demoMarketBars(now, profile)
    },
    demo: true
  }));
}

async function feedFixtures(now) {
  return [
    {
      _id: "empty-demo-signal-001",
      title: "[DEMO] West Mesa cold-chain corridor",
      body: "Synthetic exercise only: a fictional temperature excursion near a sandbox warehouse. Review route telemetry and expiry before any hypothetical response.",
      category: "Supply Chain",
      address: "EMPTY-DEMO-SOURCE-01",
      sourceId: "empty-demo-source-01",
      providerName: "Sandbox Observatory",
      publishedAt: ago(now, 20),
      block: "SIM-001",
      assurance: await fixturePacket(now, "fresh", "empty-demo-source-01"),
      demo: true
    },
    {
      _id: "empty-demo-signal-002",
      title: "[DEMO] Desert Harbor stale weather watch",
      body: "Synthetic tabletop scenario: a fictional weather notice has a stale PDH and expired external authorization. The expected result is HOLD, not action.",
      category: "Public Safety",
      address: "EMPTY-DEMO-SOURCE-02",
      sourceId: "empty-demo-source-02",
      providerName: "Sandbox Signal Lab",
      publishedAt: ago(now, 20),
      block: "SIM-002",
      assurance: await fixturePacket(now, "stale", "empty-demo-source-02"),
      demo: true
    },
    {
      _id: "empty-demo-signal-003",
      title: "[DEMO] Contested regional bulletin",
      body: "Synthetic tabletop scenario: the source has current sandbox credentials, but the claim is pending review with an unresolved conflict and no corroborating references.",
      category: "Public Safety",
      address: "EMPTY-DEMO-SOURCE-04",
      sourceId: "empty-demo-source-04",
      providerName: "Sandbox Signal Lab Two",
      publishedAt: ago(now, 12),
      block: "SIM-003",
      assurance: await fixturePacket(now, "contested", "empty-demo-source-04"),
      demo: true
    },
    {
      _id: "empty-demo-signal-004",
      title: "[DEMO] Unattributed market note",
      body: "Synthetic placeholder with deliberately absent provenance and assurance metadata. The dashboard should leave it unscored.",
      category: "Markets",
      address: "EMPTY-DEMO-SOURCE-03",
      sourceId: "empty-demo-source-03",
      providerName: "Unattributed Demo Source",
      publishedAt: ago(now, 15),
      block: "SIM-004",
      demo: true
    },
    ...demoMarketFixtures(now)
  ];
}

export async function handleGoodIntelligenceDemo(request, now = Date.now()) {
  const url = new URL(request.url);
  if (request.method !== "GET") return json({ success: false, message: "The empty.domains demo API is read-only." }, 405);
  if (!url.pathname.startsWith(`${PREFIX}/`)) return json({ success: false, message: "Demo route not found." }, 404);

  if (url.pathname === `${PREFIX}/content/me`) {
    return json({ success: true, environment: "empty.domains-demo", data: await feedFixtures(now) });
  }
  if (url.pathname === `${PREFIX}/categories`) {
    return json({ success: true, environment: "empty.domains-demo", data: [
      { _id: "empty-demo-category-01", name: "Supply Chain" },
      { _id: "empty-demo-category-02", name: "Public Safety" },
      { _id: "empty-demo-category-03", name: "Markets" }
    ] });
  }
  if (url.pathname === `${PREFIX}/rank`) {
    return json({ success: true, environment: "empty.domains-demo", data: [
      { address: "EMPTY-DEMO-MEMBER-01", rank: 1, score: 91, tokens: "SIM-120" },
      { address: "EMPTY-DEMO-MEMBER-02", rank: 2, score: 76, tokens: "SIM-80" },
      { address: "EMPTY-DEMO-MEMBER-03", rank: 3, score: 58, tokens: "SIM-40" }
    ] });
  }
  return json({ success: false, message: "Demo route not found." }, 404);
}
