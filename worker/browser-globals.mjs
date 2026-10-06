/*
 * Worker-side shim for the reviewed browser modules.
 *
 * `js/characters-beat.js`, `js/good-intelligence-market-context.js`,
 * `js/good-intelligence-ds.js`, and `js/good-intelligence-market-roster.js` are
 * plain IIFEs that publish onto `window`. The Worker evaluates the same files so a
 * server beat and a browser beat can never diverge in market rules.
 *
 * Import this module before any of those files: ES module dependencies are
 * evaluated in import-statement order, so `window` exists by the time they run.
 * Nothing here is written back into a response; the shim only gives the shared
 * modules somewhere to publish.
 */

if (typeof globalThis.window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    enumerable: false,
    value: globalThis
  });
}

export const BROWSER_GLOBALS_SHIM = "harshalos-worker-browser-globals-v1";
