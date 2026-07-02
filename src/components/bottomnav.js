/**
 * c-bottomnav — mirrors Figma nav-bot/nav-item/indicator. DECISIONS.md #16.
 *
 * createBottomNav({
 *   items: [{ id, label, icon: 'messages', avatar: url|null, badge: number }],
 *   active: 'chats',
 *   onChange: (id) => void
 * })
 * API: nav.setActive(id) · nav.setBadge(id, count)
 */
import { icon } from './icons.js';

export function createBottomNav({ items = [], active, onChange } = {}) {
  const el = document.createElement('nav');
  el.className = 'c-bottomnav';
  el.setAttribute('aria-label', 'Main');

  const buttons = new Map();

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
      iconwrap.append(icon(item.icon));
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
      setActive(item.id);
      if (onChange) onChange(item.id);
    });
    el.append(btn);
    buttons.set(item.id, btn);
    if (item.badge) setBadge(item.id, item.badge);
  }

  function setActive(id) {
    for (const [itemId, btn] of buttons) {
      if (itemId === id) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    }
  }

  function setBadge(id, count) {
    const btn = buttons.get(id);
    if (!btn) return;
    const badge = btn.querySelector('.c-bottomnav__badge');
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.hidden = false;
    } else badge.hidden = true;
  }

  if (active) setActive(active);
  el.setActive = setActive;
  el.setBadge = setBadge;
  return el;
}
