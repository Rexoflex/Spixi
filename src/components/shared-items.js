/**
 * c-shared — SHARED MEDIA · FILES · LINKS of one conversation (★★ #1106, be-cutover CI6; session 1 part 5).
 *
 * Fed by ContactDetails (`setSharedItems(json)`, ONE push, newest first, ≤ 200 items). An item:
 *   { id, n, kind: 'media'|'file'|'link', label, size, ts, local, thumb, received }
 *   (★ #1166 V-3: `received` is the 9th wire field, appended — an older exe sends 8 → false → no received-only rows)
 *   · id + n is the ONLY thing a tap sends back (`ixian:sharedOpen:<id>:<n>`) — C# resolves the target itself;
 *   · thumb is a data: URI of a small local image, else null (a glyph shows) — never a path, never remote (#82);
 *   · a link shows its HOST first and the address as typed, nothing fetched (no preview — the IP leak, C14).
 *
 * createSharedSection({ items, strings, onOpen, onAll, onMenu }) → the chat-info section (null when there is nothing)
 *   ★ G-6 (#1119, Damir picked render 1 "Telegram" of three): chips Media · Files · Links that switch IN PLACE, at the
 *   END of chat info; media is an edge-to-edge 3-column grid (2 px gaps, rounded top corners) the screen scrolls into;
 *   up to SHARED_INLINE_MAX of a kind in place, then "Show all N". A long press (or a right click) = onMenu(item).
 * createSharedList({ items, tab, strings, onOpen, onBack, onMenu }) → the "Show all" view: Media · Files · Links
 *   tabs, one structure for the desktop pane and the phone takeover. Empty kinds have no tab.
 * openSharedItemMenu({ item, host, strings, onAction }) → the long-press sheet: Open · Show in chat · Show in Downloads ·
 *   Copy link · Delete from this device (★ #1166 V-3 / #1154: the last two rows only for a RECEIVED item with a local copy).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { safeImageSrc } from './avatar.js';
import { createTopbar } from './topbar.js';
import { docLocale } from './timestamp.js';
import { createChip, setChipSelected } from './chip.js';   // ★ G-6: the kind chips
import { createSheet, openSheet, closeSheet } from './sheet.js';   // ★ G-6: the long-press menu
import { p1Shown } from './p1.js';   // ★ P-1 (#1127) — TEMPORARY, retire with the [P1] set
import { attachTouchPressGuard } from './message-menu.js';   // ★ #1174: the scroll-safe contextmenu

export const SHARED_KINDS = ['media', 'file', 'link'];
export const SHARED_PREVIEW = { media: 6, file: 3, link: 3 };   // (the #1110 cards; kept for the demo and older callers)
/* ★ #1195 (Damir picked "cap 9 now, shell only"): 9 per kind in place (3 grid rows), more → "Show all N" (the full grid).
   A faster chat-info open on every platform (fewer tiles to lay out and decode; the desktop close re-lays the pane on
   every column tick, #1194). C# still makes up to SharedItems.ThumbMaxCount (60) previews, so the full grid looks as
   before. Superseded: G-6 60 in place (20 rows). */
export const SHARED_INLINE_MAX = 9;
export const SHARED_LONG_PRESS_MS = 500;

/* ★ G-6: long press = the item menu. A TOUCH (or pen) held still for SHARED_LONG_PRESS_MS (a move of 10 px or a lift
   cancels it — a scroll is never a press), or the context-menu event (a right click, Shift+F10, a pen's barrel button,
   and the platform's own long press). The click that follows a menu is swallowed, so the menu never also opens the
   item. (#46 r1 B1) Whichever path runs first wins — Android and Windows touch send contextmenu for the SAME hold
   (the message-menu.js audit-r3 guard). (#46 r1 B5) A held MOUSE button opens nothing (#265: right click is the desktop
   path). (#46 r1 B8 → r2 R2-M1) The swallow is reset by the NEXT gesture start — a pointerdown or a keydown — never by
   a timer: a platform contextmenu can arrive seconds after the timer (Android "Touch & hold delay: Long", Windows touch
   sends it on release), and a timed lapse re-opened the double menu (the chats-row-menu.js grammar). */
