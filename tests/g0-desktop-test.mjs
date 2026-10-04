/* Node harness: boots the REAL HarshalOS page — every script index.html loads,
   in order — then runs the real shell.init() and asserts the Ground-0 Audit
   desktop icon exists and that double-click launches the app.
   Run: node tests/g0-desktop-test.mjs */
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { buildBookLibrary } from "../scripts/book-library-index.mjs";

/* ── mini-DOM (same engine as g0-app-test.mjs) ────────────────── */
const VOID = new Set(["br", "img", "input", "hr", "meta", "link"]);
class El {
  constructor(tagName, attrs = {}) {
    this.tagName = tagName.toLowerCase();
    this.attrs = attrs;
    this.children = [];
    this.parent = null;
    this._ownText = "";
    this.scrollTop = 0;
    this._html = "";
    this.listeners = {};
    if (this.tagName === "iframe") this.contentWindow = {};
    this.classList = {
      _set: new Set(),
      add(...c) { c.forEach(x => this._set.add(x)); },
      remove(...c) { c.forEach(x => this._set.delete(x)); },
      toggle(c, force) { const on = force === undefined ? !this._set.has(c) : force; on ? this._set.add(c) : this._set.delete(c); return on; },
      contains(c) { return this._set.has(c); }
    };
    this.style = { setProperty() {}, removeProperty() {} };
    this.dataset = new Proxy({}, { get(t, k) { return t[k]; }, set(t, k, v) { t[k] = String(v); return true; } });
  }
  get textContent() { return this._ownText || this.children.map(c => c.textContent).join(""); }
  set textContent(value) { this._ownText = String(value); this.children = []; }
  get className() { return [...this.classList._set].join(" "); }
  set className(value) { this.classList._set.clear(); String(value).split(/\s+/).filter(Boolean).forEach(c => this.classList._set.add(c)); }
  set innerHTML(html) { this._html = String(html); this.children = parse(String(html), this); }
  get innerHTML() { return this._html; }
  appendChild(child) { child.parent = this; this.children.push(child); return child; }
  contains(node) { for (let current = node; current; current = current.parent) if (current === this) return true; return false; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(f => f !== fn); }
  focus() { this._focused = true; }
  blur() { this._focused = false; }
  click() { dispatch(this, "click"); }
  dblclick() { dispatch(this, "dblclick"); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k.startsWith("data-")) this.dataset[k.slice(5)] = String(v); }
  closest(selector) { let node = this; while (node) { if (selector.split(",").some(s => matches(node, s.trim()))) return node; node = node.parent; } return null; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const out = [];
    const parts = selector.split(/\s+/).filter(Boolean);
    const matchPath = (el, sel) => {
      const p = sel.split(/\s+/).filter(Boolean);
      const tryMatch = (node, idx) => {
        if (!matches(node, p[idx])) return false;
        if (idx === 0) return true;
        let par = node.parent;
        while (par) { if (tryMatch(par, idx - 1)) return true; par = par.parent; }
        return false;
      };
      return tryMatch(el, p.length - 1);
    };
    const walk = el => { for (const child of el.children) { if (parts.length === 1 ? matches(child, parts[0]) : matchPath(child, selector)) out.push(child); walk(child); } };
    walk(this);
    return out;
  }
}
const selPart = part => {
  const m = { tag: null, classes: [], id: null, attrs: {} };
  const re = /(\[[^\]]+\]|[#.][\w-]+|^[A-Za-z][\w-]*)/g;
  for (const token of part.match(re) || []) {
    if (token.startsWith(".")) m.classes.push(token.slice(1));
    else if (token.startsWith("#")) m.id = token.slice(1);
    else if (token.startsWith("[")) {
      const a = token.slice(1, -1);
      const eq = a.indexOf("=");
      if (eq === -1) m.attrs[a.trim()] = true;
      else m.attrs[a.slice(0, eq).trim()] = a.slice(eq + 1).replace(/^["']|["']$/g, "");
    } else m.tag = token.toLowerCase();
  }
  return m;
};
const matches = (el, part) => {
  const m = selPart(part);
  if (el.tagName === "#text") return false;
  if (m.tag && el.tagName !== m.tag) return false;
  if (m.id && el.attrs.id !== m.id) return false;
  if (m.classes.some(c => !el.classList.contains(c))) return false;
  for (const [k, v] of Object.entries(m.attrs)) {
    if (v === true) { if (!(k in el.attrs) && !(k in el.dataset)) return false; }
    else if (String(el.attrs[k] ?? el.dataset[k] ?? "") !== v) return false;
  }
  return true;
};
function parse(html, parent) {
  const rootChildren = [];
  const stack = [null]; // index 0 = the document fragment; real Els above
  const top = () => (stack.length === 1 ? null : stack[stack.length - 1]);
  const attach = el => {
    const host = top();
    if (host) { host.children.push(el); el.parent = host; }
    else { rootChildren.push(el); el.parent = parent; }
  };
  const tagRe = /<\/?([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let lastIndex = 0, m;
  const pushText = text => {
    if (!text || !text.trim()) return;
    const t = new El("#text");
    t.textContent = text;
    attach(t);
  };
  while ((m = tagRe.exec(html))) {
    pushText(html.slice(lastIndex, m.index));
    lastIndex = tagRe.lastIndex;
    const [full, tag, rawAttrs = "", selfClose] = m;
    if (full.startsWith("</")) {
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tagName === tag.toLowerCase()) { stack.length = i; break; }
      continue;
    }
    const attrs = {};
    const attrRe = /([\w-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+))?/g;
    let am;
    while ((am = attrRe.exec(rawAttrs))) attrs[am[1]] = am[3] ?? am[4] ?? am[2] ?? "";
    const el = new El(tag, attrs);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") String(v).split(/\s+/).filter(Boolean).forEach(c => el.classList.add(c));
      if (k === "id") el.attrs.id = v;
      if (k.startsWith("data-")) el.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
    }
    attach(el);
    if (!(selfClose || VOID.has(el.tagName))) stack.push(el);
  }
  pushText(html.slice(lastIndex));
  return rootChildren;
}
function dispatch(element, type, pending = null) {
  const event = {
    type, target: element, currentTarget: null,
    preventDefault() {}, stopPropagation() {},
    get value() { return element.value ?? ""; },
    get checked() { return !!element.checked; }
  };
  let node = element;
  while (node) {
    for (const fn of (node.listeners[type] || []).slice()) {
      const result = fn.call(node, event);
      if (pending) pending.push(Promise.resolve(result));
    }
    node = node.parent;
  }
}

/* ── browser globals ──────────────────────────────────────────── */
globalThis.window = globalThis;
globalThis.self = globalThis;
const windowListeners = new Map();
globalThis.addEventListener = (type, listener) => {
  const entries = windowListeners.get(type) || [];
  entries.push(listener);
  windowListeners.set(type, entries);
};
globalThis.removeEventListener = (type, listener) => {
  windowListeners.set(type, (windowListeners.get(type) || []).filter(entry => entry !== listener));
};
globalThis.dispatchWindowEvent = (type, event) => {
  for (const listener of (windowListeners.get(type) || []).slice()) listener(event);
};
globalThis.location = { href: "https://os.example.test/" };
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
const storage = new Map();
globalThis.localStorage = {
  getItem: k => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: k => storage.delete(k)
};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.CSS = { escape: s => String(s).replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, c => "\\" + c) };
Object.defineProperty(globalThis, "navigator", { value: { clipboard: { writeText: async () => {} }, platform: "test" }, configurable: true });
globalThis.requestAnimationFrame = fn => setTimeout(fn, 16);
globalThis.confirm = () => true;

/* ── the real page: index.html body as the document ───────────── */
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(path.join(root, "index.html"), "utf8");
const osCss = readFileSync(path.join(root, "css/os.css"), "utf8");
const mobileCss = readFileSync(path.join(root, "css/mobile.css"), "utf8");
const bodyInner = html.slice(html.indexOf("<body"), html.indexOf("</body>")).replace(/^<body[^>]*>/, "");
const body = new El("body");
body.innerHTML = bodyInner;
globalThis.document = {
  body,
  createElement: tag => new El(tag),
  createTextNode: text => { const node = new El("#text"); node.textContent = String(text); return node; },
  querySelector: sel => body.querySelector(sel),
  querySelectorAll: sel => body.querySelectorAll(sel),
  getElementById: id => body.querySelector(`#${id}`),
  addEventListener() {}
};

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) pass++; else { fail++; console.error("  ✗ FAIL:", name); } };

/* ── load every script index.html references, in order ────────── */
const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]);
ok(srcs.length >= 10, `index.html loads ${srcs.length} scripts`);
ok(html.includes('<link rel="stylesheet" href="css/news.css?v=2026-10-03news1">'), "the standalone News app stylesheet is linked from index.html");
for (const src of srcs) {
  const url = pathToFileURL(path.join(root, src.split("?")[0])).href;
  try { await import(url); }
  catch (error) { fail++; console.error(`  ✗ FAIL: script evaluates cleanly: ${src} — ${error.message}`); }
}

/* ── the app must be registered before the desktop builds ─────── */
ok(Array.isArray(globalThis.APPS), "APPS registry exists (apps-core loaded)");
const newsApp = globalThis.APPS.find(a => a.id === "news");
ok(!!newsApp, "standalone News app is registered in APPS");
ok(newsApp && newsApp.short === "News" && newsApp.glyph === "📰", "News has its own desktop icon and label");
const g0 = globalThis.APPS.find(a => a.id === "ground0");
ok(!!g0, "Ground-0 Audit registered in APPS");
ok(g0 && g0.short === "Ground-0 Audit", "desktop label is 'Ground-0 Audit'");
ok(g0 && g0.glyph === "⚖", "scales glyph on the icon");
ok(typeof globalThis.shell?.init === "function", "window manager exposed (window.shell.init)");
const ocmObservationNodes = [
  ["0•116•000•0012•MKT", "good-intelligence", "Market Context"],
  ["0•009•000•0013•SUN", "uts", "Sun"],
  ["0•163•000•0014•MOON", "uts", "Moon"]
];
for (const [address, appId, name] of ocmObservationNodes) {
  const node = globalThis.OCM_DATA?.nodes.find(item => item.addr === address);
  ok(!!node && node.name === name && node.app === appId, `OCM ${name} node is registered at ${address} with app ID ${appId}`);
  ok(globalThis.APPS.some(app => app.id === appId), `OCM ${name} app ID ${appId} resolves in APPS`);
}

/* ── run the REAL desktop builder ─────────────────────────────── */
globalThis.shell.init();

