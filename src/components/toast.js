/**
 * c-toast — transient feedback card (docs/overlays-spec.md). NOT a modal
 * overlay: no scrim, no focus trap, never steals focus. One visible per host;
 * later toasts queue. One confirmation per action (#29) — never toast an
 * action that already confirms via button morph, navigation, or alert.
 *
 * showToast({ text, tone = 'info'|'success'|'error', duration = 3500,
 *             host = document.body, strings }) → dismiss()
 */
import { icon } from './icons.js';

const TONE_GLYPHS = { info: 'info-circle', success: 'check', error: 'alert-square-rounded' };

const toastHostState = new WeakMap(); // host → { current, queue }

export function showToast(opts = {}) {
  const host = opts.host || document.body;
  let state = toastHostState.get(host);
  if (!state) { state = { current: null, queue: [] }; toastHostState.set(host, state); }
  if (state.current) {
    // queue discipline: collapse identical consecutive toasts, cap backlog at 2
    // (stale confirmations replaying for minutes help nobody — review finding)
    const last = state.queue[state.queue.length - 1];
    const dup = last && last.text === opts.text && last.tone === opts.tone;
    if (!dup) {
      state.queue.push(opts);
      if (state.queue.length > 2) state.queue.shift();
    }
    return () => { // dismiss handle for a queued toast: drop it from the queue
      const i = state.queue.indexOf(opts);
      if (i !== -1) state.queue.splice(i, 1);
    };
  }
  return presentToast(host, state, opts);
}

function presentToast(host, state, { text = '', tone = 'info', duration = 3500 } = {}) {
  const el = document.createElement('div');
  el.className = 'c-toast';
  el.dataset.tone = tone;
  el.setAttribute('role', 'status');

  el.append(icon(TONE_GLYPHS[tone] || TONE_GLYPHS.info, { size: 20 }));
  const t = document.createElement('span');
  t.className = 'c-toast__text';
  t.textContent = text;
  el.append(t);

  host.append(el);
  state.current = el;

  // enter (double rAF so initial styles paint first — same as overlay.js)
  requestAnimationFrame(() => requestAnimationFrame(() => { el.dataset.open = ''; }));

  let removed = false;
  let exitFallback;
  const remove = () => {
    if (removed) return;
    removed = true;
    clearTimeout(exitFallback);
    el.remove();
    state.current = null;
    const next = state.queue.shift();
    if (next) presentToast(host, state, next);
  };
  const dismiss = () => {
    if (removed) return;
    clearTimeout(autoTimer);
    if (el.dataset.open === undefined) { remove(); return; } // dismissed before it entered
    delete el.dataset.open;
    // reduced motion: durations are 0, transitionend may never fire — remove now
    // so the next queued toast isn't stuck behind the 400ms fallback
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { remove(); return; }
    el.addEventListener('transitionend', (e) => { if (e.target === el) remove(); });
    exitFallback = setTimeout(remove, 400); // fallback if transitionend is lost
  };

  el.addEventListener('click', dismiss);
  const autoTimer = setTimeout(dismiss, duration);
  return dismiss;
}
