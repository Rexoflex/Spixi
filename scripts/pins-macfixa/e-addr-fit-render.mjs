/* ==== macfixa item 5 (#1358, walk row S17-AD-CARD) — "Your Ixian address" fits its desktop dialog, MEASURED IN CHROMIUM ====
 * NOT a pin module, NOT in smoke; run by hand. It loads the BUILT Account shell (settings.html) of two trees, BASE and NEW,
 * with the desktop marker set the way the shell sets it (a desktop UA → `data-desktop`), `data-platform` substituted for
 * `*SL{SpixiPlatform}` (maccatalyst / windows) and the theme for `*SL{SpixiThemeName}`. It pushes setAddress (+ setNickname
 * for the `id` card: the band, the avatar and the name, as Account shows it; without it the `anon` card is the Wallet ›
 * Receive and contact geometry: the 44 px band, no avatar, no name), clicks the "My address" row and measures the dialog.
 * Per size: the dialog box (.c-sheet--addr), the scroll region (.c-addr-sheet: rect, scrollHeight, clientHeight), the QR,
 * the short address, Copy, the safety line, and Share; then it scrolls the region to its end and reads again.
 * Share is NOT on desktop by design (settings.html `onShare: isDesktop ? undefined : shareAddress`, W9): a desktop row
 * requires it ABSENT; a phone row requires it present.
 *   REACH (every desktop row): the dialog lies inside the viewport, the scroll region lies inside the dialog box (the
 *     dialog clips: overflow-y hidden), and every part is fully inside (viewport ∩ dialog ∩ region) at SOME scroll
 *     position of the region (worked out from the top view; the end view checks the region really scrolls to its end).
 *   CUE (every desktop row whose region scrolls): the fold cuts THROUGH the card or the safety line (4 px or more of it on
 *     each side), so the cut reads as "more below" even with no scrollbar (a Mac scroller shows none until it moves).
 *   FIT (the default sizes: Mac 1280 × 800, Windows 1000 × 668; the anon card at 1024 × 640 too): nothing to scroll
 *     (scrollHeight ≤ clientHeight) and every part fully visible — what the walk asked for. BASE must FAIL a FIT row;
 *     NEW must pass every row.
 *   PHONE (Android UA, touch, no data-desktop) at 360 × 640 and 412 × 915: every rect of NEW equals BASE within 0.5 px.
 * Desktop sizes: Mac 1280 × 800 (about the default window), 1024 × 640, 900 × 560, 800 × 480, 700 × 400;
 * Windows 1000 × 668 (the default 1000 × 700 window minus a 32 px title bar), 1000 × 500, 800 × 400, 600 × 360 (the minimum height).
 * USAGE: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-macfixa/e-addr-fit-render.mjs
 *   [--base <html dir>] [--new <html dir>] [--out <dir>] [--break-cap | --break-qr]
 *   --base default /home/claude/scratch/layout-base/html · --new default this tree's Spixi/Resources/Raw/html ·
 *   --out default /home/claude/agents/e/out (PNGs `e-addr-<base|new>-<plat>-<WxH>-<theme>-<id|anon>.png`, the top view).
 *   Deliberate breaks (#802), in the NEW pages: --break-cap = the dialog cap rule's selector renamed (the shared 608 px cap
 *   binds again) → red FIT rows; --break-qr = the code's two max-width terms set to none (the 216 px code at every
 *   height) → red FIT rows.
 * Exit 0 = all green; 1 = a row is red; 2 = setup.
 * LIMITS: Chromium (Blink), not WKWebView or WebView2: the scroll indicator, the flex shrink and the font metrics of WebKit
 * are not exercised; the pane is modelled as the whole viewport; nothing is clicked inside the sheet. The numbers are the proof. */
