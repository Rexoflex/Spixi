/* ==== photo1b · #1644 — RENDER THE CHAT BACKGROUNDS (NOT a pin module, NOT in smoke; by hand; Playwright + Chromium) ====
 * What it paints: the BUILT `Spixi/Resources/Raw/html/chat.html` of the tree given by `--root`, with demo rows pushed through the shell's OWN pushes
 * (onChatScreenReady · setChatMode · setCaps · addThem · addMe · messagesDone · onChatScreenLoaded — the same calls the C# page makes, base64 as
 * executeUiCommand wants them), the appearance chosen the way the shell reads it (localStorage `spixi.chat.ground` = flat | gradient | green | blue |
 * aurora | dusk | ocean, read by the head script; the theme = `data-theme` on <html>, as the shell's own head script sets it), pattern = the default
 * (contours, on), sent colour = Auto (no `spixi.chat.sentcolour`).
 *   A. every appearance × light / dark × two devices: DESKTOP 1280 × 800 (desktop UA, no `?mobile=1`, so `data-desktop` is on and the desktop
 *      pattern alpha 0.8 × applies) and PHONE 412 × 915 (phone UA, `?mobile=1`)  → 7 × 2 × 2 = 28 PNGs, `<out>/<appearance>-<theme>-<desktop|phone>.png`;
 *   B. the three dark Mist grounds SIDE BY SIDE (phone size, one PNG `<out>/mist-dark-grounds-040607-07090B-0C0E10.png`, three columns in this order):
 *      #040607 and #07090B by a style override of `--gradient-chat` ONLY (the bubble, quote, sent, ink and alpha stay the tree's own — so the first two
 *      columns show the old grounds under the tree's new bubble; to see the OLD look whole, render the base tree with `--root`), #0C0E10 = the build as it is.
 * Names (settings-screens.js): flat = Mist · gradient = Iris · green = Meadow · blue = Spixi · aurora = Aurora · dusk = Dusk · ocean = Ocean.
 * Demo rows: a date, three incoming and three outgoing rows (a short one, a long two-line one, an emoji one), and an incoming REPLY carrying a quote of an
 * outgoing row (so the quote step of the dark bubbles is on the picture).
 * USAGE: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-photo1b/render-grounds.mjs --root <tree> --out <dir>
 *   (--root defaults to this tree; --out is required; the page must be built first: `node scripts/build-shells.mjs`.)
 * LIMITS: a picture is not a proof — the numbers are in pins-photo1b/g-tokens.mjs; this only paints. No network, no write outside --out. */
