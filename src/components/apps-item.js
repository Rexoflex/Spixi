/**
 * c-app-item — one installed mini-app, in two renderings off ONE model (spec §2.1):
 *   layout 'list' → a horizontal ROW (icon 48 · name+creator · ⋮)
 *   layout 'grid' → a CARD (icon 64 · name+creator, ⋮ top-trailing)
 *
 * Structure is a container with TWO sibling buttons (never nested — invalid a11y):
 *   .c-app-item__open  — the big tap target → onOpen(app)  (LAUNCHES the app, #126 2B)
 *   .c-app-item__menu  — the ⋮ overflow → onMenu(app, btn) (App details / Uninstall)
 * Creator (publisher) is a §8 field — rendered only when provided.
 *
 * createAppItem({ id, name, creator, icon, layout, strings, onOpen, onMenu }) → div
 */
import { icon } from './icons.js';
import { createAppIcon } from './apps-icon.js';

export function createAppItem({ id, name = '', creator = '', icon: iconSrc = null, layout = 'list', strings = {}, onOpen, onMenu } = {}) {
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

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'c-app-item__menu';
  menuBtn.setAttribute('aria-label', (strings.moreOptions || 'More options') + (name ? ' — ' + name : ''));
  menuBtn.append(icon('dots', { size: 24 }));
  if (onMenu) menuBtn.addEventListener('click', (e) => { e.stopPropagation(); onMenu({ id, name, creator }, menuBtn); });
  el.append(menuBtn);

  return el;
}
