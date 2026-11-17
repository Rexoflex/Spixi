/* ==== fixb2 item 1 (#1629 / #1639) — the CHROMIUM sweep of the centred "Unread messages" pill (NOT a pin module, NOT in smoke; Playwright) ====
 * On the BUILT chat.html, filled through the shell's own C# push path (onChatScreenReady → clearMessages → addMessages → messagesDone →
 * onChatScreenLoaded): two days (a date pill each), the newest three rows unread (the marker).
 *   · DESKTOP (Windows UA → the shell sets data-desktop; Chromium launched WITHOUT overlay scroll bars so the thin bar is a CLASSIC bar that
 *     takes layout width, like WebView2's): 1280 × 800 and 700 × 800, LONG log (scrolls → a bar) and SHORT log (3 + rows, no bar), light and dark;
 *   · PHONE (touch UA, 412 × 915): the same, long + short, light and dark.
 *   Measured against the pane (the window), per leg:
 *     pill centre == every date pill's centre (±1 px)  ·  pill centre == the composer's centre (±1) on the desktop (the gutter decision)  ·
 *     both edges free: the pill's left > 0 and its right < the pane's width, and it lies inside the log's content box with a gap of ≥ 8 px on
 *     each side (nothing touches or misses an edge)  ·  the pill is a PILL: width < the log's content width / 2 and its computed radius is the
 *     date pill's (both pill-shaped: radius ≥ height / 2)  ·  no negative computed inline margin  ·  the date pill and the marker are the SAME
 *     column (each is centred; the marker sits below the first date pill).
 *   · GUTTER DECISION (desktop legs, printed as `gutter`): the same page measured twice — as shipped (`stable both-edges`) and with the log's
 *     gutter forced to `stable` (end edge only, today minus fixb1): the offset of the pill centre from the COMPOSER's centre (the pane's) is
 *     printed for both. The shipped one must be ≤ 1 px; the end-only one is the cost of dropping the gutter (≈ half a scroll-bar width).
 *   · LONG LABEL legs (phone 320 and 412, both themes): one 64-letter word in the label — the pill keeps ≥ 16 px free on each side (the day pill's inset), the word
 *     wraps inside (no horizontal overflow), still centred (★ #46 r1 m-3). Break: `max-width: calc(100% - 2 * var(--spacing-16))` → `100%` fails these legs.
 * Run after build-shells: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-fixb2/c-unread-pill-sweep.mjs
 * (add `--root <tree>` to read another tree's built shell). Exit 0 = pass · 1 = a measurement failed · 2 = the setup cannot prove it.
 * Deliberate break (fixb2 report): `width: fit-content` → `width: 100%` on `.c-unread-divider` (+ build-shells) → every leg fails
 *   (the pill spans the column: not a pill, an edge missed). */
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const argv = process.argv.slice(2);
let root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ri = argv.indexOf('--root');
if (ri >= 0) root = argv[ri + 1];
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('c-unread-pill-sweep: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
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
    const day = i < rows / 2 ? 0 : 1;
    const ts = T0 + day * 86400 + i * 60;
    const unread = i >= rows - 3 ? 'False' : 'True';
    const text = 'Row ' + i + ' ' + 'lorem ipsum dolor sit amet '.repeat(1 + (i % 4));
    items.push(['m' + (100 + i), 'addrPeer', 'Demo Contact', '', text, String(ts), 'True', 'True', unread, 'False', 'False']);
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
  const el = document.querySelector('#messages .c-unread-divider');
  const pills = [...document.querySelectorAll('#messages .c-datesep__pill')];
  const comp = document.getElementById('chat-composer');
  const W = root.clientWidth;
  const cs = el ? getComputedStyle(el) : null;
  const lr = log.getBoundingClientRect();
  const lcs = getComputedStyle(log);
  const r = el ? el.getBoundingClientRect() : null;
  const c = (x) => (x.left + x.right) / 2;
  const r2 = (v) => Math.round(v * 100) / 100;
  const radiusOk = (e) => { const s = getComputedStyle(e); const rr = parseFloat(s.borderTopLeftRadius); return rr >= e.getBoundingClientRect().height / 2 - 0.5; };
  const contentL = lr.left + parseFloat(lcs.paddingLeft), contentR = lr.right - parseFloat(lcs.paddingRight);
  const cr = comp ? comp.getBoundingClientRect() : null;
  return {
    W, desktop: root.hasAttribute('data-desktop'), pointerFine: matchMedia('(hover: hover) and (pointer: fine)').matches,
    scrollbar: log.offsetWidth - log.clientWidth, overflows: log.scrollHeight > log.clientHeight + 1, gutter: lcs.scrollbarGutter,
    marker: !!el, datePills: pills.length,
    left: r ? r2(r.left) : null, rightGap: r ? r2(W - r.right) : null, width: r ? r2(r.width) : null, height: r ? r2(r.height) : null,
    inLeft: r ? r2(r.left - contentL) : null, inRight: r ? r2(contentR - r.right) : null,
    ml: cs ? cs.marginLeft : '', mr: cs ? cs.marginRight : '',
    centre: r ? r2(c(r)) : null, paneCentre: W / 2, composerCentre: cr ? r2(c(cr)) : null,
    pillOff: r && pills.length ? r2(Math.max(...pills.map((p) => Math.abs(c(p.getBoundingClientRect()) - c(r))))) : null,
    pillRound: el ? radiusOk(el) : false, datePillRound: pills.length ? radiusOk(pills[0]) : false,
    belowDate: r && pills.length ? pills[0].getBoundingClientRect().bottom <= r.top + 0.5 : false,
    visible: (() => {   // ★ #46 r2 (O3): the marker is really SEEN — tall enough for its line, the label inside the box, opaque, not squashed or clipped
      if (!el) return false;
      const sp = el.querySelector('span'); if (!sp) return false;
      const sr = sp.getBoundingClientRect(), es = getComputedStyle(el), ss = getComputedStyle(sp);
      const lh = parseFloat(ss.lineHeight) || sr.height;
      return r.height >= lh - 0.5 && sr.height >= lh - 0.5 && sr.top >= r.top - 0.5 && sr.bottom <= r.bottom + 0.5 && sr.left >= r.left - 0.5 && sr.right <= r.right + 0.5
        && parseFloat(es.opacity) >= 0.99 && parseFloat(ss.opacity) >= 0.99 && es.transform === 'none' && ss.transform === 'none' && es.clipPath === 'none' && ss.clipPath === 'none'
        && es.visibility === 'visible' && es.display !== 'none' && ss.color !== 'rgba(0, 0, 0, 0)' && ss.color !== 'transparent';
    })(),
    contentW: r2(contentR - contentL), overflowX: el ? el.scrollWidth > el.clientWidth + 1 : false,
  };
};

