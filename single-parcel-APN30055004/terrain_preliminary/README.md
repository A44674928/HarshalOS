# APN 30055004 — preliminary terrain and aerial model

## Deliverables

- `index.html` — self-contained interactive viewer. It renders the actual USGS 3DEP 1-meter DEM dynamically from the public ImageServer, locked to source raster **86167**, and switches among five Arizona NAIP image years (2013, 2017, 2019, 2021, 2023). The viewer needs an internet connection to the public ArcGIS services.
- `epqs_samples.csv` — ten USGS Elevation Point Query Service samples in WGS84, with returned elevations in feet.
- `parcel_outline.geojson` — parcel polygon returned by Arizona Water Maps for APN 30055004, kept separate from the terrain data and explicitly identified as assessor/GIS geometry, not a survey.
- `js/apps-frontiership.js` + `css/frontiership.css` — the FRONTIERSHIP / OUTPOST ONE HarshalOS desktop app and scoped styling. The module is registered before shell startup, so its `⌂` / OUTPOST ONE launcher icon appears in the desktop grid.
- `harshalos-private-preview.html` — optional local wrapper for the HarshalOS desktop; it opens with the desktop app icon visible and provides a separate open/restore button.
- `best-wishes-edition/frontiership-outpost-one-best-wishes-3d.mp4` — preserved silent 5-minute 1920×1080 / 24 fps Best-Wishes picture master; `frontiership-outpost-one-best-wishes-3d-narrated.mp4` is its separate AI-narrated copy, with `frontiership-outpost-one-best-wishes-3d-narration.mp3` as a standalone voice track. Both retain the ray-traced 3D concept, room-zone cutaway, snow, animated conceptual systems, and explicit evidence / feasibility limits.
- `outpost-one-full-feature-film.mp4` + `outpost-one-full-feature-poster.png` — the preserved 9-minute, silent 1920×1080 / 12 fps concept feature with snowfall, Fallout Shelter–inspired side-on building cutaways, animated system overviews, and an optional dashed tunnel study.
- `OUTPOST_ONE_FEATURE_FILM_GUIDE.md` — first-edition chapter timestamps, specifications, interpretation notes, assumptions, and limits.
- `outpost-one-pixel-concept-film.mp4` + `outpost-one-pixel-concept-poster.png` — earlier 24-second experience-led pixel flythrough retained as a secondary reference.
- `outpost-one-concept-model.obj` + `.mtl` — editable, low-detail blockout; `outpost-one-concept-model.zip` packages the paired model files and model notes.
- `render_outpost_one_feature_film.py`, `render_outpost_one_pixel_movie.py`, and `OUTPOST_ONE_CONCEPT_MODEL_NOTES.md` — reproducible long-form renderer, short renderer, model provenance, and explicit limitations.
- `private-preview-server.mjs` — allowlisted local preview server for the HarshalOS shell, terrain viewer, and explicitly named film/audio/poster/guide/model files, including both Best-Wishes editions; it does not expose the repository's other project documents or workbooks.
- `HARSHALOS_APP_INTEGRATION.md` — desktop registration, named asset deploy-list, and external Cloudflare Access requirements.
- `DIGITAL_CODE_ZONING_REVIEW.md` — role-based, non-certifying code/zoning pre-review and 12-item engineered-connections register. It records the screenshot-based AR-5 area-only pass and the remaining open inputs; it is repository-only and excluded from runtime/deployment assets.
- `ENGINEERING_FRONTLOAD_PLAN.md` — a zero-spend preparation plan for zoning, the 62-bedroom/57-rental scenario, ATBI data governance, macro-demonstrator component/safety architecture, building test-fit, accessible walkways, utilities, civil, MEP, and life-safety evidence. It organizes due diligence but does not establish investment-grade readiness. It is not engineered design, is repository-only, and is excluded from runtime/deployment assets.
- `OUTPOST_ONE_UNIFIED_PLAN.md` — current source of truth for the selected $4,800 per rentable room-month all-in bundle, 62-bedroom scenario, shared-occupancy rule, lean repeatable whole-build baseline, evidence gates, and financial/site limits. It is conceptual and excluded from runtime/deployment assets.
- `OUTPOST_ONE_PARTNER_BRIEF.md` + `OUTPOST_ONE_PARTNER_CONCEPT.svg` — concise current partner summary and abstract program visual; neither is a site plan, floor plan, approved design, or underwriting package.
- `OUTPOST_ONE_INVESTOR_CUT.mp4`, `OUTPOST_ONE_INVESTOR_CUT_GUIDE.md`, and `render_outpost_one_investor_cut.py` — new 3–5 minute, voice-over investor concept cut, script/storyboard, and renderer. The video labels the room price, revenue arithmetic, capacity, and proof gates; it is private project material and is not added to the app/deployment list.
- `investor-cut-assets/` — five source narration WAV clips for the new cut; private, not part of the runtime/deployment allowlist.
- `OUTPOST_ONE_FEATURE_FILM_GUIDE.md` and `best-wishes-edition/BEST_WISHES_EDITION_GUIDE.md` — historical edition notes; the existing 9-minute feature and 5-minute Best-Wishes editions are archival and unchanged.