import { join, dirname, resolve } from 'node:path';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const root = resolve(arg('--root', join(here, '..', '..')));
const outArg = arg('--out', '');
if (!outArg) { console.error('render-grounds: --out <dir> is required'); process.exit(2); }
const out = resolve(outArg);
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('render-grounds: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
const page0 = join(root, 'Spixi/Resources/Raw/html/chat.html');
if (!existsSync(page0)) { console.error('render-grounds: ' + page0 + ' is missing — run node scripts/build-shells.mjs in that tree'); process.exit(2); }
mkdirSync(out, { recursive: true });

const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const DEVICES = {
  desktop: { viewport: { width: 1280, height: 800 }, userAgent: DESK_UA, hasTouch: false, query: '' },
  phone: { viewport: { width: 412, height: 915 }, userAgent: PHONE_UA, hasTouch: true, query: '?mobile=1' },
};
const GROUNDS = [['flat', 'mist'], ['gradient', 'iris'], ['green', 'meadow'], ['blue', 'spixi'], ['aurora', 'aurora'], ['dusk', 'dusk'], ['ocean', 'ocean']];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await pw.chromium.launch();
const errs = [];

async function open(ground, theme, dev, extraCss) {
  const D = DEVICES[dev];
  const ctx = await browser.newContext({ viewport: D.viewport, deviceScaleFactor: 1, userAgent: D.userAgent, hasTouch: D.hasTouch, colorScheme: theme, reducedMotion: 'reduce' });
  await ctx.addInitScript((g) => { try { localStorage.setItem('spixi.chat.ground', g); } catch (e) { /* */ } }, ground);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(ground + '/' + theme + '/' + dev + ': ' + String(e).slice(0, 160)));
  await page.goto(pathToFileURL(page0).href + D.query);
  await sleep(900);
  await page.evaluate((th) => {
    document.documentElement.dataset.theme = th;
    const b64 = (x) => (x == null ? null : btoa(unescape(encodeURIComponent(String(x)))));
    const push = (fn, ...a) => window.executeUiCommand(window[fn], ...a.map(b64));
    const T0 = Math.floor(Date.now() / 1000) - 3600;
    push('onChatScreenReady', 'addrPeer'); push('setChatMode', '0', '0', '', 'False'); push('setCaps', 'reply,edit,voice,media'); push('clearMessages', 'false');
    const them = (i, text, extra) => push('addThem', 't' + i, 'addrPeer', 'Ana', '', text, String(T0 + i * 90), 'True', 'True', 'True', 'False', 'False', '', ...(extra || ['', '', '', '']));
    const me = (i, text) => push('addMe', 'm' + i, 'addrMe', 'Me', '', text, String(T0 + i * 90), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
    them(1, 'Hi! Did the new build reach you?');
    me(2, 'It did. The backgrounds look calmer now.');
    them(3, 'Good. The long one: the quiet colour is the point, so the words stay the loudest thing on the screen even after a few hours of reading.');
    me(4, 'Agreed, and the contours stay faint behind the bubbles.');
    them(5, 'Agreed 👍', ['m4', '', 'Me', 'Agreed, and the contours stay faint behind the bubbles.']);
    me(6, 'See you at six.');
    push('messagesDone'); push('onChatScreenLoaded');
  }, theme);
  await sleep(700);
  if (extraCss) await page.addStyleTag({ content: extraCss });
  await page.evaluate(() => document.fonts.ready);
  await sleep(250);
  return { ctx, page };
}

/* ---- A: 7 appearances × light / dark × desktop / phone ---- */
const written = [];
for (const [g, name] of GROUNDS) for (const theme of ['light', 'dark']) for (const dev of ['desktop', 'phone']) {
  const { ctx, page } = await open(g, theme, dev);
  const file = join(out, name + '-' + theme + '-' + dev + '.png');
  await page.screenshot({ path: file });
  written.push(file);
  await ctx.close();
}

/* ---- B: the three dark Mist grounds side by side (phone size) ---- */
const GROUND_STYLE = (hex) => ":root[data-theme='dark'][data-chat-ground='flat'], :root[data-theme='dark'] [data-chat-ground='flat'] { --gradient-chat: " + hex + " !important; }";
const shots = [];
for (const [label, css] of [['040607', GROUND_STYLE('#040607')], ['07090B', GROUND_STYLE('#07090B')], ['0C0E10', '']]) {
  const { ctx, page } = await open('flat', 'dark', 'phone', css);
  shots.push([label, (await page.screenshot()).toString('base64')]);
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 3 * 412 + 4 * 16, height: 915 + 64 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const html = '<body style="margin:0;background:#222;display:flex;gap:16px;padding:16px;font:14px sans-serif;color:#ddd">' +
    shots.map(([l, b]) => '<figure style="margin:0"><img src="data:image/png;base64,' + b + '" width="412" height="915" style="display:block"><figcaption style="padding-top:6px">dark Mist ground #' + l + '</figcaption></figure>').join('') + '</body>';
  await page.setContent(html);
  const file = join(out, 'mist-dark-grounds-040607-07090B-0C0E10.png');
  await page.screenshot({ path: file });
  written.push(file);
  await ctx.close();
}
await browser.close();
writeFileSync(join(out, 'render-grounds.txt'), 'tree ' + root + '\n' + written.map((f) => f.slice(out.length + 1)).join('\n') + '\npage errors: ' + errs.length + '\n');
console.log('render-grounds: ' + written.length + ' PNGs into ' + out + ' from ' + root + '; page errors ' + errs.length + (errs.length ? ' ' + JSON.stringify(errs.slice(0, 5)) : ''));
