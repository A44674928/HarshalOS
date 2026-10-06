# Daily index-data provider evaluation

**Reviewed:** 2026-10-05  
**Decision:** Keep Massive as the current primary Indices provider. Alpha Vantage and Financial Modeling Prep (FMP) are technically plausible alternatives, but neither is approved as a code-path replacement until plan entitlement and data-use rights are confirmed for this application's display and persistence model.

This note evaluates daily data for the current 52-card Basic Indices Disc. It does not authorize a provider change or broaden the roster beyond the reviewed Basic entitlement boundary.

## Current contract

- **Characters:** Massive for Indices at `1d`.
- **NAB Discs:** Massive for Indices at `1d`.
- **Orb 2:** consumes the corresponding provider-tagged, reviewed field; it does not choose a different index source.
- **No substitutions:** provider identity, symbol, interval, OHLC shape, and source are validated. A failed or ineligible Massive result remains unavailable; the application must not switch to Alpha Vantage, FMP, or FRED silently.
- **Roster:** Disc5 is a static 52-card Basic Indices topology. Its five groups are 8 U.S. headline/structural, 12 U.S. sector, 16 U.S. industry/subindustry, 8 international/regional, and 8 thematic/factor/specialty entries. No familiar index outside the reviewed Basic roster should be reintroduced merely for recognition.

## Candidate comparison

| Candidate | Daily index-data capability | Access and quota caveats | Display, caching, and licensing caveats | Assessment |
|---|---|---|---|---|
| **Alpha Vantage** | The official `INDEX_DATA` function documents daily, weekly, and monthly OHLC history for a catalog of indices. | The standard free API allowance is 25 requests/day, but `INDEX_DATA` is marked **Premium** and historical index data has a separate data-entitlement step. Do not count the free 25 calls as usable index access; confirm Premium plan, symbol coverage, entitlement, and the included request rate with the intended account. An API key is required. | The default Terms of Service license is personal, non-commercial use. Alpha Vantage defines some use by/on behalf of an organization or information access by other people as commercial use; a shared app therefore needs written permission/terms before display, retention, or redistribution. The legacy Characters `1mo` route is not an index-data entitlement or a reason to reopen it. | **Technically viable; Premium/data entitlement and multi-user rights must be confirmed.** |
| **Financial Modeling Prep (FMP)** | FMP documents end-of-day historical index-price data, including a daily historical-price endpoint. | FMP's pricing page advertises 250 calls/day and end-of-day historical data on Basic. Confirm that the *specific index-history endpoint and symbols* are enabled for the actual account and plan; a general EOD plan label is not enough. An API key is required. | FMP's terms and licensing guidance distinguish API access from permission to display or redistribute data. FMP says public or multi-user displays can require a separate Data Display and Licensing Agreement, including in some free and prototype use cases. Confirm display, redistribution, derived-output, and server-side storage/retention rights in writing; do not treat a subscription tier as a display license. | **Technically viable, endpoint entitlement and display rights unverified.** |

### Technical fit is not authorization

Either candidate could be evaluated for one daily request per reviewed index, but the actual symbol mapping and response schema still need contract tests. The active list contains 52 reviewed Basic symbols; provider-specific identifiers are not interchangeable aliases. Any future adapter must map each requested index explicitly and reject unknown or ambiguous response identities.

The current Orb 2 workflow stores compact reviewed beats. Before bringing another vendor into that persisted path, confirm the rights for caching/retention and displayed historical values in addition to endpoint access. Do not infer those rights from an API key, a free tier, or a daily-call quota.

## Recommendation

1. **Keep Massive for current Indices** while completing and verifying the provider split.
2. If Massive becomes unsuitable, compare Alpha Vantage and FMP against the actual symbols, required OHLC fields, plan entitlement, quota, uptime, and written display/storage rights before implementing either one.
3. Make any approved alternative an explicit Indices-only adapter and preserve fail-closed behavior. Do not revive Alpha Vantage `1mo` as a general Characters or NAB provider selector.
4. Consider FRED later only as a separate, clearly marked reference lane, after this split is verified and a transient/reference-only design and rights review are agreed. It is not the primary market layer for the current orbs.

## Official references

- [Alpha Vantage API documentation — `INDEX_DATA`](https://www.alphavantage.co/documentation/)
- [Alpha Vantage Premium API access and historical-index entitlement notes](https://www.alphavantage.co/premium/)
- [Alpha Vantage support and API request limits](https://www.alphavantage.co/support/)
- [Alpha Vantage Terms of Service](https://www.alphavantage.co/terms_of_service/)
- [FMP developer documentation](https://site.financialmodelingprep.com/developer/docs)
- [FMP pricing plans](https://site.financialmodelingprep.com/pricing-plans)
- [FMP Terms of Service](https://site.financialmodelingprep.com/terms-of-service)
- [FMP guidance on public and multi-user displays](https://site.financialmodelingprep.com/insights/platform/can-you-use-fmp-data-in-a-public-app-website-or-client-dashboard)