## Current workstream — engineered connections (2026-10-17)

All current program and amenity concepts are assigned to **Engineered Connections** for digital coordination. This is a workflow phase only: no connection is engineered, selected, approved, or sealed. The user-provided county parcel screenshots display **Unincorporated Coconino County**, **AR-5 — Agricultural Residential, 5-acre minimum**, overlay **N/A**, **Lighting Zone II**, and **“No permits found.”** The area-only screen passes on those figures: **5.59 > 5.00 acres by 0.59 acres**. This is screenshot evidence, not an independently retrieved current ordinance, certified permit history, or overall compliance decision. Overall zoning/code compliance remains **NOT ASSESSED** pending current-source/ordinance verification, title/access, survey, use/occupancy schedule, and system inputs. “Open” means evidence is missing, not that a violation exists. The user's road-rights concern is recorded as their understanding and has not been independently verified. No local professional or agency has been contacted; no live deployment is authorized or performed.

Current pricing and design selections are reconciled in `OUTPOST_ONE_UNIFIED_PLAN.md`: $4,800 per rentable room-month for an all-in room + lab/program + defined-amenity bundle, with shared occupancy not multiplying the room rate; one lean, repeatable plan replaces the former cost-unlimited max-house. Exact amenity roster, contract, demand, occupancy capacity, lean capex/OPEX, and capital ask remain TBD. Legacy spreadsheets still calculate $4,800 per modeled bed and must not be treated as the selected room-month model. The old $3,600 whole-2BR-ADU scenario and $1,100–$1,900 bed-month rates are historical only. The previous films and PDF remain archival and unchanged; the new investor cut is a separate private deliverable.

Run the local wrapper from the repository root with `node single-parcel-APN30055004/terrain_preliminary/private-preview-server.mjs`, then open port 8001. The wrapper shows the HarshalOS desktop with the OUTPOST ONE launcher icon available; it does not inject a second copy of the app. The Cloudflare Access policy is external to this repository and must protect all deployed app and media routes.

No full DEM GeoTIFF, LiDAR point cloud, or aerial raster was downloaded into this repository. The viewer requests live public renderings; the CSV is a small set of spot queries, **not** a raster or a complete elevation grid. The 3D concept film interpolates between only those ten values for a visibly labeled placeholder surface; it does not use the live 3DEP image service as a downloadable DEM. The previous `terrain_real/` preview files remain synthetic and were not used.

## Terrain source and method

