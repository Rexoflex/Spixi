# P08 · QR · QR scan: what a scanned code can do

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | yes — a scanned QR fills in the recipient and amount of the send screen. Nothing is signed without the native confirm | yes | shipped | 6 min |

**Look here first:** `Spixi/Utils/Utils.cs:619` — `safeScanPayload`. It is the only limit on what a stranger's QR puts into the money compose (`addr` · `addr:ixi` · `addr:send:<digits[.digits]>`; any other tail is dropped). Only `SPayments.cs:577` (`confirmAndAuth`) can sign. O-14 (#805).

**DECISIONS:** #158 · #293 · #440 · #523 · #536 · #640 · #805 · #806 · #827 · #831 · #928 · #1304

## What changed and why
- A payment QR used to open the native WalletSendPage. That page is deleted. The payload now goes to the home shell's send compose as `quickScanResult`, and the compose fills in the fields (#523, #640).
- The hero Scan button and the compose send `ixian:sendScan`. The result always goes back into the compose, after `ExtendedAddress.Validate` (#536).
- Add-contact and add-app now live inside the home shell. `contactscan` and `appscan` set a flag so that the answer goes back into that screen and no page is pushed (#827).
- One function, `Utils.scanAddressOf`, decides where the address ends (before the first ':'). Before this, a contact QR kept ":ixi" and could not be added (#831).
- The scanner itself is unchanged: `ScanPage` + the vendored html5-qrcode (same sha256 as at the fork). Its `qrresult` match is now anchored (#158, #805).

## Files (verified at 387ca78b)
- `Spixi/Pages/Home/HomePage.xaml.cs:2340` — `quickScanForSend`: validates the address, then pushes `quickScanResult(safeScanPayload(…))` (`:2372`).
- `Spixi/Pages/Home/HomePage.xaml.cs:2377` — `processQRResult`: app arm (`:2387`), payment arm (`:2424`), contact arm (`:2447`), otherwise a ContactNewPage that is only filled in.
- `Spixi/Utils/Utils.cs:609` — `scanAddressOf`: the text before the first ':'.
- `Spixi/Pages/Scan/ScanPage.xaml.cs:57` — `ixian:qrresult:` is matched with StartsWith + Ordinal (it used Contains + Split). Fires once (`allowScanning`).
- `Spixi/Pages/Contacts/ContactNewPage.xaml.cs:262` — `answerCheckAddress` answers `onKnownAddress`. It is called from ContactNewPage and from HomePage (`HomePage.xaml.cs:1170`).
- `Spixi/Platforms/iOS/iOSWebViewHandler.cs:416` — iOS grants the camera only to the scan document (see P07 `webview`).
- `Spixi/Pages/Home/HomePage.xaml.cs:5287` — `setScanProgress`: block-sync progress, not QR (#440). #1304 plans a wallet strip built on it.

## Bridge surface
| Verb / push | Args (shape) | Who can send it (which WebView / shell) | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:sendScan` | none | home (`src/shells/home.html`, HomePage); renders untrusted names/previews | `HomePage.xaml.cs:983` | ours |
| `ixian:contactscan` | none | home | `HomePage.xaml.cs:1211` | ours |
| `ixian:appscan` | none | home — the same ScanPage; covered in P06 `miniapps` | `HomePage.xaml.cs:1200` | ours |
| `ixian:qrresult:` | `<decoded text>` | scan (`src/shells/scan.html`, ScanPage); renders the camera only | `ScanPage.xaml.cs:57` | reshaped (anchored) |
| push `quickScanResult` | `<addr[:ixi \| :send:<amount>]>` | → home | `HomePage.xaml.cs:2372`, `:2424` | ours |
| push `onContactScanResult` | `<text before the first ':'>`, not validated | → home | `HomePage.xaml.cs:2450` | ours |
| push `setScannedData` | `<app URL, 21–127 chars>` | → home (before: only app_new) | `HomePage.xaml.cs:2399` | relocated |
| push `onKnownAddress` | `<self\|contact>, <routing b58\|"">, <peer nickname\|"">, <echo of the asked string>` | → home or contact_new | `ContactNewPage.xaml.cs:270`, `:280` | ours |
| push `setScanProgress` | `<int current>, <int target>, <int origin>, <0\|1>` | → home | `HomePage.xaml.cs:5287` | ours (wallet sync, not QR) |

## Threat → rule → proof
| A hostile QR could try… | What stops it (`file:line`) | Proof |
|---|---|---|
| `addr:send:1e9`, a negative amount, or an extra tail aimed at the compose | `Utils.cs:619`, `:660` (digits and one '.' only; an unknown tail is dropped) | smoke "★★ GATE 30 BEHAVIOURAL (O-14)" (runs the C# source as JS) |
| Paying without a tap | the push only opens the compose; signing is only through `ixian:signSend` → `SPayments.cs:577` | smoke "W-e at source: HomePage routes ixian:sendScan → quickScanForSend → quickScanResult(safeScanPayload(payload))…" |
| A payload that contains `ixian:qrresult:` to split itself | the shell drops it; `ScanPage.xaml.cs:57` is anchored | smoke "hostile self-prefixed QR payload is NEVER emitted" |
| Script or markup in the payload | every `sendUiCommand` argument is base64-encoded (`Utils.cs:120`) | no pin for this path |
| An app link or contact QR that acts on its own | it only fills a field. Fetch needs a tap and https (`MiniAppManager.cs:126`); a contact request needs `ixian:request:` | GATE 55 (a)/(b) pins the two split rules; "no auto-action" is walk only |

## Given up / left open
- ⚠ New, not in any doc: `appScanToShell` / `contactScanToShell` (`HomePage.xaml.cs:6418`) are cleared only after a successful decode. Cancel an app scan, then scan a contact or a payment QR through `quickscan`/`contactscan`: the text lands in the add-app URL field. This sends the QR to the wrong screen; it causes no money or data harm. Walk not done.
- `ContactNewPage.xaml.cs:100` still matches `Contains("ixian:qrresult:")` (legacy). No shipped shell sends that verb.
- Android camera: the legacy `OnPermissionRequest` grants every request (MAJOR #9). Windows and MacCatalyst have no permission handler in the tree, so WebView2/WebKit defaults apply (not checked on a device).
- #507–#511: the QR part is QR display size only (#509). No C#.

## Question for BE
Should a payment QR's amount still be pre-filled into the compose, or should we drop the amount and keep only the address (O-14)?
