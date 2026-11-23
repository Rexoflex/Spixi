# Handoff 2026-11-23 walktools2 — the seed's quote chat, the cold-start watch, home probe sets, the lockfile (DELIVERED, NO WALK; one phone block owed)

Read this FIRST, then DECISIONS #1935–#1943. Number block of this session: #1935–#1949 (used: #1935–#1943; #1944–#1949 stay empty) ·
lessons L289–L292 (all used) · packet P102. Prompt: project doc `claude/session-walktools2-prompt.md` (Ready by ruling #1838).
Contract: `docs/contract-walktools2.md`. Review: `docs/review-brief-walktools2.md`. The main chat gives the next block and writes the next prompt.

## 0 · State
- Branch: `work/walktools2` · base: `redesign/frontend` @ `462ba3e4` ("Merge pull request #24 from Rexoflex/work/histcs"), merged with
  the newest base `23c9c495` ("Merge pull request #25 from Rexoflex/work/docsb2") before the push (a merge commit) · pushed by the
  session (#1546); Damir opens the pull request with the compare link of the status doc · merge = Damir.
- CI (`redesign-ci`): not run at the time of this commit — see the status doc.
- Smoke: `BASELINE OK — 7035 pass / the 2 KNOWN (#136 · B3)` (the final tree, before the merge; the merged tree: the status doc) · environment: cloud twin + Ixian-Core @ `097341a`, the tools from `npm ci` on the committed lock (jsdom 29.1.1),
  `TZ=America/Los_Angeles` · delta +35 = `pins-walktools2/a-quote-seed` 8 + `b-coldwatch` 13 + `c-home-sets` 5 + `d-lockfile` 9 · CSH `pass=876 fail=0` (= 866 + 10).
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` ✓ (289 files) · no `src/**` change, so no pipeline.
- Review: CLEAN at r2 (MAJOR 2 → 0 → 0) + ONE Fable 5.2 security pass 0 MAJOR / 0 MINOR / 5 NIT recorded (#1942; brief § 5) · models: lead Claude Opus · builders Opus (items 1, 2 + 3 script, the r1 fix of items 2–3), Sonnet (item 3 map,
  item 4, the re-base passes, the r1 / r2 fixes of items 1, 4 and the pins) · readers Opus (r1 A / B / C, r2 X) + ONE Claude Fable 5.2
  security-only pass on the final tree.
- ⚠ C# UNCOMPILED: `Spixi/Utils/SDevSeed.cs` (the Windows job of `redesign-ci` compiles it first; `SDevSeedPlan.cs` compiles in CSH).
- PowerShell: both walk scripts EXECUTED on pwsh 7.4.6 (Linux, cloud twin) by the by-hand runners; never on Windows PowerShell 5.1,
  never on the phone (the phone block).
- Definition of done: no `docs/release-readiness.md` row changed.
- Still owed: the phone block (only on the main chat's step; the steps are in the status doc); the doc sentences of the old npm line
  (old → new in the status doc); the Artifact "Spixi History C# — walk rows" still holds the OLD W-5 / A-5 (Seed 05).

## 1 · What this session did
| Item | Result | Evidence | MC |
|---|---|---|---|
| 1 seed quote chat | built: Seed 57 Mojca Vrabec, 1000 rows, 16-byte ids, four replies (depth 0 / 1 / 170 / 230 → 320 / 415 / 485 / 640); W-5 / A-5 of `docs/walk-histcs.md` name the build, the chat and the messages | #1935, #1936; CSH `WalkTools2SeedTests`; `pins-walktools2/a-quote-seed` | `n-20261123-devseed-no-quote-reply` |
| 2 cold-start watch | built: the opt-in step `coldstart-watch`; the evidence of a not-proven start kept before any buffer clear; five count rows + facts lines | #1937, #1938; `pins-walktools2/b-coldwatch` + `b-coldwatch-run.mjs` | `n-20261123-android-cold-start-process-death` |
| 3 dark home sets | built: `screens.home` in the `sets` form; dark values proposed (#192853, #1A1C1F, #3050BD) — the phone block confirms | #1939; `pins-walktools2/c-home-sets` + `c-home-render.mjs` | (prompt item 3) |
| 4 lockfile | built: `package.json` + `package-lock.json` (122 packages = the proven install), `npm ci` in CI | #1940; `pins-walktools2/d-lockfile` (k9 holds the tree) | `n-20261111-jsdom31-smoke-rows` (ruling #1831) |
| 5 pins | `pins-walktools2/<a-quote-seed\|b-coldwatch\|c-home-sets\|d-lockfile>` in the smoke; the hashed walk pins re-based twice | #1941 | — |

## 2 · Walk
None (#1472 does not count tooling, test code and developer seed data; the prompt: "no walk"). The phone block measures (status doc).

## 3 · The phone block (only on the main chat's step; about 45 minutes)
The steps are in `claude/session-walktools2-status.md` § "The phone block", one line at a time: read App lock (Off) and the theme
(Light) → build + `adb install -r` → "Remove seeded contacts", "Seed 50 · heavy" → `-Calibrate` light → Dark by hand → `-Calibrate` →
Light again → `-Steps coldstart-watch -Repeats 50` → the numbers doc `claude/device-numbers-<date>-walktools2.md`.

## 4 · Open questions and findings for the main chat
| For | What | Blocks |
|---|---|---|
| main chat / a docs batch | the old → new sentences of the npm line (`CLAUDE.md` step 5, `docs/templates/session-prompt.md`, `docs/process.md` :76 / :205, `docs/orchestration.md`; the script messages of `scripts/smoke-test.mjs`, `scripts/cs-syntax-check.mjs`, `x-parser-crosscheck.mjs`) + "do not run `npm audit fix`" (status doc) | nothing |
| main chat | the Artifact "Spixi History C# — walk rows" holds the old W-5 / A-5 (Seed 05, no build line): update it from `docs/walk-histcs.md` before the quote-jump walk | the W-5 / A-5 walk |
| main chat (option) | `-HistorySeed` / `-SeedIndex` end at index 55; the walk could drive Seed 57 later | nothing |

## 5 · Recorded, not changed
- #1938: the numeric `killinfo` fields of every process stay in a kept events file (an option: keep only the started pids after the pull).
- #1940: one `[MODULE_TYPELESS_PACKAGE_JSON]` warning per node process on stderr (behaviour unchanged; `"type": "module"` not chosen).
- #1937: one unreadable second `pidof` makes a 50-start run "no data" (fail closed; run it again).
- `.github/workflows/redesign-ci.yml` lines 3 and 94 keep the words "the ONE npm line" / "on the npm line above" (a change moves the
  `pins-leanfollow/d-ci` hash; a docs line for later).
- The unseed removes the Seed 57 contact only (`SPeerLocalStores.forget` is not called, as for every seed contact).

## 6 · Lessons
L289–L292 (`docs/lessons.md`).

## 7 · Repo commands for Damir (PowerShell, one line at a time)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/walktools2
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; npm ci
```
The last line replaces the old `npm i --no-save …` line on the PC (only for a local smoke; the walk scripts need no npm).
