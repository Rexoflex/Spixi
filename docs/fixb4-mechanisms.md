# Fix batch 4 (`fixb4`) — the mechanisms, written before any fix (#294)

Tree: `work/fixb4` from `redesign/frontend` @ `338d30f4` ("Merge pull request #18 from Rexoflex/work/defaultsb").
Scope: Damir's rulings #1747 (1), #1748 (3), #1750 (rows P1, A9) and the walk of 2026-11-22 (WALK #1829). Method:
reading the source and `git log -S` (two read-only Opus agents and the lead), then renders and harness runs where a
section says so. Every `file:line` is in this tree. Pixel numbers marked "estimate" come from the CSS; the measured
numbers are in § 8 (filled after the renders).

## 1 · Welcome slide 4 (`n-20261115-split-ships-slide4`, #1747 (1))
- The text lives in ONE string key, `slide4Copy2`: the fallback in `src/components/launch-shell.js:670` ("Mini apps like
  Blitz Chess and Split open right in your chats.") and the 14 locale dictionaries `src/strings/<code>.json|.js`
  (built by `scripts/build-locales.mjs` from the legacy reuse, then the drafts `src/strings/draft/<code>.json`). Every
  locale names Split. No C# language file holds the slide.
- The fix is a text change only: the ruling's sentence "Mini apps like Blitz Chess open right in your chats." and its
  translations, so that no locale names Split (or any other app that does not ship in v0.9.30).

## 2 · The protect-account step under the keyboard (`n-20261113-protect-account-keyboard`, #1748 (3))
- **Keyboard model on Android: the layout viewport RESIZES.** `Spixi/Platforms/Android/MainActivity.cs:61`
  (`WindowSoftInputMode = SoftInput.AdjustResize`), `Spixi/App.xaml:7` (`WindowSoftInputModeAdjust="Resize"`); the
  window is edge-to-edge (`MainActivity.cs:466`) and the app pads the root view by (keyboard − nav bar)
  (`MainActivity.cs:954-955`). Device proof: `docs/android-findings.md:41` (innerHeight 774 → 451, the visual viewport
  tracks 1 : 1, delta 0).
- **The layout:** `src/shells/launch.html:91-94` (html / body `height: 100%`, a flex column) → the step
  (`launch-form.css:104`, `flex: 1; min-height: 0`) → `.c-launch__body` is the ONLY scroller
  (`launch-shell.css:354-365`); the hero of about 206 px (photo 104 + title + a 2-line subline; estimate) is INSIDE it,
  above the fields (`launch-shell.js:1301`, `body2.append(hero2, fields2)`), so the hero scrolls with them → the
  footer with the button is `flex: none` outside the scroller (`launch-shell.css:366-388`). On Android the footer and
  its button already sit just above the keyboard.
- **Why the field goes under:** the shell's only reveal of the focused field, in `launchKeyboardInset`
  (`launch.html:506-557`), runs only when the keyboard inset is above 60 px (`:515`, `:532-533`) — the iOS model,
  where only the VISUAL viewport shrinks. On Android the delta is 0, so the reveal never runs. Two ways in:
  (A) the keyboard is already up from the nickname and Continue moves the focus (`launch-shell.js:1398`,
  `focus({ preventScroll: true })`, commit `3271eaf0`) — no resize, or (a tap on the Continue button moves the focus
  to the button and usually hides the keyboard) a hide-then-show pair of resizes; (B) the keyboard opens on the tap — the
  body shrinks and nothing scrolls the field back into it.
- **Fix (shell only):** on the resize model (Android), the same triggers that exist (`focusin`, the visual-viewport
  events, the re-checks) also call a reveal that writes ONLY `.c-launch__body.scrollTop` so that the focused field box is
  inside the body. No `scrollIntoView` (no ancestor can move); iOS, Mac and Windows behave as before (the
  same code runs there and returns at once). Round 1 added: the box is grown by the 4 px focus ring; checkboxes and
  radios are not fields. (A hand-scroll stop added in round 1 was REMOVED in round 2: it could block the reveal when the
  keyboard reopened on the same focused field; a re-check timer may pull the body back once within 1.4 s — accepted.)

## 3 · P1 "Load pictures and GIFs" Off for a new or restored account (`n-20261118-default-media-autoload-off`, #1750)
- **The key:** `spixi.media.autoload` in the ONE WebView store that every shell shares (`src/shells/launch.html`
  `wipeLocalState` comment). Readers: `src/shells/chat.html` `mediaAutoloadOn()` (absent or any value but `'off'` = On)
  and `src/shells/settings.html` `mediaAutoloadPref()` (the same rule). Writer today: the Privacy screen only.
- **A new or restored account starts with an EMPTY store:** `LaunchPage.onLoad` pushes `wipeLocalState` when no wallet
  file exists (`Spixi/Pages/Launch/LaunchPage.xaml.cs:130-136`), and the create body pushes it again after
  `generateWallet` (`:589`). So an absent key cannot tell a new account from an old one by itself; C# must say "new".
- **The write sites (the pattern of `defaultsb`):** the create body after `DefaultsRules.writeNewAccount` (`:595`) and
  both restore paths right after `applyRestorePrefs(pass)` (base lines `:1163` the account zip, `:1241` the bare wallet file;
  `:1196` / `:1275` in this tree —
  both AFTER the verify; a wrong password returns before them). Each is followed by the navigation to Home, posted
  to the main thread after the push (the `wipeLocalState` ordering of `:589`).
- **What Off does (existing behaviour of the setting, facts):** a GIF / image link from the allow-listed hosts
  renders as a tap-to-load tile (`chat.html:2982`), a remote mini-app icon in an invite is not fetched
  (`chat.html:3451`), the blurred offer preview of a received photo is not shown (`chat.html:1697`, `:8272`), and the
  auto-download Moment after the first manual photo download does not show (`chat.html:8193`). A local photo that is on
  the device still shows (`photoPreviews`, P3). The ruling's text names the first two; the other two are the same
  switch, recorded here.
- **The C# mirror (#46 r1):** photo auto-download keeps its own copy of the setting, `SAutoDownload.loadPictures`
  (`Spixi/Meta/SAutoDownload.cs:18`, absent = On), synced only by the Settings verb `ixian:photoAutoDl:`. The same
  helper writes it Off when it sends the media argument "1", so a stale auto-download setting (native prefs that
  outlived the wallet file) cannot download while the screen says Off. If the push is LOST (the launch WebView gone), the
  screen keeps On while the mirror is Off: auto-download, the offer previews and the auto-download Moment stay off until
  the user flips the switch — a silent mismatch toward MORE privacy (#46 r2 MINOR-2, accepted and recorded).
- **An existing account:** no reader changes; the key stays absent = On, also when the user never stored a choice.

## 4 · A9 "List density" Compact for a new or restored account (`n-20261118-default-list-density-compact`, #1750)
- **The key:** `spixi.chat.listdensity` (`'comfortable' | 'compact' | 'dense'`; absent / anything else = comfortable).
  Readers: the head ladder of `src/shells/home.html:40` (sets `data-row-density`), `src/shells/settings.html:696`
  (`readChatPrefs`). Writer today: Settings › Chat appearance (desktop only).
- **Desktop only:** the control exists only on Windows and Mac; the write must happen only there (the phone has no
  control to undo it, and the head ladder of home.html applies the value on any platform).
- **The same write sites and the same "new = C# says so" rule as § 3.**

## 5 · The broken-picture tile that stays "sending" (`n-20261122-win-broken-picture-tile-stays-sending`, W-2 F)
- **Verdict: the walk row is wrong; the fallback of `PhotoTileLite` is not broken.** A Seed contact's address is a
  hash with no key (`Spixi/Utils/SDevSeed.cs:7-9`, `addressFor` `:120-126`): nothing sent to it ever arrives, no
  `acceptFile` comes back, so C# never sends `updateFile` for my file (`Spixi/Data/TransferManager.cs:784-791` → `:698`, and `requestFileData` `:999` — both need the peer's answer —
  are the only sources of a sender-side progress), and the file stays in the `progress` state for good: the JPG glyph, a 0 % ring,
  "Keep Spixi open until it's sent." and Cancel (`chat.html:3284` `if (asBool(me)) return 'progress';`,
  `chat.html:3214-3216`, `typed-bubbles.js:739-742`, `:1049-1085`) — exactly what Damir saw.
- `PhotoTileLite` changes COMPLETE tiles only (`typed-bubbles.js:1163` `lite: lite && state === 'complete'`, `:1204`);
  a sending tile is drawn the same with the switch on and off (the pin `scripts/pins-photo1b/e-tile.mjs:123-126` holds
  the sending row byte-equal). A text file named `.jpg` never gets a preview (`ImageSniff.looksLikeImage` →
  `chatThumbOf` returns null), and the decode-error path (`media-bubble.js:266-272` → `onSrcError` → `ensureFace`)
  rebuilds the face of the CURRENT state: complete → the file card with "Open file". On a device that path is NOT
  reached for such a file (C# sends no preview of a non-image); only the pin `pins-fixb4/e-tile-states` holds it
  (#46 r1, reader L MINOR-3).
- **Fix:** rows W-2 / A-2 of `docs/walk-photo1b.md` are rewritten so they can pass: send to a REAL contact on a second
  device (its "Auto-download photos" Off, so the offer waits for a tap), then the card appears after "File sent" (an
  in-place flip of a tile built in progress — the same with the switch on and off) and after a reopen, after a short
  moment (the PO-4 quiet face: the leg that exercises the switch). The pin holds every state with the switch on and off
  (§ 8).

## 6 · The Developer log of half a row (`n-20261122-dev-log-window-half-row`)
- The log `<pre>` (`src/components/settings-app.js:871-875`, class `c-settings-dev__log u-scroll`) is the ONLY
  shrinkable child of a scrolling flex column: `.c-settings__body > * { flex: none; }` (`settings-shell.css:14-26`) and
  `.c-settings-dev__log.u-scroll { flex: 1 1 auto; min-height: 0; … padding: 12px }` (`settings-app.css:418-422`,
  unchanged since `2643743b`, 2026-07-05).
- Three switch cards are inserted ABOVE it: Flash (`dev.html:152`, all platforms, since `f20aac00`), Container
  (`dev.html:204`, Android only, `46dc729c`) and Release flags (`dev.html:269`, all platforms, since `e2e84629`, grown by
  `35ebb04c`, `2a469442`, `e3a628d0`, `9521f487`). Their fixed height is larger than the screen (estimate: about
  1340 px against a body of about 830 px at 412 × 915; about 1150 against 744 at 1280 × 800), so flexbox squeezes the
  log to its floor: 0 content + 2 × 12 px padding = a 24 px window, in which the first 20 px line starts at 12 px —
  half a row. Android is worse by its extra card; Windows has it too unless the window is taller than about 1.2k px.
- **Fix (one CSS declaration):** a floor for the log (`min-height: 60vh`): it still fills the body when there is room;
  below that, the body scrolls to it and the log scrolls itself. This screen has no text field (no keyboard), so the
  vh unit is safe here. Light and dark are not touched.

## 7 · Drag and drop of files into a chat on Windows (`n-20261122-win-drag-drop-files-into-chat`)
- **Verdict: never built (not switched off, not broken).** No `dragover` / `drop` / `DataTransfer` handler in
  `src/shells/chat.html` or its components (the only hit, `src/components/money.js:216`, BLOCKS a drop on the amount
  field). At the fork point `0e85a4b8` the legacy chat page, `js/chat.js` and `SingleChatPage.xaml(.cs)` have none
  either (the only `dragover` is the vendored html5-qrcode). No `AllowExternalDrop`, `AllowDrop`,
  `DropGestureRecognizer` or `DragOver` in the C# tree at HEAD or at `0e85a4b8`. `git log -S'dragover'` finds only the
  three import commits before the fork. `docs/paste-image-spec.md:48` lists drag and drop of image files as
  "later / optional".
- **Not verified on a device: what a drop does today.** Either nothing (WinUI's WebView2 does not forward it, or an
  Explorer → elevated-Visual-Studio drop is blocked by UIPI), or the engine's default navigates the chat WebView to
  the `file:///…` URL — `SingleChatPage.xaml.cs:1100-1104` lets a `file:` navigation through and `Utils.IsAllowedURL`
  returns true for a non-http URL (`Utils.cs:840-858`; also the Windows resource filter, `WindowsWebViewHandler.cs:94-103`);
  no `AllowExternalDrop` is set, so the WebView2 default (true) applies. In that second case a dropped file REPLACES the
  chat document, and a dropped `.html` would run its own script with the page's verb channel: `SingleChatPage.onNavigating`
  dispatches every `ixian:` URL of whatever document is loaded while a friend is set (on Windows every shell is itself a
  `file:` document). The same `file:` allow is in 19 C# pages (the launch page too). **INHERITED:** the allow and
  `IsAllowedURL` are the same at `0e85a4b8` (#46 r1 reader S MINOR-3) — the gate's rule: legacy → the BE engineer's list
  (`docs/be-review-pack/legacy-not-ours.md`). A user must drop the file himself; a sender could ask him to.
- **No fix in this batch** (it is not a repair of something that worked). A build needs C# to take the file from the
  OS drag data (WinUI `DataView.GetStorageItemsAsync`) and reuse the Send-file copy and size cap; a JS-side drop would
  need a new verb (#1312). The question with options is in the status doc and Mission Control.

## 8 · Measured (Chromium renders of the BUILT shells; the scripts are in `scripts/pins-fixb4/`, the PNGs in the session's renders)
**Item 2 — `c-keyboard-render.mjs`** (Android UA, insets 24 / 48; keyboard = the adjustResize model, viewport − 323 px;
106 rows, 0 red after round 1; light = dark). The 412 × 774 case is the viewport measured on Damir's Samsung
(`docs/android-findings.md:41`, 774 → 451, before AND-7).

| Size / case | BASE (338d30f4) | NEW |
|---|---|---|
| 412 × 774, S1 / S2 password (keyboard top 451; button 323–379) | FAILS: field 334–392 | field 249–307 (body scrollTop 85) |
| 412 × 774, S2 confirm | FAILS: field 404–462 | 249–307 (scrollTop 155) |
| 412 × 915, password (keyboard top 592) | holds (334–392) | the same (scrollTop 0) |
| 412 × 915, confirm S1 / S2 | FAILS (403–461 / 404–462 against the body bottom 452) | 390–448 (scrollTop 14) |
| 360 × 640, S1 / S2 password (keyboard top 317; body 88–177) | FAILS: field 334–392 (the walk's bug) | 115–173 (scrollTop 219) |
| 360 × 640, S2 confirm | FAILS: 404–462 | 115–173 (scrollTop 289) |

In every NEW row the focused field with its 4 px ring is inside the body and the footer button is above the keyboard;
the topbar, progress, body rect, footer, button and document scroll equal BASE within 0.5 px; at full height and with an
iPhone UA everything equals BASE. Where BASE holds, it is by room or by Chromium's own focus scroll. At 320 × 568 (the
ring fixture of `pins-on1`, below the ruling's sizes) the step's body content sits 14 px higher than BASE after a field
was focused (10 px for the field box + 4 px for its ring): the focused box was cut by the body edge (accepted, #46 r1).

**Item 6 — `d-devlog-render.mjs`** (C#'s push order; 600 log lines; light = dark):

| Device | BASE log | NEW log |
|---|---|---|
| Android 412 × 915 | 24 px = 0 rows | 549 px = 26 rows |
| Android 360 × 640 | 24 px = 0 rows | 384 px = 18 rows |
| Windows 1280 × 800 | 24 px = 0 rows | 480 px = 25 rows |

The log scrolls itself; the body scrolls to it; with the log alone (no cards) its height equals BASE.

**Item 5 — `pins-fixb4/e-tile-states`** (jsdom, 9 rows): my unsent `broken.jpg` is the progress face and the whole row is
byte-equal with the cap ON and OFF (4478 bytes), also after the quiet wait; after `updateFile(…, 100, True)` the card
with "Open file" and `ixian:openfile:<id>`; a reopen: ON = the quiet tile, then the card after the wait, = OFF.
