/* ==== SESSION 6b — ★ #1198 REPLY (S6): the shell half of the reply feature, EXECUTED on the BUILT chat.html (jsdom;
 * C# pushes via executeUiCommand; outgoing ixian: commands captured at the Location href setter).
 *   · setCaps gates: no `reply` → no Reply item, no swipe, no hover button · `reply` → Reply on a text row, a file card
 *     and a payment card (the composer strip, the input focused, ixian:chatreply:<id>:<enc> on send)
 *   · the phone swipe (touch pointer events): 80 px right = the strip · a vertical scroll = nothing · a press from the
 *     left 24 px edge = nothing · a swipe never opens the long-press menu (the timer, nor Android's contextmenu)
 *   · desktop: the hover button (a real <button> "Reply") + its click = the strip · a double-click on the text = the
 *     strip and its second mousedown is prevented (no word selection) · a double-click on a link = nothing
 *   · the quote: a LOADED target renders from the row, its tap jumps (scrollIntoView on the target + the pulse) · an
 *     UNLOADED target renders from args 15/16 (name + excerpt, the kind glyph from the leading emoji), its tap sends
 *     EXACTLY ixian:quotejump:<id> · quoteName / quoteText are TEXT (an <img onerror> payload stays text, nothing runs)
 *     · a target with no quote args = no quote · an old 13-arg addMe still renders
 * Deliberate breaks: see the hand-back (each named key went red, restored green). */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const NOW = Math.floor(Date.now() / 1000);
  const T0 = NOW - 3600;

  const boot = async ({ desktop = true } = {}) => {
    const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
    const errs = [];
    const sent = [];
    const scrolled = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f + (desktop ? '' : '?mobile=1'), virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () { scrolled.push(this); };
        w.__xss = 0;
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + f; }, set(v) { const c = String(v); if (/^ixian:/.test(c)) sent.push(c); } });
      },
    });
    await sleep(1600);
    const W = dom.window;
    const d = W.document;
    if (desktop) d.documentElement.setAttribute('data-desktop', ''); else d.documentElement.removeAttribute('data-desktop');
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    return { dom, W, d, push, errs, sent, scrolled };
  };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
  const pev = (W, type, { x = 100, y = 100, kind = 'touch', button = 0, id, primary = true } = {}) => {
    const pid = id || (kind === 'mouse' ? 1 : 7);
    const init = { bubbles: true, cancelable: true, clientX: x, clientY: y, button, pointerType: kind, pointerId: pid, isPrimary: primary };
    const e = typeof W.PointerEvent === 'function' ? new W.PointerEvent(type, init) : new W.MouseEvent(type, init);
    if (e.pointerType !== kind) Object.defineProperty(e, 'pointerType', { value: kind });
    if (e.pointerId !== pid) Object.defineProperty(e, 'pointerId', { value: pid });
    if (e.isPrimary !== primary) Object.defineProperty(e, 'isPrimary', { value: primary });
    return e;
  };
  const guard = async (label, fn) => { try { await fn(); } catch (e) { ok(false, label + ' THREW: ' + (e && e.stack || e)); } };
  const closeAll = (W) => { for (let i = 0; i < 4; i++) { try { if (!W.Spixi.dismissTopOverlay()) break; } catch (e) { break; } } };
  const rowOf = (d, id) => d.querySelector('#messages [data-msgid="' + id + '"]');
  const strip = (d) => d.querySelector('.c-composer__ctx');
  const input = (d) => d.querySelector('.c-composer__input');
  const cancelCtx = async (d) => { const x = d.querySelector('.c-composer__ctx-cancel'); if (x) x.click(); await sleep(20); };
  /* open the long-press menu with a mouse right click (the desktop path; the same openMessageMenu) and return its items */
  const menuItems = async (W, d, id) => {
    const r = rowOf(d, id);
    const t = r && (r.querySelector('.c-bubble, .c-tcard, .c-fbubble, .c-mbubble') || r);
    if (!t) return [];
    t.dispatchEvent(pev(W, 'pointerdown', { kind: 'mouse', button: 2 }));
    t.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await sleep(60);
    const sheets = [...d.querySelectorAll('.c-msgmenu')];
    const m = sheets[sheets.length - 1];
    return m ? [...m.querySelectorAll('.c-msgmenu__item')] : [];
  };
  const pick = async (W, d, id, label) => {
    const items = await menuItems(W, d, id);
    const it = items.find((b) => b.textContent.trim() === label);
    if (it) it.click();
    await sleep(60);
    closeAll(W);
    await sleep(20);
    return !!it;
  };
  const labels = async (W, d, id) => { const l = (await menuItems(W, d, id)).map((b) => b.textContent.trim()); closeAll(W); await sleep(650); return l; };

  /* a 1:1 chat with a received text, my text, a received file card, a received payment card and a link text */
  const open = async (opts = {}) => {
    const s = await boot(opts);
    s.push('onChatScreenReady', 'addrPeer');
    s.push('setChatMode', '0', '0', '', 'False');
    if (opts.caps) s.push('setCaps', opts.caps);
    s.push('clearMessages', 'false');
    s.push('addThem', 'aa01', 'addrPeer', 'Bob', '', 'hello from Bob', String(T0), 'True', 'True', 'True', 'False', 'False');
    s.push('addMe', 'aa02', 'addrMe', 'Me', '', 'my own words', String(T0 + 60), 'True', 'True', 'True', 'False', 'False');
    s.push('addFile', 'aa03', 'addrPeer', 'Bob', '', 'f03', 'report.pdf', String(T0 + 120), 'False', 'True', 'False', '100', 'True', 'False', 'True', '', '1');
    s.push('addPaymentRequest', 'aa04', 'tx04', 'addrPeer', 'Bob', '', 'Payment', '10', 'Pending', '', String(T0 + 180), 'False', 'True', 'True', 'False', 'payment', '1', '', '');
    s.push('addThem', 'aa05', 'addrPeer', 'Bob', '', 'see https://example.com now', String(T0 + 240), 'True', 'True', 'True', 'False', 'False');
    if (typeof s.W.messagesDone === 'function') s.push('messagesDone');
    s.push('onChatScreenLoaded');
    await sleep(350);
    return s;
  };

  /* ——— 1. the capability gate + the menu Reply on a text, a file card and a payment card ——— */
  await guard('#1198 menu', async () => {
    const r = {};
    {
      const s = await open({ caps: 'tipResult' });
      const { W, d } = s;
      r.rowsRendered = ['aa01', 'aa02', 'aa03', 'aa04', 'aa05'].every((id) => !!rowOf(d, id));
      r.offNoItem = !(await labels(W, d, 'aa01')).includes('Reply');
      r.offNoButton = !d.querySelector('.c-bubble-row__reply');
      const t = rowOf(d, 'aa01');
      t.dispatchEvent(pev(W, 'pointerdown', { x: 100 })); t.dispatchEvent(pev(W, 'pointermove', { x: 190 })); t.dispatchEvent(pev(W, 'pointerup', { x: 190 }));
      await sleep(30);
      r.offNoSwipe = !strip(d);
      r.offNoTouchAction = !rowOf(d, 'aa01').hasAttribute('data-swipe-reply');   // ★ r1 (N-2): nothing wired without `reply`
      const md0 = new W.MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 2, button: 0 });
      rowOf(d, 'aa01').querySelector('.c-bubble__text').dispatchEvent(md0);
      r.offDblFree = !md0.defaultPrevented;
      r.offNoErr = noErr(s.errs);
      s.dom.window.close();
    }
    {
      const s = await open({ caps: 'tipResult,reply' });
      const { W, d } = s;
      r.onItem = (await labels(W, d, 'aa01')).includes('Reply');
      r.textPicked = await pick(W, d, 'aa01', 'Reply');
      const st = strip(d);
      r.textStrip = !!st && st.dataset.kind === 'reply' && /hello from Bob/.test(st.textContent);
      r.focusInput = d.activeElement === input(d);
      input(d).value = 'my answer';
      input(d).dispatchEvent(new W.Event('input'));
      d.querySelector('.c-composer__action').click();
      await sleep(30);
      r.sendExact = s.sent.includes('ixian:chatreply:aa01:' + encodeURIComponent('my answer'));
      r.stripGoneAfterSend = !strip(d);
      r.filePicked = await pick(W, d, 'aa03', 'Reply');
      r.fileStrip = !!strip(d) && /report\.pdf/.test(strip(d).textContent);
      await cancelCtx(d);
      r.payPicked = await pick(W, d, 'aa04', 'Reply');
      r.payStrip = !!strip(d) && strip(d).dataset.kind === 'reply';
      d.querySelector('.c-composer__ctx-cancel').focus();
      await cancelCtx(d);
      r.cancelFocusesInput = !strip(d) && d.activeElement === input(d);   // ★ r1 (B-8)
      r.ownPicked = await pick(W, d, 'aa02', 'Reply');
      r.ownStrip = !!strip(d) && /my own words/.test(strip(d).textContent);
      await cancelCtx(d);
      r.onNoErr = noErr(s.errs);
      s.dom.window.close();
    }
    ok(Object.values(r).every((x) => x === true),
      '★★ #1198 REPLY (menu + gate) on the built chat shell: with no setCaps `reply` the menu has no Reply, no hover button exists, a swipe does nothing and nothing is wired (no touch-action mark, no double-click preventDefault — r1 N-2); ✕ on the strip returns focus to the input (r1 B-8); with `reply` the menu offers Reply on a received text, my own text, a received FILE card and a PAYMENT card — each opens the composer reply strip (the input focused), and a send leaves EXACTLY ixian:chatreply:<id>:<urlenc text> and closes the strip — ' + JSON.stringify(r));
  });

  /* ——— 2. the phone swipe (touch pointer events) ——— */
  await guard('#1198 swipe', async () => {
    const s = await open({ caps: 'reply', desktop: false });
    const { W, d } = s;
    const r = {};
    const menus = () => d.querySelectorAll('.c-msgmenu').length;
    const node = () => rowOf(d, 'aa01').querySelector('.c-bubble');
    r.mobileNoButton = !d.querySelector('.c-bubble-row__reply');
    /* a. 80 px right → the strip; the row followed the finger (≤ 72 px) and springs back; no menu, ever */
    let n = node();
    const m0 = menus();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 130, y: 202 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 180, y: 203 }));
    const row = rowOf(d, 'aa01');
    r.follows = row.hasAttribute('data-reply-swipe') && row.style.getPropertyValue('--reply-swipe-x') === '70px' && !!row.querySelector('.c-reply-swipe') && row.hasAttribute('data-reply-armed');   // ★ 7b (#1219) re-base: the paint is dx − the 10 px engage slop (80 → 70)
    n.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));   // Android's own long-press over the moved press
    n.dispatchEvent(pev(W, 'pointerup', { x: 180, y: 203 }));
    await sleep(30);
    r.swipeStrip = !!strip(d) && /hello from Bob/.test(strip(d).textContent);
    r.swipeFocus = d.activeElement === input(d);
    await sleep(650);
    r.noMenu = menus() === m0;
    r.springsBack = !row.hasAttribute('data-reply-swipe') && !row.querySelector('.c-reply-swipe');
    await cancelCtx(d);
    /* b. a vertical scroll (pan) → nothing, for the WHOLE press: the finger goes down 30 px first, then sweeps 100 px
          right (a shape that would arm a swipe from a fresh press) — no follow, no strip */
    n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 104, y: 230 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 200, y: 232 }));
    r.scrollNoFollow = !rowOf(d, 'aa01').hasAttribute('data-reply-swipe');
    n.dispatchEvent(pev(W, 'pointerup', { x: 200, y: 232 }));
    await sleep(30);
    r.scrollNoStrip = !strip(d);
    /* c. from the left 24 px edge (the edge-back strip) → nothing */
    n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 10, y: 200 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 100, y: 201 }));
    n.dispatchEvent(pev(W, 'pointerup', { x: 100, y: 201 }));
    await sleep(30);
    r.edgeNoStrip = !strip(d);
    /* d. short of the trigger (40 px) → nothing; a browser pan (pointercancel) after 80 px → nothing */
    n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 140, y: 200 }));
    n.dispatchEvent(pev(W, 'pointerup', { x: 140, y: 200 }));
    await sleep(30);
    r.shortNoStrip = !strip(d);
    n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 180, y: 200 }));
    n.dispatchEvent(pev(W, 'pointercancel', { x: 180, y: 200 }));
    await sleep(30);
    r.cancelNoStrip = !strip(d);
    /* e. a MOUSE drag is a selection, never a reply */
    n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200, kind: 'mouse' }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 190, y: 200, kind: 'mouse' }));
    n.dispatchEvent(pev(W, 'pointerup', { x: 190, y: 200, kind: 'mouse' }));
    await sleep(30);
    r.mouseNoStrip = !strip(d);
    /* f. a still press still opens the long-press menu (the swipe took nothing from it) */
    n = node();
    const m1 = menus();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200 }));
    await sleep(600);
    n.dispatchEvent(pev(W, 'pointerup', { x: 100, y: 200 }));
    r.stillMenu = menus() === m1 + 1;
    closeAll(W);
    /* g. the swipe works on a FILE card row too */
    await sleep(650);
    const fn = rowOf(d, 'aa03').querySelector('.c-fbubble, .c-mbubble, .c-tcard') || rowOf(d, 'aa03');
    fn.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 300 }));
    fn.dispatchEvent(pev(W, 'pointermove', { x: 185, y: 301 }));
    fn.dispatchEvent(pev(W, 'pointerup', { x: 185, y: 301 }));
    const sentBefore = s.sent.length;
    fn.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true }));   // the click a browser may raise after the release
    await sleep(30);
    r.fileSwipe = !!strip(d) && /report\.pdf/.test(strip(d).textContent);
    r.releaseClickSwallowed = !s.sent.slice(sentBefore).some((c) => /^ixian:(openfile|acceptfile|viewImage)/.test(c));
    /* …and a plain tap on the same card later still opens it (the guard is one click, ~400 ms) */
    await sleep(450);
    const sentBefore2 = s.sent.length;
    (rowOf(d, 'aa03').querySelector('.c-fbubble button, .c-fbubble, .c-mbubble') || fn).dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true }));
    await sleep(30);
    r.laterTapOpens = s.sent.slice(sentBefore2).some((c) => /^ixian:(openfile|acceptfile|viewImage)/.test(c));
    /* ★ r1 (N-3): a press AT exactly 24 px is the edge-back's alone */
    await cancelCtx(d);
    n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 24, y: 200 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 120, y: 201 }));
    n.dispatchEvent(pev(W, 'pointerup', { x: 120, y: 201 }));
    await sleep(30);
    r.edge24NoStrip = !strip(d);
    /* ★ r1 (B-6): a SECOND finger stands the swipe down (mid-swipe), and no swipe starts while another finger is down */
    n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200, id: 7 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 140, y: 200, id: 7 }));
    d.body.dispatchEvent(pev(W, 'pointerdown', { x: 300, y: 400, id: 8, primary: false }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 190, y: 200, id: 7 }));
    n.dispatchEvent(pev(W, 'pointerup', { x: 190, y: 200, id: 7 }));
    d.body.dispatchEvent(pev(W, 'pointerup', { x: 300, y: 400, id: 8 }));
    await sleep(30);
    r.secondFingerStandsDown = !strip(d);
    d.body.dispatchEvent(pev(W, 'pointerdown', { x: 300, y: 400, id: 9 }));   // a finger already down…
    n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200, id: 10, primary: false }));       // …then the swipe finger
    n.dispatchEvent(pev(W, 'pointermove', { x: 190, y: 200, id: 10 }));
    n.dispatchEvent(pev(W, 'pointerup', { x: 190, y: 200, id: 10 }));
    d.body.dispatchEvent(pev(W, 'pointerup', { x: 300, y: 400, id: 9 }));
    await sleep(30);
    r.twoDownNoStart = !strip(d);
    /* ★ r2 (MINOR-4) SELF-HEAL: a finger whose pointerup was LOST stays in the set — the next PRIMARY press clears it, so
       swipes keep working */
    d.body.dispatchEvent(pev(W, 'pointerdown', { x: 300, y: 400, id: 40 }));   // never released
    n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200, id: 41 }));         // primary: nothing else is really down
    n.dispatchEvent(pev(W, 'pointermove', { x: 185, y: 200, id: 41 }));
    n.dispatchEvent(pev(W, 'pointerup', { x: 185, y: 200, id: 41 }));
    await sleep(30);
    r.selfHeals = !!strip(d);
    await cancelCtx(d);
    /* ★ r1 (B-9): the row is REBUILT mid-swipe (a live message → renderLogNow) — the replacement takes the swipe over
       (it follows, the release replies) and nothing is left painted afterwards */
    n = node();
    const oldRow = rowOf(d, 'aa01');
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 130, y: 200 }));
    s.push('addThem', 'aa07', 'addrPeer', 'Bob', '', 'arrives mid-swipe', String(NOW - 3), 'True', 'True', 'True', 'False', 'False');
    await sleep(120);
    const newRow = rowOf(d, 'aa01');
    r.rebuilt = !!newRow && newRow !== oldRow && !oldRow.isConnected;
    d.dispatchEvent(pev(W, 'pointermove', { x: 185, y: 201 }));                // the finger keeps moving (captured to the document)
    r.replacementFollows = newRow.hasAttribute('data-reply-swipe') && newRow.hasAttribute('data-reply-armed');
    d.dispatchEvent(pev(W, 'pointerup', { x: 185, y: 201 }));
    await sleep(30);
    r.rebuildStillReplies = !!strip(d) && /hello from Bob/.test(strip(d).textContent);
    await sleep(250);
    r.rebuildCleanAfter = !rowOf(d, 'aa01').hasAttribute('data-reply-swipe') && !rowOf(d, 'aa01').querySelector('.c-reply-swipe');
    await cancelCtx(d);
    /* ★ r1 (N-1): selection mode opening MID-swipe stands it down (checked on move, not only at the press) */
    n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 130, y: 200 }));
    d.getElementById('messages').setAttribute('data-selecting', '');
    n.dispatchEvent(pev(W, 'pointermove', { x: 190, y: 200 }));
    d.getElementById('messages').removeAttribute('data-selecting');   // gone again BEFORE the release: only the MOVE saw it
    n.dispatchEvent(pev(W, 'pointerup', { x: 190, y: 200 }));
    await sleep(30);
    r.blockedMidSwipe = !strip(d);
    /* h. reduced motion: the row does NOT follow the finger, the action alone */
    await cancelCtx(d);
    const mm = W.matchMedia;
    W.matchMedia = (q) => ({ matches: /prefers-reduced-motion: reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100, y: 200 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 185, y: 201 }));
    const rr = rowOf(d, 'aa01');
    r.reducedNoFollow = ['', '0px'].includes(rr.style.getPropertyValue('--reply-swipe-x').trim());   // never the finger's 85 px
    n.dispatchEvent(pev(W, 'pointerup', { x: 185, y: 201 }));
    await sleep(30);
    r.reducedStillReplies = !!strip(d) && /hello from Bob/.test(strip(d).textContent);
    W.matchMedia = mm;
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ #1198 REPLY SWIPE (phone, touch pointer events; r2: a lost pointerup self-heals at the next primary press) on the built chat shell: 80 px right = the reply strip (the row follows to 72 px with the glyph, arms, springs back; the input focused) and NO long-press menu (Android\'s contextmenu over the moved press is void, the timer never fires); a vertical scroll, a press from the left 24 px edge, 40 px, a pointercancel and a MOUSE drag = nothing; a still press still opens the menu; a file card row swipes too (and the click the browser raises after the release opens nothing, a later tap still opens); reduced motion = no follow, the reply alone; no hover button on a phone; r1: a press AT 24 px = nothing (N-3), a second finger stands the swipe down and none starts with two fingers down (B-6), a row REBUILT mid-swipe hands the swipe to its replacement and nothing stays painted (B-9), selection mode opening mid-swipe stands it down (N-1) — ' + JSON.stringify(r));
    s.dom.window.close();
  });

  /* ——— 3. desktop: the hover button + the double-click; the button survives a row REPLACED under the mouse ——— */
  await guard('#1198 desktop', async () => {
    const s = await open({ caps: 'reply,resend', desktop: true });
    const { W, d, push } = s;
    const r = {};
    const btnOf = (id) => rowOf(d, id) && rowOf(d, id).querySelector(':scope > .c-bubble-row__reply');
    const b = btnOf('aa01');
    r.button = !!b && b.tagName === 'BUTTON' && b.type === 'button' && b.getAttribute('aria-label') === 'Reply to Bob';   // ★ r1 (B-7): names the message
    r.ownLabel = (btnOf('aa02') || { getAttribute: () => '' }).getAttribute('aria-label') === 'Reply to You';
    /* ★ r2 (MINOR-3) THE LOG IS ONE TAB STOP: the current row (default the NEWEST, aa05) is the only tabbable row, #messages
       itself is not a stop while it holds rows, only the current row's controls (its link, its reply button) are tabbable */
    const msgRows = () => [...d.querySelectorAll('#messages > [data-msgid]')];
    const tabbableRows = () => msgRows().filter((x) => x.tabIndex === 0).map((x) => x.dataset.msgid);
    const lk = rowOf(d, 'aa05').querySelector('.c-bubble__link');
    r.oneStopNewest = d.getElementById('messages').tabIndex === -1 && JSON.stringify(tabbableRows()) === '["aa05"]'
      && [...d.querySelectorAll('.c-bubble-row__reply')].filter((x) => x.tabIndex === 0).length === 1 && btnOf('aa05').tabIndex === 0
      && lk.tabIndex === 0;
    /* focus moves the current row: the old row's controls leave the Tab order, the new row's join it */
    rowOf(d, 'aa02').focus();
    r.roveMoves = JSON.stringify(tabbableRows()) === '["aa02"]' && lk.tabIndex === -1 && btnOf('aa05').tabIndex === -1 && btnOf('aa02').tabIndex === 0;
    /* ArrowUp / ArrowDown / Home / End move the focused row */
    const key = (el, k) => el.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    key(d.activeElement, 'ArrowUp');
    r.arrowUp = d.activeElement === rowOf(d, 'aa01');
    key(d.activeElement, 'ArrowDown');
    r.arrowDown = d.activeElement === rowOf(d, 'aa02');
    key(d.activeElement, 'End');
    r.end = d.activeElement === rowOf(d, 'aa05') && JSON.stringify(tabbableRows()) === '["aa05"]' && lk.tabIndex === 0;
    key(d.activeElement, 'Home');
    r.home = d.activeElement === msgRows()[0];
    /* the ContextMenu key opens the menu for the FOCUSED row, not the newest */
    rowOf(d, 'aa02').focus();
    const menusBefore = d.querySelectorAll('.c-msgmenu').length;
    key(d.activeElement, 'ContextMenu');
    await sleep(60);
    r.menuForFocused = d.querySelectorAll('.c-msgmenu').length === menusBefore + 1
      && !!rowOf(d, 'aa02').querySelector('[data-menu-target]') && !rowOf(d, 'aa05').querySelector('[data-menu-target]');
    closeAll(W);
    await sleep(650);
    /* a rebuild keeps the focused row focused (the replacement node) and current */
    rowOf(d, 'aa02').focus();
    const before = rowOf(d, 'aa02');
    push('addThem', 'aa09', 'addrPeer', 'Bob', '', 'rebuild while focused', String(NOW - 6), 'True', 'True', 'True', 'False', 'False');
    await sleep(120);
    r.focusCarried = rowOf(d, 'aa02') !== before && d.activeElement === rowOf(d, 'aa02') && rowOf(d, 'aa02').tabIndex === 0;
    /* selection mode owns the rows' tabindex; at its exit the roving row comes back (one tabbable row again) */
    const picked = await pick(W, d, 'aa02', 'Select');
    const selOn = picked && d.getElementById('messages').hasAttribute('data-selecting');
    (d.querySelector('.c-chatselect-bar__cancel') || { click() {} }).click();
    await sleep(60);
    r.selectExitRoves = selOn && !d.getElementById('messages').hasAttribute('data-selecting') && tabbableRows().length === 1;
    input(d).focus();
    /* ★ r1 (B-1 MAJOR): a FAILED send keeps its Retry circle clickable — no hover button on that row */
    push('addMe', 'aa08', 'addrMe', 'Me', '', 'did not go', String(NOW - 4), 'False', 'False', 'False', 'False', 'True');
    await sleep(120);
    r.failedNoButton = !!rowOf(d, 'aa08') && !!rowOf(d, 'aa08').querySelector('.c-bubble-retry') && !btnOf('aa08');
    /* ★ r2 NIT: the row LEAVES failed (a status push) → it restructures: Retry gone, the hover button there */
    push('updateMessage', 'aa08', 'did not go', 'True', 'True', 'False', 'False', 'False');
    await sleep(120);
    r.leftFailedGainsButton = !rowOf(d, 'aa08').querySelector('.c-bubble-retry') && !!btnOf('aa08');
    r.everyKind = ['aa01', 'aa02', 'aa03', 'aa04', 'aa05'].every((id) => !!btnOf(id));
    b.click();
    await sleep(30);
    r.buttonStrip = !!strip(d) && /hello from Bob/.test(strip(d).textContent);
    r.buttonFocus = d.activeElement === input(d);
    await cancelCtx(d);
    /* the hover carry: the mouse on row aa02, a live message re-renders every row → the NEW aa02 row is data-hover */
    const r2 = rowOf(d, 'aa02');
    r2.querySelector('.c-bubble').dispatchEvent(pev(W, 'pointerover', { kind: 'mouse' }));
    r.marked = r2.hasAttribute('data-hover');
    push('addThem', 'aa06', 'addrPeer', 'Bob', '', 'a live one', String(NOW - 5), 'True', 'True', 'True', 'False', 'False');
    await sleep(120);
    const r2b = rowOf(d, 'aa02');
    r.replaced = !!r2b && r2b !== r2;
    r.carried = !!r2b && r2b.hasAttribute('data-hover') && !!btnOf('aa02');
    r.oneMark = d.querySelectorAll('#messages [data-hover]').length === 1;
    d.getElementById('messages').dispatchEvent(new (W.PointerEvent || W.MouseEvent)('pointerleave', { pointerType: 'mouse' }));
    r.leaveClears = !d.querySelector('#messages [data-hover]');
    /* the double-click on the TEXT: the second mousedown is prevented (no word selection), the dblclick = the strip */
    const txt = rowOf(d, 'aa01').querySelector('.c-bubble__text');
    const md1 = new W.MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 1, button: 0 });
    txt.dispatchEvent(md1);
    const md2 = new W.MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 2, button: 0 });
    txt.dispatchEvent(md2);
    r.firstMousedownFree = !md1.defaultPrevented;
    r.secondMousedownPrevented = md2.defaultPrevented;
    txt.dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2, button: 0 }));
    await sleep(30);
    r.dblStrip = !!strip(d) && /hello from Bob/.test(strip(d).textContent);
    await cancelCtx(d);
    /* a double-click on a LINK = nothing, and its mousedown is not prevented */
    const link = rowOf(d, 'aa05').querySelector('.c-bubble__link');
    const md3 = new W.MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 2, button: 0 });
    link.dispatchEvent(md3);
    link.dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2, button: 0 }));
    await sleep(30);
    r.linkNoStrip = !strip(d) && !md3.defaultPrevented;
    /* ★ r1 (N-4): only the pair's SECOND mousedown is prevented — a triple-click still selects the line */
    const md4 = new W.MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 3, button: 0 });
    txt.dispatchEvent(md4);
    r.tripleFree = !md4.defaultPrevented;
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ #1198 REPLY on DESKTOP (data-desktop) on the built chat shell: every menuable row carries a real <button aria-label="Reply">, its click = the strip (the input focused); the row under the mouse keeps its hover mark across a live re-render (the #1184 carry: the replacement row is data-hover, one mark, cleared on leave); a double-click on the bubble text = the strip and ONLY its second mousedown is prevented (no word selection); a double-click on a link = nothing; r1: the button is named "Reply to <sender>", is not a Tab stop of its own; r2: the LOG is one Tab stop — the newest row by default, focus / ArrowUp / ArrowDown / Home / End rove it and only the current row\'s controls stay in the Tab order, the ContextMenu key opens the FOCUSED row\'s menu, a rebuild keeps the focused row focused; a FAILED send row has no button (Retry stays clickable, B-1) and gains it when it leaves failed, a triple-click is not prevented (N-4) — ' + JSON.stringify(r));
    s.dom.window.close();
  });

  /* ——— 4. the quote: loaded target (jump) · unloaded target from args 15/16 (quotejump) · text-only · none · 13 args ——— */
  await guard('#1198 quote', async () => {
    const s = await open({ caps: 'reply' });
    const { W, d, push } = s;
    const r = {};
    const quoteOf = (id) => rowOf(d, id) && rowOf(d, id).querySelector('.c-bubble__reply');
    /* a. a reply to a LOADED target (aa01) — the quote from the row, tap = the jump */
    push('addMe', 'bb01', 'addrMe', 'Me', '', 'answering you', String(NOW - 50), 'True', 'True', 'True', 'False', 'False', '', 'aa01', '', 'Bob', 'hello from Bob');
    await sleep(100);
    let q = quoteOf('bb01');
    r.loadedQuote = !!q && q.tagName === 'BUTTON' && /hello from Bob/.test(q.textContent);
    s.scrolled.length = 0;
    if (q) q.click();
    await sleep(50);
    r.loadedJumps = s.scrolled.includes(rowOf(d, 'aa01')) && !s.sent.some((c) => /^ixian:quotejump:/.test(c));
    /* b. a reply to an UNLOADED target — the quote from quoteName / quoteText; tap = EXACTLY ixian:quotejump:<id> */
    push('addThem', 'bb02', 'addrPeer', 'Bob', '', 'about that file', String(NOW - 40), 'True', 'True', 'True', 'False', 'False', '', 'c0ffee99', '', 'Ann', '📎 old-report.pdf');
    await sleep(100);
    q = quoteOf('bb02');
    r.fallbackQuote = !!q && q.tagName === 'BUTTON'
      && (q.querySelector('.c-bubble__reply-sender') || {}).textContent === 'Ann'
      && (q.querySelector('.c-bubble__reply-text') || {}).textContent === 'old-report.pdf'
      && !!q.querySelector('.c-bubble__reply-glyph');
    const before = s.sent.length;
    if (q) q.click();
    await sleep(50);
    const newSends = s.sent.slice(before);
    r.quotejumpExact = newSends.length === 1 && newSends[0] === 'ixian:quotejump:c0ffee99';
    /* a typed kind: the LOCALISED label, not C#'s neutral word */
    push('addThem', 'bb03', 'addrPeer', 'Bob', '', 'thanks for paying', String(NOW - 35), 'True', 'True', 'True', 'False', 'False', '', 'c0ffee98', '', 'Me', '💸 Payment');
    await sleep(100);
    q = quoteOf('bb03');
    r.typedKind = !!q && !!q.querySelector('.c-bubble__reply-glyph') && (q.querySelector('.c-bubble__reply-text') || {}).textContent === 'Payment';
    /* c. TEXT ONLY: an <img onerror> payload in quoteName / quoteText stays text, nothing runs */
    const evil = '<img src=x onerror="window.__xss=1">';
    push('addThem', 'bb04', 'addrPeer', 'Bob', '', 'hmm', String(NOW - 30), 'True', 'True', 'True', 'False', 'False', '', 'c0ffee97', '', evil, evil + ' and <b>bold</b>');
    await sleep(150);
    q = quoteOf('bb04');
    r.xssText = !!q && !q.querySelector('img, b') && (q.querySelector('.c-bubble__reply-sender') || {}).textContent === evil
      && (q.querySelector('.c-bubble__reply-text') || {}).textContent === evil + ' and <b>bold</b>';
    r.xssNotRun = W.__xss === 0 && !d.querySelector('#messages img[src="x"]');
    /* d. a target id with NO quote args (and not loaded) → no quote at all; a non-hex id with a quote → no quotejump */
    push('addThem', 'bb05', 'addrPeer', 'Bob', '', 'orphan', String(NOW - 25), 'True', 'True', 'True', 'False', 'False', '', 'c0ffee96', '', '', '');
    push('addThem', 'bb06', 'addrPeer', 'Bob', '', 'odd id', String(NOW - 20), 'True', 'True', 'True', 'False', 'False', '', 'zz:evil', '', 'Ann', 'a line');
    await sleep(100);
    r.noQuote = !!rowOf(d, 'bb05') && !quoteOf('bb05');
    q = quoteOf('bb06');
    const before2 = s.sent.length;
    if (q) q.click();
    await sleep(30);
    r.badIdNoJump = !!q && q.tagName !== 'BUTTON' && s.sent.length === before2;
    /* e. an OLD exe's 13-arg addMe still renders (no marker, no quote args) */
    push('addMe', 'bb07', 'addrMe', 'Me', '', 'old exe text', String(NOW - 10), 'True', 'True', 'True', 'False', 'False', '', '');
    await sleep(100);
    r.oldExe = !!rowOf(d, 'bb07') && /old exe text/.test(rowOf(d, 'bb07').textContent) && !rowOf(d, 'bb07').querySelector('.c-bubble__edited, .c-bubble__reply');
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ #1198 REPLY QUOTE on the built chat shell: a LOADED target quotes from its own row and the tap jumps to it (scrollIntoView on the target, no quotejump); an UNLOADED target quotes from addThem args 15/16 (name + excerpt; the leading 📎 / 💸 becomes the kind glyph, a typed kind shows the localised label) and its tap sends EXACTLY ixian:quotejump:<id>; quoteName / quoteText render as TEXT (an <img onerror> payload stays text and never runs); no quote args = no quote; a non-hex id never leaves; an old 13-arg addMe still renders — ' + JSON.stringify(r));
    s.dom.window.close();
  });

  /* ——— 5. r1 (B-7): a BLIND room's hover button never speaks an address ——— */
  await guard('#1198 r1 blind label', async () => {
    const s = await boot({ desktop: true });
    const { d, push } = s;
    const ADDR = 'BlindQpT7vKzm3NwR5bYc8LdE2fGh4JkPq9';
    push('onChatScreenReady', 'blindGroup');
    push('setChatMode', '2', '0', '', 'False', '', 'True', 'True');
    push('setCaps', 'reply');
    push('clearMessages', 'false');
    push('addThem', 'bl01', ADDR, ADDR, '', 'hello', String(T0), 'True', 'True', 'True', 'False', 'False');
    if (typeof s.W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    const b = rowOf(d, 'bl01') && rowOf(d, 'bl01').querySelector(':scope > .c-bubble-row__reply');
    const label = b ? b.getAttribute('aria-label') + ' ' + b.title : '';
    const r = { button: !!b, noAddress: !!b && !label.includes(ADDR) && !label.includes(ADDR.slice(0, 8)), noErr: noErr(s.errs) };
    ok(Object.values(r).every((x) => x === true),
      '★ #1198 r1 (B-7) in a BLIND room (type 2) the hover button\'s name never carries the sender\'s address (the strip\'s sender rule: "Hidden member" / a nick) — ' + JSON.stringify(r) + ' label=' + label);
    s.dom.window.close();
  });

  /* ——— 6. r1: the typed kind is EXACT (B-3, a non-English locale) · Damir P2 (no-jump box) · the explicit "" clears ·
         the quotejump wait (B-5) · the grapheme cap (C NIT) ——— */
  await guard('#1198 r1 quote', async () => {
    const s = await open({ caps: 'reply' });
    const { W, d, push } = s;
    const r = {};
    W.SL = Object.assign({}, W.SL || {}, { payment: 'Zahlung', app: 'Anwendung', call: 'Sprachanruf' });   // a German UI: the label is NOT the wire word
    const quoteOf = (id) => rowOf(d, id) && rowOf(d, id).querySelector('.c-bubble__reply');
    const textOf = (q) => (q && q.querySelector('.c-bubble__reply-text') || {}).textContent;
    push('addThem', 'cc01', 'addrPeer', 'Bob', '', 'paid?', String(NOW - 90), 'True', 'True', 'True', 'False', 'False', '', 'd00d01', '', 'Me', '💸 Payment');
    push('addThem', 'cc02', 'addrPeer', 'Bob', '', 'nice', String(NOW - 89), 'True', 'True', 'True', 'False', 'False', '', 'd00d02', '', 'Ann', '🚀 launching today');
    push('addThem', 'cc03', 'addrPeer', 'Bob', '', 'app?', String(NOW - 88), 'True', 'True', 'True', 'False', 'False', '', 'd00d03', '', 'Ann', '🚀 App');
    push('addThem', 'cc04', 'addrPeer', 'Bob', '', 'pic', String(NOW - 87), 'True', 'True', 'True', 'False', 'False', '', 'd00d04', '', 'Ann', '📷 IMG_1.jpg');
    await sleep(120);
    r.payLocalised = textOf(quoteOf('cc01')) === 'Zahlung' && !!quoteOf('cc01').querySelector('.c-bubble__reply-glyph');
    r.appLocalised = textOf(quoteOf('cc03')) === 'Anwendung';
    r.prefixTextStays = textOf(quoteOf('cc02')) === '🚀 launching today' && !quoteOf('cc02').querySelector('.c-bubble__reply-glyph');
    r.photoKeepsName = textOf(quoteOf('cc04')) === 'IMG_1.jpg' && !!quoteOf('cc04').querySelector('.c-bubble__reply-glyph');
    /* Damir P2: a valid quote line that matched NOTHING — replyTo "" + the line's own name / text → a box with NO tap */
    push('addThem', 'cc05', 'addrPeer', 'Bob', '', 'unmatched reply', String(NOW - 80), 'True', 'True', 'True', 'False', 'False', '', '', '', 'Ann', 'a line from long ago');
    await sleep(100);
    let q = quoteOf('cc05');
    const before = s.sent.length;
    if (q) q.click();
    await sleep(30);
    r.p2Box = !!q && q.tagName !== 'BUTTON' && textOf(q) === 'a line from long ago' && (q.querySelector('.c-bubble__reply-sender') || {}).textContent === 'Ann';
    r.p2NoJump = s.sent.length === before;
    /* the same through a full-form updateMessage (replyTo "" + quoteText) on a row that HAD a matched quote → no-jump box */
    push('addMe', 'cc06', 'addrMe', 'Me', '', 'mine', String(NOW - 70), 'True', 'True', 'True', 'False', 'False', '', 'd00d06', '', 'Bob', 'older words');
    await sleep(80);
    r.hadJump = !!quoteOf('cc06') && quoteOf('cc06').tagName === 'BUTTON';
    push('updateMessage', 'cc06', 'mine', 'True', 'True', 'True', 'False', 'False', '', '', 'Bob', 'older words');
    await sleep(80);
    r.updateNoJumpBox = !!quoteOf('cc06') && quoteOf('cc06').tagName !== 'BUTTON' && textOf(quoteOf('cc06')) === 'older words';
    /* C S2 / S3: the explicit "" for replyTo AND quoteText (full form) clears the quote */
    push('updateMessage', 'cc06', 'mine', 'True', 'True', 'True', 'False', 'False', '', '', '', '');
    await sleep(80);
    r.explicitEmptyClears = !!rowOf(d, 'cc06') && !quoteOf('cc06');
    /* B-5: a quotejump C# never answers → the jump path's "further back" toast after ~2 s; an answer cancels it */
    let farToasts = 0;   // every "further back" toast that APPEARS (a MutationObserver: a toast host may reuse or replace nodes)
    new W.MutationObserver((muts) => { for (const m of muts) for (const nd of m.addedNodes) if (nd.nodeType === 1 && /further back/.test(nd.textContent || '')) farToasts++; })
      .observe(d.body, { childList: true, subtree: true });
    q = quoteOf('cc01');
    q.click();
    await sleep(1200);
    r.noToastYet = farToasts === 0;
    await sleep(1100);
    r.toastAfterWait = farToasts >= 1;
    await sleep(4200);   // the first toast has left (3.5 s) — a second one would PRESENT, not queue
    const t1 = farToasts;
    q.click();
    await sleep(300);
    push('jumpToMessage', 'aa01');   // C# answered
    await sleep(2200);
    r.answerCancels = farToasts === t1;
    /* ★ r2 (MINOR-5): the widened LOAD a quotejump asked for (clearMessages, or an older-history prepend) cancels the wait */
    await sleep(4200);
    const t2 = farToasts;
    quoteOf('cc01').click();
    await sleep(300);
    push('addMessages', JSON.stringify({ strs: [], items: [{ f: 'addThem', a: ['pp01', 'addrPeer', 'Bob', '', 'older one', String(T0 - 9000), 'True', 'True', 'True', 'False', 'False'] }] }), 'prepend');
    if (typeof W.messagesDone === 'function') push('messagesDone');
    await sleep(2300);
    r.prependCancels = farToasts === t2;
    quoteOf('cc01').click();
    await sleep(300);
    push('clearMessages', 'false');
    await sleep(2300);
    r.clearCancels = farToasts === t2;
    /* C NIT: the cap cuts by grapheme — 150 emoji → 139 whole ones + "…", no lone surrogate */
    push('addThem', 'cc07', 'addrPeer', 'Bob', '', 'emoji', String(NOW - 10), 'True', 'True', 'True', 'False', 'False', '', 'd00d07', '', 'Ann', '😀'.repeat(150));
    await sleep(100);
    const et = textOf(quoteOf('cc07')) || '';
    /* ★ r2 NIT: the LOADED quote and the composer strip cut by grapheme too */
    push('addThem', 'cc08', 'addrPeer', 'Bob', '', '😀'.repeat(150), String(NOW - 9), 'True', 'True', 'True', 'False', 'False');
    push('addMe', 'cc09', 'addrMe', 'Me', '', 'to the emoji', String(NOW - 8), 'True', 'True', 'True', 'False', 'False', '', 'cc08', '', 'Bob', 'x');
    await sleep(120);
    const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/;
    const lq = textOf(quoteOf('cc09')) || '';
    r.loadedQuoteGrapheme = lq.endsWith('…') && !lone.test(lq);
    await pick(W, d, 'cc08', 'Reply');
    const stx = (d.querySelector('.c-composer__ctx-text') || {}).textContent || '';
    r.stripGrapheme = stx.endsWith('…') && !lone.test(stx);
    r.graphemeCap = Array.from(et).length === 140 && et.endsWith('…') && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(et);
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★★ #1198 r1 QUOTE on the built chat shell (a GERMAN label set): the typed kind is drawn ONLY on an exact wire excerpt ("💸 Payment" → "Zahlung", "🚀 App" → "Anwendung"); "🚀 launching today" stays text with no glyph; "📷 IMG_1.jpg" keeps its name with the glyph (B-3); Damir P2 — replyTo "" + quoteName/quoteText draws a box with NO tap and no send, also through a full-form updateMessage; the explicit "" for both clears the quote (C S2/S3); an unanswered quotejump shows the "further back" toast after ~2 s and a jumpToMessage cancels it (B-5), and so do the widened load\'s prepend and clearMessages (r2 MINOR-5); the excerpt cap cuts whole graphemes (C NIT) — ' + JSON.stringify(r));
    s.dom.window.close();
  });
}
