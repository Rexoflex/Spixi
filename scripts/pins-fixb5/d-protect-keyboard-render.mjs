/* ==== #1837 — THE PASSWORD STEP WITH THE KEYBOARD UP, MEASURED IN CHROMIUM (NOT a pin module, NOT in smoke; by hand) ====
 * What it does: loads the BUILT launch shell (intro.html) of TWO trees, BASE and NEW, with an Android phone UA, hasTouch,
 * deviceScaleFactor 1, `--android-inset-top: 24px` / `--android-inset-bottom: 48px` on <html> (the carriers are unresolved in
 * file://) and the theme as colorScheme + `data-theme`. It reaches step 2 (Create, a nickname, Continue) and models the
 * Android keyboard as adjustResize does (docs/android-findings.md:41; pins-fixb4/c-keyboard-render.mjs): the keyboard =
 * page.setViewportSize(height − 323), so the layout viewport shrinks and visualViewport follows 1 : 1.
 *   S1 = the keyboard is up from the nickname, Continue moves the focus to the password; "confirm" = then the keyboard's
 *        Next (Enter on the password) moves it to the confirm field.
 *   S2 = the field is focused at full height, THEN the viewport shrinks (the keyboard opens on the tap).
 * Sizes 360 × 640, 412 × 774 (the device-measured innerHeight), 412 × 915; light and dark.
 * The keyboard top is innerHeight − the bottom inset (48): under AND-45 (MainActivity.cs) the root view pads only
 *   ime − navBar, so the WebView's bottom nav-bar strip lies BEHIND the keyboard.
 * Pass (NEW, Android UA): the password field, the confirm field AND the step's button are fully inside the visible area
 *   above that keyboard top (the fields and their 4 px rings inside the body's rect), the element at the centre of each
 *   is that element (not covered), the button is not hidden, the photo is hidden and the title is 20 px; the focus is on
 *   the expected field (for "confirm": moved there by an Enter on the password).
 * TALL row: a 350 px keyboard at 360 × 640 (the pair does not fit), focus on the confirm field → that field is inside the
 *   body and above the keyboard. iOS row: iPhone UA at 375 × 667 with __setKbInset(260): Enter on the password → the
 *   confirm field is focused and inside the body.
 * TAP rows (360 × 640, 412 × 774, keyboard up, both passwords typed): a touchscreen tap on the button submits ("Creating
 *   your account…") on NEW as on BASE, a tap on the first eye shows the password on NEW (BASE printed: its first field
 *   can be scrolled out); the state stays on until the click.
 * BASE must FAIL at 360 × 640 (the walk's bug: one field shows). Without a keyboard NEW equals BASE (every rect within
 *   0.5 px) for the Android UA, an iPhone UA and a Windows WebView2 UA (1280 × 800, the desktop layout).
 * USAGE: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-fixb5/d-protect-keyboard-render.mjs
 *   [--base <html dir>] [--new <html dir>] [--out <dir>] [--break-compact | --break-hold] [--quick]
 *   --base default /home/claude/scratch/layout-base/html (the built html of the base) · --new default this tree's
 *   Spixi/Resources/Raw/html · --out default /home/claude/scratch/renders (PNGs `d-protect-<base|new>-<WxH>-<theme>-<S1|S2>-<field>.png`)
 *   · --break-compact = the deliberate break (#802): the NEW page is copied and the data-kb toggle in kbState removed → red.
 *   · (the TALL and iOS rows: break the fit check / the iOS revealFocused() in a copy of the built page, by hand)
 *   · --break-hold = the second break: `hold` forced false (the state drops when a tap focuses the button) → the TAP rows red.
 *   · --quick = dark only.
 * Exit 0 = all green; 1 = a row is red. LIMITS: Chromium desktop engine, not the Android WebView; the keyboard is a viewport
 * model (no IME animation); the carriers are set by hand; the Next key is modelled as an Enter keypress (the IME action of a
 * real Android keyboard is Chromium's own focus advance, not exercised here). The numbers are the proof; the PNGs show the visible area above the keyboard. */
