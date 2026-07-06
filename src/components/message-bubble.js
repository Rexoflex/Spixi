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
 *   onSenderClick,            // group chats (#99): label + avatar become BUTTONS
 *                             // → member sheet (identity verification; blind
 *                             // groups simply don't pass it)
 *   onRetry,                  // failed sent messages: retry circle + caption tap
 *   reply: { sender, address, text,    // §8-GATED (#25): quoted strip — render
 *            kind, thumb },   // ONLY behind the reply capability handshake.
 *                             // kind: 'gif'|'image'|'file'|'payment'|'call'|'voice'
 *                             // → glyph chip in the quote; thumb (data-URI,
 *                             // shell-composed) replaces the glyph for media
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
import { getStrings } from './strings-runtime.js';
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

/* reply-quote kind identifiers (Damir 2026-07-03): glyph per original type,
   label fallback when the shell sends no excerpt text */
const REPLY_KIND_GLYPHS = {
  gif: 'photo', image: 'photo', file: 'file-isr',
  payment: 'wallet', call: 'phone', voice: 'microphone', app: 'rocket',
};
function REPLY_KIND_LABELS(kind, strings = getStrings()) {
  return {
    gif: 'GIF',
    image: strings.image || 'Image',
    file: strings.file || 'File',
    payment: strings.payment || 'Payment',
    call: strings.call || 'Voice call',
    voice: strings.voiceMessage || 'Voice message',
    app: strings.app || 'App',
  }[kind] || '';
}

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
  onSenderClick = null,
  onRetry = null,
  reply = null,
  onReplyClick = null,
  edited = false,
  onLinkClick = null,
  linkPreview = null,
  strings = getStrings(),
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
      const av = createAvatar({ src: avatar, name, address, size: 24 });
      if (onSenderClick) { // #99: avatar opens the member sheet too
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'c-bubble-row__avatar-btn';
        b.setAttribute('aria-label', (strings.viewMember || 'View member') + (name ? ' — ' + name : ''));
        b.addEventListener('click', onSenderClick);
        b.append(av);
        gutter.append(b);
      } else {
        gutter.append(av);
      }
    }
    row.append(gutter);
  }

  const el = document.createElement('div');
  el.className = 'c-bubble';
  if (text && EMOJI_ONLY_RE.test(text.trim())) el.dataset.emojiOnly = ''; // big emoji, meta below (Damir 2026-07-03)

  // sender label: group chats, first bubble of a group, identity-hued (premium).
  // Hash key mirrors createAvatar's (address || name) so label + avatar agree.
  if (sender && (position === 'first' || position === 'single')) {
    // #99: tappable when onSenderClick is wired (member sheet); blind groups
    // don't pass the callback → plain span
    const s = document.createElement(onSenderClick ? 'button' : 'span');
    s.className = 'c-bubble__sender';
    if (onSenderClick) {
      s.type = 'button';
      s.addEventListener('click', onSenderClick);
    }
    s.textContent = sender;
    s.style.setProperty('--sender-h', hashHue(address || name || sender));
    el.append(s);
  }

  // reply quote (batch 3b, §8-gated #25 — bridge has no reply yet): identity-
  // hued strip above the text; the quote itself is shell-supplied (sender +
  // excerpt + kind/thumb), tap = scroll-to-original (shell duty via onReplyClick)
  if (reply && (reply.text || reply.sender || reply.kind)) {
    const q = document.createElement(onReplyClick ? 'button' : 'div');
    q.className = 'c-bubble__reply';
    if (onReplyClick) {
      q.type = 'button';
      q.addEventListener('click', onReplyClick);
      q.setAttribute('aria-label',
        (strings.replyTo || 'Show replied message') + (reply.sender ? ' — ' + reply.sender : ''));
    }
    q.style.setProperty('--reply-h', hashHue(reply.address || reply.sender || ''));
    // media/typed originals show a small identifier (Damir 2026-07-03):
    // shell-composed thumb (data-URI) for media, kind glyph otherwise
    if (reply.thumb) {
      const th = document.createElement('img');
      th.className = 'c-bubble__reply-thumb';
      th.src = reply.thumb;
      th.alt = '';
      q.append(th);
    } else if (reply.kind && REPLY_KIND_GLYPHS[reply.kind]) {
      const g = document.createElement('span');
      g.className = 'c-bubble__reply-glyph';
      g.setAttribute('aria-hidden', 'true');
      g.append(icon(REPLY_KIND_GLYPHS[reply.kind], { size: 16 }));
      q.append(g);
    }
    const info = document.createElement('span');
    info.className = 'c-bubble__reply-info';
    if (reply.sender) {
      const qs = document.createElement('span');
      qs.className = 'c-bubble__reply-sender';
      qs.textContent = reply.sender;
      info.append(qs);
    }
    const qt = document.createElement('span');
    qt.className = 'c-bubble__reply-text';
    qt.textContent = reply.text || REPLY_KIND_LABELS(reply.kind, strings);
    info.append(qt);
    q.append(info);
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
    retry.setAttribute('aria-label', strings.retry || 'Retry');
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

/* —— IN-PLACE UPDATERS (DECISIONS #86: bridge updateMessage/deleteMessage get
   surgical DOM updates — no full re-render, no flicker, scroll stays put).
   #44 free-fn convention. —— */

/** Bridge updateMessage → status tick (sending/sent/delivered/read) on a SENT
 *  row. 'failed' restructures the row (retry circle + caption) — the shell
 *  re-creates via createMessageBubble({status:'failed'}) and replaces. */
export function setMessageStatus(row, status, strings = getStrings()) {
  if (status === 'failed') {
    console.warn('setMessageStatus: "failed" restructures the row — re-create it via createMessageBubble and replace');
    return;
  }
  const st = row.querySelector('.c-bubble__meta .c-status-icon');
  if (!st) return; // received rows / no meta — nothing to tick
  const next = createStatusIcon(status);
  if (!next) return;
  next.setAttribute('width', 14);
  next.setAttribute('height', 14);
  next.removeAttribute('aria-hidden');
  next.setAttribute('role', 'img');
  next.setAttribute('aria-label', strings['status-' + status] || status);
  st.replaceWith(next);
}

/** Bridge deleteMessage → remove the row AND repair #63 grouping around it:
 *  the group's head passes its sender label down, the tail passes its avatar
 *  up, and neighbor corner radii re-derive from data-position. */
export function removeMessage(row) {
  const pos = row.dataset.position;
  const dir = row.dataset.direction;
  const isGroupRow = (el, positions) =>
    !!el && el.classList && el.classList.contains('c-bubble-row') &&
    el.dataset.direction === dir && positions.includes(el.dataset.position);

  if (pos === 'first') {
    const next = row.nextElementSibling;
    if (isGroupRow(next, ['middle', 'last'])) {
      next.dataset.position = next.dataset.position === 'middle' ? 'first' : 'single';
      // heir inherits the group head: sender label (group chats) moves down,
      // keeping its identity hue (--sender-h travels with the element)
      const label = row.querySelector('.c-bubble__sender');
      const heir = next.querySelector('.c-bubble');
      if (label && heir && !heir.querySelector('.c-bubble__sender')) heir.prepend(label);
    }
  } else if (pos === 'last') {
    const prev = row.previousElementSibling;
    if (isGroupRow(prev, ['first', 'middle'])) {
      prev.dataset.position = prev.dataset.position === 'middle' ? 'last' : 'single';
      // avatar renders on the last-of-group — it moves up to the new tail
      // (firstElementChild: may be the bare avatar OR its #99 button wrap)
      const av = row.querySelector('.c-bubble-row__gutter')?.firstElementChild;
      const prevGutter = prev.querySelector('.c-bubble-row__gutter');
      if (av && prevGutter && !prevGutter.childNodes.length) prevGutter.append(av);
    }
  }
  // middle: [first, middle*, last] stays contiguous — no repair needed
  row.remove();
}

/** Day separator (design: centered pill). Shares the day-bucket ladder with
 *  the chat list (timestamp.js) — today → strings.today. */
export function createDateSeparator(ts, strings = getStrings(), now = Date.now()) {
  const el = document.createElement('div');
  el.className = 'c-datesep';
  el.setAttribute('role', 'separator');
  const pill = document.createElement('span');
  pill.className = 'c-datesep__pill';
  pill.textContent = dayBucketLabel(ts, strings, now, strings.today || 'Today');
  el.append(pill);
  return el;
}
