// End-to-end flow test. Boots the app, drives real HTTP, asserts each state transition.
process.env.DB_PATH = '/tmp/pw-test/db.sqlite';
process.env.PORT = '4123';
process.env.CHECK_INTERVAL_MS = '400';
process.env.SECRET = 'test-secret';
import { rmSync } from 'node:fs';
try { rmSync('/tmp/pw-test', { recursive: true, force: true }); } catch {}
await import('../server.js');
const db = await import('../db.js');
const BASE = 'http://localhost:4123';
let cookie = '';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL:', m); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function req(path, { method = 'GET', body, form } = {}) {
  const headers = { Cookie: cookie, Origin: BASE };
  let payload;
  if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; payload = new URLSearchParams(form).toString(); }
  const r = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' });
  const sc = r.headers.get('set-cookie'); if (sc) { const m = sc.match(/sid=([^;]+)/); if (m) cookie = 'sid=' + m[1]; }
  const text = await r.text();
  return { status: r.status, text, loc: r.headers.get('location') };
}
async function monitorStatusFromDetail(id) {
  const r = await req('/app/m/' + id);
  if (/badge down/.test(r.text)) return 'down';
  if (/badge up/.test(r.text)) return 'up';
  if (/badge paused/.test(r.text)) return 'paused';
  return 'new';
}

await sleep(300);
console.log('\n== Pulsewatch end-to-end flow ==');

// 1. health
let r = await req('/healthz'); ok(r.status === 200 && /"ok":true/.test(r.text), 'health endpoint responds');

// 2. landing loads and sells
r = await req('/'); ok(r.status === 200 && /speak up/.test(r.text), 'landing page renders');

// 3. signup
r = await req('/signup', { method: 'POST', form: { email: 'founder@test.com', password: 'supersecret1' } });
ok(r.status === 302 && r.loc === '/app' && /sid=/.test(cookie), 'signup creates account + session');

// 4. auth-gated dashboard shows onboarding
r = await req('/app'); ok(r.status === 200 && /Welcome to Pulsewatch/.test(r.text), 'dashboard shows first-run onboarding');

// 5. create monitor (fast period so we can watch it fail)
r = await req('/app/new', { method: 'POST', form: { name: 'Test Backup', period: '1', grace: '1' } });
ok(r.status === 302 && /\/app\/m\//.test(r.loc), 'monitor created + redirect to detail');
const id = r.loc.split('/').pop();

// 6. detail page shows waiting-for-first-ping
r = await req('/app/m/' + id);
ok(/Waiting for the first ping/.test(r.text), 'new monitor shows "waiting for first ping"');
const token = (r.text.match(/\/ping\/([A-Za-z0-9_-]{6,})/) || [])[1];
ok(!!token, 'unique ping token present in UI');

// 7. first ping -> up
r = await fetch(`${BASE}/ping/${token}`); const pj = await r.json();
ok(r.status === 200 && pj.status === 'up', 'ping arms monitor -> UP');
ok((await monitorStatusFromDetail(id)) === 'up', 'dashboard reflects UP after ping');

// 8. force the due time into the past -> scheduler must mark DOWN on next tick
db.updateMonitor(id, { next_due_at: Date.now() - 1000 });
await sleep(700); // > one check interval
ok((await monitorStatusFromDetail(id)) === 'down', 'scheduler detects missed check-in -> DOWN');

// 9. ping again -> recovery
r = await fetch(`${BASE}/ping/${token}`); await r.json();
await sleep(150);
ok((await monitorStatusFromDetail(id)) === 'up', 'recovery ping -> UP again');
r = await req('/app/m/' + id);
ok(/Recovered/.test(r.text) && /Went DOWN/.test(r.text), 'event history records DOWN and Recovered');

// 10. explicit /fail signal on a second monitor
r = await req('/app/new', { method: 'POST', form: { name: 'Report Job', period: '3600', grace: '300' } });
const id2 = r.loc.split('/').pop();
r = await req('/app/m/' + id2); const token2 = (r.text.match(/\/ping\/([A-Za-z0-9_-]{6,})/) || [])[1];
await fetch(`${BASE}/ping/${token2}`);            // arm it up
await fetch(`${BASE}/ping/${token2}/fail`);       // report failure
await sleep(150);
ok((await monitorStatusFromDetail(id2)) === 'down', 'explicit /fail signal -> immediate DOWN');

// 11. isolation: unknown token 404s, no cross-account access
r = await fetch(`${BASE}/ping/doesnotexist123`); ok(r.status === 404, 'unknown ping token -> 404');
cookie = ''; // log out
r = await req('/app'); ok(r.status === 302 && r.loc === '/login', 'unauthenticated dashboard -> redirect to login');

// 12. wrong password rejected
r = await req('/login', { method: 'POST', form: { email: 'founder@test.com', password: 'wrongpass9' } });
ok(r.status === 401, 'wrong password rejected');

console.log(`\nRESULT: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
