const $ = id => document.getElementById(id);
let user = null, selected = null, dirty = false, busy = false, cursor = null, currentRun = null, runCursor = null, epoch = 0;
let publicPreview = null, myCursor = null;
const notice = text => { $('notice').textContent = text; };
function controls() {
  $('workspace').hidden = !user; $('logout').hidden = !user;
  $('fields').disabled = busy || !user;
  for (const id of ['new', 'refresh', 'more', 'logout']) $(id).disabled = busy;
  for (const button of $('drafts').querySelectorAll('button')) button.disabled = busy;
  $('reload').hidden = !selected;
  $('publication-fields').disabled = busy || !user || !currentRun || dirty || currentRun.revision !== selected?.revision;
  $('publish-public').disabled = busy || !publicPreview || !$('public-consent').checked || publicPreview.expiresAt <= Date.now();
  $('public-consent').disabled = busy || !publicPreview;
  $('moderation-box').hidden = !user?.moderator;
  for (const id of ['my-publications','my-publication-more','moderation-load']) $(id).disabled = busy || !user;
  for (const button of document.querySelectorAll('#my-publication-list button, #moderation-list button, #moderation-list textarea')) button.disabled = busy;
  for (const id of ['run', 'history', 'run-more']) $(id).disabled = busy || !user || !selected || dirty;
  $('run-export').disabled = busy || !currentRun;
  for (const button of $('run-history').querySelectorAll('button')) button.disabled = busy || dirty;
}
function clearPublicPreview() {
  publicPreview = null; $('public-preview').hidden = true; $('preview-json').textContent = ''; $('preview-meta').textContent = ''; $('public-consent').checked = false; $('publish-public').disabled = true;
}
function clearRun() {
  clearPublicPreview(); $('public-author').value = ''; $('public-input').value = '';
  currentRun = null; runCursor = null; $('execution').hidden = true; $('run-panel').hidden = true; $('run-more').hidden = true;
  $('run-history').replaceChildren();
  for (const id of ['run-summary', 'run-source', 'run-finding', 'run-hash', 'run-json']) $(id).textContent = '';
}
function reset() {
  epoch++; clearRun(); myCursor = null; $('my-publication-list').replaceChildren(); $('moderation-list').replaceChildren(); $('my-publication-more').hidden = true;
  user = null; selected = null; dirty = false; cursor = null;
  $('drafts').replaceChildren(); $('title').value = ''; $('input').value = '{}'; $('notes').value = ''; $('import').value = '';
  $('identity').textContent = 'Signed out'; $('login').hidden = true;
  $('revision').textContent = 'Not saved to your account yet.'; $('editor-heading').textContent = 'New private draft'; controls();
}
async function api(path, options = {}) {
  const requestEpoch = epoch;
  const response = await fetch('/api/community/' + path, { credentials: 'same-origin', cache: 'no-store', ...options });
  const data = await response.json();
  if (requestEpoch !== epoch) { const error = new Error('Account state changed.'); error.silent = true; throw error; }
  if (!response.ok) {
    if (response.status === 401) { reset(); $('login').hidden = false; }
    const error = new Error(data.code === 'COMMUNITY_DISABLED' ? 'Community accounts are not enabled yet. Nothing has been uploaded.' : data.error || 'Request failed.');
    error.status = response.status; throw error;
  }
  return data;
}
async function task(action) {
  if (busy) return;
  busy = true; controls();
  try { await action(); } catch (error) { if (!error.silent) notice(error.message); }
  finally { busy = false; controls(); }
}
function mayDiscard() { return !dirty || window.confirm('Discard unsaved editor changes? Export a local copy first if you want to keep them.'); }
function editor(draft = null) {
  clearRun();
  selected = draft ? { id: draft.id, revision: draft.revision } : null;
  $('title').value = draft?.title || ''; $('input').value = JSON.stringify(draft?.input || {}, null, 2); $('notes').value = draft?.privateNotes || '';
  $('editor-heading').textContent = draft ? 'Edit private draft' : 'New private draft';
  $('revision').textContent = draft ? `Saved revision ${draft.revision} · ${new Date(draft.updatedAt).toLocaleString()}` : 'Not saved to your account yet.';
  dirty = false; controls(); highlight();
}
function highlight() {
  for (const button of $('drafts').querySelectorAll('button')) button.setAttribute('aria-current', String(button.dataset.id === selected?.id));
}
function values() {
  let input;
  try { input = JSON.parse($('input').value); } catch { throw new Error('Input must be valid JSON. Your editor has not been changed.'); }
  if (!input || Array.isArray(input) || typeof input !== 'object') throw new Error('Input must be a JSON object.');
  if (new TextEncoder().encode(JSON.stringify(input)).length > 65536) throw new Error('Input exceeds 64 KiB.');
  if (!$('title').value.trim() || $('title').value.length > 200 || $('notes').value.length > 4000) throw new Error('Enter a title (1–200 characters) and notes of at most 4000 characters.');
  return { title: $('title').value.trim(), input, privateNotes: $('notes').value };
}
async function list(append = false) {
  const data = await api('drafts' + (append && cursor ? '?after=' + encodeURIComponent(cursor) : ''));
  if (!append) $('drafts').replaceChildren();
  for (const draft of data.drafts) {
    const li = document.createElement('li'), button = document.createElement('button'), detail = document.createElement('small');
    button.type = 'button'; button.dataset.id = draft.id; button.textContent = draft.title;
    detail.textContent = `Revision ${draft.revision} · ${new Date(draft.updatedAt).toLocaleDateString()}`; button.append(detail);
    button.addEventListener('click', () => { if (busy || !mayDiscard()) return; task(async () => { const data = await api('drafts/' + encodeURIComponent(draft.id)); editor(data.draft); notice('Private draft loaded.'); }); });
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Delete';
    remove.addEventListener('click', () => {
      if (busy) return;
      if (selected?.id === draft.id && !mayDiscard()) return;
      if (!window.confirm('Permanently delete this private draft and its saved runs? This cannot be undone. Published reports are not affected and must be withdrawn instead.')) return;
      task(async () => {
        await api('drafts/' + encodeURIComponent(draft.id), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: draft.revision }) });
        if (selected?.id === draft.id) editor();
        await list(); notice('Private draft deleted with its saved runs. Public history is unchanged.');
      });
    });
    li.append(button, remove); $('drafts').append(li);
  }
  cursor = data.nextCursor; $('more').hidden = !cursor; highlight();
}
async function session() {
  await task(async () => {
    const data = await api('me'); user = data.user; $('identity').textContent = user.moderator ? 'Signed in · Moderator account' : 'Signed in · Private account';
    $('login').hidden = true; editor(); await list(); notice('Your private workspace is ready. Saving does not publish or execute an audit.');
  });
}
$('form').addEventListener('input', () => { dirty = true; clearRun(); controls(); $('revision').textContent = selected ? `Unsaved edits · based on revision ${selected.revision}` : 'Unsaved new draft · not uploaded.'; });
$('new').addEventListener('click', () => { if (busy || !mayDiscard()) return; editor(); notice('New draft. Nothing is saved until you click Save.'); });
$('refresh').addEventListener('click', () => task(async () => { await list(); notice('Draft list refreshed. Editor changes were preserved.'); }));
$('more').addEventListener('click', () => task(() => list(true)));
$('reload').addEventListener('click', () => { if (busy || !selected || !mayDiscard()) return; task(async () => { const data = await api('drafts/' + selected.id); editor(data.draft); notice('Loaded the current saved revision.'); }); });
$('form').addEventListener('submit', event => {
  event.preventDefault(); if (!user) return;
  task(async () => {
    const data = values(); if (selected) data.revision = selected.revision;
    try {
      const result = await api('drafts' + (selected ? '/' + selected.id : ''), { method: selected ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      editor(result.draft); notice('Saved privately. This is stored input, not an audit result.');
    } catch (error) {
      if (error.status === 409) throw new Error('The saved draft changed or is unavailable. Your edits are still here. Export them before reloading the saved version; no overwrite was made.');
      throw error;
    }
    try { await list(); } catch { notice('Draft saved, but the list could not refresh. Refresh the list to retry.'); }
  });
});
$('export').addEventListener('click', () => {
  try {
    const blob = new Blob([JSON.stringify({ format: 'harshalos-private-draft-v1', ...values() })], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'harshalos-private-draft.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice('Exported editor contents, including private notes. Keep the downloaded file secure.');
  } catch (error) { notice(error.message); }
});
$('import').addEventListener('change', () => task(async () => {
  const file = $('import').files[0]; $('import').value = ''; if (!file || !mayDiscard()) return;
  if (file.size > 98304) throw new Error('Import exceeds 96 KiB.');
  const data = JSON.parse(await file.text());
  if (!data || data.format !== 'harshalos-private-draft-v1' || typeof data.title !== 'string' || !data.title.trim() || data.title.length > 200 || !data.input || typeof data.input !== 'object' || Array.isArray(data.input) || typeof data.privateNotes !== 'string' || data.privateNotes.length > 4000 || new TextEncoder().encode(JSON.stringify(data.input)).length > 65536) throw new Error('This is not a valid HarshalOS private-draft export.');
  editor(); $('title').value = data.title; $('input').value = JSON.stringify(data.input, null, 2); $('notes').value = data.privateNotes; dirty = true; controls();
  notice('Imported into this editor only. Click Save to create a new private draft in this account.');
}));
$('logout').addEventListener('click', () => { if (busy || !mayDiscard()) return; task(async () => { await api('auth/logout', { method: 'POST' }); reset(); $('login').hidden = false; notice('Signed out of HarshalOS. Your Auth0 provider session may still be active.'); }); });
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('pageshow', event => { if (event.persisted) { reset(); window.location.reload(); } });
function showRun(run) {
  clearPublicPreview(); $('public-author').value = '';
  const candidate = JSON.parse(JSON.stringify(run.report.input || {}));
  candidate.headerText = ''; candidate.publicKeyText = ''; candidate.trustedOrigin = '';
  $('public-input').value = JSON.stringify(candidate, null, 2);
  currentRun = run; $('execution').hidden = false; $('run-panel').hidden = false;
  const result = run.report.result;
  $('run-summary').textContent = `${result.phase} · Engine record: ${result.recordStatus} · UNREVIEWED`;
  $('run-source').textContent = `Saved revision ${run.revision}${run.revision !== selected.revision ? ' (older than the current draft)' : ''} · ${new Date(run.createdAt).toLocaleString()} · ${run.report.engine.specificationStatus}`;
  $('run-finding').textContent = result.finding;
  $('run-hash').textContent = `Report SHA-256: ${run.reportHash}. Content fingerprint, not a signature or verification.`;
  $('run-json').textContent = JSON.stringify(run.report, null, 2); controls();
}
async function runHistory(append = false) {
  const data = await api('drafts/' + selected.id + '/runs' + (append && runCursor ? '?after=' + encodeURIComponent(runCursor) : ''));
  $('execution').hidden = false;
  if (!append) $('run-history').replaceChildren();
  for (const run of data.runs) {
    const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
    button.textContent = `Revision ${run.revision} · ${run.phase} · ${new Date(run.createdAt).toLocaleString()}`;
    button.addEventListener('click', () => { if (busy || dirty) return; task(async () => { const data = await api('drafts/' + selected.id + '/runs/' + run.id); showRun(data.run); notice('Saved private run loaded. Check its revision and exact evaluated input; it is not a public report.'); }); });
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Delete';
    remove.addEventListener('click', () => {
      if (busy || dirty) return;
      if (!window.confirm('Permanently delete this saved private run? This cannot be undone. A run that anchors a published report cannot be deleted.')) return;
      task(async () => {
        await api('drafts/' + selected.id + '/runs/' + run.id, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        if (currentRun?.id === run.id) clearRun();
        await runHistory(); notice('Saved private run deleted. Any published report is unchanged.');
      });
    });
    li.append(button, remove); $('run-history').append(li);
  }
  runCursor = data.nextCursor; $('run-more').hidden = !runCursor;
  if (!append && !data.runs.length) notice('No saved runs for this draft yet.');
}
$('template').addEventListener('click', () => { if (busy || !mayDiscard()) return; task(async () => {
  const data = await api('audit-template?version=1.0'); editor(); $('input').value = JSON.stringify(data.input, null, 2); dirty = true;
  notice('Template loaded locally. Set the input name and cutoff, fill answers and evidence, then save. Nothing was uploaded.');
}); });
$('run').addEventListener('click', () => { if (busy || dirty || !selected) return; task(async () => {
  clearRun();
  const data = await api('drafts/' + selected.id + '/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: selected.revision }) });
  showRun(data.run); notice(data.reused ? 'Loaded the existing run for this revision and evaluator. Nothing was published.' : 'Saved a private rules calculation. Claims have not been independently verified. Nothing was published.');
}); });
$('history').addEventListener('click', () => { if (busy || dirty || !selected) return; task(() => runHistory()); });
$('run-more').addEventListener('click', () => { if (busy || dirty || !selected) return; task(() => runHistory(true)); });
$('run-export').addEventListener('click', () => {
  if (!currentRun || busy) return;
  const blob = new Blob([JSON.stringify({ format: 'ground0-private-run-export-v1', ...currentRun })], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'ground0-private-run.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice('Exported this private run and evaluated input. Dedicated draft notes are excluded, but input claims can still contain private information. Store the file securely.');
});
$('publication-fields').addEventListener('input', () => { clearPublicPreview(); controls(); });
$('public-consent').addEventListener('change', controls);
$('preview-public').addEventListener('click', () => {
  if (busy || dirty || !currentRun || currentRun.revision !== selected?.revision) return;
  task(async () => {
    clearPublicPreview();
    const input = JSON.parse($('public-input').value);
    const data = await api('public-preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: currentRun.id, input, author: $('public-author').value }) });
    publicPreview = data; $('public-preview').hidden = false;
    $('preview-meta').textContent = `Report SHA-256: ${data.reportHash} · Preview expires ${new Date(data.expiresAt).toLocaleTimeString()}. Fingerprint, not certification.`;
    $('preview-json').textContent = JSON.stringify(data.report, null, 2);
    notice('Review the entire exact public preview. Nothing is published yet. Any edits invalidate this preview.');
  });
});
$('publish-public').addEventListener('click', () => {
  if (busy || !publicPreview || !$('public-consent').checked) return;
  if (Date.now() >= publicPreview.expiresAt) { clearPublicPreview(); controls(); notice('Preview expired. Generate a new preview before publishing.'); return; }
  task(async () => {
    const result = await api('publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: publicPreview.token, acknowledgement: 'PUBLISH_PUBLIC_UNREVIEWED' }) });
    clearPublicPreview(); notice(`Public report ${result.publication.id} is ${result.publication.state}. Use My publications to view or withdraw it. Corrections require a new saved revision and preview.`);
    try { await myPublications(); } catch { if (user) notice(`Report ${result.publication.id} was published, but the list could not refresh. Load My publications to retry.`); }
  });
});
async function myPublications(append = false) {
  const data = await api('my-publications' + (append && myCursor ? '?after=' + encodeURIComponent(myCursor) : ''));
  if (!append) $('my-publication-list').replaceChildren();
  for (const publication of data.publications) {
    const li = document.createElement('li'), link = document.createElement('a');
    link.href = '/audits?id=' + encodeURIComponent(publication.id); link.textContent = `${publication.title || 'Removed report'} · version ${publication.version} · ${publication.state}`; li.append(link);
    if (publication.state === 'published') {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Withdraw';
      button.addEventListener('click', () => { if (busy || !window.confirm('Remove this public report and author label? Its hash and minimal history remain. External copies cannot be recalled.')) return; task(async () => { await api('publications/' + publication.id + '/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); await myPublications(); notice('Report withdrawn from this service.'); }); }); li.append(button);
    }
    $('my-publication-list').append(li);
  }
  myCursor = data.nextCursor; $('my-publication-more').hidden = !myCursor;
}
$('my-publications').addEventListener('click', () => task(() => myPublications()));
$('my-publication-more').addEventListener('click', () => task(() => myPublications(true)));
async function moderationQueue() {
  const data = await api('moderation'); $('moderation-list').replaceChildren();
  for (const report of data.reports) {
    const li = document.createElement('li'), link = document.createElement('a'), details = document.createElement('p'), note = document.createElement('textarea');
    link.href = '/audits?id=' + encodeURIComponent(report.publicationId); link.textContent = 'Inspect public report'; details.textContent = report.details;
    note.maxLength = 2000; note.setAttribute('aria-label', 'Private moderator note'); note.placeholder = 'Private moderator note'; li.append(link, details, note);
    for (const [action, label] of [['dismiss','Dismiss report'],['hide','Hide publication'],['hide-and-block','Hide all by author and block']]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.addEventListener('click', () => { if (busy || !window.confirm(label + '? This does not certify any findings.')) return; task(async () => { await api('moderation/' + report.id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note: note.value }) }); await moderationQueue(); notice('Moderation action recorded privately.'); }); }); li.append(button);
    }
    $('moderation-list').append(li);
  }
  if (!data.reports.length) notice('No unresolved reports.');
}
$('moderation-load').addEventListener('click', () => task(moderationQueue));
reset(); session();
