#!/usr/bin/env node
/* a11y-scan — axe-core over the BUILT shells (Spixi/Resources/Raw/html/*.html), a REPORT, not a gate.
 *
 * Defect class it catches: accessibility violations that axe-core can decide from one rendered DOM: missing names
 * (alt, aria-label, button/link/input names), colour contrast, invalid or misused ARIA, duplicate ids, missing
 * landmarks/headings, zoom blocking. Every shell is scanned in light and dark, at a phone (390 x 844, touch, Android
 * UA) and at a desktop (1280 x 800, Windows UA). No shell is skipped.
 *
 * CANNOT SEE: anything after a user action (sheets, modals, menus, the other tabs and steps of a shell are not
 * opened); a state the scan does not push (FEEDS names the one state each shell is scanned in); keyboard order and
 * focus handling; screen-reader speech; contrast over images, gradients or overlapping layers (axe reports those as
 * "incomplete": counted, not listed); the Android/iOS WebView (this is desktop Chrome with a phone viewport; the
 * platform insets are not set; fonts and icons raster differently). The page runs with prefers-reduced-motion: reduce
 * so that entrance animations do not fake contrast readings.
 *
 * No dependency beyond axe-core: Chrome is driven over the DevTools protocol on Node's global WebSocket (Node >= 22.4).
 * Chrome: $CHROME_BIN, else google-chrome / google-chrome-stable / chromium / chromium-browser on PATH. It opens only
 * our own built files, so --no-sandbox is used (GitHub's ubuntu-24.04 runners block the user-namespace sandbox).
 * NETWORK: Chrome is cut off from the network (a dead proxy 127.0.0.1:9 for every URL incl. loopback, every host name
 * unresolvable, no component update, sync, pings or domain reliability); file:// pages need none. The DevTools port
 * is the one thing that listens: Chrome binds it to 127.0.0.1 only. If Chrome dies after launch the scan stops at once:
 * exit 2 when no page was scanned, else the partial report is written and marked INCOMPLETE.
 *
 * USAGE: node scripts/quality/a11y-scan.mjs [--out <report.json>] [--html-dir <dir>] [--only a.html,b.html]
 *          [--shots <dir>] [--page-timeout <s>] [--total-timeout <s>]
 *   --out            default <os.tmpdir()>/a11y-report.json (the folder is created)
 *   --html-dir       default <repo>/Spixi/Resources/Raw/html (every *.html in it is scanned)
 *   --only           scan only these file names (a test of the scan itself)
 *   --shots          also write one PNG per page run to this folder
 *   --page-timeout   seconds per page run (load + feed + axe, every DevTools call inside it included), default 30
 *   --total-timeout  seconds for the whole scan, default 480: the limit is checked before each page run, so the scan
 *                    ends within 480 + --page-timeout s, below the 540 s (9 minutes) the CI runner gives this child (worst case about 518 s)
 * Markdown summary on stdout; appended to $GITHUB_STEP_SUMMARY when that is set.
 * Exit 0 = the scan ran (violations or not), 2 = it could not run (no Chrome, no axe-core, no WebSocket, no shell,
 * Chrome did not start, or no page could be scanned). */
