/* ==== SESSION 7 — ★ #1208 VOICE MESSAGES (shell half), EXECUTED on the BUILT chat.html (jsdom; C# pushes via
 * executeUiCommand; outgoing ixian: commands captured at the Location href setter — the pins-s6b/edit.mjs harness).
 *   · the mic (#64 slot ON): only with setCaps `voice`, on an EMPTY field, never in edit / reply mode, never in a bot room;
 *     a tap sends EXACTLY ixian:voicerec:start (once per tap burst)
 *   · the recording bar (V6): recording → dot + "m:ss / 0:30" (resynced, ticking locally), stopped → frozen + grey,
 *     idle → the input back, denied / busy / error → a toast and the input back; ✕ = ixian:voicerec:cancel,
 *     ➤ = ixian:voicerec:send (never the tap that opened the bar); one polite status line at start / stop
 *   · the rows (V2 / V3): addMe / addThem arg 17 = durMs → a voice bubble (no text body, C#'s first line never shown);
 *     no arg 17 (old exe) or "" → the text row; addFile arg 17 "1" → a voice bubble, otherwise the file card
 *   · voiceInfo (V4) draws 40 bars + the length; voiceState (V5) drives Play / Pause / the position IN PLACE (the button
 *     keeps its node); play = EXACTLY ixian:voiceplay:<id>; one clip at a time; a re-render keeps the state
 *   · the menu on a voice row: Reply, never Edit, never Copy; the reply strip says "Voice message (0:12)", kind voice
 *   · #46 r1: the length rule (VoiceCodec.formatDuration), no event chip / Copy / tip excerpt from a voice row, the voice
 *     FILE transfer look (upload = loading, offer / pause clears a pending play's loading, deleted here = disabled),
 *     the play guards (400 ms double tap, a loading tap reaches C# after 2 s), loading is not exclusive, focus carry,
 *     a stale play button, a deleted row's clip, sendfail keeps the bar, no Reply / Edit with the bar up, Escape,
 *     the monotonic + capped timer, one voice quote rendering
 * Deliberate breaks (#802) — one-token mutation in src → rebuild → the named key goes red → restore (all KILLED):
 *   composer.js: no-context mic rule dropped → replyNoMic · MIC_GUARD_MS 0 → tapExact · SEND_GUARD_MS 0 → guardNoSend ·
 *     `if (prev !== state)` → true → liveQuiet · baseMs = ms (no max) → monotonic · 'Escape' → 'Esc' → escapeCancels ·
 *     recElapsed cap → 1e9 → capped30 · composer.css field display none → flex → barUp
 *   message-bubble.js: Pause label on 'paused' → pause · played bars pos/dur → position · position time → false → position ·
 *     VOICE_RETAP_LOADING_MS 1e9 → loadingRetap · retap `< 0` → loadingQuickIgnored · VOICE_TAP_GUARD_MS 0 → doubleTapOnce ·
 *     no half-up → round · no 1000 floor → round · play.disabled = false → gone
 *   chat.html: !mode.isBot dropped → botNoMic · start / cancel / send / voiceplay verbs renamed → tapExact / cancelExact /
 *     sendExact / playExact · voiceRec stopped closes the bar → stopped · 'denied' typo → deniedToast · 'sendfail' typo →
 *     sendfailToast · VOICE_REC_STATES check dropped → junkIgnoredBarUp · arg-17 test inverted → voiceBubble ·
 *     addFile `=== '1'` → `!== '0'` → emptyFileCard · buildRow skips voice → voiceBubble · peaks csv bound 1e9 → infoBounded ·
 *     one-at-a-time loop off → oneAtATime · loading made exclusive again → loadingSurvivesOther · offer / paused clear
 *     dropped → offerClears / pausedClears · upload look on 'received' → uploadLoading · gone off → gone · menu text for
 *     voice → mineNoCopy · canEditRec voice rule → mineNoEdit · canReplyRec / canEditRec bar rule → barNoReply ·
 *     replyKindOf voice → stripText · '🎤' key → quoteVoiceFile · voice prefix kind null → quoteVoice · voice excerpt ms 0 →
 *     quoteVoice · loaded quote text '' → quoteLoaded · syncVoiceCap off → capMic · play focus carry off → focusCarried ·
 *     playVoice row check dropped → staleNoPlay · eventChip voice rule → noEventChip · voice-file tick renderLog →
 *     tickNoRerender · "File sent" voice rule → noFileSentToast · voiceClips.delete → deleteForgets · select textOf voice
 *     rule → selectNoCopy · tip excerpt voice rule → tipNoExcerpt
 *   #46 r2: VOICE_COMPLETE_GRACE settle off → completeSettles · loading re-push only on transition → repushRestartsWait ·
 *     updateFile `rec.paused = false` dropped (the settle now also paints in place) → revivedKeepsLoading · releaseComposerRecording on sendfail dropped →
 *     sendfailReleases · ctx-Escape `!composerRec.has(el)` dropped → escapeRecordingOnly · grace timer ignores loadingAt →
 *     laterLoadingWins
 * Survivor (by design): the first-line belt in upsertText — every text sink skips a voice row, so no DOM can see it. */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const NOW = Math.floor(Date.now() / 1000);
  const T0 = NOW - 3600;
  const LINE1 = '🎤 0:12 (voice message — update Spixi to play)';
  const VID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';    // 32 hex — a voice row id as C# pushes it
  const FID = 'f1e2d3c4b5a6978877665544332211aa';    // the voice FILE row
  const MID = 'b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0';    // MY voice row
  const PEAKS = Array.from({ length: 40 }, (_, i) => (i * 7) % 101).join(',');

  const boot = async () => {
    const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
    const errs = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    vc.on('error', (...a) => { const m = a.map(String).join(' '); if (/dispatch failed|Error/.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (/^ixian:/.test(c)) sent.push(c); } });
      },
    });
    await sleep(1600);
    const W = dom.window;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    const toasts = [];
    new W.MutationObserver((muts) => { for (const m of muts) for (const nd of m.addedNodes) if (nd.nodeType === 1 && nd.classList && nd.classList.contains('c-toast')) toasts.push(nd.textContent || ''); })
      .observe(W.document.body, { childList: true, subtree: true });
    return { dom, W, d: W.document, push, errs, sent, toasts };
  };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
  const guard = async (label, fn) => { try { await fn(); } catch (e) { ok(false, label + ' THREW: ' + (e && e.stack || e)); } };
  const closeAll = (W) => { for (let i = 0; i < 4; i++) { try { if (!W.Spixi.dismissTopOverlay()) break; } catch (e) { break; } } };
  const rowOf = (d, id) => d.querySelector('#messages [data-msgid="' + id + '"]');
  const input = (d) => d.querySelector('.c-composer__input');
  const action = (d) => d.querySelector('.c-composer__action');
  const bar = (d) => d.querySelector('.c-composer__rec');
  const strip = (d) => d.querySelector('.c-composer__ctx');
  const isMic = (d) => action(d).dataset.mode === 'mic' && action(d).getAttribute('aria-label') === 'Record voice message';
  const type = (W, d, v) => { input(d).value = v; input(d).dispatchEvent(new W.Event('input')); };
  const menuItems = async (W, d, id) => {
    const r = rowOf(d, id);
    const t = r && (r.querySelector('.c-bubble, .c-tcard, .c-fbubble, .c-mbubble') || r);
    if (!t) return [];
    const init = { bubbles: true, cancelable: true, clientX: 5, clientY: 5, button: 2, pointerType: 'mouse', pointerId: 1 };
    const pd = typeof W.PointerEvent === 'function' ? new W.PointerEvent('pointerdown', init) : new W.MouseEvent('pointerdown', init);
    if (pd.pointerType !== 'mouse') Object.defineProperty(pd, 'pointerType', { value: 'mouse' });
    t.dispatchEvent(pd);
    t.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(60);
    const sheets = [...d.querySelectorAll('.c-msgmenu')];
    const m = sheets[sheets.length - 1];
    return m ? [...m.querySelectorAll('.c-msgmenu__item')] : [];
  };
  const labels = async (W, d, id) => { const l = (await menuItems(W, d, id)).map((b) => b.textContent.trim()); closeAll(W); await sleep(650); return l; };
  const pick = async (W, d, id, label) => {
    const it = (await menuItems(W, d, id)).find((b) => b.textContent.trim() === label);
    if (it) it.click();
    await sleep(60);
    closeAll(W);
    await sleep(20);
    return !!it;
  };
  const vv = (list) => list.filter((c) => /^ixian:voice/.test(c));   // the voice verbs (other traffic — the N51 overlay mirror — may interleave)
  const voiceOf = (d, id) => { const r = rowOf(d, id); return r ? r.querySelector('.c-voice') : null; };
  const playBtn = (d, id) => { const v = voiceOf(d, id); return v ? v.querySelector('.c-voice__play') : null; };
  const stateOf = (d, id) => { const v = voiceOf(d, id); return v ? v.dataset.state : null; };
  const attr = (el, a) => (el ? el.getAttribute(a) : null);
  const timeOf = (d, id) => { const v = voiceOf(d, id); return v ? v.querySelector('.c-voice__time').textContent : null; };
  const played = (d, id) => { const v = voiceOf(d, id); return v ? v.querySelectorAll('.c-voice__bar[data-played]').length : -1; };

  const open = async (caps, { type: chatType = '0' } = {}) => {
    const s = await boot();
    s.push('onChatScreenReady', 'addrPeer');
    s.push('setChatMode', chatType, '0', '', 'False');
    if (caps) s.push('setCaps', caps);
    s.push('clearMessages', 'false');
    s.push('addThem', 'cc01', 'addrPeer', 'Bob', '', 'their words', String(T0), 'True', 'True', 'True', 'False', 'False');
    s.push('addMe', 'cc02', 'addrMe', 'Me', '', 'my words', String(T0 + 60), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
    if (typeof s.W.messagesDone === 'function') s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(300);
    return s;
  };

  /* ——— 1. the mic: who sees it, and the one verb ——— */
  await guard('#1208 mic', async () => {
    const r = {};
    {
      const s = await open('reply,edit');
      r.noCapNoMic = !isMic(s.d) && action(s.d).dataset.mode === 'send';
      r.noCapNoErr = noErr(s.errs);
      s.dom.window.close();
    }
    {
      const s = await open('reply,edit', { type: '3' });   // a bot room — C# never declares voice there; the shell belt
      s.push('setCaps', 'voice');
      await sleep(40);
      r.botNoMic = !isMic(s.d);
      s.dom.window.close();
    }
    {
      const s = await open('reply,edit');
      const { W, d } = s;
      r.lateCapBeforeNoMic = !isMic(d);
      s.push('setCaps', 'voice');                          // a capability that lands after the first paint
      await sleep(40);
      r.capMic = isMic(d) && input(d).value === '';
      type(W, d, 'hello');
      r.textNoMic = !isMic(d) && action(d).getAttribute('aria-label') === 'Send';
      type(W, d, '   ');
      r.blankIsEmpty = isMic(d);
      type(W, d, '');
      r.pickedReply = await pick(W, d, 'cc01', 'Reply');
      r.replyNoMic = !!strip(d) && !isMic(d) && action(d).disabled === true;
      d.querySelector('.c-composer__ctx-cancel').click();
      await sleep(30);
      r.replyCancelMic = !strip(d) && isMic(d);
      r.pickedEdit = await pick(W, d, 'cc02', 'Edit');
      r.editNoMic = !!strip(d) && strip(d).dataset.kind === 'edit' && !isMic(d) && action(d).getAttribute('aria-label') === 'Save';
      input(d).dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await sleep(30);
      r.editCancelMic = !strip(d) && isMic(d);
      const before = s.sent.length;
      action(d).click();
      action(d).click();                                   // a double tap: ONE start
      await sleep(40);
      const out = vv(s.sent.slice(before));
      r.tapExact = out.length === 1 && out[0] === 'ixian:voicerec:start';
      r.noOptimisticBar = !bar(d) && isMic(d);             // the bar waits for C#'s voiceRec
      r.noErr = noErr(s.errs);
      s.dom.window.close();
    }
    ok(Object.values(r).every((x) => x === true),
      '★★ #1208 MIC on the built chat shell: no setCaps `voice` → the disc stays Send; a bot room never shows it; with `voice` (also when it lands after the paint) → the mic on an EMPTY field ("Record voice message"), Send once there is text, the mic again when it is blank; NOT in reply mode (Send, disabled) nor in edit mode (Save), back after ✕ / Escape; a tap (even a double tap) sends EXACTLY one ixian:voicerec:start and draws nothing until C# answers — ' + JSON.stringify(r));
  });

  /* ——— 2. the recording bar: voiceRec drives it; ✕ / ➤ send the exact verbs ——— */
  await guard('#1208 bar', async () => {
    const s = await open('reply,edit,voice');
    const { W, d, push } = s;
    const r = {};
    const comp = d.querySelector('.c-composer');
    const field = d.querySelector('.c-composer__field');
    push('voiceRec', 'recording', '0');
    await sleep(30);
    const b = bar(d);
    r.barUp = !!b && b.dataset.state === 'recording' && comp.hasAttribute('data-rec') && W.getComputedStyle(field).display === 'none';
    r.barParts = !!b && !!b.querySelector('.c-composer__rec-dot') && b.querySelector('.c-composer__rec-cancel').getAttribute('aria-label') === 'Discard recording';   // ★ S8 picks (#1239 R1) re-base: the ✕ is the trash "Discard recording" now (same verb voicerec:cancel)
    r.timerStart = !!b && b.querySelector('.c-composer__rec-time').textContent === '0:00 / 0:30';
    r.timerHidden = !!b && b.querySelector('.c-composer__rec-time').getAttribute('aria-hidden') === 'true';
    r.sendDisc = action(d).dataset.mode === 'voicesend' && action(d).getAttribute('aria-label') === 'Send voice message' && !action(d).disabled;
    const quick = s.sent.length;
    action(d).click();                                     // the opening tap's twin — inside the guard: nothing
    await sleep(20);
    r.guardNoSend = vv(s.sent.slice(quick)).length === 0;
    await sleep(150);
    const live = b.querySelector('.c-composer__rec-live');
    r.liveStart = live.getAttribute('role') === 'status' && live.textContent === 'Recording voice message';
    let liveWrites = 0;
    new W.MutationObserver((m) => { liveWrites += m.length; }).observe(live, { childList: true, characterData: true, subtree: true });
    push('voiceRec', 'recording', '7000');                 // the ~1 s resync
    await sleep(30);
    r.resync = b.querySelector('.c-composer__rec-time').textContent === '0:07 / 0:30';
    r.liveQuiet = liveWrites === 0 && live.textContent === 'Recording voice message';   // a resync is not announced (no write at all)
    await sleep(1300);
    r.ticksLocally = /^0:0[89] \/ 0:30$/.test(b.querySelector('.c-composer__rec-time').textContent);   // timing-robust: 1.3 s after 0:07
    /* ★ #46 r1 NIT: a resync that is BEHIND the local tick never runs the clock backwards */
    const shownBefore = b.querySelector('.c-composer__rec-time').textContent;
    push('voiceRec', 'recording', '7100');
    await sleep(30);
    r.monotonic = b.querySelector('.c-composer__rec-time').textContent === shownBefore;
    /* SH13: the local tick stops at 30 s (C# says stopped; the bar never shows 0:31) */
    push('voiceRec', 'recording', '29800');
    await sleep(1400);
    r.capped30 = b.querySelector('.c-composer__rec-time').textContent === '0:30 / 0:30';
    r.sameBar = bar(d) === b;
    const before = s.sent.length;
    b.querySelector('.c-composer__rec-cancel').click();
    b.querySelector('.c-composer__rec-cancel').click();    // a second tap while C# answers: nothing more
    await sleep(30);
    r.cancelExact = JSON.stringify(vv(s.sent.slice(before))) === JSON.stringify(['ixian:voicerec:cancel']);
    push('voiceRec', 'stopped', '30000');                  // 30 s reached (or an interrupt): the clip is kept
    await sleep(30);
    r.stopped = bar(d) === b && b.dataset.state === 'stopped' && b.querySelector('.c-composer__rec-time').textContent === '0:30 / 0:30';
    r.liveStop = live.textContent === 'Recording stopped, 0:30';
    await sleep(600);
    r.frozen = b.querySelector('.c-composer__rec-time').textContent === '0:30 / 0:30';
    /* §7 sendfail: a refused send keeps the clip — the bar STAYS (stopped), one "could not be sent" toast */
    {
      const n = s.toasts.length;
      push('voiceRec', 'sendfail', '0');
      for (let i = 0; i < 60 && s.toasts.length === n; i++) await sleep(100);
      r.sendfailToast = s.toasts.length === n + 1 && /could not be sent/.test(s.toasts[n]) && !/recorded/.test(s.toasts[n]);
      r.sendfailKeepsBar = bar(d) === b && b.dataset.state === 'stopped';
    }
    const b2 = s.sent.length;
    action(d).click();
    action(d).click();
    await sleep(30);
    r.sendExact = JSON.stringify(vv(s.sent.slice(b2))) === JSON.stringify(['ixian:voicerec:send']);
    push('voiceRec', 'idle', '0');
    await sleep(30);
    r.idleBack = !bar(d) && !comp.hasAttribute('data-rec') && W.getComputedStyle(field).display !== 'none' && isMic(d);
    /* an interrupt restored on (re)load: stopped with no recording before it */
    push('voiceRec', 'stopped', '12400');
    await sleep(30);
    r.restoredStopped = !!bar(d) && bar(d).dataset.state === 'stopped' && bar(d).querySelector('.c-composer__rec-time').textContent === '0:12 / 0:30';
    /* B m-4: no Reply / Edit while the bar is up (the menu hides them) */
    const l1 = await labels(W, d, 'cc01');
    const l2 = await labels(W, d, 'cc02');
    r.barNoReply = !l1.includes('Reply') && !l2.includes('Edit') && !!bar(d) && !strip(d);
    /* SH17: a junk state WITH the bar up changes nothing */
    push('voiceRec', 'bogus', '5000');
    await sleep(30);
    r.junkIgnoredBarUp = !!bar(d) && bar(d).dataset.state === 'stopped' && bar(d).querySelector('.c-composer__rec-time').textContent === '0:12 / 0:30';
    /* NIT: Escape in the composer area cancels (the ✕'s path) */
    const b3 = s.sent.length;
    action(d).dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await sleep(30);
    r.escapeCancels = JSON.stringify(vv(s.sent.slice(b3))) === JSON.stringify(['ixian:voicerec:cancel']);
    push('voiceRec', 'idle', '0');
    await sleep(30);
    r.replyBackAfter = (await labels(W, d, 'cc01')).includes('Reply');
    /* denied / busy / error: the input back + a toast each; a junk state is ignored */
    for (const [st, re] of [['denied', /when asked, or in your device settings, then tap the mic again/i], ['busy', /during a call/i], ['error', /could not be recorded/i]]) {
      push('voiceRec', 'recording', '1000');
      await sleep(20);
      const n = s.toasts.length;
      push('voiceRec', st, '0');
      for (let i = 0; i < 60 && s.toasts.length === n; i++) await sleep(100);   // the toast host shows one at a time (3.5 s each)
      r[st + 'Back'] = !bar(d) && isMic(d);
      r[st + 'Toast'] = s.toasts.length === n + 1 && re.test(s.toasts[s.toasts.length - 1]);
    }
    push('voiceRec', 'bogus', '5000');
    await sleep(30);
    r.junkIgnored = !bar(d);
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ #1208 RECORDING BAR on the built chat shell: voiceRec recording → the bar REPLACES the field (the trash "Discard recording" — S8 #1239, the dot, "0:00 / 0:30" aria-hidden) and the disc is "Send voice message"; the tap that opened it sends nothing; ONE polite status line at the start, silent on a resync; recording 7000 → "0:07 / 0:30", then it ticks locally, a late resync never runs it backwards and the tick stops at 0:30; ✕ sends EXACTLY ixian:voicerec:cancel (once); stopped 30000 → frozen "0:30 / 0:30" + "Recording stopped, 0:30"; sendfail → one "could not be sent" toast and the bar stays; ➤ sends EXACTLY ixian:voicerec:send (once); idle → the input and the mic back; a restored stopped clip shows its length; while the bar is up the menu has no Reply / Edit, a junk state changes nothing and Escape sends ixian:voicerec:cancel; denied / busy / error → the input back + one toast each; a junk state is ignored — ' + JSON.stringify(r));
    s.dom.window.close();
  });

  /* ——— 3. the rows: arg 17, voiceInfo, voiceState, play ——— */
  await guard('#1208 rows', async () => {
    const s = await open('reply,edit,voice');
    const { d, push } = s;
    const r = {};
    push('addThem', VID, 'addrPeer', 'Bob', '', LINE1, String(T0 + 120), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '12000');
    push('addThem', 'cc10', 'addrPeer', 'Bob', '', LINE1, String(T0 + 130), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');   // an OLD exe: 16 args
    push('addThem', 'cc11', 'addrPeer', 'Bob', '', LINE1, String(T0 + 140), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '');   // C#: not voice
    push('addMe', MID, 'addrMe', 'Me', '', LINE1, String(T0 + 150), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '4600');
    push('addFile', FID, 'addrPeer', 'Bob', '', 'fv1', 'voice-20261005-120000.ogg', String(T0 + 160), 'False', 'False', 'False', '0', 'False', 'False', 'True', '', '1', '1');
    push('addFile', 'cc12', 'addrPeer', 'Bob', '', 'fv2', 'voice-20261005-120001.ogg', String(T0 + 170), 'False', 'False', 'False', '0', 'False', 'False', 'True', '', '1');   // old exe
    push('addFile', 'cc14', 'addrPeer', 'Bob', '', 'fv3', 'voice-20261005-120002.ogg', String(T0 + 175), 'False', 'False', 'False', '0', 'False', 'False', 'True', '', '1', '');   // C#: not voice (too big / a bot room)
    await sleep(150);
    const vr = rowOf(d, VID);
    r.voiceBubble = !!voiceOf(d, VID) && !vr.querySelector('.c-bubble__text');
    r.noFirstLine = !/update Spixi/.test(vr.textContent) && !/spixi\.voice/.test(vr.textContent);
    r.duration = timeOf(d, VID) === '0:12';
    r.playName = attr(playBtn(d, VID), 'aria-label') === 'Play voice message, 0:12';
    r.placeholder = !!voiceOf(d, VID) && voiceOf(d, VID).querySelectorAll('.c-voice__bar').length === 40 && voiceOf(d, VID).querySelector('.c-voice__wave').hasAttribute('data-placeholder');
    r.oldExeText = !voiceOf(d, 'cc10') && /update Spixi to play/.test(rowOf(d, 'cc10').querySelector('.c-bubble__text').textContent);
    r.emptyArgText = !voiceOf(d, 'cc11') && !!rowOf(d, 'cc11').querySelector('.c-bubble__text');
    r.mineVoice = !!voiceOf(d, MID) && timeOf(d, MID) === '0:05' && !!rowOf(d, MID).querySelector('.c-bubble__meta .c-status-icon');
    r.fileVoice = !!voiceOf(d, FID) && !rowOf(d, FID).querySelector('.c-fbubble, .c-tcard') && timeOf(d, FID) === '' && attr(playBtn(d, FID), 'aria-label') === 'Play voice message';
    r.oldFileCard = !voiceOf(d, 'cc12') && !!rowOf(d, 'cc12');
    r.emptyFileCard = !voiceOf(d, 'cc14') && !!rowOf(d, 'cc14');
    /* voiceInfo: 40 bars + the length (the file row learns it here) */
    push('voiceInfo', FID, '8400', PEAKS);
    await sleep(30);
    const bars = voiceOf(d, FID) ? [...voiceOf(d, FID).querySelectorAll('.c-voice__bar')] : [];
    r.infoBars = bars.length === 40 && !!voiceOf(d, FID) && !voiceOf(d, FID).querySelector('.c-voice__wave').hasAttribute('data-placeholder')
      && bars.every((x, i) => x.style.getPropertyValue('--voice-h') === String((i * 7) % 101));
    r.infoTime = timeOf(d, FID) === '0:08' && attr(playBtn(d, FID), 'aria-label') === 'Play voice message, 0:08';
    push('voiceInfo', 'not-hex!', '9000', PEAKS);
    push('voiceInfo', VID, '9000', 'x'.repeat(600));        // oversized peaks: refused whole
    await sleep(30);
    r.infoBounded = timeOf(d, VID) === '0:12' && noErr(s.errs);
    /* play = the exact verb; the state comes back from C# */
    const b0 = s.sent.length;
    const btn = playBtn(d, VID);
    if (btn) { btn.focus(); btn.click(); }
    await sleep(30);
    r.playExact = JSON.stringify(vv(s.sent.slice(b0))) === JSON.stringify(['ixian:voiceplay:' + VID]);
    r.noOptimisticPlay = !!btn && btn.getAttribute('aria-label') === 'Play voice message, 0:12';
    push('voiceState', VID, 'playing', '3000', '12000');
    await sleep(30);
    r.pause = !!btn && playBtn(d, VID) === btn && btn.getAttribute('aria-label') === 'Pause voice message' && stateOf(d, VID) === 'playing';
    r.position = timeOf(d, VID) === '0:03' && played(d, VID) === 10;
    r.focusKept = !!btn && d.activeElement === btn;
    /* a re-render (a new row) draws the same state */
    push('addThem', 'cc13', 'addrPeer', 'Bob', '', 'after', String(T0 + 200), 'True', 'True', 'True', 'False', 'False');
    await sleep(80);
    r.rerenderKeeps = attr(playBtn(d, VID), 'aria-label') === 'Pause voice message' && timeOf(d, VID) === '0:03';
    push('voiceState', VID, 'paused', '4500', '12000');
    await sleep(30);
    r.paused = /^Play voice message/.test(attr(playBtn(d, VID), 'aria-label')) && timeOf(d, VID) === '0:04';
    /* one clip at a time */
    push('voiceState', VID, 'playing', '5000', '12000');
    push('voiceState', FID, 'playing', '200', '8400');
    await sleep(30);
    r.oneAtATime = /^Play voice message/.test(attr(playBtn(d, VID), 'aria-label')) && timeOf(d, VID) === '0:12'
      && attr(playBtn(d, FID), 'aria-label') === 'Pause voice message';
    push('voiceState', FID, 'stopped', '0', '8400');
    await sleep(30);
    r.stopped = attr(playBtn(d, FID), 'aria-label') === 'Play voice message, 0:08' && timeOf(d, FID) === '0:08' && played(d, FID) === 0;
    push('voiceState', FID, 'loading', '0', '0');
    await sleep(30);
    const b1 = s.sent.length;
    if (playBtn(d, FID)) playBtn(d, FID).click();
    await sleep(30);
    r.loadingBusy = attr(playBtn(d, FID), 'aria-busy') === 'true' && vv(s.sent.slice(b1)).length === 0;
    push('voiceState', FID, 'error', '0', '0');
    await sleep(30);
    r.error = stateOf(d, FID) === 'error' && /can.t be played/.test(attr(playBtn(d, FID), 'aria-label'));
    push('voiceState', VID, 'rewinding', '1', '1');
    await sleep(30);
    r.junkState = timeOf(d, VID) === '0:12';
    /* a status push (7 args, no arg 17) that carries the marker line keeps the row voice and shows none of it */
    push('updateMessage', MID, LINE1 + '\nspixi.voice.1:4600:AAAA', 'True', 'True', 'True', 'False', 'False');
    await sleep(60);
    r.updateKeepsVoice = !!voiceOf(d, MID) && !/spixi\.voice|AAAA/.test(rowOf(d, MID).textContent);
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ #1208 VOICE ROWS on the built chat shell: addThem arg 17 "12000" → a voice bubble (no text body, C#\'s first line never shown, "0:12", "Play voice message, 0:12", 40 flat placeholder bars); 16 args (old exe) or arg 17 "" → the text row; my addMe arg 17 → a voice bubble with its tick; addFile arg 17 "1" → a voice bubble (no file card, no length yet), without it or with "" the file row; voiceInfo → 40 bars at C#\'s heights + "0:08"; a bad id / oversized peaks are refused; play sends EXACTLY ixian:voiceplay:<id> and paints nothing itself; voiceState playing → "Pause voice message" on the SAME node (focus kept) + "0:03" + 10 played bars, kept across a re-render; paused / stopped → Play + the position / the length; one clip at a time; loading = aria-busy and a tap sends nothing; error → the error state; a junk state is ignored; a 7-arg status push carrying the marker line keeps the row voice and shows none of it — ' + JSON.stringify(r));
    s.dom.window.close();
  });

  /* ——— 4. the menu on a voice row + the reply strip + C#'s voice excerpt in a quote ——— */
  await guard('#1208 menu', async () => {
    const s = await open('reply,edit,voice');
    const { W, d, push } = s;
    const r = {};
    push('addThem', VID, 'addrPeer', 'Bob', '', LINE1, String(T0 + 120), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '12000');
    push('addMe', MID, 'addrMe', 'Me', '', LINE1, String(T0 + 150), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '4600');
    push('addFile', FID, 'addrPeer', 'Bob', '', 'fv1', 'voice-20261005-120000.ogg', String(T0 + 160), 'False', 'False', 'False', '0', 'False', 'False', 'True', '', '1', '1');
    await sleep(120);
    const mine = await labels(W, d, MID);
    r.mineReply = mine.includes('Reply') && mine.includes('Delete');
    r.mineNoEdit = !mine.includes('Edit');
    r.mineNoCopy = !mine.includes('Copy');
    r.textStillEdit = (await labels(W, d, 'cc02')).includes('Edit');   // the text row beside it still offers Edit
    const theirs = await labels(W, d, VID);
    r.theirsReplyNoCopy = theirs.includes('Reply') && !theirs.includes('Copy') && !theirs.includes('Edit');
    const file = await labels(W, d, FID);
    r.fileReplyNoCopy = file.includes('Reply') && !file.includes('Copy');
    r.picked = await pick(W, d, VID, 'Reply');
    const st = strip(d);
    r.stripKind = !!st && st.dataset.kind === 'reply' && st.dataset.quoteKind === 'voice';
    r.stripText = !!st && /Voice message \(0:12\)/.test(st.textContent) && !/update Spixi/.test(st.textContent);
    r.stripNoMic = !isMic(d);
    /* the reply goes out on the reply verb like any other (C# quotes the voice row as "🎤 0:12") */
    type(W, d, 'nice');
    const b0 = s.sent.length;
    action(d).click();
    await sleep(30);
    r.replyVerb = s.sent.slice(b0).includes('ixian:chatreply:' + VID + ':nice') && vv(s.sent.slice(b0)).length === 0;
    /* a quote of a voice row OUTSIDE the window: C#'s excerpt "🎤 0:12" → the mic glyph + the length; "🎤" alone (a voice file) → the label */
    push('addThem', 'cc20', 'addrPeer', 'Bob', '', 'about that', String(T0 + 300), 'True', 'True', 'True', 'False', 'False', '', 'ffff0000ffff0000ffff0000ffff0000', '', '', '🎤 0:12');
    push('addThem', 'cc21', 'addrPeer', 'Bob', '', 'and that', String(T0 + 310), 'True', 'True', 'True', 'False', 'False', '', 'eeee0000eeee0000eeee0000eeee0000', '', '', '🎤');
    push('addThem', 'cc22', 'addrPeer', 'Bob', '', 'text', String(T0 + 320), 'True', 'True', 'True', 'False', 'False', '', 'dddd0000dddd0000dddd0000dddd0000', '', '', '🎤 hello there');
    await sleep(80);
    const q = (id) => rowOf(d, id).querySelector('.c-bubble__reply');
    r.quoteVoice = !!q('cc20') && !!q('cc20').querySelector('.c-bubble__reply-glyph') && q('cc20').querySelector('.c-bubble__reply-text').textContent === 'Voice message (0:12)';
    r.quoteVoiceFile = !!q('cc21') && !!q('cc21').querySelector('.c-bubble__reply-glyph') && q('cc21').querySelector('.c-bubble__reply-text').textContent === 'Voice message';
    r.quoteTextStays = !!q('cc22') && !q('cc22').querySelector('.c-bubble__reply-glyph') && q('cc22').querySelector('.c-bubble__reply-text').textContent === '🎤 hello there';
    /* a LOADED voice target quotes as the kind */
    push('addThem', 'cc23', 'addrPeer', 'Bob', '', 'loaded', String(T0 + 330), 'True', 'True', 'True', 'False', 'False', '', VID, '', '', '🎤 0:12');
    await sleep(80);
    r.quoteLoaded = !!q('cc23') && q('cc23').querySelector('.c-bubble__reply-text').textContent === 'Voice message (0:12)';
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ #1208 VOICE MENU on the built chat shell: my voice row offers Reply + Delete and NEVER Edit or Copy (the text row beside it still offers Edit); a received voice row and a voice FILE row offer Reply, no Copy; Reply opens the strip with kind voice and "Voice message (0:12)" (never C#\'s first line) and no mic, and sends on ixian:chatreply:; ONE voice quote everywhere (B m-8): an unloaded target\'s "🎤 0:12" → the mic glyph + "Voice message (0:12)", "🎤" = "Voice message", "🎤 hello there" stays text; a loaded voice target = "Voice message (0:12)" too — ' + JSON.stringify(r));
    s.dom.window.close();
  });
  /* ——— 5. #46 r1: the length rule, guards, the voice FILE transfer states, focus, the r1 test survivors ——— */
  await guard('#1208 r1', async () => {
    const s = await open('reply,edit,voice');
    const { W, d, push } = s;
    const r = {};
    const P = (id, ms, t, text = LINE1) => push('addThem', id, 'addrPeer', 'Bob', '', text, String(T0 + t), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', ms);
    P('d0000001', '499', 100); P('d0000002', '500', 101); P('d0000003', '1499', 102); P('d0000004', '1500', 103);
    P(VID, '12000', 110); P('d0000010', '6000', 111);
    P('d0000020', '3000', 112, 'You are now connected with Bob.');   // SH4: a voice row whose line looks like the accepted-request event
    push('addFile', FID, 'addrPeer', 'Bob', '', 'fv1', 'voice-20261005-120000.ogg', String(T0 + 120), 'False', 'False', 'False', '0', 'False', 'False', 'True', '', '1', '1');
    push('addFile', MID, 'addrMe', 'Me', '', 'fv9', 'voice-20261005-130000.ogg', String(T0 + 130), 'True', 'True', 'False', '30', 'False', 'False', 'True', '', '1', '1');   // MY upload, running
    push('addFile', 'd0000030', 'addrPeer', 'Bob', '', 'fv8', 'voice-20261005-140000.ogg', String(T0 + 140), 'False', 'False', 'False', '100', 'True', 'False', 'True', '', '0', '1');   // deleted from this device
    await sleep(150);
    /* SH14: VoiceCodec.formatDuration — half up, at least 0:01 */
    r.round = ['d0000001', 'd0000002', 'd0000003', 'd0000004'].map((id) => timeOf(d, id)).join(',') === '0:01,0:01,0:01,0:02';
    /* SH4: no event chip from a voice row's line — it stays a menuable voice bubble */
    r.noEventChip = !!voiceOf(d, 'd0000020') && (await labels(W, d, 'd0000020')).includes('Reply');
    /* SH9: Select on a voice row — Copy stays disabled (no text to copy) */
    r.pickedSelect = await pick(W, d, VID, 'Select');
    const copyBtn = d.querySelector('.c-chatselect-bar [aria-label="Copy"]');
    r.selectNoCopy = !!copyBtn && copyBtn.disabled === true;
    const cx = d.querySelector('.c-chatselect-bar__cancel');
    if (cx) cx.click();
    await sleep(400);
    /* SH10: Tip on a voice row — the sheet quotes no excerpt (never C#'s first line) */
    r.pickedTip = await (async () => {
      const it = (await menuItems(W, d, VID)).find((b) => b.textContent.trim() === 'Tip');
      if (it) it.click();
      await sleep(120);
      return !!it;
    })();
    r.tipNoExcerpt = !!d.querySelector('.c-tipsheet') && !d.querySelector('.c-tipsheet__excerpt') && !/update Spixi/.test(d.querySelector('.c-tipsheet').textContent);
    closeAll(W);
    await sleep(650);
    /* B m-9: my upload = the loading look; a progress tick does NOT re-render (SH5); complete clears it, no "File sent" (SH6) */
    r.uploadLoading = stateOf(d, MID) === 'loading';
    const node = voiceOf(d, MID);
    push('updateFile', 'fv9', '50', 'False');
    await sleep(80);
    r.tickNoRerender = voiceOf(d, MID) === node;
    const tn = s.toasts.length;
    push('updateFile', 'fv9', '100', 'True');
    await sleep(600);
    r.uploadDone = stateOf(d, MID) === 'idle';
    r.noFileSentToast = !s.toasts.slice(tn).some((t) => /File sent/.test(t));
    /* B m-9: not on this device → disabled, the file card's words */
    const g = voiceOf(d, 'd0000030');
    r.gone = !!g && g.hasAttribute('data-gone') && !!playBtn(d, 'd0000030') && playBtn(d, 'd0000030').disabled === true && timeOf(d, 'd0000030') === 'File deleted from this device';
    /* B MAJOR-1: a pending play's download that goes back to an offer / pauses clears loading */
    push('voiceState', FID, 'loading', '0', '0');
    await sleep(20);
    r.fileLoading = stateOf(d, FID) === 'loading';
    push('addFile', FID, 'addrPeer', 'Bob', '', 'fv1', 'voice-20261005-120000.ogg', String(T0 + 120), 'False', 'False', 'False', '0', 'False', 'False', 'True', '', '1', '1');
    await sleep(60);
    r.offerClears = stateOf(d, FID) === 'idle';
    push('voiceState', FID, 'loading', '0', '0');
    push('addFile', FID, 'addrPeer', 'Bob', '', 'fv1', 'voice-20261005-120000.ogg', String(T0 + 120), 'False', 'False', 'False', '40', 'False', 'False', 'True', 'paused:40', '1', '1');
    await sleep(60);
    r.pausedClears = stateOf(d, FID) === 'idle';
    /* B MAJOR-1: a tap on loading — ignored at once, goes to C# after 2 s */
    push('voiceState', FID, 'loading', '0', '0');
    await sleep(20);
    const t0 = s.sent.length;
    if (playBtn(d, FID)) playBtn(d, FID).click();
    await sleep(30);
    r.loadingQuickIgnored = vv(s.sent.slice(t0)).length === 0;
    await sleep(2100);
    if (playBtn(d, FID)) playBtn(d, FID).click();
    await sleep(30);
    r.loadingRetap = JSON.stringify(vv(s.sent.slice(t0))) === JSON.stringify(['ixian:voiceplay:' + FID]);
    /* B m-2 / SH15: another clip PLAYING never resets a loading one */
    push('voiceState', VID, 'loading', '0', '0');
    push('voiceState', 'd0000010', 'playing', '1000', '6000');
    await sleep(30);
    r.loadingSurvivesOther = stateOf(d, VID) === 'loading' && stateOf(d, 'd0000010') === 'playing';
    /* B m-7: a double tap on play = ONE verb */
    push('voiceState', VID, 'stopped', '0', '12000');
    await sleep(30);
    const t1 = s.sent.length;
    if (playBtn(d, VID)) { playBtn(d, VID).click(); playBtn(d, VID).click(); }
    await sleep(30);
    r.doubleTapOnce = JSON.stringify(vv(s.sent.slice(t1))) === JSON.stringify(['ixian:voiceplay:' + VID]);
    /* B m-11: keyboard focus on a play button survives a full re-render */
    d.hasFocus = () => true;   // jsdom: the window never has OS focus; the carry asks document.hasFocus()
    if (playBtn(d, VID)) playBtn(d, VID).focus();
    P('d0000040', '', 200, 'a new text row');   // arg 17 "" = a text row → renderLog
    await sleep(120);
    r.focusCarried = !!playBtn(d, VID) && d.activeElement === playBtn(d, VID);
    /* SH1: a STALE play button of a row that C# turned into text sends nothing (playVoice re-checks the row) */
    const stale = playBtn(d, 'd0000010');
    push('updateMessage', 'd0000010', 'plain words now', 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
    await sleep(80);
    r.turnedText = !voiceOf(d, 'd0000010') && /plain words now/.test(rowOf(d, 'd0000010').textContent);
    const t2 = s.sent.length;
    if (stale) stale.click();
    await sleep(30);
    r.staleNoPlay = !!stale && vv(s.sent.slice(t2)).length === 0;
    /* SH7: a deleted row's clip state is forgotten — the same id re-added starts at Play */
    push('voiceState', 'd0000004', 'playing', '500', '1500');
    await sleep(20);
    push('deleteMessage', 'd0000004');
    await sleep(40);
    P('d0000004', '1500', 103);
    await sleep(80);
    r.deleteForgets = attr(playBtn(d, 'd0000004'), 'aria-label') === 'Play voice message, 0:02' && timeOf(d, 'd0000004') === '0:02';
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ #1208 #46 r1 on the built chat shell: the length is VoiceCodec.formatDuration (499 / 500 / 1499 → 0:01, 1500 → 0:02); a voice row never becomes an event chip; Select on it leaves Copy disabled and Tip quotes no excerpt; MY voice-file upload = the loading look, a progress tick does not re-render, complete clears it with no "File sent" toast; a file deleted from this device = a disabled bubble "File deleted from this device"; a pending play\'s download going back to an offer or pausing clears loading; a tap on loading is ignored at once and reaches C# after 2 s; another clip playing never resets a loading one; a double tap on play = one verb; focus on a play button survives a re-render; a stale play button of a row turned into text sends nothing; a deleted row\'s clip state is forgotten — ' + JSON.stringify(r));
    s.dom.window.close();
  });
  /* ——— 6. #46 r2: a completed download settles, sendfail releases the bar, a revived transfer keeps loading, a
         re-pushed loading restarts the re-tap wait, Escape ends only the recording ——— */
  await guard('#1208 r2', async () => {
    const s = await open('reply,edit,voice');
    const { W, d, push } = s;
    const r = {};
    const F = (id, fileid, n, progress, complete, transfer) => push('addFile', id, 'addrPeer', 'Bob', '', fileid, 'voice-20261005-15000' + n + '.ogg', String(T0 + 100 + n), 'False', 'False', 'False', progress, complete, 'False', 'True', transfer, '1', '1');
    F('e0000001', 'fe1', 1, '0', 'False', ''); F('e0000002', 'fe2', 2, '0', 'False', ''); F('e0000004', 'fe4', 4, '0', 'False', '');
    F('e0000003', 'fe3', 3, '40', 'False', 'paused:40'); F('e0000005', 'fe5', 5, '0', 'False', '');
    await sleep(150);
    /* MAJOR: complete + no play → loading for a short grace, then idle; a playing inside the grace wins; so does a re-pushed loading */
    push('voiceState', 'e0000001', 'loading', '0', '0');
    push('updateFile', 'fe1', '100', 'True');
    push('voiceState', 'e0000002', 'loading', '0', '0');
    push('updateFile', 'fe2', '100', 'True');
    push('voiceState', 'e0000004', 'loading', '0', '0');
    push('updateFile', 'fe4', '100', 'True');
    await sleep(300);
    r.graceKeepsLoading = stateOf(d, 'e0000001') === 'loading';
    push('voiceState', 'e0000004', 'loading', '0', '0');   // (before the playing: a new loading stops a playing clip, §4 V8)
    push('voiceState', 'e0000002', 'playing', '200', '8000');
    await sleep(1300);
    r.completeSettles = stateOf(d, 'e0000001') === 'idle';
    r.laterPlayingWins = stateOf(d, 'e0000002') === 'playing';
    r.laterLoadingWins = stateOf(d, 'e0000004') === 'loading';
    /* MINOR-3: paused (addFile) → a pending play → the transfer runs again (an updateFile tick) → still loading */
    push('voiceState', 'e0000003', 'loading', '0', '0');
    push('updateFile', 'fe3', '50', 'False');
    await sleep(60);
    r.revivedKeepsLoading = stateOf(d, 'e0000003') === 'loading';
    /* NIT: a RE-PUSHED loading restarts the 2 s re-tap wait */
    push('voiceState', 'e0000005', 'loading', '0', '0');
    await sleep(1500);
    push('voiceState', 'e0000005', 'loading', '0', '0');
    await sleep(700);
    const t0 = s.sent.length;
    if (playBtn(d, 'e0000005')) playBtn(d, 'e0000005').click();
    await sleep(30);
    r.repushRestartsWait = vv(s.sent.slice(t0)).length === 0;
    /* MINOR-2: ➤ → sendfail → stopped: ✕ answers at once (no 4 s lock) */
    push('voiceRec', 'stopped', '5000');
    await sleep(450);
    const t1 = s.sent.length;
    action(d).click();
    await sleep(30);
    push('voiceRec', 'sendfail', '0');
    push('voiceRec', 'stopped', '5000');
    await sleep(30);
    if (bar(d)) bar(d).querySelector('.c-composer__rec-cancel').click();
    await sleep(30);
    r.sendfailReleases = JSON.stringify(vv(s.sent.slice(t1))) === JSON.stringify(['ixian:voicerec:send', 'ixian:voicerec:cancel']);
    push('voiceRec', 'idle', '0');
    await sleep(30);
    /* NIT: a reply strip open when C# restores a kept clip — ONE Escape ends the recording only */
    r.pickedReply = await pick(W, d, 'cc01', 'Reply');
    push('voiceRec', 'stopped', '4000');
    await sleep(30);
    r.both = !!strip(d) && !!bar(d);
    const t2 = s.sent.length;
    input(d).dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await sleep(30);
    r.escapeRecordingOnly = JSON.stringify(vv(s.sent.slice(t2))) === JSON.stringify(['ixian:voicerec:cancel']) && !!strip(d);
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ #1208 #46 r2 on the built chat shell: a voice file whose download completes with no play stays loading for a short grace, then idle; a playing or a re-pushed loading inside the grace wins; a paused transfer that runs again (an updateFile tick) keeps a pending play loading; a re-pushed loading restarts the 2 s re-tap wait; after ➤ → sendfail → stopped the ✕ answers at once; with a reply strip AND a restored recording bar, one Escape cancels the recording only (the strip stays) — ' + JSON.stringify(r));
    s.dom.window.close();
  });
}
