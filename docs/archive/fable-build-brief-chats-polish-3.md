# Fable build brief — CHATS-LIST POLISH batch (polish-roadmap batch 3)

> **Work order for the next fable BUILD session.** Entry-read order: this file →
> `docs/polish-roadmap.md` → DECISIONS **#252** (batch 2: the `*SL{}` equality-carrier
> mechanism, loop verdict) + **#219** (CH2b request feed — M5 pairs it) → CLAUDE.md
> ground rules (★ chat isolation #221 · #232 directives · #46 loop).
>
> **Workflow (§5c + #250/#252 precedent):** fable builds; the #46 loop runs IN-SESSION
> (3 read-only Opus auditors, disjoint scopes → fix → fresh break-my-verdict re-review
> until CLEAN). End with Damir's exact local command list.
> **Code quality is paramount; MINIMAL code (Damir 2026-07-11):** smallest diff that
> closes each quirk, no speculative structure, reuse existing mechanisms first.
> **Environment (#175):** the PC mount serves STALE/TRUNCATED files to bash/node —
> Read/Edit/Write/Grep file tools are the source of truth (bash `wc -l` on DECISIONS.md
> read 328 vs the real 351 this session). Grep sometimes DISPLAYS `/*` as `\*` — display
> artifact, confirm with Read. ⚠ NEVER write a literal unclosed `*SL{` in anything a
> built page inlines (#248 boot-crash class).

## Tree state you inherit

#252 committed (chat polish: Q4 '+' via `*SL{}` carriers · Q9 selector toggle · Q10
autofocus/ring · M16 topbar title-state chat+home, home banner surface · Q15 u-scroll;
smoke +10 incl. the jsdom scrollIntoView shim). Batches 1–2 of the roadmap are done.
Housekeeping: `docs/fable-build-brief-chat-polish.md` is CONSUMED (verdict appended) —
archive to `docs/archive/` with this batch's commit.

## Build items (verify-first per #215, then smallest diff)

1. **Q12 — delete a message → chats-list excerpt goes stale** ("send file then delete
   → excerpt still 'file'"). ⚠ CROSS-WEBVIEW: chat.html deletes (`removeMessage`,
   `ixian:contextAction:delete`), home.html owns the excerpt — no shared JS (#221).
   **VERIFY FIRST:** does C# re-push the chats row after a delete (HomePage `updateChat`
   lone-`addChat` path, xaml ~1020)? If yes, the bug may be C#'s excerpt derivation and
   the FE fix is narrower. If no re-push: use the SAME-ORIGIN localStorage handshake
   precedent (#238 `spixi.landtab`: storage event + focus fallback) — chat.html writes a
   per-address excerpt hint on delete, home.html folds it into `excerptFromRaw`
   (home.html:752) / the render path, expiring on the next real push for that address.
   Existing state to reuse, not duplicate: `deletedChats` tombstone (home.html:448),
   `reactionExcerpts` sticky-map pattern (home.html:471, CH8), `DRAFT_PREFIX` shared
   contract (home.html:769).
2. **Q5 — groups must not appear in the contacts DIRECTORY** (Damir agreed; group
   management lives in chat info — CI7). ⚠ FINDING (this session): HomePage's directory
   push `addContact(address, nickname, avatar, online, unreadCount)` carries **NO type
   arg** (home.html:1435-1448 — the 5th arg is unreadCount, not the WalletRecipientPage
   `type`), so the roster alone can't tell groups apart. **Zero-C# lead option:** the
   chats model already knows group/bot addresses via the CH1 `kind` flag on `addChat`
   (#208) — filter the DIRECTORY view (`purpose 'directory'`) against that set (every
   group has a chat row by nature; a tombstoned-deleted group chat is the edge — check).
   Fallback: a 6th `type` arg on the HomePage push (small C#, CH1-class co-change).
   Files: home.html roster/openContacts · `src/bridge/contacts-page.js` (mountContacts)
   · `src/components/contacts-shell.js` (:150 directory tap path). Decide whether the
   'start' picker keeps groups (tapping one just opens its chat — Damir dial).
3. **M5 — outgoing contact request = "Request sent" styled row** (pairs CH2/#219:
   incoming became the Requests feed; OUTGOING stays a plain localSender chat row).
   **VERIFY FIRST:** what HomePage.loadChats actually pushes for an outgoing requestAdd
   row (excerpt text? statusType? the #219 detection was `!approved && lastMessage.type
   == requestAdd && !localSender` — the outgoing twin is `localSender`); find a stable
   FE-visible signal before styling. Render: status chip/excerpt treatment on the row
   (chatlist-item has excerpt-type grammar; a small `pending` variant beats a new
   component). If NO stable signal exists FE-side → do NOT build on a guess; log the
   CH2 amendment in be-cutover-brief instead (#215 lesson).

## Gates (unchanged, #232)

- reply-to = BE-VERIFY-FIRST · wallet-send LAST (`composeSend` stays gated) ·
  security-flagged → human BE review · ★ every pane = its own WebView (#221).

## After this batch (roadmap order)

Batch 4: M12 pattern default/levels · Q14 lock small-viewport · Q1/Q2 launch dials.
Then M6 desktop overlay grammar (spec first) · M7/M8 form-pages-as-panes (small C#) ·
M13 i18n sweep · M14 splash (design first).

## End of batch — Damir's local commands

If components change: `node scripts/build-demo-bundle.mjs` → `node scripts/build-shells.mjs`
→ `node scripts/smoke-test.mjs` (shell-only changes skip the bundle rebuild) → build
**net10.0-windows** (NOT Rebuild Solution) → F5 the per-item checklist → commit.
