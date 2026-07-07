/**
 * c-wallet-shell — Wallet flow shell, slice 1 (spec docs/wallet-shell-spec.md, #133/#134):
 * tx MODEL + render pipeline, filter chips (All/Sent/Received) with the #98
 * "Missing a transaction?" info pill at the row end, c-txlist-item rows (#55),
 * the tx-detail BOTTOM SHEET (Damir) and the missing-tx explainer sheet.
 *
 * Model tx: { txid, direction:'in'|'out', status:'confirmed'|'pending'|'failed'|'unknown',
 *             name, contact?, address?, timestamp, amount, fiat, fee? }
 *   status mirrors the legacy confirmation enum (true→confirmed / false→pending /
 *   error→failed / unknown). amount/fiat/fee arrive PRE-FORMATTED (#55/#77); rows
 *   render only when the field is present (data-honest — addPaymentActivity carries
 *   no fee today: §9 ask = extend the payload or a detail fetch). `contact:true` (or a
 *   name distinct from the address) personalizes the sheet with the deterministic
 *   avatar (Damir 2026-07-05).
 * state: { txs: [], filter: 'all'|'sent'|'received' }
 *
 * Explorer links (legacy parity): address-level = `ixian:explorer` → explorer.ixian.io
 * address view; tx-level mirrors WalletSentPage's viewexplorer URL. The shell routes
 * BOTH through the external-link confirm and fires the bridge intent via
 * opts.onExplorer(txOrNull). Naming follows the legacy lang keys ("Explorer").
 *
 * createWalletTxList(state, opts) / renderWalletTxList(listEl, state, opts)
 * setWalletFilter(listEl, state, filter, opts) — free fn (#44)
 * createWalletFilters(state, { listEl, host, strings, onExplorer }) → row
 * openTxSheet({ tx, host, strings, onExplorer }) / openMissingTxSheet({ host, strings, onExplorer })
 */
import { getStrings } from './strings-runtime.js';
import { createTxItem } from './txlist-item.js';
import { createChip, setChipSelected } from './chip.js';
import { createButton } from './button.js';
import { createBadge } from './badge.js';
import { createAvatar } from './avatar.js';
import { createSearchField } from './search-field.js';
import { setWalletHeroCompact } from './wallet-hero.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { formatTxTimestamp } from './timestamp.js';
import { icon } from './icons.js';

/* ————————————————————————— model (pure, DOM-free) ————————————————————————— */

/** Sent = everything outgoing incl. pending/failed — the status badge carries the
 *  caveat (Damir decided 2026-07-05: failed attempts LIST under "Sent"; users look
 *  for "that send I tried" there, hiding them makes failures invisible). */
export function txMatchesFilter(tx, filter) {
  if (!tx) return false;
  if (filter === 'sent') return tx.direction !== 'in';
  if (filter === 'received') return tx.direction === 'in';
  return true;
}

/** Frontend tx search (#52 boundary: list-level only — everything the WebView holds):
 *  counterparty name, address, txid. Empty/whitespace needle matches all. */
export function txMatchesQuery(tx, needle) {
  const q = (needle || '').trim().toLocaleLowerCase();
  if (!q) return true;
  if (!tx) return false;
  if ((tx.name || '').toLocaleLowerCase().includes(q)) return true;
  if ((tx.address || '').toLocaleLowerCase().includes(q)) return true;
  return (tx.txid || '').toLocaleLowerCase().includes(q);
}

export function orderedTxs(state) {
  return (state.txs || [])
    .filter(Boolean)
    .filter((t) => txMatchesFilter(t, state.filter || 'all'))
    .filter((t) => txMatchesQuery(t, state.query));
}

/* ————————————————————————————— tx list ————————————————————————————— */

function walletEmpty(state, strings) {
  const el = document.createElement('div');
  el.className = 'c-wallet-empty';
  el.setAttribute('role', 'note');
  const q = (state.query || '').trim();
  const f = state.filter || 'all';
  el.textContent = q ? (strings.walletEmptySearch || 'No transactions match “{q}”').split('{q}').join(q)
    : f === 'sent' ? (strings.walletEmptySent || 'No sent payments yet')
    : f === 'received' ? (strings.walletEmptyReceived || 'No received payments yet')
    : (strings.walletEmptyAll || 'No activity yet — payments you send and receive show up here');
  return el;
}

