#!/usr/bin/env bash
# Runs supabase/tests/database/*.test.sql against the linked remote project, without Docker.
# Each file runs in one DO block that always ends in an exception: nothing is ever committed.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
failed=0
for f in supabase/tests/database/*.test.sql; do
  python3 scripts/tap2do.py "$f" > "$tmp"
  out=$(npx supabase db query --linked -f "$tmp" 2>&1 < /dev/null || true)
  ok=$(grep -o 'ok [0-9]* - ' <<< "$out" | grep -vc 'not' || true)
  bad=$(grep -o 'not ok [0-9]* - [^\\]*' <<< "$out" || true)
  if [[ -n "$bad" || "$out" != *TAP-RESULTS* ]]; then
    failed=1
    echo "FAIL $(basename "$f")"
    if [[ -n "$bad" ]]; then echo "$bad"; else echo "$out" | tail -5; fi
  else
    echo "ok   $(basename "$f") ($ok tests)"
  fi
done
exit $failed
