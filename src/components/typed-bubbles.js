/**
 * Typed message cards (Figma: payment-request 11305:6344 · payment-card
 * 11303:6488 · app-card 11306:6596 · call-card 11306:7095 · file-bubble
 * 11309:9877/9922) + c-unread-divider (frontend-only — per-message `read`
 * flags, DECISIONS #70). Bridge contracts: addPaymentRequest (14-arg; a
 * payment status-updater API is a flagged §9 gap — the shell re-renders the
 * card for now), addFile/updateFile (13-arg), addAppRequest (13-arg),
 * addCall — ARCHITECTURE.md §4.
 * File progress/failed states + reaction/tip variants are code-first gap
 * fills (#66) in the card language.
 * SHELL NOTES: bridge `status` text arrives C#-localized — derive the status
 * ENUM from statusIcon / the :/:: answered-prefix, display text via strings.
 * Group-chat sender identity on payment cards (nick/avatar args) is a flagged
 * gap (#66) — cards render identity-less pending a design.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { safeImageSrc, identityIndex } from './avatar.js';
import { createButton } from './button.js';
import { createBadge } from './badge.js';
import { docLocale, timeOpts, formatFileSize, formatFileSizeOf } from './timestamp.js';   // ★ S20 Q (#1376): + the size line
import { createStatusIcon } from './chatlist-item.js';   // ★ #1028 (P.22): the SENT file's tick — the text bubble's glyph set
import { formatIxiAmount } from './money.js';   // #143: shared money module (was defined here)
import { createMediaBubble, setMediaSrc } from './media-bubble.js';   // ★ A5 #1124 (#1133): an image FILE renders on the c-mbubble tile

function cardTime(d) {
  return d.toLocaleTimeString(docLocale(), timeOpts());   // ★ Session I: the device's 12/24-hour setting
}

let tcardNoteUid = 0; // aria-describedby ids for insufficient-balance notes (C15)

/* payment rows remember their creation opts so setPaymentStatus can re-render
   the card IN PLACE (DECISIONS #86: bridge updateTransactionStatus /
   updatePaymentRequestStatus get surgical updates, and the re-render releases
   the audit-r2 one-shot latch by construction — fresh card, fresh buttons) */
const paymentOpts = new WeakMap();

function actionsRow(...buttons) {
  const r = document.createElement('div');
  r.className = 'c-tcard__actions';
  for (const b of buttons) if (b) { b.dataset.width = 'full'; r.append(b); }
  return r;
}

/* Action guards (audit r2): a double-activation on Pay/Join/etc. re-fired the
   callback before the shell could re-render the card — real money hazard on
   the payment path. STATE-CHANGING actions latch: the pressed button disables
   itself and the bridge-driven re-render replaces the card (shell contract).
   REPEATABLE actions (Retry/Open/Launch/Details/Call back) must stay usable,
   so they only guard against rapid re-entry. */
function oneShot(fn) {
  if (!fn) return undefined;
  return (e) => {
    const btn = e.currentTarget;
    if (btn.disabled || btn.dataset.acted !== undefined) return;
    btn.dataset.acted = '';
    btn.disabled = true;
    fn(e);
  };
}
function reentryGuard(fn) {
  if (!fn) return undefined;
  let last = 0;
  return (e) => {
    const now = Date.now();
    if (now - last < 500) return;
    last = now;
    fn(e);
  };
}

function timeEl(timestamp) {
  if (timestamp == null) return null;
  const d = new Date(timestamp);
  if (isNaN(d)) return null;
  const t = document.createElement('time');
  t.className = 'c-tcard__time u-tabular';
  t.setAttribute('datetime', d.toISOString());
  t.textContent = cardTime(d);
  return t;
}
function amountTone(status, amount) {
  return status === 'completed' ? (String(amount).startsWith('+') ? 'positive' : 'neutral')
    : (status === 'declined' || status === 'canceled' || status === 'failed') ? 'void'
    : 'pending';
}
/* The row scaffold: row (direction-aligned) → card. gutter (r2 backlog C8): group chats indent received TEXT bubbles by
   an avatar gutter — received cards take the same empty gutter so columns align. `layout` (optional) names the card's
   grammar: 'stack' = the S20 payment bubble · 'compact' = the #996 pill (settled app cards) and the #1006 call row. */
function cardShell(direction, modifier, layout, gutter) {
  const row = document.createElement('div');
  row.className = 'c-bubble-row';
  row.dataset.direction = direction;
  row.dataset.position = 'single';
  if (gutter && direction === 'received') {
    const g = document.createElement('span');
    g.className = 'c-bubble-row__gutter';
    row.append(g);
  }
  const el = document.createElement('div');
  el.className = 'c-tcard';
  if (modifier) el.dataset.kind = modifier;
  if (layout) el.dataset.layout = layout;
  row.append(el);
  return { row, el };
}
/* #996 COMPACT pill (settled app cards — the payment pill is retired by S20 J1): medallion · small label over a large
 * value · the time at the line's end. When `onOpen` exists the WHOLE pill is one button (a stretched hit layer). */
function compactMain({ glyph, iconEl, label, valueEl, subEl, timestamp, onOpen, openLabel }) {
  const main = document.createElement('div');
  main.className = 'c-tcard__main';
  const med = iconEl || document.createElement('span');
  med.classList.add('c-tcard__medallion');
  med.setAttribute('aria-hidden', 'true');
  if (!iconEl) med.append(icon(glyph, { size: 20 }));
  const col = document.createElement('span');
  col.className = 'c-tcard__col';
  const lab = document.createElement('span');
  lab.className = 'c-tcard__label';
  lab.textContent = label;
  /* ★ #1013 (Opus r2 M1): the value and the foot share ONE wrapping line (the foot drops under, end-aligned) */
  const line = document.createElement('span');
  line.className = 'c-tcard__line';
  line.append(valueEl);
  const foot = document.createElement('span');
  foot.className = 'c-tcard__foot';
  const t = timeEl(timestamp);
  if (t) foot.append(t);
  if (foot.childNodes.length) line.append(foot);
  col.append(lab, line);
  if (subEl) col.append(subEl);
  main.append(med, col);
  if (onOpen) {
    const hit = document.createElement('button');
    hit.type = 'button';
    hit.className = 'c-tcard__hit';
    hit.setAttribute('aria-label', openLabel);
    hit.addEventListener('click', onOpen);
    main.prepend(hit);   // FIRST child: `.c-tcard__hit:hover ~ .c-tcard__medallion` (no :has)
  }
  return main;
}

/* ★★ S20 J1 (#1440, Damir 16:36 "like a message" + 17:52 / 17:54 "keep TODAY'S colours, change only the layout") — THE
 * PAYMENT BUBBLE, one stacked layout for all 14 states (supersedes the #996 compact pill + the header card; their
 * behaviour stays): ① the label row — today's medallion at 24 px + the role label (+ the time when the bubble has
 * buttons) · ② the amount, 28 px, with today's data-tone · ③ the fiat line (hidden below 0.01) · ④ the foot — today's
 * tonal badge + the time · then today's .c-button pair. Surfaces / edges / inks are the .c-tcard rules, unchanged.
 * Labels come from role + flow + status (the shell always sends them; C#'s localized `title` is only the fallback for
 * an unknown role). {name} = the counterpart's display name WHEN THE SHELL KNOWS IT (a group sender's nick) — a 1:1
 * row carries no peer nick on the bridge, so the label drops the name ("Sent you", "Requested"; 🟡 noted, no C#). */
