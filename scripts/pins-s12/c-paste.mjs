/* ==== S12 C (#1267) — PASTE on the 2-step amount (Send AND Request step 2), on the BUILT home shell ====
 *   · A paste on the document while step 2 is live (the pad's own keydown live state) reads clipboardData
 *     'text/plain' and REPLACES the amount through padPaste = ungroupAmountInput (the app language) → sanitizeAmount
 *     → the pad's limits; the display, the quote wire / the request CTA and the over-balance check follow, exactly
 *     like typing (the same set → onChange path). The paste is preventDefault-ed only when step 2 took it.
 *     en "1,234.56" · de "1.234,56" · de "12,5" · fr "1 234,56" (NNBSP) · sl "12.345,6" / "1.234,56" · ru / lt "1 234,56" (NBSP)
 *     · en "1.234,56" (the V-1 foreign reading) → 1234.56 / 12.5.
 *   · REFUSED, nothing changes, nothing prevented, no toast: "abc" · "-5" · 9 decimals · "12 34" (two numbers) ·
 *     "1,234,56" (no settled reading) · 16 integer digits · > 64 chars (65: 62 zeros + 1.5, otherwise a readable 1.5) · empty.
 *   · A paste into a real field (the tip sheet's input, any <input>) is the field's — the pad never takes it.
 *   · Lifecycle = the keydown one: step 1 takes no paste; back to step 1 and on to step 2 again, one paste is one
 *     read (getData once); close the takeover and reopen it, one paste is one read (the old pad is gone).
 *   jsdom has no ClipboardEvent: the event is an Event('paste') with a clipboardData stub (the pins-s9 b1-attach model),
 *   and the stub counts getData calls. */
