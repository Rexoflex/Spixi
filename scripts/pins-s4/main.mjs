/* Session 4 — main-session pins (#1134). */
export default async function (h) {
  const { ok, root, readFileSync, join, stripCssComments } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');

  /* —— #1134 (Damir dark screenshots): the chat log scroll thumb is DARK in dark, like chat info —— */
  {
    const tok = stripCssComments(rd('src/styles/tokens.css'));
    const mb = stripCssComments(rd('src/styles/components/message-bubble.css'));
    const built = rd('Spixi/Resources/Raw/html/chat.html');
    /* the two declarations of the token, in source order: light (:root block) first, dark second */
    const decl = [...tok.matchAll(/--chat-scroll-thumb:\s*([^;]+);/g)].map((m) => m[1].trim());
    const darkStart = tok.indexOf('--chat-canvas-base: var(--ink-950);');
    const darkDecl = (/--chat-scroll-thumb:\s*([^;]+);/.exec(tok.slice(Math.max(0, darkStart - 400), darkStart)) || [])[1];
    const r = {
      twoDecls: decl.length === 2,
      light: decl[0] === 'var(--text-neutral-02)',
      dark: darkDecl && darkDecl.trim() === 'var(--outline-neutral-02)',
      /* the dark value is the SAME one every other dark scroller uses (base.css .u-scroll) */
      sameAsBase: /\.u-scroll:hover, \.u-scroll:focus-within \{\s*scrollbar-color: var\(--outline-neutral-02\) transparent;/.test(stripCssComments(rd('src/styles/base.css'))),
      rulesUseToken: (mb.match(/\.c-chat-canvas \.u-scroll[^{]*\{[^}]*var\(--chat-scroll-thumb\)/g) || []).length === 2
        && !/\.c-chat-canvas \.u-scroll[^{]*\{[^}]*var\(--text-neutral-02\)/.test(mb),
      shipped: rd('Spixi/Resources/Raw/html/spixi.tokens.css').includes('--chat-scroll-thumb: var(--outline-neutral-02)') && built.includes('var(--chat-scroll-thumb)'),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1134 (Damir dark screenshots: "chat info has a proper dark scroll bar, in chat it is very bright"): the chat log thumb takes --chat-scroll-thumb — light keeps text-02 (3:1 on the tinted canvases), dark = outline-neutral-02, the same thumb as chat info and every other .u-scroll — ' + JSON.stringify(r));
  }
}
