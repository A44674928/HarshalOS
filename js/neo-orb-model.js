/* ═══════════════════════════════════════════════════════════════
   HarshalOS — NEO ORB geometry (js/neo-orb-model.js)
   The web shape contract for NEO ORB: deterministic disc-to-sphere placement,
   logarithmic bands, and collision-aware berths for display-only nodes.

   NEO ORB combines two existing visual ideas without inheriting any claim of
   external knowledge or control:
     · The Orb — a center-origin disc that forms into a sphere, with the
       author's two fractal flame engines burning behind it (js/apps-neo-orb.js).
     · Orb 2 — the Good Intelligence roster as display-only orbs placed by a
       deterministic symbol hash (sector), a logarithmic radial band, and a
       visible convergence measure with collision-aware berths.

   Pure math. No DOM, no network, no storage, no provider, no gate, no route.
   Every node here is geometry. A sector is a shape coordinate, not an address,
   endpoint, rank, or grant. Market-cap bands are a display convention, not a
   valuation.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

(() => {
  const TAU = Math.PI * 2;
  const SCHEMA = "neo-orb-web-v1";
  const CENTER_ADDRESS = "0•000•000•0000";
  const SECTOR_COUNT = 360;
  const LATITUDE_SPREAD = 0.62;
  const BAND_BASE = 0.44;
  const BAND_RATIO = 1.45;
  const MAX_BAND = 5;
  const CONVERGENCE_TOLERANCE = 0.35;
  const BERTH_MIN_CHORD = 0.12;
  const AXIS_MIN = 0.25;
  const AXIS_MAX = 2;
  /* rad (≈68.8°): the widest latitude makeShape() accepts from dynamic placement.
     This is a contract with the placer (js/neo-orb-placement.js), which is handed this
     constant and must never emit a wider placement. A refused placement throws inside
     the app's frame, so the two limits are one limit, exported and test-checked. */
  const PLACEMENT_LATITUDE_LIMIT = 1.2;
  /* ── the instability region ──────────────────────────────────────────────
     Band shells are the market-cap convention and they never move: band 0 (the
     largest caps) sits at r ≈ 0.36 and band 5 (the smallest) at r = 1.00. An
     instrument that is extended — overbought or oversold, per
     js/market-extension.js — leaves its band shell and sits in a separate region
     outside every band, further out the more extended it is. Extension is a
     display of instability: not a valuation, a rank, or a recommendation, and it
     never moves an orb's identity, sector, or band. */
  const INSTABILITY_REGION = Object.freeze({
    inner: 1.08,   // just outside the outermost band shell, so the gap reads
    outer: 1.5,    // the region's outer edge: an extreme reading (extension 1)
    entry: 0.15    // the extension over which an orb leaves its shell for the region
  });
  /* ── the depth shell ─────────────────────────────────────────────────
     Orb 2's radius is its FBB position, and NEO ORB now follows it. The radius is the
     close's depth through the six Fibonacci envelopes (js/neo-orb-signals.js), on the
     same 0…1 frame the band shells used: depth 0 (at the basis) sits on the inner shell,
     depth 1 (at the ±1000 envelope) on the outer. An unmeasured orb is held on the outer
     shell and labelled unmeasured — it is never placed as calm. Market-cap bands no
     longer set a radius; they still set inertia. */
  const DEPTH_SHELL = Object.freeze({ inner: 0.36, outer: 1.0, held: 1.0 });
  const KIND_BY_SECTOR = Object.freeze({
    Technology: "structural",
    Industrials: "structural",
    "Financial Services": "interaction",
    Energy: "interaction"
  });

  const finite = value => typeof value === "number" && Number.isFinite(value);
  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
  const wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));

  /* ── identity hashes ──────────────────────────────────────────────────
     64-bit FNV-1a over UTF-8 bytes. BigInt keeps the 64-bit arithmetic exact. */
  const FNV_OFFSET = 0xcbf29ce484222325n;
  const FNV_PRIME = 0x100000001b3n;
  const MASK64 = 0xffffffffffffffffn;

  /* UTF-8 bytes without TextEncoder, so the module also runs in a bare vm context. */
  function utf8Bytes(text) {
    const bytes = [];
    for (const char of String(text)) {
      const cp = char.codePointAt(0);
      if (cp < 0x80) bytes.push(cp);
      else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
      else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    }
    return bytes;
  }

  function fnv1a64(text) {
    let hash = FNV_OFFSET;
    for (const byte of utf8Bytes(text)) {
      hash ^= BigInt(byte);
      hash = (hash * FNV_PRIME) & MASK64;
    }
    return hash;
  }

  /* Display sector 0…359 — a deterministic symbol hash of the uppercased symbol. */
  function sectorFor(symbol) {
    return Number(fnv1a64(String(symbol).toUpperCase()) % BigInt(SECTOR_COUNT));
  }

  /* Stable identity phase in [−π, π) used for berth ordering. */
  function identityPhase(identity) {
    const normalized = Number(fnv1a64(identity)) / Number(MASK64);
    return normalized * TAU - Math.PI;
  }

  /* Logarithmic market-cap band 0…5. Larger caps sit nearer the center shell:
     $10B → 3, $100B → 2, $1T → 1, clamped to 0…5 (band = 13 − floor(log10 cap)). */
  function bandFor(marketCapUsd) {
    if (!finite(marketCapUsd) || marketCapUsd <= 0) return MAX_BAND;
    const band = 13 - Math.floor(Math.log10(marketCapUsd));
    return clamp(band, 0, MAX_BAND);
  }

  function kindFor(sector) {
    return KIND_BY_SECTOR[sector] || "field";
  }

  function radialBands() {
    const bands = [];
    for (let index = 0; index <= MAX_BAND; index++) {
      bands.push({ index, radius: BAND_BASE * Math.pow(BAND_RATIO, index) });
    }
    return bands;
  }

  const smoothstep01 = t => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };

  /* The radius of an orb carrying an extension of 0…1. Extension 0 is the band shell
     exactly, so an unmeasured or calm instrument keeps the documented band radius.
     Above 0 the orb leaves its shell and enters the instability region: over `entry`
     it travels to the region's inner edge, and from there its own extension positions
     it out to the outer edge. Continuous and monotone in the extension, so an orb
     never jumps and a larger reading is always further out. */
  function extensionRadius(radius, extension) {
    if (!finite(radius) || radius <= 0) return radius;
    const x = finite(extension) ? clamp(extension, 0, 1) : 0;
    if (x <= 0) return radius;
    const { inner, outer, entry } = INSTABILITY_REGION;
    const target = inner + (outer - inner) * x;
    return radius + (target - radius) * smoothstep01(x / entry);
  }

  function convergenceOf(axes) {
    const deviation = Math.max(Math.abs(axes.x - 1), Math.abs(axes.y - 1), Math.abs(axes.z - 1));
    return clamp(1 - deviation / CONVERGENCE_TOLERANCE, 0, 1);
  }

  /* ── geometry ─────────────────────────────────────────────────────── */
  function lerp3(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
  }

  /* Position of a point at (radius, longitude, latitude) for a given formation
     and axes. Formation 0 is the disc (y = 0), formation 1 is the sphere. */
  function positionFor(radius, longitude, latitude, formation, axes) {
    const disc = { x: radius * Math.cos(longitude), y: 0, z: radius * Math.sin(longitude) };
    const sphere = {
      x: radius * Math.cos(latitude) * Math.cos(longitude),
      y: radius * Math.sin(latitude),
      z: radius * Math.cos(latitude) * Math.sin(longitude)
    };
    const blended = lerp3(disc, sphere, formation);
    const factor = {
      x: 1 + (axes.x - 1) * formation,
      y: 1 + (axes.y - 1) * formation,
      z: 1 + (axes.z - 1) * formation
    };
    return { x: blended.x * factor.x, y: blended.y * factor.y, z: blended.z * factor.z };
  }

  function chord(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function clears(point, occupied, minimum) {
    return occupied.every(other => chord(point, other) >= minimum);
  }

  function nearestAvailableBerth(base, occupied, formation, axes, minimum) {
    const { radius, sourceLongitude, sourceLatitude } = base;
    const circumference = Math.max(0.12, radius * Math.max(0.20, Math.abs(Math.cos(sourceLatitude))));
    const longitudeStep = (minimum / circumference) * 1.10;
    const latitudeStep = Math.min(0.42, (minimum / Math.max(0.12, radius)) * 1.10);
    const latitudeLimit = 1.20;

    for (let ring = 0; ring <= 4; ring++) {
      const offsets = ring === 0 || formation < 0.02 ? [0] : [ring * latitudeStep, -ring * latitudeStep];
      for (const offset of offsets) {
        const latitude = clamp(sourceLatitude + offset, -latitudeLimit, latitudeLimit);
        for (let step = 1; step <= 16; step++) {
          for (const direction of [-1, 1]) {
            const longitude = sourceLongitude + direction * step * longitudeStep;
            const point = positionFor(radius, longitude, latitude, formation, axes);
            if (clears(point, occupied, minimum)) return { longitude, latitude };
          }
        }
      }
    }

    // Saturated: widest visible angle around the node's own latitude. Deterministic.
    let best = { longitude: sourceLongitude, latitude: sourceLatitude };
    let bestClearance = -Infinity;
    for (let sample = 0; sample < 72; sample++) {
      const longitude = sourceLongitude + (TAU * sample) / 72;
      const point = positionFor(radius, longitude, sourceLatitude, formation, axes);
      const clearance = occupied.length ? Math.min(...occupied.map(other => chord(point, other))) : Infinity;
      if (clearance > bestClearance) {
        bestClearance = clearance;
        best = { longitude, latitude: sourceLatitude };
      }
    }
    return best;
  }

  function resolveBerths(sources, formation, axes, amount) {
    const minimum = BERTH_MIN_CHORD * amount;
    const resolved = sources.map(source => ({
      source,
      longitude: source.sourceLongitude,
      latitude: source.sourceLatitude,
      wasReslotted: false
    }));
    const report = { amount, minimumChordDistance: minimum, crowdedNodeCount: 0, movedNodeIds: [] };
    if (!(minimum > 0) || resolved.length < 2) return { resolved, report };

    const order = sources.map((_, index) => index).sort((l, r) => {
      const a = identityPhase(sources[l].id), b = identityPhase(sources[r].id);
      if (Math.abs(a - b) < 1e-9) return sources[l].id < sources[r].id ? -1 : sources[l].id > sources[r].id ? 1 : 0;
      return a - b;
    });

    const occupied = [];
    for (const index of order) {
      const base = resolved[index];
      const source = base.source;
      const basePoint = positionFor(source.radius, base.longitude, base.latitude, formation, axes);
      if (clears(basePoint, occupied, minimum)) {
        occupied.push(basePoint);
        continue;
      }
      report.crowdedNodeCount += 1;
      const candidate = nearestAvailableBerth(
        { radius: source.radius, sourceLongitude: source.sourceLongitude, sourceLatitude: source.sourceLatitude },
        occupied, formation, axes, minimum
      );
      base.longitude = candidate.longitude;
      base.latitude = candidate.latitude;
      base.wasReslotted = true;
      occupied.push(positionFor(source.radius, candidate.longitude, candidate.latitude, formation, axes));
    }
    report.movedNodeIds = resolved.filter(entry => entry.wasReslotted).map(entry => entry.source.id);
    return { resolved, report };
  }

  /* Validate a configuration: fail closed, never clamp silently. */
  function validate(configuration) {
    const { formation, axes, berthSeparation, nodes } = configuration;
    if (!finite(formation) || formation < 0 || formation > 1) throw new RangeError(`Formation must be 0…1; received ${formation}.`);
    for (const [name, value] of [["x", axes.x], ["y", axes.y], ["z", axes.z]]) {
      if (!finite(value) || value < AXIS_MIN || value > AXIS_MAX) throw new RangeError(`Axis ${name} must be ${AXIS_MIN}…${AXIS_MAX}; received ${value}.`);
    }
    if (!finite(berthSeparation) || berthSeparation < 0 || berthSeparation > 1) throw new RangeError(`Berth separation must be 0…1; received ${berthSeparation}.`);
    validateNodes(nodes);
  }

  function validateNodes(nodes) {
    const seen = new Set();
    for (const node of nodes) {
      if (!node.id || typeof node.id !== "string") throw new TypeError("NEO ORB nodes require a non-empty stable id.");
      if (seen.has(node.id)) throw new RangeError(`NEO ORB node ids must be unique; ${node.id} appears more than once.`);
      seen.add(node.id);
      if (!Number.isInteger(node.sector) || node.sector < 0 || node.sector >= SECTOR_COUNT) throw new RangeError(`Node ${node.id} uses sector ${node.sector}; valid sectors are 0…359.`);
      if (!finite(node.depth) || node.depth < 0 || node.depth > 1) throw new RangeError(`Node ${node.id} depth must be 0…1.`);
      if (!Number.isInteger(node.radialBand) || node.radialBand < 0 || node.radialBand > MAX_BAND) throw new RangeError(`Node ${node.id} band must be 0…${MAX_BAND}.`);
    }
  }

  /* Extensions are optional: { [id]: 0…1 } from js/market-extension.js. Each must name a
     node in the configuration and be finite and inside 0…1. Fail closed, never clamped. */
  /* Depths are optional: { [id]: 0…1 | null } from js/neo-orb-signals.js. A null is an
     unmeasured orb and sits on the held shell. Absent entirely, every orb is unmeasured. */
  function validateDepths(depths, nodes) {
    if (depths === null || depths === undefined) return null;
    if (typeof depths !== "object" || Array.isArray(depths)) throw new TypeError("Depths must be a map of node id to depth.");
    const ids = new Set(nodes.map(n => n.id));
    for (const [id, value] of Object.entries(depths)) {
      if (!ids.has(id)) throw new RangeError(`Depth names ${id}, which is not a node in this shape.`);
      if (value !== null && (!finite(value) || value < 0 || value > 1)) throw new RangeError(`Depth for ${id} must be null or 0…1; received ${value}.`);
    }
    return depths;
  }

  function validateExtensions(extensions, nodes) {
    if (extensions === null || extensions === undefined) return null;
    if (typeof extensions !== "object" || Array.isArray(extensions)) throw new TypeError("Extensions must be a map of node id to extension.");
    const ids = new Set(nodes.map(n => n.id));
    for (const [id, value] of Object.entries(extensions)) {
      if (!ids.has(id)) throw new RangeError(`Extension names ${id}, which is not a node in this shape.`);
      if (!finite(value) || value < 0 || value > 1) throw new RangeError(`Extension for ${id} must be a finite 0…1; received ${value}.`);
    }
    return extensions;
  }

  /* Home anchors: where each node sits before any dynamic placement. Sector
     fixes longitude, list position fixes latitude, band fixes radius. Shared by
     makeShape() and homesFor() so the placer starts from the same anchors. */
  /* Sector sets each home's longitude and list index sets its latitude. Taken raw, those
     collide: two sectors that land close, with neighbouring indices, share a slot, so the
     berth check re-slots orbs at rest. Relax the homes once, deterministically, until no
     pair is closer than HOME_SEPARATION in 3D (the same metric as the berth check), each
     home staying within HOME_SHIFT of its sector. */
  const HOME_SEPARATION = 0.16;    // chord, above the berth floor (0.12)
  const HOME_SHIFT = 1.0;          // rad: a relaxed home stays this close to its sector longitude
  const HOME_LAT_LIMIT = 0.8;      // rad
  const HOME_PASSES = 400;
  const relaxedCache = new WeakMap();   // nodes → { key, sources }; key covers the depths

  function relaxSources(sources) {
    const ideal = { x: 1, y: 1, z: 1 };
    const homes = sources.map(source => ({
      id: source.id,
      radius: source.radius,
      baseLon: source.sourceLongitude,
      baseLat: source.sourceLatitude,
      lon: source.sourceLongitude,
      lat: source.sourceLatitude
    }));
    const pointAt = (h, lon, lat) => positionFor(h.radius, lon, lat, 1, ideal);
    for (let pass = 0; pass < HOME_PASSES; pass++) {
      let worst = 0;
      for (let i = 0; i < homes.length; i++) {
        for (let j = i + 1; j < homes.length; j++) {
          const a = homes[i], b = homes[j];
          const mid = (a.lat + b.lat) / 2;
          const cosMid = Math.max(0.2, Math.cos(mid));
          /* chord = radius × angle, so the angular reach depends on the smaller radius */
          const reach = HOME_SEPARATION * 1.6 / Math.min(a.radius, b.radius);
          const dl = (a.lon - b.lon > Math.PI ? a.lon - b.lon - TAU : a.lon - b.lon < -Math.PI ? a.lon - b.lon + TAU : a.lon - b.lon) * cosMid, dt = a.lat - b.lat;
          if (Math.abs(dl) > reach || Math.abs(dt) > reach) continue;
          const pa = pointAt(a, a.lon, a.lat), pb = pointAt(b, b.lon, b.lat);
          const d = Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z);
          if (d >= HOME_SEPARATION) continue;
          worst = Math.max(worst, HOME_SEPARATION - d);
          let nx = dl, ny = dt;
          let L = Math.hypot(nx, ny);
          if (L < 1e-9) { nx = 1; ny = 0; L = 1; }
          nx /= L; ny /= L;
          const meanRadius = (a.radius + b.radius) / 2;
          const angle = ((HOME_SEPARATION - d) * 0.55) / meanRadius;
          a.lon += (angle * nx) / cosMid / 2; a.lat += (angle * ny) / 2;
          b.lon -= (angle * nx) / cosMid / 2; b.lat -= (angle * ny) / 2;
        }
      }
      for (const h of homes) {
        h.lon = clamp(h.lon, h.baseLon - HOME_SHIFT, h.baseLon + HOME_SHIFT);
        h.lat = clamp(h.lat, -HOME_LAT_LIMIT, HOME_LAT_LIMIT);
      }
      if (worst < 1e-4) break;
    }
    return homes;
  }

  function depthKeyOf(nodes, depths) {
    return nodes.map(node => {
      const value = depths ? depths[node.id] : undefined;
      return value === null || value === undefined ? "h" : value.toFixed(6);
    }).join(",");
  }

  function sourcesFor(nodes, depths = null) {
    const key = depthKeyOf(nodes, depths);
    const cached = relaxedCache.get(nodes);
    if (cached && cached.key === key) return cached.sources.map(source => ({ ...source }));
    const raw = sourcesRaw(nodes, depths);
    const relaxed = relaxSources(raw);
    const sources = raw.map((source, index) => ({
      ...source,
      sourceLongitude: relaxed[index].lon,
      sourceLatitude: relaxed[index].lat
    }));
    relaxedCache.set(nodes, { key, sources });
    return sources.map(source => ({ ...source }));
  }

  /* The shell radius of one orb from its depth. Measured depths map linearly across the
     inner-to-outer frame; a null or absent depth is held on the outer shell. */
  function shellRadiusOf(depth) {
    if (depth === null || depth === undefined) return DEPTH_SHELL.held;
    return DEPTH_SHELL.inner + (DEPTH_SHELL.outer - DEPTH_SHELL.inner) * clamp(depth, 0, 1);
  }

  function sourcesRaw(nodes, depths = null) {
    const bands = radialBands();
    const maxBandRadius = bands[bands.length - 1].radius;
    const count = Math.max(1, nodes.length);
    return nodes.map((node, index) => {
      const sourceLongitude = (node.sector / SECTOR_COUNT) * TAU - Math.PI / 2;
      const normalizedIndex = (index + 0.5) / count;
      const sourceLatitude = Math.asin(clamp(1 - 2 * normalizedIndex, -1, 1)) * LATITUDE_SPREAD;
      const bandRadius = bands[node.radialBand].radius;
      const depth = depths && depths[node.id] !== undefined ? depths[node.id] : null;
      const shell = shellRadiusOf(depth);
      const radius = shell * (0.88 + 0.12 * node.depth);
      return {
        id: node.id,
        node,
        radius,
        depth,
        sourceLongitude,
        sourceLatitude,
        nodeRadius: 0.038 + 0.012 * node.radialBand,
        radialBandRadius: bandRadius
      };
    });
  }

  /* [{ id, longitude, latitude, radius, band, sector }] — the home anchors for the placer. */
  function homesFor(nodes, depths = null) {
    validateNodes(nodes);
    return sourcesFor(nodes, validateDepths(depths, nodes)).map(source => ({
      id: source.id,
      longitude: source.sourceLongitude,
      latitude: source.sourceLatitude,
      radius: source.radius,
      band: source.node.radialBand,
      sector: source.node.sector
    }));
  }

  /* Placements are optional. Each must name a node in the configuration, and
     its coordinates must be finite and inside the latitude limit. Fail closed. */
  function validatePlacements(placements, nodes) {
    if (!placements) return null;
    const ids = new Set(nodes.map(n => n.id));
    for (const [id, place] of Object.entries(placements)) {
      if (!ids.has(id)) throw new RangeError(`Placement names ${id}, which is not a node in this shape.`);
      if (!place || !finite(place.longitude) || !finite(place.latitude)) throw new RangeError(`Placement for ${id} needs finite longitude and latitude.`);
      if (Math.abs(place.latitude) > PLACEMENT_LATITUDE_LIMIT) {
        throw new RangeError(`Placement latitude for ${id} must be within ±${PLACEMENT_LATITUDE_LIMIT}; received ${place.latitude}.`);
      }
    }
    return placements;
  }

  /* make(): the full deterministic shape for a configuration.
     Optional configuration.placements = { [id]: { longitude, latitude } } moves
     an orb's starting point (dynamic placement). Radius and identity never move;
     berth separation still applies to the placed points. */
  function makeShape(configuration) {
    validate(configuration);
    const { formation } = configuration;
    const axes = { x: configuration.axes.x, y: configuration.axes.y, z: configuration.axes.z };
    const bands = radialBands();
    const maxBandRadius = bands[bands.length - 1].radius;
    const placements = validatePlacements(configuration.placements, configuration.nodes);
    const extensions = validateExtensions(configuration.extensions, configuration.nodes);

    const depths = validateDepths(configuration.depths, configuration.nodes);
    const sources = sourcesFor(configuration.nodes, depths).map(source => {
      const home = { longitude: source.sourceLongitude, latitude: source.sourceLatitude };
      const placed = placements ? placements[source.id] : null;
      /* The band radius is the convention; the extension lifts an orb out of its shell
         into the instability region. Berths resolve at the lifted radius, so orbs that
         share the region are spaced where they are actually drawn. */
      const extension = extensions ? Number(extensions[source.id] ?? 0) : 0;
      return {
        ...source,
        shellRadius: source.radius,
        radius: extensionRadius(source.radius, extension),
        extension,
        homeLongitude: home.longitude,
        homeLatitude: home.latitude,
        sourceLongitude: placed ? placed.longitude : home.longitude,
        sourceLatitude: placed ? placed.latitude : home.latitude
      };
    });

    const { resolved, report } = resolveBerths(sources, formation, axes, configuration.berthSeparation ?? 1);
    const nodes = resolved.map(entry => {
      const source = entry.source;
      return {
        id: source.id,
        node: source.node,
        position: positionFor(source.radius, entry.longitude, entry.latitude, formation, axes),
        sourceLongitude: source.sourceLongitude,
        sourceLatitude: source.sourceLatitude,
        homeLongitude: source.homeLongitude,
        homeLatitude: source.homeLatitude,
        longitude: entry.longitude,
        latitude: entry.latitude,
        radius: source.radius,
        shellRadius: source.shellRadius,
        depth: source.depth,
        bandRadius: source.radialBandRadius,
        extension: source.extension,
        nodeRadius: source.nodeRadius,
        radialBandRadius: source.radialBandRadius,
        wasReslotted: entry.wasReslotted
      };
    });

    const idealSphere = axes.x === 1 && axes.y === 1 && axes.z === 1;
    const extended = nodes.filter(node => node.extension > 0);
    return {
      schema: SCHEMA,
      centerAddress: CENTER_ADDRESS,
      formation,
      axes,
      convergence: convergenceOf(axes),
      idealSphere,
      radialBands: bands,
      berthSeparation: report,
      /* What the instability region is doing this frame, for the readouts. */
      instability: {
        region: INSTABILITY_REGION,
        extendedCount: extended.length,
        extendedNodeIds: extended.map(node => node.id),
        maxExtension: extended.length ? Math.max(...extended.map(node => node.extension)) : 0,
        maxRadius: nodes.length ? Math.max(...nodes.map(node => node.radius)) : 0
      },
      nodes
    };
  }

  /* ── roster → nodes ───────────────────────────────────────────────── */
  /* Maps the reviewed Good Intelligence roster snapshot to display nodes.
     Only symbol, sector, and market-cap fields are read; nothing is fetched. */
  function rosterNodes(assets) {
    return (assets || []).map(asset => {
      const sector = sectorFor(asset.symbol);
      return {
        id: asset.symbol,
        label: asset.symbol,
        sector,
        depth: 0.5,
        radialBand: bandFor(asset.marketCapUsd),
        kind: kindFor(asset.sector),
        name: asset.name,
        issuerSector: asset.sector,
        sectorRank: asset.sectorRank,
        marketCapLabel: asset.marketCapLabel,
        marketCapUsd: asset.marketCapUsd,
        marketStage: asset.marketStage || "established"
      };
    });
  }

  const api = Object.freeze({
    SCHEMA,
    CENTER_ADDRESS,
    SECTOR_COUNT,
    MAX_BAND,
    AXIS_MIN,
    AXIS_MAX,
    LATITUDE_SPREAD,
    BAND_BASE,
    BAND_RATIO,
    BERTH_MIN_CHORD,
    PLACEMENT_LATITUDE_LIMIT,
    INSTABILITY_REGION,
    DEPTH_SHELL,
    shellRadiusOf,
    extensionRadius,
    fnv1a64,
    sectorFor,
    identityPhase,
    bandFor,
    kindFor,
    radialBands,
    convergenceOf,
    positionFor,
    makeShape,
    homesFor,
    rosterNodes
  });
  if (typeof window !== "undefined") window.NeoOrbModel = api;
  else globalThis.NeoOrbModel = api;
})();