import { spawn } from 'node:child_process';
import { accessSync, appendFileSync, constants, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const outPath = resolve(arg('--out', join(tmpdir(), 'a11y-report.json')));
const htmlDir = resolve(arg('--html-dir', join(repo, 'Spixi/Resources/Raw/html')));
const only = arg('--only', '') ? arg('--only', '').split(',').map((s) => s.trim()).filter(Boolean) : null;
const shotsDir = arg('--shots', '') ? resolve(arg('--shots', '')) : null;
const PAGE_MS = Math.max(5, Number(arg('--page-timeout', '30'))) * 1000;
const TOTAL_MS = Math.max(30, Number(arg('--total-timeout', '480'))) * 1000;

const bail = (msg) => { console.error('a11y-scan: ' + msg); process.exit(2); };

const THEMES = ['light', 'dark'];
const VIEWS = [
  { name: 'phone', width: 390, height: 844, mobile: true, dpr: 2,
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' },
  { name: 'desktop', width: 1280, height: 800, mobile: false, dpr: 1,
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0' },
];

/* What each shell is scanned showing. A push is [handlerName, ...string args]; every argument goes through the page's
 * own executeUiCommand base64-encoded, as C# sends it (the handlers are page globals). A shell without a feed is
 * scanned as it stands after load, nothing pushed. */
const WALLET = '4AbCdEfGhJkLmNpQrStUvWxYz23456789aBcDeFg';
const NOW = String(Math.floor(Date.now() / 1000));
const chat = (wallet, from, excerpt, online, unread, kind) => ['addChat', wallet, from, NOW, '', online, excerpt, 'text', unread, kind, 'False', '', '', 'False'];
const FEEDS = {
  'index.html': { state: 'chats tab with 6 chats', feed: [
    ['setCaps', 'composeSend,hints,updateHelp,hintHelp'], ['clearChats'],
    chat(WALLET, 'Ana Kovac', 'See you at the walk tomorrow', 'true', '2', ''),
    chat('4BcDeFgHjKlMnPqRsTuVwXyZ34567892bCdEfGhJ', 'Marko', 'Photo', 'false', '0', ''),
    chat('4CdEfGhJkLmNpQrStUvWxYz45678923cDeFgHjKl', 'Seed 01', 'Seed message 12', 'false', '0', ''),
    chat('4DeFgHjKlMnPqRsTuVwXyZ56789234dEfGhJkLmN', 'Weekend group', 'Luka: lunch at one?', 'false', '5', 'group'),
    chat('4EfGhJkLmNpQrStUvWxYz67892345eFgHjKlMnPq', 'Petra', 'Thanks', 'true', '0', ''),
    chat('4FgHjKlMnPqRsTuVwXyZ78923456fGhJkLmNpQrS', 'Ivan', 'OK', 'false', '0', ''),
    ['clearChatsDone']] },
  'chat.html': { state: '1:1 conversation with 4 text messages', feed: [
    ['onChatScreenReady', WALLET], ['setNickname', 'Ana Kovac'], ['setChatMode', '0', '0', '', 'False', '', '', ''],
    ['setOnlineStatus', 'true', ''], ['clearMessages', 'False'],
    ['addThem', '1', WALLET, 'Ana Kovac', '', 'Are we still on for tomorrow?', NOW],
    ['addMe', '2', 'self', 'Me', '', 'Yes, see you at ten.', NOW, 'True', 'True', 'True', 'False', 'False'],
    ['addThem', '3', WALLET, 'Ana Kovac', '', 'Great. I will bring the tickets.', NOW],
    ['addMe', '4', 'self', 'Me', '', 'Thanks!', NOW, 'True', 'False', 'False', 'False', 'False'],
    ['messagesDone', 'False'], ['onChatScreenLoaded']] },
  'contact_details.html': { state: 'a saved contact (name, address, relation contact)', feed: [
    ['setContext', 'contact'], ['setAddress', WALLET], ['setNickname', 'Ana Kovac'], ['setRelation', 'contact'],
    ['showIndicator', 'true', ''], ['showCallButton'], ['clearRecentActivity']] },
  'settings.html': { state: 'settings hub (nickname, address, version pushed)', feed: [
    ['setNickname', 'Ana Kovac'], ['setAddress', WALLET], ['setVersion', '1.0.0'], ['setLanguage', 'en']] },
  'contact_new.html': { state: 'add-contact form, empty' },
  'app_new.html': { state: 'add-app form, empty' },
  'app_details.html': { state: 'details of a not-yet-installed app (init)', feed: [
    ['init', 'Chess', '', 'Spixi Labs', 'A simple chess game for two players.', '1.0.2', 'https://example.com/chess.zip', '1.2 MB', 'Storage,TransactionSigning', 'app1', 'True', 'False', 'False', 'False', 'True']] },
  'intro.html': { state: 'launch welcome step' },
  'lock.html': { state: 'lock screen' },
  'scan.html': { state: 'scan screen, no camera' },
  'settings_backup.html': { state: 'backup screen' },
  'settings_encryption.html': { state: 'encryption password screen' },
  'wallet_sent.html': { state: 'a confirmed sent payment, amounts shown (setData, one entry)', feed: [
    ['setHideBalance', 'False'], ['clearEntries'], ['addEntry', WALLET, 'Ana Kovac', '', '12.5', '3.10', '27 Nov 2026 00:52', 'send', 'true'],
    ['setData', '12.5', '0.0005', '27 Nov 2026 00:52', 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90', 'true']] },
  'call.html': { state: 'the full call screen, call in progress', feed: [
    ['setCallCaps', '1', '1', '1', '1'], ['setCallAudio', '0', '0', '0', '1', '0'],
    ['setCallUi', 'incall', 'Ana Kovac', '', String(Math.floor(Date.now() / 1000) - 60), 'sid1', WALLET]] },
  'downloads.html': { state: 'downloads, empty' },
  'dev.html': { state: 'developer page, nothing pushed' },
  'contributors.html': { state: 'contributors' },
  'empty_detail.html': { state: 'empty detail pane' },
};
const feedOf = (f) => (FEEDS[f] && FEEDS[f].feed) || [];
const stateOf = (f) => (FEEDS[f] && FEEDS[f].state) || 'as loaded, nothing pushed';

/* ---- environment ---- */
if (typeof WebSocket !== 'function') bail('this Node has no global WebSocket (needs Node >= 22.4); could not run');
const axePath = join(repo, 'node_modules/axe-core/axe.min.js');
if (!existsSync(axePath)) bail('node_modules/axe-core/axe.min.js is missing (npm ci); could not run');
const axeSrc = readFileSync(axePath, 'utf8');
let axePkg = '';
try { axePkg = JSON.parse(readFileSync(join(repo, 'node_modules/axe-core/package.json'), 'utf8')).version; } catch { /* the page reports it */ }
if (!existsSync(htmlDir)) bail(htmlDir + ' does not exist; could not run');
let shells = readdirSync(htmlDir).filter((f) => f.endsWith('.html')).sort();
if (only) shells = shells.filter((f) => only.includes(f));
if (!shells.length) bail('no *.html shell in ' + htmlDir + '; could not run');

function findChrome() {
  const env = process.env.CHROME_BIN;
  if (env) { if (existsSync(env)) return env; bail('CHROME_BIN=' + env + ' does not exist; could not run'); }
  for (const dir of (process.env.PATH || '').split(delimiter)) {
    for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
      const p = join(dir, n);
      try { accessSync(p, constants.X_OK); return p; } catch { /* next */ }
    }
  }
  return bail('no Chrome found (set CHROME_BIN, or put google-chrome / chromium on PATH); could not run');
}
const chromeBin = findChrome();

/* ---- Chrome and the DevTools protocol ---- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms, what) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('timeout after ' + ms + ' ms: ' + what)), ms);
  p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
});

const profile = mkdtempSync(join(tmpdir(), 'a11y-scan-'));
let chrome = null, ws = null;
function cleanup() {
  try { if (ws) ws.close(); } catch { /* closing */ }
  try { if (chrome && chrome.exitCode === null) chrome.kill('SIGKILL'); } catch { /* gone */ }
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
}
process.on('exit', cleanup);
for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(s, () => { cleanup(); process.exit(2); });

async function launch() {
  chrome = spawn(chromeBin, ['--headless=new', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--user-data-dir=' + profile,
    '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--proxy-server=127.0.0.1:9', '--proxy-bypass-list=<-loopback>', '--host-resolver-rules=MAP * ~NOTFOUND',
    '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-pings', '--disable-domain-reliability',
    '--disable-client-side-phishing-detection', '--disable-default-apps', '--metrics-recording-only',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'] });
  const url = await withTimeout(new Promise((res, rej) => {
    let buf = '';
    chrome.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) res(m[1]); });
    chrome.on('exit', (c) => rej(new Error('Chrome exited early (' + c + '): ' + buf.slice(-300))));
    chrome.on('error', rej);
  }), 30000, 'Chrome did not print its DevTools address');
  chrome.on('exit', (c) => markDead('Chrome exited (' + c + ')'));
  ws = new WebSocket(url);
  await withTimeout(new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('DevTools WebSocket failed')); }), 15000, 'DevTools WebSocket open');
}

