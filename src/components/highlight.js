/**
 * Text-match highlighting for search results (DECISIONS #52).
 * Wraps case-insensitive matches in span.c-highlight, walking TEXT nodes only —
 * structured children (mention/draft spans, icons) survive, and content is never
 * parsed as HTML (XSS-safe: text nodes in, text nodes out).
 *
 * setHighlights(rootEl, query) — query '' / null clears.
 */

export function clearHighlights(rootEl) {
  for (const m of [...rootEl.querySelectorAll('.c-highlight')]) {
    m.replaceWith(document.createTextNode(m.textContent));
  }
  rootEl.normalize(); // merge the text nodes back together
}

export function setHighlights(rootEl, query) {
  clearHighlights(rootEl);
  if (query == null || query === '') return;
  const q = String(query).toLocaleLowerCase();

  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  for (const node of textNodes) {
    const text = node.nodeValue;
    const lower = text.toLocaleLowerCase();
    let i = lower.indexOf(q);
    if (i === -1) continue;
    const frag = document.createDocumentFragment();
    let pos = 0;
    while (i !== -1) {
      if (i > pos) frag.append(document.createTextNode(text.slice(pos, i)));
      const mark = document.createElement('span');
      mark.className = 'c-highlight';
      mark.textContent = text.slice(i, i + q.length);
      frag.append(mark);
      pos = i + q.length;
      i = lower.indexOf(q, pos);
    }
    if (pos < text.length) frag.append(document.createTextNode(text.slice(pos)));
    node.replaceWith(frag);
  }
}
