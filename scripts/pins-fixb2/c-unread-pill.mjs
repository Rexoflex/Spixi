/* ==== fixb2 item 1 (Damir #1629 "Centred pill", #1639 "The same pill everywhere") — the "Unread messages" marker is a CENTRED PILL ====
 * Mechanism: until now `.c-unread-divider` was a full-width strip (two hairlines + tint; on the desktop a negative inline margin
 * `calc(-1 * max(0px, (100vw - 760px) / 2))` pulled it edge to edge). It is now a rounded pill in the centre of the message column,
 * the date pill's shape (radius-full, padding, label-xs type, full border, glass), on EVERY platform. The class `.c-unread-divider`
 * stays (the JS and the tests find it by it); the fill / hairline / ink stay its own glass roles (#1080 F16).
 * This is the SMOKE half, on the BUILT chat shell (comment-stripped, #771 declared): (A) the CSS cascade of the marker against the
 * date pill's, read rule by rule across EVERY media / supports block; (B) the DOM the shell really builds, in jsdom (the shell's own
 * C# push path); jsdom has no layout, so the MEASURED half (centres, edges) is scripts/pins-fixb2/c-unread-pill-sweep.mjs
 * (Chromium, run by hand).
 *   (1) the marker's radius, padding, font-size / line-height / letter-spacing / font-weight and backdrop-filter are EQUAL to the date
 *       pill's (`.c-datesep__pill`), and its border is the FULL `border:` (width token + an --outline-* role), not `border-block`;
 *       fill is a --surface-* role, ink a --text-* role (the date pill's token families);
 *   (2) centred by construction: `width: fit-content`, `max-width: 100%`, an `auto` inline margin — and no `width: 100%` / `100vw`;
 *   (3) no full-bleed rule is left ANYWHERE: no rule on `.c-unread-divider` in any media query / :root[data-desktop] / :root:not(...)
 *       scope (the same pill everywhere; only the @supports fallback may restate it), and no negative margin, no `100vw`;
 *   (4) the DOM: after the shell's own open of a chat with unread rows, ONE `#messages > .c-unread-divider[role=separator]` holding ONE
 *       label span, a direct child of the log like the date pills, NO inline style, after a `.c-datesep`, and the log keeps its 760
 *       column padding (so a #messages child centres in the column);
 *   (5) the both-edges gutter of fixb1 is still the ONLY scrollbar-gutter rule on the log (the decision of fixb2 item 1: KEPT).
 * ★ #46 r1 fixes: (3b) the label wraps inside the pill (m-3) · (3c) no rule at any at-rule depth hides the marker, and its computed display is not none (m-4).
 * Deliberate breaks (fixb2 report, #802): `border-radius: var(--radius-full)` → `var(--radius-8)` on `.c-unread-divider` (+ build-shells)
 *   → (1) fails; `width: fit-content` → `width: 100%` → (2) AND (3) fail; the old rule `:root[data-desktop] .c-unread-divider { margin-inline:
 *   calc(-1 * max(0px, (100vw - 760px) / 2)); }` put back in chat.html → (3) fails; `stable both-edges` → `stable` on the log → (5) fails. */
