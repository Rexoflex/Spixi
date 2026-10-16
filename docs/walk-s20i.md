# Walk S20I — Drop D (desktop selection · My address row · the address moment)

Added 2026-10-16 (Session 20I Drop D; DECISIONS #1461 · #1462). Platforms: Windows (W) · Android (A) · iPhone (I) · Mac (M). Apply `session-s20i-dropD.patch` on top of the Drop C commit. C# changed (the moment) → a clean build everywhere.

## Set-up
- **(0) ★ COPY YOUR DATA FIRST (L149).** No row here changes account data (only "Reset moment sheets"). Still: close Spixi and copy the data folder. Windows: `Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" "$env:USERPROFILE\Documents\Spixi-copy-s20i"`.
- **(a) Windows:** F5 only, never `dotnet build` (#663); close Visual Studio, wipe `Spixi\bin` + `Spixi\obj` first (L139).
- **(b) Android:** wipe `Spixi\obj` + `Spixi\bin`, then `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug -t:Run`.
- **(c) iPhone + Mac:** wipe `Spixi/obj` + `Spixi/bin`, a plain build, then Run (#320).
- **(d) Developer mode ON** (Account › Developer is visible) for the moment rows.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| **BUILD · this build only** | | | | | |
| S20I-BUILD | W+A+I+M | 1) Open Account. | A row **"My address"** with the line "How people add you" sits directly ABOVE Contacts. | | #1462 · only this build has it |
| **OW-X-SELECT · desktop drag-select** | | | | | |
| S20I-SEL-W | W | 1) Press the mouse on the left rail (on "Chats") and drag across the chat list and back. 2) Do the same on the welcome screen (a test Windows user, or skip). 3) Open a chat; drag across ONE message's text. 4) Ctrl+C, paste in the composer. 5) Type in the composer and in Search. 6) Account › My address: drag over the full address in the sheet. 7) Wallet › a payment › drag over the transaction ID. | 1–2: NO blue selection anywhere (rail, headings, rows, slides). 3: the message text selects. 4: it pastes. 5: typing and caret work. 6–7: the address / ID select. | | #1461 |
| S20I-SEL-M | M | Same steps as S20I-SEL-W, with Cmd+C. Also drag over the header's short address "425Hqz…" in Account. | As S20I-SEL-W. The short header address does NOT select (use its Copy button). | | #1461 · the reported platform (WKWebView) — not covered by the cloud check (Chromium only) |
| S20I-SEL-PHONE | A+I | 1) Long-press a chat row, a heading and a message. | As before this build (the long-press menu; no text selection callout on rows). | | phone unchanged |
| **The My address row** | | | | | |
| S20I-ROW | W+A+I+M | 1) Account › tap **My address**. 2) In the sheet: the QR, the full address, Copy, Share. 3) Close it. 4) Tap the short address under your name, then the QR button. | 1–2: the address sheet opens (the same sheet as the QR button). 4: the same sheet. | | #1462 · dial: keep or remove the header line (Dials Artifact) |
| **The address moment ("How people find you")** | | | | | |
| S20I-MO | W+A+I+M | 1) Account › Developer › Reset moment sheets. 2) Close Spixi fully; start it. 3) **Wait 10 s on Chats** (the phone warms Account in the background — nothing may show). 4) Open Account. 5) Tap "Show my address". | 3: no sheet. 4: the sheet "How people find you" (the QR art) shows over the Account hub, once. 5: it closes and the address sheet opens. | | #1462 · P32 |
| S20I-MO-ONCE | W+A+I+M | 1) After S20I-MO: leave Account, open it again. 2) Close Spixi fully, start, open Account. | 1–2: no sheet. | | once per account |
| S20I-MO-SUB | A or I | 1) Reset moment sheets; restart. 2) Open Account and AT ONCE tap Privacy (a sub-screen). 3) Wait 3 s. 4) Go back to the hub. | 2–3: no sheet over Privacy. 4: the sheet shows on the hub (or at the next Account open). | | #46 r1 M3 |
| S20I-MO-PAY | W or A | 1) Reset moment sheets; restart. 2) Open Account (the sheet shows); tap "Got it". 3) Wallet › Send › pick a contact and an amount › Review. | 3: "Before you pay" still shows. | | never takes the session |
| S20I-MO-RESTORED | any | Only with a RESTORED test account (never your own): Reset moment sheets, restart, open Account. | The sheet shows (every account sees it once — Damir 23:38). | | N/A if no test account |

**Result line for DECISIONS:** `WALK #n (S20I Drop D, …): n P · n F · n N/A`.
