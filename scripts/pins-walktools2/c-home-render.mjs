/* ==== walktools2 item 3 — THE THREE HOME PROBE POINTS OF scripts/device/a52s.json, READ IN CHROMIUM, LIGHT AND DARK (NOT a pin module, NOT in smoke; by hand) ====
 * What it does: loads the BUILT home shell (Spixi/Resources/Raw/html/index.html — scripts/build-shells.mjs `home`) with an Android phone UA, hasTouch, the phone's
 * viewport (1080 / 2.625 × 2400 / 2.625 CSS px = 411 × 914 whole CSS px, deviceScaleFactor 2.625 → a 1079 × 2399 px picture), `--android-inset-top: 24px` /
 * `--android-inset-bottom: 18.29px` on <html> (the carriers are unresolved in file://; the bottom value = 48 device px / 2.625 = the gesture bar of the phone, fitted so that the
 * current tab's centre lands on `taps.tabChats` of the map (y 2268): the 48 px of the other render tools is a CSS-px value and put the bar 79 device px too high — that gave the first, wrong reading), the theme = colorScheme + the shell's
 * own head script (it reads the SL carrier, then localStorage, then the OS scheme; the tool sets nothing else and checks `data-theme`). It pushes a chat list the
 * way HomePage.xaml.cs does (window.executeUiCommand, every argument base64 of its UTF-8 bytes: setCaps · clearChats · addChat × 6 · clearChatsDone), waits for
 * the screen to settle, takes ONE screenshot per theme, and reads the pixel at each probe point of `screens.home` of scripts/device/a52s.json (the old form
 * `{ probes, minMatch }` or the sets form `{ sets: [ { name, probes, minMatch } ] }`) with the script's own rule (Test-ProbeSetPixels: every channel within
 * `tol`; a set passes when matched >= minMatch). Per point it also names the element under it (elementFromPoint) and its painted background.
 * Pass rule: (1) the LIGHT screen matches the light set (today's values) within their tol — if it does NOT, the dark values must come from the token map instead and
 * the report says so; (2) the DARK screen matches the dark set; (3) the two sets are distinct: the dark screen does not pass the light set and the light screen does
 * not pass the dark set; (4) a note (never red): a dark value that equals a colour of the chat / viewer dark sets of the same file.
 * USAGE: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-walktools2/c-home-render.mjs [--root <tree>] [--map <a52s.json>] [--out <dir>] [--break-dark | --break-light]
 *   --out default /home/claude/scratch/c/work/renders (PNGs `c-home-<light|dark>.png`)
 *   --break-dark  = the deliberate break (#802): the dark set's first two values are swapped in memory → the dark screen must go red.
 *   --break-light = the second break: the light set's second value is replaced by the dark one → the light screen must go red.
 * Exit 0 = all green · 1 = a row is red · 2 = the setup cannot prove it (no Playwright, no shell, no screens.home, theme not applied, a probe point outside the picture).
 * LIMITS: the Chromium desktop engine, not the Android WebView (colour management, font and icon raster differ; a flat fill reads the same, an anti-aliased edge may not);
 * the carriers are set by hand and the pushes are made by hand in C#'s order, not by C#; the picture is 1079 × 2399, not 1080 × 2400; the chat rows are invented
 * (the phone shows its own seed). The numbers are the proof of the TOKEN MAP; nothing here was seen on the phone. */
import { join, dirname, resolve } from 'node:path';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BREAK_DARK = process.argv.includes('--break-dark');
const BREAK_LIGHT = process.argv.includes('--break-light');
const root = resolve(arg('--root', join(here, '..', '..')));
const mapPath = resolve(arg('--map', join(root, 'scripts/device/a52s.json')));
const out = resolve(arg('--out', '/home/claude/scratch/c/work/renders'));
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('c-home-render: Playwright not found — set PLAYWRIGHT_MODULE'); process.exit(2); }
const pageFile = join(root, 'Spixi/Resources/Raw/html/index.html');
if (!existsSync(pageFile)) { console.error('c-home-render: ' + pageFile + ' is missing (build-shells first)'); process.exit(2); }
mkdirSync(out, { recursive: true });

