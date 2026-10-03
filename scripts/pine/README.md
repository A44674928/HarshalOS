# Pine Script library

Markdown copies of the Pine Script indicators this repository depends on, kept next to the
tooling that verifies them.

> [!IMPORTANT]
> **The original `.pine` source files are not in this repository.** They were supplied
> out-of-band and only their **JavaScript translation** was committed, at
> [`js/good-intelligence-market-context.js`](../../js/good-intelligence-market-context.js).
> A repository-wide search for `//@version=`, `indicator(`, `input.int`, `ta.sma`,
> `ta.pivothigh`, `ta.vwma`, `request.security`, and `plotshape` returns **zero files**,
> and the git history (single commit `17bff99`) has never contained a `.pine` file.
>
> So the Pine blocks below are **reconstructions reverse-engineered from the committed JS
> port**, not transcriptions of the originals. They are byte-faithful to the port's
> arithmetic, defaults, and signal rules — which the test suite enforces — but they are
> **not proven identical to the author's originals**. Replace each reconstruction with the
> real source (see *Supplying the original source* below) before treating this folder as an
> archive of record.

## Inventory

| # | Document | Indicator(s) | Pine version | JS port entry point |
| :-- | :--- | :--- | :--- | :--- |
| 01 | [`01-vfi-fibonacci-bands.md`](01-vfi-fibonacci-bands.md) | Volume Flow Indicator + Fibonacci Bands | v6 | `computeVfi`, `computeBands` |
| 02 | [`02-wavetrend.md`](02-wavetrend.md) | WaveTrend (with HTF + divergence modes) | v6 | `computeWaveTrend`, `mapHigherTimeframe`, `divergenceEvents` |

These are the two scripts `docs/GOOD-INTELLIGENCE-ASSURANCE.md` refers to as *"the supplied
Pine v6 VFI + Fibonacci Bands and WaveTrend indicators."* No third Pine script is referenced
anywhere in the repository.

## What each document contains

1. **Provenance** — where the script came from and what is and is not verified.
2. **Inputs** — every parameter with its default and accepted range. These tables are
   machine-checked against `GoodIntelligenceMarketContext.DEFAULTS` and
   `normalizeParameters()` by [`tests/pine-scripts-docs-test.mjs`](../../tests/pine-scripts-docs-test.mjs);
   a default that drifts from the shipped code fails CI.
3. **Mathematics** — the calculation, step by step, in the same order the port performs it.
4. **Signals** — the exact alert conditions and their output labels.
5. **Reconstructed source** — a `//@version=6` block you can paste into TradingView's Pine
   Editor and diff against your original.
6. **Port mapping** — Pine construct → JS function, for bar-for-bar parity work.

## Verification

```bash
npm run test:pine      # this folder's docs against the shipped indicator code
npm run integrity      # full regression + suite inventory + deploy dry-run
```

`tests/pine-scripts-docs-test.mjs` executes the real
`js/good-intelligence-market-context.js` in a VM and asserts that:

- every parameter row in these documents has a default equal to the shipped `DEFAULTS`;
- the union of documented parameters is exactly the 28 keys of `DEFAULTS` — no undocumented
  parameter, no stale one;
- each reconstruction declares `//@version=6` and an `indicator(` call, and carries the
  `RECONSTRUCTED` banner so it can never be mistaken for the original;
- this folder stays outside the public asset allowlist (`scripts/` is never staged by
  `scripts/prepare-assets.mjs` or served by `serve.js`).

## Supplying the original source

When you paste in a real script:

1. Replace the fenced ```pine block in the matching document with the original text, verbatim.
2. Change the banner from `RECONSTRUCTED` to `ORIGINAL` and record the source (TradingView
   script name, author, publish date, or file path) in the Provenance table.
3. Re-run `npm run test:pine`. If the originals disagree with the committed port, the test
   will not catch semantic drift — so also diff the Inputs tables and re-read the Port
   mapping section against the source.
4. Optionally drop the raw `.pine` file alongside the document as `01-vfi-fibonacci-bands.pine`
   so it can be pasted without copying out of Markdown.

## Related

- [`docs/GOOD-INTELLIGENCE-ASSURANCE.md`](../../docs/GOOD-INTELLIGENCE-ASSURANCE.md) —
  §"Optional technical market context" documents the packet contract, defaults, and the
  known parity gaps.
- [`docs/architecture/PINE-OCM-INTEGRATION.md`](../../docs/architecture/PINE-OCM-INTEGRATION.md) —
  how a Pine script is incorporated into the Orb Communicator Model.
- [`tests/good-intelligence-market-context-test.mjs`](../../tests/good-intelligence-market-context-test.mjs) —
  behavioural tests for the port itself.
