DEVICE DAY — walk the premium round (#1040–#1045) on Windows + Android, then the office (Mac + iPhone).

0 · On the PC: `git am (Get-ChildItem _to_delete\premium-patches\*.patch | Sort-Object Name).FullName` on
`redesign/frontend` (HEAD must be 290a7ce9, the #1039 commit). Full pipeline (extract-strings → build-locales →
build-strings-iife → build-demo-bundle → build-shells) → `build-shells --check` → `node scripts/smoke-test.mjs`
→ expect BASELINE OK 4969 / the 2 KNOWN (+1). C# changed in SpixiContentPage.cs only (uncompiled).

1 · Read `docs/handoff-2026-09-30.md` FIRST (§8 = this round), then DECISIONS #1039–#1045.

2 · Build: Windows F5 (never `dotnet build`, #663) · Android `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug -t:Run`.

3 · Walk `docs/walk-artifact-premium-1040.html` (21 rows). PR.20 = the office rows of the overnight sheet
(Mac + iPhone). Paste "Copy results" into the session.

4 · The session then: fixes the fails (verify first, #294), records dials as DECISIONS rows, runs the Opus #46
loop over any fix, writes the next handoff. After a clean office walk: the freeze → the read-only sweep
(docs/audit-refactor-plan.md) → cleanup → security gate re-run → merge → TestFlight (#916/#933/#971).
Commit + push = Damir. Chat replies in ASD-STE100 (#931).
