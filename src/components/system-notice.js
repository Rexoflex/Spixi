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
  /* ★ E1b (Damir 2026-08-29): a topology glyph replacing shield-lock. The shield said
     "security"; the topology says PEER-TO-PEER, which is what the copy on this card is
     about. The asset is his export; generate-icons.mjs sweeps every tabler-icon-*.svg
     and keys it by the stripped name, so it needs no registration.
     ★ Damir 2026-08-30: topology-star-2 → topology-star. Add-only (84 → 85 icons):
     topology-star-2 STAYS in the registry, so this is a call-site swap and not a
     retirement — nothing else that might reference it can break.
     ⚠ The copy quoted in the old version of this note ("No server carries or stores
     them") is GONE — it was the §0 launch blocker and was replaced on 2026-08-30. */
  glyph = 'topology-star',
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
