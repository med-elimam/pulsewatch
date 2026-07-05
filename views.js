import { PLANS, priceLabel, TAX_NOTE, PLAN_BY_ID, PLAN_LIMIT, planName } from './plans.js';
// views.js — server-rendered HTML (no build step, no template engine)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export { esc };

const CSS = `
:root{--bg:#0b0f17;--panel:#121826;--panel2:#0f1523;--border:#1e2637;--text:#e6ebf5;--muted:#8b97ad;--brand:#4f8cff;--brand2:#3ad0a0;--red:#ff5c6c;--amber:#ffb020;--green:#2ec88a;--radius:12px}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
a{color:var(--brand);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
.nav{display:flex;align-items:center;justify-content:space-between;padding:18px 0;border-bottom:1px solid var(--border);position:sticky;top:0;background:rgba(11,15,23,.85);backdrop-filter:blur(8px);z-index:10}
.brand{font-weight:700;font-size:18px;color:var(--text);display:flex;gap:9px;align-items:center}
.brand .dot{width:11px;height:11px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px rgba(46,200,138,.18);display:inline-block;animation:pulse 2s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(46,200,138,.35)}70%{box-shadow:0 0 0 8px rgba(46,200,138,0)}100%{box-shadow:0 0 0 0 rgba(46,200,138,0)}}
.nav-links a{color:var(--muted);margin-left:20px;font-size:14px}.nav-links a:hover{color:var(--text)}
.btn{display:inline-block;background:var(--brand);color:#fff;padding:10px 18px;border-radius:10px;font-weight:600;border:none;cursor:pointer;font-size:14px}
.btn:hover{background:#3d7bf0;text-decoration:none}
.btn.ghost{background:transparent;border:1px solid var(--border);color:var(--text)}
.btn.sm{padding:6px 12px;font-size:13px}
.btn.danger{background:transparent;border:1px solid #40232a;color:var(--red)}
.hero{padding:84px 0 60px;text-align:center}
.hero h1{font-size:46px;line-height:1.08;margin:0 0 18px;letter-spacing:-1px}
.hero .sub{font-size:19px;color:var(--muted);max-width:640px;margin:0 auto 30px}
.hero .cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.kicker{display:inline-block;font-size:13px;color:var(--brand2);background:rgba(58,208,160,.1);border:1px solid rgba(58,208,160,.25);padding:5px 12px;border-radius:999px;margin-bottom:22px}
.mono{font-family:'SF Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.code{position:relative;background:#0a0e16;border:1px solid var(--border);border-radius:10px;padding:14px 16px;font-family:'SF Mono',ui-monospace,monospace;font-size:13.5px;color:#cdd6f4;overflow-x:auto;text-align:left}
.code .copy{position:absolute;top:8px;right:8px}
.grid{display:grid;gap:18px}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}.g2{grid-template-columns:repeat(2,1fr)}
@media(max-width:800px){.g3,.g2{grid-template-columns:1fr}.hero h1{font-size:34px}}@media(max-width:900px){.g4{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.g4{grid-template-columns:1fr}}
.card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:22px}
.section{padding:56px 0;border-top:1px solid var(--border)}
.section h2{font-size:28px;margin:0 0 8px;letter-spacing:-.5px}.section .lead{color:var(--muted);margin:0 0 28px}
.step{display:flex;gap:14px;align-items:flex-start;margin-bottom:18px}
.step .n{flex:0 0 30px;height:30px;border-radius:50%;background:rgba(79,140,255,.15);color:var(--brand);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}
.badge{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;padding:4px 10px;border-radius:999px;text-transform:capitalize}
.badge .b-dot{width:8px;height:8px;border-radius:50%}
.badge.up{background:rgba(46,200,138,.12);color:var(--green)} .badge.up .b-dot{background:var(--green)}
.badge.down{background:rgba(255,92,108,.12);color:var(--red)} .badge.down .b-dot{background:var(--red)}
.badge.new{background:rgba(139,151,173,.14);color:var(--muted)} .badge.new .b-dot{background:var(--muted)}
.badge.paused{background:rgba(255,176,32,.12);color:var(--amber)} .badge.paused .b-dot{background:var(--amber)}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px 10px;border-bottom:1px solid var(--border);font-size:14px}
th{color:var(--muted);font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.4px}
.form{max-width:420px;margin:40px auto}.form label{display:block;font-size:13px;color:var(--muted);margin:16px 0 6px}
.form input,.form select,.input{width:100%;background:var(--panel2);border:1px solid var(--border);border-radius:9px;padding:11px 12px;color:var(--text);font-size:14px}
.form .btn{width:100%;margin-top:22px}
.muted{color:var(--muted)}.small{font-size:13px}.center{text-align:center}
.pill{font-size:12px;color:var(--muted);border:1px solid var(--border);border-radius:999px;padding:3px 10px}
.price{display:flex;align-items:baseline;gap:4px;margin:6px 0 14px}.price .amt{font-size:38px;font-weight:800}.price .per{color:var(--muted)}
.check{color:var(--green);margin-right:8px}
.notice{background:rgba(79,140,255,.08);border:1px solid rgba(79,140,255,.25);border-radius:10px;padding:14px 16px;margin:18px 0;font-size:14px}
.err{background:rgba(255,92,108,.1);border:1px solid rgba(255,92,108,.3);color:#ffb3bb;border-radius:9px;padding:11px 14px;margin-bottom:8px;font-size:14px}
.ok{background:rgba(46,200,138,.1);border:1px solid rgba(46,200,138,.3);color:#9fe8c6;border-radius:9px;padding:11px 14px;margin-bottom:8px;font-size:14px}
.footer{border-top:1px solid var(--border);padding:34px 0;color:var(--muted);font-size:13px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}
.tabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}.tab{padding:6px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;cursor:pointer;color:var(--muted);background:var(--panel2)}.tab.active{color:var(--text);border-color:var(--brand)}
`;

