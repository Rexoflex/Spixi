/**
 * c-txlist-item — wallet transaction row (docs/tx-row-spec.md, DECISIONS #55).
 * Mirrors Figma tx list-chat type=sent|received|pending|failed; interaction
 * states are code-first (#43 coverage — Figma rows are static).
 * Bridge: addPaymentActivity(txid, received, counterparty, time, amount, fiat,
 * confirmed) — amount/fiat arrive pre-formatted, component stays dumb.
 *
 * createTxItem({ txid, direction = 'out'|'in', status = 'confirmed'|'pending'|
 *                'failed', name, timestamp, timeText, amount, fiat, onClick, strings })
 *
 * ★ S20 J2 (#1440) — the WALLET mode, opted into by the wallet list (renderWalletTxList):
 *   face = { src, name, address, group, unknown } → a 44 px avatar (photo / monogram / group
 *     avatar; unknown = the wallet glyph on a tonal disc) + a 20 px direction badge, in place
 *     of the 48 px arrow circle. Without `face` (chat-info, demos) the arrow circle stays.
 *   unit = 'IXI' → a real minus (U+2212) on the amount + fiat and the muted unit after it.
 *   timeOnly → the day sits in the list's group header, the row shows the time alone.
 *
 * timestamp = epoch ms → formatted via formatTxTimestamp (relative/locale, preferred).
 * timeText  = a PRE-FORMATTED display string shown verbatim (native-bridge path:
 *   addPaymentActivity ships an already-humanized time string, not epoch — see
 *   docs/be-cutover-brief "Other shells" W1). When both are present, timeText wins.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createBadge } from './badge.js';
import { createAvatar } from './avatar.js';
import { formatTxTimestamp, docLocale, timeOpts } from './timestamp.js';

const BADGES = {
  pending: { type: 'warning', glyph: 'clock-hour-10', label: 'Pending', key: 'txPending' },
  failed: { type: 'error', glyph: 'alert-square-rounded', label: 'Failed', key: 'txFailed' },
  // unknown = chain read hasn't confirmed the tx state; give the row a visible
  // status affordance (legacy showed a fa-question-circle). Mirrors the detail
  // sheet's STATUS_META.unknown (wallet-shell.js).
  unknown: { type: 'info', glyph: 'hourglass-empty', label: 'Unknown', key: 'txUnknown' },
};

/* ★★ #1008 (U-04, Damir 2026-09-28): in a narrow desktop list pane the status badge and the
 * date shared one line and BOTH ellipsized ("Pen…", "Sep 25, 11…"). Measure, don't guess
 * (the #278 approach): ONE shared ResizeObserver watches every meta line that carries a
 * badge; when the line cannot hold the badge's full word AND the whole date, it flips
 * `data-compact` and the badge shows its icon only — the word stays in the accessible
 * name (the label is visually hidden, not removed) and in `title`. It flips back once the
 * line is wide enough for the FULL pair again (the width recorded at the flip, so there is
 * no flicker at the boundary). No ResizeObserver (old engine) = today's behaviour. */
let txMetaRO = null;
function txMetaFit(meta) {
  const label = meta.querySelector('.c-badge__label');
  const time = meta.querySelector('.c-txlist-item__time');
  if (!label) return;
  const avail = meta.clientWidth;
  if (!avail) return;                                      // detached / display:none — skip
  if (meta.dataset.compact !== undefined) {
    if (avail >= (Number(meta.dataset.fullWidth) || Infinity)) {
      delete meta.dataset.compact;
      const bd = label.closest('.c-badge');
      if (bd) bd.removeAttribute('title');   // the word is visible again — no duplicate announcement (r1 NIT)
    }
    return;
  }
  const clipped = label.scrollWidth > label.clientWidth + 1 || (time && time.scrollWidth > time.clientWidth + 1);
  if (!clipped) return;
  const badge = label.closest('.c-badge');
  const gap = parseFloat(getComputedStyle(meta).columnGap) || 0;
  const need = badge.offsetWidth + (label.scrollWidth - label.clientWidth) + (time ? gap + time.scrollWidth : 0);
  meta.dataset.fullWidth = String(Math.ceil(need));
  meta.dataset.compact = '';
  badge.title = label.textContent;   // the word for the pointer while only the icon shows
}
/* ⚠ #1012 (Opus r1 m3): the wallet list is torn down and rebuilt on every flush, and ONE
   module-level observer would keep every detached meta reachable on engines that do not drop
   them. Every observed line is tracked and the DISCONNECTED ones are unobserved on each batch
   and on each new watch — growth is bounded by one render's worth of rows. */
/* ⚠ Only a line that has BEEN attached (seen connected in a callback) is swept: rows are
   CREATED before the list appends them, so "not connected yet" must not read as "torn down". */
/* ★ #1013 (r2 n3): a row CREATED and never appended was never "seen", so it stayed observed for
   ever. Each watch is stamped; an unseen line still detached TX_META_GRACE_MS after its watch is
   dropped too — a list builds and attaches its rows in one task, far inside the grace. */
