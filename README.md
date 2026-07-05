# Pulsewatch

**A dead man's switch for cron jobs.** Your scheduled jobs — backups, scrapers, billing scripts, reports, bots — sometimes fail silently. Pulsewatch pings you the second one misses its check-in.

Zero external dependencies. Single Node process. Embedded SQLite. Deploys in minutes.

---

## How it works
1. Create a monitor (expected period + grace).
2. Add one line to your job: `curl -fsS $APP_URL/ping/<token>`
3. Ping on time → **up**. Ping late/absent → **down**, and you get an email + Slack alert. Next ping → **recovered**.

## Run locally
```bash
# Node 22.5+ required (uses the built-in node:sqlite module)
cp .env.example .env        # optional; sensible defaults work out of the box
npm start                   # → http://localhost:3000
npm test                    # end-to-end lifecycle test (16 assertions)
```
No `npm install` needed — there are no third-party packages.

## Deploy

**Docker**
```bash
docker build -t pulsewatch .
docker run -p 3000:3000 -v pw_data:/data \
  -e SECRET=$(openssl rand -hex 32) -e APP_URL=https://app.yourdomain.com \
  pulsewatch
```

**Render** — push to GitHub, "New > Blueprint", pick this repo (`render.yaml` included). Set `APP_URL` after the first deploy.

**Fly.io** — `fly launch --copy-config --now` (`fly.toml` included), then `fly secrets set SECRET=$(openssl rand -hex 32) APP_URL=https://<app>.fly.dev`.

**Any VPS** — `SECRET=... APP_URL=... node --no-warnings server.js` behind nginx/Caddy. Point a domain at it.

## Required env (production)
| Var | Purpose |
|-----|---------|
| `SECRET` | Signs session cookies. Use `openssl rand -hex 32`. |
| `APP_URL` | Public base URL; builds ping URLs and email links. |
| `DB_PATH` | SQLite file path — put it on a persistent volume. |

## Alerts (optional but recommended)
- **Email:** set `RESEND_API_KEY` + `MAIL_FROM`, *or* `SMTP_HOST/PORT/USER/PASS`. Until set, alerts fire but only log to console.
- **Slack:** paste an Incoming Webhook URL per monitor in the UI (no OAuth needed), or set an account-wide `SLACK_WEBHOOK_URL`.

## Security
- Passwords hashed with scrypt + per-user salt (built-in `node:crypto`).
- Session cookies are HMAC-signed, `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- Ping tokens are 144-bit, URL-safe, unguessable; every monitor is scoped to one account.
- POST routes enforce a same-origin check. Set a strong `SECRET`.

## Architecture
`server.js` (router + scheduler) · `db.js` (SQLite) · `alerts.js` (email/Slack) · `views.js` + `views-app.js` (server-rendered HTML). The scheduler checks every `CHECK_INTERVAL_MS` for monitors whose next check-in is overdue and transitions them to **down**, alerting once per state change (no spam).

## License
MIT