const COPY_JS = `
function copyText(el){const t=el.getAttribute('data-copy');navigator.clipboard.writeText(t).then(()=>{const o=el.textContent;el.textContent='Copied!';setTimeout(()=>el.textContent=o,1200)})}
function showSnippet(id,which,btn){document.querySelectorAll('#'+id+' .snip').forEach(s=>s.style.display='none');document.getElementById(id+'-'+which).style.display='block';btn.parentNode.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active')}
`;

export function layout({ title, user, body, wide }) {
  const nav = user
    ? `<div class="nav-links"><a href="/app">Dashboard</a><a href="/docs">Docs</a><form method="post" action="/logout" style="display:inline"><button class="btn ghost sm" style="margin-left:20px">Log out</button></form></div>`
    : `<div class="nav-links"><a href="/#how">How it works</a><a href="/pricing">Pricing</a><a href="/docs">Docs</a><a href="/login">Log in</a><a class="btn sm" style="margin-left:16px;color:#fff" href="/signup">Start free</a></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="Pulsewatch tells you the second a cron job, backup, or scheduled script stops running. Free, 2-minute setup.">
<style>${CSS}</style></head><body>
<div class="wrap"><nav class="nav"><a class="brand" href="/"><span class="dot"></span> Pulsewatch</a>${nav}</nav></div>
<div class="wrap" style="max-width:${wide ? 1040 : 1040}px">${body}</div>
<div class="wrap"><div class="footer"><div>© ${new Date().getFullYear()} Pulsewatch — a dead man's switch for scheduled jobs.</div><div><a href="/pricing">Pricing</a> · <a href="/docs">Docs</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/refund">Refund Policy</a> · <a href="/contact">Contact</a></div></div></div>
<script>${COPY_JS}</script></body></html>`;
}


function landingPricingSection() {
  const cols = PLANS.map(p => `
    <div class="card" style="${p.highlight ? 'border-color:var(--brand)' : ''}">
      <h3 style="margin:0 0 2px">${p.name}</h3>
      <div class="price" style="margin:4px 0 8px"><span class="amt" style="font-size:28px">$${p.price}</span><span class="per">/month</span></div>
      <p class="muted small" style="margin:0 0 8px">${esc(p.monitors + ' monitors')}</p>
      <p class="muted small" style="margin:0">${esc(p.blurb)}</p>
    </div>`).join('');
  return `<section class="section" id="pricing">
    <h2>Pricing</h2>
    <p class="lead">Public monthly pricing. Free forever for personal jobs &mdash; upgrade as you add more monitors.</p>
    <div class="grid g4">${cols}</div>
    <p class="center muted small" style="margin-top:16px">${TAX_NOTE}</p>
    <div class="center" style="margin-top:14px"><a class="btn" href="/pricing">See full pricing &amp; checkout &rarr;</a></div>
  </section>`;
}

