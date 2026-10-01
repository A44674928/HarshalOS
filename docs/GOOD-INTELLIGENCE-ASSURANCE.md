# Good Intelligence assurance model — v0.1

Good Intelligence is intended to be a decision-support capstone over its own feed and rankings, with an optional Ground-0 source-behavior assessment. Its assurance output is **not a truth oracle, trust certificate, legal conclusion, or permission to act**.

## Separate the things being assessed

- **Source posture:** source identity, observed operating phase, phase-declaration validity, and externally granted legitimacy freshness.
- **Signal evidence:** provenance for this specific claim, independent corroboration, unresolved conflicts, claim-specific validity, and bounded decision scope.
- **Actionability:** a gate for review context, not an automatic action. A high index cannot authorize a trade, payment, post, token operation, or other consequential action.

A Ground-0 phase badge describes observed system behavior and whether a declaration matches it. The phase name itself does not increase or decrease factual truth. Source posture and claim evidence remain separate subscores so a strong source cannot make a weak claim true, and a single well-supported claim cannot certify its publisher.

## Composite formula

Model version: `GI-ASSURANCE-0.1`.

**Source assurance (0–100)** is weighted from:

| Dimension | Weight |
|---|---:|
| Recently verified source identity (method + check within 90 days) | 20% |
| Current Ground-0 phase review | 25% |
| PDH signature, consistency, and freshness | 25% |
| External legitimacy-attestation freshness | 30% |

**Signal evidence (0–100)** is weighted from:

| Dimension | Weight |
|---|---:|
| Claim evidence provenance | 25% |
| Independent corroboration | 25% |
| Conflict review | 20% |
| Claim-specific validity window | 15% |
| Decision scope | 15% |

The **composite index** is `40% × source assurance + 60% × signal evidence`. The Ground-0 v1.0 PDH freshness rule is 90 days; claim freshness is domain-specific and requires an explicit `validUntil` rather than a universal TTL.

These weights and the composite blend are provisional prototype defaults, not approved Good Intelligence policy. They require explicit product review before the score is treated as a settled product rubric.

The app withholds a subscore until all of its dimensions are known. Missing data is **unknown**, not zero. Scores describe evidence coverage under this versioned rubric; bands are “High,” “Moderate,” “Limited,” or “Low evidence coverage,” never “trusted” or “true.”

Actionability remains separate from the number. Expired/invalid authority, a stale PDH or claim, unresolved conflicts, missing scope, absent primary provenance, or fewer than two independent corroborating sources holds the signal. Otherwise, the best result is still `REVIEW-READY · HUMAN DECISION REQUIRED`.

## Read-only inputs and packet contract

The default API base is the same-origin path `/api/good-intelligence/v1`; when HarshalOS is hosted on empty.domains, the Worker serves it on that host without a separate `api.empty.domains` DNS dependency. Its GET-only `/content/me`, `/categories`, and `/rank` routes return synthetic training fixtures and an `X-HOS-Demo-API: true` header. The feed deliberately covers current, stale, contested, and unassessed states. Item titles and a persistent UI banner identify the content as synthetic, and the connection status calls it demo data rather than live intelligence. The linked live endpoint `https://api.goodintelligence.ai/v1` may be entered manually in connection settings, but it is never selected automatically; a previously saved value is migrated back to the demo default.

The UI may display a local Ground-0 audit only when its entity identifier exactly matches the API source identifier/address after URL host and case normalization. Exact provider-name matching is used only when the API supplies no machine identifier and the name match is unambiguous; a failed ID match is never rescued by a name match. It reads `ground-0-audits-v1` without writing to local storage. A local browser audit is shown as **not independently anchored**; it must not be represented as a production credential.

For server-produced assessments, the client accepts the versioned `assurance` object on a feed item only when `schema` is `gi-assurance-v1`. A `source.legitimacy.attestation` may carry `{ "algorithm": "ECDSA-P256-SHA256", "keyId": "…", "signature": "…" }`. The signature is base64url over UTF-8 JSON with these exact ordered fields: `schema` (`gi-source-legitimacy-v1`), `sourceId`, `status`, `issuer`, `validFrom`, `validUntil`, and `reference`. When a packet includes this attestation, the local verifier—not the API's `signatureVerified` boolean—determines whether that source-authorization factor can score. A missing verifier leaves the factor unknown; an invalid or unrecognized signature scores zero. Packets without signatures remain explicitly API-reported. The supported assurance fields are:

```json
{
  "schema": "gi-assurance-v1",
  "assessmentId": "assess-123",
  "assessedAt": "2026-09-30T10:00:00Z",
  "source": {
    "identity": { "status": "verified", "method": "signed-registry", "verifiedAt": "2026-09-30T10:00:00Z" },
    "ground0": { "status": "verified", "phase": "NAB", "badgeStatus": "confirmed", "version": "1.0", "auditId": "audit-456", "assessedAt": "2026-09-29T10:00:00Z" },
    "pdh": { "status": "valid", "signatureVerified": true, "consistent": true, "effectiveAt": "2026-09-20T10:00:00Z", "originKeyId": "key-789" },
    "legitimacy": { "status": "verified", "issuer": "GI Registry", "signatureVerified": true, "validFrom": "2026-09-01T00:00:00Z", "validUntil": "2026-10-30T00:00:00Z", "reference": "https://registry.example/source-123" }
  },
  "signal": {
    "publishedAt": "2026-09-29T09:00:00Z",
    "validUntil": "2026-10-01T00:00:00Z",
    "reviewStatus": "reviewed",
    "evidence": [
      { "url": "https://primary.example/report", "sourceId": "publisher-a", "kind": "primary", "status": "verified", "independent": true },
      { "url": "https://independent.example/story", "sourceId": "publisher-b", "kind": "secondary", "status": "verified", "independent": true }
    ],
    "conflictsReviewed": true,
    "conflicts": [],
    "scope": { "description": "Regional supply notice", "decisionContext": "Review before expiry", "jurisdiction": "North district" }
  }
}
```

The browser calculates the index from the whitelisted fields; it ignores upstream precomputed scores. The default same-origin `empty.domains` demo API serves synthetic packets for current, stale, contested, and unassessed scenarios. Those fixtures include a source-authorization signature verified with a public demo key pinned in `js/good-intelligence-verifier.js`; the verifier accepts that key only for records from the built-in default demo endpoint, and the matching private key exists only to sign synthetic Worker fixtures. This throwaway pair is not an independent authority or production trust root—it demonstrates integrity checking only. The private JWK is deliberately present in demo source, so anyone can forge demo-valid packets; it is a test vector, not a secret or credential. The live Sentinel API does not yet provide this complete assurance contract, and no production trust-root registry has been configured, so live items remain **NOT SCORED** or explicitly API-reported. The demo banner and item text identify all fixtures as synthetic; missing fields cannot silently earn points.

## Optional technical market context — separate from assurance

`js/good-intelligence-market-context.js` ports the supplied Pine v6 VFI + Fibonacci Bands and WaveTrend calculations for feed items carrying `marketContext.schema = "gi-market-context-v1"`. Its OHLCV bars are bounded to 5,000, normalized client-side, and must include positive OHLC values plus nonnegative volume. `time` is an ISO timestamp or millisecond timestamp for the candle close; set `confirmed: true` for a closed bar. When `confirmClose` is enabled (the default), latest-bar signals are withheld until that flag is true. The feed contract is:

```json
{
  "schema": "gi-market-context-v1",
  "synthetic": false,
  "source": "named OHLCV provider",
  "symbol": "ASSET-USD",
  "timeframe": "60",
  "bars": [
    { "time": "2026-09-30T12:00:00Z", "open": 100, "high": 102, "low": 99, "close": 101, "volume": 1200, "confirmed": true }
  ],
  "parameters": { "confirmClose": true }
}
```

The defaults follow the supplied scripts: VFI 130/0.2/2.5 with 30-bar return volatility and a 5-bar EMA signal; 200-bar, 3× standard-deviation VWMA Fibonacci bands from HLC3; and WaveTrend 10/21/4 with the supplied overbought/oversold levels and 5-bar divergence pivots. Parameters can be supplied under `marketContext.parameters` and are range-checked. Optional WaveTrend higher-timeframe mode requires separately supplied, confirmed `higherTimeframeBars`; without them, the app reports the higher-timeframe calculation unavailable rather than inventing values. Hidden divergences compare against the prior pivot (the supplied Pine ordering updates that pivot before its hidden-divergence check, which otherwise suppresses the signal).

The default demo adds eight deterministic, synthetic 360-candle hourly ticker series: `AAPL-DEMO`, `MSFT-DEMO`, `NVDA-DEMO`, `INTC-DEMO`, `AMD-DEMO`, `NET-DEMO`, `CVX-DEMO`, and `XOM-DEMO` (the headline names of the Tickerbot watchlist, so the no-key demo still spans technology, semiconductors, cloud, and energy). Each symbol, feed item, and chart is explicitly labeled as synthetic—not a real stock price. The dedicated **Market Charts** tab draws a ticker price line graph with Fibonacci-band overlays plus separate VFI and WaveTrend oscillator graphs; the feed detail view retains its technical-context summary. If a configured API supplies no OHLCV packet, the tab shows an empty state and invents no prices. These are **price/volume context only**: they do not change source assurance, claim evidence, the composite formula, or actionability, and they are not financial advice or trade instructions. Demo alerts are display text only; the app sends no alert, order, or transaction. Live bars are accepted only when a configured API supplies them and remain unverified unless the provider is independently authenticated. This JavaScript translation has not been cross-validated bar-for-bar against TradingView; indicator-library seeding, pivot ties, and provider candle conventions should be compared before relying on parity.

