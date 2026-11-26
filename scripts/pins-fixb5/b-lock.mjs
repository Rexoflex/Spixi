/* ==== fixb5 · B — the lock page shows its form when the reveal push arrives BEFORE the page started (#1924, #1844 (6)); EXECUTED on the BUILT shell ====
 *
 * LIMITS — read first (DECISIONS 1735: the limits of a pin are stated, not hidden).
 *   · jsdom, NOT the Android WebView. It runs the BUILT Spixi/Resources/Raw/html/lock.html (its own scripts, the real bundle) with the C# carriers
 *     substituted by hand (LockAuthPending "1" / "0", language en-us, theme dark, every other carrier "0"). "Shown" = the `.c-lock` form exists and has no
 *     `hidden` attribute and the `.boot` spinner is gone; paint is NOT looked at.
 *   · TIME IS MODELLED like pins-lockb/a-shell: window.setTimeout / clearTimeout are a controllable clock, so the 3 000 ms belt is advanced, not waited
 *     for. The real WebView timer and the order in which the native layer pushes are NOT proven. "Before the page started" is simulated by calling
 *     `window.setAuthPending(v)` at DOMContentLoaded: the inline scripts ran (the push is defined), the window load handler (boot) did not.
 *   · That C# can send a reveal that early is not proven here; the pin states what the shell does if it does.
 *
 * KEYS (one `ok` each):
 *   fixb5 b1 carrier "1" + `setAuthPending("False")` before boot: the form is mounted at boot; at the latest when the 3 s belt fires it is shown, and it stays shown at
 *            +10 s and +1 h and after a later 'True' / '1' push
 *   fixb5 b2 carrier "0" + the same early push: the form is shown at once after boot and stays shown (+1 h; a later 'True' / '1' push changes nothing)
 *   fixb5 b3 carrier "1" + an early 'False' and then a LATE 'False' after boot: shown at once by the late push (a later reveal still works)
 *   fixb5 b4 no early push, carrier "1": the base behaviour is unchanged — hidden at 2.9 s, shown at 3.1 s
 *   fixb5 b5 carrier "1", an early '1' (before boot) then 'True' 100 ms after boot: no belt is left pending (one timer fewer than after boot), and the form is still hidden
 *            behind the spinner at +3.1 s and +1 h (the push's `holdUp &&` half: an early '1' arms nothing, so the 'True' stops the only belt)
 * DELIBERATE BREAK (#802) — in a COPY of the tree, in the BUILT Spixi/Resources/Raw/html/lock.html (run with --root <copy>):
 *   break 1: revealLock's `if (!screen) return;` → `if (!lockHost) return;` and `screen.hidden = false;` → `if (screen) screen.hidden = false;` (the old guard:
 *      the flag latches over the spinner) → b1 red (hidden at the belt, at +1 h) and b3 red (no spinner after boot); b2, b4 and b5 stay green
 *   break 2: the push's `if (holdUp && !lockRevealed) {` → `if (!lockRevealed) {` (lockb's break b11: an early '1' arms a belt before boot that 'True' cannot stop) → b5 red (a timer
 *      is left, and the form is revealed at +3.1 s); b1 to b4 stay green
 */
import { pathToFileURL } from 'node:url';

