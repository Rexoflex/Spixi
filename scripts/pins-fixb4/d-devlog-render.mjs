/* ==== fixb4 item 6 — THE DEVELOPER LOG OF HALF A ROW, MEASURED IN CHROMIUM (NOT a pin module, NOT in smoke; by hand) ====
 * What it does: loads the BUILT Spixi/Resources/Raw/html/dev.html of TWO trees, BASE and NEW, with an Android UA at 412 × 915 and 360 × 640 and a Windows UA at
 * 1280 × 800 (`data-desktop` is set by the shell's own head script from the UA: no Android / iPhone / iPad / Mobile and no touch-Mac → desktop), light and dark
 * (colorScheme + `data-theme` on <html>). After load it pushes through window.executeUiCommand in the order and encoding DevPage.xaml.cs onLoad uses (every
 * argument base64 of its UTF-8 bytes, UiCommandText.build): setCaps sendlog · setFlashDev · setContainerDev (Android only: pushContainerDev is #if ANDROID) ·
 * the setFlagsDev* pushes (setFlagsDev, S20, S20G, V1, Safety) · setCaps devmoments · setLog(600 lines).
 * Measures: rows = (log clientHeight − vertical padding) / line height; scrollHeight > clientHeight; a written scrollTop sticks; the body's children (class +
 * height, in order) outside the log are the same in BASE and NEW; with ONLY setCaps + setLog (no cards) the log height equals BASE within 0.5 px.
 * Pass (NEW): rows ≥ 15 at every size and theme, the log scrolls; BASE must show rows < 1 (the bug reproduced, #294) on the phones and the 1280 × 800 desktop.
 * USAGE: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-fixb4/d-devlog-render.mjs [--base <html dir>] [--new <html dir>] [--out <dir>] [--break-floor]
 *   --base default /home/claude/scratch/layout-base/html · --new default this tree's Spixi/Resources/Raw/html · --out default /home/claude/scratch/renders
 *   (PNGs `d-devlog-<base|new>-<android412x915|android360x640|windows1280x800>-<light|dark>.png`) · --break-floor = the deliberate break (#802): the NEW page is
 *   copied and its floor `min-height: 60vh` on the log rule is put back to `min-height: 0` → the rows must fall below 1 and the script go red.
 * Exit 0 = all green; 1 = a row is red. LIMITS: Chromium desktop engine, not the Android / Windows WebView; the pushes are made by hand in C#'s order, not by C#;
 * the body's insets are the carriers set by hand (24 / 48 px on Android). The numbers are the proof; the PNGs only show them. */
import { join, dirname, resolve } from 'node:path';
import { mkdirSync, existsSync, cpSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BREAK = process.argv.includes('--break-floor');
const baseDir = resolve(arg('--base', '/home/claude/scratch/layout-base/html'));
let newDir = resolve(arg('--new', join(repo, 'Spixi/Resources/Raw/html')));
const out = resolve(arg('--out', '/home/claude/scratch/renders'));
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('d-devlog-render: Playwright not found — set PLAYWRIGHT_MODULE'); process.exit(2); }
for (const d of [baseDir, newDir]) if (!existsSync(join(d, 'dev.html'))) { console.error('d-devlog-render: ' + d + '/dev.html is missing (build-shells first)'); process.exit(2); }
if (BREAK) {
  const tmp = mkdtempSync(join(tmpdir(), 'devbreak-'));
  cpSync(newDir, tmp, { recursive: true });
  const p = join(tmp, 'dev.html');
  const s = readFileSync(p, 'utf8');
  const t = s.replace(/(\.c-settings-dev__log\.u-scroll\s*\{[^}]*?)min-height:\s*60vh/, '$1min-height: 0');
  if (t === s) { console.error('d-devlog-render: --break-floor found nothing to put back'); process.exit(2); }
  writeFileSync(p, t);
  newDir = tmp;
}
mkdirSync(out, { recursive: true });

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const DEVICES = [
  { id: 'android412x915', ua: ANDROID_UA, w: 412, h: 915, touch: true, android: true },
  { id: 'android360x640', ua: ANDROID_UA, w: 360, h: 640, touch: true, android: true },
  { id: 'windows1280x800', ua: WIN_UA, w: 1280, h: 800, touch: false, android: false },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await pw.chromium.launch();

async function open(dir, dev, theme, cards) {
  const ctx = await browser.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: 1, userAgent: dev.ua, hasTouch: dev.touch, colorScheme: theme, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(pathToFileURL(join(dir, 'dev.html')).href);
  await page.evaluate(([th, android]) => {
    document.documentElement.dataset.theme = th;
    if (android) { const s = document.documentElement.style; s.setProperty('--android-inset-top', '24px'); s.setProperty('--android-inset-bottom', '48px'); }
  }, [theme, dev.android]);
  await sleep(800);
  await page.evaluate(([cardsOn, android]) => {
    const b64 = (x) => btoa(unescape(encodeURIComponent(String(x))));
    const push = (fn, ...a) => window.executeUiCommand(window[fn], ...a.map(b64));
    push('setCaps', 'sendlog');
    if (cardsOn) {
      push('setFlashDev', '1,1,1');
      if (android) push('setContainerDev', 'clip');          // DevPage.pushContainerDev is #if ANDROID
      push('setFlagsDev', '1,1,1,1');
      push('setFlagsDevS20', '1'); push('setFlagsDevS20G', '1'); push('setFlagsDevV1', '1,1'); push('setFlagsDevSafety', '1,1,1,1,1,1');
      push('setCaps', 'devmoments');
    }
    const lines = [];
    for (let i = 1; i <= 600; i++) lines.push('2026-11-22 12:' + String(Math.floor(i / 60) % 60).padStart(2, '0') + ':' + String(i % 60).padStart(2, '0') + '.' + String(100 + (i % 900)) + ' [INFO] line ' + i + ' of the Ixian log');
    push('setLog', lines.join('\n'));
  }, [cards, dev.android]);
  await sleep(500);
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, errs };
}

