/* ==== S8 PICKS (P-V) — the shared jsdom boot for the v-*.mjs voice pins (NOT a pin module: registered modules only) ====
 * Boots the BUILT chat.html (C# pushes through executeUiCommand, ixian: verbs captured at the Location href setter —
 * the pins-s7/shell.mjs harness). `open({ group, caps })` = a 1:1 (type 0) or a group (type 1) with two text rows. */
export function kit(h) {
  const { root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const NOW = Math.floor(Date.now() / 1000);
  const T0 = NOW - 3600;
  const boot = async ({ reduced = false } = {}) => {
    const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
    const errs = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    vc.on('error', (...a) => { const m = a.map(String).join(' '); if (/dispatch failed|Error/.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: reduced && /reduced-motion/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
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
    return { dom, W, d: W.document, push, errs, sent };
  };
  const open = async ({ group = false, caps = 'reply,edit,voice', before = null } = {}) => {
    const s = await boot();
    s.push('onChatScreenReady', group ? 'addrGroup' : 'addrPeer');
    s.push('setChatMode', group ? '1' : '0', '0', '', 'False');
    if (caps) s.push('setCaps', caps);
    if (before) before(s);
    s.push('clearMessages', 'false');
    s.push('addThem', 'cc01', group ? 'addrAna' : 'addrPeer', 'Ana', '', 'their words', String(T0), 'True', 'True', 'True', 'False', 'False');
    s.push('addMe', 'cc02', 'addrMe', 'Me', '', 'my words', String(T0 + 60), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
    if (typeof s.W.messagesDone === 'function') s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(300);
    return s;
  };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
  const rowOf = (d, id) => d.querySelector('#messages [data-msgid="' + id + '"]');
  const voiceOf = (d, id) => { const r = rowOf(d, id); return r ? r.querySelector('.c-voice') : null; };
  /* the CSSOM rules (inside @media too) whose selector list contains `sel` exactly */
  const rulesFor = (d, sel) => {
    const out = [];
    const walk = (rules, media) => { for (const ru of Array.from(rules || [])) { if (ru.cssRules && ru.media) walk(ru.cssRules, ru.media.mediaText); else if (ru.selectorText && ru.selectorText.split(',').some((x) => x.trim() === sel)) out.push({ style: ru.style, media }); } };
    for (const sh of Array.from(d.styleSheets)) { try { walk(sh.cssRules, ''); } catch (e) {} }
    return out;
  };
  return { b64, NOW, T0, boot, open, noErr, rowOf, voiceOf, rulesFor, sleep };
}
