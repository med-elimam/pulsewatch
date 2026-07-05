#!/usr/bin/env bash
# Prove the full Pulsewatch flow against a LIVE deployment.
# Usage: BASE=https://pulsewatch.maurisis.com ./verify-live.sh [email] [password]
set -u
BASE="${BASE:?Set BASE to your live URL, e.g. BASE=https://pulsewatch.onrender.com}"
EMAIL="${1:-verify+$(date +%s)@example.com}"
PASS="${2:-verifypassword123}"
J="$(mktemp)"; pass=0; fail=0
ok(){ if [ "$1" = "1" ]; then pass=$((pass+1)); echo "  ✓ $2"; else fail=$((fail+1)); echo "  ✗ FAIL: $2"; fi; }
code(){ curl -s -m15 -o /dev/null -w '%{http_code}' "$@"; }

echo "== Verifying $BASE =="
[ "$(code $BASE/healthz)" = "200" ] && ok 1 "health endpoint" || ok 0 "health endpoint"
[ "$(code $BASE/)" = "200" ] && ok 1 "landing page" || ok 0 "landing page"

# signup
sc=$(curl -s -m15 -c "$J" -b "$J" -H "Origin: $BASE" -d "email=$EMAIL&password=$PASS" -o /dev/null -w '%{http_code}' "$BASE/signup")
[ "$sc" = "302" ] && ok 1 "signup ($EMAIL)" || ok 0 "signup got $sc"

# create a monitor with a 30s period so the scheduler will trip it
loc=$(curl -s -m15 -c "$J" -b "$J" -H "Origin: $BASE" -d "name=Live Verify Monitor&period=30&grace=0" -D - -o /dev/null "$BASE/app/new" | grep -i '^location:' | tr -d '\r' | awk '{print $2}')
MID=$(echo "$loc" | grep -o '/app/m/[0-9a-f-]\{36\}')
[ -n "$MID" ] && ok 1 "create monitor" || ok 0 "create monitor"
TOK=$(curl -s -m15 -c "$J" -b "$J" "$BASE$MID" | grep -o 'ping/[A-Za-z0-9_-]\{20,\}' | head -1 | cut -d/ -f2)
[ -n "$TOK" ] && ok 1 "unique ping token: ${TOK:0:8}..." || ok 0 "ping token"
echo "     ping URL: $BASE/ping/$TOK"

# ping -> UP
r=$(curl -s -m15 "$BASE/ping/$TOK"); echo "$r" | grep -q '"status":"up"' && ok 1 "ping -> UP" || ok 0 "ping -> UP ($r)"

# explicit /fail -> DOWN (fast proof)
curl -s -m15 "$BASE/ping/$TOK/fail" >/dev/null; sleep 2
curl -s -m15 -c "$J" -b "$J" "$BASE$MID" | grep -q 'badge down' && ok 1 "/fail -> DOWN" || ok 0 "/fail -> DOWN"

# recovery -> UP
curl -s -m15 "$BASE/ping/$TOK" >/dev/null; sleep 2
curl -s -m15 -c "$J" -b "$J" "$BASE$MID" | grep -q 'badge up' && ok 1 "recovery ping -> UP" || ok 0 "recovery -> UP"

# scheduler-based DOWN: stop pinging, wait past period+grace+check interval
echo "  … waiting ~45s to prove SCHEDULER auto-detects a missed check-in (no ping sent)"
sleep 45
curl -s -m15 -c "$J" -b "$J" "$BASE$MID" | grep -q 'badge down' && ok 1 "scheduler auto-detected missed check-in -> DOWN" || ok 0 "scheduler DOWN (may need a few more seconds)"

# test alert (email/Slack)
tc=$(curl -s -m15 -c "$J" -b "$J" -H "Origin: $BASE" -X POST -o /dev/null -w '%{http_code}' "$BASE$MID/test")
[ "$tc" = "302" ] && ok 1 "test-alert fired (check inbox/Slack)" || ok 0 "test-alert ($tc)"

echo ""; echo "RESULT: $pass passed, $fail failed"
echo "Login to see it in the UI:  $BASE/login  ($EMAIL / $PASS)"
rm -f "$J"; [ "$fail" = "0" ]
