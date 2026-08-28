/* ★★ #572 ③ (the E-3 dial, CALLED BY EVIDENCE) — THE PRESSED CHAT ROW LIFTS.
 *
 * Damir's walk, F19 on Android: with the mobile anchored dropdown open, the row he
 * long-pressed is not visibly above the deep scrim. The #506② promoted-row treatment
 * exists, but the chats list never got it: `[data-dt-ctx-source]` is the DESKTOP
 * highlight and lives under `:root[data-desktop]`, and the message menu's lift is
 * wired in message-menu.js only.
 *
 * ★ THE #506② STACKING CHECK, RUN FIRST, ON THIS CHAIN — because the failure is
 * SILENT: nothing logs and the row simply stays under the scrim.
 *   body (flex, overflow:hidden)          → no stacking context
 *   .view                                  → no stacking context
 *   .u-scroll#chat-scroll (overflow:auto)  → CLIPS to the scroller, no context
 *   the list element                       → no stacking context
 *   .c-swipe (position:relative, z auto,
 *             overflow:hidden)             → CLIPS to the row box, no context
 *   .c-swipe__content (position:relative)  → transform is CLEARED to '' at rest
 *                                            (chats-swipe.js:88), so no context…
 *   ⚠ …EXCEPT under `.c-swipe[data-open]`, which adds `will-change: transform`
 *     (chats-swipe.css:47). That IS a stacking context, and it would cap the lift.
 *
 * ★ So the lift goes on `.c-swipe`, the OUTERMOST per-row node, not on the item.
 * Both hazards then sit INSIDE the lifted element and can no longer contain it:
 * the drawer's transform and its will-change are descendants. It also puts the row
 * outside `.c-swipe`'s own `overflow:hidden`, so the lifted row's ground is not
 * clipped. `row` itself is the fallback when the swipe wrapper is parked.
 *
 * ⚠ The lift runs ONLY when the anchored dropdown actually applied
 * (`sheet.dataset.mAnchor`). anchorSheetToRow keeps the bottom sheet when the row is
 * unmeasurable, and on desktop it no-ops — desktop keeps the #268 press wash.
 *
 * ⚠ The value is 'row', not ''. `[data-menu-lift]` (message-menu.css) matches both
 * and gives position/z-index/pointer-events to each; only the chat row also needs an
 * opaque ground, because `.c-chatlist-item` is transparent and a message row must
 * stay transparent so the canvas shows around the bubble. */
let liveRowLift = null;   // { addr, host, token } — the row an OPEN anchored row menu points at
let rowLiftToken = 0;     // ★ #606 r2: identity for the undo, so a dying menu cannot release a live one

/* ★★ round-2 MAJOR-1 + MAJOR-2. Two defects, one cause: the first cut kept the lift
 * state in the DOM and undid it through a captured node.
 *   · MAJOR-1: `act()` closes the sheet and runs the action SYNCHRONOUSLY, and the
 *     action re-renders the list. `onDismiss` is deferred by up to 400 ms, so its undo
 *     fired on a node the re-render had already thrown away — and the REPLACEMENT node,
 *     lifted by renderChatsList, had no undo at all. A lifted row is
 *     pointer-events:none, so tapping a row action left that chat dead to taps.
 *   · MAJOR-2: `document.querySelector` returns the FIRST match in document order, and
 *     a dismissing sheet is still in the DOM ahead of a newly opened one. A flush
 *     during that window lifted the OLD row and left the new one under the scrim.
 * So the live lift is MODULE state (one truth, no document order), the release is
 * DOM-WIDE (it cannot miss a node it did not create), and it runs SYNCHRONOUSLY at the
 * action as well as through onDismiss. */
function releaseRowLift() {
  liveRowLift = null;
  if (typeof document === 'undefined') return;
  try {
    /* ★ #606: the ghosts go FIRST and they are REMOVED, not un-marked. A ghost is a
       node this module created; clearing its attribute would strand an opaque copy of
       a chat row on top of the app with nothing left to find it by. */
    const ghosts = document.querySelectorAll('[data-menu-ghost]');
    for (const g of ghosts) { try { g.remove(); } catch (e) {} }
  } catch (e) {}
  try {
    const lifted = document.querySelectorAll('[data-menu-lift="row"]');
    for (const n of lifted) { try { delete n.dataset.menuLift; } catch (e) {} }
  } catch (e) {}
}

/* ★★ #606 — THE GHOST. Rows A2.1/A2.2/12/15, the fourth round on this affordance and
 * the first one with an iOS device in the room.
 *
 * Three rounds raised `z-index` on the row and every one of them was measured on
 * Android. On iOS the row does not lift AT ALL, in either theme, and on one row it
 * sits visibly BEHIND the dim. The chain explains why it was never safe: the scrim is
 * a child of `document.body`, the row is a descendant of `#chat-scroll`, and on iOS
 * that is a real composited scroller — WKWebView's own scroll view is disabled
 * (iOSWebViewHandler), so every `.u-scroll` in this app is one. Whether WebKit will
 * hoist a descendant out of a scrolling layer to clear a sibling of that layer is the
 * assumption all three rounds rested on, and none of them tested.
 *
 * So this stops being a z-index question. We paint a COPY of the row as a SIBLING of
 * the scrim, at the row's own screen rectangle — the technique a native context menu
 * uses, where the pressed view is snapshotted and the real one stays where it is. Two
 * siblings in one stacking context cannot lose to each other on any engine.
 *
 * ★ ADDITIVE BY CONSTRUCTION, which is what makes it safe to ship without an iOS
 * device to prove it on:
 *   · the `data-menu-lift` hoist is untouched, so Android keeps working the way it
 *     works today;
 *   · the ghost is opaque and sits at the same rectangle, so where the hoist already
 *     works the user sees exactly the same pixels;
 *   · a row that cannot be measured produces NO ghost and the behaviour is today's.
 * ⚠ UNVERIFIED on iOS hardware. The mechanism is proven from the code, not from the
 * screen. If it is still wrong, `document.elementFromPoint()` over the pressed row's
 * centre with the menu open names the winner in one line.
 *
 * ⚠ Geometry is INLINE on purpose. Writing `position: fixed` into the stylesheet would
 * put a second declared value on a rule matching `[data-menu-lift]`, and the cascade
 * pin that keeps this family honest asserts one value per property across every rule
 * that matches it. Inline is invisible to the cascade and cannot be out-specified. */
