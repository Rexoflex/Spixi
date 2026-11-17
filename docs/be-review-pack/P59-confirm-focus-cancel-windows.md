# P59 · WINDOWS: THE SAFE-DEFAULT CONFIRM PUTS THE KEYBOARD FOCUS ON CANCEL AT OPEN; ITS TEXT SCROLLS (batch fixb2, item 3)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (a focus step inside P50's native dialog; it can only move the focus to Cancel; the answer rule is unchanged) | no | none: no verb, push, cap, `spixi.*` key, pref or log line | built inside P50's switch `ConfirmSafeDefault` (no switch of its own) · ⚠ C# UNCOMPILED (Windows arm; CI compiles Windows) | 10 min |

**Look here first:** `SConfirm.showSafeDefaultConfirm` (the `Opened` line and the `ScrollViewer` content),
`SConfirm.winFocusCancel`, `SConfirm.winFindButton` (`Spixi/Utils/SConfirm.cs`, the second `#if WINDOWS` block) and
the item-3 span of `Spixi/Utils/FixB2Rules.cs`.

**DECISIONS:** #1312 · #1478 · #1645 (P50) · WALK #1631 (W-1 note) · this batch: #1695, #1696.

## What changed and why
- **Why.** WALK #1631 W-1 (Damir, Windows): the P50 dialog opened with NO focus ring and NO accent on any button,
  and Enter did nothing (Esc cancelled; Tab to OK + Enter confirmed). Safe, but not the built behaviour. Mechanism:
  `docs/fixb2-mechanisms.md` § Item 3 — WinUI gives the default button only PROGRAMMATIC focus at open, which after a
  mouse click is drawn as pointer focus (no ring); and the keys may still go to the WebView2 (the WinUI source names
  the nested-content focus gap). The style lookup (merged dictionaries) and the 600 ms rule are NOT the cause.
- **The change.** On the dialog's `Opened` event and once more at Low dispatcher priority (the built-in initial focus
  runs on `LayoutRoot.Loaded`, in no fixed order with `Opened`), `winFocusCancel` finds the template button that
  `FixB2Rules.focusPart(DefaultButton)` names (only a Close default → `"CloseButton"`), checks
  `FixB2Rules.mayTakeFocus` (it is the Close part AND shows the Cancel text AND not the OK text), calls
  `Focus(FocusState.Keyboard)` (the documented way XAML takes the Win32 focus back to its island) and, when Close holds
  the keyboard focus, goes to the `CloseAsDefaultButton` state (`FixB2Rules.accentState`). One try, an empty catch: a
  missing button or a throw leaves the dialog as P50 opened it.
- **Q-1 (found while building item 4).** The template's content viewer has its vertical bar `Disabled`, so a long
  text was CLIPPED with no scroll (MAUI's own alert scrolls). The text now sits in a `ScrollViewer` (vertical Auto,
  horizontal Disabled, `IsTabStop = false`, `AllowFocusOnInteraction = false`): it scrolls by wheel / touch / bar and
  can never take the focus or the Enter key.
- **Unchanged.** `DefaultButton = Close`; only `ContentDialogResult.Primary` is OK (`FixB1Rules.confirmIsOk`); the
  gate, the lock checks, the 600 ms rule and the `[CONFIRM]` lines of `askAsync`; every non-Windows line (pin SAME).
- **No switch of its own (lead decision, #1696).** The prompt allows exactly two new switches (item 4). The focus step
  is part of P50's arm: `ConfirmSafeDefault` OFF = the MAUI call, as before. Cost (reader S, r1 NIT-2): the fixb1 dialog
  without the focus step is no longer reachable; the fallback is the switch OFF.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The focus or the accent lands on OK | only the part `CloseButton` with the Cancel text and not the OK text; the accent only for a Close default holding the keyboard focus | csh `FixB2ConfirmTests` (4) · pin `a-confirm-focus` (TARGET, RULES, DEFAULT) |
| The step breaks the dialog | one try / empty catch; no completion of the task, no timer, no log line | pin `a-confirm-focus` (FAILSAFE) |
| A long text hides a line | the text scrolls; the viewer cannot take focus | pin `a-confirm-focus` (SCROLL) · walk |
| The keys still go to the WebView2 | not provable in the cloud; then Enter does nothing (safe) | walk row W-1 (what each key does; a `busy` line = the keys went to the page) |

## Files
`Spixi/Utils/SConfirm.cs` · `Spixi/Utils/FixB2Rules.cs` (new, pure) · csh `scripts/csh/FixB2ConfirmTests.cs` · pin
`scripts/pins-fixb2/a-confirm-focus.mjs` · re-based `scripts/pins-fixb1/a-confirm.mjs` (FILE hash, BODY, DIALOG,
the member list).
