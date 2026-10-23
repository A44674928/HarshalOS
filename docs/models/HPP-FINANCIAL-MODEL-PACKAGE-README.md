# The Harshal Priyavadan Patel Financial Model

**Attribution:** Harshal Priyavadan Patel
**Product:** Good Intelligence combined Market Charts + Orb 2 dashboard
**Package revision:** 2026-10-23

Start with **`HPP-FINANCIAL-MODEL-WHITE-PAPER.md`**. It is the primary deliverable: a plain-English and mathematical description designed for human and AI auditors. The JSON file formalizes the reconstruction contract; the checklist and source map make review easier.

## Included documents

1. `HPP-FINANCIAL-MODEL-WHITE-PAPER.md` — scope, inputs, data lineage, formulas, assumptions, missing/stale/refused-input behavior, limitations, and reconstruction sequence.
2. `HPP-FINANCIAL-MODEL-RECONSTRUCTION-SPEC.json` — machine-readable defaults, formulas, states, and invariants.
3. `HPP-FINANCIAL-MODEL-AUDIT-CHECKLIST.md` — non-programmer review prompts, evidence capture, and deployment checks.
4. `HPP-FINANCIAL-MODEL-SOURCE-MAP.md` — repository paths, implementation functions, and focused tests.
5. `HARSHAL-PRIYAVADAN-PATEL-FINANCIAL-MODEL.md` — short product guide and operating boundaries.
6. `HPP-FINANCIAL-MODEL-SHA256SUMS.txt` — integrity hashes for the documents (excluding this manifest and the ZIP archive).

## Scope note

The dashboard places Market Charts and Orb 2 together but does **not** merge their selected instruments, feeds, caches, or interval controls. Real-estate pro formas and the paper-trading P&L application are excluded. The package contains documents, not a webpage export or code dump.

## Important limitation

This package documents software behavior; it does not validate market-data accuracy, investment performance, provider licensing, or a production deployment. The product is not a valuation, forecast, investment recommendation, order, authorization, or financial/legal/tax advice. A synthetic demo is not live data. Review source timestamps, provider labels, and held/unavailable states.

No sensitive personal identifier is included.
