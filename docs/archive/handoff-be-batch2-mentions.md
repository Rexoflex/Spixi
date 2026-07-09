# Handoff — Opus batch 2 (2026-07-09) → next chat  [ARCHIVED — consumed]

> Consumed by the batch-2b session (C13 + C11 + FAB catch-up landed & Damir-committed,
> DECISIONS #213). Superseded by `docs/handoff-be-batch3-next.md`. Kept for history.

## ⇢ UPDATE (batch 2b, 2026-07-09): C13 + C11 LANDED (DECISIONS #213, UNCOMMITTED)
In `Pages/Chat/SingleChatPage.xaml.cs` + (C13) `src/shells/chat.html`, frozen bridge. **C11 = C# only; C13 = C# + shell → `build-shells`, NO bundle rebuild.** Next session: Damir's build+F5+commit, then pick the next 🟢 row.
- **C11 — ✅ Damir F5-CONFIRMED ("tick works", DONE):** one line in `updateReactions(msg_id,channel):1631` → `updateMessage(fm, channel)` after `updateReactions(fm)`. Maps the group `received:`/`seen:` aggregate to the delivery tick (the `msgReaction` case never re-pushed status; 1:1 rides the separate `msgReceived`/`msgRead` codes). H1 holds.
- **C13 — CORRECTED after Damir F5 ("FAB doesn't appear"):** the first cut used `addCustomString("SelfNick", …)`, but the self-contained shells build `window.SL` from the BUNDLED dictionary (chat.html:233), NOT `*SL{}` substitution — a C# custom string never reaches them. **Redone as a bridge push:** C# `sendUiCommand(this,"setSelfNick", IxianHandler.localStorage.nickname)` in `onLoad` (:490) + shell `setSelfNick` handler (`selfNickPushed` → `invalidateMentions`+`updateMentionFab`; `selfMentionKeys()` reads it first). ⚑ **RULE: never feed a redesigned shell via `addCustomString`; always `sendUiCommand`.**
- **@ FAB — Telegram-style catch-up (Damir asked):** counts EVERY unseen mention of me anywhere in the log (dropped the baseline-seed), PERSISTS the seen set per peer (`spixi.mentions.seen.<addr>`). *(F5 follow-ups: jump order → NEWEST-first, and the FAB drops to the primary bottom slot when the scroll-latest chevron is hidden.)*
- **Remaining order now:** C7 → C8 (check Ixian-Core first) → A1/A2/X1 → CH2/CH3/CH4 → S14. (C13/C11 done.)

---

**Role.** Continue the Spixi frontend redesign as the Opus BE-cutover + FE-depth agent.
Read first, in order: `CLAUDE.md` (status tail) → `DECISIONS.md` (rows #208–#212) →
`docs/be-cutover-brief.md` → `docs/be-conventions.md` + `docs/fable-be-workorder.md`.

## Landed (batch 2, #208–#212)
- **BE-cutover batch-1 RITUAL** (#208–#210): #46 audit over CH1/CH5/CH8/C4/C5/S1/S3/S4 + the
  `updateMessage` direction fix → CLEAN; 3 FE fixes (C5 own-key authority, CH8 tombstone prune,
  CH8 read-clear).
- **PREMIUM MENTIONS + address-truncation canon** (#211/#212): @-highlight in bubbles,
  @-autocomplete composer picker, @ jump FAB, `truncateAddressMiddle` canon. GATED on C13.

## Environment quirks (this PC)
- bash/`node` sandbox mount serves STALE/TRUNCATED copies of session-edited files (#175/#165).
  File tools (Read/Write/Edit/Grep) hit REAL disk; build + smoke are Damir's local step.
- Corrupt `.git/index` remedy: `rm .git/index && git reset` (working tree intact).
- Ixian-Core is READ-ONLY reference.
- CLI build gotcha: use the FULL TFM `net10.0-windows10.0.19041.0` (bare `net10.0-windows`
  → NETSDK1135). Pre-existing Android RocksDB build errors surface only on Rebuild-All; F5
  the Windows target only.
