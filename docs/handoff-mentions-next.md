# Handoff — Opus batch 2 (2026-07-09) → next chat

## ⇢ UPDATE (batch 2b, 2026-07-09): C13 + C11 LANDED (DECISIONS #213, UNCOMMITTED)
In `Pages/Chat/SingleChatPage.xaml.cs` + (C13) `src/shells/chat.html`, frozen bridge. **C11 = C# only; C13 = C# + shell → `build-shells`, NO bundle rebuild.** Next session: Damir's build+F5+commit, then pick the next 🟢 row.
- **C11 — ✅ Damir F5-CONFIRMED ("tick works", DONE):** one line in `updateReactions(msg_id,channel):1631` → `updateMessage(fm, channel)` after `updateReactions(fm)`. Maps the group `received:`/`seen:` aggregate to the delivery tick (the `msgReaction` case never re-pushed status; 1:1 rides the separate `msgReceived`/`msgRead` codes). H1 holds.
- **C13 — CORRECTED after Damir F5 ("FAB doesn't appear"):** the first cut used `addCustomString("SelfNick", …)`, but the self-contained shells build `window.SL` from the BUNDLED dictionary (chat.html:233), NOT `*SL{}` substitution — a C# custom string never reaches them. **Redone as a bridge push:** C# `sendUiCommand(this,"setSelfNick", IxianHandler.localStorage.nickname)` in `onLoad` (:490) + shell `setSelfNick` handler (`selfNickPushed` → `invalidateMentions`+`updateMentionFab`; `selfMentionKeys()` reads it first). ⚑ **RULE: never feed a redesigned shell via `addCustomString`; always `sendUiCommand`.**
- **@ FAB — now Telegram-style catch-up (Damir asked):** counts EVERY unseen mention of me anywhere in the log (dropped the baseline-seed), jumps oldest-first, and PERSISTS the seen set per peer (`spixi.mentions.seen.<addr>`) so caught-up mentions don't resurface on re-open. To test: open a group with a historical @you that's off-screen → FAB shows; tap → jumps + pulses; scroll it into view → clears; re-open → stays cleared. New @you while scrolled up → FAB appears. The immediate proof C13 works at all is the **self-mention emphasis** (warning style on @your-nick) on any visible mention. FE-only, in the same `build-shells`.
- **Damir build/F5:** `node scripts/build-shells.mjs` → build `net10.0-windows`. C13 = @your-nick shows self style immediately; FAB per the scroll-up scenario above. C11 = 2 devices, read on the other → tick advances (confirmed).
- **Remaining order now:** C7 → C8 (check Ixian-Core first) → A1/A2/X1 → CH2/CH3/CH4 → S14. (C13/C11 done above.)

---


