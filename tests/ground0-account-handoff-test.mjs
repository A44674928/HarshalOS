import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/g0-app.js', import.meta.url), 'utf8');
const account = readFileSync(new URL('../js/community.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../account.html', import.meta.url), 'utf8');

test('Ground-0 detail offers an explicit private-account handoff for non-baseline local records', () => {
  assert.match(app, /data-act="saveToAccount"/);
  assert.match(app, /!audit\.baseline/);
  assert.match(app, /ground0-local-audit-handoff-v1/);
  assert.match(app, /ground0-private-account-handoff-v1/);
  assert.match(app, /window\.location\.href = "\/account#ground0-import"/);
  assert.match(app, /64 KiB private-draft limit/);
});

test('account handoff requires an explicit load and normal private-draft save', () => {
  assert.match(html, /id="ground0-handoff"/);
  assert.match(html, /id="load-ground0-handoff"/);
  assert.match(html, /Loading does not upload or publish anything/);
  assert.match(account, /function loadGround0Handoff\(\)/);
  assert.match(account, /ground0-local-audit-import-v1/);
  assert.match(account, /click Save private draft to send it to your private account/);
  assert.match(account, /api\('drafts'/);
  assert.match(account, /localStorage\.removeItem\(GROUND0_HANDOFF_KEY\)/);
});

test('handoff keeps the source record separate from server-computed run output and publication', () => {
  assert.match(account, /originalRecordWithoutInput: recordWithoutInput/);
  assert.match(account, /This is a private import snapshot, not independent verification, certification, or publication/);
  assert.match(account, /Saving does not publish or execute an audit/);
});
