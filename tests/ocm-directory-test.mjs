/* HarshalOS — Orb Directory & Mail suite.

   Covers the OCM address contract (0•DDD•RRR•####), the directory store, the
   local-only message record, and the app's transport and authority discipline.

   Run: node --test tests/ocm-directory-test.mjs */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const appSource = await readFile(path.join(ROOT, "js/apps-ocm-directory.js"), "utf8");
const moduleSource = await readFile(path.join(ROOT, "js/ocm-directory.js"), "utf8");

const SOURCES = {
  "js/ocm-data.js": readFileSync(path.join(ROOT, "js/ocm-data.js"), "utf8"),
  "js/ocm-directory.js": readFileSync(path.join(ROOT, "js/ocm-directory.js"), "utf8")
};

function load() {
  const sandbox = { console, Date, Math, JSON, Number, String, Array, Object, Set };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const [filename, source] of Object.entries(SOURCES)) {
    vm.runInContext(source, sandbox, { filename });
  }
  return sandbox.window.HOSOCMDIR;
}

const DIR = load();

function makeStorage(initial = null) {
  let value = initial;
  let recovery = null;
  return {
    read: () => value,
    write: text => { value = text; },
    writeRecovery: raw => { recovery = raw; },
    get current() { return value; },
    get recoveryCopy() { return recovery; }
  };
}

test("OCM directory: the module publishes a frozen, schema-versioned API", () => {
  assert.ok(DIR, "window.HOSOCMDIR is published");
  assert.equal(DIR.SCHEMA, "harshalos-ocm-directory-v1");
  assert.equal(DIR.STORAGE_KEY, "hos-ocm-directory-v1");
  assert.equal(Object.isFrozen(DIR), true);
  assert.equal(DIR.TRANSPORT.status, "RECORDED-LOCAL-ONLY");
  assert.equal(DIR.TRANSPORT.transport, "NONE");
  assert.equal(DIR.TRANSPORT.delivery, "NOT-ATTEMPTED");
  assert.equal(DIR.TRANSPORT.authorityEffect, "NONE");
});

test("OCM directory: 0•DDD•RRR•#### parses and canonicalizes", () => {
  const parsed = DIR.parseAddress("0•028•001•0001");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.canonical, "0•028•001•0001");
  assert.equal(parsed.sectorNumber, 28);
  assert.equal(parsed.isCenterOrigin, false);

  // Short fields are zero-padded, and • - . : / and spaces are accepted on input.
  assert.equal(DIR.parseAddress("0•28•1•1").canonical, "0•028•001•0001");
  assert.equal(DIR.parseAddress("0-046-002-0007").canonical, "0•046•002•0007");
  assert.equal(DIR.parseAddress("  0 • 212 • 3 • 42  ").canonical, "0•212•003•0042");

  // An optional node suffix is preserved, as the orb's own nodes use.
  const suffixed = DIR.parseAddress("0•001•000•0001•hkey");
  assert.equal(suffixed.ok, true);
  assert.equal(suffixed.canonical, "0•001•000•0001•HKEY");

  // Ring edges are valid.
  assert.equal(DIR.parseAddress("0•001•000•0000").ok, true);
  assert.equal(DIR.parseAddress("0•359•999•9999").ok, true);
});

test("OCM directory: refusals carry the canonical reason, including the 360° closure rule", () => {
  const cases = [
    ["", "OCM-ADDR-EMPTY"],
    ["0•028•001", "OCM-ADDR-FIELD-COUNT"],
    ["0•028•001•0001•EXTRA•MORE", "OCM-ADDR-FIELD-COUNT"],
    ["1•028•001•0001", "OCM-ADDR-ROOT"],
    ["0•028x•001•0001", "OCM-ADDR-SECTOR-FORMAT"],
    ["0•360•001•0001", "OCM-ADDR-SECTOR-CLOSURE"],
    ["0•999•001•0001", "OCM-ADDR-SECTOR-RANGE"],
    ["0•028•0001•0001", "OCM-ADDR-RADIUS-FORMAT"],
    ["0•028•001•00001", "OCM-ADDR-INSTANCE-FORMAT"],
    ["0•028•001•0001•TOOLONGSUFFIXHERE", "OCM-ADDR-SUFFIX-FORMAT"]
  ];
  for (const [input, code] of cases) {
    const result = DIR.parseAddress(input);
    assert.equal(result.ok, false, `${input || "(empty)"} is refused`);
    assert.equal(result.code, code, `${input || "(empty)"} refuses with ${code}`);
    assert.ok(result.reason && result.reason.length > 20, `${code} explains itself`);
  }

  const closure = DIR.parseAddress("0•360•001•0001");
  assert.match(closure.reason, /ℤ_360/);
  assert.match(closure.reason, /360° ≡ 0° mod 360/);
  assert.match(closure.reason, /never a 361st slot/);
});

