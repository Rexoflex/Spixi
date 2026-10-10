/* ==== S11 G — ★★ #1258 + #1263 (a / c): the C# wiring of the offer preview, addFile arg 20 and the viewer's Save ====
 * C# is UNCOMPILED here and MAUI-bound: these pins read the source (stripCode — comments out). The pure rules
 * (S11MediaRules) are EXECUTED by the C# harness (scripts/csh/S11MediaTests.cs — registered below).
 *   SENDER   · prepareBatch makes the preview from the PREPARED photo inside the one decode gate (pickOfferPreview over
 *              SThumbnail.makeViewerJpeg — the no-metadata encoder) · the preview rides MediaItem → the strip append →
 *              keptPreviews → PreparedSend → transfer.preview, only for an image name and the shape rule;
 *   RECEIVER · handleFileHeader keeps it only for an INCOMING stored row (offerPreviews.put — the accept rule) keyed by the
 *              chat + id, and tells an open chat on the main thread · noteOfferPreview gates on offerPreviewPushOk(the
 *              SAutoDownload mirror, SChatPrefs.photoPreviews, …) · the push re-checks both switches on the main thread,
 *              once per document · the shell never sees the peer's bytes: offerPreviewUriOf writes a temp file of C#'s
 *              own name, re-encodes it with makeViewerJpeg inside the gate and deletes it in a finally;
 *   ALBUM    · addFile carries arg 20 = offerSizeArg (bytes, a received file not here yet);
 *   SAVE     · ixian:savePhoto:<hex> → parseSavePhoto → the shown channel's message, image + on this device →
 *              SharedItems.localPathOf → the platform save UI; cap `savePhoto` declared; logs = types only.
 * ★ S11 G3 (#1263 round-3 — MINOR-4 · MINOR-5 · MINOR-6 · MINOR-8 · NIT-5): the touched C# bodies are pinned WHOLE
 * (comment-stripped, whitespace-normalised, equal to the text below — any one-token edit fails): the preview's contact
 * rule (noteOfferPreview → offerPreviewPushOk(…, autoDownloadContactOk)) · the ONE serial worker (enqueue → SerialQueue,
 * Task.Run only when it says so; the worker awaits the decode gate; every non-push path forgets the sent-key; the first
 * start sweeps C#-named temp leaves) · the auto-download pending queue's pump (StreamProcessor.handleFileData → the
 * slot hook → one main-thread pump → autoDownloadNow; the backstop re-check) · Android Save (the image MIME into the
 * picker; the copy off the UI thread). The pure halves run in csh (S11MediaTests · S11ChatTests).
 * Deliberate breaks (G-brk, G3-brk): see the S11 G / G3 reports. */
