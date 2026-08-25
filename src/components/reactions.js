/**
 * c-reactions — message reaction pills + tip pill (batch 3).
 * DECISIONS #65 RESOLVED (Damir + AI concur, 2026-07-03): placement =
 * OVERLAP the bubble's bottom outer corner (Telegram-style) — both rendered
 * side-by-side, overlap read better: bubble content stays clean, reactions
 * scan at a glance, and it avoids layout coupling with the floated meta.
 * 'inside' (the old Figma direction) is kept as a param option for the
 * record/mirroring — update the Figma design to overlap at next mirror.
 * Figma has a single `reaction` chip; count/own/tip variants are code-first
 * gap fills (#66). Tips = amount pill in the same row (#65), non-interactive
 * (amount strings arrive C#-formatted).
 *
 * addReactions(row, {
 *   reactions: [{ emoji, count, own, senders: ['Alex'] }], // aggregated shell-side (bridge addReactions)
 *   tip: '5 IXI',                        // optional, pre-formatted
 *   placement: 'overlap' (default) | 'inside' (superseded),
 *   animate: true,                       // pop-in for a JUST-ADDED reaction (live only, not history)
 *   maxVisible: 3,                       // Damir 2026-07-03: heavy reactions cap — first N types + "+N" pill
 *   host, onInspect,                     // "+N" (inspect) opens openReactionsSheet in host unless onInspect overrides
 *   onToggle(emoji),                     // → ixian:contextAction like/react
 *   strings,
 * })
 * Re-invoking replaces the previous set (the bridge re-emits the full list).
 * #44 free-fn convention — operates on an existing bubble/card row.
 *
 * openReactionsSheet({ host, reactions, tip, strings }) — full inspect list
 * (every type + count + senders), c-sheet presentation.
 */
import { getStrings } from './strings-runtime.js';
import { createBadge } from './badge.js';
import { createSheet, openSheet } from './sheet.js';

export function addReactions(row, {
  reactions = [],
  tip = '',
  placement = 'overlap',
  animate = false,
  maxVisible = 3,
  host,
  onInspect,
  onToggle,
  strings = getStrings(),
} = {}) {
  // media tiles anchor on .c-mbubble-anchor (tile overflow:hidden would clip
  // the overlap overhang — audit r3)
  const bubble = row.querySelector('.c-bubble, .c-tcard, .c-fbubble, .c-mbubble-anchor');
  if (!bubble) return;

  // replace-on-repeat: the bridge sends the full reaction list every time
  const prev = bubble.querySelector('.c-reactions');
  if (prev) prev.remove();
  delete row.dataset.reactions;
  // ★ #570: and so is the floor + its observer — see reserveOverlapWidth.
  clearOverlapFloor(bubble);

  if (reactions.length === 0 && !tip) return;

  const el = document.createElement('span');
  el.className = 'c-reactions';
  if (animate) el.classList.add('c-reactions--in'); // cheap pop (Damir 2026-07-03); finite, token-driven
  el.dataset.placement = placement;
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', strings.reactions || 'Reactions');

  // heavy-reactions cap (Damir 2026-07-03): first maxVisible TYPES render as
  // pills, the rest fold into a "+N" pill that opens the inspect sheet
  const visible = reactions.length > maxVisible ? reactions.slice(0, maxVisible) : reactions;
  for (const r of visible) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'c-reactions__pill';
    pill.setAttribute('aria-pressed', r.own ? 'true' : 'false');
    // emoji + count are decorative inside the labelled button
    pill.setAttribute('aria-label',
      (strings.reaction || 'Reaction') + ' ' + r.emoji + (r.count > 1 ? ' ' + r.count : ''));
    const em = document.createElement('span');
    em.className = 'c-reactions__emoji';
    em.setAttribute('aria-hidden', 'true');
    em.textContent = r.emoji;
    pill.append(em);
    if (r.count > 1) {
      const n = document.createElement('span');
      n.className = 'c-reactions__count u-tabular';
      n.setAttribute('aria-hidden', 'true');
      n.textContent = String(r.count);
      pill.append(n);
    }
    if (onToggle) pill.addEventListener('click', () => onToggle(r.emoji));
    el.append(pill);
  }
  if (reactions.length > maxVisible) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'c-reactions__pill c-reactions__more';
    more.setAttribute('aria-label', strings.allReactions || 'Show all reactions');
    more.textContent = '+' + (reactions.length - maxVisible);
    more.addEventListener('click', onInspect
      ? () => onInspect()
      : () => openReactionsSheet({ host, reactions, tip, strings }));
    el.append(more);
  }

  if (tip) {
    /* tip = amount pill in the reaction row (#65); c-badge keeps the vocabulary.
       ★ #591 (Damir 2026-08-26): SUCCESS, not warning. Same badge, same tonal
       weight, same glyph — only the role changes. A tip is money that ARRIVED;
       warning is the role this app reserves for "look at this, something may be
       off", and it was reading as a caution on a completed transfer. */
    const badge = createBadge({
      type: 'success', weight: 'tonal', label: tip, icon: 'heart-handshake',
    });
    badge.classList.add('c-reactions__tip');
    el.append(badge);
  }

  if (placement === 'overlap') row.dataset.reactions = 'overlap'; // row reserves overhang space
  bubble.append(el);
  if (placement === 'overlap') reserveOverlapWidth(bubble, el);
}

