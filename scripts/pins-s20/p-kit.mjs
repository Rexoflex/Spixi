/* ==== S20 P — the shared STUB LAYOUT for the p-* pins (not a pin module; imported by p-tray / p-strip / p-send).
 * jsdom has no layout and no WAAPI, so the BUILT chat.html (the 7b boot kit) gets:
 *   · heights: the bar 60 px (−14 while [data-tray-open]: the inset the tray takes), +40 for a reply / edit strip in the
 *     pill (not display:none), +24 per extra textarea line (≤ 5); a tray 300 px while [data-open]; the slot = its children
 *   · the log: 40 px a row, an 800 px box, scrollHeight = rows + the reserve (--composer-h + 4) [+ --rise-h while the box
 *     carries data-rise and a row data-rise-row — the transform's borrowed space]; scrollTop clamps like a browser; every
 *     write is LOGGED with the frame it happened in
 *   · a ResizeObserver that fires like a browser's: once per frame AFTER the rAF callbacks, only on a height change
 *   · Element.prototype.animate = a recorder (finish / cancel / pause driven by the pin; getComputedTiming().progress)
 *   · --composer-h writes on the canvas LOGGED with their frame. A "frame" = one requestAnimationFrame tick. ==== */
import { s1Kit } from '../pins-s7b/s1-boot.mjs';

export function pKit(h) {
  const k = s1Kit(h);
  const stub = (s, { rows: nRows = 0 } = {}) => {
    const { W, d } = s;
    const box = d.getElementById('messages');
    const slot = d.getElementById('chat-composer');
    const canvas = slot.closest('.c-chat-canvas');
    const log = { frame: 0, st: [], ch: [], anims: [] };
    (function tick() { log.frame++; W.requestAnimationFrame(tick); })();
    const isNone = (el) => el.style && el.style.display === 'none';
    const barH = (el) => {
      let v = el.hasAttribute('data-tray-open') ? 46 : 60;
      const strip = el.querySelector('.c-composer__ctx');
      if (strip && !isNone(strip)) v += 40;
      const inp = el.querySelector('.c-composer__input');
      if (inp) v += 24 * (Math.min(5, String(inp.value).split('\n').length) - 1);
      return v;
    };
    const hOf = (el) => {
      if (el === slot) { let v = 0; for (const c of slot.children) v += hOf(c); return v; }
      if (el.classList && el.classList.contains('c-composer')) return barH(el);
      if (el.classList && el.classList.contains('c-attach-tray')) return el.hasAttribute('data-open') && !isNone(el) ? 300 : 0;
      if (el.classList && el.classList.contains('c-composer__ctx')) return isNone(el) ? 0 : 40;
      if (el.parentNode === box) return 40;
      return 0;
    };
    Object.defineProperty(W.HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return hOf(this); } });
    const extra = nRows;   // history rows above the rendered ones (a long log)
    const content = () => (box.children.length + extra) * 40;
    const reserve = () => (parseFloat(canvas.style.getPropertyValue('--composer-h')) || 0) + 4;
    const borrowed = () => (box.hasAttribute('data-rise') && box.querySelector(':scope > [data-rise-row]') ? (parseFloat(box.style.getPropertyValue('--rise-h')) || 0) : 0);
    let st = 0;
    Object.defineProperty(box, 'scrollHeight', { configurable: true, get: () => content() + reserve() + borrowed() });
    Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => 800 });
    Object.defineProperty(box, 'scrollTop', { configurable: true, get: () => st, set: (v) => { st = Math.max(0, Math.min(Number(v) || 0, box.scrollHeight - box.clientHeight)); log.st.push({ f: log.frame, v: Number(v), st }); } });
    const base = W.Element.prototype.getBoundingClientRect;
    W.Element.prototype.getBoundingClientRect = function () {
      if (this === box) return { top: 0, bottom: 800, left: 0, right: 400, width: 400, height: 800 };
      if (this.parentNode === box) {
        let y = extra * 40; for (const n of box.children) { if (n === this) break; y += 40; }
        const top = y - st; return { top, bottom: top + 40, left: 0, right: 400, width: 400, height: 40 };
      }
      if (this === slot) { const hh = hOf(slot); return { top: 800 - hh, bottom: 800, left: 0, right: 400, width: 400, height: hh }; }
      return base.call(this);
    };
    const sp = canvas.style.setProperty.bind(canvas.style);
    canvas.style.setProperty = (name, v, p) => { if (name === '--composer-h') log.ch.push({ f: log.frame, v }); return sp(name, v, p); };
    W.Element.prototype.animate = function (frames, opts) {
      const a = { el: this, frames, opts, playState: 'running', cancelled: false, onfinish: null, currentTime: 0, p: 0,
        effect: { getComputedTiming: () => ({ progress: a.p }) },
        cancel() { this.cancelled = true; this.playState = 'idle'; },
        pause() { this.playState = 'paused'; },
        finish() { this.playState = 'finished'; this.p = 1; if (this.onfinish) this.onfinish(); } };
      log.anims.push(a);
      return a;
    };
    /* the browser's observer: once per frame, only on a change */
    let lastH = hOf(slot);
    (function ro() {   // after the frame's rAF callbacks (a browser runs the observers after them, before paint)
      W.requestAnimationFrame(() => { const hh = hOf(slot); W.setTimeout(() => {   // the height as this FRAME saw it
        if (hh !== lastH) { lastH = hh; for (const cb of s.ro) { try { cb([]); } catch (e) {} } }
        ro();
      }, 0); });
    })();
    for (const cb of s.ro) { try { cb([]); } catch (e) {} }   // boot: the stub heights land
    d.dispatchEvent(new W.Event('wheel', { bubbles: true }));   // a user input ends the boot re-pin window
    box.scrollTop = 1e9;
    return { box, slot, canvas, log, hOf, maxTop: () => box.scrollHeight - box.clientHeight, reserve };
  };
  /* wait n frames */
  const frames = (W, n) => new Promise((res) => { let i = 0; (function f() { if (++i > n) res(); else W.requestAnimationFrame(f); })(); });
  const onEl = (log, pred) => log.anims.filter((a) => pred(a.el));
  return { ...k, stub, frames, onEl };
}
