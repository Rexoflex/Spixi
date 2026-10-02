# P-1 measurement — the app's felt speed (DoD P-1, #1127 / #1129)

Filled in session 4 from Damir's walk (`docs/walk-artifact-session3-win-android.html`). 10 runs per path, median + p90.
Source: the `[P1]` lines (dev builds only; Android lines arrive as `[WEBVIEW] warn [P1] …`). Tag each row FELT or INTERNAL
(`docs/audit-refactor-plan.md` rule 3). One environment per column; never compare across builds without an A/B (#803 (2)).

## How to read a line
| Line | Meaning |
|---|---|
| `shell send <verb> dt=` | tap (pointerdown) → the verb left the shell, ms (−1 = no tap in the last 2 s) |
| `open <page> present ms=` | C#: the op was built / re-armed (spare attach, warm claim, tap) → the stage is visible |
| `frames <what> n= drop= max=` | native frames in the 600 ms after the event: count, gaps > 24 ms, longest gap (60 Hz threshold — on 90/120 Hz a single miss is not counted) |
| `shell <what> first=` | tap → the 2nd animation frame after the shell applied the view change (≈ first frame on glass) |
| `shell frames-<what> …` | the shell's own rAF frames in the 600 ms after |
| `shell scroll <shell> ms= n= drop= max=` | one scroll gesture (first → last scroll event) |
| `shell longtask <shell> ms=` | a main-thread task ≥ 50 ms in the WebView |
| `a1 hold …` | which link is null when the G-1 hold starts (A1) |

Reader notes (#46 r1): a probe window that spans app background reports the hidden time as `max=`; `first=` blames any tap ≤ 2 s
old; Windows boot lines can be replayed (`Runtime.enable`) — use the in-line `ms=`, not the log timestamp.

## Table (session 3 walk, #1130 · median / p90 ms · 10+ runs)
`present` = C# stage visible (from the tap's op). `first` = shell, from POINTERDOWN (minus the press: Android ≈ 55–90, Windows ≈ 78–110).
Frames = the 600 ms after the event: dropped (> 24 ms) and the longest gap.

| # | Path | Lead | Android Release (dev) | Windows F5 | iPhone | Mac | FELT/INTERNAL |
|---|---|---|---|---|---|---|---|
| 1 | Chat open (list row) — target < 100 ms, no flicker | P-1, G-1 | present 92 / 245 (bimodal); drops 2 / 3; longest gap 88 / 122; G-1 hold never ran (A1) | present 221 / 261; drops 0 / 1 | owed | owed | FELT |
| 2 | Chat close | — | 161 / 212; longest gap 44 / 88 | 106 / 112 | owed | owed | FELT |
| 3 | Tabs (first, incl. press) | 11 | chats 92 · apps 86 · wallet 81 · account 87; wallet/apps/account 2–3 drops | 97–106 | | | FELT |
| 4 | Wallet re-visit | 11 | txpush rows=50 force=1 EVERY visit, 67 ms C# | same, 9 ms C# | | | FELT (flicker) |
| 5 | Account open / hand-off | 12, 3 | open 3 (warm), close 5 | open 222, close 103 | | | FELT (visual) |
| 6 | Chat info open / close | 1, 10 | 87 / 96 · close 330 (slide) | 153 / 166, one ~105 ms frame at the column snap · close 328 | | | FELT |
| 7 | App details · Add contact | 1 | app details 124 / 161 | 174 · 140 | | | FELT |
| 8 | Sub-screens · sheets | 4 | subscreen open 79 / 100 · sheet ≈ 102 (long-press menu 510 = the 500 ms press) | sheet 105 / 123 | | | INTERNAL |
| 9 | Scroll | 5, 6, 7 | longest gap 16 / 92, up to 12 drops; long tasks 69–108 ms | smooth (≤ 17 / 64) | | | FELT (Android) |
| 10 | Call bar reveal | 3 | 212–223 (#1123, resize) | | | | FELT |
| 11 | Cold start | 8 | deferred | | | | — |

## Ranked levers (session 4: ms gained × certainty ÷ risk; each with its mechanism verified in the tree)
| Rank | Lever | Path(s) | Gain (ms) | Certainty | Risk | Mechanism (file:line) | A/B vs parent? |
|---|---|---|---|---|---|---|---|
