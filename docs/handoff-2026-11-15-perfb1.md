# Handoff 2026-11-15 (Speed batch 1a) — four speed switches and the dev image seed are built; the device sitting is owed

File name: `docs/handoff-2026-11-15-perfb1.md`. Read this FIRST, then DECISIONS #1560–#1573. Number block of this
session: #1560–#1579 (used: #1560–#1573; #1574–#1579 stay empty) · lessons L184–L191 (used: all eight) · review
packets P38–P43 (used: P38–P42; P43 stays empty). The main chat gives the next block; it writes the next prompt.

## 0 · State
- Branch: `work/perfb1` @ "Speed batch 1a: DECISIONS 1560-1573, handoff, status log, lessons" · base:
  `redesign/frontend` @ "Merge pull request #5 from Rexoflex/work/walksteps2" (`a54808c`; the session started on
  "Merge pull request #4 …" and fast-forwarded before its first commit) · delivery by #1546: the session pushed the
  branch; Damir opens the pull request with the compare link (status doc `claude/session-perfb1-status.md`) · merge =
  Damir (a merge commit, #1505), after the main chat has read `redesign-ci`.
- CI (`redesign-ci`): not run at the time of this commit — Damir's pull request starts the first run (budget: 3 runs).
  **The Windows job is the first compile of this C# on any machine.**
- Smoke: `BASELINE OK — 6341 / the 2 KNOWN (#136 · B3)` · environment: cloud twin + Ixian-Core @ `097341a` · tool
  versions: jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 ·
  .NET SDK 10.0.115 · delta **+43 rows** = the six modules of `scripts/pins-perfb1/` (a 6 · b 6 · c 10 · d 4 ·
  e 12 · f 5) · CSH **583** (= 506 + 77 tests of `scripts/csh/PerfB1*Tests.cs`). The baseline on the untouched
  tree was `6298 / the 2 KNOWN` and CSH 506 (observed 2026-11-13).
- Checks: `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` 277 files ✓ — not run, and why:
  no generator (C# only: no file under `src/` or `Spixi/Resources/Raw/html/` changed), `extract-strings`,
  `generate-icons`, `i18n-lint`, `pseudo`, `verify-locales` (no string, icon or shell changed).
- Review: **CLEAN at r4** · brief `docs/review-brief-perfb1.md` (every finding of every round in § 5) · models:
  lead Claude Fable 5.2 · builders Claude Opus (the five C# items; fix rounds 1 and 2 for the gate, the re-arm, the
  keep, the flags) and Claude Sonnet (the seed fixes, the pin fixes, fix round 3, the packets and the gate rows, the
  walk page) ·
  reviewers: fresh read-only Claude Fable 5.2 at high effort (round 1: four with disjoint scopes, one of them
  security-only; rounds 2 to 4: one "break-my-verdict" reader each) · Claude Haiku: the first draft of the walk
  sheet's script rows, and two mechanical checks of every `file:line` citation in the eight documents.
- ⚠ C# UNCOMPILED: `Spixi/App.xaml.cs`, `Spixi/Pages/Home/HomePage.xaml.cs`, `Spixi/Utils/SpixiContentPage.cs`,
  `Spixi/Pages/Dev/DevPage.xaml.cs`, `Spixi/Pages/Settings/SettingsPage.xaml.cs`, `Spixi/Utils/SDevSeed.cs`,
  `Spixi/Platforms/Android/MainActivity.cs` (Android only). Windows: `redesign-ci` compiles it on the pull request.
  Android: Damir's Release dev build at the sitting is the FIRST compile of every `#if ANDROID` arm (the idle gate,
  all of switch 2). iPhone, Mac: the Apple phase. The seven pure rule files compile and run in the C# harness.
- New files to `git add`: `Spixi/Utils/{PerfB1Rules,WarmIdleRules,SpareRearmRules,SpareKeepRules,EmptyDetailRules,SDevSeedPlan}.cs` ·
  `scripts/pins-perfb1/{a-warm-idle,b-spare-rearm,c-spare-keep,d-empty-detail,e-image-seed,f-flags}.mjs` ·
  `scripts/csh/PerfB1{WarmIdle,SpareRearm,SpareKeep,EmptyDetail,Seed,Flags}Tests.cs` ·
  `docs/be-review-pack/P38…P42` · `docs/perfb1-spare-drop-reason.md` · `docs/contract-perfb1.md` ·
  `docs/review-brief-perfb1.md` · `docs/walk-perfb1.md` · this handoff · `docs/commit-message-perfb1.txt`.
  Uncommitted work from other sessions: none in the cloud clone.
- Definition of done: no `docs/release-readiness.md` row changed. The batch touches **P-1** (chat open under 100 ms)
  and **V-1** (every built lever kept or discarded on measured numbers): their state changes at the device sitting.
- Still owed: the device sitting (§ 2) · the first Android compile · Damir's rulings on #1563, #1565, #1568 and the
  question #1569 · the two checks for the main chat (#1571, #1572) · the Apple legs (#1515).

## 1 · What this session did
| Item | Result | Evidence (file:line / pin / DECISIONS) | DoD row |
|---|---|---|---|
| The four switches | Built: `flagWarmOnIdle`, `flagSpareRearm`, `flagPhoneNoEmptyDetail` (ON) and `flagSpareKeepShortSleep` (OPT-IN: absent = OFF; a stored 1 acts only in dev mode; OFF at once on both ways out of dev mode). One `[FLAGS] warmidle= sparerearm= sparekeep= noemptydetail=` line. Four verb forms `ixian:devflash:<name>:<0\|1>`. **No row on the Developer screen** | `SpixiFlags.cs`, `PerfB1Rules.cs`, `DevPage.xaml.cs` · pin f, csh `PerfB1FlagsTests` · #1560, #1569 | — |
| 1 · P-12 `WarmOnIdle` (P38) | Built: on Android a hidden page boots only after 1200 ms without a touch and at least 900 ms after the other hidden boot; the Account warm only in the foreground. Other platforms and switch OFF: the old timers | `WarmIdleRules.cs`, `MainActivity.cs` (`DispatchTouchEvent`, a time only), `SpixiContentPage.cs`, `HomePage.xaml.cs` · pin a, csh `PerfB1WarmIdleTests` · #1561 | P-1, V-1 |
| 2a · P-11 switch 1 `SpareRearm` (P39) | Built: after a drop the spare chat page is armed again — a quiet resume schedules the warm at resume + 1800 ms; the 2 s tick is the fallback; never under a lock or in the background | `SpareRearmRules.cs`, `SpixiContentPage.cs`, `HomePage.xaml.cs` (`onResume`) · pin b, csh `PerfB1SpareRearmTests` · #1562, #1563 🟡 | P-1, V-1 |
| 2b · P-11 switch 2 `SpareKeepShortSleep` (P40) | The reason for the drop at sleep is written (`docs/perfb1-spare-drop-reason.md`); the proof exists (one `document.readyState` read on the spare's own WebView) → built, Android only, opt-in: kept up to 3 minutes, never with the app lock on, unproven = never handed to a chat open | `SpareKeepRules.cs`, `App.xaml.cs` (`OnSleep`, `OnResume`), `SpixiContentPage.cs` · pin c, csh `PerfB1SpareKeepTests` · #1564, #1565 🟡 | P-1, V-1 |
| 3 · P-13 `PhoneNoEmptyDetail` (P41) | Built: a phone display does not build the empty right pane at start; the first wide layout builds it once | `EmptyDetailRules.cs`, `HomePage.xaml.cs` · pin d, csh `PerfB1EmptyDetailTests` · #1566 | V-1 |
| 4 · the dev image seed (P42) | Built, dev builds only: **seed indexes 50, 51, 52** = "Seed 51 Petra Hočevar" (12 photos), "Seed 52 Gregor Zorman" (10 photos; **the album = its messages 5–10, six received photos**), "Seed 53 Alenka Bregar" (24 photos). Seed 01–50 unchanged (frozen in the harness and in pin e) | `SDevSeed.cs`, `SDevSeedPlan.cs` · pin e, csh `PerfB1SeedTests` · #1567 | — |
| Five re-based pins | Three inline pins of `scripts/smoke-test.mjs`, `pins-s16/b-l8`, `pins-v1am/c-csharp` — they count what the batch adds | #1568 🟡 | — |
| The measuring plan | `docs/walk-perfb1.md`: plan A (three runs on one build; needs #1569) and plan B (two builds; works today) | #1570 | — |
| Recorded, not changed | A second "heavy" seed after a restart can add old messages again — a candidate for the slow phone of 2026-11-13 (#1571) · is a store-shape Android build debuggable? (#1572) | #1571, #1572 | — |

## 2 · Walk
Sheet: `docs/walk-perfb1.md` = the Artifact "Spixi Speed 1a Walk" (15 script rows, 7 Android rows, 4 Windows rows;
6 Apple rows listed as owed). Result: **owed** — the device sitting is the walk of this batch; the main chat runs it
with Damir and the adb walk (#1514, #1532 (3)) and writes the WALK row. This session measured nothing.
- `scroll-image` needs the local key `"imageChatAddress"` = `addressFor(51)` or `addressFor(52)` (sheet set-up (4)).
- Seed: **Remove the seed, then Seed "heavy"** (sheet set-up (3); #1571).
- The before-number of every row is run 0 of the same sitting (L182).

## 3 · Proposed next steps (the main chat decides)
Outcome: Damir knows for each of the four switches whether it helps on the Galaxy A52s, from one sitting.
1. Damir opens the pull request (the compare link); the main chat reads `redesign-ci` (the Windows job = the first
   compile); Damir merges (a merge commit, #1505).
2. Damir rules on #1569 (how a switch is set on the phone). Recommended: the small shell follow-up (one card with
   four rows in the Developer screen + one push). Without it only plan B can run and switch 2 cannot be measured.
3. The cheap test of #1571 (Remove the seed · Seed "heavy" · restart · `-Steps coldstart,chat-tap -Repeats 5`)
   before the sitting: it may give the before-numbers of 2026-11-12 back.
4. The sitting by `docs/walk-perfb1.md`; then the keep-or-remove decision per switch (#1513 (3)) and the pick
   between the two switches of P-11 (#1536).
5. One check before any store build: #1572.

## 4 · Open questions and dials
| For | Question (with its options) | Blocks |
|---|---|---|
| Damir | **#1569 — how is a switch of batch 1a set on the phone?** (A, recommended) a small shell follow-up: four rows in the Developer screen + one push · (B) a dev-build-only way for the adb walk to set the preferences (a new input; its own gate section; a change in `scripts/device/**`) · (C) no toggle: compare two builds only; switch 2 waits · (D, unverified) `adb shell run-as` edits the preference file of the debuggable dev build | plan A of the sitting; every row of switch 2 |
| Damir | **#1563 🟡 — a quiet resume schedules the spare warm at the resume itself + 1800 ms**, not "after the next `clearChatsDone`" (#1536's words): a quiet resume has no chats flush. (a) keep as built (recommended) · (b) the literal rule only — then the switch does nothing in the device case | the meaning of P-11 switch 1 |
| Damir | **#1568 🟡 — five existing pins were re-based** although the prompt said "change no other line" of the smoke: they count the flag lines, the latch clears and the drop sites that #1534 / #1536 order. (a) accept (recommended; the prompt template gets the sentence) · (b) reject and name the other way | the delivery as it is |
| Damir | **#1565 🟡 — the dials of switch 2:** the limit 3 minutes, the proof deadline 1000 ms | nothing (dials) |
| Main chat | **#1571 — the test of the re-seed hypothesis** (step 3 above) | the before-numbers of the sitting |
| Main chat | **#1572 — is a store-shape Android build debuggable?** One `aapt dump badging` on a `-p:SpixiStoreRelease=true` build | a store build |
| Apple phase | On the Mac, `SpareRearm` boots one hidden chat page 1.8 s after every window activation (the sleep drop there is a window deactivation). Keep it, or keep the re-arm off on the Mac? | the Mac leg of P-11 |

## 5 · Recorded, not changed
- #46 r1 A-5: `spareIdleRecheckPending` is static and the re-check calls the instance that asked — not reachable
  today (one host).
- #46 r1 A-8: `dropKeptSpare` re-checks its op under the lock and then calls `dropSpareChat("sleep")`, which drops
  whatever is in the slot (a fresh spare warmed in that window would be dropped and re-armed); `spareKeepOp` can
  hold one disposed page until the next sleep (for the rest of the process after dev mode is left). Both fixes need
  lines inside the pinned body of `dropSpareChat`.
- #46 r1 B-5 (second half): a top-up does not repair an image row that Core already holds without its completed
  fields (a kill between the add and the write).
- #46 r1 C-7, C-11: the `harness` keys of the pin modules hold test NAMES; the source pins are brittle on purpose
  (the cloud cannot compile or run the glue) — said in the pin headers.
- #46 r1 C-9: the re-based `pins-v1am` regex has a second lazy window; pin f `compute` holds the behaviour.
- #46 r2 R2-6: the hidden-boot stamp is written before the refusals of a warm: a refused warm can delay the other
  one by up to 900 ms once.
- #46 r4 R4-2: the header comment and the message of pin e row 11 name three of the four differences of
  `unseed()` from the base; the fourth is the moved statement `UIHelpers.shouldRefreshContacts = true;` (now after
  the image removal). The hash is right. Correct the text at the next re-base of row 11.
- #46 r4 R4-3: pin e row 11 freezes six texts; a name they use can be re-bound outside them (a static constructor,
  a nested `Clock`, a `using` alias, a second loop in the tail of `seedImageChats`). The close: one more key, the
  SHA-256 of the whole masked `SDevSeed.cs`, with the next batch that touches the seed.
- #46 r4 R4-4: pin c has the "class not split over files" check for `spareChatOp` only (one line closes it for
  `spareKeepOp`); a changed use of an already counted mention keeps the count.
- #46 r4, a harness-wide note (older than this batch): for C# a `//` comment also ends at a bare CR, U+0085, U+2028
  or U+2029; the comment mask of the source pins ends it at a line feed only. No `.cs` file under `Spixi/` holds one
  today. Proposal for a harness batch: one key that refuses these characters in `Spixi/**/*.cs`.
- `handleDevSeedVerb` labels a failure of the "heavy" verb "Remove failed" (older; fixer note, not changed).
- The walk has no step "scroll the chat list right after a cold start / after a chat close" (P-12's device pass) —
  a proposal for a later walk batch; until then it is Damir's look row A-3.
- A stray one-shot scheduled task with the text "placeholder" was created by a helper agent by mistake on
  2026-11-15. It fired once into this session on 2026-11-15 and did nothing; a one-shot task disables itself.

## 6 · Lessons (also appended to docs/lessons.md)
- L184: in a file that imports `Android.OS`, the bare name `Environment` does not compile (CS0104) — the harness
  never sees it; qualify `System.Environment` (#1561).
- L185: count pins and a "change no other line" file area contradict; the prompt must allow the re-base of a pin
  that counts what the batch adds (#1568).
- L186: check a ruling's own trigger in the case it is meant for: #1536's "after the next `clearChatsDone`" never
  fires on a quiet resume (#1563).
- L187: a gate that delays work must also serialise it; and `MainThread.BeginInvokeOnMainThread` on the main thread
  runs inline (#1561, #1564).
- L188: a review round of four Fable readers at high effort can hit the account's model limit; resume the SAME
  readers after the reset, never another model (#1573).
- L189: glue that no machine in the cloud compiles is held only by source pins — a statement count misses an ADDED
  line; pin whole bodies, count every mention of a guarded slot, and let an auditor mutate (#1573).
- L190: the dev toggle is not generic: every flag has its own row in `dev.html` and its own push; a C#-only switch
  batch cannot be switched on a device (#1569).
- L191: a proof by name and length is no proof, and `e.Message` of a file operation carries a path — prove by
  content, log the type name (#1567).

## 7 · Repo commands for Damir (PowerShell, one line at a time, no `&&`)
The pull request (#1546): open the compare link of the status doc, check that the page shows "base repository:
Rexoflex/Spixi", "base: redesign/frontend" and "compare: work/perfb1", paste the title and the description, then
"Create pull request". To build the branch for the sitting:
```
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git status -sb
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git fetch origin
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git switch work/perfb1
cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; git pull --ff-only
```
- Windows: wipe `Spixi\obj` + `Spixi\bin`, then **F5 in Visual Studio, never `dotnet build`** (#663).
- Android: wipe `Spixi\obj` + `Spixi\bin`, then the Release dev build of the adb walk
  (`docs/handoff-2026-11-13-tooling.md` § 1, `-p:SpixiDevCoexist=true`). A build error is this batch's bug: paste it
  in the main chat.
- The BUILD row: the log line `[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1`.

After the merge: `git switch redesign/frontend`, then `git pull`.

Fallback, only if the pushed branch is not on GitHub (it was pushed and read back — the status doc says so): the
commit-message file is `docs/commit-message-perfb1.txt`; the main chat gives the lines.
