// alerts.js — email (Resend HTTP API or SMTP) + Slack webhooks. Never throws.
import net from 'node:net';
import tls from 'node:tls';

const APP_URL   = () => process.env.APP_URL || 'http://localhost:3000';
const MAIL_FROM = () => process.env.MAIL_FROM || 'Pulsewatch <alerts@pulsewatch.local>';

function log(...a) { console.log('[alerts]', ...a); }

// ---- transports ----
export function emailProvider() {
  if (process.env.RESEND_API_KEY) return 'resend';        // primary production path
  if (process.env.SMTP_HOST && process.env.SMTP_USER) return 'smtp'; // fallback
  return 'none';
}
export function emailConfigured() {
  return !!process.env.RESEND_API_KEY || !!(process.env.SMTP_HOST && process.env.SMTP_USER);
}
export function slackConfigured(monitor) {
  return !!(monitor?.slack_webhook || process.env.SLACK_WEBHOOK_URL);
}

async function sendEmail(to, subject, text, html) {
  if (!to) return { ok: false, reason: 'no recipient' };
  try {
    if (process.env.RESEND_API_KEY) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: MAIL_FROM(), to: [to], subject, text, html: html || undefined }),
      });
      if (!r.ok) { log('resend failed', r.status, await r.text().catch(()=> '')); return { ok:false }; }
      return { ok: true, via: 'resend' };
    }
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      await sendSmtp(to, subject, text);
      return { ok: true, via: 'smtp' };
    }
    log(`EMAIL (not configured) -> ${to} :: ${subject}`);
    return { ok: false, reason: 'not configured' };
  } catch (e) { log('email error', e.message); return { ok: false, reason: e.message }; }
}

// Minimal SMTP client (AUTH LOGIN, STARTTLS or implicit TLS). Works with Postmark/Gmail/etc.
function sendSmtp(to, subject, text) {
  return new Promise((resolve, reject) => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
    const from = (MAIL_FROM().match(/<(.+)>/)?.[1]) || MAIL_FROM();
    const implicit = port === 465;
    let sock = implicit ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
    let step = 0, buf = '';
    const cmds = [
      `EHLO pulsewatch`,
      implicit ? `AUTH LOGIN` : `STARTTLS`,
    ];
    const upgrade = () => { sock = tls.connect({ socket: sock, servername: host }, run); sock.on('data', onData); sock.on('error', reject); };
    const send = (s) => sock.write(s + '\r\n');
    const b64 = (s) => Buffer.from(s).toString('base64');
    let phase = 'greet';
    function onData(d) {
      buf += d.toString(); if (!buf.endsWith('\n')) return;
      const line = buf.trim(); const code = line.slice(0,3); buf = '';
      if (code >= '400') { sock.destroy(); return reject(new Error('SMTP ' + line)); }
      if (phase === 'greet') { send(`EHLO pulsewatch`); phase = implicit ? 'auth' : 'starttls'; return; }
      if (phase === 'starttls') { send('STARTTLS'); phase = 'upgrading'; return; }
      if (phase === 'upgrading') { phase = 'auth'; upgrade(); return; }
      if (phase === 'auth') { send('AUTH LOGIN'); phase = 'user'; return; }
      if (phase === 'user') { send(b64(user)); phase = 'pass'; return; }
      if (phase === 'pass') { send(b64(pass)); phase = 'from'; return; }
      if (phase === 'from') { send(`MAIL FROM:<${from}>`); phase = 'rcpt'; return; }
      if (phase === 'rcpt') { send(`RCPT TO:<${to}>`); phase = 'data'; return; }
      if (phase === 'data') { send('DATA'); phase = 'body'; return; }
      if (phase === 'body') {
        const msg = `From: ${MAIL_FROM()}\r\nTo: ${to}\r\nSubject: ${subject}\r\n\r\n${text}\r\n.`;
        send(msg); phase = 'quit'; return;
      }
      if (phase === 'quit') { send('QUIT'); sock.end(); resolve(); return; }
    }
    function run() {}
    sock.on('data', onData);
    sock.on('error', reject);
    sock.setTimeout(10000, () => { sock.destroy(); reject(new Error('SMTP timeout')); });
  });
}

async function sendSlack(monitor, text, blocks) {
  const url = monitor?.slack_webhook || process.env.SLACK_WEBHOOK_URL;
  if (!url) { log(`SLACK (not configured) :: ${text}`); return { ok: false }; }
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, blocks }) });
    return { ok: r.ok };
  } catch (e) { log('slack error', e.message); return { ok: false }; }
}

// ---- public alert builders ----
function link(m) { return `${APP_URL()}/app/m/${m.id}`; }

export async function sendFailureAlert(m, user) {
  const to = m.alert_email || user?.email;
  const subject = `🔴 DOWN: "${m.name}" missed its check-in`;
  const text = `Your monitor "${m.name}" was expected to check in but did not.\n\n`
    + `Expected every ${m.period_seconds}s (grace ${m.grace_seconds}s).\n`
    + `Last check-in: ${m.last_ping_at ? new Date(m.last_ping_at).toISOString() : 'never'}\n\n`
    + `View: ${link(m)}\n\n— Pulsewatch`;
  const [e, s] = await Promise.all([
    sendEmail(to, subject, text),
    sendSlack(m, `🔴 *DOWN:* "${m.name}" missed its scheduled check-in. <${link(m)}|View monitor>`),
  ]);
  return { email: e, slack: s };
}

export async function sendRecoveryAlert(m, user, downForMs) {
  const to = m.alert_email || user?.email;
  const mins = Math.max(1, Math.round((downForMs || 0) / 60000));
  const subject = `🟢 UP: "${m.name}" is checking in again`;
  const text = `Good news — "${m.name}" recovered and is reporting again.\n`
    + `It was down for about ${mins} min.\n\nView: ${link(m)}\n\n— Pulsewatch`;
  const [e, s] = await Promise.all([
    sendEmail(to, subject, text),
    sendSlack(m, `🟢 *RECOVERED:* "${m.name}" is checking in again (down ~${mins} min). <${link(m)}|View>`),
  ]);
  return { email: e, slack: s };
}

export async function sendTestAlert(m, user) {
  const to = m.alert_email || user?.email;
  const [e, s] = await Promise.all([
    sendEmail(to, `✅ Test alert from Pulsewatch: "${m.name}"`,
      `This is a test alert for "${m.name}". If you received this, your alerts are wired correctly.\n\n— Pulsewatch`),
    sendSlack(m, `✅ *Test alert* for "${m.name}" — your Slack alerts are working.`),
  ]);
  return { email: e, slack: s };
}
