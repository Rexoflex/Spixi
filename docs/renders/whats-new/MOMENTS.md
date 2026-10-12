# Moment sheets — proposal (Damir 17:12, round 2 17:36)

A moment sheet teaches one fact at the moment it matters. A user action starts it. It is a second member of the glass family, next to the hint cards (#1262): the hint cards are quiet tips at random times on the Chats screen; a moment sheet comes from something the user just did.

Round 2 (Damir 17:36): DROPPED "Request sent" (before acceptance we usually know only the address, not a name) and "Disappearing messages" (Spixi has no disappearing messages today). 1: two pills with no tail, "Hello" and the greeting in the new language. 2: no Wi-Fi in the art — a photo stack and a download ring. 3: a device-to-device drawing. 4: the art says what a Spixi backup is (one file with a key). 6: every mini app, on its first open.

## The rules (one set for all seven)

- Anatomy = today's sheet (`c-sheet` + the `c-backup-nudge` stack): the art in its own panel (the What's new panel grammar: vivid blue → violet, glass objects, one entrance, then hold), a title, 1 or 2 lines, then 1 to 3 buttons (fill · tonal · text).
- Each sheet shows ONE time only (6: once per app). The "seen" flags stay on the device (the same store as the hint counters).
- A sheet never stops the action that the user started. The sheet comes after the result is on screen, or it is the confirmation step itself (5, 6, 7).
- At most 1 moment sheet in each session, and never in the same session as a hint card, the update card, the backup card or the rating sheet. A sheet that cannot show now waits for its next trigger.
- The switch "Tips on the Chats screen" does not turn these off: each one shows once and only after the user does something. Exception: 2 (an offer) also stops when that switch is off.
- 4 (backup) is safety: it shows even when another card showed in the same session.
- Reduced motion = static art. Every string goes into every language file; the art carries no text except 1.
- Back, the scrim tap and a swipe down close a sheet = the quiet choice ("Not now" / "Cancel"), and it counts as seen.

## The seven

| # | Moment | Trigger | Buttons | Value |
|---|---|---|---|---|
| 1 | AI translation | the new language is applied (not English), once per language | I understand | Damir's idea · honesty |
| 2 | Auto-download photos | the first manual photo download finishes, setting = Off, "Load pictures and GIFs" on | Open Settings · Not now (★ built S17, #46 security r1: the chat never writes the setting — it opens Settings › Privacy, `ixian:openPrivacy`) | Damir's idea · comfort |
| 3 | File from an offline sender | the first download that waits because the sender's app is offline | OK | high · prevents "it is broken" |
| 4 | First IXI received, no backup | the first incoming payment while no backup was ever made (★ built S17: "dirty" is not tracked in C#, #1343) | Back up now · Later | highest · prevents loss |
| 5 | Microphone | the first tap on the mic, before the system permission dialog (Android, iOS, macOS; Windows only if it shows a dialog) | Continue · Not now | medium · fewer refused permissions |
| 6 | Mini app, first open | the first open of each mini app, from an invite or from Apps | Open · Cancel | medium · trust |
| 7 | First payment | the first Pay / Send, before the review step | Continue | high · "cannot be undone" + where the fee goes |

## Checked in the tree (17:20)

- 2: the setting is real: `photoAutoDl` = off (default) · wifi · always, photos ≤ 10 MB, only while "Load pictures and GIFs" is on (`S11ChatRules.shouldAutoDownload`, `settings-screens.js` createPrivacy). ~~The verb is `ixian:photoAutoDl:<value>:<load pictures 0|1>` — no new verb.~~ ★ Built S17 (#46 security r1, Damir 22:2x): the sheet's button OPENS Settings › Privacy (`ixian:openPrivacy`, one-shot); the chat never writes the setting.
- 3: the sender's app serves the file (`TransferManager.receiveAcceptFile` → `sendFileData`; the receiver's `onUpdate` re-asks with `requestFileData`), so the sender's app must be online, and the download continues by itself. The copy says "device", never "no server" (push relay rule, design queue).
- 1: `languageAiNote` already exists in every language (de, fr, ru checked); new keys = the title, "I understand" and one greeting word per language. The "Report a translation problem" link stays in the language sheet.
- 4, 7: reuse `backupNudgeCta`, `paymentsCannotUndo`, `feeExplain` wording. 7 changes nothing in the C# confirmation (the risky part stays native).
- 5: the system asks for the microphone once on Android, iOS and macOS; after a refusal the user must go to the system settings (`micDenied`). Windows: an unpackaged desktop app gets no dialog (a packaged MSIX app does) — check how Spixi for Windows is built; no dialog = no sheet.
- 6: the capability rows reuse `cap_*` / `capx_*`; an app with no capabilities shows the trust line only. The invite line shows only for an app from an invite.

## New strings (en-us; all locales need them)

`momentAiTitle` "Translated with AI" · `momentUnderstand` "I understand" · `momentHello` "Hello" (the greeting in each language) · `momentAutoDlTitle` "Download photos automatically?" · `momentAutoDlBody` · `momentOfflineTitle` "Waiting for {name}" · `momentOfflineBody` · `momentFirstIxiTitle` "You received your first IXI" · `momentFirstIxiBody` · `momentMicTitle` "Send voice messages" · `momentMicBody` · `momentAppTitle` "Before you open {app}" · `momentAppInvited` · `momentAppBody` · `momentPayTitle` "Before you pay" · `momentPayBody` · `continue` · `later`.

## Open questions

- 2: "Load pictures and GIFs" tells the sender's host that you opened the chat (`loadMediaSub`). The sheet shows only while it is already on, so it changes nothing there.
