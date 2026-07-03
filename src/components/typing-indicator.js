/**
 * c-typing — "is typing" pill (batch 3; conversation-level design gap #66,
 * code-first in the bubble language). Bridge: showUserTyping — the shell
 * appends the row while typing is on and removes it when it stops; the shell
 * also keeps it as the LAST row (re-append after live sends).
 *
 * createTypingIndicator({ name, strings }) → row element
 *   name — group chats: whose keyboard is busy (1:1 omits it)
 */
export function createTypingIndicator({ name = '', strings = {} } = {}) {
  const row = document.createElement('div');
  // --typing: hugs the composer (Damir 2026-07-03 — spacing-4 bottom gap,
  // see typing-indicator.css; the list's bottom padding must match)
  row.className = 'c-bubble-row c-bubble-row--typing';
  row.dataset.direction = 'received';
  row.dataset.position = 'single';

  const el = document.createElement('div');
  el.className = 'c-typing';
  // transient status, not a message — announced once, dots stay decorative
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label',
    name ? name + ' ' + (strings.isTyping || 'is typing…') : (strings.typing || 'Typing…'));

  if (name) {
    const n = document.createElement('span');
    n.className = 'c-typing__name';
    n.setAttribute('aria-hidden', 'true');
    n.textContent = name;
    el.append(n);
  }

  const dots = document.createElement('span');
  dots.className = 'c-typing__dots';
  dots.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('span');
    d.className = 'c-typing__dot';
    dots.append(d);
  }
  el.append(dots);

  row.append(el);
  return row;
}
