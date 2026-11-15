# Review brief — Speed batch 1a, `perfb1` (#1560–#1579)

Work order for the #46 adversarial loop (`docs/process.md`). Written BEFORE round 1. The verdict is written back into
§ 5 when the loop closes (#660). Reviewers: fresh, read-only Claude Fable 5.2 at high effort (#1471, #1533); they get
this brief and the tree, never the lead's chat. No fallback model.

## 1 · What the batch is

C# only. Four speed changes, each behind its OWN runtime switch with the old path as the fallback (#1312, #1478), and
dev-only seed data with images. No shell change, no new verb, no new push. Scope rulings: #1534, #1536 (on the base).

| Item | What landed | Where (files) | DECISIONS |
|---|---|---|---|
| F · the four switches | Four int preferences, four properties in `SpixiFlags`, one `[FLAGS]` line, four dev verb forms `ixian:devflash:<warmidle\|sparerearm\|sparekeep\|noemptydetail>:<0\|1>` (stored only with dev mode on; act at the next start). Three are ON by default (a stored 0 acts only in dev mode); `SpareKeepShortSleep` is OPT-IN (absent = OFF; a stored 1 acts only in dev mode; leaving dev mode removes the four keys and turns the opt-in off in process — r1 B-1) | `Spixi/Utils/SpixiFlags.cs`, `Spixi/Utils/PerfB1Rules.cs`, `Spixi/Pages/Dev/DevPage.xaml.cs` | #1560 |
| 1 · P-12 `WarmOnIdle` (P38) | On Android a hidden WebView (the Account warm, the chat spare) starts its boot only after 1200 ms without a touch AND at least 900 ms after the other hidden boot (`WarmIdleRules.StaggerMs`; one main-thread stamp `SpixiContentPage.lastHiddenBootMs` — r1 A-1); the Account warm boots only in the foreground (r1 A-6). The touch stamp is one `long` (a time), `internal static … { get; private set; }`, written by a `DispatchTouchEvent` override. The old fixed delays are a lower bound. Switch off, Windows, iPhone, Mac: the old timers | `Spixi/Utils/WarmIdleRules.cs`, `Spixi/Platforms/Android/MainActivity.cs`, `Spixi/Utils/SpixiContentPage.cs` (`inputIdleWaitMs`, `inputIdleGates`, `markHiddenBoot`, `spareWaitsForInputIdle`, the first statement of `warmSpareChat`), `Spixi/Pages/Home/HomePage.xaml.cs` (the Account warm loop, `onSpareIdleRecheck`) | #1561 |
| 2a · P-11 switch 1 `SpareRearm` (P39) | After a drop of the spare chat page (sleep, theme, language, reload, devmode) it is armed again: a quiet resume schedules the warm at resume + 1800 ms through the same funnel (`HomePage.onResume`); the 2 s UI tick is the fallback (one chats flush is asked for; a resume that locks → after the unlock). Never while a lock is up or staging, never in the background; a refused take lets the tick ask again (r1 A-3, A-4, S-6). `stop` and `lowmem` cancel a pending re-arm | `Spixi/Utils/SpareRearmRules.cs`, `Spixi/Utils/SpixiContentPage.cs` (`spareRearmPending`, `takeSpareRearm`, `askSpareRearmFlush`, the hook in `dropSpareChat`), `Spixi/Pages/Home/HomePage.xaml.cs` (`rearmChatSpareAfterDrop`, `onResume`, `appLockUp`, the calls in `loadChats` and `updateScreen`) | #1562, #1563 |
| 2b · P-11 switch 2 `SpareKeepShortSleep` (P40) | Android only, opt-in. At sleep a READY spare is kept (never with the app lock on) instead of dropped. A kept spare is UNPROVEN: a chat open never takes it. At the return: the 3-minute limit first, then the proof, really posted after `OnResume`'s turn (r1 A-2) — one `document.readyState` evaluation on the spare's own WebView, answer `complete` inside 1000 ms → usable; anything else → dropped. The written reason for today's drop: `docs/perfb1-spare-drop-reason.md` | `Spixi/Utils/SpareKeepRules.cs`, `Spixi/App.xaml.cs` (the sleep site, one call in `OnResume`), `Spixi/Utils/SpixiContentPage.cs` (the `#if ANDROID` block "perfb1 P-11 switch 2", the first statement of `pushSpareChat`) | #1564, #1565 |
| 3 · P-13 `PhoneNoEmptyDetail` (P41) | On a phone display the empty-detail page is not built at start; it is built once at the first wide layout. Tablets, Windows, Mac: built at start as before | `Spixi/Utils/EmptyDetailRules.cs`, `Spixi/Pages/Home/HomePage.xaml.cs` (the `defaultDetailContent` hunks) | #1566 |
| 4 · the dev image seed (P42) | Three image chats (seed indexes 50, 51, 52 = "Seed 51–53"; 46 photos made in code as PNG; one received album of 6 in Seed 52; fixed message times, 2026-01-01; a file is kept or deleted only with a proof by content, SHA-256 — r1 B-2, B-3). Wholly inside `#if SPIXI_DEV_COEXIST`. The existing dev verbs carry it | `Spixi/Utils/SDevSeed.cs`, `Spixi/Utils/SDevSeedPlan.cs` | #1567 |
| Pins | Six pin modules (43 rows after round 2: a 6 · b 6 · c 10 · d 4 · e 12 · f 5; 41 after round 1; 28 before it) and six harness classes (77 tests; 74 after round 1; 55 before it). FIVE existing pins are re-based because they count what the batch adds (§ 4) | `scripts/pins-perfb1/*.mjs`, `scripts/csh/PerfB1*Tests.cs`, `scripts/csh/csh.csproj`; re-based: `scripts/smoke-test.mjs` (three inline pins + ONE registration block), `scripts/pins-s16/b-l8.mjs`, `scripts/pins-v1am/c-csharp.mjs` | #1568 |
| Docs | Packets P38–P42, the gate section "Session Speed batch 1a", the walk sheet, the contract, this brief | `docs/be-review-pack/`, `docs/security-handover-gate.md`, `docs/walk-perfb1.md`, `docs/contract-perfb1.md` | — |

Not built, and why: the Developer screen has NO rows for the four switches (the rows live in `src/shells/dev.html`; a
shell change and a new push are out of this batch) — the C# verb forms exist, the question of how Damir sets a switch
on the phone goes to Damir (#1569). No new log word for the idle gate or the keep (the device sitting judges by the
existing `[CDPERF]` lines and by timing).

## 2 · How to run

- Tree: the cloud twin `/home/claude/spixi`, branch `work/perfb1`, the working-tree diff against
  `origin/redesign/frontend` @ "Merge pull request 5 from Rexoflex/work/walksteps2" (`a54808c`; round 1 started on
  "Merge pull request 4 …", `7c195242` — the base moved by scripts and docs of another session only, and the branch
  was fast-forwarded before any commit):
  `git -C /home/claude/spixi diff HEAD` plus the untracked files (`git status --short`).
- Pipeline: none (C# only; no generator input changed; `build-shells --check` and `build-locales --check` pass).
- Smoke before: `BASELINE OK 6298 / the 2 KNOWN (#136 · B3)` (this twin, jsdom 29.1.1, 2026-11-13) · CSH 506 ·
  Ixian-Core @ `097341a` present as the sibling. After the build: 6298 + 28 = 6326 (observed, 2026-11-13); CSH 561. After the round-1 fixes: expected 6298 + 41 = 6339; CSH 580. After the round-2 fixes: expected 6298 + 43 = 6341; CSH 583.
- A reviewer may run: `node scripts/cs-syntax-check.mjs`, `node scripts/run-pins.mjs pins-perfb1/<mod>` and
  `node scripts/run-csh.mjs` — auditor C in its own copy (`/home/claude/agents/rc/spixi`), where it may mutate code to
  test a pin. Nobody runs the full smoke. Nobody edits `/home/claude/spixi`.
- Known failures: the 2 KNOWN (#136 · B3).
- ⚠ The cloud cannot compile the app. Every changed file under `Spixi/` except the six pure rule files is
  "C# UNCOMPILED" until Damir's Android Release build (Windows: CI compiles it on the pull request). A compile error is
  a finding: read every new call against the tree (does the member exist; the nullability; `#if` arms for iOS / Mac /
  Windows; a name that two imported namespaces share — one was found already: `Environment` in `MainActivity.cs`).

## 3 · Auditor scopes (disjoint)

| Auditor | Scope (files) | Focus |
|---|---|---|
| A | `Spixi/Utils/SpixiContentPage.cs` (all perfb1 hunks), `Spixi/App.xaml.cs`, `Spixi/Platforms/Android/MainActivity.cs`, `Spixi/Pages/Home/HomePage.xaml.cs` (the warm / spare / resume hunks only), `WarmIdleRules.cs`, `SpareRearmRules.cs`, `SpareKeepRules.cs` | Correctness and threading of P-12 and P-11: does every warm go through the gate and still through every old refusal; can a wait loop forever or run after `stop()`; the pending re-arm (double take, lost take, a take while locked); switch 2's state machine (is there ANY path that hands an unproven spare to a chat open; every way out of "kept"; the limit; the two clocks; races between the proof answer, the deadline, a tap and a drop); switch OFF = the old path byte for byte, per platform; will it compile |
| B | `Spixi/Pages/Home/HomePage.xaml.cs` (the `defaultDetailContent` hunks only), `EmptyDetailRules.cs`, `SpixiFlags.cs`, `PerfB1Rules.cs`, `Spixi/Pages/Dev/DevPage.xaml.cs`, `SDevSeed.cs`, `SDevSeedPlan.cs` | P-13: a null page on every reader (theme, language, reload, `removeDetailContent`, the callers in other pages), the lazy build exactly once, tablets / desktop unchanged, the field initializer's order. Flags: the opt-in can never be ON without dev mode; the verb stores nothing without dev mode. Seed: Seed 01–50 ids / counts / times unchanged, the first rows of the chat list unchanged, the top-up rule, unseed removes messages AND files and nothing else, everything inside the `#if`; will it compile |
| C | `scripts/pins-perfb1/*.mjs`, `scripts/csh/PerfB1*Tests.cs`, `scripts/csh/csh.csproj`, the five re-based pins (§ 4) | Does each new pin FAIL when the behaviour breaks — make your own breaks (derived from the code, not the builders' list) in `/home/claude/agents/rc/spixi`; a pin that holds a comment or a spelling instead of behaviour; a harness test that tests a copy of the rule instead of the rule; were the five re-bases the smallest honest change (does each re-based pin still fail for its ORIGINAL reason) |
| S (security only, high effort — #1312 rule 2) | The whole diff + `docs/be-review-pack/P38…P42`, the new section of `docs/security-handover-gate.md`, `docs/perfb1-spare-drop-reason.md` | The PARAMOUNT isolation invariant (the spare stays its own WebView and holds no chat content while it waits or is kept; the proof reads nothing from a chat); ★ C# touches no risky parts; introduced exposure: every new preference, verb form, log line, static, timer, file write, JS evaluation — is each one in the gate section, is each verdict true; log lines = fixed words and integers only; the seed: file names built by C#, no network, what unseed can delete, the dev-only fence and the store-release gate O-35; can a normal user (no dev mode) reach any of it; do the packets say anything the code does not do |

## 4 · Non-negotiables and accepted dials

- Must hold: the PARAMOUNT isolation invariant (#220 / #221) · WebView composes, C# signs · no WebView path into a
  file op · no URL / address / name / text in logs · the frozen bridge: no new verb, no new push, no shell change ·
  every change behind its OWN switch, old path = fallback (#1312, #1478) · L157: nothing frees itself on a timer —
  fail closed · Ixian-Core untouched.
- Accepted (do not re-open; attack the BUILD, not the ruling):
  - Batch 1a = P-12 → P-11 (two switches), P-13, the dev image seed — #1534, #1536 (Damir).
  - Defaults: `WarmOnIdle`, `SpareRearm`, `PhoneNoEmptyDetail` ON; switch 2 OFF (opt-in). The device numbers come
    AFTER delivery and pick (#1536); the keep rule (#1513 (3), #1310 (4)) removes what does not help.
  - P-12 gates trigger A too (the warm after a chat close): a re-open inside about 1.2 s of the close tap is cold. This
    changes the "warm at once" of #1147 (4) on Android while the switch is on — recorded (#1561), judged at the sitting.
  - P-11 switch 1 does not wait for a chats flush at a quiet resume, because a quiet resume has none (mechanism:
    `HomePage.updateScreen` is the only flush path) — the warm is scheduled at the resume itself + 1800 ms. This is
    the lead's reading of #1536's "after the next `clearChatsDone` + 1800 ms" (#1563, 🟡 for Damir).
  - Switch 2 is Android only; its limit is 3 minutes and its proof deadline 1000 ms (dials, #1565).
  - Five existing pins are re-based (they COUNT flag lines, latch clears and drop sites, and each names the new site):
    `scripts/smoke-test.mjs` "trigger B is one-shot … cleared at exactly three", "EXACTLY twelve dropSpareChat call
    sites", "App.OnSleep drops the spare on MOBILE …"; `scripts/pins-s16/b-l8.mjs` `oneLine` (10 lines);
    `scripts/pins-v1am/c-csharp.mjs` `lines`. The session prompt said "change no other line" of the smoke; the lead
    judged a re-base the honest path against spelling the code around a count pin (#1568, 🟡 for Damir). Attack
    whether each re-base is minimal and still fails for its original reason.
- Out of scope for findings (legacy or another session): the older dev-only log line `[DEVSEED] remove <i> failed:`
  with an exception message (it is in the gate section as an older line whose reach grew — say if you judge that it
  must be fixed now); `Spixi/Spixi.csproj`, `scripts/device/**`, the build scripts.

## 5 · Verdict

**CLEAN at r4** (2026-11-15). Four rounds: MAJOR 4 → 0 → 0 → 0 · MINOR 13 → 3 → 1 → 0 · NIT 16 → 5 → 2 → 4. Every
MAJOR and every MINOR is FIXED, or RECORDED with its reason, in the tables below; the four NITs of round 4 are
RECORDED (no code and no pin changed after the round-4 reader: the code, the pins and the harness tests are committed
exactly as that reader read them; the only edits after it are line numbers and sentences in documents, R4-1 / R4-2).
Reviewers: fresh read-only Claude Fable 5.2 instances at high effort — round 1 four with disjoint scopes (A the
warm gate and the two spare switches · B the empty pane, the flags and the seed · C the pins and the harness ·
S security only), rounds 2, 3 and 4 one "break-my-verdict" reader each; the builders' contexts never reviewed; no
other model reviewed (#1471). The security-only pass: 0 MAJOR in round 1 (S-1 … S-10: every MINOR fixed), and the
round-4 reader's security read of the whole `Spixi/` diff found nothing that the gate section does not list.
After the last fix (fix round 3) and the document edits of round 4, on the tree as committed: the full smoke
`BASELINE OK — 6341 pass / the 2 KNOWN (#136 · B3)` (= 6298 + 43: the six modules of `scripts/pins-perfb1/`, a 6 ·
b 6 · c 10 · d 4 · e 12 · f 5) · `CSH pass=583 fail=0` (= 506 + 77) · `build-shells --check` and
`build-locales --check` green · `cs-syntax-check` 277 files. **Not proven by this loop:** that the C# compiles (the
cloud compiles only the seven pure rule files; the Windows job of `redesign-ci` and Damir's Android build are the
first compiles) and every device behaviour (the idle gate, the proof of the kept spare, the image seed's look).

### Round 1 (2026-11-13 → 2026-11-15) — four fresh read-only Fable 5.2 reviewers, disjoint scopes: 4 MAJOR · 13 MINOR · 16 NIT

The round started on 2026-11-13 19:45 and was cut by the account's model limit; the same four reviewers were resumed
on 2026-11-15 and finished (no other model reviewed, #1471). S counted its 14 stale `file:line` citations as 14
MINOR; they are one row here (S-3).

| ID | Sev | Finding (short) | Verified | Result |
|---|---|---|---|---|
| A-1 | MAJOR | The idle gate put the Account warm and the spare warm on the SAME instant after one touch (both = last touch + 1200 ms): two hidden boots on the one renderer | yes | FIXED — `WarmIdleRules.StaggerMs = 900`, one main-thread stamp; csh model "one touch at F+700 → ≥ 900 ms apart"; pin a row STAGGER |
| C-1 | MAJOR | No pin held `spareKeepOp = kept;` at sleep: without it the drop is skipped and an unproven spare with no limit is handed out | yes (the auditor's mutation stayed green) | FIXED — pin c row SLEEP TAIL (the anchored tail of `keepSpareAtSleep`) |
| C-2 | MAJOR | The inputs of the proof were not pinned (the answer, the lock test at start and at the answer, the lock helper) | yes | FIXED — pin c row PROOF INPUTS (whole bodies) |
| C-3 | MAJOR | A Seed 01–50 id, count or address could change in `SDevSeed.cs` by an ADDED line with every pin green (row 4 only counted statements; the harness runs the plan's copy) | yes | FIXED — pin e row 9 compares whole bodies of both files and pins the seed loop as one text; two more frozen ids |
| A-2 | MINOR | The proof was not posted: `BeginInvokeOnMainThread` on the main thread runs inline, so it ran before the lock decisions; three comments and two docs said "posted" | yes | FIXED — a real post through the pool; pin c row POST |
| A-3 | MINOR | A take of the re-arm in the background was spent on a `background` refusal: no spare after the next resume | yes | FIXED — take and ask need the foreground (`SpareRearmRules`); csh model |
| B-1 / S-5 | MINOR | The opt-in outlived dev mode: on in process after `ixian:disableDevMode`; the stored 1 survived | yes | FIXED — the four keys removed there + `SpixiFlags.leaveDevMode()`; pin f row DEV MODE OFF (the account wipe, the second way out of dev mode: round 2, R2-1) |
| B-2 / S-2 | MINOR | The seed and the unseed deleted the temp leaf with no proof (a peer-named file in Downloads could match) and kept / deleted a photo on name + length only | yes | FIXED — temp in the app's Sent folder under the pending-photo name; keep / delete only with SHA-256 of the deterministic PNG; pin e row 7 |
| B-3 | MINOR | "Image chats are older than every Seed 01–50 message" held only inside one run | yes | FIXED — fixed times (`ImageAnchor`, 2026-01-01 12:00 UTC); csh over seeds of four different days |
| B-4 | MINOR (legacy) | After an app restart a second "heavy" seed can add the old messages of Seed 01–10 again (Core checks ids against its in-memory window of 100) | yes, by reading Core | RECORDED (#1571) — Seed 01–50 code must stay as at the base; the header comment and the walk sheet say "Remove, then Seed" |
| S-1 | MINOR | `[DEVSEED] remove <i> failed: <e.Message>` can log a full path (an OS user name and an address); two sibling lines the same | yes (S read Core's removal path) | FIXED — type name only in all three; pin e row 5 |
| S-3 | MINOR ×14 | Stale `file:line` citations in P38, P39, the gate section and the reason doc | yes | FIXED — the docs builder re-read every citation after the fixes |
| S-4 | MINOR | P39: "the drop at sleep is unchanged … no spare lives in the background" — false with P40 on | yes | FIXED (text) |
| C-4 | MINOR | The image-seed glue could skip its own rules (delete guard inverted, guards removed, the disk write removed …) with every pin green | yes | FIXED — pin e row 10 (whole bodies + named guards) |
| C-5 | MINOR | Four more unpinned lines of the switch-2 glue | yes | FIXED — covered by the rows of C-1 / C-2 and row RESUME WRITE |
| C-6 | MINOR | Nothing held that `pushSpareChat` is the only taker of the spare slot | yes | FIXED — pin c row ONE TAKER (every write and copy site named) |
| C-7 | MINOR | The `harness` keys hold test NAMES, not assertions | yes | ACCEPTED — said in the pin headers; the CSH count is the gate for the pure rules |
| A-4 | NIT | The flush ask was set at the ask, not at the take: a refused take never asked again | yes | FIXED |
| A-5 | NIT | `spareIdleRecheckPending` is static, the re-check calls the instance that asked | yes | RECORDED — not reachable today (one host) |
| A-6 | NIT | The Account warm could boot after the user left the app | yes | FIXED — `WarmIdleRules.bootsAfterWait` |
| A-7 | NIT | A comment cited moved lines | yes | FIXED with S-3 |
| A-8 | NIT | (a) `spareKeepOp` can keep one disposed page until the next sleep; (b) `dropKeptSpare` drops whatever is in the slot | yes | RECORDED — both fixes need lines inside the pinned body of `dropSpareChat`; (b) drops a fresh spare with the word `sleep`, which re-arms it |
| B-5 | NIT | `completed` was set after `filePath` (Core's writer could see a sent row as an open transfer); no repair of a row stored without its fields | yes | first half FIXED; the repair is RECORDED |
| B-6 | NIT | A stale header sentence in `SDevSeed.cs` | yes | FIXED |
| S-6 | NIT | The take did not test a staging lock | yes | FIXED |
| S-7 | NIT | Gate row: the time of the existing `chat warm` lines is now "last touch + 1200 ms" | yes | FIXED (gate text) |
| S-8 | NIT | Two older catch-all log lines now wrap new code | yes | FIXED (a gate row) |
| S-9 | NIT | Dev builds are debuggable: `adb run-as` can write the preferences and the two folders | yes | FIXED (gate text) — and the question "is a store-shape build debuggable?" goes to the main chat (not in this batch) |
| S-10 | NIT | `MainActivity.lastTouchMs` was writable by any C# | yes | FIXED — `internal … { get; private set; }` |
| C-8 | NIT | The registration line carried the HK1 comment | yes | FIXED |
| C-9 | NIT | The re-based `pins-v1am` regex has a second lazy window | yes | RECORDED — the behaviour is held by pin f `compute`; the Safety re-base has the same shape |
| C-10 | NIT | No pin refused a `return` in front of the sleep-drop block | yes | FIXED — pin c `noReturnBeforeTheSleepDrop` |
| C-11 | NIT | The source pins are brittle (a harmless rewrite goes red) | yes | ACCEPTED — said in the pin headers |

Fix round 1: builders Opus (the gate, the re-arm, the keep, the flags; then the switch-2 pins) and Sonnet (the seed;
then the seed pins; the documents). Every fix started from a test or pin row that was red on the reviewed tree.
After it: `cs-syntax-check` 277 files · the six pin modules 41 / 0 · `pins-s16/b-l8`, `pins-v1am/c-csharp`,
`pins-s4/cs`, `pins-s15/b-native`, `pins-s5/p0`, `pins-s5/home` 49 / 0 · CSH 580 / 0. No existing inline pin needed
another re-base.

### Round 2 (2026-11-15) — ONE fresh Fable 5.2 "break-my-verdict" reader over the fix round and the round-1 verdicts: 0 MAJOR · 3 MINOR · 5 NIT

28 new mutations of its own: 20 red for the right reason, 8 green (two causes: R2-2, R2-3). The reader confirmed
the round-1 verdicts A-5, A-8, B-4, B-5 (second half), C-7, C-9, C-11 (RECORDED / ACCEPTED stand).

| ID | Sev | Finding (short) | Verified | Result |
|---|---|---|---|---|
| R2-1 | MINOR | B-1 was fixed on ONE of the two ways out of dev mode: the account wipe clears the preferences and the same process goes on with the opt-in still ON | yes | FIXED — `SpixiFlags.leaveDevMode()` in `wipeEverything`, right after the preference wipe; pin f names both callers and refuses a third |
| R2-2 | MINOR | The C-3 fix held only the id / address / count span of the Seed 01–50 loop: the loop start, the unread tail, `saveMetaData`, the `Names` and `Lines` arrays could change with every pin green | yes (5 mutations green) | FIXED — pin e row 11 freezes the normalised text of `Names`, `Lines` and the body of `seed()` as SHA-256 (= the base `a54808c` plus two named lines: the S-1 log line and the image-chat status line). Round 3 (R3-1) found that the freeze stopped at the status line; it now holds the whole bodies of `seed()`, `unseed()` and `status()` |
| R2-3 | MINOR | The C-6 fix ("a new taker of the spare slot goes red") matched one shape only: three new readers stayed green | yes (3 mutations green) | FIXED — pin c `mentions`: the count of every `spareChatOp` mention per enclosing method, both `#if` arms |
| R2-4 | NIT | After the foreground refusal of the Account warm a quiet resume asked nothing: the Account page stayed cold until a natural flush | yes | FIXED — `accountWarmRetryOnResume`; `HomePage.onResume` asks the same warm once; csh model; pin a row RESUME RETRY |
| R2-5 | NIT | A re-arm could still be lost in about 1 ms at sleep: the drop stood before `isInForeground = false` | yes | FIXED — the sleep-drop block moved below the foreground flag; pin c `dropAfterTheForegroundFlag` |
| R2-6 | NIT | The hidden-boot stamp is written before the refusals: a refused warm can delay the other waiter by up to 900 ms once | yes | RECORDED — bounded (one stamp per trigger); said in P38 and at both stamp sites |
| R2-7 | NIT | Nine wrong items in the documents (seven citations or lists, two sentences) | yes | FIXED — the docs builder re-read every citation after the round-2 fixes; a mechanical citation check ran after it |
| R2-8 | NIT | Mac: with `SpareRearm` on, every window activation boots a hidden chat WebView 1.8 s later (the sleep drop there is a window deactivation) | by reading | RECORDED — P39 and one owed Mac row in the walk sheet § 6; a question for the Apple phase |

Fix round 2: Opus (R2-1, R2-3, R2-4, R2-5) and Sonnet (R2-2; the documents). After it: `cs-syntax-check` 277 files ·
the six pin modules 43 / 0 · ten older pin modules that read the changed files 109 / 0 · CSH 583 / 0. No existing
inline pin needed another re-base (the wipe and `OnSleep` pins were evaluated against the changed files).

### Round 3 (2026-11-15) — ONE fresh Fable 5.2 "break-my-verdict" reader over fix round 2: 0 MAJOR · 1 MINOR · 2 NIT

The reader found no defect, no exposure and no compile problem in the round-2 fix code (R2-1, R2-4, R2-5), and
confirmed R2-6 and R2-8 as RECORDED. 28 mutations of its own: 18 red for the right reason; 6 green are R3-1 / R3-2;
4 green are noted and are no findings (a dead overload; white space inside a string literal; a mutation that breaks
the older wipe itself).

| ID | Sev | Finding (short) | Verified | Result |
|---|---|---|---|---|
| R3-1 | MINOR | Pin e row 11 froze `seed(profile)` only up to the image-status line; a statement added after it, and the Seed 01–50 halves of `unseed()` and `status()`, were free (4 mutations green) | yes | FIXED (pin only) — row 11 hashes the whole bodies of `seed()`, `seed(profile)`, `unseed()` and `status()`; each is the base `a54808c` plus named lines (the type-only log lines, the image-chat status lines, the unseed loop bound, the image count) |
| R3-2 | NIT | Pin c `mentions` counted `spareChatOp` only; the kept spare is also reachable through the second static `spareKeepOp` (a new reader of it stayed green) | yes | FIXED (pin only) — key `keepMentions`; the message now says what a text pin cannot see (an alias through a local or a parameter) |
| R3-3 | NIT | Two texts described the account wipe with the `devmode` drop (the reason doc; the docblock of `SpixiFlags.leaveDevMode`): on the wipe the spare goes at the first step with the word `stop` | yes | FIXED (a sentence and a comment) |

Fix round 3: Sonnet; pins and texts only — no code statement changed. After it: the six pin modules 43 / 0 ·
`pins-s16/b-l8` + `pins-v1am/c-csharp` 15 / 0 · `cs-syntax-check` 277 files · CSH 583 / 0 (unchanged).

### Round 4 (2026-11-15) — ONE fresh Fable 5.2 "break-my-verdict" reader over fix round 3: 0 MAJOR · 0 MINOR · 4 NIT

The reader found no defect in the app code, no exposure and no broken pin; fix round 3 is in the tree and does what
its rows say; r3 → r4 differs in exactly the five named files and the `SpixiFlags.cs` diff is comment lines only. It
rebuilt each frozen text of pin e row 11 from the base `a54808c` plus the named changes and hashed it with the pin's
own mask (true for `Names`, `Lines`, `seed()`, `seed(profile)`, `status()`; `unseed()`: R4-2). Its own grep gave the
same two maps as pin c `mentions` / `keepMentions`. It spot-checked 16 FIXED rows of rounds 1 to 3 against the tree
(all there) and the counts 43 / 77 / 583 (right). 42 mutations of its own: 26 red for the right reason; 16 green —
9 are R4-3 / R4-4 and the harness note below, 7 are no findings (a dead overload; white space inside a string
literal; a state write that fails closed).

| ID | Sev | Finding (short) | Verified | Result |
|---|---|---|---|---|
| R4-1 | NIT | The R3-3 comment (two more docblock lines in `SpixiFlags.cs`) made 18 line citations of `SpixiFlags.cs` in six documents stale by +2 | yes — and one more that the reader's table did not name (P38: the `[FLAGS]` line, `:180` → `:182`) | FIXED (documents only) — the 19 numbers corrected in the reason doc, P38–P41 and the gate section; a script then printed the source line of every `SpixiFlags.cs` citation of the batch documents (all right) |
| R4-2 | NIT | The stated relation of `unseed()` to the base is short by one item: besides the loop bound, the type-only log line and the image-status line, the statement `UIHelpers.shouldRefreshContacts = true;` moved from before the status line to after the `unseedImageChats()` line (`Spixi/Utils/SDevSeed.cs:471-473`). The frozen hash is right; no Seed 01–50 id, count, time or removal changes (the refresh flag rises after the image files are deleted) | yes | RECORDED — said here, in P42 and in DECISIONS #1573. The header comment and the message of pin e row 11 still name three changes: the pin file stays byte-identical to what the round-4 reader read; the text is corrected at the next re-base of row 11 |
| R4-3 | NIT | Pin e row 11 freezes six texts; a name they use can be re-bound outside them with every pin green (a static constructor that writes `Names[0]`; a nested class or a `using` alias named `Clock`; a second loop over the indexes 0–49 in the unpinned tail of `seedImageChats`) | yes (the reader's 4 mutations) | RECORDED — each is a deliberate edit of a dev-only file (`#if SPIXI_DEV_COEXIST`), not the shape of an accident, and the harness tests still hold the plan (`ImageChatFirst`, ids, counts: 7 tests went red on the reader's O4). The close is one more key (the SHA-256 of the whole masked file) — a proposal for the next batch that touches the seed, not a change after the last reader |
| R4-4 | NIT | Pin c `mentions` / `keepMentions`: (a) the tree-wide check that the class is not split over files exists for `spareChatOp` only — a `partial` class with a new file that reads `spareKeepOp` stays green; (b) a changed USE of an already counted mention (an alias through a static field in a method whose body is not held whole) keeps the count | yes (the reader's 3 mutations) | RECORDED — (a) needs the keyword `partial` on `SpixiContentPage`, a visible one-line change of a class that is not partial today; (b) is the limit the pin's message already names for a local or a parameter. The one-line close of (a) goes with the next batch that touches pin c |

Noted by the reader without a severity, older than this batch and harness-wide: for C# a `//` comment also ends at a
bare CR, U+0085, U+2028 or U+2029; the comment mask of the pins (`scripts/smoke-test.mjs` `stripCode`, and the masks
modelled on it) ends it at `\n` only, so code hidden behind such a character on a comment line is invisible to every
source pin. No `.cs` file under `Spixi/` holds one of these characters today (272 files, no CRLF). RECORDED as a
proposal for a harness batch (one key: "no `.cs` file under `Spixi/` holds a bare CR / U+0085 / U+2028 / U+2029");
`scripts/smoke-test.mjs` outside the registration line is not this batch's file area.

After round 4: no fix round. The document edits (R4-1, R4-2) were checked by the script named in R4-1.
