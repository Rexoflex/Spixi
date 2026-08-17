/**
 * c-chat-info — chat info takeover (docs/chat-info-spec.md, DECISIONS #141).
 * ONE surface for 1:1 / group / bot (Damir: send-screen grammar — tap the chat
 * header, full in-phone takeover); sections render by kind + capabilities:
 *
 *   hero (CENTERED: avatar-80, name, 1:1 nickname edit → ixian:userdefinednick)
 *   action row (1:1/bot; contact context leads with Message) — wallet-banner
 *     quick actions: tonal circle + label, one centered row (Damir 2026-08-12,
 *     supersedes the #144 two-row button block). Sits DIRECTLY under the
 *     identity: identity → what you can do → details you rarely need.
 *   address card (not for blind groups) — FULL address, HONEST copy morph
 *     (#137: ✓ only after the clipboard write resolves), "Show QR" reveal →
 *     qr.js `address:ixi` on the --surface-qr card
 *     (money is 1:1/bot only — group request semantics are a §9 ask, #139;
 *     Pay/Request stay SHELL duties: onPay/onRequest open the native flows)
 *   notifications toggle — rendered when capabilities.notifications; the
 *     bridge only supports groups/bots today (ixian:en/disableNotifications);
 *     1:1 ships gated off until the §9 command lands (Damir: design now, flag)
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
 *     contact (ixian:remove) · group: leave (ixian:leave). Rows are separated,
 *     bordered cards (#142: flush rows invited mistaps). EVERY destructive
 *     confirm follows the #135-C1 lock: dismissal disabled while in flight
 *     (live via setOverlayOpts — the #138 overlay fix), confirm latched.
 *
 * context: 'chat' (default) | 'contact' — ONE component, two surfaces (#142).
 *   'contact' = the contact page (from the contacts list / member sheet):
 *   title "Contact info", a Message action (onMessage) leads, delete-history
 *   and disappearing-messages stay chat-side.
 *   ROOMS (kind 'group'/'bot') are context-free on this point (W9-②): they show a
 *   LONE Message action whenever the caller supplies onMessage, and nothing at all
 *   when it does not. That is the whole switch between "reached from the directory"
 *   (needs a way in — the history may be deleted) and "opened on top of the
 *   conversation you are already in" (chat.html passes no onMessage).
 *
 * Async callbacks use the house (payload, ctrl) contract — ctrl.done()/fail(msg)
 * from the bridge; each ctrl is one-shot per attempt (#138 m1).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { discGrad } from './disc.js';
import { createAvatar } from './avatar.js';
import { createButton, setLoading } from './button.js';
import { createTopbar } from './topbar.js';
import { createBadge } from './badge.js';
import { createSearchField } from './search-field.js';
import { createTxItem } from './txlist-item.js';
import { createQrSvg } from './qr.js';
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

/* tinted icon disc (#148 — the settings-family atom from base.css; Damir:
   chat-info/contact follows the same treatment for consistency).
   `grad:false` keeps the disc on its HUE default — needed for the quiet
   destructive tier, where the per-glyph gradient (data-grad wins over
   data-hue in base.css) would repaint a deliberately grey disc vivid. */
function infoDisc(glyph, hue, { grad = true } = {}) {
  const d = document.createElement('span');
  d.className = 'c-disc';
  d.dataset.hue = hue;
  if (grad) d.dataset.grad = String(discGrad(glyph));
  d.append(icon(glyph, { size: 16 }));
  return d;
}

/* Quick action — the WALLET-BANNER grammar (c-wallet-hero__qa: tinted circle +
   label underneath), ported to the card/screen surface as a TONAL circle.
   Damir 2026-08-12: the full-width Message + the two 44px outline buttons read
   "rough" and ate a third of the screen; three small quick actions sit directly
   under the identity, exactly like the wallet banner (and WhatsApp/Discord).
   The whole control is the target (48px circle + label ≈ 74px tall ≥ 44). */
