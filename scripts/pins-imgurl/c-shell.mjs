/* ==== imgurl 1c — the chat shell takes a media-origin picture URL (cap `mediaOrigin`) and keeps decoded pictures (cap `mediaKeep`) ====
 * What it proves, on the BUILT chat.html in jsdom through the shell's own pushes (executeUiCommand, the e-kit boot of pins-photo1b):
 *   (1) with `mediaOrigin`: setFileThumb takes `https://spixi-media.invalid/m/<32 hex>` AND `spixi-media://m/<32 hex>` — the tile's
 *       <img> src is exactly the URL, with loading="lazy" + decoding="async";
 *   (2) with the cap, every other value is refused (the tile gets no src): upper-case hex, 31 / 33 hex, a suffix, a query, a
 *       fragment, a trailing newline, a leading space, http://, another host, another path, javascript:, a data: SVG, 65+ chars;
 *   (3) without the cap a valid URL of either prefix is ignored exactly as today (the log's DOM equals the log with no push),
 *       and viewerImage(URL) is today's refusal (setFailed + the toast);
 *   (4) data: previews work as today with and without the cap — the whole log's DOM is equal cap ON vs cap absent, no lazy mark,
 *       and a data: tile <img> carries EXACTLY the base build's attributes (class, alt, src) — the viewer's data: <img> too (5);
 *   (5) the viewer: viewerImage(token, URL) under the cap → the viewer's picture src is the URL, not failed; a refused value →
 *       failed + toast; the URL that does not load (error) → failed + the toast; a data: picture that does not decode → no toast
 *       (today);
 *   (6) a tile whose URL does not load (error) → today's file face, idle, no src — never a broken picture — and the preview is
 *       forgotten (a re-render builds no src);
 *   (7) the sinks: the URL is found ONLY as the src attribute of an <img> — the photo tile's, the quote tile's of a reply to
 *       that photo, and the reply strip's tile (no style, no other attribute, no text); a photo with no preview still quotes
 *       with the picture glyph; setOfferPreview and the photo picker strip (mediaPicked) refuse a URL;
 *   (8) the keeper (both caps): after the pictures loaded and showed, three live text arrivals re-render the log and every photo
 *       tile holds the SAME <img> element (adopted) — 0 new URL requests, 0 new <img> for the tiles;
 *   (9) `mediaOrigin` without `mediaKeep`: the same re-renders build a new <img> per tile and request each URL again (today's
 *       re-render, the trap the keeper closes);
 *   (10) the keeper holds at most 64: 70 shown URL tiles → mediaKeepSize() = 64 and one re-render requests exactly the 6 others;
 *   (11) a new conversation in the same document (onChatScreenReady) drops every kept picture;
 *   (12) a picture that loaded but has not SHOWN yet (its fade not ended) is not adopted: the re-built tile fades it in (#46 r4 M1);
 *   (13) a quote tile / a reply-strip tile whose URL does not load (error) → the quote shows the picture glyph (the one a photo
 *       with no preview shows), the strip shows no tile — never a broken picture;
 *   (14) the paged viewer keeps no URL: C# holds ONE viewer grant per WebView (a new page revokes the last), so after page
 *       0 → 1 → 0 with URL answers the return is busy again (the thumbnail under the spinner, C# asked again), no neighbour
 *       slide shows a viewer URL, no toast;
 *   (15) the keeper's event dispatcher: an ADOPTED <img> answers the tile that holds it now — a new URL for the same message
 *       (setFileThumb → setMediaSrc on the live tile) loads and the live tile reaches `loaded`.
 * LIMITS: jsdom lays nothing out and loads no image. A "request" here = a write of a media-origin URL to an <img> src (the shell's
 *   only way to ask the WebView for it; the lab script counts the handler hits in Chromium). `load` / `error` / `transitionend`
 *   are DISPATCHED by the pin; `complete` / `naturalWidth` are stubbed true / 320 on an <img> the pin "loaded". loading="lazy"
 *   is read as an attribute, not as a deferred fetch; an attribute
 *   set through an IDL property jsdom does not reflect (`decoding`) is not seen by the attribute rows. The keeper's memory-cache effect on a real engine is the lab's (WebKit unmeasured).
 * Deliberate breaks (#802) — one token in a full copy of the tree, the BUILT chat.html changed, the key red (see the return of 1c).
 */
