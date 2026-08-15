/**
 * contacts-shell — FAB contacts picker · add-contact · group setup
 * (docs/contacts-spec.md; Phase 1 #2). Bridge grammars: ContactNewPage
 * (bridge-audit-A.md §3) + WalletRecipientPage (§14).
 *
 * createContactsPicker({ contacts, purpose = 'start', onAddContact, onCreateGroup,
 *                        onOpenChat, onViewContact, onNext, onBack, strings })
 *   contacts: [{ name, address, avatar, online, type: 0|1|2, pending }]
 *   purpose 'start' (FAB): actions = Add contact + Create group; tap = onOpenChat.
 *   purpose 'directory' (topbar Contacts): action = Add contact only; tap =
 *   onViewContact (contact details) — group creation stays with the FAB (start
 *   affordance), the directory is for finding/inspecting people.
 *   purpose 'app' (mini-app launch target): opens DIRECTLY in the SAME select
 *   grammar group creation uses (topbar ✓ confirms → onNext(selected)), with the
 *   differences the launch target demands: it selects EXACTLY ONE target (rows are
 *   radios — C# opens one session against one friend/group, so a second pick would
 *   be silently dropped), GROUPS are selectable (a mini-app can be joined against a
 *   group friend — WalletRecipientPage(payment:false) listed groups too), and the
 *   topbar back leaves the picker outright (there is no browse state to fall back
 *   to). No action rows — the picker IS the task.
 *   Free fns (#44): setPickerMode(el, 'browse'|'multi') · getPickerSelection(el)
 *                   · setPickerSelection(el, addresses) · setPickerContacts(el, contacts)
 *
 * createAddContact({ onCheckAddress, onSendRequest, onScan, onOpened, onBack, strings })
 *   onCheckAddress(address, ctrl) — ctrl.done() = valid ✓ (checkAddress is
 *   SILENT on failure, bridge-audit-A.md:201 — no live "invalid" state).
 *   onSendRequest(address, ctrl)  — ctrl.done() → success morph → onOpened(address);
 *                                   ctrl.fail(msg) → inline error (never an alert).
 *   Free fn: setAddContactAddress(el, address)  (bridge setAddress / QR return)
 *
 * createGroupSetup({ members, onPickAvatar, onCreate, onMembersChange, onBack, strings })
 *   onCreate({ name, blind, addresses }, ctrl) — shell emits
 *   ixian:select:<blindFlag+name>:|addr|… ('1'/'0' + name, bridge-audit-A.md:530).
 *   Group name must be non-empty and must NOT contain ':|' (C# split hazard,
 *   bridge-audit-A.md:544) — gated here, inline error, never sent.
 *   Free fn: setGroupAvatar(el, src)
 *
 * All async callbacks ride a one-shot ctrl and are #141-m4 guarded (a sync
 * throw routes to the fail path — no wedged latches).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { discGrad } from './disc.js';
import { createAvatar, truncateAddressMiddle } from './avatar.js';
import { createTopbar } from './topbar.js';
import { createButton, setLoading, setSuccess } from './button.js';
import { createSearchField } from './search-field.js';
import { createBadge } from './badge.js';
import { createChip, setChipSelected } from './chip.js';
import { overlayId } from './overlay.js';
import { createEmptyState } from './empty-state.js';

function contactsCtrl(onDone, onFail) {          // one-shot (settingsCtrl grammar)
  let used = false;
  return {
    done: (payload) => { if (used) return; used = true; onDone(payload); },
    fail: (msg) => { if (used) return; used = true; onFail(msg); },
  };
}

function disc(hue, glyph) {
  const d = document.createElement('span');
  d.className = 'c-disc';
  d.dataset.hue = hue;
  d.dataset.grad = String(discGrad(glyph));
  d.append(icon(glyph, { size: 20 }));
  return d;
}

/* ————————————————————————— picker ————————————————————————— */

const pickerState = new WeakMap(); // el → { mode, selected, query, contacts, opts, els }

/* purpose 'app' = the multi-user mini-app launch target picker. Same multi-select
 * grammar as group creation, different rules (min 1 · groups allowed · back exits). */
function isAppPick(st) { return st.opts.purpose === 'app'; }

/* #276 (#211 canon sweep): a nick wins; a nameless row — or one whose "nick" is
 * really its address echoed back (C# addContact sends nickname = address for
 * contacts without one) — shows the address MIDDLE-TRUNCATED, never in full
 * (Damir F5: directory rows rendered full base58 titles). Same guard as
 * chatlist-item.js:134. Full address stays on the profile's address FIELD. */
function hasNick(c) { return !!c.name && c.name !== c.address; }
function displayName(c) {
  if (hasNick(c)) return c.name;
  return c.address ? truncateAddressMiddle(c.address, 9, 6) : (c.name || '');
}

// List-row identity subline (spec §7①: no usernames in Spixi — a named row shows
// the Ixian address beneath the nickname). Middle-truncate so it reads as an
// identity token, not a name, and both ends stay visible (CSS end-ellipsis would
// hide the tail). Full address lives in the profile. §9: to show the contact's
// ORIGINAL nick under a user-set custom name, the roster must send both names —
// today addContact() carries one resolved nickname only (bridge-audit-A.md:540).
function shortAddress(a) {
  const s = String(a || '');
  return s.length > 17 ? s.slice(0, 9) + '…' + s.slice(-6) : s;
}

