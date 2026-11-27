/* ==== macfixa item 3 — the chat-row swipe locks the touch scroll once it is sideways (cap `swipeTouchLock`, MacfixaFlags.SwipeTouchLock) ====
 * EXECUTED in jsdom: the BUILT spixi.bundle.js (+ spixi.icons.js, spixi.strings.js) in a bare page; window.Spixi.wrapChatRowSwipe
 * wraps one row with pin + mute on; the pin dispatches PointerEvents and cancelable TouchEvents on the row content in the
 * order Chromium uses (pointermove before the touchmove of the same input).
 * LIMITS: jsdom has no scroll, no fling and no gesture recogniser: the pin proves which touchmoves the page cancels, not
 * what the browser does with a cancelled touchmove (that is scripts/pins-macfixa/c-swipe-touch.mjs in Chromium, by hand, and
 * the Android walk). jsdom ignores preventDefault in a passive listener, as browsers do; the pin reads defaultPrevented.
 *   c1 cap on     — a drag locked sideways (dx 24, dy 3): its next touchmove is defaultPrevented and the row still follows the
 *                   pointer (translateX); a vertical drag (dx 2, dy 24): not prevented; a move inside the 8 px lock (dx 3): not
 *                   prevented; a non-cancelable touchmove: not prevented; a touchmove after pointerup: not prevented.
 *   c2 no cap     — the same sideways drag: nothing prevented, the row still swipes, and NO touchmove listener is added
 *                   anywhere (so the browser's touch path is today's: no blocking listener on the rows).
 *   c3 gesture    — the cap is read when a gesture starts: a getter false at wrap time and true later → the next gesture is
 *                   prevented; true at wrap time and false later → not prevented.
 *   c4 desktop    — :root[data-desktop] with the cap on: the row comes back unwrapped and no touchmove listener is added.
 *   c5 slop       — a move past 8 px by distance with both axes under 8 (dx 7, dy 5: where Chromium's 8 dp slop already starts its
 *                   scroll): with the cap it decides sideways, the row follows and its touchmove is prevented; at a steep angle
 *                   (dx 4, dy 7.5) it decides vertical and nothing is prevented; without the cap the same (7, 5) move stays
 *                   undecided, as today (the row does not move, nothing prevented).
 *   c6 once       — with the cap, one row adds exactly one touchmove listener across five gestures.
 * DELIBERATE BREAKS (#802; one token each in a full copy, rebuilt, `node scripts/run-pins.mjs --root <copy> pins-macfixa/c-swipe`):
 *   `{ passive: false }` → `{ passive: true }` → c1 (sideways), c3 (lateOn) and c5 (sideways) red;
 *   `if (dragging && horiz && e.cancelable` → `if (dragging && e.cancelable` → c1 (vertical, insideLock) and c5 (steep) red;
 *   `if (lockArmed || !lockCap()) return;` → `if (lockArmed) return;` → c2 (noListener) red;
 *   `armTouchLock();` in pointerdown → `;` → c3 (lateOn) red;
 *   `hasAttribute('data-desktop')) return rowEl;` → `hasAttribute('data-desktopx')) return rowEl;` → c4 red;
 *   `Math.hypot(dx, dy) >= SWIPE_DIRLOCK_PX` → `Math.hypot(dx, dy) > 99` → c5 (sideways) red;
 *   `lockArmed = true;` → `;` → c6 red. */
