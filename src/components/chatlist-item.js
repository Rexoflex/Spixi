/**
 * Chat list row family (docs/chat-list-spec.md): c-indicator, c-status-icon,
 * c-excerpt, c-chatlist-item. Bridge contract: addChat(...) — ARCHITECTURE.md §4.
 * All factories accept an optional `strings` dict (per-shell window.SL,
 * ARCHITECTURE.md §7); English defaults inline.
 */
import { getStrings } from './strings-runtime.js';
import { icon, ICONS } from './icons.js';
import { createAvatar, truncateAddressMiddle } from './avatar.js';
import { formatChatTimestamp } from './timestamp.js';

/** Cap counts for compact badges/indicators (shared with c-bottomnav). */
export function formatCount(n) {
  return n > 99 ? '99+' : String(n);
}

/* —— status icon (§2): sending/sent neutral · delivered muted (bubble: green) · read accent · failed error —— */
const STATUS = {
  sending: { glyph: 'clock-hour-10', tone: 'neutral' },
  sent: { glyph: 'check', tone: 'neutral' },
  delivered: { glyph: 'checks', tone: 'delivered' },
  read: { glyph: 'checks', tone: 'read' },
  /* ★ #1044 (Damir 2026-09-29: "the not-delivered icon looks invisible, in the bubble and in the chat row"):
     alert-small is a bare "!" — a 2px stroke with nothing around it, lost at 16px on the blue bubble and on a
     dark row. alert-square-rounded is the app's ONE failure glyph already (the failed tx badge, the error
     toast, the banner — #602 one glyph, one meaning), so a failed message now wears the same mark. */
  failed: { glyph: 'alert-square-rounded', tone: 'failed' },
};
export function createStatusIcon(status) {
  const s = STATUS[status];
  if (!s) return null;
  const el = icon(s.glyph, { size: 16 });
  el.classList.add('c-status-icon');
  el.dataset.tone = s.tone;
  return el;
}

/* —— indicator (§4, #108): count · count-muted · muted (bell-off) · mention
   (plain `at` GLYPH, action ink, NO circle — a distinct shape from numeric
   count circles, Damir 2026-07-03; can coexist with a count) —— */
export function createIndicator({ count = 0, mention = false, muted = false, reaction = false, strings = getStrings() } = {}) {
  const el = document.createElement('span');
  el.className = 'c-indicator';
  /* ★★ #1148 (4) (Damir: "not a number but a heart"): someone reacted to MY message since I opened the chat (C#
     SReactionFlags, addChat's 13th arg) — never a number, never in the Unread chip or the nav badge */
  if (reaction) {
    el.dataset.variant = 'reaction';
    el.append(icon('heart-filled', { size: 12 }));
    el.setAttribute('aria-label', strings.newReaction || 'New reaction');
    el.setAttribute('role', 'img');
    return el;
  }
  if (mention) {
    el.dataset.variant = 'mention';
    el.append(icon('at', { size: 14 }));
    el.setAttribute('aria-label', strings.mention || 'mention');
  } else if (count > 0) {
    el.dataset.variant = muted ? 'count-muted' : 'count';
    el.textContent = formatCount(count);
    el.setAttribute('aria-label', count + ' ' + (strings.unread || 'unread'));
  } else if (muted) {
    el.dataset.variant = 'muted';
    el.append(icon('bell-off', { size: 12 }));
    el.setAttribute('aria-label', strings.muted || 'muted');
  } else return null;
  return el;
}

/** Indicator set for row2: muted chats show BOTH the (muted) count/@ AND the
 *  bell-off glyph (Damir review 2026-07-02). #108: mention and count COEXIST
 *  (distinct shapes — @ glyph + count circle). [] when nothing to show. */
/* ★ #1148 (4): the heart = someone reacted to MY message (C# SReactionFlags) — the rule is unchanged.
   ★★ #1192 (#1173 (6), Damir's pick c in #1188): the heart sits BESIDE the count, to its LEFT — it no longer
   disappears when the row has unread messages (the count used to win). Still never a number: the Unread chip and
   the nav badge read the unread count, never this indicator. Alone (no count) it sits where the count would. */
export function createIndicators({ count = 0, mention = false, muted = false, reaction = false, strings = getStrings() } = {}) {
  const out = [];
  if (mention) out.push(createIndicator({ mention: true, strings }));
  if (reaction) out.push(createIndicator({ reaction: true, strings }));
  if (count > 0) out.push(createIndicator({ count, muted, strings }));
  if (muted) out.push(createIndicator({ muted: true, strings }));
  return out;
}