function paintRowGhost(host, lift) {
  if (typeof document === 'undefined' || !host || !lift) return;
  try {
    const r = lift.getBoundingClientRect();
    if (!r || !(r.width > 0) || !(r.height > 0)) return;   // unmeasurable: no ghost, no change
    const ghost = lift.cloneNode(true);
    ghost.dataset.menuGhost = '1';
    ghost.setAttribute('aria-hidden', 'true');
    /* the original stays in the accessibility tree and keeps the row's identity; a
       duplicate id would break every getElementById in the shell. */
    try {
      if (ghost.id) ghost.removeAttribute('id');
      const ided = ghost.querySelectorAll('[id]');
      for (const n of ided) n.removeAttribute('id');
    } catch (e) {}
    const st = ghost.style;
    st.position = 'fixed';
    st.left = r.left + 'px';
    st.top = r.top + 'px';
    st.width = r.width + 'px';
    st.height = r.height + 'px';
    st.margin = '0';
    /* the host is the sheet's parent — the same node the scrim is a child of, so the
       ghost is the scrim's sibling and the band ordering (z-40/42/44) applies between
       them exactly as it was designed to. */
    host.appendChild(ghost);
  } catch (e) { /* a ghost is an enhancement: never let it break the menu */ }
}

function liftPressedRow(sheet, row, address) {
  if (!sheet || !sheet.dataset || sheet.dataset.mAnchor === undefined || !row) return () => {};
  /* ★ #606 r2 (adversarial review, finding 7): resolve the LIVE row first, exactly as
     anchorSheetToRow does. A flush between the press and the 500ms long-press timer
     detaches the pressed node, and a detached node measures all zeros — so the ghost's
     own measurement guard would decline to paint, silently, on the accounts that flush
     most (a restore re-runs loadChats every two seconds). The menu was already anchoring
     to the replacement; the lift has to follow it to the same node. */
  let src = row;
  if (!row.isConnected && address) {
    try {
      const live = document.querySelector('.c-chatlist-item[data-address="' + CSS.escape(String(address)) + '"]');
      if (live) src = live;
    } catch (e) { /* no CSS.escape, or a malformed address — keep the original */ }
  }
  const lift = (src.closest && src.closest('.c-swipe')) || src;
  if (!lift || !lift.dataset) return () => {};
  releaseRowLift();                       // a previous menu's lift never outlives this one
  lift.dataset.menuLift = 'row';
  const token = ++rowLiftToken;
  liveRowLift = { addr: address ? String(address) : '', host: sheet.parentNode || null, token };
  paintRowGhost(sheet.parentNode, lift);  // #606: and the copy that does not need to win
  /* ★ #606 r2 (finding 9): the undo is IDENTITY-CHECKED. `releaseRowLift` is DOM-wide by
     design, and `onDismiss` fires up to 400ms after close — so a dying menu's deferred
     undo could strip a NEWLY opened menu's ghost and lift. Module state exists to stop
     exactly this class (round-2 MAJOR-2); the token extends it to the undo. */
  return () => { if (liveRowLift && liveRowLift.token === token) releaseRowLift(); };
}

/** ★ #606 r2 (adversarial review, finding 6): RE-PAINT after a list re-render.
 *  `renderChatsList` rebuilds every row on any flush — a message in ANY chat is enough —
 *  and it re-applies the lift to the replacement node. The ghost is a snapshot pinned to
 *  a viewport rectangle, so without this it was left behind: an opaque copy of chat A
 *  stranded over whatever row the re-sort moved into A's old slot, with a frozen clock.
 *  Called from chats-shell for the row it just re-lifted. */
export function repaintRowGhost(node) {
  if (!liveRowLift || !liveRowLift.host || !node) return;
  try {
    const ghosts = document.querySelectorAll('[data-menu-ghost]');
    for (const g of ghosts) { try { g.remove(); } catch (e) {} }
  } catch (e) {}
  const lift = (node.closest && node.closest('.c-swipe')) || node;
  paintRowGhost(liveRowLift.host, lift);
}

/** ★ review MINOR-3: the address of the row an ANCHORED row menu currently points at,
 *  or ''. renderChatsList asks on every row it builds, so a flush that lands while the
 *  menu is open re-applies the lift to the replacement node instead of dropping it.
 *  Empty on desktop and for a fail-soft bottom sheet — neither sets [data-m-anchor]. */
export function liftedRowAddress() {
  return liveRowLift ? liveRowLift.addr : '';
}

