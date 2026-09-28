# Walk — the #993/#994 round (office: iPhone 15 + Mac; Windows/Android sanity)

Walk AFTER the payment/app card reskin (#995), in one pass. Mark P / F / N. Bring the `[M5]` / `[M6]` log lines back verbatim.

| # | Where | Do | Expect |
|---|---|---|---|
| R.1 | Mac + iPhone · a chat | Fill a conversation until it is JUST short of the pane (one message less than scrolling) | The newest bubble sits fully ABOVE the composer pill, never behind it (M7). One more message: same. |
| R.2 | Mac + iPhone · a chat | Open the keyboard in a short chat | The log still clears the pill (the lift is in the spacer too). |
| R.3 | iPhone + Mac | Tap to open: message menu, chats row menu, attach ⊕, tx sheet, member sheet, a confirm modal | NO focus ring on the first row (F1). |
| R.4 | Windows | Tab to a chat row → Enter to open its menu; Tab to a delete → Enter for the confirm | Focus lands INSIDE (first row / Cancel) — keyboard a11y kept. |
| R.5 | iPhone · New group | Type the group name with the keyboard up | The **Create group** button sits ABOVE the keyboard (N2b). Keyboard down: at the bottom as before. |
| R.6 | Mac · light + dark | Look at the title-bar strip (traffic lights) over rail / list / topbar / chat | A 1px hairline under the strip (M6). None on Windows. Note: line vs the rail logo (NIT) · Wallet tab has none (by design, hero). |
| R.7 | Mac · Console / ixian.log | Launch, open a few panes | Copy the `[M6] mac safe-area top=` line(s). `top=0` on screen = the fix is native, the line is 0px. |
| R.8 | Mac · Add contact | ⌘V and right-click → Paste an address copied from TextEdit, then one copied with Spixi's own Copy | Paste works (970.6). Copy the `[M5] main menu edit=… paste=…` and `[M5] add-contact pasteboard hasStrings=…` lines. |
| R.9 | iPhone + Mac | Spixi's own Copy: member sheet address · tx sheet field · address sheet · message menu Copy → paste into Notes | The text arrives. A ✓ shows ONLY when it did (#994 copy fix). |
| R.10 | iPhone | While typing in the composer, long-press a message → Copy | Does the keyboard flash (close + reopen)? (#994 MINOR, reasoned only) |
| R.11 | Both themes · a chat | Received + sent, single and grouped runs | NO tail; the top-outer corner of a lone/first bubble is a small 4px curve; the dark hairline runs all round (T1). |
| R.12 | Dark · a chat with a received payment card | Look at the Details row | A visible divider above "Details" (#989 review M1). |
| R.13 | Dark · selection mode | Select a SENT payment/app card | Its edge stays visible on the blue selection wash. |
| R.14 | Dark + light · Account → Chat appearance | The preview bubbles | Same shape and edge as the chat (no tail, 4px corner, dark hairline). |
| R.15 | iPhone · Wallet | Tap the round "?" pill near its edge | It opens (44px hit area); the chip beside it is not hit. |
| R.16 | Mac · lock + launch + call | Look under the title bar | NO hairline across the dark art. |
| R.17 | All | Quick light/dark pass over every tab | Nothing else moved. |

## The reskin (#996) + the premium polish round (#997–#1013)

| # | Where | Do | Expect |
|---|---|---|---|
| P.1 | Both themes · a chat with payments | Look at every payment card | A card you can ACT on (incoming request Pay/Decline, your pending request Cancel, a failed payment Retry) keeps the full card. Every other card is the compact pill: medallion · label · big amount · quiet status + time, no coloured badge, no memo. |
| P.2 | iPhone 15 (393) + a 320–360 width (Android small / Mac narrow pane) | Received + sent pills with a long amount (12,345.67) | Nothing leaves the card. When status + time do not fit beside the amount, they sit UNDER it, right-aligned (#1013 M1). |
| P.3 | A completed pill | Tap anywhere on it | Details opens once (a double tap opens it once). A pill with nowhere to go (declined) does nothing. |
| P.4 | A pending outgoing payment | Let it complete while the chat is open | A small check draws once, the status fades in (#1009). Reopen the chat: the check is static. |
| P.5 | App invites | Invite · your own invite · missing app with Get · in-session · declined · ended | Buttons exactly where you can act; ended/declined are compact rows. |
| P.6 | A chat with two call cards | Start a call from this chat, look at both cards; hang up | While the call is live NEITHER card shows "Call back". After hang-up both do (#1006). "You declined" never does. Missed = the only red one. |
| P.7 | Both themes · a group chat | Look at sender names beside their avatars | Each name reads as its avatar's colour; all readable (#1001). |
| P.8 | Light · Account → Chat appearance | Background shows None + Contours; Canvas row shows Solid / Brand gradient | Pick Brand gradient: the preview and every chat turn lavender, the contours ink follows. Dark: no Canvas row. |
| P.9 | A device that had the DATA MATRIX pattern | Update and open a chat | Contours shows (the old pick falls through), not a blank background. |
| P.10 | Light · Account + every sublevel (Appearance, Privacy, Notifications, Downloads, About, How to, Backup, Developer) | Look at card vs ground | White cards on a grey ground everywhere (#1007/#1013). Dark: unchanged. |
| P.11 | Account header | Tap Copy, then QR | Copy says "Copied"; QR opens the address sheet. Taps between the two buttons do not hit the wrong one. |
| P.12 | Wallet · narrow desktop pane | Shrink until a tx row is tight | The badge becomes icon-only; widen: the word returns (#1008). |
| P.13 | A chat | Watch a sent message go sent → delivered → read live | The tick crossfades (160ms); on open nothing animates (#1010). |
| P.14 | Selection mode · a chat with pills and call cards | Tap a pill and a call card | They toggle selection; no pressed flash on the medallion or the call-back disc. |
| P.15 | Downloads / a file card | A long file name | "Quarterly_re…port.pdf" — the extension stays visible (#1005). |
| P.16 | Account hub (both themes) | Scroll the whole hub | No two adjacent icon discs share a colour; danger rows are slate; glyphs are white (#1017). |
| P.17 | Backup sublevel | Look at "what's inside" | The four tiles are four different colours (#1022 M1). |
| P.18 | Dark · any bottom sheet with cards (Chat appearance, attach) | Open it | Cards inside the sheet lift off the sheet ground (#1018). |
| P.19 | Dark · Delete chat / Delete account dialog | Open it | The destructive button is a solid red with white text (#1018; dial M5 on separation). |
| P.20 | Account → Chat appearance | Look at Canvas | Colour circles, not words; tap one: the ring moves, the preview changes; keyboard Tab/Enter work (#1019). |
| P.21 | A chat · app invite for an app you do not have | Look at the card | A coloured monogram, not a rocket; the two buttons sit side by side (#1020). |
| P.22 | A chat · receive a PDF, a ZIP, an MP3 | Look at the cards | A coloured document tile with PDF/ZIP/MP3; "Tap to download" in blue; tap: percent counts up, then the size (#1021). |
| P.23 | Wallet + chat cards | Any request / sent / pending | No yellow or red numbers; only a received completed amount is green (#1016). |
