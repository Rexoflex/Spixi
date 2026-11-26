# Agent contract — quotebox

Written by the lead before any agent started (`docs/orchestration.md` § 4). Prompt: `claude/session-quotebox-prompt.md`.

## 1 · Base
- Tree: `work/quotebox` @ `0eda93f5` "Merge pull request #28 from Rexoflex/work/walktools2" · baseline (cloud twin,
  `../Ixian-Core` @ `097341a`, `TZ=America/Los_Angeles`, `npm ci` on the committed lock: jsdom 29.1.1): `BASELINE OK — 7054
  pass / the 2 KNOWN` · `CSH pass=908 fail=0` · `build-shells --check` ✓ · `build-locales --check` ✓ · `cs-syntax-check` ✓
  (291 files).
- Must hold: the PARAMOUNT isolation invariant · C# touches no risky parts · the frozen bridge (no new verb, no new push)
  · #1312 / #1478 (a behaviour change = its own switch, the old path the fallback) · the security handover gate · edit
  `src/`, never `Spixi/Resources/Raw/html` · nothing in Ixian-Core · the files of `fixb5` and `sizerule` untouched.

## 2 · Items and ownership
| Item | Who | Model | Owns | Reads only | Owes |
|---|---|---|---|---|---|
| 1 · mechanism | the lead | Claude Opus | `docs/quotebox-mechanism.md`, `scripts/pins-quotebox/harness-seed57.mjs` (by hand; not in smoke) | `src/shells/chat.html`, `src/components/message-bubble.js`, `src/components/message-menu.js`, `Spixi/Pages/Chat/SingleChatPage.xaml.cs`, `Spixi/Utils/ReplyQuote.cs`, `Spixi/Utils/SDevSeed*.cs`, `Spixi/Utils/SpixiContentPage.cs`, Ixian-Core `Streaming/Storage/LocalStorage.cs` | a red-then-green proof of the cause, or the likely causes + walk rows that tell them apart |
| 2 · the fix | — | — | **not built**: the cause was not proven off the device (mechanism § 0) | | |
| 3 · walk rows | the lead | Claude Opus | `docs/walk-quotebox.md` + its Artifact | | every set-up command in full |
| 4 · size | the lead | Claude Opus | the R1 / R3 lines in the status doc | | |
| — · #46 | fresh read-only readers | Claude Fable 5.2 (security-only pass over the final tree) · Claude Opus (the claims of the mechanism, the harness, the walk sheet) | none | the tree | findings with `file:line` |

No builder agent: the batch changes no app file (`src/**`, `Spixi/**`: 0 lines). Scratch: `/home/claude/work` (outside
the tree).

## 3 · Interfaces
None between items. The harness meets the shell only through the shell's existing pushes (`executeUiCommand` with
`addMe` / `addThem` / `addMessages` / `messagesDone` / `jumpToMessage` / `updateMessage` / `setNickname` / `setCaps`) and
its existing sends (`ixian:loadmore`, `ixian:quotejump:`), read from navigation requests.

## 4 · Stage 2 (R4)
This batch adds no switch, no old path and no plumbing: **stage 2 deletes nothing of it.** The harness and the docs stay
(tools and records).

## 5 · Integration and checks
The full smoke on the final tree (one at a time, L153) + CSH + both `--check` gates + `cs-syntax-check` → the #46 loop
until CLEAN → the export docs → commits, the newest base merged if it moved, ONE push of `work/quotebox`, each commit read
back, the compare link (#1546).

## 6 · Escalation log
| Item | Attempt | Model | Result | Next |
|---|---|---|---|---|
| 1 | 1 | Claude Opus (lead) | not reproduced off the device; nine Chromium runs; four likely causes (#46 r1 and r2 each added one; r3 narrowed what the walk decides) | the walk rows of `docs/walk-quotebox.md` |
