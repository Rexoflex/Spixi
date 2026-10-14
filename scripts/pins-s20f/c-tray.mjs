/* ==== S20F W-9 (#1409): THE ATTACH TRAY IS THE COMPOSER SLOT'S LAYER ====
 * The bug (reproduced on the built chat in Chromium, scripts/pins-s20f/paint-tray.mjs): the tray was z-auto and in no
 * stacking context of its own, so the log's positioned internals (photo cells, stamps, the +N label: z 1–3) painted over
 * its tiles when a reader above the end scrolled a photo group behind it. The fix is the TRAY's layer —
 * `position: relative; z-index: var(--z-10)` — never `isolation` on #messages (message-menu.css: the long-press lift z-42
 * must clear the scrim z-40 from inside the log).
 * On the BUILT chat.html (jsdom; the tray opened by the ⊕):
 *   (1) the tray computes position: relative and a z-index (resolved through the tokens) ≥ EVERY z-index the cascade sets
 *       on an element inside the populated log (text rows, a 6-photo group, photo / file / payment /
 *       app cards; every style rule with a z-index in the built document, :hover / :active / ::before stripped, matched
 *       against the log's elements — the long-press lift [data-menu-lift] excepted: it MUST clear the scrim), and it comes
 *       AFTER #messages in tree order (an equal z paints the later box on top);
 *   (2) it stays BELOW the scrim (--z-40) and the bottom sheet (--z-44), BELOW the composer bar (whose @ popover and format
 *       bar, z-30, live inside the bar's z-20 context), and the scroll-latest chevron / @ FAB (same z) come after it in tree
 *       order, so they still paint above it;
 *   (3) #messages and .c-chat-canvas still create no stacking context (z-index auto, no isolation / transform / filter /
 *       opacity < 1 — the message-menu.css precondition).
 * Deliberate breaks (S20F report): the z-index line removed from attach-sheet.css → LAYER fails (tray z auto) · z-index 2
 * → LAYER fails (2 < the photo group's 3) · `isolation: isolate` on #messages (the forbidden fix) → NOCONTEXT fails. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
import { cascade } from '../pins-s19/r-cascade.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = b1Kit(h);
  const { T0, JPG } = K;
  const r = {};
  const got = {};
  let s = null;
  try {
    s = await K.open({ hist: (x) => {
      for (let i = 0; i < 6; i++) x.push('addFile', 'g' + i, 'addrPeer', 'Ana', '', 'xg' + i, 'lake' + i + '.jpg', String(T0 + 100 + i), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '0123456789abcdef|' + i + '|6|', '', '');
      x.push('addFile', 'ft', 'addrPeer', 'Ana', '', 'fft', 'beach.jpg', String(T0 + 200), 'False', 'True', 'False', '40', 'False', 'False', 'True', '', '', '', '', '', '2516582');
      x.push('addFile', 'fo', 'addrPeer', 'Ana', '', 'ffo', 'Itinerary.pdf', String(T0 + 210), 'False', 'True', 'False', '0', 'False', 'False', 'True', '', '', '', '', '', '');
      x.push('addFile', 'fs', 'addrMe', 'Me', '', 'ffs', 'Notes.zip', String(T0 + 220), 'True', 'False', 'False', '0', 'False', 'False', 'True', '', '1', '', '', '', '1000');
      x.push('addPaymentRequest', 'pr', 'tx1', 'addrPeer', '', '', 'Payment request', '7', 'Pending', 'wallet', String(T0 + 230), 'False', 'True', 'True', 'True', 'request', 'actionable', '', 'False');
    } });
    const { W, d } = s;
    await sleep(150);
    for (let i = 0; i < 6; i++) s.push('setFileThumb', 'g' + i, JPG);
    await sleep(100);
    const box = d.getElementById('messages');
    box.append(W.Spixi.createPaymentBubble({ timestamp: Date.now(), strings: {}, role: 'request-in', flow: 'out', amount: '1', status: 'actionable', onPay() {}, onDecline() {} }));
    const canvas = box.closest('.c-chat-canvas');
    const attach = d.querySelector('.c-composer__attach');
    if (attach) attach.click();
    await sleep(100);
    const tray = d.querySelector('.c-attach-tray');
    const C = cascade(W);
    const rootCs = W.getComputedStyle(d.documentElement);
    const zOf = (v, k = 0) => { v = String(v || '').trim(); const m = /^var\((--[\w-]+)(?:,\s*([^)]*))?\)$/.exec(v); if (m && k < 8) return zOf(rootCs.getPropertyValue(m[1]).trim() || m[2], k + 1); return v === '' || v === 'auto' ? null : Number(v); };
    /* (1) every z-index the cascade can set inside the log */
    const logEls = [...box.querySelectorAll('*')];
    const zs = [];
    for (const { r: ru } of C.rules) {
      const z = ru.style.getPropertyValue('z-index');
      if (!z) continue;
      for (const part of ru.selectorText.split(',')) {
        if (/data-menu-lift/.test(part)) continue;   // the lift: above the scrim on purpose
        const t = part.replace(/::?(before|after|hover|active|focus-visible|focus|focus-within)\b/g, '').trim() || '*';
        let hit = null; try { hit = logEls.find((el) => el.matches(t)); } catch (e) { hit = null; }
        if (hit) zs.push({ sel: part.trim(), z: zOf(z) });
      }
    }
    got.logZ = zs.map((x) => x.sel + '=' + x.z);
    const maxLog = Math.max(...zs.map((x) => x.z).filter((x) => x != null));
    const tcs = tray && W.getComputedStyle(tray);
    got.tray = tray ? { position: tcs.position, z: C.win(tray, 'z-index'), zv: zOf(C.win(tray, 'z-index')) } : null;
    const after = (a, b) => !!(a && b) && !!(b.compareDocumentPosition(a) & W.Node.DOCUMENT_POSITION_FOLLOWING);
    got.maxLog = maxLog; got.nLogZ = zs.length;
    r.layer = !!tray && tcs.position === 'relative' && got.tray.zv != null && zs.length >= 5 && maxLog >= 3 && got.tray.zv >= maxLog && after(tray, box);
    /* (2) below the scrim / sheet / bar; the chevron + @ FAB after it */
    const comp = d.querySelector('#chat-composer .c-composer');
    const chev = canvas.querySelector('.c-scroll-latest');
    const fab = canvas.querySelector('.chat-mention-fab');
    got.above = { scrim: zOf('var(--z-40)'), sheet: zOf('var(--z-44)'), bar: comp && zOf(C.win(comp, 'z-index')), chev: chev && zOf(C.win(chev, 'z-index')), fab: fab && zOf(C.win(fab, 'z-index')) };
    const A = got.above;
    r.below = !!tray && got.tray.zv < A.scrim && got.tray.zv < A.sheet && A.bar > got.tray.zv
      && A.chev >= got.tray.zv && A.fab >= got.tray.zv && after(chev, tray) && after(fab, tray);
    /* (3) the log and the canvas: no stacking context */
    const ctxProps = (el) => ['z-index', 'isolation', 'transform', 'filter', 'opacity', 'will-change', 'contain', 'mix-blend-mode', 'backdrop-filter', 'clip-path', 'mask-image'].map((p) => [p, C.win(el, p)]).filter(([p, v]) => v && !(p === 'z-index' && v === 'auto') && !(p === 'opacity' && Number(v) >= 1) && !/^(none|auto|normal|visible)$/.test(v));
    got.ctx = { messages: ctxProps(box), canvas: ctxProps(canvas) };
    r.noContext = got.ctx.messages.length === 0 && got.ctx.canvas.length === 0;
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) s.W.close(); }
  ok(Object.values(r).every((v) => v === true),
    '★ S20F W-9 (#1409): the attach tray is the composer slot\'s layer on the built chat — position relative, z ' + (got.tray && got.tray.zv) + ' ≥ every z the log\'s components set (max ' + got.maxLog + ' over ' + got.nLogZ + ' rules) and after #messages in tree order; below the scrim / sheet / the composer bar, the chevron + @ FAB after it; #messages and .c-chat-canvas still no stacking context — '
    + JSON.stringify({ r, got }));
}