function infoQuickAction({ glyph, label, onClick }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'c-chat-info__qa';
  const circle = document.createElement('span');
  circle.className = 'c-chat-info__qa-circle';
  circle.append(icon(glyph, { size: 22 }));
  const lab = document.createElement('span');
  lab.className = 'c-chat-info__qa-label';
  lab.textContent = label;
  b.append(circle, lab);
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

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
  notifications = true,
  media = [],                    // [{ id, thumb, kind }] — flagged section
  txs = [],                      // txlist-item opts (1:1 activity), newest first
  selfDestruct = 0,              // current disappearing-messages window (seconds; 0 = off)
  capabilities = {},             // { notifications, media, admin, presence, selfDestruct }
  host,                          // overlay host (sheets/modals); shell passes it
  onBack,
  onNickname,                    // (nick, ctrl)
  onMessage,                     // contact context: open the 1:1 chat (shell nav)
  onPay, onRequest,              // shell: #139 takeover / request sheet
  onNotifications,               // (next, ctrl) — optimistic, revert on fail
  onSelfDestruct,                // (seconds, ctrl) — committed per option pick
  onMediaOpen, onMediaAll,
  onMemberAction,                // ('kick'|'ban', member, ctrl)
  onContactRequest,              // member sheet passthrough
  onViewContact,                 // member sheet passthrough (relation 'contact' → contact page)
  onDeleteHistory, onRemoveContact, onLeave,   // (ctrl)
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
    sub.textContent = `${memberCount || members.length} ${strings.members || 'members'}`;
  } else if (nickname && nickname !== name) {
    sub.textContent = name;       // override active → the wire name stays visible
  }
  // ALWAYS in the DOM (e2e catch: a nickname set LATER writes to sub — an
  // unappended node made the wire name silently vanish); hidden when empty
  sub.hidden = !sub.textContent;
  idCol.append(sub);
  hero.append(idCol);
  body.append(hero);

  /* 1:1 nickname edit (ixian:userdefinednick — local override, not pushed) */
  if (kind !== 'group' && onNickname) {
    const pencil = createButton({
      type: 'text', size: 44, icon: icon('pencil', { size: 18 }),
      onClick: startNickEdit,
    });
    pencil.classList.add('c-chat-info__nick-edit');
    pencil.setAttribute('aria-label', strings.editNickname || 'Edit nickname');
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
  const roomKind = kind === 'group' || kind === 'bot';
  const roomMessageOnly = roomKind && !!onMessage;
  if ((!roomKind || roomMessageOnly) && (onMessage || onPay || onRequest)) {
    const money = document.createElement('div');
    money.className = 'c-chat-info__money';
    if ((context === 'contact' || roomMessageOnly) && onMessage) {
      const msg = infoQuickAction({
        glyph: 'messages', label: strings.message || 'Message', onClick: () => onMessage(),
      });
      msg.classList.add('c-chat-info__message');
      money.append(msg);
    }
    if (onPay && !roomMessageOnly) money.append(infoQuickAction({
      glyph: 'arrow-up-right', label: strings.pay || 'Pay', onClick: () => onPay(),
    }));
    if (onRequest && !roomMessageOnly) money.append(infoQuickAction({
      glyph: 'arrow-down-left', label: strings.request || 'Request', onClick: () => onRequest(),
    }));
    // a lone action (room-from-directory) hugs its label instead of stretching
    // across the screen — a full-width circle+label reads broken
    money.dataset.count = String(money.childElementCount);
    // …and an EMPTY row is never appended: a 1:1 surface entered from a chat
    // header passes onMessage but suppresses it (context 'chat'), which used to
    // leave a bare padded div under the identity (bot case, #249).
    if (money.childElementCount) body.append(money);
  }

  /* ——— address card ———
     Groups have NO payable/shareable address at all (Damir F5 2026-07-29): a group's
     identifier is a local session id, not a wallet address, so showing it — and worse,
     rendering it as a scannable QR that resolves to nothing — is wrong for EVERY group,
     not just blind ones. Suppress the whole card for groups; 1:1 and bot surfaces keep
     it. (`blind` stays in the condition for bots/1:1 that opt into identity hiding.) */
  if (address && kind !== 'group' && !blind) {
    const card = document.createElement('div');
    card.className = 'c-chat-info__address';
    card.append(sectionLabel(strings.address || 'Address'));
    const row = document.createElement('div');
    row.className = 'c-chat-info__address-row';
    const value = document.createElement('span');
    value.className = 'c-chat-info__address-value u-tabular';
    value.textContent = address;                      // FULL — the address is the truth (#99)
    const copy = document.createElement('button');    // plain 32px icon button — member-sheet parity (Damir: 44px text button sat misaligned)
    copy.type = 'button';
    copy.className = 'c-chat-info__copy';
    copy.append(icon('copy', { size: 18 }));
    copy.setAttribute('aria-label', strings.copyAddress || 'Copy address');
    let morphTimer = null;
    const morph = (glyph, announce) => {              // HONEST morph (#137 m1)
      copy.replaceChildren(icon(glyph, { size: 18 }));
      live.textContent = announce;
      clearTimeout(morphTimer);
      morphTimer = setTimeout(() => copy.replaceChildren(icon('copy', { size: 18 })), 1600);
    };
    copy.addEventListener('click', () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address).then(
          () => morph('check', strings.copied || 'Copied'),
          () => morph('x', strings.copyFailed || 'Couldn’t copy. Select the address text instead'),
        );
      } else {
        morph('x', strings.copyFailed || 'Couldn’t copy. Select the address text instead');
      }
    });
    row.append(value, copy);
    card.append(row);

    /* Show QR reveal — same pair as the receive card (`address:ixi`, --on-qr ink) */
    const qrRow = document.createElement('button');
    qrRow.type = 'button';
    qrRow.className = 'c-chat-info__qr-toggle';
    qrRow.setAttribute('aria-expanded', 'false');
    qrRow.append(icon('qrcode', { size: 20 }), document.createTextNode(strings.showQr || 'Show QR'));
    const chev = icon('chevron-down', { size: 18 });
    chev.classList.add('c-chat-info__qr-chevron');
    qrRow.append(chev);
    const qrBox = document.createElement('div');
    qrBox.className = 'c-chat-info__qr';
    qrBox.hidden = true;
    qrBox.id = overlayId('c-chat-info-qr');   // house id mint (audit n9)
    qrRow.setAttribute('aria-controls', qrBox.id);
    let qrBuilt = false;
    qrRow.addEventListener('click', () => {
      const open = qrBox.hidden;
      if (open && !qrBuilt) {                          // lazy: most visits never open it
        qrBox.append(createQrSvg(address + ':ixi', { label: strings.qrLabel || 'Wallet address QR code' }));
        qrBuilt = true;
      }
      qrBox.hidden = !open;
      qrRow.setAttribute('aria-expanded', String(open));
    });
    card.append(qrRow, qrBox);
    body.append(card);
  }

  /* ——— notifications (bridge: groups/bots today; 1:1 gated — §9) ——— */
  if (capabilities.notifications && onNotifications) {
    const row = document.createElement('div');
    row.className = 'c-chat-info__row';
    const lab = document.createElement('span');
    lab.className = 'c-chat-info__row-label';
    lab.append(infoDisc('bell', 'warning'), document.createTextNode(strings.notifications || 'Notifications'));
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'c-chat-info__switch';
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-checked', String(!!notifications));
    toggle.setAttribute('aria-label', strings.notifications || 'Notifications');
    const knob = document.createElement('span');
    knob.className = 'c-chat-info__switch-knob';
    toggle.append(knob);
    let inFlight = false;
    toggle.addEventListener('click', () => {
      if (inFlight) return;                            // no queued double-toggles
      inFlight = true;
      const next = toggle.getAttribute('aria-checked') !== 'true';
      toggle.setAttribute('aria-checked', String(next));   // optimistic (spec)
      onNotifications(next, ctrlFor(
        () => { inFlight = false; },
        () => {                                        // revert on fail
          toggle.setAttribute('aria-checked', String(!next));
          live.textContent = strings.notifFailed || 'Couldn’t update notifications.';
          inFlight = false;
        },
      ));
    });
    row.append(lab, toggle);
    // #150④: same wrapper structure as the sd row — the bare row WAS the card,
    // so its border-box min-height swallowed the card padding and it rendered
    // shorter than the (wrapped) disappearing-messages row (Damir screenshot)
    const notifSection = document.createElement('div');
    notifSection.className = 'c-chat-info__setting-section';
    notifSection.append(row);
    body.append(notifSection);
  }

  /* ——— disappearing messages (#142 — chat-side policy, so chat context only;
     capabilities.selfDestruct gates it: NO legacy command, §9 ask) ——— */
  if (context === 'chat' && capabilities.selfDestruct && onSelfDestruct) {
    const sdRow = document.createElement('button');
    sdRow.type = 'button';
    sdRow.className = 'c-chat-info__row c-chat-info__setting';
    const sdLab = document.createElement('span');
    sdLab.className = 'c-chat-info__row-label';
    sdLab.append(infoDisc('hourglass-empty', 'accent'),
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
    const sdSection = document.createElement('div');
    sdSection.className = 'c-chat-info__setting-section';
    sdSection.append(sdRow);
    body.append(sdSection);
  }

  /* ——— shared media (capabilities.media — NO legacy command, §9; demo-fed) ——— */
  if (capabilities.media && media.length) {
    const sec = document.createElement('div');
    sec.className = 'c-chat-info__media';
    const head = document.createElement('div');
    head.className = 'c-chat-info__media-head';
    head.append(sectionLabel(strings.sharedMedia || 'Shared media'));
    if (onMediaAll) {
      const all = createButton({ label: strings.seeAll || 'See all', type: 'text', size: 32, onClick: () => onMediaAll() });
      head.append(all);
    }
    sec.append(head);
    const strip = document.createElement('div');
    strip.className = 'c-chat-info__media-strip';
    for (const item of media) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'c-chat-info__media-thumb';
      if (item.thumb) {
        const img = document.createElement('img');
        img.src = item.thumb;
        img.alt = '';
        b.append(img);
      } else {
        b.append(icon(item.kind === 'file' ? 'file-isr' : 'photo', { size: 24 }));
      }
      b.setAttribute('aria-label', (strings.openMedia || 'Open') + ' ' + (item.kind || 'media'));
      if (onMediaOpen) b.addEventListener('click', () => onMediaOpen(item));
      strip.append(b);
    }
    sec.append(strip);
    body.append(sec);
  }

  /* ——— members (group + bot) — #136③ caps; row → member sheet; admin: kick/ban.
     Bots list members too — LEGACY PARITY (Damir 2026-07-06d: the legacy channel
     bar's people icon opens exactly this list; screenshots on file). FLAGGED
     component change (desktop-split-spec §6d), not a silent edit; the full bot
     roster feed + paging stays a §9 BE ask — shells feed what the bridge gives. */
  if ((kind === 'group' || kind === 'bot') && members.length) {
    const sec = document.createElement('div');
    sec.className = 'c-chat-info__members';
    let count = memberCount || members.length;
    const countLabel = sectionLabel((strings.membersTitle || 'Members') + ' (' + count + ')');
    sec.append(countLabel);
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
      sec.append(search);
    }
    sec.append(listEl);
    body.append(sec);

    const memberSheetFor = (m) => openMemberSheet({
      host: host || el.closest('.demo-phone') || undefined,   // audit m6: shell passes host
      // #249 loop C-1: owner/admin ride into the sheet so its identity block can
      // badge them consistently with the row list.
      member: { name: m.name, address: m.address, avatar: blind ? null : m.avatar, owner: m.owner, admin: m.admin },
      blind,
      relation: m.relation || 'none',
      // audit M2 family: mark pending IMMEDIATELY — reopening the sheet must
      // not offer a second request while the first is on the wire
      onRequest: onContactRequest ? () => { m.relation = 'pending'; onContactRequest(m); } : undefined,
      // #142: contacts' identity block → the contact page (context: 'contact')
      onViewContact,
      // capabilities.admin → destructive actions, each behind an alertdialog
      // confirm (ixian:kick:ADDR / ixian:ban:ADDR are irreversible for the peer)
      actions: capabilities.admin && onMemberAction && !m.admin && !m.owner ? [   // #248: never kick/ban the owner
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
      sub.textContent = count + ' ' + (strings.members || 'members');   // hero line too
      renderMembers();
    }

    function renderMembers() {
      listEl.replaceChildren();
      const matches = (query
        ? members.filter((m) =>
            (m.name || '').toLowerCase().includes(query) ||
            (!blind && (m.address || '').toLowerCase().includes(query)))   // M3: nameless members stay findable
        : [...members])
        .sort((a, b) => (a.name || a.address || '').localeCompare(b.name || b.address || ''));
      for (const m of matches) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'c-chat-info__member';
        // blind group hides identity → suppress the real photo too (matches the
        // hidden address); non-blind rows show the per-sender avatar, gradient-safe.
        row.append(createAvatar({ src: blind ? null : m.avatar, name: m.name, address: blind ? '' : m.address, size: 40 }));
        const nm = document.createElement('span');
        nm.className = 'c-chat-info__member-name';
        nm.textContent = m.name || (blind ? (strings.hiddenMember || 'Hidden member') : m.address);
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
        listEl.append(row);
      }
      if (!matches.length) {
        const none = document.createElement('div');
        none.className = 'c-chat-info__member-note';
        none.textContent = strings.noMembers || 'No members match.';
        listEl.append(none);
      }
    }
    renderMembers();
  }

  /* ——— payments with this contact (1:1 activity, txlist-item reuse) ———
     #142: collapsed accordion — a long tx list must not greet every visit.
     Expanded = the TX_PREVIEW most recent + "View all" (onTxAll → shell nav;
     without it the full list renders inline — the body scrolls anyway). */
  if (kind !== 'group' && txs.length) {
    const sec = document.createElement('div');
    sec.className = 'c-chat-info__txs';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'c-chat-info__txs-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.append(infoDisc('wallet', 'success'),
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
    sec.append(toggle, list);
    body.append(sec);
  }

  /* ——— destructive zone — every action behind a LOCKED confirm (#135-C1) ——— */
  const danger = document.createElement('div');
  danger.className = 'c-chat-info__danger';
  /* TWO TIERS — the settings-family grammar (createSettingsDanger: a quiet
     "free up space" tier + a red "danger zone" tier). Damir 2026-08-12: delete
     chat history "doesn't need to be so loud" — it clears local messages and is
     recoverable-ish (the contact keeps their copy), so it reads as a neutral row
     with a grey disc. Red stays RESERVED for the irreversible relationship
     actions (remove contact / leave group), which is what makes it mean
     something. Both rows keep the bordered card + the locked confirm. */
  const dangerRow = (label, glyph, buildOpts, { tone = 'error' } = {}) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-chat-info__danger-row';
    b.dataset.tone = tone;
    // #148: error disc = destructive reservation. The quiet tier drops the
    // per-glyph gradient so the neutral hue actually survives (base.css).
    b.append(
      tone === 'quiet' ? infoDisc(glyph, 'neutral', { grad: false }) : infoDisc(glyph, 'error'),
      document.createTextNode(label),
    );
    // built at CLICK time (audit m7): the remove-contact title must carry the
    // nickname as it is NOW, not as it was when the panel mounted
    b.addEventListener('click', () => confirmAction(buildOpts()));
    danger.append(b);
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
      title: strings.removeContactTitle || 'Remove ' + (nickname || name || 'contact') + '?',
      bodyText: strings.removeContactBody || 'Removes the contact and your chat. Adding them again needs a new contact request.',
      confirmLabel: strings.removeConfirm || 'Remove',
      run: (ctrl) => onRemoveContact(ctrl),
    }));
  }
  if (kind === 'group' && onLeave) {
    dangerRow(strings.leaveGroup || 'Leave group', 'arrow-back-up', () => ({
      title: strings.leaveTitle || 'Leave this group?',
      bodyText: strings.leaveBody || 'You’ll stop receiving messages. Rejoining needs a new invite.',
      confirmLabel: strings.leaveConfirm || 'Leave',
      run: (ctrl) => onLeave(ctrl),
    }));
  }
  if (danger.childElementCount) body.append(danger);

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
