# FRONTIERSHIP · OUTPOST ONE — preliminary 3D concept model

**Status:** a low-tech, pixelated visualization study created 2026-10-17 at the user's request. The current cut emphasizes the on-site experience and adds a Nordic-style thermal circuit plus greenhouse-to-table / shared-dining cues to the 3D blockout. These amenity additions are visual concepts only: they do not revise the formal predevelopment plan, economics, utility assumptions, or permit scope. This is not a design approval or construction model; professional feasibility review remains required.

## Deliverables

- `outpost-one-pixel-concept-film.mp4` — silent, 24-second retro/pixelated flythrough; H.264, 1152 × 648, 12 fps.
- `outpost-one-pixel-concept-poster.png` — still from the film, suitable as a preview poster.
- `outpost-one-concept-model.obj` + `outpost-one-concept-model.mtl` — editable low-detail 3D blockout, usable in Blender and other OBJ-capable tools. The paired files are also packaged in `outpost-one-concept-model.zip`.
- `render_outpost_one_pixel_movie.py` — reproducible renderer and source geometry.

## What the model represents

The massing is a visual interpretation of the current FRONTIERSHIP / OUTPOST ONE direction: a modern forest-cabin HQ with a bermed lower wing, demo-closet/lab mass, emergency-capable medical-core marker, detached owner/ADU cabin, greenhouse and amenity barn, internal circulation concept, and a five-tree retention target. The added experience layer places a **Nordic-style thermal circuit** beside the amenity barn—dry sauna/warm room, small hot-soak tub, cold plunge, and quiet rest deck—and a shared dining terrace linked conceptually to the greenhouse-to-table program. These are experiential amenities, not clinical treatment. The captions retain the directed **20–50 kW sustained frontier target**, **BYO rented compute + demo closet**, and **30+ day cohorts / no STR** assumptions. The medical marker is symbolic; it does not show a licensed clinic or validated clinical layout.

Building placements, dimensions, floorplate proportions, roads, trees, well marker, orchard, spa courtyard, dining terrace, and retention basin are **hand-blocked illustration only**. They are not georeferenced to the plan graphic, survey, fence, two-track, or verified access. The internal drive depiction stops at the assessor/GIS parcel frame and makes no claim about public-road connection or access rights. The five ponderosa icons express the retention target; their positions are invented. Spa water, heat, power, wastewater, staffing, safety, and operating loads have not been estimated or validated.

## Terrain and boundary inputs

- The outline is the Arizona Water Maps assessor/GIS polygon for APN 30055004. Its approximate local extent is 649.5 ft east–west by 376.2 ft north–south; it is **not a boundary survey** and differs from the older 5.00-acre planning assumption.
- The terrain is an inverse-distance interpolation between the **ten** values in `epqs_samples.csv` (USGS EPQS; raster ID 86167; reported 1 m source resolution; NAVD88). The modeled spot-sample range is 7,256.198–7,282.971 ft. This sparse interpolation is only a visual placeholder—not a full DEM, contour surface, drainage analysis, design grade, or verified parcel extrema.
- Video and OBJ vertical values are exaggerated by **2.5×** for legibility. In the OBJ, +X is east, +Y is north, +Z is vertical; horizontal coordinates are local feet from the assessor/GIS extent, and Z=0 is the mean of the ten EPQS samples (~7,265.201 ft NAVD88) before vertical exaggeration.
- No synthetic `terrain_real/` GeoTIFF/contours were used. No full 3DEP GeoTIFF, LiDAR point cloud, or aerial raster was used to create this video.

## Limits

This is **not for permitting, engineering, legal, medical-facility design, grading, drainage, access, setbacks, financing, or construction**. It does not establish a legal boundary, road authority, road/access rights, FFE, setbacks, geotechnical conditions, well/septic feasibility, tree locations, EMS/air-ambulance operations, medical licensure, or actual building sizes. Survey-controlled topography, ALTA/NSPS boundary work, geotechnical and utility studies, architect/engineer review, county pre-app, healthcare counsel, and EMS/fire-district coordination remain separate gates.

The HarshalOS `Site & Terrain` panel links to the feature MP4, chapter guide, and editable OBJ/MTL ZIP. The deployment stager copies only an explicit list of app media and terrain-viewer files from this folder; it does not stage the project directory, render sources, workbooks, or the synthetic `terrain_real/` package. The static browser bundle does not enforce privacy: Cloudflare Access must protect the main site and direct asset paths, including `/js/`, `/css/`, `/private/`, and `/terrain/`.

## Rebuild

From the repository root:

```bash
python3 single-parcel-APN30055004/terrain_preliminary/render_outpost_one_pixel_movie.py
```

Requires Python 3 with Pillow, NumPy, and `imageio-ffmpeg`. The script reads only `parcel_outline.geojson` and `epqs_samples.csv` from this private folder.
