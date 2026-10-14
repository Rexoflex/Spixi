/* ==== S20 U — the wallet row FACE (J2 tweak 1, DECISIONS #1440) ====
 * WHAT: on the BUILT index.html (home shell, jsdom; C# pushes via executeUiCommand) every wallet row leads with the
 * counterparty's 44 px avatar and a 20 px direction badge — never the old arrow circle:
 *   · a contact (C# pushes its NICKNAME) → its roster photo, or the monogram when it has none;
 *   · a group → the group avatar (the `users` glyph placeholder);
 *   · a nickname TWO roster rows share → the monogram only (never one of their photos);
 *   · a stranger's raw address → the wallet glyph on a tonal disc; a nickless contact (its address IS its nick) →
 *     joined by address, an avatar (not the stranger disc);
 *   · the badge: sent = ↗ labelled "Sent" on the neutral fill, received = ↙ labelled "Received" on the success-tonal
 *     fill, a 2 px ring in --surface-screen (declared cascade — jsdom has no layout); the Pending chip stays;
 *   · hidden balance → no face may say WHO: every row is the wallet disc, no photo, no initials.
 * DELIBERATE BREAKS (each run once, the pin failed for exactly that reason, then restored — see the S20 U report):
 *   ① home.html faceOf `hits.length === 1 ? hits[0]` → `hits[0]` — the shared-nickname row shows a photo.
 *   ② txlist-item.js `el.dataset.direction = direction` → `= 'out'` — the received badge loses the success fill.
 *   ③ home.html faceOf `return r.address ? { unknown: true } : { name: r.name };` → `return { name: r.name };` — no wallet disc.
 *   ④ txlist-item.css: drop `--tx-ring` from the [aria-current] rule — the selected row's badge keeps the screen ring. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  let s = null;
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const STRANGER = '3X7kq9PmWvR2tYb8NcLd4Hs6ZuJf5gAe1oQi9KxM2yTr4UoPb7VnDc3LhS8FwEjGq';   // 65 chars = address-shaped
  const NICKLESS = '2Bv8nQm4KfLp6WsR9tYc3XhJ7dZa5GuE1oNi8Vb2Mq4Rk7TyPw3Lc6Sx9Hf5Dj1Az';
  try {
    const now = new Date(2026, 9, 13, 15, 0).getTime();
    s = await K.boot('index.html', { now });
    s.push('selectTab', 'tab2');
    await sleep(100);
    s.push('clearContacts');
    s.push('addContact', 'AnaAddr1', 'Ana Kovač', PNG, 'false', '0', 'contact', '');
    s.push('addContact', 'LeoAddr2', 'Leo Martins', '', 'false', '0', 'contact', '');
    s.push('addContact', 'BledAddr3', 'Weekend in Bled', '', 'false', '0', 'contact', 'group');
    s.push('addContact', 'SamAddr4', 'Sam', PNG2, 'false', '0', 'contact', '');
    s.push('addContact', 'SamAddr5', 'Sam', '', 'false', '0', 'contact', '');
    s.push('addContact', NICKLESS, NICKLESS, '', 'false', '0', 'contact', '');
    await sleep(150);
    const t = Math.floor(new Date(2026, 9, 13, 9, 30).getTime() / 1000);
    s.push('clearPaymentActivity', 'all');
    s.push('addPaymentActivity', 'tx1', '0', 'Ana Kovač', String(t), '25', '', 'true');
    s.push('addPaymentActivity', 'tx2', '1', 'Leo Martins', String(t - 60), '12', '', 'true');
    s.push('addPaymentActivity', 'tx3', '0', 'Weekend in Bled', String(t - 120), '12', '', 'false');
    s.push('addPaymentActivity', 'tx4', '1', 'Sam', String(t - 180), '5', '', 'true');
    s.push('addPaymentActivity', 'tx5', '1', STRANGER, String(t - 240), '3', '', 'true');
    s.push('addPaymentActivity', 'tx6', '0', NICKLESS, String(t - 300), '1', '', 'true');
    s.push('clearPaymentActivityDone');
    await sleep(200);
    const W = s.W;
    const row = (id) => s.d.querySelector('#wallet-scroll .c-txlist-item[data-txid="' + id + '"]');
    const face = (id) => { const r = row(id); return r && r.querySelector('.c-txlist-item__face'); };
    const dir = (id) => { const r = row(id); return r && r.querySelector('.c-txlist-item__dir'); };
    const decl = (el, p) => (el ? W.getComputedStyle(el).getPropertyValue(p).trim() : '');
    /* jsdom does not expand a shorthand that holds var() — read the matching rules' own text (the cascade's input) */
    const ruleText = (el) => {
      const out = [];
      for (const sh of s.d.styleSheets) { let rs = []; try { rs = sh.cssRules; } catch (e) {} for (const r of rs) if (r.selectorText && el && el.matches(r.selectorText)) out.push(r.style.cssText); }
      return out.join(' ');
    };
    const img = (id) => { const f = face(id); const i = f && f.querySelector('.c-avatar > img'); return i ? i.getAttribute('src') : ''; };
    const ini = (id) => { const f = face(id); const i = f && f.querySelector('.c-avatar__initials'); return i ? i.textContent : ''; };
    const disc = (id) => !!(face(id) && face(id).querySelector('.c-txlist-item__wallet svg'));
    const r1 = {
      noCircle: !s.d.querySelector('#wallet-scroll .c-txlist-item__direction'),
      size44: !!face('tx1') && face('tx1').querySelector('.c-avatar').dataset.size === '44',
      anaPhoto: img('tx1') === PNG,
      leoMono: !img('tx2') && ini('tx2') === 'LM',
      groupAvatar: !img('tx3') && !ini('tx3') && !!(face('tx3') && face('tx3').querySelector('.c-avatar[data-placeholder] svg')),
      pendingChip: !!(row('tx3') && row('tx3').querySelector('.c-txlist-item__meta .c-badge[data-type="warning"]')),
      samNoPhoto: !img('tx4') && ini('tx4') === 'S',
      stranger: disc('tx5') && !(face('tx5').querySelector('.c-avatar')),
      nickless: !disc('tx6') && !!(face('tx6') && face('tx6').querySelector('.c-avatar')),
    };
    ok(Object.values(r1).every(Boolean),
      '★ S20 J2 (#1440): every wallet row leads with the 44 px face — the contact photo, the monogram without one, the GROUP avatar, the monogram (never a photo) for a nickname two contacts share, the wallet disc for a stranger\'s address, an avatar for a nickless contact (joined by address); the arrow circle is gone and Pending stays — ' + JSON.stringify(r1));
    const lab = (id) => { const sv = dir(id) && dir(id).querySelector('svg'); return sv ? sv.getAttribute('aria-label') : ''; };
    const r2 = {
      sentLab: lab('tx1') === 'Sent', recvLab: lab('tx2') === 'Received', samRecvLab: lab('tx4') === 'Received',
      sentFill: decl(dir('tx1'), 'background') === 'var(--surface-neutral-03)' || decl(dir('tx1'), 'background-color') === 'var(--surface-neutral-03)',
      recvFill: [decl(dir('tx2'), 'background'), decl(dir('tx2'), 'background-color')].includes('var(--surface-success-inverse)'),
      recvInk: decl(dir('tx2'), 'color') === 'var(--icon-success)',
      sentInk: decl(dir('tx1'), 'color') === 'var(--icon-neutral-01)',
      ring: /border: var\(--outline-width-2\) solid var\(--tx-ring, var\(--surface-screen\)\)/.test(ruleText(dir('tx1'))),
      size20: decl(dir('tx1'), 'width') === 'var(--size-icon-20)',
    };
    ok(Object.values(r2).every(Boolean),
      '★ S20 J2 (#1440): the 20 px direction badge — sent ↗ "Sent" on the neutral fill, received ↙ "Received" on the success-tonal fill, ringed 2 px in the list surface — ' + JSON.stringify(r2));
    /* #46 r1 NIT: the ring follows the row — a selected row (desktop) rings the badge in the selected fill, not the screen */
    const rest = decl(row('tx1'), '--tx-ring');
    s.push('selectTx', 'tx1');
    await sleep(60);
    const r2b = { rest: rest === '' || rest === 'var(--surface-screen)', sel: row('tx1').hasAttribute('aria-current') && decl(row('tx1'), '--tx-ring') === 'var(--surface-action-tonal-default)' };
    s.push('selectTx', '');
    await sleep(60);
    ok(r2b.rest && r2b.sel,
      '★ S20 J2 (#46 r1): the badge ring follows the row state — the screen colour at rest, the selected fill on a selected row (hover sets --tx-ring the same way) — ' + JSON.stringify(r2b));
    /* hidden balance: no face says WHO */
    s.push('setHideBalance', 'True');
    await sleep(120);
    const rows = [...s.d.querySelectorAll('#wallet-scroll .c-txlist-item')];
    const r3 = { n: rows.length, allDisc: rows.length === 6 && rows.every((r) => !!r.querySelector('.c-txlist-item__wallet') && !r.querySelector('.c-avatar')) };
    s.push('setHideBalance', 'False');
    await sleep(120);
    r3.back = img('tx1') === PNG;
    ok(r3.allDisc && r3.back,
      '★ S20 J2 (#1440): with the balance hidden no row face names the counterparty (every row = the wallet disc, no photo, no initials); shown again → the photos return — ' + JSON.stringify(r3));
    /* the roster lands AFTER the rows → the faces follow without a new payment push */
    s.push('clearContacts');
    await sleep(150);
    const lost = !img('tx1');
    s.push('addContact', 'AnaAddr1', 'Ana Kovač', PNG, 'false', '0', 'contact', '');
    await sleep(200);
    const r4 = { lost, back: img('tx1') === PNG };
    ok(r4.lost && r4.back,
      '★ S20 J2 (#1440): a roster change re-renders the wallet faces (the roster can land after the payment burst) — ' + JSON.stringify(r4));
    ok(K.noErr(s.errs), '★ S20 J2 (#1440): the wallet face pass raised no page error — ' + JSON.stringify(s.errs));
  } finally {
    if (s) s.close();
  }
}
