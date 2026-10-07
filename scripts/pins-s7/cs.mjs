/* ==== SESSION 7 — agent B: the C# page + audio seams of #1207 (the capability ask) · #1208 (voice messages) ====
 * The pure rules (VoiceCodec, SpixiProtocols.claimAsk / supports) are EXECUTED in scripts/csh (agent A). The call sites
 * here — SingleChatPage, VoiceClips, the four platform recorders / players, VoIPManager, App — are MAUI-bound and compile
 * nowhere in this container, so they are pinned on comment-stripped source (stripCode keeps string literals): each pin
 * names the seam and the failure it prevents.
 * Deliberate breaks (#802) — run by the session-7 agent B; each failed exactly the named pin (15 / 15):
 *   SingleChatPage voiceCapFor: `!Utils.hidesParticipants(f)` → `true`                     → V1 caps
 *   SingleChatPage onLoad: askCapabilitiesOnce() moved out of the Task, before `Task.Run(`   → #1207 ask
 *   SingleChatPage updateMessage: drop the trailing `voice` arg                             → V2/V3 arg counts
 *   SingleChatPage voiceRowArg: `VoiceCodec.firstLine(message.message)` → `message.message`  → V2 first line
 *   SingleChatPage isVoiceFileRow: `size <= (ulong)VoiceCodec.MaxOggBytes` → `true`          → V3 voice file
 *   SingleChatPage isVoiceIdHex: `s.Length != VoiceIdHexLength` → `s.Length > 64`            → V7/V8 verbs
 *   SingleChatPage onVoiceSend: `peerSupportsVoice` → `true` in chooseRoute                   → V-send route
 *   SingleChatPage sendVoiceInline: + `Utils.sendUiCommand(this, "clearInput");`              → V-send no clearInput
 *                                                                (+ "no audio into the WebView": the same extra push)
 *   SingleChatPage sendVoiceFile: `Path.Combine(dir, n)` → `Path.Combine(dir, "x.ogg")`      → V-send file name
 *   VoiceClips.startRecording: the isInitiated() block moved after `new SAudioRecorder()`   → busy / denied
 *   SingleChatPage OnDisappearing: drop VoiceClips.interruptHost                             → interrupts
 *   Android SAudioPlayer: the voice AudioAttributes `.SetUsage(Media)` → VoiceCommunication   → playback media mode
 *   VoiceClips.onRecData: drop `len > VoiceCodec.MaxPacketBytes ||`                          → bounded
 *   VoiceClips.startRecording: `"Voice: recording started"` + key                            → logs
 *   SingleChatPage playVoiceFile: + `Utils.sendUiCommand(this, "voicePath", path)`           → no audio into the WebView
 * #46 round 1 (CONTRACT §7) — each failed exactly the named pin (28 / 28; two also fail a second pin for the same reason):
 *   SCP1 onVoicePlay: drop `&& isVoiceFileRow(fm, name)` (a download without a voice row — SECURITY) → r1 play gates
 *   SCP2 voiceAfterTransfer: drop `|| channel != selectedChannel`                       → r1 pending
 *   SCP3 voiceAfterTransfer: drop `&& want.doc == thumbDoc`                             → r1 pending
 *   SCP4 processVoiceInfo: drop `job.doc != thumbDoc`                                   → r1 waveform gates
 *   SCP5 isVoiceFileRow (r2 header-first form): `if (size == 0)` fileSize fallback → `if (size != 0)` → V3 voice file
 *   SCP6 onVoicePlay: the inline peek gate → `if (false)`                               → r1 play gates
 *   SCP7 onVoicePlay: drop `!VoiceCodec.rendersAsVoice(friend.bot)`                     → r1 play gates
 *   SCP8 onVoicePlay: the download gate → `!string.IsNullOrEmpty(fm.transferId)` only   → r1 play gates
 *   SCP9 processVoiceInfo: `!voiceInfoSent.Add(sentKey)` → `… && false`                 → r1 waveform gates
 *   SCP11 sendVoiceFile: drop the enqueueVoiceInfo after the send                       → r1 waveform gates
 *   SCP12 insertMessage: `fVoice == "1" && (completed || localSender)` → `fVoice == "1"` → r1 waveform gates
 *   startVoiceDownload: the no-transfer `error` block → `if (false)`                     → r1 download
 *   startVoiceDownload (r2): drop the `VoiceClips.stopPlayback(true);` after the transfer check → r1 download
 *   checkPendingVoicePlay: `|| neverStarted` → `|| false`                               → r1 pending
 *   findChannelMessageByTransfer: the deep read → `return null;`                        → r1 pending
 *   deleteMessage: drop `voiceRowDeleted(msg_id);`                                      → r1 pending
 *   OnDisappearing: drop `clearPendingVoicePlay(null);`                                 → r1 pending (+ interrupts)
 *   VoIPManager.initiateCall: interruptAll moved before the session id                  → r1 call ordering
 *   VoiceClips.startRecording: `callNow = VoIPManager.isInitiated()` → `false`          → r1 call ordering (+ r2 recorder publish)
 *   Windows SAudioRecorder.stop: `voiceFlushing = voiceMode` → `= false`                 → r1 recorder tail
 *   VoiceClips.playLoop: drop `join(prev);`                                             → r1 one play section
 *   VoiceClips.recTick: the push without its generation predicate                       → r1 recording resync
 *   voiceSendFailed: `"sendfail"` → `"error"`                                           → r1 send failure
 *   isVoiceIdHex: drop `s.Length % 2 != 0 ||`                                           → V7/V8 verbs
 *   onVoiceSend catch: `stored || packets == null` → `packets == null`                  → r1 send failure
 *   sendVoiceFile: the MaxOggBytes refusal → `if (false)`                               → r1 send failure
 *   withdrawVoiceFile: drop `deleteOwnVoiceFile(path);`                                 → r1 send failure (+ V-send file name)
 *   processVoiceInfo: drop the not-sent `voiceInfoSent.Remove(sentKey)`                 → r1 waveform gates
 * #46 round 2 — each failed exactly the named pin (14 / 14; one also fails a second pin for the same reason):
 *   clearPendingVoicePlay: drop the `stopped` push                                      → r2 pending answered
 *   onVoicePlay: `clearPendingVoicePlay(ownHex)` → a raw Interlocked.Exchange(…, null)   → r2 pending answered
 *   voiceAfterTransfer: drop `|| !isShownChat()`                                        → r2 pending answered
 *   isShownChat: the overlay rule → `return true;`                                      → r2 pending answered
 *   checkPendingVoicePlay: `stalled = want.goneTicks >= 2` → `= true`                   → r2 pending answered
 *   startRecording: startVoiceMessage moved after the publish                           → r2 recorder publish
 *   startRecording: drop the lost-race `r.Dispose()`                                    → r2 recorder publish
 *   sendPreparedFile: drop `removeOutgoingTransfer(transfer.uid)` on a null store       → r1 send failure
 *   withdrawVoiceFile: `removeOutgoingTransfer(sendPreparedUid)` → `stream?.Dispose()`  → r1 send failure
 *   VoiceClips.play: drop `&& !sameRow`                                                 → r2 nits
 *   voiceRowDeleted: the Task.Run → an inline Action                                    → r2 nits
 *   onVoicePlay: drop the no-row `pushVoiceState(idHex, "error", …)`                    → r1 play gates (+ V7/V8 verbs)
 *   isVoiceFileRow: drop the fileSize fallback                                          → V3 voice file */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, join } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const guard = async (name, fn) => { try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.message)); } };

  /* the body of the FIRST member whose header matches `head` (a string), by brace depth on stripped source
     (string / char literals are skipped so "{0}" never counts) */
  const bodyOf = (sc, head, from = 0) => {
    const at = sc.indexOf(head, from);
    if (at < 0) return '';
    let i = sc.indexOf('{', at);
    if (i < 0) return '';
    const start = i;
    let depth = 0;
    for (; i < sc.length; i++) {
      const c = sc[i];
      if (c === '"' || c === "'") {
        for (i++; i < sc.length && sc[i] !== c; i++) { if (sc[i] === '\\') i++; }
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return sc.slice(start, i + 1); }
    }
    return '';
  };
  /* the top-level argument list of the call that starts at `idx` (idx = the index of the call name) */
  const argsAt = (sc, idx) => {
    let i = sc.indexOf('(', idx);
    const args = [];
    let depth = 0, cur = '';
    for (; i < sc.length; i++) {
      const c = sc[i];
      if (c === '"' || c === "'") {
        let j = i + 1;
        for (; j < sc.length && sc[j] !== c; j++) { if (sc[j] === '\\') j++; }
        if (depth >= 1) cur += sc.slice(i, j + 1);
        i = j;
        continue;
      }
      if (c === '(') { depth++; if (depth === 1) continue; }
      else if (c === ')') { depth--; if (depth === 0) { args.push(cur.trim()); return args; } }
      else if (c === ',' && depth === 1) { args.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    return args;
  };
  const allCs = () => {
    const out = [];
    const walk = (dir) => {
      for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
        const p = dir + '/' + e.name;
        if (e.isDirectory()) { if (!/\/(bin|obj)$/.test(p)) walk(p); }
        else if (e.name.endsWith('.cs')) out.push(p);
      }
    };
    walk('Spixi');
    return out;
  };

  const SCP = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  const VC = stripCode(rd('Spixi/VoIP/VoiceClips.cs'));
  const VOIP = stripCode(rd('Spixi/VoIP/VoIPManager.cs'));
  const APP = stripCode(rd('Spixi/App.xaml.cs'));
  const PLAT = ['Android', 'iOS', 'MacCatalyst', 'Windows'];
  const recOf = (p) => stripCode(rd('Spixi/Platforms/' + p + '/SAudioRecorder.cs'));
  const plyOf = (p) => stripCode(rd('Spixi/Platforms/' + p + '/SAudioPlayer.cs'));
  /* the page's voice section: from its first constant to the end of askCapabilitiesOnce */
  const secAt = SCP.indexOf('private const int VoiceInfoQueueMax = 128;');
  const askAt = SCP.indexOf('private void askCapabilitiesOnce()');
  const SEC = secAt >= 0 && askAt > secAt ? SCP.slice(secAt, askAt + bodyOf(SCP, 'private void askCapabilitiesOnce()').length + 40) : '';

  /* ———— V1: setCaps declares `voice` for an approved 1:1 / a non-blind private group only, in the ONE setCaps push ———— */
  await guard('V1 caps', async () => {
    const add = /caps\s*\+=\s*",edit";\s*\}\s*if\s*\(\s*voiceCapFor\(friend\)\s*\)\s*\{\s*caps\s*\+=\s*",voice";\s*\}\s*caps\s*\+=\s*",media";\s*#if ANDROID \|\| IOS\s*if\s*\(\s*SFilePicker\.CameraAvailable\(\)\s*\)\s*\{\s*caps\s*\+=\s*",camera";\s*\}\s*#endif\s*Utils\.sendUiCommand\(this,\s*"setCaps",\s*caps\);/.test(SCP);   /* ★ S9 A1 re-base: + the media / camera caps (CONTRACT §1a) */
    const one = (SCP.match(/"setCaps"/g) || []).length === 1 && (SCP.match(/",voice"/g) || []).length === 1;
    const rule = /public static bool voiceCapFor\(Friend\? f\)\s*\{\s*return f != null && !f\.bot && f\.state == FriendState\.Approved\s*&& \(f\.type == FriendType\.Normal \|\| \(f\.type == FriendType\.Group && !Utils\.hidesParticipants\(f\)\)\);\s*\}/.test(SCP);
    /* the verbs re-check it (a shell that sends without the cap gets nothing) */
    const recheck = /if\s*\(\s*!voiceCapFor\(friend\)\s*\)\s*\{\s*Logging\.warn\("Voice: recording refused \(notAllowed\)"\);/.test(bodyOf(SCP, 'private void onVoiceRecStart()'))
      && /if\s*\(\s*!voiceCapFor\(friend\)\s*\)\s*\{\s*Logging\.warn\("Voice: send refused \(notAllowed\)"\);/.test(bodyOf(SCP, 'private void onVoiceSend()'));
    ok(add && one && rule && recheck,
      'V1 C#: setCaps adds ",voice" (after reply / edit, before the ONE push) when voiceCapFor(friend) — not a bot, Approved, a normal 1:1 or a group that does not hide its members (Utils.hidesParticipants fails closed); onVoiceRecStart and onVoiceSend re-check it — '
      + JSON.stringify({ add, one, rule, recheck }));
  });

  /* ———— #1207: the ask — ONE call site, in onLoad's background Task, through SpixiProtocols.claimAsk ———— */
  await guard('#1207 ask', async () => {
    const m = bodyOf(SCP, 'private void askCapabilitiesOnce()');
    const claim = /if\s*\(\s*SpixiProtocols\.claimAsk\(f\.walletAddress\.ToString\(\),\s*true,\s*f\.type\s*==\s*FriendType\.Normal,\s*f\.bot,\s*f\.approved\s*&&\s*f\.state\s*==\s*FriendState\.Approved\)\s*\)\s*\{\s*CoreStreamProcessor\.sendGetAppProtocols\(f\);\s*Logging\.info\("Capability ask sent \(chat open\)"\);\s*\}/.test(m);
    let sends = 0;
    for (const f of allCs()) sends += (stripCode(rd(f)).match(/sendGetAppProtocols\(/g) || []).length;
    const calls = (SCP.match(/askCapabilitiesOnce\(\)/g) || []).length === 2;   // the definition + ONE call
    const ol = bodyOf(SCP, 'private void onLoad()');
    const iTask = ol.indexOf('Task.Run(async () =>');
    const iAsk = ol.indexOf('askCapabilitiesOnce();');
    const inTask = iTask >= 0 && iAsk > iTask && iAsk > ol.indexOf('loadApps();', iTask);
    const caught = /catch\s*\(Exception e\)\s*\{\s*Logging\.warn\("Capability ask failed \(" \+ e\.GetType\(\)\.Name \+ "\)"\);\s*\}/.test(m);
    ok(claim && sends === 1 && calls && inTask && caught,
      '#1207 C#: the capability ask = CoreStreamProcessor.sendGetAppProtocols(friend) ONLY when SpixiProtocols.claimAsk(address, known, Normal, bot, approved && Approved) says so (once per contact per run), the one send site in Spixi, called once — inside onLoad\'s Task.Run after loadApps (off the UI thread); a throw logs its TYPE — '
      + JSON.stringify({ claim, sends, calls, inTask, caught }));
  });

  /* ———— V2 / V3: EVERY addMe / addThem / addFile / updateMessage builder carries the voice arg ———— */
  await guard('V2/V3 arg counts', async () => {
    const sites = [];
    for (const f of allCs()) {
      const sc = stripCode(rd(f));
      for (const x of sc.matchAll(/\bpush\(\s*batch\s*,\s*prefix\s*,/g)) sites.push({ f, kind: 'row', a: argsAt(sc, x.index) });
      for (const x of sc.matchAll(/(?:sendUiCommand|push)\([^;]*?"(addMe|addThem)"/g)) sites.push({ f, kind: 'literal-' + x[1], a: argsAt(sc, x.index) });
      for (const x of sc.matchAll(/\bpush\(\s*batch\s*,\s*"addFile"/g)) sites.push({ f, kind: 'file', a: argsAt(sc, x.index) });
      for (const x of sc.matchAll(/sendUiCommand\(\s*this\s*,\s*"updateMessage"/g)) sites.push({ f, kind: 'update', a: argsAt(sc, x.index) });
    }
    const rows = sites.filter((s) => s.kind === 'row');
    const files = sites.filter((s) => s.kind === 'file');
    const updates = sites.filter((s) => s.kind === 'update');
    const literal = sites.filter((s) => s.kind.startsWith('literal'));
    // push(batch, prefix, id, address, nick, avatar, text, ts, sent, confirmed, read, paid, err, relation, replyTo, edited, quoteName, quoteText, voice, played)
    // ★ S9 A3 re-base (8-FACE #1247): arg 18 `played` (rowPlayed) trails arg 17 voice — 19 → 20 entries
    const rowOk = rows.length === 1 && rows.every((s) => s.a.length === 20 && s.a[6] === 'rowText' && s.a[18] === 'rowVoice' && s.a[19] === 'rowPlayed');
    // push(batch, "addFile", id, address, nick, avatar, uid, name, ts, me, confirmed, read, progress, complete, paid, sent, transfer, local, voice)
    const fileOk = files.length === 1 && files.every((s) => s.a.length === 21 && s.a[16] === 'fTransfer' && s.a[17] === 'fLocal' && s.a[18] === 'fVoice' && s.a[19] === 'fGroup' && s.a[20] === 'fPlayed')   /* ★ S9 A1 r1 re-base: + arg 19 fPlayed */;   /* ★ S9 A1 re-base: + arg 18 fGroup (CONTRACT §1c) */
    // sendUiCommand(this, "updateMessage", id, text, sent, confirmed, read, paid, err, edited, replyTo, quoteName, quoteText, voice, played)
    // ★ S9 A3 re-base (8-FACE #1247): arg 13 `played` trails arg 12 voice — 14 → 15 entries
    const updOk = updates.length === 1 && updates.every((s) => s.a.length === 15 && s.a[3] === 'rowText' && s.a[13] === 'voice' && /^voicePlayedArg\(message,\s*voice\)$/.test(s.a[14]));
    ok(literal.length === 0 && rowOk && fileOk && updOk,
      'V2/V3 C#: the ONE addMe / addThem builder carries 18 args (17 = rowVoice, 18 = rowPlayed — S9), the ONE addFile builder 17 (17 = fVoice after fTransfer, fLocal), the ONE updateMessage builder 13 (12 = voice, 13 = played — S9); no literal addMe / addThem push — '
      + JSON.stringify({ literal: literal.length, rows: rows.map((s) => s.f + ':' + s.a.length), files: files.map((s) => s.f + ':' + s.a.length), updates: updates.map((s) => s.f + ':' + s.a.length), rowOk, fileOk, updOk }));
  });

  /* ———— V2: a voice row's arg 5 is its FIRST LINE only (never the base64), no reply / edit args; decided AFTER the reply
     match, so nothing later can put the full text back ———— */
  await guard('V2 first line', async () => {
    const v = bodyOf(SCP, 'private string voiceRowArg(FriendMessage message, ref string rowText, ref string replyTo, ref string edited, ref string quoteName, ref string quoteText)');
    const rule = /if\s*\(\s*message\.type\s*!=\s*FriendMessageType\.standard\s*\|\|\s*!VoiceCodec\.tryPeekInline\(message\.message,\s*out int durMs\)\s*\)\s*\{\s*return "";\s*\}\s*rowText\s*=\s*VoiceCodec\.firstLine\(message\.message\);\s*replyTo\s*=\s*"";\s*edited\s*=\s*"";\s*quoteName\s*=\s*"";\s*quoteText\s*=\s*"";\s*return VoiceCodec\.rendersAsVoice\(friend\.bot\)\s*\?\s*durMs\.ToString\(System\.Globalization\.CultureInfo\.InvariantCulture\)\s*:\s*"";/.test(v);
    const ins = bodyOf(SCP, 'private void insertMessage(FriendMessage message, int channel, UiBatch? batch)');
    const upd = bodyOf(SCP, 'public void updateMessage(FriendMessage message, int channel)');
    const after = (b, call, push) => {
      const iCall = b.indexOf(call);
      const iLastText = Math.max(b.lastIndexOf('rowText = rm.body;'), b.lastIndexOf('string rowText = message.message;'));
      const iPush = b.indexOf(push);
      return iCall > iLastText && iLastText >= 0 && iPush > iCall && (b.match(/\browText\s*=/g) || []).length === 2;
    };
    const insOk = after(ins, 'string rowVoice = voiceRowArg(message, ref rowText, ref reply_to, ref edited, ref quoteName, ref quoteText);', 'push(batch, prefix,');
    const updOk = after(upd, 'string voice = voiceRowArg(message, ref rowText, ref replyTo, ref edited, ref quoteName, ref quoteText);', '"updateMessage",');
    /* the waveform job follows the row push */
    const note = /push\(batch,\s*prefix,[^;]*rowVoice, rowPlayed\);\s*if\s*\(\s*rowVoice\s*!=\s*""\s*\)\s*\{\s*noteVoiceInfo\(message,\s*batch\);\s*\}/.test(ins);   // ★ S9 A3 re-base (8-FACE #1247): + arg 18 rowPlayed after rowVoice
    ok(rule && insOk && updOk && note,
      'V2 C#: voiceRowArg — an inline voice text (VoiceCodec.tryPeekInline, no decode) shows VoiceCodec.firstLine ONLY (never the base64), clears reply / edited / quote, and answers the duration (rendersAsVoice: a bot room → plain first line, ""); called in insertMessage AND updateMessage after the last rowText assignment and before the push; the waveform job is queued after the row push — '
      + JSON.stringify({ rule, insOk, updOk, note }));
  });

  /* ———— V3: a voice FILE row = C#'s name rule + the size cap + not a bot room ———— */
  await guard('V3 voice file', async () => {
    const r = bodyOf(SCP, 'private bool isVoiceFileRow(FriendMessage message, string name)');
    const rule = /if\s*\(\s*message\.type\s*!=\s*FriendMessageType\.fileHeader\s*\|\|\s*!VoiceCodec\.isVoiceFileName\(name\)\s*\|\|\s*!VoiceCodec\.rendersAsVoice\(friend\.bot\)\s*\)\s*\{\s*return false;\s*\}/.test(r)
      && /ulong size\s*=\s*0;\s*if\s*\(\s*SharedItems\.parseFileHeader\(message\.message,\s*out _,\s*out ulong headerSize\)\s*\)\s*\{\s*size\s*=\s*headerSize;\s*\}\s*if\s*\(\s*size == 0\s*\)\s*\{\s*size\s*=\s*message\.fileSize;\s*\}\s*return size == 0 \|\| size <= \(ulong\)VoiceCodec\.MaxOggBytes;/.test(r);   // #46 r2: the HEADER size first (both devices), fileSize only without one
    const arg = /private string voiceFileArg\(FriendMessage message, string name\)\s*\{\s*return isVoiceFileRow\(message, name\) \? "1" : "";\s*\}/.test(SCP);
    const ins = bodyOf(SCP, 'private void insertMessage(FriendMessage message, int channel, UiBatch? batch)');
    const used = /string fVoice\s*=\s*voiceFileArg\(message,\s*name\);/.test(ins);
    ok(rule && arg && used,
      'V3 C#: addFile arg 17 = "1" only for VoiceCodec.isVoiceFileName(name) && (size unknown || ≤ MaxOggBytes) && rendersAsVoice (not a bot room) — ' + JSON.stringify({ rule, arg, used }));
  });

  /* ———— V7 / V8: the verbs — exact strings, ordinal; the play id follows parseMessageIdHex's rule (§7), looked up in C#'s own list ———— */
  await guard('V7/V8 verbs', async () => {
    const iChat = SCP.indexOf('current_url.StartsWith("ixian:chat:")');
    const verb = (re) => { const m = re.exec(SCP); return m ? m.index : -1; };
    const iStart = verb(/else if \(current_url\.Equals\("ixian:voicerec:start", StringComparison\.Ordinal\)\)\s*\{\s*onVoiceRecStart\(\);\s*\}/);
    const iCancel = verb(/else if \(current_url\.Equals\("ixian:voicerec:cancel", StringComparison\.Ordinal\)\)\s*\{\s*onVoiceRecCancel\(\);\s*\}/);
    const iSend = verb(/else if \(current_url\.Equals\("ixian:voicerec:send", StringComparison\.Ordinal\)\)\s*\{\s*onVoiceSend\(\);\s*\}/);
    const iPlay = verb(/else if \(current_url\.StartsWith\("ixian:voiceplay:", StringComparison\.Ordinal\)\)\s*\{\s*onVoicePlay\(current_url\.Substring\("ixian:voiceplay:"\.Length\)\);\s*\}/);
    const order = [iStart, iCancel, iSend, iPlay].every((i) => i > 0 && i < iChat);
    const once = (SCP.match(/current_url\.Equals\("ixian:voicerec:/g) || []).length === 3 && (SCP.match(/current_url\.StartsWith\("ixian:voice/g) || []).length === 1;
    const hex = !/VoiceIdHexLength/.test(SCP)
      && /private static bool isVoiceIdHex\(string\? s\)\s*\{\s*if\s*\(\s*s\s*==\s*null\s*\|\|\s*s\.Length\s*<\s*2\s*\|\|\s*s\.Length\s*%\s*2\s*!=\s*0\s*\|\|\s*s\.Length\s*>\s*2\s*\*\s*CoreConfig\.maxMessageIdSize\s*\)\s*\{\s*return false;\s*\}\s*foreach\s*\(char c in s\)\s*\{\s*bool hex\s*=\s*\(c >= '0' && c <= '9'\) \|\| \(c >= 'a' && c <= 'f'\) \|\| \(c >= 'A' && c <= 'F'\);\s*if\s*\(\s*!hex\s*\)\s*\{\s*return false;\s*\}\s*\}\s*return true;\s*\}/.test(SCP);
    const p = bodyOf(SCP, 'private void onVoicePlay(string idHex)');
    const first = /^\{\s*string\?\s*ownHex\s*=\s*null;\s*try\s*\{\s*if\s*\(\s*!isVoiceIdHex\(idHex\)\s*\)\s*\{\s*Logging\.warn\("ixian:voiceplay: the id is not usable"\);\s*return;\s*\}/.test(p);
    const lookup = /byte\[\]\?\s*id\s*=\s*parseMessageIdHex\(idHex\);\s*int channel\s*=\s*selectedChannel;\s*FriendMessage\?\s*fm\s*=\s*id != null \? findChannelMessage\(channel, id\) : null;/.test(p)
      && /\bownHex\s*=\s*Crypto\.hashToString\(fm\.id\);/.test(p);
    /* after the lookup the WebView's hex is never used again: idHex appears only in the grammar check and the parse */
    const shellHexUses = (p.match(/\bidHex\b/g) || []).length === 3 && /Logging\.warn\("ixian:voiceplay: no voice row holds the id"\);\s*pushVoiceState\(idHex,\s*"error",\s*0,\s*0\);\s*return;/.test(p);   // #46 r2: a valid id with no row → `error` (the hex passed the grammar)
    const toggle = /if\s*\(\s*VoiceClips\.toggleIfCurrent\(this,\s*ownHex\)\s*\)\s*\{\s*return;\s*\}/.test(p);
    ok(order && once && hex && first && lookup && shellHexUses && toggle,
      'V7/V8 C#: ixian:voicerec:start|cancel|send are EXACT ordinal strings and ixian:voiceplay: an ordinal prefix, all before ixian:chat:; the play id must pass parseMessageIdHex\'s rule (isVoiceIdHex: even, 2..2×maxMessageIdSize hex — §7) before anything else, the row is found in C#\'s own list of the open channel (findChannelMessage), and only C#\'s own hex (ownHex) reaches VoiceClips / a push — '
      + JSON.stringify({ iStart, iCancel, iSend, iPlay, iChat, order, once, hex, first, lookup, shellHexUses, toggle }));
  });

  /* ———— the send: the route is VoiceCodec.chooseRoute with SpixiProtocols.supports(friend.supportedProtocols, VoiceId) ———— */
  await guard('V-send route', async () => {
    const m = bodyOf(SCP, 'private void onVoiceSend()');
    const peer = /bool peerSupportsVoice\s*=\s*SpixiProtocols\.supports\(friend\.supportedProtocols,\s*SpixiProtocols\.VoiceId\);/.test(m);
    const route = /VoiceCodec\.Route route\s*=\s*VoiceCodec\.chooseRoute\(friend\.type\s*==\s*FriendType\.Normal,\s*friend\.bot,\s*friend\.approved\s*&&\s*friend\.state\s*==\s*FriendState\.Approved,\s*peerSupportsVoice,\s*inlineText\s*!=\s*null\s*\?\s*inlineText\.Length\s*:\s*0,\s*CoreConfig\.maxChatMessageSize\);/.test(m);
    const text = /string\?\s*payload\s*=\s*VoiceCodec\.encodeInline\(packets\);\s*string\?\s*inlineText\s*=\s*payload\s*!=\s*null\s*\?\s*VoiceCodec\.humanLine\(durMs\)\s*\+\s*"\\n"\s*\+\s*payload\s*:\s*null;/.test(m);
    const pick = /bool sent\s*=\s*route\s*==\s*VoiceCodec\.Route\.Inline\s*&&\s*inlineText\s*!=\s*null\s*\?\s*sendVoiceInline\(inlineText,\s*ref stored\)\s*:\s*sendVoiceFile\(packets,\s*ref stored\);/.test(m);
    const keep = (m.match(/voiceSendFailed\(key,\s*packets\);/g) || []).length === 3 && /pushVoiceRec\("idle",\s*0\);\s*\}\s*catch/.test(m);
    ok(peer && route && text && pick && keep,
      'V-send C#: onVoiceSend routes with VoiceCodec.chooseRoute(normal 1:1, bot, approved && Approved, SpixiProtocols.supports(friend.supportedProtocols, VoiceId), the inline text length, CoreConfig.maxChatMessageSize); the inline text = humanLine + "\\n" + encodeInline; Inline → sendVoiceInline else sendVoiceFile; every failure before the store gives the clip back (voiceSendFailed), a send ends with `idle` — '
      + JSON.stringify({ peer, route, text, pick, keep }));
  });

  /* ———— the inline send is onSend's plain path WITHOUT clearInput (the composer's text draft stays) ———— */
  await guard('V-send no clearInput', async () => {
    const m = bodyOf(SCP, 'private bool sendVoiceInline(string text, ref bool stored)');
    const path = /SpixiMessage spixi_message\s*=\s*new SpixiMessage\(SpixiMessageCode\.chat,\s*Encoding\.UTF8\.GetBytes\(text\),\s*selectedChannel\);[\s\S]*FriendMessage\?\s*friend_message\s*=\s*Node\.addMessageWithType\(null,\s*FriendMessageType\.standard,\s*friend\.walletAddress,\s*selectedChannel,\s*text,\s*true,\s*null,\s*0,\s*true,\s*true,\s*spixi_msg_bytes\.Length\);\s*if\s*\(\s*friend_message\s*==\s*null\s*\)\s*\{[^}]*return false;\s*\}\s*stored\s*=\s*true;\s*CoreStreamProcessor\.sendChatMessage\(friend,\s*friend_message,\s*selectedChannel\);\s*return true;/.test(m);
    const noClear = SEC.length > 0 && !/clearInput/.test(SEC);
    ok(path && noClear,
      'V-send C#: sendVoiceInline = SpixiMessageCode.chat · Node.addMessageWithType(null, standard, …, local, …, the message size) · a null store sends nothing · CoreStreamProcessor.sendChatMessage — and NO clearInput anywhere in the voice section — ' + JSON.stringify({ path, noClear, sec: SEC.length }));
  });

  /* ———— the FILE route: C# names (VoiceCodec.voiceFileName) and places (its own folder) the .ogg; no WebView value reaches a
     file op — every path in the voice section is C#'s (the folder, the name it made, or SharedItems.localPathOf) ———— */
  await guard('V-send file name', async () => {
    const m = bodyOf(SCP, 'private bool sendVoiceFile(List<byte[]> packets, ref bool stored)');
    const folder = /private static string voiceFolder\(\)\s*\{\s*return Path\.Combine\(Config\.spixiUserFolder,\s*"Voice"\);\s*\}/.test(SCP);
    const name = /string dir\s*=\s*voiceFolder\(\);/.test(m) && /string n\s*=\s*VoiceCodec\.voiceFileName\(utc\.AddSeconds\(i\)\);\s*string p\s*=\s*Path\.Combine\(dir,\s*n\);/.test(m)
      && /new FileStream\(p,\s*FileMode\.CreateNew,\s*FileAccess\.Write,\s*FileShare\.None\)/.test(m) && /DateTime utc\s*=\s*DateTime\.UtcNow;/.test(m);
    const send = /friend_message\s*=\s*sendPreparedFile\(name,\s*stream,\s*path\);/.test(m) && /new FileStream\(path,\s*FileMode\.Open,\s*FileAccess\.Read,\s*FileShare\.Read\)/.test(m)
      && /if\s*\(\s*friend\.bot\s*\|\|\s*Utils\.hidesParticipants\(friend\)\s*\)\s*\{[^}]*return false;\s*\}/.test(m);
    const mux = /VoiceCodec\.muxOgg\(packets,\s*VoiceCodec\.DefaultPreSkip,\s*BitConverter\.ToUInt32\(serial,\s*0\)\)/.test(m) && /RandomNumberGenerator\.GetBytes\(4\)/.test(m);
    /* every assignment of a path-ish local in the section comes from C#: the made name or SharedItems.localPathOf */
    const assigns = [...SEC.matchAll(/\b(path|name|p|dir)\s*=(?!=)\s*([^;]+);/g)].map((x) => x[1] + '=' + x[2].trim());
    const allowed = /^(path=p|name=n|path=null|name=null|p=Path\.Combine\(dir, n\)|dir=voiceFolder\(\)|path=SharedItems\.localPathOf\(fm\)|path=SharedItems\.localPathOf\(fm!\))$/;
    /* the deletes take only C#'s own paths (the made name, or the sent file's path) */
    const dels = [...SEC.matchAll(/deleteOwnVoiceFile\(([^)]+)\)/g)].map((x) => x[1].trim()).filter((a) => a !== 'string path');
    const delsOk = dels.length === 3 && dels.every((a) => a === 'p' || a === 'path') && /private static void deleteOwnVoiceFile\(string path\)\s*\{\s*try\s*\{\s*File\.Delete\(path\);/.test(SEC);
    const cleanAssigns = assigns.length >= 5 && assigns.every((a) => allowed.test(a));
    /* the file reads take only C#'s path */
    const reads = [...SEC.matchAll(/readVoiceFile\(([^,]+),/g)].map((x) => x[1].trim()).filter((a) => a !== 'string path');   // the declaration
    const readsOk = reads.length >= 2 && reads.every((a) => a === 'path' || a === 'path!');
    const playPath = /string\?\s*path\s*=\s*SharedItems\.localPathOf\(fm\);[^\n]*\s*if\s*\(\s*path\s*!=\s*null\s*\)\s*\{\s*string fileHex\s*=\s*ownHex;\s*Task\.Run\(\(\)\s*=>\s*playVoiceFile\(fileHex,\s*path\)\);/.test(bodyOf(SCP, 'private void onVoicePlay(string idHex)'));
    const bounded = /byte\[\]\s*buf\s*=\s*new byte\[VoiceCodec\.MaxOggBytes \+ 1\];/.test(SCP) && /if\s*\(\s*n\s*<=\s*0\s*\|\|\s*n\s*>\s*VoiceCodec\.MaxOggBytes\s*\)\s*\{\s*return false;\s*\}/.test(SCP);
    ok(folder && name && send && mux && cleanAssigns && delsOk && readsOk && playPath && bounded,
      'V-send C#: the voice FILE is muxed (muxOgg, a random serial) and written under VoiceCodec.voiceFileName(UtcNow [+ s]) in C#\'s own <spixiUserFolder>/Voice (CreateNew — never an overwrite), then sent by sendPreparedFile; never in a bot room / blind group; every path in the voice section is C#\'s (the made name or SharedItems.localPathOf), the reads take only that and stop at MaxOggBytes + 1 — '
      + JSON.stringify({ folder, name, send, mux, cleanAssigns, assigns, delsOk, dels, readsOk, reads, playPath, bounded }));
  });

  /* ———— busy / denied: a call blocks record (busy) and play (nothing); no mic permission → the OS request + denied ———— */
  await guard('busy / denied', async () => {
    const s = bodyOf(VC, 'public static VoiceRecStart startRecording(IVoiceHost host)');
    const iBusy = s.search(/if\s*\(\s*VoIPManager\.isInitiated\(\)\s*\)\s*\{\s*Logging\.info\("Voice: recording refused \(busy\)"\);\s*return VoiceRecStart\.Busy;\s*\}/);
    const iDenied = s.search(/if\s*\(\s*!SSpixiPermissions\.hasAudioRecordingPermissions\(\)\s*\)\s*\{\s*try\s*\{\s*SSpixiPermissions\.requestAudioRecordingPermissions\(\);\s*\}[\s\S]*?return VoiceRecStart\.Denied;\s*\}/);
    const iNew = s.indexOf('new SAudioRecorder()');
    const order = iBusy >= 0 && iDenied > iBusy && iNew > iDenied;
    const pl = bodyOf(VC, 'public static void play(IVoiceHost host, string idHex, List<byte[]> packets, int durMs)');
    /* §7: a play tap during a call is ANSWERED — `stopped` with the clip's length, never silent */
    const playBusy = /if\s*\(\s*VoIPManager\.isInitiated\(\)\s*\)\s*\{\s*Logging\.info\("Voice: play refused \(call active\)"\);\s*host\.pushVoiceState\(idHex,\s*"stopped",\s*0,\s*dur\);\s*return;\s*\}/.test(pl);
    const resumeBusy = /^\{\s*if\s*\(\s*VoIPManager\.isInitiated\(\)\s*\)\s*\{\s*Logging\.info\("Voice: play refused \(call active\)"\);\s*stopPlayback\(true\);\s*return;\s*\}/.test(bodyOf(VC, 'private static void resumePlayback()'));
    const vp = bodyOf(SCP, 'private void onVoicePlay(string idHex)');
    const pageBusy = /if\s*\(\s*VoIPManager\.isInitiated\(\)\s*\)\s*\{\s*Logging\.info\("Voice: play refused \(call active\)"\);\s*int callDur\s*=[^;]*;\s*pushVoiceState\(ownHex,\s*"stopped",\s*0,\s*callDur\);\s*return;\s*\}/.test(vp) && vp.indexOf('VoIPManager.isInitiated()') < vp.indexOf('VoiceClips.toggleIfCurrent(');
    const st = bodyOf(SCP, 'private void onVoiceRecStart()');
    const map = /case VoiceRecStart\.Busy:\s*pushVoiceRec\("busy",\s*0\);\s*break;\s*case VoiceRecStart\.Denied:\s*pushVoiceRec\("denied",\s*0\);\s*break;/.test(st)
      && /case VoiceRecStart\.Kept:\s*pushVoiceRec\("stopped",\s*VoiceClips\.keptMs\(voiceChatKey\)\);/.test(st);
    ok(order && playBusy && resumeBusy && pageBusy && map,
      'busy / denied C#: VoiceClips.startRecording refuses with Busy while VoIPManager.isInitiated(), then — no mic permission — fires SSpixiPermissions.requestAudioRecordingPermissions and answers Denied, both BEFORE any recorder exists; play / resume / ixian:voiceplay during a call answer `stopped` (§7) and play nothing; the page pushes voiceRec busy / denied (a kept clip → stopped with its length) — '
      + JSON.stringify({ iBusy, iDenied, iNew, order, playBusy, resumeBusy, pageBusy, map }));
  });

  /* ———— interrupts: leave · background · a call · a voice play → the recording stops and is KEPT; the clip stops ———— */
  await guard('interrupts', async () => {
    const leave = /protected override void OnDisappearing\(\)\s*\{\s*VoiceClips\.interruptHost\(this,\s*"left"\);\s*clearPendingVoicePlay\(null\);\s*webView = null;\s*base\.OnDisappearing\(\);\s*if \(isDisposed\)\s*\{\s*dropMediaBatch\(\);\s*\}\s*\}/.test(SCP);   /* ★ S9 A1 #46 r1 re-base (m-2): a torn-down page drops its prepared photos after the base teardown */
    const bg = /#if ANDROID \|\| IOS\s*SPIXI\.VoIP\.VoiceClips\.interruptAll\("background"\);\s*#endif/.test(bodyOf(APP, 'protected override void OnSleep()'));
    const call = (VOIP.match(/VoiceClips\.interruptAll\("call"\);/g) || []).length === 2
      && bodyOf(VOIP, 'public static void initiateCall(Friend friend)').includes('VoiceClips.interruptAll("call");')
      && /rejectCall\(session_id\);\s*return false;\s*\}\s*VoiceClips\.interruptAll\("call"\);\s*aquirePowerLocks\(\);/.test(bodyOf(VOIP, 'public static bool onReceivedCall('));
    const all = /endRecording\(true,\s*why,\s*true\);\s*stopPlayback\(true\);/.test(bodyOf(VC, 'public static void interruptAll(string why)'));
    const play = /endRecording\(true,\s*"play",\s*true\);/.test(bodyOf(VC, 'public static void play(IVoiceHost host, string idHex, List<byte[]> packets, int durMs)'));
    const er = bodyOf(VC, 'private static List<byte[]>? endRecording(bool keep, string why, bool push)');
    const keep = /if\s*\(\s*key != null && packets != null && packets\.Count > 0\s*\)\s*\{\s*lock \(gate\)\s*\{\s*putKeptLocked\(key,\s*packets\);\s*\}/.test(er) && er.indexOf('if (!keep)') < er.indexOf('putKeptLocked(');
    const tick = /if\s*\(\s*h == null \|\| !h\.voiceHostAlive\s*\)\s*\{\s*endRecording\(true,\s*"left",\s*false\);\s*return;\s*\}/.test(bodyOf(VC, 'private static void recTick(int gen)'));
    const full = /full\s*=\s*live && target\.Count >= MaxRecPackets;/.test(VC) && /public const int MaxRecPackets = VoiceCodec\.MaxDurationMs \/ VoiceCodec\.FrameMs;/.test(VC) && /endRecording\(true,\s*"full",\s*true\);/.test(VC);
    const reload = /int keptVoiceMs\s*=\s*VoiceClips\.documentLoaded\(this\);\s*if\s*\(\s*keptVoiceMs > 0\s*\)\s*\{\s*pushVoiceRec\("stopped",\s*keptVoiceMs\);\s*\}/.test(bodyOf(SCP, 'private void onLoad()'));
    const memOnly = !/\bFile\.|FileStream|Directory\.|Preferences/.test(VC);
    ok(leave && bg && call && all && play && keep && tick && full && reload && memOnly,
      'interrupts C#: OnDisappearing (VoiceClips.interruptHost), App.OnSleep on the phones, VoIPManager.initiateCall / onReceivedCall (after the codec refusal) and a voice play stop the recording and KEEP the clip (memory only — VoiceClips touches no file or preference) and stop the clip; a torn-down page is noticed by the 1 s tick; 30 s (MaxRecPackets) stops and keeps; a (re)load tells the shell `stopped` with the kept length — '
      + JSON.stringify({ leave, bg, call, all, play, keep, tick, full, reload, memOnly }));
  });

  /* ———— playback / recording modes: a voice clip uses its OWN instance in the voice mode (media, loudspeaker, 10 kbit/s);
     a call keeps Instance(), start(codec), 24 000 and its stream types ———— */
  await guard('playback media mode', async () => {
    const own = /IAudioRecorder r\s*=\s*new SAudioRecorder\(\);/.test(VC) && /r\.startVoiceMessage\(VoiceCodec\.BitrateBps,\s*\(\)\s*=>\s*interruptAll\("focus"\)\);/.test(VC)
      && /p\s*=\s*new SAudioPlayer\(\);/.test(VC) && /p\.startVoiceMessage\(\(\)\s*=>\s*interruptAll\("focus"\)\);/.test(VC)
      && !/Instance\(\)|\.start\(/.test(VC.replace(/Stopwatch\.StartNew\(\)/g, '').replace(/\bt\.Start\(\)/g, '').replace(/decoder\.start\(\)/g, ''));
    const iface = /void startVoiceMessage\(int bitrate,\s*Action\? onInterrupted\);/.test(stripCode(rd('Spixi/VoIP/IAudioRecorder.cs')))
      && /void startVoiceMessage\(Action\? onInterrupted\);/.test(stripCode(rd('Spixi/VoIP/IAudioPlayer.cs')));
    const per = {};
    for (const p of PLAT) {
      const r = recOf(p), y = plyOf(p);
      per[p] = {
        rec: /public void startVoiceMessage\(int bitrate,\s*Action\? onInterrupted\)/.test(r) && /voiceMode\s*\?\s*voiceBitrate\s*:\s*24000|new OpusEncoder\(sampleRate,\s*voiceBitrate,/.test(r)
          && /new OpusEncoder\(sampleRate,\s*(?:voiceMode \? voiceBitrate : )?24000,/.test(r) && /voiceMode\s*=\s*false;/.test(bodyOf(r, 'public void start(string codec)')),
        ply: /public void startVoiceMessage\(Action\? onInterrupted\)/.test(y) && /voiceMode\s*=\s*false;/.test(bodyOf(y, 'public void start(string codec)')),
      };
    }
    const and = plyOf('Android');
    const andMedia = /AudioAttributes aa\s*=\s*voiceMode\s*\?\s*new AudioAttributes\.Builder\(\)\s*\.SetContentType\(AudioContentType\.Speech\)\s*\.SetUsage\(AudioUsageKind\.Media\)\s*\.Build\(\)\s*:\s*new AudioAttributes\.Builder\(\)\s*\.SetContentType\(AudioContentType\.Speech\)\s*\.SetFlags\(AudioFlags\.LowLatency\)\s*\.SetUsage\(AudioUsageKind\.VoiceCommunication\)\s*\.Build\(\);/.test(and);
    const andRec = /voiceMode \? AudioSource\.Mic : AudioSource\.VoiceCommunication/.test(recOf('Android'))
      && /new OpusEncoder\(sampleRate,\s*24000,\s*channels,\s*Concentus\.Enums\.OpusApplication\.OPUS_APPLICATION_RESTRICTED_LOWDELAY,\s*this\)/.test(recOf('Android'))
      && /new OpusEncoder\(sampleRate,\s*voiceBitrate,\s*channels,\s*Concentus\.Enums\.OpusApplication\.OPUS_APPLICATION_VOIP,\s*this\)/.test(recOf('Android'));
    const apple = ['iOS', 'MacCatalyst'].every((p) => {
      const y = plyOf(p);
      return /if\s*\(\s*voiceMode\s*\)\s*\{\s*AVAudioSession\.SharedInstance\(\)\.SetCategory\(AVAudioSessionCategory\.Playback,/.test(y)
        && /else\s*\{\s*if\s*\(\s*!AVAudioSession\.SharedInstance\(\)\.SetPreferredSampleRate\(sampleRate, out error\)\s*\)[\s\S]{0,200}?SetCategory\(AVAudioSessionCategory\.PlayAndRecord,\s*AVAudioSessionCategoryOptions\.InterruptSpokenAudioAndMixWithOthers\);/.test(y);
    });
    const noCatchup = PLAT.every((p) => /if\s*\(\s*voiceMode\s*\)\s*\{/.test(bodyOf(plyOf(p), p === 'Windows' ? 'public void onDecodedData(byte[] data)' : p === 'Android' ? 'public void onDecodedData(short[] data)' : 'public void onDecodedData(float[] data)')));
    const platOk = PLAT.every((p) => per[p].rec && per[p].ply);
    ok(own && iface && platOk && andMedia && andRec && apple && noCatchup,
      'playback media mode C#: VoiceClips makes its OWN SAudioRecorder / SAudioPlayer (never Instance(), never start(codec)) and starts them with startVoiceMessage (VoiceCodec.BitrateBps); every platform implements both, start(codec) resets the voice mode and the call keeps 24 000 (Android: RESTRICTED_LOWDELAY + VOICE_COMMUNICATION); a voice clip plays as Android USAGE_MEDIA / the iOS + Mac Playback category (the loudspeaker), with no catch-up — '
      + JSON.stringify({ own, iface, per, andMedia, andRec, apple, noCatchup }));
  });

  /* ———— bounded: the recorder batches, the waveform decode, the playback and the kept store all have a ceiling ———— */
  await guard('bounded', async () => {
    const rd2 = bodyOf(VC, 'private static void onRecData(int gen, byte[] data)');
    const split = /int len\s*=\s*data\[o\]\s*\|\s*\(data\[o \+ 1\] << 8\);\s*o \+= 2;\s*if\s*\(\s*len < 1 \|\| len > VoiceCodec\.MaxPacketBytes \|\| o \+ len > data\.Length\s*\)\s*\{\s*break;\s*\}\s*if\s*\(\s*target\.Count >= MaxRecPackets\s*\)\s*\{\s*break;\s*\}/.test(rd2);
    const pk = bodyOf(VC, 'public static string? peaksCsvOf(List<byte[]>? packets)');
    const peaks = /if\s*\(\s*packets == null \|\| packets\.Count == 0 \|\| packets\.Count > VoiceCodec\.MaxPackets\s*\)\s*\{\s*return null;\s*\}/.test(pk)
      && /new PcmCollector\(MaxPcmSamples\)/.test(pk) && /if\s*\(\s*pk == null \|\| pk\.Length < 1 \|\| pk\.Length > VoiceCodec\.MaxPacketBytes\s*\)\s*\{\s*return null;\s*\}/.test(pk)
      && /VoiceCodec\.peaksCsv\(VoiceCodec\.peaks\(pcm\.toArray\(\),\s*VoiceCodec\.PeakCount\)\)/.test(pk)
      && /int room\s*=\s*cap - samples\.Count;/.test(VC);
    const play = /if\s*\(\s*packets == null \|\| packets\.Count == 0 \|\| packets\.Count > VoiceCodec\.MaxPackets\s*\)\s*\{\s*host\.pushVoiceState\(idHex,\s*"error",\s*0,\s*0\);\s*return;\s*\}/.test(bodyOf(VC, 'public static void play(IVoiceHost host, string idHex, List<byte[]> packets, int durMs)'))
      && /if\s*\(\s*pos >= totalMs \+ PlayTailMs\s*\)\s*\{\s*ended = true;\s*break;\s*\}/.test(VC);
    const store = /while\s*\(\s*keptOrder\.Count > KeptCap\s*\)/.test(VC) && /public const int KeptCap = 16;/.test(VC);
    const queue = /if\s*\(\s*Interlocked\.Increment\(ref voiceInfoQueued\) > VoiceInfoQueueMax\s*\)/.test(SCP) && /while\s*\(\s*voiceInfoCache\.Count >= VoiceInfoCacheMax/.test(SCP)
      && /Task\.Run\(drainVoiceInfo\)/.test(SCP);
    ok(split && peaks && play && store && queue,
      'bounded C#: a recorder batch is split into packets of 1..MaxPacketBytes (a malformed tail dropped) up to MaxRecPackets; the waveform decode takes ≤ MaxPackets packets and keeps ≤ MaxPcmSamples samples; play refuses > MaxPackets and ends at the clip\'s length; ≤ KeptCap kept clips; the waveform queue (≤ VoiceInfoQueueMax, one drainer off the UI thread) and its cache are capped — '
      + JSON.stringify({ split, peaks, play, store, queue }));
  });

  /* ———— logs: fixed words + exception TYPES only — never an id, a text, a path, a name or an address ———— */
  await guard('logs', async () => {
    const lines = [...(VC + '\n' + SEC).matchAll(/Logging\.(?:info|warn|error)\(([^;]*)\);/g)].map((x) => x[1].trim());
    const okArg = (a) => /^"[^"]*"$/.test(a)
      || /^"[^"]*" \+ (?:e\.GetType\(\)\.Name|why|\(route == VoiceCodec\.Route\.Inline \? "inline" : "file"\)) \+ "[^"]*"$/.test(a)
      || /^\w+ \? "[^"]*" : "[^"]*"$/.test(a);   // a choice between two fixed texts
    const bad = lines.filter((a) => !okArg(a));
    ok(lines.length >= 20 && bad.length === 0,
      'logs C#: every Logging line of VoiceClips and the page\'s voice section is a fixed text, or a fixed text with an exception TYPE / a fixed reason word — no id, text, path, name or address — ' + JSON.stringify({ n: lines.length, bad }));
  });

  /* ———— nothing of a clip reaches the WebView: the voice section pushes only voiceRec / voiceState / voiceInfo ———— */
  await guard('no audio into the WebView', async () => {
    const cmds = [...SEC.matchAll(/Utils\.sendUiCommand\(this,\s*"([^"]+)"/g)].map((x) => x[1]);
    const only = cmds.length >= 3 && cmds.every((c) => c === 'voiceRec' || c === 'voiceState' || c === 'voiceInfo');
    const info = /Utils\.sendUiCommand\(this,\s*"voiceInfo",\s*id,\s*info\.Substring\(0,\s*bar\),\s*info\.Substring\(bar \+ 1\)\);/.test(SEC)
      && /string info\s*=\s*durMs\.ToString\(System\.Globalization\.CultureInfo\.InvariantCulture\)\s*\+\s*"\|"\s*\+\s*csv;/.test(SEC);
    const vcNoPush = !/sendUiCommand|executeUiCommand/.test(VC);
    ok(only && info && vcNoPush,
      'no audio into the WebView C#: the voice section pushes only voiceRec / voiceState / voiceInfo (voiceInfo = the id, the duration and the peaks csv); VoiceClips pushes nothing itself (IVoiceHost) — ' + JSON.stringify({ cmds, only, info, vcNoPush }));
  });

  /* ════════ #46 round 1 (CONTRACT §7) — the play / download / waveform gates and the r1 fixes ════════ */

  /* ———— r1 play gates (auditor C SCP1 · SCP6 · SCP7 · SCP8): a tap plays only C#'s own voice row; a DOWNLOAD starts only
     for a received, incomplete voice FILE row (never a non-voice file — SECURITY: no accept the user did not make) ———— */
  await guard('r1 play gates', async () => {
    const p = bodyOf(SCP, 'private void onVoicePlay(string idHex)');
    const voice = /if\s*\(\s*fm == null \|\| fm\.id == null \|\| !VoiceCodec\.rendersAsVoice\(friend\.bot\)\s*\)\s*\{\s*Logging\.warn\("ixian:voiceplay: no voice row holds the id"\);\s*pushVoiceState\(idHex,\s*"error",\s*0,\s*0\);\s*return;\s*\}/.test(p);
    const inline = /if\s*\(\s*fm\.type == FriendMessageType\.standard\s*\)\s*\{\s*string text\s*=\s*fm\.message;\s*if\s*\(\s*!VoiceCodec\.tryPeekInline\(text,\s*out _\)\s*\)\s*\{\s*pushVoiceState\(ownHex,\s*"error",\s*0,\s*0\);\s*return;\s*\}/.test(p)
      && /if\s*\(\s*VoiceCodec\.tryParseInline\(text,\s*out int durMs,\s*out List<byte\[\]>\?\s*packets\)\s*&&\s*packets != null\s*\)/.test(p);
    const fileGate = /if\s*\(\s*fm\.type == FriendMessageType\.fileHeader && SharedItems\.parseFileHeader\(fm\.message,\s*out string name,\s*out _\) && isVoiceFileRow\(fm,\s*name\)\s*\)\s*\{/.test(p);
    const dlGate = /if\s*\(\s*!fm\.localSender && !fm\.completed && !string\.IsNullOrEmpty\(fm\.transferId\)\s*\)\s*\{\s*startVoiceDownload\(fm,\s*ownHex,\s*channel\);\s*return;\s*\}/.test(p);
    /* the ONLY accept a voice tap can make is inside that gate */
    const accepts = (p.match(/startVoiceDownload\(|onAcceptFile\(/g) || []).length === 1 && p.indexOf('isVoiceFileRow(fm, name)') < p.indexOf('startVoiceDownload(');
    const callers = (SCP.match(/startVoiceDownload\(/g) || []).length === 2;   // the definition + the one gated call
    ok(voice && inline && fileGate && dlGate && accepts && callers,
      'r1 play gates C#: ixian:voiceplay plays nothing outside rendersAsVoice (bot rooms), an inline row only after tryPeekInline + tryParseInline, a file row only when isVoiceFileRow, and the download (an accept) starts ONLY for a received, incomplete voice file with a transfer id — the one startVoiceDownload call — '
      + JSON.stringify({ voice, inline, fileGate, dlGate, accepts, callers }));
  });

  /* ———— r1 download (B MAJOR-1, A M2, B m-2, §7): `loading` only when a transfer really runs; else `error`; the clip that is
     playing stops; onAcceptFile fails closed on a null botInfo ———— */
  await guard('r1 download', async () => {
    const d = bodyOf(SCP, 'private void startVoiceDownload(FriendMessage fm, string ownHex, int channel)');
    const stopFirst = !/^\{\s*VoiceClips\.stopPlayback/.test(d.trim()) && (d.match(/VoiceClips\.stopPlayback\(true\);/g) || []).length === 1;   // #46 r2: stopped only once a transfer runs (below)
    const blind = /if\s*\(\s*Utils\.hidesParticipants\(friend\)\s*\)\s*\{\s*Logging\.warn\("[^"]*"\);\s*pushVoiceState\(ownHex,\s*"error",\s*0,\s*0\);\s*return;\s*\}/.test(d);
    const accept = /FileTransfer\?\s*running\s*=\s*incomingTransferOf\(fm\.transferId\);\s*if\s*\(\s*running == null\s*\)\s*\{\s*onAcceptFile\(channel,\s*fm\);\s*running\s*=\s*incomingTransferOf\(fm\.transferId\);\s*\}\s*if\s*\(\s*running == null\s*\)\s*\{\s*Logging\.warn\("[^"]*"\);\s*pushVoiceState\(ownHex,\s*"error",\s*0,\s*0\);\s*return;\s*\}\s*VoiceClips\.stopPlayback\(true\);\s*clearPendingVoicePlay\(ownHex\);\s*Interlocked\.Exchange\(ref pendingVoicePlay,\s*new PendingVoicePlay\(ownHex,\s*fm\.transferId,\s*thumbDoc,\s*channel,\s*Environment\.TickCount64\)\);\s*pushVoiceState\(ownHex,\s*"loading",\s*0,\s*0\);/.test(d);
    const exact = /return t != null && t\.uid == uid \? t : null;/.test(bodyOf(SCP, 'private static FileTransfer? incomingTransferOf(string uid)'));
    const acceptNull = /if\s*\(\s*friend\.type == FriendType\.Group\s*\)\s*\{\s*if\s*\(\s*Utils\.hidesParticipants\(friend\)\s*\)/.test(bodyOf(SCP, 'public void onAcceptFile(int selected_channel, FriendMessage message)'));
    const p = bodyOf(SCP, 'private void onVoicePlay(string idHex)');
    const neverLoading = /catch\s*\(Exception e\)\s*\{\s*Logging\.warn\([^;]*\);\s*if\s*\(\s*ownHex != null\s*\)\s*\{\s*clearPendingVoicePlay\(ownHex\);\s*pushVoiceState\(ownHex,\s*"error",\s*0,\s*0\);/.test(p);
    ok(stopFirst && blind && accept && exact && acceptNull && neverLoading,
      'r1 download C#: a voice-file download first stops the playing clip, refuses a blind room (error), accepts through onAcceptFile only when no transfer of exactly that uid runs, and pushes `loading` (with the pending play) ONLY when a transfer runs afterwards — else `error`; onAcceptFile fails closed on a null botInfo; a throw never leaves `loading` — '
      + JSON.stringify({ stopFirst, blind, accept, exact, acceptNull, neverLoading }));
  });

  /* ———— r1 pending (B MAJOR-1, A M3, A M4, B m-10, auditor C SCP2 · SCP3): the pending play is watched, ends with the page,
     is decided before the voice test, is found like onVoicePlay finds rows, and a delete stops it ———— */
  await guard('r1 pending', async () => {
    const us = bodyOf(SCP, 'public override void updateScreen()');
    const tick = /checkPendingVoicePlay\(\);\s*\}$/.test(us.trim());
    const w = bodyOf(SCP, 'private void checkPendingVoicePlay()');
    const watch = /if\s*\(\s*want\.doc != thumbDoc \|\| isDisposed\s*\)/.test(w)
      && /stalled\s*=\s*st\.StartsWith\("paused:",\s*StringComparison\.Ordinal\) \|\| neverStarted;/.test(w)
      && /bool neverStarted\s*=\s*t\.lastTimeStamp <= 0 && Environment\.TickCount64 - want\.sinceMs > FileRowRules\.PausedAfterSeconds \* 1000;/.test(w)
      && /if\s*\(\s*stalled && Interlocked\.CompareExchange\(ref pendingVoicePlay,\s*null,\s*want\) == want\s*\)\s*\{\s*Logging\.info\("[^"]*"\);\s*pushVoiceState\(want\.idHex,\s*"stopped",\s*0,\s*0\);\s*\}/.test(w)
      && /if\s*\(\s*done != null && done\.completed\s*\)\s*\{\s*voiceAfterTransfer\(want\.uid,\s*want\.channel\);\s*return;\s*\}/.test(w);
    const a = bodyOf(SCP, 'private void voiceAfterTransfer(string uid, int channel)');
    const shown = /if\s*\(\s*friend == null \|\| isDisposed \|\| string\.IsNullOrEmpty\(uid\) \|\| channel != selectedChannel\s*\)\s*\{\s*return;\s*\}/.test(a);
    const find = /FriendMessage\?\s*fm\s*=\s*findChannelMessageByTransfer\(channel,\s*uid\);/.test(a)
      && /channelSnapshot\(channel\)\.Find\(x => !x\.localSender && x\.transferId == uid\)/.test(SCP) && /deep\?\.Find\(x => !x\.localSender && x\.transferId == uid\)/.test(SCP);   /* ★ S9 A1 #46 r4 re-base: an INCOMING row only (a peer cannot reuse my transfer id) */
    const mine = /bool mine\s*=\s*want != null && want\.uid == uid && want\.doc == thumbDoc\s*&& Interlocked\.CompareExchange\(ref pendingVoicePlay,\s*null,\s*want\) == want;/.test(a);
    const before = a.indexOf('bool mine') >= 0 && a.indexOf('bool mine') < a.indexOf('isVoiceFileRow(')
      && /if\s*\(\s*!voice \|\| idHex != want\.idHex\s*\)\s*\{\s*pushVoiceState\(want\.idHex,\s*"error",\s*0,\s*0\);/.test(a);
    const leave = /clearPendingVoicePlay\(null\);/.test(bodyOf(SCP, 'protected override void OnDisappearing()'));
    const del = /^\{\s*voiceRowDeleted\(msg_id\);/.test(bodyOf(SCP, 'public void deleteMessage(byte[] msg_id, int channel)').trim())
      && /VoiceClips\.stopIfCurrent\(this,\s*hex\);/.test(bodyOf(SCP, 'private void voiceRowDeleted(byte[]? msgId)'))
      && /mine\s*=\s*playHost == host && string\.Equals\(playId,\s*idHex,\s*StringComparison\.Ordinal\);\s*\}\s*if\s*\(\s*mine\s*\)\s*\{\s*stopPlayback\(true\);/.test(bodyOf(VC, 'public static void stopIfCurrent(IVoiceHost host, string idHex)'));
    ok(tick && watch && shown && find && mine && before && leave && del,
      'r1 pending C#: updateScreen (1 Hz) runs checkPendingVoicePlay — a gone / paused / never-started transfer → `stopped`, a missed completion → play, an older document → forgotten (TransferManager has no failure / pause hook); voiceAfterTransfer acts only for the SHOWN channel and THIS document, finds the row like onVoicePlay (memory + the cached deep read, by transfer id) and decides the pending play BEFORE the voice-row test (no voice row → `error`); OnDisappearing forgets it; a deleted row\'s clip stops — '
      + JSON.stringify({ tick, watch, shown, find, mine, before, leave, del }));
  });

  /* ———— r1 waveform gates (A N5, auditor C SCP4 · SCP10 · SCP11 · SCP12) ———— */
  await guard('r1 waveform gates', async () => {
    const pv = bodyOf(SCP, 'private void processVoiceInfo(VoiceInfoJob job)');
    const doc = /^\{\s*if\s*\(\s*isDisposed \|\| job\.doc != thumbDoc \|\| friend == null\s*\)\s*\{\s*return;\s*\}/.test(pv.trim());
    const dedupe = /lock\s*\(\s*voiceInfoSent\s*\)\s*\{\s*if\s*\(\s*!voiceInfoSent\.Add\(sentKey\)\s*\)\s*\{\s*return;\s*\}\s*\}/.test(pv);
    const thrown = /try\s*\{\s*info\s*=\s*voiceInfoOf\(job\.fm,\s*job\.id,\s*out notYet\);\s*\}\s*catch\s*\(Exception e\)\s*\{\s*Logging\.warn\([^;]*\);\s*info\s*=\s*null;\s*notYet\s*=\s*false;\s*\}/.test(pv);
    const unsent = /if\s*\(\s*isDisposed \|\| doc != thumbDoc\s*\)\s*\{\s*lock\s*\(\s*voiceInfoSent\s*\)\s*\{\s*voiceInfoSent\.Remove\(sentKey\);\s*\}\s*return;\s*\}\s*if\s*\(\s*info == null\s*\)\s*\{\s*Utils\.sendUiCommand\(this,\s*"voiceState",\s*id,\s*"error",\s*"0",\s*"0"\);\s*return;\s*\}/.test(pv);
    const afterSend = /stored\s*=\s*true;\s*if\s*\(\s*friend_message\.id != null\s*\)\s*\{\s*enqueueVoiceInfo\(Crypto\.hashToString\(friend_message\.id\),\s*friend_message\);\s*\}/.test(bodyOf(SCP, 'private bool sendVoiceFile(List<byte[]> packets, ref bool stored)'));
    const fileRow = /if\s*\(\s*fVoice == "1" && \(message\.completed \|\| message\.localSender\)\s*\)\s*\{\s*noteVoiceInfo\(message,\s*batch\);\s*\}/.test(bodyOf(SCP, 'private void insertMessage(FriendMessage message, int channel, UiBatch? batch)'));
    ok(doc && dedupe && thrown && unsent && afterSend && fileRow,
      'r1 waveform gates C#: a waveform job of an older document does nothing; one per document + row (voiceInfoSent); a throw answers `error` once like a refused parse; a push that did not happen frees its slot; my sent file\'s waveform is queued once its path is set; a file row asks only when its file is here (complete, or mine) — '
      + JSON.stringify({ doc, dedupe, thrown, unsent, afterSend, fileRow }));
  });

  /* ———— r1 call ordering (A M1): the call's interrupt runs AFTER its session id exists; record / play re-check the call
     under `gate` right before they publish ———— */
  await guard('r1 call ordering', async () => {
    const ic = bodyOf(VOIP, 'public static void initiateCall(Friend friend)');
    const out = ic.indexOf('currentCallSessionId = Guid.NewGuid().ToByteArray();') >= 0 && ic.indexOf('currentCallSessionId = Guid.NewGuid().ToByteArray();') < ic.indexOf('VoiceClips.interruptAll("call");');
    const rc = bodyOf(VOIP, 'public static bool onReceivedCall(');
    const inc = rc.indexOf('currentCallSessionId = session_id;') >= 0 && rc.indexOf('currentCallSessionId = session_id;') < rc.indexOf('VoiceClips.interruptAll("call");');
    const sr = bodyOf(VC, 'public static VoiceRecStart startRecording(IVoiceHost host)');
    const recGate = /callNow\s*=\s*VoIPManager\.isInitiated\(\);\s*if\s*\(\s*!callNow && recGen == gen && recorder == null\s*\)\s*\{\s*recorder\s*=\s*r;/.test(sr);
    const pl = bodyOf(VC, 'public static void play(IVoiceHost host, string idHex, List<byte[]> packets, int durMs)');
    const playGate = /lock\s*\(\s*gate\s*\)\s*\{\s*if\s*\(\s*!VoIPManager\.isInitiated\(\)\s*\)\s*\{[^}]*playId\s*=\s*idHex;[^}]*t\s*=\s*newRunLocked\(\);\s*\}\s*\}/.test(pl);
    ok(out && inc && recGate && playGate,
      'r1 call ordering C#: VoIPManager calls VoiceClips.interruptAll("call") only after currentCallSessionId is set (both directions); startRecording and play re-check VoIPManager.isInitiated() inside `gate` right before the recorder / the clip is published — ' + JSON.stringify({ out, inc, recGate, playGate }));
  });

  /* ———— r1 recorder tail (A M6): a voice clip's stop() flushes the last buffered packets into the ending clip ———— */
  await guard('r1 recorder tail', async () => {
    const per = {};
    for (const pl of PLAT) {
      const r = recOf(pl);
      const st = bodyOf(r, 'public void stop()');
      per[pl] = /voiceFlushing\s*=\s*voiceMode;\s*running\s*=\s*false;/.test(st)
        && /if\s*\(\s*voiceMode\s*\)\s*\{\s*flushVoiceTail\(\);\s*\}\s*voiceFlushing\s*=\s*false;\s*lock\s*\(\s*outputBuffers\s*\)\s*\{\s*outputBuffers\.Clear\(\);\s*\}/.test(st)
        && /public void onEncodedData\(byte\[\] data\)\s*\{\s*if\s*\(\s*!running && !voiceFlushing\s*\)/.test(r)
        && /var callback\s*=\s*OnSoundDataReceived;\s*if\s*\(\s*tail != null && callback != null\s*\)/.test(bodyOf(r, 'private void flushVoiceTail()'));
    }
    const er = bodyOf(VC, 'private static List<byte[]>? endRecording(bool keep, string why, bool push)');
    const gen = /flushGen\s*=\s*recGen;\s*flushPackets\s*=\s*packets;\s*clearRecordingLocked\(\);\s*recGen\+\+;/.test(er) && er.indexOf('recGen++;') < er.indexOf('r.Dispose();')
      && er.indexOf('r.Dispose();') < er.indexOf('flushGen = -1;');
    const into = /List<byte\[\]>\?\s*target\s*=\s*live\s*\?\s*recPackets\s*:\s*\(gen == flushGen \? flushPackets : \(gen == startingGen \? startingPackets : null\)\);/.test(bodyOf(VC, 'private static void onRecData(int gen, byte[] data)'));
    ok(PLAT.every((pl) => per[pl]) && gen && into,
      'r1 recorder tail C#: on every platform a VOICE recorder\'s stop() keeps the encoder\'s last frames (voiceFlushing) and hands the packets still buffered to the callback once (flushVoiceTail) before clearing — a call drops them as before; VoiceClips routes that flush into the ENDING clip by its generation (flushGen) — '
      + JSON.stringify({ per, gen, into }));
  });

  /* ———— r1 one play section (A M8): the old clip's end, the new clip and its run thread in ONE critical section; a run
     thread waits for the earlier one and checks its generation before it creates a player ———— */
  await guard('r1 one play section', async () => {
    const pl = bodyOf(VC, 'public static void play(IVoiceHost host, string idHex, List<byte[]> packets, int durMs)');
    const one = /playGen\+\+;\s*playHost\s*=\s*host;\s*playId\s*=\s*idHex;\s*playPackets\s*=\s*packets;[\s\S]*?t\s*=\s*newRunLocked\(\);/.test(pl) && !/stopPlayback\(|startRun\(/.test(pl);
    const nr = bodyOf(VC, 'private static Thread? newRunLocked()');
    const chain = /Thread\?\s*prev\s*=\s*lastRunThread;\s*Thread t\s*=\s*new Thread\(\(\)\s*=>\s*playLoop\(gen,\s*runHost,\s*runId,\s*runPackets,\s*from,\s*dur,\s*prev\)\);/.test(nr) && /lastRunThread\s*=\s*t;/.test(nr) && /int gen\s*=\s*\+\+playGen;/.test(nr);
    const lp = bodyOf(VC, 'private static void playLoop(int gen, IVoiceHost host, string id, List<byte[]> packets, int from, int durMs, Thread? prev)');
    const wait = /^\{\s*IAudioPlayer\?\s*p\s*=\s*null;\s*bool ended\s*=\s*false;\s*bool failed\s*=\s*false;\s*join\(prev\);\s*lock\s*\(\s*gate\s*\)\s*\{\s*if\s*\(\s*playGen != gen \|\| VoIPManager\.isInitiated\(\)\s*\)\s*\{\s*return;\s*\}\s*\}\s*try\s*\{\s*p\s*=\s*new SAudioPlayer\(\);/.test(lp.trim());
    const resume = /t\s*=\s*newRunLocked\(\);\s*\}\s*t\?\.Start\(\);/.test(bodyOf(VC, 'private static void resumePlayback()'));
    ok(one && chain && wait && resume,
      'r1 one play section C#: play() ends the old clip (playGen++), publishes the new one and builds its run thread in ONE `gate` section; every run thread first joins the previous one (whose player — the iOS session, the Android volume stream — is disposed before a newer player exists) and checks its generation before it creates a player — '
      + JSON.stringify({ one, chain, wait, resume }));
  });

  /* ———— r1 recording resync (B m-3): a posted `recording` push is re-checked on the main thread ———— */
  await guard('r1 recording resync', async () => {
    const tick = /h\.pushVoiceRec\("recording",\s*ms,\s*\(\)\s*=>\s*isLiveRecording\(gen\)\);/.test(bodyOf(VC, 'private static void recTick(int gen)'))
      && /return gen == recGen && recorder != null;/.test(bodyOf(VC, 'private static bool isLiveRecording(int gen)'));
    const page = /MainThread\.BeginInvokeOnMainThread\(\(\)\s*=>\s*\{\s*if\s*\(\s*!isDisposed && \(stillValid == null \|\| stillValid\(\)\)\s*\)\s*\{\s*Utils\.sendUiCommand\(this,\s*"voiceRec",\s*state,\s*ms\);/.test(bodyOf(SCP, 'public void pushVoiceRec(string state, int elapsedMs, Func<bool>? stillValid = null)'));
    ok(tick && page, 'r1 recording resync C#: the 1 s `recording` push carries a generation check that the page runs ON the main thread right before the push — a resync posted just before the end never lands after `stopped` — ' + JSON.stringify({ tick, page }));
  });

  /* ———— r1 send failure (B m-5 · B m-12 · A N4 · C N7, §7): `sendfail` then `stopped`, never `error`; a STORED message is
     never given back; the sender's own .ogg goes when no transfer holds it; an Ogg over MaxOggBytes is never sent ———— */
  await guard('r1 send failure', async () => {
    const sf = bodyOf(SCP, 'private void voiceSendFailed(string key, List<byte[]> packets)');
    const states = /VoiceClips\.keepAgain\(key,\s*packets\);\s*pushVoiceRec\("sendfail",\s*durMs\);\s*pushVoiceRec\("stopped",\s*durMs\);/.test(sf);
    const m = bodyOf(SCP, 'private void onVoiceSend()');
    const noError = !/"error"/.test(m) && !/keepAgain/.test(m);
    const storedKept = /catch\s*\(Exception e\)\s*\{\s*Logging\.warn\([^;]*\);\s*if\s*\(\s*stored \|\| packets == null\s*\)\s*\{\s*pushVoiceRec\("idle",\s*0\);\s*\}\s*else\s*\{\s*voiceSendFailed\(key,\s*packets\);\s*\}\s*\}/.test(m);
    const f = bodyOf(SCP, 'private bool sendVoiceFile(List<byte[]> packets, ref bool stored)');
    const tooBig = /if\s*\(\s*ogg\.Length > VoiceCodec\.MaxOggBytes\s*\)\s*\{\s*Logging\.warn\("[^"]*"\);\s*return false;\s*\}/.test(f) && f.indexOf('ogg.Length > VoiceCodec.MaxOggBytes') < f.indexOf('Directory.CreateDirectory(');
    const stage = /sendPreparedStage\s*=\s*0;\s*sendPreparedUid\s*=\s*null;\s*try\s*\{\s*stream\s*=\s*new FileStream\(path,\s*FileMode\.Open,\s*FileAccess\.Read,\s*FileShare\.Read\);\s*friend_message\s*=\s*sendPreparedFile\(name,\s*stream,\s*path\);\s*\}\s*catch\s*\(Exception\)\s*\{\s*if\s*\(\s*sendPreparedStage >= 2\s*\)\s*\{\s*stored\s*=\s*true;\s*throw;\s*\}\s*withdrawVoiceFile\(stream,\s*path\);\s*throw;\s*\}\s*if\s*\(\s*friend_message == null\s*\)\s*\{\s*deleteOwnVoiceFile\(path\);\s*return false;\s*\}/.test(f)
      && /if\s*\(\s*sendPreparedStage == 1 && sendPreparedUid != null\s*\)\s*\{\s*TransferManager\.removeOutgoingTransfer\(sendPreparedUid\);\s*\}\s*else\s*\{\s*stream\?\.Dispose\(\);\s*\}[\s\S]*deleteOwnVoiceFile\(path\);\s*\}$/.test(bodyOf(SCP, 'private void withdrawVoiceFile(Stream? stream, string path)').trim());
    const half = /catch\s*\(Exception\)\s*when\s*\(\s*created\s*\)\s*\{\s*deleteOwnVoiceFile\(p\);\s*throw;\s*\}/.test(f);
    const sp = bodyOf(SCP, 'private FriendMessage? sendPreparedFile(string fileName, Stream stream, string filePath)');
    const marks = /transfer\.channel\s*=\s*selectedChannel;\s*sendPreparedStage\s*=\s*1;/.test(sp)
      && /if\s*\(\s*friend_message == null\s*\)\s*\{\s*Logging\.error\("[^"]*"\);\s*TransferManager\.removeOutgoingTransfer\(transfer\.uid\);\s*sendPreparedStage\s*=\s*0;\s*sendPreparedUid\s*=\s*null;\s*return null;\s*\}\s*sendPreparedStage\s*=\s*2;/.test(sp) && sp.indexOf('sendPreparedStage = 2;') < sp.indexOf('StreamProcessor.sendSpixiMessage(');   // #46 r2: no NRE; the transfer withdrawn
    ok(states && noError && storedKept && tooBig && stage && half && marks,
      'r1 send failure C#: a refused / failed send keeps the clip and pushes `sendfail` then `stopped` (§7; `error` is a recording failure only); once Core STORED the message (inline: a non-null addMessageWithType; file: sendPreparedStage 2) a later throw gives nothing back; a throw before the transfer exists disposes the stream and deletes C#\'s own .ogg (a half-written one too); an Ogg over MaxOggBytes is refused before it is written — '
      + JSON.stringify({ states, noError, storedKept, tooBig, stage, half, marks }));
  });

  /* ════════ #46 round 2 ════════ */

  /* ———— r2 pending answered (MAJOR + MINOR A M3): a replaced / cleared pending play answers its bubble `stopped`; a finished
     download plays only on a SHOWN chat with no call, else `stopped`; "gone" needs two ticks ———— */
  await guard('r2 pending answered', async () => {
    const c = bodyOf(SCP, 'private void clearPendingVoicePlay(string? keepId)');
    const tell = /PendingVoicePlay\?\s*old\s*=\s*Interlocked\.Exchange\(ref pendingVoicePlay,\s*null\);\s*if\s*\(\s*old != null && old\.doc == thumbDoc && !string\.Equals\(old\.idHex,\s*keepId,\s*StringComparison\.Ordinal\)\s*\)\s*\{\s*pushVoiceState\(old\.idHex,\s*"stopped",\s*0,\s*0\);\s*\}/.test(c);
    /* the only silent clears left: inside the helper, the new document (onLoad), the same row deleted / an older
       document (CompareExchange) — every other path goes through clearPendingVoicePlay */
    const raw = (SCP.match(/Interlocked\.Exchange\(ref pendingVoicePlay,\s*null\)/g) || []).length === 2
      && /Interlocked\.Exchange\(ref pendingVoicePlay,\s*null\);\s*int keptVoiceMs/.test(bodyOf(SCP, 'private void onLoad()'));
    const tap = /ownHex\s*=\s*Crypto\.hashToString\(fm\.id\);\s*clearPendingVoicePlay\(ownHex\);/.test(bodyOf(SCP, 'private void onVoicePlay(string idHex)'));
    const a = bodyOf(SCP, 'private void voiceAfterTransfer(string uid, int channel)');
    /* ★ lead (#46 r3) re-base: + the foreground / recording terms (pinned exactly in pins-s7/lead.mjs) */
    const shown = /MainThread\.BeginInvokeOnMainThread\(\(\)\s*=>\s*\{\s*if\s*\(\s*isDisposed\s*\)\s*\{\s*return;\s*\}\s*(?:bool backgrounded = false;\s*#if ANDROID \|\| IOS\s*backgrounded = !App\.isInForeground;\s*#endif\s*)?if\s*\(\s*VoIPManager\.isInitiated\(\) \|\| !isShownChat\(\)(?: \|\| backgrounded \|\| VoiceClips\.isRecording)?\s*\)\s*\{\s*Logging\.info\("[^"]*"\);\s*pushVoiceState\(playHex,\s*"stopped",\s*0,\s*0\);\s*return;\s*\}\s*Task\.Run\(\(\)\s*=>\s*playVoiceFile\(playHex,\s*path\)\);/.test(a)
      && (a.match(/playVoiceFile\(/g) || []).length === 1;
    const pred = /SpixiContentPage\?\s*top\s*=\s*SpixiContentPage\.getTopOverlay\(\);\s*if\s*\(\s*top != null\s*\)\s*\{\s*return top == this \|\| \(top is ContactDetails && SpixiContentPage\.getOverlayPages\(\)\.Contains\(this\)\);\s*\}/.test(bodyOf(SCP, 'private bool isShownChat()'));
    const w = bodyOf(SCP, 'private void checkPendingVoicePlay()');
    const twoTicks = /want\.goneTicks\+\+;\s*stalled\s*=\s*want\.goneTicks >= 2;/.test(w) && /want\.goneTicks\s*=\s*0;/.test(w);
    ok(tell && raw && tap && shown && pred && twoTicks,
      'r2 pending answered C#: clearPendingVoicePlay answers the replaced row `stopped` (not the tapped row itself, not an older document) and every replace / clear but the new-document reset goes through it; a finished download plays only when THIS chat is the shown one (HomePage\'s tick rule: the top overlay, or under an open chat-info pane) and no call runs — else `stopped`; a transfer counts as dropped only after two ticks (completeFileTransfer removes it before fm.completed) — '
      + JSON.stringify({ tell, raw, tap, shown, pred, twoTicks }));
  });

  /* ———— r2 recorder publish (MINOR): started first, published under `gate` only when no call and the generation holds ———— */
  await guard('r2 recorder publish', async () => {
    const sr = bodyOf(VC, 'public static VoiceRecStart startRecording(IVoiceHost host)');
    const order = sr.indexOf('r.startVoiceMessage(') > 0 && sr.indexOf('r.startVoiceMessage(') < sr.indexOf('recorder = r;');
    const gated = /callNow\s*=\s*VoIPManager\.isInitiated\(\);\s*if\s*\(\s*!callNow && recGen == gen && recorder == null\s*\)\s*\{[^}]*published\s*=\s*true;\s*\}/.test(sr);
    const lost = /if\s*\(\s*!published\s*\)\s*\{\s*try\s*\{\s*r\.Dispose\(\);\s*\}\s*catch\s*\(Exception\)\s*\{\s*\}/.test(sr);
    const early = /startingGen\s*=\s*gen;\s*startingPackets\s*=\s*packets;/.test(sr) && /recPackets\s*=\s*packets;/.test(sr);
    ok(order && gated && lost && early,
      'r2 recorder publish C#: startRecording STARTS the recorder before publishing it; the publish (under `gate`) needs no call and the same generation, a lost race disposes the recorder at once; packets before the publish keep their generation (startingPackets) — ' + JSON.stringify({ order, gated, lost, early }));
  });

  /* ———— r2 nits: the same row re-played gets no `stopped`; a delete never stops a clip on the network thread ———— */
  await guard('r2 nits', async () => {
    const same = /bool sameRow\s*=\s*oldHost == host && string\.Equals\(oldId,\s*idHex,\s*StringComparison\.Ordinal\);\s*if\s*\(\s*oldId != null && oldHost != null && !sameRow && oldHost\.voiceHostAlive\s*\)/.test(bodyOf(VC, 'public static void play(IVoiceHost host, string idHex, List<byte[]> packets, int durMs)'));
    const off = /Task\.Run\(\(\)\s*=>\s*\{\s*try\s*\{\s*VoiceClips\.stopIfCurrent\(this,\s*hex\);/.test(bodyOf(SCP, 'private void voiceRowDeleted(byte[]? msgId)'));
    ok(same && off, 'r2 nits C#: play() of the row already playing on the same host pushes no `stopped` around its new `playing`; voiceRowDeleted stops the clip on a pool thread (stopPlayback may wait ≤ 1 s — never on the network thread) — ' + JSON.stringify({ same, off }));
  });
}
