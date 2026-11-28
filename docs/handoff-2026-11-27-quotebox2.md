# Handoff 2026-11-27 quotebox2 — the reply match on Windows (no fix: not proven) + three Sent-sweep lines (WALK-READY)

Read this FIRST, then DECISIONS #2025–#2030. Number block of this session: #2025–#2034 (used: #2025–#2031 — #2031 is the size fix of ruling #1975; #2032–#2034 stay
empty) · lessons L315–L318 (all used) · packets P111–P112 (both used). Prompt: project doc `claude/session-quotebox2-prompt.md`
(Ready by Damir, 2026-11-26 15:33 "quotebox2 after PR 30"). Contract: `docs/contract-quotebox2.md`. Review:
`docs/review-brief-quotebox2.md`. The main chat gives the next block and writes the next prompt.

## 0 · State
- Branch: `work/quotebox2` · base: `redesign/frontend` @ `ae7b8303` ("Merge pull request #29 from Rexoflex/work/fixb5"; it holds
  pull request 30 = `c211d7de`) · push: made AFTER this commit, each commit read back through the GitHub API (#1546 (3)) · pull
  request: Damir opens it with the compare link
  `https://github.com/Rexoflex/Spixi/compare/redesign/frontend...work/quotebox2?expand=1` (title and description in the status
  doc) · merge = Damir (a merge commit, #1505).
- CI (`redesign-ci`): not run at the time of this commit — it runs on the pull request that Damir opens.
- Smoke: base `BASELINE OK — 7094 / the 2 KNOWN (#136 · B3)` · after the build `BASELINE OK — 7103 / the 2 KNOWN` (= 7094 + 9:
  `pins-quotebox2/<a-sweep 4 | b-matchlog 5>`) · the final run: `BASELINE OK — 7103 / the 2 KNOWN` on the round-1 tree (nothing executable changed after it; rounds 2–5 changed docs only) · environment: cloud twin + `../Ixian-Core` @
  `097341a`, `npm ci` (jsdom 29.1.1), `TZ=America/Los_Angeles`, .NET SDK 10.0.115 (Ubuntu `dotnet-sdk-10.0`) · CSH 919 → **940**
  (+21, `QuoteBox2Tests`).
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` ✓ (291 files) · no html pipeline (C# only).
- Review: **CLEAN at round 5** (the last permitted round; MAJOR 1 · 1 · 0 · 0 · 0, both MAJORs in the mechanism doc; #2029; brief § 5). The code
  files are committed exactly as the readers of r2–r5 read them (SHA-256, first 12: `SingleChatPage.xaml.cs` 5d20e24f551b ·
  `ContactNewPage.xaml.cs` ccae1519ccfa · `SpixiContentPage.cs` 50c510a4a1b3 · `SpixiFlags.cs` 3a2343cef473).
- ⚠ C# UNCOMPILED: `Spixi/Pages/Chat/SingleChatPage.xaml.cs`, `Spixi/Pages/Chat/SingleChatPage.ReplyMatch.cs`,
  `Spixi/Pages/Contacts/ContactNewPage.xaml.cs`, `Spixi/Utils/SpixiContentPage.cs`, `Spixi/Utils/SentSweepOnForget.cs`, `Spixi/Utils/SpixiFlags.cs` (the Windows job of `redesign-ci` compiles them first;
  `SpixiFlags.cs` also compiles in CSH with `SPIXI_DEV_COEXIST`).
- Definition of done: `docs/release-readiness.md` WK-QUOTEBOX2 (new, OPEN: the walk is owed).
- Size (#2031, the size fix of ruling #1975; `scripts/size-check.mjs` of `work/train1` on `ae7b8303..HEAD`): R2 pass · R5 pass ·
  **R6 pass** — `SingleChatPage.xaml.cs` 10,694 and `SpixiContentPage.cs` 7,732 lines = the base (the sweep calls and the dev line
  moved into `Spixi/Utils/SentSweepOnForget.cs` and `Spixi/Pages/Chat/SingleChatPage.ReplyMatch.cs`; each site and `matchReply`
  change one line in place) · **R1: app C# code lines +83 (+56 in a store build), over the prompt's +60** (the two new files'
  usings, namespace and class shells; +58 before the move) — for the main chat · `src/**` +0 · switches +1. R2: no history
  comments. R4: stage 2 deletes `ReplyMatchLog` and the dev group with the `SPIXI_DEV_COEXIST` code. R5: every probe inside
  `#if SPIXI_DEV_COEXIST`. (The first delivery, `34e481c1`, failed R6: the two large files grew by 10 and 1 lines.)

## 1 · What this session did
| Item | Result | Evidence | MC |
|---|---|---|---|
| 1 mechanism | NOT proven off the device and not narrowed: neither the other replies nor the walk's (cut) log exclude a read fault; open: a read fault · a throwing match · (a) row 515 not stored as seeded · (c) C pushed with no read in its index | #2025; `docs/quotebox2-mechanism.md`; CSH `QuoteBox2Tests` E1–E5 | `n-20261125-win-quote-box-own-message` |
| 1 the dev line | `[QB2] reply match …` at every reply match (`#if SPIXI_DEV_COEXIST`, P112) + the walk rows | #2026; `pins-quotebox2/b-matchlog`; CSH | same |
| 2 the fix | NOT built (no proven cause; the prompt) | #2025 | same |
| 3 sweep sites | built: the chat-page Decline (`ixian:undorequest`), the two `pendingDeletion` re-adds; switch `SweepOnForget`; gate 18's fixed entry removed (P111) | #2027; `pins-quotebox2/a-sweep`; CSH | `n-20261126-sent-sweep-three-sites` |
| re-bases | histcs a6 / a7 / b2 · fixb5 e5 · fixb1 FLAGSFILE · lockb b7 · s5 p0 (4) | #2028 | — |
| 4 walk | `docs/walk-quotebox2.md` = the Artifact "Spixi walk — quotebox2" (https://claude.ai/artifact/FbXGs4rXJAX6QyrFYJGypz) | #2026 | — |

## 2 · Walk
Windows (the pushed head of `work/quotebox2`, Debug, **Ctrl+F5**, no wipe): Q2-0 (the evidence copy of the data folder + L) ·
W-BUILD · Q2-W1 … Q2-W7 · Q2-S1 … Q2-S3 only if C misses. Android A-BUILD, A-1. The three sweep lines have no device row (the
effect shows on no screen; the pins and CSH hold them). Result: owed.

## 3 · Proposed next steps (the main chat decides)
1. Damir opens the pull request; the main chat reads `redesign-ci` (the first compile of the four C# files).
2. The walk of `docs/walk-quotebox2.md`; the main chat reads the `[QB2]` lines with `docs/quotebox2-mechanism.md` § 4.
3. Then the fix batch on the way the lines point at (if (a): the stored chat / the Core write boundary is a BE question).

## 4 · Open questions and dials
None for Damir. 🟡 #2027 (the switch) is for the BE engineer at handover (P111).

## 5 · Recorded, not changed
- Gate 18's `LEGACY_G3` entry `ContactNewPage.xaml.cs :: Invalid address format:` is stale too (no such offender at the base;
  outside the file areas).
- `ReplyMatchLog.candidates` copies the probe loop of `ReplyQuote.tryMatch` (CSH property tests hold the two together; a shared
  probe enumerator in `ReplyQuote.cs` would remove the copy; #46 r1 O1 NIT-3).
- In a developer build each reply-shaped row runs the probe loop three times under `lock (messages)` on a load (bounded; never in
  a store build; #46 r1 O1 NIT-4).
- The evidence copy's chat-file count was not added to Q2-0 (it cannot name Seed 57's folder without its address; #46 r5).
- The reply-match reading table of `docs/quotebox2-mechanism.md` § 4 is parked (r2 and r3 each found a misread case): § 4 gives
  the fields and what each way is expected to leave; the main chat reads the lines.

## 6 · Lessons
L315–L318 (`docs/lessons.md`).

## 7 · Repo commands for Damir (PowerShell, one line at a time)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/quotebox2
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- Windows: only C# changed — **no wipe** of `Spixi\obj` / `Spixi\bin`; Debug, **Ctrl+F5** in Visual Studio (#1844 (1)), never
  `dotnet build`.
- Android (optional for A-1): a Debug build of `work/quotebox2` to the phone, or the installed dev build.
- Normal path (#1546): the session pushed `work/quotebox2`; Damir opens the compare link of § 0, checks "base repository:
  Rexoflex/Spixi · base: redesign/frontend" and clicks "Create pull request" with the pasted title and description.
