/**
 * Typed message cards (Figma: payment-request 11305:6344 · payment-card
 * 11303:6488 · app-card 11306:6596 · call-card 11306:7095 · file-bubble
 * 11309:9877/9922) + c-unread-divider (frontend-only — per-message `read`
 * flags, DECISIONS #70). Bridge contracts: addPaymentRequest (14-arg),
 * updatePaymentRequestStatus, addFile/updateFile (13-arg), addAppRequest
 * (13-arg), addCall — ARCHITECTURE.md §4.
 * File progress/failed states + reaction/tip variants are code-first gap
 * fills (#66) in the card language.
 * SHELL NOTES: bridge `status` text arrives C#-localized — derive the status
 * ENUM from statusIcon / the :/:: answered-prefix, display text via strings.
 * Group-chat sender identity on payment cards (nick/avatar args) is a flagged
 * gap (#66) — cards render identity-less pending a design.
 */
import { icon } from './icons.js';
import { createButton } from './button.js';
import { createBadge } from './badge.js';

function cardTime(ts) {
  const locale = document.documentElement.lang || undefined;
  return new Date(ts).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** Card scaffold: row (direction-aligned) → card → header(title+time) + body slots. */
function card(direction, title, timestamp, modifier) {
  const row = document.createElement('div');
  row.className = 'c-bubble-row';
  row.dataset.direction = direction;
  row.dataset.position = 'single';
  const el = document.createElement('div');
  el.className = 'c-tcard';
  if (modifier) el.dataset.kind = modifier;
  const head = document.createElement('div');
  head.className = 'c-tcard__head';
  const t = document.createElement('span');
  t.className = 'c-tcard__title';
  t.textContent = title;
  head.append(t);
  if (timestamp != null) {
    const time = document.createElement('time');
    time.className = 'c-tcard__time u-tabular';
    time.setAttribute('datetime', new Date(timestamp).toISOString());
    time.textContent = cardTime(timestamp);
    head.append(time);
  }
  el.append(head);
  row.append(el);
  return { row, el };
}

function actionsRow(...buttons) {
  const r = document.createElement('div');
  r.className = 'c-tcard__actions';
  for (const b of buttons) if (b) { b.dataset.width = 'full'; r.append(b); }
  return r;
}

function detailsLink(onDetails, strings) {
  const wrap = document.createElement('div');
  wrap.className = 'c-tcard__details';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'c-tcard__details-btn';
  btn.append(document.createTextNode(strings.details || 'Details'), icon('chevron-right', { size: 16 }));
  if (onDetails) btn.addEventListener('click', onDetails);
  wrap.append(btn);
  return wrap;
}

/**
 * Payment card — covers incoming/outgoing requests AND direct payments.
 * role: 'request-in' (Pay/Decline) · 'request-out' (Cancel request) ·
 *       'sent' · 'received'
 * status: 'actionable' | 'pending' | 'processing' | 'failed' | 'completed' |
 *         'declined' | 'canceled'
 */
export function createPaymentBubble({
  role = 'request-in',
  amount = '',            // pre-formatted (bridge sends strings)
  fiat = '',
  status = 'actionable',
  insufficient = false,   // request-in: Pay disabled + caption
  timestamp = null,
  onPay, onDecline, onCancel, onRetry, onDetails,
  strings = {},
} = {}) {
  // peer-initiated events sit on the received side (audit MAJOR: 'received' was right-aligned)
  const direction = (role === 'request-in' || role === 'received') ? 'received' : 'sent';
  const titles = {
    'request-in': strings.paymentRequest || 'Payment request',
    'request-out': strings.youRequested || 'You requested',
    sent: status === 'failed' ? (strings.paymentFailed || 'Payment failed') : (strings.paymentSent || 'Payment sent'),
    received: strings.paymentReceived || 'Payment received',
  };
  const { row, el } = card(direction, titles[role], timestamp, 'payment');
  row.dataset.status = status;

  const amountEl = document.createElement('div');
  amountEl.className = 'c-tcard__amount u-tabular';
  amountEl.dataset.tone =
    status === 'completed' ? (String(amount).startsWith('+') ? 'positive' : 'neutral')
    : (status === 'declined' || status === 'canceled' || status === 'failed') ? 'void'
    : 'pending';
  amountEl.append(document.createTextNode(amount + ' '));
  const unit = document.createElement('span');
  unit.className = 'c-tcard__unit';
  unit.textContent = 'IXI';
  amountEl.append(unit);
  el.append(amountEl);

  if (fiat) {
    const f = document.createElement('div');
    f.className = 'c-tcard__fiat u-tabular';
    if (status === 'declined' || status === 'canceled' || status === 'failed') f.dataset.tone = 'void';
    f.textContent = fiat;
    el.append(f);
  }

  const BADGES = {
    pending: ['warning', strings.pending || 'Pending', 'clock-hour-10'],
    failed: ['error', strings.failed || 'Failed', 'alert-square-rounded'],
    completed: ['success', strings.completed || 'Completed', 'check'],
    declined: ['error', strings.declined || 'Declined', 'cancel'],
    canceled: ['info', strings.canceled || 'Canceled', 'circle-x'],
  };
  if (BADGES[status]) {
    const [type, label, glyph] = BADGES[status];
    const wrap = document.createElement('div');
    wrap.className = 'c-tcard__badge';
    wrap.append(createBadge({ type, weight: 'tonal', label, icon: glyph }));
    el.append(wrap);
  }

  if (role === 'request-in' && (status === 'actionable' || status === 'processing' || status === 'failed')) {
    const decline = createButton({ label: strings.decline || 'Decline', type: 'outline', size: 32, onClick: onDecline, disabled: status === 'processing' });
    const pay = status === 'failed'
      ? createButton({ label: strings.retry || 'Retry', type: 'fill', size: 32, icon: icon('rotate-clockwise-2', { size: 16 }), onClick: onRetry })
      : createButton({ label: strings.pay || 'Pay', type: 'fill', size: 32, icon: icon('check', { size: 16 }), onClick: onPay, disabled: insufficient, loading: status === 'processing' });
    el.append(actionsRow(decline, pay));
    if (insufficient) {
      const note = document.createElement('div');
      note.className = 'c-tcard__note';
      note.textContent = strings.insufficient || 'Insufficient balance to pay.';
      el.append(note);
    }
  } else if (role === 'request-out' && status === 'pending') {
    el.append(actionsRow(createButton({ label: strings.cancelRequest || 'Cancel request', type: 'outline', size: 32, onClick: onCancel })));
  } else if (role === 'sent' && status === 'failed') {
    el.append(actionsRow(createButton({ label: strings.retry || 'Retry', type: 'fill', size: 32, icon: icon('rotate-clockwise-2', { size: 16 }), onClick: onRetry })));
  } else if (status === 'completed' || ((role === 'sent' || role === 'received') && status === 'pending')) {
    el.append(detailsLink(onDetails, strings));
  }
  return row;
}

/** App session card (Figma app-card): invite/invited/missing/in-session/ended. */
export function createAppBubble({
  name = '',
  iconUrl = null,
  state = 'invite',        // invite (them→you) | invited (you→them) | missing | in-session | ended
  direction = null,        // override — bridge knows localSender (audit)
  timestamp = null,
  onJoin, onDecline, onLaunch, onCancel, onGet, onEnd, onResume,
  strings = {},
} = {}) {
  const dir = direction || (state === 'invited' ? 'sent' : 'received');
  // header follows the session lifecycle (audit: "App invite" was stale post-join)
  const title = (state === 'in-session' || state === 'ended')
    ? (strings.appSession || 'App session')
    : (strings.appInvite || 'App invite');
  const { row, el } = card(dir, title, timestamp, 'app');

  const id = document.createElement('div');
  id.className = 'c-tcard__app';
  const ic = document.createElement('span');
  ic.className = 'c-tcard__app-icon';
  if (iconUrl) {
    const img = document.createElement('img');
    img.src = iconUrl;
    img.alt = '';
    ic.append(img);
  } else {
    ic.append(icon('rocket', { size: 24 }));
  }
  const col = document.createElement('span');
  col.className = 'c-tcard__app-info';
  const nm = document.createElement('span');
  nm.className = 'c-tcard__app-name';
  nm.textContent = name;
  const sub = document.createElement('span');
  sub.className = 'c-tcard__app-sub';
  sub.textContent = {
    invite: strings.invitedYou || 'Invited you to join',
    invited: strings.youInvited || 'You have sent an invite',
    missing: strings.invitedYou || 'Invited you to join',
    'in-session': strings.inSession || 'In session',
    ended: strings.sessionEnded || 'Session ended',
  }[state];
  col.append(nm, sub);
  id.append(ic, col);
  el.append(id);

  if (state === 'invite') {
    el.append(actionsRow(
      createButton({ label: strings.decline || 'Decline', type: 'outline', size: 32, onClick: onDecline }),
      createButton({ label: strings.join || 'Join', type: 'fill', size: 32, icon: icon('check', { size: 16 }), onClick: onJoin }),
    ));
  } else if (state === 'invited') {
    el.append(actionsRow(
      createButton({ label: strings.cancel || 'Cancel', type: 'outline', size: 32, onClick: onCancel }),
      createButton({ label: strings.launchApp || 'Launch app', type: 'fill', size: 32, icon: icon('rocket', { size: 16 }), onClick: onLaunch }),
    ));
  } else if (state === 'missing') {
    el.append(actionsRow(createButton({ label: strings.getApp || 'Get app', type: 'fill', size: 32, icon: icon('download', { size: 16 }), onClick: onGet })));
  } else if (state === 'in-session') {
    el.append(actionsRow(
      createButton({ label: strings.endSession || 'End session', type: 'outline', size: 32, onClick: onEnd }),
      createButton({ label: strings.resume || 'Resume', type: 'fill', size: 32, icon: icon('player-play', { size: 16 }), onClick: onResume }),
    ));
  }
  return row;
}

/** Call event card (Figma call-card): normal + missed. */
export function createCallBubble({
  missed = false,
  direction = 'received',  // bridge knows localSender (audit)
  directionLabel = '',     // "Outgoing" / "Incoming" (SL)
  duration = '',           // "4:12"
  timestamp = null,
  onCallBack,
  strings = {},
} = {}) {
  const { row, el } = card(direction,
    missed ? (strings.missedCall || 'Missed voice call') : (strings.voiceCall || 'Voice call'),
    timestamp, 'call');
  if (missed) row.dataset.missed = '';
  const head = el.querySelector('.c-tcard__title');
  head.insertAdjacentElement('afterbegin', icon(missed ? 'phone-off' : 'phone', { size: 18 }));

  if (missed) {
    const sub = document.createElement('button');
    sub.type = 'button';
    sub.className = 'c-tcard__call-back';
    sub.textContent = strings.tapToCallBack || 'Tap to call back';
    if (onCallBack) sub.addEventListener('click', onCallBack);
    el.append(sub);
  } else {
    const meta = document.createElement('div');
    meta.className = 'c-tcard__call-meta u-tabular';
    meta.textContent = directionLabel + (duration ? ' · ' + duration : '');
    el.append(meta);
    const wrap = detailsLink(onCallBack, { details: strings.callBack || 'Call back' });
    el.append(wrap);
  }
  return row;
}

/** File transfer bubble (Figma compact style; progress/failed = gap fill #66).
 *  state: 'offer' (incoming, accept) | 'progress' (0-100) | 'complete' | 'failed' */
export function createFileBubble({
  direction = 'received',
  name = '',
  meta = '',               // "PDF · 2.4 MB" (composed by shell)
  state = 'complete',
  progress = 0,
  timestamp = null,
  onAccept, onOpen, onRetry,
  strings = {},
} = {}) {
  const row = document.createElement('div');
  row.className = 'c-bubble-row';
  row.dataset.direction = direction;
  row.dataset.position = 'single';
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'c-fbubble';
  el.dataset.state = state;
  // progress state has no click action (audit: "Open" on an unopenable transfer)
  const act = state === 'offer' ? onAccept : state === 'failed' ? onRetry : state === 'complete' ? onOpen : null;
  if (act) el.addEventListener('click', act);
  else if (state === 'progress') el.disabled = true;
  el.setAttribute('aria-label',
    (state === 'offer' ? (strings.download || 'Download')
      : state === 'failed' ? (strings.retry || 'Retry')
      : state === 'progress' ? (strings.downloading || 'Downloading')
      : (strings.open || 'Open'))
    + ' ' + name);

  const ic = document.createElement('span');
  ic.className = 'c-fbubble__icon';
  ic.append(icon(state === 'failed' ? 'rotate-clockwise-2' : state === 'offer' ? 'download' : 'file-isr', { size: 20 }));
  el.append(ic);

  const col = document.createElement('span');
  col.className = 'c-fbubble__info';
  const nm = document.createElement('span');
  nm.className = 'c-fbubble__name';
  nm.textContent = name;
  const mt = document.createElement('span');
  mt.className = 'c-fbubble__meta';
  mt.textContent = state === 'failed' ? (strings.transferFailed || 'Transfer failed · Tap to retry') : meta;
  col.append(nm, mt);
  if (state === 'progress') {
    const track = document.createElement('span');
    track.className = 'c-fbubble__track';
    track.setAttribute('role', 'progressbar'); // audit: transfers were silent to AT
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(Math.max(0, Math.min(100, progress))));
    const fill = document.createElement('span');
    fill.className = 'c-fbubble__fill';
    fill.style.width = Math.max(0, Math.min(100, progress)) + '%';
    track.append(fill);
    col.append(track);
  }
  el.append(col);

  if (timestamp != null) {
    const time = document.createElement('time');
    time.className = 'c-fbubble__time u-tabular';
    time.setAttribute('datetime', new Date(timestamp).toISOString());
    time.textContent = cardTime(timestamp);
    el.append(time);
  }
  row.append(el);
  return row;
}