function sortedContacts(contacts) {
  // named A–Z first, address-only (no name) after, by address (spec §3a)
  // #279: "named" = hasNick, NOT truthy c.name — an echo contact (name === address,
  // the C# echo class from #276) DISPLAYS as a truncated address, so sorting it
  // among the real names would scatter address-looking rows through the A–Z block.
  const named = contacts.filter((c) => hasNick(c));
  const bare = contacts.filter((c) => !hasNick(c));
  named.sort((a, b) => a.name.localeCompare(b.name));
  bare.sort((a, b) => (a.address || '').localeCompare(b.address || ''));
  return named.concat(bare);
}

function pickerRow(c, st) {
  const { strings } = st.opts;
  const multi = st.mode === 'multi';
  // F2: address-less contacts can't be keyed into the selection Set (falsy/dupe
  // address collapses distinct rows into one Set entry) — block them from
  // multi-select the same way pending/bot rows are blocked.
  // purpose 'app': the "can't be added to GROUPS" rule (type 2 = bot) does not
  // apply — an app invite is a stream request to one friend, not group membership.
  // A PENDING contact still can't receive one (no accepted handshake yet).
  const blocked = multi && (c.pending || (c.type === 2 && !isAppPick(st)) || !c.address);

  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'c-contacts__row';
  if (c.pending) row.dataset.pending = '';
  if (blocked) {
    row.disabled = true;
    row.dataset.blocked = '';
  }

  row.append(createAvatar({ src: c.avatar || null, name: c.name || '', address: c.address || '', size: 48, online: !!c.online }));

  const col = document.createElement('span');
  col.className = 'c-contacts__col';
  const name = document.createElement('span');
  name.className = 'c-contacts__name';
  name.textContent = displayName(c);
  col.append(name);
  // C9 (a11y): a row DISABLED in multi-select must say WHY on its sub-line — bots
  // ("can't be added to groups") and pending contacts ("can't be added until they
  // accept") both. Browse mode is unchanged: the sub-line stays the identity line.
  const blockedReason = !blocked ? ''
    : (c.type === 2 ? (strings.noGroupCapability || 'Can’t be added to groups')
      : (c.pending ? (strings.noGroupPending || 'Can’t be added until they accept') : ''));
  const sub = document.createElement('span');
  sub.className = 'c-contacts__sub';
  sub.textContent = blockedReason
    // #276: name === address (C# echo) is NOT a nick — those rows title as the
    // truncated address, so the sub must not repeat it; they read "Address-only".
    || (hasNick(c) ? shortAddress(c.address) : (strings.addressOnly || 'Address-only contact'));
  col.append(sub);
  row.append(col);

  if (c.pending) {
    const badge = createBadge({ label: strings.requestSent || 'Request sent', type: 'warning', weight: 'tonal' });
    badge.classList.add('c-contacts__badge');
    row.append(badge);
    // F16: the badge's plain text would otherwise fold into the row's flattened
    // accessible name in visual order (ambiguous) — an explicit label states the
    // pending state distinctly without repeating it twice. C9: in multi-select the
    // row is also disabled, so the label carries the reason too (a disabled control
    // is otherwise announced with no explanation).
    const pendingSuffix = strings.contactPendingLabel || 'request sent';
    const pendingReason = blocked && blockedReason ? ', ' + blockedReason : '';
    row.setAttribute('aria-label', displayName(c) + ', ' + pendingSuffix + pendingReason);
  }

  // A BLOCKED row (pending contact / no address) is still a child of the picker's
  // list — and for purpose 'app' that list is a role="radiogroup". A bare element
  // inside a radiogroup is not accountable to the group, so present it as what it
  // is: an unavailable option (disabled radio, unchecked). Group/checkbox mode has
  // no such container, so its blocked rows stay plain buttons.
  if (multi && blocked && isAppPick(st)) {
    row.setAttribute('role', 'radio');
    row.setAttribute('aria-checked', 'false');
    row.setAttribute('aria-disabled', 'true');
  }

  if (multi && !blocked) {
    // F4: independent multi-select roster → role=checkbox/aria-checked is the
    // idiomatic mapping (not aria-pressed, which is for toggle buttons).
    // purpose 'app' selects exactly ONE target (see APP_MAX_TARGETS), so its rows
    // are RADIOs — mutually exclusive, and the row a tap deselects is the one that
    // was picked before it.
    const selected = st.selected.has(c.address);
    row.setAttribute('role', isAppPick(st) ? 'radio' : 'checkbox');
    row.setAttribute('aria-checked', String(selected));
    const check = document.createElement('span');
    check.className = 'c-contacts__check';
    check.setAttribute('aria-hidden', 'true');
    check.append(icon('check', { size: 16 }));
    row.append(check);
    row.addEventListener('click', () => {
      const on = !st.selected.has(c.address);
      if (isAppPick(st)) {
        // single-target: a new pick REPLACES the old one. Rows are patched in
        // place (not re-rendered) so the tapped row keeps keyboard focus.
        for (const other of st.els.list.querySelectorAll('[aria-checked="true"]')) {
          other.setAttribute('aria-checked', 'false');
        }
        st.selected.clear();
        if (on) st.selected.add(c.address);
        row.setAttribute('aria-checked', String(on));
        syncNext(st);
        return;
      }
      if (on) st.selected.add(c.address); else st.selected.delete(c.address);
      row.setAttribute('aria-checked', String(on));
      syncNext(st);
    });
  } else if (!multi) {
    row.addEventListener('click', () => {
      if (st.opts.purpose === 'directory') { if (st.opts.onViewContact) st.opts.onViewContact(c); }
      else if (st.opts.onOpenChat) st.opts.onOpenChat(c);
    });
  }
  return row;
}

