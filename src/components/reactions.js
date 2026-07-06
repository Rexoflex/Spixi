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
    // tip = amount pill in the reaction row (#65); c-badge keeps the vocabulary
    const badge = createBadge({
      type: 'warning', weight: 'tonal', label: tip, icon: 'heart-handshake',
    });
    badge.classList.add('c-reactions__tip');
    el.append(badge);
  }

  if (placement === 'overlap') row.dataset.reactions = 'overlap'; // row reserves overhang space
  bubble.append(el);
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
    rowEl.append(createBadge({ type: 'warning', weight: 'tonal', label: tip, icon: 'heart-handshake' }));
    content.append(rowEl);
  }
  const sheet = createSheet({ title: strings.reactions || 'Reactions', content, host, strings });
  openSheet(sheet);
  return sheet;
}
