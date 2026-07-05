# Pulsewatch

**A dead man's switch for cron jobs.** Backups, scrapers, billing scripts, reports, and bots sometimes fail silently — and you find out days later, from a customer or a failed restore. Pulsewatch alerts you by email and Slack the second a scheduled job stops checking in.

Zero external dependencies. Single Node process. Embedded SQLite. Deploys in minutes.

Live site: **https://pulsewatch.maurisis.com**

---

## How it works
1. Create a monitor (expected period + grace).
2. Add one line to your job: `curl -fsS $APP_URL/ping/<token>`
3. Ping on time → **up**. Ping late or absent → **down**, and you get an email + Slack alert. Next ping → **recovered**. Alerts fire only on state changes — no spam.

Optional signals: `/ping/<token>/start` (measures run duration) and `/ping/<token>/fail` (reports an explicit failure and alerts immediately).

## Pricing

| Plan | Price | Monitors |
|------|-------|----------|
| Free | $0/month | 1 |
| Starter | $5/month | 25 |
| Pro | $12/month | 100 |
| Team | $29/month | 500 |

Taxes may apply and are calculated at checkout. Payments are processed by **Paddle**, our merchant of record. Public pricing lives at `/pricing`.

## Run locally
```bash
# Node 22.22.3 (uses the built-in node:sqlite module — no npm install needed)
npm start                 # → http://localhost:3000
npm test                  # end-to-end lifecycle test (18 assertions)
```

## Deploy (Railway — production)
1. Push this repo to GitHub, then create a Railway project from it (Nixpacks; Node pinned via `.nvmrc`).
2. **Attach a Volume** mounted at `/data` (SQLite must live on persistent storage).
3. Set environment variables (see the table below), then redeploy.

Render (`render.yaml`), Fly.io (`fly.toml`), and Docker are also supported — see **DEPLOY.md**, which includes the Paddle review checklist.

## Environment variables
| Var | Required | Purpose |
|-----|----------|---------|
| `SECRET` | ✅ production | Signs session cookies. Generate with `openssl rand -hex 32`. The app refuses to be secure without a strong value. |
| `APP_URL` | ✅ production | Public base URL; builds ping URLs and email links. |
| `DB_PATH` | ✅ production | SQLite path on a **persistent volume** (e.g. `/data/pulsewatch.db`). |
| `RESEND_API_KEY` + `MAIL_FROM` | email | Primary email provider (Resend). SMTP (`SMTP_HOST/PORT/USER/PASS`) is a fallback. |
| `PADDLE_ENV` | billing | `sandbox` or `production`. |
| `PADDLE_CLIENT_TOKEN` | billing | Client-side token used by Paddle.js to open checkout. |
| `PADDLE_STARTER_PRICE_ID` / `PADDLE_PRO_PRICE_ID` / `PADDLE_TEAM_PRICE_ID` | billing | Paddle price IDs matching the plans above. |
| `PADDLE_API_KEY` | billing | Server-side Paddle API key. |
| `PADDLE_WEBHOOK_SECRET` | billing | **Required for billing to work.** Verifies webhook signatures. Without it, webhooks are ignored and no plan changes are applied (fail-closed). |
| `COMPANY_NAME` / `LEGAL_EMAIL` | legal | Shown on `/terms`, `/privacy`, `/refund`, `/contact`. |

A full annotated template is in `.env.example`. **Never commit real secrets** — `.gitignore` excludes `.env`.

## Billing (Paddle)
- Public pricing at `/pricing`; upgrade buttons open Paddle Checkout with the correct price IDs.
- Signature-verified webhook at `POST /webhooks/paddle` handles `transaction.completed` and `subscription.created/updated/canceled`, updating the user's plan, monitor limit, billing status, and Paddle customer/subscription IDs.
- `GET /debug/billing` (login required) returns only booleans — never secret values — to confirm which env vars are set.

## Security
- Passwords hashed with scrypt + per-user salt (built-in `node:crypto`).
- Session cookies are HMAC-signed, `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Ping tokens are 144-bit, URL-safe, unguessable; every monitor is scoped to one account.
- POST routes enforce a same-origin check (CSRF); auth endpoints are rate-limited.
- Responses set `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and HSTS in production.
- Paddle webhooks are signature-verified and **fail-closed**: if `PADDLE_WEBHOOK_SECRET` is unset, no plan change is ever applied.
- `/debug/billing` exposes booleans only and requires login. Remove it after go-live if you prefer.

## Legal
`/terms`, `/privacy`, `/refund`, and `/contact` are built in and linked in the footer of every page.

## Architecture
`server.js` (router + failure-detection scheduler) · `db.js` (SQLite) · `alerts.js` (Resend/SMTP + Slack) · `plans.js` (single source of pricing) · `views.js` + `views-app.js` (server-rendered HTML). The scheduler checks every `CHECK_INTERVAL_MS` for overdue monitors and transitions them to **down**, alerting once per state change.

## License
MIT
