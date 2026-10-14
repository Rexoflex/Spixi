/* ==== ON-1 #46 r2 (m2) — CAPTURE the ring-guard geometry for pins-on1/d-look.mjs (NOT a pin module) ====
 * The d-look ring clause replays the exact inputs the shipped guard reads in a real browser (the content boxes
 * + the two ring svg rects, window.Spixi.launchRingGeometry) — jsdom has no layout. This script records them
 * from the BUILT intro.html in Chromium and stamps the fixture with ringInputsHash() — ★ r4: hashes of the launch SOURCES
 * that shape the geometry (kit.mjs RING_INPUTS + the tokens launch block + the en-us launch strings). When one
 * changes, the pin fails "ring fixture stale (<input>)" until this is re-run. Another owner's component does not.
 * PREREQUISITE (not in the smoke install line): Playwright + Chromium —
 *   npm i --no-save playwright && npx playwright install chromium   (or PLAYWRIGHT_MODULE=<path to its index.mjs>)
 *   1. build: node scripts/extract-strings.mjs && node scripts/build-locales.mjs && node scripts/build-strings-iife.mjs
 *             && node scripts/build-demo-bundle.mjs && node scripts/build-shells.mjs
 *   2. node scripts/pins-on1/capture-rings.mjs        (Playwright + Chromium; PLAYWRIGHT_MODULE=<path to playwright
 *      index.mjs> when it is not resolvable as 'playwright')
 * States: welcome 390 × 844 · create step 1 / step 2 / restore at 390 × 844 (iOS insets 47 / 34) and 320 × 568
 * (24 / 0), phone UA. Writes scripts/pins-on1/ring-geometry.json. */
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ringInputsHash, ringInputHashes, PHONE_UA } from './kit.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let pw;
try { pw = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright'); }
catch (e) { console.error('capture-rings: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
const { chromium } = pw;
const URL = pathToFileURL(join(root, 'Spixi/Resources/Raw/html/intro.html')).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const out = {};
async function open(size, inset) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, colorScheme: 'dark', userAgent: PHONE_UA, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(URL); await sleep(500);
  await page.evaluate(([t, b]) => { window.setInsetTop(String(t)); window.setInsetBottom(String(b)); }, inset);
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page };
}
const settle = async (page) => { await sleep(450); await page.evaluate(() => document.getAnimations().forEach((x) => { try { if (x.effect.getTiming().iterations !== Infinity) x.finish(); } catch (e) {} })); await sleep(450); };
const grab = (page) => page.evaluate(() => window.Spixi.launchRingGeometry(document.querySelector('.c-launch')));
const round = (g) => ({ tr: g.tr, bl: g.bl, boxes: g.boxes.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.round(v * 10) / 10]))) });
for (const [tag, size, inset] of [['390', { width: 390, height: 844 }, [47, 34]], ['320', { width: 320, height: 568 }, [24, 0]]]) {
  let { ctx, page } = await open(size, inset);
  await settle(page);
  if (tag === '390') out['welcome-390'] = round(await grab(page));
  await page.click('.c-launch__ctas .c-button >> nth=0'); await settle(page);
  await page.fill('input[data-field="nick"]', 'Maya'); await page.evaluate(() => document.activeElement.blur()); await settle(page);
  out['create1-' + tag] = round(await grab(page));
  await page.click('[data-step="1"] .c-launch__footer .c-button'); await settle(page);
  const [a, b] = await page.$$('[data-launch-view="create"] .c-lock__input');
  await a.fill('correct horse battery'); await b.fill('correct horse battery'); await page.evaluate(() => document.activeElement.blur()); await settle(page);
  out['create2-' + tag] = round(await grab(page));
  await ctx.close();
  ({ ctx, page } = await open(size, inset));
  await page.click('.c-launch__ctas .c-button >> nth=1'); await settle(page);
  out['restore-' + tag] = round(await grab(page));
  await ctx.close();
}
await browser.close();
const fixture = {
  _note: 'Captured by scripts/pins-on1/capture-rings.mjs from the BUILT intro.html in Chromium (phone UA; 390x844 insets 47/34, 320x568 insets 24/0) — window.Spixi.launchRingGeometry(shell), the exact inputs of the shipped ring guard. Re-run it when the pin says the fixture is stale.',
  _hash: ringInputsHash(readFileSync, join, root),
  _inputs: ringInputHashes(readFileSync, join, root),
  ...out,
};
writeFileSync(join(root, 'scripts/pins-on1/ring-geometry.json'), JSON.stringify(fixture));
console.log('capture-rings: wrote ring-geometry.json (' + Object.keys(out).join(', ') + ') hash ' + fixture._hash);
