/* ==== S20G R-1 — ONE switch-row geometry (Damir "yes unify"; supersedes S9 toggle layout B + the S20F W-2 hub override) ====
 * On the BUILT shells (jsdom computed style — the cascade; the pixel check is the Chromium measure in the S20G B3 report:
 * switch centre − title+description block centre = −1 … 0 px phone, −0.5 … 0 desktop, every row):
 *   (1) EVERY settings switch row WITH a description (hub App lock / Confirm payments, all 5 Privacy rows, Notifications ›
 *       Show sender name) is the SAME box: a flex row (not a grid), align-items centre, the switch `flex: none` beside the
 *       label; the label a flex COLUMN (title + sub one block — never `display: contents`), its disc absolute + top 50 % +
 *       translateY(−50 %) (N59b), the sub not indented and not on a grid row of its own; the row stamped `data-stack` and
 *       its min-height the hub's 66 (--row-h-stacked + 6) — Privacy and the hub carry the identical signature.
 *   (2) a switch row WITHOUT a description is unchanged: no data-stack, a plain flex label, the account 64 (56 + 8), centred.
 *   (3) the switch's 44 px tap layer (::after −8 px) ends at the row gap — the description sits beside it, never under it.
 *   (4) the new group's Blind row (index.html, createGroupSetup): a flex row, align-items centre (the switch centred on the
 *       title + description block).
 * DELIBERATE BREAKS (S20G B3 report): ① the S9 layout-B block put back (`> .c-settings__row-label--stack { display: contents }`
 * + the grid) → (1) fails (stack contents, row grid); ② settings-screens.js switchRow's `row.dataset.stack` stamp removed →
 * (1) fails (Privacy 64 vs the hub 66); ③ contacts-shell.css `.c-contacts-group__blind { align-items: flex-start }` → (4). */
import { b2Kit } from '../pins-s9/b2-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot } = b2Kit(h);
  const r = {}, n = {};
  let s = null, s2 = null;
  try {
    s = await boot('settings.html');
    s.push('setCaps', 'paymentAuth,encpass,readReceipts,typing,hideOnline,photoPreviews,globalNotifications');
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
    const sig = (row) => {
      const st = row.querySelector(':scope > .c-settings__row-label--stack'), dc = st && st.querySelector('.c-disc'), sub = st && st.querySelector('.c-settings__row-sub');
      const sw = row.querySelector(':scope > .c-settings__switch');
      return [cs(row).display, cs(row).alignItems, 'stack' in row.dataset ? 'stack' : '-', px(row, cs(row).minHeight),
        sw && cs(sw).flexShrink, st && cs(st).display, st && cs(st).flexDirection, dc && cs(dc).position, dc && cs(dc).top, dc && cs(dc).transform,
        sub && (px(sub, cs(sub).getPropertyValue('padding-inline-start')) || 0), sub && (cs(sub).gridRow || 'auto')].join(' ');
    };
    const plainSig = (row) => { const lab = row.querySelector(':scope > .c-settings__row-label'); return [cs(row).display, cs(row).alignItems, 'stack' in row.dataset ? 'stack' : '-', px(row, cs(row).minHeight), lab && cs(lab).display, lab && lab.classList.contains('c-settings__row-label--stack')].join(' '); };
    const rows = (scope) => [...scope.querySelectorAll('.c-settings__row[data-row="switch"]')];
    const withSub = (list) => list.filter((x) => x.querySelector('.c-settings__row-sub'));
    const go = async (re) => { const b = [...d.querySelectorAll('button.c-settings__row')].find((x) => re.test(x.textContent || '')); if (b) b.click(); await sleep(300); };
    const back = async () => { const b = d.querySelector('.c-settings__body') && [...d.querySelectorAll('.c-topbar button')].find((x) => !x.closest('[hidden]')); if (b) b.click(); await sleep(350); };
    const hub = withSub(rows(d.querySelector('.c-settings--hub')));
    n.hub = hub.map(sig);
    await go(/^\s*Privacy/);
    const priv = rows(d.querySelector('.c-settings-privacy'));
    n.priv = withSub(priv).map(sig);
    await back();
    await go(/^\s*Notifications/);
    const nscr = d.querySelector('.c-settings-notif, .c-settings-notifications') || d;
    const nrows = rows(nscr).filter((x) => !x.closest('.c-settings--hub'));
    n.notifSub = withSub(nrows).map(sig);
    n.notifPlain = nrows.filter((x) => !x.querySelector('.c-settings__row-sub')).map(plainSig);
    const WANT = /^flex center stack 66 0 flex column absolute 50% translateY\(-50%\) 0 auto$/;
    const all = n.hub.concat(n.priv, n.notifSub);
    r.one = n.hub.length === 2 && n.priv.length === 5 && all.every((x) => WANT.test(x)) && new Set(all).size === 1;
    r.plain = n.notifPlain.length >= 2 && n.notifPlain.every((x) => x === 'flex center - 64 flex false');
    /* (3) the tap layer: its overhang (read from the BUILT sheet) ≤ the row's gap between the label and the switch */
    let overhang = NaN;
    for (const sh of d.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } for (const ru of rules || []) {
      if (ru.selectorText === '.c-settings__switch::after') { const v = (ru.style.getPropertyValue('inset') || '').trim().split(/\s+/); const m = /^-([\d.]+)px$/.exec(v[0] || ''); if (m) overhang = Number(m[1]); } } }
    const pr0 = withSub(priv)[0];
    const cg = (e) => { const v = cs(e).getPropertyValue('column-gap'); return v && v !== 'normal' ? v : cs(e).getPropertyValue('gap'); };   // jsdom keeps the `gap` shorthand unexpanded
    n.gap = pr0 ? px(pr0, cg(pr0)) : NaN;
    n.overhang = overhang;
    r.tap = Number.isFinite(overhang) && overhang > 0 && n.gap >= overhang;
    r.noErr = s.errs.length === 0;
    /* (4) the Blind row */
    s2 = await boot('index.html', { wait: 1200 });
    const el = s2.W.Spixi.createGroupSetup({ members: [], strings: {} });
    s2.d.body.append(el);
    await sleep(50);
    const br = el.querySelector('.c-contacts-group__blind'), bsw = br && br.querySelector('[role="switch"]');
    const cs2 = (e) => s2.W.getComputedStyle(e);
    n.blind = br && [cs2(br).display, cs2(br).alignItems, cs2(bsw).flexShrink, bsw.parentElement === br].join(' ');
    r.blind = n.blind === 'flex center 0 true';
  } catch (e) { r.threw = e.message; } finally { for (const x of [s, s2]) if (x) { try { x.dom.window.close(); } catch (e) {} } }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true } : { [k]: r[k], threw: r.threw, n }).slice(0, 1800));
  c('one', '★ S20G R-1 (1): every settings switch row WITH a description (hub 2 · Privacy 5 · Notifications › Show sender name on a phone) is ONE box — a centred flex row, the title + sub one flex column with the disc absolute-centred, data-stack, 66 px');
  c('plain', '★ S20G R-1 (2): a switch row WITHOUT a description is unchanged — no data-stack, a plain flex label, 64 px, centred');
  c('tap', '★ S20G R-1 (3): the switch\'s 44 px tap layer ends at the row gap (gap ≥ the ::after overhang) — the description sits beside it, not under it');
  c('blind', '★ S20G R-1 (4): the new group\'s Blind row is the same geometry — a flex row, the switch centred on the title + description block');
  c('noErr', '★ S20G R-1: no page error');
}
