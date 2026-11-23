# P92 · FOUR DEVELOPER LINES OF THE OLDER-PAGE PATH, ONE `[FLAGS] histcs` LINE AND THREE TYPE-ONLY WARNS (batch histcs, HV-0)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (fixed words + integers) | none | none | built · ⚠ uncompiled | 2 min |

**Look here first:** the `older*Body` builders of `HistoryOlderRules` (`Spixi/Utils/SpixiFlags.cs`, the histcs block).

**DECISIONS:** #1742 · #1127 (the `[P1]` set) · this batch: #1863.

## The lines
| Line | Build | Where |
|---|---|---|
| `[P1] chat loadmore in` | developer (`P1Perf.enabled`) | the first statement of `loadMoreIn` (every path) |
| `[P1] chat older read passes=<n> window=<n> ms=<n> flush=<n>` | developer | after the read of a load that is a prepend at its start (a load-more, a widening jump); `flush` = the P0 guard alone |
| `[P1] chat older push n=<n> json=<n> build=<n>` | developer | before the pushes of such a load, when it is kept (the twin of `[CDPERF] chat batch`) |
| `[P1] chat older drop why=<busy\|closed\|channel\|load\|anchor>` | developer, P-28 ON | at a drop |
| `[FLAGS] histcs loadmoreoffui=<0\|1> firstpage50=<0\|1>` | every build, once per process | at the first load-more (the walk's BUILD row) |
| `loadmore: the older page failed (<ExceptionType>)` | every build | a throw of the background load (type name only) |
| `loadmore: a deferred chat push failed (<ExceptionType>)` | every build | a throw of a main-thread load or jump that waited behind a page's queued pushes, or of the post of it (#46 r3; r4: the post's own catch too; type name only) |
| `loadmore: a late chat push failed (<ExceptionType>)` | every build | a throw of one repeat of a peer's delete / edit that the page sends behind its rows (#46 r4; type name only) |

Every builder takes only `int` / `long` / the `OlderDrop` enum (csh `lines_by_type_only`, by reflection); negative values
are written as 0; every token matches the `[P1]` grammar `^[a-z0-9_.=-]{1,40}$` and `P1Perf.line` drops a line that does
not. No message text, address, nickname or file name can reach a line. The words of the first three lines are the
contract with the walk parser (session `walktools`).

## Proof
csh `HistcsTests.lines_*`, `flags_line_*`; pin `scripts/pins-histcs/b-lines.mjs` (the call sites: sole argument of
`P1Perf.line(`, under `P1Perf.enabled`, int arguments; no other new log call).
