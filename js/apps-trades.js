/* Read-only paper-trading logs backed by plain files in /trades/.
   The ticker index and each log are fetched from this origin; this app never
   writes data or contacts a trading service. */
(() => {
  "use strict";

  const SAFE_TICKER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
  const GITHUB_ROOT = "https://github.com/A44674928/HarshalOS";
  const INDEX_FILE_URL = `${GITHUB_ROOT}/blob/main/trades/index.txt`;

  function parseIndex(text) {
    const entries = [];
    let invalidCount = 0;
    for (const sourceLine of String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/)) {
      const line = sourceLine.trim();
      if (!line || line.startsWith("#")) continue;

      const divider = line.indexOf("|");
      const ticker = (divider === -1 ? line : line.slice(0, divider)).trim();
      const description = divider === -1 ? "" : line.slice(divider + 1).trim();
      if (!SAFE_TICKER.test(ticker)) {
        invalidCount++;
        continue;
      }
      entries.push({ ticker, description });
    }
    return { entries, invalidCount };
  }

  function assetUrl(path, refreshNumber = null) {
    const url = new URL(path, window.location.href);
    if (refreshNumber !== null) {
      url.searchParams.set("refresh", `${Date.now()}-${refreshNumber}`);
    }
    return url.href;
  }

  function getText(path, refreshNumber = null) {
    return window.fetch(assetUrl(path, refreshNumber), {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "text/plain" }
    });
  }

  function githubFileUrl(ticker) {
    return `${GITHUB_ROOT}/blob/main/trades/${encodeURIComponent(ticker)}.txt`;
  }

  function githubHistoryUrl(ticker) {
    return `${GITHUB_ROOT}/commits/main/trades/${encodeURIComponent(ticker)}.txt`;
  }

  function notepadId(ticker) {
    // Tickers are filename-safe ASCII; preserve case in the unique window key.
    return `trades-notepad-${ticker}`;
  }

  function makeNotepad(ticker) {
    const filePath = `trades/${encodeURIComponent(ticker)}.txt`;
    const fileUrl = githubFileUrl(ticker);
    const historyUrl = githubHistoryUrl(ticker);

    return {
      id: notepadId(ticker),
      title: `${ticker}.txt`,
      short: `${ticker}.txt`,
      glyph: "▤",
      desc: `Read-only simulated-trading log for ${ticker}`,
      w: 700,
      h: 520,
      render(body) {
        body.innerHTML = `
          <section class="trades-notepad" aria-label="Read-only trade log for ${ticker}">
            <p class="trades-disclaimer">Simulated trades, not financial advice.</p>
            <div class="trades-toolbar">
              <button class="trades-refresh" type="button">Refresh</button>
              <span class="trades-status" role="status" aria-live="polite">Loading trade log…</span>
              <span class="trades-loaded">Last loaded: <time>Not yet</time></span>
            </div>
            <nav class="trades-links" aria-label="Trade log sources">
              <a class="trades-history" target="_blank" rel="noopener noreferrer">View history ↗</a>
              <a class="trades-source" target="_blank" rel="noopener noreferrer">Open file on GitHub ↗</a>
            </nav>
            <pre class="trades-log" aria-label="Trade log text" aria-readonly="true" tabindex="0"></pre>
            <p class="trades-error" role="alert" hidden></p>
          </section>`;

        const refreshButton = body.querySelector(".trades-refresh");
        const status = body.querySelector(".trades-status");
        const lastLoaded = body.querySelector(".trades-loaded time");
        const historyLink = body.querySelector(".trades-history");
        const sourceLink = body.querySelector(".trades-source");
        const log = body.querySelector(".trades-log");
        const error = body.querySelector(".trades-error");
        let requestNumber = 0;

        historyLink.href = historyUrl;
        historyLink.title = `View commits that changed trades/${ticker}.txt`;
        sourceLink.href = fileUrl;
        sourceLink.title = `Open trades/${ticker}.txt on GitHub`;

        function markLoaded() {
          const now = new Date();
          lastLoaded.dateTime = now.toISOString();
          lastLoaded.textContent = now.toLocaleString();
        }

        async function loadLog(refresh = false) {
          const currentRequest = ++requestNumber;
          refreshButton.disabled = true;
          status.textContent = refresh ? "Refreshing trade log…" : "Loading trade log…";
          error.hidden = true;

          try {
            const response = await getText(filePath, refresh ? currentRequest : null);
            if (currentRequest !== requestNumber) return;

            if (response.status === 404) {
              log.textContent = "No trades logged yet.";
              status.textContent = "No trades logged yet.";
              markLoaded();
              return;
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const content = String(await response.text()).replace(/^\uFEFF/, "");
            if (currentRequest !== requestNumber) return;
            if (!content.trim()) {
              log.textContent = "No trades logged yet.";
              status.textContent = "No trades logged yet.";
            } else {
              // Text is assigned, never interpreted as HTML or executable markup.
              log.textContent = content;
              status.textContent = "Trade log loaded.";
            }
            markLoaded();
          } catch {
            if (currentRequest !== requestNumber) return;
            log.textContent = "Could not load this trade log.";
            status.textContent = "Trade log unavailable.";
            error.textContent = "The file could not be fetched. Try Refresh or open it directly on GitHub.";
            error.hidden = false;
          } finally {
            if (currentRequest === requestNumber) refreshButton.disabled = false;
          }
        }

        refreshButton.addEventListener("click", () => { void loadLog(true); });
        void loadLog();
      }
    };
  }

  APPS.push({
    id: "trades",
    title: "Trades",
    short: "Trades",
    glyph: "📁",
    desc: "Read-only paper-trading logs, published as static text files",
    w: 620,
    h: 520,
    render(body, api) {
      body.innerHTML = `
        <section class="trades-folder" aria-label="Paper-trading logs">
          <header class="trades-folder-head">
            <div>
              <div class="trades-folder-title">Trades</div>
              <p class="trades-folder-intro">Public paper-trading notes. Select a ticker to open its read-only text log.</p>
            </div>
            <button class="trades-list-refresh" type="button">Refresh list</button>
          </header>
          <p class="trades-folder-status" role="status" aria-live="polite">Loading ticker list…</p>
          <ul class="trades-list" aria-label="Tickers"></ul>
          <div class="trades-folder-footer">
            <span>Static files · read-only · updates are published through GitHub commits.</span>
            <a class="trades-index-source" target="_blank" rel="noopener noreferrer">View index.txt on GitHub ↗</a>
          </div>
        </section>`;

      const list = body.querySelector(".trades-list");
      const status = body.querySelector(".trades-folder-status");
      const refreshButton = body.querySelector(".trades-list-refresh");
      const indexLink = body.querySelector(".trades-index-source");
      let requestNumber = 0;
      let hasLoaded = false;
      indexLink.href = INDEX_FILE_URL;

      function showEmpty(message) {
        const item = document.createElement("li");
        item.className = "trades-empty";
        item.textContent = message;
        list.appendChild(item);
      }

      function showEntries(entries) {
        list.replaceChildren();
        if (!entries.length) {
          showEmpty("No tickers are listed yet.");
          return;
        }
        for (const entry of entries) {
          const item = document.createElement("li");
          const button = document.createElement("button");
          const symbol = document.createElement("strong");
          button.type = "button";
          button.className = "trades-ticker-open";
          button.setAttribute("aria-label", `Open ${entry.ticker} trade log`);
          symbol.className = "trades-ticker-symbol";
          symbol.textContent = entry.ticker;
          button.appendChild(symbol);

          if (entry.description) {
            const description = document.createElement("span");
            description.className = "trades-ticker-description";
            description.textContent = entry.description;
            button.appendChild(description);
          }

          button.addEventListener("click", () => api.openApp(makeNotepad(entry.ticker)));
          item.appendChild(button);
          list.appendChild(item);
        }
      }

      async function loadIndex(refresh = false) {
        const currentRequest = ++requestNumber;
        refreshButton.disabled = true;
        status.textContent = refresh ? "Refreshing ticker list…" : "Loading ticker list…";
        if (!hasLoaded) list.replaceChildren();

        try {
          const response = await getText("trades/index.txt", refresh ? currentRequest : null);
          if (currentRequest !== requestNumber) return;
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const parsed = parseIndex(await response.text());
          if (currentRequest !== requestNumber) return;
          showEntries(parsed.entries);
          hasLoaded = true;
          status.textContent = parsed.invalidCount
            ? `Ticker list loaded; ${parsed.invalidCount} invalid ticker line${parsed.invalidCount === 1 ? " was" : "s were"} skipped.`
            : parsed.entries.length ? "Ticker list loaded." : "No tickers are listed yet.";
        } catch {
          if (currentRequest !== requestNumber) return;
          if (!hasLoaded) showEmpty("Could not load the ticker list. Try Refresh list or open index.txt on GitHub.");
          status.textContent = "Ticker list unavailable.";
        } finally {
          if (currentRequest === requestNumber) refreshButton.disabled = false;
        }
      }

      refreshButton.addEventListener("click", () => { void loadIndex(true); });
      void loadIndex();
    }
  });
})();