/* ★★ #570 (Damir screenshots, Android AND Windows) — THE OVERLAP GRAMMAR ASSUMED
 * A BUBBLE WIDER THAN ITS ORNAMENTS.
 *
 * #65 hangs the pill row off the bubble's bottom OUTER corner. That reads well while
 * the bubble is the wider of the two. On a short bubble — "ok", one emoji — a heart
 * plus a "Tipped" chip does not fit: the row is absolutely positioned INSIDE the
 * bubble, so its shrink-to-fit width is capped by the bubble and `flex-wrap: wrap`
 * folds it onto a second line. Two lines at `inset-block-end: -12px` reach up over
 * the timestamp and the ticks. Nothing is wrong with the anchor; there is simply not
 * enough bubble to hang from.
 *
 * ★ SO THE BUBBLE GETS A FLOOR — Damir's first candidate, and the only one of his two
 * that is stable. The alternative (fall back to the `inside` placement) LOOKS tidier
 * and oscillates forever: `inside` is in-flow, so it GROWS the bubble to hold the
 * pills, which makes the "too narrow" test false, which flips it back to `overlap`,
 * which shrinks the bubble again. Every bubble the fix is written for is a bubble it
 * would jitter at 60 fps. A floor has no such feedback: widening the bubble does not
 * change the pill row's own content width.
 *
 * ⚠ MEASURED THROUGH max-content, NOT through the live box. The row is absolutely
 * positioned inside the bubble, so its RENDERED width is already clamped to the
 * bubble — reading `scrollWidth` would measure the symptom and report that everything
 * fits. `max-content` asks what the row WANTS, which is the number the floor needs.
 * If a WebView ignores `max-content` the read degrades to the clamped width, the floor
 * comes out too small, and the bubble is no worse than it is today.
 * ⚠ Zero means UNMEASURABLE (a hidden tab, a detached row, jsdom) — never "narrow".
 * ⚠ The floor never beats the bubble's own max-width. In CSS min-width wins over
 * max-width, so an un-clamped floor could push one bubble past the #65 rail.
 * ⚠ ONE observer per bubble, stored ON the bubble. addReactions is replace-on-repeat
 * and the bridge re-emits the full list on every flush, so a fresh observer per call
 * would pile up unbounded on a live row — and in `overlap` the bubble's size never
 * changes, so a stale observer would never fire and never self-disconnect. */

const OVERLAP_FLOOR_AIR = 16;   // the 8px corner inset + 8px of air on the other side

