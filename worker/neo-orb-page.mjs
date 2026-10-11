/* The standalone NEO ORB page (/neo-orb). It is its own document, so the browser
   enforces the boundary itself: connect-src 'self' means the page can reach only this
   origin, and its one data read goes to the Orb 2 field route on this origin.

   One policy source feeds two places: the <meta> tag in neo-orb.html (works wherever
   the file is served) and the response header the Worker sets for this path. The
   header also carries frame-ancestors, which a <meta> tag cannot express. A test
   keeps the page's <meta> in step with this constant. */

export const NEO_ORB_PAGE_PATHS = Object.freeze({
  "/neo-orb": "/neo-orb",
  "/neo-orb.html": "/neo-orb"
});

export const NEO_ORB_PAGE_POLICY = Object.freeze([
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "img-src 'self'",
  "worker-src 'self'",
  "font-src 'none'",
  "media-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
]);

/* style-src 'unsafe-inline' is needed because the NEO ORB markup sets style attributes on its
   own elements. It allows styles only. Scripts stay limited to this origin's files. */
export const NEO_ORB_PAGE_META_CSP = NEO_ORB_PAGE_POLICY.join("; ");
export const NEO_ORB_PAGE_HEADER_CSP = [...NEO_ORB_PAGE_POLICY, "frame-ancestors 'none'"].join("; ");
