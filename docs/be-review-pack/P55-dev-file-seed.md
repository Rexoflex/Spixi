# P55 · DEV FILE SEED · The dev seed also makes a documents chat, a voice chat and one chat of 100 messages with 96 photos, so the adb walk can measure chats with files (Session "File chats and walk steps 3")

| Risk | Wallet / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| LOW (dev builds only; the whole code is inside `#if SPIXI_DEV_COEXIST`; it writes and deletes files, so the names and the proofs matter) | no | no new verb, push, intent extra or `spixi.*` / preference key (the existing `ixian:devseed` · `ixian:devseed:heavy` · `ixian:devunseed` carry it); new C# file writes (≈ 120 files, ≈ 85 MB, each through a temp leaf and a move) and deletes; file reads for the content proof; 4 new `[DEVSEED]` log lines (type names only) | **no switch** (compile-time: dev builds only, as P42) · ⚠ C# UNCOMPILED (`SDevSeed.cs` calls Core + MAUI) · the pure half compiles and runs in csh | 4 min |

**Look here first:** `Spixi/Utils/SDevSeed.cs:64` (`#if SPIXI_DEV_COEXIST`) … `:781` (`#endif`); `seedFileChats` `:468` (the top-up rule `SDevSeedPlan.topUpAction`); `ensureFileChatFile` `:592` (the move and the proof after it); `unseedFileChats` `:633`. The pure half: `Spixi/Utils/SDevSeedPlan.cs` § 3 (`FileChatFirst` `:357` … `mayDeleteFileTmp` `:748`).

**DECISIONS:** #1312 · #1567 (the image seed, P42: the same disk rules) · this batch's rows #1665 (the seed) and #1668 (the security lens). No switch: as P42 — a dev harness that a store build does not contain; O-35 (`Spixi/Spixi.csproj`) refuses the symbol in a store build.

