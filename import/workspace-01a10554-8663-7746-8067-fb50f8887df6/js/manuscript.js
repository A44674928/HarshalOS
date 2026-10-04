/* ═══════════════════════════════════════════════════════════════
   HarshalOS — manuscript reader
   Plaintext chapters → a chapter-by-chapter reading view.

   The reader consumes only the generated index
   (manuscript/manifest.json) and the plain .txt/.md files it names.
   It never evaluates manuscript content: every chapter is escaped
   before it reaches the DOM, so a manuscript can contain markup and
   still be read rather than applied.

   Exposed as window.ManuscriptReader. Pure helpers
   (parseChapter / titleFromFileName) are exported for the test
   harness; no DOM or network work happens at load time.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

const ManuscriptReader = (() => {

  const MANIFEST_URL = "manuscript/manifest.json";
  const MANIFEST_SCHEMA = "harshalos-manuscript-v1";
  const POSITION_KEY = "harshalos.manuscript.position.v1";
  const VISITED_KEY = "harshalos.manuscript.visited.v1";
  const FONT_KEY = "harshalos.manuscript.fontstep.v1";
  const FONT_STEPS = ["0.98rem", "1.08rem", "1.2rem", "1.34rem", "1.5rem"];
  const WORDS_PER_MINUTE = 230;
  const SCENE_BREAK = /^([-*_#]\s*){3,}$/;

  /* ── pure helpers ───────────────────────────────────────────── */

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Emphasis only. Escaped first, so no markup from the file can execute. */
  function inlineHtml(text) {
    return escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  }

  /* Fallback title when a chapter is rendered without an index title.
     Mirrors titleFromFileName in scripts/manuscript-index.mjs. */
  function titleFromFileName(name) {
    const base = String(name || "").replace(/\.(txt|md)$/i, "");
    const withoutOrder = base.replace(/^(\d{1,4})[\s._-]+/, "");
    const words = withoutOrder.replace(/_+/g, " ").replace(/-+/g, " ").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return base;
    const authored = /[A-Z]/.test(withoutOrder);
    return words.map((word, index) => {
      if (authored && index > 0) return word;
      return word[0].toUpperCase() + word.slice(1);
    }).join(" ");
  }

  function countWords(text) {
    const matches = String(text == null ? "" : text).match(/\S+/g);
    return matches ? matches.length : 0;
  }

  function readingMinutes(words) {
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  }

  function formatWords(words) {
    return Number(words || 0).toLocaleString("en-US");
  }

  /**
   * Parse one plaintext chapter.
   *   "# Title"        → chapter title (first non-blank line only)
   *   blank line       → new paragraph (single line breaks are joined)
   *   --- *** # # #    → scene break
   *   ## / ###         → section heading
   *   "> "             → quotation block
   *   *italic* **bold**
   * Returns { title, blocks }, where each block is
   * { type: "p" | "heading" | "quote" | "break", text? }.
   */
  function parseChapter(text) {
    const source = String(text == null ? "" : text).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const lines = source.split("\n");
    const blocks = [];
    let title = null;
    let seenContent = false;
    let paragraph = [];

    const flush = () => {
      if (!paragraph.length) return;
      blocks.push({ type: "p", text: paragraph.join(" ") });
      paragraph = [];
    };

    for (const raw of lines) {
      const trimmed = raw.replace(/\s+$/, "").trim();

      if (!trimmed) { flush(); continue; }

      if (!seenContent) {
        seenContent = true;
        const heading = trimmed.match(/^#\s+(.+)$/);
        if (heading) { title = heading[1].trim(); continue; }
      }

      if (SCENE_BREAK.test(trimmed)) { flush(); blocks.push({ type: "break" }); continue; }

      const section = trimmed.match(/^#{2,3}\s+(.+)$/);
      if (section) { flush(); blocks.push({ type: "heading", text: section[1].trim() }); continue; }

      if (/^>\s?/.test(trimmed)) { flush(); blocks.push({ type: "quote", text: trimmed.replace(/^>\s?/, "") }); continue; }

      paragraph.push(trimmed);
    }
    flush();

    return { title, blocks, words: countWords(source) };
  }

  function blocksHtml(blocks) {
    return blocks.map(block => {
      if (block.type === "break") return `<div class="ms-break" role="separator" aria-label="Scene break">· · ·</div>`;
      if (block.type === "heading") return `<h3 class="ms-h3">${inlineHtml(block.text)}</h3>`;
      if (block.type === "quote") return `<blockquote class="ms-quote">${inlineHtml(block.text)}</blockquote>`;
      return `<p class="ms-p">${inlineHtml(block.text)}</p>`;
    }).join("");
  }

  /* ── browser storage (best effort; never required) ──────────── */

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch { /* private mode: reading still works */ }
  }
  function readJson(key, fallback) {
    const raw = storageGet(key);
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch { return fallback; }
  }
  function readFontStep() {
    const step = Number(storageGet(FONT_KEY));
    return Number.isInteger(step) && step >= 0 && step < FONT_STEPS.length ? step : 1;
  }

  /* ── the reading view ───────────────────────────────────────── */

  function createStore(collectionId) {
    const positions = readJson(POSITION_KEY, {});
    const visited = readJson(VISITED_KEY, {});
    return {
      lastChapterId() {
        const value = positions[collectionId];
        return typeof value === "string" ? value : null;
      },
      rememberChapter(chapterId) {
        positions[collectionId] = chapterId;
        storageSet(POSITION_KEY, JSON.stringify(positions));
      },
      markVisited(chapterId) {
        visited[chapterId] = true;
        storageSet(VISITED_KEY, JSON.stringify(visited));
      },
      isVisited(chapterId) {
        return visited[chapterId] === true;
      }
    };
  }

  function shellHtml(state, collection) {
    const meta = [
      `${collection.chapterCount} chapter${collection.chapterCount === 1 ? "" : "s"}`,
      `${formatWords(collection.words)} words`,
      `digest ${String(collection.digest || "").slice(0, 12)}…`
    ].join(" · ");
    const eyebrow = collection.book
      ? `${String(collection.book).toUpperCase()} · ${String(collection.status || "PREVIEW").toUpperCase()} · PLAINTEXT MANUSCRIPT`
      : "PLAINTEXT MANUSCRIPT · SUBMITTED CHAPTER BY CHAPTER";

    return `
      <div class="ms-app">
        <header class="ms-head">
          <div class="ms-head-main">
            <p class="ms-eyebrow">${escapeHtml(eyebrow)}</p>
            <h1 class="ms-title">${escapeHtml(collection.title || state.collectionId)}</h1>
            ${collection.subtitle ? `<p class="ms-subtitle">${escapeHtml(collection.subtitle)}</p>` : ""}
            <p class="ms-meta mono" data-ms-meta>${escapeHtml(meta)}</p>
          </div>
          <div class="ms-head-tools">
            <div class="ms-fontstep" role="group" aria-label="Text size">
              <button type="button" class="ms-tool" data-ms-font="-1" title="Smaller text" aria-label="Smaller text">A−</button>
              <button type="button" class="ms-tool" data-ms-font="1" title="Larger text" aria-label="Larger text">A+</button>
            </div>
            <button type="button" class="ms-tool ms-tool-wide" data-ms-reload title="Re-read the manuscript index">↻ Index</button>
          </div>
        </header>
        <p class="ms-source mono">source: ${escapeHtml(state.collectionId)}/ · rendered locally from static plaintext · the digest identifies a text state, it does not sign or authorize anything</p>
        <div class="ms-body">
          <nav class="ms-rail" aria-label="Chapters">
            <p class="ms-rail-head">CONTENTS</p>
            <ol class="ms-rail-list" data-ms-rail></ol>
          </nav>
          <article class="ms-reader" data-ms-reader tabindex="0" aria-label="Chapter text"></article>
        </div>
      </div>`;
  }

  function railHtml(collection, state) {
    return collection.chapters.map((chapter, position) => {
      const current = position === state.chapterIndex;
      return `
        <li>
          <button type="button" class="ms-rail-item${current ? " active" : ""}" data-ms-chapter="${escapeHtml(chapter.id)}"
            aria-current="${current ? "true" : "false"}">
            <span class="ms-rail-num mono">${String(chapter.index).padStart(2, "0")}</span>
            <span class="ms-rail-title">${escapeHtml(chapter.title)}</span>
            <span class="ms-rail-words mono">${state.store.isVisited(chapter.id) ? "read" : `${formatWords(chapter.words)}w`}</span>
          </button>
        </li>`;
    }).join("");
  }

  function readerHtml(collection, state) {
    const chapter = collection.chapters[state.chapterIndex];
    if (!chapter) return `<p class="ms-empty">Select a chapter to read.</p>`;
    const parsed = state.parsed;
    const title = parsed.title || chapter.title;
    const position = `${state.chapterIndex + 1} / ${collection.chapterCount}`;
    return `
      <header class="ms-chapter-head">
        <p class="ms-chapter-eyebrow mono">CHAPTER ${String(chapter.index).padStart(2, "0")} · ${escapeHtml(position)} · ${escapeHtml(formatWords(parsed.words))} WORDS · ${readingMinutes(parsed.words)} MIN</p>
        <h2 class="ms-chapter-title">${escapeHtml(title)}</h2>
        <p class="ms-chapter-file mono">${escapeHtml(chapter.file)}</p>
      </header>
      <div class="ms-text" data-ms-text>${parsed.blocks.length ? blocksHtml(parsed.blocks) : `<p class="ms-empty">This chapter file contains no text yet.</p>`}</div>
      <footer class="ms-nav">
        <button type="button" class="ms-tool" data-ms-move="-1" ${state.chapterIndex === 0 ? "disabled" : ""}>← Previous</button>
        <span class="ms-nav-state mono">${escapeHtml(position)}</span>
        <button type="button" class="ms-tool" data-ms-move="1" ${state.chapterIndex >= collection.chapterCount - 1 ? "disabled" : ""}>Next →</button>
      </footer>`;
  }

  function noticeHtml(state, title, body, options = {}) {
    return `
      <div class="ms-app">
        <div class="ms-notice ${options.kind || ""}">
          <p class="ms-eyebrow">${escapeHtml(options.eyebrow || "MANUSCRIPT")}</p>
          <h1 class="ms-title">${escapeHtml(title)}</h1>
          <p class="ms-notice-body">${escapeHtml(body)}</p>
          ${options.detail ? `<p class="ms-notice-detail mono">${escapeHtml(options.detail)}</p>` : ""}
          <div class="ms-head-tools">${options.retry === false ? "" : `<button type="button" class="ms-tool ms-tool-wide" data-ms-reload>↻ Try again</button>`}</div>
        </div>
      </div>`;
  }

  /**
   * Mount the reading view into a host element.
   * options: { collectionId, manifestUrl, fetchImpl }
   * Returns a controller — { reload, showChapter, state } — and never throws:
   * a failed load renders an explanation instead.
   */
  function mount(host, options = {}) {
    const collectionId = options.collectionId || "the-grand-river-foundation";
    const manifestUrl = options.manifestUrl || MANIFEST_URL;
    const doFetch = options.fetchImpl || ((...args) => window.fetch(...args));
    const state = {
      collectionId,
      manifestUrl,
      store: createStore(collectionId),
      manifest: null,
      collection: null,
      chapterIndex: 0,
      parsed: { title: null, blocks: [], words: 0 },
      fontStep: readFontStep(),
      busy: false
    };

    function applyFont(article) {
      if (article && article.style) article.style.fontSize = FONT_STEPS[state.fontStep] || FONT_STEPS[1];
    }

    function bind() {
      host.querySelectorAll("[data-ms-reload]").forEach(button =>
        button.addEventListener("click", () => reload()));
      host.querySelectorAll("[data-ms-chapter]").forEach(button =>
        button.addEventListener("click", () => showChapter(button.dataset.msChapter)));
      host.querySelectorAll("[data-ms-move]").forEach(button =>
        button.addEventListener("click", () => showChapter(state.chapterIndex + Number(button.dataset.msMove || 1))));
      host.querySelectorAll("[data-ms-font]").forEach(button =>
        button.addEventListener("click", () => {
          const direction = Number(button.dataset.msFont);
          state.fontStep = Math.max(0, Math.min(FONT_STEPS.length - 1, state.fontStep + direction));
          storageSet(FONT_KEY, String(state.fontStep));
          applyFont(host.querySelector("[data-ms-reader]"));
        }));
      const article = host.querySelector("[data-ms-reader]");
      if (article) {
        applyFont(article);
        /* The article is rebuilt on every draw, so this never double-binds. */
        article.addEventListener("keydown", event => {
          const key = event && event.key;
          if (key === "ArrowLeft" && state.chapterIndex > 0) { state.chapterIndex -= 1; openChapter(); }
          else if (key === "ArrowRight" && state.collection && state.chapterIndex < state.collection.chapterCount - 1) { state.chapterIndex += 1; openChapter(); }
        });
      }
    }

    function scrollToTop() {
      try {
        const scroller = host.closest ? host.closest(".win-body") : null;
        if (scroller) scroller.scrollTop = 0;
      } catch { /* not mounted in a window */ }
    }

    function draw() {
      if (!state.collection) return;
      host.innerHTML = shellHtml(state, state.collection);
      const rail = host.querySelector("[data-ms-rail]");
      if (rail) rail.innerHTML = railHtml(state.collection, state);
      const reader = host.querySelector("[data-ms-reader]");
      if (reader) reader.innerHTML = readerHtml(state.collection, state);
      bind();
    }

    /** Load one chapter's text and render it. Network failure stays visible. */
    async function openChapter() {
      const chapter = state.collection && state.collection.chapters[state.chapterIndex];
      if (!chapter) return;
      const reader = host.querySelector("[data-ms-reader]");
      if (reader) reader.innerHTML = `<p class="ms-empty">Loading ${escapeHtml(chapter.title)}…</p>`;
      try {
        const response = await doFetch(encodeURI(chapter.file), { cache: "no-store" });
        if (!response || !response.ok) throw new Error(`HTTP ${response ? response.status : "?"}`);
        const text = await (response.text ? response.text() : Promise.resolve(""));
        state.parsed = parseChapter(text);
      } catch (error) {
        state.parsed = { title: null, blocks: [], words: 0 };
        if (reader) {
          reader.innerHTML = `
            <div class="ms-notice error">
              <p class="ms-eyebrow">CHAPTER UNAVAILABLE</p>
              <h1 class="ms-title">${escapeHtml(chapter.title)}</h1>
              <p class="ms-notice-body">This chapter could not be read from the site. ${escapeHtml(String(error && error.message || error))}</p>
              <p class="ms-notice-detail mono">${escapeHtml(chapter.file)}</p>
            </div>`;
        }
        return;
      }
      state.store.rememberChapter(chapter.id);
      state.store.markVisited(chapter.id);
      draw();
      scrollToTop();
    }

    async function loadManifest() {
      host.innerHTML = noticeHtml(state, "Opening the manuscript…", "Reading the chapter index.",
        { eyebrow: "MANUSCRIPT", retry: false });
      let manifest;
      try {
        const response = await doFetch(manifestUrl, { cache: "no-store" });
        if (!response || !response.ok) throw new Error(`HTTP ${response ? response.status : "?"}`);
        manifest = await response.json();
      } catch (error) {
        host.innerHTML = noticeHtml(state, "Manuscript index unavailable",
          "The chapter index could not be read. Serve the site with `node serve.js` (or open the deployed site); a preview opened straight from the filesystem cannot read manuscript files.",
          { kind: "error", eyebrow: "MANUSCRIPT OFFLINE", detail: `${manifestUrl} — ${String(error && error.message || error)}` });
        bind();
        return;
      }

      if (!manifest || manifest.schema !== MANIFEST_SCHEMA || !Array.isArray(manifest.collections)) {
        host.innerHTML = noticeHtml(state, "Unrecognized manuscript index",
          "The index exists but does not use the expected schema, so nothing is displayed rather than guessing at the format.",
          { kind: "error", eyebrow: "MANUSCRIPT", detail: `expected schema ${MANIFEST_SCHEMA}` });
        bind();
        return;
      }

      state.manifest = manifest;
      state.collection = manifest.collections.find(collection => collection.id === collectionId) || null;

      if (!state.collection) {
        host.innerHTML = noticeHtml(state, "No chapters submitted yet",
          `Add plaintext chapter files to the manuscript/${collectionId}/ folder of the repository and commit them; the tab reads them on the next load.`,
          { kind: "empty", eyebrow: "THE GRAND RIVER FOUNDATION", retry: true,
            detail: manifest.collections.length
              ? `collections found: ${manifest.collections.map(collection => collection.id).join(", ")}`
              : `no subfolders under manuscript/` });
        bind();
        return;
      }

      if (!state.collection.chapterCount) {
        host.innerHTML = noticeHtml(state, "The folder is ready — the chapters are not",
          `Create the first chapter as a .txt file in manuscript/${collectionId}/, for example 01-chapter-one.txt. Ordered file names set the reading order.`,
          { kind: "empty", eyebrow: "THE GRAND RIVER FOUNDATION", retry: true,
            detail: `${state.collection.title} · 0 chapters` });
        bind();
        return;
      }

      const remembered = state.store.lastChapterId();
      const rememberedIndex = state.collection.chapters.findIndex(chapter => chapter.id === remembered);
      state.chapterIndex = rememberedIndex >= 0 ? rememberedIndex : 0;
      draw();
      await openChapter();
    }

    function showChapter(target) {
      if (!state.collection || !state.collection.chapterCount) return;
      let index = target;
      if (typeof target === "string") index = state.collection.chapters.findIndex(chapter => chapter.id === target);
      if (!Number.isInteger(index) || index < 0 || index >= state.collection.chapterCount) return;
      state.chapterIndex = index;
      draw();
      openChapter();
    }

    function reload() {
      return loadManifest();
    }

    const ready = loadManifest();
    return { reload, showChapter, state, ready };
  }

  return {
    MANIFEST_URL,
    MANIFEST_SCHEMA,
    escapeHtml,
    inlineHtml,
    titleFromFileName,
    countWords,
    parseChapter,
    blocksHtml,
    mount
  };
})();

if (typeof window !== "undefined") window.ManuscriptReader = ManuscriptReader;
if (typeof module !== "undefined" && module.exports) module.exports = ManuscriptReader;
