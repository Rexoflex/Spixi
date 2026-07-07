# Handoff → next session: Phase 3.5 depth wiring. START = Track A (Chat depth).

Paste-in for a fresh Opus chat. The launch shell (#185) finished the **breadth** wiring — all single-pane surfaces are on the real bridge, but shallowly. A full gap audit (#186) catalogued the **depth** still owed and defined **Phase 3.5** to close it. This session builds **Track A — Chat depth** (Damir's pick).

## Boot ritual (read in this order)
`CLAUDE.md` (status tail) → `DECISIONS.md` rows **#186** (gap audit + Phase 3.5 + decisions) + **#185** (launch) + **#177/#178/#180/#181** (the chat bridge-wiring lineage) → **this file** →
`docs/gap-audit.md` **§1 Chat** (the file:line backlog you're working from) →
`docs/finalization-roadmap.md` **§Phase 3.5** (the 8-track plan) →
`docs/be-cutover-brief.md` (the batched C# asks — chat rows C1–C7) →
`src/shells/chat.html` (the shell you're editing) + `Spixi/Pages/Chat/SingleChatPage.xaml.cs` (the frozen C# contract).

## The decided model (Damir — DON'T re-litigate)
- **NO legacy design remains in the final app.** The redesign replaces every legacy page. Wire the redesign where the FROZEN bridge supports it; where BE can't drive a feature yet, **omit it behind a capability flag** (`SPIXI_ENV.capabilities`, #115) — built + ready to switch on when C# lands. Never left on legacy, never shown broken.
- **Build FE now, batch every C# ask** into the one BE cutover pass (`be-cutover-brief.md`). Bridge stays FROZEN — no C# edits.
- Money = WebView composes, C# signs. Settings = auto-save + selective toast. FAB → contacts shell.

## Interview-2 resolutions (apply as you build)
- **Chat payments & calls = view-only cards NOW** (best-effort status map from the lossy localized strings), upgrade to inline Pay/Decline + rich call info when BE sends clean enums (C1–C4).
- **Chat-info = redesigned `createChatInfo` takeover** (replaces the legacy `ixian:details` page).
- Contacts (Track D, later) = embed in home shell for v1, built as a portable `src/bridge/contacts-page.js` module. `settings_lock.html` (Track C) = redirect to a lock-shell set-lock view.
- **One open BE flag:** media-vs-file signaling (Track A media tiles build behind a capability flag regardless — doesn't block).

## FIRST: close out #185 (launch) if not already committed
The launch batch changed a component (`launch-shell.js`), so the committed bundle is stale. Damir must, once, locally: `node scripts/build-demo-bundle.mjs` → `node scripts/build-shells.mjs launch` → `node scripts/smoke-test.mjs` → F5 → commit. Start Track A from a clean committed tree.

## Track A — Chat depth (this session). Order: zero-C# first.
All target components ALREADY EXIST in the shipped bundle (message-menu.js, typed-bubbles.js `createPaymentBubble`/`createCallBubble`, member-sheet.js, chat-info.js, media-bubble.js, media-viewer.js, attach-sheet.js, contact-request.js, lazy-history.js, banner.js). So most items are **shell WIRING in `src/shells/chat.html`** — like #178/#184, often **no component change → no bundle rebuild** (only rebuild if you edit a component). Suggest sub-batches (A1, A2…), each: build → #46 read-only audit (file tools, #175) → fix → Damir F5 → DECISIONS row → commit.

Concrete items (file:line in gap-audit §1):
1. **[0C] Payment + call view-only cards** — `addPaymentRequest`/`updatePaymentRequestStatus`/`updateTransactionStatus`/`addCall` are console stubs today (chat.html:566-568/598). Import `createPaymentBubble`/`createCallBubble`; map the localized `title`+`statusIcon`→role/status (best-effort; document the mapping). Details link = `ixian:viewPayment:<id>` (exists). **Nothing invisible.**
2. **[0C] Message context menu** — `attachMessageMenu` (long-press + right-click): Delete (`deleteMessage`), Copy, React (`contextAction:like`), Tip (`contextAction:tip`) — all C# verbs exist (xaml:1034/1045/941). Reply/Edit = §8-gated → build behind a capability flag, off.
3. **[0C] Member sheet + group admin** — sender tap → `openMemberSheet`; kick/ban/leave/notifications/`sendContactRequest` verbs exist (dispatch 277/283/293/248/254/260).
4. **[0C] Chat-info takeover** — header tap → `createChatInfo` (replaces `ixian:details`).
5. **[0C] Attach-sheet takeover** — `onAttach`→`openAttachSheet`; `ixian:sendmedia`/`sendfile` exist.
6. **[0C] In-text link confirm** (`onLinkClick`→confirm modal, `ixian:openLink`) · **unread divider** · **lazy history** (`attachLazyHistory`; honor the `show_more` flag `clearMessages` ignores, xaml:1110) · **contact-request pane** (`showContactRequest` stub 614) · **connectivity banner** (`showWarning` stub 648) · **start-call button** (`showCallButton` stub 615 + topbar has no actions today → can't start a call).
7. **[flag behind cap] Media tiles + viewer** (`createMediaBubble`/`openMediaViewer`) — gate on a capability flag until media-vs-file signaling is settled (BE).
8. **[BE — add to be-cutover-brief, don't build fragile]** `resend` case (retry is a **dead no-op** today — HIGH), inline Pay/Decline (C1–C3), enriched call (C4), reaction own-flag (C5). Wire the FE behind flags; the C# lands in the cutover.

## Working constraints (unchanged)
- **Sandbox mount truncates large files (#175, PC).** `chat.html` reads short in-session → verify edits via the file tools + the strict inliner; node/jsdom bundle+smoke is **Damir's local step**. Use file tools, not bash greps, for large-file truth.
- Per-batch loop: build → #46 read-only audit agent (adversarial, file:line) → fix → re-review CLEAN → Damir F5 → DECISIONS row → commit via GitHub Desktop (delete a stale 0-byte `.git\index.lock` if it blocks).
- If you edit a component: `node scripts/build-demo-bundle.mjs` FIRST, then `build-shells.mjs`, then `smoke-test.mjs` (Damir, locally).
- Bridge FROZEN. No C# edits. BE-gated features ship behind capability flags.

## After Track A
Tracks B–H (chats-list · scan+lock · contacts · wallet money · settings auto-save · apps · cross-cutting) per `finalization-roadmap.md` §Phase 3.5 → full-app Windows test → C# §5 repoint → Android → the one BE cutover pass → Phase 4 freeze.
