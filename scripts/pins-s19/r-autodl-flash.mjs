/* ==== S19 F9 (#1371, Damir S18 walk: Settings opened on Privacy for the auto-download moment — "which row?") ====
 * On the BUILT settings.html (jsdom; aKit timeScale 4 — the 2.4 s cleanup runs in 600 ms), through the real push
 * openScreen('privacy') with the exe's photoAutoDl cap:
 *   · the auto-download ROW (the button inside [data-pref="photoAutoDl"]) carries data-flash shortly after the push, and only
 *     that row does; the flag is removed again afterwards (the animationend / 2.4 s cleanup);
 *   · the shipped CSS animates exactly that: .c-settings__row[data-flash] runs @keyframes c-settings-rowflash (2s, once), whose
 *     0 % paints --surface-action-tonal-default and whose 100 % is transparent (the wallet just-sent wash); under
 *     prefers-reduced-motion the animation is none;
 *   · a second openScreen mid-flash restarts it (still flagged); a wrong id flags nothing.
 * Deliberate breaks (S19 F9 report): the data-flash lines removed from openScreen (flags fails) · the reduced-motion escape
 * removed (css fails) · the cleanup timer removed (cleanup fails — jsdom fires no animationend) · the cleanup timer cut to
 * 1000 ms, shorter than the 2 s flash (restartKept fails). */
import { aKit } from '../pins-s11/a-kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const K = aKit(h);
  const r = {}, n = {};
  let s = null;
  try {
    s = await K.boot('settings.html', { wait: 1400, timeScale: 4 });
    const { d } = s;
    s.push('setCaps', 'photoAutoDl,moments');
    await sleep(100);
    s.push('openScreen', 'nope');
    await sleep(250);
    n.wrongId = d.querySelectorAll('[data-flash]').length;
    s.push('openScreen', 'privacy');
    await sleep(260);
    const sec = d.querySelector('[data-pref="photoAutoDl"]');
    const btn = sec && sec.querySelector('.c-settings__row');
    const flagged = [...d.querySelectorAll('[data-flash]')];
    n.flagged = flagged.map((x) => x.className);
    r.flags = n.wrongId === 0 && !!btn && flagged.length === 1 && flagged[0] === btn;
    s.push('openScreen', 'privacy');
    await sleep(200);
    /* re-read: a second showPrivacy may rebuild the screen — the LIVE row is the one that must flash */
    const live = () => d.querySelector('[data-pref="photoAutoDl"] .c-settings__row');
    n.rebuilt = live() !== btn;
    r.restart = !!live() && live().hasAttribute('data-flash') && d.querySelectorAll('[data-flash]').length === 1;
    await sleep(340);   // past the FIRST flash's cleanup — the restarted flash must not be cut short by it
    r.restartKept = !!live() && live().hasAttribute('data-flash');
    await sleep(400);
    r.cleanup = !!live() && !live().hasAttribute('data-flash') && d.querySelectorAll('[data-flash]').length === 0;
    /* the shipped CSS */
    const rules = [];
    const walk = (list, media) => { for (const x of list) { if (x.cssRules && !x.selectorText && x.type !== 7) walk(x.cssRules, media.concat(String((x.media && x.media.mediaText) || ''))); else rules.push({ x, media }); } };
    for (const sh of d.styleSheets) { try { walk(sh.cssRules, []); } catch (e) { /* */ } }
    const anim = rules.filter(({ x, media }) => x.selectorText && /\.c-settings__row\[data-flash\]/.test(x.selectorText));
    const main = anim.find(({ media }) => !media.some((m) => /reduced-motion/.test(m)));
    const red = anim.find(({ media }) => media.some((m) => /prefers-reduced-motion:\s*reduce/.test(m)));
    const kf = rules.find(({ x }) => x.type === 7 && x.name === 'c-settings-rowflash');
    const frames = kf ? [...kf.x.cssRules].map((f) => [f.keyText, f.style.getPropertyValue('background-color').trim()]) : [];
    n.css = { main: main && main.x.style.getPropertyValue('animation'), reduce: red && red.x.style.getPropertyValue('animation'), frames };
    r.css = !!main && /c-settings-rowflash/.test(n.css.main) && /\b2s\b/.test(n.css.main) && !/infinite/.test(n.css.main)
      && !!red && n.css.reduce === 'none'
      && frames.length === 2 && /^0%$|^from$/.test(frames[0][0]) && frames[0][1] === 'var(--surface-action-tonal-default)'
      && /^100%$|^to$/.test(frames[1][0]) && frames[1][1] === 'transparent';
    r.noErr = K.noErr(s.errs);
  } catch (e) { r.threw = e.message; }
  finally { if (s) s.close(); }
  const c = (k, m) => ok(r[k] === true, m + ' — ' + JSON.stringify(r[k] === true ? { [k]: true } : { [k]: r[k], threw: r.threw, n }));
  c('flags', '★ S19 F9 (#1371): openScreen(\'privacy\') flags the auto-download ROW (and only it) for the flash; a wrong id flags nothing');
  c('restart', '★ S19 F9: a second openScreen mid-flash restarts it (the row is still flagged)');
  c('restartKept', '★ S19 F9: the restarted flash keeps its flag past the point where the FIRST flash ended — the cleanup never cuts a 2 s flash short');
  c('cleanup', '★ S19 F9: the flag is removed afterwards (the 2.4 s cleanup — no animationend needed)');
  c('css', '★ S19 F9: the shipped CSS — .c-settings__row[data-flash] runs c-settings-rowflash once over 2s, tonal-default → transparent (the wallet wash), and none under prefers-reduced-motion');
  c('noErr', '★ S19 F9: no page error');
}
