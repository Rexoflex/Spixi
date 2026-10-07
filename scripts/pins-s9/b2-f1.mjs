/* ==== SESSION 9 (B2, #46 r1 fixes) — M5 bootDropped AFTER the cover is gone · D-04 haptics on the home shell ====
 * On the BUILT index.html (jsdom):
 *   · M5: on BOTH paths (transitionend, and the 260 ms backstop) the boot cover is out of the DOM when
 *     `ixian:bootDropped` is emitted — C#'s first frame after its hold can never be the cover
 *   · D-04: a payment that C# confirms (signSendResult "ok") sends `ixian:haptic:success` once; a refused attempt
 *     ("fail") sends none
 *   · D-04: a TOUCH long-press that opens a chats-row menu sends `ixian:haptic:long` once; Android's contextmenu after
 *     a touch press does too; a MOUSE right-click opens the menu and sends none
 * Deliberate breaks: see the S9 B2 #46 r1 report. */
import { b2Kit } from './b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  const count = (s, v) => s.sent.filter((c) => c === v).length;
  /* ★ #46 r2 m1: the cover is read AT THE MOMENT the verb leaves — synchronously inside the Location href setter
     (b2-kit onSend), not by a later poll (remove + send run in one synchronous call; a poll cannot see the order). */
  const bootWatched = async () => {
    const rec = { coverAtSend: null };
    const s = await boot('index.html', { wait: 0, onSend: (c, w) => { if (c === 'ixian:bootDropped' && rec.coverAtSend === null) rec.coverAtSend = !!w.document.getElementById('app-boot'); } });
    return { s, rec };
  };
  const fadeStart = async (s) => { for (let i = 0; i < 600; i++) { const c = s.d.getElementById('app-boot'); if (c && c.style.opacity === '0') return true; await sleep(2); } return false; };
  try {
    /* —— M5, transitionend path —— */
    let { s, rec } = await bootWatched();
    let fadeSeen = await fadeStart(s);
    await sleep(30);   // let the boot burst (tab / onload) drain, so the verb leaves synchronously from finish()
    const cv = s.d.getElementById('app-boot'); if (cv) cv.dispatchEvent(new s.W.Event('transitionend', { bubbles: true }));
    await sleep(60);
    ok(fadeSeen && rec.coverAtSend === false && count(s, 'ixian:bootDropped') === 1,
      '★ S9 #46 r1 M5 (r2 m1): transitionend path — the cover is out of the DOM AT the moment ixian:bootDropped leaves — ' + JSON.stringify({ fadeSeen, coverAtSend: rec.coverAtSend, n: count(s, 'ixian:bootDropped') }));
    s.dom.window.close();
    /* —— M5, backstop path (jsdom fires no transitionend) —— */
    ({ s, rec } = await bootWatched());
    fadeSeen = await fadeStart(s);
    await sleep(400);
    ok(fadeSeen && rec.coverAtSend === false && count(s, 'ixian:bootDropped') === 1 && !s.d.getElementById('app-boot'),
      '★ S9 #46 r1 M5 (r2 m1): backstop path — the 260 ms backstop removes the cover BEFORE ixian:bootDropped leaves — ' + JSON.stringify({ fadeSeen, coverAtSend: rec.coverAtSend }));
    s.dom.window.close();

    /* —— D-04 success —— */
    s = await boot('index.html');
    const ADDR = '1QsE2N9oyKs1aPMgEwCpNnPUDbRZH3sjyZHrQXGEJvL9WgHfB';
    const click = (t) => { const b = [...s.d.querySelectorAll('button')].reverse().find((x) => x.textContent.trim() === t && !x.disabled); if (b) b.click(); return !!b; };
    s.push('setCaps', 'composeSend'); await sleep(80);
    s.push('quickScanResult', ADDR + ':send:1'); await sleep(250);
    click('Use this address'); await sleep(250);
    s.push('setSendQuote', ADDR, '1', '0.01', '100', '99', ''); await sleep(250);
    click('Review'); await sleep(350);
    const c1 = click('Confirm & send'); await sleep(120);
    s.push('signSendResult', 'fail', 'Not enough funds'); await sleep(150);
    const afterFail = count(s, 'ixian:haptic:success');
    const c2 = click('Confirm & send'); await sleep(120);
    const signs = s.sent.filter((c) => c.startsWith('ixian:signSend:')).length;
    s.push('signSendResult', 'ok'); await sleep(150);
    ok(c1 && c2 && signs === 2 && afterFail === 0 && count(s, 'ixian:haptic:success') === 1,
      '★ S9 D-04: a refused payment buzzes nothing; the one C# confirms ("ok") sends ixian:haptic:success once — ' + JSON.stringify({ c1, c2, signs, afterFail, ok: count(s, 'ixian:haptic:success') }));
    s.dom.window.close();

    /* —— D-04 long-press —— */
    s = await boot('index.html');
    const TS = String(Math.floor(Date.now() / 1000));
    s.push('clearChats');
    s.push('addChat', 'a1', 'Ana', TS, 'img/spixiavatar.png', 'false', 'hi', '', '1', '', 'False', 'text', '');
    s.push('clearChatsDone');
    await sleep(300);
    const row = () => [...s.d.querySelectorAll('.c-chatlist-item')].find((x) => (x.querySelector('.c-chatlist-item__name') || {}).textContent === 'Ana');
    const ptr = (el, type, pointerType, button = 0) => { const e = new s.W.Event(type, { bubbles: true, cancelable: true }); Object.assign(e, {}); Object.defineProperty(e, 'pointerType', { value: pointerType }); Object.defineProperty(e, 'button', { value: button }); Object.defineProperty(e, 'clientX', { value: 10 }); Object.defineProperty(e, 'clientY', { value: 10 }); el.dispatchEvent(e); };
    const menuOpen = () => !!s.d.querySelector('.c-sheet[data-open], .c-sheet');
    const closeMenus = async () => { try { s.W.Spixi.dismissTopOverlay(); } catch (e) {} await sleep(450); };
    const L = 'ixian:haptic:long';
    let el = row();
    ptr(el, 'pointerdown', 'touch'); await sleep(620);
    const touchOpen = menuOpen(), touchN = count(s, L);
    ptr(el, 'pointerup', 'touch'); await sleep(30);
    await closeMenus();
    el = row();
    ptr(el, 'pointerdown', 'mouse', 2); el.dispatchEvent(new s.W.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(80);
    const mouseOpen = menuOpen(), mouseN = count(s, L);
    await closeMenus();
    el = row();
    ptr(el, 'pointerdown', 'touch'); el.dispatchEvent(new s.W.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(80);
    const androidN = count(s, L);
    await sleep(600);   // the armed timer must not buzz a second time
    ok(touchOpen && touchN === 1 && mouseOpen && mouseN === 1 && androidN === 2 && count(s, L) === 2,
      '★ S9 D-04: a touch long-press (and Android\'s touch contextmenu) opens the row menu with ONE ixian:haptic:long; a mouse right-click opens it silently — '
      + JSON.stringify({ touchOpen, touchN, mouseOpen, mouseN, androidN, total: count(s, L) }));
    /* ★ #46 r2 n3: the finger flag never outlives its press — (a) a contextmenu with NO new pointerdown after a
       touch long-press (TalkBack's action) does not buzz again; (b) a touch TAP, then the keyboard's context-menu
       key (keydown + the browser's contextmenu), opens the menu silently */
    await closeMenus();
    el = row();
    el.dispatchEvent(new s.W.MouseEvent('click', { bubbles: true, cancelable: true })); await sleep(20);   // the release click of that press (clears the component's own `fired` latch)
    await closeMenus();
    el = row();
    el.dispatchEvent(new s.W.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(80);
    const staleN = count(s, L), staleOpen = menuOpen();
    await closeMenus();
    el = row();
    ptr(el, 'pointerdown', 'touch'); await sleep(40); ptr(el, 'pointerup', 'touch'); await sleep(30);
    el.dispatchEvent(new s.W.KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true, cancelable: true }));
    el.dispatchEvent(new s.W.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); await sleep(80);
    const keyN = count(s, L), keyOpen = menuOpen();
    ok(staleOpen && keyOpen && staleN === 2 && keyN === 2,
      '★ S9 #46 r2 n3: no stale finger — a pointer-less contextmenu after a touch long-press and a keyboard open after a touch tap both open the menu WITHOUT ixian:haptic:long — ' + JSON.stringify({ staleN, keyN, staleOpen, keyOpen }));
    s.dom.window.close();
  } catch (e) {
    ok(false, '★ S9 B2 #46 r1 pins threw: ' + (e && e.stack || e));
  }
}
