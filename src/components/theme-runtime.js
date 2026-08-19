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
 *     including the fixed-surface ones, where it is a deliberate no-op.
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

/**
 * The no-op every FIXED-SURFACE shell installs — the launch flow and the lock,
 * which are brand-dark in BOTH themes (N73 / #203). They must still DEFINE the
 * global for reason 1 above: without it an OS theme flip throws a ReferenceError
 * into the page while the user is looking at a password field.
 *
 * Deliberately NOT `applyPushedTheme`: flipping data-theme on these documents
 * would be worse than doing nothing, because their fixed dark chrome is painted
 * against a themed token set that would then move underneath it.
 */
export function ignorePushedTheme() { /* fixed-surface shell — see the docblock */ }
