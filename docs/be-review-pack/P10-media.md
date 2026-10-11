# P10 · MEDIA · Photos, camera, paste, file send, offer previews, auto-download

| Risk | Money / keys | Bridge change | Status | Read |
|---|---|---|---|---|
| HIGH | no — but peer image bytes are decoded in the process that holds the keys | yes | shipped | 8 min |

**Look here first:** `Spixi/Pages/Chat/SingleChatPage.xaml.cs:7521` — a contact's ≤ 8 KB offer preview (peer bytes) goes to a temp file and into the NATIVE platform decoder in the app process, with no tap (both switches default on).

**DECISIONS:** #772 · #1028 · #1121 · #1124 · #1133 · #1138 · #1156 · #1158 · #1166 · #1244 · #1245 · #1254 · #1258 · #1262 · #1263 · #1302 · #1311 · #1312

## What changed and why
- Photos go through C#: pick / camera / paste → bounded copy, sniff, decode ≤ 2048 px, JPEG q82, no metadata, into C#-named `Sent/pending-<batch>-<k>.src|.jpg`; the WebView sends batch ids, digit keys and a caption only (#1158, #1244, #1254, #1302).
- A photo group = a new optional trailer after `channel` in the FileTransfer header (gid, index, count, caption id); the caption is a plain text message (#1244). The sender fills the existing (0e85a4b8) `FileTransfer.preview` (≤ 8 KB, ≤ 96 px); the receiver bounds it, re-encodes it in C#, shows it for approved contacts only (#1258, #1263).
- Received names are sanitized, C# picks the stored name; caps 50 MB send / 100 MB receive (#1245, #1254). Auto-download is opt-in (default Off) and sends the tap's own `acceptFile` message, no HTTP fetch (#1262, #1263). Chat previews of on-device images (#1124, #1133); viewer + Save (#1166, #1263).

## Files (verified at 387ca78b)
- `Spixi/Network/StreamProcessor.cs:65` — keeps a peer preview only via `S11MediaRules.offerPreviewAccept` (`Spixi/Utils/S11MediaRules.cs:87`: ≤ 8 KB, sniff, JPEG SOF ≤ 256 px).
- `Spixi/Data/TransferManager.cs:94` — a preview > 64 KB is skipped unread; `:109` trailer in its own try; `:831` sanitized stored name + `:839` root re-check; `:589` 100 MB offer cap.
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:3055` — bounded copy (20 MB) → `:3061` sniff → `:3078` / `:3089` `SThumbnail.makeViewerJpeg`, one decode at a time. Chat thumb of an on-device image: `:7255` sniff, ≤ 20 MB → `:7268` `SThumbnail.makeJpeg` 320 px.
- `Spixi/Pages/Chat/SingleChatPage.xaml.cs:2744` — `deleteOwnMediaFile` deletes only under C#'s own `Sent/` (`PhotoRules.isUnderDir`); `:3529` start-up sweep of `Sent/pending-*` (`PhotoRules.isPendingName`).

## Bridge surface
SCP = `Spixi/Pages/Chat/SingleChatPage.xaml.cs`, SP = `Spixi/Pages/Settings/SettingsPage.xaml.cs`. chat = `src/shells/chat.html` → `Spixi/Resources/Raw/html/chat.html`, RENDERS UNTRUSTED content; settings = `settings.html` (own UI only). No verb here is handled by `MiniAppPage`.

| Verb / push | Args (shape) | Who can send it | Handler `file:line` | Ours / reshaped |
|---|---|---|---|---|
| `ixian:sendmedia` | none | chat → SingleChatPage | SCP:538 | reshaped: opens the photo strip (was: one image sent as a file) |
| `ixian:camera` | none | chat → SingleChatPage | SCP:554 | ours |
| `ixian:pasteImage` | none (C# reads the clipboard) | chat → SingleChatPage | SCP:560 | ours |
| `ixian:mediaSend:` | `<16hex>:<keys>:<b64url caption>` | chat → SingleChatPage | SCP:566 → :3310 | ours |
| `ixian:mediaCancel:` · `ixian:mediaDrop:` | `<16hex>` · `<16hex>:<digit>` | chat → SingleChatPage | SCP:570 → :3258 · SCP:576 → :3272 | ours |
| `ixian:viewImage:` · `ixian:savePhoto:` | `<hex msg id ≤128>` | chat → SingleChatPage | SCP:633 → :7585 · SCP:637 → :7665 | ours |
| `ixian:photoPreviews:` · `ixian:photoAutoDl:` | `on` / other · `<off\|wifi\|always>:<0\|1>` | settings → SettingsPage | SP:988 · SP:1000 | ours |
| `mediaPicked` | `<16hex>`, `<json [{k,thumb data-uri,w,h,kb,kind,pending:"1"}]>` | C# → chat | SCP:2969 | ours (+`pending`, #1302) |
| `mediaDropped` | `<16hex>`, `<digit>` | C# → chat | SCP:3306 | ours |
| `mediaError` · `fileNotice` | `<fixed code word>` · `videoLocation` | C# → chat | SCP:2866 · SCP:2529 | ours |
| `setFileThumb` · `setOfferPreview` | `<hex id>`, `<data:image/jpeg>` (offer: ≤ 8 KB) | C# → chat | SCP:7231 · SCP:7464 | ours |
| `updateFileTicks` | `<hex id>`, 3 × `True\|False` | C# → chat | SCP:6896 | ours |
| `viewerImage` | `<hex id>`, `<data uri \| "">` | C# → chat (also ContactDetails, see P11 `downloads`) | SCP:7649 | ours |
| `setPhotoPreviews` | `True\|False` | C# → chat, settings | SCP:7062 · SP:993 | ours |
| `setPhotoAutoDl` | `<off\|wifi\|always>` | C# → settings | SP:1007 | ours |
| `addFile` | args 14–20 added (sent, transfer, local, voice, group, played, size) | C# → chat | SCP:6230 | reshaped |

## Threat → rule → proof
| A hostile … could try | What stops it | Proof |
|---|---|---|
| contact sends a crafted offer preview for the native decoder | `S11MediaRules.cs:87` + approved contact and both switches (`S11MediaRules.cs:108`) + re-encode one at a time (SCP:7517) | csh `S11MediaTests.receiver_accepts_only_a_small_jpeg` · `preview_follows_the_auto_download_contact_rule`; the decoder itself: no proof |
| peer names a file `..\..\wallet.ixi`, a bidi spoof or `CON` | `Spixi/Utils/PhotoRules.cs:598` SafeFileName + `TransferManager.cs:839` | csh `S9MediaTests.safe_file_name` · `safe_file_name_ranges_r1` · `S10FixTests.final_leaf_is_never_a_part_leaf` |
| compromised chat WebView names a path to send or delete | ids / keys only: `Spixi/Utils/S10MediaRules.cs:43`, `PhotoRules.cs:249`; delete only under `Sent/` (SCP:2744) | csh `S10MediaTests.parse_drop_is_exact` · `S9MediaTests.caption_and_mediaSend` · `sent_folder_containment` |
| compromised chat WebView raises `pasteImage` then `mediaSend` with no paste | only `mediaAllowed` (SCP:2725: no bot / blind room); no gesture or foreground check | no proof |
| peer floods photo offers at an auto-download user | `S11ChatRules.cs:459` (photo ≤ 10 MB, approved contact, Load pictures on) + ≤ 4 in flight, ≤ 50 MB / chat / 24 h | csh `S11ChatTests.auto_download_decision` · `auto_download_contact_rule` · `auto_download_limits` |
| peer sends a bad group trailer to regroup rows | `PhotoRules.cs:290` trailerOk; first writer wins | csh `S9MediaTests.trailer_is_ignored_by_an_old_reader_and_validated_by_the_new_one` |

## Given up / left open
- Peer images (offer preview, downloaded photos for chat thumbs and the viewer) are decoded by the native platform decoder in the app process: bounded, not isolated (the gate's "contact images decoded in-process" row G-6b, #1121, #1258). Our pick routes use a picked name only for an allow-listed extension (`PhotoRules.cs:367`); the legacy mini-app picker write is P06's (#1245).
- #1311 (c): the unfinished-sent-file re-arm on every message load is legacy (`Spixi/Meta/SpixiLocalStorageCallbacks.cs:40`, `:53`; ours = the Sent re-root + fixed-word logs); once per id is planned for the next session (#1311).
- **⚠ Stale docs:** (1) `docs/security-review-for-be-engineer.md` (its receive-time `transfer.fileName` residual) still says the name goes unsanitized into the Downloads path — fixed at `TransferManager.cs:831` (#1245). (2) Its NATIVE COPY row says "no C# reads clipboard content" — `ixian:pasteImage` reads the clipboard image with no gesture check (SCP:2895, #1156, #1244). (3) `Spixi/Meta/SPhotoGroups.cs` header says "ONE app preference string"; the store is `localonly.json` (`SPhotoGroups.cs:404`, #772).

## Question for BE
Do you accept that a contact's ≤ 8 KB offer preview is decoded by the platform image decoder inside the app process without a tap (yes / no — no = we show it only after a Download tap)?