export function landing({ user }) {
  const ping = 'curl -fsS https://app.pulsewatch.io/ping/YOUR_TOKEN';
  const body = `
<section class="hero">
  <span class="kicker">● Know within seconds, not days</span>
  <h1>Your cron jobs fail silently.<br>We make them speak up.</h1>
  <p class="sub">Backups, scrapers, billing scripts, and nightly reports break without a sound — and you find out when a customer does. Pulsewatch pings you the moment a scheduled job misses its check-in.</p>
  <p class="small muted" style="max-width:640px;margin:0 auto 6px">Pulsewatch monitors cron jobs and scheduled tasks. Add one ping URL to your job, and Pulsewatch alerts you by email or Slack if it stops checking in.</p>
  <div class="cta">
    <a class="btn" href="/signup">Start monitoring free →</a>
    <a class="btn ghost" href="/#how">See how it works</a>
  </div>
  <p class="small muted" style="margin-top:16px">No credit card · 1 free monitor · Setup in one line</p>
  <div style="max-width:620px;margin:34px auto 0">
    <div class="code"><button class="btn ghost sm copy" data-copy="${esc(ping)}" onclick="copyText(this)">Copy</button><span class="mono">${esc(ping)}</span></div>
    <p class="small muted" style="margin-top:10px">Add that one line to the end of any job. Silence = we alert you.</p>
  </div>
</section>

<section class="section" id="problem">
  <h2>The problem isn't that jobs fail. It's that they fail <em>quietly</em>.</h2>
  <p class="lead">Uptime monitors watch your website. Almost nothing watches the invisible work happening on a schedule.</p>
  <div class="grid g3">
    <div class="card"><strong>💾 Backups that stopped weeks ago</strong><p class="muted small">You assume last night's dump ran. It's been failing since the disk filled up. You learn this during a restore.</p></div>
    <div class="card"><strong>🕷️ Scrapers &amp; ETL that die overnight</strong><p class="muted small">A source changed, the cron exited non-zero, dashboards quietly went stale. No error reached a human.</p></div>
    <div class="card"><strong>🧾 Billing &amp; report jobs that skip</strong><p class="muted small">The monthly invoice run didn't fire. Finance notices on the 5th. Now it's a customer trust problem.</p></div>
  </div>
</section>

<section class="section" id="how">
  <h2>How it works</h2>
  <p class="lead">A "dead man's switch" for anything on a schedule. If the check-in doesn't arrive on time, you hear about it.</p>
  <div class="grid g2">
    <div>
      <div class="step"><div class="n">1</div><div><strong>Create a monitor</strong><br><span class="muted small">Tell us how often the job should run and how much grace to allow.</span></div></div>
      <div class="step"><div class="n">2</div><div><strong>Add one line to your job</strong><br><span class="muted small">Ping your unique URL at the end of the script or as the last cron step.</span></div></div>
      <div class="step"><div class="n">3</div><div><strong>We watch the clock</strong><br><span class="muted small">Ping arrives on time → green. Ping is late → we mark it down and alert you by email &amp; Slack.</span></div></div>
      <div class="step"><div class="n">4</div><div><strong>Recovery is automatic</strong><br><span class="muted small">Next successful ping flips it back to green and sends an all-clear — no manual reset.</span></div></div>
    </div>
    <div class="card">
      <p class="small muted" style="margin-top:0">Cron example — one extra step:</p>
      <div class="code mono"><button class="btn ghost sm copy" data-copy="0 3 * * * /usr/local/bin/backup.sh && curl -fsS https://app.pulsewatch.io/ping/YOUR_TOKEN" onclick="copyText(this)">Copy</button>0 3 * * * /usr/local/bin/backup.sh \\<br>&nbsp;&nbsp;&amp;&amp; curl -fsS .../ping/YOUR_TOKEN</div>
      <p class="small muted">Only pings on success (<span class="mono">&amp;&amp;</span>). If the backup fails or the box is down, no ping arrives — and we tell you.</p>
      <p class="small muted">Want duration &amp; failure signals too?</p>
      <div class="code mono">curl .../ping/TOKEN/start &nbsp;<span class="muted"># job began</span><br>curl .../ping/TOKEN &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="muted"># success</span><br>curl .../ping/TOKEN/fail &nbsp;<span class="muted"># job reported failure</span></div>
    </div>
  </div>
</section>

<section class="section">
  <h2>Everything you need, nothing you don't</h2>
  <div class="grid g3">
    <div class="card"><strong>⚡ Instant failure detection</strong><p class="muted small">A background clock checks every monitor continuously. Late = down, no polling your servers required.</p></div>
    <div class="card"><strong>🔔 Email + Slack alerts</strong><p class="muted small">One alert when it breaks, one when it recovers. We only notify on real state changes — never spam.</p></div>
    <div class="card"><strong>🟢 Recovery detection</strong><p class="muted small">Know when it's fixed, not just when it broke. Full incident history per monitor.</p></div>
    <div class="card"><strong>🔒 Unique, revocable tokens</strong><p class="muted small">Every monitor gets its own 144-bit URL. Isolated per account. Rotate anytime.</p></div>
    <div class="card"><strong>🧩 Works with anything</strong><p class="muted small">Cron, systemd timers, GitHub Actions, Kubernetes CronJobs, Lambda, Windows Task Scheduler, bots.</p></div>
    <div class="card"><strong>🚀 60-second setup</strong><p class="muted small">Create a monitor, copy one curl line, done. No agent to install, no SDK required.</p></div>
  </div>
</section>

<section class="section center" id="cta">
  <h2>Stop finding out from your customers.</h2>
  <p class="lead" style="margin-bottom:22px">Set up your first monitor in the next two minutes — free.</p>
  <a class="btn" href="/signup">Create your first monitor →</a>
</section>

${landingPricingSection()}

<section class="section" id="faq">
  <h2>FAQ</h2>
  <div class="grid g2">
    <div class="card"><strong>How is this different from uptime monitoring?</strong><p class="muted small">Uptime tools ping <em>your</em> server from outside. Pulsewatch works the opposite way: your job pings <em>us</em>. That's the only way to catch a job that silently didn't run at all — there's nothing to poll.</p></div>
    <div class="card"><strong>What if my server has no internet / is behind a firewall?</strong><p class="muted small">A single outbound HTTPS call is almost always allowed. It's one request; if even that can't get out, that itself usually signals a bigger problem worth an alert.</p></div>
    <div class="card"><strong>Will I get spammed?</strong><p class="muted small">No. We alert once on the transition to "down" and once on recovery. A job that stays down does not re-notify.</p></div>
    <div class="card"><strong>Do you support failure &amp; duration signals?</strong><p class="muted small">Yes — ping <span class="mono">/start</span> then <span class="mono">/</span> to measure run time, or <span class="mono">/fail</span> to report an explicit failure and trigger an immediate alert.</p></div>
    <div class="card"><strong>Is my data isolated?</strong><p class="muted small">Every monitor belongs to one account and is only reachable via its unguessable token. Passwords are salted &amp; hashed (scrypt).</p></div>
    <div class="card"><strong>Can I self-host?</strong><p class="muted small">Yes. Pulsewatch is a single Node process with an embedded database — no external services required to run the core product.</p></div>
  </div>
</section>`;
  return layout({ title: 'Pulsewatch — Know the second a cron job stops running', user, body });
}


