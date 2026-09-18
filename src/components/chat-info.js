/**
 * c-chat-info — chat info takeover (docs/chat-info-spec.md, DECISIONS #141).
 * ONE surface for 1:1 / group / bot (Damir: send-screen grammar — tap the chat
 * header, full in-phone takeover); sections render by kind + capabilities:
 *
 *   hero (CENTERED: avatar-80, name, 1:1 nickname edit → ixian:userdefinednick,
 *     and — ★ Session Y, #875 — the TRUNCATED ADDRESS under the name (#211 canon);
 *     tap = the shared address/QR sheet via onAddressSheet. Not for groups/blind.)
 *   action row — ★ Session Y (#876): max FOUR equal ROUNDED-RECTANGLE tiles on
 *     --surface-card, glyph on the one accent, label inside. Chat header (1:1) =
 *     Call · Pay · Mute; directory (1:1) = Message · Call · Pay · Mute; rooms =
 *     Message (directory only) · Mute. REQUEST IS NOT IN THE ROW any more — it lives
 *     in the composer ⊕ attach sheet (File · Pay · Request). Sits DIRECTLY under
 *     the identity: identity → what you can do → details you rarely need.
 *     (money is 1:1 ONLY — rooms never render Pay, and group request semantics are a
 *     §9 ask, #139; Pay stays a SHELL duty: onPay opens the native flow)
 *   mute tile — rendered when capabilities.notifications && onNotifications
 *     (the Notifications SWITCH ROW is retired, #875): the LABEL is the state (Mute ↔ Unmute; data-muted mirrors it),
 *     optimistic flip, revert on ctrl.fail — the switch's contract, on a tile
 *   shared media strip — capabilities.media (NO legacy command, §9; demo-fed)
 *   members (group) — FULL A–Z scrollable list (#142: the #136③ caps made
 *     scanning impossible — you had to already know who you were looking for;
 *     search renders from 8 members as a FILTER, not a gate); row →
 *     openMemberSheet; capabilities.admin injects Kick/Ban (each behind an
 *     alertdialog confirm → ixian:kick/ban); relation 'contact' + onViewContact
 *     → the sheet's identity block opens the contact page (contact context)
 *   payments (1:1/bot) — collapsed accordion (#142: a long tx list must not
 *     greet every visit): "Payments (N)" toggle → recent 5 txlist-item rows +
 *     "View all" (onTxAll; without it the full list renders inline)
 *   disappearing messages (chat context, capabilities.selfDestruct — NO legacy
 *     command, §9; demo-fed) — setting row → option sheet (Off/1h/1d/1w),
 *     committed per option with a latched ctrl
 *   destructive zone — 1:1: delete history (ixian:removehistory) + remove
 *     contact (ixian:remove) · group: leave (ixian:leave). ★ Session Y (#873/#875):
 *     ONE inset-grouped card, placed BY KIND — 1:1 = the LAST group (nothing
 *     unbounded sits below it); group/bot = ABOVE the roster (the roster is
 *     unbounded, #726 batches it — a Leave at its foot is out of reach). The
 *     irreversible row (Remove / Leave) is a --text-error LABEL, no fill; Delete
 *     history stays neutral. EVERY destructive confirm follows the #135-C1 lock:
 *     dismissal disabled while in flight (live via setOverlayOpts — the #138
 *     overlay fix), confirm latched.
 *
 *   ★ Session Y — THE PREMIUM PASS (docs/contact-details-premium-proposal.md; #875
 *   picks; #876 tiles; #873 danger placement). Grammar of THIS screen family only
 *   (#618 amended: the Account hub keeps its coloured discs): row glyphs are bare
 *   22px monochrome (--icon-neutral-02), sections are INSET-GROUPED cards (one card
 *   per group, rows inside with inset hairlines, radius 12, NO elevation), section
 *   labels sit OUTSIDE the card, red is destructive-only. Group avatars keep their
 *   identity gradient (#34 — identity hues are data, not decoration).
 *
 * context: 'chat' (default) | 'contact' — ONE component, two surfaces (#142).
 *   'contact' = the contact page (from the contacts list / member sheet):
 *   title "Contact info", a Message action (onMessage) leads, delete-history
 *   and disappearing-messages stay chat-side.
 *   ROOMS (kind 'group'/'bot') are context-free on this point (W9-②): they show the
 *   Message action whenever the caller supplies onMessage, and no Message when it does
 *   not (★ Session Y: the Mute tile is there either way when the host wires
 *   notifications — so a room from the chat header shows Mute alone). That is the
 *   whole switch between "reached from the directory" (needs a way in — the history
 *   may be deleted) and "opened on top of the conversation you are already in"
 *   (chat.html passes no onMessage).
 *
 * Async callbacks use the house (payload, ctrl) contract — ctrl.done()/fail(msg)
 * from the bridge; each ctrl is one-shot per attempt (#138 m1).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createAvatar, truncateAddressMiddle, safeImageSrc } from './avatar.js';
import { createButton, setLoading } from './button.js';
import { createTopbar } from './topbar.js';
import { createBadge } from './badge.js';
import { createSearchField } from './search-field.js';
import { createTxItem } from './txlist-item.js';
import { createModal, openModal } from './modal.js';
import { overlayId, setOverlayOpts, dismissOverlay } from './overlay.js';
import { createSheet, openSheet, closeSheet } from './sheet.js';
import { openMemberSheet } from './member-sheet.js';
import { openMediaViewer } from './media-viewer.js';

const SEARCH_FROM = 8;         // search = a filter from 8 members (#142 — no caps)
const TX_PREVIEW = 5;          // expanded payments show the 5 most recent
const SELF_DESTRUCT_OPTIONS = [        // seconds; 0 = off (§9 — no bridge command yet)
  { value: 0, key: 'sdOff', label: 'Off' },
  { value: 3600, key: 'sdHour', label: '1 hour' },
  { value: 86400, key: 'sdDay', label: '1 day' },
  { value: 604800, key: 'sdWeek', label: '1 week' },
];

function ctrlFor(onDone, onFail) {
  let used = false;            // one-shot per attempt (#138 m1)
  return {
    done: () => { if (used) return; used = true; onDone(); },
    fail: (msg) => { if (used) return; used = true; onFail(msg); },
  };
}

function sectionLabel(text) {
  const l = document.createElement('h3');
  l.className = 'c-chat-info__label';
  l.textContent = text;
  return l;
}

/* ★ Session Y (#875 P2/P5): an INSET-GROUPED section — a transparent wrapper holding
   the label OUTSIDE (iOS grouped: label-sm, uppercase, --text-neutral-02) and ONE card
   (--surface-card, radius 12, no elevation) that the group's rows sit inside, separated
   by inset hairlines (chat-info.css). `cls` lands on the WRAPPER so the section-level
   selectors the suite and the shells already use (`__members`, `__shared`, `__txs`,
   `__media`, `__danger`) keep resolving to the section. */
function groupCard({ label, cls } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'c-chat-info__group' + (cls ? ' ' + cls : '');
  if (label) wrap.append(sectionLabel(label));
  const card = document.createElement('div');
  card.className = 'c-chat-info__card';
  wrap.append(card);
  return { wrap, card };
}

/* ★ Session Y (#875 P1): a ROW GLYPH is a bare 22px monochrome icon — no disc, no
   hue, no gradient. The coloured-squircle grammar (`c-disc`, #147/#148) is the iOS
   *Settings* idiom; the messengers this screen is measured against (Telegram, Signal,
   WhatsApp) draw one accent + greyscale, and five hues on one contact screen were the
   "too colourful" Damir named. The Account hub KEEPS its discs (#618 amended to one
   grammar per screen FAMILY) — this atom is chat-info's only. Colour is a ROLE set
   in css: --icon-neutral-02 by default, --icon-error under [data-tone="error"]. */
function rowGlyph(glyph) {
  const g = icon(glyph, { size: 22 });
  g.classList.add('c-chat-info__row-glyph');
  return g;
}