/* —— excerpt (§5): type → optional 16px glyph + toned text parts —— */
const EXCERPT_GLYPHS = {
  file: 'file-isr', gif: 'gif', call: 'phone',
  photo: 'photo',   // ★ S9: a photo / photo group (C# excerptKind "photo") — the picture glyph where a file shows the paperclip
  /* ★ #602 (row 16): a call you TURNED DOWN is not a call you missed — it gets its own
     glyph, and both are already in the registry.
     ★★ #621 (Damir on the device, 2026-08-28): THE TWO ARE SWAPPED from #602's first
     cut. He read the actual shapes on a phone, which I could not.
     ★★ CORRECTED by the #46 loop (2026-08-29). The MAP below is right — Damir confirmed
     the excerpt again on the device — and the sentence that used to sit here was wrong:
     it described the PRE-swap cut. The rule is: the phone with the small x (`phone-x`)
     belongs to the call NOBODY ANSWERED, and the crossed phone (`phone-off`) belongs to
     the one that was TURNED DOWN.
     ⚠ THE CALL CARD MUST AGREE. `createCallBubble` shipped the pre-swap pair until the
     loop found it, so one declined call showed two different glyphs on two surfaces.
     One event, one glyph. A pin reads both maps now.
     ⚠ `call-missed` is the shared kind for BOTH "Missed call" (incoming, unanswered)
     and "No answer" (outgoing, unanswered) — the canon maps both to it — so this moves
     the missed-call glyph too. That is consistent (neither was answered) but it was not
     what he asked for by name; if the two want to differ they need separate kinds. */
  'call-missed': 'phone-x',
  'call-declined': 'phone-off',
  payment: 'wallet', 'app-invite': 'apps', draft: 'pencil', reaction: 'heart-plus',
  request: 'user-plus',   // M5 outgoing contact request — `user-plus` SHIPS today (icons.js:81)
  reply: 'arrow-back-up',   // ★ S8 (#1236): the last message is a reply (C# stripped the quote); the glyph is aria-hidden, a hidden "Reply:" speaks it
  'request-done': 'user-plus',   // #273 settled contact event ("Contact Accepted") — same glyph, but NOT a pending request (Requests filter/chip key on type 'request' and must exclude it)
};
export function createExcerpt({ type = 'text', text = '', sender = null, dots = false, strings = getStrings() } = {}) {
  text = text == null ? '' : String(text);         // harden: a non-string from the bridge must not throw (.includes) and abort the whole list render
  const el = document.createElement('span');
  el.className = 'c-excerpt';
  el.dataset.type = type;
  // Registry membership is a SAFETY NET, not a degrade path: every glyph mapped
  // above ships in icons.js today. If a future type is added before its icon is
  // exported, the row degrades to clean text — no empty 16px box, no per-render
  // console.warn from icon() — and lights up automatically once it's registered.
  /* #944: the sender LEADS — "George: 📎 File", the order every messenger reads in
     (the glyph describes the message, the name says whose it is). The name is its own
     shrinkable span so a long nick ellipsizes and the colon still shows; both are
     textContent (a nick is peer-controlled). */
  if (sender) {
    const s = document.createElement('span');
    s.className = 'c-excerpt__sender';
    const n = document.createElement('span');
    n.className = 'c-excerpt__sender-name';
    n.textContent = String(sender);
    s.append(n, document.createTextNode(':'));
    el.append(s);
  }
  const glyph = EXCERPT_GLYPHS[type];
  if (glyph && ICONS[glyph]) el.append(icon(glyph, { size: 16 }));
  /* ★ #1082 (Damir 2026-09-30: "the animated typing dots from the top bar in the chat row too"): a PEER
     typing excerpt (the shell sets `dots`; the #109 handshake line shares the typing tone but is not a
     person typing, so it gets none) leads with the same three-dot wave (typing-indicator.css), aria-hidden —
     the words say it — and the dots ARE the ellipsis, so a trailing "…" / "..." is dropped. */
  const typingDots = type === 'typing' && dots;
  if (typingDots) {
    const d = document.createElement('span');
    d.className = 'c-excerpt__typing';
    d.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'c-typing__dot';
      d.append(dot);
    }
    el.append(d);
    text = text.replace(/\s*(…|\.\.\.)\s*$/, '');
  }
  const t = document.createElement('span');
  t.className = 'c-excerpt__text';
  /* ★ S8 (#1236): the glyph is aria-hidden (icons.js) and, unlike File / Reacted, the text is the message itself —
     so a visually-hidden prefix says what the arrow means to a screen reader. */
  if (type === 'reply') {
    const sr = document.createElement('span');
    sr.className = 'c-excerpt__sr';
    sr.textContent = (strings.repliedPrefix || 'Reply:') + ' ';
    t.append(sr);
  }
  if (type === 'draft') {
    const prefix = document.createElement('span');
    prefix.className = 'c-excerpt__draft';
    prefix.textContent = strings.draft || 'Draft: ';
    t.append(prefix);
    t.append(document.createTextNode(text));
  } else if (type === 'mention' && text.includes('@')) {
    // highlight the first @token
    const i = text.indexOf('@');
    const end = text.indexOf(' ', i);
    const stop = end === -1 ? text.length : end;
    t.append(document.createTextNode(text.slice(0, i)));
    const m = document.createElement('span');
    m.className = 'c-excerpt__mention';
    m.textContent = text.slice(i, stop);
    t.append(m, document.createTextNode(text.slice(stop)));
  } else {
    t.append(document.createTextNode(text));   // ★ S8 (#1236): append, not textContent — keeps the reply prefix
  }
  el.append(t);
  return el;
}

