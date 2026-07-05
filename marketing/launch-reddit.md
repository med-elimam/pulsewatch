# Reddit — launch posts (READ EACH SUB'S RULES FIRST)

General rules: most dev subs forbid pure self-promo. Lead with the story/problem, disclose you built it, don't drop links in the title. Many require a "I built this" flair or restrict to weekend/showcase threads. Engage, don't broadcast.

## r/selfhosted  (great fit — self-hostable angle)
**Title:** I built a zero-dependency, self-hostable "dead man's switch" for cron jobs
**Body:**
I got tired of finding out days later that a backup or scraper cron had silently stopped. Uptime monitors don't help — there's no endpoint to poll when a job just doesn't run.

So I built Pulsewatch: your job pings a unique URL when it finishes; if the ping doesn't arrive on schedule, it alerts you (email/Slack), and the next ping auto-recovers. It only notifies on state changes.

It's a single Node process using the built-in SQLite module — no external DB, no npm dependencies. `node server.js` and it runs; Docker/Render/Fly configs included. MIT licensed. Curious what people here run for cron visibility today, and whether the period+grace model is enough or you'd want full cron-expression matching. Repo in comments.

## r/webdev / r/devops  (use showcase/"Showoff Saturday" threads where required)
**Title:** Cron jobs fail silently and you find out too late — so I built a tiny monitor for it
**Body:** (shorter, problem-first)
Backups, scrapers, report jobs, bots — they break without erroring at anyone. Pulsewatch is a heartbeat monitor: the job pings a URL, silence = alert (email + Slack), next ping = recovery. One curl line to set up, no agent/SDK, free for 1 monitor, and self-hostable if you prefer. Would love feedback on the onboarding. Link in comments.

## r/SaaS / r/indiehackers  (building-in-public angle is welcome)
**Title:** Launched a $5/mo cron-monitoring tool — validated it from 1M+ dev complaints first
**Body:**
Found the pain repeatedly across dev communities: scheduled jobs failing silently with no alert. Built the smallest thing that solves it — create a monitor, add one curl line to your job, get pinged when it stops checking in. Free tier is real (1 monitor). Sharing the build + early lessons; happy to talk pricing and positioning vs Healthchecks/Cronitor.

## r/cronjobs, r/homelab, r/sysadmin  (homelab/ops crowd runs tons of unmonitored cron)
Angle: "How do you know your homelab backups actually ran last night?" Problem-first, mention the tool as how you solved it, link in comments.

## Anti-spam checklist
- One sub at a time, space them out over days.
- Never copy-paste the identical post across subs (looks like spam, gets removed).
- Reply to comments for the first few hours — engagement > reach.
- Put the link in a comment, not the title, where rules require.