**Role.** Continue the Spixi frontend redesign as the Opus BE-cutover + FE-depth agent.
Read first, in order: `CLAUDE.md` (status tail) → `DECISIONS.md` (rows #208–#212) →
`docs/be-cutover-brief.md` → `docs/be-conventions.md` + `docs/fable-be-workorder.md`
(the 🟢 do / 🟡 human / 🔴 never fence — money/signing/credentials are HUMAN ONLY).

## Everything below is UNCOMMITTED in the working tree
Damir commits after a local build + F5 (the sandbox mount can't build — see Environment).
**First action next session is NOT to re-do this — it's Damir's build+commit.** A new
builder session picks the next batch (see Remaining).

## Landed this session

### 1. BE-cutover batch-1 RITUAL (the debt fable left) — DECISIONS #208–#210
#46 audit loop over fable's CH1/CH5/CH8/C4/C5/S1/S3/S4 + the `updateMessage` direction fix
(3 disjoint read-only auditors + adversarial reviewer) → **CLEAN, 0 MAJOR**. Settings CLEAN
(S1 = display-only identity, no wallet access).

**3 mechanical FE fixes landed (shell-only → `build-shells`, NO bundle/component change):**
| Fix | File | What |
|---|---|---|
| C5 own-key authority | `src/shells/chat.html` `parseReactions` | bridge own-arg honored EXCLUSIVELY when present (`ownStr!==undefined ? ownKeys.has('like') : myLikes…`); `myLikes` = old-exe fallback only |
| CH8 tombstone prune | `src/shells/home.html` `onPersist` | `reactionExcerpts.delete(addr)` on delete/deleteContact (no stale re-apply on resurrect) |
| CH8 read-clear | `src/shells/home.html` `setContactStatus` | drop the sticky excerpt when a live tick reports unread=0 |

Reviewer PASS both **and caught** that clearing `reactionExcerpts` in `clearChats` is UNSAFE
(CH8 must survive the post-reaction re-flush) → deliberately NOT done.

Docs synced: DECISIONS #208 (batch-1 landed + embedded decisions) / #209 (audit + fixes) /
#210 (Damir findings + mentions scope); be-cutover CH1/CH5/CH8/C4/C5/S1/S3/S4 marked LANDED;
ARCHITECTURE §4 push contract + §9.5 rows updated.

### 2. PREMIUM MENTIONS + address-truncation canon — DECISIONS #211/#212 (FE-only, zero-C#)
| Feature | Files | Notes |
|---|---|---|
| @-mention HIGHLIGHT in bubbles | `message-bubble.js` + `.css` | bold + tonal pill; name-anchored + boundary guards (no email/`@bobby` false-fire); direction-scoped colour (received + sent gradient); self = warning (`data-self`) |
| @-AUTOCOMPLETE composer picker | `composer.js` + `.css` | opt-in `mentionSource` cb; avatars + filter; ↑/↓/Enter/Tab/Esc + tap; IME-guarded; capture-phase keydown pre-empts send/ctx-Esc; group/bot only |
| @ JUMP-TO-MENTION FAB | `chat.html` + inline CSS | above the scroll-latest chevron; **cycle-with-count** (oldest-unseen-first per tap, pulse, baseline-seed on open, per-peer reset) |
| #211 truncation canon | `avatar.js` (shared `truncateAddressMiddle`, moved here — no cycle) · `chat.html` `identityTitle()` · `chatlist-item.js` | nick-or-truncated-address, never full base58 (fixes the pending-contact topbar). Canon doc: `chat-info-spec.md` "Address display canon" |

**#46 adversarial review → NEEDS-FIX → all fixed:** M1 composer picker missing IME guard ·
m1 `addThem`-seen senders not invalidating the memo (→ `invalidateMentions()` at top of
`renderLogNow`) · m2 unguarded `new RegExp('u')` (→ try/catch → generic fallback). CLEAN otherwise.

**GATED on the local nick:** self-mention emphasis + the FAB need the LOCAL user's nick, which
C# does not push to the chat. The shell reads `window.SL.SelfNick` / `SPIXI_ENV.selfNick`
(empty today → those two features stay dark; highlight-all + picker work regardless). One
trivial push lights them up → **be-cutover C13**.

**Damir F5 r1 fixes (folded into #212, need a bundle rebuild):** (i) smoke stale static
assertion updated for the `identityTitle()` refactor · (ii) highlighter matches ANY `@word`
(known names as leading longest-first alts + generic term) so a mention of the local user
highlights even before C13 — was name-anchored-only, which skipped `@me` · (iii) composer
`mentionMembers()` harvests SEEN SENDERS from the loaded `model` so the picker works on a
just-opened group before chat-info/loadContacts runs (was "@ does nothing"). Confirmed:
fresh mention → `@` indicator in the chat-list row (CH5). Still gated on C13: FAB + self-emphasis.

New string keys (inline en fallbacks → next `extract-strings`): `mentionMembers`, `jumpToMention`.

## Build / verify (Damir's machine — sandbox CANNOT build)
Components changed this session → **bundle rebuild required**:
```
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/smoke-test.mjs
```
Then build `net10.0-windows` + F5. **F5 checklist:** own ❤ persists / counterpart ❤ excerpt
clears on read (batch-1) · group: type `@` → member picker → send → highlighted mention ·
nameless/pending chat: topbar + list row show a TRUNCATED address (not full base58) · @ FAB
+ self-emphasis stay hidden until C13 lands (expected).

## New BE rows added this session (be-cutover-brief)
- **C11** — group delivery ticks BUG (Damir finding 4): own group/bot messages stuck on the
  clock; verify received/seen aggregates (Friend.cs:1017-1030) push `updateMessage` to the
  open chat / map aggregates→ticks. investigate + ~2–4h.
- **C12** — paste-to-send image (§8 `attachData`), **DEFERRED to the full Desktop pass**
  (Damir). Spec `docs/paste-image-spec.md`. Not for a standalone batch.
- **C13** — push the local user's nick (`addCustomString("SelfNick", IxianHandler.localStorage.nickname)`)
  → unblocks self-mention emphasis + the @ jump FAB. trivial.
- Folded Damir findings 2 (CH8 empty-nick → truncated-address fallback) and 3 (C4 "call back"
  during an ACTIVE call) into their existing rows.

## Remaining work-order (unchanged from the prior handoff, + this session's additions)
🟢 **BE rows** (each = one tiny JS+C# co-change, Damir F5-confirms before the next):
C7 (app-invite decline verb + install-URL always present) → C8 (arbitrary emoji reactions —
check Ixian-Core impact FIRST, may need Damir) → A1, A2, X1 → CH2, CH3, CH4 (persistence
cluster; CH4 likely Ixian-Core metadata → flag) → S14 + §9 settings family → **C11, C13**
(this session). 🟡 stays human (L-rows, credential settings). 🔴 untouchable (money/signing/wallet).

**Deferred FE:** paste-to-send image (task #9 / C12) — build with the full Desktop pass.

## Environment quirks (this PC)
- **bash/`node` sandbox mount serves STALE / TRUNCATED copies of session-edited files**
  (#175/#165 class). File tools (Read/Write/Edit/Grep) hit the REAL disk and are reliable;
  build + smoke are Damir's local step. Two auditor agents this session confirmed they could
  only Read (not `node --check`) the edited files for this reason.
- The prior handoff noted a corrupt `.git/index` ("bad signature") — if `git` errors, Damir:
  `rm .git/index && git reset` (working tree intact).
- Ixian-Core is mounted READ-ONLY (reference only; Friend/FriendType/ReactionData/etc.).
- MCP connectors (Slack/Figma/Linear/Notion/Atlassian/Intercom) need auth in an interactive
  session before their tools work — not available here.
