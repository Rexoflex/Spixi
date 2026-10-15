# S20G #46 round 1 — findings, verdicts, fixes

Readers: A (C# + security), B (shells), C (launch + tests). 2 MAJOR (B-2, C-F2) + 1 MAJOR build defect (B-1) · 14 MINOR · 14 NIT. Smoke run 1 (stale bundle) added: the launch trim gate, GATE 64 (colour literals), A3 tile (= B-1).

| # | Finding | Verdict | Fix (owner) |
|---|---|---|---|
| B-1 MAJOR | Built bundle stale after the Q-1 copy-back (no `createKindTile`; Downloads tiles unstyled) | TRUE (main session ran build-shells without build-demo-bundle) | full pipeline after every source copy-back (main) |
| B-2 MAJOR | R-6 desktop: after a media Send the focus stays on the action button, which turns into the mic; Space starts a recording | TRUE | skip the refocus only for a touch / pen activation; mouse + keyboard keep `input.focus()` (B1) |
| C-F2 MAJOR | F-2 resumes while a keyboard / screen-reader user is in the carousel (WCAG 2.2.2) | TRUE | `focusin` inside the welcome carousel pauses with no timer; `focusout` re-arms the 15 s (B2) |
| A-1 | keepPrevious throws → StashBusy forever, "free space" text | TRUE | fall back to a fresh unique stash; StashBusy unreachable on the flag path; own log words (B4) |
| A-2 | Kept folders enter Android cloud backup / device transfer | TRUE | one fixed parent `restore-previous/<stamp>`; Android backup + data-extraction rules exclude it; iOS / Mac excluded from backup (B4) |
| A-3 | The question shows when wallet.ixi is still on disk (lockout → welcome) | TRUE | `needsReplaceConfirm` also requires no wallet file on disk (B4); the wallet-only backup over-statement recorded |
| A-4 | No dev switch for flagS20G | TRUE | `ixian:devflash:s20g` on DevPage + dev.html like P28 / P29 (B4) |
| A-N1 | `confirmReplaceThenRestore` async void outside the fence | TRUE | whole body in try / catch (B4) |
| A-N2..N5 | desktop empty-pane flash · fromSettings before a refused present · other overlays still count a chat as displayed · "kept in the data folder" on phones | recorded (P30 / gate row) | B4 updates P30 |
| B-3 | chat-info selected chip hover / press ink 3.44 in dark; See-all tabs not on N-2 | TRUE | the shared chip hover / active ink + the tabs on `--text-chip-selected` (B1) |
| B-4 | 60 % outline over the gradient: outline-vs-fill < 3 | TRUE (by design of a translucent edge) | rule restated: outline vs GROUND ≥ 3 (measured 3.10–3.86); header numbers updated (B1); 🟡 row |
| B-5 | settings / downloads ship all of shared-items.css (+9–10 KB) | TRUE | `file-tile.css` (tile + name + meta) linked where needed (B3) |
| B-6 | the patch path freezes the day / clock labels | TRUE | the patch path re-writes the day + clock text (B3) |
| C-m1 | R-3 reduced motion pinned on the token only | TRUE | pin the `::after` duration under reduce (B2) |
| C-m2 | F-2 re-arm paths unpinned | TRUE | pin Tab while paused + pointerdown while running (B2) |
| C-m3 | R-5 signature ignores time / size | TRUE | sig includes time + size; pin (B3) |
| C-m4 | Q-1 long-name split unpinned | TRUE | pin with a long stem (B3) |
| C-m5 | P0 catch path untested | TRUE | test seam (B4) |
| C-m6 | b2-toggle re-base reads the vertical axis | TRUE | read the inline insets (B3) |
| C-m7 | N-2 has no pin | TRUE | `c-chip` pin on the built index + contact_details (B1) |
| smoke | launch trim gate: `setLaunchVersion` trims | TRUE | no trim (B2) |
| smoke | GATE 64: `#fff` in color-mix without `sanctioned:` | TRUE | a token (`--chip-lift` white) or the sanctioned marker (B1) |
| NITs | R-4 token in a component file · fade timing 300 vs 380 · disabled selected chip keeps the highlight · Q-1 tag patch on hover · F-1 order clause · dark floors 1.10 → 1.15 · tokens.css:1042 comment · #1406 duplicate verb · F-4 thin margin | R-4 token: accepted (component-scoped, zeroed locally); fade: scale with the token (B4); disabled: reset (B1); tag: follow the row ground (B3); order clause (B4); floors 1.15 (B1); comment (B1); #1406 / F-4: recorded |
