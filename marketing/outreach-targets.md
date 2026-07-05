# First customers & communities (where the pain lives)

## Communities to post in (rules-respecting, problem-first)
| Community | Why | Angle |
|-----------|-----|-------|
| r/selfhosted | Runs tons of unmonitored cron/backups; loves self-hostable + zero-dep | "self-hostable dead man's switch for cron" |
| r/devops | Feels silent-failure pain professionally | "catch jobs that never ran, not just slow ones" |
| r/homelab | Homelab backups nobody checks | "how do you know last night's backup ran?" |
| r/sysadmin | Scheduled tasks everywhere | scheduled-task visibility |
| r/cronjobs | Exact-topic sub | direct fit |
| r/SaaS, r/indiehackers | Founders + build-in-public | pricing/positioning + build story |
| Hacker News (Show HN) | Devs, self-host + zero-dep resonates | see launch-hackernews.md |
| Indie Hackers | Build-in-public milestone | see launch-indiehackers.md |
| Lobste.rs (if invited) | Quality dev crowd | zero-dep node:sqlite build |
| dev.to / Hashnode | Write "catching silent cron failures" post | SEO + soft launch |
| Relevant Discords/Slacks (Rails, Django, Laravel, DevOps, homelab) | Use their #showcase/#self-promo channels only | short showcase |

## SEO / evergreen (compounding, do once)
- Blog post: "How to know when a cron job silently stops running" → target that exact query.
- Comparison page: "Pulsewatch vs Healthchecks vs Cronitor" (honest).
- Docs pages already target: cron, systemd, GitHub Actions, k8s CronJob, Windows Task Scheduler.

## Direct outreach (1:1, highest intent)
1. **People who just complained.** Search X/Reddit/HN for recent posts: "cron failed silently", "backup wasn't running", "didn't know my job stopped", "scraper died". Reply helpfully (see cold-outreach.md). This is the #1 channel.
2. **Indie hackers with public infra.** Founders who tweet about their VPS/side-project stack.
3. **Small agencies** running scrapers/reports for clients (LinkedIn / their sites).
4. **Existing Healthchecks/Cronitor users** frustrated by price or complexity (find in those tools' subreddit/HN threads) — lead with simplicity/self-host, not trash-talk.

## Distribution assets to make next
- 6–8s GIF: monitor going red → alert → green. (Attach to X, Reddit, HN follow-ups.)
- A public status/demo monitor page people can watch flip live.

## Success metric for week 1
Not signups — *activated* monitors (someone actually added the ping line and it went green). Aim for 10 activated monitors; those are your real first users and your best feedback source.
