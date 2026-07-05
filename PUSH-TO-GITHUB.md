# Push Pulsewatch to GitHub

You have two easy paths.

## Path 1 — from the included git bundle (fastest, no history rebuild)
This folder ships with `pulsewatch.bundle` (a complete git repo with one commit).
```bash
git clone pulsewatch.bundle pulsewatch && cd pulsewatch
# create an EMPTY repo on GitHub named 'pulsewatch' (no README), then:
git remote set-url origin https://github.com/<you>/pulsewatch.git
git push -u origin main
```

## Path 2 — fresh init from these files
```bash
cd pulsewatch
git init -b main
git add .
git commit -m "Pulsewatch: cron/heartbeat monitor MVP (auth, monitors, ping API, scheduler, email+Slack alerts)"
git remote add origin https://github.com/<you>/pulsewatch.git
git push -u origin main
```

`.gitignore` already excludes `node_modules/`, `data/`, `*.db`, and `.env`, so no secrets or local DB are committed.

After it's on GitHub, follow **DEPLOY.md** (Render blueprint is the quickest).
