/**
 * c-modal — dialog (docs/overlays-spec.md, DECISIONS #56). Replaces
 * showModalDialog. z-50; scrim click does NOT dismiss by default
 * (confirmations are explicit) but Esc DOES (safe dismiss path, ARIA APG).
 * Destructive confirms: role=alertdialog + autofocus the SAFE action.
 *
 * createModal({ title, body, content, actions, role = 'dialog', host,
 *               lightDismiss = false, escDismiss = true, onDismiss, strings })
 *   body    — plain-text description (string)
 *   content — optional Element for RICH bodies (e.g. permission chips); appended after body
 *   actions: [{ label, type = 'text'|'fill'|…, intent, onClick, autofocus }]
 *   an action returning false from onClick keeps the modal open.
 *   lightDismiss — scrim click closes (modal default: false)
 *   escDismiss   — Esc closes (default: true)
 *   strings.modal — aria-label fallback when there is no title ('Dialog')
 * openModal(el) / closeModal(el) free fns (#44).
 */
import { getStrings } from './strings-runtime.js';
import { openOverlay, dismissOverlay, setOverlayOpts, overlayId } from './overlay.js';
import { createButton } from './button.js';

export function createModal({
  title = '', body = '', content = null, actions = [], role = 'dialog', host,
  lightDismiss = false, escDismiss = true, onDismiss, strings = getStrings(),
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-modal';
  el.setAttribute('role', role);
  el.setAttribute('aria-modal', 'true');
  el.tabIndex = -1;

  if (title) {
    const t = document.createElement('h2');
    t.className = 'c-modal__title t-heading-xs';
    t.textContent = title;
    t.id = overlayId('c-modal-title');
    el.setAttribute('aria-labelledby', t.id);
    el.append(t);
  } else {
    el.setAttribute('aria-label', strings.modal || 'Dialog');
    if (role === 'alertdialog') {
      console.warn('c-modal: role=alertdialog without a title — SRs announce alert dialogs by their label; provide one');
    }
  }

  if (body) {
    const b = document.createElement('p');
    b.className = 'c-modal__body';
    b.textContent = body;
    b.id = overlayId('c-modal-body');
    el.setAttribute('aria-describedby', b.id);
    el.append(b);
  }

  if (content) el.append(content);                 // rich body (e.g. permission chips)

  if (actions.length) {
    const row = document.createElement('div');
    row.className = 'c-modal__actions';
    for (const a of actions) {
      const btn = createButton({
        label: a.label, type: a.type || 'text', intent: a.intent, size: 44,
        onClick: () => {
          const keep = a.onClick ? a.onClick() : undefined;
          if (keep !== false) dismissOverlay(el);
        },
      });
      if (a.autofocus) btn.dataset.autofocus = '';
      row.append(btn);
    }
    el.append(row);
  }

  setOverlayOpts(el, { host, lightDismiss, escDismiss, onDismiss });
  return el;
}

export function openModal(el) { openOverlay(el); }
export function closeModal(el) { dismissOverlay(el); }
