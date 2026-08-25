/**
 * c-wallet-shell — Wallet flow shell, slice 1 (spec docs/wallet-shell-spec.md, #133/#134):
 * tx MODEL + render pipeline, filter chips (All/Sent/Received) with the #98
 * "Missing a transaction?" info pill at the row end, c-txlist-item rows (#55),
 * the tx-detail BOTTOM SHEET (Damir) and the missing-tx explainer sheet.
 *
 * Model tx: { txid, direction:'in'|'out', status:'confirmed'|'pending'|'failed'|'unknown',
 *             name, contact?, address?, avatar?, timestamp, amount, fiat, fee? }
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
 *   opts.onTx(tx) — B3: host-routed row tap (production emits ixian:txdetails:
 *   <txid> → WalletSentPage detail page/pane); rows without a txid, and every
 *   caller that doesn't pass onTx (demos), keep the in-page bottom sheet.
 *   opts.onReceive() — the zero-state CTA. ⚠ #589: the production shell now points
 *     this at the ADDRESS SHEET, not at the Receive takeover — the button says "Show
 *     my address" and the takeover is a different promise (an amount field, a contact
 *     strip). The hero's own Receive action still opens the takeover. The old note:
 *     it used to open the SAME Receive surface the
 *   hero's Receive action opens (no new bridge verb). Omit it → no CTA.
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
import { createScanRing, setScanRing } from './scan-progress.js';   // #452: the sheet card's ring
import { setWalletHeroCompact } from './wallet-hero.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { formatTxTimestamp } from './timestamp.js';
import { icon } from './icons.js';
import { createEmptyState } from './empty-state.js';

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

/** TRUE zero state (no ledger at all) vs NO RESULTS (Sent/Received or a search
 *  matched nothing). Only the former gets the illustration + Receive CTA: under
 *  a "Sent" chip that found nothing, "get your first IXI" would be wrong advice.
 *
 *  ★ LOAD WINDOW GATE (shared with chats-shell/apps-shell). "No activity yet" +
 *  the illustration + "Show my address" is a CLAIM about the ledger, and the empty
 *  model between clearPaymentActivity and the addPaymentActivity burst (which has
 *  no done signal and is NOT reliably same-frame) is not that claim. `zeroReady:
 *  false` → return null, i.e. NO empty node at all: a blank beat, never a false
 *  claim. The host opens the gate once the surface has actually been given data —
 *  or has demonstrably settled with none. A Sent/Received chip or a search miss is
 *  a statement about the FILTER, not the ledger, so it is never gated.
 *  Returns null while gated. */
function walletEmpty(state, strings, opts = {}) {
  const q = (state.query || '').trim();
  const f = state.filter || 'all';
  if (!q && f === 'all') {
    if (opts.zeroReady === false) return null;      // ★ load window — say nothing yet
    return createEmptyState({
      /* ★ #453 (Damir on device): NO illustration on the wallet zero state. The hero
         already owns ~300px above this block, so the art pushed the one action that
         matters — "Show my address" — toward the bottom nav, and it said nothing the
         headline did not. A host that WANTS art can still pass `emptyArt` explicitly.

         ★ F5 (Damir on device 2026-08-21): and NO glyph tile either — "THE ICON MUST BE
         REMOVED, there's no glyph or illustration on wallet activity empty state."
         #453 dropped the art and left the tile standing in as its fallback. Passing no
         glyph is only safe because createEmptyState now drops the whole slot when it has
         neither: the bare `[data-placeholder]` is a 96×96 --surface-neutral-02 square,
         so removing this line alone would have swapped an icon for an empty grey box. */
      illustration: opts.emptyArt !== undefined ? opts.emptyArt : null,
      glyph: null,
      title: strings.walletEmptyAll || 'No activity yet',
      // ONE short line: the hero leaves ~360px for this whole block, and the second
      // sentence ("share your address…") only restated the CTA. In de-de it wrapped
      // to four lines and pushed "Show my address" clean under the bottom nav.
      body: strings.walletEmptyBody
        || 'Payments you send and receive show up here.',
      actionLabel: strings.walletEmptyCta || 'Show my address',
      actionIcon: 'qrcode',
      onAction: opts.onReceive,
      // The hero (balance + Send/Receive/Scan) already owns ~300px above this list,
      // so the FULL-height rhythm pushed the CTA under the bottom nav on a 390×844
      // phone — a zero state whose only action needs a scroll to find. compact is
      // the house answer for an in-list state (the contacts picker rides it too).
      compact: true,
    });
  }
  const el = document.createElement('div');
  el.className = 'c-wallet-empty';
  el.setAttribute('role', 'note');
  el.textContent = q ? (strings.walletEmptySearch || 'No transactions match “{q}”').split('{q}').join(q)
    : f === 'sent' ? (strings.walletEmptySent || 'No sent payments yet')
    : (strings.walletEmptyReceived || 'No received payments yet');
  return el;
}

