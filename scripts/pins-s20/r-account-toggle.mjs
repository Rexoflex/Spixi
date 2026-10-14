/* ==== S20 I (#1401, Damir 17:59 — supersedes #1378 I: "the only issue was the top padding of the group that didn't match") ====
 * The Account HUB's toggle rows KEEP the S9 layout B (title + switch on row 1, the sub on row 2); only the TOP inset of a toggle
 * row matches the other rows, so App lock as the FIRST row of "Security & privacy" sits as far from the card's top edge as Theme
 * does in "Preferences" (Chromium, 390: Theme icon 17 px from the card edge; App lock was 10, now 17; sub → next title 19 px,
 * the stacked chevron rows' 10 + 10 rhythm).
 * On the BUILT settings.html (jsdom computed style — the cascade; jsdom has no layout, so the insets are derived from it):
 *   · layoutB: every hub switch row with a sub is still the layout B grid (the stack display: contents);
 *   · inset: a nav row centres its 30 px disc in its min-height (no padding beyond it), so Theme's disc sits (min-height − disc)
 *     / 2 into the row; a layout-B row's disc sits at its padding-top (the disc is in the 30 px title line). The two first-row
 *     insets — the card's padding-top + that offset — are EQUAL (0 px; #46 S20 r1 — jsdom values are exact) for Preferences (Theme) and Security & privacy (App lock);
 *   · Privacy (the settings <body> is .c-account too) keeps today's 6 px top and layout B — the rule is scoped to the hub root.
 * Deliberate break (S20 R report): the hub padding-top rule deleted → inset fails (App lock row offset 6 vs Theme 13; Chromium: 10 vs 17 px from the card edge). */
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
    r.layoutB = sw.length === 2 && sw.every((row) => cs(row).display === 'grid' && cs(row.querySelector('.c-settings__row-label--stack')).display === 'contents');
    const cardOf = (row) => row.closest('.c-settings__group');
    const theme = [...hub.querySelectorAll('.c-settings__row')].find((x) => /^\s*Theme/.test(x.textContent || ''));
    const lock = sw[0];
    const disc = (row) => row.querySelector('.c-disc');
    const navOffset = (row) => { const mh = px(row, cs(row).minHeight), dh = px(disc(row), cs(disc(row)).height); return Math.max(padTop(row), (mh - dh) / 2); };
    n.theme = theme && { card: padTop(cardOf(theme)), rowMinH: px(theme, cs(theme).minHeight), disc: px(disc(theme), cs(disc(theme)).height), offset: navOffset(theme), first: cardOf(theme).querySelector('.c-settings__row') === theme };
    n.lock = lock && { card: padTop(cardOf(lock)), padTop: padTop(lock), first: cardOf(lock).querySelector('.c-settings__row') === lock };
    const insetTheme = n.theme && n.theme.card + n.theme.offset, insetLock = n.lock && n.lock.card + n.lock.padTop;
    n.insets = { theme: insetTheme, lock: insetLock };
    r.inset = !!n.theme && !!n.lock && n.theme.first && n.lock.first && n.theme.disc === 30 && Number.isFinite(insetTheme) && insetTheme === insetLock
      && sw.every((row) => padTop(row) === n.lock.padTop);
    /* Privacy: today's 6 px top + layout B */
    const pr = [...d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*Privacy/.test(x.textContent || ''));
    if (pr) pr.click();
    await sleep(300);
    const priv = [...d.querySelectorAll('.c-settings-privacy .c-settings__row[data-row="switch"]')].filter((x) => x.querySelector('.c-settings__row-sub'));
    n.privacy = priv.map((x) => [cs(x).display, cs(x.querySelector('.c-settings__row-label--stack')).display, padTop(x)].join(' '));
    r.privacy = priv.length >= 3 && n.privacy.every((v) => v === 'grid contents 6') && d.body.classList.contains('c-account');
    r.noErr = s.errs.length === 0;
  } catch (e) { r.threw = e.message; } finally { if (s) { try { s.dom.window.close(); } catch (e) {} } }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true, n: k === 'privacy' ? n.privacy : n.insets } : { [k]: r[k], threw: r.threw, n }).slice(0, 1200));
  c('layoutB', '★ S20 I (#1401): the Account hub toggle rows (App lock, Confirm payments) KEEP the S9 layout B — the grid, the stack display: contents');
  c('inset', '★ S20 I (#1401): App lock as the first row of its card sits EXACTLY as far from the card top as Theme (card padding + the row\'s disc offset, 0 px; Theme centres its 30 px disc in its min-height, a layout-B row puts it at its padding-top); both toggle rows share that top');
  c('privacy', '★ S20 I: Privacy keeps layout B and today\'s 6 px top (the rule is scoped to the hub root, not the .c-account <body>)');
  c('noErr', '★ S20 I: no page error');
}
