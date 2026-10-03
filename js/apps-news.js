/* Standalone, read-only News app for explicitly published D1 public reports. */
"use strict";

APPS.push({
  id: "news",
  title: "News",
  short: "News",
  glyph: "📰",
  desc: "Read explicitly published D1 public reports and download NewsML-G2 records",
  w: 1040,
  h: 740,
  render(body) {
    body.innerHTML = `
      <section class="news-app" aria-label="News public report reader">
        <header class="news-masthead">
          <div class="news-heading">
            <div class="news-wordmark"><span class="news-mark" aria-hidden="true"></span>HARSHALOS <span>/</span> PUBLIC WIRE</div>
            <h1>News</h1>
            <p>Latest reports explicitly published to the D1 public register.</p>
          </div>
          <div class="news-edition" aria-hidden="true"><span>PUBLIC</span><strong>01</strong><span>REGISTER</span></div>
        </header>

        <div class="news-boundary">
          <span class="news-boundary-label">UNREVIEWED</span>
          <span>Author-submitted reports. No independent verification or platform certification.</span>
        </div>

        <div class="news-toolbar">
          <p id="news-status" role="status" aria-live="polite">Connecting to the public register…</p>
          <button class="news-refresh" id="news-refresh" type="button">↻ <span>Refresh</span></button>
        </div>

        <div class="news-layout">
          <aside class="news-sidebar" aria-label="Latest public reports">
            <div class="news-section-head">
              <h2>Latest reports</h2>
              <span class="news-count" id="news-count">0</span>
            </div>
            <ol class="news-feed" id="news-feed"></ol>
            <button class="news-more" id="news-more" type="button" hidden>Load older reports <span aria-hidden="true">↓</span></button>
          </aside>

          <section class="news-reader" aria-label="Selected public report">
            <div class="news-reader-empty" id="news-reader-empty" role="status">Select a report from the public wire to read it.</div>
            <article class="news-article" id="news-article" hidden>
              <p class="news-kicker" id="news-kicker">PUBLIC REPORT <span>·</span> UNREVIEWED</p>
              <h2 class="news-headline" id="news-headline"></h2>
              <p class="news-meta" id="news-meta"></p>
              <div class="news-finding-label">COMPUTED FINDING <span>·</span> NOT A CERTIFICATION</div>
              <p class="news-finding" id="news-finding"></p>
              <p class="news-scope" id="news-scope"></p>
              <div class="news-actions">
                <a class="news-action news-action-primary" id="news-newsml" href="#" download hidden>Download NewsML-G2 <span aria-hidden="true">↓</span></a>
                <a class="news-action" id="news-full-record" href="#">Open public record &amp; history <span aria-hidden="true">↗</span></a>
              </div>
              <details class="news-source">
                <summary>Inspect the exact published report JSON</summary>
                <pre id="news-json"></pre>
              </details>
              <p class="news-footnote">The report and author label are presented as published, not independently verified. Downloaded copies cannot be recalled.</p>
            </article>
          </section>
        </div>
        <footer class="news-footer">SOURCE <strong>D1 PUBLIC REGISTER</strong><span>Private drafts, audit runs, and previews are never part of this feed.</span></footer>
      </section>`;

    const $ = selector => body.querySelector(selector);
    const feed = $("#news-feed");
    const status = $("#news-status");
    const count = $("#news-count");
    const more = $("#news-more");
    const refresh = $("#news-refresh");
    const readerEmpty = $("#news-reader-empty");
    const article = $("#news-article");
    const headline = $("#news-headline");
    const meta = $("#news-meta");
    const finding = $("#news-finding");
    const scope = $("#news-scope");
    const json = $("#news-json");
    const newsml = $("#news-newsml");
    const fullRecord = $("#news-full-record");
    const state = { publications: [], cursor: null, selectedId: null, loading: false, error: "", detailRequest: 0 };

    const publishedAt = value => {
      const date = new Date(Number(value));
      return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Publication date unavailable";
    };
    const publicTitle = publication => typeof publication?.title === "string" && publication.title.trim()
      ? publication.title : "Untitled public report";
    const publicAuthor = publication => typeof publication?.author === "string" && publication.author.trim()
      ? publication.author : "Unspecified author label";
    const object = value => value !== null && typeof value === "object" && !Array.isArray(value);

    async function getJson(path) {
      const response = await window.fetch(path, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      let data;
      try { data = await response.json(); }
      catch { throw new Error("The public register returned an unreadable response."); }
      if (!response.ok) throw new Error(data?.error || `Public register request failed (${response.status}).`);
      if (!object(data)) throw new Error("The public register returned an invalid response.");
      return data;
    }

    function clearReader(message) {
      state.selectedId = null;
      article.hidden = true;
      readerEmpty.hidden = false;
      readerEmpty.textContent = message;
      headline.textContent = "";
      meta.textContent = "";
      finding.textContent = "";
      scope.textContent = "";
      json.textContent = "";
      newsml.hidden = true;
      newsml.href = "#";
      fullRecord.href = "#";
    }

    function drawFeed() {
      feed.replaceChildren();
      count.textContent = String(state.publications.length);
      more.hidden = !state.cursor;
      if (!state.publications.length) {
        const empty = document.createElement("li");
        empty.className = "news-feed-empty";
        empty.textContent = state.error
          ? "Feed unavailable. No drafts, runs, or previews are shown here."
          : "No public reports have been published yet.";
        feed.append(empty);
        return;
      }
      for (const publication of state.publications) {
        const item = document.createElement("li");
        const button = document.createElement("button");
        const label = document.createElement("span");
        const title = document.createElement("span");
        const details = document.createElement("span");
        button.type = "button";
        button.className = "news-feed-item" + (publication.id === state.selectedId ? " is-selected" : "");
        button.setAttribute("aria-pressed", publication.id === state.selectedId ? "true" : "false");
        label.className = "news-feed-label";
        label.textContent = `${publication.phase || "PUBLIC REPORT"} · UNREVIEWED`;
        title.className = "news-feed-title";
        title.textContent = publicTitle(publication);
        details.className = "news-feed-meta";
        details.textContent = `${publicAuthor(publication)} · ${publishedAt(publication.publishedAt)}`;
        button.append(label, title, details);
        button.addEventListener("click", () => { void selectPublication(publication); });
        item.append(button);
        feed.append(item);
      }
    }

    function setStatus(message, kind = "") {
      status.textContent = message;
      status.dataset.state = kind;
    }

    function reportIsSafeToDisplay(publication) {
      const report = publication?.report;
      return publication?.state === "published"
        && object(report)
        && report.schema === "ground0-public-v1"
        && report.reviewStatus === "UNREVIEWED"
        && report.platformCertification === "NONE"
        && report.author === publication.author
        && report.input?.name === publication.title
        && report.result?.phase === publication.phase;
    }

    async function selectPublication(summary) {
      if (!summary || typeof summary.id !== "string") return;
      state.selectedId = summary.id;
      drawFeed();
      const ticket = ++state.detailRequest;
      const path = `/api/community/publications/${encodeURIComponent(summary.id)}`;
      article.hidden = false;
      readerEmpty.hidden = true;
      headline.textContent = publicTitle(summary);
      meta.textContent = `${publicAuthor(summary)} · Version ${summary.version} · ${publishedAt(summary.publishedAt)} · Phase ${summary.phase || "—"}`;
      finding.textContent = "Loading the exact published report…";
      scope.textContent = "Only active public reports are displayed. This report remains UNREVIEWED.";
      json.textContent = "";
      newsml.hidden = true;
      newsml.href = "#";
      fullRecord.href = `/audits?id=${encodeURIComponent(summary.id)}`;

      try {
        const data = await getJson(path);
        if (ticket !== state.detailRequest) return;
        const publication = data.publication;
        if (!object(publication)) throw new Error("The public register returned no report record.");
        if (publication.state !== "published") {
          state.publications = state.publications.filter(item => item.id !== summary.id);
          drawFeed();
          clearReader("This report is no longer active. Its report content and author label may have been removed.");
          setStatus("The selected report is no longer active · feed contains active publications only.", "notice");
          return;
        }
        if (!publication.report) {
          clearReader("The active report payload is unavailable and was not displayed.");
          setStatus("Active public report payload unavailable · no report content displayed.", "error");
          return;
        }
        if (!reportIsSafeToDisplay(publication)) {
          clearReader("The public report did not match the required UNREVIEWED record envelope and was not displayed.");
          setStatus("Report envelope check failed · no report content displayed.", "error");
          return;
        }
        const report = publication.report;
        headline.textContent = publicTitle(publication);
        meta.textContent = `${publicAuthor(publication)} · Version ${publication.version} · ${publishedAt(publication.publishedAt)} · Phase ${publication.phase}`;
        finding.textContent = typeof report.result?.finding === "string" && report.result.finding.trim()
          ? report.result.finding : "No computed finding text is present in this report.";
        scope.textContent = typeof report.scope?.notes === "string"
          ? report.scope.notes
          : "This report has no additional scope note. Treat it as unreviewed author-submitted content.";
        json.textContent = JSON.stringify(report, null, 2);
        newsml.href = `/api/community/publications/${encodeURIComponent(publication.id)}/newsml`;
        newsml.hidden = false;
        fullRecord.href = `/audits?id=${encodeURIComponent(publication.id)}`;
        article.hidden = false;
        readerEmpty.hidden = true;
        setStatus(`${state.publications.length} active report${state.publications.length === 1 ? "" : "s"} · D1 public register`, "ready");
      } catch (error) {
        if (ticket !== state.detailRequest) return;
        article.hidden = true;
        readerEmpty.hidden = false;
        readerEmpty.textContent = error.message || "The selected public report could not be loaded.";
        newsml.hidden = true;
        newsml.href = "#";
        json.textContent = "";
        setStatus("Could not load the selected public report.", "error");
      }
    }

    async function loadFeed({ append = false } = {}) {
      if (state.loading) return;
      state.loading = true;
      refresh.disabled = true;
      more.disabled = true;
      state.error = "";
      setStatus(append ? "Loading older public reports…" : "Refreshing the D1 public register…");
      const cursor = append ? state.cursor : null;
      const path = "/api/community/publications" + (cursor ? `?after=${encodeURIComponent(cursor)}` : "");
      try {
        const data = await getJson(path);
        if (!Array.isArray(data.publications)) throw new Error("The public register returned an invalid report list.");
        const visible = data.publications.filter(publication => object(publication)
          && publication.state === "published"
          && publication.reviewStatus === "UNREVIEWED"
          && typeof publication.id === "string");
        if (append) {
          const seen = new Set(state.publications.map(publication => publication.id));
          state.publications.push(...visible.filter(publication => !seen.has(publication.id)));
        } else {
          state.publications = visible;
        }
        state.cursor = typeof data.nextCursor === "string" && data.nextCursor ? data.nextCursor : null;
        drawFeed();
        if (!append) {
          if (!state.publications.length) {
            clearReader("No active public reports yet. Private drafts, runs, and previews are not part of this feed.");
            setStatus("D1 public register · no active public reports", "empty");
          } else {
            const selected = state.publications.find(publication => publication.id === state.selectedId) || state.publications[0];
            await selectPublication(selected);
          }
        } else {
          setStatus(`${state.publications.length} active reports · D1 public register`, "ready");
        }
      } catch (error) {
        state.error = error.message || "Public register unavailable.";
        if (!append) {
          state.publications = [];
          state.cursor = null;
          drawFeed();
          clearReader("The public report service is unavailable. It may be disabled. No private drafts, runs, or previews are substituted.");
        }
        setStatus(`Public register unavailable · ${state.error}`, "error");
      } finally {
        state.loading = false;
        refresh.disabled = false;
        more.disabled = !state.cursor;
      }
    }

    refresh.addEventListener("click", () => { void loadFeed(); });
    more.addEventListener("click", () => { void loadFeed({ append: true }); });
    void loadFeed();
  }
});
