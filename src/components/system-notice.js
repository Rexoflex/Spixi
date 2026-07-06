/**
 * c-sysnotice — in-conversation system notice (DECISIONS #86/#91, restyled
 * per Damir round 6: success-inverse card + glyph medallion + title). The
 * secure-chat notice marks the TRUE start of history (shell renders it when
 * pagination exhausts). Copy from the lang file; the link routes through the
 * shell's external-link warning (onLink) — it never navigates itself.
 *
 * createSystemNotice({ glyph = 'square-asterisk', title, text, linkLabel,
 *                      onLink, strings }) → element (role=note)
 */
import { getStrings } from './strings-runtime.js';
import { icon } from './icons.js';

export function createSystemNotice({
  glyph = 'shield-lock', // Damir export landed — shield+lock reads "protected" universally
  title = '',
  text = '',
  linkLabel = '',
  onLink,
  strings = getStrings(),
} = {}) {
  const el = document.createElement('div');
  el.className = 'c-sysnotice';
  el.setAttribute('role', 'note');
  el.setAttribute('aria-label', strings.systemNotice || 'Chat security notice');

  const card = document.createElement('div');
  card.className = 'c-sysnotice__card';

  const g = document.createElement('span');
  g.className = 'c-sysnotice__medallion';
  g.setAttribute('aria-hidden', 'true');
  g.append(icon(glyph, { size: 20 }));
  card.append(g);

  if (title) {
    const t = document.createElement('span');
    t.className = 'c-sysnotice__title';
    t.textContent = title;
    card.append(t);
  }

  const body = document.createElement('span');
  body.className = 'c-sysnotice__text';
  body.append(document.createTextNode(text));
  if (linkLabel) {
    body.append(document.createTextNode(' '));
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'c-sysnotice__link';
    link.textContent = linkLabel;
    if (onLink) link.addEventListener('click', onLink);
    body.append(link);
  }
  card.append(body);

  el.append(card);
  return el;
}
