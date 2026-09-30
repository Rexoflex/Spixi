/**
 * c-callscreen — the EXPANDED in-call view (★ #1074, Damir's pick B/F). Phone: the full
 * call screen (identity on the caller's colour, the encryption line, round controls, the
 * red End pill). Desktop: the same content as a centered card over a dim — the native
 * stage is full-window in this mode, exactly like the ring.
 * Minimise folds it back into the c-callbar card (the app stays usable around that).
 *
 * showCallScreen({ name, address, avatar, startedAt, caps, audio, onMinimise, onMute,
 *                  onSpeaker, onHangUp, host, strings }) → el     (singleton per host)
 * hideCallScreen(host)
 *
 * The encryption line claims only what is true for every 1:1 call (Damir, 2026-09-30:
 * "just encrypted, not too long"): "End-to-end encrypted". No "peer-to-peer", no
 * "PQ hybrid" — v0 contacts use the older key exchange, and the app has no per-contact
 * fact to show it (BE row, #1074).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createAvatar, identityIndex, safeImageSrc, truncateAddressMiddle } from './avatar.js';
import { callStateLine, callToggle } from './callbar.js';

const screens = new WeakMap(); // host → entry

/** The caller's colour behind the call views: the photo, blurred, or the identity hue. */
export function createCallBackdrop({ avatar = null, name = '', address = '' } = {}) {
  const bd = document.createElement('div');
  bd.className = 'c-callbg c-idhue';
  bd.dataset.hue = String(identityIndex(address || name));
  bd.setAttribute('aria-hidden', 'true');
  const src = safeImageSrc(avatar);
  if (src) {
    const img = document.createElement('img');
    img.className = 'c-callbg__img';
    img.alt = '';
    img.addEventListener('error', () => img.remove(), { once: true });
    img.src = src;
    bd.append(img);
  }
  return bd;
}

/** "🔒 End-to-end encrypted" — the one encryption line, chip form. */
export function createE2eChip(strings = getStrings()) {
  const c = document.createElement('span');
  c.className = 'c-calle2e';
  c.append(icon('lock', { size: 16 }));
  const t = document.createElement('span');
  t.textContent = strings.callE2e || 'End-to-end encrypted';
  c.append(t);
  return c;
}

function labelled(btn, label) {
  const wrap = document.createElement('span');
  wrap.className = 'c-callscreen__ctl';
  const l = document.createElement('span');
  l.className = 'c-callscreen__ctl-label';
  l.setAttribute('aria-hidden', 'true');
  l.textContent = label;
  wrap.append(btn, l);
  return wrap;
}

function apply(entry, strings) {
  const { el, audio } = entry;
  const mute = el.querySelector('.c-callctl[data-kind="mute"]');
  if (mute) {
    // #46 r1 MINOR-6: a toggle keeps ONE accessible name; aria-pressed carries the state.
    mute.setAttribute('aria-pressed', audio.muted ? 'true' : 'false');
    mute.setAttribute('aria-label', strings.callMute || 'Mute');
    mute.replaceChildren(icon(audio.muted ? 'microphone-off' : 'microphone', { size: 26 }));
    const l = mute.parentElement && mute.parentElement.querySelector('.c-callscreen__ctl-label');
    // #46 r2 MINOR-4 (WCAG 2.5.3): the visible caption IS the accessible name — both stay
    // "Mute"; the pressed style and the crossed-out glyph carry the state.
    if (l) l.textContent = strings.callMute || 'Mute';
  }
  const spk = el.querySelector('.c-callctl[data-kind="speaker"]');
  if (spk) spk.setAttribute('aria-pressed', audio.speaker ? 'true' : 'false');
  el.querySelector('.c-callscreen__state').textContent = callStateLine(entry.startedAt, audio.muted, strings);
}

