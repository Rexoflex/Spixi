# Session 4 · #46 rounds 4 + 5

| Round | Reader | Over | MAJOR / MINOR / NIT | Mutants (survivors) |
|---|---|---|---|---|
| r4 | fresh Opus | r3 fixes `f70b2ccd` | 0 / 3 / 2 | 5 (2: shown-set eviction, key tail) |
| r5 | fresh Opus | r4 fixes `28835945` | 0 / 1 / 2 | 4 (1: the tile half of the live sending selector) |

r4: MINOR-1 a sending file of mine hid "Delivered" / "Read" from its name (undid #1035) → fixed (only the neutral sent tick is dropped) · MINOR-2 / 3 → behavioural pins (257 pictures; same-length keys) · NIT-1 comment 4.9 → 4.69 · NIT-2 the instant path assumes the decoded image is still held (cosmetic, recorded).
r5: MINOR-1 the photo tile's LIVE plain-sent name unpinned (M1 survivor) → `tilePlainSentLive` in the #1028 P.22 block; the break (drop `.c-mbubble[data-file="progress"]` from the live selector) fails exactly that key · NIT-1 card and tile decide one rule from two inputs (recorded) · NIT-2 the eviction pin runs the demo IIFE (same source, both fresh — recorded).
Verdict: **CLEAN at r5** — a fresh reader over the last fixes found 0 MAJOR; every MINOR fixed and pinned.