/**
 * Chat-row context menu (step 4; spec §6). Long-press / right-click a chat row →
 * c-sheet with Pin/Mute/Mark read/Chat info/Delete. Reuses the c-msgmenu sheet
 * styling (message-menu.css) + the message-menu interaction pattern (long-press
 * ~500ms, cancel on >10px move = scroll intent; desktop right-click; Android
 * double-open guard). Delete routes through the c-modal confirm. Chat info fires
 * onAction('info') → the shell routes it (#247: home.html sends ixian:details:
 * for 1:1 — desktop pane / mobile takeover — and opens the chat for groups).
 *
 * Pin/Mute are CAPABILITY-GATED (parkable until BE persists them, #67/§8): shown
 * only when capabilities.pin / capabilities.mute are truthy. Chat info is always
 * present. Delete is capability-gated. A HANDSHAKING row (#109, still establishing)
 * gets a single "Cancel handshake" action instead — the row's only recovery path
 * (it has no swipe / open), so a stalled handshake is never an un-removable trap.
 *
 * openChatRowMenu({ chat, row, host, onAction, strings, capabilities, handshaking }) → sheet
 *   row (★ Batch E (a), #557): the pressed row element — on mobile the menu
 *   anchors to it (dropdown above the row); absent → bottom sheet, unchanged.
 *   onAction(action) — 'pin' | 'mute' | 'info' | 'delete' | 'cancelHandshake' | 'revokeRequest' (B1)
 * attachChatRowMenu(row, opts) — wires long-press + right-click on the row
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createAvatar } from './avatar.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { createModal, openModal } from './modal.js';
import { createButton } from './button.js';
import { closeChatRowSwipe } from './chats-swipe.js';
import { isOverlayOpen } from './overlay.js';
import { anchorSheetToRow } from './desktop-anchors.js';   // ★ Batch E (a) (#557): mobile anchored dropdown

const CHATMENU_LONG_PRESS_MS = 500;   // §5b
const CHATMENU_MOVE_CANCEL_PX = 10;   // §5b: >10px move = scroll intent

/* ★★ ONE HOME FOR "IS THIS ROW A ROOM?" (#46 loop r2 sweep).
 * This expression was written out TWICE, byte-identical, in openRemoveContactSheet and in
 * openDeleteFlow. Both answer the same question and both drive a DESTRUCTIVE choice: a room
 * offers "Leave group" and no "Remove contact" row, a person offers the opposite. Two copies
 * of one rule is the shape this project keeps paying for, so there is one copy now.
 * ⚠ `chat.isGroup === true` is an EXPLICIT boolean test on purpose. #646① was a guard on a
 * metadata BAG, which is always truthy. Do not relax it to `chat.isGroup`.
 * ⚠ NOT the same question as the avatar's `group:` flag (:335). That one asks "draw the group
 * glyph" and reads `chat.type === 'group'` alone. Keep them apart. */
function isRoomRow(chat) {
  return chat.type === 'group' || chat.type === 'bot' || chat.isGroup === true;
}

export function openChatRowMenu({ chat = {}, row = null, host, onAction, onNeedGroups, strings = getStrings(), capabilities = {}, handshaking = false } = {}) {
  closeChatRowSwipe();                              // any open swipe drawer closes when a sheet takes over (single-open invariant across row types)
  const content = document.createElement('div');
  content.className = 'c-msgmenu';                 // reuse the sheet-menu styling
  const list = document.createElement('div');
  list.className = 'c-msgmenu__list';

  const act = (action) => {
    // ★ round-2 MAJOR-1: release BEFORE the action. onAction re-renders the list in
    // this same tick, and onDismiss does not run for up to 400 ms.
    releaseRowLift();
    closeSheet(sheet);
    if (onAction) onAction(action);
  };
  const item = (glyph, label, onClick, destructive = false) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-msgmenu__item';
    if (destructive) b.dataset.destructive = '';
    b.append(icon(glyph, { size: 20 }), document.createTextNode(label));
    b.addEventListener('click', onClick);
    list.append(b);
  };

  // #109: a handshaking row can ONLY be cancelled (its recovery path) — no
  // pin/mute/info/open while the key exchange is still in flight.
  // (L7 removed "Mark as read"; this list named it until the #46 loop r2 sweep. A
  // comment that describes behaviour the code no longer has is a defect here, #647.)
  if (handshaking) {
    item('x', strings.cancelHandshake || 'Cancel handshake', () => {
      releaseRowLift();   // round-2 MAJOR-1: the modal replaces the menu; the lift must not survive it
      closeSheet(sheet);
      openModal(createModal({
        title: strings.cancelHandshakeTitle || 'Cancel handshake?',
        body: strings.cancelHandshakeBody || 'This stops establishing the secure connection and removes the chat.',
        role: 'alertdialog', host,
        actions: [
          { label: strings.keepWaiting || 'Keep waiting', type: 'text', autofocus: true },
          { label: strings.cancel || 'Cancel', type: 'fill', intent: 'destructive', onClick: () => { if (onAction) onAction('cancelHandshake'); } },
        ],
      }));
    }, true);
    content.append(list);
    let undoLift = () => {};
    const sheet = createSheet({ content, host, strings, onDismiss: () => undoLift() });
    openSheet(sheet);
    anchorSheetToRow(sheet, row, { host, address: chat && chat.address });   // ★ Batch E (a) (#557): mobile dropdown, above the row
    undoLift = liftPressedRow(sheet, row, chat && chat.address);    // ★ #572 ③: and the row it points at lifts above the scrim
    return sheet;
  }

  // toggles reflect what tapping DOES (glyph + label). Pin/Mute parkable (§8).
  if (capabilities.pin) {
    item(chat.pinned ? 'pinned-off' : 'pin',
         chat.pinned ? (strings.unpin || 'Unpin') : (strings.pin || 'Pin'),
         () => act('pin'));
  }
  if (capabilities.mute) {
    item(chat.muted ? 'bell' : 'bell-off',
         chat.muted ? (strings.unmute || 'Unmute') : (strings.mute || 'Mute'),
         () => act('mute'));
  }
  /* ★★ "Mark as read" IS REMOVED (Damir, #46 loop 2026-08-27): *"we decided to remove
     the mark as read from chat row menu, no need to force it."* There is no backend verb.
     The badge returned on the next flush. The counterpart got no read receipt. So the
     item was a control that reported an outcome it did not cause. Do not add it back
     without a BE verb, a persisted count and a read receipt. */
  item('info-circle', strings.chatInfo || 'Chat info', () => act('info'));
  // Delete — destructive last (§5b), CAPABILITY-GATED (CH3). Removing a chat or
  // wiping history needs BE verbs (`removehistory`/`remove` live on
  // SingleChatPage/ContactDetails, NOT on HomePage's dispatch), so a delete from
  // the chats list would drop the row visually but reappear on the next
  // loadChats re-flush. Parked behind capabilities.delete (built + ready) so it's
  // never shown broken (decided model) — flip on when the §8 verbs land. The
  // confirm is the TWO-STEP flow (Damir 2026-07-07): step 1 removes the row,
  // step 2 opts into wiping history + files + the contact.
  /* ★ B1 (Damir, Batch B 2026-08-24): an OUTGOING PENDING contact request row does
     not "delete" — it REVOKES, and only through a PROMPT (never silently). Verified at
     source: SingleChatPage's `ixian:undorequest` is `FriendList.removeFriend` with a
     "TODO: notify the other party" — the peer is NOT told and their copy of the request
     stays until they act on it; the copy says exactly that. */
  if (capabilities.delete && chat.request) {
    /* ★ #562 (Damir 2026-08-25): HIDE, not revoke — non-destructive, plain ink.
       The Friend record stays so a later accept completes; the flow's words say
       exactly what happens. */
    item('eye-off', strings.hideRequest || 'Hide request', () => {
      releaseRowLift();
      closeSheet(sheet);
      openRevokeRequestFlow({ chat, host, onAction, strings });
    });
  } else if (capabilities.delete) {
    item('trash', strings.deleteChat || 'Delete chat', () => {
      releaseRowLift();
      closeSheet(sheet);
      openDeleteFlow({ chat, host, onAction, onNeedGroups, strings });
    }, true);
  }

  content.append(list);
  /* ⚠ onDismiss, not the action handlers: overlay.js raises it on EVERY route out —
   * an action, the scrim, Esc and the Android back button. A lift cleared only in
   * act() would strand a permanently lifted row, and a lifted row is
   * pointer-events:none — a chat the user can no longer tap. */
  let undoLift = () => {};
  const sheet = createSheet({ content, host, strings, onDismiss: () => undoLift() });
  openSheet(sheet);
  /* ★ Batch E (a) (#557, Damir 2026-08-22): the chats-row menu anchors to the
   * long-pressed row on mobile — same grammar as the message menu, one helper.
   * A caller with no row element keeps the bottom sheet (fail-soft). */
  anchorSheetToRow(sheet, row, { host, address: chat && chat.address });
  undoLift = liftPressedRow(sheet, row, chat && chat.address);    // ★ #572 ③ (E-3): the pressed row above the scrim
  return sheet;
}