const map = JSON.parse(readFileSync(mapPath, 'utf8'));
const home = map.screens && map.screens.home;
if (!home) { console.error('c-home-render: screens.home is missing in ' + mapPath); process.exit(2); }
/* both forms: the old form is ONE set called 'light' here (today's home is light only) */
const sets = home.sets ? home.sets.map((s) => ({ name: s.name, minMatch: s.minMatch, probes: s.probes.map((p) => ({ ...p })) }))
  : [{ name: 'light', minMatch: home.minMatch, probes: home.probes.map((p) => ({ ...p })) }];
const setOf = (n) => sets.find((s) => s.name === n);
if (BREAK_DARK) {
  const d = setOf('dark');
  if (!d) { console.error('c-home-render: --break-dark needs a dark set'); process.exit(2); }
  const t = d.probes[0].rgb; d.probes[0].rgb = d.probes[1].rgb; d.probes[1].rgb = t;
}
if (BREAK_LIGHT) {
  const l = setOf('light'), d = setOf('dark');
  if (!l || !d) { console.error('c-home-render: --break-light needs both sets'); process.exit(2); }
  l.probes[1].rgb = d.probes[1].rgb;
}

const DPR = 2.625;
const VW = Math.round(map.device.width / DPR), VH = Math.round(map.device.height / DPR);   // 411 × 914
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const near = (a, b, tol) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
const rows = [];
let red = 0, setup = 0;
const row = (okk, text) => { rows.push((okk ? 'ok   ' : 'RED  ') + text); if (!okk) red++; };
const note = (text) => rows.push('note ' + text);

const CHATS = [   // wallet, from, timestamp (s), avatar, online, excerpt, type, unread, kind, mention, excerptKind, excerptSender, reaction
  ['4AbCdEfGhJkLmNpQrStUvWxYz23456789aBcDeFg', 'Ana Kovac', '1700000000', '', 'true', 'See you at the walk tomorrow', 'text', '2', '', 'False', '', '', 'False'],
  ['4BcDeFgHjKlMnPqRsTuVwXyZ34567892bCdEfGhJ', 'Marko', '1699990000', '', 'false', 'Photo', 'text', '0', '', 'False', '', '', 'False'],
  ['4CdEfGhJkLmNpQrStUvWxYz45678923cDeFgHjKl', 'Seed 01', '1699980000', '', 'false', 'Seed message 12', 'text', '0', '', 'False', '', '', 'False'],
  ['4DeFgHjKlMnPqRsTuVwXyZ56789234dEfGhJkLmN', 'Weekend group', '1699970000', '', 'false', 'Luka: lunch at one?', 'text', '5', 'group', 'False', '', '', 'False'],
  ['4EfGhJkLmNpQrStUvWxYz67892345eFgHjKlMnPq', 'Petra', '1699960000', '', 'true', 'Thanks', 'text', '0', '', 'False', '', '', 'False'],
  ['4FgHjKlMnPqRsTuVwXyZ78923456fGhJkLmNpQrS', 'Ivan', '1699950000', '', 'false', 'OK', 'text', '0', '', 'False', '', '', 'False'],
];

const browser = await pw.chromium.launch();
const readPicture = async (b64, pts) => {   // the pixels of a PNG, by a canvas in a blank page (no PNG decoder in node)
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  const r = await p.evaluate(async ([data, points]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, px: points.map(([x, y]) => (x < img.width && y < img.height ? [...g.getImageData(x, y, 1, 1).data].slice(0, 3) : null)) };
  }, [b64, pts]);
  await ctx.close();
  return r;
};

const allPts = [];
for (const s of sets) for (const p of s.probes) if (!allPts.some((q) => q[0] === p.x && q[1] === p.y)) allPts.push([p.x, p.y]);
const ptIdx = (p) => allPts.findIndex((q) => q[0] === p.x && q[1] === p.y);

