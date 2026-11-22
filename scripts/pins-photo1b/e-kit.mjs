/* ==== photo1b (agent `tile`) — the shared boot for e-tile / f-voice / harness-photos (NOT a pin module) ====
 * The BUILT chat.html in jsdom (the pins-s8/ui-kit.mjs model, but the html PATH is a parameter so a pin can also open the BASE
 * build (`git show 55feaddc:Spixi/Resources/Raw/html/chat.html`) for the cap-OFF byte-equality fixture). C# pushes go through
 * executeUiCommand; outgoing ixian: verbs are captured at the Location href setter.
 *   boot(h, htmlPath, { mobile }) → { dom, W, d, push, sent, errs }
 *   open(h, htmlPath, { caps, rows: [addFile / addThem argument lists …] }) → the same + the log id helpers
 *   normRow(el) → the row's outerHTML with the CLOCK text replaced by one token. The time-of-day text ("10:14 PM" in a <time>, in the row's
 *     "You, 10:14 PM, Read" description, in any aria-label / title) depends on the running zone, so the pin derives the exact strings from
 *     the rows it pushed — each fixture timestamp formatted by the PAGE's own formatters in the running zone (docLocale() / timeOpts() for
 *     the time, dayBucketLabel() for the date pill's day) — and masks only those exact strings (not digits-and-colons in general). The ISO
 *     `datetime` attribute is UTC and stays exact. open() fills the table (window.__p1bClock) from its rows.
 * LIMITS: jsdom lays nothing out and loads no image (a `load` / `error` event on an <img> is DISPATCHED by the pin, the way the
 * shell would get it); timers are real (`sleep`), so the 600 ms quiet wait is waited, not faked. */
import { createHash } from 'node:crypto';
export const JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP////////////////////////////////////////////////////////////////////////////////////8AAAAAAAAAAA==';
/* fixed: 2023-11-14 12:04:00 UTC. The fixture rows span T0 − 120 s … T0 + 47 min = 12:02 … 12:51 UTC. No zone in use (UTC−12 … UTC+14,
   incl. the :30 / :45 ones) has its local midnight between 12:02 and 12:51 UTC (midnight is at 24 h − offset: +12 → 12:00, +11:30 would be
   12:30 and does not exist), so the whole span is ONE local day everywhere → one date pill, the same row count in every zone. */
export const T0 = 1699963440;
export function kit(h) {
  const { readFileSync, JSDOM, VirtualConsole, sleep } = h;
  const b64 = (x) => Buffer.from(String(x), 'utf8').toString('base64');
  const boot = async (htmlPath, { mobile = true, wait = 1600 } = {}) => {
    const errs = [];
    const sent = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(htmlPath, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + htmlPath + (mobile ? '?mobile=1' : ''), virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) { /* none */ }
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
        w.Element.prototype.scrollIntoView = function () {};
        const sym = Object.getOwnPropertySymbols(w.location).find((s) => s.description === 'impl');
        const impl = sym ? w.location[sym] : null;
        if (impl) Object.defineProperty(impl, 'href', { configurable: true, get() { return 'file://' + htmlPath; }, set(v) { const c = String(v); if (/^ixian:/.test(c)) sent.push(c); } });
      },
    });
    await sleep(wait);
    const W = dom.window;
    const d = W.document;
    const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map((x) => (x == null ? null : b64(x))));
    return { dom, W, d, push, errs, sent };
  };
  /* rows: [['addFile', …args] | ['addThem', …] | ['addMe', …]]; the open follows C#'s order — ready, mode, caps, previews, clear,
     the history rows inside the burst, messagesDone, onChatScreenLoaded. `before(s)` runs right after the boot (a spy goes in here); `afterLoad(s)` runs right after onChatScreenLoaded. */
  const open = async (htmlPath, { caps = '', rows = [], mobile = true, previews = true, settle = 300, before = null, afterLoad = null } = {}) => {
    const s = await boot(htmlPath, { mobile });
    /* the clock is FROZEN while the rows are built and settle (performance.now is what the 600 ms quiet window reads, PHOTO_QUIET_MS): a slow
       or loaded machine can not push the second build of a row past the window, so "quiet at the open" is deterministic. It is thawed at
       the end of the open — the timers (real) then run the wait out as they would. */
    const real = s.W.performance.now.bind(s.W.performance);
    let frozen = real();
    try { s.W.performance.now = () => (frozen === null ? real() : frozen); } catch (e) { /* the clock stays real */ }
    s.thaw = () => { frozen = null; };
    /* the clock strings of the rows this document is about to show (see normRow): addFile = args[6], addThem / addMe = args[5] (+ the fn) */
    {
      const W = s.W, strs = new Map();   // exact string → its token
      for (const r of rows) {
        const t = Number(r[0] === 'addFile' ? r[7] : r[6]);
        if (!Number.isFinite(t)) continue;
        strs.set(new W.Date(t * 1000).toLocaleTimeString(W.Spixi.docLocale(), W.Spixi.timeOpts()), '«clock»');
        const day = W.Spixi.dayBucketLabel(t * 1000, W.SL || {}, Date.now(), 'Today');   // the date pill's own text (the day depends on the zone)
        if (day) strs.set(day, '«day»');
      }
      W.__p1bClock = [...strs].sort((a, b) => b[0].length - a[0].length);
    }
    if (before) before(s);
    s.push('onChatScreenReady', 'addrPeer');
    s.push('setChatMode', '0', '0', '', 'False');
    if (caps) s.push('setCaps', caps);
    if (previews) s.push('setPhotoPreviews', 'True');
    s.push('clearMessages', 'false');
    for (const r of rows) s.push(r[0], ...r.slice(1));
    s.push('messagesDone');
    s.push('onChatScreenLoaded');
    if (afterLoad) afterLoad(s);
    await sleep(settle);
    s.thaw();
    return s;
  };
  const rowOf = (d, id) => d.querySelector('#messages > [data-msgid="' + id + '"]') || d.querySelector('#messages [data-msgid="' + id + '"]');
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const normRow = (el) => {
    if (!el) return '';
    let html = el.outerHTML;
    const W = el.ownerDocument.defaultView;
    for (const [t, token] of (W && W.__p1bClock) || []) html = html.replace(new RegExp('(?<![0-9:A-Za-z])' + esc(t) + '(?![0-9:A-Za-z])', 'g'), token);
    return html;
  };
  /* the Seed-56-like photo rows: n photos, alternating received / sent, all complete and local */
  const photoRows = (n, { prefix = 'p', offset = 0 } = {}) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const sentRow = i % 2 === 1;
      out.push(['addFile', prefix + i, sentRow ? 'addrMe' : 'addrPeer', sentRow ? 'Me' : 'Ana', '', 'x' + prefix + i, 'img' + i + '.jpg', String(T0 + offset + i * 60),
        sentRow ? 'True' : 'False', 'True', 'True', '100', 'True', 'False', 'True', '', '1', '', '', '', '']);
    }
    return out;
  };
  return { b64, boot, open, rowOf, normRow, photoRows, JPG, T0, sleep };
}

