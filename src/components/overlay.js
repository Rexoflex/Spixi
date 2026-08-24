/**
 * Shared overlay layer (docs/overlays-spec.md, DECISIONS #56): scrim, stack,
 * Esc/back dismissal, document-level focus containment, focus restore, host
 * scroll lock. Overlays mount into a HOST element (default document.body) so
 * the demo phone frames and real shells behave identically.
 *
 * Dismissal policy: Esc is the safe dismiss path (opts.escDismiss — sheet and
 * modal both default it true, per ARIA APG); opts.lightDismiss governs ONLY
 * scrim click (sheet true, modal false).
 *
 * Dismissal opts are read LIVE (tip-audit C1): setOverlayOpts on an OPEN overlay
 * takes effect immediately — Esc, scrim AND the shell back hook all consult the
 * current opts, so an in-flight money sheet (lightDismiss+escDismiss false) is
 * actually locked on every path. escDismiss:false also makes dismissTopOverlay
 * CONSUME the back press without closing (back must not dismiss what Esc can't).
 */

const stack = []; // { el, scrim, opts, opener }
const overlayOpts = new WeakMap();    // el → opts, set by createSheet/createModal
const pendingRemoval = new WeakMap(); // el → finish-removal fn while its exit transition runs
let uid = 0;

/** Unique DOM id for overlay labelling (aria-labelledby / aria-describedby). */
export function overlayId(prefix) { return prefix + '-' + (++uid); }

/** Attach/adjust overlay options. MERGES into existing opts (a later in-flight
 *  lock must not drop an earlier onDismiss — tip-audit C1/M1) and is read live
 *  by every dismissal path, so calling this on an open overlay works. */
export function setOverlayOpts(el, opts) {
  overlayOpts.set(el, { ...(overlayOpts.get(el) || {}), ...opts });
}

/** Current dismissal policy for a stack entry — LIVE WeakMap first (tip-audit C1). */
function liveOpts(entry) { return overlayOpts.get(entry.el) || entry.opts || {}; }

function focusables(el) {
  return [...el.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )].filter((n) => !n.disabled && !n.hidden);
}

// Document-level keydown while stack non-empty: Esc = safe dismiss of the top
// entry (when it allows it), Tab = trap within the top entry.
function onDocKeydown(e) {
  if (stack.length === 0) return;
  const top = stack[stack.length - 1];
  if (e.key === 'Escape') {
    if (liveOpts(top).escDismiss) dismissOverlay(top.el);   // live — in-flight locks hold (tip-audit C1)
    return;
  }
  if (e.key !== 'Tab') return;
  const f = focusables(top.el);
  if (f.length === 0) {
    e.preventDefault();
    top.el.focus({ preventScroll: true });
    return;
  }
  const first = f[0];
  const last = f[f.length - 1];
  const active = document.activeElement;
  if (!f.includes(active)) { // focus escaped (or sits on the overlay root) — pull it back in
    e.preventDefault();
    (e.shiftKey ? last : first).focus({ preventScroll: true });
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus({ preventScroll: true });
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus({ preventScroll: true });
  }
}

// Document-level focus containment: anything focused outside the top overlay
// (and not its scrim) bounces back to the overlay's first focusable.
function onDocFocusin(e) {
  if (stack.length === 0) return;
  const top = stack[stack.length - 1];
  if (top.el.contains(e.target) || top.scrim.contains(e.target)) return;
  (focusables(top.el)[0] || top.el).focus({ preventScroll: true });
}

