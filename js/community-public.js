const $ = id => document.getElementById(id);
let busy = false, listCursor = null, eventCursor = null, historyCursor = null, current = null;
const selected = new URL(location.href).searchParams.get('id');
const notice = text => { $('public-notice').textContent = text; };
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
  await api('publications/' + encodeURIComponent(selected) + '/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ details }) });
  $('report-details').value = ''; notice('Report sent privately to moderators. Reporting is not a finding or certification.');
}));
$('publication-export').addEventListener('click', () => {
  if (busy || !current?.report) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'ground0-public-report.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
task(async () => { await list(); await events(); if (selected) await detail(); notice('Public reports are UNREVIEWED. Consult the exact inputs, method and scope—not just the computed phase.'); });
