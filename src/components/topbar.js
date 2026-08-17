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
 *              // `text: 'Add app'` makes ONE action a real TEXT button instead of a
 *              // bare glyph (Apps: a lone + read as ambiguous — Damir 2026-08-12).
 *              // It renders as a tonal size-32 pill with the glyph leading, so it
 *              // still sits inside the 56px bar and reads as an action, not a title.
 *              // `label` stays the accessible name; `icon` stays optional.
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
      group: !!identity.group, // N1 (#364): group/bot chats wear the group glyph
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
      word.className = 'c-topbar__word';   // iOS-47 (#314): Sora is scoped to THIS class — the wordmark alone (#226/B1)
      word.textContent = title || 'Spixi';
      /* ★ I-5 (Damir, 2026-08-15): the accent ink belongs to the LOGOTYPE, not to the
         root variant. CSS cannot select a parent by its child without :has(), and the
         WebView baseline is conservative CSS — so the branch that BUILDS the logotype
         flags it, and topbar.css keys off the flag. */
      titleEl.dataset.logotype = '';
      titleEl.append(mark, word);
    } else if (variant === 'root') {
      // iOS-47/48 (#314): plain root titles (Apps; desktop Chats) also get an inner
      // span — a stable target for the M16 title-state swap + the ellipsis/min-width
      // mechanics. NO __word class → system face (the Apps-in-Sora bug).
      const word = document.createElement('span');
      word.textContent = title;
      titleEl.append(word);
    } else {
      titleEl.textContent = title;
    }
    el.append(titleEl);
  }

  if (actions.length) {
    const wrap = document.createElement('div');
    wrap.className = 'c-topbar__actions';
    for (const a of actions) {
      const hasText = a.text != null && a.text !== '';
      const btn = createButton({
        // text action → tonal pill at bar scale; icon-only action → the 44 text button
        label: hasText ? a.text : undefined,
        type: hasText ? 'tonal' : 'text',
        size: hasText ? 32 : 44,
        // 16, not 18: a text action is a size-32 pill, and button.css sizes
        // `[data-size="32"] .c-button__icon` at --size-icon-16 — an 18 request was
        // overridden on arrival, so the glyph rasterised at a size nobody asked for.
        icon: a.icon ? icon(a.icon, hasText ? { size: 16 } : undefined) : null,
        ariaLabel: a.label,
        onClick: a.onClick,
      });
      // the ROW carries the width cap (a % max-width on the button would resolve
      // against the shrink-to-fit row = itself, and truncate a label that fits)
      if (hasText) { btn.classList.add('c-topbar__action--text'); wrap.classList.add('c-topbar__actions--text'); }
      wrap.append(btn);
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