function payBadge(status, strings) {   // today's tonal badges: [type, label, glyph]
  return {
    pending: ['warning', strings.pending || 'Pending', 'clock-hour-10'],
    failed: ['error', strings.failed || 'Failed', 'alert-square-rounded'],
    completed: ['success', strings.completed || 'Completed', 'check'],
    declined: ['error', strings.declined || 'Declined', 'cancel'],
    canceled: ['info', strings.canceled || 'Canceled', 'circle-x'],
  }[status] || null;
}
function named(name, withName, bare) {
  /* a replacer FUNCTION (GATE 34: "$'" in a nick is text) · #46 r3: the nick is bidi-ISOLATED (FSI … PDI) so an RTL or "!"-ending
     nick cannot reorder the label (face.label feeds the aria words too) · #46 r4/r5: first the nick's own BIDI controls (U+202A–202E,
     U+2066–2069, U+200E, U+200F, U+061C), C0/C1 controls and U+2028/2029 go, so a PDI + RLO cannot close the isolate early.
     Narrower than FileRowRules.cs sanitizeMemberName (:171, all of Cf): ZWJ / ZWNJ / emoji tags / variation selectors are TEXT
     here (a family emoji, Persian می‌شود, a Scotland flag) and the label must read like the nick everywhere else. */
  const n = String(name || '').replace(/[\p{Cc}\u2028\u2029\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/gu, '').trim();
  return n ? String(withName).replace('{name}', () => '\u2068' + n + '\u2069') : bare;
}
/* The face of a payment: label · glyph · whether a COMPLETED amount gets its "+". A settled REQUEST arrives as role
   sent / received with the money's `flow` against the message (my request paid = sent + in; theirs paid = received + out). */
function paymentFace(role, flow, status, name, strings) {
  const X = 'x';
  if (role !== 'request-in' && role !== 'request-out' && role !== 'sent' && role !== 'received') return null;
  const request = role === 'request-in' || role === 'request-out' || (role === 'received' && flow === 'out') || (role === 'sent' && flow === 'in');
  const mine = role === 'request-out' || role === 'sent';
  if (status === 'canceled') return { label: strings.payYouCanceled || 'You canceled', glyph: X };
  if (!request) {
    if (mine) return status === 'failed' ? { label: strings.paymentFailed || 'Payment failed', glyph: X } : { label: strings.payYouSent || 'You sent', glyph: 'arrow-up-right' };
    return { label: named(name, strings.payNameSentYou || '{name} sent you', strings.paySentYou || 'Sent you'), glyph: status === 'failed' ? X : 'arrow-down-left', plus: true };
  }
  if (mine) {
    if (status === 'completed') return { label: named(name, strings.payNamePaidYou || '{name} paid you', strings.payPaidYou || 'Paid you'), glyph: 'arrow-down-left', plus: true };
    if (status === 'declined') return { label: named(name, strings.payNameDeclined || '{name} declined', strings.payRequestDeclined || 'Request declined'), glyph: X };
    return { label: strings.youRequested || 'You requested', glyph: status === 'failed' ? X : 'wallet' };
  }
  if (status === 'completed') return { label: named(name, strings.payYouPaidName || 'You paid {name}', strings.payYouPaid || 'You paid'), glyph: 'arrow-up-right' };
  if (status === 'declined') return { label: strings.payYouDeclined || 'You declined', glyph: X };
  return { label: named(name, strings.payNameRequested || '{name} requested', strings.requested || 'Requested'), glyph: status === 'failed' ? X : 'wallet' };
}
/* the fiat line is noise below one cent (Damir): "<$0.01", a zero, or no digits → no line */
function fiatShown(fiat) {
  const f = String(fiat == null ? '' : fiat).trim();
  return !!f && !/^</.test(f) && /[1-9]/.test(f);
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
  title = '',             // C#'s localized title — S20 J1: only the FALLBACK label (an unknown role); the role label wins
  name = '',              // ★ S20 J1: the counterpart's display name when the shell knows it ('' → the name-less label)
  amount = '',            // pre-formatted (bridge sends strings)
  fiat = '',
  status = 'actionable',
  insufficient = false,   // request-in: Pay disabled + caption
  timestamp = null,
  gutter = false,         // group chats: align with gutter-indented text bubbles (C8)
  celebrate = false,      // ★ #1009 (10a): this card COMPLETED LIVE — draw the check once (the shell passes it one render only)
  flow = '',              // ★ #996 'in' | 'out' — which way the MONEY moved (a request's is the
                          // opposite of its message direction); picks the arrow and the label
  onPay, onDecline, onCancel, onRetry, onDetails,
  strings = getStrings(),
} = {}) {
  // peer-initiated events sit on the received side (audit MAJOR: 'received' was right-aligned)
  const direction = (role === 'request-in' || role === 'received') ? 'received' : 'sent';
  const face = paymentFace(role, flow, status, String(name || '').trim(), strings) || { label: title || '', glyph: 'wallet' };
  const { row, el } = cardShell(direction, 'payment', 'stack', gutter);
  row.dataset.status = status;
  if (celebrate && status === 'completed') el.dataset.liveComplete = '';

  /* the amount: a "+" only on money that ARRIVED and completed (a received payment · my request paid); any sign the
     shell put on stays off otherwise (a pending receipt is not yet +). Only a plain number takes a sign (never '?'). */
  const bare = String(amount == null ? '' : amount).trim().replace(/^\+/, '');
  const shownAmount = face.plus && status === 'completed' && /^[\d,]+(\.\d+)?$/.test(bare) ? '+' + bare : bare;
  const tone = amountTone(status, shownAmount);
  const strike = status === 'declined' || status === 'canceled';   // failed stays readable: Retry can still send it

  /* buttons — the #996 predicates; processing = ONE loading button */
  let actions = null, pay = null;
  if (role === 'request-in' && (status === 'actionable' || status === 'processing' || status === 'failed')) {
    if (status === 'processing') {
      actions = actionsRow(createButton({ label: strings.paying || 'Paying…', type: 'fill', size: 32, loading: true }));
    } else {
      // #264 (no dead buttons): Decline renders ONLY when the host wires a decline path
      const decline = onDecline ? createButton({ label: strings.decline || 'Decline', type: 'outline', size: 32, onClick: oneShot(onDecline) }) : null;
      pay = status === 'failed'
        ? createButton({ label: strings.retry || 'Retry', type: 'fill', size: 32, icon: icon('rotate-clockwise-2', { size: 16 }), onClick: reentryGuard(onRetry) })
        : createButton({ label: String(strings.payAmountIxi || 'Pay {amount} IXI').replace('{amount}', () => formatIxiAmount(bare)), type: 'fill', size: 32, icon: icon('check', { size: 16 }), onClick: oneShot(onPay), disabled: insufficient });
      actions = actionsRow(decline, pay);
    }
  } else if (role === 'request-out' && status === 'pending') {
    actions = actionsRow(createButton({ label: strings.cancelRequest || 'Cancel request', type: 'outline', size: 32, onClick: oneShot(onCancel) }));
  } else if (role === 'sent' && status === 'failed') {
    actions = actionsRow(createButton({ label: strings.retry || 'Retry', type: 'fill', size: 32, icon: icon('rotate-clockwise-2', { size: 16 }), onClick: reentryGuard(onRetry) }));
  }
  if (actions) el.dataset.acts = '';

  /* Details: the whole bubble opens it (the stretched hit layer, under the buttons) — completed, a direct payment still
     pending, or (#523) a request card the host gave a target. No target → no layer (no dead tap). */
  const details = onDetails && (status === 'completed' || ((role === 'sent' || role === 'received') && status === 'pending') || !!actions)
    ? reentryGuard(onDetails) : null;
  const badge = payBadge(status, strings);
  const words = [face.label, formatIxiAmount(shownAmount) + ' IXI', fiatShown(fiat) ? fiat : '', badge ? badge[1] : '', details ? (strings.details || 'Details') : ''].filter(Boolean).join(', ');
  if (details) {
    const hit = document.createElement('button');
    hit.type = 'button';
    hit.className = 'c-tcard__hit';
    hit.setAttribute('aria-label', words);
    hit.addEventListener('click', details);
    el.append(hit);   // FIRST child: `.c-tcard__hit:hover ~ .c-tcard__top …` (no :has)
  } else {
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', words);
  }

  const top = document.createElement('div');
  top.className = 'c-tcard__top';
  const med = document.createElement('span');
  med.className = 'c-tcard__medallion';
  med.setAttribute('aria-hidden', 'true');
  med.append(icon(face.glyph, { size: 14 }));
  const lab = document.createElement('span');
  lab.className = 'c-tcard__label';
  lab.textContent = face.label;   // textContent: the name is peer data
  top.append(med, lab);
  const t = timeEl(timestamp);
  if (actions && t) top.append(t);
  el.append(top);

  const amt = document.createElement('div');
  amt.className = 'c-tcard__amount u-tabular';
  amt.dataset.tone = tone;
  if (strike) amt.dataset.strike = '';
  const num = document.createElement('span');
  num.className = 'c-tcard__num';
  num.textContent = formatIxiAmount(shownAmount);
  const unit = document.createElement('span');
  unit.className = 'c-tcard__unit';
  unit.textContent = 'IXI';
  amt.append(num, document.createTextNode(' '), unit);
  el.append(amt);

  if (fiatShown(fiat)) {
    const f = document.createElement('div');
    f.className = 'c-tcard__fiat u-tabular';
    if (strike) f.dataset.tone = 'void';
    f.textContent = fiat;
    el.append(f);
  }

  if (badge || (!actions && t)) {
    const foot = document.createElement('div');
    foot.className = 'c-tcard__bottom';
    if (badge) {
      const wrap = document.createElement('span');
      wrap.className = 'c-tcard__badge';
      wrap.append(createBadge({ type: badge[0], weight: 'tonal', label: badge[1], icon: badge[2] }));
      foot.append(wrap);
    }
    if (!actions && t) foot.append(t);
    el.append(foot);
  }
  if (actions) el.append(actions);
  if (pay && insufficient && status === 'actionable') {
    const note = document.createElement('div');
    note.className = 'c-tcard__note';
    note.textContent = strings.insufficient || 'Not enough IXI to cover this amount plus the network fee.';
    note.id = 'c-tcard-note-' + (++tcardNoteUid);   // r2 backlog C15: the disabled Pay points AT the reason
    pay.setAttribute('aria-describedby', note.id);
    el.append(note);
  }
  paymentOpts.set(row, {
    role, flow, title, name, amount, fiat, status, insufficient, timestamp, gutter,
    onPay, onDecline, onCancel, onRetry, onDetails, strings,
  });
  return row;
}

/** In-place payment update (#86): re-creates the card from its remembered
 *  opts merged with the patch and swaps it — scroll position, neighbors and
 *  the rest of the log untouched. Returns the NEW row (callers holding a
 *  reference must adopt it). patch = { status, amount, fiat, insufficient, … }. */
export function setPaymentStatus(row, patch = {}) {
  const opts = paymentOpts.get(row);
  if (!opts) {
    console.warn('setPaymentStatus: row was not created by createPaymentBubble');
    return row;
  }
  const next = createPaymentBubble({ ...opts, ...patch });
  row.replaceWith(next);
  return next;
}

