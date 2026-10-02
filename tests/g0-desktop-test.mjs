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
function dispatch(element, type) {
  const event = {
    type, target: element, currentTarget: null,
    preventDefault() {}, stopPropagation() {},
    get value() { return element.value ?? ""; },
    get checked() { return !!element.checked; }
  };
  let node = element;
  while (node) {
    for (const fn of (node.listeners[type] || []).slice()) fn.call(node, event);
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
const bodyInner = html.slice(html.indexOf("<body"), html.indexOf("</body>")).replace(/^<body[^>]*>/, "");
const body = new El("body");
body.innerHTML = bodyInner;
globalThis.document = {
  body,
  createElement: tag => new El(tag),
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
for (const src of srcs) {
  const url = pathToFileURL(path.join(root, src.split("?")[0])).href;
  try { await import(url); }
  catch (error) { fail++; console.error(`  ✗ FAIL: script evaluates cleanly: ${src} — ${error.message}`); }
}

/* ── the app must be registered before the desktop builds ─────── */
ok(Array.isArray(globalThis.APPS), "APPS registry exists (apps-core loaded)");
const g0 = globalThis.APPS.find(a => a.id === "ground0");
ok(!!g0, "Ground-0 Audit registered in APPS");
ok(g0 && g0.short === "Ground-0 Audit", "desktop label is 'Ground-0 Audit'");
ok(g0 && g0.glyph === "⚖", "scales glyph on the icon");
ok(typeof globalThis.shell?.init === "function", "window manager exposed (window.shell.init)");

/* ── run the REAL desktop builder ─────────────────────────────── */
globalThis.shell.init();
const field = body.querySelector("#icon-field");
ok(!!field, "desktop icon field exists");
const icons = field ? field.querySelectorAll(".desk-icon") : [];
ok(icons.length === globalThis.APPS.length, `every app gets a desktop icon (${icons.length}/${globalThis.APPS.length})`);
const g0icon = icons.find(i => (i.textContent || "").includes("Ground-0 Audit"));
ok(!!g0icon, "Ground-0 Audit icon is on the desktop");
ok(!!(g0icon && (g0icon.textContent || "").includes("⚖")), "the icon shows the scales glyph");

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
  const taskButton = body.querySelector("#taskbar-apps").children[0];
  dispatch(rec.body, "pointerdown");
  ok(body.querySelector("#taskbar-apps").children[0] === taskButton,
    "pointerdown in the focused app preserves the taskbar button until click");
  const min = rec.el.querySelector(".win-ctl.min");
  dispatch(min, "pointerdown");
  min.click();
  ok(rec.el.classList.contains("minimized"), "tap on minimize hides the app");
  body.querySelector("#taskbar-apps").children[0].click();
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
  ok(!!(marketTab && marketPanel && marketPanel.hidden === false), "Market Charts is a dedicated navigable dashboard tab");
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
  ok(giCalls.length === 3 && giCalls.every(call => call.options.method === "GET"), "local demo ticker searches issue no extra API calls");
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
  ok(giCalls.length === 6 && giCalls.every(call => call.options.method === "GET"), "refresh remains read-only when the Market Charts panel is open");
  const marketProvider = giWindow && giWindow.body.querySelector("[data-gi-market-provider]");
  const marketInterval = giWindow && giWindow.body.querySelector("[data-gi-market-interval]");
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
  ok(HOS.getLedger().length === ledgerBefore, "opening, refreshing, and searching Good Intelligence does not write to the HOS ledger");
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
    ok((collectionsPanel.textContent || "").includes("7 collections") && (collectionsPanel.textContent || "").includes("29 modules") && (collectionsPanel.textContent || "").includes("39 readable files"), "the Collections reader reports the complete library size");
    const nav = collectionsPanel.querySelector("[data-library-nav]");
    const allLibraryButtons = nav ? nav.querySelectorAll("[data-library-file]") : [];
    ok(allLibraryButtons.length === 39, "all guides, collection overviews, and modules are listed");
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
    ok(nav && nav.querySelectorAll("[data-library-file]").length === 39, "clearing search restores the complete library navigation");
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

/* ── origin menu also lists the apps ───────────────────────────── */
const menuList = body.querySelector("#om-apps");
const menuBtns = menuList ? menuList.querySelectorAll(".om-app") : [];
ok(menuBtns.some(b => (b.textContent || "").includes("Ground-0 Audit")), "origin menu lists Ground-0 Audit");
ok(menuBtns.some(b => (b.textContent || "").includes("Adversarial Mode")), "origin menu lists Adversarial Mode");
ok(menuBtns.some(b => (b.textContent || "").includes("Guided Demonstration")), "origin menu lists Guided Demonstration");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