test("OCM directory: Center Origin is reserved and cannot be a mailbox", () => {
  assert.equal(DIR.parseAddress("0•000•000•0000").isCenterOrigin, true);
  const refused = DIR.validateAddress("0•000•000•0000");
  assert.equal(refused.ok, false);
  assert.equal(refused.code, "OCM-ADDR-ORIGIN-RESERVED");
  assert.match(refused.reason, /Center Origin/);
  assert.match(refused.reason, /human key/);
  // A non-origin sector still validates.
  assert.equal(DIR.validateAddress("0•001•000•0000").ok, true);
});

test("OCM directory: sector meaning comes from the Part VII degree legend", () => {
  assert.equal(DIR.degreeMeaning(28), "Communication signals");
  const cluster = DIR.clusterOf(28);
  assert.ok(cluster && cluster.from <= 28 && cluster.to >= 28);
  const quadrant = DIR.quadrantOf(28);
  assert.equal(quadrant.name, "Creation / Emergence");
  const described = DIR.describe(DIR.parseAddress("0•212•003•0042"));
  assert.equal(described.degree, "Bio-risk");
  assert.match(described.cluster, /Industry & Transformation/);
  assert.match(described.quadrant, /Transformation \/ Industry/);
  assert.deepEqual(Array.from(DIR.DISTANCE_SEMANTICS.isNot), ["Rank", "Authority", "Importance"]);
});

test("OCM directory: contacts require a name and a valid, non-origin address", () => {
  const store = DIR.createStore({});

  const nameless = store.add({ address: "0•028•001•0001" });
  assert.equal(nameless.ok, false);
  assert.equal(nameless.code, "OCM-DIR-NAME-REQUIRED");

  const badAddress = store.add({ name: "Nobody", address: "0•360•001•0001" });
  assert.equal(badAddress.ok, false);
  assert.equal(badAddress.code, "OCM-ADDR-SECTOR-CLOSURE");

  const origin = store.add({ name: "The Center", address: "0•000•000•0000" });
  assert.equal(origin.ok, false);
  assert.equal(origin.code, "OCM-ADDR-ORIGIN-RESERVED");

  const added = store.add({ name: "Custodial Node", address: "0-028-001-0001", role: "witness", voice: "+1 555 0100", externalMail: "node@example.test" });
  assert.equal(added.ok, true);
  assert.equal(added.contact.address, "0•028•001•0001");
  assert.equal(added.contact.sectorNumber, 28);
  assert.equal(added.contact.kind, "USER");
  assert.equal(Object.isFrozen(added.contact), true);

  const duplicate = store.add({ name: "Same address", address: "0•028•001•0001" });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.code, "OCM-DIR-DUPLICATE");
  assert.equal(store.contacts().length, 1);
});

test("OCM directory: update keeps the address as identity; remove and search work", () => {
  const store = DIR.createStore({});
  const added = store.add({ name: "Relay", address: "0•046•002•0007", notes: "regional relay" });
  const id = added.contact.id;

  const updated = store.update(id, { name: "Relay Prime", address: "0•999•001•0001", notes: "renamed" });
  assert.equal(updated.ok, true);
  assert.equal(updated.contact.name, "Relay Prime");
  assert.equal(updated.contact.address, "0•046•002•0007", "the address cannot be changed by an update");
  assert.equal(updated.contact.notes, "renamed");

  assert.equal(store.search("relay prime").length, 1);
  assert.equal(store.search("046").length, 1);
  assert.equal(store.search("nothing-here").length, 0);
  assert.equal(store.find("0-046-002-0007").name, "Relay Prime");
  assert.equal(store.find("0•999•001•0001"), null);

  assert.equal(store.update("nope", { name: "x" }).code, "OCM-DIR-NOT-FOUND");
  const removed = store.remove(id);
  assert.equal(removed.ok, true);
  assert.equal(removed.removed, "0•046•002•0007");
  assert.equal(store.contacts().length, 0);
  assert.equal(store.remove(id).code, "OCM-DIR-NOT-FOUND");
});

