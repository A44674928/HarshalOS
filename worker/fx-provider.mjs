export const FX_PROVIDER_MODES = Object.freeze(["massive", "fallback", "dual"]);
export const DEFAULT_FX_PROVIDER_MODE = "dual";
export function fxProviderMode(env = {}) {
  const value = String(env.ORB2_FX_PROVIDER_MODE || DEFAULT_FX_PROVIDER_MODE).trim().toLowerCase();
  return FX_PROVIDER_MODES.includes(value) ? value : DEFAULT_FX_PROVIDER_MODE;
}
export async function fetchFxMarketContext({ mode = DEFAULT_FX_PROVIDER_MODE, massive, alphaVantage } = {}) {
  const run = async (fn, code) => typeof fn === "function" ? fn() : { ok: false, code, message: "Provider adapter unavailable." };
  if (mode === "massive") return run(massive, "massive-unavailable");
  if (mode === "fallback") {
    const first = await run(massive, "massive-unavailable");
    if (first.ok) return { ...first, selectedProvider: "massive" };
    const second = await run(alphaVantage, "alpha-vantage-unavailable");
    if (second.ok) return { ...second, selectedProvider: "alpha-vantage", fallbackFrom: first.code };
    return { ok: false, code: "fx-all-providers-failed", providers: { massive: first, alphaVantage: second } };
  }
  const [first, second] = await Promise.all([run(massive, "massive-unavailable"), run(alphaVantage, "alpha-vantage-unavailable")]);
  if (first.ok) return { ...first, selectedProvider: "massive", providers: { massive: first, alphaVantage: second }, validation: second.ok ? "both-succeeded" : "massive-only" };
  if (second.ok) return { ...second, selectedProvider: "alpha-vantage", providers: { massive: first, alphaVantage: second }, validation: "alpha-vantage-rescued" };
  return { ok: false, code: "fx-all-providers-failed", providers: { massive: first, alphaVantage: second }, validation: "both-failed" };
}
