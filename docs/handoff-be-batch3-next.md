# Handoff — BE-cutover batch 3 → next chat (2026-07-09)

**Role.** Continue the Spixi frontend redesign as the Opus **BE-cutover + FE-depth** agent.
One BE row = one tiny JS+C# co-change, Damir F5-confirms before the next.

**Read first, in order:** `CLAUDE.md` (status tail) → `DECISIONS.md` (tail, latest = #213) →
`docs/be-cutover-brief.md` (the row list) → `docs/be-conventions.md` (bridge rulebook) +
`docs/fable-be-workorder.md` (the 🟢 do / 🟡 human / 🔴 never fence).

## The fence (non-negotiable)
🟢 do · 🟡 human-only · 🔴 never. **Money / signing / wallet-password / credentials are HUMAN
ONLY (🔴/🟡).** If a 🟢 row turns out to need a signing or wallet change, STOP and flag it.

## Just landed & COMMITTED (batch 2b, DECISIONS #213) — do NOT redo
All F5-confirmed by Damir and committed.
- **C11 — group/bot delivery ticks (DONE).** `SingleChatPage.updateReactions(msg_id,channel)`
  now re-pushes `updateMessage(fm, channel)` after `updateReactions(fm)`, **guarded to
  `fm.localSender`** (only own messages carry a tick; received rows would force a needless
  re-render). Group `received:`/`seen:` aggregates now advance the tick (1:1 already worked via
  `msgReceived`/`msgRead`). H1 confirmed (flags DO flip in Ixian-Core).
- **C13 — push local user's nick (DONE).** `SingleChatPage.onLoad` →
  `sendUiCommand(this,"setSelfNick", IxianHandler.localStorage.nickname)`; shell `setSelfNick`
  handler feeds `selfMentionKeys()`. Lit up self-mention emphasis + the @ jump FAB.
  ⚑ **RULE (learned the hard way): the redesigned self-contained shells build `window.SL` from
  the BUNDLED dictionary, NOT from `*SL{}`/`addCustomString`. Feed a shell ONLY via
  `sendUiCommand` pushes — never `addCustomString`.**
- **@ jump-to-mention FAB — Telegram-style catch-up (DONE, shell-only).** Counts every unseen
  @me anywhere; persists the seen set per peer (`spixi.mentions.seen.<addr>`, mirrors `myLikes`);
  jumps **newest-first**; sits in the primary bottom slot and rises above the scroll-latest
  chevron only when it's shown.
- **#46 audit loop:** ran CLEAN (independent reviewer, 0 MAJOR/MINOR).

## Just landed & pending Damir F5 (batch 3, DECISIONS #214) — do NOT redo
**C7 — app-invite decline + always-carry-install-URL (DONE, #46 CLEAN).**
- **C7(a) decline = FE-LOCAL persistent "Declined" card, NO C# verb.** Damir mid-batch:
  "feels weird that it just disappears" → the invite STAYS and flips to a terminal `'declined'`
  state (not a delete/vanish). Declined message-ids persist per peer in localStorage
  (`spixi.app.declined.<addr>`, same pattern as `myLikes`) so it survives a C# re-flush + re-open.
  Pure FE: `chat.html` `declinedApps` set + `loadDeclinedApps()` (per-peer reset in
  `onChatScreenReady`) + `declineApp(id)`; `buildAppRow` renders `'declined'` for incoming and
  withdraws the handler once declined; `typed-bubbles.js createAppBubble` adds the terminal
  `'declined'` state (no buttons). **The first C#-verb cut was REVERTED** — SingleChatPage has
  NO `declineApp` verb; don't re-add one. Sender NOT notified, message NOT deleted.
- **C7(b) install URL:** `MiniApp` ctor remembers the source `app_url` in `.url` when no explicit
  `url=` line (fixes fetch/extractAppInfo dropping the origin → empty-URL "Get app" no-op).
  ⚠ Only fills the URL for apps FETCHED after the fix — a pre-fix app has an empty `url` persisted
  (unrecoverable on reload), so **re-install the app from its URL to test Get app**.
- **C7 follow-up (Damir F5, 2nd #46 pass CLEAN):** (i) FE now hides "Get app" when the invite has
  no URL (was a dead button that no-op'd); (ii) the invite carries the app IMAGE url
  (`getAppInfo` → `id||url||name||image`, additive/backward-compat) so the receiver shows a real
  icon for an app it doesn't have (SingleChatPage Missing branch, `http`-gated; FE `<img>`+rocket
  fallback). **PRIVACY — gated** (Damir "privacy first"):
  the remote icon renders only when the media-autoload pref (`mediaAutoloadOn()`) is ON, else
  rocket fallback; local installed-app icons never gated. **These are the ONLY C# changes; decline
  + the icon gate are FE-only.**
- **C7 deferred follow-ups (F5, 2026-07-09 — NOT bugs in C7, logged for the desktop/app-invite
  pass):** (1) **split-view only:** returning from AppDetailsPage after installing does NOT
  refresh the invite card (still shows Get app until you fully leave+re-enter the chat) — because
  the desktop split-view chat is a reparented WebView pane and `SingleChatPage.OnAppearing`
  doesn't fire on that return; **single-window works correctly** (OnAppearing→reloadScreen→
  loadMessages re-reads getApp → flips to Join). Fix at the desktop pass (trigger a chat reload
  after install, or detect the app-list change on the per-second tick). (2) **UX idea:** after
  install, offer "Join" directly from the AppDetailsPage modal instead of returning the user to a
  stale invite card. (3) **CH3-class (separate):** in-chat message Delete doesn't persist across
  reload + doesn't refresh the chats-list excerpt (local delete never calls `updateChat`; reappear
  points at `friend.deleteMessage` persistence — Ixian-Core).
- **C7 in-session fix (Damir F5):** after joining an app the card kept showing Decline/Join
  because C# never signaled an active session. Now `SingleChatPage` sets `app_state="Minimized"`
  when `getAppPage(friend.walletAddress, app_id)` is live; FE maps `Minimized→'in-session'`
  (Resume→`joinApp`; End gated off, no verb). Logged pre-existing: Resume spawns a NEW session
  (`onJoinApp` has no reuse path) and `hasUser` also matches a group session with the friend
  (edge) — both bridge-level follow-ups, not blocking.
- ⚑ **FUTURE flagged (be-cutover C7 OPEN):** a decline-**notify** variant (tell the inviter) is
  wanted later — that WILL need a new C# stream message (StreamProcessor/Ixian-Core), its own row.
- Component changed (`typed-bubbles.js`) → **FULL build**: `build-demo-bundle` → `build-shells`
  → `smoke` → F5 (incoming invite: Decline → card flips to "Declined" + persists on reopen,
  sender unaffected · app you don't have: Get app installs · own invite still Cancel) → commit.

## C8 — arbitrary emoji reactions: ⛔ BUILT then REVERTED → 🟡 BE/core (DECISIONS #215)
The mandated Ixian-Core check LOOKED 🟢 (the reaction store holds `tip:`/`fileReceived:` beside
`like:`), so C8 was built zero-core (C# `case "react"` + FE emoji menu, #46-CLEAN). **But Damir's
on-device F5 proved core persists ONLY `like` for USER reactions** — every other key (raw emoji AND
ASCII shortcodes) renders live but is dropped on reload (`tip`/`fileReceived` persist only because
they're app/system-added, not user `contextAction` `addReaction`). So C8 needs an **Ixian-Core**
change (persist arbitrary user-reaction keys). **All C8 code was reverted to exactly pre-C8**
(grep-clean). Kept as a BE recommendation (be-cutover C8) with the full FE+C# re-apply plan in
DECISIONS #215. **Lesson: the store holding system keys ≠ user reactions are key-agnostic; flag
🟡 pending an on-device persistence F5 before building a reaction/persistence row.**

## Just landed & pending Damir commit (DECISIONS #216)
**A1 — apps-tab uninstall (DONE, F5-CONFIRMED "works well", #46 0 MAJOR).** New `ixian:uninstall:<id>`
in `HomePage` (`onUninstallApp` → `MiniAppManager.remove` + `loadApps(true)`); FE `home.html` apps
`appMenu:true` + `onUninstall` — un-gates the ⋮ menu. Parity NITs logged (uninstalling a RUNNING app
can throw / dangle a session — pre-existing in AppDetailsPage, be-cutover A1 backlog).
**A2 — Discover (Damir clarified): KEEP the banner (website link, legacy), drop only the IN-APP
feed.** The Explore banner STAYS + links out to the mini-apps website (`ixian:spixiAppsLink`,
external browser — compliant, it's an outbound link not an in-app catalog); the in-app Discover
FEED (apps-feed.js) stays parked. Net = NO functional change (an interim banner-hide was reverted;
`home.html` keeps `discover:false` = "no in-app feed" + `onExplore→ixian:spixiAppsLink`). #46 CLEAN.
Commit A1 (+ the A2 comment/no-op) together.

## Next work-order (pick the top 🟢 row, one at a time)
`docs/fable-be-workorder.md` order, minus what's done:
1. **X1** (avatar/app-icon **data-URI push** — Damir chose Option A; FE is ready, degrade-to-gradient
   wired — a clean C# encode-at-each-push-site row + a shared `Utils.imageToDataUri(path)` helper).
2. **CH2 / CH3 / CH4** — chats-list persistence cluster (contact-request feed + verbs · delete/
   mark-read persistence + history/media wipe · pin/mute/favorites). Bigger; new verbs. CH4 likely
   Ixian-Core metadata → flag. (CH3 also covers the in-chat delete-persistence gap from the C7 F5.)
3. **S14** + the §9 settings family (save-without-pop verb, notif/privacy reachability).
- 🟡 human: L1–L4 (wallet create/restore), change-password/security-level. 🔴 never: C1/C2/C3/C6/
  C9/C10 (payments/tips), W1–W8 (wallet).

## How each 🟢 row goes (the pattern)
1. Read the row in `be-cutover-brief.md` + its cited file:line; confirm it's not money/signing.
2. Find the nearest existing `sendUiCommand` push (C#→JS) or `onNavigating` `else if` branch
   (JS→C#) and copy its exact shape. **New push args go at the END only; never reorder.**
3. C#: add the one push/verb + small handler. JS: add/adjust the matching shell handler or
   `bridge.send('ixian:verb…')`. Cite the row id in a one-line comment. Tiny diff.
4. **Feed shells via `sendUiCommand` pushes, never `addCustomString`** (C13 lesson).
5. Run the **#46 audit loop** when the unit is complete (self-audit + an independent adversarial
   reviewer agent reading the real files) → fix → re-review until CLEAN.
6. Update DECISIONS (new row) + mark the be-cutover row + refresh this handoff.
7. Hand build + F5 to Damir (see below). One row committed before starting the next.

## Build / verify — Damir's machine only (sandbox CANNOT build)
- **Shell-only change** (chat.html / home.html / etc.): `node scripts/build-shells.mjs`.
- **Component change** (`src/components/*`): also `node scripts/build-demo-bundle.mjs` FIRST,
  then `build-shells`. Then `node scripts/smoke-test.mjs`.
- **App:** F5 in Visual Studio with the **`net10.0-windows10.0.19041.0`** target selected
  (NOT "Rebuild All").

## Environment quirks (this PC) — important
- **bash/`node` sandbox mount serves STALE / TRUNCATED copies of session-edited files**
  (#175/#165). Use the **file tools (Read/Write/Edit/Grep)** — they hit REAL disk. `node --check`
  / smoke are Damir's local step. `rm` on the mount needs the cowork delete tool (bash rm →
  "Operation not permitted").
- **CLI build gotcha:** the Windows TFM is `net10.0-windows10.0.19041.0`; a bare
  `-f net10.0-windows` → `NETSDK1135`. Prefer VS **F5** (only builds the active target).
- **Pre-existing Android build break (NOT ours):** `Spixi (net10.0-android)` fails in
  `ActivityStorage.cs` because `RocksDB 0.0.42` isn't on the feed → wrong RocksDbSharp API
  resolves (NU1603). Surfaces only on **Rebuild-All**; Windows F5 is unaffected. Flag for the
  RocksDB-dependency owner before any Android testing (Phase 2/6).
- Corrupt `.git/index` remedy: `rm .git/index && git reset` (working tree intact).
- Ixian-Core is READ-ONLY reference (`Friend`/`FriendType`/`ReactionData`/etc.). A row needing a
  core change is Damir's / a core PR.
- MCP connectors (Slack/Figma/Linear/Notion/Atlassian/Intercom) need interactive auth — n/a here.

## Prior handoff
Archived: `docs/archive/handoff-be-batch2-mentions.md`.
