/* Universal Timekeeping System — informational clock and duration converter. */
"use strict";

APPS.push({
  id: "uts",
  title: "UTS Watch & Converter",
  short: "UTS Watch",
  glyph: "◷",
  desc: "Display-only UTS clock, calendar and duration calculator",
  w: 760,
  h: 680,
  render(body) {
    if (window.HOSUTS) {
      window.HOSUTS.renderApp(body);
      return;
    }
    body.innerHTML = '<div class="rule-box refusal">UTS display module did not load. No time or authority state has changed.</div>';
  }
});
