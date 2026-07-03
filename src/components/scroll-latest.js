/**
 * c-scroll-latest — floating "scroll to latest" button over the chat canvas
 * (batch 3; #66 gap fill w/ unread count). Mount INSIDE .c-chat-canvas (the
 * positioning context); pass the scrolling element as `target`.
 * Visibility is component-managed (scroll listener, ~1.5 viewport threshold);
 * the unread count is shell-managed via setScrollLatestCount (#44 free fn) —
 * the shell knows read flags, the component only displays.
 *
 * createScrollToLatest({ target, strings }) → button
 * setScrollLatestCount(el, count, strings) — 0/null clears the badge
 */
import { icon } from './icons.js';
import { formatCount } from './chatlist-item.js';

const SHOW_THRESHOLD = 200; // px from bottom before the button appears (sanctioned)

export function createScrollToLatest({ target, strings = {} } = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'c-scroll-latest';
  el.setAttribute('aria-label', strings.scrollToLatest || 'Scroll to latest messages');
  el.append(icon('chevron-down', { size: 22 }));

  if (target) {
    const sync = () => {
      const away = target.scrollHeight - target.scrollTop - target.clientHeight;
      el.toggleAttribute('data-visible', away > SHOW_THRESHOLD);
    };
    target.addEventListener('scroll', sync, { passive: true });
    sync();
    el.addEventListener('click', () => {
      target.scrollTo({
        top: target.scrollHeight,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
  }
  return el;
}

/** Unread-count badge on the button (99+ cap shared with nav/list). */
export function setScrollLatestCount(el, count, strings = {}) {
  let badge = el.querySelector('.c-scroll-latest__badge');
  if (!count) {
    if (badge) badge.remove();
    el.setAttribute('aria-label', strings.scrollToLatest || 'Scroll to latest messages');
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'c-scroll-latest__badge u-tabular';
    badge.setAttribute('aria-hidden', 'true'); // count lives in the button label
    el.append(badge);
  }
  badge.textContent = formatCount(count);
  el.setAttribute('aria-label',
    (strings.scrollToLatest || 'Scroll to latest messages') + ' — ' +
    formatCount(count) + ' ' + (strings.unread || 'unread'));
}
