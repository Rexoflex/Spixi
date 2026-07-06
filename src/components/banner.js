/**
 * c-banner — warning/status strip (bridge: showWarning(text); empty clears —
 * ARCHITECTURE.md §4). NOT a modal overlay: no scrim, no focus trap; passive
 * status that persists while the condition lasts (docs/overlays-spec.md).
 *
 * createWarningBanner({ strings }) → el (mount once, directly under the top bar)
 * setWarning(el, text) — non-empty opens/updates, empty/null collapses (#44 free fn)
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';

export function createWarningBanner({ strings = getStrings() } = {}) {
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
