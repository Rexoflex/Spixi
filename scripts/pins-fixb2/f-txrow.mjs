/* ==== fixb2 item 6 (Mission Control n-20261116-desktop-txrow-inset-shape) — the desktop WALLET tx row paints the chat row's INSET ROUNDED SHAPE ====
 * Mechanism: DT-1 A (#1393) made the desktop chat row an inset rounded shape (`:root[data-desktop] .c-chatlist-item`: margin-inline
 * spacing-8, margin-block 1px, radius-12; chatlist-item.css). The wallet tx row still painted its hover / selected / pressed edge to
 * edge with square corners, although txlist-item.css says the selected row is "the CHAT-ROW treatment exactly … so the lists cannot
 * drift". Fix: `:root[data-desktop] .c-wallet-txlist > .c-txlist-item` takes the SAME three declarations (+ `width: auto`, so the
 * margins sit inside the column; the side padding drops by the same 8 px so the row's CONTENT stays on the wallet column's 16 px line).
 * This pin READS BOTH RULES (the chat row's and the tx row's) from the BUILT home shell (index.html — it carries both lists) and from the
 * two source sheets, and requires the same margin-inline, margin-block and radius on each — it holds no list of its own values.
 *   (1) the chat row's desktop rule exists and declares all three, each on a token (var(--spacing-…) / var(--radius-…), no literal px
 *       except the 1px block margin, which is whatever the chat rule says);
 *   (2) the tx row's desktop rule declares the SAME margin-inline, margin-block and border-radius, EXACTLY (string equal);
 *   (3) it is scoped to the wallet list (`.c-wallet-txlist >`): the chat-info card keeps its full-bleed square rows (chat-info.css),
 *       and `width: auto` is set (the base `width: 100%` would overflow the margins);
 *   (4) phones: every rule of the built shell that sets margin / border-radius / width on `.c-txlist-item` sits under `:root[data-desktop]`
 *       (the card's own `.c-chat-info__txs-list .c-txlist-item { border-radius: 0 }` is the only exception) — the phone row is unchanged,
 *       full width, no inset.
 * ★ #46 r1 (O1): the first version matched a rule nested in ANY @media, so wrapping the tx rule in `@media (max-width: 1px) { … }` stayed green. Now (a) the text
 *   rules are read at TOP LEVEL only (an at-rule walker), and (b) the COMPUTED values are compared on the BUILT home shell in jsdom (the desktop flag,
 *   both themes, a real chat row and a real wallet tx row after the shell's own push path; jsdom applies only top-level / `screen` rules, so an unmatched
 *   @media wrap computes to nothing): margin-inline, margin-block, border-radius EQUAL on the desktop; the phone tx row is `width: 100%` with none.
 * Deliberate breaks (fixb2 report, #802): the tx rule wrapped in `@media (max-width: 1px) { … }` → the computed row, the top-level rows and the phone-free rows fail; the tx rule's `border-radius: var(--radius-12)` → `var(--radius-8)` (+ build-shells) → (2) fails;
 *   its `margin-inline: var(--spacing-8)` → `var(--spacing-4)` → (2) fails; the selector `:root[data-desktop] .c-wallet-txlist >
 *   .c-txlist-item` → `.c-wallet-txlist > .c-txlist-item` (no desktop scope) → (4) fails. */
