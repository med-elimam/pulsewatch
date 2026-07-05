# Pulsewatch — FAQ (sales + support)

**How is this different from UptimeRobot / Pingdom?**
Those ping *your* server from outside and tell you if it answers. That can't detect a backup that silently didn't run — there's no endpoint to poll. Pulsewatch flips it: your job pings us, and the *absence* of a ping is the signal.

**What if the ping itself fails but the job succeeded?**
Use `&&` so you only ping after success, and put the ping as the last step. A one-off network blip is tolerated by your grace window; sustained inability to send a single HTTPS request is itself worth knowing about.

**Won't this spam me?**
No. We alert exactly twice per incident: once when it goes down, once when it recovers. A job that stays down does not re-notify.

**Can it measure how long my job takes?**
Yes — ping `/start` at the beginning and `/` at the end; we record the duration. Ping `/fail` to report an explicit failure and alert immediately.

**Does my server need an inbound port / firewall change?**
No. It only makes one *outbound* HTTPS request. Nothing inbound.

**Is it secure?**
Passwords are scrypt-hashed with per-user salts. Sessions are signed HttpOnly cookies. Each monitor has its own 144-bit token and is isolated to your account.

**Can I self-host?**
Yes. It's a single Node process with an embedded SQLite database and no third-party dependencies. `node server.js` and you're running.

**What happens when I hit the free limit?**
Free covers 5 monitors. Beyond that you upgrade to Pro ($5/mo, 50 monitors) or Team ($19/mo, unlimited + seats).

**Do you support Kubernetes CronJobs / GitHub Actions / systemd / Windows Task Scheduler?**
Anything that can make an HTTP request can ping. Docs include copy-paste examples for all of these.
