/**
 * pressable — one delegated press-feedback mechanism for every shell (#343).
 *
 * WHY THIS EXISTS. The gap the user notices is not the one between the tap and the
 * data; it is the one between the tap and ANY response. A row that stays inert for
 * 300 ms reads as broken, and the same row with a 90 ms tint reads as instant, even
 * when the data takes exactly as long. This buys perceived latency. It does not fix
 * real latency, and it is not a substitute for doing so.
 *
 * WHY DELEGATED, NOT PER-COMPONENT. Every component that wanted this would otherwise
 * grow its own listeners, its own cancel rules and its own drift. One document-level
 * listener plus one CSS block means a new component gets correct press behaviour by
 * adding its class to PRESSABLE_ROW or PRESSABLE_CONTROL below — nothing else.
 *
 * WHY pointerdown, NOT :active OR click.
 *   · `click` fires on RELEASE. Using it would add the very delay we are hiding.
 *   · CSS `:active` is unreliable on iOS: WebKit only applies it when a touch
 *     handler is bound, and it does not cancel on scroll — so dragging a list
 *     lights up every row the finger crosses.
 *   · `pointerdown` fires on contact, on every engine we ship to, with one API.
 *
 * ★ WHY `touchstart` IS ALSO BOUND (device fix, Damir on Android: "it tints, but it's
 * abrupt with delay"). On Android WebView, pointer events are SYNTHESISED from touch
 * events, and the synthesis waits on gesture disambiguation — so `pointerdown` can
 * arrive tens of milliseconds after the finger lands. `touchstart` fires on contact.
 * Both are bound. Two mechanisms keep the second arrival honest: the `cancelled`
 * latch (#346) stops it re-arming a gesture that already became a scroll, and the
 * 5c-i same-element guard stops a synthesised POINTER second-stream restarting the
 * paint window (a touch second-stream falls through and re-arms, which also keeps
 * the gesture's touch identity true on a pointer-first engine — #46 r1).
 *
 * ★ THE PART THAT MAKES IT FEEL NATIVE, NOT BROKEN: a press is CANCELLED as soon as
 * the finger moves past PRESS_MOVE_CANCEL_PX, or the pointer leaves, or a scroll starts.
 * Without that rule a flick down a chat list leaves a trail of highlighted rows —
 * which is worse than no feedback at all. Native list rows behave exactly this way.
 *
 * ★ 5c-i (2026-08-24): ROWS additionally wait PRESS_PAINT_DELAY_MS before PAINTING.
 * The cancel rule alone was not enough — the tint painted at contact, and the 10px
 * of travel that triggers the cancel takes long enough that the user saw the tint
 * first (Damir: "rows highlight on tap to scroll"). A scroll now cancels an
 * UNPAINTED press; a committed tap quicker than the delay paints at release and
 * plays its full fill in the afterlife. See the constant's comment for the dial.
 *
 * ★ D-16 (#351, Damir on the A52 + the Windows recording): a committed ROW press
 * COMPLETES its fill, then FADES — release timing must never truncate the sweep.
 * The recording showed a 60 ms click freezing the sweep at ~65% width and the row
 * then snapping two ramp steps brighter; on device the retract also played while
 * the chat was opening. Damir's spec, interviewed and confirmed:
 *   · a scroll fills NOTHING (the #346 cancel latch keeps winning, unchanged);
 *   · a tap or a click plays the fill smoothly to 100% — the attribute survives
 *     the release until the open duration has elapsed (the completion floor);
 *   · a hold fills to 100% during the hold (unchanged);
 *   · then the fill FADES OUT IN PLACE (data-pressfade "hold" → "out", base.css)
 *     — never the reverse sweep. The retract still exists ONLY for cancels;
 *   · navigation may cut any of it (the screen is being replaced — acceptable).
 * Durations are read from the live tokens (--duration-300 fill, --duration-200
 * fade), so prefers-reduced-motion (all tokens 0ms) collapses the floor AND the
 * fade to today's instant flat tint with no extra branch.
 * CONTROLS ARE UNTOUCHED: instant tint + scale, instant release — button grammar.
 * KNOWN EXCEPTION (audit A-4, pre-existing): PRESS_SAFETY_MS clears a hold at
 * 1.2 s from ARM (so ~1.13 s of visible tint under the 5c-i delay) — a longer
 * hold loses its tint mid-hold and earns no fade. The timer exists for end
 * events that never arrive; accepted, logged in DECISIONS #351.
 *
 * attachPressFeedback({ root, rows, controls }) → detach()
 *   Call ONCE per shell. Idempotent per root. Order does not matter — the listeners
 *   are delegated on the document, so calling before the first render is correct and
 *   is what all four shells do.
 *   ⚠ ONE instance per event path: two attaches on NESTED roots both receive the
 *   same bubbled events and the outer instance's un-painted pressStart then hands
 *   off a collapsed floor (found by the r2 smoke fixtures, which stopPropagation
 *   around their private roots for exactly this reason). Production attaches at
 *   document level only.
 *   New shell? One line: attachPressFeedback().
 */

