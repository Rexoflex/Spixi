/* ==== fixb1 item 3 (#1646) — the CHROMIUM sweep (NOT a pin module, NOT in smoke; Playwright) ====
 * On the BUILT chat.html, a desktop UA (the shell's own boot script sets data-desktop, as on Windows),. Headless Linux Chrome paints its
 * thin bars as overlays, but `scrollbar-gutter: stable` reserves the real thin-bar width (10 px here) — the same reservation WebView2 makes
 * for its classic bar; the sweep prints it (gutterProbe, scrollbarWidth) and stops with exit 2 if nothing is reserved:
 * the log filled through the shell's own C# push path (onChatScreenReady → clearMessages → addMessages → messagesDone →
 * onChatScreenLoaded), two days (a date pill each), the newest three rows unread (the "Unread messages" strip).
 *   · LONG log (scrolls → a bar) and SHORT log (3 rows → no bar, the gutter is still reserved) at 1100 × 800 and 700 × 800,
 *     in light and dark (data-theme);
 *   · measured relative to the pane (the window): the strip's LEFT inset = its RIGHT inset (± 1 px) · the date pill's centre = the
 *     strip's centre (± 1 px) · the strip's centre = the pane's centre (± 1 px);
 *   · a PHONE leg (touch UA, 390 × 800): no data-desktop, the log's computed scrollbar-gutter is not both-edges, the strip has no
 *     negative margin — nothing changed there.
 * ★ RE-BASED by fixb2 item 1 (#1629 / #1639): the "strip" is now a centred PILL (auto inline margins, width fit-content). The measured
 *   equalities above still hold (left inset = right inset, pill centre = date-pill centre = pane centre) and are kept as they were; only the
 *   phone leg's margin test changed: `0px` → "not negative" (an auto margin computes to the used, positive, px value). The pill itself is
 *   measured by scripts/pins-fixb2/c-unread-pill-sweep.mjs.
 * Run after build-shells: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-fixb1/c-unread-sweep.mjs
 * (add `--root <tree>` to read another tree's built shell). Exit 0 = pass · 1 = a measurement failed · 2 = the setup cannot prove it.
 * Deliberate break (fixb1 report): `both-edges` → `stable` on `:root[data-desktop] .messages` (+ build-shells) → the long AND the
 *   short legs fail (left inset 0, right inset = the gutter), in both widths and both themes; the phone leg stays green. */
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const argv = process.argv.slice(2);
let root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ri = argv.indexOf('--root');
if (ri >= 0) root = argv[ri + 1];
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('c-unread-sweep: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
const URL = pathToFileURL(join(root, 'Spixi/Resources/Raw/html/chat.html')).href;
const DESK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
let setupBad = false;

const FILL = (rows) => {
  const b64 = (v) => btoa(unescape(encodeURIComponent(String(v))));
  const push = (fn, ...a) => window.executeUiCommand(window[fn], ...a.map(b64));
  const T0 = Math.floor(Date.now() / 1000) - 3 * 86400;
  const items = [];
  for (let i = 0; i < rows; i++) {
    const day = i < rows / 2 ? 0 : 1;                                  // two days → a date pill each
    const ts = T0 + day * 86400 + i * 60;
    const unread = i >= rows - 3 ? 'False' : 'True';                    // the newest three arrive unread → the strip
    const text = 'Row ' + i + ' ' + 'lorem ipsum dolor sit amet '.repeat(1 + (i % 4));
    items.push(['m' + (100 + i), 'addrPeer', 'Bob', '', text, String(ts), 'True', 'True', unread, 'False', 'False']);
  }
  push('onChatScreenReady', 'addrPeer');
  push('clearMessages', 'true');
  push('addMessages', JSON.stringify({ strs: [], items: items.map((a) => ({ f: 'addThem', a })) }), 'append');
  push('messagesDone');
  push('onChatScreenLoaded');
};

const MEASURE = () => {
  const root = document.documentElement;
  const log = document.getElementById('messages');
  const strip = document.querySelector('#messages .c-unread-divider');
  const pills = [...document.querySelectorAll('#messages .c-datesep__pill')];
  const W = root.clientWidth;
  const lr = log ? log.getBoundingClientRect() : null;
  const sr = strip ? strip.getBoundingClientRect() : null;
  const cs = log ? getComputedStyle(log) : null;
  const centre = (r) => (r.left + r.right) / 2;
  return {
    W, desktop: root.hasAttribute('data-desktop'), pointerFine: matchMedia('(hover: hover) and (pointer: fine)').matches,
    theme: root.getAttribute('data-theme') || '',
    /* the width Chromium reserves for one thin bar, measured on a probe with `scrollbar-gutter: stable` (headless Linux Chrome paints
       its bars as overlays, so the plain probe has no layout width — the GUTTER is what the strip's inset is made of, as on WebView2);
       scrollbarWidth = offsetWidth - clientWidth of the log (every reserved gutter: one before the fix, two after) */
    gutterProbe: (() => { const x = document.createElement('div'); x.style.cssText = 'position:absolute;left:-999px;width:100px;height:100px;overflow-y:scroll;scrollbar-width:thin;scrollbar-gutter:stable'; document.body.append(x); const w = x.offsetWidth - x.clientWidth; x.remove(); return w; })(),
    scrollbarWidth: log ? log.offsetWidth - log.clientWidth : -1,
    overflows: log ? log.scrollHeight > log.clientHeight + 1 : false,
    gutter: cs ? cs.scrollbarGutter : '', rows: document.querySelectorAll('#messages [data-msgid]').length,
    strip: !!strip, stripMarginL: strip ? getComputedStyle(strip).marginLeft : '',
    left: sr ? Math.round(sr.left * 100) / 100 : null, right: sr ? Math.round((W - sr.right) * 100) / 100 : null,
    stripW: sr ? Math.round(sr.width * 100) / 100 : null,
    stripCentre: sr ? Math.round(centre(sr) * 100) / 100 : null, paneCentre: W / 2,
    pills: pills.length, pillOff: sr ? Math.max(0, ...pills.map((p) => Math.abs(centre(p.getBoundingClientRect()) - centre(sr)))) : null,
  };
};

const run = async (b, tag, { ua, width, theme, rows, phone }) => {
  const ctx = await b.newContext({ viewport: { width, height: 800 }, userAgent: ua, hasTouch: !!phone, isMobile: !!phone });
  const p = await ctx.newPage();
  await p.goto(URL); await sleep(1200);
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.evaluate(FILL, rows);
  await sleep(2600);
  const m = await p.evaluate(MEASURE);
  await ctx.close();
  return m;
};

const b = await pw.chromium.launch();
console.log('chromium ' + b.version());
for (const width of [1100, 700]) {
  for (const theme of ['light', 'dark']) {
    for (const [kind, rows] of [['long', 40], ['short', 4]]) {
      const tag = `desktop ${width} ${theme} ${kind}`;
      const m = await run(b, tag, { ua: DESK_UA, width, theme, rows });
      const wantBar = kind === 'long';
      const setup = m.desktop && m.pointerFine && m.strip && m.pills > 0 && m.gutterProbe > 0 && (wantBar ? m.scrollbarWidth > 0 && m.overflows : !m.overflows);
      const eq = m.strip && Math.abs(m.left - m.right) <= 1 && m.pillOff <= 1 && Math.abs(m.stripCentre - m.paneCentre) <= 1;
      console.log((!setup ? '  ? ' : eq ? '  ✓ ' : '  ✗ ') + tag + ' ' + JSON.stringify(m));
      if (!setup) setupBad = true; else if (!eq) fails.push(tag);
    }
  }
}
{
  const m = await run(b, 'phone', { ua: PHONE_UA, width: 390, theme: 'light', rows: 40, phone: true });
  const good = !m.desktop && !/both-edges/.test(m.gutter) && parseFloat(m.stripMarginL) >= 0 && m.strip;   // ★ fixb2: was /^0(px)?$/ — the pill's auto margin computes to a positive px value
  console.log((good ? '  ✓ ' : '  ✗ ') + 'phone 390 ' + JSON.stringify(m));
  if (!good) fails.push('phone 390');
}
await b.close();
if (setupBad) { console.log('\nc-unread-sweep: SETUP not proven (see the ? rows: no desktop flag, no fine pointer, no strip / pill, no reserved gutter, or the long log does not scroll)'); process.exit(2); }
console.log(fails.length ? '\nc-unread-sweep FAIL: ' + fails.join(' · ') : '\nc-unread-sweep OK');
process.exit(fails.length ? 1 : 0);
