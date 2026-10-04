# Materials Project lookup

**Status:** read-only desktop lookup backed by the Materials Project Summary API. Validation uses stubbed upstream responses; this integration has not been live-tested or deployed from this change.

## Scope and data flow

The **Materials** desktop app accepts a formula (for example `SiO2`), a chemical system (for example `Li-Fe-O`), or a Materials Project ID (for example `mp-149`). It makes no request when opened; a lookup is sent only after the operator submits the form.

```text
Browser app
  GET /api/materials-project/v1/search?q=SiO2&limit=10
        ↓ same-origin request
Cloudflare Worker: worker/materials-project.mjs
  validate query → cache / per-client pace → fixed Summary API request
        ↓ X-API-KEY header only
https://api.materialsproject.org/materials/summary/
```

The Worker is a narrow proxy, not a general API relay. It accepts only bounded formulas, chemical systems, and IDs; requests a fixed set of summary fields; asks the API to sort by energy above hull and then material ID; limits each response to at most 20 records; refuses redirects; times out upstream work; and returns normalized fields only. Successful lookups are cached in Worker memory for up to five minutes. A best-effort in-memory budget allows at most 20 uncached upstream searches per client IP per minute **per Worker isolate**; Cloudflare isolate distribution/restarts mean this is not a durable or global quota. Cloudflare Access and the Materials Project's own limits remain important boundaries.

The Worker requests the API's `BY-C` license scope explicitly rather than `All`, and requests legacy-formatted IDs for consistent display. Do not broaden the license scope without reviewing the applicable dataset terms. The API key is read from the Worker environment as `MATERIALS_PROJECT_API_KEY` and sent in the `X-API-KEY` header. It is never a browser setting, URL parameter, static variable, or returned field.

No Access policy is created or changed here. Keep the existing Cloudflare Access protection in place and confirm that it covers both the site and `/api/materials-project/*`. If the Worker secret is absent, the route fails closed with a configuration response and makes no provider request.

## Worker secret setup

Choose the intended Worker environment first, then enter the key through Wrangler's interactive prompt (or the Cloudflare dashboard's Worker Secrets UI). Do not paste it into HarshalOS, a source file, a browser console, a URL, a ticket, or chat.

Production Worker:

```bash
npx wrangler secret put MATERIALS_PROJECT_API_KEY
```

A separately configured staging Worker, only if you intentionally enable it:

```bash
npx wrangler secret put MATERIALS_PROJECT_API_KEY --config wrangler.staging.jsonc
```

For local `wrangler dev`, a developer may create the ignored `.dev.vars` file manually with a `MATERIALS_PROJECT_API_KEY` entry. `.dev.vars` is gitignored; still verify it is not staged or shared. Never put the secret in `wrangler.jsonc`, `wrangler.staging.jsonc`, the browser bundle, or a committed `.env` file. No secret is required to run the automated tests.

## Displayed properties and units

Fields are selected in `worker/materials-project.mjs`, then normalized before they reach the app. Depending on the record, the view can show:

- formula, elements, Materials Project ID, crystal system, space group, element count, and sites per unit cell;
- density in **g/cm³** and unit-cell volume in **Å³**;
- calculated band gap in **eV**, formation energy and energy above hull in **eV/atom**;
- calculated Voigt-Reuss-Hill bulk and shear moduli in **GPa**;
- calculated isotropic Poisson ratio and universal elastic anisotropy (dimensionless);
- the record's stability/metal flags, available property groups, returned warnings, calculation-origin/task IDs, and update date.

Missing values stay missing; the app does not synthesize or estimate a value. Formula searches can return multiple structures/polymorphs with different properties. Compare the MP IDs and inspect the source record rather than treating a formula as one uniquely determined material.

## Scientific and licensing limits

Materials Project summary values may be computationally derived (including DFT-based results), incomplete, method-dependent, or different from experimental measurements. The app labels calculated properties, shows units and record provenance, and does **not** claim guaranteed experimental values, certified safety, or engineering performance. It is a database lookup, not a general-purpose physics or engineering solver; validate independently before research, design, procurement, or safety decisions.

Materials Project asks users to cite its data. Suggested citation:

> Jain, A. et al. “The Materials Project: A materials genome approach to accelerating materials innovation.” *APL Materials* 1, 011002 (2013). <https://doi.org/10.1063/1.4812323>

The desktop app also links to Materials Project's current citation guidance. The API exposes license filters including `BY-C`, `BY-NC`, and `All`; this integration requests `BY-C`. GNoME-origin data may carry a separate **CC BY-NC** license. Check the applicable record and current terms before any reuse or redistribution; the `BY-C` filter is not a substitute for legal review.

## Tests and verification

Run the focused stub-only suite:

```bash
npm run test:materials-project
```

`tests/materials-project-api-test.mjs` checks the Worker proxy, fixed upstream URL and field projection, secret-header handling, license scope, query/result bounds, caching, pacing, timeout, and safe errors with a stub fetcher. `tests/materials-project-ui-test.mjs` renders the app in happy-dom with stubbed same-origin responses and checks units, attribution, provenance, safe text rendering, and error/cancel states. Neither test makes a live Materials Project request or requires the API key.

## Official references

- [Materials Project API documentation](https://api.materialsproject.org/docs)
- [API getting started](https://docs.materialsproject.org/downloading-data/using-the-api/getting-started)
- [Querying data](https://docs.materialsproject.org/downloading-data/using-the-api/querying-data)
- [Materials Project citation guidance](https://next-gen.materialsproject.org/about/cite)
- [Materials Project database-version notes](https://docs.materialsproject.org/changes/database-versions)
- [Materials Project API overview and access notes](https://next-gen.materialsproject.org/api)