/* —— chat list row (§1, §6) —— */
export function createChatItem({
  name, address = '', avatar = null, online = false,
  timestamp, status = null, pinned = false,
  unread = 0, mention = false, muted = false,
  reaction = false,   // ★ #1148 (4): the reaction heart (home.html addChat 13th arg)
  excerpt = { type: 'text', text: '' },
  // N1 (#364): rows carry `type` ('group' | '1to1'; home.html CH1 kind) — it was
  // silently dropped before. Groups/bots now wear the group-glyph avatar.
  type = '',
  selected = false, onClick, strings = getStrings(),
} = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'c-chatlist-item';
  /* ★ #587: the row carries its address. renderChatsList rebuilds every row on every
     flush, so anything that captured a row element before an await — the long-press
     timer is the case that bit us — needs a way to find the REPLACEMENT. */
  if (address) el.dataset.address = String(address);
  if (unread > 0 || mention) el.dataset.unread = '';
  if (muted) el.dataset.muted = '';   // ★ #1088: the unread time stays grey on a muted row (like its grey badge)
  // N56 (#376 loop C-4): the wash hook rides the COMPONENT, so direct consumers
  // (desktop.html demo — the surface the wash dial is judged on) render it too;
  // renderChatsList's shell marker stays as a harmless duplicate.
  if (pinned) el.dataset.pinned = '';
  // 'true' = selected list row (vs 'page' on bottomnav — a nav destination)
  if (selected) el.setAttribute('aria-current', 'true');

  // #211 address-display canon: a nick wins; a nameless row (or one whose "nick"
  // is really its address echoed back) shows the address MIDDLE-TRUNCATED, never
  // in full. Full address lives only in Contact details + payments.
  const hasNick = !!name && name !== address;
  const displayName = hasNick ? name : (address ? truncateAddressMiddle(address) : (name || ''));

  el.append(createAvatar({ src: avatar, name: hasNick ? name : '', address, size: 48, online, group: type === 'group' }));

  const content = document.createElement('span');
  content.className = 'c-chatlist-item__content';
  const nameEl = document.createElement('span');
  nameEl.className = 'c-chatlist-item__name';
  nameEl.textContent = displayName;
  content.append(nameEl, createExcerpt({ ...excerpt, strings }));
  el.append(content);

  const right = document.createElement('span');
  right.className = 'c-chatlist-item__right';
  const row1 = document.createElement('span');
  row1.className = 'c-chatlist-item__meta';
  const statusEl = createStatusIcon(status);
  if (statusEl) row1.append(statusEl);
  if (pinned) row1.append(icon('pin', { size: 16 }));
  if (timestamp) {                                   // 0 / NaN / undefined → no time (0 is an "unset" sentinel, not 1970)
    const time = document.createElement('span');
    time.className = 'c-chatlist-item__time u-tabular';
    time.textContent = formatChatTimestamp(timestamp, strings);
    time.dataset.ts = timestamp;
    row1.append(time);
  }
  right.append(row1);
  const inds = createIndicators({ count: unread, mention, muted, reaction, strings });
  if (inds.length) {
    const row2 = document.createElement('span');
    row2.className = 'c-chatlist-item__indicators';
    row2.append(...inds);
    right.append(row2);
  }
  el.append(right);

  if (onClick) el.addEventListener('click', onClick);
  return el;
}

/** Refresh all rendered timestamps (call from startTimestampTicker);
 *  pass the same `strings` the rows were built with. */
export function refreshTimestamps(rootEl, strings = getStrings()) {
  for (const t of rootEl.querySelectorAll('.c-chatlist-item__time[data-ts]')) {
    t.textContent = formatChatTimestamp(Number(t.dataset.ts), strings);
  }
}

