/* ==== photo1b HV-1 / HV-3 / HV-4 — the HISTORY harness (NOT a pin module, NOT in smoke; Playwright Chromium, run by hand) ====
 * The BUILT chat.html of a tree, served by a local http server from its Spixi/Resources/Raw/html folder (the shell's relative
 * assets resolve; the head carrier is set to a developer build in memory, so the shell's own `[P1] shell older insert …` split
 * lines are read too). Headless Chromium, phone viewport 412 × 915 (touch, dpr 2.625), CPU × 4 by CDP
 * `Emulation.setCPUThrottlingRate`. The caps are pre-pushed with the shell's own `setCaps` push (no new verb):
 *   on  = `olderInsert,olderAnchor1,fadeBand` (+ reply,edit,voice,media) · off = reply,edit,voice,media only (the old paths).
 * Scenarios (fresh page per run, 5 runs, medians):
 *   text  — an open of 50 text rows (two senders, runs), the boot re-pin is let go (2.5 s), the reader scrolls to the top, then
 *           three older pages of 100 / 50 / 50 rows (addMessages(json, "prepend") in one task, messagesDone("true") in the next);
 *   photo — an open of 50 rows holding 48 single photo tiles (Seed 56-like; no thumbnails pushed), then one older page of 50 rows
 *           holding 46 photos.
 * Per page: `done` = the messagesDone task (performance.now around the push, in the page) · `long` = the longest 'longtask'
 * entry (PerformanceObserver; ≥ 50 ms by the API, 0 = none) from the addMessages push to 700 ms after messagesDone · the
 * shell's own line: mode / build / swap / fix / fade.
 * Usage: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-photo1b/harness-history.mjs
 *        [--root <tree>] [--caps on|off] [--runs <n>] [--only text|photo]
 * The numbers are INDICATIVE (a shared 2-core box; the lead re-measures sequentially). Exit 0 = ran · 2 = the setup cannot run. */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const root = arg('--root', join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const capsArg = arg('--caps', 'both');
const RUNS = Number(arg('--runs', '5')) || 5;
const only = arg('--only', '');
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('harness-history: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
const HTML_DIR = join(root, 'Spixi/Resources/Raw/html');
if (!existsSync(join(HTML_DIR, 'chat.html'))) { console.error('harness-history: no built chat.html under ' + HTML_DIR); process.exit(2); }
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const BASE_CAPS = 'reply,edit,voice,media';
const ON_CAPS = BASE_CAPS + ',olderInsert,olderAnchor1,fadeBand';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* the static server: the built folder, chat.html with the developer carrier on (in memory) */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.json': 'application/json' };
const chatHtml = readFileSync(join(HTML_DIR, 'chat.html'), 'utf8').replace("'*SL{SpixiP1}'==='1'", "'1'==='1'");
const server = createServer((req, res) => {
  const u = decodeURIComponent(String(req.url || '/').split('?')[0]);
  if (u === '/chat.html') { res.writeHead(200, { 'content-type': TYPES['.html'] }); res.end(chatHtml); return; }
  const p = normalize(join(HTML_DIR, u));
  if (!p.startsWith(HTML_DIR) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL = 'http://127.0.0.1:' + server.address().port + '/chat.html?mobile=1';

/* in-page helpers (serialised into the page) */
const PAGE_INIT = () => {
  window.__h = { long: [], t0: 0 };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__h.long.push({ at: e.startTime, ms: e.duration }); }).observe({ type: 'longtask', buffered: false });
  } catch (e) { /* none */ }
  const b64 = (v) => btoa(unescape(encodeURIComponent(String(v))));
  window.__push = (fn, ...a) => window.executeUiCommand(window[fn], ...a.map(b64));
};
function items(kind, from, n, T0, textAt = []) {
  const out = [];
  for (let i = from; i < from + n; i++) {
    const id = 'h' + i.toString(16).padStart(5, '0');
    const me = Math.floor(i / 3) % 2 === 0;
    const ts = String(T0 + i * 90);
    const photo = kind === 'photo' && !textAt.includes(i - from);   // the open: 48 of 50 · the page: 46 of 50
    if (photo) out.push({ f: 'addFile', a: [id, me ? 'addrMe' : 'addrPeer', me ? 'Me' : 'Ana', '', 'fid' + id, 'IMG_' + i + '.jpg', ts, me ? 'True' : 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '', '', '120000'] });
    else out.push({ f: me ? 'addMe' : 'addThem', a: [id, me ? 'addrMe' : 'addrPeer', me ? 'Me' : 'Ana', '', 'message ' + i + ' ' + 'lorem ipsum dolor sit amet '.repeat(1 + (i % 3)), ts, 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '', ''] });
  }
  return out;
}
const median = (a) => { const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); if (!s.length) return NaN; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

async function oneRun(browser, kind, caps) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: PHONE_UA });
  const page = await ctx.newPage();
  const lines = [];
  page.on('console', (m) => { const t = m.text(); if (/^\[P1\] shell older insert /.test(t)) lines.push(t); });
  await page.addInitScript(PAGE_INIT);
  const cdp = await ctx.newCDPSession(page);
  await page.goto(URL);
  await sleep(1200);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const T0 = Math.floor(Date.now() / 1000) - 10 * 86400;
  const total = kind === 'photo' ? 100 : 250;
  const pages = kind === 'photo' ? [50] : [100, 50, 50];
  const openFrom = total - 50;
  await page.evaluate(([c, open]) => {
    const p = window.__push;
    p('onChatScreenReady', 'addrPeer');
    p('setChatMode', '0', '0', '', 'False');
    p('setCaps', c);
    p('setPhotoPreviews', 'True');
    p('clearMessages', 'true');
    p('addMessages', JSON.stringify({ strs: [], items: open }), 'append');
    p('messagesDone');
    p('onChatScreenLoaded');
  }, [caps, items(kind, openFrom, 50, T0, [0, 25])]);
  await sleep(2500);
  const out = [];
  let end = openFrom;
  for (const n of pages) {
    const from = end - n;
    end = from;
    await page.evaluate(() => { const b = document.getElementById('messages'); b.scrollTop = 0; });
    await sleep(300);
    const before = lines.length;
    const t0 = await page.evaluate((it) => { const t = performance.now(); window.__push('addMessages', JSON.stringify({ strs: [], items: it }), 'prepend'); return t; }, items(kind, from, n, T0, [0, 1, 25, 26]));
    const done = await page.evaluate(() => { const t = performance.now(); window.__push('messagesDone', 'true'); return performance.now() - t; });
    await sleep(700);
    const long = await page.evaluate((t) => window.__h.long.filter((e) => e.at >= t - 1).reduce((m, e) => Math.max(m, e.ms), 0), t0);
    const line = lines.slice(before).pop() || '';
    const g = (k) => { const m = new RegExp(' ' + k + '=(\\w+)').exec(line); return m ? m[1] : ''; };
    out.push({ rows: n, done, long, mode: g('mode'), build: Number(g('build')), swap: Number(g('swap')), fix: Number(g('fix')), fade: Number(g('fade')) });
  }
  await ctx.close();
  return out;
}

