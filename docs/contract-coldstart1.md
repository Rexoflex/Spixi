# Agent contract — coldstart1 (Session "Cold start 1")

File name: `docs/contract-coldstart1.md`. Written by the lead BEFORE any agent started (`docs/orchestration.md` § 4).
Ruling: #1626 (in the project doc `claude/talk-rulings-2026-11-16-coldstart.md`; not in `DECISIONS.md` yet). Map: the
project doc `claude/coldstart-research-2026-11-16.md` § 1, § 2, § 5 (CS-02, CS-03). Number block: DECISIONS
#1680–#1694 · L221–L224 · packets P57–P58. Lead: Claude Opus (#1612 for this session, confirmed by Damir's Ready).

## 1 · Base
- Tree: `work/coldstart1` @ "Merge pull request #10 from Rexoflex/work/docs-2026-11-16" (`cdc4f717`) · baseline in
  the cloud twin on the untouched tree (2026-11-16): `build-shells --check` ✓ · `build-locales --check` ✓ · smoke and
  CSH: § 5 · tools: jsdom 29.1.1 · eslint 10.14.0 · globals 17.14.0 · tree-sitter 0.25.1 · tree-sitter-c-sharp 0.23.5
  (L160) · .NET SDK 10.0.115 (apt) · Ixian-Core @ `097341a` as the sibling checkout.
- Must hold for everyone: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge (no new
  verb, no new push) · the security handover gate (this batch adds developer-only LOG LINES and nothing else: no
  verb, no `spixi.*` key, no preference, no WebView setting, no HTML sink, no fetch) · no commit, no push, no full
  smoke, nothing in Ixian-Core.
- **Never touched:** `scripts/device/**` · `Spixi/Spixi.csproj` · `src/**`, the built html · `Spixi/Pages/**` ·
  `Spixi/Meta/**` · `.github/**` · the files of `fixb1` (`Spixi/Utils/SConfirm.cs`, `ConfirmGate.cs`,
  `SafetyRules.cs`, `PerfB1Rules.cs`, `SpixiFlags.cs`, the Android resources, `scripts/pins-perfb1/**`,
  `scripts/pins-fixb1/**`) and of `filewalk` (`Spixi/Utils/SDevSeed.cs`, `SDevSeedPlan.cs`,
  `scripts/pins-perfb1toggle/b-walk.mjs`, `scripts/pins-filewalk/**`).
- ★ L153: while `pgrep -f smoke-test.mjs` prints a pid, an agent runs NOTHING that executes (no `node`, `dotnet`,
  `python3` over a big input); it only reads and edits files.
- ★ The behaviour rule (the riskiest file is `Spixi/App.xaml.cs`): a new line is INSERTED between two existing
  statements. No existing statement moves, changes, is wrapped (no new `try`, `if` or block around it) or is
  reordered. No new thread, no `Task`, no wait, no lock, no timer, no preference, no verb, no navigation. A mark line
  never holds a value from the code around it (never the result of the wallet load — only "this point was reached").

