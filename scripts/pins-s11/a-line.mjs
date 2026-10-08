/* ==== S11 A — item 2 (#1262): the connecting line, blue → violet in ONE strip (Damir's pick B) ====
 * The rule as BUILT into the two shells that draw it (index.html · chat.html — the shared topbar.css), and its stops
 * resolved through the BUILT token sheet: transparent 0% · brand blue #3050bd 30% · indigo #5b6cf0 48% · violet
 * #9468f2 66% · transparent 100%. The violet (and both blues) are tokens; the animation and the reduced-motion SOLID
 * rule are unchanged (the line is state, not decoration — it holds under reduced motion).
 * Deliberate breaks: see the S11 A report. */
export default async function (h) {
  const { ok, root, readFileSync, join, stripCssComments } = h;
  const r = {};
  const tok = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html/spixi.tokens.css'), 'utf8'));
  const light = {};
  for (const m of tok.slice(0, tok.indexOf('[data-theme="dark"] {')).matchAll(/(--[\w-]+):\s*([^;]+);/g)) light[m[1]] = m[2].trim();
  const res = (n, k = 0) => { const v = light[n]; if (!v || k > 8) return null; const m = /^var\((--[\w-]+)\)$/.exec(v); return m ? res(m[1], k + 1) : v.toLowerCase(); };
  r.tokens = res('--connecting-line-blue') === '#3050bd' && res('--connecting-line-indigo') === '#5b6cf0' && res('--connecting-line-violet') === '#9468f2';
  for (const shell of ['index.html', 'chat.html']) {
    const css = stripCssComments(readFileSync(join(root, 'Spixi/Resources/Raw/html', shell), 'utf8'));
    const rule = (/\.c-topbar\[data-connecting-bar\]::after \{([^}]*)\}/.exec(css) || [])[1] || '';
    const grad = (/background-image: linear-gradient\(([^;]*)\);/.exec(rule) || [])[1] || '';
    const stops = grad.split(',').map((x) => x.trim().replace(/\s+/g, ' '));
    r[shell + ':stops'] = JSON.stringify(stops) === JSON.stringify(['90deg', 'transparent 0%', 'var(--connecting-line-blue) 30%',
      'var(--connecting-line-indigo) 48%', 'var(--connecting-line-violet) 66%', 'transparent 100%']);
    r[shell + ':sweep'] = /animation: topbar-connecting 1\.6s linear infinite;/.test(rule) && /background-size: 220% 100%;/.test(rule);
    r[shell + ':reduceSolid'] = /@media \(prefers-reduced-motion: reduce\) \{\s*\.c-topbar\[data-connecting-bar\]::after \{\s*animation: none;\s*background-image: none;\s*background-color: var\(--surface-action-default\);\s*opacity: 0\.6;\s*\}/.test(css);
  }
  ok(Object.values(r).every((x) => x === true),
    '★ S11 A item 2 (#1262): the connecting line blends brand blue (30%) → indigo (48%) → violet (66%) in ONE strip on BOTH shells that draw it, every stop a token resolving to #3050bd / #5b6cf0 / #9468f2; the sweep and the reduced-motion solid rule unchanged — ' + JSON.stringify(r));
}
