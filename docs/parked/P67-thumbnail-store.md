# P67 · PO-3: THE 320 PX CHAT THUMBNAIL IS KEPT IN THE APP CACHE; A TRUE LRU OF 128 IN MEMORY (batch photo1a) — DERIVED FILES AT REST

> **PARKED (2026-11-18, session photo1a):** not in `work/photo1a`. The code is `docs/parked/photo1a-po3-po6.patch`; its state and the open review findings are in `docs/parked/photo1a-po3-po6.md`. This packet describes the parked code.

| Risk | Wallet / keys | Bridge change | Switch | Read |
|---|---|---|---|---|
| MEDIUM (new derived files at rest: a 320 px JPEG preview of a photo the device already holds) | no; the own primary address and the chat address are only HASHED into folder names | none: `setFileThumb(id, data URI)` as before | `SpixiFlags.PhotoThumbStore` (pref `flagPhotoThumbStore`); **Android only** (`ChatMediaStore.platformOn`) | 10 min |

**Look here first:** `Spixi/Utils/ChatMediaStoreRules.cs` (the engine: key, names, header, get / put / deletes / generations / sweep / bound / prune), `Spixi/Utils/ChatMediaStore.cs` (the glue: the root, the account, `platformOn`), SCP `chatThumbFor` and `enqueueThumb` (the generation read). Built by Claude Fable 5.2 (#1640 pattern); read by Fable 5.2 readers (#1606).

**DECISIONS:** #1641 · #1642 (images by URL later: the store is addressed by C#'s own id) · this batch #1717, #1721, #1722.

## What is written, where, when it is deleted, who can read it
| | |
|---|---|
| What | `<hash>.t1`: an 89-byte header (magic `SPM1`, kind, SHA-256 of the full key text `acct|chat|idHex|kind|sourceVersion|dim`, a 16-byte source tag, the payload length, the payload SHA-256) + the JPEG (≤ 64 KB, `FF D8 FF`) |
| Where | `FileSystem.CacheDirectory/spixi-media1/<acct16>/<chat16>/` — names are hex of SHA-256 over C#'s own values; the message id (sender-chosen bytes) is only ever hashed. The cache area: the OS may delete it; Android auto-backup never includes it. It lies inside the FileProvider root `cache-path .` (`provider_paths.xml:40-42`), but no caller can name a store file (a grant needs C# to call `GetUriForFile` with its own path: `SFileOperations.cs:65`, `:289`) |
| When made | on the first miss of a local photo (received + downloaded, or sent) when a chat shows it |
| Deleted | with the message (`SingleChatPage.deleteMessage`, `UIHelpers.deleteMessage`, the bot-room report and own delete), the file (`deleteSource`: Downloads page, Account › Downloads, chat info), the history (`SContacts.removeHistory`, `ContactDetails` `onRemoveHistory`), the contact (`removeContact`, `leaveGroup`, `ixian:undorequest`, the contact purge), every history / all downloads / the account wipe / the restore / a new account (`wipe()`), the photo-previews switch OFF (`wipeThumbs()`), and an ORPHAN SWEEP (once per process: other accounts' folders, chat folders not in the loaded friend list — this covers HomePage's request decline, Core's own removals, the pendingDeletion heals, the dev unseed, which this batch may not edit). A delete renames the folder to `del-<hex>` under the lock and deletes the tree on a pool thread |
| Bound | 4096 files and 64 MB per account folder; the prune removes the oldest first |
| Who reads it | only `chatThumbFor` of the chat page of THAT chat, for a message whose source file C# resolved itself (`SharedItems.localPathOf`) |

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| A foreign picture (another chat, another account, a sender who reuses a message id) | account, chat, id, kind, source version (path + size + write time) and edge are in the hashed key AND checked in the header | csh `ChatMediaStoreTests` (foreign account / chat under the right name, same id two files) |
| A stale picture (the photo changed) | the source version in the key; a file that changed during the decode is shown once and kept under nothing | csh `staleSource_*`; the scratch R2 checks of the builder |
| A torn or broken file | temp file + move; the payload hash; any mismatch = a miss and the file is deleted | csh `header_*`, `ioErrorMidRead_*` |
| A deleted chat's preview written back by a late decode | the delete GENERATION read when the job is made; the put (disk and memory) refuses a moved generation (review round 1, replaced a 60 s timer) | csh `ChatMediaStoreGenerationTests` (7), `glue_aDecodeThatEndsAfterADelete_keepsNothing_onDiskOrInMemory` · pin b10 |
| A delete outside the store | every delete target is built from hashes under the root; `wipe` refuses a root whose leaf is not `spixi-media1`; links and reparse points are never followed | csh `wipe_*`, `links_areNeverFollowed_*` · pin b5 |
| A log line with a path / name / id | the store logs nothing | pin b3 |
| Harness doors in the app | `harnessOn` etc. only under `#if SPIXI_CSH` (the harness csproj; `Spixi.csproj` never defines it) | the builder's scratch build without the define · pin b4 |

## NOT proven
⚠ C# UNCOMPILED (the glue's MAUI / Core references; Windows type-checks them in `redesign-ci`; Android in the operator block). iOS / Mac / Windows stay on the old path (`platformOn` false). Nothing ran on a device yet. The orphan sweep is not instant: a declined request's folder stays until the next process start + the first store call.
