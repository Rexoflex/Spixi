# Review brief — coldstart1 (Session "Cold start 1", #1680–#1694)

Work order for the security-only #46 loop (`docs/process.md`; readers by #1606: Fable 5.2 for the security pass and
for the riskiest file, Opus for the rest). Written BEFORE round 1. The verdict goes into § 5 (#660).
Ruling: #1626 (project doc `claude/talk-rulings-2026-11-16-coldstart.md`). Contract: `docs/contract-coldstart1.md`.

## 1 · What the batch is
| Item | What landed | Where | DECISIONS |
|---|---|---|---|
| CS-02 marks | 33 developer-only cold-start marks `[P1] cold <token> t=<ms>` (ms since the Android process start) + one anchor line `[P1] cold logger t=<ms> req=<ms>`; one-shot per process; buffered before the logger, flushed once right after it | `Spixi/Utils/ColdStartRules.cs` (new, pure, whole file `#if SPIXI_DEV_COEXIST`) · `Spixi/Utils/P1Perf.cs:17-23` (enum), `:181` `cold`, `:203` `coldFlush`, `:245` `coldDraw`, `:383` `ColdDrawL` (after round 1) | #1680 |
| call sites | ONE inserted statement per mark, nothing else changed | `MainApplication.cs:40,105,107,137` · `MauiProgram.cs:33,205` · `App.xaml.cs:167,170,238,251,285,302,317,391,395,415,443,445,451` · `MainActivity.cs:440,444,494-495,506,571,585` · `WebViewRenderer.cs:193-201` (new dev-only `OnPageStarted`), `:205,351,353,453,455,457` | #1680 |
| pins + harness | pin `scripts/pins-coldstart1/a-lines.mjs` (5 rows; 6 after round 1) · csh `scripts/csh/ColdStartTests.cs` (14 tests; 15 after round 1) · re-bases: `pins-perfb1toggle/a-extra.mjs` `OC_FROZEN` (#1596), `pins-s9/a3-wiring.mjs:281`, the inline `#461` pin in `scripts/smoke-test.mjs` (`OnResume`) | as named | #1681 |
| CS-03 | the full-AOT A/B: NO file change (`-p:AndroidEnableProfiledAot=false` on the command line of the operator block) | — | #1682 |

Not built, and why: CS-01 (the walk keeps the existing start lines) and the summary rows for the new lines — they
change `scripts/device/**`, the area of session `filewalk` (a later small batch); a split INSIDE the home page
(contacts, `InitializeComponent`, `generatePage`) — `Spixi/Pages/**` is out of scope (`fixb1`'s area), so
`home_in → home_out` is one part; Windows, iPhone, Mac: no line (by the prompt).

## 2 · How to run
- Tree: the cloud twin of `work/coldstart1` (base `cdc4f717`), a frozen copy per reader · range: `git diff cdc4f717`
  (plus the two new files `Spixi/Utils/ColdStartRules.cs`, `scripts/csh/ColdStartTests.cs`, `scripts/pins-coldstart1/`).
- Pipeline: none (C# + scripts only). Smoke before: `BASELINE OK — 6463 pass / the 2 KNOWN` (2026-11-16, untouched tree);
  CSH before 600, after 614 (round-1 tree), 615 after the round-1 fixes. Ixian-Core @ `097341a` present as the sibling.
- Pins: `node scripts/run-pins.mjs pins-coldstart1/a-lines pins-perfb1toggle/a-extra pins-s9/a3-wiring` · `node scripts/run-csh.mjs`.
- ⚠ The Android arm does not compile in the cloud (no workload; nuget blocked). Its first compile is Damir's Release
  dev build in the operator block.
- ★ L153: while `pgrep -f smoke-test.mjs` prints a pid, a reader runs nothing that executes beyond reading files.

## 3 · Reader scopes (security only)
| Reader | Model | Scope | Focus |
|---|---|---|---|
| S | Fable 5.2 | `ColdStartRules.cs`, the new members of `P1Perf.cs`, the `OnPageStarted` override, the call sites as lines | (1) what a line can LEAK (a value of the code around a site, the wallet result, an address, a path, a name; the `t=` and `req=` values; what the presence or absence of a mark tells); (2) is a STORE build free of every line and token (`#if` regions, the O-35 gate, a file-level `#define`); Windows / iPhone / Mac dev builds write none; (3) can a line CHANGE THE TIMING it measures or the behaviour of the start (JIT of the new code, the Java peer of the draw listener, the JNI clock reads, the `Logging.info` cost, the new override's managed call per page start of EVERY WebView — chat included); (4) the PARAMOUNT invariant (the override is in the shared `SpixiWebViewClient`: does it touch the chat WebView's content?); (5) the gate triggers: does the batch add anything but log lines |
| R | Fable 5.2 | THE RISKIEST FILE `Spixi/App.xaml.cs` (`App()`, the wallet load) and the start path `MainApplication.OnCreate`, `MauiProgram.CreateMauiApp`, `MainActivity.OnCreate` / `OnResume`, `CreateNativeControl`, `LoadHtml`, `OnPageFinished` | no statement moved, changed, wrapped or reordered; the boot-root decision (launch / retry / lock / home) and `homeIsBootRoot` unchanged; no mark reads a value; no new thread, wait, lock, timer, preference, verb, navigation; an exception in a mark cannot escape into the start; one-shot per process holds on a second `App()` / a re-created activity / a push-woken process; the `fa` path and the perfb1 read untouched |
| P | Opus | the pins `a-lines.mjs`, the re-bases, `ColdStartTests.cs`, the scratch parser on the PC (`Claude outputs\adbwalk\_scratch\coldstart1\split.py`, copy in `/home/claude/b3/coldstart1/`) | does each pin row FAIL when its rule is broken (derive the breaks yourself, not the builder's list); do the re-bases keep each pin's first failure; does the parser anchor right and never copy a raw line |

## 4 · Non-negotiables and accepted dials
- Must hold: the PARAMOUNT isolation invariant · C# touches no risky parts · no URL / address / name / text in a log
  line · a timing line never holds the result of the wallet load, only "reached" and milliseconds (the prompt) · no
  statement of the start path moves; no new thread, wait, preference or verb · the bodies compile only under
  `SPIXI_DEV_COEXIST` · the existing lines keep their text · `scripts/device/**` and `Spixi/Spixi.csproj` unchanged.
- Accepted (do not re-open): #1626 (two budgets; the batch = the split + the full-AOT A/B) · #1127 (`P1Perf`, the
  grammar) · #1596 (the re-base of `a-extra` after a look at the diff) · #1606 (the reader models).
- Known and accepted by design (record, do not count as a finding unless the reasoning is wrong): the first call of
  the new code is JIT-compiled in build A (profiled AOT with the default profile) and AOT in build B, so the marks
  cost a little more in A (estimated well under the 17 ms band of #1530); a mark lost to a cross-thread race is never
  a wrong value; below API 24 no line is written.

## 5 · Verdict
**STOPPED at round 3 — CLEAN NOT CLAIMED for the pin item; the batch is NOT pushed.** Rule 9 of the lead skill (`lead-work-session`): the pin `pins-coldstart1/a-lines.mjs` is a hand-written source scanner, and two rounds in a row (r2: an attribute stacked above a frozen member; r3: a `#define` in a caller file / inside a `#region` line, a shadow class the mark lines bind to) found a NEW class of silent fault in it — so no third fix round; the choice goes to Damir (the status doc `claude/session-coldstart1-status.md`, question 1). The C# had NO finding in rounds 2 and 3; every claim about the PRESENT tree held (round 3 checked the tree raw: no `#define`, no shadow, no alias, the 31 call sites, one flush, one draw). MAJOR per round: 2 → 1 → 2, all after round 1 in the pins. Full smoke on the final tree (2026-11-17 01:05): 6468 pass / the 2 KNOWN + 1 row red only in the full run (`S15 E v2`, `scripts/pins-s15/e-send-enter.mjs`, a timing pin outside this batch; green alone 3 / 3 on this tree, 1 / 1 on the base) = 6463 + 6 rows; CSH 615. The code files are as the round-3 reader read them (the hashes below).

### Round 1 (2026-11-16) — readers S (Fable 5.2), R (Fable 5.2, the riskiest file), P (Opus), fresh, read-only, high effort: 2 MAJOR · 6 MINOR · 11 NIT (after merging the doubles S-1 = R-1, S-3 ⊂ R-2, S-4 = R-3, S-5 ⊂ R-4 (c), S-6 = R-5, S-2 = R-6)
Smoke on the round-1 tree: `BASELINE OK — 6468 pass / the 2 KNOWN` (= 6463 + 5, the five rows of `a-lines`) · CSH 614.
| Id | Sev | Where | Finding | Action |
|---|---|---|---|---|
| R-1 / S-1 | MAJOR (by the batch's rule) | `MainActivity.cs:494` | `coldDraw(Window?.DecorView)`: the ARGUMENT is evaluated in every build, the store build too (two JNI getters on the store start path, outside the method's try) | fixed: `[Conditional("SPIXI_DEV_COEXIST")]` on `cold` / `coldFlush` / `coldDraw` (a store build has no call and evaluates no argument); `coldDraw(this)` reads the decor inside its dev body |
| P-1 | MAJOR | `a-lines.mjs:212-219` | NO MOVE strips the WHOLE dev-only block around `OnPageStarted`; another member or an `#else` (store-only code in the shared client) in it stayed green | fixed: the block must equal its exact text; `#else` / `#elif` refused |
| R-2 (+ S-3) | MINOR | `P1Perf.cs:203-213`, `ColdStartRules.cs:90-107` | the anchor's own stamp is taken after six first-call `line()`s and the first calls of the rule: `proc` reads late, by a different amount in builds A and B; the second JNI read sat between the Java clock and the managed stamp | fixed: the clocks read start → now → stamp; the anchor is written LAST with a fresh stamp (`ColdStartRules.anchor`) |
| R-3 / S-4 | MINOR | `ColdStartRules.cs:63,130` | after the flush `t=` is awake time (Stopwatch = CLOCK_MONOTONIC); a push-woken process gives too-small activity / WebView marks | recorded and documented in the code, the packet and the parser README: valid for a COLD launch only (the parser reads COLD reps only) |
| P-2 | MINOR | `a-lines.mjs:386-400` | the bodies of `cold` / `coldFlush` / `coldDraw` / `ColdDrawL` only against a word list (a wallet value as the stamp, `Android.Util.Log`, `SpinWait`, `Parallel` stayed green) | fixed: the four members frozen whole by SHA-256 |
| P-3 | MINOR | `a-lines.mjs:387` | the pure file could read a clock or wait | fixed: `ColdStartRules.cs` frozen whole by SHA-256 |
| P-4 | MINOR | `a-lines.mjs:320,429` | only the exact literal `"<token>"` was counted; a store-build `"[P1] cold wallet_out t=" + w` elsewhere stayed green | fixed: every string literal under `Spixi/` outside the rules file is scanned for `cold <token>` and for a bare token word |
| P-5 | NIT | `a-lines.mjs:356` | a second `cold(…)` inside `P1Perf.cs` was not counted | fixed: counted |
| P-6 | NIT | `ColdStartTests.cs` | `Math.Round` → `Math.Floor` stayed green | fixed: a test with a fractional stamp |
| P-7 | NIT | `ColdStartTests.cs:154` | a message says 800, the test uses 2000 | fixed |
| P-8 | NIT | `split.py:313` | `--json <path>` can write outside the folder | recorded in the README (tests only) |
| S-5 / R-4 (c) | NIT | `P1Perf.cs:226` | `coldDraw` adds a listener on every activity creation | fixed: one-shot |
| S-6 / R-5 | NIT | `ColdStartRules.cs:55-89` | a cross-thread mark during the flush may also be written twice | the comments say it (main thread only) |
| S-2 / R-6 | NIT | `App.xaml.cs:415,443,445` | the PRESENCE of `wallet_out` / `home_*` tells the boot branch; `wallet_out − wallet_in` is the wallet-load time | recorded in the gate row and P57 (the existing `[P1] boot hold` / `shell boot` lines tell the same) |
| R-4 (a, b) | NIT | `WebViewRenderer.cs`, `MainActivity.cs` | one-shot is per mark: `wv_*`, `nav_*`, `page*` can belong to different WebViews; `draw` can belong to a second activity | recorded in P57 and the parser README |
| S-7 | NIT | `P1Perf.cs:17-22` | a store build carries the enum member names as metadata; non-Android dev builds carry the token strings as dead code | recorded |
Not a finding (both S and R): the API shapes read as right; the PARAMOUNT invariant holds; log lines are the only gate trigger; no statement of the start path moved.
Fixes of round 1: C# by an Opus fixer (`[Conditional]`, `coldDraw(this)`, the anchor last, the one-shot draw, the comments), the pins and the tests by a Sonnet fixer (row 6 ROUND 1 FREEZE, 15 tests, `OC_FROZEN` re-based again: only the `coldDraw` line changed); the lead narrowed P-4's bare-word scan to the tokens with an underscore (the plain words `page` / `draw` / `logger` occur in the base literals of other sessions' files, so a frozen set there would turn red on their next batch) and fixed the scan's run split (a space fill broke every literal at its spaces, so `cold <token>` could never match — a green break found by the lead). After the fixes: `run-pins` 29 pass · CSH 615.

### Round 2 (2026-11-16) — one fresh read-only Claude Fable 5.2 reader ("break-my-verdict"), high effort: 1 MAJOR · 1 MINOR · 6 NIT
The round-1 code fixes are real and complete (the reader's own stub compiles: a store Android caller has a 2-byte body and evaluates no argument; the anchor is written last; `coldDraw` is one-shot; the nine NO MOVE base hashes recomputed from `cdc4f717`).
| Id | Sev | Where | Finding | Action |
|---|---|---|---|---|
| B2-1 | MAJOR (a pin hole by the batch's rule) | `a-lines.mjs:441,467,527-532` | a second attribute ABOVE a member's doc comment (`[Conditional("ANDROID")]` — Conditional attributes are OR-ed, so a store Android build calls again and evaluates the arguments; or `[ModuleInitializer]`) stayed green: the frozen member text starts at the doc comment | fixed: `P1Perf.cs` frozen WHOLE by SHA-256; `Conditional(` counted; no `ModuleInitializer` in the tree |
| B2-2 | MINOR | `a-lines.mjs:209`, `:73` | Roslyn ends a `//` comment at U+2028 / U+0085 / U+2029: code hidden in a mark line's comment tail stayed green in `a-lines` (only `a-extra`'s tree-wide `plainLineEnds` caught it) | fixed: the raw line-end check for the seven batch files; the mark-line tail must be the exact `// ★ coldstart1 (#1680)` |
| B2-3 | NIT | `a-lines.mjs:440,459` | the `coldDrawn` field could leave the dev region | fixed by the whole-file hash (+ a region check) |
| B2-4 | NIT | `a-lines.mjs:506-525` | a literal split into fragments (`"[P1] " + "cold" + " page t="`) escapes any literal scan | recorded (a limit of the method; the members that build lines are frozen) |
| B2-5 | NIT | `P1Perf.cs:226`, `ColdStartRules.cs:112-126` | the anchor's stamp is still followed by the first call of `anchor()` and one `line()` before `Logging.log` takes its time (sub-ms; JIT in A, AOT in B) | recorded (P57, the parser README) |
| B2-6 | NIT | `P1Perf.cs:254-264` | from the reader's memory of AOSP: before API 26 a draw listener on an unattached view's observer may not carry over at attach (no `draw` line, never a wrong value); a null decor on the first call uses up the one shot | recorded (the phone is API 34) |
| B2-7 | NIT | the brief § 1–2, the contract § 3 / § 3a | stale after round 1 | fixed (this text; the contract's round-1 note) |
| B2-8 | NIT | § 5 round 1 | P57 and the gate section were not written yet | written in the export (`docs/be-review-pack/P57-coldstart-dev-marks.md`, the gate section "Session Cold start 1") |
**Cost before round 3 (the skill's rule):** MAJOR per round 2 → 1, both MAJORs of round 2 in the PINS (the C# held in round 2). One more round = one fresh Fable 5.2 reader (about 15 minutes) + the pins between rounds; the full smoke (about 45 minutes) once after the last fix (#1503). Budget: rounds 3–5 are left of the limit of 5.

### Round 3 (2026-11-16) — one fresh read-only Claude Fable 5.2 reader ("break-my-verdict"), high effort: 2 MAJOR · 2 MINOR · 5 NIT
The round-2 fixes held under the reader's own breaks (a second Conditional above or beside a member, a `[ModuleInitializer]`, U+2028 / a lone CR after a mark tail, a changed tail, the `coldDrawn` field moved: all red). New, all in the PIN (the C# has no finding; the present tree has none of these):
| Id | Sev | Where | Finding (the break the reader ran: all three pins stayed green) | Action |
|---|---|---|---|---|
| B3-1 | MAJOR (pin hole by the batch's rule) | `a-lines.mjs:324,333` (`noDefine`); the same in `pins-perfb1toggle/a-extra.mjs:136` | `[Conditional]` is decided per CALLER file: one `#define SPIXI_DEV_COEXIST` line in `MauiProgram.cs`, or one inside `#region /* … */` (the mask reads the region text as a comment) brings the calls of that file back in a store build; O-35 reads only `DefineConstants` | NOT fixed (rule 9) — question 1; direction: a raw-text directive rule (only `if`, `elif`, `else`, `endif`, `region`, `endregion`, `pragma`, `nullable`; no `/*` or quote on a region line) |
| B3-2 | MAJOR (pin hole by the batch's rule) | `a-lines.mjs:217-218,379-382,461-468` | the pins prove the TEXT of a mark line, not what it binds to: a nested `class SPIXI { enum ColdMark; static class P1Perf { static void cold(…) } }` in `MainApplication` (outside the hashed body) makes the untouched lines call it with no `[Conditional]` — a store build runs it | NOT fixed (rule 9) — question 1; direction: a frozen whole-word census of `cold` / `coldFlush` / `coldDraw` / `P1Perf` / `ColdMark` / `ColdStartRules` per file on code-only text; no type or alias named `SPIXI` |
| B3-3 | MINOR | `a-lines.mjs:54-94` (the mask) | the mask is not the C# lexer for a raw string of 4+ quotes and for free text on a `#region` line: code after `""""/*""""` is live for the compiler and a comment for the mask | NOT fixed (rule 9); direction: freeze the `"""` count per file (today only `Platforms/iOS/iOSWebViewHandler.cs` ×4) |
| B3-4 | MINOR | `a-lines.mjs:379-383,462-468` | an alias (`using PP = SPIXI.P1Perf`), `using static`, a computed `(CM)(k % 33)` argument escape the text counts (dev build only: `[Conditional]` still removes them in a store build) | NOT fixed (rule 9); the census of B3-2 closes it |
| B3-5 | NIT | `a-lines.mjs:277-278` | the tree walk skips every `obj` / `bin` folder at any depth (MSBuild skips only the two at the project root) | recorded |
| B3-6 | NIT | — | `P1Perf.line(ColdStartRules.body(3, v))` in another dev-only file writes `cold maui_build t=<any integer>` (the class of B2-4) | recorded |
| B3-7 | NIT | P57, round 1 row R-4 | after the one-shot draw listener a second activity never gets a listener: the `draw` line is then ABSENT, not moved | fixed (P57) |
| B3-8 | NIT | the gate section, P57 | the anchor IS the token `logger`: 32 marks + the anchor = 33 line shapes (the docs said 33 + 1); P57 named rows the tree did not hold yet | fixed |
| B3-9 | NIT | P57, the gate row | a store build also keeps the three attribute blobs (the text `SPIXI_DEV_COEXIST`); a non-Android store build keeps two methods; the binding marshals `url` per page start in a dev build | fixed (P57) |
Not a finding (checked raw): the 31 call sites, one flush, one draw, no alias, no `using static`, no reflection, no token text outside `ColdStartRules.cs` except two doc comments in `P1Perf.cs`; the store build of the present tree has no define and the csproj is unchanged; the start path is 33 inserted statements + the dev-only override; the three re-bases keep their first failure; the doc file:line claims are right; the API shapes read as right.

**The code files as the round-3 reader read them (SHA-256, the frozen copy = this tree):**
- `Spixi/Utils/P1Perf.cs` `5dcd04127a8b07618253f586fdc8de58c5b14542904ce4599e7817186158ca92`
- `Spixi/Utils/ColdStartRules.cs` `e91e0cf144404e9fabd720691a24d89eecef0fe54833ac4599e83bef3e773f3b`
- `Spixi/App.xaml.cs` `6c8433243ad05ff2d358e282b2fbf13531dd854be4a2bc0f2d19b239fcc803e7`
- `Spixi/MauiProgram.cs` `ecc7cc8e5efe39acc1683452bd68879a68dfe25f5804fd9c94ee7b586c00e65d`
- `Spixi/Platforms/Android/MainActivity.cs` `e1a7d6406af50e6a9b1fce0d4b270df3ba784a3b145038ed9fd8ceacc12ef8fa`
- `Spixi/Platforms/Android/MainApplication.cs` `94852df2c04dfd8c6f365e4f99dd2ef1438fd28f445fef8d803a435d0ccca4d6`
- `Spixi/Platforms/Android/WebViewRenderer.cs` `d1cf433edb324c7583faa37438b576b8a81eac2b0ebfdae22b7e19fbab0dbec3`
- `scripts/pins-coldstart1/a-lines.mjs` `5a4035001308de3cf02088a5d0056b60e2b01544e0ee8a21aedaac00082a3585`
- `scripts/csh/ColdStartTests.cs` `ed7c02819de8297e9bb20fb5c51f57753c1de7fa5dd7b90ea82bada1ad211bda`
