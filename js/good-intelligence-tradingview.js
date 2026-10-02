/* Good Intelligence — TradingView Lightweight Charts™ adapter.
   Turns the same OHLCV packets the Market Charts tab uses into series data,
   markers, and chart options for the vendored TradingView library. This module
   is pure data/option translation: it never fetches, never writes to the DOM,
   and never turns a missing bar into a fabricated one. Chart data is drawn
   locally by the bundled library; nothing is sent to TradingView. */
"use strict";

window.GoodIntelligenceTradingView = (() => {
  /* The vendored Apache-2.0 build from js/vendor/lightweight-charts/.
     See that directory's PROVENANCE.md for source, version, and SHA-256. */
  const LIBRARY = Object.freeze({
    name: "TradingView Lightweight Charts™",
    version: "5.2.1",
    license: "Apache-2.0",
    homepage: "https://www.tradingview.com/free-charting-libraries/",
    documentation: "https://tradingview.github.io/lightweight-charts/",
    vendored: "js/vendor/lightweight-charts/lightweight-charts.standalone.production.js",
    global: "LightweightCharts"
  });
  const MAX_CHART_BARS = 480;
  const UP_COLOR = "#54d6b4";
  const DOWN_COLOR = "#e87487";
  const LINE_COLOR = "#6fd3ff";
  const VOLUME_UP = "rgba(84, 214, 180, 0.34)";
  const VOLUME_DOWN = "rgba(232, 116, 135, 0.34)";

  /* Chart types the free library can draw from OHLCV data. Each entry maps to a
     v5 series definition and to the pre-v5 method name, so a vendored 4.x build
     would still work instead of silently rendering nothing. */
  const CHART_TYPES = Object.freeze([
    Object.freeze({ id: "candles", label: "Candlesticks", series: "CandlestickSeries", legacy: "addCandlestickSeries", closesOnly: false }),
    Object.freeze({ id: "bars", label: "OHLC bars", series: "BarSeries", legacy: "addBarSeries", closesOnly: false }),
    Object.freeze({ id: "line", label: "Line", series: "LineSeries", legacy: "addLineSeries", closesOnly: true }),
    Object.freeze({ id: "area", label: "Area", series: "AreaSeries", legacy: "addAreaSeries", closesOnly: true }),
    Object.freeze({ id: "baseline", label: "Baseline", series: "BaselineSeries", legacy: "addBaselineSeries", closesOnly: true })
  ]);
  const DEFAULT_CHART_TYPE = CHART_TYPES[0].id;

  const finite = value => typeof value === "number" && Number.isFinite(value);
  const text = (value, max = 80) => typeof value === "string" ? value.trim().slice(0, max) : "";
  /* Packet bar times are epoch milliseconds; the library wants UTC seconds.
     Accept either so a marker can never be dropped (or misplaced) by unit drift. */
  const toSeconds = value => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return NaN;
    return Math.floor(number > 1e11 ? number / 1000 : number);
  };

  function chartType(value) {
    return CHART_TYPES.find(entry => entry.id === value) || CHART_TYPES[0];
  }

  /* The chart library is optional local furniture: if the vendored script did not
     load (a blocked asset, an old cached page), the tab says so instead of
     pretending a chart rendered. */
  function availability() {
    const api = window.LightweightCharts;
    if (!api || typeof api.createChart !== "function") {
      return {
        available: false,
        version: "",
        reason: `The vendored ${LIBRARY.name} build did not load from ${LIBRARY.vendored}. Reload the page; if it still fails, the asset may be blocked or missing from the deployment.`
      };
    }
    let version = "";
    try { version = typeof api.version === "function" ? text(api.version(), 24) : ""; }
    catch { version = ""; }
    return { available: true, version, reason: "" };
  }

  /* v5 exposes constructors (`chart.addSeries(CandlestickSeries, opts)`); older
     builds expose one method per series. Return whichever this build has. */
  function resolveSeries(api, typeId) {
    const type = chartType(typeId);
    const definition = api ? api[type.series] : null;
    if (definition && (typeof definition === "object" || typeof definition === "function")) {
      return { type, mode: "addSeries", definition };
    }
    if (api && typeof api[type.legacy] === "function") return { type, mode: "legacy", method: type.legacy };
    return null;
  }

  /* Guarded OHLCV → lightweight-charts rows. Bars are re-validated and re-sorted
     here because the library throws on out-of-order or duplicate times; invalid
     bars are dropped, never repaired. Times become UTC seconds. */
  function chartData(bars, options = {}) {
    const requested = Math.round(Number(options.limit));
    const limit = Math.max(2, Math.min(MAX_CHART_BARS, Number.isFinite(requested) ? requested : MAX_CHART_BARS));
    const rows = [];
    for (const bar of Array.isArray(bars) ? bars : []) {
      if (!bar || typeof bar !== "object" || Array.isArray(bar)) continue;
      const time = Number(bar.time);
      const open = Number(bar.open), high = Number(bar.high), low = Number(bar.low), close = Number(bar.close);
      if (bar.volume === null || bar.volume === undefined || bar.volume === "") continue;
      const volume = Number(bar.volume);
      if (!Number.isFinite(time) || time <= 0) continue;
      if (![open, high, low, close, volume].every(Number.isFinite) || volume < 0) continue;
      if (Math.min(open, high, low, close) <= 0 || high < low ||
        high < Math.max(open, close) || low > Math.min(open, close)) continue;
      rows.push({
        time: Math.floor(time / 1000), open, high, low, close,
        volume: Number.isFinite(volume) && volume > 0 ? volume : 0,
        confirmed: bar.confirmed === true
      });
    }
    const unique = new Map();
    rows.forEach(row => unique.set(row.time, row));
    const ordered = Array.from(unique.values()).sort((a, b) => a.time - b.time).slice(-limit);
    return {
      count: ordered.length,
      bars: ordered,
      candles: ordered.map(row => ({ time: row.time, open: row.open, high: row.high, low: row.low, close: row.close })),
      volumes: ordered.map(row => ({
        time: row.time,
        value: row.volume,
        color: row.close >= row.open ? VOLUME_UP : VOLUME_DOWN
      })),
      first: ordered[0] || null,
      last: ordered[ordered.length - 1] || null
    };
  }

  /* Line/area/baseline series take a single value per bar; the rest take OHLC. */
  function seriesData(typeId, candles) {
    const rows = Array.isArray(candles) ? candles : [];
    return chartType(typeId).closesOnly
      ? rows.map(row => ({ time: row.time, value: row.close }))
      : rows.map(row => ({ time: row.time, open: row.open, high: row.high, low: row.low, close: row.close }));
  }

  /* Display-only markers for the latest confirmed bar plus recent WaveTrend
     divergences. Every marker time must exist in the drawn series, so unknown
     times are dropped rather than snapped to a neighbouring bar. */
  function markers(result, rows, limit = 8) {
    if (!result || !Array.isArray(rows) || !rows.length) return [];
    const known = new Set(rows.map(row => row.time));
    const signals = result.signals || {};
    const wave = (result.waveTrend && result.waveTrend.signals) || {};
    const output = [];
    const add = (time, position, shape, color, label) => {
      const seconds = toSeconds(time);
      if (!Number.isFinite(seconds) || !known.has(seconds)) return;
      output.push({ time: seconds, position, shape, color, text: text(label, 60) });
    };
    const last = rows[rows.length - 1];
    if (signals.barClosePending !== true) {
      if (signals.bullishConfluence) add(last.time, "belowBar", "arrowUp", UP_COLOR, "Bullish VFI + Fibonacci confluence");
      else if (signals.bearishConfluence) add(last.time, "aboveBar", "arrowDown", DOWN_COLOR, "Bearish VFI + Fibonacci confluence");
      if (wave.bullishCross) add(last.time, "belowBar", "arrowUp", UP_COLOR, "WaveTrend bullish cross");
      if (wave.bearishCross) add(last.time, "aboveBar", "arrowDown", DOWN_COLOR, "WaveTrend bearish cross");
    }
    for (const event of (Array.isArray(result.recentDivergences) ? result.recentDivergences : []).slice(-4)) {
      const bullish = /bullish/i.test(String(event && event.type || ""));
      const bearish = /bearish/i.test(String(event && event.type || ""));
      if (!bullish && !bearish) continue;
      add(event.time, bullish ? "belowBar" : "aboveBar", bullish ? "arrowUp" : "arrowDown",
        bullish ? UP_COLOR : DOWN_COLOR, `${text(event.type, 30)} WaveTrend divergence`);
    }
    const unique = new Map();
    output.forEach(marker => unique.set(`${marker.time}:${marker.shape}`, marker));
    return Array.from(unique.values()).sort((a, b) => a.time - b.time).slice(-limit);
  }

  function attachMarkers(api, series, list) {
    if (!series || !Array.isArray(list) || !list.length) return null;
    if (api && typeof api.createSeriesMarkers === "function") return api.createSeriesMarkers(series, list);
    if (typeof series.setMarkers === "function") { series.setMarkers(list); return null; }
    return null;
  }

  /* Dark-theme options that match the Good Intelligence desk. The TradingView
     logo is not drawn because this app is not a TradingView data feed; the
     panel carries an explicit text credit and license line instead. */
  function chartOptions(overrides = {}) {
    return {
      autoSize: true,
      layout: {
        background: { type: "solid", color: "#0b1424" },
        textColor: "#8293aa",
        fontSize: 10,
        attributionLogo: false
      },
      grid: {
        vertLines: { color: "rgba(148, 166, 192, 0.07)" },
        horzLines: { color: "rgba(148, 166, 192, 0.07)" }
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "rgba(111, 211, 255, 0.42)", width: 1, style: 2, labelBackgroundColor: "#16283f" },
        horzLine: { color: "rgba(111, 211, 255, 0.42)", width: 1, style: 2, labelBackgroundColor: "#16283f" }
      },
      rightPriceScale: {
        borderColor: "rgba(118, 153, 202, 0.22)",
        scaleMargins: { top: 0.12, bottom: 0.24 }
      },
      timeScale: {
        borderColor: "rgba(118, 153, 202, 0.22)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 3
      },
      localization: { locale: "en" },
      ...overrides
    };
  }

  function seriesOptions(typeId, context = {}) {
    const up = text(context.upColor, 24) || UP_COLOR;
    const down = text(context.downColor, 24) || DOWN_COLOR;
    const line = text(context.lineColor, 24) || LINE_COLOR;
    const basePrice = Number(context.basePrice);
    const common = { priceLineVisible: false, lastValueVisible: true };
    switch (chartType(typeId).id) {
      case "line":
        return { ...common, color: line, lineWidth: 2 };
      case "area":
        return {
          ...common, lineColor: line, lineWidth: 2,
          topColor: "rgba(111, 211, 255, 0.26)", bottomColor: "rgba(111, 211, 255, 0.01)"
        };
      case "baseline":
        return {
          ...common, lineWidth: 2,
          ...(Number.isFinite(basePrice) ? { baseValue: { type: "price", price: basePrice } } : {}),
          topLineColor: up, topFillColor1: "rgba(84, 214, 180, 0.22)", topFillColor2: "rgba(84, 214, 180, 0.02)",
          bottomLineColor: down, bottomFillColor1: "rgba(232, 116, 135, 0.02)", bottomFillColor2: "rgba(232, 116, 135, 0.22)"
        };
      default:
        return {
          ...common,
          upColor: up, downColor: down, borderUpColor: up, borderDownColor: down,
          wickUpColor: up, wickDownColor: down
        };
    }
  }

  function volumeOptions() {
    return {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      priceLineVisible: false,
      lastValueVisible: false,
      visible: true
    };
  }

  /* A one-line credit the panel can render verbatim (HTML-escaped by the app). */
  function describe() {
    return `${LIBRARY.name} v${LIBRARY.version} · ${LIBRARY.license} · bundled locally`;
  }

  return Object.freeze({
    LIBRARY, CHART_TYPES, DEFAULT_CHART_TYPE, MAX_CHART_BARS,
    chartType, availability, resolveSeries, chartData, seriesData, markers, attachMarkers,
    chartOptions, seriesOptions, volumeOptions, describe
  });
})();
