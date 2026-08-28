# ⏱ [LANDTAB] — the L14 measurement, Android, 2026-08-29

Damir's device run, nine tab hand-offs out of Account, `adb logcat | Select-String "LANDTAB"`.

**Verdict: the traced mechanism is FALSIFIED. Do not build the fix that was costed for it.**

## Raw

| # | consumer | age |
|---|---|---|
| 1 | `focus` | 39 ms |
| 2 | `focus` | 12 ms |
| 3 | `storage` | 8 ms |
| 4 | `storage` | 11 ms |
| 5 | `storage` | 3 ms |
| 6 | `focus` | 16 ms |
| 7 | `focus` | 13 ms |
| 8 | `storage` | 3 ms |
| 9 | `focus` | 12 ms |

`storage` 4 · `focus` 5 · **`settingsclosed` 0** · `visibility` 0. Ages 3–39 ms.

## 1 · ★★ What this kills

The row's mechanism — recorded in `launch-worklist-2026-08-29.md`, in
`handoff-2026-09-01.md`, and confirmed at source in `SpixiContentPage.cs` (the park branch
sets `op.stage.Opacity = 0` at `:1603`; `host?.onOverlayClosed(...)` runs after it at
`:1729`) — was: **C# reveals the home WebView on the tab it left, and the shell cannot
switch until the `onSettingsClosed` push arrives, so a frame of the old tab is unavoidable
from inside the document.**

Every part of that trace is still TRUE about the C# ordering. **The conclusion drawn from it
is not**, and the reason is the half nobody measured: `settings.html` writes
`spixi.landtab` **before** it sends its exit verb, and the cross-WebView `storage` event
**does** cross WebViews on Android. The shell therefore learns the target tab **3–39 ms
after the write, and before C# has finished closing the overlay** — `settingsclosed` never
wins, and in this run never fired at all as the consumer.

★ **So the tab is already swapped when the stage is hidden.** A document-ordering fix has
nothing left to fix, and the C# ack round trip that was costed for it would have put a new
state machine into the exact lambda the #46 loop has already repaired twice — for nothing.

⚠ **This is what #294 is for, and it is the second time in two sessions that the
instrument, not the reasoning, was the thing that decided.** The trace was correct and the
inference from it was wrong; only the measurement could tell them apart.

## 2 · What is NOT killed

Damir still sees the flicker. The measurement moves it, it does not explain it away:

* The **document** has switched to Wallet before the reveal.
* So whatever paints the old tab is at or after **the paint**, not in the swap ordering.
  The leading candidate is a **stale composited frame** — the home WebView's surface still
  holds the Chats/Apps pixels when the stage is hidden, and the newer Wallet frame has not
  been composited yet.

⚠ **THAT IS A CANDIDATE, NOT A FINDING.** It has the same shape as the theory this document
just killed, and it gets the same treatment: measure before assuming. **The next instrument
has to observe the PAINT, not the swap** — the swap is now known to be early, and any probe
that reports it will keep saying so whatever the screen looks like.

★★ **AND A CONVERGENCE WORTH TAKING SERIOUSLY.** "Only on wallet" fits a paint-cost
explanation: the wallet tab is the most expensive first paint in the shell, and Damir has
separately reported **the wallet tx rows shimmering on entry** (`renderWalletTxList` has no
avatar cache; the chats list got `avatarCacheFor` for exactly this). **Two of his reports
may be one mechanism wearing two faces.** The rule after two rounds of the same class is to
question the design, not to patch each face — so the wallet's first-paint cost should be
measured ONCE, for both rows, before either is built.

## 3 · The probe

⚠ **It has now done its job and should be REMOVED AS A TRIO** — the C# handler
(`HomePage.xaml.cs`, `ixian:landtabprobe:`), the shell emit (`home.html`,
`consumeLandTab`), and the smoke pin that holds the three together — in one batch, the way
[CDPERF] went (#663). **This document is the record of both the numbers and the verdict**,
so nothing is lost by deleting it.

⚠ Its removal reverts `consumeLandTab(via)` to `consumeLandTab()`, and **two existing pins
name the argument** (`#314 landtab` and `★★ L6 …now ASKS`). They go back with it.

## 4 · The free falsifier, still unspent

Damir has not yet walked the same order on **desktop**, where Account is a PANE (#245) and
never parks a tab. It costs nothing and it constrains whatever theory replaces this one.
