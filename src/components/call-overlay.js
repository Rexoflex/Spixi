/**
 * c-callin — incoming voice call (★ #1074 premium, Damir's pick A/C/E): the caller's
 * colour behind them (photo blurred, or the identity hue), "🔒 End-to-end encrypted",
 * a large avatar with a ring pulse, then Decline / Accept. Above them two quiet
 * actions, each rendered only when its verb is wired on THIS platform:
 *   Silence — stop the LOCAL ring (the caller keeps ringing; the ring timeout stands)
 *   Message — decline with a short chat message (3 presets + write your own)
 * Rides the overlay stack at the call layer (z-60). Desktop: a centered card (CSS).
 *
 * showIncomingCall({ host, caller: { name, address, avatar }, sub,
 *                    onAccept, onDecline, onIgnore, ignore,
 *                    onSilence, onDeclineMessage, strings }) → el
 *   onDeclineMessage(text) — omitted → no "Message" button (no dead controls).
 *   onSilence()            — omitted → no "Silence" button.
 *   ignore: false — production (Batch A, Damir): no Ignore action and no Esc/scrim
 *     dismiss — no local-dismiss verb exists, C# keeps ringing. Default true (demos).
 * updateIncomingCall(el, { silenced }) — C#'s echo: Silence turns into a disabled
 *   "Silenced" (the ring really stopped).
 * hideIncomingCall(el) — bridge hook (peer hung up before an answer); also closes
 *   an open decline-message sheet.
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createAvatar, truncateAddressMiddle } from './avatar.js';
import { openOverlay, dismissOverlay, setOverlayOpts, isOverlayOpen } from './overlay.js';
import { createSheet } from './sheet.js';
import { createCallBackdrop, createE2eChip } from './call-screen.js';

const sheets = new WeakMap();   // ring el → its open decline-message sheet

export function showIncomingCall({
  host,
  caller = {},
  sub = '',
  onAccept,
  onDecline,
  onIgnore,
  ignore = true,
  onSilence,
  onDeclineMessage,
  strings = getStrings(),
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-callin';
  el.setAttribute('role', 'alertdialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label',
    (strings.incomingCall || 'Incoming voice call')
    + ((caller.name || caller.address) ? ', ' + (caller.name || truncateAddressMiddle(caller.address)) : ''));
  el.tabIndex = -1;

  const card = document.createElement('div');
  card.className = 'c-callin__card';
  card.append(createCallBackdrop({ avatar: caller.avatar, name: caller.name, address: caller.address }));

  const top = document.createElement('div');
  top.className = 'c-callin__top';
  top.append(createE2eChip(strings));
  card.append(top);

  const id = document.createElement('div');
  id.className = 'c-callin__identity';
  const avatarWrap = document.createElement('span');
  avatarWrap.className = 'c-callin__avatar'; // pulse rings live here
  avatarWrap.append(createAvatar({
    src: caller.avatar, name: caller.name, address: caller.address, size: 112,
  }));
  const name = document.createElement('span');
  name.className = 'c-callin__name';
  name.textContent = caller.name || truncateAddressMiddle(caller.address || '');
  const subEl = document.createElement('span');
  subEl.className = 'c-callin__sub';
  subEl.textContent = sub || strings.incomingCall || 'Incoming voice call';
  id.append(avatarWrap, name, subEl);
  card.append(id);

  let acted = false; // one outcome per ring — every outcome latches
  const act = (fn) => () => {
    if (acted) return;
    acted = true;
    closeDeclineSheet(el);
    dismissOverlay(el);
    if (fn) fn();
  };

  // quiet row: Silence · Message (each only when wired)
  const quick = document.createElement('div');
  quick.className = 'c-callin__quick';
  if (typeof onSilence === 'function') {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'c-callin__pill';
    s.dataset.kind = 'silence';
    s.append(icon('bell-off', { size: 18 }));
    const t = document.createElement('span');
    t.textContent = strings.callSilence || 'Silence';
    s.append(t);
    s.addEventListener('click', () => {
      if (acted || s.disabled) return;
      // #46 r1 NIT-11: move focus to Accept BEFORE disabling — a disabled focused
      // button drops focus to <body>, outside the alertdialog.
      const acc = el.querySelector('.c-callin__circle[data-kind="accept"]');
      if (acc && document.activeElement === s) acc.focus({ preventScroll: true });
      s.disabled = true;           // one tap; C#'s echo (updateIncomingCall) keeps it that way
      onSilence();
    });
    quick.append(s);
  }
  if (typeof onDeclineMessage === 'function') {
    const m = document.createElement('button');
    m.type = 'button';
    m.className = 'c-callin__pill';
    m.dataset.kind = 'message';
    m.setAttribute('aria-haspopup', 'dialog');
    m.append(icon('message', { size: 18 }));
    const t = document.createElement('span');
    t.textContent = strings.callMessage || 'Message';
    m.append(t);
    m.addEventListener('click', () => {
      if (acted) return;
      openDeclineSheet(el, {
        host,
        name: caller.name || truncateAddressMiddle(caller.address || ''),
        strings,
        onSend: (text) => {
          if (acted) return;
          acted = true;
          closeDeclineSheet(el);
          dismissOverlay(el);
          onDeclineMessage(text);
        },
      });
    });
    quick.append(m);
  }
  if (quick.childElementCount) card.append(quick);

  const actions = document.createElement('div');
  actions.className = 'c-callin__actions';
  const action = (kind, glyph, label, fn) => {
    const wrap = document.createElement('span');
    wrap.className = 'c-callin__action';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-callin__circle';
    b.dataset.kind = kind;
    b.setAttribute('aria-label', label);
    b.append(icon(glyph, { size: 30 }));
    b.addEventListener('click', act(fn));
    const l = document.createElement('span');
    l.className = 'c-callin__label';
    l.setAttribute('aria-hidden', 'true');
    l.textContent = label;
    wrap.append(b, l);
    actions.append(wrap);
  };
  action('decline', 'phone-end', strings.decline || 'Decline', onDecline);
  if (ignore) action('ignore', 'bell-off', strings.ignore || 'Ignore', onIgnore);
  action('accept', 'phone', strings.accept || 'Accept', onAccept);
  // freeze audit: overlay autofocus took the FIRST focusable = Decline — a
  // reflexive Enter while ringing killed the call. APG: focus the safe action.
  actions.querySelector('[data-kind="accept"]').dataset.autofocus = '';
  card.append(actions);
  el.append(card);
  // a tap on the ring while the decline sheet is up = cancel the sheet (it is the dim).
  // #46 r1 NIT-12/MINOR-8: capture on the WHOLE ring (the desktop dim around the card
  // too), and only while the sheet is really open — not during its exit fade.
  el.addEventListener('click', (e) => {
    const sh = sheets.get(el);
    if (!sh || !isOverlayOpen(sh)) return;
    e.preventDefault();
    e.stopPropagation();
    closeDeclineSheet(el);
  }, true);

  // Esc / scrim = the QUIETEST outcome (ignore) — never auto-declines. With
  // ignore:false there is no quiet outcome, so Esc/scrim dismiss is disabled.
  // data-silent (freeze audit): a REMOTE hang-up must not report onIgnore.
  setOverlayOpts(el, { host, lightDismiss: ignore, escDismiss: ignore, onDismiss: () => {
    if (!acted && el.dataset.silent === undefined) {
      acted = true;
      if (onIgnore) onIgnore();
    }
  } });
  openOverlay(el);
  return el;
}

/** C#'s echo of the local controls on the ring. */
export function updateIncomingCall(el, { silenced = false, strings = getStrings() } = {}) {
  if (!el) return;
  const s = el.querySelector('.c-callin__pill[data-kind="silence"]');
  if (!s) return;
  if (silenced) {
    s.disabled = true;
    s.dataset.done = '';
    s.replaceChildren(icon('bell-off', { size: 18 }));
    const t = document.createElement('span');
    t.textContent = strings.callSilenced || 'Silenced';
    s.append(t);
  }
}

