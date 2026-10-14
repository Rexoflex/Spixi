/* ==== S20 F (#1378) — the formatting grammar: every vector in f-vectors.json through the SHIPPED bundle ====
 * On the BUILT chat.html (jsdom) — window.Spixi.parseFormat / stripFormat / renderFormat, i.e. msg-format.js as it ships
 * in spixi.bundle.js: for each vector, parse = `shape` and strip = `strip` (the same file builder S's C# strip reads);
 * renderFormat builds the matching DOM (b → strong.c-fmt-b, i → em, s → s, code → code.c-fmt-code, pre → pre.c-fmt-pre)
 * with its text = the strip text minus the block-adjacent newlines; plain runs reach onText, code never does.
 * Cost: a 64 000-char run of openers / a run of backticks strips in < 1.5 s (the O(n log n) closer search — a quadratic
 * scan takes tens of seconds; #235 DoS class).
 * Deliberate breaks (S20 F report): the opener's "prev is not a letter / digit" test removed → x*y* and čšž_ž_ fail ·
 * the closer's "next is not a letter / digit" test removed → _a_b fails · the inline-code "same line" bound removed →
 * the "say ```js…" vector fails · the closer found by a forward scan per opener (no binary search) → the cost clause
 * fails (~11 s) · onText called for a code chip → the onText clause fails · ★ #46 r1: the URL mask dropped from the
 * emphasis scan (msg-format.js inUrl) → the __init__.py / *promo* pending vectors fail. */
import { uiKit } from '../pins-s8/ui-kit.mjs';
export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const V = JSON.parse(readFileSync(join(root, 'scripts/pins-s20/f-vectors.json'), 'utf8'));
  const { boot } = uiKit(h);
  const s = await boot('chat.html', { mobile: true, wait: 1200 });
  const r = { shape: [], strip: [], render: [] };
  let cost = null, onTextCode = null, api = false;
  try {
    const S = s.W.Spixi || {};
    api = typeof S.parseFormat === 'function' && typeof S.stripFormat === 'function' && typeof S.renderFormat === 'function';
    if (api) {
      const d = s.d;
      const TAG = { strong: 'b', em: 'i', s: 's' };
      const shapeOf = (node) => {   // DOM → the vector shape
        const out = [];
        for (const c of node.childNodes) {
          if (c.nodeType === 3) {
            if (typeof out[out.length - 1] === 'string') out[out.length - 1] += c.nodeValue; else out.push(c.nodeValue);
          } else if (c.localName === 'code' && c.className === 'c-fmt-code') out.push(['code', c.textContent]);
          else if (c.localName === 'pre' && c.className === 'c-fmt-pre') out.push(['pre', c.textContent]);
          else if (TAG[c.localName] && c.className === 'c-fmt-' + TAG[c.localName]) out.push([TAG[c.localName], ...shapeOf(c)]);
          else out.push(['?' + c.localName]);
        }
        return out;
      };
      /* the render drops ONE newline on each side of a block (a block box already breaks the line) */
      const renderShape = (shape) => shape.map((n, i) => {
        if (typeof n !== 'string') return n;
        let t = n;
        if (i > 0 && Array.isArray(shape[i - 1]) && shape[i - 1][0] === 'pre' && t[0] === '\n') t = t.slice(1);
        if (i + 1 < shape.length && Array.isArray(shape[i + 1]) && shape[i + 1][0] === 'pre' && t.endsWith('\n')) t = t.slice(0, -1);
        return t;
      }).filter((n) => n !== '');
      for (const v of [...V.vectors, ...(V.pending || [])]) {   /* ★ #46 r1: + the pending set (JS passes; the C# mirror follows) */
        const got = JSON.stringify(S.parseFormat(v.in));
        if (got !== JSON.stringify(v.shape)) r.shape.push(JSON.stringify(v.in) + ' → ' + got);
        const st = S.stripFormat(v.in);
        if (st !== v.strip) r.strip.push(JSON.stringify(v.in) + ' → ' + JSON.stringify(st));
        const host = d.createElement('span');
        host.append(S.renderFormat(v.in));
        const rs = JSON.stringify(shapeOf(host));
        if (rs !== JSON.stringify(renderShape(v.shape))) r.render.push(JSON.stringify(v.in) + ' → ' + rs);
      }
      /* onText sees plain runs only — never the content of code / a block */
      const seen = [];
      S.renderFormat('*a* `b https://x.io` c\n```\nd @e\n```', { onText: (run, parent) => { seen.push(run); parent.append(d.createTextNode(run)); } });
      onTextCode = !seen.some((x) => /b https|d @e/.test(x)) && seen.join('|') === 'a| | c';
      const t0 = Date.now();
      S.stripFormat('*a '.repeat(21000));
      S.stripFormat('_'.repeat(64000));
      S.stripFormat('`a\n'.repeat(16000));
      S.stripFormat('a_'.repeat(32000) + '_');
      cost = Date.now() - t0;
    }
  } finally { s.W.close(); }
  ok(api && V.vectors.length >= 16 && !r.shape.length && !r.strip.length && !r.render.length,
    '★ S20 F (#1378): the ' + V.vectors.length + ' + ' + (V.pending || []).length + ' pending formatting vectors (f-vectors.json, shared with the C# strip) — parse = shape, strip = strip, render = the DOM shape (strong / em / s / code / pre, DOM-built) on the BUILT bundle' +
    (r.shape.length + r.strip.length + r.render.length ? ' — shape ✗ ' + r.shape.join(' ; ') + ' · strip ✗ ' + r.strip.join(' ; ') + ' · render ✗ ' + r.render.join(' ; ') : '') + (api ? '' : ' — window.Spixi has no parseFormat / stripFormat / renderFormat'));
  ok(onTextCode === true, '★ S20 F: onText (the mention + linkify hand-off) receives the plain runs only — never the inside of `code` or a ``` block' + (onTextCode === true ? '' : ' (got ' + onTextCode + ')'));
  ok(cost !== null && cost < 1500, '★ S20 F: 64 000-char crafted runs (openers, backticks, letter-glued marks) strip in < 1.5 s — measured ' + cost + ' ms (the #235 DoS class)');
}