import { hKit } from '../pins-s11/h-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = hKit(h);
  const { sleep, ADA } = K;
  let s = null;
  const close = () => { if (s) { s.close(); s = null; } };
  const NNBSP = ' ', NBSP = ' ';
  const paste = (text, target) => {
    const t = target || (s.d.activeElement && s.d.activeElement !== s.d.documentElement ? s.d.activeElement : s.d.body);
    const stub = { calls: 0 };
    const ev = new s.W.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: { types: ['text/plain'], getData: (ty) => { stub.calls++; return ty === 'text/plain' ? text : ''; } } });
    t.dispatchEvent(ev);
    return { prevented: ev.defaultPrevented, calls: stub.calls };
  };
  const heroQa = async (i) => {
    [...s.d.querySelectorAll('.c-wallet-hero__qa')][i].click();
    await sleep(350);
  };
  const toSend2 = async () => {
    await heroQa(0);
    const v = s.d.querySelector('.wallet-takeover .c-wallet-send');
    v.querySelector('.c-wallet-send__contacts .c-contact-row').click();
    await sleep(30);
    return v;
  };
  const toRecv2 = async () => {
    await heroQa(1);
    const v = s.d.querySelector('.wallet-takeover .c-wallet-receive');
    v.querySelector('.c-wallet-receive__contact').click();
    v.querySelector('.c-wallet-receive__next').click();
    await sleep(30);
    return v;
  };
  const flows = {
    send: { to2: toSend2, amt: '.c-wallet-send__amount' },
    recv: { to2: toRecv2, amt: '.c-wallet-receive__amount' },
  };
  const bootTo2 = async (flow, lang = '') => {
    s = await K.boot(lang ? { lang } : {});
    K.wallet(s);
    await sleep(80);
    return flows[flow].to2();
  };
  const padOf = (v) => v.querySelector('.c-amount-pad');

  /* ① valid pastes, every locale, both flows: REPLACE (a typed 7 first), display, prevented */
  const A = {};
  try {
    const cases = [
      ['en-US', '1,234.56', '1234.56', '1,234.56'],
      ['en-US', '1.234,56', '1234.56', '1,234.56'],          // V-1: the other convention, unreadable locally
      ['de-DE', '1.234,56', '1234.56', '1.234,56'],
      ['de-DE', '12,5', '12.5', '12,5'],
      ['fr-FR', '1' + NNBSP + '234,56', '1234.56', '1' + NNBSP + '234,56'],
      ['sl-SI', '12.345,6', '12345.6', '12.345,6'],
      ['sl-SI', '1.234,56', '1234.56', '1234,56'],            // sl shows no group under 5 digits (CLDR min grouping 2)
      ['ru-RU', '1' + NBSP + '234,56', '1234.56', '1' + NBSP + '234,56'],
      ['lt-LT', ' 1' + NBSP + '234,56 ', '1234.56', '1' + NBSP + '234,56'],
    ];
    for (const flow of ['send', 'recv']) {
      for (const [lang, text, want, shown] of cases) {
        const v = await bootTo2(flow, lang);
        K.key(v, '7');
        const p = paste(text);
        A[flow + ' ' + lang + ' ' + JSON.stringify(text)] = p.prevented && p.calls === 1 && padOf(v)._value() === want
          && K.shown(v, flows[flow].amt) === shown && !s.d.querySelector('.c-toast');
        close();
      }
    }
    /* the same onChange path as typing: Send → the quote wire + the stage-1 over-balance; Request → the CTA + the wire */
    let v = await bootTo2('send');
    let p = paste('1,234.56');
    await sleep(420);
    A.sendWire = p.prevented && s.sent.filter((x) => /^ixian:feeQuery:/.test(x)).pop() === 'ixian:feeQuery:' + ADA + ':1234.56';
    const amt = v.querySelector('.c-wallet-send__amount');
    A.sendOver = amt.dataset.error !== undefined && !v.querySelector('.c-wallet-send__over').hidden
      && v.querySelector('.c-wallet-send__over .c-wallet-send__error').textContent === 'More than your 100 IXI';
    p = paste('5');
    A.sendOverClears = p.prevented && padOf(v)._value() === '5' && amt.dataset.error === undefined;
    close();
    v = await bootTo2('recv', 'de-DE');
    paste('12,5');
    const cta = v.querySelector('.c-wallet-receive__cta');
    A.recvCta = !cta.disabled && /12,5/.test(cta.textContent);
    cta.click();
    await sleep(30);
    A.recvWire = s.sent.filter((x) => /^ixian:sendrequest:/.test(x)).join('|') === 'ixian:sendrequest:' + ADA + ':12.5';
    A.noErr = K.noErr(s.errs);
  } catch (e) { A.err = e.message; }
  finally { close(); }
  ok(Object.keys(A).length >= 24 && Object.values(A).every((x) => x === true),
    '★ S12 C (#1267) PASTE on step 2 (Send AND Request, built home shell): a paste REPLACES the amount (a typed 7 is gone) via ungroupAmountInput → sanitizeAmount in the app language — en 1,234.56 · en 1.234,56 (V-1) · de 1.234,56 · de 12,5 · fr 1 234,56 (NNBSP) · sl 12.345,6 / 1.234,56 · ru / lt 1 234,56 (NBSP) → 1234.56 / 12.5, shown in the locale, the paste prevented, read once, no toast · the same onChange as typing: Send quotes …:1234.56 and shows "More than your 100 IXI", a paste of 5 clears it; Request arms "12,5" and sends …:12.5 — ' + JSON.stringify(A));

  /* ② refused pastes: nothing changes, nothing prevented, no toast, nothing on the wire */
  const B = {};
  try {
    const bad = ['abc', '-5', '1.123456789', '12 34', '1,234,56', '1234567890123456', '0'.repeat(62) + '1.5', '', '   ', '5 IXI', '+5'];
    for (const flow of ['send', 'recv']) {
      const v = await bootTo2(flow);
      K.type(v, '42');
      await sleep(420);
      const n0 = s.sent.length;
      for (const text of bad) {
        if (padOf(v)._value() !== '42') padOf(v)._set('42');   // one bad case never hides the next
        const p = paste(text);
        B[flow + ' ' + JSON.stringify(text.slice(0, 12))] = !p.prevented && p.calls === 1 && padOf(v)._value() === '42'
          && K.shown(v, flows[flow].amt) === '42';
      }
      await sleep(420);
      B[flow + ' quiet'] = s.sent.length === n0 && !s.d.querySelector('.c-toast') && K.noErr(s.errs);
      close();
    }
    /* de: 9 decimals in the local convention are refused too (never cut to 8) */
    const v = await bootTo2('send', 'de-DE');
    const p = paste('0,123456789');
    B.de9 = !p.prevented && K.shown(v, '.c-wallet-send__amount') === '' && v.querySelector('.c-wallet-send__amount').dataset.empty !== undefined;
    const p8 = paste('0,12345678');
    B.de8 = p8.prevented && padOf(v)._value() === '0.12345678';
  } catch (e) { B.err = e.message; }
  finally { close(); }
  ok(Object.keys(B).length >= 26 && Object.values(B).every((x) => x === true),
    '★ S12 C (#1267) PASTE refused all-or-nothing (Send AND Request): "abc" · "-5" · 9 decimals · "12 34" (two numbers) · "1,234,56" · 16 integer digits · > 64 chars (65: 62 zeros + 1.5, otherwise a readable 1.5) · empty / blank · "5 IXI" · "+5" leave the typed 42 as it is, the paste not prevented, no toast, nothing on the wire; de 0,123456789 refused (never cut), 0,12345678 taken — ' + JSON.stringify(B));

  /* ③ a paste into a real field is the field's */
  const C = {};
  try {
    for (const flow of ['send', 'recv']) {
      const v = await bootTo2(flow);
      K.type(v, '42');
      const inp = s.d.createElement('input');
      s.d.body.append(inp);
      inp.focus();
      const p1 = paste('7', inp);
      inp.remove();
      s.W.Spixi.openTipSheet({ recipient: { name: 'Ada', address: ADA }, balance: '100', host: s.d.body, onTip() {} });
      await sleep(200);
      const tin = s.d.querySelector('.c-tipsheet input');
      tin.focus();
      const p2 = paste('9', tin);
      C[flow] = !!tin && !p1.prevented && p1.calls === 0 && !p2.prevented && padOf(v)._value() === '42';
      s.W.Spixi.dismissTopOverlay();
      await sleep(450);
      const p3 = paste('8');
      C[flow + ' after'] = p3.prevented && padOf(v)._value() === '8';
      close();
    }
  } catch (e) { C.err = e.message; }
  finally { close(); }
  ok(Object.keys(C).length >= 4 && Object.values(C).every((x) => x === true),
    '★ S12 C (#1267) PASTE into a real field is not intercepted (Send AND Request): an <input> and the tip sheet\'s amount field keep their paste (not prevented, the pad unchanged); with the sheet gone, step 2 takes the next paste — ' + JSON.stringify(C));

  /* ④ lifecycle: step 1 takes nothing · back and on again = one listener, one read per paste · the Send review sheet
     up = no paste behind it · closed FROM step 2 (Send success, Request all-clear) and reopened = one read */
  const D = {};
  try {
    for (const flow of ['send', 'recv']) {
      s = await K.boot();
      K.wallet(s);
      await sleep(80);
      /* count the document's live paste listeners (add/remove of the same fn) */
      const live = new Set();
      const add0 = s.d.addEventListener.bind(s.d), rem0 = s.d.removeEventListener.bind(s.d);
      s.d.addEventListener = (t, fn, o) => { if (t === 'paste') live.add(fn); return add0(t, fn, o); };
      s.d.removeEventListener = (t, fn, o) => { if (t === 'paste') live.delete(fn); return rem0(t, fn, o); };
      let v = await flows[flow].to2();
      const back = () => s.d.querySelector('.wallet-takeover .c-topbar .c-button').click();
      D[flow + ' one'] = live.size === 1;
      back();
      await sleep(40);
      const p1 = paste('3');
      D[flow + ' step1'] = v.dataset.step === '1' && live.size === 0 && !p1.prevented && p1.calls === 0 && padOf(v)._value() === '';
      if (flow === 'send') v.querySelector('.c-wallet-send__contacts .c-contact-row').click();
      else v.querySelector('.c-wallet-receive__next').click();
      await sleep(30);
      const p2 = paste('6');
      D[flow + ' reenter'] = v.dataset.step === '2' && live.size === 1 && p2.prevented && p2.calls === 1 && padOf(v)._value() === '6';
      if (flow === 'send') {
        await sleep(420);
        s.push('setSendQuote', ADA, '6', '0.001', '100', '', '');
        await sleep(20);
        v.querySelector('.c-wallet-send__actions > .c-button').click();     // Review
        await sleep(80);
        const p3 = paste('9', s.d.body);
        D.sendReviewUp = !!s.d.querySelector('.c-sendreview') && !p3.prevented && p3.calls === 0 && padOf(v)._value() === '6';
        const sheet = [...s.d.querySelectorAll('.c-sendreview')].pop();
        [...sheet.querySelectorAll('.c-sendreview__actions .c-button')].pop().click();   // Confirm
        await sleep(30);
        s.push('signSendResult', 'ok', '');
        await sleep(1500);
      } else {
        v.querySelector('.c-wallet-receive__cta').click();                  // all-clear closes from step 2
        await sleep(600);
      }
      const gone = !s.d.querySelector('.wallet-takeover');
      v = await flows[flow].to2();
      const p4 = paste('4');
      D[flow + ' reopen'] = gone && p4.prevented && p4.calls === 1 && padOf(v)._value() === '4' && live.size === 1;
      D[flow + ' noErr'] = K.noErr(s.errs);
      close();
    }
  } catch (e) { D.err = e.message; }
  finally { close(); }
  ok(Object.keys(D).length >= 9 && Object.values(D).every((x) => x === true),
    '★ S12 C (#1267) PASTE lifecycle = the keydown one (Send AND Request): one document paste listener on step 2, none on step 1 (no paste taken there) · back and on to step 2 again: still one, one paste = one read · Send with the Review sheet up: a paste changes nothing behind it · closed FROM step 2 (Send success / Request all-clear) and reopened: one paste = one read, one listener (the old pad\'s is gone, no double fire) — ' + JSON.stringify(D));

  /* ⑤ ★ #46 r1: R2-M1 whitespace-grouping locales read '.' / ',' as the decimal (a paste = the same keys typed) ·
     R2-M2 a leading-zero first group in the group-mark reading is refused (#46 r2: the locale's own decimal mark as the only separator is a decimal) · R3-MINOR-5 "007" → 7, ".5" / ",5" → 0.5 — Send AND Request */
  const E = {};
  try {
    const WS = ['fr-FR', 'ru-RU', 'lt-LT'];
    const typed = (v, keys) => { padOf(v)._set(''); for (const k of keys) K.key(v, k); return padOf(v)._value(); };
    for (const flow of ['send', 'recv']) {
      for (const lang of ['en-US', 'de-DE', 'sl-SI', ...WS]) {
        const v = await bootTo2(flow, lang);
        const ws = WS.includes(lang);
        const dec = lang === 'en-US' ? '.' : ',';
        const take = (text) => {                             // → the value a paste leaves, or null when refused + untouched
          padOf(v)._set('42');
          const p = paste(text);
          const val = padOf(v)._value();
          return p.prevented ? val : (val === '42' ? null : 'CHANGED-UNPREVENTED:' + val);
        };
        const cases = [];
        /* R2-M2: a leading-zero first group */
        /* ★ #46 r2 m-1: the locale's OWN decimal mark after a leading zero, as the only separator, is a plain decimal
           (en "0.500" = 0.500, de / sl "0,500" = 0.500); the GROUP-mark reading stays refused (en "0,500", de "0.500") */
        const own = (t) => (t[t.search(/[.,]/)] === dec);
        const ownVal = { '0.500': '0.500', '00.500': '0.500', '0,050': '0.050', '0,500': '0.500' };
        for (const t of ['0.500', '00.500', '0,050', '0,500']) cases.push([t, ws ? undefined : (own(t) ? ownVal[t] : null)]);
        for (const t of ['0 500', '0' + NBSP + '500', '0.000.001']) cases.push([t, null]);
        /* R3-MINOR-5 */
        cases.push(['007', '7'], [dec + '5', '0.5']);
        if (ws) {
          /* R2-M1: equals the typed keys 1 2 . 5 0 0 / 0 . 5 0 0 / 0 . 0 5 0 / 0 0 . 5 0 0 / 1 . 5 */
          cases.push(['12.500', typed(v, ['1', '2', 'dec', '5', '0', '0'])], ['12,500', '12.500'], ['0.500', typed(v, ['0', 'dec', '5', '0', '0'])],
            ['0,500', '0.500'], ['0,050', typed(v, ['0', 'dec', '0', '5', '0'])], ['00.500', typed(v, ['0', '0', 'dec', '5', '0', '0'])],
            ['1,5', typed(v, ['1', 'dec', '5'])], ['1.5', '1.5'], ['1.234,5', null], ['1,234.5', null], ['1' + NNBSP + '234.5', '1234.5']);
        }
        for (const [t, want] of cases) {
          if (want === undefined) continue;                  // the ws value is pinned by the typed comparison below
          E[flow + ' ' + lang + ' ' + JSON.stringify(t)] = take(t) === want;
        }
        if (ws) E[flow + ' ' + lang + ' typed=12.5'] = typed(v, ['1', '2', 'dec', '5', '0', '0']) === '12.500';
        E[flow + ' ' + lang + ' noErr'] = K.noErr(s.errs);
        close();
      }
    }
  } catch (e) { E.err = e.message; }
  finally { close(); }
  ok(Object.keys(E).length >= 100 && Object.values(E).every((x) => x === true),
    '★ S12 C #46 r1 (#1267) PASTE readings (Send AND Request): fr / ru / lt (whitespace grouping) read one \'.\' or \',\' as the DECIMAL — "12.500" = typed 1 2 . 5 0 0 (12.5, never 12500), "0.500" / "0,500" / "00.500" = 0.5, "0,050" = 0.05, "1,5" = 1.5, "1 234.5" = 1234.5, "1.234,5" / "1,234.5" refused (R2-M1) · en / de / sl refuse a leading-zero first group in the GROUP-mark reading (en "0,500", de / sl "0.500", "00.500") and take the own decimal mark as a decimal (en "0.500" = 0.5, de "0,050" = 0.05; R2-M2 + #46 r2 m-1); "0 500" and "0.000.001" are refused everywhere · "007" → 7 and ".5" (en) / ",5" → 0.5 (R3-MINOR-5) — ' + JSON.stringify(E));

  /* ⑥ ★ #46 r1 R3-MAJOR-3: a paste whose target is a sheet / a dialog over step 2 is theirs · R3-MINOR-6: a paste an
     earlier listener already prevented leaves the pad alone — Send AND Request */
  const F = {};
  try {
    for (const flow of ['send', 'recv']) {
      const v = await bootTo2(flow);
      K.type(v, '42');
      const untouched = (text, target) => {                 // reset first: one failing case never hides the next
        if (padOf(v)._value() !== '42') padOf(v)._set('42');
        const p = paste(text, target);
        return !p.prevented && p.calls === 0 && padOf(v)._value() === '42';
      };
      s.W.Spixi.openTipSheet({ recipient: { name: 'Ada', address: ADA }, balance: '100', host: s.d.body, onTip() {} });
      await sleep(200);
      const sheet = s.d.querySelector('.c-sheet');
      const sheetBtn = sheet && sheet.querySelector('button');
      F[flow + ' sheetRoot'] = !!sheet && untouched('7', sheet);
      F[flow + ' sheetButton'] = !!sheetBtn && untouched('7', sheetBtn);
      s.W.Spixi.dismissTopOverlay();
      await sleep(450);
      /* the two clauses apart: a bare [role=dialog] (no sheet / modal class) and a .c-sheet without a role */
      const dlg = s.d.createElement('div');
      dlg.setAttribute('role', 'dialog');
      const dlgBtn = s.d.createElement('button');
      dlg.append(dlgBtn);
      s.d.body.append(dlg);
      F[flow + ' dialogRoot'] = untouched('7', dlg);
      F[flow + ' dialogButton'] = untouched('7', dlgBtn);
      dlg.remove();
      const bare = s.d.createElement('div');
      bare.className = 'c-sheet';
      const bareBtn = s.d.createElement('button');
      bare.append(bareBtn);
      s.d.body.append(bare);
      F[flow + ' bareSheetButton'] = untouched('7', bareBtn);
      bare.remove();
      /* R3-MINOR-6: an earlier (capture) listener prevented it */
      const taker = (e) => e.preventDefault();
      if (padOf(v)._value() !== '42') padOf(v)._set('42');
      s.d.addEventListener('paste', taker, true);
      const p = paste('7', s.d.body);
      s.d.removeEventListener('paste', taker, true);
      F[flow + ' prePrevented'] = p.prevented && p.calls === 0 && padOf(v)._value() === '42';
      const p2 = paste('7', s.d.body);
      F[flow + ' thenOurs'] = p2.prevented && padOf(v)._value() === '7';
      F[flow + ' noErr'] = K.noErr(s.errs);
      close();
    }
  } catch (e) { F.err = e.message; }
  finally { close(); }
  ok(Object.keys(F).length >= 16 && Object.values(F).every((x) => x === true),
    '★ S12 C #46 r1 (#1267) PASTE exclusions over step 2 (Send AND Request): a paste targeted at an open sheet (the tip sheet\'s root and a button in it), a bare [role=dialog] (root, button) or a .c-sheet without a role is not prevented and leaves the amount (R3-MAJOR-3) · a paste an earlier listener already prevented is not read and changes nothing; the next one is ours (R3-MINOR-6) — ' + JSON.stringify(F));
}
