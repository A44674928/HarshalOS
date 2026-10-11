/* Standalone NEO ORB page boot (neo-orb.html). The page loads the same NEO ORB scripts
   as the shell, mounts the app into #neo-root, and nothing else. It makes no request of
   its own: the only data read is the Orb 2 field route, through NeoOrbField. Display-only. */
(function () {
  "use strict";
  var root = document.getElementById("neo-root");
  var app = window.NeoOrbApp;
  if (!root) return;
  if (!app || typeof app.mountNeoOrb !== "function") {
    root.textContent = "NEO ORB could not start: its scripts did not load.";
    return;
  }
  app.mountNeoOrb(root);
})();
