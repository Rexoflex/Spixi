# F5 checklist — batch #517–#520 (wallet scroll · transaction sounds · press feedback)

**LANGUAGE RULE: ASD-STE100 Simplified Technical English.**
Build first: FULL pipeline is already green in the delivery. Wipe `obj`/`bin` (#387 —
this batch changes 5 C# files). Build `net10.0-windows10.0.19041.0 -c Debug`, run the
exe separately. Android: `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release`,
then `-t:Run` as a SEPARATE command (#320). Check the device is attached first (#450).
⚠ **THE RUNNING APP IS NOT THE BUILD OUTPUT**: force-stop, relaunch, and confirm a
new-build string in the log in the first minute. Probe string for this batch:
`strings -el Spixi.dll | grep "SND play"` (UTF-16, not ASCII).

## 1. ★★ The wallet scroll oscillator (#517) — the headline

Do this on the account with ~5 transactions, animations ON (not reduced motion).

| # | Do this | Expect |
|---|---|---|
| 1.1 | Wallet tab. Drag down slowly ~20 px | The hero minimises SMOOTHLY. No flicker, no snap-back, no jump to the top |
| 1.2 | Keep dragging to the bottom | You reach the last transaction. The screen does not "juggle". No blank band pulls you back |
| 1.3 | HARD FLICK down from the top | No blank space appears under the last row mid-flick; no stall |
| 1.4 | Scroll back to the very top | The hero expands. Balance + Send/Receive/Scan return and respond to taps |
| 1.5 | Repeat 1.1–1.4 five times fast | Never a compact hero stuck with dead Send/Receive/Scan; never an expand/collapse flicker loop |
| 1.6 | Wallet with MANY transactions: collapse, then receive/refresh (any re-render) | NO blank band appears under the last row (the r2 W-MAJOR-2 case) |
| 1.7 | Collapse the hero, type in the wallet search box so ~1 row matches | Within ~half a second the hero expands on its own (the valve) — it must NOT stay compact with nothing to scroll |
| 1.8 | Switch to Chats, back to Wallet | Hero expanded at the top; everything responds |

Dev-mode probe (dev HUD, the `WALLET` line): after a collapse settles,
`range == max(top-at-collapse, maxPre − delta)` and `pad == 0` on a long list.
`range` must NEVER be smaller than `top` in any sample.

## 2. ★ Transaction sounds are GONE (#518 — your reversal of the settle-chime)

| # | Do this | Expect |
|---|---|---|
| 2.1 | Send a payment, wait for confirmation | NO sound at send, NO sound at confirmation |
| 2.2 | Receive a payment (second device) | NO sound from the wallet. (⚠ If the app is backgrounded, the NOTIFICATION channel may still sound — that is the notification lane, not the removed chime) |
| 2.3 | ★ Restore an account on a fresh session (the Android chain walk) | ZERO chimes for the whole walk. This is the acceptance test for the reversal |
| 2.4 | Send/receive a chat MESSAGE with the chat open | The message sounds still play (they stay) |
| 2.5 | Any sound you hear: open the log | Every played sound has a line — `SND play:` / `SND call-tone:` / `SND notif attempt:`. Background push rows log under `[NOTIFDIAG]`. A sound with NO matching line = report it, that is the belt failing |

## 3. ★ Press feedback (#519) — the Galaxy items

| # | Do this | Expect |
|---|---|---|
| 3.1 | Flick-scroll the chats list and the wallet list | Rows do NOT light up while scrolling. No trail |
| 3.2 | Tap a row to open it | It lights (~70 ms after contact — reads as instant), fills to the end, then fades |
| 3.3 | Galaxy: watch the fill during a busy period (scan running) | The fill is SMOOTH — no fill-half, stop, fill-rest stall (it is compositor-driven now) |
| 3.4 | The fill colour, light AND dark theme | NEUTRAL — a quiet step above the row's own ground. ⚠ Check on the SETTINGS hub and the CONTACTS picker too (card grounds — the old token was invisible exactly there). If dark still reads invisible on the Galaxy, say so: the dial is one alpha number |
| 3.5 | Desktop, mouse | Press on a hovered row is visible (it steps past the hover wash) |
| 3.6 | A tap quicker than you can see | Still flashes its full fill after release (no lost feedback) |
| 3.7 | The paint delay feel | If rows feel "dead" on tap, the 70 ms dial is yours to lower; if any trail remains, to raise |

## 4. Riders

| # | What | Expect |
|---|---|---|
| 4.1 | Reduced motion ON (system) | Press = flat tint, slightly stronger than normal (10% wash); wallet hero still collapses/expands without animation and without any stuck state |
| 4.2 | Selected (open) chat row on desktop split view, press it | The press stays in the BLUE tonal family, not neutral |
| 4.3 | Pinned rows | The pin wash returns as the press fades — no blink |

## If something fails

Do not tune on the spot. Save `ixian.0.log`, name the checklist row, and hand both to
the next session. The pins for every row above exist — a failure here is a pin gap
too, and the pin gap is the more important find.
