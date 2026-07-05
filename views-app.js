// views-app.js — authenticated app pages
import { layout, esc } from './views.js';

export function statusBadge(s) {
  const label = s === 'up' ? 'up' : s === 'down' ? 'down' : s === 'paused' ? 'paused' : 'waiting';
  const cls = s === 'up' ? 'up' : s === 'down' ? 'down' : s === 'paused' ? 'paused' : 'new';
  return `<span class="badge ${cls}"><span class="b-dot"></span>${label}</span>`;
}
export function timeAgo(ts) {
  if (!ts) return 'never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}
export function humanEvery(sec) {
  if (sec % 86400 === 0) return `every ${sec/86400}d`;
  if (sec % 3600 === 0) return `every ${sec/3600}h`;
  if (sec % 60 === 0) return `every ${sec/60}m`;
  return `every ${sec}s`;
}
const evLabel = { created:'Created', start:'Started', success:'Checked in', fail:'Reported failure', down:'Went DOWN', up:'Recovered', test:'Test alert sent', paused:'Paused', resumed:'Resumed' };
const evColor = { down:'var(--red)', up:'var(--green)', fail:'var(--red)', success:'var(--green)', test:'var(--brand)' };

export function dashboard({ user, monitors, appUrl, flash }) {
  const limit = 5;
  const atLimit = monitors.length >= limit;
  let body;
  if (monitors.length === 0) {
    body = `
    <section style="padding:48px 0 10px">
      <h1 style="font-size:30px;margin:0 0 6px">Welcome to Pulsewatch 👋</h1>
      <p class="muted">Let's protect your first scheduled job. It takes about a minute.</p>
    </section>
    <div class="card" style="max-width:640px">
      <div class="step"><div class="n">1</div><div><strong>Create a monitor</strong> for a real job — a backup, a cron, a scraper, a report.</div></div>
      <div class="step"><div class="n">2</div><div><strong>Copy the one-line ping</strong> we generate and add it to that job.</div></div>
      <div class="step"><div class="n">3</div><div><strong>Run the job once.</strong> You'll watch it turn green in real time.</div></div>
      <a class="btn" style="margin-top:12px" href="/app/new">Create my first monitor →</a>
    </div>`;
  } else {
    const rows = monitors.map(m => `
      <tr>
        <td><a href="/app/m/${m.id}"><strong>${esc(m.name)}</strong></a><br><span class="muted small mono">${humanEvery(m.period_seconds)}, ${m.grace_seconds}s grace</span></td>
        <td>${statusBadge(m.paused ? 'paused' : m.status)}</td>
        <td class="muted small">${m.last_ping_at ? timeAgo(m.last_ping_at) : '<span class="muted">awaiting first ping</span>'}</td>
        <td class="mono small muted">${esc(appUrl)}/ping/${esc(m.token.slice(0,6))}…</td>
        <td><a class="btn ghost sm" href="/app/m/${m.id}">Open</a></td>
      </tr>`).join('');
    body = `
    <section style="display:flex;justify-content:space-between;align-items:center;padding:40px 0 18px">
      <div><h1 style="font-size:28px;margin:0">Your monitors</h1><p class="muted small" style="margin:4px 0 0">${monitors.length} of ${limit} on the Free plan</p></div>
      ${atLimit ? `<a class="btn" href="/pricing">Upgrade for more</a>` : `<a class="btn" href="/app/new">+ New monitor</a>`}
    </section>
    ${flash ? `<div class="ok">${esc(flash)}</div>` : ''}
    <div class="card" style="padding:6px 16px"><table>
      <tr><th>Monitor</th><th>Status</th><th>Last check-in</th><th>Ping URL</th><th></th></tr>
      ${rows}
    </table></div>`;
  }
  return layout({ title: 'Dashboard — Pulsewatch', user, body });
}

export function newMonitor({ user, error, values = {} }) {
  const body = `
  <div class="form" style="max-width:520px">
    <h1 style="font-size:26px">New monitor</h1>
    <p class="muted small">Describe the job and how often it should check in.</p>
    ${error ? `<div class="err">${esc(error)}</div>` : ''}
    <form method="post" action="/app/new">
      <label>Name</label>
      <input name="name" required placeholder="Nightly database backup" value="${esc(values.name || '')}">
      <label>Expected period (how often it runs)</label>
      <select name="period">
        <option value="300">Every 5 minutes</option>
        <option value="900">Every 15 minutes</option>
        <option value="3600" selected>Every hour</option>
        <option value="21600">Every 6 hours</option>
        <option value="86400">Every day</option>
        <option value="604800">Every week</option>
      </select>
      <label>Grace period (how late is OK before we alarm)</label>
      <select name="grace">
        <option value="60">1 minute</option>
        <option value="300" selected>5 minutes</option>
        <option value="900">15 minutes</option>
        <option value="3600">1 hour</option>
      </select>
      <label>Slack webhook URL (optional)</label>
      <input name="slack_webhook" placeholder="https://hooks.slack.com/services/..." value="${esc(values.slack_webhook || '')}">
      <label>Alert email (defaults to your account email)</label>
      <input name="alert_email" type="email" placeholder="${esc(user.email)}" value="${esc(values.alert_email || '')}">
      <button class="btn">Create monitor</button>
    </form>
  </div>`;
  return layout({ title: 'New monitor — Pulsewatch', user, body });
}

export function monitorDetail({ user, m, events, appUrl, flash, error }) {
  const url = `${appUrl}/ping/${m.token}`;
  const snip = (id, tabs) => `
    <div id="${id}">
      <div class="tabs">${tabs.map((t,i)=>`<span class="tab ${i===0?'active':''}" onclick="showSnippet('${id}','${t.k}',this)">${t.label}</span>`).join('')}</div>
      ${tabs.map((t,i)=>`<div class="snip" id="${id}-${t.k}" style="display:${i===0?'block':'none'}"><div class="code mono"><button class="btn ghost sm copy" data-copy="${esc(t.code)}" onclick="copyText(this)">Copy</button>${esc(t.code)}</div></div>`).join('')}
    </div>`;
  const snippets = snip('snips', [
    { k:'curl', label:'curl', code:`curl -fsS ${url}` },
    { k:'cron', label:'crontab', code:`0 * * * * /path/to/job.sh && curl -fsS ${url}` },
    { k:'python', label:'Python', code:`import urllib.request\nurllib.request.urlopen("${url}", timeout=10)` },
    { k:'node', label:'Node', code:`await fetch("${url}")` },
    { k:'gha', label:'GitHub Actions', code:`- run: curl -fsS ${url}` },
  ]);
  const evtRows = events.length ? events.map(e => `
    <tr><td style="color:${evColor[e.type]||'var(--muted)'}">${evLabel[e.type]||e.type}</td>
    <td class="muted small">${new Date(e.created_at).toLocaleString()}</td>
    <td class="muted small">${esc(e.note||'')}</td></tr>`).join('')
    : `<tr><td colspan="3" class="muted small">No events yet — run your job to see the first check-in.</td></tr>`;
  const waiting = m.status === 'new';
  const body = `
  <section style="padding:34px 0 8px"><a class="muted small" href="/app">← All monitors</a>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:10px">
      <div><h1 style="font-size:26px;margin:0">${esc(m.name)}</h1>
      <p class="muted small" style="margin:4px 0 0">${humanEvery(m.period_seconds)} · ${m.grace_seconds}s grace · created ${new Date(m.created_at).toLocaleDateString()}</p></div>
      <div style="font-size:15px">${statusBadge(m.paused ? 'paused' : m.status)}</div>
    </div>
  </section>
  ${flash ? `<div class="ok">${esc(flash)}</div>` : ''}
  ${error ? `<div class="err">${esc(error)}</div>` : ''}
  ${waiting ? `<div class="notice">⏳ <strong>Waiting for the first ping.</strong> Add the command below to your job and run it once — this monitor will arm automatically and start watching the clock.</div>` : ''}

  <div class="grid g2" style="align-items:start">
    <div class="card">
      <h3 style="margin-top:0">Add this to your job</h3>
      ${snippets}
      <p class="muted small">Your unique ping URL:</p>
      <div class="code mono"><button class="btn ghost sm copy" data-copy="${esc(url)}" onclick="copyText(this)">Copy</button>${esc(url)}</div>
      <p class="muted small">Optional signals: <span class="mono">/start</span> (began), <span class="mono">/fail</span> (failed → immediate alert).</p>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Status</h3>
      <table>
        <tr><th>Last check-in</th><td>${m.last_ping_at ? esc(new Date(m.last_ping_at).toLocaleString())+` (${timeAgo(m.last_ping_at)})` : '<span class="muted">never</span>'}</td></tr>
        <tr><th>Next due by</th><td>${m.next_due_at ? esc(new Date(m.next_due_at).toLocaleString()) : '<span class="muted">after first ping</span>'}</td></tr>
        <tr><th>Last run time</th><td>${m.last_duration_ms != null ? (m.last_duration_ms/1000).toFixed(1)+'s' : '<span class="muted">—</span>'}</td></tr>
        <tr><th>Slack</th><td>${m.slack_webhook ? '✓ connected' : '<span class="muted">not set</span>'}</td></tr>
        <tr><th>Alert email</th><td class="small">${esc(m.alert_email || user.email)}</td></tr>
      </table>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
        <form method="post" action="/app/m/${m.id}/test"><button class="btn ghost sm">Send test alert</button></form>
        <form method="post" action="/app/m/${m.id}/pause"><button class="btn ghost sm">${m.paused ? 'Resume' : 'Pause'}</button></form>
        <form method="post" action="/app/m/${m.id}/delete" onsubmit="return confirm('Delete this monitor permanently?')"><button class="btn danger sm">Delete</button></form>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:18px">
    <h3 style="margin-top:0">Settings</h3>
    <form method="post" action="/app/m/${m.id}/edit" class="grid g2" style="gap:14px">
      <div><label class="muted small">Name</label><input class="input" name="name" value="${esc(m.name)}"></div>
      <div><label class="muted small">Alert email</label><input class="input" name="alert_email" value="${esc(m.alert_email||'')}" placeholder="${esc(user.email)}"></div>
      <div><label class="muted small">Period (seconds)</label><input class="input" name="period_seconds" type="number" min="30" value="${m.period_seconds}"></div>
      <div><label class="muted small">Grace (seconds)</label><input class="input" name="grace_seconds" type="number" min="0" value="${m.grace_seconds}"></div>
      <div style="grid-column:1/-1"><label class="muted small">Slack webhook URL</label><input class="input" name="slack_webhook" value="${esc(m.slack_webhook||'')}" placeholder="https://hooks.slack.com/services/..."></div>
      <div style="grid-column:1/-1"><button class="btn sm">Save settings</button></div>
    </form>
  </div>

  <div class="card" style="margin-top:18px">
    <h3 style="margin-top:0">Event history</h3>
    <table><tr><th>Event</th><th>When</th><th>Detail</th></tr>${evtRows}</table>
  </div>
  <meta http-equiv="refresh" content="30">`;
  return layout({ title: `${m.name} — Pulsewatch`, user, body });
}
