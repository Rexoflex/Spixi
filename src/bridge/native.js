/**
 * native.js — the REAL-bridge transport core (Phase 3 item 2,
 * docs/native-bridge-spec.md). The demos' inline mocks are the behavioral
 * contract; this file is the thin adapter that carries the same shell
 * callbacks over the frozen MAUI bridge (ARCHITECTURE §2, bridge-audit-A/B).
 *
 * JS→C#: `location.href = "ixian:<command>[:<params>]"` — RAW legacy
 *   composition, no encoding (C# HttpUtility.UrlDecodes the whole URL; a
 *   pre-encode here would double-decode on some WebViews — mirror legacy,
 *   hazards stay §9 asks, the real fix is the §8 `ixian:secure` proposal).
 * C#→JS: C# injects `executeUiCommand(fnRef, 'b64', ...)` — bare page-global
 *   function references, every arg a Base64-encoded UTF-8 string.
 *
 * DELIBERATE divergences from legacy spixi.js (spec §2):
 *   1. NO escapeParameter() on decoded args — legacy HTML-escaped every arg
 *      because handlers concatenated innerHTML; our shells are textContent-
 *      only, so escaping would render literal `&amp;` to users.
 *   2. NO alert() on dispatch errors — fail soft to console.error (legacy
 *      alerted the stack trace at the user).
 *   3. ready() emits `ixian:onload` ONCE (latched). `ixian:ready:<shellId>`
 *      dual-emit is NOT sent until BE approves the §8 proposal — several C#
 *      handlers match with Contains, so unknown commands aren't provably inert.
 *
 * Capability handshake (#115 convention): C# injects generation-time config as
 * `window.SPIXI_ENV` (ARCHITECTURE §7); `SPIXI_ENV.capabilities` gates every
 * §8/§9 feature. Absent env / absent key = OFF — shells degrade gracefully,
 * so this file works against TODAY'S C# with zero changes.
 *
 * No component imports — pure transport. Page adapters (scan-page.js,
 * lock-page.js) compose shells with a bridge instance.
 */

import { p1Sent } from '../components/p1.js';   // ★ P-1 (#1127) — TEMPORARY, retire with the [P1] set

/** Legacy base64ToBytes mirror (spixi.js:97): Base64 → UTF-8 string.
 *
 * PERF (Damir F5 2026-08-13, apps tab): `Uint8Array.from(bin, cb)` runs the callback
 * through the iterator protocol — measured 24.6 ms for one 320 KB app-icon argument in
 * Chromium 1194 vs 0.8 ms for the index loop below (~30×). Two paths, same result:
 *   · ASCII (every data: URI, every address, every number, most excerpts) — `atob`
 *     already produced the final string, so there is nothing left to decode.
 *   · anything with a byte > 127 — plain index loop into a Uint8Array, then TextDecoder
 *     (byte-identical to the old expression; the UTF-8 decode itself is unchanged).
 */
export function b64ToUtf8(b64) {
  const bin = atob(b64);
  const len = bin.length;
  let i = 0;
  for (; i < len; i++) if (bin.charCodeAt(i) > 127) break;
  if (i === len) return bin;                       // pure ASCII → atob's output IS the string
  const bytes = new Uint8Array(len);
  for (let j = 0; j < len; j++) bytes[j] = bin.charCodeAt(j);
  return new TextDecoder().decode(bytes);
}

/**
 * createNativeBridge({ emit, win })
 *   emit(command) — transport sink; default sets location.href (the real
 *     bridge). Injectable for tests and for the demos' mock layer.
 *   win — window to expose C#-callable globals on (default: window).
 * Returns { send, expose, exposeAll, ready, cap, capabilities }.
 */
