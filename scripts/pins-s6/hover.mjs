/* ==== SESSION 6 — #1171 HOVER ACROSS A LIVE ROW UPDATE (Damir, Windows video 2026-10-04: a hovered chats row
 * FLASHED ~230 ms with the cursor still). A live update REPLACES the row node (patchChatRows replaceWith, the full
 * render's textContent = ''), the hover is pure CSS :hover, and a NEW node is not :hover until WebView2 re-hit-tests.
 * The list now tracks the hovered row key (pointerover/pointerout, delegated) and a row rebuilt under that key is
 * born with data-hover, which the row CSS paints like :hover; keyboard focus moves to the replacement.
 * Behaviour is pinned on the BUILT shell (Spixi/Resources/Raw/html/index.html in jsdom). jsdom's matches(':hover')
 * is always false, so the pin drives the tracker with pointer events, exactly as a mouse would.
 * Deliberate breaks (#802), run 2026-10-04 — each went red for exactly the named pins, restored green:
 *   chatlist-item.js carryRowHover: comment out setAttribute('data-hover')    → chats patch · flush · leave · wallet · contacts
 *   chatlist-item.js trackRowHover pointerout: drop `st.key = null`           → chats leave
 *   chatlist-item.js restoreRowFocus: `return;` at the top                    → chats focus
 *   chatlist-item.css: [data-hover] → [data-hoverx]                           → CSS
 *   chats-shell.js patchChatRows: drop the carryRowHover call                 → chats patch · leave (flush stays green) */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const f = join(root, 'Spixi/Resources/Raw/html/index.html');
  const html = readFileSync(f, 'utf8');
  const boot = async () => {
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation/i.test(m)) errs.push(m); });
    const dom = new JSDOM(html, {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Document.prototype.hasFocus = function () { return w.__docFocus !== false; };   // jsdom answers false; the pins drive it (#46 r1 m1)
      },
    });
    await sleep(1500);
    const W = dom.window;
    const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : (String(x).startsWith('data:') ? String(x) : b64(x)))));
    const frame = () => new Promise((r) => W.requestAnimationFrame(() => W.requestAnimationFrame(() => r())));
    const Ev = W.PointerEvent || W.MouseEvent;
    const ptr = (el, type, init = {}) => el.dispatchEvent(new Ev(type, { bubbles: !/enter|leave/.test(type), cancelable: true, pointerType: 'mouse', ...init }));
    // a mouse arriving on a row: pointerover (bubbles to the list) + pointerenter (the row)
    const hoverOn = (el) => { ptr(el, 'pointerover'); ptr(el, 'pointerenter'); };
    return { dom, W, d: W.document, push, frame, errs, ptr, hoverOn };
  };
  const guard = async (name, fn) => {
    try { await fn(); } catch (e) { ok(false, name + ' — threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
  };
  const now = Math.floor(Date.now() / 1000);
  const A = 'AAAhoverRow11111111111111111111111111111111111111111', B = 'BBBhoverRow22222222222222222222222222222222222222222',
    C = 'CCChoverRow33333333333333333333333333333333333333333';
  const chatArgs = (addr, nick, ts, extra = {}) => [addr, nick, String(ts), '', extra.online || 'False', extra.excerpt || 'hello ' + nick,
    '', String(extra.unread || 0), '', 'False', 'text', '', 'False'];
  const rows = [[A, 'Alice', now - 10], [B, 'Bob', now - 20], [C, 'Carol', now - 30]];
  const batch = () => JSON.stringify({ strs: [], items: rows.map(([a, n, t]) => ({ f: 'addChat', a: chatArgs(a, n, t) })) });
  const rowOf = (d, addr) => d.querySelector('.c-chats-list .c-chatlist-item[data-address="' + addr + '"]');
  const chatsBoot = async () => { const s = await boot(); s.push('addChats', batch()); await s.frame(); return s; };

  /* ── chats patch: the hovered row, replaced by setContactStatus / addChat, keeps its hover ── */
  await guard('#1171 chats patch', async () => {
    const s = await chatsBoot();
    const r = {};
    const b0 = rowOf(s.d, B);
    s.hoverOn(b0);
    s.push('setContactStatus', B, 'True', '2', '', '0');           // presence + unread tick → patchChatRows
    await s.frame();
    const b1 = rowOf(s.d, B);
    r.replaced = !!b1 && b1 !== b0;                                 // the patch path really replaced the node
    r.statusCarries = !!b1 && (b1 === b0 || b1.hasAttribute('data-hover'));
    r.othersClean = !rowOf(s.d, A).hasAttribute('data-hover') && !rowOf(s.d, C).hasAttribute('data-hover');
    s.push('addChat', ...chatArgs(B, 'Bob', now - 20, { excerpt: 'a newer line', online: 'True', unread: 3 }));   // same slot: excerpt/receipt edge
    await s.frame();
    const b2 = rowOf(s.d, B);
    r.addChatCarries = !!b2 && (b2 === b1 || b2.hasAttribute('data-hover'));
    r.oneMark = s.d.querySelectorAll('.c-chats-list [data-hover]').length === 1;
    ok(Object.values(r).every((v) => v === true),
      '★ #1171 (chats patch): the row under the mouse, REPLACED by a live setContactStatus / addChat (P-03 patchChatRows), is born with data-hover (the new node is not :hover until WebView2 re-hit-tests); no other row is marked — ' + JSON.stringify(r));
    try { s.dom.window.close(); } catch (e) {}
  });

  /* ── chats full flush: the surviving hovered row keeps its hover through a full re-render ── */
  await guard('#1171 chats flush', async () => {
    const s = await chatsBoot();
    s.hoverOn(rowOf(s.d, C));
    const c0 = rowOf(s.d, C);
    s.push('addChats', batch());                                     // a full flush: textContent = '' + rebuild
    await s.frame();
    const c1 = rowOf(s.d, C);
    const r = { replaced: !!c1 && c1 !== c0, carries: !!c1 && c1.hasAttribute('data-hover'),
      othersClean: !rowOf(s.d, A).hasAttribute('data-hover') && !rowOf(s.d, B).hasAttribute('data-hover') };
    ok(Object.values(r).every((v) => v === true),
      '★ #1171 (chats flush): a full chats re-render (addChats) rebuilds the hovered row with data-hover, and only that row — ' + JSON.stringify(r));
    try { s.dom.window.close(); } catch (e) {}
  });

  /* ── chats pointer-leave: the mark goes when the mouse leaves; a non-hovered row is never marked ── */
  await guard('#1171 chats leave', async () => {
    const s = await chatsBoot();
    const r = {};
    s.hoverOn(rowOf(s.d, B));
    s.push('setContactStatus', B, 'True', '0', '', '0');
    await s.frame();
    const b1 = rowOf(s.d, B);
    r.marked = b1.hasAttribute('data-hover');
    s.ptr(b1, 'pointerleave');                                       // the row's own pointerleave
    r.leaveClears = !b1.hasAttribute('data-hover');
    // the mouse goes off the list entirely: the next replace must NOT mark the row
    s.ptr(b1, 'pointerout', { relatedTarget: s.d.body });          // (a real browser also sends the list a pointerleave; the pointerout alone must do)
    s.push('setContactStatus', B, 'False', '0', '', '0');
    await s.frame();
    r.offListNoMark = !rowOf(s.d, B).hasAttribute('data-hover');
    // the mouse is on A, B is the row that updates → B is not marked
    s.hoverOn(rowOf(s.d, A));
    s.push('setContactStatus', B, 'True', '1', '', '0');
    await s.frame();
    r.nonHoveredClean = !rowOf(s.d, B).hasAttribute('data-hover');
    // a carried mark is dropped when the mouse moves onto another row
    s.hoverOn(rowOf(s.d, B));
    s.push('setContactStatus', B, 'True', '2', '', '0');
    await s.frame();
    const bm = rowOf(s.d, B);
    const markedAgain = bm.hasAttribute('data-hover');
    s.hoverOn(rowOf(s.d, C));
    r.moveAwayClears = markedAgain && !bm.hasAttribute('data-hover');
    ok(Object.values(r).every((v) => v === true),
      '★ #1171 (chats leave): pointerleave on the carried row clears data-hover; after the mouse leaves the list a replace marks nothing; a row the mouse is NOT on gets no data-hover; moving onto another row drops the carried mark — ' + JSON.stringify(r));
    try { s.dom.window.close(); } catch (e) {}
  });

  /* ── chats focus: a keyboard-focused row keeps the focus across its replace ── */
  await guard('#1171 chats focus', async () => {
    const s = await chatsBoot();
    const b0 = rowOf(s.d, B);
    b0.focus();
    const had = s.d.activeElement === b0;
    s.push('setContactStatus', B, 'True', '4', '', '0');
    await s.frame();
    const b1 = rowOf(s.d, B);
    const r = { had, replaced: b1 !== b0, focused: s.d.activeElement === b1 };
    /* #46 r1 MINOR-2: the FULL flush hands the focus on too (only the patch path was pinned) */
    s.push('addChats', batch());
    await s.frame();
    const b2 = rowOf(s.d, B);
    r.flushReplaced = b2 !== b1;
    r.flushFocused = s.d.activeElement === b2;
    /* #46 r1 m1: a document WITHOUT focus (desktop: typing in the chat pane's own WebView) never takes it back */
    s.W.__docFocus = false;
    s.push('setContactStatus', B, 'True', '5', '', '0');
    await s.frame();
    const b3 = rowOf(s.d, B);
    r.unfocusedDocLeft = b3 !== b2 && s.d.activeElement !== b3;
    ok(Object.values(r).every((v) => v === true),
      '★ #1171 (chats focus): the focused row, replaced by a live tick OR a full flush, hands the keyboard focus to its replacement (it fell to <body>); a document without focus never takes it (desktop panes are separate WebViews) — ' + JSON.stringify(r));
    try { s.dom.window.close(); } catch (e) {}
  });

  /* ── CSS: [data-hover] paints like :hover, inside the same (hover: hover) guard, for the chat and tx rows ── */
  await guard('#1171 CSS rules', async () => {
    const s = await boot();
    const found = { chat: false, tx: false, chatHover: '', txHover: '' };
    const bgs = { chat: '', tx: '' };
    const walk = (list, inHover) => {
      for (const rule of Array.from(list || [])) {
        if (rule.cssRules && rule.media) { walk(rule.cssRules, inHover || /hover:\s*hover/.test(rule.media.mediaText || rule.conditionText || '')); continue; }
        if (!inHover || !rule.selectorText) continue;
        const sel = rule.selectorText.trim();
        const bg = rule.style ? rule.style.getPropertyValue('background-color') : '';
        if (sel === '.c-chatlist-item:hover:not([aria-current]):not([data-pinned])') found.chatHover = bg;
        if (sel === '.c-chatlist-item[data-hover]:not([aria-current]):not([data-pinned])') bgs.chat = bg;
        if (sel === '.c-txlist-item:hover:not([aria-current])') found.txHover = bg;
        if (sel === '.c-txlist-item[data-hover]:not([aria-current])') bgs.tx = bg;
      }
    };
    for (const sh of Array.from(s.d.styleSheets)) { try { walk(sh.cssRules, false); } catch (e) { /* cross-origin */ } }
    found.chat = !!bgs.chat && bgs.chat === found.chatHover && /surface-interactive-hover/.test(bgs.chat);
    found.tx = !!bgs.tx && bgs.tx === found.txHover && /surface-interactive-hover/.test(bgs.tx);
    ok(found.chat && found.tx,
      '★ #1171 (CSS): the built shell paints .c-chatlist-item[data-hover] and .c-txlist-item[data-hover] exactly like their :hover (same :not() guards, the same --surface-interactive-hover paint), inside @media (hover: hover) — ' + JSON.stringify(found));
    try { s.dom.window.close(); } catch (e) {}
  });

  /* ── wallet: an addPaymentActivity re-render keeps the hovered tx row's hover ── */
  await guard('#1171 wallet', async () => {
    const s = await boot();
    const T1 = 'tx1hover0000000000000000000000000000000000000', T2 = 'tx2hover0000000000000000000000000000000000000', T3 = 'tx3hover000000000000000000000000000000000000';
    // C# re-sends the whole list on a change: clearPaymentActivity · addPaymentActivity×N · clearPaymentActivityDone
    const flush = (txs) => {
      s.push('clearPaymentActivity', 'all');
      for (const t of txs) s.push('addPaymentActivity', ...t);
      s.push('clearPaymentActivityDone');
    };
    const tx1 = [T1, '1', A, String(now - 100), '1.00000000', '', 'true'], tx2 = [T2, '0', B, String(now - 200), '2.00000000', '', 'false'];
    flush([tx1, tx2]);
    await s.frame();
    const txRow = (t) => s.d.querySelector('.c-txlist-item[data-txid="' + t + '"]');
    const t0 = txRow(T2);
    const r = { rows: !!txRow(T1) && !!t0 };
    if (t0) s.hoverOn(t0);
    flush([[T3, '1', C, String(now - 50), '3.00000000', '', 'true'], tx1, tx2]);   // a new payment → the full re-render
    await s.frame();
    const t1 = txRow(T2);
    r.replaced = !!t1 && t1 !== t0;
    r.carries = !!t1 && t1.hasAttribute('data-hover');
    r.othersClean = !!txRow(T1) && !txRow(T1).hasAttribute('data-hover') && !!txRow(T3) && !txRow(T3).hasAttribute('data-hover');
    ok(Object.values(r).every((v) => v === true),
      '★ #1171 (wallet): the tx row under the mouse, rebuilt by an addPaymentActivity re-render, is born with data-hover; the other rows are not — ' + JSON.stringify(r));
    try { s.dom.window.close(); } catch (e) {}
  });

  /* ── contacts: a roster re-flush keeps the hovered picker row's hover ── */
  await guard('#1171 contacts', async () => {
    const s = await boot();
    const people = [[A, 'Alice'], [B, 'Bob'], [C, 'Carol']];
    const roster = () => JSON.stringify({ strs: [], items: people.map(([a, n]) => ({ f: 'addContact', a: [a, n, '', 'False', '0', 'contact', ''] })) });
    s.push('addContacts', roster());
    await sleep(200);
    s.d.getElementById('fab').click();
    await sleep(400);
    const rowFor = (a) => s.d.querySelector('.c-contacts__row[data-address="' + a + '"]');
    const p0 = rowFor(B);
    const r = { open: !!p0 };
    if (p0) s.hoverOn(p0);
    s.push('addContacts', roster());                                 // the directory re-flush (80 ms debounce) → setPickerContacts
    await sleep(300);
    const p1 = rowFor(B);
    r.replaced = !!p1 && p1 !== p0;
    r.carries = !!p1 && p1.hasAttribute('data-hover');
    r.othersClean = !!rowFor(A) && !rowFor(A).hasAttribute('data-hover');
    ok(Object.values(r).every((v) => v === true),
      '★ #1171 (contacts): the picker row under the mouse, rebuilt by a roster re-flush, is born with data-hover; the other rows are not — ' + JSON.stringify(r));
    try { s.dom.window.close(); } catch (e) {}
  });
}