import { kit, JPG, T0 } from '../pins-photo1b/e-kit.mjs';
import { s1Kit } from '../pins-s7b/s1-boot.mjs';   // its menu pick (right click → the item by its label)

const HEX = '0123456789abcdef0123456789abcdef';
const hx = (i) => i.toString(16).padStart(32, '0');
const UA = (i) => 'https://spixi-media.invalid/m/' + hx(i);   // Android / Windows
const UI = (i) => 'spixi-media://m/' + hx(i);                  // iOS / Mac
const A = 'https://spixi-media.invalid/m/' + HEX;
const BAD = {
  upper: 'https://spixi-media.invalid/m/' + HEX.toUpperCase(),
  hex31: 'https://spixi-media.invalid/m/' + HEX.slice(1),
  hex33: A + 'a',
  iosHex33: 'spixi-media://m/' + HEX + 'a',
  suffix: A + '/x',
  ext: A + '.jpg',
  query: A + '?a=1',
  fragment: A + '#f',
  newline: A + '\n',
  space: ' ' + A,
  http: 'http://spixi-media.invalid/m/' + HEX,
  host: 'https://spixi-media.example/m/' + HEX,
  host2: 'https://evil.invalid/m/' + HEX,
  path: 'https://spixi-media.invalid/x/' + HEX,
  iosPath: 'spixi-media://x/' + HEX,
  js: 'javascript:alert(1)',
  svg: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=',
  long65: 'https://spixi-media.invalid/m/' + 'a'.repeat(35),
};