export default async function (h) {
  const { ok, root, readFileSync, join, stripCssComments } = h;
  const flatten = (t) => stripCssComments(t).replace(/\s+/g, ' ');
  const sheets = {
    'the BUILT home shell': flatten([...readFileSync(join(root, 'Spixi/Resources/Raw/html/index.html'), 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')),
    'the source sheets': flatten(readFileSync(join(root, 'src/styles/components/chatlist-item.css'), 'utf8') + '\n' + readFileSync(join(root, 'src/styles/components/txlist-item.css'), 'utf8')),
  };
  /* top-level rules only (an at-rule walker: a rule inside any @media / @supports does NOT count — #46 r1 O1) */
  const walkRules = (text) => {
    const out = [];
    const walk = (t, depth) => {
      let i = 0;
      while (i < t.length) {
        const o = t.indexOf('{', i); if (o < 0) break;
        const pre = t.slice(i, o).trim(); let d = 1, j = o + 1;
        while (j < t.length && d) { if (t[j] === '{') d++; else if (t[j] === '}') d--; j++; }
        const inner = t.slice(o + 1, j - 1);
        if (pre.startsWith('@')) walk(inner, depth + 1); else out.push({ sel: pre, body: inner.trim(), depth });
        i = j;
      }
    };
    walk(text, 0);
    return out;
  };
  const body = (css, sel) => {
    const all = walkRules(css).filter((r) => r.depth === 0 && r.sel === sel).map((r) => r.body);
    return all.length ? all.join(' ') : null;
  };
  const decl = (b, p) => { const m = b && new RegExp('(?:^|[;\\s])' + p + '\\s*:\\s*([^;]+?)\\s*(?:;|$)').exec(b); return m ? m[1].trim() : null; };
  const CHAT = ':root[data-desktop] .c-chatlist-item';
  const TX = ':root[data-desktop] .c-wallet-txlist > .c-txlist-item';
  for (const [where, css] of Object.entries(sheets)) {
    const cb = body(css, CHAT), tb = body(css, TX);
    const want = { 'margin-inline': decl(cb, 'margin-inline'), 'margin-block': decl(cb, 'margin-block'), 'border-radius': decl(cb, 'border-radius') };
    ok(!!cb && /^var\(--spacing-\d+\)$/.test(want['margin-inline']) && /^(var\(--spacing-\d+\)|\d+px)$/.test(want['margin-block']) && /^var\(--radius-\d+\)$/.test(want['border-radius']),
      '★ fixb2 item 6 [' + where + ']: the chat row\'s desktop rule (' + CHAT + ') declares the inset shape on tokens — ' + JSON.stringify(want));
    const got = { 'margin-inline': decl(tb, 'margin-inline'), 'margin-block': decl(tb, 'margin-block'), 'border-radius': decl(tb, 'border-radius') };
    ok(!!tb && Object.keys(want).every((k) => want[k] && got[k] === want[k]),
      '★ fixb2 item 6 [' + where + ']: the desktop WALLET tx row (' + TX + ') has the chat row\'s margin-inline, margin-block and border-radius, EXACTLY — chat ' + JSON.stringify(want) + ' · tx ' + JSON.stringify(got));
    ok(!!tb && decl(tb, 'width') === 'auto', '★ fixb2 item 6 [' + where + ']: the inset tx row sets `width: auto` (the base `width: 100%` would push the margins out of the column) — ' + JSON.stringify(decl(tb, 'width')));
  }
  /* (4) phones + the card: every rule that sets margin / radius / width on .c-txlist-item is desktop-scoped (the chat-info card's square rows excepted) */
  const css = sheets['the BUILT home shell'];
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim().replace(/^.*\} /, ''), body: m[2].trim() }));
  /* rules whose selector LIST names the tx row itself (not a child class such as .c-txlist-item__time) and that set margin / radius / width */
  const onRow = rules.filter((r) => r.sel.split(/\s*,\s*/).some((p) => /\.c-txlist-item(?![\w-])/.test(p.replace(/^.*[\s>]\.c-txlist-item(?=\[|:|$)/, '.c-txlist-item')) && /\.c-txlist-item(?![\w-])(?:\[[^\]]*\]|:[\w-]+(?:\([^)]*\))?)*$/.test(p))
    && /(^|[;\s])(margin[a-z-]*|border-radius|width)\s*:/.test(r.body));
  const baseRule = onRow.find((r) => r.sel === '.c-txlist-item');
  const phoneRules = onRow.filter((r) => r !== baseRule && !/:root\[data-desktop\]/.test(r.sel) && !/\.c-chat-info__txs-list/.test(r.sel));
  const phone = { base: baseRule ? decl(baseRule.body, 'width') : null, baseHasMarginOrRadius: !!baseRule && /margin|border-radius/.test(baseRule.body), others: phoneRules.map((r) => r.sel) };
  ok(phone.base === '100%' && !phone.baseHasMarginOrRadius && phone.others.length === 0,
    '★ fixb2 item 6: phone rows are UNCHANGED — the base `.c-txlist-item` is full width (100%) with no margin / radius, and no other rule on the tx row sets margin / radius / width outside :root[data-desktop] (the chat-info card\'s square rows excepted) — ' + JSON.stringify(phone));
  ok(!/:root\[data-desktop\] \.c-txlist-item \{[^}]*(margin-inline|border-radius)/.test(css) && /\.c-chat-info__txs-list \.c-txlist-item \{ border-radius: 0; \}/.test(flatten(readFileSync(join(root, 'src/styles/components/chat-info.css'), 'utf8'))),
    '★ fixb2 item 6: the inset is NOT on every `.c-txlist-item` — the chat-info card keeps its full-bleed square rows (no global desktop margin / radius rule on the tx row; chat-info.css `border-radius: 0` stays)');
  /* (5) COMPUTED, on the BUILT home shell in jsdom (#46 r1 O1) */
  const { aKit } = await import('../pins-s11/a-kit.mjs');
  const K = aKit(h);
  const TS = Math.floor(Date.now() / 1000);
  const got = {};
  for (const [kind, desktop] of [['desktop', true], ['phone', false]]) for (const theme of ['light', 'dark']) {
    const sh = await K.boot('index.html', { desktop, theme: theme === 'dark' ? 'dark' : '' });
    sh.push('clearChats');
    for (const [a, n, dt] of [['A1', 'Mira', 60], ['A2', 'Falcon', 600]]) sh.push('addChat', a, n, String(TS - dt), 'img/spixiavatar.png', 'false', 'hi', '', '0', '', 'False', 'text', '');
    sh.push('clearChatsDone');
    sh.push('selectTab', 'tab2'); await K.sleep(100);
    sh.push('clearPaymentActivity', 'all'); sh.push('addPaymentActivity', 't1', '0', 'Demo', String(TS - 3600), '25', '', 'true'); sh.push('clearPaymentActivityDone');
    await K.sleep(250);
    const g = (e) => { if (!e) return null; const c = sh.W.getComputedStyle(e); return { mi: c.getPropertyValue('margin-inline'), mb: c.getPropertyValue('margin-block'), br: c.getPropertyValue('border-radius'), w: c.getPropertyValue('width'), pi: c.getPropertyValue('padding-inline') }; };
    got[kind + '/' + theme] = { flag: sh.d.documentElement.hasAttribute('data-desktop'), chat: g(sh.d.querySelector('.c-chats-list .c-chatlist-item')), tx: g(sh.d.querySelector('#wallet-scroll .c-wallet-txlist > .c-txlist-item')), tools: g(sh.d.querySelector('#wallet-scroll .c-wallet-tools')) };
    sh.close();
  }
  const same = (a) => !!a.chat && !!a.tx && a.chat.mi === 'var(--spacing-8)' && a.chat.mb === '1px' && a.chat.br === 'var(--radius-12)' && a.tx.mi === a.chat.mi && a.tx.mb === a.chat.mb && a.tx.br === a.chat.br;
  /* ★ #46 r2 (O3 MINOR-1): the row's CONTENT stays on the wallet column's one line (S14 #1291): margin-inline + padding-inline of the tx row = the tools row's padding-inline */
  const sp = (v) => { const m = /^var\(--spacing-(\d+)\)$/.exec(v || ''); return m ? Number(m[1]) : NaN; };
  const aligned = (a) => !!a.tools && sp(a.tx.mi) + sp(a.tx.pi) === sp(a.tools.pi);
  ok(['desktop/light', 'desktop/dark'].every((k) => got[k].flag && aligned(got[k])),
    '★ fixb2 item 6 (#46 r2): COMPUTED on the desktop: the tx row\'s margin-inline + padding-inline equal the wallet tools row\'s padding-inline (the inset moves the paint, not the content: it stays level with the search pill) — ' + JSON.stringify({ l: got['desktop/light'], d: got['desktop/dark'] }));
  ok(['desktop/light', 'desktop/dark'].every((k) => got[k].flag && same(got[k])),
    '★ fixb2 item 6 (#46 r1): COMPUTED on the BUILT home shell (jsdom, the desktop flag, light and dark): a real wallet tx row has the chat row\'s margin-inline, margin-block and border-radius — ' + JSON.stringify({ l: got['desktop/light'], d: got['desktop/dark'] }));
  ok(['phone/light', 'phone/dark'].every((k) => !got[k].flag && got[k].tx && got[k].tx.w === '100%' && !got[k].tx.mi && !got[k].tx.mb && !got[k].tx.br),
    '★ fixb2 item 6 (#46 r1): COMPUTED on the phone (no desktop flag): the tx row is full width (`100%`) with no margin and no radius — ' + JSON.stringify({ l: got['phone/light'], d: got['phone/dark'] }));

}