import { join, resolve } from 'node:path';
import { mkdirSync, existsSync, cpSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BREAK = process.argv.includes('--break-cap') ? 'cap' : process.argv.includes('--break-qr') ? 'qr' : '';
const baseDir = resolve(arg('--base', '/home/claude/scratch/layout-base/html'));
const newDir = resolve(arg('--new', join(repo, 'Spixi/Resources/Raw/html')));
const out = resolve(arg('--out', '/home/claude/agents/e/out'));
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('e-addr-fit-render: Playwright not found — set PLAYWRIGHT_MODULE'); process.exit(2); }
for (const d of [baseDir, newDir]) if (!existsSync(join(d, 'settings.html'))) { console.error('e-addr-fit-render: ' + d + '/settings.html is missing'); process.exit(2); }
mkdirSync(out, { recursive: true });

const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const ADDR = '4JsLSmAF4yp3j1T5gcrAkiFF2fYJSe4XM7rJBngtPmPUw2kL5AXKvvwg5yYbncdFa';
const THEMES = ['light', 'dark'];
const DESK = [
  ['maccatalyst', MAC_UA, [[1280, 800], [1024, 640], [900, 560], [800, 480], [700, 400]]],
  ['windows', WIN_UA, [[1000, 668], [1000, 500], [800, 400], [600, 360]]],
];
const PHONE = [[360, 640], [412, 915]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* one temp copy per tree; the C# substitutions are written into variant files beside settings.html */
function prep(dir, label, brk) {
  const tmp = mkdtempSync(join(tmpdir(), 'eaddr-' + label + '-'));
  cpSync(dir, tmp, { recursive: true });
  const src = readFileSync(join(tmp, 'settings.html'), 'utf8');
  for (const plat of ['maccatalyst', 'windows', 'android']) for (const th of THEMES) {
    let t = src.replace("'*SL{SpixiPlatform}'", "'" + plat + "'").replace("'*SL{SpixiThemeName}'", "'" + th + "'");
    if (brk) {
      const u = brk === 'cap' ? t.replace(':root[data-desktop] .c-sheet.c-sheet--addr { max-height', ':root[data-desktop] .c-sheet.c-sheet--addrX { max-height')
        : t.replace(/max-width: max\(185px, 100dvh - \d+px\)/g, 'max-width: none');
      if (u === t) { console.error('e-addr-fit-render: the break found nothing to change'); process.exit(2); }
      t = u;
    }
    writeFileSync(join(tmp, `settings-${plat}-${th}.html`), t);
  }
  return tmp;
}

const MEASURE = () => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; };
  const dlg = document.querySelector('.c-sheet--addr');
  const sc = document.querySelector('.c-addr-sheet');
  const q = (s) => R(sc.querySelector(s));
  const parts = () => ({ card: q('.c-addr-sheet__card'), qr: q('.c-addr-sheet__qrcard'), addr: q('.c-addr-sheet__short'), copy: q('.c-addr-sheet__copy'), share: q('.c-addr-sheet__sharebtn'), safety: q('.c-addr-sheet__explain--safe') });
  const top = { dlg: R(dlg), sc: R(sc), parts: parts() };
  const m = {
    vw: innerWidth, vh: innerHeight, desktop: document.documentElement.hasAttribute('data-desktop'),
    platform: document.documentElement.getAttribute('data-platform'), who: sc.querySelector('.c-addr-sheet__card').hasAttribute('data-who'), theme: document.documentElement.dataset.theme,
    dlgOverflow: getComputedStyle(dlg).overflowY, dlgMax: getComputedStyle(dlg).maxHeight,
    scOverflow: getComputedStyle(sc).overflowY, scH: sc.scrollHeight, scC: sc.clientHeight, dlgSH: dlg.scrollHeight, dlgCH: dlg.clientHeight,
    top,
  };
  sc.scrollTop = sc.scrollHeight;
  m.scrolled = sc.scrollTop;
  m.end = { dlg: R(dlg), sc: R(sc), parts: parts() };
  sc.scrollTop = 0;   // the PNG shows the view the sheet opens with
  return m;
};

