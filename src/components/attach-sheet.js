/**
 * c-attach — composer ⊕ attach sheet (#87①, Damir interview 2026-07-03):
 * TILE GRID on c-sheet (creation verbs scan better as tiles; still the same
 * overlay stack). Bridge-real actions: file / pay / request / app invite.
 * Photo + GIF are DESIGNED-IN but FEATURE-FLAGGED (`media: false`) until the
 * BE image standard lands (#81) — the #64 voice-flag precedent.
 *
 * openAttachSheet({ host, media = false, onAction, strings }) → sheet
 *   onAction(id) — 'file' | 'photo' | 'gif' | 'pay' | 'request' | 'app'
 *   (shell routes: sendfile / sendmedia / payment intent / app invite)
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';

const ATTACH_ACTIONS = [
  { id: 'file', glyph: 'file-isr', label: 'Send file', key: 'sendFile' },
  { id: 'photo', glyph: 'photo', label: 'Photo', key: 'photo', flagged: true },
  { id: 'gif', glyph: 'gif', label: 'GIF', key: 'gif', flagged: true },
  { id: 'pay', glyph: 'arrow-up-right', label: 'Send payment', key: 'sendPayment' },
  { id: 'request', glyph: 'arrow-down-left', label: 'Request payment', key: 'requestPayment' },
  { id: 'app', glyph: 'rocket', label: 'App invite', key: 'appInvite' },
];

export function openAttachSheet({ host, media = false, onAction, strings = getStrings() } = {}) {
  const grid = document.createElement('div');
  grid.className = 'c-attach';

  for (const a of ATTACH_ACTIONS) {
    if (a.flagged && !media) continue; // #81 media flag (voice-flag precedent #64)
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'c-attach__tile';
    const med = document.createElement('span');
    med.className = 'c-attach__medallion';
    med.setAttribute('aria-hidden', 'true');
    med.append(icon(a.glyph, { size: 22 }));
    const label = document.createElement('span');
    label.className = 'c-attach__label';
    label.textContent = strings[a.key] || a.label;
    tile.append(med, label);
    tile.addEventListener('click', () => {
      closeSheet(sheet);
      if (onAction) onAction(a.id);
    });
    grid.append(tile);
  }

  const sheet = createSheet({ title: strings.attachTitle || 'Share', content: grid, host, strings });
  openSheet(sheet);
  return sheet;
}
