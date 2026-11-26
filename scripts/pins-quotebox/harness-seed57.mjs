/* ==== quotebox — the SEED 57 harness (NOT a pin module, NOT in smoke; Playwright Chromium, run by hand) ====
 * Reproduces walk row W-5 of docs/walk-histcs.md off the device: the BUILT chat.html of a tree in headless Chromium,
 * a Seed-57-like history (1000 text rows, the four replies and targets of Spixi/Utils/SDevSeedPlan.cs § 4, 32-hex ids),
 * a small C# stand-in that answers the shell's own sends (ixian:loadmore → the next older page as addMessages(json,
 * "prepend") + messagesDone; ixian:quotejump:<id> → a widening prepend down to the target + jumpToMessage). The quote
 * fields of each reply are what SingleChatPage.insertMessage pushes: replyTo = the target id when C# MATCHED the line,
 * "" when it did not (ReplyQuote.fallbackOf, Damir P2) — `--match` picks which replies the stand-in reports as matched.
 * Modes: desktop (default 1280 × 800 dpr 1, ?desktop=1, mouse: page.mouse.move + click at the quote box's centre) · phone
 * (412 × 915, touch: page.touchscreen.tap). For each of REPLY A … D: scroll up with the wheel (phone: scrollTop 0) until
 * its row exists (older pages load), put the row in view, click its quote box, and record what the shell SENT
 * (ixian:quotejump:… or nothing), whether the target row was loaded and pulsed (data-mention-pulse ~1.2 s after the
 * click), whether a toast showed, and the box itself (tag, sender line, computed cursor, the element under its centre).
 * Usage: PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.mjs node scripts/pins-quotebox/harness-seed57.mjs
 *        [--root <tree>] [--mode desktop|phone] [--match ABCD] [--update <letters>] [--fresh] [--place center|top|asloaded]
 *        [--context] [--drop <letters> [--drop-prepend]] [--nojump <letters>] [--press-prepend <letters>] [--caps <list>]
 *        [--vw 1280 --vh 800 --dpr 1] [--json]
 *   --match <letters>: the replies the stand-in reports as matched (the others: replyTo "", quoteName "").
 *   --update <letters>: after the reply's row is on screen, ONE full-form updateMessage for that reply with replyTo "" (what
 *   C#'s live re-match pushes when its index lacks the target).
 *   --fresh: a new document (goto + the open) before each reply after the first — the walk's "close and open again".
 *   --place: where the row sits when clicked (asloaded = left where the wheel left it; may be off screen).
 *   --context: after the click, a RIGHT-click on the box (does the message menu .c-msgmenu open?), then Esc.
 *   --drop <letters>: the stand-in leaves those replies' ixian:quotejump UNANSWERED (C#'s silent returns in onQuoteJump);
 *   --drop-prepend: and one older page lands ~700 ms after that click (300 ms before the stand-in runs + 400 ms; the lazy
 *   loader fires near the top). "landed" is read ~1.2 s after the click, the toast ~2.6 s after it (the shell's wait is 2 s).
 *   --nojump <letters>: the stand-in sends the widened rows for those replies' jump but NOT jumpToMessage (pushPendingJump's
 *   silent returns); the harness then clicks the same box a SECOND time and reports whether that one lands.
 *   --press-prepend <letters>: one older page lands INSIDE the press of those replies (mouse down, the page, ~110 ms, mouse up;
 *   phone: CDP touchStart … touchEnd). --caps <list>: the caps pushed at the open (default: with olderInsert, olderAnchor1);
 *   without olderInsert every older page repaints the whole log (renderLogNow replaces every row).
 * LIMITS: the shell only, in Chromium; the C# stand-in follows the push SHAPES of the base (no C# load, no threads, no
 * Core files); WebView2's native host and input routing are not here. The server binds 127.0.0.1 and serves only regular
 * files under the built html folder (real path checked); the browser context aborts every HTTP(S) request to any other
 * origin (WebSockets are not routed; the shell opens none). One run at a time; never beside the full smoke (L153).
 * Exit 0 = ran (the table is the result) · 1 = the run failed (the server is closed) · 2 = the setup cannot run. */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, realpathSync } from 'node:fs';
