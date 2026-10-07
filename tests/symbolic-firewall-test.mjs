import assert from "node:assert/strict";
import test from "node:test";
import { handleSymbolicFirewall } from "../worker/symbolic-firewall.mjs";
import worker from "../worker/index.mjs";

const ORIGIN = "https://empty.domains";

function request(text, origin = ORIGIN) {
  return new Request(ORIGIN + "/api/symbolic-firewall/v1/seal", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ text })
  });
}

test("Symbolic Firewall seals content server-side as non-executable", async () => {
  const response = await handleSymbolicFirewall(request("A mythic command cannot become authority."));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.schema, "hos-symbolic-firewall-seal-v1");
  assert.equal(body.firewall.classification, "NON-EXECUTABLE");
  assert.equal(body.firewall.executable, false);
  assert.equal(body.firewall.authorityEffect, "NONE");
  assert.match(body.firewall.hash, /^0x[A-F0-9]{64}$/);
  assert.ok(body.firewall.nonce);
});

test("Symbolic Firewall refuses cross-origin writes", async () => {
  const response = await handleSymbolicFirewall(request("narrative", "https://attacker.example"));
  assert.equal(response.status, 403);
});

test("Worker exposes only the server firewall endpoint", async () => {
  const response = await worker.fetch(request("server-side containment"), {
    ASSETS: { fetch: async () => new Response("asset fallback", { status: 200 }) }
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.firewall.executable, false);
});

test("Symbolic Firewall rejects empty content", async () => {
  const response = await handleSymbolicFirewall(request("   "));
  assert.equal(response.status, 400);
});
