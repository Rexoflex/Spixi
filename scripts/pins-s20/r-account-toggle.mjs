/* ==== S20 I → ★ S20F W-2 RE-BASE (#1408 + #1409 = B, supersedes #1401) — the Account HUB switch row = a chevron row ====
 * On the BUILT settings.html (jsdom computed style — the cascade; no layout, so the geometry is compared as the RULES
 * that make it): every hub switch row with a sub (App lock, Confirm payments) carries the SAME box as a stacked chevron
 * row of the hub ("Chat appearance"): min-height (66 = --row-h-stacked + 6), padding-top / -bottom (the account 6 px),
 * the stack a flex COLUMN (title + sub one block — not display: contents), its disc absolute + top 50 % + translateY(−50 %)
 * (N59b), the sub's 2 px top margin and no indent; the row is ONE grid row (row-gap 0) with the switch centred in it.
 * The first-row inset therefore matches Theme / Chat appearance (the same 6 px top in the same card padding).
 * Privacy (the settings <body> is .c-account too) keeps the S9 layout B and its 6 px top — the rule is the hub root's.
 * Was (S20 I, #1401): layout B kept + padding-top 13 — that is exactly what the `chevron` clause now rejects.
 * ★ S20G R-1 RE-BASE (Damir "yes unify"): the hub geometry is now EVERY switch row's (pins-s20g/s-switch.mjs) — the row is
 * the base flex row (not a one-row grid), and Privacy carries the hub's signature (no more layout B).
 * Deliberate breaks (S20F home report): ① settings-shell.css: `padding-top: 13px` back on the hub switch row → chevron
 * fails (padTop 13 vs 6) + inset fails; ② the hub stack `display: flex` rule deleted → chevron fails (stack contents vs
 * flex); ③ the sub's `margin-top: 2px` dropped → chevron fails (0 vs 2px — the 1 px the centred block was off). */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  const r = {}, n = {};
  let s = null;
  try {
    s = await boot('settings.html');
    s.push('setCaps', 'paymentAuth,encpass,readReceipts,typing,hideOnline,photoPreviews');
    s.push('setLockEnabled', 'True');
    await sleep(200);
    const { W, d } = s;
    const cs = (e) => W.getComputedStyle(e);
    const px = (el, v, k = 0) => {
      v = String(v || '').trim();
      if (k > 8) return NaN;
      let m = /^var\((--[\w-]+)\)$/.exec(v); if (m) return px(el, cs(el).getPropertyValue(m[1]) || cs(d.documentElement).getPropertyValue(m[1]), k + 1);
      m = /^calc\((.*)\)$/.exec(v); if (m) return m[1].split(/\s\+\s/).reduce((a, p) => a + px(el, p, k + 1), 0);
      m = /^(-?[\d.]+)px$/.exec(v); return m ? Number(m[1]) : NaN;
    };
    const padTop = (el) => { const pb = cs(el).getPropertyValue('padding-block').trim(); const v = cs(el).paddingTop; return px(el, v) || px(el, pb.split(/\s+/)[0]) || 0; };
    const hub = d.querySelector('.c-settings--hub');
    const sw = [...hub.querySelectorAll('.c-settings__row[data-row="switch"]')].filter((x) => x.querySelector('.c-settings__row-sub'));
    const rowBy = (re) => [...hub.querySelectorAll('.c-settings__row')].find((x) => re.test(x.textContent || ''));
    const chev = rowBy(/^\s*Chat appearance/), theme = rowBy(/^\s*Theme/);
    const sig = (row) => {
      const st = row.querySelector('.c-settings__row-label--stack'), dc = st && st.querySelector('.c-disc'), sub = st && st.querySelector('.c-settings__row-sub');
      return [px(row, cs(row).minHeight), padTop(row), px(row, cs(row).paddingBottom) || px(row, cs(row).getPropertyValue('padding-block').trim().split(/\s+/).pop()),
        st && cs(st).display, st && cs(st).flexDirection, st && px(st, cs(st).paddingInlineStart || cs(st).getPropertyValue('padding-inline-start')),
        dc && cs(dc).position, dc && cs(dc).top, dc && cs(dc).transform, sub && cs(sub).marginTop, sub && (px(sub, cs(sub).paddingInlineStart || cs(sub).getPropertyValue('padding-inline-start')) || 0)].join(' ');
    };
    n.chevron = chev && sig(chev);
    n.switches = sw.map(sig);
    n.grid = sw.map((row) => [cs(row).display, cs(row).alignItems, row.querySelector('.c-settings__switch').parentElement === row].join(' '));   // ★ S20G R-1 re-base: the base flex row (was a one-row grid)
    n.themeTop = theme && padTop(theme);
    r.chevron = sw.length === 2 && !!chev && sw.every((row) => sig(row) === n.chevron) && /^66 6 /.test(n.chevron) && / flex column /.test(n.chevron) && / absolute 50% translateY\(-50%\) 2px /.test(n.chevron);
    r.inset = sw.length === 2 && n.grid.every((g) => g === 'flex center true') && n.themeTop === 6 && sw.every((row) => padTop(row) === n.themeTop)
      && sw[0].closest('.c-settings__group').querySelector('.c-settings__row') === sw[0] && padTop(sw[0].closest('.c-settings__group')) === padTop(theme.closest('.c-settings__group'));
    /* Privacy: today's 6 px top + layout B */
    const pr = [...d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*Privacy/.test(x.textContent || ''));
    if (pr) pr.click();
    await sleep(300);
    const priv = [...d.querySelectorAll('.c-settings-privacy .c-settings__row[data-row="switch"]')].filter((x) => x.querySelector('.c-settings__row-sub'));
    n.privacy = priv.map(sig);   // ★ S20G R-1 re-base: Privacy = the hub's chevron signature (was layout B: 'grid contents 6')
    r.privacy = priv.length >= 3 && n.privacy.every((v) => v === n.chevron) && d.body.classList.contains('c-account');
    r.noErr = s.errs.length === 0;
  } catch (e) { r.threw = e.message; } finally { if (s) { try { s.dom.window.close(); } catch (e) {} } }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true, n: k === 'privacy' ? n.privacy : n.chevron } : { [k]: r[k], threw: r.threw, n }).slice(0, 1600));
  c('chevron', '★ S20F W-2 (#1408/#1409 B): the hub switch rows (App lock, Confirm payments) carry the stacked CHEVRON row\'s box — 66 px, the 6 px account top, title + sub one flex column, the disc absolute-centred, the sub\'s 2 px — identical to "Chat appearance"');
  c('inset', '★ S20F W-2 (→ S20G R-1: the base flex row): the switch centred; App lock opens its card with the same 6 px top as Theme in the same card padding (the #1401 13 px is gone)');
  c('privacy', '★ S20G R-1 re-base: Privacy carries the hub\'s signature — 66 px, the 6 px top, title + sub one flex column, the disc absolute-centred, the sub\'s 2 px (layout B is gone)');
  c('noErr', '★ S20 I: no page error');
}
