/* ═══════════════════════════════════════════════════════════════
   HarshalOS — NEO ORB app (js/apps-neo-orb.js)
   Orb 2 × The Orb, for the browser.

   · Flame guidance — the author's two .flame engines (Demo.flame and
     OuterOrb.flame, the shared FractalFlame players) are READ, never drawn.
     Their bitmaps become a density field; js/neo-orb-placement.js turns the
     bright bits into targets and steers each orb toward them, so orbs move
     smoothly from bit to bit. No flame pixel reaches the screen.
   · Orb 2 layer — the 52-asset Good Intelligence roster as display-only orbs,
     placed by js/neo-orb-model.js (symbol-hash sector as home, logarithmic
     market-cap band as inertia, and the depth through the six envelopes as radius, berth separation). The roster is a
     static snapshot, not a quote feed: no live beats, no provider call, no route.

   Boundary: display only. NEO ORB reads no kernel, gate, ledger, declaration,
   or personal core. Phase is a display rotation offset chosen by the viewer,
   never a declared state. Nothing here ranks, recommends, or authorizes.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

(() => {
  const TAU = Math.PI * 2;
  const WORLD_R = 2.42;                // The Orb's sphere radius (world units)
  const FOV = 7.2;                     // The Orb's camera constant
  const OMEGA = TAU / 90;              // one revolution per 90 s — The Orb's cadence
  const BREATH_EPS = 0.015;            // The Orb's breathing amplitude
  const BREATH_T = 12;                 // seconds
  const BEAT_EPS = 0.04;               // Orb 2 bounded ±4 % radial motion
  const BEAT_T = 7;                    // seconds per beat, per-node phase offset
  const GUIDE_EVERY_MS = 100;          // how often the flame bitmaps are re-read
  const GUIDE_SIZE = 40;               // flame bitmap sampling resolution (cells per side)
  const GUIDE_WEIGHT = Object.freeze({ inner: 0.6, outer: 0.4 });
  const PHASE_SHIFT = Object.freeze({ NAB: 0, CWO: Math.PI / 3, GSRB: (2 * Math.PI) / 3 });
  const KIND_COLOR = Object.freeze({ structural: "#6fd3ff", field: "#b57cff", interaction: "#5ce6a8" });
  const KIND_NAME = Object.freeze({ structural: "Structural", field: "Field", interaction: "Interaction" });
  /* Blue and yellow are reserved for market state on the orbs, so the centre marker and the
     band rings use neutral tones. */
  const CENTER_COLOR = "#e8f1ff";
  const BAND_COLOR = "#7d93b8";
  /* One stored read of NEO ORB's own field route, at most this often. js/neo-orb-field.js owns
     whether the feed is open at all; the app follows that switch fail-closed (feedCut()). */
  const MARKET_EVERY_MS = 20000;
  const MARKET_CUT_MESSAGE = "NEO ORB reads no market feed, so every orb stays neutral on its band shell.";
  /* The instability extension settles on wall-clock time, not the display clock: a new
     stored reading glides an orb out to its radius instead of teleporting it, and a paused
     or reduced-motion view snaps straight to the reading instead of animating. */
  const EXTENSION_TAU = 1.2;           // s to ~63% of the way to a new extension
  const FIT_TAU = 0.6;                 // s to ~63% of the way to a new view scale
  const MIN_FIT = 0.55;                // the view never zooms out past this
  const MARKET_CUT_STATUS = `cut — ${MARKET_CUT_MESSAGE}`;
  const SHAPE_RETRY_MS = 250;          // how soon a refused shape is retried (a refusal costs one frame, not the display)
  const NEUTRAL_FILL = "#8fa3c0";      // no data, flat, or equal to basis
  const ORIGIN_ADDRESS = "0•000•000•0000";
  const DEFAULTS = Object.freeze({
    formation: 1,
    axes: Object.freeze({ x: 1.10, y: 0.84, z: 1.18 }),
    berth: 1,
    speed: 1,
    nodeScale: 1,
    roam: 0.8,
    phase: "NAB",
    layers: Object.freeze({
      orbs: true, placement: true,
      labels: false, attachments: true, bands: true, beat: true
    })
  });
  /* slider bounds — every dial is clamped on load and on change */
  const RANGES = Object.freeze({
    formation: [0, 1], "axes.x": [0.25, 2], "axes.y": [0.25, 2], "axes.z": [0.25, 2],
    berth: [0, 1], speed: [0, 3], nodeScale: [0.5, 2], roam: [0, 1]
  });
  const LAYER_ROWS = Object.freeze([
    ["orbs", "Orb 2 roster orbs"],
    ["placement", "Flame-guided placement"],
    ["labels", "Ticker labels"],
    ["attachments", "Center attachments"],
    ["bands", "Log bands & meridians"],
    ["beat", "Beat motion (±4 %)"]
  ]);

  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
  const fmtPct = value => `${Math.round(value * 100)}%`;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]));

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  function model() {
    if (typeof window !== "undefined" && window.NeoOrbModel) return window.NeoOrbModel;
    return (typeof NeoOrbModel !== "undefined") ? NeoOrbModel : null;
  }

  function roster() {
    const r = (typeof window !== "undefined") ? window.GoodIntelligenceMarketRoster : null;
    return r && Array.isArray(r.assets) ? r : null;
  }

  function extensionModule() {
    if (typeof window !== "undefined" && window.MarketExtension) return window.MarketExtension;
    return (typeof MarketExtension !== "undefined") ? MarketExtension : null;
  }

  function signalsModule() {
    if (typeof window !== "undefined" && window.NeoOrbSignals) return window.NeoOrbSignals;
    return (typeof NeoOrbSignals !== "undefined") ? NeoOrbSignals : null;
  }

  function placerModule() {
    if (typeof window !== "undefined" && window.NeoOrbPlacement) return window.NeoOrbPlacement;
    return (typeof NeoOrbPlacement !== "undefined") ? NeoOrbPlacement : null;
  }

  /* Index of the flame frame nearest the player's playhead (ping-pong aware). */
  function frameIndexOf(player) {
    const len = player.frames.length;
    const ph = typeof player.playhead === "function" ? player.playhead() : null;
    const cur = ph ? ph.cur : (player.current || 0);
    return clamp(Math.round(cur), 0, len - 1);
  }

  function flameEngines() {
    if (typeof FractalFlame === "undefined") return { inner: null, outer: null };
    return {
      inner: FractalFlame.shared("assets/Demo.flame", { w: 160, h: 160 }),
      outer: FractalFlame.shared("assets/OuterOrb.flame", { w: 160, h: 160 })
    };
  }

  /* Chain — never replace — another consumer's callback on a shared player. */
  function chain(player, key, handler) {
    if (!player) return;
    const previous = player[key];
    player[key] = (...args) => {
      try { handler(...args); } finally { if (typeof previous === "function") previous(...args); }
    };
  }

  /* One Status line for the frame: what it drew, or what it refused and kept drawing past. */
  function frameNote(errors) {
    if (errors.frame) return `error — ${errors.frame} · the display keeps running`;
    if (errors.shape) return `shape refused — ${errors.shape} · last good shape drawn`;
    return "ok";
  }

  function playerStatus(player, label, error) {
    if (!player) return "unavailable — flame engine not loaded";
    if (player.ready && player.frames.length) {
      return `live · ${label} · frame ${Math.floor(player.current) + 1}/${player.frames.length}`;
    }
    if (error) return `unavailable — ${error}`;
    if (player.baking) return "loading…";
    return "waiting…";
  }

  /* ─────────────────────────────────────────────────────────────
     Engine — owns the canvas, the clock, the shape cache, and input.
     ───────────────────────────────────────────────────────────── */
  class NeoOrbEngine {
    constructor(body) {
      this.body = body;
      this.state = cloneDefaults();
      this.state.paused = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.clock = 0;                      // seconds of motion (paused freezes it)
      this.baseYaw = 0;
      this.pitch = 0.32;
      this.drag = null;
      this.selectedId = null;
      this.hoveredId = null;
      this.screenNodes = [];
      this.shape = null;
      this.dirty = true;
      this.lastShapeAttempt = -Infinity;
      this.lastTick = null;
      this.lastReadout = 0;
      this.stopped = false;
      this.errors = { inner: null, outer: null, guide: null, shape: null, frame: null };
      this.placements = null;              // placed offsets for this frame, or null = home
      this.guide = null;                   // combined flame density field, or null
      this.lastGuideAt = -Infinity;
      this.guideCanvas = undefined;        // lazily created 2D scratch canvas (never shown)
      this.extensions = new Map();         // eased extension per symbol, 0…1
      this.extensionStates = new Map();    // the stored reading behind each eased value
      this.fit = 1;                        // view scale: 1 unless orbs are out in the region
      this.market = null;                  // Map(symbol → market record), or null while the feed is cut
      this.marketStatus = MARKET_CUT_STATUS;   // fail-closed until the reader says otherwise
      this.marketAt = null;
      this.lastMarketAt = -Infinity;
      this.marketBusy = false;

      const r = roster();
      this.rosterInfo = r;
      this.nodes = model() && r ? model().rosterNodes(r.assets) : [];
      this.byId = new Map(this.nodes.map(n => [n.id, n]));
      this.homes = model() && this.nodes.length ? model().homesFor(this.nodes) : [];
      const placing = placerModule();
      const m = model();
      this.placer = placing && this.homes.length
        ? placing.createPlacer(this.homes, {
            roam: this.state.roam,
            /* the model's own 3D geometry, so spacing is measured where the berth check measures it */
            positionFor: (radius, lon, lat, formation, axes) => model().positionFor(radius, lon, lat, formation, axes),
            /* the model's placement contract, so the placer can never emit a latitude makeShape() refuses */
            latitudeLimit: m && m.PLACEMENT_LATITUDE_LIMIT,
            /* the model's radius rule, so spacing is measured where an extended orb actually is */
            radiusFor: (bandRadius, extension) => m.extensionRadius(bandRadius, extension)
          })
        : null;

      const { inner, outer } = flameEngines();
      this.inner = inner;
      this.outer = outer;
      this.wireLoaders();
    }

    /* Load the shared engines without taking their state; we only read them. */
    wireLoaders() {
      if (this.inner) {
        chain(this.inner, "onerror", e => { this.errors.inner = e && e.message ? e.message : "load failed"; });
        if (!this.inner.ready && !this.inner.baking) this.inner.start();
      }
      if (this.outer) {
        chain(this.outer, "onerror", e => { this.errors.outer = e && e.message ? e.message : "load failed"; });
        if (!this.outer.ready && !this.outer.baking) this.outer.start();
      }
    }

    /* ── shape ─────────────────────────────────────────────── */
    /* The shape for this frame. makeShape() fails closed: it refuses a configuration it will
       not draw. A refusal must cost one frame, never the display — the last good shape stays
       on screen, the reason is reported in Status, and retries are rate-limited so a
       persistent refusal cannot become a per-frame throw storm. */
    currentShape(now = 0) {
      if (!this.dirty && this.shape) return this.shape;
      const m = model();
      if (!m) { this.shape = null; return null; }
      if (this.errors.shape && this.shape && now - this.lastShapeAttempt < SHAPE_RETRY_MS) return this.shape;
      this.lastShapeAttempt = now;
      const s = this.state;
      try {
        this.shape = m.makeShape({
          formation: s.formation,
          axes: { x: s.axes.x, y: s.axes.y, z: s.axes.z },
          berthSeparation: s.berth,
          nodes: this.nodes,
          placements: this.placementMap(),
          extensions: this.extensionMap(),
          depths: this.depthObject()
        });
        this.errors.shape = null;
      } catch (error) {
        this.errors.shape = error && error.message ? error.message : String(error);
      }
      this.dirty = false;
      return this.shape;
    }

    /* { [id]: { longitude, latitude } } for the model, or null when placing at home. */
    placementMap() {
      if (!this.placements) return null;
      const map = {};
      for (const p of this.placements) map[p.id] = { longitude: p.longitude, latitude: p.latitude };
      return map;
    }

    /* Fail-closed: the feed counts as cut unless the reader module opens it explicitly. */
    feedCut() {
      const reader = typeof window !== "undefined" ? window.NeoOrbField : null;
      return !reader || reader.FEED_CUT !== false;
    }

    /* ── market colour and extension (descriptive) ──────────── */
    /* One stored read feeds both descriptive channels: fill = rally/sink and ring = basis
       (js/neo-orb-market.js), and distance from the centre = the instability extension
       (js/market-extension.js). js/neo-orb-field.js owns whether the feed is open at all and
       this app follows it fail-closed: unless the reader declares the feed open, nothing is
       read, nothing is polled, every orb stays neutral, and every orb stays on its band shell.
       Nothing is written either way, and no provider is called from here. */
    refreshMarket(now) {
      const reader = typeof window !== "undefined" ? window.NeoOrbField : null;
      const market = typeof window !== "undefined" ? window.NeoOrbMarket : null;
      if (this.feedCut()) {
        this.market = null;
        this.marketAt = null;
        this.storedAt = null;
        this.extensionStates = new Map();
        this.depths = null;
        this.syncRadii();
        this.marketStatus = `cut — ${reader && reader.FEED_CUT_MESSAGE ? reader.FEED_CUT_MESSAGE : MARKET_CUT_MESSAGE}`;
        return;
      }
      if (!reader || !market) { this.marketStatus = "unavailable — the market colour module did not load"; return; }
      if (this.marketBusy || now - this.lastMarketAt < MARKET_EVERY_MS) return;
      this.lastMarketAt = now;
      this.marketBusy = true;
      reader.readField({ now: Date.now() }).then(result => {
        if (result.ok) {
          this.market = market.indexField(result.observations);
          this.marketAt = result.at;
          this.storedAt = market.storedAsOf(result.observations);
          this.indexExtensions();
          this.indexDepths();
          this.marketStatus = this.market.size ? "live" : "no stock rows in the field yet";
        } else {
          this.marketStatus = `unavailable — ${result.message}`;
        }
      }).catch(() => {
        this.marketStatus = "unavailable — the field read failed";
      }).finally(() => {
        this.marketBusy = false;
      });
    }

    /* { fill, ring, rally, basis } for a roster orb. No data → neutral fill and no ring. */
    toneFor(id) {
      const market = typeof window !== "undefined" ? window.NeoOrbMarket : null;
      const record = this.market ? this.market.get(id) : null;
      if (!market || !record) return { fill: NEUTRAL_FILL, ring: null, rally: "unknown", basis: "unknown" };
      return market.colourOf(market.marketStateOf(record));
    }

    /* One readable line for the inspector: rally/sink, the % change, and basis. */
    marketNoteFor(id) {
      const market = typeof window !== "undefined" ? window.NeoOrbMarket : null;
      const record = this.market ? this.market.get(id) : null;
      if (!market || !record) return this.marketStatus;
      const s = market.marketStateOf(record);
      const pct = s.changePct === null ? "change not supplied" : `${s.changePct > 0 ? "+" : ""}${s.changePct.toFixed(2)}%`;
      const basis = s.basis === "above" ? "close above the FBB basis"
        : s.basis === "below" ? "close below the FBB basis"
          : s.basis === "equal" ? "close at the FBB basis" : "basis not supplied";
      return `${s.rally} · ${pct} · ${basis}${this.storedLabel()}`;
    }

    /* Each orb's depth through the six Fibonacci envelopes (js/neo-orb-signals.js), from the
       stored row. null means unmeasured: the orb is held on the outer shell and labelled so. */
    indexDepths() {
      const signals = signalsModule();
      const depths = new Map();
      if (signals && this.market) for (const [symbol, record] of this.market) depths.set(symbol, signals.depthOf(record).depth);
      this.depths = depths;
      this.syncRadii();
    }

    /* The depth of every roster orb, { [id]: 0…1 | null }, or null before any stored read. */
    depthObject() {
      if (!this.depths) return null;
      const out = {};
      for (const node of this.nodes) out[node.id] = this.depths.has(node.id) ? this.depths.get(node.id) : null;
      return out;
    }

    /* Rebuild the model's homes from the depths and hand the spacing radii to the placer. The
       placer keeps its state; only the radius each orb is spaced at changes. */
    syncRadii() {
      const m = model();
      if (!m || !this.nodes.length) return;
      this.homes = m.homesFor(this.nodes, this.depthObject());
      if (this.placer && typeof this.placer.setRadii === "function") {
        this.placer.setRadii(Object.fromEntries(this.homes.map(h => [h.id, h.radius])));
      }
      this.dirty = true;
    }

    /* The stored reading behind each orb's distance from the centre. A failed read keeps the
       last good states, exactly as it keeps the last good colours. */
    indexExtensions() {
      const ext = extensionModule();
      const states = new Map();
      if (ext && this.market) for (const [symbol, record] of this.market) states.set(symbol, ext.extensionOf(record));
      this.extensionStates = states;
    }

    /* Ease every orb toward its stored extension. `instant` snaps instead of gliding, which is
       what a paused or reduced-motion view does: the reading is still shown, it just does not
       animate. Values stay inside 0…1, so the model's validation can never be handed a stray. */
    updateExtensions(dt, instant) {
      const k = instant ? 1 : dt > 0 ? 1 - Math.exp(-dt / EXTENSION_TAU) : 0;
      if (k <= 0) return;
      let moved = false;
      for (const node of this.nodes) {
        const state = this.extensionStates.get(node.id);
        const target = state && state.available ? state.extension : 0;
        const current = this.extensions.get(node.id) || 0;
        const next = current + (target - current) * k;
        const settled = Math.abs(target - next) < 1e-4 ? target : next;
        if (settled !== current) { this.extensions.set(node.id, settled); moved = true; }
      }
      if (moved) this.dirty = true;
    }

    /* { [id]: 0…1 } for the model and the placer. Empty when nothing is extended. */
    extensionMap() {
      if (!this.extensions.size) return null;
      const map = {};
      for (const node of this.nodes) map[node.id] = this.extensions.get(node.id) || 0;
      return map;
    }

    /* The eased extension of one orb, and the reading behind it. */
    extensionFor(id) {
      return { value: this.extensions.get(id) || 0, state: this.extensionStates.get(id) || null };
    }

    /* One readable line for the inspector: how far out, why, and against which shell. */
    extensionNoteFor(id) {
      const ext = extensionModule();
      const { value, state } = this.extensionFor(id);
      if (!ext) return "unavailable — the extension module did not load";
      if (!state) return this.feedCut() ? this.marketStatus : "unmeasured — this orb has no stored row";
      if (!state.available) return `unmeasured — ${state.reason}`;
      const placed = this.shape ? this.shape.nodes.find(n => n.id === id) : null;
      const radii = placed
        ? ` · r ${placed.radius.toFixed(3)} from a depth shell of ${placed.shellRadius.toFixed(3)}`
        : "";
      /* The drawn value is eased, so it is named as what it is: the reading once it has
         arrived, and a value still on its way there until then. */
      const settling = Math.abs(value - state.extension) >= 5e-3;
      return `${ext.describe(state)} · shown at ${value.toFixed(2)}${settling ? " while it settles" : ""}${radii}`;
    }

    /* Keep the whole fleet in frame. Orbs that lift into the instability region reach past the
       outermost band shell, so the view eases out to hold them; with nothing extended the scale
       is exactly what it has always been, so the framing never changes on a calm field. */
    updateFit(dt, shape) {
      const maxRadius = shape && shape.instability ? Math.max(1, shape.instability.maxRadius) : 1;
      const target = clamp(1 / maxRadius, MIN_FIT, 1);
      const k = dt > 0 ? 1 - Math.exp(-dt / FIT_TAU) : 0;
      if (k <= 0) return;
      this.fit += (target - this.fit) * k;
    }

    /* One Status line for the instability region: how many orbs are off their band shell,
       the widest reading, and the region's own edges. Honest about what is unmeasured. */
    extensionReadout() {
      const ext = extensionModule();
      if (!ext) return "unavailable — the extension module did not load";
      if (this.feedCut()) return `none — ${MARKET_CUT_MESSAGE}`;
      const info = this.shape ? this.shape.instability : null;
      const measured = this.extensionStates.size;
      if (!measured) return "unmeasured — no stored rows in the field yet";
      const region = info ? info.region : null;
      let top = null;
      for (const [id, value] of this.extensions) if (value > 0 && (!top || value > top.value)) top = { id, value };
      const extended = info ? info.extendedCount : 0;
      const widest = info ? info.maxExtension : 0;
      return `${extended} of ${this.nodes.length} outside their band shell · max ${widest.toFixed(2)}${top ? ` (${top.id})` : ""}`
        + ` · ${measured} measured · region ${region ? `${region.inner.toFixed(2)}…${region.outer.toFixed(2)}` : "unavailable"}`
        + ` · view ${(this.fit * 100).toFixed(0)}%${this.storedLabel()}`;
    }

    /* Colours are the last stored field, not live. Say so, with the stored time in UTC. */
    storedLabel() {
      if (!this.storedAt) return "";
      return ` · stored ${new Date(this.storedAt).toISOString().slice(0, 16).replace("T", " ")} UTC`;
    }

    /* ── dynamic placement ───────────────────────────────────── */
    /* Advance placement by simDt seconds of engine time (zero while paused). The
       flame bitmaps are re-read at GUIDE_EVERY_MS; the placer does the motion. */
    updatePlacement(simDt, now) {
      const placing = placerModule();
      const active = !!(placing && this.placer && this.state.layers.placement);
      if (!active) {
        if (this.placements) { this.placements = null; this.dirty = true; }
        return;
      }
      if (this.placer.roam !== this.state.roam) this.placer.setRoam(this.state.roam);
      if (typeof this.placer.setExtensions === "function") this.placer.setExtensions(this.extensionMap());
      this.placer.setGeometry({
        formation: this.state.formation,
        axes: { x: this.state.axes.x, y: this.state.axes.y, z: this.state.axes.z }
      });
      if (now - this.lastGuideAt >= GUIDE_EVERY_MS || this.lastGuideAt === -Infinity) {
        this.guide = this.sampleGuide();
        this.lastGuideAt = now;
      }
      this.placements = this.placer.step(simDt, this.guide);
      this.dirty = true;
    }

    /* Read the two flame bitmaps (never drawn on screen) into one density field.
       Returns null when neither engine is ready or readable; placement then stays home. */
    sampleGuide() {
      const placing = placerModule();
      if (!placing) return null;
      const ctx = this.guideContext();
      if (!ctx) return null;
      const N = GUIDE_SIZE;
      const parts = [];
      for (const [player, weight] of [[this.inner, GUIDE_WEIGHT.inner], [this.outer, GUIDE_WEIGHT.outer]]) {
        if (!player || !player.ready || !player.frames || !player.frames.length) continue;
        const frame = player.frames[frameIndexOf(player)];
        if (!frame) continue;
        try {
          ctx.clearRect(0, 0, N, N);
          ctx.drawImage(frame, 0, 0, N, N);
          const pixels = ctx.getImageData(0, 0, N, N).data;
          parts.push({ field: placing.fieldFromRGBA(pixels, N), weight });
          this.errors.guide = null;
        } catch (e) {
          this.errors.guide = e && e.message ? e.message : "guidance read failed";
        }
      }
      return placing.combineFields(parts);
    }

    guideContext() {
      if (this.guideCanvas !== undefined) return this.guideCanvas;
      this.guideCanvas = null;
      try {
        const c = document.createElement("canvas");
        c.width = GUIDE_SIZE; c.height = GUIDE_SIZE;
        this.guideCanvas = c.getContext ? c.getContext("2d", { willReadFrequently: true }) : null;
      } catch (e) {
        this.errors.guide = e && e.message ? e.message : "no canvas";
      }
      return this.guideCanvas;
    }

    set(path, value) {
      const [lo, hi] = RANGES[path] || [0, 1];
      const number = clamp(Number(value), lo, hi);
      if (!Number.isFinite(number)) return;
      const parts = path.split(".");
      if (parts.length === 2) this.state[parts[0]][parts[1]] = number;
      else this.state[path] = number;
      this.dirty = true;
    }

    /* ── camera (The Orb's project / toScreen contract) ─────── */
    yawNow() {
      return this.baseYaw + OMEGA * this.clock + (PHASE_SHIFT[this.state.phase] || 0);
    }

    camera(s, cx, cy) {
      const yaw = this.yawNow();
      const cyw = Math.cos(yaw), syw = Math.sin(yaw);
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const project = p => {
        const x = p.x * cyw + p.z * syw;
        let z = -p.x * syw + p.z * cyw;
        const y = p.y * cp - z * sp;
        z = p.y * sp + z * cp;
        const k = FOV / (FOV + z);
        return { x: x * k, y: -y * k, k, z };
      };
      const toScreen = q => ({ x: cx + q.x * s, y: cy + q.y * s * 0.92, k: q.k, z: q.z });
      return { project, toScreen };
    }

    /* ── frame ─────────────────────────────────────────────── */
    /* The clock never stops. One frame of work is wrapped, so a placement the geometry
       refuses, a canvas that throws, or a readout that fails costs that frame only: the
       failure is named in Status and the next frame is always armed. An uncaught throw in
       here is what used to freeze NEO ORB — requestAnimationFrame was never called again,
       so the picture stopped and the app looked dead a few seconds in. */
    tick(now) {
      if (this.stopped) return;
      if (!this.body.isConnected) { this.stopped = true; return; }
      try {
        this.frame(now);
      } catch (error) {
        this.errors.frame = error && error.message ? error.message : String(error);
        this.showFrameError();
      }
      if (!this.stopped) requestAnimationFrame(t => this.tick(t));
    }

    frame(now) {
      this.errors.frame = null;   /* a frame that runs clears the last failure; Status tells the truth */
      const dt = this.lastTick == null ? 0 : clamp((now - this.lastTick) / 1000, 0, 0.1);
      this.lastTick = now;
      const simDt = this.state.paused ? 0 : dt * this.state.speed;
      this.clock += simDt;
      this.refreshMarket(now);
      /* Extension settles on wall-clock time so a paused view still shows the stored reading;
         a paused or reduced-motion view snaps to it instead of gliding. */
      this.updateExtensions(dt, this.state.paused);
      this.updatePlacement(simDt, now);
      /* The camera holds the whole fleet: orbs lifted into the instability region reach past
         the outermost band shell, so the view eases out to keep them on screen. This runs in
         the frame, not inside draw(), so the framing stays right even when the canvas is not
         available to draw on. */
      this.updateFit(dt, this.currentShape(now));
      this.draw(now);
      if (now - this.lastReadout > 250) { this.lastReadout = now; this.readouts(); }
    }

    /* Write a frame failure straight to the Status panel. It deliberately bypasses
       readouts(), because the readout path may be the part that threw. */
    showFrameError() {
      try {
        const el = this.body.querySelector("#neo-frame");
        if (el) el.textContent = frameNote(this.errors);
      } catch { /* no panel to write to; the loop still re-arms */ }
    }

    /* ── drawing ───────────────────────────────────────────── */
    draw(now) {
      const canvas = this.canvas;
      const ctx = this.ctx;
      if (!canvas || !ctx) return;
      const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      const pxW = Math.round(W * dpr), pxH = Math.round(H * dpr);
      if (canvas.width !== pxW || canvas.height !== pxH) { canvas.width = pxW; canvas.height = pxH; }

      const cx = W / 2, cy = H / 2;
      const st = this.state;
      const L = st.layers;
      const breath = 1 + BREATH_EPS * Math.sin((TAU * this.clock) / BREATH_T);
      const R = WORLD_R * breath;
      const shape = this.currentShape(now);
      /* The view scale only ever shrinks, and only while orbs are out in the instability
         region, so a calm field is framed exactly as it always was. frame() eases it. */
      const s = Math.min(W, H) * 0.18 * this.fit;
      const { project, toScreen } = this.camera(s, cx, cy);
      const m = model();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.6);
      halo.addColorStop(0, "rgba(30,48,92,0.34)");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      /* The flame engines are read for placement guidance and never drawn. */

      /* 1 · log bands and meridians — the shell geometry from the model */
      if (shape && m && L.bands) this.drawBands(ctx, shape, m, R, project, toScreen);

      /* 2 · the placed Orb 2 nodes (computed once, shared by spokes and orbs) */
      this.screenNodes = [];
      const placed = shape && L.orbs ? shape.nodes.map(n => {
        const beat = L.beat ? 1 + BEAT_EPS * Math.sin((TAU * this.clock) / BEAT_T + m.identityPhase(n.id)) : 1;
        const p = project(this.worldPoint(n.position, R, beat));
        const q = toScreen(p);
        const r = Math.max(1.8, n.nodeRadius * WORLD_R * s * p.k * 0.55 * st.nodeScale);
        return { n, x: q.x, y: q.y, z: p.z, k: p.k, r, front: p.z < 0 };
      }) : [];

      /* 3 · center origin and direct attachments (The Orb's spokes) */
      const origin = toScreen(project({ x: 0, y: 0, z: 0 }));
      if (placed.length && L.attachments) {
        ctx.save();
        ctx.lineWidth = 1;
        for (const node of placed) {
          ctx.strokeStyle = `rgba(255,212,121,${node.front ? 0.20 : 0.07})`;
          ctx.beginPath();
          ctx.moveTo(origin.x, origin.y);
          ctx.lineTo(node.x, node.y);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = CENTER_COLOR;
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, 2.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,212,121,0.55)";
      ctx.font = "9px ui-monospace, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(ORIGIN_ADDRESS, origin.x, origin.y + 14);
      ctx.restore();

      /* 4 · Orb 2 roster orbs, far to near */
      if (placed.length) {
        this.screenNodes = placed;
        placed.sort((a, b) => b.z - a.z);
        for (const node of placed) this.drawOrb(ctx, node, L);
      }

      if (!shape) {
        ctx.save();
        ctx.fillStyle = "rgba(223,233,255,0.7)";
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("NEO ORB geometry unavailable (js/neo-orb-model.js not loaded)", cx, cy);
        ctx.restore();
      }
    }

    /* Model positions are in unit-sphere space; scale to world units and breathe. */
    worldPoint(position, R, beat) {
      const k = R * beat;
      return { x: position.x * k, y: position.y * k, z: position.z * k };
    }

    drawBands(ctx, shape, m, R, project, toScreen) {
      const st = this.state;
      const maxRadius = shape.radialBands[shape.radialBands.length - 1].radius;
      ctx.save();
      ctx.lineWidth = 1;
      const ringPoints = (radius, samples) => {
        const pts = [];
        for (let j = 0; j <= samples; j++) {
          const lon = (j / samples) * TAU - Math.PI / 2;
          const pos = m.positionFor(radius, lon, 0, st.formation, shape.axes);
          pts.push(toScreen(project(this.worldPoint(pos, R, 1))));
        }
        return pts;
      };
      for (const band of shape.radialBands) {
        const radius = 0.24 + 0.76 * (band.radius / maxRadius);
        const pts = ringPoints(radius, 128);
        ctx.strokeStyle = BAND_COLOR;
        ctx.globalAlpha = 0.10 + 0.04 * (band.index / 5);
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
      }
      /* The instability region: outside every band shell, where extended orbs sit. An inner
         and an outer edge with ticks between them, in the bands' own neutral tone — blue and
         yellow stay reserved for market state. It brightens while occupied, so the region reads
         as a place something is happening rather than as decoration. */
      const region = m.INSTABILITY_REGION;
      if (region) {
        const occupied = shape.instability ? shape.instability.extendedCount > 0 : false;
        ctx.strokeStyle = BAND_COLOR;
        for (const edge of [region.inner, region.outer]) {
          ctx.globalAlpha = occupied ? 0.3 : 0.16;
          const pts = ringPoints(edge, 128);
          ctx.beginPath();
          pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
          ctx.stroke();
        }
        ctx.globalAlpha = occupied ? 0.16 : 0.07;
        for (let t = 0; t < 16; t++) {
          const lon = (t / 16) * TAU - Math.PI / 2;
          const inner = toScreen(project(this.worldPoint(m.positionFor(region.inner, lon, 0, st.formation, shape.axes), R, 1)));
          const outer = toScreen(project(this.worldPoint(m.positionFor(region.outer, lon, 0, st.formation, shape.axes), R, 1)));
          ctx.beginPath();
          ctx.moveTo(inner.x, inner.y);
          ctx.lineTo(outer.x, outer.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 0.07;
      for (let mi = 0; mi < 8; mi++) {
        const lon = (mi / 8) * TAU - Math.PI / 2;
        ctx.beginPath();
        for (let j = 0; j <= 48; j++) {
          const lat = (-1 + (2 * j) / 48) * m.LATITUDE_SPREAD;
          const pos = m.positionFor(1, lon, lat, st.formation, shape.axes);
          const q = toScreen(project(this.worldPoint(pos, R, 1)));
          if (j) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    drawOrb(ctx, node, L) {
      const tone = this.toneFor(node.n.id);
      const color = tone.fill;
      const alpha = node.front ? 1 : 0.32;
      const selected = node.n.id === this.selectedId;
      const hovered = node.n.id === this.hoveredId;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.r * 3.2);
      glow.addColorStop(0, hexAlpha(color, 0.42 * alpha));
      glow.addColorStop(1, hexAlpha(color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r * 3.2, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, TAU);
      ctx.fill();
      if (tone.ring) {
        ctx.strokeStyle = tone.ring;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + 2.2, 0, TAU);
        ctx.stroke();
      }
      if (selected || hovered) {
        ctx.strokeStyle = selected ? "#ffffff" : "#9fe9ff";
        ctx.lineWidth = selected ? 1.6 : 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + (selected ? 4 : 3), 0, TAU);
        ctx.stroke();
      }
      if ((L.labels || selected || hovered) && (node.front || selected)) {
        ctx.fillStyle = "rgba(232,241,255,0.92)";
        ctx.font = "600 10px ui-monospace, Menlo, Consolas, monospace";
        ctx.textAlign = "left";
        ctx.fillText(node.n.id, node.x + node.r + 5, node.y + 3);
      }
      ctx.restore();
    }

    /* ── input ─────────────────────────────────────────────── */
    hit(x, y) {
      let best = null;
      let bestScore = Infinity;
      for (const node of this.screenNodes) {
        const d = Math.hypot(node.x - x, node.y - y);
        const reach = Math.max(9, node.r + 5);
        if (d > reach) continue;
        const score = d - (node.front ? 6 : 0);
        if (score < bestScore) { bestScore = score; best = node; }
      }
      return best;
    }

    bindInput() {
      const canvas = this.canvas;
      const pos = ev => {
        const rect = canvas.getBoundingClientRect();
        return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      };
      canvas.addEventListener("pointerdown", ev => {
        this.drag = { x: ev.clientX, y: ev.clientY, moved: 0 };
        try { canvas.setPointerCapture(ev.pointerId); } catch { /* optional */ }
        canvas.style.cursor = "grabbing";
      });
      canvas.addEventListener("pointermove", ev => {
        if (this.drag) {
          const dx = ev.clientX - this.drag.x, dy = ev.clientY - this.drag.y;
          this.drag.x = ev.clientX; this.drag.y = ev.clientY;
          this.drag.moved += Math.abs(dx) + Math.abs(dy);
          this.baseYaw += dx * 0.006;
          this.pitch = clamp(this.pitch + dy * 0.004, -1.2, 1.2);
          return;
        }
        const p = pos(ev);
        const node = this.hit(p.x, p.y);
        const next = node ? node.n.id : null;
        if (next !== this.hoveredId) this.hoveredId = next;
        canvas.style.cursor = node ? "pointer" : "grab";
      });
      const end = ev => {
        if (!this.drag) return;
        const moved = this.drag.moved;
        this.drag = null;
        canvas.style.cursor = "grab";
        if (moved < 5) {
          const p = pos(ev);
          const node = this.hit(p.x, p.y);
          this.select(node ? node.n.id : null);
        }
      };
      canvas.addEventListener("pointerup", end);
      canvas.addEventListener("pointercancel", () => { this.drag = null; });
      canvas.addEventListener("pointerleave", () => { this.hoveredId = null; });
    }

    select(id) {
      this.selectedId = id && this.byId.has(id) ? id : null;
      this.renderInspector();
      this.syncRosterButtons();
    }

    /* ── DOM ───────────────────────────────────────────────── */
    mount() {
      const b = this.body;
      const rosterHtml = this.nodes.length
        ? this.nodes.map(n => `
            <button type="button" class="neo-roster-item" data-id="${esc(n.id)}" aria-pressed="false">
              <span class="neo-dot" style="background:${this.toneFor(n.id).fill}"></span>
              <span class="neo-sym">${esc(n.id)}</span>
              <span class="neo-meta">${esc(n.issuerSector)} · ${esc(n.marketCapLabel)}</span>
            </button>`).join("")
        : "<p class=\"neo-muted\">Roster unavailable — the Orb 2 roster snapshot did not load.</p>";
      const layerRows = LAYER_ROWS.map(([key, label]) => `
          <label class="neo-check"><input type="checkbox" data-layer="${key}" ${this.state.layers[key] ? "checked" : ""}> ${esc(label)}</label>`).join("");
      const range = (key, label, min, max, step) => `
          <label class="neo-range"><span>${esc(label)} <output data-out="${key}"></output></span>
            <input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}"></label>`;

      b.innerHTML = `
        <div class="neo-root">
          <div class="neo-head">
            <div class="h1">NEO ORB — The Orb × Orb 2</div>
            <div class="sub">The Orb's two fractal flame engines steer the Good Intelligence roster: the flames are read, never drawn, and each display-only orb travels smoothly between their bright bits.</div>
          </div>
          <div class="neo-body">
            <div class="neo-stage">
              <canvas class="neo-canvas" role="img" aria-label="NEO ORB display. Use the roster list to inspect each orb."></canvas>
              <div class="neo-stage-bar">
                <button type="button" class="neo-btn" data-action="toggle">${this.state.paused ? "Play" : "Pause"}</button>
                <button type="button" class="neo-btn" data-action="view">Reset view</button>
                <button type="button" class="neo-btn" data-action="shape">Reset shape</button>
                <span class="neo-hint">Drag to rotate · click an orb to inspect</span>
              </div>
            </div>
            <aside class="neo-panel">
              <section class="neo-section">
                <h3>Status</h3>
                <dl class="neo-dl">
                  <dt>Frame</dt><dd id="neo-frame">—</dd>
                  <dt>Convergence</dt><dd id="neo-conv">—</dd>
                  <dt>Berths</dt><dd id="neo-berth">—</dd>
                  <dt>Colour</dt><dd><span class="neo-swatch" style="background:#22c55e"></span>rallying <span class="neo-swatch" style="background:#ef4444"></span>sinking <span class="neo-swatch" style="background:#3b82f6"></span>below basis <span class="neo-swatch" style="background:#facc15"></span>above basis · fill is rally/sink, ring is basis${this.feedCut() ? " · the feed is cut, so no orb is coloured" : ""}</dd>
                  <dt>Distance</dt><dd>further out = more extended · the larger of the WaveTrend reading past ±53…±70 and the close's log distance from the FBB basis to its ±1000 envelope · 0 keeps an orb on its depth shell, 1 is the instability region's outer edge${this.feedCut() ? " · the feed is cut, so every orb stays on its shell" : ""}</dd>
                  <dt>Market</dt><dd id="neo-market">—</dd>
                  <dt>Instability region</dt><dd id="neo-ext">—</dd>
                  <dt>Guidance · Demo.flame</dt><dd id="neo-inner">—</dd>
                  <dt>Guidance · OuterOrb.flame</dt><dd id="neo-outer">—</dd>
                  <dt>Placement</dt><dd id="neo-place">—</dd>
                  <dt>Roster</dt><dd id="neo-roster">—</dd>
                </dl>
              </section>
              <section class="neo-section">
                <h3>Shape</h3>
                ${range("formation", "Formation (disc → sphere)", 0, 1, 0.01)}
                ${range("axes.x", "Axis X", 0.25, 2, 0.01)}
                ${range("axes.y", "Axis Y", 0.25, 2, 0.01)}
                ${range("axes.z", "Axis Z", 0.25, 2, 0.01)}
                ${range("berth", "Berth separation", 0, 1, 0.05)}
                ${range("roam", "Roam (tether around home sector)", 0, 1, 0.01)}
                <label class="neo-range"><span>Phase (display rotation only)</span>
                  <select data-key="phase">
                    <option value="NAB">NAB · +0°</option>
                    <option value="CWO">CWO · +60°</option>
                    <option value="GSRB">GSRB · +120°</option>
                  </select></label>
              </section>
              <section class="neo-section">
                <h3>Motion &amp; layers</h3>
                ${range("speed", "Rotation speed", 0, 3, 0.05)}
                ${range("nodeScale", "Orb size", 0.5, 2, 0.05)}
                ${layerRows}
              </section>
              <section class="neo-section">
                <h3>Inspector</h3>
                <div id="neo-inspector" aria-live="polite"></div>
              </section>
              <section class="neo-section">
                <h3>Roster · ${this.nodes.length}</h3>
                <div class="neo-roster" role="list">${rosterHtml}</div>
              </section>
            </aside>
          </div>
          <p class="neo-foot">Display-only geometry. Placement uses a symbol hash for home, the close's depth through the six Fibonacci envelopes for radius, a log market-cap band for inertia, and the flame engines' bitmaps only as guidance; it is not a price, a rank, a recommendation, or a live quote. The roster is a static snapshot${this.rosterInfo ? ` (${esc(this.rosterInfo.asOf)}, ${esc(this.rosterInfo.source)})` : ""}. Distance from the centre is the instability extension — how far overbought or oversold the stored reading is — and it is not a valuation, a rank, or a recommendation. NEO ORB confers no authority and routes nothing.${this.feedCut() ? " Its market feed is cut: it reads no field, so no company market data is fetched or shown." : ""}</p>
        </div>`;

      this.canvas = b.querySelector(".neo-canvas");
      this.ctx = this.canvas.getContext ? this.canvas.getContext("2d") : null;
      this.bindInput();
      this.bindControls();
      this.syncControls();
      this.renderInspector();
      this.readouts();
    }

    bindControls() {
      const b = this.body;
      b.querySelectorAll("input[data-key]").forEach(input => {
        input.addEventListener("input", () => {
          this.set(input.dataset.key, input.value);
          this.syncControls();
        });
      });
      const phase = b.querySelector("select[data-key='phase']");
      if (phase) phase.addEventListener("change", () => {
        this.state.phase = PHASE_SHIFT[phase.value] !== undefined ? phase.value : DEFAULTS.phase;
      });
      b.querySelectorAll("input[data-layer]").forEach(input => {
        input.addEventListener("change", () => { this.state.layers[input.dataset.layer] = input.checked; });
      });
      b.querySelectorAll(".neo-roster-item").forEach(btn => {
        btn.addEventListener("click", () => this.select(btn.dataset.id));
      });
      b.querySelector("[data-action='toggle']").addEventListener("click", ev => {
        this.state.paused = !this.state.paused;
        ev.currentTarget.textContent = this.state.paused ? "Play" : "Pause";
      });
      b.querySelector("[data-action='view']").addEventListener("click", () => {
        this.baseYaw = 0;
        this.pitch = 0.32;
      });
      b.querySelector("[data-action='shape']").addEventListener("click", () => {
        const keepPaused = this.state.paused;
        const layers = { ...this.state.layers };
        this.state = cloneDefaults();
        this.state.paused = keepPaused;
        this.state.layers = layers;
        if (this.placer) this.placer.reset();
        this.placements = null;
        this.dirty = true;
        this.syncControls();
        this.syncLayerInputs();
        this.body.querySelector("[data-key='phase']").value = this.state.phase;
      });
    }

    syncLayerInputs() {
      this.body.querySelectorAll("input[data-layer]").forEach(input => {
        input.checked = !!this.state.layers[input.dataset.layer];
      });
    }

    syncControls() {
      const b = this.body;
      const values = {
        formation: this.state.formation,
        "axes.x": this.state.axes.x, "axes.y": this.state.axes.y, "axes.z": this.state.axes.z,
        berth: this.state.berth, speed: this.state.speed, nodeScale: this.state.nodeScale,
        roam: this.state.roam
      };
      b.querySelectorAll("input[data-key]").forEach(input => {
        const key = input.dataset.key;
        if (key in values && document.activeElement !== input) input.value = String(values[key]);
        const out = b.querySelector(`output[data-out="${key}"]`);
        if (out && key in values) out.textContent = Number(values[key]).toFixed(2);
      });
      const toggle = b.querySelector("[data-action='toggle']");
      if (toggle) toggle.textContent = this.state.paused ? "Play" : "Pause";
    }

    syncRosterButtons() {
      this.body.querySelectorAll(".neo-roster-item").forEach(btn => {
        btn.setAttribute("aria-pressed", String(btn.dataset.id === this.selectedId));
      });
    }

    renderInspector() {
      const el = this.body.querySelector("#neo-inspector");
      if (!el) return;
      const n = this.selectedId ? this.byId.get(this.selectedId) : null;
      if (!n) {
        el.innerHTML = "<p class=\"neo-muted\">Select an orb on the sphere or in the roster list.</p>";
        return;
      }
      const shape = this.shape;
      const placed = shape ? shape.nodes.find(p => p.id === n.id) : null;
      const move = this.placements ? this.placements.find(p => p.id === n.id) : null;
      const bandNote = n.marketCapUsd ? `log band ${n.radialBand}` : "log band (no cap)";
      const driftDeg = move ? Math.round((move.displacement * 180) / Math.PI) : 0;
      const placeNote = !this.state.layers.placement
        ? "home sector (placement layer off)"
        : move && move.guided
          ? `flame-guided · ${driftDeg}° from home sector ${String(n.sector).padStart(3, "0")}`
          : `home sector ${String(n.sector).padStart(3, "0")} (no flame guidance)`;
      el.innerHTML = `
        <div class="neo-insp-title"><span class="neo-dot" style="background:${this.toneFor(n.id).fill}"></span>${esc(n.id)} · ${esc(n.name)}</div>
        <dl class="neo-dl">
          <dt>Issuer sector</dt><dd>${esc(n.issuerSector)} · rank ${esc(n.sectorRank)} (snapshot)</dd>
          <dt>Market cap</dt><dd>${esc(n.marketCapLabel)} · ${esc(bandNote)}</dd>
          <dt>Display sector</dt><dd>${String(n.sector).padStart(3, "0")} / 360</dd>
          <dt>Display kind</dt><dd>${esc(KIND_NAME[n.kind] || n.kind)}</dd>
          <dt>Market colour</dt><dd id="neo-insp-market">${esc(this.marketNoteFor(n.id))}</dd>
          <dt>Distance from centre</dt><dd id="neo-insp-ext">${esc(this.extensionNoteFor(n.id))}</dd>
          <dt>Placement</dt><dd>${esc(placeNote)}</dd>
          <dt>Berth</dt><dd>${placed && placed.wasReslotted ? "re-slotted to clear a neighbour" : "placed position"}</dd>
          <dt>Stage</dt><dd>${esc(n.marketStage)}</dd>
        </dl>
        <p class="neo-muted">Display-only. Not a quote, rank, or recommendation.</p>`;
    }

    readouts() {
      const b = this.body;
      const put = (id, text) => { const el = b.querySelector(`#${id}`); if (el && el.textContent !== text) el.textContent = text; };
      put("neo-frame", frameNote(this.errors));
      const shape = this.shape || this.currentShape();
      if (shape) {
        put("neo-conv", `${fmtPct(shape.convergence)} · ${shape.idealSphere ? "ideal sphere" : "spheroid"}`);
        const moved = shape.berthSeparation.movedNodeIds.length;
        put("neo-berth", `${shape.berthSeparation.crowdedNodeCount} crowded · ${moved} re-slotted · floor ${shape.berthSeparation.minimumChordDistance.toFixed(3)}`);
      }
      put("neo-inner", this.errors.inner ? `unavailable — ${this.errors.inner}` : playerStatus(this.inner, "Demo.flame (120f) · read, not drawn", null));
      put("neo-outer", this.errors.outer ? `unavailable — ${this.errors.outer}` : playerStatus(this.outer, "OuterOrb.flame (600f) · read, not drawn", null));
      const moved = this.placements || [];
      if (!this.state.layers.placement) put("neo-place", "home — placement layer off");
      else if (!this.placer) put("neo-place", "home — placement unavailable (model or roster not loaded)");
      else if (!this.placer.guided) put("neo-place", "home — flame guidance unavailable");
      else {
        const mean = moved.length ? moved.reduce((a, p) => a + p.displacement, 0) / moved.length : 0;
        const inMotion = moved.filter(p => p.speed > 0.02).length;
        put("neo-place", `flame-guided · ${inMotion}/${moved.length} moving · mean drift ${Math.round((mean * 180) / Math.PI)}°`);
      }
      put("neo-roster", this.rosterInfo
        ? `${this.nodes.length} display orbs · snapshot ${this.rosterInfo.asOf}`
        : "unavailable");
      put("neo-ext", this.extensionReadout());
      const coloured = this.market ? this.nodes.filter(n => this.market.has(n.id)).length : 0;
      put("neo-market", this.market
        ? `${this.marketStatus} · ${coloured} of ${this.nodes.length} orbs coloured${this.storedLabel()}${this.marketAt ? ` · read ${new Date(this.marketAt).toLocaleTimeString()}` : ""}`
        : `${this.marketStatus} · 0 of ${this.nodes.length} orbs coloured`);
      for (const item of b.querySelectorAll(".neo-roster-item")) {
        const dot = item.querySelector(".neo-dot");
        const fill = this.toneFor(item.dataset.id).fill;
        if (dot && dot.style.background !== fill) dot.style.background = fill;
      }
      const insp = b.querySelector("#neo-insp-market");
      if (insp && this.selectedId) {
        const note = this.marketNoteFor(this.selectedId);
        if (insp.textContent !== note) insp.textContent = note;
      }
      const inspExt = b.querySelector("#neo-insp-ext");
      if (inspExt && this.selectedId) {
        const note = this.extensionNoteFor(this.selectedId);
        if (inspExt.textContent !== note) inspExt.textContent = note;
      }
    }

    start() {
      this.lastTick = null;
      requestAnimationFrame(t => this.tick(t));
    }
  }

  /* #rrggbb + alpha → rgba() */
  function hexAlpha(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(alpha, 0, 1).toFixed(3)})`;
  }

  function mountNeoOrb(body) {
    const engine = new NeoOrbEngine(body);
    engine.mount();
    engine.start();
    if (typeof window !== "undefined") window.NEO_ORB_ENGINE = engine; /* debug/automation hook, like OCM_ENGINE */
    return engine;
  }

  function registerNeoOrbApp() {
    if (typeof APPS === "undefined") return;
    const app = {
      id: "neo-orb",
      title: "NEO ORB",
      short: "NEO ORB",
      glyph: "✹",
      desc: "Orb 2 × The Orb — roster orbs steered by the two flame engines",
      w: 980, h: 720,
      render(body) { mountNeoOrb(body); }
    };
    APPS.push(app);
    const anchor = APPS.findIndex(a => a.id === "orbs");
    const at = APPS.length - 1;
    if (anchor >= 0 && at > anchor + 1) {
      APPS.splice(at, 1);
      APPS.splice(anchor + 1, 0, app);
    }
  }

  if (typeof window !== "undefined") {
    window.NeoOrbApp = Object.freeze({ DEFAULTS, RANGES, KIND_COLOR, PHASE_SHIFT, GUIDE_WEIGHT, GUIDE_SIZE, MARKET_EVERY_MS, mountNeoOrb, NeoOrbEngine });
  }
  registerNeoOrbApp();
})();
