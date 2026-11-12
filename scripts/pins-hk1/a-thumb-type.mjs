/* ==== Session HK1 (housekeeping, #1481) — the iOS / Mac SThumbnail compile fix.
 *
 * Mechanism (office walk #1459, tracker n-20261015-mac-thumbnail-compile): SThumbnail.cs imports BOTH `CoreGraphics`
 * and `ImageIO`. On the .NET 10 Apple SDKs each namespace has a type named `CGImageProperties`, so the bare name on
 * the `src.GetProperties(0)` line is ambiguous and neither the iPhone nor the Mac target compiles (4 errors, CS0104 +
 * the follow-ups). The fix is the qualified name `CoreGraphics.CGImageProperties` (the type GetProperties returns —
 * it carries PixelWidth / PixelHeight). Damir's Mac built with exactly this edit at the office.
 *
 * The smoke cannot compile for iOS / Mac Catalyst (no Apple SDK in the twin or on ubuntu CI), so this is a SOURCE pin.
 * It does NOT use the shared stripCode: it masks comments itself (`mask` below — comments become spaces, newlines
 * stay), so every reported `file:line` is the line of the RAW file. Strings are kept as they are; the code inside an
 * interpolation hole (`$"{…}"`) is read as code. What it holds (3 checks):
 *   1 + 2 — each SThumbnail file: the header-size read `… props = src.GetProperties(0);` is typed in a spelling that
 *           compiles — `CoreGraphics.CGImageProperties` (with or without `?`), the same with `global::` in front, or
 *           `var` — the guard after it still reads props.PixelWidth / props.PixelHeight through PhotoRules.pixelsOk,
 *           the file has no bare `CGImageProperties`, and nothing in it is declared `ImageIO.CGImageProperties`.
 *   3     — the sweep, cases derived from the tree (#771): EVERY .cs file (any letter case of the extension) under
 *           `Spixi/` and `Spixi-PushService/` (bin / obj skipped) in which both namespaces are in scope uses the name
 *           only qualified, and no file declares anything as `ImageIO.CGImageProperties`. "In scope" = a `using X;`
 *           or `using global::X;` in the file, a `global using X;` anywhere in the same project, a
 *           `<Using Include="X" />` item in the project file, or (CoreGraphics only) `<ImplicitUsings>enable` there —
 *           the Apple SDKs' implicit usings carry CoreGraphics. The sweep must find the two SThumbnail files (never
 *           vacuous). A UTF-8 BOM at the start of a file is dropped before the read (128 of the 268 files have one).
 * Known limits (#46 r1 P-6, r2 n1 / n2):
 *   · raw string literals (`"""…"""`, `$$"""…"""`) are read as ordinary text, so a quote count inside one can shift
 *     what the mask takes for a comment on those lines (a bare use behind one can be missed);
 *   · the name inside a STRING literal counts as a bare use — a FALSE RED, on purpose (strings are not masked: masking
 *     them would hide real code wherever the mask mis-reads a raw string);
 *   · a `using` alias, `using static`, a `<Using … Alias= / Static=>` item and usings from an imported .props / .targets
 *     file are not scope;
 *   · a dangling symlink under the swept folders makes the read throw (ENOENT) — the smoke stops loudly, it does not pass.
 * The pin reads text: it cannot prove that the line compiles — the next iPhone / Mac build does.
 * Deliberate breaks: docs/review-brief-hk1.md § 5 (B1–B5 of the build, M1–M6 of #46 round 1, the round-2 reader's breaks). */
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');   // BOM off, CRLF → LF

  /* comments → spaces (newlines kept); strings and char literals kept; interpolation holes are code */
  const mask = (t) => {
    const out = t.split('');
    const n = t.length;
    const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
    const str = (i, verbatim, interp) => {          // i = index of the opening quote; returns the index after the string
      i++;
      while (i < n) {
        const c = t[i];
        if (verbatim) {
          if (c === '"') { if (t[i + 1] === '"') { i += 2; continue; } return i + 1; }
        } else {
          if (c === '\\') { i += 2; continue; }
          if (c === '"') return i + 1;
          if (c === '\n') return i;                  // an unterminated ordinary string ends with its line
        }
        if (interp && c === '{') { if (t[i + 1] === '{') { i += 2; continue; } i = code(i + 1, true); continue; }
        i++;
      }
      return i;
    };
    const code = (i, hole) => {                      // returns the index after the hole's `}` (or n)
      let depth = 0;
      while (i < n) {
        const c = t[i], d = t[i + 1];
        if (c === '/' && d === '/') { let e = t.indexOf('\n', i); if (e < 0) e = n; blank(i, e); i = e; continue; }
        if (c === '/' && d === '*') { let e = t.indexOf('*/', i + 2); e = e < 0 ? n : e + 2; blank(i, e); i = e; continue; }
        if (c === '\'') { const m = /^'(?:\\.[^']*|[^'\\\n])'/.exec(t.slice(i, i + 12)); i += m ? m[0].length : 1; continue; }
        if (c === '"') { i = str(i, false, false); continue; }
        if (c === '@' && d === '"') { i = str(i + 1, true, false); continue; }
        if (c === '$' && d === '"') { i = str(i + 1, false, true); continue; }
        if ((c === '$' && d === '@' || c === '@' && d === '$') && t[i + 2] === '"') { i = str(i + 2, true, true); continue; }
        if (hole) { if (c === '{') depth++; else if (c === '}') { if (depth === 0) return i + 1; depth--; } }
        i++;
      }
      return i;
    };
    code(0, false);
    return out.join('');
  };

  const BARE = /(?<![\w.])CGImageProperties\b/g;                                   // the name with nothing in front
  const IO_TYPED = /(?<![\w.])(?:global::)?ImageIO\.CGImageProperties\s*\??\s+[A-Za-z_]\w*/g;   // a declaration typed ImageIO.…
  const usingOf = (t, ns) => new RegExp('^[ \\t]*using\\s+(?:global::)?' + ns + '\\s*;', 'm').test(t);
  const globalOf = (t, ns) => new RegExp('^[ \\t]*global\\s+using\\s+(?:global::)?' + ns + '\\s*;', 'm').test(t);
  const csprojUsing = (x, ns) => new RegExp('<Using\\s+Include\\s*=\\s*"' + ns + '"(?![^>]*\\b(?:Alias|Static)\\s*=)[^>]*>', 'i').test(x);   // an MSBuild global using
  const lineOf = (t, i) => t.slice(0, i).split('\n').length;
  const hits = (f, t, re) => [...t.matchAll(re)].map((m) => f + ':' + lineOf(t, m.index));

  /* ── 1 + 2: the two files ── */
  const TYPE = '(?:var|(?:global::)?CoreGraphics\\.CGImageProperties\\s*\\??)';   // `?` optional: both spellings compile
  const READ = new RegExp('(?<![\\w.])' + TYPE + '\\s+props\\s*=\\s*src\\.GetProperties\\(0\\)\\s*;');
  const GUARD = new RegExp(READ.source + '\\s*if\\s*\\(\\s*props\\s*!=\\s*null\\s*&&\\s*!SPIXI\\.PhotoRules\\.pixelsOk\\(\\s*props\\.PixelWidth\\s*\\?\\?\\s*0\\s*,\\s*props\\.PixelHeight\\s*\\?\\?\\s*0\\s*\\)\\s*\\)\\s*\\{\\s*return\\s+null\\s*;\\s*\\}');
  const one = (f) => {
    const t = mask(raw(f));
    return {
      bothImported: usingOf(t, 'CoreGraphics') && usingOf(t, 'ImageIO'),
      readCompiles: READ.test(t),
      oneRead: (t.match(/=\s*src\.GetProperties\(/g) || []).length === 1,
      guardKept: GUARD.test(t),
      bare: hits(f, t, BARE),
      imageIoTyped: hits(f, t, IO_TYPED),
    };
  };
  for (const [os, f] of [['iOS', 'Spixi/Platforms/iOS/SThumbnail.cs'], ['Mac', 'Spixi/Platforms/MacCatalyst/SThumbnail.cs']]) {
    const r = one(f);
    ok(r.bothImported && r.readCompiles && r.oneRead && r.guardKept && r.bare.length === 0 && r.imageIoTyped.length === 0,
      '★ HK1 SThumbnail (' + os + '): the header-size read names its type in a spelling that compiles — `CoreGraphics.CGImageProperties? props = src.GetProperties(0);` (with or without `?`; or `global::CoreGraphics.…`; or `var`) — because the file imports CoreGraphics AND ImageIO and the bare name does not compile on ' + os + ' (ambiguous, office walk #1459); it is the ONE read, the pixelsOk guard still follows it, and nothing is declared as `ImageIO.CGImageProperties` — ' + JSON.stringify(r));
  }

  /* ── 3: the sweep — both projects, scope per project ── */
  const walk = (dir, out) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (e.isDirectory()) { if (e.name !== 'bin' && e.name !== 'obj' && e.name !== 'node_modules') walk(dir + '/' + e.name, out); }
      else if (e.name.toLowerCase().endsWith('.cs')) out.push(dir + '/' + e.name);
    }
    return out;
  };
  const inScope = [], bare = [], ioTyped = [];
  const projects = [], counts = {};
  for (const proj of ['Spixi', 'Spixi-PushService']) {
    if (!existsSync(join(root, proj))) continue;
    const files = walk(proj, []).map((f) => [f, mask(raw(f))]);
    const csproj = readdirSync(join(root, proj)).filter((x) => x.endsWith('.csproj')).map((x) => raw(proj + '/' + x)).join('\n');
    const implicit = /<ImplicitUsings>\s*(?:enable|true)\s*<\/ImplicitUsings>/i.test(csproj);
    const gCG = files.some(([, t]) => globalOf(t, 'CoreGraphics')) || csprojUsing(csproj, 'CoreGraphics');
    const gIO = files.some(([, t]) => globalOf(t, 'ImageIO')) || csprojUsing(csproj, 'ImageIO');
    projects.push({ proj, implicitUsings: implicit, globalCoreGraphics: gCG, globalImageIO: gIO });
    counts[proj] = files.length;
    for (const [f, t] of files) {
      ioTyped.push(...hits(f, t, IO_TYPED));
      const cg = implicit || gCG || usingOf(t, 'CoreGraphics'), io = gIO || usingOf(t, 'ImageIO');
      if (!cg || !io) continue;
      inScope.push(f);
      bare.push(...hits(f, t, BARE));
    }
  }
  const sweep = {
    projects,
    findsBoth: inScope.includes('Spixi/Platforms/iOS/SThumbnail.cs') && inScope.includes('Spixi/Platforms/MacCatalyst/SThumbnail.cs'),
    bare,
    imageIoTyped: ioTyped,
  };
  const good = sweep.findsBoth && projects.length === 2 && bare.length === 0 && ioTyped.length === 0;
  /* #46 r2 n7: the file counts change with every new .cs file, so they stay OUT of a green row's name (a stable name);
     a red row carries them, with the list of files that have both namespaces in scope */
  if (!good) { sweep.files = counts; sweep.bothInScope = inScope; }
  ok(good,
    '★ HK1 sweep: no .cs file under Spixi/ or Spixi-PushService/ that has both CoreGraphics and ImageIO in scope (a using in the file, a global using in the project or its project file, implicit usings) uses the bare name `CGImageProperties` (write `CoreGraphics.CGImageProperties`), and no file declares anything as `ImageIO.CGImageProperties`; the sweep sees the two SThumbnail files — ' + JSON.stringify(sweep));
}
