# Vendored: TradingView Lightweight Charts™

This directory holds one third-party browser library, copied byte-for-byte so the
Good Intelligence **TradingView** tab needs no third-party CDN at runtime and
works offline. Nothing here is fetched from TradingView's servers, and the
library never receives market data or telemetry from the app.

| Field | Value |
|---|---|
| Library | TradingView Lightweight Charts™ (the free, open-source library from <https://www.tradingview.com/free-charting-libraries/>) |
| Version | `5.2.1` |
| Vendored file | `lightweight-charts.standalone.production.js` (UMD/IIFE build, assigns `window.LightweightCharts`) |
| Upstream package | <https://registry.npmjs.org/lightweight-charts/-/lightweight-charts-5.2.1.tgz> |
| Upstream file | `package/dist/lightweight-charts.standalone.production.js` |
| SHA-256 of vendored file | `e21cc5caa0226ef30bd8549c50b9ef926615f2a4ee6b4e486353477a55f598cf` |
| npm `integrity` (tarball) | `sha512-IVwoK1RLFiLPubaKIjNbtjWLnpPMqiABSrTay6whmNa8L1+19292VtHJ+BWyPUuLCwF0tcQlhEWd1CLB2a1nsQ==` |
| License | Apache License 2.0 (see `LICENSE`; the upstream `@license` banner is retained in the file) |
| Modifications | None. The file is an unmodified copy; no code was edited, patched, or inlined. |
| Documentation | <https://tradingview.github.io/lightweight-charts/> |

## Why this library

The free charting libraries page also lists **Advanced Charts** and the
**Trading Platform**. Those are proprietary builds that require a separate
TradingView application/approval and their own license terms, so they cannot be
vendored into this repository without that grant. **Lightweight Charts™** is the
Apache-2.0 open-source library on that page, so it can be redistributed and
served from this site with the license notice retained.

## Keeping this copy honest

`tests/good-intelligence-tradingview-test.mjs` re-hashes the vendored file,
checks the upstream version banner, and fails if the copy drifts from the
recorded SHA-256 above. To upgrade, replace the file from the official npm
package, update the version/hash/integrity rows here, and re-run the tests
(`npm run test:app`).
