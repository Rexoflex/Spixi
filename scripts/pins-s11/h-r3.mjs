/* ==== S11 H (#1263) — the #46 round-3 fixes to the money keypad and its hosts, on the BUILT shells ====
 *   · MAJOR-1: a mouse/touch press on a pad key never moves focus (mousedown default prevented), so the next Enter
 *     cannot re-click the key (5 → 55 on Chromium/WebView2). The browser default is EMULATED here (jsdom moves no focus
 *     and synthesizes no click on Enter): focus follows an un-prevented mousedown; Enter on a focused <button> clicks it.
 *     Enter from the amount / the page = the owner's primary action ONLY while it is enabled (Review · Send request);
 *     Enter/Space on a KEYBOARD-focused pad key (or the To chip) stays native (never prevented, never the primary).
 *   · MINOR-1: chat Pay and contact-details Pay put focus INSIDE the cover (the view's _initialFocus: the amount output on
 *     step 2), not on step 1's hidden address field (focus stayed under the cover).
 *   · MINOR-2: both covers pass balance null → no "Available" figure and NO stage-1 "More than your 0 IXI" before the first
 *     quote; the quote's balance then drives both.
 *   · MINOR-3: a hardware separator that is not the locale's decimal mark is grouping and is ignored: en "1,000.50" →
 *     1000.5 · de "1.000" → 1000 · de "1.000,5" → 1000.5; the numpad decimal key is the decimal mark in any locale.
 *   · NIT-3: pad._set drops leading zeros ("00.5" → 0.5, "007" → 7, ".5" → 0.5) and refuses > 15 integer digits.
 *   · NIT-4: back to step 1 after a TOUCH tap focuses the step heading, not the search (no OS keyboard over the list);
 *     after a keyboard action, and on desktop, the search takes focus (Send and Request). */
