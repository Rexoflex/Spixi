# macfixa — mechanisms first (items 1, 3, 4, 5), written before each fix

Session `macfixa` (prompt: project doc `claude/session-macfixa-prompt.md`; contract `docs/contract-macfixa.md`). Line
numbers are of the base `ae7b8303`. "Shown" = reproduced in a harness here; "read" = from the source only.

## Item 1 — Mac: Back up now and Save on a photo cannot reach a folder (`n-20261015-mac-save`, LAUNCH BLOCKER) — read
- `Spixi/Platforms/MacCatalyst/SFileOperations.cs:35-55` `share()` builds two items (:37 `NSObject.FromObject(title)` +
  `NSUrl.FromFilename(filepath)`), presents a `UIActivityViewController` (:38, popover anchored to `vc.View` :48-51)
  without waiting (:53) and returns `Task.FromResult(true)` at once (:54).
- On Mac Catalyst that controller IS the macOS share menu: it has no save-to-folder destination ("Save to Files" is an
  iOS activity). The text item beside an image very likely hides the Photos extension (not proved on a Mac).
- Callers (unchanged by this batch): `BackupPage.xaml.cs:180` `shareBackup` (Mac branch :186-188 awaits `share` and
  returns `null`; `recordBackupIfSaved` then waits in `waitForAppleShareSheet` :269 while a `UIActivityViewController`
  is presented, then asks "Did you save the backup?") — the wallet file (:338) and `spixi.account.backup.ixi` (:417) ·
  `SingleChatPage.xaml.cs:8717` `onSavePhoto` (`_ = SFileOperations.share(path, name)`; the path is C#'s own
  `SharedItems.localPathOf`) · `HomePage.xaml.cs:1764` (the log zip).
- Fix: `share()` behind `MacfixaFlags.MacSaveToFolder` shows a native choice (Save File = the system save panel,
  `UIDocumentPickerViewController(forExporting:, asCopy: true)`; Add to Photos for photo types, add-only; Share File = the
  old menu, a photo as the URL alone; Cancel). The Task ends when the choice is finished: every presentation goes through
  `show()` (a 300 ms poll; two polls that find the controller not presented end the step — a refused presentation, a share
  menu closed without its handler; the save panel is not polled and ends only by its delegate). OFF = the base body. P121.

## Item 3 — Android: the first tap after a pin / mute swipe is lost (`n-20261015-swipe-first-tap-lost`) — shown in desktop Chromium
- `src/components/chats-swipe.js:144` calls `preventDefault()` on POINTERmove. That does not stop the browser's touch
  gesture; only `touch-action` or a cancelled `touchmove` does. The row content has `touch-action: pan-y`
  (`chats-swipe.css:51`) and no touch listener, so a fast sideways flick still makes a scroll gesture and, on release,
  a fling. Under pan-y the sideways part moves nothing (no scroll event, `scrollTop` unchanged, no pointercancel), but
  the fling is active, and Chromium uses the next tap to stop it: no click (its tap suppression after a fling cancel).
- Harness `scripts/pins-macfixa/c-swipe-touch.mjs` (built home shell, Android context 411 × 914, real CDP
  `Input.dispatchTouchEvent`, one tap on a chip / a nav tab / the FAB at 60, 250, 600 ms after the gesture): a diagonal
  flick that commits Pin loses the tap 6 / 9 (at 60 and 250 ms; clicks at 600 ms); a flick that settles open 6 / 9; the
  same path held still ~200 ms before the lift 0 / 9 (so it is the release speed, i.e. the fling); a tap alone 0 / 9.
  With the fix: 0 / 9 in every case.
- Ruled out: the synthetic `pointercancel` + `setPointerCapture` (:139-140; the held gesture uses them and clicks), the
  list re-render ~280 ms after release (the settle-open gesture re-renders nothing and still loses the tap), the press
  record of `message-menu.js:70-100` and `chats-row-menu.js:809-853` (they void only a contextmenu or a timer).
- Limit: desktop Chromium, not the Android WebView (its slop and fling curve differ; the walk decides).
- Fix: with the cap `swipeTouchLock` (switch `MacfixaFlags.SwipeTouchLock`), a `{ passive: false }` touchmove listener
  on the row content cancels the touchmoves of a drag that is locked sideways. No cap = no listener (today's code).

## Item 4 — Mac: the rail marks Account at start while Chats shows, and does not follow the tab (`n-20261015-mac-rail-start`) — shown in jsdom
- `settings.html:323-334` `markPaneOpen` writes localStorage `spixi.pane.account = '1'` while the Account pane is up;
  it is cleared by `exitSettings` (:850), `pagehide` (:334) and home's `onSettingsClosed` (home.html :4147).
- A quit (Cmd+Q, the window closed) or a crash with the pane open runs none of them reliably, so the flag is stranded.
  localStorage persists on both desktops (WKWebView default data store; the WebView2 user data folder).
- Next start: `activeNav = 'chats'` (home.html :1524), `paneSeen = false` (:1658, a new sessionStorage); `signalReady`
  → `syncAccountRail()` (:5181) → `accountPaneOpen()` true (:1622) → the rail lights Account. C#'s echo
  `selectTab(currentTab)` (`HomePage.xaml.cs:2914` → home.html :4525 → `syncAccountRail()` :4539) lights it again. A
  Wallet tap lights Wallet, but every later `selectTab` echo (a theme flip, a re-bake) re-lights Account over it, until a
  pane is opened and closed once — the walk's "Wallet with Account lit".
- Shown on the built base shell (jsdom, Mac / Windows / phone markers, the stranded flag): boot → `account`; Wallet tap
  → `wallet`; the echo → `account`; a reload of the same WebView → `account`.
- Fix (home.html, 5 lines, no switch): the first home document of a WebView (a new process; marked in sessionStorage
  `spixi.home.booted`) clears a pane flag that it did not see open. A re-bake keeps sessionStorage, so #589 holds.

## Item 5 — Mac: the "Your Ixian address" card looks cut (`n-20261015-mac-address-card-fit`) — shown in Chromium
- On desktop Account's card is 522 px, plus a 16 px gap and the 36 px safety line = 574 px. The shared centred cap
  `max(76%, min(100% − 48px, 608px))` (overlay.css:264-266) is 608 px in windows about 656–800 px tall and 76 % above
  (under 574 + 86 px up to about 870 px); the dialog's padding and title take 86 px, so at 656–800 px the scroll region
  gets exactly 522 px: the fold falls on the card's bottom edge, and the safety line sits below it. The region scrolls (52 px), but nothing shows it: a Mac (WebKit) scroller
  shows no bar until it moves, and the card looks complete.
- "Share" is not cut: desktop has no Share on this card by design (W9: `settings.html:1261`, `:1287`, `home.html:3129`
  pass `onShare: isDesktop ? undefined : …`). The walk text that promises Share on the Mac is wrong (walk sheet note).
- Fix (CSS, desktop only, no switch): this dialog may use the window minus 16 px on each side, and the QR shrinks with
  the window height (never under the 185 px scan floor, #509, by these rules; below about 463 px the base `40dvh` term
  takes it lower, as before) before the foot leaves the dialog. Phone unchanged (every rect within
  0.5 px).
