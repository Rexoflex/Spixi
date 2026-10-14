/* ==== ON-1 E (#1422, Part B) — DESKTOP: two columns ≥ 900 px, the phone column below; "device" vs "phone"; focus ====
 * On the BUILT intro.html (jsdom). The layout is read with the kit's media-aware cascade over the BUILT sheets
 * (jsdom ignores @media): the desktop shell (data-desktop from the shell's own UA sniff) at 1280 px and 800 px,
 * and the phone shell at 1280 px.
 *   (1) desktop ≥ 900: the create / restore view is a GRID of two columns (46 % | 1fr), the hero in column 1, the
 *       fields + footer in column 2, the card (::before) 460 px wide; below 900 the view is the phone column (no
 *       grid) capped at 460 px; the phone shell never takes the grid, however wide.
 *   (2) the platform words: on desktop the address note, the step-2 subline, the banner and the honest line say
 *       "device" and never "phone"; on the phone they say "phone" and never "device".
 *   (3) desktop focus + keys: create opens with the focus in the nickname, step 2 in the password, restore in the
 *       password; the step-2 Tab order is back → password → its eye → confirm → its eye → Create (no positive
 *       tabindex, the checks are not stops); Enter on the confirm field runs Create only while it is on.
 * Deliberate breaks (S20 T report): ① the grid rule's min-width 900 → 1400 → (1) fails at 1280;
 *   ② the address note always the phone key → (2) fails on desktop; ③ show() without the desktop focus →
 *   (3) fails; ④ the Enter handler without the `!cta.disabled` guard → (3) fails; ⑤ (#46 r1) deviceWords() = onDesktop() alone
 *   → (2) iPad / androidTablet fail. */
