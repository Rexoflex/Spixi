/* ==== fixb2 item 2 — the CHROMIUM hairline sweep (NOT a pin module, NOT in smoke; Playwright, run by hand) ====
 * WHAT IT MEASURES. On the BUILT home shell (Spixi/Resources/Raw/html/index.html, a desktop UA → the shell's own boot script sets
 * data-desktop, as on Windows and the Mac) the window IS the home WebView, and the home WebView IS Grid.Column 0 of HomePage.xaml
 * (Fill, no margin): so the window's trailing edge = the column edge = the trailing edge of the native grip `paneDivider`.
 *   · the hairline's RULE: getComputedStyle(body, '::after') (content, position, inset-inline-end, width, background, z-index) and its box
 *     from those values (a pseudo-element has no getBoundingClientRect): x = clientWidth − right − width, in CSS px;
 *   · the hairline's DEVICE PIXELS: two screenshots of the trailing 16 CSS px of the window, one as it is and one with the ::after hidden
 *     (an injected `visibility: hidden`); every device column that differs is painted by the hairline (its coverage = the mean colour
 *     change of the column against the strongest column, so an anti-aliased half column shows as a fraction);
 *   · where the 2 px BoxView `paneDividerLine` lands: read from HomePage.xaml (HorizontalOptions End, Margin, WidthRequest, Grid.Column 0)
 *     → DIP [W − mR − w, W − mR] → device px × the scale (WinUI layout rounding: each edge rounded to a whole device pixel);
 *   · PASS for a leg = the line's device span holds every painted hairline column AND the line's trailing edge = the hairline's trailing edge.
 * Legs: window width 400 and 440 CSS px (today's and the new reset width), deviceScaleFactor 1 and 1.5 (100 % / 150 % display scale), light and dark.
 * The unit relation it relies on (cited in _mechanism.md): WebView2 logical size × RasterizationScale = raw pixels, and 1 CSS px = 1 DIP at
 * zoom 100 % — Chromium's deviceScaleFactor plays the RasterizationScale here.
 * Run after build-shells: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-fixb2/b-hairline-sweep.mjs
 * (add `--root <tree>` to read another tree's built shell and XAML). Exit 0 = pass · 1 = the line misses the hairline in a leg · 2 = the setup
 * cannot prove it (no desktop flag, no ::after, nothing painted, a root scroll bar).
 * Deliberate break (fixb2 report): the XAML margin back to `0,0,4,0` → every leg fails (line ends 4 DIP before the hairline). */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const argv = process.argv.slice(2);