/** Peer identity header (avatar + name) for the delete modals — "no mistake what
 *  will happen" (Damir 2026-07-07). Shared by both steps. */
function deletePeerHeader(chat, strings) {
  const h = document.createElement('div');
  h.className = 'c-delete-chat__peer';
  h.append(createAvatar({ src: chat.avatar, name: chat.name, address: chat.address, size: 40, group: chat.type === 'group', strings }));
  const nm = document.createElement('span');
  nm.className = 'c-delete-chat__name';
  nm.textContent = chat.name || chat.address || '';
  h.append(nm);
  return h;
}

/** One option row → { row, input }. ★ A7 (Damir, Batch A 2026-08-24): the GROUP-CREATION
 *  checkbox grammar (contacts-shell pickerRow: role=checkbox + aria-checked + the trailing
 *  select circle), not the off-brand native <input type=checkbox>. `input` keeps the old
 *  shape for callers (`.checked`) — it is the row itself now. */
function deleteCheckbox(label, { checked = false, disabled = false } = {}) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'c-delete-chat__opt';
  row.setAttribute('role', 'checkbox');
  row.setAttribute('aria-checked', String(!!checked));
  if (disabled) { row.disabled = true; row.setAttribute('aria-disabled', 'true'); }
  const txt = document.createElement('span');
  txt.className = 'c-delete-chat__opt-label';
  txt.textContent = label;
  const check = document.createElement('span');
  check.className = 'c-delete-chat__check';
  check.setAttribute('aria-hidden', 'true');
  check.append(icon('check', { size: 16 }));
  row.append(txt, check);
  const api = { row, get checked() { return row.getAttribute('aria-checked') === 'true'; } };
  row.addEventListener('click', () => {
    if (row.disabled) return;
    row.setAttribute('aria-checked', String(!api.checked));
  });
  return { row, input: api };
}

/** ★ A5 (Damir's shape, Batch A 2026-08-24) — REMOVE CONTACT is a BOTTOM SHEET.
 *  It leads with the peer, states what goes (your copy — they keep theirs), and shows
 *  the groups you are BOTH in (A4's data, asked through onNeedGroups → the shell's
 *  `ixian:sharedGroups:<addr>` → setRemoveSheetGroups). Verified at source:
 *  Core's FriendList.removeFriend REFUSES a contact who is in any of your groups
 *  (isFriendInGroup), so a shared group is a BLOCKER, not decoration — the sheet
 *  offers to leave those groups first (multi-select, the pickerRow grammar) behind an
 *  additional confirm, and Remove stays disabled until every blocker is ticked.
 *  Groups and bots: the same sheet reads "Leave group" (no blockers).
 *  onRemove({ leaveGroups: [addresses] }) fires ONCE, after the confirm.
 *  Alternatives explored for the handoff: (a) two modals (the old shape — no room for
 *  the group list, and the refusal came AFTER the tap); (b) block + explain only (honest
 *  but a dead end: the user has to find each group and leave it by hand); (c) THIS —
 *  explain + offer the fix in place. */
