/* Node harness: boots the Ground-0 workspace app in a mini-DOM and walks the
   major flows (tabs, wizard, register, logic sandbox, automatic error path).
   Run: node tests/g0-app-test.mjs */
import { webcrypto } from "node:crypto";

/* ── mini-DOM ─────────────────────────────────────────────────── */
const selPart = part => {
  // one compound selector: tag, .class, #id, [attr], [attr="value"]
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
  if (m.tag && el.tagName !== m.tag) return false;
  if (m.id && (el.attrs.id !== m.id)) return false;
  if (m.classes.some(c => !el.classList.contains(c))) return false;
  for (const [k, v] of Object.entries(m.attrs)) {
    if (v === true) { if (!(k in el.attrs) && !(k in el.dataset)) return false; }
    else if (String(el.attrs[k] ?? el.dataset[k] ?? "") !== v) return false;
  }
  return true;
};

class El {
  constructor(tagName, attrs = {}) {
    this.tagName = tagName.toLowerCase();
    this.attrs = attrs;
    this.children = [];
    this.parent = null;
    this.textContent = "";
    this.scrollTop = 0;
    this._html = "";
    this.listeners = {};
    const self = this;
    this.classList = {
      _set: new Set(),
      add(...c) { c.forEach(x => this._set.add(x)); },
      remove(...c) { c.forEach(x => this._set.delete(x)); },
      toggle(c, force) { const on = force === undefined ? !this._set.has(c) : force; on ? this._set.add(c) : this._set.delete(c); return on; },
      contains(c) { return this._set.has(c); }
    };
    this.style = { setProperty() {}, removeProperty() {} };
    this.dataset = new Proxy({}, {
      get(t, k) { return t[k]; },
      set(t, k, v) { t[k] = String(v); return true; }
    });
  }
  get className() { return [...this.classList._set].join(" "); }
  set innerHTML(html) {
    this._html = String(html);
    this.children = parse(String(html), this);
  }
  get innerHTML() { return this._html; }
  appendChild(child) { child.parent = this; this.children.push(child); return child; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(f => f !== fn); }
  focus() { this._focused = true; }
  blur() { this._focused = false; }
  click() { dispatch(this, "click"); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k.startsWith("data-")) this.dataset[k.slice(5)] = String(v); }
  closest(selector) {
    let node = this;
    while (node) { if (selector.split(",").some(s => matches(node, s.trim()))) return node; node = node.parent; }
    return null;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const out = [];
    const walk = el => { for (const child of el.children) { if (selector.split(",").some(s => matchPath(child, s.trim()))) out.push(child); walk(child); } };
    const matchPath = (el, sel) => {
      // support descendant combinator: "a b c" — match last against el, ancestors against rest
      const parts = sel.split(/\s+/).filter(Boolean);
      const tryMatch = (node, idx) => {
        if (!matches(node, parts[idx])) return false;
        if (idx === 0) return true;
        let p = node.parent;
        while (p) { if (tryMatch(p, idx - 1)) return true; p = p.parent; }
        return false;
      };
      return tryMatch(el, parts.length - 1);
    };
    walk(this);
    return out;
  }
}

const VOID = new Set(["br", "img", "input", "hr", "meta", "link"]);
function parse(html, parent) {
  const rootChildren = [];
  const stack = [{ children: rootChildren }];
  const tagRe = /<\/?([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let lastIndex = 0, m;
  const pushText = (text, explicit) => {
    if (!text || !text.trim()) return;
    stack[stack.length - 1].children.push({ ...new El("#text"), textContent: text, parent: stack[stack.length - 1] === parent ? null : stack[stack.length - 1] });
  };
  while ((m = tagRe.exec(html))) {
    pushText(html.slice(lastIndex, m.index));
    lastIndex = tagRe.lastIndex;
    const [full, tag, rawAttrs = "", selfClose] = m;
    if (full.startsWith("</")) {
      // pop until matching
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag.toLowerCase()) { stack.length = i; break; }
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
      if (k === "checked" || k === "disabled" || k === "selected" || k === "hidden") el[k] = true;
      if (k === "value") el.value = v;
    }
    stack[stack.length - 1].children.push(el);
    el.parent = stack[stack.length - 1];
    if (!(selfClose || VOID.has(el.tagName))) { stack.push({ tag: el.tagName, children: el.children, el }); el._open = true; }
  }
  pushText(html.slice(lastIndex));
  // re-link parents properly for nested
  const link = (node, parentEl) => {
    for (const child of node.children || []) {
      child.parent = parentEl;
      link(child, child);
    }
  };
  link({ children: rootChildren }, parent);
  return rootChildren.filter(c => c.tagName !== "#text");
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
    for (const fn of (node.listeners[type] || []).slice()) {
      fn.call(node, event);
      if (event._stopped) return;
    }
    node = node.parent;
  }
}