/* Rows take a background tint only. A list row that scales looks like a button and
   reads as a mistake on both platforms — iOS and Android both tint list rows. */
export const PRESSABLE_ROW = [
  '.c-chatlist-item',
  '.c-contacts__row',
  '.c-txlist-item',
  /* D-16 r2 (audit B-6): STATIC settings rows (version, plain info) are not
     interactive — settings-shell.css already gates :hover/:active behind
     :not(--static), and the press mechanism must agree. Before this a tap on the
     version row played a full committed fill + fade and did nothing. */
  '.c-settings__row:not(.c-settings__row--static)',
  '.c-app-item',
  '.c-apps-recents__item',
  '.c-wallet-receive__contact',
  /* ★ W-j (2026-08-24): the shared money-picker row (contact-row.js) — Send AND
     Receive rows. Send rows had NO press feedback before this (never listed). */
  '.c-contact-row',
  /* D-16 r3 (Opus finding 2): the Downloads FILE row. Its canonical fill block
     lives in settings-app.css; before this only the destructive "Delete all"
     row on that screen was pressable — two grammars, the wrong way round. */
  '.c-settings-dl__open',
].join(',');

/* Controls take a tint AND a small scale — the press reads as a physical push.
   ★ #346: `.c-topbar__dots` was listed here and removed. It is the iOS-48/#314
   animated "Connecting…" ellipsis (topbar.css), built with aria-hidden="true" — a
   decorative inline node, not a control. Pressing it set data-pressed on a hidden
   element for no visible effect. The real topbar actions already match `.c-button`,
   because topbar.js builds them with createButton. */
export const PRESSABLE_CONTROL = [
  '.c-button',
  '.c-chip',
  '.c-bottomnav__item',
  '.fab',
].join(',');

const PRESS_MOVE_CANCEL_PX = 10;      // finger travel that turns a press into a scroll
/* ★ 5c-i (Damir on the Galaxy: "rows highlight on tap to scroll, should highlight
 * only when tapped to open"). The threshold above was never the problem — 10px is
 * tight — the problem was ORDERING: the tint painted at contact, and 10px of finger
 * travel takes long enough that the user SAW the tint before the cancel fired. On a
 * flick that leaves a trail. ROWS therefore wait this long before PAINTING; a
 * cancel inside the window means the row never lights at all. A tap that ENDS
 * inside the window paints at release and plays its full fill in the afterlife
 * (D-16 already guarantees the sweep completes), so no committed tap loses its
 * feedback. CONTROLS still paint at contact — button grammar, untouched.
 * ⚠ The value is a DIAL and trades directly against this module's reason to exist
 * ("a row that stays inert for 300ms reads as broken") — it must stay well under
 * ~100ms perception. 70ms is the shipped start (Android's own delayed-pressed is
 * ~100ms; iOS delaysContentTouches ~150ms — both read as native, and we sit
 * under both); Damir's device round is the measurement that settles it.
 * ⚠ r2 P-NIT-6: on a pointer-FIRST engine the same gesture's touchstart re-arms
 * once (by design — it restores the touch identity), restarting the window: the
 * real ceiling is the delay plus one inter-event gap (~0–1ms on Chromium, both
 * events dispatch in one task). Bounded to ONE re-arm per gesture. */