export function paddleScript(paddle) {
  const cfg = {
    env: (paddle && paddle.env) || 'production',
    token: (paddle && paddle.clientToken) || '',
    userId: (paddle && paddle.userId) || '',
    email: (paddle && paddle.userEmail) || '',
  };
  return `<script>window.__PW = ${JSON.stringify(cfg)};<\/script>
<script src="https://cdn.paddle.com/paddle/v2/paddle.js"><\/script>
<script>
(function(){
  var C = window.__PW || {};
  function showErr(msg){ var e=document.getElementById('pw-error'); if(e){ e.textContent=msg; e.style.display='block'; } else { alert(msg); } }
  function ready(){
    if (typeof Paddle === 'undefined') { window.__pwPaddleFailed = true; return; }
    try {
      if (C.env === 'sandbox') Paddle.Environment.set('sandbox');
      Paddle.Initialize({ token: C.token });
      window.__pwPaddleInit = true;
    } catch(e){ window.__pwPaddleInit = false; window.__pwPaddleErr = String(e && e.message || e); }
  }
  window.paddleBuy = function(priceId){
    var e=document.getElementById('pw-error'); if(e){ e.style.display='none'; }
    if (!C.token) { showErr('Checkout unavailable: missing Paddle client token.'); return; }
    if (typeof Paddle === 'undefined' || window.__pwPaddleFailed) { showErr('Checkout unavailable: Paddle.js failed to load. Check your network or ad blocker and retry.'); return; }
    if (!window.__pwPaddleInit) { ready(); }
    if (!window.__pwPaddleInit) { showErr('Checkout unavailable: Paddle failed to initialize' + (window.__pwPaddleErr ? ' (' + window.__pwPaddleErr + ')' : '') + '.'); return; }
    if (!priceId) { showErr('Checkout unavailable: this plan has no price ID configured on the server.'); return; }
    if (!C.userId) { window.location = '/signup?next=/billing'; return; }
    try {
      var opts = { items: [{ priceId: priceId, quantity: 1 }], customData: { user_id: C.userId } };
      if (C.email) opts.customer = { email: C.email };
      Paddle.Checkout.open(opts);
    } catch(err){ showErr('Checkout failed to open: ' + String(err && err.message || err)); }
  };
  ready();
})();
<\/script>`;
}
export function checkoutButton(plan, paddle, cls) {
  cls = cls || 'btn';
  if (plan.id === 'free') return `<a class="${cls} ghost" style="width:100%;text-align:center;margin-top:16px;box-sizing:border-box" href="/signup">${plan.cta}</a>`;
  const pid = (paddle && paddle.priceIds && paddle.priceIds[plan.id]) || '';
  return `<button class="${cls}" style="width:100%;margin-top:16px" onclick="paddleBuy('${pid}')">${plan.cta}</button>`;
}

