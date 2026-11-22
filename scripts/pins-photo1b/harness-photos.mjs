/* ==== photo1b (agent `tile`) — the harness: the open of a photo chat and of a voice chat, caps ON vs OFF (NOT a pin module, NOT in smoke) ====
 * Headless Chromium (Playwright), the BUILT chat.html, 412 × 915 phone, the CPU slowed ×4 by CDP `Emulation.setCPUThrottlingRate`.
 * The page gets its caps by a `setCaps` push BEFORE the history (like C#); the history goes in as C#'s batch transport does:
 * onChatScreenReady → setChatMode → setCaps → setPhotoPreviews → clearMessages → addMessages(batch JSON) → messagesDone →
 * onChatScreenLoaded; then the previews (setFileThumb × 48, a 320 × 320 JPEG each, drawn in the page) / voiceInfo × 20 AFTER messagesDone.
 *   photo chat : Seed 56-like — 50 rows, 48 photo `addFile` rows (complete, local, both directions) + 2 text rows
 *   voice chat : 30 rows — 20 voice (10 inline, 10 voice files) + 10 text rows
 * Reported per leg (median of N runs, default 5): `messagesDone` (the open's renderLogNow, a synchronous push → ms), the 48 `setFileThumb`
 * pushes (their summed synchronous time), the time from the first push to the last picture shown (all tiles `loaded`), the number of DOM
 * nodes in the log; the voice leg: the 20 `voiceInfo` pushes (sum) and the nodes.
 * INDICATIVE only: one headless Chromium on a shared 2-core machine; the lead re-measures sequentially (L153).
 * Run: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-photo1b/harness-photos.mjs [--root <tree>] [--caps on|off] [--runs 5] [--only photo|voice]
 * Exit 0 · 2 = the setup cannot run (no Playwright / no Chromium). */
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const root = arg('--root', join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const capsSel = arg('--caps', 'both');
const ONLY = arg('--only', '');
const RUNS = Math.max(1, Number(arg('--runs', '5')) || 5);
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('harness-photos: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
const URL = pathToFileURL(join(root, 'Spixi/Resources/Raw/html/chat.html')).href + '?mobile=1';
const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const BASE_CAPS = 'reply,edit,voice,media';
const CAPS = { on: BASE_CAPS + ',photoTileLite,voiceWaveLite', off: BASE_CAPS };
const med = (a) => { const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r1 = (v) => Math.round(v * 10) / 10;

/* runs INSIDE the page */
const LEG = async ({ kind, caps }) => {
  const b64 = (v) => btoa(unescape(encodeURIComponent(String(v))));
  const push = (fn, ...a) => window.executeUiCommand(window[fn], ...a.map(b64));
  const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
  const T0 = 1700000000;
  const jpeg = (i) => {   // a 320 × 320 JPEG, different per index (a decode that is not shared by URL)
    const c = document.createElement('canvas'); c.width = 320; c.height = 320;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 320, 320);
    g.addColorStop(0, 'hsl(' + ((i * 37) % 360) + ',70%,55%)'); g.addColorStop(1, 'hsl(' + ((i * 37 + 120) % 360) + ',60%,35%)');
    x.fillStyle = g; x.fillRect(0, 0, 320, 320);
    for (let k = 0; k < 30; k++) { x.fillStyle = 'hsla(' + ((i * 11 + k * 23) % 360) + ',80%,60%,0.5)'; x.beginPath(); x.arc((k * 53 + i * 7) % 320, (k * 97 + i * 13) % 320, 14 + (k % 5) * 6, 0, 7); x.fill(); }
    return c.toDataURL('image/jpeg', 0.6);
  };
  const hex = (i) => (0xa000 + i).toString(16).padStart(32, '0');
  const items = [];
  const text = (id, mine, t, ts) => ({ f: mine ? 'addMe' : 'addThem', a: mine
    ? [id, 'addrMe', 'Me', '', t, String(ts), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '']
    : [id, 'addrPeer', 'Ana', '', t, String(ts), 'True', 'True', 'True', 'False', 'False'] });
  let ids = [];
  if (kind === 'photo') {
    items.push(text('t0', false, 'their words', T0 - 120), text('t1', true, 'my words', T0 - 60));
    for (let i = 0; i < 48; i++) {
      const mine = i % 2 === 1;
      items.push({ f: 'addFile', a: ['p' + i, mine ? 'addrMe' : 'addrPeer', mine ? 'Me' : 'Ana', '', 'xp' + i, 'img' + i + '.jpg', String(T0 + i * 60), mine ? 'True' : 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '', '', ''] });
      ids.push('p' + i);
    }
  } else {
    for (let i = 0; i < 10; i++) items.push(text('t' + i, i % 2 === 1, 'row ' + i, T0 + i * 30));
    for (let i = 0; i < 20; i++) {
      const mine = i % 2 === 1;
      const id = hex(i);
      if (i < 10) items.push({ f: mine ? 'addMe' : 'addThem', a: mine
        ? [id, 'addrMe', 'Me', '', '🎤 0:08', String(T0 + 400 + i * 60), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '8000']
        : [id, 'addrPeer', 'Ana', '', '🎤 0:08', String(T0 + 400 + i * 60), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '', '8000'] });
      else items.push({ f: 'addFile', a: [id, mine ? 'addrMe' : 'addrPeer', mine ? 'Me' : 'Ana', '', 'vf' + i, 'voice-' + i + '.ogg', String(T0 + 400 + i * 60), mine ? 'True' : 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '1'] });
      ids.push(id);
    }
  }
  push('onChatScreenReady', 'addrPeer');
  push('setChatMode', '0', '0', '', 'False');
  push('setCaps', caps);
  push('setPhotoPreviews', 'True');
  push('clearMessages', 'false');
  push('addMessages', JSON.stringify({ strs: [], items }), 'append');
  const t0 = performance.now();
  push('messagesDone');
  const tDone = performance.now() - t0;
  push('onChatScreenLoaded');
  await raf(); await raf(); await new Promise((r) => setTimeout(r, 150));
  const res = { done: tDone };
  if (kind === 'photo') {
    const uris = ids.map((_, i) => jpeg(i));   // drawn BEFORE the timer: the page work is the push, not the canvas
    const q = performance.now();
    let sum = 0;
    for (let i = 0; i < ids.length; i++) { const a = performance.now(); push('setFileThumb', ids[i], uris[i]); sum += performance.now() - a; }
    res.thumbs = sum;
    const tiles = [...document.querySelectorAll('#messages .c-mbubble[data-file]')];
    await new Promise((resolve) => {
      const tick = () => { if (tiles.every((t) => t.dataset.state === 'loaded') || performance.now() - q > 8000) resolve(); else requestAnimationFrame(tick); };
      tick();
    });
    res.shown = performance.now() - q;
    res.shownAll = tiles.every((t) => t.dataset.state === 'loaded');
    res.faces = document.querySelectorAll('#messages .c-mbubble__file').length;
  } else {
    const peaks = Array.from({ length: 40 }, (_, i) => (i * 7) % 101).join(',');
    let sum = 0;
    for (let i = 0; i < ids.length; i++) { const a = performance.now(); push('voiceInfo', ids[i], '8000', peaks); sum += performance.now() - a; }
    res.info = sum;
    let s2 = 0;
    for (let i = 0; i < ids.length; i++) { const a = performance.now(); push('voiceInfo', ids[i], '8000', peaks); s2 += performance.now() - a; }
    res.infoAgain = s2;
  }
  res.nodes = document.querySelectorAll('#messages *').length;
  return res;
};

let browser;
try { browser = await pw.chromium.launch({ args: ['--no-sandbox'] }); }
catch (e) { console.error('harness-photos: Chromium cannot start — ' + e.message); process.exit(2); }
const legs = [];
const which = capsSel === 'both' ? ['off', 'on'] : [capsSel];
/* the runs of the two settings are INTERLEAVED (off, on, off, on …) so a drift of the machine's load hits both alike */
for (const kind of ['photo', 'voice'].filter((k) => !ONLY || k === ONLY)) {
  const byCap = Object.fromEntries(which.map((w) => [w, []]));
  for (let n = 0; n < RUNS; n++) for (const sel of which) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, userAgent: PHONE_UA, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e.message || e)));
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(URL);
    await page.waitForFunction(() => typeof window.executeUiCommand === 'function');
    await page.waitForTimeout(800);
    const r = await page.evaluate(LEG, { kind, caps: CAPS[sel] });
    r.errs = errs.length;
    byCap[sel].push(r);
    await ctx.close();
  }
  for (const sel of which) legs.push({ kind, sel, runs: byCap[sel] });
}
await browser.close();
const out = [];
for (const L of legs) {
  const m = (k) => r1(med(L.runs.map((r) => r[k] || 0)));
  const row = { leg: L.kind, caps: L.sel, runs: L.runs.length, messagesDone_ms: m('done'), nodes: m('nodes'), errs: L.runs.reduce((a, r) => a + r.errs, 0) };
  if (L.kind === 'photo') Object.assign(row, { setFileThumb_x48_ms: m('thumbs'), shown_ms: m('shown'), allShown: L.runs.every((r) => r.shownAll), faces: m('faces') });
  else Object.assign(row, { voiceInfo_x20_ms: m('info'), voiceInfo_again_x20_ms: m('infoAgain') });
  out.push(row);
}
for (const row of out) console.log(JSON.stringify(row));
console.log('(indicative: headless Chromium, CPU x4, shared 2-core machine; median of ' + RUNS + ')');