let nextId = 1;
const pending = new Map();
const listeners = [];
function wire() {
  ws.onmessage = (ev) => {
    const m = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id);
      if (m.error) rej(new Error(m.error.message + ' (' + m.error.code + ')')); else res(m.result || {});
    } else if (m.method) for (const l of listeners.slice()) l(m);
  };
  ws.onclose = () => markDead('the DevTools connection closed');
}
/* Chrome gone (its process exited or the socket closed): every waiting call fails at once and no later call is sent */
let dead = '';
const abortWaits = new Set();
function markDead(why) {
  if (dead) return;
  dead = why;
  for (const { rej } of pending.values()) rej(new Error(why));
  pending.clear();
  for (const a of [...abortWaits]) a(new Error(why));
}
/* every DevTools call and wait is bounded by the end of the page run it belongs to (pageEnd), not by a fresh limit */
let pageEnd = 0;
const budget = (ms) => (pageEnd ? Math.max(1, Math.min(ms, pageEnd - Date.now())) : ms);
const send = (method, params = {}, sessionId, ms = PAGE_MS) => {
  if (dead) return Promise.reject(new Error(dead));
  const id = nextId++;
  const p = new Promise((res, rej) => { pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
  return withTimeout(p, budget(ms), method).finally(() => pending.delete(id));
};
const waitEvent = (pred, ms, what) => new Promise((res, rej) => {
  const limit = budget(ms);
  const t = setTimeout(() => { off(); rej(new Error('timeout after ' + limit + ' ms: ' + what)); }, limit);
  const abort = (e) => { off(); clearTimeout(t); rej(e); };
  const l = (m) => { if (pred(m)) { off(); clearTimeout(t); res(m); } };
  const off = () => { const i = listeners.indexOf(l); if (i > -1) listeners.splice(i, 1); abortWaits.delete(abort); };
  listeners.push(l);
  abortWaits.add(abort);
  if (dead) abort(new Error(dead));
});

/* run inside the page: the feed, the theme check, then axe; every value comes back as a JSON string */
const feedExpr = (feed) => `(() => {
  const b64 = (x) => btoa(unescape(encodeURIComponent(String(x))));
  const missing = [];
  if (typeof window.executeUiCommand !== 'function') return JSON.stringify({ noDispatcher: true, missing });
  for (const [fn, ...a] of ${JSON.stringify(feed)}) {
    if (typeof window[fn] !== 'function') { missing.push(fn); continue; }
    window.executeUiCommand(window[fn], ...a.map(b64));
  }
  return JSON.stringify({ noDispatcher: false, missing });
})()`;
const themeExpr = (theme) => `(() => { const de = document.documentElement; const before = de.getAttribute('data-theme');
  if (before !== ${JSON.stringify(theme)}) de.setAttribute('data-theme', ${JSON.stringify(theme)});
  return JSON.stringify({ before }); })()`;
const AXE_RUN = `(async () => {
  const r = await axe.run(document, { resultTypes: ['violations', 'incomplete'] });
  const cap = (s, n) => (s && s.length > n ? s.slice(0, n) + '...' : s || '');
  return JSON.stringify({
    version: axe.version,
    incomplete: r.incomplete.reduce((n, v) => n + v.nodes.length, 0),
    violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl,
      tags: v.tags.filter((t) => /^wcag\\d|best-practice/.test(t)),
      nodeCount: v.nodes.length,
      targets: v.nodes.slice(0, 300).map((n) => (Array.isArray(n.target[0]) ? n.target.flat() : n.target).join(' >> ')),
      samples: v.nodes.slice(0, 3).map((n) => ({ html: cap(n.html, 220), why: cap(n.failureSummary, 300) })) }))
  });
})()`;

const evalJson = async (sid, expression, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise }, sid);
  if (r.exceptionDetails) throw new Error('page script failed: ' + String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text).slice(0, 300));
  return JSON.parse(r.result.value);
};

