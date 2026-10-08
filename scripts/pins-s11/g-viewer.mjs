/* ==== S11 G — ★ #1263 (a): the viewer TOOLBAR (Reply + Save) and the R2-m6 / R3-MINOR-3 viewer fixes, on the BUILT chat.html ====
 *   · a LONE photo (a 1:1 photo, not a group) opens a viewer WITH Reply (S10 gave Reply to a paged viewer only — walk
 *     #1260 10-GRID "there is no reply") → the composer replies to that photo; Save (cap `savePhoto`) → ixian:savePhoto:<id>;
 *     an exe without the cap → no Save button;
 *   · a group viewer's Save names the photo ON SCREEN after paging;
 *   · R2-m6: on a FIRST pass both neighbour slides show their known thumbnail (were empty under the finger);
 *   · R3-MINOR-3: a pinch past 4× rubber-bands and SETTLES to exactly 4× on release; a pinch under 1× settles to 1×;
 *     a fast flick that ends in pointercancel never turns the page (it snaps back).
 * Deliberate breaks (G-brk): see the S11 G report. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const { sleep, JPG, T0 } = K;
  let s = null;
  const r = {};
  try {
    s = await K.open({ caps: 'reply,media,savePhoto', rows: false });
    const { d, push, W } = s;
    push('addFile', 'ab01', 'addrPeer', 'Ana', '', 'x1', 'lone.jpg', String(T0 + 10), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '', '', '');
    for (let i = 0; i < 3; i++) push('addFile', 'cd0' + i, 'addrPeer', 'Ana', '', 'z' + i, 'g' + i + '.jpg', String(T0 + 20 + i), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', 'abcdefabcdefabcd|' + i + '|3|');
    push('messagesDone');
    push('onChatScreenLoaded');
    push('setFileThumb', 'ab01', JPG);
    for (let i = 0; i < 3; i++) push('setFileThumb', 'cd0' + i, JPG);
    await sleep(250);
    for (const im of d.querySelectorAll('.c-mbubble__img')) if (im.getAttribute('src')) im.dispatchEvent(new W.Event('load'));
    await sleep(80);
    K.rowOf(d, 'ab01').querySelector('.c-mbubble').click();
    await sleep(120);
    const v = d.querySelector('.c-mviewer');
    const rb = v && v.querySelector('.c-mviewer__reply');
    const save = v && [...v.querySelectorAll('.c-mviewer__bar .c-mviewer__btn')].find((b) => b.getAttribute('aria-label') === 'Save');
    r.singleBar = !!v && !v.querySelector('.c-mviewer__track') && !!rb && !rb.hidden && !!save
      && v.querySelector('.c-mviewer__bar').firstElementChild === rb && v.querySelector('.c-mviewer__bar').lastElementChild === save;
    const before = s.sent.length;
    if (save) save.click();
    await sleep(40);
    r.saveVerb = s.sent.slice(before).join() === 'ixian:savePhoto:ab01' && W.Spixi.isOverlayOpen(v);
    await sleep(400);
    if (rb) rb.click();
    await sleep(100);
    r.singleReply = (W.Spixi.getComposerContext(d.querySelector('.c-composer')) || {}).replyId === 'ab01' && !W.Spixi.isOverlayOpen(v);
    W.Spixi.cancelComposerContext(d.querySelector('.c-composer'));
    await sleep(450);
    /* the group viewer: page once, Save names THAT photo */
    K.rowOf(d, 'cd00').querySelectorAll('.c-mgrid__cell')[0].querySelector('.c-mbubble').click();
    await sleep(120);
    const vg = [...d.querySelectorAll('.c-mviewer')].pop();
    vg.querySelector('.c-mviewer__next').click();
    await sleep(40);
    const b2 = s.sent.length;
    [...vg.querySelectorAll('.c-mviewer__bar .c-mviewer__btn')].find((b) => b.getAttribute('aria-label') === 'Save').click();
    await sleep(40);
    r.groupSave = vg.querySelector('.c-mviewer__count').textContent === '2 / 3' && s.sent.slice(b2).join() === 'ixian:savePhoto:cd01';
    /* R2-m6: the first pass — both neighbours of the middle page show their thumbnail */
    W.Spixi.dismissOverlay(vg);
    await sleep(300);
    const items = [1, 2, 3].map((n) => ({ src: JPG, token: 'n' + n, alt: 'n' + n + '.jpg' }));
    const vn = W.Spixi.openMediaViewer({ host: d.body, items, index: 1, kind: 'image', strings: {} });
    const peers = [...vn.querySelectorAll('.c-mviewer__peer')];
    r.peersThumb = peers.length === 2 && peers.every((p) => !p.hidden && p.getAttribute('src') === JPG)
      && vn.querySelector('.c-mviewer__img').dataset.pending !== undefined;   // #1180 still holds for the CURRENT picture
    W.Spixi.dismissOverlay(vn);
    r.noErr = K.noErr(s.errs);
    s.W.close();
    s = null;
    /* an exe without the savePhoto cap: no Save */
    s = await K.open({ caps: 'reply,media', rows: false });
    s.push('addFile', 'ab01', 'addrPeer', 'Ana', '', 'x1', 'lone.jpg', String(T0 + 10), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '', '', '');
    s.push('messagesDone');
    s.push('onChatScreenLoaded');
    s.push('setFileThumb', 'ab01', JPG);
    await sleep(200);
    for (const im of s.d.querySelectorAll('.c-mbubble__img')) if (im.getAttribute('src')) im.dispatchEvent(new s.W.Event('load'));
    await sleep(60);
    K.rowOf(s.d, 'ab01').querySelector('.c-mbubble').click();
    await sleep(120);
    const v2 = s.d.querySelector('.c-mviewer');
    r.noCapNoSave = !!v2 && !!v2.querySelector('.c-mviewer__reply') && ![...v2.querySelectorAll('.c-mviewer__btn')].some((b) => b.getAttribute('aria-label') === 'Save');
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  if (process.env.GDBG) console.log(JSON.stringify(r));
  ok(Object.values(r).length > 6 && Object.values(r).every((x) => x === true),
    '★ S11 G (#1263 a) the viewer toolbar on the built chat shell: a LONE photo\'s viewer has Reply (leading) and Save (trailing); Save → ixian:savePhoto:<that id> (the viewer stays), Reply → the composer replies to that photo; a group viewer\'s Save names the photo on screen; an exe without the savePhoto cap shows no Save; R2-m6: both neighbour slides show their known thumbnail on the first pass (the current picture keeps #1180\'s pending) — ' + JSON.stringify(r));

  /* —— R3-MINOR-3: pinch limits settle; pointercancel never pages —— */
  const z = {};
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
    const items = [1, 2, 3].map((n) => ({ src: JPG, token: 'k' + n, alt: 'k' + n + '.jpg' }));
    const pages = [];
    const v = W.Spixi.openMediaViewer({ host: d.body, items, index: 1, kind: 'image', strings: {}, onPage: (i) => pages.push(i) });
    const stage = v.querySelector('.c-mviewer__stage');
    const img = v.querySelector('.c-mviewer__img');
    stage.getBoundingClientRect = () => rect(0, 0, 1000, 800);
    img.getBoundingClientRect = () => { const q = zoomOf(img); return rect(500 + q.x - 400 * q.s, 400 + q.y - 250 * q.s, 800 * q.s, 500 * q.s); };
    await sleep(400);
    /* OUT past 4×: 100 apart → 800 apart (8× asked) */
    pe(img, 'pointerdown', 450, 400, 1, true);
    pe(img, 'pointerdown', 550, 400, 2, false);
    pe(stage, 'pointermove', 950, 400, 2, false);
    pe(stage, 'pointermove', 50, 400, 1, true);
    await frames();
    const during = zoomOf(img).s;
    z.rubberOver = during > 4.001 && during < 8;
    pe(stage, 'pointerup', 950, 400, 2, false);
    pe(stage, 'pointerup', 50, 400, 1, true);
    await frames();
    z.settles4 = /scale\(4\.000\)$/.test(img.style.transform) && stage.dataset.zoomed !== undefined;
    /* IN under 1×: back to 1× first (double tap), then 400 apart → 100 apart */
    await sleep(400);
    pe(img, 'pointerdown', 500, 400, 3, true); pe(stage, 'pointerup', 500, 400, 3, true);
    pe(img, 'pointerdown', 500, 400, 4, true); pe(stage, 'pointerup', 500, 400, 4, true);
    z.reset = img.style.transform === '';
    await sleep(400);
    pe(img, 'pointerdown', 300, 400, 5, true);
    pe(img, 'pointerdown', 700, 400, 6, false);
    pe(stage, 'pointermove', 550, 400, 6, false);
    pe(stage, 'pointermove', 450, 400, 5, true);
    await frames();
    const under = zoomOf(img).s;
    z.rubberUnder = under < 0.999 && under > 0.25;
    pe(stage, 'pointerup', 550, 400, 6, false);
    pe(stage, 'pointerup', 450, 400, 5, true);
    await frames();
    z.settles1 = img.style.transform === '' && stage.dataset.zoomed === undefined;
    /* a fast flick that ENDS in pointercancel: no page */
    await sleep(400);
    const track = v.querySelector('.c-mviewer__track');
    pe(img, 'pointerdown', 700, 400, 7, true);
    pe(stage, 'pointermove', 600, 400, 7, true);
    pe(stage, 'pointermove', 400, 400, 7, true);
    await frames();
    const moved = track.style.transform;
    pe(stage, 'pointercancel', 380, 400, 7, true);
    z.cancelNoPage = moved === 'translate3d(-300.0px, 0, 0)' && v.querySelector('.c-mviewer__count').textContent === '2 / 3' && pages.length === 0
      && track.style.transform === '' && W.Spixi.isOverlayOpen(v);
    W.Spixi.dismissOverlay(v);
    z.noErr = K.noErr(s.errs);
  } catch (e) { z.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  if (process.env.GDBG) console.log(JSON.stringify(z));
  ok(Object.values(z).length > 5 && Object.values(z).every((x) => x === true),
    '★ S11 G (R3-MINOR-3) viewer limits on the built chat shell: a pinch past 4× rubber-bands and settles to exactly 4× on release, a pinch under 1× settles back to 1×; a fast flick that ends in pointercancel never turns the page (it snaps back, the viewer stays) — ' + JSON.stringify(z));
}
