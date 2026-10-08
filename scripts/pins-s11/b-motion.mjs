/* ==== S11 B (#1262) — TOKENS + MOTION for the illustration set, read where the device reads them ====
 *   · TOKENS (BUILT spixi.tokens.css): every --il-* / --rn-* the art references (read out of the BUILT bundle's art
 *     strings) is defined in the :root set AND in a [data-theme="dark"] set; the light/dark values are the design
 *     file's .t-light/.t-dark sets; --rn-* are ALIASES (var(--il-*)) in both blocks; no component sheet declares an
 *     --il- or --rn- token (tokens live in tokens.css only)
 *   · MOTION (illo.css as BUILT into every shell that draws the set — index, intro, settings, settings_backup —
 *     linked exactly once): every il-* / rn-* class the art uses has an animation; NOTHING loops (no `infinite`, the
 *     only count above 1 is il-dot's three-beat settle) and every animation fills `both` = one entrance, then the
 *     frame holds; reduced motion = `animation: none` on every part of .il and .rn-illo (static)
 * Deliberate breaks: see the S11 B report. */
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, join, stripCssComments } = h;
  const dir = join(root, 'Spixi/Resources/Raw/html');
  const bundle = readFileSync(join(dir, 'spixi.bundle.js'), 'utf8');
  const artStart = bundle.indexOf('const IL_ART = {');
  const art = artStart >= 0 ? bundle.slice(artStart, bundle.indexOf('\n};', artStart)) : '';

  /* —— tokens —— */
  const tok = stripCssComments(readFileSync(join(dir, 'spixi.tokens.css'), 'utf8'));
  const block = (re) => { const o = {}; for (const m of tok.matchAll(re)) for (const dd of m[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)) o[dd[1]] = dd[2].trim(); return o; };
  const light = block(/(?:^|\})\s*:root\s*\{([^}]*)\}/g);
  const dark = block(/(?:^|\})\s*\[data-theme="dark"\]\s*\{([^}]*)\}/g);
  const used = [...new Set([...art.matchAll(/var\((--(?:il|rn)-[\w-]+)\)/g)].map((m) => m[1]))];
  const missing = used.filter((t) => !(t in light) || !(t in dark));
  const L = { '--il-glow': '#9aa8ff', '--il-shadow': '#3b3f9e', '--il-shadow-a': '.16', '--il-ground-a': '.12', '--il-spark': '#7186ff', '--il-dotc': '#ac90ff', '--il-screen': '#f4f5f8', '--il-recv': '#e3e6ee', '--il-recv-line': '#9aa0b2', '--il-card': '#ffffff', '--il-card-2': '#f1f2f7', '--il-card-side': '#cdd2e0', '--il-orbit': 'rgba(110, 92, 230, .26)', '--il-orbit-strong': 'rgba(110, 92, 230, .5)', '--il-ring-a': '.9', '--il-ring-c': '#7c6cf0' };
  const D = { '--il-glow': '#6c63ff', '--il-shadow': '#0b0a2a', '--il-shadow-a': '.32', '--il-ground-a': '.38', '--il-spark': '#bcc8ff', '--il-dotc': '#c7b5ff', '--il-screen': '#15171c', '--il-recv': '#2b2f3a', '--il-recv-line': '#8b91a3', '--il-card': '#262a36', '--il-card-2': '#2a2e39', '--il-card-side': '#15171e', '--il-orbit': 'rgba(186, 170, 255, .28)', '--il-orbit-strong': 'rgba(186, 170, 255, .55)', '--il-ring-a': '.7', '--il-ring-c': '#ffffff' };
  const badVal = Object.keys(L).filter((k) => light[k] !== L[k] || dark[k] !== D[k]);
  const rn = Object.keys(light).filter((k) => k.startsWith('--rn-'));
  const badAlias = rn.filter((k) => light[k] !== 'var(--il-' + k.slice(5) + ')' || dark[k] !== light[k]);
  const compDir = join(root, 'src/styles/components');
  const strayTok = readdirSync(compDir).filter((f) => f.endsWith('.css')).filter((f) => /--(?:il|rn)-[\w-]+\s*:/.test(stripCssComments(readFileSync(join(compDir, f), 'utf8'))));
  ok(art.length > 50000 && used.length >= 20 && missing.length === 0 && badVal.length === 0 && rn.length >= 9 && badAlias.length === 0 && strayTok.length === 0,
    '★ S11 B (#1262): every --il-*/--rn-* the art reads is defined light AND dark in the BUILT token sheet with the design file\'s values, --rn-* are aliases of --il-* in both blocks, and no component sheet declares one — ' + JSON.stringify({ used: used.length, missing, badVal, rn: rn.length, badAlias, strayTok }));

  /* —— motion —— */
  const classes = [...new Set([...art.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).concat(
    [...art.matchAll(/cls: '([^']+)'/g)].flatMap((m) => m[1].split(/\s+/))))].filter((c) => /^(il|rn)-/.test(c) && !/^(il-ground|rn-illo|rn-once)$/.test(c));
  const shells = ['index.html', 'intro.html', 'settings.html', 'settings_backup.html'];
  const per = {};
  for (const f of shells) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const css = stripCssComments([...raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n'));
    const once = (raw.match(/\.rn-once \.rn-rise \{/g) || []).length === 1;
    const anim = {};
    for (const c of classes) {
      const r = new RegExp('(?:^|[}\\s,])(?:\\.rn-once )?\\.' + c + ' \\{([^}]*)\\}').exec(css);
      const rep = r ? /\s(\d+)\s+both;/.exec(r[1]) : null;
      const count = rep ? +rep[1] : 1;
      anim[c] = !!r && /animation:\s*[^;]+\bboth;/.test(r[1]) && !/infinite/.test(r[1]) && (count === 1 || (c === 'il-dot' && count === 3));
    }
    const dotOk = /\.il-dot \{[^}]*\s3 both;/.test(css);
    const rm = /@media \(prefers-reduced-motion: reduce\) \{\s*\.il \*, \.rn-illo \* \{ animation: none !important; \}/.test(css);
    const noLoop = !/\.(?:il|rn)-[\w-]+[^{}]*\{[^}]*infinite/.test(css);
    per[f] = once && dotOk && rm && noLoop && Object.values(anim).every(Boolean);
    if (!per[f]) per[f] = { once, dotOk, rm, noLoop, bad: Object.keys(anim).filter((k) => !anim[k]) };
  }
  ok(classes.length >= 18 && Object.values(per).every((v) => v === true),
    '★ S11 B: illo.css ships ONCE in each art shell; all ' + classes.length + ' il-*/rn-* parts animate ONCE with fill both (no loop; il-dot\'s three-beat settle the only repeat) and reduced motion = static — ' + JSON.stringify(per));
}
