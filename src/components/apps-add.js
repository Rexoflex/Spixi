/**
 * c-apps-add — the "Add mini app" surface (spec §2.2), now combined with Discover
 * (Damir: "combine discover with adding custom link"). Three method TILES — Paste
 * link (reveals an inline URL field → `ixian:fetch:url`), Scan QR (`ixian:quickscan`),
 * From file (`ixian:selectAppFile`) — a trust caption, and the embedded Discover
 * section (reuses c-apps-discover, parked until the apps.spixi.io feed lands).
 * ★ #1359 (Damir 2026-10-12, Direction B without the Explore banner): white tiles with hub
 * discs on the settings ground (the shells paint the ground), the open Paste link tile
 * selected (#1362), the field as a settings card under the tiles, the shield-lock caption.
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
 *                 (both open the field and select the Paste link tile — ★ #1359)
 *                 setAddDiscoverFeed(el, feed, opts) — shell fetched the directory (#131):
 *                 flips the embedded Discover live (parsed via apps-feed.js).
 */
import { getStrings } from './strings-runtime.js';
import { createButton } from './button.js';
import { createAppsDiscover, setDiscoverFeed } from './apps-discover.js';
import { icon } from './icons.js';

let addSeq = 0;   // ★ #1359: unique ids — the label / aria-controls / aria-describedby wiring must not collide across two mounts (demos)

export function createAppsAdd({ strings = getStrings(), discover = true, onFetchUrl, onScan, onPickFile, onCategory, onBrowseWeb, onLearnBuild, onOpenApp } = {}) {
  const el = document.createElement('div');
  el.className = 'c-apps-add';
  addSeq += 1;
  const uid = 'apps-add-' + addSeq;

  /* lead — ★ #1359: the broken half ("…explore the directory below") is gone; nothing is below in production */
  const lead = document.createElement('p');
  lead.className = 'c-apps-add__lead';
  lead.textContent = strings.addLead
    || 'Add a mini app from a link, a QR code, or a file.';
  el.append(lead);

  /* URL field (revealed by the Paste-link tile / a QR scan / an error) — ★ #1359: a settings card UNDER the tiles */
  const field = document.createElement('div');
  field.className = 'c-apps-add__field';
  field.id = uid + '-field';
  field.hidden = true;
  const label = document.createElement('label');
  label.className = 'c-apps-add__label';
  label.textContent = strings.appUrlLabel || 'Mini app link';
  label.setAttribute('for', uid + '-url');
  const box = document.createElement('div');
  box.className = 'c-apps-add__inputbox';
  const linkIc = icon('link', { size: 20 });
  linkIc.classList.add('c-apps-add__input-icon');
  const input = document.createElement('input');
  input.type = 'url';
  input.id = uid + '-url';
  input.className = 'c-apps-add__input';
  input.placeholder = strings.appUrlPlaceholder || 'https://…';
  box.append(linkIc, input);
  const err = document.createElement('span');
  err.className = 'c-apps-add__error';
  err.id = uid + '-err';
  err.hidden = true;
  err.setAttribute('role', 'alert');
  const errText = document.createElement('span');
  errText.className = 'c-apps-add__error-text';
  err.append(icon('alert-square-rounded', { size: 16 }), errText);   // ★ S20H F-C (#1454): one warning glyph app-wide   // the glyph stays; setAddError swaps only the text
  input.addEventListener('input', () => {
    err.hidden = true;
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  });
  const getBtn = createButton({
    label: strings.getFromUrl || 'Get app', type: 'fill', size: 56, width: 'full',
    icon: icon('download', { size: 20 }),
    onClick: () => { if (onFetchUrl) onFetchUrl(input.value.trim()); },
  });
  field.append(label, box, err, getBtn);

  /* method tiles — ★ #1359: white cards, a 44 hub disc each (7 blue · 8 violet · 10 pink, the Account hub grammar) */
  const methods = document.createElement('div');
  methods.className = 'c-apps-add__methods';
  methods.setAttribute('role', 'group');
  methods.setAttribute('aria-label', strings.addMethods || 'Ways to add a mini app');
  const method = (kind, hub, glyph, text, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-apps-add__method';
    b.dataset.method = kind;
    const ic = document.createElement('span');
    ic.className = 'c-apps-add__method-icon';
    ic.dataset.hub = hub;
    ic.append(icon(glyph, { size: 22 }));
    const t = document.createElement('span');
    t.className = 'c-apps-add__method-label';
    t.textContent = text;
    b.append(ic, t);
    b.addEventListener('click', onClick);
    return b;
  };
  // #710: 'link' is exported now — 'world' stays the Language row's glyph (one glyph, one meaning).
  // ★ #1359 / #1362: the Paste link tile CONTROLS the field — once open it stays selected; a 2nd tap only focuses.
  const linkTile = method('link', '7', 'link', strings.pasteLink || 'Paste link', () => { openAddField(el); input.focus(); });
  linkTile.setAttribute('aria-expanded', 'false');
  linkTile.setAttribute('aria-controls', field.id);
  methods.append(
    linkTile,
    method('scan', '8', 'scan', strings.scanQr || 'Scan QR', () => { if (onScan) onScan(); }),
    method('file', '10', 'file-isr', strings.pickFile || 'From file', () => { if (onPickFile) onPickFile(); }),
  );
  el.append(methods, field);

  /* trust line — ★ #1359: a caption with the shield-lock glyph, not a grey box */
  const info = document.createElement('p');
  info.className = 'c-apps-add__trust';
  info.append(icon('shield-lock', { size: 18 }));
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
      || 'Anyone can build a mini app: web-friendly tech, no backend to run.';
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

/* ★ #1359: open the field and mark the Paste link tile selected (aria-expanded + data-selected). Never closes. */
function openAddField(el) {
  const field = el && el.querySelector('.c-apps-add__field');
  if (field) field.hidden = false;
  const tile = el && el.querySelector('.c-apps-add__method[data-method="link"]');
  if (tile) { tile.setAttribute('aria-expanded', 'true'); tile.setAttribute('data-selected', ''); }
}

/** Reveal + populate the URL field (used by the QR-scan callback → setScannedData). */
export function setAddUrl(el, url) {
  const input = el && el.querySelector('.c-apps-add__input');
  openAddField(el);
  if (input) { input.value = url == null ? '' : String(url); input.focus(); }
}

/** Shell fetched the directory feed (#131) — flip the embedded Discover live. */
export function setAddDiscoverFeed(el, feed, opts = {}) {
  const disc = el && el.querySelector('.c-apps-discover');
  if (disc) setDiscoverFeed(disc, feed, opts);
  return el;
}

/** Show an inline invalid-URL error (the shell's `showUrlError` hook). ★ #1359: the alert glyph stays, only the text changes. */
export function setAddError(el, msg) {
  if (!el) return;
  const errEl = el.querySelector('.c-apps-add__error');
  const input = el.querySelector('.c-apps-add__input');
  openAddField(el);
  if (!errEl) return;
  const t = errEl.querySelector('.c-apps-add__error-text') || errEl;
  t.textContent = msg || 'That doesn’t look like a valid mini-app link.';
  errEl.hidden = false;
  if (input) {
    input.setAttribute('aria-invalid', 'true');
    if (errEl.id) input.setAttribute('aria-describedby', errEl.id);
  }
}
