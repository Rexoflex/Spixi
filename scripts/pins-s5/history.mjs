/* ==== SESSION 5b — ★ #1166 HISTORY: B2 lazy history (#1142) · #1151 smooth show-in-chat · NIT-2 ====
 * The shell half is EXECUTED on the BUILT chat.html (jsdom + a fake layout: every direct child of #messages is 100 px
 * tall, the log is 600 px high — jsdom has no layout of its own). The C# half is MAUI-only and compiles nowhere here →
 * source pins on stripCode text, plus the #354 window walk EXECUTED with the real Config.messagesToLoad (L73).
 * Deliberate breaks (#802) are listed in the session hand-back, one per pin. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');

  /* ───────────── the shell, executed ───────────── */
  const f = join(root, 'Spixi/Resources/Raw/html/chat.html');
  const errs = [];
  let navs = 0;   // blocked ixian: navigations — jsdom cannot expose the URL, so a COUNT of bridge sends (the #804 note)
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { const m = String(e.message); if (/navigation/i.test(m)) navs += 1; else errs.push(m); });
  let reduce = false;
  const dom = new JSDOM(readFileSync(f, 'utf8'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: reduce && /reduced-motion: reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    },
  });
  await sleep(2000);
  const W = dom.window;
  const d = W.document;
  const box = d.getElementById('messages');
  /* the fake layout */
  const ROW = 100, H = 600;
  Object.defineProperty(box, 'clientHeight', { configurable: true, get: () => H });
  Object.defineProperty(box, 'scrollHeight', { configurable: true, get: () => box.children.length * ROW });
  const realRect = W.Element.prototype.getBoundingClientRect;
  W.Element.prototype.getBoundingClientRect = function () {
    if (this === box) return { top: 0, bottom: H, height: H, left: 0, right: 400, width: 400, x: 0, y: 0 };
    let el = this;
    while (el && el.parentElement !== box) el = el.parentElement;
    if (!el) return realRect.call(this);
    const top = [...box.children].indexOf(el) * ROW - box.scrollTop;
    return { top, bottom: top + ROW, height: ROW, left: 0, right: 400, width: 400, x: 0, y: top };
  };
  const scrollTo = (y) => { box.scrollTop = y; box.dispatchEvent(new W.Event('scroll')); };
  const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
  const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
  const T0 = Math.floor(Date.now() / 1000) - 7200;
  const them = (id, text, ts, read = 'True') => ({ f: 'addThem', a: [id, 'addrPeer', 'Bob', '', text, String(ts), 'True', 'True', read, 'False', 'False'] });
  const rowEl = (id) => box.querySelector('[data-msgid="' + id + '"]');
  const msgRows = () => box.querySelectorAll('[data-msgid]').length;
  const firstVisible = () => {
    for (const el of box.querySelectorAll('[data-msgid]')) { const r = el.getBoundingClientRect(); if (r.bottom > 0) return { id: el.dataset.msgid, top: r.top }; }
    return null;
  };
  const badge = () => { const b = d.querySelector('.c-scroll-latest__badge'); return b ? b.textContent : ''; };

  /* the open: 60 rows, the newest three unread (the A3 divider) */
  push('onChatScreenReady', 'addrPeer');
  const tOpen = Date.now();
  push('clearMessages', 'true');
  const open = [];
  for (let i = 0; i < 60; i++) open.push(them('n' + (100 + i), 'row ' + i, T0 + i * 60, i >= 57 ? 'False' : 'True'));
  push('addMessages', JSON.stringify({ strs: [], items: open }), 'append');
  push('messagesDone');
  push('onChatScreenLoaded');
  await sleep(2300);   // the open's bootRepin (2 s)

  navs = 0;   // the open's own sends (read receipts, the boot asks) are not this pin's
  const lazy = {};
  /* the trigger: far from the top → nothing; near the top → ONE loadmore, a loading row, no second send in flight */
  scrollTo(4000);
  await sleep(50);
  lazy.farSilent = navs === 0 && !box.querySelector('.chat-older .c-history-loading');
  lazy.idleNoPill = !!box.querySelector('.chat-older.chat-older--idle') && !box.querySelector('.chat-older__btn');
  /* a live arrival while scrolled up counts on the chevron (after the N53 5 s quiet window of the open's clearMessages) */
  await sleep(Math.max(0, 5300 - (Date.now() - tOpen)));
  push('addThem', 'n160', 'addrPeer', 'Bob', '', 'live', String(T0 + 3700), 'True', 'True', 'False', 'False', 'False');
  await sleep(80);
  const before = { badge: badge(), dividerNext: (d.querySelector('.c-unread-divider') || {}).nextElementSibling };
  scrollTo(300);
  await sleep(30);
  scrollTo(250);
  await sleep(30);
  lazy.nearFiresOnce = navs === 1 && !!box.querySelector('.chat-older .c-history-loading[role="status"]');
  const anchor = firstVisible();
  const n100 = rowEl('n100');
  const n100Text = n100 ? n100.textContent : null;

  /* C# answers with the OLDER slice only: 20 rows + one id already shown (stale copy) — no clearMessages */
  const older = [];
  for (let i = 0; i < 20; i++) older.push(them('o' + i, 'older ' + i, T0 - 3000 + i * 60));
  older.push(them('n100', 'STALE COPY', T0));
  push('addMessages', JSON.stringify({ strs: [], items: older }), 'prepend');
  push('messagesDone', 'true');
  await sleep(80);
  const after = firstVisible();
  const anchored = anchor && rowEl(anchor.id);
  const b2 = {
    anchorKept: !!anchor && !!anchored && Math.abs(anchored.getBoundingClientRect().top - anchor.top) < 1,
    notCleared: msgRows() === 81 && !!rowEl('n159') && !!rowEl('n160'),
    olderFirst: box.querySelector('[data-msgid]').dataset.msgid === 'o0',
    dedupe: box.querySelectorAll('[data-msgid="n100"]').length === 1 && rowEl('n100').textContent === n100Text && !/STALE/.test(box.textContent),
    dividerKept: !!d.querySelector('.c-unread-divider') && d.querySelectorAll('.c-unread-divider').length === 1
      && !!before.dividerNext && d.querySelector('.c-unread-divider').nextElementSibling.dataset.msgid === before.dividerNext.dataset.msgid,
    unreadKept: before.badge === '1' && badge() === '1',
    loadingEnded: !box.querySelector('.c-history-loading') && !!box.querySelector('.chat-older--idle'),
    noRefire: navs === 1,
    noErrors: errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0,
  };
  ok(Object.values(b2).every((v) => v === true),
    '★★ #1166 B2 EXECUTED (built chat shell): a load-more PREPEND (addMessages "prepend" + messagesDone(show_more), no clearMessages) keeps the FIRST VISIBLE row at its exact offset, wipes nothing, lands the older rows first, skips an id already shown (its live copy stays), and leaves the unread state alone (the A3 divider on its row, the chevron count) — ' + JSON.stringify({ ...b2, anchor, after }) + ' errs: ' + errs.slice(0, 2).join(' | '));

  /* the end of history: a prepend answer with "False" — the trigger stands down, the secure notice marks the start */
  scrollTo(100);
  await sleep(30);
  lazy.refiresNearTop = navs === 2;
  push('addMessages', JSON.stringify({ strs: [], items: [them('o-x', 'oldest', T0 - 4000)] }), 'prepend');
  push('messagesDone', 'false');
  await sleep(60);
  scrollTo(0);
  await sleep(30);
  lazy.endStops = navs === 2 && !box.querySelector('.chat-older') && !!box.querySelector('.c-sysnotice');
  ok(Object.values(lazy).every((v) => v === true),
    '★★ #1166 B2 EXECUTED: the scroll trigger (attachLazyHistory) — far from the top nothing; within ~one screen of the top ONE ixian:loadmore with a loading row (role=status), never a second while it is in flight; at rest no pill; after an answer it fires again near the top; a "False" end-of-history answer stops it and shows the secure notice — ' + JSON.stringify(lazy));

  /* the pill: reduced motion + the retry after no answer */
  const pill = {};
  push('messagesDone', 'true');          // more exists again (a prepend answer with no rows)
  reduce = true;
  push('messagesDone', 'true');          // repaint under reduced motion
  await sleep(40);
  scrollTo(50);
  await sleep(30);
  pill.reducedIsPill = navs === 2 && !!box.querySelector('.chat-older__btn:not([disabled])');
  reduce = false;
  push('messagesDone', 'true');
  await sleep(40);
  scrollTo(400); scrollTo(60);
  await sleep(30);
  pill.lazyAgain = navs === 3;
  await sleep(8300);                     // no answer: the 8 s guard
  scrollTo(20);
  await sleep(30);
  const retry = box.querySelector('.chat-older__btn:not([disabled])');
  pill.retryPill = !!retry && navs === 3;
  if (retry) retry.click();
  await sleep(30);
  pill.retryTap = navs === 4;
  push('addMessages', JSON.stringify({ strs: [], items: [them('o-r', 'retried', T0 - 5000)] }), 'prepend');   // ★ #46 r1 re-base: an EMPTY answer is now the retry pill (M3) — answer with a row
  push('messagesDone', 'true');          // the retry is answered → back to the lazy mode
  await sleep(40);
  pill.backToLazy = !!box.querySelector('.chat-older--idle') && !box.querySelector('.chat-older__btn');
  ok(Object.values(pill).every((v) => v === true),
    '★★ #1166 B2 EXECUTED: the pill stays ONLY as the reduced-motion form (no scroll trigger) and as the RETRY after 8 s without an answer (the trigger stands down until it is tapped); an answer returns to the lazy mode — ' + JSON.stringify(pill));

  /* #1151: smooth only for a LOADED row within ~3 screens; instant otherwise; the bottom re-pins hold off */
  const jump = {};
  let how = [];
  W.Element.prototype.scrollIntoView = function (o) { how.push(o && o.behavior); };
  await sleep(950);
  const bottom = () => box.scrollHeight - H;
  box.scrollTop = bottom();
  const ids = [...box.querySelectorAll('[data-msgid]')].map((e) => e.dataset.msgid);
  const near = ids[ids.length - 12];      // ~ 2 screens above the bottom
  push('jumpToMessage', near);
  await sleep(40);
  jump.nearSmooth = how.join() === 'smooth';
  const pinnedAt = box.scrollTop;
  push('addThem', 'n161', 'addrPeer', 'Bob', '', 'live 2', String(T0 + 3800), 'True', 'True', 'False', 'False', 'False');
  await sleep(120);                       // its rAF render ran inside the hold
  jump.noRepinFight = box.scrollTop === pinnedAt && box.scrollHeight - box.scrollTop - H > 50;
  await sleep(950);
  how = [];
  box.scrollTop = bottom();
  push('jumpToMessage', 'o0');            // far (> 3 screens)
  await sleep(40);
  jump.farInstant = how.join() === 'auto';
  how = [];
  box.scrollTop = bottom();
  W.jumpToMessage(near, true);            // the fresh-open call (onChatScreenLoaded) — always instant
  await sleep(40);
  jump.freshInstant = how.join() === 'auto';
  how = [];
  reduce = true;
  push('jumpToMessage', near);
  await sleep(40);
  reduce = false;
  jump.reducedInstant = how.join() === 'auto';
  how = [];
  push('jumpToMessage', 'nope');
  await sleep(120);
  jump.missingToast = how.length === 0 && !!d.querySelector('.c-toast');
  const code = stripCode(rd('src/shells/chat.html'));
  jump.oneConstant = (code.match(/const SMOOTH_JUMP = true;/g) || []).length === 1 && /if \(!SMOOTH_JUMP \|\| !row\) return false;/.test(code);
  jump.noErrors = errs.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
  ok(Object.values(jump).every((v) => v === true),
    '★★ #1166 #1151 EXECUTED: "show in chat" scrolls SMOOTHLY to a loaded row within ~3 screens and the bottom re-pin does not fight it (a live arrival during the scroll leaves the position alone); a far row, the fresh-open call and reduced motion are instant; an unloaded id toasts; one SMOOTH_JUMP constant switches it off — ' + JSON.stringify(jump) + ' errs: ' + errs.slice(0, 2).join(' | '));
  try { dom.window.close(); } catch (e) {}

  /* ───────────── #46 r1 (M1 · M2 · M3 · N4), executed: a fresh document whose idle wrapper is 0 px tall ───────────── */
  {
    const errs2 = [];
    let navs2 = 0;
    const vc2 = new VirtualConsole();
    vc2.on('jsdomError', (e) => { const m = String(e.message); if (/navigation/i.test(m)) navs2 += 1; else errs2.push(m); });
    const dom2 = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc2,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      },
    });
    await sleep(2000);
    const W2 = dom2.window;
    const d2 = W2.document;
    const bx = d2.getElementById('messages');
    const hOf = (el) => (el.classList.contains('chat-older--idle') ? 0 : ROW);
    Object.defineProperty(bx, 'clientHeight', { configurable: true, get: () => H });
    Object.defineProperty(bx, 'scrollHeight', { configurable: true, get: () => [...bx.children].reduce((a, c) => a + hOf(c), 0) });
    const real2 = W2.Element.prototype.getBoundingClientRect;
    W2.Element.prototype.getBoundingClientRect = function () {
      if (this === bx) return { top: 0, bottom: H, height: H, left: 0, right: 400, width: 400, x: 0, y: 0 };
      let el = this;
      while (el && el.parentElement !== bx) el = el.parentElement;
      if (!el) return real2.call(this);
      let top = -bx.scrollTop;
      for (const c of bx.children) { if (c === el) break; top += hOf(c); }
      return { top, bottom: top + hOf(el), height: hOf(el), left: 0, right: 400, width: 400, x: 0, y: top };
    };
    W2.Element.prototype.scrollIntoView = function () {};
    const push2 = (fn, ...a) => W2.executeUiCommand(W2[fn], ...a.map(b64));
    const fv2 = () => { for (const el of bx.querySelectorAll('[data-msgid]')) { const r = el.getBoundingClientRect(); if (r.bottom > 0) return { id: el.dataset.msgid, top: r.top }; } return null; };
    push2('onChatScreenReady', 'addrPeer');
    push2('clearMessages', 'true');
    const rows2 = [];
    for (let i = 0; i < 60; i++) rows2.push(them('m' + (100 + i), 'row ' + i, T0 + i * 60));
    push2('addMessages', JSON.stringify({ strs: [], items: rows2 }), 'append');
    push2('messagesDone');
    push2('onChatScreenLoaded');
    await sleep(2300);
    navs2 = 0;
    const r1 = {};
    /* M2: the loading row (100 px here) appears ABOVE the reader — the position must not move */
    bx.scrollTop = 250;
    const a0 = fv2();
    bx.dispatchEvent(new W2.Event('scroll'));
    await sleep(30);
    const a1 = fv2();
    r1.m2Fired = navs2 === 1 && !!bx.querySelector('.chat-older .c-history-loading');
    r1.m2GrowKept = !!a0 && !!a1 && a0.id === a1.id && a0.top === a1.top;
    /* M3: an EMPTY slice while C# still says "more" → the retry pill (never a dead top) */
    push2('messagesDone', 'true');
    await sleep(60);
    const a2 = fv2();
    r1.m3RetryPill = !!bx.querySelector('.chat-older__btn:not([disabled])');
    r1.m2EmptyKept = !!a2 && a2.id === a0.id && a2.top === a0.top;
    /* N4: tap retry, no answer for 8 s (the guard) — then a LATE answer re-arms the scroll trigger */
    const rb = bx.querySelector('.chat-older__btn'); if (rb) rb.click();
    await sleep(8300);
    const late = [];
    for (let i = 0; i < 5; i++) late.push(them('l' + i, 'late ' + i, T0 - 900 + i * 60));
    push2('addMessages', JSON.stringify({ strs: [], items: late }), 'prepend');
    push2('messagesDone', 'true');
    await sleep(60);
    r1.n4Idle = !!bx.querySelector('.chat-older--idle') && !bx.querySelector('.chat-older__btn');
    const nBefore = navs2;
    bx.scrollTop = 50; bx.dispatchEvent(new W2.Event('scroll'));
    await sleep(30);
    r1.n4Rearmed = navs2 === nBefore + 1;
    push2('messagesDone', 'true');        // answer it (no rows → the retry pill again, M3)
    await sleep(60);
    push2('addMessages', JSON.stringify({ strs: [], items: [them('k0', 'older', T0 - 2000)] }), 'prepend');
    push2('messagesDone', 'true');        // a late answer → lazy again (N4)
    await sleep(60);
    /* M1: a smooth show-in-chat that passes through the top band must not fire a loadmore mid-animation */
    const nearTop = bx.querySelectorAll('[data-msgid]')[3].dataset.msgid;
    bx.scrollTop = 700;
    push2('jumpToMessage', nearTop);
    await sleep(30);
    const nJump = navs2;
    bx.scrollTop = 40; bx.dispatchEvent(new W2.Event('scroll'));
    await sleep(30);
    r1.m1NoFireMidJump = navs2 === nJump && !bx.querySelector('.c-history-loading');
    await sleep(950);
    bx.scrollTop = 30; bx.dispatchEvent(new W2.Event('scroll'));
    await sleep(30);
    r1.m1FiresAfter = navs2 === nJump + 1;
    r1.noErrors = errs2.filter((e) => /ReferenceError|TypeError|dispatch failed/.test(e)).length === 0;
    ok(Object.values(r1).every((v) => v === true),
      '★★ #1166 #46 r1 EXECUTED (built chat shell): M2 the loading row that grows above the reader is compensated (and an empty answer keeps the position); M3 an empty slice with more to come shows the retry pill; N4 an answer after the 8 s guard re-arms the scroll trigger; M1 no loadmore fires during a smooth show-in-chat, only after it — ' + JSON.stringify({ ...r1, a0, a1, a2 }) + ' errs: ' + errs2.slice(0, 2).join(' | '));
    try { dom2.window.close(); } catch (e) {}
  }

  /* ───────────── the C# half (MAUI-only → source pins, comments stripped) ───────────── */
  const sc = stripCode(rd('Spixi/Pages/Chat/SingleChatPage.xaml.cs'));
  const between = (a, b) => { const i = sc.indexOf(a); const j = i < 0 ? -1 : sc.indexOf(b, i + a.length); return i < 0 || j < 0 ? '' : sc.slice(i, j); };

  /* (C1) onLoadMore: Core's window still grows through the #354 step, then the answer is a prepend — EXECUTED with Config's value */
  {
    const olm = between('private void onLoadMore()', 'private sealed class HistoryAnchor');
    const cfg = stripCode(rd('Spixi/Meta/Config.cs'));
    const step = Number((/public static uint messagesToLoad = (\d+);/.exec(cfg) || [])[1]);
    const decl = /private uint messagesToShow = Config\.messagesToLoad;/.test(sc);
    /* the walk, as the code does it: want += step; want == 100 → += step; loadMessages reads want + 1 (100 → 101) */
    const wants = []; const windows = [];
    let want = step;
    for (let p = 0; p < 12; p++) { want += step; if (want === 100) want += step; wants.push(want); let w = want + 1; if (w === 100) w++; windows.push(w); }
    const r = {
      shape: /private void onLoadMore\(\)\s*\{\s*messagesToShow \+= Config\.messagesToLoad;\s*if \(messagesToShow == 100\)\s*\{\s*messagesToShow \+= Config\.messagesToLoad;\s*\}\s*requestPrepend\(\);\s*loadMessages\(\);\s*\}/.test(olm),
      decl,
      realStep: step > 0 && step % 1 === 0,
      walkNever100: !wants.includes(100) && !windows.includes(100) && wants.every((x, i) => i === 0 || x > wants[i - 1]),
      takeBound: /private bool takePrepend\(\)\s*\{\s*int t = Interlocked\.Exchange\(ref prependOnThread, 0\);\s*return t != 0 && t == Environment\.CurrentManagedThreadId;\s*\}/.test(sc)
        && /private void requestPrepend\(\)\s*\{\s*Interlocked\.Exchange\(ref prependOnThread, Environment\.CurrentManagedThreadId\);\s*\}/.test(sc),
      oneRequestSiteEach: (sc.match(/requestPrepend\(\);/g) || []).length === 2 && (sc.match(/takePrepend\(\)/g) || []).length === 2,
    };
    ok(Object.values(r).every(Boolean),
      '★★ #1166 B2 C# (1): onLoadMore still GROWS Core\'s window (+Config.messagesToLoad = ' + step + ', the #354 step over exactly 100 — walk ' + wants.slice(0, 4).join('→') + '…, read windows never 100) and only then asks for a prepend answer; the request is bound to the calling thread (another thread\'s load clears it and re-flushes) — ' + JSON.stringify(r));
  }

  /* (C2) loadMessages: the P0 guard + the #907 window run unchanged; a prepend sends ONLY the rows older than the anchor, inside the lock */
  {
    const lm = (/public void loadMessages\(\)\s*\{([\s\S]*?)\n        \}\n/.exec(sc) || [])[1] || '';
    const i = (s) => lm.indexOf(s);
    const iTake = i('bool prepend = takePrepend();');
    const iBefore = i('CoreMessageWriter.arrivals.beforeReread(arrivalKey, readChannel, CoreMessageWriter.instance);');
    const iRead = i('messages = friend.getMessages(readChannel, window);');
    const iAfter = i('CoreMessageWriter.arrivals.afterReread(');
    const iEmpty = i('historyAnchor = null;');
    const iLock = lm.indexOf('lock (messages)', iEmpty);
    const iAnchor = i('if (anchorId != null && messages.Exists(m => m.id != null && m.id.SequenceEqual(anchorId)))');
    const iBreak = i('if (prependUntil != null && message.id != null && message.id.SequenceEqual(prependUntil))');
    const iNothing = i('if (rendersNothing(message))');
    const iSkip = i('if (skip_messages > 0)');
    const iFirst = i('firstPushedId = message.id;');
    const iPre = i('Utils.sendUiCommand(this, "addMessages", json, "prepend");');
    const iPreDone = i('Utils.sendUiCommand(this, "messagesDone", show_more);');
    const preBranch = (/else\s*\{\s*if \(json != null\)\s*\{\s*Utils\.sendUiCommand\(this, "addMessages", json, "prepend"\);\s*\}\s*Utils\.sendUiCommand\(this, "messagesDone", show_more\);\s*pushPendingJump\(\);\s*\}/.exec(lm) || [''])[0];
    const r = {
      takenFirst: /applyPendingJumpWindow\(false\);\s*bool prepend = takePrepend\(\);\s*int want = \(int\)messagesToShow;/.test(lm),
      p0Order: iTake > 0 && iTake < iBefore && iBefore < iRead && iRead < iAfter && iAfter < iEmpty,
      anchorInLock: iLock > 0 && iAnchor > iLock && /HistoryAnchor\? anchor = historyAnchor;\s*byte\[\]\? anchorId = anchor != null && anchor\.channel == readChannel \? anchor\.id : null;/.test(lm)
        && /\{\s*prependUntil = anchorId;\s*\}\s*else\s*\{\s*prepend = false;\s*\}/.test(lm),
      noUnreadOnPrepend: /if \(!prepend && friend\.metaData\.unreadMessageCount > 0\)/.test(lm) && /if \(!prepend\)\s*\{\s*clearReactionFlag\(\);\s*\}/.test(lm) && (lm.match(/clearReactionFlag\(\)/g) || []).length === 1,
      stopsAtAnchor: iBreak > iAnchor && iBreak < iNothing && iNothing < iSkip && iSkip < iFirst && /SequenceEqual\(prependUntil\)\)\s*\{\s*break;\s*\}/.test(lm),
      anchorNext: /if \(firstPushedId != null\)\s*\{\s*historyAnchor = new HistoryAnchor\(firstPushedId, readChannel\);\s*\}\s*else if \(!prepend\)\s*\{\s*historyAnchor = null;\s*\}/.test(lm),
      prependBranch: preBranch.length > 0 && !/clearMessages/.test(preBranch) && iPre > iLock && iPreDone > iPre,
      fullBranch: /if \(!prepend\)\s*\{\s*Utils\.sendUiCommand\(this, "clearMessages", show_more\);/.test(lm),
      insideLock: (() => { let depth = 0, j = iLock + 'lock (messages)'.length; const open = lm.indexOf('{', j); for (j = open; j < lm.length; j++) { if (lm[j] === '{') depth++; else if (lm[j] === '}') { depth--; if (depth === 0) break; } } return iPreDone < j; })(),
    };
    ok(Object.values(r).every(Boolean),
      '★★ #1166 B2 C# (2): loadMessages takes the prepend request first, then runs the WHOLE read (the #1160 P0 guard order beforeReread → read → afterReread intact); inside `lock (messages)` a prepend checks the anchor (the oldest row handed out by the last load, same channel) — absent → the full re-flush — stops AT it before the tombstone and skip tests, never zeroes unread or the reaction flag, and pushes addMessages(json, "prepend") + messagesDone(show_more) with NO clearMessages, still inside the lock — ' + JSON.stringify(r));
  }

  /* (C3) the jump: a widening jump on an OPEN chat answers as a prepend; a row already loaded gets the jump alone */
  {
    const ap = between('private void applyPendingJumpWindow(bool reload)', 'private void pushPendingJump()');
    const r = {
      widened: /messagesToShow\+\+;\s*\}\s*widened = true;\s*\}/.test(ap),
      reload: /if \(reload\)\s*\{\s*if \(widened\)\s*\{\s*requestPrepend\(\);\s*loadMessages\(\);\s*\}\s*else\s*\{\s*pushPendingJump\(\);\s*\}\s*\}/.test(ap),
      staging: /public void loadMessages\(\)\s*\{\s*applyPendingJumpWindow\(false\);/.test(sc),
    };
    ok(Object.values(r).every(Boolean),
      '★★ #1166 B2/#1151 C# (3): "show in chat" on an OPEN chat — a row past the window widens it and arrives as a position-keeping PREPEND; a row already in the window gets jumpToMessage alone (no re-render, nothing for a smooth scroll to fight); a staging page still takes the jump in its own load — ' + JSON.stringify(r));
  }

  /* (NIT-2) the #1028 comment sits on updateFileTicks, not on jumpToMessage */
  {
    const src = rd('src/shells/chat.html');
    const iC = src.indexOf('★★ #1028 (P.22): a LIVE delivery change on a sent file.');
    const iU = src.indexOf('updateFileTicks(id, sent, confirmed, read) {');
    const iJ = src.indexOf('jumpToMessage(id, instant) {');
    ok(iC > 0 && iU > iC && iJ < iC && !/[A-Za-z(]/.test(src.slice(src.indexOf('*/', iC) + 2, iU).trim()),
      '★ #1166 NIT-2: the #1028 (P.22) comment sits directly above updateFileTicks (it was above jumpToMessage)');
  }
}
