# HarshalOS integration plan — FRONTIERSHIP / OUTPOST ONE

## Current implementation: private local prototype

- `harshalos-private-preview.html` opens the existing HarshalOS desktop in an iframe and injects `frontiership-outpost-app.js` plus its scoped CSS only for this local preview.
- `frontiership-outpost-app.js` registers a real HarshalOS `APPS`-style window (`frontiership-outpost-one`) with tabs for overview, build/operations, terrain, business model, and evidence/gates.
- The Site & Terrain tab leads with a separate 5-minute, silent 1080p / 24 fps Best-Wishes 3D concept film, its poster, and its evidence/assumptions guide; it also retains the original 9-minute 1080p / 12 fps feature unchanged, the OBJ/MTL ZIP, and the existing `index.html` terrain viewer via `/terrain/`. The earlier 24-second film remains a secondary reference.
- `private-preview-server.mjs` is an allowlisted development server. It serves HarshalOS runtime CSS/JS/assets, the local app, the terrain viewer and selected source files, plus explicitly named routes for both feature films, their posters and guides, and the OBJ/MTL ZIP. It does not serve the rest of the repository, business-plan documents, spreadsheets, or private papers.
- This app is **not** imported by the public `index.html`, not added to `js/`, not added to `css/`, and not allowed through `.assetsignore` or `scripts/prepare-assets.mjs`. Do not run this preview server as a production server.

## Product structure

The project cockpit separates five concerns so the build idea, operating entity, economics, and site evidence do not collapse into one unqualified plan:

1. **Overview** — FRONTIERSHIP → OUTPOST ONE brand tree, the current concept, headline operating premises, and the partner-meeting hold.
2. **Build & operations** — forest-cabin residence, bermed wing, 20–50 kW sustained lab target, BYO rented compute/demo closet, 30+ day cohorts, emergency-capable medical concept, Nordic sauna/hot-soak/cold-plunge/rest circuit, greenhouse-to-table shared dining, and the standing 18% / 210 CY / five-ponderosa guardrails. New amenities are visual concepts; water, heat, wastewater, staffing, safety, and operating loads remain unvalidated.
3. **Site & terrain** — the live public 3DEP/NAIP viewer, the 10 EPQS samples and GIS parcel outline, plus two separate films: the 5-minute silent 1080p / 24 fps Best-Wishes ray-traced 3D edition and the preserved 9-minute silent 1080p / 12 fps feature. The newer edition adds high-tech concept graphics and a side-on HQ cutaway; the original keeps its longer pixel-art walkthrough and broader room/system overviews. Both have separate posters/guides and remain concept-only. Their ten-point interpolated surface, massing, room bands, paths, and system links are illustrative, not survey control, engineering, or design-scale.
4. **Business model** — the $4,800/month bundle premise, owner ≈1/12 capacity, and the bundle-parity/amenity-over-match stance, now including wellness and greenhouse-to-table experience cues as unpriced assumptions. Detailed spreadsheet projections are intentionally not loaded into this prototype.
5. **Evidence & gates** — explicit separation of user directives, public-source observations, unresolved assumptions, and superseded synthetic terrain. The partner meeting is a decision gate, not a trigger for automatic plan changes.

## Data and status model for a later integrated version

If this prototype is approved for broader use, put project data in a small versioned manifest rather than scattering values through UI strings. Every value should carry:

- `claim` — the displayed statement/value;
- `kind` — one of `user_directive`, `public_source`, `planning_assumption`, `unverified`, or `superseded`;
- `source` — a URL or local document identifier;
- `observed_at` / `effective_date` — when known;
- `confidence` and `limits` — enough context to prevent assumptions becoming facts;
- `status` — e.g. `current`, `needs_reconciliation`, or `awaiting_partner_review`.

The terrain sources should remain distinct: the parcel polygon is assessor GIS, EPQS is a set of point queries, and the 1-meter DEM is a separate live 3DEP raster locked to source ID 86167. Historical aerial dates should remain attached to the imagery source; known 2019 date conflicts must not be flattened into one date.

## Public-release gate (not done)

HarshalOS's browser assets are public when staged/deployed, and the current app has no production authentication. The existing asset pipeline copies all of `js/` and `css/`, so adding a module there would publish it. Before any public integration:

1. Obtain explicit approval for what project name, site facts, program assumptions, price targets, and capacity information may be public.
2. Keep workbooks, full business plans, medical/legal notes, and private pre-development files out of the asset allowlist.
3. Decide whether the terrain viewer should be public or routed through an authenticated, access-controlled service. A static HarshalOS window is not an access-control boundary.
4. If public sanitized scope is approved, move/adapt the module to `js/apps-frontiership.js` and `css/frontiership.css`, register it in `index.html`, and add only the specific approved viewer/data assets to `.assetsignore`, `scripts/prepare-assets.mjs`, and `serve.js`.
5. Keep all actions read-only until the partner review authorizes a new planning iteration.

No public app registration, deployment, authentication change, pro forma publication, or broader development-plan iteration is included in this local prototype.
