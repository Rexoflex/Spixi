/**
 * c-contact-request — incoming contact-request row in the Chats list (step 3;
 * spec §5). Promotes the app-frame inline block into a real component. Rendered
 * at the top of the list for pending requests. Decline routes through the
 * c-modal confirm (Cancel autofocused, APG); Accept fires onAccept(row) — the
 * #109 staged handshake latch lands in step 6. Non-contacts keep composer
 * disabled downstream (#86, shell duty).
 *
 * createContactRequest({ name, nick, address, avatar, timestamp, strings, host,
 *                        onAccept, onDecline }) → row element
 */
import { createAvatar } from './avatar.js';
import { createButton } from './button.js';
import { createModal, openModal } from './modal.js';
import { formatChatTimestamp } from './timestamp.js';
import { icon } from './icons.js';

/** Middle-truncate a long address for display (keeps head + tail). */
function crDisplayAddress(addr) {
  const s = String(addr || '');
  return s.length > 14 ? s.slice(0, 6) + '…' + s.slice(-4) : s;
}

export function createContactRequest({ name = '', nick = '', address = '', avatar = null, timestamp, strings = {}, host, onAccept, onDecline } = {}) {
  const display = nick || name || crDisplayAddress(address);

  const row = document.createElement('div');
  row.className = 'c-contact-request';
  row.dataset.kind = 'request';

  // photo if present, else deterministic hue off the ADDRESS (identity-stable)
  row.append(createAvatar({ src: avatar, name: nick || name, address, size: 48 }));

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
  const decline = createButton({
    label: declineLabel, type: 'outline', size: 32,
    onClick: () => openModal(createModal({
      title: strings.declineTitle || 'Decline request?',
      body: (strings.declineBody || '{name} won’t be notified, and can send another request later.').split('{name}').join(display),
      role: 'alertdialog', host,
      actions: [
        { label: strings.cancel || 'Cancel', type: 'text', autofocus: true },   // safe action focused (APG)
        { label: declineLabel, type: 'fill', intent: 'destructive', onClick: () => { if (onDecline) onDecline(); } },
      ],
    })),
  });
  // name the requester so SRs hear "Accept <who>" (Label-in-Name preserved)
  decline.setAttribute('aria-label', declineLabel + ' ' + display);
  const accept = createButton({
    label: acceptLabel, type: 'fill', size: 32, icon: icon('check', { size: 16 }),
    onClick: () => { if (onAccept) onAccept(row); },
  });
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