### Optional Tickerbot OHLCV source

The Market Charts tab retains synthetic fixtures as the default and offers a separate **Tickerbot Live** source for a fixed, sector-diverse 52-symbol watchlist at 1-hour or 1-day intervals: technology and platforms (Apple, Microsoft, Amazon, Alphabet, Meta, Netflix), semiconductors (NVIDIA, AMD, Intel, Broadcom, Qualcomm, Micron), software/cloud/cyber (Oracle, Salesforce, ServiceNow, Palo Alto Networks, CrowdStrike, Cloudflare, Palantir), energy (Exxon Mobil, Chevron, ConocoPhillips, SLB, Occidental), financials, health care, consumer, industrial and defense, autos, crypto-adjacent names, and a few index/sector ETFs. `worker/good-intelligence-tickerbot.mjs` holds that list as the single reviewed allowlist; the browser keeps a mirror only so its local search can filter the selector, and a test fails if the two copies drift. The browser calls the same-origin GET route `/api/good-intelligence/v1/market/tickerbot/bars`; the Worker calls the fixed Tickerbot `/v2/bars/{ticker}/{interval}` endpoint, then adapts its compact OHLCV rows to `gi-market-context-v1`. It requests at most 360 bars with an `asof` timestamp so only closed bars are used, validates the ticker/interval allowlist, caches identical requests briefly, and never returns the upstream response body on errors. The list is the demo's curated watchlist, not the provider's whole catalog, and coverable symbols are still subject to the provider's own coverage; a symbol the provider cannot serve returns its own error and no chart is fabricated. Tickerbot bars are marked API-supplied, not synthetic, and described as split-adjusted; the UI does not locally verify the provider's prices.

Market Charts also has a **Search ticker or company** input, a result count, and a keyboard-focus-restoring Clear button (Escape also clears). Search is case-insensitive, matches the configured symbols or company names (Apple, Microsoft, Intel, AMD, Cloudflare, Chevron, Exxon Mobil, Tesla), filters the native ticker selector — which groups matches under their sector heading — and redraws the matching chart. It also filters API-supplied/demo tickers without relabeling synthetic prices. An unmatched query shows an explicit empty state; it sends no new bars request and invalidates late responses so they cannot overwrite that state. This is search over this application's configured watchlist, not discovery of every ticker available from Tickerbot. The Worker allowlist and server-held key boundary are unchanged.

Configure the key as a Worker secret named `TICKERBOT_API_KEY` (for deployment, `npx wrangler secret put TICKERBOT_API_KEY`; for local Wrangler development, use the ignored `.dev.vars` file). The key is not sent to the browser or stored in localStorage. Without the secret, Tickerbot Live reports a configuration message and the synthetic demo remains available. Tickerbot prices and indicators are still optional market context: they never enter source legitimacy, claim evidence, assurance scoring, or actionability. If the upstream call throws, the Worker answers 502 (504 on a timeout) and writes one category-only `tickerbot_upstream_fetch_failed` entry to Workers Logs with `errorName`, `causeName` and `causeCode` — never a message, URL, key, header, or response body — so a failure that never left the Worker (a `TypeError` with empty cause fields) can be told apart from a real connection failure.

The HOS Human-Key timer and legitimacy scalar are local simulation state, not production identity, liveness, consent, or source authorization. They are deliberately **not** used by this model. No wallet, token, posting, payment, or chain action is added.

## Implementation boundary

`worker/good-intelligence-demo.mjs` serves the built-in fixtures at `/api/good-intelligence/v1`; `worker/good-intelligence-tickerbot.mjs` provides the read-only Tickerbot bars adapter through a Worker secret; `js/good-intelligence-verifier.js` validates their source-authorization signatures against a demo-only pinned public key; `js/good-intelligence-assurance.js` is the deterministic, read-only calculation layer; `js/good-intelligence-market-context.js` computes optional VFI, Fibonacci-band, and WaveTrend context and bounded chart series. `js/apps-good-intelligence.js` presents phase context, signature-check limits, separate source/signal dimensions, optional market context, score coverage, blockers, the Market Charts ticker visualizations, and the human-review boundary. Extending the real Good Intelligence service/Sentinel contract and configuring an independently trusted production verification root remain follow-up work.
