#!/bin/bash
# Run every browser test. Prints one summary line per page; exits 1 if anything failed.
# Usage: tests/run-all.sh          (add -v to see every check)
DIR="$(cd "$(dirname "$0")" && pwd)"; BAD=0
run(){ local name=$1; shift; local out; out=$("$DIR/run.sh" "$@")
  local p f; p=$(echo "$out" | grep -c '^PASS'); f=$(echo "$out" | grep -cE '^FAIL|^ERROR|CUT-BY-PARENT|ELLIPSIS|CLIPPED-SELF')
printf "%-18s %3s pass  %s fail\n" "$name" "$p" "$f"
  if [ "$f" != 0 ] || [ "$V" = 1 ]; then echo "$out" | grep -vE '^PASS|^$' | sed 's/^/    /'; fi
  [ "$f" != 0 ] && BAD=1; }
[ "$1" = "-v" ] && V=1
for p in test dopa tap bld tabp next stat fold rowfill r10 goalw; do run $p $p; done
for w in 390 768 1200; do run "cutscan@$w" cutscan 30 $((w+20)) $w; done
echo; [ $BAD = 0 ] && echo "ALL GOOD" || echo "SOMETHING FAILED (see above)"; exit $BAD