/* ── UTS display-only clock, calendar, and duration calculator ── */
const utsApi = globalThis.HOSUTS;
ok(!!utsApi, "the UTS conversion and watch module loads from index.html");
if (utsApi) {
  const oneUy = utsApi.durationToUnits(1, "UY");
  ok(Math.abs(oneUy.earthSeconds - 0.105264822906) < 1e-12, "one UY converts to about 0.105264823 Earth seconds");
  const hundredUy = utsApi.durationToUnits(100, "UY");
  ok(Math.abs(hundredUy.earthSeconds - 10.5264822906) < 1e-9, "100 UY converts to about 10.52648229 Earth seconds");
  const epoch = utsApi.uDateParts(new Date("2026-10-02T00:00:00Z"));
  ok(epoch.wholeUY === "4136836127942000000" && epoch.fractionUY === "000000", "approximate anchor yields the corrected UDate coordinate");
  ok(utsApi.formatUDateScientific(new Date("2026-10-02T00:00:00Z")).includes("4.136 × 10^18"), "Home Screen UDate uses clear scientific notation");

  const homeWidget = body.querySelector("#home-time-widget");
  const localClock = body.querySelector("#home-local-clock");
  const calendarDays = body.querySelector("#home-calendar-days");
  ok(!!homeWidget && !!localClock && !!calendarDays, "Home Screen includes the local clock and Gregorian calendar widget");
  ok(!!(localClock && localClock.textContent && localClock.textContent !== "—"), "Home Screen clock is populated from the device clock");
  const homeMoon = body.querySelector("#home-moon-phase");
  const homeSun = body.querySelector("#home-sun-cycle");
  ok(!!(homeMoon && homeMoon.textContent.includes("Moon") && !homeMoon.textContent.includes("unavailable")), "Home Screen shows an approximate lunar phase readout");
  ok(!!(homeSun && homeSun.textContent.includes("Sun annual cycle") && homeSun.textContent.includes("declination")), "Home Screen labels solar context as an annual cycle and declination, not phases");
  ok(!!(calendarDays && calendarDays.querySelectorAll(".home-cal-day").length >= 35), "Home Screen renders a Monday-first monthly calendar grid");
  /* The Home Screen clock can be minimized. On phones and tablets it is a card
     at the top of the desktop's scroll flow rather than a floating overlay, so
     either state leaves every icon reachable (see css/uts.css). */
  const widget = body.querySelector("#home-time-widget");
  const widgetToggle = body.querySelector("#home-widget-toggle");
  const widgetBody = body.querySelector("#home-time-body");
  ok(!!widgetToggle && !!widgetBody, "Home Screen clock exposes a minimize control and a collapsible body");
  if (widget && widgetToggle && widgetBody) {
    ok(widgetToggle.attrs["aria-expanded"] === "true", "the clock starts expanded and says so");
    widgetToggle.click();
    ok(widget.classList.contains("is-collapsed"), "the minimize control collapses the clock card");
    ok(widgetBody.hidden === true, "the collapsed clock removes its body from the layout");
    ok(widgetToggle.attrs["aria-expanded"] === "false", "the collapsed clock reports its state");
    widgetToggle.click();
    ok(!widget.classList.contains("is-collapsed") && widgetBody.hidden !== true, "the control restores the full clock and calendar");
  }

  const utsOpen = body.querySelector("#home-uts-open");
  if (utsOpen) utsOpen.click();
  const utsWindow = shell.windows.get("uts");
  ok(!!utsWindow, "Home Screen UTS link opens the UTS Watch & Converter app");
  if (utsWindow) {
    ok((utsWindow.body.textContent || "").includes("DISPLAY ONLY — NO AUTHORITY EFFECT"), "UTS app explicitly disclaims authority effects");
    const moonName = utsWindow.body.querySelector("#uts-moon-name");
    const moonMeta = utsWindow.body.querySelector("#uts-moon-meta");
    const sunArc = utsWindow.body.querySelector("#uts-sun-arc");
    const celestialNote = utsWindow.body.querySelector(".uts-celestial-note");
    ok(!!(moonName && moonName.textContent && moonName.textContent !== "—"), "UTS app renders the current lunar phase");
    ok(!!(moonMeta && moonMeta.textContent.includes("illuminated") && moonMeta.textContent.includes("lunar age")), "UTS app renders approximate illumination and lunar age");
    ok(!!(sunArc && sunArc.textContent.includes("solstice") && !sunArc.textContent.includes("Moon")), "UTS app renders the solar annual arc without lunar phase language");
    ok(!!(celestialNote && celestialNote.textContent.includes("does not calculate local sunrise/sunset")), "UTS app disclaims location-specific sunrise, sunset, and visibility");
    const input = utsWindow.body.querySelector("#uts-value");
    const unit = utsWindow.body.querySelector("#uts-unit");
    if (input) input.value = "100";
    if (unit) unit.value = "UY";
    const convert = utsWindow.body.querySelector("#uts-convert");
    if (convert) convert.click();
    const result = utsWindow.body.querySelector("#uts-results");
    ok(!!(result && result.textContent.includes("10.526482")), "UTS app converts a user-entered duration and renders the result");
  }
}

/* ── The Grand Architecture: read-only Convergence-era architecture reader ── */
const grandApp = globalThis.APPS.find(a => a.id === "grand-architecture");
ok(!!grandApp, "The Grand Architecture is registered in APPS");
ok(!!(grandApp && grandApp.short === "Grand Architecture"), "desktop label is 'Grand Architecture'");
ok(!!(grandApp && grandApp.glyph === "◭"), "the architecture glyph is on the icon");
const grandData = globalThis.GRAND_ARCHITECTURE;
ok(!!grandData, "the Grand Architecture data module loads from index.html");
if (grandData) {
  ok(grandData.schema === "harshalos-grand-architecture-v1", "the data module publishes its schema");
  ok(grandData.meta.provenanceClass === "FICTION" && grandData.meta.evidenceStatus === "NARRATIVE_SANDBOX", "the architecture keeps its fiction provenance");
  ok(grandData.layers.length === 6, "the architecture describes six layers");
  ok(grandData.invariants.length === 7 && grandData.invariants.every(i => /^GA-INV-\d{3}$/.test(i.id)), "seven architecture invariants carry stable IDs");
  ok(grandData.canonicalAnchors.length === 20, "twenty canonical quantity anchors reach the app");
  ok(grandData.addressRegistry.distinctInstances === 358, "the registry keeps the render spec's 358 named instances");
  ok(grandData.notClaims.length >= 6, "the app publishes explicit non-claims");

  const grandWindow = shell.openApp(grandApp);
  ok(!!grandWindow, "The Grand Architecture window opens");
  if (grandWindow) {
    const text = grandWindow.body.textContent || "";
    ok(text.includes("READ-ONLY REFERENCE — NO AUTHORITY EFFECT"), "the app disclaims authority effects on open");
    ok(text.includes("GA-INV-003") && text.includes("Conservation before narrative"), "the invariants render in the window");
    ok(text.includes("2.190632 m³/s") && text.includes("169 days"), "canonical anchors render with the card's figures");
    ok(text.includes("The architecture (Book I) is the library"), "the publishing hierarchy is stated");
    ok(grandWindow.body.querySelectorAll(".ga-layer").length === 6, "all six layer cards render");

    const focusT2 = grandWindow.body.querySelector("#ga-focus-GA-2");
    if (focusT2) focusT2.click();
    ok(grandWindow.body.querySelectorAll(".ga-layer").length === 1, "focusing a layer narrows the layer cards");
    ok((grandWindow.body.textContent || "").includes("Mistveil City"), "the focused layer is the civic layer");
    const focusAll = grandWindow.body.querySelector("#ga-focus-all");
    if (focusAll) focusAll.click();
    ok(grandWindow.body.querySelectorAll(".ga-layer").length === 6, "clearing the focus restores every layer");

    const filter = grandWindow.body.querySelector("#ga-filter");
    const apply = grandWindow.body.querySelector("#ga-filter-apply");
    if (filter) filter.value = "reservoir";
    if (apply) apply.click();
    const filtered = grandWindow.body.querySelectorAll("#ga-anchor-rows tr");
    ok(filtered.length === 2, `the anchor filter narrows to matching rows (${filtered.length}/2)`);
    ok((grandWindow.body.querySelector("#ga-anchor-count").textContent || "").startsWith("2 / 20"), "the anchor counter reports the filtered size");
    const clear = grandWindow.body.querySelector("#ga-filter-clear");
    if (clear) clear.click();
    ok(grandWindow.body.querySelectorAll("#ga-anchor-rows tr").length === 20, "clearing the filter restores every anchor");
    ok((grandWindow.body.querySelector("#ga-filter").value || "") === "", "the cleared filter empties the input");
  }
}

const field = body.querySelector("#icon-field");
ok(!!field, "desktop icon field exists");
const icons = field ? field.querySelectorAll(".desk-icon") : [];
ok(icons.length === globalThis.APPS.length, `every app gets a desktop icon (${icons.length}/${globalThis.APPS.length})`);
const iconLabels = icons.map(icon => icon.querySelector(".di-label")?.textContent || "");
const alphabeticLabels = [...iconLabels].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true }));
ok(iconLabels.every((label, index) => label === alphabeticLabels[index]), "desktop icons follow a stable alphabetical reading order");
const newsIcon = icons.find(i => (i.textContent || "").includes("News"));
ok(!!newsIcon, "standalone News icon is on the desktop");
ok(!!(newsIcon && newsIcon.attrs["aria-label"] === "Open News"), "News icon exposes its own accessible launch action");
const g0icon = icons.find(i => (i.textContent || "").includes("Ground-0 Audit"));
ok(!!g0icon, "Ground-0 Audit icon is on the desktop");
ok(!!(g0icon && (g0icon.textContent || "").includes("⚖")), "the icon shows the scales glyph");
ok(!!(g0icon && g0icon.attrs["aria-label"] === "Open Ground-0 Audit"), "every icon exposes an accessible full-name action");

/* ── double-click the icon → the Ground-0 window opens ────────── */
if (g0icon) {
  g0icon.dblclick();
  const windows = body.querySelectorAll(".window");
  const g0win = windows.find(w => (w.textContent || "").includes("Ground-0 Phase Intelligence") || (w.textContent || "").includes("Ground-0 Audit"));
  ok(!!g0win, "double-click opens the Ground-0 Audit window");
  ok(!!(g0win && (g0win.textContent || "").includes("Frontier AI developer")), "the opened window shows the Ground-0 overview content");
}

/* ── tap lifecycle: pointerdown must not destroy controls ──────── */
if (g0icon) {
  g0icon.click();
  const rec = shell.windows.get("ground0");
  ok(!!rec, "a single tap opens the Ground-0 app");
  const taskbarButtons = () => body.querySelector("#taskbar-apps").children;
  const taskButton = taskbarButtons().find(button => (button.textContent || "").includes("Ground-0 Audit"));
  dispatch(rec.body, "pointerdown");
  ok(taskbarButtons().find(button => (button.textContent || "").includes("Ground-0 Audit")) === taskButton,
    "pointerdown in the focused app preserves its taskbar button until click");
  const min = rec.el.querySelector(".win-ctl.min");
  dispatch(min, "pointerdown");
  min.click();
  ok(rec.el.classList.contains("minimized"), "tap on minimize hides the app");
  const restoreButton = taskbarButtons().find(button => (button.textContent || "").includes("Ground-0 Audit"));
  ok(!!restoreButton, "the minimized app retains its own taskbar button");
  restoreButton?.click();
  ok(!rec.el.classList.contains("minimized"), "taskbar tap restores the app");
  const close = rec.el.querySelector(".win-ctl.close");
  dispatch(close, "pointerdown");
  close.click();
  ok(!shell.windows.has("ground0"), "tap on close removes the app");
  g0icon.click();
  ok(shell.windows.has("ground0"), "desktop tap reopens a closed app");
}
body.querySelector("#origin-menu").hidden = true; // mini-DOM does not reflect boolean attributes
const originButton = body.querySelector("#origin-btn");
originButton.click();
ok(originButton.attrs["aria-expanded"] === "true", "Origin tap exposes expanded state");
originButton.click();
ok(originButton.attrs["aria-expanded"] === "false", "second Origin tap closes the menu");

