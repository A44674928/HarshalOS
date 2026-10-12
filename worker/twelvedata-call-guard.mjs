/*
 * HarshalOS — Global call guard for Twelve Data free tier (private sole-use).
 * Free: 800/day, 8/min burst (single global window, unlike Massive's 5/min per asset class).
 * Enforces both per-minute sliding window (Cloudflare-style) and daily budget via KV.
 * Drop-in lens for Massive's massive-call-guard: same shape, different envelope.
 */

import { loadTwelveDataDailyCallLedger } from "./twelvedata-daily-call-ledger.mjs";

const TWELVEDATA_DAILY_GLOBAL_BUDGET = 800;
const TWELVEDATA_PER_MIN_LIMIT = 8;
const WINDOW_MS = 60_000;
const MIN_RETRY_SECONDS = 20;
const MAX_RETRY_SECONDS = 6 * 60 * 60;

function parseIsoDay(day) {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const ts = Date.parse(`${day}T00:00:00.000Z`);
  return Number.isFinite(ts) ? ts : null;
}

function isoDayFor(now) {
  const ts = typeof now === "function" ? now() : Date.now();
  const dayTs = parseIsoDay(new Date(ts).toISOString().slice(0, 10));
  return new Date(dayTs || ts).toISOString().slice(0, 10);
}

function secondsUntilNextDay(nowFn) {
  const ts = typeof nowFn === "function" ? nowFn() : Date.now();
  const dayStart = parseIsoDay(isoDayFor(() => ts));
  if (!Number.isFinite(dayStart)) return 60;
  const next = dayStart + 24 * 60 * 60 * 1000;
  return Math.max(60, Math.ceil((next - ts) / 1000));
}

function clampRetry(seconds, min = MIN_RETRY_SECONDS, max = MAX_RETRY_SECONDS) {
  const n = Number(seconds);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.ceil(n)));
}

function collectDailyTotal(records, day) {
  if (!Array.isArray(records) || !day) return 0;
  return records.filter(r => r && r.day === day && r.target === "twelvedata")
    .reduce((sum, r) => sum + (Number.isFinite(r.count) ? r.count : 0), 0);
}

function globalCallsRemainingForDay(records, nowFn, day = null, budget = TWELVEDATA_DAILY_GLOBAL_BUDGET) {
  const d = day || isoDayFor(nowFn);
  const consumed = collectDailyTotal(records, d);
  return Math.max(0, budget - consumed);
}

async function loadDailyAdditions(kv, remaining, nowFn) {
  if (!kv || remaining <= 0) return remaining;
  try {
    const ledger = await loadTwelveDataDailyCallLedger(kv);
    const records = Array.isArray(ledger.records) ? ledger.records : [];
    const freshRemaining = globalCallsRemainingForDay(records, nowFn);
    return Math.min(remaining, freshRemaining);
  } catch { return remaining; }
}

// In-memory sliding window (worker isolate). Reaped each invocation.
let windowCalls = []; // array of timestamps millis

function pruneWindow(nowMs) {
  const cutoff = nowMs - WINDOW_MS;
  let i = 0;
  while (i < windowCalls.length && windowCalls[i] <= cutoff) i++;
  if (i) windowCalls = windowCalls.slice(i);
  return windowCalls;
}

function rateLimitedEnvelope(retryAfter) {
  return {
    decision: "rate-limited",
    code: "twelvedata-rate-limit",
    message: `Twelve Data per-minute envelope (8/min) was reached. Retry after ${retryAfter}s.`,
    retryAfter: String(retryAfter),
    httpStatus: 429
  };
}

function dailyLimitedEnvelope(retryAfter) {
  return {
    decision: "rate-limited",
    code: "twelvedata-daily-limit",
    message: `Twelve Data daily budget (800/day) was reached. Retry after ${retryAfter}s.`,
    retryAfter: String(retryAfter),
    httpStatus: 429
  };
}

/**
 * Guard that enforces Twelve Data's 8/min global + 800/day before a network call.
 * Returns { decision: "allow", remaining: N } or { decision: "rate-limited", retryAfter, code }
 */
export async function guardTwelveDataCallBeforeFetch({ kv, now = Date.now, dailyKv = null } = {}) {
  const nowMs = typeof now === "function" ? now() : Date.now();
  pruneWindow(nowMs);
  if (windowCalls.length >= TWELVEDATA_PER_MIN_LIMIT) {
    const oldest = windowCalls[0] || nowMs;
    const retry = clampRetry(Math.ceil((oldest + WINDOW_MS - nowMs) / 1000), 5, 120);
    return rateLimitedEnvelope(String(retry));
  }
  // Daily 800/day is generous for 171-instrument field (171 < 800). For private sole-use, the provider's
  // own 429 is the source of truth; the in-memory 8/min window is the only Worker-side gate.
  // Keeping dailyKv optional means the guard never blocks on a missing D1 ledger table.
  if (dailyKv) {
    try {
      const remainingDaily = await loadDailyAdditions(dailyKv, TWELVEDATA_DAILY_GLOBAL_BUDGET, now);
      if (remainingDaily <= 0) return dailyLimitedEnvelope(String(secondsUntilNextDay(now)));
    } catch {}
  }
  return { decision: "allow", remaining: windowCalls.length < TWELVEDATA_PER_MIN_LIMIT ? TWELVEDATA_PER_MIN_LIMIT - windowCalls.length - 1 : 0 };
}

export function recordTwelveDataCallSuccess() {
  windowCalls.push(typeof Date.now === "function" ? Date.now() : 0);
  // keep sorted
  windowCalls.sort((a, b) => a - b);
  pruneWindow(typeof Date.now === "function" ? Date.now() : 0);
}

export function clearTwelveDataInMemoryWindow() { windowCalls = []; }
export function setTwelveDataWindowCalls(calls) {
  windowCalls = Array.isArray(calls) ? calls.filter(n => Number.isFinite(n)).sort((a, b) => a - b) : [];
}

export const twelvedataCallGuardInternals = Object.freeze({
  TWELVEDATA_DAILY_GLOBAL_BUDGET,
  TWELVEDATA_PER_MIN_LIMIT,
  WINDOW_MS,
  isoDayFor,
  pruneWindow,
  collectDailyTotal,
  globalCallsRemainingForDay,
  rateLimitedEnvelope,
  dailyLimitedEnvelope
});
