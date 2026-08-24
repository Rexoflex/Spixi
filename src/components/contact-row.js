/**
 * c-contact-row — ONE contact-row grammar for the money pickers (★ W-j, Damir
 * F5 2026-08-23: "the Send/Receive rows look smaller than the Contacts directory
 * rows"). The anatomy is the Contacts DIRECTORY row (contacts-shell pickerRow):
 * avatar-48 (with the online dot) + name + the #211 truncated address sub-line,
 * 64px min-height, the same padding and gap. Receive keeps its trailing
 * multi-select circle (W9); Send rows are plain tap-to-pick.
 *
 * Why a builder and not only CSS: three screens drifted because each built its
 * own row. Now Send and Receive call this one function; contacts-shell keeps its
 * pickerRow (the smoke test keys on `.c-contacts__row` in 15+ places — #537), and a
 * cascade-aware smoke pin holds the two stylesheets to the SAME numbers.
 *
 * createContactRow({ contact, strings, select, checked, className, onClick })
 *   contact  { name?, address, avatar?, online?, pending?, isGroup? }
 *   select   false → a plain button row (Send)
 *            'checkbox' → role=checkbox + aria-checked + the trailing circle (Receive)
 *   checked  initial aria-checked for select rows
 *   className  extra surface class(es) — base.css / pressable.js key on them
 *   onClick  the tap handler (the caller patches aria-checked itself)
 * → <button class="c-contact-row …">
 *
 * Free fns: contactDisplayName(c) — nick, else the middle-truncated address
 *           (the #276/#279 echo class: name === address is NOT a nick).
 *           setContactRowChecked(row, on)
 */
import { getStrings } from './strings-runtime.js';
import { createAvatar, truncateAddressMiddle } from './avatar.js';
import { createBadge } from './badge.js';
import { icon } from './icons.js';

function rowHasNick(c) { return !!c.name && c.name !== c.address; }

/** Nick when present; else the #211 middle-truncated address (9…6, directory canon). */
export function contactDisplayName(c) {
  if (!c) return '';
  if (rowHasNick(c)) return c.name;
  return c.address ? truncateAddressMiddle(c.address, 9, 6) : (c.name || '');
}

/** The directory sub-line: truncated address under a nick; "Address-only contact" otherwise. */
export function contactSubLine(c, strings = getStrings()) {
  if (!c) return '';
  if (rowHasNick(c)) return truncateAddressMiddle(c.address, 9, 6);
  return strings.addressOnly || 'Address-only contact';
}

export function createContactRow({
  contact = {}, strings = getStrings(), select = false, checked = false, className = '', onClick,
} = {}) {
  const c = contact || {};
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'c-contact-row' + (className ? ' ' + className : '');
  if (c.pending) row.dataset.pending = '';
  // loop r1 m4/m10 — the directory's F2/C9 rule, carried: in SELECT mode a row
  // that cannot be a target is DISABLED and says why on its sub-line. Address-less
  // rows would collapse onto one Set key (F2); a pending contact cannot receive
  // (the #275/#301 fake-delivery class). Plain (Send) rows keep #255: pickable.
  const blocked = !c.address || (select === 'checkbox' && c.pending);   // loop r2 R2-4: address-less is blocked in BOTH forms
  if (blocked) { row.disabled = true; row.dataset.blocked = ''; }

  row.append(createAvatar({
    src: c.avatar || null, name: c.name || '', address: c.address || '', size: 48,
    online: !!c.online, group: !!c.isGroup,
  }));

  const col = document.createElement('span');
  col.className = 'c-contact-row__col';
  const name = document.createElement('span');
  name.className = 'c-contact-row__name';
  name.textContent = contactDisplayName(c);
  const sub = document.createElement('span');
  sub.className = 'c-contact-row__sub';
  sub.textContent = (blocked && c.pending) ? (strings.noGroupPending || 'Can’t be added until they accept')
    : (blocked && !c.address) ? (strings.noAddressYet || 'No address yet')          // loop r3 n3: a blocked row says why
      : contactSubLine(c, strings);
  col.append(name, sub);
  row.append(col);

  if (c.pending) {
    // #255: the honest "request pending" signal — still pickable on Send (money
    // goes to the address, not the friendship). Badge grammar = the directory's.
    const badge = createBadge({ label: strings.requestSent || 'Request sent', type: 'warning', weight: 'tonal' });
    badge.classList.add('c-contact-row__badge');
    row.append(badge);
    row.setAttribute('aria-label', contactDisplayName(c) + ', ' + (strings.contactPendingLabel || 'request sent')
      + (blocked ? ', ' + (strings.noGroupPending || 'Can’t be added until they accept') : ''));
  }

  if (select === 'checkbox') {
    row.setAttribute('role', 'checkbox');
    row.setAttribute('aria-checked', String(!!checked && !blocked));
    const check = document.createElement('span');
    check.className = 'c-contact-row__check';
    check.setAttribute('aria-hidden', 'true');
    check.append(icon('check', { size: 16 }));
    row.append(check);
  }

  if (onClick && !blocked) row.addEventListener('click', onClick);
  return row;
}

/** Patch a select row's checked state IN PLACE (no re-render → focus stays on the row). */
export function setContactRowChecked(row, on) {
  if (row) row.setAttribute('aria-checked', String(!!on));
  return row;
}

/** The "Send to an address" row: the same anatomy with a glyph disc in the avatar slot. */
export function createGlyphRow({ glyph = 'qrcode', label = '', className = '', onClick } = {}) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'c-contact-row' + (className ? ' ' + className : '');
  const disc = document.createElement('span');
  disc.className = 'c-contact-row__glyph';
  disc.append(icon(glyph, { size: 22 }));
  const col = document.createElement('span');
  col.className = 'c-contact-row__col';
  const name = document.createElement('span');
  name.className = 'c-contact-row__name';
  name.textContent = label;
  col.append(name);
  row.append(disc, col);
  if (onClick) row.addEventListener('click', onClick);
  return row;
}
