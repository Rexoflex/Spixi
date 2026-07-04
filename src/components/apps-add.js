/**
 * c-apps-add — the "Add mini app" view (spec §2.2). A URL input plus three methods —
 * Get from URL (`ixian:fetch:url`), Scan QR (`ixian:quickscan`), Choose file
 * (`ixian:selectAppFile`) — an info banner, and an inline invalid-URL error.
 *
 * createAppsAdd({ strings, onFetchUrl(url), onScan, onPickFile }) → view
 * Free fns (#44): setAddUrl(el, url) (after QR → setScannedData) · setAddError(el, msg) (showUrlError)
 */
import { createButton } from './button.js';
import { icon } from './icons.js';

export function createAppsAdd({ strings = {}, onFetchUrl, onScan, onPickFile } = {}) {
  const el = document.createElement('div');
  el.className = 'c-apps-add';

  /* URL field */
  const field = document.createElement('div');
  field.className = 'c-apps-add__field';
  const label = document.createElement('label');
  label.className = 'c-apps-add__label';
  label.textContent = strings.appUrlLabel || 'Mini app link';
  label.setAttribute('for', 'apps-add-url');
  const input = document.createElement('input');
  input.type = 'url';
  input.id = 'apps-add-url';
  input.className = 'c-apps-add__input';
  input.placeholder = strings.appUrlPlaceholder || 'https://…';
  input.setAttribute('aria-label', strings.appUrlLabel || 'Mini app link');
  const err = document.createElement('span');
  err.className = 'c-apps-add__error';
  err.hidden = true;
  err.setAttribute('role', 'alert');
  input.addEventListener('input', () => { err.hidden = true; input.removeAttribute('aria-invalid'); });
  field.append(label, input, err);
  el.append(field);

  /* methods */
  const methods = document.createElement('div');
  methods.className = 'c-apps-add__methods';
  methods.append(
    createButton({ label: strings.getFromUrl || 'Get from link', type: 'fill', size: 56, width: 'full',
      icon: icon('download', { size: 20 }), onClick: () => { if (onFetchUrl) onFetchUrl(input.value.trim()); } }),
    createButton({ label: strings.scanQr || 'Scan QR code', type: 'outline', size: 56, width: 'full',
      icon: icon('scan', { size: 20 }), onClick: () => { if (onScan) onScan(); } }),
    createButton({ label: strings.pickFile || 'Choose a file', type: 'outline', size: 56, width: 'full',
      icon: icon('file-isr', { size: 20 }), onClick: () => { if (onPickFile) onPickFile(); } }),
  );
  el.append(methods);

  /* info banner */
  const info = document.createElement('div');
  info.className = 'c-apps-add__info';
  info.append(icon('info-circle', { size: 20 }));
  const itext = document.createElement('span');
  itext.textContent = strings.miniAppInfo
    || 'Mini apps are lightweight web apps that run securely inside Spixi. Only add apps from sources you trust.';
  info.append(itext);
  el.append(info);

  return el;
}

/** Populate the URL field (used by the QR-scan callback → setScannedData). */
export function setAddUrl(el, url) {
  const input = el && el.querySelector('.c-apps-add__input');
  if (input) input.value = url == null ? '' : String(url);
}

/** Show an inline invalid-URL error (the shell's `showUrlError` hook). */
export function setAddError(el, msg) {
  if (!el) return;
  const errEl = el.querySelector('.c-apps-add__error');
  const input = el.querySelector('.c-apps-add__input');
  if (!errEl) return;
  errEl.textContent = msg || 'That doesn’t look like a valid mini-app link.';
  errEl.hidden = false;
  if (input) input.setAttribute('aria-invalid', 'true');
}
