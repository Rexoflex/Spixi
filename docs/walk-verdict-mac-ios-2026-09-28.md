# Walk verdict — Mac + iPhone after the card reskin (2026-09-28, office)

Walked by Damir on the Mac (net10.0-maccatalyst Debug) and iPhone 15 (ios-arm64 Debug) at `e21fbcaa`.
**34 P · 6 F · 3 N/A** of 43.

## Fails

| # | Row | Damir's note | First read (not yet verified, #294) |
|---|---|---|---|
| R.6 | Mac title-bar hairline (M6) | Not on the Mac | The line sits at `--safe-top`; if WKWebView reports 0, it hides under the native title bar. The `[M6]` log line decides it. |
| R.8 | Mac paste of a Spixi-copied address | Paste from other apps works; paste of a Spixi copy does not | Same cause as R.9. |
| R.9 | Spixi's own Copy (4 surfaces) | Does not work (Mac + iPhone) | The #994 `clipboard.js` path does not reach the system pasteboard from a `file://` WKWebView. Candidate fix = a native copy verb (C# `Clipboard.SetTextAsync`) → security gate first. |
| R.10 | Long-press Copy while typing | The keyboard closes when the menu opens | Design call. |
| P.11 | Account header Copy | Copies on iPhone, but no check icon, no toast | Same family as R.9. |
| P.13 | Live tick crossfade (#1010) | The icon swaps, no fade | Check `setMessageStatus`. |

## Notes on passing rows

- P.8 light: Contours almost invisible.
- P.18 dark: bottom sheets still one level too light.
- P.22: a SENT file needs a delivered double check.

## N/A

- R.4 (Windows only) · R.7 (log owed) · R.12 (obsolete after the reskin).

## Crash during the walk

- Mac call crash = missing mic/camera usage keys (#1026). Confirmed by the crash report; works after a clean rebuild. The missing outgoing call bubble is re-checked on the next walk.
