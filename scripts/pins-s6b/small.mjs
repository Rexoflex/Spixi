/* ==== SESSION 6b — ★ #1202 small fixes (agent F) ====
 *   (a) dark "Show all" (Damir 2026-10-05): .cd-shared-takeover / .cd-send-takeover are position: fixed; inset: 0 and
 *       painted over the body's pane-2 hairline → in body[data-pane="2"] each cover carries the SAME line. COMPUTED on
 *       the BUILT contact_details shell (jsdom) in both themes, the var() chain resolved through the document's own
 *       computed custom properties; absent outside pane 2 (data-pane="1", none).
 *   (b) the light chat log thumb (Damir 2026-10-05: "looked like dark mode"): --chat-scroll-thumb light = the SAME
 *       outline-neutral-02 as chat info (#1134 did dark) — resolved in the BUILT tokens css, both themes.
 * One ok() per item; each key is named in the hand-back's break list. */
export default async function (h) {
  const { ok, root, readFileSync, join, JSDOM, VirtualConsole, sleep } = h;
  const boot = async (file) => {
    const f = join(root, 'Spixi/Resources/Raw/html/' + file);
    const errs = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => { const m = String(e.message); if (!/navigation|Not implemented|Could not parse CSS/i.test(m)) errs.push(m); });
    const dom = new JSDOM(readFileSync(f, 'utf8'), {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + f, virtualConsole: vc,
      beforeParse(w) {
        w.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
        try { w.HTMLCanvasElement.prototype.getContext = () => null; } catch (e) {}
        w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      },
    });
    await sleep(1500);
    return { dom, W: dom.window, d: dom.window.document, errs };
  };
  /* resolve "var(--a)" chains against the html element's computed custom properties (jsdom keeps them as text) */
  const resolver = (W) => {
    const rootCs = () => W.getComputedStyle(W.document.documentElement);
    const res = (v, n = 0) => {
      v = String(v || '').trim();
      const m = /^var\((--[\w-]+)\)$/.exec(v);
      if (!m || n > 12) return v;
      return res(rootCs().getPropertyValue(m[1]), n + 1);
    };
    return res;
  };
  const theme = (W, t) => { if (t === 'dark') W.document.documentElement.dataset.theme = 'dark'; else delete W.document.documentElement.dataset.theme; };

  /* ———— (a) the pane-2 hairline on both covers ———— */
  try {
    const { dom, W, d, errs } = await boot('contact_details.html');
    const res = resolver(W);
    const covers = ['cd-shared-takeover', 'cd-send-takeover'].map((c) => { const e = d.createElement('div'); e.className = c; d.body.append(e); return e; });
    const lineOf = (el) => {   // "1px solid <resolved colour>" or '' — the shorthand as cascaded, its var() resolved
      const v = String(W.getComputedStyle(el).getPropertyValue('border-inline-start') || '').trim();
      const m = /^(\S+)\s+(\S+)\s+(.+)$/.exec(v);
      return m ? m[1] + ' ' + m[2] + ' ' + res(m[3]) : '';
    };
    const r = {};
    for (const t of ['light', 'dark']) {
      theme(W, t);
      d.body.dataset.pane = '2';
      const bodyLine = lineOf(d.body);
      const want = '1px solid ' + res('var(--outline-neutral-03)');
      r[t + 'Body'] = bodyLine === want && /^#|^rgb/.test(res('var(--outline-neutral-03)'));
      r[t + 'Shared'] = lineOf(covers[0]) === want;
      r[t + 'Send'] = lineOf(covers[1]) === want;
      r[t + 'Fixed'] = covers.every((c) => W.getComputedStyle(c).getPropertyValue('position') === 'fixed');
      r[t + 'Colour'] = want.split(' ')[2];
      d.body.dataset.pane = '1';
      r[t + 'Pane1None'] = covers.every((c) => lineOf(c) === '');
      delete d.body.dataset.pane;
      r[t + 'NoPaneNone'] = covers.every((c) => lineOf(c) === '');
    }
    r.themesDiffer = r.lightColour !== r.darkColour;
    r.noErr = errs.filter((e) => /ReferenceError|TypeError/.test(e)).length === 0;
    const pass = Object.entries(r).every(([k, v]) => /Colour$/.test(k) || v === true);
    ok(pass,
      '★ #1202 (a) (Damir, dark "Show all"): on the BUILT contact_details shell, in pane 2 the shared-items cover and the money cover each carry the body\'s own leading hairline (1px solid outline-neutral-03, resolved per theme, light AND dark) — they are fixed covers that paint over the body\'s line; in pane 1 and with no pane they carry none — ' + JSON.stringify(r));
    dom.window.close();
  } catch (e) { ok(false, '★ #1202 (a) pin threw: ' + (e && e.stack || e)); }

  /* ———— (b) the light chat thumb = outline-neutral-02 (both themes, the built tokens css) ———— */
  try {
    const { dom, W } = await boot('contact_details.html');   // links the shared spixi.tokens.css (the one the chat shell links)
    const res = resolver(W);
    const r = {};
    for (const t of ['light', 'dark']) {
      theme(W, t);
      const thumb = res('var(--chat-scroll-thumb)');
      r[t + 'Thumb'] = thumb;
      r[t + 'IsOutline02'] = !!thumb && thumb === res('var(--outline-neutral-02)');
      r[t + 'NotText02'] = thumb !== res('var(--text-neutral-02)');
    }
    const built = readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const decl = [...built.matchAll(/--chat-scroll-thumb:\s*([^;]+);/g)].map((m) => m[1].trim());
    r.builtDecls = decl.length === 2 && decl.every((v) => v === 'var(--outline-neutral-02)');
    r.chatLinks = readFileSync(join(root, 'Spixi/Resources/Raw/html/chat.html'), 'utf8').includes('href="spixi.tokens.css"');
    const pass = Object.entries(r).every(([k, v]) => /Thumb$/.test(k) || v === true);
    ok(pass,
      '★ #1202 (b) (Damir 2026-10-05: "the light chat thumb looked like dark mode"): --chat-scroll-thumb resolves to outline-neutral-02 in LIGHT (was text-02) and in dark (#1134), never text-02 — the built tokens css the chat shell links — ' + JSON.stringify(r));
    dom.window.close();
  } catch (e) { ok(false, '★ #1202 (b) pin threw: ' + (e && e.stack || e)); }
}
