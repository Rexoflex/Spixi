/**
 * c-app-item — one installed mini-app, in two renderings off ONE model (spec §2.1):
 *   layout 'list' → a horizontal ROW (icon 48 · name+creator · ⋮)
 *   layout 'grid' → a CARD (icon 64 · name+creator, ⋮ top-trailing)
 *
 * Structure is a container with sibling buttons (never nested — invalid a11y):
 *   .c-app-item__open  — the big tap target → onOpen(app)  (LAUNCHES the app, #126 2B)
 *   .c-app-item__info  — a trailing info (ⓘ) button → onInfo(app, btn) (App details page,
 *                        which owns launch-mode + uninstall; mobile v1 — replaces the ⋮)
 *   .c-app-item__menu  — the ⋮ overflow → onMenu(app, btn) (kept for the standalone
 *                        apps-shell / demos; not used by the home apps tab)
 * onInfo and onMenu are independent; a caller passes whichever it wants. Creator
 * (publisher) is a §8 field — rendered only when provided.
 *
 * createAppItem({ id, name, creator, icon, layout, strings, onOpen, onInfo, onMenu }) → div
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';
import { createAppIcon } from './apps-icon.js';

export function createAppItem({ id, name = '', creator = '', icon: iconSrc = null, layout = 'list', strings = getStrings(), onOpen, onInfo, onMenu } = {}) {
  const el = document.createElement('div');
  el.className = 'c-app-item';
  el.dataset.layout = layout === 'grid' ? 'grid' : 'list';
  if (id != null) el.dataset.appId = String(id);

  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'c-app-item__open';
  open.setAttribute('aria-label', name || (strings.app || 'App'));
  open.append(createAppIcon({ src: iconSrc, name, size: layout === 'grid' ? 64 : 48 }));

  const text = document.createElement('span');
  text.className = 'c-app-item__text';
  const nm = document.createElement('span');
  nm.className = 'c-app-item__name';
  nm.textContent = name;                                 // user data → textContent (XSS-safe)
  text.append(nm);
  if (creator) {
    const cr = document.createElement('span');
    cr.className = 'c-app-item__creator';
    cr.textContent = creator;
    text.append(cr);
  }
  open.append(text);
  if (onOpen) open.addEventListener('click', () => onOpen({ id, name, creator }));
  el.append(open);

  // ⓘ info — created ONLY when a handler is provided. Trailing button that opens the
  // app's details page (launch-mode selection + uninstall + permissions live there).
  // Mobile v1 uses this in place of the ⋮ menu (no honest list-scoped uninstall verb).
  if (onInfo) {
    const infoBtn = document.createElement('button');
    infoBtn.type = 'button';
    infoBtn.className = 'c-app-item__info';
    infoBtn.setAttribute('aria-label', (strings.appDetails || 'App details') + (name ? ' — ' + name : ''));
    infoBtn.append(icon('info-circle', { size: 24 }));
    infoBtn.addEventListener('click', (e) => { e.stopPropagation(); onInfo({ id, name, creator }, infoBtn); });
    el.append(infoBtn);
  }

  // ⋮ overflow — created ONLY when a handler is provided. A menu-less item (e.g.
  // HomePage's apps tab, which has no list-scoped uninstall verb) renders no button
  // at all (previously the element was always built and hidden via shell CSS — #184).
  if (onMenu) {
    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'c-app-item__menu';
    menuBtn.setAttribute('aria-label', (strings.moreOptions || 'More options') + (name ? ' — ' + name : ''));
    menuBtn.append(icon('dots', { size: 24 }));
    menuBtn.addEventListener('click', (e) => { e.stopPropagation(); onMenu({ id, name, creator }, menuBtn); });
    el.append(menuBtn);
  }

  return el;
}
