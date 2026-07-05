> 🗄️ **STALE — superseded.** Historical only (2026-07-03 fable→opus orientation). Current entry point: **`docs/handoff-fable-next-batch.md`**. Decisions preserved in `DECISIONS.md`.

# Handoff brief — continuing the Spixi frontend redesign

Written 2026-07-03 by the previous Claude session (Fable), for the next session (Opus).
Damir will paste or reference this; treat it as orientation, not gospel — **DECISIONS.md outranks everything here.**

## Boot ritual (do this first, every session)

1. Read `CLAUDE.md` (root) — ground rules, status, the ⚠️ first-action item, Next list.
2. Read `DECISIONS.md` — at minimum rows **#95–#109** (current era: roadmap, freeze, open 🟡s). Skim earlier rows on demand; never contradict a ✅ row without logging a supersede.
3. Optional context: `docs/audit/chat-full-audit-r2.md` (bridge coverage table), `DESIGN_SYSTEM.md`, `ARCHITECTURE.md` §8/§9.

## Where the project stands

- **Chat surface v1 is FEATURE-COMPLETE, freeze-audited (#106 CLEAN) and committed.** Components: bubbles (text/emoji-only/reply/edited/links), typed cards (payment/app/call incl. declined/file incl. keep-open hint), media tiles + full-screen viewer (swipe-to-dismiss), reactions (overlap, +N inspect sheet), typing pill, scroll-to-latest, context menu, composer (attach tile sheet, reply/edit ctx, bot cost line), secure-chat notice, lazy history, member sheet (relation-aware), channel sheet, incoming-call overlay, in-place updaters (`setMessageStatus`/`setPaymentStatus`/`removeMessage`).
- Demos: `src/demo/chat.html` (two phones + states matrix), `src/demo/desktop.html` (#19 split-view pitch), `src/demo/app-frame.html`, `src/demo/components.html`. All double-clickable (file://).
- Icon registry: 77 glyphs, regenerate with `node scripts/generate-icons.mjs` after Damir exports.

## Environment quirks (IMPORTANT)

- **Claude's sandbox serves STALE/TRUNCATED copies of files edited in-session.** Never trust `bash` reads (cat/grep/node) of files you've edited — use the Read tool. To syntax-check edited files, transcribe Read content verbatim to /tmp and `node --check` there. Audit agents must be told this explicitly.
- `src/demo/spixi.iife.js` is GENERATED but currently **hand-maintained**: manual `BATCH 3/3b` sections near the end supersede earlier definitions (function declarations rebind; never duplicate top-level `let`/`const`). Every component change must be mirrored there + the export map extended — until the normalization run (task 1 below).
- Icons live on `window.SpixiIcons`, NOT in the `window.Spixi` export map (a destructure of `icon` from Spixi silently kills a demo script).

## Non-negotiable rules

- Bridge protocol FROZEN — new commands are §8 proposals only (ARCHITECTURE.md).
- Component CSS uses **semantic tokens only**; raw values need a "sanctioned" comment.
- One `.js` + one `.css` per component; free exported functions for updates (#44); data-attributes mirror Figma names (#16).
- Demos must run via double-click (file://) against the bundle.
- **Audit loop per milestone (#46)**: adversarial agents → fixes → reviewer until CLEAN. Damir sometimes defers it — ask, don't skip silently.
- **Every significant decision = a DECISIONS.md row.** Interview Damir (AskUserQuestion) before building anything underspecified; he expects proposals with recommendations.
- Damir reviews diffs in GitHub Desktop and commits himself.

## Your task list, in order

1. **Bundle normalization (⚠️ top of CLAUDE.md):** `node scripts/build-demo-bundle.mjs` + `node scripts/smoke-test.mjs` — run on REAL files (Mac, or Damir's PC terminal; not the sandbox if staleness persists). Expected diff: comment/order cleanup, `COMPOSER_MAX_LINES`→`MAX_LINES`, `docLocale` joins the export map. Verify all four demos still open. Commit separately: "normalize generated bundle".
2. **Sync ARCHITECTURE.md §9** with every tabled BE question (long overdue — queued since audit r2). Compile from: r2 report table + DECISIONS #64 (voice), #67 (favorites/pinned), #81 (image thumb standard = BlurHash/ThumbHash eval), #82 (sender-composed link preview), #83 (reaction senders), #87 (self-destruct ③, sender/declined-call distinction ⑦), #98 (IxiScope URL + refresh semantics), #99/#102 (blind-group flag, member addresses, relation state), #107 (sender-side transfer progress), #109 (handshake-complete signal on contact accept).
3. **Figma mirror batch** (connector; file key `cQ8yMZF5R0LGM9O1q9502F`): queue = CLAUDE.md Next item 9 + #106 backlog. Highlights: `--icon-bubble-read` dark success-800 · sender-label L 28% · reactions redesigned to OVERLAP (#65) · `--chat-pattern-ink` + gradient-v2 colors (#76) · `--text/icon-on-scrim` (#85) · dark error-badge recipe (with bottomnav #48) · mention-@ (#108) · reference components for everything new (reply quote, edited, typing, scroll-latest, msgmenu, media tile+viewer, member/attach/channel sheets, sysnotice, incoming call, declined call).
4. **Chats shell scaffold** (#67 + new rows): search field collapses under topbar on scroll · filter chips All/Unread/Favorites(flagged off, §8)/Groups · mute/pin plumbing · **#109 accept-handshake staged state** ("Accepting…" latch + "Establishing a quantum-secure handshake…" excerpt, entry gated on BE signal) · #108 mention-@ already in the component · chat-info/group-settings panes (spec first, interview Damir).

**Defer to Damir-led sessions** (his preference): payment-flow UX interviews, desktop polish pass, v1 UX review verdicts, #105 QR placement pick, illustration language.

## Contracts that bite if forgotten

- `setPaymentStatus(row, patch)` **returns a NEW row** — adopt it; re-wire context menus on the replacement (shell duty, #106 note).
- Latched buttons (Pay/Join/Accept…) are released by re-render, never re-enabled in place.
- `status:'failed'` message rows must be re-created, not patched (`setMessageStatus` warns).
- Reply/edit render **only** behind capability flags (#25); blind groups simply omit `onSenderClick` (#99); payment actions in the member sheet are contacts-only (#104).
- Media is tap-to-load by default (P2P IP-leak, #81); `hideIncomingCall` is silent — user outcomes vs bridge events are distinct (#106①).
- Amount display: `formatIxiAmount` — ≤2 decimals, truncated never rounded, round = bare (#77).

Good luck — the decision log is the project's memory. Keep it that way.