function renderPickerList(st) {
  const { list, empty, zero } = st.els;
  const { strings } = st.opts;
  // preserve scroll across a full rebuild — the directory roster re-flushes on
  // every C# shouldRefreshContacts tick; resetting scrollTop mid-scroll is jarring.
  const prevScroll = list.scrollTop;
  list.textContent = '';
  const needle = st.query.trim().toLocaleLowerCase();
  // iOS-26: People / Groups chips. MULTI mode (group creation) is people-only —
  // a group cannot be a member of a group — so the kind filter is pinned there.
  // chips earn their space only when there IS something to separate.
  // AUDIT MINOR-2: they can disappear (last group left / roster re-flush) while
  // 'groups' is still selected, which left an empty list and no visible control to
  // escape it. Reset BEFORE `kind` is read below, so this render already reflects
  // the fallback (calling setKind here would re-enter and then be overwritten).
  // purpose 'app' is the exception: its multi-select DOES list groups (a multi-user
  // app can be joined against a group friend), so the chips stay live there.
  const pinPeople = st.mode === 'multi' && !isAppPick(st);
  if (st.els.kinds) {
    const hide = pinPeople || !st.contacts.some((c) => c && c.isGroup);
    st.els.kinds.hidden = hide;
    if (hide && !pinPeople && st.kind !== 'all') {
      st.kind = 'all';
      if (st.els.syncKindChips) st.els.syncKindChips();
    }
  }
  const kind = pinPeople ? 'people' : (st.kind || 'all');
  const kindOk = (c) => kind === 'all' || (kind === 'groups' ? !!c.isGroup : !c.isGroup);
  const matches = sortedContacts(st.contacts).filter((c) => kindOk(c) && (!needle
    || (c.name || '').toLocaleLowerCase().includes(needle)
    || (c.address || '').toLocaleLowerCase().includes(needle)));

  if (st.contacts.length === 0) {                 // noContacts (bridge-audit-A.md:537)
    // MULTI (group setup) hides the Add-contact affordances entirely, so the
    // zero state's CTA would contradict the chrome — plain note there. purpose
    // 'app' is the exception: it has no browse state to back out into, so an
    // empty roster with no CTA is a dead end — keep the illustration + CTA.
    const invite = st.mode !== 'multi' || isAppPick(st);
    if (zero) zero.hidden = !invite;              // TRUE zero state — illustration + CTA
    empty.hidden = invite;
    if (!invite) {
      empty.dataset.kind = 'search';
      empty.querySelector('.c-contacts__empty-text').textContent =
        strings.noContacts || 'No contacts yet';
    }
    list.hidden = true;
    return;
  }
  if (zero) zero.hidden = true;
  if (matches.length === 0) {
    empty.hidden = false;
    empty.dataset.kind = 'search';
    empty.querySelector('.c-contacts__empty-text').textContent = needle
      ? (strings.noMatches || 'No contacts match your search.')
      : (kind === 'groups'
        ? (strings.noGroups || 'No groups yet.')
        : (strings.noPeople || 'No contacts yet.'));
    list.hidden = true;
    return;
  }
  empty.hidden = true;
  list.hidden = false;
  for (const c of matches) list.append(pickerRow(c, st));
  list.scrollTop = prevScroll;                    // restore after the rebuild
}

function pickerNext(st) {
  if (!st.opts.onNext) return;
  // F2 belt-and-braces: drop any falsy address that reached the Set anyway
  const sel = st.contacts.filter((c) => c.address && st.selected.has(c.address));
  if (sel.length < selectMin(st)) return;   // MAJOR-6: the action is disabled below the minimum
  // belt-and-braces: the app pick is single-target (the rows are radios, and
  // setPickerSelection is the only other way into the Set).
  st.opts.onNext(isAppPick(st) ? sel.slice(0, APP_MAX_TARGETS) : sel);
}

/* #265 (Damir ⑤): the multi-select CONFIRM lives in the TOPBAR (top-trailing —
 * the Signal/iOS-Messages grammar for "select then confirm"); the old full-width
 * bottom "Next" button is retired. The topbar title carries the live count, so
 * the action stays a single compact affordance. */
// A group needs at least TWO members (C# rejects fewer — Opus review MAJOR-6).
const GROUP_MIN_MEMBERS = 2;
// An app launch picks EXACTLY ONE target: C# opens one session against one
// friend/group (MiniAppPage still derives the session id from the app id alone and
// relays to that single peer), so a second pick would be silently dropped.
const APP_MIN_TARGETS = 1;
const APP_MAX_TARGETS = 1;
function selectMin(st) { return isAppPick(st) ? APP_MIN_TARGETS : GROUP_MIN_MEMBERS; }
// The multi-select confirm's label: "Next" (→ group setup) vs "Start" (→ launch).
function confirmLabel(st) {
  const { strings } = st.opts;
  return isAppPick(st) ? (strings.startAppAction || 'Start') : (strings.next || 'Next');
}
// The multi-select idle title (no selection yet).
function multiTitle(st) {
  const { strings } = st.opts;
  return isAppPick(st)
    ? (strings.selectAppTargets || 'Choose who to invite')
    : (strings.selectMembers || 'Select members');
}

