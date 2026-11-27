/* ==== macfixa item 3 — "the first tap is lost after a pin / mute swipe", IN A REAL CHROMIUM TOUCH PIPELINE (NOT a pin module, NOT in smoke; by hand) ====
 * What it does: loads the BUILT home shell (Spixi/Resources/Raw/html/index.html) in /usr/bin/google-chrome through Playwright with an
 * Android phone context (411 × 914 CSS px, deviceScaleFactor 2.625, isMobile, hasTouch, an Android UA), pushes 24 chats the way
 * HomePage.xaml.cs does (setCaps · clearChats · addChat × 24 · clearChatsDone; the list scrolls), and drives REAL touch input through
 * CDP Input.dispatchTouchEvent with timed moves (one move every ~8 ms, released at speed). After the gesture it gives ONE tap
 * (touchStart + touchEnd, 40 ms) on a target (a bottom-nav tab, a chats chip or the FAB) and records, in the page, with passive
 * capture listeners only: pointer*, touch* (with defaultPrevented of each touchmove), click (and its target) and every scroll event
 * (the list and the document, with scrollTop).
 * Gestures: `diag` = a row flick 200 px sideways (toward Pin) and 25 px down in 10 moves (a commit: past 40 % of the row) ·
 * `diag120` = 120 px sideways, 20 px down (settles open, no action) · `roll` = the finger rolls down first (2 moves mostly down,
 * inside the 8 px lock) then 200 px sideways · `hold` = `diag`, then the finger stays still ~200 ms before the lift (no release
 * speed, so no fling) · `vfling` = a vertical flick on a row (the calibration: the list scrolls and flings) · `navside` = the
 * `diag` flick across the bottom nav (touch-action auto) · `acc10` … `acc40` = from rest, speeding up (steps 2, 2, 2, 2.2, 3, 5,
 * 9 … px every ~8 ms) at 10–40° below the horizontal · `slow20` = 7 px slowly at ~20°, then fast sideways · `none` = the tap alone · `synth` (only with --only) =
 * Input.synthesizeScrollGesture (it scrolled nothing in this pipeline).
 * Each gesture runs with the cap OFF (today) and with the cap ON. The cap ON needs the home shell to hand the cap to the list:
 * the tool copies the built html to a temp folder and adds the lead's one line (`swipeTouchLock: () => bridge.cap('swipeTouchLock')`
 * in the chats `capabilities` literal) when the built page does not hold it yet; setCaps then carries `,swipeTouchLock`. The temp
 * page also sends its ixian: commands into a list (createNativeBridge's injectable sink): no C# cancels the navigation here, and a
 * pending one stalls the CDP touch input.
 * Rows: per gesture × cap × target (chip / nav / fab) × delay (the tap 60 / 250 / 600 ms after the release; --delays a,b,…): CLICK or
 * LOST (a click after the tap's pointerdown on the target), the list's scrollTop before / at release / after the tap, scroll
 * events in the gesture / after it, a real pointercancel, touchmoves prevented / total, the row's pinned / muted marks.
 * RESULT 2026-11-27 (--quick --delays 60,250, chip): cap OFF, every swipe gesture (`diag`, `diag120`, `roll`, `acc10`–`acc40`,
 * `slow20`) loses the tap (LOST) with NO scroll event and no pointercancel; `hold`, `navside`, `none`: CLICK. Cap ON: every swipe
 * gesture CLICK with all its touchmoves prevented, at the default slop AND at `--slop 8`; `vfling` still scrolls (48 → ~355).
 * A tree without the decide-by-distance line (`--root` on it) loses `acc20`–`acc40` ON at `--slop 8`. At `--slop 6` `slow20` ON is still
 * LOST (a slop under the 8 px lock is not covered). The base build loses the tap the same way, with and without the cap.
 * USAGE: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-macfixa/c-swipe-touch.mjs
 *   [--root <tree>] [--quick] [--only <gesture,…>] [--delays <ms,…>] [--slop <css px>] [--break-lock]
 *   --slop = Chromium's --touch-slop-distance (Android's default slop is 8 dp; the desktop default is larger, ~10 px, so without it
 *   the slow and angled gestures cross the slop with |dx| already ≥ 8).
 *   --quick = the chip target and the 60 ms delay only. --break-lock = the deliberate break (#802): the temp bundle's touchmove
 *   listener is made passive → with the cap ON the swipe touchmoves are NOT prevented (0 / 10) and the tap is LOST again.
 * Exit 0 = the run finished (the table is the result; this tool reports, it does not judge the Android WebView); 2 = setup.
 * LIMITS: desktop Chromium (headless shell of google-chrome), not the Android WebView: its gesture detector, touch slop, fling curve
 * and tap suppression after a fling are Chromium's defaults, not the A52s's; CDP touch events enter the browser input pipeline (the
 * gesture recogniser and the touch-action filter run), but the timing is the tool's, not a finger's; the chats are invented. */