async function scanOne(file, theme, view) {
  const rec = { shell: file, state: stateOf(file), theme, view: view.name, width: view.width, height: view.height };
  const errors = [];
  let targetId = null, onEv = null;
  pageEnd = Date.now() + PAGE_MS;
  try {
    targetId = (await send('Target.createTarget', { url: 'about:blank' })).targetId;
    const sid = (await send('Target.attachToTarget', { targetId, flatten: true })).sessionId;
    onEv = (m) => {
      if (m.sessionId !== sid) return;
      if (m.method === 'Runtime.exceptionThrown') errors.push('exception: ' + String((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description) || m.params.exceptionDetails.text).split('\n')[0].slice(0, 160));
      else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 160));
    };
    listeners.push(onEv);
    await send('Page.enable', {}, sid);
    await send('Runtime.enable', {}, sid);
    await send('Emulation.setDeviceMetricsOverride', { width: view.width, height: view.height, deviceScaleFactor: view.dpr, mobile: view.mobile }, sid);
    await send('Emulation.setTouchEmulationEnabled', { enabled: view.mobile, maxTouchPoints: view.mobile ? 5 : 1 }, sid);
    await send('Emulation.setUserAgentOverride', { userAgent: view.ua }, sid);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: 'reduce' }] }, sid);
    const loaded = waitEvent((m) => m.sessionId === sid && m.method === 'Page.loadEventFired', PAGE_MS, 'load of ' + file);
    loaded.catch(() => {});
    const nav = await send('Page.navigate', { url: pathToFileURL(join(htmlDir, file)).href }, sid);
    if (nav.errorText) throw new Error('navigation failed: ' + nav.errorText);
    await loaded;
    await sleep(1200);                                   // the shells mount on load
    const feed = feedOf(file);
    let fed = { noDispatcher: false, missing: [] };
    if (feed.length) { fed = await evalJson(sid, feedExpr(feed)); await sleep(1200); }
    rec.pushed = feed.length; rec.missingHandlers = fed.missing; rec.noDispatcher = fed.noDispatcher;
    const th = await evalJson(sid, themeExpr(theme));
    rec.themeAttrBefore = th.before; rec.themeForced = th.before !== theme;
    await sleep(300);
    await send('Runtime.evaluate', { expression: axeSrc }, sid);
    const axe = await evalJson(sid, AXE_RUN, true);
    rec.axeVersion = axe.version; rec.incomplete = axe.incomplete; rec.violations = axe.violations;
    if (shotsDir) {
      const shot = await send('Page.captureScreenshot', { format: 'png' }, sid);
      writeFileSync(join(shotsDir, file.replace(/\.html$/, '') + '-' + theme + '-' + view.name + '.png'), Buffer.from(shot.data, 'base64'));
    }
  } catch (e) { rec.error = String(e.message || e).slice(0, 300); }
  if (onEv) { const i = listeners.indexOf(onEv); if (i > -1) listeners.splice(i, 1); }
  rec.pageErrors = errors.slice(0, 5);
  pageEnd = 0;
  if (targetId && !dead) { try { await send('Target.closeTarget', { targetId }, undefined, 5000); } catch { /* the browser is killed at the end */ } }
  return rec;
}

