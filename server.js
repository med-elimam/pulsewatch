// server.js — Pulsewatch. Single-process HTTP server + failure-detection scheduler. Zero deps.
import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import * as db from './db.js';
import * as A from './alerts.js';
import { landing, pricing, docs, authPage, legalPage } from './views.js';
import { dashboard, newMonitor, monitorDetail } from './views-app.js';

const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.SECRET || 'dev-insecure-secret-change-me';
if (SECRET === 'dev-insecure-secret-change-me' && process.env.NODE_ENV === 'production')
  console.warn('[warn] SECRET is not set — set a strong SECRET env var in production.');
const FREE_LIMIT = 5;
const COMPANY_NAME = process.env.COMPANY_NAME || 'Pulsewatch';
const LEGAL_EMAIL = process.env.LEGAL_EMAIL || 'support@pulsewatch.io';

// ---------- helpers ----------
const send = (res, code, body, headers = {}) => {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
};
const redirect = (res, loc, cookie) => {
  const h = { Location: loc }; if (cookie) h['Set-Cookie'] = cookie;
  res.writeHead(302, h); res.end();
};
const json = (res, code, obj) => send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json' });

function baseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  return `${proto}://${req.headers.host}`;
}
function parseCookies(req) {
  const out = {}; (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  }); return out;
}
function sign(uid) {
  const payload = Buffer.from(JSON.stringify({ uid, exp: Date.now() + 7 * 864e5 })).toString('base64url');
  const mac = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}
function verify(cookie) {
  if (!cookie || !cookie.includes('.')) return null;
  const [payload, mac] = cookie.split('.');
  const good = createHmac('sha256', SECRET).update(payload).digest('base64url');
  try { if (!timingSafeEqual(Buffer.from(mac), Buffer.from(good))) return null; } catch { return null; }
  try { const d = JSON.parse(Buffer.from(payload, 'base64url').toString()); if (d.exp < Date.now()) return null; return d.uid; } catch { return null; }
}
function sessionCookie(val, maxAgeSec) {
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  return `sid=${encodeURIComponent(val)}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${maxAgeSec}`;
}
function currentUser(req) {
  const uid = verify(parseCookies(req).sid); return uid ? db.getUserById(uid) : null;
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = ''; req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch { return resolve({}); } }
      const out = {}; new URLSearchParams(data).forEach((v, k) => out[k] = v); resolve(out);
    });
  });
}
function sameOrigin(req) { // basic CSRF guard for state-changing app routes
  const o = req.headers.origin; if (!o) return true; // curl/no-origin allowed
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}
const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || ''));

// ---------- ping / state transitions ----------
function armNextDue(m, t = db.now()) { return t + (m.period_seconds + m.grace_seconds) * 1000; }

async function handlePing(req, res, token, kind) {
  const m = db.getMonitorByToken(token);
  if (!m) return json(res, 404, { ok: false, error: 'monitor not found' });
  const user = db.getUserById(m.user_id);
  const t = db.now();

  if (kind === 'start') {
    db.updateMonitor(m.id, { last_start_at: t });
    db.addEvent(m.id, 'start', 'Job started');
    return json(res, 200, { ok: true, recorded: 'start' });
  }

  if (kind === 'fail') {
    db.addEvent(m.id, 'fail', 'Job reported failure');
    if (!m.paused && m.status !== 'down') {
      db.updateMonitor(m.id, { status: 'down' });
      db.addEvent(m.id, 'down', 'Marked down: explicit failure signal');
      A.sendFailureAlert(db.getMonitor(m.id), user).catch(() => {});
    }
    return json(res, 200, { ok: true, recorded: 'fail' });
  }

  // success
  const prev = m.status;
  const fields = { last_ping_at: t, next_due_at: armNextDue(m, t) };
  if (m.last_start_at) { fields.last_duration_ms = t - m.last_start_at; fields.last_start_at = null; }
  if (!m.paused) fields.status = 'up';
  db.updateMonitor(m.id, fields);
  db.addEvent(m.id, 'success', 'Checked in OK');
  if (prev === 'down' && !m.paused) {
    const lastDown = db.listEvents(m.id, 100).find(e => e.type === 'down');
    const downForMs = lastDown ? t - lastDown.created_at : 0;
    db.addEvent(m.id, 'up', 'Recovered');
    A.sendRecoveryAlert(db.getMonitor(m.id), user, downForMs).catch(() => {});
  }
  return json(res, 200, { ok: true, status: m.paused ? 'paused' : 'up' });
}