export function openRemoveContactSheet({ chat = {}, host, strings = getStrings(), onNeedGroups, onRemove, onKeep } = {}) {
  const isGroup = isRoomRow(chat);   // ★ one home — see isRoomRow
  const content = document.createElement('div');
  content.className = 'c-remove-contact';
  content.append(deletePeerHeader(chat, strings));

  const body = document.createElement('p');
  body.className = 'c-delete-chat__body';
  body.textContent = isGroup
    ? (strings.leaveGroupBody || 'Leave this group? You stop receiving its messages. Your copy of the chat is removed from this device.')
    : (strings.removeSheetBody || 'Remove this contact from your device? Their chat and files go with them. They keep their copy.');
  content.append(body);

  /* shared groups strip (1:1 only) */
  let groupsEl = null;
  let hint = null;
  const selected = new Set();
  let groups = null;                                     // null = loading
  if (!isGroup) {
    groupsEl = document.createElement('div');
    groupsEl.className = 'c-remove-contact__groups';
    const gTitle = document.createElement('h3');
    gTitle.className = 'c-remove-contact__title';
    gTitle.textContent = strings.sharedGroupsTitle || 'Groups you are both in';
    groupsEl.append(gTitle);
    hint = document.createElement('p');
    hint.className = 'c-remove-contact__hint';
    hint.setAttribute('role', 'status');
    hint.textContent = strings.sharedGroupsLoading || 'Checking your groups…';
    groupsEl.append(hint);
    content.append(groupsEl);
  }

  const err = document.createElement('p');
  err.className = 'c-remove-contact__error';
  err.setAttribute('role', 'alert');
  err.hidden = true;
  content.append(err);

  const actions = document.createElement('div');
  actions.className = 'c-remove-contact__actions';
  let sheet = null;
  const keep = createButton({ label: strings.keepContact || 'Keep contact', type: 'text', size: 44,
    onClick: () => { closeSheet(sheet); } });
  const remove = createButton({
    label: isGroup ? (strings.leaveGroup || 'Leave group') : (strings.removeContact || 'Remove contact'),
    type: 'fill', size: 44, intent: 'destructive',
    onClick: () => confirmRemove(),
  });
  remove.classList.add('c-remove-contact__cta');
  const removeLabel = remove.querySelector('.c-button__label');
  actions.append(keep, remove);
  content.append(actions);

  function blockersLeft() {
    if (!groups) return [];
    return groups.filter((g) => !selected.has(g.address));
  }
  function syncCta() {
    if (isGroup) { remove.disabled = false; return; }
    if (groups === null) { remove.disabled = true; return; }   // still loading → no blind remove
    const left = blockersLeft().length;
    remove.disabled = left > 0;
    if (removeLabel) {
      removeLabel.textContent = selected.size
        ? (strings.leaveAndRemove || 'Leave {n} & remove').split('{n}').join(String(selected.size))
        : (strings.removeContact || 'Remove contact');
    }
    if (hint) {
      hint.textContent = !groups.length
        ? (strings.noSharedGroupsRemovable || 'No shared groups. This contact can be removed.')
        : (left
          ? (strings.sharedGroupsBlock || 'A contact who is in one of your groups cannot be removed. Tick the groups to leave them first, or keep the contact.')
          : (strings.sharedGroupsReady || 'You will leave the ticked groups and their chats are removed from this device. Then the contact is removed.'));
    }
  }
  function renderGroups() {
    if (!groupsEl) return;
    for (const old of groupsEl.querySelectorAll('.c-remove-contact__row')) old.remove();
    for (const g of groups || []) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'c-remove-contact__row';
      row.setAttribute('role', 'checkbox');
      row.setAttribute('aria-checked', String(selected.has(g.address)));
      row.append(createAvatar({ name: g.name || '', address: g.address || '', size: 40, group: true }));
      const nm = document.createElement('span');
      nm.className = 'c-remove-contact__rowname';
      nm.textContent = g.name || g.address || '';
      const check = document.createElement('span');
      check.className = 'c-delete-chat__check';
      check.setAttribute('aria-hidden', 'true');
      check.append(icon('check', { size: 16 }));
      row.append(nm, check);
      row.addEventListener('click', () => {
        const on = !selected.has(g.address);
        if (on) selected.add(g.address); else selected.delete(g.address);
        row.setAttribute('aria-checked', String(on));
        syncCta();
      });
      groupsEl.insertBefore(row, hint);
    }
    syncCta();
  }
  let fired = false;                                     // loop r1 A-1: the destructive verb fires ONCE per sheet
  function confirmRemove() {
    if (remove.disabled || fired) return;
    const leaveGroups = [...selected];
    // closeSheet is a no-op once the sheet has already gone (the §3 escalation path)
    const fire = () => { if (fired) return; fired = true; if (onRemove) onRemove({ leaveGroups }); closeSheet(sheet); };
    if (!leaveGroups.length) { fire(); return; }
    /* ★★ REMOVE-CONTACT SPEC §3 (Damir, screenshots 2026-08-28): ONE DECISION ON
     * SCREEN AT A TIME. The confirm used to open ON TOP of the still-open sheet —
     * you could read the sheet's title and its buttons behind the dialog, two
     * destructive surfaces at once, each with its own red button.
     * The sheet CLOSES first and the dialog opens from the CLOSE COMPLETION.
     * ⚠ Not "alongside": closeSheet is animated and onDismiss is deferred to the
     * removal, so firing both together lets the sheet's dismissal race the dialog's
     * and a light-dismiss tap can land on the wrong surface — the hazard the sheet
     * machinery already documents.
     * `_escalating` tells the dismiss handler this is NOT a "keep": the user chose
     * to go on, so onKeep must not fire behind the dialog they are looking at. */
    sheet._escalating = () => openLeaveConfirm(leaveGroups, fire);
    closeSheet(sheet);
  }

  function openLeaveConfirm(leaveGroups, fire) {
    openModal(createModal({
      title: (strings.leaveGroupsConfirmTitle || 'Leave {n} groups and remove {name}?')
        .split('{n}').join(String(leaveGroups.length)).split('{name}').join(chat.name || chat.address || ''),
      // loop r1 A-4 (C#): leaving a group REMOVES that group's chat from this device
      // (Core removeFriend → deleteMessages) — the copy says so
      body: strings.leaveGroupsConfirmBody || 'You leave the ticked groups first. Their chats are removed from this device. Then the contact is removed.',
      role: 'alertdialog', host,
      actions: [
        // ⚠ Cancel here means "I changed my mind", and the sheet is already gone —
        // so it must answer the HOST the same way a plain dismissal does, or the
        // chats row that opened this flow is left believing a removal is coming.
        { label: strings.cancel || 'Cancel', type: 'text', autofocus: true,
          onClick: () => { if (onKeep) onKeep(); } },
        { label: strings.leaveAndRemoveConfirm || 'Leave & remove', type: 'fill', intent: 'destructive', onClick: fire },
      ],
    }));
  }

  sheet = createSheet({ content, host, strings,
    title: isGroup ? (strings.leaveGroupTitle || 'Leave group?') : (strings.removeSheetTitle || 'Remove contact?'),
    onDismiss: () => {
      if (liveRemoveSheet === sheet) liveRemoveSheet = null;
      /* ★ §3: this dismissal fires at REMOVAL — after the exit transition — which is
         exactly "the sheet closes, THEN the dialog appears". An escalation is not a
         keep, so onKeep is withheld and the confirm answers for it. */
      if (sheet._escalating) { const go = sheet._escalating; sheet._escalating = null; go(); return; }
      if (!sheet._removed && onKeep) onKeep();
    } });
  sheet._removed = false;
  sheet._address = chat.address || '';
  liveRemoveSheet = sheet;
  sheet._setGroups = (list) => { groups = (list || []).filter((g) => g && g.address); renderGroups(); };
  sheet._setError = (msg) => { err.hidden = !msg; err.textContent = msg || ''; };
  const origFire = onRemove;
  onRemove = (p) => { sheet._removed = true; if (origFire) origFire(p); };
  syncCta();
  openSheet(sheet);
  if (!isGroup) {
    if (onNeedGroups) {
      onNeedGroups(chat.address);                          // the shell asks C#; the answer lands via setRemoveSheetGroups
      // loop r2 R2-3: a belt — an old exe answers NOTHING; after 4 s the hint says so.
      // Remove stays DISABLED (a blind remove would hit Core's refusal anyway), Keep is the exit.
      const belt = setTimeout(() => {
        if (groups !== null || !isOverlayOpen(sheet)) return;
        if (hint) hint.textContent = strings.sharedGroupsUnknown || 'Could not check your groups. Keep the contact and try again.';
      }, 4000);
      sheet.addEventListener('transitionend', () => { if (!isOverlayOpen(sheet)) clearTimeout(belt); }, { once: true });
    } else {
      sheet._setGroups(chat.sharedGroups || []);           // static hosts (demos): what the chat carries
    }
  }
  return sheet;
}