export function renderWalletTxList(listEl, state, opts = {}) {
  const strings = opts.strings || getStrings();
  listEl.textContent = '';
  const txs = orderedTxs(state);
  for (const tx of txs) {
    listEl.append(createTxItem({
      ...tx, strings,
      onClick: () => openTxSheet({ tx, host: opts.host, strings, onExplorer: opts.onExplorer }),
    }));
  }
  if (!txs.length) listEl.append(walletEmpty(state, strings));
  return listEl;
}

export function createWalletTxList(state, opts = {}) {
  const el = document.createElement('div');
  el.className = 'c-wallet-txlist';
  renderWalletTxList(el, state, opts);
  return el;
}

/** Free fn (#44): switch the filter and re-render. */
export function setWalletFilter(listEl, state, filter, opts) {
  state.filter = filter === 'sent' || filter === 'received' ? filter : 'all';
  return renderWalletTxList(listEl, state, opts);
}

/** Free fn (#44): set the search query and re-render. */
export function setWalletQuery(listEl, state, query, opts) {
  state.query = query;
  return renderWalletTxList(listEl, state, opts);
}

/** Brief highlight on a just-landed row (Damir #136): the send flow returns home and the
 *  fresh pending tx pulses once (~2s wash) so the eye lands on it. Reduced motion skips
 *  the animation (explicit @media escape, #117 raw-keyframe precedent). */