- **USGS 3DEP 1-meter bare-earth DEM**, source project `AZ_Coconino_2019_B19`, raster/catalog ID **86167**.
- The source record identifies a standard USGS 1-meter DEM produced from high-resolution LiDAR, vertical datum **NAVD 88**. The service viewer applies an ArcGIS lock mosaic rule to ID 86167, so the display does not silently switch to a neighboring/coarser 3DEP source. A locked 3DEP identify check at P02 returned 2,215.75 m (7,269.521 ft), within 0.011 ft of the EPQS result at that point.
- The viewer offers elevation-tinted hillshade, slope, and dynamically generated 2-foot display-contour renderings. They are visualizations of the source raster, not survey contours.
- Ten EPQS requests were made within the returned parcel polygon. Each reported `rasterId=86167` and `resolution=1`. The measured sample range is **7,256.198–7,282.971 ft**, a **26.773 ft spread between queried points**. P03 is the highest queried point (east/northeast-ish); P09 is the lowest queried point (southeast-ish). These are not verified site extrema and do not establish drainage or design grades.
- Three `includeDate=true` EPQS checks (center, high sample, and southwest sample) returned `AcquisitionDate=2019-07-02`. The 3DEP catalog item for raster 86167 identifies the project as `AZ_Coconino_2019_B19` and gives the acquisition window **2019-08-16 to 2019-08-20** (the catalog's epoch date is 2019-08-20). These date fields disagree. The source is clearly the 2019 project, but the exact acquisition date should be treated as unresolved pending raw-source metadata review.

## 3D concept film and blockout

The private prototype now presents the 5-minute Best-Wishes concept in two separate editions—the original silent picture master and a narrated copy—while retaining the 9-minute silent feature and earlier 24-second silent experience cut. The 9-minute, 1920×1080 / 12 fps feature remains unchanged: its 640×360 pixel-art master is enlarged 3×, with snowfall, long holds, side-on room-band cutaways, animated system overviews, and an optional dashed tunnel study. The 5-minute Best-Wishes picture is a 1920×1080 / 24 fps ray-traced 3D rendering: it adds slow post-render camera drift, a high-tech concept interface, a room-zone HQ cutaway, separate wellness / greenhouse views, animated system diagrams, and an aspirational layer clearly labeled as unverified. The narrated copy keeps the same H.264 picture stream and adds chapter-aligned AI-generated English voice-over without music; its standalone MP3 voice track is also retained. `OUTPOST_ONE_FEATURE_FILM_GUIDE.md` and `best-wishes-edition/BEST_WISHES_EDITION_GUIDE.md` record their distinct specifications and limits. Both renderers use the GIS polygon as a visual frame and the ten EPQS spot values for a placeholder surface; neither uses the synthetic `terrain_real/` files. Relief is exaggerated 2.5× in the schematic site visualization. Buildings, room zones, tree locations, internal circulation, amenities, systems links, and the optional tunnel are illustrations—not georeferenced footprints, verified routes, engineering, capacity, approvals, or access findings. See the two film guides and `OUTPOST_ONE_CONCEPT_MODEL_NOTES.md` for interpretation limits.

These amenity additions are visual concept cues only; they do not revise financial, utility, permitting, or engineering assumptions. The visualization remains preliminary and is not for permitting, engineering, legal/access, medical-facility design, grading, drainage, or construction use.

## Parcel geometry

Arizona Water Maps / General Parcels MapServer layer 2 returned APN `30055004`, `BOOK=300`, `MAP=55`, `PARCEL=004`, and `ACRES_US=5.5895`. The service describes its underlying parcel data as a November 2023 vintage. This is assessor/GIS geometry only. The reported **5.5895 acres differs from the project's prior 5.00-acre assumption**; neither value should replace a boundary survey, title record, or legal description.

## Historical aerials

The viewer uses the AZGeo Arizona NAIP services and overlays the same assessor/GIS polygon and EPQS point markers on each date.

| Image year | Parcel-area date shown | Nominal source resolution | Date evidence |
|---|---:|---:|---|
| 2013 | 2013-06-07 | about 1.0 m | AZGeo catalog item name includes `m_3511135_ne_12_1_20130607` |
| 2017 | 2017-06-27 | about 0.6 m | USDA Arizona image-date feature layer; AZGeo NAIP 2017 map service |
| 2019 | 2019-06-27* | about 0.6 m | AZGeo image-service tile name includes `20190627`; USDA date index returns 2019-06-24 at the queried parcel point |
| 2021 | 2021-11-08 | about 0.6 m | USDA Arizona image-date feature layer; AZGeo tile metadata includes `20211108` |
| 2023 | 2023-08-04 | about 0.3 m | USDA Arizona image-date feature layer; AZGeo tile metadata includes `20230804` |

The 2019 one-time-date discrepancy is deliberately disclosed in the viewer. These are orthoimagery snapshots, not legal evidence of road status or boundary position.

## Sources

- [USGS 3DEP ImageServer](https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer) — the viewer locks to `OBJECTID=86167` / `AZ_Coconino_2019_B19`.
- [USGS EPQS API documentation](https://epqs.nationalmap.gov/v1/docs) and [EPQS endpoint](https://epqs.nationalmap.gov/v1/json).
- [USGS 1-meter 3DEP DEM collection](https://data.usgs.gov/datacatalog/data/USGS:77ae0551-c61e-4979-aedd-d797abdcde0e).
- [Arizona Water Maps parcel service, layer 2](https://azwatermaps.azwater.gov/arcgis/rest/services/General/Parcels/MapServer/2).
- [AZGeo NAIP 2013 ImageServer](https://azgeo.az.gov/arcgis/rest/services/imagery/NAIP2013/ImageServer); [2017 MapServer](https://azgeo.az.gov/arcgis/rest/services/imagery/NAIP2017/MapServer); [2019 ImageServer](https://azgeo.az.gov/arcgis/rest/services/imagery/NAIP2019/ImageServer); [2021 ImageServer](https://azgeo.az.gov/arcgis/rest/services/imagery/NAIP2021/ImageServer); [2023 ImageServer](https://azgeo.az.gov/arcgis/rest/services/imagery/NAIP2023/ImageServer).
- USDA NAIP image-date layers queried at the parcel area: [2017 Arizona](https://services.arcgis.com/LLVEmB8Lsae3Um4s/arcgis/rest/services/AZ2017_Seamlines/FeatureServer/0), [2019 Arizona](https://services.arcgis.com/LLVEmB8Lsae3Um4s/arcgis/rest/services/AZ_Seamlines2019/FeatureServer/0), [2021 Arizona](https://services.arcgis.com/LLVEmB8Lsae3Um4s/arcgis/rest/services/Seamlines_AZ4_2021/FeatureServer/0), [2023 Arizona](https://services.arcgis.com/LLVEmB8Lsae3Um4s/arcgis/rest/services/2023_Arizona_Image_Dates/FeatureServer/0).

## Limitations and use

This is an **early visualization aid**, not a boundary survey, design-grade topographic survey, engineering model, or legal opinion. It is not suitable for road/access rights, grading, drainage design, setback, construction, or legal line decisions. The parcel edge is not survey-controlled; the 10 EPQS points are spot samples; and no field shots, survey control, georeferenced fence/track line, or current ground check was added. The user's video annotation (NE-facing orientation and apparent track/fence/street context) remains qualitative only and was not digitized into the map.

The active technical step is the digital code/zoning and engineered-connections pre-review documented in `DIGITAL_CODE_ZONING_REVIEW.md`. Verify the screenshot fields and applicable zoning/lighting ordinances against current authoritative sources, then resolve title/access and obtain survey-controlled boundary/topography, tree, utility, and soils inputs before legal, grading, or engineering use. The terrain files remain preliminary visualization assets; this update does not authorize a design or development-plan iteration.
