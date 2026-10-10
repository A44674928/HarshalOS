const $ = id => document.getElementById(id);
let busy = false, listCursor = null, eventCursor = null, historyCursor = null, current = null;
const selected = new URL(location.href).searchParams.get('id');
const notice = text => { $('public-notice').textContent = text; };
/* Human verification (Cloudflare Turnstile) for moderator reports. Checked
   lazily on first report: nothing is fetched and no third-party script loads
   for readers, and deployments without a Turnstile secret never require it. */
let turnstileState = { checked: false, required: false, siteKey: '', token: '', widgetId: null, scriptLoading: null, scriptFailed: false };
async function turnstileConfig() {
  if (turnstileState.checked) return turnstileState;
  const status = await api('status');
  turnstileState.required = status.turnstile?.required === true;
  turnstileState.siteKey = typeof status.turnstile?.siteKey === 'string' ? status.turnstile.siteKey : '';
  turnstileState.checked = true;
  return turnstileState;
}
async function ensureTurnstile() {
  let config;
  try {
    config = await turnstileConfig();
  } catch {
    notice('Could not confirm whether human verification is required. Retry shortly.');
    return { ...turnstileState, unknown: true };
  }
  if (!config.required) return config;
  if (config.widgetId === null && !turnstileState.scriptFailed) {
    if (!config.siteKey) { notice('Human verification is required, but this deployment has no site key configured. Reporting is unavailable until the operator fixes it.'); return config; }
    if (!$('turnstile-report')) return config;
    try {
      if (!window.turnstile) {
        if (!turnstileState.scriptLoading) {
          turnstileState.scriptLoading = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true; script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => { turnstileState.scriptLoading = null; reject(new Error('widget failed to load')); };
            document.head.append(script);
          });
        }
        await turnstileState.scriptLoading;
      }
      config.widgetId = window.turnstile.render('#turnstile-report', {
        sitekey: config.siteKey,
        callback: token => { turnstileState.token = token; },
        'expired-callback': () => { turnstileState.token = ''; },
        'error-callback': () => { turnstileState.token = ''; }
      });
    } catch {
      turnstileState.scriptFailed = true;
      notice('The verification widget failed to load. Retry shortly.');
    }
  }
  return config;
}
async function api(path, options = {}) {
  const response = await fetch('/api/community/' + path, { cache: 'no-store', credentials: 'same-origin', ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(response.status === 401 ? 'Sign in through My private workspace, then return to report this concern.' : data.error || 'Request failed.');
  return data;
}
async function task(action) {
  if (busy) return; busy = true;
  for (const button of document.querySelectorAll('button')) button.disabled = true;
  try { await action(); } catch (error) { notice(error.message); }
  finally { busy = false; for (const button of document.querySelectorAll('button')) button.disabled = false; }
}
function publicationItem(publication) {
  const li = document.createElement('li'), link = document.createElement('a'), meta = document.createElement('p');
  link.href = '/audits?id=' + encodeURIComponent(publication.id); link.textContent = publication.title || 'Removed report';
  meta.className = 'muted'; meta.textContent = `Version ${publication.version} · ${publication.state === 'published' ? 'UNREVIEWED · ' + publication.phase + ' · Author label: ' + publication.author : publication.state} · ${new Date(publication.publishedAt).toLocaleString()}`;
  li.append(link, meta); return li;
}
async function list(append = false) {
  const data = await api('publications' + (append && listCursor ? '?after=' + encodeURIComponent(listCursor) : ''));
  if (!append) $('public-list').replaceChildren();
  for (const publication of data.publications) $('public-list').append(publicationItem(publication));
  if (!append && !data.publications.length) { const li = document.createElement('li'); li.textContent = 'No public reports yet.'; $('public-list').append(li); }
  listCursor = data.nextCursor; $('public-more').hidden = !listCursor;
}
async function events(append = false) {
  const data = await api('public-log' + (append && eventCursor ? '?after=' + encodeURIComponent(eventCursor) : ''));
  if (!append) $('public-events').replaceChildren();
  for (const event of data.events) {
    const li = document.createElement('li'), link = document.createElement('a'); link.href = '/audits?id=' + encodeURIComponent(event.publicationId);
    link.textContent = `${event.kind} · ${new Date(event.createdAt).toLocaleString()}`; li.append(link); $('public-events').append(li);
  }
  eventCursor = data.nextCursor; $('events-more').hidden = !eventCursor;
}
async function history(append = false) {
  const data = await api('publications/' + encodeURIComponent(selected) + '/history' + (append && historyCursor ? '?after=' + encodeURIComponent(historyCursor) : ''));
  if (!append) $('public-history').replaceChildren();
  for (const publication of data.publications) $('public-history').append(publicationItem(publication));
  historyCursor = data.nextCursor; $('history-more').hidden = !historyCursor;
}
async function detail() {
  const data = await api('publications/' + encodeURIComponent(selected)); current = data.publication;
  $('publication-detail').hidden = false; $('publication-title').textContent = current.title || 'Removed report';
  $('publication-state').textContent = current.state === 'published' ? 'UNREVIEWED' : current.state.toUpperCase();
  $('publication-meta').textContent = `Version ${current.version} · ${new Date(current.publishedAt).toLocaleString()} · Report SHA-256: ${current.reportHash}`;
  $('publication-json').textContent = current.report ? JSON.stringify(current.report, null, 2) : '';
  $('publication-scope').textContent = current.report ? 'Exact author-approved report. Computed phases, completeness and badge labels are rules outputs, not platform certification. No independent evidence or identity verification was performed.' : 'Report content and author label have been removed. Only the hash and minimal version history remain here.';
  $('publication-export').hidden = !current.report;
  $('publication-newsml-export').hidden = !current.report;
  $('publication-newsml-export').href = current.report
    ? '/api/community/publications/' + encodeURIComponent(selected) + '/newsml' : '#';
  $('report-form').hidden = !current.report; await history();
}
$('public-more').addEventListener('click', () => task(() => list(true)));
$('events-more').addEventListener('click', () => task(() => events(true)));
$('history-more').addEventListener('click', () => task(() => history(true)));
$('send-report').addEventListener('click', () => task(async () => {
  const details = $('report-details').value.trim(); if (!details) throw new Error('Describe the concern before submitting.');
  const verification = await ensureTurnstile();
  if (verification.unknown) return;
  if (verification.required && !turnstileState.token) throw new Error('Complete the human verification challenge, then send again.');
  await api('publications/' + encodeURIComponent(selected) + '/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ details, ...(turnstileState.token ? { turnstileToken: turnstileState.token } : {}) }) });
  $('report-details').value = ''; turnstileState.token = '';
  try { if (turnstileState.widgetId !== null && window.turnstile) window.turnstile.reset(turnstileState.widgetId); } catch { /* a stale widget never blocks the next report */ }
  notice('Report sent privately to moderators. Reporting is not a finding or certification.');
}));
$('publication-export').addEventListener('click', () => {
  if (busy || !current?.report) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'ground0-public-report.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
task(async () => { await list(); await events(); if (selected) await detail(); notice('Public reports are UNREVIEWED. Consult the exact inputs, method and scope—not just the computed phase.'); });
