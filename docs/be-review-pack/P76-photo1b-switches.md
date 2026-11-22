# P76 · C#: THE FIVE SWITCHES OF THE CHAT SHELL BATCH AND THEIR CAPS (batch photo1b)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| NONE (preferences read once; cap words) | no | none (five cap words in the existing `setCaps` push of the chat page) | ⚠ `SingleChatPage.xaml.cs` UNCOMPILED (Windows: CI; Android / iOS / Mac: Damir's builds); `SpixiFlags.cs` compiles in csh | 2 min |

**Look here first:** `Spixi/Utils/SpixiFlags.cs` (the photo1b block, `readPhoto1b()`, called last in `init()`),
`Spixi/Pages/Chat/SingleChatPage.xaml.cs` (one line before `Utils.sendUiCommand(this, "setCaps", caps)`).

## What changed and why
- Five int preferences, read once at start: `flagPhotoTileLite`, `flagVoiceWaveLite`, `flagHistoryInsertOnly`,
  `flagHistoryAnchorOneTask`, `flagFadeFromBand`. Absent = ON; a stored 0 turns a switch OFF only while dev mode is on
  (`S16PassRules.effectiveFlag`, the rule of every switch in the file); a throwing read keeps them ON. Before `init`
  runs each is `false` (the old path). No Developer-screen control (like Fix batch 2's switches). Leaving dev mode does NOT remove these five keys (HomePage removes only the PerfB1 keys): a stored 0 stays on disk, is inert outside dev mode, and acts again when dev mode comes back (#46 r1 S-5; render paths only, no security effect).
- Each ON switch adds its cap word to the chat page's caps text (`,photoTileLite,voiceWaveLite,olderInsert,olderAnchor1,
  fadeBand`); the shell reads `bridge.cap(...)` when it decides; a cap absent = the old path.
- One line in `ixian.log`, every build: `[FLAGS] photo1b tilelite=<0|1> voicelite=<0|1> olderinsert=<0|1>
  olderanchor=<0|1> fadeband=<0|1>` (fixed words and 0 / 1; the walk's BUILD row).

## Proof
csh `scripts/csh/Photo1bFlagsTests.cs` (9 tests: devMode absent, absent ON, the dev rule, each key its own switch, all 32 lines and caps
texts, the line once and last, a throwing read) · the re-based source pins `pins-fixb1/g-sparekeep` (the file hash,
read after a look at the diff), `pins-fixb2/d-pay-confirm`, `pins-perfb1/f-flags`, `pins-v1am/c-csharp`, `pins-s6b/cs`,
`pins-s7/cs`, `pins-s9/a1-wiring`.