function measureOverlapFloor(bubble, el) {
  const prev = el.style.width;
  let natural = 0;
  try {
    el.style.width = 'max-content';
    natural = el.offsetWidth || 0;
  } catch (e) {
    natural = 0;
  }
  el.style.width = prev;
  if (!natural) return 0;
  let need = natural + OVERLAP_FLOOR_AIR;
  /* ⚠ round-2 MINOR-1: the cap is the ROW's width, not the bubble's computed
   * max-width. `.c-bubble` resolves to `min(82%, 360px)`, and the CSSOM returns that
   * expression verbatim — parseFloat gives NaN, so the clamp never fired; on a
   * variant with a bare percentage it would have parsed `82%` as 82px and clamped the
   * floor to nothing. The row is the true bound and its width is a used value. */
  const cap = (bubble.parentElement && bubble.parentElement.clientWidth) || 0;
  if (cap > 0 && need > cap) need = cap;        // the #65 rail wins
  return need;
}

function applyOverlapFloor(bubble, el) {
  if (!el.isConnected || !bubble.isConnected) return;
  const need = measureOverlapFloor(bubble, el);
  if (!need) return;                                   // unmeasurable → leave the bubble alone
  const current = parseFloat(bubble.style.minWidth) || 0;
  if (Math.abs(current - need) < 1) return;            // converged — never write the same value twice
  bubble.style.minWidth = need + 'px';
}

function reserveOverlapWidth(bubble, el) {
  if (typeof window === 'undefined' || !window.requestAnimationFrame) return;
  window.requestAnimationFrame(() => applyOverlapFloor(bubble, el));
  if (typeof ResizeObserver === 'undefined') return;
  try {
    /* The bubble owns its observer. A second addReactions on the same live row must
     * REPLACE it, exactly as the row itself is replaced — see the teardown beside
     * `prev.remove()`. */
    const ro = new ResizeObserver(() => applyOverlapFloor(bubble, el));
    bubble.__reactionFloorObserver = ro;
    ro.observe(bubble);
  } catch (e) { /* no observer — the rAF pass still ran */ }
}

/** Drop the floor and the observer a previous call left on this bubble. Called from
 *  addReactions before it rebuilds, so replace-on-repeat leaks nothing and a bubble
 *  that loses its last reaction hugs its text again. */
function clearOverlapFloor(bubble) {
  const ro = bubble.__reactionFloorObserver;
  if (ro) {
    try { ro.disconnect(); } catch (e) {}
    bubble.__reactionFloorObserver = null;
  }
  try { bubble.style.minWidth = ''; } catch (e) {}
}

/** Inspect sheet: every reaction type with count + who reacted (Damir
 *  2026-07-03). Sender names arrive from the bridge aggregation. */
export function openReactionsSheet({ host, reactions = [], tip = '', strings = getStrings() } = {}) {
  const content = document.createElement('div');
  content.className = 'c-reactmenu';
  content.setAttribute('role', 'list'); // audit r3: SRs get structure + count
  for (const r of reactions) {
    const rowEl = document.createElement('div');
    rowEl.className = 'c-reactmenu__row';
    rowEl.setAttribute('role', 'listitem');
    const em = document.createElement('span');
    em.className = 'c-reactmenu__emoji';
    em.setAttribute('aria-hidden', 'true');
    em.textContent = r.emoji;
    const col = document.createElement('span');
    col.className = 'c-reactmenu__info';
    const count = document.createElement('span');
    count.className = 'c-reactmenu__count';
    count.textContent = (r.count || 1) + ' × ' + r.emoji;
    const who = document.createElement('span');
    who.className = 'c-reactmenu__senders';
    who.textContent = (r.senders && r.senders.length)
      ? r.senders.join(', ') + (r.own ? ' · ' + (strings.you || 'You') : '')
      : (r.own ? (strings.you || 'You') : '');
    col.append(count, who);
    rowEl.append(em, col);
    content.append(rowEl);
  }
  if (tip) {
    const rowEl = document.createElement('div');
    rowEl.className = 'c-reactmenu__row';
    rowEl.setAttribute('role', 'listitem');
    // #591: the inspect sheet carries the SAME role as the pill it explains
    rowEl.append(createBadge({ type: 'success', weight: 'tonal', label: tip, icon: 'heart-handshake' }));
    content.append(rowEl);
  }
  const sheet = createSheet({ title: strings.reactions || 'Reactions', content, host, strings });
  openSheet(sheet);
  return sheet;
}
