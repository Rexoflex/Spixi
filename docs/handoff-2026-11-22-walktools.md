# Handoff 2026-11-22 walktools — two timing flakes, the screen probe sets, the parser rows, the seed voice ids, the jsdom rows (DELIVERED, NO WALK)

Read this FIRST, then DECISIONS #1875–#1887. Number block of this session: #1875–#1889 (used: #1875–#1887; #1888–#1889 stay
empty) · lessons L273–L276 (all used) · packet P93. The main chat gives the next block; it writes the next prompt.
Prompt: project doc `claude/session-walktools-prompt.md`. Contract: `docs/contract-walktools.md`. Mechanisms and measurements:
`docs/walktools-mechanisms.md`. Review: `docs/review-brief-walktools.md`.

## 0 · State
- Branch: `work/walktools` · base: `redesign/frontend` @ `338d30f4` ("Merge pull request #18 from Rexoflex/work/defaultsb") · pushed
  by the session (#1546); Damir opens the pull request with the compare link of the status doc · merge = Damir.
- CI (`redesign-ci`): not run at the time of this commit — see the status doc.
- Smoke: `BASELINE OK — 6791 pass / the 2 KNOWN (#136 · B3)` (2026-11-23) · environment: cloud twin + Ixian-Core @ `097341a`, jsdom 29.1.1, `TZ=America/Los_Angeles` · delta +17 =
  `pins-walktools/b-screens` 8 + `pins-walktools/c-parser` 9 · CSH `pass=812 fail=0` (= 806 + 6 `WalkToolsSeedTests`) · jsdom 31.0.1:
  the six rows of #1749 (1) green; the full smoke 6589 pass + 200 unexpected red + the 2 KNOWN, exit 1 (#1886).
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` ✓ · no `src/**` change, so no pipeline.
- Review: CLEAN at r3 (MAJOR 1 → 0 → 0) + the Fable 5.2 security pass 0 MAJOR / 0 MINOR (#1885; recorded findings in the brief § 5) · models: lead Claude Opus · builders Opus (item 1, its fix rounds, item 5's fix rounds), Sonnet (items 2–5,
  the re-base passes) · readers Opus (rounds 1–3) + ONE Claude Fable 5.2 security-only pass on `scripts/device/**` and `SDevSeed*.cs`.
- ⚠ C# UNCOMPILED: `Spixi/Utils/SDevSeed.cs` (one line; `SDevSeedPlan.cs` compiles in CSH) — the Windows job of `redesign-ci`
  compiles it first.
- PowerShell: both walk scripts were EXECUTED on pwsh 7.4.6 (Linux, in the cloud twin; with a stub bitmap for the PNG read) by the
  by-hand runners `scripts/pins-walktools/b-screens-run.mjs` and `c-parser-run.mjs`; never on Windows PowerShell 5.1, never on the
  phone (the operator block).
- Still owed: the operator block (not run: the main chat gave no step; the map stays as it is; the steps are in the status doc); the CI jsdom pin + the install line naming 31.0.1 (`.github/**`, session
  `leanfollow`; #1883); the app fix of #1877 (`src/bridge/contacts-page.js:295`, session `fixb4` or later).

## 1 · What this session did
| Item | Result | Evidence | MC |
|---|---|---|---|
| 1 flakes | built: `GATE 54 (a4)` and `pins-fixb1/e-header` wait for states; base misses 20 / 20 → 0 / 20 under a loaded loop | mechanisms § 1d; #1875, #1876 | `n-20261122-smoke-timing-flakes` |
| 2 screen probes | built: `sets` per theme, chrome-only probes; the map values owed to the operator block | P93; #1878, #1879; `pins-walktools/b-screens` | `n-20261122-device-map-chat-probe` |
| 3 parser | built: "first swipe -> 1st page" = 10982 ms on the real run (was no data); 17 optional rows per older page | #1880, #1881; `pins-walktools/c-parser` (+ by hand) | `n-20261122-walk-parser-history-rows` |
| 4 seed voice ids | built: 16-byte voice ids; a fresh seed needed on the phone | P93; #1882; CSH `WalkToolsSeedTests` | `n-20261122-devseed-voice-clips-not-playable` |
| 5 jsdom rows | PARTLY: the six rows pass on 29.1.1 and 31.0.1; the full smoke on 31.0.1 is red in 200 OTHER rows (a question) | #1883, #1886 | `n-20261111-jsdom31-smoke-rows` |

## 2 · Walk
None (#1472 does not count tooling and test code; no app behaviour changes). The operator block measures (prompt).

## 3 · The operator block (only on the main chat's step; about 30 minutes)
The steps are in the status doc `claude/session-walktools-status.md` § "Operator block", one line at a time.

## 4 · Open questions and findings for the main chat
| For | What | Blocks |
|---|---|---|
| main chat / fixb4 | #1877: the add-contact chooser's `onDismiss` clears the NEW chooser's handle (an app defect; `GATE 54 (a5)` can still miss under a block of ≥ 400 ms) | nothing |
| Damir (main chat) | #1886: jsdom 31.0.1 turns 200 more rows red. (A, recommended) keep 29.1.1 pinned + a committed lockfile for the test tools · (B) a follow-up batch that makes the capture kits and the token-less probes version-proof · (C) both | item 5's done_when |
| main chat | #1882: reply / edit / quote on a 32-byte SEED row is refused by `parseMessageIdHex` (a walk row on seed messages fails for that reason) | nothing |

## 5 · Recorded, not changed
- The adb allowlist, the walk steps, the parser's old rows, the play check of the chat page, `scripts/pins-s9/b2-kit.mjs` (shared).

## 6 · Lessons
L273–L276 (`docs/lessons.md`).

## 7 · Repo commands for Damir (PowerShell, one line at a time)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/walktools
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