/* ★ #1171 — HOVER ACROSS A LIVE ROW REPLACE (Damir, Windows video 2026-10-04: a hovered chats row FLASHED,
 * ~230 ms, cursor still). A live update (presence / reaction / typing / receipt) REPLACES the row node
 * (patchChatRows, and the full render's `textContent = ''`), the hover is pure CSS `:hover`, and a NEW node is
 * not `:hover` until WebView2 re-hit-tests (the next mouse move, or its own delayed re-check). So the list
 * remembers which row the mouse is on (pointerover/pointerout, delegated, mouse/pen only — jsdom's
 * matches(':hover') is always false, the pin drives these events), and a row rebuilt under that key is born
 * with `data-hover`, which the row CSS paints exactly like `:hover` (same @media (hover: hover) guard). The
 * mark leaves on the row's pointerleave, on any pointermove/pointerover off that row, and when the pointer
 * leaves the list. Keyboard focus on a replaced row moves to its replacement (it fell to <body> before).
 * Shared by the chats list, the contacts picker and the wallet tx list (each passes its row selector + key).
 * Row-local state only: no storage, no bridge, no peer data in the DOM beyond the key the row already wears. */
const rowHoverLists = new WeakMap();   // listEl → { sel, keyOf, key }

function rowHoverClear(listEl, keep) {
  for (const r of listEl.querySelectorAll('[data-hover]')) if (r !== keep) r.removeAttribute('data-hover');
}

/** Install the (idempotent) hover tracker on a list. `sel` = the hoverable row element, `keyOf(row)` = its key. */
export function trackRowHover(listEl, sel, keyOf) {
  const had = rowHoverLists.get(listEl);
  if (had) { had.sel = sel; had.keyOf = keyOf; return had; }
  const st = { sel, keyOf, key: null };
  rowHoverLists.set(listEl, st);
  const rowOf = (t) => {
    const r = t && t.closest ? t.closest(st.sel) : null;
    return r && listEl.contains(r) ? r : null;
  };
  const onOver = (e) => {
    if (e.pointerType === 'touch') return;             // a tap is not a hover (and leaves no pointerout on some engines)
    const r = rowOf(e.target);
    st.key = r ? (st.keyOf(r) || null) : null;
    rowHoverClear(listEl, r);                          // the pointer is on ANOTHER row (or none): a carried mark is stale
  };
  listEl.addEventListener('pointerover', onOver);
  listEl.addEventListener('pointermove', onOver);
  listEl.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'touch') return;
    const to = e.relatedTarget;
    if (to && listEl.contains(to)) return;             // row → row is settled by the next pointerover
    st.key = null;
    rowHoverClear(listEl, null);
  });
  listEl.addEventListener('pointerleave', () => { st.key = null; rowHoverClear(listEl, null); });
  return st;
}

/** Before a row is replaced (or the list cleared): which row keys are hovered / focused now. */
export function snapRowHover(listEl, oldRows) {
  const st = rowHoverLists.get(listEl);
  if (!st) return null;
  let hover = st.key;
  let focus = null;
  const ae = typeof document !== 'undefined' ? document.activeElement : null;
  for (const r of oldRows || listEl.querySelectorAll(st.sel)) {
    const row = r.matches && r.matches(st.sel) ? r : (r.querySelector ? r.querySelector(st.sel) : null);
    if (!row) continue;
    const k = st.keyOf(row);
    if (!k) continue;
    let on = false;
    try { on = row.matches(':hover'); } catch (e) { /* engine without :hover matching */ }
    if (!hover && (on || row.hasAttribute('data-hover'))) hover = k;
    if (ae && ae === row) focus = k;
  }
  return { hover, focus };
}

/** Mark a freshly built row (call BEFORE it is attached, so its first style is already the hover paint). */
export function carryRowHover(listEl, node, snap) {
  const st = rowHoverLists.get(listEl);
  if (!st || !snap || !snap.hover || !node) return;
  const row = node.matches && node.matches(st.sel) ? node : (node.querySelector ? node.querySelector(st.sel) : null);
  if (!row || st.keyOf(row) !== snap.hover) return;
  row.setAttribute('data-hover', '');
  row.addEventListener('pointerleave', () => row.removeAttribute('data-hover'), { once: true });
}

/** After the replace: hand keyboard focus to the replacement of the row that had it (focus fell to <body>). */
export function restoreRowFocus(listEl, snap) {
  const st = rowHoverLists.get(listEl);
  if (!st || !snap || !snap.focus) return;
  /* #46 r1 m1: a document WITHOUT focus (desktop: the user types in the chat pane's own WebView2) never takes it back */
  try { if (typeof document.hasFocus === 'function' && !document.hasFocus()) return; } catch (e) { return; }
  const ae = document.activeElement;
  if (ae && ae !== document.body && ae.isConnected) return;   // focus already went somewhere on purpose
  for (const row of listEl.querySelectorAll(st.sel)) {
    if (st.keyOf(row) === snap.focus) { try { row.focus({ preventScroll: true }); } catch (e) { /* detached */ } return; }
  }
}
