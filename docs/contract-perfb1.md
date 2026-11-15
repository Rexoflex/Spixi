# Agent contract — perfb1 (Speed batch 1a)

Written by the lead BEFORE any agent started (`docs/orchestration.md` § 4). Every agent gets this file plus its own
row. An agent that needs a file outside its row stops and asks the lead (it writes the need into its report).

## 1 · Base
- Tree: `work/perfb1` @ "Merge pull request 4 from Rexoflex/work/docs-2026-11-13" (`7c195242`) · baseline:
  `BASELINE OK 6298 / the 2 KNOWN (#136 · B3)` · CSH 506 (.NET SDK 10.0.115) ·
  tools: jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5 (L160)
- Must hold for everyone: the PARAMOUNT isolation invariant (the spare chat page stays its own WebView and holds no
  chat content while it waits) · C# touches no risky parts · the frozen bridge: **no new verb, no new push, no shell
  change** (`src/**` and `Spixi/Resources/Raw/html/**` are out; an item that seems to need one STOPS) · #1312 / #1478:
  every change behind its OWN switch, the old path = the fallback, byte for byte when the switch is off · the security
  handover gate: a new log word, a new `flag…` preference or a new dev verb form is REPORTED to the lead (it gets a
  gate section) — prefer the log lines that exist · no commit, no push, no full smoke, nothing in Ixian-Core ·
  never touch `Spixi/Spixi.csproj`, `scripts/device/**`, `.github/**`, `scripts/build-shells.mjs`,
  `scripts/strip-release.mjs`, `scripts/lib/**`, `scripts/smoke-packaged.mjs` (other sessions own them).
- The cloud cannot compile the app. Every changed app file is "⚠ C# UNCOMPILED" until Damir's build: write C# that a
  careful reader can check — existing APIs only (cite the `file:line` of each API you call for the first time), no
  guessed MAUI / Android member. `node scripts/cs-syntax-check.mjs` must pass. Pure rules go into their own small
  file with no MAUI / Core dependency, so that the C# harness (`scripts/csh`) compiles and runs them.
