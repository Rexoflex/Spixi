# Compare · the shared base · my pick

## The three, side by side

| | A · Deck | B · Office | C · Stage |
|---|---|---|---|
| For | the personal power user | Spixi for business, a team | anyone who does things with people and agents |
| The desktop is for | speed and many chats at once | a shared inbox, books and approvals | working on one thing together, beside the chat |
| Signature | palette `Ctrl+K`, native tabs, split groups, tray | inbox with owners, directory, ledger, tools dock | stage + shelf, objects in their own sandboxes |
| Chat list | compact rows, sections, hover actions, multi-select | inbox rows: org, label, owner, waiting time | comfortable rows at 1920; avatar strip at 1280 / 1440 |
| Wallet | the desktop wallet (chart, table, inspector) + a send pane from the palette | a ledger: reference, fee, running balance, requests, CSV | the desktop wallet + the request drawn as a stage object |
| Mini-apps and agents | beside the chat, in a split | tools dock; agents propose, you approve natively | on the stage, large, with presence |
| New WebViews per window (typical) | 2–4 chat + palette + info | 1–2 chat + 1 app | 1 chat + 1 stage object |
| Needs Core | only for desktop as a second device | **yes**: team inbox, two-person approval, the agent proposal type | only for an artifact message type |
| Effort (sessions) | 16–23 | 17–22 + a BE program | 18–24 |
| Biggest risk | memory with many live tabs | depends on a BE decision about team identity | third-party apps look first-party on a big stage |

## The base every direction needs (build it first, whatever the pick)

| Piece | What | Sessions |
|---|---|---|
| Process groups | Windows: a second `CoreWebView2Environment` with its own user data folder for chat, one per mini-app (separate folders = separate browser, renderer and GPU processes; WebView2 process model). macOS: `WKWebsiteDataStore(forIdentifier:)` for chat and per app. The shell stays on the default. This is perf lever #5 for desktop and makes SECURITY.md §1 true at the process level for chat versus the wallet (all conversations still share the chat group) | 2–3 |
| N-WebView host | extend the #225 overlay staging and the #247 pinned columns from "chat col 1 + info col 2" to tabs, splits, stage and dock | 1–2 |
| Native keys | all global shortcuts in C# (`AcceleratorKeyPressed`, browser accelerators off; macOS menu key equivalents). A page never triggers a global command | 1 |
| Palette + index | palette WebView in the chat group; in-memory index after unlock (Core `readLastMessages`), cleared on lock, nothing new on disk | 2–3 |
| Hello / Touch ID | after the native confirm when "Confirm payments" is on; WinUI skips it today (`SPayments.cs:65`) | 1 |
| **Total** | | **7–10** |

Every piece ships under #1312: a flag with the old path as fallback, a security-only #46 at high effort, a packet in `docs/be-review-pack/` (P24 onward) and a gate row.

## One rule for all three

Anything that renders peer content in full (message bodies, files, media, artifacts, history search) lives in the **chat** group. The **shell** shows money and may show peer text only as short plain-text labels (the #221 list rule). Third-party code lives in the **apps** group. They meet only in C#, and every money or agent action ends in a **native** dialog whose values come from C#. The X-ray switch on every frame shows this layout.

## My pick

**C as the shape, A's base underneath, B when BE has decided the team identity.**

1. Build the base (7–10 sessions). It is the same for all three, and it already delivers most of A's feel: the palette, native keys, the process split, Hello.
2. Then C's stage and shelf (11–14 more). It is the one direction no other messenger owns on desktop, it gives mini-apps and agent artifacts a reason to exist on a big screen, and it fits the agent strategy (artifacts, approvals, payments in the chat).
3. Add A's extras where people ask for them: tabs and split, pop-out windows, tray and toasts (each 1–3 sessions, independent).
4. B's single-seat parts (directory, ledger, tools dock) can come any time; the team inbox waits for BE's multi-device / QuIXI decision.

If you want one direction only: **A** is the lowest risk, **C** is the strongest story, **B** is the biggest market but the least in our hands.

## Questions before a build

| # | Question | For |
|---|---|---|
| 1 | Which direction (or the order above)? | Damir |
| 2 | Is the palette allowed to show message snippets (chat group), or names only? | Damir + BE |
| 3 | Desktop v1.1 assumes one device per account (the multi-device note) until linked devices land — confirm? | Damir + BE |
| 4 | Team inbox model: linked devices with roles, or a QuIXI-hosted business identity? | BE |
| 5 | One more browser process group for chat on Windows: accept the memory, measured on the office PC? | Damir |
| 6 | macOS: native window tabs need verification under Catalyst, and a menu-bar extra needs an AppKit bundle. Windows first? | Damir |
| 7 | Chat info on desktop: stripped (perf §2c option B) in the chat group, as the A renders show, or as today (#247)? | Damir + BE |

## What is real in the renders, what is not

- Real: `src/styles/tokens.css` (inlined as-is), the 101 icons of `src/components/icons.js`, the Sora wordmark face, the #228 desktop type step, the v1 screenshots (from `src/demo/desktop.html`).
- Drawn for the render: 41 extra icons in the same stroke weight (keyboard, command, robot, receipt, …), the Windows 11 and macOS 27 chrome, the native dialogs, toast and tray (copied OS look on purpose), and third-party mini-app content (chess, Split, Invoices — their own look on purpose).
- All names, addresses and amounts are fictional. The frames use the system UI face like the app does, so they show Segoe UI on Windows and SF on a Mac.

## Platform notes (2026)

- macOS 27 "Golden Gate" (June 2026) keeps Liquid Glass but makes sidebars edge-to-edge again, makes toolbars uniform, brings back sidebar icon colour and adds a transparency slider. The Mac frames follow that: edge-to-edge glass sidebar, coloured sidebar icons, capsule toolbar controls.
- Windows 11: WinUI `TitleBar` can host a search box (AutoSuggestBox) next to the caption buttons and is meant to pair with `NavigationView`; Mica is the window backdrop. The Windows frames follow that: Mica ground, a content layer with the 8 px corner, the search box in the title bar.

Sources: [9to5Mac — macOS 27 Golden Gate changes](https://9to5mac.com/2026/06/09/macos-27-golden-gate-includes-these-changes-that-tahoe-critics-will-appreciate/) · [Microsoft Learn — Title bar](https://learn.microsoft.com/windows/apps/design/controls/title-bar) · [Microsoft Learn — Mica](https://learn.microsoft.com/windows/apps/design/style/mica) · [Microsoft Learn — WebView2 process model](https://learn.microsoft.com/microsoft-edge/webview2/concepts/process-model)
