# APN 30055004 — preliminary terrain and aerial model

## Deliverables

- `index.html` — self-contained interactive viewer. It renders the actual USGS 3DEP 1-meter DEM dynamically from the public ImageServer, locked to source raster **86167**, and switches among five Arizona NAIP image years (2013, 2017, 2019, 2021, 2023). The viewer needs an internet connection to the public ArcGIS services.
- `epqs_samples.csv` — ten USGS Elevation Point Query Service samples in WGS84, with returned elevations in feet.
- `parcel_outline.geojson` — parcel polygon returned by Arizona Water Maps for APN 30055004, kept separate from the terrain data and explicitly identified as assessor/GIS geometry, not a survey.
- `js/apps-frontiership.js` + `css/frontiership.css` — the FRONTIERSHIP / OUTPOST ONE HarshalOS desktop app and scoped styling. The module is registered before shell startup, so its `⌂` / OUTPOST ONE launcher icon appears in the desktop grid.
- `harshalos-private-preview.html` — optional local wrapper for the HarshalOS desktop; it opens with the desktop app icon visible and provides a separate open/restore button.
- `best-wishes-edition/frontiership-outpost-one-best-wishes-3d.mp4` + poster + `BEST_WISHES_EDITION_GUIDE.md` — separate 5-minute, silent 1920×1080 / 24 fps ray-traced 3D concept film with a Best-Wishes aspiration layer, room-zone cutaway, snow, animated conceptual systems, and explicit evidence / feasibility limits. It does not replace the existing feature.
- `outpost-one-full-feature-film.mp4` + `outpost-one-full-feature-poster.png` — the preserved 9-minute, silent 1920×1080 / 12 fps concept feature with snowfall, Fallout Shelter–inspired side-on building cutaways, animated system overviews, and an optional dashed tunnel study.
- `OUTPOST_ONE_FEATURE_FILM_GUIDE.md` — first-edition chapter timestamps, specifications, interpretation notes, assumptions, and limits.
- `outpost-one-pixel-concept-film.mp4` + `outpost-one-pixel-concept-poster.png` — earlier 24-second experience-led pixel flythrough retained as a secondary reference.
- `outpost-one-concept-model.obj` + `.mtl` — editable, low-detail blockout; `outpost-one-concept-model.zip` packages the paired model files and model notes.
- `render_outpost_one_feature_film.py`, `render_outpost_one_pixel_movie.py`, and `OUTPOST_ONE_CONCEPT_MODEL_NOTES.md` — reproducible long-form renderer, short renderer, model provenance, and explicit limitations.
- `private-preview-server.mjs` — allowlisted local preview server for the HarshalOS shell, terrain viewer, and explicitly named film/poster/guide/model files, including the new Best-Wishes edition; it does not expose the repository's other project documents or workbooks.
- `HARSHALOS_APP_INTEGRATION.md` — the desktop registration, named asset deploy-list, and external Cloudflare Access requirements.

Run the local wrapper from the repository root with `node single-parcel-APN30055004/terrain_preliminary/private-preview-server.mjs`, then open port 8001. The wrapper shows the HarshalOS desktop with the OUTPOST ONE launcher icon available; it does not inject a second copy of the app. The Cloudflare Access policy is external to this repository and must protect all deployed app and media routes.

No full DEM GeoTIFF, LiDAR point cloud, or aerial raster was downloaded into this repository. The viewer requests live public renderings; the CSV is a small set of spot queries, **not** a raster or a complete elevation grid. The 3D concept film interpolates between only those ten values for a visibly labeled placeholder surface; it does not use the live 3DEP image service as a downloadable DEM. The previous `terrain_real/` preview files remain synthetic and were not used.

## Terrain source and method

- **USGS 3DEP 1-meter bare-earth DEM**, source project `AZ_Coconino_2019_B19`, raster/catalog ID **86167**.
- The source record identifies a standard USGS 1-meter DEM produced from high-resolution LiDAR, vertical datum **NAVD 88**. The service viewer applies an ArcGIS lock mosaic rule to ID 86167, so the display does not silently switch to a neighboring/coarser 3DEP source. A locked 3DEP identify check at P02 returned 2,215.75 m (7,269.521 ft), within 0.011 ft of the EPQS result at that point.
- The viewer offers elevation-tinted hillshade, slope, and dynamically generated 2-foot display-contour renderings. They are visualizations of the source raster, not survey contours.
- Ten EPQS requests were made within the returned parcel polygon. Each reported `rasterId=86167` and `resolution=1`. The measured sample range is **7,256.198–7,282.971 ft**, a **26.773 ft spread between queried points**. P03 is the highest queried point (east/northeast-ish); P09 is the lowest queried point (southeast-ish). These are not verified site extrema and do not establish drainage or design grades.
- Three `includeDate=true` EPQS checks (center, high sample, and southwest sample) returned `AcquisitionDate=2019-07-02`. The 3DEP catalog item for raster 86167 identifies the project as `AZ_Coconino_2019_B19` and gives the acquisition window **2019-08-16 to 2019-08-20** (the catalog's epoch date is 2019-08-20). These date fields disagree. The source is clearly the 2019 project, but the exact acquisition date should be treated as unresolved pending raw-source metadata review.

## 3D concept film and blockout

The private prototype now presents two separate feature films while retaining the earlier 24-second silent experience cut as a secondary reference. The original 9-minute, silent 1920×1080 / 12 fps feature remains unchanged: its 640×360 pixel-art master is enlarged 3×, with snowfall, long holds, side-on room-band cutaways, animated system overviews, and an optional dashed tunnel study. The new 5-minute, silent 1920×1080 / 24 fps Best-Wishes edition is a separate ray-traced 3D rendering upgrade: it adds slow post-render camera drift, a high-tech concept interface, a room-zone HQ cutaway, separate wellness / greenhouse views, animated system diagrams, and an aspirational layer clearly labeled as unverified. `OUTPOST_ONE_FEATURE_FILM_GUIDE.md` and `best-wishes-edition/BEST_WISHES_EDITION_GUIDE.md` record their distinct specifications and limits. Both renderers use the GIS polygon as a visual frame and the ten EPQS spot values for a placeholder surface; neither uses the synthetic `terrain_real/` files. Relief is exaggerated 2.5× in the schematic site visualization. Buildings, room zones, tree locations, internal circulation, amenities, systems links, and the optional tunnel are illustrations—not georeferenced footprints, verified routes, engineering, capacity, approvals, or access findings. See the two film guides and `OUTPOST_ONE_CONCEPT_MODEL_NOTES.md` for interpretation limits.

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

If the work resumes after the partner meeting, the next technical refinement is to obtain the actual tile and adjacent coverage as local georeferenced files, validate the 1-meter raster metadata/date, and—before any legal or grading use—obtain survey-controlled boundary and topographic data. No broader development-plan iteration is included here.