export default async function (h) {
  const { ok, root, readFileSync, join, stripCode } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const cs = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  const sp = stripCode(rd('Spixi/Network/StreamProcessor.cs'));
  /* ★ S11 G3: a WHOLE body (the c-wiring.mjs helper) */
  const bodyOf = (sc, head) => {
    const at = sc.indexOf(head);
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
  const norm = (x) => x.replace(/\s+/g, ' ').trim();
  const whole = (body, expected) => body.length > 0 && norm(body) === norm(expected);
  const between = (t, a, b) => { const i = t.indexOf(a); const j = i < 0 ? -1 : t.indexOf(b, i + a.length); return i < 0 || j < 0 ? '' : t.slice(i, j); };
  const r = {};
  /* SENDER */
  /* ★ S15 F re-base (#1302, Damir 2026-10-10): prepareOne makes the preview inside the one decode gate — on Android from the
     oriented bitmap already in memory (the makeViewerJpeg `derive` hook: the same no-metadata encoder), elsewhere from the
     prepared jpg as before; the MediaItem carries it, photoReady adds that item to the open batch (no finishPick append) */
  const prep = between(cs, 'private static MediaItem? prepareOne(', 'private bool prepAlive(');
  r.senderMake = /if \(mediaDecodeGate\.Wait\(60000\)\)\s*\{\s*try\s*\{\s*#if ANDROID[^]*?photo = Spixi\.SThumbnail\.makeViewerJpeg\(src, PhotoRules\.MaxEdge, \(scaled\) =>\s*\{\s*thumb = scaled\(PhotoRules\.ThumbEdge\);\s*offerPreview = S11MediaRules\.pickOfferPreview\(scaled\);\s*\}\);[^]*?#else[^]*?thumb = Spixi\.SThumbnail\.makeViewerJpeg\(jpg, PhotoRules\.ThumbEdge\);\s*string prepared = jpg;\s*offerPreview = S11MediaRules\.pickOfferPreview\(\(edge\) => Spixi\.SThumbnail\.makeViewerJpeg\(prepared, edge\)\);\s*\}\s*#endif\s*\}\s*finally\s*\{\s*mediaDecodeGate\.Release\(\);/.test(prep)
    && /return new MediaItem \{ k = -1, path = jpg, preview = offerPreview \};/.test(prep);
  r.senderCarry = /if \(item != null\)\s*\{\s*item\.k = k;\s*live\.items\.Add\(item\);\s*added = true;\s*\}/.test(cs)
    && /kept\.Add\(new KeyValuePair<string, string>\(uid, final\)\);\s*keptPreviews\.Add\(it\.preview\);/.test(cs)
    && /messageId = msgId,\s*preview = keptPreviews\[i\],\s*\};/.test(cs);
  const spf = between(cs, 'private FriendMessage? sendPreparedFile(', 'private sealed class PreparedSend');
  r.senderField = /if \(opts != null && opts\.preview != null && SharedItems\.isImageName\(fileName\)\s*&& S11MediaRules\.previewShapeOk\(opts\.preview, S11MediaRules\.OfferPreviewEdges\[0\]\)\)\s*\{\s*transfer\.preview = opts\.preview;\s*\}/.test(spf)
    && spf.indexOf('transfer.preview = opts.preview;') < spf.indexOf('new SpixiMessage(SpixiMessageCode.fileHeader, transfer.getBytes()')
    && (cs.match(/transfer\.preview\s*=/g) || []).length === 1;
  /* RECEIVER */
  const hfh = between(sp, 'public static void handleFileHeader(', 'public static void handleAcceptFile(');
  r.receiverKeep = /if \(fm != null && !fm\.localSender && fm\.id != null && transfer\.preview != null\s*&& S11MediaRules\.offerPreviews\.put\(S11MediaRules\.offerKey\(sender\.ToString\(\), Crypto\.hashToString\(fm\.id\)\), transfer\.preview\)\)\s*\{\s*FriendMessage offer = fm;\s*int offerChannel = data\.channel;\s*MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*try\s*\{\s*Utils\.getChatPage\(friend\)\?\.offerPreviewArrived\(offer, offerChannel\);/.test(hfh)
    && !/Logging\.\w+\([^;]*preview\b(?!\s*could)/.test(hfh.replace(/"[^"]*"/g, '""'));
  /* ★ S11 G3 (MINOR-4, the lead's decision): the preview follows the auto-download CONTACT rule — WHOLE */
  r.gate = whole(bodyOf(cs, 'private void noteOfferPreview('), `{ if (message == null || message.id == null || friend == null
      || !S11MediaRules.offerPreviewPushOk(SAutoDownload.loadPictures, SChatPrefs.photoPreviews, message.localSender, message.completed, SharedItems.isImageName(name), autoDownloadContactOk(friend, message))) { return; }
    string id = Crypto.hashToString(message.id);
    if (S11MediaRules.offerPreviews.raw(offerKeyOf(id)) == null) { return; }
    if (batch != null) { batch.offers.Add(new KeyValuePair<string, FriendMessage>(id, message)); return; }
    enqueueOfferPreview(id); }`);
  r.offerKey = /private string offerKeyOf\(string id\)\s*\{\s*return S11MediaRules\.offerKey\(friend != null \? friend\.walletAddress\.ToString\(\) : "", id\);/.test(cs);
  /* ★ S11 G3 (MINOR-5 · NIT-5): ONE process-wide serial worker over a bounded queue; the decode gate AWAITED; every path
     that did not push forgets the sent-key; the first start sweeps C#-named temp leaves — all WHOLE */
  r.pushOnce = whole(bodyOf(cs, 'private void enqueueOfferPreview(string id)'), `{ int doc = thumbDoc;
      string docPrefix = doc.ToString(System.Globalization.CultureInfo.InvariantCulture) + "|"; string sentKey = docPrefix + id;
      lock (offerPreviewsSent) { if (!offerPreviewsSent.Add(sentKey)) { return; } if (offerPreviewsSent.Count > 1024) { offerPreviewsSent.RemoveWhere(k => !k.StartsWith(docPrefix, StringComparison.Ordinal)); } }
      OfferJob job = new OfferJob(this, doc, id, sentKey, offerKeyOf(id));
      if (!offerJobs.enqueue(job, out bool startWorker)) { forgetOfferPreview(sentKey); return; }
      if (startWorker) { _ = Task.Run(() => offerPreviewWorkerAsync()); } }`)
    && /private static readonly S11MediaRules\.SerialQueue<OfferJob> offerJobs = new S11MediaRules\.SerialQueue<OfferJob>\(S11MediaRules\.OfferPreviewQueueMax\);/.test(cs)
    && (cs.match(/"setOfferPreview"/g) || []).length === 1 && (cs.match(/offerPreviewWorkerAsync\(\)/g) || []).length === 2
    && (cs.match(/offerJobs\.(?:enqueue|next)\(/g) || []).length === 2;
  r.worker = whole(bodyOf(cs, 'private static async Task offerPreviewWorkerAsync()'), `{ if (Interlocked.Exchange(ref offerTempsSwept, 1) == 0) { sweepOfferTemps(); }
      while (offerJobs.next(out OfferJob job)) { string? uri = null;
        try { uri = await offerPreviewUriOfAsync(job.key).ConfigureAwait(false); } catch (Exception e) { Logging.warn("offer preview failed: " + e.GetType().Name); uri = null; }
        try { job.page.finishOfferPreview(job, uri); } catch (Exception e) { Logging.warn("offer preview post failed: " + e.GetType().Name); job.page.forgetOfferPreview(job.sentKey); } } }`);
  r.finish = whole(bodyOf(cs, 'private void finishOfferPreview('), `{ if (uri == null) { forgetOfferPreview(job.sentKey); return; } string answer = uri;
      MainThread.BeginInvokeOnMainThread(() => { if (isDisposed || job.doc != thumbDoc || friend == null || !SChatPrefs.photoPreviews || !SAutoDownload.loadPictures) { forgetOfferPreview(job.sentKey); return; }
        Utils.sendUiCommand(this, "setOfferPreview", job.id, answer); }); }`)
    && whole(bodyOf(cs, 'private void forgetOfferPreview('), `{ lock (offerPreviewsSent) { offerPreviewsSent.Remove(sentKey); } }`);
  r.sweep = whole(bodyOf(cs, 'private static void sweepOfferTemps()'), `{ try { string dir = Microsoft.Maui.Storage.FileSystem.CacheDirectory;
      foreach (string f in Directory.EnumerateFiles(dir, S11MediaRules.OfferTempPrefix + "*.jpg", SearchOption.TopDirectoryOnly)) { if (!S11MediaRules.isOfferTempName(Path.GetFileName(f))) { continue; } try { File.Delete(f); } catch (Exception) { } } }
      catch (Exception e) { Logging.warn("offer preview sweep failed: " + e.GetType().Name); } }`);
  r.reencode = whole(bodyOf(cs, 'private static async Task<string?> offerPreviewUriOfAsync('), `{ string? done = S11MediaRules.offerPreviews.encoded(key); if (done != null) { return done; }
      byte[]? raw = S11MediaRules.offerPreviews.raw(key); if (raw == null) { return null; }
      string tmp = Path.Combine(Microsoft.Maui.Storage.FileSystem.CacheDirectory, S11MediaRules.offerTempName(Guid.NewGuid().ToString("N")));
      byte[]? encoded = null; bool entered = false;
      try { entered = await mediaDecodeGate.WaitAsync(S11MediaRules.OfferPreviewGateMs).ConfigureAwait(false);
        if (entered) { File.WriteAllBytes(tmp, raw); encoded = Spixi.SThumbnail.makeViewerJpeg(tmp, S11MediaRules.OfferPreviewEdges[0]); } }
      finally { if (entered) { mediaDecodeGate.Release(); } try { File.Delete(tmp); } catch (Exception) { } }
      string? uri = S11MediaRules.offerPreviewUri(encoded); if (uri != null) { S11MediaRules.offerPreviews.setEncoded(key, uri); } return uri; }`)
    && !/mediaDecodeGate\.Wait\(10000\)/.test(cs) && !/Convert\.ToBase64String\(raw\)/.test(cs);
  /* ★ S11 G3 (MINOR-6): the pending queue's pump — the per-packet hook, one main-thread pump, the backstop — WHOLE */
  r.slotHook = whole(bodyOf(sp, 'public static void handleFileData('), `{ Friend friend = FriendList.getFriend(sender);
      if (friend != null) { TransferManager.receiveFileData(data.data, sender); SingleChatPage.autoDownloadSlotMaybeFree(); }
      else { Logging.error("Received file data from an unknown friend."); } }`);
  r.slot = whole(bodyOf(cs, 'internal static void autoDownloadSlotMaybeFree()'), `{ if (!autoLedger.HasPending || Interlocked.Exchange(ref autoPumpPosted, 1) == 1) { return; }
      try { MainThread.BeginInvokeOnMainThread(autoDownloadPump); }
      catch (Exception e) { Interlocked.Exchange(ref autoPumpPosted, 0); Logging.warn("Media: the automatic download queue could not run (" + e.GetType().Name + ")"); } }`);
  r.pump = whole(bodyOf(cs, 'private static void autoDownloadPump()'), `{ Interlocked.Exchange(ref autoPumpPosted, 0);
      try { while (autoLedger.takeReady(Environment.TickCount64, id => TransferManager.getIncomingTransfer(id) != null, out _, out _, out object? tag)) { if (tag is AutoOffer o) { autoDownloadNow(o.friend, o.fm, o.channel); } } }
      catch (Exception e) { Logging.warn("Media: the automatic download queue failed (" + e.GetType().Name + ")"); }
      if (autoLedger.HasPending) { armAutoRecheck(); } }`);
  r.recheck = whole(bodyOf(cs, 'private static void armAutoRecheck()'), `{ if (Interlocked.Exchange(ref autoRecheckArmed, 1) == 1) { return; }
      Task.Delay(S11ChatRules.AutoPendingRecheckMs).ContinueWith(_ => { Interlocked.Exchange(ref autoRecheckArmed, 0); autoDownloadSlotMaybeFree(); }); }`);
  r.burst = /enqueueVoiceInfo\(v\.Key, v\.Value\);\s*\}\s*foreach \(KeyValuePair<string, FriendMessage> o in batch\.offers\)\s*\{\s*enqueueOfferPreview\(o\.Key\);\s*\}/.test(cs)
    && cs.indexOf('foreach (KeyValuePair<string, FriendMessage> o in batch.offers)') > cs.indexOf('Utils.sendUiCommand(this, "messagesDone");');
  /* ALBUM: arg 20 */
  r.arg20 = /string fSize = S11MediaRules\.offerSizeArg\(message\.localSender, message\.completed, fBytes\);/.test(cs)
    && /push\(batch, "addFile",[^;]*fGroup, fPlayed, fSize\);\s*noteThumbCandidate\(message, name, batch\);\s*noteOfferPreview\(message, name, batch\);/.test(cs);
  /* SAVE */
  r.saveBranch = /else if \(current_url\.StartsWith\("ixian:savePhoto:", StringComparison\.Ordinal\)\)\s*\{\s*onSavePhoto\(current_url\.Substring\("ixian:savePhoto:"\.Length\)\);\s*\}/.test(cs);
  const sv = between(cs, 'private void onSavePhoto(string tail)', 'private const int SelfAvatarPx');
  r.saveBody = /if \(!S11MediaRules\.parseSavePhoto\(tail, out string hexId\)\)\s*\{\s*noteSavePhoto\("parse"\);\s*return;/.test(sv)   /* ★ S12 D re-base (#1267): the probe names the exit first */
    && /friend\.getMessage\(selectedChannel, Crypto\.stringToHash\(hexId\)\)/.test(sv)
    && /fm\.type == FriendMessageType\.fileHeader && \(fm\.completed \|\| fm\.localSender\)\s*&& SharedItems\.parseFileHeader\(fm\.message, out string n, out _\) && SharedItems\.isImageName\(n\)/.test(sv)
    && /path = SharedItems\.localPathOf\(fm\);/.test(sv)
    /* ★ S12 D re-base (#1267): Windows now calls SFileOperations.saveAs and OBSERVES the task (pins-s12/d-save.mjs pins it
       whole); Android / iOS / Mac calls are unchanged */
    && /#if ANDROID\s*SFileOperations\.saveFile\(path, name, S11MediaRules\.imageMimeOf\(name\)\);\s*#elif WINDOWS\s*saving = SFileOperations\.saveAs\(path\);\s*#elif IOS \|\| MACCATALYST\s*_ = SFileOperations\.share\(path, name\);\s*#endif/.test(sv)
    && (sv.match(/Logging\.\w+\(([^;]*)\);/g) || []).every((l) => /^Logging\.warn\("[^"]+" \+ e\.GetType\(\)\.Name\);$/.test(l));
  /* ★ S11 G3 (MINOR-8): Android — the MIME reaches the picker (main thread); the copy runs off the UI thread */
  const AF = stripCode(rd('Spixi/Platforms/Android/SFileOperations.cs'));
  const AM = stripCode(rd('Spixi/Platforms/Android/MainActivity.cs'));
  r.androidSave = whole(bodyOf(AF, 'public static void saveFile(string filepath, string title, string mimeType = "application/octet-stream")'), `{ App.noteOwnIntentRoundTrip();
      var context = MainActivity.Instance; Intent saveIntent = new Intent(Intent.ActionCreateDocument); saveIntent.AddCategory(Intent.CategoryOpenable);
      saveIntent.SetType(string.IsNullOrEmpty(mimeType) ? "application/octet-stream" : mimeType); saveIntent.PutExtra(Intent.ExtraTitle, Path.GetFileName(filepath));
      saveIntent.AddFlags(ActivityFlags.GrantWriteUriPermission); context.SaveFilePath = filepath;
      try { context.StartActivityForResult(saveIntent, MainActivity.SaveFileId); } catch (Exception) { App.clearOwnIntentStamp(); throw; } }`)
    && whole(bodyOf(AM, 'else if (requestCode == SaveFileId && resultCode == Result.Ok && intent != null)'), `{ Android.Net.Uri? uri = intent.Data;
      if (uri != null) { string filePath = SaveFilePath; _ = Task.Run(() => SaveFileToUri(uri, filePath)); } }`)
    && (AM.match(/SaveFileToUri\(/g) || []).length === 2;
  r.cap = /caps \+= ",media";\s*caps \+= ",savePhoto";/.test(cs);
  /* the harness runs the rules */
  r.csh = /<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/S11MediaRules\.cs" \/>/.test(rd('scripts/csh/csh.csproj'))
    && /\[TestClass\]\s*public class S11MediaTests/.test(rd('scripts/csh/S11MediaTests.cs'));
  ok(Object.values(r).every((x) => x === true),
    '★★ S11 G (#1258 + #1263) C# wiring: the SENDER makes the ≤ 8 KB preview from the prepared photo inside the decode gate and carries it to transfer.preview (image names only); the RECEIVER keeps a peer preview only for an incoming stored row (the accept rule, keyed by chat + id), pushes setOfferPreview once per document only while Load pictures AND photo previews are on, after re-encoding it through the bounded decoder (temp file of C#\'s own name, deleted); addFile arg 20 = the offer size; ixian:savePhoto → C#\'s own file → the platform save UI, cap savePhoto · ★ S11 G3 (#1263): the preview only for a contact the auto-download rule accepts; ONE serial worker with an awaited decode gate, the sent-key forgotten on every non-push path, a start-up sweep of C#-named temp leaves; the auto-download pending queue pumped from the packet hook + a backstop; Android Save names the image MIME and copies off the UI thread (bodies WHOLE); the harness runs S11MediaRules — ' + JSON.stringify(r));
}