const PRESS_PAINT_DELAY_MS = 70;
const PRESS_SAFETY_MS = 1200;         // a pointerup we never saw must not strand a highlight
const FILL_FALLBACK_MS = 300;         // = --duration-300, when the token is unreadable
const FADE_FALLBACK_MS = 200;         // = --duration-200, when the token is unreadable

/* D-16: read a duration token off :root at use time, so a reduced-motion flip
   (all --duration-* tokens go 0ms) is honoured without a media-query listener.
   jsdom returns '' for cascaded custom properties → the fallback; documented in
   the smoke pins. */
function readMs(prop, fallback) {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return fallback;
    return /ms\s*$/.test(raw) ? n : (/s\s*$/.test(raw) ? n * 1000 : n);
  } catch (e) { return fallback; }
}

/* D-16: rAF commits the "hold" frame before the fade target lands. The timer
   fallback (2 frames' worth) keeps the mechanism alive on any host without rAF —
   a broken press system is worse than a slightly less precise fade start. */
const raf = (typeof requestAnimationFrame === 'function')
  ? (fn) => requestAnimationFrame(fn)
  : (fn) => setTimeout(fn, 16);
const caf = (typeof cancelAnimationFrame === 'function')
  ? (id) => cancelAnimationFrame(id)
  : (id) => clearTimeout(id);

const pressAttached = new WeakSet();

/* ★★ #589 (Damir F5 2026-08-26): "a mini app that opens the contacts picker leaves
 * a pressed-row rectangle over the new screen."
 *
 * The gap is named by this module's OWN comment at the `onHide` listener below —
 * "a page hidden mid-press (app backgrounded, OVERLAY OPENED) must not come back
 * with a row still lit". `visibilitychange` and `pagehide` cover the first case.
 * They do not fire for the second: an in-document TAKEOVER covers the list, it does
 * not hide the document. The pressed row stays CONNECTED, so nothing in the
 * afterlife's kill paths fires either — its timers are wall-clock (fill + fade), and
 * they keep running under the screen that replaced it.
 *
 * `clearPressFeedback()` is the missing edge: the screen being opened calls it, and
 * every live instance drops its armed press and every afterlife at once.
 *
 * ⚠ It is called by the SCREEN, not by each caller that opens one. A per-call-site
 * hook is a line somebody forgets; `mountContacts` calling it once covers every host
 * that opens the picker, including hosts written later.
 *
 * ⚠ HONEST SCOPE: this closes a real window that is verifiable in this file. Whether
 * that window is what put the rectangle on Damir's screen is an F5 question — if the
 * rectangle survives this, the cause is elsewhere and a screenshot is owed (#294). */
const pressInstances = new Set();

export function clearPressFeedback() {
  for (const inst of Array.from(pressInstances)) {
    try { inst(); } catch (e) { /* one dead instance must not block the rest */ }
  }
}

