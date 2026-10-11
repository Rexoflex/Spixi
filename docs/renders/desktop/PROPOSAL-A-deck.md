# A · Deck — proposal

**For:** the personal power user. **One line:** Spixi works like a mail client or a code editor — every command has a key, several chats are open at once, and Spixi keeps running in the tray. Render only; nothing here is built (v1.1+ track).

## What the user gets

| Feature | Where in the renders | How |
|---|---|---|
| Palette `Ctrl+K` (chats, people, messages, files, actions) | flow 1, flow 4 | its own WebView in the chat process; C# owns the index and the results |
| Actions in the palette (`>send 25 jonas`) | flow 2 | C# parses the text; the only effect is to open the wallet send pane with a FRIEND as recipient and the amount to check. The palette cannot press Review, and the native confirm still decides |
| Native tabs + split groups (`Ctrl+\`) | main 1920, all flows | WinUI `TabView` / macOS window tabs; each tab is its own chat WebView |
| Chat + chat info + files side by side | main frames | chat info = its own WebView in the chat group (perf #5 / #7), drawn here STRIPPED (perf §2c option B: no amounts) — option B is not picked yet, see the effort table |
| Pop-out chat windows (`Ctrl+Shift+N`) | state "Chat in its own window" | MAUI `Application.OpenWindow`; one chat WebView per window |
| Drag and drop a file onto a row or tab | state "Drop a file on a chat" | native drop target; C# reads the file and names its own temp file |
| Hover actions, multi-select, compact rows | state "Hover actions and multi-select" | shell list (textContent only) + one bulk verb |
| Tray, toasts with inline reply, global `Ctrl+Alt+S` | state "Tray and notifications" | Windows App SDK notifications + notify icon + `RegisterHotKey`; no WebView |
| Quick Look on `Space` | flow 4 | file viewer WebView, chat process, scripts off |
| Status bar | Windows frames | native; connection, sync, lock timer, key hints |

## WebView and process layout (the wall)

| Group | Windows (WebView2) | macOS (WKWebView) | Holds |
|---|---|---|---|
| **Shell** (trusted) | default `CoreWebView2Environment` | default data store | rail/sidebar + chat list, wallet, wallet send pane, settings, shortcut sheet. Peer text only as short plain-text labels (names, one-line excerpts) — the #221 list rule: `textContent`, length cap, no media |
| **Chat** (untrusted content) | a SECOND environment with its own user data folder → its own browser, renderer and GPU processes | `WKWebsiteDataStore(forIdentifier:)` for chat → its own WebContent processes | every conversation WebView (tabs, splits, pop-outs), chat info, palette, Quick Look |
| **Apps** (third-party code) | one environment per mini-app (own folder = own storage; closes O-02 / O-03 on Windows) | one data store per app | mini-apps opened beside a chat |
| **Native** | C# | C# | window chrome, tabs, status bar, native confirm, toasts, tray, hotkeys, drag and drop |

Rules: no JS bridge between WebViews; panes meet in C# only. The chat group gets no NEW wallet data (today's O-01 exception stays as accepted for v1: chat.html can read the balance and Max through `feeQuery`, P02 — close it on desktop). A global shortcut never comes from a page: C# takes it first (`CoreWebView2Controller.AcceleratorKeyPressed`, `AreBrowserAcceleratorKeysEnabled = false`; macOS menu key equivalents). The app lock covers every window; while locked, toasts show no text and offer no reply.

## New verbs and pushes (all behind a `#1312` flag, old path as fallback)

| Direction | Verb / push | Sent by | C# guard |
|---|---|---|---|
| page → C# | `ixian:pal:q:<text>` | palette | ≤ 200 chars; rate limit; the index lives in C#. Default answer: names and file names only; message snippets only if Damir says yes (COMPARE Q2), rendered with `textContent` under a strict CSP — a palette that shows history could otherwise read every conversation |
| page → C# | `ixian:pal:open:<kind>:<id>` | palette | only an id from the LAST result set C# pushed; anything else is dropped |
| page → C# | `ixian:pal:preview:<fileId>` · `ixian:pal:close` | palette | only a file id from the last result set; the viewer gets a media-origin URL (perf lever #1) |
| page → C# | `ixian:popout:<addr>` · `ixian:tab:open:<addr>` | shell list | friend address only |
| page → C# | `ixian:dropTarget:<addr\|none>` | shell list | friends only; C# opens that chat with the file in the composer — it never sends by itself |
| page → C# | `ixian:bulk:<read\|mute\|archive>:<addr,…>` | shell list | each address must be a friend; archive = new local state |
| C# → page | `palResults(json)` · `palMode(scope)` | → palette | names and snippets rendered as text |
| C# → page | `dropHover(x, y)` · `setDensity(compact\|comfortable)` | → shell | — |
| C# → page | `openSend(friendAddr, amount)` | → shell send pane | recipient only a friend from a result row C# built itself; the user checks the amount and presses Review in the shell; send still goes `ixian:feeQuery` → `ixian:signSend` → `SPayments.confirmAndAuth`. The note in the render is local only (`signSend` carries no note) |

No new money verb. The send path is the existing one (`feeQuery` → `signSend` → native confirm, P02).

## Spixi-only or Core?

| Item | Who | Note |
|---|---|---|
| Everything in the table above | **Spixi only** | Core's public API is enough |
| Search across chats | **Spixi only** | in-memory index built after unlock from `LocalStorage.readLastMessages` (Core `Streaming/Storage/LocalStorage.cs:540`); cleared on lock. Nothing new on disk — chat history files at rest carry a "TODO: encrypt written data" today (`LocalStorage.cs:726`) |
| Windows Hello / Touch ID after the dialog | **Spixi only** | `confirmAndAuth` (`SPayments.cs:577`) returns true with no biometric on WinUI today (`:608–610`) |
| Desktop as a second device of the phone's account | **Core** (BE-led) | today one device per account (#1298); linked devices = option A in the multi-device note |

## Effort (sessions = one build batch with pins, #46 and a walk, as S13–S15)

| Work | Sessions |
|---|---|
| Base for all directions: process groups + N-WebView host (extends #225/#247), native keys, palette + index, Hello / Touch ID | 7–10 |
| Tabs + split groups + a live-tab limit (3 live chat WebViews, others snapshot) | 2–3 |
| Pop-out windows | 1–2 |
| Tray, toasts with reply, global hotkey (Windows first; macOS menu-bar extra needs an AppKit bundle, later) | 2 |
| Drag and drop · hover actions + multi-select + compact rows · Quick Look | 3–4 |
| Chat info option B (native confirms for remove / clear / kick / ban / leave, `editnick`, payments row) — only if picked | 1–2 |
| **Total A** | **16–23** |

## Risks
- Memory: each live chat WebView costs (perf research: +40–70 MB after levers #1–#7). Cap live tabs; detach + pause hidden ones (lever #2).
- The palette searches all history. It stays in the chat group and starts with names only; snippets are a later yes/no (COMPARE Q2).
- macOS Catalyst: native window tabs need verification; a menu-bar extra needs an AppKit bundle. Windows first.
