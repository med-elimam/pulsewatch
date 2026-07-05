# Demo script (≤ 90 seconds — for a Loom/GIF or live call)

**0:00 — The hook (say this over the landing page)**
"Every team runs jobs on a schedule — backups, scrapers, billing. When one fails, usually nothing errors at a human. You find out days later. Here's how Pulsewatch catches that."

**0:10 — Create a monitor**
Click "New monitor." "I'll monitor a nightly backup — runs every day, I'll allow 5 minutes of grace." Create.

**0:20 — The aha (onboarding)**
Point at the yellow "Waiting for the first ping" banner. "It gives me one line to add to my job." Copy the curl snippet.

**0:30 — Run the job**
In a terminal: paste the curl. Flip back — monitor is now green/UP, last check-in "just now." "That's the whole integration. One line."

**0:45 — Show the failure**
"Now imagine the job stops running." (Either wait past the window, or on the demo instance show a monitor already red.) Monitor flips to DOWN; an email + Slack alert lands. "This is the alert you'd never have gotten otherwise."

**1:05 — Recovery**
Ping again. Monitor flips back to UP; all-clear alert. "Auto-recovery. And it only alerts on changes — no spam."

**1:20 — Close**
"One line to set up, free for five monitors, self-hostable. Link's below — tell me if the onboarding made sense."

## Tips
- Pre-create a monitor that's already DOWN so you don't have to wait live.
- Record at 1280×720, hide secrets, use a demo account.
