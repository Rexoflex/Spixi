# Walk Safety — mini-app paths · Android share · native confirms · the history lock · the Windows mini-app marker

Added 2026-10-16 (Session Safety; DECISIONS #1465–#1470; packets P33–P37). Platforms here: **Windows (W) · Android (A)**. iPhone + Mac rows: `docs/office-walk-sheet-v1.md` § 15. The simple-worded copy of this sheet is the Artifact **"Spixi Safety Walk"**.

Flags (Account › Developer › Release flags, the six rows marked "(Safety …)"; a change acts after a restart; OFF only works with Developer mode on): `safeappid` S-2 · `safestorage` S-1 · `safepick` S-3 · `nativeconfirm` S-5 · `historylock` S-6 · `winappmarker` O-02. S-4 (Android share roots) has no flag.

## Set-up
- **(0) ★ COPY YOUR DATA FIRST (L149).** Rows below remove a contact, delete history, kick, ban and leave a group. Close Spixi and copy the data folder. Windows: `Copy-Item -Recurse "$env:USERPROFILE\Documents\Spixi" "$env:USERPROFILE\Documents\Spixi-copy-safety"`. Android: Account › Backup first.
- **(1) Use TEST people only.** A TEST contact (your second device or a test account), and a TEST group that YOU own with that TEST member in it. Never your real contacts or groups.
- **(2) Windows:** close Visual Studio, wipe `Spixi\bin` + `Spixi\obj`, then F5 (never `dotnet build`, #663).
- **(3) Android:** wipe `Spixi\obj` + `Spixi\bin`, then `dotnet build Spixi\Spixi.csproj -f net10.0-android -c Debug -t:Run`.
- **(4) Developer mode ON** (Account › Developer is visible).
- **(5) Build the three test packages** (PowerShell, from the repo; they land on your Desktop). Copy them to the phone's Download folder for the Android rows.
  ```powershell
  cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; $w = "$env:TEMP\safetywalk"; Remove-Item -Recurse -Force $w -ErrorAction SilentlyContinue
  cd "C:\Users\Damir\Claude\Projects\Spixi Rework Of Frontend\Spixi"; foreach ($v in "good","badid","case") { $d = "$env:TEMP\safetywalk\$v"; New-Item -ItemType Directory -Force "$d" | Out-Null; Copy-Item -Recurse "docs\walk-safety-app\app" "$d\app"; Copy-Item "docs\walk-safety-app\appinfo-$v.spixi" "$d\appinfo.spixi"; tar.exe -a -cf "$env:USERPROFILE\Desktop\safety-walk-$v.zip" -C "$d" appinfo.spixi app }
  ```

| ID | Pl | Steps | Expected | P/F/N/A | Note |
|---|---|---|---|---|---|
| **BUILD · this build only** | | | | | |
| SW-BUILD | W+A | 1) Account › Developer. 2) Scroll to "Release flags". | Six new rows end with "(Safety S-2)", "(Safety S-1)", "(Safety S-3)", "(Safety S-5)", "(Safety S-6)", "(Safety O-02)". All are ON. | | only this build has them |
| **PART A · flags OFF (the old path)** | | | | | |
| SW-OFF-SET | W+A | 1) Switch the six Safety rows OFF. 2) Close Spixi fully; start it. 3) Account › Developer › open the log. | The log has `[FLAGS] safeappid=0 safestorage=0 safepick=0 nativeconfirm=0 historylock=0 winappmarker=0`. | | |
| SW-OFF-APP | W+A | 1) Mini apps › Add › pick `safety-walk-good.zip` › Install. 2) Open "Safety walk test". 3) Tap 1, then 2. | 1: installed. 3: "answer …: inside <time>". | | the test app works |
| SW-OFF-S1 | W | 1) In the test app tap 3. 2) Wait 5 s. 3) In Explorer open `Documents\Spixi`. 4) Tap 4. 5) Delete the file `safety-walk-outside` by hand. | 3: a file `safety-walk-outside` IS there (the old path shows the problem). 4: "answer …: outside <time>". | | S-1 problem shown |
| SW-OFF-RMH | W+A | 1) Open the TEST contact › chat info › Delete history. 2) Confirm the page sheet. | The history is deleted at once. No system dialog. | | old path |
| SW-OFF-WIN | W | 1) Open the test app. 2) Press F12. 3) Tap 7. | 2: DevTools opens. 3: a camera question or "camera: ALLOWED". Close DevTools. | | old path |
| **PART B · flags ON** | | | | | |
| SW-ON-SET | W+A | 1) Switch the six Safety rows ON. 2) Close Spixi fully; start it. 3) Open the log. | `[FLAGS] safeappid=1 safestorage=1 safepick=1 nativeconfirm=1 historylock=1 winappmarker=1`. | | |
| **S-1 · mini-app storage stays in its folder** | | | | | |
| SW-S1 | W+A | 1) Open the test app. 2) Tap 1, then 2. 3) Tap 3. 4) Wait 5 s. 5) Tap 4. 6) Windows: open `Documents\Spixi` in Explorer. | 2: "inside <time>". 3: an answer shows (the app does not hang). 5: "NOTHING STORED". 6: NO file `safety-walk-outside`. Log: `MiniAppActionHandler: refused an unsafe storage table`. | | P33 |
| **S-2 · the mini-app id is checked** | | | | | |
| SW-S2-BADID | W+A | 1) Mini apps › Add › pick `safety-walk-badid.zip`. 2) Try to install it. 3) Windows: look in `Documents\Spixi\html`. | 1–2: an error / "not an app"; nothing installs. 3: NO folder `SafetyWalkEscape`. Log: `MiniApp: refused an unsafe app id`. | | P33 · ⚠ never with the flag OFF |
| SW-S2-CASE | W+A | 1) The good test app is installed (SW-OFF-APP). 2) Add › pick `safety-walk-case.zip` › Install. 3) Open "Safety walk test" › tap 2. | 2: the install fails. 3: the app still opens and shows "inside <time>" (its storage is kept). Log: `MiniApp: refused a package whose id differs from an installed app only by case`. | | P33 · #46 r2 · ⚠ never with the flag OFF |
| SW-S2-START | W+A | 1) Close Spixi fully; start it. 2) Open Mini apps. | "Safety walk test" is still in the list and opens. | | the list loads |
| **S-3 · the picked file name cannot pick the path** | | | | | |
| SW-S3 | A | 1) In the phone's Files app rename `safety-walk-good.zip` to `my test (1) ü.zip`. 2) Mini apps › Add › pick it. | The details screen shows "Safety walk test". Install says it is installed or already installed. No crash. | | P33 · the name is only a label now |
| **S-4 · Android shares only what it must** | | | | | |
| SW-S4-RECV | A | 1) Ask the TEST contact to send you a photo and a PDF. 2) Open each one from the chat. | Each opens in a viewer app. | | P34 |
| SW-S4-SENT | A | 1) Send a PDF to the TEST contact. 2) Open your sent file from the chat. | It opens. | | P34 |
| SW-S4-DL | A | 1) Account › Downloads. 2) Open a file. | It opens. | | P34 |
| SW-S4-BACKUP | A | 1) Account › Backup › Share. 2) Pick Files (or Drive) and save it. | The share sheet shows; the backup saves. | | P34 · the wallet file is shared as a copy now |
| SW-S4-LOG | A | 1) Account › Developer › Send log. | The share sheet shows; the log can be sent. | | P34 |
| SW-S4-OLD | A (Android 9 or older only) | 1) Open a file you sent BEFORE this build. | Opens, or shows "cannot open" (known: old external-storage rows, recorded). | | N/A on Android 10+ |
| **S-5 · the system asks before remove, leave, kick, ban** | | | | | |
| SW-S5-RMH | W+A | 1) TEST contact › chat info › Delete history › confirm the page sheet. 2) A SYSTEM dialog shows: tap Cancel. 3) Repeat; tap OK. | 2: nothing is deleted; no error message. 3: the history is deleted. Log: `[CONFIRM] removehistory cancel`, then `… ok`. | | P35 |
| SW-S5-RMC | W+A | 1) TEST contact › chat info › Remove contact (tick "also leave shared groups" if it shows). 2) System dialog: Cancel. 3) Repeat; OK. | 2: the dialog title is "Remove <name>?"; if you share groups, the text says "You also leave the groups you share with this contact (N)."; Cancel keeps the contact, no error message. 3: the contact is removed. Add the TEST contact again after this row. | | P35 |
| SW-S5-LEAVE-INFO | W+A | 1) TEST group › chat info › Leave. 2) System dialog "Leave <group>?": Cancel. | You are still in the group. (Do the OK leg in SW-S5-LEAVE-CHAT.) | | P35 |
| SW-S5-KICK | W+A | 1) TEST group (you own it) › chat info › the TEST member › Kick. 2) System dialog "Kick <name>?": Cancel. 3) Repeat; OK. | 2: the member stays in the list. 3: the member is removed. Add the member again. | | P35 · re-sends the list on Cancel |
| SW-S5-BAN | W+A | 1) As SW-S5-KICK with Ban. | Cancel: the member stays. OK: banned. Unban / add again afterwards. | | P35 |
| SW-S5-KICK-CHAT | W+A | 1) Open the TEST group chat › tap the TEST member › Kick. 2) Cancel. | A system dialog shows; Cancel changes nothing. | | P35 · chat page |
| SW-S5-LEAVE-CHAT | W+A | 1) In the TEST group chat › Leave. 2) Cancel. 3) Repeat; OK. | 2: you stay. 3: you leave. | | P35 · chat page |
| SW-S5-HOME | W+A | 1) Chats list › long-press (right-click) the TEST contact › Delete history. | The PAGE sheet shows as before — NO system dialog (the home page is unchanged: D5). Cancel it. | | D5 kept |
| SW-S5-FAST | A | 1) Chat info › Delete history. 2) Tap the page's confirm button twice, very fast. | The system dialog stays open, or nothing is deleted. Never deleted by the second tap alone. | | #46 r4 (600 ms) |
| SW-S5-ENTER | W | 1) Open any system confirm (SW-S5-RMH). 2) Press Enter at once. | Write down which button Enter picks. P = Cancel or nothing; F = the destructive action runs. | | recorded #46 r1 MINOR-4 |
| SW-S5-ROTATE | A | 1) Open a system confirm. 2) Turn the phone. | The dialog stays (or closes as Cancel). Nothing is removed without your tap. | | |
| SW-S5-LOCK | A | 1) Set the app lock to the shortest time. 2) Open a system confirm. 3) Press Home; wait past the lock time; come back. 4) Unlock; tap OK if the dialog is still there. | Nothing is removed (an OK after the lock came up counts as Cancel). | | #46 r2 m-3 |
| SW-S5-NAME | W+A | 1) Give the TEST contact a 60-character nickname. 2) Chat info › Delete history › the system dialog. | The name in the dialog is cut short (48 characters). | | dialogName |
| **S-6 · delete-all asks to unlock** | | | | | |
| SW-S6-H | W+A | ⚠ A TEST account only (this deletes ALL history) — else N/A. 1) Settings › Delete all history › confirm. 2) The lock screen shows: go back without unlocking. 3) Repeat; unlock. | 2: nothing is deleted. 3: all history is deleted. | | P36 |
| SW-S6-D | W+A | 1) Settings › Delete all downloads › confirm. 2) Lock screen: go back. 3) Repeat; unlock. | 2: the downloads stay. 3: they are deleted. | | P36 · copy first (0) |
| **O-02 · the Windows mini app** | | | | | |
| SW-O02 | W | 1) Open the test app. 2) Press F12 and Ctrl+Shift+I. 3) Tap 5. 4) Tap 6. 5) Tap 7. 6) Tap 8. | 2: no DevTools. 3: no new window. 4: no download, no Save dialog. 5: "camera: NotAllowedError". 6: write the numbers in Note (C-12 is OPEN and parked: a number above 0 is the known open item). | | P37 |
| SW-O02-MAIN | W | 1) Open a chat; send a photo; open it. | The main app works as before (the marker is for the mini app only). | | |
| **Clean-up** | | | | | |
| SW-END | W+A | 1) Mini apps › Safety walk test › Uninstall. 2) Leave every Safety flag ON. 3) Restore the TEST contact / member. | 1: "The app was successfully removed." | | |

**Result line for DECISIONS:** `WALK #n (Session Safety, W + A): n P · n F · n N/A`.