- Android and Windows first (#1515). iPhone / Mac code keeps today's behaviour unless the row says otherwise.

## 2 · Items and ownership (file scopes are disjoint inside a phase)

Phase 1 runs in parallel (A, C, D). Phase 2 starts from the integrated phase-1 tree (B, E in parallel).
`Spixi/Pages/Home/HomePage.xaml.cs` has ONE owner per phase: A in phase 1, B in phase 2.

| Item | Agent | Model (effort high) | Owns (files / folders) | Reads only | Owes (pins + one deliberate break each) | Scratch tree |
|---|---|---|---|---|---|---|
| 1 · P-12 `WarmOnIdle` + 2a · P-11 switch 1 `SpareRearm` | builder-a | opus | `Spixi/Pages/Home/HomePage.xaml.cs` · `Spixi/Utils/SpixiContentPage.cs` (the spare funnel and `warmParkedOverlay` only) · `Spixi/Platforms/Android/MainActivity.cs` (the touch stamp only) · NEW `Spixi/Utils/WarmIdleRules.cs` · NEW `Spixi/Utils/SpareRearmRules.cs` · NEW `scripts/csh/PerfB1WarmIdleTests.cs`, `scripts/csh/PerfB1SpareRearmTests.cs` · its two `<Compile Include>` lines in `scripts/csh/csh.csproj` · NEW `scripts/pins-perfb1/a-warm-idle.mjs`, `scripts/pins-perfb1/b-spare-rearm.mjs` | `Spixi/App.xaml.cs`, `Spixi/Utils/SpixiFlags.cs`, `Spixi/Utils/OpenPerfRules.cs`, the adb walk logs | CSH: the gate waits until ≥ 1200 ms without a touch; switch off = the old delays; the re-arm rule (armed after a drop; never while locked; off = no re-arm). Source pins: every warm request goes through the gate; the touch stamp holds a time only; the drop re-arms. Breaks: bypass the gate → red; remove the re-arm → red; a re-arm while locked → red | `/home/claude/agents/a/spixi` |
| 4 · the dev image seed | builder-c | opus | `Spixi/Utils/SDevSeed.cs` · (only if needed) NEW `Spixi/Utils/SDevSeedPlan.cs` for the pure id / count / image-bytes rules · `Spixi/Pages/Settings/SettingsPage.xaml.cs` lines of `handleDevSeedVerb` only (prefer NO change there) · NEW `scripts/csh/PerfB1SeedTests.cs` · its `<Compile Include>` line(s) in `csh.csproj` · NEW `scripts/pins-perfb1/e-image-seed.mjs` | `Spixi/Meta/**`, `Spixi/Pages/Chat/**` (how a photo message and an album are stored and shown), Ixian-Core | CSH: Seed 01–50 ids and counts are the same as at the base (values frozen from the base code); the image chats and the album exist in the plan; the top-up rule. Source pin: all of it inside `#if SPIXI_DEV_COEXIST`; no network; C# names its files. Break: change one id of Seed 01 → red | `/home/claude/agents/c/spixi` |
| F · the four switches (plumbing) | builder-d | opus | `Spixi/Utils/SpixiFlags.cs` · NEW `Spixi/Utils/PerfB1Rules.cs` · `Spixi/Pages/Dev/DevPage.xaml.cs` (the four `ixian:devflash:<name>:<0|1>` forms only) · NEW `scripts/csh/PerfB1FlagsTests.cs` · its `<Compile Include>` line in `csh.csproj` · NEW `scripts/pins-perfb1/f-flags.mjs` | `Spixi/Utils/S16PassRules.cs`, `Spixi/Utils/SafetyRules.cs`, `scripts/csh/SafetyRulesTests.cs`, `scripts/csh/StubsS16.cs` | CSH: defaults (1, 1, 0, 1); a stored 0 acts only in dev mode (three ON flags); a stored 1 acts only in dev mode (the opt-in flag); the `[FLAGS]` line; the verb tail rule. Source pin: `SpixiFlags.init` reads the four keys and logs the one line; DevPage stores only with dev mode on and only "0" / "1". Break: make the opt-in default ON → red; drop the dev-mode condition → red | `/home/claude/agents/d/spixi` |
| 3 · P-13 `PhoneNoEmptyDetail` (phase 2) | builder-b | opus | `Spixi/Pages/Home/HomePage.xaml.cs` (the `defaultDetailContent` hunks only) · `Spixi/Pages/Home/EmptyDetail.xaml.cs` · the null-safety lines in `Spixi/Utils/UIHelpers.cs` and `Spixi/Pages/Settings/SettingsPage.xaml.cs` that read the default detail · NEW `Spixi/Utils/EmptyDetailRules.cs` · NEW `scripts/csh/PerfB1EmptyDetailTests.cs` · its line in `csh.csproj` · NEW `scripts/pins-perfb1/d-empty-detail.mjs` | everything else | CSH: phone + switch on → not constructed at start; the first wide layout → constructed once; desktop → constructed at start (no change); switch off → today's path. Source pin: no `new EmptyDetail()` outside the rule's gate; every reader is null-safe. Break: construct at start → red | `/home/claude/agents/b/spixi` |
| 2b · P-11 switch 2 `SpareKeepShortSleep` (phase 2) | builder-e | opus | `Spixi/App.xaml.cs` (the spare drop at sleep and its resume counterpart only) · `Spixi/Utils/SpixiContentPage.cs` (the spare slot only) · NEW `Spixi/Utils/SpareKeepRules.cs` · NEW `scripts/csh/PerfB1SpareKeepTests.cs` · its line in `csh.csproj` · NEW `scripts/pins-perfb1/c-spare-keep.mjs` · NEW `docs/perfb1-spare-drop-reason.md` (the written reason, #1536) | `HomePage.xaml.cs` (NOT owned in phase 2: a need there → stop and report) | First the written reason and the proof question (§ 3 "switch 2"). If built — CSH: the time limit; drop at the limit; drop at lock; unproven = not used (fail closed); switch off = the drop at sleep. Breaks: remove the limit → red; use an unproven spare → red. If NOT built — the question with its options | `/home/claude/agents/e/spixi` |
| — | sweep / drafts (helpers for the lead — NOT #46 reviewers, #1471) | haiku | none in the tree (read-only; drafts go to `/home/claude/work/`) | | a findings list with `file:line`; the first draft of the walk sheet rows; the doc-consistency check | — |
| — | docs builder (after the integration) | sonnet | `docs/be-review-pack/P38…P42`, the new sections of `docs/security-handover-gate.md` | the integrated tree | one packet per change (≤ 1 page) + its gate row | — |
| — | fix rounds of the #46 loop | sonnet (a fix that failed once, or a design change → opus) | the files of the finding | | the pin that fails first | — |

Model by the cost of a wrong result (`docs/orchestration.md` § 2): every C# item = Opus.

## 3 · Interfaces between items (the only way two items meet)

| Name | Shape | Provider | Consumer |
|---|---|---|---|
| `SpixiFlags.WarmOnIdle` | `public static bool { get; private set; } = true;` key `flagWarmOnIdle` (int pref, absent = 1); a stored 0 acts only in dev mode (`S16PassRules.effectiveFlag`) | D | A |
| `SpixiFlags.SpareRearm` | the same shape, default `true`, key `flagSpareRearm` | D | A |
| `SpixiFlags.SpareKeepShortSleep` | `public static bool { get; private set; } = false;` key `flagSpareKeepShortSleep` (int pref, absent = 0); **opt-in: a stored 1 acts only in dev mode** (`PerfB1Rules.effectiveOptIn(bool devMode, int stored)` = `devMode && stored == 1`) | D | E |
| `SpixiFlags.PhoneNoEmptyDetail` | default `true`, key `flagPhoneNoEmptyDetail`, the ON-flag shape | D | B |
| `PerfB1Rules.flagsLine(bool warmIdle, bool spareRearm, bool spareKeep, bool noEmptyDetail)` | returns exactly `[FLAGS] warmidle=<0|1> sparerearm=<0|1> sparekeep=<0|1> noemptydetail=<0|1>`; logged once by `SpixiFlags.init` | D | the walk sheet (it shows which state ran) |
| `PerfB1Rules.DevSwitchNames` | `{ "warmidle", "sparerearm", "sparekeep", "noemptydetail" }` → `ixian:devflash:<name>:<0|1>` in DevPage, the rules of the safety switches exactly (dev mode on and "0" / "1", else nothing is stored; acts at the next start). **No new push** (the Developer screen gets no new row in this batch) | D | Damir (through a later shell row — the lead writes the question) |
| `WarmIdleRules` (pure) | A designs it; the minimum: `QuietMs = 1200`; `long waitMs(bool flagOn, bool gatedPlatform, long nowMs, long lastTouchMs)` → 0 = warm now, else the ms to wait before the NEXT check (never a negative number; a clock that went back → `QuietMs`); the last-touch stamp is ONE `long` (a time), written by `MainActivity.DispatchTouchEvent`, read by the gate. **After #46 r1 (A-1, A-6, S-10):** `StaggerMs = 900` and the 5-input `waitMs(…, long lastHiddenBootMs)` — two hidden boots are at least 900 ms apart (one main-thread stamp, `SpixiContentPage.lastHiddenBootMs`); `bootsAfterWait(gated, running, foreground)` — the Account warm boots only in the foreground when the gate is on; the touch stamp is `internal static long lastTouchMs { get; private set; }` | A | A, E (E may call the gate; it never changes it) |
| the spare funnel | `scheduleChatSpareWarm` → `warmChatSpareNow` → `warmSpareChat` keeps EVERY refusal that exists today; the idle gate is one more wait in front of it, never a way around a refusal | A | E |
| `dropSpareChat(string why)` | the `why` words that exist today are kept (`sleep`, `theme`, `reload`, `language`, `lowmem`, `stop`, `devmode`, `host`, `timeout`); a NEW word is a new log word → report it | A (re-arm hook), E (the kept spare) | — |
| the seed contract with the adb walk | (a) Seed 01–50: message ids, counts and times unchanged; (b) the first rows of the chat list as today; (c) the image chats use `addressFor(i)` — C reports the seed index of each image chat and of the album; (d) loading the seed twice changes nothing | C | the walk (session `walksteps2`) |

Switch 2 (#1536) — the order is fixed for builder-e: ① write WHY the app drops the spare at sleep today (the code
comment at `Spixi/App.xaml.cs` above `dropSpareChat("sleep")`, the DECISIONS rows it names, what each platform does
when a renderer dies) into `docs/perfb1-spare-drop-reason.md`; ② answer: can the app PROVE, with what the platform
gives today and without a shell change, that a kept spare is alive before it is used? ③ only if yes: build it with a
time limit, a drop when the limit ends or the app locks, fail closed (unproven or any doubt → the spare is dropped and
the cold path runs; L157: nothing frees itself on a timer), Android only (iPhone / Mac keep the drop; Windows never
drops today); ④ if no: do NOT build; write the question with its options.

A change to this table goes through the lead; both sides get the new text.

## 4 · What each agent returns
- The list of files it CHANGED (the lead copies back only these) and `git diff --stat` of its scratch tree.
- Per pin: the command (`node scripts/run-pins.mjs pins-perfb1/<mod>` and the CSH class), the green output line, the
  break it made (a one-token mutation, #802 — restore it after), the red line with the failing key.
- Every NEW log word, preference key, verb form, WebView setting, file write or timer it added (for the gate rows).
- What it could not prove (⚠ C# UNCOMPILED, unrun, not on a device) and what the device sitting must show.
- Anything it saw outside its scope: a note, not a fix.

**Run rule (L153):** the lead's baseline smoke runs until the file `/home/claude/logs/GO` exists. Before that file
exists an agent reads and edits only — it runs NO `node`, NO `dotnet`. After it exists: only its own pin modules and
`node scripts/run-csh.mjs` in its own scratch tree; never the full smoke.

## 5 · Integration order and checks (the lead)
1. Phase 1: copy back per agent, changed files only (D → A → C); `csh.csproj` lines joined by hand;
   `node scripts/cs-syntax-check.mjs`; the pins; CSH. Phase 2 trees are cut from that state (B, E), then copied back
   (E → B).
2. ONE registration block for `pins-perfb1` in `scripts/smoke-test.mjs` (no other line changes — session `perflean`
   adds its own block); grep the smoke for the tokens of every edited line (the INLINE pins, L84).
3. C# only → no generator runs; the two `--check` gates must still pass.
4. The full smoke (one at a time, nothing that executes beside it, L153) + CSH → the #46 loop until CLEAN (the
   affected pins between rounds, the full smoke once after the last fix — #1503) → the export docs → commit → ONE
   push of `work/perfb1` → the read-back (#1546). No pull request from this session.

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
| — | — | — | No item was moved one model up; no agent failed twice on an item | — |
