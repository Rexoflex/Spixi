# Chat Info — spec (`c-chat-info`)

Deferred from chats-shell-spec ("chat-info pane · group-settings pane — separate
spec + interview"). Interview done 2026-07-05 (DECISIONS #141): **ONE takeover
surface for 1:1 AND group** (send-screen grammar — tap the chat header), 1:1 at
legacy parity **plus** money actions, shared media (flagged) and premium extras;
group members via the existing member-sheet with capability-gated admin; the
notifications toggle designed for BOTH kinds with 1:1 flagged off (bridge
reality: groups/bots only).

## Legacy bridge reality (mined 2026-07-05)

1:1 — `contact_details.html` + `ContactDetails.xaml.cs`:

- `ixian:send` / `ixian:request` — money actions from the contact page
- `ixian:userdefinednick:NICK` — nickname (local override, not pushed to peer)
- `ixian:removehistory` — delete chat history (confirm modal legacy-side)
- `ixian:remove` — remove contact entirely
- activity list on the page = tx history with this contact (`ixian:viewPayment`)

Group / bot — `chat.js` 1670–1815 + `SingleChatPage.xaml.cs`:

- `ixian:enableNotifications` / `ixian:disableNotifications` — groups/bots ONLY
  (routes to `sendBotAction`; **no 1:1 equivalent — §9 ask**)
- `ixian:kick:ADDR` / `ixian:ban:ADDR` — admin-only member actions
- `ixian:leave` — leave group (`sendLeave`)
- `ixian:sendContactRequest:ADDR` — from a member's detail view
- blind groups (chat mode 2): participant addresses HIDDEN
- bots: message-cost line when fee ≠ 0 (composer cost surface already exists, #86)

No legacy command exists for: shared-media inventory, group name/avatar edit,
1:1 mute. All three are §9 asks; the UI ships capability-gated.

## Surface

`createChatInfo(opts)` → full in-phone takeover (the #139 send-takeover
pattern: topbar variant 'view', title = chat name, onBack closes). ONE
component; sections render by `kind` + `capabilities` + `context`.

**Contexts (#142):** `context: 'chat' | 'contact'` — the same surface doubles
as the CONTACT PAGE (opened from a member sheet's identity block today; the
contacts shell later). Contact context: title "Contact info", a full-width
**Message** button (`onMessage`) leads the action row (Pay demotes to
outline — member-sheet precedent), delete-history and disappearing-messages
stay chat-side. Sections are visually divided (top separators after the
hero) — #142: the undivided screen read as one blur.

Order:

1. **Hero** — avatar-64 (hue-hashed), display name, presence line (flagged —
   §9), 1:1: nickname edit (pencil → inline input, Enter/blur commits →
   `onNickname(nick)`; empty = clear override). Group: member count line.
2. **Address card** (1:1 + bots; groups: only when not blind) — FULL address
   chip with the HONEST copy morph (#137 pattern: ✓ only after clipboard
   resolves) + "Show QR" reveal → `createQrSvg('address:ixi' payload)` on the
   `--surface-qr` card. Reuses qr.js verbatim.
3. **Money row** (1:1 + bots) — Pay / Request, 44px buttons. Pay →
   `onPay()` (shell opens the #139 send takeover, `lockedRecipient`);
   Request → `onRequest()` (shell opens `openRequestSheet`). Groups: hidden
   until §9 answers room-wide request semantics (#139 flag).
4. **Notifications** — toggle row, `onNotifications(bool)`. Rendered for BOTH
   kinds; `capabilities.notifications` gates it LIVE vs hidden (1:1 ships
   hidden until the BE lands — Damir: design now, flag it).
5. **Disappearing messages** (#142 — chat context only, flagged
   `capabilities.selfDestruct`; NO bridge command, §9 ask) — setting row
   (label · current value · chevron) → option sheet: Off / 1 hour / 1 day /
   1 week as radios, current checked. Picking commits immediately via
   `onSelfDestruct(seconds, ctrl)` — latched + loading while the bridge
   round-trips, sheet closes on `ctrl.done`, live-region announce on fail.
   Per-chat policy (Signal grammar), NOT a composer control — keeps the
   composer clean; a per-message override can layer on later if asked.
6. **Shared media** (flagged `capabilities.media`) — horizontal strip of media
   thumbs → `onMediaOpen(item)` / "See all" → `onMediaAll()`. NO bridge
   command — demo-fed, §9 ask. Skeleton hidden entirely when gated off.
7. **Members** (group only) — FULL A–Z scrollable list, NO caps (#142: the
   #136③ caps forced you to already know the name — scanning is the point;
   the takeover body scrolls). Search appears ≥8 members as a pure FILTER
   over the whole list. Row tap → `openMemberSheet` (existing) with
   `onContactRequest` + `onViewContact` (relation 'contact' → identity block
   opens the contact page, context 'contact'); `capabilities.admin` adds
   Kick / Ban to the member sheet's action list (destructive, each behind a
   `createModal` confirm — money-grade explicitness, #26). Blind group:
   rows show name only, sheet hides the address block.
8. **Payments** (1:1/bot) — collapsed accordion (#142: a long tx list must
   not greet every visit): "Payments (N)" toggle → the 5 most recent as
   `txlist-item` rows + "View all {n} payments" → `onTxAll()` (shell nav;
   without the callback the full list renders inline). Lazy-built on first
   expand — same reveal grammar as Show QR.
9. **Destructive zone** (grouped last) — SEPARATED, bordered rows with
   spacing-12 gaps (#142: flush rows invited mistaps between delete-history
   and remove-contact): 1:1 chat — "Delete chat history" (`onDeleteHistory`)
   · "Remove contact" (`onRemoveContact`); contact page — remove-contact
   only; group — "Leave group" (`onLeave`). EVERY destructive action →
   `createModal` confirm with the consequence spelled out; confirm buttons
   latch (oneShot) + loading while the bridge round-trips.

## API

```js
createChatInfo({
  kind: 'contact' | 'group' | 'bot',
  context: 'chat' | 'contact',                // #142: contact page reuses the surface
  name, address, avatarSeed, nickname,        // hero + address card
  memberCount, members: [{ name, address, admin }],
  blind: false,                               // hides addresses (chat mode 2)
  notifications: true,                        // current toggle state
  selfDestruct: 0,                            // disappearing window, seconds (0 = off)
  media: [{ id, thumb, kind }],               // flagged section, demo-fed
  txs: [ txlist-item opts ],                  // 1:1 activity (reuse component)
  capabilities: { notifications, media, admin, presence, selfDestruct },
  onBack, onNickname, onCopyAddress, onMessage, onPay, onRequest,
  onNotifications, onSelfDestruct, onMediaOpen, onMediaAll, onMemberAction,
  onViewContact, onDeleteHistory, onRemoveContact, onLeave, onTx, onTxAll,
  strings = {},
})
```

In-flight rules: destructive confirms follow the #135-C1 lock (modal not
dismissible mid-action); nickname commit disables the input until resolve;
the notifications toggle is optimistic with revert-on-fail (`ctrl.fail()`).

## §9 asks (new)

- 1:1 mute/notifications command (today `sendBotAction` only)
- shared-media inventory command (paged)
- presence/last-seen push for the hero line
- group name/avatar edit (no command; admin-side)
- room-wide request semantics (carried from #139)
- disappearing/self-destructing messages: per-chat window command + expiry
  enforcement (both peers), #142 — UI ships capability-gated

## Address display canon (Damir 2026-07-09)

**A raw wallet address is NEVER shown in full on any chat surface — always middle-truncated.**
The full address lives ONLY in **Contact details** and **payment/wallet** surfaces.

- **Applies to:** the chat **topbar title** (an unknown / pending "Waiting for response"
  contact whose only name is its address — the reported bug), **chat-list rows**, **bubble
  sender labels** (already done, #194), and any member/roster row lacking a nickname.
- **Truncation:** the shared `truncateAddressMiddle(addr, 6, 6)` → `6…6` (message-bubble.js:94,
  #194) keeps both ends recognisable. Same helper everywhere; do not hand-roll per surface.
- **A nickname always wins** — truncate only when the display string IS the address
  (`nick === address` or no nick), the same gate as `senderIsAddress` (#195 `senderHasNick`).
- **Full address is reachable** by opening the contact (Contact details) or in a payment
  card — that is the deliberate "reveal on intent" boundary, not a chat-surface default.
- **Rationale:** a full base58 address as a chat title/label is unreadable noise and leaks
  the whole identifier before the user has chosen to engage; truncation is the messenger norm.

## Out of scope

Channel selector (`ixian:selectChannel` — bot channels get their own pass) ·
group creation/editing · contact ADD flow (separate screen, figma-sweep list).
