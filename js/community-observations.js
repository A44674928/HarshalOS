const $ = id => document.getElementById(id);
const selected = new URL(location.href).searchParams.get('id');
let busy = false;
let feedCursor = null;
let profile = null;
let claimed = null;
let user = null;

function notice(message) { $('observation-notice').textContent = message; }

function controls() {
  for (const button of document.querySelectorAll('button')) button.disabled = busy;
  $('publisher-workspace').hidden = !user;
  $('observation-login').hidden = Boolean(user);
  $('claimed-observation').hidden = !claimed;
  $('publish-observation').disabled = busy || !claimed || !$('publish-consent').checked;
}

async function api(path, options = {}) {
  const response = await fetch('/api/community/' + path, {
    cache: 'no-store',
    credentials: 'same-origin',
    ...options
  });
  let data;
  try { data = await response.json(); }
  catch { throw new Error('The Community service returned an invalid response.'); }
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function task(action) {
  if (busy) return;
  busy = true;
  controls();
  try { await action(); }
  catch (error) { notice(error.message || 'Request failed.'); }
  finally { busy = false; controls(); }
}

function observationItem(observation) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  const meta = document.createElement('p');
  link.href = '/observations?id=' + encodeURIComponent(observation.id);
  link.textContent = observation.state === 'published' ? observation.text.slice(0, 120) + (observation.text.length > 120 ? '…' : '') : 'Removed observation';
  meta.className = 'muted';
  meta.textContent = observation.state === 'published'
    ? `UNREVIEWED · ${observation.phase} · ${observation.author} · ${new Date(observation.publishedAt).toLocaleString()}`
    : `${observation.state} · ${new Date(observation.changedAt).toLocaleString()}`;
  item.append(link, meta);
  return item;
}

async function loadFeed(append = false) {
  const response = await api('observations' + (append && feedCursor ? '?after=' + encodeURIComponent(feedCursor) : ''));
  if (!append) $('observation-feed').replaceChildren();
  for (const observation of response.observations) $('observation-feed').append(observationItem(observation));
  if (!append && !response.observations.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No public observations yet.';
    $('observation-feed').append(empty);
  }
  feedCursor = response.nextCursor;
  $('observation-more').hidden = !feedCursor;
}

async function loadDetail() {
  if (!selected) return;
  const response = await api('observations/' + encodeURIComponent(selected));
  const observation = response.observation;
  $('observation-detail').hidden = false;
  $('observation-state').textContent = observation.state === 'published' ? 'UNREVIEWED' : observation.state.toUpperCase();
  $('observation-meta').textContent = `Published ${new Date(observation.publishedAt).toLocaleString()} · Content SHA-256: ${observation.contentHash}`;
  if (observation.state === 'published') {
    $('observation-title').textContent = `${observation.phase} observation · ${observation.author}`;
    $('observation-text').textContent = observation.text;
    $('observation-scope').textContent = 'Exact author-approved public observation. Its phase is a self-declared snapshot, not a platform classification or authorization.';
  } else {
    $('observation-title').textContent = 'Removed observation';
    $('observation-text').textContent = '';
    $('observation-scope').textContent = 'The public content and author label have been removed from this service. Only a minimal tombstone and content hash remain.';
  }
}

async function loadProfile() {
  const response = await api('observation-profile');
  profile = response.profile;
  $('profile-pseudonym').value = profile.pseudonym || '';
}

async function loadMine() {
  const response = await api('my-observations');
  $('my-observations').replaceChildren();
  for (const observation of response.observations) {
    const item = observationItem(observation);
    if (observation.state === 'published') {
      const withdraw = document.createElement('button');
      withdraw.type = 'button';
      withdraw.textContent = 'Withdraw';
      withdraw.addEventListener('click', () => task(async () => {
        if (!window.confirm('Withdraw this public note? The service will redact its author, phase, and text. External copies cannot be recalled.')) return;
        await api('observations/' + encodeURIComponent(observation.id) + '/withdraw', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        });
        await Promise.all([loadMine(), loadFeed()]);
        notice('Observation withdrawn from this service.');
      }));
      item.append(withdraw);
    }
    $('my-observations').append(item);
  }
  if (!response.observations.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No public observations in this account yet.';
    $('my-observations').append(empty);
  }
}

async function loadSession() {
  try {
    const response = await api('me');
    user = response.user;
    $('publisher-status').textContent = user.moderator
      ? 'Signed in to the Community publisher · moderator account.'
      : 'Signed in to the Community publisher.';
    await Promise.all([loadProfile(), loadMine()]);
  } catch (error) {
    user = null;
    $('publisher-status').textContent = error.status === 401
      ? 'Sign in on this HarshalOS site to claim and publish a note.'
      : 'Community publishing is unavailable. Nothing was published.';
  }
  controls();
}

$('observation-more').addEventListener('click', () => task(() => loadFeed(true)));
$('save-profile').addEventListener('click', () => task(async () => {
  const response = await api('observation-profile', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pseudonym: $('profile-pseudonym').value })
  });
  profile = response.profile;
  $('profile-pseudonym').value = profile.pseudonym || '';
  notice('Public profile pseudonym saved. It is self-chosen, not identity verification.');
}));
$('claim-observation').addEventListener('click', () => task(async () => {
  const response = await api('observation-handoffs/claim', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claimCode: $('claim-code').value.trim().toUpperCase() })
  });
  claimed = response.handoff;
  $('claimed-meta').textContent = `${claimed.phase} · expires ${new Date(claimed.expiresAt).toLocaleTimeString()} · suggested profile: ${claimed.suggestedPseudonym}`;
  $('claimed-text').textContent = claimed.text;
  $('publish-consent').checked = false;
  if (!profile?.pseudonym) $('profile-pseudonym').value = claimed.suggestedPseudonym;
  notice('Review the exact candidate. Saving a profile and checking Publish are separate explicit actions.');
}));
$('publish-consent').addEventListener('change', controls);
$('publish-observation').addEventListener('click', () => task(async () => {
  if (!claimed || !$('publish-consent').checked) return;
  const response = await api('observation-handoffs/' + encodeURIComponent(claimed.id) + '/publish', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acknowledgement: 'PUBLISH_PUBLIC_OBSERVATION' })
  });
  const observation = response.observation;
  claimed = null;
  $('claim-code').value = '';
  $('publish-consent').checked = false;
  await Promise.all([loadMine(), loadFeed()]);
  notice(`Public observation ${observation.id} is published and listed as UNREVIEWED.`);
}));
$('my-observations-load').addEventListener('click', () => task(loadMine));
$('observation-logout').addEventListener('click', () => task(async () => {
  await api('auth/logout', { method: 'POST' });
  user = null;
  profile = null;
  claimed = null;
  $('profile-pseudonym').value = '';
  $('claim-code').value = '';
  $('my-observations').replaceChildren();
  $('publisher-status').textContent = 'Signed out of HarshalOS. Your identity-provider session may still be active.';
  notice('Signed out of the Community publisher.');
}));

task(async () => {
  await Promise.all([loadFeed(), loadDetail()]);
  await loadSession();
  if (!selected) notice('Public notes are author-submitted and UNREVIEWED. A public pseudonym is not verified identity.');
});
