/**
 * c-topbar — mirrors Figma "title bar"/"top". DECISIONS.md #16 conventions.
 *
 * createTopbar({
 *   variant: 'root' | 'view' | 'chat' = 'view',
 *   title: string,                       // view title, or fallback text for root
 *   logo: boolean,                       // root variant: render the registry logo mark (Chats/home header only)
 *   identity: { name, sub, avatar, address, online },
 *              // chat variant (Damir spec 2026-07-03): avatar 40 + presence dot,
 *              // name label-md, sub body-sm text-02 ("Online" / "6 members" —
 *              // bridge-driven via setOnlineStatus)
 *   onBack: (e) => void,                 // view/chat variants: back icon-button
 *   backLabel: 'Back',                   // back button a11y label (SL in shells)
 *   onIdentity: (e) => void,             // chat variant: identity block becomes a
 *                                        // BUTTON (channel selector on bots, chat
 *                                        // info later — #86 bot surface)
 *   actions: [{ icon: 'phone', label: 'Call', onClick }]  // trailing icon-buttons
 * })
 * setTopbarSub(el, text) — live sub updates (typing…, presence) (#44 free fn)
 */
import { createButton } from './button.js';
import { icon } from './icons.js';
import { createAvatar } from './avatar.js';

export function createTopbar({ variant = 'view', title = '', logo = false, identity = null, onBack, backLabel = 'Back', onIdentity = null, actions = [] } = {}) {
  const el = document.createElement('header');
  el.className = 'c-topbar';
  el.dataset.variant = variant;

  if ((variant === 'view' || variant === 'chat') && onBack) {
    el.append(createButton({
      type: 'text', size: 44,
      icon: icon('arrow-left'),
      ariaLabel: backLabel,
      onClick: onBack,
    }));
  }

  if (variant === 'chat' && identity) {
    // identity wrap: BUTTON when onIdentity is wired (bot channel selector /
    // chat info) — accessible name comes from the name+sub content
    const wrap = document.createElement(onIdentity ? 'button' : 'div');
    wrap.className = 'c-topbar__identity-wrap';
    if (onIdentity) {
      wrap.type = 'button';
      wrap.addEventListener('click', onIdentity);
    }
    wrap.append(createAvatar({
      src: identity.avatar, name: identity.name, address: identity.address,
      size: 40, online: !!identity.online,
    }));
    const id = document.createElement('div');
    id.className = 'c-topbar__identity';
    const nameEl = document.createElement('span');
    nameEl.className = 'c-topbar__name';
    nameEl.textContent = identity.name || identity.address || '';
    const subEl = document.createElement('span');
    subEl.className = 'c-topbar__sub';
    subEl.setAttribute('aria-live', 'polite'); // presence/typing changes announced
    subEl.textContent = identity.sub || '';
    id.append(nameEl, subEl);
    wrap.append(id);
    el.append(wrap);
  } else {
    const titleEl = document.createElement('div');
    titleEl.className = 'c-topbar__title';
    if (variant === 'root' && logo) {
      // logotype = inline mark (currentColor — inherits title ink, both modes) + wordmark
      const mark = icon('logo', { size: 28 });
      mark.classList.add('c-topbar__logo');
      const word = document.createElement('span');
      word.textContent = title || 'Spixi';
      titleEl.append(mark, word);
    } else {
      titleEl.textContent = title;
    }
    el.append(titleEl);
  }

  if (actions.length) {
    const wrap = document.createElement('div');
    wrap.className = 'c-topbar__actions';
    for (const a of actions) {
      wrap.append(createButton({
        type: 'text', size: 44,
        icon: icon(a.icon),
        ariaLabel: a.label,
        onClick: a.onClick,
      }));
    }
    el.append(wrap);
  }

  return el;
}

/** Live sub-line update (typing…, presence, member count) — bridge setOnlineStatus. */
export function setTopbarSub(el, text) {
  const sub = el.querySelector('.c-topbar__sub');
  if (sub) sub.textContent = text || '';
}