function syncNext(st) {
  const n = st.selected.size;
  const { strings } = st.opts;
  const min = selectMin(st);
  if (st.els.nextAction) {
    st.els.nextAction.disabled = n < min;
    st.els.nextAction.setAttribute('aria-label',
      confirmLabel(st) + (n ? ' (' + n + ')' : ''));
  }
  const title = st.els.topbar && st.els.topbar.querySelector('.c-topbar__title');
  if (title) {
    title.textContent = n
      ? ((strings.selectedCount || '{n} selected').split('{n}').join(String(n)))
      : multiTitle(st);
  }
  // review MINOR-2: a mute disabled ✓ never told the user WHY (and a disabled button
  // isn't focusable, so SR users got nothing). State the rule in the sub-line.
  // Damir F5 2026-07-29: hiding this at the 2nd selection collapsed its line box and
  // JUMPED the whole contact list upward mid-tap — the worst possible moment to move
  // the row under someone's finger. The line now STAYS and just changes what it says:
  // the rule while it's unmet, the live count once it is. Same element, same height,
  // no reflow. (role="status" makes the swap an SR announcement too.)
  if (st.els.minHint) {
    st.els.minHint.hidden = false;
    st.els.minHint.textContent = n >= min
      ? (strings.groupSelectedCount || '{n} selected').replace('{n}', String(n))
      : (isAppPick(st)
        ? (strings.appNeedsOne || 'Select at least one contact or group to invite.')
        : (strings.groupNeedsTwo || 'Select at least 2 people to create a group.'));
  }
}

/* A7 (#348, Damir F5): the single-select title depends on WHY the picker is open.
   Both entries used to read "Contacts", so the FAB — which already announces
   itself as "New chat" (home.html:666) — opened a screen with a different name.
   'start'     → "New chat"  (the FAB: pick someone to talk to)
   'directory' → "Contacts"  (the topbar entry: browse the roster)
   'app'       → multi-select, so it never reaches this branch.
   The key already exists and is already used on this flow (en-us.js:376). */
function pickerTitle(st) {
  const { strings, purpose } = st.opts;
  if (purpose === 'start') return strings.newChat || 'New chat';
  return strings.contacts || 'Contacts';
}

function renderPickerChrome(st) {
  const { strings } = st.opts;
  const multi = st.mode === 'multi';
  const topbar = createTopbar({
    variant: 'view',
    title: multi ? multiTitle(st) : pickerTitle(st),
    onBack: () => {
      // purpose 'app' has NO browse state to fall back to (it opens straight into
      // multi-select), so back there means "abandon the launch" → onBack.
      if (st.mode === 'multi' && !isAppPick(st)) setPickerMode(st.els.root, 'browse'); // back out of select, not out of the picker
      else if (st.opts.onBack) st.opts.onBack();
    },
    backLabel: strings.back || 'Back',
    actions: multi
      ? [{ icon: 'check', label: confirmLabel(st), onClick: () => pickerNext(st) }]
      : [],
  });
  st.els.topbar.replaceWith(topbar);
  st.els.topbar = topbar;
  // the topbar renders actions as icon-buttons in a trailing wrap
  st.els.nextAction = multi ? topbar.querySelector('.c-topbar__actions button') : null;
  st.els.actions.hidden = multi;
  if (st.els.minHint) st.els.minHint.hidden = !multi;   // the ≥2 rule only applies in multi
  if (multi) syncNext(st);
}

