/* ==== S20F W-9 (#1409) — PAINT CHECK for the attach tray's layer (NOT a pin module, NOT in smoke; Playwright) ====
 * The bug: the tray (z auto) sat under the log's positioned internals (photo cells / stamps, z 1–3) — a 5-photo group
 * scrolled behind it painted OVER the tiles. The fix: `.c-attach-tray { position: relative; z-index: var(--z-10) }`.
 * On the BUILT chat.html in Chromium: 30 rows + a 5-photo group, the reader 360 px above the end, the tray open →
 * document.elementFromPoint over every 30 px where the group and the tray overlap must hit the TRAY; the same mid-slide
 * (the close slide's animations paused at 50 % — the open re-seats the log at its end); light + dark. Exit 1 on any miss.
 * Deliberate break (S20F report): the z-index removed from attach-sheet.css (+ build) → the REST points = IMG; `--break`
 * injects the same removal (`z-index: auto`) without a rebuild. Mid-slide is a regression check only: the shell slides
 * the rows too (a transform + the composer-band mask = each row its own stacking context, its z 1–3 capped inside), so
 * it reads TRAY with or without the fix — the rest state is the one that discriminates.
 * Run: node scripts/build-demo-bundle.mjs && node scripts/build-shells.mjs, then
 *      PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-s20f/paint-tray.mjs [--break] */
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let pw;
try { pw = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright'); }
catch (e) { console.error('paint-tray: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
const BREAK = process.argv.includes('--break');
const UA = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const URL = pathToFileURL(join(root, 'Spixi/Resources/Raw/html/chat.html')).href + '?mobile=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await pw.chromium.launch();
async function open(dark) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: dark ? 'dark' : 'light', userAgent: UA, hasTouch: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(URL); await sleep(900);
  await page.evaluate((dark) => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const b64 = (x) => (x == null ? null : btoa(unescape(encodeURIComponent(String(x)))));
    const push = (fn, ...a) => window.executeUiCommand(window[fn], ...a.map(b64));
    const T0 = Math.floor(Date.now() / 1000) - 7200;
    push('onChatScreenReady', 'addrPeer'); push('setChatMode', '0', '0', '', 'False'); push('setCaps', 'reply,edit,voice,media'); push('setPhotoPreviews', 'True'); push('clearMessages', 'false');
    for (let i = 0; i < 30; i++) {
      if (i % 2) push('addThem', 't' + i, 'addrPeer', 'Ana', '', 'message number ' + i + ' with a few words in it', String(T0 + i * 60), 'True', 'True', 'True', 'False', 'False');
      else push('addMe', 'm' + i, 'addrMe', 'Me', '', 'my reply ' + i, String(T0 + i * 60), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '');
    }
    for (let i = 0; i < 5; i++) push('addFile', 'g' + i, 'addrPeer', 'Ana', '', 'x' + i, 'lake' + i + '.jpg', String(T0 + 4000 + i), 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '0123456789abcdef|' + i + '|5|', '', '');
    push('messagesDone'); push('onChatScreenLoaded');
    const cols = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#e67e22'];
    for (let i = 0; i < 5; i++) { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d'); g.fillStyle = cols[i]; g.fillRect(0, 0, 320, 240); push('setFileThumb', 'g' + i, c.toDataURL('image/jpeg', 0.8)); }
  }, dark);
  await sleep(700);
  if (BREAK) await page.addStyleTag({ content: '.c-attach-tray { z-index: auto !important; }' });
  return { ctx, page, errs };
}
const sample = (page) => page.evaluate(() => {
  const g = document.querySelector('.c-mgrid').getBoundingClientRect(); const t = document.querySelector('.c-attach-tray').getBoundingClientRect();
  const pts = [];
  for (let y = Math.max(g.top, t.top) + 5; y < Math.min(g.bottom, t.bottom); y += 30) { const e = document.elementFromPoint(g.left + 40, y); pts.push(e ? (e.closest('.c-attach-tray') ? 'TRAY' : e.tagName) : 'none'); }
  return pts;
});
let bad = 0;
for (const dark of [false, true]) {
  const theme = dark ? 'dark' : 'light';
  /* at rest: open, then the reader 360 px above the end (the dials repro) */
  { const { ctx, page, errs } = await open(dark);
    await page.click('.c-composer__attach'); await sleep(900);
    await page.evaluate(() => { document.getElementById('messages').scrollTop -= 360; }); await sleep(400);
    const pts = await sample(page);
    const ok = pts.length >= 3 && pts.every((p) => p === 'TRAY');
    if (!ok || errs.length) bad++;
    console.log(theme + ' rest     ' + (ok ? 'OK ' : 'BAD') + ' ' + pts.filter((p) => p === 'TRAY').length + '/' + pts.length + ' ' + JSON.stringify(pts) + (errs.length ? ' ERRS ' + errs.join(' | ') : ''));
    await ctx.close(); }
  /* mid-slide: the CLOSE slide (the layout is held while the bar + tray slide down by transform) paused at 50 %, from
     the rest state above — the open re-seats the log at its end, so a reader above the end is only reachable this way */
  { const { ctx, page, errs } = await open(dark);
    await page.click('.c-composer__attach'); await sleep(900);
    await page.evaluate(() => { document.getElementById('messages').scrollTop -= 360; }); await sleep(400);
    await page.evaluate(() => { document.querySelector('.c-composer__attach').click(); for (const a of document.getAnimations()) { try { const d = a.effect.getComputedTiming().duration; if (d > 0 && d !== Infinity) { a.pause(); a.currentTime = d / 2; } } catch (e) {} } });
    await sleep(120);
    const sliding = await page.evaluate(() => { const t = document.querySelector('.c-attach-tray'); return t ? getComputedStyle(t).transform : 'gone'; });
    const pts = await sample(page);
    const ok = pts.length >= 1 && pts.every((p) => p === 'TRAY') && /^matrix/.test(sliding);
    if (!ok || errs.length) bad++;
    console.log(theme + ' midslide ' + (ok ? 'OK ' : 'BAD') + ' ' + pts.filter((p) => p === 'TRAY').length + '/' + pts.length + ' transform=' + sliding + ' ' + JSON.stringify(pts) + (errs.length ? ' ERRS ' + errs.join(' | ') : ''));
    await ctx.close(); }
}
await browser.close();
console.log(bad ? 'paint-tray: FAIL (' + bad + ' state(s))' : 'paint-tray: OK — the tray paints above the photo group at rest and mid-slide, light + dark');
process.exit(bad ? 1 : 0);
