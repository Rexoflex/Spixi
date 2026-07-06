/**
 * c-channels — bot-chat channel selector sheet (#86 bot surface). Bot chat =
 * a big group chat (Damir): the topbar identity is TAPPABLE (createTopbar
 * onIdentity) and opens this sheet; picking a channel re-renders the
 * conversation (shell duty — bridge setSelectedChannel).
 * Bridge: addChannelToSelector / setSelectedChannel / setChannelSelectorStatus
 * — the shell aggregates those into the `channels` list passed at open.
 *
 * openChannelSheet({ host, channels: [{ id, name, status, unread, selected }],
 *                    onSelect, strings }) → sheet
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { createIndicator } from './chatlist-item.js';

export function openChannelSheet({ host, channels = [], onSelect, strings = getStrings() } = {}) {
  const list = document.createElement('div');
  list.className = 'c-channels';
  // freeze audit: NO list/listitem roles — role=listitem on a <button>
  // replaces its button semantics for SRs (a column of buttons in a dialog
  // needs no list wrapper)

  for (const ch of channels) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'c-channels__row';
    if (ch.selected) row.setAttribute('aria-current', 'true');

    const hash = document.createElement('span');
    hash.className = 'c-channels__hash';
    hash.setAttribute('aria-hidden', 'true');
    hash.textContent = '#';
    row.append(hash);

    const info = document.createElement('span');
    info.className = 'c-channels__info';
    const name = document.createElement('span');
    name.className = 'c-channels__name';
    name.textContent = ch.name || '';
    info.append(name);
    if (ch.status) {
      const st = document.createElement('span');
      st.className = 'c-channels__status';
      st.textContent = ch.status; // bridge setChannelSelectorStatus (C#-composed)
      info.append(st);
    }
    row.append(info);

    if (ch.unread) row.append(createIndicator({ count: ch.unread, strings }));
    if (ch.selected) {
      const check = icon('check', { size: 18 });
      check.classList.add('c-channels__check');
      row.append(check);
    }

    row.addEventListener('click', () => {
      closeSheet(sheet);
      if (onSelect) onSelect(ch.id);
    });
    list.append(row);
  }

  const sheet = createSheet({ title: strings.channels || 'Channels', content: list, host, strings });
  openSheet(sheet);
  return sheet;
}