export function createContactsPicker({
  contacts = [], purpose = 'start', onAddContact, onCreateGroup, onOpenChat,
  onViewContact, onNext, onBack, strings = getStrings(),
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-contacts';
  el.dataset.purpose = purpose;

  const st = {
    mode: 'browse', selected: new Set(), query: '', kind: 'all',   // iOS-26: People/Groups chip

    contacts: contacts.slice(),
    opts: { purpose, onAddContact, onCreateGroup, onOpenChat, onViewContact, onNext, onBack, strings },
    els: { root: el },
  };
  pickerState.set(el, st);

  // A7: the FIRST paint must already carry the purpose-correct title — this
  // topbar is what the user sees before any re-render (pickerTitle, above).
  st.els.topbar = createTopbar({ variant: 'view', title: pickerTitle(st), onBack });
  el.append(st.els.topbar);

  const body = document.createElement('div');
  body.className = 'c-contacts__body u-scroll';

  // top actions (browse mode only)
  const actions = document.createElement('div');
  actions.className = 'c-contacts__group';
  const actionRow = (hue, glyph, label, cb) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-contacts__action';
    b.append(disc(hue, glyph));
    const t = document.createElement('span');
    t.className = 'c-contacts__action-label';
    t.textContent = label;
    b.append(t);
    if (cb) b.addEventListener('click', cb);
    return b;
  };
  // #146/spec §3a icon gap resolved — 'user-plus' exported
  actions.append(actionRow('accent', 'user-plus', strings.addContact || 'Add contact', onAddContact));
  if (purpose === 'start') {                            // directory: no Create group (start affordance = FAB)
    actions.append(actionRow('primary', 'users', strings.createGroup || 'Create group', () => {
      setPickerMode(el, 'multi');
      if (onCreateGroup) onCreateGroup();
    }));
  }
  st.els.actions = actions;
  body.append(actions);

  // multi-select rule line (review MINOR-2): says WHY the confirm is inert at <2.
  const minHint = document.createElement('p');
  minHint.className = 'c-contacts__minhint';
  minHint.setAttribute('role', 'status');
  minHint.hidden = true;
  st.els.minHint = minHint;
  body.append(minHint);

  const search = createSearchField({
    placeholder: strings.searchContacts || 'Search contacts',
    onInput: (q) => { st.query = q; renderPickerList(st); },
    strings,
  });
  body.append(search);

  /* iOS-26 — People / Groups filter. Groups are back in the directory (a wiped
     chat history must not make a group unreachable) and in the 'start' picker, so
     the two kinds need separating. Same exclusive-chip grammar as the chats-list
     header (#218). Hidden while the roster holds no groups at all — a lone
     "People" chip is noise — and hidden in MULTI mode, where the list is pinned
     to people (renderPickerList). */
  const kinds = document.createElement('div');
  kinds.className = 'c-contacts__kinds';
  kinds.setAttribute('role', 'group');
  kinds.setAttribute('aria-label', strings.filter || 'Filter');
  const kindChips = [];
  const syncKindChips = () => {
    for (const { el: chipEl, value } of kindChips) {
      setChipSelected(chipEl, value === st.kind);
      chipEl.setAttribute('aria-pressed', value === st.kind ? 'true' : 'false');
    }
  };
  const setKind = (k) => {
    if (st.kind === k) return;
    st.kind = k;
    syncKindChips();
    renderPickerList(st);
  };
  for (const [value, label] of [
    ['all', strings.all || 'All'],
    ['people', strings.people || 'People'],
    ['groups', strings.groups || 'Groups'],
  ]) {
    // W3 (#336): default size — the small variant read as a different control
    // beside the chats-header chips (same-looking filter row, two sizes).
    const chipEl = createChip({ label, selected: value === 'all', strings });
    chipEl.setAttribute('aria-pressed', value === 'all' ? 'true' : 'false');
    chipEl.addEventListener('click', () => setKind(value));
    kindChips.push({ el: chipEl, value });
    kinds.append(chipEl);
  }
  st.els.kinds = kinds;
  st.els.setKind = setKind;
  st.els.syncKindChips = syncKindChips;
  body.append(kinds);

  const list = document.createElement('div');
  list.className = 'c-contacts__list';
  // purpose 'app' picks ONE target — its rows are radios, so the list is the group.
  // A radiogroup needs an ACCESSIBLE NAME (without one it announces as an unnamed
  // group and the user has no idea what the choice is FOR). Reuse the select-mode
  // title this picker already shows and already translates — no new copy, and the
  // spoken name matches the visible one. Roving tabindex / arrow-key navigation is
  // deliberately NOT added here: that is the deferred #205 item shared with every
  // other swatch/radio grammar in this codebase, and fixing it on one surface only
  // would make the keyboard model inconsistent.
  if (purpose === 'app') {
    list.setAttribute('role', 'radiogroup');
    list.setAttribute('aria-label', strings.selectAppTargets || 'Choose who to invite');
  }
  st.els.list = list;
  body.append(list);

  // NO-RESULTS note: a search or a People/Groups chip matched nothing. Plain
  // line, no art, no CTA — the roster is fine, the needle just missed.
  const empty = document.createElement('div');
  empty.className = 'c-contacts__empty';
  empty.hidden = true;
  const emptyText = document.createElement('p');
  emptyText.className = 'c-contacts__empty-text';
  empty.append(emptyText);
  st.els.empty = empty;
  body.append(empty);

  // TRUE zero state: the roster itself is empty (C# noContacts / an empty
  // loadContacts flush). Illustration + copy + the SAME "Add contact" action
  // the row above offers — no new verb, just a reachable one in the blank area.
  const zero = createEmptyState({
    illustration: 'images/contacts-es.svg',
    glyph: 'users',                                 // art blocked/missing → token glyph tile
    title: strings.noContacts || 'No contacts yet',
    body: strings.contactsEmptyBody
      || 'Add someone by their Spixi address or QR code — then you can chat and send IXI.',
    actionLabel: strings.addContact || 'Add contact',
    actionIcon: 'user-plus',
    onAction: onAddContact,
    compact: true,                                  // the takeover already shows an actions row above
  });
  zero.classList.add('c-contacts__zero');
  zero.hidden = true;
  st.els.zero = zero;
  body.append(zero);

  el.append(body);

  // #265: the bottom "Next" bar is retired — the confirm is the TOPBAR action
  // (renderPickerChrome). No footer element remains.

  renderPickerList(st);
  // purpose 'app': the picker IS the multi-select — open in it, no browse detour.
  // Routed through setPickerMode so the chrome (topbar title + ✓ confirm, hidden
  // action rows, live min-hint) is built by exactly the same path group creation
  // uses; nothing about this mode is a second implementation.
  if (purpose === 'app') setPickerMode(el, 'multi');
  return el;
}

/** Switch picker mode; 'browse' clears the selection. */
export function setPickerMode(el, mode) {
  const st = pickerState.get(el);
  if (!st || st.mode === mode) return;
  st.mode = mode;
  if (mode === 'browse') st.selected.clear();
  renderPickerChrome(st);
  renderPickerList(st);
}

/** Selected contact objects (multi mode). */
export function getPickerSelection(el) {
  const st = pickerState.get(el);
  if (!st) return [];
  // F2 belt-and-braces: same falsy-address guard as onNext
  return st.contacts.filter((c) => c.address && st.selected.has(c.address));
}

/** Restore a selection (back from group setup — spec §3c keeps it intact). */
export function setPickerSelection(el, addresses) {
  const st = pickerState.get(el);
  if (!st) return;
  st.selected = new Set(addresses);
  if (st.mode === 'multi') { syncNext(st); renderPickerList(st); }
}

/** Replace the roster (bridge clearContacts/addContact re-send). */
export function setPickerContacts(el, contacts) {
  const st = pickerState.get(el);
  if (!st) return;
  st.contacts = contacts.slice();
  for (const a of Array.from(st.selected)) {      // drop selections no longer in roster
    if (!st.contacts.some((c) => c.address === a)) st.selected.delete(a);
  }
  renderPickerList(st);
  if (st.mode === 'multi') syncNext(st);
}

/* ————————————————————————— add-contact ————————————————————————— */

const addState = new WeakMap(); // el → { input, validate }

