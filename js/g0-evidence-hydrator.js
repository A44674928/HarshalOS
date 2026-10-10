/* Ground-0 evidence acquisition repair
 *
 * Research deliberately returns bounded public-record material. This small
 * post-research pass repairs the specific case where a usable source URL was
 * found but the stored record contains only a short excerpt. It never asks a
 * model to discover a URL, never broadens the source set, and never changes a
 * finding from UNKNOWN to YES/NO. It only replaces a thin stored text field
 * with a longer text returned by the same cutoff-aware public reader.
 */
"use strict";

(() => {
  const R = window.G0Research;
  const G0 = window.G0;
  if (!R || !G0 || typeof R.automaticAudit !== "function" || typeof R.readWithArchive !== "function") return;

  const originalAutomaticAudit = R.automaticAudit;
  const MAX_HYDRATIONS = 8;
  const CONCURRENCY = 2;
  const MIN_SUBSTANTIVE_CHARS = 400;

  const isObject = value => value && typeof value === "object" && !Array.isArray(value);
  const textLength = value => typeof value === "string" ? value.trim().length : 0;
  const isLead = source => source && (source.kind === "news" || source.scoreable === false && !["court", "regulatory"].includes(source.kind));

  function shouldHydrate(source) {
    if (!isObject(source) || !source.url || typeof source.url !== "string") return false;
    if (!G0.safePublicUrl(source.url) || isLead(source)) return false;
    return textLength(source.text) < MIN_SUBSTANTIVE_CHARS;
  }

  function coverage(sources, hydration) {
    const rows = Array.isArray(sources) ? sources : [];
    const substantive = rows.filter(source => textLength(source.text) >= MIN_SUBSTANTIVE_CHARS);
    const dated = rows.filter(source => typeof source.published === "string" || typeof source.capturedAt === "string");
    const qualifying = rows.filter(source => source.scoringEligible !== false && (typeof source.published === "string" || typeof source.capturedAt === "string"));
    return {
      recordsSupplied: rows.length,
      substantiveRecords: substantive.length,
      excerptOnlyRecords: rows.filter(source => textLength(source.text) < 60).length,
      shortRecords: rows.filter(source => textLength(source.text) >= 60 && textLength(source.text) < MIN_SUBSTANTIVE_CHARS).length,
      datedRecords: dated.length,
      qualifyingDatedRecords: qualifying.length,
      hydrationEligible: hydration.attempted,
      hydrationSucceeded: hydration.succeeded,
      hydrationFailed: hydration.failed,
      hydrationSkipped: hydration.skipped,
      primaryEvidenceStatus: substantive.length ? "available" : "insufficient"
    };
  }

  async function hydrateSources(sources, website, cutoff, signal) {
    const rows = Array.isArray(sources) ? sources : [];
    const candidates = rows.filter(shouldHydrate).slice(0, MAX_HYDRATIONS);
    const hydration = { attempted: candidates.length, succeeded: 0, failed: 0, skipped: Math.max(0, rows.filter(shouldHydrate).length - candidates.length), details: [] };
    let cursor = 0;

    async function worker() {
      while (cursor < candidates.length) {
        const source = candidates[cursor++];
        signal?.throwIfAborted?.();
        try {
          const page = await R.readWithArchive(source.url, website || "", cutoff, signal);
          const content = typeof page?.content === "string" ? page.content.trim() : "";
          if (content.length <= textLength(source.text)) {
            hydration.failed++;
            hydration.details.push({ id: source.id || "", status: "no-improvement" });
            continue;
          }
          if (page?.scoringEligible === false) {
            hydration.failed++;
            hydration.details.push({ id: source.id || "", status: "not-scoring-eligible" });
            continue;
          }
          source.text = content;
          if (page.title) source.title = page.title;
          if (page.published && !source.published) source.published = page.published;
          if (page.capturedAt && !source.capturedAt) source.capturedAt = page.capturedAt;
          if (page.dateBasis && !source.dateBasis) source.dateBasis = page.dateBasis;
          if (page.scoringEligible === true) source.scoringEligible = true;
          hydration.succeeded++;
          hydration.details.push({ id: source.id || "", status: "hydrated", chars: content.length });
        } catch (error) {
          signal?.throwIfAborted?.();
          hydration.failed++;
          hydration.details.push({ id: source.id || "", status: "failed", reason: error instanceof Error ? error.message.slice(0, 180) : "reader failure" });
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, candidates.length) }, () => worker()));
    return hydration;
  }

  function attach(result, sources, hydration) {
    const evidenceCoverage = coverage(sources, hydration);
    const note = evidenceCoverage.primaryEvidenceStatus === "insufficient"
      ? "Primary evidence coverage remains insufficient after bounded hydration; the model must keep unsupported questions UNKNOWN."
      : `Evidence acquisition: ${evidenceCoverage.substantiveRecords} substantive stored record(s); ${evidenceCoverage.hydrationSucceeded} thin record(s) were hydrated from their existing source URLs before model reading.`;

    for (const host of [result?.record?.automation, result?.input?.automation, result?.automation]) {
      if (!isObject(host)) continue;
      host.evidenceCoverage = evidenceCoverage;
      host.evidenceAcquisition = { method: "bounded-primary-source-hydration", maxHydrations: MAX_HYDRATIONS, details: hydration.details.slice(0, MAX_HYDRATIONS) };
      host.coverageNote = [typeof host.coverageNote === "string" ? host.coverageNote.trim() : "", note].filter(Boolean).join(" ").slice(0, 1200);
      if (Array.isArray(host.sources)) host.sources = sources;
    }
    return result;
  }

  R.automaticAudit = async options => {
    const result = await originalAutomaticAudit(options);
    const automation = result?.record?.automation || result?.input?.automation || result?.automation;
    const sources = Array.isArray(automation?.sources) ? automation.sources : [];
    if (!sources.length) return result;
    const hydration = await hydrateSources(sources, result?.organization?.website || options?.selection?.website || "", options?.cutoff || "", options?.signal);
    return attach(result, sources, hydration);
  };
})();
