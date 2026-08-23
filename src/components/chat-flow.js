/**
 * c-chat-flow — "Live flow", the animated chat background pattern style
 * (W5, Damir 2026-08-12; RE-DIALLED by the F5 of 2026-08-13).
 *
 * A grid of short dashes, each angled by a smooth time-drifting field. It
 * REPLACES the static ::before tile while active — chat-pattern.css sets
 * --chat-pattern-tile: none under [data-chat-pattern='flow'], and this module
 * paints the canvas instead.
 *
 *   attachChatFlow(host)            → controller { detach, pause, resume, sync }
 *   setChatFlowPaused(host, paused) → free fn (#44 grammar) for the shell/C#
 *
 * TUNING — Damir F5 2026-08-13 ("the live flow is too far away and too small so
 * barely visible movements"), superseding his own 2026-08-12 prototype dial
 * (0.4 · 20 · 4.5 · 1 · 95). Each complaint maps to one number, measured in
 * Chromium against real bubbles at 1100×760 and 420×760, dpr 2:
 *   "too far away"  → spacing 20 → 15px (dash-to-gap 0.23 → 0.47; +78% dashes).
 *   "too small"     → dash 4.5 → 7px, lineWidth 1 → 1.25px. This is ALSO half of
 *                     the motion fix: the dashes only ROTATE, and the endpoint
 *                     travel produced by a given angular rate scales with dash
 *                     length — at 4.5px a full second of drift moved an endpoint
 *                     less than a pixel, i.e. the field was animating correctly
 *                     and rendering the result below the resolution of the eye.
 *   "barely visible → fieldScale 95 → 44px and speed 0.4 → 0.85 rad/s. At 95 a
 *    movements"       1100px pane was ~11 field units wide, so neighbouring
 *                     dashes were near-parallel and the whole field turned as
 *                     one slab — motion with no relative motion reads as still.
 * Measured effect: mean |Δluma| over a 1s sample went 0.37 → 1.74 (4.7×), and
 * the share of pixels changing by ≥4/255 in one second went 2.0% → 7.6%.
 * Cost: 0.29 → 0.42 ms per frame at 2200×1520 device px — ~1% of the 40ms
 * budget, so the 25fps cap is untouched.
 *
 * DESKTOP ONLY (Damir 2026-08-12): constant animation is a battery cost on
 * phones, so the style picker offers it only under :root[data-desktop]. This
 * module does not enforce that — the picker and the pre-paint pref script do
 * (a mobile device that somehow carries the pref falls back to line art).
 *
 * Ink + intensity are READ FROM COMPUTED STYLE every frame, never captured:
 * a theme switch or a move of the visibility dial applies live with no
 * re-mount. --chat-pattern-opacity 0 (visibility Off) paints nothing at all,
 * so "Off" keeps working exactly as it does for the tiles.
 *
 * Budget: ~25fps (frames closer than 40ms are skipped), devicePixelRatio
 * capped at 2, ResizeObserver-driven backing-store sizing, the rAF loop is
 * PAUSED whenever the document is hidden, and prefers-reduced-motion renders
 * ONE static frame with no loop at all (the reduced-motion contract is honored
 * in JS here because the token trick in tokens.css can only reach CSS motion).
 *
 * STACKING (#46 loop MAJOR-2 — read this before you "simplify"):
 * the canvas is the FIRST child of .c-chat-canvas, and it has z-index AUTO.
 * A positioned z-auto child paints in TREE ORDER: above the host gradient
 * background, and below every later sibling. That is the layer this module
 * needs, and it needs nothing else.
 * ⚠ The host must NOT become a stacking context. A long-pressed message row
 * lifts to z-42 to clear the z-40 scrim (message-menu.css). A z-index, a
 * transform, a filter or `isolation` on .c-chat-canvas caps that lift at the
 * host, and the lift then fails silently. An earlier version of this module
 * used z-index:-1 here plus `[data-flow] { z-index: 0 }` on the host. That
 * pair broke the lift under Live flow, so both are gone.
 * Do NOT reach for a blanket position:relative on the siblings instead: that
 * pulls the absolutely positioned jump-to-latest FAB into flow (left-aligned
 * FAB + a blank band above the composer). message-bubble.css already sets
 * position:relative on the children.
 */

