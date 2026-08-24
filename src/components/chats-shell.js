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
 *              timestamp, status, unread, mention, handshaking, request,
 *              excerpt:{type,text,sender} }
 *              // request = M5: OUR outgoing, not-yet-accepted contact request
 *              // (shell flag; rides the Requests chip beside the incoming cards)
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
 *         onPersist(action,chat), onNewChat }
 * onNewChat = the zero-state CTA (host opens the contacts picker, the SAME
 * action as the FAB — no new bridge verb). Omit it and the CTA is not rendered.
 * capabilities gate BE-dependent features so they can be PARKED until BE ships
 * (#67/§8): pin/mute swipe + menu items render only when their flag is truthy.
 * Update APIs are FREE FUNCTIONS operating on (listEl, state, …) per #44.
 */
import { getStrings } from './strings-runtime.js';
import { createChatItem } from './chatlist-item.js';
import { createContactRequest } from './contact-request.js';
import { attachChatRowMenu } from './chats-row-menu.js';
import { wrapChatRowSwipe, closeChatRowSwipe } from './chats-swipe.js';
import { createEmptyState } from './empty-state.js';

/* —————————————————————— model (pure, DOM-free, testable) —————————————————————— */

/** Does a chat pass the active filter chip? Requests are handled separately. */
export function chatMatchesFilter(chat, filter) {
  switch (filter) {
    case 'unread': return (chat.unread || 0) > 0 || !!chat.mention;
    case 'favorites': return !!chat.favorite;          // BE-gated (§8) — empty until then
    case 'groups': return chat.type === 'group';
    // M5: OUTGOING pending-request rows ride the Requests chip beside the
    // incoming request CARDS (orderedRequests). `chat.request` = shell flag
    // (raw-based, survives a draft-masked excerpt); excerpt-type = demo/data path.
    case 'requests': return !!(chat.request || (chat.excerpt && chat.excerpt.type === 'request'));
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
 *  Array#sort is stable (ES2019+), so equal keys keep source order.
 *  (M5: no 'requests' short-circuit — chatMatchesFilter admits outgoing
 *  pending-request ROWS there, beside the incoming cards.) */
export function orderedChats(state) {
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
 *  slides to the top of the unpinned flow. In the 'requests' filter this yields
 *  the incoming request cards + outgoing "Request sent" rows (M5), newest-first.
 *  Returns a flat list of `{ kind: 'chat' | 'request', item }`. */
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
 *  This is the NO-RESULTS line: a filter or a search matched nothing. The TRUE
 *  zero state (All, no query, nothing in the roster) is a different object —
 *  chatsEmptyState below hands that one to the shared c-empty block. */
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

/** TRUE zero state (nothing exists yet) vs NO RESULTS (a filter/search missed).
 *  Only the former earns the illustration + CTA — an "add your first…" pitch
 *  under a search that matched nothing reads as if the data were gone. */
function chatsIsZero(state) {
  return (state.filter || 'all') === 'all' && !(state.query || '').trim();
}

function chatsEmptyState(state, strings, opts = {}) {
  if (chatsIsZero(state)) {
    // ★ LOAD WINDOW GATE (shared with apps-shell/wallet-shell). "No chats yet" +
    // the illustration + "Start a chat" is a CLAIM about the roster; an empty
    // model during the clearChats→addChat×N flush is not that claim. The shell
    // builds this list synchronously at boot, BEFORE the bridge has answered, so
    // an ungated construction render paints the full zero state on every F5 and
    // then pops the real rows in. zeroReady:false → NO empty node (a blank beat);
    // the host opens the gate on the end-of-burst signal it already owns.
    // A filter/search miss is about the QUERY, not the roster → never gated.
    if (opts.zeroReady === false) return null;
    return createEmptyState({
      illustration: opts.emptyArt !== undefined ? opts.emptyArt : 'images/chats-es.png',
      glyph: 'messages',                            // art blocked/missing → token glyph tile
      title: strings.chatsEmptyAll || 'No chats yet',
      body: strings.chatsEmptyBody
        || 'Pick a contact and say hi. Messages go straight to their device, end-to-end encrypted.',
      actionLabel: strings.chatsEmptyCta || 'Start a chat',
      actionIcon: 'message-plus',
      onAction: opts.onNewChat,
      /* ★ N76 (#391, Damir's dial): the join-the-community step left the
         onboarding tail and lives HERE. A new user's list is empty anyway, this
         costs no screen, and — unlike a step — it is still here tomorrow for the
         user who skipped it. It stays OPT-IN: the host emits the existing
         ixian:joinBot verb only on a tap, nothing is auto-added. The row
         disappears by itself, because the moment the bot is a chat the list is
         no longer empty. */
      secondaryLabel: opts.onJoinBot ? (strings.chatsEmptyJoinCta || 'Join the Spixi community') : '',
      secondaryIcon: 'users',
      onSecondary: opts.onJoinBot || null,
    });
  }
  const el = document.createElement('div');
  el.className = 'c-chats-empty';
  el.setAttribute('role', 'note');
  el.textContent = chatsEmptyCopy(state, strings);
  return el;
}

/* ————————————— N58: avatar-photo decode cache (the #340 BUG-2② class) ————————
 * Every render rebuilds every row from scratch (the model churns: excerpt/ts/
 * unread), and a BRAND-NEW <img> re-DECODES its data-URI even when the resource
 * is memory-cached — so on every chats-screen entry (C# re-flush → full rebuild,
 * #334 iOS-64) each photo flickered through its decode blank. Reuse the previous
 * render's avatar NODE (the decoded bitmap travels with the element) whenever
 * the photo inputs are unchanged; the presence dot is patched IN PLACE so a
 * status tick (#189, 1 Hz) never forces a re-decode. Gradient avatars are pure
 * CSS (no decode) and skip the cache. Freshness is FIELD-WISE, never a joined
 * signature (#340 lesson: joining copies the whole data-URI per row per render).
 * Per-list (WeakMap) + capped: keys unseen by the current render are pruned
 * oldest-first, and ONLY once the map outgrows the cap — under the cap a
 * filtered (search) render evicts nothing; over it, eviction is bounded and
 * the evicted photos cost one honest re-decode on their next appearance.
 * Note (#376 loop C-6/C-7): the swap happens AFTER createChatItem built a fresh
 * <img> — the throwaway element is never attached, so the DECODE (the measured
 * cost, #340: 108ms→3.4ms) is skipped, not the construction. An errored photo
 * keeps its placeholder node under the same src (the same src would error
 * again); a photo REWRITTEN under an unchanged raw-path src (the imageToDataUri
 * catch fallback, #217) stays pinned until any freshness field moves — accepted,
 * X1 makes raw paths the exception.                                           */
const avatarCaches = new WeakMap();
const AVATAR_CACHE_MAX = 128;
function avatarCacheFor(listEl) {
  let c = avatarCaches.get(listEl);
  if (!c) { c = new Map(); avatarCaches.set(listEl, c); }
  return c;
}

/** (Re)render the whole list from the model. Full re-render for the scaffold
 *  (row-level diffing is a logged enhancement — spec §9). Returns listEl. */
export function renderChatsList(listEl, state, opts = {}) {
  const strings = opts.strings || getStrings();
  const caps = opts.capabilities || {};
  closeChatRowSwipe();                                   // close any open swipe drawer before detaching rows (#1: single-open + GC)
  listEl.textContent = '';                               // clear (detaches old rows + listeners for GC)
  const avCache = avatarCacheFor(listEl);                // N58
  const avatarSeen = new Set();                          // N58: dup-address guard (a node must never be moved twice per render)

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
    // N58: swap in the cached (already-decoded) avatar node when the photo inputs
    // match. `name` is in the freshness set only for the onerror-placeholder path
    // (initials) — a nick change costs one honest re-decode.
    if (c.address && c.avatar && !avatarSeen.has(c.address)) {
      avatarSeen.add(c.address);
      const nm = (c.name && c.name !== c.address) ? c.name : '';
      const fresh = el.querySelector('.c-avatar');
      const hit = avCache.get(c.address);
      if (fresh && hit && hit.src === c.avatar && hit.group === (c.type === 'group') && hit.name === nm) {
        const dot = hit.el.querySelector('.c-avatar__dot');       // presence patched in place, never a re-decode
        if (c.online && !dot) {
          const d = document.createElement('span');
          d.className = 'c-avatar__dot';
          hit.el.append(d);
        } else if (!c.online && dot) dot.remove();
        fresh.replaceWith(hit.el);
      } else if (fresh) {
        avCache.set(c.address, { el: fresh, src: c.avatar, group: c.type === 'group', name: nm });
      }
    }
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
        onNeedGroups: opts.onNeedGroups,                 // A4/A5: the remove-contact sheet asks C# for the shared groups
        onAction: (action, detail) => applyChatRowAction(listEl, state, c, action, opts, detail),
      });
    }
    // swipe accelerator (step 5) — capability-gated; returns el unwrapped if parked
    const node = wrapChatRowSwipe(el, {
      chat: c, capabilities: caps, strings,
      onAction: (action, detail) => applyChatRowAction(listEl, state, c, action, opts, detail),
    });
    listEl.append(node);
  };

  // pinned chats on top, then requests + unpinned chats interleaved by recency
  const timeline = orderedTimeline(state);
  for (const { kind, item } of timeline) (kind === 'request' ? renderRequest : renderChat)(item);
  // N58: bound the decode cache — prune only when over the cap, and only keys the
  // CURRENT render did not use (a search render must not evict the full list).
  if (avCache.size > AVATAR_CACHE_MAX) {
    for (const k of avCache.keys()) {
      if (avCache.size <= AVATAR_CACHE_MAX) break;
      if (!avatarSeen.has(k)) avCache.delete(k);
    }
  }

  if (!timeline.length) {
    const emptyEl = chatsEmptyState(state, strings, opts);
    if (emptyEl) listEl.append(emptyEl);           // null = gated load window (★)
  }
  return listEl;
}

