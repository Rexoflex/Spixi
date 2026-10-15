/* ==== SESSION 9 (B2 f2) — TOGGLE LAYOUT B (Damir) → ★ S20G R-1 RE-BASE: ONE switch-row geometry ====
 * Was (S9 B2 f2): a switch row with a stacked label was a two-row grid (`display: contents` stack, the switch centred on
 * the TITLE line, the description on row 2 under the switch column); S20F W-2 (#1408/#1409) took the hub rows out of it.
 * ★ S20G R-1 (Damir "yes unify"): EVERY switch row is the base flex row — label | switch, centred on the WHOLE title +
 * description block (the N59b stack: a flex column, the disc absolute-centred); the full geometry is
 * pins-s20g/s-switch.mjs. What this module still owns (on the BUILT settings.html, jsdom computed style):
 *   · every Privacy row and the hub rows: a centred flex row, the stack a flex column, the disc absolute — NOT layout B
 *   · the switch keeps its name + description (aria-label = title, aria-describedby → this row's sub)
 *   · the tap layer (S9 #46 r3 n3, re-based): the switch's ::after overhang ≤ the row's gap — the description sits BESIDE
 *     the switch now, so the gap that guards it is the row gap (8), not a row-gap below
 *   · a switch row WITHOUT a description stays one line — label | switch, centred, the same 8 px gap
 * Deliberate breaks: see the S9 B2 f2 report; the S20G re-base: the layout-B block put back → the Privacy clause fails. */
