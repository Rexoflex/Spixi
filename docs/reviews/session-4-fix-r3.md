# Session 4 fix batch · #46 r3 (fresh Opus over d0131d11): 0 MAJOR · 1 MINOR · 3 NIT · 5 mutants, 0 survivors → CLEAN at r3

| Round | Reader | MAJOR / MINOR / NIT | Mutants (survivors) |
|---|---|---|---|
| r1 | A C# · B shells+pins (Opus) | 0/3/5 · 2/4/4 + motion | 10 (5) |
| r2 | fresh (Opus) | 1/3/8 | 6 (3) |
| r3 | fresh (Opus) | 0/1/3 | 5 (0) |

Recorded, not fixed (reason):
- R3-m1 phone LANDSCAPE: the 45 vh height cap makes a square photo tile 162 × 162 at 740 × 360, so the progress face (ring, %, hint) clips. Rare position for a chat; a walk row on the next re-walk decides (a compact face under ~180 px, or 4:3 for progress tiles under the cap).
- NIT the size-hint code (`jpegSize`, the `setSrc` hint branch) is dead now that every photo-file tile is square — remove in the refactor stage (S8) or the strip.
- NIT `data-quiet` can stay on a loaded tile after offer → download → preview (no visible effect).
- NIT the R2-MAJ1 pin checks only the first 30 ms (the reader's Chromium run covered the fade + the 600 ms glyph).
- From r1 / r2 NIT rows: late-call `oldMessage`, peer-suppressible system ids, multi-device missed call, unsynchronised `++`, probe naming, Tap/Click wording on retry lines, the received side has no `--jump-keep`, 288 → 294 at completion.