test("OCM mail: a recorded message never claims transport, delivery, or authority", () => {
  const store = DIR.createStore({});
  store.setIdentity("0•028•001•0001");
  assert.equal(store.identity(), "0•028•001•0001");

  const empty = store.record({ from: store.identity(), to: "0•046•002•0007" });
  assert.equal(empty.ok, false);
  assert.equal(empty.code, "OCM-MAIL-EMPTY");

  const toOrigin = store.record({ from: store.identity(), to: "0•000•000•0000", body: "hello center" });
  assert.equal(toOrigin.ok, false);
  assert.equal(toOrigin.field, "to");
  assert.equal(toOrigin.code, "OCM-ADDR-ORIGIN-RESERVED");

  const fromOrigin = store.record({ from: "0•000•000•0000", to: "0•046•002•0007", body: "impersonation" });
  assert.equal(fromOrigin.ok, false);
  assert.equal(fromOrigin.field, "from");

  const badRecipient = store.record({ from: store.identity(), to: "0•360•001•0001", body: "x" });
  assert.equal(badRecipient.ok, false);
  assert.equal(badRecipient.code, "OCM-ADDR-SECTOR-CLOSURE");

  const recorded = store.record({
    from: store.identity(),
    to: "0-046-002-0007",
    subject: "Coordination only",
    body: "Lateral message. No authority intended.",
    bodyDigest: "a".repeat(64)
  });
  assert.equal(recorded.ok, true);
  const message = recorded.message;
  assert.equal(message.to, "0•046•002•0007");
  assert.equal(message.status, "RECORDED-LOCAL-ONLY");
  assert.equal(message.transport, "NONE");
  assert.equal(message.delivery, "NOT-ATTEMPTED");
  assert.equal(message.authorityEffect, "NONE");
  assert.equal(message.direction, "outbound");
  assert.equal(Object.isFrozen(message), true);

  assert.equal(store.messages().length, 1);
  assert.equal(store.removeMessage(message.id).ok, true);
  assert.equal(store.removeMessage(message.id).code, "OCM-MAIL-NOT-FOUND");
});

test("OCM directory: local identity cannot be set to an invalid or origin address", () => {
  const store = DIR.createStore({});
  assert.equal(store.identity(), DIR.DEFAULT_LOCAL_ADDRESS);
  assert.equal(DIR.parseAddress(DIR.DEFAULT_LOCAL_ADDRESS).sectorNumber, 28, "the default sits on the communication-signals degree");
  assert.equal(store.setIdentity("0•360•001•0001").code, "OCM-ADDR-SECTOR-CLOSURE");
  assert.equal(store.setIdentity("0•000•000•0000").code, "OCM-ADDR-ORIGIN-RESERVED");
  assert.equal(store.identity(), DIR.DEFAULT_LOCAL_ADDRESS, "a refused identity leaves the previous value in place");
  assert.equal(store.setIdentity("0-101-004-0002").canonical, "0•101•004•0002");
  assert.equal(store.identity(), "0•101•004•0002");
});

test("OCM directory: persistence round-trips through the injected storage adapter", () => {
  const storage = makeStorage();
  const store = DIR.createStore({ storage });
  store.add({ name: "Persisted", address: "0•028•001•0001" });
  store.record({ from: store.identity(), to: "0•046•002•0007", subject: "s", body: "b" });
  assert.ok(storage.current, "the store wrote through the adapter");

  const reopened = DIR.createStore({ storage: makeStorage(storage.current) });
  const result = reopened.hydrate();
  assert.equal(result.ok, true);
  assert.equal(result.dropped, 0);
  assert.equal(reopened.contacts().length, 1);
  assert.equal(reopened.contacts()[0].name, "Persisted");
  assert.equal(reopened.messages().length, 1);
  assert.equal(reopened.messages()[0].status, "RECORDED-LOCAL-ONLY", "restored messages keep the local-only status");
});

