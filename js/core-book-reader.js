/* ═══════════════════════════════════════════════════════════════
   HarshalOS — safe renderer for the explicitly selected Core Book
   Source: docs/harshal-systems/01-core-book.md (staged as book/).
   Markdown is parsed into a small allowlist of inert HTML elements;
   raw HTML, scripts, styles, and unsafe link schemes are never applied.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

(() => {
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeHref(value) {
    const href = String(value || "").trim();
    if (!href || href.startsWith("//") || href.includes("\\") || /[\u0000-\u001f\u007f]/.test(href)) return false;
    if (/^(?:https?:\/\/|#|\/(?!\/)|\.\.?\/)/i.test(href)) return true;
    return !/^[a-z][a-z0-9+.-]*:/i.test(href) && /^[A-Za-z0-9._~/%?=&+#-]+$/.test(href);
  }

  function inlineHtml(value, linkResolver) {
    const code = [];
    let html = escapeHtml(value).replace(/`([^`]+)`/g, (_, body) => {
      const token = `\uE000${code.length}\uE001`;
      code.push(`<code>${body}</code>`);
      return token;
    });

    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g, (match, label, href) => {
      if (!safeHref(href)) return label;
      let resolved = href;
      if (typeof linkResolver === "function") {
        try { resolved = linkResolver(href) || href; }
        catch { return label; }
      }
      if (!safeHref(resolved)) return label;
      const external = /^https?:\/\//i.test(resolved);
      return `<a href="${escapeHtml(resolved)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
    });
    html = html
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    return html.replace(/\uE000(\d+)\uE001/g, (_, index) => code[Number(index)] || "");
  }

  function parseFrontMatter(source) {
    const lines = String(source == null ? "" : source).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
    if (lines[0]?.trim() !== "---") return { metadata: {}, body: lines.join("\n") };
    const close = lines.indexOf("---", 1);
    if (close < 0) return { metadata: {}, body: lines.join("\n") };
    const metadata = {};
    for (const line of lines.slice(1, close)) {
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      metadata[match[1]] = value;
    }
    return { metadata, body: lines.slice(close + 1).join("\n") };
  }

  function tableCells(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "")
      .split(/(?<!\\)\|/)
      .map(cell => cell.replace(/\\\|/g, "|").trim());
  }

  function isTableSeparator(line) {
    return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
  }

  function renderMarkdown(source, options = {}) {
    const { metadata, body } = parseFrontMatter(source);
    const renderInline = value => inlineHtml(value, options && options.linkResolver);
    const lines = body.split("\n");
    const html = [];
    let title = null;
    let paragraph = [];
    let sectionCount = 0;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      html.push(`<p class="core-book-p">${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    };

    for (let index = 0; index < lines.length;) {
      const line = lines[index];
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        index++;
        continue;
      }

      const fence = trimmed.match(/^```([A-Za-z0-9_-]*)\s*$/);
      if (fence) {
        flushParagraph();
        const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : "";
        const codeLines = [];
        index++;
        while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) codeLines.push(lines[index++]);
        if (index < lines.length) index++;
        html.push(`<pre class="core-book-code"><code${language}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        continue;
      }

      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        const level = heading[1].length;
        if (level === 1 && title === null) {
          title = heading[2].trim();
        } else {
          sectionCount++;
          const safeLevel = Math.min(level, 4);
          html.push(`<h${safeLevel} class="core-book-h${safeLevel}" id="core-book-section-${sectionCount}">${renderInline(heading[2])}</h${safeLevel}>`);
        }
        index++;
        continue;
      }

      if (/^([-*_]\s*){3,}$/.test(trimmed)) {
        flushParagraph();
        html.push('<hr class="core-book-rule">');
        index++;
        continue;
      }

      if (/^>\s?/.test(trimmed)) {
        flushParagraph();
        const quoteLines = [];
        while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
          quoteLines.push(lines[index++].trim().replace(/^>\s?/, ""));
        }
        const notice = quoteLines[0]?.match(/^\[!(NOTE|IMPORTANT|WARNING|CAUTION|TIP)\]\s*$/i);
        const content = notice ? quoteLines.slice(1) : quoteLines;
        const rendered = content.map(text => `<p>${renderInline(text)}</p>`).join("");
        if (notice) {
          html.push(`<aside class="core-book-callout"><p class="core-book-callout-label">${escapeHtml(notice[1])}</p>${rendered}</aside>`);
        } else {
          html.push(`<blockquote class="core-book-quote">${rendered}</blockquote>`);
        }
        continue;
      }

      if (trimmed.startsWith("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1].trim())) {
        flushParagraph();
        const rows = [tableCells(trimmed)];
        index += 2;
        while (index < lines.length && lines[index].trim().startsWith("|")) rows.push(tableCells(lines[index++]));
        const header = rows.shift() || [];
        const headHtml = `<thead><tr>${header.map(cell => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead>`;
        const bodyHtml = rows.map(row => `<tr>${header.map((_, cellIndex) => `<td>${renderInline(row[cellIndex] || "")}</td>`).join("")}</tr>`).join("");
        html.push(`<div class="core-book-table-wrap"><table class="core-book-table">${headHtml}<tbody>${bodyHtml}</tbody></table></div>`);
        continue;
      }

      const listItem = trimmed.match(/^([-*+]\s+|\d+\.\s+)(.*)$/);
      if (listItem) {
        flushParagraph();
        const ordered = /^\d/.test(listItem[1]);
        const tag = ordered ? "ol" : "ul";
        const items = [];
        while (index < lines.length) {
          const match = lines[index].trim().match(/^([-*+]\s+|\d+\.\s+)(.*)$/);
          if (!match || /^\d/.test(match[1]) !== ordered) break;
          items.push(`<li>${renderInline(match[2])}</li>`);
          index++;
        }
        html.push(`<${tag} class="core-book-list">${items.join("")}</${tag}>`);
        continue;
      }

      paragraph.push(trimmed);
      index++;
    }
    flushParagraph();

    return {
      title: title || metadata.title || "The Core Book",
      part: metadata.part || "Part I",
      provenance: metadata.provenance_class || "CANONICAL_SOURCE",
      status: metadata.status_taxonomy || "CONCEPTUAL_DOCTRINE",
      words: Number(metadata.words) || 0,
      html: html.join("\n"),
      sections: sectionCount
    };
  }

  globalThis.CoreBookReader = Object.freeze({ escapeHtml, parseFrontMatter, renderMarkdown });
})();
