/**
 * link-rule — THE link rule of a chat message (#231c, #235; moved here by S20 F #46 r1 MINOR-1 from message-bubble.js).
 * Read by linkify (message-bubble.js) AND by the format pass (msg-format.js), which must never split a URL that linkify
 * would link (`…/main/__init__.py`, `site.com/*promo*`). The C# twin is Spixi/Utils/LinkRule.cs (#1106 parity pin).
 *
 * #231c: URLs = https?:// · www. · bare domains on a common-TLD whitelist ("github.com" links; file.txt / node.js stay
 * text). A scheme-less match glued to a word char, @, dot, dash or slash is part of a larger token ("a@b.com",
 * "path/x.com") → not a URL. Trailing sentence punctuation and unbalanced closing parens are not part of the URL.
 * #235 DoS guard: the bare-domain alternation backtracks per start position on a crafted no-TLD token ("a.a.a.a…"
 * ~50KB) → an O(n²) scan; text longer than LINKIFY_MAX is never scanned (no links; mentions still work).
 */
export const LINKIFY_MAX = 4096;
const BARE_TLDS = 'com|org|net|io|ai|app|dev|co|me|xyz|info|news|link|site|online|network|finance|exchange|market|money|cash|gg|tv|sh|so|to|us|uk|de|fr|es|it|nl|pl|cz|sk|ch|at|se|no|fi|dk|be|pt|gr|hr|rs|ba|si|hu|ro|bg|eu|ca|au|nz|jp|kr|in|br|mx|ar|za|tr|il|ae|sg|hk|tw|id|th|vn|ph|my';
const URL_RE = new RegExp(
  'https?:\\/\\/[^\\s<>"\']+' +
  '|www\\.[^\\s<>"\']+' +
  '|[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\\.(?:' + BARE_TLDS + ')(?:\\/[^\\s<>"\']*)?',
  'gi');

/** The URLs linkify would link in `text`: [{ start, end, url }] in order (end = start + url.length). */
export function urlSpans(text) {
  const out = [];
  for (const m of String(text).matchAll(URL_RE)) {
    const prev = m.index > 0 ? text[m.index - 1] : '';
    if (prev && /[\w@.\-\/]/.test(prev)) continue;
    let url = m[0];
    const trail = url.match(/[.,!?;:]+$/);
    if (trail) url = url.slice(0, url.length - trail[0].length);
    // unbalanced closing parens are sentence punctuation: "(see https://x.com)"
    while (url.endsWith(')') &&
           (url.split('(').length < url.split(')').length)) url = url.slice(0, -1);
    if (!url) continue;
    out.push({ start: m.index, end: m.index + url.length, url });
  }
  return out;
}