/** The shell's answer to onNeedGroups: the LIVE remove sheet for `address` takes
 *  [{ name, address }] (name/address pairs from C#). A late answer for another peer,
 *  or for a sheet already gone, is dropped. Returns true when applied. */
let liveRemoveSheet = null;
// loop r1 A-3: "live" = ON THE OVERLAY STACK (isOverlayOpen) — a sheet in its 400 ms
// exit is still connected but pointer-dead, and it must not swallow a late answer
export function setRemoveSheetGroups(address, groups) {
  const sh = liveRemoveSheet;
  if (!sh || !isOverlayOpen(sh) || String(sh._address || '') !== String(address || '')) return false;
  sh._setGroups(groups || []);
  return true;
}

/** The shell's report of the verb's outcome: 'blocked' re-opens the question with the
 *  blocking groups named; anything else is the shell's toast. Returns true when a live
 *  sheet took it. */
export function setRemoveSheetResult(address, status, groups, strings = getStrings()) {
  const sh = liveRemoveSheet;
  if (!sh || !isOverlayOpen(sh) || String(sh._address || '') !== String(address || '')) return false;
  if (status === 'blocked') {
    sh._setGroups(groups || []);
    sh._setError(strings.removeBlockedInline || 'Still a member of the groups above. Tick them to leave first.');
    return true;
  }
  return false;
}

/** Two-step delete confirm (CH3, Damir 2026-07-07, redesigned after F5). Step 1
 *  "Delete chat" leads with the peer avatar + name and CHECKBOXES so it's clear
 *  exactly what goes: the chat (fixed — that's the action) + optionally downloaded
 *  media & files. Confirming removes the row and opens step 2 — ★ A5: the REMOVE-
 *  CONTACT SHEET (openRemoveContactSheet), no longer a second modal.
 *  Each terminal fires onAction(action, detail) so the shell emits the verb
 *  (★ A6: `ixian:removehistory:<addr>` / `ixian:removecontact:<addr>:<leave>` —
 *  before this batch nothing reached C#, and the contact stayed on disk).
 *  ★ L13 (#676): on a ROOM row the third box is "Leave group" instead, and a ticked
 *  one swaps the chat verb for `ixian:leavegroup:<addr>` — Core's removeFriend deletes
 *  the history file itself, so leaving covers the "Delete chat" box too.
 *  opts.onNeedGroups(addr) → the shell asks C# for the shared groups. */
