# Hacker News — Show HN

## Title (pick one; keep it plain, HN hates hype)
- Show HN: Pulsewatch – a dead man's switch for cron jobs (self-hostable, zero deps)
- Show HN: Get alerted when a cron job silently stops running

## First comment (post immediately as OP — HN expects the backstory here)
I kept getting burned by scheduled jobs that failed *silently* — a backup that had been erroring for two weeks, a scraper that died when a source changed, a billing cron that just... didn't fire one month. Uptime monitors couldn't help because there's no endpoint to poll; the job simply never ran.

Pulsewatch is the inverse: your job pings a unique URL when it finishes (`curl -fsS $URL/ping/<token>`), and if that ping doesn't arrive within the period + grace you set, it flags the monitor as down and emails/Slacks you. Next ping = auto-recovery + all-clear. It only alerts on state changes, so no spam.

Deliberately boring tech: a single Node process, the built-in `node:sqlite`, no third-party npm deps, server-rendered HTML. You can `node server.js` and self-host it, or use the hosted version. Free tier is 5 monitors.

Things I'd love feedback on:
- The period+grace model vs. full cron-expression parsing — is simple enough, or do you want exact schedule matching?
- Whether the `/start` + `/fail` signals (duration + explicit failure) are worth the extra surface.

Repo / hosted link in the post. Happy to answer anything.

## Notes on HN etiquette
- Post Tue–Thu, ~8–10am ET. Don't ask for upvotes anywhere (bannable).
- Reply to every comment, especially critical ones, non-defensively.
- If someone names a competitor (Healthchecks, Cronitor, DMS), acknowledge them honestly and say what's different (simpler onboarding, zero-dep self-host).