/* ★ Session Y (#876): a quick action is a ROUNDED-RECTANGLE TILE, one of at most
   four equals in the row. The button IS the tile — --surface-card, radius 12 (the same
   surface and radius as the grouped cards below it, so the screen has one system),
   a 22px glyph on the single accent and a 12px label INSIDE it (Telegram's
   PeerInfoHeaderButtonNode: tile = list block colour, icon over label). The 48px
   tonal circle + label-underneath of the 2026-08-12 pass (the wallet-banner grammar)
   is retired HERE ONLY — the wallet hero keeps its circles: different surface,
   different job. The whole tile is the target (≥ 64 tall, equal widths).
   A TOGGLE tile (Mute) signals its state through its LABEL (Mute ↔ Unmute) and glyph —
   ONE signal, per the APG button pattern: a tile that also flipped `aria-pressed` would
   announce "Unmute, pressed", the un-done action plus a state (#46 loop, Session Y
   MINOR-4). The state rides `data-muted` for css and tests. */
function infoQuickAction({ glyph, label, onClick, action }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'c-chat-info__qa';
  if (action) b.dataset.action = action;
  const g = icon(glyph, { size: 22 });
  g.classList.add('c-chat-info__qa-glyph');
  const lab = document.createElement('span');
  lab.className = 'c-chat-info__qa-label';
  lab.textContent = label;
  b.append(g, lab);
  if (onClick) b.addEventListener('click', onClick);
  return b;
}
/* ★ #876: "a row is a set of equals; five equals is a menu." Enforced, not hoped:
   Request left the row so Mute could join, and nothing may push the count past four. */
const QA_MAX = 4;

