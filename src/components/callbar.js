/**
 * c-callbar — active call strip (bridge: displayCallBar(sessionId, text,
 * callStartedTime) / hideCallBar — ARCHITECTURE.md §4). NOT a modal overlay;
 * pinned at --z-60, deliberately ABOVE modals: an active call never hides
 * (DESIGN_SYSTEM.md §2 z-scale). Singleton per host.
 *
 * showCallBar({ text, startedAt = Date.now(), onReturn, onHangUp,
 *               host = document.body, strings }) → el
 *   startedAt: null — DIALING state (bridge displayCallBar sends "0" while
 *   dialing, legacy spixi.js:304): the timer is hidden, no ticking. A later
 *   re-push with a real startedAt flips it on in place (singleton mutate).
 *   onReturn — OPTIONAL. Wired → the main region is a real button. Omitted →
 *   it renders inert (no button role/aria-label/focus/hover), never a dead
 *   control (audit #257). Hang-up is always the live action.
 * hideCallBar(host) (#44 free fns)
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';

const callBars = new WeakMap(); // host → { el, timer }

function formatCallDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return (h > 0 ? h + ':' + mm : mm) + ':' + ss;
}

export function showCallBar({
  text = '', startedAt = Date.now(), onReturn, onHangUp,
  host = document.body, strings = getStrings(),
} = {}) {
  // singleton: a bridge re-call (displayCallBar fires on updates) mutates the
  // live bar in place — no teardown/replay flash (review finding)
  const existing = callBars.get(host);
  if (existing) {
    existing.startedAt = startedAt;
    existing.el.querySelector('.c-callbar__text').textContent = text;
    const timeEl = existing.el.querySelector('.c-callbar__time');
    timeEl.hidden = startedAt == null;   // dialing → in-call flips it on in place
    timeEl.textContent = startedAt == null ? '' : formatCallDuration(Date.now() - startedAt);
    return existing.el;
  }

  const el = document.createElement('div');
  el.className = 'c-callbar';

  /* the main region is a CONTROL only when a return-to-call target is wired.
   * Without onReturn (11 of the 12 shells today — C# doesn't send the friend
   * address yet, be-cutover C19) a <button aria-label="Return to call"> would be
   * a focusable, SR-announced control that does nothing (audit #257). Then it
   * renders as an inert <div>: no button semantics, no aria-label, not
   * focusable, and pointer-events:none so the CSS :hover/:active affordance on
   * .c-callbar__main can't fire either. Visuals are identical — the class (and
   * every layout/typography rule on it) is unchanged. */
  const interactive = typeof onReturn === 'function';
  const main = document.createElement(interactive ? 'button' : 'div');
  main.className = 'c-callbar__main';
  if (interactive) {
    main.type = 'button';
    main.setAttribute('aria-label', strings.returnToCall || 'Return to call');
  } else {
    main.dataset.static = '';          // styling hook, should the affordance ever move to CSS
    main.style.pointerEvents = 'none'; // kills cursor:pointer + :hover/:active
  }
  main.append(icon('phone', { size: 20 }));

  const label = document.createElement('span');
  label.className = 'c-callbar__text';
  label.textContent = text;
  main.append(label);

  const time = document.createElement('span');
  time.className = 'c-callbar__time u-tabular';
  time.hidden = startedAt == null;   // dialing: text only, no timer
  time.textContent = startedAt == null ? '' : formatCallDuration(Date.now() - startedAt);
  main.append(time);
  if (interactive) main.addEventListener('click', onReturn);
  el.append(main);

  const hangup = document.createElement('button');
  hangup.type = 'button';
  hangup.className = 'c-callbar__hangup';
  hangup.setAttribute('aria-label', strings.hangUp || 'Hang up');
  hangup.append(icon('phone-end', { size: 20 }));
  if (onHangUp) hangup.addEventListener('click', onHangUp);
  el.append(hangup);

  host.append(el);
  // guard: bar may be hidden before this fires (rapid toggle) — don't re-open it
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (el.isConnected && callBars.get(host) && callBars.get(host).el === el) el.dataset.open = '';
  }));

  const entry = { el, startedAt, timer: 0 };
  entry.timer = setInterval(() => {
    if (entry.startedAt == null) return;   // dialing — nothing to tick
    time.hidden = false;                   // an in-place flip to in-call re-reveals it
    time.textContent = formatCallDuration(Date.now() - entry.startedAt);
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
