/* ==== fixb4 item 2 · #1748 (3) — THE PROTECT-ACCOUNT STEP UNDER THE KEYBOARD, MEASURED IN CHROMIUM (NOT a pin module, NOT in smoke; by hand) ====
 * What it does: loads the BUILT launch shell (Spixi/Resources/Raw/html/intro.html — scripts/build-shells.mjs `launch`) of TWO trees, BASE and NEW, with an
 * Android phone UA (and, for the "nothing changed" check, an iPhone UA), hasTouch, deviceScaleFactor 1, `--android-inset-top: 24px` / `--android-inset-bottom: 48px`
 * on <html> (the carriers are unresolved in file://), the theme = colorScheme + `data-theme` on <html> (the shell's own head script reads the SL carrier, then
 * localStorage, then the OS scheme). It reaches step 2 (Create, a nickname, Continue) and models the Android keyboard as adjustResize does
 * (docs/android-findings.md:41): the keyboard = page.setViewportSize(height − 323), so the LAYOUT viewport shrinks and visualViewport follows 1 : 1.
 *   S1 = the keyboard is already up from the nickname, then Continue moves the focus to the password (launch-shell.js focus({preventScroll:true}));
 *        the confirm field: the same, then the focus moves to it.
 *   S2 = the field is focused at full height, THEN the viewport shrinks (the keyboard opens on the tap).
 * Sizes 412 × 915 (the Galaxy A52s), 412 × 774 (the device-measured innerHeight of docs/android-findings.md:41, keyboard = 451) and 360 × 640. Pass (NEW, Android UA): the focused field's box (.c-launch__field) is inside the body's rect and above the
 * keyboard top (= the new innerHeight), and the step-2 button is fully above the keyboard top. Nothing else moves: the rects of topbar, progress, footer, button
 * and the document scroll equal BASE within 0.5 px (only .c-launch__body.scrollTop may differ); at full height all equal; an iPhone-UA run equals BASE; and
 * BASE must FAIL S1 at 360 × 640 (the walk's bug reproduced, #294).
 * USAGE: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-fixb4/c-keyboard-render.mjs [--base <html dir>] [--new <html dir>] [--out <dir>] [--break-reveal | --break-ring] [--quick]
 *   --base default /home/claude/scratch/layout-base/html (a copy of Spixi/Resources/Raw/html made BEFORE the change) · --new default this tree's Spixi/Resources/Raw/html
 *   · --out default /home/claude/scratch/renders (PNGs `c-keyboard-<base|new>-<WxH>-<light|dark>-<S1|S2>-<password|confirm>.png`)
 *   · --break-reveal = the deliberate break (#802): the NEW page is copied and the reveal call in apply() is removed → S1 must go red.
 *   --break-ring = the second break: `RING = 4` → 0 in the copy → the field box lands flush with the body edge and the 4 px ring rows go red.
 * Exit 0 = all green; 1 = a row is red. LIMITS: Chromium desktop engine, not the Android WebView; the keyboard is a viewport model (no IME animation, no
 * visual-viewport offset); the carriers are set by hand. The numbers are the proof; the PNGs only show them (the visible area ABOVE the keyboard). */
import { join, dirname, resolve } from 'node:path';
import { mkdirSync, existsSync, cpSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BREAK = process.argv.includes('--break-reveal') || process.argv.includes('--break-ring');
const BREAK_RING = process.argv.includes('--break-ring');
const THEMES = process.argv.includes('--quick') ? ['dark'] : ['light', 'dark'];   // --quick = dark only (the break runs)
const baseDir = resolve(arg('--base', '/home/claude/scratch/layout-base/html'));
let newDir = resolve(arg('--new', join(repo, 'Spixi/Resources/Raw/html')));
const out = resolve(arg('--out', '/home/claude/scratch/renders'));
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('c-keyboard-render: Playwright not found — set PLAYWRIGHT_MODULE'); process.exit(2); }
for (const d of [baseDir, newDir]) if (!existsSync(join(d, 'intro.html'))) { console.error('c-keyboard-render: ' + d + '/intro.html is missing (build-shells first)'); process.exit(2); }
if (BREAK) {
  const tmp = mkdtempSync(join(tmpdir(), 'kbbreak-'));
  cpSync(newDir, tmp, { recursive: true });
  const p = join(tmp, 'intro.html');
  const s = readFileSync(p, 'utf8');
  const t = BREAK_RING ? s.replace('const RING = 4;', 'const RING = 0;') : s.replace(/function apply\(\) \{\s*revealResized\(\);/, 'function apply() {');
  if (t === s) { console.error('c-keyboard-render: --break-reveal found nothing to remove'); process.exit(2); }
  writeFileSync(p, t);
  newDir = tmp;
}
mkdirSync(out, { recursive: true });

const KB = 323;   // the Galaxy A52s keyboard (android-findings.md:41: innerHeight 774 → 451)
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
/* 412 × 774 = the device-measured case: docs/android-findings.md:41 (Damir's Samsung, 2026-08-12, kb-probe on the chat shell, portrait): innerHeight 774 → 451 with
   the keyboard (delta 323, visualViewport 1 : 1). 412 × 915 = the full-height model of the A52s; 360 × 640 = the small phone. */
const SIZES = [[412, 915], [412, 774], [360, 640]];
const RING = 4;   // the focus ring `0 0 0 4px` is part of the field box for the 'inside the body' test
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await pw.chromium.launch();

/* the rects the "nothing else moves" row compares (the visible step-2 pane) */
const MEASURE = () => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; };
  const pane = document.querySelector('.c-launch__step[data-step="2"]');
  const body = pane.querySelector('.c-launch__body');
  const footer = pane.querySelector('.c-launch__footer');
  const a = document.activeElement;
  const inputs = [...pane.querySelectorAll('input')];
  const box = a && a.closest ? (a.closest('.c-launch__field') || a) : null;
  return {
    ih: window.innerHeight, vvh: window.visualViewport ? window.visualViewport.height : null,
    activeIdx: inputs.indexOf(a),
    topbar: R(document.querySelector('.c-launch__form:not([hidden]) .c-topbar') || document.querySelector('.c-topbar')),
    progress: R(document.querySelector('.c-launch__progress')),
    body: R(body), footer: R(footer), button: R(footer.querySelector('button')),
    field: R(box),
    bodyScrollTop: body.scrollTop, bodyScrollMax: body.scrollHeight - body.clientHeight,
    docScroll: (document.scrollingElement || document.documentElement).scrollTop, winY: window.scrollY,
  };
};