import { join, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const root = arg('--root', join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const MODE = arg('--mode', 'desktop');
const MATCH = arg('--match', 'ABCD');
const UPDATE = arg('--update', '');
const JSON_OUT = argv.includes('--json');
const FRESH = argv.includes('--fresh');           // a fresh document (close + reopen) before each reply
const CONTEXT = argv.includes('--context');      // desktop: also a right-click on the quote box (does the message menu open?)
const DROP = arg('--drop', '');                    // replies whose ixian:quotejump the stand-in leaves UNANSWERED (C#'s silent returns)
const DROP_PREPEND = argv.includes('--drop-prepend');   // … and one older page lands ~700 ms after that click (the lazy loader near the top)
const NOJUMP = arg('--nojump', '');                // replies whose jump C# answers with the rows but no jumpToMessage
const PRESS_PREPEND = arg('--press-prepend', '');   // replies whose press (mouse down … up / touch start … end) has an older page land inside it
const CAPS = arg('--caps', 'reply,edit,voice,media,olderInsert,olderAnchor1,fadeBand');   // the shell caps C# pushes (without olderInsert: every older page paints in full)
const PLACE = arg('--place', 'center');            // where the reply's row sits when it is clicked: center | top | asloaded
const VW = Number(arg('--vw', '1280')), VH = Number(arg('--vh', '800')), DPR = Number(arg('--dpr', '1'));   // desktop viewport (the chat pane) and scale
const PWM = process.env.PLAYWRIGHT_MODULE || 'playwright';
let pw;
try { pw = await import(PWM.startsWith('/') ? pathToFileURL(PWM).href : PWM); }
catch (e) { console.error('harness-seed57: Playwright not found — set PLAYWRIGHT_MODULE to its index.mjs'); process.exit(2); }
const HTML_DIR = join(root, 'Spixi/Resources/Raw/html');
if (!existsSync(join(HTML_DIR, 'chat.html'))) { console.error('harness-seed57: no built chat.html under ' + HTML_DIR); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── the Seed 57 plan (SDevSeedPlan.cs § 4, copied: depth = how many rows are newer) ── */
const N = 1000;
const LINES = ['Did you see the forecast for the weekend?', 'Yes, rain on Saturday and sun on Sunday.', 'Let us move the hike to Sunday then.',
  'Good idea. Same time, eight in the morning?', 'Eight is fine. I will bring the map.', 'Do not forget the water bottles.',
  'Packed already. Who drives?', 'I can drive, my car has four seats.', 'Great, see you at the station.', 'See you there.'];
const R = [
  { k: 'A', rd: 0, td: 320, mine: false, t: 'QUOTE TARGET A — the blue boat leaves at noon.', b: 'REPLY A — yes, I will be at the boat by noon.' },
  { k: 'B', rd: 1, td: 415, mine: true, t: 'QUOTE TARGET B — the red key is under the mat.', b: 'REPLY B — found the key, thanks.' },
  { k: 'C', rd: 170, td: 485, mine: true, t: 'QUOTE TARGET C — the green door opens at nine.', b: 'REPLY C — nine is fine for the green door.' },
  { k: 'D', rd: 230, td: 640, mine: false, t: 'QUOTE TARGET D — the yellow bike needs a new chain.', b: 'REPLY D — I will buy the chain tomorrow.' },
];
const idOf = (j) => (0xa000 + j).toString(16).padStart(8, '0') + '5eed57'.padEnd(24, '0');   // 32 hex, unique per row
const rowsPlan = [];
for (let j = 0; j < N; j++) rowsPlan.push({ j, mine: j % 2 === 1, text: LINES[j % LINES.length] + ' (row ' + (j + 1) + ')' });
for (const r of R) { const t = rowsPlan[N - 1 - r.td]; t.mine = !r.mine; t.text = r.t; }
for (const r of R) {
  const x = rowsPlan[N - 1 - r.rd];
  x.mine = r.mine; x.text = r.b; x.reply = r;
}
const T_NEWEST = 1767247200;   // 2026-01-01 06:00 UTC (QuoteAnchor)
rowsPlan.forEach((x, i) => { x.ts = T_NEWEST - (N - 1 - i) * 120; });
/* one row as insertMessage pushes it (addMe / addThem, 18 args) */
function pushRow(x) {
  const r = x.reply;
  const matched = r && MATCH.includes(r.k);
  const target = r ? rowsPlan[N - 1 - r.td] : null;
  const replyTo = r ? (matched ? idOf(target.j) : '') : '';
  const qName = r ? (matched ? (target.mine ? '\u0001me' : '\u0001peer') : '') : '';
  const qText = r ? r.t : '';
  return { f: x.mine ? 'addMe' : 'addThem', a: [idOf(x.j), x.mine ? 'addrMe' : 'addrPeer', x.mine ? 'Me' : 'Mojca', '', x.text, String(x.ts),
    'True', 'True', 'True', 'False', 'False', '', replyTo, '', qName, qText, '', ''] };
}
const slice = (fromDepth, toDepth) => rowsPlan.slice(N - toDepth, N - fromDepth).map(pushRow);   // depths [fromDepth, toDepth)

/* ── the static server: the built folder ── */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.json': 'application/json' };
const HTML_REAL = realpathSync(HTML_DIR);
const server = createServer((req, res) => {
  try {
    const u = decodeURIComponent(String(req.url || '/').split('?')[0]);
    const p = normalize(join(HTML_DIR, u));
    if (!p.startsWith(HTML_DIR + sep) || !existsSync(p) || !statSync(p).isFile() || !realpathSync(p).startsWith(HTML_REAL + sep)) { res.writeHead(404); res.end(); return; }
    const body = readFileSync(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch (e) { if (!res.headersSent) res.writeHead(400); res.end(); }   // a malformed escape or an unreadable file ends the request, never the run
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL = 'http://127.0.0.1:' + server.address().port + '/chat.html?' + (MODE === 'desktop' ? 'desktop=1' : 'mobile=1');

const PAGE_INIT = () => {
  const b64 = (v) => btoa(unescape(encodeURIComponent(String(v))));
  window.__push = (fn, ...a) => window.executeUiCommand(window[fn], ...a.map(b64));
};

let openBrowser = null;   // closed on a failed run too
async function run() {
  const desktop = MODE === 'desktop';
  const browser = await pw.chromium.launch({ args: ['--disable-smooth-scrolling'] });
  openBrowser = browser;
  const ctx = await browser.newContext(desktop
    ? { viewport: { width: VW, height: VH }, deviceScaleFactor: DPR }
    : { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  const origin = 'http://127.0.0.1:' + server.address().port + '/';
  await ctx.route('**/*', (rt) => (rt.request().url().startsWith(origin) ? rt.continue() : rt.abort()));   // nothing leaves the loopback server
  const page = await ctx.newPage();
  await page.addInitScript(PAGE_INIT);
  const sends = [];
  let handled = 0;
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Page.enable');
  cdp.on('Page.frameRequestedNavigation', (e) => { if (String(e.url).startsWith('ixian:')) sends.push({ at: Date.now(), url: e.url }); });
  page.on('pageerror', (e) => console.error('pageerror: ' + e.message));
  async function openChat() {
  await page.goto(URL);
  await sleep(800);
  /* C#'s window: messagesToShow 50 → 100 → 150 … (FirstOlderPage50 ON); the shell holds depths [0, shown) */
  shown = 50; sends.length = 0; handled = 0;
  await page.evaluate(([open, caps]) => {
    const p = window.__push;
    p('onChatScreenReady', 'addrPeer');
    p('setNickname', 'Seed 57 Mojca Vrabec');
    p('setChatMode', '0', '0', '', 'False');
    p('setCaps', caps);
    p('clearMessages', 'true');
    p('addMessages', JSON.stringify({ strs: [], items: open }), 'append');
    p('messagesDone');   // the open's full load: C# sends messagesDone with no argument (SingleChatPage.xaml.cs:6079)
    p('onChatScreenLoaded');
  }, [slice(0, shown), CAPS]);
  await sleep(1500);
  }
  let shown = 50;
  await openChat();
  /* the C# stand-in: answer every new ixian:loadmore / ixian:quotejump */
  async function serve() {
    while (handled < sends.length) {
      const u = sends[handled++].url;
      if (u === 'ixian:loadmore') {
        const next = Math.min(N, shown + 50);
        if (next === shown) { await page.evaluate(() => window.__push('messagesDone', 'false')); continue; }
        const items = slice(shown, next);
        shown = next;
        await page.evaluate((it) => window.__push('addMessages', JSON.stringify({ strs: [], items: it }), 'prepend'), items);
        await sleep(30);
        await page.evaluate((more) => window.__push('messagesDone', more), shown < N ? 'true' : 'false');
      } else if (u.startsWith('ixian:quotejump:')) {
        const id = u.slice('ixian:quotejump:'.length);
        const dropped = R.find((r) => DROP.includes(r.k) && idOf(rowsPlan[N - 1 - r.td].j) === id);
        if (dropped) {
          if (DROP_PREPEND && shown < N) {
            await sleep(400);
            const next = Math.min(N, shown + 50);
            const items = slice(shown, next);
            shown = next;
            await page.evaluate((it) => window.__push('addMessages', JSON.stringify({ strs: [], items: it }), 'prepend'), items);
            await sleep(30);
            await page.evaluate((more) => window.__push('messagesDone', more), shown < N ? 'true' : 'false');
          }
          continue;
        }
        const j = rowsPlan.findIndex((x) => idOf(x.j) === id);
        if (j < 0) continue;
        const depth = N - 1 - j;
        const want = depth + 2;
        if (want > shown) {
          const items = slice(shown, want);
          shown = want;
          await page.evaluate((it) => window.__push('addMessages', JSON.stringify({ strs: [], items: it }), 'prepend'), items);
          await sleep(30);
          await page.evaluate(() => window.__push('messagesDone', 'true'));
        }
        if (!R.some((r) => NOJUMP.includes(r.k) && idOf(rowsPlan[N - 1 - r.td].j) === id)) await page.evaluate((x) => window.__push('jumpToMessage', x), id);
      }
    }
  }
  const results = [];
  for (const r of R) {
    if (FRESH && r !== R[0]) await openChat();
    const replyId = idOf(rowsPlan[N - 1 - r.rd].j);
    const targetId = idOf(rowsPlan[N - 1 - r.td].j);
    /* bring the reply's row into the window the way a reader does: scroll up (older pages load) until the row exists */
    for (let guard = 0; guard < 60; guard++) {
      const has = await page.evaluate((id) => !!document.querySelector('#messages > [data-msgid="' + id + '"]'), replyId);
      if (has) break;
      if (desktop) {
        const box = await page.evaluate(() => { const b = document.getElementById('messages').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 80 }; });
        await page.mouse.move(box.x, box.y);
        await page.mouse.wheel(0, -2400);
      } else {
        await page.evaluate(() => { document.getElementById('messages').scrollTop = 0; });
      }
      await sleep(250);
      await serve();
      await sleep(150);
    }
    if (PLACE !== 'asloaded') await page.evaluate(([id, pl]) => { const el = document.querySelector('#messages > [data-msgid="' + id + '"]'); if (el) el.scrollIntoView({ block: pl === 'top' ? 'start' : 'center' }); }, [replyId, PLACE]);
    await sleep(400);
    await serve();
    if (UPDATE.includes(r.k)) {
      const x = rowsPlan[N - 1 - r.rd];
      await page.evaluate(([id, body, quote]) => window.__push('updateMessage', id, body, 'True', 'True', 'True', 'False', 'False', '', '', '', quote, '', ''),
        [replyId, x.text, r.t]);
      await sleep(300);
    }
    const q = await page.evaluate((id) => {
      const row = document.querySelector('#messages > [data-msgid="' + id + '"]');
      const qb = row && row.querySelector('.c-bubble__reply');
      if (!qb) return null;
      const b = qb.getBoundingClientRect();
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      const snd = qb.querySelector('.c-bubble__reply-sender');
      return { tag: qb.tagName, sender: snd ? snd.textContent : '', cursor: getComputedStyle(qb).cursor, x: cx, y: cy, hitIsQuote: !!(hit && qb.contains(hit)), hit: hit ? hit.className || hit.tagName : '' };
    }, replyId);
    const before = sends.length;
    if (q) {
      const landPage = async () => {   // one older page lands DURING the press (the lazy loader's page), ~110 ms before the release
        const next = Math.min(N, shown + 50); const items = slice(shown, next); shown = next;
        await page.evaluate((it) => window.__push('addMessages', JSON.stringify({ strs: [], items: it }), 'prepend'), items);
        await sleep(30);
        await page.evaluate((more) => window.__push('messagesDone', more), shown < N ? 'true' : 'false');
        await sleep(80);
      };
      if (PRESS_PREPEND.includes(r.k) && desktop) { await page.mouse.move(q.x, q.y); await sleep(120); await page.mouse.down(); await landPage(); await page.mouse.up(); }
      else if (PRESS_PREPEND.includes(r.k)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y }] }); await landPage(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      else if (desktop) { await page.mouse.move(q.x, q.y); await sleep(120); await page.mouse.click(q.x, q.y); }
      else await page.touchscreen.tap(q.x, q.y);
    }
    await sleep(300);
    const sent = sends.slice(before).map((s) => s.url);
    await serve();
    await sleep(900);
    const landedAt12 = await page.evaluate((id) => { const row = document.querySelector('#messages > [data-msgid="' + id + '"]'); return !!row && (row.hasAttribute('data-mention-pulse') || !!row.querySelector('[data-mention-pulse]')); }, targetId);
    await sleep(1400);   // the toast of an unanswered jump comes 2 s after the click (chat.html QUOTE_JUMP_WAIT_MS): read it at ~2.6 s
    const landed = landedAt12;
    const toast = await page.evaluate(() => !!document.querySelector('.c-toast'));
    let second = '';
    if (NOJUMP.includes(r.k) && q) {   // the SECOND click on the same box (the target row may be loaded now)
      const q2 = await page.evaluate((id) => { const row = document.querySelector('#messages > [data-msgid="' + id + '"]'); const qb = row && row.querySelector('.c-bubble__reply'); if (!qb) return null; qb.scrollIntoView({ block: 'center' }); const b = qb.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, replyId);
      if (q2) {
        const n0 = sends.length;
        if (desktop) await page.mouse.click(q2.x, q2.y); else await page.touchscreen.tap(q2.x, q2.y);
        await sleep(1200);
        const l2 = await page.evaluate((id) => { const row = document.querySelector('#messages > [data-msgid="' + id + '"]'); return !!row && (row.hasAttribute('data-mention-pulse') || !!row.querySelector('[data-mention-pulse]')); }, targetId);
        second = (sends.length > n0 ? 'sent[' + sends.slice(n0).map((x) => x.url.split(':').slice(0, 2).join(':')).join(',') + '] ' : 'no-send ') + (l2 ? 'landed' : 'no-landing');
      }
    }
    let menu = '';
    if (CONTEXT && desktop && q) {
      const q2 = await page.evaluate((id) => { const row = document.querySelector('#messages > [data-msgid="' + id + '"]'); const qb = row && row.querySelector('.c-bubble__reply'); if (!qb) return null; qb.scrollIntoView({ block: 'center' }); const b = qb.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, replyId);
      if (q2) { await page.mouse.click(q2.x, q2.y, { button: 'right' }); await sleep(500); menu = (await page.evaluate(() => !!document.querySelector('.c-msgmenu'))) ? 'opens' : 'none'; await page.keyboard.press('Escape'); await sleep(400); }
    }
    results.push({ reply: r.k, own: r.mine, quote: q ? q.tag : 'none', sender: q ? q.sender : '', cursor: q ? q.cursor : '', hitIsQuote: q ? q.hitIsQuote : false, hit: q ? q.hit + '@' + Math.round(q.x) + ',' + Math.round(q.y) : '', sent: sent.join(' ') || '(nothing)', targetLoaded: await page.evaluate((id) => !!document.querySelector('#messages > [data-msgid="' + id + '"]'), targetId), landed, toast, menu, second });
    await page.evaluate(() => { const b = document.getElementById('messages'); b.scrollTop = b.scrollHeight; });
    await sleep(400);
  }
  await browser.close();
  server.close();
  return results;
}

let res;
try { res = await run(); }
catch (e) {
  console.error('harness-seed57: the run failed (' + (e && e.name || 'Error') + ': ' + (e && e.message || e) + ')');
  try { if (openBrowser) await openBrowser.close(); } catch (e2) { /* already gone */ }
  server.close();
  process.exit(1);
}
if (JSON_OUT) { console.log(JSON.stringify(res)); }
else {
  console.log('harness-seed57 mode=' + MODE + ' match=' + MATCH + (UPDATE ? ' update=' + UPDATE : '') + ' root=' + root);
  for (const x of res) console.log('REPLY ' + x.reply + (x.own ? ' (own)' : ' (peer)') + ' quote=' + x.quote + ' sender="' + x.sender + '" cursor=' + x.cursor + ' hitIsQuote=' + x.hitIsQuote + ' hit=' + x.hit + ' sent=' + x.sent + ' targetLoaded=' + x.targetLoaded + ' landed=' + x.landed + ' toast=' + x.toast + (x.menu ? ' menu=' + x.menu : '') + (x.second ? ' second=' + x.second : ''));
}
