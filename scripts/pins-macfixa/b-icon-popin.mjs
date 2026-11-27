/* ==== macfixa item 2 — THE APPS TAB'S ICON POP-IN, MEASURED IN CHROMIUM: 240 KB ICONS vs 144 px COPIES (NOT a pin module, NOT in smoke; by hand) ====
 * Note: the numbers in DECISIONS #2081 were measured with 144 px copies; C# now tries 192 px first (same 22,482-byte cap).
 * The question (part 1 of n-20261015-icon-popin-resume-flash): when the Apps tab opens, is every icon painted in the first
 * frame that shows the tiles? And does the small copy that C# now pushes (packet P122) change that?
 * What it does: loads the BUILT home shell (Spixi/Resources/Raw/html/index.html) with an Android phone UA, hasTouch, a
 * 411 × 914 viewport at deviceScaleFactor 2.625, and pushes the way HomePage.xaml.cs does (window.executeUiCommand, every
 * argument base64 of its UTF-8 bytes): setCaps, a chats list, then the apps burst — clearApps · addApp × N · clearAppsDone,
 * each as its own call. Two icon sets, made here in code (a PNG encoder over node:zlib; N different pictures):
 *   BIG   = 512 × 512 RGBA, tuned to about 240 KB each (today's push: the package's own icon.png)
 *   SMALL = the same pictures at 144 px, at most 22,482 bytes each (the cap of AppIconRules; if one is bigger the size steps
 *           144 → 120 → 96 → 72 → 48 are walked like C# does, and the step is printed)
 * Two orders, as C# has them:
 *   prepushed = the burst lands while Chats is the current tab (HomePage's pre-push, 2 s after the start); 800 ms later the
 *               user taps Apps and C# pushes nothing more;
 *   onentry   = the user taps Apps first; the burst lands right after the tap (a tab entry before the pre-push ran).
 * Measured per run, from the tap (a touch tap on the Apps nav item):
 *   tiles    = when the tiles were painted: the Element Timing `renderTime` of the last app NAME (text: no decode). The harness
 *              tags each `.c-app-item__name` and each `.c-app-icon__img` with `elementtiming` when the shell makes it; the
 *              shell is not changed;
 *   painted  = per icon, its `renderTime` — the frame the picture was really painted in (if an entry is missing, the time
 *              `img.decode()` resolved is the stand-in and the row says so);
 *   late     = the last icon's paint minus the tiles' paint, in ms and in frames of the run's own frame interval
 *              (0 = every icon was painted in the frame that painted the tiles);
 *   loaded   = how many icons were `complete` at the first requestAnimationFrame that saw all N tiles;
 *   decode   = in a blank page, `new Image().decode()` per icon (ms), for both sets.
 * Rows: the two sets × the two orders × CPU throttle 1× and 4× (CDP Emulation.setCPUThrottlingRate), --runs each (default 5,
 * a fresh browser context per run); the median and the worst are printed, and one screenshot of the first tiles frame's
 * successor per row.
 * USAGE: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-macfixa/b-icon-popin.mjs
 *   [--root <tree>] [--apps 8] [--runs 5] [--out <dir>] [--what-if eager|sync|both] [--break-same]
 *   --what-if   = a question, NOT the shipped shell: when the shell makes an icon <img> (it sets loading=lazy and
 *                 decoding=async, src/components/apps-icon.js), the harness's observer sets loading=eager (eager), decoding=sync
 *                 (sync) or both on it. It shows what is left of the pop-in when the picture is small AND loaded early.
 *   --break-same = the harness's own check (#802): the SMALL set is pushed with the BIG pictures → its rows must read like
 *                 the BIG rows (the tool tells the two sets apart only by the pictures; exit 1 when it does not).
 * Exit 0 = measured (this tool has no pass rule of its own: it prints numbers) · 2 = the setup cannot measure (no Playwright,
 * no shell, the tab did not open, no icon was painted).
 * LIMITS: the Chromium desktop engine with a throttled CPU, not the Android WebView and not WKWebView (image decode threads,
 * raster and the GPU process differ); headless frames are not a phone's vsync; the pushes are made by hand in C#'s order, not
 * by C#; the SMALL pictures are made at 144 px here, not scaled by a platform decoder; a cold start's other work (chats,
 * wallet) is not running. The numbers say what the engine does with the two sizes; nothing here was seen on a device. */
