/**
 * c-bubble — chat message bubble (Figma message-bubble 11288:4442; DECISIONS
 * #63 grouping, #14 width rule). Core text variant; typed bubbles (payment/
 * file/app/call), reactions and reply rendering arrive in later batches —
 * markup is extension-ready. Bridge: addMe/addThem 11-arg contract (§4).
 *
 * createMessageBubble({
 *   direction: 'sent' | 'received',
 *   position: 'single' | 'first' | 'middle' | 'last',   // grouping (#63)
 *   text, timestamp,
 *   status: 'sending'|'sent'|'delivered'|'read'|'failed',// sent only
 *   sender,                   // group chats: name label on first-of-group
 *   showAvatar, name, address, avatar,                   // received groups: on last-of-group
 *   onRetry,                  // failed sent messages: retry circle + caption tap
 *   strings
 * })
 */
import { icon } from './icons.js';
import { createAvatar, hashHue } from './avatar.js';
import { createStatusIcon } from './chatlist-item.js';
import { dayBucketLabel } from './timestamp.js';

function bubbleTime(ts) {
  const locale = document.documentElement.lang || undefined;
  return new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function createMessageBubble({
  direction = 'received',
  position = 'single',
  text = '',
  timestamp = null,
  status = null,
  sender = null,
  showAvatar = false,
  name = '',
  address = '',
  avatar = null,
  onRetry = null,
  strings = {},
} = {}) {
  // row wrapper: aligns bubble + optional avatar gutter (received groups)
  const row = document.createElement('div');
  row.className = 'c-bubble-row';
  row.dataset.direction = direction;
  row.dataset.position = position;

  if (direction === 'received' && (showAvatar || sender !== null)) {
    const gutter = document.createElement('span');
    gutter.className = 'c-bubble-row__gutter';
    // avatar renders once per group, bottom-aligned on the LAST bubble;
    // other rows keep the gutter width so bubbles align
    if (showAvatar && (position === 'last' || position === 'single')) {
      gutter.append(createAvatar({ src: avatar, name, address, size: 24 }));
    }
    row.append(gutter);
  }

  const el = document.createElement('div');
  el.className = 'c-bubble';

  // sender label: group chats, first bubble of a group, identity-hued (premium).
  // Hash key mirrors createAvatar's (address || name) so label + avatar agree.
  if (sender && (position === 'first' || position === 'single')) {
    const s = document.createElement('span');
    s.className = 'c-bubble__sender';
    s.textContent = sender;
    s.style.setProperty('--sender-h', hashHue(address || name || sender));
    el.append(s);
  }

  const body = document.createElement('span');
  body.className = 'c-bubble__text';
  body.textContent = text; // linkify + external-link confirm modal: later batch (flagged)
  el.append(body);

  const meta = document.createElement('span');
  meta.className = 'c-bubble__meta u-tabular';
  if (timestamp != null) {
    const t = document.createElement('time');
    t.setAttribute('datetime', new Date(timestamp).toISOString());
    t.textContent = bubbleTime(timestamp);
    meta.append(t);
  }
  if (direction === 'sent' && status) {
    const st = createStatusIcon(status);
    if (st) {
      st.setAttribute('width', 14);
      st.setAttribute('height', 14);
      // announce delivery state (audit: glyphs were aria-hidden = invisible to SRs)
      st.removeAttribute('aria-hidden');
      st.setAttribute('role', 'img');
      st.setAttribute('aria-label', strings['status-' + status] || status);
      meta.append(st);
    }
  }
  if (meta.childNodes.length) el.append(meta);

  // failed sent message (Damir 2026-07-03, r2): clean bubble — retry circle
  // hugging it + red "Not delivered" caption carry the error (both retry-able).
  // data-failed drives the width rule in css.
  if (direction === 'sent' && status === 'failed') {
    row.dataset.failed = '';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'c-bubble-retry';
    retry.setAttribute('aria-label', strings.retry || 'Retry sending');
    retry.append(icon('rotate-clockwise-2', { size: 16 }));
    if (onRetry) retry.addEventListener('click', onRetry);
    const line = document.createElement('div');
    line.className = 'c-bubble-line'; // retry hugs the bubble (Damir 2026-07-03)
    line.append(retry, el);
    const stack = document.createElement('div');
    stack.className = 'c-bubble-stack';
    stack.append(line);
    const note = document.createElement('span');
    note.className = 'c-bubble-failnote';
    note.textContent = strings.notDelivered || 'Not delivered · Tap to retry';
    if (onRetry) note.addEventListener('click', onRetry);
    stack.append(note);
    row.append(stack);
    return row;
  }

  row.append(el);
  return row;
  // NOTE: mount messages inside a container with role="log" (chat shell duty)
}

/** Day separator (design: centered pill). Shares the day-bucket ladder with
 *  the chat list (timestamp.js) — today → strings.today. */
export function createDateSeparator(ts, strings = {}, now = Date.now()) {
  const el = document.createElement('div');
  el.className = 'c-datesep';
  el.setAttribute('role', 'separator');
  const pill = document.createElement('span');
  pill.className = 'c-datesep__pill';
  pill.textContent = dayBucketLabel(ts, strings, now, strings.today || 'Today');
  el.append(pill);
  return el;
}