/* ---- the report ---- */
const IMPACTS = ['critical', 'serious', 'moderate', 'minor'];
const countsOf = (rec) => {
  const c = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of rec.violations || []) c[v.impact || 'minor'] += v.nodeCount;
  return c;
};
function byRule(runs) {
  const rules = new Map();
  for (const r of runs) for (const v of r.violations || []) {
    let e = rules.get(v.id);
    if (!e) { e = { id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, tags: v.tags, shells: new Set(), runs: 0, nodes: 0, distinct: new Set(), example: v.samples[0] || null }; rules.set(v.id, e); }
    e.shells.add(r.shell); e.runs++; e.nodes += v.nodeCount;
    for (const t of v.targets) e.distinct.add(r.shell + ' | ' + t);
  }
  const rank = (i) => IMPACTS.indexOf(i);
  return [...rules.values()].sort((a, b) => rank(a.impact) - rank(b.impact) || b.distinct.size - a.distinct.size);
}
const cell = (rec) => (!rec ? 'not run' : rec.error ? 'ERROR' : IMPACTS.map((i) => countsOf(rec)[i]).join('/'));

function markdown(meta, runs, rules) {
  const L = [];
  L.push('## Accessibility scan (axe-core ' + meta.axeVersion + ', ' + meta.chrome + '): report only');
  L.push('');
  L.push(meta.complete
    ? 'Scanned ' + meta.pagesOk + ' page runs (' + meta.shells + ' shells x light/dark x 390 x 844 phone and 1280 x 800 desktop) in ' + meta.seconds + ' s.'
    : '**INCOMPLETE:** scanned ' + meta.pagesOk + ' of ' + meta.pagesPlanned + ' page runs; the rest failed or were not reached' + (meta.stopped ? ' (stopped: ' + meta.stopped + ')' : '') + ' (see the ERROR cells and the notes).');
  L.push('');
  L.push('Cells are violating nodes by impact: critical/serious/moderate/minor. "inc" = nodes axe could not decide (not in the counts).');
  L.push('');
  L.push('| shell | state scanned | light phone | dark phone | light desktop | dark desktop | inc |');
  L.push('|---|---|---|---|---|---|---|');
  for (const f of meta.shellList) {
    const get = (t, v) => runs.find((r) => r.shell === f && r.theme === t && r.view === v);
    const inc = Math.max(0, ...runs.filter((r) => r.shell === f).map((r) => r.incomplete || 0));
    L.push('| ' + f + ' | ' + stateOf(f) + ' | ' + cell(get('light', 'phone')) + ' | ' + cell(get('dark', 'phone')) + ' | ' + cell(get('light', 'desktop')) + ' | ' + cell(get('dark', 'desktop')) + ' | ' + inc + ' |');
  }
  const tot = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const r of runs) { const c = countsOf(r); for (const i of IMPACTS) tot[i] += c[i]; }
  L.push('');
  L.push('Totals over all runs (an element seen in four runs counts four times): ' + IMPACTS.map((i) => i + ' ' + tot[i]).join(', '));
  L.push('');
  L.push('| rule | impact | shells | distinct elements | help |');
  L.push('|---|---|---|---|---|');
  for (const r of rules) L.push('| ' + r.id + ' | ' + r.impact + ' | ' + r.shells.size + ' | ' + r.distinct.size + ' | ' + r.help + ' |');
  if (!rules.length) L.push('| (none) | | | | |');
  const notes = runs.filter((r) => r.error || (r.missingHandlers && r.missingHandlers.length) || r.noDispatcher || r.themeForced);
  if (notes.length) {
    L.push('');
    L.push('Setup notes:');
    for (const r of notes) L.push('- ' + r.shell + ' ' + r.theme + ' ' + r.view + ': ' + [r.error && 'ERROR ' + r.error, r.noDispatcher && 'no executeUiCommand', r.missingHandlers && r.missingHandlers.length && 'no handler ' + r.missingHandlers.join(','), r.themeForced && 'data-theme was "' + r.themeAttrBefore + '" after load, set by the scan'].filter(Boolean).join('; '));
  }
  return L.join('\n') + '\n';
}