## 2 · Items and ownership (file scopes are disjoint)
| Item | Agent | Model (effort high) | Owns | Reads only | Owes | Copy of the tree |
|---|---|---|---|---|---|---|
| 1 · the C# lines | builder-cs | opus (the start path, the riskiest file) | `Spixi/Utils/P1Perf.cs` · `Spixi/Utils/ColdStartRules.cs` (NEW, pure) · the mark lines in `Spixi/Platforms/Android/MainApplication.cs`, `Spixi/MauiProgram.cs`, `Spixi/App.xaml.cs`, `Spixi/Platforms/Android/MainActivity.cs`, `Spixi/Platforms/Android/WebViewRenderer.cs` | everything else | § 3a; the list of every changed line | `/home/claude/b1/spixi` |
| 2 · pins and harness | builder-pins | sonnet | `scripts/pins-coldstart1/**` (NEW) · `scripts/csh/ColdStartTests.cs` (NEW) + its lines in `scripts/csh/csh.csproj` and `scripts/csh/Run.cs` (if Run.cs lists classes) · the re-base of `scripts/pins-perfb1toggle/a-extra.mjs` (`OC_FROZEN` only, #1596) · ONE registration line in `scripts/smoke-test.mjs` · the smallest re-base of an existing smoke pin that item 1's lines break (named, with the reason) | item 1's files | § 3b; one deliberate break per pin row (#802) | `/home/claude/b2/spixi` |
| 3 · scratch parser | builder-parse | sonnet | `split.py` + `README.md` + synthetic test logs, built in `/home/claude/b3/coldstart1/`; the lead copies them to `Claude outputs\adbwalk\_scratch\coldstart1\` on Damir's PC (git-ignored) | a copy of the run folder `20261116-1515` and of `_scratch\coldstart-20261116\timeline.py` in `/home/claude/b3/adbwalk/` (data, never changed) | § 3c | `/home/claude/b3/` |
| — | the lead | opus | the docs of the export, packet P57, the gate section, the integration, the operator block | | the full smoke, CSH, the #46 loop | `/home/claude/spixi` |

## 3 · Interfaces (the only way the items meet)
| Name | Shape | Provider | Consumer |
|---|---|---|---|
| The mark enum | `internal enum ColdMark` in `Spixi/Utils/P1Perf.cs`, namespace `SPIXI`, declared on EVERY target (no `#if`), members in THIS order: `AppIn, BaseIn, MauiIn, MauiBuild, CtorIn, ConfigIn, Logger, FlagsIn, LangIn, FilesIn, ThemeIn, NodeIn, WalletIn, WalletOut, HomeIn, HomeOut, CtorOut, BaseOut, AppOut, ActIn, ActBase, ActHold, ActOut, ResumeIn, ResumeOut, WvIn, WvNew, WvOut, NavIn, NavOut, Page, PageEnd, Draw` (33; values 0–32, implicit) | 1 | 2 |
| The tokens | `ColdStartRules.Names[(int)m]` = in the same order: `app_in base_in maui_in maui_build ctor_in config_in logger flags_in lang_in files_in theme_in node_in wallet_in wallet_out home_in home_out ctor_out base_out app_out act_in act_base act_hold act_out resume_in resume_out wv_in wv_new wv_out nav_in nav_out page page_end draw` | 1 | 2, 3 |
| The line (every mark but `logger`) | `[P1] cold <token> t=<ms>` — 3 tokens; `<ms>` = integer ms since the PROCESS START (Android `Process.StartElapsedRealtime`), 0 ≤ ms ≤ 99 999 999; outside that range the line is not written | 1 | 3 |
| The anchor line | `[P1] cold logger t=<ms> req=<ms>` — written live at the flush, so its OWN log stamp is the phone clock at `t`; `req=` = start − start requested (`Process.StartRequestedElapsedRealtime`, API 33+), present only when 0 ≤ req ≤ 99 999 999 (else the token is absent) | 1 | 3: process start on the phone clock = own stamp of this line − `t` |
| One-shot | each mark is written at most ONCE per process (the first time its call site runs); later calls do nothing | 1 | 3 (a mark = the FIRST WebView, the FIRST page start, the FIRST draw of the process) |
| Before the logger | `IXICore.Meta.Logging` drops every line before `Logging.start` (`Ixian-Core/Meta/Logging.cs:196`). So a mark before the flush stores ONLY a `Stopwatch` time stamp in its slot; `coldFlush()` (called ONCE, in `App()` right after the existing `flushStartupDiagnostics();` that follows `Logging.start` / `DevLogTail`, before `Starting Spixi`) reads the two Android clocks, captures `logger`, writes every stored mark in enum order, and from then on a mark is written at once | 1 | 3 (the lines before `logger` carry the flush's own stamp: only `t=` counts) |
| Platforms | every line exists ONLY in an Android build with `SPIXI_DEV_COEXIST`. Windows, iPhone, Mac dev builds and every store build: the calls compile and do nothing | 1 | 2 (pins), the packet |

### 3a · Item 1 — what to build
- **`Spixi/Utils/ColdStartRules.cs` (NEW):** the WHOLE file inside `#if SPIXI_DEV_COEXIST … #endif` (no `ANDROID`
  in it: the harness compiles it). `namespace SPIXI; internal static class ColdStartRules`. Pure: no MAUI, no
  Android, no Core, no file, no log, no thread, no lock (lock-free: `Interlocked` on the slot array), no `Regex`.
  - `Names` (the 33 tokens above), `MaxMs = 99_999_999`.
  - `string? body(int id, long ms)` → `"cold " + Names[id] + " t=" + ms`, or null for a bad id or ms out of range.
  - `string? mark(int id, long ts, long freq)`: a bad id → null; the slot already used → null (one-shot); before
    the flush → store `ts` (the slot claim with `Interlocked.CompareExchange`), return null; after the flush →
    claim the slot, return `body(id, round(offsetMs + ts * 1000.0 / freq))`.
  - `List<string> flush(long ts, long sinceStartMs, long reqMs, long freq)`: only the FIRST call does anything
    (a second returns an empty list); `offsetMs = sinceStartMs − ts * 1000.0 / freq`; claims the `logger` slot with
    `ts`; returns, in enum order, the bodies of every used slot (`logger` = `body(...) + " req=" + reqMs` when
    0 ≤ reqMs ≤ MaxMs); then the rule is live.
  - `void resetForTests()` (the harness only; it clears the slots and the live state).
- **`Spixi/Utils/P1Perf.cs`:** the enum (unconditional) and three entry points; every body inside
  `#if SPIXI_DEV_COEXIST && ANDROID`, every body in `try { … } catch (Exception) { }`:
  - `internal static void cold(ColdMark m)` → `ColdStartRules.mark((int)m, Stopwatch.GetTimestamp(),
    Stopwatch.Frequency)`; a non-null body → `line(body)`.
  - `internal static void coldFlush()` → FIRST `long since = SystemClock.ElapsedRealtime() −
    global::Android.OS.Process.StartElapsedRealtime;` then `long ts = Stopwatch.GetTimestamp();` (in this order:
    the managed stamp right after the Java clock returns); `req` = `StartElapsedRealtime − StartRequestedElapsedRealtime`
    only when `OperatingSystem.IsAndroidVersionAtLeast(33)`, else −1; `line(body)` for each body of `flush`.
  - `#if ANDROID internal static void coldDraw(Android.Views.View? decor)` (Android only; the body only with
    `SPIXI_DEV_COEXIST`): one `ViewTreeObserver.IOnDrawListener` (a private sealed `Java.Lang.Object` class, the
    shape of `S11DrawL` in `SpixiContentPage.cs`) added to `decor.ViewTreeObserver`; its first `OnDraw` →
    `cold(ColdMark.Draw)` and ONE `decor.Post(...)` that removes the listener from the CURRENT
    `decor.ViewTreeObserver` when `IsAlive` (a listener cannot be removed inside `OnDraw`); every later `OnDraw`
    returns at once. It never returns false, never invalidates, never posts a frame callback: it cannot hold a frame.
    A null `decor` → nothing.
- **The call sites (one statement each, `SPIXI.P1Perf.cold(SPIXI.ColdMark.X);` or the short form where `using
  SPIXI;` is there; a trailing `// ★ coldstart1 (#1680)` comment):**

| Mark | File · method | Exactly where |
|---|---|---|
| `AppIn` | `MainApplication.cs` · `OnCreate()` | the first statement (before the crash-hook `try`) |
| `BaseIn` / `BaseOut` | same | directly before / after `base.OnCreate();` |
| `AppOut` | same | the last statement (after the `SPushService.registerEarly` try/catch) |
| `MauiIn` | `MauiProgram.cs` · `CreateMauiApp()` | the first statement (before `var builder = …`) |
| `MauiBuild` | same | directly before `return builder.Build();` (its "out" is `CtorIn`: the statement is not split) |
| `CtorIn` | `App.xaml.cs` · `App()` | the first statement (before `InitializeComponent();`) |
| `ConfigIn` | same | directly before `Config.init();` |
| flush | same | `SPIXI.P1Perf.coldFlush();` directly after the `flushStartupDiagnostics();` that follows `DevLogTail` (inside `if (Node.Instance == null)`), before `Logging.info("Starting Spixi …")` |
| `FlagsIn` | same | directly before `SpixiFlags.init();` |
| `LangIn` | same | directly before `if (Preferences.Default.ContainsKey("language"))` |
| `FilesIn` | same | directly before `movePersonalFiles();` |
| `ThemeIn` | same | directly before `Current.UserAppTheme = AppTheme.Unspecified;` |
| `NodeIn` | same | directly before `_ = new Node();` |
| `WalletIn` | same | directly before `bool wallet_found = Node.checkForExistingWallet();` |
| `WalletOut` | same | in the `else` (wallet found), directly after the `if (!wallet_decrypted) { … }` block, before `if (wallet_decrypted == false)` |
| `HomeIn` / `HomeOut` | same | directly before / after `MainPage = new NavigationPage(HomePage.Instance());` |
| `CtorOut` | same | directly after `NavigationPage.SetHasNavigationBar(MainPage, false);` (inside the first-start branch) |
| `ActIn` | `MainActivity.cs` · `OnCreate(Bundle?)` | the first statement (before `Instance = this;`) |
| `ActBase` | same | directly after `base.OnCreate(bundle);` |
| draw + `ActHold` | same | `SPIXI.P1Perf.coldDraw(Window?.DecorView);` then `cold(ActHold)`, directly before `startBootHold(rootView);` |
| `ActOut` | same | directly before `handleNotificationIntent(Intent);` (so the body still ENDS with the fa call and the perfb1 read, the a-extra row 5 regex; only `OC_FROZEN` is re-based). No mark uses the word `bundle` |
| `ResumeIn` / `ResumeOut` | `MainActivity.cs` · `OnResume()` | the first statement (before `base.OnResume();`) / the last (after the `[THEME]` try/catch) |
| `WvIn` / `WvNew` / `WvOut` | `WebViewRenderer.cs` · `SpixiWebviewRenderer2.CreateNativeControl()` | before `var webView = new SpixiWebview(Context);` / after it / before `return webView;` |
| `NavIn` / `NavOut` | same class · `LoadHtml(string, string)` | directly before / after `Control.LoadDataWithBaseURL(…);` |
| `PageEnd` | `SpixiWebViewClient.OnPageFinished` | the first statement |
| `Page` | `SpixiWebViewClient` | a NEW override, the whole method inside `#if SPIXI_DEV_COEXIST … #endif`: `public override void OnPageStarted(global::Android.Webkit.WebView? view, string? url, global::Android.Graphics.Bitmap? favicon) { base.OnPageStarted(view, url, favicon); SPIXI.P1Perf.cold(SPIXI.ColdMark.Page); }` — `url` is never read |

  Nothing else changes in these files. If a call site cannot be placed as the table says (a statement is not
  there, a namespace does not resolve), STOP that mark and report — do not move code to make room.
- ⚠ The cloud cannot compile the Android arm (no Android workload; nuget is not reachable): use only API shapes that
  exist in the tree already or are named here. `SystemClock.ElapsedRealtime()` is a method;
  `Process.StartElapsedRealtime` (API 24) and `Process.StartRequestedElapsedRealtime` (API 33) are static
  properties in the binding (getters). Write `global::Android.OS.Process` (the name `Process` collides with
  `System.Diagnostics.Process`). List the API shapes you were not sure of.

### 3b · Item 2 — what to prove
- `scripts/csh/ColdStartTests.cs` (the real `ColdStartRules` and `P1Perf.isValidLine`): the 33 names = the enum
  names in order (`Enum.GetNames` mapped to snake case), each passes the token grammar and ≤ 40 chars; every body
  passes `P1Perf.isValidLine("[P1] " + body)` at 0 and at `MaxMs`; out-of-range ms and a bad id → null; marks before
  the flush return null and come out of the flush in enum order with the right `t`; one-shot before and after the
  flush; the flush runs once; after the flush a mark returns its body at once; `req=` present only in range;
  `logger` is in the flush output exactly once even when called twice; no body holds anything but the fixed words
  and integers (a mark id never reaches a body as a number).
- `scripts/pins-coldstart1/a-lines.mjs` (SOURCE pins; the cloud cannot compile Android), rows:
  1. **DEV ONLY** — `ColdStartRules.cs` is wholly inside `#if SPIXI_DEV_COEXIST`; the bodies of `cold`, `coldFlush`,
     `coldDraw` in `P1Perf.cs` are inside `#if SPIXI_DEV_COEXIST && ANDROID` (or the Android-only method's
     `SPIXI_DEV_COEXIST` region); the `OnPageStarted` override is inside `#if SPIXI_DEV_COEXIST`; every token text
     (`"app_in"` … `"draw"`, `"cold "`) appears in the tree ONLY in `ColdStartRules.cs`; no `.cs` file #defines the symbol.
  2. **CALL SITES** — every mark is called exactly once in the tree, at its file and method of § 3a, with the
     neighbouring statement the table names (before / after); `coldFlush()` exactly once, `coldDraw(` once.
  3. **NO MOVE** — for each touched method body (`MainApplication.OnCreate`, `MauiProgram.CreateMauiApp`, `App()`,
     `MainActivity.OnCreate`, `MainActivity.OnResume`, `CreateNativeControl`, `LoadHtml`, `OnPageFinished`): remove
     exactly the batch's lines (the mark statements with their comment, the flush and draw lines) → the SHA-256 of
     the raw body text equals the body of the base `cdc4f717` (computed once from the untouched tree and written as
     constants). This proves "only lines were inserted".
  4. **NOTHING NEW** — the new code (ColdStartRules.cs, the new P1Perf members, the override) holds no `Thread`,
     `Task`, `async`, `await`, `Wait`, `Sleep`, `Delay`, `lock`, `Monitor`, `Timer`, `Preferences`, `SecureStorage`,
     `File`, `ixian:`, `sendUiCommand`, `Navigation`, `PostDelayed`, `PostFrameCallback`, `Invalidate`, `Logging.` (only
     `line(`); the override never reads `url`; the draw listener has exactly one `Post(` and one `RemoveOnDrawListener`.
  5. **HARNESS** — `csh.csproj` compiles `ColdStartRules.cs`; `ColdStartTests` holds the named tests.
  Each row gets one deliberate break in a full copy (#802): the red line and its failing key go into the report.
- `a-extra.mjs`: only `OC_FROZEN` changes, with a comment naming coldstart1 and #1596 and the diff it was read over.
- The smoke registration: ONE line after the perfb1toggle line, the same helper set.

### 3c · Item 3 — the scratch parser (PC, git-ignored)
`python3 split.py <adbwalk folder> <run> [<run> …]` (and `--compare <runsA…> -- <runsB…>`): for each rep of step
`coldstart` with `status` ok and `am.launchState` COLD: `t0` from `run.json`; the own stamp of each `DOTNET` line
(the `timeline.py` regex); `proc` (process start on the phone clock) = own stamp of `[P1] cold logger` − its `t`.
Rows (median, min–max, n): `am` TotalTime; t0 → proc; every mark as ms after t0 (= proc − t0 + t); the existing
points (`Starting Spixi`, cover added = `[P1] boot hold` stamp − `ms=`, home navigation start = `[P1] shell boot
shell load=` stamp − `load=`, first frame = t0 + TotalTime, cover released = the `boot hold` stamp); the named parts
(the consecutive pairs of § 3a and the four parts A–D of the research). A rep without the anchor line = "no data"
for the new rows (never a guess). `--compare` prints both runs and, per row, "agree" / "differ" by #1530 (medians
differ by < 20 %, or ≤ 17 ms, or ≤ 1 for a count). It copies no raw line and writes nothing outside
`…\_scratch\coldstart1\`. Test it on synthetic logs built from the line shapes (and on a real run folder of
2026-11-16: the new rows must say "no data" there, the old rows must equal `timeline.py`'s numbers).

### 3d · Changes after the review rounds (the lead; the fixers got the text)
- Round 1 (R-1 / S-1): `cold`, `coldFlush`, `coldDraw` carry `[System.Diagnostics.Conditional("SPIXI_DEV_COEXIST")]` —
  a build without the symbol has NO call and evaluates no argument (the § 3 "Platforms" row now reads: a store build
  has no call at all); `coldDraw(global::Android.App.Activity? activity)`, called as `coldDraw(this)`, reads the decor
  inside its dev body and is one-shot per process.
- Round 1 (R-2 / S-3): `coldFlush` reads `StartElapsedRealtime` → `ElapsedRealtime()` → the stamp; `flush(ts,
  sinceStartMs, freq)` returns the stored marks in enum order WITHOUT `logger`; the NEW `anchor(ts, freq, reqMs)`
  writes `logger` LAST with a fresh stamp (one-shot, only after the flush); `mark(Logger, …)` is always null.
- Round 1 (P-1 … P-5): pin row 6 ROUND 1 FREEZE (the dev-only `OnPageStarted` block exact; the members and the rule
  file by SHA-256; the literal scan; the counts; the attribute).
- Round 2 (B2-1, B2-2): `P1Perf.cs` frozen whole; the raw line-end check for the seven batch files; the exact
  comment tail of a mark line.

## 4 · What each agent returns
The files it changed · per pin: the command, the green line, the break and the red line · what it could not prove
(⚠ C# UNCOMPILED for every Android file) · anything outside its scope: a note, not a fix.

## 5 · Integration (the lead)
Copy back changed files only → `cs-syntax-check` → the two `--check` gates → the new pins → the full smoke (one at a
time) + CSH → the security-only #46 loop (Fable 5.2 readers, #1606) with the affected pins between rounds (#1503) →
the full smoke once after the last fix → the export → commits → ONE push (#1546).

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