import { join, dirname, resolve } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { deflateSync, crc32 as zcrc32 } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const root = resolve(arg('--root', join(here, '..', '..')));
const N = Number(arg('--apps', '8')), RUNS = Number(arg('--runs', '5'));
const out = resolve(arg('--out', '/home/claude/scratch/renders-b'));
const BREAK = process.argv.includes('--break-same');
const WHATIF = arg('--what-if', '');
if (!['', 'eager', 'sync', 'both'].includes(WHATIF)) { console.error('b-icon-popin: --what-if eager|sync|both'); process.exit(2); }
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('b-icon-popin: Playwright not found — set PLAYWRIGHT_MODULE'); process.exit(2); }
const pageFile = join(root, 'Spixi/Resources/Raw/html/index.html');
if (!existsSync(pageFile)) { console.error('b-icon-popin: ' + pageFile + ' is missing (build-shells first)'); process.exit(2); }
mkdirSync(out, { recursive: true });

/* ── the pictures: a PNG encoder (RGBA, filter 0) ── */
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { if (typeof zcrc32 === 'function') return zcrc32(buf) >>> 0; let c = 0xFFFFFFFF; for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
/* a rounded tile with a two-colour ramp, a disc, and noise of `amp` levels on a share `p` of the pixels (the size dial) */
function png(side, seed, p, amp) {
  const r = rng(seed * 7919 + 13), noise = rng(seed * 104729 + side);
  const c1 = [r() * 255, r() * 255, r() * 255], c2 = [r() * 255, r() * 255, r() * 255];
  const rawBuf = Buffer.alloc(side * (side * 4 + 1));
  const rad = side * 0.22, cx = side * (0.35 + r() * 0.3), cy = side * (0.35 + r() * 0.3), disc = side * 0.2;
  for (let y = 0; y < side; y++) {
    const row = y * (side * 4 + 1);
    rawBuf[row] = 0;
    for (let x = 0; x < side; x++) {
      const dx = Math.max(rad - x, x - (side - 1 - rad), 0), dy = Math.max(rad - y, y - (side - 1 - rad), 0);
      const inside = dx * dx + dy * dy <= rad * rad;
      const t = (x + y) / (2 * side), on = Math.hypot(x - cx, y - cy) < disc;
      const o = row + 1 + x * 4;
      const n = noise() < p ? (noise() - 0.5) * amp : 0;
      for (let k = 0; k < 3; k++) rawBuf[o + k] = Math.max(0, Math.min(255, Math.round((on ? 255 - c1[k] : c1[k] + (c2[k] - c1[k]) * t) + n)));
      rawBuf[o + 3] = inside ? 255 : 0;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(side, 0); ihdr.writeUInt32BE(side, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rawBuf, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
/* the share of noisy pixels that gives about `target` bytes at 512 px (bisection on the first picture) */
function tune(target) { let lo = 0, hi = 1; for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (png(512, 1, mid, 48).length < target) lo = mid; else hi = mid; } return (lo + hi) / 2; }
const P = tune(240 * 1024);
const MAX_COPY = 22482, STEPS = [144, 120, 96, 72, 48];
const big = [], small = [], smallSteps = [];
for (let i = 1; i <= N; i++) {
  big.push(png(512, i, P, 48));
  let made = null, used = 0;
  for (const s of STEPS) { const c = png(s, i, P, 48); if (c.length <= MAX_COPY) { made = c; used = s; break; } }
  if (!made) { console.error('b-icon-popin: picture ' + i + ' does not fit the cap at 48 px'); process.exit(2); }
  small.push(made); smallSteps.push(used);
}
const uri = (b) => 'data:image/png;base64,' + b.toString('base64');
const SETS = { BIG: big.map(uri), SMALL: (BREAK ? big : small).map(uri) };
const kb = (a) => (a.reduce((n, b) => n + b.length, 0) / a.length / 1024).toFixed(1);
console.log('pictures: ' + N + ' · BIG 512 px avg ' + kb(big) + ' KB (data URI ' + Math.round(SETS.BIG[0].length / 1000) + ' k chars) · SMALL steps ' + [...new Set(smallSteps)].join('/') + ' px avg ' + kb(small) + ' KB, max ' + Math.max(...small.map((b) => b.length)) + ' B (data URI max ' + Math.max(...small.map((b) => uri(b).length)) + ' chars)' + (BREAK ? ' · --break-same: SMALL = the BIG pictures' : '') + (WHATIF ? ' · --what-if ' + WHATIF + ': NOT the shipped shell' : ''));

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };
const browser = await pw.chromium.launch();

/* ── decode: a blank page, one fresh Image per picture ── */
async function decodeMs(uris, rate) {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const ms = await page.evaluate(async (list) => { const r = []; for (const u of list) { const img = new Image(); const t0 = performance.now(); img.src = u; await img.decode(); r.push(performance.now() - t0); } return r; }, uris);
  await ctx.close();
  return ms;
}

const CHATS = [
  ['4AbCdEfGhJkLmNpQrStUvWxYz23456789aBcDeFg', 'Ana Kovac', '1700000000', '', 'true', 'See you tomorrow', 'text', '2', '', 'False', '', '', 'False'],
  ['4BcDeFgHjKlMnPqRsTuVwXyZ34567892bCdEfGhJ', 'Marko', '1699990000', '', 'false', 'Photo', 'text', '0', '', 'False', '', '', 'False'],
];

async function run(setName, order, rate, shot) {
  const ctx = await browser.newContext({ viewport: { width: 411, height: 914 }, deviceScaleFactor: 2.625, userAgent: ANDROID_UA, hasTouch: true, colorScheme: 'light', reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.addInitScript((whatIf) => {
    window.__icon = { painted: [], decoded: [], frames: [], t0: 0 };
    const tag = (n) => {
      if (n.nodeType !== 1) return;
      const l = n.matches && n.matches('img.c-app-icon__img') ? [n] : (n.querySelectorAll ? [...n.querySelectorAll('img.c-app-icon__img')] : []);
      for (const img of l) {
        if (img.hasAttribute('elementtiming')) continue;
        img.setAttribute('elementtiming', 'app-icon');
        if (whatIf === 'eager' || whatIf === 'both') img.loading = 'eager';
        if (whatIf === 'sync' || whatIf === 'both') img.decoding = 'sync';
      }
      const names = n.matches && n.matches('.c-app-item__name') ? [n] : (n.querySelectorAll ? [...n.querySelectorAll('.c-app-item__name')] : []);
      for (const nm of names) if (!nm.hasAttribute('elementtiming')) nm.setAttribute('elementtiming', 'app-name');
    };
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) tag(n); }).observe(document, { childList: true, subtree: true });
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__icon.painted.push({ id: e.identifier, t: e.renderTime || e.loadTime }); }).observe({ type: 'element', buffered: true }); } catch (e) { window.__icon.noElementTiming = true; }
  }, WHATIF);
  await page.goto(pathToFileURL(pageFile).href);
  await page.evaluate(() => { const s = document.documentElement.style; s.setProperty('--android-inset-top', '24px'); s.setProperty('--android-inset-bottom', '18.29px'); });
  await sleep(1200);
  await page.evaluate((chats) => {
    const b64 = (x) => btoa(unescape(encodeURIComponent(String(x))));
    window.__push = (fn, ...a) => window.executeUiCommand(window[fn], ...a.map(b64));
    window.__push('setCaps', 'composeSend,hints,updateHelp,hintHelp');
    window.__push('clearChats');
    for (const c of chats) window.__push('addChat', ...c);
    window.__push('clearChatsDone');
  }, CHATS);
  await sleep(700);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const icons = SETS[setName];
  const burst = async () => {   // each push its own evaluate, like C#'s one EvaluateJavaScript per command
    await page.evaluate(() => window.__push('clearApps'));
    for (let i = 0; i < icons.length; i++) await page.evaluate(([i, u]) => window.__push('addApp', 'com.example.app' + i, 'App ' + (i + 1), u, 'Publisher', 'True', 'False'), [i, icons[i]]);
    await page.evaluate(() => window.__push('clearAppsDone'));
  };
  if (order === 'prepushed') { await burst(); await sleep(800); }
  /* the frame log starts in the task of the tap */
  await page.evaluate((n) => {
    const I = window.__icon;
    const visibleTiles = () => [...document.querySelectorAll('.c-app-icon')].filter((e) => e.getClientRects().length > 0);
    const arm = () => {
      I.t0 = performance.now();
      let f = 0, tilesAt = -1, watched = new Set();
      const tick = (ts) => {
        f++;
        const tiles = visibleTiles();
        const imgs = tiles.map((t) => t.querySelector('img')).filter(Boolean);
        for (const img of imgs) if (!watched.has(img)) { watched.add(img); img.decode().then(() => I.decoded.push(performance.now()), () => I.decoded.push(-1)); }
        if (tilesAt < 0 && tiles.length >= n) tilesAt = f;
        I.frames.push({ f, ts, now: performance.now(), tiles: tiles.length, imgs: imgs.length, complete: imgs.filter((i) => i.complete && i.naturalWidth > 0).length });
        if (f < 240 && !(tilesAt > 0 && f > tilesAt + 40)) requestAnimationFrame(tick);
        else I.done = true;
      };
      requestAnimationFrame(tick);
    };
    const btn = document.querySelector('.c-bottomnav__item[data-id="apps"]');
    if (btn) btn.addEventListener('click', arm, { once: true, capture: true });
    I.hasBtn = !!btn;
  }, icons.length);
  const btn = page.locator('.c-bottomnav__item[data-id="apps"]');
  await btn.tap();
  if (order === 'onentry') await burst();
  await page.waitForFunction(() => window.__icon.done === true, null, { timeout: 30000 }).catch(() => {});
  if (shot) await page.screenshot({ path: join(out, 'b-icon-popin-' + setName.toLowerCase() + '-' + order + '-' + rate + 'x.png') });
  const I = await page.evaluate(() => window.__icon);
  await ctx.close();
  const first = I.frames.find((x) => x.tiles >= icons.length);
  if (!I.hasBtn || !first) return { bad: 'the Apps tab did not show ' + icons.length + ' tiles (frames ' + I.frames.length + ', errors ' + errs.join(' | ') + ')' };
  const paints = I.painted.filter((p) => p.id === 'app-icon' && p.t >= I.t0).map((p) => p.t);
  const names = I.painted.filter((p) => p.id === 'app-name' && p.t >= I.t0).map((p) => p.t);
  const decodes = I.decoded.filter((t) => t > 0);
  const last = paints.length >= icons.length ? Math.max(...paints) : (decodes.length >= icons.length ? Math.max(...decodes) : NaN);
  /* the frame the tiles were painted in = the paint time of the last app NAME (text, no decode); the icons are late by the
     time between it and the last icon's paint, in frames of this run's own frame interval */
  const tilesPaint = names.length >= icons.length ? Math.max(...names) : NaN;
  const deltas = I.frames.slice(1).map((x, i) => x.ts - I.frames[i].ts);
  const frameMs = med(deltas) || 16.7;
  const lateMs = last - tilesPaint;
  return {
    tilesMs: tilesPaint - I.t0, tilesFrame: first.f, lastMs: last - I.t0, lateMs, late: Number.isNaN(lateMs) ? NaN : Math.max(0, Math.round(lateMs / frameMs)), frameMs,
    source: paints.length >= icons.length ? 'renderTime' : decodes.length >= icons.length ? 'decode()' : 'none', paints: paints.length,
    completeAtFirst: first.complete, errs,
  };
}

