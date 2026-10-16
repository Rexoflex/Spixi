/* ==== S20H Drop B — F-B (create step 2: no jump on a mismatch; one step motion) + ⑪ (monotonic input clocks) ====
 * On the BUILT intro.html (jsdom; the pins-on1 kit):
 *   (1) the match check carries BOTH labels in one cell — "Passwords match" (shown while idle / ok) and the mismatch text
 *       (shown only in the 'bad' state, computed visibility) — so the row keeps one width in every state;
 *   (2) the old mismatch line is out of the flow (computed position absolute, 1 × 1, clipped) but still role="alert"
 *       with the text while the confirm field "shouts" — the message is still announced, and takes no row / gap;
 *   (3) a shouting mismatch → the check is 'bad', the bad label visible, the ok label hidden; a match → 'ok' + the ok label;
 *   (4) desktop: welcome → create stamps data-arrive on the create view (the arrival animation), and it goes again; a
 *       phone UA never stamps it (the phone keeps its subscreen slide);
 *   (5) the built CSS: the desktop arrival animates the card (::before) + rows with the step keyframes, and reduced
 *       motion maps it to the 140 ms fade (Damir: keep the short fade);
 *   (6) ⑪ the composer's touch window (downAt) and the launch pointer window (ptrAt) read performance.now(), not Date.now().
 * The real layout (0 px movement of everything below the confirm field at 1126 × 710 / 390 × 844 / 320 × 568, the card
 * bottom easing between the steps, frames) = the Chromium sweep scripts/pins-s20h/b-sweep.mjs (not in smoke).
 * Deliberate breaks (S20H report): ① the `.c-launch__mismatch` rule removed from launch-form.css → (2) fails (static);
 *   ② chkMatch built with one label → (1) fails; ③ the data-arrive stamp removed from show() → (4) fails; ④ composer
 *   downAt back to Date.now() → (6) fails. */
