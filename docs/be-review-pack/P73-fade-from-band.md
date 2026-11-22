# P73 · CHAT SHELL: THE COMPOSER FADE PASS STARTS AT THE BAND (HV-4) (batch photo1b)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| NONE (which rows get a CSS mask) | no | none (one new cap word `fadeBand`) | built behind its own switch `FadeFromBand` (cap absent = the walk from the newest row, the old path) | 2 min |

**Look here first:** `src/shells/chat.html` `fadeStartIndex`, `fadeBandStart`, `composerFadePass`.

## What changed and why
- The pass that dissolves rows under the composer walked from the NEWEST row up and skipped every row below the band
  one by one — up in old history that is one rect read per row below the screen, on every scroll frame and every
  render. With the cap a binary search over `box.children` finds the last child whose top is above the band's bottom,
  and the walk starts there; zero-size children are stepped over. While a transform is in flight (a send rise, a
  composer slide, a jump pulse) the old walk runs. The masks written are the old walk's.

## Proof
pin `scripts/pins-photo1b/c-fade.mjs` (the same mask strings on the same rows as the old walk at eight scroll
positions, zero-size runs included; cap off = the old walk) · the two Session AE smoke rows (re-based: the old walk
held with the cap-absent start).
