# P62 · DESKTOP: THE DIVIDER LINE COVERS THE HAIRLINE; THE DOUBLE-CLICK RESET IS 440 AND RE-FITS CHAT INFO (batch fixb2, item 2)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| NONE (a native visual element moves 4 DIP; a layout constant; one re-fit call) | no | none | built inside P51's switch `DividerHoverLine` · ⚠ C# UNCOMPILED (Windows: CI; Mac: Damir's build) | 3 min |

**Look here first:** `Spixi/Pages/Home/HomePage.xaml` (`paneDividerLine` margin) and `HomePage.xaml.cs`
(`leftPaneDefaultWidth`, the double-tap reset).

**DECISIONS:** #1649 (P51) · WALK #1631 (W-3 notes) · this batch: #1700 (🟡 dial).

## What changed and why
- **Line.** Measured (`docs/fixb2-mechanisms.md` § Item 2): the hairline is the home shell's
  `:root[data-desktop] body::after` (1 CSS px at the WebView's trailing edge, `[W−1, W]`; 1 CSS px = 1 DIP at zoom
  100 %). The line sat at `[W−6, W−4]` (`Margin 0,0,4,0`, the middle of the 10 px grip), about 4 px left of it — Damir's
  note. `Margin 0,0,0,0` puts it at `[W−2, W]`: it covers every painted hairline column at scale 1 and 1.5 and shares
  its trailing edge; it stays inside and under the grip (input-transparent). Switch OFF = no line, as before.
- **Reset width (🟡 dial).** `leftPaneDefaultWidth` 400 → 440 (main chat: today + 40 px; Damir judges at the walk). It is
  also the first-run default and the NaN fallback; a stored width is kept; `clampLeftPaneWidth` still caps it.
- **Re-fit (#46 r1 O2 MAJOR-1).** The reset now calls `updateInfoPaneWidth()` after `applyLeftPaneWidth()`, as the pan
  does (#247): with chat info open the conversation keeps ≥ 320 DIP (without it a 440 reset squeezed it below 320 for
  windows narrower than 1120 DIP until the next resize; at 400 it was already so below 1080).
- **Side effect (O2 m-1, for the dial).** At the default / reset width chat info opens BESIDE the conversation from a
  client width of 1040 DIP (was 1000); between 1000 and 1039 it opens over the conversation (#247's degrade).

## Proof
pins `scripts/pins-fixb2/b-divider.mjs` (HAIRLINE, COLUMN, POSITION, KEPT, RESET, OFF), `scripts/pins-fixb2/b-hairline-sweep.mjs`
(Chromium, by hand: 8 legs, W 400 / 440 × scale 1 / 1.5 × light / dark), re-based `scripts/pins-fixb1/d-divider.mjs`
(XAML hash; the margin key `atEdge`; D1_BLOCK). Walk W-6.
