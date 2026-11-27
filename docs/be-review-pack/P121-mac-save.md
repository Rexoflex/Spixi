# P121 · MAC: SAVE A BACKUP OR A PHOTO TO A FOLDER, OR ADD A PHOTO TO PHOTOS (batch macfixa, item 1)

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| LOW (a new file write path, but the OS writes it: the user picks the place in the system save panel; the source is C#'s own path; a copy) | the backup files (wallet, encrypted account backup) can now be saved to a folder — the same files the share menu already sends | none (no verb, no push, no cap) | `MacfixaFlags.MacSaveToFolder` (`flagMacSaveToFolder`, absent = ON; a stored 0 acts only in dev mode); OFF = the base share menu | 4 min |

**Look here first:** `Spixi/Platforms/MacCatalyst/SFileOperations.cs` `share()` (the switch), `saveChoice()` (the chooser),
`saveCopy()` (`new UIDocumentPickerViewController(new NSUrl[] { NSUrl.FromFilename(filepath) }, true)`), `addToPhotos()`,
`shareAndWait()`; the pure rules `Spixi/Utils/MacSaveRules.cs`. Mac Catalyst only: iPhone, Android and Windows files are unchanged.

## What and why
On the Mac, Backup "Back up now" and a photo's "Save" ended in `UIActivityViewController` (the base `share()`, now `shareMenu()`).
On Mac Catalyst that is the macOS share menu: it has no save-to-folder target ("Save to Files" is iOS only), and the text item
beside the file URL most likely hides the Photos extension (not proved). With the switch on, `share()` first shows a native alert:
**Save File** (the system save panel; the user picks the folder) · **Add to Photos** (only when the leaf of C#'s path is a photo
type, MacSaveRules; for a received file that leaf is the peer's name after `PhotoRules.SafeFileName`) · **Share File** (the old share menu; a photo goes as the file URL alone) · **Cancel**. The returned Task ends
when the whole choice is finished, so BackupPage's "Did you save the backup?" question opens after the panel or menu closes.

## The diff in short (app C#: +129 code lines = 109 in the Mac file + 20 in the rules file)
`share()` = `if (!MacfixaFlags.MacSaveToFolder) return shareMenu(...)` (the base body, moved unchanged) `; return
MainThread.InvokeOnMainThreadAsync(() => saveChoice(filepath, title));`. Each step awaits a `TaskCompletionSource` that every exit
sets (each button; the panel's pick / cancel; the Photos auth answer, its completion and the failure alert's OK; the share menu's
completion handler); one try/catch. Every presentation goes through `show()`: it presents, then polls every 300 ms and ends the
step with a fixed result after two polls in a row find the controller not presented — a presentation UIKit refused, or a share
menu that closed without its handler (reported for Mail and Messages on Catalyst) cannot hold the Task open, except the save panel's own step. The save panel is not
polled: it ends only by its delegate (held with the picker in a static field until then); a delegate that never runs keeps the step
open (no question, no line, no stamp). Photos:
`RequestAuthorization(PHAccessLevel.AddOnly)`, then `PerformChanges(() => PHAssetChangeRequest.FromImage(fileUrl))` — Spixi passes
the file URL and calls no decoder itself; where Photos reads the file (in Spixi's process or in its service) is not verified.

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| A new write path writes where an attacker wants | the app writes nothing itself: the OS save panel writes a copy only where the user chose, after the user's click | pin a3 (one picker, asCopy true, no File./Directory. call in the Mac file) |
| A WebView value picks the file or the name | `share(path, title)` is unchanged; every caller passes C#'s own path (BackupPage's own files, `SharedItems.localPathOf`, the log zip); the Mac file has no bridge name | pin a2, a6 (caller bodies hashed against the base; 5 call sites) |
| The source file moves away (the backup or a received photo vanishes) | `asCopy: true` | pin a3 |
| Photos access wider than needed | add-only access; no Photos read API | pin a4 |
| A peer's file is decoded in Spixi | Spixi calls no decoder; Photos.framework gets the file URL (where it reads the file is not verified); only for a photo type by name (jpg, jpeg, png, gif, heic, webp) | csh `MacSaveTests`; pin a4 |
| The peer steers the choice through its file name (a received photo's leaf is the peer's name after `SafeFileName`: ≤ 120 characters, no separator, control or bidi character) | it decides only (a) whether Add to Photos is offered and whether the share menu gets the URL alone, (b) the name of the file the save panel writes in the user's folder (shown in the panel). It cannot decide the path, a log line (none holds the name) or a non-image type (the caller's `isImageName` gate on the same name) | csh `MacSaveTests`; pin a4, a6, a7 |
| The backup question appears on top of the panel, or never | the Task ends only after the choice; a refused presentation, or a share menu closed without its handler (Mail, Messages), ends by the poll of `show()`; the save panel is not polled and ends only by its delegate (as MAUI's own file picker on the Mac; a refused panel or a missing delegate call keeps that step open — no question, fail closed); BackupPage's wait then finds no share menu | pin a5, a9; walk rows M-1, M-5 (the panel), M-3 (the share menu), M-4 |
| A log line leaks a path or a name | two lines: `[MACSAVE] failed (<Type>)` and `[MACSAVE] choice=<word> r=<word>` (fixed words; any other word → `other`) | csh `log_line_fixed_words`; pin a7 |
| The switch OFF changes anything | OFF runs the base body | pin a1 (SHA-256 of the base `share()` body) |

Strings: C#'s own (`Resources/Raw/lang`), the existing `global-share-choose`, `global-share-savefile`, `global-share-sharefile`,
`global-dialog-cancel`, `global-dialog-error`, `global-dialog-ok`; two new keys `global-share-addphotos`,
`global-share-addphotos-failed` (English fallback until they are in the tables; pin a7: all 14 tables or none).

Pins: `pins-macfixa/a-mac-save` (source pin, limits first) · csh `MacSaveTests`. ⚠ C# UNCOMPILED: `SFileOperations.cs` (Mac
Catalyst; no macOS job in CI) — the Mac build and walk prove the bindings and the panel. A sandboxed / hardened Store build would
also need the entitlements `com.apple.security.files.user-selected.read-write` and
`com.apple.security.personal-information.photos-library` (today the Mac build has no entitlements file). Stage 2 deletes
`shareMenu()` as the default path and the switch.
