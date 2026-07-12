# Chats Shell — Spec

**Status:** For Damir review → then build against the mock (no ship without review + audit loop #46).
**Copies:** `src/demo/app-frame.html` (chats screen is the template — same factories, phone frame, mock-data pattern), `docs/chat-list-spec.md` (row anatomy), `c-chatlist-item / c-search-field / c-chip / c-topbar / c-bottomnav / c-sheet / c-msgmenu` (all built). Invents nothing — gaps become 🟡 rows or §8/§9 proposals.
**Refs:** #67 (search-collapse + chips), #86 (contact-request, composer-off for non-contacts), #95 (shell order), #102 (relation state), #108 (mention @), #109 (accept-handshake). ARCHITECTURE §5 (9-shell consolidation), §9 (BE questions).

## 1. Scope

**IN (this scaffold):** app frame (topbar + bottomnav) · scroll-collapsing search **+** chip row (together, #67) · filter chips All / Unread / Favorites (flag-off §8) / Groups / **Requests** · chat list from a shell **data model** (not DOM-first) · `c-contact-request` component (inline rows at top) · row actions: long-press sheet (Pin/Mute/Mark read/Delete/Chat info) **+** swipe Pin/Mute · #109 accept-handshake staged state · new-chat FAB→sheet (exists) · Chats nav badge (#42).

**OUT (deferred, separate spec + interview):** chat-info pane · group-settings pane · high-volume request cap/collapse (#100, post-v1) · Favorites persistence (BE §8) · illustration language.

## 2. Layout & anatomy (extends app-frame.html)

```
demo-phone
├ statusbar (demo chrome only)
├ c-topbar            variant=root, logo, actions:[Contacts]  (setWarning banner mounts here)
├ header (collapsible)   ← NEW wrapper; collapses as ONE unit on scroll (#67)
│  ├ search-wrap         c-search-field "Search chats"
│  └ filters             c-chip row: All · Unread · Favorites(off) · Groups · Requests
├ content .u-scroll      list: [contact-request rows] then [chat rows], rendered from model
├ fab                    message-plus → createSheet(New chat/New group/Scan)  (exists)
└ c-bottomnav            active=chats, badge=unread-excl-muted (#42)
```

Tokens/spacing: reuse app-frame values (`--spacing-*` variables, `--surface-screen`, list via `.u-scroll`). No new tokens expected.

## 3. Scroll-collapse (#67 — Damir: search + chips collapse together)

- `header` is one collapsible block (search + chips). **RESOLVED (Damir review):** a **smooth, binary TRIGGERED transition** — NOT finger-tracking (the first scroll-linked build felt "too fast / not smooth"). It **collapses on downward scroll** and **reveals ONLY when the list is back at the absolute top** — scrolling up partway must NOT reveal it (Damir: "appear only at absolute top"). Animates `max-height` + `opacity` via CSS transition (`attachChatsCollapse` toggles inline values; transition in chats-header.css).
- Timing: `--duration-300` (300ms) + `--easing-standard`; reduced-motion zeros the duration → instant. `overflow:hidden` clips as `max-height` animates; the list gains the freed space.
- Reveal threshold: `scrollTop <= 1` (absolute top, 1px sub-pixel tolerance). Collapse: any downward scroll away from the top.
- a11y: collapsed header is `inert`/`hidden` (not just visually hidden) so it leaves the tab order; revealing restores it.

## 4. Filter chips (client-side over the model, exclusive group)

| Chip | Predicate | Source |
|---|---|---|
| All | everything (requests pinned on top) | — |
| Unread | `unread>0 \|\| mention` | client (addChat carries unread) |
| Favorites | `favorite` | **BE §8** → flag-off (like voice #64/#67) |
| Groups | `type==='group'` | client (addChat type) |
| Requests | `relation==='pending'` | client relation (#102) + §9 bridge note |

Reuses `createChip`/`setChipSelected` exactly as the wallet filter group does. Selecting a chip filters the **model**, re-renders rows (not `hidden` toggling — #52 shell-filters-model note). Empty-filter state → a quiet empty message (copy 🟡).

## 5. Contact requests (Q1 — combo, cheap)

- **Inline & interleaved (Damir 2026-07-04):** pending requests render as `c-contact-request` rows **interleaved by arrival time** in the All list (via `orderedTimeline` — pinned chats stay on top, then requests + unpinned chats merge by recency); a request sits at its **chronological place**, NOT pinned to the top. Accepting slides the resulting chat to the top of the unpinned flow (latest action moves it *up*, avoiding the old "was on top → drops down" jar). Shown in All + Requests only, not Groups (1:1). Same anatomy: tinted `--surface-neutral-02`, avatar-48, name, "Wants to connect", Decline(outline-32)+Accept(fill-32 check), timestamp — still visually distinct so it reads as "needs action" even when interleaved.
- **Filter:** the **Requests** chip isolates them for focused triage (newest-first).
- **Component contract:** `createContactRequest({address, nick, avatar, timestamp, onAccept, onDecline})`; **Decline is SINGLE-CLICK, no confirm** (#266 ⑩ — a decline is reversible; confirms are reserved for the irreversible, e.g. delete-chat/-contact), and **either action spends the whole card** (both buttons disable before the callback runs — Q1 review, #267 loop: a card that outlives its own verb must not fire the other one); Accept triggers the #109 staged state (§7).
- Non-contacts: composer disabled downstream (#86) — shell responsibility flagged, not built here.
- Bridge: requests may arrive via `showContactRequest` (per #86) OR `addChat(type=request)` — **§9 open**; model normalizes both to a `relation:'pending'` entry.
- Post-v1: cap/collapse inline requests at volume (#100).

## 6. Row actions (Q2 — long-press full, swipe curated)

- **Long-press / right-click → `c-sheet`** (reuse `c-msgmenu` sheet infra, §5b, keyboard path): **Pin/Unpin · Mute/Unmute · Mark as read · Delete · Chat info**. Source of truth for the full set.
- **Swipe → two NON-destructive quick actions only:** leading = **Pin/Unpin**, trailing = **Mute/Unmute**. Curated subset = accelerator, not a duplicate menu.
- **Delete is menu-only** — deliberately excluded from swipe (destructive-on-swipe = accidental-tap risk). Delete in the sheet confirms via `c-modal`.
- Swipe infra is NEW → must be audited hard (RTL logical directions, momentum/threshold, pointer+touch, a11y alternative = the long-press sheet already covers keyboard/SR). 🟡 build swipe *after* the sheet path is CLEAN so the accessible path exists first.
- Mute/pin plumbing: `data-muted`/`data-pinned` on the row + model flags; pinned rows sort to top (below requests); muted excluded from nav badge (#42) and show the muted indicators (#81 createIndicators). Bridge for pin/mute persistence = **BE §8** (addChat carries no pinned flag today, #67) → flag-gated.

## 7. #109 accept-handshake staged state — ✅ BUILT (step 6)

- Tapping **Accept** on a request must NOT open the chat immediately (key exchange race). Sequence: Accept button → latched **"Accepting…"** loading (`setRequestAccepting` → button `setLoading` + aria-label sync + Decline disabled) → `acceptContactRequest` removes the request and prepends a **handshaking chat** whose excerpt reads **"Establishing a quantum-secure handshake…"** in typing-excerpt styling (`--text-action-default`, on-brand with #91) + a `[data-handshaking]` pulse (reduced-motion off); the row is `aria-busy`, **un-openable** (tap → `onHandshakeBlocked`, never `onOpen`) and **un-swipeable**; conversation entry unblocks **only** on `completeHandshake` (the bridge handshake-complete signal), which also bumps the timestamp so the just-secured contact surfaces on top.
- **Recovery (no trap):** a handshaking row exposes a single long-press **"Cancel handshake"** action → `failHandshake` removes the stranded chat. `failHandshake` is also the drop-in for the bridge failure/timeout signal, so a never-completing handshake is never un-removable. Double-accept + late-signal-after-cancel are guarded.
- Bridge: needs explicit handshake **complete** AND **fail/timeout** events (or Accept-ack). **§9 open** — the demo mocks them with timers (650ms ack → establishing → 2600ms complete) + a "complete"/"fail" callback; real signals drop in later.

## 8. Bridge contract

| Call | Real today? | Use |
|---|---|---|
| `addChat(addr,nick,timestamp,avatar,online,excerpt,type,unreadCount)` | ✅ | seed the model |
| `setUnreadIndicator(count)` | ✅ | nav badge (#42) |
| `showContactRequest(...)` | ✅ (per #86) | request entries — §9: shape? |
| `setChatMode` / channel calls | ✅ (bot/#97) | not exercised in this shell |
| pinned flag / favorites | ❌ | **§8 proposal** — flag-off |
| handshake-complete signal | ❌ | **§9 proposal** — mock timer |
| per-member relation state | ❌ | **§9** (also #102) |

Access only via a shell bridge boundary; since `src/bridge/` doesn't exist yet, **mirror app-frame's inline mock-data pattern** (a `CHATS`/`REQUESTS` model + factory calls). Establishing a real `src/bridge/mock.js` module = its own decision (#18 convention exists but unbuilt) → 🟡 propose, don't invent mid-shell.

## 9. Data model (shell holds truth, renders from it)

`state = { chats:[…], requests:[…], filter:'all', query:'' }`. Render = derive visible list (requests-on-top → pinned → recency) → diff/patch rows. Search + filter operate on the **model**, not DOM (#52). In-place updaters (setMessageStatus-style free fns, #44) patch single rows. Timestamp ticker unchanged (`startTimestampTicker`/`refreshTimestamps`).

## 10. Resolved decisions (Damir interview) + open BE (§9)

**RESOLVED:**
- Bridge: **inline mock model** (app-frame pattern) — no `src/bridge/mock.js` this pass (revisit as its own decision later).
- Swipe: **fast-follow** — long-press sheet built + audited CLEAN first, then swipe Pin/Mute as its own audited step. Delete stays menu-only.
- Pinned: **sorted to top (below requests) + pin glyph, no section header.**
- Sheet actions: **Pin · Mute · Mark read · Delete · Chat info** — Chat info is a **stub** (toast placeholder) until its pane exists.
- Collapse (RESOLVED, Damir review): binary triggered transition — collapse on downward scroll, reveal ONLY at the absolute top (scrollTop ≤ 1); `--duration-300` `--easing-standard`; guards against collapsing an unmeasured (offsetHeight 0) header. See §3.
- Empty copy: "No unread chats" / "No groups yet" / "No pending requests" / search "No chats match '<query>'". (default — tweakable)

- Requests visible in **All + Requests only** (not Groups — a pending request is 1:1). (Damir)
- Empty states: copy is placeholder for now; **illustrations + CTAs deferred** to a later pass (Damir).

**Post-v1:** request cap/collapse trigger (#100).

**§9 (BE):** request delivery shape (showContactRequest vs addChat type) · pinned/favorites persistence (§8) · handshake-complete signal · per-member relation · per-chat mark-read call (setUnreadIndicator is a total — mark-read is client-only in the mock).

## 11. Build order + audit (#46 after each)

1. Model + render pipeline (chats+requests, filter/search over model). → audit
2. Collapsible header (search+chips together). → audit
3. Requests chip + `c-contact-request` component (inline + filter). → audit
4. Long-press context sheet (Pin/Mute/Mark read/Delete/Info) — **accessible path first**. → audit
5. Swipe Pin/Mute accelerator. → audit ✅
6. #109 staged accept (mocked signal). → audit ✅
7. Full-surface adversarial round (edge cases: empty states, RTL, i18n, invalid ts, muted, blind groups, 99+ counts, capability flags off, reduced-motion) → CLEAN → Damir review → commit. ← NEXT

Each step: build → multiple adversarial review agents (disjoint scopes) → adversarial reviewer hunting introduced drift → loop until CLEAN + jsdom smoke test passes.

## 12. Deferred to next specs

chat-info pane · group-settings pane · request cap/collapse (#100) · Favorites BE (§8) · desktop split-view chats (#19/#89 already prototyped) · illustration language.