export function createNativeBridge({ emit, win } = {}) {
  const w = win || window;
  /* ★ Batch A loop r1 (A-1/A-2, 2026-08-24): the DEFAULT sink is a SERIALIZED outbox.
     The MAUI WebView processes ONE URL navigation at a time, so two `location.href`
     sets in the same turn drop the first. launch.html found this (#N75) and queued
     its own sends; every other shell still emitted raw. The delete flow (A6) emits
     `ixian:removehistory:` and `ixian:sharedGroups:` in one click handler, the W9
     request loop emits one `ixian:sendrequest:` per ticked contact, contact_details
     emits `ixian:onload` + `ixian:sharedGroups` back to back — all the same class.
     The FIRST command still goes out synchronously (drain runs at once); each later
     one lands on its own macrotask. C# cancels every ixian: navigation (e.Cancel),
     so the WebView stays on the page and the next command fires cleanly.
     An injected `emit` (tests, the demo mock layer, launch.html's own queue) bypasses it. */
  const outbox = [];
  let draining = false;
  const drain = () => {
    if (!outbox.length) { draining = false; return; }
    // loop r2 R2-1: a throwing href set must cost ONE command, never the whole bridge
    try { w.location.href = outbox.shift(); }
    finally { setTimeout(drain, 0); }
  };
  const queued = (command) => {
    outbox.push(command);
    if (!draining) { draining = true; drain(); }
  };
  const sink = emit || queued;
  let readySent = false;
  let paintedSent = false;   // ★ Session M: the present signal is one-shot — see bridge.painted

  const capabilities = (w.SPIXI_ENV && w.SPIXI_ENV.capabilities) || {};

  const bridge = {
    /** Emit a full raw command. Must carry the ixian: scheme — fail loud in dev. */
    send(command) {
      if (typeof command !== 'string' || !command.startsWith('ixian:')) {
        throw new TypeError('bridge.send expects a full "ixian:…" command, got: ' + command);
      }
      sink(command);
      try { p1Sent(command); } catch (e) {}   // ★ P-1 (#1127) — TEMPORARY, retire with the [P1] set
    },
    /** Define a C#-callable page global. fn receives DECODED (raw) strings. */
    expose(name, fn) {
      w[name] = fn;
      return fn;
    },
    exposeAll(map) {
      for (const name of Object.keys(map)) bridge.expose(name, map[name]);
    },
    /** Page-ready signal — ixian:onload, once (C# queues pushes until then). */
    ready() {
      if (readySent) return;
      readySent = true;
      bridge.send('ixian:onload');
    },
    /** ★★ Session M — THE PRESENT SIGNAL, one implementation for every shell.
     *
     * C# holds a load-then-present navigation for a flat 120 ms (`revealDelayMs`,
     * SpixiContentPage) so the shell can paint the data its onload burst pushed. That
     * timer was measured against the CHAT and found to be waiting for a paint that had
     * already happened (#764: drain → present ~130 ms against a 21–27 ms paint), and
     * #766 then proved the three FORM pages were waiting for nothing at all. This is the
     * generalisation to the DATA pages: the shell says when it has painted, and C#
     * presents THERE instead of at 120 ms.
     *
     * ★ It can only ever make a present EARLIER. C# races this signal against the same
     * 120 ms it uses today, so a shell that never sends it — an old built shell, a page
     * whose data never lands — behaves exactly as it does now. That asymmetry is the
     * whole safety argument, and it is why this needed no per-page timer and no backstop
     * of its own (the chat's 400 ms backstop exists because the chat asks for
     * `revealDelayMs: 0` and has nothing else to fall back on).
     *
     * ⚠ CALL IT WHEN THE DATA IS ON GLASS, NOT WHEN IT ARRIVES. The double rAF is the
     * point: the first frame runs after the render that queued it, the second after the
     * browser has committed it. Called before the first real render, this signal presents
     * an empty page — which is worse than the 120 ms it saves.
     *
     * Latched: a shell that re-renders (a re-flush, a channel switch) may call it every
     * time; C# ignores it once presented, and this latch means the frames are not even
     * scheduled again.
     *
     * REVERSAL: stop calling this and every page returns to the flat 120 ms hold. */
    painted() {
      if (paintedSent) return;
      paintedSent = true;
      const fire = () => { try { bridge.send('ixian:painted'); } catch (e) {} };
      if (typeof w.requestAnimationFrame === 'function') w.requestAnimationFrame(() => w.requestAnimationFrame(fire));
      else fire();
    },
    cap(name) { return !!capabilities[name]; },
    capabilities,
    /** ★★ #1028 (walk R.8/R.9/P.11): the NATIVE copy. Spixi's own Copy did not reach the system
     *  pasteboard on the Mac and the iPhone — the page is a file:// WKWebView, the async clipboard
     *  API is absent or refused there, and execCommand('copy') returned true for a copy that other
     *  apps could not paste. C# now writes the text (`ixian:copytext:<token>:<base64url>` →
     *  `Clipboard.Default.SetTextAsync`, SpixiContentPage.onNavigatingGlobal) and pushes
     *  `nativeCopyResult(token, '1'|'0')`, so the ✓ follows what the NATIVE clipboard did.
     *  Returns NULL synchronously when it will not send (empty / over the cap); otherwise a promise that
     *  resolves true / false from C# (DEFINITIVE — #1035), or null when no answer comes back (an older exe
     *  without the verb) — clipboard.js then falls back to the in-page path.
     *  WRITE-ONLY: nothing here reads the clipboard, and the payload is never logged. */
    copy(text) {
      const s = String(text == null ? '' : text);
      /* ★ #1035 (#46 auditor A, m3): a copy the native side will never take is refused SYNCHRONOUSLY
         (plain null, not a promise), so clipboard.js runs its in-page fallback inside the click's gesture
         — a promise callback is a microtask late and WKWebView refuses execCommand outside the gesture. */
      if (!s || s.length > NATIVE_COPY_MAX) return null;
      let payload;
      try { payload = utf8ToB64Url(s); } catch (e) { return null; }
      const token = String(++copySeq);
      return new Promise((resolve) => {
        const timer = w.setTimeout(() => { pendingCopies.delete(token); resolve(null); }, NATIVE_COPY_TIMEOUT_MS);
        pendingCopies.set(token, { resolve, timer });
        try { bridge.send('ixian:copytext:' + token + ':' + payload); }
        catch (e) { w.clearTimeout(timer); pendingCopies.delete(token); resolve(null); }
      });
    },
  };
  /* The push C# answers with. ONE definition per window, set here so every shell that has a bridge
     has the global before the first copy — C# emits it as a BARE global reference and an undefined
     one throws before the dispatcher can catch it (#258). Unknown / stale tokens are ignored. */
  const pendingCopies = new Map();
  w.nativeCopyResult = (token, ok) => {
    const p = pendingCopies.get(String(token));
    if (!p) return;
    pendingCopies.delete(String(token));
    w.clearTimeout(p.timer);
    p.resolve(ok === '1');
  };
  /* clipboard.js (a component) must not import the transport, and native.js imports no component —
     so the hand-over is ONE window hook. Every shell that builds a bridge gets the native copy; a
     page without one (the demos, a mini-app) keeps the in-page path. */
  w.__spixiNativeCopy = bridge.copy;
  return bridge;
}

