/* ★ P-1 (#1127) — TEMPORARY, retire with the [P1] set.
 * Dev-only felt-speed stamps (DoD P-1). Every export is a no-op unless the head carrier set
 * `<html data-p1>` (*SL{SpixiP1} === '1', dev builds only); with it absent NOTHING is installed.
 * Lines go out as console.warn('[P1] …') (Android release drops chromium INFO, #751). The grammar is enforced HERE (p1Log);
 * on Android the existing console route forwards with logSafe only, on Windows the dev hook re-checks it (P1Perf.acceptShellConsole): tokens `^[a-z0-9_.=-]{1,40}$`, ≤ 16, fixed words + integers. */

const P1_TOKEN = /^[a-z0-9_.=-]{1,40}$/;
const P1_TAP_WINDOW = 2000;   // a tap older than this is not the cause → -1
const P1_FRAMES_MS = 600;     // frame window after a view change
const P1_SCROLL_IDLE = 150;   // scroll is over this long after its last event
const P1_JANK = 24;           // a frame gap above this counts as a drop

let p1On = null;              // decided once, at the first call
let p1Installed = false;
let p1Tap = -1;
let p1ShellName = 'shell';

function p1Enabled() {
  if (p1On === null) {
    try { p1On = typeof document !== 'undefined' && !!document.documentElement && document.documentElement.hasAttribute('data-p1'); } catch (e) { p1On = false; }
  }
  return p1On;
}

function p1Now() { return performance.now(); }

/** Integer ms since the last pointerdown, or -1 when there was none in the last 2000 ms. */
function p1SinceTap() {
  if (p1Tap < 0) return -1;
  const d = p1Now() - p1Tap;
  return d >= 0 && d <= P1_TAP_WINDOW ? Math.round(d) : -1;
}

/** Validate + emit one line. An invalid line is dropped whole. */
export function p1Log(body) {
  if (!p1Enabled() || typeof body !== 'string') return;
  const toks = body.split(' ');
  if (toks.length > 16 || !toks.every((t) => P1_TOKEN.test(t))) return;
  console.warn('[P1] ' + body);
}

/** rAF frame counter for `ms` (or until `stop()` says so); calls done(n, drop, max). */
function p1Frames(ms, stop, done) {
  const t0 = p1Now();
  let last = t0, n = 0, drop = 0, max = 0;
  const tick = () => {
    const t = p1Now();
    const gap = t - last;
    last = t;
    n++;
    if (gap > P1_JANK) drop++;
    if (gap > max) max = gap;
    if (stop ? stop(t) : t - t0 >= ms) done(n, drop, Math.round(max));
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Idempotent; installs the tap / longtask / scroll / load probes only when enabled. */
export function p1Install() {
  if (p1Installed || !p1Enabled()) return;
  p1Installed = true;
  try {
    const base = String(location.pathname || '').split('/').pop().replace(/\.html?$/i, '').toLowerCase().replace(/^ll_/, '');   // (#46 r1 B-N1) C# loads ll_<name>.html
    if (/^[a-z_]{1,40}$/.test(base)) p1ShellName = base;
  } catch (e) {}
  document.addEventListener('pointerdown', () => { p1Tap = p1Now(); }, true);
  try {
    if (typeof PerformanceObserver === 'function' && (PerformanceObserver.supportedEntryTypes || []).includes('longtask')) {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.duration >= 50) p1Log('shell longtask ' + p1ShellName + ' ms=' + Math.round(e.duration));
        }
      }).observe({ type: 'longtask', buffered: false });
    }
  } catch (e) {}
  let scrolling = false, s0 = 0, sLast = 0;
  document.addEventListener('scroll', () => {
    sLast = p1Now();
    if (scrolling) return;
    scrolling = true;
    s0 = sLast;
    p1Frames(0, (t) => t - sLast >= P1_SCROLL_IDLE, (n, drop, max) => {
      scrolling = false;
      p1Log('shell scroll ' + p1ShellName + ' ms=' + Math.round(sLast - s0) + ' n=' + n + ' drop=' + drop + ' max=' + max);
    });
  }, { capture: true, passive: true });
  const boot = () => p1Log('shell boot ' + p1ShellName + ' load=' + Math.round(p1Now()));
  if (document.readyState === 'complete') {
    let t = 0;
    try { const nav = performance.getEntriesByType('navigation')[0]; t = nav ? nav.loadEventStart : 0; } catch (e) {}
    if (t > 0) p1Log('shell boot ' + p1ShellName + ' load=' + Math.round(t)); else boot();
  } else {
    window.addEventListener('load', boot, { once: true });
  }
}

/** Call RIGHT AFTER a view change is applied. `what` is a fixed word (never an id or a name). */
export function p1Shown(what) {
  if (!p1Enabled() || !P1_TOKEN.test(what)) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    p1Log('shell ' + what + ' first=' + p1SinceTap());
    p1Frames(P1_FRAMES_MS, null, (n, drop, max) => {
      p1Log('shell frames-' + what + ' n=' + n + ' drop=' + drop + ' max=' + max);
    });
  }));
}

/** native.js send(): `shell send <verb> dt=<ms since tap | -1>`; the verb is the [A-Za-z]+ after `ixian:`, lowercased. */
export function p1Sent(command) {
  if (!p1Enabled()) return;
  const m = /^ixian:([A-Za-z]+)/.exec(command);   // (#46 r1 B-3) the whole camelCase verb, lowercased — never the payload after ':'
  if (m) p1Log('shell send ' + m[1].toLowerCase() + ' dt=' + p1SinceTap());
}

p1Install();
