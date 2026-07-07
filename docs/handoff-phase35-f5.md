# Handoff → next session: Phase 3.5 after the Damir F5 rounds (chat/chats-list depth)

Paste-in for a fresh Opus chat. This session did **Track B chats-list depth (#189)** then a run of **live-app F5 fixes (#190/#191)** on the chat + chats-list surfaces. The code is written; what's left is the **#46 audit** on the F5 batch, Damir's build+F5+commit, and then the **next zero-C# batch** (decisions already captured) before the one BE cutover.

## Boot ritual (read in this order)
`CLAUDE.md` (status tail) → `DECISIONS.md` rows **#191, #190, #189** (this session, newest first) + **#186–#188** (the Phase 3.5 model + Track A patterns) → **this file** → `docs/gap-audit.md` (§2 chats, §1 chat) → `docs/be-cutover-brief.md` (the batched C# asks — Chat C-rows, **Chats-list CH1–CH7**, W/S/A/L, cross-cutting N1/N2/A8) → the shells you'll edit: `src/shells/chat.html`, `src/shells/home.html`, and their C# contracts `Spixi/Pages/Chat/SingleChatPage.xaml.cs` + `Spixi/Pages/Home/HomePage.xaml.cs`.

## The decided model (Damir — do NOT re-litigate)
- **No legacy design remains in the final app.** Wire the redesign where the FROZEN bridge supports it; where BE can't yet drive a feature, omit it behind a capability flag (built + ready). Never left on legacy, never shown broken.
- **Build FE now, batch every C# ask** into the one BE cutover (`be-cutover-brief.md`). Bridge stays frozen — no C# edits.
- Per-batch loop: build → **#46 read-only audit** (file tools; sandbox #175 truncates the shells) → fix → Damir `build-demo-bundle`(if a component changed)+`build-shells`+`smoke-test`+F5 → DECISIONS row → commit.

## STATE RIGHT NOW (as you pick up)
The F5 batch (#190/#191, incl. F5 r3 additions) is **in the working tree**. The **#46 audit RAN and is CLEAN** (1 MAJOR fixed — the C# reveal is now exception-safe; dead `mode.isGroup` removed; remaining MINORs are by-design/documented). Damir was about to:
1. `cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi" && node scripts/build-demo-bundle.mjs && node scripts/build-shells.mjs && node scripts/smoke-test.mjs`
2. **Rebuild the MAUI app** (this batch touched C# — `SingleChatPage.xaml.cs` — not just web assets).
3. F5 → **commit**.

If you're a fresh session AFTER that commit, this batch is DONE — go to the **next zero-C# batch** below. If the commit hasn't happened, confirm state with `git status` before touching anything.

### ⚠ This batch touched C# (one file)
`Spixi/Pages/Chat/SingleChatPage.xaml.cs` — the **entry-darkness fix (N1, solution #1)**: `webView.FadeTo(1,150)+Focus()` moved from BEFORE `Task.Run(loadMessages…)` to AFTER `onChatScreenLoaded`, inside a `try/finally` (audit M1 — reveal must always run) via `MainThread.BeginInvokeOnMainThread`. So entering a chat = brief themed-load → finished chat in one reveal (no empty/spinner flash). NOT a bridge change; it's a page-lifecycle tweak. Full preload/reuse (#2/#3) is deferred.

### What changed in the F5 batch (audit scope)
Component files (**need `build-demo-bundle`**), both `node --check` GREEN:
- `src/components/avatar.js` — `<img>` `onerror`→gradient fallback (extracted `renderPlaceholder`).
- `src/components/typed-bubbles.js` — `createAppBubble` renders Decline ONLY when `onDecline` is passed (was a dead button).

Shell-only (no rebuild for these, but the batch rebuilds anyway for the two components above):
- `src/shells/chat.html`:
  - **Flicker**: `renderLogNow` builds a `DocumentFragment` + `box.replaceChildren` (atomic, never blank); **load-burst gate** (`bursting`/`beginBurst`/`armBurstSafety`/`endBurstAndRender`) — `clearMessages` starts a burst (no render), renders suppressed while messages stream, `onChatScreenLoaded` paints once; **removed the script-end empty-notice paint** (boot spinner stays until first real render) + `firstRenderDone` flag + 500ms post-`ready` fallback.
  - **Composer autofocus** on `onChatScreenLoaded` (`focusComposer`).
  - **React/tip on file+payment+app cards**: `wireMenu` no longer early-returns for non-text (excludes only `call`).
  - **Remote GIF/image tiles** (Damir chose legacy-parity client-fetch — **reopens #82, flag for BE/security sign-off**): `mediaUrlOf` (direct media ext OR `media*.tenor.com`/`media\d*.giphy.com`/`c.tenor.com`) → `buildMediaRow` → `createMediaBubble` (tap-to-load play button → viewer). Media CSS links added. `createMediaBubble/setMediaSrc/openMediaViewer` imported (already bundled).
  - **Chat avatars**: `resolveAvatar` → per-message `rec.avatar` (`addMe`/`addThem`) → `createMessageBubble` avatar; 1:1 topbar peer avatar captured from first `addThem` → `identity.avatar`.
- `src/shells/home.html` (from #189/#190): live `setContactStatus`, `addChat` upsert + coalesced render, excerpt `decodeEntities` (the `&#x2764;` bug), chats-list avatars via `resolveAvatar`.

Audit focus points: burst-gate correctness (no partial paint mid-flush; safety re-arms; empty-chat path renders via the 500ms fallback), `mediaUrlOf` false-positives (page URLs must stay links), avatar onerror/gradient in both themes, no double-render, menu on typed cards doesn't break reactions anchor, RTL/a11y.

## NEXT zero-C# batch (decisions captured — build after the audit/commit)
1. **Excerpt canon (best-effort, en-us)** — Damir chose zero-C# now (CH6). Reverse-map the English C# `_SL` excerpt strings (`index-excerpt-file`/`-payment-*`/`-voice-call`/`chat-app-invite-*`/`chat-waiting-for-response`, + the `index-excerpt-self` "Sent a " prefix — see `getFriendMessageHelper`, HomePage.xaml.cs:907-970) → excerpt KIND, render the built canon glyphs in `home.html` `addChat`/`setContactStatus` (chatlist-item supports file/gif/call/call-missed/payment/app-invite/draft/mention). Degrades to plain text in other locales; missed-vs-answered call can't be split (C# collapses both). Full end-state = CH6 BE enum.
2. **Composer drafts** — Damir chose WebView localStorage (CH7). `chat.html` saves the composer text (debounced) keyed by peer address on input/leave, restores on open, clears on send; `home.html` reads the same store for the built **"Draft:"** excerpt (chatlist-item `draft` type). A draft is the user's own unsent text (not history) → SECURITY.md-OK.
3. **Delete-chat two-step modal** (CH3) — Damir chose two-step: Delete removes the row; a SECOND choice opts into wiping on-device history + media/downloads + removing the contact. Build the modal FE now; the **actual wipe needs the BE verbs** (`removehistory`/`remove` are on SingleChatPage/ContactDetails, NOT HomePage dispatch) → the modal is ready, persistence lands at the cutover. Don't show it as working if it can't persist — gate or clearly flag.
4. **"Open file" affordance** (A8b) — a completed file bubble already opens on tap (`ixian:openfile:<fileid>`); add an explicit "Open file" label in the `complete` state (`file-bubble.js`, component change → rebuild).

## BE cutover asks (all in `be-cutover-brief.md` — the one C# pass)
- **Chat**: C1–C4 (payment enums/fiat/inline-Pay decision/**enriched call incl. direction** — the outgoing-call-on-the-left bug) · C5 (reaction own-flag) · C7 (**app decline verb + non-empty install URL** — "Get app" no-op) · C8 (more emoji) · C9 (bot-tip bug).
- **Chats list**: **CH2** (contact-request feed + accept/decline/handshake verbs — the in-chat pane is a stopgap; the rich card belongs in the list) · CH1 (group-type flag → Groups filter) · CH3 (delete/mark-read persistence + history/media wipe) · CH4 (pin/mute/favorites + mute-aware total) · CH5 (mention flag).
- **Cross-cutting**: **N1** (chat-open blue flash = native WebView bg; trivial dark BackgroundColor or preload-then-present) · **N2** (redesigned call surface repoint — the "legacy call banner") · **A8** (media-vs-file flag for P2P media tiles + "view in downloads" verb) · **§82** (sender-composed link-preview meta — website OG card is CORS-blocked client-side, can't be zero-C#) · avatars in self-contained shells (path resolves in-WebView — CONFIRMED working on Damir's F5; the "doesn't resolve" flag is RESOLVED).
- **⚠ #82 policy**: remote GIF/image tiles now client-fetch (Damir: legacy parity) — this REVERSES #82's no-auto-load stance and leaks the reader's IP to the host on load. Needs BE/security sign-off; #82 still holds for anything not opted into here.

## Working constraints (unchanged)
- **Sandbox #175**: the mount serves TRUNCATED reads of the large shells (`chat.html`/`home.html`) → node/jsdom can't validate them in-session. Verify shell edits via the **file tools** (Read/Grep), not bash cat/grep. Component files (small) `node --check` fine. Bundle+smoke = Damir's local step.
- If you edit a component: `build-demo-bundle` FIRST, then `build-shells`, then `smoke-test`.
- Bridge FROZEN. No C# edits. BE-gated features ship behind capability flags.
- Commit via GitHub Desktop (delete a stale 0-byte `.git\index.lock` if it blocks).

## One-line status
Track B #189 + F5 fixes #190/#191 are written and un-committed; the #46 audit on the F5 batch is owed (Damir will greenlight after his test), then commit, then the next zero-C# batch (excerpt canon · drafts · delete modal · open-file), then the one BE cutover.