/* ── Human Key is visibly and functionally demo-only ───────────── */
const humanKeyApp = globalThis.APPS.find(app => app.id === "humankey");
ok(!!humanKeyApp, "Human Key demo panel is registered");
if (humanKeyApp) {
  globalThis.shell.openApp(humanKeyApp);
  const hkwin = body.querySelectorAll(".window").find(win => (win.textContent || "").includes("Human Key — Demo Only"));
  ok(!!hkwin, "Human Key panel opens in the desktop");
  ok(!!(hkwin && (hkwin.textContent || "").includes("DEMO ONLY — NOT AUTHENTICATION")), "Human Key panel prominently disclaims authentication");
  ok(!!(hkwin && (hkwin.textContent || "").includes("HOS production-authorization path")), "Human Key panel states production authentication is unavailable");
}
const productionAttempt = globalThis.HOS.requestProductionAttestation();
ok(productionAttempt.code === "PRODUCTION-AUTHENTICATOR-UNAVAILABLE", "production attestation fails closed from the actual page bundle");
const pdhApp = globalThis.APPS.find(app => app.id === "pdh");
ok(!!pdhApp, "Phase Declaration app is registered");
if (pdhApp) {
  shell.openApp(pdhApp);
  const pdhWindow = body.querySelectorAll(".window").find(win => (win.textContent || "").includes("Phase Declaration Header — Demo"));
  ok(!!(pdhWindow && (pdhWindow.textContent || "").includes("§HARSHAL§ + HARSHAL + (HARSHAL)")), "the live PDH display uses the exact section-marked Creator-ID formula");
}

/* ── Adversarial Mode runs refusal-only probes against the real HOS API ── */
const adversarialApp = globalThis.APPS.find(app => app.id === "adversarial");
ok(!!adversarialApp, "Adversarial Mode is registered in APPS");
const operationalSnapshot = () => {
  const s = HOS.observe();
  return JSON.stringify({ bootId: s.bootId, H: s.H, A: s.A, R: s.R, phase: s.phase, declared: s.declared, attestation: s.attestation, session: s.session, gsrbAck: s.gsrbAck, voidMode: s.voidMode });
};
if (adversarialApp) {
  await HOS.ready;
  const before = operationalSnapshot();
  const ledgerBefore = HOS.getLedger().length;
  shell.openApp(adversarialApp);
  const attackWindow = body.querySelectorAll(".window").find(win => (win.textContent || "").includes("Adversarial Mode"));
  ok(!!attackWindow, "Adversarial Mode opens in the real shell");
  const runAll = attackWindow && attackWindow.querySelector("#adv-run-all");
  ok(!!runAll && runAll.listeners.click.length === 1, "the window exposes a run-all attack control");
  if (runAll && runAll.listeners.click[0]) await runAll.listeners.click[0]();
  const results = attackWindow ? attackWindow.querySelectorAll("[data-attack-result]") : [];
  ok(results.length === 7, `the UI presents all seven attack results (${results.length}/7)`);
  ok(results.length === 7 && results.every(result => (result.textContent || "").includes("REFUSED — PASS")), "all displayed probes were refused and passed their operational-state checks");
  ok(attackWindow && attackWindow.textContent.includes("ATTACK → GATE → REFUSAL → LEDGER"), "the report shows the attack-to-ledger demonstration path");
  ok(operationalSnapshot() === before, "the refusal suite leaves live HOS authority-bearing state unchanged");
  ok(HOS.getLedger().length >= ledgerBefore + 7, "each probe appends a descriptive local demo-ledger report row");
}

/* ── Guided refusal demo is one-button and does not touch live HOS ─ */
const guidedApp = globalThis.APPS.find(app => app.id === "guided-demo");
ok(!!guidedApp, "Guided Demonstration is registered in APPS");
if (guidedApp) {
  const beforeState = operationalSnapshot();
  const beforeLedger = HOS.getLedger().length;
  shell.openApp(guidedApp);
  const guidedWindow = body.querySelectorAll(".window").find(win => (win.textContent || "").includes("Guided Refusal Demonstration"));
  ok(!!guidedWindow, "Guided Demonstration opens in the real desktop shell");
  const runButton = guidedWindow && guidedWindow.querySelector("#guided-run");
  ok(!!runButton && runButton.textContent === "RUN REFUSAL DEMO" && runButton.listeners.click.length === 1, "the app exposes a single RUN REFUSAL DEMO control");
  ok(!!(guidedWindow && (guidedWindow.textContent || "").includes("fresh, disposable browser frame")), "the UI explains that the scenario uses a disposable kernel frame");
  ok(!!(guidedWindow && (guidedWindow.textContent || "").includes("CWO → refusal regardless of legitimacy")), "the ordered scenario includes the CWO refusal checkpoint");
  ok(!!(guidedWindow && (guidedWindow.textContent || "").includes("GSRB → explicit sovereign override")), "the ordered scenario includes the explicit GSRB override checkpoint");
  ok(body.querySelectorAll("iframe").length === 0, "opening the app does not start or mutate a demo instance");
  ok(operationalSnapshot() === beforeState && HOS.getLedger().length === beforeLedger, "opening the guided app leaves live HOS state and ledger unchanged");

  if (runButton && runButton.listeners.click[0]) runButton.listeners.click[0]();
  const demoFrame = body.querySelector("iframe");
  ok(!!demoFrame && demoFrame.attrs.sandbox === "allow-scripts", "the run control creates a script-only sandbox with no same-origin grant");
  ok(!!(demoFrame && String(demoFrame.srcdoc).includes("kernel.js?v=2026-09-30o") && String(demoFrame.srcdoc).includes("guided-demo.js?v=2026-09-30b")), "the disposable frame loads the real kernel and shared scenario runner");
  globalThis.dispatchWindowEvent("message", {
    source: {},
    data: { schema: "HOS-GUIDED-REFUSAL-DEMO-1", type: "complete", ok: true, completed: 7, total: 7 }
  });
  const stillRunning = body.querySelectorAll(".window").find(win => (win.textContent || "").includes("Guided Refusal Demonstration"));
  ok(!!(stillRunning && (stillRunning.textContent || "").includes("RUNNING REFUSAL DEMO")), "a message from outside the child frame cannot spoof scenario completion");
  const stepIds = ["no-human-key", "human-key-present", "degraded-addressability", "expired-time", "reattestation", "cwo-refusal", "gsrb-override"];
  for (const [index, id] of stepIds.entries()) {
    globalThis.dispatchWindowEvent("message", {
      source: demoFrame && demoFrame.contentWindow,
      data: {
        schema: "HOS-GUIDED-REFUSAL-DEMO-1",
        type: "step",
        step: {
          id, title: id, expected: "EXPECTED", code: "EXPECTED", secondaryCode: "", permitted: false,
          state: { H: 0, A: 1, R: 1, phase: "NAB", legitimacy: 0, deltaSeconds: null },
          details: "transport harness checkpoint",
          ledger: { id: index + 1, hash: "a".repeat(64), verified: true }, pass: true
        }
      }
    });
  }
  globalThis.dispatchWindowEvent("message", {
    source: demoFrame && demoFrame.contentWindow,
    data: { schema: "HOS-GUIDED-REFUSAL-DEMO-1", type: "complete", ok: true, completed: 7, total: 7 }
  });
  const completedWindow = body.querySelectorAll(".window").find(win => (win.textContent || "").includes("Guided Refusal Demonstration"));
  ok(!!(completedWindow && completedWindow.querySelectorAll("[data-guided-result]").length === 7), "the UI displays all seven ordered reports received from its own frame");
  ok(!!(completedWindow && (completedWindow.textContent || "").includes("7/7 PASS · COMPLETE")), "the UI reports completion only after all seven checkpoints pass");
  ok(body.querySelectorAll("iframe").length === 0, "the disposable frame is removed after the scenario finishes");
  ok(operationalSnapshot() === beforeState && HOS.getLedger().length === beforeLedger, "the full guided UI round-trip does not mutate live HOS state or ledger");
}

