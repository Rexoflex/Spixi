/**
 * c-banner — warning/status strip (bridge: showWarning(text); empty clears —
 * ARCHITECTURE.md §4). NOT a modal overlay: no scrim, no focus trap; passive
 * status that persists while the condition lasts (docs/overlays-spec.md).
 *
 * createWarningBanner({ strings, onDismiss }) → el (mount once, under the top bar)
 * setWarning(el, text) — non-empty opens/updates, empty/null collapses (#44 free fn)
 *
 * N40 (#383): `onDismiss` is OPTIONAL and adds a close control. Callers that omit
 * it get the byte-identical passive strip they had before. The button is only for
 * notices the user may reasonably wave away (the update notice); a condition the
 * app is still IN — connectivity — must never be dismissable, and connectivity does
 * not use this strip at all (it is a topbar title-state, #59/M16).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';

export function createWarningBanner({ strings = getStrings(), onDismiss } = {}) {
  const el = document.createElement('div');
  el.className = 'c-banner';
  el.setAttribute('role', 'status');
  // "Status", not "Warning" — the strip also carries neutral text (connectivity)
  el.setAttribute('aria-label', strings.status || 'Status');

  const inner = document.createElement('span');
  inner.className = 'c-banner__inner';
  inner.append(icon('alert-square-rounded', { size: 20 }));

  const text = document.createElement('span');
  text.className = 'c-banner__text';
  inner.append(text);
  el.append(inner);

  if (typeof onDismiss === 'function') {
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'c-banner__close';
    close.setAttribute('aria-label', strings.dismiss || 'Dismiss');
    close.append(icon('x', { size: 18 }));
    close.addEventListener('click', () => {
      // review MINOR-1: the strip collapses but stays in the DOM — move focus out
      // before it goes invisible, or the user is left on a control they cannot see.
      try { close.blur(); } catch (_) {}
      setWarning(el, '');
      try { onDismiss(); } catch (_) { /* caller-side bookkeeping only */ }
    });
    el.append(close);
    el.classList.add('c-banner--dismissable');
  }
  return el;
}

export function setWarning(el, message) {
  const text = el.querySelector('.c-banner__text');
  if (message) {
    text.textContent = message;
    el.dataset.open = '';
  } else {
    delete el.dataset.open;
    // text stays until collapsed — clearing mid-transition would flash empty
  }
}
