/* ==== S11 G — ★★ #1258 + #1263 (c) = A: the photo PREVIEW in an offer, on the BUILT chat.html ====
 *   · a received photo OFFER + setOfferPreview(id, data: JPEG) → the tile paints the preview (.c-mbubble__preview, the 12 px
 *     blur sink) with a centre ↓ disc and the size from addFile arg 20 ("826 KB"); its file face hides (computed);
 *   · a re-render keeps it (the map outlives the row); a downloading tick keeps it under the ring (data-pv, progress);
 *   · a cell of a group takes it the same way;
 *   · refused: a remote URL, a PNG, an over-long value, a COMPLETE row, MY row, an unknown id, previews off;
 *   · "Load pictures and GIFs" OFF (spixi.media.autoload = off) → the push is ignored AND a stored one is not painted:
 *     today's file face;
 *   · a new peer (onChatScreenReady) forgets every preview of the old one.
 * Deliberate breaks (G-brk): see the S11 G report. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = b1Kit(h);
  const { sleep, JPG, T0 } = K;
  let s = null;
  const r = {};
  const offer = (push, id, fid, name, ts, size, group) => push('addFile', id, 'addrPeer', 'Ana', '', fid, name, String(ts), 'False', 'True', 'True', '0', 'False', 'False', 'True', '', '', '', group || '', '', size);
  try {
    s = await K.open({ caps: 'reply,media', rows: false });
    const { d, push, W } = s;
    offer(push, 'o1', 'x1', 'beach.jpg', T0 + 10, '845312');
    offer(push, 'o2', 'x2', 'hill.jpg', T0 + 11, '');
    push('addFile', 'c1', 'addrPeer', 'Ana', '', 'x3', 'done.jpg', String(T0 + 12), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '', '', '');
    push('addFile', 'm1', 'addrMe', 'Me', '', 'x4', 'mine.jpg', String(T0 + 13), 'True', 'True', 'True', '40', 'False', 'False', 'True', '', '', '', '', '', '');
    for (let i = 0; i < 3; i++) offer(push, 'g' + i, 'y' + i, 'g' + i + '.jpg', T0 + 20 + i, '1000', '0123456789abcdef|' + i + '|3|');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(250);
    const tile = (id) => { const rw = K.rowOf(d, id); return rw ? rw.querySelector('.c-mbubble[data-file]') : null; };
    const pvOf = (t) => t && t.querySelector(':scope > .c-mbubble__preview');
    r.noneYet = !pvOf(tile('o1')) && !tile('o1').hasAttribute('data-pv');
    push('setOfferPreview', 'o1', JPG);
    await sleep(60);
    const t1 = tile('o1');
    const size = t1 && t1.querySelector('.c-mbubble__pvsize');
    r.painted = !!pvOf(t1) && pvOf(t1).getAttribute('src') === JPG && t1.hasAttribute('data-pv') && pvOf(t1).getAttribute('aria-hidden') === 'true'
      && !!t1.querySelector('.c-mbubble__pvdisc svg') && !!size && size.textContent === '826 KB' && !size.hidden;
    r.blurSink = !!pvOf(t1) && /blur\(12px\)/.test(W.getComputedStyle(pvOf(t1)).filter || '');
    r.faceHidden = !!t1 && W.getComputedStyle(t1.querySelector('.c-mbubble__file')).visibility === 'hidden';
    /* no size (an old exe) → the disc alone */
    push('setOfferPreview', 'o2', JPG);
    await sleep(60);
    const s2 = tile('o2') && tile('o2').querySelector('.c-mbubble__pvsize');
    r.noSizeHidden = !!pvOf(tile('o2')) && !!s2 && s2.hidden;
    /* a re-render keeps it */
    push('addThem', 'tt', 'addrPeer', 'Ana', '', 'hello', String(T0 + 50), 'True', 'True', 'True', 'False', 'False');
    await sleep(120);
    r.keptOnRerender = !!pvOf(tile('o1')) && tile('o1') !== t1;
    /* a group cell */
    push('setOfferPreview', 'g1', JPG);
    await sleep(60);
    const gcell = K.rowOf(d, 'g0') && K.rowOf(d, 'g0').querySelectorAll('.c-mgrid__cell')[1];
    r.cell = !!gcell && !!pvOf(gcell.querySelector('.c-mbubble[data-file]'));
    /* refusals */
    const PNG = 'data:image/png;base64,iVBORw0KGgo=';
    push('setOfferPreview', 'g0', 'https://tracker.example/p.jpg');
    push('setOfferPreview', 'g2', PNG);
    push('setOfferPreview', 'g2', 'data:image/jpeg;base64,' + 'A'.repeat(11000));
    push('setOfferPreview', 'c1', JPG);
    push('setOfferPreview', 'm1', JPG);
    push('setOfferPreview', 'nope', JPG);
    await sleep(80);
    const gc = K.rowOf(d, 'g0').querySelectorAll('.c-mgrid__cell');
    r.refused = !pvOf(gc[0].querySelector('.c-mbubble')) && !pvOf(gc[2].querySelector('.c-mbubble'))
      && !d.querySelector('#messages [data-msgid="c1"] .c-mbubble__preview') && !d.querySelector('#messages [data-msgid="m1"] .c-mbubble__preview')
      && !d.querySelector('img[src^="https:"]');
    /* the download starts: the ring stands on the preview */
    push('updateFile', 'x1', '30', 'False');
    await sleep(120);
    const tp = tile('o1');
    r.progressKeeps = !!tp && tp.dataset.file === 'progress' && !!pvOf(tp) && tp.hasAttribute('data-pv') && !!tp.querySelector('.c-mbubble__ring')
      && W.getComputedStyle(tp.querySelector('.c-mbubble__pvmark')).display === 'none';
    /* complete: the in-place flip keeps the preview UNDER the face until the picture lands; the next render has none */
    push('updateFile', 'x1', '100', 'True');
    await sleep(120);
    push('addThem', 'tu', 'addrPeer', 'Ana', '', 'again', String(T0 + 51), 'True', 'True', 'True', 'False', 'False');
    await sleep(120);
    r.completeDrops = !!tile('o1') && tile('o1').dataset.file === 'complete' && !pvOf(tile('o1'));
    /* a new peer forgets them */
    push('onChatScreenReady', 'addrOther');
    push('clearMessages', 'false');
    offer(push, 'o2', 'x2', 'hill.jpg', T0 + 11, '');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(200);
    r.perPeerReset = !!tile('o2') && !pvOf(tile('o2'));
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  if (process.env.GDBG) console.log(JSON.stringify(r));
  ok(Object.values(r).length > 10 && Object.values(r).every((x) => x === true),
    '★★ S11 G (#1258 + #1263 c = A) the offer PREVIEW on the built chat shell: setOfferPreview paints the 12 px-blurred preview with a ↓ disc + the arg-20 size on a received offer (face hidden; no size = disc alone), a re-render and a group cell keep / take it, the download ring stands on it, completion drops it; a remote URL, a PNG, an over-long value, a complete row, my row and an unknown id are refused; a new peer forgets them — ' + JSON.stringify(r));

  /* —— "Load pictures and GIFs" OFF → no preview, today's face; previews OFF → the card —— */
  const o = {};
  try {
    /* file:// is an opaque origin in jsdom (localStorage throws → the shell's default ON): a store the pin owns (fixr4's) */
    const store = new Map([['spixi.media.autoload', 'off']]);
    const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); }, key: () => null, get length() { return store.size; } };
    s = await K.open({ caps: 'reply,media', rows: false, before: (x) => { Object.defineProperty(x.W, 'localStorage', { configurable: true, value: ls }); } });
    const { d, push, W } = s;
    offer(push, 'o1', 'x1', 'beach.jpg', T0 + 10, '845312');
    push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(200);
    push('setOfferPreview', 'o1', JPG);
    await sleep(60);
    const t = K.rowOf(d, 'o1').querySelector('.c-mbubble[data-file]');
    o.offIgnored = !!t && !t.querySelector('.c-mbubble__preview') && !t.hasAttribute('data-pv') && W.getComputedStyle(t.querySelector('.c-mbubble__file')).visibility !== 'hidden';
    /* the push while OFF was not even KEPT: switched ON, the next render still has none */
    ls.removeItem('spixi.media.autoload');
    push('addThem', 'ts', 'addrPeer', 'Ana', '', 'hi', String(T0 + 49), 'True', 'True', 'True', 'False', 'False');
    await sleep(120);
    o.offNotKept = !K.rowOf(d, 'o1').querySelector('.c-mbubble__preview');
    /* stored while ON, then OFF: not painted at the next render */
    push('setOfferPreview', 'o1', JPG);
    await sleep(60);
    o.onPaints = !!K.rowOf(d, 'o1').querySelector('.c-mbubble__preview');
    ls.setItem('spixi.media.autoload', 'off');
    push('addThem', 'tt', 'addrPeer', 'Ana', '', 'hello', String(T0 + 50), 'True', 'True', 'True', 'False', 'False');
    await sleep(120);
    o.offAtRender = !K.rowOf(d, 'o1').querySelector('.c-mbubble__preview');
    ls.removeItem('spixi.media.autoload');
    push('setPhotoPreviews', 'False');
    await sleep(120);
    o.previewsOffCard = !K.rowOf(d, 'o1').querySelector('.c-mbubble') && !d.querySelector('.c-mbubble__preview');
    o.noErr = K.noErr(s.errs);
  } catch (e) { o.err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
  finally { if (s) { try { s.W.close(); } catch (_) {} s = null; } }
  if (process.env.GDBG) console.log(JSON.stringify(o));
  ok(Object.values(o).length > 4 && Object.values(o).every((x) => x === true),
    '★ S11 G (#1263 c) "Load pictures and GIFs" OFF = no preview (the push is ignored and not kept — switched ON the next render still has none; a stored one is not painted at the next render while OFF) and today\'s file face; photo previews OFF = the file card — ' + JSON.stringify(o));
}
