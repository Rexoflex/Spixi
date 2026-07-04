# Chats shell — progress & RESUME (2026-07-03 → next session)

Spec: `docs/chats-shell-spec.md` (locked, all 🟡 resolved). Decisions: **#110–#114**. Demo: `src/demo/chats.html` (renders — bundle is hand-maintained).

## Done + audited CLEAN
1. **Model + render** (`chats-shell.js`): filter/query/order (requests→pinned→recency), empty states, free-fn updaters. Null-hardened (`.filter(Boolean)`).
2. **Collapsing header** (`chats-header.js`): search + filter chips (All/Unread/Favorites-off/Groups/Requests). **Collapse = smooth binary triggered CSS transition** (`max-height`+`opacity`, `--duration-300`), collapse on down-scroll, **reveal ONLY at absolute top** (Damir feedback — redesigned from finger-tracking). Guards unmeasured header.
3. **c-contact-request** (`contact-request.js`): avatar/name/addr, Decline→c-modal, Accept→onAccept, timestamp, requester-naming aria-labels.
4. **Row context menu** (`chats-row-menu.js`): long-press/right-click → c-sheet Pin/Mute/Mark-read/Chat-info(stub toast)/Delete-confirm; `applyChatRowAction` mutates model → re-render → `onModelChange` (badge).

Files: `src/components/{chats-shell,chats-header,contact-request,chats-row-menu}.js` + `src/styles/components/{chats-shell,chats-header,contact-request}.css` (menu reuses `message-menu.css`).

## ▶ RESUME HERE — remaining steps (each: build → adversarial-agent audit loop to CLEAN → hand-append to bundle → verify)
- **Step 5 — swipe Pin/Mute accelerator.** Leading swipe = Pin/Unpin, trailing = Mute/Unmute (NON-destructive only; Delete stays menu-only). RTL-logical directions, pointer+touch, threshold/momentum, reduced-motion; a11y path already covered by the long-press sheet. (task #21)
- **Step 6 — #109 staged accept.** `setRequestAccepting(row/btn)` free-fn: Accept latches "Accepting…" (button setLoading) + list excerpt flips to "Establishing a quantum-secure handshake…" (typing-excerpt style, on-brand w/ #91); entry gated on a mocked handshake-complete signal (BE §9). (task #22)
- **Then:** final full-surface adversarial round (RTL, i18n, reduced-motion, huge lists, capability flags, edge cases) → Damir UX review → commit.

## Workflow reminders (IMPORTANT)
- **Bundle is hand-maintained.** After each new component: append its code (imports stripped, `export`→plain) into `src/demo/spixi.iife.js` before `window.Spixi = {…}` and add its names to that export map. This is why demos render with no terminal. `node scripts/build-demo-bundle.mjs` regenerates cleanly later (can't run in-sandbox — truncation).
- **Env quirk:** the sandbox bash mount serves TRUNCATED copies of session-edited files. Use the **Read tool** for source; verify logic via standalone transcriptions + jsdom (not by importing edited files through bash).
- Keep source ↔ bundle parity when fixing.
