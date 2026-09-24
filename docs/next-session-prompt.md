THE OFFICE FIX ROUND — MORNING: apply, compile, walk, commit (Damir present).

0 · Read `docs/handoff-2026-09-25.md` FIRST, then `docs/f5-checklist-office-fix.md`. Confirm the tree carries
the office-fix commits (#974–#988) on top of `c97c94cd` — `git log --oneline -10`. If not, Damir applies
`office-fix-patches/` with `git am` from patch 0002 (0001 is the prompt commit, already on GitHub).

1 · The first compile of this round is Damir's (12 C# files + 2 new). A build error is this round's bug:
take the error text verbatim, fix the smallest thing, re-run `cs-syntax-check` and the office-fix pins.
Watch first: `global::CoreFoundation.OSLog` in `Spixi-PushService/SpixiPushGate.cs` (r1 MAJOR — a bare
`OSLog` is CS0118) and `UNUserNotificationCenter.SetBadgeCount` in `Platforms/MacCatalyst/SPushService.cs`.

2 · The walk: `docs/walk-artifact-office-fix.html` (23 rows). Console.app with `spush` for iO.5 / iO.11 —
read the `[SPUSH]` and `[SPUSH-APP]` lines against the table in DECISIONS #974 BEFORE any iO.11 fix (#294).

3 · The fix round for what the walk finds. Then, unchanged: the read-only code-review phases
(`docs/audit-refactor-plan.md`) → freeze → strip → gate re-run → TestFlight (#916/#933).

NOT this session: L6 · batch 4 · the memory kill · the translator pass · CORE-9…13 · server-side mute.

Rules #215 · #294 · #660 · #663 · #771 · #772 · #798 · #811 · #895 · #943. Chat replies in ASD-STE100 (#931).
