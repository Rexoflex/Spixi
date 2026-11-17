# Walk fixb1 — Fix batch 1 (seven small fixes)

Session `fixb1`, 2026-11-16 (DECISIONS #1645–#1654; packets P50–P53). One build per platform from the pull request
branch `work/fixb1`. Windows = F5 (never `dotnet build`), wipe `Spixi\obj` + `Spixi\bin` first (C# and html changed).
Android = wipe `Spixi/obj` + `Spixi/bin`, then the Release dev build (the html changed, #449). ★ L149: copy the data
folder first — rows W-1 and A-2 delete a chat history. Use a TEST contact. The page with the same rows: the Artifact
**"Spixi Fix batch 1 — walk rows"** (https://claude.ai/artifact/9bUUwUg7RsDaGdBBnkNawC). iPhone and Mac: owed to the Apple phase (W-2, W-3 and W-4 also apply to the Mac).

## Windows

| Row | Steps | Pass when |
|---|---|---|
| W-BUILD | Start the app. Account › Developer › open the log. Find `[FLAGS] confirmdefault=`. | The log shows `[FLAGS] confirmdefault=1 dividerline=1` (only this build writes that line). |
| W-1 Enter | Open a TEST contact › chat info › Delete history. Wait 1 second, then press Enter. Open it again, press Esc. Open it again, press Tab until OK has the focus ring, wait 1 second, press Enter. Repeat the first step for Remove contact (wait 1 second, press Enter only). (An OK inside 0.6 s counts as Cancel by design.) | Enter alone and Esc cancel (the history stays; the log shows `[CONFIRM] removehistory cancel`); Cancel has the accent and the focus when the dialog opens; Enter on the focused OK deletes the history; Remove contact + Enter removes nothing. |
| W-2 Unread strip | Open a chat with unread messages and a long history (a scroll bar shows). Look at the "Unread messages" strip and the date pill above it. Open a short chat with unread messages (no scroll bar). Do both in light and dark. | The strip has the same gap on the left and on the right in all four cases, and the date pill is centred over the strip. |
| W-3 Divider | Two-pane window. Move the pointer onto the divider between the chat list and the chat. Drag it left and right, then let go with the pointer still on it, then move the pointer away. Double-click the divider. Do it in light and dark. | A 2 px line in the accent colour covers the whole height while the pointer is on the divider and for the whole drag; it goes when the drag ends or the pointer leaves; the ↔ cursor and the double-click reset work as before. (Dial: Damir judges the width and the colour.) |
| W-4 Account header | Open Account. Then tap "My address". In the sheet, use Copy and read the explanation lines. | The header shows the photo and the name only (no address, no Copy, no QR, no "What is this?"); the sheet shows the QR code, the full address, a working Copy and the explanation of the address. |

## Android

| Row | Steps | Pass when |
|---|---|---|
| A-BUILD | Remove the stored switches first: on the chat list tap the "Chats" title ten times (toast "Developer mode disabled" — leaving Developer mode removes the four speed switches), then ten times again ("Developer mode enabled"). Force-stop Spixi, start it, open Account › Developer › the log. | The log shows `[FLAGS] confirmdefault=1 dividerline=1` and `[FLAGS] warmidle=1 sparerearm=1 sparekeep=1 noemptydetail=1` — with no stored switch, `sparekeep=1` is the new default (a build without this batch shows `sparekeep=0` here and no `confirmdefault` line). |
| A-1 Dialog buttons | Phone in dark mode (system setting). Open a TEST contact › chat info › Delete history; read the two buttons, then Cancel. Phone in light mode: the same. | The button texts are easy to read in both modes (light blue on the dark dialog, dark blue on the white dialog). |
| A-2 Scroll bar | App theme Light: Account › Language, look at the bar on the right of the list and drag it. App theme Dark (in the app, no restart): Account › Language, the same. (Dial: Damir judges the two greys.) | The bar is light grey on the light sheet and dark grey on the dark sheet, also right after the theme change; it is visible in both. (Other lists keep the phone's own scroll bar — not changed by this batch.) |
| A-3 Sparekeep | Right after A-BUILD (no stored switch). App lock off. Open the home screen, press Home, wait 1 minute, come back and tap a chat at once. Then wait 2 minutes in the background and do it again (the keep limit is 3 minutes). Read the log after each tap. Then turn the app lock on and repeat the 1-minute case. | With the lock off, both taps open the chat with its messages and log `[CDPERF] chat attach spare=1`; with the app lock on the lock comes first and the chat is never blank. |
| A-4 Account header | Open Account. Tap "My address"; use Copy and read the explanation lines. | The same as W-4, on the phone. |
