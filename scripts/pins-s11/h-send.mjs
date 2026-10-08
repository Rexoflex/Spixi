/* ==== S11 H (#1263) — Send, 2-step flow A, on the BUILT home shell ====
 *   · STEP ORDER: the takeover opens on step 1 (the picker; amount + keypad off screen, no quote asked); a pick moves to
 *     step 2 and asks the SAME amount-0 quote as before (`ixian:feeQuery:<addr>:0`); the To chip names the pick + the
 *     #211 short address; the top-bar Back on step 2 returns to step 1 (takeover stays), a second Back closes it.
 *   · THE WIRE, BYTE-FOR-BYTE: keypad 1 2 . 5 → `ixian:feeQuery:<addr>:12.5`; the quote arms Review; the Review sheet
 *     reads 12.5 / 0.001 / 12.501 IXI; Confirm emits `ixian:signSend:<addr>:12.5` — the exact strings the old input
 *     UI emitted for the same amount (differential base↔new run in the S11 H report); signSendResult ok closes it.
 *   · de-DE: the decimal key IS "," and the display reads 12,5 — the wire still carries 12.5 (#607 closed by construction).
 *   · OVER BALANCE in two stages: 200 of 100 → error colour + "More than your 100 IXI" + Use max at once (no fee
 *     needed); 99.9995 is clean until the quote lands, then amount + fee is over → the insufficient line.
 *   · USE MAX goes through the EXISTING Max confirm (the "Send your entire balance?" alertdialog) — nothing fills
 *     until "Yes, I understand"; then the amount is C#'s solved max.
 *   · Desktop hardware keys drive the pad (digits, Backspace); a modified key or a key typed into an input does not.
 *   · Long-press backspace clears. Reduced motion: the caret and the shake are static in the built CSS. */