async function shoot(theme) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, userAgent: ANDROID_UA, hasTouch: true, colorScheme: theme, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(pathToFileURL(pageFile).href);
  await page.evaluate(() => { const s = document.documentElement.style; s.setProperty('--android-inset-top', '24px'); s.setProperty('--android-inset-bottom', '18.29px'); });
  await sleep(1200);
  await page.evaluate((chats) => {
    const b64 = (x) => btoa(unescape(encodeURIComponent(String(x))));
    const push = (fn, ...a) => window.executeUiCommand(window[fn], ...a.map(b64));
    push('setCaps', 'composeSend,hints,updateHelp,hintHelp');
    push('clearChats');
    for (const c of chats) push('addChat', ...c);
    push('clearChatsDone');
  }, CHATS);
  await sleep(2500);
  const info = await page.evaluate(([pts, dpr]) => {
    const de = document.documentElement;
    const nav = document.querySelector('.c-bottomnav__item[aria-current]');
    const nr = nav ? nav.getBoundingClientRect() : null;
    const nm = (el) => (el ? el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') : '');
    const bg = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return { el: e, c }; } return { el: null, c: '' }; };
    const els = pts.map(([x, y]) => {
      const e = document.elementFromPoint(x / dpr, y / dpr);
      const pill = e && e.classList && e.classList.contains('c-bottomnav__item') ? getComputedStyle(e, '::before').backgroundColor : '';
      const b = bg(e);
      return { under: nm(e), paints: nm(b.el), css: pill ? pill + ' (::before pill)' : b.c };
    });
    const f = document.getElementById('fab'); const fr = f && f.getBoundingClientRect();
    return {
      theme: de.getAttribute('data-theme'), dpr: devicePixelRatio, iw: innerWidth, ih: innerHeight,
      navCurrent: nr ? { l: nr.left * dpr, r: nr.right * dpr, t: nr.top * dpr, b: nr.bottom * dpr, label: nav.textContent.trim() } : null,
      row1: (() => { const r0 = document.querySelector('[class*="chatlist-item"]'); const r = r0 && r0.getBoundingClientRect(); return r ? { t: r.top * dpr, b: r.bottom * dpr } : null; })(),
      chatRows: document.querySelectorAll('[class*="chatlist-item"]').length,
      fab: fr ? { l: fr.left * dpr, r: fr.right * dpr, t: fr.top * dpr, b: fr.bottom * dpr } : null,
      els,
    };
  }, [allPts, DPR]);
  const png = join(out, 'c-home-' + theme + '.png');
  const buf = await page.screenshot({ path: png });
  const pic = await readPicture(buf.toString('base64'), allPts);
  await ctx.close();
  return { info, pic, errs, png };
}

const shots = {};
for (const theme of ['light', 'dark']) shots[theme] = await shoot(theme);
await browser.close();

for (const theme of ['light', 'dark']) {
  const s = shots[theme];
  if (s.info.theme !== theme) { console.log('c-home-render: SETUP — the ' + theme + ' run has data-theme=' + s.info.theme); setup++; }
  if (s.pic.px.some((p) => p === null)) { console.log('c-home-render: SETUP — a probe point lies outside the ' + s.pic.w + ' × ' + s.pic.h + ' picture'); setup++; }
  if (s.errs.length) rows.push('note page errors (' + theme + '): ' + s.errs.join(' | '));
}
if (setup) { console.log(rows.join('\n')); process.exit(2); }

const R0 = (v) => (v == null ? 'n/a' : Math.round(v));
rows.push('setup viewport ' + VW + ' × ' + VH + ' CSS px @ ' + DPR + ' → picture ' + shots.light.pic.w + ' × ' + shots.light.pic.h + ' px · chat rows light ' + shots.light.info.chatRows + ' dark ' + shots.dark.info.chatRows);
for (const th of ['light', 'dark']) {
  const i = shots[th].info, n = i.navCurrent, f = i.fab;
  rows.push('setup ' + th + ': data-theme=' + i.theme + ' · current tab "' + (n && n.label) + '" px x ' + (n && R0(n.l) + '–' + R0(n.r)) + ' y ' + (n && R0(n.t) + '–' + R0(n.b)) + ' · fab px x ' + (f && R0(f.l) + '–' + R0(f.r)) + ' y ' + (f && R0(f.t) + '–' + R0(f.b)));
}

