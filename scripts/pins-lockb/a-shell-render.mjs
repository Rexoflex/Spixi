/* ==== lockb · A — the lock shell's HOLD and REVEALED states, MEASURED IN CHROMIUM (NOT a pin module, NOT in smoke; by hand) ====
 * What it does: loads the BUILT lock shell (Spixi/Resources/Raw/html/lock.html) from a file:// copy in the same folder (the C# carriers substituted by hand:
 * LockAuthPending "1", SpixiThemeName light | dark, language en-us, every other carrier "0"), at 412 × 915 with an Android phone UA, hasTouch, deviceScaleFactor 1,
 * colorScheme = the theme. Page time is a Playwright fake clock (page.clock): no real second is waited. The push is `window.setAuthPending(v)` as C# sends it.
 *   HOLD     = carrier "1" + the push 'True' right after boot, then 1 HOUR of page time (review r1 P-M1: the belt of the base would have shown the form at 3 s; a
 *              'True' that kept a belt of 30 s or of 10 min would have shown it long before the measurement)
 *   REVEALED = HOLD, then '1', then 3.1 s of page time (the belt restarts from the '1' and fires)
 * Both states × both themes; the PNGs are `lockb-<hold|revealed>-<light|dark>.png`. THE NUMBERS ARE THE PROOF (the PNGs only show them):
 *   HOLD:     `.c-lock` has NO box (display none, rect 0 × 0) and so has the password input; the `.boot__spinner` layout box (offsetWidth / offsetHeight) is 28 × 28, its
 *             (rotating) rect inside the viewport and its centre = the viewport centre (|Δ| ≤ 1.5 px on both axes; a rotation keeps the centre) — geometry only, no pixel is read.
 *   REVEALED: `.boot` is gone; the `.c-lock` box fills the viewport (left/top 0 ±1, width 412 ±1, height 915 ±1); the password input has a box (> 100 × 20 px), is
 *             inside the viewport, and its computed visibility is visible and display is not none, opacity > 0.
 *   Also: no page error (jsdom-style "canvas not implemented" does not exist here; any pageerror is red).
 * USAGE: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-lockb/a-shell-render.mjs [--html <dir>] [--out <dir>] [--break-hold | --break-belt30]
 *   --html default this tree's Spixi/Resources/Raw/html · --out default /home/claude/scratch/renders-lockb (with a --break-*: .../break, so the break never overwrites the real PNGs)
 *   --break-hold = the deliberate break (#802): the copy of lock.html has the `clearTimeout(beltTimer);` of the push removed ('True' no longer stops the belt) →
 *   the HOLD rows must go red (and exit 1); the REVEALED rows stay green.
 *   --break-belt30 = the reader's break (review r1 P-M1): `beltTimer = pending === '1' ? setTimeout(revealLock, 3000) : 0;` → `beltTimer = setTimeout(revealLock,
 *   pending === '1' ? 3000 : 30000);` (a 'True' keeps a belt of 30 s) → the HOLD rows must go red at the 1 h measurement (they would stay green at 10 s).
 * Exit 0 = all green; 1 = a row is red; 2 = a set-up problem. LIMITS: Chromium desktop engine, not the Android WebView; the clock is Playwright's fake timers (they
 * fake setTimeout / rAF / Date — the page's own load runs on the real clock first); the carriers and the push are set by hand; the safe-area insets are 0 (carriers "0"). */
import { join, dirname, resolve } from 'node:path';
import { mkdirSync, existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BREAK_BELT30 = process.argv.includes('--break-belt30');
const BREAK = process.argv.includes('--break-hold') || BREAK_BELT30;
const htmlDir = resolve(arg('--html', join(repo, 'Spixi/Resources/Raw/html')));
const out = resolve(arg('--out', BREAK ? '/home/claude/scratch/renders-lockb/break' : '/home/claude/scratch/renders-lockb'));
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('a-shell-render: Playwright not found — set PLAYWRIGHT_MODULE'); process.exit(2); }
const lockFile = join(htmlDir, 'lock.html');
if (!existsSync(lockFile)) { console.error('a-shell-render: ' + lockFile + ' is missing (build-shells first)'); process.exit(2); }
mkdirSync(out, { recursive: true });

