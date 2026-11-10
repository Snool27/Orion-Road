# Orion Road

A camo-grind tracker for **Modern Warfare 4** that Tim (GitHub/Supabase: Snool27) built with Claude Code, used by Tim and a group of friends.
Live: https://snool27.github.io/Orion-Road/ — every push to `main` deploys in ~20–30 s.

## Who you're working with
- Tim is a beginner learning web development through this project. For anything new, explain briefly in plain words, with an example.
- After each piece of work, add a short entry to `~/Desktop/claude files/Learning-Journal.md` (what changed + any new idea learned).
- Tim cares about how it *feels*: satisfying ("dopamine") but clean, never cluttered or tacky. Show screenshots of visual changes before calling them done.

## How the site is built
Plain HTML/CSS/JS, no build step. Scripts load in this order (classic scripts, shared globals):

| File | What's in it |
|---|---|
| `index.html` | page structure only |
| `css/style.css` | all styles. Later rules win; the newest design layers ("round N") are at the end |
| `js/data.js` | `WEAPONS` (33 launch guns + Season guns with `season:1`), `CLS`, `TRACKS` (mastery: Orion/Helio/Empyros), challenge text |
| `js/app.js` | state `S`, the camo maths, `render()`, gun rows, tabs, top tiles |
| `js/squad.js` | Supabase: accounts, cloud save (compare-and-swap + 3-way merge), friends, chat. `BUILD` version string |
| `js/builds.js` | the Build box inside an opened gun, reads `builds.json` |
| `js/ui.js` | button wiring |
| `js/boot.js` | start-up, service worker registration |
| `sw.js` | offline cache; network-first for js/css/json; never caches supabase |
| `builds.json` | loadouts per gun/mode. `scripts/update_builds.py` + `.github/workflows/builds.yml` can refresh it daily once the `ANTHROPIC_API_KEY` repo secret exists |

## Game rules the code follows (don't change without asking)
- **33 launch guns** are the requirement. Season guns are bonus; they **can stand in** for any gun ("any 33 guns at Platinum unlock Harmonic Break"), and a Season gun can be switched off ("Count this gun").
- A class counts as Gold/Plat/HB when it has as many guns at that camo as it has launch guns (Season guns of that class can fill in). Helpers: `POOL(c)`, `NEED(c)`, `reach(c,k)`.
- Divergence = 33 at HB. Mastery tracks (Orion MP, Helio DMZ, Empyros WZ) come after Divergence.

## Design rules Tim has set
- Keep what makes it Orion Road: each gun's tile is tinted with its **latest camo** (mastery stripes too), effort-weighted %, the "Next for every gun" card, Season bonus, milestone tiles, Squad, Builds. Don't copy other trackers' plain checkbox grids.
- Gun list = **one gun per row**: camo tile on the left; buttons (MIL SPEC GOLD PLAT HB PRES, Next ▸) and % with a round ▾ on the right; the camo boxes are fillable **without opening** the gun. No 2-up card grids, no full-card camo.
- **Text must always be readable**: never text over two different backgrounds; dark text on light camos (Platinum, light specials), white on dark. **No label boxes/pills** behind text (Tim found them ugly).
- **Nothing cut off** with "…" — `tests/pages/cutscan.html` checks phone/tablet/computer widths.
- Class tabs: one solid camo per tab (highest reached, from Gold up); progress to the next camo is a band along the bottom.
- Progress tiles stretch across the full width, count depends on the goal; rewards (sparkles/bounce) only when something is earned, nothing blinks idly.
- No "this session" tally.

## Testing (always before pushing)
```
tests/run-all.sh        # every browser test, ~3 min; prints ALL GOOD or what failed
tests/run.sh dopa       # one page
tests/run-all.sh -v     # show every check
```
Tests run in headless Chrome against a local copy and **block Supabase**, so they never touch real accounts. When behaviour changes on purpose, update the matching check in `tests/pages/` rather than deleting it. New feature → add a check.

## Shipping
Use `/ship` (see `.claude/skills/ship`). By hand: run tests → bump `BUILD` in `js/squad.js` → commit (end the message with the Co-Authored-By line) → `git push` → confirm the live file changed.
Only the website files are published (see `.github/workflows/pages.yml`); `tests/`, `scripts/`, `*.sql`, this file and `.claude/` stay in the repo only.

## Be careful with
- **Supabase project `rloasjfejbcupctjkuna` holds real friends' accounts, progress and chats.** Never run SQL, delete rows or change policies without Tim saying yes to that specific action. The SQL files here are history/reference.
- Never put API keys or secrets in code or chat. The Anthropic key lives only as a GitHub repo secret.
- Pushing = changing the live site friends use. Keep commits small and tested.
