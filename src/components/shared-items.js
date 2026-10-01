/**
 * c-shared — SHARED MEDIA · FILES · LINKS of one conversation (★★ #1106, be-cutover CI6; session 1 part 5).
 *
 * Fed by ContactDetails (`setSharedItems(json)`, ONE push, newest first, ≤ 200 items). An item:
 *   { id, n, kind: 'media'|'file'|'link', label, size, ts, local, thumb }
 *   · id + n is the ONLY thing a tap sends back (`ixian:sharedOpen:<id>:<n>`) — C# resolves the target itself;
 *   · thumb is a data: URI of a small local image, else null (a glyph shows) — never a path, never remote (#82);
 *   · a link shows its HOST first and the address as typed, nothing fetched (no preview — the IP leak, C14).
 *
 * createSharedSection({ items, strings, onOpen, onAll })  → the chat-info section (null when there is nothing)
 * createSharedList({ items, tab, strings, onOpen, onBack }) → the "See all" view: Media · Files · Links tabs,
 *   one structure for the desktop pane and the phone takeover. Empty kinds have no tab.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { safeImageSrc } from './avatar.js';
import { createTopbar } from './topbar.js';
import { docLocale } from './timestamp.js';

export const SHARED_KINDS = ['media', 'file', 'link'];
export const SHARED_PREVIEW = { media: 6, file: 3, link: 3 };

/** The C# wire form ([id, n, kind, label, size, ts, local, thumb] rows) → items; anything malformed is dropped. */
export function parseSharedItems(json) {
  let rows = null;
  try { rows = JSON.parse(String(json)); } catch (e) { rows = null; }
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const r of rows.slice(0, 200)) {
    if (!Array.isArray(r) || r.length < 8) continue;
    const [id, n, kind, label, size, ts, local, thumb] = r;
    if (typeof id !== 'string' || !/^[0-9a-fA-F]{1,128}$/.test(id) || !SHARED_KINDS.includes(kind)) continue;
    out.push({
      id, n: Number(n) || 0, kind, label: String(label || ''), size: Number(size) || 0, ts: Number(ts) || 0,
      local: local === 1 || local === true,
      thumb: typeof thumb === 'string' && /^data:image\/(png|jpeg|gif|webp);base64,/.test(thumb) ? thumb : null,
    });
  }
  return out;
}

/** "github.com", "example.com" … — the host of a link as typed (scheme-less links get https:// to parse). '' when
 *  it does not parse. Userinfo is never part of it (the #235 spoof). */
export function sharedLinkHost(label) {
  try {
    const u = new URL(/^https?:\/\//i.test(label) ? label : 'https://' + label);
    return u.hostname || '';
  } catch (e) { return ''; }
}

/** 0 → '' · 512 B · 12 KB · 3.4 MB · 1.2 GB (one decimal under 10, the locale's decimal mark; binary steps, the
 *  convention of every file manager the app sits beside). */
export function formatFileSize(bytes) {
  const b = Number(bytes);
  if (!Number.isFinite(b) || b <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = b; let u = 0;
  while (v >= 1024 && u < units.length - 1) { v /= 1024; u += 1; }
  let n;
  try { n = new Intl.NumberFormat(docLocale(), { maximumFractionDigits: u === 0 || v >= 10 ? 0 : 1 }).format(v); }   // (#46 r1 B7) the locale's decimal mark
  catch (e) { n = u === 0 ? String(Math.round(v)) : (v < 10 ? v.toFixed(1) : String(Math.round(v))); }
  return n + ' ' + units[u];
}

function sharedShortDate(ts) {
  const d = new Date(Number(ts) * 1000);
  if (isNaN(d)) return '';
  const now = new Date();
  return d.toLocaleDateString(docLocale(), d.getFullYear() === now.getFullYear()
    ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

function sharedKindTitle(kind, strings) {
  if (kind === 'media') return strings.sharedKindMedia || 'Media';
  if (kind === 'file') return strings.sharedFiles || 'Files';
  return strings.sharedLinks || 'Links';
}

function sharedMediaTile(item, strings, onOpen) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'c-shared__tile';
  const src = safeImageSrc(item.thumb, { allowRemote: false });
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.decoding = 'async';
    b.append(img);
  } else {
    b.append(icon('photo', { size: 24 }));
    b.dataset.glyph = '';
  }
  b.setAttribute('aria-label', (strings.sharedShowInChat || 'Show in chat') + ': ' + item.label);
  b.addEventListener('click', () => onOpen && onOpen(item));
  return b;
}

function sharedFileRow(item, strings, onOpen) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'c-shared__row';
  b.append(icon('file-isr', { size: 22 }));
  const txt = document.createElement('span');
  txt.className = 'c-shared__row-text';
  const t = document.createElement('span');
  t.className = 'c-shared__row-title';
  t.textContent = item.label;
  const sub = document.createElement('span');
  sub.className = 'c-shared__row-sub';
  sub.textContent = [formatFileSize(item.size), sharedShortDate(item.ts), item.local ? '' : (strings.sharedNotOnDevice || 'Not on this device')]
    .filter(Boolean).join(' · ');
  txt.append(t, sub);
  b.append(txt);
  b.setAttribute('aria-label', item.label + (sub.textContent ? ', ' + sub.textContent : ''));
  b.addEventListener('click', () => onOpen && onOpen(item));
  return b;
}

function sharedLinkRow(item, strings, onOpen) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'c-shared__row';
  b.append(icon('link', { size: 22 }));
  const txt = document.createElement('span');
  txt.className = 'c-shared__row-text';
  const t = document.createElement('span');
  t.className = 'c-shared__row-title';
  t.textContent = sharedLinkHost(item.label) || item.label;
  const sub = document.createElement('span');
  sub.className = 'c-shared__row-sub';
  sub.textContent = item.label;
  txt.append(t, sub);
  b.append(txt);
  b.setAttribute('aria-label', (strings.sharedLinkLabel || 'Link') + ': ' + item.label);
  b.addEventListener('click', () => onOpen && onOpen(item));
  return b;
}

