# Walk SQ-AL — Albanian (sq-al), the first release-train language

Added 2026-10-12 (DECISIONS #1368). Walk on the build with the sq-al patch. Platforms: Android (A) · Windows (W). The patch adds no new C# file; `SpixiLocalization.cs` (one list entry) and `Utils.cs` (one `case`) change.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| SQ-BUILD-W | W | 1) F5 (never dotnet build). 2) Account › Language, scroll to the end. | The build succeeds. The last row is the Albanian flag + "Shqip" — only this build. |  | this build only |
| SQ-BUILD-A | A | 1) Wipe obj / bin, Debug -t:Run. 2) Welcome › the language pill, scroll to the end. | The build succeeds. The last row is the Albanian flag + "Shqip". |  | this build only (#320: Raw/lang + html need the wipe) |
| SQ-PICK | A | 1) Pick Shqip. | The whole app is Albanian: tabs "Bisedat · Aplikacionet · Portofoli · Llogaria". The moment sheet shows "Përkthyer me AI", the pills "Hello" + "Përshëndetje", the button "E kuptoj". |  | #1368 · moment 1 |
| SQ-NOTE | A | 1) Account › Gjuha. | At the top: "Një pjesë e tekstit … është përkthyer me AI …" + the link "Raporto një problem përkthimi". A tap opens a mail to support@spixi.io with "(sq-al)" in the subject. |  | #1246 · #1368 |
| SQ-NATIVE | A | 1) Send 1 IXI (any contact). 2) Read the native confirm. 3) Call a contact. | 2: "… <fee> IXI është tarifa e rrjetit, e përfshirë në pagesë." (the fee number reads into the sentence). 3: the call bar reads "Duke thirrur <name>...". |  | legacy .txt · #1368 (the review critical) |
| SQ-AMOUNT | A | 1) Wallet with a balance ≥ 10 000. 2) Send: type 15555.5 and review. | The amount groups as "15 555,5" in the shell AND in the native confirm (neither pads the fraction). Known (same as sl-si / it-it, the S16 useGrouping plan): a 4-digit amount shows "1555,5" in the shell and "1 555,5" in the native confirm. |  | Utils.cs gate |
| SQ-DATES | A | 1) Chats list with old chats. 2) Open a chat with old messages. | Weekdays / months in Albanian ("e hënë", "tetor"), 24-hour time. |  | setDocLang |
| SQ-FIT | A | 1) Account hub, Privacy, Backup, Chat appearance, Wallet › Send, a group chat info. Light and dark. | No label is cut or overlaps; long Albanian titles ellipsize cleanly. Note any row that reads wrong. |  | overflow audit 0 BREAKS |
| SQ-FIT-W | W | 1) The same screens in the desktop panes, narrow window. | As on Android. Known: the Backup row title "Kopja rezervë" wraps beside the "Kërkon veprim" badge in a narrow pane. |  | render note |
| SQ-BACK | A | 1) Language › English. | All text returns to English; the AI note is gone. |  | |
