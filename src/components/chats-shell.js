/**
 * c-chats-shell — Chats flow shell scaffold: model + render pipeline. Spec:
 * docs/chats-shell-spec.md. Steps: 1 model/render · 3 c-contact-request ·
 * 4 row context menu (pin/mute/mark-read/delete/info).
 *
 * Holds the chats/requests MODEL and renders the visible list — requests on top,
 * then pinned, then recency. Filter + search operate on the MODEL, not the DOM
 * (#52). Inline mock data feeds it (no bridge module yet — Damir). Reuses
 * createChatItem + createContactRequest + attachChatRowMenu.
 *
 * Model shapes:
 *   chat:    { name, address, online, pinned, muted, favorite, type,
 *              timestamp, status, unread, mention, excerpt:{type,text,sender} }
 *   request: { name, address, avatar, timestamp }   // normalized 'pending' entry
 *   state:   { chats:[], requests:[], filter:'all', query:'' }
 *   filter ∈ 'all' | 'unread' | 'favorites' | 'groups' | 'requests'
 *
 * Update APIs are FREE FUNCTIONS operating on (listEl, state, …) per #44.
 * opts: { strings, host, onOpen, onRequestAccept(req,row), onRequestDecline(req),
 *         onChatInfo(chat), onModelChange(state) }
 */
import { createChatItem } from './chatlist-item.js';
import { createContactRequest } from './contact-request.js';
import { attachChatRowMenu } from './chats-row-menu.js';

/* —————————————————————— model (pure, DOM-free, testable) —————————————————————— */

/** Does a chat pass the active filter chip? Requests are handled separately. */
export function chatMatchesFilter(chat, filter) {
  switch (filter) {
    case 'unread': return (chat.unread || 0) > 0 || !!chat.mention;
    case 'favorites': return !!chat.favorite;          // BE-gated (§8) — empty until then
    case 'groups': return chat.type === 'group';
    case 'requests': return false;                     // requests are not chats
    case 'all':
    default: return true;
  }
}

/** Locale-aware substring match over name (or address) + excerpt text.
 *  Empty/whitespace needle matches everything. */
export function chatMatchesQuery(item, needle) {
  const q = (needle || '').trim().toLocaleLowerCase();
  if (!q) return true;
  const name = (item.name || item.address || '').toLocaleLowerCase();
  if (name.includes(q)) return true;
  const ex = item.excerpt && item.excerpt.text;
  return typeof ex === 'string' && ex.toLocaleLowerCase().includes(q);
}

/** Requests are shown on top for the 'all' and 'requests' filters; searchable.
 *  (Requests are 1:1 — Damir: shown in All + Requests only, not Groups.) */
export function orderedRequests(state) {
  const f = state.filter;
  if (f !== 'all' && f !== 'requests') return [];
  return (state.requests || []).filter(Boolean).filter((r) => chatMatchesQuery(r, state.query));
}

/** Visible chats: filtered by chip + query, then pinned-first, then newest-first.
 *  Array#sort is stable (ES2019+), so equal keys keep source order. */
export function orderedChats(state) {
  if (state.filter === 'requests') return [];
  return (state.chats || [])
    .filter(Boolean)                                    // harden against null entries from a bridge feed
    .filter((c) => chatMatchesFilter(c, state.filter) && chatMatchesQuery(c, state.query))
    .slice()                                            // never mutate the source array
    .sort((a, b) => {
      const pinDelta = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (pinDelta) return pinDelta;                    // pinned above the rest
      return (b.timestamp || 0) - (a.timestamp || 0);   // newest first
    });
}

/** Unread total excluding muted; a bare mention counts as 1 (mirrors #42 / the
 *  value setUnreadIndicator should deliver). Drives the Chats nav badge. */
export function chatsUnreadTotal(chats) {
  return (chats || []).filter(Boolean).reduce(
    (n, c) => n + (c.muted ? 0 : (c.unread || (c.mention ? 1 : 0))), 0);
}

/* ————————————————————————————— render pipeline ————————————————————————————— */