async function reach(ctx, dev, W, H, theme, dir) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(pathToFileURL(join(dir, 'intro.html')).href);
  await page.evaluate(([th]) => {
    const s = document.documentElement.style;
    s.setProperty('--android-inset-top', '24px'); s.setProperty('--android-inset-bottom', '48px');
    document.documentElement.dataset.theme = th;
  }, [theme]);
  await sleep(1200);
  await page.evaluate(() => { const b = document.querySelector('.c-launch__ctas button'); b.click(); });
  await sleep(700);
  return { page, errs };
}

/* one scenario → the measurements. S1: keyboard first (focus the nickname, shrink), then Continue; S2: full height, focus the field, then shrink. */
async function run(dir, ua, W, H, theme, scen, field, png) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, userAgent: ua, hasTouch: true, colorScheme: theme, reducedMotion: 'no-preference' });
  const { page, errs } = await reach(ctx, ua, W, H, theme, dir);
  const nick = page.locator('.c-launch__step[data-step="1"] input');
  await nick.click();
  await nick.fill('Alex');
  await sleep(150);
  const rec = {};
  if (scen === 'S1') {
    await page.setViewportSize({ width: W, height: H - KB });   // the keyboard opens on the nickname
    await sleep(500);
  }
  await page.locator('.c-launch__step[data-step="1"] .c-launch__footer button').click();
  await sleep(900);   // step 2 enters (the 480 ms enter animation) and the focus lands on the password
  const inputs = page.locator('.c-launch__step[data-step="2"] input');
  if (scen === 'S1') {
    if (field === 'confirm') { await inputs.nth(1).focus(); await sleep(1800); } else await sleep(1800);
  } else {
    await inputs.nth(field === 'confirm' ? 1 : 0).focus();
    await sleep(500);
    rec.full = await page.evaluate(MEASURE);    // full height, the field focused, no keyboard
    await page.setViewportSize({ width: W, height: H - KB });
    await sleep(1800);
  }
  rec.kb = await page.evaluate(MEASURE);
  if (png) await page.screenshot({ path: join(out, png) });
  rec.errs = errs;
  await ctx.close();
  return rec;
}

const rows = [];
let red = 0;
const row = (ok, text) => { rows.push((ok ? 'ok   ' : 'RED  ') + text); if (!ok) red++; };
const within = (a, b) => (a == null && b == null) || (a && b && ['t', 'b', 'l', 'r'].every((k) => Math.abs(a[k] - b[k]) <= 0.5));
const num = (x) => (x == null ? 'n/a' : Math.round(x * 10) / 10);
const fmt = (m) => 'field ' + (m.field ? num(m.field.t) + '–' + num(m.field.b) : 'n/a') + ' body ' + num(m.body.t) + '–' + num(m.body.b) + ' scrollTop ' + num(m.bodyScrollTop) + '/' + num(m.bodyScrollMax) + ' btn ' + num(m.button.t) + '–' + num(m.button.b) + ' kbTop ' + m.ih;
const STILL = ['topbar', 'progress', 'footer', 'button'];

