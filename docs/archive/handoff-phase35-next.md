# Handoff → next session: Phase 3.5 depth. TRACK A (Chat) DONE → START = Track B (Chats-list depth).

Paste-in for a fresh Opus chat. Breadth wiring (#177–#185) put every single-pane surface on the real bridge shallowly; the #186 gap audit defined **Phase 3.5** to close the depth. **Track A — Chat depth is COMPLETE** (#187 payment/call view-only cards; #188 context menu / member sheet / attach sheet / link confirm / start-call / banner / contact-request pane / tip pill / app-invite / reaction own-state / blank-flash + 3 Damir F5 rounds). This session builds **Track B — Chats-list depth**.

## Boot ritual (read in this order)
`CLAUDE.md` (status tail) → `DECISIONS.md` rows **#186** (gap audit + Phase 3.5 + decisions) + **#188/#187** (Track A chat depth — the wiring patterns you'll reuse) + **#182** (home shell = chats tab1 + wallet tab2, the file you'll edit) → **this file** →
`docs/gap-audit.md` **§2 Chats list** (the file:line backlog) →
`docs/finalization-roadmap.md` **§Phase 3.5 Track B** →
`docs/be-cutover-brief.md` (batched C# asks) →
`src/shells/home.html` (the shell you're editing — chats list is tab1) + `Spixi/Pages/HomePage.xaml.cs` (the frozen C# contract).

## The decided model (Damir — DON'T re-litigate)
- **NO legacy design remains in the final app.** Wire the redesign where the FROZEN bridge supports it; where BE can't drive a feature yet, **omit it behind a capability flag** (`SPIXI_ENV.capabilities` → `bridge.cap('name')`, default off) — built + ready to switch on when C# lands. Never left on legacy, never shown broken.
- **Build FE now, batch every C# ask** into the one BE cutover pass (`be-cutover-brief.md`). Bridge stays FROZEN — no C# edits.
- Per-sub-batch loop: build → #46 read-only audit (file tools, #175 truncates large files) → fix → Damir `build-shells`(+`build-demo-bundle` only if a component changed)+`smoke-test`+F5 → DECISIONS row → commit.

## Track B — Chats-list depth (this session). Source of truth: `docs/gap-audit.md` §2.
`src/shells/home.html` tab1 vs `HomePage.xaml.cs`. Already wired: list flush, unread nav badge, client search + filter chips, open chat, FAB→`newchat`, topbar→`newcontact`, live timestamp ticker. **Backlog (order = value, zero-C# first):**
1. **[BUG, 0C] Live status is no-op'd** — HomePage pushes `loadContacts`/`clearContacts`/`addContact`/`setContactStatus`/`updateContactStatus` every tick (xaml:840-861/1504) but home.html registers them as no-op stubs (home.html:602-604) → online-dot/unread/excerpt only change on a full `loadChats` flush. **Wire them** (or explicitly drop with reason). This is Damir's "filters/status" complaint territory.
2. **[BE] Groups filter is dead** — `addChat` sends no group-type flag (xaml:1030) → `chatMatchesFilter('groups')` always empty. Damir F5: "in 2 groups, Groups filter shows nothing." Needs a type flag on `addChat` (batch to cutover); FE filter logic is ready. Also confirm the OTHER chips (All/Unread/Favorites) actually filter — Damir F5 said "clicking filters does nothing," investigate whether it's the group-flag gap or a broader wiring bug.
3. **[BE] Contact-request feed + #109 handshake — built but UNFED.** `state.requests` hardcoded `[]` (home.html:204); HomePage only pushes `loadChats`, so requests arrive as ordinary rows. `createContactRequest` Accept/Decline never render. Needs a request-feed push + accept/decline/complete verbs. (Note: the in-CHAT request pane IS wired now, #188 — different surface.)
4. **[BE] Delete / mark-read revert** — row-menu edits are local-only (`onPersist:()=>{}`, home.html:213), wiped on the next refresh. Needs persistence verbs.
5. **[0C/BE] Pin / mute / favorites / swipe** parked (`capabilities:{}`, home.html:205). Persistence = BE.

## Outstanding from Track A (context for whoever picks these up)
- **[DEC] Chat-info takeover** = ContactDetails **shell repoint** (its rich actions — rename/delete/remove/roster — live on ContactDetails, not SingleChatPage; header tap stays `ixian:details` interim). Not an in-chat.html job.
- **[DEC] GIF auto-render (#82)** — Damir F5: legacy auto-rendered remote GIF links; #82 deliberately does NOT (IP-privacy) → link becomes a confirm-to-open button. **Confirm the stance or reopen #82.**
- **[BE cutover] Chat asks:** C1–C4 (payment enums/fiat/inline-Pay decision/enriched call) · C5 (reaction own-flag — persistent own-state) · C8 (more emoji reactions) · C9 (**bot-tip bug** — drop `friend.bot ||` at xaml:942) · N1 (**blue chat-open flash** = native WebView bg during nav; fix = dark WebView BackgroundColor + Damir's preload-then-present idea) · N2 (call UI = separate call-surface repoint).
- **Deferred FE (not BE):** lazy-history (C# full-reflush incompatible with `attachLazyHistory` — needs C# prepend or flush-complete signal) · unread divider (no read-boundary signal) · media tiles A8 (media-vs-file flag) · multi-select in chat (`select:false`, needs chat-select.js + css).

## Working constraints (unchanged)
- **Sandbox mount truncates large files (#175, PC).** `chat.html` reads short in-session → verify edits via the file tools + the strict inliner; node/jsdom bundle+smoke is **Damir's local step**. Use file tools, not bash greps, for large-file truth.
- Per-batch loop: build → #46 read-only audit agent (adversarial, file:line) → fix → re-review CLEAN → Damir F5 → DECISIONS row → commit via GitHub Desktop (delete a stale 0-byte `.git\index.lock` if it blocks).
- If you edit a component: `node scripts/build-demo-bundle.mjs` FIRST, then `build-shells.mjs`, then `smoke-test.mjs` (Damir, locally).
- Bridge FROZEN. No C# edits. BE-gated features ship behind capability flags.

## Damir F5 round 1 notes (2026-07-07) — logged from live testing after A1

**A1 verified:** flicker solved ✓. Two A1 follow-ups:
- **Blank dark-blue chat pane for ~½s on open** ("disgusting") — the WebView shows empty background during page navigation+parse before first paint. Mitigate: match the WebView/shell background so there's no dark flash, and paint the shell chrome (topbar skeleton + secure notice) as early as possible. **DO as part of chat-screen completion.**
- **Amount display — RESOLVED ✓** (Damir re-tested: 1 IXI / 2 IXI render correctly). The earlier "0 IXI" was the account/data issue, not the shell; the `formatIxiAmount` #76/#77 amendment holds.

**Chat-screen items (do in this autonomous push):**
1. **Right-click / long-press message menu does nothing** — no react/delete/tip/copy. → A2 (`attachMessageMenu`).
2. **Clicking an in-text link does nothing** — URLs are plain text (no `onLinkClick`). → wire linkify + confirm modal → `ixian:openLink` (exists).
3. **GIFs show as a bare link in a bubble; legacy renders the GIF fully.** These arrive as a TEXT message containing a URL. **Privacy divergence:** the redesign decided NOT to auto-load remote media (#82 — IP leak); a link becomes a confirm-to-open button, rich preview is sender-composed §8 (BE). So legacy's auto-render is intentionally NOT replicated for remote URLs. **P2P-transferred images/GIFs** (via addFile) → media tiles behind a cap flag (media-vs-file = the open BE flag). **FLAG to Damir at test:** confirm the no-auto-load stance vs legacy parity; if he wants auto-render, that reopens #82.

5. **Reaction pill doesn't show a selected state when I react** — a heart already placed by someone else just increments its count when I also react; the pill never shows the "you reacted" selected style (works in the demo). Root cause: `own:false` is hardcoded because the bridge's `addReactions` sends only `key:count`, no per-user flag (**C5** [BE]). Zero-C# interim (do in A2): optimistically track the msg-ids I like THIS session → render `own:true` immediately; historical own-state (a like from a previous session, re-pushed on load) still needs the C5 BE flag. **FLAG at test.**

**A5 chat-info takeover — DEFERRED with a finding (needs a decision):** `createChatInfo`'s rich actions live on the **ContactDetails page's** bridge, NOT SingleChatPage's — nickname/rename (`ixian:userdefinednick`), delete-history (`ixian:removehistory`), remove-contact (`ixian:remove`), and the full member roster are all absent from the frozen SingleChatPage dispatch (verified lines 130–352). `ixian:details` navigates to ContactDetails. So a faithful redesigned takeover must be the **ContactDetails/group-details shell repoint** (like `settings.html`), not an in-`chat.html` wiring — doing it in-chat would be a thin, regressive 1:1 surface (address/QR only, no remove/rename). **Interim:** header tap stays `ixian:details` (legacy) until that shell is repointed. **[DEC] for Damir:** fold chat-info into the ContactDetails repoint (recommended), or accept a lightweight in-chat info (groups: members-from-nicks + leave + notifications; 1:1: address/QR) now. This supersedes the naive gap-audit "wire createChatInfo in chat.html."

**Track B (chats-list — NOT the chat screen, deferred):**
4. **Filter chips do nothing; in 2 groups but the Groups filter shows no change.** Groups filter is dead because `addChat` sends no group-type flag (gap-audit §2, [BE]); the other chips being inert needs investigation too. → Track B.

## After Track A
Tracks B–H (chats-list · scan+lock · contacts · wallet money · settings auto-save · apps · cross-cutting) per `finalization-roadmap.md` §Phase 3.5 → full-app Windows test → C# §5 repoint → Android → the one BE cutover pass → Phase 4 freeze.