const browser = await pw.chromium.launch({ executablePath: existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined });
async function open(dir, plat, ua, W, H, theme, png, id = true) {
  const touch = ua === ANDROID_UA;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, userAgent: ua, hasTouch: touch, isMobile: touch, colorScheme: theme, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(pathToFileURL(join(dir, `settings-${plat}-${theme}.html`)).href);
  await sleep(900);
  await page.evaluate(([a, id]) => {
    const b64 = (x) => btoa(unescape(encodeURIComponent(x)));
    window.executeUiCommand(window.setAddress, b64(a));
    if (id) window.executeUiCommand(window.setNickname, b64('Shang Tsung'));
  }, [ADDR, id]);
  await sleep(500);
  await page.evaluate(() => document.querySelector('.c-settings__row[data-setting-key="address"]').click());
  await sleep(900);
  const m = await page.evaluate(MEASURE);
  if (png) await page.screenshot({ path: join(out, png) });
  await ctx.close();
  return { m, errs };
}

const rows = [];
let red = 0;
const row = (ok, text) => { rows.push((ok ? 'ok   ' : 'RED  ') + text); if (!ok) red++; };
const n1 = (x) => (x == null ? 'n/a' : Math.round(x * 10) / 10);
const E = 0.5;
const inside = (a, b) => a && b && a.t >= b.t - E && a.b <= b.b + E && a.l >= b.l - E && a.r <= b.r + E;
const clip = (s, m) => ({ t: Math.max(0, s.dlg.t, s.sc.t), b: Math.min(m.vh, s.dlg.b, s.sc.b), l: Math.max(0, s.dlg.l, s.sc.l), r: Math.min(m.vw, s.dlg.r, s.sc.r) });
const NAMES = ['qr', 'addr', 'copy', 'safety', 'share'];
function verdict(m) {
  const vp = { t: 0, b: m.vh, l: 0, r: m.vw };
  const reach = [], fit = [];
  if (!inside(m.top.dlg, vp)) reach.push('dialog outside the viewport');
  if (!inside(m.top.sc, m.top.dlg)) reach.push(`scroll region ${n1(m.top.sc.t)}–${n1(m.top.sc.b)} runs past the dialog ${n1(m.top.dlg.t)}–${n1(m.top.dlg.b)}`);
  for (const k of NAMES) {
    if (k === 'share' && m.desktop) { if (m.top.parts.share) reach.push('Share present on desktop'); continue; }
    if (!m.top.parts[k]) { reach.push(k + ' missing'); continue; }
    const topIn = inside(m.top.parts[k], clip(m.top, m));
    if (!topIn) fit.push(`${k} below the fold (${n1(m.top.parts[k].t)}–${n1(m.top.parts[k].b)}, visible to ${n1(clip(m.top, m).b)})`);
    /* reachable = some scrollTop s in [0, max] puts the part inside the clip (the region moves its content only) */
    const p = m.top.parts[k], c = clip(m.top, m), max = m.scH - m.scC;
    const lo = Math.max(0, p.b - c.b - E), hi = Math.min(max, p.t - c.t + E);
    if (!topIn && !(lo <= hi && p.l >= c.l - E && p.r <= c.r + E)) reach.push(`${k} cut (${n1(p.t)}–${n1(p.b)}, clip ${n1(c.t)}–${n1(c.b)}, scroll 0…${max})`);
  }
  if (m.top.parts.safety && !inside(m.end.parts.safety, clip(m.end, m))) reach.push('the end of the scroll does not show the safety line');
  if (m.scH > m.scC + 0.5) {
    fit.push(`the region scrolls ${m.scH - m.scC} px`);
    /* CUE: a region that scrolls cuts THROUGH a block at its fold (the card or the safety line partly visible), so the cut
       reads as more below; the walk's cut fell exactly on the card's edge, with the gap and the line hidden under it */
    const c = clip(m.top, m);
    const through = ['card', 'safety'].some((k) => m.top.parts[k] && m.top.parts[k].t < c.b - 4 && m.top.parts[k].b > c.b + 4);
    if (!through) reach.push(`the fold (${n1(c.b)}) cuts through no block: card ${n1(m.top.parts.card.t)}–${n1(m.top.parts.card.b)}, safety ${n1(m.top.parts.safety && m.top.parts.safety.t)}–${n1(m.top.parts.safety && m.top.parts.safety.b)}`);
  }
  return { reach, fit };
}
const fmt = (m) => `dlg ${n1(m.top.dlg.t)}–${n1(m.top.dlg.b)} · region ${n1(m.top.sc.t)}–${n1(m.top.sc.b)} scroll ${m.scH}/${m.scC} · qr ${n1(m.top.parts.qr.r - m.top.parts.qr.l)} · safety ${n1(m.top.parts.safety.t)}–${n1(m.top.parts.safety.b)} (end ${n1(m.end.parts.safety.t)}–${n1(m.end.parts.safety.b)})`;