/** Empty-state copy for the active filter/query (defaults; strings override).
 *  (Placeholder copy — illustrations + CTAs are a later pass, Damir.) */
function chatsEmptyCopy(state, strings) {
  const q = (state.query || '').trim();
  // split/join, not replace(): a query with $-patterns ($&, $', $1…) would be
  // interpreted as replacement specials by String#replace and corrupt the text.
  if (q) return (strings.chatsEmptySearch || 'No chats match “{q}”').split('{q}').join(q);
  switch (state.filter) {
    case 'unread': return strings.chatsEmptyUnread || 'No unread chats';
    case 'groups': return strings.chatsEmptyGroups || 'No groups yet';
    case 'favorites': return strings.chatsEmptyFavorites || 'No favorites yet';
    case 'requests': return strings.chatsEmptyRequests || 'No pending requests';
    case 'all':
    default: return strings.chatsEmptyAll || 'No chats yet';
  }
}

function chatsEmptyState(state, strings) {
  const el = document.createElement('div');
  el.className = 'c-chats-empty';
  el.setAttribute('role', 'note');
  el.textContent = chatsEmptyCopy(state, strings);
  return el;
}

/** (Re)render the whole list from the model. Full re-render for the scaffold
 *  (row-level diffing is a logged enhancement — spec §9). Returns listEl. */
export function renderChatsList(listEl, state, opts = {}) {
  const strings = opts.strings || {};
  listEl.textContent = '';                               // clear (detaches old rows + listeners for GC)

  const reqs = orderedRequests(state);
  const chats = orderedChats(state);

  for (const r of reqs) {
    listEl.append(createContactRequest({
      ...r, strings, host: opts.host,
      onAccept: opts.onRequestAccept ? (row) => opts.onRequestAccept(r, row) : undefined,
      onDecline: opts.onRequestDecline ? () => opts.onRequestDecline(r) : undefined,
    }));
  }
  for (const c of chats) {
    // use createChatItem's own onClick contract + thread strings for excerpts
    const el = createChatItem({ ...c, strings, onClick: opts.onOpen ? () => opts.onOpen(c) : undefined });
    if (c.pinned) el.dataset.pinned = '';                // shell markers for pin/mute
    if (c.muted) el.dataset.muted = '';
    if (opts.rowMenu !== false) {                        // long-press/right-click → context sheet (step 4)
      attachChatRowMenu(el, {
        chat: c, host: opts.host, strings,
        onAction: (action) => applyChatRowAction(listEl, state, c, action, opts),
      });
    }
    listEl.append(el);
  }

  if (!reqs.length && !chats.length) listEl.append(chatsEmptyState(state, strings));
  return listEl;
}

/** Apply a row context-menu action to the model, then re-render (#44). Pin/mute
 *  toggle, mark-read clears unread+mention, delete removes the chat; info is a
 *  stub (no model change) → opts.onChatInfo. opts.onModelChange fires after a
 *  model change so the shell can refresh the nav badge. */
export function applyChatRowAction(listEl, state, chat, action, opts = {}) {
  switch (action) {
    case 'pin': chat.pinned = !chat.pinned; break;
    case 'mute': chat.muted = !chat.muted; break;
    case 'markRead': chat.unread = 0; chat.mention = false; break;
    case 'delete': state.chats = (state.chats || []).filter((c) => c !== chat); break;
    case 'info': if (opts.onChatInfo) opts.onChatInfo(chat); return;   // stub — no model change
    default: return;
  }
  renderChatsList(listEl, state, opts);
  if (opts.onModelChange) opts.onModelChange(state);
}

/** Build the list container and render it. */
export function createChatsList(state, opts = {}) {
  const el = document.createElement('div');
  el.className = 'c-chats-list';
  renderChatsList(el, state, opts);
  return el;
}

/* update APIs — free functions (#44): mutate state, re-render, return listEl */

export function setChatsFilter(listEl, state, filter, opts) {
  state.filter = filter;
  return renderChatsList(listEl, state, opts);
}

export function setChatsQuery(listEl, state, query, opts) {
  state.query = query;
  return renderChatsList(listEl, state, opts);
}
