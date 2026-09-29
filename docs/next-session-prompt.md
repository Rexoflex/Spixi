DEVICE DAY — walk the overnight FE round (#1028–#1038) on Mac · iPhone · Android · Windows.

0 · On the PC: `git am overnight-patches/*.patch` on `redesign/frontend` (HEAD must be 26889f1c). Check the
SHA256 list first. Full pipeline (extract-strings → build-locales → build-strings-iife → build-demo-bundle →
build-shells) → `build-shells --check` → `node scripts/smoke-test.mjs` → expect BASELINE OK / the 2 KNOWN and a
delta of +16 from your last run. Wipe `obj`/`bin` (C# changed in 4 files, never compiled).

1 · Read `docs/handoff-2026-09-30.md` FIRST, then DECISIONS #1028–#1038 and
`docs/opus-review-brief-overnight-1028.md`.

2 · Build: Windows F5 (never `dotnet build`, #663) · Android Debug · Mac maccatalyst Debug · iPhone ios-arm64
Debug. A compile error is this batch's bug — paste it verbatim into the session.

3 · Walk `docs/walk-artifact-overnight-1028.html` (28 rows). OV.13 needs the `[M6]` log line. OV.16 and OV.24
are dials — write the pick. Paste "Copy results" into the session.

4 · The session then: fixes the fails (verify first, #294), records the dials as DECISIONS rows, runs the Opus
#46 loop over any fix, and writes the next handoff. Commit + push = Damir. Chat replies in ASD-STE100 (#931).