let built = readFileSync(lockFile, 'utf8');
if (BREAK_BELT30) {
  const a = "beltTimer = pending === '1' ? setTimeout(revealLock, 3000) : 0;";
  if (built.split(a).length !== 2) { console.error('a-shell-render: --break-belt30 found nothing (or more than one place) to change'); process.exit(2); }
  built = built.replace(a, "beltTimer = setTimeout(revealLock, pending === '1' ? 3000 : 30000);");
} else if (BREAK) {
  const a = "        clearTimeout(beltTimer);\n        beltTimer = pending";
  if (built.split(a).length !== 2) { console.error('a-shell-render: --break-hold found nothing (or more than one place) to remove'); process.exit(2); }
  built = built.replace(a, "        beltTimer = pending");
}
const W = 412, H = 915;
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const copies = [];
const browser = await pw.chromium.launch();
const rows = [];
let red = 0;
const row = (good, text) => { rows.push((good ? 'ok   ' : 'RED  ') + text); if (!good) red++; };
const n1 = (x) => Math.round(x * 10) / 10;

const MEASURE = () => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { x: r.left, y: r.top, w: r.width, h: r.height, ow: el.offsetWidth, oh: el.offsetHeight, display: cs.display, visibility: cs.visibility, opacity: cs.opacity }; };
  const lock = document.querySelector('.c-lock');
  const input = document.querySelector('.c-lock input[type="password"], .c-lock input');
  return {
    vw: innerWidth, vh: innerHeight,
    boot: !!document.querySelector('#lock-root .boot'),
    lockHidden: lock ? lock.hidden : null,
    lock: R(lock), input: R(input), spinner: R(document.querySelector('.boot__spinner')),
    theme: document.documentElement.dataset.theme,
  };
};

