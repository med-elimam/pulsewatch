# Pulsewatch — Positioning & Messaging

## One-liner
Pulsewatch tells you the second a cron job, backup, or scheduled script stops running — before your customers do.

## The wedge (why this, why now)
Uptime monitors (Pingdom, UptimeRobot, BetterStack) watch things that respond to requests: websites, APIs. They are blind to work that happens *on a schedule* and produces no request — the nightly backup, the hourly scraper, the monthly billing run. When those fail, nothing errors *at a human*. You find out days later, usually from a customer or a failed restore. Pulsewatch closes exactly that blind spot with the inverse model: the job pings us, and silence is the alert.

## Category
Cron/heartbeat monitoring ("dead man's switch"). Peers: Healthchecks.io, Cronitor, Dead Man's Snitch, Cronhub.

## Ideal customer (who feels this pain first)
1. Solo devs & indie hackers running side-project cron on a VPS.
2. Small SaaS teams (2–15) with backups, ETL, billing, digest emails on schedule.
3. Agencies running scrapers/reports for many client sites.
4. Ops/DevOps at companies too small for Datadog but past "hope it ran."

## Positioning vs. alternatives
- **vs. uptime monitors:** they poll your endpoint; we catch jobs that never even started. Complementary, not competitive.
- **vs. Datadog/enterprise APM:** we're one feature, $0–$5, set up in a minute. No agents, no sales call.
- **vs. Cronitor/DMS:** simpler onboarding, generous free tier, self-hostable single binary-style Node app.
- **vs. "I'll just add error handling":** error handling can't fire if the job never ran, the box rebooted, or cron itself broke. Only an external clock catches non-execution.

## Messaging pillars
1. **Catch silent failures** — the ones your own error handling can't.
2. **60-second setup** — one curl line, no SDK, no agent.
3. **No spam** — one alert on break, one on recovery. That's it.
4. **Trustworthy** — unguessable tokens, per-account isolation, self-hostable.

## Naming rationale
"Pulsewatch": jobs have a *pulse* (the heartbeat ping); we *watch* it. Sounds like infrastructure, not a toy. Live domain: pulsewatch.maurisis.com (APP_URL).

## Pricing rationale
Free tier (1 monitor, email+Slack) lets someone protect their single most critical job forever — enough to build trust and pull them in. Starter $5/month (25 monitors) and Pro $12/month (100) undercut Cronitor ($49+) and target the indie/solo wallet; Team $29/month (500) serves agencies. Deliberately cheap: this category sells on trust and volume, not margin per seat.
