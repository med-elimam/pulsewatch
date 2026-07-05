// alerts.js — email (Resend HTTP API primary, SMTP fallback) + Slack webhooks. Never throws.
// Email templates are transactional-clean for deliverability: no emoji, balanced text/HTML,
// professional English body. Core product logic lives in server.js and is untouched here.
import net from 'node:net';
import tls from 'node:tls';

const APP_URL   = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const MAIL_FROM = () => process.env.MAIL_FROM || 'Pulsewatch <alerts@pulsewatch.local>';
const APP_NAME  = 'Pulsewatch';

function log(...a) { console.log('[alerts]', ...a); }

// ---- transports ----
export function emailProvider() {
  if (process.env.RESEND_API_KEY) return 'resend';                    // primary production path
  if (process.env.SMTP_HOST && process.env.SMTP_USER) return 'smtp';  // fallback
  return 'none';
}
export function emailConfigured() { return emailProvider() !== 'none'; }
export function slackConfigured(monitor) {
  return !!(monitor?.slack_webhook || process.env.SLACK_WEBHOOK_URL);
}

async function sendEmail(to, subject, text, html) {
  if (!to) return { ok: false, reason: 'no recipient' };
  try {
    if (process.env.RESEND_API_KEY) {
      const payload = { from: MAIL_FROM(), to: [to], subject, text };
      if (html) payload.html = html;
      if (process.env.MAIL_REPLY_TO) payload.reply_to = process.env.MAIL_REPLY_TO;
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { log('resend failed', r.status, await r.text().catch(() => '')); return { ok: false }; }
      return { ok: true, via: 'resend' };
    }
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      await sendSmtp(to, subject, text, html);
      return { ok: true, via: 'smtp' };
    }
    log(`EMAIL (not configured) -> ${to} :: ${subject}`);
    return { ok: false, reason: 'not configured' };
  } catch (e) { log('email error', e.message); return { ok: false, reason: e.message }; }
}

