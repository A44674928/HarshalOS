/* ═══════════════════════════════════════════════════════════════
   HarshalOS — NEO ORB dynamic placement (js/neo-orb-placement.js)
   Flame-guided, display-only motion for the Orb 2 roster orbs.

   The two .flame engines (Demo.flame and OuterOrb.flame, js/flame.js) are
   sampled as a density field. Their bright regions — the "bits" of the
   bitmap — become targets. Each orb is pulled toward a target by a
   spring-damper and steered up the field's gradient, so it travels
   smoothly from bit to bit instead of jumping. The flame itself is never
   drawn; it only supplies guidance.

   What the data controls, and nothing more:
     · sector (symbol hash)   → the home anchor. A node roams only inside a
                                tether around its own sector, so identity
                                stays readable.
     · market-cap band        → the radius (set by the model, never moved
                                by the flame) and inertia: larger caps are
                                heavier and drift more slowly. This is a
                                display convention, not a valuation.
     · flame bitmap           → guidance only. It sets where a node heads,
                                never what the node is.

   Pure math. No DOM, no network, no storage. Feed it a density field and
   it returns offsets. Berth separation is still applied by the model
   (js/neo-orb-model.js) on the placed positions.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

(() => {
  const SCHEMA = "neo-orb-placement-v1";
  const FIELD_N = 40;              // flame sampling resolution per side (cells)
  const BIT_COUNT = 24;            // bits offered to the placer at once
  const BIT_FLOOR = 0.2;           // cells dimmer than this are not bits
  const BIT_MIN_SEP = 0.18;        // minimum spacing between bits, in disc units
  const TETHER_LON = 1.2;          // rad: longitudinal roam at Roam = 1 (≈69°)
  const TETHER_LAT = 0.6;          // rad: latitudinal roam at Roam = 1 (≈34°)
  const LAT_LIMIT = 1.0;           // rad: placed latitude is clamped here
  const SPRING_K = 2.4;            // spring stiffness toward the target
  const DAMPING = 2 * 0.9 * Math.sqrt(SPRING_K);   // ζ = 0.9: smooth, slight overshoot
  const GUIDE_GAIN = 0.35;         // steering up the flame gradient
  const MAX_SPEED = 0.45;          // rad/s for mass 1; heavier orbs are capped lower
  const REPEL_RADIUS = 0.12;       // rad: soft spacing between neighbours
  const REPEL_GAIN = 1.2;
  const ARRIVE_DIST = 0.12;        // rad: close enough to a bit to dwell there (neighbour spacing keeps a small standoff)
  const SETTLE_SPEED = 0.05;       // rad/s: slow enough to count as settled
  const MIN_DWELL = 1.0;           // s at a bit before moving on (mass 1); scales with √mass
  const MAX_DWELL = 6.0;           // s since the last retarget before a stalled orb retargets anyway (× √mass)
  const GUIDE_FADE = 0.15;         // rad: flow steering fades out inside this distance of the bit
  const MAX_FRAME_DT = 0.1;        // s: a long frame never teleports the sim
  const MAX_SUBSTEP = 1 / 30;      // s: integration step
  const CLAIM_PENALTY = 1.5;       // each armed orb already on a bit lowers its pull
  const CLAIM_RADIUS = 0.25;       // in disc units: "on the same bit" radius
  const MAX_BAND = 5;

  const finite = value => typeof value === "number" && Number.isFinite(value);
  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
  const wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));

  /* 32-bit FNV-1a with an avalanche step, mapped to [0, 1). Deterministic. */
  function hash01(text) {
    let h = 0x811c9dc5;
    const s = String(text);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  /* Inertia from the market-cap band: band 0 (largest caps) is heaviest.
     Mass 1…3.5. Display physics only, not a valuation. */
  function inertiaFor(band) {
    const b = clamp(Number.isInteger(band) ? band : MAX_BAND, 0, MAX_BAND);
    return 1 + 0.5 * (MAX_BAND - b);
  }

  /* ── density field ───────────────────────────────────────────────── */
  /* A field is { size, values: Float32Array(size*size) } over the unit disc.
     Cell (x, y) maps to disc coords u, v ∈ (−1, 1); cells outside the disc are 0. */
  function discCoords(index, size) {
    const x = index % size, y = (index - x) / size;
    return { u: ((x + 0.5) / size) * 2 - 1, v: ((y + 0.5) / size) * 2 - 1 };
  }

  /* Luminance of a flame bitmap (RGBA bytes) → density field. */
  function fieldFromRGBA(rgba, size, options = {}) {
    if (!size || size < 2 || !rgba || rgba.length < size * size * 4) {
      throw new RangeError(`Flame bitmap must be at least ${size}×${size} RGBA.`);
    }
    const gamma = finite(options.gamma) ? options.gamma : 1.6;
    const values = new Float32Array(size * size);
    let max = 0;
    for (let i = 0; i < size * size; i++) {
      const k = i * 4;
      const lum = (0.2126 * rgba[k] + 0.7152 * rgba[k + 1] + 0.0722 * rgba[k + 2]) / 255;
      const { u, v } = discCoords(i, size);
      const inside = u * u + v * v <= 1;
      const value = inside ? Math.pow(lum, gamma) : 0;
      values[i] = value;
      if (value > max) max = value;
    }
    if (max > 0) for (let i = 0; i < values.length; i++) values[i] /= max;
    return { size, values };
  }

  /* Weighted blend of fields on the same grid, renormalized to peak 1. */
  function combineFields(parts) {
    const usable = (parts || []).filter(p => p && p.field && finite(p.weight) && p.weight > 0);
    if (!usable.length) return null;
    const size = usable[0].field.size;
    if (usable.some(p => p.field.size !== size)) throw new RangeError("Flame fields must share one size.");
    const total = usable.reduce((sum, p) => sum + p.weight, 0);
    const values = new Float32Array(size * size);
    for (const part of usable) {
      const w = part.weight / total;
      for (let i = 0; i < values.length; i++) values[i] += w * part.field.values[i];
    }
    let max = 0;
    for (const v of values) if (v > max) max = v;
    if (max > 0) for (let i = 0; i < values.length; i++) values[i] /= max;
    return { size, values };
  }

  /* 3×3 box blur. Smooth gradients keep steering stable from frame to frame. */
  function smoothField(field) {
    const { size, values } = field;
    const out = new Float32Array(size * size);
    let max = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
            sum += values[yy * size + xx];
            n += 1;
          }
        }
        const v = sum / n;
        out[y * size + x] = v;
        if (v > max) max = v;
      }
    }
    if (max > 0) for (let i = 0; i < out.length; i++) out[i] /= max;
    return { size, values: out };
  }

  /* Bilinear sample at disc coords (u, v). Outside the disc, 0. */
  function sampleField(field, u, v) {
    if (!field || u * u + v * v > 1) return 0;
    const { size, values } = field;
    const fx = clamp(((u + 1) / 2) * size - 0.5, 0, size - 1);
    const fy = clamp(((v + 1) / 2) * size - 0.5, 0, size - 1);
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(size - 1, x0 + 1), y1 = Math.min(size - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const a = values[y0 * size + x0], b = values[y0 * size + x1];
    const c = values[y1 * size + x0], d = values[y1 * size + x1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }

  /* Central-difference gradient in disc coords. */
  function gradientField(field, u, v) {
    const h = 2 / field.size;
    return {
      u: (sampleField(field, u + h, v) - sampleField(field, u - h, v)) / (2 * h),
      v: (sampleField(field, u, v + h) - sampleField(field, u, v - h)) / (2 * h)
    };
  }

  /* Bright bits: a spread of bright cells across the disc. A flame is usually one
     broad core with a single local maximum, so maxima alone would pile every orb
     onto one spot. Instead: take the brightest cells, then greedily add the cell
     that maximizes brightness × distance from the bits already chosen. Deterministic. */
  function findBits(field, count = BIT_COUNT) {
    const { size, values } = field;
    const stride = size > 32 ? 2 : 1;
    const candidates = [];
    for (let y = 0; y < size; y += stride) {
      for (let x = 0; x < size; x += stride) {
        const i = y * size + x;
        const w = values[i];
        if (w < BIT_FLOOR) continue;
        const { u, v } = discCoords(i, size);
        if (u * u + v * v > 0.9 * 0.9) continue;
        candidates.push({ u, v, w });
      }
    }
    if (!candidates.length) return [];
    candidates.sort((a, b) => (b.w - a.w) || (a.u - b.u) || (a.v - b.v));
    const bits = [candidates[0]];
    const minDist = candidates.map(c => Math.hypot(c.u - bits[0].u, c.v - bits[0].v));
    while (bits.length < count) {
      let best = -1, bestScore = 0;
      for (let i = 0; i < candidates.length; i++) {
        const d = minDist[i];
        if (d < BIT_MIN_SEP) continue;
        const score = candidates[i].w * d;
        if (score > bestScore) { bestScore = score; best = i; }
      }
      if (best < 0) break;
      const chosen = candidates[best];
      bits.push(chosen);
      for (let i = 0; i < candidates.length; i++) {
        const d = Math.hypot(candidates[i].u - chosen.u, candidates[i].v - chosen.v);
        if (d < minDist[i]) minDist[i] = d;
      }
    }
    return bits;
  }

  /* ── placer ──────────────────────────────────────────────────────── */
  /* homes: [{ id, longitude, latitude, band }] from the model's homesFor().
     The placer keeps only offsets from home, so identity is never lost. */
  function createPlacer(homes, options = {}) {
    if (!Array.isArray(homes)) throw new TypeError("createPlacer needs an array of homes.");
    const seen = new Set();
    for (const h of homes) {
      if (!h || typeof h.id !== "string" || !h.id) throw new TypeError("Every home needs a stable id.");
      if (seen.has(h.id)) throw new RangeError(`Placer ids must be unique; ${h.id} appears twice.`);
      seen.add(h.id);
    }

    let roam = clamp(finite(options.roam) ? options.roam : 0.6, 0, 1);
    const nodes = homes.map(h => ({
      id: h.id,
      homeLongitude: h.longitude,
      homeLatitude: h.latitude,
      mass: inertiaFor(h.band),
      off: { lon: 0, lat: 0 },
      vel: { lon: 0, lat: 0 },
      target: { lon: 0, lat: 0 },
      epoch: 0,
      dwell: 0,                    // s spent settled at the current bit
      age: 0,                      // s since the last retarget (travel + dwell)
      hold: MIN_DWELL * Math.sqrt(inertiaFor(h.band)),
      armed: false
    }));

    let prepared = null;           // { field, peaks } for the last field seen
    let preparedFor = null;
    let guided = false;
    let elapsed = 0;

    function prepare(field) {
      if (!field) return null;
      if (field === preparedFor) return prepared;
      const smooth = smoothField(field);
      prepared = { field: smooth, peaks: findBits(smooth) };
      preparedFor = field;
      return prepared;
    }

    /* Disc coordinates of a bit as seen from a target in offset space. */
    function toDisc(lon, lat) {
      return { u: lon / (TETHER_LON * roam), v: -lat / (TETHER_LAT * roam) };
    }

    /* Pick a bit for a node: weighted by brightness², deterministic per (id, epoch).
       Bits that already hold armed orbs are penalized (spreading), and the bit
       the node is on is excluded (so each retarget is real travel). */
    function retarget(node) {
      node.dwell = 0;
      node.age = 0;
      /* Per-bit hold time: a deterministic spread around the mass-scaled base, so
         orbs that start together do not stop together. */
      node.hold = MIN_DWELL * Math.sqrt(node.mass) * (0.5 + hash01(`${node.id}#hold#${node.epoch}`));
      if (!prepared || !prepared.peaks.length || roam <= 0) {
        node.target = { lon: 0, lat: 0 };
        return;
      }
      const peaks = prepared.peaks;
      const here = toDisc(node.target.lon, node.target.lat);
      const others = nodes.filter(o => o !== node && o.armed);
      const weights = peaks.map(p => {
        const claims = others.reduce((n, o) => {
          const d = toDisc(o.target.lon, o.target.lat);
          return n + (Math.hypot(d.u - p.u, d.v - p.v) < CLAIM_RADIUS ? 1 : 0);
        }, 0);
        const onHere = Math.hypot(here.u - p.u, here.v - p.v) < CLAIM_RADIUS;
        return onHere ? 0 : (p.w * p.w) / (1 + CLAIM_PENALTY * claims);
      });
      const total = weights.reduce((a, b) => a + b, 0);
      if (!(total > 0)) { node.target = { lon: 0, lat: 0 }; return; }
      const pick = hash01(`${node.id}#${node.epoch}`) * total;
      let acc = 0, chosen = peaks[peaks.length - 1];
      for (let i = 0; i < peaks.length; i++) {
        if (weights[i] <= 0) continue;
        acc += weights[i];
        if (pick < acc) { chosen = peaks[i]; break; }
      }
      node.target = { lon: chosen.u * TETHER_LON * roam, lat: -chosen.v * TETHER_LAT * roam };
    }

    function tether(node) {
      if (roam <= 0) { node.off = { lon: 0, lat: 0 }; node.vel = { lon: 0, lat: 0 }; return; }
      const r = Math.hypot(node.off.lon / (TETHER_LON * roam), node.off.lat / (TETHER_LAT * roam));
      if (r > 1) {
        node.off = { lon: node.off.lon / r, lat: node.off.lat / r };
        node.vel = { lon: node.vel.lon / r, lat: node.vel.lat / r };
      }
    }

    function advance(h) {
      const forces = nodes.map(node => {
        const m = node.mass;
        let ax = (SPRING_K * (node.target.lon - node.off.lon) - DAMPING * node.vel.lon) / m;
        let ay = (SPRING_K * (node.target.lat - node.off.lat) - DAMPING * node.vel.lat) / m;
        if (guided && roam > 0) {
          /* Flow steering shapes the path in transit and fades out on arrival, so an
             orb can settle exactly on its bit instead of parking off-target. */
          const dist = Math.hypot(node.target.lon - node.off.lon, node.target.lat - node.off.lat);
          const s = clamp(dist / GUIDE_FADE, 0, 1);
          const fade = s * s * (3 - 2 * s);
          const u = node.off.lon / (TETHER_LON * roam);
          const v = -node.off.lat / (TETHER_LAT * roam);
          const g = gradientField(prepared.field, u, v);
          ax += fade * (GUIDE_GAIN * g.u / (TETHER_LON * roam)) / m;
          ay += fade * (GUIDE_GAIN * -g.v / (TETHER_LAT * roam)) / m;
        }
        return { ax, ay };
      });

      /* soft spacing between neighbours, in absolute sphere coordinates. Only while
         guided: with no guidance every orb glides back to its exact home anchor. */
      for (let i = 0; guided && i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const latA = a.homeLatitude + a.off.lat, latB = b.homeLatitude + b.off.lat;
          const dl = wrapPi((a.homeLongitude + a.off.lon) - (b.homeLongitude + b.off.lon)) * Math.cos((latA + latB) / 2);
          const dt = latA - latB;
          const d = Math.hypot(dl, dt);
          if (d >= REPEL_RADIUS || d < 1e-6) continue;
          const f = REPEL_GAIN * (REPEL_RADIUS - d) / REPEL_RADIUS;
          const fx = f * dl / d, fy = f * dt / d;
          forces[i].ax += fx / a.mass; forces[i].ay += fy / a.mass;
          forces[j].ax -= fx / b.mass; forces[j].ay -= fy / b.mass;
        }
      }

      nodes.forEach((node, i) => {
        node.vel.lon += forces[i].ax * h;
        node.vel.lat += forces[i].ay * h;
        const cap = MAX_SPEED / Math.sqrt(node.mass);
        const speed = Math.hypot(node.vel.lon, node.vel.lat);
        if (speed > cap) { node.vel.lon *= cap / speed; node.vel.lat *= cap / speed; }
        node.off.lon += node.vel.lon * h;
        node.off.lat += node.vel.lat * h;
        tether(node);
        node.age += h;
        const dist = Math.hypot(node.target.lon - node.off.lon, node.target.lat - node.off.lat);
        const settled = dist < ARRIVE_DIST && Math.hypot(node.vel.lon, node.vel.lat) < SETTLE_SPEED;
        node.dwell = settled ? node.dwell + h : 0;
        if (guided && ((settled && node.dwell >= node.hold) || node.age >= MAX_DWELL * Math.sqrt(node.mass))) {
          node.epoch += 1;
          retarget(node);
        }
      });
    }

    /* Advance the placer by dt seconds of simulation time against a flame field
       (or null for no guidance). Returns the placed offsets for this frame. */
    function step(dt, field) {
      const total = clamp(finite(dt) ? dt : 0, 0, MAX_FRAME_DT);
      prepared = prepare(field);
      const nowGuided = !!(prepared && prepared.peaks.length && roam > 0);
      if (nowGuided && !guided) {
        for (const node of nodes) { node.epoch += 1; retarget(node); }
      }
      if (!nowGuided) {
        for (const node of nodes) { node.target = { lon: 0, lat: 0 }; node.dwell = 0; }
      }
      guided = nowGuided;
      if (guided) {
        for (const node of nodes) if (!node.armed) { node.armed = true; retarget(node); }
      }
      let remaining = total;
      while (remaining > 1e-9) {
        const h = Math.min(MAX_SUBSTEP, remaining);
        remaining -= h;
        advance(h);
      }
      elapsed += total;
      return placements();
    }

    /* Placed positions: home plus offset, latitude clamped. */
    function placements() {
      return nodes.map(node => {
        const longitude = wrapPi(node.homeLongitude + node.off.lon);
        const latitude = clamp(node.homeLatitude + node.off.lat, -LAT_LIMIT, LAT_LIMIT);
        const displacement = Math.hypot(node.off.lon * Math.cos(node.homeLatitude), node.off.lat);
        return {
          id: node.id,
          longitude,
          latitude,
          homeLongitude: node.homeLongitude,
          homeLatitude: node.homeLatitude,
          displacement,
          speed: Math.hypot(node.vel.lon, node.vel.lat),
          guided,
          epoch: node.epoch
        };
      });
    }

    function setRoam(value) {
      roam = clamp(finite(value) ? value : roam, 0, 1);
      for (const node of nodes) tether(node);
    }

    /* Return every orb to its home anchor and forget the flame guidance. */
    function reset() {
      for (const node of nodes) {
        node.off = { lon: 0, lat: 0 };
        node.vel = { lon: 0, lat: 0 };
        node.target = { lon: 0, lat: 0 };
        node.epoch = 0;
        node.dwell = 0;
        node.age = 0;
        node.armed = false;
      }
      guided = false;
      prepared = null;
      preparedFor = null;
    }

    return Object.freeze({
      get roam() { return roam; },
      get guided() { return guided; },
      get elapsed() { return elapsed; },
      step,
      placements,
      setRoam,
      reset
    });
  }

  const api = Object.freeze({
    SCHEMA,
    FIELD_N,
    BIT_COUNT,
    TETHER_LON,
    TETHER_LAT,
    LAT_LIMIT,
    MAX_SPEED,
    inertiaFor,
    hash01,
    fieldFromRGBA,
    combineFields,
    smoothField,
    sampleField,
    gradientField,
    findBits,
    createPlacer
  });
  if (typeof window !== "undefined") window.NeoOrbPlacement = api;
  else globalThis.NeoOrbPlacement = api;
})();
