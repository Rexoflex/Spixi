/* ==== SESSION 6 — ★ #1174 SCROLL-SAFE LONG PRESS (Android): the platform `contextmenu` (Android WebView's OWN
 * long-press detector) no longer opens a menu for a TOUCH press that moved, was cancelled, or saw the list scroll —
 * the DOCUMENT-level press record in message-menu.js attachTouchPressGuard (#46 r1 F2: it survives a row replaced mid-press), shared by the message menu (chat.html), the chat-info
 * shared-items long press (contact_details.html) and the chats-row menu (index.html). A still press opens ONCE; a
 * mouse / pen right click keeps working. Behaviour on the BUILT shells (jsdom). Deliberate breaks: see the hand-back. */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const T0 = Math.floor(Date.now() / 1000) - 600;

  const boot = async (name, waitMs = 1800) => {
    const f = join(root, 'Spixi/Resources/Raw/html', name);
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
    await sleep(waitMs);
    const W = dom.window;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
    return { dom, W, d: W.document, push, errs };
  };
  /* a pointer event of a given pointerType: PointerEvent when jsdom has it, else a MouseEvent with pointerType defined */
  const pev = (W, type, { x = 5, y = 5, kind = 'touch', button = 0 } = {}) => {
    const init = { bubbles: true, cancelable: true, clientX: x, clientY: y, button, pointerType: kind, pointerId: kind === 'mouse' ? 1 : 7 };
    const e = typeof W.PointerEvent === 'function' ? new W.PointerEvent(type, init) : new W.MouseEvent(type, init);
    if (e.pointerType !== kind) Object.defineProperty(e, 'pointerType', { value: kind });
    if (e.pointerId !== init.pointerId) Object.defineProperty(e, 'pointerId', { value: init.pointerId });
    return e;
  };
  const guard = async (label, fn) => { try { await fn(); } catch (e) { ok(false, label + ' THREW: ' + (e && e.message)); } };
  const noErr = (errs) => errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;

  /* The gestures, run against one surface. el() = the pressed node (fresh each time: a menu may re-render);
     scroller(el) = the list that scrolls; menus() = how many menus are open; closeAll() = dismiss them;
     replace() = re-render the surface the way its shell does (the pressed node is REPLACED by a fresh wired twin). */
  const gestures = async (W, el, scroller, menus, closeAll, replace) => {
    const r = {};
    const d = W.document;
    const cm = (n) => { const e = new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true }); n.dispatchEvent(e); return e; };
    const fresh = async () => { closeAll(); await sleep(600); return [el(), menus()]; };   // a dismissed sheet fades out before it leaves the DOM
    /* 1a. touch press → a 30 px MOVE alone (no cancel) → Android's contextmenu = NOTHING (nor a timer menu later) */
    let [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown'));
    n.dispatchEvent(pev(W, 'pointermove', { y: 35 }));
    const c1 = cm(n);
    await sleep(650);
    r.movedNoMenu = menus() === m0 && c1.defaultPrevented;
    n.dispatchEvent(pev(W, 'pointerup'));
    /* 1b. touch press → pointercancel alone (the scroll took the pointer, no move seen) → contextmenu = NOTHING */
    [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown'));
    n.dispatchEvent(pev(W, 'pointercancel'));
    cm(n);
    await sleep(650);
    r.cancelledNoMenu = menus() === m0;
    /* 2a. touch press → the LIST scrolls (no move / cancel on the node) → contextmenu = NOTHING */
    [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown'));
    scroller(n).dispatchEvent(new W.Event('scroll'));
    cm(n);
    r.scrolledNoMenu = menus() === m0;   // read at once: openMessageMenu / the sheets open synchronously (no timer race under load)
    await sleep(600);
    r.scrolledNoTimerMenu = menus() === m0;   // the timer of a scrolled press opens nothing either
    n.dispatchEvent(pev(W, 'pointerup'));
    /* 2c. touch press → the list scrolls, NO platform contextmenu (iOS, or a slow Android hold) → the timer alone = NOTHING */
    [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown'));
    scroller(n).dispatchEvent(new W.Event('scroll'));
    await sleep(650);
    r.scrolledTimerAloneNoMenu = menus() === m0;
    n.dispatchEvent(pev(W, 'pointerup'));
    /* 2b. touch press → the DOCUMENT scrolls (target = document) → contextmenu = NOTHING */
    [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown'));
    d.dispatchEvent(new W.Event('scroll'));
    cm(n);
    r.docScrolledNoMenu = menus() === m0;
    n.dispatchEvent(pev(W, 'pointerup'));
    /* 3. a STILL touch press: the timer opens the menu, the platform contextmenu for the same hold adds nothing — ONCE;
          and contextmenu FIRST, then the timer's moment: still once */
    [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown'));
    await sleep(560);
    cm(n);
    await sleep(40);
    n.dispatchEvent(pev(W, 'pointerup'));
    r.stillOnceTimerFirst = menus() === m0 + 1;
    [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown'));
    await sleep(200);
    cm(n);
    await sleep(500);
    n.dispatchEvent(pev(W, 'pointerup'));
    r.stillOnceContextFirst = menus() === m0 + 1;
    /* 4. a MOUSE right click (with a 30 px drift — a mouse is never a scroll) still opens the menu */
    [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown', { kind: 'mouse', button: 2 }));
    n.dispatchEvent(pev(W, 'pointermove', { kind: 'mouse', y: 35 }));
    cm(n);
    await sleep(60);
    r.mouseRightClick = menus() === m0 + 1;
    /* 5. the row is REPLACED mid-press (a message / row update re-renders), the finger then moves (seen on the
          document) → Android's contextmenu lands on the REPLACEMENT node = NOTHING; the dead node's timer = NOTHING */
    [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown'));
    await replace();
    let n2 = el();
    r.replacedA = !!n2 && n2 !== n && !n.isConnected;
    d.dispatchEvent(pev(W, 'pointermove', { y: 35 }));
    if (n2) cm(n2);
    r.replacedMovedNoMenu = menus() === m0;
    await sleep(650);
    r.replacedMovedNoTimerMenu = menus() === m0;
    d.dispatchEvent(pev(W, 'pointerup', { y: 35 }));
    /* 6. a STILL press across a replace: the detached node's timer opens nothing; the platform contextmenu on the
          replacement opens the menu ONCE */
    [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown'));
    await replace();
    n2 = el();
    r.replacedB = !!n2 && n2 !== n && !n.isConnected;
    await sleep(650);
    r.detachedTimerNoMenu = menus() === m0;
    if (n2) cm(n2);
    await sleep(40);
    r.replacedStillOnce = menus() === m0 + 1;
    d.dispatchEvent(pev(W, 'pointerup'));
    /* 7. keydown resets the record: after a scroll-voided touch press, a keyboard menu key opens the menu.
          (a) Shift then the platform contextmenu on the node; (b) the ContextMenu key — the shell's own keyboard path
          when it takes the key (preventDefault), else the browser's contextmenu that follows the key */
    [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown'));
    d.dispatchEvent(new W.Event('scroll'));
    n.dispatchEvent(pev(W, 'pointerup'));
    n.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Shift', shiftKey: true, bubbles: true, cancelable: true }));
    cm(n);
    await sleep(40);
    r.keyResetShift = menus() === m0 + 1;
    [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown'));
    d.dispatchEvent(new W.Event('scroll'));
    n.dispatchEvent(pev(W, 'pointerup'));
    const k = new W.KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true, cancelable: true });
    n.dispatchEvent(k);
    if (!k.defaultPrevented) cm(n);
    await sleep(40);
    r.keyResetMenuKey = menus() === m0 + 1;
    /* 8. #46 r2 (1): an ENDED scroll press voids only briefly — a contextmenu with NO new press 1.1 s later (TalkBack's
          long-press action) opens the menu; the same contextmenu at once after the scroll still opens nothing */
    [n, m0] = await fresh();
    n.dispatchEvent(pev(W, 'pointerdown'));
    d.dispatchEvent(new W.Event('scroll'));
    n.dispatchEvent(pev(W, 'pointerup'));
    cm(n);
    await sleep(40);
    r.staleSoonStillVoid = menus() === m0;
    await sleep(1100);
    cm(n);
    await sleep(40);
    r.staleLaterOpens = menus() === m0 + 1;
    closeAll();
    return r;
  };
  const closeAllOf = (W) => () => { for (let i = 0; i < 4; i++) { try { if (!W.Spixi.dismissTopOverlay()) break; } catch (e) { break; } } };
  const ALL = '1a. touch press → 30 px move alone → contextmenu = no menu · 1b. pointercancel alone → no menu · 2a. the list scrolls → no menu (nor a timer menu) · 2c. the list scrolls, no contextmenu → the timer alone opens nothing · 2b. the document scrolls → no menu · 3. a still touch press = the menu ONCE (timer then contextmenu, and contextmenu then the timer\'s moment) · 4. a mouse right click (even with a drift) = the menu · 5. the row REPLACED mid-press, then a move → contextmenu on the replacement = no menu · 6. a still press across a replace: the detached timer = no menu, the contextmenu on the replacement = ONCE · 7. keydown resets: after a scrolled press, Shift / the Menu key = the menu · 8. an ended scroll press voids only ~1 s (a later contextmenu with no press opens)';

  /* ——— A. the MESSAGE menu (chat.html, attachMessageMenu) ——— */
  await guard('#1174 pin A', async () => {
    const { dom, W, d, push, errs } = await boot('chat.html');
    push('onChatScreenReady', 'groupAddr');
    push('setChatMode', '1', '0', '', 'False', '', 'True', 'False');
    push('clearMessages', 'false');
    push('addThem', 'm1', 'addrA', 'Ann', '', 'hello there', String(T0), 'True', 'True', 'True', 'False', 'False');
    if (typeof W.messagesDone === 'function') push('messagesDone');
    push('onChatScreenLoaded');
    await sleep(300);
    const el = () => d.querySelector('#messages [data-msgid="m1"] .c-bubble');
    const menus = () => d.querySelectorAll('.c-msgmenu').length;
    if (!el()) { ok(false, '★ #1174 A: the built chat shell rendered no message row'); return; }
    let k = 1;   // a message arriving mid-press: renderLogNow rebuilds EVERY row (box.replaceChildren)
    const replace = async () => { k++; push('addThem', 'm' + k, 'addrA', 'Ann', '', 'more ' + k, String(T0 + k), 'True', 'True', 'True', 'False', 'False'); await sleep(150); };
    const r = await gestures(W, el, () => d.getElementById('messages'), menus, closeAllOf(W), replace);
    ok(Object.values(r).every((x) => x === true) && noErr(errs),
      '★ #1174 MESSAGE MENU on the BUILT chat shell (Android: the menu opened while scrolling): ' + ALL + ' — ' + JSON.stringify(r) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— B. the chat-info SHARED-ITEMS long press (contact_details.html, attachSharedLongPress) ——— */
  await guard('#1174 pin B', async () => {
    const { dom, W, d, push, errs } = await boot('contact_details.html', 1500);
    push('setContext', 'chat'); push('setAddress', '1A9xQpT7vKzm3NwR5bYc8LdE2fGh4JkPq'); push('setNickname', 'Ana');
    await sleep(400);
    push('setSharedItems', JSON.stringify([['b1', 0, 'file', 'doc.pdf', 1000, T0, 1, null, 1], ['a1', 0, 'media', 'IMG_1.jpg', 1000, T0, 0, null, 1]]));
    await sleep(400);
    const el = () => d.querySelector('.c-shared__tile') || d.querySelector('.c-shared__row');
    const menus = () => [...d.querySelectorAll('.c-sheet')].filter((s) => s.querySelector('.c-msgmenu__item')).length;
    if (!el()) { ok(false, '★ #1174 B: the built contact_details shell rendered no shared item'); return; }
    let k = 0;   // C# re-pushes (a download lands → the file turns local) → the panel rebuilds (its signature changed)
    const replace = async () => { k++; push('setSharedItems', JSON.stringify([['b1', 0, 'file', 'doc.pdf', 1000, T0, k % 2 ? 0 : 1, null, 1], ['a1', 0, 'media', 'IMG_1.jpg', 1000, T0, 0, null, 1]])); await sleep(250); };
    const r = await gestures(W, el, (n) => n.parentElement, menus, closeAllOf(W), replace);
    ok(Object.values(r).every((x) => x === true) && noErr(errs),
      '★ #1174 SHARED ITEMS on the BUILT contact_details shell (the same pattern, the same guard): ' + ALL + ' — ' + JSON.stringify(r) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });

  /* ——— C. the CHATS-ROW menu (index.html, attachChatRowMenu) ——— */
  await guard('#1174 pin C', async () => {
    const { dom, W, d, errs } = await boot('index.html', 2000);
    const TS0 = Date.now() - 60000;
    W.executeUiCommand(W.clearChats);
    W.executeUiCommand(W.addChat, ...['addr1', 'Alice', TS0, 'img/spixiavatar.png', 'true', 'hi', '', '0', '', 'False'].map(b64));
    W.executeUiCommand(W.clearChatsDone);
    await sleep(150);
    const el = () => d.querySelector('.c-chatlist-item');
    const menus = () => [...d.querySelectorAll('.c-sheet, .c-modal')].filter((s) => s.querySelector('.c-msgmenu__item')).length;
    if (!el()) { ok(false, '★ #1174 C: the built home shell rendered no chat row'); return; }
    let k = 0;   // a lone addChat (a new excerpt) → patchChatRows replaces the row in place
    const TS = TS0;
    const replace = async () => { k++; W.executeUiCommand(W.addChat, ...['addr1', 'Alice', TS, 'img/spixiavatar.png', 'true', 'hi ' + k, '', '0', '', 'False'].map(b64)); await sleep(150); };
    const r = await gestures(W, el, (n) => n.parentElement, menus, closeAllOf(W), replace);
    ok(Object.values(r).every((x) => x === true) && noErr(errs),
      '★ #1174 CHATS ROW on the BUILT home shell (the same pattern, the same guard): ' + ALL + ' — ' + JSON.stringify(r) + ' errs: ' + errs.slice(0, 2).join(' | '));
    try { dom.window.close(); } catch (e) {}
  });
}
