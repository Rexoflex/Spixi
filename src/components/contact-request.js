/**
 * c-contact-request — incoming contact-request row in the Chats list (step 3;
 * spec §5). Promotes the app-frame inline block into a real component. Rendered
 * at the top of the list for pending requests. Decline fires onDecline
 * SINGLE-CLICK (⑩/#266 — the confirm modal was dropped: declines are
 * reversible, confirms are for the irreversible); Accept fires onAccept(row).
 * EITHER action SPENDS the whole card (Q1 review, #267 loop): both buttons are
 * disabled before the callback runs, so a card that survives its own verb (the
 * chat shell's pane outlives the async C# page-pop) can't fire the OTHER verb on
 * a friend the first one already resolved/removed. The
 * #109 STAGED HANDSHAKE (step 6): the caller latches the Accept button via
 * setRequestAccepting(row) — "Accepting…" loading — then transitions the request
 * into a handshaking chat; entry unblocks only on the bridge handshake-complete
 * signal. Non-contacts keep composer disabled downstream (#86, shell duty).
 *
 * createContactRequest({ name, nick, address, avatar, timestamp, strings, host,
 *                        onAccept, onDecline }) → row element
 * setRequestAccepting(row, strings) — latch Accept to "Accepting…" (loading).
 */
import { getStrings } from './strings-runtime.js';
import { createAvatar } from './avatar.js';
import { createButton, setLoading } from './button.js';
import { formatChatTimestamp } from './timestamp.js';
import { icon } from './icons.js';

/** Middle-truncate a long address for display (keeps head + tail). */
function crDisplayAddress(addr) {
  const s = String(addr || '');
  return s.length > 14 ? s.slice(0, 6) + '…' + s.slice(-4) : s;
}

export function createContactRequest({ name = '', nick = '', address = '', avatar = null, timestamp, strings = getStrings(), host, onAccept, onDecline } = {}) {
  // #211 address-display canon: a raw address is NEVER shown in full on a chat
  // surface. A request friend's nick/name often DEFAULTS to its own address (no
  // custom name yet) — treat a name that IS the address as "no name" and
  // middle-truncate, matching the chat-list rows / bubble sender labels.
  const realName = (nick && nick !== address) ? nick : (name && name !== address) ? name : '';
  const display = realName || crDisplayAddress(address);

  const row = document.createElement('div');
  row.className = 'c-contact-request';
  row.dataset.kind = 'request';

  // photo if present, else deterministic hue off the ADDRESS (identity-stable);
  // initials only from a REAL name (else the user glyph, avatar.js).
  row.append(createAvatar({ src: avatar, name: realName, address, size: 48 }));

  const body = document.createElement('div');
  body.className = 'c-contact-request__body';
  const nameEl = document.createElement('span');
  nameEl.className = 'c-contact-request__name';
  nameEl.textContent = display;                      // user data → textContent (XSS-safe)
  const sub = document.createElement('span');
  sub.className = 'c-contact-request__sub';
  sub.textContent = strings.wantsToConnect || 'Wants to connect';
  body.append(nameEl, sub);

  const actions = document.createElement('div');
  actions.className = 'c-contact-request__actions';
  const declineLabel = strings.decline || 'Decline';
  const acceptLabel = strings.accept || 'Accept';
  // ⑩ (#266): Decline is SINGLE-CLICK — the confirm modal is gone. Damir F5'd
  // the two-step as a bug; a decline is reversible (the peer can simply send
  // another request), and confirms are reserved for actions that can't be
  // undone (delete-chat/-contact keep theirs). One-shot: disable on fire so a
  // list re-flush can't double-emit the verb from a stale row.
  // Q1 review (#267 loop): the ONE-SHOT is CARD-WIDE, not button-wide. Disabling
  // only the button that fired left the other one live on a card that survives
  // the verb (the chat shell's request pane isn't removed until C# pops the page,
  // asynchronously) — a Decline (ixian:undorequest → removeFriend) followed by a
  // tap on the still-live Accept fired ixian:accept → sendAcceptAdd on a friend
  // that no longer exists, and vice-versa. Either action now SPENDS the card.
  let decline, accept;
  const spend = () => {
    if (decline) decline.disabled = true;
    if (accept) accept.disabled = true;
  };
  decline = createButton({
    label: declineLabel, type: 'outline', size: 32,
    onClick: () => { spend(); if (onDecline) onDecline(); },
  });
  decline.dataset.decline = '';
  decline.setAttribute('aria-label', declineLabel + ' ' + display);
  accept = createButton({
    label: acceptLabel, type: 'fill', size: 32, icon: icon('check', { size: 16 }),
    // spend BEFORE the callback: onAccept may synchronously call setRequestAccepting,
    // whose setLoading() sees an already-disabled button, keeps it disabled (button.js
    // only restores what IT disabled) and still paints the "Accepting…" spinner.
    onClick: () => { spend(); if (onAccept) onAccept(row); },
  });
  accept.dataset.accept = '';
  accept.setAttribute('aria-label', acceptLabel + ' ' + display);
  actions.append(decline, accept);
  body.append(actions);
  row.append(body);

  const time = document.createElement('span');
  time.className = 'c-contact-request__time u-tabular';
  time.textContent = formatChatTimestamp(timestamp, strings);
  row.append(time);

  return row;
}

/** Latch the Accept button into "Accepting…" loading (staged handshake, #109);
 *  Decline is disabled while accepting. The row is then transitioned into a
 *  handshaking chat by the shell (acceptContactRequest). */
export function setRequestAccepting(row, strings = getStrings()) {
  const btn = row && row.querySelector('[data-accept]');
  if (!btn) return;
  const accepting = strings.accepting || 'Accepting…';
  const label = btn.querySelector('.c-button__label');
  if (label) label.textContent = accepting;
  btn.setAttribute('aria-label', accepting);       // keep SR label in sync with the visible state
  setLoading(btn, true);
  const decline = row.querySelector('[data-decline]');
  if (decline) decline.disabled = true;
}
