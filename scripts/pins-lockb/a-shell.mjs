/* ==== lockb · A — the lock shell holds its password form while C# says a deferred prompt is pending (#1825 (1)); EXECUTED on the BUILT shell ====
 * Contract docs/contract-lockb.md § 3 (the push values, S1–S7); mechanisms docs/lockb-mechanisms.md § 3.
 *
 * LIMITS — read first (DECISIONS 1735: the limits of a pin are stated, not hidden).
 *   · jsdom, NOT the Android WebView. It runs the BUILT Spixi/Resources/Raw/html/lock.html (its own scripts, the real bundle) with the
 *     C# carriers substituted by hand (LockAuthPending "1" / "0", language en-us, theme dark, every other carrier "0"). It does not see
 *     paint: "hidden" = the `hidden` attribute of `.c-lock` (the shell's only hold mechanism) and "the spinner" = the `.boot` node in
 *     #lock-root. That the hidden form really has no box and the spinner is centred is measured in Chromium by hand:
 *     scripts/pins-lockb/a-shell-render.mjs (NOT in the smoke).
 *   · TIME IS MODELLED. beforeParse replaces window.setTimeout / clearTimeout with a controllable clock (fires due timers in order of
 *     (due, id) when `advance(ms)` is called; nothing runs by itself). Every timer of the page and of the bundle goes through it, so the
 *     pin sleeps no seconds. The real 3 000 ms of the belt, the real WebView timer, and the interleaving with the native layer are NOT
 *     proven here. requestAnimationFrame / Promise / load timing are jsdom's own.
 *   · The PUSH is simulated by calling `window.setAuthPending(v)`, the way `executeUiCommand` does. It does not prove that C#
 *     sends these values, when it sends them, or that the old shell ignores them in the app (an older shell ignores 'True' / '1' by its own
 *     code — the old line is pinned by the older pins of the smoke: `#457 (BUILT shell)`). The C# side is pinned by builder-a / builder-d.
 *   · a9 compares the BUILT file's last inline script with the source's, byte for byte; that the whole built tree is current is the job
 *     of `node scripts/build-shells.mjs --check` (a gate of the smoke), which this module does not run.
 *   · The BREAKS (#802) are by hand: this module loads `LOCKB_FILE` (an absolute path of a MUTATED COPY of the built lock.html, which must
 *     lie in the SAME folder so the relative links resolve) in place of the real file when that variable is set — the smoke never sets it.
 *
 * KEYS (one `ok` each; the state is read from the DOM: form = `.c-lock` hidden or not, spinner = `.boot`):
 *   lockb a1 S2 ★ THE KEY "prompt pending → form hidden": carrier "1", 'True' right after boot, NO timer pending (review r2 X2 NIT-2), +10 s and then +1 h (review r1 P-M1) → the form is STILL hidden, the spinner still there
 *   lockb a2 S3 'True', +10 s, then '1': +2.9 s → hidden, +0.2 s more (3.1 s after the '1') → revealed
 *   lockb a3 S1 no push: hidden at 2.9 s, revealed at 3.1 s (the base belt); the spinner goes with the reveal
 *   lockb a4 S4 'False' reveals at once: from the plain hold, from the deferred hold ('True'), and after a '1'
 *   lockb a5 S5 after a reveal (by the belt; by 'False') 'True' and '1' change nothing (+10 s: the form stays visible, nothing re-hides it)
 *   lockb a6 S6 carrier "0": revealed at once; 'True' / '1' change nothing
 *   lockb a7 S7 'true' and the boolean true are ignored: the belt still reveals at 3.1 s; after a 'True' the hold with no belt stays — also 1 h later (review r1 P-M1)
 *   lockb a8 'True' / '1' / 'true' BEFORE boot (before the window load): nothing throws, nothing latches — and 3.1 s of the modelled clock pass
 *            BEFORE boot (review r1 P-m1: a pre-boot '1' that armed a belt would fire it and latch "revealed") — the base belt still reveals
 *            at 3.1 s after boot (carrier "1") and the form shows at once (carrier "0")
 *   lockb a9 the BUILT lock.html holds the source's last inline script byte for byte (the built file is not stale for this change)
 * DELIBERATE BREAKS (#802) — each a one-edit mutation of a COPY of the built lock.html, run by hand (docs: the lockb status):
 *   b1 `clearTimeout(beltTimer);` removed from the push → the 'True' hold keeps the belt                    → a1 (and a2, a7) red
 *   b2 `beltTimer = pending === '1' ? setTimeout(revealLock, 3000) : 0;` → `beltTimer = 0;` ('1' does not re-arm) → a2 red
 *   b3 `if (holdUp && !lockRevealed) {` → `if (holdUp) { lockRevealed = false; <hide .c-lock>;` ('True' re-hides after a reveal) → a5 red
 *   b4 the boot belt `beltTimer = setTimeout(revealLock, 3000);` → `beltTimer = 0;` (no base belt)             → a3 (and a7, a8) red
 *   b5 `if (pending === 'true' || pending === true) return;` removed ('true' reveals)                         → a7 red
 *   b6 `if (holdUp && !lockRevealed) {` → `if (!lockRevealed) { document.querySelector('.c-lock').hidden = true;` (touches a screen that boot has not made) → a8 red
 *   b7 `if (AUTH_PENDING) {` in boot → `if (true) {` (the carrier "0" holds too)                                → a6 red
 *   b8 `revealLock();\n  };` at the end of the push → `};` ('False' ignored)                                   → a4 red
 *   b9 one character of the built file's script changed (a stale built file)                                  → a9 red
 *   b10 (review r1 P-M1) `beltTimer = pending === '1' ? setTimeout(revealLock, 3000) : 0;` →
 *       `beltTimer = setTimeout(revealLock, pending === '1' ? 3000 : 30000);` (a 'True' keeps a 30 s belt)    → a1 red (at +1 h; green at +10 s), a7 red
 *   b12 (review r2 X2 NIT-2) `beltTimer = pending === '1' ? setTimeout(revealLock, 3000) : 0;` → `... : setTimeout(revealLock, 7200000);`
 *       (a 'True' keeps a 2 h belt: the 1 h check stays green)                                                  → a1 red, a7 red (timers one fewer)
 *   b11 (review r1 P-m1) `if (holdUp && !lockRevealed) {` → `if (!lockRevealed) {` (a pre-boot '1' arms the belt, which fires
 *       before boot and latches "revealed")  [fixb5: `revealLock` latches only once `.c-lock` exists, so the early belt reveals nothing and
 *       a8 stays GREEN under this mutation; the half `holdUp &&` is pinned by pins-fixb5/b-lock b5 (red)]       → b5 red (a8: b6's row only)
 */