test("OCM directory: malformed and foreign payloads are refused, with a recovery copy kept", () => {
  const malformed = makeStorage("{not json");
  const store = DIR.createStore({ storage: malformed });
  const result = store.hydrate();
  assert.equal(result.ok, false);
  assert.match(result.reason, /not valid JSON/);
  assert.equal(malformed.recoveryCopy, "{not json", "malformed data is preserved, not discarded");
  assert.equal(store.contacts().length, 0);

  const foreign = makeStorage(JSON.stringify({ schema: "something-else-v9", contacts: [] }));
  const foreignResult = DIR.createStore({ storage: foreign }).hydrate();
  assert.equal(foreignResult.ok, false);
  assert.match(foreignResult.reason, /unknown schema/);

  const poisoned = makeStorage(JSON.stringify({
    schema: DIR.SCHEMA,
    identity: "0•360•001•0001",
    contacts: [
      { name: "Good", address: "0•028•001•0001" },
      { name: "Bad sector", address: "0•999•001•0001" },
      { address: "0•046•002•0007" },
      { name: "Good", address: "0•028•001•0001" }
    ],
    messages: [{ from: "0•000•000•0000", to: "0•028•001•0001", body: "x" }]
  }));
  const poisonedStore = DIR.createStore({ storage: poisoned });
  const poisonedResult = poisonedStore.hydrate();
  assert.equal(poisonedResult.ok, true);
  assert.equal(poisonedStore.contacts().length, 1, "only the valid, non-duplicate entry survives");
  assert.equal(poisonedStore.messages().length, 0, "a message from Center Origin is dropped");
  assert.equal(poisonedStore.identity(), DIR.DEFAULT_LOCAL_ADDRESS, "an invalid stored identity falls back to the default");
  assert.equal(poisonedResult.dropped, 4);
});

test("OCM directory: export/import round-trips and rejects what does not parse", () => {
  const source = DIR.createStore({});
  source.add({ name: "Alpha", address: "0•028•001•0001" });
  source.add({ name: "Beta", address: "0•046•002•0007" });
  source.record({ from: source.identity(), to: "0•046•002•0007", subject: "note", body: "body" });
  const exported = source.exportJSON();
  assert.equal(JSON.parse(exported).schema, DIR.SCHEMA);

  const target = DIR.createStore({});
  const imported = target.importJSON(exported);
  assert.equal(imported.ok, true);
  assert.equal(imported.imported, 3);
  assert.equal(imported.rejected, 0);
  assert.equal(target.contacts().length, 2);
  assert.equal(target.messages().length, 1);

  const reimport = target.importJSON(exported);
  assert.equal(reimport.rejected, 3, "duplicates and repeated messages are refused on re-import");

  assert.equal(target.importJSON("nope").code, "OCM-DIR-IMPORT-PARSE");
  assert.equal(target.importJSON(JSON.stringify({ schema: "other" })).code, "OCM-DIR-IMPORT-SCHEMA");
});

test("OCM directory: capacity caps hold on write and on restore", () => {
  const store = DIR.createStore({});
  for (let index = 0; index < DIR.LIMITS.messages + 25; index++) {
    store.record({ from: store.identity(), to: "0•046•002•0007", subject: `m${index}`, body: "b" });
  }
  assert.equal(store.messages().length, DIR.LIMITS.messages, "the newest messages are kept within the cap");
  assert.equal(store.messages()[0].subject, `m${DIR.LIMITS.messages + 24}`, "the cap keeps the most recent record");
});

