/**
 * c-callbar — the MINIMISED in-call card (★ #1074, Damir's pick D1: dark call ground in
 * both themes; "below the top bar … a call card, not a full-bleed strip"). In production
 * the native CallPage stage IS the card (a rounded Border below the app's top bar), so
 * this element fills its host edge to edge; the demos float it the same way in CSS.
 * In the demos it sits at --z-60 (DESIGN_SYSTEM.md §2); in production the native stage's
 * ZIndex governs (CallPage.Z_CALL_SURFACE, under the lock).
 * Singleton per host: a re-push mutates the live card in place (no flash).
 *
 * showCallBar({ name, address, avatar, text, startedAt, state, caps, audio,
 *               onReturn, onHangUp, onMute, onSpeaker, host, strings }) → el
 *   startedAt: null — DIALING (C# sends "0" while dialing): no timer, the state line
 *     reads "Calling…". A later re-push with a real startedAt starts the timer in place.
 *   state line: "4:07 · Connected" / "4:07 · Muted" / "Calling…".
 *   text: the C#-localized legacy line ("In call - Maja") — used as the NAME fallback
 *     only when no name was pushed (a demo, an old C# build).
 *   caps  { mute, speaker } — a control renders only when its verb is wired on THIS
 *     platform (no dead buttons, #256/#264). audio { muted, speaker } = C#'s echo: the
 *     buttons show what C# did, never their own guess.
 *   onReturn — OPTIONAL. Wired → the identity region is a real button ("Open call" =
 *     expand). Omitted → it renders inert (audit #257), never a dead control.
 * hideCallBar(host) (#44 free fns)
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createAvatar, truncateAddressMiddle } from './avatar.js';

const callBars = new WeakMap(); // host → entry

export function formatCallDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return (h > 0 ? h + ':' + mm : mm) + ':' + ss;
}

/** The one state line both call views share: "4:07 · Connected" / "Calling…". */
export function callStateLine(startedAt, muted, strings = getStrings()) {
  if (startedAt == null) return strings.callCalling || 'Calling…';
  const t = formatCallDuration(Date.now() - startedAt);
  return t + ' · ' + (muted ? (strings.callMuted || 'Muted') : (strings.callConnected || 'Connected'));
}

/** A round call-control button. `on` = aria-pressed (a toggle). */
export function callToggle(kind, glyph, label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'c-callctl';
  b.dataset.kind = kind;
  b.setAttribute('aria-label', label);
  b.setAttribute('aria-pressed', 'false');
  b.append(icon(glyph, { size: 20 }));
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

function applyAudio(entry, strings) {
  const { el, audio } = entry;
  const mute = el.querySelector('.c-callctl[data-kind="mute"]');
  if (mute) {
    mute.setAttribute('aria-pressed', audio.muted ? 'true' : 'false');
    mute.setAttribute('aria-label', strings.callMute || 'Mute');   // #46 r1 MINOR-6: aria-pressed carries the state
    mute.replaceChildren(icon(audio.muted ? 'microphone-off' : 'microphone', { size: 20 }));
  }
  const spk = el.querySelector('.c-callctl[data-kind="speaker"]');
  if (spk) spk.setAttribute('aria-pressed', audio.speaker ? 'true' : 'false');
  el.querySelector('.c-callbar__state').textContent = callStateLine(entry.startedAt, audio.muted, strings);
}

export function showCallBar({
  name = '', address = '', avatar = null, text = '', startedAt = Date.now(),
  caps = {}, audio = {}, onReturn, onHangUp, onMute, onSpeaker,
  host = document.body, strings = getStrings(),
} = {}) {
  const shownName = name || text || truncateAddressMiddle(address || '');
  const existing = callBars.get(host);
  if (existing) {
    existing.startedAt = startedAt;
    existing.audio = { muted: !!audio.muted, speaker: !!audio.speaker };
    existing.el.querySelector('.c-callbar__name').textContent = shownName;
    // #46 r1 MINOR-5: a re-push may carry the resolved nick/avatar — refresh both.
    const main = existing.el.querySelector('.c-callbar__main');
    if (main && main.tagName === 'BUTTON') {
      main.setAttribute('aria-label', (strings.callOpen || 'Open call') + (shownName ? ', ' + shownName : ''));
    }
    const idKey = [name, address, avatar || ''].join('\n');
    if (idKey !== existing.idKey) {
      existing.idKey = idKey;
      const oldAv = main && main.querySelector('.c-avatar');
      if (oldAv) oldAv.replaceWith(createAvatar({ src: avatar, name, address, size: 36 }));
    }
    applyAudio(existing, strings);
    return existing.el;
  }

  const el = document.createElement('div');
  el.className = 'c-callbar';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', strings.callOngoing || 'Ongoing call');

  const interactive = typeof onReturn === 'function';
  const main = document.createElement(interactive ? 'button' : 'div');
  main.className = 'c-callbar__main';
  if (interactive) {
    main.type = 'button';
    main.setAttribute('aria-label', (strings.callOpen || 'Open call') + (shownName ? ', ' + shownName : ''));
    main.addEventListener('click', onReturn);
  } else {
    main.dataset.static = '';
    main.style.pointerEvents = 'none';
  }
  main.append(createAvatar({ src: avatar, name, address, size: 36 }));
  const who = document.createElement('span');
  who.className = 'c-callbar__who';
  const n = document.createElement('span');
  n.className = 'c-callbar__name';
  n.textContent = shownName;
  const st = document.createElement('span');
  st.className = 'c-callbar__state u-tabular';
  who.append(n, st);
  main.append(who);
  el.append(main);

  const ctl = document.createElement('div');
  ctl.className = 'c-callbar__controls';
  if (caps.mute && onMute) ctl.append(callToggle('mute', 'microphone', strings.callMute || 'Mute', () => onMute(!entry.audio.muted)));
  if (caps.speaker && onSpeaker) ctl.append(callToggle('speaker', 'volume', strings.callSpeaker || 'Speaker', () => onSpeaker(!entry.audio.speaker)));

  const hangup = document.createElement('button');
  hangup.type = 'button';
  hangup.className = 'c-callbar__hangup';
  hangup.setAttribute('aria-label', strings.hangUp || 'Hang up');
  hangup.append(icon('phone-end', { size: 22 }));
  if (onHangUp) hangup.addEventListener('click', onHangUp);
  ctl.append(hangup);
  el.append(ctl);

  host.append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (el.isConnected && callBars.get(host) && callBars.get(host).el === el) el.dataset.open = '';
  }));

  const entry = { el, startedAt, audio: { muted: !!audio.muted, speaker: !!audio.speaker }, timer: 0,
    idKey: [name, address, avatar || ''].join('\n') };
  applyAudio(entry, strings);
  entry.timer = setInterval(() => {
    if (entry.startedAt == null) return;   // dialing — nothing to tick
    st.textContent = callStateLine(entry.startedAt, entry.audio.muted, strings);
  }, 1000);
  callBars.set(host, entry);
  return el;
}

export function hideCallBar(host = document.body) {
  const entry = callBars.get(host);
  if (!entry) return false;
  callBars.delete(host);
  clearInterval(entry.timer);
  const { el } = entry;
  if (el.dataset.open === undefined) { el.remove(); return true; } // hidden before it entered
  delete el.dataset.open;
  let removed = false;
  const remove = () => { if (!removed) { removed = true; el.remove(); } };
  el.addEventListener('transitionend', (e) => { if (e.target === el) remove(); });
  setTimeout(remove, 400); // covers reduced-motion 0ms
  return true;
}