export function attachPressFeedback({
  root = document, rows = PRESSABLE_ROW, controls = PRESSABLE_CONTROL,
} = {}) {
  const host = root === document ? document : root;
  if (pressAttached.has(host)) return () => {};
  pressAttached.add(host);

  const selector = rows + ',' + controls;
  let el = null, startX = 0, startY = 0, safety = 0;
  /* 5c-i: the pending row paint. `pendingKind` is decided at arm; `paintTimer`
     holds the delayed row paint; a cancel clears it and the row never lights. */
  let paintTimer = 0;
  let pendingKind = '';
  let armAt = 0;                        // when the current gesture armed (5c-i re-arm guard)
  /* D-16: when the press was armed, so the release knows how much fill is owed.
     performance.now() — monotonic (audit A-2: a wall-clock step backwards between
     press and release would hold the tint for the size of the step). */
  let pressStart = 0;
  /* D-16 r4 (Opus finding 2): whether the CURRENT gesture is a touch gesture,
     decided at ARM time — per-gesture truth, no event-order race. Deriving it at
     release from lastTouchTs lost on Chromium's pointerup-before-touchend order:
     a still 1 s press froze a stale window and shipped viaTouch=false. */
  let gestureViaTouch = false;
  /* D-16 r2 (audit A-1): the last time a TOUCH event was seen. A gesture whose
     afterlife began within a second of a touch event was a touch gesture — used
     to reject the late synthesised pointerdown ghost (see onDown).
     r3 (Opus finding 4a): stamped on EVERY touch-stream event via stampTouch —
     stamping only touchstart left any press held >1 s unprotected, because the
     release evaluates the window and the start was by then too old. */
  let lastTouchTs = -1e9;
  const stampTouch = (e) => {
    if (e && (e.touches || e.changedTouches)) lastTouchTs = performance.now();
  };
  /* ★ #346 (review of #343). The header above claims the second event stream "finds
     the same element already pressed and is a no-op". It did not: onDown called
     clear() unconditionally, so a LATE synthesised pointerdown — exactly the Android
     lag the touchstart binding exists for — re-armed a press that touchmove had
     already cancelled, and restarted the travel threshold from the new origin. That is
     the trail-of-lit-rows-during-a-flick this module was written to prevent.
     `cancelled` latches from the moment a gesture becomes a scroll until the gesture
     genuinely ends. A real new tap is always preceded by an end event, so the latch
     costs nothing; the timer is only a backstop for an end event we never receive. */
  let cancelled = false, cancelExpiry = 0;
  /* ★ #346 review MAJOR-1: the latch may ONLY be armed while a gesture is in flight.
     The first cut latched on every `scroll`, and the capture listener sees momentum
     scrolling that continues long AFTER touchend — with no end event left to release
     it. Measured in Chromium: the first tap 100 / 500 / 900 / 1150 ms after the last
     momentum scroll got NO feedback, and only the 1400 ms one did. That is the same
     symptom this module was written to cure ("no feedback effect when tapping on chat
     row"), and it self-heals on the second tap, which would have made it miserable to
     diagnose on device. A programmatic scroll — scroll-to-newest-message, focus()
     pulling an input into view, the keyboard reflow — did it too, with no user gesture
     at all. `pointerDown` is the in-flight test. */
  let pointerDown = false;

  /* One reader for both event shapes — a TouchEvent carries coordinates on
     touches[0], a PointerEvent carries them on the event itself. */
  const pos = (e) => (e.touches && e.touches[0]) || e;

  const clear = () => {
    clearTimeout(safety); safety = 0;
    clearTimeout(paintTimer); paintTimer = 0;   // 5c-i: an unpainted press dies unpainted
    if (!el) return;
    delete el.dataset.pressed;
    el = null;
  };

  /* 5c-i: commit the visual. For rows this runs PRESS_PAINT_DELAY_MS after arm (or
     at release, for a tap quicker than the delay); for controls, immediately.
     pressStart is stamped HERE — the D-16 completion floor counts from the moment
     the sweep is visible, not from contact, or a delayed paint would owe less fill
     than it shows.
     ★ #46 r1 (auditor B NIT-7): the paint RE-CHECKS the arm-time gates that can
     change inside the window — select mode entering, the row detaching, a control
     becoming disabled. An armed press whose world changed paints nothing.
     ★ #46 r1 (auditor C MINOR-4): pressStart is re-stamped one frame later, when
     the transition has actually had a style recalc to start from — under a
     main-thread stall the sync stamp made the completion floor expire early and
     the hold snapped an unfinished sweep to 100%. Monotonic: the bump only ever
     GROWS the floor, so no path gets less fill than before. */
  const paintPress = () => {
    clearTimeout(paintTimer); paintTimer = 0;
    if (!el || ('pressed' in el.dataset)) return;
    if (!el.isConnected || el.closest('[data-selecting]')
      || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    el.dataset.pressed = pendingKind;
    pressStart = performance.now();
    const elAtPaint = el;
    raf(() => {
      if (el === elAtPaint && ('pressed' in elAtPaint.dataset)) pressStart = performance.now();
    });
  };

  /* ★ D-16: THE AFTERLIFE — a committed row press after the finger lifted.
     The element leaves the `el` slot at release (so a momentum scroll's
     cancelGesture cannot kill a fill the user already earned) and lives here:
     first the completion floor (data-pressed persists until --duration-300 has
     elapsed since the press, so the sweep always reaches 100%), then the fade
     (data-pressfade "hold" → "out", styled in base.css — a flat colour that
     fades, never the reverse sweep). Every timer is bounded; every kill path
     removes both attributes. One entry per element, newest wins. */
  /* ★ KNOWN, ACCEPTED (audits A-3/C-3): a chats-list re-render mid-afterlife
     REPLACES the row element, so the fill/fade is cut for that row (the fresh
     node paints rest/selected instantly). Mobile never sees it (the opened chat
     covers the list); desktop sees it only when a push re-renders during the
     ~600 ms window. Transplanting the attributes to the new node would strand
     them (the timers hold the OLD element) — worse than the cut. Logged in
     DECISIONS #351. */
  const afterlives = new Map();
  const killAfterlife = (elm) => {
    const a = afterlives.get(elm);
    if (!a) return;
    clearTimeout(a.t1); clearTimeout(a.t2); clearTimeout(a.t3);
    if (a.raf1 != null) caf(a.raf1);
    if (a.raf2 != null) caf(a.raf2);
    delete elm.dataset.pressed;
    delete elm.dataset.pressfade;
    afterlives.delete(elm);
  };
  const killAllAfterlives = () => {
    for (const elm of Array.from(afterlives.keys())) killAfterlife(elm);
  };
  const handoff = (elm, pressedAt, viaTouch) => {
    killAfterlife(elm);
    const fillMs = readMs('--duration-300', FILL_FALLBACK_MS);
    const fadeMs = readMs('--duration-200', FADE_FALLBACK_MS);
    const a = {
      at: performance.now(),
      viaTouch: viaTouch === true,
    };
    afterlives.set(elm, a);
    const beginFade = () => {
      if (afterlives.get(elm) !== a) return;
      delete elm.dataset.pressed;
      /* Reduced motion (tokens 0ms): no fade — the flat tint just clears,
         which is exactly the pre-D-16 release. */
      if (fadeMs <= 0) { killAfterlife(elm); return; }
      /* hold = the same colour as the fill, flat, transition: none — the sweep
         image collapses invisibly underneath it in the same frame. Two rAFs so
         the hold frame is committed before the fade target lands. */
      elm.dataset.pressfade = 'hold';
      a.raf1 = raf(() => {
        a.raf2 = raf(() => {
          if (afterlives.get(elm) !== a) return;
          elm.dataset.pressfade = 'out';
          a.t2 = setTimeout(() => killAfterlife(elm), fadeMs + 100);
        });
      });
    };
    const remaining = fillMs - (performance.now() - pressedAt);
    if (remaining > 16) a.t1 = setTimeout(beginFade, remaining);
    else beginFade();
    /* D-16 r2 (audit A-5): the UNCONDITIONAL backstop. If rAF stalls on a
       covered-but-not-hidden WebView, the element would sit at the flat "hold"
       tint until vsync resumes — this timer bounds every afterlife absolutely. */
    a.t3 = setTimeout(() => killAfterlife(elm), Math.max(remaining, 0) + fadeMs + 1500);
  };

  /* The gesture became a scroll/drag: drop the visual, and refuse re-arming for the
     REST OF THIS GESTURE only. With no finger down there is nothing to re-arm, so a
     momentum or programmatic scroll just clears — it must never latch. */
  const cancelGesture = () => {
    if (pointerDown) {
      cancelled = true;
      clearTimeout(cancelExpiry);
      // Backstop only, for an end event that never arrives. Not the normal release.
      cancelExpiry = setTimeout(() => { cancelled = false; }, PRESS_SAFETY_MS);
    }
    clear();
  };

  /* The finger genuinely lifted. A committed ROW press hands off to the
     afterlife (D-16: the fill completes, then fades); a control clears at once —
     instant release is the button grammar and Damir did not ask to change it. */
  const endGesture = (e) => {
    /* D-16 r3/r4: the stamp serves the ghost guard's AGE window for LATER
       gestures; this gesture's viaTouch is per-gesture state, passed explicitly
       below (Opus r4 finding 2 — reading lastTouchTs here raced the
       pointerup-before-touchend event order). */
    stampTouch(e);
    pointerDown = false;
    cancelled = false;
    clearTimeout(cancelExpiry); cancelExpiry = 0;
    /* 5c-i: a tap quicker than the paint delay is a COMMITTED tap — paint now so
       the afterlife plays the full fill+fade. A cancelled gesture never reaches
       here with `el` set (cancelGesture cleared it), so this cannot resurrect a
       scroll's suppressed paint. */
    if (el && !('pressed' in el.dataset) && pendingKind === 'row') paintPress();
    if (el && el.dataset.pressed === 'row') {
      const elm = el;
      el = null;
      clearTimeout(safety); safety = 0;
      clearTimeout(paintTimer); paintTimer = 0;
      handoff(elm, pressStart, gestureViaTouch || !!(e && (e.touches || e.changedTouches)));
      return;
    }
    clear();
  };

  /* The system took the gesture away (touchcancel/pointercancel — on Android that
     IS the scroll takeover). An aborted press earned no fill: clear instantly.
     Routing these through endGesture would play a full fill on every flick. */
  const abortGesture = (e) => {
    stampTouch(e);   // D-16 r3: touchcancel carries changedTouches
    pointerDown = false;
    cancelled = false;
    clearTimeout(cancelExpiry); cancelExpiry = 0;
    clear();
  };

  const onDown = (e) => {
    // Primary pointer only: a right-click, a second finger or a stylus barrel press
    // must not paint a press state the user did not ask for.
    if (e.button != null && e.button !== 0) return;
    /* ★ #346 review r2 MINOR-4: a single-touch `touchstart` can only BEGIN a gesture,
       so it always releases the latch. This covers a gesture that ended without any
       end event — the WebView swallowed it, an overlay took the finger — which would
       otherwise leave `pointerDown` true, let the next scroll re-latch, and cost the
       following tap its feedback.
       It does NOT weaken the guard: the late re-arm the latch exists to block is
       always a synthesised PointerEvent, which carries no `touches`, and a second
       finger mid-gesture reports length 2. */
    stampTouch(e);   // D-16 r2/r3: see the ghost guard
    if (e.touches && e.touches.length === 1) {
      cancelled = false;
      clearTimeout(cancelExpiry); cancelExpiry = 0;
    }
    // A gesture is in flight from here on. Set BEFORE the latch test, so the late
    // second-stream down of an ALREADY-cancelled gesture still counts as finger-down
    // and its end event releases the latch.
    pointerDown = true;
    // A cancelled gesture stays cancelled until it ends. Without this the second
    // event stream re-arms it mid-scroll.
    if (cancelled) return;
    // A multi-finger gesture (pinch, two-finger scroll) is not a tap.
    if (e.touches && e.touches.length > 1) { cancelGesture(); return; }
    // `=== false`, not `!`: an engine that does not populate isPrimary (or a
    // synthesised event) must still get feedback. Only an explicit secondary
    // pointer — a second finger mid-gesture — is rejected.
    if (e.isPrimary === false) return;
    const t = e.target && e.target.closest ? e.target.closest(selector) : null;
    /* D-16 r2 (audit A-1): the GHOST guard. On Android the pointer stream is
       synthesised from touch and can lag; a late pointerdown arriving AFTER a
       committed touch tap's release would kill the earned afterlife and re-arm a
       spurious press with no finger down. Scoped tightly: pointer-stream only
       (a real second touch tap always begins with touchstart, which carries
       `touches` and passes), on an afterlife a TOUCH gesture created moments ago.
       r3 (Opus finding 4c): pointerType exempts a REAL mouse or pen — a hybrid
       laptop's finger-tap-then-click on one row must not lose its feedback; a
       synthesised-from-touch pointerdown reports pointerType "touch".
       r3 (Opus finding 5): the guard runs BEFORE clear() — a ghost for row A must
       not kill a live press already armed on row B. */
    const gh = t && afterlives.get(t);
    if (gh && !e.touches && e.pointerType !== 'mouse' && e.pointerType !== 'pen'
      && gh.viaTouch && (performance.now() - gh.at) < 800) return;
    /* 5c-i: the SECOND event stream of the same gesture (touchstart → synthesised
       pointerdown, tens of ms later on Android). Before the paint delay this re-arm
       was harmless — the attribute was just re-set. Now it would RESTART the delay
       (pushing the paint later than the dial says) or un-paint a row the first
       stream already painted. Same element inside the synthesis window = same
       gesture: keep the running timer and the original travel origin.
       ★ #46 r1 (auditor B MAJOR-1 + MINOR-2): the guard takes ONLY the pointer
       stream (`!e.touches`). Two reasons, both proven by trace:
       · a guard that also swallowed touchstart handed the gesture's touch
         identity to whichever stream arrived FIRST — on a pointer-first engine
         `gestureViaTouch` latched false, which disarmed the D-16 r2 ghost guard
         for the whole gesture (the r4 "per-gesture truth" fix, silently undone);
       · a REAL second tap begins with a touchstart. Letting it fall through to
         the ordinary clear+re-arm path means a tap on a row whose previous
         gesture never got an end event cannot be absorbed into the stale arm.
       The synthesised pointerdown the guard exists for never carries `touches`.
       And because the pointer stream can still be the FIRST to arrive, the guard
       branch corrects the touch identity the same way the arm site does. */
    if (t && t === el && !e.touches && (performance.now() - armAt) < 300) {
      gestureViaTouch = gestureViaTouch || (performance.now() - lastTouchTs) < 300;
      return;
    }
    clear();
    if (!t) return;
    // Disabled controls must look disabled, not pressable. aria-disabled covers the
    // components that stay focusable on purpose (a11y sweep #205).
    if (t.disabled || t.getAttribute('aria-disabled') === 'true') return;
    /* N36 (Damir): SELECT MODE opts out of press feedback. Inside a
       [data-selecting] container every tap is a select/deselect toggle
       (chat-select.js swallows the click) — the only sanctioned visual is the
       selected tint + check circle; a committed fill on a control the tap will
       never activate reads as a broken press. Scoped to the ancestor test, so
       every surface outside the selecting container keeps its feedback. */
    if (t.closest('[data-selecting]')) return;
    // D-16: a re-press interrupts the target's own afterlife (fade cancelled, the
    // press re-lights from the layer's current paint — the transform is already at
    // scaleX(1), so no re-sweep plays). Other rows' fades keep playing.
    // ★ #46 r1 B MINOR-3 → r2 P-MINOR-2: the instant re-paint applies ONLY while
    // the afterlife is still in its FILL phase (data-pressed still present — the
    // completion floor). r1 keyed on the whole afterlife, and the FADE phase runs
    // ~600ms — a scroll STARTED on the just-tapped row inside that window painted
    // at contact again, which is the exact trail 5c-i removes ("rows highlight on
    // tap to scroll"). A fade-phase re-press now waits the ordinary 70ms window:
    // the row is already dim, and a ≤70ms gap on a fading row beats a scroll
    // trail on a lit one.
    const hadLiveFill = afterlives.has(t) && ('pressed' in t.dataset);
    killAfterlife(t);
    el = t;
    armAt = performance.now();
    pendingKind = t.matches(controls) ? 'control' : 'row';
    /* D-16 r4: decided at ARM time — per-gesture truth. The late second-stream
       pointerdown no longer reaches this line (the 5c-i guard above returns for it
       and corrects the identity there); a second-stream TOUCHSTART does fall
       through and re-computes it here, which is what keeps the identity honest on
       a pointer-first engine (#46 r1 auditor B MAJOR-1). */
    gestureViaTouch = !!e.touches || (performance.now() - lastTouchTs) < 300;
    const p0 = pos(e);
    startX = p0.clientX; startY = p0.clientY;
    safety = setTimeout(clear, PRESS_SAFETY_MS);
    /* 5c-i: controls paint at contact (button grammar); rows wait out the delay so
       a press that becomes a scroll never lights — except a re-press on an
       afterlife still in its FILL phase (see above). pressStart lands in
       paintPress. */
    if (pendingKind === 'control' || hadLiveFill) paintPress();
    else { clearTimeout(paintTimer); paintTimer = setTimeout(paintPress, PRESS_PAINT_DELAY_MS); }
  };

  const onMove = (e) => {
    stampTouch(e);   // D-16 r3: touchmove keeps the ghost window live through a hold
    if (!el) return;
    const p = pos(e);
    // ★ The scroll rule. Past the threshold this gesture is a scroll, not a tap.
    if (Math.abs(p.clientX - startX) > PRESS_MOVE_CANCEL_PX
      || Math.abs(p.clientY - startY) > PRESS_MOVE_CANCEL_PX) cancelGesture();
  };

  // passive: these never call preventDefault, and saying so keeps scrolling on the
  // compositor. A non-passive listener here would cost the very smoothness we want.
  const opts = { passive: true };
  host.addEventListener('touchstart', onDown, opts);   // fires on contact (Android)
  host.addEventListener('touchmove', onMove, opts);
  host.addEventListener('touchend', endGesture, opts);
  host.addEventListener('touchcancel', abortGesture, opts);   // D-16: a cancel is not a lift
  host.addEventListener('pointerdown', onDown, opts);
  host.addEventListener('pointermove', onMove, opts);
  host.addEventListener('pointerup', endGesture, opts);
  host.addEventListener('pointercancel', abortGesture, opts); // D-16: a cancel is not a lift
  host.addEventListener('dragstart', cancelGesture, opts);
  // Scroll can start without a pointermove that crosses the threshold (momentum,
  // a nested scroller, a keyboard-driven scroll). Capture catches every scroller.
  host.addEventListener('scroll', cancelGesture, { passive: true, capture: true });
  // A page hidden mid-press (app backgrounded, overlay opened) must not come back
  // with a row still lit — afterlives included (D-16).
  /* ★★ #604 (row A7.1, Damir 2026-08-27): THE TEARDOWN MUST ALSO SUPPRESS RE-ARMING.
   *
   * The Android-only ghost rectangle over a freshly opened mini-app picker is this
   * teardown eating its own guards. `killAllAfterlives()` empties `afterlives` and
   * `abortGesture()` sets `cancelled = false` — and those two are exactly what the
   * ghost guard (the 800ms afterlife window) and the same-element guard (the 300ms
   * arm window) read to REJECT the late, synthesised pointer stream Android emits
   * after a committed touch tap. Disarmed, that late `pointerdown` re-arms a fresh
   * press on the tile with no finger on the glass: paint, fill, fade — about 570ms,
   * which is why it has never been screenshot-able (#294).
   *
   * So a teardown that lands MID-GESTURE now latches `cancelled` for the rest of that
   * gesture — `cancelGesture`'s semantics, which exist for precisely this — instead of
   * resetting it. With no finger down there is nothing to re-arm and the behaviour is
   * unchanged, so `pagehide` and `visibilitychange` keep working exactly as before.
   *
   * ⚠ This is the mechanism, not a device observation: it is UNVERIFIED on hardware.
   * The discriminator is one line — log `el.className`, `e.type` and `e.pointerType`
   * where the arm happens, and see whether a SECOND arm follows the click. */
  const onHide = () => {
    if (pointerDown) { cancelGesture(); } else { abortGesture(); }
    killAllAfterlives();
  };
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', onHide);
  // #589: the same teardown, reachable from a screen that opens IN the document
  pressInstances.add(onHide);

  return function detach() {
    abortGesture();
    killAllAfterlives();
    pressInstances.delete(onHide);
    pressAttached.delete(host);
    host.removeEventListener('touchstart', onDown, opts);
    host.removeEventListener('touchmove', onMove, opts);
    host.removeEventListener('touchend', endGesture, opts);
    host.removeEventListener('touchcancel', abortGesture, opts);
    host.removeEventListener('pointerdown', onDown, opts);
    host.removeEventListener('pointermove', onMove, opts);
    host.removeEventListener('pointerup', endGesture, opts);
    host.removeEventListener('pointercancel', abortGesture, opts);
    host.removeEventListener('dragstart', cancelGesture, opts);
    host.removeEventListener('scroll', cancelGesture, { capture: true });
    window.removeEventListener('pagehide', onHide);
    document.removeEventListener('visibilitychange', onHide);
  };
}