export const CHAT_FLOW = {   // Damir F5 2026-08-13 (supersedes the 2026-08-12 dial)
  speed: 0.85,               // field drift, radians of t per second
  spacing: 15,               // CSS px between dash centres
  dash: 7,                   // CSS px, full dash length
  lineWidth: 1.25,           // CSS px, dash stroke weight
  fieldScale: 44,            // CSS px per field unit
  fps: 25,                   // frame budget (skip anything under 1000/fps ms)
  maxDpr: 2,
};

const FRAME_MS = 1000 / CHAT_FLOW.fps;

/** angle(x, y, t) — x,y in FIELD UNITS (px / fieldScale), t in drifted seconds */
function fieldAngle(x, y, t) {
  return 0.9 * (Math.sin(1.7 * x + t) + Math.cos(1.3 * y - 0.8 * t) + Math.sin(0.8 * (x + y) + 0.5 * t));
}

function reduceMotion() {
  try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (e) { return false; }
}

/**
 * attachChatFlow(host, opts?)
 *   opts.still     — paint ONE frame and never loop (the settings swatch/preview:
 *                    a live rAF per tile in a settings list is not worth a battery)
 *   opts.spacing / opts.dash / opts.fieldScale — preview-only density overrides.
 *                    The CHAT never passes these: its tuning is Damir-locked.
 */
