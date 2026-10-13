# Walk DT-1 round 2 — the list density, the Windows title bar look, pinned rows

Added 2026-10-13 (DECISIONS #1390–#1393; the walk of #1391 found the title bar fails). Walk on the round-2 build (on top of the two DT-1 commits). ⚠ C# UNCOMPILED for MAUI: `DtTitleBarRules.cs` · `SpixiFlags.cs` · `DevPage.xaml.cs` (default changes only) — the F5 build is the first compile. Artifact: `docs/walk-artifact-dt1-r2.html` ("Spixi Desktop DT-1 Round 2 Walk").

Wipe the Windows build output with `cmd /c rd /s /q "\\?\<repo>\Spixi\bin"` (one WebView2 file has a 261-char path; `Remove-Item` stops on it) and `Remove-Item -Recurse -Force Spixi\obj`.

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| DT2-BUILD-W | W | 1) F5. 2) Account › Chat appearance. | The build succeeds. The chat-list card starts with "List density": Comfortable · Compact · Dense — only this build. |  | this build only |
| DT2-TB-LOOK | W | 1) Developer › Title bar › "Windows title bar (default)" (your stored "colors" acts while dev mode is on). 2) Restart Spixi. 3) Light, then Dark. 4) Drag the window to its narrowest. | 3: the bar looks as before P1 (the Windows theme, like Explorer), with the title "Spixi" (not "Spixi IM") and the three caption buttons, in both themes. 4: "Spixi" and the buttons stay. Log: [FLAGS] dttitlebar=off. |  | the Windows look |
| DT2-TB-MARK | W | 1) Look at the top centre of the window (the "═" mark from the DT-1 walk images). | The mark is gone. If it is still there: was it there before P1? Write it in the note. |  | the small mark |
| DT2-TB-DEVOFF | W | 1) Turn developer mode off. 2) Restart Spixi. | The same Windows look and "Spixi". Turn developer mode on again after. |  | dev mode off |
| DT2-PIN | W | 1) Pin 2 chats. 2) Look at the two pinned rows. 3) Hover a pinned row. 4) Hover an unpinned row. 5) Open a pinned chat and hover it. | 2: a thin gap between the rounded rows (also between the other rows). 3: the pinned row turns a clearly stronger blue tint. 4: grey, as before. 5: the selected row keeps its own colour. |  | pinned rows |
| DT2-DENS-LIVE | W | 1) Chat appearance › List density › Compact. 2) Dense. 3) Comfortable. Watch the chat list each time (no restart). | 1: smaller avatars, the same two lines, about one more row on screen. 2: one line per chat (name, preview, badge, time), small avatars, about three more rows. 3: as before. Each change shows at once. |  | the three densities |
| DT2-DENS-PREVIEW | W | 1) Message preview › 2 lines. 2) List density › Dense. 3) Compact. | 2: the Message preview control hides; the list shows one line. 3: the control comes back with "2 lines" still picked; the list shows 2-line previews. |  | with Message preview |
| DT2-DENS-RESTART | W | 1) Dense. 2) Close and start Spixi. | The list opens dense (no flash of the big rows). |  | restart |
| DT2-DENS-HOVER | W | 1) Dense. 2) Hover a row with an unread badge. 3) Hover a pinned row. 4) Light and dark. | The four buttons fit inside the row; the name stays readable; the badge and the time show again when the pointer leaves. Pinned and unread rows stay one line. |  | dense + hover |
| DT2-BUILD-A | A | 1) Wipe obj / bin, Debug -t:Run. 2) Account › Chat appearance. | The build succeeds. NO "List density" control (desktop only); Message preview as before. |  | Android |
| DT2-PHONE-SAME | A | 1) Look at the chat list with 2 pinned chats. | Full-width rows, no gaps, the same row height and avatars as before. |  | the phone list is unchanged |
