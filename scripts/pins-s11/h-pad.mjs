/* ==== S11 H (#1263) — amount-pad.js, the shared keypad, on the BUILT home shell's bundle ====
 *   · padApply (pure): no leading zeros · one decimal mark (a second is ignored; on empty it gives 0.) · ≤ 8 decimals
 *     (IXI precision) · ≤ 15 integer digits · backspace ('0.' ← → '' so the grey placeholder returns) · clear.
 *   · The decimal KEY's label comes from the same localeSeps() the display uses: "." en-US, "," de-DE / fr-FR / sl-SI —
 *     and a typed 1 , 4 is 1.4 on the state in every one of them (the #607 "14." class cannot occur: the key emits an id).
 *   · a11y: the pad is a named group, backspace and the decimal key are labelled; the amount is an <output> (live, atomic)
 *     — never an <input>; the grey placeholder is 0.00 in the locale's mark.
 *   · Neither money step 2 carries an <input> (no OS keyboard can rise, #609).
 *   · The read-only fiat line renders only with a usable price (fiatPrice) and a nonzero amount; the home shell passes
 *     none today (C# pushes no unit price — BE ask), so no line. */
import { hKit } from './h-kit.mjs';
export default async function (h) {
  const { ok } = h;
  const K = hKit(h);
  const r = {};
  let s = null;
  try {
    s = await K.boot();
    const S = s.W.Spixi;
    const run = (keys, decimals) => keys.reduce((acc, k) => S.padApply(acc, k, decimals == null ? undefined : { decimals }), '');
    r.noLeadingZero = run(['0', '0', '5']) === '5' && run(['0']) === '0' && run(['0', 'dec', '0', '5']) === '0.05';
    r.oneMark = run(['1', 'dec', '2', 'dec', '3']) === '1.23' && run(['dec']) === '0.';
    r.precision = run(['1', 'dec', '1', '2', '3', '4', '5', '6', '7', '8', '9']) === '1.12345678'
      && run(['1', 'dec', '5', '5'], 1) === '1.5';
    r.intCap = run(Array(20).fill('9')) === '9'.repeat(15);
    r.back = S.padApply('0.', 'back') === '' && S.padApply('12.5', 'back') === '12.' && S.padApply('7', 'back') === ''
      && S.padApply('', 'back') === '' && S.padApply('12.5', 'clear') === '';
    r.junk = S.padApply('12', 'x') === '12' && S.padApply('12', '.') === '12';   // only key ids — never a character
    const labels = {};
    const typed = {};
    for (const L of ['en-US', 'de-DE', 'fr-FR', 'sl-SI']) {
      s.d.documentElement.lang = L;
      let val = '';
      const pad = S.createAmountPad({ onChange: (x) => { val = x; } });
      labels[L] = pad.querySelector('[data-key="dec"]').textContent;
      for (const k of ['1', 'dec', '4']) pad.querySelector('[data-key="' + k + '"]').click();
      typed[L] = val;
    }
    r.keyLabels = labels['en-US'] === '.' && labels['de-DE'] === ',' && labels['fr-FR'] === ',' && labels['sl-SI'] === ',';
    r.no607 = Object.values(typed).every((x) => x === '1.4');
    s.d.documentElement.lang = 'de-DE';
    const disp = S.createAmountDisplay({ className: 'x' });
    const pad = S.createAmountPad({ display: disp });
    r.placeholder = disp.tagName === 'OUTPUT' && disp.getAttribute('aria-live') === 'polite' && disp.getAttribute('aria-atomic') === 'true'
      && disp.querySelector('.c-amount__zero').textContent === '0,00' && disp.querySelector('.c-amount__caret').getAttribute('aria-hidden') === 'true'
      && disp.querySelector('.c-amount__unit').textContent === 'IXI';
    r.a11y = pad.getAttribute('role') === 'group' && pad.getAttribute('aria-label') === 'Number pad'
      && pad.querySelector('[data-key="back"]').getAttribute('aria-label') === 'Delete digit'
      && pad.querySelector('[data-key="dec"]').getAttribute('aria-label') === 'Decimal mark'
      && pad.querySelectorAll('button.c-amount-pad__key[type="button"]').length === 12;
    pad._set('1234.5');
    r.grouped = disp.querySelector('.c-amount__num').textContent === '1.234,5' && pad._value() === '1234.5';
    s.d.documentElement.lang = 'en-US';
    K.wallet(s);
    await K.sleep(80);
    [...s.d.querySelectorAll('.c-wallet-hero__qa')][0].click();
    await K.sleep(350);
    const v = s.d.querySelector('.wallet-takeover .c-wallet-send');
    v.querySelector('.c-wallet-send__contacts .c-contact-row').click();
    r.noInputSend = !v.querySelector('.c-wallet-send__section--amount input') && !v.querySelector('.c-wallet-send__actions input')
      && v.querySelector('.c-wallet-send__amount').tagName === 'OUTPUT';
    /* the read-only fiat line: only with a price C# gave (#1041) — none today, so the shell's compose shows none */
    r.noFiatToday = v.querySelector('.c-wallet-send__fiat').hidden;
    const fiatOf = (price, type) => {
      const fv = S.createWalletSend({ lockedRecipient: { name: 'P', address: 'PEER1234567890ABCDEFGHIJKL' }, balance: '1000', fee: '0.001', strings: {}, host: s.d.body, fiatPrice: price });
      s.d.body.append(fv);
      for (const ch of type) fv.querySelector('.c-amount-pad__key[data-key="' + (ch === '.' ? 'dec' : ch) + '"]').click();
      const f = fv.querySelector('.c-wallet-send__fiat');
      const out = f.hidden ? null : f.textContent;
      fv.remove();
      return out;
    };
    r.fiat = fiatOf('0.002', '100') === '≈ $0.20' && fiatOf('0.002', '') === null && fiatOf('0', '100') === null && fiatOf(null, '100') === null
      && fiatOf('abc', '100') === null;
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.err = e.message; }
  finally { if (s) { s.close(); s = null; } }
  ok(Object.values(r).length >= 15 && Object.values(r).every((x) => x === true),
    '★ S11 H (#1263) AMOUNT PAD: no leading zeros · one decimal mark · ≤ 8 decimals · ≤ 15 integer digits · backspace / clear · key ids only · the decimal key reads "." en-US and "," de/fr/sl and 1 , 4 is 1.4 in all four (#607 closed by construction) · an <output> (live, atomic) with the locale\'s grey 0,00 · a named pad, labelled keys · no <input> on Send step 2 (#609: no OS keyboard) · the fiat line only with a C# price (≈ $0.20 for 100 × 0.002; none for 0 / absent / junk / an empty amount) — ' + JSON.stringify(r));
}
