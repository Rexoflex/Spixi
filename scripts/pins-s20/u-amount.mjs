/* ==== S20 U — the wallet AMOUNT (J2 tweak 3, DECISIONS #1440) ====
 * WHAT: on the BUILT index.html (jsdom, C# pushes) a sent amount reads with a REAL minus (U+2212, "−25"), never the
 * hyphen-minus; the fiat line too ("−$1.20"); a received one keeps "+" and its green; a failed one stays unsigned. Every
 * amount is followed by the unit "IXI" in its own span at 0.72 em, regular weight, muted (--text-neutral-02) — on a
 * received row the unit inherits the green. The accessible text keeps a space ("−25 IXI"). Declared cascade (jsdom
 * has no layout; the px were measured in Chromium on the render).
 * DELIBERATE BREAKS (each run once, the pin failed for exactly that reason, then restored — see the S20 U report):
 *   ① txlist-item.js realMinus → identity — the sent amount keeps the hyphen-minus.
 *   ② txlist-item.css `.c-txlist-item__unit { font-size: 0.72em … }` → `font-size: 1em` — the unit is no longer 72 %.
 *   ③ wallet-shell.js renderWalletTxList `unit: 'IXI'` → `unit: ''` — no unit, and no real minus either. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  let s = null;
  try {
    s = await K.boot('index.html', { now: new Date(2026, 9, 13, 15, 0).getTime() });
    s.push('selectTab', 'tab2');
    await sleep(100);
    const t = String(Math.floor(new Date(2026, 9, 13, 9, 30).getTime() / 1000));
    s.push('clearPaymentActivity', 'all');
    s.push('addPaymentActivity', 'a1', '0', 'Ana', t, '25', '1.2', 'true');
    s.push('addPaymentActivity', 'a2', '1', 'Leo', t, '12', '0.5', 'true');
    s.push('addPaymentActivity', 'a3', '0', 'Sofia', t, '18.2', '0.8', 'error');
    s.push('clearPaymentActivityDone');
    await sleep(200);
    const W = s.W;
    const q = (id, sel) => s.d.querySelector('#wallet-scroll .c-txlist-item[data-txid="' + id + '"] ' + sel);
    const decl = (el, p) => (el ? W.getComputedStyle(el).getPropertyValue(p).trim() : '');
    const amt = (id) => { const a = q(id, '.c-txlist-item__amount'); return a ? a.textContent : ''; };
    const lead = (id) => { const a = q(id, '.c-txlist-item__amount'); return a && a.firstChild ? a.firstChild.textContent : ''; };
    const unit = (id) => q(id, '.c-txlist-item__amount > .c-txlist-item__unit');
    const r1 = {
      sent: amt('a1'), sentLead: lead('a1') === '−25', noHyphen: !/-/.test(amt('a1')) && !/-/.test(q('a1', '.c-txlist-item__fiat').textContent),
      sentFiat: q('a1', '.c-txlist-item__fiat').textContent === '−$1.20',
      recv: amt('a2') === '+12 IXI', failed: amt('a3') === '18.2 IXI',
      a11y: amt('a1') === '−25 IXI',
    };
    ok(r1.sentLead && r1.noHyphen && r1.sentFiat && r1.recv && r1.failed && r1.a11y,
      '★ S20 J2 (#1440): a sent amount reads with the REAL minus U+2212 (fiat too, no hyphen-minus anywhere), received keeps "+", failed stays unsigned, each followed by " IXI" — ' + JSON.stringify(r1));
    const u1 = unit('a1'), u2 = unit('a2');
    const r2 = {
      unitText: !!u1 && u1.textContent === ' IXI',
      size: decl(u1, 'font-size') === '0.72em',
      weight: decl(u1, 'font-weight') === 'var(--font-weight-regular)',
      muted: decl(u1, 'color') === 'var(--text-neutral-02)',
      recvGreen: decl(q('a2', '.c-txlist-item__amount'), 'color') === 'var(--text-amount-positive)',
      recvUnitInherits: !!u2 && decl(u2, 'color') === decl(q('a2', '.c-txlist-item__amount'), 'color'),
    };
    ok(Object.values(r2).every(Boolean),
      '★ S20 J2 (#1440): the "IXI" unit is 72 % of the amount, regular, muted; a received amount stays green and its unit follows the green — ' + JSON.stringify(r2));
    ok(K.noErr(s.errs), '★ S20 J2 (#1440): the amount pass raised no page error — ' + JSON.stringify(s.errs));
  } finally {
    if (s) s.close();
  }
}
