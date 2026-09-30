/* Private, explicit cloud copies. Never upload browser credentials or live authority. */
"use strict";
(() => {
  const session = crypto.randomUUID ? crypto.randomUUID() : null;
  let revision = null;
  let stale = false;
  const epochKey = 'hos-cloud-storage-epoch';
  let epoch;
  try { epoch = localStorage.getItem(epochKey); } catch { epoch = null; }
  window.HOSCloudStorageGuard = () => {
    try { return !stale && localStorage.getItem(epochKey) === epoch; } catch { return !stale; }
  };
  window.addEventListener('storage', event => {
    if (event.key === null || [epochKey, 'ground-0-audits-v1', 'ground-0-evidence-v1'].includes(event.key)) stale = true;
  });
  function assertCurrent() {
    if (!window.HOSCloudStorageGuard()) throw new Error('Another tab changed saved Ground-0 data. Export any unsaved work and reload before saving or restoring.');
  }
  const keys = ['ground-0-audits-v1', 'ground-0-evidence-v1'];
  const localSnapshot = () => ({ audits: G0.loadAuditRecords(), evidence: G0.loadEvidenceRecords() });
  async function request(path, method = 'GET', data) {
    const response = await fetch('/api/storage/' + path, {
      method, credentials: 'same-origin', redirect: 'error',
      headers: data ? { 'Content-Type': 'application/json' } : {},
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(30000)
    });
    if (!response.headers.get('Content-Type')?.includes('application/json')) throw new Error('Private API unavailable. Open the Access-protected deployment and sign in.');
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || `Storage request failed (${response.status}).`);
    return value;
  }
  APPS.push({
    id: 'cloudstorage', title: 'Cloud Storage', short: 'Cloud Storage', glyph: '☁',
    desc: 'Private MongoDB copies of Ground-0 records and PLV sessions', w: 760, h: 660,
    render(body) {
      body.innerHTML = `
        <div class="h1">Private Cloud Storage</div>
        <div class="sub">MongoDB Atlas · owner-only Cloudflare Access · explicit saves, not automatic sync</div>
        <div class="rule-box">Local work stays in this browser until you save it here. Cloud saves include Ground-0 audits and evidence, including retrieved source text. LLM keys, preferences, and live Human Key state are not included.</div>
        <p><button type="button" data-action="status">Check connection</button></p>
        <div class="h2">Ground-0 workspace</div>
        <p>Close Ground-0 before restoring. Restore replaces local saved audits and evidence and reloads the page; unsaved drafts will be lost. Saving replaces the cloud snapshot only if its revision still matches.</p>
        <p><button type="button" data-action="local">Export local backup</button>
        <button type="button" data-action="download">Download cloud copy</button></p>
        <p><button type="button" data-action="save">Save local records to cloud</button>
        <button type="button" data-action="restore">Restore cloud records to this browser</button></p>
        <div class="h2">PLV session archive</div>
        <p>Archive the current session before leaving or reloading. Previously archived rows cannot be changed through this API. Hashes verify chain integrity, not the truth of events; the existing hash does not cover the declared-phase label. Database administrators can still alter stored data.</p>
        <p><button type="button" data-action="archive">Archive current ledger</button>
        <button type="button" data-action="ledgers">List recent archives</button></p>
        <div data-sessions></div>
        <div class="rule-box" role="status" aria-live="polite" data-status>Local-only until you explicitly save. Maximum upload: 4 MiB. A connection check does not save anything.</div>`;
      const status = body.querySelector('[data-status]');
      const setStatus = text => { status.textContent = text; };
      async function run(action) {
        body.querySelectorAll('button').forEach(b => { b.disabled = true; });
        try { await action(); }
        catch (error) { setStatus(error.message + ' Keep a local export; after a timeout, check the cloud copy before retrying.'); }
        finally { body.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
      }
      body.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => run(async () => {
        const action = button.dataset.action;
        if (action === 'status') {
          const value = await request('status');
          setStatus(`Connected as ${value.owner}. Nothing uploaded.`);
        } else if (action === 'local') {
          G0.downloadFile('harshalos-local-backup.json', JSON.stringify(localSnapshot(), null, 2));
          setStatus('Local backup download requested. Confirm the file is saved before restoring.');
        } else if (action === 'download') {
          const value = await request('snapshot');
          G0.downloadFile('harshalos-cloud-snapshot.json', JSON.stringify(value, null, 2));
          setStatus('Cloud download requested. Local data and revision are unchanged.');
        } else if (action === 'save') {
          assertCurrent();
          if (!confirm('Save local audits and evidence to your private cloud snapshot? This is not a merge.')) return;
          const value = await request('snapshot', 'PUT', { ...localSnapshot(), revision });
          revision = value.revision;
          setStatus(`Cloud snapshot saved at ${value.updatedAt}. Later local edits are not automatically saved.`);
        } else if (action === 'restore') {
          assertCurrent();
          const value = await request('snapshot');
          if (!value.revision) throw new Error('No cloud snapshot exists yet.');
          if (!Array.isArray(value.audits) || !Array.isArray(value.evidence)) throw new Error('Invalid cloud snapshot.');
          const audits = value.audits.map(G0.normalizeAuditRecord);
          const evidence = value.evidence.map(G0.normalizeEvidence);
          if (audits.some(x => !x) || evidence.some(x => !x)) throw new Error('Cloud records failed validation; download them for review instead.');
          if (!confirm(`Replace local saved records with ${audits.length} cloud audits and ${evidence.length} evidence records, and reload? Export a local backup first. Unsaved drafts and unarchived ledger rows will be lost.`)) return;
          assertCurrent();
          const before = keys.map(key => localStorage.getItem(key));
          try {
            // Keep a recovery copy too; do not proceed if browser storage is full.
            if (localStorage.getItem('hos-cloud-restore-recovery')) throw new Error('A previous recovery copy exists.');
            localStorage.setItem('hos-cloud-restore-recovery', JSON.stringify({ audits: before[0], evidence: before[1] }));
            localStorage.setItem(epochKey, crypto.randomUUID());
            localStorage.setItem(keys[0], JSON.stringify(audits));
            localStorage.setItem(keys[1], JSON.stringify(evidence));
            sessionStorage.setItem('hos-cloud-restored-revision', value.revision);
          } catch (error) {
            keys.forEach((key, i) => { try { if (before[i] === null) localStorage.removeItem(key); else localStorage.setItem(key, before[i]); } catch { /* Recovery copy remains available. */ } });
            throw new Error('Restore could not complete. Check browser storage and export/remove any existing hos-cloud-restore-recovery copy before retrying.');
          }
          location.reload();
        } else if (action === 'archive') {
          if (!session) throw new Error('Ledger archiving requires a secure browser context.');
          const value = await request('ledger/' + session, 'PUT', { rows: kernel.ledger.slice() });
          setStatus(`Archived ${value.saved} ledger rows at ${value.receivedAt}. New rows require another archive.`);
        } else if (action === 'ledgers') {
          const value = await request('ledgers');
          const list = body.querySelector('[data-sessions]'); list.replaceChildren();
          for (const item of value.sessions) {
            const p = document.createElement('p'); const download = document.createElement('button');
            download.type = 'button'; download.textContent = `Download ${item.receivedAt} · ${item.session}`;
            download.addEventListener('click', () => run(async () => {
              const data = await request('ledger/' + encodeURIComponent(item.session));
              G0.downloadFile(`plv-${item.session}.json`, JSON.stringify(data, null, 2));
              setStatus('Ledger download requested.');
            }));
            p.append(download); list.append(p);
          }
          setStatus(`${value.sessions.length} recent archives (up to 100).`);
        }
      })));
    }
  });
  try {
    revision = sessionStorage.getItem('hos-cloud-restored-revision') || null;
    sessionStorage.removeItem('hos-cloud-restored-revision');
  } catch { /* Null revision safely refuses to overwrite an existing cloud copy. */ }
})();
