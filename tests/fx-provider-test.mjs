import assert from "node:assert/strict";
import test from "node:test";
import { fetchFxMarketContext, fxProviderMode } from "../worker/fx-provider.mjs";

test("FX provider mode defaults to dual and rejects unknown values", () => {
  assert.equal(fxProviderMode({}), "dual");
  assert.equal(fxProviderMode({ ORB2_FX_PROVIDER_MODE: "fallback" }), "fallback");
  assert.equal(fxProviderMode({ ORB2_FX_PROVIDER_MODE: "unknown" }), "dual");
});

test("dual FX validation runs Massive and Alpha Vantage concurrently and keeps Massive canonical", async () => {
  const calls = [];
  const result = await fetchFxMarketContext({
    mode: "dual",
    massive: async () => {
      calls.push("massive-start");
      await Promise.resolve();
      calls.push("massive-end");
      return { ok: true, packet: { source: "Massive" } };
    },
    alphaVantage: async () => {
      calls.push("alpha-start");
      await Promise.resolve();
      calls.push("alpha-end");
      return { ok: true, packet: { source: "Alpha Vantage" } };
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.selectedProvider, "massive");
  assert.equal(result.validation, "both-succeeded");
  assert.equal(result.providers.massive.ok, true);
  assert.equal(result.providers.alphaVantage.ok, true);
  assert.deepEqual(result.packet, { source: "Massive" });
  assert.ok(calls.indexOf("alpha-start") < calls.indexOf("massive-end"));
  assert.ok(calls.indexOf("massive-start") < calls.indexOf("alpha-end"));
});

test("dual FX validation rescues a Massive failure with Alpha Vantage", async () => {
  const result = await fetchFxMarketContext({
    mode: "dual",
    massive: async () => ({ ok: false, code: "massive-plan-limited" }),
    alphaVantage: async () => ({ ok: true, packet: { source: "Alpha Vantage" } })
  });
  assert.equal(result.ok, true);
  assert.equal(result.selectedProvider, "alpha-vantage");
  assert.equal(result.validation, "alpha-vantage-rescued");
});

test("fallback FX mode does not call Alpha Vantage when Massive succeeds", async () => {
  let alphaCalls = 0;
  const result = await fetchFxMarketContext({
    mode: "fallback",
    massive: async () => ({ ok: true, packet: { source: "Massive" } }),
    alphaVantage: async () => {
      alphaCalls += 1;
      return { ok: true };
    }
  });
  assert.equal(result.selectedProvider, "massive");
  assert.equal(alphaCalls, 0);
});

test("dual FX validation holds when both providers fail", async () => {
  const result = await fetchFxMarketContext({
    mode: "dual",
    massive: async () => ({ ok: false, code: "massive-plan-limited" }),
    alphaVantage: async () => ({ ok: false, code: "alpha-vantage-provider-error" })
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "fx-all-providers-failed");
  assert.equal(result.validation, "both-failed");
});
