/* ==== S20H Drop B — F-B, the CHROMIUM sweep (NOT a pin module, NOT in smoke; Playwright) ====
 * On the BUILT intro.html, real layout:
 *   A. create step 2 at 1126 × 710 (desktop) · 390 × 844 · 320 × 568 (phone): a mismatch that shouts, then a match — every
 *      row below the confirm field (meter, checks, banner, footer) moves 0 px (± 0.5) in both directions, and the check
 *      line keeps its height (no re-wrap); the match check's visible label switches.
 *   B. desktop step 1 → 2 and 2 → 1 (Web Animations paused at 0 / 110 / 220 ms): the card (the form's ::before) has an
 *      animation; its bottom margin starts at end + (new footer bottom − old footer bottom) and lands on the end value; the
 *      content slide still runs. Reduced motion: NO ::before animation (the size changes at once), the short fade stays.
 *   C. desktop welcome → create: the view has data-arrive; the card ::before and the footer run an animation; phone: none.
 * Run after the full build: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-s20h/b-sweep.mjs
 * Deliberate breaks (S20H report): ① the `.c-launch__mismatch` rule removed (+ build) → A fails (26 px); ② easeCard's
 *   v.animate call removed → B fails (no ::before animation). */
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('b-sweep: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
const URL = pathToFileURL(join(root, 'Spixi/Resources/Raw/html/intro.html')).href;
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const say = (bad, tag, o) => { console.log((bad ? '  ✗ ' : '  ✓ ') + tag + ' ' + JSON.stringify(o)); if (bad) fails.push(tag); };
const b = await pw.chromium.launch();
const SIZES = [['desktop', { viewport: { width: 1126, height: 710 }, userAgent: DESK_UA }], ['phone390', { viewport: { width: 390, height: 844 }, userAgent: PHONE_UA, hasTouch: true }], ['phone320', { viewport: { width: 320, height: 568 }, userAgent: PHONE_UA, hasTouch: true }]];
/* A */
for (const [tag, opt] of SIZES) {
  const ctx = await b.newContext(opt); const p = await ctx.newPage();
  await p.goto(URL + '?view=create'); await sleep(700);
  await p.fill('.c-launch__step[data-step="1"] input', 'Aleksandra'); await p.keyboard.press('Enter'); await sleep(700);
  const geo = () => p.evaluate(() => {
    const st = document.querySelector('.c-launch__step[data-step="2"]');
    const top = (sel) => { const e = st.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top * 10) / 10 : null; };
    const chk = st.querySelectorAll('.c-launch__check')[1];
    return { meter: top('.c-launch__meter'), checks: top('.c-launch__checks'), banner: top('.c-launch__banner'), footer: top('.c-launch__footer'),
      checksH: Math.round(st.querySelector('.c-launch__checks').getBoundingClientRect().height), state: chk.dataset.state,
      label: [...chk.querySelectorAll('.c-launch__check-ok, .c-launch__check-bad')].find((s) => getComputedStyle(s).visibility === 'visible')?.textContent };
  });
  const inputs = await p.$$('.c-launch__step[data-step="2"] input');
  await inputs[0].fill('abcdefghij1!'); await inputs[1].click();
  const g0 = await geo();
  await p.keyboard.type('abcdefghij1?'); await sleep(450);
  const g1 = await geo();
  await p.keyboard.press('Backspace'); await p.keyboard.type('!'); await sleep(450);
  const g2 = await geo();
  const mv = (a, c) => Math.max(...['meter', 'checks', 'banner', 'footer'].map((k) => Math.abs(c[k] - a[k])));
  const o = { appear: mv(g0, g1), go: mv(g1, g2), checksH: [g0.checksH, g1.checksH, g2.checksH], states: [g0.state, g1.state, g2.state], labels: [g0.label, g1.label, g2.label] };
  say(!(o.appear <= 0.5 && o.go <= 0.5 && g0.checksH === g1.checksH && g1.state === 'bad' && g2.state === 'ok' && /match yet/.test(g1.label) && g2.label === 'Passwords match'), 'A ' + tag, o);
  await ctx.close();
}
/* B */
for (const reduce of [false, true]) {
  const ctx = await b.newContext({ viewport: { width: 1126, height: 710 }, userAgent: DESK_UA, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  await p.goto(URL + '?view=create'); await sleep(700);
  await p.fill('.c-launch__step[data-step="1"] input', 'Aleksandra');
  const before = await p.evaluate(() => document.querySelector('.c-launch__step[data-step="1"] .c-launch__footer').getBoundingClientRect().bottom);
  await p.keyboard.press('Enter');
  const frames = await p.evaluate(async () => {
    const v = document.querySelector('[data-launch-view="create"]');
    const all = document.getAnimations();
    const card = all.filter((a) => a.effect && a.effect.pseudoElement === '::before');
    all.forEach((a) => a.pause());
    const out = [];
    for (const t of [0, 110, 220]) { all.forEach((a) => { a.currentTime = t; }); out.push(parseFloat(getComputedStyle(v, '::before').marginBottom)); }
    all.forEach((a) => a.finish());
    const after = document.querySelector('.c-launch__step[data-step="2"] .c-launch__footer').getBoundingClientRect().bottom;
    return { cardAnims: card.length, slide: all.filter((a) => a.animationName === 'c-launch-step-fwd' || a.animationName === 'c-launch-fade-in').length, mb: out, after };
  });
  const dh = Math.round((frames.after - before) * 10) / 10;
  const o = { reduce, dh, ...frames };
  const good = reduce ? frames.cardAnims === 0 && frames.slide > 0
    : frames.cardAnims === 1 && Math.abs(frames.mb[0] - (frames.mb[2] + dh)) < 1.5 && frames.mb[1] > Math.min(frames.mb[0], frames.mb[2]) - 0.5 && frames.mb[1] < Math.max(frames.mb[0], frames.mb[2]) + 0.5 && Math.abs(dh) > 5;
  say(!good, 'B desktop step 1 → 2' + (reduce ? ' (reduced motion)' : ''), o);
  await ctx.close();
}
/* C */
for (const [tag, opt] of [SIZES[0], SIZES[1]]) {
  const ctx = await b.newContext(opt); const p = await ctx.newPage();
  await p.goto(URL); await sleep(900);
  const o = await p.evaluate(async () => {
    document.querySelectorAll('.c-launch__ctas .c-button')[0].click();
    const v = document.querySelector('[data-launch-view="create"]');
    const anims = document.getAnimations();
    return { arrive: v.hasAttribute('data-arrive'), card: anims.filter((a) => a.effect && a.effect.pseudoElement === '::before').length, rows: anims.filter((a) => a.animationName === 'c-launch-step-fwd').length };
  });
  const good = tag === 'desktop' ? o.arrive && o.card >= 1 && o.rows >= 3 : !o.arrive;
  say(!good, 'C welcome → create ' + tag, o);
  await ctx.close();
}
await b.close();
console.log(fails.length ? '\nb-sweep FAIL: ' + fails.join(' · ') : '\nb-sweep OK');
process.exit(fails.length ? 1 : 0);