/** ★ #1028 — the cap on one native copy. The composer's own limit (#A7): a longer text (a very long
 *  multi-message selection) takes the in-page path instead of a URL of several hundred KB. */
export const NATIVE_COPY_MAX = 64000;
/** No answer inside this window = no native verb on this exe → the in-page fallback. */
export const NATIVE_COPY_TIMEOUT_MS = 2000;
let copySeq = 0;

/** UTF-8 → base64url (RFC 4648 §5, no padding). The URL-safe alphabet survives C#'s whole-URL
 *  HttpUtility.UrlDecode unchanged — a '+' would have come back as a space (security-review MAJOR #8). */
export function utf8ToB64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Define the executeUiCommand dispatcher C# injects calls against.
 * Divergences 1 + 2 (docblock) live here.
 */
export function installExecuteUiCommand(win) {
  const w = win || window;
  w.executeUiCommand = function executeUiCommand(cmd) {
    const args = [];
    try {
      // C# sendUiCommand emits a bare `null` (unquoted) for null args
      // (Utils.cs:77) → the arg arrives as JS null, and atob(null) throws,
      // which previously dropped the WHOLE command (e.g. setBalance's nick is
      // null before the profile loads → the balance push vanished). Treat
      // null/undefined as an empty string so the rest of the args still deliver.
      // A leading `data:` passes through undecoded. ★ S15 (O-11, #1293): C# no longer
      // sends one — Utils.sendUiCommand base64-encodes EVERY argument again (the #340 raw
      // data-URI fast path is removed), and ':' is outside the base64 alphabet, so no
      // C# argument can take this branch. It stays because a strict decode here would
      // buy nothing — the JS-literal risk was on the C# side, where the value was
      // composed, and that path is gone — while dropping it would turn a raw data: URI
      // from any other caller (the suite's push helpers use one) into a failed atob that
      // loses the whole command.
      for (let i = 1; i < arguments.length; i++) {
        const a = arguments[i];
        if (a == null) { args.push(''); continue; }
        args.push(typeof a === 'string' && a.startsWith('data:') ? a : b64ToUtf8(a));
      }
      if (typeof cmd !== 'function') {
        // eslint-disable-next-line no-console
        console.error('executeUiCommand: not a function', cmd);
        return;
      }
      cmd.apply(null, args);
    } catch (e) {
      // fail soft — never alert, never rethrow into EvaluateJavaScriptAsync
      // eslint-disable-next-line no-console
      console.error('executeUiCommand dispatch failed', e);
    }
  };
  return w.executeUiCommand;
}