const ADDR_MIN = 20;  // QR raw-accept window (bridge-audit-A.md:200)
const ADDR_MAX = 128;
// Base58 alphabet (Bitcoin/Ixian — no 0 O I l). Local pre-submit sanity so obviously
// invalid input (spaces, punctuation, wrong length) shows the INLINE error and NEVER
// reaches ixian:request — which would otherwise trigger a C# native invalid-address
// alert + leave Send wedged (bridge-audit-A.md:198). ExtendedAddress does the
// authoritative check server-side; the C# self/duplicate rejection still round-trips
// (recovered by the 6s grace in contact_new.html).
// Length + no-whitespace only — deliberately NOT a base58/charset gate. Ixian's
// current address encoding (and any newer payment-gateway address types) is not
// verified here, so a strict alphabet could REJECT valid addresses. C#'s
// ExtendedAddress is the authoritative validator; this local gate only blocks
// OBVIOUS garbage (empty / too short / too long / contains whitespace) so a clear
// typo shows an inline error instead of the native alert. (Damir 2026-07-08.)
function looksLikeAddress(a) {
  return a.length >= ADDR_MIN && a.length <= ADDR_MAX && !/\s/.test(a);
}

export function createAddContact({
  onCheckAddress, onSendRequest, onScan, onOpened, onBack, strings = getStrings(),
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-contacts-add';
  el.append(createTopbar({ variant: 'view', title: strings.addContact || 'Add contact', onBack }));

  const body = document.createElement('div');
  body.className = 'c-contacts-add__body u-scroll';

  const note = document.createElement('p');
  note.className = 'c-contacts-add__note';
  note.textContent = strings.addContactNote || 'Enter an Ixian address to send a contact request.';
  body.append(note);

  const group = document.createElement('div');
  group.className = 'c-contacts__group c-contacts-add__group';

  const field = document.createElement('div');
  field.className = 'c-contacts-add__field';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'c-contacts-add__input';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = strings.ixianAddress || 'Ixian address';
  input.setAttribute('aria-label', strings.ixianAddress || 'Ixian address');
  const scanBtn = document.createElement('button');
  scanBtn.type = 'button';
  scanBtn.className = 'c-contacts-add__scan';
  scanBtn.setAttribute('aria-label', strings.scan || 'Scan');
  scanBtn.append(icon('scan', { size: 20 }));
  if (onScan) scanBtn.addEventListener('click', onScan);  // → ixian:quickscan; result via setAddContactAddress
  field.append(input, scanBtn);
  group.append(field);

  // live ✓ — checkAddress only ever CONFIRMS (silent on failure): role=status, never an error
  const valid = document.createElement('p');
  valid.className = 'c-contacts-add__valid';
  valid.setAttribute('role', 'status');
  valid.hidden = true;
  const validGlyph = icon('check', { size: 16 });
  validGlyph.classList.add('c-contacts-add__valid-glyph');
  const validText = document.createElement('span');
  validText.textContent = strings.validAddress || 'Looks like a valid Ixian address';
  valid.append(validGlyph, validText);
  group.append(valid);

  const err = document.createElement('p');
  err.className = 'c-contacts-add__error';
  err.setAttribute('role', 'alert');
  err.hidden = true;
  group.append(err);

  body.append(group);

  // Primary CTA directly beneath the address field + helper/error line (was pinned to
  // the screen bottom in a .c-contacts__footer — too far from the input). It now lives
  // in the scroll body right under the group card (body gap = spacing-16).
  const sendBtn = createButton({ label: strings.sendRequest || 'Send request', size: 56, width: 'full' });
  sendBtn.classList.add('c-contacts-add__submit');
  body.append(sendBtn);
  el.append(body);

  let inFlight = false;
  let checkTimer = 0;
  let latched = false;   // F5: true once a send has succeeded and sendBtn is latched disabled

  const setError = (msg) => { err.textContent = msg; err.hidden = !msg; };

  // F5: a new, non-empty address after a latched success makes the screen usable
  // again (rather than being permanently stuck on "Request sent"). setSuccess()
  // owns the disabled/label lifecycle (morph → +1400ms restore to enabled, since
  // it's called with the button NOT pre-disabled) — unlatch() must not fight it
  // by manually toggling disabled/label; the flag alone gates submit().
  const unlatch = () => {
    latched = false;
  };

  const validate = () => {
    valid.hidden = true;
    setError('');
    clearTimeout(checkTimer);
    if (!onCheckAddress) return;
    const v = input.value.trim();
    if (v.length < ADDR_MIN || v.length > ADDR_MAX) return;
    checkTimer = setTimeout(() => {
      const ctrl = contactsCtrl(
        // stale-reply guard + F1: never reveal ✓ while a request is in flight
        // (a slow checkAddress reply must not flash valid on a disabled/latched field)
        () => { if (!inFlight && input.value.trim() === v) valid.hidden = false; },
        () => {},                                       // silent — matches the bridge contract
      );
      try { onCheckAddress(v, ctrl); } catch { ctrl.fail(); } // #141-m4 (silent path)
    }, 250);
  };
  input.addEventListener('input', validate);

  const submit = () => {
    if (inFlight || latched) return;
    clearTimeout(checkTimer);   // F1: kill any pending debounce so a stale ✓ can't land mid/after submit
    const a = input.value.trim();
    if (!looksLikeAddress(a)) {                          // fix #4: block obviously-invalid input locally
      setError(strings.badAddress || 'That doesn’t look like an Ixian address.');
      input.focus();
      return;
    }
    setError('');
    inFlight = true;
    setLoading(sendBtn, true);
    input.disabled = true;
    scanBtn.disabled = true;
    const restore = () => {
      inFlight = false;
      setLoading(sendBtn, false);
      input.disabled = false;
      scanBtn.disabled = false;
    };
    const ctrl = contactsCtrl(
      () => {
        restore();
        latched = true;                                 // latched: one request per screen visit
        // Do NOT pre-disable sendBtn: setSuccess() captures originalDisabled here,
        // so leaving it false lets setSuccess's own +1400ms restore re-enable the
        // button instead of fighting unlatch() with a stale re-disable timer.
        setSuccess(sendBtn, { label: strings.requestSent || 'Request sent' });
        setTimeout(() => { if (onOpened) onOpened(a); }, 900); // let the morph land, then open the convo
      },
      (msg) => {
        restore();
        setError(msg || strings.requestFailed || 'Couldn’t send the request. Check the address and try again.');
        input.focus();
      },
    );
    try {
      if (onSendRequest) onSendRequest(a, ctrl); else ctrl.done();
    } catch { ctrl.fail(); }                            // #141-m4
  };
  sendBtn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  addState.set(el, {
    input, validate,
    isInFlight: () => inFlight,
    isLatched: () => latched,
    unlatch,
  });
  return el;
}

/** Bridge setAddress / QR return — fills the field and re-runs live validation. */
export function setAddContactAddress(el, address) {
  const st = addState.get(el);
  if (!st) return;
  if (st.isInFlight()) return;   // F5: a request is already round-tripping — no-op
  const next = address == null ? '' : String(address);
  // F5: a genuinely new, non-empty address after a latched success re-opens the screen
  if (st.isLatched() && next && next !== st.input.value) st.unlatch();
  st.input.value = next;
  st.validate();
}

/* ————————————————————————— group setup ————————————————————————— */

const groupState = new WeakMap(); // el → { avatarBtn }

export function createGroupSetup({
  members = [], onPickAvatar, onCreate, onMembersChange, onBack, strings = getStrings(),
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-contacts-group';
  el.append(createTopbar({ variant: 'view', title: strings.newGroup || 'New group', onBack }));

  const body = document.createElement('div');
  body.className = 'c-contacts-group__body u-scroll';

  const list = members.slice();

  // —— hero: avatar + name ——
  const hero = document.createElement('div');
  hero.className = 'c-contacts__group c-contacts-group__hero';
  const avatarBtn = document.createElement('button');
  avatarBtn.type = 'button';
  avatarBtn.className = 'c-contacts-group__avatar';
  avatarBtn.setAttribute('aria-label', strings.setGroupPhoto || 'Set group photo');
  avatarBtn.append(icon('users', { size: 32 }));
  let avatarBusy = false;
  avatarBtn.addEventListener('click', () => {
    if (!onPickAvatar || avatarBusy) return;
    avatarBusy = true;
    const ctrl = contactsCtrl(
      (src) => { avatarBusy = false; if (src) setGroupAvatar(el, src); },
      () => { avatarBusy = false; },
    );
    try { onPickAvatar(ctrl); } catch { ctrl.fail(); }  // #141-m4
  });
  const avatarHint = document.createElement('p');
  avatarHint.className = 'c-contacts-group__avatar-hint';
  avatarHint.textContent = strings.setGroupPhoto || 'Set group photo';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'c-contacts-group__name';
  nameInput.autocomplete = 'off';
  nameInput.placeholder = strings.groupName || 'Group name';
  nameInput.setAttribute('aria-label', strings.groupName || 'Group name');

  const nameErr = document.createElement('p');
  nameErr.className = 'c-contacts-add__error';
  nameErr.setAttribute('role', 'alert');
  nameErr.hidden = true;

  hero.append(avatarBtn, avatarHint, nameInput, nameErr);
  body.append(hero);

  // —— members ——
  const membersCard = document.createElement('div');
  membersCard.className = 'c-contacts__group c-contacts-group__members';
  const membersHead = document.createElement('p');
  membersHead.className = 'c-contacts-group__members-head';
  const chips = document.createElement('div');
  chips.className = 'c-contacts-group__chips';
  membersCard.append(membersHead, chips);
  body.append(membersCard);

  // —— blind toggle ——
  const blindCard = document.createElement('div');
  blindCard.className = 'c-contacts__group';
  const blindRow = document.createElement('div');
  blindRow.className = 'c-contacts-group__blind';
  blindRow.append(disc('info', 'users'));
  const blindCol = document.createElement('span');
  blindCol.className = 'c-contacts__col';
  const blindLabel = document.createElement('span');
  blindLabel.className = 'c-contacts__name';
  blindLabel.id = overlayId('contacts-blind-label');   // F17: unique id — two group-setup panels must not collide
  blindLabel.textContent = strings.blindGroup || 'Blind group';
  const blindSub = document.createElement('span');
  blindSub.className = 'c-contacts__sub c-contacts-group__blind-sub';
  blindSub.textContent = strings.blindGroupSub
    || 'Members can’t see each other’s identity — only you, the creator, can.';
  blindCol.append(blindLabel, blindSub);
  const blindSwitch = document.createElement('button');
  blindSwitch.type = 'button';
  blindSwitch.className = 'c-contacts-group__switch';
  blindSwitch.setAttribute('role', 'switch');
  blindSwitch.setAttribute('aria-checked', 'false');
  blindSwitch.setAttribute('aria-labelledby', blindLabel.id);
  const knob = document.createElement('span');
  knob.className = 'c-contacts-group__switch-knob';
  blindSwitch.append(knob);
  blindSwitch.addEventListener('click', () => {
    const on = blindSwitch.getAttribute('aria-checked') !== 'true';
    blindSwitch.setAttribute('aria-checked', String(on));
  });
  blindRow.append(blindCol, blindSwitch);
  blindCard.append(blindRow);
  body.append(blindCard);

  el.append(body);

  const footer = document.createElement('div');
  footer.className = 'c-contacts__footer';
  const createBtn = createButton({ label: strings.createGroupCta || 'Create group', size: 56, width: 'full' });
  footer.append(createBtn);
  el.append(footer);

  const setNameError = (msg) => { nameErr.textContent = msg; nameErr.hidden = !msg; };

  const renderMembers = () => {
    membersHead.textContent = (strings.members || 'members') + ' · ' + list.length;
    chips.textContent = '';
    list.forEach((m, idx) => {
      // F6: splice by the closed-over index rather than list.indexOf(m) — object
      // identity is fragile if a member object is ever duplicated in the array.
      const chip = createChip({
        label: displayName(m), size: 'large', dismissible: true, strings,
        onClick: () => {
          list.splice(idx, 1);
          renderMembers();
          if (onMembersChange) onMembersChange(list.map((x) => x.address));
        },
      });
      chips.append(chip);
    });
    createBtn.disabled = list.length === 0;
  };
  renderMembers();

  let inFlight = false;
  const submit = () => {
    if (inFlight || createBtn.disabled) return;
    const name = nameInput.value.trim();
    if (!name) { setNameError(strings.groupNameEmpty || 'Give the group a name.'); nameInput.focus(); return; }
    if (name.includes(':|')) {                          // C# split token (bridge-audit-A.md:544)
      setNameError(strings.groupNameBad || 'A group name can’t contain “:|”.');
      nameInput.focus();
      return;
    }
    setNameError('');
    inFlight = true;
    setLoading(createBtn, true);
    const ctrl = contactsCtrl(
      () => { inFlight = false; setLoading(createBtn, false); },
      (msg) => {
        inFlight = false;
        setLoading(createBtn, false);
        setNameError(msg || strings.groupCreateFailed || 'Couldn’t create the group. Try again.');
      },
    );
    const blind = blindSwitch.getAttribute('aria-checked') === 'true';
    try {
      if (onCreate) onCreate({ name, blind, addresses: list.map((m) => m.address) }, ctrl);
      else ctrl.done();
    } catch { ctrl.fail(); }                            // #141-m4
  };
  createBtn.addEventListener('click', submit);
  nameInput.addEventListener('input', () => setNameError(''));
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  groupState.set(el, { avatarBtn });
  return el;
}

/* ————————————————————————— pending contact profile ————————————————————————— */

/**
 * createPendingContact — contact details for a NON-friend (our request sent,
 * not yet accepted). Damir pick: MINIMAL + cancel — no money/call/chat rows
 * until accepted (accepted contacts open the full createChatInfo
 * context:'contact' profile instead).
 *
 * ONE action: Cancel request → onCancelRequest(ctrl). Bridge: ixian:undorequest
 * already REMOVES the friend (FriendList.removeFriend, bridge-audit-A.md:86) —
 * a separate Remove row would duplicate it.
 */
export function createPendingContact({
  name = '', address = '', avatar = null, onCancelRequest, onBack, strings = getStrings(),
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-contacts-pending';
  el.append(createTopbar({ variant: 'view', title: strings.contact || 'Contact', onBack }));

  const body = document.createElement('div');
  body.className = 'c-contacts-pending__body u-scroll';

  const hero = document.createElement('div');
  hero.className = 'c-contacts__group c-contacts-pending__hero';
  hero.append(createAvatar({ src: avatar, name, address, size: 80 }));
  const nameEl = document.createElement('p');
  nameEl.className = 'c-contacts-pending__name';
  // #276: nameless (or address-echo) profile titles as the TRUNCATED address;
  // the full address moves to the addr line below — the profile's sanctioned
  // full-address FIELD (#211 canon), now shown for nameless contacts too.
  const heroNick = !!name && name !== address;
  nameEl.textContent = heroNick ? name : (address ? truncateAddressMiddle(address, 9, 6) : (name || ''));
  hero.append(nameEl);
  if (address) {
    const addrEl = document.createElement('p');
    addrEl.className = 'c-contacts-pending__addr';
    addrEl.textContent = address;
    hero.append(addrEl);
  }
  hero.append(createBadge({ label: strings.requestSent || 'Request sent', type: 'warning', weight: 'tonal' }));
  const note = document.createElement('p');
  note.className = 'c-contacts-pending__note';
  note.textContent = strings.pendingNote || 'Waiting for them to accept your contact request.';
  hero.append(note);

  const err = document.createElement('p');
  err.className = 'c-contacts-add__error';
  err.setAttribute('role', 'alert');
  err.hidden = true;
  hero.append(err);

  body.append(hero);
  el.append(body);

  const footer = document.createElement('div');
  footer.className = 'c-contacts__footer';
  const cancelBtn = createButton({
    label: strings.cancelRequest || 'Cancel request',
    type: 'outline', intent: 'destructive', size: 56, width: 'full',
  });
  footer.append(cancelBtn);
  el.append(footer);

  let inFlight = false;
  cancelBtn.addEventListener('click', () => {
    if (inFlight) return;
    inFlight = true;
    err.hidden = true;
    setLoading(cancelBtn, true);
    const ctrl = contactsCtrl(
      () => { inFlight = false; setLoading(cancelBtn, false); },  // caller closes/updates roster
      (msg) => {
        inFlight = false;
        setLoading(cancelBtn, false);
        err.textContent = msg || strings.cancelFailed || 'Couldn’t cancel the request. Try again.';
        err.hidden = false;
      },
    );
    try {
      if (onCancelRequest) onCancelRequest(ctrl); else ctrl.done();
    } catch { ctrl.fail(); }                            // #141-m4
  });

  return el;
}

/** Group-avatar preview (bridge loadAvatar / demo mock). */
export function setGroupAvatar(el, src) {
  const st = groupState.get(el);
  if (!st) return;
  st.avatarBtn.textContent = '';
  const img = document.createElement('img');
  img.className = 'c-contacts-group__avatar-img';
  img.src = src;
  img.alt = '';
  st.avatarBtn.append(img);
}