import { join, resolve } from 'node:path';
import { mkdirSync, existsSync, cpSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BREAK_HOLD = process.argv.includes('--break-hold');
const BREAK = process.argv.includes('--break-compact') || BREAK_HOLD;
const THEMES = process.argv.includes('--quick') ? ['dark'] : ['light', 'dark'];
const baseDir = resolve(arg('--base', '/home/claude/scratch/layout-base/html'));
let newDir = resolve(arg('--new', join(repo, 'Spixi/Resources/Raw/html')));
const out = resolve(arg('--out', '/home/claude/scratch/renders'));
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('d-protect-keyboard-render: Playwright not found — set PLAYWRIGHT_MODULE'); process.exit(2); }
for (const d of [baseDir, newDir]) if (!existsSync(join(d, 'intro.html'))) { console.error('d-protect-keyboard-render: ' + d + '/intro.html is missing'); process.exit(2); }
if (BREAK) {
  const tmp = mkdtempSync(join(tmpdir(), 'kbcompact-'));
  cpSync(newDir, tmp, { recursive: true });
  const p = join(tmp, 'intro.html');
  const s = readFileSync(p, 'utf8');
  const t = BREAK_HOLD ? s.replace('const hold = was && !!a && (a === document.body || el.contains(a));', 'const hold = false;')
    : s.replace("if (was !== on) el.toggleAttribute('data-kb', on);", '');
  if (t === s) { console.error('d-protect-keyboard-render: --break-compact found nothing to change'); process.exit(2); }
  writeFileSync(p, t);
  newDir = tmp;
}
mkdirSync(out, { recursive: true });

const KB = 323;
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0';
const SIZES = [[360, 640], [412, 774], [412, 915]];
const INSET_B = 48;   // --android-inset-bottom: the 3-button nav bar
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await pw.chromium.launch();

const MEASURE = () => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; };
  const pane = document.querySelector('.c-launch__step[data-step="2"]');
  const body = pane.querySelector('.c-launch__body');
  const btn = pane.querySelector('.c-launch__footer button');
  const fields = [...pane.querySelectorAll('.c-launch__field')];
  const inputs = [...pane.querySelectorAll('.c-lock__input')];
  const hit = (el) => { const r = el.getBoundingClientRect(); const x = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return !!x && (x === el || el.contains(x)); };
  const photo = pane.querySelector('.c-launch__photo');
  const title = pane.querySelector('.c-launch__hero-title');
  return {
    ih: window.innerHeight, kb: document.querySelector('.c-launch').hasAttribute('data-kb'),
    activeIdx: inputs.indexOf(document.activeElement),
    topbar: R(document.querySelector('.c-launch__form:not([hidden]) .c-topbar')), progress: R(document.querySelector('.c-launch__progress')),
    body: R(body), f1: R(fields[0]), f2: R(fields[1]), button: R(btn), title: R(title),
    hitF1: hit(fields[0]), hitF2: hit(fields[1]), hitBtn: hit(btn),
    btnShown: getComputedStyle(btn).visibility !== 'hidden' && getComputedStyle(btn).display !== 'none' && !btn.hidden,
    photoShown: getComputedStyle(photo).display !== 'none', titlePx: parseFloat(getComputedStyle(title).fontSize),
    scrollTop: body.scrollTop,
  };
};

