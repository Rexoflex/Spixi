/**
 * c-chats-shell — Chats flow shell scaffold: model + render pipeline. Spec:
 * docs/chats-shell-spec.md. Steps: 1 model/render · 3 c-contact-request ·
 * 4 row context menu · 5 swipe accelerator.
 *
 * Holds the chats/requests MODEL and renders the visible list — requests on top,
 * then pinned, then recency. Filter + search operate on the MODEL, not the DOM
 * (#52). Inline mock data feeds it (no bridge module yet — Damir). Reuses
 * createChatItem + createContactRequest + attachChatRowMenu + wrapChatRowSwipe.
 *
 * Model shapes:
 *   chat:    { name, address, online, pinned, muted, favorite, type,
 *              timestamp, status, unread, mention, handshaking,
 *              excerpt:{type,text,sender} }
 *   request: { name, address, avatar, timestamp }   // normalized 'pending' entry
 *   state:   { chats:[], requests:[], filter:'all', query:'' }
 *   filter ∈ 'all' | 'unread' | 'favorites' | 'groups' | 'requests'
 *
 * #109 staged accept: acceptContactRequest turns a request into a handshaking
 * chat (excerpt "Establishing a quantum-secure handshake…", typing style); it's
 * un-openable/un-swipeable/un-menuable until completeHandshake fires on the bridge
 * signal. The caller latches the Accept button first (setRequestAccepting).
 *
 * opts: { strings, host, capabilities:{pin,mute,favorites,…}, rowMenu,
 *         onOpen, onHandshakeBlocked(chat), onRequestAccept(req,row),
 *         onRequestDecline(req), onChatInfo(chat), onModelChange(state),
 *         onPersist(action,chat) }
 * capabilities gate BE-dependent features so they can be PARKED until BE ships
 * (#67/§8): pin/mute swipe + menu items render only when their flag is truthy.
 * Update APIs are FREE FUNCTIONS operating on (listEl, state, …) per #44.
 */
import { createChatItem } from './chatlist-item.js';
import { createContactRequest } from './contact-request.js';
import { attachChatRowMenu } from './chats-row-menu.js';
import { wrapChatRowSwipe, closeChatRowSwipe } from './chats-swipe.js';

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

/** Requests appear in the 'all' and 'requests' filters; searchable. In 'all'
 *  they INTERLEAVE by arrival time (see orderedTimeline), not pinned on top —
 *  Damir 2026-07-04: a request sits at its chronological place; accepting it
 *  slides the new chat to the top (latest action). Not shown in Groups (1:1). */
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

/** Combined All-list order: **pinned chats stay on top**, then pending requests
 *  and unpinned chats **interleave by recency** (newest first). A request sits at
 *  its arrival time (not pinned to the top); an accepted chat (timestamp = now)
 *  slides to the top of the unpinned flow. In the 'requests' filter orderedChats
 *  is empty, so this yields just the requests, newest-first. Returns a flat list
 *  of `{ kind: 'chat' | 'request', item }`. */
export function orderedTimeline(state) {
  const reqs = orderedRequests(state);
  const chats = orderedChats(state);
  const pinned = chats.filter((c) => c.pinned).map((c) => ({ kind: 'chat', item: c }));
  const flow = [
    ...chats.filter((c) => !c.pinned).map((c) => ({ ts: c.timestamp || 0, kind: 'chat', item: c })),
    ...reqs.map((r) => ({ ts: r.timestamp || 0, kind: 'request', item: r })),
  ]
    .sort((a, b) => b.ts - a.ts)                          // newest first; stable → chat before request on a tie
    .map(({ kind, item }) => ({ kind, item }));
  return [...pinned, ...flow];
}

/** Unread total excluding muted; a bare mention counts as 1 (mirrors #42 / the
 *  value setUnreadIndicator should deliver). Drives the Chats nav badge. */
