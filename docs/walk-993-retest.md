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
