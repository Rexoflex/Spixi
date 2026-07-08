# Handoff → next session (after the #192–#194 chat F5 rounds)

Paste-in for a fresh chat. This session did three uncommitted batches on the chat/chats surface (**#192 next-zero-C# batch**, **#193 F5 round**, **#194 F5 iteration**), each independently audited/reviewed. What's left is Damir's local **build + smoke + F5 + commit**, then the **next batch = Track C (scan + lock shells)**.

## FIRST: read in this order
`CLAUDE.md` (status tail — the #192/#193/#194 bullets) → `DECISIONS.md` rows **#194, #193, #192** (newest first) → this file → `docs/be-cutover-brief.md` (the batched C# asks). Then, when starting Track C: `docs/scan-spec.md`, `docs/lock-spec.md`, `src/bridge/scan-page.js`, `src/bridge/lock-page.js`, `scripts/build-shells.mjs` (the manifest), `docs/opus-scan-lock-audit-brief.md`.

## STATE RIGHT NOW (uncommitted; reviewer GREEN)
Three batches sit in the working tree, all zero-C#, bridge frozen:
- **#192** — CH6 excerpt canon (home.html `excerptFromRaw`) · CH7 composer drafts (`spixi.draft.<addr>` localStorage) · CH3 two-step delete modal (built) · A8b "Open file" label.
- **#193** — outgoing file transfer shows progress + keep-open + "File sent" toast · reaction excerpt (lone heart → glyph + "Reacted") · delete enabled in-app with a session **tombstone** (`deletedChats`).
- **#194** — reaction glyph → `heart-plus` (+ `ICONS` glyph guard) · delete modal REDESIGNED (avatar+nickname header + checkboxes + step-2 "Delete contact") · chat THEMING (dark canvas `--neutral-950` + glow; outgoing bubble `--gradient-bubble-sent` saturated + WHITE text + light glyphs) · nameless bot/group sender → address middle-truncated + click-to-copy · dual-pane selected tint → `--surface-action-tonal-default`.

**Audits done:** independent read-only agent over #192/#193 (fixed the reaction-glyph MAJOR); independent adversarial reviewer over #194 (**GREEN**, 2 MINORs fixed). No `deleteAll` residue; all theming tokens resolve both modes; smoke assertions intact.

### Damir's local steps BEFORE the next code batch (order matters — icons first)
```
node scripts/generate-icons.mjs      # registers heart-plus from the exported SVG
node scripts/build-demo-bundle.mjs   # chatlist-item · chats-row-menu · chats-shell · message-bubble changed
node scripts/build-shells.mjs
node scripts/smoke-test.mjs
```
Then F5 the chat/chats/home surfaces → **commit #192–#194** (one commit or three per the DECISIONS rows). Two things are Damir-owned after: **tune `--gradient-bubble-sent`** (two token lines in tokens.css, light+dark — the sent-bubble palette) and, if wanted, the delete-modal `aria-describedby` (soft a11y gap, reviewer said acceptable).

## NEXT BATCH — Track C: scan + lock shells (Damir picked)
Near-drop-ins — the adapters, grammar, and QR lib already exist; they just need shell entries.
1. **`src/shells/scan.html` + `src/shells/lock.html`** — self-contained entries wiring `scan-shell.js`/`lock-shell.js` to the real bridge via `src/bridge/scan-page.js` / `lock-page.js` (#173). Same Stage-4b drop-in pattern as home/chat/settings/launch (dropped over the legacy filenames by `build-shells.mjs`).
2. **`build-shells.mjs` manifest** — add `scan` + `lock` entries (+ default set). Aim for NO component change → no bundle rebuild, just `build-shells` + `smoke`.
3. **Combined #46 loop** via `docs/opus-scan-lock-audit-brief.md` — camera grant/deny/torch, one-shot decode + hostile-payload gates, terminal-latch (decode vs cancel mutually exclusive), lock unlock/confirm boot takeover, encpass leading-`ENC_DELIM` + scrub coverage, SECURITY.md checklist.
4. DECISIONS row → hand back for Damir's `build-shells` + `smoke` + F5 + commit.

## OPEN BE items added this session (in be-cutover-brief.md)
- **CH8** (new) — reaction excerpt signal (reactor + emoji + "reacted to your message"); reactions are `ReactionMessage`s that never become `lastMessage`, so the FE lone-heart map is best-effort only.
- **CH3** (amended) — delete now sticks this session via the tombstone; true persistence + the deeper wipe (history/files/contact) still need the verbs. `detail{media}` + `deleteContact` carry the intent.
- Earlier still-open: CH1/CH2/CH4/CH5 (chats list), C1–C9 (chat), W/S/A/L, N1/N2/A8/§82.

## Working constraints (unchanged)
- **Sandbox #175**: bash mount serves STALE/TRUNCATED copies of large files → validate edits with the **Read/Grep file tools** (authoritative), NOT `bash cat`/`wc`/`node --check`/`git` for content. Bundle + smoke are Damir's local step.
- Bridge FROZEN, no C# edits. BE-gated features ship behind capability flags (built + ready).
- If you edit a component: `build-demo-bundle` FIRST, then `build-shells`, then `smoke-test`.
- Per-batch loop: build → independent #46 read-only audit → fix → adversarial reviewer → Damir build+smoke+F5 → DECISIONS row → commit.

## One-line status
#192–#194 written + audited + reviewer-GREEN, uncommitted; Damir runs generate-icons+bundle+shells+smoke+F5, tunes the sent-bubble gradient, commits — then next session builds **Track C (scan + lock shells)**.
