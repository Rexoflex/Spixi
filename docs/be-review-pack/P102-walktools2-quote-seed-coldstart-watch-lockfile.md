# P102 · THE DEV SEED'S QUOTE CHAT (SEED 57); THE ADB WALK'S STEP `coldstart-watch` AND ITS EVENTS PULL; HOME PROBE SETS; THE TEST-TOOL LOCKFILE (batch walktools2)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (developer-only C#: `SDevSeed*.cs` compile only with `SPIXI_DEV_COEXIST`; tooling on Damir's PC; test tools; nothing reaches a Release build) | none | none: no verb, no push, no WebView setting, no `spixi.*` key, no fetch, no file path; ONE new adb command shape (the events pull, a phone-side `grep -o -E` cut) | built · ⚠ C# UNCOMPILED: `SDevSeed.cs` · #46 CLEAN (#1942) | `Spixi/Utils/SDevSeedPlan.cs` § 4, `SDevSeed.seedQuoteChat`; `scripts/device/adb-walk.ps1` `$script:WatchEventRe`, `Invoke-ColdWatchRep`, `Save-WatchEvidence`, `Test-WatchPidof`; `adb-walk-parse.ps1` the watch functions; `package-lock.json` |

**DECISIONS:** #1312, #1520–#1522, #1567, #1571, #1596, #1634, #1831, #1878, #1879, #1882 · this batch: #1935–#1943.

## What changed and why
- **The quote chat (item 1).** WALK #1836 could not walk the quote jump: no seed chat held a reply. Seed index 56 = "Seed 57 Mojca
  Vrabec": 1000 text rows with 16-byte ids (`parseMessageIdHex` refuses a 32-byte seed id, #1882), fixed times, four replies in the
  app's own text shape (`ReplyQuote.compose`, a 1:1 carries no name) whose targets sit ≥ 3 older pages up. Three one-statement hooks
  (seed, the unseed bound, status). Two `[DEVSEED]` lines: an index / count and an exception TYPE only.
- **`coldstart-watch` (item 2).** N cold starts; a start that is not proven (one pid = the pid of the start, our app in front, after a
  fixed 10 s) keeps the system events and the app log of its pid BEFORE the next `logcat -c` (F-1 of 2026-11-23 lost both).
- **Home sets (item 3).** `screens.home` may hold a light and a dark probe set (#1878's form); the dark values are proposed from the built
  shell in Chromium and confirmed by the phone block.
- **The lockfile (item 4, ruling #1831).** `package.json` + `package-lock.json`; CI installs with `npm ci`; jsdom stays 29.1.1.

## Security lens (#1312)
| Question | Answer |
|---|---|
| A new verb, push, WebView setting, `spixi.*` key, fetch? | none |
| A path into a Release build? | no: both seed files sit wholly inside `#if SPIXI_DEV_COEXIST` (the symbol only at `Spixi/Spixi.csproj:43`; the store gate unchanged) |
| A log line? | the seed: `[DEVSEED] quote chat stopped (<Type>)` and `[DEVSEED] quote chat: N messages skipped, the first i:j (<Type>)` (numbers and a type name); the status sentence gains "Quote chat (Seed 57): …" (counts and ms). The walk: summary rows of numbers and fixed words; no raw line |
| A new adb command? | ONE whole string: `logcat -d -b events -v threadtime \| grep -o -E '<pattern>' > /data/local/tmp/adbwalk-log.txt` — `grep -o` keeps only the time, pid / tid, a priority letter, six `am_*` tags with their leading numeric fields + the pinned package + numeric fields, and `killinfo` numeric fields (#1938). No message, reason, exception or other package name leaves the phone. Kept: the numeric `killinfo` fields of every lmkd kill (no names) — recorded |
| A file write or delete? | the seed: none on disk (text rows only); the walk: two pulled files per NOT-proven start in the git-ignored run folder (`android-walk-coldstart-watch-NN-events.txt`, `-NN.txt`), the existing phone file, `rm -f` after the pull |
| Typed input into the app (#1522 ②), a new entry (#1521)? | none: the step sends no tap, key or screenshot |
| The test tools? | the same 122 packages, now pinned with resolved + sha512 integrity (`npm ci` refuses a mismatch) |

## Proof
CSH `WalkTools2SeedTests` (10) · pins `pins-walktools2/<a-quote-seed|b-coldwatch|c-home-sets|d-lockfile>` (8 + 13 + 5 + 9 keys, each
red on a one-token break) · by hand (pwsh 7.4.6, Linux): `b-coldwatch-run.mjs` (26 cases; the allowlist near misses, the GNU-grep cut,
15 synthetic run folders, the driver through a fake adb incl. an IO error and a SIGINT), `b-screens-run.mjs`, `c-parser-run.mjs`;
`c-home-render.mjs` (Chromium) · the hashed walk pins re-based (#1941). NOT proven: the app build of `SDevSeed.cs` (the Windows job of
`redesign-ci`), Windows PowerShell 5.1, toybox grep and the Android 14 events format (the phone block).
