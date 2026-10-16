# P37 · WINDOWS MINI-APP MARKER · The Windows WebView handler honours ClassId="miniapp" (Session Safety O-02)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| MEDIUM (third-party mini-app code on Windows had DevTools, every WebView2 permission prompt, `window.open` and silent downloads, like a trusted shell; the marker was read on Android and iOS / Mac only) | no | no verb, push, `spixi.*` key or log line; WebView2 privilege DROPS on the mini-app WebView only; 1 pref; dev: 1 switch name on `ixian:devflash:` | built behind flag `SpixiFlags.WinAppMarker` (default ON) · ⚠ UNCOMPILED for MAUI until the Safety build (Windows F5) | 3 min |

**Look here first:** `Spixi/Platforms/Windows/WindowsWebViewHandler.cs:54` `dropMiniAppPrivileges` (called at `:24` when the `CoreWebView2` exists) and `Spixi/Utils/SpixiContentPage.cs:526-528` (DevTools stay off for the marked WebView on every navigation).

**DECISIONS:** #1312 · #1465 (the dials) · **#1469 (this change)** · #1470 (#46, S-7) (Session Safety; Safety Dials q4 = A, Damir 2026-10-16: build O-02; PARK C-12 and D24). Gate row O-02 (`docs/security-handover-gate.md`, "The rows — INTRODUCED, and OPEN": the marker is ours; Windows read it nowhere). Mechanism: `docs/safety-mechanisms.md` row S-8.