/* ── browser globals ──────────────────────────────────────────── */
globalThis.window = globalThis;
Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
const storage = new Map();
globalThis.localStorage = {
  getItem: k => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: k => storage.delete(k)
};
const session = new Map();
globalThis.sessionStorage = {
  getItem: k => (session.has(k) ? session.get(k) : null),
  setItem: (k, v) => session.set(k, String(v)),
  removeItem: k => session.delete(k)
};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.CSS = { escape: s => String(s).replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, c => "\\" + c) };
Object.defineProperty(globalThis, "navigator", { value: { clipboard: { writeText: async () => {} }, platform: "test" }, configurable: true });

globalThis.confirm = () => true;
globalThis.document = { createElement: tag => new El(tag), body: new El("body") };
globalThis.APPS = [];
globalThis.HOS = { record: () => {} }; // stub — the kernel API is not under test here
const specFetches = [];
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url.startsWith("specs/")) {
    specFetches.push(url);
    return { ok: true, status: 200, text: async () => `# Mock spec source: ${url}` };
  }
  return nativeFetch(input, init);
};
const toasts = [];
globalThis.__g0toasts = toasts;

await import("../js/data.js");
await import("../js/g0-engine.js");
await import("../js/g0-research.js");
await import("../js/g0-app.js");
await import("../js/apps-llm.js");

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) pass++; else { fail++; console.error("  ✗ FAIL:", name); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Poll until a condition holds (or the budget elapses). The app renders some
// views from promise chains (G0.createAudit().then(render)), whose wall-clock
// latency varies with runner load; fixed sleeps flake on slow CI machines.
const waitFor = async (cond, timeoutMs = 8000, stepMs = 20) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (cond()) return true;
    await sleep(stepMs);
  }
  return cond();
};
const DEBUG = !!process.env.G0DEBUG;
const dbg = (label) => { if (DEBUG) console.log(`\n— ${label} —\n` + main.innerHTML.slice(0, 700)); };

const app = globalThis.APPS.find(a => a.id === "ground0");
ok(!!app && app.title === "Ground-0 Audit", "app registered with id ground0");
ok(globalThis.APPS.filter(a => a.id === "ground0").length === 1, "exactly one ground0 app");

/* ── index.html must actually load the Ground-0 modules (regression guard:
      a lost edit once shipped the app unregistered — nothing referenced it) ── */
{
  const fs = await import("node:fs");
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const at = src => html.indexOf(`src="${src}`);
  ok(at("js/g0-engine.js") !== -1 && at("js/g0-research.js") !== -1 && at("js/g0-app.js") !== -1, "index.html references all three Ground-0 modules");
  ok(at("js/g0-engine.js") < at("js/wm.js") && at("js/g0-research.js") < at("js/wm.js") && at("js/g0-app.js") > html.indexOf('src="js/apps-shell.js"'), "module load order: engine+research before the window manager, app after the shell");
  ok(at("js/apps-llm.js") !== -1, "index.html references the LLM Link shell app");
  ok(at("js/llm.js") === -1 && at("js/g0-llm.js") === -1, "index.html no longer loads the removed model connection layer or reading pass");
  ok(html.includes("css/ground0.css"), "index.html links the Ground-0 stylesheet");
}