import { on1Kit, IPAD_UA, ANDROID_TABLET_UA } from './kit.mjs';
export default async function (h) {
  const { ok, sleep } = h;
  const { boot, cascade } = on1Kit(h);
  let s = null, p = null;
  try {
    s = await boot({ ua: 'desktop' });
    const { d, W, push, typeIn } = s;
    const desk = d.documentElement.hasAttribute('data-desktop');
    push('setLaunchView', 'create');
    await sleep(80);
    const v = d.querySelector('[data-launch-view="create"]');
    const rv = d.querySelector('[data-launch-view="restore"]');
    const lay = (view, width) => ({
      display: cascade(W, view, 'display', { width }),
      cols: cascade(W, view, 'grid-template-columns', { width }).replace(/\s+/g, ' '),
      card: cascade(W, view, 'width', { width, pseudo: '::before' }),
      heroCol: cascade(W, view.querySelector('.c-launch__hero'), 'grid-column', { width }),
      fieldsCol: cascade(W, view.querySelector('.c-launch__fields'), 'grid-column', { width }),
      footCol: cascade(W, view.querySelector('.c-launch__footer'), 'grid-column', { width }),
      bodyMax: cascade(W, view.querySelector('.c-launch__body > .c-launch__fields'), 'max-width', { width }),
    });
    const wide = lay(v, 1280), narrow = lay(v, 800);
    let wideR = null;   // read once restore is ON screen (a hidden view is display: none)
    const r1 = {
      desk,
      grid: wide.display === 'grid' && wide.cols === '46% 1fr' && wide.card === '460px' && wide.heroCol === '1' && wide.fieldsCol === '2' && wide.footCol === '2',
      contents: cascade(W, v.querySelector('.c-launch__step'), 'display', { width: 1280 }) === 'contents' && cascade(W, v.querySelector('.c-launch__body'), 'display', { width: 1280 }) === 'contents',
      below900: narrow.display !== 'grid' && narrow.bodyMax === '460px',
    };

    /* (2) words — desktop */
    const words = (root) => [root.querySelector('.c-launch__fnote'), root.querySelector('[data-step="2"] .c-launch__hero-copy'), root.querySelector('.c-launch__banner-body'), root.querySelector('.c-launch__honest')].map((e) => (e ? e.textContent : ''));

    /* (3) focus on desktop */
    const nick = v.querySelector('input[data-field="nick"]');
    const r3 = {};
    push('setLaunchView', 'welcome'); await sleep(40);
    d.querySelectorAll('.c-launch__ctas .c-button')[0].click(); await sleep(60);
    r3.createFocusNick = d.activeElement === nick;
    typeIn(nick, 'Ana');
    v.querySelector('[data-step="1"] .c-launch__footer .c-button').click(); await sleep(40);
    const [pw, rp] = [...v.querySelectorAll('.c-lock__input')];
    r3.step2FocusPw = d.activeElement === pw;
    const dWords = words(v);
    const p2 = v.querySelector('[data-step="2"]');
    const stops = [v.querySelector('.c-topbar .c-button'), ...p2.querySelectorAll('button, input, [tabindex]')].filter((e) => !e.disabled || e.tagName === 'BUTTON');
    const names = stops.map((e) => e.classList.contains('c-lock__reveal') ? 'eye' : e === pw ? 'password' : e === rp ? 'confirm' : e.closest('.c-topbar') ? 'back' : e.closest('.c-launch__footer') ? 'create' : e.className);
    r3.tabOrder = JSON.stringify(names) === '["back","password","eye","confirm","eye","create"]' && ![...v.querySelectorAll('[tabindex]')].some((e) => +e.getAttribute('tabindex') > 0);
    const n0 = s.sent.length;
    typeIn(pw, 'correct horse battery'); typeIn(rp, 'wrong');
    rp.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(20);
    const err2 = p2.querySelector('.c-lock__error:not(.c-launch__mismatch)');
    r3.enterOffNothing = !s.sent.slice(n0).some((c) => /^ixian:create:/.test(c)) && err2.hidden;   // nothing at all happens — not even a submit that answers with an error
    typeIn(rp, 'correct horse battery');
    rp.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(20);
    r3.enterOnCreates = s.sent.slice(n0).filter((c) => /^ixian:create:/.test(c)).length === 1;
    push('removeLoadingOverlay'); await sleep(20);
    push('setLaunchView', 'welcome'); await sleep(20); push('setLaunchView', 'welcome'); await sleep(40);
    d.querySelectorAll('.c-launch__ctas .c-button')[1].click(); await sleep(60);
    r3.restoreFocusPw = d.activeElement === rv.querySelector('.c-lock__input');
    wideR = lay(rv, 1280);
    r1.restoreGrid = wideR.display === 'grid' && wideR.card === '460px' && wideR.heroCol === '1' && wideR.fieldsCol === '2';
    s.close(); s = null;

    /* the phone shell: never the grid; its words say phone */
    p = await boot({ ua: 'phone' });
    const pv = p.d.querySelector('[data-launch-view="create"]');
    r1.phoneNeverGrid = !p.d.documentElement.hasAttribute('data-desktop') && cascade(p.W, pv, 'display', { width: 1280 }) !== 'grid';
    p.push('setLaunchView', 'create'); await sleep(600);
    p.typeIn(pv.querySelector('input[data-field="nick"]'), 'Ana');
    pv.querySelector('[data-step="1"] .c-launch__footer .c-button').click(); await sleep(40);
    const pWords = words(pv);
    const r2 = {
      desktopDevice: dWords.every((t) => /\bdevice\b/.test(t) && !/\bphone\b/.test(t)),
      phonePhone: pWords.every((t) => /\bphone\b/.test(t) && !/\bdevice\b/.test(t)),
    };
    p.close(); p = null;
    /* ★ #46 r1: a TABLET (iPad, an Android UA without "Mobile") keeps the phone LAYOUT but says "device" */
    for (const [name, ua] of [['iPad', IPAD_UA], ['androidTablet', ANDROID_TABLET_UA]]) {
      p = await boot({ ua });
      const tv = p.d.querySelector('[data-launch-view="create"]');
      p.push('setLaunchView', 'create'); await sleep(600);
      p.typeIn(tv.querySelector('input[data-field="nick"]'), 'Ana');
      tv.querySelector('[data-step="1"] .c-launch__footer .c-button').click(); await sleep(40);
      const tw = words(tv);
      r2[name] = !p.d.documentElement.hasAttribute('data-desktop') && tw.every((t) => /\bdevice\b/.test(t) && !/\bphone\b/.test(t));
      p.close(); p = null;
    }
    ok(Object.values(r1).every(Boolean),
      '★ ON-1 E (Part B): desktop ≥ 900 px = two columns (46 % | 1fr) — the hero in column 1, the fields + footer in column 2, the 460 px card — for create and restore; below 900 px the phone column capped at 460 px; the phone shell never takes the grid — ' + JSON.stringify({ r1, wide, wideR, narrow }));
    ok(Object.values(r2).every(Boolean),
      '★ ON-1 E (Part B + #46 r1): desktop AND tablet strings say "device" (a tablet keeps the phone layout), phone strings say "phone" (address note · step-2 subline · banner · honest line) — ' + JSON.stringify({ r2, dWords, pWords }));
    ok(Object.values(r3).every(Boolean),
      '★ ON-1 E (Part B): desktop focus — nickname on create, password on step 2 and on restore; Tab = back → password → eye → confirm → eye → Create; Enter on the confirm runs Create only while it is on — ' + JSON.stringify({ r3, names }));
  } catch (e) {
    ok(false, '★ ON-1 E e-desktop threw: ' + (e && e.stack || e));
  } finally { if (s) s.close(); if (p) p.close(); }
}