import { b2Kit } from './b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  try {
    const s = await boot('settings.html');
    s.push('setCaps', 'readReceipts,typing,hideOnline,photoPreviews');
    await sleep(150);
    const cs = (e) => s.W.getComputedStyle(e);
    /* resolve px through var()/calc(+) chains on element `el` (custom properties inherit) */
    const px = (el, v, k = 0) => {
      v = String(v || '').trim();
      if (k > 8) return NaN;
      let m = /^var\((--[\w-]+)\)$/.exec(v); if (m) return px(el, cs(el).getPropertyValue(m[1]) || cs(s.d.documentElement).getPropertyValue(m[1]), k + 1);
      m = /^calc\((.*)\)$/.exec(v); if (m) return m[1].split(/\s\+\s/).reduce((a, p) => a + px(el, p, k + 1), 0);
      m = /^(-?[\d.]+)px$/.exec(v); return m ? Number(m[1]) : NaN;
    };
    const check = (r) => {
      const lab = r.querySelector(':scope > .c-settings__row-label--stack'), top = lab && lab.querySelector(':scope > .c-settings__row-top');
      const sub = lab && lab.querySelector(':scope > .c-settings__row-sub'), sw = r.querySelector(':scope > .c-settings__switch'), disc = top && top.querySelector('.c-disc');
      if (!lab || !top || !sub || !sw || !disc) return { ok: false, why: 'dom' };
      const res = {
        flex: cs(r).display === 'flex' && cs(r).alignItems === 'center' && sw.parentElement === r,
        stackCol: cs(lab).display === 'flex' && cs(lab).flexDirection === 'column',
        discAbs: cs(disc).position === 'absolute' && cs(disc).top === '50%',
        a11y: sw.getAttribute('aria-label') === top.textContent && (!sw.hasAttribute('aria-describedby') || s.d.getElementById(sw.getAttribute('aria-describedby')) === sub),
      };
      return { ok: Object.values(res).every(Boolean), res };
    };
    /* the hub's App lock row (a switch with a sub) */
    const hubRows = [...s.d.querySelectorAll('.c-settings__row[data-row="switch"]')].filter((r) => r.querySelector('.c-settings__row-sub'));
    const hub = hubRows.map(check);
    const pr = [...s.d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*Privacy/.test(x.textContent || ''));
    if (pr) pr.click();
    await sleep(250);
    const priv = [...s.d.querySelectorAll('.c-settings-privacy .c-settings__row[data-row="switch"]')].map(check);
    /* ★ #46 r3 n3 → S20G R-1: the switch's tap layer (its ::after overhang, read from the BUILT sheet) must end at the
       row gap — the description is beside the switch now, so the label | switch gap ≥ that overhang */
    /* ★ S20G C-m6 (#46 r1): the guard reads the INLINE (left / right) overhang — the description is BESIDE the switch, so
       the side that can reach it is the inline one (the re-base read the vertical inset: `inset: -8px -20px` passed).
       The `inset` shorthand is expanded by the CSS rule (1–4 values: top right bottom left); a longhand or an
       inset-inline wins over it. The larger of the two inline sides is compared (LTR + RTL). The vertical pair still
       has to make the 44 px target (28 + top + bottom ≥ 44). */
    let overhang = NaN, tall = NaN;
    const neg = (v) => { const m = /^(-?[\d.]+)px$/.exec(String(v || '').trim()); return m ? Math.max(0, -Number(m[1])) : (String(v || '').trim() === '0' ? 0 : NaN); };
    for (const sh of s.d.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } for (const ru of rules || []) {
      if (ru.selectorText !== '.c-settings__switch::after') continue;
      const st = ru.style, g = (k) => (st.getPropertyValue(k) || '').trim();
      const v = g('inset').split(/\s+/).filter(Boolean);
      const [t, r = t, b = t, l = r] = v;
      const ii = g('inset-inline').split(/\s+/).filter(Boolean);
      const L = g('left') || g('inset-inline-start') || ii[0] || l, R = g('right') || g('inset-inline-end') || ii[1] || ii[0] || r;
      const T = g('top') || g('inset-block-start') || t, B = g('bottom') || g('inset-block-end') || b;
      overhang = Math.max(neg(L), neg(R));
      tall = 28 + neg(T) + neg(B);
    } }
    const sr = s.d.querySelector('.c-settings-privacy .c-settings__row[data-row="switch"]');
    const cg = (e) => { const v = cs(e).getPropertyValue('column-gap'); return v && v !== 'normal' ? v : cs(e).getPropertyValue('gap'); };   // jsdom keeps `gap` unexpanded
    const gap = sr ? px(sr, cg(sr)) : NaN;
    ok(Number.isFinite(overhang) && Number.isFinite(gap) && gap >= overhang && tall >= 44,
      '★ S9 #46 r3 n3 → ★ S20G R-1 / C-m6 re-base: the switch\'s 44 px tap layer (' + tall + ' px tall) ends at the row gap, beside the description — the INLINE overhang (gap ' + gap + ' ≥ inline tap overhang ' + overhang + ')');
    /* ★ S20G R-1: the hub rows and every Privacy row are the SAME box (the S20F W-2 hub-only override is gone) */
    ok(hub.length >= 1 && hub.every((x) => x.ok) && priv.length === 5 && priv.every((x) => x.ok),
      '★ S20G R-1 (Privacy ' + priv.length + ' · hub ' + hub.length + '): every switch row with a description is a centred flex row, the title + sub one flex column with the disc absolute-centred, and keeps the switch name/description — '
      + JSON.stringify((priv.find((x) => !x.ok) || hub.find((x) => !x.ok) || priv[0])));
    s.dom.window.close();

    /* —— a switch row WITHOUT a description keeps today's one-line row (Notifications → Allow notifications) —— */
    const s2 = await boot('settings.html');
    s2.push('setCaps', 'globalNotifications');
    await sleep(150);
    const nb = [...s2.d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*Notifications/.test(x.textContent || ''));
    if (nb) nb.click();
    await sleep(250);
    const cs2 = (e) => s2.W.getComputedStyle(e);
    const plain = [...s2.d.querySelectorAll('.c-settings__row[data-row="switch"]')].find((r) => !r.querySelector('.c-settings__row-sub'));
    const pl = plain && plain.querySelector(':scope > .c-settings__row-label'), psw = plain && plain.querySelector(':scope > .c-settings__switch');
    const pres = plain && {
      oneLine: cs2(pl).display === 'flex' && !pl.classList.contains('c-settings__row-label--stack') && cs2(plain).display === 'flex' && psw.parentElement === plain && !('stack' in plain.dataset),   // ★ S20G R-1 re-base: the base flex row (was grid row 1 / column 2)
      gap8: /--spacing-8\)$/.test(cs2(plain).getPropertyValue('gap')),
      centred: cs2(plain).alignItems === 'center',
      named: psw.getAttribute('aria-label') === pl.textContent,
    };
    ok(!!plain && Object.values(pres).every(Boolean),
      '★ S9 toggle B → S20G R-1: a switch row WITHOUT a description stays one line — label | switch, centred, the same 8 px gap — ' + JSON.stringify(pres));
    s2.dom.window.close();
  } catch (e) {
    ok(false, '★ S9 B2 toggle pins threw: ' + (e && e.stack || e));
  }
}
