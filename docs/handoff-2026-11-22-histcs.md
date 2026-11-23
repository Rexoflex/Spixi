# Handoff 2026-11-22 (History C#) — older pages read and built off the UI thread, the first older page of 50 rows, the C# history lines; #46 CLEAN; delivered by #1546

Read this FIRST, then DECISIONS #1860–#1868. Number block of this session: #1860–#1874 (used: #1860–#1868; #1869–#1874 stay
empty) · lessons L269–L272 (all used) · packets P90–P92 (all used). Ruling used: Damir's #1742 (History 1) and his "go" of #1830
(main-chat rows, not in `DECISIONS.md` here). Lead Claude Opus (#1612 / #1640). The main chat writes the next prompt.

## 0 · State
- Branch: `work/histcs` · base `redesign/frontend` @ `338d30f4` ("Merge pull request #18 from Rexoflex/work/defaultsb"; merged with the
  newest base before the push if it moved) · delivery by #1546: the session pushed the branch; Damir opens the pull request from the
  compare link in the status doc; merge = Damir (a merge commit, #1505).
- Numbers: smoke and CSH in the status-log entry and `docs/review-brief-histcs.md` § 5.
- ⚠ C# UNCOMPILED: `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (the histcs block of `SpixiFlags.cs` compiles in csh). CI compiles
  Windows; Android in the operator block or Damir's build; iOS / Mac not yet.
- Definition of done: no `docs/release-readiness.md` row changed.

## 1 · What this session did
| Item | Result | Switch | Evidence | MC item |
|---|---|---|---|---|
| P-28 | an older page is read and built on a pool thread; a busy guard (owner-aware), a push gate, the drop rule, early drops, the delivery order behind a kept page's queued pushes | `LoadMoreOffUi` | #1861, P90, csh `HistcsTests`, pins `pins-histcs/a-path`, `b-lines` | `n-20261016-perf-p28` |
| HV-5 | the first older page asks for 50 rows; the D-18 check written (mechanisms § 6) | `FirstOlderPage50` | #1862, P91 | `n-20261118-hv5-history-first-page-50` |
| HV-0 | `[P1] chat loadmore in` · `chat older read …` · `chat older push …` (the walktools contract words) + `chat older drop why=` + `[FLAGS] histcs …` | — | #1863, P92 | `n-20261122-hv0-csharp-history-lines` |
Mechanisms (written before the code): `docs/histcs-mechanisms.md`. Contract: `docs/contract-histcs.md` (§ 6: the merge changes —
the lazy flag read, the job clear, the scope count at the pushes, the builder names).

## 2 · Walk and the operator block
- Sheet `docs/walk-histcs.md` = the Artifact "Spixi History C# — walk rows" (https://claude.ai/artifact/HYrKSGo3ZPxViMoo1niwLP): Windows
  W-BUILD, W-1 … W-5; Android A-BUILD, A-1 … A-5. The BUILD rows read `[FLAGS] histcs loadmoreoffui=1 firstpage50=1`, which only this
  build writes (once, at the first load-more).
- The operator block (the phone; only when the main chat gives Damir the step): its steps are in the status doc. A = `338d30f4`,
  B = `work/histcs`; A → B → A; `history` + `chat-intent` `-Repeats 5`, and `history -HistorySeed 55` in its own run; the chat-screen
  probe from a scratch copy until the `walktools` map commit is on the base. The numbers doc owes: per page the C# lines
  (`read … window=`, `push … build=`) and the shell lines of B; the largest frame and the longest long task against 100 / 50 ms.

## 3 · Open
| For | Point | Blocks |
|---|---|---|
| main chat | 🟡 #1868: the proposed follow-up "History C# 2" (the round-5 records R5-1 … R5-10: a peer's edit / receipt / reaction on a row of a page in flight; options a / b / c) | nothing |
| main chat | 🟡 #1864: the rules of the path live in the histcs block of `SpixiFlags.cs` (the prompt named no new file) — move them to their own file in a later batch? | nothing |
| a later batch | the records of mechanisms § 5 (each with its reason): the inherited delete / edit window, the outside-the-batch writes of a kept build, a deferred load's lost prepend request, a channel switch's `onChatScreenLoaded` before a deferred load's clear, the stall of a widened jump while a page runs | nothing |
| handover sweep | inherited: `Logging.error("Error loading message: {0}", e)` in `loadMessages` can carry a `voiceCallEnd` row's text through `Int32.Parse` (S r1 NOTE-1; gate section) | nothing |

## 4 · Lessons (also in docs/lessons.md)
L269 (a new switch read at the tail of `SpixiFlags.init()` breaks six batches' pins: read lazily) · L270 (count another load as done at its
pushes, not its end) · L271 (free a busy guard at the pushes, with an owner) · L272 (a random race test does not catch a non-atomic
check-then-set: hold `Interlocked` by source) — and the round-3 one is in #1866: the gate must order the DELIVERIES (a main-thread send
runs inline, a pool-thread send posts).

## 5 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/histcs
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- Windows: wipe `Spixi\obj` + `Spixi\bin`, then **F5**, never `dotnet build` (#663). Android: the Release dev build (`docs/walk-histcs.md`).
After the walk: paste the results in the main chat. Merge on GitHub (base `Rexoflex/Spixi` → `redesign/frontend`).