export function flashWalletTx(listEl, txid) {
  if (!listEl || txid == null) return null;
  const esc = window.CSS && CSS.escape ? CSS.escape(String(txid)) : String(txid).replace(/"/g, '\\"');
  const row = listEl.querySelector('.c-txlist-item[data-txid="' + esc + '"]');
  if (!row) return null;
  row.dataset.flash = '';
  row.addEventListener('animationend', () => { delete row.dataset.flash; }, { once: true });
  setTimeout(() => { delete row.dataset.flash; }, 2400);   // reduced-motion/no-animation fallback cleanup
  return row;
}

/* —————————————————— filter chips + "Missing a transaction?" —————————————————— */

const FILTERS = [
  { id: 'all', label: 'All', key: 'filterAll' },
  { id: 'sent', label: 'Sent', key: 'filterSent' },
  { id: 'received', label: 'Received', key: 'filterReceived' },
];

export function createWalletFilters(state, opts = {}) {
  const strings = opts.strings || getStrings();
  const row = document.createElement('div');
  row.className = 'c-wallet-filters';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', strings.filterTx || 'Filter transactions');
  const chips = FILTERS.map((f) => createChip({
    label: strings[f.key] || f.label,
    selected: (state.filter || 'all') === f.id,
    onClick: (e) => {
      for (const c of row.querySelectorAll('.c-chip')) setChipSelected(c, c === e.currentTarget);
      if (opts.listEl) setWalletFilter(opts.listEl, state, f.id, opts);
      if (opts.onFilter) opts.onFilter(f.id);
    },
    strings,
  }));
  row.append(...chips);

  // #98: standing quiet affordance for the chain-read-lag property; sits at the row END,
  // action-tonal so it owns the wash (chips stay neutral-outline unselected). Narrow
  // contexts collapse it to the ⓘ glyph alone (CSS; aria-label carries the name).
  const miss = document.createElement('button');
  miss.type = 'button';
  miss.className = 'c-wallet-misstx';
  miss.append(icon('info-circle', { size: 16 }));
  const mlabel = document.createElement('span');
  mlabel.className = 'c-wallet-misstx__label';
  mlabel.textContent = strings.missingTx || 'Missing a transaction?';
  miss.append(mlabel);
  miss.setAttribute('aria-label', strings.missingTx || 'Missing a transaction?');
  miss.addEventListener('click', () => openMissingTxSheet({
    host: opts.host, strings, onExplorer: opts.onExplorer,
  }));
  row.append(miss);
  return row;
}

/* ———————————— tools block (search + filters) + scroll UX (#134 Damir) ———————————— */

/** Sticky tools: c-search-field (FE search: names/addresses/txids) above the filter
 *  row. Sits at the top of the scroll container; attachWalletScroll hides/reveals it. */
export function createWalletTools(state, opts = {}) {
  const strings = opts.strings || getStrings();
  const el = document.createElement('div');
  el.className = 'c-wallet-tools';
  const search = createSearchField({
    placeholder: strings.searchTx || 'Search transactions',
    onInput: (v) => { if (opts.listEl) setWalletQuery(opts.listEl, state, v, opts); },
    strings,
  });
  el.append(search, createWalletFilters(state, opts));
  return el;
}

/** Scroll choreography (Damir #134, the #113/#114 family — binary triggered CSS
 *  transitions, no scroll-linked per-frame writes):
 *  · scroll DOWN past `collapseAt` → hero minimizes (compact title+balance) and,
 *    past a small accumulated delta, the tools row tucks away → single-page tx list
 *  · a brief scroll UP (≥ `reveal` px accumulated) → tools return (search + filters)
 *  · at the absolute top → hero expands again
 *  Guards: tools never hide while they hold focus or a non-empty query (the user is
 *  mid-search). Returns detach().
 */
export function attachWalletScroll(scrollEl, { hero, tools, collapseAt = 120, reveal = 24 } = {}) {
  let last = scrollEl.scrollTop || 0;
  let up = 0;

  const toolsBusy = () => {
    if (!tools) return false;
    if (tools.contains(document.activeElement)) return true;
    const input = tools.querySelector('input');
    return !!(input && input.value.trim());
  };
  const setTools = (hiddenFlag) => {
    if (!tools) return;
    if (hiddenFlag) {
      if (toolsBusy()) return;
      tools.dataset.hidden = '';
      tools.setAttribute('aria-hidden', 'true');
      if ('inert' in tools) tools.inert = true;
      for (const f of tools.querySelectorAll('button, input')) f.tabIndex = -1;
    } else {
      delete tools.dataset.hidden;
      tools.removeAttribute('aria-hidden');
      if ('inert' in tools) tools.inert = false;
      for (const f of tools.querySelectorAll('button, input')) f.removeAttribute('tabindex');
    }
  };

  const onScroll = () => {
    const top = scrollEl.scrollTop;
    const d = top - last;
    last = top;
    if (top <= 1) {                                      // absolute top → everything back
      if (hero) setWalletHeroCompact(hero, false);
      setTools(false);
      up = 0;
      return;
    }
    if (d > 0) {                                         // downward
      up = 0;
      if (top > collapseAt) {
        if (hero) setWalletHeroCompact(hero, true);
        setTools(true);
      }
    } else if (d < 0) {                                  // upward — brief pull reveals tools
      up += -d;
      if (up >= reveal) setTools(false);
    }
  };
  scrollEl.addEventListener('scroll', onScroll, { passive: true });
  return () => scrollEl.removeEventListener('scroll', onScroll);
}

/* ————————————————————————— shared bits ————————————————————————— */

/** Copy button with the member-sheet clipboard + check-morph pattern (audit #134①). */
function copyButton(value, label, strings = getStrings()) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'c-txsheet__copy';
  const idleLabel = (strings.copy || 'Copy') + ' — ' + label;
  btn.setAttribute('aria-label', idleLabel);
  btn.append(icon('copy', { size: 16 }));
  btn.addEventListener('click', () => {
    if (navigator.clipboard) navigator.clipboard.writeText(String(value)).catch(() => {});
    btn.textContent = '';
    btn.append(icon('check', { size: 16 }));               // confirmation morph — no false toast
    btn.setAttribute('aria-label', strings.txCopied || 'Copied');   // SRs hear the confirm
    setTimeout(() => {
      btn.textContent = '';
      btn.append(icon('copy', { size: 16 }));
      btn.setAttribute('aria-label', idleLabel);
    }, 1400);
  });
  return btn;
}

/** Latch a sheet-closing bridge intent so the exit transition can't re-fire it (#72④). */
function latched(sheetRef, fn) {
  return (e) => {
    const b = e.currentTarget;
    if (b.dataset.acted !== undefined) return;
    b.dataset.acted = '';
    b.disabled = true;
    closeSheet(sheetRef());
    fn();
  };
}