test("OCM directory: the app has no transport path and no authority capability", () => {
  for (const forbidden of ["fetch(", "XMLHttpRequest", "WebSocket", "EventSource", "sendBeacon", "mailto:", "smtp://", "smtps://", "navigator.connection"]) {
    assert.equal(appSource.includes(forbidden), false, `the app must not contain ${forbidden}`);
  }
  for (const forbidden of ["HOS.request", "HOS.demoAttest", "HOS.transition", "HOS.revoke", "HOS.closeSession", "requestProductionAttestation", "HOS.verify"]) {
    assert.equal(appSource.includes(forbidden), false, `the app must not call ${forbidden}`);
  }
  assert.match(appSource, /window\.HOS\.record|HOS\.record/, "the only HOS use is an informational demo-ledger row");
  assert.match(appSource, /escapeHtml/, "rendered content is escaped before display");
  assert.match(appSource, /LOCAL ONLY — NO TRANSPORT/, "the app states its no-transport boundary");
  assert.match(appSource, /authorityEffect: NONE|authority effect NONE/i, "the app states that messages carry no authority effect");
  assert.equal(/innerHTML\s*=\s*[^`'"]*\$\{(?!escapeHtml)/.test(appSource.replace(/\$\{escapeHtml\([^)]*\)\}/g, "SAFE")), false,
    "no unescaped interpolation reaches innerHTML");
  assert.equal(/window\.(HOS|kernel)\./.test(moduleSource), false, "the logic module touches no authority API");
});

test("OCM routing: the cost asymmetry is published with its canon provenance", () => {
  assert.equal(DIR.ROUTING.model, "RESOLUTION-FIRST");
  assert.equal(DIR.ROUTING.metric, "Cost_resolution < Cost_lateral");
  assert.equal(DIR.ROUTING.center, "0•000•000•0000");
  assert.match(DIR.ROUTING.assumption, /Direct Attachment Axiom/);
  assert.equal(DIR.ROUTING.authoritySource, "HUMAN-KEY-AT-CENTER-ORIGIN");
  assert.equal(DIR.ROUTING.centerRole, "RESOLVE-AND-FORWARD");
  assert.match(DIR.ROUTING.axisInvariant, /authority-resolution mechanism, not an authority source/);
  assert.equal(DIR.ROUTING.precedence.length, 3);
  assert.match(DIR.ROUTING.boundary, /logical authority-verification hops/);
  assert.match(DIR.ROUTING.boundary, /does not claim lower physical wire latency/);
  assert.match(DIR.ROUTING.orbRenderNote, /rendering parameter, not a measurement/);
});

test("OCM routing: ring distance is the short arc on ℤ_360", () => {
  assert.equal(DIR.ringDistance(1, 359), 2);
  assert.equal(DIR.ringDistance(359, 1), 2);
  assert.equal(DIR.ringDistance(28, 46), 18);
  assert.equal(DIR.ringDistance(28, 212), 176);
  assert.equal(DIR.ringDistance(0, 180), 180);
  assert.equal(DIR.ringDistance(0, 360), 0, "360° ≡ 0° — closure, never a 361st slot");
});

test("OCM routing: the via-center plan is 1 verification hop against m direct lateral", () => {
  const one = DIR.planRoute({ from: "0•028•001•0001", to: "0•046•002•0007" });
  assert.equal(one.ok, true);
  assert.equal(one.participants, 2);
  assert.equal(one.route, "VIA-CENTER");
  assert.equal(one.recommendation, "RESOLUTION-FIRST");
  assert.equal(Array.from(one.path).length, 2);
  assert.equal(one.path[0].from, "0•028•001•0001");
  assert.equal(one.path[0].to, "0•000•000•0000");
  assert.equal(one.path[0].direction, "inward");
  assert.equal(one.path[0].leg, "Resolve legitimacy");
  assert.equal(one.path[0].verifies, true, "the inward leg is the only verification hop");
  assert.equal(one.path[1].from, "0•000•000•0000");
  assert.equal(one.path[1].to, "0•046•002•0007");
  assert.equal(one.path[1].direction, "outward");
  assert.equal(one.path[1].leg, "Transmit legitimacy state");
  assert.equal(one.path[1].verifies, false, "the outward leg transmits; it does not verify");
  assert.equal(one.verification.resolutionFirst, 1);
  assert.equal(one.verification.directLateral, 2);
  assert.equal(one.verification.savedHops, 1);
  assert.equal(one.verification.lateralArcDegrees, 18);

  const broadcast = DIR.planRoute({ from: "0•028•001•0001", to: "0•046•002•0007", recipients: 9 });
  assert.equal(broadcast.participants, 10);
  assert.equal(broadcast.verification.resolutionFirst, 1, "resolution stays one hop however wide the lateral fan");
  assert.equal(broadcast.verification.directLateral, 10);
  assert.equal(broadcast.verification.savedHops, 9);
  assert.ok(broadcast.verification.directLateral > broadcast.verification.resolutionFirst);
});

test("OCM routing: resolution-first never costs more, and ties only at one participant", () => {
  const seen = [];
  for (const recipients of [1, 2, 3, 5, 12, 50]) {
    const plan = DIR.planRoute({ from: "0•012•004•0002", to: "0•341•009•0061", recipients });
    assert.equal(plan.ok, true);
    assert.ok(plan.verification.resolutionFirst <= plan.verification.directLateral,
      `resolution-first must never cost more than direct lateral at m=${plan.participants}`);
    if (plan.participants > 2) {
      assert.ok(plan.verification.resolutionFirst < plan.verification.directLateral,
        `strictly cheaper for more than two participants, got m=${plan.participants}`);
    }
    seen.push(plan.verification.directLateral - plan.verification.resolutionFirst);
  }
  assert.deepEqual(seen, [1, 2, 3, 5, 12, 50], "the saving grows linearly with the lateral fan");
});

test("OCM routing: a plan refuses an unparseable endpoint or the reserved origin", () => {
  assert.equal(DIR.planRoute({ from: "0•000•000•0000", to: "0•046•002•0007" }).code, "OCM-ADDR-ORIGIN-RESERVED");
  assert.equal(DIR.planRoute({ from: "0•028•001•0001", to: "0•360•001•0001" }).code, "OCM-ADDR-SECTOR-CLOSURE");
  assert.equal(DIR.planRoute({ from: "not-an-address", to: "0•046•002•0007" }).code, "OCM-ADDR-FIELD-COUNT");
  assert.equal(DIR.planRoute({ from: "0•028•001•0001", to: "0•046•002•00001" }).code, "OCM-ADDR-INSTANCE-FORMAT");
  assert.equal(DIR.planRoute({ from: "0•028•001•1", to: "0•046•002•0007" }).ok, true,
    "short input zero-pads, so this is a canonicalizable address, not a refusal");
  const refused = DIR.planRoute({ from: "", to: "0•046•002•0007" });
  assert.equal(refused.ok, false);
  assert.equal(refused.code, "OCM-ADDR-EMPTY");
  assert.equal(Array.isArray(refused.path), false, "a refusal carries no hop path");
});

test("OCM routing: recorded messages stamp the route they were recorded against", () => {
  const storage = makeStorage(null);
  const store = DIR.createStore({ storage });
  assert.equal(store.setIdentity("0•028•001•0001").ok, true);

  const via = store.record({ from: store.identity(), to: "0•046•002•0007", subject: "via", body: "b", route: "VIA-CENTER" });
  assert.equal(via.ok, true);
  assert.equal(via.message.route, "VIA-CENTER");
  assert.equal(via.message.resolution, "TRAVERSED");
  assert.equal(via.message.resolvedAt, "0•000•000•0000");
  assert.equal(via.message.centerRole, "RESOLVE-AND-FORWARD");
  assert.equal(via.message.authoritySource, "HUMAN-KEY-AT-CENTER-ORIGIN");
  assert.equal(Array.from(via.message.path).length, 2);
  assert.equal(via.message.verificationHops.resolutionFirst, 1);
  assert.equal(via.message.verificationHops.directLateral, 2);
  assert.equal(via.message.authorityEffect, "NONE", "a shorter verification path grants no authority");
  assert.equal(via.message.status, "RECORDED-LOCAL-ONLY");

  const lateral = store.record({ from: store.identity(), to: "0•046•002•0007", subject: "lateral", body: "b", route: "DIRECT-LATERAL" });
  assert.equal(lateral.ok, true);
  assert.equal(lateral.message.route, "DIRECT-LATERAL");
  assert.equal(lateral.message.resolution, "NOT-TRAVERSED");
  assert.equal(lateral.message.centerRole, "BYPASSED");
  assert.equal(lateral.message.verificationHops.savedHops, 0);
  assert.equal(lateral.message.authorityEffect, "NONE");

  assert.equal(DIR.ROUTING.authoritySource, via.message.authoritySource);
  assert.equal(Object.isFrozen(via.message.verificationHops), true);
});

test("OCM routing: the app surfaces the model and never claims the center grants authority", () => {
  assert.match(appSource, /RESOLUTION-FIRST|resolution-first/i, "the app names the routing model");
  assert.match(appSource, /Cost_resolution &lt; Cost_lateral/, "the app shows the cost asymmetry with HTML-escaped angle brackets");
  assert.match(appSource, /ROUTING\.boundary/, "the app renders the wire-latency disclaimer");
  assert.match(appSource, /ROUTING\.precedence/, "the app renders the precedence invariants");
  assert.match(appSource, /RESOLVE-AND-FORWARD|ROUTING\.centerRole/, "the app names the center's resolve-and-forward role");
  assert.match(appSource, /VERIFIES/, "the app marks which hop actually verifies");
  assert.match(appSource, /DIRECT-LATERAL/, "direct lateral routing remains selectable, as the axiom permits");
  assert.match(appSource, /VIA-CENTER/, "via-center routing is offered");
  assert.equal(appSource.includes("does not claim lower physical wire latency"), false,
    "the boundary text is read from the module, not duplicated in the app");
});
