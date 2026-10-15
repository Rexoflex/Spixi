/* ==== S20G launch — the CHROMIUM sweep (NOT a pin module, NOT in smoke; Playwright) — Q-2 · Q-3 · F-3 · R-2 · R-3 · F-4 ====
 * On the BUILT intro.html, real layout:
 *   A. 14 locales × 320×568 (insets 24/0) · 390×844 (47/34) · 1126×710 desktop, setVersion("spixi-0.9.22"), each of the 4
 *      slides on screen: no text clipped by the viewport or a clipping ancestor (slide title + copy, dots, the version
 *      line, the CTAs, the legal line, the language pill, the logo), no nowrap overflow, the version TEXT inside the
 *      column, the welcome column not overflowing, no welcome button whose label overflows it, and no CTA label on two
      lines (the net is a safety net — a shipped label fits one line). Prints per run: the fit
 *      level, the art room, the copy line height, the version line + width, each CTA label width / its box (+ lines).
 *   B. the CTA two-line net: a 41-character label on the 320 px welcome → two lines, the button grows (> 56 px), nothing
 *      overflows the outline.
 *   C. R-3: create step 2 at 1126×710 / 390×844 / 320×568 — the fields, the banner and the footer move 0 px when the
 *      FIRST character is typed (and after a strong password).
 *   D. R-2: the nickname <b>'s ink vs the brightest / darkest backdrop pixel behind it ≥ 4.5 (3 sizes).
 *   E. F-4: the file card hover (desktop pointer): a background-image wash in BOTH states; the card's title / sub /
 *      "Change" ink vs the real pixels behind them ≥ 4.5 at rest AND hover in both states; the keyboard focus ring kept;
 *      a touch phone (no hover: hover) gets no hover.
 * Exit 1 on any miss. Run after the full build:
 *   PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-s20g/l-sweep.mjs [sizes=320,390,desk | none = skip A]
 * (sharp is read from SHARP_MODULE, default next to Playwright.) The launch is fixed-dark: one theme. 2 cores ≈ 3 min.
 * Deliberate breaks (S20G report): de-de restoreCta back to the long label (+ build) → A fails "needs the two-line net" at 320;
 *   the meter-label min-height removed → C fails (shift 18 px); the green-state 3 % wash raised to 6 % → E fails ("Change" 4.22). */
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw, sharp;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('l-sweep: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
try { const sm = process.env.SHARP_MODULE || (PWM.startsWith('/') ? join(dirname(dirname(PWM)), 'sharp/dist/index.mjs') : 'sharp'); sharp = (await import(sm.startsWith('/') ? pathToFileURL(sm).href : sm)).default; }
catch (e) { console.error('l-sweep: sharp not found — set SHARP_MODULE'); process.exit(2); }
const { chromium } = pw;
const URL = pathToFileURL(join(root, 'Spixi/Resources/Raw/html/intro.html')).href;
const SIZES_ARG = (process.argv[2] || '320,390,desk').split(',');
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const SIZES = {
  '390': { vp: { width: 390, height: 844 }, ua: PHONE_UA, inset: [47, 34], touch: true },
  '320': { vp: { width: 320, height: 568 }, ua: PHONE_UA, inset: [24, 0], touch: true },
  desk: { vp: { width: 1126, height: 710 }, ua: DESKTOP_UA, inset: null, touch: false },
};
const LOCALES = ['en-us', 'de-de', 'es-co', 'fr-fr', 'sr-sp', 'sl-si', 'ru-ru', 'pt-br', 'it-it', 'id-id', 'lt-lt', 'cn-cn', 'ja-jp', 'sq-al'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const miss = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const browser = await chromium.launch();
const CLIP = () => {
  const sels = ['.c-launch__slide[aria-hidden="false"] .c-launch__slide-title', '.c-launch__slide[aria-hidden="false"] .c-launch__slide-copy',
    '.c-launch__dots', '.c-launch__version', '.c-launch__ctas', '.c-launch__legal', '.c-launch__lang', '.c-launch__logo'];
  const issues = [];
  const vis = (e) => { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; for (let x = e; x; x = x.parentElement) if (x.hidden) return false; return e.getClientRects().length > 0; };
  for (const sel of sels) for (const e of document.querySelectorAll(sel)) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect();
    const name = sel.replace(/.*\s/, '');
    if (r.top < -0.5 || r.bottom > innerHeight + 0.5 || r.left < -0.5 || r.right > innerWidth + 0.5) issues.push(name + ' outside viewport');
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/(hidden|clip|auto|scroll)/.test(cs.overflowY + cs.overflowX)) {
        const ar = a.getBoundingClientRect();
        if (!ar.width || !ar.height) continue;
        if (r.top < ar.top - 0.5 || r.bottom > ar.bottom + 0.5) issues.push(name + ' clipped by ' + a.className.split(' ')[0] + ' (' + Math.round(r.top) + '–' + Math.round(r.bottom) + ' vs ' + Math.round(ar.top) + '–' + Math.round(ar.bottom) + ')');
      }
    }
    if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).whiteSpace === 'nowrap') issues.push(name + ' nowrap overflow ' + e.scrollWidth + '>' + e.clientWidth);
  }
  for (const b of document.querySelectorAll('.c-launch__welcome .c-button')) if (vis(b) && (b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1)) issues.push('button overflow "' + b.textContent.trim() + '"');
  const ver = document.querySelector('.c-launch__version'); const wv0 = document.querySelector('.c-launch__welcome');
  if (ver && vis(ver)) { const cs = getComputedStyle(wv0), wr = wv0.getBoundingClientRect(), r = ver.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(ver); const tr = range.getBoundingClientRect();
    const l = wr.left + parseFloat(cs.paddingLeft), rr = wr.right - parseFloat(cs.paddingRight);
    if (tr.left < l - 0.5 || tr.right > rr + 0.5) issues.push('version text past the column (' + Math.round(tr.width) + ' in ' + Math.round(rr - l) + ')'); }
  const wv = document.querySelector('.c-launch__welcome:not([hidden])');
  if (wv && vis(wv) && wv.scrollHeight > wv.clientHeight + 1) issues.push('welcome scrollHeight ' + wv.scrollHeight + ' > ' + wv.clientHeight);
  return issues;
};
const STATE = () => {
  const wv = document.querySelector('.c-launch__welcome');
  const ver = document.querySelector('.c-launch__version');
  const range = document.createRange(); range.selectNodeContents(ver);
  const btns = [...document.querySelectorAll('.c-launch__ctas .c-button')].map((b) => {
    const lab = b.querySelector('.c-button__label'); const rr = document.createRange(); rr.selectNodeContents(lab);
    const rects = [...rr.getClientRects()]; const lines = new Set(rects.map((x) => Math.round(x.top))).size;
    return { h: Math.round(b.getBoundingClientRect().height), box: Math.round(b.clientWidth - parseFloat(getComputedStyle(b).paddingLeft) - parseFloat(getComputedStyle(b).paddingRight)), natural: Math.round(lab.scrollWidth), lines };
  });
  const copyLh = parseFloat(getComputedStyle(document.querySelector('.c-launch__slide-copy')).lineHeight);
  return { compact: wv.dataset.compact || '0', artOff: document.querySelector('.c-launch__slide').hasAttribute('data-art-off'), artRoom: document.querySelector('.c-launch__carousel').style.getPropertyValue('--launch-art-room'), copyLh, version: ver.textContent, verW: Math.round(range.getBoundingClientRect().width), verLines: Math.round(ver.getBoundingClientRect().height), btns };
};
const L = (r, g, b) => [r, g, b].map((x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
/* worst contrast of an element's ink over the real pixels behind it (ink hidden, brightest + darkest backdrop pixel) */
async function inkContrast(page, sel) {
  const info = await page.evaluate((sel) => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); const ink = getComputedStyle(e).color; e.dataset.ink = e.style.color; e.style.color = 'transparent'; return { x: r.x, y: r.y, width: Math.max(1, r.width), height: Math.max(1, r.height), ink }; }, sel);
  await sleep(60);
  const buf = await page.screenshot({ clip: { x: info.x, y: info.y, width: info.width, height: info.height } });
  await page.evaluate((sel) => { const e = document.querySelector(sel); e.style.color = e.dataset.ink || ''; }, sel);
  const { data, info: im } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const ink = info.ink.match(/[\d.]+/g).map(Number); const a = ink[3] == null ? 1 : ink[3];
  let worst = 99, bg = null;
  for (let i = 0; i < data.length; i += im.channels) {
    const px = [data[i], data[i + 1], data[i + 2]];
    const comp = ink.slice(0, 3).map((c, k) => c * a + px[k] * (1 - a));
    const c = cr(L(...comp), L(...px));
    if (c < worst) { worst = c; bg = px; }
  }
  return { ink: info.ink, worst: Math.round(worst * 100) / 100, bg: 'rgb(' + bg + ')' };
}