/** Open `el` as an overlay above a scrim inside `host`. Internal — sheets/modals wrap this. */
export function openOverlay(el, opts) {
  if (stack.some((s) => s.el === el)) return; // already open — no-op

  // Element reuse: re-opened while its exit transition still runs — finish the
  // pending removal now (old scrim + listeners + host bookkeeping, no second
  // dismiss side effects) so a clean re-open proceeds.
  const finishPending = pendingRemoval.get(el);
  if (finishPending) finishPending();

  opts = opts || overlayOpts.get(el) || {};
  overlayOpts.set(el, opts);                    // WeakMap = the single live source for policy reads
  const host = opts.host || document.body;
  const opener = document.activeElement;

  const scrim = document.createElement('div');
  scrim.className = 'c-scrim';
  scrim.setAttribute('aria-hidden', 'true');
  // bound ALWAYS, policy checked at CLICK time — open-time binding froze the
  // policy and made in-flight setOverlayOpts a silent no-op (tip-audit C1)
  scrim.addEventListener('click', () => {
    if ((overlayOpts.get(el) || opts).lightDismiss) dismissOverlay(el);
  });

  host.append(scrim, el);
  host.dataset.overlayOpen = '';

  if (stack.length === 0) {
    document.addEventListener('keydown', onDocKeydown);
    document.addEventListener('focusin', onDocFocusin);
  }
  stack.push({ el, scrim, opts, opener });

  // enter transitions: two rAFs so initial styles paint first.
  // ★ Batch W loop r3 (R3-1): an overlay dismissed INSIDE those two frames must not
  // re-acquire data-open from this deferred setter — a dying sheet that lights up
  // again hit-tests (the #46 MAJOR-3 class) and reads as "open" to any slot logic.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!stack.some((s) => s.el === el)) return;
    scrim.dataset.open = '';
    el.dataset.open = '';
  }));

  const target = el.querySelector('[data-autofocus]') || focusables(el)[0] || el;
  target.focus({ preventScroll: true });
}

/** ★ Batch W loop r3: is this overlay PRESENTED — on the stack, i.e. opened and not
 *  yet dismissed? The stack entry is removed SYNCHRONOUSLY at dismissal (below), while
 *  the node lingers ~400 ms for the exit transition and data-open lands two frames
 *  after open — so neither the DOM nor the attribute is a timing-safe "open" oracle.
 *  Slot logic (one review sheet per compose) asks this instead. */
export function isOverlayOpen(el) {
  return !!el && stack.some((s) => s.el === el);
}

/** Dismiss a specific overlay (default: top of stack). Returns true if one closed. */
export function dismissOverlay(el) {
  const i = el ? stack.findIndex((s) => s.el === el) : stack.length - 1;
  if (i === -1 || stack.length === 0) return false;
  const [entry] = stack.splice(i, 1);
  if (stack.length === 0) {
    document.removeEventListener('keydown', onDocKeydown);
    document.removeEventListener('focusin', onDocFocusin);
  }

  delete entry.scrim.dataset.open;
  delete entry.el.dataset.open;

  // focus restore — only if focus is ours to move (inside the closing overlay,
  // or already dropped to body); opener gone/unfocusable → new top overlay.
  const active = document.activeElement;
  if (entry.el.contains(active) || active === document.body) {
    const opener = entry.opener;
    if (opener && opener.isConnected && !opener.disabled && typeof opener.focus === 'function') {
      opener.focus({ preventScroll: true });
    } else {
      const top = stack[stack.length - 1];
      const f = top ? focusables(top.el) : [];
      if (f[0]) f[0].focus({ preventScroll: true });
    }
  }

  // remove after the exit transition (transitionend + timeout fallback, like #29 morph)
  let removed = false;
  let fallback;
  const onEnd = (e) => { if (e.target === entry.el) remove(); };
  const remove = () => {
    if (removed) return;
    removed = true;
    clearTimeout(fallback);
    entry.el.removeEventListener('transitionend', onEnd);
    pendingRemoval.delete(entry.el);
    entry.scrim.remove();
    entry.el.remove();
    const host = entry.opts.host || document.body; // scroll lock: recheck at removal time
    if (!stack.some((s) => (s.opts.host || document.body) === host)) {
      delete host.dataset.overlayOpen;
    }
    const cb = liveOpts(entry).onDismiss || entry.opts.onDismiss;   // merge-safe (tip-audit M1)
    if (cb) cb();
  };
  entry.el.addEventListener('transitionend', onEnd);
  fallback = setTimeout(remove, 400); // > --duration-200; covers reduced-motion 0ms
  pendingRemoval.set(entry.el, remove);
  return true;
}

/** Shell onBack hook: dismiss the top overlay if any. True = consumed.
 *  escDismiss:false = LOCKED (money in flight): the press is consumed but the
 *  overlay stays — back must not dismiss what Esc can't (tip-audit C1). */
export function dismissTopOverlay() {
  if (stack.length === 0) return false;
  const top = stack[stack.length - 1];
  if (liveOpts(top).escDismiss === false) return true;
  return dismissOverlay(top.el);
}
