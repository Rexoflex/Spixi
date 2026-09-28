THE #991 FIX ROUND — Windows session (Damir present).

0 · Read `docs/handoff-2026-09-28.md` FIRST, then DECISIONS #989–#992. `git pull`; confirm the tip is
`28551643` (#992) or later — `git log --oneline -5`.

1 · If the Windows (F5) or Android build fails, that error is the first bug: take the text verbatim, fix the
smallest thing, re-run `cs-syntax-check`.

2 · Fix, in order: **M7** short-log gap behind the composer → **F1** first item focused on sheet open →
**N2b** Create group CTA above the keyboard → **M6** Mac title-bar hairline → **M5** Mac paste in
add-contact (diagnose with a log line first, #294) → **T1** remove the bubble tail (the dark hairline
cannot follow it) and use a small radius in that corner — ask Damir first: dark only or both themes. Each fix: a render or jsdom proof, a pin, a mutation
that turns the pin red. Full pipeline + smoke before each commit; compare the delta, not the number (#895).

3 · Write a short walk list for the office re-test (M5/970.6, M6, M7, F1, N2b + dark/light pass).
Record the round in DECISIONS (#993+).

Then, not this session: office test → code review (`docs/audit-refactor-plan.md`) → freeze → strip (#933)
→ gate re-run → TestFlight (#916). Before the release build: `maxLogCount` 5 → 1.

NOT this session: L6 · batch 4 · the memory kill · the translator pass · CORE-9…13 · server-side mute.

Rules #215 · #294 · #660 · #663 · #771 · #772 · #798 · #811 · #895 · #943. Chat replies in ASD-STE100 (#931).
Never `git add -A`. Commit and push are Damir's.
