/**
 * c-callin — incoming voice call overlay (#86 last v1 gap; Damir: accept /
 * decline / ignore). Rides the overlay stack; renders at the call layer
 * (z-60, above modals — an incoming call outranks everything but toasts).
 * Ongoing-call UI stays c-callbar (#57); Accept typically chains into
 * showCallBar (shell duty). All three actions latch (state-changing).
 *
 * showIncomingCall({ host, caller: { name, address, avatar }, sub,
 *                    onAccept, onDecline, onIgnore, ignore, strings }) → el
 *   sub — line under the name (default "Incoming voice call…")
 *   Ignore = overlay dismisses, ringing continues muted (shell duty);
 *   Esc / scrim tap route to onIgnore too (safe dismiss = quietest action).
 *   ignore: false — production shells (Batch A, Damir): hide the Ignore action
 *   AND disable Esc/scrim dismiss — no bridge verb exists for a local dismiss
 *   (C# keeps ringing), so the only outcomes are Accept / Decline / a remote
 *   clear via hideIncomingCall. Default true (demo parity).
 * hideIncomingCall(el) — bridge hook (peer hung up before an answer).
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createAvatar } from './avatar.js';
import { openOverlay, dismissOverlay, setOverlayOpts } from './overlay.js';

export function showIncomingCall({
  host,
  caller = {},
  sub = '',
  onAccept,
  onDecline,
  onIgnore,
  ignore = true,
  strings = getStrings(),
} = {}) {
  const el = document.createElement('section');
  el.className = 'c-callin';
  el.setAttribute('role', 'alertdialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label',
    (strings.incomingCall || 'Incoming voice call') + (caller.name ? ', ' + caller.name : ''));
  el.tabIndex = -1;

  const id = document.createElement('div');
  id.className = 'c-callin__identity';
  const avatarWrap = document.createElement('span');
  avatarWrap.className = 'c-callin__avatar'; // pulse ring lives here
  avatarWrap.append(createAvatar({
    src: caller.avatar, name: caller.name, address: caller.address, size: 48,
  }));
  const name = document.createElement('span');
  name.className = 'c-callin__name';
  name.textContent = caller.name || caller.address || '';
  const subEl = document.createElement('span');
  subEl.className = 'c-callin__sub';
  subEl.textContent = sub || strings.incomingCall || 'Incoming voice call';
  id.append(avatarWrap, name, subEl);
  el.append(id);

  let acted = false; // one outcome per ring — all three actions latch
  const act = (fn) => () => {
    if (acted) return;
    acted = true;
    dismissOverlay(el);
    if (fn) fn();
  };

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
    b.append(icon(glyph, { size: 24 }));
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
  el.append(actions);

  // Esc / scrim = the QUIETEST outcome (ignore) — never auto-declines.
  // With ignore:false there is no quiet outcome (no local-dismiss verb), so
  // Esc/scrim dismiss is disabled — the dialog resolves only via Accept /
  // Decline / hideIncomingCall (remote clear).
  // data-silent (freeze audit): a REMOTE hang-up must not report onIgnore —
  // that's not a user outcome (shell may log/telemetry the ignore path)
  setOverlayOpts(el, { host, lightDismiss: ignore, escDismiss: ignore, onDismiss: () => {
    if (!acted && el.dataset.silent === undefined) {
      acted = true;
      if (onIgnore) onIgnore();
    }
  } });
  openOverlay(el);
  return el;
}

/** Bridge hook: caller hung up before an answer — drop the overlay SILENTLY
 *  (no onIgnore; see data-silent above). */
export function hideIncomingCall(el) {
  el.dataset.silent = '';
  dismissOverlay(el);
}