const TX_META_GRACE_MS = 5000;
const txMetaWatched = new Map();   // meta → watch time
const txMetaSeen = new WeakSet();
const txNow = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
function sweepTxMeta() {
  const now = txNow();
  for (const [m, at] of txMetaWatched) {
    if (!m.isConnected && (txMetaSeen.has(m) || now - at > TX_META_GRACE_MS)) { txMetaRO.unobserve(m); txMetaWatched.delete(m); }
  }
}
function watchTxMeta(meta) {
  if (!txMetaRO && typeof ResizeObserver !== 'function') return;
  if (!txMetaRO) txMetaRO = new ResizeObserver((entries) => {
    for (const e of entries) { if (e.target.isConnected) txMetaSeen.add(e.target); txMetaFit(e.target); }
    sweepTxMeta();
  });
  sweepTxMeta();
  txMetaWatched.set(meta, txNow());
  txMetaRO.observe(meta);
}

const realMinus = (s) => String(s == null ? '' : s).replace(/^-/, '\u2212');
/* ★ S20 J2 (#1440): the time alone — the day is the group header's (wallet-shell txDayLabel) */
function txTimeOnly(ts) {
  const d = new Date(ts);
  return isNaN(d) ? '' : d.toLocaleTimeString(docLocale(), timeOpts({ hour: 'numeric' }));
}

export function createTxItem({
  txid = '', direction = 'out', status = 'confirmed',
  name = '', timestamp, timeText, amount = '', fiat = '', onClick, strings = getStrings(),
  face = null, unit = '', timeOnly = false,
} = {}) {
  // visual type: pending/failed override the direction presentation
  const type = status !== 'confirmed' ? status : (direction === 'in' ? 'received' : 'sent');

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'c-txlist-item';
  el.dataset.type = type;
  if (txid) el.dataset.txid = txid;

  // labeled, not aria-hidden: direction is otherwise color/icon-only (amount
  // signs aren't guaranteed — failed rows ship unsigned per Figma)
  const dirIcon = (size) => icon(direction === 'in' ? 'arrow-down-left' : 'arrow-up-right', {
    size, label: direction === 'in' ? (strings.received || 'Received') : (strings.sent || 'Sent'),
  });
  if (face) {
    // ★ S20 J2 (#1440): WHO first — the counterparty's face, the direction as a badge on it
    const lead = document.createElement('span');
    lead.className = 'c-txlist-item__face';
    el.dataset.direction = direction;   // the badge colour follows the direction, a pending receive included
    if (face.unknown) {
      const disc = document.createElement('span');
      disc.className = 'c-txlist-item__wallet';
      disc.append(icon('wallet', { size: 24 }));
      lead.append(disc);
    } else {
      lead.append(createAvatar({ src: face.src || null, name: face.name || '', address: face.address || '', size: 44, group: !!face.group }));
    }
    const badge = document.createElement('span');
    badge.className = 'c-txlist-item__dir';
    badge.append(dirIcon(12));
    lead.append(badge);
    el.append(lead);
  } else {
    const circle = document.createElement('span');
    circle.className = 'c-txlist-item__direction';
    circle.append(dirIcon(24));
    el.append(circle);
  }

  const content = document.createElement('span');
  content.className = 'c-txlist-item__content';
  const nameEl = document.createElement('span');
  nameEl.className = 'c-txlist-item__name';
  nameEl.textContent = name;
  content.append(nameEl);

  const row2 = document.createElement('span');
  row2.className = 'c-txlist-item__meta';
  const b = BADGES[status];
  if (b) {
    const word = strings[b.key] || b.label;
    const badge = createBadge({ label: word, type: b.type, weight: 'tonal', icon: b.glyph });
    row2.append(badge);   // ★ #1008: `title` is set only while the chip is icon-only (txMetaFit) — never beside a visible word
  }
  const timeStr = (timeText != null && timeText !== '')
    ? timeText
    : (timestamp != null ? (timeOnly ? txTimeOnly(timestamp) : formatTxTimestamp(timestamp)) : null);
  if (timeStr) {
    const time = document.createElement('span');
    time.className = 'c-txlist-item__time u-tabular';
    time.textContent = timeStr;
    row2.append(time);
  }
  content.append(row2);
  el.append(content);
  if (b) watchTxMeta(row2);

  const right = document.createElement('span');
  right.className = 'c-txlist-item__amounts';
  const amountEl = document.createElement('span');
  amountEl.className = 'c-txlist-item__amount u-tabular';
  // ★ S20 J2 (#1440): wallet mode — a real minus (U+2212), and the unit after the amount
  amountEl.textContent = unit ? realMinus(amount) : amount;
  if (unit && amount) {
    const u = document.createElement('span');
    u.className = 'c-txlist-item__unit';
    u.textContent = ' ' + unit;
    amountEl.append(u);
  }
  const fiatEl = document.createElement('span');
  fiatEl.className = 'c-txlist-item__fiat u-tabular';
  fiatEl.textContent = unit ? realMinus(fiat) : fiat;
  right.append(amountEl, fiatEl);
  el.append(right);

  if (onClick) el.addEventListener('click', onClick);
  return el;
}