/** Bridge hook: caller hung up before an answer — drop the overlay SILENTLY
 *  (no onIgnore; see data-silent above), and any decline-message sheet with it. */
export function hideIncomingCall(el) {
  closeDeclineSheet(el);
  el.dataset.silent = '';
  dismissOverlay(el);
}

/* ——— decline with a message ——————————————————————————————————————————————————
 * Three presets + write your own. The text goes to C# as the decline verb's payload
 * and is sent as ONE normal chat message (the composer's path) — the sheet says so.
 * Max length mirrors VoIPManager.DECLINE_MESSAGE_MAX. */
export const DECLINE_MESSAGE_MAX = 500;

function closeDeclineSheet(ringEl) {
  const sh = sheets.get(ringEl);
  if (!sh) return;
  sheets.delete(ringEl);
  delete ringEl.dataset.sheet;
  dismissOverlay(sh);
}

export function declinePresets(strings = getStrings()) {
  return [
    strings.declineMsgPreset1 || 'Can’t talk now. I’ll call you back.',
    strings.declineMsgPreset2 || 'I’m in a meeting.',
    strings.declineMsgPreset3 || 'Please text me.',
  ];
}

function openDeclineSheet(ringEl, { host, name, strings, onSend }) {
  const prev = sheets.get(ringEl);
  if (prev && isOverlayOpen(prev)) return;   // #46 r1 MINOR-8: a closing sheet does not block a re-open
  if (prev) sheets.delete(ringEl);
  const content = document.createElement('div');
  content.className = 'c-declinemsg';

  const sub = document.createElement('p');
  sub.className = 'c-declinemsg__sub';
  // split/join, not String.replace: a nick holding "$&" must not expand (#288 lesson)
  sub.textContent = (strings.declineMsgSub || '{name} gets it as a normal chat message.').split('{name}').join(name);
  content.append(sub);

  const list = document.createElement('div');
  list.className = 'c-declinemsg__list';
  let sent = false;
  const send = (text) => {
    const v = String(text || '').trim();
    if (sent || !v || v.length > DECLINE_MESSAGE_MAX) return;
    sent = true;
    onSend(v);
  };
  declinePresets(strings).forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'c-declinemsg__opt';
    b.append(icon('message', { size: 20 }));
    const t = document.createElement('span');
    t.textContent = p;
    b.append(t);
    b.addEventListener('click', () => send(p));
    list.append(b);
  });

  // write your own: a row that turns into a field + Send
  const write = document.createElement('button');
  write.type = 'button';
  write.className = 'c-declinemsg__opt c-declinemsg__write';
  write.append(icon('pencil', { size: 20 }));
  const wt = document.createElement('span');
  wt.textContent = strings.declineMsgWrite || 'Write a message…';
  write.append(wt);
  list.append(write);
  content.append(list);

  const form = document.createElement('form');
  form.className = 'c-declinemsg__form';
  form.hidden = true;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'c-declinemsg__input';
  input.maxLength = DECLINE_MESSAGE_MAX;
  input.setAttribute('aria-label', strings.declineMsgWrite || 'Write a message…');
  input.placeholder = strings.declineMsgWrite || 'Write a message…';
  input.autocomplete = 'off';
  const go = document.createElement('button');
  go.type = 'submit';
  go.className = 'c-declinemsg__send';
  go.setAttribute('aria-label', strings.declineMsgSend || 'Send and decline');
  go.append(icon('send-2', { size: 20 }));
  form.append(input, go);
  form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
  content.append(form);
  write.addEventListener('click', () => {
    write.hidden = true;
    form.hidden = false;
    input.focus();
  });

  const sh = createSheet({
    title: strings.declineMsgTitle || 'Decline with a message',
    content,
    host,
    onDismiss: () => {
      // #46 r2 MINOR-5: only the CURRENT sheet clears the ring's dim — an older sheet that
      // finishes fading after a re-open must not undim the ring under the new one
      if (sheets.get(ringEl) === sh) {
        sheets.delete(ringEl);
        delete ringEl.dataset.sheet;
      }
    },
    strings,
  });
  sh.classList.add('c-declinemsg-sheet');
  sheets.set(ringEl, sh);
  /* The ring sits at the call layer (z-60), ABOVE the overlay scrim (z-40), so the sheet
   * rides above the ring (call-overlay.css) and the ring dims ITSELF ([data-sheet]); a tap
   * on the dimmed ring closes the sheet — the scrim under the ring cannot be reached. */
  ringEl.dataset.sheet = '';
  openOverlay(sh);
}