/** Apply a row action (menu or swipe) to the model, then re-render (#44). Pin/
 *  mute toggle, mark-read clears unread+mention, delete/deleteContact remove the
 *  chat row (deleteContact = the CH3 step-2 escalation, which ALSO intends contact
 *  removal — distinguished only by the onPersist intent); info is a stub (no model
 *  change) → opts.onChatInfo. `detail` carries the delete options ({ media }). On a
 *  model change: fire opts.onPersist(action, chat, detail) — the bridge intent (mock
 *  no-op now; a real `ixian:` command when BE ships, §8) — then re-render + onModelChange. */
export function applyChatRowAction(listEl, state, chat, action, opts = {}, detail = {}) {
  switch (action) {
    case 'pin': chat.pinned = !chat.pinned; break;
    case 'mute': chat.muted = !chat.muted; break;
    case 'markRead': chat.unread = 0; chat.mention = false; break;
    // delete + deleteContact both remove the row; the wipe granularity (media,
    // contact) rides `detail`/`action` to the bridge intent (onPersist → BE).
    case 'delete':
    case 'deleteContact':
    case 'revokeRequest': state.chats = (state.chats || []).filter((c) => c !== chat); break;   // B1: a revoked request row goes too
    case 'info': if (opts.onChatInfo) opts.onChatInfo(chat); return;   // stub — no model change
    default: return;
  }
  if (opts.onPersist) opts.onPersist(action, chat, detail);      // bridge intent → C# persists (mock no-op)
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
  const strings = opts.strings || getStrings();
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
  const strings = opts.strings || getStrings();
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
