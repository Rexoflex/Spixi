/* ==== SESSION 7b — ★ 7b (#1219) NO JUMP + SWIPE MOTION, and ★ 7b (#1220) NO DOUBLE-CLICK REPLY ON CARDS — EXECUTED on the
 * BUILT chat.html (jsdom; the log's geometry is stubbed: scrollHeight 3400, clientHeight 600, the pill 60 → 120).
 *   · a swipe-reply on a row INSIDE the 1.5-screen band, then the pill grows (the ResizeObserver publish): scrollTop does
 *     NOT go to the end — a visible row = no move; a row half under the pill = exactly into view (block:'nearest');
 *     after the hold (> 800 ms) the grow pins to the end again (the hold is bounded)
 *   · Android: the IME resize (innerHeight 800 → 500, the field focused) inside the hold — the stick keeps the row, never
 *     scrollTop = scrollHeight
 *   · the paint is dx − 10 (the engage slop): 11 px → 1 px, 60 → 50; armed ⇔ fires (64 px = no reply, 70 = reply)
 *   · the spring back eases out (--duration-200 decelerate) and the glyph's transition includes opacity (computed, built CSS)
 *   · desktop: a double-click on a PAYMENT card (its button, its ground, the row beside it) = no strip and its own action (ixian:viewPayment) runs ONCE; a text
 *     bubble still replies
 * Deliberate breaks: see the hand-back. */
import { s1Kit } from './s1-boot.mjs';

