# v1 desktop additions — spec (render only, nothing built)

Four small changes that make v1 desktop feel less like a phone port. None adds a verb that a page can send, none touches the money path, none adds a WebView or a process. Total: **3–4 sessions**, each change behind its own flag where it has C# (#1312), with Windows and Mac walk rows.

| # | Change | Platforms | Bridge | C# | Risk | Sessions |
|---|---|---|---|---|---|---|
| 1 | Native title bar with a search box | Windows | one new push, C# → home shell: `setChatFilter(text)` | yes | low | 1 |
| 2 | Use the title strip for the headers | macOS | none (the `--safe-top` push exists) | no | low, after a check on the Mac | 0.5–1 |
| 3 | Chat list polish: sections, inset selection, hover actions | both | none (the row-menu actions exist) | no | low | 1 |
| 4 | Second-device warning | both (and mobile) | none (existing `showWarning`) | yes, read-only | low | 0.5–1 |

## 1 · Native title bar (Windows)
- **User sees:** the Spixi icon and name, a centred "Search chats" box with `Ctrl K`, the Windows caption buttons. The rail logo moves up into the bar. On Windows the list's own search field goes away; the bar's box replaces it.
- **How:** MAUI `Window.TitleBar` (supported on Windows and Mac Catalyst; Spixi targets `net10.0`). Icon 16 px, height 40. Background and text colours are the token values (light and dark), set again when the theme changes. The box is a native field: typing pushes `setChatFilter(text)` to the home shell, which runs the filter it already has; `Esc` clears. `Ctrl K` from anywhere (also inside the chat WebView, via `AcceleratorKeyPressed`) focuses the box.
- **Files (expected):** `Platforms/Windows/App.xaml.cs` (window mapper at `:98`) or `App.CreateWindow`; `HomePage.xaml.cs` (the push); `src/shells/home.html` (hide the list field on Windows only).
- **Pins:** a smoke pin that pairs the C# colour constants with `tokens.css` (the `railWidthDip` precedent); the push only filters, never opens or sends.
- **Walk rows:** light and dark; live theme switch; typing, `Esc`, `Ctrl K` with focus in the chat; drag the window by the bar; maximise and restore; the 480 px minimum width.

## 2 · Use the title strip (macOS)
- **User sees:** today every shell pads below the title strip (`--safe-top`), so an empty band runs across the top. With the change, the window buttons sit at the top of the rail (the logo goes), and the list header and the chat header sit in the band. The list keeps its own search field (Mac pattern).
- **How:** CSS only, in `home.html` and `chat.html`, under a Mac-only marker: lay the headers into the `--safe-top` band instead of padding below it; keep 80 px free at the left of the rail for the window buttons. The `--safe-top` push already exists (`SpixiContentPage.cs:1134`, `macTitlebarOverlap`).
- **Check first, on the Mac:** (1) the window still drags from the band; (2) a click on an HTML button inside the band reaches the page. If (2) fails, keep the buttons just below the band, or use MAUI `TitleBar` on Mac Catalyst instead.
- **Walk rows:** light and dark; drag; buttons in the band; full screen (the band hides); resize.

## 3 · Chat list polish (both)
- **User sees:** "Pinned · n" and "Chats · n" headers that fold; the selected and hovered rows as rounded, inset shapes; on hover, four buttons on the row: pin, mute, chat info, more (more = today's row menu). Avatars, sizes and weights stay as dialled (#227, Sessions I and J).
- **How:** `chatlist-item.css` in a `:root[data-desktop]` block (the component stays as it is on mobile); the chats list adds the two header rows only when at least one chat is pinned; the hover buttons call the same `onAction('pin' | 'mute' | 'info')` as the row menu, so the existing verbs carry them. The fold state is a per-device UI setting (`spixi.chats.fold`, the `spixi.pins` class).
- **Pins:** headers only with a pinned chat; fold state survives a re-flush and a restart; each hover button routes to the same action as the menu; the buttons are focusable and `Shift F10` still opens the menu.
- **Walk rows:** light and dark; hover, click each button; fold and unfold; a pinned chat that gets a message; the row menu by right click.

## 4 · Second-device warning (both, and mobile)
- **User sees:** the existing home banner: "Your account is also active on another device (seen 2 min ago). New messages can go there instead of here." It is plain text (the banner sets `textContent`) and can be closed, as today.
- **How:** C# reads our own entry in Core's presence list (one `PresenceAddress` per device, each with a device id and keepalives — see the multi-device note), compares the ids with this device, and pushes a fixed, localised string through the existing `showWarning`. It clears when the other device goes quiet. This is the v1 recommendation of the multi-device note.
- **Avoid false alarms:** count another device only with a keepalive in the last N minutes (N = a dial, e.g. 10).
- **Pins:** a C# harness test for the rule: other id + fresh keepalive → warn; other id + old keepalive → no warn; our own id → no warn.

## Left out on purpose
| Item | Why not v1 |
|---|---|
| Windows Hello / Touch ID after the payment confirm | worth it, but it is the money path: a flag, a review packet and a BE yes |
| Multi-select in the list | needs a new bulk verb |
| The desktop wallet workspace | a big new layout on a money surface |
| Palette, tabs, pop-out windows, tray and toasts, drag and drop | the v1.1 desktop base |
| Live Mica or glass behind the WebViews | the WebViews paint solid colours; needs a test in v1.1 |
| A separate process group for chat | v1.1 base, together with perf lever #5 |
