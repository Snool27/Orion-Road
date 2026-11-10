---
name: ship
description: Test, version, commit, push and verify Orion Road is live. Use when Tim says "ship it", "push it live", or after finishing a change he approved.
---

# Ship Orion Road

Run these steps in order from the repo root. Stop and report if any step fails; never push failing tests.

1. **Check what's changing.** `git status --short` and `git diff --stat`. If nothing changed, say so and stop. If files you didn't touch are modified, ask before including them.
2. **Run every test.** `tests/run-all.sh` (takes ~3 minutes). It must end with `ALL GOOD`.
   - If a check fails because behaviour changed *on purpose*, update that check in `tests/pages/` and rerun. Otherwise fix the bug first.
3. **Bump the version.** In `js/squad.js`, `BUILD="YYYY-MM-DD.N"`: use today's date; increase `N` if the date is unchanged, else start at `1`.
4. **Commit.** One clear sentence of what changed for players, then a blank line and the Co-Authored-By line.
5. **Push.** `git push`.
6. **Verify live.** Poll a file you changed (add `?x=$RANDOM` to bust caches) until it contains the new content, up to ~3 minutes:
   `curl -s "https://snool27.github.io/Orion-Road/js/squad.js?x=$RANDOM" | grep -o 'BUILD="[^"]*"'`
7. **Journal.** Add a short dated entry to `~/Desktop/claude files/Learning-Journal.md`: what changed, plus any new idea learned.
8. **Report** to Tim in plain words: what's now live, test results (counts), and anything that still needs his eyes.