function sharedItemsBody(kind, list, strings, onOpen) {
  const box = document.createElement('div');
  box.className = kind === 'media' ? 'c-shared__grid' : 'c-shared__rows';
  for (const it of list) {
    box.append(kind === 'media' ? sharedMediaTile(it, strings, onOpen) : kind === 'file' ? sharedFileRow(it, strings, onOpen) : sharedLinkRow(it, strings, onOpen));
  }
  return box;
}

export function sharedByKind(items) {
  const by = { media: [], file: [], link: [] };
  for (const it of items || []) if (by[it.kind]) by[it.kind].push(it);
  return by;
}

/** The chat-info section (null when nothing was shared): one inset-grouped card per NON-EMPTY kind with the
 *  newest few (SHARED_PREVIEW), "See all" beside the label when there are more. Damir picked this layout from three
 *  renders (#1110: cards · summary rows · media strip + rows). */
export function createSharedSection({ items = [], strings = getStrings(), onOpen, onAll } = {}) {
  const by = sharedByKind(items);
  if (!SHARED_KINDS.some((k) => by[k].length)) return null;
  const sec = document.createElement('div');
  sec.className = 'c-shared';
  for (const kind of SHARED_KINDS) {
    const list = by[kind];
    if (!list.length) continue;
    const group = document.createElement('div');
    group.className = 'c-chat-info__group c-shared__group';
    group.dataset.kind = kind;
    const head = document.createElement('div');
    head.className = 'c-shared__head';
    const label = document.createElement('h3');
    label.className = 'c-chat-info__label';
    label.textContent = sharedKindTitle(kind, strings) + ' (' + list.length + ')';
    head.append(label);
    if (onAll && list.length > SHARED_PREVIEW[kind]) {
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'c-shared__all';
      all.textContent = strings.seeAll || 'See all';
      all.addEventListener('click', () => onAll(kind));
      head.append(all);
    }
    group.append(head);
    const card = document.createElement('div');
    card.className = 'c-chat-info__card';
    card.append(sharedItemsBody(kind, list.slice(0, SHARED_PREVIEW[kind]), strings, onOpen));
    group.append(card);
    sec.append(group);
  }
  return sec;
}

/** "See all": a topbar (Back + title), the kind tabs (only the non-empty ones), the full list of the chosen kind. */
export function createSharedList({ items = [], tab = 'media', strings = getStrings(), onOpen, onBack } = {}) {
  const by = sharedByKind(items);
  const kinds = SHARED_KINDS.filter((k) => by[k].length);
  let current = kinds.includes(tab) ? tab : (kinds[0] || 'media');
  const el = document.createElement('section');
  el.className = 'c-shared-list';
  el.append(createTopbar({ variant: 'view', title: kinds.length === 1 ? sharedKindTitle(kinds[0], strings) : (strings.sharedTitle || 'Shared'), onBack, strings }));
  const tabs = document.createElement('div');
  tabs.className = 'c-shared-list__tabs';
  tabs.setAttribute('role', 'tablist');
  const panel = document.createElement('div');
  panel.className = 'c-shared-list__panel';
  panel.id = 'c-shared-panel-' + Math.random().toString(36).slice(2, 8);   // (#46 r1 B5) the tabs point at it
  if (kinds.length > 1) panel.setAttribute('role', 'tabpanel');
  const buttons = {};
  const show = (kind) => {
    current = kind;
    for (const k of kinds) {
      buttons[k].setAttribute('aria-selected', k === kind ? 'true' : 'false');
      buttons[k].tabIndex = k === kind ? 0 : -1;
    }
    panel.replaceChildren(sharedItemsBody(kind, by[kind], strings, onOpen));
    if (kinds.length > 1) panel.setAttribute('aria-label', sharedKindTitle(kind, strings));   // (#46 r2 R2-12) a name only on the tabpanel role
    el.dataset.tab = kind;
  };
  for (const k of kinds) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-shared-list__tab';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', panel.id);
    b.textContent = sharedKindTitle(k, strings) + ' ' + by[k].length;
    b.addEventListener('click', () => show(k));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = kinds.indexOf(current) + (e.key === 'ArrowRight' ? 1 : -1);
      const next = kinds[(i + kinds.length) % kinds.length];
      show(next);
      buttons[next].focus();
    });
    buttons[k] = b;
    tabs.append(b);
  }
  if (kinds.length > 1) el.append(tabs);
  el.append(panel);
  show(current);
  return el;
}
