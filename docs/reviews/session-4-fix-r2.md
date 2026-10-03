# Session 4 fix batch · #46 r2 (fresh Opus over 4f97213d): 1 MAJOR (from #1147 (5)) · 3 MINOR · 8 NIT · 6 mutants, 3 survivors

| ID | Sev | Finding | Fix |
|---|---|---|---|
| R2-MAJ1 | MAJOR | desktop A → B → A: `quietSince` (document-wide) is never reset on a peer switch, so the reopened chat shows the glyph then swaps — the flicker #1147 (5) was for | reset the quiet state per peer (`onChatScreenReady`), pin A → B → A |
| R2-m1 | MINOR | a completed download still resizes once (294×220 → 294×294) | every photo-file tile reserves the square from its first frame |
| R2-m2 | MINOR | the dark brand gradient has no gap token (1.13:1 seam) | a gap token for it |
| R2-mut | MINOR | survivors M1 (load refit on a completed download), M3 (green gap token), M4 (brand gap token) | pins over every ground with a gap token |
| NITs | NIT | A-M1 now behind a block with no try/catch → guard the count; request-decline removals don't clear the heart → clear (cheap); others recorded (bigger no-preview tiles; 288 → 294 at completion; data-quiet kept; received side has no --jump-keep (pre-existing); redundant selector; light gradient stops) | as noted |