import { join, resolve, dirname } from 'node:path';
import { existsSync, cpSync, readFileSync, writeFileSync, mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const QUICK = process.argv.includes('--quick');
const BREAK = process.argv.includes('--break-lock');
const root = resolve(arg('--root', join(here, '..', '..')));
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('c-swipe-touch: Playwright not found — set PLAYWRIGHT_MODULE'); process.exit(2); }
const srcDir = join(root, 'Spixi/Resources/Raw/html');
if (!existsSync(join(srcDir, 'index.html'))) { console.error('c-swipe-touch: ' + srcDir + '/index.html is missing (build-shells first)'); process.exit(2); }

/* the temp copy: the lead's cap line (if the build does not hold it) and, for --break-lock, a passive touch lock */
const tmp = mkdtempSync(join(tmpdir(), 'cswipe-'));
cpSync(realpathSync(srcDir), tmp, { recursive: true });
const CAPS_OLD = 'capabilities: { pin: true, mute: true, favorites: true, delete: true },';
const LEAD_LINE = "capabilities: { pin: true, mute: true, favorites: true, delete: true, swipeTouchLock: () => bridge.cap('swipeTouchLock') },";
{
  const p = join(tmp, 'index.html');
  let s = readFileSync(p, 'utf8');
  if (!s.includes("swipeTouchLock")) {
    if (s.split(CAPS_OLD).length !== 2) { console.error('c-swipe-touch: SETUP — the chats capabilities literal is not found once in index.html'); process.exit(2); }
    s = s.replace(CAPS_OLD, LEAD_LINE);
    console.log('setup the lead line was added to the temp copy of index.html');
  } else console.log('setup the built index.html already passes swipeTouchLock');
  /* C# cancels every ixian: navigation; Chromium has no one to cancel it, and a pending one stalls the CDP touch input.
     The temp page sends into a list instead (createNativeBridge's own injectable sink). */
  const BR = 'const bridge = createNativeBridge();';
  if (s.split(BR).length !== 2) { console.error('c-swipe-touch: SETUP — createNativeBridge() is not found once in index.html'); process.exit(2); }
  s = s.replace(BR, 'const bridge = createNativeBridge({ emit: (c) => { (window.__sent = window.__sent || []).push(c); } });');
  writeFileSync(p, s);
  if (BREAK) {
    const b = join(tmp, 'spixi.bundle.js');
    const t = readFileSync(b, 'utf8');
    const u = t.replace(/(if \(dragging && horiz && e\.cancelable && lockCap\(\)\) e\.preventDefault\(\);\s*\}, \{ passive: )false/, '$1true');
    if (u === t) { console.error('c-swipe-touch: SETUP — --break-lock found no touch lock in spixi.bundle.js'); process.exit(2); }
    writeFileSync(b, u);
    console.log('setup BREAK: the touch lock listener is passive in the temp bundle');
  }
}
const pageFile = join(tmp, 'index.html');

