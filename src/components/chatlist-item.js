/**
 * Chat list row family (docs/chat-list-spec.md): c-indicator, c-status-icon,
 * c-excerpt, c-chatlist-item. Bridge contract: addChat(...) — ARCHITECTURE.md §4.
 * All factories accept an optional `strings` dict (per-shell window.SL,
 * ARCHITECTURE.md §7); English defaults inline.
 */
import { icon } from './icons.js';
import { createAvatar } from './avatar.js';
import { formatChatTimestamp } from './timestamp.js';

/** Cap counts for compact badges/indicators (shared with c-bottomnav). */
export function formatCount(n) {
  return n > 99 ? '99+' : String(n);
}

/* —— status icon (§2): sending/sent neutral · delivered muted (bubble: green) · read accent · failed error —— */
const STATUS = {
  sending: { glyph: 'clock-hour-10', tone: 'neutral' },
  sent: { glyph: 'check', tone: 'neutral' },
  delivered: { glyph: 'checks', tone: 'delivered' },
  read: { glyph: 'checks', tone: 'read' },
  failed: { glyph: 'alert-small', tone: 'failed' },
};
export function createStatusIcon(status) {
  const s = STATUS[status];
  if (!s) return null;
  const el = icon(s.glyph, { size: 16 });
  el.classList.add('c-status-icon');
  el.dataset.tone = s.tone;
  return el;
}

/* —— indicator (§4, #108): count · count-muted · muted (bell-off) · mention
   (plain `at` GLYPH, action ink, NO circle — a distinct shape from numeric
   count circles, Damir 2026-07-03; can coexist with a count) —— */
export function createIndicator({ count = 0, mention = false, muted = false, strings = {} } = {}) {
  const el = document.createElement('span');
  el.className = 'c-indicator';
  if (mention) {
    el.dataset.variant = 'mention';
    el.append(icon('at', { size: 14 }));
    el.setAttribute('aria-label', strings.mention || 'mention');
  } else if (count > 0) {
    el.dataset.variant = muted ? 'count-muted' : 'count';
    el.textContent = formatCount(count);
    el.setAttribute('aria-label', count + ' ' + (strings.unread || 'unread'));
  } else if (muted) {
    el.dataset.variant = 'muted';
    el.append(icon('bell-off', { size: 12 }));
    el.setAttribute('aria-label', strings.muted || 'muted');
  } else return null;
  return el;
}

/** Indicator set for row2: muted chats show BOTH the (muted) count/@ AND the
 *  bell-off glyph (Damir review 2026-07-02). #108: mention and count COEXIST
 *  (distinct shapes — @ glyph + count circle). [] when nothing to show. */
export function createIndicators({ count = 0, mention = false, muted = false, strings = {} } = {}) {
  const out = [];
  if (mention) out.push(createIndicator({ mention: true, strings }));
  if (count > 0) out.push(createIndicator({ count, muted, strings }));
  if (muted) out.push(createIndicator({ muted: true, strings }));
  return out;
}

/* —— excerpt (§5): type → optional 16px glyph + toned text parts —— */
const EXCERPT_GLYPHS = {
  file: 'file-isr', gif: 'gif', call: 'phone', 'call-missed': 'phone-off',
  payment: 'wallet', 'app-invite': 'apps', draft: 'pencil',
};
export function createExcerpt({ type = 'text', text = '', sender = null, strings = {} } = {}) {
  const el = document.createElement('span');
  el.className = 'c-excerpt';
  el.dataset.type = type;
  const glyph = EXCERPT_GLYPHS[type];
  if (glyph) el.append(icon(glyph, { size: 16 }));
  if (sender) {
    const s = document.createElement('span');
    s.className = 'c-excerpt__sender';
    s.textContent = sender + ': ';
    el.append(s);
  }
  const t = document.createElement('span');
  t.className = 'c-excerpt__text';
  if (type === 'draft') {
    const prefix = document.createElement('span');
    prefix.className = 'c-excerpt__draft';
    prefix.textContent = strings.draft || 'Draft: ';
    t.append(prefix);
    t.append(document.createTextNode(text));
  } else if (type === 'mention' && text.includes('@')) {
    // highlight the first @token
    const i = text.indexOf('@');
    const end = text.indexOf(' ', i);
    const stop = end === -1 ? text.length : end;
    t.append(document.createTextNode(text.slice(0, i)));
    const m = document.createElement('span');
    m.className = 'c-excerpt__mention';
    m.textContent = text.slice(i, stop);
    t.append(m, document.createTextNode(text.slice(stop)));
  } else {
    t.textContent = text;
  }
  el.append(t);
  return el;
}

/* —— chat list row (§1, §6) —— */
export function createChatItem({
  name, address = '', avatar = null, online = false,
  timestamp, status = null, pinned = false,
  unread = 0, mention = false, muted = false,
  excerpt = { type: 'text', text: '' },
  selected = false, onClick, strings = {},
} = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'c-chatlist-item';
  if (unread > 0 || mention) el.dataset.unread = '';
  // 'true' = selected list row (vs 'page' on bottomnav — a nav destination)
  if (selected) el.setAttribute('aria-current', 'true');

  el.append(createAvatar({ src: avatar, name, address, size: 48, online }));

  const content = document.createElement('span');
  content.className = 'c-chatlist-item__content';
  const nameEl = document.createElement('span');
  nameEl.className = 'c-chatlist-item__name';
  nameEl.textContent = name || address;
  content.append(nameEl, createExcerpt({ ...excerpt, strings }));
  el.append(content);

  const right = document.createElement('span');
  right.className = 'c-chatlist-item__right';
  const row1 = document.createElement('span');
  row1.className = 'c-chatlist-item__meta';
  const statusEl = createStatusIcon(status);
  if (statusEl) row1.append(statusEl);
  if (pinned) row1.append(icon('pin', { size: 16 }));
  if (timestamp != null) {
    const time = document.createElement('span');
    time.className = 'c-chatlist-item__time u-tabular';
    time.textContent = formatChatTimestamp(timestamp, strings);
    time.dataset.ts = timestamp;
    row1.append(time);
  }
  right.append(row1);
  const inds = createIndicators({ count: unread, mention, muted, strings });
  if (inds.length) {
    const row2 = document.createElement('span');
    row2.className = 'c-chatlist-item__indicators';
    row2.append(...inds);
    right.append(row2);
  }
  el.append(right);

  if (onClick) el.addEventListener('click', onClick);
  return el;
}

/** Refresh all rendered timestamps (call from startTimestampTicker);
 *  pass the same `strings` the rows were built with. */
export function refreshTimestamps(rootEl, strings = {}) {
  for (const t of rootEl.querySelectorAll('.c-chatlist-item__time[data-ts]')) {
    t.textContent = formatChatTimestamp(Number(t.dataset.ts), strings);
  }
}