const MEASURE = () => {
  const log = document.querySelector('.c-settings-dev__log');
  const body = document.querySelector('.c-settings__body');
  const cs = getComputedStyle(log);
  const lh = parseFloat(cs.lineHeight);
  const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const kids = [...body.children].filter((c) => c !== log).map((c) => c.className.split(' ')[0] + ':' + Math.round(c.getBoundingClientRect().height * 10) / 10);
  const before = log.scrollTop;
  log.scrollTop = 40; const moved = log.scrollTop;
  log.scrollTop = before;
  return {
    desktop: document.documentElement.hasAttribute('data-desktop'),
    isLog: log.tagName === 'PRE' && log.classList.contains('u-scroll'),
    clientH: log.clientHeight, scrollH: log.scrollHeight, boxH: log.getBoundingClientRect().height, lh, pad,
    rows: (log.clientHeight - pad) / lh, scrolls: log.scrollHeight > log.clientHeight && moved === 40,
    bodyClient: body.clientHeight, bodyScroll: body.scrollHeight, kids, cards: document.querySelectorAll('.c-settings__body > .c-dev-flash, .c-settings__body > .c-dev-container, .c-settings__body > .c-settings__card').length,
    hidden: log.hidden,
  };
};

const rows = [];
let red = 0;
const row = (ok, text) => { rows.push((ok ? 'ok   ' : 'RED  ') + text); if (!ok) red++; };
const r1 = (x) => Math.round(x * 100) / 100;
const res = {};
for (const dev of DEVICES) for (const theme of ['light', 'dark']) {
  const key = dev.id + '-' + theme;
  res[key] = {};
  for (const [which, dir] of [['base', baseDir], ['new', newDir]]) {
    const o = await open(dir, dev, theme, true);
    const m = await o.page.evaluate(MEASURE);
    // scroll the log to the top for the picture, then to its end as the shell leaves it
    await o.page.evaluate(() => { const b = document.querySelector('.c-settings__body'); const l = document.querySelector('.c-settings-dev__log'); b.scrollTop = Math.max(0, l.offsetTop - 80); });
    await sleep(150);
    await o.page.screenshot({ path: join(out, 'd-devlog-' + which + '-' + key + '.png') });
    m.errs = o.errs; res[key][which] = m;
    await o.ctx.close();
    const o2 = await open(dir, dev, theme, false);   // setCaps + setLog only: no cards
    res[key][which + 'Only'] = (await o2.page.evaluate(MEASURE));
    await o2.ctx.close();
  }
}
await browser.close();

for (const key of Object.keys(res)) {
  const { base, new: n, baseOnly, newOnly } = res[key];
  console.log(key + ': BASE log client ' + r1(base.clientH) + ' px = ' + r1(base.rows) + ' rows (line ' + base.lh + ', pad ' + base.pad + ', body ' + base.bodyClient + '/' + base.bodyScroll + ', cards ' + base.cards + ') · NEW ' + r1(n.clientH) + ' px = ' + r1(n.rows) + ' rows (body ' + n.bodyClient + '/' + n.bodyScroll + ')');
  row(n.rows >= 15 && n.scrollH > n.clientH && n.scrolls && n.bodyScroll > n.bodyClient && n.isLog && !n.hidden, 'NEW  ' + key + ': ' + r1(n.rows) + ' rows (≥ 15), the log scrolls (scrollHeight ' + n.scrollH + ' > ' + n.clientH + ', a written scrollTop sticks) and the body scrolls to it (' + n.bodyScroll + ' > ' + n.bodyClient + ')');
  row(base.rows < 1, 'BASE ' + key + ': ' + r1(base.rows) + ' rows (< 1: the bug reproduced)');
  row(JSON.stringify(base.kids) === JSON.stringify(n.kids), 'NEW  ' + key + ': the cards keep their order and size (' + n.kids.length + ' children besides the log, heights equal BASE)');
  row(Math.abs(baseOnly.boxH - newOnly.boxH) <= 0.5, 'NEW  ' + key + ': with setLog only (no cards) the log height equals BASE (' + r1(baseOnly.boxH) + ' → ' + r1(newOnly.boxH) + ')');
  row(base.errs.length === 0 && n.errs.length === 0, 'NEW  ' + key + ': no page error');
}
for (const dev of DEVICES) { const m = res[dev.id + '-light'].new; row(m.desktop === !dev.android, dev.id + ': data-desktop is ' + m.desktop + ' (the UA decides)'); }
console.log('\n' + rows.join('\n'));
console.log('\nd-devlog-render: ' + rows.length + ' rows, ' + red + ' red' + (BREAK ? ' (--break-floor: red is EXPECTED)' : '') + '; PNGs in ' + out);
process.exit(red ? 1 : 0);
