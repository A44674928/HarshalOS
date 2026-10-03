const $ = id => document.getElementById(id);
let user = null, selected = null, dirty = false, busy = false, cursor = null, currentRun = null, runCursor = null, epoch = 0;
const notice = text => { $('notice').textContent = text; };
function controls() {
  $('workspace').hidden = !user; $('logout').hidden = !user;
  $('fields').disabled = busy || !user;
  for (const id of ['new', 'refresh', 'more', 'logout']) $(id).disabled = busy;
  for (const button of $('drafts').querySelectorAll('button')) button.disabled = busy;
  $('reload').hidden = !selected;
  for (const id of ['run', 'history', 'run-more']) $(id).disabled = busy || !user || !selected || dirty;
  $('run-export').disabled = busy || !currentRun;
  for (const button of $('run-history').querySelectorAll('button')) button.disabled = busy || dirty;
}
function clearRun() {
  currentRun = null; runCursor = null; $('execution').hidden = true; $('run-panel').hidden = true; $('run-more').hidden = true;
  $('run-history').replaceChildren();
  for (const id of ['run-summary', 'run-source', 'run-finding', 'run-hash', 'run-json']) $(id).textContent = '';
}
function reset() {
  epoch++; clearRun();
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
    li.append(button); $('drafts').append(li);
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
    li.append(button); $('run-history').append(li);
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
reset(); session();
