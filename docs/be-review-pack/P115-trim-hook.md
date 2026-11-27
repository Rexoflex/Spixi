# P115 · THE HIDDEN WEBVIEWS ARE FREED ON THE TRIM LEVELS ANDROID 14+ STILL SENDS (batch imgurl, item 2, P-14)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (frees two hidden WebViews that hold no chat; drops cost only speed) | none | none | `ImgurlFlags.TrimHook` (`flagTrimHook`, absent = ON; a stored 0 acts only in dev mode); OFF = no drop (the base) | 4 min |

**Look here first:** `Spixi/Platforms/Android/MainApplication.cs` `OnTrimMemory`: `base.OnTrimMemory(level)` first (MAUI's
lifecycle lambda in `MauiProgram.cs` — RUNNING_LOW / RUNNING_CRITICAL → `Node.onLowMemory` — runs as before, unchanged), then
the switch, then `SpixiContentPage.lifeTrim` (`Spixi/Utils/SpixiContentPage.Life.cs`), which asks `TrimRules.drops`
(`Spixi/Utils/TrimRules.cs`, pure, run by csh `LifeTests`) and calls the two existing drops: `dropSpareChat("trim")` and
`disposeParkedOverlay()`.

**Why:** Android 14+ no longer delivers `TRIM_MEMORY_RUNNING_LOW` / `RUNNING_CRITICAL` to apps, so the lambda never fires
there. `UI_HIDDEN` (20), `BACKGROUND` (40) and `onLowMemory` still do; older Android also sends `MODERATE` (60) / `COMPLETE` (80)
to a background app. **DECISIONS:** #1738 (3) (P-14 in this batch) · #800 / #802 (the spare's drop list) · #1536 (the spare
kept over a short sleep) · this batch (rows by the lead).

## The levels
| Level | Drops | Why |
|---|---|---|
| < 40 (UI_HIDDEN at every app switch; RUNNING_*) | nothing | `App.OnSleep` already drops the spare at the switch, and keeps a READY one over a short sleep with `SpareKeepShortSleep` (#1536) — a drop here would undo that; the parked Account is the warm return |
| 40 BACKGROUND | the parked page; the spare unless it is KEPT (`Kept` / `Proving`) | the process is in the LRU list: give back what rebuilds cheaply; the kept spare has its own 3-min limit and resume proof |
| ≥ 60 MODERATE / COMPLETE | both, a kept spare too | the process is near the kill end of the list |

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| A drop at every app switch undoes the short-sleep keep | nothing below 40; a kept spare survives 40 | csh `trim_below_background_drops_nothing`, `trim_background_keeps_a_kept_spare` |
| The new levels free chat data (`Node.onLowMemory` frees message lists) | not called: only the two hidden-view drops | pin `d-life` d2 (no `onLowMemory` in `OnTrimMemory`) |
| The trim drop cancels the spare's re-arm after a sleep | the word `trim` is neither a re-arm nor a cancel word (`SpareRearmRules`): a pending re-arm stays | `SpareRearmRules` read; csh `trim_line_and_word` (the word) |
| MAUI's own trim lambda stops | `base.OnTrimMemory(level)` is the first statement | pin `d-life` d1 |

Log (dev build only, `#if SPIXI_DEV_COEXIST`): `[TRIM] level=<n> spare=0|1 parked=0|1` (what was really dropped). (The
renderer-crash test door of the renderer-death item left with it, #1972.) No pooled WebView exists in the tree (the chat-info pool P-35 is not built), so the
spare and the parked Account are the only hidden WebViews. Thread: the main thread (ComponentCallbacks2). ⚠ C# UNCOMPILED:
`MainApplication.cs`, `SpixiContentPage.Life.cs`.
