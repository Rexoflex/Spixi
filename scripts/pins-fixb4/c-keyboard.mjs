/* ==== fixb4 item 2 (#1748 (3)) — on the Android keyboard model the focused launch field is brought into `.c-launch__body` by writing ONLY its scrollTop ====
 * What this pins (BEHAVIOUR, on the BUILT intro.html in jsdom — launch.html's `launchKeyboardInset`, `revealResized`): with an Android UA, a focused
 * `.c-launch` input whose field box (`.c-launch__field`) is NOT inside the body's rect makes the body's scrollTop move by exactly the amount that brings the
 * box inside (the box GROWN by the 4 px focus ring; below the body: by the overshoot; above it: back by the gap; a box taller than the body: its top to the body's top); a box already inside (ring included) → no
 * write; a checkbox / radio input is never revealed; a touchmove / wheel changes nothing (the reveal still runs on the next window resize without a new focusin; there is no hand-scroll stop, reader L NIT-3 accepted); no focused launch input → no write; it runs on focusin and on a window resize (the adjustResize event itself); it never
 * calls scrollIntoView, window.scrollTo or window.scrollBy (only the body's scrollTop is written); with an iPhone UA (the visualViewport / inset model, the
 * old path) NOTHING is written on the same events; so with a Windows WebView2 UA and a Mac Catalyst UA (DESKTOP UAs ARE COVERED by these rows, both as shipped — the
 * data-desktop return — and with the head data-desktop sniff removed, where the Android UA gate is the only guard).
 * LIMITS (#1735): jsdom has NO layout. The rects are STUBS (getBoundingClientRect of the body and the field as a function of the written scrollTop, and a
 * scrollTop property with a write counter), so this proves the arithmetic and the gating, NOT that a real field really ends up visible above a real
 * keyboard: the geometry proof is the Chromium script `scripts/pins-fixb4/c-keyboard-render.mjs` (by hand; 412 × 915 and 360 × 640, S1 / S2, base vs new).
 * The visualViewport events (jsdom has no visualViewport), the timer re-checks (80 … 1400 ms) and the real IME resize are not exercised here.
 * Deliberate breaks (fixb4 report): ① remove `revealResized();` from apply() → the Android rows fail (no write); ② drop the `if (!resizeModel) return;`
 * guard → the iPhone row fails (a write); ③ RING = 0 → ringMargin fails; ④ the checkbox exclusion removed from the selector → checkboxRadioNoWrite fails; ⑤ a `return` at the top of revealResized after a touchmove → revealAfterTouchmove fails; ⑥ the gate widened to `/Android|Windows/i` or `/Android|Macintosh/i` → the Windows / Mac `data-desktop sniff removed` row fails. */
