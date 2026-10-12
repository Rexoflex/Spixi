/* ==== S17 B (#1332 / #1333) — Account › About: the FULL-BLEED Glass header + the "What's new" row ====
 * On the BUILT settings.html (jsdom; C# pushes via executeUiCommand):
 *   · HEADER TOKENS, light + dark: the band pair (--ab-band-from/-to), the deep stop, the three light fields, the sheen
 *     and the scrim resolve in BOTH themes, dark ≠ light; the white bar ink holds ≥ 4.5 : 1 over each band end under
 *     the top scrim (the composite the status bar and "About" sit on)
 *   · THE BAR: it floats over the header (absolute, transparent, on-hero ink) and turns SOLID once the header has
 *     scrolled under it (data-solid), and back at the top
 *   · THE ICON IS UNCHANGED: the app icon holds exactly the registry `logo` (same viewBox + the same paths)
 *   · THE ART: two decorative Glass layers in the band, held after their entrance (watchEntrance)
 *   · THE ROW (component, the bundle's createSettingsAbout): no `whatsNew` → no row; `isNew` → the "New" badge; the sub
 *     line names the version (spixi- stripped); a tap calls onOpen once and drops the badge; `isNew: false` → no badge
 * Deliberate breaks (S17 report): drop --ab-scrim from the dark block → the token clause fails; remove the scroll
 * toggle → the bar clause fails; render the badge without isNew → the row clause fails. */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  let s = null;
  const hex = (v) => { const m = String(v).trim().match(/^#([0-9a-f]{6})$/i); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const rgba = (v) => { const m = String(v).trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i); return m ? { c: [+m[1], +m[2], +m[3]], a: m[4] == null ? 1 : +m[4] } : null; };
  const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  try {
    s = await K.boot('settings.html');
    s.push('setVersion', 'spixi-0.9.22');
    await sleep(150);
    const { d, W } = s;
    const row = [...d.querySelectorAll('button.c-settings__row')].find((x) => /^\s*About/.test(x.textContent || ''));
    if (row) row.click();
    await sleep(400);
    const el = d.querySelector('.c-settings-about');
    const tok = (n) => W.getComputedStyle(d.documentElement).getPropertyValue(n).trim();
    const res = (v) => { let x = String(v).trim(); for (let i = 0; i < 6 && /^var\(/.test(x); i++) x = tok(x.match(/^var\((--[\w-]+)/)[1]); return x; };

    /* —— tokens, both themes —— */
    const NAMES = ['--ab-band-from', '--ab-band-to', '--ab-band-deep', '--ab-field-a', '--ab-field-b', '--ab-field-c', '--ab-sheen-op', '--ab-scrim'];
    const read = () => Object.fromEntries(NAMES.map((n) => [n, res('var(' + n + ')')]));
    d.documentElement.removeAttribute('data-theme');
    const L = read();
    d.documentElement.setAttribute('data-theme', 'dark');
    const D = read();
    d.documentElement.removeAttribute('data-theme');
    const white = [255, 255, 255];
    const inkOK = (T) => {
      const sc = rgba(T['--ab-scrim']);
      if (!sc) return false;
      return ['--ab-band-from', '--ab-band-to'].every((n) => {
        const c = hex(T[n]);
        if (!c) return false;
        const m = c.map((v, i) => v * (1 - sc.a) + sc.c[i] * sc.a);
        return cr(white, m) >= 4.5;
      });
    };
    const tokens = NAMES.every((n) => L[n] && D[n]) && NAMES.every((n) => L[n] !== D[n]) && inkOK(L) && inkOK(D);
    ok(tokens, '★ S17 B (#1332): the full-bleed header tokens resolve in BOTH themes (band pair, deep stop, three light fields, sheen, scrim; dark ≠ light) and the white bar ink holds ≥ 4.5 : 1 over each band end under the top scrim — ' + JSON.stringify({ L, D }));

    /* —— the bar —— */
    const bar = el && el.querySelector(':scope > .c-topbar');
    const body = el && el.querySelector(':scope > .c-settings__body');
    const cs = (x) => W.getComputedStyle(x);
    const floats = !!bar && el.classList.contains('c-settings-about--hdr') && cs(bar).position === 'absolute' && !bar.hasAttribute('data-solid')
      && /transparent/.test(cs(bar).getPropertyValue('--surface-topbar'))
      && (/--text-on-hero/.test(cs(bar).getPropertyValue('--text-topbar')) || res(cs(bar).getPropertyValue('--text-topbar')) === res('var(--text-on-hero)'));
    let solid = false, back = false;
    if (body) {
      body.scrollTop = 400; body.dispatchEvent(new W.Event('scroll'));
      solid = !!bar && bar.hasAttribute('data-solid');
      body.scrollTop = 0; body.dispatchEvent(new W.Event('scroll'));
      back = !!bar && !bar.hasAttribute('data-solid');
    }
    ok(floats && solid && back && body.firstElementChild && body.firstElementChild.classList.contains('c-settings-about__hero'),
      '★ S17 B (#1332): the top bar FLOATS over the full-bleed header (absolute, transparent surface, on-hero ink) and turns SOLID once the header has scrolled under it, then back at the top — ' + JSON.stringify({ floats, solid, back }));

    /* —— the icon —— */
    const ai = el && el.querySelector('.c-settings-about__appicon');
    const reg = W.SpixiIcons && W.SpixiIcons.icon && W.SpixiIcons.icon('logo', { size: 44 });
    const paths = (x) => (x ? [...x.querySelectorAll('path')].map((p) => p.getAttribute('d')).join('|') : '');
    ok(!!ai && ai.querySelectorAll('svg').length === 1 && !!reg && ai.querySelector('svg').getAttribute('viewBox') === reg.getAttribute('viewBox')
      && paths(ai.querySelector('svg')) === paths(reg) && paths(reg).length > 100,
      '★ S17 B (#1332): the app icon is UNCHANGED — exactly the registry `logo` (same viewBox, same paths) on the launcher ground ("don\'t mutilate the logo")');

    /* —— the art —— */
    const band = el && el.querySelector('.c-settings-about__band');
    const layers = band ? [...band.querySelectorAll(':scope > svg.il.ab-l')] : [];
    for (const l of layers) for (const p of l.querySelectorAll('[class]')) { p.dispatchEvent(new W.Event('animationstart', { bubbles: true })); p.dispatchEvent(new W.Event('animationend', { bubbles: true })); }
    await sleep(20);
    ok(layers.length === 2 && layers.every((l) => l.getAttribute('aria-hidden') === 'true') && layers.some((l) => l.hasAttribute('data-held'))
      && !band.querySelector('text') && !/padlock|lock/i.test([...band.querySelectorAll('[class]')].map((x) => x.getAttribute('class')).join(' ')),
      '★ S17 B (#1332): the band carries the Glass art in two decorative layers (no text, no padlock), held after the entrance');

    /* —— the What's new row (component) —— */
    const S = W.Spixi;
    const opened = [];
    const mk = (wn) => S.createSettingsAbout({ version: 'spixi-0.9.22', onBack() {}, whatsNew: wn });
    const none = mk(undefined);
    const yes = mk({ version: 'spixi-0.9.22', isNew: true, onOpen: () => opened.push(1) });
    const no = mk({ version: 'spixi-0.9.22', isNew: false, onOpen: () => opened.push(2) });
    const r1 = yes.querySelector('.c-settings-about__wn-row');
    const r = {
      noRow: !none.querySelector('.c-settings-about__wn-row'),
      title: !!r1 && /What.s new/.test(r1.textContent),
      sub: !!r1 && /Spixi 0\.9\.22 · 6 new things/.test(r1.textContent) && !/spixi-/.test(r1.textContent),
      badge: !!r1 && !!r1.querySelector('.c-settings-about__new') && r1.querySelector('.c-settings-about__new').textContent === 'New',
      noBadge: !!no.querySelector('.c-settings-about__wn-row') && !no.querySelector('.c-settings-about__new'),
      beforeWhy: !!r1 && (() => { const g = r1.closest('.c-settings-about__wn'); const why = yes.querySelector('.c-settings-about__why'); return !!g && !!why && !!(g.compareDocumentPosition(why) & 4); })(),
    };
    if (r1) r1.click();
    r.opened = JSON.stringify(opened) === '[1]' && !r1.querySelector('.c-settings-about__new');
    ok(Object.values(r).every(Boolean),
      '★ S17 B (#1333): the "What\'s new" row — absent without `whatsNew`; "What\'s new" + "Spixi 0.9.22 · 6 new things" (spixi- stripped), above "Why Spixi"; the "New" badge only while isNew; a tap opens it once and drops the badge — ' + JSON.stringify(r));
  } catch (e) {
    ok(false, '★ S17 B threw: ' + e.message);
  } finally { if (s) { try { s.close(); } catch (_) {} s = null; } }
}
