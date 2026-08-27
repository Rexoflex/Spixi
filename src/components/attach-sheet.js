/**
 * c-attach — composer ⊕ attach sheet (#87①, Damir interview 2026-07-03):
 * TILE GRID on c-sheet (creation verbs scan better as tiles; still the same
 * overlay stack). Bridge-real actions: file / pay / request / app invite.
 * Photo + GIF are DESIGNED-IN but FEATURE-FLAGGED (`media: false`) until the
 * BE image standard lands (#81) — the #64 voice-flag precedent.
 *
 * TITLE-LESS since 2026-08-12 (Damir): "Share" was wrong for a grid that sends
 * a file / payment / request / app invite INTO the chat. `strings.attachTitle`
 * is now the sheet's ARIA name only — see the createSheet call.
 *
 * openAttachSheet({ host, media = false, apps = true, payments = true,
 *                   onAction, strings }) → sheet
 *   onAction(id) — 'file' | 'photo' | 'gif' | 'pay' | 'request' | 'app'
 *   (shell routes: sendfile / sendmedia / payment intent / app invite)
 *   media    — #81 flag: reveals Photo + GIF (BE image standard).
 *   apps     — gate the App-invite tile: no single chat-invite verb exists on
 *              every host (SingleChatPage has none), so the shell can hide it.
 *   payments — gate Pay + Request: 1:1 only (C# rejects them in groups/bots).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';

const ATTACH_ACTIONS = [
  { id: 'file', glyph: 'file-isr', label: 'Send file', key: 'sendFile', flag: 'files' },
  { id: 'photo', glyph: 'photo', label: 'Photo', key: 'photo', flag: 'media' },
  { id: 'gif', glyph: 'gif', label: 'GIF', key: 'gif', flag: 'media' },
  { id: 'pay', glyph: 'arrow-up-right', label: 'Send payment', key: 'sendPayment', flag: 'payments' },
  { id: 'request', glyph: 'arrow-down-left', label: 'Request payment', key: 'requestPayment', flag: 'payments' },
  { id: 'app', glyph: 'rocket', label: 'App invite', key: 'appInvite', flag: 'apps' },
];

/* `files` defaults TRUE — every existing caller keeps its tile without a change, and a
   surface that cannot send files says so explicitly. Legacy had no file capability in a
   blind group and the C# still refuses one there; offering the tile anyway was a control
   that reported an outcome it did not cause. */
export function openAttachSheet({ host, media = false, apps = true, payments = true, files = true, onAction, strings = getStrings() } = {}) {
  const grid = document.createElement('div');
  grid.className = 'c-attach';
  const enabled = { media, apps, payments, files };

  for (const a of ATTACH_ACTIONS) {
    if (a.flag && !enabled[a.flag]) continue; // #81 media flag / apps gate (voice-flag precedent #64)
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

  /* TITLE: none (Damir 2026-08-12 — "it's titled Share, that's incorrect").
   * Nothing here is sharing: the tiles SEND things into this conversation (a
   * file, a payment, a payment request, an app invite), and no single noun
   * covers all four without lying ("Attach" is file-only, "Send" mis-describes
   * Request). WhatsApp/Telegram/iMessage all ship this grid title-less — the ⊕
   * that opened it plus six labelled tiles are the whole affordance, and a
   * heading only steals a sheet row. The dialog still needs an ACCESSIBLE name,
   * so attachTitle lives on as c-sheet's aria-label fallback ("Add to chat" —
   * the one honest umbrella for all six). */
  const sheet = createSheet({
    content: grid, host,
    strings: { ...strings, sheet: strings.attachTitle || 'Add to chat' },
  });
  openSheet(sheet);
  return sheet;
}
