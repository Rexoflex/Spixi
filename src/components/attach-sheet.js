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
 *   files    — gate Send file: C# refuses a file in a bot room and in a blind group.
 *
 * ★★ AN EMPTY SHEET DOES NOT OPEN (#46 loop, MAJOR-2). In a bot room every flag is
 * false, so every tile is filtered out. The sheet opened with no tiles, no title and
 * no text. That is a control that reports an outcome it did not cause.
 * `attachTilesFor` is the ONE predicate. This file uses it to refuse to open. The
 * shell uses it to hide the composer ⊕. Do not write that rule a second time.
 * Two copies can drift, and a drift shows a ⊕ that opens nothing.
 *
 * ⚠ THE FLAG DEFAULTS FAIL OPEN (round 2). An absent flag takes the default below, and
 * three of the four defaults are TRUE. That is deliberate: every caller passes a PARTIAL
 * object and must keep its tiles. It also means this module cannot protect a caller that
 * does not yet know its room. A caller that has no answer must pass an EXPLICIT false for
 * every gate. The chat shell does exactly that: `attachFlags()` writes its room-known test
 * into all four flags, so a room whose type has not arrived yields no tile and no ⊕.
 * Do not read a missing flag as "no".
 *
 * ★★ `attachTilesFor` IS ALSO THE ACTION GATE (round 3). The chat shell calls it a
 * second time when a tile is TAPPED, and drops the action when the tapped id is no
 * longer in the list. A sheet can outlive the answer it was built from: the room type
 * can arrive while the sheet is open. So the same list decides what is DRAWN and what
 * is DONE. Keep this function pure and cheap for that reason — it runs on every tap as
 * well as on every open, and it must never be given a side effect.
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

/* ★★ THE ONE PREDICATE — which tiles survive the gates.
   `openAttachSheet` and the chat shell both call this. The shell hides the composer ⊕
   when the list is empty. This file refuses to open an empty sheet. One rule, two
   users, no drift.
   Each default matches the `openAttachSheet` signature below. A caller can pass a
   partial object. An absent flag takes the default. */
export function attachTilesFor(flags) {
  const f = flags || {};
  const enabled = {
    media: f.media === undefined ? false : !!f.media,
    apps: f.apps === undefined ? true : !!f.apps,
    payments: f.payments === undefined ? true : !!f.payments,
    files: f.files === undefined ? true : !!f.files,
  };
  return ATTACH_ACTIONS.filter((a) => !a.flag || enabled[a.flag]);
}

/* True when at least one tile survives. Use this to show or hide the ⊕. */
export function hasAttachTiles(flags) { return attachTilesFor(flags).length > 0; }

/* `files` defaults TRUE — every existing caller keeps its tile without a change, and a
   surface that cannot send files says so explicitly. Legacy had no file capability in a
   blind group and the C# still refuses one there; offering the tile anyway was a control
   that reported an outcome it did not cause. */
export function openAttachSheet({ host, media = false, apps = true, payments = true, files = true, onAction, strings = getStrings() } = {}) {
  const tiles = attachTilesFor({ media, apps, payments, files });
  /* ★★ NO TILE, NO SHEET. A sheet with no tile explains nothing and does nothing.
     The shell keeps the ⊕ hidden for the same condition, so this path is the belt.
     The caller must accept null. */
  if (!tiles.length) return null;

  const grid = document.createElement('div');
  grid.className = 'c-attach';

  for (const a of tiles) {
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