import { hKit } from './h-kit.mjs';
import { b1Kit } from '../pins-s9/b1-kit.mjs';
import { uiKit } from '../pins-s8/ui-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = hKit(h);
  const { sleep, ADA } = K;
  const r = {};
  let s = null;
  const close = () => { if (s) { try { (s.close || (() => s.dom.window.close()))(); } catch (e) {} s = null; } };
  const ptr = (el, type, pointerType) => {
    const e = new s.W.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'pointerType', { value: pointerType });
    el.dispatchEvent(e);
  };
  /* a mouse press the way a browser runs it: pointerdown → mousedown (its default moves focus) → click */
  const mouseClick = (el, pointerType = 'mouse') => {
    ptr(el, 'pointerdown', pointerType);
    const md = new s.W.MouseEvent('mousedown', { bubbles: true, cancelable: true });
    el.dispatchEvent(md);
    if (!md.defaultPrevented && typeof el.focus === 'function') el.focus();
    ptr(el, 'pointerup', pointerType);
    el.click();
    return md.defaultPrevented;
  };
  /* a key on whatever has focus, with the native default emulated (Enter/Space on a button = a click) */
  const press = (key, extra = {}) => {
    const t = s.d.activeElement && s.d.activeElement !== s.d.documentElement ? s.d.activeElement : s.d.body;
    const ev = new s.W.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra });
    t.dispatchEvent(ev);
    if (!ev.defaultPrevented && (key === 'Enter' || key === ' ') && t.tagName === 'BUTTON' && !t.disabled) t.click();
    return ev;
  };
  const hw = (str, extra = {}) => { for (const ch of str) s.d.body.dispatchEvent(new s.W.KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true, ...extra })); };
  const openSend = async (opts = {}) => {
    s = await K.boot(opts);
    K.wallet(s);
    await sleep(80);
    [...s.d.querySelectorAll('.c-wallet-hero__qa')][0].click();
    await sleep(350);
    return s.d.querySelector('.wallet-takeover .c-wallet-send');
  };
  const openRecv = async (opts = {}) => {
    s = await K.boot(opts);
    K.wallet(s);
    await sleep(80);
    [...s.d.querySelectorAll('.c-wallet-hero__qa')][1].click();
    await sleep(350);
    return s.d.querySelector('.wallet-takeover .c-wallet-receive');
  };
  try {
    /* ① MAJOR-1 on Send */
    let v = await openSend();
    const row = v.querySelector('.c-wallet-send__contacts .c-contact-row');
    ptr(row, 'pointerdown', 'touch');
    row.click();
    await sleep(30);
    const k5 = v.querySelector('.c-amount-pad__key[data-key="5"]');
    const prevented = mouseClick(k5);
    r.pressKeepsFocusOff = prevented && s.d.activeElement !== k5 && K.shown(v, '.c-wallet-send__amount') === '5';
    const e1 = press('Enter');
    press(' ');
    r.enterNoRepeat = K.shown(v, '.c-wallet-send__amount') === '5' && !e1.defaultPrevented && !s.d.querySelector('.c-sendreview');
    const k7 = v.querySelector('.c-amount-pad__key[data-key="7"]');
    k7.focus();                                              // Tab reaches a key: the keyboard path stays native
    const e2 = press('Enter');
    r.kbKeyNative = !e2.defaultPrevented && K.shown(v, '.c-wallet-send__amount') === '57';
    const e3 = press(' ');
    r.kbSpaceNative = !e3.defaultPrevented && K.shown(v, '.c-wallet-send__amount') === '577';
    v.querySelector('.c-amount-pad__key[data-key="back"]').click();
    v.querySelector('.c-amount-pad__key[data-key="back"]').click();
    await sleep(420);
    s.push('setSendQuote', ADA, '5', '0.001', '100', '', '');
    await sleep(20);
    const review = v.querySelector('.c-wallet-send__actions > .c-button');
    const chip = v.querySelector('.c-wallet-send__picked');
    chip.focus();
    const e4 = chip.dispatchEvent(new s.W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    r.otherControlNative = e4 === true && !s.d.querySelector('.c-sendreview');   // not prevented, no Review from the chip
    v.querySelector('.c-wallet-send__amount').focus();
    const e5 = press('Enter');
    await sleep(60);
    r.enterIsReview = !review.disabled && e5.defaultPrevented && !!s.d.querySelector('.c-sendreview')
      && K.shown(v, '.c-wallet-send__amount') === '5';
    r.noErr1 = K.noErr(s.errs);
    close();

    /* ② MAJOR-1 on Request: Enter with the CTA disabled does nothing; armed → the request (once) */
    v = await openRecv();
    v.querySelector('.c-wallet-receive__contact').click();
    v.querySelector('.c-wallet-receive__next').click();
    await sleep(20);
    v.querySelector('.c-wallet-receive__amount').focus();
    const e6 = press('Enter');
    r.recvDisabledNothing = !e6.defaultPrevented && !s.sent.some((x) => /^ixian:sendrequest:/.test(x));
    const k2 = v.querySelector('.c-amount-pad__key[data-key="2"]');
    const md2 = mouseClick(k2);
    const unfocused = s.d.activeElement !== k2;
    const before = s.sent.length;
    press('Enter');                                          // the CTA is armed now: Enter = the request, the 2 is not re-typed
    r.recvNoRepeat = md2 && unfocused && s.sent.slice(before).filter((x) => /^ixian:sendrequest:/.test(x)).join('|') === 'ixian:sendrequest:' + ADA + ':2';
    await sleep(30);
    r.recvEnterIsRequest = s.sent.filter((x) => /^ixian:sendrequest:/.test(x)).join('|') === 'ixian:sendrequest:' + ADA + ':2';
    close();

    /* ③ MINOR-3 hardware separators · ④ NIT-3 pad._set */
    v = await openRecv();
    v.querySelector('.c-wallet-receive__contact').click();
    v.querySelector('.c-wallet-receive__next').click();
    await sleep(20);
    let pad = v.querySelector('.c-amount-pad');
    hw('1,000.50');
    r.enGroup = pad._value() === '1000.50' && K.shown(v, '.c-wallet-receive__amount') === '1,000.50';
    const S = s.W.Spixi;
    const p0 = S.createAmountPad();
    const set = (x) => { p0._set(x); return p0._value(); };
    r.setZeros = set('00.5') === '0.5' && set('007') === '7' && set('.5') === '0.5' && set('0') === '0' && set('000') === '0'
      && set('1'.repeat(15)) === '1'.repeat(15) && set('1'.repeat(16)) === '' && set('1234567890123456.5') === '' && set('12.') === '12.';
    close();
    v = await openRecv({ lang: 'de-DE' });
    v.querySelector('.c-wallet-receive__contact').click();
    v.querySelector('.c-wallet-receive__next').click();
    await sleep(20);
    pad = v.querySelector('.c-amount-pad');
    hw('1.000');
    const de1 = pad._value();
    hw(',5');
    r.deGroup = de1 === '1000' && pad._value() === '1000.5' && K.shown(v, '.c-wallet-receive__amount') === '1.000,5';
    for (let i = 0; i < 8; i++) K.key(v, 'back');
    hw('2');
    s.d.body.dispatchEvent(new s.W.KeyboardEvent('keydown', { key: '.', code: 'NumpadDecimal', bubbles: true, cancelable: true }));
    hw('5');
    r.numpadDecimal = pad._value() === '2.5';
    close();
    /* ★ #46 r4 MAJOR (S11): fr / ru group with a no-break space — '.' and ',' are both the decimal key there (never 25 for 2.5) */
    for (const [lang, k] of [['fr-FR', 'frDot'], ['ru-RU', 'ruDot'], ['fr-FR', 'frComma']]) {
      v = await openRecv({ lang });
      v.querySelector('.c-wallet-receive__contact').click();
      v.querySelector('.c-wallet-receive__next').click();
      await sleep(20);
      pad = v.querySelector('.c-amount-pad');
      hw(k === 'frComma' ? '2,5' : '2.5');
      r[k] = pad._value() === '2.5';
      close();
    }

    /* ⑤ NIT-4: toStep1 after a touch = the heading; after a key / on desktop = the search */
    v = await openSend();
    let rw = v.querySelector('.c-wallet-send__contacts .c-contact-row');
    ptr(rw, 'pointerdown', 'touch'); rw.click();
    await sleep(20);
    let ch = v.querySelector('.c-wallet-send__picked');
    ptr(ch, 'pointerdown', 'touch'); ch.click();
    const searchIn = v.querySelector('.c-wallet-send__picker input');
    r.touchNoSearch = v.dataset.step === '1' && s.d.activeElement !== searchIn
      && s.d.activeElement === v.querySelector('.c-wallet-send__label');
    rw = v.querySelector('.c-wallet-send__contacts .c-contact-row');
    rw.focus(); press('Enter');
    await sleep(20);
    ch = v.querySelector('.c-wallet-send__picked');
    ch.focus(); press('Enter');
    r.keyboardSearch = v.dataset.step === '1' && s.d.activeElement === searchIn;
    close();
    v = await openRecv();
    v.querySelector('.c-wallet-receive__contact').click();
    const nx = v.querySelector('.c-wallet-receive__next');
    ptr(nx, 'pointerdown', 'touch'); nx.click();
    await sleep(20);
    const rch = v.querySelector('.c-wallet-receive__chip');
    ptr(rch, 'pointerdown', 'touch'); rch.click();
    r.recvTouchNoSearch = v.dataset.step === '1' && s.d.activeElement === v.querySelector('.c-wallet-receive__asklabel');
    close();
    v = await openSend({ desktop: true });
    rw = v.querySelector('.c-wallet-send__contacts .c-contact-row');
    mouseClick(rw);
    await sleep(20);
    mouseClick(v.querySelector('.c-wallet-send__picked'));
    r.desktopSearch = v.dataset.step === '1' && s.d.activeElement === v.querySelector('.c-wallet-send__picker input');
    close();

    /* ⑥ MINOR-1 + MINOR-2 on the BUILT chat shell (attach → Pay) */
    const B = b1Kit(h);
    s = await B.open({ caps: 'reply,edit,voice,media,composeSend,composeRequest' });
    s.d.querySelector('.c-composer__attach').click();
    await sleep(500);
    [...s.d.querySelectorAll('.c-attach__tile')].find((t) => t.textContent.trim() === 'Pay').click();
    await sleep(300);
    let over = s.d.querySelector('.chat-send-takeover');
    const checkCover = async (cover, addr) => {
      const out = {};
      out.focusIn = !!cover && cover.contains(s.d.activeElement) && s.d.activeElement.classList.contains('c-wallet-send__amount');
      const meta = cover.querySelector('.c-wallet-send__amountrow .c-wallet-send__meta');
      out.noAvail = meta.textContent === '';
      for (const k of ['5']) cover.querySelector('.c-amount-pad__key[data-key="' + k + '"]').click();
      await sleep(20);
      const amt = cover.querySelector('.c-wallet-send__amount');
      out.noFalseOver = amt.dataset.error === undefined && cover.querySelector('.c-wallet-send__over').hidden;
      s.push('setSendQuote', addr, '0', '', '3', '2.99', '');
      await sleep(30);
      out.quoteDrives = meta.textContent === 'Available: 3 IXI' && amt.dataset.error !== undefined
        && cover.querySelector('.c-wallet-send__over .c-wallet-send__error').textContent === 'More than your 3 IXI';
      return out;
    };
    const c1 = await checkCover(over, 'addrPeer');
    r.chatFocusIn = c1.focusIn; r.chatNoAvail = c1.noAvail; r.chatNoFalseOver = c1.noFalseOver; r.chatQuote = c1.quoteDrives;
    r.noErrChat = B.noErr(s.errs);
    close();

    /* ⑦ the same on the BUILT contact-details shell (Pay quick action) */
    const U = uiKit(h);
    s = await U.boot('contact_details.html', { mobile: true });
    const PEER = 'PEERxQ7mW2pLk9sRt4vBn8cYh3jFz6dGe1u';
    s.push('setCaps', 'composeSend,composeRequest');
    s.push('setAddress', PEER);
    s.push('setNickname', 'Peer');
    await sleep(600);
    s.d.querySelector('[data-action="pay"]').click();
    await sleep(300);
    over = s.d.querySelector('.cd-send-takeover');
    const c2 = await checkCover(over, PEER);
    r.cdFocusIn = c2.focusIn; r.cdNoAvail = c2.noAvail; r.cdNoFalseOver = c2.noFalseOver; r.cdQuote = c2.quoteDrives;
    close();
  } catch (e) { r.err = e.message; }
  finally { close(); }
  ok(Object.values(r).length >= 27 && Object.values(r).every((x) => x === true),
    '★ S11 H #46 r3 (#1263) KEYPAD FIXES: a mouse/touch press never focuses a pad key, so Enter/Space after it cannot re-click it (5 stays 5, Send AND Request) · a keyboard-focused key and the To chip keep their native Enter/Space · Enter from the amount = Review / Send request only while enabled · chat Pay and contact-details Pay focus the amount INSIDE the cover, show no Available figure and no "More than your 0 IXI" before the first quote, and the quote\'s balance then drives both · hardware grouping: en 1,000.50 → 1000.50, de 1.000 → 1000 and 1.000,5 → 1000.5, fr/ru 2.5 and 2,5 → 2.5 (r4), NumpadDecimal = the mark · _set 00.5 → 0.5, 007 → 7, .5 → 0.5, > 15 integer digits → nothing · back to step 1 after a touch focuses the heading (Send, Request), after a key / on desktop the search — ' + JSON.stringify(r));
}