## What changed and why
- **Why.** Damir's rulings #1601 / #1607 (2026-11-16): the seed gets "Documents, Many photos, Voice messages", so the adb walk can open and scroll such chats. Video is not in the scope: the app shows a video file as a file card with no preview (contract § 6).
- **What it makes.** Seed index 53 "Seed 54 Tjaša Kranjc" (documents: 20 file rows — pdf, docx, xlsx, pptx, txt, csv, zip, odt, epub, mp3 once received, once sent — 2 KB … 5.9 MB, 24.5 MB together, + 11 texts), 54 "Seed 55 Rok Mlinar" (16 inline voice rows of 1–30 s, 4 voice files, 10 texts), 55 "Seed 56 Maja Debeljak" (exactly 100 messages: 96 photos, 48 received and 48 sent, + 4 texts). FIXED times: the newest message of 53 / 54 / 55 = `ImageAnchor` − 3 / 4 / 5 h, so every row is older than every Seed 01–50 message and below the image chats.
- **The rows are the app's own shapes.** Received file: `"<uid>:<name>:<size>"`, `transferId`, `fileSize` = the length on disk, `completed = true` BEFORE `filePath` (the order of `TransferManager.completeFileTransfer`; a sent row with a path and `completed == false` is re-armed as a transfer), the file in the downloads folder. Sent file: `"<uid>:<name>"`, `completed` before an absolute existing `filePath` (documents and photos: `Sent/<32 hex>.<ext>` by `PhotoRules.sentFileName`; voice files: `Voice/voice-<date>-<time>.ogg`, as `SingleChatPage.sendVoiceFile`). Inline voice: the standard text `VoiceCodec.humanLine(durMs) + "\n" + VoiceCodec.encodeInline(packets)`, every packet the CELT frame `F8 FF FE` (accepted by `VoiceCodec.isOne20msFrame`); a voice file = `VoiceCodec.muxOgg` (≤ 6 KB). The chat page finds the files through `SharedItems.localPathOf` and makes its own thumbnails and waveforms: nothing new on that path.
- **Who names the files.** C# only, from the seed index and j: received leaves `devseed-NN-JJJ.<ext>` and `voice-20260101-HHmmss.ogg` (the voice rule needs that shape; the time is the plan's fixed time), sent leaves `<32 hex of SHA-256>.<ext>`, the temp leaf `pending-<16 hex>-0.src` (the app's pending-name shape, its own salt `filetmp:`, in the app's own `Sent` folder for every direction). Roots: `Config.spixiUserFolder` + `Sent` / `Voice`, and `TransferManager.downloadsPath`; all three must be rooted, and `SDevSeedPlan.leafShapeOk` plus the app's own name rules fail closed before any write and before any delete.
- **A re-seed is a top-up, decided by CONTENT.** As P42: keep only when the length AND the SHA-256 equal our deterministic bytes; a foreign file is never overwritten, adopted or deleted. New (#46 r1 S-S-1): `File.Move` on Unix is a stat + `rename(2)`, not an atomic no-replace, so the content proof runs again AFTER the move and the row is written only when the file is ours. New (#46 r1 C-S-1, r2 B2-5): a present chat with rows is never topped up — after a chat open, Core holds only the ~51-row load window, so its duplicate check would let the 100-message chat in twice; with its newest plan id it is skipped, without it the status says "partial: Remove the seed, then Seed" (#1571).
- **Unseed.** The ONE removal loop of `unseed()` now walks 56 indexes (`:736`; one `FriendList.removeFriend` site, as the count pin of S15 O-06 expects); then `unseedFileChats` clears the per-contact stores of each removed file chat (`SPeerLocalStores.forget`: `SAppJoins`, `SVoicePlayed`, `SPhotoGroups` of that peer only) and deletes its files only with the content proof, and the temp leaves by their exact names. A chat whose removal was refused keeps its files.
- **The four new log lines** (`:558`, `:568`, `:688`, `:696`): `[DEVSEED] file chat message <i>:<j> skipped (<Type>)` · `file chats stopped (<Type>)` · `file chat file <i>:<j> not removed (<Type>)` · `file chats removal stopped (<Type>)` — fixed words, indexes, exception TYPE names only.

## Files
`Spixi/Utils/SDevSeed.cs` (all inside the `#if`; Seed 01–53 code unchanged apart from three hook lines and the unseed loop bound) · `Spixi/Utils/SDevSeedPlan.cs` (§ 3 added; pure) · `scripts/csh/FileWalkSeedTests.cs` (11 tests) · `scripts/pins-filewalk/a-file-seed.mjs` (18 keys; a17 freezes the whole bodies of the seven glue methods) · `scripts/pins-perfb1/e-image-seed.mjs` (re-based keys: rows 3, 5, 7, 11).

## Threat → rule → proof
| What could go wrong | What stops it | Proof |
|---|---|---|
| The code or its files reach a store build | Both files wholly inside `#if SPIXI_DEV_COEXIST`; the store gate O-35 | pin a1 · `pins-s15/d-build.mjs` O-35 |
| A WebView or a peer supplies a path or a name | The three verbs take no argument; every name from the seed index, j and fixed words; `leafShapeOk` + the app's own rules fail closed | pin a3, a4, a5, a6 · csh |
| A delete, overwrite or adopt reaches a user file | Content proof (length + SHA-256) before every keep and delete; the proof again after the move; a foreign file refused; the temp by its exact name in `Sent/` | pin a7, a8, a9 · csh (foreign file, temp, post-move proof) |
| A re-seed duplicates rows | A present chat with rows is never topped up (`SDevSeedPlan.topUpAction`: write only an empty chat; skip with the newest row; else partial); ≤ 100 messages a chat | pin a18 · csh `a_present_chat_is_written_only_when_empty_skipped_with_its_newest_row_and_partial_otherwise` |
| The unseed leaves something of ours | One removal loop over 56 indexes; `SPeerLocalStores.forget`; proven deletes | pin a14 · pin e row 5 · `pins-s15/b-native` O-06 |
| A log line carries a path or a name | Type names only; the glue bodies are frozen | pin a11, a17 |
| The seed leaks or fetches | No network type or URL | pin a2, a17 |
| Seed 01–53 change | Their values are frozen in the harness; their bodies by pin e | `PerfB1SeedTests` (unchanged, green) · pin e rows 4, 11 |

## NOT proven
- ⚠ C# UNCOMPILED: `SDevSeed.cs` (Core + MAUI). No dev build has seeded the file chats yet; how the chat page shows the cards, the voice bubbles and the 96 tiles is for the device run.
- Disk: about 85 MB more on the phone (the image seed adds about 30 MB); the seed thread writes it (time not measured).
- Recorded residuals (#46 r1): S-S-2 — on a top-up, a foreign file under one of our received names keeps the old row of an earlier seed (bounded by the size check of `FileMatch` and the content proof of the unseed; P42 has the same shape) · S-S-6 — "ours" means "the same bytes", not "we wrote it" · the image seed's own comment still says that the move throws if a file appeared meanwhile (not true on Unix; unchanged code, a text fix for its next re-base).
- The documents hold a seed head line and filler, not real pdf / docx content: a tap opens the OS chooser, which may show an error.

## How to switch it off
There is none: use a build without `SpixiDevCoexist` (every store build). In a dev build `ixian:devunseed` removes the contacts, their per-contact stores and the files.

## Question for BE
The same as P42: is it acceptable that a dev-only harness writes and deletes files by names C# builds from a seed index, with no dev-mode test, given that no store build compiles it? (yes / no)
