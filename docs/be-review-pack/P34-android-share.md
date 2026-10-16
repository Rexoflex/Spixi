# P34 · ANDROID SHARE · The FileProvider publishes Downloads, Sent and the cache only; Share grants a staged copy (Session Safety S-4)

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| MEDIUM (defence in depth: the provider accepted a grant for ANY file in five whole trees, `wallet.ixi` included; the peer-file-name amplifier H-10 named is already closed, #1250) | yes — the wallet backup Share used to grant `files/Documents/Spixi/wallet.ixi` itself; now it grants a COPY in `cache/share/<guid>/wallet.ixi` | no verb, push, `spixi.*` key, pref or WebView setting; an Android resource (provider roots) + C# staging; fixed log lines | built · **NO runtime flag** (an XML resource the provider reads at first use; the fallback is a revert of `provider_paths.xml`; the staging code in `SFileOperations` runs always) · ⚠ UNCOMPILED for MAUI until the Safety build | 4 min |

**Look here first:** `Spixi/Platforms/Android/Resources/xml/provider_paths.xml:24-43` (the six roots) and `Spixi/Platforms/Android/SFileOperations.cs:171` `stageForShare` (called at `:56`, before the own-intent stamp `:58`).

**DECISIONS:** #1312 · #1313 · #1465 (the dials) · **#1467 (this change)** · #1470 (#46, S-7) (Session Safety; Safety Dials q3 = A, Damir 2026-10-16: Downloads + Sent + cache/share, KEEP the cache root). Mechanism at `562366e4`: `docs/safety-mechanisms.md` row S-4 (with its Documents-path correction).

## What changed and why
- **The roots.** At the fork point the provider published `.` of all five trees (`files-path`, `cache-path`, `external-path`, `external-files-path`, `external-cache-path`), so `FileProvider.GetUriForFile` accepted any app file. Now (`provider_paths.xml:24-43`):

| name | root | holds |
|---|---|---|
| `downloads` | `files-path Documents/Spixi/Downloads/` | received files (`TransferManager.downloadsPath`, `Data/TransferManager.cs:355`) |
| `sent` | `files-path Documents/Spixi/Sent/` | my sent copies (`PhotoRules.SentFolderName`, `Utils/PhotoRules.cs:63`) |
| `downloads_files` · `sent_files` | `files-path Spixi/Downloads/` · `Spixi/Sent/` | the same two folders on a runtime where `Personal` = `getFilesDir()` itself; a root whose folder does not exist grants nothing |
| `share` | `cache-path share/` | what Share grants (a staged copy) |
| `cache` | `cache-path .` | kept (q3 = A): MAUI FilePicker copies and old sent rows live in the cache root |

  No `external-*` root and no `files-path "."` any more.
- **★ #46 r1 R3 M-1 (MAJOR, fixed): the Documents path.** On .NET 10 Android `Environment.SpecialFolder.Personal` = `getFilesDir()/Documents` (S14 #1281; the device log printed `files/Documents/Spixi/MsgQueue/`, `backup_rules.xml:5-7`), so `Config.spixiUserFolder` (`Meta/Config.cs:22`) = `files/Documents/Spixi`. The first cut's roots `Spixi/Downloads/` + `Spixi/Sent/` named folders that do not exist → no received or sent file would open. The roots now carry the SAME `Documents/Spixi/` prefix as every backup rule; pin `b-share.mjs` (prov, model) holds the two equal and models the root match at the runtime paths.
- **Share stages a copy.** `shareFile` (`SFileOperations.cs:47`) calls `stageForShare` (`:171`): prune `share/` (`:186`), make `share/<guid>/` (`:187`), copy the source's leaf there (`SafetyRules.shareStagePath` → `safeBaseName` of the C# source name, so the receiver still sees `wallet.ixi`, `spixi.account.backup.ixi`, `spixi.log.zip`), grant THAT file. A source already inside `share/` is shared as it is (`:182`). On the calling thread: the wallet is a few KB; the log zip and the account backup are built on the same thread just before.
- **Stage BEFORE the stamp.** `stageForShare` runs before `App.noteOwnIntentRoundTrip()` (`:56` → `:58`): a copy that fails starts no round-trip. #46 r1 R3 n-1: `GetUriForFile` and the intent build sit INSIDE the try whose catch clears the stamp (`:59-76`).
- **A failure is a failure.** `stageForShare` logs the type and throws a fixed-word `IOException("Share: the file could not be staged")` (`:89`, `:194-198`) — the same exit as a `StartActivity` failure, so `BackupPage` never stamps a backup that was not shared (`BackupPage.xaml.cs:338-339`, `:417-418`: await the share, then `recordBackupIfSaved`, inside the try; R3 m-4, pinned).
- **★ #46 r1 R3 m-1: per-share folders + a 60-min prune.** r0 emptied `share/` before each share — that could delete a copy a receiver (Drive, Gmail) had not read yet. Now each share gets its own `share/<guid>/`, and `pruneShareFolder` (`:115`) removes only entries of `share/` older than 60 minutes (`ShareKeepMinutes`, `:90`) — on each share BEFORE the new folder is made, and once per process at start (`sweepShareFolder` `:203`, called from `MainActivity.OnCreate`, `MainActivity.cs:438`, after `base.OnCreate`). Each delete in its own try; never throws; `isInside(share/, d)` before a folder delete (`:138`).
- **`open()`** (`:269`) is unchanged except the log: the exception TYPE only (`:306`; it printed `e`, which held the path). A path outside the roots lands there as `IllegalArgumentException`: nothing opens. `open()` never stages (pinned).
- **`saveFile`** (`:227`, `ACTION_CREATE_DOCUMENT` + the MainActivity copy) does not use the provider — unchanged.

## Files
- `Spixi/Platforms/Android/Resources/xml/provider_paths.xml:2-23` the why · `:24-43` the roots.
- `Spixi/Platforms/Android/SFileOperations.cs:47` `shareFile` · `:89` the fixed message · `:90` 60 min · `:94` `shareDir` · `:108` `shareEntryExpired` · `:115` `pruneShareFolder` · `:171` `stageForShare` · `:203` `sweepShareFolder` · `:269` `open` · `:306` type-only.
- `Spixi/Platforms/Android/MainActivity.cs:436-438` the start sweep.
- `Spixi/Utils/SafetyRules.cs:141` `ShareFolderName` · `:146` `shareStagePath`.
- Callers (unchanged): Share — `BackupPage.xaml.cs:338` (wallet), `:417` (account backup), `HomePage.xaml.cs:1689` (log zip); open — `SingleChatPage.xaml.cs:616`, `:620`, `:629`, `ContactDetails.xaml.cs:689`, `DownloadsPage.xaml.cs:171`, `SettingsPage.xaml.cs:802`.
- Pin `scripts/pins-safety/b-share.mjs` (6 checks: prov · model · share · st · sw · lg); csh `SafetyRulesTests.share_stage_path`.

## Bridge surface
| Verb / push / sink | Args (shape) | Who can send it | Handler | Ours / reshaped |
|---|---|---|---|---|
| FileProvider authority `${applicationId}.provider` (`AndroidManifest.xml:9-17`) | its roots | any app that receives a grant (chooser target) | `provider_paths.xml` | reshaped: six named roots instead of five whole trees |
| folder `cache/share/<guid>/<leaf>` | C# names (a GUID + the safe base name of a C# path) | C# only | `stageForShare` / `pruneShareFolder` / `sweepShareFolder` | ours |
| log `Share: staging failed (<Type>)` · `Share folder: could not be listed (<Type>)` · `Share folder: a folder could not be deleted (<Type>)` · `Share folder: a file could not be deleted (<Type>)` · `Share folder: the start sweep failed (<Type>)` · `Exception occured while trying to open file (<Type>)` (reshaped) · thrown message `Share: the file could not be staged` | fixed words + a type name | C# | `SFileOperations.cs` | ours |
No WebView reaches any of it: every path handed to `shareFile` / `open` is built by C#.

## Threat → rule → proof
| An app on the device / a bad path could try… | What stops it | Proof |
|---|---|---|
| use a grant for `wallet.ixi`, `Acc/`, the chat store | no root covers `files/Documents/Spixi` itself; only Downloads, Sent, the cache | pin `b-share` (prov: exactly six roots, no `external-*`, no `files-path "."`) |
| the roots miss the real folders (nothing opens) | the `Documents/Spixi/` prefix, equal to the backup rules | pin `b-share` (model: the runtime layout; cross-check with `backup_rules.xml` and the S14 pin) |
| keep reading the wallet backup after the share | the grant is on a copy in `share/<guid>/`, pruned after 60 min | pin `b-share` (st, sw) |
| a staging failure reported as "backup saved" | a fixed-word throw; BackupPage awaits, then stamps | pin `b-share` (share) |
| a path in ixian.log | type-only lines | pin `b-share` (lg) |
| (worst case) | a staged copy of the wallet backup stays in the app cache for up to an hour (app-private) | — |

## Recorded, not fixed (#46 r1)
- **R3 m-2** Android ≤ 9: an OLD sent row whose stored path is on external storage (the picker handed a physical `/storage/...` path) no longer opens — no `external-*` root. Accepted; walk row.
- Staged copies live in the app cache until pruned (60 min, or the next start / share after that); the OS may also clear the cache.
- **MAUI Essentials ships a second FileProvider under its own authority** (Essentials' `Share.RequestAsync(ShareFileRequest)`, used by the Developer › Send log path, `DevPage.xaml.cs:460`). Its roots are the package's, not `provider_paths.xml`; S-4 does not narrow it.
- A custom `spixiUserFolder` (`Config.cs:234` `dataFolderPath`, `:246` `spixiUserFolder`) moves Downloads and Sent outside these fixed roots: open then fails closed (nothing opens).

## Cost
One file copy per Share (KB for the wallet; the log zip / account backup are already being built); one listing of `share/` per Share and one at start.

## Given up / left open
- No runtime flag (a resource). Rollback = revert `provider_paths.xml` (the staging code works with either set of roots).

## Question for BE
Do you want the cache root (`cache-path .`) dropped once the MAUI picker copies are moved into a named cache folder (yes / no)?
