# [CDPERF] CAPTURE — Session N instruments, Motorola, Release + SpixiDevCoexist (2026-09-05 15:38)

Three chat opens, 5 messages each, warm app. Raw lines from `adb logcat -d | Select-String CDPERF`.
Every number below is a stamp, not an estimate. This capture is the BEFORE-measurement for the
pre-warm (docs/prewarm-chat-spec.md) and it retires two levers (DECISIONS #796).

## The per-file split (`[CDPERF] chat-shell parse`, ms)

| open | pre | tokens | base | styles | pattern | body | icons | strings | bundle | inline | Σ files | dcl |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 37 | 13 | 2 | 9 | 2 | 2 | 1 | 4 | 19 | 22 | 74 | 109 |
| 2 | 36 | 7 | 2 | 8 | 2 | 3 | 1 | 5 | 17 | 21 | 66 | 102 |
| 3 | 39 | 4 | 1 | 8 | 5 | 2 | 1 | 5 | 18 | 22 | 66 | 105 |

`pre` = navigationStart → the first stamp (the navigation commit + the document's own fetch;
nothing of ours has loaded yet). `inline` = the shell's own 353 KB script, compile + run.
Sum of pre + files ≈ dcl on all three opens — the stamps account for the whole parse.

## The round trip (`[CDPERF] chat-shell rtt`, 5 serial pings)

| open | med | min | max |
|---|---|---|---|
| 1 | 3 | 3 | 5 |
| 2 | 4 | 3 | 7 |
| 3 | 4 | 3 | 6 |

## The whole open (C# clock from the tap, ms)

| open | onload | drain | painted | present | create (onload − nav) | parse (nav) | drain → painted | painted → present |
|---|---|---|---|---|---|---|---|---|
| 1 | 188 | 228 | 324 | 329 | 79 | 109 | 96 | 5 |
| 2 | 174 | 177 | 286 | 291 | 72 | 102 | 109 | 5 |
| 3 | 180 | 183 | 309 | 315 | 74 | 106 | 126 | 6 |

Frames after present: `n=52–54 drop=0 max=11–22 ms` on all three. Shell-side: `burst=2–55 ms
paint=7–10 ms glass=26–38 ms` — i.e. from the moment onChatScreenLoaded RUNS in the shell the
history is on glass in ≤38 ms. The C# `drain → painted` of 96–126 ms is therefore mostly the gap
between C# DISPATCHING the last eval and the renderer EXECUTING it: ~12 serial
EvaluateJavaScript calls (setChatMode · setNickname · onChatScreenReady · setAvatar · addThem×5 ·
setSelfNick · onChatScreenLoaded) queue ~60–90 ms on the Android WebView before the shell's
own 26–38 ms of work even starts. Row count is NOT the driver (n=5, bg=2–29 ms).

## What it decides

| lever | fact | verdict |
|---|---|---|
| direct bridge channel (#781) | rtt med 3–4 ms | **DROPPED FOREVER** (the rule was ≤ ~3 → drop) |
| one locale per shell (L2, ~400 KB) | strings = 4–5 ms for all 13 locales | **DROPPED** — the whole file costs 5 ms |
| per-shell bundle (L3) + JS comment strip (L1) | bundle = 17–19 ms in total | ≤ ~12 ms available, against the #421 spinner class — **not now** |
| tokens.css strip (#792) | tokens = 4–13 ms (this IS a Release build — the strip was live) | kept: free, gated, already shipping |
| SVGO doodle (#793) | pattern = 2–5 ms | speed is not the argument; his eye only |
| **the pre-warm (#780/#794)** | create 72–79 + parse 102–109 = **~180 ms** of a ~315 ms open | **THE lever. Build next.** |
| **batch transport (#298, `addMessages` + `messagesDone`)** | drain → painted 96–126 ms, ~26–38 of it the shell's; the rest is the eval queue | **the second lever, C#-side, small** — one eval carrying the burst instead of ~12 |

Expected after both: create + parse off the critical path (−180) and the eval queue collapsed
(−50 to −70) → an open in the ~70–90 ms band, from a median of ~315. Everything else on the
work order is single digits.
