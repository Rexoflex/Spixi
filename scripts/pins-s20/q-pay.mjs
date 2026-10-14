/* ==== S20 Q — J1 (#1440, the v3 doc's I1; Damir 16:36 + 17:52 / 17:54 "TODAY'S colours, change only the layout"): THE PAYMENT BUBBLE ====
 * On the BUILT chat.html (jsdom; the real bundle + the shell's own cascade):
 *   · colours unchanged: a sent and a received payment card compute the SAME background / border / box-shadow as a
 *     non-payment .c-tcard on the same side (today's .c-tcard rules), and the sent one is --surface-card-sent /
 *     --outline-card-sent — never the sent BUBBLE colour (--surface-bubble-sent);
 *   · the layout order: the label row (24 px medallion + label) first, then the 28 px amount, then (fiat) the badge row,
 *     then the buttons; the time sits in the label row ONLY when the bubble has buttons (else at the badge row's end);
 *   · declined / canceled: the NUMBER struck (not "IXI"), failed NOT struck; the glyph is ✕ for all three;
 *   · Decline absent without onDecline; Pay disabled when `insufficient` (+ the caption it points at); Pay names the amount;
 *   · a double tap on Pay / Decline fires once (the #268 one-shot latch — a money path);
 *   · a long amount wraps inside the bubble (#46 r1 MINOR-4; computed rule — the 320 px render carries the pixels);
 *   · the fiat line is hidden below 0.01 ("<$0.01" / "$0.00") and shown above;
 *   · "+" on a received completed payment and on my request paid; a pending receipt has no "+";
 *   · setPaymentStatus swaps the bubble IN PLACE (same neighbours, same scrollTop);
 *   · the labels through the SHELL: a 1:1 row has no peer nick on the bridge → "Sent you"; a group row → "<nick> sent you".
 * Deliberate breaks (S20 Q report): the sent card painted with the sent bubble colour
 * (`.c-tcard[data-layout="stack"] { background: var(--surface-bubble-sent) }`) → colours · the time moved to the badge row
 * even beside buttons → layout · `strike` also on failed → strike · Decline without the onDecline gate → decline · fiatShown always true → fiat ·
 * payName drops the nick → shellNames · (#46 r1) Pay wired without oneShot (onClick: onPay) → latch · `white-space: nowrap` back on
 * .c-tcard__amount → wrap · (#46 r3) named() without the FSI / PDI → bidi + shellNames · (#46 r4) the control strip removed → bidi · (#46 r5) the strip widened back to \p{Cf} → bidi · (#46 r2 n4) --tcard-pad-end 9 → 8 px, or the amount line-height 1 → 1.1 → approved. */
