# P69 · PO-0 + W: THREE DEVELOPER-ONLY OPEN LINES, ONE [FLAGS] LINE, AND THE ADB WALK STEPS `open-seed` / `mem-photos` (batch photo1a)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (log lines: fixed words + integers; dev builds only; scripts that run on Damir's PC) | no | none | none (dev lines); the walk is opt-in | 3 min |

**Look here first:** `PhotoOpenRules.onloadMainBody` / `readBody` / `mediaBody` / `flagsLine`; SCP `onLoad` (the `onload-main` clock), `loadMessages` (the `read` clock), `scheduleMediaLine`; `scripts/device/adb-walk.ps1` (`-SeedIndex`, `Invoke-OpenSeedStep`), `adb-walk-parse.ps1`.

**DECISIONS:** #1127 (the `[P1]` grammar) · #1520–#1522 (the walk and its safety rules) · this batch #1719, #1720.

- Lines (through `P1Perf.line`, a no-op without `SPIXI_DEV_COEXIST`): `[P1] chat onload-main ms=<n>` · `[P1] chat read rows=<r> passes=<p> ms=<n>` · `[P1] chat media thumbs=<a> hit=<b> pre=<c> voice=<d> vpre=<e> held=<f> q=<g>` (once per document, 2 s after the present). All builds: `[FLAGS] photo1a mediaafterpaint=<0|1> fewerchecks=<0|1>`; `chat media release failed (<Type>)`; `Exception occured in sendUiCommand (<Type>)`.
- Walk: `open-seed` opens the chat of a dev-seed INDEX by the existing `fa` intent (the address derived by the script, masked `<seed-index k>`, never read from a file or typed); per index a PROVEN restart, a cold rep, an unrecorded warm-up whenever the app pid or the index differs from the last successful open, the warm reps; one new adb command = a count poll `grep -c -e P1..chat.media` (plus one existing-shape `pidof` read per warm rep); the phone filter is unchanged; no typed input, no new verb. `mem-photos` = the app + renderer PSS after the photo steps.

## NOT proven
Nothing ran on the phone or on Windows PowerShell 5.1 (pwsh 7.4.6 dry runs with a fake adb only).