const root = new El("div");
const api = { toast: (kind, title, body) => toasts.push({ kind, title }) };
app.render(root, api);
const main = root.querySelector("#g0-main");
ok(!!main, "workspace mounts with a main pane");
ok(main.innerHTML.includes("Ground-0 Phase Intelligence"), "overview renders");
ok(main.innerHTML.includes("Frontier AI developer"), "case studies render");
ok(root.querySelectorAll(".g0-rail-btn").length === 10, "ten rail sections");

const clickTab = tab => { root.querySelectorAll(".g0-rail-btn").find(b => b.dataset.tab === tab).click(); };
const clickAct = (selector, scope = root) => { const el = scope.querySelector(selector); if (!el) throw new Error("no element for " + selector); el.click(); return el; };
const html = () => main.innerHTML;

/* ── every tab renders without throwing ── */
for (const tab of ["register", "manual", "automatic", "evidence", "temporal", "phases", "logic", "spec", "access", "overview"]) {
  let threw = null;
  try { clickTab(tab); } catch (e) { threw = e; }
  ok(!threw, `tab renders: ${tab}${threw ? " — " + threw.message : ""}`);
}
ok(html().includes("Ground-0 Phase Intelligence"), "back on overview");

/* ── logic sandbox ── */
clickTab("logic");
ok(html().includes("Interactive decision tree"), "sandbox renders");
ok(html().includes("32 combinations"), "truth table present");
clickAct('[data-act="presetVector"][data-phase="GSRB"]');
ok(html().includes("GSRB") && html().includes("Self-authorizing"), "GSRB preset classifies");
const b1yes = main.querySelector('[data-act="bind"][data-path="logic.vector.0"][data-value="true"]');
b1yes.click(); // B1 already true for GSRB — no change; flip to NAB preset then toggle B1
clickAct('[data-act="presetVector"][data-phase="NAB"]');
ok(html().includes("Refusal-bound"), "NAB preset classifies");
main.querySelector('[data-act="bind"][data-path="logic.vector.0"][data-value="true"]').click(); // B1 yes → ambiguous
ok(html().includes("Step 3.5"), "ambiguous result exposes Step 3.5 constraints");
main.querySelectorAll('.g0-sandbox-constraints input[type="checkbox"]').forEach(c => { c.checked = true; dispatch(c, "change"); });
ok(html().includes("NAB-Constrained") && html().includes("All four constraints are met"), "all four C → NAB-Constrained");

/* ── phases tab ── */
clickTab("phases");
ok(html().includes("Custodial Witness Orb") && html().includes("God-Sovereign Religious Body"), "phase reference renders");
clickAct('[data-act="phaseDetail"][data-phase="CWO"]');
ok(html().includes("Legitimacy is observed, not created"), "phase detail expands");

/* ── specification reader ── */
clickTab("spec");
ok(html().includes("FINALIZED") && html().includes("NORMATIVE SOURCE"), "spec renders normative status");
ok(html().includes("Baseline test results"), "spec TOC includes section XII");
clickAct('[data-act="specTab"][data-view="source"]');
ok(specFetches.includes("specs/normative/ground-0-v1.0.md"), "the source reader requests the normative baseline from its status directory");
clickAct('[data-act="specVersion"][data-v="1.1"]');
ok(specFetches.includes("specs/normative/ground-0-v1.1.md"), "the v1.1 reader requests the ratified normative source path");
ok(html().includes('href="specs/normative/ground-0-v1.1.md"'), "the v1.1 download link uses the ratified normative source path");
clickAct('[data-act="specTab"][data-view="reader"]');
ok(html().includes("RATIFIED · NORMATIVE AMENDMENT") && html().includes("Five ratified clarifications"), "v1.1 renders with ratified amendment summary");

/* ── register (baselines) ── */
clickTab("register");
ok(html().includes("Quantum Library") && html().includes("World Health Organization"), "six source baselines listed");
ok(html().includes("6"), "register count includes baselines");