const B = prep(baseDir, 'base', '');
const N = prep(newDir, 'new', BREAK);
const FIT = new Set(['maccatalyst-1280x800', 'windows-1000x668', 'anon:maccatalyst-1024x640']);
let baseFitFails = 0;
for (const [plat, ua, sizes] of DESK) for (const [W, H] of sizes) for (const theme of THEMES) for (const id of [true, false]) {
  const tag = `${plat}-${W}x${H}-${theme}-${id ? 'id' : 'anon'}`;
  const b = await open(B, plat, ua, W, H, theme, `e-addr-base-${tag}.png`, id);
  const n = await open(N, plat, ua, W, H, theme, `e-addr-new-${tag}.png`, id);
  const bv = verdict(b.m), nv = verdict(n.m);
  const fitRow = FIT.has(`${plat}-${W}x${H}`) || (!id && FIT.has(`anon:${plat}-${W}x${H}`));
  if (fitRow && bv.fit.length) baseFitFails++;
  console.log(`base ${tag}: ${bv.reach.length ? 'CUT ' + bv.reach.join('; ') : bv.fit.length ? 'scrolls: ' + bv.fit.join('; ') : 'fits'} — ${fmt(b.m)}`);
  row(n.m.desktop && n.m.platform === plat && n.m.who === id && nv.reach.length === 0 && n.errs.length === 0,
    `NEW  ${tag} REACH: dialog in the viewport, region in the dialog, QR · address · Copy · safety reachable, no Share (W9) ${nv.reach.join('; ')} — ${fmt(n.m)} ${n.errs.length ? JSON.stringify(n.errs) : ''}`);
  if (fitRow) row(nv.fit.length === 0, `NEW  ${tag} FIT: the whole card and the safety line show with no scroll ${nv.fit.join('; ')} — ${fmt(n.m)}`);
}
row(baseFitFails > 0, `BASE fails a FIT row as the walk saw it (${baseFitFails} rows: the safety line below the fold)`);

const same = (x, y) => ['dlg', 'sc'].every((k) => inside(x[k], y[k]) && inside(y[k], x[k])) && NAMES.every((k) => (x.parts[k] == null && y.parts[k] == null) || (inside(x.parts[k], y.parts[k]) && inside(y.parts[k], x.parts[k])));
for (const [W, H] of PHONE) for (const theme of THEMES) for (const id of [true, false]) {
  const b = await open(B, 'android', ANDROID_UA, W, H, theme, null, id);
  const n = await open(N, 'android', ANDROID_UA, W, H, theme, `e-addr-new-android-${W}x${H}-${theme}-${id ? 'id' : 'anon'}.png`, id);
  row(!n.m.desktop && !!n.m.top.parts.share && same(n.m.top, b.m.top) && same(n.m.end, b.m.end) && n.m.scrolled === b.m.scrolled,
    `phone ${W}x${H} ${theme} ${id ? 'id' : 'anon'}: NEW equals BASE (every rect within 0.5 px, top and end of scroll; Share present) — new ${fmt(n.m)} · base ${fmt(b.m)}`);
}
await browser.close();
for (const r of rows) console.log(r);
console.log(red ? `e-addr-fit-render: ${red} RED` : `e-addr-fit-render: all ${rows.length} green`);
process.exit(red ? 1 : 0);
