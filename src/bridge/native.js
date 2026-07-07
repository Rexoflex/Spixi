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

/** Legacy base64ToBytes mirror (spixi.js:97): Base64 → UTF-8 string. */
export function b64ToUtf8(b64) {
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.codePointAt(0)));
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
  const sink = emit || ((command) => { w.location.href = command; });
  let readySent = false;

  const capabilities = (w.SPIXI_ENV && w.SPIXI_ENV.capabilities) || {};

  const bridge = {
    /** Emit a full raw command. Must carry the ixian: scheme — fail loud in dev. */
    send(command) {
      if (typeof command !== 'string' || !command.startsWith('ixian:')) {
        throw new TypeError('bridge.send expects a full "ixian:…" command, got: ' + command);
      }
      sink(command);
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
    cap(name) { return !!capabilities[name]; },
    capabilities,
  };
  return bridge;
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
      for (let i = 1; i < arguments.length; i++) {
        const a = arguments[i];
        args.push(a == null ? '' : b64ToUtf8(a));
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