import { fileURLToPath, pathToFileURL } from 'node:url';

export default async function (h) {
  const { ok, root, JSDOM, VirtualConsole, readFileSync, join } = h;
  const real = join(root, 'Spixi/Resources/Raw/html/lock.html');
  const file = process.env.LOCKB_FILE || real;
  const LAST_SCRIPT = /<script>((?:(?!<\/script>)[\s\S])*)<\/script>\s*<\/body>/;

  /* the controllable clock: window.setTimeout / clearTimeout of ONE page */
  function makeClock(win) {
    let now = 0, nextId = 1;
    const q = new Map();
    win.setTimeout = (fn, ms, ...args) => { const id = nextId++; q.set(id, { id, at: now + Math.max(0, Number(ms) || 0), fn, args }); return id; };
    win.clearTimeout = (id) => { q.delete(id); };
    return {
      advance(ms) {
        const target = now + ms;
        for (;;) {
          let best = null;
          for (const t of q.values()) if (t.at <= target && (!best || t.at < best.at || (t.at === best.at && t.id < best.id))) best = t;
          if (!best) break;
          q.delete(best.id); now = best.at;
          try { typeof best.fn === 'function' && best.fn(...best.args); } catch (e) { /* a page timer that throws is the page's business; the pin reads the DOM */ }
        }
        now = target;
      },
      pending: () => q.size,
    };
  }

  /* one page: carrier, optional pushes made BEFORE boot (at DOMContentLoaded: the inline scripts ran, the window load did not) */
  async function page(carrier, preBoot = [], preAdvance = 0) {
    const html = readFileSync(file, 'utf8').replace(/\*SL\{language-code\}/g, 'en-us').replace(/\*SL\{LockAuthPending\}/g, carrier)
      .replace(/\*SL\{SpixiThemeName\}/g, 'dark').replace(/\*SL\{[A-Za-z-]+\}/g, '0');
    const vc = new VirtualConsole();
    const errs = [];
    vc.on('jsdomError', (e) => { if (!/navigation|Not implemented/i.test(String(e && e.message))) errs.push(String(e && e.message).slice(0, 160)); });
    let clock = null;
    const pre = { threw: [], bootedAtPush: [] };
    const dom = new JSDOM(html, {
      url: pathToFileURL(file).href, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
      beforeParse(win) {
        clock = makeClock(win);
        win.addEventListener('DOMContentLoaded', () => {
          for (const v of preBoot) {
            pre.bootedAtPush.push(!!win.document.querySelector('.c-lock'));
            try { win.setAuthPending(v); } catch (e) { pre.threw.push(String(e)); }
          }
          if (preAdvance) clock.advance(preAdvance);   // review r1 P-m1: time passes BEFORE boot (the load handler has not run yet)
        });
      },
    });
    const win = dom.window;
    await new Promise((res) => { if (win.document.readyState === 'complete') res(); else win.addEventListener('load', res); });
    await new Promise((res) => setTimeout(res, 50));   // the page's own load handler (boot) ran before this resume
    const d = win.document;
    const api = {
      win, errs, pre, clock,
      advance: (ms) => clock.advance(ms),
      push: (v) => { try { win.setAuthPending(v); } catch (e) { errs.push('push threw: ' + e); } },
      mounted: () => !!d.querySelector('.c-lock'),
      /* the form is shown = mounted, not hidden, and the spinner is gone */
      formShown: () => { const f = d.querySelector('.c-lock'); return !!f && !f.hidden; },
      spinner: () => !!d.querySelector('#lock-root .boot'),
      state() { return (this.formShown() ? 'FORM' : 'hidden') + '/' + (this.spinner() ? 'spinner' : 'no-spinner'); },
      close: () => win.close(),
    };
    return api;
  }
  const HOLD = 'hidden/spinner', SHOWN = 'FORM/no-spinner';
  const S = {};   // the observed rows, one array per key
  const rec = (k, label, got, want) => { (S[k] = S[k] || []).push(label + '=' + got + (got === want ? '' : '(want ' + want + ')')); return got === want; };
  const allOk = (k, rows) => rows.every(Boolean);
  const report = (k) => ' ' + (S[k] || []).join(' · ');

  /* ---- a1 S2 ---- */
  {
    const p = await page('1');
    const r = [];
    r.push(rec('a1', 'mounted', p.mounted(), true));
    r.push(rec('a1', 'afterBoot', p.state(), HOLD));
    const before = p.clock.pending();   // the belt + whatever else the page keeps pending (one unrelated timer today)
    p.push('True');
    r.push(rec('a1', "'True'+0s", p.state(), HOLD));
    r.push(rec('a1', "timers'True'(one fewer: the belt is gone)", p.clock.pending(), before - 1));   // review r2 X2 NIT-2: no belt of ANY length is left pending (a 2 h belt would pass the 1 h check)
    p.advance(3100); r.push(rec('a1', '+3.1s', p.state(), HOLD));
    p.advance(6900); r.push(rec('a1', '+10s', p.state(), HOLD));
    p.advance(3590000); r.push(rec('a1', '+1h', p.state(), HOLD));   // review r1 P-M1: a 'True' that kept even a 30 s belt would be revealed by now
    r.push(rec('a1', 'noErrors', p.errs.length, 0));
    p.close();
    ok(allOk('a1', r), 'lockb a1 S2 ★ carrier "1", the push \'True\' right after boot, 10 s and 1 h later the password form is STILL hidden behind the spinner (the belt is stopped; the belt of the base would have shown it at 3 s) —' + report('a1'));
  }
  /* ---- a2 S3 ---- */
  {
    const p = await page('1');
    const r = [];
    p.push('True'); p.advance(10000); r.push(rec('a2', "'True'+10s", p.state(), HOLD));
    p.push('1');
    r.push(rec('a2', "'1'+0", p.state(), HOLD));
    p.advance(2900); r.push(rec('a2', "'1'+2.9s", p.state(), HOLD));
    p.advance(200); r.push(rec('a2', "'1'+3.1s", p.state(), SHOWN));
    p.close();
    /* a '1' while a belt is already running restarts it from now: 'True' → '1' at t, a second '1' 2 s later → revealed 3.1 s after the SECOND one only */
    const q = await page('1');
    q.push('1'); q.advance(2000); q.push('1'); q.advance(2900); r.push(rec('a2', "'1'+2s+'1'+2.9s", q.state(), HOLD));
    q.advance(200); r.push(rec('a2', "'1'+2s+'1'+3.1s", q.state(), SHOWN));
    q.close();
    ok(allOk('a2', r), 'lockb a2 S3 \'True\' (hold, no belt), 10 s later \'1\' (the belt starts from NOW): hidden at 2.9 s, revealed 3.1 s after the \'1\'; a second \'1\' restarts the belt —' + report('a2'));
  }
  /* ---- a3 S1 ---- */
  {
    const p = await page('1');
    const r = [];
    r.push(rec('a3', 'afterBoot', p.state(), HOLD));
    p.advance(2900); r.push(rec('a3', '2.9s', p.state(), HOLD));
    p.advance(200); r.push(rec('a3', '3.1s', p.state(), SHOWN));
    p.close();
    ok(allOk('a3', r), 'lockb a3 S1 carrier "1", no push: the form is hidden behind the spinner at 2.9 s and shown at 3.1 s (the base belt, unchanged) —' + report('a3'));
  }
  /* ---- a4 S4 ---- */
  {
    const r = [];
    let p = await page('1'); p.push('False'); r.push(rec('a4', 'plain+False', p.state(), SHOWN)); p.close();
    p = await page('1'); p.push('True'); p.advance(5000); p.push('False'); r.push(rec('a4', "'True'+5s+False", p.state(), SHOWN)); p.close();
    p = await page('1'); p.push('1'); p.advance(1000); p.push('False'); r.push(rec('a4', "'1'+1s+False", p.state(), SHOWN)); p.close();
    ok(allOk('a4', r), 'lockb a4 S4 \'False\' reveals at once — from the plain hold, from the deferred hold (\'True\') and after a \'1\' —' + report('a4'));
  }
  /* ---- a5 S5 ---- */
  {
    const r = [];
    let p = await page('1'); p.advance(3100); r.push(rec('a5', 'belt', p.state(), SHOWN));
    p.push('True'); p.advance(10000); r.push(rec('a5', "belt+'True'+10s", p.state(), SHOWN));
    p.push('1'); p.advance(10000); r.push(rec('a5', "belt+'1'+10s", p.state(), SHOWN)); p.close();
    p = await page('1'); p.push('True'); p.push('False'); r.push(rec('a5', 'False', p.state(), SHOWN));
    p.push('True'); p.advance(10000); r.push(rec('a5', "False+'True'+10s", p.state(), SHOWN));
    p.push('1'); p.advance(10000); r.push(rec('a5', "False+'1'+10s", p.state(), SHOWN)); p.close();
    ok(allOk('a5', r), 'lockb a5 S5 after a reveal (by the belt, and by \'False\') \'True\' and \'1\' leave the form visible — 10 s later the form is still shown (the form is never hidden again) —' + report('a5'));
  }
  /* ---- a6 S6 ---- */
  {
    const r = [];
    const p = await page('0');
    r.push(rec('a6', 'afterBoot', p.state(), SHOWN));
    p.push('True'); r.push(rec('a6', "'True'", p.state(), SHOWN));
    p.push('1'); p.advance(10000); r.push(rec('a6', "'1'+10s", p.state(), SHOWN));
    p.close();
    ok(allOk('a6', r), 'lockb a6 S6 carrier "0" (WinUI): the form at once, no spinner; \'True\' / \'1\' change nothing —' + report('a6'));
  }
  /* ---- a7 S7 ---- */
  {
    const r = [];
    let p = await page('1');
    p.push('true'); p.push(true);
    r.push(rec('a7', "'true'+true+0s", p.state(), HOLD));
    p.advance(2900); r.push(rec('a7', '2.9s', p.state(), HOLD));
    p.advance(200); r.push(rec('a7', '3.1s', p.state(), SHOWN));
    p.close();
    p = await page('1');
    const before7 = p.clock.pending();
    p.push('True'); p.push('true'); p.push(true);
    r.push(rec('a7', "timers'True'+'true'+true(one fewer)", p.clock.pending(), before7 - 1));   // review r2 X2 NIT-2
    p.advance(10000); r.push(rec('a7', "'True'+'true'+true+10s", p.state(), HOLD));
    p.advance(3590000); r.push(rec('a7', "'True'+'true'+true+1h", p.state(), HOLD));   // review r1 P-M1
    p.close();
    ok(allOk('a7', r), 'lockb a7 S7 \'true\' (lower case) and the boolean true are ignored as in the base: the belt still reveals at 3.1 s, and after a \'True\' they do not end the hold (10 s and 1 h later) —' + report('a7'));
  }
  /* ---- a8 pushes before boot ---- */
  {
    const r = [];
    let p = await page('1', ['True', '1', 'true'], 3100);   // review r1 P-m1: 3.1 s of modelled time right after the pre-boot pushes, before boot
    r.push(rec('a8', 'preBootMade', p.pre.bootedAtPush.length === 3 && p.pre.bootedAtPush.every((x) => x === false), true));
    r.push(rec('a8', 'preThrew', p.pre.threw.length, 0));
    r.push(rec('a8', 'afterBoot', p.state(), HOLD));
    p.advance(2900); r.push(rec('a8', '2.9s', p.state(), HOLD));
    p.advance(200); r.push(rec('a8', '3.1s', p.state(), SHOWN));
    r.push(rec('a8', 'errs', p.errs.length, 0));
    p.close();
    p = await page('0', ['True', '1'], 3100);
    r.push(rec('a8', 'c0threw', p.pre.threw.length, 0));
    r.push(rec('a8', 'c0', p.state(), SHOWN));
    p.close();
    ok(allOk('a8', r), 'lockb a8 \'True\' / \'1\' / \'true\' pushed BEFORE boot (before the window load, no screen yet): nothing throws and nothing is latched, even with 3.1 s of the modelled clock passing before boot — carrier "1": the base belt still reveals at 3.1 s after boot; carrier "0": the form at once —' + report('a8'));
  }
  /* ---- a9 the built file holds the source's script ---- */
  {
    const src = readFileSync(join(root, 'src/shells/lock.html'), 'utf8');
    const built = readFileSync(file, 'utf8');
    const ms = LAST_SCRIPT.exec(src);
    const hasPush = !!ms && /window\.setAuthPending = function/.test(ms[1]) && /lockb \(#1825 \(1\)\)/.test(ms[1]);
    ok(hasPush && built.includes(ms[1]),
      'lockb a9 the BUILT lock.html holds the last inline script of src/shells/lock.html byte for byte (and that script carries the lockb push) — built=' + file.replace(root, '.') + ' srcScript=' + (ms ? ms[1].length : 'none'));
  }
}
