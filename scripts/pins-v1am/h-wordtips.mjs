/* ==== V1A-M (M2, Damir's dial 2026-10-15: tips ONLY "contact request" + "no phone book", style A) — THE NEW-WORD TIPS — P31 ====
 * On the BUILT home shell (jsdom, the pins-s11 a-kit: timeScale 20 → the hint settle window is 200 ms):
 *   · cap `wordtips` + setHints (off:false, done:[]) + one incoming request → ONE .c-word-tip[data-tip=wordrequest],
 *     role="note", directly under the request card (its next sibling), the English copy as text
 *   · it survives a full re-render (the SAME node, still one) and a #1166 row patch (the patch still runs: the request card
 *     node is kept — the tip steps around patchChatRows)
 *   · never beside the update card on Chats or a moment sheet: it goes, and comes back when they go
 *   · ✕ → gone at once + exactly ONE `ixian:hint:done:wordrequest`, never a `shown` verb; a re-render keeps it gone
 *   · the empty Chats state → `wordphonebook` right after the empty state's body text
 *   · off:true → none · done:["wordrequest"] → none for it · WITHOUT the cap → no .c-word-tip element anywhere (flag OFF)
 *   · ★ #46 r1: B-NIT-3 no tip while a search query is non-empty (it comes back when the query clears) · B-NIT-4 the ✕ is
 *     described by the tip's text · B-MINOR-5 a focused ✕ keeps the focus across a full re-render; ✕ moves the focus to the
 *     request card's first action / the empty state's call to action (never <body>) · B-MINOR-6 the list observer exists
 *     ONLY while a tip may come: none without the cap, none with tips off, gone once both words are done
 *   · ★ #46 r2: MINOR-2 after ✕ the focus lands on the card itself / the empty state's title, never a button · NIT-2 the
 *     give-back after a re-render happens once per user focus · MINOR-3 with the observer on, a row patch or a rows-only
 *     flush reads no place (only a record that adds a request card / the empty state, or a tip on screen or held, pumps)
 * Deliberate breaks (V1A-M HOME report):
 *   home.html setHints: `if (bridge.cap('wordtips'))` → `if (true)` (THE cap guard; #46 r1 B-MINOR-7: the second copy in
 *     pumpWordTip is gone — it hid a break of either one)                        → flagOff + noObsOff fail (a tip and an observer without the cap)
 *   home.html patchChatRowsAroundTip: call patchChatRows with the tip in place  → the patch clause fails (a full render: the card rebuilt)
 *   home.html wordTipClosed: drop the `wordTipsDoneSet.add(id)` line             → the ✕ clause fails (the tip returns on a re-render)
 *   ★ #46 r1 (one per fix):
 *   home.html pumpWordTip: drop `!(state.query || '').trim() &&`                  → searchHides fails (the tip stands on a search result)
 *   word-tip.js: drop the aria-describedby line                                   → described fails
 *   home.html pumpWordTip: drop the focus give-back after the re-insert           → focusKept fails
 *   home.html wordTipClosed: drop `if (next) next.focus(...)`                     → focusNext fails (the focus falls to <body>)
 *   ★ #46 r2 (one per fix):
 *   home.html wordTipClosed: the request spot = the card's first action button   → focusNext fails (focus on Decline)
 *   home.html pumpWordTip: keep wordTipFocus after the give-back                  → focusOnce fails (re-focus on every flush)
 *   home.html wordTipRecords: always pumpWordTip()                                → noReadsRows fails (a place read per row patch)
 *   home.html syncWordTipWatch: `const want = true`                               → noObsOff / obsGone fail (an observer with the flag OFF) */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = aKit(h);
  const now = Math.floor(Date.now() / 1000);
  const A = 'AAAwordtip1111111111111111111111111111111111111111111', B = 'BBBwordtip2222222222222222222222222222222222222222222',
    R = 'RRRwordtipreq3333333333333333333333333333333333333333';
  const chatArgs = (addr, nick, ts) => [addr, nick, String(ts), '', 'False', 'hello ' + nick, '', '0', '', 'False', 'text', '', 'False'];
  const hints = (o = {}) => JSON.stringify({ firstSeen: Date.now(), lastShown: 0, done: [], off: false, now: Date.now(), ...o });   // firstSeen now = inside the 3-day grace: no glass hint
  const flush = (s, withReq = true, withChats = true) => {
    s.push('clearChats'); s.push('clearRequests');
    if (withChats) { s.push('addChat', ...chatArgs(A, 'Alice', now - 10)); s.push('addChat', ...chatArgs(B, 'Bob', now - 40)); }
    if (withReq) s.push('addRequest', R, 'Rita', '', String(now - 20));
    s.push('clearChatsDone');
  };
  const tips = (d) => [...d.querySelectorAll('.c-word-tip')];
  const verbs = (s, re) => s.sent.filter((v) => re.test(v));
  const SETTLE = 4000 / 20;
  /* B-MINOR-6: count the MutationObservers that watch the chats list (a wrapper installed before any shell script) */
  const MO = '<script>(function(){var M=window.MutationObserver;if(!M)return;window.__moList=0;function W(cb){var o=new M(cb),ob=o.observe.bind(o),dc=o.disconnect.bind(o),n=0;'
    + 'o.observe=function(t,opt){if(t&&t.classList&&t.classList.contains("c-chats-list")){n++;window.__moList++;}return ob(t,opt);};'
    + 'o.disconnect=function(){window.__moList-=n;n=0;return dc();};return o;}W.prototype=M.prototype;window.MutationObserver=W;})();</script>';
  /* r2 MINOR-3: count the tip's place reads (list.querySelector(':scope > .c-contact-request | .c-empty-state')) */
  const QS = '<script>(function(){var q=Element.prototype.querySelector;window.__placeReads=0;Element.prototype.querySelector=function(sel){'
    + 'if(typeof sel==="string"&&/^:scope > \\.c-(contact-request|empty-state)$/.test(sel))window.__placeReads++;return q.call(this,sel);};})();</script>';
  const html = (t) => t.replace('<head>', '<head>' + MO + QS);
  let s = null;
  const close = () => { if (s) { s.close(); s = null; } };
  const R1 = {};
  try {
    /* —— ON: the request tip —— */
    s = await K.boot('index.html', { timeScale: 20, html });
    let { d, W } = s;
    s.push('setCaps', 'composeSend,hints,updateHelp,wordtips');
    s.push('setHints', hints());
    flush(s);
    await K.sleep(SETTLE + 200);
    const list = d.querySelector('.c-chats-list');
    let t = tips(d);
    const card = d.querySelector('.c-chats-list .c-contact-request');
    R1.one = t.length === 1 && t[0].dataset.tip === 'wordrequest' && t[0].getAttribute('role') === 'note';
    R1.obsOn = W.__moList === 1;
    R1.underCard = !!card && card.nextElementSibling === t[0] && t[0].parentNode === list;
    R1.copy = (t[0] && t[0].querySelector('.c-word-tip__text') || {}).textContent === 'A contact request means someone wants to chat with you. You choose: accept or decline.'
      && (t[0] && t[0].querySelector('button.c-word-tip__close') || { getAttribute: () => '' }).getAttribute('aria-label') === 'Close';
    const node0 = t[0];
    /* a full re-render (a flush) — the SAME node back under the new card, still one */
    flush(s);
    await K.sleep(60);
    t = tips(d);
    R1.rerender = t.length === 1 && t[0] === node0 && d.querySelector('.c-chats-list .c-contact-request').nextElementSibling === node0;
    /* a row patch (a status tick for Bob): the patch still runs — the request card node is kept, the tip stays */
    const card1 = d.querySelector('.c-chats-list .c-contact-request');
    const alice1 = d.querySelector('.c-chats-list .c-chatlist-item[data-address="' + A + '"]');
    s.push('setContactStatus', B, 'True', '2', '', '0');
    await K.sleep(80);
    R1.patch = d.querySelector('.c-chats-list .c-contact-request') === card1
      && d.querySelector('.c-chats-list .c-chatlist-item[data-address="' + A + '"]') === alice1
      && tips(d).length === 1 && card1.nextElementSibling === node0;
    /* the update card on Chats holds it back; its × brings it back */
    s.push('showWarning', 'New version of Spixi (9.9.9) is available. Please update for best experience.');
    await K.sleep(60);
    R1.updateHolds = !!d.querySelector('.chats-cards .c-glass-card') && tips(d).length === 0;
    const ux = d.querySelector('.chats-cards .c-glass-card .c-glass-card__close');
    if (ux) ux.click();
    await K.sleep(60);
    R1.updateGoneBack = tips(d).length === 1;
    /* a moment sheet holds it back too */
    W.Spixi.showMomentSheet({ id: 'pay', host: d.body, strings: {}, onClose: () => {} });
    await K.sleep(60);
    R1.momentHolds = tips(d).length === 0;
    d.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await K.sleep(700);
    R1.momentGoneBack = tips(d).length === 1;
    /* B-NIT-4: the ✕ is described by the tip's text */
    const tipNow = tips(d)[0];
    const xx = tipNow && tipNow.querySelector('.c-word-tip__close');
    R1.described = !!xx && !!xx.getAttribute('aria-describedby') && xx.getAttribute('aria-describedby') === tipNow.querySelector('.c-word-tip__text').id
      && xx.getAttribute('aria-label') === 'Close';
    /* B-NIT-3: a search query hides it; clearing the query brings it back */
    const q = d.querySelector('.c-chats-header input');
    const typeQ = (v) => { q.value = v; q.dispatchEvent(new W.Event('input', { bubbles: true })); };
    if (q) typeQ('Rit');
    await K.sleep(60);
    R1.searchHides = !!q && !!d.querySelector('.c-chats-list .c-contact-request') && tips(d).length === 0;
    if (q) typeQ('');
    await K.sleep(60);
    R1.searchBack = tips(d).length === 1;
    /* B-MINOR-5: a focused ✕ keeps the focus across a full re-render (the same node comes back focused) */
    const fx = tips(d)[0] && tips(d)[0].querySelector('.c-word-tip__close');
    if (fx) fx.focus();
    const focusedBefore = d.activeElement === fx;
    flush(s);
    await K.sleep(60);
    R1.focusKept = focusedBefore && tips(d)[0] && tips(d)[0].querySelector('.c-word-tip__close') === fx && d.activeElement === fx;
    /* r2 NIT-2: ONCE per user focus — the next flush does not re-focus (no re-announce on every flush) */
    flush(s);
    await K.sleep(60);
    R1.focusOnce = tips(d).length === 1 && d.activeElement !== fx;
    /* ✕ → gone + exactly one done verb, never `shown`; r2 MINOR-2 (SAFETY): the focus lands on the CARD ITSELF — never on
       Accept / Decline or any button (Decline is one tap, no confirm) */
    const n0 = s.sent.length;
    const x = tips(d)[0] && tips(d)[0].querySelector('.c-word-tip__close');
    if (x) { x.focus(); x.click(); x.click(); }
    R1.closeGone = tips(d).length === 0;
    const cardNow = d.querySelector('.c-chats-list .c-contact-request');
    const ae = d.activeElement;
    R1.focusNext = !!cardNow && ae === cardNow && !ae.closest('button') && !ae.querySelector('button:focus');
    await K.sleep(60);
    R1.doneOnce = s.sent.slice(n0).filter((v) => /^ixian:hint:/.test(v)).join() === 'ixian:hint:done:wordrequest';
    flush(s);
    await K.sleep(80);
    R1.staysGone = tips(d).length === 0 && verbs(s, /^ixian:hint:shown:/).length === 0;
    close();

    /* —— the empty Chats state → wordphonebook under the body text —— */
    s = await K.boot('index.html', { timeScale: 20, html });
    ({ d } = s);
    s.push('setCaps', 'composeSend,hints,updateHelp,wordtips');
    s.push('setHints', hints());
    flush(s, false, false);
    await K.sleep(SETTLE + 200);
    t = tips(d);
    const body = d.querySelector('.c-chats-list .c-empty-state .c-empty-state__body');
    R1.empty = t.length === 1 && t[0].dataset.tip === 'wordphonebook' && !!body && body.nextElementSibling === t[0]
      && t[0].querySelector('.c-word-tip__text').textContent === 'Spixi has no phone book. Add people with their Spixi address or QR code.';
    const ex = t[0] && t[0].querySelector('.c-word-tip__close');
    if (ex) { ex.focus(); ex.click(); }
    /* r2 MINOR-2: not the call to action either — the empty state's TITLE (tabindex -1) */
    const etitle = d.querySelector('.c-chats-list .c-empty-state .c-empty-state__title');
    R1.focusCta = tips(d).length === 0 && !!etitle && d.activeElement === etitle && !d.activeElement.closest('button');

    /* r2 MINOR-3: rows only (no request card, not empty) with the observer installed → a row patch and a flush of rows
       read NO place (the callback returns at once) */
    flush(s, false, true);
    await K.sleep(80);
    const r0 = s.W.__placeReads;
    s.push('setContactStatus', B, 'True', '2', '', '0');
    await K.sleep(60);
    flush(s, false, true);
    await K.sleep(80);
    R1.noReadsRows = s.W.__moList === 1 && s.W.__placeReads === r0;
    /* …while a NEW request card still brings the tip (its record is read) */
    flush(s, true, true);
    await K.sleep(80);
    R1.requestReads = s.W.__placeReads > r0;
    close();

    /* —— off:true → none —— */
    s = await K.boot('index.html', { timeScale: 20, html });
    ({ d } = s);
    s.push('setCaps', 'composeSend,hints,updateHelp,wordtips');
    s.push('setHints', hints({ off: true }));
    flush(s);
    await K.sleep(SETTLE + 200);
    R1.off = tips(d).length === 0 && s.W.__moList === 0;
    /* switching the tips on again (C# re-pushes on the switch) → the tip comes */
    s.push('setHints', hints());
    await K.sleep(60);
    R1.onAgain = tips(d).length === 1 && s.W.__moList === 1;
    close();

    /* —— done:["wordrequest"] → none for it —— */
    s = await K.boot('index.html', { timeScale: 20, html });
    ({ d } = s);
    s.push('setCaps', 'composeSend,hints,updateHelp,wordtips');
    s.push('setHints', hints({ done: ['wordrequest', 'backup'] }));
    flush(s);
    await K.sleep(SETTLE + 200);
    R1.done = tips(d).length === 0 && !!d.querySelector('.c-chats-list .c-contact-request');
    /* the other word on the empty state; its ✕ makes BOTH done → the observer goes (the steady state costs nothing) */
    flush(s, false, false);
    await K.sleep(80);
    const px = tips(d)[0] && tips(d)[0].dataset.tip === 'wordphonebook' ? tips(d)[0].querySelector('.c-word-tip__close') : null;
    const obsBefore = s.W.__moList;
    if (px) px.click();
    await K.sleep(40);
    R1.obsGone = !!px && obsBefore === 1 && s.W.__moList === 0 && tips(d).length === 0;
    close();

    /* —— WITHOUT the cap (flag V1Hints off) → no element anywhere, no verb —— */
    s = await K.boot('index.html', { timeScale: 20, html });
    ({ d } = s);
    s.push('setCaps', 'composeSend,hints,updateHelp');
    s.push('setHints', hints());
    flush(s);
    await K.sleep(SETTLE + 200);
    const noCapReq = d.querySelectorAll('.c-word-tip').length === 0;
    flush(s, false, false);
    await K.sleep(120);
    R1.flagOff = noCapReq && d.querySelectorAll('.c-word-tip').length === 0 && !!d.querySelector('.c-empty-state')
      && verbs(s, /^ixian:hint:/).length === 0;
    R1.noObsOff = s.W.__moList === 0;   // B-MINOR-6: flag OFF = no list observer at all (a render costs what it did before)
    close();

    /* —— the pure parts —— */
    const S = (s = await K.boot('index.html', { timeScale: 20, html })).W.Spixi;
    const done = (j) => [...S.wordTipsDone(j)].sort().join();
    R1.pure = S.WORD_TIP_IDS.join() === 'wordrequest,wordphonebook'
      && done('{"done":["wordrequest","backup","evil"]}') === 'wordrequest' && done('{bad') === '' && done('[]') === ''
      && done('{"done":"wordrequest"}') === '' && done('x'.repeat(5000)) === '' && done({ done: ['wordphonebook'] }) === 'wordphonebook'
      && S.createWordTip({ id: 'nope' }) === null
      && S.wordTipCopy('wordrequest', { wordTipRequest: '<b>x</b>' }) === '<b>x</b>'
      && S.createWordTip({ id: 'wordrequest', strings: { wordTipRequest: '<b>x</b>' } }).querySelector('b') === null;   // text, never markup
    close();
    ok(Object.values(R1).every(Boolean),
      '★ V1A-M M2 (P31): the new-word tips — with the cap wordtips + setHints off:false ONE quiet note (role="note") directly under the first contact-request card; the same node survives a full re-render and a #1166 row patch (the patch still runs); the update card on Chats and a moment sheet hold it back, it returns when they go; ✕ removes it at once and sends exactly one ixian:hint:done:wordrequest and never a shown verb; the empty state gets wordphonebook after its body; off:true → none (a switch back on → it comes); done → none; WITHOUT the cap no .c-word-tip anywhere and no hint verb; wordTipsDone keeps only the word ids of a sane push; the copy lands as text — ' + JSON.stringify(R1));
  } catch (e) { close(); ok(false, '★ V1A-M M2 h-wordtips threw: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
}
