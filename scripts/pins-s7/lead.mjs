/* ==== SESSION 7 — LEAD: ★ #1208 the updateMessage arg 12 `voice` (agent B's addition, shell side wired by the lead),
 * EXECUTED on the BUILT chat.html (the pins-s7/shell.mjs harness):
 *   · a 12-arg updateMessage with voice = the length keeps the voice bubble (a tick update of a voice row)
 *   · a 12-arg updateMessage with voice "" (C#'s explicit answer: not a voice row) turns the row into text
 *   · an 11-arg updateMessage (an older exe) leaves the voice row unchanged, and never shows a marker line as text
 * Deliberate break (#802): chat.html `if (voice !== undefined) s6.voice = voice;` removed → "explicitNo" fails. */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep, stripCode } = h;
  /* ★ lead (#46 r3 MINOR-1 / MINOR-2): a finished voice download auto-plays only in the FOREGROUND and never over a running
     recording (the pocket case; play would end the recording). SOURCE pin (MAUI-only). Deliberate breaks: drop
     `|| backgrounded` → fails · `#if ANDROID || IOS` → `#if true` (desktop too) → fails; isRecording returning `recorder != null` only → fails. */
  {
    const sc = stripCode(readFileSync(join(root, 'Spixi/Pages/Chat/SingleChatPage.xaml.cs'), 'utf8'));
    const vc = stripCode(readFileSync(join(root, 'Spixi/VoIP/VoiceClips.cs'), 'utf8'));
    /* #46 r4 MINOR-A: the foreground term is PHONE-only (a desktop window without focus is still on screen) — read on the
       RAW source, because stripCode keeps preprocessor lines but the #if / #else split is the point */
    const raw = readFileSync(join(root, 'Spixi/Pages/Chat/SingleChatPage.xaml.cs'), 'utf8').replace(/\r\n/g, '\n');
    const phoneOnly = /bool backgrounded = false;\n#if ANDROID \|\| IOS\n\s*backgrounded = !App\.isInForeground;\n#endif\n/.test(raw);
    const gate = phoneOnly && /if \(VoIPManager\.isInitiated\(\) \|\| !isShownChat\(\) \|\| backgrounded \|\| VoiceClips\.isRecording\)\s*\{\s*Logging\.info\([^;]*\);\s*pushVoiceState\(playHex, "stopped", 0, 0\);\s*return;\s*\}\s*Task\.Run\(\(\) => playVoiceFile\(playHex, path\)\);/.test(sc);
    const rec = /public static bool isRecording\s*\{\s*get\s*\{\s*lock \(gate\)\s*\{\s*return recorder != null \|\| startingGen >= 0;\s*\}\s*\}\s*\}/.test(vc);
    ok(gate && rec, '#1208 lead (#46 r3): the downloaded clip auto-plays only on the shown chat, in the foreground, with no call and no recording running (else `stopped`) — ' + JSON.stringify({ gate, rec }));
  }
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

  await guard('#1208 lead updateMessage arg 12', async () => {
    const r = {};
    const s = await open('reply,edit,voice');
    const MARK = 'spixi.voice.1:12340:AAAA';
    s.push('addThem', VID, 'addrPeer', 'Bob', '', LINE1, String(T0 + 120), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '12340');
    await sleep(80);
    r.start = !!voiceOf(s.d, VID);
    s.push('updateMessage', VID, LINE1 + '\n' + MARK, 'True', 'True', 'True', 'False', 'False', '', '', '', '', '12340');
    await sleep(80);
    r.keeps = !!voiceOf(s.d, VID) && !(rowOf(s.d, VID).textContent || '').includes('spixi.voice.1');
    s.push('updateMessage', VID, LINE1 + '\n' + MARK, 'True', 'True', 'True', 'False', 'False', '', '', '', '');
    await sleep(80);
    r.oldExe = !!voiceOf(s.d, VID) && !(rowOf(s.d, VID).textContent || '').includes('spixi.voice.1');
    s.push('updateMessage', VID, 'plain words now', 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
    await sleep(80);
    r.explicitNo = !voiceOf(s.d, VID) && /plain words now/.test(rowOf(s.d, VID) ? rowOf(s.d, VID).textContent : '');
    r.noErr = noErr(s.errs);
    s.dom.window.close();
    ok(Object.values(r).every(Boolean), '#1208 lead: updateMessage arg 12 — the length keeps the voice bubble, "" makes it text, an 11-arg push leaves it; no marker line is ever shown — ' + JSON.stringify(r));
  });
}
