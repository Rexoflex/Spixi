# P30 · RESTORE KEEPS CONTACTS · A restore never destroys the contact list it replaces + Account closes the open chat (S20G P0 · F-1)

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (C#-named folders in the user folder; no path or name from a WebView; no wallet file is ever parked or kept) | no (wallet.ixi is never parked — an existing one is still a conflict, nothing touched) | no new WebView key; 4 new lang keys (native alerts), fixed log lines, 1 pref; dev surface: `ixian:devflash:s20g:<0\|1>` + push `setFlagsDevS20G` | built behind flag `SpixiFlags.S20G` (default ON) · ⚠ UNCOMPILED for MAUI until the S20G build | 4 min |

**Look here first:** `Spixi/Utils/RestoreMoves.cs:100` `apply(…, keepStash, …)` · `:193` `keepPrevious` · `:210` `S20GRules` (pure; csh `S20GRestoreTests`, 12 tests) and `Spixi/Pages/Launch/LaunchPage.xaml.cs:344` (the ask) · `:1104` (the stash choice) · `:1131` (StashBusy) · `:1156` (the keep).

**DECISIONS:** #1297 (S15: the restore is all or nothing) · #1312 · S20G (Damir 2026-10-14: 20 of 25 contacts lost on his PC)

## What changed and why
- **The loss (mechanism).** Damir renamed `wallet.ixi`, so Spixi opened on the welcome screen with his `Acc` tree (25 contacts) and `account.ixi` still on disk. A restore (S15 `RestoreMoves`) parked both in `tmp_restore_prev` and, on `Done`, deleted the stash ("gone for good"). Only the contacts in the backup came back; the `Chats\` message files of the other 20 survived without their contacts.
- **(1) Keep, never delete (flag ON).** `apply(…, keepStash: true, …)` parks as before (the parked entries now keep their own names: `Acc`, `account.ixi`, `avatar.jpg`) and deletes the stash only when it is EMPTY. After `Done` — the S15 all-or-nothing boundary is unchanged — `LaunchPage.keepPreviousContacts` renames a non-empty stash to `<user folder>/restore-previous/<yyyyMMdd-HHmmss>` (ONE fixed parent; local time; `-2` … `-99` on a collision). A stash a killed run (or a failed rename) left behind is kept FIRST, before `apply`; `apply` never deletes a non-empty stash it did not make (`StashBusy`, nothing touched). A rename failure logs the exception TYPE and leaves the stash folder in place.
- **(1b) A leftover never blocks a restore (#46 r1 A-1).** When that first keep fails (a held handle on Windows, an unreadable `Acc`), `S20GRules.chooseStash` hands `apply` a FRESH unique stash `restore-previous/stash-<yyyyMMdd-HHmmss>[-n]` instead; the leftover stays untouched, the fresh one is kept on Done like the usual one (renamed to `restore-previous/<stamp>`). So `StashBusy` cannot come back on the flag path; should it ever (99 fresh names taken in one second) the log says `an earlier restore stash is still in place - nothing was moved` and the user gets `intro-restore-stashbusy-text` ("… could not be moved aside. Nothing was changed. Restart Spixi, then try again.") — never "rolled back", never the free-space text.
- **(1c) The kept lists stay on this device (#46 r1 A-2).** The one parent `restore-previous/` is excluded from the Android cloud backup AND device transfer (`Platforms/Android/Resources/xml/backup_rules.xml`, `data_extraction_rules.xml` — the three lists stay identical) and flagged `NSUrl.IsExcludedFromBackupKey` on iOS / Mac Catalyst (`LaunchPage.excludeKeptFromBackup`, `#if IOS || MACCATALYST`, after every keep and after `apply`; the SLocalOnlyStore pattern). Windows has no device backup.
- **(2) Ask first (flag ON).** In `ixian:restore:`, after the W14 guard (no wallet is loaded) and before anything runs: when the user folder holds an `Acc` tree with ≥ 1 contact folder or an `account.ixi` (`S20GRules.needsReplaceConfirm`), a native two-button alert asks "Replace the contacts on this device?" (`intro-restore-replace-*`, Cancel = `global-dialog-cancel`). Cancel = nothing changes, the overlay is released, the staged file stays. Asked once per staged file. The call is fenced (A-1, gate 15) like every password-taking call, and `confirmReplaceThenRestore` (async void) is one try / catch with a type-only log (#46 r1 A-N1). **Not** while a wallet FILE is still on disk (#46 r1 A-3: a lockout → welcome; that restore is a WalletConflict and replaces nothing) — `needsReplaceConfirm(userFolder, Config.walletFile)`.
- **(3) Delete account leaves nothing.** `wipeEverything` deletes every folder in `restore-previous/` whose name is exactly one `keptFolderPath` / `freshStashPath` makes (`isKeptFolderName`, `isFreshStashName`), then the parent when it is empty. NOT behind the flag: a list kept while it was on must not outlive the account.
- **F-1 (the same flag).** `HomePage.onSettings` closes the open conversation(s) before it presents Account (the rail pane on desktop and the phone path — a chat's "Open Settings"), exactly as a Wallet / Apps tab switch does (#897). Before, the chat stayed in `getOverlayPages` under Account → `Utils.getChatPage` found it → `isChatScreenDisplayed` was true → no unread count / badge and a **read receipt for a message nobody saw** (`SingleChatPage.updateMessageReadStatus`). A close made for Account does not raise the rating prompt or the chats-list probe.
- Flag OFF = the S15 restore exactly (stash deleted on Done, no question) and the chat stays under Account.

## Files
- `Spixi/Utils/RestoreMoves.cs:100` `apply(…, keepStash, …)` · `:193` `keepPrevious` · `:210` `S20GRules` (`KeptParent`, `flagLine`, `closeChatOnAccount`, `needsReplaceConfirm`, `keptFolderPath`, `freshStashPath`, `chooseStash`, `isKeptFolderName`, `isFreshStashName`, `keptFolders`).
- `Spixi/Pages/Launch/LaunchPage.xaml.cs:344` the ask · `:662` `confirmReplaceThenRestore` · `:755` re-arm · `:853` `keepPreviousContacts` · `:874` `excludeKeptFromBackup` · `:1104` the stash choice · `:1131` StashBusy · `:1156` the keep after `Done`.
- `Spixi/Pages/Settings/SettingsPage.xaml.cs:1773` the wipe loop · `:1777` the empty parent.
- `Spixi/Platforms/Android/Resources/xml/backup_rules.xml`, `data_extraction_rules.xml`: `Documents/Spixi/restore-previous` excluded (3 lists).
- `Spixi/Pages/Dev/DevPage.xaml.cs:103` `ixian:devflash:s20g:` · `:333` `setFlagsDevS20G`; `src/shells/dev.html` the row.
- `Spixi/Pages/Home/HomePage.xaml.cs:2279` `closeChatOverlays(bool anyWidth = false)` · `:2934` the Account sweep · `:5576` no rating prompt for that close.
- `Spixi/Utils/SpixiFlags.cs:19` key `flagS20G` · `:45` the flag · `:76` the read (a stored 0 acts only in dev mode).
- `Spixi/Resources/Raw/lang/*.txt` (14): `intro-restore-replace-title` / `-text` / `-confirm`, `intro-restore-stashbusy-text` (English until the translators' pass).

## Bridge surface
| Verb / push / sink | Args (shape) | Who can send it | Handler | Ours / reshaped |
|---|---|---|---|---|
| `ixian:restore:<password>` | unchanged | launch.html → LaunchPage | the new question runs BEFORE `onRestore`, fenced | reshaped (a native alert first) |
| folder `restore-previous/<yyyyMMdd-HHmmss>[-n]` · `restore-previous/stash-<yyyyMMdd-HHmmss>[-n]` | C#-made names under one fixed parent in the user folder | C# only | `RestoreMoves.keepPrevious` / `S20GRules.chooseStash` / `wipeEverything` | ours |
| `ixian:devflash:s20g:<0\|1>` · push `setFlagsDevS20G("0"\|"1")` | one digit | dev.html → DevPage (dev mode only) | DevPage, the s20size rules | ours (dev surface) |
| log `[RESTORE] kept the previous contact list (<n> items)` · `[RESTORE] the previous contact list stays in the restore stash (<Type>)` · `[RESTORE] an earlier restore stash could not be kept; this restore parks into a fresh one` · `restoreAccountFile: an earlier restore stash is still in place - nothing was moved` · `[RESTORE] the replace question failed (<Type>)` · `[RESTORE] the replace path failed (<Type>)` · `[RESTORE] the user kept the contacts on this device` · `[RESTORE] the backup exclusion of the kept contact lists failed` / `threw (<Type>)` | fixed words + a count / a type name | C# | LaunchPage | ours |
| log `[FLAGS] s20g=<0\|1>` | fixed words | C#, once per start | `SpixiFlags.init` | ours |

## Threat → rule → proof
| A hostile page / file could try… | What stops it | Proof |
|---|---|---|
| name or place the kept folder | the name is C#'s (`keptFolderPath`: a fixed prefix + `DateTime.Now` digits); no WebView input reaches it | csh `damirs_case…`, `a_second_restore_in_the_same_second…` |
| make the wipe delete a user folder | only exact `<8 digits>-<6 digits>[-2..99]` / `stash-…` names inside `restore-previous/`, ASCII digits; the parent only when empty | csh `the_wipe_pattern_takes_exactly_the_kept_folders` |
| block every later restore with a leftover stash | a fresh unique stash (chooseStash); the leftover is never touched | csh `a1_a_leftover_that_cannot_be_kept_parks_the_restore_into_a_fresh_stash` |
| carry the kept list off the device in a cloud backup / device transfer | `restore-previous/` excluded (Android 3 lists, iOS / Mac flag) | pin `h-csharp.mjs` (backup, keep.appleExcluded) |
| keep a wallet / keys around | `wallet.ixi` is `neverClear` — never parked, an existing one is a conflict (unchanged) | csh S15 `an_existing_wallet_is_a_conflict…` |
| leak the address / a path into ixian.log | the lines are fixed words + a count or a type name | pin `pins-s20g/h-csharp.mjs` (keep / fixedLog) |
| a chat page sends read receipts while the user is in Account | F-1 closes it first | pin `h-csharp.mjs` (account), csh `f1_and_the_flag_line` |
| (worst case) | a kept copy of the previous contact list stays on the device until delete account | — |

## Recorded (#46 r1, not changed)
- **A-N2** desktop: the chat closes before the Account WebView has loaded, so the detail pane can show empty for a moment (cosmetic).
- **A-N3** `fromSettings = true` (and the chat close) come before a present that can be refused (another page staging): `fromSettings` then stays true until Account closes or Home re-appears, and a chat the user closes meanwhile skips the rating prompt and the chats-list probe. No security effect.
- **A-N4** other pages over a chat (contact details, wallet send, an app) still count it as displayed. **Legacy**: baseline 0e85a4b8 `Utils.getChatPage` walked the NavigationStack, so any page pushed over a chat left it "displayed"; the #225 overlay walk carried that. Only Account is fixed here (F-1).
- **A-N5** phones: the kept folder is app-private (Android `files/Documents/Spixi`, the iOS app container) — "a copy … is kept in the Spixi data folder" is true but not reachable without a computer / dev tools; and a wallet-only backup still gets the question and over-states "replaces" (it leaves the old `Acc` in place).

## Cost
One `Directory.Move` (same volume) after a restore that replaced something; one directory listing per restore tap while no wallet is loaded; one folder listing in the wipe. Nothing at runtime otherwise.

## Given up / left open
- The kept folder is not shown in the UI; getting the contacts back is a manual copy (Acc → the user folder) for now. A "Previous contacts" import is not built.
- A wallet-only backup (no `Acc` inside) still gets the question; it then leaves the old `Acc` in place (legacy bare-wallet path, unchanged) — the text over-states "replaces" for that case.
- The dev switch is built (#46 r1 A-4): Developer › Release flags › "Restore keeps contacts, Account closes the chat (S20G)", acts after a restart.

## Question for BE
None blocking. Do you want the kept folder deleted after N days, or offered as an import?
