/**
 * c-callbar — active call strip (bridge: displayCallBar(sessionId, text,
 * callStartedTime) / hideCallBar — ARCHITECTURE.md §4). NOT a modal overlay;
 * pinned at --z-60, deliberately ABOVE modals: an active call never hides
 * (DESIGN_SYSTEM.md §2 z-scale). Singleton per host.
 *
 * showCallBar({ text, startedAt = Date.now(), onReturn, onHangUp,
 *               host = document.body, strings }) → el
 * hideCallBar(host) (#44 free fns)
 */
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
  host = document.body, strings = {},
} = {}) {
  // singleton: a bridge re-call (displayCallBar fires on updates) mutates the
  // live bar in place — no teardown/replay flash (review finding)
  const existing = callBars.get(host);
  if (existing) {
    existing.startedAt = startedAt;
    existing.el.querySelector('.c-callbar__text').textContent = text;
    existing.el.querySelector('.c-callbar__time').textContent =
      formatCallDuration(Date.now() - startedAt);
    return existing.el;
  }

  const el = document.createElement('div');
  el.className = 'c-callbar';

  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'c-callbar__main';
  main.setAttribute('aria-label', strings.returnToCall || 'Return to call');
  main.append(icon('phone', { size: 20 }));

  const label = document.createElement('span');
  label.className = 'c-callbar__text';
  label.textContent = text;
  main.append(label);

  const time = document.createElement('span');
  time.className = 'c-callbar__time u-tabular';
  time.textContent = formatCallDuration(Date.now() - startedAt);
  main.append(time);
  if (onReturn) main.addEventListener('click', onReturn);
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
