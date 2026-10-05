/* Good Intelligence — optional price/volume context. The formulas overlap user-supplied
   Pine v6 VFI + Fibonacci Bands and LAZY WaveTrend sources; see scripts/pine/ for the
   archived source blocks. Source parity is not established. This is not assurance,
   a truth test, or an execution signal. */
"use strict";

window.GoodIntelligenceMarketContext = (() => {
  const SCHEMA = "gi-market-context-v1";
  const MAX_BARS = 5000;
  const DEFAULTS = Object.freeze({
    vfiLen: 130, vfiCoef: 0.2, vfiVcoef: 2.5, vfiVolLen: 30, vfiSignalLen: 5,
    vfiSmoothLen: 3, vfiSmooth: false, vfiSmoothType: "SMA",
    bandLen: 200, bandMult: 3, bandMa: "VWMA", bandSrc: "hlc3",
    channelLength: 10, averageLength: 21, signalLength: 4, wtSrc: "hlc3",
    useCustomTF: false, customTF: "60",
    extremeOB: 70, obLevel1: 60, obLevel2: 53, osLevel2: -53,
    osLevel1: -60, extremeOS: -70, divLookback: 5, showRegDiv: true, showHidDiv: false,
    confirmClose: true
  });
  const text = (value, max = 120) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const finite = value => typeof value === "number" && Number.isFinite(value);
  const number = (value, fallback, min, max) => {
    if (value === null || value === undefined || value === "" || typeof value === "boolean") return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const integer = (value, fallback, min, max) => Math.round(number(value, fallback, min, max));
  const enumValue = (value, values, fallback) => values.includes(value) ? value : fallback;

  function timestamp(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string" || !value.trim()) return null;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeBars(value) {
    if (!Array.isArray(value)) return [];
    const rows = value.slice(-MAX_BARS).map(row => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return null;
      const time = timestamp(row.time);
      const close = row.close === null || row.close === undefined || row.close === "" ? null : Number(row.close);
      if (time === null || !finite(close)) return null;
      const hasOpen = row.open !== null && row.open !== undefined && row.open !== "";
      const hasHigh = row.high !== null && row.high !== undefined && row.high !== "";
      const hasLow = row.low !== null && row.low !== undefined && row.low !== "";
      const hasAnyOhlc = hasOpen || hasHigh || hasLow;
      const hasAllOhlc = hasOpen && hasHigh && hasLow;
      if (hasAnyOhlc !== hasAllOhlc) return null;

      const volumePresent = row.volume !== null && row.volume !== undefined && row.volume !== "";
      let volume = null;
      if (volumePresent) {
        volume = Number(row.volume);
        if (!finite(volume) || volume < 0) return null;
      }
      if (!hasAllOhlc) {
        return {
          time, close, dataShape: "value",
          ...(volumePresent ? { volume } : {}),
          confirmed: row.confirmed === true
        };
      }

      const open = Number(row.open), high = Number(row.high), low = Number(row.low);
      if (![open, high, low].every(finite) || Math.min(open, high, low, close) <= 0 ||
          high < Math.max(open, close) || low > Math.min(open, close) || high < low) return null;
      return {
        time, open, high, low, close,
        dataShape: volumePresent ? "ohlcv" : "ohlc",
        ...(volumePresent ? { volume } : {}),
        confirmed: row.confirmed === true
      };
    }).filter(Boolean);
    const unique = new Map();
    rows.forEach(row => unique.set(row.time, row));
    return Array.from(unique.values()).sort((a, b) => a.time - b.time).slice(-MAX_BARS);
  }

  function normalizeParameters(value) {
    const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const defaults = DEFAULTS;
    return {
      vfiLen: integer(input.vfiLen, defaults.vfiLen, 2, 1000),
      vfiCoef: number(input.vfiCoef, defaults.vfiCoef, 0, 10),
      vfiVcoef: number(input.vfiVcoef, defaults.vfiVcoef, 0.1, 100),
      vfiVolLen: integer(input.vfiVolLen, defaults.vfiVolLen, 2, 500),
      vfiSignalLen: integer(input.vfiSignalLen, defaults.vfiSignalLen, 1, 500),
      vfiSmoothLen: integer(input.vfiSmoothLen, defaults.vfiSmoothLen, 1, 500),
      vfiSmooth: input.vfiSmooth === true,
      vfiSmoothType: enumValue(input.vfiSmoothType, ["SMA", "EMA", "WMA"], defaults.vfiSmoothType),
      bandLen: integer(input.bandLen, defaults.bandLen, 1, 2000),
      bandMult: number(input.bandMult, defaults.bandMult, 0.001, 50),
      bandMa: enumValue(input.bandMa, ["VWMA", "SMA", "EMA", "WMA", "RMA"], defaults.bandMa),
      bandSrc: enumValue(input.bandSrc, ["hlc3", "hl2", "close", "open", "high", "low"], defaults.bandSrc),
      channelLength: integer(input.channelLength, defaults.channelLength, 1, 500),
      averageLength: integer(input.averageLength, defaults.averageLength, 1, 500),
      signalLength: integer(input.signalLength, defaults.signalLength, 1, 500),
      wtSrc: enumValue(input.wtSrc, ["hlc3", "hl2", "close", "open", "high", "low"], defaults.wtSrc),
      useCustomTF: input.useCustomTF === true,
      customTF: text(input.customTF, 12) || defaults.customTF,
      extremeOB: number(input.extremeOB, defaults.extremeOB, -500, 500),
      obLevel1: number(input.obLevel1, defaults.obLevel1, -500, 500),
      obLevel2: number(input.obLevel2, defaults.obLevel2, -500, 500),
      osLevel2: number(input.osLevel2, defaults.osLevel2, -500, 500),
      osLevel1: number(input.osLevel1, defaults.osLevel1, -500, 500),
      extremeOS: number(input.extremeOS, defaults.extremeOS, -500, 500),
      divLookback: integer(input.divLookback, defaults.divLookback, 2, 20),
      showRegDiv: input.showRegDiv !== false,
      showHidDiv: input.showHidDiv === true,
      confirmClose: input.confirmClose !== false
    };
  }

  function normalizePacket(value) {
    if (!value || typeof value !== "object" || Array.isArray(value) || value.schema !== SCHEMA) return null;
    return {
      schema: SCHEMA,
      synthetic: value.synthetic === true,
      source: text(value.source, 160),
      symbol: text(value.symbol, 40),
      timeframe: text(value.timeframe, 24),
      dataShape: enumValue(value.dataShape, ["ohlcv", "ohlc", "value"], ""),
      quoteCurrency: text(value.quoteCurrency, 40),
      bars: normalizeBars(value.bars),
      higherTimeframeBars: normalizeBars(value.higherTimeframeBars),
      parameters: normalizeParameters(value.parameters)
    };
  }

  function sourceValues(bars, source) {
    return bars.map(bar => {
      const hasRange = finite(bar.high) && finite(bar.low);
      if (source === "close") return bar.close;
      if (source === "open") return finite(bar.open) ? bar.open : bar.close;
      if (source === "high") return finite(bar.high) ? bar.high : bar.close;
      if (source === "low") return finite(bar.low) ? bar.low : bar.close;
      if (source === "hl2") return hasRange ? (bar.high + bar.low) / 2 : bar.close;
      return hasRange ? (bar.high + bar.low + bar.close) / 3 : bar.close;
    });
  }

  function rollingMean(values, length) {
    const result = Array(values.length).fill(null);
    for (let i = length - 1; i < values.length; i++) {
      const window = values.slice(i - length + 1, i + 1);
      if (window.every(finite)) result[i] = window.reduce((sum, value) => sum + value, 0) / length;
    }
    return result;
  }

  function rollingStdev(values, length) {
    const result = Array(values.length).fill(null);
    for (let i = length - 1; i < values.length; i++) {
      const window = values.slice(i - length + 1, i + 1);
      if (!window.every(finite)) continue;
      const mean = window.reduce((sum, value) => sum + value, 0) / length;
      result[i] = Math.sqrt(window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / length);
    }
    return result;
  }

  function rollingWma(values, length) {
    const result = Array(values.length).fill(null);
    const divisor = length * (length + 1) / 2;
    for (let i = length - 1; i < values.length; i++) {
      const window = values.slice(i - length + 1, i + 1);
      if (window.every(finite)) result[i] = window.reduce((sum, value, index) => sum + value * (index + 1), 0) / divisor;
    }
    return result;
  }

  function ema(values, length) {
    const result = Array(values.length).fill(null);
    const alpha = 2 / (length + 1);
    let previous = null;
    for (let i = 0; i < values.length; i++) {
      if (!finite(values[i])) continue;
      previous = previous === null ? values[i] : alpha * values[i] + (1 - alpha) * previous;
      result[i] = previous;
    }
    return result;
  }

  function rma(values, length) {
    const result = Array(values.length).fill(null);
    let previous = null;
    let seed = [];
    for (let i = 0; i < values.length; i++) {
      if (!finite(values[i])) continue;
      if (previous === null) {
        seed.push(values[i]);
        if (seed.length < length) continue;
        previous = seed.reduce((sum, value) => sum + value, 0) / length;
      } else previous = (previous * (length - 1) + values[i]) / length;
      result[i] = previous;
    }
    return result;
  }

  function movingAverage(values, length, type, volumes = null) {
    if (type === "EMA") return ema(values, length);
    if (type === "WMA") return rollingWma(values, length);
    if (type === "RMA") return rma(values, length);
    if (type === "VWMA") {
      const sma = rollingMean(values, length);
      return values.map((value, i) => {
        if (i < length - 1) return null;
        const volWindow = volumes.slice(i - length + 1, i + 1);
        const priceWindow = values.slice(i - length + 1, i + 1);
        if (!volWindow.every(finite) || !priceWindow.every(finite)) return null;
        const volumeSum = volWindow.reduce((sum, volume) => sum + volume, 0);
        return volumes[i] > 0 && volumeSum > 0 ? priceWindow.reduce((sum, price, index) => sum + price * volWindow[index], 0) / volumeSum : sma[i];
      });
    }
    return rollingMean(values, length);
  }

  function crossover(a, b, index) {
    return index > 0 && finite(a[index]) && finite(b[index]) && finite(a[index - 1]) && finite(b[index - 1]) &&
      a[index] > b[index] && a[index - 1] <= b[index - 1];
  }

  function crossunder(a, b, index) {
    return index > 0 && finite(a[index]) && finite(b[index]) && finite(a[index - 1]) && finite(b[index - 1]) &&
      a[index] < b[index] && a[index - 1] >= b[index - 1];
  }

  function computeVfi(bars, parameters) {
    const n = bars.length;
    const volumeReady = bars.length > 0 && bars.every(bar =>
      finite(bar.open) && finite(bar.high) && finite(bar.low) && finite(bar.volume));
    if (!volumeReady) {
      const unavailable = Array(n).fill(null);
      return { vfi: unavailable, signal: Array(n).fill(null), raw: Array(n).fill(null), available: false };
    }
    const typical = bars.map(bar => (bar.high + bar.low + bar.close) / 3);
    const volumes = bars.map(bar => bar.volume);
    const inter = Array(n).fill(null);
    for (let i = 1; i < n; i++) if (typical[i] > 0 && typical[i - 1] > 0) inter[i] = Math.log(typical[i] / typical[i - 1]);
    const volatility = rollingStdev(inter, parameters.vfiVolLen);
    const volumeAverage = rollingMean(volumes, parameters.vfiLen);
    const validFlow = Array(n).fill(false);
    const volumeContribution = Array(n).fill(null);
    for (let i = 0; i < n; i++) {
      const average = i > 0 ? volumeAverage[i - 1] : null;
      const validPrice = typical[i] > 0 && i > 0 && typical[i - 1] > 0;
      if (!validPrice || !finite(volatility[i]) || !finite(average) || average <= 0) continue;
      const cutoff = parameters.vfiCoef * volatility[i] * bars[i].close;
      const cappedVolume = Math.min(volumes[i], average * parameters.vfiVcoef);
      const moneyFlow = typical[i] - typical[i - 1];
      validFlow[i] = true;
      volumeContribution[i] = moneyFlow > cutoff ? cappedVolume : moneyFlow < -cutoff ? -cappedVolume : 0;
    }

    const rawVfi = Array(n).fill(null);
    for (let i = parameters.vfiLen - 1; i < n; i++) {
      const start = i - parameters.vfiLen + 1;
      const allReady = validFlow.slice(start, i + 1).every(Boolean);
      const average = i > 0 ? volumeAverage[i - 1] : null;
      if (!allReady || !finite(average) || average <= 0) continue;
      const sum = volumeContribution.slice(start, i + 1).reduce((total, value) => total + value, 0);
      rawVfi[i] = sum / average;
    }
    const smoothed = parameters.vfiSmooth
      ? movingAverage(rawVfi, parameters.vfiSmoothLen, parameters.vfiSmoothType)
      : rawVfi;
    return { vfi: smoothed, signal: ema(smoothed, parameters.vfiSignalLen), raw: rawVfi, available: true };
  }

  function computeBands(bars, parameters) {
    const source = sourceValues(bars, parameters.bandSrc);
    const volumeAvailable = bars.length > 0 && bars.every(bar => finite(bar.volume));
    const maType = parameters.bandMa === "VWMA" && !volumeAvailable ? "SMA" : parameters.bandMa;
    const basis = movingAverage(source, parameters.bandLen, maType, bars.map(bar => bar.volume));
    const deviation = rollingStdev(source, parameters.bandLen).map(value => finite(value) ? value * parameters.bandMult : null);
    const bands = source.map((_, i) => {
      const base = basis[i], dev = deviation[i];
      if (!finite(base) || !finite(dev)) return null;
      return {
        basis: base, deviation: dev,
        upper382: base + 0.382 * dev, upper618: base + 0.618 * dev, upper764: base + 0.764 * dev, upper1000: base + dev,
        lower382: base - 0.382 * dev, lower618: base - 0.618 * dev, lower764: base - 0.764 * dev, lower1000: base - dev
      };
    });
    return { basis, deviation, bands };
  }

  function computeWaveTrend(bars, parameters) {
    const source = sourceValues(bars, parameters.wtSrc);
    const esa = ema(source, parameters.channelLength);
    const distance = ema(source.map((value, i) => finite(esa[i]) ? Math.abs(value - esa[i]) : null), parameters.channelLength);
    const ci = source.map((value, i) => finite(distance[i]) ? distance[i] === 0 ? 0 : (value - esa[i]) / (0.015 * distance[i]) : null);
    const wt1 = ema(ci, parameters.averageLength);
    const wt2 = rollingMean(wt1, parameters.signalLength);
    return { wt1, wt2 };
  }

  function mapHigherTimeframe(baseBars, higherBars, higherValues) {
    const mapped = { wt1: Array(baseBars.length).fill(null), wt2: Array(baseBars.length).fill(null) };
    let cursor = 0, current1 = null, current2 = null;
    for (let i = 0; i < baseBars.length; i++) {
      while (cursor < higherBars.length && higherBars[cursor].time <= baseBars[i].time) {
        if (higherBars[cursor].confirmed) {
          current1 = higherValues.wt1[cursor];
          current2 = higherValues.wt2[cursor];
        }
        cursor++;
      }
      mapped.wt1[i] = current1;
      mapped.wt2[i] = current2;
    }
    return mapped;
  }

  function divergenceEvents(bars, wt1, parameters) {
    const events = [];
    const lookback = parameters.divLookback;
    let previousLow = null, previousHigh = null;
    const isPivot = (values, pivot, low) => {
      if (!finite(values[pivot])) return false;
      for (let j = pivot - lookback; j <= pivot + lookback; j++) {
        if (j === pivot || j < 0 || j >= values.length || !finite(values[j])) continue;
        if (low ? values[j] <= values[pivot] : values[j] >= values[pivot]) return false;
      }
      return true;
    };
    for (let detected = lookback * 2; detected < bars.length; detected++) {
      const pivot = detected - lookback;
      if (isPivot(wt1, pivot, true)) {
        const current = { wt: wt1[pivot], price: finite(bars[pivot].low) ? bars[pivot].low : bars[pivot].close, time: bars[pivot].time };
        if (previousLow) {
          if (current.wt > previousLow.wt && current.price < previousLow.price && previousLow.wt < parameters.osLevel2) {
            events.push({ type: "Regular bullish", time: current.time, detectedIndex: detected });
          }
          // Evaluate hidden divergence against the prior pivot before replacing it.
          if (parameters.showHidDiv && current.wt < previousLow.wt && current.price > previousLow.price) {
            events.push({ type: "Hidden bullish", time: current.time, detectedIndex: detected });
          }
        }
        previousLow = current;
      }
      if (isPivot(wt1, pivot, false)) {
        const current = { wt: wt1[pivot], price: finite(bars[pivot].high) ? bars[pivot].high : bars[pivot].close, time: bars[pivot].time };
        if (previousHigh) {
          if (current.wt < previousHigh.wt && current.price > previousHigh.price && previousHigh.wt > parameters.obLevel2) {
            events.push({ type: "Regular bearish", time: current.time, detectedIndex: detected });
          }
          if (parameters.showHidDiv && current.wt > previousHigh.wt && current.price < previousHigh.price) {
            events.push({ type: "Hidden bearish", time: current.time, detectedIndex: detected });
          }
        }
        previousHigh = current;
      }
    }
    return events.slice(-8);
  }

  function safeValue(value, digits = 4) {
    return finite(value) ? Number(value.toFixed(digits)) : null;
  }

  function evaluate(value) {
    const context = normalizePacket(value);
    if (!context) return null;
    const bars = context.bars;
    const parameters = context.parameters || DEFAULTS;
    if (!bars.length) return {
      schema: "gi-market-analysis-v1", status: "no-data", synthetic: context.synthetic,
      symbol: context.symbol, timeframe: context.timeframe, bars: 0, signals: [],
      dataShape: context.dataShape || "unknown", volumeAvailable: false,
      note: "No valid market observations were supplied. Technical context does not affect assurance coverage."
    };

    const volumeAvailable = bars.every(bar => finite(bar.volume));
    const hasOhlc = bars.every(bar => finite(bar.open) && finite(bar.high) && finite(bar.low));
    const dataShape = hasOhlc ? (volumeAvailable ? "ohlcv" : "ohlc") : "value";
    const flow = computeVfi(bars, parameters);
    const bands = computeBands(bars, parameters);
    let wave = computeWaveTrend(bars, parameters);
    let waveStatus = "same-timeframe";
    if (parameters.useCustomTF) {
      if (context.higherTimeframeBars && context.higherTimeframeBars.length) {
        wave = mapHigherTimeframe(bars, context.higherTimeframeBars, computeWaveTrend(context.higherTimeframeBars, parameters));
        waveStatus = `confirmed higher timeframe · ${parameters.customTF}`;
      } else {
        wave = { wt1: Array(bars.length).fill(null), wt2: Array(bars.length).fill(null) };
        waveStatus = "higher-timeframe candles unavailable";
      }
    }

    const last = bars.length - 1;
    const currentBands = bands.bands[last];
    const flowReady = [flow.vfi[last], flow.signal[last], flow.vfi[last - 1], flow.signal[last - 1]].every(finite);
    const bandReady = !!currentBands && !!bands.bands[last - 1];
    const waveReady = [wave.wt1[last], wave.wt2[last], wave.wt1[last - 1], wave.wt2[last - 1]].every(finite);
    const canConfirm = !parameters.confirmClose || bars[last].confirmed;
    const canPriceSignal = bandReady && canConfirm;
    const canFlowSignal = flowReady && canPriceSignal;
    const zero = Array(bars.length).fill(0);
    const rawVfiBull = crossover(flow.vfi, flow.signal, last);
    const rawVfiBear = crossunder(flow.vfi, flow.signal, last);
    const rawZeroUp = flowReady && crossover(flow.vfi, zero, last);
    const rawZeroDown = flowReady && crossunder(flow.vfi, zero, last);
    const rawUpper = currentBands ? crossover(bars.map(bar => bar.close), bands.bands.map(row => row && row.upper1000), last) : false;
    const rawLower = currentBands ? crossunder(bars.map(bar => bar.close), bands.bands.map(row => row && row.lower1000), last) : false;
    const vfiBull = rawVfiBull && canFlowSignal;
    const vfiBear = rawVfiBear && canFlowSignal;
    const upperBreak = rawUpper && canPriceSignal;
    const lowerBreak = rawLower && canPriceSignal;
    const confluenceBull = flowReady && ((((rawVfiBull || rawZeroUp) && currentBands && bars[last].close > currentBands.basis) ||
      (rawUpper && flow.vfi[last] > 0 && flow.vfi[last] >= flow.signal[last])) && canFlowSignal);
    const confluenceBear = flowReady && ((((rawVfiBear || rawZeroDown) && currentBands && bars[last].close < currentBands.basis) ||
      (rawLower && flow.vfi[last] < 0 && flow.vfi[last] <= flow.signal[last])) && canFlowSignal);

    const rawWtBull = crossover(wave.wt1, wave.wt2, last);
    const rawWtBear = crossunder(wave.wt1, wave.wt2, last);
    const rawWtZeroUp = crossover(wave.wt1, zero, last);
    const rawWtZeroDown = crossunder(wave.wt1, zero, last);
    const wtBull = rawWtBull && waveReady && canConfirm;
    const wtBear = rawWtBear && waveReady && canConfirm;
    const wtBullExtreme = wtBull && wave.wt1[last] <= parameters.extremeOS;
    const wtBearExtreme = wtBear && wave.wt1[last] >= parameters.extremeOB;
    const divergence = divergenceEvents(bars, wave.wt1, parameters).filter(event => event.detectedIndex < last || canConfirm);
    const currentDivergence = divergence.filter(event => event.detectedIndex === last).map(event => event.type);
    const alerts = [];
    if (vfiBull) alerts.push("VFI bullish crossover");
    if (vfiBear) alerts.push("VFI bearish crossover");
    if (upperBreak) alerts.push("Upper Fibonacci-band break");
    if (lowerBreak) alerts.push("Lower Fibonacci-band break");
    if (confluenceBull) alerts.push("Bullish VFI + Fibonacci confluence");
    if (confluenceBear) alerts.push("Bearish VFI + Fibonacci confluence");
    if (wtBull) alerts.push("WaveTrend bullish cross");
    if (wtBear) alerts.push("WaveTrend bearish cross");
    if (rawWtZeroUp && waveReady && canConfirm) alerts.push("WaveTrend zero-line cross up");
    if (rawWtZeroDown && waveReady && canConfirm) alerts.push("WaveTrend zero-line cross down");
    if (wtBullExtreme) alerts.push("WaveTrend extreme bullish reversal");
    if (wtBearExtreme) alerts.push("WaveTrend extreme bearish reversal");
    currentDivergence.forEach(type => alerts.push(`${type} WaveTrend divergence`));

    const combined = confluenceBull && wtBull ? "bullish agreement"
      : confluenceBear && wtBear ? "bearish agreement"
        : confluenceBull && wtBear || confluenceBear && wtBull ? "mixed indicators"
          : confluenceBull ? "VFI/Fibonacci bullish only" : confluenceBear ? "VFI/Fibonacci bearish only"
            : upperBreak ? "price-only upper Fibonacci-band break"
              : lowerBreak ? "price-only lower Fibonacci-band break"
                : wtBull ? "WaveTrend bullish cross only" : wtBear ? "WaveTrend bearish cross only"
                  : !volumeAvailable ? "price-only context · volume measures disabled" : "no current confluence";
    const enoughForBands = !!currentBands;
    const enoughForFlow = flowReady;
    const status = enoughForBands && waveReady && (!volumeAvailable || enoughForFlow)
      ? (volumeAvailable ? "ready" : "partial") : "warming-up";
    const close = bars[last].close;
    const wtValue = wave.wt1[last];
    const zone = !finite(wtValue) ? "unknown"
      : wtValue >= parameters.extremeOB ? "extreme overbought"
        : wtValue >= parameters.obLevel1 ? "overbought · level 1"
          : wtValue >= parameters.obLevel2 ? "overbought · level 2"
            : wtValue <= parameters.extremeOS ? "extreme oversold"
              : wtValue <= parameters.osLevel1 ? "oversold · level 1"
                : wtValue <= parameters.osLevel2 ? "oversold · level 2" : "neutral zone";
    const chartStart = Math.max(0, bars.length - 240);
    const chartSeries = bars.slice(chartStart).map((bar, offset) => {
      const i = chartStart + offset;
      const band = bands.bands[i];
      return {
        time: bar.time, close: safeValue(bar.close), volume: safeValue(bar.volume),
        basis: safeValue(band && band.basis),
        upper382: safeValue(band && band.upper382), upper618: safeValue(band && band.upper618),
        upper764: safeValue(band && band.upper764), upper1000: safeValue(band && band.upper1000),
        lower382: safeValue(band && band.lower382), lower618: safeValue(band && band.lower618),
        lower764: safeValue(band && band.lower764), lower1000: safeValue(band && band.lower1000),
        vfi: safeValue(flow.vfi[i]), vfiSignal: safeValue(flow.signal[i]),
        wt1: safeValue(wave.wt1[i]), wt2: safeValue(wave.wt2[i])
      };
    });

    return {
      schema: "gi-market-analysis-v1",
      status,
      synthetic: context.synthetic,
      symbol: context.symbol,
      timeframe: context.timeframe,
      source: context.source,
      dataShape,
      quoteCurrency: context.quoteCurrency,
      volumeAvailable,
      barCount: bars.length,
      lastBarConfirmed: bars[last].confirmed,
      chartSeries,
      parameters,
      combined,
      vfi: {
        value: safeValue(flow.vfi[last]), signal: safeValue(flow.signal[last]), ready: flowReady,
        available: flow.available, reason: flow.available ? null : "Volume and complete OHLC are required; VFI is disabled for this series."
      },
      bands: currentBands ? Object.fromEntries(Object.entries(currentBands).map(([key, value]) => [key, safeValue(value)])) : null,
      close: safeValue(close),
      waveTrend: {
        wt1: safeValue(wave.wt1[last]), wt2: safeValue(wave.wt2[last]),
        difference: safeValue(finite(wave.wt1[last]) && finite(wave.wt2[last]) ? wave.wt1[last] - wave.wt2[last] : null),
        zone, ready: waveReady, timeframeStatus: waveStatus,
        signals: { bullishCross: wtBull, bearishCross: wtBear, zeroCrossUp: rawWtZeroUp && waveReady && canConfirm,
          zeroCrossDown: rawWtZeroDown && waveReady && canConfirm, extremeBullish: wtBullExtreme,
          extremeBearish: wtBearExtreme, divergence: currentDivergence }
      },
      signals: { vfiBull, vfiBear, upperBreak, lowerBreak, bullishConfluence: confluenceBull,
        bearishConfluence: confluenceBear, volumeMeasuresAvailable: volumeAvailable,
        priceOnly: !volumeAvailable, barClosePending: parameters.confirmClose && !bars[last].confirmed },
      recentDivergences: divergence.filter(event => event.type.startsWith("Regular") ? parameters.showRegDiv : parameters.showHidDiv)
        .map(event => ({ type: event.type, time: event.time, detectedAt: bars[event.detectedIndex].time })),
      alerts,
      note: !volumeAvailable
        ? "Price-only analysis from the supplied close or OHLC observations. VFI, relative volume, and other volume-based measures are disabled because this series has no volume; no OHLC or volume fields were fabricated. Display-only context, not investment advice or permission to act."
        : "Client-side price/volume calculation using formulas that overlap user-supplied Pine v6 scripts; exact source parity has not been cross-validated. Verify OHLCV and settings against the provider. Price/volume context only—not source credibility, claim truth, investment advice, or permission to act. Alerts are display-only; nothing is sent or executed."
    };
  }

  return Object.freeze({ SCHEMA, MAX_BARS, DEFAULTS, normalizeBars, normalizeParameters, normalizePacket, evaluate });
})();
