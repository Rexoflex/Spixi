# P07 · WEBVIEW · WebView configuration, navigation policy and the base verb dispatch

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | no | yes | shipped (Mac: shipped, not walked) · MAJOR #9 Android fixed (#1322) | 7 min |

**Look here first:** `Spixi/Platforms/iOS/iOSWebViewHandler.cs:393` — `captureRefusal`: the one test between ANY WebView (mini-app included) and a SILENT camera grant on iOS/Mac; it fails closed on an unknown host (#805).

**DECISIONS:** #291 · #293 · #309 · #312 · #331 · #334 · #608 · #753 · #760 · #766 · #791 · #798 · #805 · #806 · #1028 · #1074 · #1245 · #1247 · #1313 · #1322 · #1325

## What changed and why
- iOS handler (+712 lines): delegates are strong-rooted, so the http/https block cannot be GC'd away (#309); the UIDelegate is re-asserted on every navigation (#312).
- iOS/Mac privileges now key on `ClassId="miniapp"`: Safari handoff only for a trusted host, main frame, real link tap; camera only for the scan shell; mini-app gets an in-memory data store; content rules anchored (#805, #806).
- MacCatalyst now compiles and registers the same iOS handler (#1245). Not walked on a Mac.
- Android: DOM storage ON for our shells, OFF for the mini-app (#331, #334); console forward is dev-only and skips the mini-app (#753); WebView debugging is `#if DEBUG` only (#334).
- Session 16 (MAJOR #9, Android only, #1313 / #1322): `OnPermissionRequest` no longer grants everything. VIDEO only, only for the WebView marked `ClassId="scan"` in XAML (ScanPage) AND identical to the object ScanPage registered in its constructor (`ScanPage.isScanWebView`, #46 r4: no marker spelling can forge it), never an http(s) origin; else Deny (a throw denies). The marker, not the document: every Android shell loads through `LoadDataWithBaseURL`, so `WebView.Url` is `about:blank`. ScanPage refuses every `file:` navigation on Android (the grant follows the WebView).
- Base dispatch `onNavigatingGlobal` gained `painted`, `cdping`, `copytext`, `haptic`; each refuses a mini-app (`hasGeneratedContent` false) (#766, #798, #791, #1028, #1247).

## Files (verified at the S16 tree)
- `Spixi/Platforms/iOS/iOSWebViewHandler.cs:146` — handoff only if trusted host + main frame + LinkActivated, through `Utils.openExternal`; `:169` http/https always Cancel (#805).
- `Spixi/Platforms/iOS/iOSWebViewHandler.cs:389` — `captureRefusal` (trusted host, camera type, main frame, local origin, scan document); grant at `:362` (#293, #805).
- `Spixi/Platforms/iOS/iOSWebViewHandler.cs:470` — strong delegate roots, released in `DisconnectHandler` (#309); `:499` `isTrustedHost` (fail closed) (#805).
- `Spixi/Platforms/iOS/iOSWebViewHandler.cs:723` — mini-app `NonPersistentDataStore` set before construction; `:624` anchored rules (#805).
- `Spixi/MauiProgram.cs:54` + `Spixi/Spixi.csproj:597` — the iOS handler on MacCatalyst (#1245).
- `Spixi/Platforms/Android/WebViewRenderer.cs:59` — `OnPermissionRequest` → `S16SecRules.captureRefusal` (`:69`; `Spixi/Utils/S16SecRules.cs:98`); the one Grant, VIDEO only (`:79`); Deny + fixed-word warn (`:82`). `Spixi/Pages/Scan/ScanPage.xaml:15` the only `ClassId="scan"`; `Spixi/Pages/Scan/ScanPage.xaml.cs:73` Android refuses `file:`.
- `Spixi/Platforms/Android/WebViewRenderer.cs:515` — `DomStorageEnabled = ClassId != "miniapp"` (#334). `:162` `IsAllowedURL` and `:484` `AllowFileAccessFromFileURLs` are legacy (MAJOR #8).
- `Spixi/Utils/SpixiContentPage.cs:6433` — `onNavigatingGlobal`; `:6840` keyboard-inset allow-list `chat/index/intro/call.html`, exact `Array.IndexOf` (#608, #1074).
- `Spixi/Platforms/Android/MainActivity.cs:436` and `iOSWebViewHandler.cs:580` — debugging / `Inspectable` inside `#if DEBUG` (Android #334, iOS #291).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:painted` | none | any page that calls `onNavigatingGlobal` (17 pages, incl. MiniAppPage → refused; SingleChatPage only with a conversation) | `SpixiContentPage.cs:6445` (gate `:6455`) | ours (#760, #766) |
| `ixian:cdping:` | `<digits ≤16>` → push `cdpong` | same | `:6460` (gate `:6477`) | ours, temporary (#791) |
| `ixian:copytext:` | dispatch only — meaning in CHATMSG | same | `:6482` (gate `:6511`) | ours (#1028) |
| `ixian:haptic:` | dispatch only — meaning in CHATMSG | same | `:6554` (gate `:6566`) | ours (#1247) |
| raw `window.__setKbInset(n)` | `<int>` | C# → `chat`/`index`/`intro`/`call.html` on iOS | `SpixiContentPage.cs:6877` | ours (#608) |

## Threat → rule → proof
| A hostile … could try… | What stops it | Proof |
|---|---|---|
| mini-app: silent camera/mic on iOS/Mac | `iOSWebViewHandler.cs:393` | smoke "★★ gate 9: the REFUSAL runs first…" |
| mini-app: open any URL in Safari on one tap | `iOSWebViewHandler.cs:146` | smoke "★★ gate 7: every external-open hand-off…" |
| mini-app: read the shells' `spixi.*` keys (drafts, addresses) | iOS/Mac `:723`; Android `WebViewRenderer.cs:515`; Windows nothing (O-03) | smoke "★★ gate 12: the mini-app store is NON-PERSISTENT"; Android/Windows: walk only |
| remote page loading inside a shell after the delegate is collected | `iOSWebViewHandler.cs:470` | smoke "#309 ★: the WKWebView delegates are STRONG-ROOTED…" |
| mini-app: raise our global verbs (copy, haptic, paint, ping) | `SpixiContentPage.cs:6455`, `:6477`, `:6511`, `:6566` | smoke "★★ #1028 security gate…", "★★ Session O ⑤…"; `pins-s9/a3-wiring.mjs` D-04 |
| mini-app or chat: camera / mic on Android | `WebViewRenderer.cs:59` (marker "scan" + the ScanPage identity + exactly [VIDEO] + not http(s)) | csh `S16SecTests.capture_grants_video_to_the_scan_page_marker_only` · `capture_refusals_name_the_reason`; pin `scripts/pins-s16/a-sec.mjs` MAJOR #9 (no other XAML `ClassId` token than "miniapp" + "scan"; no C# ClassId assignment; `scanReg`: one identity registration in ScanPage's ctor, the field named nowhere else) |
| peer GIF URL that only CONTAINS an allowed host (iOS) | `iOSWebViewHandler.cs:624` | smoke "★★ gate 1 THE CONTRACT, EXECUTED…" |

## Given up / left open
- Legacy, unchanged (`legacy-not-ours.md`): MAJOR #8 Android file access (ours since #1313; rides the https-origin lever, P17) · D24 arbitrary loads on Apple · O-03 Windows mini-app storage shared · Windows `AreDevToolsEnabled` in every build.
- MAJOR #9 recorded: iOS `isScanDocument` (`iOSWebViewHandler.cs:434`) tests the leaf name only (`scan.html`). Outside Damir's Android-only dial (#1313). Open: can a chat WKWebView navigate to a peer download named `scan.html` (its read-access scope)? Not proven reachable. The Android `capture DENIED` warn is not rate-limited.
- Windows reads the `miniapp` marker nowhere: no partition, no camera or handoff split (O-02, O-03).
- Mac got the iOS handler with no Mac walk (#1245); the zoom pin still applies to mini-apps (presentation only, #805).

## Question for BE
Is the C# `ClassId` marker (`"miniapp"` untrusted, `"scan"` camera) the trust contract that all four platforms must honour (Windows reads neither; iOS still names the scan document)?