const DPR = 2.625, VW = 411, VH = 914;
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; SM-A528B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dbg = (m) => { if (process.env.CSWIPE_DEBUG) console.error('dbg ' + m); };
const TS = Math.floor(Date.now() / 1000);
const NAMES = ['Ana Kovac', 'Marko', 'Seed 01', 'Weekend group', 'Petra', 'Ivan', 'Luka', 'Mojca', 'Jure', 'Tina', 'Nina', 'Rok', 'Eva', 'Matej', 'Sara', 'Blaz', 'Zala', 'Gal', 'Neza', 'Tim', 'Lara', 'Jan', 'Pia', 'Vid'];
const CHATS = NAMES.map((n, i) => ['4' + String(i).padStart(2, '0') + 'AbCdEfGhJkLmNpQrStUvWxYz23456789aBcDe', n, String(TS - i * 900), '', 'false', 'Message ' + i, 'text', '0', '', 'False', '', '', 'False']);

const SLOP = arg('--slop', '');
const browser = await pw.chromium.launch({ args: SLOP ? ['--touch-slop-distance=' + SLOP] : [], executablePath: existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined });

async function scenario({ gesture, cap, target, delay }) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, userAgent: ANDROID_UA, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
  page.on('dialog', (d) => { dbg('dialog ' + d.message()); d.dismiss().catch(() => {}); });
  page.on('framenavigated', (f) => dbg('nav ' + f.url().slice(0, 80)));
  dbg('goto ' + gesture + ' ' + cap);
  await page.goto(pathToFileURL(pageFile).href);
  dbg('loaded');
  await page.evaluate(() => { const s = document.documentElement.style; s.setProperty('--android-inset-top', '24px'); s.setProperty('--android-inset-bottom', '18.29px'); });
  await sleep(1000);
  await page.evaluate(([chats, capOn]) => {
    const b64 = (x) => btoa(unescape(encodeURIComponent(String(x))));
    const push = (fn, ...a) => window.executeUiCommand(window[fn], ...a.map(b64));
    push('setCaps', 'composeSend,hints,updateHelp,hintHelp' + (capOn ? ',swipeTouchLock' : ''));
    push('clearChats');
    for (const c of chats) push('addChat', ...c);
    push('clearChatsDone');
  }, [CHATS, cap]);
  await sleep(1500);
  /* the recorder: passive capture listeners only (a non-passive one would change the touch path it measures) */
  const geo = await page.evaluate(([target]) => {
    const L = window.__rec = [];
    const t0 = performance.now();
    const sc = document.getElementById('chat-scroll');
    const nm = (el) => (el && el.nodeType === 1 ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '') : String(el && el.nodeName));
    const at = () => Math.round(performance.now() - t0);
    for (const ty of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'touchcancel', 'click']) {
      document.addEventListener(ty, (e) => L.push({ t: at(), ty, tg: nm(e.target), real: e.isTrusted, probe: !!(e.target.closest && e.target.closest('[data-probe]')) }), { capture: true, passive: true });
    }
    window.addEventListener('touchmove', (e) => L.push({ t: at(), ty: 'touchmove', dp: e.defaultPrevented, c: e.cancelable }), { passive: true });   // bubble end: sees the row's preventDefault
    document.addEventListener('scroll', (e) => L.push({ t: at(), ty: 'scroll', tg: nm(e.target), top: sc ? Math.round(sc.scrollTop) : null }), { capture: true, passive: true });
    if (sc && sc.scrollHeight - sc.clientHeight > 600) sc.scrollTop = 48;   // room to scroll both ways (the chips stay on screen)
    const rows = Array.from(document.querySelectorAll('.c-swipe')).filter((x) => { const b = x.getBoundingClientRect(); return b.top > 250 && b.bottom < innerHeight - 150; });
    const r = rows[1] && rows[1].getBoundingClientRect();
    let tEl = null;
    if (target === 'nav') tEl = Array.from(document.querySelectorAll('.c-bottomnav__item')).find((x) => !x.hasAttribute('aria-current'));
    else if (target === 'fab') tEl = document.getElementById('fab');
    else if (target === 'chip') tEl = document.querySelector('#chat-scroll .c-chip, .c-chats-header .c-chip, [role="tab"].c-chip');
    if (tEl) tEl.dataset.probe = '';
    const tr = tEl && tEl.getBoundingClientRect();
    return {
      rows: rows.length, row: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width } : null,
      rowAddr: rows[1] ? (rows[1].querySelector('[data-address]') || {}).dataset?.address || '' : '',
      tap: tr && tEl.contains(document.elementFromPoint(tr.left + tr.width / 2, tr.top + tr.height / 2)) ? { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2, name: nm(tEl) } : null,
      scroll: sc ? { top: sc.scrollTop, max: sc.scrollHeight - sc.clientHeight } : null,
      navY: (() => { const n = document.querySelector('.c-bottomnav'); const b = n && n.getBoundingClientRect(); return b ? b.top + b.height / 2 : 0; })(),
    };
  }, [target]);
  if (!geo.row || !geo.tap || !geo.scroll || geo.scroll.max < 200) { await ctx.close(); return { setup: 'no row / no tap target / list does not scroll: ' + JSON.stringify(geo) + ' ' + errs.join(' | ') }; }
  await sleep(200);
  dbg('geo ' + JSON.stringify(geo));
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 })) });
  const marks = async () => page.evaluate((addr) => { const el = document.querySelector('[data-address="' + addr + '"]'); return el ? (('pinned' in el.dataset) ? 'P' : '-') + (('muted' in el.dataset) ? 'M' : '-') : '?'; }, geo.rowAddr);
  const mark0 = await marks();
  const top0 = await page.evaluate(() => document.getElementById('chat-scroll').scrollTop);
  const x0 = geo.row.x, y0 = gesture === 'navside' ? geo.navY : geo.row.y;
  const path = [];
  if (gesture === 'diag' || gesture === 'navside' || gesture === 'hold') for (let i = 1; i <= 10; i++) path.push([x0 - 20 * i, y0 + 2.5 * i]);
  else if (gesture === 'diag120') for (let i = 1; i <= 10; i++) path.push([x0 - 12 * i, y0 + 2 * i]);
  else if (gesture === 'roll') { path.push([x0 - 1, y0 + 4], [x0 - 2, y0 + 7]); for (let i = 1; i <= 10; i++) path.push([x0 - 2 - 20 * i, y0 + 7 + 2 * i]); }
  else if (gesture === 'slow20') { for (let i = 1; i <= 7; i++) path.push([x0 - i, y0 + 0.4 * i]); for (let i = 1; i <= 10; i++) path.push([x0 - 7 - 20 * i, y0 + 3 + 2 * i]); }
  else if (gesture.startsWith('acc')) {   // from rest, speeding up, at the angle in the name (degrees below the horizontal)
    const th = Number(gesture.slice(3)) * Math.PI / 180;
    let r = 0;
    for (const st of [2, 2, 2, 2.2, 3, 5, 9, 15, 22, 30, 35, 40]) { r += st; path.push([x0 - r * Math.cos(th), y0 + r * Math.sin(th)]); }
  }
  else if (gesture === 'none') path.length = 0;
  else if (gesture === 'vfling') for (let i = 1; i <= 10; i++) path.push([x0 + 1 * i, y0 - 30 * i]);
  const pageT0 = await page.evaluate(() => window.__rec.length);
  let relAt = null;
  if (gesture === 'synth') {
    await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(x0), y: Math.round(y0), yDistance: -500, speed: 3000, gestureSourceType: 'touch', preventFling: false });
    relAt = await page.evaluate(() => window.__rec.length);
  } else if (gesture === 'none') {
    relAt = pageT0;
  } else {
    await touch('touchStart', [[x0, y0]]);
    for (const p of path) { await sleep(8); await touch('touchMove', [p]); }
    if (gesture === 'hold') { const q = path[path.length - 1]; for (let i = 0; i < 12; i++) { await sleep(16); await touch('touchMove', [q]); } }   // still, then lift: no release speed
    await touch('touchEnd', []);
    relAt = await page.evaluate(() => window.__rec.length);
  }
  dbg('gesture done');
  const topRel = await page.evaluate(() => document.getElementById('chat-scroll').scrollTop);
  await sleep(delay);
  await touch('touchStart', [[geo.tap.x, geo.tap.y]]);
  await sleep(40);
  await touch('touchEnd', []);
  await sleep(450);
  const topLate = await page.evaluate(() => document.getElementById('chat-scroll').scrollTop);
  const rec = await page.evaluate(() => window.__rec);
  const mark1 = await marks();
  await ctx.close();
  const g = rec.slice(pageT0, relAt), after = rec.slice(relAt);
  dbg('after ' + JSON.stringify(after.filter((e) => e.ty !== 'scroll')));
  const tapDown = after.findIndex((e) => e.ty === 'pointerdown');
  return {
    /* a click after the tap's pointerdown (the chip row is rebuilt on a press, so its click can land on the header) */
    clicked: tapDown >= 0 && after.slice(tapDown).some((e) => e.ty === 'click' && e.real) && after[tapDown].probe,
    tapSeen: tapDown >= 0,
    scrollG: g.filter((e) => e.ty === 'scroll').length,
    scrollAfter: after.filter((e) => e.ty === 'scroll').length,
    cancel: g.some((e) => e.ty === 'pointercancel' && e.real) || after.slice(0, Math.max(tapDown, 0)).some((e) => e.ty === 'pointercancel' && e.real),
    tmoves: g.filter((e) => e.ty === 'touchmove').length,
    prevented: g.filter((e) => e.ty === 'touchmove' && e.dp).length,
    tops: [Math.round(top0), Math.round(topRel), Math.round(topLate)],
    fired: mark0 + '→' + mark1,
    tapName: geo.tap.name, errs,
  };
}

