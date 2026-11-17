# P57 · DEV BUILD: THE COLD-START MARKS · 33 developer-only timing lines (32 marks + the anchor) on the Android start path (batch coldstart1)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (log lines only, fixed words and integers; developer build only; Android only; a store build has no call at all) | no — the wallet load is timed from OUTSIDE (a line before and after the call site); no value of it reaches a line | none: no verb, push, `spixi.*` key, preference, WebView setting, HTML sink, fetch, file | built, dev build only · ⚠ C# UNCOMPILED (the Android arm) · nothing run on a phone yet | 3 min |

**Look here first:** `Spixi/Utils/ColdStartRules.cs` (the pure rule, 165 lines) and `P1Perf.cold` / `coldFlush` / `coldDraw` (`Spixi/Utils/P1Perf.cs:180-272`).

**DECISIONS:** #1127 (the `[P1]` set and its grammar) · #1312 · #1626 (Damir 2026-11-16: "Build 'Cold start 1'" — split the cold start into measured parts) · this batch's rows #1680–#1685 (#1684, #1685 are the pins and the record).

## What changed and why
- **Why.** The cold start on the Galaxy A52s is 2173 ms to the first frame and 2786 ms to the chats on the screen; 1368 ms of it had no inner line (the research `claude/coldstart-research-2026-11-16.md`, § 1). The next lever (the WebView engine earlier, the wallet decrypt off the UI thread, the home work off the UI thread) must be chosen with numbers.
- **The lines.** `[P1] cold <token> t=<ms>` — 33 fixed tokens (`ColdStartRules.Names`, `:21-27`), `t` = integer milliseconds since the Android process start (`Process.StartElapsedRealtime`); 32 of them are marks at call sites, and the token `logger` is the anchor line `[P1] cold logger t=<ms> req=<ms>` (`req` = process start − start requested, API 33+). Each mark at most once per process. Through `P1Perf.line` (the grammar of #1127: a body that fails it is dropped whole).
- **Before the logger.** Ixian-Core drops every line before `Logging.start` (`Ixian-Core/Meta/Logging.cs:196`). So a mark before it stores only a `Stopwatch` stamp; `coldFlush()` (`App.xaml.cs:238`, right after `Logging.start`, `DevLogTail` and the startup-diagnostics flush, before "Starting Spixi") reads the two Android clocks, writes the stored marks in enum order and LAST the anchor with a fresh stamp.
- **Where.** One inserted statement per mark, nothing else changed: `MainApplication.OnCreate` (in, around `base.OnCreate()`, out) · `MauiProgram.CreateMauiApp` (in, before `Build()`) · `App()` (in, config, flags, language, personal files, theme, node, wallet in / out, home in / out, out) · `MainActivity.OnCreate` (in, after `base.OnCreate`, before the boot cover, before the `fa` read) and `OnResume` (in / out) · the first WebView (`CreateNativeControl` in / after `new` / out; `LoadHtml` around `LoadDataWithBaseURL`; the first page start = a NEW dev-only `OnPageStarted` override in `SpixiWebViewClient` that calls the base and never reads the URL (the Java binding still marshals `url` to a managed string per page start in a dev build, as it already does for `OnPageFinished`); the first page finish) · the first draw of the window (`coldDraw`: one `IOnDrawListener` that marks once and removes itself by one `Post`; `OnDraw` is void and never asks for a frame).
- **Store build.** `cold`, `coldFlush`, `coldDraw` carry `[System.Diagnostics.Conditional("SPIXI_DEV_COEXIST")]`: without the symbol the compiler removes every call and evaluates no argument (proved on net10.0 in the session's scratch builds: a side-effecting argument does not run; the IL has no call). `ColdStartRules.cs` is wholly inside `#if SPIXI_DEV_COEXIST`; the override and the listener class are inside `#if`. A store build keeps only the enum `ColdMark` (member names as metadata), the three attribute blobs (the text `SPIXI_DEV_COEXIST`) and three empty methods (two on a non-Android target). The O-35 gate refuses the symbol in a store build (`Spixi/Spixi.csproj:418`).
- **Platforms.** Android only (`#if SPIXI_DEV_COEXIST && ANDROID` for the bodies). Windows, iPhone, Mac dev builds compile the calls and write nothing.

## What a line tells (the honest list)
- No value of the code around a site: never the wallet result, an address, a path, a name, a URL, a key.
- The PRESENCE of marks tells the boot branch: `wallet_out` only when a wallet file exists; `home_in` / `home_out` only for an unlocked start into home. The existing dev lines (`[P1] boot hold`, `[P1] shell boot`) tell the same.
- `wallet_out − wallet_in` is the time of the wallet load (PBKDF2 + AES, BE). It does not depend on the password's content in any way the app controls; it is a developer build on the TEST phone.
- The lines live in `ixian.log` of the developer build (DevPage shows it; the share sheet offers it) and in logcat through `DevLogTail`; the adb walk's phone-side filter already passes every `[P1]` line of the grammar (`scripts/device/adb-walk.ps1:150`, unchanged).

## Limits (recorded, not changed)
- `t=` after the flush is awake time (Stopwatch = CLOCK_MONOTONIC): valid for a COLD launch only; a process woken earlier by a push shows too-small activity / WebView marks (`am` calls that start WARM; the parser reads COLD only).
- One-shot is per mark: `wv_*`, `nav_*`, `page*` are the first of the process and can belong to different WebViews; the draw listener is one-shot per process, so if the first activity died before its first draw the `draw` line is ABSENT (never moved to a second activity).
- Every call site is on the main thread; a cross-thread mark during the flush may be lost or written twice, never with a wrong value. Below API 24 no line is written.
- Cost: a few microseconds per mark; the first call of the new code is JIT-compiled in a build with profiled AOT (today's default) and AOT in a full-AOT build — a small bias inside the A/B of #1626, stated in the numbers doc.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| A store build writes a line or runs new code | `[Conditional]` on the three entry points; the rule file and the dev bodies inside `#if`; O-35 | pin `pins-coldstart1/a-lines` (1 DEV ONLY; 6 the attribute keys, the frozen members) · the scratch builds of the session (store shape: no call in the IL) |
| A line carries a value | Bodies are built only from the fixed tokens and integers; every argument of a call site is an enum constant or `this` (the pin reads source text: a deliberately hidden alias, shadow class or file-level `#define` is NOT caught — see `docs/review-brief-coldstart1.md` § 5 round 3) | csh `ColdStartTests` (`no_body_holds_anything_but_the_fixed_words_and_integers`, …) · pin `a-lines` (6 `argsOk`, `literalWordsFrozen`, the frozen members) |
| The start path changes | Only inserted statements; the rest of each touched body hashes to the base `cdc4f717` | pin `a-lines` (3 NO MOVE) · `pins-perfb1toggle/a-extra` (`OC_FROZEN` re-based after a look at the diff, #1596) |
| A mark waits, locks, starts a thread, writes a preference or a file | Lock-free rule (Interlocked / Volatile), no I/O; the frozen texts | pin `a-lines` (4 NOTHING NEW; 6 the hashes of the members and of the rule file) |
| The draw listener holds a frame | `OnDraw` is void, marks once, posts one removal; never invalidates or posts a frame callback | pin `a-lines` (6 `listenerFrozen`) |
| The override touches chat content | It calls the base and the mark only; never reads `url` | pin `a-lines` (1 `overrideText`; 6 `pageBlockExact`) |

## NOT proven
- ⚠ C# UNCOMPILED: the Android arm (`MainActivity.cs`, `MainApplication.cs`, `WebViewRenderer.cs`, the Android bodies of `P1Perf.cs`); `ColdStartRules.cs` and the non-Android shape of `P1Perf.cs` compile and run in the csh harness; the Windows CI job compiles the shared files.
- Nothing ran on a phone at the time of writing: the lines, their order, the anchor, the cost.
