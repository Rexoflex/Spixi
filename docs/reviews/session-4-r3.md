# Session 4 · #46 round 3 — fresh reader (Opus) over the r2 fixes `4134cb64`

Result: 1 MAJOR · 3 MINOR · 4 NIT · 6 mutants, 1 survivor. Every r2 fix verified (R2-1 in Chromium, R2-2, m6, N1, N3 loop bound, N5 every bump under the lock).

| ID | Sev | Finding | Fix |
|---|---|---|---|
| R3-M1 | MAJOR | the sending-tile scrim uses `--surface-scrim-deep` (0.35 alpha in light) → white text ≈ 2.2:1 over a bright photo; the pin locks the literal in | `--surface-scrim` (0.6, mode-less, 4.69:1 over white — computed; r4 NIT-1 corrected the earlier ≈ 4.9); pin computes the contrast |
| R3-m1 | MINOR | the sending tile blinks on every re-render (picture re-fades from 0 under an instant scrim) | a re-built tile whose picture is already decoded shows it at once (no fade) |
| R3-m2 | MINOR | `fileAria` still says "Downloading … , Delivered" for MY sending file card (previews OFF / non-image) | own transfer = "Sending", one rule for card + tile |
| R3-m3 | MINOR | survivor: the build-time picture on a sending tile is unpinned (a re-render drops it) | pin with a re-render while sending |
| R3-N1 | NIT | the busy lock fallback (`presentPlainModal`) does not bump `navSeq` | bump |
| R3-N2 | NIT | an OFF→ON `setFileThumb` landing between clear and add is ignored but counted as sent | recorded (rare, read-only finding; a reopen heals) |
| R3-N3 | NIT | a re-flush mid-transfer resets the ring to 0 and re-shows Cancel (inherited for any re-flush) | recorded (inherited re-flush grammar) |
| R3-N4 | NIT | sending tile: progress not announced (disabled button); no "failed" for a sent file (C# has none) | recorded — walk row + BE ask (no sent-failure signal) |