/** App session card (Figma app-card): invite/invited/missing/in-session/ended. */
export function createAppBubble({
  name = '',
  iconUrl = null,
  state = 'invite',        // invite (them→you) | invited (you→them) | missing | declined | canceled (B2) | in-session | ended | joined (★ S9)
  direction = null,        // override — bridge knows localSender (audit)
  timestamp = null,
  gutter = false,          // group chats: align with gutter-indented text bubbles (C8)
  onJoin, onDecline, onLaunch, onCancel, onGet, onEnd, onResume,
  onOpenAgain,             // ★ S9 (8-APP, #1247): the 'joined' card's ONE button (the shell: joinApp); none → falls back to onJoin
  strings = getStrings(),
} = {}) {
  const dir = direction || (state === 'invited' ? 'sent' : 'received');
  /* ★ #996: the exact predicates of the button branches below — no button → the compact pill */
  const hasAction = state === 'invite' || state === 'invited' || state === 'in-session'
    || (state === 'joined' && !!(onOpenAgain || onJoin))
    || (state === 'missing' && !!(onDecline || onGet));
  if (!hasAction) return appCompact({ name, iconUrl, state, dir, timestamp, gutter, strings });
  /* ★★ S20 J4 (#1440, the v3 doc's I4 — Damir confirms at the build render): the "App invite" / "App session" HEADER
     row is gone — a 48 px icon, then a 13 px semibold line (what happened) over the 18 px bold app name with the time at
     the end of that line; the buttons stay as today under the icon row. Colours, states and handlers unchanged. */
  const { row, el } = cardShell(dir, 'app', null, gutter);
  if (state === 'declined' || state === 'canceled') el.dataset.state = state;   // terminal tombstones: void tone (css)

  const id = document.createElement('div');
  id.className = 'c-tcard__app';
  const ic = appIconEl(iconUrl, name);   // ★ #996: ONE app-icon sink for both card layouts (O-13 rule inside) · #1020 monogram fallback
  const col = document.createElement('span');
  col.className = 'c-tcard__app-info';
  const nm = document.createElement('span');
  nm.className = 'c-tcard__app-name';
  nm.textContent = name;
  const line = document.createElement('span');
  line.className = 'c-tcard__app-line';
  line.append(nm);
  const t = timeEl(timestamp);
  if (t) line.append(t);
  const sub = document.createElement('span');
  sub.className = 'c-tcard__app-sub';
  sub.textContent = {
    invite: strings.invitedYou || 'Invited you to join',
    invited: strings.inviteSent || 'Invite sent',   // ★ S20 J4: the short line (was youInvited "You have sent an invite")
    missing: strings.invitedYou || 'Invited you to join',
    declined: dir === 'sent' ? appDeclinedByPeer(strings) : (strings.declinedInvite || 'You declined this invite'),   // ★ S8 (#1233)
    canceled: strings.canceledInvite || 'You canceled this invite',   // ★ B2 (#533 ①): the sender's terminal tombstone
    'in-session': strings.inSession || 'In session',
    ended: strings.sessionEnded || 'Session ended',
    joined: strings.youJoinedApp || 'You joined this app',   // ★ S9 (8-APP)
  }[state] || ''; // audit r2: unknown state rendered "undefined"
  col.append(sub, line);
  id.append(ic, col);
  el.append(id);

  if (state === 'invite') {
    // Decline renders ONLY when a handler exists — the legacy bridge has no
    // decline-invite verb (C7), so an ungated Decline was a dead button that
    // "did nothing" (Damir F5). Without it, Join takes the row (full width via
    // actionsRow). When BE adds declineApp, the caller passes onDecline → it
    // reappears automatically.
    const appBtns = [];
    if (onDecline) appBtns.push(createButton({ label: strings.decline || 'Decline', type: 'outline', size: 32, onClick: oneShot(onDecline) }));
    appBtns.push(createButton({ label: strings.join || 'Join', type: 'fill', size: 32, icon: icon('check', { size: 16 }), onClick: oneShot(onJoin) }));
    el.append(actionsRow(...appBtns));
  } else if (state === 'invited') {
    el.append(actionsRow(
      createButton({ label: strings.cancel || 'Cancel', type: 'outline', size: 32, onClick: oneShot(onCancel) }),
      createButton({ label: strings.launchApp || 'Launch app', type: 'fill', size: 32, icon: icon('rocket', { size: 16 }), onClick: reentryGuard(onLaunch) }),
    ));
  } else if (state === 'missing') {
    // C7(a): Decline renders when the caller supplies onDecline (same gate as the
    // 'invite' branch). C7(b): Get app renders ONLY when onGet is supplied — an invite
    // with no install URL passes no onGet, so no dead "does nothing" button.
    const missBtns = [];
    if (onDecline) missBtns.push(createButton({ label: strings.decline || 'Decline', type: 'outline', size: 32, onClick: oneShot(onDecline) }));
    if (onGet) missBtns.push(createButton({ label: strings.getApp || 'Get app', type: 'fill', size: 32, icon: icon('download', { size: 16 }), onClick: oneShot(onGet) }));
    if (missBtns.length) el.append(actionsRow(...missBtns));
  } else if (state === 'joined') {
    /* ★ S9 (8-APP, #1247): C# remembers the join (SAppJoins → app_state "Joined") — ONE button, no Decline: the user
       already accepted. It reopens the app through the existing joinApp verb. */
    el.append(actionsRow(
      createButton({ label: strings.openAgain || 'Open again', type: 'fill', size: 32, icon: icon('rocket', { size: 16 }), onClick: reentryGuard(onOpenAgain || onJoin) }),
    ));
  } else if (state === 'in-session') {
    // End session renders only when the caller supplies onEnd (the bridge has no
    // end-session verb today, C7 follow-up) — no dead button; Resume takes the row.
    const sessBtns = [];
    if (onEnd) sessBtns.push(createButton({ label: strings.endSession || 'End session', type: 'outline', size: 32, onClick: oneShot(onEnd) }));
    sessBtns.push(createButton({ label: strings.resume || 'Resume', type: 'fill', size: 32, icon: icon('player-play', { size: 16 }), onClick: reentryGuard(onResume) }));
    el.append(actionsRow(...sessBtns));
  }
  return row;
}

/* ★ #996 the COMPACT app pill — a card with no button: declined · canceled · ended (and a
 * missing app the host can neither install nor decline). Icon · sub-line label · app name. */
/* ★ Gate row O-13 (#46 loop B, MINOR-5) — the app-invite icon is composed by the INVITING
 * PEER. `chat.html` already asks the same question at the caller and keeps the media-autoload
 * decision there, which is where it belongs. The shape test lives INSIDE the component so the
 * two cannot drift: a second caller cannot light this sink up without the rule. It refuses a
 * relative path, a protocol-relative '//host/x', 'javascript:' and 'blob:'.
 * Graceful fallback (matches c-avatar / c-app-icon): an icon that doesn't resolve drops the
 * <img> for the rocket; the handler is wired BEFORE src so a synchronously cached error fires. */
/* ★★ #1020 (Damir 2026-09-28: "the improved app invite bubbles"): an app with no icon (or one
 * that fails to load, or the legacy `app-noicon` placeholder) is a MONOGRAM tile in the avatar
 * palette — its initial on the identity gradient picked from its name (#1001/#1017 treatment),
 * so two apps never share the same anonymous rocket. */
const APP_NOICON = /(^|\/)app-noicon\.[a-z]+$/i;
function appMonogram(ic, name) {
  ic.classList.add('c-idhue', 'c-tcard__app-icon--mono');
  ic.dataset.hue = String(identityIndex(String(name || '?')));
  const t = document.createElement('span');
  t.className = 'c-tcard__app-initial';
  t.setAttribute('aria-hidden', 'true');
  t.textContent = (Array.from(String(name || '').trim())[0] || '?').toUpperCase();
  ic.append(t);
}
function appIconEl(iconUrl, name) {
  const ic = document.createElement('span');
  ic.className = 'c-tcard__app-icon';
  const iconSrc = safeImageSrc(APP_NOICON.test(String(iconUrl || '')) ? '' : iconUrl, { allowRemote: true });   // GATE 42: the sink value comes straight OUT of safeImageSrc
  if (iconSrc) {
    const img = document.createElement('img');
    img.alt = '';
    img.addEventListener('error', () => { img.remove(); appMonogram(ic, name); }, { once: true });
    img.src = iconSrc;
    ic.append(img);
  } else {
    appMonogram(ic, name);
  }
  return ic;
}
/* ★ S8 (#1233): MY invite, declined by the peer (C# app_state "Declined" on my own row) — "You declined" would be false */
function appDeclinedByPeer(strings) { return strings.inviteDeclined || 'Your invite was declined'; }
function appCompact({ name, iconUrl, state, dir, timestamp, gutter, strings }) {
  const { row, el } = cardShell(dir, 'app', 'compact', gutter);
  if (state === 'declined' || state === 'canceled') el.dataset.state = state;
  const subText = {
    invite: strings.invitedYou || 'Invited you to join',
    invited: strings.youInvited || 'You have sent an invite',
    missing: strings.invitedYou || 'Invited you to join',
    declined: dir === 'sent' ? appDeclinedByPeer(strings) : (strings.declinedInvite || 'You declined this invite'),   // ★ S8 (#1233)
    canceled: strings.canceledInvite || 'You canceled this invite',
    'in-session': strings.inSession || 'In session',
    ended: strings.sessionEnded || 'Session ended',
    joined: strings.youJoinedApp || 'You joined this app',   // ★ S9 (8-APP)
  }[state] || '';
  const nm = document.createElement('span');
  nm.className = 'c-tcard__app-name';
  nm.textContent = name;
  el.append(compactMain({ iconEl: appIconEl(iconUrl, name), label: subText, valueEl: nm, timestamp, onOpen: null, openLabel: '' }));
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', [name, subText].filter(Boolean).join(', '));
  return row;
}

