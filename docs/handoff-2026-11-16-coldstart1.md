# Handoff 2026-11-16 coldstart1 — the developer-only cold-start marks are built; the review STOPPED at round 3 (the pin); NOT pushed

File name: `docs/handoff-2026-11-16-coldstart1.md`. Read this FIRST, then DECISIONS #1680–#1685 and #1626 (project doc
`claude/talk-rulings-2026-11-16-coldstart.md`). Number block of this session: #1680–#1694 (used: #1680–#1685;
#1686–#1694 stay empty) · lessons L221–L224 (all used) · packets P57–P58 (used: P57; P58 stays empty). The main
chat gives the next block; it writes the next prompt.

## 0 · State
- Branch: `work/coldstart1` @ the commits of this batch in the session's cloud clone · base: `redesign/frontend` @
  "Merge pull request #10 from Rexoflex/work/docs-2026-11-16" (`cdc4f717`) · **NOT PUSHED**: the #46 loop stopped at
  round 3 by rule 9 (#1684, #1685), and an un-CLEAN tree never goes to GitHub. The tree is saved on Damir's PC in
  `Claude outputs\_transfer\coldstart1-2026-11-16\` (a git bundle of the branch, `git diff --binary`, SHA-256; the
  status doc `claude/session-coldstart1-status.md` names them) · merge = Damir, after his choice of question 1.
- CI (`redesign-ci`): not run (no push).
- Smoke (final tree, 2026-11-17 01:05): 6468 pass / the 2 KNOWN + 1 row red only in the full run (`S15 E v2`, a timing pin outside this batch, `scripts/pins-s15/e-send-enter.mjs`; green alone 3 / 3 on this tree and 1 / 1 on the base) = 6469 rows = 6463 + 6 · the round-1 tree read `BASELINE OK — 6468 / the 2 KNOWN` (= 6463 + 5) · environment: cloud twin + Ixian-Core @ `097341a` ·
  jsdom 29.1.1, eslint 10.14.0, globals 17.14.0, tree-sitter 0.25.1, tree-sitter-c-sharp 0.23.5, .NET SDK 10.0.115 ·
  delta **+6** = the six rows of `pins-coldstart1/a-lines` (base: `BASELINE OK — 6463`, observed on the untouched tree
  2026-11-16) · CSH **615** (= 600 + 15, `ColdStartTests`).
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` 279 files ✓ (3 known grammar
  skips) · the pins between rounds (`a-lines`, `a-extra`, `pins-s9/a3-wiring`). Pipeline: none (C# + scripts only).
- Review: security-only #46 — **STOPPED at round 3, CLEAN not claimed** (MAJOR 2 → 1 → 2; after round 1 every
  MAJOR was in the source pin; the C# had no finding in rounds 2 and 3) — `docs/review-brief-coldstart1.md` § 5
  (readers by #1606: Fable 5.2 for the security pass and the riskiest file `Spixi/App.xaml.cs`, Opus for the pins in
  round 1).
- ⚠ C# UNCOMPILED: the Android arm — `Spixi/Platforms/Android/MainActivity.cs`, `MainApplication.cs`,
  `WebViewRenderer.cs`, the Android bodies of `Spixi/Utils/P1Perf.cs`. `ColdStartRules.cs` and the non-Android shape
  of `P1Perf.cs` compile and run in csh; the Windows CI job compiles the shared files (`App.xaml.cs`,
  `MauiProgram.cs`, `P1Perf.cs`).
- Definition of done: no row of `docs/release-readiness.md` changed (developer-only lines; the cold-start budgets of
  #1517 / #1626 are not met by this batch and not moved).
- Still owed: the operator block (the Android compile, builds A and B, four runs) — NOT run by this session: its gate
  (the main chat's note in Mission Control item `n-20261113-coldstart-drift` that the run of 2026-11-17 was taken)
  was not there. The steps are in the status doc.

## 1 · What this session did
| Item | Result | Evidence | DoD row |
|---|---|---|---|
| CS-02 the marks | 32 marks `[P1] cold <token> t=<ms>` + the anchor, Android dev builds only | `Spixi/Utils/ColdStartRules.cs`; `Spixi/Utils/P1Perf.cs:17-23`, `:180-272`, `:383`; the call sites (gate section "Session Cold start 1"); #1680 | — |
| the security lens | log lines only; a store build has no call (`[Conditional]`) | packet P57; the gate section; #1681 | — |
| CS-03 method | build B = `-p:AndroidEnableProfiledAot=false`; no csproj change; the A/B protocol | #1682 | — |
| the later walk rows | what CS-01 + the summary rows must add, after `filewalk` | #1683 | — |
| pins + harness | `pins-coldstart1/a-lines` (6 rows), csh `ColdStartTests` (15), three re-bases | #1684 | — |
| scratch parser | `Claude outputs\adbwalk\_scratch\coldstart1\split.py` (+ README, tests) on Damir's PC, git-ignored | its README; 82 assertions of its own test | — |

### The marks, in start order (token · where)
`app_in` / `base_in` / `base_out` / `app_out` — `MainApplication.OnCreate` · `maui_in` / `maui_build` —
`MauiProgram.CreateMauiApp` · `ctor_in`, `config_in`, (flush) `logger`, `flags_in`, `lang_in`, `files_in`,
`theme_in`, `node_in`, `wallet_in`, `wallet_out`, `home_in`, `home_out`, `ctor_out` — `App()` · `act_in`,
`act_base`, `act_hold`, `act_out` — `MainActivity.OnCreate` · `resume_in` / `resume_out` — `MainActivity.OnResume` ·
`wv_in` / `wv_new` / `wv_out` — the first `CreateNativeControl` · `nav_in` / `nav_out` — the first `LoadHtml` ·
`page` — the first `OnPageStarted` (a new dev-only override) · `page_end` — the first `OnPageFinished` · `draw` —
the first draw of the window. Contract table: `docs/contract-coldstart1.md` § 3a.

## 2 · Walk
No walk sheet: the lines are developer-only (no user-visible change). The numbers come from the operator block
(status doc) and go into `claude/device-numbers-<date>-coldstart1.md`.

## 3 · Proposed next steps (the main chat decides)
Outcome: Damir picks the next cold-start lever with the split in his hands.
1. The operator block of this batch (after the 2026-11-17 reading): builds A and B, four runs, the table.
2. The walk-rows batch (#1683) after `filewalk` is merged.
3. Then the lever the split names (P-42 if C + D dominate; CS-06 / CS-07 if B does; a custom AOT profile if B − A ≥ 150 ms).

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| Damir | **Q1 — the source pin's limits (#1684):** (a) accept the pin with the round-3 holes recorded (they need deliberately hidden code; BE reads the diff at handover) → a follow-up session runs ONE fresh Fable reader over the unchanged tree and the docs, then pushes by #1546 · (b) one more design round for the pin in a follow-up session (a code-only census of the six names per file + a raw directive rule + a raw-string count; rounds 4–5) · (c) the marks wait for a compile-based proof in a later batch | the push, the pull request, the operator block |
| Damir | the default build settings — his ruling AFTER the numbers (#1626) | — |

## 5 · Recorded, not changed
- `t=` after the flush is awake time: valid for a COLD launch only (the parser reads COLD reps only).
- One-shot is per mark: `wv_*`, `nav_*`, `page*` are the first of the process (they can belong to different WebViews).
- The first call of the new code is JIT-compiled in build A, AOT in build B: a small bias inside the A/B.
- Before API 26 the draw listener might not carry over at attach (no `draw` line, never a wrong value); the phone is API 34.
- A literal split into fragments escapes the literal scan (a limit of the method; the members that build lines are frozen).
- `home_in → home_out` is one part: its inside (contacts, `InitializeComponent`, `generatePage`) is in `Spixi/Pages/**`.

## 6 · Lessons (also appended to docs/lessons.md)
- L221 · L222 · L223 · L224 (dev-only arguments run in a store build → `[Conditional]`; lines before the logger are
  dropped → store and flush, anchor last; a stripped region and a frozen member must freeze everything; a space-blanked
  literal scan and the C# line ends).

## 7 · Repo commands for Damir (PowerShell, one line at a time)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/coldstart1
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
The Android builds of the A/B are in the status doc (the operator block). Merge the pull request with a merge
commit (#1505); check that its base is `Rexoflex/Spixi` → `redesign/frontend`. Then `git switch redesign/frontend`
and `git pull`.