import { hKit } from './h-kit.mjs';
export default async function (h) {
  const { ok, stripCssComments, readFileSync, join, root } = h;
  const K = hKit(h);
  const { sleep, ADA } = K;
  const r = {};
  let s = null;
  const open = async (opts = {}) => {
    s = await K.boot(opts);
    K.wallet(s, opts);
    await sleep(80);
    [...s.d.querySelectorAll('.c-wallet-hero__qa')][0].click();   // Send
    await sleep(350);
    return s.d.querySelector('.wallet-takeover .c-wallet-send');
  };
  const back = () => s.d.querySelector('.wallet-takeover .c-topbar .c-button').click();
  const reviewBtn = (v) => v.querySelector('.c-wallet-send__actions > .c-button');
  const quotes = () => s.sent.filter((x) => /^ixian:feeQuery:/.test(x));
  try {
    /* ① step order + Back */
    let v = await open();
    const amtSec = v.querySelector('.c-wallet-send__section--amount');
    r.opensOnStep1 = v.dataset.step === '1' && !v.querySelector('.c-wallet-send__picker').closest('[hidden]')
      && amtSec.hidden && v.querySelector('.c-wallet-send__actions').hidden && quotes().length === 0;
    v.querySelector('.c-wallet-send__contacts .c-contact-row').click();
    await sleep(30);
    const chip = v.querySelector('.c-wallet-send__picked');
    r.pickToStep2 = v.dataset.step === '2' && !amtSec.hidden && !!v.querySelector('.c-wallet-send__picker').closest('[hidden]')
      && !v.querySelector('.c-wallet-send__actions').hidden && quotes().join('|') === 'ixian:feeQuery:' + ADA + ':0';
    r.chip = chip.tagName === 'BUTTON' && chip.querySelector('.c-wallet-send__pickedname').textContent === 'Ada'
      && chip.querySelector('.c-wallet-send__pickedaddr').textContent === 'ADAxQ7mW2…6dGe1u' && !!chip.querySelector('.c-avatar');
    back();
    await sleep(30);
    r.backIsAStep = !!s.d.querySelector('.wallet-takeover') && v.dataset.step === '1';
    v.querySelector('.c-wallet-send__contacts .c-contact-row').click();
    await sleep(30);
    chip.click();
    r.chipIsAStep = v.dataset.step === '1';
    back();
    await sleep(500);
    r.secondBackCloses = !s.d.querySelector('.wallet-takeover');
    s.close(); s = null;

    /* ② the wire, en-US */
    v = await open();
    v.querySelector('.c-wallet-send__contacts .c-contact-row').click();
    await sleep(30);
    K.type(v, '12.5');
    await sleep(420);
    r.quoteWire = quotes().pop() === 'ixian:feeQuery:' + ADA + ':12.5';
    r.gatedUntilQuote = reviewBtn(v).disabled;
    s.push('setSendQuote', ADA, '12.5', '0.001', '100', '', '');
    await sleep(20);
    r.quoteArms = !reviewBtn(v).disabled;
    reviewBtn(v).click();
    await sleep(80);
    const sheet = [...s.d.querySelectorAll('.c-sendreview')].pop();
    r.sheetRows = !!sheet && [...sheet.querySelectorAll('.c-sendreview__rowvalue')].map((x) => x.textContent).join('|') === '12.5 IXI|0.001 IXI|12.501 IXI';
    [...sheet.querySelectorAll('.c-sendreview__actions .c-button')].pop().click();
    await sleep(30);
    r.signWire = s.sent[s.sent.length - 1] === 'ixian:signSend:' + ADA + ':12.5'
      && s.sent.filter((x) => /^ixian:signSend:/.test(x)).length === 1;
    s.push('signSendResult', 'ok', '');
    await sleep(1500);
    r.okCloses = !s.d.querySelector('.wallet-takeover');
    r.noErr1 = K.noErr(s.errs);
    s.close(); s = null;

    /* ③ de-DE: the key and the display agree; the wire is canonical */
    v = await open({ lang: 'de-DE' });
    v.querySelector('.c-wallet-send__contacts .c-contact-row').click();
    await sleep(30);
    r.deKey = v.querySelector('.c-amount-pad__key[data-key="dec"]').textContent === ',';
    K.type(v, '12,5');
    await sleep(420);
    r.deShown = K.shown(v, '.c-wallet-send__amount') === '12,5' && quotes().pop() === 'ixian:feeQuery:' + ADA + ':12.5';
    s.close(); s = null;

    /* ④ over balance, two stages · ⑤ Use max → the existing Max confirm */
    v = await open();
    v.querySelector('.c-wallet-send__contacts .c-contact-row').click();
    await sleep(30);
    s.push('setSendQuote', ADA, '0', '', '100', '99.999', '');   // the amount-0 answer: balance + C#'s solved max
    await sleep(20);
    const amt = v.querySelector('.c-wallet-send__amount');
    const over = v.querySelector('.c-wallet-send__over');
    K.type(v, '200');
    await sleep(20);
    r.stage1 = amt.dataset.error !== undefined && !over.hidden
      && over.querySelector('.c-wallet-send__error').textContent === 'More than your 100 IXI'
      && v.querySelector('.c-wallet-send__amountrow').hidden && !v.querySelector('.c-wallet-send__usemax').disabled
      && reviewBtn(v).disabled;
    for (let i = 0; i < 6; i++) K.key(v, 'back');
    K.type(v, '99.9995');
    await sleep(420);
    r.stage2waits = amt.dataset.error === undefined && over.hidden;
    s.push('setSendQuote', ADA, '99.9995', '0.001', '100', '', '');
    await sleep(20);
    r.stage2 = amt.dataset.error !== undefined && !over.hidden
      && over.querySelector('.c-wallet-send__error').textContent === 'Not enough IXI to cover this amount plus the network fee.'
      && reviewBtn(v).disabled;
    v.querySelector('.c-wallet-send__usemax').click();
    await sleep(60);
    const modal = s.d.querySelector('.c-modal');
    r.useMaxConfirms = !!modal && /Send your entire balance\?/.test(modal.textContent) && modal.getAttribute('role') === 'alertdialog'
      && K.shown(v, '.c-wallet-send__amount') === '99.9995';                                  // nothing filled yet
    [...modal.querySelectorAll('.c-button')].find((b) => /understand/i.test(b.textContent)).click();
    await sleep(30);
    r.useMaxFills = K.shown(v, '.c-wallet-send__amount') === '99.999' && amt.dataset.error === undefined && over.hidden;

    /* ⑥ desktop hardware keys · ⑦ long-press clear */
    for (let i = 0; i < 8; i++) K.key(v, 'back');
    const kd = (k, extra = {}, target = s.d.body) => target.dispatchEvent(new s.W.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra }));
    kd('4'); kd('2'); kd('.'); kd('5');   // ★ #46 r3 MINOR-3 re-base: en-US decimal is '.'; ',' is grouping now (h-r3 pins it)
    kd('9', { ctrlKey: true });
    const inp = s.d.createElement('input'); s.d.body.append(inp);
    kd('7', {}, inp);
    kd('Backspace');
    r.hwKeys = K.shown(v, '.c-wallet-send__amount') === '42.';
    const bk = v.querySelector('.c-amount-pad__key[data-key="back"]');
    bk.dispatchEvent(new s.W.Event('pointerdown', { bubbles: true }));
    await sleep(650);
    bk.dispatchEvent(new s.W.Event('pointerup', { bubbles: true }));
    bk.click();
    r.longPressClears = amt.dataset.empty !== undefined && !!amt.querySelector('.c-amount__zero');
    r.noErr2 = K.noErr(s.errs);
    s.close(); s = null;

    /* ⑧ the desktop pane: the same two steps, the keypad visible, hardware keys */
    v = await open({ desktop: true });
    v.querySelector('.c-wallet-send__contacts .c-contact-row').click();
    await sleep(30);
    s.d.body.dispatchEvent(new s.W.KeyboardEvent('keydown', { key: '3', bubbles: true, cancelable: true }));
    r.desktop = s.d.documentElement.hasAttribute('data-desktop') && v.dataset.step === '2'
      && !v.querySelector('.c-wallet-send__actions').hidden && K.shown(v, '.c-wallet-send__amount') === '3';
  } catch (e) { r.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(r).length >= 24 && Object.values(r).every((x) => x === true),
    '★ S11 H (#1263) SEND 2-STEP on the built home shell: opens on step 1 (no quote) · a pick → step 2 with the same amount-0 quote · the To chip (name + #211 address) · Back on step 2 = step 1, then closes · keypad 12.5 → feeQuery …:12.5 → Review → 12.5 / 0.001 / 12.501 → signSend …:12.5 (the old UI\'s exact strings) · de-DE "," key + 12,5 shown, 12.5 on the wire · over balance at once (amount > balance) and after the quote (amount + fee) · Use max = the existing Max confirm, fills only on yes · hardware keys · long-press clear · the desktop pane — ' + JSON.stringify(r));

  const css = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/index.html'), 'utf8'));
  ok(/@media \(prefers-reduced-motion: reduce\) \{\s*\.c-amount__caret, \.c-amount\[data-shake\] \.c-amount__row \{ animation: none; \}/.test(css)
     && /\.c-amount__caret \{[^}]*animation: c-amount-blink/.test(css),
    '★ S11 H (#1263): the BUILT home shell blinks the caret and shakes an over-balance amount once — and both are static under prefers-reduced-motion');
}