export default async function (h) {
  const { ok, root, join, sleep } = h;
  const K = kit(h);
  const html = join(root, 'Spixi/Resources/Raw/html/chat.html');
  const T = '★ imgurl 1c';
  /* the spies: URL writes to an <img> src, <img> made, the load stubs */
  const before = (s) => {
    const W = s.W;
    const P = W.HTMLImageElement.prototype;
    const dsc = Object.getOwnPropertyDescriptor(P, 'src');
    s.urlSets = 0;
    s.imgMade = 0;
    Object.defineProperty(P, 'src', { configurable: true, get() { return dsc.get.call(this); }, set(v) { if (/spixi-media/.test(String(v))) s.urlSets++; dsc.set.call(this, v); } });
    Object.defineProperty(P, 'naturalWidth', { configurable: true, get() { return this.__ok ? 320 : 0; } });
    Object.defineProperty(P, 'complete', { configurable: true, get() { return !!this.__ok; } });
    const ce = W.document.createElement.bind(W.document);
    W.document.createElement = (t, o) => { if (String(t).toLowerCase() === 'img') s.imgMade++; return ce(t, o); };
    s.toastN = 0;   // every "could not be opened" toast the page puts up (a newer one may replace an older one in place)
    new W.MutationObserver((ms) => { for (const m of ms) for (const n of [...m.addedNodes, ...(m.type === 'characterData' ? [m.target] : [])]) if (/This image could not be opened\./.test(n.textContent || '')) s.toastN++; })
      .observe(W.document, { childList: true, subtree: true, characterData: true });
  };
  const tileImg = (s, id) => { const r = K.rowOf(s.d, id); return r && r.querySelector('.c-mbubble__img'); };
  const tile = (s, id) => { const r = K.rowOf(s.d, id); return r && r.querySelector('.c-mbubble'); };
  const fire = (s, el, type) => { const e = new s.W.Event(type); if (type === 'transitionend') Object.defineProperty(e, 'propertyName', { value: 'opacity' }); el.dispatchEvent(e); };
  /* every tile picture "loads" (stub + event), its fade ends — then it counts as shown */
  const loadAll = async (s) => {
    for (const im of s.d.querySelectorAll('#messages .c-mbubble__img[src]')) { im.__ok = true; fire(s, im, 'load'); }
    await sleep(120);
    for (const im of s.d.querySelectorAll('#messages .c-mbubble__img[src]')) fire(s, im, 'transitionend');
    await sleep(40);
  };
  let live = 0;
  const arrive = async (s) => { live++; s.push('addThem', 'live' + live, 'addrPeer', 'Ana', '', 'hello ' + live, String(T0 + 4000 + live), 'True', 'True', 'True', 'False', 'False'); await sleep(90); };
  const print = (s) => [...s.d.getElementById('messages').children].map((el) => K.normRow(el)).join('\n');
  const toasts = (s) => s.toastN;
  const CAP = 'mediaOrigin';
  const KEEP = 'mediaOrigin,mediaKeep';

  /* (1) (2) both prefixes in, every bad value out */
  {
    const s = await K.open(html, { caps: CAP, rows: K.photoRows(3), settle: 80, before });
    s.push('setFileThumb', 'p0', A);
    s.push('setFileThumb', 'p1', 'spixi-media://m/' + HEX);
    await sleep(60);
    const i0 = tileImg(s, 'p0'), i1 = tileImg(s, 'p1');
    const r1 = { android: !!i0 && i0.getAttribute('src') === A, ios: !!i1 && i1.getAttribute('src') === 'spixi-media://m/' + HEX,
      lazy: !!i0 && i0.getAttribute('loading') === 'lazy' && i0.getAttribute('decoding') === 'async' && i1.getAttribute('loading') === 'lazy', noErr: !s.errs.length };
    ok(Object.values(r1).every(Boolean), T + ' (1) with `mediaOrigin` setFileThumb takes a URL of EACH prefix (https://spixi-media.invalid/m/ · spixi-media://m/ + 32 hex): the tile <img> src is the URL, loading=lazy, decoding=async — ' + JSON.stringify(r1));
    const refused = {};
    for (const [k, v] of Object.entries(BAD)) {
      s.push('setFileThumb', 'p2', v);
      await sleep(5);
      const im = tileImg(s, 'p2');
      refused[k] = !!im && !im.hasAttribute('src');
    }
    ok(Object.values(refused).every(Boolean), T + ' (2) with the cap every other value is refused (no src on the tile): ' + Object.keys(BAD).join(' · ') + ' — ' + JSON.stringify(refused));
    s.dom.window.close();
  }

  /* (3) no cap: a URL is ignored exactly as today · (4) data: works as today, cap ON = cap absent */
  {
    const a = await K.open(html, { caps: '', rows: K.photoRows(3), settle: 80, before });
    const p0 = print(a);
    a.push('setFileThumb', 'p0', A);
    a.push('setFileThumb', 'p1', 'spixi-media://m/' + HEX);
    await sleep(60);
    const r3 = { sameDom: print(a) === p0, noSrc: !tileImg(a, 'p0').hasAttribute('src') && !tileImg(a, 'p1').hasAttribute('src'), noReq: a.urlSets === 0 };
    ok(Object.values(r3).every(Boolean), T + ' (3) WITHOUT the cap a valid URL of either prefix is ignored as today: the log DOM equals the log before the push, no src, no URL write — ' + JSON.stringify(r3));
    a.dom.window.close();
    const run = async (caps) => {
      live = 100;   // the same live row in both documents
      const s = await K.open(html, { caps, rows: K.photoRows(4), settle: 80, before });
      for (let i = 0; i < 4; i++) s.push('setFileThumb', 'p' + i, JPG);
      await sleep(60);
      const loading = print(s);
      const attrsLoading = tileImg(s, 'p0').getAttributeNames().join(',');
      await loadAll(s);
      await arrive(s);
      const out = { loading, loaded: print(s), src: tileImg(s, 'p0').getAttribute('src') === JPG, lazy: tileImg(s, 'p0').hasAttribute('loading'),
        attrs: attrsLoading + ' | ' + tileImg(s, 'p0').getAttributeNames().join(',') };
      s.dom.window.close();
      return out;
    };
    const off = await run(''), on = await run(KEEP);
    /* the base build's data: tile <img> (ae7b8303, read in jsdom): exactly these attributes, in this order, loading and loaded */
    const BASE_TILE_ATTRS = 'class,alt,src | class,alt,src';
    const r4 = { offSrc: off.src, onSrc: on.src, noLazy: !off.lazy && !on.lazy, loadingEqual: off.loading === on.loading, loadedEqual: off.loaded === on.loaded,
      offAttrs: off.attrs === BASE_TILE_ATTRS, onAttrs: on.attrs === BASE_TILE_ATTRS };
    ok(Object.values(r4).every(Boolean), T + ' (4) data: previews work as today WITH and WITHOUT the caps: src = the data URI, no lazy mark, the whole log DOM equal cap ON vs absent while loading and after load + a re-render — ' + JSON.stringify(r4));
  }

  /* (5) the viewer */
  {
    const openViewer = async (s, id) => { s.push('setFileThumb', id, JPG); await sleep(30); await loadAll(s); tile(s, id).click(); await sleep(40); return [...s.d.querySelectorAll('.c-mviewer')].pop(); };
    const s = await K.open(html, { caps: CAP, rows: K.photoRows(3), settle: 80, before });
    const v = await openViewer(s, 'p0');
    const t0 = toasts(s);
    s.push('viewerImage', 'p0', A);
    await sleep(20);
    const vi = v && v.querySelector('.c-mviewer__img');
    const r5 = { opened: !!v, sent: s.sent.includes('ixian:viewImage:p0'), src: !!vi && vi.getAttribute('src') === A, notFailed: !!v && v.dataset.failed === undefined, noToast: toasts(s) === t0 };
    fire(s, vi, 'error');   // the handler answered 404 (a revoked grant)
    await sleep(20);
    r5.errFailed = v.dataset.failed !== undefined;
    r5.errToast = toasts(s) === t0 + 1;
    r5.errBackToThumb = vi.getAttribute('src') === JPG;
    r5.noErr = !s.errs.length;
    s.dom.window.close();
    /* each further case in its own document: a second toast while one is up is queued (toast.js), not shown */
    const b = await K.open(html, { caps: CAP, rows: K.photoRows(1), settle: 80, before });
    const v2 = await openViewer(b, 'p0');
    const t1 = toasts(b);
    b.push('viewerImage', 'p0', BAD.upper);
    await sleep(20);
    r5.badFailed = !!v2 && v2.dataset.failed !== undefined && v2.querySelector('.c-mviewer__img').getAttribute('src') !== BAD.upper;
    r5.badToast = toasts(b) === t1 + 1;
    b.dom.window.close();
    const c = await K.open(html, { caps: CAP, rows: K.photoRows(1), settle: 80, before });
    const v3 = await openViewer(c, 'p0');
    const t2 = toasts(c);
    c.push('viewerImage', 'p0', JPG);
    await sleep(20);
    const vi3 = v3.querySelector('.c-mviewer__img');
    r5.dataViewerAttrs = vi3.getAttributeNames().join(',') === 'class,src,data-pending,alt,draggable';   // the base build's data: viewer <img>
    fire(c, vi3, 'error');
    await sleep(20);
    r5.dataErrSilent = v3.dataset.failed !== undefined && toasts(c) === t2;
    c.dom.window.close();
    const n = await K.open(html, { caps: '', rows: K.photoRows(1), settle: 80, before });
    const vn = await openViewer(n, 'p0');
    const tn = toasts(n);
    n.push('viewerImage', 'p0', A);
    await sleep(20);
    r5.noCapRefused = !!vn && vn.dataset.failed !== undefined && vn.querySelector('.c-mviewer__img').getAttribute('src') !== A && toasts(n) === tn + 1;
    n.dom.window.close();
    ok(Object.values(r5).every(Boolean), T + ' (5) the viewer: viewerImage(token, URL) under the cap → its picture src is the URL (not failed, no toast); the URL that does not load → failed + the "could not be opened" toast + back to the thumbnail; a refused value (upper-case hex) → failed + toast; a data: picture that does not decode stays silent (today); without the cap the URL is refused (failed + toast) — ' + JSON.stringify(r5));
  }

  /* (6) a URL that does not load leaves the file face */
  {
    const s = await K.open(html, { caps: KEEP, rows: K.photoRows(2), settle: 80, before });
    s.push('setFileThumb', 'p0', UA(1));
    await sleep(40);
    const im = tileImg(s, 'p0');
    fire(s, im, 'error');
    await sleep(40);
    const t = tile(s, 'p0');
    const r6 = { idle: t.dataset.state === 'idle', noSrc: !im.hasAttribute('src'), face: !!t.querySelector('.c-mbubble__file'), unquiet: !t.hasAttribute('data-quiet') };
    await arrive(s);
    r6.forgotten = !tileImg(s, 'p0').hasAttribute('src');
    ok(Object.values(r6).every(Boolean), T + ' (6) a tile whose URL does not load (error) goes back to today\'s file face (idle, no src, face shown, not quiet) and the preview is forgotten (a re-render builds no src) — ' + JSON.stringify(r6));
    s.dom.window.close();
  }

  /* (7) the sinks · (13) the quote / strip fallback */
  {
    const P = s1Kit(h);
    const offer = (id) => ['addFile', id, 'addrPeer', 'Ana', '', 'x' + id, 'offer.jpg', String(T0 + 900), 'False', 'True', 'True', '0', 'False', 'False', 'True', '', '', '', '', '', '2400000'];
    const reply = (id, to, at) => ['addThem', id, 'addrPeer', 'Ana', '', 'look', String(T0 + at), 'True', 'True', 'True', 'False', 'False', '', to, '', '', '', '', ''];
    const rows = [...K.photoRows(2), offer('o1'), offer('o2'), reply('q0', 'p0', 950), reply('q1', 'p1', 960)];
    const s = await K.open(html, { caps: KEEP + ',media,reply', rows, settle: 80, before });
    s.push('setFileThumb', 'p0', A);   // p1 keeps no preview: its quote is the reference glyph
    await sleep(40);
    await loadAll(s);
    await arrive(s);
    s.push('setOfferPreview', 'o1', JPG);
    s.push('setOfferPreview', 'o2', A);
    s.push('mediaPicked', '0123456789abcdef', JSON.stringify([{ k: '0', kind: 'photo', thumb: A, w: '1', h: '1', kb: '1' }]));
    await sleep(80);
    const picked = await P.pick(s.W, s.d, 'p0', 'Reply');
    const scan = () => {
      const hits = [];
      for (const el of s.d.querySelectorAll('*')) for (const at of el.attributes) if (/spixi-media/.test(at.value)) hits.push(String(el.className).split(' ').filter((c) => /^c-/.test(c)).sort().join('.') + '@' + at.name);
      return hits.sort();
    };
    const hits = scan();
    const quoteTile = (id) => { const q = K.rowOf(s.d, id) && K.rowOf(s.d, id).querySelector('.c-bubble__reply'); return q ? q.querySelector('.c-bubble__reply-glyph, .c-bubble__reply-thumb, .c-bubble__reply-tile') : null; };
    const g0 = quoteTile('q0'), g1 = quoteTile('q1');
    const ctx = s.d.querySelector('.c-composer__ctx .c-composer__ctx-tile');
    const pv = (id) => { const r = K.rowOf(s.d, id); return r && r.querySelector('.c-mbubble__preview'); };
    const r7 = { picked, sinks: JSON.stringify(hits) === JSON.stringify(['c-bubble__reply-thumb@src', 'c-composer__ctx-tile@src', 'c-mbubble__img@src']),
      quoteUrl: !!g0 && g0.tagName === 'IMG' && g0.getAttribute('src') === A, stripUrl: !!ctx && ctx.tagName === 'IMG' && ctx.getAttribute('src') === A,
      noPreviewGlyph: !!g1 && g1.className === 'c-bubble__reply-glyph', notInText: !/spixi-media/.test(s.d.body.textContent),
      offerControl: !!pv('o1') && pv('o1').getAttribute('src') === JPG, offerRefused: !pv('o2'), noErr: !s.errs.length };
    ok(Object.values(r7).every(Boolean), T + ' (7) the sinks: the URL is found ONLY as the src attribute of an <img> — the photo tile, the quote tile of a reply to it, the reply strip tile (no style, no other attribute, no text; the photo picker strip and the offer preview refuse it); a photo with no preview still quotes with the glyph — ' + JSON.stringify(r7) + ' hits=' + JSON.stringify(hits));
    if (g0) fire(s, g0, 'error');
    if (ctx) fire(s, ctx, 'error');
    await sleep(20);
    const g0b = quoteTile('q0');
    const r13 = { had: !!g0 && !!ctx, quoteGlyph: !!g0b && g0b.className === 'c-bubble__reply-glyph' && g0b.outerHTML === g1.outerHTML,
      stripNoTile: !s.d.querySelector('.c-composer__ctx .c-composer__ctx-tile') && !!s.d.querySelector('.c-composer__ctx'), noErr: !s.errs.length };
    ok(Object.values(r13).every(Boolean), T + ' (13) a quote / reply-strip tile whose URL does not load (error) → the quote shows the SAME picture glyph as a photo with no preview, the strip keeps its line with no tile — never a broken picture — ' + JSON.stringify(r13));
    s.dom.window.close();
  }

  /* (8) (9) the keeper ON / OFF over three re-renders · (11) the per-conversation drop */
  const rerender = async (caps, n = 6) => {
    const s = await K.open(html, { caps, rows: K.photoRows(n), settle: 80, before });
    for (let i = 0; i < n; i++) s.push('setFileThumb', 'p' + i, UA(i + 1));
    await sleep(40);
    await loadAll(s);
    const imgs = Array.from({ length: n }, (_, i) => tileImg(s, 'p' + i));
    const sets0 = s.urlSets, made0 = s.imgMade;
    for (let k = 0; k < 3; k++) await arrive(s);
    const same = Array.from({ length: n }, (_, i) => tileImg(s, 'p' + i) === imgs[i]).filter(Boolean).length;
    const loaded = Array.from({ length: n }, (_, i) => tile(s, 'p' + i).dataset.state === 'loaded').filter(Boolean).length;
    return { s, same, loaded, reqs: s.urlSets - sets0, made: s.imgMade - made0 };
  };
  {
    const on = await rerender(KEEP);
    const r8 = { same: on.same, loaded: on.loaded, reqs: on.reqs, made: on.made, kept: on.s.W.Spixi.mediaKeepSize() };
    ok(on.same === 6 && on.loaded === 6 && on.reqs === 0 && on.made === 0 && r8.kept === 6 && !on.s.errs.length,
      T + ' (8) the keeper (mediaOrigin + mediaKeep): after the 6 URL pictures showed, 3 live text arrivals re-render the log and every tile holds the SAME decoded <img> (6 / 6), loaded — 0 new URL requests, 0 new <img> — ' + JSON.stringify(r8));
    on.s.push('onChatScreenReady', 'addrOther');
    await sleep(30);
    const r11 = { kept: on.s.W.Spixi.mediaKeepSize() };
    ok(r11.kept === 0, T + ' (11) a new conversation in the same document (onChatScreenReady) drops every kept picture — ' + JSON.stringify(r11));
    on.s.dom.window.close();
    const off = await rerender(CAP);
    const r9 = { same: off.same, reqs: off.reqs, made: off.made, kept: off.s.W.Spixi.mediaKeepSize() };
    ok(off.same === 0 && off.reqs === 18 && off.made >= 18 && r9.kept === 0,
      T + ' (9) `mediaOrigin` WITHOUT `mediaKeep` = no keeper: each of the 3 re-renders builds a new <img> per tile and requests each URL again (18 = 3 × 6), nothing kept — ' + JSON.stringify(r9));
    off.s.dom.window.close();
  }

  /* (10) the bound */
  {
    const s = await K.open(html, { caps: KEEP, rows: K.photoRows(70), settle: 80, before });
    for (let i = 0; i < 70; i++) s.push('setFileThumb', 'p' + i, (i % 2 ? UI : UA)(i + 1));
    await sleep(60);
    await loadAll(s);
    const kept = s.W.Spixi.mediaKeepSize();
    const sets0 = s.urlSets;
    await arrive(s);
    const r10 = { kept, max: s.W.Spixi.MEDIA_KEEP_MAX, reqs: s.urlSets - sets0, after: s.W.Spixi.mediaKeepSize() };
    ok(kept === 64 && r10.max === 64 && r10.reqs === 6 && r10.after === 64 && !s.errs.length,
      T + ' (10) the keeper is bounded: 70 shown URL tiles (both prefixes) → 64 kept (oldest out), a re-render requests exactly the 6 not kept — ' + JSON.stringify(r10));
    s.dom.window.close();
  }

  /* (14) the paged viewer keeps no viewer URL */
  {
    const s = await K.open(html, { caps: CAP, rows: [], settle: 80, before });
    const W = s.W;
    const V = (n) => 'https://spixi-media.invalid/m/' + String(n).repeat(32);
    const TH = (n) => 'https://spixi-media.invalid/m/' + String(n + 3).repeat(32);
    let urlFails = 0;
    const pages = [];
    const v = W.Spixi.openMediaViewer({ items: [{ src: TH(0), token: 'a0', alt: 'a' }, { src: TH(1), token: 'b1', alt: 'b' }, { src: TH(2), token: 'c2', alt: 'c' }],
      index: 0, token: 'a0', onPage: (i) => pages.push(i), onUrlFailed: () => urlFails++ });
    await sleep(50);
    const img = v.querySelector('.c-mviewer__img');
    const key = (k) => v.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, bubbles: true }));
    v.setSrc(V(1)); fire(s, img, 'load'); await sleep(50);   // C#'s viewer grant for page 0
    key('ArrowRight'); await sleep(600);                       // page 1: C#'s new grant revokes page 0's
    v.setSrc(V(2)); fire(s, img, 'load'); await sleep(50);
    const peers = [...v.querySelectorAll('.c-mviewer__peer')].map((p) => p.getAttribute('src') || '');
    key('ArrowLeft'); await sleep(600);                        // back to page 0
    const peersBack = [...v.querySelectorAll('.c-mviewer__peer')].map((p) => p.getAttribute('src') || '');
    const r14 = { paged: pages.join(',') === '1,0', busy: v.getAttribute('aria-busy') === 'true', thumbShown: img.getAttribute('src') === TH(0),
      notRevoked: img.getAttribute('src') !== V(1), peersNoViewerUrl: ![...peers, ...peersBack].some((u) => u === V(1) || u === V(2)), noToast: urlFails === 0 && toasts(s) === 0, noErr: !s.errs.length };
    ok(Object.values(r14).every(Boolean), T + ' (14) the paged viewer keeps no viewer URL (C# holds ONE viewer grant per WebView): page 0 → 1 → 0 with URL answers → the return is busy again on the thumbnail (C# is asked again), no neighbour slide shows a viewer URL, no toast — ' + JSON.stringify(r14) + ' peers=' + JSON.stringify(peers));
    s.dom.window.close();
  }

  /* (15) the keeper's dispatcher: an adopted <img> answers its new tile */
  {
    const s = await K.open(html, { caps: KEEP, rows: K.photoRows(2), settle: 80, before });
    s.push('setFileThumb', 'p0', UA(1));
    await sleep(40);
    await loadAll(s);
    const im = tileImg(s, 'p0');
    await arrive(s);
    const adopted = tileImg(s, 'p0') === im && tile(s, 'p0').dataset.state === 'loaded';
    s.push('setFileThumb', 'p0', UA(2));   // a new picture for the same message: the live tile loads it on the adopted element
    await sleep(30);
    const loading = tile(s, 'p0').dataset.state === 'loading' && im.getAttribute('src') === UA(2);
    fire(s, im, 'load');
    await sleep(150);
    const r15 = { adopted, loading, loaded: tile(s, 'p0').dataset.state === 'loaded', sameImg: tileImg(s, 'p0') === im, noErr: !s.errs.length };
    ok(Object.values(r15).every(Boolean), T + ' (15) the keeper\'s event dispatcher: an ADOPTED <img> answers the tile that holds it now — a new URL for the same message loads on it and the live tile reaches `loaded` — ' + JSON.stringify(r15));
    s.dom.window.close();
  }

  /* (12) loaded but not shown yet → not adopted */
  {
    const s = await K.open(html, { caps: KEEP, rows: K.photoRows(2), settle: 80, before });
    s.push('setFileThumb', 'p0', UA(7));
    await sleep(40);
    const im = tileImg(s, 'p0');
    im.__ok = true;
    fire(s, im, 'load');
    const sets0 = s.urlSets;
    live++;
    s.push('addThem', 'live' + live, 'addrPeer', 'Ana', '', 'quick', String(T0 + 4000 + live), 'True', 'True', 'True', 'False', 'False');   // before the reveal frame
    await sleep(90);
    const r12 = { newImg: tileImg(s, 'p0') !== im, requested: s.urlSets - sets0 === 1, fades: tile(s, 'p0').dataset.seen === undefined };
    ok(Object.values(r12).every(Boolean), T + ' (12) a picture that loaded but has not SHOWN (its fade not ended) is not adopted: the re-built tile asks again and fades it in (no data-seen) — ' + JSON.stringify(r12));
    s.dom.window.close();
  }
}
