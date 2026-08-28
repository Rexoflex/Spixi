/**
 * theme-runtime — the ONE implementation of the live `setTheme` push.
 *
 * ★ N71 (#421). C# re-themes every live WebView with
 * `sendUiCommand(page, "setTheme", name)`, which arrives as
 * `executeUiCommand(setTheme, '<base64>')` — a BARE GLOBAL reference. Two
 * consequences drove this module:
 *
 *  1. An UNDEFINED global throws a ReferenceError while the arguments are
 *     evaluated, i.e. BEFORE executeUiCommand is entered, so the dispatcher's
 *     own try/catch cannot save it (the #258 `addAppRequest` lesson, which cost
 *     ten shells). Every shell C# can reach must therefore DEFINE setTheme —
 *     the launch flow and the lock included. ⚠ They used to define it as a
 *     deliberate NO-OP; L5 retired that, and the reason is at the foot of this
 *     file. All eighteen apply the push now.
 *  2. Before this module the body was copy-pasted into five shells and absent
 *     from thirteen. Copies drift; #251 and #288 MAJOR-1 are both that story.
 *
 * The name is C#-RESOLVED. Never re-derive "auto" from matchMedia here: the
 * WebView's prefers-color-scheme can disagree with the app theme (Damir F5 —
 * Account read light while the app was dark).
 */

/**
 * Apply a pushed theme to the document root.
 *
 * Transitions are suppressed across the swap (#53) so the tokens flip in one
 * clean frame instead of animating every colour on the page at once.
 *
 * @param {string} name  'light' | 'dark' (anything else is treated as light)
 * @param {object} [opts]
 * @param {Function} [opts.onApplied]  ran after the swap has settled (two rAFs).
 *   For anything the shell derives from the theme in JS rather than in CSS —
 *   chat.html re-runs its pattern ladder here. ★ #410: read it, never remember it.
 * @param {Document} [opts.doc]
 * @returns {boolean} true when the theme actually changed
 */
export function applyPushedTheme(name, { onApplied, doc } = {}) {
  const d = doc || (typeof document === 'object' ? document : null);
  if (!d) return false;
  const t = name === 'dark' ? 'dark' : 'light';
  const r = d.documentElement;
  if (!r || r.dataset.theme === t) return false;
  try { r.classList.add('theme-switching'); } catch (e) { /* pre-paint */ }
  r.dataset.theme = t;
  const settle = () => {
    try { r.classList.remove('theme-switching'); } catch (e) { /* detached */ }
    if (typeof onApplied === 'function') {
      try { onApplied(t); } catch (e) { /* a shell hook must never break the swap */ }
    }
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(settle));
  } else {
    settle();
  }
  return true;
}

/* ★ L5 (2026-08-31) RETIRED `ignorePushedTheme`, and the reason is worth keeping.
 *
 * It was the no-op the two FIXED-SURFACE shells installed — the launch flow and the
 * lock — on this stated reasoning: "flipping data-theme on these documents would be
 * worse than doing nothing, because their fixed dark chrome is painted against a
 * themed token set that would then move underneath it."
 *
 * That is not true of either document, and the source says so. Both pin
 * data-theme="dark" on their OWN subtree — `.c-launch` (launch-shell.js) and
 * #lock-root (lock.html markup) — and an element carrying data-theme redefines the
 * tokens for its subtree whatever the root holds. Everything they paint outside those
 * subtrees is a hard-coded literal. So the root theme could never reach the chrome the
 * no-op was protecting.
 *
 * What it DID reach is the only thing in those documents that is token-driven: an
 * overlay, which mounts on document.body outside the pin. With no root theme those
 * always resolved the LIGHT block — a light language sheet on the dark launch (Damir's
 * report) and a light "Use a different wallet?" modal on the dark lock (found while
 * fixing it). Both shells now carry the same pre-paint theme carrier as the other
 * sixteen and call applyPushedTheme, so there is no second body to install.
 *
 * ⚠ The half that was ALWAYS right, and did not change: a fixed-surface shell must
 * still DEFINE the setTheme global. Reason 1 above is why. */
