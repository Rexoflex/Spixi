# F5 checklist — WALK-DAY BATCH F6 (DECISIONS #576–#583)

Offline twin of the artifact. Same 36 items, same order.

**Numbers at delivery:** bundle 293 · shells 18 · smoke BASELINE OK **3139** / the 3 KNOWN (#136 · M5 · B3) · cs-syntax 144+1 · locales CLEAN 772 · Ixian-Core `097341a`.

⚠ **C# changed in 11 files → wipe `obj`/`bin` before you build (#387).** Windows runs via TWO commands (build, then the exe) — `-t:Run` hits MSB3073/9009.

## Build and deploy

The generators ALREADY RAN in the delivery and the built artifacts are in the tarball,
hash-verified. Re-running them is optional — it is idempotent and only confirms the
numbers. `generate-chat-pattern` is NOT needed this batch: nothing pattern-related
changed.

```
node scripts/build-demo-bundle.mjs
node scripts/build-shells.mjs
node scripts/i18n-lint.mjs
node scripts/pseudo-locale-smoke.mjs
node scripts/verify-locales.mjs
node scripts/cs-syntax-check.mjs
node scripts/smoke-test.mjs
```

| Step | Expect |
|---|---|
| build-demo-bundle | **293 exports** (was 292 — `liftedRowAddress` is new) |
| build-shells | **18 shells** |
| i18n-lint | no hardcoded strings ✓ (1 dev-only exemption) |
| pseudo-locale-smoke | **9/9** |
| verify-locales | **ALL LOCALES CLEAN** (772 keys) |
| cs-syntax-check | **144 clean + 1** known grammar gap |
| smoke-test | **BASELINE OK — 3139 pass / the 3 KNOWN** (#136 · M5 · B3) |

★ **C# changed in 11 files, so the wipe is NOT optional this time (#387):**

```powershell
Remove-Item -Recurse -Force Spixi\obj, Spixiin -ErrorAction SilentlyContinue
```

### Windows — two commands, never one (`-t:Run` hits MSB3073/9009)

```powershell
dotnet build Spixi\Spixi.csproj -f net10.0-windows10.0.19041.0 -c Debug
Spixiin\Debug
et10.0-windows10.0.19041.0\win-x64\Spixi.exe
```

### Android — check the device is attached FIRST (#450)

```powershell
$adb = "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe"
& $adb devices
```

Then two commands, never one (#320):

```powershell
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release
dotnet build Spixi\Spixi.csproj -f net10.0-android -c Release -t:Run
```

⚠ `git --no-optional-locks status` always.

### Which items need which platform

**Windows only:** 01–05 (#576 picker), 20–21 (#581 tip sheet).
**Android only:** 06–08 (#577 headless ring), 30 (#583 phantom overlay).
**Both:** everything else. The two-device items are 06–08, 16–19, 30–32.

---

★ Three review rounds found **9 MAJORs**, two of them reproduced. Several items below test the FIX OF A FIX; each says what broke, because that is what is most likely to break again.

## #576 — The desktop restore picker

*Elevation confirmed: an administrator process cannot reach the WinUI picker broker. The fallback is the classic Win32 dialog, which has no broker.*

| # | Platform | Check | Do | Expect | Result |
|---|---|---|---|---|---|
| 01 | Win | The restore picker opens at all | Launch the exe from an elevated PowerShell. Welcome → Restore → choose a file. | A file dialog opens. It is the classic Windows dialog, not the modern one. | ☐ |
| 02 | Win | A normal shell still works | Launch from a NON-elevated PowerShell and pick a backup file. | A picker opens and restore proceeds. Either dialog is acceptable here. | ☐ |
| 03 | Win | Cancel stays silent | Open the restore picker and press Escape or Cancel. | Nothing happens. No error alert, no log error line. | ☐ |
| 04 | Win | The log records the elevation | After a fallback, open the dev log and find the SFilePicker lines. | One line reads **elevated=True**. That answers the branch question permanently. | ☐ |
| 05 | Win | The avatar picker still filters to media | Account → avatar → pick an image, from an elevated shell. | The dialog offers media files only. It must NOT offer every file. | ☐ |

## #577 — Headless incoming call on Android

*The process woke in the background with no Activity, and every site on the ring path threw. The phone never rang.*

| # | Platform | Check | Do | Expect | Result |
|---|---|---|---|---|---|
| 06 | Android | A headless call RINGS | Force-stop Spixi. From a second device, call. Do not touch the phone first. | The phone rings. This is the acceptance test for the whole row. | ☐ |
| 07 | Android | The notification reaches the tray | Same repro. Look at the notification shade, not just the screen. | An incoming-call notification is there. **This is the half never confirmed.** | ☐ |
| 08 | Android | Sound effects still work afterwards | After the headless call, open a chat and send a message. | The send effect plays. A poisoned asset cache would leave it silent for the whole session. | ☐ |

## #578 — A hidden request must not feed the unread badge

*Your own outgoing request was counting as one unread message against you. The dot is C#'s, so no FE change could have reached it.*

| # | Platform | Check | Do | Expect | Result |
|---|---|---|---|---|---|
| 09 | Both | A new outgoing request raises no dot | Send a contact request, then open a DIFFERENT chat and look at the back arrow. | No red dot. | ☐ |
| 10 | Both | An already-pending request heals | On an account that had a pending request BEFORE this build, open any chat. | The dot is gone. The heal runs on the first chats flush. | ☐ |
| 11 | Both | A real unread message still shows the dot | Have someone message you, then open a different chat. | The dot IS there. The heal must not have eaten a genuine unread. | ☐ |

## #579 — The pressed chat row lifts

*Round 2 reproduced two defects in the first cut: a row left permanently un-tappable, and a flush lifting the wrong row. Items 13 and 14 are those two.*

| # | Platform | Check | Do | Expect | Result |
|---|---|---|---|---|---|
| 12 | Mobile | The pressed row is clearly above the scrim | Long-press a chat row so the dropdown opens. | The row sits on its own opaque card, plainly above the dim. Not washed out. | ☐ |
| 13 | Mobile | Mark as read leaves the row tappable | Long-press a row → tap **Mark as read** → immediately tap that same row. | The chat opens. If it ignores the tap, the lift was stranded. | ☐ |
| 14 | Mobile | A flush does not drop the lift | Long-press a row and hold the menu open while a message arrives in ANY other chat. | The pressed row stays lifted. It must not sink back under the dim. | ☐ |
| 15 | Mobile | A pinned row keeps its own tint | Pin a chat, then long-press it. | It lifts AND keeps its pinned colour. | ☐ |

## #580 — A declined call is not a missed call

*The marker is written into the message so it survives a restart. Item 17 is the half the review found inert.*

| # | Platform | Check | Do | Expect | Result |
|---|---|---|---|---|---|
| 16 | Both | The bubble says Call declined | Have someone call you and DECLINE it. | The card reads **Call declined**, with the phone-x glyph and no call-back link. | ☐ |
| 17 | Both | The chats row agrees, after a restart | Same call. Look at the chats list, then restart the app and look again. | Both times it reads **Call declined**. **Not** Missed call. | ☐ |
| 18 | Both | A genuinely missed call still says so | Have someone call and let it ring out untouched. | Bubble and row both read **Missed call**. | ☐ |
| 19 | Both | An answered call shows its duration | Answer a call, talk briefly, hang up. Check the chats row. | The row shows the call with its duration, not Missed call. | ☐ |

## #581 — The tip sheet, and pills on a short bubble

*Your two candidates for the pill fix are not equivalent: the placement flip oscillates at 60 fps on exactly the bubbles it was for. Built as the width floor instead.*

| # | Platform | Check | Do | Expect | Result |
|---|---|---|---|---|---|
| 20 | Desktop | The tip sheet truncates the address | Tip a message from a contact with NO nickname. | The header shows a truncated address. No 65-character string, no sideways scrollbar. | ☐ |
| 21 | Desktop | …and the avatar is not a letter | Same sheet. Look at the disc beside the title. | A gradient disc or the person glyph. Not one letter taken off the address. | ☐ |
| 22 | Both | Heart plus Tipped clears a short bubble | Send a two-letter message. Have it liked AND tipped. | Both pills sit clear of the timestamp and the ticks. | ☐ |
| 23 | Both | The bubble does not jitter | Watch that same bubble for five seconds. Resize the window on desktop. | Completely still. Any flicker between two widths is the oscillation returning. | ☐ |
| 24 | Both | Removing the reaction restores the hug | Un-like that message. | The bubble shrinks back to its text. | ☐ |

## #582 — The address leaves the Account hero

*Your spec, and the dial you confirmed: the chip retires with the two entries. Nothing about the address is at rest on the hub now.*

| # | Platform | Check | Do | Expect | Result |
|---|---|---|---|---|---|
| 25 | Both | One untitled section, two rows | Open Account. | **Contacts** and **Spixi address** sit together in the first section, above Preferences. No address chip, no Show QR, no What is this address? | ☐ |
| 26 | Both | The row opens the sheet | Tap the Spixi address row. | The address sheet opens. On mobile it is near-full height, just below the top bar. | ☐ |
| 27 | Mobile | The dismiss button is reachable | With the sheet open, look at the top-right. | A close button, and it is NOT cut off. Tapping it closes the sheet. | ☐ |
| 28 | Both | The QR still scans | Scan it from a second device. | It scans on the first try, at a comfortable distance. | ☐ |
| 29 | Both | Share sits beside Copy | Look at the address chip on the sheet. | Two icon buttons side by side. No full-width Share bar underneath. | ☐ |
| 30 | Both | Both explainer lines share one edge | Look at the explainer block at the foot. | The safety line starts at the same left edge as the paragraph above it. | ☐ |

## #583 — The phantom call overlay, and the restore split

*The gate stops a queued call ringing as if it were fresh. Item 34 is the review's MAJOR-3: one wrong password used to make the right one fail forever.*

| # | Platform | Check | Do | Expect | Result |
|---|---|---|---|---|---|
| 31 | Android | A missed-call notification opens no live call | Let a call ring out with the app killed and the screen locked. Later, tap the missed-call notification. | The chat opens showing a MISSED call. No live call overlay, nothing to answer. | ☐ |
| 32 | Both | A live call still rings normally | Have someone call you right now, app running. | It rings. The staleness gate must never refuse a live call. | ☐ |
| 33 | Both | A muted contact stays quiet | Mute a contact. Have them call while the app is force-stopped. Cold boot. | No missed-call notification for that contact. | ☐ |
| 34 | Both | The restore capture appears | Restore an account, then restart the app. Open the dev log. | **[RESTOREDIAG] loadChats** lines with friends, accFiles, chats and requests counts. Send these. | ☐ |
| 35 | Both | A wrong password does not poison the retry | Restore an account backup. Type the password WRONG once. Then type it correctly, without re-picking the file. | The restore succeeds. Before this fix, the correct password failed forever. | ☐ |
| 36 | Both | A bare wallet file still restores | Restore using a plain wallet file rather than an account backup. | It restores as before. The outcome split must not have broken this path. | ☐ |

## Still owed from Damir

- **#565 ②** — the `[RESTOREDIAG]` lines from a restart where the chat list is empty (items 33–34 produce them). Send the log and the three-restart delay gets a mechanism.
- **#573** — did the notification reach the tray in the headless repro (item 07)? The ring is fixed; the tray was never confirmed.
- **#503** — the `(service-extension)` notiflog line, unchanged from last round.
- **W-3.1** — the screenshot. No mechanism, no fix (#294).