let root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ri = argv.indexOf('--root');
if (ri >= 0) root = argv[ri + 1];
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('b-hairline-sweep: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
const URL = pathToFileURL(join(root, 'Spixi/Resources/Raw/html/index.html')).href;
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── the line, from the XAML (the source of its position) ── */
const X = readFileSync(join(root, 'Spixi/Pages/Home/HomePage.xaml'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const attrs = (name) => { const m = new RegExp('<BoxView x:Name="' + name + '"([^>]*)/>').exec(X); return m ? Object.fromEntries([...m[1].matchAll(/([\w.:]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])) : null; };
const LA = attrs('paneDividerLine');
const web = /<WebView x:Name="webView"([^>]*)\/>/.exec(X);
const WA = web ? Object.fromEntries([...web[1].matchAll(/([\w.:]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])) : {};
const margin = (s) => { const v = String(s || '0').split(',').map(Number); return v.length === 1 ? [v[0], v[0], v[0], v[0]] : v.length === 2 ? [v[0], v[1], v[0], v[1]] : v; };
if (!LA || LA.HorizontalOptions !== 'End' || LA['Grid.Column'] !== '0' || WA['Grid.Column'] !== '0' || 'Margin' in WA || 'Grid.ColumnSpan' in WA) {
  console.log('b-hairline-sweep: SETUP — the XAML is not the shape this sweep models (line End in column 0; the WebView alone in column 0, no margin) ' + JSON.stringify({ LA, WA }));
  process.exit(2);
}
const [, , mR] = margin(LA.Margin);
const lineW = Number(LA.WidthRequest);

const RULE = () => {
  const d = document.documentElement, cs = getComputedStyle(document.body, '::after');
  const W = d.clientWidth, w = parseFloat(cs.width), right = parseFloat(cs.right);
  return {
    desktop: d.hasAttribute('data-desktop'), theme: d.getAttribute('data-theme') || '', dpr: devicePixelRatio,
    innerWidth, clientWidth: W, rootScrollbar: innerWidth - W, docScrollsX: d.scrollWidth > W,
    content: cs.content, position: cs.position, insetInlineEnd: cs.insetInlineEnd, right: cs.right, top: cs.top, bottom: cs.bottom,
    width: cs.width, background: cs.backgroundColor, zIndex: cs.zIndex, boxShadow: cs.boxShadow, border: cs.borderLeftWidth + '/' + cs.borderRightWidth,
    boxCss: { left: W - right - w, right: W - right, width: w },
  };
};
const HIDE_ID = 'fixb2-hide-hairline';

const b = await pw.chromium.launch();
console.log('chromium ' + b.version() + ' · XAML paneDividerLine ' + JSON.stringify({ HorizontalOptions: LA.HorizontalOptions, Margin: LA.Margin || '(none)', WidthRequest: LA.WidthRequest }));
const fails = []; let setupBad = false;
const decoder = await (await b.newContext()).newPage();
const columns = async (png, wDev, hDev) => decoder.evaluate(async ({ src, wDev, hDev }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  return { w: img.width, h: img.height, data: Array.from(g.getImageData(0, 0, img.width, img.height).data) };
}, { src: png.toString('base64'), wDev, hDev });

for (const W of [400, 440]) {
  for (const s of [1, 1.5]) {
    for (const theme of ['light', 'dark']) {
      const tag = `W=${W} scale=${s} ${theme}`;
      const ctx = await b.newContext({ viewport: { width: W, height: 600 }, deviceScaleFactor: s, userAgent: DESK_UA, colorScheme: theme });
      const p = await ctx.newPage();
      await p.goto(URL); await sleep(1800);
      await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      await sleep(300);
      const r = await p.evaluate(RULE);
      const clip = { x: W - 16, y: 0, width: 16, height: 600 };
      const shot = async () => columns(await p.screenshot({ clip, animations: 'disabled' }));
      const A = await shot();
      await p.evaluate((id) => { const st = document.createElement('style'); st.id = id; st.textContent = 'body::after{visibility:hidden !important}'; document.head.append(st); }, HIDE_ID);
      await sleep(150);
      const B = await shot();
      await ctx.close();
      /* per device column: the summed colour change over every row */
      const diff = new Array(A.w).fill(0);
      for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) { const i = (y * A.w + x) * 4; diff[x] += Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]); }
      const max = Math.max(...diff);
      const painted = diff.map((v, x) => ({ fromEnd: A.w - x, cover: max ? Math.round((v / max) * 100) / 100 : 0 })).filter((c) => c.cover > 0.02);
      /* device px measured FROM THE TRAILING EDGE: 1 = the last device column of the window */
      const hairDev = painted.length ? { firstFromEnd: Math.max(...painted.map((c) => c.fromEnd)), lastFromEnd: Math.min(...painted.map((c) => c.fromEnd)) } : null;
      const lineDev = { firstFromEnd: Math.round((mR + lineW) * s), lastFromEnd: Math.round(mR * s) + 1 };   // columns (W·s − firstFromEnd … W·s − lastFromEnd)
      const covers = !!hairDev && lineDev.firstFromEnd >= hairDev.firstFromEnd && lineDev.lastFromEnd <= hairDev.lastFromEnd;
      const sameEdge = !!hairDev && lineDev.lastFromEnd === hairDev.lastFromEnd;
      const setup = r.desktop && r.content === '""' && r.position === 'fixed' && r.rootScrollbar === 0 && !!hairDev && A.w === Math.round(16 * s);
      const m = { rule: { position: r.position, insetInlineEnd: r.insetInlineEnd, width: r.width, background: r.background, zIndex: r.zIndex, boxShadow: r.boxShadow, border: r.border }, clientWidth: r.clientWidth, rootScrollbar: r.rootScrollbar, dpr: r.dpr, hairCss: r.boxCss, hairDevColsFromEnd: painted, lineDip: { left: W - mR - lineW, right: W - mR }, lineDevFromEnd: lineDev, covers, sameEdge, mustBe: { lineDip: { left: W - Math.max(lineW, r.boxCss.width), right: r.boxCss.right }, marginRight: W - r.boxCss.right } };
      console.log((!setup ? '  ? ' : covers && sameEdge ? '  ✓ ' : '  ✗ ') + tag + ' ' + JSON.stringify(m));
      if (!setup) setupBad = true; else if (!(covers && sameEdge)) fails.push(tag);
    }
  }
}
await b.close();
if (setupBad) { console.log('\nb-hairline-sweep: SETUP not proven (see the ? rows)'); process.exit(2); }
console.log(fails.length ? '\nb-hairline-sweep FAIL (the line misses the hairline): ' + fails.join(' · ') : '\nb-hairline-sweep OK (the line covers the hairline in every leg)');
process.exit(fails.length ? 1 : 0);