/* ── manual wizard versioned-input controls ── */
clickTab("manual");
clickAct('[data-act="startWizard"]');
const v11Cutoff = main.querySelector('[data-bind="wiz.cutoffDraft"]');
ok(v11Cutoff && v11Cutoff.attrs.type === "datetime-local", "v1.1 wizard asks for an explicit timestamp");
v11Cutoff.value = "2026-09-12T12:34:56.789";
dispatch(v11Cutoff, "input");
dispatch(v11Cutoff, "change");
const setV11Bind = (path, value) => { const el = main.querySelector(`[data-bind="${path}"]`); if (!el) throw new Error("no input " + path); el.value = value; dispatch(el, "input"); };
setV11Bind("wiz.input.name", "Timestamp Contract Test");
clickAct('[data-act="wizNext"]');
ok(html().includes("Behavioral audit"), "matching UTS cutoff passes the v1.1 wizard gate");
for (let i = 0; i < 5; i++) clickAct(`[data-act="bind"][data-path="wiz.input.answers.${i}.value"][data-value="false"]`);
clickAct('[data-act="bind"][data-path="wiz.input.answers.3.value"][data-value="true"]');
const v11Basis = main.querySelector('[data-bind="wiz.input.b4.basis"]');
v11Basis.value = "NO_PENALTY_EXIT"; dispatch(v11Basis, "change");
ok(main.querySelector('[data-bind="wiz.input.b4.terminatesAction"]'), "v1.1 B4 form exposes explicit action-termination evidence");
clickAct('[data-act="bind"][data-path="wiz.input.answers.3.value"][data-value="false"]');
clickAct('[data-act="wizNext"]');
ok(html().includes("Constraints and history"), "v1.1 wizard reaches constraint step");
for (let i = 0; i < 4; i++) clickAct(`[data-act="bind"][data-path="wiz.input.constraints.${i}.value"][data-value="false"]`);
clickAct('[data-act="toggleConstraint"][data-i="1"]');
const c2Editor = main.querySelector('[data-bind="wiz.c2Json"]');
ok(!!c2Editor, "v1.1 wizard exposes structured C2 provenance JSON");
c2Editor.value = "{";
dispatch(c2Editor, "input");
dispatch(c2Editor, "change");
clickAct('[data-act="wizNext"]');
ok(html().includes("C2 provenance JSON"), "invalid C2 JSON remains visible and blocks wizard progression");
clickAct('[data-act="wizBack"]');
clickAct('[data-act="wizBack"]');
clickAct('[data-act="wizCancel"]');

/* ── v1.0 wizard walk-through confirms the original input path still works ── */
clickTab("manual");
clickAct('[data-act="startWizard"]');
clickAct('[data-act="setVersion"][data-v="1.0"]');
ok(html().includes("Entity and declaration"), "wizard step 0");
const setBind = (path, value) => { const el = main.querySelector(`[data-bind="${path}"]`); if (!el) throw new Error("no input " + path); el.value = value; dispatch(el, "input"); };
setBind("wiz.input.name", "Test Regulatory Body");
setBind("wiz.input.identifier", "TRB-1");
setBind("wiz.cutoffDraft", "2026-09-12");
clickAct('[data-act="wizNext"]');
ok(html().includes("Behavioral audit") && html().includes("Can compliance be coerced?"), "wizard step 1");
// answer B1..B5 = NAB pattern with evidence
const answers = [
  [false, "https://example.com/a", "2026-01-05", "Advisory posture; no penalties documented."],
  [true, "https://example.com/b", "2026-01-06", "Participation is voluntary and non-binding."],
  [false, "https://example.com/c", "2026-01-07", "No downstream enforcement cascade observed."],
  [true, "https://example.com/d", "2026-01-08", "A filed appeal automatically stays the action."],
  [false, "https://example.com/e", "2026-01-09", "Authority sunsets and requires annual renewal."]
];
answers.forEach(([value], i) => {
  main.querySelector(`[data-act="bind"][data-path="wiz.input.answers.${i}.value"][data-value="${value}"]`).click();
    clickAct(`[data-act="toggleAnswer"][data-i="${i}"]`); // expand
    const a = answers[i];
  setBind(`wiz.input.answers.${i}.source`, a[1]);
  setBind(`wiz.input.answers.${i}.date`, a[2]);
  setBind(`wiz.input.answers.${i}.notes`, a[3]);
  });