const browser = await pw.chromium.launch({ args: ['--disable-smooth-scrolling'] });
const results = {};
try {
  for (const kind of ['text', 'photo']) {
    if (only && only !== kind) continue;
    for (const [cname, caps] of [['on', ON_CAPS], ['off', BASE_CAPS]]) {
      if (capsArg !== 'both' && capsArg !== cname) continue;
      const runs = [];
      for (let r = 0; r < RUNS; r++) runs.push(await oneRun(browser, kind, caps));
      const pagesN = runs[0].length;
      results[kind + '/' + cname] = Array.from({ length: pagesN }, (_, p) => {
        const col = (k) => runs.map((x) => x[p][k]);
        return { page: p + 1, rows: runs[0][p].rows, modes: [...new Set(col('mode'))].join('|'), doneMs: +median(col('done')).toFixed(1), longMs: +median(col('long')).toFixed(1),
          build: median(col('build')), swap: median(col('swap')), fix: median(col('fix')), fade: median(col('fade')) };
      });
    }
  }
} finally { await browser.close(); server.close(); }
console.log('harness-history (' + RUNS + ' runs, medians; CPU x4, 412x915; indicative): ' + root);
for (const [k, v] of Object.entries(results)) for (const r of v) console.log(k.padEnd(10) + ' page ' + r.page + ' rows=' + r.rows + ' mode=' + r.modes + ' done=' + r.doneMs + 'ms long=' + r.longMs + 'ms  build=' + r.build + ' swap=' + r.swap + ' fix=' + r.fix + ' fade=' + r.fade);
console.log(JSON.stringify(results));
