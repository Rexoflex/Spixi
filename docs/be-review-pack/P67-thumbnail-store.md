# P67 · PO-3: THE 320 PX CHAT THUMBNAIL IS KEPT IN THE APP CACHE; A TRUE LRU OF 128 IN MEMORY (batch photo1a) — DERIVED FILES AT REST

> **IN THE BRANCH (2026-11-18, #1728).** Parked at review round 2 by the Fable 5.2 limit (#1719), then resumed in the same session (Damir's #1726; the main chat's #1737): fix rounds 2 and 3 by a Claude Fable 5.2 builder, store round 7 by a fresh Fable 5.2 reader = **CLEAN (0 MAJOR)**. The packet was moved back from `docs/parked/`.

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| MEDIUM (new derived files at rest: a 320 px JPEG preview of a photo the device already holds) | no; the own primary address and the chat address are only HASHED into folder names | none: `setFileThumb(id, data URI)` as before | `SpixiFlags.PhotoThumbStore` (pref `flagPhotoThumbStore`, absent = ON; a stored 0 acts only in dev mode); **Android only** (`ChatMediaStore.platformOn`, `ChatMediaStore.cs:45`) | 10 min |

**Look here first:** `Spixi/Utils/ChatMediaStoreRules.cs` (the engine: key, names, header, get / put / deletes / generations / sweep / bound / prune; `entriesOf` `:1277` is the ONLY place a folder is listed), `Spixi/Utils/ChatMediaStore.cs` (the glue: the root, the account, `platformOn`, `generationOf` `:196`, `ifCurrentThumb` `:212`), SCP `chatThumbFor` and `enqueueThumb` (the generation read; `storeGen0` at the top of `loadMessages`). Built and fixed by Claude Fable 5.2 (#1640 pattern); read by Fable 5.2 readers (#1606).

**DECISIONS:** #1641 · #1642 (images by URL later: the store is addressed by C#'s own id) · this batch #1717, #1719, #1720, #1721, #1722, #1726, #1728.

## What is written, where, when it is deleted, who can read it
| | |
|---|---|
| What | `<hash>.t1`: an 89-byte header (magic `SPM1`, kind, SHA-256 of the full key text `acct\|chat\|idHex\|kind\|sourceVersion\|dim`, a 16-byte source tag, the payload length, the payload SHA-256) + the JPEG (≤ 64 KB, `FF D8 FF`) |
| Where | `FileSystem.CacheDirectory/spixi-media1/<acct16>/<chat16>/` — names are hex of SHA-256 over C#'s own values; the message id (sender-chosen bytes) is only ever hashed. The cache area: the OS may delete it; Android auto-backup never includes it. It lies inside the FileProvider root `cache-path .` (`provider_paths.xml:40-42`) that exists at the base, but no caller can name a store file (a grant needs C# to call `GetUriForFile` with its own path: `SFileOperations.cs:65`, `:289`) |
| When made | on the first miss of a local photo (received + downloaded, or sent) when a chat shows it |
| Deleted | with the message (`SingleChatPage.deleteMessage` `:7034`, `UIHelpers.deleteMessage` `:709`, the bot-room report `:4978` and own delete `:5024`), the file (`deleteSource`: Downloads page `:191`, Account › Downloads `SettingsPage.xaml.cs:857`, chat info `ContactDetails.xaml.cs:796`), the history (`SContacts.removeHistory` `:632`, `ContactDetails` `:1298`, `SingleChatPage` `:1078`), the contact (`removeContact` `:178`, `leaveGroup` `:121`, the contact purge `:613`), every history / all downloads / the account wipe (`SettingsPage` `:1858`, `:1903`, `:1984`, `:2179`) / the restore (`LaunchPage` `:1159`, `:1238`) / a new account (`LaunchPage` `:590`) (`wipe()`), the photo-previews switch OFF (`wipeThumbs()`, `SettingsPage:1121`), and an ORPHAN SWEEP (other accounts' folders, chat folders not in the loaded friend list, a leftover `del-…`; re-armed when the friend count drops or the `chatMark` changes — see below). A delete renames the folder to `del-<hex>` under the lock and deletes the tree on a pool thread, after the try |
| Bound | 4096 files and 64 MB per account folder (`ChatMediaStoreRules.cs:257`, `:259`); the prune removes the oldest first |
| Who reads it | only `chatThumbFor` of the chat page of THAT chat, for a message whose source file C# resolved itself (`SharedItems.localPathOf`) |

## Fix rounds 2 and 3 (what changed since the parked text)
| Fix | What it does |
|---|---|
| G1 links | no IO through a link at the root, the account folder, the chat folder or a file (get, put, discard, deleteMessage, deleteChat, sweep, prune, count); a link is removed as a link |
| M-1 `entriesOf` (round 3, MAJOR) | `entriesOf(DirectoryInfo, out bool whole)` lists ONE folder whole and on its own; a folder that left = no entries (never the end of the walk); the only enumeration site; a fresh link look before each open. Used by `listFiles`, `scanSource`, `wipeKind`, `prune`, `countAndSweep`, `wipe`, `sweepOrphans`, `deleteTree`. Before: a source scan that ended at a folder that left kept a deleted file's previews at rest |
| G2 lock-free generation | the generation is read without the write lock (`ConcurrentDictionary` + a `Volatile` account floor): the main thread never waits for disk work |
| `storeGen0` (F-2) | read once at the top of `loadMessages`, before `friend.getMessages`, and passed to the batch's jobs: a delete between the row read and the enqueue is seen |
| G3 / m-2 re-arm | the sweep re-arms when the friend count drops; `chatMark` = the count + an order-free sum over the addresses (any change re-arms); `chatsSeenOf` / `provenEmpty`: an EMPTY list sweeps only when this process read the list with at least one contact for this account |
| G6 dead names | `ifCurrentThumb` / `ifCurrentPeaks` refuse the memory entry of a message that was deleted (a dead name) |
| G7 | the sweep removes a leftover `del-…` |
| n-3 | the tree deletes of renamed folders run after the try, whatever ended the sweep or wipe early |
| NIT-2 | OFF + `!P1Perf.enabled` = exactly the base call |

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| A foreign picture (another chat, another account, a sender who reuses a message id) | account, chat, id, kind, source version (path + size + write time) and edge are in the hashed key AND checked in the header | csh `ChatMediaStoreTests` (foreign account / chat under the right name, same id two files) |
| A stale picture (the photo changed) | the source version in the key; a file that changed during the decode is shown once and kept under nothing | csh `staleSource_*` |
| A torn or broken file | temp file + move; the payload hash; any mismatch = a miss and the file is deleted | csh `header_*`, `ioErrorMidRead_*` |
| A deleted chat's preview written back by a late decode | the delete GENERATION read when the job is made (`storeGen0`); the put (disk and memory) refuses a moved generation | csh `ChatMediaStoreGenerationTests`; 900 real-thread stress runs at store round 7: 0 previews of a deleted file at rest · pin b14 |
| A delete outside the store, or through a planted link | every delete target is built from hashes under the root; `wipe` refuses a root whose leaf is not `spixi-media1`; links and reparse points are never followed or entered at any level | csh `wipe_*`, `links_areNeverFollowed_*` (a real image behind a folder link is never served; a root link: the source scan deletes nothing through it; a file link under an entry's name) · pin b5, b12 `noIoThroughLinks` |
| A log line with a path / name / id | the store logs nothing | pin b3 |
| Harness doors in the app | `harnessOn` etc. only under `#if SPIXI_CSH` (the harness csproj; `Spixi.csproj` never defines it) | pin b4 |
| The switch OFF still probes the store | OFF = exactly the base call | pin b15 `offNoProbe` · b13 `lruOnlyIfCurrent` · b16 `readKeys` |

## Recorded limits (MINOR, cache only, never a wrong picture; store round 7 CLEAN)
| Id | Limit |
|---|---|
| m-1 | no crash recovery of `deleteSourceSoon` / `wipeKind`: a process death between the call and the off-thread delete leaves that source's previews until a delete names them, the prune, or the OS clears the cache. Direction: a C#-named marker in the root replayed by the next sweep (about 100 engine lines) — not built |
| m-A | an N → 0 sweep happens only if a store call follows in the same process; the next process cannot prove an empty list → previews of files still on the device (and coarse waveforms of the last contact's chat) can stay while the list stays empty |
| m-B | a chat that left by an un-hooked path with NO folder yet gets no generation bump: a running decode can write its preview after the sweep |
| m-C / m-D / m-E | the app arms of `chatMark` / `chatsNow` are not compiled by the harness and held by no pin · pin b4 `seamRe` does not name `harnessListed` / `harnessHoldLock` · no test for the task-level proof of `provenEmpty` |
| m-F | `whole = false` is ignored by the deleters (no retry) |
| heals | the pendingDeletion heals (`SpixiContentPage.cs:7699`, `ContactNewPage.xaml.cs:226`: remove + re-add of the same address) can leave the folder until the next sweep; nothing sets pendingDeletion today |
| r6 MINOR | disk work under the store's `writeLock` is reachable from the main thread (a prune of about 1024 files can block a main-thread delete); every message delete moves the chat generation and clears the memory LRUs (churn) |

## NOT proven
⚠ C# UNCOMPILED (the glue's MAUI / Core references; Windows type-checks them in `redesign-ci`; Android in the operator block). iOS / Mac / Windows stay on the old path (`platformOn` false). Nothing ran on a device yet: the cold-open and memory numbers are owed to the operator block (#1737). CSH `pass=766 fail=0` (the engine runs on a temp folder in the harness).