/** Call event card — ★★ #1006 (D-07, Damir 2026-09-28): ONE compact row (~64px).
 *  An outcome-tinted 40px medallion carrying the DIRECTION glyph · a title line · a
 *  secondary line (duration · time — the time moved out of the header) · a round 36px
 *  call-back button at the inline end. The divider and the "Call back ›" link row are gone,
 *  and the card itself is NOT a tap target — only the button calls.
 *  Outcomes (C4 flags + #572 ④ declinedLocal; the TITLE is C#'s localized label):
 *    ok        answered (or ringing/live)  → phone-outgoing / phone-incoming, action medallion
 *    missed    incoming, nobody answered   → phone-x, the ONLY red state (title + disc)
 *    noanswer  outgoing, nobody answered   → phone-x, neutral grey
 *    declined  THIS device declined        → phone-off, neutral grey, NO call-back (#87⑦)
 *    rejected  the PEER declined (outgoing) → phone-off, neutral grey, call-back kept (★ #1080 F11 — you may try again)
 *  The glyph pair phone-off (turned down) / phone-x (nobody answered) is the chats row's
 *  (#46 loop 2026-08-29) — a pin reads both surfaces. Call-back shows for ok / missed /
 *  noanswer when the host wires it; the shell passes none while the call is live (C4). */
export function createCallBubble({
  missed = false,          // C# "never connected" (rang out) — incoming → missed, outgoing → no answer
  declined = false,        // #87⑦ / #572 ④: this device declined — wins over `missed`
  rejected = false,        // ★ #1080 F11: the peer declined our call — wins over `missed`, loses to `declined`
  title = '',              // C#-localized label, verbatim (it knows "No answer" vs "Missed call")
  direction = 'received',  // bridge knows localSender (audit)
  directionLabel = '',     // kept for API compatibility; the title already names the direction
  duration = '',           // "4:12"
  timestamp = null,
  gutter = false,          // group chats: align with gutter-indented text bubbles (C8)
  onCallBack,
  strings = getStrings(),
} = {}) {
  const outgoing = direction === 'sent';
  const outcome = declined ? 'declined' : rejected ? 'rejected' : missed ? (outgoing ? 'noanswer' : 'missed') : 'ok';
  const { row, el } = cardShell(direction, 'call', 'compact', gutter);
  if (outcome === 'missed') row.dataset.missed = '';
  row.dataset.callOutcome = outcome;
  const glyph = (outcome === 'declined' || outcome === 'rejected') ? 'phone-off'
    : outcome === 'ok' ? (outgoing ? 'phone-outgoing' : 'phone-incoming')
    : 'phone-x';
  const heading = outcome === 'declined'
    ? (strings.youDeclinedCall || 'You declined')
    : (title || (outcome === 'rejected' ? (strings.callDeclined || 'Call declined')
      : outcome === 'missed' ? (strings.missedCall || 'Missed voice call')
      : outcome === 'noanswer' ? (strings.noAnswer || 'No answer')
      : (strings.voiceCall || 'Voice call')));

  const main = document.createElement('div');
  main.className = 'c-tcard__call';
  const med = document.createElement('span');
  med.className = 'c-tcard__medallion';
  med.setAttribute('aria-hidden', 'true');
  med.append(icon(glyph, { size: 20 }));
  const col = document.createElement('span');
  col.className = 'c-tcard__call-info';
  const t = document.createElement('span');
  t.className = 'c-tcard__title';
  t.textContent = heading;
  const sub = document.createElement('span');
  sub.className = 'c-tcard__call-meta u-tabular';
  const d = timestamp == null ? null : new Date(timestamp);
  const timeText = d && !isNaN(d) ? cardTime(d) : '';
  const dur = outcome === 'ok' ? duration : '';
  sub.textContent = [dur, timeText].filter(Boolean).join(' · ');
  col.append(t);
  if (sub.textContent) col.append(sub);
  main.append(med, col);
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', [heading, dur, timeText].filter(Boolean).join(', '));
  if (onCallBack && outcome !== 'declined') {
    const cb = document.createElement('button');
    cb.type = 'button';
    cb.className = 'c-tcard__call-back';
    cb.setAttribute('aria-label', strings.callBack || 'Call back');
    cb.append(icon('phone', { size: 18 }));
    cb.addEventListener('click', reentryGuard(onCallBack));
    main.append(cb);
  }
  el.append(main);
  return row;
}

/* ★ #1005 (D-05, Damir 2026-09-28): a file name keeps its EXTENSION when it has to shorten.
 * The stem ellipsizes; the last 4 characters of the stem + the extension ride a
 * non-shrinking tail ("Quarterly_re…ort.pdf"). The element's textContent stays the FULL
 * name (the two spans concatenate — setFileProgress and the Downloads row read it back),
 * and `title` carries it for the pointer. A name with no dot, a leading-dot name, an
 * extension longer than 8, or a stem too short to be worth splitting renders unchanged.
 * RTL-safe: the tail is a logical (inline-end) span and the stem's ellipsis follows the
 * text direction; `dir="auto"` on the parent isolates a mixed-direction name. */
export function fillFileName(el, name) {
  const full = String(name == null ? '' : name);
  el.textContent = '';
  el.title = full;
  el.classList.remove('c-fname');   // a plain name keeps the host's own block ellipsis
  el.setAttribute('dir', 'auto');
  const dot = full.lastIndexOf('.');
  const ext = dot > 0 ? full.slice(dot) : '';
  const stem = dot > 0 ? full.slice(0, dot) : full;
  if (!ext || ext.length > 9 || Array.from(stem).length <= 8) { el.textContent = full; return el; }
  /* ⚠ #1012 (Opus r1 m2): cut on CODE POINTS, never UTF-16 units — a surrogate pair split at the
     boundary rendered a lone half (\uFFFD) — and move the cut back past combining marks, so a
     macOS NFD name ("e" + U+0301) never starts the tail on a floating accent. */
  const cps = Array.from(stem);
  let cut = cps.length - 4;
  while (cut > 0 && /\p{M}/u.test(cps[cut])) cut -= 1;
  const head = document.createElement('span');
  head.className = 'c-fname__stem';
  head.textContent = cps.slice(0, cut).join('');
  const tail = document.createElement('span');
  tail.className = 'c-fname__tail';
  tail.textContent = cps.slice(cut).join('') + ext;
  el.classList.add('c-fname');      // flex ONLY when split — an anonymous flex item cannot ellipsize
  el.append(head, tail);
  return el;
}

/* file-bubble state → accessible name / leading glyph. Single source shared by
   createFileBubble AND setFileProgress (audit r2: the progress→complete flip
   left "Downloading …" aria + the old glyph on the button). */
/* #46 r3 R3-m2: ONE rule for MY transfer, card AND tile — "Sending <name>" (a download stays "Downloading") */
/* ★ S20 Q (#1376 / #1377 E): a known size joins the name — "Download report.pdf, 2.4 MB" (unknown = today's label) */
function fileAria(state, name, strings, direction = 'received', bytes = 0) {
  const size = formatFileSize(bytes, strings);
  return (state === 'offer' ? (strings.download || 'Download')
    : state === 'failed' ? (strings.retry || 'Retry')
    : state === 'progress' ? tileProgressWord(direction, strings)
    : (strings.open || 'Open'))
    + ' ' + name + (size ? ', ' + size : '');
}
/* ★★ S20 Q (#1376 / #1377 E, Damir 16:40 design): the SIZE on the card's second line, when C# sent it (addFile arg 20 →
   rec.size > 0; unknown = 0 = today's text). offer "2.4 MB · Tap to download" (desktop "Click") · transfer "1.1 / 2.4 MB"
   (done = size × the integer pct) · complete "2.4 MB · PDF" (the extension upper-case; none → the size alone) · failed and
   "not available" as before. textContent only (the name is peer data). */
