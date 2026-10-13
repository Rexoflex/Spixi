# v1 desktop additions — spec, session DT-1 scope (A + B built in DT-1 P1, #1385 · #1386; D deferred, #1388)

Scope locked by Damir on 2026-10-12 (21:2x–21:45): NO search in the Windows title bar (the list keeps its own search field on Windows and Mac); the Spixi logo stays in the rail on Windows AND Mac; the Mac title strip is dropped to v1.1; #1179 (b) (chat info grows the window) joins. Interview (21:5x): Q1 the bar shows "Spixi" only · Q2 C is dropped from DT-1 (BE ask) · Q3 grow only when there is room on the right, else squeeze; a snapped window never grows · Q4 two patches: P1 = A + B (Windows + Android walk), P2 = D (Windows, then Mac). None adds a verb that a page can send, none touches the money path, none adds a WebView or a process. Each change with C# ships behind its own flag (#1312), with Windows and Mac walk rows.

| # | Change | Platforms | Bridge | C# | Status |
|---|---|---|---|---|---|
| A | Chat list polish: sections, inset rows, hover actions | Windows + Mac (mobile unchanged) | none (the row-menu actions exist) | no | **BUILT** (P1, #1385) |
| B | Windows title bar in the token colours, "Spixi", no search | Windows | none (a dev switch for the spike) | yes | **BUILT** (P1, #1386); the spike picks the default way |
| C | Second-device warning | all | — | — | **DROPPED from DT-1** (mechanism check failed; Damir Q2) → BE ask |
| D | Chat info grows the window (#1179 b) | Windows, then Mac | none | yes | **DEFERRED** (#1388) to the agent-support layout work |

## A · Chat list polish (Windows + Mac)
- **User sees:** "Pinned · n" and "Chats · n" headers, only when at least one chat is pinned (else one flat list as today); both fold. The selected and hovered rows are rounded, inset shapes. On hover, four buttons on the row: pin / unpin, mute / unmute, chat info, more (= today's row menu). While the pointer is on the row, the time and the badge give way. Avatars, sizes and weights stay as dialled (#227).
- **How:** `chatlist-item.css` in a `:root[data-desktop]` block; `chatlist-item.js`; `chats-shell.js` (the order is already pinned-first, `orderedChats`); `home.html`. The hover buttons call the same `onAction('pin' | 'mute' | 'info')` as `chats-row-menu.js`; mute stays C#-owned (the `setChatMuted` echo). Hover only under `(hover: hover) and (pointer: fine)` (#43). The buttons are focusable; right click, the context-menu key and `Shift F10` still open the row menu. The fold state is per device: `spixi.chats.fold`, the `spixi.pins` class (`home.html:1770`), in try/catch.
- **Defaults:** no sections while a search query is active; with a chip filter, sections only when a pinned chat is in the filtered list; pending request rows count in "Chats"; counts = rows per section.
- **Strings:** `pin`, `unpin`, `mute`, `unmute`, `chatInfo`, `chats` exist; one NEW key for the section label (`pinnedSection` "Pinned") in en-us + 13 locales.
- **Built note (#1385):** the hover buttons are `tabIndex -1` pointer accelerators (the swipe-action precedent); the keyboard path is the row menu. "More" raises the row's own right click, so it is today's menu.
- **Pins:** no section rows with 0 pinned; "Pinned · n" + "Chats · n" with ≥ 1; the fold survives a re-flush and a reload; each hover button routes to the same action as the menu; the hover rules only under `(hover:hover) and (pointer:fine)` and `:root[data-desktop]`; a mobile boot has no change.

## B · Windows title bar (no search)
- **User sees:** the bar in the token colours, light and dark, set again on every theme change; the word "Spixi" (Q1; no icon — the logo is in the rail); the caption buttons. With way 2 the system draws the title: `window.Title` = "Spixi". Today: the system bar in system colours, caption "Spixi IM" (`App.CreateWindow`, `App.xaml.cs:1441`).
- **How:** way 1 = MAUI `Window.TitleBar` (Microsoft.Maui.Controls 10.0.71, net10.0-windows); way 2 (fallback) = keep the system bar and set only its colours (`AppWindow.TitleBar` background / foreground / button / inactive colours). A spike (≤ 1–2 h, F5): drag, double-click to maximise, maximise / restore, Snap, the resize band (#1272), the 384 DIP minimum (`Platforms/Windows/App.xaml.cs:37`), a live theme switch. Any failed row → way 2. Do NOT bring back the window-ground paint (#1276).
- **Where:** `Spixi/Platforms/Windows/App.xaml.cs` (the window mapper, `:90–224`) or `App.CreateWindow`.
- **Pins:** the C# colour constants pair with `tokens.css`, both themes (the `railWidthDip` precedent, `HomePage.xaml.cs:181`).

## C · Second-device warning — DROPPED from DT-1 (mechanism check + Damir Q2, 2026-10-12)
- **Planned:** the existing home banner with Damir's fixed text "Spixi uses one device per account. Using this account on another device at the same time can lose messages." when our own address shows another device id with a fresh keepalive.
- **Finding (Ixian-Core `097341a` + Spixi `35ebb04c`):**
  1. A client subscribes to keepalives only for its friends (`CoreNetworkProtocol.subscribeToEvents`, the friend cuckoo filter, `:1312–1323`); the node forwards a keepalive to a client only when it is subscribed to that address (`NetworkServer.cs:799`). Spixi never asks for its own presence (`getPresence2` is sent only for an unknown wallet, from inside `receiveKeepAlive`).
  2. When a keepalive for our own wallet arrives from a device id we do not hold, Core resets our entry to this device only (`PresenceList.cs:766–771, also :687–692`). A full presence update (`updateEntry`, `:172–219`) would add the other device, but nothing asks for one.
  3. The home banner has no clear path for a non-connectivity text (`home.html:4812–4842`): "clears when the other device goes quiet" needs a new push or a shell change.
- **Result:** C needs a NEW network request (and depends on Core behaviour we do not own) → the DT-1 STOP rule. Damir (Q2): drop C from DT-1; record the 2026-10-11 14:21 decision and add a BE ask (can a client see its own address's other-device presence; should Core keep those entries instead of clearing them). The copy is kept for later.

## D · Chat info grows the window (#1179 b)
- **User sees:** on a Restored window (not maximised, not full screen, not snapped) with room in the work area ON THE RIGHT, opening chat info grows the window to the right by the pane width (360) and the conversation keeps its width. No room on the right → squeeze (the window never moves; Q3). Close → it shrinks back by the same amount, only if the user did not resize or move the window meanwhile. Else: squeeze as today.
- **How:** Windows: `AppWindow.Resize` / `MoveAndResize` against `DisplayArea.WorkArea`. Mac: `UIWindowScene.RequestGeometryUpdate` with `UIWindowSceneGeometryPreferencesMac` (can be refused → squeeze). A pure function `growPlan(window, workArea, pane, state)` → grow-right / squeeze, CSH-tested.
- **Found:** today's pane motion is "width" (col 2 0 → 360 in 220 ms, `HomePage.xaml.cs:202–212`); when the window grows, col 2 is set at once (the window growth is the motion). The Windows size save lives in the mapper closure (`App.xaml.cs:173–223`) and must learn the pane amount so it never saves the grown width (#1073), also on a close with the pane open. Spixi saves no window size on the Mac (macOS restores the frame itself) → DT-MAC-RESTART. The pane follows a chat switch (#1179 a): the window stays grown while it follows.
- **STOP rule:** if the resize and the pane flicker, or the save rule is not safe after ~1 h, ship the squeeze (today) and keep (b) for v1.1.

## Left out on purpose
| Item | Why not now |
|---|---|
| The second-device warning (C) | Spixi cannot see its own address's other-device presence without a new request, and Core clears those entries (`PresenceList.cs:766–771, also :687–692`); a BE ask |
| Search in the Windows title bar (`setChatFilter`, `Ctrl K`) | Damir 2026-10-12: the list keeps its own search field |
| The Mac title strip (headers in the `--safe-top` band) | Damir 2026-10-12 "not urgent in any way" → v1.1. NOT CSS only: the native title bar sits ABOVE the Mac WebViews today (#993 / B2, `Utils/SpixiContentPage.cs:775–795`, `macTitlebarOverlap :1138`), so the pages must first extend under it in C# |
| Windows Hello / Touch ID after the payment confirm | the money path: a flag, a review packet (P27) and a BE yes |
| Multi-select in the list | needs a new bulk verb |
| The desktop wallet workspace | a big new layout on a money surface |
| Palette, tabs, pop-out windows, tray and toasts, drag and drop | the v1.1 desktop base |
| Live Mica or glass behind the WebViews | the WebViews paint solid colours; needs a test in v1.1 |
| A separate process group for chat | v1.1 base, together with perf lever #5 |
