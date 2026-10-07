/**
 * c-mstrip — ★ S10 P1 (#1254, Damir pick A): the PASTE / ATTACH STRIP. It replaces the S9 preview sheet
 * (media-send-sheet.js, removed everywhere — the camera too). C# prepared the batch (bounded decode, rotation, ≤ 2048 px,
 * JPEG q82, NO metadata) and pushed `mediaPicked(batchId, json)` with the FULL item list of the batch; the shell vetted
 * every item and shows them HERE: a floating tray card above the composer pill — 64 × 64 tiles (the C# thumb, cover
 * cropped; a glyph tile when C# made no preview), a ✕ disc per tile, a "+" tile while the strip holds < MEDIA_STRIP_MAX,
 * then "{n} of 10". The composer text is the CAPTION; the composer's send disc sends the strip (the shell's onSend).
 *
 * openMediaStrip({ host, items, strings, onRemove, onAdd, onEmpty }) → ctrl | null
 *   host     — the composer's parent (the chat's #chat-composer slot): the strip is its FIRST child, above the pill
 *   items    — [{ k, thumb }] in batch order (k = "0".."9", thumb = a vetted base64 JPEG data: URI or '' = the glyph)
 *   onRemove(k) — a ✕ on a tile while ≥ 2 remain (the shell sends ixian:mediaDrop:<id>:<k>)
 *   onAdd()     — the "+" tile (the shell opens the photo picker: ixian:sendmedia)
 *   onEmpty()   — the ✕ on the LAST tile: the shell cancels the batch (ixian:mediaCancel, never a mediaDrop) and closes
 * ctrl = { el, setItems(items), keys(), count(), close() }
 *   setItems — REPLACE the tiles with this list (C#'s same-batch push after an append); keys() — the keys in strip order;
 *   close()  — the strip leaves the DOM (idempotent; the SHELL answers C# — this component sends nothing).
 * Sinks: the thumb is set as an <img> src PROPERTY (the shell's FILE_THUMB_RE-vetted data: JPEG); every label is
 * textContent / setAttribute.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';

export const MEDIA_CAPTION_MAX = 4096;   // C# refuses a longer caption after decode (S9 CONTRACT §1b) — the composer enforces it now
export const MEDIA_STRIP_MAX = 10;       // PhotoRules.MaxBatch: keys are the digits 0–9

const fill = (tpl, n) => String(tpl).split('{n}').join(String(n));

export function openMediaStrip({ host, items = [], strings = getStrings(), onRemove, onAdd, onEmpty } = {}) {
  if (!host) return null;
  const el = document.createElement('div');
  el.className = 'c-mstrip';
  el.setAttribute('role', 'group');
  const row = document.createElement('div');
  row.className = 'c-mstrip__row';
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'c-mstrip__add';
  add.setAttribute('aria-label', strings.addPhotos || 'Add photos');
  add.addEventListener('click', () => { if (onAdd) { try { onAdd(); } catch (_) {} } });
  const count = document.createElement('span');
  count.className = 'c-mstrip__count';
  count.setAttribute('aria-hidden', 'true');   // the group's name says how many
  el.append(row);

  let closed = false;
  let list = [];

  const relabel = () => {
    const n = list.length;
    el.setAttribute('aria-label', n === 1 ? (strings.photoCountOne || '1 photo') : fill(strings.photoCountMany || '{n} photos', n));
    count.textContent = fill(strings.photoStripCount || '{n} of 10', n);
    el.dataset.count = String(n);
    add.hidden = n >= MEDIA_STRIP_MAX;
    let i = 0;
    for (const t of row.querySelectorAll('.c-mstrip__tile')) {
      i += 1;
      const x = t.querySelector('.c-mstrip__remove');
      if (x) x.setAttribute('aria-label', fill(strings.removePhotoN || 'Remove photo {n}', i));
    }
  };

  const tileFor = (it) => {
    const key = String(it.k);
    const tile = document.createElement('div');
    tile.className = 'c-mstrip__tile';
    tile.dataset.k = key;
    let pic;
    if (it.thumb) {
      pic = document.createElement('img');
      pic.className = 'c-mstrip__img';
      pic.alt = '';
      pic.draggable = false;
      pic.src = String(it.thumb);
    } else {
      pic = document.createElement('span');   // C# made no preview: the photo glyph — the photo still goes
      pic.className = 'c-mstrip__img c-mstrip__glyph';
      pic.setAttribute('aria-hidden', 'true');
      pic.append(icon('photo', { size: 24 }));
    }
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'c-mstrip__remove';
    x.append(icon('x', { size: 14 }));
    x.addEventListener('click', () => {
      if (closed) return;
      const at = list.findIndex((o) => o.k === key);
      if (at === -1) return;
      if (list.length === 1) { if (onEmpty) { try { onEmpty(); } catch (_) {} } return; }   // the last ✕ = cancel the batch
      list.splice(at, 1);
      const next = tile.nextElementSibling && tile.nextElementSibling.classList.contains('c-mstrip__tile')
        ? tile.nextElementSibling : tile.previousElementSibling;
      tile.remove();
      relabel();
      const f = next && next.querySelector('.c-mstrip__remove');
      if (f) f.focus({ preventScroll: true });   // focus never falls to the body
      if (onRemove) { try { onRemove(key); } catch (_) {} }
    });
    tile.append(pic, x);
    return tile;
  };

  /* ★ S10 #46 m-3: a re-render keeps the keyboard where it was — on the same key's ✕, else on "+" */
  const focusedKey = () => {
    const a = document.activeElement;
    if (!a || !el.contains(a)) return null;
    if (a === add) return '+';
    const t = a.closest && a.closest('.c-mstrip__tile');
    return t ? t.dataset.k : null;
  };
  const restoreFocus = (k) => {
    if (k == null) return;
    const t = k === '+' ? null : row.querySelector('.c-mstrip__tile[data-k="' + k + '"] .c-mstrip__remove');
    const f = t || (!add.hidden ? add : row.querySelector('.c-mstrip__tile:last-of-type .c-mstrip__remove'));
    if (f) f.focus({ preventScroll: true });
  };
  const setItems = (next) => {
    if (closed) return;
    const fk = focusedKey();
    const grew = Array.isArray(next) && next.length > list.length;
    list = (Array.isArray(next) ? next : []).filter((it) => it && it.k != null).slice(0, MEDIA_STRIP_MAX)
      .map((it) => ({ k: String(it.k), thumb: it.thumb ? String(it.thumb) : '' }));
    row.replaceChildren(...list.map(tileFor), add, count);
    relabel();
    restoreFocus(fk);
    if (grew) {   // an append shows its new tiles (and the "+") — the inline END (RTL scrolls negative)
      try { row.scrollLeft = getComputedStyle(row).direction === 'rtl' ? -row.scrollWidth : row.scrollWidth; } catch (_) {}
    }
  };

  setItems(items);
  host.prepend(el);
  return {
    el,
    setItems,
    keys: () => list.map((o) => o.k),
    count: () => list.length,
    close: () => { if (closed) return; closed = true; el.remove(); },
  };
}
