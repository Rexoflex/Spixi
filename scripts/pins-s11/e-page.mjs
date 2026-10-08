/* ==== S11 E — ★ #1262 (Damir 23:48): the photo group's PAGE TRACK in the viewer, on the BUILT chat shell ====
 * jsdom: synthetic pointers (MouseEvent + pointerId / isPrimary), the stage box stubbed at 1000 px wide. Asserted on
 * the state and the inline transforms the viewer writes:
 *   · the track follows the finger 1:1 (−80 px drag = translate3d(−80px)) and the picture itself does not move;
 *   · a FAST short flick (80 px, well under 35 %) turns the page (counter, onPage) and the track settles (data-settle);
 *   · a SLOW 20 % drag (the finger then still) snaps back: same page, no onPage, the track settles to rest;
 *   · past the first photo the track resists (+100 px → +30 px) and never pages;
 *   · reduced motion: the page turns with NO settle (instant);
 *   · a neighbour slide shows only a picture this viewer already holds (★ S11 G re-base R2-m6: its known thumbnail too); going back to a
 *     page whose viewer-size picture it holds shows it at once (no spinner, no pending) and onPage still runs;
 *   · a vertical drag at 1× still closes (the #1180 swipe-to-dismiss), the ‹ › buttons still page.
 * Deliberate breaks (E-brk): see the S11 E report. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const K = b1Kit(h);
  const { ok } = h;
  const { sleep } = K;
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  let s = null;
  const r = {};
  try {
    s = await K.open({ caps: 'reply,media' });
    const { d, W } = s;
    const frames = (n = 3) => new Promise((res) => { let k = 0; const t = () => (++k >= n ? res() : W.requestAnimationFrame(t)); W.requestAnimationFrame(t); });
    const pe = (node, type, x, y, id = 1) => {
      const e = new W.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
      Object.defineProperty(e, 'pointerId', { value: id });
      Object.defineProperty(e, 'isPrimary', { value: true });
      node.dispatchEvent(e);
    };
    const items = [1, 2, 3].map((n) => ({ src: K.JPG, token: 'g' + n, alt: 'p' + n + '.jpg' }));
    const open = (index, pages) => {
      const v = W.Spixi.openMediaViewer({ host: d.body, items, index, kind: 'image', strings: {}, onPage: (i) => pages.push(i) });
      const stage = v.querySelector('.c-mviewer__stage');
      stage.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800, x: 0, y: 0 });
      return { v, stage, img: v.querySelector('.c-mviewer__img'), track: v.querySelector('.c-mviewer__track'), count: () => v.querySelector('.c-mviewer__count').textContent };
    };

    /* 1. 1:1 follow + a FAST short flick turns the page */
    let pages = [];
    let o = open(1, pages);
    r.track = !!o.track && o.track.querySelectorAll('.c-mviewer__slide').length === 3 && o.v.querySelectorAll('.c-mviewer__img').length === 1;
    pe(o.img, 'pointerdown', 600, 400);
    pe(o.stage, 'pointermove', 560, 402);
    pe(o.stage, 'pointermove', 520, 403);
    await frames();
    r.follow1to1 = o.track.style.transform === 'translate3d(-80.0px, 0, 0)' && o.img.style.transform === '';
    pe(o.stage, 'pointerup', 520, 403);
    r.flickPages = o.count() === '3 / 3' && pages.join() === '2' && o.track.dataset.settle !== undefined && o.track.style.transform === '';
    W.Spixi.dismissOverlay(o.v);

    /* 2. a SLOW 20 % drag (then the finger rests) snaps back */
    pages = [];
    o = open(1, pages);
    pe(o.img, 'pointerdown', 600, 400);
    for (const x of [560, 520, 480, 440, 400]) { pe(o.stage, 'pointermove', x, 400); await sleep(40); }
    await sleep(150);
    await frames();
    r.slowFollows = o.track.style.transform === 'translate3d(-200.0px, 0, 0)';
    pe(o.stage, 'pointerup', 400, 400);
    r.slowSnapsBack = o.count() === '2 / 3' && pages.length === 0 && o.track.dataset.settle !== undefined && o.track.style.transform === '';
    /* a drag past 35 % (400 px of 1000) turns the page even when slow */
    pe(o.img, 'pointerdown', 700, 400);
    for (const x of [600, 500, 400, 300]) { pe(o.stage, 'pointermove', x, 400); await sleep(40); }
    await sleep(150);
    pe(o.stage, 'pointerup', 300, 400);
    r.farDragPages = o.count() === '3 / 3' && pages.join() === '2';
    W.Spixi.dismissOverlay(o.v);

    /* 3. resistance past the FIRST photo (+100 → +30) and no page, even on a flick */
    pages = [];
    o = open(0, pages);
    pe(o.img, 'pointerdown', 400, 400);
    pe(o.stage, 'pointermove', 450, 400);
    pe(o.stage, 'pointermove', 500, 400);
    await frames();
    r.edgeResists = o.track.style.transform === 'translate3d(30.0px, 0, 0)';
    pe(o.stage, 'pointerup', 500, 400);
    r.edgeNoPage = o.count() === '1 / 3' && pages.length === 0;

    /* 4. neighbours: only a picture the viewer holds. Page 1's viewer-size picture arrives, › → the prev slide shows it;
          ‹ back → it is on screen at once (no spinner / pending), onPage still asked */
    const peers = () => [...o.v.querySelectorAll('.c-mviewer__peer')];
    /* ★ S11 G re-base (R2-m6): the neighbour shows its KNOWN thumbnail on a first pass (was: empty until #1180 showed it — the
       slide under the finger was blank); past the first photo there is none (pins-s11/g-viewer.mjs) */
    r.peersThumb = peers().some((p) => !p.hidden && p.getAttribute('src') === K.JPG) && peers().some((p) => p.hidden && !p.hasAttribute('src'));
    o.v.setSrc(JPEG);
    o.v.querySelector('.c-mviewer__next').click();
    r.prevPeerHolds = o.count() === '2 / 3' && peers().some((p) => !p.hidden && p.getAttribute('src') === JPEG) && o.img.dataset.pending !== undefined;
    o.v.querySelector('.c-mviewer__prev').click();
    r.backShowsAtOnce = o.count() === '1 / 3' && o.img.getAttribute('src') === JPEG && o.img.dataset.pending === undefined
      && o.v.getAttribute('aria-busy') === null && pages.join() === '1,0' && W.Spixi.findOpenViewer('g1') === o.v;
    /* 5. a vertical drag at 1× still closes (#1180), the paged viewer included */
    await sleep(400);
    pe(o.img, 'pointerdown', 500, 300);
    pe(o.stage, 'pointermove', 505, 360);
    pe(o.stage, 'pointermove', 505, 420);
    await frames();
    pe(o.stage, 'pointerup', 505, 420);
    r.verticalCloses = !W.Spixi.isOverlayOpen(o.v) && o.v.style.opacity === '';

    /* 6. reduced motion: the flick turns the page with NO settle (instant) */
    const mm = W.matchMedia;
    W.matchMedia = (q) => ({ matches: /prefers-reduced-motion: reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    pages = [];
    o = open(1, pages);
    pe(o.img, 'pointerdown', 600, 400);
    pe(o.stage, 'pointermove', 540, 400);
    pe(o.stage, 'pointerup', 520, 400);
    r.reducedInstant = o.count() === '3 / 3' && o.track.dataset.settle === undefined && o.track.style.transform === '';
    W.matchMedia = mm;
    W.Spixi.dismissOverlay(o.v);
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  ok(Object.values(r).every((x) => x === true),
    '★ S11 E (#1262) PAGE TRACK on the built chat shell: prev / current / next slides with ONE .c-mviewer__img; the track follows the finger 1:1; a fast short flick turns the page (counter + onPage) and settles; a slow 20 % drag snaps back, a drag past 35 % pages; past the first photo the track resists (×0.3) and never pages; a neighbour shows only a picture the viewer holds (its thumbnail included, ★ S11 G re-base) and a held page returns at once (no spinner, onPage still runs); a vertical drag at 1× still closes; reduced motion = an instant switch — ' + JSON.stringify(r));
}