function fileBytes(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function fileExtUpper(name) {
  const s = String(name == null ? '' : name);
  const dot = s.lastIndexOf('.');
  const ext = dot > 0 && dot < s.length - 1 ? s.slice(dot + 1) : '';
  return ext && ext.length <= 8 && !/\s/.test(ext) ? ext.toUpperCase() : '';   // #1005's rule: a longer tail is not an extension
}
function downloadCta(strings) {
  /* ★ #1147 (3): a mouse clicks — :root[data-desktop] says "Click to download"; touch keeps "Tap" */
  return document.documentElement.hasAttribute('data-desktop') ? (strings.clickToDownload || 'Click to download') : (strings.tapToDownload || 'Tap to download');
}
function pctInt(v) { return Math.max(0, Math.min(100, Math.round(Number(v) || 0))); }
/* the offer's call to action, with the size in front in the quiet ink (textContent reads "2.4 MB · Tap to download") */
function fillCtaLine(el, bytes, strings) {
  const size = formatFileSize(bytes, strings);
  el.textContent = '';
  if (size) {
    const sz = document.createElement('span');
    sz.className = 'c-fbubble__size';
    sz.textContent = size + ' ·';   // the space is a plain text node between the units (an inline-block trims its own)
    const go = document.createElement('span');
    go.className = 'c-fbubble__go';   // a narrow card breaks BETWEEN the size and the action, never inside "Tap to download"
    go.textContent = downloadCta(strings);
    el.append(sz, ' ', go);
    return;
  }
  el.append(downloadCta(strings));
}
/* ★ S20 Q (#1402, v3 Damir 18:02 — supersedes the #1377 E text): offer AND complete read "PDF · 2.4 MB" (the type first; no
   extension → the size alone) — the tile's ↓ badge says "download", so a sized offer drops "Tap to download" (an unknown
   size keeps it, fillCtaLine) · transfer "1.1 / 2.4 MB" (the percentage only without a size) */
function fileSizeLine(state, bytes, progress, name, strings) {
  if (state === 'progress') return bytes ? formatFileSizeOf(bytes * pctInt(progress) / 100, bytes, strings) : pctInt(progress) + '%';
  if (state === 'complete' || state === 'offer') {
    const size = formatFileSize(bytes, strings);
    const ext = size ? fileExtUpper(name) : '';
    return size ? (ext ? ext + ' · ' + size : size) : '';
  }
  return '';
}
function fileGlyph(state) {
  return state === 'failed' ? 'rotate-clockwise-2' : state === 'offer' ? 'download' : 'file-isr';
}
/* ★★ #1021 (Damir 2026-09-28: "premiumize the file transfer"): the leading tile is a DOCUMENT
 * tile — the file's own extension on a gradient from the disc/avatar palette, picked by the file's
 * family, so a PDF, an archive and a photo read differently at a glance. The STATE rides a small
 * badge on the tile's corner (download · retry), not a replacement glyph. */
const FILE_FAMILIES = [
  ['pdf', /^(pdf)$/],
  ['doc', /^(docx?|odt|rtf|pages|md|txt|csv|xlsx?|ods|numbers|pptx?|odp|key)$/],
  ['archive', /^(zip|rar|7z|tar|gz|tgz|bz2|xz|ixi|wal)$/],
  ['image', /^(jpe?g|png|gif|webp|heic|svg|bmp|tiff?)$/],
  ['audio', /^(mp3|m4a|aac|wav|flac|ogg|opus)$/],
  ['video', /^(mp4|mov|m4v|webm|mkv|avi)$/],
  ['code', /^(js|ts|json|html?|css|xml|py|cs|java|c|cpp|h|sh|yml|yaml)$/],
];
export function fileKind(name) {
  const s = String(name || '');
  const dot = s.lastIndexOf('.');
  const ext = dot > 0 && dot < s.length - 1 ? s.slice(dot + 1).toLowerCase() : '';
  const fam = (FILE_FAMILIES.find(([, re]) => re.test(ext)) || ['other'])[0];
  const label = ext && ext.length <= 4 ? ext.toUpperCase() : (ext ? ext.slice(0, 3).toUpperCase() : '');
  return { family: fam, label };
}
function fileBadge(state) {
  if (state !== 'offer' && state !== 'failed') return null;
  const b = document.createElement('span');
  b.className = 'c-fbubble__badge';
  b.setAttribute('aria-hidden', 'true');
  b.append(icon(fileGlyph(state), { size: 12 }));
  return b;
}
function fileTile(name, state) {
  const { family, label } = fileKind(name);
  const ic = document.createElement('span');
  ic.className = 'c-fbubble__icon';
  ic.dataset.kind = family;
  if (label) {
    const t = document.createElement('span');
    t.className = 'c-fbubble__ext';
    t.textContent = label;
    ic.append(t);
  } else {
    ic.append(icon('file-isr', { size: 20 }));
  }
  const badge = fileBadge(state);
  if (badge) ic.append(badge);
  return ic;
}
/** ★ A3 (#1126 / #1123 G-5): the chat's document tile, for other lists of files (Downloads). The SAME
 *  builder as the file bubble's tile, never a copy; no state badge (a listed file is on this device). */
export function createFileTile(name) {
  const tile = fileTile(name, 'complete');
  tile.setAttribute('aria-hidden', 'true');   // (#46 r1 B-1) decoration: the row's name is the file name, never "PDF report.pdf"
  return tile;
}
/* Explicit "Open file" affordance for a completed download (A8b, Damir F5): the
   whole bubble is already a tappable button, but a labelled control makes it
   obvious the transfer finished and the file is openable. Complete state only. */
/* ★ S19 F13 (S18 walk, Damir 21:40): the keep-open line says which way the bytes go — MY file waits on my device sending,
   a received one comes straight from the sender's device (P2P, no server copy). One line per direction; the old
   direction-less keepOpen is retired (these were its only two readers). */
function keepOpenText(direction, strings) {
  return direction === 'sent'
    ? (strings.keepOpenSent || 'Keep Spixi open until it’s sent.')
    : (strings.keepOpenReceived || 'Comes directly from the sender’s device. Keep Spixi open.');
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
  gutter = false,          // group chats: align with gutter-indented text bubbles (C8)
  onAccept, onOpen, onRetry,
  onCancel,                // #334: sender-side cancel while the offer is un-accepted (shell-gated)
  status = null,           // ★ #1028 (walk P.22): a SENT file's delivery tick — 'sending'|'sent'|'delivered'|'read' (null = none)
  unavailable = false,     // ★ #1190 (#1173 (4)): a COMPLETE file whose file is not on this device (C#'s addFile arg 16 = "0")
  size = 0,                // ★ S20 Q (#1376): the file's byte count (C#'s addFile arg 20; 0 / "" = unknown → today's text)
  strings = getStrings(),
} = {}) {
  const bytes = fileBytes(size);
  const row = document.createElement('div');
  row.className = 'c-bubble-row';
  row.dataset.direction = direction;
  row.dataset.position = 'single';
  if (gutter && direction === 'received') {
    const g = document.createElement('span');
    g.className = 'c-bubble-row__gutter';
    row.append(g);
  }
  /* ★★ #1190 (#1173 (4), #1188 b — walk #1172 A-PREVIEW): my sent photo whose original is gone from this device was the
     big empty photo square + "Open file" that did nothing. Now the COMPACT card, its second line "Not available on this
     device", NO "Open file", NO tap (no handler at all — a click sends nothing) and aria-disabled. Complete only. */
  const gone = !!unavailable && state === 'complete';
  if (gone) { onOpen = undefined; onAccept = undefined; onRetry = undefined; meta = strings.fileUnavailable || 'Not available on this device'; }
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'c-fbubble';
  el.dataset.state = state;
  if (gone) { el.dataset.unavailable = ''; el.setAttribute('aria-disabled', 'true'); }
  if (bytes && !gone) el.dataset.bytes = String(bytes);   // ★ S20 Q: setFileProgress reads it for "1.1 / 2.4 MB" and the final line
  // ONE persistent dispatcher keyed on live state — the state can flip later via
  // setFileProgress (audit r2: a progress-created bubble bound NO handler, so the
  // finished download was an enabled button that did nothing). Progress state has
  // no click action (earlier audit: "Open" on an unopenable transfer).
  const handlers = {
    offer: oneShot(onAccept),          // accept latches; updateFile re-renders/flips
    failed: reentryGuard(onRetry),     // retry is repeatable
    complete: reentryGuard(onOpen),    // open is repeatable
  };
  el.addEventListener('click', (e) => {
    const h = handlers[el.dataset.state];
    if (h) h(e);
  });
  if (state === 'progress') el.disabled = true;
  /* ★ #1035 (#46 auditor B, M3): the BASE label is kept on the card so the sent file's tick state can be
     appended (here and on every live change — message-bubble.js syncFileTickAria); an explicit aria-label
     on a <button> replaces its content, so the tick's own label is never heard otherwise. */
  el.dataset.ariaBase = gone ? name + ', ' + meta : fileAria(state, name, strings, direction, bytes);   // ★ #1190: never "Open <name>" on a card that opens nothing
  el.setAttribute('aria-label', el.dataset.ariaBase);

  el.append(fileTile(name, state));   // ★ #1021: the document tile (extension · family colour · state badge)

  const col = document.createElement('span');
  col.className = 'c-fbubble__info';
  const nm = document.createElement('span');
  nm.className = 'c-fbubble__name';
  fillFileName(nm, name);   // ★ #1005: the extension survives the ellipsis
  const mt = document.createElement('span');
  mt.className = 'c-fbubble__meta';
  /* ★ #1021: the second line always SAYS something — C# sends no size, so `meta` is usually
     empty and an offer read as a bare file name. offer = the call to action (action ink), progress
     = the percentage (updated in place), failed = the retry line; an explicit meta still wins. */
  /* ★ S20 Q (#1376 / #1377 E): + the size (fileSizeLine / fillCtaLine above) when it is known */
  if (state === 'failed') mt.textContent = strings.transferFailed || 'Transfer failed · Tap to retry';
  else if (meta) mt.textContent = meta;
  else if (state === 'offer' && !bytes) fillCtaLine(mt, 0, strings);   // no size → today's call to action
  else mt.textContent = fileSizeLine(state, bytes, progress, name, strings);
  if (!meta && state !== 'failed') mt.dataset.auto = '';   // a computed line: setFileProgress rewrites it on a flip
  if (!meta && state === 'offer' && !bytes) mt.dataset.cta = '';
  if (!meta && state === 'progress') mt.dataset.pct = '';
  col.append(nm, mt);
  if (state === 'progress') {
    const track = document.createElement('span');
    track.className = 'c-fbubble__track';
    track.setAttribute('role', 'progressbar'); // audit: transfers were silent to AT
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-label', tileProgressWord(direction, strings)); // audit r2: nameless progressbar · #46 r3 R3-m2: mine = Sending
    const p = Math.max(0, Math.min(100, Number(progress) || 0)); // NaN-safe (audit r2)
    track.setAttribute('aria-valuenow', String(p));
    const fill = document.createElement('span');
    fill.className = 'c-fbubble__fill';
    fill.style.width = p + '%';
    track.append(fill);
    col.append(track);
    // P2P reality hint (Damir 2026-07-03): both peers must stay online for the
    // transfer — brief muted line while in progress, removed on completion
    const hint = document.createElement('span');
    hint.className = 'c-fbubble__hint';
    hint.textContent = keepOpenText(direction, strings);   // ★ S19 F13: by direction
    col.append(hint);
  }
  /* ★ S20 J3 (#1440): no "Open file" link (A8b's) — the whole bubble already opens the file */
  el.append(col);

  /* ★★ #1028 (walk P.22, Damir: "a SENT file needs a delivered double check, like text messages"):
     the time and the tick share ONE stamp, the text bubble's meta grammar (time · tick). Only a SENT
     file carries a tick, and only when the shell knows its status. The tick is the SAME glyph set as a
     text bubble (createStatusIcon) and changes through the same setMessageStatus crossfade. */
  const tick = direction === 'sent' && status ? createStatusIcon(status) : null;
  let stampTime = null;
  if (timestamp != null) {
    const d = new Date(timestamp);
    if (!isNaN(d)) { // audit r2
      stampTime = document.createElement('time');
      stampTime.className = 'c-fbubble__time u-tabular';
      stampTime.setAttribute('datetime', d.toISOString());
      stampTime.textContent = cardTime(d);
    }
  }
  if (tick) {
    tick.setAttribute('width', 14);
    tick.setAttribute('height', 14);
    tick.removeAttribute('aria-hidden');
    tick.setAttribute('role', 'img');
    tick.setAttribute('aria-label', strings['status-' + status] || status);
    const stamp = document.createElement('span');
    stamp.className = 'c-fbubble__stamp';
    if (stampTime) stamp.append(stampTime);
    stamp.append(tick);
    el.append(stamp);
    el.setAttribute('aria-label', fileNameAria(el));   // ★ #1166 r5 NIT-1: the ONE rule (card · tile · live)
  } else if (stampTime) {
    el.append(stampTime);
  }
  /* #334 (Damir ask): CANCEL on a sent-but-not-yet-accepted file offer. A
   * SIBLING of the bubble (the bubble itself is a <button> — nesting is
   * invalid HTML, and a disabled progress button swallows its children's clicks).
   * setFileProgress drops it the moment packets flow or a final state lands
   * (post-accept cancel = a different, BE-gated story — fileCancel row).
   * ★ S20 J3 (#1440): it is no longer a "Cancel" text button OUTSIDE the bubble — it is a ✕ badge ON THE TILE (today's
   * tile-badge look). The card and the ✕ share a positioned pair, so the ✕ sits on the tile's corner (css); same
   * handler, same latch, same accessible name. */
  if (onCancel) {
    const pair = document.createElement('span');
    pair.className = 'c-fbubble__pair';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'c-fbubble__cancel';
    cancelBtn.dataset.onTile = '';
    cancelBtn.append(icon('x', { size: 12 }));
    cancelBtn.setAttribute('aria-label', (strings.cancelTransfer || 'Cancel sending') + ' ' + name);
    cancelBtn.addEventListener('click', oneShot(onCancel));
    pair.append(el, cancelBtn);
    row.append(pair);
    return row;
  }
  row.append(el);
  return row;
}

