#!/bin/bash
# Run ONE browser test page in headless Chrome and print its PASS/FAIL lines.
# Usage: tests/run.sh <page-name> [seconds=30] [window-width=1000] [#hash]
#   e.g. tests/run.sh dopa            tests/run.sh cutscan 30 410 390
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PAGE=$1; SECS=${2:-30}; WIDTH=${3:-1000}; HASH=${4:+#$4}
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d); OUT=$TMP/result.txt; PORT=$((20000 + RANDOM % 20000))
python3 -I "$ROOT/tests/serve.py" "$ROOT" "$OUT" $PORT & SRV=$!
sleep 0.5
# supabase is blocked so tests never touch real accounts
"$CHROME" --headless=new --disable-gpu --user-data-dir="$TMP/chrome" --host-resolver-rules="MAP *.supabase.co 0.0.0.0" \
  --window-size=$WIDTH,2400 "http://127.0.0.1:$PORT/tests/pages/$PAGE.html$HASH" >/dev/null 2>&1 & CH=$!
for i in $(seq 1 $SECS); do [ -s "$OUT" ] && break; sleep 1; done
kill $CH $SRV 2>/dev/null; wait $CH $SRV 2>/dev/null
if [ -s "$OUT" ]; then cat "$OUT"; echo; else echo "ERROR no result from $PAGE (timed out after ${SECS}s)"; fi
rm -rf "$TMP"