export function renderWalletTxList(listEl, state, opts = {}) {
  const strings = opts.strings || getStrings();
  listEl.textContent = '';
  const txs = orderedTxs(state);
  for (const tx of txs) {
    listEl.append(createTxItem({
      ...tx, strings,
      // B3 (#256): opts.onTx routes a row tap to the host (production: the
      // ixian:txdetails:<txid> bridge round-trip → the wallet_sent.html detail
      // page/pane). A txid-less row keeps the in-page sheet — the detail page is
      // keyed by txid. Default (demos): the tx-detail bottom sheet, unchanged.
      // R6 (#314): opts.enrichTx(tx) → tx′ lets the host decorate the SHEET copy
      // at open time (roster join: avatar/nickname/address the addPaymentActivity
      // push doesn't carry). Open-time, not push-time: the roster may land after
      // the tx flush, and the hide mask must be read at the moment of opening.
      onClick: () => {
        const t = (typeof opts.enrichTx === 'function') ? (opts.enrichTx(tx) || tx) : tx;
        return (opts.onTx && t.txid)
          ? opts.onTx(t)
          : openTxSheet({ tx: t, host: opts.host, strings, onExplorer: opts.onExplorer });
      },
    }));
  }
  if (!txs.length) {
    const emptyEl = walletEmpty(state, strings, opts);
    if (emptyEl) listEl.append(emptyEl);           // null = gated load window (★)
  }
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
  miss.title = strings.missingTx || 'Missing a transaction?';   // #278: desktop hover keeps the wording when compacted
  miss.addEventListener('click', () => openMissingTxSheet({
    host: opts.host, strings, onExplorer: opts.onExplorer,
    // #440/#443: opts.scan is a GETTER, read at open time — the scan state moves while
    // the wallet is on screen, and a value captured at build time would go stale.
    scan: typeof opts.scan === 'function' ? opts.scan() : opts.scan,
  }));
  row.append(miss);
  // #278 (Damir F5: pill cut off in the desktop pane): the 360px viewport query
  // can't see PANE width (the window is wide, the wallet column isn't) and
  // container queries are off the conservative baseline (#4) — so collapse by
  // MEASUREMENT: when the row overflows with the label visible, drop to the
  // ⓘ-only chip (data-compact; aria-label + title carry the name). RO callbacks
  // run before paint and toggling the label never changes the row's own border-
  // box (nowrap flex row, width from the container) → no observer loop, no
  // flicker. No ResizeObserver (older WebView) → the media query stays the belt.
  if (typeof ResizeObserver === 'function') {
    const fit = () => {
      delete row.dataset.compact;                      // measure at natural width
      delete row.dataset.wrap;
      if (row.scrollWidth > row.clientWidth) row.dataset.compact = '';
      // #286 (Damir F5): ultra-narrow pane — the chips alone can fill the row, so
      // even the ⓘ-only chip overflowed and was clipped by the tools box. Second
      // escalation: wrap the pill onto its own right-aligned line (CSS data-wrap).
      // Reads force a sync reflow, so the post-compact measurement is accurate;
      // the height change re-fires the RO once, fit() recomputes to the same
      // state and settles (no loop — attrs end where the last paint left them).
      if (row.scrollWidth > row.clientWidth) {
        row.dataset.wrap = '';
        // #288 review: once wrapped, the pill owns a full-width line where the label fits
        // again — but data-compact stayed latched from the PRE-wrap measurement, so the row
        // rendered a lone ⓘ with the rest of the line blank and the affordance's NAME
        // invisible (which is the whole point of #98). Re-measure without it and only
        // re-compact if it STILL overflows. Terminates: the second measurement is taken in
        // the wrapped layout, and the attributes end where the last paint left them.
        delete row.dataset.compact;
        if (row.scrollWidth > row.clientWidth) row.dataset.compact = '';
      }
    };
    const ro = new ResizeObserver(fit);
    ro.observe(row);
    requestAnimationFrame(fit);                        // first layout (RO fires late on some engines)
  }
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
 *  transitions, no scroll-linked per-frame writes). Reworked for the wallet scroll
 *  oscillator (iOS-59 → the 2026-08-24 handoff §1; mechanism CONFIRMED with Damir;
 *  #46 loop round 1 reshaped the reserve — see below).
 *
 *  ★ THE MECHANISM THIS MUST DEFEAT: the hero is a SIBLING of the scroller, not a
 *  child. A collapse GROWS the scroller's viewport, so the maximum scroll offset
 *  (`scrollHeight − clientHeight`) DROPS by the hero delta. With a short list the
 *  content then fits entirely, `scrollTop` clamps to 0, and the old
 *  `top <= 1 → expand` read that clamp as "the user is at the top". Expand → the
 *  viewport shrinks → the content overflows → the user scrolls → collapse: a
 *  perfect oscillator. A long list overflows in both states, which is why nobody
 *  caught it.
 *
 *  Two parts, and BOTH are needed:
 *  · RESERVE THE HEIGHT — when the hero collapses, a spacer at the bottom of the
 *    scroller absorbs the drop so the maximum offset can never fall below the
 *    user's position. ★ #46 r1 (auditor A) reshaped this twice:
 *    (1) DEFICIT-SIZED, not full-delta. The reserve target is
 *        `clamp(0, top − maxPre + delta, delta)` — exactly what the clamp would
 *        have consumed, nothing more. A full-delta reserve kept the maximum
 *        INVARIANT, which sounds right and is not: it meant the compact state
 *        could never end closer to the content bottom than the expanded state,
 *        so EVERY list ended in ~a hero of blank when compact (r1 MAJOR-4). With
 *        the deficit the maximum never drops below `top`, a long list reserves
 *        ZERO, and a short list reserves only its own clamp depth — where the
 *        content already fits the grown viewport, so space under the last row is
 *        the ordinary short-list ground, not a defect. The collapse behaviour
 *        itself stays identical on every account (the dial); only the invisible
 *        pad size adapts.
 *    (2) TRACKED, not instant. The viewport grows over the 300 ms transition;
 *        landing the whole reserve at t=0 opened a reserve-wide scroll BULGE a
 *        fling walked into — blank space, then a clamp-back stall (r1 MAJOR-1,
 *        measured). A ResizeObserver on the HERO now feeds the reserve
 *        `min(target, expandedRest − heroHeight)` frame by frame — RO callbacks
 *        run after layout and before paint, so the maximum is right in every
 *        painted frame. No-RO engines fall back to the instant target: the
 *        bulge is bounded by the deficit there, and jsdom (which has no RO) is
 *        that fallback.
 *    The delta and rest heights are MEASURED from the element, never constants,
 *    and CACHED for 400 ms around a flip so a fast up-down flick cannot make the
 *    probe cut a running transition (r1 MINOR-6).
 *  · LATCH THE COLLAPSE — a scroll event in which the geometry
 *    (scrollHeight/clientHeight) changed is a LAYOUT consequence, never a finger.
 *    Such an event can neither collapse nor expand. Expansion needs a deliberate
 *    upward scroll that reaches the top. ★ r1 MINOR-5: a layout event re-syncs
 *    the geometry but KEEPS the gesture accumulators — they only ever grow from
 *    stable deltas, and a scanning wallet re-renders continuously, so resetting
 *    them made the hero uncollapsible for the whole scan.
 *
 *  · the collapse trigger is an accumulated DOWNWARD GESTURE (`collapseAfter` px),
 *    not an absolute offset. Damir's dial: "it should minimise the hero any time
 *    you scroll down, so it's always the same effect." An absolute threshold is
 *    account-size-dependent — a short list can never reach 120 px.
 *  ⚠ REJECTED, and the record is kept on purpose: "collapse only when there is
 *    enough content to absorb it". Same reason — different behaviour on different
 *    accounts. (The deficit reserve is NOT that alternative: the collapse always
 *    fires the same way; only the pad, which the user never sees, adapts.)
 *  · safety valve: when a re-render leaves NO scroll range at all, a gesture can
 *    never release the latch (no scroll events fire) → auto-expand. It cannot
 *    oscillate: with the reserve holding the maximum at ≥ the collapse position,
 *    a list that fits compact also fits expanded. Valve runs only AT REST (a
 *    flip < 400 ms ago means a transition is running and the transient numbers
 *    would lie).
 *  · ★ r1 MAJOR-2: attach and every at-top event can EXPAND a compact hero.
 *    A compact hero at scrollTop 0 has no gesture that can ever free it (no
 *    scroll events fire at the top of a fitting list), and its balance/actions
 *    are inert — so attach expands it when the scroller is at the top, and a
 *    zero-delta event at the top (the demo's programmatic top-restore) does too.
 *
 *  ⚠ ACCEPTED RESIDUAL (r1 MINOR-7, recorded): the reserve target is computed at
 *  collapse time. If the hero's EXPANDED rest height changes while it is compact
 *  (a balance wrapping to two lines, a font-scale change), the reserve is stale;
 *  the worst case is a spontaneous but benign expand via the valve on a tiny
 *  list, never a stuck state and never an oscillation.
 *
 *  · a brief scroll UP (≥ `reveal` px accumulated) → tools return (search+filters)
 *  Guards: tools never hide while they hold focus or a non-empty query (the user is
 *  mid-search). Returns detach().
 */
export function attachWalletScroll(scrollEl, { hero, tools, collapseAfter = 12, reveal = 24 } = {}) {
  let lastTop = scrollEl.scrollTop || 0;
  let lastS = scrollEl.scrollHeight;
  let lastV = scrollEl.clientHeight;
  let up = 0;
  let down = 0;

  const toolsBusy = () => {
    if (!tools) return false;
    if (tools.contains(document.activeElement)) return true;
    const input = tools.querySelector('input');
    return !!(input && input.value.trim());
  };
  /* ★ N43 (#443, Damir): the wallet SEARCH + FILTER row never hides. Same ruling as
   * the chats header — "always visible" — so the tuck-away half of this behaviour is
   * off while the HERO collapse (which he likes, and which is a different affordance)
   * stays. One flag from returning. */
  const N43_ALWAYS_VISIBLE = true;
  const setTools = (hiddenFlag) => {
    if (!tools) return;
    if (N43_ALWAYS_VISIBLE) {
      // Clear any tuck a previous build (or a previous attach) left behind, then stop.
      // Audit MINOR-12: onScroll calls this on every scroll event, so bail before the
      // querySelectorAll when there is nothing tucked (the normal case, forever).
      if (hiddenFlag || !('hidden' in tools.dataset)) return;
      delete tools.dataset.hidden;
      tools.removeAttribute('aria-hidden');
      if ('inert' in tools) tools.inert = false;
      for (const f of tools.querySelectorAll('button, input')) f.removeAttribute('tabindex');
      return;
    }
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

  setTools(false);   // N43: start (and stay) revealed, whatever a previous attach left

  /* — part (a): the reserve spacer. Idempotent across re-attach (demo re-wires). — */
  let reserveEl = null;
  for (const c of scrollEl.children) {
    if (c.classList && c.classList.contains('c-wallet-reserve')) { reserveEl = c; break; }
  }
  if (!reserveEl) {
    reserveEl = document.createElement('div');
    reserveEl.className = 'c-wallet-reserve';
    reserveEl.setAttribute('aria-hidden', 'true');
    scrollEl.append(reserveEl);
  }
  const reservePx = () => { const v = parseInt(reserveEl.style.height, 10); return v > 0 ? v : 0; };
  const applyReserve = (px) => { reserveEl.style.height = (px > 0 ? px : 0) + 'px'; };

  /* MEASURED, never guessed: toggle the attribute with transitions suppressed
   * ([data-measuring], wallet-hero.css), read both rest heights, restore. All
   * synchronous — no paint happens between the toggles. ★ r1 MINOR-6: cached for
   * 400 ms around a flip — a collapse ≤ 300 ms after an expand (the fast up-down
   * flick) would otherwise measure MID-TRANSITION, and [data-measuring] cancels
   * whatever is animating: a visible snap. ★ r1 MINOR-8: the attribute restore
   * lives in `finally`, so a future throw between the toggles cannot strand a
   * hero/latch desync. Returns { expanded, compact, delta }; zeros while not
   * laid out. */
  let lastFlipAt = -1e9;
  let cachedMeasure = null;
  const measureHero = (force) => {
    if (!hero || !hero.isConnected) return { expanded: 0, compact: 0, delta: 0 };
    if (!force && cachedMeasure && (performance.now() - lastFlipAt) < 400) return cachedMeasure;
    const wasCompact = 'compact' in hero.dataset;
    hero.dataset.measuring = '';
    let expanded = 0, compact = 0;
    try {
      delete hero.dataset.compact;
      expanded = hero.offsetHeight;
      hero.dataset.compact = '';
      compact = hero.offsetHeight;
    } finally {
      if (wasCompact) hero.dataset.compact = ''; else delete hero.dataset.compact;
      void hero.offsetHeight;             // settle layout BEFORE transitions come back
      delete hero.dataset.measuring;
    }
    cachedMeasure = { expanded, compact, delta: Math.max(0, expanded - compact) };
    return cachedMeasure;
  };

  /* — part (b): the latch. Initialized from the hero so a re-attach onto a compact
   *   hero does not desync (the shell detaches on tab switch, never expands). — */
  let collapsed = !!(hero && ('compact' in hero.dataset));
  let heroExpandedRest = 0;
  let reserveTarget = 0;

  const trackedReserve = () => {
    if (!hero) return reserveTarget;
    return Math.min(reserveTarget, Math.max(0, heroExpandedRest - hero.offsetHeight));
  };

  const collapse = () => {
    if (collapsed) return;
    collapsed = true;
    /* ★ r2 W-MAJOR-1: maxPre and top are read BEFORE the measurement probe runs —
     * the probe's attribute toggle + offsetHeight read force a REAL compact-hero
     * layout, and with no reserve under it that layout is exactly the clamp
     * geometry this fix exists to prevent (Blink clamps scrollTop at the end of
     * the probe's layout run, and the deficit was then computed from a destroyed
     * position: on a maxPre < delta account the very first collapse snapped the
     * list to the top and stranded a compact hero with zero range). */
    const maxPre = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    const top = Math.max(0, scrollEl.scrollTop);
    /* …and the probe gets a reserve FLOOR to stand on for its synchronous
     * microseconds: the cached delta when one exists, else the viewport height (a
     * safe over-approximation of any hero). Nothing paints mid-probe, so the
     * floor is unobservable; it is replaced by the tracked/deficit value below. */
    applyReserve((cachedMeasure && cachedMeasure.delta) || scrollEl.clientHeight || 300);
    const m = measureHero();
    if (m.expanded > 0) heroExpandedRest = m.expanded;
    /* ★ DEFICIT-SIZED (r1): only what the clamp would consume. */
    reserveTarget = Math.max(0, Math.min(m.delta, top - maxPre + m.delta));
    /* ★ TRACKED (r1): with a hero RO the reserve starts at 0 and follows the
     * shrinking hero frame by frame; without one it lands instantly (bounded by
     * the deficit). Reserve set BEFORE the flip either way, so the maximum never
     * dips below `top` in any painted frame. */
    applyReserve(heroRO ? trackedReserve() : reserveTarget);
    lastFlipAt = performance.now();
    /* r2 W-MINOR-3: a fresh compact state owes the NEXT collapse a fresh gesture —
     * see expand() for the 1px-re-collapse trace. */
    down = 0; up = 0;
    if (hero) setWalletHeroCompact(hero, true);
  };
  const expand = () => {
    if (!collapsed) return;
    collapsed = false;
    lastFlipAt = performance.now();
    /* ★ r2 W-MINOR-3: the gesture accumulators reset with the state. Four of the
     * five expand paths are not gestures (attach, the valve, the belt, the
     * zero-delta branch), and `down` still held ≥ collapseAfter from the collapse
     * — so ONE pixel of downward scroll after a valve expand re-collapsed the
     * hero, bypassing the dial entirely. */
    down = 0; up = 0;
    if (hero) setWalletHeroCompact(hero, false);
    /* removing the reserve while the viewport is still large can clamp — but expand
     * only ever runs at top ≤ 1 or with no scroll range, where a clamp is a no-op. */
    applyReserve(0);
    reserveTarget = 0;
  };

  /* Safety valve — see the docblock. `<= 1` not `<= 0`: sub-pixel rounding.
   * Rest-guarded (r1): transient mid-flip numbers must not trigger it.
   * ★ r2 W-MINOR-5: a refusal RE-CHECKS ITSELF at guard expiry — a no-range state
   * may never produce another event (type in the search box right after a
   * collapse: the belt fires once, is refused, and a zero-row list never resizes
   * again), and a valve that only listens is a valve that can be starved. */
  let valveRetry = 0;
  const releaseIfMoot = () => {
    if (!collapsed) return;
    if (scrollEl.scrollHeight - scrollEl.clientHeight > 1) return;
    const wait = 400 - (performance.now() - lastFlipAt);
    if (wait > 0) {
      clearTimeout(valveRetry);
      valveRetry = setTimeout(releaseIfMoot, wait + 16);
      return;
    }
    expand();
  };

  /* ★ r1 MAJOR-1: the hero RO — the reserve's frame-by-frame feed. Declared before
   * collapse() closes over it. Guarded: only while collapsed, and it never
   * re-measures (trackedReserve reads live offsetHeight against the cached rest). */
  let heroRO = null;
  if (hero && typeof ResizeObserver === 'function') {
    heroRO = new ResizeObserver(() => {
      /* r2 W-MINOR-4: heroExpandedRest 0 means "measured while hidden" — tracking
       * against it computes 0 and the observer's INITIAL observation would wipe a
       * reserve the attach path deliberately kept. */
      if (!collapsed || heroExpandedRest <= 0) return;
      applyReserve(trackedReserve());
    });
    heroRO.observe(hero);
  }

  /* ★ r1 MAJOR-2: attach onto a compact hero. Mid-list, keep the latch and make
   * sure the reserve exists (it may have been measured while hidden). At the top,
   * EXPAND — no gesture can ever free a compact hero at scrollTop 0 (a fitting
   * list fires no scroll events), and its balance/actions are inert. */
  if (collapsed) {
    if ((scrollEl.scrollTop || 0) <= 1) {
      expand();
    } else {
      const m = measureHero();
      if (m.expanded > 0) {
        heroExpandedRest = m.expanded;
        /* r2 W-MINOR-4: a reserve that survived the detach IS the deficit from its
         * own collapse — adopt it as the target, or the hero RO's initial
         * observation resets the layer to zero and re-opens the clamp. A zero
         * reserve here means the measurement ran while hidden last time:
         * conservative full delta. */
        reserveTarget = reservePx() > 0 ? reservePx() : m.delta;
        applyReserve(trackedReserve());
      }
      /* hidden (m.expanded 0): leave any kept reserve untouched; the belt
       * completes the state once the hero is laid out (heroExpandedRest stays 0,
       * which is the belt's sentinel — r2 W-MAJOR-2). */
    }
  }

  const onScroll = () => {
    const top = scrollEl.scrollTop;
    const S = scrollEl.scrollHeight;
    const V = scrollEl.clientHeight;
    const stable = (S === lastS && V === lastV);
    const d = top - lastTop;
    lastTop = top; lastS = S; lastV = V;
    if (!stable) {
      /* geometry moved in the same event → a clamp or a re-render, NOT a finger.
       * The old code read exactly this as "the user is at the top" and expanded —
       * that is the oscillator. Re-sync and check the no-range valve. The gesture
       * accumulators are KEPT (r1 MINOR-5): they only ever grow from stable
       * deltas, and a scanning wallet re-renders on every push. */
      releaseIfMoot();
      return;
    }
    if (d > 0) {                                         // downward gesture
      up = 0;
      /* top <= 0 means this delta is an overscroll rubber-band settling back to the
       * top (iOS reports negative scrollTop there) — a spring, not a finger. Counting
       * it would re-collapse the hero the instant an at-top expand let go. */
      if (top > 0) down += d; else down = 0;
      if (down >= collapseAfter) {
        collapse();
        setTools(true);                                  // N43 keeps this a no-op today
      }
    } else if (d < 0) {                                  // upward gesture
      down = 0; up += -d;
      if (up >= reveal) setTools(false);
      if (top <= 1) {                                    // a REAL arrival at the top
        expand();
        setTools(false);
      }
    } else if (top <= 1) {
      /* d === 0 at the top: a programmatic top-restore (the demo's showHome) or a
       * redundant event while parked there. A compact hero here is the stuck state
       * r1 MAJOR-2 names — release it. A stable zero-delta event is never a clamp
       * (a clamp changes geometry in the same event). */
      expand();
    }
  };
  scrollEl.addEventListener('scroll', onScroll, { passive: true });

  /* Belt for the latch: content can shrink UNDER a compact hero with scrollTop
   * already 0 (filter/search re-render) — no scroll event fires, the valve above
   * never runs, and the hero would be stuck compact with nothing to scroll.
   * ResizeObserver sees the re-render. Geometry re-sync only — the accumulators
   * are kept here too (r1 MINOR-5). */
  let ro = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(() => {
      lastTop = scrollEl.scrollTop; lastS = scrollEl.scrollHeight; lastV = scrollEl.clientHeight;
      /* ★ r2 W-MAJOR-2: the re-apply keys on heroExpandedRest === 0 — the "measured
       * while hidden" SENTINEL — never on reservePx() === 0. The r1 deficit made a
       * zero reserve a LEGITIMATE resting value (a long list's deficit is 0), and a
       * belt that read zero as "never applied" slammed the full delta onto every
       * long list on the first re-render after a collapse: r1 MAJOR-4, restored by
       * the fix for it. */
      if (collapsed && heroExpandedRest === 0 && (performance.now() - lastFlipAt) >= 400) {
        const m = measureHero();                       // attach-while-hidden completion
        if (m.expanded > 0) {
          heroExpandedRest = m.expanded;
          reserveTarget = m.delta;    // position at that collapse is unknowable — conservative
          applyReserve(trackedReserve());
        }
      }
      releaseIfMoot();
    });
    ro.observe(scrollEl);
    for (const c of scrollEl.children) { if (c !== reserveEl) ro.observe(c); }
  }

  return () => {
    scrollEl.removeEventListener('scroll', onScroll);
    clearTimeout(valveRetry); valveRetry = 0;
    if (ro) ro.disconnect();
    if (heroRO) heroRO.disconnect();
  };
}

/* ————————————————————————— shared bits ————————————————————————— */

/** Copy button with the member-sheet clipboard + check-morph pattern (audit #134①). */
function copyButton(value, label, strings = getStrings()) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'c-txsheet__copy';
  const idleLabel = (strings.copy || 'Copy') + ', ' + label;
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

let txSheetSeq = 0;   // unique ids for the N25 disclosure's aria-controls

export function openTxSheet({ tx = {}, host, strings = getStrings(), onExplorer, disclose = true, showClose = true } = {}) {
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
    // B3: thread a real avatar when the bridge provides one (WalletSentPage
    // addEntry carries the counterparty avatar path/data-URI; #204/X1 family —
    // createAvatar's onerror degrades to the deterministic gradient).
    head.append(createAvatar({ name: tx.name, address: tx.address, src: tx.avatar || null, size: 48 }));
  } else {
    const dir = document.createElement('span');
    dir.className = 'c-txsheet__dir';
    dir.dataset.type = type;
    dir.append(icon(tx.direction === 'in' ? 'arrow-down-left' : 'arrow-up-right', { size: 24 }));
    head.append(dir);
  }
  /* ★ B2 (#453, Damir on device): the header is TWO LINES, the chat-row grammar — a small
     kicker over the counterparty — instead of one sentence that wrapped a 65-character
     address across three lines. The kicker is body-sm/neutral-02; the name keeps the
     label-lg the title already used, which is what makes the two read as one object.
     With no counterparty there is nothing to put underneath, so it stays a single line. */
  const htext = document.createElement('div');
  htext.className = 'c-txsheet__headtext';
  const title = document.createElement('h2');
  title.className = 'c-txsheet__title';
  if (isContact) {
    const kicker = document.createElement('span');
    kicker.className = 'c-txsheet__kicker';
    kicker.textContent = tx.direction === 'in'
      ? (strings.receivedFromLabel || 'Received from')
      : (strings.sentToLabel || 'Sent to');
    const who = document.createElement('span');
    who.className = 'c-txsheet__who';
    who.textContent = tx.name;
    htext.append(kicker, title);
    title.append(who);
  } else {
    title.textContent = tx.direction === 'in' ? (strings.received || 'Received') : (strings.sent || 'Sent');
    htext.append(title);
  }
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

  /* ★ N25 (#443, Damir): everything below the amount is SECONDARY — the address, the
     date, the fee and the transaction id — and it used to make the sheet a wall of
     monospace the moment it opened. It now lives behind a "See details" disclosure so
     the sheet answers the first question (how much, to whom, did it go through) in one
     glance, and the forensic half is one tap away.
     Status stays OUTSIDE the disclosure: it is the other half of "did it go through". */
  const details = document.createElement('div');
  details.className = 'c-txsheet__details';
  details.hidden = true;
  txSheetSeq += 1;
  const detailsId = 'c-txsheet-details-' + txSheetSeq;

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
    details.append(addrLabel, addrRow);   // N25
  }

  /* meta — rows render only when the bridge provided the field (data-honest);
     Status always renders (legacy confirmation enum incl. unknown, Damir #134) */
  /* ★ D2 (#453, Damir on device): Status moved INTO the drawer, below the address and
     above the date. The badge in the header already says it, so a Status row in the
     collapsed view said the same thing twice on the one screen where the glance matters.
     It stays available — just one tap down, with the rest of the forensic detail. */
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
        ? (strings.feeExplain || 'Network fee, paid to the Ixian network for processing this transaction, not to Spixi.')
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
  details.append(metaBox);

  /* N25 disclosure. Rendered only when there is something to disclose — a row with
     no address, no date, no fee and no id would otherwise offer an empty drawer.
     ★ Audit MINOR-8: `disclose:false` for a host whose whole PURPOSE is those fields.
     wallet_sent.html is the transaction DETAIL page — hiding the detail behind a tap
     there inverts the screen, and its #285 "Show amounts" reveal re-renders, which
     would have collapsed the drawer again every time. */
  if (details.children.length && !disclose) {
    content.append(details);
    details.hidden = false;
  } else if (details.children.length) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'c-txsheet__disclose';
    toggle.setAttribute('aria-expanded', 'false');
    const tlabel = document.createElement('span');
    tlabel.textContent = strings.seeDetails || 'See details';
    const chev = icon('chevron-down', { size: 18 });
    chev.classList.add('c-txsheet__chev');
    toggle.append(tlabel, chev);
    toggle.setAttribute('aria-controls', detailsId);   // audit NIT-18
    details.id = detailsId;
    toggle.addEventListener('click', () => {
      const open = details.hidden;
      details.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) toggle.dataset.open = ''; else delete toggle.dataset.open;
      tlabel.textContent = open ? (strings.hideDetails || 'Hide details')
                                : (strings.seeDetails || 'See details');
    });
    content.append(toggle, details);
  }

  /* explorer — routes through the external-link confirm in the shell (onExplorer duty).
     ★ #443 (Damir): this opens the TRANSACTION, so it says so. The old copy came from
     the address-only verb the wallet tab used to have. */
  if (onExplorer) {
    content.append(createButton({
      label: strings.viewTxExplorer || 'View transaction on Explorer', type: 'outline', size: 44, width: 'full',
      icon: icon('arrow-up-right', { size: 18 }), iconPosition: 'trailing',
      onClick: latched(() => sheet, () => onExplorer(tx)),
    }));
  }

  /* ★ #453 (Damir on device): the sheet had no way out except the scrim or a swipe. Every
     other sheet in the app offers a text action; this one lost it when the explorer CTA
     was added below it. `type: 'text'` so it never competes with the explorer button.

     ★ F4 (#453 ④ regression, Damir on device 2026-08-21): this button belongs to the
     SHEET, and only to the sheet. `wallet_sent.html` LIFTS the built `.c-txsheet` out of
     a ghost sheet and reparents it into a full-screen page (its §2.2 ghost-lift recipe);
     the Close button rode along and called `closeSheet` on a sheet that was closed and
     discarded lines earlier — so it rendered on a surface it could not act on and did
     nothing. `showClose` is its OWN option and is NOT keyed off `disclose`: they answer
     different questions ("does this host own the sheet?" vs "should the fields hide
     behind a disclosure?"), and coupling them is how the next surface inherits the wrong
     one. Damir's steer: it belongs only in the sheet. */
  if (showClose) {
    content.append(createButton({
      label: strings.close || 'Close', type: 'text', size: 44, width: 'full',
      onClick: () => closeSheet(sheet),
    }));
  }

  const sheet = createSheet({ content, host, strings, title: '' });   // head carries the identity
  sheet.setAttribute('aria-label', strings.txDetails || 'Transaction details');
  openSheet(sheet);
  return sheet;
}

