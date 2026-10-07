/**
 * c-msend — ★ S9 (#1244 S = C): the PHOTO PREVIEW SHEET after a pick / a camera shot / a paste. C# prepared the batch
 * (bounded decode, rotation, ≤ 2048 px, JPEG q82, NO metadata) and pushed `mediaPicked(batchId, json)`; the shell
 * validated every item and opens this sheet. The sheet shows the thumbnails (C#'s own ≤ 64 KB data: JPEGs — the only
 * sink is <img src>), a ✕ per photo, the count title ("3 photos" / "1 photo"), the honest note ("Location removed ·
 * resized"), a caption field (≤ CAPTION_MAX characters) and the Send disc.
 *
 * openMediaSendSheet({ host, items, strings, onSend, onCancel }) → sheet | null
 *   items    — [{ k, thumb }] in pick order (the shell vetted them: k = "0".."9", thumb = a base64 JPEG data: URI)
 *   onSend(keys, caption) — keys = the KEPT item keys in their order; caption = the trimmed field text ('' = none)
 *   onCancel() — every other way out: the ✕ on the LAST photo, the scrim, Esc, Back, a closeMediaSendSheet().
 *   Exactly ONE of onSend / onCancel runs per sheet (a latch), so C# hears one answer for one batch.
 * closeMediaSendSheet(sheet) — the shell's own close (a peer switch, a newer batch) → onCancel.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { overlayId } from './overlay.js';

export const MEDIA_CAPTION_MAX = 4096;   // C# refuses a longer caption after decode (CONTRACT §1b)

export function openMediaSendSheet({ host, items = [], strings = getStrings(), onSend, onCancel } = {}) {
  const list = Array.isArray(items) ? items.filter((it) => it && it.k != null).slice(0, 10) : [];   // ★ #46 M3: a thumb-less item is a glyph tile
  if (!list.length) return null;
  let answered = false;
  const answer = (fn) => { if (answered) return false; answered = true; if (fn) { try { fn(); } catch (_) {} } return true; };

  const root = document.createElement('div');
  root.className = 'c-msend';
  const head = document.createElement('div');
  head.className = 'c-msend__head';
  const title = document.createElement('h2');
  title.className = 'c-msend__title';
  const note = document.createElement('span');
  note.className = 'c-msend__note';
  note.textContent = strings.photoSendNote || 'Location removed · resized';
  head.append(title, note);

  const grid = document.createElement('div');
  grid.className = 'c-msend__grid';
  grid.setAttribute('role', 'list');

  const capRow = document.createElement('div');
  capRow.className = 'c-msend__foot';
  const cap = document.createElement('textarea');
  cap.className = 'c-msend__caption';
  cap.rows = 1;
  cap.maxLength = MEDIA_CAPTION_MAX;
  cap.placeholder = strings.addCaption || 'Add a caption…';
  cap.setAttribute('aria-label', strings.caption || 'Caption');
  cap.dataset.autofocus = '';   // a keyboard open lands in the caption (a touch open focuses the sheet itself — overlay.js, no keyboard pop)
  const send = document.createElement('button');
  send.type = 'button';
  send.className = 'c-msend__send';
  send.append(icon('send-2', { size: 22 }));
  capRow.append(cap, send);
  root.append(head, grid, capRow);

  const kept = list.map((it) => String(it.k));
  const sheet = createSheet({
    content: root, host,
    strings: { ...strings, sheet: strings.photoPreview || 'Photo preview' },
    onDismiss: () => { answer(onCancel); },
  });
  sheet.classList.add('c-sheet--msend');
  sheet.removeAttribute('aria-label');
  title.id = overlayId('c-msend-title');
  sheet.setAttribute('aria-labelledby', title.id);

  const relabel = () => {
    const n = kept.length;
    title.textContent = n === 1 ? (strings.photoCountOne || '1 photo')
      : (strings.photoCountMany || '{n} photos').split('{n}').join(String(n));
    send.setAttribute('aria-label', n === 1 ? (strings.sendPhotoOne || 'Send 1 photo')
      : (strings.sendPhotoMany || 'Send {n} photos').split('{n}').join(String(n)));
    grid.dataset.count = String(n);
    let i = 0;
    for (const cell of grid.children) {
      i += 1;
      const x = cell.querySelector('.c-msend__remove');
      if (x) x.setAttribute('aria-label', (strings.removePhotoN || 'Remove photo {n}').split('{n}').join(String(i)));
    }
  };

  for (const it of list) {
    const key = String(it.k);
    const cell = document.createElement('div');
    cell.className = 'c-msend__cell';
    cell.setAttribute('role', 'listitem');
    cell.dataset.k = key;
    let img;
    if (it.thumb) {
      img = document.createElement('img');
      img.className = 'c-msend__img';
      img.alt = '';
      img.src = String(it.thumb);   // the shell's FILE_THUMB_RE-vetted data: JPEG — the one sink
    } else {
      img = document.createElement('span');   // ★ #46 M3: C# made no preview — the photo glyph; the photo still goes
      img.className = 'c-msend__img c-msend__glyph';
      img.setAttribute('aria-hidden', 'true');
      img.append(icon('photo', { size: 28 }));
    }
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'c-msend__remove';
    x.append(icon('x', { size: 16 }));
    x.addEventListener('click', () => {
      const at = kept.indexOf(key);
      if (at === -1) return;
      if (kept.length === 1) { closeSheet(sheet); return; }   // ✕ on the last photo = cancel the batch (onDismiss)
      kept.splice(at, 1);
      const next = cell.nextElementSibling || cell.previousElementSibling;
      cell.remove();
      relabel();
      const f = next && next.querySelector('.c-msend__remove');
      if (f) f.focus({ preventScroll: true });   // focus never falls to the body
    });
    cell.append(img, x);
    grid.append(cell);
  }
  relabel();

  /* the caption field grows with its text up to ~5 lines, then scrolls */
  const grow = () => {
    cap.style.height = 'auto';
    cap.style.height = Math.min(cap.scrollHeight || 0, 120) + 'px';
  };
  cap.addEventListener('input', grow);
  const doSend = () => {
    if (!kept.length) return;
    const text = cap.value.trim().slice(0, MEDIA_CAPTION_MAX);
    const keys = kept.slice();
    if (!answer(() => { if (onSend) onSend(keys, text); })) return;
    closeSheet(sheet);
  };
  send.addEventListener('click', doSend);
  cap.addEventListener('keydown', (e) => {
    /* desktop: Enter sends, Shift+Enter is a new line (the composer's grammar); touch keyboards keep Enter = new line */
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && document.documentElement.hasAttribute('data-desktop')) {
      e.preventDefault();
      doSend();
    }
  });

  openSheet(sheet);
  return sheet;
}

export function closeMediaSendSheet(sheet) {
  if (sheet && sheet.isConnected) closeSheet(sheet);
}
