# P07 · WEBVIEW · WebView configuration, navigation policy and the base verb dispatch

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | no | yes | shipped (Mac: shipped, not walked) | 7 min |

**Look here first:** `Spixi/Platforms/iOS/iOSWebViewHandler.cs:393` — `captureRefusal`: the one test between ANY WebView (mini-app included) and a SILENT camera grant on iOS/Mac; it fails closed on an unknown host (#805).

**DECISIONS:** #291 · #293 · #309 · #312 · #331 · #334 · #608 · #753 · #760 · #766 · #791 · #798 · #805 · #806 · #1028 · #1074 · #1245 · #1247

## What changed and why
- iOS handler (+712 lines): delegates are strong-rooted, so the http/https block cannot be GC'd away (#309); the UIDelegate is re-asserted on every navigation (#312).
- iOS/Mac privileges now key on `ClassId="miniapp"`: Safari handoff only for a trusted host, main frame, real link tap; camera only for the scan shell; mini-app gets an in-memory data store; content rules anchored (#805, #806).
- MacCatalyst now compiles and registers the same iOS handler (#1245). Not walked on a Mac.
- Android: DOM storage ON for our shells, OFF for the mini-app (#331, #334); console forward is dev-only and skips the mini-app (#753); WebView debugging is `#if DEBUG` only (#334).
- Base dispatch `onNavigatingGlobal` gained `painted`, `cdping`, `copytext`, `haptic`; each refuses a mini-app (`hasGeneratedContent` false) (#766, #798, #791, #1028, #1247).

## Files (verified at 387ca78b)
- `Spixi/Platforms/iOS/iOSWebViewHandler.cs:146` — handoff only if trusted host + main frame + LinkActivated, through `Utils.openExternal`; `:169` http/https always Cancel (#805).
- `Spixi/Platforms/iOS/iOSWebViewHandler.cs:389` — `captureRefusal` (trusted host, camera type, main frame, local origin, scan document); grant at `:362` (#293, #805).
- `Spixi/Platforms/iOS/iOSWebViewHandler.cs:470` — strong delegate roots, released in `DisconnectHandler` (#309); `:499` `isTrustedHost` (fail closed) (#805).
- `Spixi/Platforms/iOS/iOSWebViewHandler.cs:723` — mini-app `NonPersistentDataStore` set before construction; `:624` anchored rules (#805).
- `Spixi/MauiProgram.cs:54` + `Spixi/Spixi.csproj:597` — the iOS handler on MacCatalyst (#1245).
- `Spixi/Platforms/Android/WebViewRenderer.cs:482` — `DomStorageEnabled = ClassId != "miniapp"` (#334). `:55` grant-all and `:129` `IsAllowedURL` are byte-identical to 0e85a4b8 (legacy).
- `Spixi/Utils/SpixiContentPage.cs:6280` — `onNavigatingGlobal`; `:6687` keyboard-inset allow-list `chat/index/intro/call.html`, exact `Array.IndexOf` (#608, #1074).
- `Spixi/Platforms/Android/MainActivity.cs:436` and `iOSWebViewHandler.cs:580` — debugging / `Inspectable` inside `#if DEBUG` (Android #334, iOS #291).

## Bridge surface
| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:painted` | none | any page that calls `onNavigatingGlobal` (17 pages, incl. MiniAppPage → refused; SingleChatPage only with a conversation) | `SpixiContentPage.cs:6292` (gate `:6302`) | ours (#760, #766) |
| `ixian:cdping:` | `<digits ≤16>` → push `cdpong` | same | `:6307` (gate `:6324`) | ours, temporary (#791) |
| `ixian:copytext:` | dispatch only — meaning in CHATMSG | same | `:6329` (gate `:6358`) | ours (#1028) |
| `ixian:haptic:` | dispatch only — meaning in CHATMSG | same | `:6401` (gate `:6413`) | ours (#1247) |
| raw `window.__setKbInset(n)` | `<int>` | C# → `chat`/`index`/`intro`/`call.html` on iOS | `SpixiContentPage.cs:6724` | ours (#608) |

## Threat → rule → proof
| A hostile … could try… | What stops it | Proof |
|---|---|---|
| mini-app: silent camera/mic on iOS/Mac | `iOSWebViewHandler.cs:393` | smoke "★★ gate 9: the REFUSAL runs first…" |
| mini-app: open any URL in Safari on one tap | `iOSWebViewHandler.cs:146` | smoke "★★ gate 7: every external-open hand-off…" |
| mini-app: read the shells' `spixi.*` keys (drafts, addresses) | iOS/Mac `:723`; Android `WebViewRenderer.cs:482`; Windows nothing (O-03) | smoke "★★ gate 12: the mini-app store is NON-PERSISTENT"; Android/Windows: walk only |
| remote page loading inside a shell after the delegate is collected | `iOSWebViewHandler.cs:470` | smoke "#309 ★: the WKWebView delegates are STRONG-ROOTED…" |
| mini-app: raise our global verbs (copy, haptic, paint, ping) | `SpixiContentPage.cs:6302`, `:6324`, `:6358`, `:6413` | smoke "★★ #1028 security gate…", "★★ Session O ⑤…"; `pins-s9/a3-wiring.mjs` D-04 |
| peer GIF URL that only CONTAINS an allowed host (iOS) | `iOSWebViewHandler.cs:624` | smoke "★★ gate 1 THE CONTRACT, EXECUTED…" |

## Given up / left open
- Legacy, unchanged (`legacy-not-ours.md`; MAJOR #8 and #9 are ours to fix since #1313, not yet built): MAJOR #8 Android file access · MAJOR #9 Android grants mic + camera · D24 arbitrary loads on Apple · O-03 Windows mini-app storage shared · Windows `AreDevToolsEnabled` in every build.
- Windows reads the `miniapp` marker nowhere: no partition, no camera or handoff split (O-02, O-03).
- Mac got the iOS handler with no Mac walk (#1245); the zoom pin still applies to mini-apps (presentation only, #805).

## Question for BE
Is `ClassId="miniapp"` the trust contract that all four platforms must honour (Windows and Android permissions do not yet)?
