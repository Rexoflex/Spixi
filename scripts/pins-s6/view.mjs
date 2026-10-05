/* ==== SESSION 6 — ★ #1180 W-VIEW (WALK #1172 F, #1173 (1)) + ★ #1181 A-FADE probe ====
 * W-VIEW mechanism (Windows log 2026-10-04 18:01:21: overlay-close → chatoverlay 410 ms = overlay.js's 400 ms removal
 * fallback; SThumbnail crops the chat preview SQUARE, the loading viewer stretched it to the stage): the viewer had no
 * transition of its own (the removal waited for the fallback with the viewer opaque), and the square thumbnail jumped
 * to the real aspect at the swap. Behaviour on the BUILT contact_details shell (jsdom); the motion values (jsdom runs no
 * transitions) on the source css, comment-stripped. Deliberate breaks: see the hand-back / DECISIONS #1180. */
export default async function (h) {
  const { ok, root, stripCssComments, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const htmlDir = join(root, 'Spixi/Resources/Raw/html');
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const boot = async (name, { p1 = false, fastWait = false } = {}) => {
    const f = join(htmlDir, name);
    const errs = [];
    const warns = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation/i.test(m)) errs.push(m); });
    vc.on('warn', (...a) => warns.push(a.join(' ')));
    const src = readFileSync(f, 'utf8');
    const dom = new JSDOM(p1 ? src.replace(/<html\b/i, '<html data-p1') : src, {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.setPointerCapture = function () {};
        if (fastWait) { const st = w.setTimeout.bind(w); w.setTimeout = (f, ms, ...a) => st(f, ms === 20000 ? 0 : ms, ...a); }   // VIEWER_WAIT_MS → now   // jsdom has none; the viewer's swipe calls it
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set() {} });
      },
    });
    await sleep(1500);
    return { dom, W: dom.window, errs, warns };
  };
  const guard = async (label, fn) => { try { await fn(); } catch (e) { ok(false, label + ' THREW: ' + (e && e.message)); } };
  const frames = (W, n = 3) => new Promise((res) => { let k = 0; const t = () => (++k >= n ? res() : W.requestAnimationFrame(t)); W.requestAnimationFrame(t); });
  const ptr = (W, node, type, y = 100) => node.dispatchEvent(new W.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 50, clientY: y }));

  /* ——— 1. open: the square thumbnail never shows stretched; the viewer-size picture fades in once loaded ——— */
  await guard('#1180 pin 1', async () => {
    const { dom, W, errs } = await boot('contact_details.html');
    const S = W.Spixi;
    const d = W.document;
    const v = S.openMediaViewer({ host: d.body, src: PNG, token: 't1', strings: {} });
    const img = v.querySelector('.c-mviewer__img');
    const r = {};
    r.thumbPending = img.getAttribute('src') === PNG && img.dataset.pending !== undefined;
    img.dispatchEvent(new W.Event('load'));            // the THUMBNAIL's own load never reveals it
    await frames(W);
    r.thumbLoadKeepsHidden = img.dataset.pending !== undefined;
    r.setSrc = v.setSrc(JPEG) === true && img.getAttribute('src') === JPEG;
    r.hiddenUntilLoad = img.dataset.pending !== undefined;   // no flip before the picture loaded
    img.dispatchEvent(new W.Event('load'));
    await frames(W);
    r.revealedAfterLoad = img.dataset.pending === undefined;
    S.dismissOverlay(v);
    /* a failed answer: the thumbnail is better than an empty stage */
    const v2 = S.openMediaViewer({ host: d.body, src: PNG, token: 't2', strings: {} });
    const img2 = v2.querySelector('.c-mviewer__img');
    v2.setFailed();
    await frames(W);
    r.failedShowsThumb = img2.dataset.pending === undefined && img2.getAttribute('src') === PNG;
    S.dismissOverlay(v2);
    /* no token (a GIF / an avatar): the picture is the real one — never pending */
    const v3 = S.openMediaViewer({ host: d.body, src: PNG, strings: {} });
    r.plainNotPending = v3.querySelector('.c-mviewer__img').dataset.pending === undefined;
    S.dismissOverlay(v3);
    /* #46 r1 m3: a picture that passes the shape but fails to DECODE → back to the thumbnail, shown, failed */
    const v4 = S.openMediaViewer({ host: d.body, src: PNG, token: 't4', strings: {} });
    const img4 = v4.querySelector('.c-mviewer__img');
    v4.setSrc(JPEG);
    img4.dispatchEvent(new W.Event('error'));
    await frames(W);
    r.decodeErrorThumb = img4.getAttribute('src') === PNG && img4.dataset.pending === undefined && v4.dataset.failed !== undefined;
    S.dismissOverlay(v4);
    r.noErrors = errs.filter((e) => /ReferenceError|TypeError/.test(e)).length === 0;
    ok(Object.values(r).every((x) => x === true),
      '★ #1180 W-VIEW OPEN on the BUILT shell: a loading viewer keeps the square-crop thumbnail INVISIBLE (data-pending), its own load never reveals it; the viewer-size picture is revealed only after ITS load (+ decode, next frame); a failure or a picture that does not decode shows the thumbnail; a token-less viewer is never pending — ' + JSON.stringify(r) + ' ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— 1b. #46 r1 MAJOR-1 (tests): an OLDER exe never answers — at the wait's end the thumbnail shows (never a blank viewer) ——— */
  await guard('#1180 pin 1b', async () => {
    const { dom, W, errs } = await boot('contact_details.html', { fastWait: true });
    const S = W.Spixi;
    const v = S.openMediaViewer({ host: W.document.body, src: PNG, token: 'old', strings: {} });
    const img = v.querySelector('.c-mviewer__img');
    await sleep(30);
    await frames(W);
    const r = { shown: img.dataset.pending === undefined && img.getAttribute('src') === PNG, notBusy: v.getAttribute('aria-busy') === null };
    S.dismissOverlay(v);
    ok(Object.values(r).every((x) => x === true) && !errs.some((e) => /TypeError|ReferenceError/.test(e)),
      '★ #1180 W-VIEW (older exe): no viewerImage answer → at VIEWER_WAIT_MS the spinner stops AND the thumbnail shows (a pending thumbnail would leave a blank viewer forever) — ' + JSON.stringify(r));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— 2. close: a tap on the dim stage closes; a tap on the picture, a short drag, a cancelled press do not ——— */
  await guard('#1180 pin 2', async () => {
    const { dom, W, errs } = await boot('contact_details.html');
    const S = W.Spixi;
    const d = W.document;
    const open = async () => { const e = S.openMediaViewer({ host: d.body, src: PNG, strings: {}, onSave() {} }); await sleep(400); return e; };   // tap-to-close counts after the open fade (+ margin)
    const r = {};
    /* #46 r1 M2: a DOUBLE click — the second press right after the open (stage tap, ground click with detail 2) never closes */
    let v = S.openMediaViewer({ host: d.body, src: PNG, strings: {}, onSave() {} });
    ptr(W, v.querySelector('.c-mviewer__stage'), 'pointerdown'); ptr(W, v.querySelector('.c-mviewer__stage'), 'pointerup');
    v.querySelector('.c-mviewer__foot').dispatchEvent(new W.MouseEvent('click', { bubbles: true, detail: 1 }));
    r.earlyTapsStay = S.isOverlayOpen(v);
    v.previousElementSibling.click();   // the scrim (reachable before data-open): no light-dismiss for the viewer
    r.scrimClickStays = S.isOverlayOpen(v);
    await sleep(400);
    v.querySelector('.c-mviewer__foot').dispatchEvent(new W.MouseEvent('click', { bubbles: true, detail: 2 }));
    r.secondClickStays = S.isOverlayOpen(v);
    /* #46 r2 (3): a double click's second press on the STAGE (pointer events carry no click count) never closes */
    const st0 = v.querySelector('.c-mviewer__stage');
    ptr(W, st0, 'pointerdown'); ptr(W, st0, 'pointerup'); ptr(W, st0, 'pointerdown'); ptr(W, st0, 'pointerup');
    r.stageDoubleStays = S.isOverlayOpen(v);
    await sleep(520);
    v.querySelector('.c-mviewer__caption') && v.querySelector('.c-mviewer__caption').click();
    S.dismissOverlay(v);
    v = await open();
    let stage = v.querySelector('.c-mviewer__stage');
    let img = v.querySelector('.c-mviewer__img');
    ptr(W, img, 'pointerdown'); ptr(W, stage, 'pointerup');   // the capture retargets the up to the stage
    r.imgTapStays = S.isOverlayOpen(v);
    ptr(W, stage, 'pointerdown'); ptr(W, stage, 'pointermove', 130); ptr(W, stage, 'pointerup', 130);   // 30 px: spring back
    r.shortDragStays = S.isOverlayOpen(v);
    ptr(W, stage, 'pointerdown'); ptr(W, stage, 'pointercancel');
    r.cancelStays = S.isOverlayOpen(v);
    v.querySelector('.c-mviewer__btn').click();   // Save is a button: never a close
    r.saveStays = S.isOverlayOpen(v);
    await sleep(520);   // a fresh press, not the second of a pair (#46 r2 (3))
    ptr(W, stage, 'pointerdown'); ptr(W, stage, 'pointerup');
    r.stageTapCloses = !S.isOverlayOpen(v);
    v = await open();
    v.querySelector('.c-mviewer__foot').click();
    r.footGroundCloses = !S.isOverlayOpen(v);
    v = S.openMediaViewer({ host: d.body, src: PNG, alt: 'IMG_1.jpg', strings: {} });
    await sleep(400);
    v.querySelector('.c-mviewer__caption').click();
    r.captionGroundCloses = !S.isOverlayOpen(v);
    v = await open();
    stage = v.querySelector('.c-mviewer__stage');
    ptr(W, stage, 'pointerdown'); ptr(W, stage, 'pointermove', 220); ptr(W, stage, 'pointerup', 220);   // 120 px: swipe close
    r.swipeCloses = !S.isOverlayOpen(v) && v.style.opacity === '' && v.style.transition === '';
    r.scrimMarked = !!v.previousElementSibling && v.previousElementSibling.dataset.mviewer !== undefined;
    r.noErrors = errs.filter((e) => /ReferenceError|TypeError/.test(e)).length === 0;
    ok(Object.values(r).every((x) => x === true),
      '★ #1180 W-VIEW (#1173 (1)) on the BUILT shell: a tap on the dim stage / the foot ground / the caption CLOSES the viewer (after the open fade; a double click\'s second press and an early tap never do); a tap on the picture, a 30 px drag (spring back), a cancelled press and the Save button do not; a swipe close clears its inline opacity / transition so the css fade runs; the viewer marks its own scrim — ' + JSON.stringify(r) + ' ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— 3. the motion: the viewer fades itself (no 400 ms fallback), closes faster than it opens, its scrim with it ——— */
  {
    const css = stripCssComments(readFileSync(join(root, 'src/styles/components/media-viewer.css'), 'utf8'));
    const block = (sel) => { const i = css.indexOf(sel + ' {'); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
    const base = block('.c-mviewer');
    const open = block('.c-mviewer[data-open]');
    const r = {
      baseHidden: /opacity: 0;/.test(base) && /transition: opacity var\(--duration-100\) var\(--easing-accelerate\);/.test(base),
      openShown: /opacity: 1;/.test(open) && /transition: opacity var\(--duration-200\) var\(--easing-decelerate\);/.test(open),
      closingInert: /\.c-mviewer:not\(\[data-open\]\) \{ pointer-events: none; \}/.test(css),
      scrimSync: /\.c-scrim\[data-mviewer\]:not\(\[data-open\]\) \{ transition-duration: var\(--duration-100\);/.test(css),
      pendingHidden: /\.c-mviewer__img\[data-pending\] \{ opacity: 0; \}/.test(css),
      imgFades: /transition: transform var\(--duration-200\) var\(--easing-decelerate\), opacity var\(--duration-200\) var\(--easing-decelerate\);/.test(block('.c-mviewer__img')),
      noStretch: !/\[data-loading\] \.c-mviewer__img\[src\] \{ width: 100%; height: 100%; \}/.test(css),
    };
    ok(Object.values(r).every((x) => x === true),
      '★ #1180 W-VIEW motion (source css, comment-stripped): the viewer has its OWN opacity fade — in 200 ms decelerate, out 100 ms accelerate (close faster than open; the removal lands on its transitionend, not the 400 ms fallback); a closing viewer takes no click; its scrim leaves at the same 100 ms; the pending picture is invisible and fades in; the square thumbnail is no longer stretched to the stage — ' + JSON.stringify(r));
  }

  /* ——— 4. ★ #1181 A-FADE PROBE (TEMPORARY, [P1] set): dev-only, grammar-safe lines for a preview tile's fade ——— */
  await guard('#1181 probe', async () => {
    const run = async (p1) => {
      const { dom, W, warns } = await boot('contact_details.html', { p1 });
      const S = W.Spixi;
      const row = S.createMediaBubble({ direction: 'received', kind: 'image', src: PNG, autoload: true, instantIfShown: true, width: 10, height: 10, strings: {} });
      W.document.body.append(row);
      const img = row.querySelector('.c-mbubble__img');
      img.dispatchEvent(new W.Event('load'));
      await frames(W, 4);
      const t = new W.Event('transitionend', { bubbles: true });
      Object.defineProperty(t, 'propertyName', { value: 'opacity' });
      img.dispatchEvent(t);
      await sleep(20);
      const lines = warns.filter((w) => /\[P1\] fade/.test(w));
      try { dom.window.close(); } catch (e) {}
      return lines;
    };
    const on = await run(true);
    const off = await run(false);
    const TOK = /^[a-z0-9_.=-]{1,40}$/;
    const r = {
      flip: on.some((l) => /^\[P1\] fade flip dec=\d+ wait=\d+ age=\d+ vis=[01]$/.test(l)),
      end: on.some((l) => /^\[P1\] fade end ms=\d+$/.test(l)),
      grammar: on.length > 0 && on.every((l) => l.replace(/^\[P1\] /, '').split(' ').every((x) => TOK.test(x))),
      offSilent: off.length === 0,
    };
    ok(Object.values(r).every((x) => x === true),
      '★ #1181 A-FADE probe (TEMPORARY, the [P1] retire set): with data-p1 a preview tile logs "fade flip dec wait age vis" at the flip and "fade end ms" at its opacity transitionend — integers and fixed words only; without data-p1 nothing — ' + JSON.stringify(r) + ' on=' + JSON.stringify(on));
  });
}
