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
 *   reply: { sender, address, text },  // §8-GATED (#25): quoted strip — render
 *                             // ONLY behind the reply capability handshake
 *   onReplyClick,             // tap on the quote → shell scrolls to original
 *   edited: false,            // §8-GATED (#25): "edited" marker in the meta
 *   onLinkClick(url),         // URLs in text render as link BUTTONS (never
 *                             // real <a> — no default-nav/middle-click bypass
 *                             // of the shell's external-link warning)
 *   linkPreview: { url, title, domain, image }, // §8-GATED: P2P has no server
 *                             // to unfurl — the SENDER composes the preview
 *                             // into the message (Signal-style), bridge carries it
 *   strings
 * })
 */
import { icon } from './icons.js';
import { createAvatar, hashHue } from './avatar.js';
import { createStatusIcon } from './chatlist-item.js';
import { dayBucketLabel, docLocale } from './timestamp.js';

function bubbleTime(d) {
  return d.toLocaleTimeString(docLocale(), { hour: '2-digit', minute: '2-digit' });
}

/* linkify (Damir 2026-07-03): URLs become BUTTONS routed through onLinkClick
   (the shell's existing external-link warning) — XSS-safe, DOM-built, no
   innerHTML; trailing sentence punctuation stays text. */
const URL_RE = /https?:\/\/[^\s<>"']+/g;

/* emoji-only detection (Damir 2026-07-03): 1–3 emoji and nothing else render
   BIG with the meta dropped below. Covers ZWJ sequences, skin tones, VS16. */
const EMOJI_ONLY_RE = /^(?:\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})*(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})*)*\s*){1,3}$/u;
function linkifyInto(parent, text, onLinkClick) {
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    let url = m[0];
    const trail = url.match(/[.,!?;:]+$/);
    if (trail) url = url.slice(0, url.length - trail[0].length);
    // unbalanced closing parens are sentence punctuation: "(see https://x.com)"
    while (url.endsWith(')') &&
           (url.split('(').length < url.split(')').length)) url = url.slice(0, -1);
    if (!url) continue;
    parent.append(text.slice(last, m.index));
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-bubble__link';
    b.textContent = url;
    if (onLinkClick) b.addEventListener('click', () => onLinkClick(url));
    parent.append(b);
    last = m.index + url.length;
  }
  parent.append(text.slice(last));
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
  reply = null,
  onReplyClick = null,
  edited = false,
  onLinkClick = null,
  linkPreview = null,
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
  if (text && EMOJI_ONLY_RE.test(text.trim())) el.dataset.emojiOnly = ''; // big emoji, meta below (Damir 2026-07-03)

  // sender label: group chats, first bubble of a group, identity-hued (premium).
  // Hash key mirrors createAvatar's (address || name) so label + avatar agree.
  if (sender && (position === 'first' || position === 'single')) {
    const s = document.createElement('span');
    s.className = 'c-bubble__sender';
    s.textContent = sender;
    s.style.setProperty('--sender-h', hashHue(address || name || sender));
    el.append(s);
  }

  // reply quote (batch 3b, §8-gated #25 — bridge has no reply yet): identity-
  // hued strip above the text; the quote itself is shell-supplied (sender +
  // excerpt), tap = scroll-to-original (shell duty via onReplyClick)
  if (reply && (reply.text || reply.sender)) {
    const q = document.createElement(onReplyClick ? 'button' : 'div');
    q.className = 'c-bubble__reply';
    if (onReplyClick) {
      q.type = 'button';
      q.addEventListener('click', onReplyClick);
      q.setAttribute('aria-label',
        (strings.replyTo || 'Show replied message') + (reply.sender ? ' — ' + reply.sender : ''));
    }
    q.style.setProperty('--reply-h', hashHue(reply.address || reply.sender || ''));
    if (reply.sender) {
      const qs = document.createElement('span');
      qs.className = 'c-bubble__reply-sender';
      qs.textContent = reply.sender;
      q.append(qs);
    }
    const qt = document.createElement('span');
    qt.className = 'c-bubble__reply-text';
    qt.textContent = reply.text || '';
    q.append(qt);
    el.append(q);
  }

  const body = document.createElement('span');
  body.className = 'c-bubble__text';
  linkifyInto(body, text, onLinkClick); // plain text appends untouched
  el.append(body);

  // link preview card (§8-GATED — sender-composed payload, P2P can't unfurl)
  if (linkPreview && (linkPreview.title || linkPreview.domain)) {
    const lp = document.createElement(onLinkClick ? 'button' : 'div');
    lp.className = 'c-bubble__linkpreview';
    if (onLinkClick) {
      lp.type = 'button';
      lp.addEventListener('click', () => onLinkClick(linkPreview.url));
    }
    if (linkPreview.image) {
      const img = document.createElement('img');
      img.className = 'c-bubble__linkpreview-img';
      img.src = linkPreview.image;
      img.alt = '';
      lp.append(img);
    }
    const col = document.createElement('span');
    col.className = 'c-bubble__linkpreview-info';
    if (linkPreview.title) {
      const t = document.createElement('span');
      t.className = 'c-bubble__linkpreview-title';
      t.textContent = linkPreview.title;
      col.append(t);
    }
    if (linkPreview.domain) {
      const d2 = document.createElement('span');
      d2.className = 'c-bubble__linkpreview-domain';
      d2.textContent = linkPreview.domain;
      col.append(d2);
    }
    lp.append(col);
    el.append(lp);
  }

  const meta = document.createElement('span');
  meta.className = 'c-bubble__meta u-tabular';
  if (edited) { // §8-gated (#25) — "edited" precedes the time, WhatsApp-style
    const ed = document.createElement('span');
    ed.className = 'c-bubble__edited';
    ed.textContent = strings.edited || 'edited';
    meta.append(ed);
  }
  if (timestamp != null) {
    const d = new Date(timestamp);
    if (!isNaN(d)) { // audit r2: one malformed bridge ts crashed the whole render
      const t = document.createElement('time');
      t.setAttribute('datetime', d.toISOString());
      t.textContent = bubbleTime(d);
      meta.append(t);
    }
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
    // audit r2: double-activation re-emitted the resend before the shell could
    // swap the row — resend stays repeatable, so guard re-entry (no hard latch);
    // circle + caption share one guard so tapping both can't double-fire either
    let lastRetry = 0;
    const retryGuarded = onRetry ? ((e) => {
      const t = Date.now();
      if (t - lastRetry < 500) return;
      lastRetry = t;
      onRetry(e);
    }) : null;
    if (retryGuarded) retry.addEventListener('click', retryGuarded);
    const line = document.createElement('div');
    line.className = 'c-bubble-line'; // retry hugs the bubble (Damir 2026-07-03)
    line.append(retry, el);
    const stack = document.createElement('div');
    stack.className = 'c-bubble-stack';
    stack.append(line);
    const note = document.createElement('span');
    note.className = 'c-bubble-failnote';
    note.textContent = strings.notDelivered || 'Not delivered · Tap to retry';
    if (retryGuarded) note.addEventListener('click', retryGuarded);
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
