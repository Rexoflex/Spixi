# Review brief + verdict — session 7b (walk #1211 fixes, #1214–#1226)

## 1 · What landed
Shell: composer.js/.css (strip B, tile, a11y), message-menu.js (swipe paint/settle, dblclick on text only), message-bubble.js/.css
(quote tiles + sender, W1, H2), media-bubble.js (#1201 revert) + .css (grey picture ground), scroll-latest.css (z-index), chat.html
(replySourceFor contract, reply hold, Back arm, badge rule, #1201 revert). C#: DevLogTail, [P1] lines, ChatHeal + CoreMessageWriter
(writeArrivalsNow, healLast, clearDeletedLast), ReplyQuote bridge markers / U+2060, audio focus Busy, VoiceFolderSweep. Pins
scripts/pins-s7b/*, csh S7bRulesTests.

## 2 · Auditor scopes (r1)
A C# (compile, threading, heal, markers bridge-only, sweep, focus) · B shells + security + motion/a11y · C tests (37 mutations).

## 5 · Verdict
| Round | Reader | MAJOR | MINOR | NIT |
|---|---|---|---|---|
| r1 | A C# | 0 | 2 | 7 |
| r1 | B shells | 2 | 4 | 3 |
| r1 | C tests | 11 survivors (1 equivalent) → all pinned | | |
| merge smoke | GATE 32/42 | the quote tile `.src` not from `safeImageSrc` → fixed | | |
| r2 | fresh | 0 | 3 | 6 |
| r3 | fresh | 0 | 3 | 5 |
| r4 | fresh | **0** | 0 | 3 — **CLEAN** |

MAJORs: B-M1 iOS — the held reply row was measured against the box, not the lifted composer → hidden behind the keyboard; fix:
the composer slot's rect (pinned with a lift stub). B-M2 the grey ground switched off at `loaded` while the picture still faded →
grey→white→picture; fix: one layer with an opacity transition, owned by `data-quiet` (L88).
Recorded, not fixed: see DECISIONS #1226. Lessons L86–L88. Final: smoke BASELINE OK 5364 · CSH 208.