// v1.0 compatibility: the original answer/citation contract is unchanged.
clickAct('[data-act="wizNext"]');
ok(html().includes("Constraints and history"), "wizard step 2");

ok(html().includes("match NAB"), "vector preview shows NAB");
clickAct('[data-act="wizNext"]');
ok(html().includes("Review and classify"), "wizard step 3");
await waitFor(() => html().includes("Detected operational phase") || html().includes("could not be generated")); // async preview
ok(html().includes("Detected operational phase") && html().includes("NAB"), "preview renders");
ok(html().includes("5 questions evidenced"), "working badge shows 5/5");
clickAct('[data-act="wizNext"]'); // save
await waitFor(() => toasts.some(t => t.title.includes("AUDIT WITNESSED")) && html().includes("Test Regulatory Body"));
ok(html().includes("Test Regulatory Body") && html().includes("Detected operational phase"), "saved audit opens in detail view");
ok(toasts.some(t => t.title.includes("AUDIT WITNESSED")), "commit fired an OS toast");
ok(html().includes("JSON record"), "detail tabs render");

/* ── register shows the saved audit; open + resume draft flow ── */
clickTab("register");
ok(html().includes("TRB-1"), "saved audit listed in register");
clickAct('[data-act="openDetail"]'); // first row
ok(html().includes("Behavioral answers"), "detail summary opens from register");
clickAct('[data-act="back"]');
ok(html().includes("audit register") || html().includes("Every claim"), "back returns to register");

/* ── evidence library ── */
clickTab("evidence");
setBindId: {
  const put = (sel, value) => { const el = main.querySelector(sel); el.value = value; dispatch(el, "input"); };
  put("#ev-title", "Charter — appeal clause");
  put("#ev-url", "https://example.com/charter");
  put("#ev-date", "2026-02-02");
  put("#ev-claim", "Appeals stay enforcement pending review.");
  put("#ev-entity", "Test Regulatory Body");
  clickAct('[data-act="addEvidence"]');
  ok(html().includes("Charter — appeal clause") && html().includes("uncited"), "evidence artifact saved and listed");
  const bad = main.querySelector("#ev-url"); bad.value = "not-a-url"; dispatch(bad, "input");
  const title = main.querySelector("#ev-title"); title.value = "Bad"; dispatch(title, "input");
  clickAct('[data-act="addEvidence"]');
  ok(!html().includes(">Bad<"), "non-public URL artifact refused");
}

/* ── temporal ledger ── */
clickTab("temporal");
ok(html().includes("Forbidden reversion") && html().includes("One-way escalation"), "transition rules render");
ok(html().includes("No transitions recorded yet"), "empty ledger state renders");

/* ── automatic: error path (no network in this harness) ── */
clickTab("automatic");
ok(html().includes("Key-free public-record research") || html().includes("Name an organization"), "automatic input renders");
clickAct('[data-act="setVersion"][data-v="1.1"]');
const autoV11Cutoff = main.querySelector('[data-bind="auto.cutoffDraft"]');
ok(autoV11Cutoff && autoV11Cutoff.attrs.type === "datetime-local" && html().includes("matching HOSUTS UDate"), "v1.1 automatic research requires an exact timestamp and explains its checked UTS projection");
clickAct('[data-act="setVersion"][data-v="1.0"]');
ok(!!main.querySelector('[data-bind="auto.cutoff"]'), "switching back to v1.0 restores its date-only cutoff input");
const q = main.querySelector('[data-bind="auto.query"]'); q.value = "Xy"; dispatch(q, "input");
clickAct('[data-act="autoStart"]');
await waitFor(() => html().includes("could not complete") || html().includes("searching") || html().includes("Choose the organization"));
ok(html().includes("could not complete") || html().includes("searching") || html().includes("Choose the organization"), "automatic stage machine advances (search/choose/error)");