function attachSharedLongPress(el, item, onMenu) {
  if (!onMenu) return;
  let timer = 0; let x = 0; let y = 0; let fired = false;
  const press = attachTouchPressGuard(el);   // ★ #1174: a touch press that became a scroll voids its contextmenu
  const cancel = () => { clearTimeout(timer); timer = 0; };
  const fire = () => { fired = true; onMenu(item, el); };
  el.addEventListener('keydown', () => { fired = false; });   // a keyboard activation is never swallowed
  el.addEventListener('pointerdown', (e) => {
    fired = false;   // (#46 r3 R3-M1) FIRST: a right click / pen barrel press is a new gesture too (message-menu.js:210)
    if (e.button !== 0) return;
    cancel();
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;   // B5: a mouse never long-presses
    x = e.clientX; y = e.clientY;
    timer = setTimeout(() => {
      timer = 0;
      if (!el.isConnected || press.voids()) return;   // ★ #1174 (#46 r1, F2): a re-rendered (detached) tile or a scrolled press opens nothing
      if (!fired) fire();
    }, SHARED_LONG_PRESS_MS);
  });
  el.addEventListener('pointermove', (e) => { if (timer && Math.hypot(e.clientX - x, e.clientY - y) > 10) cancel(); });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(t, cancel);
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    cancel();
    if (press.voids()) return;   // ★ #1174: Android's own long-press over a press that moved / scrolled
    if (fired) return;   // B1: the timer already opened the menu for this hold
    fire();
  });
  el.addEventListener('click', (e) => { if (fired) { fired = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
}

/** The C# wire form ([id, n, kind, label, size, ts, local, thumb] rows) → items; anything malformed is dropped. */
export function parseSharedItems(json) {
  let rows = null;
  try { rows = JSON.parse(String(json)); } catch (e) { rows = null; }
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const r of rows.slice(0, 200)) {
    if (!Array.isArray(r) || r.length < 8) continue;
    const [id, n, kind, label, size, ts, local, thumb, received] = r;
    if (typeof id !== 'string' || !/^[0-9a-fA-F]{1,128}$/.test(id) || !SHARED_KINDS.includes(kind)) continue;
    out.push({
      id, n: Number(n) || 0, kind, label: String(label || ''), size: Number(size) || 0, ts: Number(ts) || 0,
      local: local === 1 || local === true,
      thumb: typeof thumb === 'string' && /^data:image\/(png|jpeg|gif|webp);base64,/.test(thumb) ? thumb : null,
      received: received === 1 || received === true,   // ★ #1166 V-3 (#1154): field 9, absent on an older exe → false
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

function sharedMediaTile(item, strings, onOpen, onMenu) {
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
  /* ★ #1166 V-3 (#1144): a LOCAL image opens the in-app viewer (the shell's tap rule), so its name says Open; one not on
     this device still jumps to the chat. */
  b.setAttribute('aria-label', (item.local ? (strings.sharedOpen || 'Open') : (strings.sharedShowInChat || 'Show in chat')) + ': ' + item.label);
  b.addEventListener('click', () => onOpen && onOpen(item));
  attachSharedLongPress(b, item, onMenu);
  return b;
}

function sharedFileRow(item, strings, onOpen, onMenu) {
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
  attachSharedLongPress(b, item, onMenu);
  return b;
}

function sharedLinkRow(item, strings, onOpen, onMenu) {
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
  attachSharedLongPress(b, item, onMenu);
  return b;
}

function sharedItemsBody(kind, list, strings, onOpen, onMenu) {
  const box = document.createElement('div');
  box.className = kind === 'media' ? 'c-shared__grid' : 'c-shared__rows';
  for (const it of list) {
    box.append(kind === 'media' ? sharedMediaTile(it, strings, onOpen, onMenu) : kind === 'file' ? sharedFileRow(it, strings, onOpen, onMenu) : sharedLinkRow(it, strings, onOpen, onMenu));
  }
  return box;
}

export function sharedByKind(items) {
  const by = { media: [], file: [], link: [] };
  for (const it of items || []) if (by[it.kind]) by[it.kind].push(it);
  return by;
}

/** The chat-info section (null when nothing was shared). ★ G-6 (#1119, render 1 of three — Telegram's shared media in
 *  our tokens): a chip row of the NON-EMPTY kinds ("Media 9 · Files 4 · Links 2") that switches the panel in place;
 *  media = an edge-to-edge 3-column grid, files / links = the rows in one card. Up to SHARED_INLINE_MAX of a kind in
 *  place; more → "Show all N" (onAll(kind), the list cover). chat-info.js places it LAST, so the screen scrolls into it
 *  (#1117 (1)). The #1110 cards (one per kind, "See all" beside the label) are retired. */
export function createSharedSection({ items = [], strings = getStrings(), onOpen, onAll, onMenu, tab = '', onTab } = {}) {
  const by = sharedByKind(items);
  const kinds = SHARED_KINDS.filter((k) => by[k].length);
  if (!kinds.length) return null;
  let current = kinds.includes(tab) ? tab : kinds[0];
  const sec = document.createElement('div');
  sec.className = 'c-shared';
  const chips = document.createElement('div');
  chips.className = 'c-shared__chips';
  chips.setAttribute('role', 'tablist');
  chips.setAttribute('aria-label', strings.sharedTitle || 'Shared');
  const panel = document.createElement('div');
  panel.className = 'c-shared__panel';
  panel.id = 'c-shared-sec-' + Math.random().toString(36).slice(2, 8);
  panel.setAttribute('role', 'tabpanel');
  const chipFor = {};
  const show = (kind, userPick = false) => {
    current = kind;
    sec.dataset.kind = kind;
    for (const k of kinds) {
      setChipSelected(chipFor[k], k === kind);
      chipFor[k].removeAttribute('aria-pressed');   // (#46 r1 B7) a tab is aria-selected, never a pressed toggle
      chipFor[k].setAttribute('aria-selected', k === kind ? 'true' : 'false');
      chipFor[k].tabIndex = k === kind ? 0 : -1;
    }
    if (onTab && userPick) onTab(kind);   // (#46 r1 B2) the host keeps the USER's pick across a rebuild (r2 R2-n3: never a fallback)
    const list = by[kind];
    const parts = [];
    const bodyEl = sharedItemsBody(kind, list.slice(0, SHARED_INLINE_MAX), strings, onOpen, onMenu);
    if (kind === 'media') parts.push(bodyEl);
    else {
      const card = document.createElement('div');
      card.className = 'c-chat-info__card';
      card.append(bodyEl);
      parts.push(card);
    }
    if (onAll && list.length > SHARED_INLINE_MAX) {
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'c-shared__all';
      all.textContent = (strings.sharedShowAll || 'Show all {n}').split('{n}').join(String(list.length));
      all.addEventListener('click', () => onAll(kind));
      parts.push(all);
    }
    panel.replaceChildren(...parts);
    panel.setAttribute('aria-label', sharedKindTitle(kind, strings));
    if (userPick) { try { p1Shown('chatinfo-tab'); } catch (e) {} }   // ★ P-1 (#1127) — TEMPORARY, retire with the [P1] set
  };
  for (const k of kinds) {
    const c = createChip({ label: sharedKindTitle(k, strings) + ' ' + by[k].length, size: 'large', strings, onClick: () => show(k, true) });
    c.classList.add('c-shared__chip');
    c.dataset.kind = k;
    c.setAttribute('role', 'tab');
    c.setAttribute('aria-controls', panel.id);
    c.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const i = kinds.indexOf(current) + (e.key === 'ArrowRight' ? 1 : -1);
      const next = kinds[(i + kinds.length) % kinds.length];
      show(next, true);
      chipFor[next].focus();
    });
    chipFor[k] = c;
    chips.append(c);
  }
  sec.append(chips, panel);
  show(current);
  return sec;
}

/** ★ G-6 (#1119/#1120): the long-press menu of one shared item — a sheet titled with the item. Open (what a tap does) ·
 *  Show in chat · Copy link (links only); "Open" only for a link or a local file (#46 r1 B4) — ★ #1166 V-3: and a local
 *  image (its tap is the viewer now, not the jump). ★ #1166 V-3 (#1154, Damir): "Show in Downloads" and "Delete from this
 *  device" (destructive, last) for a RECEIVED media / file item with a local copy only — a sent file is the user's own
 *  original and is never offered (C# refuses it too). onAction('open' | 'show' | 'downloads' | 'copy' | 'delete', item).
 *  Share / Save and Delete message are NOT here: each needs a new verb, built after the BE answer (#1118, #1120) — no
 *  dead rows (#256). */
export function openSharedItemMenu({ item, host, strings = getStrings(), onAction } = {}) {
  if (!item) return null;
  const content = document.createElement('div');
  content.className = 'c-msgmenu';
  const list = document.createElement('div');
  list.className = 'c-msgmenu__list';
  let sheet = null;
  const add = (glyph, label, action, destructive = false) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-msgmenu__item';
    b.dataset.action = action;
    if (destructive) b.dataset.destructive = '';   // ★ #1166 V-3: the message-menu error ink (§5b)
    b.append(icon(glyph, { size: 20 }), document.createTextNode(label));
    b.addEventListener('click', () => { closeSheet(sheet); if (onAction) onAction(action, item); });
    list.append(b);
  };
  /* (#46 r1 B4) "Open" only where it is NOT the jump: a link (asks first, then the browser) and a file with a local copy
     (the system opens it). For media and a file not on this device the tap already IS "Show in chat" — one row, one action. */
  if (item.kind === 'link' || ((item.kind === 'file' || item.kind === 'media') && item.local)) {
    add(item.kind === 'link' ? 'external-link' : item.kind === 'media' ? 'photo' : 'file-isr',
      item.kind === 'link' ? (strings.openLink || 'Open') : (strings.sharedOpen || 'Open'), 'open');
  }
  add('message', strings.sharedShowInChat || 'Show in chat', 'show');
  const receivedLocal = (item.kind === 'media' || item.kind === 'file') && item.local && item.received;   // ★ #1166 V-3 (#1154)
  if (receivedLocal) add('download', strings.sharedShowInDownloads || 'Show in Downloads', 'downloads');
  if (item.kind === 'link') add('copy', strings.copyLink || 'Copy link', 'copy');
  if (receivedLocal) add('trash', strings.sharedDeleteLocal || 'Delete from this device', 'delete', true);
  content.append(list);
  const title = item.kind === 'link' ? (sharedLinkHost(item.label) || item.label) : item.label;
  sheet = createSheet({ title, content, host, strings, blurDismiss: true });   // ★ S8 (#1235)
  openSheet(sheet);
  return sheet;
}

/** "See all": a topbar (Back + title), the kind tabs (only the non-empty ones), the full list of the chosen kind. */
export function createSharedList({ items = [], tab = 'media', strings = getStrings(), onOpen, onBack, onMenu } = {}) {
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
  const show = (kind, user = false) => {   // ★ P-1 (#1127) — TEMPORARY, retire with the [P1] set: `user` marks a pick (the build-time show is not one)
    current = kind;
    for (const k of kinds) {
      buttons[k].setAttribute('aria-selected', k === kind ? 'true' : 'false');
      buttons[k].tabIndex = k === kind ? 0 : -1;
    }
    panel.replaceChildren(sharedItemsBody(kind, by[kind], strings, onOpen, onMenu));
    if (kinds.length > 1) panel.setAttribute('aria-label', sharedKindTitle(kind, strings));   // (#46 r2 R2-12) a name only on the tabpanel role
    el.dataset.tab = kind;
    if (user) { try { p1Shown('shared-tab'); } catch (e) {} }   // ★ P-1 (#1127) — TEMPORARY, retire with the [P1] set
  };
  for (const k of kinds) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-shared-list__tab';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', panel.id);
    b.textContent = sharedKindTitle(k, strings) + ' ' + by[k].length;
    b.addEventListener('click', () => show(k, true));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = kinds.indexOf(current) + (e.key === 'ArrowRight' ? 1 : -1);
      const next = kinds[(i + kinds.length) % kinds.length];
      show(next, true);
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
