/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Orb Directory & Mail: OCM address logic and local store

   Addressing follows the Orb Communicator Model fresh-slate form
   (Part VII — Addressing, Rotation, and Spherical Topology):

       0•DDD•RRR•####
       ├ 0    root marker — Single-Origin Axiom
       ├ DDD  sector / direction, ℤ_360 = {000..359}
       ├ RRR  radius / distance shell (depth, not rank)
       └ #### instance within that sector and shell

   Two OCM rules shape this module:
     · Lateral Communication Axiom — nodes may communicate with any other
       node without reauthorization.
     · Ownership Non-Transfer Axiom — communication does not confer
       ownership, authority, or origin rights.

   Everything here is local. No transport, no SMTP, no network, no delivery.
   A recorded message is a local artifact, never a delivered one.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

const HOSOCMDIR = (() => {

  const SCHEMA = "harshalos-ocm-directory-v1";
  const STORAGE_KEY = "hos-ocm-directory-v1";
  const BULLET = "\u2022"; // •
  const SEPARATOR_INPUT = /[•\-.:\s/]+/;

  /* Distance is coupling, latency, and scope of responsibility.
     It is never rank, authority, or importance (Part VII §Distance). */
  const DISTANCE_SEMANTICS = Object.freeze({
    is: Object.freeze(["Degree of coupling to the origin", "Propagation latency of effects", "Scope of responsibility"]),
    isNot: Object.freeze(["Rank", "Authority", "Importance"])
  });

  /* What a recorded message is allowed to claim about itself. */
  const TRANSPORT = Object.freeze({
    status: "RECORDED-LOCAL-ONLY",
    transport: "NONE",
    delivery: "NOT-ATTEMPTED",
    authorityEffect: "NONE"
  });

  /* ---------- Resolution-first routing ----------
     OCM is centralized-decentralized: one origin resolves, every node may
     still coordinate laterally. Routing inward first is not a preference, it
     is the cheaper path by construction, because a lateral route has to
     resolve inward anyway before anything can commit.

     Canonical source: specs/normative/canonical.json → ocm_routing, and
     specs/normative/canonical-model.md (INV-OCM-PRECEDENCE-001/003). The cost
     claim is measured in logical authority-verification hops. */
  const ROUTING = Object.freeze({
    model: "RESOLUTION-FIRST",
    center: `0${BULLET}000${BULLET}000${BULLET}0000`,
    metric: "Cost_resolution < Cost_lateral",
    assumption: "Direct Attachment Axiom (1-hop radial resolution vs. m-1 lateral hops plus mandatory radial resolution before state commit)",
    precedence: Object.freeze([
      "Authoritative action must traverse the resolution path.",
      "Lateral coordination cannot authorize, override, or commit state.",
      "Resolution has precedence over coordination."
    ]),
    axisInvariant: "Resolution is an authority-resolution mechanism, not an authority source.",
    operations: Object.freeze([
      "Resolve legitimacy",
      "Transmit legitimacy state",
      "Interrupt execution",
      "Execute an operation",
      "Generate legitimacy"
    ]),
    boundary: "The cost claim holds over logical authority-verification hops. It does not claim lower physical wire latency across arbitrary networks.",
    orbRenderNote: "The Orb visualization renders the asymmetry as inward 0.038 vs lateral 0.012 per frame (>3×); that is a rendering parameter, not a measurement.",
    authoritySource: "HUMAN-KEY-AT-CENTER-ORIGIN",
    centerRole: "RESOLVE-AND-FORWARD"
  });

  /* Shortest arc on the ℤ_360 ring, so 001 and 359 are 2 apart, not 358. */
  function ringDistance(sectorA, sectorB) {
    const delta = Math.abs(Number(sectorA) - Number(sectorB)) % 360;
    return Math.min(delta, 360 - delta);
  }

  function planRoute(input = {}) {
    const from = validateAddress(input.from);
    if (!from.ok) return Object.freeze({ ok: false, field: "from", code: from.code, reason: from.reason });
    const to = validateAddress(input.to);
    if (!to.ok) return Object.freeze({ ok: false, field: "to", code: to.code, reason: to.reason });

    /* m = participating nodes: the sender plus every recipient. */
    const recipients = Number.isFinite(input.recipients) && input.recipients > 0 ? Math.floor(input.recipients) : 1;
    const participants = recipients + 1;
    const lateralArc = ringDistance(from.sectorNumber, to.sectorNumber);

    /* Resolution-first pays one radial verification hop; the outward leg is
       transmission, not verification. A lateral route pays its m-1 lateral
       hops and then still owes the mandatory radial resolution. */
    const verification = Object.freeze({
      resolutionFirst: 1,
      directLateral: participants,
      lateralArcDegrees: lateralArc,
      savedHops: participants - 1
    });

    return Object.freeze({
      ok: true,
      from: from.canonical,
      to: to.canonical,
      center: ROUTING.center,
      participants,
      route: "VIA-CENTER",
      path: Object.freeze([
        Object.freeze({ hop: 1, leg: "Resolve legitimacy", direction: "inward", from: from.canonical, to: ROUTING.center, verifies: true }),
        Object.freeze({ hop: 2, leg: "Transmit legitimacy state", direction: "outward", from: ROUTING.center, to: to.canonical, verifies: false })
      ]),
      verification,
      recommendation: "RESOLUTION-FIRST",
      reason: participants > 2
        ? `One radial verification hop beats ${participants - 1} lateral hops plus the mandatory radial resolution.`
        : "One radial verification hop beats a lateral hop that still owes its own radial resolution before commit.",
      authoritySource: ROUTING.authoritySource,
      centerRole: ROUTING.centerRole
    });
  }

  const DEFAULT_LOCAL_ADDRESS = `0${BULLET}028${BULLET}001${BULLET}0001`;

  const LIMITS = Object.freeze({
    name: 80,
    role: 60,
    voice: 40,
    externalMail: 120,
    notes: 400,
    subject: 120,
    body: 4000,
    contacts: 500,
    messages: 500
  });

  const clampText = (value, max) => String(value == null ? "" : value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .trim()
    .slice(0, max);

  /* ---------- OCM address parsing ---------- */

  function ocmData() {
    return (typeof window !== "undefined" && window.OCM_DATA) ? window.OCM_DATA : null;
  }

  function parseAddress(raw) {
    const refuse = (code, reason) => Object.freeze({ ok: false, code, reason });
    if (typeof raw !== "string" || !raw.trim()) return refuse("OCM-ADDR-EMPTY", "Enter an address in the form 0•DDD•RRR•####.");

    const parts = raw.trim().split(SEPARATOR_INPUT).filter(part => part !== "");
    if (parts.length < 4 || parts.length > 5) {
      return refuse("OCM-ADDR-FIELD-COUNT",
        `Expected four fields (0•DDD•RRR•####) plus an optional node suffix; found ${parts.length}.`);
    }

    const [root, sectorText, radiusText, instanceText, suffix] = parts;

    if (root !== "0") {
      return refuse("OCM-ADDR-ROOT",
        "Single-Origin Axiom: every address in the orb derives from exactly one center, written as the leading 0.");
    }
    if (!/^\d{1,3}$/.test(sectorText)) {
      return refuse("OCM-ADDR-SECTOR-FORMAT", "The sector field DDD is a 1–3 digit degree written as three digits (000–359).");
    }
    const sector = Number(sectorText);
    if (sector === 360) {
      return refuse("OCM-ADDR-SECTOR-CLOSURE",
        "360 is not an address. The sector domain is ℤ_360 = {0..359}; 360° ≡ 0° mod 360 is return-to-origin closure notation, never a 361st slot.");
    }
    if (sector > 359) {
      return refuse("OCM-ADDR-SECTOR-RANGE", `Sector ${sector} is outside the ℤ_360 ring {000–359}.`);
    }
    if (!/^\d{1,3}$/.test(radiusText)) {
      return refuse("OCM-ADDR-RADIUS-FORMAT", "The radius field RRR is a 1–3 digit distance shell written as three digits (000–999).");
    }
    if (!/^\d{1,4}$/.test(instanceText)) {
      return refuse("OCM-ADDR-INSTANCE-FORMAT", "The instance field #### is a 1–4 digit instance number written as four digits (0000–9999).");
    }
    if (suffix !== undefined && !/^[A-Za-z0-9][A-Za-z0-9_-]{0,11}$/.test(suffix)) {
      return refuse("OCM-ADDR-SUFFIX-FORMAT",
        "An optional node suffix is 1–12 characters of A–Z, 0–9, hyphen, or underscore (for example HKEY or AI-0007).");
    }

    const parsed = Object.freeze({
      ok: true,
      root: "0",
      sectorNumber: sector,
      sector: String(sector).padStart(3, "0"),
      radius: String(Number(radiusText)).padStart(3, "0"),
      instance: String(Number(instanceText)).padStart(4, "0"),
      suffix: suffix ? suffix.toUpperCase() : "",
      canonical: [`0`, String(sector).padStart(3, "0"), String(Number(radiusText)).padStart(3, "0"),
        String(Number(instanceText)).padStart(4, "0")]
        .concat(suffix ? [suffix.toUpperCase()] : [])
        .join(BULLET),
      isCenterOrigin: sector === 0
    });
    return parsed;
  }

  /* Sector 000 is Center Origin — the human key, not a mailbox. */
  function addressRefusal(parsed) {
    if (!parsed || !parsed.ok) return parsed || null;
    if (parsed.isCenterOrigin) {
      return Object.freeze({
        ok: false,
        code: "OCM-ADDR-ORIGIN-RESERVED",
        reason: "Sector 000 is reserved for Center Origin (0•000•000•0000). The center is the human key, not a directory entry or a mailbox; it cannot be registered, impersonated, or addressed as a peer."
      });
    }
    return null;
  }

  function validateAddress(raw) {
    const parsed = parseAddress(raw);
    if (!parsed.ok) return parsed;
    return addressRefusal(parsed) || parsed;
  }

  /* ---------- Sector meaning (Part VII degree legend) ---------- */

  function degreeMeaning(sectorNumber) {
    const data = ocmData();
    const legend = data && data.degrees ? data.degrees : null;
    if (!legend) return "Degree legend unavailable (OCM data module not loaded).";
    return legend[sectorNumber] || "No legend entry for this degree.";
  }

  function clusterOf(sectorNumber) {
    const data = ocmData();
    const clusters = data && data.clusters ? data.clusters : [];
    return clusters.find(cluster => sectorNumber >= cluster.from && sectorNumber <= cluster.to) || null;
  }

  function quadrantOf(sectorNumber) {
    const data = ocmData();
    const quadrants = data && data.quadrants ? data.quadrants : [];
    return quadrants.find(quadrant => sectorNumber >= quadrant.from && sectorNumber <= quadrant.to) || null;
  }

  function describe(parsed) {
    if (!parsed || !parsed.ok) return null;
    const cluster = clusterOf(parsed.sectorNumber);
    const quadrant = quadrantOf(parsed.sectorNumber);
    return Object.freeze({
      degree: degreeMeaning(parsed.sectorNumber),
      cluster: cluster ? `${cluster.name} (${cluster.from}°–${cluster.to}°)` : "",
      quadrant: quadrant ? `${quadrant.name} — ${quadrant.lens}` : ""
    });
  }

  /* ---------- Contacts ---------- */

  function makeContact(input = {}) {
    const parsed = validateAddress(input.address);
    if (!parsed.ok) return Object.freeze({ ok: false, code: parsed.code, reason: parsed.reason });

    const name = clampText(input.name, LIMITS.name);
    if (!name) return Object.freeze({ ok: false, code: "OCM-DIR-NAME-REQUIRED", reason: "A directory entry needs a display name." });

    const now = Number.isFinite(input.now) ? input.now : Date.now();
    return Object.freeze({
      ok: true,
      contact: Object.freeze({
        id: clampText(input.id, 64) || `ocm-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        address: parsed.canonical,
        sectorNumber: parsed.sectorNumber,
        sector: parsed.sector,
        radius: parsed.radius,
        instance: parsed.instance,
        suffix: parsed.suffix,
        role: clampText(input.role, LIMITS.role),
        /* External handles are annotations. They are not OCM addresses, are
           never verified here, and route nothing. */
        voice: clampText(input.voice, LIMITS.voice),
        externalMail: clampText(input.externalMail, LIMITS.externalMail),
        notes: clampText(input.notes, LIMITS.notes),
        kind: input.kind === "NODE" ? "NODE" : "USER",
        createdAt: now,
        updatedAt: now
      })
    });
  }

  /* ---------- Messages ---------- */

  function makeMessage(input = {}) {
    const from = validateAddress(input.from);
    if (!from.ok) return Object.freeze({ ok: false, field: "from", code: from.code, reason: from.reason });
    const to = validateAddress(input.to);
    if (!to.ok) return Object.freeze({ ok: false, field: "to", code: to.code, reason: to.reason });

    const subject = clampText(input.subject, LIMITS.subject);
    const body = clampText(input.body, LIMITS.body);
    if (!subject && !body) {
      return Object.freeze({ ok: false, field: "body", code: "OCM-MAIL-EMPTY", reason: "A message needs a subject or a body." });
    }

    const now = Number.isFinite(input.now) ? input.now : Date.now();
    const direct = input.route === "DIRECT-LATERAL";
    const recipients = Number.isFinite(input.recipients) && input.recipients > 0 ? Math.floor(input.recipients) : 1;
    const participants = recipients + 1;
    const arc = ringDistance(from.sectorNumber, to.sectorNumber);
    const plan = direct ? null : planRoute({ from: input.from, to: input.to, recipients });
    if (!direct && !plan.ok) return plan;

    return Object.freeze({
      ok: true,
      message: Object.freeze({
        id: clampText(input.id, 64) || `msg-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        from: from.canonical,
        to: to.canonical,
        subject: subject || "(no subject)",
        body,
        bodyDigest: clampText(input.bodyDigest, 80),
        createdAt: now,
        /* A recorded message never claims more than this. */
        status: TRANSPORT.status,
        transport: TRANSPORT.transport,
        delivery: TRANSPORT.delivery,
        authorityEffect: TRANSPORT.authorityEffect,
        direction: input.direction === "inbound" ? "inbound" : "outbound",
        /* Routing: inward resolution first, then outward transmission. A direct
           lateral route is permitted by the Lateral Communication Axiom but is
           marked unresolved, because it cannot authorize or commit anything. */
        route: direct ? "DIRECT-LATERAL" : "VIA-CENTER",
        resolution: direct ? "NOT-TRAVERSED" : "TRAVERSED",
        resolvedAt: direct ? "" : ROUTING.center,
        path: direct ? Object.freeze([]) : plan.path,
        verificationHops: Object.freeze(direct
          ? { resolutionFirst: 1, directLateral: participants, lateralArcDegrees: arc, savedHops: 0 }
          : { ...plan.verification }),
        authoritySource: ROUTING.authoritySource,
        centerRole: direct ? "BYPASSED" : ROUTING.centerRole
      })
    });
  }

  /* ---------- Local store ----------
     The storage adapter is injected so tests can supply a fake; the browser
     gets localStorage. Failures degrade to in-memory only, never a crash. */
  function createStore(options = {}) {
    const storage = options.storage || null;
    let state = { identity: DEFAULT_LOCAL_ADDRESS, contacts: [], messages: [] };
    const listeners = new Set();

    const persist = () => {
      if (!storage) return false;
      try { storage.write(JSON.stringify({ schema: SCHEMA, ...state })); return true; }
      catch { return false; }
    };

    const emit = () => { for (const listener of [...listeners]) { try { listener(); } catch { /* a bad listener must not break the store */ } } };

    const hydrate = () => {
      if (!storage) return { ok: true, restored: 0, dropped: 0, reason: "no storage adapter" };
      let raw = null;
      try { raw = storage.read(); } catch { raw = null; }
      if (!raw) return { ok: true, restored: 0, dropped: 0, reason: "empty store" };

      let parsedPayload = null;
      try { parsedPayload = JSON.parse(raw); }
      catch {
        /* Keep a recovery copy of malformed data rather than discarding it. */
        try { storage.writeRecovery && storage.writeRecovery(raw); } catch { /* recovery is best-effort */ }
        return { ok: false, restored: 0, dropped: 0, reason: "stored directory is not valid JSON; a recovery copy was kept" };
      }
      if (!parsedPayload || typeof parsedPayload !== "object" || parsedPayload.schema !== SCHEMA) {
        return { ok: false, restored: 0, dropped: 0, reason: "stored directory has an unknown schema" };
      }

      const identity = validateAddress(parsedPayload.identity);
      const contacts = [];
      const seen = new Set();
      let dropped = 0;
      for (const entry of Array.isArray(parsedPayload.contacts) ? parsedPayload.contacts : []) {
        const built = makeContact({ ...(entry || {}), now: Number(entry && entry.createdAt) || Date.now() });
        if (!built.ok || seen.has(built.contact.address) || contacts.length >= LIMITS.contacts) { dropped++; continue; }
        seen.add(built.contact.address);
        contacts.push(built.contact);
      }
      const messages = [];
      for (const entry of Array.isArray(parsedPayload.messages) ? parsedPayload.messages : []) {
        const built = makeMessage({ ...(entry || {}), now: Number(entry && entry.createdAt) || Date.now() });
        if (!built.ok || messages.length >= LIMITS.messages) { dropped++; continue; }
        messages.push(built.message);
      }
      state = { identity: identity.ok ? identity.canonical : DEFAULT_LOCAL_ADDRESS, contacts, messages };
      return { ok: true, restored: contacts.length + messages.length, dropped, reason: "restored" };
    };

    const api = {
      SCHEMA,
      STORAGE_KEY,
      LIMITS,
      hydrate,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      persisted() { return persist(); },

      identity() { return state.identity; },
      setIdentity(raw) {
        const parsed = validateAddress(raw);
        if (!parsed.ok) return parsed;
        state = { ...state, identity: parsed.canonical };
        persist(); emit();
        return parsed;
      },

      contacts() { return state.contacts.map(contact => Object.freeze({ ...contact })); },
      messages() { return state.messages.map(message => Object.freeze({ ...message })); },
      find(address) {
        const parsed = parseAddress(address);
        if (!parsed.ok) return null;
        return state.contacts.find(contact => contact.address === parsed.canonical) || null;
      },

      search(needle) {
        const query = String(needle || "").trim().toLowerCase();
        const all = api.contacts();
        if (!query) return all;
        return all.filter(contact => [contact.name, contact.address, contact.role, contact.notes,
          String(contact.sectorNumber)].join(" ").toLowerCase().includes(query));
      },

      add(input) {
        const built = makeContact(input);
        if (!built.ok) return built;
        if (state.contacts.some(contact => contact.address === built.contact.address)) {
          return Object.freeze({ ok: false, code: "OCM-DIR-DUPLICATE", reason: `${built.contact.address} is already in the directory.` });
        }
        if (state.contacts.length >= LIMITS.contacts) {
          return Object.freeze({ ok: false, code: "OCM-DIR-FULL", reason: `The local directory holds at most ${LIMITS.contacts} entries.` });
        }
        state = { ...state, contacts: [...state.contacts, built.contact] };
        persist(); emit();
        return Object.freeze({ ok: true, contact: built.contact });
      },

      update(id, patch = {}) {
        const existing = state.contacts.find(contact => contact.id === id);
        if (!existing) return Object.freeze({ ok: false, code: "OCM-DIR-NOT-FOUND", reason: "No directory entry with that id." });
        /* The address is the identity of an entry; it is not editable here. */
        const built = makeContact({ ...existing, ...patch, address: existing.address, id: existing.id, createdAt: existing.createdAt, now: Date.now() });
        if (!built.ok) return built;
        const updated = Object.freeze({ ...built.contact, updatedAt: Date.now() });
        state = { ...state, contacts: state.contacts.map(contact => (contact.id === id ? updated : contact)) };
        persist(); emit();
        return Object.freeze({ ok: true, contact: updated });
      },

      remove(id) {
        const existing = state.contacts.find(contact => contact.id === id);
        if (!existing) return Object.freeze({ ok: false, code: "OCM-DIR-NOT-FOUND", reason: "No directory entry with that id." });
        state = { ...state, contacts: state.contacts.filter(contact => contact.id !== id) };
        persist(); emit();
        return Object.freeze({ ok: true, removed: existing.address });
      },

      record(input) {
        const built = makeMessage(input);
        if (!built.ok) return built;
        /* A message id is reused only by a re-import of the same export; refusing
           the duplicate keeps an import idempotent instead of cloning records. */
        if (state.messages.some(message => message.id === built.message.id)) {
          return Object.freeze({ ok: false, code: "OCM-MAIL-DUPLICATE", reason: `A message with id ${built.message.id} is already recorded.` });
        }
        const messages = [built.message, ...state.messages].slice(0, LIMITS.messages);
        state = { ...state, messages };
        persist(); emit();
        return Object.freeze({ ok: true, message: built.message });
      },

      removeMessage(id) {
        const existing = state.messages.find(message => message.id === id);
        if (!existing) return Object.freeze({ ok: false, code: "OCM-MAIL-NOT-FOUND", reason: "No recorded message with that id." });
        state = { ...state, messages: state.messages.filter(message => message.id !== id) };
        persist(); emit();
        return Object.freeze({ ok: true, removed: existing.id });
      },

      exportJSON() {
        return JSON.stringify({ schema: SCHEMA, exportedAt: Date.now(), ...state }, null, 2) + "\n";
      },

      importJSON(text) {
        let payload = null;
        try { payload = JSON.parse(text); }
        catch { return Object.freeze({ ok: false, code: "OCM-DIR-IMPORT-PARSE", reason: "That is not valid JSON.", imported: 0, rejected: 0 }); }
        if (!payload || typeof payload !== "object" || payload.schema !== SCHEMA) {
          return Object.freeze({ ok: false, code: "OCM-DIR-IMPORT-SCHEMA", reason: `Expected a ${SCHEMA} export.`, imported: 0, rejected: 0 });
        }
        let imported = 0;
        let rejected = 0;
        const identity = validateAddress(payload.identity);
        if (identity.ok) { state = { ...state, identity: identity.canonical }; } else { rejected++; }
        for (const entry of Array.isArray(payload.contacts) ? payload.contacts : []) {
          const result = api.add(entry);
          result.ok ? imported++ : rejected++;
        }
        for (const entry of Array.isArray(payload.messages) ? payload.messages : []) {
          const result = api.record(entry);
          result.ok ? imported++ : rejected++;
        }
        return Object.freeze({ ok: true, imported, rejected });
      },

      clearMessages() {
        state = { ...state, messages: [] };
        persist(); emit();
        return Object.freeze({ ok: true });
      }
    };

    return Object.freeze(api);
  }

  return Object.freeze({
    SCHEMA,
    STORAGE_KEY,
    BULLET,
    LIMITS,
    TRANSPORT,
    ROUTING,
    DISTANCE_SEMANTICS,
    DEFAULT_LOCAL_ADDRESS,
    parseAddress,
    validateAddress,
    addressRefusal,
    ringDistance,
    planRoute,
    degreeMeaning,
    clusterOf,
    quadrantOf,
    describe,
    makeContact,
    makeMessage,
    createStore
  });
})();

window.HOSOCMDIR = HOSOCMDIR;
