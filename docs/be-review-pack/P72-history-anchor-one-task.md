# P72 · CHAT SHELL: THE READER'S POSITION AT AN OLDER PAGE IS TAKEN AT THE END OF THE PAGE (HV-3) (batch photo1b)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| NONE (a scroll position) | no | none (one new cap word `olderAnchor1`) | built behind its own switch `HistoryAnchorOneTask` (cap absent = the anchor at `addMessages`, the old path) | 2 min |

**Look here first:** `src/shells/chat.html` `addMessages` (the anchor line is skipped with the cap) and `messagesDone`
(the anchor is taken just before the render).

## What changed and why
- The first visible row was taken at `addMessages` — a separate push from `messagesDone` — so a scroll between the two
  pushes was undone at the fix (jump risk (1) of the history report § 2). With the cap the anchor is taken in
  `messagesDone`, in the same task as the insert and the `scrollTop +=` fix; no frame is painted between them.
- The other places that set the anchor (the 8 s timeout, an empty answer) are unchanged. The later C# batch (P-28:
  the read and build off the UI thread) relies on this: a page may land at any time.

## Proof
pin `scripts/pins-photo1b/b-anchor.mjs` (the anchor row keeps its y ± 1 px on every page; a scroll between the pushes
is kept with the cap, undone without it; no animation frame between the swap and the fix) · walk row "no jump".
