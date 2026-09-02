/* ★ Session H — THE IN-SHELL SUBSCREEN SLIDE (Damir's walk row 31; DECISIONS #707/#718)
 *
 * #707 (L9) slides every NATIVE overlay on mobile: a chat, a settings sub-page C# pushes,
 * chat info. The views that a SHELL mounts by itself — the Contacts takeover, the wallet
 * Receive/Send takeovers, the Account sublevels (Chat appearance, Notifications, How to
 * use, About, Contributors, Delete data) and the Launch create/restore forms — are not
 * overlays, so they kept appearing instantly beside pages that slide. One grammar, one
 * component, attached where each shell swaps its view.
 *
 * THE MOTION IS THE NATIVE ONE, NOT A SECOND ONE. `SpixiContentPage.revealStage` enters
 * in 300 ms on `--easing-standard` (cubic-bezier(0.2, 0, 0, 1)) and exits in 220 ms on
 * `Easing.CubicIn`; the CSS here reads the same token for the entry and
 * `--easing-accelerate` (the CSS cubic-in) for the exit, and a smoke pin holds the two
 * durations equal to the C# constants. The work order said 220/220; the C# it mirrors
 * says 300/220 (#326's asymmetry — "an exit that matches the entry feels slow"), and a
 * shell view that moves at a different speed from the page beside it would read as a
 * different kind of screen, which is the very thing this row removes.
 *
 * WHERE IT NEVER RUNS: under `:root[data-desktop]` (#704 — desktop only chat info slides)
 * and under `prefers-reduced-motion: reduce`. Both are decided by the STYLESHEET
 * (`animation: none`), and the JS reads the computed animation back rather than
 * re-deriving either rule — so the two can never disagree, and a host with no motion
 * gets the plain synchronous swap it had before this file existed.
 *
 * THE EXIT RUNS OVER THE REVEALED VIEW. A native pop shows the page beneath while the
 * top one slides away. So the exit is not "animate, then swap": the caller mounts (or
 * keeps) the destination UNDER the leaving element, the leaving element is lifted to a
 * fixed (or absolute) layer, and only when the animation ends is it removed. The entry
 * is the mirror: the new view is lifted over the current one, slides in, and the
 * current one is detached afterwards — never before, or the user would see the shell's
 * bare ground during the slide.
 *
 * ★ COMPLETES-NEVER (the #326 latch). `animationend` does not fire for an element that
 * is removed mid-flight, for a document that was hidden while the ticker paused, or
 * for a WebView that dropped the frame. Every wait carries a backstop timer at twice
 * the duration; whichever fires first settles, and settling is idempotent.
 *
 * ★ RE-ENTRANCY. A host may re-render while a slide is in flight (a C# push landing
 * inside the 300 ms). `settleSubscreenSlide(host)` finishes the in-flight slide
 * SYNCHRONOUSLY — the end state is applied, the timers are cleared — so the host's next
 * swap starts from a settled DOM. Every entry point calls it first.
 */

const inflight = new WeakMap();   // host → { finish }

const ENTER_MS = 300;             // = SpixiContentPage.ScreenSlideInMs
const EXIT_MS = 220;              // = the C# exit (Easing.CubicIn, 220)

/** Does the stylesheet grant this element a slide at all? Reads the computed animation
 *  so desktop / reduced-motion / a missing stylesheet all answer "no" the same way. */
function grantsMotion(el) {
  try {
    const name = getComputedStyle(el).animationName;
    return !!name && name !== 'none';
  } catch (e) {
    return false;
  }
}

/** Finish the in-flight slide on `host` synchronously (no-op when there is none). */
export function settleSubscreenSlide(host) {
  const op = inflight.get(host);
  if (op) op.finish();
}

/**
 * Run one animation on `el` and call `done` exactly once — on `animationend`, on the
 * backstop, or synchronously when the stylesheet grants no motion.
 * `cls` is the animating class; `positioned` = 'viewport' | 'host' | false
 * (false = the element positions itself, e.g. a `position: fixed` takeover).
 */
