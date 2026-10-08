/* ==== SESSION 9 — agent A1 (C# MEDIA CORE): the C# CALL SITES of #1244 / #1245 A-6 · A-9 (CONTRACT §1a–§1f) ====
 * The pure rules (PhotoRules: the verb arguments, the group string / trailer bounds, the names C# makes, SafeFileName, the
 * Sent containment, the Win32 multi-select buffer, the Android decode sample, the JPEG size reader, the mediaPicked json,
 * the #1200 probe line; SPhotoGroups; the trailer against an OLD sequential reader) are EXECUTED in scripts/csh
 * (S9MediaTests.cs). The call sites are MAUI-bound and compile nowhere in this container, so they are pinned on
 * comment-stripped source (stripCode keeps string literals): each pin names the seam and the failure it prevents.
 * Deliberate breaks (#802) — run by agent A1 (/tmp/claude-0/s9/a1/mut.py); each failed EXACTLY the named pin, none survived:
 *   M1  setCaps: drop `caps += ",media";`                                                        → M1 caps
 *   M2  verbs: `Equals("ixian:pasteImage"` → `StartsWith("ixian:pasteImage"`                       → M2 verbs
 *   M3  onPickPhotos: a second SClipboardImage.readAsync before the route test                    → M3 clipboard on the paste verb only
 *   M4a onPickPhotos: `_ = Task.Run(() =>` → an inline lambda (prepare on the UI thread)          → M4 threads
 *   M4b finishPick: drop `isDisposed ||`                                                          → M4 threads
 *   M5a onMediaSend: drop `|| b.peer != friend.walletAddress.ToString()`                          → M5 mediaSend
 *   M5b sendMediaBatch: SPhotoGroups.set moved after sendPreparedFile                             → M5 mediaSend
 *   M6  sendPreparedFile: drop `sendPreparedNext = null;`                                         → M6 one-shot options
 *   M7a getBytes: drop `groupId.Length > 0 &&`                                                    → M7 trailer
 *   M7b FileTransfer(byte[]): `if (m.Position < m.Length)` → `if (true)`                          → M7 trailer
 *   M8a completeFileTransfer: `PhotoRules.SafeFileName(transfer.fileName)` → `transfer.fileName`  → M8 A-9 / A-6
 *   M8b acceptFile: the part path back to `transfer.fileName + "." + uid + ".ixipart"`            → M8 A-9 / A-6
 *   M9  handleFileHeader: drop the SafeFileName line                                              → M9 receive header
 *   M10 onSendFile: drop the tooBig `return;`                                                     → M10 #1200 copy
 *   M11 deleteOwnMediaFile: drop the isUnderDir guard                                             → M11 Sent-only deletes
 *   M12 MainActivity PickImagesId: `path = ""` → `path = uris[i].Path`                            → M12 pickers
 *   M13 onMediaCancel: `"…no such batch"` → `"…no such batch " + batchId`                         → M13 fixed-word logs
 * Fix round 1 (lead r1 items 2–4), each broken on purpose (A1 r1 report):
 *   M14a HomePage: drop the isCaption block                                                     → M14 photo excerpt
 *   M14b HomePage: the photo branch before the voice branch (`if` / `else if` swapped)          → M14 photo excerpt
 *   M15a backup_rules.xml: drop the Spixi/Sent exclude                                          → M15 Sent backups
 *   M15b ensureSentFolder: IsExcludedFromBackupKey → IsHiddenKey                                  → M15 Sent backups
 *   M16  addFile: `voicePlayedArg(message, fVoice)` → `""`                                      → M16 played arg 19
 * #46 round 1 (M17–M23 + re-shaped M5/M8/M9/M10/M11/M14), each broken on purpose — see the A1 #46 r1 report
 */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.message)); } };
  const bodyOf = (sc, head, from = 0) => {
    const at = sc.indexOf(head, from);
    if (at < 0) return '';
    let i = sc.indexOf('{', at);
    if (i < 0) return '';
    const start = i;
    let depth = 0;
    for (; i < sc.length; i++) {
      const c = sc[i];
      if (c === '"' || c === "'") { for (i++; i < sc.length && sc[i] !== c; i++) { if (sc[i] === '\\') i++; } continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return sc.slice(start, i + 1); }
    }
    return '';
  };
  const before = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b); return i >= 0 && j >= 0 && i < j; };
  const count = (s, re) => (s.match(re) || []).length;

  const SCP = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  const TM = stripCode(rd('Spixi/Data/TransferManager.cs'));
  const SP = stripCode(rd('Spixi/Network/StreamProcessor.cs'));
  const NODE = stripCode(rd('Spixi/Meta/Node.cs'));
  const MA = stripCode(rd('Spixi/Platforms/Android/MainActivity.cs'));
  const AFP = stripCode(rd('Spixi/Platforms/Android/SFilePicker.cs'));
  const IFP = stripCode(rd('Spixi/Platforms/iOS/SFilePicker.cs'));
  const MFP = stripCode(rd('Spixi/Platforms/MacCatalyst/SFilePicker.cs'));
  const WFP = stripCode(rd('Spixi/Platforms/Windows/SFilePicker.cs'));
  const MAN = rd('Spixi/Platforms/Android/AndroidManifest.xml').replace(/<!--[\s\S]*?-->/g, '');
  /* the media region: from the PreparedSend class to onAcceptFile */
  const REG = SCP.slice(SCP.indexOf('private sealed class PreparedSend'), SCP.indexOf('public void onAcceptFile('));

  /* ———— M1: the caps — `media` always (the shell ANDs canSendFile), `camera` on Android + iOS only, in the ONE push ———— */
  await guard('S9 A1 M1 caps', async () => {
    ok(/caps \+= ",voice";\s*\}\s*caps \+= ",media";\s*caps \+= ",savePhoto";\s*#if ANDROID \|\| IOS\s*if \(SFilePicker\.CameraAvailable\(\)\)\s*\{\s*caps \+= ",camera";\s*\}\s*#endif\s*Utils\.sendUiCommand\(this, "setCaps", caps\);/.test(SCP) /* ★ S11 G re-base (#1263): + caps += ",savePhoto" after media (pins-s11/g-cs.mjs) */
      && count(SCP, /",media"/g) === 1 && count(SCP, /",camera"/g) === 1 && count(SCP, /"setCaps"/g) === 1,
      'S9 A1 M1 caps: setCaps gains ",media" (every chat — the shell gates on canSendFile, C# re-checks mediaAllowed) and ",camera" under #if ANDROID || IOS only when the device has a camera (SFilePicker.CameraAvailable — #46 r1), before the ONE push (CONTRACT §1a)');
  });

  /* ———— M2: the verbs — exact strings for camera / paste, Ordinal prefixes for send / cancel; the PHOTO tile = the pick ———— */
  await guard('S9 A1 M2 verbs', async () => {
    const osf = bodyOf(SCP, 'public async Task onSendFile(bool media = true)');
    ok(/current_url\.Equals\("ixian:camera", StringComparison\.Ordinal\)\)\s*\{\s*#pragma warning disable CS4014\s*onPickPhotos\(PhotoRules\.RouteCamera\);\s*#pragma warning restore CS4014\s*\}/.test(SCP)
      && /current_url\.Equals\("ixian:pasteImage", StringComparison\.Ordinal\)\)\s*\{\s*#pragma warning disable CS4014\s*onPickPhotos\(PhotoRules\.RoutePaste\);\s*#pragma warning restore CS4014\s*\}/.test(SCP)
      && /current_url\.StartsWith\("ixian:mediaSend:", StringComparison\.Ordinal\)\)\s*\{\s*onMediaSend\(current_url\.Substring\("ixian:mediaSend:"\.Length\)\);\s*\}/.test(SCP)
      && /current_url\.StartsWith\("ixian:mediaCancel:", StringComparison\.Ordinal\)\)\s*\{\s*onMediaCancel\(current_url\.Substring\("ixian:mediaCancel:"\.Length\)\);\s*\}/.test(SCP)
      && /if \(media\)\s*\{\s*await onPickPhotos\(PhotoRules\.RoutePhoto\);\s*return;\s*\}/.test(osf)
      && before(osf, 'hideParticipantAddresses', 'onPickPhotos(') && !/PickImageAsync/.test(SCP),
      'S9 A1 M2 verbs: ixian:camera / ixian:pasteImage are exact strings, ixian:mediaSend: / ixian:mediaCancel: Ordinal prefixes; the PHOTO tile (sendmedia) opens the multi pick after the chat-type refusal — the old single-image-as-file route (PickImageAsync, V-14) is gone from the chat');
  });

  /* ———— M3: the clipboard is read ONLY on the paste verb ———— */
  await guard('S9 A1 M3 clipboard', async () => {
    const pick = bodyOf(SCP, 'private async Task onPickPhotos(string route)');
    const pasteBranch = pick.slice(pick.indexOf('else if (route == PhotoRules.RoutePaste)'), pick.indexOf('else\n', pick.indexOf('else if (route == PhotoRules.RoutePaste)') + 40));
    const allCs = ['Spixi/Pages/Chat/SingleChatPage.xaml.cs', 'Spixi/Pages/Home/HomePage.xaml.cs', 'Spixi/Utils/SpixiContentPage.cs', 'Spixi/Pages/Contacts/ContactDetails.xaml.cs', 'Spixi/Pages/Settings/SettingsPage.xaml.cs']
      .map((p) => count(stripCode(rd(p)), /SClipboardImage\.readAsync\(/g)).reduce((a, b) => a + b, 0);
    ok(count(SCP, /SClipboardImage\.readAsync\(/g) === 1 && /SClipboardImage\.readAsync\(PhotoRules\.SourceMax\)/.test(pasteBranch) && allCs === 1,
      'S9 A1 M3 clipboard: SClipboardImage.readAsync runs ONCE, inside the RoutePaste branch of onPickPhotos (only `ixian:pasteImage` reaches it), bounded by SourceMax — no other page reads the clipboard image');
  });

  /* ———— M4: decode / encode OFF the UI thread; the pushes ON it, only for this document / chat ———— */
  await guard('S9 A1 M4 threads', async () => {
    const pick = bodyOf(SCP, 'private async Task onPickPhotos(string route)');
    /* ★ S10 P1 re-base (#1254, agent A): finishPick gains the append TARGET, prepareBatch the `take` bound; mediaPicked is
       pushed from TWO places inside finishPick (the append under the target's id · a new batch) — pins-s10/a-wiring.mjs */
    const fin = bodyOf(SCP, 'private void finishPick(MediaBatch batch, MediaBatch? target, int doc, Friend chat)');
    const prep = bodyOf(SCP, 'private static void prepareBatch(MediaBatch batch, List<SpixiImageData> picks, int take)');
    ok(/_ = Task\.Run\(\(\) =>\s*\{\s*try\s*\{\s*prepareBatch\(batch, picks, take\);\s*\}[\s\S]*?onMain\(\(\) => finishPick\(batch, target, doc, chat\)\);\s*\}\);/.test(pick)
      && count(SCP, /prepareBatch\(/g) === 2 && count(SCP, /finishPick\(/g) === 2
      && /if \(isDisposed \|\| doc != thumbDoc \|\| friend != chat \|\| batch\.peer != friend\.walletAddress\.ToString\(\)\)\s*\{\s*foreach \(MediaItem it in batch\.items\)\s*\{\s*deleteOwnMediaFile\(it\.path\);\s*\}\s*return;\s*\}/.test(fin)
      && count(SCP, /"mediaPicked"/g) === 2 && count(fin, /"mediaPicked"/g) === 2 && /Utils\.sendUiCommand\(this, "mediaPicked", batch\.id, PhotoRules\.pickedJson\(batch\.shown\)\);/.test(fin)
      && /mediaDecodeGate\.Wait\(60000\)/.test(prep) && /Spixi\.SThumbnail\.makeViewerJpeg\(src, PhotoRules\.MaxEdge\)/.test(prep)
      && /Spixi\.SThumbnail\.makeViewerJpeg\(jpg, PhotoRules\.ThumbEdge\)/.test(prep)
      && /Interlocked\.Exchange\(ref mediaBusy, 0\);/.test(fin) && /if \(Interlocked\.Exchange\(ref mediaBusy, 1\) != 0\)/.test(pick),
      'S9 A1 M4 threads: prepareBatch (the bounded copy, the sniff, the 2048 / q82 encode and the 320 thumb — one decode at a time in the process) runs in Task.Run; mediaPicked is pushed only from finishPick on the main thread, never for a torn-down page, an older document or another chat (their files go); one pick at a time per page');
  });

  /* ———— M5: mediaSend acts only on THIS page's open batch, keys of prepared items; the group is recorded before the store ———— */
  await guard('S9 A1 M5 mediaSend', async () => {
    const ms = bodyOf(SCP, 'private void onMediaSend(string payload)');
    const sb = bodyOf(SCP, 'private void sendMediaBatch(MediaBatch b, List<MediaItem> chosen, string caption)');
    const mc = bodyOf(SCP, 'private void onMediaCancel(string batchId)');
    ok(/if \(b == null \|\| id == null \|\| !string\.Equals\(b\.id, id, StringComparison\.Ordinal\)\s*\|\| friend == null \|\| b\.peer != friend\.walletAddress\.ToString\(\)\)\s*\{\s*Logging\.warn\("ixian:mediaSend: no such batch"\);\s*return;\s*\}/.test(ms)
      && /if \(!PhotoRules\.parseMediaSend\(payload, b\.count, out _, out List<int> keys, out string caption\)\)/.test(ms)
      /* ★ S10 #46 r1 M1 re-base: an unknown key is SKIPPED (a ✕ raced the send); a send naming NO prepared photo is refused (pins-s10/a-wiring) */
      && /MediaItem\? it = b\.items\.Find\(x => x\.k == k\);\s*if \(it != null\)\s*\{\s*chosen\.Add\(it\);\s*\}/.test(ms) && /if \(chosen\.Count == 0\)\s*\{[^}]*return;\s*\}/.test(ms)
      && before(ms, 'mediaAllowed()', 'mediaBatch = null;') && before(ms, 'mediaBatch = null;', 'sendMediaBatch(b, chosen, caption);')
      && before(sb, 'SPhotoGroups.setMany(peer, groupRows, SPhotoGroups.FromMe);', 'sendPreparedFile(') && count(sb, /SPhotoGroups\.set(Many)?\(/g) === 1   /* #46 r3 m3: ONE batch write */
      && /if \(fm == null\)\s*\{\s*SPhotoGroups\.remove\(peer, msgHex\);\s*deleteOwnMediaFile\(final\);\s*continue;\s*\}/.test(sb)
      && /string final = Path\.Combine\(sentFolder\(\), leaf\);\s*try\s*\{\s*File\.Move\(it\.path, final\);/.test(sb)
      && /if \(captionId != null && sent > 0\)\s*\{\s*sendCaption\(caption, captionId\);\s*\}/.test(sb) && before(sb, 'sendPreparedFile(', 'sendCaption(')
      && /Node\.addMessageWithType\(captionId, FriendMessageType\.standard,/.test(bodyOf(SCP, 'private void sendCaption(string caption, byte[] captionId)'))
      && /if \(b == null \|\| !PhotoRules\.isId16\(batchId\) \|\| !string\.Equals\(b\.id, batchId, StringComparison\.Ordinal\)\)/.test(mc),
      'S9 A1 M5 mediaSend: only this page\'s open batch for this chat; parseMediaSend against the batch count; only prepared items are sent (S10: an unknown key is skipped, none → refused); the kept photos move to Sent/<uid>.jpg, their group is recorded BEFORE the store (the live insert reads arg 18) and forgotten when the store fails; the caption is a text message stored with the trailer\'s captionId, sent AFTER the files; mediaCancel needs the same batch id');
  });

  /* ———— M6: sendPreparedFile's options are consumed once and only by it ———— */
  await guard('S9 A1 M6 one-shot options', async () => {
    const sp = bodyOf(SCP, 'private FriendMessage? sendPreparedFile(string fileName, Stream stream, string filePath)');
    ok(/PreparedSend\? opts = sendPreparedNext;\s*sendPreparedNext = null;\s*FileTransfer transfer = TransferManager\.prepareFileTransfer\(fileName, stream, filePath, opts != null \? opts\.transferId : ""\);/.test(sp)
      && /if \(opts != null && opts\.groupId\.Length > 0\)\s*\{\s*transfer\.groupId = opts\.groupId;\s*transfer\.groupIndex = opts\.groupIndex;\s*transfer\.groupCount = opts\.groupCount;\s*transfer\.captionId = opts\.captionId;\s*\}/.test(sp)
      && /Node\.addMessageWithType\(opts\?\.messageId, FriendMessageType\.fileHeader,/.test(sp)
      && count(SCP, /sendPreparedNext = new PreparedSend/g) === 2,
      'S9 A1 M6 one-shot options: sendPreparedFile reads sendPreparedNext ONCE and clears it at once (a stale group / uid can never ride the next voice or file send); the uid, the trailer and the message id come from C#\'s own caller (mediaSend, Send file)');
  });

  /* ———— M7: the trailer (CONTRACT §1d) — written after channel only for a valid group; read only when bytes remain ———— */
  await guard('S9 A1 M7 trailer', async () => {
    const gb = bodyOf(TM, 'public byte[] getBytes()');
    const rdr = bodyOf(TM, 'public FileTransfer(byte[] bytes)');
    const tr = bodyOf(TM, 'private void readGroupTrailer(BinaryReader reader)');
    ok(/writer\.Write\(channel\);\s*if \(groupId\.Length > 0 && PhotoRules\.trailerOk\(groupId, groupIndex, groupCount, captionId\)\)\s*\{\s*writer\.Write\(groupId\);\s*writer\.Write\(groupIndex\);\s*writer\.Write\(groupCount\);\s*writer\.Write\(captionId\);\s*\}/.test(gb)
      && /channel = reader\.ReadInt32\(\);\s*if \(m\.Position < m\.Length\)\s*\{\s*readGroupTrailer\(reader\);\s*\}/.test(rdr)
      && /try\s*\{\s*string gid = reader\.ReadString\(\);\s*int index = reader\.ReadInt32\(\);\s*int count = reader\.ReadInt32\(\);\s*string cap = reader\.ReadString\(\);/.test(tr)
      && /if \(PhotoRules\.trailerOk\(gid, index, count, cap\)\)\s*\{\s*groupId = gid;/.test(tr) && /catch \(Exception\)/.test(tr),
      'S9 A1 M7 trailer: getBytes appends gid · index · count · captionId AFTER channel, only for a valid group (a plain file\'s header is unchanged); the reader reads them only when bytes remain, in its own try, and keeps them only when PhotoRules.trailerOk (csh: an OLD sequential reader ignores them)');
  });

  /* ———— M8: A-9 (100 MB before SetLength) · A-6 (C# names the part file and the final file) ———— */
  await guard('S9 A1 M8 A-9 / A-6', async () => {
    const pin = bodyOf(TM, 'public static FileTransfer prepareIncomingFileTransfer(FileTransfer transfer)');
    const acc = bodyOf(TM, 'public static void acceptFile(Friend friend, string uid)');
    const done = bodyOf(TM, 'public static void completeFileTransfer(Address sender, string uid)');
    const onAcc = bodyOf(SCP, 'public void onAcceptFile(int selected_channel, FriendMessage message)');
    ok(/if \(transfer == null \|\| transfer\.fileSize > \(ulong\)PhotoRules\.MaxReceiveBytes\)\s*\{\s*Logging\.warn\("[^"]*"\);\s*return null;\s*\}/.test(pin) && before(pin, 'PhotoRules.MaxReceiveBytes', 'incomingTransfers.Add(')
      && before(acc, 'PhotoRules.MaxReceiveBytes', 'SetLength(') && before(acc, 'PhotoRules.MaxReceiveBytes', 'File.Create(')
      && /string partialDir = Path\.Combine\(downloadsPath, S10FixRules\.PartialFolder\);\s*Directory\.CreateDirectory\(partialDir\);\s*transfer\.filePath = Path\.Combine\(partialDir, PhotoRules\.partFileName\(Guid\.NewGuid\(\)\.ToString\("N"\)\)\);/.test(acc)   /* ★ S10 F7 re-base (#1254): the part file lives in Downloads/.partial (behaviour: pins-s10/b-wiring.mjs) */ && !/\.ixipart"/.test(acc)
      && /string safe_name = S10FixRules\.finalLeaf\(PhotoRules\.SafeFileName\(transfer\.fileName\)\);\s*string final_file_path = Path\.Combine\(downloadsPath, safe_name\);/.test(done)
      && /PhotoRules\.collisionName\(safe_name, instance_num\)/.test(done) && before(done, 'isInsideDownloadsRoot(', 'File.Move(')
      && /if \(message\.fileSize > \(ulong\)PhotoRules\.MaxReceiveBytes\)\s*\{[^}]*"mediaError", PhotoRules\.ErrFileTooBigIn\);\s*return;\s*\}/.test(onAcc)
      && /if \(transfer\.fileSize > \(ulong\)PhotoRules\.MaxReceiveBytes\)\s*\{\s*Logging\.warn\("[^"]*"\);\s*lock \(incomingTransfers\)\s*\{\s*incomingTransfers\.Remove\(transfer\);\s*\}\s*return;\s*\}/.test(acc)   /* #46 r1 (tests): the belt's return */ && before(onAcc, 'PhotoRules.MaxReceiveBytes', 'prepareIncomingFileTransfer('),
      'S9 A1 M8 A-9 / A-6: an offer above 100 MB is refused before anything is created or SetLength reserves space (onAcceptFile tells the shell, TransferManager refuses twice); the part file is C#\'s own name (never the peer\'s name or uid); the final name is SafeFileName + " (n)", checked inside the Downloads root before the move');
  });

  /* ———— M9: the receive header — the name is sanitized and the group recorded BEFORE the store ———— */
  await guard('S9 A1 M9 receive header', async () => {
    const hf = bodyOf(SP, 'public static void handleFileHeader(Address sender, SpixiMessage data, byte[] message_id, Address? group_sender_address)');
    ok(/FileTransfer transfer = new FileTransfer\(data\.data\);\s*transfer\.fileName = PhotoRules\.SafeFileName\(transfer\.fileName\);/.test(hf)
      && before(hf, 'PhotoRules.SafeFileName(', 'string message_data =')
      && /if \(fm != null && !fm\.localSender && fm\.id != null && transfer\.groupId\.Length > 0\)\s*\{\s*string from = group_sender_address != null \? group_sender_address\.ToString\(\) : sender\.ToString\(\);\s*if \(SPhotoGroups\.set\(sender\.ToString\(\), Crypto\.hashToString\(fm\.id\),\s*PhotoRules\.groupArg\(transfer\.groupId, transfer\.groupIndex, transfer\.groupCount, transfer\.captionId\), from\)\)/.test(hf)
      && before(hf, 'Node.addMessageWithType(', 'SPhotoGroups.set(') && count(hf, /SPhotoGroups\.set\(/g) === 1
      && /Utils\.getChatPage\(friend\)\?\.refreshFileRow\(stored, channel\);/.test(hf) && /MainThread\.BeginInvokeOnMainThread\(/.test(hf),
      'S9 A1 M9 receive header: the peer\'s file name passes SafeFileName before it is stored or shown; a group is recorded only AFTER Core stored an INCOMING row (never my replayed row — #46 r1 M-2), with its sender, first writer wins; an open chat re-pushes the row on the main thread so arg 18 lands');
  });

  /* ———— M10: "Send file" sends C#'s durable copy (#1200), refuses > 100 MB first, off the UI thread; the video notice ———— */
  await guard('S9 A1 M10 #1200 copy', async () => {
    const osf = bodyOf(SCP, 'public async Task onSendFile(bool media = true)');
    const mk = bodyOf(SCP, 'private static DurableCopy makeDurableCopy(Stream picked, string? pickedName, string uid)');
    ok(/DurableCopy copy = await Task\.Run\(\(\) => makeDurableCopy\(picked, fileName, uid\)\);\s*if \(copy\.tooBig\)\s*\{\s*picked\.Dispose\(\);\s*Logging\.warn\("[^"]*"\);\s*Utils\.sendUiCommand\(this, "mediaError", PhotoRules\.ErrFileTooBig\);\s*return;\s*\}/.test(osf)
      && before(osf, 'copy.tooBig', 'sendPreparedFile(') && /sendPreparedNext = new PreparedSend \{ transferId = copy\.path != null \? uid : "" \};\s*sendPreparedStage = 0;\s*sendPreparedUid = null;\s*FriendMessage\? sentFile = null;\s*try\s*\{\s*sentFile = sendPreparedFile\(fileName, stream, filePath\);/.test(osf)
      && /if \(sentFile == null\)\s*\{\s*deleteOwnMediaFile\(copy\.path\);\s*return;\s*\}\s*if \(PhotoRules\.isVideoName\(fileName\)\)\s*\{\s*Utils\.sendUiCommand\(this, "fileNotice", "videoLocation"\);\s*\}/.test(osf)
      && /catch \(Exception\)\s*\{\s*sendPreparedNext = null;\s*if \(sendPreparedStage < 2\)\s*\{\s*withdrawSendFile\(stream, copy\.path\);\s*\}\s*throw;\s*\}/.test(osf)
      && /deleteOwnMediaFile\(copyPath\);/.test(bodyOf(SCP, 'private void withdrawSendFile(Stream? stream, string? copyPath)'))
      && /string\? leaf = PhotoRules\.sentFileName\(uid, PhotoRules\.sentExtension\(pickedName\)\);/.test(mk) && /PhotoRules\.copyBounded\(picked, dest, PhotoRules\.maxFileBytes\(PhotoRules\.FileTier\.Free\), out readFailed\)/.test(mk)
      && /if \(known > PhotoRules\.maxFileBytes\(PhotoRules\.FileTier\.Free\)\)\s*\{\s*r\.tooBig = true;\s*return r;\s*\}/.test(mk),
      'S9 A1 M10 #1200 copy: Send file copies the picked stream (≤ 50 MB — ★ S10 P2: maxFileBytes(Free), else mediaError fileTooBig and nothing is sent) to Sent/<uid><allow-listed ext> off the UI thread and sends THAT path with the same uid; a video adds fileNotice videoLocation');
  });

  /* ———— M11: deletes touch only C#'s own Sent/ files ———— */
  await guard('S9 A1 M11 Sent-only deletes', async () => {
    const del = bodyOf(SCP, 'private static void deleteOwnMediaFile(string? path)');
    const delCount = count(REG, /File\.Delete\(/g);
    ok(/if \(string\.IsNullOrEmpty\(path\) \|\| !PhotoRules\.isUnderDir\(path, sentFolder\(\)\)\)\s*\{\s*return;\s*\}\s*try\s*\{\s*File\.Delete\(path\);/.test(del)
      && delCount === 2   /* deleteOwnMediaFile · the pending sweep (isPendingName); copyBounded's partial file moved to PhotoRules (csh) */
      && !/long copyBounded\(/.test(SCP) && count(SCP, /PhotoRules\.copyBounded\(/g) === 2
      && /if \(!PhotoRules\.isPendingName\(Path\.GetFileName\(path\)\)\)\s*\{\s*continue;\s*\}\s*try\s*\{\s*File\.Delete\(path\);/.test(bodyOf(SCP, 'public static void sweepPendingPhotos()'))
      && /if \(del_msg != null && del_msg\.type == FriendMessageType\.fileHeader && del_msg\.localSender\)\s*\{\s*TransferManager\.removeOutgoingTransfer\(del_msg\.transferId\);\s*deleteSentCopyOf\(del_msg\);\s*\}/.test(SCP)
      && /deleteOwnMediaFile\(PhotoRules\.rerootSent\(fm\.filePath, sentFolder\(\)\) \?\? fm\.filePath\);/.test(bodyOf(SCP, 'private static void deleteSentCopyOf(FriendMessage? fm)'))
      && /SingleChatPage\.sweepPendingPhotos\(\);/.test(NODE) && before(NODE, 'VoiceFolderSweep.runOnce(', 'SingleChatPage.sweepPendingPhotos();'),
      'S9 A1 M11 Sent-only deletes: every media delete goes through deleteOwnMediaFile (a direct child of Sent/ only) or deletes its own just-made file / a PhotoRules.isPendingName match; deleting MY file message deletes its Sent copy (never a picker or Downloads path); Node runs the pending sweep once at start');
  });

  /* ———— M12: the platform pickers — Android keeps no content-uri path; camera / pick shapes per platform ———— */
  await guard('S9 A1 M12 pickers', async () => {
    const res = MA.slice(MA.indexOf('else if (requestCode == PickImagesId)'), MA.indexOf('else if (requestCode == SaveFileId'));
    ok(/new SpixiImageData\(\) \{ name = "", path = "", stream = st \}/.test(res) && !/\.Path\b/.test(res)
      && /new SpixiImageData\(\) \{ name = Path\.GetFileName\(uri\.Path\), path = "", stream = ContentResolver\.OpenInputStream\(uri\) \};/.test(MA)
      && /intent\.PutExtra\(Intent\.ExtraAllowMultiple, true\);/.test(AFP) && /new Intent\(Intent\.ActionGetContent\)/.test(AFP)
      && /finally\s*\{\s*try \{ File\.Delete\(tmp\); \} catch \(Exception\) \{ \}\s*\}/.test(bodyOf(AFP, 'public static async Task<SpixiImageData?> CapturePhotoAsync(long cap)'))
      && /<action android:name="android\.media\.action\.IMAGE_CAPTURE" \/>/.test(MAN) && !/READ_MEDIA_IMAGES/.test(MAN)
      && /MediaPicker\.Default\.PickPhotosAsync\(new MediaPickerOptions \{ SelectionLimit = max \}\)/.test(IFP) && !/AsJPEG/.test(bodyOf(IFP, 'public static async Task<List<SpixiImageData>> PickImagesAsync(int max)'))
      && /FilePicker\.PickMultipleAsync\(new PickOptions \{ FileTypes = MacPickableImages \}\)/.test(MFP)
      && /FilePicker\.PickMultipleAsync\(new PickOptions \{ FileTypes = FilePickerFileType\.Images \}\)/.test(WFP) && /PhotoRules\.parseMultiSelect\(buffer, 1000\)/.test(WFP)
      && /Flags = OFN_EXPLORER \| OFN_FILEMUSTEXIST \| OFN_PATHMUSTEXIST \| OFN_NOCHANGEDIR \| OFN_ALLOWMULTISELECT/.test(WFP)
      && [MFP, WFP].every((t) => /public static Task<SpixiImageData\?> CapturePhotoAsync\(long cap\)\s*\{\s*return Task\.FromResult<SpixiImageData\?>\(null\);\s*\}/.test(t)),
      'S9 A1 M12 pickers: Android picks with GET_CONTENT + ALLOW_MULTIPLE and keeps NO uri path (V-14 / #1200 — the single pick too); the camera\'s temp file (camera EXIF) is deleted after the read; the manifest names IMAGE_CAPTURE and adds no media permission; iOS = PHPicker (PickPhotosAsync, SelectionLimit, no AsJPEG(1)); Mac / Windows = the multi-select file panel (Win32 fallback with ALLOWMULTISELECT); no camera on the desktops');
  });

  /* ———— M13: the media region logs fixed words + exception TYPES only (no path, name, caption or id) ———— */
  await guard('S9 A1 M13 fixed-word logs', async () => {
    const lines = [...REG.matchAll(/Logging\.(?:info|warn|error|trace)\(([^;]*)\);/g)].map((m) => m[1]);
    const bad = lines.filter((a) => {
      const rest = a.replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/\+\s*e\.GetType\(\)\.Name\s*\+?/g, '').replace(/\+\s*deleted\s*\+/g, '').replace(/[\s()+]/g, '');
      return rest !== '';
    });
    const tmLogs = [...TM.matchAll(/Logging\.(?:info|warn)\("(?:File offer refused|File accept refused|Accepting file|File header)[^;]*;/g)].map((m) => m[0]);
    ok(lines.length >= 15 && bad.length === 0 && tmLogs.length >= 4 && tmLogs.every((l) => !/\+|\{0\}/.test(l)) && /Logging\.info\("File Transfer Size: \{0\}", transfer\.fileSize\);/.test(TM),
      'S9 A1 M13 fixed-word logs: every log line of the media region is string literals + an exception TYPE (or the sweep count) — never a path, a file name, a caption or an id; TransferManager\'s new / touched lines carry no peer name (the size only) — ' + JSON.stringify({ n: lines.length, bad, tm: tmLogs.length }));
  });

  /* ———— M14 (r1): the chats-list excerpt of a photo — "Photo" / "{n} photos" (kind photo), and a group caption ———— */
  await guard('S9 A1 M14 photo excerpt', async () => {
    const HOME = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
    const fb = bodyOf(HOME, 'else if (lastmsg.type == FriendMessageType.fileHeader)');
    const langs = ['cn-cn', 'de-de', 'en-us', 'es-co', 'fr-fr', 'id-id', 'it-it', 'ja-jp', 'lt-lt', 'pt-br', 'ru-ru', 'sl-si', 'sr-sp']
      .map((c) => rd('Spixi/Resources/Raw/lang/' + c + '.txt'));
    ok(before(fb, 'VoiceCodec.isVoiceFileName(voiceName)', 'SharedItems.isImageName(photoName)')
      && /else if \(SharedItems\.parseFileHeader\(lastmsg\.message, out string photoName, out _\)\s*&& SharedItems\.isImageName\(photoName\)\)/.test(fb)
      && /SPhotoGroups\.countOf\(SPhotoGroups\.get\(friend\.walletAddress\.ToString\(\), Crypto\.hashToString\(lastmsg\.id\)\)\)/.test(fb)
      && /excerpt = photoCount > 1\s*\? string\.Format\(SpixiLocalization\._SL\("index-excerpt-photos"\) \?\? "\{0\} photos", photoCount\)\s*: \(SpixiLocalization\._SL\("index-excerpt-photo"\) \?\? "Photo"\);\s*excerptKind = "photo";/.test(fb)
      && /if \(excerptKind == "text" && lastmsg\.type == FriendMessageType\.standard && lastmsg\.id != null\s*&& SPhotoGroups\.isCaption\(friend\.walletAddress\.ToString\(\), Crypto\.hashToString\(lastmsg\.id\),\s*lastmsg\.localSender \? SPhotoGroups\.FromMe : \(lastmsg\.senderAddress != null \? lastmsg\.senderAddress\.ToString\(\) : friend\.walletAddress\.ToString\(\)\)\)\)\s*\{\s*excerptKind = "photo";\s*\}/.test(HOME)
      && langs.every((t) => /^index-excerpt-photo = \S/m.test(t) && /^index-excerpt-photos = .*\{0\}/m.test(t)),
      'S9 A1 M14 photo excerpt: a photo file row (after the voice test) reads "Photo" or "{n} photos" (a stored group of count > 1) with kind "photo"; a group\'s caption text keeps its text with kind "photo"; both keys in all 13 lang files ({0} in the plural)');
  });

  /* ———— M15 (r1): the Sent copies never reach a device backup ———— */
  await guard('S9 A1 M15 Sent backups', async () => {
    const xs = ['backup_rules', 'data_extraction_rules'].map((n) => rd('Spixi/Platforms/Android/Resources/xml/' + n + '.xml').replace(/<!--[\s\S]*?-->/g, ''));
    const ens = bodyOf(SCP, 'private static void ensureSentFolder(string dir)');
    ok((xs[0].match(/<exclude domain="file" path="Spixi\/Sent" \/>/g) || []).length === 1
      && (xs[1].match(/<exclude domain="file" path="Spixi\/Sent" \/>/g) || []).length === 2
      && /Directory\.CreateDirectory\(dir\);\s*#if IOS \|\| MACCATALYST[\s\S]*url\.SetResource\(Foundation\.NSUrl\.IsExcludedFromBackupKey, Foundation\.NSNumber\.FromBoolean\(true\)/.test(ens)
      && count(SCP, /ensureSentFolder\(dir\);/g) === 2 && !/Directory\.CreateDirectory\(dir\);/.test(REG.replace(ens, '')),
      'S9 A1 M15 Sent backups: Spixi/Sent is excluded in the Android backup rules (≤ 11 and both 12+ lists — files dir = SpecialFolder.Personal = Config.spixiUserFolder\'s parent) and the iOS / Mac Sent folder is IsExcludedFromBackup wherever C# creates it');
  });

  /* ———— M16 (r1): addFile arg 19 = the 8-FACE played rule for a voice FILE ———— */
  await guard('S9 A1 M16 played arg 19', async () => {
    ok(/string fPlayed = voicePlayedArg\(message, fVoice\);/.test(SCP)
      && /push\(batch, "addFile", [^;]*fVoice, fGroup, fPlayed, fSize\);/.test(SCP),   /* ★ S11 G re-base (#1263): + arg 20 fSize after played (pins-s11/g-cs.mjs) */
      'S9 A1 M16 played arg 19: a received voice FILE row carries the same "1" / "0" played flag as an inline clip (voicePlayedArg → S9FixRules.playedArg over fVoice + SVoicePlayed); "" for every other file row');
  });

  /* ═══ #46 round 1 (lead): M17–M23 ═══ */
  /* ———— M17: a batch's prepared files go on every exit — cancel, a refused send, a new document, a torn-down page ———— */
  await guard('S9 A1 M17 batch drops', async () => {
    const drop = bodyOf(SCP, 'private void dropMediaBatch()');
    const ms = bodyOf(SCP, 'private void onMediaSend(string payload)');
    const del = bodyOf(SCP, 'private static void deleteBatchFiles(MediaBatch b, ICollection<int>? keep)');
    ok(/MediaBatch\? b = mediaBatch;\s*mediaBatch = null;\s*if \(b == null\)\s*\{\s*return;\s*\}\s*deleteBatchFiles\(b, null\);/.test(drop)
      && /foreach \(string path in PhotoRules\.pathsToDelete\(items, keep\)\)\s*\{\s*deleteOwnMediaFile\(path\);\s*\}/.test(del)
      && /dropMediaBatch\(\);/.test(bodyOf(SCP, 'private void onLoad()'))
      && /base\.OnDisappearing\(\);\s*if \(isDisposed\)\s*\{\s*dropMediaBatch\(\);\s*\}/.test(bodyOf(SCP, 'protected override void OnDisappearing()'))
      && count(ms, /dropMediaBatch\(\);/g) === 4 && /if \(b\.channel != selectedChannel\)/.test(ms)
      && /mediaBatch = null;\s*deleteBatchFiles\(b, keys\);\s*sendMediaBatch\(b, chosen, caption\);/.test(ms),
      'S9 A1 M17 batch drops: dropMediaBatch deletes every prepared file (PhotoRules.pathsToDelete, csh); a new document, a torn-down page (after the base teardown), a refused mediaSend (malformed, another channel, an unprepared key, a chat that refuses media) drop the batch; a send deletes only the removed ones');
  });

  /* ———— M18: two passes — the group's index / count are over the photos that SURVIVED the move ———— */
  await guard('S9 A1 M18 two-pass group', async () => {
    const sb = bodyOf(SCP, 'private void sendMediaBatch(MediaBatch b, List<MediaItem> chosen, string caption)');
    ok(before(sb, 'File.Move(it.path, final);', 'int count = kept.Count;') && before(sb, 'int count = kept.Count;', 'PhotoRules.groupedAfter(count, captionId != null)')
      && before(sb, 'PhotoRules.groupedAfter(', 'SPhotoGroups.setMany(') && /kept\.Add\(new KeyValuePair<string, string>\(uid, final\)\);/.test(sb)
      && /byte\[\]\? captionId = caption\.Length > 0 && count > 0 \?/.test(sb),
      'S9 A1 M18 two-pass group: every kept photo is moved first; index / count / grouped are computed over the survivors, so a receiver never waits for a member that was never sent (#46 r1 m-4)');
  });

  /* ———— M19: the cameras — iOS native (no photo-library permission), Android storage asked before the stamp, a static pick TCS ———— */
  await guard('S9 A1 M19 cameras', async () => {
    const ic = bodyOf(IFP, 'public static async Task<SpixiImageData?> CapturePhotoAsync(long cap)');
    const ac = bodyOf(AFP, 'public static async Task<SpixiImageData?> CapturePhotoAsync(long cap)');
    ok(!/MediaPicker\.Default\.CapturePhotoAsync|PhotosAddOnly|Permissions\.Photos/.test(IFP) && /SourceType = UIImagePickerControllerSourceType\.Camera,/.test(ic)
      && /UIImage\? shot = args\.OriginalImage;/.test(ic) && /byte\[\]\? jpeg = await Task\.Run\(\(\) => drawBounded\(image\)\);/.test(ic)
      && /Permissions\.RequestAsync<Permissions\.Camera>\(\)/.test(ic) && /SPIXI\.PhotoRules\.MaxEdge/.test(bodyOf(IFP, 'private static byte[]? drawBounded(UIImage image)'))
      && before(ac, 'Permissions.RequestAsync<Permissions.StorageWrite>()', 'App.noteOwnIntentRoundTrip();') && /if \(!OperatingSystem\.IsAndroidVersionAtLeast\(33\)\)/.test(ac)
      && /return await Task\.Run\(\(\) =>\s*\{\s*try\s*\{\s*using \(Stream src = File\.OpenRead\(tmp\)\)/.test(ac)
      && /public static TaskCompletionSource<System\.Collections\.Generic\.List<SpixiImageData>>\? PickImagesTaskCompletionSource/.test(MA)
      && /MainActivity\.PickImagesTaskCompletionSource\?\.TrySetResult\(new List<SpixiImageData>\(\)\);/.test(AFP)
      && ['public static bool CameraAvailable()'].every((h) => bodyOf(AFP, h).length > 0 && bodyOf(IFP, h).length > 0)
      /* #46 r2 n2 */ && /throw new PermissionException\(SPIXI\.PhotoRules\.StorageDeniedMarker\);/.test(ac)
      && /string code = PhotoRules\.cameraErrorCode\(e is PermissionException, e\.Message\);\s*onMain\(\(\) => Utils\.sendUiCommand\(this, "mediaError", code\)\);/.test(SCP),
      'S9 A1 M19 cameras: iOS captures with a native UIImagePickerController (camera source, OriginalImage) — only the camera permission, no PhotosAddOnly (MAUI\'s path refused every capture) — and draws ≤ 2048 + encodes OFF the UI thread; Android ≤ 12 asks StorageWrite BEFORE the own-intent stamp and reads the shot off the UI thread; the multi-pick TCS is static (a recreated activity answers it); CameraAvailable on both');
  });

  /* ———— M20: the photo encoders write NO metadata (all four) ———— */
  await guard('S9 A1 M20 no metadata', async () => {
    const thumbs = ['Android', 'iOS', 'MacCatalyst', 'Windows'].map((o) => stripCode(rd('Spixi/Platforms/' + o + '/SThumbnail.cs')));
    const [and, ios, mac, win] = thumbs;
    const av = bodyOf(and, 'public static byte[]? makeViewerJpeg(string path, int maxEdge)');
    const wv = bodyOf(win, 'private static async Task<byte[]?> makeViewerAsync(string path, int maxEdge)');
    ok(/using Bitmap oriented = Bitmap\.CreateBitmap\(decoded, 0, 0, dw, dh, m, true\);\s*using MemoryStream ms = new MemoryStream\(\);\s*if \(!oriented\.Compress\(/.test(av)
      && !/SetAttribute|SaveAttributes/.test(and)
      && [ios, mac].every((t) => { const v = bodyOf(t, 'public static byte[]? makeViewerJpeg(string path, int maxEdge)');
        return /CreateThumbnailFromImageAlways = true,/.test(v) && /using UIImage image = new UIImage\(picture\);\s*using NSData\? data = image\.AsJPEG\(0\.82f\);/.test(v) && !/CGImageDestination/.test(t); })
      && /ExifOrientationMode\.IgnoreExifOrientation/.test(wv) && /BitmapEncoder\.CreateAsync\(BitmapEncoder\.JpegEncoderId, output, props\)/.test(wv)
      && !/CreateForTranscodingAsync/.test(win) && /BitmapPropertySet props = new BitmapPropertySet\s*\{\s*\{ "ImageQuality", new BitmapTypedValue\(0\.82, Windows\.Foundation\.PropertyType\.Single\) \},\s*\};/.test(wv),
      'S9 A1 M20 no metadata: Android compresses a FRESH bitmap (no Exif write), iOS / Mac encode a bare CGImage thumbnail (CreateThumbnailFromImageAlways, no CGImageDestination), Windows encodes raw pixels with a fresh JPEG encoder (quality only, IgnoreExifOrientation, never CreateForTranscodingAsync) — no EXIF / GPS leaves with a photo');
  });

  /* ———— M21: reads off the UI thread, PNG before DIB, no TIFF read, ≤ 100 MP ———— */
  await guard('S9 A1 M21 clipboard + size', async () => {
    const ac = stripCode(rd('Spixi/Platforms/Android/SClipboardImage.cs'));
    const wc = stripCode(rd('Spixi/Platforms/Windows/SClipboardImage.cs'));
    const apple = ['iOS', 'MacCatalyst'].map((o) => stripCode(rd('Spixi/Platforms/' + o + '/SClipboardImage.cs')));
    const athumbs = ['iOS', 'MacCatalyst'].map((o) => bodyOf(stripCode(rd('Spixi/Platforms/' + o + '/SThumbnail.cs')), 'public static byte[]? makeViewerJpeg(string path, int maxEdge)'));
    ok(before(ac, 'return await Task.Run(', 'OpenInputStream(found)')
      && apple.every((t) => !/public\.tiff/.test(t) && before(t, 'await Task.Run(', 'img.AsPNG()') && /public static readonly byte\[\] TooBig = new byte\[1\];/.test(t) && !/new byte\[cap \+ 1\]/.test(t))
      && before(wc, 'view.Contains("PNG")', 'view.Contains(StandardDataFormats.Bitmap)')
      && athumbs.every((v) => before(v, 'SPIXI.PhotoRules.pixelsOk(', 'src.CreateThumbnail('))
      && /if \(ReferenceEquals\(bytes, SClipboardImage\.TooBig\)\)/.test(SCP),
      'S9 A1 M21 clipboard + size: Android reads the pasted stream off the UI thread; iOS / Mac encode a bare UIImage off it, skip TIFF and answer "too big" without a cap-sized buffer; Windows reads PNG before the 33 MB DIB; iOS / Mac refuse > 100 MP from the header before any decode');
  });

  /* ———— M22: my Sent copies leave with the history that named them (m-3) ———— */
  await guard('S9 A1 M22 Sent sweep', async () => {
    const SC = stripCode(rd('Spixi/Utils/SContacts.cs'));
    const SET = stripCode(rd('Spixi/Pages/Settings/SettingsPage.xaml.cs'));
    const sw = bodyOf(SC, 'public static void scheduleSentSweep()');
    const once = bodyOf(SC, 'private static void sweepSentOnce()');
    const raw = bodyOf(SC, 'private static List<FriendMessage> readMessagesRaw(string path, ReadStatus? status)');
    const disk = bodyOf(SC, 'private static IEnumerable<FriendMessage> allMessagesOnDisk(Address wallet, ReadStatus? status)');
    ok(count(SC, /SPeerLocalStores\.forget\([^;]*\);\s*scheduleSentSweep\(\);/g) === 3
      /* #46 r2 m5: a request while a sweep runs → one more pass */
      && /System\.Threading\.Interlocked\.Exchange\(ref sentSweepAgain, 1\);\s*if \(System\.Threading\.Interlocked\.CompareExchange\(ref sentSweepRunning, 1, 0\) != 0\)/.test(sw)
      && /while \(System\.Threading\.Interlocked\.Exchange\(ref sentSweepAgain, 0\) == 1\)\s*\{\s*sweepSentOnce\(\);\s*\}/.test(sw) && /System\.Threading\.Tasks\.Task\.Run\(/.test(sw)
      /* #46 r2 m2: a failed / partial history read deletes NOTHING */
      && /foreach \(FriendMessage fm in allMessagesOnDisk\(f\.walletAddress, status\)\)/.test(once)
      && /if \(!status\.complete\)\s*\{\s*Logging\.warn\("[^"]*"\);\s*return;\s*\}/.test(once) && before(once, 'if (!status.complete)', 'File.Delete(')
      && /PhotoRules\.sentSweepVictims\(leaves, named, status\.complete, SentSweepMinAgeSeconds\)/.test(once)
      && /SearchOption\.TopDirectoryOnly/.test(once) && /string\? sentLeaf = fm\.localSender && fm\.type == FriendMessageType\.fileHeader \? PhotoRules\.sentLeafOf\(fm\.filePath\) : null;\s*if \(sentLeaf != null\)\s*\{\s*named\.Add\(sentLeaf\);\s*\}/.test(once) && !/isUnderDir\(fm\.filePath/.test(once)   /* #46 r3 MAJOR: by leaf, any recorded root */
      && count(raw, /status\.complete = false;/g) === 2 && count(disk, /status\.complete = false;/g) === 2 && /readMessagesRaw\(f, status\)/.test(disk)
      /* #46 r2 m2: a fresh mtime on the durable copies */
      && /File\.Move\(it\.path, final\);\s*\}\s*catch \(Exception e\)[\s\S]{0,400}?continue;\s*\}\s*try \{ File\.SetLastWriteTimeUtc\(final, DateTime\.UtcNow\); \} catch \(Exception\) \{ \}\s*probeSendPath\(b\.route, PhotoRules\.CaseCopy\);/.test(SCP)   /* #46 r3 m2: its own try */
      && /File\.SetLastWriteTimeUtc\(dest, DateTime\.UtcNow\);[^\n]*\s*r\.path = dest;/.test(SCP)
      && count(SET, /SContacts\.deleteAllSentCopies\(\);/g) === 3
      /* #46 r3 MAJOR: open / delete / localPathOf re-root a Sent copy into today's folder */
      && /string\? rerooted = SPIXI\.PhotoRules\.rerootSent\(fm\.filePath, Path\.Combine\(SPIXI\.Meta\.Config\.spixiUserFolder, SPIXI\.PhotoRules\.SentFolderName\)\);\s*return rerooted != null && File\.Exists\(rerooted\) \? rerooted : null;/.test(stripCode(rd('Spixi/Utils/SharedItems.cs')))
      && /deleteOwnMediaFile\(PhotoRules\.rerootSent\(fm\.filePath, sentFolder\(\)\) \?\? fm\.filePath\);/.test(SCP)
      && /else if \(fm\.localSender && SharedItems\.localPathOf\(fm\) is string sentNow\)\s*\{\s*SFileOperations\.open\(sentNow\);/.test(SCP),
      'S9 A1 M22 Sent sweep: after a history delete / contact removal / room leave, a background sweep deletes my Sent copies no remaining history names (direct children, sent-copy names, ≥ 10 min old) — NOTHING when any history read failed or was partial (#46 r2 m2), a request during a sweep runs one more pass (m5), and the durable copies get a fresh mtime when made; the wipe and "delete all history" delete every sent copy');
  });

  /* ———— M23: a peer-sized header preview is never allocated ———— */
  await guard('S9 A1 M23 preview cap', async () => {
    const rdr = bodyOf(TM, 'public FileTransfer(byte[] bytes)');
    ok(/if \(PhotoRules\.previewLengthOk\(data_length\)\)\s*preview = reader\.ReadBytes\(data_length\);\s*else if \(data_length > 0\)\s*\{\s*if \(m\.Length - m\.Position < data_length\)\s*throw new EndOfStreamException\(\);\s*m\.Seek\(data_length, SeekOrigin\.Current\);\s*\}/.test(rdr)
      && count(rdr, /ReadBytes\(/g) === 1,
      'S9 A1 M23 preview cap: the FileTransfer header reads a preview only up to 64 KB; a longer one is skipped unread (a length past the end throws into the existing catch)');
  });

  /* ———— M24 (#46 r4): an INCOMING transfer never resolves to MY row; a re-armed sent file is re-rooted; fixed-word logs ———— */
  await guard('S9 A1 M24 transfer direction', async () => {
    const CB = stripCode(rd('Spixi/Meta/SpixiLocalStorageCallbacks.cs'));
    const done = bodyOf(TM, 'public static void completeFileTransfer(Address sender, string uid)');
    const ffr = bodyOf(SP, 'public static void handleFileFullyReceived(Address sender, SpixiMessage data)');
    const logs = [...CB.matchAll(/Logging\.\w+\(([^;]*)\);/g)].map((m) => m[1]);
    ok(/Find\(x => x\.transferId == uid && x\.localSender != incoming\);\s*if \(fm == null\)\s*\{\s*return;\s*\}/.test(done)
      && /Find\(x => x\.localSender && x\.transferId == uid\)/.test(ffr)
      && /friend\.getMessages\(selectedChannel\)\?\.Find\(x => !x\.localSender && x\.transferId == id\);\s*if \(fm != null\)\s*\{\s*onAcceptFile\(selectedChannel, fm\);/.test(SCP)
      && /public void onAcceptFile\(int selected_channel, FriendMessage message\)\s*\{\s*if \(message == null \|\| message\.localSender\)\s*\{[^}]*return;\s*\}/.test(SCP)
      && /private void startVoiceDownload\(FriendMessage fm, string ownHex, int channel\)\s*\{\s*if \(fm\.localSender\)\s*\{[^}]*return;\s*\}/.test(SCP)
      && /if \(!File\.Exists\(path\)\)\s*\{\s*string\? rerooted = PhotoRules\.rerootSent\(path, Path\.Combine\(Config\.spixiUserFolder, PhotoRules\.SentFolderName\)\);\s*if \(rerooted != null && File\.Exists\(rerooted\)\)\s*\{\s*path = rerooted;\s*\}/.test(CB)
      && /new FileStream\(path, FileMode\.Open, FileAccess\.Read, FileShare\.Read\);\s*var ft = TransferManager\.prepareFileTransfer\(t_file_name, fs, path, friendMessage\.transferId\);/.test(CB)
      && logs.length === 2 && logs.every((a) => a.replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/\+\s*e\.GetType\(\)\.Name\s*\+/g, '').replace(/[\s()+]/g, '') === ''),
      'S9 A1 M24 transfer direction: completion / accept / download / "fully received" lookups match the transfer\'s OWN direction (a peer offer reusing my transfer id never completes or re-paths my sent row — the Sent sweep keeps my copy); onAcceptFile and startVoiceDownload refuse my own row; the startup re-arm re-roots my Sent copy into today\'s folder; its logs are fixed words + an exception type');
  });
}
