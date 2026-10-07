/* ==== SESSION 9 (B2 f2) — TOGGLE LAYOUT B (Damir) on every switch row with a stacked label ====
 * On the BUILT settings.html (jsdom computed style — the cascade; the pixel geometry is the Chromium render in the
 * S9 B2 f2 report, toggle-*.png):
 *   · the row is a two-column grid; the stack is `display: contents`, so the TITLE LINE (.c-settings__row-top) and
 *     the switch share grid row 1 (the switch centres on the title line, not on the card) and the description is
 *     row 2 spanning BOTH columns (it runs under the switch column)
 *   · the disc is back in the title line's flow (static, untransformed — not the N59b absolute-centred disc)
 *   · the description's start indent = the disc's width + the title line's gap (it starts under the title), in the
 *     Account context (30 + 16) — resolved from the cascade
 *   · the switch keeps its name + description (aria-label = title, aria-describedby → this row's sub)
 *   · every Privacy row and the hub's App lock row get it
 * Deliberate breaks: see the S9 B2 f2 report. */
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
      const indent = px(sub, cs(sub).getPropertyValue('padding-inline-start'));
      const want = px(disc, cs(disc).width) + px(top, cs(top).getPropertyValue('gap'));
      const res = {
        grid: cs(r).display === 'grid' && /auto$/.test(cs(r).gridTemplateColumns) && cs(r).alignItems === 'center',
        contents: cs(lab).display === 'contents',
        line1: cs(top).gridRow === '1' && cs(sw).gridRow === '1' && cs(sw).gridColumn === '2' && cs(top).gridColumn === '1',
        subRow2Full: cs(sub).gridRow === '2' && cs(sub).gridColumn.replace(/\s/g, '') === '1/-1',
        discFlow: cs(disc).position === 'static' && cs(disc).transform === 'none',
        indent: Number.isFinite(indent) && indent > 0 && indent === want,
        a11y: sw.getAttribute('aria-label') === top.textContent && (!sw.hasAttribute('aria-describedby') || s.d.getElementById(sw.getAttribute('aria-describedby')) === sub),
      };
      return { ok: Object.values(res).every(Boolean), res, indent, want };
    };
    /* the hub's App lock row (a switch with a sub) */
    const hubRows = [...s.d.querySelectorAll('.c-settings__row[data-row="switch"]')].filter((r) => r.querySelector('.c-settings__row-sub'));
    const hub = hubRows.map(check);
    const pr = [...s.d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*Privacy/.test(x.textContent || ''));
    if (pr) pr.click();
    await sleep(250);
    const priv = [...s.d.querySelectorAll('.c-settings-privacy .c-settings__row[data-row="switch"]')].map(check);
    /* ★ #46 r3 n3: the switch's tap layer (its ::after overhang below the 28 px box, read from the BUILT sheet)
       must end above the description — row-gap ≥ that overhang (the switch is centred on a line ≥ its box) */
    let overhang = NaN;
    for (const sh of s.d.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } for (const ru of rules || []) {
      if (ru.selectorText === '.c-settings__switch::after') { const v = (ru.style.getPropertyValue('bottom') || ru.style.getPropertyValue('inset') || '').trim().split(/\s+/); const b = v.length >= 3 ? v[2] : v[0]; const m = /^-([\d.]+)px$/.exec(b || ''); if (m) overhang = Number(m[1]); } } }
    const sr = s.d.querySelector('.c-settings-privacy .c-settings__row[data-row="switch"]');
    const gap = sr ? px(sr, cs(sr).rowGap || cs(sr).getPropertyValue('row-gap')) : NaN;
    ok(Number.isFinite(overhang) && overhang > 0 && gap >= overhang,
      '★ S9 #46 r3 n3: the switch\'s 44 px tap layer ends above the description (row-gap ' + gap + ' ≥ tap overhang ' + overhang + ')');
    ok(hub.length >= 1 && hub.every((x) => x.ok) && priv.length === 5 && priv.every((x) => x.ok),
      '★ S9 toggle B: every stacked switch row (hub ' + hub.length + ' · Privacy ' + priv.length + ') puts title + switch on grid row 1, the description on row 2 across both columns, the disc in the title flow, the indent = disc + title gap, and keeps the switch name/description — '
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
      oneLine: cs2(pl).display === 'flex' && !pl.classList.contains('c-settings__row-label--stack') && cs2(pl).gridRow === '1' && cs2(psw).gridRow === '1' && cs2(psw).gridColumn === '2',
      gap8: /--spacing-8\)$/.test(cs2(plain).columnGap || cs2(plain).getPropertyValue('column-gap')),
      centred: cs2(plain).alignItems === 'center',
      named: psw.getAttribute('aria-label') === pl.textContent,
    };
    ok(!!plain && Object.values(pres).every(Boolean),
      '★ S9 toggle B: a switch row WITHOUT a description stays one line — label | switch, centred, the same 8 px gap — ' + JSON.stringify(pres));
    s2.dom.window.close();
  } catch (e) {
    ok(false, '★ S9 B2 toggle pins threw: ' + (e && e.stack || e));
  }
}