/* ---- main ---- */
const started = Date.now();
const runs = [];
let chromeVersion = '', stopped = '';
try {
  await launch();
  wire();
  chromeVersion = (await send('Browser.getVersion', {}, undefined, 10000)).product;
  mkdirSync(dirname(outPath), { recursive: true });
  if (shotsDir) mkdirSync(shotsDir, { recursive: true });
  outer: for (const f of shells) for (const view of VIEWS) for (const theme of THEMES) {
    if (Date.now() - started > TOTAL_MS) { stopped = 'the total limit of ' + TOTAL_MS / 1000 + ' s was reached'; console.error('a11y-scan: ' + stopped + '; the rest is not scanned'); break outer; }
    const rec = await scanOne(f, theme, view);
    runs.push(rec);
    if (dead) { stopped = dead; console.error('a11y-scan: ' + dead + '; the rest is not scanned'); break outer; }
    console.error('a11y-scan: ' + f + ' ' + theme + ' ' + view.name + ' ' + (rec.error ? 'ERROR ' + rec.error : cell(rec)));
  }
} catch (e) {
  cleanup();
  bail('could not run: ' + String(e.message || e));
}
cleanup();

const ok = runs.filter((r) => !r.error);
if (!ok.length) bail('no page could be scanned (' + (runs[0] && runs[0].error) + '); could not run');
const planned = shells.length * VIEWS.length * THEMES.length;
const meta = {
  date: new Date().toISOString().slice(0, 10), axeVersion: (ok[0] && ok[0].axeVersion) || axePkg, chrome: chromeVersion, node: process.version,
  shells: shells.length, shellList: shells, themes: THEMES, views: VIEWS.map((v) => ({ name: v.name, width: v.width, height: v.height, mobile: v.mobile, ua: v.ua })),
  pagesPlanned: planned, stopped, pagesOk: ok.length, complete: ok.length === planned, seconds: Math.round((Date.now() - started) / 1000), htmlDir,
};
const rules = byRule(ok);
const report = { schema: 1, meta, states: Object.fromEntries(shells.map((f) => [f, stateOf(f)])),
  rules: rules.map((r) => ({ id: r.id, impact: r.impact, help: r.help, helpUrl: r.helpUrl, tags: r.tags, shells: [...r.shells], runs: r.runs, nodes: r.nodes, distinctElements: r.distinct.size, example: r.example })),
  runs };
writeFileSync(outPath, JSON.stringify(report, null, 1));
const md = markdown(meta, runs, rules) + '\nFull report: ' + outPath + '\n';
process.stdout.write(md);
if (process.env.GITHUB_STEP_SUMMARY) { try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, md); } catch (e) { console.error('a11y-scan: could not write the step summary: ' + e.message); } }
process.exit(0);