const base = {}, neu = {};
for (const [W, H] of SIZES) for (const theme of THEMES) for (const scen of ['S1', 'S2']) for (const field of ['password', 'confirm']) {
  const tag = W + 'x' + H + '-' + theme + '-' + scen + '-' + field;
  const png = (which) => 'c-keyboard-' + which + '-' + W + 'x' + H + '-' + theme + '-' + scen + '-' + field + '.png';
  base[tag] = await run(baseDir, ANDROID_UA, W, H, theme, scen, field, png('base'));
  neu[tag] = await run(newDir, ANDROID_UA, W, H, theme, scen, field, png('new'));
}
const ipB = {}, ipN = {};
for (const [W, H] of SIZES) for (const scen of ['S1', 'S2']) for (const field of ['password', 'confirm']) {
  const tag = W + 'x' + H + '-' + scen + '-' + field;
  ipB[tag] = await run(baseDir, IPHONE_UA, W, H, 'dark', scen, field, null);
  ipN[tag] = await run(newDir, IPHONE_UA, W, H, 'dark', scen, field, null);
}
await browser.close();

const inside = (f, b) => f && f.t >= b.t - 0.5 && f.b <= b.b + 0.5;
const insideRing = (f, b) => f && f.t - RING >= b.t - 0.5 && f.b + RING <= b.b + 0.5;   // the box grown by the ring
for (const tag of Object.keys(neu)) {
  const n = neu[tag].kb, b = base[tag].kb;
  const fieldIdx = tag.endsWith('confirm') ? 1 : 0;
  row(n.activeIdx === fieldIdx && insideRing(n.field, n.body) && n.field.b + RING <= n.ih + 0.5 && n.button.b <= n.ih + 0.5 && n.button.t >= 0,
    'NEW  ' + tag + ': the focused field (with its 4 px ring) is inside the body and above the keyboard, the button is above it — ' + fmt(n));
  console.log('base ' + tag + ': ' + fmt(b) + ' (field inside body: ' + !!inside(b.field, b.body) + ')');
  row(STILL.every((k) => within(n[k], b[k])) && within(n.body, b.body) && n.docScroll === b.docScroll && n.winY === b.winY,
    'NEW  ' + tag + ': topbar, progress, body rect, footer, button and the document scroll equal BASE within 0.5 px (only body.scrollTop differs: ' + num(b.bodyScrollTop) + ' → ' + num(n.bodyScrollTop) + ')');
  if (neu[tag].full) {
    const nf = neu[tag].full, bf = base[tag].full;
    row(STILL.concat(['body', 'field']).every((k) => within(nf[k], bf[k])) && nf.bodyScrollTop === bf.bodyScrollTop && nf.docScroll === bf.docScroll,
      'NEW  ' + tag + ': at full height (no keyboard) every rect, body.scrollTop and the document scroll equal BASE (' + num(bf.bodyScrollTop) + ' = ' + num(nf.bodyScrollTop) + ')');
  }
  row(neu[tag].errs.length === 0 && base[tag].errs.length === 0, 'NEW  ' + tag + ': no page error' + (neu[tag].errs.length ? ' ' + JSON.stringify(neu[tag].errs) : ''));
}
for (const tag of Object.keys(ipN)) {
  const n = ipN[tag], b = ipB[tag];
  const same = (x, y) => STILL.concat(['body', 'field']).every((k) => within(x[k], y[k])) && x.bodyScrollTop === y.bodyScrollTop && x.docScroll === y.docScroll && x.winY === y.winY;
  row(same(n.kb, b.kb) && (!n.full || same(n.full, b.full)), 'iPhone UA ' + tag + ': NEW equals BASE (every rect, body.scrollTop ' + num(b.kb.bodyScrollTop) + ' = ' + num(n.kb.bodyScrollTop) + ', the document scroll)');
}
/* the reproduction (#294): BASE must fail S1 and S2 for the PASSWORD at 360 × 640 — the walk's bug (the password field is 334–392 while the body ends at 177). At the
   other sizes the BASE result is PRINTED, not demanded (a plain row: 'BASE fails' or 'BASE holds'): at 412 × 915 only the confirm field is hidden on BASE, and Chromium's own
   focus() scroll brings a field in by itself in some S1 cases, as a real tap does. */
for (const scen of ['S1', 'S2']) {
  const b = base['360x640-dark-' + scen + '-password'].kb;
  row(!(inside(b.field, b.body) && b.field.b <= b.ih + 0.5), 'BASE 360x640 ' + scen + ' password FAILS as the walk saw it (the field is not inside the body above the keyboard) — ' + fmt(b));
}
for (const [W, H] of [[412, 915], [412, 774]]) for (const scen of ['S1', 'S2']) for (const field of ['password', 'confirm']) {
  const b = base[W + 'x' + H + '-dark-' + scen + '-' + field].kb;
  const fails = !(inside(b.field, b.body) && b.field.b <= b.ih + 0.5);
  rows.push('info ' + 'BASE ' + W + 'x' + H + ' ' + scen + ' ' + field + (fails ? ' FAILS' : ' holds') + ' — ' + fmt(b));
}
console.log('\n' + rows.join('\n'));
console.log('\nc-keyboard-render: ' + rows.length + ' rows, ' + red + ' red' + (BREAK ? ' (a --break flag: red is EXPECTED)' : '') + '; PNGs in ' + out);
process.exit(red ? 1 : 0);
