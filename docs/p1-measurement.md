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
| 1 | A1 hold: resolve the native view as `(pv as SpixiWebviewRenderer2)?.Control` in ONE helper (skip `ClassId=="miniapp"`, AND-19 / #334) | 1 (flicker) | 0 ms; removes the plain/grey frames (G-1) | high (all 42 opens `pv=spixiwebviewrenderer2`) | low; chat input waits ≤ 250 ms (`HoldCapMs`) | `SpixiContentPage.cs:311`, `:4055`; `WebViewRenderer.cs:287`, `:441`, `:492` | recording, `why=vsc` |
| 2 | Wallet: `txPushedToShell` latch → `loadTransactions(!txPushedToShell)`, reset with `appsPushedToShell`; dirty flag on a fiat-price update | 4 | 67 ms C# + 2 drops per re-visit | high | low (fiat / nick stale without the dirty flag; filter keeps forcing `:3688`) | `HomePage.xaml.cs:1266`, `:1274`, `:2339`, `:5054`, `:5075`; `Node.cs:1009` | no (`force=0` in the line) |
| 2b | Wallet shell keeps old rows until `clearPaymentActivityDone` | 4 (flicker) | visual | high | low (`walletZero` timer = net) | `home.html:3945`, `:4015` | no |
| 3 | Desktop re-warm: a new spare after a chat presents on a wide window (relax the `chat` refusal for wide) | 2 | 221 → ~90 (#803 (7): 87) | med-high | +1 resident WebView2 (memory); §1 kept (own WebView, used once) | `SpixiContentPage.cs:1619`; `HomePage.xaml.cs:3491`, `:4566` | yes (memory + frames) |
| 4 | Defer the chat's `loadApps()` until the hold ends / the drawer opens | 1 (gap after present) | ≤ 88 (the gap) | HYPOTHESIS — the gap is on the SPARE path only (spare: 2 drops, gap 89 / 122; cold: 0 drops, gap 22) → one-tag probe of what runs after a spare present | low (timing only) | `SingleChatPage.xaml.cs:1555` → `:2573` | yes |
| 5 | A tap claims a WARMING spare (today refused `why=warming`; the spare warms 350 ms after a close) | 1 (slow mode) | slow mode 239 / 323 → ~130 | **CONFIRMED** (log: 42 spare opens 86 / 122 · 9 `why=warming` 239 / 323 · 3 `why=none` 282 = the bimodality) | medium (2nd claim path, mirror `claimWarmingOverlay`) | `SpixiContentPage.cs:1806`, `:3049`; `HomePage.xaml.cs:3557` | yes |
| 6 | Chat log load-more: send only the OLDER page (50), not the whole window again (150 → 200 → 250, 29–51 KB) | 9 (chat scroll) | long tasks 53–100 ms (grow with n) → ~25 | **CONFIRMED** (all 8 `longtask` lines follow a `loadmore` batch n=150–250) — the chats-list rebuild hypothesis is NOT supported | medium (the shell prepend contract; the #354 / D-18 guard) | `SingleChatPage.xaml.cs:983`, `:2855`; `lazy-history.js` | yes |
| 7 | Info pane: slide over, widen the column once at slide end (no 1-frame snap mid-motion) | 6 (Win) | moves the ~105 ms frame out of the motion | med | not the "gentle push" — render options | `HomePage.xaml.cs:4674` | render |
| 8 | Spares for ContactDetails / AppDetails (own WebView each, used once) | 6, 7 | info 87 → ~30 · app details 124 → ~45 | med | ~+15 MB each; ~150 lines | `HomePage.xaml.cs:1773`, `:5349`; `SingleChatPage.xaml.cs:1032`, `:2012` | yes |
| 9 | Call bar: lay out from the top, `fits()` passes at once in bar mode | 10 | 212 → ~45 | med-low | one frame before the resize | `call.html:~475`, `:513` | yes |
| 10 | Account → tab: `exitSettings('handoff')` for tabs; home answers `coverpainted` for tabs too | 5 (visual) | visual | high | low (dirty-save path same gap `:696`) | `settings.html:2381`; `home.html:1531` | no |
| 11 | Android: shorten the 100 ms post-hide wait on close (it exists for a WinUI flash, #229b) | 2 | INTERNAL 161 → ~100 | high | low on Android | `SpixiContentPage.cs:2484` | no |
| 12 | Motion durations dial: 300/220 → 220/160 (subscreen, C# slide) | 6, 8 | felt −80 / −60 | high | taste — render | `subscreen-slide.css:30–31`; `SpixiContentPage.cs:3955`, `:2463` | render |

Log read (session 4, `android-full.txt`, 54 opens): see levers 4 · 5 · 6. Notes: lead 6 is out of date — `backdrop-filter` is in 2 rules (chat log only: `message-bubble.css:601`, `typed-bubbles.css:437`), none in the chats list. Chat close felt ≈ the opacity flip; `done=` includes the 100 ms wait. Chat info close 330 = 220 slide + 100 wait + ~10.

## Experiment log (§8 — one lever per try; Damir runs every device run)
| try | lever | patch | median | p90 | keep/discard/crash | note |
|---|---|---|---|---|---|---|
| 1 | lever 3 desktop re-warm | #1135 | Win open 71 | 151 | keep | session 3: 221 / 261; 0 drops (#1146) |
| 2 | lever 2 + 2b wallet | #1135 | — | — | keep | 3 forced pushes in the whole Windows walk; Android 1; no flicker |
| 3 | lever 10 Account hand-off | #1135 | — | — | keep | released by cover 16×, backstop 0 |
| 4 | lever 1 A1 hold | #1135 | held 117 | 135 | keep | why=vsc 25/25, 3 / 4 frames; recordings P |
| 5 | lever 5 warming claim | #1135 | spare 104 | 196 | keep | claims seen; 12/37 opens `why=none` 225 / 247 → try 7 |
| 6 | lever 11 Android close wait 16 ms | #1135 | close 159 | 435 | keep (no gain) | the time is elsewhere → close probe (#1147 (6)) |
| 7 | spare warm after close 350 → 0 ms | #1147 (4) | open 87.5 | 145 | keep | 34/34 opens from a spare, why=none 0 (was 12/37); chats-after-close 2 drops / 44 ms gap (#1151) |
| 8 | close probe (posted / removed) | #1147 (6) | close 121 | 296 | — | posted ≈ done → the time is the posted wait + the hide, not the removal → session 5 lever |