const STATUS_META = {
  confirmed: { label: 'Confirmed', key: 'txConfirmed', type: 'success', glyph: 'checks' },
  pending: { label: 'Pending', key: 'txPending', type: 'warning', glyph: 'clock-hour-10' },
  failed: { label: 'Failed', key: 'txFailed', type: 'error', glyph: 'alert-square-rounded' },
  unknown: { label: 'Unknown', key: 'txUnknown', type: 'info', glyph: 'hourglass-empty' },   // badge types: warning|error|info|success|accent (#54)
};

/* ————————————————————————— tx detail sheet (Damir: bottom sheet) ————————————————————————— */

function sheetRow(label, value) {
  if (value == null || value === '') return null;
  const r = document.createElement('div');
  r.className = 'c-txsheet__row';
  const l = document.createElement('span');
  l.className = 'c-txsheet__rowlabel';
  l.textContent = label;
  const v = document.createElement('span');
  v.className = 'c-txsheet__rowvalue u-tabular';
  v.textContent = String(value);
  r.append(l, v);
  return r;
}

export function openTxSheet({ tx = {}, host, strings = getStrings(), onExplorer } = {}) {
  const status = STATUS_META[tx.status] ? tx.status : 'unknown';
  const meta = STATUS_META[status];
  const type = status !== 'confirmed' ? status : (tx.direction === 'in' ? 'received' : 'sent');
  const isContact = !!tx.contact || (!!tx.name && !!tx.address && tx.name !== tx.address);

  const content = document.createElement('div');
  content.className = 'c-txsheet';

  /* header — contact avatar personalizes when we know the counterparty (Damir #134);
     otherwise the direction circle carries the identity slot */
  const head = document.createElement('div');
  head.className = 'c-txsheet__head';
  if (isContact) {
    head.append(createAvatar({ name: tx.name, address: tx.address, size: 48 }));
  } else {
    const dir = document.createElement('span');
    dir.className = 'c-txsheet__dir';
    dir.dataset.type = type;
    dir.append(icon(tx.direction === 'in' ? 'arrow-down-left' : 'arrow-up-right', { size: 24 }));
    head.append(dir);
  }
  const htext = document.createElement('div');
  htext.className = 'c-txsheet__headtext';
  const title = document.createElement('h2');
  title.className = 'c-txsheet__title';
  title.textContent = tx.direction === 'in'
    ? (isContact ? ((strings.receivedFrom || 'Received from {name}').split('{name}').join(tx.name)) : (strings.received || 'Received'))
    : (isContact ? ((strings.sentTo || 'Sent to {name}').split('{name}').join(tx.name)) : (strings.sent || 'Sent'));
  htext.append(title);
  head.append(htext);
  head.append(createBadge({ label: strings[meta.key] || meta.label, type: meta.type, weight: 'tonal', icon: meta.glyph }));
  content.append(head);

  /* amount */
  const amt = document.createElement('div');
  amt.className = 'c-txsheet__amount u-tabular';
  amt.dataset.type = type;
  amt.textContent = tx.amount || '';
  content.append(amt);
  if (tx.fiat) {
    const fiat = document.createElement('div');
    fiat.className = 'c-txsheet__fiat u-tabular';
    fiat.textContent = tx.fiat;
    content.append(fiat);
  }

  /* address — member-sheet addr-chip pattern (#99): FULL address, wrapping, working copy.
     Labelled by WHOSE address it is (Damir #135): received → sender's, sent → recipient's. */
  if (tx.address) {
    const addrLabel = document.createElement('div');
    addrLabel.className = 'c-txsheet__addrlabel';
    addrLabel.textContent = tx.direction === 'in'
      // #171: curly apostrophe — matches the dictionary-wide typographic ’ (was ASCII ')
      ? (strings.senderAddress || 'Sender’s address')
      : (strings.recipientAddress || 'Recipient’s address');
    const addrRow = document.createElement('div');
    addrRow.className = 'c-txsheet__addr';
    const addr = document.createElement('span');
    addr.className = 'c-txsheet__addrvalue u-tabular';
    addr.textContent = tx.address;
    addrRow.append(addr, copyButton(tx.address, addrLabel.textContent, strings));
    content.append(addrLabel, addrRow);
  }

  /* meta — rows render only when the bridge provided the field (data-honest);
     Status always renders (legacy confirmation enum incl. unknown, Damir #134) */
  const metaBox = document.createElement('div');
  metaBox.className = 'c-txsheet__meta';
  const rows = [
    sheetRow(strings.status || 'Status', strings[meta.key] || meta.label),
    // timeText = pre-formatted native-bridge time string (verbatim); timestamp = epoch (formatted)
    sheetRow(strings.date || 'Date',
      (tx.timeText != null && tx.timeText !== '') ? tx.timeText
        : (tx.timestamp != null ? formatTxTimestamp(tx.timestamp) : '')),
  ].filter(Boolean);
  if (tx.fee != null && tx.fee !== '') {
    // fee row carries an ⓘ that reveals a one-line explanation (Damir #135)
    const feeRow = sheetRow(strings.fee || 'Fee', tx.fee);
    const feeExplain = document.createElement('p');
    feeExplain.className = 'c-txsheet__explain';
    feeExplain.setAttribute('role', 'status');           // announced when filled (polite)
    const feeInfo = document.createElement('button');
    feeInfo.type = 'button';
    feeInfo.className = 'c-txsheet__info';
    feeInfo.setAttribute('aria-label', strings.whatsThisFee || 'What is this fee?');
    feeInfo.setAttribute('aria-expanded', 'false');      // disclosure state for AT (audit n1)
    feeInfo.append(icon('info-circle', { size: 14 }));
    feeInfo.addEventListener('click', () => {
      const open = !feeExplain.textContent;
      feeExplain.textContent = open
        ? (strings.feeExplain || 'Network fee — paid to the Ixian network for processing this transaction, not to Spixi.')
        : '';
      feeInfo.setAttribute('aria-expanded', String(open));
    });
    feeRow.querySelector('.c-txsheet__rowlabel').append(feeInfo);
    feeRow.append(feeExplain);
    feeRow.classList.add('c-txsheet__row--fee');
    rows.push(feeRow);
  }
  if (tx.txid) {
    const idRow = sheetRow(strings.txId || 'Transaction ID', tx.txid);
    idRow.append(copyButton(tx.txid, strings.txId || 'Transaction ID', strings));
    rows.push(idRow);
  }
  metaBox.append(...rows);
  content.append(metaBox);

  /* explorer — routes through the external-link confirm in the shell (onExplorer duty) */
  if (onExplorer) {
    content.append(createButton({
      label: strings.viewExplorer || 'View in Explorer', type: 'outline', size: 44, width: 'full',
      icon: icon('arrow-up-right', { size: 18 }), iconPosition: 'trailing',
      onClick: latched(() => sheet, () => onExplorer(tx)),
    }));
  }

  const sheet = createSheet({ content, host, strings, title: '' });   // head carries the identity
  sheet.setAttribute('aria-label', strings.txDetails || 'Transaction details');
  openSheet(sheet);
  return sheet;
}