export function chatsUnreadTotal(chats) {
  return (chats || []).filter(Boolean).reduce((n, c) => {
    if (c.muted) return n;
    const u = Math.max(0, c.unread || 0);            // clamp: a negative/corrupt count must not drag the badge below true
    return n + (u || (c.mention ? 1 : 0));
  }, 0);
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
  const caps = opts.capabilities || {};
  closeChatRowSwipe();                                   // close any open swipe drawer before detaching rows (#1: single-open + GC)
  listEl.textContent = '';                               // clear (detaches old rows + listeners for GC)

  const renderRequest = (r) => {
    listEl.append(createContactRequest({
      ...r, strings, host: opts.host,
      onAccept: opts.onRequestAccept ? (row) => opts.onRequestAccept(r, row) : undefined,
      onDecline: opts.onRequestDecline ? () => opts.onRequestDecline(r) : undefined,
    }));
  };
  const renderChat = (c) => {
    // handshaking chats (#109) are not yet openable — tapping routes to
    // onHandshakeBlocked, and they carry no pin/mute affordances until secured.
    const onClick = c.handshaking
      ? (opts.onHandshakeBlocked ? () => opts.onHandshakeBlocked(c) : undefined)
      : (opts.onOpen ? () => opts.onOpen(c) : undefined);
    const el = createChatItem({ ...c, strings, onClick });
    if (c.pinned) el.dataset.pinned = '';                // shell markers for pin/mute
    if (c.muted) el.dataset.muted = '';
    if (c.handshaking) {                                 // #109: no open/swipe/pin — but a cancel menu so a stalled handshake is recoverable
      el.dataset.handshaking = ''; el.setAttribute('aria-busy', 'true');
      if (opts.rowMenu !== false) {
        attachChatRowMenu(el, {
          chat: c, host: opts.host, strings, handshaking: true,
          onAction: (action) => { if (action === 'cancelHandshake') failHandshake(listEl, state, c, opts); },
        });
      }
      listEl.append(el); return;
    }
    if (opts.rowMenu !== false) {                        // long-press/right-click → context sheet (step 4)
      attachChatRowMenu(el, {
        chat: c, host: opts.host, strings, capabilities: caps,
        onAction: (action) => applyChatRowAction(listEl, state, c, action, opts),
      });
    }
    // swipe accelerator (step 5) — capability-gated; returns el unwrapped if parked
    const node = wrapChatRowSwipe(el, {
      chat: c, capabilities: caps, strings,
      onAction: (action) => applyChatRowAction(listEl, state, c, action, opts),
    });
    listEl.append(node);
  };

  // pinned chats on top, then requests + unpinned chats interleaved by recency
  const timeline = orderedTimeline(state);
  for (const { kind, item } of timeline) (kind === 'request' ? renderRequest : renderChat)(item);

  if (!timeline.length) listEl.append(chatsEmptyState(state, strings));
  return listEl;
}

/** Apply a row action (menu or swipe) to the model, then re-render (#44). Pin/
 *  mute toggle, mark-read clears unread+mention, delete removes the chat; info is
 *  a stub (no model change) → opts.onChatInfo. On a model change: fire
 *  opts.onPersist(action, chat) — the bridge intent (mock no-op now; a real
 *  `ixian:` command when BE ships, §8) — then re-render + opts.onModelChange. */
export function applyChatRowAction(listEl, state, chat, action, opts = {}) {
  switch (action) {
    case 'pin': chat.pinned = !chat.pinned; break;
    case 'mute': chat.muted = !chat.muted; break;
    case 'markRead': chat.unread = 0; chat.mention = false; break;
    case 'delete': state.chats = (state.chats || []).filter((c) => c !== chat); break;
    case 'info': if (opts.onChatInfo) opts.onChatInfo(chat); return;   // stub — no model change
    default: return;
  }
  if (opts.onPersist) opts.onPersist(action, chat);      // bridge intent → C# persists (mock no-op)
  renderChatsList(listEl, state, opts);
  if (opts.onModelChange) opts.onModelChange(state);
}

/* ————————————————————— #109 staged accept handshake ————————————————————— */

/** Accept a pending request → transition it into a HANDSHAKING chat. Removes the
 *  request, prepends a chat with handshaking:true + the "Establishing a
 *  quantum-secure handshake…" excerpt (typing style), re-renders, and returns the
 *  new chat so the caller can settle it via completeHandshake on the bridge's
 *  handshake-complete signal (§9). No-op (returns null) if the request is already
 *  gone — guards double-accept from a double-tap before re-render. Opening the
 *  handshaking chat is blocked (onHandshakeBlocked) until it completes. */
export function acceptContactRequest(listEl, state, req, opts = {}) {
  if (!req || (state.requests || []).indexOf(req) === -1) return null;
  const strings = opts.strings || {};
  state.requests = (state.requests || []).filter((r) => r !== req);
  const chat = {
    name: req.name, nick: req.nick, address: req.address, avatar: req.avatar,
    type: 'direct', timestamp: Date.now(), handshaking: true, unread: 0, mention: false,
    excerpt: { type: 'typing', text: strings.handshakeEstablishing || 'Establishing a quantum-secure handshake…' },
  };
  state.chats = [chat, ...(state.chats || [])];
  renderChatsList(listEl, state, opts);
  if (opts.onModelChange) opts.onModelChange(state);
  return chat;
}

/** The bridge handshake-complete signal landed — unblock entry. Clears the
 *  handshaking flag + the establishing excerpt, re-renders. Bumping the timestamp
 *  surfaces the just-secured contact at the top (you likely want to message them).
 *  No-op if the chat was deleted/never-handshaking meanwhile (guards a late signal). */
export function completeHandshake(listEl, state, chat, opts = {}) {
  if (!chat || (state.chats || []).indexOf(chat) === -1 || !chat.handshaking) return;
  const strings = opts.strings || {};
  chat.handshaking = false;
  chat.excerpt = { type: 'text', text: strings.handshakeReady || '' };   // empty until a real message arrives
  chat.timestamp = Date.now();
  renderChatsList(listEl, state, opts);
  if (opts.onModelChange) opts.onModelChange(state);
}

/** Handshake failed / timed out / user-cancelled — remove the stranded chat so a
 *  never-completing handshake is never an un-removable trap (bridge failure signal
 *  §9, OR the row's Cancel-handshake action). No-op if it already settled/left. */
export function failHandshake(listEl, state, chat, opts = {}) {
  if (!chat || (state.chats || []).indexOf(chat) === -1 || !chat.handshaking) return;
  state.chats = (state.chats || []).filter((c) => c !== chat);
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