import { on1Kit, PHONE_UA } from '../pins-on1/kit.mjs';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
export default async function (h) {
  const { ok } = h;
  const { boot } = on1Kit(h);

  /* stub the geometry on a booted retry view: the body spans top..bottom (mutable), the field box has height 58 and sits fieldTop0 px below the body's
     content origin, so its rect moves with the written scrollTop. Returns the knobs. */
  const stub = (s) => {
    const { d, W } = s;
    const v = d.querySelector('[data-launch-view="retry"]');
    const body = v.querySelector('.c-launch__body');
    const field = v.querySelector('.c-launch__field');
    const pw = v.querySelector('.c-lock__input');
    const k = { top: 100, bottom: 408, fieldTop0: 450, h: 58, st: 0, writes: 0, scrollIntoView: 0, winScroll: 0 };
    Object.defineProperty(body, 'scrollTop', { configurable: true, get: () => k.st, set: (x) => { k.writes++; k.st = x; } });
    body.getBoundingClientRect = () => ({ top: k.top, bottom: k.bottom, left: 0, right: 390, width: 390, height: k.bottom - k.top });
    field.getBoundingClientRect = () => { const t = k.fieldTop0 - k.st; return { top: t, bottom: t + k.h, left: 24, right: 366, width: 342, height: k.h }; };
    W.Element.prototype.scrollIntoView = function () { k.scrollIntoView++; };
    W.scrollTo = () => { k.winScroll++; }; W.scrollBy = () => { k.winScroll++; };
    return { d, W, body, field, pw, k };
  };
  const fire = (W, d, name) => { if (name === 'focusin') d.activeElement.dispatchEvent(new W.FocusEvent('focusin', { bubbles: true })); else W.dispatchEvent(new W.Event(name)); };

  let s = null;
  try {
    /* ---- Android UA ---- */
    s = await boot({ ua: PHONE_UA, query: 'view=retry' });
    {
      const { d, W, pw, k } = stub(s);
      const r = {};
      fire(W, d, 'resize');                                  // nothing focused → nothing
      r.noFocusNoWrite = k.writes === 0;
      pw.focus();
      r.focused = d.activeElement === pw;
      /* the box is grown by the 4 px focus ring: field 450–508 → 446–512 in body 100–408 → up by 104 (512 − 408) */
      r.focusinBelow = k.st === 104 && k.writes >= 1;
      const w1 = k.writes;
      fire(W, d, 'focusin'); fire(W, d, 'resize');
      r.insideNoMoreWrite = k.writes === w1 && k.st === 104; // the box + ring is inside now: a second trigger writes nothing
      k.bottom = 300;                                        // the keyboard rises: the body shrinks to 100–300 (resize model); box+ring now 342–408 → overshoot 108
      fire(W, d, 'resize');
      r.windowResize = k.st === 212;
      /* round 2 (reader, MINOR-1): there is NO hand-scroll stop. The field stays focused, the user drags the body, the IME hides and is opened again by a tap on the
         same field: no focusin, only the window resize adjustResize fires — the reveal must still run (touchmove / wheel since the last focusin change nothing). */
      k.bottom = 250; const wh = k.writes;
      d.body.dispatchEvent(new W.Event('touchmove', { bubbles: true }));
      fire(W, d, 'resize');                                  // box+ring bottom 300 vs body 250 → +50, no new focusin
      r.revealAfterTouchmove = k.writes === wh + 1 && k.st === 262;
      k.bottom = 200; const ww = k.writes;
      d.body.dispatchEvent(new W.Event('wheel', { bubbles: true }));
      fire(W, d, 'resize');
      r.revealAfterWheel = k.writes === ww + 1 && k.st === 312;
      k.bottom = 408; k.st = 0; k.fieldTop0 = 20;            // above the body (box 20–78, ring 16–82 vs body top 100): back by 84
      const w2 = k.writes;
      fire(W, d, 'resize');
      r.above = k.st === -84 && k.writes === w2 + 1;
      k.st = 0; k.fieldTop0 = 150; k.h = 500;                // taller than the body (308): the box's own top (ring 146) goes to the body's top → +46, never past it
      fire(W, d, 'resize');
      r.taller = k.st === 46;
      k.st = 0; k.fieldTop0 = 120; k.h = 58;                 // inside with room for the ring (116–182): no write
      const w3 = k.writes;
      fire(W, d, 'resize');
      r.insideAlone = k.writes === w3 && k.st === 0;
      k.st = 0; k.fieldTop0 = 346;                           // box bottom 404 + ring 4 = 408 = the body edge: still no write
      fire(W, d, 'resize');
      r.ringFitsNoWrite = k.writes === w3 && k.st === 0;
      k.fieldTop0 = 350;                                     // ★ the ring margin: the plain box (350–408) is INSIDE the body, its ring is cut by 4 px → up by 4
      fire(W, d, 'resize');
      r.ringMargin = k.st === 4 && k.writes === w3 + 1;
      /* reader L NIT-4: a checkbox / radio inside .c-launch is not a field to reveal */
      const body = d.querySelector('[data-launch-view="retry"] .c-launch__body');
      k.st = 0; k.fieldTop0 = 450;
      const w5 = k.writes;
      for (const type of ['checkbox', 'radio']) {
        const cb = d.createElement('input'); cb.type = type; body.append(cb);
        cb.getBoundingClientRect = () => ({ top: 500, bottom: 520, left: 24, right: 44, width: 20, height: 20 });
        cb.focus();
        fire(W, d, 'focusin'); fire(W, d, 'resize');
      }
      r.checkboxRadioNoWrite = k.writes === w5 && k.st === 0;
      pw.focus(); pw.blur();
      k.fieldTop0 = 450; const w4 = k.writes;
      fire(W, d, 'resize');
      r.blurNoWrite = k.writes === w4;
      r.onlyScrollTop = k.scrollIntoView === 0 && k.winScroll === 0;
      ok(Object.values(r).every(Boolean),
        '★ fixb4 item 2 (#1748 (3)): Android UA — a focused launch field outside .c-launch__body is brought in by writing ONLY the body\'s scrollTop, by the exact gap (below / above / taller than the body), on focusin and on a window resize; inside, or nothing focused → no write; never scrollIntoView / scrollTo — ' + JSON.stringify({ r, st: k.st, writes: k.writes, sc: k.scrollIntoView, win: k.winScroll }));
      ok(s.errs.length === 0, '★ fixb4 c-keyboard: no page error (Android UA) — ' + JSON.stringify(s.errs.slice(0, 3)));
    }
    s.close(); s = null;

    /* ---- iPhone UA: the old path, nothing written ---- */
    s = await boot({ ua: IPHONE_UA, query: 'view=retry' });
    {
      const { d, W, pw, k } = stub(s);
      pw.focus();
      fire(W, d, 'focusin'); fire(W, d, 'resize');
      k.bottom = 250; fire(W, d, 'resize');
      ok(k.writes === 0 && k.st === 0 && k.winScroll === 0,
        '★ fixb4 item 2: iPhone UA — a focused field outside the body with focusin and a window resize writes NOTHING to the body\'s scrollTop (the iOS path is unchanged; its reveal is the inset one) — ' + JSON.stringify({ writes: k.writes, st: k.st, win: k.winScroll }));
      ok(s.errs.length === 0, '★ fixb4 c-keyboard: no page error (iPhone UA) — ' + JSON.stringify(s.errs.slice(0, 3)));
    }
    s.close(); s = null;

    /* ---- the desktop shells (Windows WebView2, Mac Catalyst): nothing written either (reader P MINOR-1) ----
       Two boots per UA. (a) as shipped: the head script sets data-desktop from the UA and launchKeyboardInset returns at its top — the
       realistic path. (b) with that head sniff neutralised in the page text, so the Android UA gate (`resizeModel`) is the ONLY guard left:
       widening `/Android/i` to `/Android|Windows/i` or `/Android|Macintosh/i` goes red on (b) (on (a) the data-desktop return covers it, which is why (b) exists). */
    const html0 = h.readFileSync(h.join(h.root, 'Spixi/Resources/Raw/html/intro.html'), 'utf8');
    const noSniff = html0.replace("document.documentElement.setAttribute('data-desktop','')", '0');
    const sniffRemoved = noSniff !== html0;
    ok(sniffRemoved, '★ fixb4 c-keyboard: the head data-desktop sniff is found in the built intro.html (the (b) boots below need it removed)');
    const UAS = [['Windows WebView2', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'],
      ['Mac Catalyst', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)']];
    for (const [label, ua] of UAS) for (const variant of ['as shipped', 'data-desktop sniff removed']) {
      s = await boot(variant === 'as shipped' ? { ua, query: 'view=retry' } : { ua, query: 'view=retry', html: noSniff });
      const { d, W, pw, k } = stub(s);
      const desk = d.documentElement.hasAttribute('data-desktop');
      pw.focus();
      fire(W, d, 'focusin'); fire(W, d, 'resize');
      k.bottom = 250; fire(W, d, 'resize');
      d.body.dispatchEvent(new W.Event('touchmove', { bubbles: true })); fire(W, d, 'resize');
      ok(k.writes === 0 && k.st === 0 && k.winScroll === 0 && (variant === 'as shipped' ? desk : !desk),
        '★ fixb4 item 2: ' + label + ' UA (' + variant + ') — a focused field outside the body with focusin and a window resize writes NOTHING to the body\'s scrollTop (data-desktop ' + desk + ') — ' + JSON.stringify({ writes: k.writes, st: k.st, win: k.winScroll }));
      ok(s.errs.length === 0, '★ fixb4 c-keyboard: no page error (' + label + ', ' + variant + ') — ' + JSON.stringify(s.errs.slice(0, 3)));
      s.close(); s = null;
    }
  } catch (e) {
    ok(false, '★ fixb4 c-keyboard threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); }
}