// ---------- background scheduler ----------
let ticking = false;
function tick() {
  if (ticking) return; ticking = true;
  try {
    const t = db.now();
    const overdue = db.db.prepare(
      `SELECT * FROM monitors WHERE paused = 0 AND status = 'up' AND next_due_at IS NOT NULL AND next_due_at < ?`
    ).all(t);
    for (const m of overdue) {
      db.updateMonitor(m.id, { status: 'down' });
      db.addEvent(m.id, 'down', `Missed check-in (due ${new Date(m.next_due_at).toISOString()})`);
      const user = db.getUserById(m.user_id);
      A.sendFailureAlert(db.getMonitor(m.id), user).catch(() => {});
      console.log(`[monitor] DOWN: ${m.name} (${m.id})`);
    }
  } catch (e) { console.error('[scheduler] error', e.message); }
  ticking = false;
}

// ---------- router ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const path = url.pathname;
    const method = req.method;
    const app = baseUrl(req);

    // health
    if (path === '/healthz') return json(res, 200, { ok: true, time: Date.now() });

    // ping API (open by design)
    let pm;
    if ((pm = path.match(/^\/ping\/([A-Za-z0-9_-]{6,})(\/(start|fail))?$/))) {
      if (method !== 'GET' && method !== 'POST' && method !== 'HEAD') return json(res, 405, { ok: false });
      return handlePing(req, res, pm[1], pm[3] || 'success');
    }

    const user = currentUser(req);

    // public pages
    if (path === '/' && method === 'GET') return send(res, 200, landing({ user }));
    if (path === '/pricing' && method === 'GET') return send(res, 200, pricing({ user }));
    if (path === '/docs' && method === 'GET') return send(res, 200, docs({ user, appUrl: app }));
    if (method === 'GET' && (path === '/terms' || path === '/privacy' || path === '/refunds')) {
      const kind = path === '/terms' ? 'terms' : path === '/privacy' ? 'privacy' : 'refunds';
      return send(res, 200, legalPage({ kind, user, company: COMPANY_NAME, email: LEGAL_EMAIL }));
    }

    // auth
    if (path === '/signup' && method === 'GET') return send(res, user ? 302 : 200, user ? '' : authPage({ mode: 'signup' }), user ? { Location: '/app' } : {});
    if (path === '/login' && method === 'GET') return send(res, user ? 302 : 200, user ? '' : authPage({ mode: 'login' }), user ? { Location: '/app' } : {});
    if (path === '/signup' && method === 'POST') {
      const b = await readBody(req);
      if (!validEmail(b.email)) return send(res, 400, authPage({ mode: 'signup', error: 'Enter a valid email.', email: b.email }));
      if (!b.password || b.password.length < 8) return send(res, 400, authPage({ mode: 'signup', error: 'Password must be at least 8 characters.', email: b.email }));
      if (db.getUserByEmail(b.email)) return send(res, 400, authPage({ mode: 'signup', error: 'That email already has an account. Try logging in.', email: b.email }));
      const u = db.createUser(b.email, b.password);
      return redirect(res, '/app', sessionCookie(sign(u.id), 7 * 86400));
    }
    if (path === '/login' && method === 'POST') {
      const b = await readBody(req);
      const u = db.getUserByEmail(b.email || '');
      if (!u || !db.verifyPassword(b.password || '', u.pw_salt, u.pw_hash))
        return send(res, 401, authPage({ mode: 'login', error: 'Wrong email or password.', email: b.email }));
      return redirect(res, '/app', sessionCookie(sign(u.id), 7 * 86400));
    }
    if (path === '/logout' && method === 'POST') return redirect(res, '/', sessionCookie('', 0));

    // everything below requires auth
    if (path === '/app' || path.startsWith('/app/')) {
      if (!user) return redirect(res, '/login');
      if (method === 'POST' && !sameOrigin(req)) return send(res, 403, 'Bad origin');

      if (path === '/app' && method === 'GET') {
        const monitors = db.listMonitors(user.id);
        return send(res, 200, dashboard({ user, monitors, appUrl: app, flash: url.searchParams.get('flash') }));
      }
      if (path === '/app/new' && method === 'GET') return send(res, 200, newMonitor({ user }));
      if (path === '/app/new' && method === 'POST') {
        const b = await readBody(req);
        if (db.countMonitors(user.id) >= FREE_LIMIT) return send(res, 200, newMonitor({ user, error: `Free plan is limited to ${FREE_LIMIT} monitors. Upgrade for more.`, values: b }));
        if (!b.name || !b.name.trim()) return send(res, 400, newMonitor({ user, error: 'Give your monitor a name.', values: b }));
        if (b.alert_email && !validEmail(b.alert_email)) return send(res, 400, newMonitor({ user, error: 'Alert email is not valid.', values: b }));
        const m = db.createMonitor(user.id, {
          name: b.name.trim(),
          period_seconds: Math.max(30, parseInt(b.period) || 3600),
          grace_seconds: Math.max(0, parseInt(b.grace) || 300),
          slack_webhook: (b.slack_webhook || '').trim() || null,
          alert_email: (b.alert_email || '').trim() || null,
        });
        return redirect(res, `/app/m/${m.id}`);
      }
      if (path === '/app/upgrade' && method === 'POST') {
        const b = await readBody(req); db.recordUpgrade(user.id, b.plan || 'pro');
        return redirect(res, '/app?flash=' + encodeURIComponent("Thanks — your interest in the " + (b.plan || 'Pro') + " plan is noted. We'll be in touch."));
      }

      let mm;
      if ((mm = path.match(/^\/app\/m\/([0-9a-f-]{36})(\/(edit|pause|delete|test))?$/))) {
        const m = db.getMonitorForUser(mm[1], user.id);
        if (!m) return send(res, 404, dashboard({ user, monitors: db.listMonitors(user.id), appUrl: app, flash: 'Monitor not found.' }));
        const action = mm[3];
        if (!action && method === 'GET')
          return send(res, 200, monitorDetail({ user, m, events: db.listEvents(m.id, 50), appUrl: app }));
        if (action === 'test' && method === 'POST') {
          const r = await A.sendTestAlert(m, user); db.addEvent(m.id, 'test', 'Test alert sent');
          const note = A.emailConfigured() || m.slack_webhook || process.env.SLACK_WEBHOOK_URL
            ? 'Test alert sent — check your email/Slack.'
            : 'Test alert fired, but no email/Slack is configured yet (see server logs). Add a Slack webhook or set email credentials.';
          return redirect(res, `/app/m/${m.id}`);
        }
        if (action === 'pause' && method === 'POST') {
          const paused = m.paused ? 0 : 1;
          db.updateMonitor(m.id, { paused, status: paused ? 'paused' : (m.last_ping_at ? 'up' : 'new'), next_due_at: paused ? m.next_due_at : armNextDue(m) });
          db.addEvent(m.id, paused ? 'paused' : 'resumed', paused ? 'Paused by user' : 'Resumed by user');
          return redirect(res, `/app/m/${m.id}`);
        }
        if (action === 'delete' && method === 'POST') { db.deleteMonitor(m.id); return redirect(res, '/app?flash=' + encodeURIComponent('Monitor deleted.')); }
        if (action === 'edit' && method === 'POST') {
          const b = await readBody(req);
          if (b.alert_email && !validEmail(b.alert_email)) return send(res, 400, monitorDetail({ user, m, events: db.listEvents(m.id, 50), appUrl: app, error: 'Alert email is not valid.' }));
          db.updateMonitor(m.id, {
            name: (b.name || m.name).trim(),
            period_seconds: Math.max(30, parseInt(b.period_seconds) || m.period_seconds),
            grace_seconds: Math.max(0, parseInt(b.grace_seconds) || 0),
            slack_webhook: (b.slack_webhook || '').trim() || null,
            alert_email: (b.alert_email || '').trim() || null,
          });
          return redirect(res, `/app/m/${m.id}`);
        }
      }
    }

    return send(res, 404, landing({ user }).replace('<title>', '<title>Not found · '));
  } catch (e) {
    console.error('[server] error', e);
    return send(res, 500, 'Internal error');
  }
});