export function openDeleteFlow({ chat = {}, host, onAction, onNeedGroups, strings = getStrings() } = {}) {
  const content = document.createElement('div');
  content.className = 'c-delete-chat';
  content.append(deletePeerHeader(chat, strings));
  const optsWrap = document.createElement('div');
  optsWrap.className = 'c-delete-chat__opts';
  // "Delete chat" is fixed-on (you're in the delete-chat flow) — a checked+disabled
  // box states the outcome plainly; "media & files" is the real toggle.
  let step1Fired = false;
  const cbChat = deleteCheckbox(strings.deleteChatOpt || 'Delete chat', { checked: true, disabled: true });
  const cbMedia = deleteCheckbox(strings.deleteMediaOpt || 'Delete media & files');
  optsWrap.append(cbChat.row, cbMedia.row);
  /* ★★ REMOVE-CONTACT SPEC §1 (Damir, 2026-08-28): removing the contact is a THIRD
   * CHECKBOX here, not a second sheet reached another way. One sheet answers the whole
   * question, and the escalation to the group picker becomes conditional on the tick
   * rather than on a separate entry point.
   * ⚠ It defaults OFF, deliberately, and it is the only one that does: it is the
   * irreversible half, and a pre-ticked destructive box is how people remove contacts
   * they meant to keep. A GROUP or a bot has no contact to remove — leaving is the
   * whole action there — so the row is not offered. */
  const isGroupChat = isRoomRow(chat);   // ★ one home — see isRoomRow
  const cbContact = isGroupChat ? null : deleteCheckbox(strings.removeContactOpt || 'Remove contact');
  if (cbContact) optsWrap.append(cbContact.row);
  /* ★★ L13 (#676, Damir): the ROOM's half of the same question. A person's row offers
   * "Remove contact"; a room has no contact to remove — the irreversible half there is
   * LEAVING, and until this batch the room row could not do it from here at all: the flow
   * sent `ixian:removehistory:` alone, so the chat vanished and you were still in the
   * group, still receiving it, and it came back on the next message.
   * ⚠ OFF by default, for the same reason as "Remove contact": it is the irreversible
   * half, and it is the ONLY box here that other people can see the effect of.
   * ⚠ The LABEL is the existing `leaveGroup` key, which the row menu and the chat-info
   * danger row already use for both a group and a bot room — one word for one action, and
   * no new string for a batch that adds no new concept. */
  const cbLeave = isGroupChat ? deleteCheckbox(strings.leaveGroup || 'Leave group') : null;
  if (cbLeave) optsWrap.append(cbLeave.row);
  content.append(optsWrap);
  /* ★ What the tick may TRUTHFULLY promise, read at Ixian-Core 097341a (#672 · #676):
   * the leave rides the PENDING-message path with a push notification, per member, so it
   * reaches members who are offline; on their device handleLeave runs
   * users.delUser(sender) — you really do leave their roster — and if YOU are the owner,
   * handleLeave removes the group outright on every member's device. Nothing here claims
   * delivery, because a pending message is a promise to keep trying, not a receipt. */
  if (cbLeave) {
    const note = document.createElement('p');
    note.className = 'c-delete-chat__body';
    note.textContent = strings.leaveGroupNote
      || 'Everyone in the group is told you left, even if they are offline right now.';
    content.append(note);
  }

  /* ★★ F5 4.7, RULED BY DAMIR 2026-08-28 — OPTION 2: no second surface, the ONE modal
   * carries the weight. Until L13 a room's Delete had nothing destructive to confirm (two
   * boxes, both local), which is why the row read as "no confirmation" on the walk. The
   * leave tick changes that — other people see it, Core cannot undo it, and an OWNER
   * leaving removes the group for everyone — so THE RED BUTTON NAMES THE ACT: "Delete"
   * becomes "Leave and delete" the moment the box is ticked, and the note stays on screen
   * beside it. One screen, one press, and the press says what it does.
   * ⚠ Deliberately NOT the person's grammar. That row escalates its irreversible tick to a
   * second sheet because the sheet has WORK to do — it enumerates the shared groups Core
   * refuses on and offers to leave them first. There is nothing to enumerate here, and a
   * second surface whose only content is the question again is a tap, not a safeguard. */
  const modal = createModal({
    title: strings.deleteChatTitle || 'Delete chat?',
    content, role: 'alertdialog', host,
    actions: [
      { label: strings.cancel || 'Cancel', type: 'text', autofocus: true },   // safe action focused (APG)
      { label: strings.delete || 'Delete', type: 'fill', intent: 'destructive',
        onClick: () => {
          if (step1Fired) return;                              // loop r1 A-2: one shot (modal actions get no event)
          step1Fired = true;
          const media = cbMedia.input.checked;
          // ★ L13: the leave rides the SAME terminal, as a flag on the delete detail —
          // one intent, one verb (the shell swaps `ixian:removehistory:` for
          // `ixian:leavegroup:`, which does the history removal itself). A second
          // onAction here would be a second location.href send for one user action.
          const leaveGroup = !!(cbLeave && cbLeave.input.checked);
          if (onAction) onAction('delete', { media, leaveGroup });   // removes the row (+ media/leave intent)
          // ★ §1: only a ticked "Remove contact" escalates. Without it the chat is
          // deleted and the contact stays, which is what the two other boxes describe.
          if (!cbContact || !cbContact.input.checked) return;
          openRemoveContactSheet({
            chat, host, strings, onNeedGroups,
            onRemove: ({ leaveGroups }) => { if (onAction) onAction('deleteContact', { media, leaveGroups }); },
          });
        } },
    ],
  });
  /* ★ The relabel is wired to the SAME box the terminal reads — one source for the word
   * and for the act, so the button can never promise a leave the flag does not carry.
   * ⚠ deleteCheckbox's row is a role=checkbox BUTTON that flips aria-checked in its own
   * click listener, and listeners fire in registration order, so this one — added after —
   * always reads the value the confirm will read. */
  if (cbLeave) {
    const cta = [...modal.querySelectorAll('.c-modal__actions .c-button')].pop();
    const lab = cta ? cta.querySelector('.c-button__label') : null;
    if (lab) {
      cbLeave.row.addEventListener('click', () => {
        lab.textContent = cbLeave.input.checked
          ? (strings.leaveAndDelete || 'Leave and delete')
          : (strings.delete || 'Delete');
      });
    }
  }
  openModal(modal);
}

/** ★ B1's revoke prompt, REWRITTEN by ★ #562 (Damir 2026-08-25): HIDE, explained
 *  with words. The removeFriend revoke destroyed the record a future accept needs
 *  — Damir's repro: the peer accepted a revoked request and got a chat that could
 *  never deliver (RC1's cost, now with evidence). Hiding keeps the Friend record
 *  alive: the peer's accept completes and the chat resurrects (the #193 tombstone
 *  evidence rule — the accept IS a newer message). Nothing here is destructive,
 *  so nothing here is red. onAction('revokeRequest') keeps its id (plumbing);
 *  BOTH surfaces (chats-list row + the chat waiting strip) open THIS flow. */
