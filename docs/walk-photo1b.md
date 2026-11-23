# Walk photo1b — the Chat shell batch (the lighter photo tile, the history insert, the chat backgrounds)

Session `photo1b`, 2026-11-18 (DECISIONS #1755–#1774; packets P71–P76). One build per platform from the branch
`work/photo1b`. Windows = F5 (never `dotnet build`); wipe `Spixi\bin` + `Spixi\obj` first (the html and C# changed).
Android = wipe `Spixi/bin` + `Spixi/obj`, then the Release dev build (the html changed, #449). ★ L149: row W-2 / A-2 sends
a file to a real contact on a second device (fixb4: a Seed contact never takes a file) — copy the data folder first. The page with the same rows: the Artifact **"Spixi Chat shell
batch — walk rows"** (link in the status doc). Renders (before / after, both themes, desktop and 412 × 915; the three
dark Mist versions): the Artifact **"Spixi Chat shell batch — renders"**.
Seed chats (developer seed): Seed 05 = a text chat of 1000 messages · Seed 55 = the voice chat · Seed 56 = the photo
chat (100 messages, 96 photos).

## Part 1 · Windows

| Row | Steps | Pass when |
|---|---|---|
| W-BUILD | Start the app. Account › Developer › open the log. Find `[FLAGS] photo1b`. | The log has `[FLAGS] photo1b tilelite=1 voicelite=1 olderinsert=1 olderanchor=1 fadeband=1` (only this build writes it). |
| W-1 Photo chat open (PO-4) | Open Seed 56. Look at the photos while they appear. Close and open it again twice. Light and dark. | The pictures fade in on their squares; no tile jumps or changes size; no file icon flashes before a picture; the log does not jump. |
| W-2 A `.jpg` that is not a picture (PO-4 reopen face) | Copy the data folder first. On the other device: Account › Security & privacy › "Download photos automatically" Off (so the offer waits for a tap). Rename a small text file to `broken.jpg`. Send it as a file to a REAL contact on that second device (not a Seed contact). Look at the tile before the other device takes the file. On the other device, tap the offer to download. Look at the sender after "File sent" (the toast shows on the sender only) and at the receiver after its download. Then close the chat and open it again on both devices. Wait a short moment. | Before the other device takes the file, the tile shows the JPG icon, 0 %, "Keep Spixi open until it's sent." and Cancel. This is correct for a file that is not sent yet. After "File sent", and again after the chat is closed and opened (after a short moment), the tile shows the file card on both devices: the document icon, the name `broken.jpg` and "Open file". A click opens the file or says it cannot be opened, never an empty square. |
| W-3 Voice row (PO-6) | Open Seed 55. Play a voice message; pause it; play another one. | The wave shows its bars; the played part of the wave fills as it plays and stops on pause; the time counts; a second clip stops the first. Rows not loaded yet show a flat wave. |
| W-4 Older messages (HV-1, HV-3, HV-4) | Open Seed 05. Scroll up fast through at least three pages of older messages (the spinner shows at the top), then slowly over the loaded messages. Then the same in Seed 56. | No stutter while you scroll over loaded messages; when a page arrives the message under your eye does not move (no jump); at each seam the date pill shows once, the bubble grouping is right, no message is missing or shown twice; the messages under the composer dissolve into it as before. |
| W-5 Unread pill and quote jump | Open a chat with unread messages. Then, in Seed 05 after three older pages, tap a reply's quote that points to an older message. | The "Unread messages" pill is where it was before; the jump lands on the quoted message and it pulses. |
| W-6 Chat backgrounds (#1644) | Chat appearance: Mist (the default) first, then Iris, Spixi, Meadow, Aurora, Dusk, Ocean. Each in light and in dark. On the renders page look at the three dark Mist versions once more. | Each appearance keeps its name and pattern; its colours are a little calmer than before (Mist light unchanged); dark Mist is a little lighter (`#0C0E10`) and its received bubble is clearly apart from the ground. Note your pick for dark Mist if it is not the third version. |
| W-7 The ring of light Aurora | Aurora, light. In a chat, search a word and jump to an older message. | The ring around the jumped-to bubble is clearly visible on the calmer Aurora ground. |

Corrected by fixb4 (WALK #1829 W-2 F): a Seed contact never takes a file, so its tile stays 'sending' (docs/fixb4-mechanisms.md § 5). The reopen is the leg that exercises PO-4; the decode-error path of the tile is held by the pin `pins-fixb4/e-tile-states` only (C# sends no preview of a non-image).

## Part 2 · Android

| Row | Steps | Pass when |
|---|---|---|
| A-BUILD | Force-stop Spixi, start it, Account › Developer › the log. | The log shows `[FLAGS] photo1b tilelite=1 voicelite=1 olderinsert=1 olderanchor=1 fadeband=1`. |
| A-1 Photo chat open | As W-1 on the phone. | As W-1. |
| A-2 A `.jpg` that is not a picture (PO-4 reopen face) | Copy the data folder first. On the other device: "Download photos automatically" Off. Put a small text file named `broken.jpg` on the phone. Send it as a file to a REAL contact on that second device (not a Seed contact). Look at the tile before the other device takes the file. On the other device, tap the offer to download. Look at the sender after "File sent" and at the receiver after its download. Then close the chat and open it again on both devices. Wait a short moment. | As W-2: before the other device takes the file, the JPG icon, 0 %, "Keep Spixi open until it's sent." and Cancel; after "File sent" and after the reopen, the file card (icon, `broken.jpg`, "Open file") on both devices; a click opens the file or says it cannot be opened, never an empty square. |
| A-3 Voice row | As W-3. | As W-3. |
| A-4 Older messages | As W-4: fast flings to the top through at least three pages in Seed 05, then Seed 56. | As W-4: no stop or stutter of the fling when a page arrives, the row under the finger stays, seams right. |
| A-5 Unread pill and quote jump | As W-5. | As W-5. |
| A-6 Chat backgrounds | As W-6 (default first). | As W-6. |
| A-7 The ring of light Aurora | As W-7. | As W-7. |

## Apple phase (#1515)
Mac: W-1 … W-7; iPhone: A-1 … A-7 (on iPhone WebKit a `scrollTop` write during momentum is a known risk — A-4 watches it).
