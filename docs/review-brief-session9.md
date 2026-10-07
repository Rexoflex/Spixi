# Review brief — Session 9 (#46)

Tree: /home/claude/w-merge @ "S9 merge r2" (git log -1). Base before S9: c7f931d8 (= e945fa39 + DECISIONS #1243–#1247). Diff: `git -C /home/claude/w-merge diff c7f931d8 -- . ':!Spixi/Resources/Raw/html' ':!src/demo' ':!src/strings/*.js' ':!src/strings/*.json'`.
Contract: /tmp/claude-0/s9/CONTRACT.md. Decisions: DECISIONS.md #1243–#1247 + Damir's later picks (below).
Green state: full smoke running/ran in w-merge (do NOT run `node scripts/smoke-test.mjs` yourself, ever); CSH pass=272 fail=0; all --check gates OK. C# is UNCOMPILED (no MAUI SDK) — read it like a compiler.

## What landed
- Media family (#1244): Photos + Camera tiles (caps media/camera), C# multi-picker ≤ 10, camera (Android/iOS), paste (ixian:pasteImage → SClipboardImage), bounded decode → ≤ 2048 px JPEG q82 no metadata, pending files `Sent/pending-<batch>-<k>.jpg`, `mediaPicked`/`mediaError`/`mediaSend`/`mediaCancel`, durable `Sent/<uid>.jpg` copy (#1200) also for Send file, FileTransfer trailer (group id/index/count/captionId) + SPhotoGroups, caption = own-id text message merged under the grid, receiver 2×2 grid, viewer paging, A-9 100 MB cap both sides, A-6 safe names, Sent excluded from backups, photo excerpt kind 'photo' in the chats list.
- V-15 (#1245): C-01 nav-stack copy, C-02 keyed typing timers, C-03 bounded resume waits, C-04 installFromUrlAsync, A-8 MiniAppPage handleBridgeUrl, A-13 restore order, A-14 Mac WebView handler (+ csproj AfterTargets), H-3, H-13 native "Did you save the backup?", H-14 SLocalOnlyStore, A-7 tips count only, A-10 "End-to-end encrypted", A-19 hour numeric.
- Copy/lang (#1246): Create copy (new keys), language AI note + `ixian:reportTranslation:<code>` (C# builds the mailto), Downloads desktop dialog (DownloadsPage.create + setPresentation('dialog')).
- Polish/a11y/(f)/S8 fixes (#1247): U-01, U-03, U-05, H-16 f, D-04 `ixian:haptic`, 4 a11y rows, #1179 (a) info pane follows the chat, 8-GRP-ADD owner {7} line, 8-APP SAppJoins + Joined + "Open again", 8-FACE SVoicePlayed + played args (addMe/addThem 18, updateMessage 13, addFile 19; no flag = "0" = blue), 8-GROW desktop focus + [P1] grow probe.
- Later Damir picks: Privacy icons world-download + photo · silent reactions (sendSilentReaction, push OFF) · A-FLASH: Android splash pre-draw hold until `ixian:bootDropped` (cap 1500 ms) + chat WebView native background never changed around the PresentHold ([P1] hold release bg=) · last message row always reserves the reaction overhang (data-log-end).

## Must-hold invariants
CLAUDE.md ★ rules: chat in its own WebView; C# names every file (no WebView path/filename into a filesystem op); no keys/passwords over the bridge; no new network fetch beyond C-04's existing install; logs fixed words + numbers; new verbs/pushes are optional for old shells / old exes; an old app peer (0e85a4b8) must still read our FileTransfer + see captions as text; Core untouched; bridge verbs parsed Ordinal and never throw; decode/encode off the UI thread, pushes on it; every pending/temporary file has an owner that deletes it on every exit (cancel, send, teardown, restart, failure).

## Accepted dials (do not re-open)
All picks in #1243–#1247 and the later picks above.

## Scopes (round 1)
- R1-A: C# media core (A1 files: PhotoRules, SPhotoGroups, SClipboardImage ×4, SFilePicker ×4, SThumbnail ×4, MainActivity picker, TransferManager, StreamProcessor.handleFileHeader, SingleChatPage media region, HomePage photo excerpt, Info.plist, manifest, backup rules).
- R1-B: C# everything else (A2 + A3 files: App, Node, Utils, HomePage other regions, StreamProcessor typing, MiniApp*, LaunchPage, MauiProgram, csproj, BackupPage, SLocalOnlyStore, SRequestIgnore, SPushPrefsShare, S9FixRules, SAppJoins, SVoicePlayed, SPeerLocalStores, DownloadsPage, SpixiContentPage, SettingsPage, MainActivity boot hold, silent reactions).
- R1-C: shells (chat.html + components + CSS; home/settings/launch/downloads shells + components) — behaviour, a11y, sinks/security, AND the C#↔shell interface agreement for every new verb/push/arg (names, arg positions, encodings).
- R1-D: tests — every new pin/csh test fails when its behaviour breaks (own mutations on effectful lines in a scratch copy; run only single modules); re-based pins not weakened (diff vs c7f931d8).

## 5 · Verdict

**Verdict: CLEAN at round 4** (#1251). Protocol: 4 disjoint read-only auditors (r1) → verify against the tree → fixes in fresh copies (A1 / A2 / A3 / B1 / B2) → a FRESH break-my-verdict reader per round (r2, r3, r4).

| Round | Reader | MAJOR | MINOR | NIT | Result |
|---|---|---|---|---|---|
| r1 | A C# media | 2 | 10 | 6 | fixed (A1) |
| r1 | B C# rest | 2 | 6 | 4 | fixed (A2 / A3); MINOR-6 C-01 + 4 NIT recorded |
| r1 | C shells + interface | 0 | 7 | 5 | fixed (B1 / B2 / A1); N1 / N5 recorded |
| r1 | D tests (37 breaks, 16 survivors) | 8 | 8 | — | every survivor → a stronger pin (A1 / A2 / B1); P7 / Q3 recorded |
| r2 | fresh | 1 | 5 | — | fixed |
| r3 | fresh | 1 | 3 | — | fixed (leaf naming + re-root) |
| r4 | fresh | **0** | 2 | — | fixed (f4, pinned M24) = **CLEAN** |

## The MAJORs
| # | Mechanism | Fix |
|---|---|---|
| r1 A-M1 | iOS camera: MAUI `CapturePhotoAsync` asks PhotosAddOnly and encodes a PNG on the main thread | the native picker; the photo rule off the UI thread (L100) |
| r1 A-M2 | a peer's FileTransfer trailer could rewrite `photo_groups` of MY rows | first writer wins + stored only for a stored incoming row |
| r1 B-M1 | #1179 (a): the desktop info pane closed on a chat swap | the pane follows the chat (reload for the new peer, no column animation) |
| r1 B-M2 | `mailto:` via SFSafariViewController on iOS / Mac (the VC refuses mailto) | MailCompose via Launcher |
| r1 D ×8 | survivors: dropMediaBatch loop + teardown call · copyBounded partial file · A-13 positional pin · iOS CreateThumbnailFromImageAlways · Windows IgnoreExifOrientation · Windows transcoding encoder = metadata kept · #1028 clipboard gate weakened | each pin made to fail on that break; the gate restored (exempt the API, not the file — L97) |
| r2 M1 | the Android 12+ cover used the old layer-list splash = a NEW flash | API 31+: `windowSplashScreenBackground` colour only (#1249) |
| r3 M1 | the Sent sweep named copies by ABSOLUTE path → an iOS container move deletes every older copy | leaf names + re-root (`PhotoRules.rerootSent`) (L98) |

## Deliberate breaks (mutations)
r1 D: 37 one-token breaks on effectful lines → 16 survivors, all turned into stronger pins. r2–r4: each new pin broken on purpose before the merge (M24 = the r4 transfer-id pin). Survivors at close: 0.

## Recorded, not fixed (#1251)
- C-01 stack copy stale during a push / pop animation · A-13 loadWallet throw after prefs written (state consistent) · H-3 effect small (Damir's pick).
- iOS PHPicker loads items fully before our cap (memory only; `LoadFileRepresentation` later) · Android picker: activity dies with no result → mediaBusy until page re-create.
- Caption text not linkified · photoCountMany plural forms ru / lt / sl.
- Android 12+ cover = plain colour (logo gap ≤ 1.5 s; SetOnExitAnimationListener = an open pick, #1249).
- A deferred store write lost on a kill within 400 ms before OnSleep · the receiver persists `photo_groups` once per received photo (off the UI thread, deferred).

## Final numbers
Suite (cloud twin + Ixian-Core @097341a): **BASELINE OK — 5567 / the 2 KNOWN** (#136 · B3). CSH **280** (was 236). All `--check` gates OK, verify-locales, i18n-lint, cs-syntax-check. CHAT_KB_CEIL 853 → 885 (chat.html 905 113 chars ≈ 884 KB, `smoke-test.mjs:8598`).
⚠ C# UNCOMPILED: every C# file in the diff (handoff `docs/handoff-2026-10-07b.md` §0); the csh harness executes `PhotoRules`, `SPhotoGroups`, `AuditRules`, `SLocalOnlyStore`, `S9FixRules`, `SAppJoins`, `SVoicePlayed`.
