/* ═══════════════════════════════════════════════════════════════
   HarshalOS — window manager + shell chrome
   Windows, taskbar, origin menu, desktop icons, toasts, HUD.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

const shell = (() => {

  const windows = new Map();     // appId -> window record
  let zTop = 100;
  let spawnOffset = 0;

  const $ = sel => document.querySelector(sel);

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
          <button class="win-ctl min" title="Minimize">–</button>
          <button class="win-ctl close" title="Close">✕</button>
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
      if (e.target.closest(".win-ctl")) return;
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

    el.addEventListener("pointerdown", () => focus(app.id));
    el.querySelector(".win-ctl.close").addEventListener("click", () => closeApp(app.id));
    el.querySelector(".win-ctl.min").addEventListener("click", () => minimizeApp(app.id));

    focus(app.id);
    renderTaskbar();
    return rec;
  }

  function closeApp(id) {
    const rec = windows.get(id);
    if (!rec) return;
    rec.el.remove();
    windows.delete(id);
    renderTaskbar();
  }

  function minimizeApp(id) {
    const rec = windows.get(id);
    if (!rec) return;
    rec.el.classList.add("minimized");
    renderTaskbar();
  }

  function focus(id) {
    const rec = windows.get(id);
    if (!rec) return;
    rec.el.classList.remove("minimized");
    rec.el.style.zIndex = ++zTop;
    windows.forEach(r => r.el.classList.remove("focused"));
    rec.el.classList.add("focused");
    renderTaskbar();
    if (rec.app.onFocus) rec.app.onFocus(rec.body, api);
  }

  function refreshPdhTags() {
    const { phase } = kernel.state;
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
    if (show) {
      menu.style.animation = "none";
      void menu.offsetWidth;
      menu.style.animation = "";
    }
  }

  function buildDesktopIcons() {
    const field = $("#icon-field");
    field.innerHTML = "";
    APPS.forEach(app => {
      const b = document.createElement("button");
      b.className = "desk-icon";
      b.innerHTML = `<span class="di-glyph">${app.glyph}</span><span class="di-label">${app.short || app.title}</span>`;
      b.addEventListener("dblclick", () => openApp(app));
      b.addEventListener("click", () => openApp(app));
      field.appendChild(b);
    });
  }

  /* ─────────── HUD ─────────── */
  function updateHud() {
    const s = kernel.state;
    const L = kernel.L();
    const dt = kernel.deltaSeconds();
    const p = DATA.phases[s.phase];

    const phaseChip = $("#hud-phase");
    phaseChip.innerHTML = `<span class="badge-glyph">${p.glyph}</span> ${s.phase} · ${p.badgeTag}`;

    const keyChip = $("#hud-key");
    if (s.H === 1) {
      keyChip.className = "hud-chip key-chip attested";
      keyChip.textContent = "H(t)=1 · HUMAN KEY";
    } else {
      keyChip.className = "hud-chip key-chip absent";
      keyChip.textContent = "H(t)=0 · KEY ABSENT";
    }

    $("#hud-L").textContent = L.toFixed(2);
    $("#hud-L-fill").style.width = Math.round(L * 100) + "%";
    $("#hud-dt").textContent = isFinite(dt)
      ? `Δt ${Math.min(9999, Math.floor(dt))}s / δ ${kernel.DELTA_MAX}s`
      : `Δt — / δ ${kernel.DELTA_MAX}s`;

    const clock = $("#hud-clock");
    const d = new Date();
    clock.textContent = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    $("#tb-phase").textContent = `${p.glyph} ${s.phase}`;
    $("#tb-session").textContent = `session: ${
      s.phase === "CWO" ? "witness-only" : s.H === 1 ? (kernel.sessionFresh() ? "attested / fresh" : "stale") : "non-acting"
    }`;

    // void banner
    const banner = $("#void-banner");
    const shouldShow = s.voidMode || (s.H === 1 && dt >= kernel.DELTA_MAX);
    if (shouldShow && banner.hidden) {
      banner.hidden = false;
      $("#void-title").textContent = "LEGITIMACY EXPIRED — MATHEMATICALLY VOID";
      $("#void-msg").textContent = "Δt ≥ δ. Temporal decay enforced with zero latency. L(t) = 0. The default state of the system is refusal.";
    } else if (!shouldShow && !banner.hidden && s.H === 1) {
      banner.hidden = true;
    } else if (s.H === 0 && !banner.hidden) {
      $("#void-title").textContent = "HUMAN KEY ABSENT — MATHEMATICALLY VOID";
      $("#void-msg").textContent = "H(t) = 0. Legitimacy is gated by the Human Key. Without verifiable conscious human intent, no critical action is permitted.";
    }

    refreshPdhTags();
  }

  /* ─────────── api passed to apps ─────────── */
  const api = {
    toast, openApp, closeApp, focus, updateHud,
    requireHumanKey(actionName) {
      if (kernel.state.H !== 1) {
        toast("refusal", "REFUSAL — HUMAN KEY REQUIRED",
          `'${actionName}' is a critical action. H(t) = 0. Open the Human Key app and attest verifiable conscious human intent. Refusal is not failure; it is the primary act of responsible control.`);
        kernel.record("warning", `Critical action '${actionName}' blocked — Human Key absent.`);
        return false;
      }
      if (!kernel.sessionFresh()) {
        toast("refusal", "REFUSAL — STALE PERMISSION",
          `'${actionName}' refused. Δt ≥ δ. Authorization is time-sensitive; the permitted scope has contracted to zero. Re-attest the Human Key.`);
        kernel.record("warning", `Critical action '${actionName}' blocked — stale permission (Δt ≥ δ).`);
        return false;
      }
      return true;
    },
    reportAction(result) {
      if (result.permitted) {
        toast("permit", "PERMITTED — x(t) = Permitted", result.reason);
      } else {
        toast("refusal", `REFUSAL — ${result.code}`, result.reason);
      }
    }
  };

  /* ─────────── wiring ─────────── */
  function init() {
    buildOriginMenu();
    buildDesktopIcons();
    renderTaskbar();

    $("#origin-btn").addEventListener("click", e => { e.stopPropagation(); toggleMenu(); });
    $("#taskbar-origin").addEventListener("click", e => { e.stopPropagation(); toggleMenu(); });
    document.addEventListener("click", e => {
      if (!e.target.closest("#origin-menu") && !e.target.closest("#origin-btn") && !e.target.closest("#taskbar-origin")) {
        toggleMenu(false);
      }
    });
    $("#void-reattest").addEventListener("click", () => {
      const app = APPS.find(a => a.id === "humankey");
      if (app) openApp(app);
    });

    kernel.on("state", updateHud);
    kernel.on("tick", updateHud);
    setInterval(updateHud, 1000);
    updateHud();
  }

  return { init, openApp, toast, api, windows };
})();

/* expose for debugging and external harnesses */
window.shell = shell;