/* a deterministic fingerprint of a whole log: every child of #messages, normalised, one sha1 each (+ one over all) */
export const sha = (t) => createHash('sha1').update(String(t)).digest('hex').slice(0, 12);
export function logPrint(d, normRow) {
  const kids = [...d.getElementById('messages').children].map((el) => normRow(el));
  return { all: sha(kids.join('\n')), rows: kids.map(sha) };
}
/* the photo / states scenarios the cap-OFF fixture and the cap-ON assertions both use. Returns the fingerprints at each checkpoint.
   `htmlPath` may be the base build or this tree's; `caps` '' = the cap OFF. `before(s)` runs after each boot (spies); `at(name, s)`
   runs at every checkpoint on the LIVE document (the pin reads what it needs there). */
export async function photoScenario(h, htmlPath, caps, { before = null, at = null } = {}) {
  const K = kit(h);
  const out = {};
  const sleep = h.sleep;
  const mark = async (name, s) => { out[name] = logPrint(s.d, K.normRow); if (at) await at(name, s); };
  /* A1 — 48 photo rows + 2 text rows, history load; the previews come after messagesDone (as C# does) */
  const text = [['addThem', 'cc01', 'addrPeer', 'Ana', '', 'their words', String(T0 - 120), 'True', 'True', 'True', 'False', 'False'],
    ['addMe', 'cc02', 'addrMe', 'Me', '', 'my words', String(T0 - 60), 'True', 'True', 'True', 'False', 'False', '', '', '', '', '']];
  const rows = [...text, ...K.photoRows(48)];
  let s = await K.open(htmlPath, { caps, rows, settle: 80, before });
  await mark('quiet', s);
  for (let i = 0; i < 48; i++) s.push('setFileThumb', 'p' + i, JPG);
  await sleep(60);
  await mark('loading', s);
  for (const im of s.d.querySelectorAll('#messages .c-mbubble__img')) im.dispatchEvent(new s.W.Event('load'));
  await sleep(200);
  await mark('loaded', s);
  s.dom.window.close();
  /* A2 — the same rows, no preview ever: the 600 ms quiet wait ends, the face fades in */
  s = await K.open(htmlPath, { caps, rows, settle: 1000, before });
  await mark('face', s);
  s.dom.window.close();
  /* A3 — every file state the shell can draw */
  const f = (id, me, prog, complete, local, name = 'pic.jpg') => ['addFile', id, me === 'True' ? 'addrMe' : 'addrPeer', me === 'True' ? 'Me' : 'Ana', '', 'x' + id, name, String(T0), me, 'True', 'True', prog, complete, 'False', 'True', '', local, '', '', '', '2400000'];
  const states = [f('s1', 'False', '100', 'True', '1'), f('s2', 'True', '100', 'True', '1'), f('s3', 'True', '40', 'False', '1'), f('s4', 'False', '30', 'False', ''),
    f('s5', 'False', '0', 'False', ''), f('s6', 'False', '100', 'True', '0'), f('s7', 'True', '100', 'True', '0'), f('s8', 'False', '100', 'True', '1', 'report.pdf')];
  s = await K.open(htmlPath, { caps, rows: states, settle: 80, before });
  await mark('states0', s);
  for (const id of ['s1', 's2', 's3']) s.push('setFileThumb', id, JPG);
  await sleep(60);
  for (const im of s.d.querySelectorAll('#messages .c-mbubble__img')) im.dispatchEvent(new s.W.Event('load'));
  await sleep(200);
  await mark('states1', s);
  await sleep(800);
  await mark('states2', s);
  s.dom.window.close();
  return out;
}