/** Update a progress-state file bubble in place (bridge updateFile).
 *  opts.meta refreshes the caption; progress ≥ 100 (or opts.state) flips
 *  the bubble to its final state (audit: 100% bar stayed "Downloading"). */
export function setFileProgress(rowEl, progress, opts = {}) {
  const p = Math.max(0, Math.min(100, progress));
  const fill = rowEl.querySelector('.c-fbubble__fill');
  if (fill) fill.style.width = p + '%';
  const track = rowEl.querySelector('.c-fbubble__track');
  if (track) track.setAttribute('aria-valuenow', String(p));
  const metaEl = rowEl.querySelector('.c-fbubble__meta');
  if (metaEl && opts.meta) metaEl.textContent = opts.meta;
  const bubble = rowEl.querySelector('.c-fbubble');
  const finalState = opts.state || (p >= 100 ? 'complete' : null);
  if (bubble && finalState && bubble.dataset.state !== finalState) {
    bubble.dataset.state = finalState;
    bubble.disabled = false;
    if (track) track.remove();
  }
}

/** Full-width "Unread messages" divider (Damir 2026-07-03; frontend-only). */
export function createUnreadDivider(strings = {}) {
  const el = document.createElement('div');
  el.className = 'c-unread-divider';
  el.setAttribute('role', 'separator');
  const label = document.createElement('span');
  label.textContent = strings.unreadMessages || 'Unread messages';
  el.append(label);
  return el;
}
