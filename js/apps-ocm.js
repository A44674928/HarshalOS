/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Orb Communicator Model visualization
   "The Orb" (radiative sphere: disc that becomes a sphere) and
   "Interaction Orbs" (non-additive interaction extension).
   Geometry: 0•[orb]•[sector]•[instance] · Center-Origin 0•000•000•0000
   ═══════════════════════════════════════════════════════════════ */

"use strict";

(() => {
  const TAU = Math.PI * 2;
  const D2R = Math.PI / 180;

  const QUAD_COLORS = ["#6fd3ff", "#7a8cff", "#b57cff", "#5ce6a8"];
  const CENTER_COLOR = "#ffd479";
  const SHELL_COLOR = "#4a9eff";
  const LATERAL_COLOR = "#2e5f9e";
  const ORB_COLOR = "#b57cff";

  /* ═══════ mathematically driven geometry ═══════
     Sphere nodes: equal-area (Fibonacci-sphere) latitude lattice —
       φᵢ = S · asin(1 − 2(i + ½)/n),   S = 0.62 (equatorial band)
     uniform in solid angle by construction (cos φ evenly spaced). Longitude stays
     address-derived (0•DDD•000•0000 → θ = DDD·π/180): identity is
     geometry, not enforcement.
     Rotation:  θ(t) = θ₀ + ωt,  ω = 2π/90 s⁻¹   (one revolution / 90 s)
     Breathing: R(t) = R₀·(1 + ε·sin(2πt/T_b)),  ε = 0.015, T_b = 12 s
     Core:      the .flame IFS (wire mode), glow α = 0.22 + 0.78·L(t)
     Surface:   the author's rendered film — 200 frames (0–198 author +
                recovered 199), hard loop 199→0, wrapped (λ,φ) through this
                same camera: I(λ,φ,t) = A⌊12t⌋ mod 200, α = 0.22 + 0.78·L(t) */
  const GOLDEN_SPREAD = 0.62;
  const OMEGA_ROT = TAU / 90;     // rad/s — explicit, time-based (fps-independent)
  const BREATH_EPS = 0.015;
  const BREATH_T = 12;            // seconds
  const R0 = 2.42;

  /* the author's rendered flame film (js/orb-flame.js) — resolved lazily so
     script load order can never kill the skin; absent ⇒ wire mode */
  const filmMod = () => (typeof OrbFilm !== "undefined") ? OrbFilm : null;

  function latFor(i, n) {
    return GOLDEN_SPREAD * Math.asin(Math.max(-1, Math.min(1, 1 - 2 * (i + 0.5) / n)));
  }

  function nodePosition(node, i, n, formation, extraSpin) {
    const lon = node.deg * D2R + extraSpin;
    const lat = latFor(i, n) * ease(formation);
    const rr = node.r;
    return {
      x: rr * Math.cos(lat) * Math.cos(lon),
      y: rr * Math.sin(lat),
      z: rr * Math.cos(lat) * Math.sin(lon)
    };
  }

  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }

  /* ───────────────────────────────────────────────
     Sphere engine — 2D canvas with manual 3D projection
     ─────────────────────────────────────────────── */
  function createOrbEngine(canvas, api) {
    const ctx = canvas.getContext ? canvas.getContext("2d") : null;
    const nodes = OCM_DATA.nodes;
    const n = nodes.length;

    const st = {
      yaw: -0.5,
      pitch: 0.42,
      zoom: 1,
      lastNow: 0,                    // for explicit time-based rotation θ(t) = θ₀ + ωt
      dragging: false,
      lastX: 0, lastY: 0,
      formation: 0,
      formDir: 1,
      animatingForm: false,
      selected: -1,
      hover: -1,
      show: { disc: true, axis: true, spokes: true, shell: true, lateral: true, orbs: true, labels: true, flame: true },
      flame: null,                   // FlamePlayer (the .flame IFS core — wire mode)
      film: null,                    // OrbFilm — the author's rendered surface
      filmReadyAt: 0,                // skin fade-in start (ms)
      pulses: [],
      flare: 0,
      projected: [],
      raf: 0
    };

    const aiNodes = [
      { tag: "AI-0417", lon: 20, lat: 35 },
      { tag: "AI-0912", lon: 150, lat: -20 },
      { tag: "AI-3300", lon: 265, lat: 48 }
    ];

    /* environments without a 2D canvas context get a no-op engine */
    if (!ctx) {
      return {
        state: st,
        selectNode() {}, onSelect() {},
        pulseResolution(i) { return i >= 0 ? i : 0; },
        pulseLateral() { return [0, 1]; },
        animateFormation() {}, setFormation() {}, setToggle() {}
      };
    }

    /* ---------- camera ---------- */
    function project(p) {
      // yaw around Y, pitch around X
      const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
      const cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
      let x = p.x * cy + p.z * sy;
      let z = -p.x * sy + p.z * cy;
      let y = p.y * cp - z * sp;
      z = p.y * sp + z * cp;
      const fov = 7.2 / st.zoom;
      const k = fov / (fov + z);
      return { x: x * k, y: -y * k, k, z };
    }

    function toScreen(p) {
      const s = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.18;
      return { x: canvas.clientWidth / 2 + p.x * s, y: canvas.clientHeight / 2 + p.y * s * 0.92, k: p.k, z: p.z };
    }

    /* ---------- drawing primitives ---------- */
    function arc3D(radius, plane, steps, color, alpha, width, angleFrom, angleTo, rotAngle) {
      // plane: 'eq' (equatorial), 'lat:<phi>', 'mer:<lon>'
      const rot = rotAngle || 0;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= steps; i++) {
        const a = angleFrom + (angleTo - angleFrom) * (i / steps);
        let p;
        if (plane === "eq") {
          p = { x: radius * Math.cos(a + rot), y: 0, z: radius * Math.sin(a + rot) };
        } else if (plane.startsWith("lat:")) {
          const phi = parseFloat(plane.slice(4));
          p = { x: radius * Math.cos(phi) * Math.cos(a + rot), y: radius * Math.sin(phi), z: radius * Math.cos(phi) * Math.sin(a + rot) };
        } else {
          const lon = parseFloat(plane.slice(4)) + rot;
          p = { x: radius * Math.cos(a) * Math.cos(lon), y: radius * Math.sin(a), z: radius * Math.cos(a) * Math.sin(lon) };
        }
        const q = toScreen(project(p));
        if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function line3D(a, b, color, alpha, width, dash) {
      const pa = toScreen(project(a));
      const pb = toScreen(project(b));
      ctx.beginPath();
      if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    function glowDot(sp, r, color, glow) {
      if (glow > 0) {
        const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, r * 4.2);
        g.addColorStop(0, color);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.28 * glow;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r * 4.2, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r, 0, TAU);
      ctx.fillStyle = color;
      ctx.fill();
    }

    /* ---------- frame ---------- */
    function frame() {
      st.raf = requestAnimationFrame(frame);
      if (!document.body.contains(canvas)) { cancelAnimationFrame(st.raf); return; }
      if (canvas.offsetParent === null && canvas.clientWidth === 0) return; // minimized

      // adaptive size
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // explicit rotation θ(t) = θ₀ + ωt (ω = 2π/90 s⁻¹), fps-independent
      const now = performance.now();
      const dt = st.lastNow ? Math.min(0.1, (now - st.lastNow) / 1000) : 0;
      st.lastNow = now;
      if (!st.dragging && !st.animatingForm) st.yaw += OMEGA_ROT * dt;
      if (st.animatingForm) {
        st.formation += 0.006 * st.formDir;
        if (st.formation >= 1) { st.formation = 1; st.animatingForm = false; }
        if (st.formation <= 0) { st.formation = 0; st.animatingForm = false; }
      }

      const f = st.formation;
      // breathing radius R(t) = R₀·(1 + ε·sin(2πt/T_b))
      const tSec = now / 1000;
      const R = R0 * (1 + BREATH_EPS * Math.sin(TAU * tSec / BREATH_T));

      /* Query flame dynamic modulation (energy, pulse, phase) from Demo.flame */
      const fMod = (st.flame && typeof st.flame.flameModulation === "function")
        ? st.flame.flameModulation()
        : { energy: 0.5, pulse: 0, phase: 0, speedMult: 1, active: false };

      /* 0 · flame surface — the author's rendered film, wrapped on the sphere
          through this same camera (rotation, pitch, zoom, breathing). Until the
          film is ready — or when toggled off — the wireframe meridians and
          dynamic flame-modulated components carry the sphere structure instead. */
      const cs0 = toScreen(project({ x: 0, y: 0, z: 0 }));
      const FM = filmMod();
      // Continuous timeline advancement coupled to flame harmonic speed
      if (!st.filmTime) st.filmTime = now;
      const filmDt = st.lastNow ? Math.max(0, Math.min(0.1, (now - st.lastNow) / 1000)) : 0;
      st.filmTime += filmDt * 1000 * (fMod.speedMult || 1);

      const sample = (st.show.flame && st.film && st.film.ready && FM)
        ? st.film.sampleAt(st.filmTime) : null;
      const skinOn = !!(sample && sample.img0);
      if (skinOn) {
        if (!st.filmReadyAt) st.filmReadyAt = now;
        const fade = Math.min(1, (now - st.filmReadyAt) / 900);
        const L = (typeof kernel !== "undefined" && kernel.L) ? Math.max(0, Math.min(1, kernel.L())) : 0;
        const totalAlpha = (0.22 + 0.78 * L) * (0.35 + 0.65 * f) * FM.CFG.alphaMax * (0.25 + 0.75 * fade);
        
        // Equal-energy cosine/sine blend across adjacent sub-frames:
        const frac = sample.frac;
        const a0 = totalAlpha * Math.cos(frac * (Math.PI / 2));
        const a1 = totalAlpha * Math.sin(frac * (Math.PI / 2));

        if (sample.img0 && a0 > 0.01) {
          FM.drawWrapped(ctx, {
            img: sample.img0, project, toScreen, cs: cs0, R,
            fov: 7.2 / st.zoom, alpha: a0, dpr: window.devicePixelRatio || 1
          });
        }
        if (sample.img1 && a1 > 0.01 && frac > 0.002) {
          FM.drawWrapped(ctx, {
            img: sample.img1, project, toScreen, cs: cs0, R,
            fov: 7.2 / st.zoom, alpha: a1, dpr: window.devicePixelRatio || 1
          });
        }
      }

      /* 1 · volumetric wireframe (fades in with formation; hidden while the
          flame surface is burning — the film replaces the wireframe) */
      if (f > 0.02 && !skinOn) {
        for (let m = 0; m < 12; m++) {
          arc3D(R - 0.08, "mer:" + (m * 15) * D2R, 48, "#2b4271", 0.16 * f, 1, -Math.PI / 2, Math.PI / 2);
        }
        for (let la = -60; la <= 60; la += 30) {
          arc3D((R - 0.08) * Math.cos(la * D2R), "lat:" + la * D2R, 64, "#2b4271", 0.16 * f, 1, 0, TAU);
        }
      }

      /* 2 · depth shells (outer shells) — continuous delta-integrated rotation */
      const outerSpeed = fMod.speedMult || 1;
      if (st.outerAngle1 == null) { st.outerAngle1 = 0; st.outerAngle2 = 0; }
      st.outerAngle1 += (dt || 0.016) * 0.25 * outerSpeed;
      st.outerAngle2 -= (dt || 0.016) * 0.18 * outerSpeed;
      const outerRot1 = st.outerAngle1;
      const outerRot2 = st.outerAngle2;
      const outerPulse = fMod.active ? (fMod.pulse * 0.05) : 0;
      const outerAlpha = fMod.active ? (0.20 + 0.10 * fMod.energy) : 0.22;
      [1.15, 1.8].forEach((rr, i) => {
        const shellRot = i === 0 ? outerRot1 : outerRot2;
        const dynamicRadius = rr + (i === 0 ? outerPulse : -outerPulse * 0.8);
        arc3D(dynamicRadius, "lat:" + (i ? 0.5 : -0.42) * 0.9, 64, "#243a63", outerAlpha, 1 + (fMod.active ? fMod.energy * 0.5 : 0), 0, TAU, shellRot);
      });

      /* 3 · the equatorial disc — 360 primary radiative addresses */
      if (st.show.disc) {
        arc3D(R, "eq", 160, "#3a5a8f", 0.5, 1.2, 0, TAU);
        // 360 ticks (1 per degree)
        for (let d = 0; d < 360; d += 2) {
          const a = d * D2R + yaw0();
          const inner = R + 0.02, outer = R + (d % 30 === 0 ? 0.16 : 0.09);
          line3D(
            { x: inner * Math.cos(a), y: 0, z: inner * Math.sin(a) },
            { x: outer * Math.cos(a), y: 0, z: outer * Math.sin(a) },
            quadColor(d), d % 30 === 0 ? 0.85 : 0.4, d % 30 === 0 ? 1.3 : 0.8
          );
        }
        // quadrant arcs
        OCM_DATA.quadrants.forEach((q, qi) => {
          arc3D(R + 0.24, "eq", 32, quadColor(q.from), 0.65, 1.6, q.from * D2R + yaw0(), (q.to + 1) * D2R + yaw0());
        });
      }

      /* 4 · resolution axis — non-sovereign */
      if (st.show.axis) {
        line3D({ x: 0, y: -2.55, z: 0 }, { x: 0, y: 2.55, z: 0 }, CENTER_COLOR, 0.3, 1, [5, 6]);
        const capA = toScreen(project({ x: 0, y: 2.55, z: 0 }));
        const capB = toScreen(project({ x: 0, y: -2.55, z: 0 }));
        ctx.fillStyle = "rgba(255,212,121,0.5)";
        ctx.font = "9px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("RESOLUTION AXIS", capA.x, capA.y - 8);
        ctx.fillText("(NON-SOVEREIGN)", capB.x, capB.y + 16);
      }

      /* 5 · direct attachment spokes — all nodes attach to the center */
      const pos = nodes.map((nd, i) => nodePosition(nd, i, n, f, yaw0()));
      if (st.show.spokes) {
        pos.forEach(p => line3D({ x: 0, y: 0, z: 0 }, p, "#8a6d3a", 0.22, 0.8));
      }

      /* 6 · lateral communication arcs — free, without reauthorization */
      if (st.show.lateral && f > 0.15) {
        const pairs = [[1, 4], [5, 6], [7, 8], [9, 11]];
        pairs.forEach(([a, b]) => {
          const pa = pos[a], pb = pos[b];
          const mid = { x: (pa.x + pb.x) * 0.72, y: (pa.y + pb.y) * 0.72 + 0.45, z: (pa.z + pb.z) * 0.72 };
          bezier3D(pa, mid, pb, LATERAL_COLOR, 0.4);
        });
      }

      /* 7 · interaction orbs — non-additive terms */
      if (st.show.orbs && f > 0.15) {
        [[1, 4], [5, 9]].forEach(([a, b]) => {
          const pa = pos[a], pb = pos[b];
          const mid = { x: (pa.x + pb.x) * 0.62, y: (pa.y + pb.y) * 0.62 + 0.8, z: (pa.z + pb.z) * 0.62 };
          bezier3D(pa, mid, pb, ORB_COLOR, 0.6);
          const sm = toScreen(project(mid));
          glowDot(sm, 5, ORB_COLOR, 1.2);
          ctx.fillStyle = "#d9c2ff";
          ctx.font = "9px ui-monospace, monospace";
          ctx.textAlign = "left";
          ctx.fillText("A↔B", sm.x + 8, sm.y - 6);
        });
      }

      /* 8 · AI inner shell — dynamically modulated by flame harmonics with continuous rotation */
      if (st.show.shell) {
        const innerPulse = fMod.active ? (fMod.pulse * 0.03) : 0;
        const SR = 0.62 + innerPulse;
        const innerAlpha = fMod.active ? (0.28 + 0.14 * fMod.energy) : 0.35;
        const innerSubAlpha = fMod.active ? (0.18 + 0.08 * fMod.energy) : 0.22;
        // Continuous, smooth rotation without angular discontinuities
        if (st.innerAngle == null) st.innerAngle = 0;
        const speed = (fMod.speedMult || 1);
        st.innerAngle += (dt || 0.016) * 0.4 * speed;
        const innerRot = st.innerAngle;
        arc3D(SR, "lat:0", 64, SHELL_COLOR, innerAlpha, 1, 0, TAU, innerRot);
        arc3D(SR, "lat:" + 0.5, 64, SHELL_COLOR, innerSubAlpha, 1, 0, TAU, -innerRot * 0.8);
        arc3D(SR, "mer:0", 48, SHELL_COLOR, innerSubAlpha, 1, -Math.PI / 2, Math.PI / 2, innerRot);
        arc3D(SR, "mer:" + Math.PI / 2, 48, SHELL_COLOR, innerSubAlpha, 1, -Math.PI / 2, Math.PI / 2, -innerRot);
        // anchor
        const anchor = { x: 0, y: SR, z: 0 };
        line3D({ x: 0, y: 0, z: 0 }, anchor, CENTER_COLOR, 0.5, 1.1);
        const sa = toScreen(project(anchor));
        glowDot(sa, 3.2, CENTER_COLOR, 0.8);
        ctx.fillStyle = "rgba(111,211,255,0.75)";
        ctx.font = "8px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.fillText("AI SHELL ANCHOR", sa.x + 7, sa.y + 3);
        aiNodes.forEach((ai, i) => {
          if (ai.spinAngle == null) ai.spinAngle = 0;
          ai.spinAngle += (dt || 0.016) * 0.3 * (i % 2 ? -1 : 1) * outerSpeed;
          const lon = ai.lon * D2R + ai.spinAngle + innerRot;
          const lat = ai.lat * D2R;
          const p = { x: SR * Math.cos(lat) * Math.cos(lon), y: SR * Math.sin(lat), z: SR * Math.cos(lat) * Math.sin(lon) };
          line3D(anchor, p, SHELL_COLOR, 0.3, 0.8);
          const sp = toScreen(project(p));
          glowDot(sp, 2.6, SHELL_COLOR, 0.6);
        });
      }

      /* 9 · radiative nodes (far first) */
      st.projected = [];
      const order = pos.map((p, i) => ({ i, z: project(p).z })).sort((a, b) => b.z - a.z);
      order.forEach(({ i }) => {
        const nd = nodes[i];
        const p = project(pos[i]);
        const sp = toScreen(p);
        const size = 3.2 + p.k * 3.2;
        const color = quadColor(nd.deg);
        const isSel = st.selected === i, isHov = st.hover === i;
        glowDot(sp, isSel || isHov ? size * 1.35 : size, color, isSel ? 1.4 : isHov ? 1 : 0.35);
        if (isSel) {
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, size * 2.1, 0, TAU);
          ctx.strokeStyle = "#ffd479";
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        st.projected.push({ i, x: sp.x, y: sp.y });
        if (st.show.labels && (isSel || isHov)) {
          ctx.fillStyle = "#d9e6f7";
          ctx.font = "10px ui-monospace, monospace";
          ctx.textAlign = "left";
          ctx.fillText(`${nd.name}`, sp.x + size + 6, sp.y - 2);
          ctx.fillStyle = "rgba(255,212,121,0.8)";
          ctx.font = "8px ui-monospace, monospace";
          ctx.fillText(nd.addr, sp.x + size + 6, sp.y + 9);
        }
      });

      /* 10 · center origin */
      const cs = toScreen(project({ x: 0, y: 0, z: 0 }));
      glowDot(cs, 7.5, CENTER_COLOR, 2.2);
      ctx.fillStyle = "#ffe9b8";
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("0•000•000•0000", cs.x, cs.y + 22);
      if (st.flare > 0) {
        ctx.beginPath();
        ctx.arc(cs.x, cs.y, 7.5 + (1 - st.flare) * 34, 0, TAU);
        ctx.strokeStyle = "rgba(255,212,121," + st.flare + ")";
        ctx.lineWidth = 2;
        ctx.stroke();
        st.flare = Math.max(0, st.flare - 0.02);
      }

      /* 11 · pulses: inward resolution dominates lateral coordination.
         For safety and authority invariants, inward resolution to the center
         travels decisively faster than lateral communication.
         Pulse velocity and center flare are modulated by flame harmonic energy. */
      const flameSpeedMult = fMod.active ? (0.9 + 0.2 * fMod.energy) : 1;
      st.pulses = st.pulses.filter(pu => {
        const speed = (pu.kind === "in" ? 0.038 : 0.012) * flameSpeedMult; // inward resolution outpaces lateral by >3×
        pu.t += speed;
        if (pu.t >= 1) {
          if (pu.kind === "in") {
            st.flare = fMod.active ? (0.9 + 0.3 * fMod.energy) : 1;
            if (pu.onArrive) pu.onArrive();
          }
          return false;
        }
        let a, b;
        if (pu.kind === "in") {
          a = pos[pu.from]; b = { x: 0, y: 0, z: 0 };
          const cur = {
            x: a.x + (b.x - a.x) * pu.t,
            y: a.y + (b.y - a.y) * pu.t,
            z: a.z + (b.z - a.z) * pu.t
          };
          const sp = toScreen(project(cur));
          const pSize = 3.8 + (fMod.active ? fMod.energy * 1.2 : 0);
          glowDot(sp, pSize, CENTER_COLOR, 1.6);
        } else {
          a = pos[pu.from]; b = pos[pu.to];
          const mid = {
            x: (a.x + b.x) * 0.72,
            y: (a.y + b.y) * 0.72 + 0.45,
            z: (a.z + b.z) * 0.72
          };
          const t = pu.t, u = 1 - t;
          const cur = {
            x: u * u * a.x + 2 * u * t * mid.x + t * t * b.x,
            y: u * u * a.y + 2 * u * t * mid.y + t * t * b.y,
            z: u * u * a.z + 2 * u * t * mid.z + t * t * b.z
          };
          const sp = toScreen(project(cur));
          glowDot(sp, 3.0, "#6fd3ff", 1.2);
        }
        return true;
      });
    }

    function yaw0() { return st.yaw * 0; } // disc angles are world-fixed; camera rotates
    function quadColor(deg) {
      const q = Math.floor(((deg % 360) + 360) % 360 / 90);
      return QUAD_COLORS[q];
    }

    function bezier3D(a, mid, b, color, alpha) {
      const steps = 24;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        const p = {
          x: u * u * a.x + 2 * u * t * mid.x + t * t * b.x,
          y: u * u * a.y + 2 * u * t * mid.y + t * t * b.y,
          z: u * u * a.z + 2 * u * t * mid.z + t * t * b.z
        };
        const q = toScreen(project(p));
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* ---------- interaction ---------- */
    function pick(mx, my) {
      let best = -1, bd = 22 * 22;
      st.projected.forEach(pt => {
        const dx = pt.x - mx, dy = pt.y - my;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = pt.i; }
      });
      return best;
    }

    canvas.addEventListener("pointerdown", e => {
      st.dragging = true;
      st.lastX = e.clientX; st.lastY = e.clientY;
      st.downX = e.clientX; st.downY = e.clientY;
      canvas.classList.add("dragging");
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* optional */ }
    });
    canvas.addEventListener("pointermove", e => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (st.dragging) {
        st.yaw += (e.clientX - st.lastX) * 0.006;
        st.pitch = Math.max(-1.25, Math.min(1.25, st.pitch + (e.clientY - st.lastY) * 0.005));
        st.lastX = e.clientX; st.lastY = e.clientY;
      } else {
        st.hover = pick(mx, my);
        canvas.style.cursor = st.hover >= 0 ? "pointer" : "grab";
      }
    });
    canvas.addEventListener("pointerup", e => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const moved = Math.hypot(e.clientX - (st.downX ?? e.clientX), e.clientY - (st.downY ?? e.clientY));
      if (moved < 5) {
        const hit = pick(mx, my);
        if (hit >= 0) selectNode(hit);
      }
      st.dragging = false;
      canvas.classList.remove("dragging");
    });
    canvas.addEventListener("pointerleave", () => { st.hover = -1; });
    canvas.addEventListener("wheel", e => {
      e.preventDefault();
      st.zoom = Math.max(0.65, Math.min(1.7, st.zoom * (e.deltaY > 0 ? 0.93 : 1.075)));
    }, { passive: false });

    /* ---------- selection ---------- */
    let selectCb = null;
    function selectNode(i) {
      st.selected = i;
      if (selectCb) selectCb(i);
    }

    /* ---------- pulses (animation only — witnessing happens at the app layer) ---------- */
    function pulseResolution(fromIdx) {
      const from = fromIdx >= 0 ? fromIdx : Math.floor(Math.random() * n);
      st.pulses.push({ kind: "in", from, t: 0, onArrive: null });
      return from;
    }

    function pulseLateral() {
      const a = Math.floor(Math.random() * n);
      let b = Math.floor(Math.random() * n);
      if (b === a) b = (b + 3) % n;
      st.pulses.push({ kind: "lat", from: a, to: b, t: 0, onArrive: null });
      return [a, b];
    }

    /* ---------- lifecycle ---------- */
    st.raf = requestAnimationFrame(frame);

    return {
      state: st,
      selectNode,
      onSelect(cb) { selectCb = cb; if (st.selected >= 0) cb(st.selected); },
      pulseResolution,
      pulseLateral,
      animateFormation() {
        st.formDir = st.formation >= 1 ? -1 : 1;
        if (st.formation >= 1) {
          st.formation = 1;
          st.formDir = -1; // sweep back to disc first
        }
        st.animatingForm = true;
        setTimeout(() => {
          if (st.animatingForm && st.formation <= 0.02) {
            st.formDir = 1;
          }
        }, 2600);
      },
      setFormation(v) { st.formation = v; },
      setToggle(key, val) { st.show[key] = val; },
      setFlame(p) { st.flame = p; },
      setFilm(f) { st.film = f; },
      getFilmTime() { return st.filmTime || performance.now(); },
      setFlameSpeed(s) {
        if (st.flame && typeof st.flame.setSpeed === "function") {
          return st.flame.setSpeed(s);
        }
        return s;
      }
    };
  }

  /* ═══════════════════════════════════════════════════════════
     APP 1 — THE OCB (The Orb): the sphere
     ═══════════════════════════════════════════════════════════ */
  function registerOrbApp() {
    APPS.push({
      id: "ocm",
      title: "The Orb",
      short: "The Orb",
      glyph: "◉",
      desc: "OCM visualization — the disc that becomes a sphere",
      w: 860, h: 640,
      render(body, api) {
        body.innerHTML = `
          <div class="h1">The Orb — Orb Communicator Model</div>
          <div class="sub">A radiative, center-origin communication and governance system in which all participants
          derive identity, scope, and ownership from a single immutable origin point. HarshalOS itself, visualized
          through OCM: every app is a radiative node attached directly to the center.</div>

          <div class="addr-key">CENTER-ORIGIN 0•000•000•0000 &nbsp;·&nbsp; FORMAT 0•[orb]•[sector]•[instance] &nbsp;·&nbsp; AUTHOR A44674928 @ 0•000•000•0000</div>

          <div class="chip-row" id="ocm-chips">
            <button class="chip-toggle on" data-t="disc">EQUATORIAL DISC · 360 ADDRESSES</button>
            <button class="chip-toggle on" data-t="spokes">DIRECT ATTACHMENT</button>
            <button class="chip-toggle on" data-t="axis">RESOLUTION AXIS</button>
            <button class="chip-toggle on" data-t="shell">AI INNER SHELL</button>
            <button class="chip-toggle on" data-t="lateral">LATERAL COMMS</button>
            <button class="chip-toggle on" data-t="orbs">INTERACTION ORBS</button>
            <button class="chip-toggle on" data-t="flame">FLAME SURFACE · AUTHOR FILM</button>
          </div>
          <div class="ocm-math mono" id="ocm-math">
            θ(t) = θ₀ + (2π/90)·t &nbsp;·&nbsp; R(t) = R₀(1 + 0.015·sin 2πt/12) &nbsp;·&nbsp; φᵢ = 0.62·asin(1 − 2(i+½)/n) &nbsp;·&nbsp; surface: A⌊12t⌋ mod 200
          </div>

          <div class="ocm-stage">
            <div class="ocm-canvas-wrap">
              <canvas id="ocm-canvas"></canvas>
              <div class="ocm-hud-corner">
                RADIATIVE SPHERE OF INFLUENCE<br>
                NODES: 12 RADIATIVE · 3 AI (INNER SHELL) · 1 CENTER<br>
                SURFACE: AUTHOR FLAME FILM — <span id="ocm-film-stat">loading…</span><br>
                HARMONIC MODULATOR: .FLAME IFS — <span id="ocm-flame-stat">.flame loading…</span><br>
                DRAG TO ORBIT · SCROLL TO ZOOM · CLICK A NODE
              </div>
              <div class="ocm-hint mono">THE DISC DEFINES EVERYTHING THAT CAN MATTER</div>
            </div>
            <div class="ocm-side">
              <div class="ocm-inspector" id="ocm-inspector"></div>
              <div class="quad-key">
                <span><i style="background:#6fd3ff"></i>0°–89° CREATION / EMERGENCE</span>
                <span><i style="background:#7a8cff"></i>90°–179° STABILIZATION / CIVILIZATION</span>
                <span><i style="background:#b57cff"></i>180°–269° TRANSFORMATION / INDUSTRY</span>
                <span><i style="background:#5ce6a8"></i>270°–359° RENEWAL / EXPLORATION</span>
              </div>
            </div>
          </div>

          <div class="slider-row">
            <label>Rotation / time →</label>
            <input type="range" id="ocm-form" min="0" max="1" step="0.01" value="1">
            <span class="val" id="ocm-formv">1.00</span>
          </div>
          <div class="slider-cap">360 primary addresses form a complete disc (0•DDD•000•0000). Rotation over time + depth
          (distance, 0•DDD•RRR•####) produces the sphere. Once instantiated, the sphere persists even if rotation pauses.</div>

          <div class="slider-row" style="margin-top:14px">
            <label>Harmonic Modulator Speed →</label>
            <input type="range" id="ocm-flame-spd" min="0.1" max="4.0" step="0.1" value="1.0">
            <span class="val" id="ocm-flame-spdv">1.0×</span>
          </div>
          <div class="slider-cap">Controls the frequency of the underlying .flame IFS IFS attractor cycle, governing inner/outer shell orbital velocities, harmonic respiration, and pulse dynamics.</div>

          <div class="btn-row">
            <button class="btn btn-gold" id="ocm-reform">↻ RE-FORM SPHERE (DISC → SPHERE)</button>
            <button class="btn btn-ice" id="ocm-res">⟶ RESOLUTION PULSE (INWARD)</button>
            <button class="btn" id="ocm-lat">↔ LATERAL PULSE</button>
          </div>

          <div class="h2">Core Axioms</div>
          <table class="table">
            <tr><th>Axiom</th><th>Statement</th></tr>
            ${OCM_DATA.axioms.map(([t, d]) => `<tr><td>${t}</td><td>${d}</td></tr>`).join("")}
          </table>

          <div class="h2">Distance Semantics</div>
          <div class="grid-2">
            <div class="card"><h4>DISTANCE REPRESENTS</h4>
              <ul class="ul" style="margin:0">${OCM_DATA.distance.is.map(x => `<li class="li">${x}</li>`).join("")}</ul></div>
            <div class="card"><h4>DISTANCE DOES NOT REPRESENT</h4>
              <ul class="ul" style="margin:0">${OCM_DATA.distance.isNot.map(x => `<li class="li refusal">${x}</li>`).join("")}</ul></div>
          </div>
          <p class="body">${OCM_DATA.distance.note}</p>

          <div class="h2">Ownership &amp; Failure Modes</div>
          <div class="rule-box ice">${OCM_DATA.quotes.ownership}</div>
          <ul class="ul">
            <li class="li">Duplicate centers are detectable via prefix collision — conflicting systems are invalidated.</li>
            <li class="li">Rogue nodes cannot claim ownership without an origin prefix; they may be isolated without disrupting the orb.</li>
            <li class="li">Partial collapse is local — failures do not propagate unless routed through the center.</li>
          </ul>

          <div class="h2">Comparative Models</div>
          <table class="table">
            <tr><th>Model</th><th>Root</th><th>Lateral Comms</th><th>Ownership Proof</th></tr>
            ${OCM_DATA.models.map(([a, b, c, d]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td><td class="${a === "OCM" ? "good" : ""}">${d}</td></tr>`).join("")}
          </table>

          <div class="rule-box">${OCM_DATA.quotes.mentalModel}<br><br>${OCM_DATA.quotes.sphere}</div>
          <div class="rule-box ice">${OCM_DATA.quotes.closing}</div>

          <div class="footer-note">
            360 RADIATIVE ADDRESSES REPRESENT FULL DIRECTIONAL COVERAGE · UNLIMITED SUB-INSTANCING BENEATH EACH ADDRESS ·
            GLOBAL STAKEHOLDER INCLUSION WITHOUT ROOT FRAGMENTATION. THE ORB IS COMPLETE WHEN ALL DIRECTIONAL ADDRESSES
            ARE INSTANTIATED OR RESERVED.
          </div>`;

        const canvas = body.querySelector("#ocm-canvas");
        const engine = createOrbEngine(canvas, api);
        window.OCM_ENGINE = engine; /* debug/automation hook */

        // the flame core — shared .flame IFS player (one bake/preload serves orb + flame app)
        if (typeof FractalFlame !== "undefined") {
          const flame = FractalFlame.shared("assets/Demo.flame", { w: 160, h: 160 });
          const statEl = body.querySelector("#ocm-flame-stat");
          const setStat = (i, total) => {
            if (statEl) {
              const verb = flame.mode === "preload" ? "loading slices" : "baking";
              statEl.textContent = `${verb} ${i}/${total}…`;
            }
          };
          flame.onprogress = setStat;
          flame.onerror = (e) => { if (statEl) statEl.textContent = "unavailable — " + (e && e.message ? e.message : "load failed"); };
          engine.setFlame(flame);
          if (flame.ready) { /* boot bake already finished */ }
          else if (flame.baking) { flame.start(); }       // in flight — handlers just attached
          else flame.retry();                              // boot load failed before handlers existed → re-arm
          const iv = setInterval(() => {
            if (!document.body.contains(body)) { clearInterval(iv); return; }
            if (!statEl) return;
            if (flame.ready) statEl.textContent = `live · Demo.flame · frame ${Math.floor(flame.current) + 1}/${flame.frames.length} · ${flame.speed}×`;
            else if (!flame.baking) statEl.textContent = "unavailable";
          }, 40);
        }

        // the flame surface — the author's rendered film (one shared film)
        const filmStat = body.querySelector("#ocm-film-stat");
        if (typeof OrbFilm !== "undefined") {
          const film = OrbFilm.shared();
          engine.setFilm(film);
          film.start();
          film.onprogress = (n, total) => { if (filmStat) filmStat.textContent = `loading ${n}/${total}`; };
          film.onready = () => { if (filmStat) filmStat.textContent = "live · 200 frames · hard loop"; };
          film.onerror = (e) => { if (filmStat) filmStat.textContent = "unavailable — " + (e && e.message ? e.message : "load failed"); };
          const fiv = setInterval(() => {
            if (!document.body.contains(body)) { clearInterval(fiv); return; }
            if (!filmStat || !film.ready) return;
            const curTime = engine.getFilmTime ? engine.getFilmTime() : performance.now();
            filmStat.textContent = `live · frame ${film.frameAt(curTime) + 1}/200 · bounce`;
          }, 40);
        }

        // inspector
        const inspector = body.querySelector("#ocm-inspector");
        const drawInspector = (i) => {
          if (i == null || i < 0) {
            const fp = (typeof FractalFlame !== "undefined") ? FractalFlame.shared() : null;
            const fs = fp && fp.meta ? `${fp.meta.frames} frames · ${fp.meta.xformsMin}–${fp.meta.xformsMax} xforms` : "—";
            inspector.innerHTML = `
              <div class="oi-name">Center (Origin)</div>
              <div class="oi-addr">0•000•000•0000</div>
              <div class="oi-about">The immutable address from which all identities, permissions, and ownership
              are derived. It cannot be duplicated, delegated, or overridden. Click any radiative node in the
              sphere to inspect its address lineage.</div>
              <div class="oi-math">
                <div class="oi-math-t">DRIVING EQUATIONS — THE ORB IS MATHEMATICS</div>
                <div>rotation&nbsp;&nbsp; θ(t) = θ₀ + ωt,&nbsp; ω = 2π/90 s⁻¹</div>
                <div>breathing&nbsp;&nbsp; R(t) = R₀·(1 + 0.015·sin(2πt/12))</div>
                <div>latitudes&nbsp;&nbsp; φᵢ = 0.62·asin(1 − 2(i+½)/n) — equal-area lattice, uniform in solid angle</div>
                <div>longitudes&nbsp; λᵢ = Dᵢ·π/180 — address-derived (0•DDD•000•0000)</div>
                <div>surface&nbsp;&nbsp; I(λ,φ,t) = A⌊t·12⌋ mod 200 — the author's rendered film, wrapped on the sphere by this camera</div>
                <div>wire core&nbsp;&nbsp; p′ = Σᵢ wᵢ·Nᵢ(A·p + t),&nbsp; k ~ geometric(w) — live .flame IFS modulation</div>
                <div>harmonic modulation&nbsp; inner/outer shells &amp; radial pulses coupled to Demo.flame energy</div>
                <div>legitimacy&nbsp; α_flame = 0.22 + 0.78·L(t) — the fire answers to legitimacy</div>
                <div class="oi-math-src">author render · 200 frames (0–198 + recovered 199) · hard loop · flame harmonic modulator: Demo.flame · Apophysis 7x</div>
              </div>
              <div class="oi-why">SINGLE-ORIGIN AXIOM · EVERY VALID ADDRESS DERIVES FROM EXACTLY ONE CENTER POINT</div>`;
            return;
          }
          const nd = OCM_DATA.nodes[i];
          const deg = nd.deg;
          const cluster = OCM_DATA.clusters.find(c => deg >= c.from && deg <= c.to);
          const meaning = OCM_DATA.degrees[deg] || OCM_DATA.degrees[((deg % 360) + 360) % 360];
          inspector.innerHTML = `
            <div class="oi-name">${nd.name}</div>
            <div class="oi-addr">${nd.addr}</div>
            <div class="oi-deg">${String(deg).padStart(3, "0")}° — ${meaning}</div>
            <div class="oi-about">${nd.note}</div>
            <div class="oi-about"><strong style="color:var(--text)">${cluster.name}</strong> — ${cluster.about}</div>
            <div class="oi-why">
              SECTOR: ${nd.sector} · DISTANCE R = ${nd.r.toFixed(2)}<br>
              OWNERSHIP: DERIVED FROM CENTER · PREFIX INTACT<br>
              ${OCM_DATA.center.freshSlateFormat.replace("DDD", String(deg).padStart(3, "0")).replace("RRR", String(Math.round(nd.r * 100)).padStart(3, "0")).replace("####", nd.addr.split("•")[3] || "0001")}
            </div>
            <div class="btn-row" style="margin:10px 0 0">
              <button class="btn btn-ice" id="ocm-open-app">OPEN ${nd.name.toUpperCase()}</button>
            </div>`;
          const openBtn = inspector.querySelector("#ocm-open-app");
          if (openBtn) openBtn.addEventListener("click", () => {
            const app = APPS.find(a => a.id === nd.app);
            if (app) api.openApp(app);
          });
        };
        engine.onSelect(drawInspector);
        drawInspector(-1);

        // chips
        body.querySelectorAll("#ocm-chips [data-t]").forEach(ch => {
          ch.addEventListener("click", () => {
            const on = ch.classList.toggle("on");
            engine.setToggle(ch.dataset.t, on);
          });
        });

        // formation slider
        const form = body.querySelector("#ocm-form");
        form.addEventListener("input", () => {
          engine.setFormation(parseFloat(form.value));
          body.querySelector("#ocm-formv").textContent = parseFloat(form.value).toFixed(2);
        });

        // harmonic modulator speed slider
        const flameSpd = body.querySelector("#ocm-flame-spd");
        const flameSpdv = body.querySelector("#ocm-flame-spdv");
        if (flameSpd) {
          flameSpd.addEventListener("input", () => {
            const val = parseFloat(flameSpd.value);
            engine.setFlameSpeed(val);
            if (flameSpdv) flameSpdv.textContent = val.toFixed(1) + "×";
          });
        }

        body.querySelector("#ocm-reform").addEventListener("click", () => {
          engine.setFormation(0);
          form.value = 0;
          setTimeout(() => {
            const t0 = performance.now();
            const step = () => {
              const v = Math.min(1, (performance.now() - t0) / 3800);
              engine.setFormation(v);
              form.value = v;
              body.querySelector("#ocm-formv").textContent = v.toFixed(2);
              if (v < 1) requestAnimationFrame(step);
              else kernel.record("info", "OCM — sphere re-formed from disc: 360 primary addresses, rotation over time + depth.");
            };
            requestAnimationFrame(step);
          }, 450);
          api.toast("info", "DISC → SPHERE", "Rotation over time + depth (distance) produces the sphere. The disc defines everything that can matter; rotation gives it history; distance gives it depth; the center gives it reality.");
        });

        body.querySelector("#ocm-res").addEventListener("click", () => {
          const from = engine.pulseResolution(engine.state.selected);
          const nd = OCM_DATA.nodes[from];
          kernel.record("info", `OCM — resolution routed to center from ${nd.addr}. Resolution always routes to the center point.`);
          api.toast("info", "RESOLUTION → CENTER",
            `${nd.name} (${nd.addr}) resolves inward to 0•000•000•0000. In the event of conflict, ambiguity, or dispute — resolution always routes to the center point.`);
        });
        body.querySelector("#ocm-lat").addEventListener("click", () => {
          const [a, b] = engine.pulseLateral();
          kernel.record("info", `OCM — lateral communication ${OCM_DATA.nodes[a].addr} ↔ ${OCM_DATA.nodes[b].addr} (no reauthorization required; ownership non-transfer).`);
          api.toast("info", "LATERAL COMMUNICATION",
            `${OCM_DATA.nodes[a].name} ↔ ${OCM_DATA.nodes[b].name}. Nodes may communicate freely — but communication does not confer ownership, authority, or origin rights.`);
        });
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════
     APP 2 — INTERACTION ORBS (non-additive extension)
     ═══════════════════════════════════════════════════════════ */
  function makeStepper(host, steps, onStep) {
    let idx = 0;
    const draw = () => {
      host.querySelector(".st-kicker").textContent = `STEP ${idx + 1} / ${steps.length}`;
      host.querySelector(".st-title").textContent = steps[idx][0];
      host.querySelector(".st-body").textContent = steps[idx][1];
      host.querySelectorAll(".step-dots i").forEach((d, i) => d.classList.toggle("on", i === idx));
      if (onStep) onStep(idx);
    };
    host.querySelector("[data-prev]").addEventListener("click", () => {
      idx = (idx - 1 + steps.length) % steps.length;
      draw();
    });
    host.querySelector("[data-next]").addEventListener("click", () => {
      idx = (idx + 1) % steps.length;
      draw();
    });
    draw();
  }

  function registerInteractionApp() {
    APPS.push({
      id: "orbs",
      title: "Interaction Orbs",
      short: "Interaction Orbs",
      glyph: "◈",
      desc: "Non-additive interaction — the interaction itself is counted",
      w: 760, h: 600,
      render(body) {
        const A = OCM_DATA.arithmetic;
        const X1 = OCM_DATA.example1;
        const X2 = OCM_DATA.example2;

        body.innerHTML = `
          <div class="h1">Interaction Orbs — Non-Additive Extension</div>
          <div class="sub">When interaction itself becomes a first-class carrier of meaning. OCM is not a metaphor
          layer — it is an ontological traffic controller inside AGS++ that governs how frames are admitted,
          stabilized, navigated, and exited when interactions generate more structure than their components alone.</div>

          <div class="rule-box gas">${A.definition}</div>

          <div class="h2">OCM Arithmetic — the interaction itself is counted</div>
          <div class="arith-hero">
            <div class="arith-unit"><div class="au-orb a"></div><div class="au-label">NODE A</div><div class="au-val">1</div></div>
            <div class="arith-op">+</div>
            <div class="arith-unit"><div class="au-orb b"></div><div class="au-label">NODE B</div><div class="au-val">1</div></div>
            <div class="arith-op">+</div>
            <div class="arith-unit"><div class="au-orb link"></div><div class="au-label">A↔B INTERACTION ORB</div><div class="au-val">1</div></div>
            <div class="arith-op">=</div>
            <div class="arith-unit total"><div class="au-orb link" style="background:radial-gradient(circle at 32% 30%, #fff3d8, var(--gold) 45%, #7a5a1c)"></div><div class="au-label">TOTAL</div><div class="au-val">3</div></div>
          </div>
          <div class="rule-box">CLASSICAL: A + B = 2 &nbsp;&nbsp;·&nbsp;&nbsp; OCM: A = 1, B = 1, A↔B = 1, TOTAL = 3
${A.bookkeeping}</div>

          <div class="h2">Worked Micro-Example I — Constraint Violation</div>
          <div class="step-box" id="step1">
            <div class="st-kicker"></div>
            <div class="st-title"></div>
            <div class="st-body"></div>
            <div id="bars1"></div>
            <div class="step-nav">
              <button class="btn" data-prev>◂ PREV</button>
              <button class="btn btn-ice" data-next>NEXT ▸</button>
              <div class="step-dots">${X1.steps.map(() => "<i></i>").join("")}</div>
            </div>
          </div>

          <div class="h2">Worked Micro-Example II — Conversational Alignment</div>
          <div class="step-box" id="step2">
            <div class="st-kicker"></div>
            <div class="st-title"></div>
            <div class="st-body"></div>
            <div class="step-nav">
              <button class="btn" data-prev>◂ PREV</button>
              <button class="btn btn-ice" data-next>NEXT ▸</button>
              <div class="step-dots">${X2.steps.map(() => "<i></i>").join("")}</div>
            </div>
          </div>

          <div class="h2">Communication Occurs Across Three Layers</div>
          <div class="grid-2">
            ${A.layers.map(([t, d], i) => `
              <div class="card"><h4>${i + 1} · ${t.toUpperCase()}</h4><p>${d}</p></div>`).join("")}
          </div>

          <div class="h2">Navigation Rules &amp; Exit Protocol</div>
          <ul class="ul">
            ${A.navigation.map(r => `<li class="li">${r}</li>`).join("")}
          </ul>
          <ul class="ul">
            ${A.exit.map(r => `<li class="li gold">${r}</li>`).join("")}
          </ul>

          <div class="h2">Classical Communication vs Orb Communicator Mode</div>
          <table class="table">
            <tr><th></th><th>Classical</th><th>Orb Communicator Mode</th></tr>
            ${OCM_DATA.comparison.map(([k, a, b]) => `<tr><td>${k}</td><td>${a}</td><td class="good">${b}</td></tr>`).join("")}
          </table>

          <div class="rule-box gas">WHEN INTERACTIONS GENERATE EXCESS STRUCTURE, OCM COUNTS AND REASONS OVER THAT STRUCTURE DIRECTLY.
THIS ENABLES AGS++ TO OPERATE IN DOMAINS WHERE CLASSICAL ADDITION FAILS, WITHOUT LOSING RIGOR, SAFETY, OR CLARITY.</div>

          <div class="footer-note">
            THE SYSTEM DOES NOT ENDORSE EMPIRICAL TRUTH CLAIMS — IT PRESERVES COHERENCE.
            PARADOX IS TREATED AS A SIGNAL THAT AN INTERACTION ORB IS PRESENT, NOT AS ERROR.
          </div>`;

        const barsHost = body.querySelector("#bars1");
        const drawBars = (stepIdx) => {
          if (stepIdx < 1) { barsHost.innerHTML = ""; return; }
          const max = 75;
          barsHost.innerHTML = X1.bars.map(b => `
            <div class="bar-row">
              <span>${b.label}</span>
              <div class="bar-track"><div class="bar-fill ${b.color}" style="width:${(b.value / max) * 100}%"></div></div>
              <span>${b.value}%</span>
            </div>`).join("") + `
            <div class="rule-box ice" style="margin-top:10px">EXPECTED LINEAR BOUND ≤ 50% · OBSERVED 75% ·
EXCESS 25% ATTRIBUTED TO THE A↔B INTERACTION ORB — NOT TO THE PARTS.</div>`;
        };

        makeStepper(body.querySelector("#step1"), X1.steps, drawBars);
        makeStepper(body.querySelector("#step2"), X2.steps);
      }
    });
  }

  /* ---------- register: place near the top of the app list ---------- */
  registerOrbApp();
  registerInteractionApp();
  const orbIdx = APPS.findIndex(a => a.id === "ocm");
  const [orbApp] = APPS.splice(orbIdx, 1);
  APPS.splice(1, 0, orbApp);
  const ixIdx = APPS.findIndex(a => a.id === "orbs");
  const [ixApp] = APPS.splice(ixIdx, 1);
  APPS.splice(2, 0, ixApp);
})();