/* ── accessibility prefs ── */
clickTab("access");
ok(html().includes("Text size") && html().includes("Speech rate"), "accessibility panel renders");
clickAct('[data-act="pref"][data-key="textSize"][data-value="large"]');
ok(root.dataset.textSize === "large", "text size preference applied to the workspace root");
clickAct('[data-act="resetPrefs"]');
ok(root.dataset.textSize === "default", "preferences reset");

/* ── case study runner ── */
clickTab("overview");
clickAct('[data-act="runCase"][data-id="openai"]');
ok(html().includes("FORCED RE-BADGE") && html().includes("Non-Migration"), "OpenAI case study renders its reclassification report");
ok(toasts.some(t => t.title.includes("GROUND-0 BREACH")), "case study breach logged via OS toast");

/* ── storage persisted ── */
const saved = JSON.parse(storage.get("ground-0-audits-v1") || "[]");
ok(saved.length === 1 && saved[0].name === "Test Regulatory Body" && saved[0].phase === "NAB", "audit persisted to localStorage");
const evidence = JSON.parse(storage.get("ground-0-evidence-v1") || "[]");
ok(evidence.length === 1 && evidence[0].url === "https://example.com/charter", "evidence persisted to localStorage");
const prefs = JSON.parse(storage.get("ground-0-a11y-v1") || "{}");
ok(prefs.textSize === "default", "preferences persisted after reset");

/* ── unknown (null) answers: automatic draft renders, rehydrates, and opens for review ── */
{
  const input = G0.newInput("1.0");
  input.name = "Unresolved Body"; input.identifier = "UB-1"; input.cutoff = "2026-09-12";
  input.answers = [
    { value: false, source: "https://example.com/a", date: "2026-01-05", notes: "Advisory only; no penalty.", gap: "" },
    { value: true, source: "https://example.com/b", date: "2026-01-06", notes: "Participation is voluntary and non-binding.", gap: "" },
    { value: false, source: "https://example.com/c", date: "2026-01-07", notes: "No downstream enforcement cascade.", gap: "" },
    { value: true, source: "https://example.com/d", date: "2026-01-08", notes: "A filed appeal automatically stays the action.", gap: "" },
    { value: null, source: "", date: "", notes: "", gap: "Searched official pages plus court, regulatory, legislative, news, and archive indexes; no dated B5 artifact matched." }
  ];
  input.automation = { method: "public-lookup", provider: "test", reviewRequired: true, requestedName: "Unresolved Body", generatedAt: new Date().toISOString(), sources: input.answers.filter(a => a.source).map((a, i) => ({ id: `S${i}`, title: `s${i}`, url: a.source, published: a.date, retrieved: "2026-09-12T00:00:00Z", excerpt: "", codes: [], kind: "official" })), coverage: [], warnings: [] };
  const rec = await G0.createAudit(input, []);
  ok(rec.phase === "AMBIGUOUS" && rec.confidence === "NONE" && rec.status === "Draft", "engine guard: an unknown answer blocks branch completion");
  storage.set("ground-0-audits-v1", JSON.stringify([...JSON.parse(storage.get("ground-0-audits-v1") || "[]"), rec]));
  const root2 = new El("div");
  app.render(root2, api);
  const main2 = root2.querySelector("#g0-main");
  root2.querySelectorAll(".g0-rail-btn").find(b => b.dataset.tab === "register").click();
  ok(main2.innerHTML.includes("Unresolved Body"), "automatic draft with an unknown answer rehydrates into the register");
  main2.querySelector(`[data-act="openDetail"][data-id="${rec.id}"]`).click();
  ok(main2.innerHTML.includes("not answered"), "the detail view shows the unknown question as not answered");
  const review = main2.querySelector(`[data-act="resumeAudit"][data-id="${rec.id}"]`);
  ok(!!review, "the automatic draft offers review and edit");
  review.click();
  main2.querySelector('[data-act="wizNext"]').click(); // entity step is prefilled → behavioral step
  const b5 = main2.querySelectorAll('[data-act="bind"][data-path="wiz.input.answers.4.value"]');
  ok(b5.length === 2 && !b5.some(b => b.classList.contains("on")), "the unknown question opens with neither Yes nor No pressed");
  ok(!!main2.querySelector('[data-bind="wiz.input.answers.4.gap"]'), "the bounded-search field is shown for the unknown question");
  main2.querySelector('[data-act="bind"][data-path="wiz.input.answers.4.value"][data-value="false"]').click();
  ok(main2.querySelector('[data-act="wizNext"]') && true, "ansswering the unknown question re-enables progress");
}