function run(host, el, cls, positioned, ms, done) {
  settleSubscreenSlide(host);
  let settled = false;
  let timer = 0;
  /* ★ Session H review MINOR-3 (auditor A): the EXIT layer is pointer-events:none while
     still opaque and barely moved (cubic-in starts slow) — a tap in the first frames
     passed THROUGH the dying screen onto the view being revealed (contacts row → the
     chats list under it opened an unrelated conversation). A transparent shield eats
     taps for the exit's 220 ms, exactly as the native stage does while it slides out;
     it dies with the animation, and the synchronous no-motion path removes it in the
     same call. Exit only — an entering layer catches its own taps. */
  let shield = null;
  if (cls === 'c-subslide--out' && el.ownerDocument && el.ownerDocument.body) {
    shield = el.ownerDocument.createElement('div');
    shield.className = 'c-subslide-shield';
    el.ownerDocument.body.append(shield);
  }
  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (shield) { try { shield.remove(); } catch (e) {} shield = null; }
    el.removeEventListener('animationend', onEnd);
    el.classList.remove('c-subslide', 'c-subslide--viewport', 'c-subslide--host', cls);
    if (host && host.classList) host.classList.remove('c-subslide-host');
    if (inflight.get(host) && inflight.get(host).finish === finish) inflight.delete(host);
    try { done(); } catch (e) { /* the swap must settle even if the caller throws */ }
  };
  const onEnd = (ev) => { if (ev.target === el) finish(); };
  el.classList.add('c-subslide');
  if (positioned === 'viewport') el.classList.add('c-subslide--viewport');
  else if (positioned === 'host') { el.classList.add('c-subslide--host'); if (host && host.classList) host.classList.add('c-subslide-host'); }
  el.classList.add(cls);
  if (!grantsMotion(el)) { finish(); return; }
  inflight.set(host, { finish });
  el.addEventListener('animationend', onEnd);
  timer = setTimeout(finish, ms * 2);   // completes-never backstop (#326)
}

/**
 * ENTER: `entering` is appended to `host` OVER whatever is mounted there and slides in;
 * afterwards `swap()` runs (the host detaches the covered view). When the stylesheet
 * grants no motion the swap runs synchronously and `entering` is simply appended.
 *   opts.positioned — 'viewport' (fixed inset 0, covers the bars) · 'host' (absolute
 *                     inside host, which becomes position: relative) · false (the element
 *                     positions itself). Default 'viewport'.
 *   opts.append     — false when the caller already put `entering` in the DOM.
 */
export function slideSubscreenIn(host, entering, swap, opts = {}) {
  const positioned = opts.positioned === undefined ? 'viewport' : opts.positioned;
  if (opts.append !== false && entering.parentNode !== host) host.append(entering);
  run(host, entering, 'c-subslide--in', positioned, ENTER_MS, () => { if (swap) swap(); });
}

/**
 * EXIT: `leaving` slides out over the view the caller has already revealed beneath it;
 * afterwards `remove()` runs (default: `leaving.remove()`). The caller's state changes
 * (handles nulled, C# told the overlay is gone) belong BEFORE this call — only the
 * pixels linger. A second exit on the same element while one is in flight settles the
 * first and returns; the latch is the caller's `closed` flag, this is the belt.
 */
export function slideSubscreenOut(host, leaving, remove, opts = {}) {
  const positioned = opts.positioned === undefined ? 'viewport' : opts.positioned;
  if (leaving.classList.contains('c-subslide--out')) { settleSubscreenSlide(host); return; }
  const fin = remove || (() => leaving.remove());
  run(host, leaving, 'c-subslide--out', positioned, EXIT_MS, fin);
}

/** True while a slide is in flight on `host`. ★ review NIT-1: no host gates on this —
 *  re-entrancy is handled by `settleSubscreenSlide` (called inside `run` and by the
 *  hosts' own render paths); this exists for the suite and for future callers. */
export function isSubscreenSliding(host) {
  return inflight.has(host);
}
