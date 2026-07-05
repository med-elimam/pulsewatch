# X / Twitter — launch thread

1/ Your cron jobs fail silently.

The nightly backup. The hourly scraper. The monthly billing run.

They break without erroring at anyone — and you find out days later, usually from a customer.

I built Pulsewatch to fix exactly that. 🧵

2/ Uptime monitors can't catch this.

They poll your website and check it responds. But a scheduled job that *never runs* has no endpoint to poll. There's nothing to ping. The failure is invisible.

3/ Pulsewatch flips the model.

Your job pings a unique URL when it finishes:

curl -fsS app.pulsewatch.io/ping/<token>

If that ping doesn't arrive on time → it's marked DOWN and you get an email + Slack alert. Silence is the signal.

4/ Next successful ping = auto-recovery + an all-clear.

It only alerts on state changes. One message when it breaks, one when it's fixed. No 3am spam for a job that's still down.

5/ Setup is one line. No agent, no SDK.

Works with cron, systemd timers, GitHub Actions, k8s CronJobs, Lambda, Windows Task Scheduler — anything that can make an HTTP request.

Want more? /start + /fail signals give you run duration and explicit failure alerts.

6/ Boring tech on purpose: a single Node process, embedded SQLite, zero dependencies. Self-host it or use the hosted version. Free for 1 monitor.

7/ If you run anything on a schedule, ask yourself: how would you know if it stopped last night?

If the honest answer is "I wouldn't," try it 👉 [link]

Feedback very welcome — reply or DM.

## Notes
- Post the thread, then reply to your own thread with the repo link (links can suppress reach in the main post).
- Quote-tweet later with a short demo GIF of a monitor going red → green.