export function openRevokeRequestFlow({ chat = {}, host, onAction, strings = getStrings() } = {}) {
  const content = document.createElement('div');
  content.className = 'c-delete-chat';
  content.append(deletePeerHeader(chat, strings));
  const body = document.createElement('p');
  body.className = 'c-delete-chat__body';
  body.textContent = strings.hideRequestBody
    || 'The chat is hidden from your list. They still see the request; if they accept it, the chat comes back.';
  content.append(body);
  let fired = false;
  openModal(createModal({
    title: strings.hideRequestTitle || 'Hide this request?',
    content, role: 'alertdialog', host,
    actions: [
      { label: strings.keepContactRequest || 'Keep request', type: 'text', autofocus: true },
      { label: strings.hideRequestConfirm || 'Hide', type: 'fill',
        onClick: () => { if (fired) return; fired = true; if (onAction) onAction('revokeRequest'); } },
    ],
  }));
}

/* ★★ #46 loop (2026-08-29), Damir on Android: "sometimes when I get back to the chats
 * list from a conversation it lands with a row lifted, the background dimmed and the
 * dropdown shown. It did it with the bottom sheet too."
 *
 * AN ARMED LONG PRESS MUST NOT OUTLIVE ITS ROW OR ITS SCREEN. The 500 ms timer below is
 * WALL-CLOCK and is cancelled only by `pointerup` / `pointercancel` ON THE SAME NODE.
 * `renderChatsList` replaces EVERY row on every flush — a message in any chat is enough,
 * and opening a chat clears its unread, which is itself a flush. If a flush lands between
 * the press and the release, the release is delivered to the NEW node, whose own timer is
 * null, and the old closure's timer survives and fires into a shell the user has already
 * left. `liftPressedRow` then helpfully re-finds the live row by address (:138), so the
 * menu is a fully-formed one — which is exactly what he described.
 *
 * ★ The #589 rule: the SCREEN cancels, not each call site. `renderChatsList` clears every
 * armed press before it detaches the rows, and a hidden document clears them too.
 * ⚠ A flush therefore EATS a long press in progress. That is the intended trade: a press
 * the user can simply repeat, against a menu that opens by itself over the chats list. */
const armedRowPresses = new Set();

/** Cancel every armed long press. Called by `renderChatsList` before it detaches the
 *  rows, and by the hide edges below. Safe to call when nothing is armed. */
export function clearChatRowMenuTimers() {
  for (const cancel of Array.from(armedRowPresses)) {
    try { cancel(); } catch (e) { /* one dead row must not block the rest */ }
  }
}

if (typeof document !== 'undefined') {
  /* the #589 pair. A native page pushed over this shell does not always deliver
     `pointercancel`, and it must never leave a press armed behind it. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearChatRowMenuTimers();
  });
  if (typeof window !== 'undefined') window.addEventListener('pagehide', clearChatRowMenuTimers);
}

/** Long-press (touch) + right-click (desktop) wiring for one chat row. */
export function attachChatRowMenu(row, opts = {}) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  let fired = false;

  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    armedRowPresses.delete(cancel);
  };

  row.addEventListener('pointerdown', (e) => {
    fired = false;                              // any new gesture resets suppression (audit r4)
    if (e.button !== 0) return;                 // right button → contextmenu path
    // #265 (Damir ①): long-press = TOUCH-only; a held MOUSE button never pops a
    // menu on desktop (right-click does). Touch-screen desktops keep it (MINOR-7).
    if (document.documentElement.hasAttribute('data-desktop') && e.pointerType !== 'touch') return;
    startX = e.clientX; startY = e.clientY;
    cancel();
    timer = setTimeout(() => {
      timer = null;
      armedRowPresses.delete(cancel);
      /* ★ the belt for the same defect: a row detached by a flush, or a shell the user
         has already left, never opens a menu. `isConnected` is FALSE for a replaced row,
         and openChatRowMenu would otherwise re-anchor to the live twin by address. */
      if (document.hidden || !row.isConnected) return;
      fired = true;
      openChatRowMenu({ row, ...opts });
    }, CHATMENU_LONG_PRESS_MS);
    armedRowPresses.add(cancel);
  });
  row.addEventListener('pointermove', (e) => {
    if (timer && (Math.abs(e.clientX - startX) > CHATMENU_MOVE_CANCEL_PX ||
                  Math.abs(e.clientY - startY) > CHATMENU_MOVE_CANCEL_PX)) cancel();
  });
  row.addEventListener('pointerup', cancel);
  row.addEventListener('pointercancel', cancel);
  // long-press fired → the release click must not open the chat
  row.addEventListener('click', (e) => {
    if (fired) { e.preventDefault(); e.stopPropagation(); fired = false; }
  }, true);

  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (fired) return;                          // Android fires contextmenu ≈ long-press (audit r3)
    cancel();
    fired = true;
    openChatRowMenu({ row, ...opts });
  });

  /* KEYBOARD PATH TO THE CONTEXT MENU (a11y). ★ THE CONTRACT IS THE ROUTE, NOT THE LIST:
     the long-press and the swipe accelerator are BOTH pointer-only, so this handler is the
     ONLY way a keyboard user reaches ANY row action. Shift+F10 and the dedicated
     ContextMenu/Apps key are the standard "open context menu" bindings.
     ⚠ Keep this route working whatever the menu holds. Today the menu builds Pin/Unpin,
     Mute/Unmute, Chat info and Hide request / Delete chat; a handshaking row builds Cancel
     handshake alone.
     ⚠ THIS LINE NAMED "Mark-read" UNTIL THE #46 LOOP r2 SWEEP. L7 removed that action on
     purpose (see the note beside the menu items above) and the enumeration here was left
     behind, so it promised a keyboard path to an action that no longer exists. Do not read
     a missing item as an a11y gap and re-add it — it needs a BE verb, a persisted count and
     a read receipt. Keep this text equal to the code (#647). */
  row.addEventListener('keydown', (e) => {
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault();
      cancel();
      fired = false;                            // keyboard open ≠ a click to suppress
      openChatRowMenu({ row, ...opts });
    }
  });
}