export function showCallScreen({
  name = '', address = '', avatar = null, startedAt = null,
  caps = {}, audio = {}, onMinimise, onMute, onSpeaker, onHangUp,
  host = document.body, strings = getStrings(),
} = {}) {
  const existing = screens.get(host);
  if (existing) {
    existing.startedAt = startedAt;
    existing.audio = { muted: !!audio.muted, speaker: !!audio.speaker };
    existing.el.querySelector('.c-callscreen__name').textContent = name || truncateAddressMiddle(address || '');
    // #46 r1 MINOR-5: C#'s re-push may carry a resolved nick/avatar — refresh the identity.
    const idKey = [name, address, avatar || ''].join('\n');
    if (idKey !== existing.idKey) {
      existing.idKey = idKey;
      const card = existing.el.querySelector('.c-callscreen__card');
      const oldBg = card.querySelector('.c-callbg');
      if (oldBg) oldBg.replaceWith(createCallBackdrop({ avatar, name, address }));
      const oldAv = existing.el.querySelector('.c-callscreen__avatar');
      if (oldAv) {
        const av = createAvatar({ src: avatar, name, address, size: 112 });
        av.classList.add('c-callscreen__avatar');
        oldAv.replaceWith(av);
      }
    }
    apply(existing, strings);
    return existing.el;
  }

  const el = document.createElement('section');
  el.className = 'c-callscreen';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', strings.callOngoing || 'Ongoing call');

  const card = document.createElement('div');
  card.className = 'c-callscreen__card';
  card.append(createCallBackdrop({ avatar, name, address }));   // inside the card: full screen on a phone, the card's own ground on desktop

  const top = document.createElement('div');
  top.className = 'c-callscreen__top';
  if (onMinimise) {
    const min = document.createElement('button');
    min.type = 'button';
    min.className = 'c-callctl c-callscreen__min';
    min.setAttribute('aria-label', strings.callMinimise || 'Minimise');
    min.append(icon('arrows-minimize', { size: 20 }));
    min.addEventListener('click', onMinimise);
    top.append(min);
  }
  top.append(createE2eChip(strings));
  card.append(top);

  const who = document.createElement('div');
  who.className = 'c-callscreen__who';
  const av = createAvatar({ src: avatar, name, address, size: 112 });
  av.classList.add('c-callscreen__avatar');
  const n = document.createElement('h2');
  n.className = 'c-callscreen__name';
  n.textContent = name || truncateAddressMiddle(address || '');
  const st = document.createElement('p');
  st.className = 'c-callscreen__state u-tabular';
  st.setAttribute('aria-live', 'off');
  who.append(av, n, st);
  card.append(who);

  const ctl = document.createElement('div');
  ctl.className = 'c-callscreen__controls';
  if (caps.mute && onMute) {
    ctl.append(labelled(callToggle('mute', 'microphone', strings.callMute || 'Mute', () => onMute(!entry.audio.muted)), strings.callMute || 'Mute'));
  }
  if (caps.speaker && onSpeaker) {
    ctl.append(labelled(callToggle('speaker', 'volume', strings.callSpeaker || 'Speaker', () => onSpeaker(!entry.audio.speaker)), strings.callSpeaker || 'Speaker'));
  }
  const end = document.createElement('button');
  end.type = 'button';
  end.className = 'c-callscreen__end';
  end.setAttribute('aria-label', strings.hangUp || 'Hang up');
  end.append(icon('phone-end', { size: 28 }));
  if (onHangUp) end.addEventListener('click', onHangUp);
  ctl.append(labelled(end, strings.callEnd || 'End'));
  card.append(ctl);
  el.append(card);

  host.append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (el.isConnected && screens.get(host) && screens.get(host).el === el) el.dataset.open = '';
  }));

  const entry = { el, startedAt, audio: { muted: !!audio.muted, speaker: !!audio.speaker }, timer: 0,
    idKey: [name, address, avatar || ''].join('\n') };
  apply(entry, strings);
  entry.timer = setInterval(() => {
    if (entry.startedAt == null) return;
    st.textContent = callStateLine(entry.startedAt, entry.audio.muted, strings);
  }, 1000);
  screens.set(host, entry);
  return el;
}

export function hideCallScreen(host = document.body) {
  const entry = screens.get(host);
  if (!entry) return false;
  screens.delete(host);
  clearInterval(entry.timer);
  entry.el.remove();   // the stage re-layout (full → card) is the transition; no fade needed
  return true;
}