/** ★★ #1190 (#1173 (3), #1188 render b) — a RECEIVED file that was downloaded and then DELETED FROM THIS DEVICE (chat
 *  info "Delete from this device" #1154, the Downloads page, the OS — C#'s addFile arg 16 = "0" on a complete received
 *  row). Not a dead glyph tile: a small italic grey bubble "Photo deleted from this device" / "File deleted from this
 *  device" and the time. NO tap (a <div>, no handler — the viewer never opens it); the long-press menu still reaches it
 *  (class c-fbubble = messageMenuTarget, so the message can still be deleted). The FILE NAME is not shown (the line says
 *  what happened; the name is peer data the row no longer needs) — textContent only. */
export function createFileGoneBubble({
  direction = 'received',
  photo = false,
  timestamp = null,
  gutter = false,
  strings = getStrings(),
} = {}) {
  const row = document.createElement('div');
  row.className = 'c-bubble-row';
  row.dataset.direction = direction;
  row.dataset.position = 'single';
  if (gutter && direction === 'received') {
    const g = document.createElement('span');
    g.className = 'c-bubble-row__gutter';
    row.append(g);
  }
  const el = document.createElement('div');
  el.className = 'c-fbubble c-fbubble--gone';
  el.dataset.state = 'gone';
  const t = document.createElement('span');
  t.className = 'c-fbubble__gone';
  t.textContent = photo ? (strings.photoDeletedLocal || 'Photo deleted from this device')
    : (strings.fileDeletedLocal || 'File deleted from this device');
  el.append(t);
  if (timestamp != null) {
    const d = new Date(timestamp);
    if (!isNaN(d)) {
      const time = document.createElement('time');
      time.className = 'c-fbubble__time u-tabular';
      time.setAttribute('datetime', d.toISOString());
      time.textContent = cardTime(d);
      el.append(time);
    }
  }
  row.append(el);
  return row;
}

/* ★★ A5 #1124 — PHOTO PREVIEWS IN THE CHAT (Damir #1133 (3); concept docs/sheets/session3/A5-1124-tiles-*.png).
 * An IMAGE file message renders on the media tile (c-mbubble, media-bubble.js — its idle → loading → loaded
 * machine) instead of the file card, when the shell's setPhotoPreviews is on:
 *   A complete + a C#-made preview (setFileThumb) → the picture fills the tile, the time pill over it; tap = open;
 *   B progress → the document tile inside a circular ring driven by updateFile (setFileProgress, below), the
 *     percentage and the keepOpen line; the tile is disabled as the card is; the pre-accept Cancel stays a SIBLING;
 *   C offer → the document tile + the name + "Tap to download"; no picture (nothing is decoded for a file that
 *     is not on this device).
 * A tile with no picture stands on the incoming bubble ground (white in light — Damir's note). Every action, the
 * sent tick and the a11y name ("<state> <name>", + the tick) are the file card's. The names this tile is for are
 * EXACTLY the extensions C# can preview (SharedItems.imageExts) — an .svg / .tiff stays a card. */
const PHOTO_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|avif)$/i;
export function isPhotoFileName(name) {
  return PHOTO_EXT.test(String(name == null ? '' : name));
}
const FILE_RING_R = 32;                              // the ring AROUND the 40 × 44 document tile (clear of its corners)
const FILE_RING_LEN = 2 * Math.PI * FILE_RING_R;
const fileTileCtl = new WeakMap();                   // tile el → { name, strings, direction } (the in-place final flip rebuilds its face)
/* ★ #1147 (5) photo fade on chat open (Damir, walk #1146: "photos FLICKER in" — the glyph face first, then the swap when
   setFileThumb lands): a LOCAL photo tile (tileShowsPicture) still waiting for its preview stands QUIET — the tile ground,
   no face (data-quiet) — and the picture fades in over it (the first-show fade); no preview within PHOTO_QUIET_MS → the
   face fades in instead (no instant pop). An offered / downloading received tile never waits. The wait is per MESSAGE
   (quietKey = the shell's message id), so a re-render inside the window does not restart it; bounded, oldest out.
   #46 r1 B-m4: ONLY a tile the shell built from a history load waits (it passes quietKey); a live insert (my just-sent
   photo, its ring) has no key and never waits. */
const PHOTO_QUIET_MS = 600;
const quietSince = new Map();   // quietKey → the first time a quiet tile was built for it (performance.now())
const QUIET_KEEP = 256;
function quietLeft(key) {
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (key == null || key === '') return 0;   // #46 r1 B-m4: no key = a live insert → no quiet wait
  const k = String(key);
  if (!quietSince.has(k)) {
    quietSince.set(k, now);
    while (quietSince.size > QUIET_KEEP) quietSince.delete(quietSince.keys().next().value);
  }
  return PHOTO_QUIET_MS - (now - quietSince.get(k));
}
/** #46 r2 R2-MAJ1: the quiet windows are per PEER — the shell calls this in onChatScreenReady. Desktop reuses one chat
 *  document across peers: A → B → A kept A's spent windows, so the reopened A showed the glyph, then swapped (#1147 (5)). */
export function resetPhotoQuiet() {
  quietSince.clear();
}
const pctText = (p) => Math.max(0, Math.min(100, Math.round(Number(p) || 0))) + '%';
/* #46 r1 B-N1: MY transfer is SENDING, not "Downloading" (the tick's own word, status-sending) */
const tileProgressWord = (direction, strings) => (direction === 'sent'
  ? (strings['status-sending'] || 'Sending') : (strings.downloading || 'Downloading'));
/* #46 r2 R2-1: which tile shows its picture. A RECEIVED file is on this device only once complete; MY OWN photo is local
   from the first moment (C# sends its preview at once, SingleChatPage noteThumbCandidate `localSender`), so it shows
   while it is still SENDING too — picture + the ring on a scrim (A5). A failed tile keeps its face (the retry word). */
