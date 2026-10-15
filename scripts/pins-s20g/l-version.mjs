/* ==== S20G F-3 — "Open source" lives IN the version line: "Spixi 0.9.22 · Open source" ====
 * On the BUILT intro.html (jsdom, phone UA), through C#'s own push (executeUiCommand setVersion):
 *   (1) the format: "spixi-0.9.22" → "Spixi 0.9.22 · Open source"; "SPIXI-1.0.0-beta" → "Spixi 1.0.0-beta · …" (the prefix
 *       is case-insensitive); "0.9.22 (build 7)" → shown as it is + " · Open source"; "" → "Open source" alone; a pushed
 *       "<b>x</b>" lands as TEXT (no element child). The line is never hidden / aria-hidden.
 *   (2) the separate caption is gone: no .c-launch__oss element in the DOM and no .c-launch__oss rule in the built sheets.
 *   (3) the locale's word: under ?lang=de-de and ?lang=ru-ru the line ends with that dictionary's welcomeOpenSource.
 * Deliberate breaks (S20G report): ① the prefix test without /i → (1) caseInsensitive fails; ② the oss <p> put back after
 *   the dots → (2) fails; ③ setLaunchVersion back to the bare version → (1) + (3) fail; ④ innerHTML for the line → (1) asText fails;
 *   ⑤ (S20G r1) `String(v).trim()` put back in setLaunchVersion → the no-trim clause fails; ⑥ the blank regex test removed → (1) blankIsEmpty fails. */
import { on1Kit } from '../pins-on1/kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const { boot } = on1Kit(h);
  let s = null, g = null;
  try {
    s = await boot({ ua: 'phone' });
    const { d, W } = s;
    const ver = () => d.querySelector('.c-launch__version');
    const r1 = {};
    r1.empty = ver().textContent === 'Open source';
    s.push('setVersion', 'spixi-0.9.22'); r1.spixi = ver().textContent === 'Spixi 0.9.22 · Open source';
    s.push('setVersion', 'SPIXI-1.0.0-beta'); r1.caseInsensitive = ver().textContent === 'Spixi 1.0.0-beta · Open source';
    s.push('setVersion', '0.9.22 (build 7)'); r1.asIs = ver().textContent === '0.9.22 (build 7) · Open source';
    s.push('setVersion', '<b>x</b>'); r1.asText = ver().children.length === 0 && ver().textContent === '<b>x</b> · Open source';
    s.push('setVersion', ''); r1.emptyAgain = ver().textContent === 'Open source';
    s.push('setVersion', ' \t '); r1.blankIsEmpty = ver().textContent === 'Open source';   // ★ S20G r1: all-whitespace = no version (a regex, not a trim)
    r1.shown = !ver().hidden && !ver().hasAttribute('aria-hidden');
    ok(Object.values(r1).every(Boolean),
      '★ S20G F-3: setVersion("spixi-0.9.22") paints "Spixi 0.9.22 · Open source" (a leading spixi- of any case → "Spixi ", anything else as it is, no version → "Open source" alone, text only) — ' + JSON.stringify({ r1, now: ver().textContent }));
    let cssHit = false;
    for (const sh of d.styleSheets) { try { for (const r of sh.cssRules) if (/c-launch__oss/.test(r.cssText)) cssHit = true; } catch (e) {} }
    const built = readFileSync(join(root, 'Spixi/Resources/Raw/html/intro.html'), 'utf8');
    ok(!d.querySelector('.c-launch__oss') && !cssHit && !/c-launch__oss/.test(built),
      '★ S20G F-3: the separate "Open source" caption is gone (no element, no rule in the built intro.html) — ' + JSON.stringify({ el: !!d.querySelector('.c-launch__oss'), cssHit }));
    const per = {};
    for (const code of ['de-de', 'ru-ru']) {
      g = await boot({ ua: 'phone', query: 'lang=' + code });
      g.push('setVersion', 'spixi-0.9.22');
      const dict = JSON.parse(readFileSync(join(root, 'src/strings', code + '.json'), 'utf8'));
      const t = g.d.querySelector('.c-launch__version').textContent;
      per[code] = t === 'Spixi 0.9.22 · ' + dict.welcomeOpenSource ? true : t;
      g.close(); g = null;
    }
    ok(Object.values(per).every((x) => x === true), '★ S20G F-3: the line speaks the locale ("· Open Source" de, "· Открытый исходный код" ru) — ' + JSON.stringify(per));
    /* ★ S20G r1 (the smoke trim gate: the ONLY trims in the launch shell are the nickname + the rings text node): the
       version path calls no trim of any form — the built bundle's (spixi.bundle.js) setLaunchVersion body is read */
    const bundle = readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.bundle.js'), 'utf8');   // the shipped bundle intro.html loads
    const body = (() => { const i = bundle.indexOf('function setLaunchVersion('); if (i < 0) return ''; return bundle.slice(i, bundle.indexOf('\n}', i)); })();
    ok(body.length > 40 && !/\.trim(?:Start|End|Left|Right)?\s*\(/.test(body) && /\/\^spixi-\/i/.test(body),
      '★ S20G r1: setLaunchVersion trims nothing (only the spixi- prefix is stripped; blank = empty by a regex) — ' + JSON.stringify(body.slice(0, 400)));
    ok(s.errs.length === 0, '★ S20G F-3: no page error — ' + JSON.stringify(s.errs.slice(0, 3)));
    void W;
  } catch (e) {
    ok(false, '★ S20G F-3 l-version threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); if (g) g.close(); }
}