{   // the setup must put the screen where the phone has it: the current tab's centre on the map's tabChats tap (±25 px)
  const n = shots.light.info.navCurrent, tap = map.taps && map.taps.tabChats;
  const cy = n ? (n.t + n.b) / 2 : null;
  rows.push('setup current tab centre y ' + R0(cy) + ' px vs taps.tabChats y ' + (tap && tap.y) + ' · chat row 1 centre y ' + R0(shots.light.info.row1 && (shots.light.info.row1.t + shots.light.info.row1.b) / 2) + ' px vs taps.chatRow1 y ' + (map.taps && map.taps.chatRow1.y) + ' (note: the phone\'s own rows differ)');
  if (!tap || cy === null || Math.abs(cy - tap.y) > 25) { console.log(rows.join('\n')); console.log('c-home-render: SETUP — the current tab is not where the phone has it'); process.exit(2); }
}
const reading = (theme, p) => shots[theme].pic.px[ptIdx(p)];
const verdict = (theme, set) => {   // the script's rule (Test-ProbeSetPixels)
  let m = 0;
  const detail = set.probes.map((p) => { const c = reading(theme, p); const hit = near(c, hexRgb(p.rgb), p.tol); if (hit) m++; return { p, c, hit }; });
  return { m, of: set.probes.length, ok: m >= set.minMatch, detail };
};
for (const theme of ['light', 'dark']) {
  const set = setOf(theme);
  if (!set) { row(false, theme + ' screen: no ' + theme + ' set in the map'); continue; }
  const v = verdict(theme, set);
  for (const d of v.detail) {
    const u = shots[theme].info.els[ptIdx(d.p)];
    rows.push('     ' + theme + ' (' + d.p.x + ',' + d.p.y + ') read ' + hex(d.c) + ' want ' + d.p.rgb.toUpperCase() + ' tol ' + d.p.tol + ' ' + (d.hit ? 'match' : 'MISS') + ' · under ' + u.under + ' · paints ' + u.paints + ' ' + u.css);
  }
  row(v.ok, theme + ' screen matches the ' + theme + ' set: ' + v.m + ' of ' + v.of + ' (minMatch ' + set.minMatch + ')' + (theme === 'light' ? ' — today\'s values reproduced' : ''));
}
/* the two sets must be distinct */
const l = setOf('light'), d = setOf('dark');
if (l && d) {
  const dOnL = verdict('dark', l), lOnD = verdict('light', d);
  row(!dOnL.ok, 'the DARK screen does not pass the LIGHT set: ' + dOnL.m + ' of ' + dOnL.of + ' (minMatch ' + l.minMatch + ')');
  row(!lOnD.ok, 'the LIGHT screen does not pass the DARK set: ' + lOnD.m + ' of ' + lOnD.of + ' (minMatch ' + d.minMatch + ')');
  l.probes.forEach((p, k) => { const q = d.probes[k]; note('point ' + (k + 1) + ' (' + p.x + ',' + p.y + '): light ' + p.rgb + ' vs dark ' + q.rgb + (near(hexRgb(p.rgb), hexRgb(q.rgb), Math.max(p.tol, q.tol)) ? ' — within tol of each other here (not a theme witness)' : ' — apart')); });
}
/* note: a dark value that is within tol of a colour of the chat / viewer dark sets */
if (d) for (const name of ['chat', 'viewer']) {
  const sc = map.screens[name]; const ds = sc && sc.sets && sc.sets.find((s) => s.name === 'dark');
  if (!ds) continue;
  for (const p of d.probes) for (const q of ds.probes) if (near(hexRgb(p.rgb), hexRgb(q.rgb), Math.max(p.tol, q.tol))) note('home dark ' + p.rgb + ' at (' + p.x + ',' + p.y + ') is within tol of the ' + name + ' dark ' + q.rgb + ' at (' + q.x + ',' + q.y + ')');
}
console.log(rows.join('\n'));
console.log(red ? 'c-home-render: ' + red + ' row(s) RED' : 'c-home-render: all green');
process.exit(red ? 1 : 0);
