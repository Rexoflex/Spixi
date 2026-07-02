/**
 * c-sheet — bottom sheet (docs/overlays-spec.md, DECISIONS #56). Replaces the
 * bridge-era toggleAnimatedSlider menus. z-40, light-dismiss by default.
 *
 * createSheet({ title, content, host, lightDismiss = true, escDismiss = true,
 *               onDismiss, strings })
 *   lightDismiss — scrim click closes (sheet default: true)
 *   escDismiss   — Esc closes (default: true; safe dismiss path, ARIA APG)
 *   strings.sheet — aria-label fallback when there is no title ('Menu')
 * openSheet(el) / closeSheet(el) free fns (#44).
 */
import { openOverlay, dismissOverlay, setOverlayOpts, overlayId } from './overlay.js';

export function createSheet({
  title = '', content = null, host, lightDismiss = true, escDismiss = true,
  onDismiss, strings = {},
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-sheet';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.tabIndex = -1;

  const handle = document.createElement('span');
  handle.className = 'c-sheet__handle';
  handle.setAttribute('aria-hidden', 'true');
  el.append(handle);

  if (title) {
    const t = document.createElement('h2');
    t.className = 'c-sheet__title t-heading-xs';
    t.textContent = title;
    t.id = overlayId('c-sheet-title');
    el.setAttribute('aria-labelledby', t.id);
    el.append(t);
  } else {
    el.setAttribute('aria-label', strings.sheet || 'Menu');
  }

  const body = document.createElement('div');
  body.className = 'c-sheet__content';
  if (content) body.append(content);
  el.append(body);

  setOverlayOpts(el, { host, lightDismiss, escDismiss, onDismiss });
  return el;
}

export function openSheet(el) { openOverlay(el); }
export function closeSheet(el) { dismissOverlay(el); }