// Minimal SMTP client (AUTH LOGIN, STARTTLS or implicit TLS). Sends multipart/alternative
// (plain text + HTML) when html is supplied. Works with Postmark/Mailgun/SES/Gmail.
function sendSmtp(to, subject, text, html) {
  return new Promise((resolve, reject) => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
    const from = (MAIL_FROM().match(/<(.+)>/)?.[1]) || MAIL_FROM();
    const implicit = port === 465;
    let sock = implicit ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
    let buf = '';
    const send = (s) => sock.write(s + '\r\n');
    const b64 = (s) => Buffer.from(s).toString('base64');
    const dotstuff = (s) => s.replace(/\r?\n/g, '\r\n').replace(/\r\n\./g, '\r\n..');
    const upgrade = () => { sock = tls.connect({ socket: sock, servername: host }); sock.on('data', onData); sock.on('error', reject); };
    let phase = 'greet';
    function body() {
      const b = 'pw_' + Math.random().toString(36).slice(2);
      const headers = [
        `From: ${MAIL_FROM()}`, `To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0',
      ];
      if (!html) return headers.concat(['Content-Type: text/plain; charset=utf-8', '', dotstuff(text), '.']).join('\r\n');
      return headers.concat([
        `Content-Type: multipart/alternative; boundary="${b}"`, '',
        `--${b}`, 'Content-Type: text/plain; charset=utf-8', '', dotstuff(text),
        `--${b}`, 'Content-Type: text/html; charset=utf-8', '', dotstuff(html),
        `--${b}--`, '.',
      ]).join('\r\n');
    }
    function onData(d) {
      buf += d.toString(); if (!buf.endsWith('\n')) return;
      const line = buf.trim(); const code = line.slice(0, 3); buf = '';
      if (code >= '400') { sock.destroy(); return reject(new Error('SMTP ' + line)); }
      if (phase === 'greet') { send('EHLO pulsewatch'); phase = implicit ? 'auth' : 'starttls'; return; }
      if (phase === 'starttls') { send('STARTTLS'); phase = 'upgrading'; return; }
      if (phase === 'upgrading') { phase = 'auth'; upgrade(); return; }
      if (phase === 'auth') { send('AUTH LOGIN'); phase = 'user'; return; }
      if (phase === 'user') { send(b64(user)); phase = 'pass'; return; }
      if (phase === 'pass') { send(b64(pass)); phase = 'from'; return; }
      if (phase === 'from') { send(`MAIL FROM:<${from}>`); phase = 'rcpt'; return; }
      if (phase === 'rcpt') { send(`RCPT TO:<${to}>`); phase = 'data'; return; }
      if (phase === 'data') { send('DATA'); phase = 'send'; return; }
      if (phase === 'send') { sock.write(body() + '\r\n'); phase = 'quit'; return; }
      if (phase === 'quit') { send('QUIT'); sock.end(); resolve(); return; }
    }
    sock.on('data', onData);
    sock.on('error', reject);
    sock.setTimeout(10000, () => { sock.destroy(); reject(new Error('SMTP timeout')); });
  });
}

async function sendSlack(monitor, text) {
  const url = monitor?.slack_webhook || process.env.SLACK_WEBHOOK_URL;
  if (!url) { log(`SLACK (not configured) :: ${text}`); return { ok: false }; }
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    return { ok: r.ok };
  } catch (e) { log('slack error', e.message); return { ok: false }; }
}

// ---- shared template helpers ----
const dashUrl = (m) => `${APP_URL()}/app/m/${m.id}`;
const fmtTime = (ts) => (ts ? new Date(ts).toUTCString() : 'No successful check-in yet');
const everyText = (m) => {
  const s = m.period_seconds;
  if (s % 86400 === 0) return `every ${s / 86400} day(s)`;
  if (s % 3600 === 0) return `every ${s / 3600} hour(s)`;
  if (s % 60 === 0) return `every ${s / 60} minute(s)`;
  return `every ${s} seconds`;
};

// Build a clean, transactional email (plain text + minimal HTML). No emoji, no checkmarks.
function buildEmail({ m, statusLabel, intro, closing }) {
  const rows = [
    ['Monitor', m.name],
    ['Status', statusLabel],
    ['Expected', `Check-in ${everyText(m)} (grace ${m.grace_seconds}s)`],
    ['Last check-in', fmtTime(m.last_ping_at)],
  ];
  const text = [
    intro, '',
    ...rows.map(([k, v]) => `${k}: ${v}`), '',
    `View monitor: ${dashUrl(m)}`,
    closing ? `\n${closing}` : '',
    '',
    `${APP_NAME} - monitoring for scheduled jobs.`,
    `You are receiving this because you set up a monitor in ${APP_NAME}.`,
  ].filter(Boolean).join('\n');

  const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e7ec;border-radius:8px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
  <tr><td style="padding:20px 24px;border-bottom:1px solid #eef0f3;font-size:15px;font-weight:bold;color:#111">${APP_NAME}</td></tr>
  <tr><td style="padding:22px 24px 6px;font-size:16px;line-height:1.5;color:#1a1a1a">${esc(intro)}</td></tr>
  <tr><td style="padding:8px 24px 4px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333">
      ${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#667085;width:130px">${k}</td><td style="padding:6px 0;color:#1a1a1a">${esc(v)}</td></tr>`).join('')}
    </table>
  </td></tr>
  <tr><td style="padding:18px 24px 22px">
    <a href="${dashUrl(m)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:10px 18px;border-radius:6px">View monitor</a>
  </td></tr>
  ${closing ? `<tr><td style="padding:0 24px 20px;font-size:13px;color:#667085;line-height:1.5">${esc(closing)}</td></tr>` : ''}
  <tr><td style="padding:16px 24px;border-top:1px solid #eef0f3;font-size:12px;color:#98a2b3;line-height:1.5">
    ${APP_NAME} — monitoring for scheduled jobs.<br>You are receiving this because you set up a monitor in ${APP_NAME}.
  </td></tr>
</table>
</td></tr></table></body></html>`;
  return { text, html };
}

const to_ = (m, user) => m.alert_email || user?.email;

// ---- public alert builders ----
export async function sendFailureAlert(m, user) {
  const subject = `[${APP_NAME}] Monitor down: ${m.name}`;
  const { text, html } = buildEmail({
    m, statusLabel: 'Down (missed check-in)',
    intro: `Your monitor "${m.name}" was expected to check in but did not within its scheduled window.`,
    closing: 'If this was expected (for example the job was intentionally stopped), you can pause or edit the monitor from the dashboard.',
  });
  const [email, slack] = await Promise.all([
    sendEmail(to_(m, user), subject, text, html),
    sendSlack(m, `${APP_NAME}: monitor DOWN — "${m.name}" missed its scheduled check-in. ${dashUrl(m)}`),
  ]);
  return { email, slack };
}

export async function sendRecoveryAlert(m, user, downForMs) {
  const mins = Math.max(1, Math.round((downForMs || 0) / 60000));
  const subject = `[${APP_NAME}] Monitor recovered: ${m.name}`;
  const { text, html } = buildEmail({
    m, statusLabel: 'Recovered (checking in)',
    intro: `Your monitor "${m.name}" has recovered and is checking in again. It was down for about ${mins} minute(s).`,
  });
  const [email, slack] = await Promise.all([
    sendEmail(to_(m, user), subject, text, html),
    sendSlack(m, `${APP_NAME}: monitor RECOVERED — "${m.name}" is checking in again (down ~${mins} min). ${dashUrl(m)}`),
  ]);
  return { email, slack };
}

export async function sendTestAlert(m, user) {
  const subject = `[${APP_NAME}] Test alert: ${m.name}`;
  const { text, html } = buildEmail({
    m, statusLabel: 'Test alert (no action needed)',
    intro: `This is a test alert for "${m.name}". If you received it, your ${APP_NAME} alerts are configured correctly.`,
    closing: 'No action is required. You can safely ignore this message.',
  });
  const [email, slack] = await Promise.all([
    sendEmail(to_(m, user), subject, text, html),
    sendSlack(m, `${APP_NAME}: test alert for "${m.name}" — your Slack alerts are working.`),
  ]);
  return { email, slack };
}
