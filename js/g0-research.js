/* ═══════════════════════════════════════════════════════════════
   HarshalOS — Ground-0 automatic public-record research

   Key-free, in-browser research that prepares a Ground-0 audit draft.
   Nothing here issues a badge or a verified finding: the output is a
   suggestion set with citations, gaps and honest coverage, and it
   always requires human review before it can score.

   Pipeline:
     1. Identity     — Wikipedia search + Wikidata (label, QID, P856 site)
     2. Officiality  — homepage + policy/appeal/governance links, read
                       through a key-free public reader (r.jina.ai)
     3. History      — Internet Archive Wayback captures at the cutoff,
                       so live text is never mistaken for the version in
                       force then
     4. Registries    — CourtListener opinions/dockets, Federal Register,
                       GovTrack bills, GDELT news (leads only)
     5. Scoring       — only operative source sentences about THIS
                       entity's action can activate a test; captions,
                       filing dates, requests and denials cannot

   Every registry outcome is reported — including empty, partial and
   unavailable — as a coverage table. An optional same-origin hosted
   research service (/api/research) is detected automatically and used
   when configured; the static deployment stays fully functional
   without it.

   Exposed as window.G0Research. No dependencies beyond window.G0.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

window.G0Research = (() => {
  const G0 = window.G0;

  /* ──────────────────────────────────────────────────────────────
     Network — cancellation and timeouts stay active until the body
     has finished, not just until the headers arrive.
     ────────────────────────────────────────────────────────────── */
  class HttpError extends Error {
    constructor(status, message = `The public service returned HTTP ${status}.`) { super(message); this.name = "HttpError"; this.status = status; }
  }
  async function fetchJson(url, options = {}) {
    const { signal, timeoutMs = 18000, ...init } = options;
    if (signal) signal.throwIfAborted();
    const controller = new AbortController();
    const cancel = () => controller.abort(signal && signal.reason);
    if (signal) signal.addEventListener("abort", cancel, { once: true });
    const deadline = new Error("The public service took too long to return a complete response. Retry or continue manually.");
    deadline.name = "TimeoutError";
    const timer = setTimeout(() => controller.abort(deadline), timeoutMs);
    let removeAbortListener = () => {};
    const interrupted = new Promise((_, reject) => {
      const rejectAbort = () => reject(controller.signal.reason || new DOMException("Request canceled.", "AbortError"));
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
      removeAbortListener = () => controller.signal.removeEventListener("abort", rejectAbort);
    });
    const read = async () => {
      const headers = new Headers(init.headers || {});
      if (!headers.has("Accept")) headers.set("Accept", "application/json");
      const response = await fetch(url, { ...init, headers, signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" });
      if (!response.ok) {
        let message = `The public service returned HTTP ${response.status}.`;
        if ((response.headers.get("content-type") || "").includes("application/json")) {
          try { const body = await response.json(); if (body && typeof body.error === "string") message = body.error; } catch { controller.signal.throwIfAborted(); }
        }
        throw new HttpError(response.status, message);
      }
      try { const data = await response.json(); controller.signal.throwIfAborted(); return data; }
      catch (error) { controller.signal.throwIfAborted(); if (error instanceof SyntaxError) throw new Error("The public service did not return valid JSON. No result was inferred from this response."); throw error; }
    };
    try { return await Promise.race([read(), interrupted]); }
    finally { clearTimeout(timer); if (signal) signal.removeEventListener("abort", cancel); removeAbortListener(); }
  }
  function abortableDelay(milliseconds, signal) {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
      const stop = () => { clearTimeout(timer); signal.removeEventListener("abort", stop); reject(signal.reason || new DOMException("Request canceled.", "AbortError")); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", stop); resolve(); }, milliseconds);
      signal.addEventListener("abort", stop, { once: true });
    });
  }

  /* ──────────────────────────────────────────────────────────────
     Public registries
     ────────────────────────────────────────────────────────────── */
  const registryLabels = {
    courts: { label: "Court records", scope: "Bounded US opinion and docket searches; not all proceedings", source: "CourtListener (Free Law Project)" },
    regulatory: { label: "Regulatory & executive record", scope: "Bounded US Federal Register rules, notices, and orders", source: "Federal Register API" },
    legislative: { label: "Legislative record", scope: "Bounded US Congressional bill and resolution search", source: "GovTrack" },
    news: { label: "News coverage", scope: "Indexed English-language news leads; never scored", source: "GDELT Project" },
    archive: { label: "Archived snapshots", scope: "Available policy captures on or before the cutoff", source: "Internet Archive Wayback Machine" }
  };
  const now = () => new Date().toISOString();
  const clean = (value, limit = 700) => typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/&(?:amp|quot|lt|gt|nbsp);/gi, " ").replace(/\s+/g, " ").trim().slice(0, limit) : "";
  function arrayField(data, field) {
    if (!G0.isObject(data) || !Array.isArray(data[field])) throw new Error("The public index returned an unexpected record format.");
    return data[field].filter(G0.isObject);
  }
  function rank(records, namedLimit, mentionLimit) {
    const byUrl = new Map();
    for (const record of records) {
      if (!G0.safePublicUrl(record.url)) continue;
      const key = G0.canonicalUrl(record.url); const previous = byUrl.get(key);
      if (!previous || (!previous.scoreable && record.scoreable)) byUrl.set(key, record);
    }
    const all = Array.from(byUrl.values());
    return [...all.filter(r => r.named).slice(0, namedLimit), ...all.filter(r => !r.named).slice(0, mentionLimit)];
  }
  const ignoredNameWords = new Set(["the", "inc", "llc", "ltd", "plc", "corporation", "company", "group", "holdings", "organization", "organisation"]);
  function mentionsEntity(textValue, name) {
    const normalize = value => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const haystack = ` ${normalize(textValue)} `; const fullName = normalize(name);
    if (!fullName) return false;
    if (haystack.includes(` ${fullName} `)) return true;
    const words = fullName.split(" ").filter(word => word.length > 2 && !ignoredNameWords.has(word));
    return words.length > 0 && words.every(word => haystack.includes(` ${word} `));
  }

  /* A caption match is not a successful override. Require an actual
     decision about this entity's action. Only verbatim SOURCE text
     belongs in `claim` — generated reading instructions never activate
     a test. */
  function externalOverrideQuote(record, name) {
    if (!record.scoreable || !record.named || !record.claim || !["court", "regulatory"].includes(record.kind)) return null;
    const namePattern = name.trim().split(/\s+/).map(word => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
    if (!namePattern) return null;
    const entity = `(?:${namePattern})(?:['’]s)?`;
    const action = "(?:decision|order|rule|policy|directive|action|enforcement|deployment)";
    const acted = "(?:vacated|enjoined|overturned|reversed|rescinded|annulled|invalidated|struck down|set aside)";
    const target = `(?:${entity}[^.!?]{0,70}${action}|${action}[^.!?]{0,45}(?:of|by|from)\\s+(?:the\\s+)?${entity})`;
    const active = new RegExp(`(?:court|judge|tribunal|agency|regulator|commission|we)\\b[^.!?]{0,100}\\b${acted}\\b[^.!?]{0,80}${target}`, "i");
    const passive = new RegExp(`${target}[^.!?]{0,90}\\b(?:was|were|has been|have been)\\s+${acted}\\b[^.!?]{0,80}\\b(?:court|judge|tribunal|agency|regulator)`, "i");
    const stopOrder = new RegExp(`\\b(?:court|judge|regulator|agency|commission)\\b[^.!?]{0,90}\\b(?:ordered|enjoined)\\s+(?:the\\s+)?${entity}[^.!?]{0,65}\\bto\\s+(?:cease|halt|stop|suspend|withdraw)\\b`, "i");
    const notOperative = /\b(?:not|never|denied|deny|declined|refused|requested|requests|seeks|sought|petitioned|moved|motion|could|may|might|would|proposed|alleged)\b/i;
    for (const sentence of record.claim.split(/(?<=[.!?])\s+/).filter(s => s.trim())) {
      if (notOperative.test(sentence) || !mentionsEntity(sentence, name)) continue;
      if (active.test(sentence) || passive.test(sentence) || stopOrder.test(sentence)) return sentence.trim().slice(0, 1000);
    }
    return null;
  }

  async function searchCourtRecords(name, cutoff, signal) {
    const records = []; const gaps = []; const consulted = [];
    let successes = 0;
    for (const [type, kindLabel] of [["o", "opinion"], ["r", "docket"]]) {
      signal.throwIfAborted();
      const [year, month, day] = cutoff.split("-");
      const url = new URL("https://www.courtlistener.com/api/rest/v4/search/");
      url.search = new URLSearchParams({ q: `"${name.replace(/"/g, "")}"`, type, order_by: "dateFiled desc", filed_before: `${month}/${day}/${year}` }).toString();
      try {
        const data = await fetchJson(url.href, { signal, timeoutMs: 20000 });
        const rows = arrayField(data, "results"); successes++; consulted.push(url.href);
        for (const [index, item] of rows.slice(0, 20).entries()) {
          const caseName = clean(item.caseName || item.case_name_full, 220); const filed = G0.artifactDate(item.dateFiled);
          if (!caseName || !filed || !G0.eligibleByCutoff(filed, cutoff)) continue;
          const named = mentionsEntity(caseName, name);
          const path = typeof item.absolute_url === "string" ? item.absolute_url : typeof item.docket_absolute_url === "string" ? item.docket_absolute_url : "";
          if (!path) continue;
          let recordUrl; try { recordUrl = new URL(path, "https://www.courtlistener.com").href; } catch { continue; }
          if (!G0.safePublicUrl(recordUrl) || new URL(recordUrl).hostname !== "www.courtlistener.com") continue;
          const opinions = Array.isArray(item.opinions) ? item.opinions.filter(G0.isObject) : [];
          const claim = clean(opinions.map(o => clean(o.snippet, 1200)).join(" ") || item.snippet, 1800);
          const docketContext = `${caseName}. Docket ${clean(item.docketNumber, 60) || "not stated"}, filed ${filed}.`;
          records.push({ id: `COURT-${type}-${index + 1}`, kind: "court", title: `${caseName} (${kindLabel})`, url: recordUrl, published: filed, retrieved: now(), authority: clean(item.court, 160) || "Court", claim, excerpt: `${claim || docketContext}${named ? "" : " Full-text mention only: confirm the entity and party before relying on this record."}${type === "r" ? " A docket filing date is not evidence that relief was granted on that date." : " Read the original opinion to verify the action and its scope."}`, scoreable: named && type === "o" && !!claim, named, codes: [] });
        }
        if (G0.isObject(data) && typeof data.count === "number" && data.count > rows.length) gaps.push(`The ${kindLabel} index has more results than this bounded first-page search; older records may be missing.`);
      } catch { signal.throwIfAborted(); gaps.push(`Court ${kindLabel} search was unavailable or rate-limited; coverage for this run is incomplete.`); }
    }
    if (!records.some(r => r.named) && successes) gaps.push("No returned court caption named this organization by the cutoff. Full-text mentions, sealed matters, and non-US proceedings do not establish an exercised override.");
    return { records: rank(records, 8, 3), gaps, consulted, outcomes: [{ registry: "courts", status: successes === 0 ? "unavailable" : successes < 2 ? "partial" : records.length ? "searched" : "no-match" }] };
  }

  async function searchRegulatoryRecords(name, cutoff, signal) {
    const url = new URL("https://www.federalregister.gov/api/v1/documents.json");
    url.searchParams.set("conditions[term]", `"${name.replace(/"/g, "")}"`);
    url.searchParams.set("conditions[publication_date][lte]", cutoff);
    url.searchParams.set("per_page", "10");
    url.searchParams.set("order", "newest");
    for (const field of ["title", "publication_date", "html_url", "abstract", "type", "agencies"]) url.searchParams.append("fields[]", field);
    try {
      const data = await fetchJson(url.href, { signal }); const rows = arrayField(data, "results"); const records = [];
      for (const item of rows) {
        const title = clean(item.title, 240); const published = G0.artifactDate(item.publication_date); const claim = clean(item.abstract, 1300);
        if (!title || !published || !G0.eligibleByCutoff(published, cutoff) || !G0.safePublicUrl(item.html_url)) continue;
        const named = mentionsEntity(`${title} ${claim}`, name); const type = clean(item.type, 40);
        const agencies = Array.isArray(item.agencies) ? item.agencies.filter(G0.isObject).map(a => clean(a.name, 120)).filter(Boolean).join(", ") : "";
        records.push({ id: `REG-${records.length + 1}`, kind: "regulatory", title: `${title} (${type || "Document"})`, url: item.html_url, published, retrieved: now(), authority: agencies || "US Federal Register", claim, excerpt: `${claim || title}${named ? "" : " Full-text match only: verify that the document body refers to this organization."}${/propos|notice/i.test(type) ? " A proposal or notice alone does not establish an exercised override." : ""}`, scoreable: named && !!claim && /^(Rule|PresidentialDocument|Order)$/i.test(type), named, codes: [] });
      }
      const gaps = records.length ? [] : ["No returned US Federal Register document matched this organization by the cutoff. State and non-US regulators are not covered."];
      if (G0.isObject(data) && typeof data.total_pages === "number" && data.total_pages > 1) gaps.push("Only the first page of regulatory results was inspected; additional matching documents may exist.");
      return { records: rank(records, 6, 2), gaps, consulted: [url.href], outcomes: [{ registry: "regulatory", status: records.length ? "searched" : "no-match" }] };
    } catch { signal.throwIfAborted(); return { records: [], gaps: ["The Federal Register index was unavailable; regulatory coverage is incomplete."], consulted: [], outcomes: [{ registry: "regulatory", status: "unavailable" }] }; }
  }

  async function searchLegislativeRecords(name, cutoff, signal) {
    const url = new URL("https://www.govtrack.us/api/v2/bill");
    url.search = new URLSearchParams({ q: name, limit: "12", sort: "-introduced_date", introduced_date__lte: cutoff }).toString();
    try {
      const data = await fetchJson(url.href, { signal }); const rows = arrayField(data, "objects"); const records = [];
      for (const item of rows) {
        const title = clean(item.title_without_number || item.title, 240); const introduced = G0.artifactDate(item.introduced_date);
        if (!title || !introduced || !G0.eligibleByCutoff(introduced, cutoff) || !G0.safePublicUrl(item.link)) continue;
        const named = mentionsEntity(title, name); const statusDate = G0.artifactDate(item.current_status_date);
        const historicalStatus = statusDate && G0.eligibleByCutoff(statusDate, cutoff);
        const status = historicalStatus ? `${clean(item.current_status_description, 600) || clean(item.current_status_label, 100)} Status date: ${statusDate}.` : "Current bill status is not asserted for this historical cutoff without a dated action record.";
        records.push({ id: `LEG-${records.length + 1}`, kind: "legislative", title: `${clean(item.display_number, 30)} — ${title}`, url: item.link, published: introduced, retrieved: now(), authority: "US Congress", claim: "", excerpt: `${status} Introduced ${introduced}. Introduction alone is not enactment or an exercised override.${named ? "" : " Full-text match only: verify the entity in the bill text."}`, scoreable: false, named, codes: [] });
      }
      const gaps = records.length ? [] : ["No returned Congressional bill matched this organization by the cutoff. State, local, and non-US legislatures are not covered."];
      if (G0.isObject(data) && G0.isObject(data.meta) && typeof data.meta.total_count === "number" && data.meta.total_count > rows.length) gaps.push("Additional legislative matches exceed this bounded result set.");
      return { records: rank(records, 5, 2), gaps, consulted: [url.href], outcomes: [{ registry: "legislative", status: records.length ? "searched" : "no-match" }] };
    } catch { signal.throwIfAborted(); return { records: [], gaps: ["The legislative index was unavailable; legislative coverage is incomplete."], consulted: [], outcomes: [{ registry: "legislative", status: "unavailable" }] }; }
  }

  async function searchNewsRecords(name, cutoff, signal) {
    const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
    url.search = new URLSearchParams({ query: `"${name.replace(/"/g, "")}" (enforcement OR lawsuit OR regulator OR fine OR ruling OR appeal OR ban) sourcelang:english`, mode: "artlist", maxrecords: "12", format: "json", sort: "datedesc", enddatetime: `${cutoff.replace(/-/g, "")}235959` }).toString();
    try {
      let data;
      try { data = await fetchJson(url.href, { signal, timeoutMs: 20000 }); }
      catch (error) {
        signal.throwIfAborted();
        if (error instanceof HttpError && error.status !== 429 && error.status < 500) throw error;
        await abortableDelay(5500, signal); data = await fetchJson(url.href, { signal, timeoutMs: 20000 });
      }
      const rows = arrayField(data, "articles"); const records = [];
      for (const item of rows) {
        const title = clean(item.title, 240); const seen = typeof item.seendate === "string" ? item.seendate : "";
        const indexed = G0.artifactDate(`${seen.slice(0, 4)}-${seen.slice(4, 6)}-${seen.slice(6, 8)}`);
        if (!title || !indexed || !G0.eligibleByCutoff(indexed, cutoff) || !mentionsEntity(title, name) || !G0.safePublicUrl(item.url)) continue;
        records.push({ id: `NEWS-${records.length + 1}`, kind: "news", title, url: item.url, published: indexed, retrieved: now(), authority: clean(item.domain, 120) || "News outlet", claim: "", excerpt: `Indexed by GDELT on ${indexed}; this is not a verified publication date. ${clean(item.domain, 120)} reporting is a lead for a primary artifact, never operative evidence.`, scoreable: false, named: true, codes: [] });
      }
      return { records: rank(records, 6, 0), gaps: records.length ? [] : ["No returned English-language news lead named this organization before the cutoff. Index coverage and historical windows are limited."], consulted: [url.href], outcomes: [{ registry: "news", status: records.length ? "searched" : "no-match" }] };
    } catch { signal.throwIfAborted(); return { records: [], gaps: ["The news index was unavailable or rate-limited; news coverage is incomplete."], consulted: [], outcomes: [{ registry: "news", status: "unavailable" }] }; }
  }

  async function lookupArchivedSnapshot(url, cutoff, signal) {
    if (!G0.safePublicUrl(url) || !G0.isCalendarDate(cutoff)) return { status: "no-match", snapshot: null };
    try {
      const stamp = `${cutoff.replace(/-/g, "")}235959`;
      const endpoint = new URL("https://archive.org/wayback/available");
      endpoint.search = new URLSearchParams({ url, timestamp: stamp }).toString();
      const data = await fetchJson(endpoint.href, { signal, timeoutMs: 14000 });
      if (!G0.isObject(data) || !G0.isObject(data.archived_snapshots)) throw new Error("Unexpected archive response.");
      const closest = data.archived_snapshots.closest;
      if (!G0.isObject(closest) || closest.available !== true || closest.status !== "200") return { status: "no-match", snapshot: null };
      const parsed = G0.parseArchiveUrl(closest.url);
      if (!parsed || parsed.timestamp !== closest.timestamp || parsed.timestamp > stamp || !G0.sameResource(parsed.original, url)) return { status: "no-match", snapshot: null };
      return { status: "found", snapshot: { url: String(closest.url).replace(/^http:/, "https:"), captured: parsed.captured } };
    } catch { signal.throwIfAborted(); return { status: "unavailable", snapshot: null }; }
  }

  async function searchPublicRegistries(name, cutoff, signal, onRegistry) {
    const searches = [["courts", searchCourtRecords(name, cutoff, signal)], ["regulatory", searchRegulatoryRecords(name, cutoff, signal)], ["legislative", searchLegislativeRecords(name, cutoff, signal)], ["news", searchNewsRecords(name, cutoff, signal)]];
    const results = await Promise.allSettled(searches.map(async ([, promise]) => { const result = await promise; signal.throwIfAborted(); return result; }));
    signal.throwIfAborted();
    const records = []; const gaps = []; const consulted = []; const outcomes = []; const seen = new Set();
    for (const [i, settled] of results.entries()) {
      const registry = searches[i][0];
      if (settled.status !== "fulfilled") { gaps.push(`${registryLabels[registry].label}: the index could not be reached.`); outcomes.push({ registry, status: "unavailable" }); continue; }
      const result = settled.value;
      if (onRegistry) onRegistry(registry);
      for (const record of result.records) { const key = G0.canonicalUrl(record.url); if (!seen.has(key)) { seen.add(key); records.push(record); } }
      gaps.push(...result.gaps.map(gap => `${registryLabels[registry].label}: ${gap}`));
      consulted.push(...result.consulted); outcomes.push(...(result.outcomes || []));
    }
    return { records, gaps, consulted, outcomes };
  }

  /* ──────────────────────────────────────────────────────────────
     Identity + page reading
     ────────────────────────────────────────────────────────────── */
  class OrganizationChoiceError extends Error {
    constructor(candidates) { super("Several public records match this name. Choose the organization you mean."); this.name = "OrganizationChoiceError"; this.candidates = candidates; }
  }
  function apiUrl(base, parameters) {
    const url = new URL(base);
    for (const [key, value] of Object.entries({ ...parameters, format: "json", origin: "*" })) url.searchParams.set(key, value);
    return url.href;
  }
  /* Optional same-origin hosted research service; never required. */
  async function researchAvailability(signal) {
    try {
      const data = await fetchJson("/api/research/status", { signal, timeoutMs: 3000 });
      return { enabled: G0.isObject(data) && data.enabled === true, provider: G0.isObject(data) && typeof data.provider === "string" ? data.provider : "Public-record research" };
    } catch { signal.throwIfAborted(); return { enabled: false, provider: "Public-record research" }; }
  }
  const normalName = value => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  function sameSite(value, website) {
    try { const host = new URL(value).hostname.replace(/^www\./, ""), official = new URL(website).hostname.replace(/^www\./, ""); return host === official || host.endsWith(`.${official}`); } catch { return false; }
  }
  const monthsBefore = G0.withinCalendarMonths;

  async function lookupOrganizations(name, signal) {
    const url = apiUrl("https://en.wikipedia.org/w/api.php", { action: "query", generator: "search", gsrsearch: name, gsrnamespace: "0", gsrlimit: "4", prop: "pageprops|extracts|info", exintro: "1", explaintext: "1", exsentences: "3", exlimit: "max", inprop: "url", formatversion: "2" });
    const result = await fetchJson(url, { signal });
    if (!G0.isObject(result) || (result.query && !Array.isArray(result.query.pages))) throw new Error("The public directory returned an unexpected response. Try again or use a manual audit.");
    const pages = ((result.query && result.query.pages) || []).filter(page => page.pageprops && page.pageprops.wikibase_item && page.pageprops.disambiguation === undefined).sort((a, b) => (a.index || 0) - (b.index || 0));
    if (!pages.length) return [];
    const entityResponse = await fetchJson(apiUrl("https://www.wikidata.org/w/api.php", { action: "wbgetentities", ids: pages.map(p => p.pageprops.wikibase_item).join("|"), props: "labels|descriptions|claims", languages: "en" }), { signal });
    if (!G0.isObject(entityResponse) || !G0.isObject(entityResponse.entities)) throw new Error("The public identity record could not be retrieved. Please try again.");
    const entities = entityResponse.entities;
    return pages.map(page => {
      const identifier = page.pageprops.wikibase_item;
      const entity = entities[identifier] || {};
      const websites = ((entity.claims && entity.claims.P856) || []).filter(claim => claim.rank !== "deprecated" && !(claim.qualifiers && claim.qualifiers.P582)).sort((a, b) => Number(b.rank === "preferred") - Number(a.rank === "preferred"));
      const website = websites.map(claim => claim.mainsnak && claim.mainsnak.datavalue && claim.mainsnak.datavalue.value).find(v => typeof v === "string" && G0.safePublicUrl(v)) || "";
      return { name: (entity.labels && entity.labels.en && entity.labels.en.value) || page.title, identifier, website, description: page.extract || (entity.descriptions && entity.descriptions.en && entity.descriptions.en.value) || "Public identity record; operational behavior is not yet assessed.", articleUrl: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`, pageId: page.pageid };
    }).filter(org => !!org.website || /(organization|organisation|corporation|company|agency|bank|institution|foundation|government|association|university|nonprofit)/i.test(org.description));
  }

  function publicationDate(data) {
    const textValue = data.content || "";
    const dateLine = textValue.slice(0, 5000).match(/(?:effective(?:\s+date)?|last\s+updated|updated\s+on|published(?:\s+on)?)[\s:*#–-]{0,16}((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i);
    const metadata = data.metadata || {};
    const value = (dateLine && dateLine[1]) || data.publishedTime || metadata["article:published_time"] || metadata["datePublished"];
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
    return G0.artifactDate(value);
  }
  const stripMarkdown = value => value.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_#`]/g, "").replace(/\s+/g, " ").trim();

  async function readPublicPage(url, website, signal) {
    if (!G0.safePublicUrl(url)) throw new Error("This source URL is not safe to retrieve.");
    const result = await fetchJson(`https://r.jina.ai/${url}`, { signal, timeoutMs: 22000 });
    if (!G0.isObject(result) || !G0.isObject(result.data)) throw new Error("The public page reader returned an unexpected response.");
    const data = result.data;
    if ((typeof data.httpStatus === "number" && data.httpStatus >= 400) || typeof data.content !== "string" || data.content.trim().length < 80) throw new Error("This page returned no usable public content.");
    const requestedArchive = G0.parseArchiveUrl(url);
    const returnedUrl = G0.safePublicUrl(data.url) ? data.url : url;
    const returnedArchive = G0.parseArchiveUrl(returnedUrl);
    if (requestedArchive && !G0.sameResource((returnedArchive && returnedArchive.original) || returnedUrl, requestedArchive.original)) throw new Error("The archive reader returned a different page; this capture was not used as evidence.");
    const finalUrl = requestedArchive ? url : returnedUrl;
    const original = (requestedArchive && requestedArchive.original) || (returnedArchive && returnedArchive.original) || finalUrl;
    const out = { title: data.title || new URL(original).hostname, url: finalUrl, content: data.content.slice(0, 90000), published: publicationDate(data), official: sameSite(original, website) };
    if (requestedArchive) { out.archived = requestedArchive.captured; out.liveUrl = original; }
    return out;
  }
  /* Discovery uses live links; historical scoring uses a verified
     capture, even if the reader reports the original URL. */
  async function readWithArchive(url, website, cutoff, signal) {
    let live = null; let liveError;
    try { live = await readPublicPage(url, website, signal); } catch (error) { signal.throwIfAborted(); liveError = error; }
    const historical = cutoff < G0.today();
    if (live && live.published && G0.beforeCutoff(live.published, cutoff) && !historical) return { ...live, archiveStatus: "not-needed", scoringEligible: true, dateBasis: "publication", liveContent: live.content };
    const lookup = await lookupArchivedSnapshot(url, cutoff, signal);
    if (lookup.snapshot) {
      try {
        const archived = await readPublicPage(lookup.snapshot.url, website, signal);
        return { ...archived, url: lookup.snapshot.url, title: (live && live.title) || archived.title, archived: lookup.snapshot.captured, liveUrl: url, liveContent: live ? live.content : undefined, archiveStatus: "found", scoringEligible: !archived.published || G0.beforeCutoff(archived.published, cutoff), dateBasis: archived.published ? "publication" : "archive-capture" };
      } catch (error) { signal.throwIfAborted(); liveError = error; }
    }
    if (live) return { ...live, archiveStatus: lookup.status === "unavailable" ? "unavailable" : "no-match", scoringEligible: !historical && !!live.published && G0.beforeCutoff(live.published, cutoff), dateBasis: live.published ? "publication" : "unknown" };
    signal.throwIfAborted();
    throw liveError instanceof Error ? liveError : new Error("This page could not be read.");
  }

  function policyLinks(content, website) {
    const links = [];
    for (const match of content.matchAll(/\[([^\]]{1,100})\]\(([^)\s]+)\)/g)) {
      const label = match[1]; let url;
      try { url = new URL(match[2], website).href.split("#")[0]; const archivedLink = G0.parseArchiveUrl(url); if (archivedLink) url = archivedLink.original; } catch { continue; }
      if (!G0.safePublicUrl(url) || !sameSite(url, website) || /\.(png|jpg|svg|mp4|pdf)(?:\?|$)/i.test(url)) continue;
      const score = /terms(?:\s+of\s+(?:use|service))?|conditions|appeal|governance|charter|enforcement|constitution|transparency|accountability|bylaws|oversight/i.test(label) ? 3 : /polic(?:y|ies)|safety|usage|acceptable|compliance|report/i.test(label) ? 2 : 0;
      if (score) links.push({ url, score });
    }
    return links.sort((a, b) => b.score - a.score).filter((entry, i, all) => all.findIndex(e => e.url === entry.url) === i).map(e => e.url).slice(0, 6);
  }

  /* ──────────────────────────────────────────────────────────────
     Signal rules — score only operative SOURCE wording about this
     entity's action, never the app's reading instructions.
     ────────────────────────────────────────────────────────────── */
  const behaviorRules = [
    [{ value: true, expression: /(?:we|the (?:company|institution|organization))\s+(?:may|will|can|reserve the right to)\s+(?:suspend|terminate|restrict|revoke|withdraw|disable|ban)[^.!?\n]{10,500}(?:violation|violat|breach|non.compliance|comply)/i }, { value: true, expression: /(?:violation|breach|non.compliance)[^.!?\n]{10,350}(?:penalt|suspend|suspension|terminat|revok|revocation|fine|fined|ban(?:ned)?|disqualif)/i }],
    [{ value: true, expression: /(?:recommendations|decisions|guidance|participation)[^.!?\n]{0,100}(?:non.binding|voluntary|advisory only)/i }, { value: false, expression: /(?:failure to comply|violat(?:ion|ing)|breach)[^.!?\n]{0,250}(?:penalt|suspend|suspension|terminat|revok|revocation|fine|fined|ban(?:ned)?|disqualif)/i }],
    [{ value: true, expression: /(?:accounts?|licenses?|access|funding)\s+(?:was|were|has been|have been)\s+(?:suspended|revoked|restricted|withdrawn|terminated)[^.!?\n]{0,300}(?:violation|breach|policy|non.compliance)/i }, { value: true, expression: /(?:in accordance with|under|pursuant to)\s+[^.!?\n]{0,100}(?:policy|directive|rule)[^.!?\n]{0,200}(?:was|were|has been|have been)\s+(?:enforced|implemented|blocked|restricted|revoked)/i }],
    [{ value: true, expression: /(?:appeal|refusal)[^.!?\n]{0,130}(?:automatically stays|automatically suspends|must halt|shall halt)[^.!?\n]{0,130}/i, basis: "TERMINAL_RULE" }],
    [{ value: true, expression: /(?:rules|polic(?:y|ies)|decisions|these terms)[^.!?\n]{0,160}(?:remain|continue)[^.!?\n]{0,80}(?:until (?:repealed|revoked|terminated|changed|amended)|unless (?:repealed|revoked|changed))/i }, { value: false, expression: /(?:rules|polic(?:y|ies)|decisions|authority)[^.!?\n]{0,160}(?:automatically expir|sunset clause|must be renewed|require(?:s)? periodic renewal)/i }]
  ];
  const constraintRules = [[], [], [{ value: true, expression: /(?:decisions|polic(?:y|ies)|authority|rules)[^.!?\n]{0,160}(?:automatically expir|sunset clause|must be renewed|require(?:s)? periodic renewal)/i }], []];
  function quoteMatch(doc, rules) {
    const plain = stripMarkdown(doc.content);
    for (const rule of rules) { const match = rule.expression.exec(plain); if (match) return { quote: match[0].slice(0, 600), rule }; }
    return null;
  }
  function recordSource(record) {
    return { id: record.id, title: record.title, url: record.url, published: record.published, retrieved: record.retrieved, excerpt: record.excerpt, codes: [...record.codes], kind: record.kind, dateBasis: record.kind === "news" ? "indexed" : record.published ? "publication" : "unknown" };
  }

  function preparePublicInput(organization, documents, registryRecords, version, cutoff) {
    const input = G0.newInput(version);
    input.name = organization.name; input.identifier = organization.identifier; input.cutoff = cutoff;
    const candidates = [
      ...documents.map((doc, i) => {
        const source = { id: `SITE-${i + 1}`, title: doc.archived ? `${doc.title} (archived ${doc.archived})` : doc.title, url: doc.url, published: doc.published, retrieved: new Date().toISOString(), excerpt: stripMarkdown(doc.content).slice(0, 650), codes: [], kind: doc.archived ? "archive" : doc.official ? "official" : "context", dateBasis: doc.dateBasis || (doc.published ? "publication" : doc.archived ? "archive-capture" : "unknown") };
        if (doc.archived) { source.capturedAt = doc.archived; source.originalUrl = doc.liveUrl; }
        return source;
      }),
      ...registryRecords.map(recordSource)
    ];
    const sources = candidates.filter((source, i, all) => G0.safePublicUrl(source.url) && all.findIndex(s => G0.canonicalUrl(s.url) === G0.canonicalUrl(source.url)) === i);
    const officialCount = documents.filter(d => d.official).length;
    const gap = (code, extra = "") => `Searched ${officialCount} official page${officialCount === 1 ? "" : "s"} plus court, regulatory, legislative, news, and archive indexes for ${organization.name} through ${cutoff}. No dated qualifying ${code} artifact was matched.${extra} This is a coverage gap, not proof of a negative.`;
    const answer = (code, rules) => {
      for (const doc of documents) {
        if (!doc.official || doc.scoringEligible === false) continue;
        const match = quoteMatch(doc, rules);
        if (!match) continue;
        const source = sources.find(s => s.url === doc.url);
        const evidenceDate = doc.published || doc.archived;
        if (!source || !evidenceDate || !G0.beforeCutoff(evidenceDate, cutoff)) continue;
        source.codes = Array.from(new Set([...source.codes, code])); source.excerpt = match.quote;
        if (code === "B4" && match.rule.basis) input.b4 = { ...input.b4, actor: "Affected party named by the cited appeal rule — review required", action: "The action specified in the cited operative rule — review required", procedure: match.quote, basis: match.rule.basis };
        return { value: match.rule.value, source: doc.url, date: evidenceDate, notes: match.quote, gap: match.rule.value ? "" : "Contrary artifact located; inspect scope before accepting this suggested NO." };
      }
      return { value: false, source: "", date: "", notes: "", gap: gap(code) };
    };
    input.answers = behaviorRules.map((rules, i) => answer(`B${i + 1}`, rules));
    input.constraints = constraintRules.map((rules, i) => answer(`C${i + 1}`, rules));

    // Score only operative SOURCE wording about this entity's action.
    const authorityRecords = registryRecords.filter(r => ["court", "regulatory"].includes(r.kind) && r.named && r.published && G0.beforeCutoff(r.published, cutoff));
    const overrides = authorityRecords.flatMap(record => { const quote = externalOverrideQuote(record, organization.name); return quote ? [{ record, quote }] : []; });
    const c1 = overrides.find(({ record }) => monthsBefore(record.published, cutoff, 24));
    const c4 = overrides.find(({ record }) => monthsBefore(record.published, cutoff, 12));
    for (const [index, override] of [[0, c1], [3, c4]]) {
      if (!override) { input.constraints[index].gap = `${gap(`C${index + 1}`)} No operative source quotation demonstrates an external override within ${index === 0 ? 24 : 12} months. Captions, filing dates, requests, denials, and app-written guidance are not relief.`; continue; }
      const { record, quote } = override;
      const source = sources.find(s => G0.canonicalUrl(s.url) === G0.canonicalUrl(record.url));
      if (source) source.codes = Array.from(new Set([...source.codes, `C${index + 1}`]));
      input.constraints[index] = { value: true, source: record.url, date: record.published, notes: quote, gap: "" };
    }
    input.constraints[1].gap = `${gap("C2")} A complete published appeal outcome set, numerator, denominator, and at least 50% relief were not demonstrated.`;
    const authority = c1 ? c1.record : authorityRecords[0];
    if (authority) input.external = { exists: true, exercised: overrides.some(o => o.record.url === authority.url), holder: authority.authority, scope: authority.title, source: authority.url, date: authority.published };

    input.automation = { method: "public-lookup", provider: "Wikimedia, official site, Wayback, CourtListener, Federal Register, GovTrack, GDELT", reviewRequired: true, requestedName: organization.name, generatedAt: new Date().toISOString(), sources };
    return { input, sources };
  }

  /* ──────────────────────────────────────────────────────────────
     Optional hosted research (same-origin /api/research)
     ────────────────────────────────────────────────────────────── */
  function sanitizeAnswer(value, sources, cutoff, code) {
    const source = value && typeof value.source === "string" ? sources.find(s => G0.canonicalUrl(s.url) === G0.canonicalUrl(value.source)) : undefined;
    const notes = value && typeof value.notes === "string" ? value.notes.slice(0, 1200) : "";
    const date = value && typeof value.date === "string" ? value.date.slice(0, 10) : "";
    const valid = !!source && source.kind !== "news" && source.dateBasis !== "indexed" && G0.safePublicUrl(source.url) && G0.beforeCutoff(date, cutoff) && date === (source.published || source.capturedAt) && notes.trim().length >= 10;
    if (!valid) return { value: false, source: "", date: "", notes: "", gap: `${code}: The hosted research did not return a qualifying, dated, consulted source. Unsupported is scored NO, not a proven negative.` };
    source.codes = Array.from(new Set([...(source.codes || []), code]));
    return { value: value.value === true, source: source.url, date, notes, gap: typeof value.gap === "string" ? value.gap.slice(0, 1200) : "" };
  }
  function safeRecord(defaults, incoming) {
    const result = { ...defaults };
    if (!incoming || typeof incoming !== "object") return result;
    for (const key of Object.keys(defaults)) {
      if (typeof incoming[key] === typeof defaults[key]) result[key] = typeof incoming[key] === "string" ? String(incoming[key]).slice(0, 1600) : incoming[key];
    }
    return result;
  }
  async function hostedResearch(name, version, cutoff, signal, onProgress) {
    onProgress({ step: 2, message: "Researching policies, court records, regulators, and news coverage…", completed: 2, total: 5 });
    const data = await fetchJson("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, version, cutoff }), signal, timeoutMs: 180000 });
    if (!G0.isObject(data) || !(data.organization && typeof data.organization.name === "string") || !Array.isArray(data.answers) || data.answers.length !== 5 || !Array.isArray(data.constraints) || data.constraints.length !== 4 || !Array.isArray(data.sources)) throw new Error("The research service returned an incomplete record. No audit was saved.");
    const organization = { name: data.organization.name.slice(0, 200), identifier: (data.organization.identifier || "").slice(0, 100), description: (data.organization.description || "").slice(0, 1500), website: G0.safePublicUrl(data.organization.website || "") ? data.organization.website : "", articleUrl: "", pageId: 0 };
    const sources = data.sources.filter(s => G0.isObject(s) && G0.safePublicUrl(s.url) && typeof s.title === "string").slice(0, 20).map((s, i) => ({ id: `WEB-${i + 1}`, title: s.title.slice(0, 200), url: s.url, published: G0.artifactDate(s.published), retrieved: new Date().toISOString(), excerpt: typeof s.excerpt === "string" ? s.excerpt.slice(0, 1500) : "", codes: [], kind: ["official", "court", "regulatory", "legislative", "news", "archive", "context", "public"].includes(s.kind) ? s.kind : "context", dateBasis: s.kind === "news" ? "indexed" : "publication" }));
    const input = G0.newInput(version);
    input.name = organization.name; input.identifier = organization.identifier; input.cutoff = cutoff;
    input.answers = data.answers.map((a, i) => sanitizeAnswer(a, sources, cutoff, `B${i + 1}`));
    input.constraints = data.constraints.map((a, i) => sanitizeAnswer(a, sources, cutoff, `C${i + 1}`));
    input.b4 = safeRecord(input.b4, data.b4); input.c2 = safeRecord(input.c2, data.c2); input.external = safeRecord(input.external, data.external);
    input.automation = { method: "web-research", provider: data.provider || "Hosted web research", requestedName: name, generatedAt: new Date().toISOString(), reviewRequired: true, sources };
    return { organization, input, sources, warnings: (Array.isArray(data.warnings) ? data.warnings : []).filter(w => typeof w === "string").slice(0, 10) };
  }

  /* ──────────────────────────────────────────────────────────────
     The automatic audit
     ────────────────────────────────────────────────────────────── */
  async function automaticAudit({ name, version, cutoff, existing, signal, onProgress, selection, availability }) {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 160) throw new Error("Enter an organization name between 2 and 160 characters.");
    if (!G0.isCalendarDate(cutoff)) throw new Error("Choose a valid inclusive evidence cutoff.");
    let progressStep = 0; const callback = onProgress;
    onProgress = progress => { signal.throwIfAborted(); progressStep = Math.max(progressStep, progress.step); callback({ ...progress, step: progressStep, completed: Math.max(progressStep, progress.completed) }); };
    onProgress({ step: 0, message: "Looking for the organization’s public identity…", completed: 0, total: 5 });
    const service = availability || await researchAvailability(signal);
    let organization; let input; let sources; const warnings = []; const coverage = [];
    let method = "public-lookup";
    if (service.enabled && !selection) {
      const result = await hostedResearch(trimmed, version, cutoff, signal, onProgress);
      organization = result.organization; input = result.input; sources = result.sources; warnings.push(...result.warnings); method = "web-research";
      coverage.push({ registry: "Hosted web research", scope: "Model-directed search across public web, court, regulatory, and news sources", source: input.automation.provider, found: sources.length, mentions: 0, status: sources.length ? "searched" : "no-match" });
    } else {
      const candidates = selection ? [selection] : await lookupOrganizations(trimmed, signal);
      if (!candidates.length) throw new Error("No organization with a usable public identity was found. Try its full name or add its country. Nothing has been classified or saved.");
      const exact = candidates.filter(c => normalName(c.name) === normalName(trimmed));
      if (!selection && exact.length !== 1 && candidates.length > 1) throw new OrganizationChoiceError(candidates);
      organization = selection || exact[0] || candidates[0];
      onProgress({ step: 1, message: `Found ${organization.name}. Reading its official site and archived captures…`, completed: 1, total: 5 });
      const documents = [{ title: `${organization.name} — public identity`, url: organization.articleUrl, content: organization.description, published: null, official: false }];
      const registryNames = [];
      const registryPromise = searchPublicRegistries(organization.name, cutoff, signal, registry => { registryNames.push(registryLabels[registry].label.toLowerCase()); onProgress({ step: 3, message: `Searched ${registryNames.join(", ")}…`, completed: 3, total: 5 }); }).catch(() => { signal.throwIfAborted(); return { records: [], gaps: ["Public registries could not be searched for this run."], consulted: [], outcomes: ["courts", "regulatory", "legislative", "news"].map(registry => ({ registry, status: "unavailable" })) }; });
      if (organization.website) {
        try {
          const home = await readWithArchive(organization.website, organization.website, cutoff, signal); documents.push(home);
          const links = policyLinks(home.liveContent || home.content, organization.website).filter(url => !G0.sameResource(url, organization.website));
          onProgress({ step: 2, message: `Reading ${links.length} policy page${links.length === 1 ? "" : "s"}, then searching court, regulatory, legislative, and news records…`, completed: 2, total: 5 });
          const retrieved = await Promise.allSettled(links.map(url => readWithArchive(url, organization.website, cutoff, signal)));
          for (const result of retrieved) { signal.throwIfAborted(); if (result.status === "fulfilled") { if (!documents.some(d => G0.canonicalUrl(d.url) === G0.canonicalUrl(result.value.url))) documents.push(result.value); } else warnings.push(result.reason instanceof Error ? result.reason.message : "A linked policy page was unavailable."); }
          if (!links.length) warnings.push("No terms, governance, or appeal pages were discoverable among the homepage links. The lookup follows homepage links; it does not crawl the entire website.");
        } catch (error) { signal.throwIfAborted(); warnings.push(error instanceof Error ? error.message : "The official website could not be read."); }
      } else warnings.push("No current official website was available in the public identity record.");
      onProgress({ step: 3, message: "Matching court, regulatory, legislative, and news records to this organization…", completed: 3, total: 5 });
      const registries = await registryPromise;
      signal.throwIfAborted();
      const documented = documents.filter(d => d.official).length;
      const archivedCount = documents.filter(d => d.archived).length;
      coverage.push({ registry: "Official pages", scope: "Homepage and linked policy, governance, and appeal pages", source: organization.website ? new URL(organization.website).hostname : "No listed website", found: documented, mentions: 0, status: documented ? "searched" : "unavailable" });
      const archiveAttempts = documents.filter(d => d.official && d.archiveStatus && d.archiveStatus !== "not-needed");
      const archiveFailures = archiveAttempts.filter(d => d.archiveStatus === "unavailable").length;
      coverage.push({ registry: registryLabels.archive.label, scope: registryLabels.archive.scope, source: registryLabels.archive.source, found: archivedCount, mentions: 0, status: archiveFailures ? (archivedCount ? "partial" : "unavailable") : archivedCount ? "searched" : archiveAttempts.length ? "no-match" : documented ? "not-needed" : "not-searched" });
      for (const registry of ["courts", "regulatory", "legislative", "news"]) {
        const prefix = { courts: "COURT", regulatory: "REG", legislative: "LEG", news: "NEWS" }[registry];
        const matched = registries.records.filter(record => record.id.startsWith(prefix));
        const found = matched.filter(record => record.named).length;
        const mentions = matched.length - found;
        const outcome = (registries.outcomes || []).find(o => o.registry === registry);
        coverage.push({ ...registryLabels[registry], registry: registryLabels[registry].label, found, mentions, status: (outcome && outcome.status) || "unavailable" });
      }
      const prepared = preparePublicInput(organization, documents, registries.records, version, cutoff);
      input = prepared.input; sources = prepared.sources;
      warnings.push(...registries.gaps);
      warnings.push("Court, regulatory, and legislative coverage is US-focused (CourtListener, Federal Register, GovTrack). Other jurisdictions, state and local bodies, sealed matters, and paywalled reporting are not indexed here.");
      if (archivedCount) warnings.push(`${archivedCount} page${archivedCount === 1 ? " was" : "s were"} read from an Internet Archive capture taken on or before the cutoff, so live text is not mistaken for the version in force then.`);
      if (documents.some(d => d.official && d.scoringEligible === false)) warnings.push("Some official pages lack a qualifying date or a readable capture for this historical cutoff. They are retained as context, not credited as operative evidence.");
      warnings.push("News results are recorded as dated leads only. They are never scored as operative evidence; open the primary court, regulatory, or policy artifact to score a question.");
    }
    signal.throwIfAborted();
    onProgress({ step: 4, message: "Applying the versioned phase rules and filling the working badge…", completed: 4, total: 5 });
    input.automation.coverage = coverage; input.automation.warnings = Array.from(new Set(warnings));
    const record = await G0.createAudit(input, existing);
    signal.throwIfAborted();
    attachResearchSources(record, input.automation, coverage);
    onProgress({ step: 5, message: "Your research draft is ready. Review is required; the formal badge stays unissued.", completed: 5, total: 5 });
    return { organization, input, record, sources, warnings: Array.from(new Set(warnings)), coverage, method, completedAt: new Date().toISOString() };
  }

  function attachResearchSources(record, metadata, coverage) {
    for (const source of metadata.sources) {
      if (record.evidence.some(e => e.url === source.url)) continue;
      record.evidence.push({ id: `${record.id}-${source.id}`, title: source.title, url: source.url, published: source.published || "", retrieved: source.retrieved.slice(0, 10), claim: source.excerpt || "Source retrieved for context only; no qualifying operational claim extracted.", codes: [source.kind === "news" ? "NEWS LEAD — NEVER SCORED" : "RESEARCH CONTEXT — UNSCORED"], entity: record.name });
    }
    record.report.Evidence_Summary = record.evidence;
    record.report.Research_Sources = metadata.sources.map(source => ({ ...source, Cutoff_Status: source.published ? (G0.beforeCutoff(source.published, record.cutoff) ? "DATED BEFORE CUTOFF — CLAIM REVIEW REQUIRED" : "AFTER CUTOFF — NOT SCORED") : "DATE NOT DEMONSTRATED — NOT SCORED" }));
    record.report.Automation = JSON.parse(JSON.stringify(metadata));
    record.report.Research_Limits = metadata.warnings || [];
    if (coverage) record.report.Registry_Coverage = coverage;
  }

  function plainResearchSummary(result) {
    const badge = result.record.workingBadge;
    return [
      `GROUND-0 AUTOMATIC RESEARCH DRAFT — ${result.organization.name}`,
      `Version: v${result.input.version}${result.input.version === "1.1" ? " (unratified amendment draft)" : " (normative baseline)"}`,
      `Evidence cutoff: ${result.input.cutoff} (inclusive, UTC)`,
      `Working badge: ${badge.label} — ${badge.filled} of 5 questions evidenced. ${badge.explanation}`,
      `Formal badge status: ${result.record.badge}. Provisional phase: ${result.record.phase}. Confidence: ${result.record.confidence}. Human review required.`,
      "", result.record.finding, "",
      "SOURCES SEARCHED",
      ...result.coverage.map(entry => `${entry.registry}: ${entry.status === "unavailable" ? "unavailable this run" : `${entry.found} matching record(s)`} — ${entry.scope} (${entry.source})`),
      "",
      ...G0.questions.map((q, i) => `${q.code}: ${q.title}\nSuggested score: ${result.input.answers[i].value ? "YES" : "NO / not demonstrated"}\n${result.input.answers[i].notes || result.input.answers[i].gap}\n${result.input.answers[i].source || "No qualifying dated citation"}`),
      "", "RETRIEVED SOURCES (not all sources qualify for scoring)",
      ...result.sources.map(s => `[${s.kind.toUpperCase()}] ${s.title}\n${s.url}\nPublished/effective: ${s.published || "not demonstrated"}\nRetrieved: ${s.retrieved}\n${s.excerpt}`),
      "", "LIMITATIONS", ...result.warnings
    ].join("\n\n");
  }

  return {
    HttpError, OrganizationChoiceError, registryLabels, mentionsEntity, externalOverrideQuote,
    searchPublicRegistries, lookupArchivedSnapshot, lookupOrganizations, researchAvailability,
    automaticAudit, attachResearchSources, plainResearchSummary, fetchJson, policyLinks
  };
})();
