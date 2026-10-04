/* ═══════════════════════════════════════════════════════════════
   HarshalOS — window manager + shell chrome
   Windows, taskbar, origin menu, desktop icons, toasts, HUD.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

const shell = (() => {

  const windows = new Map();     // appId -> window record
  const WINDOW_FULLSCREEN_CLASS = "window-fullscreen";
  let zTop = 100;
  let spawnOffset = 0;

  const $ = sel => document.querySelector(sel);

  function nativeFullscreenFor(rec) {
    const doc = rec.el.ownerDocument || document;
    const active = doc.fullscreenElement;
    return Boolean(active && (active === rec.el || rec.el.contains(active)));
  }

  function syncFullscreenControl(rec) {
    const button = rec.el.querySelector(".win-ctl.fullscreen");
    if (!button) return;
    const active = rec.el.classList.contains(WINDOW_FULLSCREEN_CLASS) || nativeFullscreenFor(rec);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", `${active ? "Exit" : "Enter"} whole-app fullscreen for ${rec.app.title}`);
    button.title = `${active ? "Exit" : "Enter"} whole-app fullscreen`;
    button.textContent = active ? "⤢" : "⛶";
  }

  function syncAllFullscreenControls() {
    windows.forEach(syncFullscreenControl);
  }

  async function toggleWindowFullscreen(id) {
    const rec = windows.get(id);
    if (!rec) return;
    const doc = rec.el.ownerDocument || document;
    if (rec.el.classList.contains(WINDOW_FULLSCREEN_CLASS)) {
      rec.el.classList.remove(WINDOW_FULLSCREEN_CLASS);
      syncFullscreenControl(rec);
      return;
    }
    if (nativeFullscreenFor(rec)) {
      try {
        if (typeof doc.exitFullscreen === "function") await doc.exitFullscreen();
      } catch { /* retain the current state if the browser refuses to exit */ }
      syncFullscreenControl(rec);
      return;
    }
    try {
      if (typeof rec.el.requestFullscreen !== "function") throw new Error("Fullscreen API unavailable");
      await rec.el.requestFullscreen();
    } catch {
      // Single-click fallback fills the app viewport if native fullscreen is
      // blocked by the browser or preview iframe's permissions policy.
      rec.el.classList.add(WINDOW_FULLSCREEN_CLASS);
    }
    syncFullscreenControl(rec);
  }

  function releaseWindowFullscreen(rec) {
    if (!rec) return;
    const doc = rec.el.ownerDocument || document;
    rec.el.classList.remove(WINDOW_FULLSCREEN_CLASS);
    if (nativeFullscreenFor(rec) && typeof doc.exitFullscreen === "function") {
      try {
        const result = doc.exitFullscreen();
        if (result && typeof result.catch === "function") result.catch(() => {});
      } catch { /* closing/minimizing the window remains allowed */ }
    }
    syncFullscreenControl(rec);
  }

  function exitFallbackFullscreenOnEscape(event) {
    if (event.key !== "Escape") return;
    const rec = [...windows.values()].find(windowRecord => windowRecord.el.classList.contains(WINDOW_FULLSCREEN_CLASS));
    if (!rec) return;
    event.preventDefault();
    rec.el.classList.remove(WINDOW_FULLSCREEN_CLASS);
    syncFullscreenControl(rec);
  }

  /* ─────────── toasts ─────────── */
  function toast(kind, title, body, ms = 5200) {
    const host = $("#toasts");
    const el = document.createElement("div");
    el.className = `toast ${kind}`;
    el.innerHTML = `<div class="t-title"></div><div class="t-body"></div>`;
    el.querySelector(".t-title").textContent = title;
    el.querySelector(".t-body").textContent = body;
    host.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity .5s";
      setTimeout(() => el.remove(), 550);
    }, ms);
    return el;
  }

  /* ─────────── window manager ─────────── */
  function openApp(app) {
    if (windows.has(app.id)) {
      const rec = windows.get(app.id);
      rec.el.classList.remove("minimized");
      focus(app.id);
      return rec;
    }

    const layer = $("#window-layer");
    const el = document.createElement("section");
    el.className = "window focused";
    const w = Math.min(app.w || 660, window.innerWidth - 40);
    const h = Math.min(app.h || 520, window.innerHeight - 140);
    const left = Math.max(12, Math.min(120 + spawnOffset * 26, window.innerWidth - w - 20));
    const top = Math.max(12, Math.min(40 + spawnOffset * 22, window.innerHeight - h - 90));
    spawnOffset = (spawnOffset + 1) % 8;
    el.style.width = w + "px";
    el.style.height = h + "px";
    el.style.left = left + "px";
    el.style.top = top + "px";
    el.style.zIndex = ++zTop;

    el.innerHTML = `
      <div class="win-title">
        <span class="win-glyph"></span>
        <span class="win-name"></span>
        <span class="win-pdh mono">PDH · ${app.id.toUpperCase()} · NON-ACTING</span>
        <div class="win-controls">
          ${app.fullscreen === true ? '<button class="win-ctl fullscreen" type="button" title="Enter whole-app fullscreen" aria-label="Enter whole-app fullscreen" aria-pressed="false">⛶</button>' : ""}
          <button class="win-ctl min" type="button" title="Minimize" aria-label="Minimize window">–</button>
          <button class="win-ctl close" type="button" title="Close" aria-label="Close window">✕</button>
        </div>
      </div>
      <div class="win-body"></div>`;
    el.querySelector(".win-glyph").textContent = app.glyph;
    el.querySelector(".win-name").textContent = app.title;
    layer.appendChild(el);

    const body = el.querySelector(".win-body");
    app.render(body, api);

    const rec = { id: app.id, app, el, body, pdhTag: el.querySelector(".win-pdh") };
    windows.set(app.id, rec);

    // dragging
    const title = el.querySelector(".win-title");
    let drag = null;
    title.addEventListener("pointerdown", e => {
      if (e.target.closest(".win-ctl") || window.innerWidth <= 860 || e.button > 0
        || el.classList.contains(WINDOW_FULLSCREEN_CLASS) || nativeFullscreenFor(rec)) return;
      drag = { x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop };
      focus(app.id);
      title.setPointerCapture(e.pointerId);
    });
    title.addEventListener("pointermove", e => {
      if (!drag) return;
      const nl = Math.max(-w + 120, Math.min(drag.l + e.clientX - drag.x, window.innerWidth - 80));
      const nt = Math.max(0, Math.min(drag.t + e.clientY - drag.y, window.innerHeight - 120));
      el.style.left = nl + "px";
      el.style.top = nt + "px";
    });
    title.addEventListener("pointerup", () => { drag = null; });
    title.addEventListener("pointercancel", () => { drag = null; });
    title.addEventListener("lostpointercapture", () => { drag = null; });

    el.addEventListener("pointerdown", () => focus(app.id));
    el.querySelector(".win-ctl.close").addEventListener("click", () => closeApp(app.id));
    el.querySelector(".win-ctl.min").addEventListener("click", () => minimizeApp(app.id));
    const fullscreenButton = el.querySelector(".win-ctl.fullscreen");
    if (fullscreenButton) fullscreenButton.addEventListener("click", () => { void toggleWindowFullscreen(app.id); });

    focus(app.id);
    renderTaskbar();
    return rec;
  }

  function closeApp(id) {
    const rec = windows.get(id);
    if (!rec) return;
    releaseWindowFullscreen(rec);
    rec.el.remove();
    windows.delete(id);
    renderTaskbar();
  }

  function minimizeApp(id) {
    const rec = windows.get(id);
    if (!rec) return;
    releaseWindowFullscreen(rec);
    rec.el.classList.add("minimized");
    renderTaskbar();
  }

  function focus(id) {
    const rec = windows.get(id);
    if (!rec) return;
    // Do not replace taskbar buttons during pointerdown on an already focused
    // window: removing the tapped control before pointerup loses its click.
    if (rec.el.classList.contains("focused") && !rec.el.classList.contains("minimized")) return;
    rec.el.classList.remove("minimized");
    rec.el.style.zIndex = ++zTop;
    windows.forEach(r => r.el.classList.remove("focused"));
    rec.el.classList.add("focused");
    renderTaskbar();
    if (rec.app.onFocus) rec.app.onFocus(rec.body, api);
  }

  function refreshPdhTags() {
    const { phase } = HOS.observe();
    windows.forEach(rec => {
      if (rec.pdhTag) {
        rec.pdhTag.textContent = `PDH · ${rec.id.toUpperCase()} · ${
          phase === "NAB" ? "NON-ACTING" : phase === "CWO" ? "WITNESS-ONLY" : "SOVEREIGN-ACTING"
        }`;
      }
    });
  }

  /* ─────────── taskbar + origin menu ─────────── */
  function renderTaskbar() {
    const host = $("#taskbar-apps");
    host.innerHTML = "";
    windows.forEach(rec => {
      const b = document.createElement("button");
      b.className = "tb-app" + (rec.el.classList.contains("focused") && !rec.el.classList.contains("minimized") ? " active" : "");
      b.innerHTML = `<span>${rec.app.glyph}</span><span>${rec.app.short || rec.app.title}</span>`;
      b.addEventListener("click", () => {
        if (rec.el.classList.contains("focused") && !rec.el.classList.contains("minimized")) {
          minimizeApp(rec.id);
        } else {
          focus(rec.id);
        }
      });
      host.appendChild(b);
    });
  }

  function buildOriginMenu() {
    const list = $("#om-apps");
    list.innerHTML = "";
    APPS.forEach(app => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.className = "om-app";
      b.innerHTML = `
        <span class="om-glyph">${app.glyph}</span>
        <span>
          <div class="om-name">${app.title}</div>
          <div class="om-desc">${app.desc}</div>
        </span>`;
      b.addEventListener("click", () => {
        toggleMenu(false);
        openApp(app);
      });
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  function toggleMenu(force) {
    const menu = $("#origin-menu");
    const show = force !== undefined ? force : menu.hidden;
    menu.hidden = !show;
    $("#origin-btn").setAttribute("aria-expanded", String(show));
    $("#taskbar-origin").setAttribute("aria-expanded", String(show));
    if (show) {
      menu.style.animation = "none";
      void menu.offsetWidth;
      menu.style.animation = "";
    }
  }

  function buildDesktopIcons() {
    const field = $("#icon-field");
    field.innerHTML = "";
    const orderedApps = [...APPS].sort((a, b) => {
      const aName = a.short || a.title || a.id;
      const bName = b.short || b.title || b.id;
      return aName.localeCompare(bName, "en", { sensitivity: "base", numeric: true })
        || String(a.id).localeCompare(String(b.id), "en", { sensitivity: "base", numeric: true });
    });
    orderedApps.forEach(app => {
      const b = document.createElement("button");
      const label = app.short || app.title;
      b.className = "desk-icon";
      b.setAttribute("aria-label", `Open ${app.title}`);
      b.setAttribute("title", app.title);
      b.innerHTML = `<span class="di-glyph">${app.glyph}</span><span class="di-label">${label}</span>`;
      b.addEventListener("dblclick", () => openApp(app));
      b.addEventListener("click", () => openApp(app));
      field.appendChild(b);
    });
  }

  /* ─────────── HUD ─────────── */
  function updateHud() {
    const s = HOS.observe();
    const L = s.metrics.legitimacy;
    const dt = s.metrics.deltaSeconds;
    const p = DATA.phases[s.phase];

    const phaseChip = $("#hud-phase");
    phaseChip.innerHTML = `<span class="badge-glyph">${p.glyph}</span> ${s.phase} · ${p.badgeTag}`;

    const keyChip = $("#hud-key");
    if (s.attestation.status === "pending") {
      keyChip.className = "hud-chip key-chip pending";
      keyChip.textContent = "DEMO H(t)=0 · PENDING";
    } else if (s.attestation.status === "active" && !s.attestation.expired) {
      keyChip.className = "hud-chip key-chip attested";
      keyChip.textContent = "DEMO H(t)=1 · LOCAL";
    } else if (s.attestation.status === "active") {
      keyChip.className = "hud-chip key-chip absent";
      keyChip.textContent = "DEMO H(t)=1 · EXPIRED";
    } else {
      keyChip.className = "hud-chip key-chip absent";
      keyChip.textContent = `DEMO H(t)=0 · ${s.attestation.status.toUpperCase()}`;
    }

    $("#hud-L").textContent = L.toFixed(2);
    $("#hud-L-fill").style.width = Math.round(L * 100) + "%";
    $("#hud-dt").textContent = isFinite(dt)
      ? `demo Δt ${Math.min(9999, Math.floor(dt))}s / δ ${HOS.DELTA_MAX}s`
      : `demo Δt — / δ ${HOS.DELTA_MAX}s`;

    const clock = $("#hud-clock");
    const d = new Date();
    clock.textContent = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (window.HOSUTS && typeof window.HOSUTS.updateHomeWidget === "function") {
      window.HOSUTS.updateHomeWidget(d);
    }

    $("#tb-phase").textContent = `${p.glyph} ${s.phase}`;
    $("#tb-session").textContent = `demo session: ${
      s.phase === "CWO" ? "witness-only" : s.attestation.status === "pending" ? "attestation pending / non-acting"
        : s.attestation.status === "active" ? (s.metrics.demoTimerFresh ? "local / fresh" : "local / stale") : "non-acting"
    }`;

    // Expiry is derived from freshness; it is not a separate stored authority state.
    const banner = $("#void-banner");
    const shouldShow = s.attestation.expired;
    if (shouldShow && banner.hidden) {
      banner.hidden = false;
      $("#void-title").textContent = "DEMO GATE EXPIRED — MATHEMATICALLY VOID";
      $("#void-msg").textContent = "The local demo timer reached δ. The simulated L(t) = 0; this is not independently verified liveness. Production authentication is unavailable.";
    } else if (!shouldShow && !banner.hidden) {
      banner.hidden = true;
    }

    refreshPdhTags();
  }

  /* ─────────── api passed to apps ─────────── */
  const api = {
    toast, openApp, closeApp, focus, updateHud,
    requireDemoGate(actionName) {
      const s = HOS.observe();
      if (s.attestation.status === "pending") {
        toast("refusal", "DEMO GATE — ATTESTATION PENDING",
          `'${actionName}' is refused while the local HMAC is pending. H(t) remains 0 until the current ceremony succeeds; this demo does not grant production authority.`);
        HOS.record("warning", `Demo action '${actionName}' blocked — attestation pending.`);
        return false;
      }
      if (s.H !== 1) {
        toast("refusal", "DEMO GATE — CONFIRMATION REQUIRED",
          `'${actionName}' cannot pass the local demonstration gate while H(t) = 0. The public phrase exercises the model only; it does not verify a person or grant production authority.`);
        HOS.record("warning", `Demo action '${actionName}' blocked — local marker absent.`);
        return false;
      }
      if (!s.metrics.demoTimerFresh) {
        toast("refusal", "DEMO GATE — TIMER EXPIRED",
          `'${actionName}' is refused by the local demo timer (Δt ≥ δ). This is an elapsed-time exercise, not a verified Human Key freshness check.`);
        HOS.record("warning", `Demo action '${actionName}' blocked — local demo timer expired.`);
        return false;
      }
      return true;
    },
    reportAction(result) {
      if (result.permitted) {
        toast("info", "DEMO ONLY — LOCAL GATE WOULD PERMIT", `${result.reason} Scope: ${result.executionScope || "LOCAL-DEMO-ONLY"}.`);
      } else {
        toast("refusal", `DEMO GATE — ${result.code}`, result.reason);
      }
    }
  };

  /* ─────────── wiring ─────────── */
  /* Deep link: #app=<id> opens one already-registered app after the desktop builds.
     It selects by id only — an unknown id opens nothing and reports nothing, and the
     hash grants no authority over any app's own gate. */
  function openDeepLinkedApp() {
    const match = /^#app=([a-z0-9-]{1,40})$/i.exec(window.location.hash || "");
    if (!match) return;
    const app = APPS.find(candidate => candidate.id === match[1].toLowerCase());
    if (app) openApp(app);
  }

  function init() {
    buildOriginMenu();
    buildDesktopIcons();
    renderTaskbar();

    if (window.HOSUTS && typeof window.HOSUTS.attachHomeWidget === "function") {
      window.HOSUTS.attachHomeWidget(() => {
        const uts = APPS.find(app => app.id === "uts");
        if (uts) openApp(uts);
      });
    }

    $("#origin-btn").addEventListener("click", e => { e.stopPropagation(); toggleMenu(); });
    $("#taskbar-origin").addEventListener("click", e => { e.stopPropagation(); toggleMenu(); });
    document.addEventListener("keydown", e => {
      exitFallbackFullscreenOnEscape(e);
      if (e.key === "Escape") toggleMenu(false);
    });
    document.addEventListener("fullscreenchange", syncAllFullscreenControls);
    document.addEventListener("fullscreenerror", syncAllFullscreenControls);
    document.addEventListener("click", e => {
      if (!e.target.closest("#origin-menu") && !e.target.closest("#origin-btn") && !e.target.closest("#taskbar-origin")) {
        toggleMenu(false);
      }
    });
    $("#void-reattest").addEventListener("click", () => {
      const app = APPS.find(a => a.id === "humankey");
      if (app) openApp(app);
    });

    HOS.subscribe("state", updateHud);
    HOS.subscribe("tick", updateHud);
    setInterval(updateHud, 1000);
    updateHud();
    openDeepLinkedApp();
  }

  return { init, openApp, toast, api, windows };
})();

/* expose for debugging and external harnesses */
window.shell = shell;