export function tileShowsPicture(state, direction) {
  return state === 'complete' || (direction === 'sent' && state === 'progress');
}
const tileAria = fileAria;   // #46 r3 R3-m2: the card's rule, one source
/* #46 r1 B-M2: C#'s chat preview is a SQUARE centre crop (SThumbnail.makeJpeg on Android / iOS / Mac / Windows, called
   with SingleChatPage.ChatThumbPx = 320), so a photo-file tile reserves that square from its FIRST frame (the quiet
   ground, an offer and a download included — #46 r2 R2-m1) and keeps it: the preview landing never resizes it (it was 4:3 → 1:1). The picture covers it
   (media-bubble.css object-fit: cover — a non-square fallback JPEG is centre-cropped, never letterboxed). */
const PHOTO_TILE_PX = 320;

/** #46 r1 B-6: the pixel size of a base64 JPEG data: URI from its SOFn header (no decode), or null. C#'s preview is
 *  ≤ 64 KB; only its head is decoded (#46 r2 R2-N3). The tile is sized from it BEFORE the picture lands, so a
 *  re-render does not jump from the 4:3 placeholder to the picture's aspect. */
export function jpegSize(uri) {
  try {
    const u = String(uri || '');
    const body = u.slice(u.indexOf(',') + 1);
    /* #46 r2 R2-N3: decode the HEAD only — the frame header sits in the first few hundred bytes of C#'s preview; a
       header run longer than the head doubles it (never past the whole URI) */
    for (let n = JPEG_HEAD_CHARS; ; n *= 2) {
      const all = n >= body.length;
      const r = jpegSizeOf(atob(all ? body : body.slice(0, n)));
      if (r !== undefined || all) return r || null;
    }
  } catch (e) { /* not base64: no size */ }
  return null;
}
const JPEG_HEAD_CHARS = 4096;   // a multiple of 4 (whole base64 quads) → 3 KB of JPEG
/* the SOFn size of a JPEG byte string: {w,h} · null (not a JPEG / no frame) · undefined (ran out — need more bytes) */
function jpegSizeOf(b) {
  if (b.length < 2) return undefined;
  if (b.charCodeAt(0) !== 0xFF || b.charCodeAt(1) !== 0xD8) return null;
  let i = 2;
  while (i + 8 < b.length) {
    if (b.charCodeAt(i) !== 0xFF) return null;
    const m = b.charCodeAt(i + 1);
    if (m === 0xFF) { i += 1; continue; }                                  // fill byte
    if (m === 0x01 || (m >= 0xD0 && m <= 0xD8)) { i += 2; continue; }       // a marker without a length
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {   // SOF0…SOF15 (not DHT · JPG · DAC)
      const h = (b.charCodeAt(i + 5) << 8) | b.charCodeAt(i + 6);
      const w = (b.charCodeAt(i + 7) << 8) | b.charCodeAt(i + 8);
      return w > 0 && h > 0 ? { w, h } : null;
    }
    if (m === 0xDA || m === 0xD9) return null;                              // scan data / end before any frame header
    const len = (b.charCodeAt(i + 2) << 8) | b.charCodeAt(i + 3);
    if (len < 2) return null;
    i += 2 + len;
  }
  return undefined;
}

function fileFace(state, name, progress, strings, direction, bytes = 0) {
  const face = document.createElement('span');
  face.className = 'c-mbubble__file';
  const glyph = fileTile(name, 'complete');          // the card's document tile; the state is said in words below
  glyph.setAttribute('aria-hidden', 'true');
  if (state === 'progress') {
    const wrap = document.createElement('span');
    wrap.className = 'c-mbubble__ring';
    wrap.setAttribute('role', 'progressbar');
    wrap.setAttribute('aria-valuemin', '0');
    wrap.setAttribute('aria-valuemax', '100');
    wrap.setAttribute('aria-label', tileProgressWord(direction, strings));
    const p = Math.max(0, Math.min(100, Number(progress) || 0));
    wrap.setAttribute('aria-valuenow', String(p));
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 72 72');
    svg.setAttribute('aria-hidden', 'true');
    const track = document.createElementNS(NS, 'circle');
    track.setAttribute('class', 'c-mbubble__ring-track');
    const fill = document.createElementNS(NS, 'circle');
    fill.setAttribute('class', 'c-mbubble__ring-fill');
    for (const c of [track, fill]) { c.setAttribute('cx', '36'); c.setAttribute('cy', '36'); c.setAttribute('r', String(FILE_RING_R)); }
    fill.setAttribute('stroke-dasharray', FILE_RING_LEN.toFixed(2));
    fill.setAttribute('stroke-dashoffset', (FILE_RING_LEN * (1 - p / 100)).toFixed(2));
    svg.append(track, fill);
    wrap.append(svg, glyph);
    face.append(wrap);
  } else {
    face.append(glyph);
  }
  const cap = document.createElement('span');
  cap.className = 'c-mbubble__cap';
  if (state === 'progress') { cap.textContent = pctText(progress); cap.dataset.pct = ''; }
  else fillFileName(cap, name);                      // #1005: the extension survives the ellipsis
  face.append(cap);
  const line = document.createElement('span');
  if (state === 'progress') {
    line.className = 'c-mbubble__hint';
    line.textContent = keepOpenText(direction, strings);   // Damir's note: ON the tile · ★ S19 F13: by direction
  } else {
    line.className = 'c-mbubble__cta';
    /* ★ #1147 (3): desktop (a mouse) says "Click to download"; touch keeps "Tap" · ★ S20 Q (#1376): the offer leads with the size */
    if (state === 'offer') fillCtaLine(line, bytes, strings);
    else line.textContent = state === 'failed' ? (strings.transferFailed || 'Transfer failed · Tap to retry')
      : (strings.openFile || 'Open file');
  }
  face.append(line);
  return face;
}

/** ★ #1166 r5 NIT-1: THE accessible name of a file card OR a photo-file tile, from ONE input — the element itself (its
 *  live state attribute, its base label, its current tick). It replaces two copies of one rule (the card read its
 *  `state` option, the tile its data-file) and the live path in message-bubble.js syncFileTickAria calls it too.
 *  #46 r2 R2-N2 · r3 R3-m2: while MY file is still SENDING the plain sent / sending tick is the MESSAGE's, not the
 *  file's — the name says "Sending IMG.jpg" alone; r4 MINOR-1 (#1035): a delivered / read tick joins it at once. */
export function fileNameAria(fileEl) {
  const base = (fileEl && fileEl.dataset.ariaBase) || '';
  if (!fileEl) return base;
  const tk = fileEl.querySelector('.c-fbubble__stamp .c-status-icon:not([data-exit]), .c-mbubble__stamp .c-status-icon:not([data-exit])');
  const t = tk && tk.getAttribute('aria-label');
  if (!t) return base;
  const sending = fileEl.matches('.c-mbubble[data-file="progress"], .c-fbubble[data-state="progress"]');
  return sending && tk.dataset.tone === 'neutral' ? base : base + ', ' + t;
}

/** ★ A5 #1124: an image FILE message as a media tile (the shell decides when — setPhotoPreviews + isPhotoFileName).
 *  Same options as createFileBubble, plus `thumb` (a data:image/jpeg the shell vetted) and `onLoad` (the tile grew). */
export function createImageFileBubble({
  direction = 'received',
  name = '',
  state = 'complete',
  progress = 0,
  thumb = null,
  timestamp = null,
  gutter = false,
  status = null,
  onAccept, onOpen, onRetry, onCancel,
  onLoad,
  onThumbError,        // #46 r1 B-1: the preview failed to decode → the tile dropped it; the shell forgets it too
  quietKey = null,     // ★ #1147 (5): the message id — the quiet wait is per message, not per re-built tile
  size = 0,            // ★ S20 Q (#1376): the byte count — on the offer's call-to-action line and in the name (no other tile text)
  strings = getStrings(),
} = {}) {
  const bytes = fileBytes(size);
  const pic = tileShowsPicture(state, direction) && thumb ? String(thumb) : '';   // #46 r2 R2-1
  let tileEl = null;
  /* #1147 (5): the face comes back (it fades in — the --duration-200 opacity transition) */
  const unquiet = () => { if (tileEl) delete tileEl.dataset.quiet; };
  const row = createMediaBubble({
    direction, kind: 'image', src: pic, alt: name, autoload: !!pic, timestamp, gutter, strings,
    /* #46 r1 B-M2 · #46 r2 R2-m1: EVERY photo-file tile (offered, downloading, failed, complete, mine sending) is square
       from its first frame — a download that completes in place no longer resizes (294 × 220 → 294 × 294) */
    width: PHOTO_TILE_PX, height: PHOTO_TILE_PX,   // fixed: no refit on the JPEG / on load / at the final flip
    /* #1147 (5): a picture on MY sending tile carries its face (ring, %) on a scrim — that face fades in with it */
    onLoad: () => { if (tileEl && tileEl.dataset.file === 'progress') unquiet(); if (onLoad) onLoad(); },
    sizeHint: pic ? jpegSize(pic) : null,   // #46 r1 B-6: sized from the JPEG before it lands (no jump on a re-render)
    /* #46 r1 B-1: a preview that will not decode is DROPPED — the tile goes back to its file face and a tap opens the
       FILE (the CTA says "Open file"); no media retry loop on a bad picture. #1147 (5): its face comes back. */
    onSrcError: () => { unquiet(); if (onThumbError) { try { onThumbError(); } catch (_) {} } },
    instantIfShown: true,   // #46 r3 R3-m1: a re-render does not re-fade a picture this document already showed
    ariaFor: (s, tile) => fileNameAria(tile),
  });
  const el = row.querySelector('.c-mbubble');
  tileEl = el;
  el.dataset.file = state;
  el.dataset.ariaBase = tileAria(state, name, strings, direction, bytes);
  /* #1147 (5): a LOCAL photo tile not showing its picture yet waits QUIET; a tile the r3 "seen" path showed at once
     (loaded now) never does. After the wait with no picture (still idle), the face fades in; a picture DECODING then
     keeps the quiet until it lands (loaded) or fails (onSrcError above). */
  if (tileShowsPicture(state, direction) && el.dataset.state !== 'loaded') {
    const left = quietLeft(quietKey);
    if (left > 0) {
      el.dataset.quiet = '';
      setTimeout(() => { if (el.dataset.state === 'idle') unquiet(); }, left);
    }
  }
  fileTileCtl.set(el, { name, strings, direction, bytes });
  // ONE dispatcher keyed on the LIVE file state (the card's rule). While the picture LOADS a tap does nothing (it is
  // a frame or two for a local data: URI) — never two actions for one tap; a failed picture is dropped (above).
  const handlers = {
    offer: oneShot(onAccept),
    failed: reentryGuard(onRetry),
    complete: reentryGuard(onOpen),
  };
  el.addEventListener('click', (e) => {
    if (el.dataset.state === 'loading') return;
    const h = handlers[el.dataset.file];
    if (h) h(e);
  });
  if (state === 'progress') el.disabled = true;
  el.append(fileFace(state, name, progress, strings, direction, bytes));
  const tick = direction === 'sent' && status ? createStatusIcon(status) : null;
  if (tick) {
    tick.setAttribute('width', 14);
    tick.setAttribute('height', 14);
    tick.removeAttribute('aria-hidden');
    tick.setAttribute('role', 'img');
    tick.setAttribute('aria-label', strings['status-' + status] || status);
    const stamp = document.createElement('span');
    stamp.className = 'c-mbubble__stamp';
    const time = el.querySelector('.c-mbubble__time');
    if (time) stamp.append(time);
    stamp.append(tick);
    el.append(stamp);
  }
  el.setAttribute('aria-label', fileNameAria(el));
  if (onCancel) {   // #334: the pre-accept Cancel, a SIBLING of the tile (the tile is a <button>)
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'c-fbubble__cancel';
    cancelBtn.textContent = strings.cancel || 'Cancel';
    cancelBtn.setAttribute('aria-label', (strings.cancelTransfer || 'Cancel sending') + ' ' + name);
    cancelBtn.addEventListener('click', oneShot(onCancel));
    row.insertBefore(cancelBtn, row.querySelector('.c-mbubble-anchor'));
  }
  return row;
}