async function run(dir, ua, W, H, theme, scen, field, png, { keyboard = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, userAgent: ua, hasTouch: ua !== WIN_UA, colorScheme: theme, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(pathToFileURL(join(dir, 'intro.html')).href);
  await page.evaluate(([th, android]) => {
    const s = document.documentElement.style;
    if (android) { s.setProperty('--android-inset-top', '24px'); s.setProperty('--android-inset-bottom', '48px'); }   // = INSET_B
    document.documentElement.dataset.theme = th;
  }, [theme, ua === ANDROID_UA]);
  await sleep(1200);
  await page.evaluate(() => document.querySelector('.c-launch__ctas button').click());
  await sleep(700);
  const nick = page.locator('.c-launch__step[data-step="1"] input');
  await nick.click();
  await nick.fill('Alex');
  await sleep(150);
  if (keyboard && scen === 'S1') { await page.setViewportSize({ width: W, height: H - KB }); await sleep(500); }
  await page.locator('.c-launch__step[data-step="1"] .c-launch__footer button').click();
  await sleep(900);
  const inputs = page.locator('.c-launch__step[data-step="2"] .c-lock__input');
  if (scen === 'S1') {
    await sleep(600);
    if (field === 'confirm') await page.keyboard.press('Enter');   // the keyboard's Next on the password
    await sleep(1800);
  } else {
    await inputs.nth(field === 'confirm' ? 1 : 0).focus();
    await sleep(500);
    if (keyboard) { await page.setViewportSize({ width: W, height: H - KB }); await sleep(1800); }
  }
  const m = await page.evaluate(MEASURE);
  m.kbTop = keyboard && ua === ANDROID_UA ? m.ih - INSET_B : m.ih;
  if (png) await page.screenshot({ path: join(out, png) });
  await ctx.close();
  return { m, errs };
}

const rows = [];
let red = 0;
const row = (ok, text) => { rows.push((ok ? 'ok   ' : 'RED  ') + text); if (!ok) red++; };
const num = (x) => (x == null ? 'n/a' : Math.round(x * 10) / 10);
const fmt = (m) => `f1 ${num(m.f1.t)}–${num(m.f1.b)} f2 ${num(m.f2.t)}–${num(m.f2.b)} btn ${num(m.button.t)}–${num(m.button.b)} body ${num(m.body.t)}–${num(m.body.b)} kbTop ${m.kbTop} kb=${m.kb} photo=${m.photoShown} title=${m.titlePx}px`;
const RING = 4;
const inBody = (f, b) => f && f.t - RING >= b.t - 0.5 && f.b + RING <= b.b + 0.5;
const visible = (m) => inBody(m.f1, m.body) && inBody(m.f2, m.body) && m.f1.b <= m.kbTop + 0.5 && m.f2.b <= m.kbTop + 0.5
  && m.button.b <= m.kbTop + 0.5 && m.button.t >= 0 && m.hitF1 && m.hitF2 && m.hitBtn && m.btnShown;
const within = (a, b) => (a == null && b == null) || (a && b && ['t', 'b', 'l', 'r'].every((k) => Math.abs(a[k] - b[k]) <= 0.5));
const same = (x, y) => ['topbar', 'progress', 'body', 'f1', 'f2', 'button', 'title'].every((k) => within(x[k], y[k])) && x.scrollTop === y.scrollTop && x.photoShown === y.photoShown;

const base = {};
for (const [W, H] of SIZES) for (const theme of THEMES) for (const scen of ['S1', 'S2']) for (const field of ['password', 'confirm']) {
  const tag = `${W}x${H}-${theme}-${scen}-${field}`;
  const b = await run(baseDir, ANDROID_UA, W, H, theme, scen, field, `d-protect-base-${tag}.png`);
  const n = await run(newDir, ANDROID_UA, W, H, theme, scen, field, `d-protect-new-${tag}.png`);
  base[tag] = b;
  const want = field === 'confirm' ? 1 : 0;
  row(n.m.activeIdx === want && visible(n.m) && n.m.kb && !n.m.photoShown && n.m.titlePx === 20,
    `NEW  ${tag}: both fields and the button fully above the keyboard and not covered, the photo hidden, the title 20 px, focus on the ${field} — ${fmt(n.m)}`);
  row(n.errs.length === 0 && b.errs.length === 0, `NEW  ${tag}: no page error ${n.errs.length ? JSON.stringify(n.errs) : ''}`);
  console.log(`base ${tag}: ${fmt(b.m)} focus=${b.m.activeIdx} (both visible: ${visible(b.m)})`);
}
for (const scen of ['S1', 'S2']) {
  const b = base[`360x640-${THEMES[THEMES.length - 1]}-${scen}-password`].m;
  row(!visible(b), `BASE 360x640 ${scen} password FAILS as the walk saw it (not both fields and the button above the keyboard) — ${fmt(b)}`);
}
/* without a keyboard nothing changes: Android, iPhone (the phone sizes) and Windows WebView2 (the desktop layout) */
for (const [label, ua, sizes] of [['Android', ANDROID_UA, SIZES], ['iPhone', IPHONE_UA, SIZES], ['Windows', WIN_UA, [[1280, 800], [900, 640]]]])
  for (const [W, H] of sizes) for (const field of ['password', 'confirm']) {
    const b = await run(baseDir, ua, W, H, 'dark', 'S2', field, null, { keyboard: false });
    const n = await run(newDir, ua, W, H, 'dark', 'S2', field, null, { keyboard: false });
    row(same(n.m, b.m) && !n.m.kb && n.errs.length === 0, `${label} UA ${W}x${H} no keyboard ${field}: NEW equals BASE (every rect within 0.5 px, scrollTop, the photo) — new ${fmt(n.m)}`);
  }

/* TAP: keyboard up, both passwords typed, a touchscreen tap on the button / the first eye */
async function tap(dir, W, H, target) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, userAgent: ANDROID_UA, hasTouch: true, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(join(dir, 'intro.html')).href);
  await page.evaluate(() => { const s = document.documentElement.style; s.setProperty('--android-inset-top', '24px'); s.setProperty('--android-inset-bottom', '48px'); });
  await sleep(1200);
  await page.evaluate(() => document.querySelector('.c-launch__ctas button').click());
  await sleep(700);
  const nick = page.locator('.c-launch__step[data-step="1"] input');
  await nick.click(); await nick.fill('Alex'); await sleep(150);
  await page.setViewportSize({ width: W, height: H - KB }); await sleep(500);
  await page.locator('.c-launch__step[data-step="1"] .c-launch__footer button').click();
  await sleep(1500);
  await page.keyboard.type('correct horse 1');
  await page.locator('.c-launch__step[data-step="2"] .c-lock__input').nth(1).focus(); await sleep(300);   // as BASE can (it has no Next)
  await page.keyboard.type('correct horse 1'); await sleep(1500);
  const at = await page.evaluate((target) => {
    window.__log = [];
    const root = document.querySelector('.c-launch');
    new MutationObserver(() => window.__log.push('kb=' + root.hasAttribute('data-kb'))).observe(root, { attributes: true, attributeFilter: ['data-kb'] });
    const pane = document.querySelector('.c-launch__step[data-step="2"]');
    const el = target === 'button' ? pane.querySelector('.c-launch__footer button') : pane.querySelector('.c-lock__reveal');
    el.addEventListener('click', () => window.__log.push('CLICK'));
    const r = el.getBoundingClientRect();
    return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, kb: root.hasAttribute('data-kb'), disabled: el.disabled };
  }, target);
  await page.touchscreen.tap(at.x, at.y);
  await sleep(400);
  const after = await page.evaluate(() => ({ log: window.__log, label: document.querySelector('.c-launch__step[data-step="2"] .c-launch__footer button').textContent, pwType: document.querySelector('.c-launch__step[data-step="2"] .c-lock__input').type }));
  await ctx.close();
  const done = target === 'button' ? /Creating your account/.test(after.label) : after.pwType === 'text';
  return { at, after, done };
}
for (const [W, H] of [[360, 640], [412, 774]]) for (const target of ['button', 'eye']) {
  const b = await tap(baseDir, W, H, target);
  const n = await tap(newDir, W, H, target);
  const kbHeld = n.at.kb && n.after.log.indexOf('CLICK') > -1 && !n.after.log.slice(0, n.after.log.indexOf('CLICK')).includes('kb=false');
  /* BASE is demanded for the button only: on BASE at 360 × 640 the first eye is scrolled out of the body (printed) */
  row(n.done && (target === 'eye' || b.done) && !n.at.disabled && kbHeld,
    `TAP  ${W}x${H} ${target}: with the keyboard up a tap ${target === 'button' ? 'submits' : 'shows the password'} on NEW (as on BASE: ${b.done}); the state held until the click — ${JSON.stringify({ new: n.after, base: b.after.label })}`);
}

