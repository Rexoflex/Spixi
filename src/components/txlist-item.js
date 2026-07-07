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
 * timestamp = epoch ms → formatted via formatTxTimestamp (relative/locale, preferred).
 * timeText  = a PRE-FORMATTED display string shown verbatim (native-bridge path:
 *   addPaymentActivity ships an already-humanized time string, not epoch — see
 *   docs/be-cutover-brief "Other shells" W1). When both are present, timeText wins.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createBadge } from './badge.js';
import { formatTxTimestamp } from './timestamp.js';

const BADGES = {
  pending: { type: 'warning', glyph: 'clock-hour-10', label: 'Pending', key: 'txPending' },
  failed: { type: 'error', glyph: 'alert-square-rounded', label: 'Failed', key: 'txFailed' },
  // unknown = chain read hasn't confirmed the tx state; give the row a visible
  // status affordance (legacy showed a fa-question-circle). Mirrors the detail
  // sheet's STATUS_META.unknown (wallet-shell.js).
  unknown: { type: 'info', glyph: 'hourglass-empty', label: 'Unknown', key: 'txUnknown' },
};

export function createTxItem({
  txid = '', direction = 'out', status = 'confirmed',
  name = '', timestamp, timeText, amount = '', fiat = '', onClick, strings = getStrings(),
} = {}) {
  // visual type: pending/failed override the direction presentation
  const type = status !== 'confirmed' ? status : (direction === 'in' ? 'received' : 'sent');

  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'c-txlist-item';
  el.dataset.type = type;
  if (txid) el.dataset.txid = txid;

  const circle = document.createElement('span');
  circle.className = 'c-txlist-item__direction';
  // labeled, not aria-hidden: direction is otherwise color/icon-only (amount
  // signs aren't guaranteed — failed rows ship unsigned per Figma)
  circle.append(icon(direction === 'in' ? 'arrow-down-left' : 'arrow-up-right', {
    size: 24,
    label: direction === 'in' ? (strings.received || 'Received') : (strings.sent || 'Sent'),
  }));
  el.append(circle);

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
    row2.append(createBadge({
      label: strings[b.key] || b.label, type: b.type, weight: 'tonal', icon: b.glyph,
    }));
  }
  const timeStr = (timeText != null && timeText !== '')
    ? timeText
    : (timestamp != null ? formatTxTimestamp(timestamp) : null);
  if (timeStr) {
    const time = document.createElement('span');
    time.className = 'c-txlist-item__time u-tabular';
    time.textContent = timeStr;
    row2.append(time);
  }
  content.append(row2);
  el.append(content);

  const right = document.createElement('span');
  right.className = 'c-txlist-item__amounts';
  const amountEl = document.createElement('span');
  amountEl.className = 'c-txlist-item__amount u-tabular';
  amountEl.textContent = amount;
  const fiatEl = document.createElement('span');
  fiatEl.className = 'c-txlist-item__fiat u-tabular';
  fiatEl.textContent = fiat;
  right.append(amountEl, fiatEl);
  el.append(right);

  if (onClick) el.addEventListener('click', onClick);
  return el;
}