/* ————————————————————— missing-tx explainer sheet (#98) ————————————————————— */

export function openMissingTxSheet({ host, strings = getStrings(), onExplorer } = {}) {
  const content = document.createElement('div');
  content.className = 'c-misstx';
  const body = document.createElement('p');
  body.className = 'c-misstx__body';
  body.textContent = strings.missingTxBody
    || 'Spixi reads your history directly from the Ixian blockchain — recent transactions can take a moment to appear, and very old ones may not be listed here.';
  content.append(body);

  const actions = document.createElement('div');
  actions.className = 'c-misstx__actions';
  // single action — no refresh command exists in the bridge (Damir #135); the list
  // already rebuilds on every addPaymentActivity tick
  if (onExplorer) {
    // legacy parity: `ixian:explorer` opens THIS address on explorer.ixian.io
    actions.append(createButton({
      label: strings.viewAllExplorer || 'View all transactions on Explorer', type: 'fill', size: 44, width: 'full',
      icon: icon('arrow-up-right', { size: 18 }), iconPosition: 'trailing',
      onClick: latched(() => sheet, () => onExplorer(null)),
    }));
  }
  content.append(actions);

  const sheet = createSheet({
    content, host, strings,
    title: strings.missingTx || 'Missing a transaction?',   // sheet title = accessible name
  });
  openSheet(sheet);
  return sheet;
}
