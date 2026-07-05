# Indie Hackers — launch / milestone post

**Title:** I shipped Pulsewatch — a dead man's switch for cron jobs. Here's the build + go-to-market.

**Body:**
**The problem.** Scheduled jobs (backups, scrapers, billing runs, digests) fail silently. Your error handling can't fire if the job never ran, the box rebooted, or cron itself broke. You find out from a customer, or a failed restore. Uptime monitors are blind to this — there's no endpoint to poll.

**The product.** Create a monitor with an expected period + grace. Add one line to the job: `curl -fsS $URL/ping/<token>`. If the ping is late, Pulsewatch marks it down and emails/Slacks you; the next ping auto-recovers and sends an all-clear. Alerts only fire on state changes — no spam. Optional `/start` and `/fail` signals give you run-duration and explicit-failure alerts.

**The stack (boring on purpose).** One Node process, built-in `node:sqlite`, zero npm dependencies, server-rendered HTML. Self-hostable (`node server.js`) or hosted. This keeps it cheap to run and trivially deployable.

**Pricing.** Free = 1 monitor. Starter = $5/month (25 monitors). Pro = $12/month (100). Team = $29/month (500). Priced under Cronitor deliberately — this category sells on trust and volume.

**GTM plan.** Show HN, r/selfhosted + r/devops (rules-respecting, problem-first), a build-in-public thread on X, and direct outreach to indie devs who've publicly complained about a silent cron failure.

Ask: what would make you trust a monitoring tool enough to actually route your alerts through it? That's the real adoption barrier and I want to get it right.