## What changed and why
- **The marker.** `MiniAppPage.xaml:14` sets `ClassId="miniapp"` on the mini-app WebView — the untrusted-content marker (#334). Android (`WebViewRenderer`) and iOS / Mac (`iOSWebViewHandler`) key privilege drops on it; the Windows handler (`MauiProgram.cs:58`, registered for every `WebView`) read it nowhere.
- **Flag ON + the marker → DROPS only** (`WindowsWebViewHandler.cs:54-73`): `AreDevToolsEnabled = false` · `AreHostObjectsAllowed = false` · `PermissionRequested` → `State = Deny` (mic, camera, clipboard, location; no prompt, `:82-85`) · `NewWindowRequested` → `Handled = true` with no window (`:88-91`) · `DownloadStarting` → `Cancel = true` (#46 r1 R2 MINOR-5: Android / iOS parity, no silent file in the user's Downloads, `:76-79`). Nothing is granted or set true. Handlers are detached before they are attached (no double subscription).
- **The marker is read off the VIRTUAL view** (`VirtualView as WebView`, `ClassId` — a MAUI property set by XAML in `InitializeComponent`, before the handler exists), at the moment the `CoreWebView2` exists (`:27-38`). No virtual view → no drop: today's behaviour, so this can only remove an exposure. The literal lives in `SafetyRules.MiniAppMarker` (`SafetyRules.cs:265`) + the XAML.
- **SpixiContentPage does not turn DevTools back on.** `webViewNavigating` (`SpixiContentPage.cs:484`) sets the DevTools switch on EVERY navigation of every page's WebView (MiniAppPage subscribes it too); it now sets `AreDevToolsEnabled = !winMiniApp` (`:526-528`) — flag ON + the marker (the sender's or the page's WebView) keeps it OFF; every shell and flag OFF = `true` as before. It is the only assignment in the file (pinned).
- **NOT dropped, on purpose: scripts and `IsWebMessageEnabled`.** The mini-app bridge is `location.href = "ixian:…"` (MiniAppPage `onNavigating`, the MAUI Navigating event) one way and `EvaluateJavaScriptAsync` (→ `ExecuteScriptAsync`) the other; it uses neither host objects nor web messages, and scripts off would end every mini app.
- **Flag.** Int pref `flagWinAppMarker` (`SpixiFlags.cs:28`, `:84`, `:140`), absent = ON, a stored 0 acts only in dev mode; in the `[FLAGS] … winappmarker=…` line. OFF = the mini app is treated like every other WebView (today). Dev switch `ixian:devflash:winappmarker:<0|1>`.

## ⚠ C-12 is still OPEN (parked)
O-02 drops privileges; it does **not** partition storage. On Windows every `file://` document (shells and mini apps) still shares ONE WebView2 storage partition, so mini-app JS may read the shells' `spixi.*` localStorage keys (drafts) — MAJOR #4's Windows leg. The fix is a separate `CoreWebView2Environment` / profile for the `miniapp` WebView, created before MAUI's `EnsureCoreWebView2Async` → a custom `CreatePlatformView` = size M. **Parked by Damir (q4 = A), not built.** D24 (`NSAllowsArbitraryLoads` on iOS / Mac) is parked too (needs an iPhone + Mac walk).

## Files
- `Spixi/Platforms/Windows/WindowsWebViewHandler.cs:24` the call · `:41-53` the why · `:54` `dropMiniAppPrivileges` · `:76` download · `:82` permission · `:88` new window.
- `Spixi/Utils/SpixiContentPage.cs:484` `webViewNavigating` · `:523-528` DevTools for the marked WebView.
- `Spixi/Utils/SafetyRules.cs:265` `MiniAppMarker` · `:267` `isMiniAppMarker`.
- `Spixi/Utils/SpixiFlags.cs:28` · `:84` · `:110` · `:140`.
- Pin `scripts/pins-safety/d-lock-win.mjs` (O-02: o2gate · o2drops · o2scp); csh `SafetyRulesTests.dialog_name_and_confirm_line` (`isMiniAppMarker`: exact, case-sensitive).

## Bridge surface
| Verb / push / sink | Args (shape) | Who can send it | Handler | Ours / reshaped |
|---|---|---|---|---|
| WebView2 settings of the mini-app WebView (Windows) | `AreDevToolsEnabled` false · `AreHostObjectsAllowed` false | C# only | `dropMiniAppPrivileges` · `webViewNavigating` | reshaped (drops) |
| WebView2 events `PermissionRequested` · `NewWindowRequested` · `DownloadStarting` | Deny · Handled · Cancel | raised by mini-app content | `MiniApp_PermissionRequested` · `MiniApp_NewWindowRequested` · `MiniApp_DownloadStarting` | ours (drops) |
| `ixian:devflash:winappmarker:<0\|1>` · push `setFlagsDevSafety` | one digit · six digits | dev.html → DevPage (dev mode only) | `DevPage.xaml.cs:141` · `:410` | ours (dev surface) |

## Threat → rule → proof
| A mini app on Windows could try… | What stops it | Proof |
|---|---|---|
| open DevTools / be inspected as a shell | DevTools off at creation and on every navigation | pin `d-lock-win` (o2drops devtools, o2scp) |
| get the mic, camera, clipboard or location through a WebView2 prompt | `PermissionRequested` → Deny | pin `d-lock-win` (o2drops permission) |
| open a window (`window.open`, `target=_blank`) | `NewWindowRequested` → Handled, no window | pin `d-lock-win` (o2drops newWindow) |
| save a file silently | `DownloadStarting` → Cancel | pin `d-lock-win` (o2drops download) |
| reach a host object | `AreHostObjectsAllowed = false` (none is added anyway) | pin `d-lock-win` (o2drops hostObjects, bridgeKept) |
| a shell loses DevTools / the flag changes shells | only the marked WebView; nothing set true or Allow | pin `d-lock-win` (o2gate, dropsOnly) |
| read the shells' localStorage | **not stopped — C-12 open (parked)** | — |

## Recorded / left open
- **C-12 OPEN (parked, size M):** no storage partition for the Windows mini app (above).
- The shells keep `AreDevToolsEnabled = true` on Windows (inherited, `SpixiContentPage.cs:528` for every non-marked WebView) — legacy, unchanged.
- Walk (Windows F5): open a public mini app; it loads and talks to C#; F12 does nothing; a camera / mic request is denied with no prompt; `window.open` opens nothing; a download link saves nothing.

## How to switch it off
Developer mode on → Developer › Release flags → "Windows mini app: no DevTools, no permissions (Safety O-02)" off → restart.

## Question for BE
Is the C-12 partition (a separate WebView2 environment / profile for the mini app, size M) a v1.1 item for you, or a launch blocker (v1.1 / blocker)?