const GESTURES = arg('--only', '') ? arg('--only', '').split(',') : ['diag', 'diag120', 'roll', 'acc10', 'acc20', 'acc30', 'acc40', 'slow20', 'hold', 'vfling', 'navside', 'none'];
const TARGETS = QUICK ? ['chip'] : ['chip', 'nav', 'fab'];
const DELAYS = arg('--delays', '') ? arg('--delays', '').split(',').map(Number) : QUICK ? [60] : [60, 250, 600];
console.log('slop ' + (SLOP ? '--touch-slop-distance=' + SLOP : 'Chromium default'));
console.log('gesture  cap  target delay | clicked tapSeen | list top before/release/+450ms | scroll ev in-gesture/after | pcancel | touchmoves prevented/total | row marks');
let setupFail = 0;
const sum = {};
for (const gesture of GESTURES) for (const cap of [false, true]) for (const target of TARGETS) for (const delay of DELAYS) {
  const r = await scenario({ gesture, cap, target, delay });
  if (r.setup) { console.log('SETUP ' + gesture + ' ' + r.setup); setupFail++; continue; }
  const k = gesture + (cap ? ' ON ' : ' off');
  sum[k] = sum[k] || { n: 0, lost: 0 };
  sum[k].n++; if (!r.clicked) sum[k].lost++;
  console.log([gesture.padEnd(8), cap ? 'ON ' : 'off', target.padEnd(5), String(delay).padStart(4), '|', r.clicked ? 'CLICK ' : 'LOST  ', r.tapSeen ? 'yes' : 'NO ', '|', r.tops.join('/').padEnd(14), '|', r.scrollG + '/' + r.scrollAfter, '|', r.cancel ? 'yes' : 'no ', '|', r.prevented + '/' + r.tmoves, '|', r.fired, r.errs.length ? ' errs: ' + r.errs.join(' | ') : ''].join(' '));
}
await browser.close();
console.log('\nsummary (lost first taps / runs):');
for (const [k, v] of Object.entries(sum)) console.log('  ' + k.padEnd(12) + ' ' + v.lost + ' / ' + v.n);
process.exit(setupFail ? 2 : 0);
