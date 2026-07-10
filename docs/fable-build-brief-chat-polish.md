# Fable build brief — CHAT POLISH batch (polish-roadmap batch 2)

> **Work order for the next fable BUILD session.** Entry-read order: this file →
> `docs/polish-roadmap.md` (the master triage of Damir's 17+18 list — batch order +
> owner per item) → DECISIONS **#247–#251** (the chat-info pane arc: pane machinery,
> group surface, placement rules, loop verdict) → `CLAUDE.md` ground rules (★ chat
> isolation #221 · C#-touches-no-risky-parts · #232 directives).
>
> **Workflow (§5c + the #250 precedent):** fable BUILDS; the #46 adversarial loop can
> run IN-SESSION (3 read-only Opus auditors, disjoint scopes + a fresh break-my-verdict
> re-reviewer — Damir explicitly delegated this in #250 and it caught 1 MAJOR). No
> bundle/smoke runs in-session; end with Damir's exact local command list.
> **Environment (#175):** the PC mount serves STALE/TRUNCATED files to bash/node
> (chat-info.js, member-sheet.js, build-shells.mjs known-truncated) — Read/Edit/Write
> file tools are the source of truth; inline `node --check` per extracted script only.
> ⚠ NEVER write a literal `*SL{` without a same-line `}` in anything a built page
> inlines — it CRASHES the C# generatePage line parser at boot (#248 lesson).

## Tree state you inherit

#247–#251 committed as one batch (chat-info desktop pane + #225-M2 + group/bot shell
surface + owner chip + placement rules + themed EmptyDetail + loop fixes). Chat-info
arc is DONE; group rename/re-avatar = CI7 [BE] · media feed = CI6 [BE] · per-member
admin = CI1(b) [BE].

## Build items (all zero-C# unless noted; each: build → self-review → loop entry)

1. **Q4 — incoming chat payment missing "+" / off-component.** The #187 view-only
   payment card maps C# args to `createPaymentBubble`; incoming amounts render bare
   (no `+`, not the component's signed-amount grammar). Files: `src/shells/chat.html`
   (the `addPaymentRequest`/payment-row mapping — route through the signed formatting
   the component/demo uses, `formatIxiAmount` family) · reference `src/components/
   typed-bubbles.js` (do NOT regress own/sent signs or the #77 amount rule).
2. **Q9 — bot channel selector re-tap should CLOSE.** `src/shells/chat.html`
   `openChannelSelector()` — a second title tap while `channelDropdown` is open
   reloads the list instead of toggling closed. Add the toggle guard (mind the #205
   focus-restore path — Esc/close already restores focus; the toggle must too).
3. **Q10 — composer autofocus + desktop active state.** (a) autofocus on chat open:
   OFF on mobile, ON on desktop only — gate the `onChatScreenLoaded` caret placement
   on `:root[data-desktop]`. (b) tone down the composer's ACTIVE/focused state on
   desktop (Damir: too loud) — `src/styles/components/composer.css`, desktop-scoped
   (`:root[data-desktop]`), component change → FULL build.
4. **M16 — "Connecting…" as a topbar title-state, not a banner (#59 DECIDED).** The
   chat shell shows the A7 connectivity banner; #59's decision = connectivity lives
   in the TOPBAR (title/sub swap, same type as the title row), banner reserved for
   ACTIONABLE warnings. Files: `src/shells/chat.html` (banner call sites →
   `setTopbarSub`-style state) — check what C# pushes for connectivity today
   (bridge-audit-A) and keep the banner path for actionable kinds only. If the chats
   list (home) has a connectivity surface, align it too.
5. **Q15 — @-mention picker scrollbar.** The composer mention list scrolls with a
   raw scrollbar — adopt the `.u-scroll` grammar (#41) on the picker list element.
   `src/components/composer.js`/`composer.css` — component change → FULL build.

## Gates (unchanged, #232)

- reply-to = BE-VERIFY-FIRST (carrier named + 2-device F5 BEFORE building).
- wallet-send LAST; `composeSend` stays gated OFF.
- Any security-flagged item → human BE review first.
- ★ every pane = its own WebView; conversation WebView stays walled (#221).

## After this batch (roadmap order)

Batch 3: Q12 delete-excerpt sync · Q5 groups out of the directory · M5 outgoing-request
row styling. Batch 4: M12 pattern default/levels · Q14 lock small-viewport · Q1/Q2
launch dials. Then M6 desktop overlay grammar (spec first) · M7/M8 form-pages-as-panes
(small C#) · M13 i18n sweep · M14 splash (design first). Damir dials still open:
FLOAT pane variant (if open-flicker persists) · B-2 col1→col2 auto-promote · accent
flip (#244).

## End of batch — Damir's local commands

Component/CSS touched (items 3b/5 guarantee it): `node scripts/build-demo-bundle.mjs`
→ `node scripts/build-shells.mjs` → `node scripts/smoke-test.mjs` → build
**net10.0-windows** (NOT Rebuild Solution) → F5 the per-item checklist → commit.
