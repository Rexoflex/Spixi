# P51 · DESKTOP: THE CHAT LIST DIVIDER SHOWS A 2 PX ACCENT LINE ON HOVER AND DURING THE DRAG (batch fixb1, item 4)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| NONE–LOW (a native visual element; no input, no data, no WebView) | no | none; +1 int pref (`flagDividerHoverLine`); the log line is shared with P50 | built, switch ON · ⚠ C# UNCOMPILED (Windows arm compiles in CI; the Mac arm in Damir's build) | 5 min |

**Look here first:** `HomePage.xaml:22-26` (the new `BoxView`) and `HomePage.xaml.cs:368-386`, `:961-969`.

**DECISIONS:** #1312 · #1478 · #1603 (4) · the dials set by the main chat (🟡, Damir judges at the walk) · this batch:
#1649.

## What changed and why
- **Why.** Damir, WALK #1610 sitting: nothing shows that the divider between the chat list and the chat can be
  dragged. The divider is a NATIVE grip (`BoxView paneDivider`, 10 px, transparent, above the home WebView); the home
  WebView cannot see the pointer over it. Mechanism: `docs/fixb1-mechanisms.md` § Item 4.
- **The change.** A second `BoxView` `paneDividerLine` (2 px, centred in the grip, input-transparent, declared before
  the grip so it sits under it and above the WebView, before every overlay stage). Windows and Mac only (`#if WINDOWS
  || MACCATALYST`), switch `SpixiFlags.DividerHoverLine` ON: pointer enter / move on the grip → hover; pointer exit →
  no hover; pan Started (or the first Running) → drag; pan Completed / Canceled → no drag AND no hover. Visible =
  switch ON AND the grip visible AND (hover OR drag) (`FixB1Rules.DividerLine`, executed in csh). Colour at the moment it
  shows: the accent of the resolved theme (light `#3050BD` brand-600, dark `#769DFF` brand-400). Single pane hides the
  grip and the line and clears the state. On the Mac the line handlers ride on the existing cursor recognizer (one
  hover recognizer on the grip); its cursor handlers are unchanged. Windows gets one new `PointerGestureRecognizer`.
- **Switch.** Int pref `flagDividerHoverLine` (`SpixiFlags.cs:34`, `:113`, `:162`, `:200`), absent = ON, a stored 0
  turns it off only in dev mode. OFF = no recognizer, no handler; the line never shows. No Developer-screen control
  (#1651). The hidden XAML element exists on every platform and with the switch OFF (one input-transparent, hidden
  view in `mainGrid`; no code addresses the grid's children by position) — "OFF = the old behaviour" is meant in
  behaviour, not in the view tree (#46 r1 B-6).

## Files
`Spixi/Pages/Home/HomePage.xaml` · `Spixi/Pages/Home/HomePage.xaml.cs` · `Spixi/Utils/FixB1Rules.cs` ·
`Spixi/Utils/SpixiFlags.cs` · csh `FixB1Tests` (`divider_line_*`) · pin `scripts/pins-fixb1/d-divider.mjs`.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The line takes input from the grip (the drag stops working) | `InputTransparent`, declared under the grip | pin `d-divider` (`xamlLine`, `order`) · walk W-3 |
| The line shows over a takeover / lock | It is declared before the grip, and every overlay stage is added after both | pin `d-divider` (`order`) |
| The line stays after the drag | `dragEnd` clears hover too; the single-pane site hides it | csh `divider_line_drag_end_clears_the_hover` · pin (`panEnd`, `hideSite`) |
| Phones change | The code is under `#if WINDOWS || MACCATALYST`; the grip is never visible on a phone | pin (`desktopOnly`) |
