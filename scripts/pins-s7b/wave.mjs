/* ==== SESSION 7b (S2) — ★ 7b (#1216 W1) THE WAVEFORM: 2px bars (S8), ≤ 2px apart, all 40 fit at 320 (S8 picks r1), clipped at the end ====
 * On the BUILT chat.html (jsdom): a voice file row + voiceInfo(40 peaks) → 40 bars; the CSS cascade on a bar resolves
 * to no grow, no shrink, a 3px basis and width; the wave box gaps 2px and clips (overflow hidden), so a narrow box cuts
 * bars at the END and never squeezes them. Deliberate breaks: see the 7b hand-back. */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 3600;
  try {
    const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f + '?mobile=1', virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set() {} });
      },
    });
    await sleep(1600);
    const W = dom.window;
    const d = W.document;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setCaps', 'reply,voice');
    push('clearMessages', 'false');
    push('addFile', 'vv01', 'addrPeer', 'Bob', '', 'fv1', 'voice-1.ogg', String(T0), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '1');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(120);
    push('voiceInfo', 'vv01', '15000', Array.from({ length: 40 }, (_, i) => String(10 + (i * 7) % 90)).join(','));
    await sleep(120);
    const row = d.querySelector('#messages [data-msgid="vv01"]');
    const wave = row && row.querySelector('.c-voice__wave');
    const bars = wave ? [...wave.querySelectorAll('.c-voice__bar')] : [];
    const cs = bars[0] ? W.getComputedStyle(bars[0]) : null;
    const ws = wave ? W.getComputedStyle(wave) : null;
    const r = {
      forty: bars.length === 40,
      noGrow: !!cs && cs.getPropertyValue('flex-grow') === '0',
      /* ★ S8 picks #46 r1 (NIT, lead: "fit 40 bars so the last bar draws") RE-BASE: the 40th bar was clipped at 320 / 360,
         so a narrow box now gives up its gaps first (space-between over a 1 px gap, a 158 px cap = Telegram's 2 px gaps)
         and then up to half a pixel per bar (shrink 1, min-width 1.5px); the box still clips below 99 px. Was: no shrink,
         a fixed 2 px gap. */
      shrinkFloor: !!cs && cs.getPropertyValue('flex-shrink') === '1' && cs.getPropertyValue('min-width') === '1.5px',
      basis3: !!cs && cs.getPropertyValue('flex-basis') === '2px',   // ★ S8 picks (#1240) re-base: Damir's Telegram-thin 2 px supersedes #1216's 3 px; fixed / no grow / no shrink / clipped all stay
      width3: !!cs && cs.getPropertyValue('width') === '2px',
      round: !!cs && /radius-full|999|50%/.test(cs.getPropertyValue('border-radius') + cs.getPropertyValue('border-top-left-radius')),
      gap1Spread: !!ws && /^1px( 1px)?$/.test((ws.getPropertyValue('gap') || ws.getPropertyValue('column-gap')).trim())
        && ws.getPropertyValue('justify-content') === 'space-between' && ws.getPropertyValue('max-width') === '158px',
      clips: !!ws && (ws.getPropertyValue('overflow') === 'hidden' || ws.getPropertyValue('overflow-x') === 'hidden'),
      noErr: errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0,
    };
    ok(Object.values(r).every(Boolean),
      '★ 7b (#1216 W1, Damir\'s pick) on the BUILT chat shell: a voice bubble draws the 40 peaks as 40 bars, 2px wide (basis + width 2px — S8 #1240 re-base of the 7b 3px; no grow), round, at most 2px apart (a 158px box, space-between over a 1px gap) and — ★ S8 picks #46 r1 re-base — a narrow box gives up its gaps first, then at most half a pixel per bar (min-width 1.5px), so all 40 draw at 320 / 360; below that the wave box clips (overflow hidden) at the END — '
      + JSON.stringify(r) + (cs ? ' flex=' + cs.getPropertyValue('flex-grow') + '/' + cs.getPropertyValue('flex-shrink') + '/' + cs.getPropertyValue('flex-basis') + ' w=' + cs.getPropertyValue('width') : '') + ' ' + errs.slice(0, 2).join(' | '));
    dom.window.close();
  } catch (e) { ok(false, '#1216 wave THREW: ' + (e && e.stack || e)); }
}
