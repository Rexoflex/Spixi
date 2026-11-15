# perfb1 · P-11 switch 2 — why the app drops the chat spare at sleep (#1536)

Builder-e, 2026-11-13; line numbers re-read in the tree on 2026-11-15 (after review round 1). Mechanism first: the written reason, then the proof question. Where a number moves often, the method name is the anchor.

## 1 · The reason today (proven from the tree)

| Fact | Where |
|---|---|
| `App.OnSleep` drops the spare on every non-Windows target: `#if !WINDOWS SpixiContentPage.dropSpareChat("sleep"); #endif` | `Spixi/App.xaml.cs:1432` (`App.OnSleep`; since this batch the drop sits behind `if (!spareKept)`, `:1425–1433`, and stands after `isInForeground = false`, `:1411`, #46 r2 R2-5) |
| The comment: the spare is an opacity-0 WebView "with no owner watching it — the jetsam / content-process-death class Node.onLowMemory names for the parked Account". A dead renderer "would surface as a BLANK conversation at the 400 ms backstop on the next open". Windows is excluded: OnSleep = window deactivation (#507), WebView2 has no jetsam | `Spixi/App.xaml.cs:1416–1422` |
| `Node.onLowMemory` names the class: the parked Account is "an opacity-0 WKWebView … a prime jetsam target whose content-process death would re-present a dead blank page" — WKWebView and jetsam are **iOS** words | `Spixi/Meta/Node.cs:1022–1027` (`onLowMemory`, `:990`) |
| The spare's docblock lists the drop sites ("on App.OnSleep on mobile") and says the drop "costs nothing but the speed-up" | `Spixi/Utils/SpixiContentPage.cs:1710–1715` |
| The 400 ms backstop: the chat presents `PRESENT_BACKSTOP_MS` after arming even with no `ixian:painted` — a dead document would be shown blank there | `Spixi/Pages/Chat/SingleChatPage.xaml.cs:98` (comment), `:109` (`PRESENT_BACKSTOP_MS`), `:119` (the delay) |
| Origin: a MINOR of the Session P #46 loop — "`OnSleep` did not drop a hidden WebView (a jetsam target)"; #800 lists the drop: "a backgrounded opacity-0 WebView is the content-process-death class" | `DECISIONS.md` #802 (:906), #800 (:904), `docs/prewarm-chat-spec.md:16–18` |
| The price: ~15 MB PSS (+19.7 / +11.0 MB, paired reads), measured with exactly this drop | `DECISIONS.md` #803 (:907), `HomePage.xaml.cs` CHAT_SPARE_ENABLED docblock |
| No renderer-death handler exists anywhere: no `OnRenderProcessGone`, `RenderProcessGone`, `ProcessTerminated`, `WebContentProcessDidTerminate`, `ProcessFailed`, `SetRendererPriorityPolicy` in `Spixi/**` (grep, 0 hits). Android's `SpixiWebViewClient` overrides only `ShouldInterceptRequest`, `ShouldOverrideUrlLoading`, `OnPageFinished` | `Spixi/Platforms/Android/WebViewRenderer.cs:142–209` |
| Low memory: `OnApplicationLowMemory` and `TrimMemory RunningLow / RunningCritical` call `Node.onLowMemory` → `dropSpareChat("lowmem")` | `Spixi/MauiProgram.cs:140–152`, `Node.cs:1029` |

**So the rule is not a security rule.** The spare holds no chat (SECURITY.md §1 is kept either way); the drop is a reliability belt
against ONE failure: a hidden WebView whose own content process died while the app lived, shown blank at the backstop.

## 2 · What happens when a renderer dies in the background, per platform

| Platform | What happens | Status |
|---|---|---|
| iOS / Mac (WKWebView) | Each WKWebView has its own WebContent process; jetsam can kill one while the app lives. With no `webViewWebContentProcessDidTerminate` handler (tree: none) the WebView stays alive and blank → exactly the blank chat the drop prevents | platform behaviour, not proven here; the missing handler is proven |
| Android (Chromium WebView) | All WebViews of the app share ONE renderer (or run in-process: the Motorola, `WebViews: 3` in one pid, #803). A dead renderer kills the home WebView too. With no `onRenderProcessGone` override, the WebView kills the app process (Android 8+ default) → the next tap is a cold start, never a blank spare | platform behaviour, not proven here; the missing override is proven |
| Windows | Never drops at sleep (`#if !WINDOWS`) | proven |

The reason (an independent per-WebView process death) is an Apple mechanism. On Android a kept spare cannot be the only dead
WebView: it shares its fate with the visible home page. What keeping it costs on Android is memory (~15 MB longer in the
background → a slightly higher chance that the system kills the whole app).

## 3 · The proof question — can the app prove a kept spare alive before it is used? (no shell change)

| Question | Answer |
|---|---|
| An evaluate-with-result path? | Yes. `WebView.EvaluateJavaScriptAsync("document.readyState")` runs on every page load in `checkIfPageLoaded` (`checkIfPageLoaded`, `SpixiContentPage.cs:901–924`, called from `webViewNavigated`, `:628`). On Android it reaches `Control.EvaluateJavascript(script, jsr)` with an `IValueCallback` that completes a `TaskCompletionSource` (`WebViewRenderer.cs:723–729`, `:793–808`) |
| What the blank shell answers | `"complete"` (quotes trimmed, as `checkIfPageLoaded` does): the spare is READY only after its `ixian:onload` (`spareShellBooted`, `SingleChatPage.xaml.cs:190`, set at `:412`) |
| A dead renderer | No answer: the callback is never called (Android: the app is killed first, today) → the deadline passes → not proven → drop. Platform behaviour, not proven here |
| Does an answer prove what the reason needs? | Yes, to the standard of a normal READY spare: at the answer that document's renderer runs JS. After the answer the kept spare is in the same state as a spare warmed in the foreground (same residual risk as today) |
| Reads / writes | Reads one DOM state word; writes nothing; calls no shell function (no new verb, no new push). The spare holds no chat content |
| Limits | Not a proof of paint (no frame is drawn while hidden; the spare re-rasters at present as every spare does). Not a proof for iOS (a WKWebView process can die alone after the answer) → Apple keeps the drop |

**Verdict: sound for Android** (fail closed: an unproven spare is never handed to a chat open; only the answer sets "proven";
timers only drop, L157). Built Android-only behind `SpixiFlags.SpareKeepShortSleep` (opt-in, dev mode). iPhone / Mac keep
the drop at sleep (owed to the Apple phase, with a `webViewWebContentProcessDidTerminate` handler — P-15 — as its precondition).

## 4 · What was built (switch ON, Android; switch OFF → `dropSpareChat("sleep")` exactly as before)

| Moment | Rule (`Spixi/Utils/SpareKeepRules.cs`) |
|---|---|
| Sleep | keep only a READY spare, no chat staging, app lock OFF and no lock up/staging (with the lock on, Android raises it at pause, `lockOnPause`, `App.xaml.cs:619–748`); else drop |
| Kept | UNPROVEN: a tap drops it (`chat warm drop why=sleep`) and opens cold (`attach spare=0 why=none`) |
| Return | limit first: 3 min (`LimitMs`), the larger of the monotonic and the wall clock, a clock that went back = over → drop; then the proof, posted after `OnResume`'s lock decisions (`spareKeepOnResume`, `SpixiContentPage.cs:2132`): the post is `_ = Task.Run(() => MainThread.BeginInvokeOnMainThread(() => startSpareKeepProof(op)))` (`:2168`), because `OnResume` is the main thread and `BeginInvokeOnMainThread` runs inline there (`Platforms/Android/MainActivity.cs:580–582`); the pool hop makes the post real (#46 r1 A-2). A lock up → drop |
| Proof | answer `complete` within `ProofDeadlineMs` (1000 ms) and no lock → PROVEN (a normal READY spare); else drop. The lock test that counts is the one at the answer (`finishSpareKeepProof`, `SpixiContentPage.cs:2232`); the test at proof start (`startSpareKeepProof`, `:2197`) is kept as well |
| Background | a best-effort 3 min timer drops a still-kept spare; it can only drop |
| Both switches ON | proven → no re-arm needed; every drop above uses `sleep`, so `SpareRearm` re-arms: at the return (limit) → `HomePage.onResume` takes it, warm at +1.8 s; after a failed proof → the 2 s tick asks a flush → +1.8 s (≈ 3–5 s after the return); both behind the idle gate |

**Residuals (not closed, #46 r1):** `dropKeptSpare` (`SpixiContentPage.cs:2276`) re-checks `spareChatOp == op` under the lock, then calls `dropSpareChat("sleep")`, which drops whatever is in the slot — a fresh spare warmed in that window would be dropped (and re-armed under P39); after `leaveDevMode` the stale `spareKeepOp` can keep a reference to one disposed page for the rest of the process. Both ways out of dev mode now turn the opt-in OFF in the running process (`SpixiFlags.leaveDevMode`, `SpixiFlags.cs:112`; `ixian:disableDevMode`, `HomePage.xaml.cs:1852`, call `:1866`; the account wipe, `SettingsPage.xaml.cs:1848`). On `ixian:disableDevMode` a kept spare goes with the `devmode` drop (`leaveDevMode()` runs just before it); on the account wipe the spare already went at the wipe's first step with the word `stop` (`IxianHandler.shutdown()` → `HomePage.stop()` → `dropSpareChat("stop")`), before `leaveDevMode()`.