for (const theme of ['light', 'dark']) {
  const name = 'lock.lockb-render-' + theme + '.html';
  const file = join(htmlDir, name);
  writeFileSync(file, built.replace(/\*SL\{language-code\}/g, 'en-us').replace(/\*SL\{LockAuthPending\}/g, '1')
    .replace(/\*SL\{SpixiThemeName\}/g, theme).replace(/\*SL\{[A-Za-z-]+\}/g, '0'));
  copies.push(file);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, userAgent: ANDROID_UA, hasTouch: true, colorScheme: theme, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.clock.install({ time: 0 });
  await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  await page.clock.runFor(1);   // let the page's own load handler (boot) and the first frame run
  const push = (v) => page.evaluate((x) => window.setAuthPending(x), v);

  /* ---- HOLD ---- */
  await push('True');
  await page.clock.runFor(10000);
  await page.clock.runFor(3590000);   // review r1 P-M1: 1 h of page time in all
  const hold = await page.evaluate(MEASURE);
  await page.screenshot({ path: join(out, 'lockb-hold-' + theme + '.png') });
  const sp = hold.spinner;
  const cx = sp ? sp.x + sp.w / 2 : NaN, cy = sp ? sp.y + sp.h / 2 : NaN;
  row(hold.boot && hold.lockHidden === true && hold.lock && (hold.lock.display === 'none' || (hold.lock.w === 0 && hold.lock.h === 0)),
    `HOLD ${theme}: after 1 h the .c-lock box has no layout (hidden=${hold.lockHidden}, display=${hold.lock && hold.lock.display}, ${hold.lock ? n1(hold.lock.w) + '×' + n1(hold.lock.h) : 'no node'}) and the .boot node is still there`);
  row(hold.input && hold.input.w === 0 && hold.input.h === 0, `HOLD ${theme}: the password input has no box (${hold.input ? n1(hold.input.w) + '×' + n1(hold.input.h) : 'no node'})`);
  row(!!sp && sp.display !== 'none' && sp.visibility === 'visible' && sp.ow === 28 && sp.oh === 28 && sp.x >= 0 && sp.y >= 0 && sp.x + sp.w <= hold.vw && sp.y + sp.h <= hold.vh,
    `HOLD ${theme}: the .boot__spinner box is visible (layout ${sp ? sp.ow + '×' + sp.oh : 'no node'}, its rect while rotating ${sp ? n1(sp.w) + '×' + n1(sp.h) + ' at ' + n1(sp.x) + ',' + n1(sp.y) : 'no node'}) and inside the ${hold.vw}×${hold.vh} viewport`);
  row(Math.abs(cx - hold.vw / 2) <= 1.5 && Math.abs(cy - hold.vh / 2) <= 1.5, `HOLD ${theme}: the spinner is centred (centre ${n1(cx)},${n1(cy)} vs viewport centre ${hold.vw / 2},${hold.vh / 2}, tolerance 1.5 px)`);

  /* ---- REVEALED ---- */
  await push('1');
  await page.clock.runFor(2900);
  const mid = await page.evaluate(MEASURE);
  row(mid.boot && mid.lockHidden === true, `HOLD ${theme}: 2.9 s after the '1' the form is still held (belt not yet fired)`);
  await page.clock.runFor(200);
  const rev = await page.evaluate(MEASURE);
  await page.screenshot({ path: join(out, 'lockb-revealed-' + theme + '.png') });
  const L = rev.lock, I = rev.input;
  row(!rev.boot && rev.lockHidden === false && !!L && L.display !== 'none' && Math.abs(L.x) <= 1 && Math.abs(L.y) <= 1 && Math.abs(L.w - rev.vw) <= 1 && Math.abs(L.h - rev.vh) <= 1,
    `REVEALED ${theme}: the spinner is gone and the .c-lock box fills the viewport (${L ? n1(L.x) + ',' + n1(L.y) + ' ' + n1(L.w) + '×' + n1(L.h) : 'no node'} vs ${rev.vw}×${rev.vh})`);
  row(!!I && I.w > 100 && I.h > 20 && I.display !== 'none' && I.visibility === 'visible' && Number(I.opacity) > 0 && I.x >= 0 && I.y >= 0 && I.x + I.w <= rev.vw && I.y + I.h <= rev.vh,
    `REVEALED ${theme}: the password input has a visible box (${I ? n1(I.w) + '×' + n1(I.h) + ' at ' + n1(I.x) + ',' + n1(I.y) + ', display ' + I.display + ', visibility ' + I.visibility + ', opacity ' + I.opacity : 'no node'}) inside the viewport`);
  /* after the reveal 'True' / '1' never hide it again */
  await push('True'); await push('1'); await page.clock.runFor(10000);
  const again = await page.evaluate(MEASURE);
  row(!again.boot && again.lockHidden === false && again.lock && Math.abs(again.lock.w - again.vw) <= 1 && again.input && again.input.w > 100,
    `REVEALED ${theme}: after 'True' + '1' + 10 s the form is still laid out (${again.lock ? n1(again.lock.w) + '×' + n1(again.lock.h) : 'no node'})`);
  row(errs.length === 0, `${theme}: no page error` + (errs.length ? ' ' + JSON.stringify(errs) : ''));
  await ctx.close();
}
await browser.close();
for (const f of copies) { try { unlinkSync(f); } catch (e) { /* best effort */ } }
console.log(rows.join('\n'));
console.log('\na-shell-render: ' + rows.length + ' rows, ' + red + ' red' + (BREAK ? ' (' + (BREAK_BELT30 ? '--break-belt30' : '--break-hold') + ': red is EXPECTED)' : '') + '; PNGs in ' + out);
process.exit(red ? 1 : 0);