export default async function (h) {
  const { ok, root, join, existsSync, JSDOM, VirtualConsole, sleep } = h;
  const dir = join(root, 'Spixi/Resources/Raw/html');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const errs = [];
  const boot = async (desktop) => {
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => errs.push(String(e.message).slice(0, 160)));
    const html = '<!DOCTYPE html><html' + (desktop ? ' data-desktop' : '') + '><head></head><body>'
      + '<script src="spixi.icons.js"></script><script src="spixi.strings.js"></script>'
      + '<script>window.SL = window.SpixiStrings ? window.SpixiStrings.get("en-us") : {};</script>'
      + '<script src="spixi.bundle.js"></script></body></html>';
    const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + dir + '/c-swipe-pin.html', virtualConsole: vc });
    for (let i = 0; i < 40 && !(dom.window.Spixi && dom.window.Spixi.wrapChatRowSwipe); i++) await sleep(50);
    const W = dom.window;
    const adds = [];   // every touchmove listener added after boot
    const real = W.EventTarget.prototype.addEventListener;
    W.EventTarget.prototype.addEventListener = function (type, fn, o) { if (type === 'touchmove') adds.push(o); return real.call(this, type, fn, o); };
    return { W, d: W.document, adds, close: () => { try { W.close(); } catch (e) {} } };
  };
  const make = (s, caps) => {
    const row = s.d.createElement('button');
    row.className = 'c-chatlist-item';
    const node = s.W.Spixi.wrapChatRowSwipe(row, { chat: { name: 'A' }, capabilities: { pin: true, mute: true, ...caps }, strings: {}, onAction: () => {} });
    s.d.body.append(node);
    return { row, node, content: node.querySelector('.c-swipe__content') };
  };
  const P = (s, el, type, x, y) => el.dispatchEvent(new s.W.PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', button: 0, isPrimary: true }));
  const T = (s, el, cancelable = true) => { const e = new s.W.TouchEvent('touchmove', { bubbles: true, cancelable }); el.dispatchEvent(e); return e.defaultPrevented; };
  /* one gesture: down at (100,100), a pointermove to (100+dx, 100+dy), then one touchmove; returns whether it was prevented
     (and keeps the row's transform at that moment in `moved`) */
  let moved = '';
  const gesture = (s, c, dx, dy, { cancelable = true, up = false } = {}) => {
    P(s, c, 'pointerdown', 100, 100);
    P(s, c, 'pointermove', 100 + dx, 100 + dy);
    if (up) P(s, c, 'pointerup', 100 + dx, 100 + dy);
    const prevented = T(s, c, cancelable);
    moved = c.style.transform || '';
    if (!up) P(s, c, 'pointerup', 100 + dx, 100 + dy);
    return prevented;
  };

  let s = null;
  try {
    if (!existsSync(join(dir, 'spixi.bundle.js'))) { ok(false, 'macfixa c-swipe: the built spixi.bundle.js is missing (run the pipeline)'); return; }
    s = await boot(false);
    if (!(s.W.Spixi && s.W.Spixi.wrapChatRowSwipe) || !s.W.PointerEvent || !s.W.TouchEvent) { ok(false, 'macfixa c-swipe: setup — wrapChatRowSwipe / PointerEvent / TouchEvent missing in jsdom: ' + JSON.stringify(errs)); return; }

    /* c1 · the cap on (a getter, the shell's form) */
    let r = make(s, { swipeTouchLock: () => true });
    const c1 = { wrapped: !!r.content };
    c1.sideways = r.content && gesture(s, r.content, 24, 3) === true;
    c1.follows = moved === 'translateX(24px)';
    r = make(s, { swipeTouchLock: () => true });
    c1.vertical = gesture(s, r.content, 2, 24) === false;
    r = make(s, { swipeTouchLock: () => true });
    c1.insideLock = gesture(s, r.content, 3, 1) === false;
    r = make(s, { swipeTouchLock: () => true });
    c1.notCancelable = gesture(s, r.content, 24, 3, { cancelable: false }) === false;
    r = make(s, { swipeTouchLock: () => true });
    c1.afterUp = gesture(s, r.content, 24, 3, { up: true }) === false;
    ok(F(c1).length === 0, 'macfixa c-swipe c1 cap on: a touchmove of a drag locked sideways is defaultPrevented and the row still follows the pointer; a vertical drag, a move inside the 8 px lock, a non-cancelable touchmove and a touchmove after pointerup are not prevented — failing: ' + JSON.stringify(F(c1)));

    /* c2 · no cap: today's behaviour */
    const before = s.adds.length;
    r = make(s, {});
    const c2 = { notPrevented: gesture(s, r.content, 24, 3) === false };
    c2.swipes = moved === 'translateX(24px)';
    r = make(s, { swipeTouchLock: false });
    c2.falseNotPrevented = gesture(s, r.content, 24, 3) === false;
    c2.noListener = s.adds.length === before;
    ok(F(c2).length === 0, 'macfixa c-swipe c2 no cap: a sideways drag prevents no touchmove, the row still swipes, and no touchmove listener is added (today\'s touch path) — failing: ' + JSON.stringify(F(c2)) + ' adds=' + (s.adds.length - before));

    /* c3 · the cap is read at gesture time */
    let on = false;
    r = make(s, { swipeTouchLock: () => on });
    on = true;
    const c3 = { lateOn: gesture(s, r.content, 24, 3) === true };
    let on2 = true;
    r = make(s, { swipeTouchLock: () => on2 });
    on2 = false;
    c3.lateOff = gesture(s, r.content, 24, 3) === false;
    ok(F(c3).length === 0, 'macfixa c-swipe c3 gesture time: a cap that comes after the row was built locks the next gesture; a cap that reads false when the gesture runs prevents nothing — failing: ' + JSON.stringify(F(c3)));
    /* c5 · past the slop by distance, both axes under the 8 px lock */
    const two = (c, a, b) => { P(s, c, 'pointerdown', 100, 100); P(s, c, 'pointermove', 100 + a[0], 100 + a[1]); P(s, c, 'pointermove', 100 + b[0], 100 + b[1]); const p = T(s, c); moved = c.style.transform || ''; P(s, c, 'pointerup', 100 + b[0], 100 + b[1]); return p; };
    r = make(s, { swipeTouchLock: () => true });
    const c5 = { sideways: two(r.content, [6, 4], [7, 5]) === true && moved === 'translateX(7px)' };
    r = make(s, { swipeTouchLock: () => true });
    c5.steep = two(r.content, [3, 6], [4, 7.5]) === false && moved === '';
    r = make(s, {});
    c5.noCapToday = two(r.content, [6, 4], [7, 5]) === false && moved === '';
    ok(F(c5).length === 0, 'macfixa c-swipe c5 slop: with the cap a move of 8 px by distance (dx 7, dy 5) decides sideways — the row follows, its touchmove is prevented; a steep one (4, 7.5) decides vertical, nothing prevented; without the cap (7, 5) stays undecided as today — failing: ' + JSON.stringify(F(c5)));

    /* c6 · one listener per row */
    const before6 = s.adds.length;
    r = make(s, { swipeTouchLock: () => true });
    for (let i = 0; i < 5; i++) gesture(s, r.content, 24, 3);
    ok(s.adds.length - before6 === 1, 'macfixa c-swipe c6 once: with the cap one row adds exactly ONE touchmove listener across five gestures — added ' + (s.adds.length - before6));
    s.close(); s = null;

    /* c4 · desktop: no swipe at all */
    s = await boot(true);
    const before4 = s.adds.length;
    const row = s.d.createElement('button');
    const node = s.W.Spixi.wrapChatRowSwipe(row, { chat: {}, capabilities: { pin: true, mute: true, swipeTouchLock: () => true }, strings: {} });
    const c4 = { unwrapped: node === row, noListener: s.adds.length === before4 };
    ok(F(c4).length === 0, 'macfixa c-swipe c4 desktop: with :root[data-desktop] and the cap on, wrapChatRowSwipe returns the row itself and adds no touchmove listener — failing: ' + JSON.stringify(F(c4)));
  } finally {
    if (s) s.close();
  }
}
