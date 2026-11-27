/* ==== imgurl 1c — THE LAB: pictures by a local link vs base64, and the keeper (NOT a pin module, NOT in smoke; by hand) ====
 * What it does: loads the BUILT chat shell of TWO trees, BASE (today: data: previews) and NEW (this tree), served from one loopback
 * HTTP server, in headless Chromium with an Android phone context (412 × 915, DPR 2.625, touch) and CPU × 4
 * (CDP Emulation.setCPUThrottlingRate). C# is a stand-in that pushes through executeUiCommand with base64 arguments, as
 * Utils.sendUiCommand does. The media handler answers `https://spixi-media.invalid/m/<32 hex>` with JPEG bytes made once in
 * this browser (canvas noise: a 1600 × 1200 viewer picture, 320 × 320 thumbs), `Cache-Control: no-store`,
 * `X-Content-Type-Options: nosniff`, and counts every request: --origin https (default) = a loopback TLS server on :443 (a
 * throw-away self-signed cert, `--host-resolver-rules`, no Playwright route, so the engine's own cache rules apply) ·
 * --origin route = a Playwright route (the research's first method; a route turns Chromium's HTTP cache off).
 *   (a) viewer — 1 photo row, its thumb loaded; a touchscreen tap on the tile → ixian:viewImage → the stand-in answers
 *       viewerImage(id, value) at once: base = the data: URI, new = the URL. Measured: the push script's chars and its JS time
 *       in the page, tap → full picture on glass (the first frame where the full picture's `data-pending` is gone and it is
 *       decoded), the worst frame between the tap and 300 ms after that.
 *   (b) thumbs — a 60-row open (40 text, 20 photos), then 20 setFileThumb: bridge chars (the 20 scripts), push JS ms (in page),
 *       JS heap after a forced GC 1.5 s later (CDP Runtime.getHeapUsage), the handler requests (lazy: only near the viewport).
 *   (c) re-render — after (b), 10 live text arrivals 300 ms apart: handler requests during them, frames with a blank photo tile
 *       in the viewport (a tile that showed its picture before the arrivals and in that frame is not `loaded` or whose <img> is
 *       not decoded), how many of those tiles hold a NEW <img> element at the end (the keeper: 0), the worst frame.
 *   Variants: base·data (caps: the common list) · new·data (no new cap = the switch OFF) · new·url (`mediaOrigin`) ·
 *   new·url+keep (`mediaOrigin,mediaKeep`). (a) and (b) run base·data vs new·url+keep; (c) runs all four.
 * USAGE: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-imgurl/lab-media.mjs
 *   [--base <html dir>] [--new <html dir>] [--runs 5] [--origin https|route] [--only viewer|thumbs] [--json <file>]
 *   (runs as root for :443, or pass --media-port and map it yourself). LAB_CHROME=<path> picks another Chromium; the default is
 *   Playwright's own (Chrome 158 in the cloud twin): /usr/bin/google-chrome closes the page at the shell's first ixian: tap.
 *   --base default /home/claude/scratch/c/base-html (a copy of the base tree's built html, read only) · --new default this tree's
 *   Spixi/Resources/Raw/html · --json default /home/claude/scratch/c/lab.json (every run). Prints the median and range table.
 *   Heap = Runtime.getHeapUsage usedSize + embedderHeapUsedSize + backingStorageSize after a forced GC (a big atob result is
 *   an external string outside V8's own heap); the JSON also keeps performance.memory.usedJSHeapSize (precise memory info).
 * LIMITS: lab (direction) numbers, NOT device numbers: Chromium desktop engine with a CPU throttle, not the Android WebView nor
 *   WebKit (iOS / Mac: the `spixi-media://` scheme is not served here, so the https prefix stands for both); the handler answers
 *   at once from memory (no decode, no IO thread); C#'s side (thumb
 *   decode, the .NET string copies of the base64) is not in these numbers; a tap is a CDP touch, the stand-in answers at once.
 * Exit 0 = ran (the table is the result) · 2 = the setup cannot run. One run at a time; never beside the full smoke (L153). */
import { createServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { readFileSync, writeFileSync, existsSync, statSync, realpathSync } from 'node:fs';
import { join, extname, normalize, sep, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const DIRS = { base: resolve(arg('--base', '/home/claude/scratch/c/base-html')), new: resolve(arg('--new', join(repo, 'Spixi/Resources/Raw/html'))) };
const RUNS = Number(arg('--runs', '5'));
const JSON_OUT = arg('--json', '/home/claude/scratch/c/lab.json');
const ONLY = arg('--only', '');   // viewer | thumbs (default both)
/* --origin https (default): the handler is a real TLS server on loopback (a throw-away self-signed cert), the host mapped by
   --host-resolver-rules, NO Playwright route (a route turns Chromium's HTTP / memory cache off) — the engine's own cache rules
   apply, as for C#'s handler. --origin route: the handler is a Playwright route (the research's first method). */
const ORIGIN_MODE = arg('--origin', 'https');
const say = (m) => process.stderr.write('lab-media: ' + m + '\n');
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('lab-media: Playwright not found — set PLAYWRIGHT_MODULE'); process.exit(2); }
for (const d of Object.values(DIRS)) if (!existsSync(join(d, 'chat.html'))) { console.error('lab-media: ' + d + '/chat.html is missing'); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── the loopback server: /base/… and /new/… ── */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.json': 'application/json' };
const server = createServer((req, res) => {
  try {
    const u = decodeURIComponent(String(req.url || '/').split('?')[0]);
    const m = /^\/(base|new)(\/.*)$/.exec(u);
    const dir = m && DIRS[m[1]];
    const p = dir ? normalize(join(dir, m[2])) : '';
    if (!dir || !p.startsWith(dir + sep) || !existsSync(p) || !statSync(p).isFile() || !realpathSync(p).startsWith(realpathSync(dir) + sep)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(readFileSync(p));
  } catch (e) { if (!res.headersSent) res.writeHead(400); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://127.0.0.1:' + server.address().port + '/';
/* the https stand-in for C#'s media handler (same bytes, same headers as the route) */
let mediaHits = [];
let mediaPort = 0;
let mediaServer = null;
function mediaAnswer(u) {
  const m = /^\/m\/([0-9a-f]{32})$/.exec(u);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return n === 0xfeed ? J.viewerBytes : J.thumbBytes[(n - 1) % 20];
}
const MEDIA_HEADERS = { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
if (ORIGIN_MODE === 'https') {
  const dir = mkdtempSync(join(tmpdir(), 'labcert-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=spixi-media.invalid', '-addext', 'subjectAltName=DNS:spixi-media.invalid',
    '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem')], { stdio: 'ignore' });
  mediaServer = createHttpsServer({ key: readFileSync(join(dir, 'k.pem')), cert: readFileSync(join(dir, 'c.pem')) }, (req, res) => {
    const body = mediaAnswer(String(req.url || ''));
    mediaHits.push({ at: Date.now(), u: req.url });
    if (!body) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, MEDIA_HEADERS);
    res.end(body);
  });
  await new Promise((r, j) => { mediaServer.once('error', j); mediaServer.listen(Number(arg('--media-port', '443')), '127.0.0.1', r); });   // 443: the URL has no port
  mediaPort = mediaServer.address().port;
}

const LAUNCH_ARGS = ['--no-proxy-server', '--enable-precise-memory-info'];
/* the container's proxy must never see the loopback hosts: Chromium reads the proxy from the environment first */
const LAUNCH_ENV = { ...process.env, no_proxy: '*', NO_PROXY: '*' };
for (const k of ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']) delete LAUNCH_ENV[k];
const browser = await pw.chromium.launch({ ...(process.env.LAB_CHROME ? { executablePath: process.env.LAB_CHROME } : {}), env: LAUNCH_ENV, args: LAUNCH_ARGS });
/* the measuring browser of the https mode: the media host mapped to the loopback TLS server */
const mbrowser = ORIGIN_MODE === 'https'
  ? await pw.chromium.launch({ ...(process.env.LAB_CHROME ? { executablePath: process.env.LAB_CHROME } : {}), env: LAUNCH_ENV,
    args: [...LAUNCH_ARGS, '--host-resolver-rules=MAP spixi-media.invalid 127.0.0.1', '--ignore-certificate-errors'] })
  : browser;

/* ── the pictures, made once in this browser (noise → realistic JPEG sizes) ── */
async function makeJpegs() {
  const p = await browser.newPage();
  const out = await p.evaluate(() => {
    const mk = (w, h, seed, q) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'hsl(' + (seed * 37 % 360) + ',60%,55%)'); g.addColorStop(1, 'hsl(' + (seed * 91 % 360) + ',50%,35%)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      const im = x.getImageData(0, 0, w, h); let s = seed * 9973 + 1;
      for (let i = 0; i < im.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const n = (s % 41) - 20; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; }
      x.putImageData(im, 0, 0);
      return c.toDataURL('image/jpeg', q);
    };
    const thumbs = []; for (let i = 0; i < 20; i++) thumbs.push(mk(320, 320, i + 1, 0.8));
    return { viewer: mk(1600, 1200, 99, 0.86), thumbs };
  });
  await p.close();
  const bytes = (u) => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64');
  return { viewerUri: out.viewer, thumbUris: out.thumbs, viewerBytes: bytes(out.viewer), thumbBytes: out.thumbs.map(bytes) };
}
const J = await makeJpegs();

const hex = (n) => n.toString(16).padStart(32, '0');
const idOf = (j) => (0xb000 + j).toString(16).padStart(8, '0') + '1abcafe'.padEnd(24, '0');
const urlOf = (n) => 'https://spixi-media.invalid/m/' + hex(n);
const VIEWER_URL = urlOf(0xfeed);
const T_NEWEST = 1767247200;
const COMMON_CAPS = 'reply,edit,voice,media,photoTileLite';
const VARIANTS = {
  'base·data': { tree: 'base', caps: COMMON_CAPS, url: false },
  'new·data': { tree: 'new', caps: COMMON_CAPS, url: false },
  'new·url': { tree: 'new', caps: COMMON_CAPS + ',mediaOrigin', url: true },
  'new·url+keep': { tree: 'new', caps: COMMON_CAPS + ',mediaOrigin,mediaKeep', url: true },
};

/* rows: n rows; the photos are every other row at the log's end (20 photos in 60 rows) */
function rowsFor(n, photos) {
  const items = [];
  const photoAt = new Set();
  if (photos) for (let k = 0; k < photos; k++) photoAt.add(n - 1 - k * 2);   // every other row of the newest 2 × photos: several tiles on screen
  const thumbOf = new Map();
  let pi = 0;
  for (let j = 0; j < n; j++) {
    const mine = j % 2 === 1;
    const ts = String(T_NEWEST - (n - 1 - j) * 120);
    const id = idOf(j);
    if (photoAt.has(j)) {
      items.push({ f: 'addFile', a: [id, mine ? 'addrMe' : 'addrPeer', mine ? 'Me' : 'Ana', '', 'f' + id.slice(0, 16), 'IMG_' + j + '.jpg', ts, mine ? 'True' : 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '', '', ''] });
      thumbOf.set(id, pi++);
    } else {
      items.push({ f: mine ? 'addMe' : 'addThem', a: [id, mine ? 'addrMe' : 'addrPeer', mine ? 'Me' : 'Ana', '', 'Line ' + j + ' of the lab chat, a few words long.', ts, 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '', ''] });
    }
  }
  return { items, thumbOf };
}

const PAGE_INIT = () => {
  window.__b64 = (v) => btoa(unescape(encodeURIComponent(String(v))));
  window.__pushMs = 0;
  window.__frames = [];
  const tick = (t) => { window.__frames.push(t); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  document.addEventListener('pointerdown', () => { window.__tapAt = performance.now(); }, true);
};
const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
/* the script C# would evaluate (base64 args), timed inside the page */
const scriptOf = (fn, ...a) => 'executeUiCommand(window.' + fn + ',' + a.map((x) => JSON.stringify(b64(x))).join(',') + ')';
const timed = (script) => '(()=>{const t0=performance.now();' + script + ';window.__pushMs+=performance.now()-t0;})()';

async function session(vname) {
  const v = VARIANTS[vname];
  const ctx = await mbrowser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  const hits = [];
  mediaHits = [];
  if (ORIGIN_MODE === 'route') await ctx.route('**/*', (rt) => {
    const u = rt.request().url();
    if (u.startsWith(ORIGIN)) return rt.continue();
    const m = /^https:\/\/spixi-media\.invalid\/m\/([0-9a-f]{32})$/.exec(u);
    if (m) {
      hits.push({ at: Date.now(), u });
      const n = parseInt(m[1], 16);
      const body = n === 0xfeed ? J.viewerBytes : J.thumbBytes[(n - 1) % 20];
      return rt.fulfill({ status: 200, body, headers: MEDIA_HEADERS });
    }
    return rt.abort();
  });
  const page = await ctx.newPage();
  await page.addInitScript(PAGE_INIT);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Page.enable');
  await cdp.send('HeapProfiler.enable');
  const sends = [];
  cdp.on('Page.frameRequestedNavigation', (e) => { if (String(e.url).startsWith('ixian:')) sends.push(String(e.url)); });
  page.on('pageerror', (e) => console.error('[' + vname + '] pageerror: ' + e.message));
  page.on('crash', () => console.error('[' + vname + '] page CRASHED'));
  await page.goto(ORIGIN + v.tree + '/chat.html?mobile=1');
  await sleep(700);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const ev = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const push = async (fn, ...a) => { const s = scriptOf(fn, ...a); await ev(timed(s)); return s.length; };
  const open = async (rows) => {
    await push('onChatScreenReady', 'addrPeer');
    await push('setNickname', 'Lab Ana');
    await push('setChatMode', '0', '0', '', 'False');
    await push('setCaps', v.caps);
    await push('setPhotoPreviews', 'True');
    await push('clearMessages', 'true');
    await push('addMessages', JSON.stringify({ strs: [], items: rows.items }), 'append');
    await push('messagesDone');
    await push('onChatScreenLoaded');
    await sleep(1200);
  };
  const thumbValue = (i) => (v.url ? urlOf(i + 1) : J.thumbUris[i]);
  const H = ORIGIN_MODE === 'route' ? hits : { get length() { return mediaHits.length; } };
  return { v, ctx, page, cdp, ev, push, open, hits: H, sends, thumbValue, close: () => ctx.close() };
}
/* JS heap after a forced GC: V8's own heap PLUS the external strings Blink hands V8 (a big atob / base64 result lives
   outside V8's heap): Runtime.getHeapUsage usedSize + embedderHeapUsedSize + backingStorageSize */
const heapMB = async (S) => {
  await S.cdp.send('HeapProfiler.collectGarbage');
  const h = await S.cdp.send('Runtime.getHeapUsage');
  return ((h.usedSize || 0) + (h.embedderHeapUsedSize || 0) + (h.backingStorageSize || 0)) / 1048576;
};
const heapParts = async (S) => { await S.cdp.send('HeapProfiler.collectGarbage'); const h = await S.cdp.send('Runtime.getHeapUsage'); const pm = await S.ev('performance.memory ? performance.memory.usedJSHeapSize : 0'); return { ...h, pm }; };
const worstFrame = (frames, from, to) => { let w = 0; for (let i = 1; i < frames.length; i++) if (frames[i] >= from && frames[i - 1] <= to) w = Math.max(w, frames[i] - frames[i - 1]); return w; };

async function runViewer(vname) {
  const S = await session(vname);
  const rows = rowsFor(12, 1);
  await S.open(rows);
  const [id] = [...rows.thumbOf.keys()];
  await S.push('setFileThumb', id, S.thumbValue(0));
  await S.page.waitForFunction((i) => { const t = document.querySelector('[data-msgid="' + i + '"] .c-mbubble'); return t && t.dataset.state === 'loaded'; }, id, { timeout: 15000 });
  await sleep(600);
  const box = await S.page.locator('[data-msgid="' + id + '"] .c-mbubble').boundingBox();
  const full = S.v.url ? VIEWER_URL : J.viewerUri;
  await S.ev('window.__full=' + JSON.stringify(full) + ';window.__pushMs=0;window.__glass=0;(function poll(){const im=document.querySelector(".c-mviewer__img");if(im&&im.getAttribute("src")===window.__full&&!im.hasAttribute("data-pending")&&im.complete&&im.naturalWidth>0){window.__glass=performance.now();return;}requestAnimationFrame(poll);})()');
  S.sends.length = 0;
  await S.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  const t0 = Date.now();
  while (!S.sends.some((u) => u === 'ixian:viewImage:' + id) && Date.now() - t0 < 5000) await sleep(5);
  const chars = await S.push('viewerImage', id, full);
  await S.page.waitForFunction(() => window.__glass > 0, null, { timeout: 15000 });
  await sleep(400);
  const r = await S.ev('({tap:window.__tapAt,glass:window.__glass,push:window.__pushMs,frames:window.__frames.slice(-400)})');
  const out = { chars, pushMs: r.push, tapToFull: r.glass - r.tap, worst: worstFrame(r.frames, r.tap, r.glass + 300), heap: await heapMB(S), hits: S.hits.length };
  await S.close();
  return out;
}

async function runThumbs(vname, withRerender) {
  const S = await session(vname);
  const rows = rowsFor(60, 20);
  await S.open(rows);
  await S.ev('window.__pushMs=0');
  let chars = 0;
  for (const [id, i] of rows.thumbOf) chars += await S.push('setFileThumb', id, S.thumbValue(i));
  const pushMs = await S.ev('window.__pushMs');
  await sleep(1500);
  const heap = await heapMB(S);
  const parts = await heapParts(S);
  const hitsOpen = S.hits.length;
  const out = { chars, pushMs, heap, hitsOpen, parts };
  if (withRerender) {
    /* the tiles that show a picture now and are in the viewport */
    await S.ev('window.__shown=[...document.querySelectorAll("#messages .c-mbubble[data-file]")].filter(t=>{const r=t.getBoundingClientRect();return t.dataset.state==="loaded"&&r.bottom>0&&r.top<innerHeight;}).map(t=>t.closest("[data-msgid]").dataset.msgid);'
      + 'window.__imgs0=new Map(window.__shown.map(id=>[id,document.querySelector("#messages [data-msgid=\\""+id+"\\"] .c-mbubble__img")]));window.__blank=0;window.__rrOn=true;(function watch(){if(!window.__rrOn)return;let b=false;for(const id of window.__shown){const t=document.querySelector("#messages [data-msgid=\\""+id+"\\"] .c-mbubble[data-file]");const im=t&&t.querySelector(".c-mbubble__img");const r=t&&t.getBoundingClientRect();if(!t||r.bottom<=0||r.top>=innerHeight)continue;if(t.dataset.state!=="loaded"||!im||!im.complete||!(im.naturalWidth>0))b=true;}if(b)window.__blank++;requestAnimationFrame(watch);})();window.__rr0=performance.now();');
    const h0 = S.hits.length;
    for (let k = 0; k < 10; k++) {
      await S.push('addThem', 'f' + hex(0x5000 + k).slice(1), 'addrPeer', 'Ana', '', 'live ' + k, String(T_NEWEST + 60 + k), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '', '');
      await sleep(300);
    }
    await sleep(600);
    const r = await S.ev('window.__rrOn=false;({blank:window.__blank,shown:window.__shown.length,rebuilt:[...window.__imgs0].filter(([id,im])=>document.querySelector("#messages [data-msgid=\\""+id+"\\"] .c-mbubble__img")!==im).length,rows:document.querySelectorAll("#messages [data-msgid]").length,t0:window.__rr0,t1:performance.now(),frames:window.__frames.slice(-2000)})');
    Object.assign(out, { rrHits: S.hits.length - h0, blank: r.blank, shown: r.shown, rebuilt: r.rebuilt, rows: r.rows, rrWorst: worstFrame(r.frames, r.t0, r.t1) });
  }
  await S.close();
  return out;
}

const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const fmt = (a, d = 1) => { const m = med(a); return m.toFixed(d) + ' (' + Math.min(...a).toFixed(d) + '–' + Math.max(...a).toFixed(d) + ')'; };
const all = { meta: { runs: RUNS, cpu: 4, origin: ORIGIN_MODE, chromium: browser.version(), viewport: '412x915@2.625', dirs: DIRS, viewerJpegBytes: J.viewerBytes.length, viewerUriChars: J.viewerUri.length,
  thumbJpegBytesAvg: Math.round(J.thumbBytes.reduce((a, b) => a + b.length, 0) / 20), thumbUriCharsAvg: Math.round(J.thumbUris.reduce((a, b) => a + b.length, 0) / 20) }, viewer: {}, thumbs: {} };
console.log('lab-media: ' + JSON.stringify(all.meta));
if (ONLY !== 'thumbs') for (let i = 0; i < RUNS; i++) for (const vn of ['base·data', 'new·url+keep']) {   // interleaved: base and new back to back
  (all.viewer[vn] = all.viewer[vn] || []).push(await runViewer(vn));
  say('viewer ' + vn + ' run ' + (i + 1) + ' ' + JSON.stringify(all.viewer[vn][i]));
}
if (ONLY !== 'viewer') for (let i = 0; i < RUNS; i++) for (const vn of Object.keys(VARIANTS)) {
  (all.thumbs[vn] = all.thumbs[vn] || []).push(await runThumbs(vn, true));
  say('thumbs ' + vn + ' run ' + (i + 1) + ' ' + JSON.stringify(all.thumbs[vn][i]));
}
writeFileSync(JSON_OUT, JSON.stringify(all, null, 1));
console.log('\n(a) viewer — 1600×1200 JPEG ' + J.viewerBytes.length + ' B; median (range), ' + RUNS + ' runs');
console.log('| variant | push chars | push JS ms | tap→full ms | worst frame ms | heap MB | handler hits |');
for (const [vn, rs] of Object.entries(all.viewer)) console.log('| ' + vn + ' | ' + fmt(rs.map((r) => r.chars), 0) + ' | ' + fmt(rs.map((r) => r.pushMs), 2) + ' | ' + fmt(rs.map((r) => r.tapToFull)) + ' | ' + fmt(rs.map((r) => r.worst)) + ' | ' + fmt(rs.map((r) => r.heap), 2) + ' | ' + fmt(rs.map((r) => r.hits), 0) + ' |');
console.log('\n(b) 20 thumbs after a 60-row open · (c) 10 live arrivals after them');
console.log('| variant | bridge chars | push JS ms | heap MB | usedJSHeapSize MB | requests at open | re-render requests | shown tiles | new <img> on them | blank-tile frames | worst frame ms (c) |');
for (const [vn, rs] of Object.entries(all.thumbs)) console.log('| ' + vn + ' | ' + fmt(rs.map((r) => r.chars), 0) + ' | ' + fmt(rs.map((r) => r.pushMs), 2) + ' | ' + fmt(rs.map((r) => r.heap), 2) + ' | ' + fmt(rs.map((r) => r.parts.pm / 1048576), 2) + ' | ' + fmt(rs.map((r) => r.hitsOpen), 0) + ' | ' + fmt(rs.map((r) => r.rrHits), 0) + ' | ' + fmt(rs.map((r) => r.shown), 0) + ' | ' + fmt(rs.map((r) => r.rebuilt), 0) + ' | ' + fmt(rs.map((r) => r.blank), 0) + ' | ' + fmt(rs.map((r) => r.rrWorst)) + ' |');
await browser.close();
if (mbrowser !== browser) await mbrowser.close();
server.close();
if (mediaServer) mediaServer.close();
