/* ==== S15 unit B — O-08 + O-09 (#1293): ONE sweep keeps the HTML-sink count where it is, source AND built output.
 *
 * O-08: the suite pinned `innerHTML` absence in four per-FILE places; a new sink in any other file shipped silently. This
 * module walks src/components/**, src/shells/**, src/bridge/** AND the built tree Spixi/Resources/Raw/html/** (the bytes
 * the app loads — the build injects code no source file carries, which is how O-09 hid), strips comments with the shared
 * tokenizer (a docblock that NAMES a banned sink is not a sink), counts every HTML-sink token per file and compares the
 * result with a NAMED allow-list: file + sink + count + reason. Any file, sink or count not on the list fails, and so does
 * an allow-list entry that no longer matches (a stale entry is a hole someone can later fill).
 *   Sinks: innerHTML · outerHTML · insertAdjacentHTML · document.write(ln) · parseFromString (any MIME — the one use is
 *   'text/html') · createContextualFragment · setHTMLUnsafe / parseHTMLUnsafe. Counted as TOKENS, not only as assignments:
 *   a read or a ['innerHTML'] bracket access counts too, so the allow-list is the only way past.
 *   Exclusions (named, each must exist): the vendored third-party scanner js/html5-qrcode.min.js (legacy, Apache-2.0, injected
 *   by scan.html at runtime — not ours to edit, and minified code defeats the comment tokenizer); any directory named `demo`
 *   (the #967 walk's rule: src/demo is the browser demo + its mock layer, never shipped — none sits under these roots today).
 * O-09: build-shells.mjs's missing-asset panel was `document.documentElement.innerHTML = '<pre…>'` in all 18 shells. It is
 *   DOM-built now, so the built shells carry ZERO sinks except index.html's two (home.html's own); the panel is EXECUTED
 *   below with the shared assets missing and must show the same words as text.
 * Deliberate breaks (S15 B): an `x.innerHTML = s` added to a component · the old innerHTML panel back in build-shells.mjs
 * (rebuilt) · a sink inside a comment only (must NOT fail) · the counter's comment strip removed · an allow-list count off by
 * one — each fails (or, for the comment case, holds) its key. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join, JSDOM, VirtualConsole, sleep } = h;

  const KINDS = {
    innerHTML: /\binnerHTML\b/g,
    outerHTML: /\bouterHTML\b/g,
    insertAdjacentHTML: /\binsertAdjacentHTML\b/g,
    documentWrite: /\bdocument\s*\.\s*write(?:ln)?\b/g,
    parseFromString: /\bparseFromString\b/g,
    createContextualFragment: /\bcreateContextualFragment\b/g,
    htmlUnsafe: /\b(?:setHTMLUnsafe|parseHTMLUnsafe)\b/g,
  };
  const countSinks = (text) => {
    const code = stripCode(text);
    const out = {};
    for (const [k, re] of Object.entries(KINDS)) {
      const n = (code.match(re) || []).length;
      if (n) out[k] = n;
    }
    return out;
  };

  const ROOTS = ['src/components', 'src/shells', 'src/bridge', 'Spixi/Resources/Raw/html'];
  const EXCLUDE = {
    'Spixi/Resources/Raw/html/js/html5-qrcode.min.js': 'vendored third-party QR scanner (legacy, Apache-2.0), injected by scan.html at runtime; minified',
  };
  const ALLOW = [
    { file: 'src/components/icons.js', kind: 'innerHTML', n: 1, why: 'iconFactory writes a STATIC registry body into a fresh <svg>; bodies are generated from src/assets/icons and gated at generation (gate 21)' },
    { file: 'src/components/icons.iife.js', kind: 'innerHTML', n: 1, why: 'the generated IIFE twin of icons.js (same static registry write)' },
    { file: 'src/components/illustrations.js', kind: 'innerHTML', n: 1, why: 'a STATIC module constant into a fresh <svg> (ids suffixed with a counter)' },
    { file: 'src/components/seasonal.js', kind: 'innerHTML', n: 1, why: 'svgFrom: static seasonal markup + the registry\'s own logo paths into a fresh <svg>' },
    { file: 'src/shells/home.html', kind: 'innerHTML', n: 1, why: 'decodeEntities: a detached <textarea> (RCDATA — no element can be created) to decode C#-sent entities; read back as .value, rendered as textContent' },
    { file: 'src/shells/home.html', kind: 'parseFromString', n: 1, why: '#321 HUD: the C#-composed dev HUD is parsed INERT (text/html, never attached) and re-rendered as textContent cells' },
    { file: 'Spixi/Resources/Raw/html/spixi.icons.js', kind: 'innerHTML', n: 1, why: 'built from src/components/icons.iife.js' },
    { file: 'Spixi/Resources/Raw/html/spixi.bundle.js', kind: 'innerHTML', n: 2, why: 'built: illustrations.js + seasonal.js (above)' },
    { file: 'Spixi/Resources/Raw/html/index.html', kind: 'innerHTML', n: 1, why: 'built from src/shells/home.html (decodeEntities)' },
    { file: 'Spixi/Resources/Raw/html/index.html', kind: 'parseFromString', n: 1, why: 'built from src/shells/home.html (#321 HUD)' },
  ];

  const scanned = [];
  const found = {};
  const walk = (rel) => {
    for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
      const p = rel + '/' + e.name;
      if (e.isDirectory()) { if (e.name !== 'demo') walk(p); continue; }
      if (!/\.(?:m?js|html?)$/i.test(e.name) || EXCLUDE[p]) continue;
      scanned.push(p);
      const c = countSinks(readFileSync(join(root, p), 'utf8'));
      for (const [k, n] of Object.entries(c)) found[p + ' · ' + k] = n;
    }
  };
  for (const r of ROOTS) walk(r);
  const diffSinks = (got, allow) => {
    const want = {};
    for (const a of allow) want[a.file + ' · ' + a.kind] = a.n;
    const bad = [];
    for (const [k, n] of Object.entries(got)) if (want[k] !== n) bad.push(k + ' = ' + n + (k in want ? ' (allowed ' + want[k] + ')' : ' (NOT on the allow-list)'));
    for (const [k, n] of Object.entries(want)) if (!(k in got)) bad.push(k + ' allowed ' + n + ' but found 0 (stale entry)');
    return bad;
  };

  /* the counter itself, on fixtures — a sweep that counts nothing passes on everything */
  const fx = {
    each: countSinks('a.innerHTML = s; b.outerHTML = s; c.insertAdjacentHTML("x", s); document.write(s); document . writeln(s);'
      + ' new DOMParser().parseFromString(s, "text/html"); r.createContextualFragment(s); e.setHTMLUnsafe(s); d["innerHTML"] = s;'),
    comments: countSinks('// a.innerHTML = s\n/* b.outerHTML = s; document.write(s) */\n<!-- c.insertAdjacentHTML(s) -->\nlet ok = 1;'),
  };
  const fxOk = JSON.stringify(fx.each) === JSON.stringify({ innerHTML: 2, outerHTML: 1, insertAdjacentHTML: 1, documentWrite: 2, parseFromString: 1, createContextualFragment: 1, htmlUnsafe: 1 })
    && Object.keys(fx.comments).length === 0
    && diffSinks({ 'x.js · innerHTML': 1 }, []).length === 1
    && diffSinks({}, [{ file: 'x.js', kind: 'innerHTML', n: 1 }]).length === 1
    && diffSinks({ 'x.js · innerHTML': 2 }, [{ file: 'x.js', kind: 'innerHTML', n: 1 }]).length === 1;
  ok(fxOk, '★ S15 O-08 (#1293): the sink counter sees every sink kind in code (incl. a bracket access and document . writeln), counts NOTHING inside // /* */ <!-- --> comments, and the allow-list compare fails on a new file, a stale entry and a count change — ' + JSON.stringify(fx));

  const perRoot = ROOTS.map((r) => scanned.filter((p) => p.startsWith(r + '/')).length);
  const exclOk = Object.keys(EXCLUDE).every((p) => existsSync(join(root, p)));
  ok(perRoot[0] >= 80 && perRoot[1] >= 18 && perRoot[2] >= 4 && perRoot[3] >= 21 && exclOk,
    '★ S15 O-08 (#1293): the sweep READ every root — src/components ' + perRoot[0] + ', src/shells ' + perRoot[1] + ', src/bridge ' + perRoot[2] + ', the built Raw/html ' + perRoot[3] + ' files — and each named exclusion is a real file (a sweep over nothing passes on everything)');

  const bad = diffSinks(found, ALLOW);
  ok(bad.length === 0,
    '★★ S15 O-08 (#1293): the HTML sinks in src/components, src/shells, src/bridge and the BUILT Raw/html are exactly the named allow-list (static svg bodies, the textarea entity decode, the inert #321 HUD parse, and their built copies) — a new sink anywhere fails here. Off-list: ' + (bad.join(' | ') || 'none'));

  /* O-09, behaviour: run the built panel with every shared asset missing */
  const built = (f) => readFileSync(join(root, 'Spixi/Resources/Raw/html', f), 'utf8');
  const shells = readdirSync(join(root, 'Spixi/Resources/Raw/html')).filter((f) => f.endsWith('.html')).sort();
  const guardOf = (t) => {
    const m = t.match(/<script>\(function\(\)\{var m=\[[\s\S]*?\}\)\(\);<\/script>\s*<\/body>/);
    return m ? m[0].replace(/\s*<\/body>$/, '') : '';
  };
  const noSinkGuard = shells.filter((f) => { const g = guardOf(built(f)); return g && Object.keys(countSinks(g)).length === 0 && /textContent=/.test(g); });
  ok(shells.length === 18 && noSinkGuard.length === 18,
    '★ S15 O-09 (#1293): all 18 built shells carry the missing-asset panel, and in every one it is DOM-built (textContent), with no HTML sink — ' + noSinkGuard.length + '/' + shells.length);
  {
    const vc = new VirtualConsole();
    const errs = [];
    vc.on('jsdomError', (e) => errs.push(e.message));
    vc.on('error', () => {});
    const g = guardOf(built('chat.html'));
    const dom = new JSDOM('<!doctype html><html><head><title>t</title><style>p{}</style></head><body><div id="x">old</div>' + g + '</body></html>',
      { runScripts: 'dangerously', virtualConsole: vc });
    await sleep(20);
    const d = dom.window.document;
    const pre = d.querySelector('pre');
    const r = {
      onlyBody: d.documentElement.children.length === 1 && d.documentElement.firstElementChild === d.body && !d.head,
      onePre: !!pre && d.body.children.length === 1 && d.body.firstElementChild === pre,
      text: !!pre && pre.textContent === 'Spixi could not load: spixi.icons.js, spixi.strings.js, spixi.bundle.js, spixi.tokens.css, spixi.base.css\n\nThe shell and its shared assets must sit in the SAME folder.\nRe-run: node scripts/build-shells.mjs',
      style: !!pre && /color: ?(?:#f66|rgb\(255, 102, 102\))/.test(pre.getAttribute('style') || '') && /monospace/.test(pre.getAttribute('style') || ''),
      noOld: !d.getElementById('x'),
      noErr: errs.length === 0,
    };
    ok(Object.values(r).every(Boolean),
      '★ S15 O-09 (#1293): EXECUTED — with every shared asset missing, the built chat.html panel replaces the document with one body holding one <pre> (same style), naming the missing files in load order as TEXT, with no page error — ' + JSON.stringify(r));
    dom.window.close();
  }
}
