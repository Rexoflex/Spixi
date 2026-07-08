# Handoff → next session: Stage 4b bridge-wiring PROVEN on Windows. Next = deepen chat · wire more shells.

**Damir first:** all committed. The redesigned frontend now runs in the REAL Spixi app on
Windows with real account data (chats list + live 1:1 conversations, send/receive, status
ticks) — single-pane AND desktop dual-pane. Start a fresh Opus chat from this file.

## Boot ritual
`CLAUDE.md` (status tail) → `DECISIONS.md` rows **#175, #176, #177** → this file →
`docs/i18n-wiring-spec.md` → `docs/build-pipeline-spec.md` → `finalization-roadmap.md` Phase 3.

## What the last sessions did (Phase 3)
- **#175 i18n LIVE** — `src/components/strings-runtime.js` (`getStrings`/`setStrings` over
  `window.SL`, ARCHITECTURE §7). 92 component `strings={}` defaults + 10 shell `opts.strings||{}`
  → `getStrings()`; 9 demos wired (`?lang=de-de`, `?lang=pseudo` leak test). #46 audit CLEAN.
- **#176 build pipeline = extend custom scripts, NOT Vite** (Damir approved). `scripts/build-shells.mjs`
  + `scripts/lib/inline.mjs` inline demos/shells → self-contained files in `Spixi/Resources/Raw/html`
  per ARCHITECTURE §5. Stage 4a = mock-data drop-in over the legacy filename (zero C# change).
- **#177 Stage 4b bridge wiring PROVEN** — `src/shells/home.html` + `src/shells/chat.html` wired to
  the real C# bridge; real data end-to-end on Windows. See the contract below.

## The bridge contract (what's wired)
Transport = `src/bridge/native.js` (in the bundle as `window.Spixi.createNativeBridge` /
`installExecuteUiCommand`). C#→JS = `executeUiCommand(fnRef, b64…)` against **page globals**
registered via `bridge.exposeAll`. JS→C# = `location.href='ixian:…'` via `bridge.send`.

**home.html** (drop-in `index.html`, HomePage). In: `clearChats` · `addChat(wallet, from,
timestamp, avatar, online, excerpt, type, unread)` (home.js:397) · `clearChatsDone` ·
`selectChat` · `setUnreadIndicator` · `selectTab`. Out: `ixian:chat:<addr>` (open) ·
`ixian:tab:<tabX>` · `ixian:newchat` · `ixian:newcontact`.

**chat.html** (drop-in `chat.html`, SingleChatPage). In: `addMe(id,address,nick,avatar,text,time,
sent,confirmed,read,paid,errorSending)` (11-arg, home—chat.js:879) · `addThem(id,address,nick,
avatar,text,time)` (6-arg, chat.js:900) · `updateMessage(id,message,sent,confirmed,read,paid,
errorSending)` (status upsert, chat.js:1035) · `setChatMode(type,cost,costText,admin,botDesc,
notif)` · `setNickname` · `setOnlineStatus` · `clearMessages` · `deleteMessage` · `showUserTyping`
· `clearInput` · `onChatScreenReady`. Out: `ixian:chat:<encodeURIComponent(text)>` (send) ·
`ixian:back` · `ixian:typing` · `ixian:details`. Status map: errorSending→failed, read→read,
confirmed→delivered, sent→sent, else sending. Timestamps = Unix **seconds** → ×1000.

**Stubbed (safe console.debug no-ops, v1):** payments (`addPaymentRequest`/`updatePaymentRequestStatus`
/`updateTransactionStatus`), files (`addFile`/`updateFile`), `addCall`, `addReactions`, groups
(`updateGroupChatNicks`), channels (`addChannelToSelector`/`setSelectedChannel`/`setChannelSelectorStatus`),
`addApp`/`addAppRequest`/`clearApps`, `addContact`/`clearContacts`/`showContactRequest`,
`showCallButton`, `showRequestSentModal`, `showWarning`, `hideBackButton`, `setUnreadIndicator`.

## HARD-WON: the load-timing fix (don't regress it)
Fire `bridge.ready()` (`ixian:onload`) on the window **load** event, NOT synchronously during
parse — the premature signal RACED C#'s initial data push, so chats/conversations arrived EMPTY
until a manual refresh. Both shells end with:
`if (document.readyState==='complete') signalReady(); else window.addEventListener('load', signalReady, {once:true});`
This is why C# now pushes data on first entry. Any new bridge-wired shell must do the same.

## Workflow constraints (respect them)
- **Sandbox mount corrupts node file round-trips** (#175): it served truncated reads and wrote
  truncated files back, corrupting `backup-nudge.js` (65/84) + `desktop.html` (521/1861). **Edit
  source via the FILE TOOLS only.** Do NOT run node generators/migrations that read+write repo
  files in the sandbox. `git show HEAD:<path>` is reliable; the working-tree mount + bash `wc`/`git
  status` are NOT (phantom truncations). Verify edits via Read/Grep (truth), not bash.
- **Damir runs locally** (real terminal, PowerShell, no `&&`, one line at a time):
  `node scripts/build-demo-bundle.mjs` · `build-strings-iife.mjs` · then `node scripts/build-shells.mjs`
  (default = chat+home; `all` = every mapped shell) → then **F5** the `net10.0-windows` target in VS.
  CLI run 9009 = WinUI packaged-launch quirk → use VS F5 (or `-p:WindowsPackageType=None`).
- **Commit via GitHub Desktop only.** Every decision → a `DECISIONS.md` row. #46 audit loop
  (read-only agent, file-tools, file:line findings) per batch.
- Debug shells with F12 in the Windows WebView2 (DevTools enabled) or open the built file in
  **Edge** (= the same WebView2 engine). Stub handlers log via `console.debug` → enable **Verbose**.

## Next work (pick with Damir)
1. **Deepen chat** — wire the stubbed types: payment cards (`addPaymentRequest` + `ixian:viewPayment`),
   file transfer (`addFile`/`updateFile` + `ixian:openfile`/`acceptfile`), group sender labels/avatars
   (`updateGroupChatNicks`, `setChatMode` type 1/2), reactions (`addReactions` + `ixian:contextAction`).
   Contract = `Spixi/Resources/Raw/html/js/chat.js` fn signatures + `SingleChatPage.xaml.cs`.
2. **Other shells** — bridge-wire `wallet`/`apps`/`settings`/`launch` the same way (currently
   mock drop-ins). Each: read its C# page's sendUiCommand set + legacy js handlers, author a
   `src/shells/<name>.html` following the home/chat pattern (+ the load-timing fix), repoint
   build-shells manifest.
3. **Android pass** — `maui-integration-test-plan.md` Round 1 (mobile single-page = our wiring target).
4. **Desktop rewrite** — Damir is redesigning the desktop experience (NOT the legacy split-view
   that reparents `SingleChatPage.Content`, HomePage.xaml.cs:778). Build fresh on the bridge-wired
   shells; the `#19`/desktop-split-spec is the starting point.

## Key files
`src/shells/{home,chat}.html` · `scripts/build-shells.mjs` + `scripts/lib/inline.mjs` ·
`src/bridge/native.js` · `src/components/strings-runtime.js` · `docs/{i18n-wiring,build-pipeline}-spec.md` ·
`Spixi/Pages/{Home/HomePage,Chat/SingleChatPage}.xaml.cs` · `Spixi/Resources/Raw/html/js/{home,chat}.js`
(legacy contract) · `ARCHITECTURE.md` §5/§7/§9 · `DECISIONS.md` #175–#177 · `CLAUDE.md` status.

## Parked / flags
Benign `file:` unique-origin console error = an empty avatar `src=""` (not blocking; tidy later) ·
home requests-pane not fed by HomePage contract (requests stay []) · avatars = gradient (C# avatar
paths don't resolve in self-contained shells; needs data-URI or a resolvable path) · i18n: shells
pass `strings:{}`/`window.SL` — default en-us fine, revisit for live locale switch.
