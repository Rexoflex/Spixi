THE OFFICE WALK after the card reskin + polish round.

0 · Read `docs/handoff-2026-09-28c.md` FIRST, then DECISIONS #996–#1015. `git pull`; confirm the batch is
committed (`git log --oneline -5`). If the Windows (F5) or Android build fails, that error is the first bug.

1 · Walk `docs/walk-993-retest.md` (R.1–R.17 + P.1–P.15) on iPhone 15 + Mac, Windows/Android sanity. Bring the
`[M5]` / `[M6]` log lines back verbatim.

2 · Fix round on the walk's F rows. Each fix: render proof, a pin, a mutation that turns it red. Full pipeline +
smoke; compare the delta (#895). Opus #46 loop until CLEAN.

Rules #215 · #294 · #660 · #663 · #771 · #772 · #798 · #811 · #895. Chat replies in ASD-STE100 (#931).
Never `git add -A`. Commit and push are Damir's.
