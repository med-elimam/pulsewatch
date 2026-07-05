# Pulsewatch — Production Deployment Runbook

Tested on **Node 22.22.3** (pinned in `package.json` engines, `.node-version`, `.nvmrc`, and `Dockerfile`).
Zero dependencies — there is nothing to `npm install`.

## Required production environment variables
| Var | Required | Example | Notes |
|-----|----------|---------|-------|
| `SECRET` | ✅ | `openssl rand -hex 32` | Signs session cookies. Keep secret. |
| `APP_URL` | ✅ | `https://pulsewatch.onrender.com` | Public base URL. Builds ping URLs + email links. |
| `DB_PATH` | ✅ | `/var/data/pulsewatch.db` | **Must be on a persistent volume**, never ephemeral container storage. |
| `RESEND_API_KEY` | ✅ (for email) | `re_xxx` | Primary email provider. |
| `MAIL_FROM` | ✅ (for email) | `Pulsewatch <alerts@yourdomain.com>` | Must be a Resend-verified domain. For a quick test use `onboarding@resend.dev` (only sends to your own Resend account email). |
| `NODE_ENV` | recommended | `production` | Enables Secure cookies + self-check warnings. |
| `SLACK_WEBHOOK_URL` | optional | `https://hooks.slack.com/...` | Account-wide fallback; per-monitor webhooks are set in the UI. |

On boot the app prints a **startup self-check** to logs showing exactly which of these are set and whether DB_PATH looks persistent — read it to confirm your config.

---

## Option A — Render (recommended, blueprint included)
1. Push this repo to GitHub (see PUSH-TO-GITHUB.md).
2. Render Dashboard → **New → Blueprint** → select the repo. It reads `render.yaml`.
3. The blueprint provisions a web service **with a 1 GB Persistent Disk mounted at `/var/data`** and sets `DB_PATH=/var/data/pulsewatch.db` (persistent ✔). `SECRET` is auto-generated.
4. In the service's **Environment**, fill the `sync:false` vars:
   - `APP_URL` = your Render URL (e.g. `https://pulsewatch.onrender.com`)
   - `RESEND_API_KEY` = your Resend key
   - `MAIL_FROM` = your verified sender
5. Deploy. Health check is `/healthz`.
> Note: a Persistent Disk requires Render's **Starter** paid instance (blueprint sets `plan: starter`). The free tier has only ephemeral storage — do not use it for the DB.

## Option B — Railway (Volume required)
1. Push to GitHub. Railway → **New Project → Deploy from GitHub repo**. It uses Nixpacks (`railway.json`) and pins Node via `.nvmrc`.
2. **Create a Volume:** project → your service → **Settings → Volumes → New Volume**, mount path **`/data`**.
3. Set variables (service → **Variables**):
   - `DB_PATH=/data/pulsewatch.db`  ← inside the Volume (persistent ✔)
   - `SECRET` = `openssl rand -hex 32`
   - `APP_URL` = your Railway public URL
   - `NODE_ENV=production`
   - `RESEND_API_KEY`, `MAIL_FROM`
4. Redeploy. Confirm the startup self-check in logs shows `DB_PATH: /data/pulsewatch.db` and `Email provider: Resend (primary)`.

## Option C — Fly.io
```bash
fly launch --copy-config --now         # uses fly.toml + pinned Dockerfile; creates volume pulsewatch_data at /data
fly secrets set SECRET=$(openssl rand -hex 32) \
  APP_URL=https://<your-app>.fly.dev \
  RESEND_API_KEY=re_xxx MAIL_FROM="Pulsewatch <alerts@yourdomain.com>"
```
`DB_PATH=/data/pulsewatch.db` is already set to the mounted volume in `fly.toml`.

