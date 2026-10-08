/* ==== S11 C (#1262) — the C# CALL SITES of agent C's items (MAUI-bound, compiled nowhere here → pinned on comment-stripped
 * source; stripCode keeps string literals). The pure rules (S11ChatRules: holdStep · applyFlashVerb · effectiveFlashBits ·
 * flashSwitchesArg · the [P1] lines · parseAutoDownloadVerb · shouldAutoDownload) are EXECUTED in scripts/csh (S11ChatTests.cs).
 *   · 10-FLASH: the candidate is the DEFAULT (no switch bit → S11PaintHold) and runs BEFORE the old PresentHold path; the
 *     hold pushes `window.paintAck`, listens through holdPaintAck (base onPaintedSignal), releases on holdStep(true, …) and
 *     clears its hook; the switches act only in dev mode; a skipped release action is deferred (never dropped)
 *   · DevPage `ixian:devflash:` (exact grammar, dev mode, echo) · the seed push
 *   · auto-download: SettingsPage cap + seed + `ixian:photoAutoDl:` (exact grammar, echo); StreamProcessor calls the hook for an
 *     INCOMING stored offer; the hook returns at once while Off, decides through shouldAutoDownload on the main thread and
 *     accepts through onAcceptFile (chat open) or acceptOfferClosed — whose checks + TransferManager calls are onAcceptFile's,
 *     in the same order
 * ★ S11 C2 (#1263, #46 r1 R3-MAJOR-4/5 — the R3 survivors W1 transferId guard · W2 unmetered check · W3 room check · W4
 *   `frames++` · W5 the ack guard): the hot C# bodies are pinned WHOLE (comment-stripped, whitespace-normalised, compared
 *   to the exact text below), so any one-token edit fails here; their decisions are pure rules EXECUTED in csh
 *   (contactOkForAuto · unmeteredProfiles · autoBudgetOk + S11AutoLedger · ackStep / isStaleAck · deferredOwns).
 * Deliberate breaks: see the S11 C / C2 reports. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join } = h;
  const rd = (p) => stripCode(readFileSync(join(root, p), 'utf8'));
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
  /* ★ S11 C2: a WHOLE body, comment-stripped and whitespace-normalised, equals the expected text exactly */
  const norm = (x) => x.replace(/\s+/g, ' ').trim();
  const whole = (body, expected) => body.length > 0 && norm(body) === norm(expected);
  const SCP = rd('Spixi/Utils/SpixiContentPage.cs');

  await guard('S11 C 10-FLASH wiring', async () => {
    const hold = bodyOf(SCP, 'private static void holdStageUntilDrawn(PreloadOp op)');
    const cand = hold.slice(hold.indexOf('if (!S11ChatRules.flashOn(flash, S11ChatRules.FlashCandidateOff))'), hold.indexOf('Spixi.PresentHold.start('));
    const bits = bodyOf(SCP, 'private static int flashBitsNow()');
    const ph = bodyOf(SCP, 'private sealed class S11PaintHold');
    const start = bodyOf(ph, 'public static void start(');
    const frame = bodyOf(ph, 'private void onFrame(long frameTimeNanos)');
    const end = bodyOf(ph, 'private void end(string why)');
    const painted = bodyOf(SCP, 'protected virtual void onPaintedSignal()');
    const rel = bodyOf(SCP, 'private static void releaseHeld(');
    const oldCb = hold.slice(hold.indexOf('Spixi.PresentHold.start('));
    const r = {
      order: /int flash = flashBitsNow\(\);\s*int seq = \+\+op\.holdSeq;\s*S11FlashProbe\? probe = S11FlashProbe\.start\(native\);\s*if \(!S11ChatRules\.flashOn\(flash, S11ChatRules\.FlashCandidateOff\)\)/.test(hold)
        && before(hold, 'setHoldGrounds(op, native, true);', 'int flash = flashBitsNow();') && before(hold, 'op.stage.Opacity = 1;', 'int flash = flashBitsNow();'),
      candidate: /S11PaintHold\.start\(held, heldView, HoldCapMs, \(frames, ms, why, vscSeen, ackAt, stale\) =>\s*releaseHeld\(held, heldView, nbgPre, frames, ms, why, flash, true, vscSeen, ackAt, stale, seq, probe\)\);\s*return;/.test(cand)
        && !/InputTransparent|BackgroundColor/.test(cand),
      devOnly: /bool dev = Microsoft\.Maui\.Storage\.Preferences\.Default\.Get\("devMode", false\);\s*return S11ChatRules\.effectiveFlashBits\(dev, dev \? Microsoft\.Maui\.Storage\.Preferences\.Default\.Get\(S11ChatRules\.FlashPrefKey, 0\) : 0\);/.test(bits)
        && /catch \(Exception\)\s*\{\s*return 0;\s*\}/.test(bits),
      ask: before(start, 'op.target.holdPaintAck = h.ackHook;', 'Utils.sendUiCommand(op.target, "window.paintAck");')
        && /view\.PostDelayed\(\(\) => h\.end\(S11ChatRules\.WhyCap\), capMs\);/.test(start) && /if \(view == null\)\s*\{\s*h\.end\("noview"\);\s*return;\s*\}/.test(start),
      /* ★ S11 C2 (W4 · W5): the frame loop and the answer hook, WHOLE */
      step: whole(frame, `{ if (ended) { return; } frames++; int at = ackAt;
        string why = S11ChatRules.holdStep(true, vscSeen, at >= 0, at >= 0 ? frames - at : 0, elapsedMs(), capMs);
        if (why.Length > 0) { end(why); return; }
        Android.Views.Choreographer.Instance?.PostFrameCallback(new S11FrameCb(onFrame)); }`),
      ack: whole(bodyOf(ph, 'private void onAck()'), `{ int f = frames; if (S11ChatRules.isStaleAck(ended, ackAt, f)) { staleAcks++; }
        ackAt = S11ChatRules.ackStep(ended, ackAt, f); }`),
      seq: /int flash = flashBitsNow\(\);\s*int seq = \+\+op\.holdSeq;/.test(hold)
        && /releaseHeld\(held, heldView, nbgPre, frames, ms, why, flash, false, why == S11ChatRules\.WhyVsc, -1, 0, seq, probe\);/.test(oldCb),
      endArgs: /onEnd\(frames, elapsedMs\(\), why, vscSeen, ackAt, staleAcks\);/.test(end),
      clears: /if \(ackHook != null && ReferenceEquals\(op\.target\.holdPaintAck, ackHook\)\)\s*\{\s*op\.target\.holdPaintAck = null;\s*\}/.test(end) && /if \(ended\)\s*\{\s*return;\s*\}\s*ended = true;/.test(end),
      hook: /Action\? ack = holdPaintAck;\s*if \(ack != null\)\s*\{\s*try \{ ack\(\); \} catch \(Exception\) \{ \}\s*\}/.test(painted) && before(painted, 'gate.TrySetResult(true);', 'holdPaintAck'),
      /* ★ S12 E re-base (#1267, V-26): on the CANDIDATE path the grounds wait for the native WebView's draw (S12GroundWait — pinned whole in pins-s12/e-hold.mjs); the old path and a null view keep the immediate write */
      release: /if \(!skipGrounds\)\s*\{\s*if \(candidate && heldView != null\)\s*\{\s*S12GroundWait\.start\(held, heldView, seq\);\s*\}\s*else\s*\{\s*try \{ setHoldGrounds\(held, heldView, false\); \} catch \(Exception\) \{ \}\s*\}\s*\}\s*if \(!skipInput\)\s*\{\s*try \{ if \(!held\.closing\) \{ held\.stage\.InputTransparent = false; \} \} catch \(Exception\) \{ \}\s*\}/.test(rel)
        && /Task\.Delay\(S11ChatRules\.FlashDeferMs\)\.ContinueWith\(_ => MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*if \(!S11ChatRules\.deferredOwns\(seq, held\.holdSeq\)\)\s*\{\s*P1Perf\.line\("hold deferred skip=newer"\);\s*return;\s*\}\s*if \(skipGrounds\)\s*\{\s*try \{ setHoldGrounds\(held, heldView, false\); \} catch \(Exception\) \{ \}\s*\}\s*if \(skipInput\)\s*\{\s*try \{ if \(!held\.closing\) \{ held\.stage\.InputTransparent = false; \} \} catch \(Exception\) \{ \}\s*\}/.test(rel)
        && /probe\?\.released\(why, frames, ms, candidate, vscSeen, ackAt, staleAcks, flash\);/.test(rel)
        && /Logging\.info\("\[CDPERF\] chat held frames=\{0\} ms=\{1\} why=\{2\}", frames, ms, why\);/.test(rel),
      oldPath: /if \(S11ChatRules\.flashOn\(flash, S11ChatRules\.FlashSkipGrounds \| S11ChatRules\.FlashSkipInput\)\)\s*\{\s*releaseHeld\(held, heldView, nbgPre, frames, ms, why, flash, false, why == S11ChatRules\.WhyVsc, -1, 0, seq, probe\);\s*return;\s*\}\s*probe\?\.released\(why, frames, ms, false, why == S11ChatRules\.WhyVsc, -1, 0, flash\);/.test(oldCb),
      probeDevOnly: /if \(!P1Perf\.enabled \|\| view == null\)\s*\{\s*return null;\s*\}/.test(bodyOf(SCP, 'public static S11FlashProbe? start(')),
      /* ★ S11 C2 (R1-m5): the listener comes off the captured VTO when alive AND off the view's current one */
      probeStop: whole(bodyOf(bodyOf(SCP, 'private sealed class S11FlashProbe'), 'private void stop()'), `{ done = true; if (listener == null) { return; }
        try { if (vto != null && vto.IsAlive) { vto.RemoveOnDrawListener(listener); } } catch (Exception) { }
        try { Android.Views.ViewTreeObserver? now = view.ViewTreeObserver; if (now != null && now.IsAlive) { now.RemoveOnDrawListener(listener); } } catch (Exception) { } }`),
      seqField: /public int holdSeq = 0;/.test(bodyOf(SCP, 'private class PreloadOp')),
    };
    ok(Object.values(r).every(Boolean),
      '★ S11 C 10-FLASH (#1262) wiring: the candidate hold is the DEFAULT (no switch bit) and runs before the old PresentHold path; it pushes window.paintAck after setting holdPaintAck, releases on holdStep(true, …) or the cap and clears its hook; onPaintedSignal feeds it; the switches act only in dev mode; a skipped release action is deferred FlashDeferMs (never dropped); the probe exists only in a [P1] build · ★ S11 C2 (#1263): the frame loop (frames++ · int at = ackAt) and the answer hook (stale answers before frame 2 ignored, counted) are pinned WHOLE; a deferred action skips when a newer hold of the stage started; the probe listener also comes off the view\'s current VTO — ' + JSON.stringify(r));
  });

  await guard('S11 C dev switches', async () => {
    const DP = rd('Spixi/Pages/Dev/DevPage.xaml.cs');
    const verb = DP.slice(DP.indexOf('current_url.StartsWith("ixian:devflash:", StringComparison.Ordinal)'));
    const r = {
      verb: /if \(Preferences\.Default\.Get\("devMode", false\)\s*&& S11ChatRules\.applyFlashVerb\(current_url\.Substring\("ixian:devflash:"\.Length\), stored, out int next\)\)\s*\{\s*Preferences\.Default\.Set\(S11ChatRules\.FlashPrefKey, next\);\s*\}/.test(verb.slice(0, 900))
        && /pushFlashDev\(\);/.test(verb.slice(0, 1200)),
      seed: /Utils\.sendUiCommand\(this, "setCaps", "sendlog"\);\s*pushFlashDev\(\);/.test(DP),
      push: /Utils\.sendUiCommand\(this, "window\.setFlashDev", S11ChatRules\.flashSwitchesArg\(bits\)\);/.test(DP),
    };
    ok(Object.values(r).every(Boolean),
      '★ S11 C 10-FLASH (#1262) Developer switches: DevPage stores `ixian:devflash:` only through the exact grammar and in dev mode, echoes the positions, and seeds them on load (guarded window.setFlashDev) — ' + JSON.stringify(r));
  });

  await guard('S11 C auto-download wiring', async () => {
    const SP = rd('Spixi/Pages/Settings/SettingsPage.xaml.cs');
    const ST = rd('Spixi/Network/StreamProcessor.cs');
    const SC = rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs');
    const hdr = bodyOf(ST, 'public static void handleFileHeader(');
    const hook = bodyOf(SC, 'internal static void maybeAutoDownload(Friend friend, FriendMessage fm, int channel)');
    const okc = bodyOf(SC, 'private static bool autoDownloadContactOk(Friend friend, FriendMessage fm)');
    const closed = bodyOf(SC, 'private static void acceptOfferClosed(Friend friend, int selected_channel, FriendMessage message)');
    const onAcc = bodyOf(SC, 'public void onAcceptFile(int selected_channel, FriendMessage message)');
    const seq = ['message == null || message.localSender', 'TransferManager.getIncomingTransfer(message.transferId) != null', '(ulong)PhotoRules.MaxReceiveBytes',
      'System.IO.Path.GetFileName(message.filePath)', 'Utils.hidesParticipants(friend)', 'FriendList.getFriend(senderAddress)', 'ft.groupAddress = friend.walletAddress;',
      'TransferManager.prepareIncomingFileTransfer(ft)', 'TransferManager.acceptFile(senderFriend, ft.uid)'];
    const inOrder = (b) => seq.every((t, i) => b.indexOf(t) >= 0 && (i === 0 || b.indexOf(seq[i - 1]) < b.indexOf(t)));
    const r = {
      cap: /caps \+= ",photoAutoDl";/.test(SP) && /Utils\.sendUiCommand\(this, "setPhotoAutoDl", SAutoDownload\.setting\);/.test(SP),
      verb: /else if \(current_url\.StartsWith\("ixian:photoAutoDl:", StringComparison\.Ordinal\)\)\s*\{\s*if \(S11ChatRules\.parseAutoDownloadVerb\(current_url\.Substring\("ixian:photoAutoDl:"\.Length\), out string autoDl, out bool autoDlPictures\)\)\s*\{\s*SAutoDownload\.setting = autoDl;\s*SAutoDownload\.loadPictures = autoDlPictures;\s*\}\s*Utils\.sendUiCommand\(this, "setPhotoAutoDl", SAutoDownload\.setting\);\s*\}/.test(SP),
      header: /if \(!fm\.localSender\)\s*\{\s*SingleChatPage\.maybeAutoDownload\(friend, fm, data\.channel\);\s*\}/.test(hdr)
        && before(hdr, 'if (fm != null)', 'SingleChatPage.maybeAutoDownload(') && before(hdr, 'fm.fileSize = transfer.fileSize;', 'SingleChatPage.maybeAutoDownload('),
      /* ★ S11 C2 (#1263, R3-MAJOR-4 — W1): the hook WHOLE — the guards (incoming · not completed · a transfer id · Off first,
         nothing else read), the decision, the already-local / already-running refusals, the in-flight + per-chat limit
         (S11AutoLedger, TransferManager's running set) and the tap's accept path, in this order */
      hookWhole: whole(hook, `{ try {
        if (friend == null || fm == null || fm.localSender || fm.completed || string.IsNullOrEmpty(fm.transferId)) { return; }
        if (SAutoDownload.setting == S11ChatRules.AutoOff) { return; }
        MainThread.BeginInvokeOnMainThread(() => autoDownloadNow(friend, fm, channel));
      } catch (Exception e) { Logging.warn("Media: the automatic download check failed (" + e.GetType().Name + ")"); } }`)
        /* ★ S11 G3 re-base (#1263 MINOR-6): the main-thread half moved WHOLE into autoDownloadNow (the pending queue's pump
           re-decides through it; ★ #46 r4: only the live friend object + a message still in its channel); refused by the in-flight cap ALONE → queued (S11AutoLedger.offer), else as before */
        && whole(bodyOf(SC, 'private static void autoDownloadNow(Friend friend, FriendMessage fm, int channel)'), `{ try {
          if (!ReferenceEquals(FriendList.getFriend(friend.walletAddress), friend) || friend.getMessage(channel, fm.id) == null) { return; }
          long size = fm.fileSize > (ulong)long.MaxValue ? long.MaxValue : (long)fm.fileSize;
          bool go = S11ChatRules.shouldAutoDownload(SAutoDownload.setting, size, SharedItems.isImageName(fm.filePath ?? ""), onUnmeteredNetwork(), SAutoDownload.loadPictures, autoDownloadContactOk(friend, fm));
          if (!go || SharedItems.localPathOf(fm) != null || TransferManager.getIncomingTransfer(fm.transferId) != null) { return; }
          S11AutoAdmit admit = autoLedger.offer(friend.walletAddress.ToString(), fm.transferId, size, Environment.TickCount64, id => TransferManager.getIncomingTransfer(id) != null, new AutoOffer(friend, fm, channel));
          if (admit == S11AutoAdmit.Queued) { Logging.info("Media: an automatic download waits for a free slot"); armAutoRecheck(); return; }
          if (admit != S11AutoAdmit.Admitted) { Logging.info("Media: an automatic download waits for a tap (the limit)"); return; }
          SingleChatPage? page = Utils.getChatPage(friend);
          if (page != null) { page.onAcceptFile(channel, fm); } else { acceptOfferClosed(friend, channel, fm); }
          Logging.info("Media: a photo offer is downloading automatically");
        } catch (Exception e) { Logging.warn("Media: the automatic download failed (" + e.GetType().Name + ")"); } }`),
      ledger: /private static readonly S11AutoLedger autoLedger = new S11AutoLedger\(\);/.test(SC),
      /* ★ S11 C2 (#1263, R1-M1 — W3): a ROOM is bot || Group; the decision is the pure contactOkForAuto */
      contact: whole(okc, `{ bool isRoom = friend.bot || friend.type == FriendType.Group; bool senderOk = false;
        if (isRoom && !friend.bot && fm.senderAddress != null) { Friend? sender = FriendList.getFriend(fm.senderAddress); senderOk = sender != null && sender.approved && !sender.pendingDeletion; }
        return S11ChatRules.contactOkForAuto(isRoom, friend.bot, Utils.hidesParticipants(friend), friend.approved, friend.pendingDeletion, senderOk); }`),
      twin: inOrder(onAcc) && inOrder(closed) && !/sendUiCommand|updateFile/.test(closed),
      /* ★ S11 C2 (#1263, W2): the profile list → the pure unmeteredProfiles; a failed read = NOT unmetered */
      wifi: whole(bodyOf(SC, 'private static bool onUnmeteredNetwork()'), `{ try { List<string> names = new List<string>();
        foreach (Microsoft.Maui.Networking.ConnectionProfile p in Microsoft.Maui.Networking.Connectivity.Current.ConnectionProfiles) { names.Add(p.ToString()); }
        return S11ChatRules.unmeteredProfiles(names); } catch (Exception) { return false; } }`),
    };
    ok(Object.values(r).every(Boolean),
      '★ S11 C (#1262) photo auto-download wiring: SettingsPage grants photoAutoDl, seeds + echoes it, stores the verb only through the exact grammar; StreamProcessor hands every stored INCOMING offer to the hook, which returns at once while Off (the default), decides on the main thread through shouldAutoDownload (photo name · size · Wi-Fi/Ethernet · Load pictures mirror · approved contact) and accepts through onAcceptFile or its twin acceptOfferClosed (the same checks + TransferManager calls, same order, no UI) · ★ S11 C2 (#1263): the hook, the contact rule (a room = bot || Group; never a bot room) and the network read are pinned WHOLE; the in-flight + per-chat limit sits before the accept — ' + JSON.stringify(r));
  });
}
