# P71 · CHAT SHELL: AN OLDER PAGE INSERTS ONLY ITS OWN ROWS (HV-1) + THE DEVELOPER LINES OF THE HISTORY AND THE OPEN (HV-0 / PO-0 shell) (batch photo1b)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (the chat log render — the surface where untrusted text is drawn; no new sink) | no | none (the prepend contract `addMessages(json,"prepend")` + `messagesDone(show_more)` is unchanged; one new cap word `olderInsert`) | built behind its own switch `HistoryInsertOnly` (cap absent = the full rebuild, the old path) | 6 min |

**Look here first:** `src/shells/chat.html` `renderOlderInsert()` and its helpers (`buildLoopRow`, `finishLoopRow`,
`noteRendered`, `renderCtxKey`), the call in `messagesDone`; the lines `olderLines`, `cdLateStart` / `cdLateEnd`, the
split in `onChatScreenLoaded`.

**DECISIONS:** #1742 (History 1) · #1518 · #1517 · this batch: #1755–#1774.

## What changed and why
- **Mechanism** (`claude/history-research-2026-11-18.md`, re-read in `docs/photo1b-mechanisms.md` § A): each page of
  older messages ran `renderLogNow()`, which rebuilds EVERY row of the log (long task 96 → 132 → 165 ms on pages 1–3 on
  the Galaxy A52s, ~0.65 ms per row of the whole log).
- **The insert:** with the cap, the page computes the full render's plan (payment dedup, photo groups, positions) over
  the model, checks that the old rows are exactly the tail of that plan and that the seam is local, then builds ONLY
  the new rows through the SAME row builders (`buildRow` / `buildGridRow`, `createDateSeparator`, `labelRow`,
  `applyRowReactions`, `wireMenu`) and inserts them before the old first row; the seam row (its group position) and EVERY old row
  that quotes a row the model holds are re-built in place by the same builders. A render-context key holds every piece
  of shell state a row builder reads at build time (the audit table in the comment above `renderCtxKey`: the chat mode,
  identity, my own name / avatar, previews, autoload, the owner, the caps, the composer lock, the call state, the
  roster, the avatars, the unread marker, the desktop flag, the locale and hour cycle, the day); a change of any of them
  sends the page to the full render (#46 r1 S-1 / R1 / R3). By design a page that brings a sender name not seen yet, or
  my first own row, also goes to the full render (the @-mention list changes). Anything not provably local runs the
  full render (the old path): a photo group or a payment txid across the seam, a new row quoting an old one, the
  unread divider in the new part, select mode, a rise / slide / jump pulse in flight, a changed render context
  (mode, identity, caps, previews, the day), focus inside a node that would be replaced, a throw.
- **No new HTML path.** Every node comes from the existing builders; message text never becomes markup. A pin
  (`pins-photo1b/a-insert`) compares the inserted log with a full render of the same model byte for byte after every
  page, on text, group, photo-album, payment and hostile-string chats, and checks that no `script` / `on*` attribute
  from a hostile string exists.
- **The developer lines** (`<html data-p1>` only — the dev carrier `SpixiP1`; a store build writes none; fixed words +
  integers): `[P1] shell older insert rows= mode=insert|full build= swap= fix= fade= ms=`, `[P1] shell older frames n=
  max=` (600 ms after each page), `[CDPERF] chat-shell late thumbs= voice= js=` and `[CDPERF] chat-shell build= layout=
  fade= nodes= photo= voice=` (the open). The late counter wraps the two page globals `window.setFileThumb` /
  `window.voiceInfo` on the FIRST open of the document only, from `messagesDone` to just before `ixian:painted` (a 5 s
  backstop restores them if the present never comes) and restores them; the wrapper calls the
  original with the same arguments and only counts.

## Proof
pins `scripts/pins-photo1b/a-insert.mjs` (byte-equal insert vs full render; hostile strings; cap off = the old path),
`d-lines.mjs` (dev only; fixed grammar; hostile text absent) · harness `scripts/pins-photo1b/harness-history.mjs` (CPU × 4)
· the walk rows of `docs/walk-photo1b.md` (no stutter, no jump, seams right).
