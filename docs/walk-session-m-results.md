# WALK M — RESULTS (Damir, 2026-09-05)

**Sheet: 24 rows, 24 P · 0 F · 0 not run.** Release SpixiDevCoexist build on the Motorola,
`com.ixilabs.spixi.dev`. One log (`walkm.log`, captured with `Out-File -Encoding utf8` — the
UTF-16 trap of walk L did not recur).

★★ **THE SHEET AND THE LOG AGREE.** Walk L's lesson was that an unscored row is not a passed
row and that the log is true of what happened while the sheet is true of what was tested. This
time every row was scored and the log contains no failure the sheet missed. That is worth
recording as an outcome, not assumed as the normal case.

## The three rows the batch turned on

| Row | Result |
|---|---|
| **A4** | Coming back from None restores the **level as well as the style** — the one regression the restructure could have shipped. **P** |
| **B3** | Layout survives a real process kill (`am force-stop`) and reopen. **P** |
| **C6** | Cold start: chat-info · App details · tx detail · Account · Downloads all appear **filled**. Nothing appeared empty and then filled. **P** |

A1–A12 (the three-card screen, the None tile, the Colour row, dark = two cards, the live OS
flip, the quieter doodles tile) and B1–B5 all pass. C1–C7 pass.

## The chat-open numbers, third capture (#764's third confirmation)

Eight opens. `t=` is C#'s `openClock` from the `SingleChatPage` ctor; `nav`/`dcl`/`burst`/
`paint`/`glass` are the shell's own clock, so the two are compared as spans and never
subtracted across.

| open | msgs | create | parse | push+drain | render→painted | painted→present | total |
|---|---|---|---|---|---|---|---|
| 11:01:17 | 17 | 66 | 91 | 9 | 77 | 4 | **247** |
| 11:02:36 | 50 | 99 | 102 | 48 | 164 | 7 | **420** |
| 11:04:06 | 50 | 74 | 87 | 65 | 124 | 7 | **357** |
| 11:04:12 | 3 | 79 | 97 | 36 | 37 | 7 | **256** |
| 11:04:22 | 0 | 81 | 100 | 4 | 79 | 28 | **292** |
| 11:05:01 | 17 | 90 | 100 | 4 | 156 | 3 | **353** |
| 11:05:02 | 17 | 51 | 102 | 6 | 96 | 3 | **258** |
| 11:05:03 | 5 | 75 | 98 | 63 | 50 | 5 | **291** |

**Median total 292 ms, range 247–420.** The two 50-message opens are the slow pair; the cost
that scales is `render → painted`, not the parse.

★★ **`nav == dcl` on ALL EIGHT opens** (91/91 · 103/102 · 88/87 · 97/97 · 100/100 · 100/100 ·
102/102 · 98/98). That is the third capture in a row to say it, and it says the same thing:
**the in-document time is entirely PARSE.** Median **99 ms**, range 87–102.

★★ **ZERO `backstop t=` lines.** Every one of the eight presented on the shell's own
`ixian:painted`, never on the 400 ms backstop. No #663 to chase, again.

★ **`painted → present` is 3–7 ms on seven of eight** (one 28 ms outlier on the empty chat).
Walk L's split reported ~30 ms for this span. ⚠ **Do not read that as an improvement from this
batch.** The chat asks for `revealDelayMs: 0`, so #785's race never runs on this path — all
Session M did to the chat was move where the verb is received. Walk L's 30 ms was a derived
figure in a five-part split, not a stamped span; this is the first time it has been measured
directly. Treat 3–7 ms as the first real measurement, not as a delta.

★ Likewise the parse: 87–102 ms here against walk L's 117–144. Nothing in Session M made the
document smaller — the bundle **grew** by 9.4 KB. Build, device state or the WebView build
(151.0.7922.199) explain it, and it is recorded as unexplained rather than claimed.

## What the numbers say for the perf round

The split on the current build, median of eight:

```
77 ms  WebView creation
99 ms  document parse       ← the lean-build target (docs/perf-chat-open-brief.md)
~20 ms push + drain          (4–65, scales with message count)
~88 ms render → painted      (37–164, scales with message count)
 6 ms  painted → present
```

This is the same shape #764 found, measured again on a newer build, and it puts the parse at
**a third of a median open**. It is the number the lean build is aiming at, and it is now
current rather than four days old.

## The new `[CDPERF] chats` stamp — works, and needs a bigger list

```
[CDPERF] chats flush rows=5 reqs=0 dispatch=1ms    ·  4ms
[CDPERF] chats flush rows=5 reqs=0 dispatch=23ms   ·  19ms   (first flush after a cold process)
[CDPERF] chats flush rows=5 reqs=0 dispatch=3ms    ·  2ms  ·  3ms
```

★ **The bound behaves exactly as designed**: four lines in the long-lived process, two in each
of the two short-lived ones, then silence — so a 1 Hz `updateScreen` cannot bury its own
evidence.

⚠ **But `rows=5`.** The row this stamp was added for (queue A1) is about **~60 `addChat` evals**,
and this account has five chats. **The measurement is not yet the one that was wanted** — it
needs a seeded list (`ixian:devseed:heavy`) to say anything about the flush at realistic size.
At five rows the dispatch is 1–4 ms warm, 19–23 ms on a cold process, i.e. not a bottleneck.

## ⚠ THE ONE GAP, AND IT IS THIS BATCH'S OWN HEADLINE

**The five DATA pages carry no stamp.** C1–C7 pass on Damir's eye, and that is real evidence
that nothing presents empty — the failure mode this change could have introduced. But **nothing
in the log says whether chat-info, App details, tx detail, Settings or Downloads presented on
their own `ixian:painted` or waited out the 120 ms timer.** #785's whole claim is that the timer
became a backstop, and on device that claim is currently **untested**.

The chat has `[CDPERF] chat painted/present` because `SingleChatPage` was instrumented for
#764. The shared path added in #785 was not. **Fix: one temporary stamp inside
`presentPreload`** — `[CDPERF] present <page> by=paint|timer t=…ms` — which settles it for all
five pages in a single capture, costs nothing, and retires with the `[CDPERF]` set (handoff ⑬).
**Not built: the batch is committed and walked, and adding an unwalked change to it now would
be the wrong trade.** It is the first thing to do next time the phone is out.

## `[SCROLL]` — unchanged, and still fine

`frames=17–50 · drop=0–2 · max=11–58 ms`. The pattern matches walk L: the **first** burst after
a page-in drops a frame or two, every burst after it is clean (`drop=0 max=11–15 ms`). No fix
needed, same verdict as #776.

## Not exercised

`[KBTRAY]` produced one line — `resize ih=936 d=0 t=84`, the boot resize, not a keyboard event.
The keyboard/tray rows were not on this sheet, so **#770's third trigger (#786) remains
unmeasured and unfixed by design**, on Damir's ruling.
