/**
 * c-topbar — mirrors Figma "title bar"/"top". DECISIONS.md #16 conventions.
 *
 * createTopbar({
 *   variant: 'root' | 'view' = 'view',
 *   title: string,                       // view title, or fallback text for root
 *   logo: url,                           // root variant: logo.svg (Chats/home header only)
 *   onBack: (e) => void,                 // view variant: renders back icon-button
 *   actions: [{ icon: 'qrcode', label: 'Scan', onClick }]  // trailing icon-buttons
 * })
 */
import { createButton } from './button.js';
import { icon } from './icons.js';

export function createTopbar({ variant = 'view', title = '', logo = null, onBack, actions = [] } = {}) {
  const el = document.createElement('header');
  el.className = 'c-topbar';
  el.dataset.variant = variant;

  if (variant === 'view' && onBack) {
    el.append(createButton({
      type: 'text', size: 44,
      icon: icon('arrow-left'),
      ariaLabel: 'Back',
      onClick: onBack,
    }));
  }

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
