/* ==== SESSION 4 re-walk fixes (DECISIONS #1151: A-FADE · A-EDGE 3 px) ====
 * Behaviour first: the BUILT chat shell is booted in jsdom and driven through its real entry points (executeUiCommand).
 * A-FADE mechanism (Chromium, begin-frame control = a WebView that makes no frame while C# holds the stage — the
 * Android spare): the preview's load event landed BEFORE the tile's first style, so the tile was loaded in its first
 * painted style (no transition); and the rAF render queued by setPhotoPreviews re-built the tile with the r3 "seen"
 * mark → shown at once. The pins below hold the fix: the flip to loaded waits for the next frame AND reads the loading
 * style (opacity 0) first, in BOTH orders (thumb before the row, thumb after it), and a tile re-built before its
 * picture reached a frame is NOT "seen". Every pin was broken on purpose before it was believed (fixer's report). */
export default async function (h) {
  const { ok, readFileSync, stripCssComments, join, root, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 600;
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const boot = async () => {
    const f = join(root, 'Spixi/Resources/Raw/html', 'chat.html');
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
      },
    });
    await sleep(1800);
    const W = dom.window;
    /* the style reads of a tile picture, with the tile's state at the read (the "first style" the transition runs from) */
    const reads = [];
    const gcs = W.getComputedStyle.bind(W);
    W.getComputedStyle = (el, ...a) => {
      try { if (el && el.classList && el.classList.contains('c-mbubble__img')) reads.push({ el: el.closest('.c-mbubble'), state: el.closest('.c-mbubble').dataset.state }); } catch (e) {}
      return gcs(el, ...a);
    };
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    return { W, push, errs, reads };
  };
  const rulesOf = (W) => {
    const out = [];
    const walk = (list, media) => {
      for (const r of Array.from(list || [])) {
        if (r.type === 1) out.push({ sel: r.selectorText, style: r.style, media });
        else if (r.cssRules) walk(r.cssRules, (r.media && r.media.mediaText) || r.conditionText || media);
      }
    };
    for (const sh of Array.from(W.document.styleSheets)) { try { walk(sh.cssRules, ''); } catch (e) {} }
    return out;
  };
  const matching = (rules, el, prop) => rules.filter((r) => {
    if (r.media) return false;
    let m = false;
    try { m = el.matches(r.sel); } catch (e) { m = false; }
    return m && !!r.style.getPropertyValue(prop);
  }).map((r) => r.style.getPropertyValue(prop).trim());
  const micro = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

  console.log('★ Session 4 re-walk fixes — #1151 (A-FADE · A-EDGE 3 px)');

  /* one open, both orders: 'before' = C# pushes setFileThumb BEFORE the history paints (Android), 'after' = the rows paint
     first and the preview lands later (Windows) */
  const open = async (order) => {
    const { W, push, errs, reads } = await boot();
    const d = W.document;
    const tileOf = (id) => d.querySelector('#messages [data-msgid="' + id + '"] .c-mbubble');
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');   // (not bursting yet: queues the rAF render the Android trace saw re-build the tile)
    push('clearMessages', 'false');
    push('addFile', 'q1', 'addrPeer', 'Me', '', 'fq1', 'IMG_q1.jpg', String(T0), 'True', 'True', 'True', '100', 'True', 'False', 'True');
    if (order === 'before') push('setFileThumb', 'q1', JPEG);
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    const rules = rulesOf(W);
    const r = {};
    const img = (t) => t && t.querySelector('.c-mbubble__img');
    if (order === 'after') {
      await sleep(40);   // the rows reach a frame without a picture
      push('setFileThumb', 'q1', JPEG);
    }
    let t = tileOf('q1');
    /* the tile is BUILT (or handed its picture) NOT loaded: its first style is the loading one, opacity 0 */
    r.builtNotLoaded = !!t && t.dataset.state === 'loading' && !t.hasAttribute('data-seen') && matching(rules, img(t), 'opacity').pop() === '0';
    /* the picture's load lands BEFORE any frame (Android: the stage is held) — still not loaded in that task, nor after
       its microtasks (img.decode) */
    img(t).dispatchEvent(new W.Event('load'));
    r.loadTaskNotLoaded = t.dataset.state === 'loading';
    await micro();
    r.decodeNotLoaded = t.dataset.state === 'loading';
    await sleep(40);   // the first frame(s)
    /* a re-render in that frame (the queued rAF render) re-builds the tile: a picture that never reached a frame is NOT
       "seen" — the new tile loads and fades too, never shown at once */
    const cur = tileOf('q1');
    r.rebuiltNotSeen = !cur.hasAttribute('data-seen');
    if (cur !== t) {
      r.rebuiltNotLoaded = cur.dataset.state === 'loading';
      t = cur;
      img(t).dispatchEvent(new W.Event('load'));
      r.rebuiltLoadTaskNotLoaded = t.dataset.state === 'loading';
      await sleep(40);
    }
    /* the flip: loaded in a frame, after a style read of the SAME tile in its loading state (the transition's start) */
    const tileReads = reads.filter((x) => x.el === t);
    r.loadedInFrame = t.dataset.state === 'loaded' && !t.hasAttribute('data-seen');
    r.styleAtZeroFirst = tileReads.length > 0 && tileReads[0].state === 'loading';
    r.fades = matching(rules, img(t), 'transition').pop() === 'opacity var(--duration-200) var(--easing-standard)' && matching(rules, img(t), 'opacity').pop() === '1';
    /* the r3 re-show stays: a re-render AFTER the picture was shown re-builds the tile loaded at once (data-seen, no fade) */
    push('addThem', 'q7', 'addrPeer', 'Bob', '', 'another line', String(T0 + 10));
    await sleep(60);
    const re = tileOf('q1');
    r.reshowInstant = re !== t && re.dataset.state === 'loaded' && re.hasAttribute('data-seen');
    r.noErr = errs.length === 0;
    if (errs.length) r.errs = errs.slice(0, 2);
    return r;
  };
  for (const order of ['before', 'after']) {
    const r = await open(order);
    ok(Object.values(r).every((v) => v === true),
      '★★ #1151 A-FADE (Android walk: "flips from the solid ground to the photo, no fade") — thumb ' + order.toUpperCase() + ' the row: the tile is built / handed its picture in the LOADING state (opacity 0); a load that lands before any frame does not flip it in that task or its decode microtasks; it flips to loaded in the next frame AFTER its opacity-0 style was read (the --duration-200 transition runs from 0); a tile re-built before its picture reached a frame is not "seen" (it fades, never pops); a re-render after the show stays instant (r3) — ' + JSON.stringify(r));
  }

  /* —— A-EDGE: the photo-tile frame is 3 px on both sides (Damir: "2 px reads as 1 px on the phone"), source + shipped —— */
  {
    const mb = stripCssComments(rd('src/styles/components/media-bubble.css'));
    const built = rd('Spixi/Resources/Raw/html/chat.html');
    const { W, push } = await boot();
    const d = W.document;
    push('onChatScreenReady', 'addrPeer');
    push('setChatMode', '0', '0', '', 'False');
    push('setPhotoPreviews', 'True');
    push('clearMessages', 'false');
    push('addFile', 'e1', 'addrPeer', 'Bob', '', 'fe1', 'IMG_e1.jpg', String(T0), 'False', 'False', 'False', '100', 'True', 'False', 'True');
    push('addFile', 'e2', 'addrPeer', 'Me', '', 'fe2', 'IMG_e2.jpg', String(T0 + 1), 'True', 'True', 'True', '100', 'True', 'False', 'True');
    if (typeof W.messagesDone === 'function') push('messagesDone');
    await sleep(40);
    const rules = rulesOf(W);
    const tile = (id) => d.querySelector('#messages [data-msgid="' + id + '"] .c-mbubble');
    /* the WINNING border on each live tile (the last matching rule, specificity order is source order here) */
    const r = {
      recv: matching(rules, tile('e1'), 'border').pop() === '3px solid var(--surface-bubble-received)',
      sent: matching(rules, tile('e2'), 'border').pop() === '3px solid var(--surface-bubble-sent)',
      noTwoPx: !/\.c-mbubble\[data-file\][^{]*\{[^}]*border:\s*2px/.test(mb),
      shipped: built.includes('border: 3px solid var(--surface-bubble-received);') && built.includes('border: 3px solid var(--surface-bubble-sent); box-shadow: var(--bubble-elevation);'),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1151 A-EDGE (Damir: "a 2 px frame reads as 1 px on the phone"): a photo-file tile is framed 3 px on BOTH sides — received in --surface-bubble-received, mine in --surface-bubble-sent — on the live tiles of the built chat shell (desktop + mobile: one rule, no media query) — ' + JSON.stringify(r));
  }
}