const CHECK_MS = Number(process.env.CHECK_INTERVAL_MS || 15000);
setInterval(tick, CHECK_MS);
function startupSelfCheck() {
  const prov = A.emailProvider();
  const secretOk = SECRET !== 'dev-insecure-secret-change-me';
  const lines = [
    '─────────────────────────────────────────────',
    ' Pulsewatch — startup self-check',
    `  • Node            : ${process.version}`,
    `  • Env             : ${process.env.NODE_ENV || 'development'}`,
    `  • Port            : ${PORT}`,
    `  • APP_URL         : ${process.env.APP_URL || '(derived from request host)'}`,
    `  • DB_PATH         : ${process.env.DB_PATH || './data/pulsewatch.db'}`,
    `  • SECRET set       : ${secretOk ? 'yes' : 'NO — set a strong SECRET before production!'}`,
    `  • Email provider  : ${prov === 'resend' ? 'Resend (primary)' : prov === 'smtp' ? 'SMTP (fallback)' : 'NONE — alerts will only log until RESEND_API_KEY is set'}`,
    `  • Check interval  : ${CHECK_MS}ms`,
    '─────────────────────────────────────────────',
  ];
  console.log(lines.join('\n'));
  if (process.env.NODE_ENV === 'production') {
    if (!secretOk) console.warn('[warn] SECRET is insecure/default in production.');
    if (prov === 'none') console.warn('[warn] No email provider configured — set RESEND_API_KEY + MAIL_FROM.');
    if (!process.env.APP_URL) console.warn('[warn] APP_URL not set — ping URLs/email links may be wrong behind a proxy.');
    const dbp = process.env.DB_PATH || './data/pulsewatch.db';
    if (!/^(\/data|\/var\/data|\/mnt)/.test(dbp)) console.warn('[warn] DB_PATH is not on a known persistent mount — ensure it is a mounted volume, not ephemeral container storage.');
  }
}
server.listen(PORT, () => { console.log(`Pulsewatch running on :${PORT}`); startupSelfCheck(); });

export { server, tick };