const run = async (b, { ua, width, height, theme, rows, phone, endOnly, label }) => {
  const ctx = await b.newContext({ viewport: { width, height }, userAgent: ua, hasTouch: !!phone, isMobile: !!phone });
  const p = await ctx.newPage();
  await p.goto(URL); await sleep(1200);
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  if (endOnly) await p.addStyleTag({ content: ':root[data-desktop] .messages { scrollbar-gutter: stable !important; }' });
  await p.evaluate(FILL, rows);
  await sleep(2600);
  if (label) { await p.evaluate((t) => { document.querySelector('#messages .c-unread-divider span').textContent = t; }, label); await sleep(200); }
  const m = await p.evaluate(MEASURE);
  await ctx.close();
  return m;
};

const b = await pw.chromium.launch({ args: ['--disable-features=OverlayScrollbar,OverlayScrollbars', '--disable-smooth-scrolling'] });
console.log('chromium ' + b.version());
const legs = [];
for (const [width, height] of [[1280, 800], [700, 800]]) for (const theme of ['light', 'dark']) for (const [kind, rows] of [['long', 40], ['short', 4]]) legs.push({ tag: `desktop ${width}x${height} ${theme} ${kind}`, ua: DESK_UA, width, height, theme, rows, kind, desk: true });
for (const theme of ['light', 'dark']) for (const [kind, rows] of [['long', 40], ['short', 4]]) legs.push({ tag: `phone 412x915 ${theme} ${kind}`, ua: PHONE_UA, width: 412, height: 915, theme, rows, kind, phone: true });

/* ★ #46 r1 m-3: a LONG label (one 64-letter word, as a long translation can make) at 320 px wide and at 412: the pill keeps the day pill's 16 px inset on both sides and the word wraps INSIDE it */
const LONG = 'Unread messages ' + 'W'.repeat(64);
for (const width of [320, 412]) for (const theme of ['light', 'dark']) legs.push({ tag: `phone ${width}x915 ${theme} long-label`, ua: PHONE_UA, width, height: 915, theme, rows: 40, kind: 'long', phone: true, label: LONG, longLabel: true });
for (const L of legs) {
  const m = await run(b, L);
  const wantBar = L.kind === 'long';
  const setup = m.marker && m.datePills > 0 && (L.desk ? m.desktop && m.pointerFine && (wantBar ? m.scrollbar > 0 && m.overflows : !m.overflows) : !m.desktop && (wantBar ? m.overflows : !m.overflows));
  const edgesFree = m.left > 0 && m.rightGap > 0 && m.inLeft >= 8 && m.inRight >= 8;
  const isPill = m.width < m.contentW / 2 && m.pillRound && m.datePillRound && parseFloat(m.ml) >= 0 && parseFloat(m.mr) >= 0 && m.belowDate;
  const centred = m.pillOff <= 1 && (!L.desk || Math.abs(m.centre - m.composerCentre) <= 1);
  const good = m.visible && (L.longLabel ? setup && m.inLeft >= 15.5 && m.inRight >= 15.5 && m.left > 0 && m.rightGap > 0 && !m.overflowX && m.pillRound && m.pillOff <= 1 : setup && edgesFree && isPill && centred);
  let extra = '';
  if (L.desk && setup) {
    const e = await run(b, { ...L, endOnly: true });
    extra = ' gutter{shipped both-edges: offFromComposer=' + Math.abs(m.centre - m.composerCentre).toFixed(2) + ' · end-only: offFromComposer=' + Math.abs(e.centre - e.composerCentre).toFixed(2) + ', bar=' + e.scrollbar + 'px}';
  }
  console.log((!setup ? '  ? ' : good ? '  ✓ ' : '  ✗ ') + L.tag + ' ' + JSON.stringify({ W: m.W, bar: m.scrollbar, centre: m.centre, pillOff: m.pillOff, composer: m.composerCentre, left: m.left, rightGap: m.rightGap, inLeft: m.inLeft, inRight: m.inRight, overflowX: m.overflowX, visible: m.visible, width: m.width, h: m.height, round: m.pillRound, ml: m.ml }) + extra);
  if (!setup) setupBad = true; else if (!good) fails.push(L.tag);
}
await b.close();
if (setupBad) { console.log('\nc-unread-pill-sweep: SETUP not proven (see the ? rows: no desktop flag / fine pointer, no marker / date pill, a long log that does not scroll, a desktop leg without a classic bar)'); process.exit(2); }
console.log(fails.length ? '\nc-unread-pill-sweep FAIL: ' + fails.join(' · ') : '\nc-unread-pill-sweep OK');
process.exit(fails.length ? 1 : 0);
