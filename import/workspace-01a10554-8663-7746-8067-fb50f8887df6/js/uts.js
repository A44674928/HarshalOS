/* HarshalOS UTS: display-only conversions and an approximate absolute-date model.
   No UTS value participates in HOS authority, freshness, authorization or PLV state. */
"use strict";

(() => {
  const C = 299_792_458;
  const US_PER_UM = 60;
  const US_PER_UH = 3_600;
  const US_PER_UDAY = 86_400;
  const US_PER_UY = 31_557_600;
  const EARTH_SECONDS_PER_JULIAN_YEAR = 31_557_600;
  const REFERENCE_MS = Date.UTC(2026, 9, 2, 0, 0, 0);
  const UNIVERSE_AGE_EARTH_YEARS = 13_799_000_000n;
  const C_BIG = 299_792_458n;
  const US_PER_UY_BIG = 31_557_600n;
  const UDATE_REFERENCE_UY = UNIVERSE_AGE_EARTH_YEARS * C_BIG;
  const UDATE_SCALE = 1_000_000n;
  const UNITS = Object.freeze({
    earthSecond: { label: "Earth second", seconds: 1 },
    earthMinute: { label: "Earth minute", seconds: 60 },
    earthHour: { label: "Earth hour", seconds: 3_600 },
    earthDay: { label: "Earth day", seconds: 86_400 },
    earthYear: { label: "Earth Julian year", seconds: EARTH_SECONDS_PER_JULIAN_YEAR },
    US: { label: "Universal Second (US)", seconds: 1 / C },
    UM: { label: "Universal Minute (UM)", seconds: US_PER_UM / C },
    UH: { label: "Universal Hour (UH)", seconds: US_PER_UH / C },
    UDay: { label: "Universal Day (UDay)", seconds: US_PER_UDAY / C },
    UY: { label: "Universal Year (UY)", seconds: US_PER_UY / C }
  });

  function durationToUnits(value, unitId) {
    const amount = Number(value);
    const unit = UNITS[unitId];
    if (!Number.isFinite(amount) || !unit || !Number.isFinite(unit.seconds)) {
      throw new TypeError("Enter a finite duration and choose a known time unit.");
    }
    const earthSeconds = amount * unit.seconds;
    const universalSeconds = earthSeconds * C;
    return Object.freeze({
      earthSeconds,
      US: universalSeconds,
      UM: universalSeconds / US_PER_UM,
      UH: universalSeconds / US_PER_UH,
      UDay: universalSeconds / US_PER_UDAY,
      UY: universalSeconds / US_PER_UY,
      earthMinutes: earthSeconds / 60,
      earthHours: earthSeconds / 3_600,
      earthDays: earthSeconds / 86_400,
      earthYears: earthSeconds / EARTH_SECONDS_PER_JULIAN_YEAR
    });
  }

  function roundedDivide(numerator, denominator) {
    if (numerator >= 0n) return (numerator + denominator / 2n) / denominator;
    return (numerator - denominator / 2n) / denominator;
  }

  function uDateParts(date = new Date()) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
      throw new TypeError("A valid JavaScript Date is required.");
    }
    const elapsedMs = BigInt(date.getTime() - REFERENCE_MS);
    // Date exposes milliseconds. Round to the nearest integral US (1 US ≈ 3.34 ns).
    const elapsedUS = roundedDivide(elapsedMs * C_BIG, 1_000n);
    const totalUS = UDATE_REFERENCE_UY * US_PER_UY_BIG + elapsedUS;
    const scaledUDate = roundedDivide(totalUS * UDATE_SCALE, US_PER_UY_BIG);
    const whole = scaledUDate / UDATE_SCALE;
    const fraction = (scaledUDate % UDATE_SCALE).toString().padStart(6, "0");
    return Object.freeze({
      wholeUY: whole.toString(),
      fractionUY: fraction,
      scaledUDate: scaledUDate.toString(),
      approximateEarthYears: UNIVERSE_AGE_EARTH_YEARS.toString()
    });
  }

  function formatUDate(date = new Date()) {
    const parts = uDateParts(date);
    const grouped = parts.wholeUY.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `UDate ${grouped}.${parts.fractionUY} UY since Big Bang`;
  }

  function formatUDateScientific(date = new Date()) {
    const whole = uDateParts(date).wholeUY;
    if (whole.length <= 6) return `${whole} UY`;
    return `${whole[0]}.${whole.slice(1, 4)} × 10^${whole.length - 1} UY`;
  }

  function formatNumber(value, significantDigits = 9) {
    if (!Number.isFinite(value)) return "not representable as a browser Number";
    if (value === 0) return "0";
    const magnitude = Math.abs(value);
    if (magnitude >= 1e9 || magnitude < 1e-5) return value.toExponential(significantDigits - 1);
    return value.toLocaleString(undefined, { maximumSignificantDigits: significantDigits });
  }

  function dateOnly(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function buildCalendarDays(cursor, today) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // Monday-first display.
    const count = new Date(year, month + 1, 0).getDate();
    const slots = Math.ceil((offset + count) / 7) * 7;
    const todayString = dateOnly(today);
    const days = [];
    for (let slot = 0; slot < slots; slot++) {
      const day = slot - offset + 1;
      if (day < 1 || day > count) {
        days.push('<span class="home-cal-day outside" aria-hidden="true"></span>');
        continue;
      }
      const date = new Date(year, month, day);
      const current = dateOnly(date) === todayString;
      days.push(`<span class="home-cal-day${current ? " today" : ""}"${current ? ' aria-current="date"' : ""}>${day}</span>`);
    }
    return days.join("");
  }

  let homeCalendarCursor = null;
  let homeWidgetOpen = null;

  function renderCalendar(now) {
    const grid = document.getElementById("home-calendar-days");
    const month = document.getElementById("home-calendar-month");
    const dateLabel = document.getElementById("home-calendar-date");
    if (!grid || !month) return;
    if (!homeCalendarCursor) homeCalendarCursor = new Date(now.getFullYear(), now.getMonth(), 1);
    month.textContent = homeCalendarCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    grid.innerHTML = buildCalendarDays(homeCalendarCursor, now);
    if (dateLabel) dateLabel.textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  }

  /* Minimize/restore. The collapsed state is display-only, like the rest of the
     widget: it changes no authority, freshness or PLV state. */
  function setHomeWidgetCollapsed(collapsed) {
    const widget = document.getElementById("home-time-widget");
    const toggle = document.getElementById("home-widget-toggle");
    const body = document.getElementById("home-time-body");
    if (!widget || !toggle || !body) return false;
    widget.classList.toggle("is-collapsed", collapsed);
    body.hidden = collapsed;
    toggle.textContent = collapsed ? "+" : "–";
    toggle.setAttribute("aria-expanded", String(!collapsed));
    const label = collapsed ? "Expand the clock, celestial context, and calendar" : "Minimize the clock, celestial context, and calendar";
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
    return collapsed;
  }

  function attachHomeWidget(openApp) {
    homeWidgetOpen = typeof openApp === "function" ? openApp : null;
    const widget = document.getElementById("home-time-widget");
    if (!widget || widget.dataset.utsBound === "true") return;
    widget.dataset.utsBound = "true";
    const prev = document.getElementById("home-calendar-prev");
    const next = document.getElementById("home-calendar-next");
    const open = document.getElementById("home-uts-open");
    prev?.addEventListener("click", () => {
      const base = homeCalendarCursor || new Date();
      homeCalendarCursor = new Date(base.getFullYear(), base.getMonth() - 1, 1);
      renderCalendar(new Date());
    });
    next?.addEventListener("click", () => {
      const base = homeCalendarCursor || new Date();
      homeCalendarCursor = new Date(base.getFullYear(), base.getMonth() + 1, 1);
      renderCalendar(new Date());
    });
    open?.addEventListener("click", () => homeWidgetOpen && homeWidgetOpen());
    document.getElementById("home-widget-toggle")?.addEventListener("click", () => {
      setHomeWidgetCollapsed(!widget.classList.contains("is-collapsed"));
    });
  }

  function updateHomeWidget(now = new Date()) {
    const clock = document.getElementById("home-local-clock");
    const zone = document.getElementById("home-local-zone");
    const utc = document.getElementById("home-utc-clock");
    const udate = document.getElementById("home-uts-date");
    const summary = document.getElementById("home-widget-summary");
    if (!clock) return;
    clock.textContent = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const compact = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (summary) summary.textContent = `${compact} · ${dateOnly(now)}`;
    if (zone) {
      const zoneName = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(now).find(part => part.type === "timeZoneName")?.value || "local";
      zone.textContent = `${zoneName} · device clock`;
    }
    if (utc) utc.textContent = `${dateOnly(now)} ${now.toISOString().slice(11, 19)} UTC`;
    if (udate) udate.textContent = formatUDateScientific(now);
    renderHomeCelestial(now);
    renderCalendar(now);
  }

  function celestialAt(now) {
    const model = window.HOSCelestialContext;
    if (!model || typeof model.moonAt !== "function" || typeof model.sunAt !== "function") return null;
    try { return { moon: model.moonAt(now), sun: model.sunAt(now) }; }
    catch { return null; }
  }

  function utcDateTime(milliseconds) {
    return new Date(milliseconds).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
      timeZone: "UTC", timeZoneName: "short"
    });
  }

  function renderHomeCelestial(now) {
    const context = celestialAt(now);
    const moon = document.getElementById("home-moon-phase");
    const sun = document.getElementById("home-sun-cycle");
    if (!moon || !sun) return;
    if (!context) {
      moon.textContent = "Moon context unavailable";
      sun.textContent = "Sun context unavailable";
      return;
    }
    moon.textContent = `Moon ${context.moon.glyph} ${context.moon.name} · ${context.moon.illuminationPercent}%`;
    sun.textContent = `Sun annual cycle · ${context.sun.declinationDegrees >= 0 ? "+" : ""}${context.sun.declinationDegrees.toFixed(1)}° declination`;
  }

  function renderAppCelestial(body, now) {
    const context = celestialAt(now);
    const icon = body.querySelector("#uts-moon-icon");
    const name = body.querySelector("#uts-moon-name");
    const meta = body.querySelector("#uts-moon-meta");
    const next = body.querySelector("#uts-moon-next");
    const arc = body.querySelector("#uts-sun-arc");
    const sunMeta = body.querySelector("#uts-sun-meta");
    if (!icon || !name || !meta || !next || !arc || !sunMeta) return;
    if (!context) {
      icon.textContent = "—";
      name.textContent = "Celestial estimate unavailable";
      meta.textContent = "The local calculation could not process this date.";
      next.textContent = "—";
      arc.textContent = "—";
      sunMeta.textContent = "—";
      return;
    }
    const { moon, sun } = context;
    icon.textContent = moon.glyph;
    name.textContent = moon.name;
    meta.textContent = `${moon.trend} · ${moon.illuminationPercent}% illuminated · lunar age ${moon.ageDays.toFixed(1)} days`;
    next.textContent = `Next ${moon.nextPrincipalEvent.kind} Moon · ${utcDateTime(moon.nextPrincipalEvent.time)}`;
    arc.textContent = sun.annualArc;
    sunMeta.textContent = `Apparent solar longitude ${sun.apparentLongitudeDegrees.toFixed(1)}° · declination ${sun.declinationDegrees >= 0 ? "+" : ""}${sun.declinationDegrees.toFixed(2)}° · equation of time ${sun.equationOfTimeMinutes >= 0 ? "+" : ""}${sun.equationOfTimeMinutes.toFixed(1)} min`;
  }

  function renderApp(body) {
    body.innerHTML = `
      <div class="h1">UTS Watch &amp; Converter</div>
      <p class="sub">A light-speed-based duration system, UTC-to-UTS date projection, and approximate Moon/Sun context. Earth date/time comes from this browser's device clock; astronomical values are display-only estimates, not independent clocks.</p>
      <div class="rule-box refusal"><strong>DISPLAY ONLY — NO AUTHORITY EFFECT.</strong> UTS values do not change HOS freshness, Human Key state, Ground-0 classification, authorization, or the duty ledger. Browser time and this approximate cosmological epoch are not trusted security time.</div>

      <section class="uts-watch-panel" aria-label="Current time">
        <div class="uts-watch-primary"><span class="uts-eyebrow">LOCAL DEVICE TIME</span><strong data-uts-local>—</strong><small data-uts-zone>—</small></div>
        <div class="uts-watch-secondary"><div><span>EARTH UTC</span><code data-uts-utc>—</code></div><div><span>MODEL UDate</span><code data-uts-date>—</code></div></div>
      </section>

      <section class="uts-celestial-panel" aria-label="Approximate celestial context">
        <div class="uts-celestial-card">
          <span class="uts-eyebrow">MOON · PHASE ESTIMATE</span>
          <div class="uts-moon-readout"><span id="uts-moon-icon" aria-hidden="true">—</span><strong id="uts-moon-name">—</strong></div>
          <p id="uts-moon-meta">—</p>
          <small id="uts-moon-next">—</small>
        </div>
        <div class="uts-celestial-card">
          <span class="uts-eyebrow">SUN · ANNUAL APPARENT CYCLE</span>
          <strong id="uts-sun-arc">—</strong>
          <p id="uts-sun-meta">—</p>
        </div>
      </section>
      <p class="uts-celestial-note">Approximate geocentric context from the device date/time. This does not calculate local sunrise/sunset, lunar horizon visibility, or solar activity; it is not an authority clock or an action signal.</p>

      <div class="h2">Duration calculator</div>
      <p class="body">Enter any finite duration. The calculator converts between Earth-time units and the UTS units below using the exact defined value of <span class="mono">c</span>. The calendar's “day” and “year” are duration units, not Earth calendar blocks.</p>
      <div class="uts-converter">
        <label for="uts-value">Duration</label>
        <input id="uts-value" type="number" inputmode="decimal" step="any" value="1" aria-label="Duration value">
        <label for="uts-unit">Input unit</label>
        <select id="uts-unit">
          <option value="earthSecond">Earth second</option>
          <option value="earthMinute">Earth minute</option>
          <option value="earthHour">Earth hour</option>
          <option value="earthDay">Earth day</option>
          <option value="earthYear">Earth Julian year (365.25 days)</option>
          <option value="US">Universal Second (US)</option>
          <option value="UM">Universal Minute (UM)</option>
          <option value="UH">Universal Hour (UH)</option>
          <option value="UDay">Universal Day (UDay)</option>
          <option value="UY">Universal Year (UY)</option>
        </select>
        <button class="btn btn-ice" id="uts-convert" type="button">CONVERT</button>
      </div>
      <div class="uts-results" id="uts-results" aria-live="polite"></div>

      <div class="h2">Definitions and model boundary</div>
      <div class="uts-definition-grid">
        <div><strong>US</strong><span>1 / c Earth seconds</span><small>≈ 3.33564095 ns</small></div>
        <div><strong>UM</strong><span>60 US</span><small>≈ 0.200138 μs</small></div>
        <div><strong>UH</strong><span>3,600 US</span><small>≈ 12.0083 μs</small></div>
        <div><strong>UDay</strong><span>86,400 US</span><small>≈ 0.288199 ms</small></div>
        <div><strong>UY</strong><span>31,557,600 US</span><small>≈ 0.1052648 s</small></div>
      </div>
      <div class="rule-box">Absolute date notation is <span class="mono">UDate … UY since Big Bang</span>; <span class="mono">UDay</span> is only a duration unit. The model anchors 13.799 billion Earth Julian years at 2026-10-02 00:00 UTC and advances linearly from the supplied UTC instant. That approximation is not a cosmological measurement or an external time authority.</div>
      <div class="footer-note">LIGHT-SPEED-BASED UNIT ARITHMETIC IS EXACT; THE COSMOLOGICAL EPOCH, DEVICE CLOCK, ROUNDING, AND BROWSER DATE PRECISION ARE NOT. UTS DOES NOT GOVERN HOS AUTHORIZATION.</div>`;

    const updateWatch = now => {
      body.querySelector("[data-uts-local]").textContent = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      body.querySelector("[data-uts-zone]").textContent = new Intl.DateTimeFormat(undefined, { timeZoneName: "long" }).formatToParts(now).find(part => part.type === "timeZoneName")?.value || "Local time zone";
      body.querySelector("[data-uts-utc]").textContent = `${dateOnly(now)} ${now.toISOString().slice(11, 19)} UTC`;
      body.querySelector("[data-uts-date]").textContent = formatUDate(now);
      renderAppCelestial(body, now);
    };

    const updateConversion = () => {
      const input = body.querySelector("#uts-value");
      const unit = body.querySelector("#uts-unit");
      const host = body.querySelector("#uts-results");
      const rawValue = input.value == null ? String(input.attrs?.value ?? "") : String(input.value);
      const unitId = unit.value || "earthSecond";
      const value = Number(rawValue);
      if (!rawValue.trim() || !Number.isFinite(value)) {
        host.innerHTML = '<p class="rule-box refusal">Enter a finite number to calculate a duration.</p>';
        return;
      }
      try {
        const result = durationToUnits(value, unitId);
        const rows = [
          ["Earth seconds", result.earthSeconds],
          ["Universal Seconds (US)", result.US],
          ["Universal Minutes (UM)", result.UM],
          ["Universal Hours (UH)", result.UH],
          ["Universal Days (UDay)", result.UDay],
          ["Universal Years (UY)", result.UY]
        ];
        host.innerHTML = `<p class="uts-result-caption">${formatNumber(value)} ${UNITS[unitId].label} =</p><dl>${rows.map(([label, amount]) => `<div><dt>${label}</dt><dd>${formatNumber(amount)}</dd></div>`).join("")}</dl>`;
      } catch (error) {
        host.innerHTML = `<p class="rule-box refusal">${String(error.message || "Conversion failed.")}</p>`;
      }
    };

    body.querySelector("#uts-convert").addEventListener("click", updateConversion);
    body.querySelector("#uts-value").addEventListener("keydown", event => {
      if (event.key === "Enter") updateConversion();
    });
    body.querySelector("#uts-unit").addEventListener("change", updateConversion);
    updateConversion();
    updateWatch(new Date());
    const timer = setInterval(() => {
      const mounted = typeof document.body.contains === "function" ? document.body.contains(body) : !!body.parent;
      if (!mounted) { clearInterval(timer); return; }
      updateWatch(new Date());
    }, 1_000);
  }

  window.HOSUTS = Object.freeze({
    C, US_PER_UM, US_PER_UH, US_PER_UDAY, US_PER_UY, UNITS,
    durationToUnits, uDateParts, formatUDate, formatUDateScientific,
    formatNumber, attachHomeWidget, updateHomeWidget, setHomeWidgetCollapsed, renderApp
  });
})();
