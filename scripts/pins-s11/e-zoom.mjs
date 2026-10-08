/* ==== S11 E — ★ #1262 (Damir 23:48): PINCH TO ZOOM in the photo viewer, on the BUILT chat shell ====
 * jsdom has no layout and no PointerEvent: the pointer stream is synthetic (MouseEvent + pointerId / isPrimary), and the
 * picture / stage boxes are stubbed (getBoundingClientRect: the stage 1000 × 800 at 0,0; the picture 800 × 500 at
 * 100,150, moved by its OWN inline transform — the box a real engine reports). Asserted: the transform the viewer
 * writes (translate3d + scale) and its state, never source text.
 *   · a two-finger pinch scales around the midpoint (200 → 400 px apart = 2×) and a zoomed picture turns OFF the page
 *     swipe (a fast flick keeps the page) and the swipe-to-dismiss (a 200 px vertical drag keeps the viewer);
 *   · a double tap on the picture toggles 1× ↔ 2.5× AT the tap point (translate = −1.5 × (tap − centre), clamped);
 *   · a page change (› and ←) resets to 1×; ctrl + wheel zooms (prevented), a plain wheel at 1× is not the viewer's.
 * Deliberate breaks (E-brk): see the S11 E report. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const K = b1Kit(h);
  const { ok } = h;
  const { sleep } = K;
  let s = null;
  const r = {};
  try {
    s = await K.open({ caps: 'reply,media' });
    const { d, W } = s;
    const frames = (n = 3) => new Promise((res) => { let k = 0; const t = () => (++k >= n ? res() : W.requestAnimationFrame(t)); W.requestAnimationFrame(t); });
    const pe = (node, type, x, y, id = 1, primary = true) => {
      const e = new W.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
      Object.defineProperty(e, 'pointerId', { value: id });
      Object.defineProperty(e, 'isPrimary', { value: primary });
      node.dispatchEvent(e);
    };
    const rect = (l, t, w, hh) => ({ left: l, top: t, right: l + w, bottom: t + hh, width: w, height: hh, x: l, y: t });
    const zoomOf = (img) => {
      const m = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px, 0\) scale\(([\d.]+)\)/.exec(img.style.transform || '');
      return m ? { x: +m[1], y: +m[2], s: +m[3] } : { x: 0, y: 0, s: 1 };
    };
    const shape = (v) => {
      const stage = v.querySelector('.c-mviewer__stage');
      const img = v.querySelector('.c-mviewer__img');
      stage.getBoundingClientRect = () => rect(0, 0, 1000, 800);
      img.getBoundingClientRect = () => { const z = zoomOf(img); return rect(500 + z.x - 400 * z.s, 400 + z.y - 250 * z.s, 800 * z.s, 500 * z.s); };
      return { stage, img };
    };
    const items = [1, 2, 3].map((n) => ({ src: K.JPG, token: 'z' + n, alt: 'p' + n + '.jpg' }));
    const pages = [];
    const v = W.Spixi.openMediaViewer({ host: d.body, items, index: 1, kind: 'image', strings: {}, onPage: (i) => pages.push(i) });
    const { stage, img } = shape(v);
    const count = () => v.querySelector('.c-mviewer__count').textContent;
    await sleep(400);   // past the open fade (a tap could close)

    /* 1. PINCH: fingers at 400 / 600 (200 apart, midpoint 500,300), the second moves to 800 → 400 apart = 2× */
    pe(img, 'pointerdown', 400, 300, 1, true);
    pe(img, 'pointerdown', 600, 300, 2, false);
    pe(stage, 'pointermove', 700, 300, 2, false);
    pe(stage, 'pointermove', 800, 300, 2, false);
    await frames();
    const zp = zoomOf(img);
    r.pinchScale = Math.abs(zp.s - 2) < 0.01 && stage.dataset.zoomed !== undefined;
    /* the picture point under the START midpoint (500,300) sits under the NEW midpoint (600,300): x = 600−500 − 2·(500−500) = 100; y = (300−400) − 2·(300−400) = 100 */
    r.pinchAroundMidpoint = Math.abs(zp.x - 100) < 0.2 && Math.abs(zp.y - 100) < 0.2;
    pe(stage, 'pointerup', 800, 300, 2, false);
    pe(stage, 'pointerup', 400, 300, 1, true);
    await frames();
    r.staysZoomed = Math.abs(zoomOf(img).s - 2) < 0.01;
    /* zoomed: a fast sideways flick PANS (no page), a long vertical drag pans (no dismiss) */
    pe(img, 'pointerdown', 700, 400, 3, true);
    pe(stage, 'pointermove', 600, 400, 3, true);
    pe(stage, 'pointermove', 300, 400, 3, true);
    pe(stage, 'pointerup', 300, 400, 3, true);
    await frames();
    r.noPageWhenZoomed = count() === '2 / 3' && pages.length === 0;
    pe(img, 'pointerdown', 500, 200, 4, true);
    pe(stage, 'pointermove', 500, 300, 4, true);
    pe(stage, 'pointermove', 500, 400, 4, true);
    pe(stage, 'pointerup', 500, 400, 4, true);
    await sleep(30);
    r.noDismissWhenZoomed = W.Spixi.isOverlayOpen(v) && v.style.opacity === '';
    /* the pan stays inside the picture's bounds at 2× (|x| ≤ 800·2/2 − 500 = 300, |y| ≤ 500 − 400 = 100) */
    const zz = zoomOf(img);
    r.panClamped = Math.abs(zz.s - 2) < 0.01 && Math.abs(zz.x) <= 300.1 && Math.abs(zz.y) <= 100.1;

    /* 2. a page change resets the zoom (›), and so does ← from a zoomed picture */
    v.querySelector('.c-mviewer__next').click();
    r.pageResets = count() === '3 / 3' && img.style.transform === '' && stage.dataset.zoomed === undefined && pages.join() === '2';

    /* 3. DOUBLE TAP on the picture: 1× → 2.5× at the (second) tap point (302,301): x = −1.5·(302−500) = 297, y = −1.5·(301−400) = 148.5 */
    await sleep(600);
    pe(img, 'pointerdown', 300, 300, 5, true); pe(stage, 'pointerup', 300, 300, 5, true);
    pe(img, 'pointerdown', 302, 301, 6, true); pe(stage, 'pointerup', 302, 301, 6, true);
    const zd = zoomOf(img);
    r.doubleTapIn = Math.abs(zd.s - 2.5) < 0.01 && Math.abs(zd.x - 297) < 0.2 && Math.abs(zd.y - 148.5) < 0.2 && W.Spixi.isOverlayOpen(v);
    await sleep(400);
    pe(img, 'pointerdown', 500, 400, 7, true); pe(stage, 'pointerup', 500, 400, 7, true);
    pe(img, 'pointerdown', 500, 400, 8, true); pe(stage, 'pointerup', 500, 400, 8, true);
    r.doubleTapOut = img.style.transform === '' && stage.dataset.zoomed === undefined;
    /* two taps far apart in time are two single taps: no zoom */
    await sleep(400);
    pe(img, 'pointerdown', 500, 400, 9, true); pe(stage, 'pointerup', 500, 400, 9, true);
    await sleep(420);
    pe(img, 'pointerdown', 500, 400, 10, true); pe(stage, 'pointerup', 500, 400, 10, true);
    r.slowTapsNoZoom = img.style.transform === '';

    /* 4. ctrl + wheel zooms around the pointer (prevented); ← then resets; a plain wheel at 1× is left alone */
    const wheel = (o) => { const e = new W.WheelEvent('wheel', Object.assign({ bubbles: true, cancelable: true, clientX: 500, clientY: 400 }, o)); stage.dispatchEvent(e); return e.defaultPrevented; };
    const plainPrevented = wheel({ deltaY: 100 });
    const ctrlPrevented = wheel({ deltaY: -100, ctrlKey: true });
    await frames();
    r.wheel = !plainPrevented && ctrlPrevented && Math.abs(zoomOf(img).s - Math.E) < 0.01;
    v.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    r.keyResets = count() === '2 / 3' && img.style.transform === '' && stage.dataset.zoomed === undefined;
    r.oneImg = v.querySelectorAll('.c-mviewer__img').length === 1;
    W.Spixi.dismissOverlay(v);
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  ok(Object.values(r).every((x) => x === true),
    '★ S11 E (#1262) PINCH TO ZOOM on the built chat shell: two fingers 200 → 400 px apart = 2× around their midpoint; a zoomed picture pans (inside its bounds) and turns OFF the page swipe and the swipe-to-dismiss; a page change (› or ←) resets to 1×; a double tap on the picture toggles 1× ↔ 2.5× at the tap point (two slow taps do nothing); ctrl + wheel zooms (prevented), a plain wheel at 1× is not taken; one .c-mviewer__img per viewer — ' + JSON.stringify(r));
}
