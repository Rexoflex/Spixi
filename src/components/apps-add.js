/**
 * c-apps-add — the "Add mini app" surface (spec §2.2), now combined with Discover
 * (Damir: "combine discover with adding custom link"). Three method TILES — Paste
 * link (reveals an inline URL field → `ixian:fetch:url`), Scan QR (`ixian:quickscan`),
 * From file (`ixian:selectAppFile`) — a trust banner, and the embedded Discover
 * section (reuses c-apps-discover, parked until the apps.spixi.io feed lands).
 *
 * createAppsAdd({ strings, discover = true, onFetchUrl(url), onScan, onPickFile,
 *                 onCategory, onBrowseWeb, onLearnBuild, onOpenApp }) → view
 *   discover — set false to OMIT the embedded Discover section (phase-1 production
 *              add-app shell, where the directory feed isn't wired yet).
 *   onBrowseWeb  — parked-Discover fallback: opens the web directory (via external-link confirm)
 *   onLearnBuild — developer CTA: "anyone can build a mini app" → resources page (same confirm)
 *   onOpenApp    — a live-Discover card/tile tap → that app's details
 * Free fns (#44): setAddUrl(el, url) reveals + fills the field (QR → setScannedData);
 *                 setAddError(el, msg) shows the inline invalid-URL error;
 *                 setAddDiscoverFeed(el, feed, opts) — shell fetched the directory (#131):
 *                 flips the embedded Discover live (parsed via apps-feed.js).
 */
import { getStrings } from './strings-runtime.js';
import { createButton } from './button.js';
import { createAppsDiscover, setDiscoverFeed } from './apps-discover.js';
import { icon } from './icons.js';

export function createAppsAdd({ strings = getStrings(), discover = true, onFetchUrl, onScan, onPickFile, onCategory, onBrowseWeb, onLearnBuild, onOpenApp } = {}) {
  const el = document.createElement('div');
  el.className = 'c-apps-add';

  /* lead */
  const lead = document.createElement('p');
  lead.className = 'c-apps-add__lead';
  lead.textContent = strings.addLead
    || 'Add a mini app from a link, a QR code, or a file — or explore the directory below.';
  el.append(lead);

  /* URL field (revealed by the Paste-link tile / a QR scan) */
  const field = document.createElement('div');
  field.className = 'c-apps-add__field';
  field.hidden = true;
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
  const getBtn = createButton({
    label: strings.getFromUrl || 'Get app', type: 'fill', size: 56, width: 'full',
    icon: icon('download', { size: 20 }),
    onClick: () => { if (onFetchUrl) onFetchUrl(input.value.trim()); },
  });
  field.append(label, input, err, getBtn);

  /* method tiles */
  const methods = document.createElement('div');
  methods.className = 'c-apps-add__methods';
  methods.setAttribute('role', 'group');
  methods.setAttribute('aria-label', strings.addMethods || 'Ways to add a mini app');
  const method = (glyph, text, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-apps-add__method';
    const ic = document.createElement('span');
    ic.className = 'c-apps-add__method-icon';
    ic.append(icon(glyph, { size: 24 }));
    const t = document.createElement('span');
    t.className = 'c-apps-add__method-label';
    t.textContent = text;
    b.append(ic, t);
    b.addEventListener('click', onClick);
    return b;
  };
  methods.append(
    // 'world' glyph (web link) — 'link' isn't in the icon export yet (glyph-sweep list).
    method('world', strings.pasteLink || 'Paste link', () => { field.hidden = false; input.focus(); }),
    method('scan', strings.scanQr || 'Scan QR', () => { if (onScan) onScan(); }),
    method('file-isr', strings.pickFile || 'From file', () => { if (onPickFile) onPickFile(); }),
  );
  el.append(methods, field);

  /* trust banner */
  const info = document.createElement('div');
  info.className = 'c-apps-add__info';
  info.append(icon('info-circle', { size: 20 }));
  const itext = document.createElement('span');
  itext.textContent = strings.miniAppInfo
    || 'Mini apps are lightweight web apps that run securely inside Spixi. Only add apps from sources you trust.';
  info.append(itext);
  el.append(info);

  /* Discover (embedded, reuses c-apps-discover; parked until the feed lands). OMITTED
   * when discover:false (phase-1 production shell — no directory feed wired yet). */
  if (discover) {
    const disc = document.createElement('section');
    disc.className = 'c-apps-add__discover';
    const dTitle = document.createElement('h2');
    dTitle.className = 'c-apps-add__sectiontitle';
    dTitle.textContent = strings.discover || 'Discover';
    disc.append(dTitle, createAppsDiscover({ strings, ready: false, onCategory, onBrowseWeb, onOpen: onOpenApp }));
    el.append(disc);
  }

  /* developer CTA — anyone can build a mini app (quiet, page bottom; Damir #128③) */
  if (onLearnBuild) {
    const dev = document.createElement('div');
    dev.className = 'c-apps-add__dev';
    dev.append(icon('rocket', { size: 20 }));   // ⚠ 'code' glyph not in the icon export yet — swap when Damir exports it (glyph-sweep list)
    const dtext = document.createElement('span');
    dtext.className = 'c-apps-add__dev-text';
    dtext.textContent = strings.devLead
      || 'Anyone can build a mini app — web-friendly tech, no backend to run.';
    dev.append(dtext);
    const learn = document.createElement('button');
    learn.type = 'button';
    learn.className = 'c-apps-add__dev-link';
    learn.textContent = strings.devLearn || 'Learn how';
    learn.addEventListener('click', onLearnBuild);
    dev.append(learn);
    el.append(dev);
  }

  return el;
}

/** Reveal + populate the URL field (used by the QR-scan callback → setScannedData). */
export function setAddUrl(el, url) {
  const input = el && el.querySelector('.c-apps-add__input');
  const field = el && el.querySelector('.c-apps-add__field');
  if (field) field.hidden = false;
  if (input) { input.value = url == null ? '' : String(url); input.focus(); }
}

/** Shell fetched the directory feed (#131) — flip the embedded Discover live. */
export function setAddDiscoverFeed(el, feed, opts = {}) {
  const disc = el && el.querySelector('.c-apps-discover');
  if (disc) setDiscoverFeed(disc, feed, opts);
  return el;
}

/** Show an inline invalid-URL error (the shell's `showUrlError` hook). */
export function setAddError(el, msg) {
  if (!el) return;
  const field = el.querySelector('.c-apps-add__field');
  const errEl = el.querySelector('.c-apps-add__error');
  const input = el.querySelector('.c-apps-add__input');
  if (field) field.hidden = false;
  if (!errEl) return;
  errEl.textContent = msg || 'That doesn’t look like a valid mini-app link.';
  errEl.hidden = false;
  if (input) input.setAttribute('aria-invalid', 'true');
}
