/* ==== S20H F-A — the CHROMIUM sweep (NOT a pin module, NOT in smoke; Playwright) ====
 * On the BUILT settings.html, Chat appearance open, real layout: a desktop UA (data-desktop) at 320 / 360 / 505 / 700 / 1280
 * and a phone UA at 320 / 505: no element of the screen ends past the right edge of the window (an element inside a
 * horizontal scroller counts only if that scroller itself ends past it), the document does not scroll sideways, and the
 * columns are on only when the window is wide (≥ 720 px of body). Then a LIVE resize 1280 → 505 → 900 → 360 → 1280 with
 * the screen open: the same checks after each step (no reload).
 * Run after build-shells: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-s20h/a-sweep.mjs
 * Deliberate break (S20H report): the `:root[data-desktop] #settings-root { min-width: 0; }` line removed (+ build-shells)
 *   → fails at desktop 320 / 360 / 505 / 700 and in the resize (175 elements past the edge at 320). */
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('a-sweep: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
const URL = pathToFileURL(join(root, 'Spixi/Resources/Raw/html/settings.html')).href;
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const MEASURE = () => {
  const W = innerWidth;
  const screen = document.querySelector('.c-settings-appearance');
  if (!screen) return { err: 'Chat appearance not open' };
  const scroller = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (/(auto|scroll)/.test(getComputedStyle(a).overflowX)) return a; return null; };
  const past = [];
  for (const e of screen.querySelectorAll('*')) {
    if (!e.getClientRects().length) continue;
    const r = e.getBoundingClientRect();
    if (!r.width || r.right <= W + 0.5) continue;
    const sc = scroller(e);
    if (sc && sc.getBoundingClientRect().right <= W + 0.5) continue;   // scrolls inside its own row, whose edge is on screen
    past.push(String(e.className && e.className.baseVal === undefined ? e.className : e.tagName).split(' ')[0] + '@' + Math.round(r.right));
  }
  const body = document.querySelector('.c-settings-appearance__body');
  return { W, desktop: document.documentElement.hasAttribute('data-desktop'), cols: !!(body && body.hasAttribute('data-cols')), bodyW: body ? Math.round(body.getBoundingClientRect().width) : 0, docW: document.documentElement.scrollWidth, past: past.length, first: past.slice(0, 3) };
};
const judge = (tag, m) => {
  const bad = m.err || m.past > 0 || m.docW > m.W || (m.cols && m.bodyW < 700) || (!m.cols && m.desktop && m.bodyW >= 720 + 24);
  console.log((bad ? '  ✗ ' : '  ✓ ') + tag + ' ' + JSON.stringify(m));
  if (bad) fails.push(tag);
};
const open = async (ctx) => {
  const p = await ctx.newPage();
  await p.goto(URL); await sleep(900);
  await p.evaluate(() => { const r = [...document.querySelectorAll('button.c-settings__row')].find((x) => /Chat appearance/.test(x.textContent || '')); if (r) r.click(); });
  await sleep(900);
  return p;
};
const b = await pw.chromium.launch();
for (const [ua, tag, widths] of [[DESK_UA, 'desktop', [320, 360, 505, 700, 1280]], [PHONE_UA, 'phone', [320, 505]]]) {
  for (const w of widths) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, userAgent: ua, hasTouch: tag === 'phone' });
    judge(tag + ' ' + w, await (await open(ctx)).evaluate(MEASURE));
    await ctx.close();
  }
}
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, userAgent: DESK_UA });
  const p = await open(ctx);
  for (const w of [505, 900, 360, 1280]) { await p.setViewportSize({ width: w, height: 800 }); await sleep(500); judge('resize → ' + w, await p.evaluate(MEASURE)); }
  await ctx.close();
}
await b.close();
console.log(fails.length ? '\na-sweep FAIL: ' + fails.join(' · ') : '\na-sweep OK');
process.exit(fails.length ? 1 : 0);
