/**
 * clipboard.js — ★ #993: ONE copy path for the app (was chat-select.js's private helper + seven call
 * sites using the async API alone). DOM-free apart from the transient off-screen textarea, so it has no
 * stylesheet family (the W-h gate derives families per module).
 */

import { topOverlayEl } from './overlay.js';

/* Clipboard write with the legacy fallback. WKWebView on a file:// origin is not
   a secure context → navigator.clipboard is UNDEFINED there, so the async API
   alone silently no-ops on iOS. execCommand('copy') over an off-screen textarea
   still works. Returns true only when something actually copied (settings.html
   shareAddress grammar — never claim a copy we didn't make). */
export function execCopyText(text) {
  /* ★ #993 round 2 (MAJOR, the break-my-verdict reviewer): inside an OPEN SHEET the textarea used to be
     appended to <body>, i.e. OUTSIDE the overlay — overlay.js's focus containment bounced focus back to
     the sheet, the selection left the textarea, execCommand still returned true, and the ✓ showed for a
     copy that never happened (member sheet · tx sheet · address sheet — a payment address). The buffer
     now lives INSIDE the overlay root that holds focus, the copy refuses unless the textarea really holds
     focus, iOS gets setSelectionRange (a readonly textarea's select() alone can leave it empty), and
     focus goes back to where the user was. */
  const prev = document.activeElement;
  let ta = null;
  try {
    ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.setAttribute('aria-hidden', 'true');
    ta.tabIndex = -1;
    ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.opacity = '0';
    // round 3 (MAJOR): the host is the TOP OPEN OVERLAY from the stack, not "where focus is" — after the iOS
    // keyboard's Done (or any blur) focus sits on <body> while a sheet is open, and a body-hosted buffer was
    // bounced again (an honest false, but Copy never worked in that state)
    const host = topOverlayEl() || document.body;
    host.appendChild(ta);
    ta.focus({ preventScroll: true });
    ta.select();
    try { ta.setSelectionRange(0, text.length); } catch (e) { /* not selectable → the focus check below decides */ }
    if (document.activeElement !== ta) return false;   // focus was taken back → nothing is selected → never claim a copy
    const done = document.execCommand && document.execCommand('copy');
    return !!done;
  } catch (e) {
    return false;
  } finally {
    if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
    if (prev && prev !== document.body && prev.isConnected && typeof prev.focus === 'function') {
      try { prev.focus({ preventScroll: true }); } catch (e) { /* the opener may be gone */ }
    }
  }
}

/* ★ #993 (M5 review): ONE copy helper for every "Copy" in the app. The async API is UNDEFINED on a
   file:// WKWebView (iPhone, Mac) — seven call sites used it alone, so Spixi's own Copy silently
   copied NOTHING there (and the member sheet still showed its ✓). A later paste of that "copied"
   address then "did not work" — a candidate cause of the office-walk M5 report. Async first
   (Windows/Android), execCommand('copy') when it is absent or refuses. Resolves true ONLY when
   something was copied — callers never claim a copy that did not happen. */
export function copyText(text) {
  if (!text) return Promise.resolve(false);
  /* ★★ #1028 (walk R.8/R.9/P.11, Mac + iPhone): the NATIVE copy comes FIRST. On a file:// WKWebView the
     paths below either do nothing or report a copy that other apps cannot paste — so the shell's bridge
     (native.js) hands C# the text and the result the promise carries is the NATIVE clipboard's answer.
     `null` = no answer (an older exe, text over the cap, no bridge in this page) → the in-page path.
     `false` = the native side refused → a failure, shown as one (#1035: no second, gesture-less try). */
  const native = (typeof window !== 'undefined') ? window.__spixiNativeCopy : null;
  if (typeof native === 'function') {
    let pending = null;
    try { pending = native(String(text)); } catch (e) { pending = null; }
    if (pending && typeof pending.then === 'function') {
      /* ★ #1035 (#46 auditor A, m2): the native ANSWER is final. A `false` from C# means the OS clipboard
         refused (or the copy was not allowed — background, rate limit); falling back to execCommand there
         is exactly the WKWebView path that reported copies nobody could paste, and it would run outside the
         gesture. Only NO answer (null — an older exe without the verb) falls back. */
      return pending.then((ok) => (ok === null ? copyInPage(text) : ok === true), () => copyInPage(text));
    }
  }
  return copyInPage(text);   // no bridge, or a synchronous refusal (over the cap): the in-page path, INSIDE the gesture
}

/* The pre-#1028 path, unchanged: async API first (Windows/Android), execCommand('copy') when it is absent
   or refuses. Kept as the fallback for a page with no native bridge and for version skew. */
function copyInPage(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true, () => execCopyText(text));
    }
  } catch (e) { /* fall through to the legacy path */ }
  return Promise.resolve(execCopyText(text));
}