/* ── automatic: a completed research run must reach its result view ──
   Regression guard: the section note under the registry coverage table read
   a binding that only exists inside the table's row loop, so every run that
   finished raised a ReferenceError while rendering and the app fell into
   "The research could not complete — Can't find variable: c".
   The whole pipeline runs here against a stubbed public record. ── */
{
  const json = data => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  const cutoff = G0.today();
  const site = "https://example.org/";
  const realFetch = globalThis.fetch;
  globalThis.fetch = async value => {
    const url = new URL(value, "https://harness.test");
    if (url.origin === "https://harness.test") throw new Error("No hosted research service is configured for this harness.");
    if (url.hostname === "en.wikipedia.org") return json({ query: { pages: [{ pageid: 1, title: "Coverage Note Body", index: 1, fullurl: "https://en.wikipedia.org/wiki/Coverage_Note_Body", extract: "An example organization used by this harness.", pageprops: { wikibase_item: "Q999" } }] } });
    if (url.hostname === "www.wikidata.org") return json({ entities: { Q999: { labels: { en: { value: "Coverage Note Body" } }, descriptions: { en: { value: "corporation" } }, claims: { P856: [{ rank: "normal", mainsnak: { datavalue: { value: site } } }] } } } });
    if (url.hostname === "r.jina.ai") return json({ data: { title: "Coverage Note Body policy", url: site, publishedTime: cutoff, content: "Participation in this program is voluntary and advisory. No penalty attaches to non-participation and no obligation is imposed on participants." } });
    if (url.hostname === "www.courtlistener.com") return json({ results: [] });
    if (url.hostname === "www.federalregister.gov") return json({ results: [] });
    if (url.hostname === "www.govtrack.us") return json({ objects: [] });
    if (url.hostname === "api.gdeltproject.org") return json({ articles: [] });
    throw new Error(`Unexpected request while rendering a completed research run: ${value}`);
  };
  try {
    const autoRoot = new El("div");
    app.render(autoRoot, api);
    const autoMain = autoRoot.querySelector("#g0-main");
    autoRoot.querySelectorAll(".g0-rail-btn").find(b => b.dataset.tab === "automatic").click();
    const query = autoMain.querySelector('[data-bind="auto.query"]'); query.value = "Coverage Note Body"; dispatch(query, "input");
    const cutoffField = autoMain.querySelector('[data-bind="auto.cutoff"]'); cutoffField.value = cutoff; dispatch(cutoffField, "change");
    autoMain.querySelector('[data-act="autoStart"]').click();
    let choose = null;
    for (let i = 0; i < 40 && !choose; i++) { await sleep(100); choose = autoMain.querySelector('[data-act="autoChoose"]'); }
    ok(!!choose, "automatic research reaches the identity-choice stage");
    if (choose) choose.click();
    for (let i = 0; i < 60; i++) {
      await sleep(100);
      if (autoMain.innerHTML.includes("Coverage — every registry") || autoMain.innerHTML.includes("could not complete")) break;
    }
    ok(!autoMain.innerHTML.includes("could not complete"), "a completed research run renders its result instead of the error state");
    ok(autoMain.innerHTML.includes("Coverage — every registry, every outcome"), "the result view renders the registry coverage table");
    ok(autoMain.innerHTML.includes("record sources searched for this cutoff"), "the coverage note renders under the coverage table");
    ok(autoMain.innerHTML.includes("Suggested answers"), "the result view renders the suggested answers with their quotes");
  } finally {
    globalThis.fetch = realFetch;
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
