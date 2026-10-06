# NAB-designated physical–digital spheroids

## What is implemented

Material Spheroids → **3 · NAB composite material** starts a new design with NAB 1
(Hydrogen / AXON). Choose any of the **119 designated NAB sectors** before
previewing. Each sector has exactly one distinct stock proxy, an explicit
editorial theme, and a rationale. Selecting another sector invalidates the
preview; it does not mutate saved designs. Saving retains the NAB ID and registry
version alongside character/material IDs and composition weights. Existing
pre-NAB designs remain explicitly unassigned rather than silently relabeled.

The source-of-truth registry is shared by the composer, preview, saved-design
cards, AI design brief, and matching ticker nodes in Orb 2 (both hourly and daily).
Orb 2 does not silently assign unrelated watchlist tickers to the nearest NAB.

## Three independent evidence layers

1. **Physical material:** Materials Project records and operator-entered criteria.
   NAB names do not select chemical constituents. Density remains the existing
   ideal volume-weighted reference, not an engineered-composite prediction.
2. **Neural Atomic Body:** exact Compendium risk profile, alignment, legend,
   dominant trait, authority density, failure mode, and institutional roles.
   The risk digitization is ordinal: Safe/Safest = 0, Moderate = 1,
   Elevated = 2, Extreme = 3. These integers are categories—not calibrated
   probabilities, physical hazard scores, or investment ratings. The original
   Safe vs Safest text remains intact.
3. **Market context:** one fixed editorial stock proxy per NAB. When independently
   reviewed provider data is available, Orb 2 maps price relative to that stock's
   own FBB baseline. NAB risk never sets FBB height or rewrites market data.

## AI and operating boundaries

Every designation includes a deterministic AI **design brief** naming its NAB,
stock, theme, institutional role, failure mode, and boundary. It is not a trained,
loaded, or executing specialized neural network, and no new LLM/provider call is
made. The brief is available in the UI and through `NabSectors.aiContext(id)` for
future model-building integration. An actual runtime needs its own implementation
and enforceable gates; this metadata is not such a gate.

All Extreme NABs are **reference-only, with no NAB deployment**. Their stock
assignments represent topics for studying cascade, timing, or state-decay
failure modes—not claims that those companies are extreme-risk businesses.
Seaborgium's source exception (“Restricted to back-end entropy generation”) is
preserved verbatim but grants this application no runtime permission.

## Stock mappings and provider scope

See [all 119 assignments](nab-ticker-assignments.tsv). These are editorial
company-activity analogies, not claims of company affiliation, endorsement, NAB
implementation, or elemental exposure. Roles and traits take precedence over
chemical-name puns. Repeated Compendium roles get distinct company proxies with
more specific subthemes.

Listing status and provider coverage have **not** been independently verified.
The table includes ADR/OTC symbols (notably DASTY), whose provider support may
vary. The registry does not expand the Worker watchlist, bypass reviewed-symbol
validation, subscribe to 119 market feeds, or supply synthetic quotes. A mapping
exists even when market observations are unavailable. All 119 can be selected
in the composer and the active NAB Disc surface. Unreviewed designated stocks
remain visible as reference entries but cannot trigger provider requests.

## Sources, maintenance, and tests

- Neural semantics: [NAB Compendium, master table](../harshal-systems/14-nab-compendium.md).
- Editorial assignments: `docs/models/nab-ticker-assignments.tsv`.
- Generated browser registry: `js/nab-sectors.js`.
- Pure model integration: `js/character-material-model.js`.

Run `npm run nab:build` after editing sources, and `npm run nab:check` to detect
source drift. Never reorder assignments by price, risk, array position, or ranking.
NAB ID is the stable identity. Changing an established designation requires an
explicit registry-version change and saved-design migration plan, not silent
reassignment.

`npm run test:nab` checks exact source reproduction, 119 unique IDs/tickers,
all-sector composition, risk boundaries, persistence, invalid and legacy IDs,
UI selection/preview invalidation, and that the ticker→NAB identity stays a
single pure registry lookup that no surface can vary by timeframe.


## Asset-class Disc retirement and composite membership

**NAB Discs** is its own desktop app (`#app=nab-discs`) and its own Good
Intelligence tab, alongside the Orb 2 tab. It does not occupy the Characters id
and it does not mount inside Orb 2: the Characters app and the Orb 2 beat model
keep their own surfaces, and neither delegates here. The persistent 3D composite
field is primary inside this app, with the complete composite inspector beneath it
— no stock-only gateway is required. The former stock-only renderer remains a
compatibility code path, not active navigation. The five reviewed Disc IDs
(`stocks`, `fx`, `crypto`, `commodities`, `indices`) remain the source adapters
and historical record keys that Characters navigates; they are not renamed into
obscurity. Worker routes and budget ledgers are not renamed, deleted, or reset.
The legacy catalog's `.discs` is what Characters and Orb 2 navigate;
`.sourceChannels` is the same frozen roster under the composite field's name, and
`.nabDiscs` exposes NAB navigation.