## Option D — Any VPS + Docker
```bash
docker build -t pulsewatch .
docker volume create pw_data
docker run -d --restart=always -p 80:3000 -v pw_data:/data \
  -e SECRET=$(openssl rand -hex 32) \
  -e APP_URL=https://pulsewatch.yourdomain.com \
  -e NODE_ENV=production \
  -e RESEND_API_KEY=re_xxx \
  -e MAIL_FROM="Pulsewatch <alerts@yourdomain.com>" \
  pulsewatch
```
Put Caddy/nginx in front for TLS, or use `-p 443` with your own certs.

---

## After deploy — prove the flow (script included)
```bash
BASE=https://your-live-url ./verify-live.sh
```
It signs up, creates a monitor, pings it UP, uses `/fail` to force DOWN, pings recovery UP, and fires a test alert — printing PASS/FAIL for each. To also prove **scheduler-based** DOWN, it creates a 30s-period monitor and waits ~40s.

## Custom domain
Point a CNAME/A record at your host, add the domain in the host dashboard, then set `APP_URL` to the custom domain and redeploy so ping URLs/emails use it.

---

## Email deliverability (avoid the spam folder)
The alert templates are already spam-conscious: plain transactional subjects (`[Pulsewatch] Monitor down: <name>`), no emoji, professional English, and both plain-text and HTML parts. The remaining factors are on the sending domain — do these in Resend:

1. **Verify your own domain** in Resend and send `MAIL_FROM` from it (e.g. `Pulsewatch <alerts@yourdomain.com>`). Avoid `onboarding@resend.dev` for real traffic — shared/test senders land in spam more often.
2. **Add the DNS records Resend gives you: SPF, DKIM, and DMARC.** DKIM especially is what Gmail checks; without it, expect spam placement. DMARC (`v=DMARC1; p=none; rua=mailto:you@yourdomain.com`) is enough to start.
3. **Use a subdomain for alerts** (e.g. `mail.yourdomain.com`) so monitoring email doesn't affect your main domain reputation.
4. Optionally set `MAIL_REPLY_TO` to a real inbox — a valid Reply-To improves trust.
5. After DNS verifies, send the **test alert** again and, in Gmail, use "Report not spam" once — reputation builds quickly for low-volume transactional mail.

These are DNS/provider steps only; no code change is needed.

---

## Paddle domain review readiness
Public pricing must be clearly visible (no login) and identical to the Paddle product prices.

Plans (must match Paddle exactly):

| Plan | Price | Monitors |
|------|-------|----------|
| Free | $0/month | 1 |
| Starter | $5/month | 25 |
| Pro | $12/month | 100 |
| Team | $29/month | 500 |

Checklist before resubmitting to Paddle:
- [ ] Public pricing page exists at `/pricing` and is visible without login.
- [ ] Landing page shows a pricing section that links to `/pricing`.
- [ ] Prices on landing, `/pricing`, `/billing`, and checkout buttons all match the Paddle product prices above.
- [ ] Tax note visible under pricing: "Taxes may apply and will be calculated at checkout."
- [ ] Billing frequency shown everywhere as "$X/month" (never a bare "$X").
- [ ] No hidden checkout-only prices; no "free trial", "intro price", "limited offer", or "discount" wording (none are configured in Paddle).
- [ ] `/terms`, `/privacy`, `/refund`, `/contact` pages exist and are linked in the footer on every public page.
- [ ] Contact page shows a working support email.
- [ ] `APP_URL=https://pulsewatch.maurisis.com` in production env.
- [ ] Paddle env set: `PADDLE_ENV`, `PADDLE_CLIENT_TOKEN`, `PADDLE_STARTER_PRICE_ID`, `PADDLE_PRO_PRICE_ID`, `PADDLE_TEAM_PRICE_ID` (and `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` for webhooks).
- [ ] Paddle webhook URL configured in the Paddle dashboard (point it at your deployment; handler for subscription events is a follow-up task).
- [ ] Payments processed by Paddle as merchant of record (stated on `/pricing`, `/refund`, `/contact`).

Note: this build does not include Stripe. Payments are handled exclusively by Paddle.