/* a TALLER keyboard (350 px at 360 × 640: the pair no longer fits the body) — the FOCUSED field is the one revealed;
   and iPhone (the inset model, __setKbInset as C# pushes it): Enter on the password brings the confirm field into the body */
async function edge(dir, kind) {
  const ios = kind === 'ios';
  const [W, H] = ios ? [375, 667] : [360, 640];
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, userAgent: ios ? IPHONE_UA : ANDROID_UA, hasTouch: true, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(join(dir, 'intro.html')).href);
  if (!ios) await page.evaluate(() => { const s = document.documentElement.style; s.setProperty('--android-inset-top', '24px'); s.setProperty('--android-inset-bottom', '48px'); });
  await sleep(1200);
  await page.evaluate(() => document.querySelector('.c-launch__ctas button').click());
  await sleep(700);
  const nick = page.locator('.c-launch__step[data-step="1"] input');
  await nick.click(); await nick.fill('Alex'); await sleep(150);
  if (ios) await page.evaluate(() => window.__setKbInset(260)); else await page.setViewportSize({ width: W, height: H - 350 });
  await sleep(500);
  await page.locator('.c-launch__step[data-step="1"] .c-launch__footer button').click();
  await sleep(1500);
  if (ios) { await page.keyboard.press('Enter'); await sleep(600); }
  else { await page.locator('.c-launch__step[data-step="2"] .c-lock__input').nth(1).focus(); await sleep(1800); }
  const m = await page.evaluate(MEASURE);
  m.kbTop = ios ? m.ih - 260 : m.ih - INSET_B;
  await page.screenshot({ path: join(out, `d-protect-${dir === baseDir ? 'base' : 'new'}-${kind}.png`) });
  await ctx.close();
  return m;
}
{
  const n = await edge(newDir, 'tallkb'), b = await edge(baseDir, 'tallkb');
  row(n.activeIdx === 1 && inBody(n.f2, n.body) && n.f2.b <= n.kbTop + 0.5 && n.button.b <= n.kbTop + 0.5 && n.hitF2,
    `TALL 360x640 keyboard 350, the confirm field focused: it is inside the body and above the keyboard (BASE: ${inBody(b.f2, b.body)}) — ${fmt(n)}`);
  const ni = await edge(newDir, 'ios'), bi = await edge(baseDir, 'ios');
  /* the iOS reveal (scrollIntoView nearest) brings the field box in, not its ring: the box is checked */
  row(ni.activeIdx === 1 && ni.f2.t >= ni.body.t - 0.5 && ni.f2.b <= ni.body.b + 0.5 && ni.f2.b <= ni.kbTop + 0.5,
    `iOS 375x667 inset 260: Enter on the password moves to the confirm field and its box is inside the body (BASE has no move: focus ${bi.activeIdx}) — ${fmt(ni)}`);
}
await browser.close();
console.log('\n' + rows.join('\n'));
console.log(`\nd-protect-keyboard-render: ${rows.length} rows, ${red} red${BREAK ? ' (a --break flag: red is EXPECTED)' : ''}; PNGs in ${out}`);
process.exit(red ? 1 : 0);