/* ————————————————————— missing-tx explainer sheet (#98) ————————————————————— */

export function openMissingTxSheet({ host, strings = getStrings(), onExplorer, scan = null } = {}) {
  const content = document.createElement('div');
  content.className = 'c-misstx';
  const body = document.createElement('p');
  body.className = 'c-misstx__body';
  body.textContent = strings.missingTxBody
    || 'Spixi reads your history directly from the Ixian blockchain. Recent transactions can take a moment to appear, and very old ones may not be listed here.';
  content.append(body);

  /* ★ #440/#443/#452: this sheet finally has a CONCRETE answer, and it is TWO answers.
   *
   * ① While a scan is running, the scan IS the answer — shown as a card with the large
   *    ring, the same reading the slim row on the wallet shows, because the row is what
   *    opened this sheet.
   * ② ★ AND ALWAYS, running or not: Spixi only looks at blocks from a FIXED STARTING
   *    POINT built into the app and never walks back past it, so a transaction older
   *    than that point will never be listed here no matter how long anyone waits. The
   *    sheet used to end at "the scan is finished, so that is not why", which closes off
   *    the true explanation at exactly the moment it is needed (Damir, on device). That
   *    also makes the Explorer button the real resolution rather than a consolation. */
  if (scan && (scan.state === 'scanning' || scan.state === 'unknown')) {
    const card = document.createElement('div');
    card.className = 'c-misstx__scancard';
    card.dataset.state = scan.state;

    const ring = createScanRing({ size: 56, stroke: 5, showPercent: scan.state === 'scanning' });
    if (scan.state === 'unknown') setScanRing(ring, { indeterminate: true });
    else setScanRing(ring, { percent: Number(scan.percent) || 0 });

    const col = document.createElement('div');
    col.className = 'c-misstx__scancol';
    const h = document.createElement('p');
    h.className = 'c-misstx__scanhead';
    const b = document.createElement('p');
    b.className = 'c-misstx__scanbody';
    if (scan.state === 'scanning') {
      h.textContent = strings.chainScanTitle || 'Checking for your transactions';
      b.textContent = strings.chainScanNote
        || 'Spixi is looking through recent blocks for transactions that involve your address.';
    } else {
      /* ★ COPY (Damir, 2026-08-22): "Connecting" read as "the app has no connection".
     It never meant that — and after the F6 fix it is plainly wrong, because this state now
     also fires while we ARE connected and the peer heights simply are not credible yet.
     "Starting the check" names the same activity as the scanning state and marks it as
     not-yet-underway, so the two read as one sequence rather than two different things. */
      h.textContent = strings.chainScanStarting || 'Starting the check';
      /* ⚠ And the BODY was the worse half: "once it reaches the network" states outright
         that Spixi is offline, which is the very thing Damir flagged people misreading —
         and it is now false in the common case. It describes what is actually happening
         instead: working out how far the chain has moved. */
      b.textContent = strings.chainScanNoteStarting
        || 'Spixi is working out how far the blockchain has moved. This usually takes a few moments after you open the app.';
    }
    col.append(h, b);
    card.append(ring, col);
    content.append(card);
  }

  const origin = document.createElement('p');
  origin.className = 'c-misstx__origin';
  origin.textContent = strings.missingTxOldest
    || 'Spixi only checks blocks from a fixed starting point. Transactions older than that are not listed here. The Explorer has your full history.';
  content.append(origin);

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