`js/nab-composites.js` supplies explicit editorial alignments, separate from the
Compendium's neural classifications. It preserves all 52 existing watchlist
entries (including funds), the 23 reviewed FX pairs, 11 commodity series, and 5
indices. Together with the 119 designated stocks and 24 monetary-authority
reference entries, the static composite catalog contains 222 distinct records.
Aluminum is included in the source catalog but remains unassigned in the NAB
editorial alignment queue until reviewed.
Crypto entries load explicitly from Characters' dynamic Kraken Spot ranking: known USD-pair identities (including Kraken's `XBT/USD` → display `BTC/USD` and `XDG/USD` → display `DOGE/USD` aliases) have editorial alignments; unknown tickers remain in review. The exact `krakenPair`/`providerId` is retained as the provider identity and must match the Worker response before observations join. Duplicate source identities are marked ambiguous and cannot refresh. Historical observations without a matching Kraken pair remain retained and appear unlinked.

### Example: bank + stock + currency = one aligned NAB composite

NAB 12 (Magnesium, cooperative structural binding) contains **Visa**, the
**Federal Reserve**, **European Central Bank**, their FX context, and explicitly
matched stablecoin identities. This is a broad *editorial cooperation grouping*,
not an audited finding that all central banks operate the same way. Every bank
reference has a source URL and an explicit reference-only status. No bank policy
rate, balance sheet, speech, or decision is fetched or invented. These require
separate data adapters before they can contribute observations.

Every member keeps a qualified `channel:symbol` identity, role, alignment
rationale, provenance, provider, interval, time and uncertainty. Crypto also
requires the exact ranked Kraken USD pair as `krakenPair`/`providerId` on the
Worker response; its observation cache key includes that identity. The legacy
local-history importer can read older provider-specific keys but never treats
them as Kraken identities. Risk levels and ticker-letter similarities never
infer membership. Supporting equities do not replace the one designated stock.

Saved physical designs join by **the same NAB ID**. The physical composer now
accepts all five source channels (including indices); missing material records
remain missing. Financial and institutional evidence is part of the digital
composite, not a measured constituent density, atomic formula, or volume share.
Prices, policy measures and material properties are never averaged together.

### Observation migration and refresh

- Opening a NAB Disc does not make 119 provider calls. Manual refresh requests
  exactly one eligible source through the existing same-origin Worker. Optional
  automatic refresh rotates one eligible member of the selected NAB per minute
  using Massive daily data, pausing hidden/minimized views.
- Selecting Tickerbot or Alpha Vantage keeps their stock-only and interval
  restrictions. Unreviewed primary stocks remain reference-only; Worker
  allowlists, D1 allowances, and minute guards remain authoritative.
- Existing local Orb history is imported non-destructively. Restored compact
  Characters archives preserve their supplied fields but cannot recreate bands
  they never contained. Legacy storage and server records are untouched.
- New observations use `harshalos.nab-discs.v1`. The latest supplied packet and
  failed attempt are retained separately for each source/provider/interval.
  Providers and timeframes are not substituted. Older raw legacy histories
  remain in their original stores.
- Every constituent's FBB displacement is independent. Unknown/reference records
  occupy an explicit context lane, not the neutral plane. Stale timestamps and
  exact displacement values are retained. The 3D field does not clamp FBB
  excursions; Fit all adjusts framing for out-of-band cores.
- AI context contains the selected NAB's aligned evidence, source metadata,
  material designs, missing-data list, and operating constraints. It is still a
  design context, not a deployed network or authorization to act.


## Primary 3D orb integration

`js/nab-orb-renderer.js` consumes all 119 complete `NabComposites.compose()`
results. It performs 3D camera projection and depth-sorted canvas rendering,
without a provider call, neural activation, or change to source authorization.

- One composite core per immutable NAB ID. Horizontal coordinates are stable
  visual addresses, not ranks or metrics. The designated stock's normalized
  FBB displacement alone determines core height above/below the horizontal
  baseline. Risk is a separate colored ring.
- Selecting a core reveals its aligned constituents. Supporting markets have
  their own absolute FBB heights, not offsets added to the designated stock's
  height. Bank/unknown records occupy an explicitly labeled context shelf;
  physical designs contribute individually inspectable material facets. Their
  display positions have no market interpretation and retain `marketY: null`.
- Unknown designated-stock positions occupy a detached staging field rather
  than the neutral market plane. Source/provider/interval changes do not borrow
  another series. A later failure remains visible as unknown rather than
  silently falling back to a previous successful packet. Stale packets are dim.
- Drag or Shift+arrow keys orbit. Scroll or +/- zoom. Click a core to select it;
  double-click or Enter focuses it. Left/right keys select NABs. Fit all/Escape
  restore overview framing. The NAB dropdown and sector navigation are always
  available as alternatives to canvas picking.
- Selection and data refresh update the existing scene without remounting the
  canvas or resetting the camera. Physical design saves emit a local update;
  cross-window material-storage changes also refresh the scene. Hidden and
  minimized views pause animation. Idle rotation is opt-in and reduced-motion
  preferences suppress it. Model fullscreen includes a browser fallback.
- No global spheroid cage, center attachments, or synthetic market animation.
  Local branching core detail is decorative and explicitly carries no market
  meaning. Canvas failure leaves all 119 composites, source records, physical
  designs, and AI context accessible in the inspector.

Regression coverage includes root and constituent height semantics, complete
model membership, provider isolation, missing/stale data, material facets,
depth-correct picking, click-versus-drag, camera persistence, visibility,
reduced-motion, teardown, and canvas fallback.