import { b1Kit } from '../pins-s9/b1-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = b1Kit(h);
  const { T0 } = K;
  const r = {};
  const got = {};
  try {
    const s = await K.open({ rows: false, hist: (x) => {
      /* addPaymentRequest(id, txid, address, nick, avatar, title, amount, status, statusIcon, time, localSender, confirmed, read, enableView, kind, statusEnum, fiat, insufficient) */
      x.push('addPaymentRequest', 'pr1', 'tx1', 'addrPeer', '', '', 'Payment received', '12', 'Completed', 'check', String(T0), 'False', 'True', 'True', 'True', 'payment', 'completed', '3.4', 'False');
    } });
    try {
      const { W, d } = s;
      const S = W.Spixi;
      const noop = () => {};
      await sleep(150);
      const shell1 = d.querySelector('#messages [data-msgid="pr1"] .c-tcard__label');
      got.shell1 = shell1 && shell1.textContent;
      got.shell1Amt = (d.querySelector('#messages [data-msgid="pr1"] .c-tcard__amount') || {}).textContent;
      const host = d.createElement('div');
      d.body.append(host);
      const mk = (o) => { const row = S.createPaymentBubble({ timestamp: Date.now(), strings: {}, ...o }); host.append(row); return row; };
      const cs = (el) => W.getComputedStyle(el);
      const rootVar = (v, k = 0) => { const m = /^var\((--[\w-]+)\)$/.exec(String(v || '').trim()); if (!m || k > 8) return String(v || '').trim(); return rootVar(W.getComputedStyle(d.documentElement).getPropertyValue(m[1]).trim(), k + 1); };   // jsdom keeps var() — resolve through the root (#46 r1 MINOR-6 tokens)
      /* ① colours: the payment card vs an app card (a .c-tcard that is not a payment) on the same side */
      const sentPay = mk({ role: 'sent', flow: 'out', amount: '25', status: 'completed', onDetails: noop }).querySelector('.c-tcard');
      const recvPay = mk({ role: 'received', flow: 'in', amount: '12', status: 'completed', onDetails: noop }).querySelector('.c-tcard');
      const sentApp = (() => { const row = S.createAppBubble({ name: 'Chess', state: 'invited', strings: {}, onCancel: noop, onLaunch: noop }); host.append(row); return row.querySelector('.c-tcard'); })();
      const recvApp = (() => { const row = S.createAppBubble({ name: 'Chess', state: 'invite', strings: {}, onJoin: noop }); host.append(row); return row.querySelector('.c-tcard'); })();
      const paint = (el) => ['backgroundColor', 'background', 'border', 'boxShadow'].map((p) => cs(el)[p]).join(' | ');
      got.paint = { sentPay: paint(sentPay), sentApp: paint(sentApp), recvPay: paint(recvPay), recvApp: paint(recvApp) };
      r.colours = paint(sentPay) === paint(sentApp) && paint(recvPay) === paint(recvApp)
        && /--surface-card-sent/.test(paint(sentPay)) && /--outline-card-sent/.test(cs(sentPay).boxShadow)
        && !/--surface-bubble-sent/.test(paint(sentPay)) && /--surface-bubble-received/.test(paint(recvPay));
      /* ② layout order + the time's home */
      const kids = (el) => [...el.children].filter((c) => !c.classList.contains('c-tcard__hit')).map((c) => c.className.split(' ')[0]);
      const withBtns = mk({ role: 'request-out', flow: 'in', amount: '12', status: 'pending', onCancel: noop }).querySelector('.c-tcard');
      const noBtns = sentPay;
      got.orderBtns = kids(withBtns); got.orderNo = kids(noBtns);
      got.amtSize = rootVar(cs(noBtns.querySelector('.c-tcard__amount')).fontSize);
      got.medSize = rootVar(cs(noBtns.querySelector('.c-tcard__top > .c-tcard__medallion')).width);
      /* #46 r1 MINOR-4 (the #1013 r2 M1 rule): a long amount WRAPS inside the bubble — never nowrap (at 320 px "12,345,678.12 IXI"
         ran 10 px past the card); jsdom has no layout, so the computed wrap rule is the pin and the render carries the pixels */
      const amtCs = cs(noBtns.querySelector('.c-tcard__amount'));
      /* #46 r2 n4: the APPROVED J1 values survive the token conversion — padding 10 / 9 px, the amount line-height 1 */
      /* jsdom computes no padding through a var() shorthand — read the stack rule the card matches, resolve its parts */
      const stackRule = [...d.styleSheets].flatMap((sh) => { try { return [...sh.cssRules]; } catch (e) { return []; } })
        .filter((ru) => ru.selectorText === '.c-tcard[data-layout="stack"]' && ru.style.padding && noBtns.matches(ru.selectorText)).pop();
      const padParts = ((stackRule && stackRule.style.padding) || '').match(/var\([^)]*\)|\S+/g) || [];
      got.approved = [rootVar(padParts[0]), rootVar(padParts[2]), amtCs.lineHeight];
      r.approved = got.approved.join() === '10px,9px,1';
      got.amtWrap = [amtCs.whiteSpace, amtCs.overflowWrap || amtCs.getPropertyValue('overflow-wrap'), cs(noBtns.querySelector('.c-tcard__num')).whiteSpace];
      r.wrap = got.amtWrap[0] !== 'nowrap' && got.amtWrap[2] !== 'nowrap' && /^(anywhere|break-word)$/.test(got.amtWrap[1]);
      r.layout = got.orderNo.join() === 'c-tcard__top,c-tcard__amount,c-tcard__bottom'
        && got.orderBtns.join() === 'c-tcard__top,c-tcard__amount,c-tcard__bottom,c-tcard__actions'
        && !!withBtns.querySelector('.c-tcard__top > time') && !withBtns.querySelector('.c-tcard__bottom > time')
        && !noBtns.querySelector('.c-tcard__top > time') && !!noBtns.querySelector('.c-tcard__bottom > time')
        && got.amtSize === '28px' && got.medSize === '24px'
        && noBtns.querySelector('.c-tcard__top').firstElementChild.classList.contains('c-tcard__medallion');
      /* ③ strike + glyph */
      const xSvg = W.SpixiIcons.icon('x').innerHTML;
      const st = (o) => { const el = mk(o).querySelector('.c-tcard'); return { struck: el.querySelector('.c-tcard__amount').hasAttribute('data-strike'), deco: cs(el.querySelector('.c-tcard__num')).textDecoration || cs(el.querySelector('.c-tcard__num')).textDecorationLine || '', unitDeco: cs(el.querySelector('.c-tcard__unit')).textDecoration || '', x: el.querySelector('.c-tcard__medallion svg').innerHTML === xSvg, tone: el.querySelector('.c-tcard__amount').dataset.tone }; };
      got.declined = st({ role: 'received', flow: 'out', amount: '7', status: 'declined' });
      got.canceled = st({ role: 'sent', flow: 'in', amount: '12', status: 'canceled' });
      got.failed = st({ role: 'sent', flow: 'out', amount: '25', status: 'failed', onRetry: noop });
      got.done = st({ role: 'sent', flow: 'out', amount: '25', status: 'completed' });
      r.strike = got.declined.struck && got.canceled.struck && !got.failed.struck && !got.done.struck
        && /line-through/.test(got.declined.deco) && !/line-through/.test(got.failed.deco) && !/line-through/.test(got.declined.unitDeco)
        && got.declined.x && got.canceled.x && got.failed.x && !got.done.x
        && got.declined.tone === 'void' && got.failed.tone === 'void';
      /* ④ Decline gate · Pay disabled when insufficient · Pay names the amount */
      const reqNoD = mk({ role: 'request-in', flow: 'out', amount: '7.00', status: 'actionable', onPay: noop });
      const reqD = mk({ role: 'request-in', flow: 'out', amount: '7.00', status: 'actionable', onPay: noop, onDecline: noop });
      const reqPoor = mk({ role: 'request-in', flow: 'out', amount: '7.00', status: 'actionable', insufficient: true, onPay: noop, onDecline: noop });
      const btnTexts = (row) => [...row.querySelectorAll('.c-button')].map((b) => b.textContent.trim());
      got.reqNoD = btnTexts(reqNoD); got.reqD = btnTexts(reqD);
      r.decline = got.reqNoD.join() === 'Pay 7 IXI' && got.reqD.join() === 'Decline,Pay 7 IXI';
      const poorPay = [...reqPoor.querySelectorAll('.c-button')].pop();
      const noteId = poorPay && poorPay.getAttribute('aria-describedby');
      r.insufficient = !!poorPay && poorPay.disabled === true && !!noteId && !!reqPoor.querySelector('#' + noteId)
        && !([...reqD.querySelectorAll('.c-button')].pop().disabled);
      /* ④b (#46 r1 auditor C) the money latch: a double tap on Pay (and on Decline) fires its handler ONCE (oneShot) */
      let pays = 0, decs = 0;
      const latch = mk({ role: 'request-in', flow: 'out', amount: '7', status: 'actionable', onPay: () => { pays += 1; }, onDecline: () => { decs += 1; } });
      const [lDec, lPay] = [...latch.querySelectorAll('.c-button')];
      lPay.click(); lPay.click(); lDec.click(); lDec.click();
      got.latch = [pays, decs, lPay.disabled, lDec.disabled];
      r.latch = pays === 1 && decs === 1 && lPay.disabled === true && lDec.disabled === true;
      /* ④c (#46 r3) the peer nick in a label is bidi-ISOLATED (FSI U+2068 … PDI U+2069) — in the visible label AND the aria words */
      const iso = (nick) => { const row = mk({ role: 'received', flow: 'in', amount: '12', status: 'completed', name: nick }); return [row.querySelector('.c-tcard__label').textContent, row.querySelector('.c-tcard').getAttribute('aria-label') || (row.querySelector('.c-tcard__hit') || {}).getAttribute && row.querySelector('.c-tcard__hit').getAttribute('aria-label')]; };
      got.bidi = [iso('علي'), iso('Ana!'), iso('Ana\u2069\u202Ex'), iso('\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'), iso('\u0645\u06CC\u200C\u0634\u0648\u062F')];   // #46 r4: own PDI + RLO · r5: ZWJ family emoji + Persian ZWNJ
      r.bidi = got.bidi[0][0] === '\u2068علي\u2069 sent you' && got.bidi[1][0] === '\u2068Ana!\u2069 sent you'
        && got.bidi[2][0] === '\u2068Anax\u2069 sent you'
        && got.bidi[3][0] === '\u2068\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u2069 sent you' && got.bidi[4][0] === '\u2068\u0645\u06CC\u200C\u0634\u0648\u062F\u2069 sent you'   // r5: ZWJ / ZWNJ are text, kept   // ONE isolate: the nick's own controls are stripped (FileRowRules.cs cleanName's set)
        && got.bidi.every(([lab, aria]) => typeof aria === 'string' && aria.startsWith(lab + ',') && (lab.match(/[\u2066-\u2069\u202A-\u202E]/g) || []).length === 2);
      /* ⑤ fiat */
      const fiatOf = (f) => { const row = mk({ role: 'received', flow: 'in', amount: '12', status: 'completed', fiat: f }); const el = row.querySelector('.c-tcard__fiat'); return el ? el.textContent : null; };
      got.fiat = [fiatOf('<$0.01'), fiatOf('$0.00'), fiatOf('$3.40')];
      r.fiat = got.fiat[0] === null && got.fiat[1] === null && got.fiat[2] === '$3.40';
      /* ⑥ "+" rule */
      const amtOf = (o) => mk(o).querySelector('.c-tcard__amount').textContent;
      got.plus = [amtOf({ role: 'received', flow: 'in', amount: '+12', status: 'completed' }), amtOf({ role: 'received', flow: 'in', amount: '+12', status: 'pending' }), amtOf({ role: 'sent', flow: 'in', amount: '12', status: 'completed' }), amtOf({ role: 'sent', flow: 'out', amount: '12', status: 'completed' })];
      r.plus = got.plus.join('|') === '+12 IXI|12 IXI|+12 IXI|12 IXI';
      /* ⑦ setPaymentStatus in place */
      const list = d.createElement('div');
      list.style.cssText = 'height:100px;overflow:auto';
      host.append(list);
      const before = d.createElement('p'); const after = d.createElement('p');
      const mid = S.createPaymentBubble({ role: 'sent', flow: 'out', amount: '5', status: 'pending', strings: {} });
      list.append(before, mid, after);
      list.scrollTop = 0;
      const top0 = list.scrollTop;
      const next = S.setPaymentStatus(mid, { status: 'completed' });
      r.inPlace = next !== mid && next.previousElementSibling === before && next.nextElementSibling === after && list.children.length === 3
        && list.scrollTop === top0 && next.dataset.status === 'completed' && !mid.isConnected;
      r.noErr = K.noErr(s.errs);
    } finally { s.W.close(); }
    /* ⑧ the label through the GROUP shell: the sender's nick is known */
    const g = await K.open({ group: true, rows: false, hist: (x) => {
      x.push('addPaymentRequest', 'gp1', 'tx2', 'addrAna', 'Ana', '', 'Payment received', '12', 'Completed', 'check', String(T0), 'False', 'True', 'True', 'True', 'payment', 'completed', '', 'False');
    } });
    try {
      await sleep(150);
      got.shellGroup = (g.d.querySelector('#messages [data-msgid="gp1"] .c-tcard__label') || {}).textContent;
    } finally { g.W.close(); }
    r.shellNames = got.shell1 === 'Sent you' && /^\+12 IXI$/.test(got.shell1Amt || '') && got.shellGroup === '\u2068Ana\u2069 sent you';
  } catch (e) { r.err = e.message; }
  ok(Object.values(r).every((v) => v === true),
    '★★ S20 Q J1 (#1440) the payment bubble on the built chat shell: today\'s card colours on both sides (equal to a non-payment .c-tcard, the sent tint never the sent bubble), label row → 28 px amount → badge row → buttons with the time in the label row only beside buttons, declined / canceled struck (the number) and failed not, ✕ for all three, Decline only when wired, Pay disabled when short (+ its caption), fiat hidden below 0.01, "+" on money in, setPaymentStatus in place, and the shell\'s labels ("Sent you" in 1:1 · "<nick> sent you" in a group) — '
    + JSON.stringify({ r, got }));
}