export function pricing({ user, paddle }) {
  const cols = PLANS.map(p => `
    <div class="card" style="${p.highlight ? 'border-color:var(--brand);box-shadow:0 0 0 1px var(--brand)' : ''}">
      ${p.highlight ? '<span class="pill" style="color:var(--brand);border-color:var(--brand)">Most popular</span>' : '<span class="pill">&nbsp;</span>'}
      <h3 style="margin:12px 0 0">${p.name}</h3>
      <div class="price"><span class="amt">$${p.price}</span><span class="per">/month</span></div>
      <p class="muted small" style="margin:0 0 12px;min-height:34px">${esc(p.blurb)}</p>
      <div>${p.features.map(f => `<div style="margin:9px 0"><span class="check">&#10003;</span>${esc(f)}</div>`).join('')}</div>
      ${checkoutButton(p, paddle)}
    </div>`).join('');
  const body = `
  <section class="hero" style="padding:60px 0 16px">
    <h1 style="font-size:38px">Simple, transparent pricing</h1>
    <p class="sub">Public monthly pricing. The price shown here is the price you pay at checkout &mdash; no hidden fees.</p>
  </section>
  <section style="padding-bottom:12px">
    <div class="grid g4">${cols}</div>
    <p class="center muted small" style="margin-top:20px">${TAX_NOTE}</p>
    <p class="center muted small" style="margin-top:10px">Billed monthly. Cancel anytime. Payments are processed by <strong>Paddle</strong>, our merchant of record. See our <a href="/refund">Refund Policy</a>.</p>
  </section>
  <p id="pw-error" class="center" style="display:none;color:var(--red);margin-top:12px;max-width:640px;margin-left:auto;margin-right:auto"></p>
  ${paddleScript(paddle)}`;
  return layout({ title: 'Pricing &mdash; Pulsewatch', user, body });
}

export function docs({ user, appUrl }) {
  const u = appUrl || 'https://app.pulsewatch.io';
  const body = `
  <section style="padding:44px 0 10px"><h1 style="font-size:34px;margin:0">Documentation</h1>
  <p class="muted">Everything you need to wire up a monitor in under two minutes.</p></section>

  <div class="section" style="border-top:none;padding-top:20px">
    <h2>1. The idea</h2>
    <p class="muted">Your scheduled job sends an HTTP request ("ping") to a unique URL every time it runs. Pulsewatch expects that ping on a schedule you define. If it doesn't arrive within the period + grace window, the monitor goes <span class="badge down"><span class="b-dot"></span>down</span> and you get alerted. The next ping flips it back to <span class="badge up"><span class="b-dot"></span>up</span>.</p>
  </div>

  <div class="section">
    <h2>2. Endpoints</h2>
    <table>
      <tr><th>Signal</th><th>URL</th><th>Meaning</th></tr>
      <tr><td>Success</td><td class="mono">${u}/ping/&lt;token&gt;</td><td>Job completed OK. Resets the clock.</td></tr>
      <tr><td>Start</td><td class="mono">${u}/ping/&lt;token&gt;/start</td><td>Job began (optional — measures duration).</td></tr>
      <tr><td>Fail</td><td class="mono">${u}/ping/&lt;token&gt;/fail</td><td>Job reported a failure. Alerts immediately.</td></tr>
    </table>
    <p class="muted small">Both <span class="mono">GET</span> and <span class="mono">POST</span> work. A 200 means we recorded it.</p>
  </div>

  <div class="section">
    <h2>3. Examples</h2>
    <div class="grid g2">
      <div><p class="small muted">Cron (only ping on success):</p><div class="code mono">0 3 * * * /path/backup.sh &amp;&amp; \\<br>curl -fsS ${u}/ping/TOKEN</div></div>
      <div><p class="small muted">Shell script (report start, success, or failure):</p><div class="code mono">curl -fsS ${u}/ping/TOKEN/start<br>if ./job.sh; then<br>&nbsp;&nbsp;curl -fsS ${u}/ping/TOKEN<br>else<br>&nbsp;&nbsp;curl -fsS ${u}/ping/TOKEN/fail<br>fi</div></div>
      <div><p class="small muted">Python:</p><div class="code mono">import urllib.request<br>urllib.request.urlopen("${u}/ping/TOKEN", timeout=10)</div></div>
      <div><p class="small muted">Node.js:</p><div class="code mono">await fetch("${u}/ping/TOKEN")</div></div>
      <div><p class="small muted">GitHub Actions (last step):</p><div class="code mono">- run: curl -fsS ${u}/ping/TOKEN</div></div>
      <div><p class="small muted">Kubernetes CronJob:</p><div class="code mono">command: ["/bin/sh","-c"]<br>args: ["mytask &amp;&amp; wget -q -O- ${u}/ping/TOKEN"]</div></div>
    </div>
  </div>

  <div class="section">
    <h2>4. Choosing period &amp; grace</h2>
    <p class="muted"><strong>Period</strong> = how often you expect a ping (e.g. a job that runs hourly → 3600s). <strong>Grace</strong> = how late is acceptable before we alarm (e.g. a backup that sometimes takes 8 min → 600s grace). We alert when <span class="mono">now &gt; last_ping + period + grace</span>.</p>
  </div>

  <div class="section">
    <h2>5. Alerts</h2>
    <p class="muted">You get an email (and Slack message, if you add a webhook to the monitor) on two events only: when a job goes down, and when it recovers. Use the <strong>Send test alert</strong> button on any monitor to confirm your channels work.</p>
  </div>`;
  return layout({ title: 'Docs — Pulsewatch', user, body });
}

export function authPage({ mode, error, email, next }) {
  const isLogin = mode === 'login';
  const body = `
  <div class="form">
    <h1 style="text-align:center;font-size:28px">${isLogin ? 'Log in' : 'Create your account'}</h1>
    <p class="center muted small">${isLogin ? 'Welcome back.' : 'Free forever for 1 monitor. No card needed.'}</p>
    ${error ? `<div class="err">${esc(error)}</div>` : ''}
    <form method="post" action="/${isLogin ? 'login' : 'signup'}">
      ${next ? `<input type="hidden" name="next" value="${esc(next)}">` : ''}
      <label>Email</label>
      <input name="email" type="email" required autofocus value="${esc(email || '')}" placeholder="you@company.com">
      <label>Password</label>
      <input name="password" type="password" required minlength="8" placeholder="At least 8 characters">
      <button class="btn">${isLogin ? 'Log in' : 'Create account'}</button>
    </form>
    <p class="center muted small" style="margin-top:18px">
      ${isLogin ? `New here? <a href="/signup">Create an account</a>` : `Already have an account? <a href="/login">Log in</a>`}
    </p>
  </div>`;
  return layout({ title: isLogin ? 'Log in — Pulsewatch' : 'Sign up — Pulsewatch', body });
}


// ---- legal pages (Terms, Privacy, Refunds) ----
export function legalPage({ kind, user, company, email, effective }) {
  const C = company || 'Pulsewatch';
  const E = email || 'support@pulsewatch.io';
  const D = effective || new Date().toISOString().slice(0, 10);
  const wrap = (title, html) => layout({ title: `${title} — ${C}`, user, body:
    `<section style="padding:44px 0 8px"><h1 style="font-size:32px;margin:0">${title}</h1>
     <p class="muted small">Last updated: ${D}</p></section>
     <div class="section" style="border-top:none;padding-top:8px;max-width:760px">${html}</div>` });

  if (kind === 'terms') return wrap('Terms of Service', `
    <p class="muted">These Terms of Service ("Terms") govern your access to and use of ${C} (the "Service"), a monitoring tool that alerts you when scheduled jobs stop checking in. By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.</p>
    <h3>1. The Service</h3>
    <p class="muted">${C} lets you create monitors, receive unique ping URLs, and get email and/or Slack notifications when an expected check-in does not arrive on time. The Service is provided on a best-effort basis and is intended as a supplementary safeguard, not a sole point of failure.</p>
    <h3>2. Accounts</h3>
    <p class="muted">You are responsible for the activity under your account and for keeping your credentials secure. You must provide a valid email address and be at least the age of majority in your jurisdiction. You may not use the Service to send spam, to monitor systems you are not authorized to monitor, or for any unlawful purpose.</p>
    <h3>3. Acceptable use</h3>
    <p class="muted">You agree not to (a) disrupt or overload the Service, (b) attempt to access other users' data, (c) reverse engineer or resell the Service except as permitted by its open-source license, or (d) use it to facilitate illegal activity. We may suspend accounts that violate these Terms.</p>
    <h3>4. Availability &amp; no warranty</h3>
    <p class="muted">The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that alerts will always be delivered, timely, or uninterrupted. You are responsible for verifying that your own jobs run correctly. To the maximum extent permitted by law, ${C} disclaims all implied warranties including merchantability and fitness for a particular purpose.</p>
    <h3>5. Limitation of liability</h3>
    <p class="muted">To the maximum extent permitted by law, ${C} and its operators shall not be liable for any indirect, incidental, special, consequential, or exemplary damages, or for any loss of data, revenue, or profits, arising from your use of or inability to use the Service. Our total aggregate liability for any claim shall not exceed the amount you paid us in the twelve months preceding the claim (or, if you use a free plan, USD $50).</p>
    <h3>6. Paid plans</h3>
    <p class="muted">Paid subscriptions, where offered, are billed in advance on a recurring basis. You can cancel at any time; cancellation stops future renewals. Refunds are governed by our <a href="/refund">Refund Policy</a>.</p>
    <h3>7. Termination</h3>
    <p class="muted">You may stop using the Service and delete your account at any time. We may suspend or terminate access if you breach these Terms or to comply with law. Sections that by their nature should survive termination will survive.</p>
    <h3>8. Changes</h3>
    <p class="muted">We may update these Terms from time to time. Material changes will be reflected by updating the "Last updated" date above. Continued use after changes constitutes acceptance.</p>
    <h3>9. Contact</h3>
    <p class="muted">Questions about these Terms: <a href="mailto:${E}">${E}</a>.</p>`);

  if (kind === 'privacy') return wrap('Privacy Policy', `
    <p class="muted">This Privacy Policy explains what information ${C} collects, how we use it, and your choices. We aim to collect only what is necessary to run the Service.</p>
    <h3>1. Information we collect</h3>
    <p class="muted"><strong>Account data:</strong> your email address and a securely hashed password (we never store your password in plain text). <strong>Monitor data:</strong> the names, schedules, ping timestamps, event history, and any alert email or Slack webhook URL you add. <strong>Technical data:</strong> standard server logs (such as IP address and request metadata) used for security and reliability.</p>
    <h3>2. How we use it</h3>
    <p class="muted">We use your information solely to operate the Service: to authenticate you, run your monitors, detect missed check-ins, and deliver alerts. We do not sell your personal data. We do not use it for advertising.</p>
    <h3>3. Third-party processors</h3>
    <p class="muted">To deliver alerts we may share the minimum necessary data with service providers: our email provider (e.g. Resend) receives the recipient address and message content; if you configure a Slack webhook, alert text is sent to that Slack workspace. Hosting and database infrastructure store your account and monitor data. These providers process data on our behalf.</p>
    <h3>4. Data retention</h3>
    <p class="muted">We keep your account and monitor data for as long as your account is active. Event history is retained according to your plan. When you delete a monitor or your account, the associated data is removed from our active systems.</p>
    <h3>5. Security</h3>
    <p class="muted">Passwords are hashed with a per-user salt. Sessions use signed, HttpOnly cookies. Ping tokens are unguessable and scoped to a single account. No method of transmission or storage is perfectly secure, but we take reasonable measures to protect your data.</p>
    <h3>6. Your rights</h3>
    <p class="muted">You can access, correct, export, or delete your data by using the app or by contacting us. Depending on your location, you may have additional rights under laws such as the GDPR or CCPA; contact us to exercise them.</p>
    <h3>7. Children</h3>
    <p class="muted">The Service is not directed to children under 16, and we do not knowingly collect their data.</p>
    <h3>8. Changes &amp; contact</h3>
    <p class="muted">We may update this policy; the "Last updated" date will change accordingly. Questions or requests: <a href="mailto:${E}">${E}</a>.</p>`);

  if (kind === 'refund') return wrap('Refund Policy', `
    <p class="muted">${C} sells monthly subscriptions. Payments are processed by <strong>Paddle</strong>, our merchant of record. Paddle may handle billing, tax, invoices, and buyer support on our behalf.</p>
    <h3>1. Refund window</h3>
    <p class="muted">Refund requests can be sent to support within <strong>14 days</strong> of purchase. Contact <a href="mailto:${E}">${E}</a> from your account email and we will process eligible requests.</p>
    <h3>2. Merchant of record</h3>
    <p class="muted">Because Paddle is the merchant of record, your payment, invoice, applicable taxes, and card statement entry are managed by Paddle. Refunds are issued back to your original payment method through Paddle.</p>
    <h3>3. Subscriptions &amp; cancellation</h3>
    <p class="muted">Subscriptions are billed monthly and renew automatically until cancelled. You can cancel at any time; cancellation stops future renewals and takes effect at the end of the current billing period.</p>
    <h3>4. How to request</h3>
    <p class="muted">Email <a href="mailto:${E}">${E}</a> with your account email and the reason for the request. We aim to respond within a few business days.</p>
    <p class="muted small">Taxes may apply and are calculated at checkout by Paddle.</p>`);

  if (kind === 'contact') return wrap('Contact', `
    <p class="muted">We are happy to help with questions about ${C}, your account, billing, or a refund request.</p>
    <h3>Support email</h3>
    <p style="font-size:18px"><a href="mailto:${E}">${E}</a></p>
    <p class="muted">Please email from the address associated with your account so we can find it quickly. We aim to respond within a few business days.</p>
    <h3>Billing &amp; payments</h3>
    <p class="muted">Payments are processed by <strong>Paddle</strong>, our merchant of record. Paddle may handle billing, tax, invoices, and buyer support. For payment or invoice questions you can contact us and we will assist or direct you to Paddle.</p>
    <h3>Refunds</h3>
    <p class="muted">See our <a href="/refund">Refund Policy</a>. Refund requests can be sent to the support email above within 14 days of purchase.</p>`);

  return wrap('Not found', '<p class="muted">Unknown page.</p>');
}
