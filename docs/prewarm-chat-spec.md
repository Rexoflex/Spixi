# THE PRE-WARMED BLANK CHAT WEBVIEW — design + work order (#780; Session N, 2026-09-05)

**Status: DESIGNED, NOT BUILT.** Session N built Goal 1 (the legacy purge) and Goal 2's
investigations, the strip fork and its two gates. The pre-warm is Tier 3 in Damir's own
risk ranking (#782: *"C# lifecycle + a race + it can move jank onto the chats list"*) and
the container cannot compile C# or measure chats-list frame drops — the one thing #780 says
must be measured before and after. So this file is the build, minus the typing: every site,
the state machine, the failure modes, the pins, and the measurement plan. Building it is
one session with the phone in the room.

⛔ The RETAINED warm WebView (#779) stays parked with the lead. This is NOT that: the spare
has never held a conversation, is used once, and is destroyed after use exactly as today.

## 0 · What it buys, from the walk-M numbers (#788, 8 opens)

```
77 ms  WebView creation      ← moves off the critical path
99 ms  document parse        ← moves off the critical path (the [CDPERF] parse split says which file)
~20 ms push + drain          ← stays
~88 ms render → painted      ← stays
 6 ms  painted → present     ← stays
```
Median 292 ms → ~115 ms when the spare is ready at tap time. Deterministic: the work is
done EARLIER, not made smaller — so the win does not depend on the byte-count arithmetic
the perf brief distrusts (perf-chat-open-brief §4). Re-measure with the same stamps.

## 1 · The mechanism the code already has

`SpixiContentPage` already parks a hidden, booted WebView and re-presents it instantly:
`parkOnClose` / `parkOnLoad` (#315 / #546 C3, the warm Account) and
`representParkedOverlay`. The pre-warm is that mechanism with two differences:

1. the parked page is BLANK — `SingleChatPage` built with **no friend**, its shell parsed,
   its `ixian:onload` received but its `onLoad()` body **deferred**;
2. on tap the conversation is ATTACHED (friend set, `onLoad()` run, present armed) and the
   page is re-presented through the existing overlay path with tag `"chat"`; on close it
   is DISPOSED like every chat today, never re-parked.

## 2 · State machine

```
(none) ──warm()──▶ WARMING ──ixian:onload──▶ READY ──attach(friend)──▶ IN USE ──close──▶ disposed
   ▲                  │                        │                                       │
   │         drop()◀──── Node.onLowMemory · theme/language flip · delete account ◀────┘
   └──────────── after close settles (idle) · once at app start ─────────────────────────
```
- `warm()` — only when no spare exists, no chat is open, and the home shell is live.
  Trigger A: after the chat overlay's close completes (`closeOverlay` for tag `"chat"`),
  posted to the main thread AFTER the close animation (`Task.Delay(350)` then
  `BeginInvokeOnMainThread`) — "idle after the close settles", not synchronously on close.
  Trigger B: once at app start, after the home shell's first flush (`clearChatsDone`).
- `attach(friend, home)` — only from `HomePage.onChat` (the one `new SingleChatPage` site,
  HomePage.xaml.cs `pushPageLoaded(new SingleChatPage(friend, …), 4000, "chat", …)`), and
  only when the spare is READY. Otherwise the tap takes today's path unchanged and the
  spare is dropped (never two chat WebViews for one tap).
- `drop()` — dispose the spare's WebView. Called from `Node.onLowMemory()`, which `MauiProgram`'s `OnApplicationTrimMemory` / `OnApplicationLowMemory` handlers call (the
  spare costs nothing to drop but the speed-up — #778's argument in reverse), on every
  theme or language flip (a parked document is one theme behind: the #315 lesson), on
  delete-account, and whenever `HomePage.stop()` runs.

## 3 · The sites (searchable anchors, not line numbers)

| Where | Change |
|---|---|
| `SingleChatPage` ctor | a new `SingleChatPage(HomePage? home)` "blank" ctor: `InitializeComponent`, `webView.Opacity = 0`, `deferPreloadReady = true`, `loadPage(webView, "chat.html")`, **no friend, no Title, no fetchFriendsPresence** |
| `SingleChatPage.onNavigating` `ixian:onload` branch | `if (friend == null) { shellBooted = true; return; }` — the shell's own 500 ms fallback then renders an EMPTY log off-screen (harmless: staged at opacity 0, never presented) |
| `SingleChatPage.attach(Friend fr, HomePage? home)` | sets `friend`, `Title`, `selectedChannel`, `homePage`; `fetchFriendsPresence`; restarts `openClock`; runs `onLoad()` (the same pushes a fresh page gets: `onChatScreenReady` → `setChatMode` → history burst → `onChatScreenLoaded`); the shell handles a late first `onChatScreenReady` because it already handles re-entry and channel switches (per-peer reset in `onChatScreenReady`) |
| `SpixiContentPage` | `pushParkedPage(target, tag, column, navKey, revealDelayMs: 0)` — the `representParkedOverlay` path generalised to a page in the SPARE slot: build the `PreloadOp` (which hands the page its paint gate), skip the load wait, present on `ixian:painted` / the 400 ms backstop (`armPresentOnPainted` unchanged) |
| `HomePage.onChat` | `var spare = SingleChatPage.takeSpare(); if (spare != null) { spare.attach(friend, wide ? this : null); pushParkedPage(spare, "chat", …); } else { today's pushPageLoaded(new SingleChatPage(…)) }` |
| `HomePage` close path (`closeOverlay` completion, tag `"chat"`) | schedule `warm()` on idle |
| `HomePage` after the first `clearChatsDone` | `warm()` once |
| `Node.onLowMemory()` (reached from `MauiProgram`'s `OnApplicationTrimMemory` / `OnApplicationLowMemory`), `SettingsPage` theme + language flips, `onDeleteAccount`, `HomePage.stop()` | `SingleChatPage.dropSpare()` |
| `Utils.getChatPages()` / `UIHelpers.getLiveShellPages()` | the spare must be in NEITHER: a `reloadScreen()` / `clearMessages` sweep at a page with `friend == null` is an NRE, and a theme push at it is wasted (it is dropped on flips instead). The park slot is already in no collection (#315) — keep the spare in the same kind of slot |

## 4 · What can go wrong, and the answer to each

| Hazard | Answer |
|---|---|
| **Jank moves onto the chats list** (#780's one warning) | warm on IDLE after the close animation, never synchronously; **measure** with a chats-list frame probe (the `CdperfFrameProbe` that exists for the chat present, started at `warm()` for 600 ms) before/after; if the drop count rises, delay the warm further or gate it on the list being idle (no scroll for 300 ms) |
| Tap lands while WARMING | fallback to today's path; drop the spare (two chat WebViews at once is the #221-adjacent thing to avoid — one conversation surface, always) |
| A push reaches the spare before attach | structurally impossible if the spare is in no enumerator (§3 last row) — **pin it** |
| Spare one theme/language behind | dropped on every flip (#315); the next warm builds it fresh |
| Memory | one extra WebView (~15–25 MB) while idle on the chats list; dropped on `Node.onLowMemory()`; Damir already ruled that class acceptable for the Account (#778) |
| `[CDPERF]` clocks | `openClock` restarts at `attach`, so `tap → ctor` becomes `tap → attach` and `onload` is not stamped (already happened); add `[CDPERF] chat attach spare=1` so a capture says which path an open took |
| Blind-group safety (#777's sharpest case) | not applicable — the spare has never rendered any sender; `mode.blind` is set by the FIRST `setChatMode` it ever receives |

## 5 · Pins (all with mutations)

1. the blank ctor never calls `fetchFriendsPresence` and never reads `friend` (stripCode)
2. `ixian:onload` with `friend == null` returns before `onLoad()` (order pinned)
3. `attach` runs `onLoad()` exactly once and only after `shellBooted`
4. the spare is in no enumerator: `Utils.getChatPages`/`UIHelpers.getLiveShellPages` skip `friend == null`
5. `dropSpare()` is called from every site in §3's last-but-one row
6. `HomePage.onChat` falls back to `new SingleChatPage(friend, …)` when `takeSpare()` is null — the pre-warm can never be the ONLY way to open a chat
7. a used chat is never re-parked: the `"chat"` overlay op never has `parkOnClose`

## 6 · Measurement plan (the phone)

1. Capture 8 opens with the current stamps (baseline = walk M: median 292).
2. Build; capture 8 opens where the spare was READY (`attach spare=1`) and 3 where it was
   not (the fallback must read exactly like today).
3. Chats-list frame probe for the 600 ms after every chat close, before and after.
4. Verdict: median open with spare · frame drops on the list · memory at rest.

_(Written in Session N; the build is the next perf-session item once the `[CDPERF] parse`
line has been captured, because that capture is also the pre-warm's own before-number.)_