/* ── Good Intelligence app is native to the shell and GET-only ── */
const giApp = globalThis.APPS.find(app => app.id === "good-intelligence");
ok(!!giApp, "Good Intelligence read-only app is registered");
const giCalls = [];
const originalFetch = globalThis.fetch;
const marketClose = index => 100 + index * 0.018 + Math.sin(index / 9) * 2.4 + Math.sin(index / 3.5) * 0.8 + Math.sin(index / 26) * 2;
const marketBars = Array.from({ length: 360 }, (_, index) => {
  const close = marketClose(index);
  const open = index ? marketClose(index - 1) : close - 0.12;
  return {
    time: new Date(Date.now() - (359 - index) * 60 * 60_000).toISOString(),
    open, high: Math.max(open, close) + 0.2, low: Math.min(open, close) - 0.2, close,
    volume: 1000 + 100 * (1 + Math.sin(index / 5)), confirmed: true
  };
});
const demoMarketStories = ["AAPL-DEMO", "MSFT-DEMO", "NVDA-DEMO", "INTC-DEMO"].map((symbol, tickerIndex) => {
  const offset = tickerIndex * 35;
  const bars = marketBars.map(bar => ({
    ...bar, open: bar.open + offset, high: bar.high + offset,
    low: bar.low + offset, close: bar.close + offset
  }));
  return {
    _id: tickerIndex === 0 ? "story-test-1" : `story-market-${symbol}`,
    title: tickerIndex === 0 ? "[DEMO] Test-market signal" : `[DEMO] ${symbol} market signal`,
    body: tickerIndex === 0 ? "Evidence-backed read-only preview. Synthetic test fixture only; generated OHLCV bars are not real prices." : "Synthetic test fixture only; generated OHLCV bars are not real prices.", category: "Markets",
    address: "EMPTY-DEMO-MARKET-TEST", providerName: "Synthetic desktop fixture", block: 42, demo: true,
    marketContext: { schema: "gi-market-context-v1", synthetic: true, source: "desktop test synthetic bars", symbol, timeframe: "1h", bars }
  };
});
let giOmitMarketContext = false;
globalThis.fetch = async (url, options) => {
  giCalls.push({ url: String(url), options });
  let payload;
  if (String(url).endsWith("/content/me")) {
    const data = giOmitMarketContext
      ? demoMarketStories.map(({ marketContext, ...story }) => story)
      : demoMarketStories;
    payload = { success: true, data };
  } else if (String(url).endsWith("/categories")) {
    payload = { success: true, data: [{ _id: "category-markets", name: "Markets" }] };
  } else if (String(url).includes("/rank?")) {
    payload = { success: true, data: [{ address: "0x1234567890abcdef1234567890abcdef12345678", rank: 1, score: 88, tokens: "12" }] };
  } else if (String(url).includes("/market/tickerbot/bars?")) {
    const requestUrl = new URL(String(url), "https://os.example.test");
    payload = {
      success: true, environment: "tickerbot",
      data: { schema: "gi-market-context-v1", synthetic: false, source: "Tickerbot · split-adjusted OHLCV", symbol: requestUrl.searchParams.get("symbol"), timeframe: requestUrl.searchParams.get("interval"), bars: marketBars }
    };
  } else {
    payload = { success: false, message: "Unexpected route" };
  }
  return {
    ok: true, status: 200,
    headers: { get: name => name.toLowerCase() === "content-type" ? "application/json" : null },
    json: async () => payload
  };
};
if (giApp) {
  const ledgerBefore = HOS.getLedger().length;
  shell.openApp(giApp);
  const giWindow = shell.windows.get("good-intelligence");
  ok(!!giWindow, "Good Intelligence opens as a HarshalOS desktop window");
  ok(giApp.fullscreen === true, "Good Intelligence requests a whole-app window fullscreen control");
  const appFullscreen = giWindow && giWindow.el.querySelector(".win-ctl.fullscreen");
  ok(!!(appFullscreen && appFullscreen.attrs.type === "button" && appFullscreen.attrs["aria-pressed"] === "false"),
    "the titlebar has a dedicated accessible fullscreen button separate from the Orb model control");
  if (appFullscreen) {
    appFullscreen.click();
    await new Promise(resolve => setImmediate(resolve));
    ok(giWindow.el.classList.contains("window-fullscreen") && appFullscreen.attrs["aria-pressed"] === "true",
      "one click uses the fixed-viewport fallback when native fullscreen is unavailable");
    dispatch(giWindow.el.querySelector(".win-title"), "pointerdown");
    ok(giWindow.el.classList.contains("window-fullscreen"), "a fullscreen fallback window cannot be dragged out of the viewport");
    appFullscreen.click();
    await new Promise(resolve => setImmediate(resolve));
    ok(!giWindow.el.classList.contains("window-fullscreen") && appFullscreen.attrs["aria-pressed"] === "false",
      "the same control exits fallback fullscreen and reports its state");

    giWindow.el.requestFullscreen = async () => { document.fullscreenElement = giWindow.el; };
    document.exitFullscreen = async () => { document.fullscreenElement = null; };
    appFullscreen.click();
    await new Promise(resolve => setImmediate(resolve));
    ok(appFullscreen.attrs["aria-pressed"] === "true" && !giWindow.el.classList.contains("window-fullscreen"),
      "the control prefers the browser Fullscreen API when available");
    appFullscreen.click();
    await new Promise(resolve => setImmediate(resolve));
    ok(appFullscreen.attrs["aria-pressed"] === "false" && !document.fullscreenElement,
      "the titlebar control exits native fullscreen for the whole app window");
    delete giWindow.el.requestFullscreen;
    delete document.exitFullscreen;
    delete document.fullscreenElement;
  }
  ok(osCss.includes(".window.window-fullscreen") && osCss.includes(".window:fullscreen")
    && mobileCss.includes(".window.window-fullscreen"), "fullscreen has desktop, native, and mobile app-viewport styling");
  ok(!!(giWindow && giWindow.body.innerHTML.includes("Signal desk") && giWindow.body.innerHTML.includes("READ-ONLY VIEW")), "the first release clearly identifies its read-only intel dashboard");
  const demoBanner = giWindow && giWindow.body.querySelector("[data-gi-demo-mode]");
  ok(!!(demoBanner && demoBanner.hidden === false), "the default endpoint is visibly identified as synthetic empty.domains demo data");
  await new Promise(resolve => setImmediate(resolve));
  const giText = giWindow ? giWindow.body.textContent : "";
  ok(giText.includes("DEMO FIXTURES CONNECTED"), "the connection status does not call the demo feed live intelligence");
  ok(giText.includes("Test-market signal"), "feed data is rendered in the dashboard");
  ok(giText.includes("Evidence-backed read-only preview."), "API HTML is rendered as inert plain text");
  ok(giText.includes("ASSURANCE · NOT SCORED"), "signals without an assurance packet remain explicitly unscored");
  const giStory = giWindow && giWindow.body.querySelector("[data-gi-item]");
  if (giStory) giStory.click();
  const giDetailText = giWindow ? giWindow.body.textContent : "";
  ok(giDetailText.includes("Assurance index") && giDetailText.includes("UNASSESSED"), "the signal detail panel explains missing assurance inputs without granting trust or actionability");
  ok(giDetailText.includes("NO SIGNED ATTESTATION · API-REPORTED"), "unsigned external packets remain clearly labeled as API-reported rather than independently verified");
  ok(giDetailText.includes("VFI + Fibonacci Bands + WaveTrend") && giDetailText.includes("SYNTHETIC MARKET DATA · NOT LIVE"), "optional technical context renders separately and labels its OHLCV bars synthetic");
  ok(giDetailText.includes("PRICE/VOLUME CONTEXT · NOT ASSURANCE"), "market indicators do not merge into the source/claim assurance score");
  const marketTab = giWindow && giWindow.body.querySelector('[data-gi-view="markets"]');
  if (marketTab) marketTab.click();
  const marketPanel = giWindow && giWindow.body.querySelector("[data-gi-markets-panel]");
  const marketSelect = giWindow && giWindow.body.querySelector("[data-gi-market-select]");
  const marketHost = giWindow && giWindow.body.querySelector("[data-gi-market-chart-host]");
  const marketProvider = giWindow && giWindow.body.querySelector("[data-gi-market-provider]");
  const marketInterval = giWindow && giWindow.body.querySelector("[data-gi-market-interval]");
  ok(!!(marketTab && marketPanel && marketPanel.hidden === false), "Market Charts is a dedicated navigable dashboard tab");
  ok(!!(marketProvider && marketProvider.value === "tickerbot" && marketProvider.querySelectorAll("option")[0].attrs.value === "tickerbot" && marketProvider.querySelectorAll("option")[1].attrs.value === "demo"), "Tickerbot Live is the first dropdown option and the default data source");
  ok(!!(marketInterval && marketInterval.disabled === false), "the default live source enables bar intervals");
  if (marketProvider) { marketProvider.value = "demo"; dispatch(marketProvider, "change"); }
  ok(!!(marketInterval && marketInterval.disabled === true), "the synthetic demo source disables the live-only bar interval");
  ok(!!(marketSelect && marketSelect.querySelectorAll("option").length === 4 && ["AAPL-DEMO", "MSFT-DEMO", "NVDA-DEMO", "INTC-DEMO"].every(symbol => marketSelect.innerHTML.includes(symbol))), "ticker selector lists every clearly synthetic demo symbol, including the newly added history");
  ok(!!(marketHost && marketHost.querySelectorAll("svg.gi-market-svg").length === 3 && marketHost.innerHTML.includes("PRICE OVERLAY") && marketHost.innerHTML.includes("VFI oscillator") && marketHost.innerHTML.includes("WaveTrend")), "Market Charts renders responsive SVG price, VFI, and WaveTrend graphs");
  ok(!!(marketHost && marketHost.textContent.includes("SYNTHETIC OHLCV · NOT REAL MARKET PRICES")), "chart summary warns that demo prices are synthetic and not real market data");
  if (marketSelect && marketHost) {
    marketSelect.value = "story-market-MSFT-DEMO";
    dispatch(marketSelect, "change");
  }
  ok(!!(marketHost && marketHost.textContent.includes("MSFT-DEMO")), "changing the ticker selection redraws the chart series");
  const marketSearch = giWindow && giWindow.body.querySelector("[data-gi-market-search]");
  const marketClear = giWindow && giWindow.body.querySelector("[data-gi-market-clear]");
  const marketCount = giWindow && giWindow.body.querySelector("[data-gi-market-count]");
  ok(!!(marketSearch && marketClear && marketCount), "Market Charts has an accessible tracked-ticker search, clear control, and result count");
  if (marketSearch) { marketSearch.value = "intel"; dispatch(marketSearch, "input"); }
  ok(!!(marketSelect && marketSelect.value === "story-market-INTC-DEMO" && marketSelect.querySelectorAll("option").length === 1 && marketHost.textContent.includes("INTC-DEMO") && marketCount.textContent === "1 of 4 tracked tickers"), "demo search resolves a company name from the shared watchlist for the newly added synthetic ticker");
  if (marketSearch) { marketSearch.value = " nvDA "; dispatch(marketSearch, "input"); }
  ok(!!(marketSelect && marketSelect.querySelectorAll("option").length === 1 && marketHost.textContent.includes("NVDA-DEMO") && marketCount.textContent === "1 of 4 tracked tickers"), "ticker search filters demo symbols case-insensitively and updates the selected chart");
  if (marketSearch) { marketSearch.value = "untracked"; dispatch(marketSearch, "input"); }
  ok(!!(marketSelect && marketSelect.disabled && marketHost.textContent.includes("No tracked tickers match") && marketHost.querySelectorAll("svg").length === 0), "an unmatched search displays an empty state rather than the previous ticker's chart");
  if (marketClear) marketClear.click();
  ok(!!(marketSelect && !marketSelect.disabled && marketSelect.querySelectorAll("option").length === 4 && marketSearch.value === "" && marketSearch._focused), "clearing restores the watchlist and keyboard focus");
  const dashboardCalls = () => giCalls.filter(call => !call.url.includes("/market/tickerbot/bars?"));
  ok(dashboardCalls().length === 3 && giCalls.every(call => call.options.method === "GET"), "local demo ticker searches issue no extra API calls");
  ok(giCalls.every(call => call.url.startsWith("/api/good-intelligence/v1/")), "the default client stays on the same-origin demo API instead of calling the live host");
  ok(giCalls.some(call => call.url.endsWith("/content/me") && call.options.credentials === "include"), "the protected member feed can use an existing GI session cookie");
  ok(giCalls.filter(call => !call.url.endsWith("/content/me")).every(call => call.options.credentials === "same-origin"), "public endpoints do not send cross-origin cookies");
  giOmitMarketContext = true;
  const refreshButton = giWindow && giWindow.body.querySelector("[data-gi-refresh]");
  if (refreshButton) refreshButton.click();
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  ok(!!(marketHost && marketHost.textContent.includes("No ticker bars supplied") && marketHost.textContent.includes("No prices or line charts are fabricated")), "a configured API with no OHLCV shows an explicit empty state instead of invented prices");
  ok(!!(marketHost && marketHost.querySelectorAll("svg.gi-market-svg").length === 0), "no line graph is drawn when the API supplies no ticker bars");
  ok(dashboardCalls().length === 6 && giCalls.every(call => call.options.method === "GET"), "refresh remains read-only when the Market Charts panel is open");
  if (marketProvider) {
    marketProvider.value = "tickerbot";
    dispatch(marketProvider, "change");
  }
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  ok(!!(marketHost && marketHost.querySelectorAll("svg.gi-market-svg").length === 3 && marketHost.textContent.includes("TICKERBOT-SUPPLIED OHLCV · NOT INDEPENDENTLY VERIFIED")), "Tickerbot Live renders real-provider OHLCV through the existing Pine indicator charts");
  ok(!!(marketSelect && marketSelect.innerHTML.includes("AAPL · TICKERBOT") && marketInterval && marketInterval.disabled === false), "Tickerbot mode switches to the live watchlist and enables bar intervals");
  const liveWatchlist = giApp && Array.isArray(giApp.tickerbotWatchlist) ? giApp.tickerbotWatchlist : [];
  ok(!!(liveWatchlist.length >= 40 && ["INTC", "AMD", "MSFT", "NET", "CVX", "XOM"].every(symbol => liveWatchlist.some(entry => entry.symbol === symbol))), "the configured Tickerbot watchlist enables the requested semiconductor, cloud, and energy tickers");
  ok(!!(liveWatchlist.every(entry => /^[A-Z]{1,5}$/.test(entry.symbol) && entry.name && entry.sector) && new Set(liveWatchlist.map(entry => entry.symbol)).size === liveWatchlist.length), "every live watchlist entry is a unique, named, sector-labeled symbol");
  ok(!!(marketSelect && marketSelect.querySelectorAll("option").length === liveWatchlist.length && marketSelect.innerHTML.includes('<optgroup label="Energy">')), "the live ticker selector lists the whole watchlist, grouped by sector");
  const tickerbotCall = giCalls.find(call => call.url.includes("/market/tickerbot/bars?"));
  ok(!!(tickerbotCall && tickerbotCall.options.method === "GET" && tickerbotCall.options.credentials === "same-origin" && !tickerbotCall.options.headers.Authorization), "the browser calls only the same-origin Worker and never receives the Tickerbot key");
  if (marketInterval) {
    marketInterval.value = "1d";
    dispatch(marketInterval, "change");
  }
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  ok(!!(marketHost && marketHost.textContent.includes("1d") && giCalls.some(call => call.url.includes("/market/tickerbot/bars?symbol=AAPL&interval=1d"))), "switching bar interval requests a fresh Tickerbot series and redraws indicators");
  if (marketSearch) { marketSearch.value = " miCROsoft "; dispatch(marketSearch, "input"); }
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  ok(!!(marketSelect && marketSelect.value === "MSFT" && marketSelect.querySelectorAll("option").length === 1 && marketHost.textContent.includes("MSFT") && marketCount.textContent === `1 of ${liveWatchlist.length} tracked tickers`), "Tickerbot search accepts company names and selects the matching live watchlist symbol");
  ok(giCalls.some(call => call.url.includes("/market/tickerbot/bars?symbol=MSFT&interval=1d")), "a live search requests only the allowlisted ticker through the same-origin Worker");
  if (marketSearch) { marketSearch.value = " exxon "; dispatch(marketSearch, "input"); }
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  ok(!!(marketSelect && marketSelect.value === "XOM" && marketSelect.querySelectorAll("option").length === 1 && marketHost.textContent.includes("XOM") && marketSelect.innerHTML.includes('<optgroup label="Energy">')), "newly enabled energy tickers are searchable and grouped under their sector");
  ok(giCalls.some(call => call.url.includes("/market/tickerbot/bars?symbol=XOM&interval=1d")), "a newly enabled ticker also goes only through the same-origin Worker");
  const callsBeforeUnknownTicker = giCalls.length;
  if (marketSearch) { marketSearch.value = "ZZZZ"; dispatch(marketSearch, "input"); }
  await new Promise(resolve => setImmediate(resolve));
  ok(giCalls.length === callsBeforeUnknownTicker && marketHost.textContent.includes("No tracked tickers match"), "a ticker outside the configured watchlist sends no provider request");
  if (marketSearch) { marketSearch.value = '<img src=x onerror="attack()">'; dispatch(marketSearch, "input"); }
  ok(marketHost.innerHTML.includes("&lt;img") && !marketHost.querySelector("img"), "search text is escaped in the no-result message and is never executable markup");
  if (marketClear) marketClear.click();
  ok(!!(marketSelect && marketSelect.querySelectorAll("option").length === liveWatchlist.length && marketSearch.value === ""), "clearing a live search restores all configured tickers");

  // A response to a previously matching query must not replace the new empty
  // state after the reviewer searches for an unsupported symbol.
  const tickerFetch = globalThis.fetch;
  let releaseLateTicker = null;
  globalThis.fetch = (url, options) => String(url).includes("symbol=NVDA")
    ? new Promise(resolve => { releaseLateTicker = () => resolve(tickerFetch(url, options)); })
    : tickerFetch(url, options);
  try {
    if (marketSearch) { marketSearch.value = "nvidia"; dispatch(marketSearch, "input"); }
    await new Promise(resolve => setImmediate(resolve));
    ok(!!releaseLateTicker, "a matched ticker begins the live bars request");
    if (marketSearch) { marketSearch.value = "ZZZZ"; dispatch(marketSearch, "input"); }
    if (releaseLateTicker) releaseLateTicker();
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    ok(marketHost.textContent.includes("No tracked tickers match") && marketHost.querySelectorAll("svg").length === 0, "late Tickerbot responses cannot overwrite a no-match search state");
  } finally { globalThis.fetch = tickerFetch; }
  if (marketClear) marketClear.click();
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  /* ── TradingView tab: the vendored Lightweight Charts™ build ── */
  const realChartLibrary = globalThis.LightweightCharts;
  ok(!!(realChartLibrary && typeof realChartLibrary.createChart === "function" && realChartLibrary.version() === "5.2.1"),
    "the vendored TradingView Lightweight Charts™ library loads from index.html");
  const tvTab = giWindow && giWindow.body.querySelector('[data-gi-view="tradingview"]');
  const tvPanel = giWindow && giWindow.body.querySelector("[data-gi-tv-panel]");
  const tvProvider = giWindow && giWindow.body.querySelector("[data-gi-tv-provider]");
  const tvType = giWindow && giWindow.body.querySelector("[data-gi-tv-type]");
  const tvHost = giWindow && giWindow.body.querySelector("[data-gi-tv-host]");
  const orbTab = giWindow && giWindow.body.querySelector('[data-gi-view="orb2"]');
  const orbPanel = giWindow && giWindow.body.querySelector("[data-gi-orb2-panel]");
  const orbHost = giWindow && giWindow.body.querySelector("[data-gi-orb2-host]");
  ok(!!(tvTab && tvPanel && tvPanel.hidden === true), "the TradingView tab stays hidden until it is opened");
  ok(!!(orbTab && orbPanel && orbPanel.hidden === true && orbHost), "the Orb 2 tab and lazy host stay hidden until selected");
  const tabLabels = giWindow ? giWindow.body.querySelectorAll(".gi-tab").map(button => button.textContent.trim()) : [];
  ok(tabLabels.join(" > ") === "News > Market Charts > TradingView > Orb 2 > Intel feed > Rankings", "the main tab strip groups Intel feed and Rankings under News while keeping the chart views");
  ok(!!(tvProvider && tvProvider.value === "tickerbot" && tvProvider.querySelectorAll("option")[0].attrs.value === "tickerbot"), "the TradingView panel also defaults to Tickerbot Live");
  ok(!!(tvType && tvType.querySelectorAll("option").length === 5 && tvType.innerHTML.includes("Candlesticks") && tvType.innerHTML.includes("Baseline")), "the chart-type menu offers the free library's OHLCV series types");
  /* This Node harness has no canvas, so the real library is swapped for a
     recording stub here; what the app hands the library is what gets checked. */
  const chartRecords = { created: 0, removed: 0, series: [], data: [], markers: [], options: null, volumeVisible: null, fitted: 0 };
  const chartStub = {
    CandlestickSeries: { id: "candlestick" }, BarSeries: { id: "bar" }, LineSeries: { id: "line" },
    AreaSeries: { id: "area" }, BaselineSeries: { id: "baseline" }, HistogramSeries: { id: "histogram" },
    version: () => "5.2.1",
    createSeriesMarkers: (series, markers) => { chartRecords.markers.push(markers); return {}; },
    createChart: (container, options) => {
      chartRecords.created += 1;
      chartRecords.options = options;
      const series = {
        setData: rows => { chartRecords.data.push(rows); },
        priceScale: () => ({ applyOptions() {} }),
        applyOptions: patch => { if (patch && "visible" in patch) chartRecords.volumeVisible = patch.visible; }
      };
      return {
        addSeries: (definition, seriesOptions) => { series.definition = definition; chartRecords.series.push(seriesOptions); return series; },
        subscribeCrosshairMove() {},
        timeScale: () => ({ fitContent() { chartRecords.fitted += 1; } }),
        remove() { chartRecords.removed += 1; }
      };
    }
  };
  globalThis.LightweightCharts = chartStub;
  try {
    if (tvTab) tvTab.click();
    ok(!!(tvPanel && tvPanel.hidden === false && marketPanel.hidden === true), "opening TradingView hides the Market Charts panel");
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    const tvText = tvHost ? tvHost.textContent : "";
    ok(chartRecords.created === 1, "the panel creates the chart through the vendored library API");
    ok(!!(tvHost && marketSelect && tvText.includes("TRADINGVIEW LIGHTWEIGHT CHARTS™") && tvText.includes(marketSelect.value) && tvText.includes("latest close")), "the panel mounts the interactive chart card for the selected ticker");
    ok(tvText.includes("TICKERBOT-SUPPLIED OHLCV · NOT INDEPENDENTLY VERIFIED"), "API-supplied bars stay labeled as provider data, not verified prices");
    ok(chartRecords.data.length === 2 && chartRecords.data[0].length === 360 && chartRecords.data[1].length === 360, "the chart receives the full price series and its matching volume series");
    ok(!!(chartRecords.options && chartRecords.options.autoSize === true && chartRecords.options.layout.attributionLogo === false), "the chart uses the desk theme and draws no TradingView logo");
    ok(!!(chartRecords.series.length === 2 && chartRecords.series[0].upColor && chartRecords.series[1].priceFormat.type === "volume"), "candles and a volume histogram are added as separate series");
    ok(!!(tvPanel.querySelector('a[href="https://www.tradingview.com/free-charting-libraries/"]')), "the panel links back to TradingView's free charting libraries page");
    const volumeButton = tvHost && tvHost.querySelector("[data-gi-tv-volume]");
    if (volumeButton) volumeButton.click();
    ok(chartRecords.volumeVisible === false, "the volume toggle hides the histogram without touching the price series");
    if (tvType) { tvType.value = "line"; dispatch(tvType, "change"); }
    await new Promise(resolve => setImmediate(resolve));
    const lineData = chartRecords.data.at(-2);
    ok(!!(chartRecords.series.at(-2) && chartRecords.series.at(-2).color === "#6fd3ff" && lineData && lineData.every(row => "value" in row && !("open" in row))), "switching chart type re-adds a close-only line series");
    if (marketTab) marketTab.click();
    ok(!!(marketPanel.hidden === false && tvPanel.hidden === true), "returning to Market Charts hides the TradingView panel again");
    ok(chartRecords.removed >= 1, "leaving the TradingView tab disposes the library chart");
  } finally { globalThis.LightweightCharts = realChartLibrary; }
  const callsBeforeOrb = giCalls.length;
  if (orbTab) orbTab.click();
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  const orbText = orbHost ? orbHost.textContent : "";
  const orbRequests = giCalls.slice(callsBeforeOrb);
  const orbCanvasStatus = orbHost && orbHost.querySelector("[data-gi-orb2-canvas-status]");
  const modelFullscreen = orbHost && orbHost.querySelector("[data-gi-orb2-fullscreen]");
  ok(!!(orbPanel && orbPanel.hidden === false && tvPanel.hidden === true), "opening Orb 2 hides TradingView and reveals the local OCM panel");
  ok(orbText.includes("ticker orbs") && orbText.includes("TIMEFRAME"), "Orb 2 presents ticker orbs with an interval switch");
  ok(orbText.includes("does not expose a 2D canvas") && orbText.includes("No nodes or routes were invented"), "a no-canvas runtime receives an honest readable Orb 2 fallback");
  ok(giCalls.length === callsBeforeOrb, "opening Orb 2 fetches no Good Intelligence or market payload");
  ok(HOS.getLedger().length === ledgerBefore, "opening, refreshing, searching, and viewing Orb 2 does not write to the HOS ledger");
}
globalThis.fetch = originalFetch;

