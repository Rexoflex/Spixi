# Walk fixb2 — Fix batch 2 (the walk findings of Fix batch 1 and the desktop polish that waited)

Session `fixb2`, 2026-11-17 (DECISIONS #1695–#1706; packets P59–P62; ⚠ the batch is STOPPED at review round 3, #1705: walk only after Damir's choice and the push). One build per platform from the pull request
branch `work/fixb2`. Windows = F5 (never `dotnet build`); wipe `Spixi\bin` + `Spixi\obj` first (C# and html changed).
Android = wipe `Spixi/bin` + `Spixi/obj`, then the Release dev build (the html changed, #449). ★ L149: rows W-1, W-3 and
W-4 open a delete, send or mini-app confirm: copy the data folder first and use a Seed contact. **The payment row is
walked up to the confirm dialog and cancelled — the walk sends no IXI.** The page with the same rows: the Artifact
**"Spixi Fix batch 2 — walk rows"** (https://claude.ai/artifact/StetL6PwsguBDfTog2jNUc). Renders: the Artifact "Spixi Fix batch 2 — renders"
(https://claude.ai/artifact/1ouXb5xsLnw6jeZE1nS7hs).

## Part 1 · Windows

| Row | Steps | Pass when |
|---|---|---|
| W-BUILD | Start the app. Account › Developer › open the log. Find `[FLAGS] payconfirmdefault=`. | The log shows `[FLAGS] payconfirmdefault=1 appconfirmdefault=1` right after `[FLAGS] confirmdefault=1 dividerline=1` (only this build writes it). |
| W-1 Confirm focus (item 3) | Copy the data folder first. Seed contact › chat info › Delete history. When the dialog opens, look at both buttons. Wait 1 s, press **Enter**. Open again, press **Space**. Open again, press **Esc**. Open again, press **Tab** until the ring is on OK, wait 1 s, press **Enter**. | At open Cancel shows the focus ring and the accent; OK shows neither. Enter, Space and Esc each close the dialog and the history stays (log `[CONFIRM] removehistory cancel`). Tab moves the ring to OK; Enter there deletes. If at open no ring shows and Enter does nothing: mark F, press Enter once more, and copy the `[CONFIRM]` lines into the note (`busy` = the keys went to the page). |
| W-2 Long text (item 3, Q-1) | If a mini app or a contact with a very long name is at hand: open a confirm whose text is long. | The text scrolls (wheel or bar) and its last line can be reached; Cancel keeps the ring. (N/A if no long text is at hand.) |
| W-3 Payment confirm (item 4) | Wallet › Send to a Seed contact, a small amount, up to the confirm. Look at the dialog. Press **Enter**. Open it again: **Esc**. Open it again: **Tab** (the ring moves to Send), **Shift+Tab** (back to Cancel), **Enter**. Open it again: click **Cancel**. Do the same once from a chat's payment-request "Pay" or a tip, with Enter only. | The dialog shows the same title, amount, recipient and fee as before; Cancel has the ring and the accent. Every key and the click cancel: nothing is sent (no new transaction row, the balance is the same). **Do not press Send.** |
| W-4 Mini-app confirm (item 4) | Only if a mini app with an action is installed (else N/A). Start the action until "Do you want to …" opens. Press **Enter**. Start it again: **Esc**. Start it again: press the **arrow keys** (left, right) and note where the ring goes, then **Shift+Tab** until the ring is on Cancel, **Enter**. Start it again: **Tab** (ring on OK), **Shift+Tab**, **Enter**. | Every key cancels: no "App action sent" alert, nothing is approved. Tab moves the ring to OK and back. **Do not press OK.** |
| W-5 Unread pill (item 1) | Open a chat with unread messages and a long history (a scroll bar shows), then a short one (no scroll bar). Light and dark. Make the window narrow, then wide. | "Unread messages" is a rounded pill centred under the date pill, the same shape as the date pill — not a bar. Nothing touches or misses an edge; the pill, the date pill and the composer share one centre. |
| W-6 Divider line + reset (item 2) | Display scale 100 %. Two panes. Move the pointer onto the divider; zoom in (Magnifier). Drag; stop at a few widths. Dark theme: again. Display scale 150 % (restart if Windows asks): again; if possible also 125 %. Then double-click the divider. Then open a chat and its chat info (right pane) in a window about 1100 wide, drag the list narrow, double-click the divider. | The accent line lies ON the grey hairline (no grey to its right, no gap) at every scale and width. The double-click gives the list **440** (was 400; 🟡 dial: is 440 right?) and keeps it after a restart. With chat info open the conversation stays at least as wide as before the reset allows (≥ 320, no squeeze), without a window resize. Note: at the default width chat info now opens beside the conversation from a window about 1040 wide (was 1000). |
| W-7 Small-window sheets (item 5) | Account › My address in the smallest window (drag to the minimum height). Then a window about 1000 × 700. Then a large window. Also open the Theme picker and the chat's app picker (+ › Apps) in the small window. | Small: the sheet goes to about 24 px from the top and bottom edges (it may still scroll at the very minimum). About 1000 × 700: the whole address sheet shows with no scroll bar. Large: as before. The other sheets follow the same rule. |
| W-8 Transaction rows (item 6) | Wallet with several transactions, chat list beside it. Hover a transaction row, select one; hover and select a chat row. Light and dark. Chat info › its payments list. | A hovered and a selected transaction row have the same inset, rounded corner and gap as a chat row; the row content stays aligned with the search field. Chat info's payments list keeps its square rows inside the card. |

## Part 2 · Android

| Row | Steps | Pass when |
|---|---|---|
| A-BUILD | Force-stop Spixi, start it, Account › Developer › the log. | The log shows `[FLAGS] payconfirmdefault=1 appconfirmdefault=1` (the switches act only on Windows; the line is written on every platform). |
| A-1 Unread pill (item 1) | Open a chat with unread messages and a long history, then a short one. Light and dark. If the phone's font size can be raised, raise it once and look again. | "Unread messages" is a rounded pill centred under the date pill, like the date pill; it is visible in dark; it never touches the screen edges (a long label wraps inside it). |
| A-2 Aurora ring (item 7) | Chat appearance › Aurora background, light theme. In a chat, search a word and jump to an older message. Then dark theme, the same. | Light: the ring around the jumped-to bubble is a slightly darker blue and clearly visible on the Aurora ground. Dark: as before. |
| A-3 Phone layouts unchanged (items 5, 6) | Account › My address. Wallet with transactions. | The address sheet is the bottom sheet as before; the transaction rows are full width as before. |

## Apple phase (#1515)
Mac: W-5, W-6 (Retina; the line on the hairline; reset 440), W-7 (no window minimum is set in C# for the Mac), W-8.
iPhone: A-1, A-2, A-3. Owed to the Apple phase.