export function attachChatFlow(host, opts = {}) {
  if (!host || host.__chatFlow) return host && host.__chatFlow;
  const tune = {
    spacing: opts.spacing > 0 ? opts.spacing : CHAT_FLOW.spacing,
    dash: opts.dash > 0 ? opts.dash : CHAT_FLOW.dash,
    fieldScale: opts.fieldScale > 0 ? opts.fieldScale : CHAT_FLOW.fieldScale,
    lineWidth: opts.lineWidth > 0 ? opts.lineWidth : CHAT_FLOW.lineWidth,
  };
  const canvas = document.createElement('canvas');
  canvas.className = 'c-chat-flow';
  canvas.setAttribute('aria-hidden', 'true');
  // getContext must be treated as THROWING, not merely nullable: jsdom (the
  // smoke harness) raises "not implemented" rather than returning null, and a
  // hardened WebView can do the same. Either way the caller falls back to the
  // line-art tile — a pattern style must never be able to break the shell.
  let ctx = null;
  try { ctx = canvas.getContext && canvas.getContext('2d'); } catch (e) { ctx = null; }
  if (!ctx) return null;                       // no 2d context → tile fallback below

  // FIRST child: the paint order above depends on it (see STACKING above).
  // data-flow is a state MARKER only. No style may hang a stacking context on it.
  host.prepend(canvas);
  host.dataset.flow = '';

  let dpr = 1, w = 0, h = 0;
  let raf = 0, last = 0, paused = false, detached = false;
  const still = !!opts.still || reduceMotion();
  // t0 is captured at mount, not at module load: two chats opened minutes apart
  // should not start the field at wildly different phases.
  const t0 = (typeof performance === 'object' && performance.now) ? performance.now() : Date.now();

  function measure() {
    const cw = host.clientWidth, ch = host.clientHeight;
    dpr = Math.min(CHAT_FLOW.maxDpr, (typeof devicePixelRatio === 'number' && devicePixelRatio > 0) ? devicePixelRatio : 1);
    const nw = Math.max(1, Math.round(cw * dpr));
    const nh = Math.max(1, Math.round(ch * dpr));
    if (nw === w && nh === h) return false;
    w = canvas.width = nw;
    h = canvas.height = nh;
    return true;
  }

  function draw(tMs) {
    if (!w || !h) return;
    const cs = getComputedStyle(host);
    const ink = (cs.getPropertyValue('--chat-pattern-ink') || '').trim();
    const rawOpacity = parseFloat(cs.getPropertyValue('--chat-pattern-opacity'));
    const opacity = isNaN(rawOpacity) ? 1 : Math.min(1, Math.max(0, rawOpacity));
    ctx.clearRect(0, 0, w, h);
    // visibility Off (or an ink we can't resolve) → paint NOTHING; the canvas
    // stays mounted and transparent, so the gradient shows through untouched.
    if (!ink || opacity <= 0) return;

    const t = (tMs / 1000) * CHAT_FLOW.speed;
    const step = tune.spacing * dpr;
    const half = (tune.dash / 2) * dpr;
    const unit = tune.fieldScale * dpr;   // px → field units, at device scale

    ctx.globalAlpha = opacity;
    ctx.strokeStyle = ink;
    ctx.lineWidth = tune.lineWidth * dpr;
    ctx.lineCap = 'round';
    // ONE path for the whole grid — a stroke() per dash costs ~30× more and
    // was the difference between 25fps and jank on the Windows F5 pass.
    ctx.beginPath();
    for (let py = step / 2; py < h + step; py += step) {
      const yu = py / unit;
      for (let px = step / 2; px < w + step; px += step) {
        const a = fieldAngle(px / unit, yu, t);
        const dx = Math.cos(a) * half, dy = Math.sin(a) * half;
        ctx.moveTo(px - dx, py - dy);
        ctx.lineTo(px + dx, py + dy);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = 0;
    if (detached || paused) return;
    if (now - last >= FRAME_MS) { last = now; draw(now - t0); }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (detached || paused || still || raf) return;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  /** repaint one frame without running the loop (theme flip, dial move, resize) */
  function sync() {
    if (detached) return;
    measure();
    const now = (typeof performance === 'object' && performance.now) ? performance.now() : Date.now();
    draw(still ? 0 : now - t0);
  }

  /* measure() reassigns canvas.width/height, which CLEARS the backing store.
     Resetting `last` forces the very next rAF to redraw instead of being
     skipped by the 40ms budget gate — without it, dragging a window edge
     clears every frame while only repainting every ~50ms, and the pattern
     strobes off and on for the whole drag (#46 audit). */
  const ro = (typeof ResizeObserver === 'function')
    ? new ResizeObserver(() => { if (measure()) last = 0; if (still || paused) sync(); })
    : null;
  if (ro) ro.observe(host);
  else window.addEventListener('resize', sync);

  // the WebView keeps running when the app is backgrounded or the chat is
  // covered by a native page — hidden means STOP, not "draw to nobody"
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') stop();
    else { last = 0; start(); if (still) sync(); }
  };
  document.addEventListener('visibilitychange', onVisibility);

  const ctrl = {
    sync,
    pause() { paused = true; stop(); },
    resume() { if (!paused) return; paused = false; last = 0; start(); if (still) sync(); },
    detach() {
      detached = true;
      stop();
      if (ro) ro.disconnect(); else window.removeEventListener('resize', sync);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.remove();
      delete host.dataset.flow;
      delete host.__chatFlow;
    },
  };
  host.__chatFlow = ctrl;

  measure();
  sync();          // paint frame 0 immediately — no blank canvas before rAF
  start();
  return ctrl;
}

/** #44 free-fn grammar: the shell (or a future C# push) parks/unparks the loop */
export function setChatFlowPaused(host, isPaused) {
  const ctrl = host && host.__chatFlow;
  if (!ctrl) return;
  if (isPaused) ctrl.pause(); else ctrl.resume();
}

/** detach a live flow canvas (style switched away, or the chat is torn down) */
export function detachChatFlow(host) {
  const ctrl = host && host.__chatFlow;
  if (ctrl) ctrl.detach();
}

/** repaint after a theme / visibility-dial change (no-op when flow isn't up) */
export function syncChatFlow(host) {
  const ctrl = host && host.__chatFlow;
  if (ctrl) ctrl.sync();
}
