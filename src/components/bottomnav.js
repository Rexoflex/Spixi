/**
 * c-bottomnav — mirrors Figma nav-bot/nav-item/indicator. DECISIONS.md #16.
 *
 * createBottomNav({
 *   items: [{ id, label, icon: 'messages', avatar: url|null, badge: number }],
 *   active: 'chats',
 *   ariaLabel: 'Main',                 // nav landmark label (SL in shells)
 *   onChange: (id) => void
 * })
 * Updates via free functions (button-style API):
 *   setNavActive(nav, id) · setNavBadge(nav, id, count)
 */
import { getStrings } from './strings-runtime.js';
import { icon, ICONS } from './icons.js';
import { formatCount } from './chatlist-item.js';

export function createBottomNav({ items = [], active, ariaLabel = 'Main', onChange } = {}) {
  const el = document.createElement('nav');
  el.className = 'c-bottomnav';
  el.setAttribute('aria-label', ariaLabel);

  for (const item of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'c-bottomnav__item';
    btn.dataset.id = item.id;

    const iconwrap = document.createElement('span');
    iconwrap.className = 'c-bottomnav__iconwrap';
    if (item.avatar) {
      const img = document.createElement('img');
      img.className = 'c-bottomnav__avatar';
      img.src = item.avatar;
      img.alt = '';
      iconwrap.append(img);
    } else {
      // outline = resting; -filled twin (when exported) crossfades in on select
      const outline = icon(item.icon);
      outline.classList.add('c-bottomnav__icon');
      iconwrap.append(outline);
      if (ICONS[item.icon + '-filled']) {
        iconwrap.dataset.dual = ''; // outline-fade only applies when a twin exists
        const filled = icon(item.icon + '-filled');
        filled.classList.add('c-bottomnav__icon--filled');
        filled.setAttribute('aria-hidden', 'true');
        iconwrap.append(filled);
      }
    }

    const badge = document.createElement('span');
    badge.className = 'c-bottomnav__badge';
    badge.hidden = true;
    iconwrap.append(badge);

    const label = document.createElement('span');
    label.className = 'c-bottomnav__label';
    label.textContent = item.label;

    btn.append(iconwrap, label);
    btn.addEventListener('click', () => {
      // active state lives in the DOM (setNavActive may be called externally)
      if (btn.hasAttribute('aria-current')) return; // already active — no re-fire
      setNavActive(el, item.id);
      if (onChange) onChange(item.id);
    });
    el.append(btn);
    if (item.badge) setNavBadge(el, item.id, item.badge);
  }

  if (active) setNavActive(el, active);
  return el;
}

/** Mark item `id` as the active destination; deselects the rest. */
export function setNavActive(nav, id) {
  for (const btn of nav.querySelectorAll('.c-bottomnav__item')) {
    // 'page' = nav destination (vs 'true' on a selected chat-list row)
    if (btn.dataset.id === id) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  }
}

/** Set item `id`'s badge count (0 hides it). strings.unread overrides the a11y label suffix. */
export function setNavBadge(nav, id, count, strings = getStrings()) {
  const btn = nav.querySelector('.c-bottomnav__item[data-id="' + id + '"]');
  const badge = btn && btn.querySelector('.c-bottomnav__badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = formatCount(count);
    badge.setAttribute('aria-label', count + ' ' + (strings.unread || 'unread'));
    badge.hidden = false;
  } else {
    badge.hidden = true;
    badge.removeAttribute('aria-label');
  }
}
