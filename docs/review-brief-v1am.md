# Review brief — Session V1A-M Drop 2 (the first-minute moments)

## 1 · What landed (tree: /home/claude/spixi, branch v1am-drop2, base c2dd8034 = 2a469442 S20G + Drop 1)
Contract: /tmp/claude-0/v1am/CONTRACT-V1AM.md (read it). Mechanism: /tmp/claude-0/mech-drop2.md.
- **M1 "What is IXI?"** moment `ixihelp` on the first Wallet open — C# flag `SpixiFlags.V1IxiHelp` (cap `ixihelp`), `S17MomentRules.Ids`, `SMoments` (handleVerb OFF gate + answerAsync case), `V1AMRules.cs`; JS `moment-sheet.js`, `home.html` (showView → tryIxiHelpMoment through pumpMoment / momentAfterResult; "Show my address" → openWalletAddressSheet).
- **M2 word tips** `wordrequest` (under the first contact-request card) + `wordphonebook` (empty Chats) — C# flag `V1Hints` (cap `wordtips`), `S11HintRules.WordIds` / `isWordId`, HomePage word branch (done only, shown dropped, OFF drops all); JS `word-tip.js` + css, `home.html` (pumpWordTip, MutationObserver re-insert, patchChatRowsAroundTip).
- **M3 group emoji avatar** — `v1-flags.js` (data-p1 = Debug ON; Release default OFF), `avatar.js` groupEmojiOf + renderPlaceholder branch, `avatar.css` `--c-avatar-px` + `.c-avatar__emoji`.
- **M4** the 4 `intro-restore-*` keys translated in 13 `lang/*.txt`; 7 new JS keys drafted in 13 `src/strings/draft/*.json`.
- Dev: `ixian:devflash:v1ixihelp|v1hints:<0|1>`, push `window.setFlagsDevV1("<0|1>,<0|1>")`, dev.html rows.
- Pins: `scripts/pins-v1am/{c-csharp,h-ixihelp,h-wordtips,a-groupemoji,s-restore-keys}.mjs`; CSH `scripts/csh/V1AMTests.cs`; re-based pins: s11/a-cs, s12/a-cs, s16/b-l8, s18/f-moments-dev, csh/S17MomentTests (each re-base must NOT weaken the old assertion).
- Packet `docs/be-review-pack/P31-v1am-moments-and-tips.md`.
Diff: `git -C /home/claude/spixi diff c2dd8034 -- . ':(exclude)Spixi/Resources/Raw/html' ':(exclude)src/demo' ':(exclude)src/strings/*.js'`.

## 2 · Green state
CSH 470/0 (463 + 7) · pins-v1am 19/0 · gates green except the pre-existing id-id `groundBlueGradient:Spixi` · full smoke running (do NOT run it; do NOT run node scripts while it runs — CPU is shared; read only).

## 3 · Must-hold invariants
Flag OFF = today byte for byte (no cap, no verb, no DOM element, no log line other than the [FLAGS] line). #1312: flags + packet; C# touches no risky parts; no new spixi.* storage key; text via textContent; PARAMOUNT isolation (home WebView only; nothing crosses to chat). One moment per session / never with a card — ixihelp obeys it but never takes the session (#1450). A word tip never moves the weekly tip rotation (no `shown`). At most one word tip on screen; never with a glass/update/backup/rating card or a moment sheet. Claims: never money / invest / earn / buy; L146 claim scope in every locale. Group never shows initials (#364).

## 4 · Accepted dials (do not re-open)
M1 title "What is IXI?", coin (pay) art, body + buttons as in the contract · M2 only the two tips, style A quiet card · M3 emoji only (no mosaic), LAST grapheme wins over FIRST · M4 translation scope · "your address"/"canvas" tips, mosaic, haptics, lock alert = V1A-N.

## 5 · Verdict — CLEAN at r3

| Round | Reader | MAJOR | MINOR | NIT | Result |
|---|---|---|---|---|---|
| r1 | A (C# + C# pins + P31) · B (home M1 + M2) · C (avatar + strings) — Opus, disjoint | 0 | 4 + 7 + 6 | 9 + 6 + 9 | all MINOR fixed by four fixers (docs/reviews/v1am-r1-fixes.md); design decision #1450 |
| r2 | fresh | 0 | 4 | 11 | fixed: ixihelp waits for the first wallet flush + after the tab verb; focus never on Accept / Decline; the observer early exit; the gate section + DECISIONS |
| r3 | fresh | 0 | 3 | 7 | recorded with reasons (#1450, #1451, #1452): a Consumed firstixi defers ixihelp to the next document; a > 2 s flush can reorder the two sheets; a focused ✕ keeps focus for one re-render only. Docs claims corrected. |

Deliberate breaks: every new pin / test / fix had one (builders' reports): ~45 breaks, 0 survivors kept (r1 B listed survivors → pinned in r1 fixes; r1 MINOR-7 header break re-pinned). Smoke-timing flakes seen only under parallel load (#1452 ⑤, L153). Final: see the handoff.
