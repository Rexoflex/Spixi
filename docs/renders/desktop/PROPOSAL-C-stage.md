# C · Stage — proposal

**For:** anyone who uses Spixi to do something with someone — play, sign a lease, read an agent's report, settle a bill. **One line:** a conversation gets a stage. Whatever is shared in the chat opens large beside it, each object in its own sandbox, and the chat stays a narrow column. Render only (v1.1+ track).

**Why this is the strongest new idea I found:** it gives the desktop a job the phone cannot do. Mini-apps (the "shareable artefact" of the agent strategy, §6.3) get a real screen. Files and agent artifacts (§6.1 "artifacts in the chat") get a real viewer. A payment request becomes an object you read — drawn by the wallet, not by the chat — before the native confirm. And it puts each kind of content in the process that matches its trust.

## What the user gets

| Feature | Where in the renders |
|---|---|
| Stage beside the chat, object tabs, provenance bar on every object | main frames |
| Mini-app session on the stage, with who is on it (Live) | main, flow 3 |
| File on the stage: page thumbnails, find, "Quote in chat", save a copy | state "A file on the stage", flow 4 |
| Agent artifact: tables, numbers, a chart — rendered as data, never run | state "An agent artifact" |
| Payment request as an object drawn by the wallet; receipt after paying | flow 2 |
| Shelf: everything shared in one chat, or across all chats, by kind, person, time | states "shelf", flow 4 |
| People strip: the list folds to avatars while the stage is open (1280 / 1440); the full list returns at 1920 | main frames |
| Re-opening a chat restores its stage where it was | flow 1 |

## WebView and process layout

| Object | Rendered in | Group | Why |
|---|---|---|---|
| Chat | conversation WebView | **Chat** | peer content |
| File (PDF, image, text) | file viewer WebView, scripts off, media-origin URL (perf lever #1), no verbs of its own | **Chat** | peer content; never shares a DOM with the chat itself |
| Agent artifact | artifact viewer WebView: Spixi's sanitized markdown / table renderer; CSP `default-src 'none'; script-src 'self'; style-src 'self'; img-src <media origin>` — no remote image can leak the IP | **Chat** | agent output is untrusted input (agent-hub note) |
| Mini-app | MiniAppPage WebView, one environment per app | **Apps** | third-party code |
| Payment request | the wallet WebView, values pushed by C# | **Shell** | money; the chat only sent a message id |
| Stage frame, object tabs, shelf, stage footer controls | shell WebView | **Shell** | names as plain-text labels (#221 list rule); thumbnails only as images C# re-encoded itself (an extension of the #221 rule, to declare in the packet) |
| Native confirm, window chrome | C# | **Native** | — |

Rule of the stage: **the chat never says what to render, only which message.** A click on a card sends `ixian:stage:open:<msgId>`; C# looks the message up in THIS conversation (the same peer lock as `SPayments`), decides the kind and opens the matching WebView in the matching group. Quote, find and save are controls of the stage frame (shell) and native dialogs; the viewer page itself sends nothing.

## New verbs and pushes (each behind a `#1312` flag)

| Verb / push | From → to | C# guard |
|---|---|---|
| `ixian:stage:open:<msgId>` (chat) · `ixian:stage:open:<convAddr>:<msgId>` (shell, e.g. the shelf) | chat or shell → C# | chat: the message must be in that chat's own conversation; shell: the pair must be in C#'s own shelf list; kind decided by C# |
| `ixian:stage:select:<objId>` · `ixian:stage:close:<objId>` | shell (stage tabs) → C# | object ids from C#'s own list |
| `ixian:shelf:query:<convAddr\|all>:<kind>:<text>` → `shelfItems(json)` | shell ↔ C# | items built from existing message types: transfers, app sessions, payment requests |
| `ixian:stage:quote:<objId>:<page>` · `ixian:stage:save:<objId>` | stage frame (shell) → C# | quote = C# puts a reference (file + page) into the composer, never sends; save = native save dialog, C# names the file |
| push `stageTabs(json)` · `stagePresence(addr, on)` | C# → shell | presence from the app session (MultiUser, `ixian:data`, `MiniAppPage.xaml.cs:170`) |
| push `showRequest(msgId, amount, address, fee, balance)` · `ixian:payRequest:<friendAddr>:<msgId>` | C# → wallet WebView → C# | values from C#. Pay is a NEW sender (the wallet WebView) of the existing `handlePayRequest`: own packet + gate row; C# accepts only the msgId it pushed in `showRequest`, then `confirmAndAuth` (P02) |
| push `loadObject(url)` | C# → viewer WebViews | media-origin URL from C#'s id table, `no-store` |

No new money handler — one new sender of an existing one.

## Spixi-only or Core?

| Item | Who | Note |
|---|---|---|
| Stage, shelf, file viewer, request object, people strip, restore | **Spixi only** | all from message types that exist today |
| Mini-app on the stage with presence | **Spixi only** | multi-user app sessions exist; "who is on it" rides the app protocol |
| Shelf across all chats | **Spixi only** | C# aggregates per friend from Core storage (the same index as the palette) |
| Agent artifacts as their own message type | **Core** | streaming already works in Core (strategy §6.2); the ask is an artifact type. Until then an artifact = a file + a preview message |
| The mini-app sandbox MAJORs (#4 #6 #8 #9 #10) and package signature check | **Spixi / BE** | must close before we promote user-made or agent-made apps on a big stage (strategy §7.1) |

## Effort

| Work | Sessions |
|---|---|
| Base for all directions (process groups, native keys, palette + index, Hello / Touch ID) | 7–10 |
| Stage host column + object tabs + restore per chat | 2–3 |
| File viewer (scripts off, media origin) + quote / save controls | 2 |
| Request object in the wallet WebView | 1 |
| Shelf (one chat + all chats) | 2 |
| Mini-app hosting on the stage + presence | 1–2 |
| Artifact renderer (sanitized markdown + tables, PR #50 port, no scripts) | 2–3 |
| People strip + compact list | 1 |
| **Total C** | **18–24** |

## Risks
- A big stage makes third-party apps look first-party. The provenance bar on every object is not optional, and the sandbox MAJORs come first.
- Two or three WebViews on screen at once (chat + stage object + maybe chat info). Detach hidden objects (lever #2); keep one live object per conversation.
- A lease PDF next to a payment request is exactly where phishing will try to live. The request object is drawn by the wallet from C# values; the stage never draws a Pay button from peer content.
