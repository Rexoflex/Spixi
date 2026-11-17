# P53 · ANDROID: THE BUTTONS OF THE SYSTEM DIALOG ARE READABLE IN DARK MODE (batch fixb1, item 2) · resources only

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| NONE (two colour resources and one style) | no | none | built · not built in the cloud (Android resources compile in Damir's build) | 2 min |

**DECISIONS:** AND-14 (#334, the branded alert dialog) · #1541 · #1603 (2) · this batch: #1645.

## What changed and why
- **Why.** WALK #1540, SW-S5-RMH [A]: the buttons of the native confirm were hard to read in dark mode.
  `SpixiAlertDialog` (DayNight parent: the surface follows the OS mode, `#FFFFFF` / `#424242` in AppCompat) had ONE
  `colorAccent` `#3050BD` — 1.44 : 1 on the dark surface.
- **The change.** `colorAccent` and `android:colorAccent` of `SpixiAlertDialog` take `@color/spixiDialogAccent`:
  `#3050BD` (brand-600) in `values/colors.xml`, `#98B5FC` (brand-300) in the NEW `values-night/colors.xml`. Contrast:
  6.98 : 1 by day, 4.95 : 1 at night. The `-night` qualifier and the DayNight surface follow the same OS mode, so they
  always agree (AND-14's residual stays: the dialog follows the OS mode, not an in-app theme that differs).
- **No run-time switch.** A resource is read at install; a revert = the three edits (`values/colors.xml`,
  `values/styles.xml`, delete `values-night/colors.xml`). The precedent: #1467 (an XML resource with no flag).

## Files
`Spixi/Platforms/Android/Resources/values/colors.xml` · `values/styles.xml` · `values-night/colors.xml` (new) · pin
`scripts/pins-fixb1/b-dialog-colors.mjs` (reads the XML, resolves day and night, checks ≥ 4.5 : 1 against AppCompat's
surfaces; 3 breaks killed).