export default async function (h) {
  const { ok } = h;
  const k = s1Kit(h);
  const { open, pev, rowOf, strip, input, swipe, pick, type, noErr, guard, sleep } = k;

  /* the log geometry, stubbed on the live nodes */
  const stubLog = (W, d, g) => {
    d.dispatchEvent(new W.Event('wheel', { bubbles: true }));   // a user input ends the BOOT re-pin window (#334) — on a phone the swipe's own touch does
    const box = d.getElementById('messages');
    let top = g.scrollTop;
    Object.defineProperty(box, 'scrollHeight', { configurable: true, get: () => g.scrollHeight });
    Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => g.clientHeight });
    Object.defineProperty(box, 'scrollTop', { configurable: true, get: () => top, set: (v) => { top = Math.max(0, Math.min(g.scrollHeight - g.clientHeight, Number(v) || 0)); } });
    box.getBoundingClientRect = () => ({ top: 0, left: 0, right: 400, bottom: g.clientHeight, width: 400, height: g.clientHeight });
    const slot = d.getElementById('chat-composer');
    Object.defineProperty(slot, 'offsetHeight', { configurable: true, get: () => g.pill });
    /* the slot floats over the log's foot; g.lift = the iOS keyboard lift (--composer-lift raises the slot, not the log) */
    slot.getBoundingClientRect = () => { const t = g.clientHeight - g.pill - (g.lift || 0); return { top: t, bottom: t + g.pill, left: 0, right: 400, width: 400, height: g.pill }; };
    return { box, set: (v) => { top = v; } };
  };
  /* ★ S8 (#1238) re-base of the STUB, not the assertions: the row now MOVES with the log's scrollTop (as a real row does).
     The grow pin runs twice since S8 (in the ResizeObserver callback + the rAF belt); with a frozen rect the second,
     correctly idempotent keepRowInView scrolled a second time on stale geometry. Every expected scrollTop is unchanged. */
  const stubRow = (row, viewTop, hgt = 40) => {
    const box = row.ownerDocument.getElementById('messages');
    const top0 = box.scrollTop;
    row.getBoundingClientRect = () => { const t = viewTop - (box.scrollTop - top0); return { top: t, bottom: t + hgt, left: 0, right: 300, width: 300, height: hgt }; };
    Object.defineProperty(row, 'offsetHeight', { configurable: true, get: () => hgt });
  };
  const frames = (W, n = 4) => new Promise((res) => { let i = 0; const f = () => (++i >= n ? res() : W.requestAnimationFrame(f)); W.requestAnimationFrame(f); });

  await guard('#1219 no jump', async () => {
    const s = await open({ caps: 'reply,edit' });
    const { W, d, ro } = s;
    const r = {};
    const g = { scrollHeight: 3400, clientHeight: 600, scrollTop: 2500, pill: 60 };
    const log = stubLog(W, d, g);
    const grow = async (px) => { g.pill = px; for (const cb of ro) { try { cb([]); } catch (e) {} } await frames(W); };
    /* the publish baseline: the pill is 60 now */
    await grow(60);
    /* a. a VISIBLE row (inside the band, above the pill) → the grow leaves scrollTop alone */
    log.set(2500);
    await swipe(W, d, 'aa01', 90);
    stubRow(rowOf(d, 'aa01'), 200);
    r.replied = !!strip(d);
    await grow(120);
    r.visibleStays = d.getElementById('messages').scrollTop === 2500;
    d.querySelector('.c-composer__ctx-cancel').click();
    await grow(60);
    /* b. a row half UNDER the pill → exactly into view (nearest), not the end */
    log.set(2500);
    await swipe(W, d, 'aa03', 90);
    stubRow(rowOf(d, 'aa03'), 560);   // 560..600 in a 600 view with a 120 pill → 120 under
    await grow(120);
    r.nearest = d.getElementById('messages').scrollTop === 2620;
    d.querySelector('.c-composer__ctx-cancel').click();
    await grow(60);
    /* c. the hold is bounded: > 800 ms later the grow pins to the end again */
    log.set(2500);
    await swipe(W, d, 'aa01', 90);
    stubRow(rowOf(d, 'aa01'), 200);
    await sleep(850);
    await grow(120);
    r.holdBounded = d.getElementById('messages').scrollTop === 2800;   // = scrollHeight − clientHeight (the end)
    d.querySelector('.c-composer__ctx-cancel').click();
    await grow(60);
    /* d. #46 r1 M06: a row partly ABOVE the view → brought down into view (its top at the view's top) */
    log.set(2500);
    await swipe(W, d, 'aa01', 90);
    stubRow(rowOf(d, 'aa01'), -20);
    await grow(120);
    r.above = d.getElementById('messages').scrollTop === 2480;
    d.querySelector('.c-composer__ctx-cancel').click();
    await grow(60);
    /* e. #46 r1 B-M1: the iOS keyboard LIFT (the slot rides 300 px up, the log does not shrink) — a row at 300..340 is
       under the lifted pill (its top 600 − 120 − 300 = 180) → into view above it (+160), not left behind the keyboard */
    log.set(2500);
    g.lift = 300;
    await swipe(W, d, 'aa01', 90);
    stubRow(rowOf(d, 'aa01'), 300);
    await grow(120);
    r.lift = d.getElementById('messages').scrollTop === 2660;
    d.querySelector('.c-composer__ctx-cancel').click();
    g.lift = 0;
    await grow(60);
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★ 7b (#1219) NO JUMP on the built chat shell: after a swipe-reply on a row inside the 1.5-screen band the pill\'s grow re-pin keeps THAT row in view (visible = no move; half under the pill = exactly into view, block:\'nearest\') instead of pinning to the end, and the hold is bounded (> 800 ms → the end again); a row partly ABOVE the view comes down into it (#46 r1 M06); the visible bottom is the composer slot\'s top, so under an iOS keyboard lift the row lands above the lifted pill (#46 r1 B-M1) — ' + JSON.stringify(r));
    s.dom.window.close();
  });

  await guard('#1219 android stick', async () => {
    const s = await open({ caps: 'reply,edit', android: true });
    const { W, d, geo } = s;
    const r = {};
    const g = { scrollHeight: 3400, clientHeight: 600, scrollTop: 2500, pill: 60 };
    stubLog(W, d, g);
    await swipe(W, d, 'aa01', 90);
    stubRow(rowOf(d, 'aa01'), 200);
    r.focused = d.activeElement === input(d);
    geo.innerHeight = 500;                 // the IME arrives (adjustResize)
    W.dispatchEvent(new W.Event('resize'));
    await frames(W, 6);
    r.notEnd = d.getElementById('messages').scrollTop !== 2800 && d.getElementById('messages').scrollTop === 2500;
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★ 7b (#1219) NO JUMP — Android: the IME resize stick (AND-16 stickDuring) inside the reply hold keeps the swiped row, never scrollTop = the end — ' + JSON.stringify(r));
    s.dom.window.close();
  });

  /* #46 r1 M08: reduced motion — stickDuring's one-write branch honours the hold too (no pin to the end) */
  await guard('#1219 android stick reduced', async () => {
    const s = await open({ caps: 'reply,edit', android: true });
    const { W, d, geo } = s;
    const r = {};
    W.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    const g = { scrollHeight: 3400, clientHeight: 600, scrollTop: 2500, pill: 60 };
    stubLog(W, d, g);
    await swipe(W, d, 'aa01', 90);
    stubRow(rowOf(d, 'aa01'), 200);
    r.replied = !!strip(d);
    geo.innerHeight = 500;
    W.dispatchEvent(new W.Event('resize'));
    await frames(W, 6);
    r.notEnd = d.getElementById('messages').scrollTop === 2500;
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★ 7b (#46 r1 M08) NO JUMP — Android, REDUCED MOTION: the stick\'s one-write branch keeps the swiped row too (never scrollTop = the end) — ' + JSON.stringify(r));
    s.dom.window.close();
  });

  /* #46 r1 C-note: the OTHER bottom pins honour the hold — an INCOMING row and a picture load inside the hold keep the
     held row (no pull to the end); MY send ends the hold and its row goes to the end */
  await guard('#46 r1 hold pins', async () => {
    const s = await open({ caps: 'reply,edit' });
    const { W, d, push } = s;
    const r = {};
    const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
    const T = Math.floor(Date.now() / 1000) - 600;
    W.HTMLImageElement.prototype.decode = function () { return Promise.resolve(); };
    push('setPhotoPreviews', 'True');
    push('addFile', 'pp01', 'addrPeer', 'Bob', '', 'fp1', 'IMG_1.jpg', String(T), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '');
    await frames(W, 3);
    const g = { scrollHeight: 3400, clientHeight: 600, scrollTop: 2500, pill: 60 };
    const log = stubLog(W, d, g);
    const box = d.getElementById('messages');
    /* a. an incoming text inside the hold */
    log.set(2500);
    await swipe(W, d, 'aa01', 90);
    stubRow(rowOf(d, 'aa01'), 200);
    push('addThem', 'in01', 'addrPeer', 'Bob', '', 'a new one', String(T + 60), 'True', 'True', 'True', 'False', 'False');
    await frames(W, 4);
    stubRow(rowOf(d, 'aa01'), 200);
    r.incomingKeeps = box.scrollTop === 2500;
    /* b. a picture load inside the hold (the tile's onLoad re-pin) */
    push('setFileThumb', 'pp01', JPEG);
    await frames(W, 2);
    stubRow(rowOf(d, 'aa01'), 200);
    const img = d.querySelector('#messages [data-msgid="pp01"] .c-mbubble__img');
    if (img) img.dispatchEvent(new W.Event('load'));
    await frames(W, 4);
    await sleep(20);
    r.loaded = d.querySelector('#messages [data-msgid="pp01"] .c-mbubble').dataset.state === 'loaded';
    r.loadKeeps = box.scrollTop === 2500;
    /* c. MY send (still inside the 800 ms) ends the hold → my row goes to the end */
    type(W, d, 'my answer');
    d.querySelector('.c-composer__action').click();
    await sleep(10);
    r.sentReply = !strip(d);
    push('addMe', 'me01', 'addrMe', 'Me', '', 'my answer', String(T + 120), 'True', 'True', 'True', 'False', 'False', '', 'aa01', '', '', '');
    await frames(W, 4);
    r.ownToEnd = box.scrollTop === 2800;
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★ 7b (#46 r1 C-note) THE HOLD covers every bottom pin on the built chat shell: inside the reply hold an INCOMING row (renderLogNow) and a picture landing (the tile\'s onLoad) keep the held row in view — no pull to the end; MY send ends the hold and my row goes to the end — ' + JSON.stringify(r));
    s.dom.window.close();
  });

  await guard('#1219 swipe paint', async () => {
    const s = await open({ caps: 'reply' });
    const { W, d } = s;
    const r = {};
    const node = () => rowOf(d, 'aa01').querySelector('.c-bubble');
    const row = () => rowOf(d, 'aa01');
    let n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 111 }));
    r.engageFromZero = row().style.getPropertyValue('--reply-swipe-x') === '1px';
    n.dispatchEvent(pev(W, 'pointermove', { x: 160 }));
    r.paint50 = row().style.getPropertyValue('--reply-swipe-x') === '50px' && !row().hasAttribute('data-reply-armed');
    n.dispatchEvent(pev(W, 'pointermove', { x: 164 }));
    r.notArmed64 = !row().hasAttribute('data-reply-armed');
    const gDrag = row().querySelector('.c-reply-swipe');
    const gtDrag = gDrag ? W.getComputedStyle(gDrag).transition : '';
    r.glyphFollowsDrag = !!gtDrag && !/opacity/.test(gtDrag);   // #46 r1 nit: the finger drives the opacity — no lag
    n.dispatchEvent(pev(W, 'pointerup', { x: 164 }));
    await sleep(30);
    r.noFire64 = !strip(d);
    const gRet = row().querySelector('.c-reply-swipe');
    const gtRet = gRet ? W.getComputedStyle(gRet).transition : '';
    r.glyphOpacity = row().hasAttribute('data-reply-return') && /opacity var\(--duration-200\)/.test(gtRet);   // the return eases it out
    /* #46 r1 M13: the clear waits out the return — the settle const ≥ --duration-200 (the built tokens), and the row is
       still returning just past the transition's end (cleared after) */
    const dur = parseFloat(W.getComputedStyle(d.documentElement).getPropertyValue('--duration-200')) || NaN;
    r.settleConst = W.Spixi.REPLY_SWIPE_SETTLE_MS >= dur && dur >= 200;
    await sleep(dur - 30 + 20);   // ≈ the transition's end (+20)
    r.stillReturning = row().hasAttribute('data-reply-return') && !!row().querySelector('.c-reply-swipe');
    await sleep(300);
    r.clearedAfter = !row().hasAttribute('data-reply-swipe') && !row().querySelector('.c-reply-swipe');
    n = node();
    n.dispatchEvent(pev(W, 'pointerdown', { x: 100 }));
    n.dispatchEvent(pev(W, 'pointermove', { x: 170 }));
    r.armed70 = row().hasAttribute('data-reply-armed');
    const gt = gtDrag + ' | ' + gtRet;
    n.dispatchEvent(pev(W, 'pointerup', { x: 170 }));
    r.fire70 = !!strip(d);
    const rt = W.getComputedStyle(row()).transition || W.getComputedStyle(row()).getPropertyValue('transition');
    r.springBack = /transform var\(--duration-200\) var\(--easing-decelerate\)/.test(rt);
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★ 7b (#1219) SWIPE MOTION on the built chat shell: the row paints dx − 10 (the engage slop — 11 px → 1 px, no jump at engage; 60 → 50), armed ⇔ fires (64 px = neither, 70 = both), the spring back eases out on --duration-200 decelerate; the glyph\'s opacity follows the finger while dragging and eases only on the return (#46 r1); the settle clear (REPLY_SWIPE_SETTLE_MS) outlasts --duration-200 — the row is still returning at the transition\'s end, clean after (#46 r1 M13) — ' + JSON.stringify(r) + ' ' + JSON.stringify({ gt, rt }));
    s.dom.window.close();
  });

  await guard('#1220 dblclick', async () => {
    const s = await open({ caps: 'reply', desktop: true });
    const { W, d, sent } = s;
    const r = {};
    s.push('addPaymentRequest', 'aa06', 'tx06', 'addrPeer', 'Bob', '', 'Payment', '10', 'Completed', '', String(Math.floor(Date.now() / 1000) - 60), 'False', 'True', 'True', 'True', 'payment', '1', '', '');
    await sleep(200);
    const card = rowOf(d, 'aa06');
    const hit = card && card.querySelector('.c-tcard__hit, .c-tcard button');
    r.hasHit = !!hit;
    const n0 = sent.length;
    if (hit) {
      hit.dispatchEvent(new W.MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 1, button: 0 }));
      hit.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, button: 0 }));
      const md2 = new W.MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 2, button: 0 });
      hit.dispatchEvent(md2);
      hit.dispatchEvent(new W.MouseEvent('click', { bubbles: true, cancelable: true, detail: 2, button: 0 }));
      hit.dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2, button: 0 }));
      /* the card's own ground (not the button) double-clicked: still no reply */
      const ground = card.querySelector('.c-tcard');
      ground.dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2, button: 0 }));
      card.dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2, button: 0 }));
    }
    await sleep(40);
    const views = sent.slice(n0).filter((c) => /^ixian:viewPayment:/.test(c));
    r.actionOnce = views.length === 1;
    r.noStrip = !strip(d);
    /* a text bubble still replies on a double-click */
    const txt = rowOf(d, 'aa01').querySelector('.c-bubble__text') || rowOf(d, 'aa01').querySelector('.c-bubble');
    txt.dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2, button: 0 }));
    await sleep(30);
    r.textReplies = !!strip(d) && /hello from Bob/.test(strip(d).textContent);
    d.querySelector('.c-composer__ctx-cancel').click();
    await sleep(20);
    /* #46 r1 M11: a VOICE bubble (its own click = play) — a double-click on its wave / ground opens no strip */
    s.push('addFile', 'vv01', 'addrPeer', 'Bob', '', 'fv1', 'voice-1.ogg', String(Math.floor(Date.now() / 1000) - 30), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '1');
    await sleep(120);
    const vrow = rowOf(d, 'vv01');
    const wave = vrow && vrow.querySelector('.c-voice__wave');
    r.voiceRow = !!wave;
    if (wave) {
      wave.dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2, button: 0 }));
      W.Spixi.messageMenuTarget(vrow).dispatchEvent(new W.MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2, button: 0 }));
    }
    await sleep(30);
    r.voiceNoStrip = !strip(d);
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★ 7b (#1220) DOUBLE-CLICK on the built chat shell (desktop): a payment card\'s double-click opens NO reply strip and its own action (ixian:viewPayment) runs ONCE (its reentry guard); a text bubble still replies; a VOICE bubble does not (#46 r1 M11) — ' + JSON.stringify(r) + ' views=' + views.length);
    s.dom.window.close();
  });

  /* ==== #46 r2 (F3) — the hold's END: m3 (an arrival the hold kept off-screen gets the chevron + badge), n1 (✕ / Esc /
     Back end the hold), n2 (a running stick stops holding the row once the hold expires) ==== */
  const stl = (d) => d.querySelector('.c-scroll-latest');
  const badge = (d) => { const b = d.querySelector('.c-scroll-latest__badge'); return b ? b.textContent : ''; };
  /* an incoming row lands inside the hold, the log 50 px off its end; the arrival sits UNDER the pill (top 560, pill top 540) */
  const holdArrival = async (s, g, start) => {
    const { W, d, push } = s;
    const realNow = W.Date.now.bind(W.Date);
    W.Date.now = () => realNow() + 6000;   // past clearMessages' 5 s badge quiet window (#376 B-1)
    const log = stubLog(W, d, g);
    log.set(2750);
    d.getElementById('messages').dispatchEvent(new W.Event('scroll'));
    const r = { cueOffBefore: !stl(d).hasAttribute('data-visible') };
    if (start) await start(); else await swipe(W, d, 'aa01', 90);
    stubRow(rowOf(d, start ? 'aa02' : 'aa01'), 200);
    push('addThem', 'in01', 'addrPeer', 'Bob', '', 'a new one', String(Math.floor(Date.now() / 1000) - 5), 'True', 'True', 'True', 'False', 'False');
    await frames(W, 4);
    g.scrollHeight = 3500;   // the arrival's 100 px: 150 px off the end now (inside the chevron's 200 px band)
    const rows = d.querySelectorAll('#messages .c-bubble-row');
    r.newestIsArrival = rows[rows.length - 1] === rowOf(d, 'in01');
    stubRow(rowOf(d, 'in01'), 560, 60);
    r.held = d.getElementById('messages').scrollTop === 2750;
    r.counted = badge(d) === '1';
    return r;
  };
  await guard('#46 r2 m3 hold cue', async () => {
    const s = await open({ caps: 'reply,edit' });
    const { W, d } = s;
    const g = { scrollHeight: 3400, clientHeight: 600, scrollTop: 2750, pill: 60 };
    const r = await holdArrival(s, g);
    const box = d.getElementById('messages');
    r.stripOpen = !!strip(d);
    await sleep(850);   // the hold expires (timer) — no scroll happened
    r.cueAfterExpiry = stl(d).hasAttribute('data-visible') && badge(d) === '1';
    box.dispatchEvent(new W.Event('scroll'));   // a scroll inside the 200 px band does not clear a hidden arrival
    r.cueSurvivesScroll = stl(d).hasAttribute('data-visible') && badge(d) === '1';
    s.push('showUserTyping', 'addrPeer', 'Bob');   // #46 r3 MINOR-1: the typing pill (always LAST) is not "the newest row"
    await frames(W, 2);
    const pill = d.querySelector('#messages .c-bubble-row--typing');
    r.typingLast = !!pill && pill === d.getElementById('messages').lastElementChild;
    if (pill) stubRow(pill, 560, 40);   // the pill itself under the composer
    box.scrollTop = 2900;
    stubRow(rowOf(d, 'in01'), 470, 60);   // now above the pill
    box.dispatchEvent(new W.Event('scroll'));
    r.clearsWhenShown = !stl(d).hasAttribute('data-visible') && badge(d) === '';
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★ 7b (#46 r2 m3) THE HOLD HIDES NO ARRIVAL on the built chat shell: an incoming row counted during the reply hold (the log held 150 px off its end, the row under the composer) gets the scroll-to-latest chevron WITH its badge when the hold expires (no scroll needed); a scroll inside the 200 px band does not clear it while the row is not shown above the composer; once it shows, the badge and the chevron go — ' + JSON.stringify(r));
    s.dom.window.close();
  });
  await guard('#46 r2 m3+n1 cancel ends the hold', async () => {
    const out = {};
    for (const how of ['x', 'esc', 'back', 'edit-x']) {   // #46 r3: the EDIT strip's ✕ ends the hold too
      const s = await open({ caps: 'reply,edit' });
      const { W, d, ro, push } = s;
      const g = { scrollHeight: 3400, clientHeight: 600, scrollTop: 2750, pill: 60 };
      const grow = async (px) => { g.pill = px; for (const cb of ro) { try { cb([]); } catch (e) {} } await frames(W); };
      const r = await holdArrival(s, g, how === 'edit-x' ? async () => { await pick(W, d, 'aa02', 'Edit'); } : null);
      if (how === 'edit-x') r.editOpen = !!strip(d) && strip(d).dataset.kind === 'edit';
      await grow(60);
      if (how === 'x' || how === 'edit-x') d.querySelector('.c-composer__ctx-cancel').click();
      else if (how === 'esc') input(d).dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      else push('chatBack');
      await sleep(20);
      r.closed = !strip(d);
      r.cueAtOnce = stl(d).hasAttribute('data-visible') && badge(d) === '1';   // m3: the cancel is a hold end (well inside 800 ms)
      /* n1: the hold is over — the pill's grow pins to the END again (a live hold keeps aa01 → 2750) */
      await grow(120);
      r.growToEnd = d.getElementById('messages').scrollTop === 2900;
      r.noErr = noErr(s.errs);
      out[how] = r;
      s.dom.window.close();
    }
    ok(Object.values(out).every((r) => Object.values(r).every((x) => x === true)),
      '★ 7b (#46 r2 n1 · m3) ✕, Esc and Back (cancelComposerContext / closeComposerCtxForBack) END the reply hold on the built chat shell: inside the 800 ms the pill\'s grow re-pin goes to the end again, and an arrival the hold kept under the composer gets the chevron + badge at once — ' + JSON.stringify(out));
  });
  await guard('#46 r2 n2 stick after expiry', async () => {
    const s = await open({ caps: 'reply,edit', android: true });
    const { W, d, geo } = s;
    const r = {};
    const g = { scrollHeight: 3400, clientHeight: 600, scrollTop: 2500, pill: 60 };
    stubLog(W, d, g);
    await swipe(W, d, 'aa01', 90);
    stubRow(rowOf(d, 'aa01'), 200);
    await sleep(600);   // the IME resize lands 600 ms into the 800 ms hold → stickDuring(500) runs past the expiry
    geo.innerHeight = 500;
    W.dispatchEvent(new W.Event('resize'));
    await frames(W, 4);
    r.heldInside = d.getElementById('messages').scrollTop === 2500;
    await sleep(450);   // ~1050 ms: the hold is over, the stick still runs
    r.endAfter = d.getElementById('messages').scrollTop === 2800;
    r.noErr = noErr(s.errs);
    ok(Object.values(r).every((x) => x === true),
      '★ 7b (#46 r2 n2) the Android IME stick re-checks the reply hold EACH FRAME on the built chat shell: started inside the hold it keeps the row, and once the hold expires mid-stick it pins to the end again (it no longer holds the row to its own end) — ' + JSON.stringify(r));
    s.dom.window.close();
  });
}