import { on1Kit } from '../pins-on1/kit.mjs';
export default async function (h) {
  const { ok, sleep, root, readFileSync, join, stripCode } = h;
  const { boot } = on1Kit(h);
  const r = {};
  let s = null;
  try {
    s = await boot({ ua: 'phone', query: 'view=create' });
    const { d, W, typeIn } = s;
    const v = d.querySelector('[data-launch-view="create"]');
    const nick = v.querySelector('[data-step="1"] input');
    typeIn(nick, 'Ana');
    v.querySelector('[data-step="1"] .c-launch__footer button').click();
    await sleep(60);
    const [pw, rp] = v.querySelectorAll('[data-step="2"] input');
    const chk = v.querySelectorAll('.c-launch__check')[1];
    const okL = chk && chk.querySelector('.c-launch__check-ok'), badL = chk && chk.querySelector('.c-launch__check-bad');
    const cell = chk && chk.querySelector('.c-launch__check-text');
    const vis = (e) => W.getComputedStyle(e).visibility;
    r.labels = !!okL && !!badL && okL.textContent === 'Passwords match' && badL.textContent === 'Don’t match yet'
      && !!cell && W.getComputedStyle(cell).display === 'inline-grid' && okL.parentElement === cell && badL.parentElement === cell;
    r.idle = !!chk && chk.dataset.state === 'idle' && vis(okL) === 'visible' && vis(badL) === 'hidden';
    const mm = v.querySelector('.c-launch__mismatch');
    const mcs = mm && W.getComputedStyle(mm);
    r.outOfFlow = !!mcs && mcs.position === 'absolute' && mcs.width === '1px' && mcs.height === '1px' && /inset\(50%\)/.test(mcs.getPropertyValue('clip-path'));
    typeIn(pw, 'abcdefghij1!');
    typeIn(rp, 'abcdefghij1?');
    await sleep(20);
    r.bad = chk.dataset.state === 'bad' && vis(okL) === 'hidden' && vis(badL) === 'visible';
    r.announced = !!mm && !mm.hidden && mm.getAttribute('role') === 'alert' && /don’t match yet/.test(mm.textContent);
    typeIn(rp, 'abcdefghij1!');
    await sleep(20);
    r.match = chk.dataset.state === 'ok' && vis(okL) === 'visible' && vis(badL) === 'hidden' && mm.hidden;
    s.close(); s = null;
    /* (4) the desktop arrival */
    s = await boot({ ua: 'desktop' });
    const v2 = s.d.querySelector('[data-launch-view="create"]');
    [...s.d.querySelectorAll('.c-launch__ctas .c-button')][0].click();
    await sleep(30);
    r.arrive = !!v2 && v2.hasAttribute('data-arrive');
    await sleep(450);
    r.arriveGone = !!v2 && !v2.hasAttribute('data-arrive');
    s.close(); s = null;
    s = await boot({ ua: 'phone' });
    const v3 = s.d.querySelector('[data-launch-view="create"]');
    [...s.d.querySelectorAll('.c-launch__ctas .c-button')][0].click();
    await sleep(30);
    r.phoneNoArrive = !!v3 && !v3.hasAttribute('data-arrive');
  } catch (e) { r.err = String((e && e.stack) || e).slice(0, 300); }
  finally { try { if (s) s.close(); } catch (e) { /* closed */ } }
  ok(r.labels && r.idle && !r.err, `★ S20H F-B (1): the match check holds "Passwords match" AND the mismatch text in one grid cell (one width in every state); at rest only "Passwords match" shows — ${JSON.stringify(r)}`);
  ok(r.outOfFlow && r.announced && !r.err, `★ S20H F-B (2): the old mismatch line takes no row (absolute, 1 × 1, clipped) yet is still role=alert with the text while the confirm field shouts — ${JSON.stringify({ outOfFlow: r.outOfFlow, announced: r.announced })}`);
  ok(r.bad && r.match && !r.err, `★ S20H F-B (3): a shouting mismatch → the check is bad and says "Don’t match yet" (the long sentence is the screen-reader line); a match → ok + "Passwords match" (no more "Passwords match" with a red ✕) — ${JSON.stringify({ bad: r.bad, match: r.match })}`);
  ok(r.arrive && r.arriveGone && r.phoneNoArrive && !r.err, `★ S20H F-B (4): desktop welcome → create stamps data-arrive (the step-grammar arrival) and clears it; a phone never does — ${JSON.stringify({ arrive: r.arrive, gone: r.arriveGone, phone: r.phoneNoArrive })}`);
  const css = readFileSync(join(root, 'Spixi/Resources/Raw/html/intro.html'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const arrive = /:root\[data-desktop\] \.c-launch__form\[data-arrive\]::before \{ animation: c-launch-fade-in 220ms var\(--easing-standard\) both; \}/.test(css)
    && /\.c-launch__form\[data-arrive\] \.c-launch__footer \{ animation: c-launch-step-fwd 220ms var\(--easing-standard\) both; \}/.test(css);
  const rm = /@media \(prefers-reduced-motion: reduce\) \{[^@]*?html\[dir="rtl"\]:root\[data-desktop\] \.c-launch__form\[data-arrive\] \.c-launch__footer \{ animation: c-launch-fade-in 140ms linear both; \}/.test(css);   // #46 r1: inside ONE reduced-motion block, RTL included
  ok(arrive && rm, `★ S20H F-B (5): the built intro.html animates the desktop arrival with the step keyframes (220 ms) and reduced motion keeps the 140 ms fade — ${JSON.stringify({ arrive, rm })}`);
  const comp = stripCode(readFileSync(join(root, 'src/components/composer.js'), 'utf8'));
  const launch = stripCode(readFileSync(join(root, 'src/components/launch-shell.js'), 'utf8'));
  const mono = /downAt = performance\.now\(\)/.test(comp) && /performance\.now\(\) - downAt < 1500/.test(comp) && !/downAt = Date\.now|Date\.now\(\) - downAt/.test(comp)
    && /ptrAt = performance\.now\(\)/.test(launch) && /performance\.now\(\) - ptrAt < 1000/.test(launch) && !/ptrAt = Date\.now|Date\.now\(\) - ptrAt/.test(launch);
  ok(mono, '★ S20H ⑪ (#1423): the composer touch window and the launch pointer window run on performance.now() (monotonic) — a wall-clock step back no longer stretches them');
}
