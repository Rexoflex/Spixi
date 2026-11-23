# P93 · THE DEV SEED'S VOICE ROWS GET 16-BYTE IDS; THE ADB WALK READS CHROME-ONLY SCREEN PROBES AND NEW PARSER ROWS (batch walktools, items 2–4)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (developer-only C#: `SDevSeed*.cs` compile only with `SPIXI_DEV_COEXIST`; tooling on Damir's PC; nothing reaches a Release build) | none | none: no verb, no push, no WebView setting, no new log line, no new file path; no new adb command shape; the adb allowlist unchanged | built · ⚠ C# UNCOMPILED for the app (`SDevSeed.cs`; `SDevSeedPlan.cs` compiles in CSH) · the walk scripts executed on pwsh 7.4.6 (Linux) with stubs, never on Windows PowerShell 5.1 or the phone until the operator block | 5 min |

**Look here first:** `SDevSeedPlan.rowIdFor` and `chatComplete` (`Spixi/Utils/SDevSeedPlan.cs`), the one writer line in
`SDevSeed.seedFileChats` (`Spixi/Utils/SDevSeed.cs`); in `scripts/device/adb-walk.ps1` `Get-ScreenGap` / `Get-ProbeListGap`,
`Get-ProbeVerdict`, `Test-Probes` and the load-time `sets` refusal; in `scripts/device/adb-walk-parse.ps1` `X-SeedFirstPage` and the
page rows (`X-Page*`, `New-PageDefs`).

**DECISIONS:** #1312, #1478, #1520–#1523, #1530, #1596, #1634, #1665–#1674 (the file seed), #1812 / #1818 (`-HistorySeed`) · this batch:
#1875–#1889.

## What changed and why
- **The seed's voice ids (item 4).** The chat page refuses to play a voice row whose id is longer than a real message id
  (`SingleChatPage.isVoiceIdHex`: at most `2 × CoreConfig.maxMessageIdSize` = 32 hex characters; a real id is a 16-byte `Guid`). The
  dev seed wrote every file-chat row with a 32-byte SHA-256 id, so every voice clip of Seed 55 was refused ("the id is not usable").
  Now `rowIdFor(i, m)` gives a voice row (inline or file) the FIRST 16 bytes of the old id; every other row keeps the old 32-byte id.
  The writer and the top-up test (`chatComplete` → `topUpAction`) use the same function, so a phone with the OLD seed reads "partial:
  Remove the seed, then Seed" (the existing fail-closed path) and a fresh seed writes the new ids. The play check is unchanged.
- **The screen probes (item 2).** A screen of the device map may hold one probe SET per theme (`sets`: `light` / `dark`, 1 or 2 sets,
  each validated by the old rules); only `chat` and `viewer` may use it (any other screen: a usage error before any adb command). The
  chat and viewer probes read only chrome colours (the message field, the viewer's close button and scrims), not the chat appearance.
  The map's VALUES move only with the operator block's calibrate.
- **The parser (item 3).** "first swipe -> 1st page" of `-HistorySeed` pairs the page with histcs's C# line `[P1] chat loadmore in`
  when it exists, else takes the first `chat load` of the rep window when the window proves a request (`shell send loadmore`); new
  OPTIONAL rows per older page from five fixed-word lines. The old rows are byte-identical.

## Security lens (#1312)
| Question | Answer |
|---|---|
| A new verb, push, WebView setting, `spixi.*` key, fetch? | none |
| A path into a Release build? | no: `SDevSeed.cs` and `SDevSeedPlan.cs` sit wholly inside `#if SPIXI_DEV_COEXIST`; the symbol is defined only at `Spixi/Spixi.csproj:43` (`SpixiDevCoexist` true by default only for Debug, `:40`); the `SpixiStoreReleaseGate` target (`:428`) fails a store build with the property or the symbol (unchanged) |
| A log line? | none new (the seed's status text is unchanged; the parser writes summary rows of numbers and fixed words, its raw-line guard is unchanged) |
| A file write or delete? | the seed: none new (the same rows, the same files; only the id bytes of 20 voice rows); the walk: none new (no new screenshot; the PNG sweeps unchanged) |
| The adb allowlist? | unchanged (pin `pins-walktools/b-screens` k6 holds the four allowlist functions by SHA-256) |
| Typed input into the app (#1522 ②)? | none |

## Proof
CSH `WalkToolsSeedTests` (6 tests, each red on its own break) + five id lines of `FileWalkSeedTests` re-based to the writer's id ·
pin `pins-filewalk/a-file-seed` a13 / a17 / a18 re-based after a look at the diff · pins `pins-walktools/b-screens` (8 keys) and
`pins-walktools/c-parser` (9 keys), each key red on a one-token break; by hand (pwsh 7.4.6): `b-screens-run.mjs` (87 cases: the real
functions with a stub bitmap), `c-parser-run.mjs` (15 keys on 15 synthetic run folders); the new parser on a copy of the real run
`20261122-1350` (not in the repo): "first swipe -> 1st page" 10982 ms in rep 1, the old parser "no data" · the hashed walk pins
re-based (#1884) · #46 CLEAN at r3 + one Fable 5.2 security-only pass 0 MAJOR / 0 MINOR (#1885). NOT proven: the app build of
`SDevSeed.cs` (the Windows job of `redesign-ci`), Windows PowerShell 5.1, the PNG read (System.Drawing), the phone (the operator block).