/* the tile half of setFileProgress (same contract): the ring + the percentage tick in place; a final state rebuilds
   the face, re-arms the tile and names the new state. The shell then hands it a preview, if it has one. */
function setImageFileProgress(rowEl, tile, p, opts) {
  const fill = tile.querySelector('.c-mbubble__ring-fill');
  if (fill) fill.setAttribute('stroke-dashoffset', (FILE_RING_LEN * (1 - p / 100)).toFixed(2));
  const ring = tile.querySelector('.c-mbubble__ring');
  if (ring) ring.setAttribute('aria-valuenow', String(p));
  const cap = tile.querySelector('.c-mbubble__cap[data-pct]');
  if (cap) cap.textContent = pctText(p);
  const finalState = opts.state || (p >= 100 ? 'complete' : null);
  if (p > 0 || finalState) {
    const cancelBtn = rowEl.querySelector('.c-fbubble__cancel');
    if (cancelBtn) cancelBtn.remove();
  }
  if (!finalState || tile.dataset.file === finalState) return;
  const ctl = fileTileCtl.get(tile) || { name: '', strings: getStrings(), direction: 'received' };
  const strings = opts.strings || ctl.strings;
  tile.dataset.file = finalState;
  tile.disabled = false;
  delete tile.dataset.acted;   // re-arm after an accept latch
  const face = tile.querySelector('.c-mbubble__file');
  const next = fileFace(finalState, ctl.name, p, strings, ctl.direction, ctl.bytes || 0);
  if (face) face.replaceWith(next); else tile.append(next);
  tile.dataset.ariaBase = tileAria(finalState, ctl.name, strings, ctl.direction, ctl.bytes || 0);
  tile.setAttribute('aria-label', fileNameAria(tile));
}

/** The shell's late preview (setFileThumb, or a tile that just completed): load it through the tile's own machine,
 *  sized from the JPEG first (#46 r1 B-6). Only a tile that SHOWS a picture takes one (tileShowsPicture: complete, or
 *  my own still sending — #46 r2 R2-1); the picture it already shows is not reloaded (no flash at the final flip). */
export function setImageFileThumb(rowEl, uri) {
  const tile = rowEl && rowEl.querySelector('.c-mbubble[data-file]');
  const ctl = tile && fileTileCtl.get(tile);
  if (!tile || !uri || !tileShowsPicture(tile.dataset.file, ctl ? ctl.direction : 'received')) return;
  const img = tile.querySelector('.c-mbubble__img');
  if (img && tile.dataset.state === 'loaded' && img.getAttribute('src') === String(uri)) return;
  setMediaSrc(rowEl, String(uri), jpegSize(uri));
}

/** Update a progress-state file bubble in place (bridge updateFile).
 *  opts.meta refreshes the caption; progress ≥ 100 (or opts.state) flips the
 *  bubble to its final state (audit: 100% bar stayed "Downloading").
 *  opts.strings localizes the refreshed aria-label / failed caption.
 *  The dispatcher bound at creation routes clicks by the NEW state, so a
 *  completed download opens via the onOpen passed to createFileBubble. */
export function setFileProgress(rowEl, progress, opts = {}) {
  const p = Math.max(0, Math.min(100, Number(progress) || 0)); // NaN-safe (audit r2)
  const imgTile = rowEl.querySelector('.c-mbubble[data-file]');   // ★ A5 #1124: an image file on the media tile
  if (imgTile) { setImageFileProgress(rowEl, imgTile, p, opts); return; }
  const fill = rowEl.querySelector('.c-fbubble__fill');
  if (fill) fill.style.width = p + '%';
  const track = rowEl.querySelector('.c-fbubble__track');
  if (track) track.setAttribute('aria-valuenow', String(p));
  const metaEl = rowEl.querySelector('.c-fbubble__meta');
  const bubble = rowEl.querySelector('.c-fbubble');
  const bytes = bubble ? fileBytes(bubble.dataset.bytes) : 0;   // ★ S20 Q (#1376): the size the card was built with
  if (metaEl && opts.meta) metaEl.textContent = opts.meta;
  else if (metaEl && metaEl.hasAttribute('data-pct')) metaEl.textContent = fileSizeLine('progress', bytes, p, '', opts.strings || getStrings());   // ★ #1021: the live percentage (#1024: rounded like creation) · S20 Q: "1.1 / 2.4 MB" when the size is known
  const finalState = opts.state || (p >= 100 ? 'complete' : null);
  // #334: the cancel affordance lives only in the PRE-accept window — the first
  // packet tick or any final state removes it (post-accept retraction is BE).
  if (p > 0 || finalState) {
    const cancelBtn = rowEl.querySelector('.c-fbubble__cancel');
    if (cancelBtn) cancelBtn.remove();
  }
  if (bubble && finalState && bubble.dataset.state !== finalState) {
    const strings = opts.strings || getStrings();
    bubble.dataset.state = finalState;
    bubble.disabled = false;
    delete bubble.dataset.acted; // re-arm after an accept latch (audit r2)
    if (track) track.remove();
    const hint = bubble.querySelector('.c-fbubble__hint');
    if (hint) hint.remove(); // keep-open hint is progress-only
    // refresh name + glyph for the new state (audit r2: stale "Downloading" aria)
    const nm = bubble.querySelector('.c-fbubble__name');
    bubble.dataset.ariaBase = fileAria(finalState, nm ? nm.textContent : '', strings, undefined, bytes);
    bubble.setAttribute('aria-label', fileNameAria(bubble));   // ★ #1035: keep the tick's state in the name — ★ #1166 r5 NIT-1: the one rule
    // ★ #1021: the tile keeps its extension; only the corner badge follows the state
    const ic = bubble.querySelector('.c-fbubble__icon');
    if (ic) {
      const oldBadge = ic.querySelector('.c-fbubble__badge');
      if (oldBadge) oldBadge.remove();
      const nb = fileBadge(finalState);
      if (nb) ic.append(nb);
    }
    if (metaEl && (metaEl.hasAttribute('data-pct') || metaEl.hasAttribute('data-cta') || metaEl.hasAttribute('data-auto'))) { metaEl.removeAttribute('data-pct'); metaEl.removeAttribute('data-cta'); if (!opts.meta) metaEl.textContent = fileSizeLine(finalState, bytes, p, nm ? nm.textContent : '', strings); }   // ★ #1024: a final flip also drops the offer's call to action · S20 Q (#1402): complete → "PDF · 2.4 MB" (unknown size → '')
    /* ★ S20 J3: no "Open file" link on any state (the whole bubble opens the file) */
    if (finalState === 'failed' && metaEl && !opts.meta) {
      metaEl.textContent = strings.transferFailed || 'Transfer failed · Tap to retry';
    }
  }
}

/** Full-width "Unread messages" divider (Damir 2026-07-03; frontend-only). */
export function createUnreadDivider(strings = getStrings()) {
  const el = document.createElement('div');
  el.className = 'c-unread-divider';
  el.setAttribute('role', 'separator');
  const label = document.createElement('span');
  label.textContent = strings.unreadMessages || 'Unread messages';
  el.append(label);
  return el;
}