export default async function (h) {
  const { ok, root, readFileSync, join, stripCssComments, JSDOM, VirtualConsole, sleep } = h;
  const builtPath = join(root, 'Spixi/Resources/Raw/html/chat.html');
  const html = readFileSync(builtPath, 'utf8');
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => stripCssComments(m[1])).join('\n').replace(/\s+/g, ' ');

  /* a small rule walker: every `selector { body }` with the chain of at-rule preludes it sits in */
  const rules = [];
  const walk = (text, ctx) => {
    let i = 0;
    while (i < text.length) {
      const o = text.indexOf('{', i);
      if (o < 0) break;
      const prelude = text.slice(i, o).trim();
      let depth = 1, j = o + 1;
      while (j < text.length && depth) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
      const inner = text.slice(o + 1, j - 1);
      if (prelude.startsWith('@')) { if (/^@(media|supports|layer|container)/.test(prelude)) walk(inner, ctx.concat(prelude)); }
      else rules.push({ sel: prelude, body: inner.trim(), ctx });
      i = j;
    }
  };
  walk(css, []);
  const decl = (body, prop) => { const m = new RegExp('(?:^|[;\\s])' + prop.replace(/-/g, '\\-') + '\\s*:\\s*([^;]+)').exec(body); return m ? m[1].trim() : null; };
  const unread = rules.filter((r) => /\.c-unread-divider\b/.test(r.sel));
  const base = unread.find((r) => r.sel === '.c-unread-divider' && r.ctx.length === 0);
  const pill = rules.find((r) => r.sel === '.c-datesep__pill' && r.ctx.length === 0);

  /* (1) the date pill's shape */
  const SAME = ['border-radius', 'padding', 'font-size', 'line-height', 'letter-spacing', 'font-weight', 'backdrop-filter', '-webkit-backdrop-filter'];
  const diffs = base && pill ? SAME.filter((p) => decl(base.body, p) !== decl(pill.body, p) || decl(base.body, p) === null) : SAME;
  const bBorder = base ? decl(base.body, 'border') : null;
  const pBorder = pill ? decl(pill.body, 'border') : null;
  const widthTok = (v) => (/^(var\(--outline-width-\d\)) solid var\(--outline-[a-z0-9-]+\)$/.exec(v || '') || [])[1];
  const fam = base ? { fill: /^var\(--surface-[a-z0-9-]+\)$/.test(decl(base.body, 'background') || ''), ink: /^var\(--text-[a-z0-9-]+\)$/.test(decl(base.body, 'color') || ''), hair: /^var\(--outline-width-1\) solid var\(--outline-[a-z0-9-]+\)$/.test(bBorder || '') } : {};
  ok(!!base && !!pill && diffs.length === 0 && !!widthTok(bBorder) && widthTok(bBorder) === widthTok(pBorder) && !/border-block/.test(base.body) && fam.fill && fam.ink && fam.hair
     && decl(base.body, 'border-radius') === 'var(--radius-full)',
    '★ fixb2 item 1 (#1629 / #1639): the BUILT chat shell\'s `.c-unread-divider` has the date pill\'s radius (radius-full), padding, type (label-xs size / line-height / tracking / semibold), backdrop blur and a FULL border of the same width token (no border-block) — fill a --surface-*, ink a --text-*, hairline an --outline-* role — ' + JSON.stringify({ base: !!base, pill: !!pill, diffs, bBorder, pBorder, fam }));

  /* (2) centred by construction */
  const mg = base ? decl(base.body, 'margin') : null;
  ok(!!base && decl(base.body, 'width') === 'fit-content' && decl(base.body, 'max-width') === 'calc(100% - 2 * var(--spacing-16))' && /^var\(--spacing-12\) auto$/.test(mg || '') && !/(^|\s)(100%|100vw)/.test(decl(base.body, 'width') || ''),
    '★ fixb2 item 1: the marker is a PILL centred by construction — `width: fit-content; max-width: calc(100% - 2 * var(--spacing-16)); margin: var(--spacing-12) auto` (an auto inline margin in the flex-column log) — and not `width: 100%` / `100vw` — ' + JSON.stringify({ width: base && decl(base.body, 'width'), max: base && decl(base.body, 'max-width'), margin: mg }));

  /* (3) no full-bleed rule anywhere, the same pill on every platform */
  const LABEL = '.c-unread-divider > span';
  const labelRule = unread.find((r) => r.sel === LABEL && r.ctx.length === 0);
  const scoped = unread.filter((r) => r !== base && r !== labelRule && !(r.ctx.length === 1 && /^@supports not \(\(backdrop-filter/.test(r.ctx[0])));
  const bleed = unread.filter((r) => /calc\(\s*-1|100vw|(^|[;\s])margin[a-z-]*\s*:[^;]*(^|[\s(])-\d|(^|[;\s])width\s*:\s*(100%|100vw)|margin-inline/.test(r.body));
  const anyBleedText = /\.c-unread-divider[^{}]*\{[^{}]*(100vw|calc\(\s*-1|margin-inline)/.test(css);
  ok(unread.length >= 1 && scoped.length === 0 && bleed.length === 0 && !anyBleedText,
    '★ fixb2 item 1: no full-bleed rule is left on the BUILT chat shell — no `.c-unread-divider` rule inside a media query, `:root[data-desktop]` or `:root:not(...)` scope (the same pill on every platform; only the @supports fallback restates it), no negative margin, no `100vw` — ' + JSON.stringify({ rules: unread.length, scoped: scoped.map((r) => r.ctx.join(' ') + ' ' + r.sel), bleed: bleed.map((r) => r.sel) }));

  /* (3b) ★ #46 r1 m-3: a long label wraps INSIDE the pill (the sweep measures it at 320 px) */
  ok(!!labelRule && decl(labelRule.body, 'min-width') === '0' && decl(labelRule.body, 'overflow-wrap') === 'anywhere' && decl(base.body, 'text-align') === 'center',
    '★ fixb2 item 1 (#46 r1 m-3): the label span has `min-width: 0; overflow-wrap: anywhere` (one long word of a long translation wraps inside the pill, which keeps the day pill\'s 16 px inset) and the pill centres wrapped lines — ' + JSON.stringify({ label: labelRule && labelRule.body, align: decl(base.body, 'text-align') }));
  /* (3c) ★ #46 r1 m-4: the marker can not be hidden by a rule at ANY at-rule depth */
  /* ★ #46 r2 (O3): the scan covers every way to hide or squash the marker or its span — display / visibility, a zero (max-)height / block-size, any opacity below 0.5,
     a scale(0…) transform, a clip-path / clip, font-size 0, a transparent ink — at any at-rule depth. The sweep measures the real box (height, label inside, opacity, transform, clip). */
  const hideKinds = (body) => {
    const k = [];
    if (/(^|[;\s])display\s*:\s*none/.test(body)) k.push('display');
    if (/(^|[;\s])visibility\s*:\s*(hidden|collapse)/.test(body)) k.push('visibility');
    if (/(^|[;\s])(max-|min-)?(height|block-size)\s*:\s*0(?![.\d%])/.test(body)) k.push('zero height');
    const op = /(^|[;\s])opacity\s*:\s*([\d.]+)(%?)/.exec(body);
    if (op && (op[3] ? parseFloat(op[2]) / 100 : parseFloat(op[2])) < 0.5) k.push('opacity');
    if (/(^|[;\s])transform\s*:[^;]*scale[XY]?\(\s*0(?![\d]*[1-9])/.test(body)) k.push('scale(0)');
    if (/(^|[;\s])(clip-path|clip)\s*:/.test(body)) k.push('clip');
    if (/(^|[;\s])font-size\s*:\s*0(?![.\d])/.test(body)) k.push('font-size 0');
    if (/(^|[;\s])color\s*:\s*transparent/.test(body)) k.push('transparent ink');
    return k;
  };
  const hiders = unread.filter((r) => hideKinds(r.body).length);
  ok(unread.length >= 1 && hiders.length === 0 && decl(base.body, 'display') === 'flex',
    '★ fixb2 item 1 (#46 r1 m-4): no `.c-unread-divider` rule at any media / supports depth hides it (display none, visibility hidden, a zero (max-)height / block-size, opacity < 0.5, scale(0), clip-path, font-size 0, a transparent ink) and its base rule is `display: flex` — ' + JSON.stringify({ hiders: hiders.map((r) => r.ctx.join(' ') + ' ' + r.sel + ' [' + hideKinds(r.body).join(',') + ']'), display: decl(base.body, 'display') }));

  /* (4) the DOM, in jsdom, through the shell's own push path */
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/navigation|Not implemented/i.test(e.message)) errs.push(e.message); });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + builtPath, virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) { /* none */ }
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    },
  });
  await sleep(1800);
  const W = dom.window, d = W.document;
  const b64 = (v) => Buffer.from(String(v), 'utf8').toString('base64');
  const push = (fn, ...a) => W.executeUiCommand(W[fn], ...a.map(b64));
  const T0 = Math.floor(Date.now() / 1000) - 3 * 86400;
  const items = [];
  for (let i = 0; i < 12; i++) items.push({ f: 'addThem', a: ['m' + (100 + i), 'addrPeer', 'Bob', '', 'Row ' + i, String(T0 + (i < 6 ? 0 : 86400) + i * 60), 'True', 'True', i >= 9 ? 'False' : 'True', 'False', 'False'] });
  push('onChatScreenReady', 'addrPeer'); push('clearMessages', 'true');
  push('addMessages', JSON.stringify({ strs: [], items }), 'append'); push('messagesDone'); push('onChatScreenLoaded');
  await sleep(2400);
  const log = d.getElementById('messages');
  const all = [...d.querySelectorAll('.c-unread-divider')];
  const el = all[0];
  const kids = log ? [...log.children] : [];
  const firstPill = kids.findIndex((k) => k.classList.contains('c-datesep'));
  const dom4 = {
    one: all.length === 1, direct: !!el && el.parentElement === log, role: !!el && el.getAttribute('role') === 'separator',
    label: !!el && el.children.length === 1 && el.firstElementChild.tagName === 'SPAN' && /\S/.test(el.textContent), noInline: !!el && !el.hasAttribute('style'),
    afterDatePill: !!el && firstPill >= 0 && kids.indexOf(el) > firstPill, datePillSibling: !!el && !!el.parentElement.querySelector(':scope > .c-datesep'),
    errs: errs.length,
    shown: !!el && W.getComputedStyle(el).display !== 'none' && W.getComputedStyle(el).visibility !== 'hidden',
  };
  dom.window.close();
  ok(dom4.one && dom4.direct && dom4.role && dom4.label && dom4.noInline && dom4.shown && dom4.afterDatePill && dom4.datePillSibling && dom4.errs === 0,
    '★ fixb2 item 1: the shell\'s own open of a chat with unread rows builds ONE `#messages > .c-unread-divider[role=separator]` (a single label span, no inline style), a sibling of the date pills and after the first of them — the marker the sweep measures — ' + JSON.stringify(dom4));

  /* (5) the gutter decision */
  const gutter = [...css.matchAll(/([^{}]+)\{([^{}]*scrollbar-gutter[^{}]*)\}/g)].filter((m) => /[.#]messages\b/.test(m[1]));
  ok(gutter.length === 1 && /:root\[data-desktop\] \.messages$/.test(gutter[0][1].trim()) && /scrollbar-gutter: stable both-edges/.test(gutter[0][2])
     && /:root\[data-desktop\] \.messages \{ padding-inline: max\(0px, calc\(\(100% - 760px\) \/ 2\)\); \}/.test(css),
    '★ fixb2 item 1 (decision): the both-edges gutter of fixb1 stays the ONLY scrollbar-gutter rule on the desktop log (the column, the pill and the composer keep ONE centre) and the 760 column padding is unchanged — ' + JSON.stringify(gutter.map((m) => m[1].trim() + ' { ' + m[2].trim() + ' }')));
}
