# Office walk #1083 — log captures (Mac, 2026-09-30)

Build: HEAD `97bbf3e8`. Smoke `BASELINE OK — 5013 / the 2 KNOWN` on the Mac (2 below the expected 5015 with
Ixian-Core; the Core sibling exists, because the C# build uses it; compare the next Mac run with 5013).
iPhone 15 (AI15, `F992BFF8-BB7E-5F68-8E25-496307854F6D`) Debug: build succeeded (1661 warnings), install +
launch OK = B.2 P. Mac Catalyst Debug: build succeeded (1644 warnings), boots = B.3 P.
App path: `Spixi/bin/Debug/net10.0-maccatalyst/maccatalyst-arm64/Spixi.app/Contents/MacOS/Spixi`.
**Mac ixian.log = `~/Documents/Spixi/ixian.log`** (verified; the walk sheet marked it unverified).

## Launch-time note (not a walk row)

`You've implemented -[<UIApplicationDelegate> application:performFetchWithCompletionHandler:], but you still
need to add "fetch" to the list of your supported UIBackgroundModes in your Info.plist.` — a macOS warning at
start. The app runs. Record only; check at the freeze whether the Catalyst Info.plist needs `fetch` or the
method must stay out of the Catalyst build.

## [M6] — OV.13 / OV.14 (title-bar hairline)

```
09-30 20:24:46.4094|info|1: [M6] mac safe-area top=0 window=41
09-30 20:24:46.4955|info|1: [M6] mac safe-area top=41 window=41
09-30 20:24:48.5376|info|1: [M6] mac safe-area top=0 window=41
```
Reading (not verified, #294): the window inset is a steady 41. The page-level top alternates 0 → 41 → 0.
The #1028 push takes `max(page, window)`, so the line should sit at 41 in all three cases. Compare with the
OV.13 result on screen: if the line is missing, first check if the push really uses the window value.

## [M5] — R.8 (paste in Add contact)

```
09-30 20:24:45.9021|info|1: [M5] main menu edit=True paste=True
09-30 20:28:05.2413|info|1: [M5] add-contact pasteboard hasStrings=True
09-30 20:28:28.2725|info|1: [M5] add-contact pasteboard hasStrings=True
```
Reading: the Edit menu has Paste, and the pasteboard held text at both paste attempts. R.8 result on screen decides.

## [DIVIDER] — M2 (pane divider)

```
09-30 20:26:22.5400|info|1: [DIVIDER] pan started
09-30 20:26:24.3218|info|1: [DIVIDER] pan ended width=505
09-30 20:28:48.5034|info|1: [DIVIDER] pan started
09-30 20:28:49.2194|info|1: [DIVIDER] pan ended width=399
```
Reading: the grip receives the drag and the pane resizes (505, then 399). M2 = pass on the log.

Walk-sheet notes for OV.13, R.8, M2 may stay empty or N/A; this file is the evidence.