let setup = 0;
const table = [];
for (const rate of [1, 4]) {
  for (const setName of ['BIG', 'SMALL']) {
    const d = [];
    for (let i = 0; i < 3; i++) d.push(...await decodeMs(SETS[setName], rate));
    table.push({ row: 'decode ' + setName + ' ' + rate + 'x', text: 'img.decode() per icon: median ' + med(d).toFixed(1) + ' ms · worst ' + Math.max(...d).toFixed(1) + ' ms · all ' + N + ' in a row about ' + (d.reduce((a, b) => a + b, 0) / 3).toFixed(0) + ' ms' });
  }
}
const summary = {};
for (const rate of [1, 4]) {
  for (const order of ['prepushed', 'onentry']) {
    for (const setName of ['BIG', 'SMALL']) {
      const rs = [];
      for (let i = 0; i < RUNS; i++) {
        const r = await run(setName, order, rate, i === 0);
        if (r.bad) { console.error('b-icon-popin: ' + setName + ' ' + order + ' ' + rate + 'x: ' + r.bad); setup++; continue; }
        rs.push(r);
      }
      if (!rs.length) continue;
      const late = rs.map((r) => r.late).filter((v) => !Number.isNaN(v));
      const key = setName + ' ' + order + ' ' + rate + 'x';
      summary[key] = { late: med(late), lastMs: med(rs.map((r) => r.lastMs)) };
      table.push({
        row: key,
        text: 'tiles (the names) painted ' + med(rs.map((r) => r.tilesMs)).toFixed(0) + ' ms after the tap · icons loaded at the first tiles rAF: median ' + med(rs.map((r) => r.completeAtFirst)) + ' of ' + N
          + ' · last icon painted ' + med(rs.map((r) => r.lastMs)).toFixed(0) + ' ms after the tap (worst ' + Math.max(...rs.map((r) => r.lastMs)).toFixed(0) + ') = ' + (late.length ? med(rs.map((r) => r.lateMs)).toFixed(0) + ' ms = ' + med(late) + ' frames after the tiles (worst ' + Math.max(...late) + '; runs with 0: ' + late.filter((v) => v === 0).length + ' of ' + rs.length + ')' : 'not measured')
          + ' · by ' + [...new Set(rs.map((r) => r.source))].join('/') + (rs.some((r) => r.errs.length) ? ' · page errors: ' + rs.flatMap((r) => r.errs).slice(0, 2).join(' | ') : ''),
      });
    }
  }
}
await browser.close();
console.log('\n' + table.map((t) => t.row.padEnd(26) + t.text).join('\n'));
if (setup) { console.log('\nb-icon-popin: ' + setup + ' run(s) could not measure'); process.exit(2); }
if (BREAK) {
  const same = Object.keys(summary).filter((k) => k.startsWith('SMALL')).every((k) => { const b = summary[k.replace('SMALL', 'BIG')]; return b && Math.abs(summary[k].lastMs - b.lastMs) <= Math.max(20, b.lastMs * 0.5); });
  console.log('\n--break-same: the SMALL rows ' + (same ? 'read like the BIG rows (the tool tells the sets apart only by the pictures)' : 'DIFFER from the BIG rows although the pictures are the same — the tool is not reliable'));
  process.exit(same ? 0 : 1);
}
console.log('\nmeasured (no pass rule: the numbers are the answer; LIMITS in the header)');