export function createChatInfo({
  kind = 'contact',              // 'contact' | 'group' | 'bot'
  context = 'chat',              // 'chat' | 'contact' — contact page reuses this surface (#142)
  name = '',
  address = '',
  avatar = null,                 // hero photo src (path/data: URI); null → gradient (onerror-safe)
  avatarSeed = '',               // hue source when it differs from name
  online = false,                // A4 (#302): presence dot on the hero avatar — 1:1 ONLY
  nickname = '',                 // 1:1 local override (spoofable — address is truth)
  memberCount = 0,
  members = [],                  // [{ name, address, admin, owner, relation }] — owner → "Owner" chip (#248)
  blind = false,                 // chat mode 2: identities hidden
  amOwner = false,               // N48 (#370): MY OWN owner status (self-only push; blind-safe)
  notifications = true,
  media = [],                    // [{ id, thumb, kind }] — flagged section
  allowRemoteImages = false,     // ★ O-13: a REMOTE http(s) thumb needs the shell's opt-in; a
                                 // data:image/ thumb never does. Default = no remote request.
  txs = [],                      // txlist-item opts (1:1 activity), newest first
  selfDestruct = 0,              // current disappearing-messages window (seconds; 0 = off)
  capabilities = {},             // { notifications, media, admin, presence, selfDestruct }
  host,                          // overlay host (sheets/modals); shell passes it
  onBack,
  onNickname,                    // (nick, ctrl)
  onMessage,                     // contact context: open the 1:1 chat (shell nav)
  onCall,                        // ★ #591 (Damir): start a voice call — 1:1 only
  onPay,                         // shell: #139 takeover
  /* ★ Session Y (#876): Request left the action row (it lives in the composer ⊕ attach
   * sheet: File · Pay · Request), and `onRequest` was accepted-and-not-rendered.
   * ★ Session Z (#882 (d), Damir's dial): it RETURNS ON THE DIRECTORY ARM ONLY
   * (`context === 'contact'`), where there is no composer and Request was three taps away
   * (Message → conversation → ⊕). #876's four-tile ceiling holds: on that arm Request
   * takes the fourth slot and MUTE STEPS OUT only when the row is full (Message · Call · Pay
   * · Request); a peer with no call route keeps Mute (Message · Pay · Request · Mute). Mute
   * is a chat setting and stays a tile on the chat arm regardless. A fifth tile
   * was measured and rejected: (360 − 32 − 4×8) / 5 = 59 px, narrower than the label
   * "Message" at label-sm. From the chat arm (`context === 'chat'`) it stays unrendered. */
  onRequest,
  onAddressSheet,               // ★ #591 / ★ Session Y: the address UNDER THE NAME opens the ONE address surface
  onNotifications,               // (next, ctrl) — optimistic, revert on fail
  onSelfDestruct,                // (seconds, ctrl) — committed per option pick
  onMediaOpen, onMediaAll,
  onMemberAction,                // ('kick'|'ban', member, ctrl)
  onContactRequest,              // member sheet passthrough
  onViewContact,                 // member sheet passthrough (relation 'contact' → contact page)
  onDeleteHistory, onRemoveContact, onLeave,   // (ctrl)
  /* ★★ REMOVE-CONTACT SPEC §4: the host owns the confirmation surface for Remove.
   * Contact details opens the SHARED remove sheet — which is a decision surface in
   * its own right, with the shared groups and a way past them — so stacking this
   * component's generic confirm in front of it would put two destructive surfaces on
   * screen for one decision, which is the §3 complaint in a new place. Default false:
   * every other host keeps the confirm it has always had. */
  removeContactOwnsConfirm = false,
  loading = false,               // ★ A8: the roster/pushes are still landing → skeleton rows (members) instead of an empty section
  sharedGroups = undefined,      // ★ A4 (1:1): [{ name, address }] groups you are BOTH in; null = asked, not yet answered (skeleton); [] = none; undefined = the surface has no such data (no strip)
  onOpenGroup,                   // ★ A4: tap a shared-group row → the shell opens that group chat
  onTx,
  onTxAll,                       // "View all" → full payment history (shell nav)
  strings = getStrings(),
} = {}) {
  const el = document.createElement('div');
  el.className = 'c-chat-info';
  el.dataset.kind = kind;
  el.dataset.context = context;

  el.append(createTopbar({
    variant: 'view',
    title: context === 'contact'
      ? (strings.contactDetails || 'Contact details')
      // Quirk-7 fix (#247): the old `strings.chatInfo || (group ? …)` fallback meant a
      // PRESENT chatInfo key hid the group branch — groups always titled "Chat info".
      : (kind === 'group' ? (strings.groupInfo || 'Group info') : (strings.chatInfo || 'Chat info')),
    onBack,
  }));

  const body = document.createElement('div');
  body.className = 'c-chat-info__body u-scroll';
  el.append(body);

  // polite announcements (copy morph, notification revert) — one region,
  // clip-hidden in css (the wallet-receive __live pattern, audit m3 family)
  const live = document.createElement('p');
  live.className = 'c-chat-info__live';
  live.setAttribute('aria-live', 'polite');
  el.append(live);

  /* ——— hero ——— */
  const hero = document.createElement('div');
  hero.className = 'c-chat-info__hero';
  /* ★ #596: THE COVER IS RETIRED (Damir, 2026-08-27 — D1). The blurred identity band
   * behind the avatar is gone for v1: it had no lower edge, and for a contact with no
   * photo it became a full-bleed wash of that avatar's own single colour. A replacement
   * is a later design job, so nothing takes its place here. */
  /* A4 (#302): presence on the hero. 1:1 only — C# structurally cannot push it for
     a group or bot (ContactDetails.updateScreen returns at :405-410, before the
     presence block, whenever isGroup is set). Guarding on `kind` here as well means
     a demo passing online:true on a group can't grow a dot the bridge never feeds. */
  /* 80, not 64 (Damir 2026-08-12 "premium" pass): the hero is now a CENTERED
     identity block — a portrait-scale avatar is what makes it read as a profile
     rather than a list row. Initials/presence-dot scale for 80 are pinned in
     chat-info.css (avatar.css only tokenizes 24/40/48 + the old 64 hero). */
  const heroAvatar = createAvatar({
    src: avatar, name: name, address: avatarSeed || address, size: 80,
    online: kind === 'contact' && !!online,
    group: kind !== 'contact', // N1 (#364): group/bot hero wears the group glyph
  });
  /* #334 (Damir ask): a REAL hero photo opens full-screen in the EXISTING media
     viewer — the avatar wraps in a button (focus ring = base.css :focus-visible;
     setChatInfoPresence's `.c-chat-info__hero .c-avatar` query still resolves
     through the wrapper). Gradient avatars stay non-interactive; if the photo
     src fails to load (avatar.js onerror → gradient fallback) the wrapper
     UNWRAPS, so no dead "View photo" control survives the fallback. ONE photo
     only — the bridge carries a single avatar src; a carousel is a BE row, not
     a stub to fake here. */
  if (avatar) {
    const view = document.createElement('button');
    view.type = 'button';
    view.className = 'c-chat-info__avatar-view';
    view.setAttribute('aria-label', strings.viewPhoto || 'View photo');
    view.append(heroAvatar);
    view.addEventListener('click', () => openMediaViewer({
      host: host || el.closest('.demo-phone') || undefined,   // audit m6 grammar
      src: avatar,
      alt: nickname || name || '',
      kind: 'image',
      strings,
    }));
    // avatar.js's own once-listener swaps the broken <img> for the gradient;
    // ours (same event, registered after) retires the interactive wrapper.
    const heroImg = heroAvatar.querySelector('.c-avatar__img');
    if (heroImg) heroImg.addEventListener('error', () => view.replaceWith(heroAvatar), { once: true });
    hero.append(view);
  } else {
    hero.append(heroAvatar);
  }
  const idCol = document.createElement('div');
  idCol.className = 'c-chat-info__id';
  const nameRow = document.createElement('div');
  nameRow.className = 'c-chat-info__name-row';
  const nameEl = document.createElement('span');
  nameEl.className = 'c-chat-info__name';
  nameEl.textContent = nickname || name;
  nameRow.append(nameEl);
  idCol.append(nameRow);
  const sub = document.createElement('span');
  sub.className = 'c-chat-info__sub';
  if (kind === 'group') {
    // R2 (#371): "1 member", not "1 members" — whole-phrase key so locales with
    // richer plural rules translate the complete singular line.
    const n = memberCount || members.length;
    sub.textContent = n === 1 ? (strings.memberOne || '1 member') : `${n} ${strings.members || 'members'}`;
  } else if (nickname && nickname !== name) {
    sub.textContent = name;       // override active → the wire name stays visible
  }
  // ALWAYS in the DOM (e2e catch: a nickname set LATER writes to sub — an
  // unappended node made the wire name silently vanish); hidden when empty
  sub.hidden = !sub.textContent;
  idCol.append(sub);
  /* ——— ★ Session Y (#875 P7): THE ADDRESS UNDER THE NAME ———
     Telegram and Signal put the handle under the name; the address row that used to
     open group 1 (#591) moves INTO the hero as its last line — the #211 TRUNCATED form,
     tap = the ONE address surface (the shell's sheet: full address, copy, QR). The row
     LEAVES group 1; nothing else on the screen shows the address.
     Groups have NO payable/shareable address at all (Damir F5 2026-07-29: a group's
     identifier is a local session id, not a wallet address), and a blind surface hides
     identity — both keep the line absent. 1:1 and bots show it.
     ⚠ The class `c-chat-info__addr-row` stays on the element on purpose: it is still
     THE address affordance of this screen (the suite's #591 pins read it by that name —
     truncated text, no full value, tap → onAddressSheet); `__hero-addr` carries the
     placement. A host that passes no handler gets a plain line — honest, never dead. */
  if (address && kind !== 'group' && !blind) {
    const addrRow = document.createElement(onAddressSheet ? 'button' : 'span');
    if (onAddressSheet) addrRow.type = 'button';
    addrRow.className = 'c-chat-info__addr-row c-chat-info__hero-addr';
    const addrVal = document.createElement('span');
    addrVal.className = 'c-chat-info__addr-value u-tabular';
    addrVal.textContent = truncateAddressMiddle(address, 9, 6);
    addrRow.append(addrVal);
    if (onAddressSheet) {
      // the affordance is the code glyph, not a chevron: the sheet it opens IS the QR
      addrRow.append(icon('qrcode', { size: 16 }));
      // the accessible name CONTAINS the visible label (WCAG 2.5.3) and stays short: the
      // full value is one tap away in the sheet, not 67 characters read on every focus
      addrRow.setAttribute('aria-label', (strings.contactSpixiAddress || 'Spixi address') + ', ' + addrVal.textContent);
      addrRow.addEventListener('click', () => onAddressSheet({ address }));
    }
    idCol.append(addrRow);
  }
  /* N48 (#370): MY OWN owner status. Rendered in the HERO for BLIND rooms only —
     there the roster carries no owner ADDRESS (C# suppresses it), so no ROW can
     wear the Owner chip; the hero is the one reliable place. (The self row may
     still show my NICK when I have one — loop B-9 — but the roster stays
     chip-less either way.) Non-blind rooms already badge the self ROW via the
     owner-address match (#248); doubling it here would repeat the same fact
     twice on one screen (extend on Damir's word — logged dial). */
  // GROUPS only, matching the C# gate (loop A-5/F-5): a bot room's getOwner()
  // is unreliable, so no arm may render the claim even if a push ever carries it.
  if (amOwner && blind && kind === 'group') {
    const selfRole = createBadge({ type: 'info', weight: 'tonal', label: strings.youAreOwner || 'You are the owner' });
    selfRole.classList.add('c-chat-info__self-role');
    idCol.append(selfRole);
  }
  hero.append(idCol);
  body.append(hero);

  /* 1:1 nickname edit (ixian:userdefinednick — local override, not pushed) */
  if (kind !== 'group' && onNickname) {
    /* ★ Session K (#756 ⑤, the `icon-only button requires ariaLabel` warning): the label
       is passed AT CREATION — setting it a line later left the warning in every boot log. */
    const pencil = createButton({
      type: 'text', size: 44, icon: icon('pencil', { size: 18 }),
      ariaLabel: strings.editNickname || 'Edit nickname',
      onClick: startNickEdit,
    });
    pencil.classList.add('c-chat-info__nick-edit');
    /* ★ Session Z (#884 ⑥, Damir on the Y walk: the pencil pushes the name off centre):
       the row is `justify-content: center` and the pencil is a flex SIBLING, so the PAIR
       was centred and the name sat half a pencil (22 px) left of the axis. A symmetric
       GHOST — the pencil's width, inert, hidden from readers — before the name puts the
       NAME on the axis. It hides and shows WITH the pencil (an open editor centres its
       input alone), which is why both toggles below touch it. */
    const ghost = document.createElement('span');
    ghost.className = 'c-chat-info__nick-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    nameRow.insertBefore(ghost, nameEl);
    nameRow.append(pencil);

    var nickErr = document.createElement('span');   // hoisted: cleared on re-edit
    nickErr.className = 'c-chat-info__nick-error';
    nickErr.setAttribute('role', 'alert');
    nickErr.hidden = true;
    idCol.append(nickErr);

    function startNickEdit() {
      if (nameRow.querySelector('.c-chat-info__nick-input')) return;
      nickErr.hidden = true;
      const input = document.createElement('input');
      input.className = 'c-chat-info__nick-input';
      input.type = 'text';
      input.value = nickname;
      input.setAttribute('aria-label', strings.nickname || 'Nickname');
      input.placeholder = name;
      nameEl.hidden = true;
      pencil.hidden = true;
      ghost.hidden = true;
      nameRow.insertBefore(input, nameEl);
      input.focus();
      let closed = false;
      let committing = false;      // audit #141-M1: Enter disables the input,
                                   // Chrome blurs it, blur re-ran commit — two
                                   // ctrls for one edit. Latch until resolve.
      const closeEdit = () => {
        if (closed) return;
        closed = true;
        input.remove();
        nameEl.hidden = false;
        pencil.hidden = false;
        ghost.hidden = false;
      };
      const commit = () => {
        if (closed || committing) return;
        const nick = input.value.trim();
        if (nick === nickname) { closeEdit(); return; }
        committing = true;
        input.disabled = true;                        // locked until resolve (spec)
        onNickname(nick, ctrlFor(
          () => {
            nickname = nick;
            nameEl.textContent = nickname || name;
            sub.textContent = (nickname && nickname !== name) ? name : '';
            sub.hidden = !sub.textContent;
            closeEdit();
            pencil.focus();                           // #137 M3: never drop focus
          },
          (msg) => {
            committing = false;
            input.disabled = false;
            nickErr.textContent = msg || strings.nicknameFailed || 'Couldn’t save the nickname.';
            nickErr.hidden = false;
            input.focus();
          },
        ));
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') {
          e.stopPropagation();
          if (committing) return;   // M1: no escape hatch mid-flight — the
                                    // bridge outcome must land somewhere real
          closeEdit();
          pencil.focus();
        }
      });
      input.addEventListener('blur', commit);         // Enter/blur commit (spec)
    }
  }

  /* ——— actions (1:1/bot; groups wait on §9 room-request semantics, #139) ———
     Damir 2026-08-12: the actions now sit DIRECTLY under the identity — identity →
     what you can do → the details you rarely need (the address card used to shove
     the primary actions half a screen down). Wallet-banner grammar: tonal circle +
     label, three across (Message · Pay · Request); contact context leads with
     Message, chat context has no Message (you are already in the conversation). */
  /* iOS-26 (AUDIT MINOR-3): a GROUP reached from the contacts directory needs the
     Message action too — the whole point of putting groups back in the directory is
     that a wiped chat history must not make the group unreachable, and without this
     the directory dead-ends on an info screen. Money stays 1:1/bot only: a group
     address is not a payable counterparty (peopleRoster fence, home.html). */
  /* ★ W9-② (Damir, Windows F5 2026-08-13): "Group info — if I delete chat I can't
     reactivate it, there's no Send message in group details."
     iOS-26 gave the GROUP kind this action; #249 then moved BOT/channel surfaces
     onto the same screen (`kind: 'bot'` — ContactDetails sends "group"|"bot" from
     friend.type), and the `kind === 'group'` test below did not follow. A bot
     channel reached from the directory therefore still dead-ended on an info
     screen with no way into its conversation — the exact class of bug this action
     exists to close, and (with a deleted history) the only route back in.
     So the rule is kind-agnostic: ANY non-1:1 surface that was handed an onMessage
     shows it alone. The in-chat takeover is untouched — chat.html passes NO
     onMessage (you are already in the conversation), so `roomMessageOnly` is false
     there and the whole row stays absent, exactly as yesterday's pass decided. */
  /* ★ Session Y (#876): the row is a set of at most FOUR equals — Message (directory
     only) · Call (1:1 only) · Pay (1:1/bot, capability-gated by the host) · Mute
     (capabilities.notifications && onNotifications). REQUEST IS NOT HERE any more:
     it lives in the composer ⊕ attach sheet (File · Pay · Request), so leaving the row
     cost nothing and made room for Mute without a fifth tile. Rooms get Mute plus
     whatever the room allows (Message from the directory) — the old "rooms hide the
     row" rule was about MONEY, and money is still 1:1/bot only (§9). */
  const roomKind = kind === 'group' || kind === 'bot';
  const roomMessageOnly = roomKind && !!onMessage;
  const canMute = !!(capabilities.notifications && onNotifications);
  {
    const money = document.createElement('div');
    money.className = 'c-chat-info__money';
    if ((context === 'contact' || roomMessageOnly) && onMessage) {
      const msg = infoQuickAction({
        glyph: 'messages', label: strings.message || 'Message', onClick: () => onMessage(), action: 'message',
      });
      msg.classList.add('c-chat-info__message');
      money.append(msg);
    }
    /* ★ #591 (Damir's mockup): CALL sits between Message and the money pair — it is the
       other way to reach a person, so it belongs beside Message rather than beside Pay.
       1:1 ONLY: there is no group-call verb, and a dead button on a details screen is
       the class of defect this project keeps writing rows about. Opt-in like every other
       action here, so a host that cannot route a call simply shows one fewer. */
    if (onCall && !roomKind) money.append(infoQuickAction({
      glyph: 'phone', label: strings.callAction || 'Call', onClick: () => onCall(), action: 'call',
    }));
    if (onPay && !roomKind) money.append(infoQuickAction({
      glyph: 'arrow-up-right', label: strings.pay || 'Pay', onClick: () => onPay(), action: 'pay',
    }));
    /* ★ Session Z (#882 (d)): Request on the DIRECTORY arm only — see the option docblock.
       It displaces Mute there (the four-tile rule, #876). */
    const requestTile = context === 'contact' && !roomKind && !!onRequest;
    if (requestTile) money.append(infoQuickAction({
      glyph: 'arrow-down-left', label: strings.request || 'Request', onClick: () => onRequest(), action: 'request',
    }));
    /* ★ Session Y (#875): MUTE IS A TILE — the Notifications switch row is retired.
       Same contract as the switch it replaces: optimistic flip, revert on ctrl.fail,
       one flight at a time, the polite region announces a failure. The LABEL is the
       state (Mute ↔ Unmute — a toggle BUTTON that names the action it will take, not a
       switch), `data-muted` mirrors it for css/tests, and the glyph follows the label
       (bell / bell-off) so the state reads without the text. */
    /* ★ #46 loop (A-5): Mute yields to Request only when the row is FULL — a peer with no
       call route (Message · Pay · Request) keeps Mute as its fourth tile. */
    if (canMute && money.childElementCount < QA_MAX) {
      let muted = !notifications;
      let inFlight = false;
      const mute = infoQuickAction({
        glyph: muted ? 'bell-off' : 'bell',
        label: muted ? (strings.unmute || 'Unmute') : (strings.mute || 'Mute'),
        action: 'mute',
      });
      mute.dataset.muted = String(muted);              // the mount state, before any tap
      const paint = () => {
        mute.dataset.muted = String(muted);
        const g = icon(muted ? 'bell-off' : 'bell', { size: 22 });
        g.classList.add('c-chat-info__qa-glyph');      // svg: classList, never .className (read-only SVGAnimatedString)
        mute.querySelector('.c-chat-info__qa-glyph').replaceWith(g);
        mute.querySelector('.c-chat-info__qa-label').textContent =
          muted ? (strings.unmute || 'Unmute') : (strings.mute || 'Mute');
      };
      mute.addEventListener('click', () => {
        if (inFlight) return;                          // no queued double-toggles
        inFlight = true;
        muted = !muted;
        paint();                                       // optimistic (the switch's spec)
        // the switch's contract was `next` = notifications ON; a muted tile is OFF
        onNotifications(!muted, ctrlFor(
          () => { inFlight = false; },
          () => {                                      // revert on fail
            muted = !muted;
            paint();
            live.textContent = strings.notifFailed || 'Couldn’t update notifications.';
            inFlight = false;
          },
        ));
      });
      money.append(mute);
    }
    // never five (#876) — by construction above, and ENFORCED so a future tile cannot
    // slip in without changing the rule that says the row is four equals. ⚠ Not a throw:
    // this runs inside the shell's rebuild (a setTimeout with no try), where a throw is
    // a boot spinner that never ends (#801 class) — so it logs LOUDLY and trims instead.
    while (money.childElementCount > QA_MAX) {
      // eslint-disable-next-line no-console
      console.error('c-chat-info: action row exceeds ' + QA_MAX + ' tiles (#876) — dropping', money.lastElementChild.dataset.action);
      money.lastElementChild.remove();
    }
    // a lone action (a room from the chat header: Mute alone) hugs its label instead
    // of stretching across the screen — a full-width tile reads as a button
    money.dataset.count = String(money.childElementCount);
    // …and an EMPTY row is never appended: a 1:1 surface entered from a chat
    // header passes onMessage but suppresses it (context 'chat'), which used to
    // leave a bare padded div under the identity (bot case, #249).
    if (money.childElementCount) body.append(money);
  }

  /* ——— address card / notifications switch row: RETIRED (★ Session Y, #875) ———
     The address is the hero's last line now (above); the Notifications switch became
     the Mute tile in the action row. Group 1 is gone with them — nothing on this screen
     is a lone row on its own card any more. */

  /* ——— disappearing messages (#142 — chat-side policy, so chat context only;
     capabilities.selfDestruct gates it: NO legacy command, §9 ask) ——— */
  if (context === 'chat' && capabilities.selfDestruct && onSelfDestruct) {
    const sdRow = document.createElement('button');
    sdRow.type = 'button';
    sdRow.className = 'c-chat-info__row c-chat-info__setting';
    const sdLab = document.createElement('span');
    sdLab.className = 'c-chat-info__row-label';
    sdLab.append(rowGlyph('hourglass-empty'),
      document.createTextNode(strings.selfDestruct || 'Disappearing messages'));
    const sdVal = document.createElement('span');
    sdVal.className = 'c-chat-info__setting-value';
    const sdLabelFor = (v) => {
      const o = SELF_DESTRUCT_OPTIONS.find((x) => x.value === v) || SELF_DESTRUCT_OPTIONS[0];
      return strings[o.key] || o.label;
    };
    sdVal.textContent = sdLabelFor(selfDestruct);
    sdRow.append(sdLab, sdVal, icon('chevron-right', { size: 18 }));
    sdRow.addEventListener('click', () => {
      const wrap = document.createElement('div');
      wrap.className = 'c-chat-info__sd';
      wrap.setAttribute('role', 'radiogroup');
      wrap.setAttribute('aria-label', strings.selfDestruct || 'Disappearing messages');
      const hint = document.createElement('p');
      hint.className = 'c-chat-info__sd-hint';
      hint.textContent = strings.selfDestructHint ||
        'New messages in this chat disappear for everyone after the selected time.';
      wrap.append(hint);
      let inFlight = false;                    // one commit at a time
      for (const o of SELF_DESTRUCT_OPTIONS) {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'c-chat-info__sd-option';
        opt.setAttribute('role', 'radio');
        opt.setAttribute('aria-checked', String(o.value === selfDestruct));
        const lab = document.createElement('span');
        lab.className = 'c-chat-info__sd-option-label';
        lab.textContent = strings[o.key] || o.label;
        // fixed right-hand slot holds the success check OR the loading spinner —
        // the LABEL never shifts (audit: setLoading prepended the spinner and
        // shoved the label right; the spinner now lands where the check will be)
        const status = document.createElement('span');
        status.className = 'c-chat-info__sd-status';
        const tick = icon('check', { size: 18 });
        tick.classList.add('c-chat-info__sd-check');
        status.append(tick);
        opt.append(lab, status);
        opt.addEventListener('click', () => {
          if (inFlight || o.value === selfDestruct) return;
          inFlight = true;
          opt.dataset.loading = '';
          opt.setAttribute('aria-busy', 'true');
          const spinner = document.createElement('span');
          spinner.className = 'c-button__spinner';       // reuse the button spinner; inherits the success ink from the slot
          spinner.setAttribute('aria-hidden', 'true');
          status.append(spinner);                        // lands in the check slot, not before the label
          onSelfDestruct(o.value, ctrlFor(
            () => {
              selfDestruct = o.value;
              sdVal.textContent = sdLabelFor(o.value);
              closeSheet(sheet);
              live.textContent = (strings.selfDestruct || 'Disappearing messages') + ': ' + sdLabelFor(o.value);
            },
            (msg) => {
              inFlight = false;
              opt.removeAttribute('aria-busy');
              delete opt.dataset.loading;
              spinner.remove();
              live.textContent = msg || strings.selfDestructFailed || 'Couldn’t update disappearing messages.';
            },
          ));
        });
        wrap.append(opt);
      }
      const sheet = createSheet({
        content: wrap, host: host || el.closest('.demo-phone') || undefined,
        title: strings.selfDestruct || 'Disappearing messages', strings,
      });
      openSheet(sheet);
    });
    // wrap in a section div so the `> * + *` divider (hairline + breathing room)
    // lands on the WRAPPER, not the button — the button keeps a tight interactive
    // box so its pressed/focus state doesn't bleed into the divider gap (Damir)
    // ★ Session Y: the wrapper is the inset-grouped CARD now (one group, one row)
    const sdSection = groupCard({ cls: 'c-chat-info__setting-section' });
    sdSection.card.append(sdRow);
    body.append(sdSection.wrap);
  }

  /* ——— shared media (capabilities.media — NO legacy command, §9; demo-fed) ——— */
  if (capabilities.media && media.length) {
    // ★ Session Y (#875 P5): the label sits OUTSIDE the card, "See all" beside it
    const { wrap: sec, card: mediaCard } = groupCard({ cls: 'c-chat-info__media' });
    const head = document.createElement('div');
    head.className = 'c-chat-info__media-head';
    head.append(sectionLabel(strings.sharedMedia || 'Shared media'));
    if (onMediaAll) {
      const all = createButton({ label: strings.seeAll || 'See all', type: 'text', size: 32, onClick: () => onMediaAll() });
      head.append(all);
    }
    sec.prepend(head);
    const strip = document.createElement('div');
    strip.className = 'c-chat-info__media-strip';
    for (const item of media) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'c-chat-info__media-thumb';
      // ★ O-13: the strip's thumbs are peer-composed the moment this section is fed.
      // A refused value falls through to the kind glyph, so the tile still reads.
      const thumbSrc = safeImageSrc(item.thumb, { allowRemote: allowRemoteImages });
      if (thumbSrc) {
        const img = document.createElement('img');
        img.src = thumbSrc;
        img.alt = '';
        b.append(img);
      } else {
        b.append(icon(item.kind === 'file' ? 'file-isr' : 'photo', { size: 24 }));
      }
      b.setAttribute('aria-label', (strings.openMedia || 'Open') + ' ' + (item.kind || 'media'));
      if (onMediaOpen) b.addEventListener('click', () => onMediaOpen(item));
      strip.append(b);
    }
    mediaCard.append(strip);
    body.append(sec);
  }

  /* ——— members (group + bot) — #136③ caps; row → member sheet; admin: kick/ban.
     Bots list members too — LEGACY PARITY (Damir 2026-07-06d: the legacy channel
     bar's people icon opens exactly this list; screenshots on file). FLAGGED
     component change (desktop-split-spec §6d), not a silent edit; the full bot
     roster feed + paging stays a §9 BE ask — shells feed what the bridge gives. */
  if ((kind === 'group' || kind === 'bot') && (members.length || kind === 'bot' || loading)) {
    let count = memberCount || members.length;
    // ★ Session Y (#875 P5): "Members (N)" is the label OUTSIDE the card; search + the
    // roster sit inside it. `countLabel` keeps its handle — renderMembers rewrites it.
    const { wrap: sec, card: membersCard } = groupCard({
      label: (strings.membersTitle || 'Members') + ' (' + count + ')', cls: 'c-chat-info__members',
    });
    const countLabel = sec.querySelector('.c-chat-info__label');
    let query = '';
    let listEl = document.createElement('div');
    listEl.className = 'c-chat-info__member-list';
    // #142: NO caps — the whole list renders A–Z and the body scrolls, so a
    // member can be FOUND BY SCANNING (the #136③ caps forced you to already
    // know the name; audit #141-M3's unreachable-member hazard dies with them).
    // Search appears from 8 members as a convenience FILTER, not a gate.
    if (members.length >= SEARCH_FROM) {
      const search = createSearchField({
        placeholder: strings.searchMembers || 'Search members',
        onInput: (v) => { query = (v || '').trim().toLowerCase(); renderMembers(); },
      });
      membersCard.append(search);
    }
    membersCard.append(listEl);
    body.append(sec);

    const memberSheetFor = (m) => openMemberSheet({
      host: host || el.closest('.demo-phone') || undefined,   // audit m6: shell passes host
      // #249 loop C-1: owner/admin ride into the sheet so its identity block can
      // badge them consistently with the row list.
      member: { name: m.name, address: m.address, avatar: (blind && kind === 'group') ? null : m.avatar, owner: m.owner, admin: m.admin },
      blind: blind && kind === 'group',                 // ★ A1: the sheet follows the row — a bot member is shown as legacy showed it
      relation: m.relation || 'none',
      // audit M2 family: mark pending IMMEDIATELY — reopening the sheet must
      // not offer a second request while the first is on the wire.
      // #366: only a true stranger (relation none/unset) gets the live request
      // closure — 'self' (the #249 own row) and any unknown value stay inert
      // (the C# self-guard alert would be the only outcome of a live button).
      onRequest: (onContactRequest && (m.relation || 'none') === 'none')
        ? () => { m.relation = 'pending'; onContactRequest(m); } : undefined,
      // #142: contacts' identity block → the contact page (context: 'contact')
      onViewContact,
      // capabilities.admin → destructive actions, each behind an alertdialog
      // confirm (ixian:kick:ADDR / ixian:ban:ADDR are irreversible for the peer)
      /* ★★ KICK AND BAN ARE BOT-ROOM ONLY (Damir, 2026-08-29, option A).
       * He reported that kicking a member of a PRIVATE GROUP as its owner did nothing,
       * and the trace says why: the action is sent correctly and every receiving client
       * runs `case SpixiBotActionCode.kickUser: return true;` — an EMPTY case in
       * Ixian-Core. A bot room works because its action is addressed to the bot SERVER,
       * which enforces membership itself; a private group has no server, so the same
       * message asks every member's app to drop somebody and nothing honours it. Making
       * it work needs TWO Core changes — implement the handler, and define who may send
       * it, because nothing today verifies the admin flag against the message — and Core
       * is frozen. Logged for BE.
       * So the row is withdrawn where it cannot work, which is the ⑪ delivery-lie rule:
       * an affordance that emits a verb nobody honours tells the owner someone was
       * removed when they were not. Bot rooms are untouched — capability and visibility
       * both, exactly as Damir asked.
       * ⚠ `kind` is the right discriminator and it is NOT obvious: a bot room's Friend is
       * FriendType.NORMAL with `bot` true (Node.cs:979), so C# sends "bot" for it and
       * "group" only for a real FriendType.Group. Reading `blind` or `type` instead is
       * how #613 broke this family once already. */
      actions: capabilities.admin && kind === 'bot' && onMemberAction && !m.admin && !m.owner ? [   // #248: never kick/ban the owner
        {
          label: strings.kick || 'Kick', glyph: 'circle-x', destructive: true,
          onClick: () => confirmAction({
            title: (strings.kickTitle || 'Kick') + ' ' + (m.name || '') + '?',
            bodyText: strings.kickBody || 'They can be re-invited later.',
            confirmLabel: strings.kick || 'Kick',
            run: (ctrl) => onMemberAction('kick', m, ctrl),
            onDone: () => removeMemberRow(m),   // audit M2: stale rows re-offer kick
          }),
        },
        {
          label: strings.ban || 'Ban', glyph: 'cancel', destructive: true,
          onClick: () => confirmAction({
            title: (strings.banTitle || 'Ban') + ' ' + (m.name || '') + '?',
            bodyText: strings.banBody || 'They won’t be able to rejoin this group.',
            confirmLabel: strings.ban || 'Ban',
            run: (ctrl) => onMemberAction('ban', m, ctrl),
            onDone: () => removeMemberRow(m),   // audit M2
          }),
        },
      ] : [],
      strings,
    });

    // audit M2: a kicked/banned member's row must go — a stale row re-offers
    // ixian:kick for someone already out (and lies to the admin)
    function removeMemberRow(m) {
      const i = members.indexOf(m);
      if (i === -1) return;
      members.splice(i, 1);
      count = Math.max(0, count - 1);
      countLabel.textContent = (strings.membersTitle || 'Members') + ' (' + count + ')';
      // R2 (#371, loop B-3): the SECOND hero-sub writer — kick a member out of a
      // 2-person group and the plural form regressed to "1 members" here.
      sub.textContent = count === 1 ? (strings.memberOne || '1 member') : count + ' ' + (strings.members || 'members');
      renderMembers();
    }

    /* ★ Session H: one skeleton row (A8's shimmer grammar), reused by the boot state
       and by the incremental fill's tail below. */
    function skeletonRow(width) {
      const sk = document.createElement('div');
      sk.className = 'c-chat-info__member c-chat-info__member--skeleton';
      sk.setAttribute('aria-hidden', 'true');
      const av = document.createElement('span'); av.className = 'c-chat-info__skeleton-avatar';
      const ln = document.createElement('span'); ln.className = 'c-chat-info__skeleton-line';
      ln.style.width = width;
      sk.append(av, ln);
      return sk;
    }

    /* ★ Session H (Damir, L10's family): THE ROSTER FILLS IN BATCHES, NOT AS ONE PAINT.
       A bot room carries up to 500 members and the old loop built every row before the
       list could paint — the "one late paint" he flagged. Now the first 24 rows build
       synchronously (a phone viewport shows ~12), a short skeleton tail stands in for
       the rest, and requestAnimationFrame swaps 24 real rows in per frame until done.
       ⚠ 24 IS A MEASURED NUMBER, NOT A GUESS: building a row costs 0.049 ms and laying
       one out ~0.03 ms on desktop Chromium (500-row run, 2026-08-31); at a ×8 phone
       margin a 24-row batch is ~16 ms — inside one 60 Hz frame. Damir's brief said
       "~20 per frame — measure, then pick"; the measurement says 24 fits.
       A re-render (search keystroke, kick) bumps fillToken and orphans the in-flight
       fill; a detached list (panel rebuilt underneath) stops it via isConnected. */
    const FILL_FIRST = 24, FILL_BATCH = 24;
    let fillToken = 0;

    function renderMembers() {
      fillToken++;                       // orphan any in-flight fill
      const token = fillToken;
      listEl.replaceChildren();
      /* ★ A8 (Damir's override of #264-no-skeletons): while the roster pushes land
         (ixian:loadContacts → addContact × N, one EvaluateJavaScriptAsync each) the
         section shows skeleton rows, not an empty list or a "no members" lie.
         aria-busy tells AT the region is loading; the rows are aria-hidden.
         ★ Session H: count-aware — setGroupInfo lands before the roster burst, so the
         skeleton can be honest about scale (up to 8 rows, never more than the count). */
      if (loading && !members.length) {
        listEl.setAttribute('aria-busy', 'true');
        const n = Math.max(3, Math.min(count || 3, 8));
        for (let i = 0; i < n; i++) listEl.append(skeletonRow((58 + (i % 3) * 14) + '%'));
        return;
      }
      listEl.removeAttribute('aria-busy');
      const matches = (query
        ? members.filter((m) =>
            (m.name || '').toLowerCase().includes(query) ||
            (!blind && (m.address || '').toLowerCase().includes(query)))   // M3: nameless members stay findable
        : [...members])
        .sort((a, b) => (a.name || a.address || '').localeCompare(b.name || b.address || ''));
      let fillAt = 0;
      const buildSome = (limit) => {
        const frag = document.createDocumentFragment();
        const end = Math.min(fillAt + limit, matches.length);
        for (; fillAt < end; fillAt++) frag.append(memberRow(matches[fillAt]));
        return frag;
      };
      listEl.append(buildSome(FILL_FIRST));
      if (fillAt < matches.length) {
        listEl.setAttribute('aria-busy', 'true');
        const tail = document.createElement('div');
        tail.className = 'c-chat-info__member-fill';
        tail.setAttribute('aria-hidden', 'true');
        for (let k = 0; k < Math.min(matches.length - fillAt, 6); k++) tail.append(skeletonRow((58 + (k % 3) * 14) + '%'));
        listEl.append(tail);
        const step = () => {
          if (token !== fillToken || !listEl.isConnected) return;   // superseded or panel rebuilt
          listEl.insertBefore(buildSome(FILL_BATCH), tail);
          if (fillAt < matches.length) requestAnimationFrame(step);
          else { tail.remove(); listEl.removeAttribute('aria-busy'); }
        };
        requestAnimationFrame(step);
      }
      if (!matches.length) {
        const none = document.createElement('div');
        none.className = 'c-chat-info__member-note';
        // ★ A1: an EMPTY bot roster is a protocol fact (getUsers only for < 500 users,
        // Ixian-Core frozen) — say what is true, not "no match"
        none.textContent = (!members.length && kind === 'bot')
          ? (strings.membersNotSynced || 'Members are not listed for this room yet.')
          : (strings.noMembers || 'No members match.');
        listEl.append(none);
      }
    }

    function memberRow(m) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'c-chat-info__member';
        // blind group hides identity → suppress the real photo too (matches the
        // hidden address); non-blind rows show the per-sender avatar, gradient-safe.
        /* ★ A1 (Damir, Batch A 2026-08-24 — "check the legacy"): a BOT room lists its
           members the way the legacy channel list did (chat.js addContact: nick + avatar,
           for every member C# pushes) — nickname when present, else the #211 truncated
           address, WITH the photo. The #348 MAJOR-5 masking stays for blind GROUPS, where
           C# itself masks the address ('[Unknown]') and the shell has nothing to show;
           for a bot C# never masks (loadContacts masks `type == Group` only, xaml:658-665),
           so hiding here only hid what every legacy user already saw. The roster itself is
           what the protocol carries: getUsers is fetched at settingsGeneratedTime/userCount
           change and ONLY for userCount < 500 (Ixian-Core CoreStreamProcessor.cs:2685-2703,
           frozen) — a larger public room lists the members seen locally. BE row. */
        const maskRow = blind && kind === 'group';
        row.append(createAvatar({ src: maskRow ? null : m.avatar, name: m.name, address: maskRow ? '' : m.address, size: 40 }));
        const nm = document.createElement('span');
        nm.className = 'c-chat-info__member-name';
        // Loop B-5 (#370): the nameless non-blind fallback follows the #211 canon —
        // the member SHEET already truncates the same address one tap deeper.
        nm.textContent = m.name || (maskRow ? (strings.hiddenMember || 'Hidden member') : truncateAddressMiddle(m.address));
        row.append(nm);
        if (m.owner) {
          // #248 (Damir): the group owner gets an "Owner" chip (owner identity via
          // C# users.getOwner(); never marked in blind groups — no owner push).
          const b = createBadge({ type: 'info', weight: 'tonal', label: strings.owner || 'Owner' });
          b.classList.add('c-chat-info__member-badge');
          row.append(b);
        } else if (m.admin) {
          const b = createBadge({ type: 'info', weight: 'tonal', label: strings.admin || 'Admin' });
          b.classList.add('c-chat-info__member-badge');
          row.append(b);
        }
        row.append(icon('chevron-right', { size: 18 }));
        row.addEventListener('click', () => memberSheetFor(m));
        return row;
    }
    renderMembers();
  }

  /* ——— ★ A4 (Batch A 2026-08-24): groups you are BOTH in (1:1 only) ———
     Data: the shell asks `ixian:sharedGroups` (ContactDetails) → `setSharedGroups`
     (name/address pairs) — the SAME enumeration Core's removeFriend refuses on, so the
     strip is also the honest preview of what the remove-contact sheet will ask.
     null = not answered yet (skeleton line while `loading`), [] = none (one quiet line). */
  if (kind === 'contact' && sharedGroups !== undefined) {
    const { wrap: sec, card: sharedCard } = groupCard({
      label: strings.sharedGroupsTitle || 'Groups you are both in', cls: 'c-chat-info__shared',
    });
    const list = document.createElement('div');
    list.className = 'c-chat-info__shared-list';
    if (sharedGroups === null) {
      list.setAttribute('aria-busy', 'true');
      const sk = document.createElement('div');
      sk.className = 'c-chat-info__member c-chat-info__member--skeleton';
      sk.setAttribute('aria-hidden', 'true');
      const av = document.createElement('span'); av.className = 'c-chat-info__skeleton-avatar';
      const ln = document.createElement('span'); ln.className = 'c-chat-info__skeleton-line'; ln.style.width = '52%';
      sk.append(av, ln);
      list.append(sk);
    } else if (!sharedGroups.length) {
      const none = document.createElement('div');
      none.className = 'c-chat-info__member-note';
      none.textContent = strings.noSharedGroups || 'No shared groups.';
      list.append(none);
    } else {
      for (const g of sharedGroups) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'c-chat-info__member c-chat-info__shared-row';
        row.append(createAvatar({ name: g.name || '', address: g.address || '', size: 40, group: true }));
        const nm = document.createElement('span');
        nm.className = 'c-chat-info__member-name';
        nm.textContent = g.name || truncateAddressMiddle(g.address || '');
        row.append(nm);
        if (onOpenGroup) { row.append(icon('chevron-right', { size: 18 })); row.addEventListener('click', () => onOpenGroup(g)); }
        else row.disabled = true;
        list.append(row);
      }
    }
    sharedCard.append(list);
    body.append(sec);
  }

  /* ——— payments with this contact (1:1 activity, txlist-item reuse) ———
     #142: collapsed accordion — a long tx list must not greet every visit.
     Expanded = the TX_PREVIEW most recent + "View all" (onTxAll → shell nav;
     without it the full list renders inline — the body scrolls anyway). */
  if (kind !== 'group' && txs.length) {
    // the accordion toggle IS this group's title row — no outside label (one line, not two)
    const { wrap: sec, card: txsCard } = groupCard({ cls: 'c-chat-info__txs' });
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'c-chat-info__txs-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.append(rowGlyph('wallet'),
      document.createTextNode((strings.payments || 'Payments') + ' (' + txs.length + ')'));
    const chev = icon('chevron-down', { size: 18 });
    chev.classList.add('c-chat-info__txs-chevron');
    toggle.append(chev);
    const list = document.createElement('div');
    list.className = 'c-chat-info__txs-list';
    list.hidden = true;
    list.id = overlayId('c-chat-info-txs');
    toggle.setAttribute('aria-controls', list.id);
    let built = false;
    toggle.addEventListener('click', () => {
      const open = list.hidden;
      if (open && !built) {                    // lazy — same reveal grammar as the QR
        for (const tx of txs.slice(0, TX_PREVIEW)) {
          list.append(createTxItem({ ...tx, onClick: onTx ? () => onTx(tx) : tx.onClick, strings }));
        }
        if (txs.length > TX_PREVIEW) {
          if (onTxAll) {
            const all = document.createElement('button');
            all.type = 'button';
            all.className = 'c-chat-info__txs-all';
            all.textContent = (strings.viewAllPayments || 'View all {n} payments')
              .split('{n}').join(String(txs.length));
            all.addEventListener('click', () => onTxAll());
            list.append(all);
          } else {
            for (const tx of txs.slice(TX_PREVIEW)) {
              list.append(createTxItem({ ...tx, onClick: onTx ? () => onTx(tx) : tx.onClick, strings }));
            }
          }
        }
        built = true;
      }
      list.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });
    txsCard.append(toggle, list);
    body.append(sec);
  }

  /* ——— destructive zone — every action behind a LOCKED confirm (#135-C1) ——— */
  /* ★ Session Y (#875 P2/P4): ONE inset-grouped card holds the destructive rows (the
     #142 "separated cards" answer to mistaps is now the row height + the confirm each
     row still opens — Telegram/Signal/iOS all group them). `danger` stays the SECTION
     handle (the wrapper); the rows go into its card. */
  const { wrap: danger, card: dangerCard } = groupCard({ cls: 'c-chat-info__danger' });
  /* ★★ #618 (Damir, device 2026-08-28): ONE ROW GRAMMAR ON THIS SCREEN.
   *
   * His words: "delete history and remove contact have completely different style to
   * the other rows … it has to be same as our account." He was describing a real
   * inconsistency, not a preference: these two were `c-chat-info__danger-row`, a
   * bespoke shape with a transparent ground, its own border, no chevron and its own
   * colour rules — while everything below them (address, notifications) is
   * `c-chat-info__row`: a disc, a label, and a chevron or a toggle, on a card.
   * Two grammars on one screen, and the eye reads the odd ones as unfinished.
   *
   * So they became ordinary rows, then exactly like the Account hub's
   * (`createSettingsDanger`: disc + label + chevron on a group card).
   *
   * ⚠ THIS REVERSED #148 (Damir, 2026-08-12 — "delete chat history doesn't need to be
   * so loud"), and it did not throw that reasoning away, it MOVED it. The two-tier
   * idea was right; carrying it in the row's own paint is what made the rows foreign.
   * The tier lived in the DISC hue (neutral for the reversible one, error for the
   * irreversible one) and in the locked confirm dialog that both still open.
   *
   * ★ Session Y (#875): #618's "same as our account" is AMENDED to one grammar per
   * screen FAMILY — the hub keeps its discs, this screen has none. The rows are still
   * ordinary rows of THIS screen (glyph + label + chevron, in a grouped card); what
   * changed is the whole screen's row grammar, not these two rows' place in it. */
  /* ★ Session Y (#875 P4): the #148 two-tier meaning moves AGAIN — from the disc hue to
     a ROLE on the row. `data-tone="error"` = --text-error label + --icon-error glyph, NO
     fill (red is a text colour on this screen, never a surface — "Red in UI design");
     `data-tone="quiet"` = the neutral row every other row is. No disc, no gradient. */
  const dangerRow = (label, glyph, buildOpts, { tone = 'error' } = {}) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-chat-info__row c-chat-info__row--action';
    b.dataset.tone = tone;
    const lab = document.createElement('span');
    lab.className = 'c-chat-info__row-label';
    lab.append(rowGlyph(glyph), document.createTextNode(label));
    b.append(lab, icon('chevron-right', { size: 18 }));
    // built at CLICK time (audit m7): the remove-contact title must carry the
    // nickname as it is NOW, not as it was when the panel mounted
    b.addEventListener('click', () => {
      const o = buildOpts();
      /* ★★ §4: a descriptor may OWN its confirmation. The remove flow opens the shared
       * remove sheet, and that sheet IS the question — a generic confirm in front of it
       * asks the same thing twice and hides the answer behind it. `run` is called with
       * no controller because nothing here is waiting on it: the sheet has its own. */
      if (o && o.own) { o.run(); return; }
      confirmAction(o);
    });
    dangerCard.append(b);
  };
  // delete-history: chat AND contact-details pages both offer it (Damir 2026-07-08,
  // revises #142 — contact-details keeps delete-history while gaining Message + title)
  if (kind !== 'group' && onDeleteHistory) {
    dangerRow(strings.deleteHistory || 'Delete chat history', 'trash', () => ({
      title: strings.deleteHistoryTitle || 'Delete chat history?',
      bodyText: strings.deleteHistoryBody || 'Messages are removed from this device. The contact keeps their copy.',
      confirmLabel: strings.deleteConfirm || 'Delete',
      run: (ctrl) => onDeleteHistory(ctrl),
    }), { tone: 'quiet' });
  }
  if (kind !== 'group' && onRemoveContact) {
    dangerRow(strings.removeContact || 'Remove contact', 'circle-x', () => ({
      own: removeContactOwnsConfirm,          // ★ §4
      title: strings.removeContactTitle || 'Remove ' + (nickname || name || 'contact') + '?',
      bodyText: strings.removeContactBody || 'Removes the contact and your chat. Adding them again needs a new contact request.',
      confirmLabel: strings.removeConfirm || 'Remove',
      run: (ctrl) => onRemoveContact(ctrl),
    }));
  }
  /* ★ A2 (Batch A): Leave for GROUPS and BOTS — the #248 comment "bots have no
     in-chat leave verb" was wrong at source: SingleChatPage's `ixian:leave` handles
     a bot (pendingDeletion + sendLeave, xaml:383-387), exactly as ContactDetails does.
     The shells already emit it; only this render gate withheld the row. */
  if ((kind === 'group' || kind === 'bot') && onLeave) {
    dangerRow(strings.leaveGroup || 'Leave group', 'arrow-back-up', () => ({
      title: strings.leaveTitle || 'Leave this group?',
      bodyText: strings.leaveBody || 'You’ll stop receiving messages. Rejoining needs a new invite.',
      confirmLabel: strings.leaveConfirm || 'Leave',
      run: (ctrl) => onLeave(ctrl),
    }));
  }
  /* ★★ #873 (Damir, 2026-09-17): PLACEMENT BY KIND — a rule that depends on what sits
     BELOW the group.
     · GROUP / BOT: the destructive rows (Leave group · Delete history) stay ABOVE THE
       ROSTER — right under the identity block (after the action row when the surface
       has one, else straight after the hero). The A3 reason (Batch A 2026-08-24) holds:
       the roster is UNBOUNDED (#726 batches it), and a Leave at the foot of hundreds of
       rows is out of reach.
     · 1:1: the group goes LAST (#875 P4) — the messenger canon (Telegram
       `itemDestructiveColor` bottom block, Signal Block/Report after a divider, iOS red
       row at the end), and nothing unbounded sits under it on a contact surface. */
  if (dangerCard.childElementCount) {
    if (roomKind) {
      const moneyRow = body.querySelector('.c-chat-info__money');
      (moneyRow || hero).insertAdjacentElement('afterend', danger);
    } else {
      body.append(danger);
    }
  }

  /* shared destructive-confirm machinery: alertdialog, Cancel autofocused
     (APG safe action, #136⑤ precedent), confirm latched + loading, dismissal
     LOCKED while the bridge round-trips (#138 live-opts fix makes this real) */
  function confirmAction({ title, bodyText, confirmLabel, run, onDone }) {
    let inFlight = false;
    const err = document.createElement('p');
    err.className = 'c-chat-info__confirm-error';
    err.setAttribute('role', 'alert');
    err.hidden = true;
    const modal = createModal({
      title,
      body: bodyText,
      content: err,
      role: 'alertdialog',
      host: host || el.closest('.demo-phone') || undefined,   // audit m6
      actions: [
        { label: strings.cancel || 'Cancel', type: 'text', autofocus: true,
          onClick: () => (inFlight ? false : undefined) },   // Cancel dead in flight
        {
          label: confirmLabel, type: 'fill', intent: 'destructive',
          onClick: () => {
            if (inFlight) return false;
            inFlight = true;
            err.hidden = true;
            const btns = modal.querySelectorAll('.c-modal__actions .c-button');
            const confirmBtn = btns[btns.length - 1];
            setLoading(confirmBtn, true);
            setOverlayOpts(modal, { escDismiss: false, lightDismiss: false });
            const fail = (msg) => {
              inFlight = false;
              setLoading(confirmBtn, false);
              setOverlayOpts(modal, { escDismiss: true });
              err.textContent = msg || strings.actionFailed || 'Something went wrong. Try again.';
              err.hidden = false;
              confirmBtn.focus();                        // audit m5: never drop focus
            };
            // audit m4: a synchronous throw in the shell callback would wedge
            // a fully-locked modal (Esc/scrim/Cancel all dead) — route it to fail
            try {
              run(ctrlFor(
                () => { dismissOverlay(modal); if (onDone) onDone(); },
                fail,
              ));
            } catch (ex) {
              fail();
            }
            return false;                                // modal closes on ctrl.done only
          },
        },
      ],
      strings,
    });
    openModal(modal);
    return modal;
  }

  return el;
}

/** A4 (#302) — live presence toggle on the chat-info hero. #44 free-fn grammar
 *  (twin of setTopbarSub).
 *
 *  This exists because a rebuild CANNOT carry presence. contact_details.html
 *  coalesces every push through stateSig()/buildIfChanged (:299-325), which no-ops
 *  on an unchanged signature — so a contact going offline would leave the green dot
 *  lit until some unrelated field (a name, a new transaction) happened to change.
 *  A targeted toggle is both correct and cheaper than rebuilding a panel at the
 *  presence cadence (~0.5 Hz while the surface is visible: Node.updateUILoop
 *  Task.Delay(2000) → HomePage.OnUpdateUI, foreground-only :2211).
 *
 *  Presence is 1:1 only — see the note at the hero. */
export function setChatInfoPresence(el, online) {
  if (!el) return;
  const avatar = el.querySelector('.c-chat-info__hero .c-avatar');
  if (!avatar) return;
  const has = avatar.querySelector('.c-avatar__dot');
  if (online && !has) {
    const dot = document.createElement('span');
    dot.className = 'c-avatar__dot';
    avatar.append(dot);
  } else if (!online && has) {
    has.remove();
  }
}