/* —— A —— */
for (const sz of SIZES_ARG.filter((x) => SIZES[x])) for (const lang of LOCALES) {   // 'none' = skip A
  const S = SIZES[sz];
  const ctx = await browser.newContext({ viewport: S.vp, deviceScaleFactor: 1, userAgent: S.ua, hasTouch: S.touch, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL + '?lang=' + lang);
  await sleep(300);
  if (S.inset) await page.evaluate(([t, b]) => { window.setInsetTop(String(t)); window.setInsetBottom(String(b)); }, S.inset);
  await page.evaluate(() => executeUiCommand(setVersion, btoa('spixi-0.9.22')));
  await page.evaluate(() => document.fonts.ready);
  await sleep(250);
  await page.evaluate(() => window.Spixi.launchWelcomeFit(document.querySelector('.c-launch')));
  await sleep(100);
  const st = await page.evaluate(STATE);
  const clip = [];
  for (let i = 0; i < 4; i++) {
    await page.click('.c-launch__dot >> nth=' + i); await sleep(80);
    for (const x of await page.evaluate(CLIP)) clip.push('s' + (i + 1) + ': ' + x);
  }
  if (st.verLines > 24) clip.push('version line wraps (' + st.verLines + ' px)');
  for (const b of st.btns) if (b.lines > 1) clip.push('a CTA label needs the two-line net (' + b.natural + ' px in a ' + b.box + ' px box) — shorten it');
  console.log(sz, lang, JSON.stringify({ L: st.compact, artOff: st.artOff, room: st.artRoom, lh: st.copyLh, ver: st.version, verW: st.verW, btns: st.btns.map((b) => b.natural + '/' + b.box + (b.lines > 1 ? ' ' + b.lines + 'L h' + b.h : '')).join(' · ') }));
  if (clip.length || errs.length) miss('A ' + sz + ' ' + lang + ': ' + JSON.stringify({ clip, errs }));
  await ctx.close();
}
/* —— B —— */
{
  const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, userAgent: PHONE_UA, hasTouch: true });
  const page = await ctx.newPage(); await page.goto(URL); await sleep(500);
  const b = await page.evaluate(() => {
    const btn = document.querySelectorAll('.c-launch__ctas .c-button')[1];
    btn.querySelector('.c-button__label').textContent = 'Restore an existing account from a backup';
    const lab = btn.querySelector('.c-button__label'); const rr = document.createRange(); rr.selectNodeContents(lab);
    const lines = new Set([...rr.getClientRects()].map((x) => Math.round(x.top))).size;
    const lr = rr.getBoundingClientRect(), br = btn.getBoundingClientRect();
    return { lines, h: Math.round(br.height), inside: lr.left >= br.left && lr.right <= br.right && lr.top >= br.top && lr.bottom <= br.bottom };
  });
  console.log('B two-line net', JSON.stringify(b));
  if (!(b.lines === 2 && b.h > 56 && b.inside)) miss('B the CTA two-line net: ' + JSON.stringify(b));
  await ctx.close();
}
/* —— C + D —— */
for (const [tag, opt] of [['desktop', { viewport: { width: 1126, height: 710 }, userAgent: DESKTOP_UA }], ['phone390', { viewport: { width: 390, height: 844 }, userAgent: PHONE_UA, hasTouch: true }], ['phone320', { viewport: { width: 320, height: 568 }, userAgent: PHONE_UA, hasTouch: true }]]) {
  const ctx = await browser.newContext(opt); const page = await ctx.newPage();
  await page.goto(URL + '?view=create'); await sleep(600);
  const geo = () => page.evaluate(() => [...document.querySelectorAll('.c-launch__step[data-step="2"] .c-launch__fields > *, .c-launch__step[data-step="2"] .c-launch__footer')]
    .filter((e) => e.getClientRects().length).map((e) => Math.round(e.getBoundingClientRect().top * 10) / 10));
  await page.fill('.c-launch__step[data-step="1"] input', 'Aleksandra-Marija'); await page.keyboard.press('Enter'); await sleep(700);
  const g0 = await geo();
  await page.keyboard.type('a'); await sleep(400);
  const g1 = await geo();
  await page.keyboard.type('bcdefghij1!'); await sleep(400);
  const g2 = await geo();
  const shift = Math.max(...g1.map((y, i) => Math.abs(y - g0[i])), ...g2.map((y, i) => Math.abs(y - g0[i])));
  const nick = await inkContrast(page, '.c-launch__nick');
  console.log('C/D', tag, JSON.stringify({ shift, nick }));
  if (shift > 0.5) miss('C R-3 ' + tag + ': the step-2 rows moved ' + shift + ' px on the first character');
  if (nick.worst < 4.5) miss('D R-2 ' + tag + ': the nickname ink ' + nick.worst);
  await ctx.close();
}
/* —— E —— */
{
  const ctx = await browser.newContext({ viewport: { width: 1126, height: 710 }, userAgent: DESKTOP_UA }); const page = await ctx.newPage();
  await page.goto(URL + '?view=restore'); await sleep(700);
  const card = page.locator('.c-launch__filecard');
  const read = async (label, hover) => {
    const st = await page.evaluate(() => getComputedStyle(document.querySelector('.c-launch__filecard')).backgroundImage);
    const ink = {};
    for (const [k, sel] of [['title', '.c-launch__filecard-title'], ['sub', '.c-launch__filecard-sub'], ['change', '.c-launch__filecard-change']]) if (await page.locator(sel).count()) ink[k] = (await inkContrast(page, sel)).worst;
    console.log('E', label, JSON.stringify({ wash: st !== 'none', ink }));
    if ((st !== 'none') !== hover) miss('E F-4 ' + label + ': hover wash ' + st);
    for (const [k, v] of Object.entries(ink)) if (v < 4.5) miss('E F-4 ' + label + ' ' + k + ' ' + v);
  };
  await page.mouse.move(5, 5); await sleep(150); await read('empty rest', false);
  await card.hover(); await sleep(150); await read('empty hover', true);
  await page.evaluate(() => executeUiCommand(setUploadedFileName, btoa('spixi-backup-2026.ixi')));
  await page.mouse.move(5, 5); await sleep(150); await read('set rest', false);
  await card.hover(); await sleep(150); await read('set hover', true);
  await page.mouse.move(5, 5); await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement.classList.contains('c-launch__filecard'))) break; }
  const fv = await page.evaluate(() => { const c = document.querySelector('.c-launch__filecard'); return c.matches(':focus-visible') && getComputedStyle(c).outlineStyle === 'solid'; });
  if (!fv) miss('E F-4: the keyboard focus ring is gone');
  await ctx.close();
  const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: PHONE_UA, hasTouch: true, isMobile: true }); const tp = await tctx.newPage();
  await tp.goto(URL + '?view=restore'); await sleep(600);
  await tp.locator('.c-launch__filecard').hover().catch(() => {}); await sleep(150);
  const th = await tp.evaluate(() => getComputedStyle(document.querySelector('.c-launch__filecard')).backgroundImage);
  if (th !== 'none') miss('E F-4: a touch phone shows the hover wash');
  await tctx.close();
}
await browser.close();
console.log('\nl-sweep: ' + (fails.length ? fails.length + ' MISS' : 'all clean'));
process.exit(fails.length ? 1 : 0);