export default async function (h) {
  const { ok, root, JSDOM, VirtualConsole, readFileSync, join } = h;
  const file = join(root, 'Spixi/Resources/Raw/html/lock.html');

  function makeClock(win) {
    let now = 0, nextId = 1;
    const q = new Map();
    win.setTimeout = (fn, ms, ...args) => { const id = nextId++; q.set(id, { id, at: now + Math.max(0, Number(ms) || 0), fn, args }); return id; };
    win.clearTimeout = (id) => { q.delete(id); };
    return {
      pending: () => q.size,
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
    };
  }

  /* one page: the carrier, and the pushes made at DOMContentLoaded (before boot) */
  async function page(carrier, preBoot = []) {
    const html = readFileSync(file, 'utf8').replace(/\*SL\{language-code\}/g, 'en-us').replace(/\*SL\{LockAuthPending\}/g, carrier)
      .replace(/\*SL\{SpixiThemeName\}/g, 'dark').replace(/\*SL\{[A-Za-z-]+\}/g, '0');
    const vc = new VirtualConsole();
    vc.on('jsdomError', () => {});
    let clock = null;
    const pre = { threw: [], formAtPush: [] };
    const dom = new JSDOM(html, {
      url: pathToFileURL(file).href, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
      beforeParse(win) {
        clock = makeClock(win);
        win.addEventListener('DOMContentLoaded', () => {
          for (const v of preBoot) {
            pre.formAtPush.push(!!win.document.querySelector('.c-lock'));
            try { win.setAuthPending(v); } catch (e) { pre.threw.push(String(e)); }
          }
        });
      },
    });
    const win = dom.window;
    await new Promise((res) => { if (win.document.readyState === 'complete') res(); else win.addEventListener('load', res); });
    await new Promise((res) => setTimeout(res, 50));   // the page's own load handler (boot) ran before this resume
    const d = win.document;
    return {
      pre, clock,
      advance: (ms) => clock.advance(ms),
      pending: () => clock.pending(),
      push: (v) => win.setAuthPending(v),
      mounted: () => !!d.querySelector('.c-lock'),
      state() { const f = d.querySelector('.c-lock'); return (f && !f.hidden ? 'FORM' : 'hidden') + '/' + (d.querySelector('#lock-root .boot') ? 'spinner' : 'no-spinner'); },
      close: () => win.close(),
    };
  }
  const SHOWN = 'FORM/no-spinner';
  const seen = (rows) => rows.map(([k, got, want]) => k + '=' + got + (got === want ? '' : '(want ' + want + ')')).join(' · ');

  /* b1 — carrier "1", early 'False' */
  {
    const p = await page('1', ['False']);
    const rows = [['formAtEarlyPush', String(p.pre.formAtPush[0]), 'false'], ['threw', p.pre.threw.length, 0], ['mountedAtBoot', p.mounted(), true]];
    p.advance(3100); rows.push(['belt+3.1s', p.state(), SHOWN]);
    p.advance(6900); rows.push(['+10s', p.state(), SHOWN]);
    p.advance(3590000); rows.push(['+1h', p.state(), SHOWN]);
    p.push('True'); p.push('1'); p.advance(10000); rows.push(['after True/1', p.state(), SHOWN]);
    ok(rows.every(([, g, w]) => g === w), 'fixb5 b1 carrier "1": a reveal before boot() leaves the form shown at the latest when the belt fires, and it stays shown — ' + seen(rows));
    p.close();
  }
  /* b2 — carrier "0", early 'False' */
  {
    const p = await page('0', ['False']);
    const rows = [['threw', p.pre.threw.length, 0], ['afterBoot', p.state(), SHOWN]];
    p.advance(3100); rows.push(['+3.1s', p.state(), SHOWN]);
    p.advance(3596900); rows.push(['+1h', p.state(), SHOWN]);
    p.push('True'); p.push('1'); p.advance(10000); rows.push(['after True/1', p.state(), SHOWN]);
    ok(rows.every(([, g, w]) => g === w), 'fixb5 b2 carrier "0": the same early push — the form is shown after boot and stays shown — ' + seen(rows));
    p.close();
  }
  /* b3 — carrier "1", early 'False', then a late 'False' */
  {
    const p = await page('1', ['False']);
    const rows = [['afterBoot', p.state(), 'hidden/spinner']];
    p.push('False'); rows.push(['lateFalse', p.state(), SHOWN]);
    p.advance(3100); rows.push(['+3.1s', p.state(), SHOWN]);
    ok(rows.every(([, g, w]) => g === w), 'fixb5 b3 carrier "1": an early push latches nothing (the spinner holds after boot), and a late push then reveals at once — ' + seen(rows));
    p.close();
  }
  /* b5 — an early '1' arms no belt: the 'True' after boot stops the only one */
  {
    const p = await page('1', ['1']);
    const rows = [['afterBoot', p.state(), 'hidden/spinner']];
    p.advance(100);   // the page's own short timers run first
    const before = p.pending();
    p.push('True');
    rows.push(['timers after True (one fewer)', p.pending(), before - 1]);
    p.advance(3000); rows.push(['+3.1s', p.state(), 'hidden/spinner']);
    p.advance(3596900); rows.push(['+1h', p.state(), 'hidden/spinner']);
    ok(rows.every(([, g, w]) => g === w), 'fixb5 b5 carrier "1": an early \'1\' then \'True\' 100 ms after boot — no belt is left, the form stays hidden behind the spinner at +3.1 s and +1 h — ' + seen(rows));
    p.close();
  }
  /* b4 — no early push: the base belt */
  {
    const p = await page('1');
    const rows = [['afterBoot', p.state(), 'hidden/spinner']];
    p.advance(2900); rows.push(['+2.9s', p.state(), 'hidden/spinner']);
    p.advance(200); rows.push(['+3.1s', p.state(), SHOWN]);
    ok(rows.every(([, g, w]) => g === w), 'fixb5 b4 carrier "1", no early push: unchanged — hidden at 2.9 s, shown at 3.1 s — ' + seen(rows));
    p.close();
  }
}
