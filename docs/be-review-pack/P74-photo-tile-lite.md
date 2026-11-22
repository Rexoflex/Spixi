# P74 · CHAT SHELL: THE LIGHTER PHOTO TILE (PO-4) (batch photo1b)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| NONE (fewer nodes; no new sink) | no | none (one new cap word `photoTileLite`) | built behind its own switch `PhotoTileLite` (cap absent = the old tile, byte-equal) | 3 min |

**Look here first:** `src/components/typed-bubbles.js` `createImageFileBubble` (`ensureFace`, `lazyFace`, `lite`),
`setImageFileThumb`; `src/components/media-bubble.js` (`lite` in `setState`); `src/shells/chat.html` `buildFileRow`.

## What changed and why
- Mechanism (`claude/photo-open-research-2026-11-17.md` § 3; `docs/photo1b-mechanisms.md` § B): every complete local
  photo tile built a hidden file face, an overlay icon (an `icon()` parse) and a spinner state, decoded the JPEG head
  for a tile FIXED at 320 × 320, and re-pinned the log on every picture load.
- With the cap: a complete tile that waits quiet or is already loaded builds no file face; the face is made when it is
  NEEDED (the picture fails → the file face and "Open file", as today; the 600 ms quiet wait ends with no picture; a
  state change) at the same place and with the same fade. No overlay icon / spinner on a complete tile (its overlay is
  `display: none` for every file tile). No JPEG head decode, no re-pin on load. The accessible name is byte-equal in
  every state. Offered, downloading, failed and my own sending tiles are unchanged.

## Proof
pin `scripts/pins-photo1b/e-tile.mjs` (48-photo open; the fallback; the quiet wait; aria byte-equal; cap absent = the
DOM fingerprints of the base build) · harness `harness-photos.mjs` · walk rows "pictures appear without a jump", "a
picture that fails shows the file card".
