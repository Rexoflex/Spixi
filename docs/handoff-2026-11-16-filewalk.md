# Handoff 2026-11-16 (File chats and walk steps 3) — the dev file seed and five new adb walk steps are built; `send` and `live` are questions; the operator block did not run

File name: `docs/handoff-2026-11-16-filewalk.md`. Read this FIRST, then DECISIONS #1665–#1673. Number block of this
session: #1665–#1679 (used: #1665–#1673; #1674–#1679 stay empty) · lessons L216–L220 (used: all five) · review packets
P55–P56 (used: P55; P56 stays empty). The main chat gives the next block; it writes the next prompt.

## 0 · State
- Branch: `work/filewalk` @ "File chats and walk steps 3: DECISIONS 1665-1673, handoff, status log, lessons" · base:
  `redesign/frontend` @ "Merge pull request #9 from Rexoflex/work/perfb1toggle" (`efcde241`) · delivery by #1546: the
  session pushed the branch; Damir opens the pull request with the compare link (status doc
  `claude/session-filewalk-status.md`) · merge = Damir (a merge commit, #1505), after the main chat has read `redesign-ci`.
- Lead: Claude Opus (Damir's ruling #1612). Readers by #1606: Fable 5.2 for the security-only readers and the reader
  of `scripts/device/adb-walk.ps1`; Opus for the correctness readers.
- CI (`redesign-ci`): not run at the time of this commit — Damir's pull request starts the first run (budget: 3 runs).
  **The Windows job is the first compile of the new C# glue** (`dotnet build` in Debug, where `SpixiDevCoexist`
  defaults to true, so `SPIXI_DEV_COEXIST` is defined: `Spixi/Spixi.csproj:40`). Android: Damir's Release dev build.
- Smoke: `BASELINE OK — 6505 pass / the 2 KNOWN (#136 · B3)` (= 6463 + 42: `pins-filewalk/a-file-seed` 18 + `b-walk-steps` 24; observed 2026-11-16 after the last code fix, about 45 minutes) · environment: cloud twin + Ixian-Core @ `097341a` · tools: jsdom 29.1.1 · eslint 10.14.0 · globals
  17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 · .NET SDK 10.0.115 · PowerShell 7.4.6 · CSH `pass=611 fail=0` (= 600 + 11 `FileWalkSeedTests`). The
  baseline on the untouched tree: `BASELINE OK — 6463 pass / the 2 KNOWN` and CSH 600 (observed 2026-11-16 in this session).
- Merged tree (2026-11-17, `redesign/frontend` @ `8b3c4ae`, after pull request 11): smoke 6558 expected = 6516 + 42 — observed 2026-11-17: the full run gave 6557 pass + the 2 KNOWN + ONE flake row of Fix batch 1 (`pins-fixb1/f-scrollbar`, item 6 1c: `W.executeUiCommand is not a function` — the shell was not booted yet under the load of the full run), green alone 3 / 3 (#1457 ⑥), so no `BASELINE OK` line was printed; `redesign-ci` runs the full smoke again on the pull request · CSH `pass=618 fail=0` (= 607 + 11) · the pins of both batches 159 / 159 · the code files byte-identical to the last reader's copy.
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` ✓ — no generator ran (no file under
  `src/` or `Spixi/Resources/Raw/html/` changed).
- Review: CLEAN at round 5 (MAJOR 6 → 1 → 1 → 4 → 0; rounds 2–4 found pin holes only — 0 MAJOR in a code path after round 1; round 5: 0 MAJOR, 0 MINOR, 3 NIT) · brief `docs/review-brief-filewalk.md` (every finding of every round in § 4).
- ⚠ C# UNCOMPILED: `Spixi/Utils/SDevSeed.cs` (Core + MAUI). `SDevSeedPlan.cs` compiles and runs in the C# harness.
- New files to `git add`: `scripts/csh/FileWalkSeedTests.cs` · `scripts/pins-filewalk/{a-file-seed,b-walk-steps}.mjs` ·
  `docs/be-review-pack/P55-dev-file-seed.md` · `docs/contract-filewalk.md` · `docs/review-brief-filewalk.md` · this
  handoff · `docs/commit-message-filewalk.txt`.
- Definition of done: no `docs/release-readiness.md` row changed (the batch measures; it closes no row by itself).
- Still owed: the operator block (§ 2) · the first Android compile · Damir's rulings #1669 (`send`), #1670 (`live`)
  and the main chat's choice #1671 ⑤ (how `accountDownloads` is found).

## 1 · What this session did
| Item | Result | Evidence | DoD row |
|---|---|---|---|
| The file seed (P55) | Built, dev builds only: Seed 54 documents (20 file rows of 10 kinds, received + sent, 24.5 MB), Seed 55 voice (16 inline rows 1–30 s + 4 voice files), Seed 56 one chat of 100 messages with 96 photos; fixed times; the image seed's disk rules + the proof after each move; a present chat with rows is never topped up (skipped with its newest row, else "partial: Remove the seed, then Seed") | `SDevSeed.cs`, `SDevSeedPlan.cs` § 3 · csh `FileWalkSeedTests` · pin `pins-filewalk/a-file-seed` · #1665 | — |
| Five walk steps | Built, opt-in: `scroll-files`, `scroll-voice`, `scroll-photos`, `viewer`, `downloads`; keys that must equal the derived dev-seed addresses; gates; a proven restart or a halt; no PNG kept; seven count polls; the four new map keys absent until a calibrate run | `adb-walk.ps1` · pin `pins-filewalk/b-walk-steps` · fake-adb dry runs · #1666 | — |
| The parser rows | Built; windowed by `stamp2`; two scroll lines needed; the old rows byte-identical (the run 2026-11-16 14:10) | `adb-walk-parse.ps1` · #1667 | — |
| The pins of `perfb1toggle` | `b-walk.mjs` re-based: the two whole-file hashes and `logPullSites` 9 → 13 (every frozen body green without a change, #1596) | #1666 | — |
| Not built | `send` (#1669), `live` (#1670); the viewer's "full view" time and video rows (#1671) | DECISIONS | — |
| Findings | A seed chat is not network-silent (#1668 ③); Core decrypts an rsa2 chat without a signature check (#1668 ④, legacy, for the BE engineer) | the gate section | — |

## 2 · Walk / operator block
**The operator block did not run.** Its gate (prompt step 1): the Mission Control item `n-20261113-coldstart-drift`
must hold the main chat's note that the run of 2026-11-17 on the OLD install was taken; this session ended on
2026-11-16, so the note cannot exist yet, and an install now would replace the install that the cold-start test of
2026-11-17 needs. The steps for a later sitting are in the status doc (`claude/session-filewalk-status.md` § "Operator
block"). The batch has no walk sheet of its own: its proof is the operator block (an Android build, the install, the
seed, a calibrate run, two runs of the new steps that agree by #1530).

## 3 · Proposed next steps (the main chat decides)
1. Damir opens the pull request (the compare link); the main chat reads `redesign-ci`; Damir merges (#1505).
2. After the cold-start run of 2026-11-17 and its note: the operator block of the status doc (about 40 minutes).
3. Before its calibrate step: the main chat decides #1671 ⑤ (recommended: the `accountDownloads` point from a render of
   the BUILT settings shell at the phone's CSS viewport — no Account picture).
4. Damir rules #1669 and #1670 (recommended: no `send` / `live` step before the launch; by hand in Damir's walk).
5. The numbers go into `claude/device-numbers-<date>.md`; a slow row is a finding for the main chat (#1534).

## 4 · Open questions and dials
| For | Question (options) | Blocks |
|---|---|---|
| Damir | **#1669 — the `send` step:** (a) one exact `input text` shape (a change of ✅ #1522 ②) + a `[P1]` line at the bubble in a shell batch · (b) (a) without the bubble line (`tap -> send dt=` only) · (c, recommended) no step before the launch · (d) a dev-only draft input | the `send` rows |
| Damir | **#1670 — the `live` step:** (a) a second account as a real peer (a second package or phone: a change of ✅ #1522 ①) · (b) a dev-only receive injection (a new input; its own gate section) · (c, recommended) by hand before the launch · (d) a harness test of the C# half | the `live` rows |
| Main chat | **#1671 ⑤ — how is `accountDownloads` found** without a picture of the Account screen? (a, recommended) a render of the built settings shell at the phone's CSS viewport · (b) Android "Pointer location" by hand · (c) no `downloads` step | the `downloads` rows |
| Main chat | **#1668 ③** — the walk's seed-chat opens make presence lookups of the seed addresses (since 2026-11-12). Accept as a dev-build property, or ask for a dev-only "no presence for seed contacts" change in a later batch? | nothing in this batch |

## 5 · Recorded, not changed
DECISIONS #1672 (the residuals of the #46 loop) — and: the old `tab-account` step has the same tap-outside-the-try
shape that this batch fixed for `downloads` (B1-2); the image seed's comment about `File.Move` (S-S-1) is not true on
Unix; the documents are filler bytes, not real pdf / docx content; disk about 85 MB more on the phone.

## 6 · Lessons (also appended to docs/lessons.md)
- L216: grep the suite for count pins of a shared primitive before adding a call site (S15 O-06 counts `removeFriend`).
- L217: `File.Move` on Unix is stat + `rename(2)`; prove the content again after the move.
- L218: Core's message list shrinks to the ~51-row load window after a chat open; test the plan's newest id.
- L219: the logcat mirror delays WebView lines up to 2.4 s; wait, bounded, for the expected line count before a pull.
- L220: check a prompt's safety premise in the code before building on it (#1668, #1669).

## 7 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
The pull request (#1546): open the compare link of the status doc, check that the page shows "base repository:
Rexoflex/Spixi", "base: redesign/frontend" and "compare: work/filewalk", paste the title and the description, then
"Create pull request". The operator block (after its gate) starts with:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/filewalk
```
Then the status doc's steps. After the merge: `git switch redesign/frontend`, then `git pull`.