/* ── The Book: Book 0 artifact, Book I core text, Book II manuscript ── */
const settleTurns = async (turns = 8) => { for (let i = 0; i < turns; i++) await new Promise(resolve => setImmediate(resolve)); };
const bookApp = globalThis.APPS.find(app => app.id === "book");
ok(!!bookApp, "The Book is registered in APPS");
ok(!!(globalThis.ManuscriptReader && typeof globalThis.ManuscriptReader.mount === "function"), "the manuscript reader module loads with the shell");
ok(!!(globalThis.CoreBookReader && typeof globalThis.CoreBookReader.renderMarkdown === "function"), "the safe Core Book Markdown reader loads with the shell");
if (bookApp) {
  /* Neither reader fetches content until its tab is opened. */
  const msCalls = [];
  const { manifest: libraryManifest, documents: libraryDocuments } = await buildBookLibrary(root);
  const librarySourceByUrl = new Map(libraryDocuments.map(document => [
    document.url,
    readFileSync(path.join(root, "docs", "harshal-systems", document.file), "utf8")
  ]));
  const coreBookFixture = `---
title: The Core Book
part: Part I
status_taxonomy: CANONICAL_SOURCE
words: 8511
---
# Part I — The Core Book

## Chapter 1 — Ownership Is Not Possession

Legitimacy precedes capability.

- Refusal is a responsible act.
- <script>alert("unsafe")</script> remains text.

> [!IMPORTANT]
> **Execution may be delegated.** Legitimacy never migrates.

| Principle | Boundary |
| :--- | :--- |
| Authority | Human key |

\`\`\`text
<iframe src=x></iframe>
\`\`\`

[unsafe link](javascript:alert(1))
`;
  const msChapters = {
    "01-the-arrival": "# The Arrival\n\nFirst light on the water.\n\n***\n\nA second paragraph.\n",
    "02-the-foundation": "# The Foundation\n\nLaid stone by stone, and read as text: <b>not markup</b>.\n"
  };
  const msManifest = {
    schema: "harshalos-manuscript-v1",
    manuscript: { collections: 1, chapters: 2, words: 24, bytes: 200 },
    digest: "0".repeat(64),
    collections: [{
      id: "the-grand-river-foundation",
      title: "The Grand River Foundation",
      subtitle: "Fixture manuscript",
      author: "Test fixture",
      chapterCount: 2,
      words: 24,
      bytes: 200,
      digest: "1".repeat(64),
      chapters: [
        { id: "01-the-arrival", name: "01-the-arrival.txt", file: "manuscript/the-grand-river-foundation/01-the-arrival.txt", title: "The Arrival", order: 1, index: 1, words: 12, bytes: 90, sha256: "2".repeat(64) },
        { id: "02-the-foundation", name: "02-the-foundation.txt", file: "manuscript/the-grand-river-foundation/02-the-foundation.txt", title: "The Foundation", order: 2, index: 2, words: 12, bytes: 110, sha256: "3".repeat(64) }
      ]
    }]
  };
  globalThis.fetch = async url => {
    const target = String(url);
    msCalls.push(target);
    if (target.endsWith("book/01-core-book.md")) {
      return { ok: true, status: 200, text: async () => coreBookFixture };
    }
    if (target.endsWith("book-library/manifest.json")) {
      return { ok: true, status: 200, json: async () => libraryManifest };
    }
    const librarySource = [...librarySourceByUrl].find(([url]) => target.endsWith(url))?.[1];
    if (librarySource !== undefined) return { ok: true, status: 200, text: async () => librarySource };
    if (target.endsWith("manuscript/manifest.json")) {
      return { ok: true, status: 200, json: async () => msManifest };
    }
    const match = target.match(/([^/]+)\.txt$/);
    if (match && Object.hasOwn(msChapters, match[1])) {
      return { ok: true, status: 200, text: async () => msChapters[match[1]] };
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
  };

  shell.openApp(bookApp);
  const bookWindow = shell.windows.get("book");
  ok(!!bookWindow, "The Book opens as a desktop window");
  ok(msCalls.length === 0, "opening The Book reads neither reader's source files");
  const tabs = bookWindow ? bookWindow.body.querySelectorAll("[data-bk-view]") : [];
  ok(tabs.length === 4, "The Book presents four reader tabs");
  const tabLabels = tabs.map(tab => (tab.textContent || "").trim());
  ok(tabLabels.join(" | ") === "Intro (0) | Core (1) | Novel (2) | Collections (N)", "tabs follow the requested Intro, Core, Novel, Collections order");
  const artifactTab = tabs.find(tab => (tab.textContent || "").includes("Intro (0)"));
  const coreTab = tabs.find(tab => (tab.textContent || "").includes("Core (1)"));
  const msTab = tabs.find(tab => (tab.textContent || "").includes("Novel (2)"));
  const collectionsTab = tabs.find(tab => (tab.textContent || "").includes("Collections (N)"));
  ok(!!artifactTab, "Intro (0) retains the physical-artifact view");
  ok(!!coreTab, "Core (1) retains The Core Book reader");
  ok(!!msTab, "Novel (2) retains The Grand River Foundation manuscript");
  ok(!!collectionsTab, "Collections (N) is the fourth tab");
  const artifactPanel = bookWindow ? bookWindow.body.querySelector('[data-bk-panel="artifact"]') : null;
  const corePanel = bookWindow ? bookWindow.body.querySelector('[data-bk-panel="core"]') : null;
  const collectionsPanel = bookWindow ? bookWindow.body.querySelector('[data-bk-panel="collections"]') : null;
  const msPanel = bookWindow ? bookWindow.body.querySelector('[data-bk-panel="manuscript"]') : null;
  ok(!!(artifactPanel && !("hidden" in artifactPanel.attrs)), "the Book 0 artifact tab remains the default view");
  ok(!!(corePanel && "hidden" in corePanel.attrs), "the Book I reader starts hidden");
  ok(!!(collectionsPanel && "hidden" in collectionsPanel.attrs), "the Collections reader starts hidden");
  ok(!!(msPanel && "hidden" in msPanel.attrs), "the Book II manuscript tab starts hidden");
  ok(!!(artifactPanel && (artifactPanel.textContent || "").includes("500 voting coins")), "Book 0 still holds the coin pool");

  if (coreTab && corePanel) {
    coreTab.click();
    await settleTurns();
    const coreText = corePanel.textContent || "";
    const coreCalls = msCalls.filter(call => call.endsWith("book/01-core-book.md"));
    ok(corePanel.hidden === false && artifactPanel.hidden === true, "opening Book I switches away from Book 0");
    ok(coreCalls.length === 1, "the Book I Markdown source is fetched lazily exactly once");
    ok(coreText.includes("The Core Book") && coreText.includes("Legitimacy precedes capability."), "the Book I tab renders the selected core document");
    ok(coreText.includes("8,511 words") && coreText.includes("CANONICAL_SOURCE"), "the reader presents source metadata");
    ok(corePanel.innerHTML.includes("core-book-callout") && corePanel.innerHTML.includes("core-book-table") && corePanel.innerHTML.includes("core-book-code"), "the safe reader formats callouts, tables, and fenced code");
    ok(corePanel.innerHTML.includes("&lt;script&gt;") && corePanel.innerHTML.includes("&lt;iframe") && !corePanel.innerHTML.includes("<script") && !corePanel.innerHTML.includes("<iframe"), "raw HTML in the core source is escaped, not executed");
    ok(!corePanel.innerHTML.includes("href=\"javascript:"), "unsafe Markdown URL schemes are rendered as plain text");
    coreTab.click();
    await settleTurns();
    ok(msCalls.filter(call => call.endsWith("book/01-core-book.md")).length === 1, "reopening Book I reuses the loaded document");
  }

  if (collectionsTab && collectionsPanel) {
    collectionsTab.click();
    await settleTurns();
    ok(collectionsPanel.hidden === false && corePanel.hidden === true, "opening Collections switches to its own panel");
    ok(msCalls.filter(call => call.endsWith("book-library/manifest.json")).length === 1, "the Collections index loads lazily and only once");
    ok((collectionsPanel.textContent || "").includes("7 collections") && (collectionsPanel.textContent || "").includes("32 modules") && (collectionsPanel.textContent || "").includes("42 readable files"), "the Collections reader reports the complete library size");
    const nav = collectionsPanel.querySelector("[data-library-nav]");
    const allLibraryButtons = nav ? nav.querySelectorAll("[data-library-file]") : [];
    ok(allLibraryButtons.length === 42, "all guides, collection overviews, and modules are listed");
    ok(!!(nav && nav.textContent.includes("Collection I — Foundational Doctrine")), "collections are grouped by their documented titles");
    const librarySearch = collectionsPanel.querySelector("#book-library-search");
    if (librarySearch) { librarySearch.value = "01-core-book"; dispatch(librarySearch, "input"); }
    const filteredLibraryButtons = nav ? nav.querySelectorAll("[data-library-file]") : [];
    ok(filteredLibraryButtons.length === 1 && filteredLibraryButtons[0].dataset.libraryFile === "01-core-book.md", "search narrows navigation to matching files");
    const coreModuleButton = filteredLibraryButtons[0];
    if (coreModuleButton) {
      coreModuleButton.click();
      await settleTurns();
      const collectionText = collectionsPanel.textContent || "";
      const collectionReader = collectionsPanel.querySelector("[data-library-reading]");
      ok(collectionText.includes("Part I — The Core Book") && collectionText.includes("legitimacy precedes capability"), "a collection module opens in the on-site safe reader");
      ok(!!(collectionReader && collectionReader.innerHTML.includes("Read this file on GitHub") && collectionReader.innerHTML.includes("docs/harshal-systems/01-core-book.md")), "each opened collection file links directly to its GitHub source");
      ok(msCalls.some(call => call.endsWith("/book-library/harshal-systems/01-core-book.md")), "the selected module is fetched from the library allowlist");
    }
    if (librarySearch) { librarySearch.value = ""; dispatch(librarySearch, "input"); }
    ok(nav && nav.querySelectorAll("[data-library-file]").length === 42, "clearing search restores the complete library navigation");
    const collectionOverview = nav && nav.querySelectorAll("[data-library-file]").find(button => button.dataset.libraryFile === "collections/01-foundations/README.md");
    if (collectionOverview) {
      collectionOverview.click();
      await settleTurns();
      const overviewReader = collectionsPanel.querySelector("[data-library-reading]");
      ok(!!(overviewReader && overviewReader.innerHTML.includes('href="/book-library/harshal-systems/01-core-book.md"')), "relative links inside collection files resolve to their online reader paths");
    }
  }

  if (msTab && msPanel) {
    msTab.click();
    await settleTurns();
    const msText = msPanel.textContent || "";
    ok(msPanel.hidden === false && artifactPanel.hidden === true, "opening the tab switches panels without losing the artifact view");
    ok(msCalls.some(call => call.endsWith("manuscript/manifest.json")), "opening the tab reads the generated manuscript index");
    ok(msText.includes("The Grand River Foundation"), "the manuscript heading comes from the collection metadata");
    ok(msText.includes("2 chapters") && msText.includes("24 words"), "the heading reports the indexed size of the manuscript");
    ok(msText.includes("digest"), "the reader states the content digest it loaded");
    const chapterButtons = msPanel.querySelectorAll("[data-ms-chapter]");
    ok(chapterButtons.length === 2, "every indexed chapter is listed in the contents rail");
    ok(chapterButtons.some(button => (button.textContent || "").includes("The Arrival")), "chapter titles are listed");
    ok(msText.includes("First light on the water."), "the first chapter is set as text without further action");
    ok(msCalls.filter(call => call.endsWith(".txt")).length === 1, "only the opened chapter is fetched");
    let readerHost = msPanel.querySelector("[data-ms-reader]");
    ok(!!(readerHost && readerHost.innerHTML.includes("ms-break")), "a scene break line becomes a scene break, not a paragraph");

    /* Chapter switching, navigation, and hostile markup in a chapter. */
    const second = chapterButtons.find(button => (button.textContent || "").includes("The Foundation"));
    if (second) {
      second.click();
      await settleTurns();
      readerHost = msPanel.querySelector("[data-ms-reader]");
      const afterText = msPanel.textContent || "";
      ok(afterText.includes("Laid stone by stone"), "selecting a chapter loads that chapter");
      ok(!afterText.includes("First light on the water."), "the previous chapter is replaced, not appended");
      ok(!!(readerHost && readerHost.innerHTML.includes("&lt;b&gt;not markup&lt;/b&gt;") && !readerHost.innerHTML.includes("<b>not markup</b>")),
        "chapter markup is escaped and read, never applied");
    }
    const nextButton = msPanel.querySelector('[data-ms-move="1"]');
    const previousButton = msPanel.querySelector('[data-ms-move="-1"]');
    ok(!!(nextButton && "disabled" in nextButton.attrs), "there is no next chapter past the last one");
    ok(!!(previousButton && !("disabled" in previousButton.attrs)), "the previous chapter is reachable from the last one");
    if (previousButton) {
      previousButton.click();
      await settleTurns();
      ok((msPanel.textContent || "").includes("First light on the water."), "the previous button returns to the earlier chapter");
    }

    /* A missing index is explained rather than dressed up as an empty manuscript. */
    globalThis.fetch = async () => { throw new Error("offline"); };
    const reload = msPanel.querySelector("[data-ms-reload]");
    if (reload) {
      reload.click();
      await settleTurns();
      ok((msPanel.textContent || "").includes("Manuscript index unavailable"), "an unreadable index is reported plainly");
      ok((msPanel.textContent || "").includes("node serve.js"), "the notice names the supported local preview");
    }
  }
  globalThis.fetch = originalFetch;
}

/* ── LLM Link: the Z.AI free-tier relay needs no browser key ───── */
const llmApp = globalThis.APPS.find(app => app.id === "llmlink");
ok(!!llmApp, "LLM Link is registered in APPS");
const settle = async (turns = 6) => { for (let i = 0; i < turns; i++) await new Promise(resolve => setImmediate(resolve)); };
if (llmApp) {
  const llmCalls = [];
  const outsideFetch = globalThis.fetch;
  const statusCalls = () => llmCalls.filter(call => call.url.endsWith("/api/llm/status")).length;
  let relayStatusPayload = {
    configured: true, provider: "zai", tier: "free", upstream: "https://api.z.ai",
    defaultModel: "glm-4.5-flash", models: ["glm-4.5-flash", "glm-4.7-flash"],
    keyVariable: "ZAI_API_KEY", acceptedKeyVariables: ["Z.AI", "ZAI_API_KEY"],
    limits: { requestsPerMinute: 60, sharedRequestsPerMinute: 120, windowSeconds: 60 }
  };
  let relayStatusHttp = 200;
  let relayStatusJson = true;
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    const headers = options.headers || new Headers();
    llmCalls.push({
      url: target, method: options.method || "GET",
      authorization: typeof headers.get === "function" ? headers.get("Authorization") : null,
      body: options.body ? JSON.parse(options.body) : null
    });
    if (target.endsWith("/api/llm/status")) {
      const text = relayStatusJson ? JSON.stringify(relayStatusPayload) : "<html>404</html>";
      return { ok: relayStatusHttp < 400, status: relayStatusHttp, headers: { get: () => "application/json" }, text: async () => text, json: async () => JSON.parse(text) };
    }
    if (target.endsWith("/api/llm/models")) {
      return { ok: true, status: 200, headers: { get: () => "application/json" }, text: async () => "", json: async () => ({ object: "list", data: [{ id: "glm-4.5-flash" }, { id: "glm-4.7-flash" }] }) };
    }
    if (target.endsWith("/api/llm")) {
      return {
        ok: true, status: 200, headers: { get: () => "application/json" }, text: async () => "",
        json: async () => ({
          object: "chat.completion", model: "glm-4.5-flash",
          choices: [{ index: 0, message: { role: "assistant", content: "link established, model responding" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 30, completion_tokens: 5, total_tokens: 35 },
          relay: { provider: "zai", tier: "free", keyVariable: "ZAI_API_KEY", doSample: false }
        })
      };
    }
    return { ok: false, status: 404, headers: { get: () => "text/html" }, text: async () => "<html>no such route</html>", json: async () => ({}) };
  };

  /* The mini-DOM has no HTMLInputElement.value, so the fields a button handler
     reads are set the way a reader would set them before the click. */
  const fillForm = (win, providerId) => {
    const preset = HOSLLM.PROVIDERS[providerId];
    const fields = { "#ll-provider": providerId, "#ll-protocol": "", "#ll-endpoint": preset.endpoint, "#ll-model": preset.model, "#ll-key": "" };
    for (const [selector, value] of Object.entries(fields)) {
      const field = win.body.querySelector(selector);
      if (field) field.value = value;
    }
  };

  shell.openApp(llmApp);
  const llmWindow = shell.windows.get("llmlink");
  ok(!!llmWindow, "LLM Link opens as a HarshalOS desktop window");
  const providerSelect = llmWindow && llmWindow.body.querySelector("#ll-provider");
  ok(!!(providerSelect && providerSelect.textContent.includes("Z.AI free tier")), "the provider list offers the Z.AI free-tier relay");
  ok(llmWindow.body.innerHTML.includes('value="relay"'), "the relay preset is a selectable provider id");

  /* A key left over from another provider must not follow the reader here. */
  HOSLLM.setKey("sk-ant-leftover-from-another-provider", false);
  providerSelect.value = "relay";
  dispatch(providerSelect, "change");
  await settle();
  let llmText = llmWindow.body.textContent;
  let keyInput = llmWindow.body.querySelector("#ll-key");
  ok(!!(keyInput && "disabled" in keyInput.attrs), "the relay connection has no key field to fill");
  ok(llmText.includes("held by this deployment's Worker"), "the UI says where the relay's key lives");
  ok(llmText.includes("RELAY CONFIGURED"), "a configured relay says so");
  ok(llmText.includes("glm-4.5-flash") && llmText.includes("glm-4.7-flash"), "the relay's free-model allowlist is shown");
  ok(llmText.includes("ZAI_API_KEY"), "the Worker variable holding the key is named");
  ok(llmText.includes("60 calls/minute per caller"), "the relay's per-caller pace is disclosed");
  ok(llmText.includes("120/minute shared across everyone here"), "so is the ceiling this deployment shares with every other caller");
  ok(llmText.includes("sliding 60s window"), "and the window is described as sliding, because that is what the wait quoted means");
  ok(llmText.includes("a short wait is absorbed automatically"), "the UI says a paced call is waited out rather than failed");
  ok(llmText.includes("this deployment's own Worker first"), "the disclosure says prompts transit the Worker");
  ok(llmText.includes("No browser key is sent at all"), "the disclosure says no key leaves the browser");
  ok(llmText.includes("do_sample:false"), "Z.AI's sampling translation is disclosed in the app");
  const statusCall = llmCalls.find(call => call.url.endsWith("/api/llm/status"));
  ok(!!statusCall, "the app asked this deployment's relay what it has");
  ok(!!(statusCall && !statusCall.authorization), "the status question carries no key");
  ok(!!llmWindow.body.querySelector("#ll-relay-check"), "the app offers a Check relay control");

  /* One real call through the relay: the leftover key must not be attached. */
  fillForm(llmWindow, "relay");
  const testButton = llmWindow.body.querySelector("#ll-test");
  ok(!!(testButton && !("disabled" in testButton.attrs)), "the relay is a complete connection with no browser key");
  if (testButton) await testButton.listeners.click[0]();
  await settle();
  llmText = llmWindow.body.textContent;
  const chatCall = llmCalls.find(call => call.method === "POST" && call.url.endsWith("/api/llm"));
  ok(!!chatCall, "Test connection called this deployment's relay route");
  ok(!!(chatCall && !chatCall.authorization), "the leftover browser key was not forwarded to the relay");
  ok(!!(chatCall && chatCall.body.model === "glm-4.5-flash"), "the relay call names a free-tier model");
  ok(!!(chatCall && chatCall.body.stream === undefined && chatCall.body.tools === undefined), "the relay call asks for no streaming and offers no tools");
  ok(llmText.includes("LINK ESTABLISHED"), "a relayed reply is reported as an established link");
  ok(llmText.includes("link established, model responding"), "the relayed sample reply is shown");

  /* List models goes to the relay, not to Z.AI. */
  fillForm(llmWindow, "relay");
  const modelsButton = llmWindow.body.querySelector("#ll-models");
  if (modelsButton) await modelsButton.listeners.click[0]();
  await settle();
  ok(llmCalls.some(call => call.url.endsWith("/api/llm/models") && !call.authorization), "List models asks the relay and sends no key");
  ok(llmWindow.body.textContent.includes("models available to this key"), "the relay's allowlist is offered as choices");

  /* An unconfigured relay is reported as such, with what to add. */
  relayStatusPayload = {
    configured: false, provider: "zai", tier: "free", models: ["glm-4.5-flash", "glm-4.7-flash"],
    keyVariable: "", acceptedKeyVariables: ["Z.AI", "ZAI_API_KEY"],
    message: "This deployment has no Z.AI key. Add one as a Worker secret named Z.AI or ZAI_API_KEY."
  };
  fillForm(llmWindow, "relay");
  const checkButton = llmWindow.body.querySelector("#ll-relay-check");
  if (checkButton) await checkButton.listeners.click[0]();
  await settle();
  llmText = llmWindow.body.textContent;
  ok(llmText.includes("RELAY NOT CONFIGURED"), "an unconfigured relay says so instead of looking linked");
  ok(llmText.includes("no Z.AI key"), "it names what is missing");
  ok(llmText.includes("ZAI_API_KEY"), "it names a secret the operator can add");

  /* A static preview with no Worker at all is a normal state, not a crash. */
  relayStatusHttp = 404; relayStatusJson = false;
  fillForm(llmWindow, "relay");
  const recheck = llmWindow.body.querySelector("#ll-relay-check");
  if (recheck) await recheck.listeners.click[0]();
  await settle();
  ok(llmWindow.body.textContent.includes("NO RELAY HERE"), "a deployment with no Worker reports that plainly");

  /* Back to a BYOK provider: the key field returns and the relay box goes. */
  relayStatusHttp = 200; relayStatusJson = true;
  const beforeSwitch = statusCalls();
  const providerAgain = llmWindow.body.querySelector("#ll-provider");
  providerAgain.value = "anthropic";
  dispatch(providerAgain, "change");
  await settle();
  llmText = llmWindow.body.textContent;
  keyInput = llmWindow.body.querySelector("#ll-key");
  ok(!!(keyInput && !("disabled" in keyInput.attrs)), "a BYOK provider asks for its own key again");
  ok(!llmText.includes("RELAY CONFIGURED") && !llmText.includes("NO RELAY HERE"), "the relay disclosure disappears with the relay preset");
  ok(statusCalls() === beforeSwitch, "a BYOK provider makes no relay calls");

  HOSLLM.clearKey();
  globalThis.fetch = outsideFetch;
}

// The mail handler awaits WebCrypto. A fixed number of event-loop turns does
// not guarantee the crypto thread pool has finished on a busy CI runner.
async function clickAndWait(element) {
  const pending = [];
  dispatch(element, "click", pending);
  let timer;
  try {
    await Promise.race([
      Promise.all(pending),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Click handler did not settle")), 5000); })
    ]);
  } finally { clearTimeout(timer); }
}

/* ── Orb Directory & Mail: OCM-addressed phonebook and local mail ── */
const odmApp = globalThis.APPS.find(a => a.id === "ocm-directory");
ok(!!odmApp, "Orb Directory & Mail is registered in APPS");
ok(!!(odmApp && odmApp.short === "Orb Mail"), "desktop label is 'Orb Mail'");
ok(!!(odmApp && odmApp.glyph === "✉"), "the envelope glyph is on the icon");
const odmApi = globalThis.HOSOCMDIR;
ok(!!odmApi, "the OCM directory module loads from index.html");
if (odmApi && odmApp) {
  ok(odmApi.parseAddress("0•360•001•0001").code === "OCM-ADDR-SECTOR-CLOSURE", "the loaded module refuses 360 as a closure notation");
  const odmBefore = operationalSnapshot();
  const odmWindow = shell.openApp(odmApp);
  ok(!!odmWindow, "the Orb Directory & Mail window opens");
  const odmText = () => odmWindow.body.textContent || "";
  ok(odmText().includes("LOCAL ONLY — NO TRANSPORT"), "the app states its no-transport boundary on open");
  ok(odmText().includes("0•DDD•RRR•####"), "the canonical address form is shown");
  ok(odmText().includes("0•028•001•0001"), "the default local node sits on the communication-signals degree");

  const setEntry = (name, address) => {
    const nameField = odmWindow.body.querySelector("#odm-name");
    const addressField = odmWindow.body.querySelector("#odm-address");
    if (nameField) nameField.value = name;
    if (addressField) addressField.value = address;
    odmWindow.body.querySelector("#odm-add").click();
  };

  setEntry("Custodial Relay", "0-046-002-0007");
  ok(odmText().includes("Custodial Relay"), "a valid OCM address is added to the directory");
  ok(odmText().includes("0•046•002•0007"), "the entry shows its canonical, zero-padded address");
  ok(odmText().includes("046°"), "the entry shows its sector meaning from the Part VII degree legend");
  ok(odmWindow.body.querySelectorAll(".odm-entry").length === 1, "one entry is stored");

  setEntry("Nobody", "0•360•001•0001");
  ok(odmText().includes("360 is not an address"), "360 is refused: it is closure notation, never a 361st slot");
  setEntry("The Center", "0•000•000•0000");
  ok(odmText().includes("Center Origin"), "Center Origin cannot be registered as a directory entry or mailbox");
  ok(odmWindow.body.querySelectorAll(".odm-entry").length === 1, "refused entries are not stored");

  // Force a delayed digest so these assertions cannot accidentally pass by
  // assuming WebCrypto completes within a few setImmediate callbacks.
  const originalMailDigest = globalThis.HOSCrypto.sha256Hex;
  globalThis.HOSCrypto.sha256Hex = async (...args) => {
    await new Promise(resolve => setTimeout(resolve, 25));
    return originalMailDigest(...args);
  };

  /* Mail: recorded locally, never sent, never authoritative. */
  odmWindow.body.querySelector("#odm-tab-mail").click();
  const toField = odmWindow.body.querySelector("#odm-mail-to");
  const subjectField = odmWindow.body.querySelector("#odm-mail-subject");
  const bodyField = odmWindow.body.querySelector("#odm-mail-body");
  if (toField) toField.value = "0•046•002•0007";
  if (subjectField) subjectField.value = "Coordination only";
  if (bodyField) bodyField.value = "Lateral message <script>alert(1)</script> with no authority.";
  await clickAndWait(odmWindow.body.querySelector("#odm-mail-record"));
  ok(odmText().includes("RECORDED-LOCAL-ONLY"), "a recorded message states RECORDED-LOCAL-ONLY");
  ok(odmText().includes("transport NONE"), "the message reports transport NONE");
  ok(odmText().includes("delivery NOT-ATTEMPTED"), "the message reports delivery NOT-ATTEMPTED");
  ok(odmText().includes("authority effect NONE"), "the message reports authority effect NONE");
  ok(odmWindow.body.querySelectorAll("script").length === 0, "a hostile message body is escaped, never parsed as HTML");

  /* Resolution-first routing: inward to Center Origin, which resolves and forwards.
     Markup-level claims read innerHTML, which serializes "<" as "&lt;" in a real
     browser exactly as it does here; prose claims read textContent. */
  const odmHtml = () => odmWindow.body.innerHTML || "";
  const routeText = () => {
    const panel = odmWindow.body.querySelector("#odm-route");
    return panel ? panel.textContent || "" : "";
  };
  ok(odmHtml().includes("Cost_resolution &lt; Cost_lateral"), "the mail pane states the routing cost asymmetry");
  ok(odmText().includes("RESOLVE-AND-FORWARD"), "the mail pane names the center's resolve-and-forward role");
  ok(odmText().includes("HUMAN-KEY-AT-CENTER-ORIGIN"), "the mail pane names where authority actually originates");
  ok(odmText().includes("authority-resolution mechanism, not an authority source"), "the app states the resolution-axis invariant");
  ok(odmText().includes("Authoritative action must traverse the resolution path."), "precedence invariant 1 is displayed");
  ok(odmText().includes("Lateral coordination cannot authorize, override, or commit state."), "precedence invariant 2 is displayed");
  ok(odmText().includes("Resolution has precedence over coordination."), "precedence invariant 3 is displayed");
  ok(odmText().includes("does not claim lower physical wire latency"), "the wire-latency boundary is displayed, not implied away");

  ok(!!odmWindow.body.querySelector("#odm-route"), "the compose pane carries a live route panel");
  const routeToField = odmWindow.body.querySelector("#odm-mail-to");
  if (routeToField) routeToField.value = "0•046•002•0007";
  dispatch(routeToField, "input");
  const panel = routeText();
  ok(panel.includes("0•000•000•0000"), "the route path passes through Center Origin");
  ok(panel.includes("Resolve legitimacy"), "hop 1 is labelled as the legitimacy-resolution leg");
  ok(panel.includes("Transmit legitimacy state"), "hop 2 is labelled as transmission, not verification");
  ok((panel.match(/VERIFIES/g) || []).length === 1, "exactly one hop verifies — the outward leg does not");
  ok(panel.includes("Authority-verification hops"), "the verification-hop comparison table is rendered");
  ok(panel.includes("18° arc"), "the lateral leg reports its ℤ_360 arc");
  ok(panel.includes("RESOLUTION-FIRST"), "the recommendation is RESOLUTION-FIRST");
  ok(panel.includes("m = 2 node"), "the comparison is stated against the lateral participant count");

  const recorded = odmText();
  ok(recorded.includes("VIA-CENTER"), "the default recorded route is VIA-CENTER");
  ok(recorded.includes("resolution TRAVERSED"), "a via-center record reports resolution TRAVERSED");
  ok(recorded.includes("verification hops 1 via center vs 2 direct lateral"), "the recorded message carries its verification-hop comparison");
  ok(recorded.includes("center role RESOLVE-AND-FORWARD"), "a via-center record reports the center's role");

  /* Direct lateral stays selectable — the Lateral Communication Axiom permits it. */
  odmWindow.body.querySelector("#odm-route-lateral").click();
  const lateralPanel = routeText();
  ok(lateralPanel.includes("RESOLUTION NOT TRAVERSED"), "switching to direct lateral says plainly what it costs");
  ok(lateralPanel.includes("cannot authorize"), "the lateral warning restates that coordination cannot authorize");
  ok(!lateralPanel.includes("VERIFIES"), "no hop on the bypassed path is claimed to verify");
  const toFieldL = odmWindow.body.querySelector("#odm-mail-to");
  if (toFieldL) toFieldL.value = "0•046•002•0007";
  const subjectL = odmWindow.body.querySelector("#odm-mail-subject");
  if (subjectL) subjectL.value = "Lateral route";
  await clickAndWait(odmWindow.body.querySelector("#odm-mail-record"));
  const lateralRecord = odmText();
  ok(lateralRecord.includes("DIRECT-LATERAL"), "a laterally routed record is stamped DIRECT-LATERAL");
  ok(lateralRecord.includes("resolution NOT-TRAVERSED"), "a direct-lateral record reports resolution NOT-TRAVERSED");
  ok(lateralRecord.includes("center role BYPASSED"), "a direct-lateral record reports the center as bypassed");
  ok(lateralRecord.includes("authority effect NONE"), "the lateral route grants no authority either");
  ok(lateralRecord.includes("verification hops 1 via center vs 2 direct lateral"), "the bypassed record still shows what it gave up");

  odmWindow.body.querySelector("#odm-route-center").click();
  ok(routeText().includes("Resolve legitimacy"), "via-center routing can be selected back");

  /* Sending to Center Origin is refused at the UI too. */
  const toField2 = odmWindow.body.querySelector("#odm-mail-to");
  if (toField2) toField2.value = "0•000•000•0000";
  await clickAndWait(odmWindow.body.querySelector("#odm-mail-record"));
  ok(odmText().includes("OCM-ADDR-ORIGIN-RESERVED"), "mail to Center Origin is refused");

  globalThis.HOSCrypto.sha256Hex = originalMailDigest;

  /* The orb's own registry loads, minus the reserved center. */
  odmWindow.body.querySelector("#odm-tab-directory").click();
  odmWindow.body.querySelector("#odm-load-registry").click();
  const odmEntries = odmWindow.body.querySelectorAll(".odm-entry");
  ok(odmEntries.length > 10, `the local orb registry loads into the directory (${odmEntries.length} entries)`);
  const odmAddresses = odmEntries.map(entry => {
    const address = entry.querySelector(".odm-addr");
    return address ? address.textContent.trim() : "";
  });
  ok(!odmAddresses.some(address => address.startsWith("0•000•")), "no directory entry occupies the reserved Center Origin sector");
  ok(!odmAddresses.some(address => address.includes("ORIGIN")), "the reserved Origin node is skipped, not imported");
  ok(odmAddresses.some(address => address === "0•028•001•0001" || address.startsWith("0•001•")), "real registry addresses are imported intact");
  ok(odmText().includes("NODE"), "registry entries are tagged as nodes");

  ok(operationalSnapshot() === odmBefore, "directory and mail activity changes no HOS authority state");
}

/* ── origin menu also lists the apps ───────────────────────────── */
const menuList = body.querySelector("#om-apps");
const menuBtns = menuList ? menuList.querySelectorAll(".om-app") : [];
ok(menuBtns.some(b => (b.textContent || "").includes("Ground-0 Audit")), "origin menu lists Ground-0 Audit");
ok(menuBtns.some(b => (b.textContent || "").includes("Adversarial Mode")), "origin menu lists Adversarial Mode");
ok(menuBtns.some(b => (b.textContent || "").includes("Guided Demonstration")), "origin menu lists Guided Demonstration");
ok(menuBtns.some(b => (b.textContent || "").includes("News")), "origin menu lists News as a standalone app");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
