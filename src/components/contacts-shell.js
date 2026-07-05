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
import { icon } from './icons.js';
import { createAvatar } from './avatar.js';
import { createTopbar } from './topbar.js';
import { createButton, setLoading, setSuccess } from './button.js';
import { createSearchField } from './search-field.js';
import { createBadge } from './badge.js';
import { createChip } from './chip.js';
import { overlayId } from './overlay.js';

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
  d.append(icon(glyph, { size: 20 }));
  return d;
}

/* ————————————————————————— picker ————————————————————————— */

const pickerState = new WeakMap(); // el → { mode, selected, query, contacts, opts, els }

function displayName(c) { return c.name || c.address || ''; }

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
  const named = contacts.filter((c) => c.name);
  const bare = contacts.filter((c) => !c.name);
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
  const blocked = multi && (c.pending || c.type === 2 || !c.address);

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
  const sub = document.createElement('span');
  sub.className = 'c-contacts__sub';
  sub.textContent = blocked && c.type === 2
    ? (strings.noGroupCapability || 'Can’t be added to groups')
    : (c.name ? shortAddress(c.address) : (strings.addressOnly || 'Address-only contact'));
  col.append(sub);
  row.append(col);

  if (c.pending) {
    const badge = createBadge({ label: strings.pending || 'Request sent', type: 'warning', weight: 'tonal' });
    badge.classList.add('c-contacts__badge');
    row.append(badge);
    // F16: the badge's plain text would otherwise fold into the row's flattened
    // accessible name in visual order (ambiguous) — an explicit label states the
    // pending state distinctly without repeating it twice.
    const pendingSuffix = strings.contactPendingLabel || 'request sent';
    row.setAttribute('aria-label', displayName(c) + ', ' + pendingSuffix);
  }

  if (multi && !blocked) {
    // F4: independent multi-select roster → role=checkbox/aria-checked is the
    // idiomatic mapping (not aria-pressed, which is for toggle buttons).
    const selected = st.selected.has(c.address);
    row.setAttribute('role', 'checkbox');
    row.setAttribute('aria-checked', String(selected));
    const check = document.createElement('span');
    check.className = 'c-contacts__check';
    check.setAttribute('aria-hidden', 'true');
    check.append(icon('check', { size: 16 }));
    row.append(check);
    row.addEventListener('click', () => {
      const on = !st.selected.has(c.address);
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
  const { list, empty } = st.els;
  const { strings } = st.opts;
  list.textContent = '';
  const needle = st.query.trim().toLocaleLowerCase();
  const matches = sortedContacts(st.contacts).filter((c) => !needle
    || (c.name || '').toLocaleLowerCase().includes(needle)
    || (c.address || '').toLocaleLowerCase().includes(needle));

  if (st.contacts.length === 0) {                 // noContacts (bridge-audit-A.md:537)
    empty.hidden = false;
    empty.dataset.kind = 'roster';
    empty.querySelector('.c-contacts__empty-text').textContent =
      strings.noContacts || 'No contacts yet — add one to start chatting securely.';
    list.hidden = true;
    return;
  }
  if (matches.length === 0) {
    empty.hidden = false;
    empty.dataset.kind = 'search';
    empty.querySelector('.c-contacts__empty-text').textContent =
      strings.noMatches || 'No contacts match your search.';
    list.hidden = true;
    return;
  }
  empty.hidden = true;
  list.hidden = false;
  for (const c of matches) list.append(pickerRow(c, st));
}

function syncNext(st) {
  const n = st.selected.size;
  const btn = st.els.nextBtn;
  btn.disabled = n === 0;
  const label = btn.querySelector('.c-button__label');   // F20: defensive null-check
  if (label) label.textContent = (st.opts.strings.next || 'Next') + (n ? ' (' + n + ')' : '');
}

function renderPickerChrome(st) {
  const { strings } = st.opts;
  const multi = st.mode === 'multi';
  const topbar = createTopbar({
    variant: 'view',
    title: multi ? (strings.selectMembers || 'Select members') : (strings.contacts || 'Contacts'),
    onBack: () => {
      if (st.mode === 'multi') setPickerMode(st.els.root, 'browse'); // back out of select, not out of the picker
      else if (st.opts.onBack) st.opts.onBack();
    },
    backLabel: strings.back || 'Back',
  });
  st.els.topbar.replaceWith(topbar);
  st.els.topbar = topbar;
  st.els.actions.hidden = multi;
  st.els.footer.hidden = !multi;
  if (multi) syncNext(st);
}

export function createContactsPicker({
  contacts = [], purpose = 'start', onAddContact, onCreateGroup, onOpenChat,
  onViewContact, onNext, onBack, strings = {},
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-contacts';
  el.dataset.purpose = purpose;

  const st = {
    mode: 'browse', selected: new Set(), query: '',
    contacts: contacts.slice(),
    opts: { purpose, onAddContact, onCreateGroup, onOpenChat, onViewContact, onNext, onBack, strings },
    els: { root: el },
  };
  pickerState.set(el, st);

  st.els.topbar = createTopbar({ variant: 'view', title: strings.contacts || 'Contacts', onBack });
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
  // icon gap: user-plus not in the registry (spec §3a) — user-circle stands in
  actions.append(actionRow('accent', 'user-circle', strings.addContact || 'Add contact', onAddContact));
  if (purpose === 'start') {                            // directory: no Create group (start affordance = FAB)
    actions.append(actionRow('primary', 'users', strings.createGroup || 'Create group', () => {
      setPickerMode(el, 'multi');
      if (onCreateGroup) onCreateGroup();
    }));
  }
  st.els.actions = actions;
  body.append(actions);

  const search = createSearchField({
    placeholder: strings.searchContacts || 'Search contacts',
    onInput: (q) => { st.query = q; renderPickerList(st); },
    strings,
  });
  body.append(search);

  const list = document.createElement('div');
  list.className = 'c-contacts__list';
  st.els.list = list;
  body.append(list);

  const empty = document.createElement('div');
  empty.className = 'c-contacts__empty';
  empty.hidden = true;
  const emptyDisc = document.createElement('span');
  emptyDisc.className = 'c-contacts__empty-art';
  emptyDisc.append(icon('users', { size: 32 }));
  const emptyText = document.createElement('p');
  emptyText.className = 'c-contacts__empty-text';
  empty.append(emptyDisc, emptyText);
  st.els.empty = empty;
  body.append(empty);

  el.append(body);

  const footer = document.createElement('div');
  footer.className = 'c-contacts__footer';
  footer.hidden = true;
  const nextBtn = createButton({
    label: strings.next || 'Next', size: 56, width: 'full', disabled: true,
    onClick: () => {
      if (!onNext) return;
      // F2 belt-and-braces: drop any falsy address that reached the Set anyway
      const sel = st.contacts.filter((c) => c.address && st.selected.has(c.address));
      onNext(sel);
    },
  });
  st.els.nextBtn = nextBtn;
  footer.append(nextBtn);
  st.els.footer = footer;
  el.append(footer);

  renderPickerList(st);
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

export function createAddContact({
  onCheckAddress, onSendRequest, onScan, onOpened, onBack, strings = {},
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
  scanBtn.setAttribute('aria-label', strings.scan || 'Scan QR code');
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
  el.append(body);

  const footer = document.createElement('div');
  footer.className = 'c-contacts__footer';
  const sendBtn = createButton({ label: strings.sendRequest || 'Send request', size: 56, width: 'full' });
  footer.append(sendBtn);
  el.append(footer);

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
    if (a.length < ADDR_MIN || a.length > ADDR_MAX) {
      setError(strings.badAddress || 'That doesn’t look like an Ixian address.');
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
  members = [], onPickAvatar, onCreate, onMembersChange, onBack, strings = {},
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
    membersHead.textContent = (strings.members || 'Members') + ' · ' + list.length;
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
  name = '', address = '', avatar = null, onCancelRequest, onBack, strings = {},
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
  nameEl.textContent = name || address;
  hero.append(nameEl);
  if (name) {
    const addrEl = document.createElement('p');
    addrEl.className = 'c-contacts-pending__addr';
    addrEl.textContent = address;
    hero.append(addrEl);
  }
  hero.append(createBadge({ label: strings.pending || 'Request sent', type: 'warning', weight: 'tonal' }));
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
