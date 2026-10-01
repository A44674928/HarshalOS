/* Node harness: boots the REAL HarshalOS page — every script index.html loads,
   in order — then runs the real shell.init() and asserts the Ground-0 Audit
   desktop icon exists and that double-click launches the app.
   Run: node tests/g0-desktop-test.mjs */
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

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

/* ── origin menu also lists the apps ───────────────────────────── */
const menuList = body.querySelector("#om-apps");
const menuBtns = menuList ? menuList.querySelectorAll(".om-app") : [];
ok(menuBtns.some(b => (b.textContent || "").includes("Ground-0 Audit")), "origin menu lists Ground-0 Audit");
ok(menuBtns.some(b => (b.textContent || "").includes("Adversarial Mode")), "origin menu lists Adversarial Mode");
ok(menuBtns.some(b => (b.textContent || "").includes("Guided Demonstration")), "origin menu lists Guided Demonstration");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
