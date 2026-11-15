/* ==== perflean P-06 (pins-b) — the lean CSS strip and the packaging CLI, executed (docs/contract-perflean.md § 3.3) ====
 *
 * What is pinned. `node scripts/strip-release.mjs --lean-css` packs every *.html (each inline <style> body comment-stripped) and every
 * linked *.css comment-stripped; with no flag it is today's strip (spixi.tokens.css only). A comment that holds a `*SL{` carrier or
 * a licence word stays byte for byte. The strip THROWS (exit 1, nothing written) on input it cannot strip safely.
 *
 * These pins are BEHAVIOUR (#771 / #798): nothing here reads source text of the code under test. The CLI runs in a TEMP copy made with
 * cpSync (scripts/strip-release.mjs, scripts/lib, Spixi/Resources/Raw/html — it imports nothing else), packages are made in os.tmpdir()
 * too, never in the working tree; everything is removed in `finally`. A mutation of a package that does not apply FAILS its row.
 * Only Node built-ins and the suite's `jsdom` are used (no parser package).
 *
 * Rows (every title starts "★ perflean P-06"):
 *  1  OFF = today: no flag, `--out` writes exactly ONE file spixi.tokens.css == h.stripCssComments(committed); with env
 *     SPIXI_PACKAGED_LEAN=css,js and no flag `--out` still writes only that file (same bytes); `--check` of a package made from it
 *     prints GATE 1 OK; the unstripped committed tree fails the same check (not vacuous).
 *  2  the lean package ≡ the transform BY AN INDEPENDENT ROUTE: `--check --lean-css` exit 0 + GATE 1 OK; then every committed and every
 *     packaged shell parsed with JSDOM (no scripts run): the same <style> / <script> elements in the same order, every script text
 *     identical, every packaged style text === stripCssLean(committed style text), the document outside the style bodies identical
 *     (serialisation with every style blanked), every linked *.css === stripCssLean(committed). File lists come from the directory.
 *  3  ONLY COMMENTS WENT: a view written in this file (left to right, strings / url() / escapes verbatim, comments dropped, white space
 *     removed) is equal for committed and packaged — every linked sheet and every inline style body; and by THIS file's own scan of the
 *     F1 rule (not stripCssLean / cssComments / cssView): per comment (i) inside a custom-property value? (ii) previous significant char
 *     `{` `;` `}` or the start? (iii) a keep word (keepReason is called for the words only)? the comments left in the packaged text are,
 *     in order and byte for byte, exactly the committed ones that are not removable by (i)–(iii); the removed ones were all at a boundary,
 *     outside custom-property values, without a keep word; the statement / value around every kept in-value comment is byte for byte
 *     unchanged; the number kept by the VALUE rule is > 0 and printed in the title; every committed notice comment (this file's own rule:
 *     carrier / licence / OFL / `/＊!`) is still there (the 3 carriers of spixi.base.css named).
 *  4  the size claim: packaged html + css bytes are at least 25 % smaller (the numbers are in the title).
 *  5a ONE committed .css put back / ONE committed inline style body put back in a packaged shell → `--check --lean-css` exit 1, that
 *     file named (`packaged ≠ lean(committed)`), and nothing else.
 *  5b the carrier `*SL{SpixiP1}` folded to `0` in packaged chat.html (named with both counts) and in the out-of-scope spixi.bundle.js.
 *  5c a packaged file deleted: an in-scope .css, an in-scope shell (MISSING), an out-of-scope script (committed but MISSING).
 *  5d a stray extra.css / extra.html / sub/extra.js → each named "in the package but NOT in the committed tree".
 *  5e a package is checked with the flags it was built with: no flag on the lean package, --lean-css (and env css) on the plain one → exit 1.
 *  5f the OFF-mode `--check`: a missing shell, a carrier fold, the unstripped tokens.css, a line lost in spixi.bundle.js → exit 1, named.
 *  6  env SPIXI_PACKAGED_LEAN: `--check` with no flag + env css on the lean package → GATE 1 OK; env bogus → exit 2; an explicit flag
 *     wins over the env; an importer sees STRIP_ALLOWLIST === ['spixi.tokens.css'] with no env (and with env js) and every *.css with env css / css,js.
 *  7  CLI edges: an unknown flag (`--lean-cs`) → exit 2 naming it and writing nothing; no argument → exit 2; `--out` without a value → exit 2;
 *     `--out <fresh dir> --lean-css` prints one line per file and the count == the files really present (== every html + css of the
 *     committed tree, no temp leftover, nothing else).
 *  8  FAIL CLOSED: in the temp tree, spixi.base.css gets (a) an unterminated `/*`, (b) a string with a line break (`.zz { content: "abc }` — the old
 *     "token glue" throw is gone: a comment between two tokens is now KEPT, see row 9b), (c) a NUL; and the last
 *     shell wallet_sent.html an unterminated comment in a style body → `--out <empty dir> --lean-css` exits 1, names the file, the out dir holds NO file.
 *  9b the value rule on small inputs: `1px/＊＊/solid` stays, a comment in a selector list / before `{` / before `;` stays, boundary comments go,
 *     EVERY comment inside a custom-property value stays; a line without a removed comment is not changed by one byte (review B-1 / B-2);
 *     every output also passes checkCssStrip.
 *  9  the corpus: every `css` and `html` case of corpus/cases.mjs gives its expect or throws a message matching its `throws`; every
 *     non-throwing output is idempotent (≥ 20 cases ran, ≥ 10 unchanged and ≥ 10 changed) AND passes the exact post-condition (checkCssStrip /
 *     checkLeanHtml; no case is excluded).
 * 10  stripCssComments is unchanged (h.stripCssComments === the copy's export); spixi.tokens.css by flag: NO flag and --lean-js ALONE = today's strip
 *     byte for byte (CLI + leanScope), --lean-css and css,js = stripCssLean (a DIFFERENT text); leanScope without legacyTokensStrip throws when lean CSS is off.
 * 11  the post-conditions THEMSELVES (review B-6 / B-7): checkCssStrip / checkLeanHtml, called directly, THROW on each of 30 wrong outputs (a kept comment
 *     removed or reworded, `.a .b` → `.a.b`, `1px 2px` → `1px2px`, white space changed away from a comment, a trimmed hex escape, a deleted
 *     declaration, a removable comment left in, changed markup, an out-of-scope body changed) for the right reason, and accept the right output.
 * 12  the boundary / keep rules on small inputs: `)` `:` `,` are no boundary, bracket depth (B-3), escapes (B-4a), refusals (B-4b), licence / URL /
 *     attribution / carrier comments keep their statement.
 * 13  the white-space rule on small inputs (B-1, B-2, (b) (c) (d), LF / CRLF / CR / FF, the four spans-lines shapes), exact outputs.
 * 14  the HTML walk on small inputs: the `type` rules of <script> / <style>, the foreign-content STACK, <select> / <frameset>, `--!>`, refused raw
 *     text (<iframe> <xmp> …), U+0130 accepted.
 *
 * 15 (review round 2, B-1) value blocks keep EVERY comment inside them at any depth (`@property … initial-value: {…}`, `color: {…}`, `&:hover {`, an
 *     unknown at-rule, a grouping at-rule inside a style rule …).
 * 16 the rules context still strips (`a:hover {` at the top level / in @media / @supports, @keyframes, @font-face, `@page :first`, `& > b {`, every grouping at-rule …).
 * 17 custom-property names (B-6) and the CSS survivors of the round-2 mutation run (S1–S5).
 * 18 round 2 points 2–5: CDO / CDC (B-3), the slash-star keep (B-4), empty sheets, the checker's view of `\` + CRLF in a string (B-5).
 * 19 checkCssStrip on WRONG outputs of the round-2 rules (each value-block form, a slash-star run, a removable comment left in).
 * 20 the HTML walk, round 2: integration points inside <svg> / <math> (B-2) and the survivors S6 (single-quoted attribute), S7 (`src=""`), S8 (x-javascript).
 *
 * PACKAGED RUN: with SPIXI_PACKAGED_FROM set (scripts/smoke-packaged.mjs) the committed tree is the ORIGINAL tree (`base`), not h.root.
 *
 * Run time: see the report (CLI calls ~0.5–2.5 s each, the JSDOM pass over the shells is most of it). NO row asserts a time.
 *
 * Deliberate breaks (project rule #802) — one token each, in a full copy; the failed rows are in the pins-b report of batch perflean.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync as readRaw, writeFileSync, appendFileSync, mkdtempSync, mkdirSync, cpSync, rmSync, readdirSync as readDir, statSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pjoin, resolve as presolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const J0 = JSON.stringify;

export default async function (h) {
  const { ok, root, JSDOM, VirtualConsole, stripCssComments } = h;
  const HTML = 'Spixi/Resources/Raw/html';
  /* ★ the COMMITTED tree. Inside a packaged run (scripts/smoke-packaged.mjs) h.root is the already stripped COPY and SPIXI_PACKAGED_FROM names the
   * ORIGINAL tree's Raw/html: everything this pin reads, copies or imports as "committed" comes from `base`. No env → base = h.root.
   * An env that does not name a tree this pin can use FAILS the row — never a silent fallback to the stripped copy. */
  let base = root;
  if (process.env.SPIXI_PACKAGED_FROM) {
    const from = presolve(process.env.SPIXI_PACKAGED_FROM);
    const cand = presolve(from, '..', '..', '..', '..');
    if (pjoin(cand, 'Spixi', 'Resources', 'Raw', 'html') !== from || !existsSync(pjoin(cand, 'scripts', 'strip-release.mjs'))) {
      ok(false, '★ perflean P-06 the committed tree cannot be resolved: SPIXI_PACKAGED_FROM=' + J0(process.env.SPIXI_PACKAGED_FROM) + ' is not <tree>/' + HTML + ' of a tree that holds scripts/strip-release.mjs');
      return;
    }
    base = cand;
  }
  const lib = await import(pathToFileURL(pjoin(base, 'scripts/lib/lean-strip.mjs')).href);
  const { stripCssLean, leanHtml, keepReason, checkCssStrip, checkLeanHtml, leanScope } = lib;
  const J = JSON.stringify;
  const NUL = String.fromCharCode(0);
  const NBSP = String.fromCharCode(0xa0), I_DOT = String.fromCharCode(0x130);      // U+00A0 (content, not a blank) · U+0130 (a letter that String#toLowerCase turns into two characters)
  const row = (title, problems) => ok(problems.length === 0, '★ perflean P-06 ' + title + (problems.length ? ' — ' + problems.slice(0, 4).join(' | ') + (problems.length > 4 ? ' | … +' + (problems.length - 4) : '') : ''));
  const t0 = Date.now();

  const tmp = mkdtempSync(pjoin(tmpdir(), 'pin-p06-'));
  try {
    /* ---------- the temp tree the CLI runs in: scripts/strip-release.mjs + scripts/lib + the committed html ---------- */
    const tree = pjoin(tmp, 'tree');
    mkdirSync(pjoin(tree, 'scripts'), { recursive: true });
    mkdirSync(pjoin(tree, HTML, '..'), { recursive: true });
    cpSync(pjoin(base, 'scripts/strip-release.mjs'), pjoin(tree, 'scripts/strip-release.mjs'));
    cpSync(pjoin(base, 'scripts/lib'), pjoin(tree, 'scripts/lib'), { recursive: true });
    cpSync(pjoin(base, HTML), pjoin(tree, HTML), { recursive: true });
    const CLI = pjoin(tree, 'scripts/strip-release.mjs');
    const COMMITTED = pjoin(tree, HTML);
    const text = (dir, rel) => readRaw(pjoin(dir, rel), 'utf8');
    const walk = (dir) => {
      const out = [];
      const go = (d, pre) => { for (const e of readDir(d, { withFileTypes: true })) { if (e.isDirectory()) go(pjoin(d, e.name), pre + e.name + '/'); else out.push(pre + e.name); } };
      if (existsSync(dir)) go(dir, '');
      return out.sort();
    };
    const files = walk(COMMITTED);
    const shells = files.filter((f) => /\.html$/.test(f));
    const sheets = files.filter((f) => /\.css$/.test(f));
    const shipped = files.filter((f) => /\.(html|css)$/.test(f));

    let nCli = 0;
    /** run the CLI; env = extra variables (SPIXI_PACKAGED_LEAN is removed unless given: a packaged smoke run exports it) */
    const cli = (args, env = {}) => {
      nCli++;
      const e = { ...process.env }; delete e.SPIXI_PACKAGED_LEAN; delete e.SPIXI_PACKAGED_FROM; Object.assign(e, env);
      const r = spawnSync(process.execPath, [CLI, ...args], { cwd: tmp, env: e, encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
      return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '', out: (r.stdout || '') + (r.stderr || ''), err: r.error && r.error.message, signal: r.signal };
    };
    const brief = (r) => 'exit ' + r.code + (r.err ? ' (' + r.err + ')' : '') + ': ' + r.out.trim().split('\n').slice(-1)[0].slice(0, 110);
    const problemLines = (r) => r.stderr.split('\n').filter((l) => l.startsWith('  '));   // the lines under the "GATE 1 FAILED" header
    /** a package = a copy of the committed html dir; overlay = the files `--out` wrote */
    const makePackage = (name, outArgs) => {
      const outDir = pjoin(tmp, name + '-out'), pkg = pjoin(tmp, name);
      cpSync(COMMITTED, pkg, { recursive: true });
      const r = cli(['--out', outDir, ...outArgs]);
      if (r.code === 0 && existsSync(outDir)) cpSync(outDir, pkg, { recursive: true, force: true });
      return { r, outDir, pkg };
    };
    /** change one file of a package, run `fn`, put the exact bytes back (delete when it did not exist) */
    const withFile = (dir, rel, mutate, fn) => {
      const p = pjoin(dir, rel);
      const had = existsSync(p), orig = had ? readRaw(p) : null;
      try {
        const bad = mutate(had ? orig.toString('utf8') : null, p);
        if (bad) return { bad };
        return { r: fn() };
      } finally {
        if (had) writeFileSync(p, orig); else { try { unlinkSync(p); } catch (_) { /* never written */ } }
      }
    };
    const putText = (p, s) => { mkdirSync(pjoin(p, '..'), { recursive: true }); writeFileSync(p, s, 'utf8'); };

    /* ---------- the two packages most rows reuse ---------- */
    const plain = makePackage('plain', []);                // no flag: today's package (tokens.css stripped)
    const lean = makePackage('lean', ['--lean-css']);      // --lean-css
    const plainPkg = plain.pkg, leanPkg = lean.pkg;

    /* ===================== 1 · OFF = today ===================== */
    {
      const p = [];
      if (plain.r.code !== 0) p.push('--out with no flag ' + brief(plain.r));
      const wrote = walk(plain.outDir);
      if (J(wrote) !== J(['spixi.tokens.css'])) p.push('--out with no flag wrote ' + J(wrote) + ' (want exactly ["spixi.tokens.css"])');
      const committedTokens = text(COMMITTED, 'spixi.tokens.css');
      const want = stripCssComments(committedTokens);
      if (!want.length || want === committedTokens) p.push('today\'s strip of spixi.tokens.css is empty or removed nothing (vacuous)');
      if (existsSync(pjoin(plain.outDir, 'spixi.tokens.css')) && text(plain.outDir, 'spixi.tokens.css') !== want) p.push('spixi.tokens.css is not h.stripCssComments(committed)');
      const chk = cli(['--check', plainPkg]);
      if (chk.code !== 0 || !/GATE 1 OK/.test(chk.stdout.trim().split('\n').pop())) p.push('--check of the no-flag package: ' + brief(chk) + ' (want exit 0, last line "GATE 1 OK")');
      const envOut = pjoin(tmp, 'plain-env-out');
      const er = cli(['--out', envOut], { SPIXI_PACKAGED_LEAN: 'css,js' });
      if (er.code !== 0 || J(walk(envOut)) !== J(['spixi.tokens.css'])) p.push('--out with env css,js and no flag wrote ' + J(walk(envOut)) + ' / ' + brief(er) + ' (the env must not reach --out)');
      else if (text(envOut, 'spixi.tokens.css') !== want) p.push('--out with env css,js and no flag: spixi.tokens.css differs from the no-flag bytes');
      const un = cli(['--check', COMMITTED]);
      if (un.code !== 1 || !un.out.includes('spixi.tokens.css: packaged ≠ strip(committed)')) p.push('--check of the UNSTRIPPED committed tree: ' + brief(un) + ' (want exit 1 naming spixi.tokens.css)');
      row('OFF = today: no flag → --out writes exactly one file (spixi.tokens.css = h.stripCssComments(committed), also with env SPIXI_PACKAGED_LEAN=css,js), --check of that package prints GATE 1 OK, the unstripped tree fails it', p);
    }

    /* ===================== 2 · the lean package ≡ the transform, by an independent route ===================== */
    const bodies = [];     // every inline <style> body: { file, k, c: committed text, p: packaged text }
    {
      const p = [];
      if (lean.r.code !== 0) p.push('--out --lean-css ' + brief(lean.r));
      const chk = cli(['--check', leanPkg, '--lean-css']);
      const nScope = shipped.length;
      if (chk.code !== 0 || !/GATE 1 OK/.test(chk.stdout) || !chk.stdout.includes(nScope + ' file(s) in scope')) p.push('--check --lean-css on the lean package: ' + brief(chk) + ' (want exit 0, GATE 1 OK, ' + nScope + ' file(s) in scope)');
      const dom = (html) => {
        const d = new JSDOM(html, { virtualConsole: new VirtualConsole() });       // no scripts run, no resource loads
        const els = [];
        const go = (node) => {
          for (const c of node.childNodes) {
            if (c.nodeType !== 1) continue;
            if (c.localName === 'style' || c.localName === 'script') els.push(c);
            if (c.localName === 'template' && c.content) go(c.content);
            go(c);
          }
        };
        go(d.window.document);
        const items = els.map((e) => ({ tag: e.localName, text: e.textContent, type: e.getAttribute('type') }));
        for (const e of els) if (e.localName === 'style') e.textContent = '';
        const rest = d.serialize();
        d.window.close();
        return { items, rest };
      };
      let nStyle = 0, nScript = 0, nShrunk = 0;
      for (const f of shells) {
        let A, B;
        try { A = dom(text(COMMITTED, f)); B = dom(text(leanPkg, f)); } catch (e) { p.push(f + ': ' + e.message); continue; }
        const tagsA = A.items.map((x) => x.tag).join(','), tagsB = B.items.map((x) => x.tag).join(',');
        if (tagsA !== tagsB) { p.push(f + ': the <style> / <script> elements differ (' + A.items.length + ' vs ' + B.items.length + ')'); continue; }
        for (let k = 0; k < A.items.length; k++) {
          const a = A.items[k], b = B.items[k];
          if (a.tag === 'script') {
            nScript++;
            if (a.text !== b.text) p.push(f + ': <script> #' + k + ' text changed');
          } else {
            nStyle++;
            // the style element's type rule (B-5c): absent, empty or exactly text/css (ASCII case-insensitive, NOT trimmed)
            const ty = a.type === null ? '' : a.type.replace(/[A-Z]+/g, (m) => m.toLowerCase());
            let want;
            try { want = (ty === '' || ty === 'text/css') ? stripCssLean(a.text, { file: f + ' style #' + k }) : a.text; } catch (e) { p.push(f + ': stripCssLean threw on style #' + k + ': ' + e.message.slice(0, 80)); continue; }
            if (b.text !== want) p.push(f + ': <style> #' + k + ' ≠ stripCssLean(committed body)');
            if (b.text !== a.text) nShrunk++;
            bodies.push({ file: f, k, c: a.text, p: b.text });
          }
        }
        if (A.rest !== B.rest) { let k = 0; while (k < A.rest.length && A.rest[k] === B.rest[k]) k++; p.push(f + ': the document outside the style bodies changed near ' + J(A.rest.slice(Math.max(0, k - 20), k + 30))); }
      }
      let nSheet = 0;
      for (const f of sheets) {
        nSheet++;
        let want; try { want = stripCssLean(text(COMMITTED, f), { file: f }); } catch (e) { p.push(f + ': stripCssLean threw: ' + e.message.slice(0, 80)); continue; }
        if (text(leanPkg, f) !== want) p.push(f + ': packaged ≠ stripCssLean(committed)');
      }
      if (!shells.length || !sheets.length) p.push('no shells (' + shells.length + ') or no stylesheets (' + sheets.length + ') found — vacuous');
      if (nStyle === 0 || nScript === 0) p.push('compared ' + nStyle + ' style bodies and ' + nScript + ' scripts (vacuous)');
      if (nShrunk === 0) p.push('no style body got shorter — the strip removed nothing from the shells (vacuous)');
      row('the lean package ≡ the transform by an independent route: --check --lean-css OK, and via JSDOM ' + shells.length + ' shells (' + nStyle + ' style bodies = stripCssLean(committed), ' + nShrunk + ' shorter; ' + nScript + ' scripts identical; the rest of every document identical) + ' + nSheet + ' linked sheets = stripCssLean(committed)', p);
    }

    /* ===================== 3 · only comments went away ===================== */
    {
      const p = [];
      /* this file's own view: left to right; a string, an unquoted url( … ) and a backslash escape are copied verbatim; a comment is dropped
       * (and listed); white space outside literals is removed */
      const view = (css) => {
        let skel = '', i = 0;
        const n = css.length;
        while (i < n) {
          const c = css[i];
          if (c === '/' && css[i + 1] === '*') { const j = css.indexOf('*/', i + 2); if (j < 0) throw new Error('unterminated comment'); i = j + 2; continue; }
          if (c === '"' || c === "'") { let j = i + 1; while (j < n && css[j] !== c) { if (css[j] === '\\') j++; j++; } skel += css.slice(i, j + 1); i = j + 1; continue; }
          if (c === '\\') { skel += css.slice(i, i + 2); i += 2; continue; }
          if ((c === 'u' || c === 'U') && /^url\(/i.test(css.slice(i, i + 4)) && !/[A-Za-z0-9_\-\\\u0080-￿]/.test(css[i - 1] || '')) {
            let k = i + 4; while (k < n && /\s/.test(css[k])) k++;
            if (css[k] === '"' || css[k] === "'") { skel += 'url('; i = k; continue; }
            let j = k; while (j < n && css[j] !== ')') { if (css[j] === '\\') j++; j++; }
            skel += css.slice(i, j + 1); i = j + 1; continue;
          }
          if (/\s/.test(c)) { i++; continue; }
          skel += c; i++;
        }
        return skel;
      };
      /* ★ F1 — this file's OWN scan of the comment rule (it never calls stripCssLean / cssComments / checkCssStrip / cssView): for every comment
       * of a sheet it decides (i) is it inside the value of a custom property (from the `:` of a `--name:` declaration that starts at a
       * statement boundary to the `;` at bracket depth 0 or the `}` that closes the block), (ii) is the previous SIGNIFICANT character (not white
       * space, not a comment; a string counts as its quote, url(…) as `)`, an escape as the escaped character) `{` `;` `}` or the start of the
       * sheet, (iii) the statement it sits in (first significant character → the next `;` `{` `}` outside literals) and the custom-property extent.
       * Strings, unquoted url(…) and escapes are skipped as literals. */
      const scan = (css) => {
        const n = css.length, res = [];
        let i = 0, prev = null, depth = 0, cpFrom = -1, sigFrom = -1, open = [];
        const boundary = () => prev === null || prev === '{' || prev === ';' || prev === '}';
        const endStmt = (at) => { for (const r of open) r.stmt = css.slice(r.sigFrom, at); open = []; sigFrom = -1; };
        const endCp = (at) => { for (const r of res) if (r.cpFrom === cpFrom && r.cpTo === null) r.cpTo = at; cpFrom = -1; depth = 0; };
        const sig = (ch, len) => { if (sigFrom < 0) sigFrom = i; prev = ch; i += len; };
        while (i < n) {
          const c = css[i];
          if (/\s/.test(c)) { i++; continue; }
          if (c === '/' && css[i + 1] === '*') {
            const j = css.indexOf('*/', i + 2); if (j < 0) throw new Error('unterminated comment');
            const r = { text: css.slice(i, j + 2), start: i, inCp: cpFrom >= 0, atBoundary: boundary(), sigFrom, stmt: null, cpFrom: cpFrom >= 0 ? cpFrom : null, cpTo: null };
            res.push(r); if (!r.inCp && !r.atBoundary) open.push(r);
            i = j + 2; continue;
          }
          if (c === '"' || c === "'") { let j = i + 1; while (j < n && css[j] !== c) { if (css[j] === '\\') j++; j++; } const at = i; sig(c, j + 1 - i); void at; continue; }
          if (c === '\\') { sig(css[i + 1] === undefined ? c : css[i + 1], 2); continue; }
          if ((c === 'u' || c === 'U') && /^url\(/i.test(css.slice(i, i + 4)) && !/[A-Za-z0-9_\-\\\u0080-￿]/.test(css[i - 1] || '')) {
            let k = i + 4; while (k < n && /\s/.test(css[k])) k++;
            if (css[k] === '"' || css[k] === "'") { sig('(', k - i); if (cpFrom >= 0) depth++; continue; }
            let j = k; while (j < n && css[j] !== ')') { if (css[j] === '\\') j++; j++; }
            sig(')', j + 1 - i); continue;
          }
          if (cpFrom >= 0) {
            if (c === '(' || c === '[' || c === '{') depth++;
            else if (c === ')' || c === ']') depth--;
            else if (c === '}') { if (depth === 0) endCp(i); else depth--; }
            else if (c === ';' && depth === 0) endCp(i);
          } else if (c === '-' && css[i + 1] === '-' && boundary()) {
            const m = /^--[^\s:;{}()\[\]"'\/\\]*\s*:/.exec(css.slice(i, i + 200));
            if (m) { if (sigFrom < 0) sigFrom = i; i += m[0].length; prev = ':'; cpFrom = i; continue; }
          }
          if (cpFrom < 0 && (c === '{' || c === ';' || c === '}')) { endStmt(i); prev = c; i++; continue; }
          sig(c, 1);
        }
        if (cpFrom >= 0) endCp(n);
        endStmt(n);
        return res;
      };
      const removable = (c) => !c.inCp && c.atBoundary && keepReason(c.text) === null;
      /* this file's own notice rule (NOT keepReason): these must survive byte for byte */
      const MUST = /^\/\*!|\*SL\{|copyright|licen[cs]e|©|spdx-license-identifier|@preserve|\bOFL\b/i;
      const pairs = [];
      for (const f of sheets) pairs.push({ name: f, c: text(COMMITTED, f), p: text(leanPkg, f) });
      for (const b of bodies) pairs.push({ name: b.file + ' style #' + b.k, c: b.c, p: b.p });
      let nLeft = 0, nMust = 0, nGone = 0, nCpKept = 0, nBoundaryKept = 0, nWordKept = 0, nStmt = 0;
      for (const x of pairs) {
        let a, b, sa, sb;
        try { sa = view(x.c); sb = view(x.p); a = scan(x.c); b = scan(x.p); } catch (e) { p.push(x.name + ': ' + e.message); continue; }
        if (sa !== sb) { let k = 0; while (k < sa.length && sa[k] === sb[k]) k++; p.push(x.name + ': comment-blind views differ near ' + J(sa.slice(Math.max(0, k - 25), k + 25)) + ' vs ' + J(sb.slice(Math.max(0, k - 25), k + 25))); }
        const left = b.map((c) => c.text);
        const wantLeft = a.filter((c) => !removable(c)).map((c) => c.text);
        if (J(left) !== J(wantLeft)) {
          let k = 0; while (k < left.length && left[k] === wantLeft[k]) k++;
          p.push(x.name + ': the ' + left.length + ' comments left are not the ' + wantLeft.length + ' committed ones the rule keeps, in order, byte for byte (first difference at #' + (k + 1) + ': ' + J((left[k] === undefined ? '(none)' : left[k]).slice(0, 45)) + ' vs ' + J((wantLeft[k] === undefined ? '(none)' : wantLeft[k]).slice(0, 45)) + ')');
        }
        for (const c of b) if (removable(c)) p.push(x.name + ': a removable comment survived: ' + J(c.text.slice(0, 50)));
        nLeft += left.length;
        nGone += a.length - wantLeft.length;
        for (const c of a) {
          if (keepReason(c.text) !== null) nWordKept++;
          else if (c.inCp) nCpKept++;
          else if (!c.atBoundary) nBoundaryKept++;
          // a kept comment in a value: its whole custom-property value / its whole statement is untouched by the white-space pass
          if (keepReason(c.text) === null && c.inCp) { nStmt++; const v = x.c.slice(c.cpFrom, c.cpTo); if (!x.p.includes(v)) p.push(x.name + ': the custom-property value around ' + J(c.text.slice(0, 30)) + ' changed'); }
          else if (keepReason(c.text) === null && !c.atBoundary) { nStmt++; if (!x.p.includes(c.stmt)) p.push(x.name + ': the statement around ' + J(c.text.slice(0, 30)) + ' changed (' + J(c.stmt.slice(0, 40)) + ')'); }
        }
        const count = (arr, t) => arr.filter((y) => y === t).length;
        const texts = a.map((c) => c.text);
        for (const c of new Set(texts.filter((y) => MUST.test(y)))) {
          nMust += count(texts, c);
          if (count(left, c) < count(texts, c)) p.push(x.name + ': a notice comment is gone or changed: ' + J(c.slice(0, 60)));
        }
      }
      const comments = (css) => scan(css).map((c) => c.text);
      const baseC = comments(text(COMMITTED, 'spixi.base.css')).filter((c) => c.includes('*SL{'));
      const baseP = comments(text(leanPkg, 'spixi.base.css'));
      if (baseC.length < 3) p.push('spixi.base.css holds only ' + baseC.length + ' carrier comments (expected ≥ 3) — the case is vacuous');
      for (const c of baseC) if (!baseP.includes(c)) p.push('a carrier comment of spixi.base.css is gone: ' + J(c.slice(0, 60)));
      if (!bodies.length) p.push('no style bodies were compared (row 2 produced none)');
      if (!pairs.some((x) => x.name.startsWith('intro.html') && MUST.test(x.c) && /OFL/.test(x.c))) p.push('the OFL notice of intro.html was not among the compared bodies');
      if (nMust < 4) p.push('only ' + nMust + ' notice comments in the committed tree (vacuous)');
      const nValue = nCpKept + nBoundaryKept;
      if (!(nValue > 0)) p.push('no comment in the committed tree is kept by the value rule (' + nCpKept + ' in custom-property values, ' + nBoundaryKept + ' not at a boundary) — the rule is not exercised (vacuous)');
      if (!(nGone > 0)) p.push('no comment was removed (vacuous)');
      row('only comments went away: ' + pairs.length + ' sheets and style bodies — a comment-blind view written in this file is equal for committed and packaged; the ' + nLeft + ' comments left are, in order and byte for byte, exactly the committed ones that this file\'s own scan does not call removable (' + nWordKept + ' by a carrier / licence word, ' + nValue + ' by the VALUE rule: ' + nCpKept + ' inside a custom-property value, ' + nBoundaryKept + ' not at a statement boundary — each with its statement / value untouched); the ' + nGone + ' removed ones were all at a boundary, outside custom-property values, with no keep word; all ' + nMust + ' notice comments (carrier / licence / OFL / `/*!`, by this file\'s own rule) and the ' + baseC.length + ' carriers of spixi.base.css are intact', p);
    }

    /* ===================== 4 · the size claim ===================== */
    {
      const p = [];
      const size = (dir) => shipped.reduce((s, f) => s + statSync(pjoin(dir, f)).size, 0);
      const a = size(COMMITTED), b = size(leanPkg);
      const pct = Math.round((1 - b / a) * 1000) / 10;
      if (!(b <= a * 0.75)) p.push('packaged ' + b + ' bytes is not ≥ 25 % smaller than committed ' + a + ' (' + pct + ' %)');
      row('the size claim is real: packaged html + css ' + b + ' bytes vs committed ' + a + ' = −' + pct + ' % (need ≥ 25 %) over ' + shipped.length + ' files', p);
    }

    /* ===================== 5a · a committed css / a committed style body put back ===================== */
    {
      const p = [];
      const css = 'spixi.base.css';
      let r = withFile(leanPkg, css, (_, q) => { const c = text(COMMITTED, css); if (c === text(leanPkg, css)) return 'the committed ' + css + ' equals the packaged one'; writeFileSync(q, c, 'utf8'); return null; }, () => cli(['--check', leanPkg, '--lean-css']));
      if (r.bad) p.push(r.bad);
      else {
        if (r.r.code !== 1) p.push('committed ' + css + ' put back: ' + brief(r.r) + ' (want exit 1)');
        if (!r.r.out.includes(css + ': packaged ≠ lean(committed)')) p.push('the message does not say "' + css + ': packaged ≠ lean(committed)": ' + r.r.out.slice(0, 200));
        if (problemLines(r.r).length !== 1) p.push('want exactly one problem line, got ' + problemLines(r.r).length);
      }
      // one inline style body: the first body of a shell that the strip shortened and whose packaged text occurs once in the shell
      let did = null;
      for (const b of bodies.filter((x) => x.c !== x.p && x.p.length > 20)) {
        const pk = text(leanPkg, b.file);
        const k = pk.indexOf(b.p);
        if (k < 0 || pk.indexOf(b.p, k + 1) >= 0) continue;
        r = withFile(leanPkg, b.file, (_, q) => { writeFileSync(q, pk.slice(0, k) + b.c + pk.slice(k + b.p.length), 'utf8'); return null; }, () => cli(['--check', leanPkg, '--lean-css']));
        did = b.file;
        if (r.r.code !== 1) p.push('committed style body of ' + b.file + ' put back: ' + brief(r.r) + ' (want exit 1)');
        if (!r.r.out.includes(b.file + ': packaged ≠ lean(committed)')) p.push('the message does not name ' + b.file + ': ' + r.r.out.slice(0, 200));
        if (problemLines(r.r).length !== 1) p.push('shell body put back: want exactly one problem line, got ' + problemLines(r.r).length);
        break;
      }
      if (!did) p.push('no shell with a shortened style body whose packaged text is unique — the shell case did not apply');
      row('a committed (unstripped) ' + css + ' put back, and the committed text of one inline style body put back into packaged ' + (did || '?') + ' → --check --lean-css exits 1 naming that file ("packaged ≠ lean(committed)") and nothing else', p);
    }

    /* ===================== 5b · carrier folded ===================== */
    {
      const p = [];
      const fold = (rel) => {
        const before = text(leanPkg, rel).split('*SL{SpixiP1}').length - 1;
        if (before < 1) return { bad: rel + ' holds no *SL{SpixiP1} — the fold has nothing to fold' };
        const r = withFile(leanPkg, rel, (t, q) => { writeFileSync(q, t.split('*SL{SpixiP1}').join('0'), 'utf8'); return null; }, () => cli(['--check', leanPkg, '--lean-css']));
        return { before, r: r.r };
      };
      for (const rel of ['chat.html', 'spixi.bundle.js']) {
        const f = fold(rel);
        if (f.bad) { p.push(f.bad); continue; }
        if (f.r.code !== 1) p.push(rel + ' with the carrier folded: ' + brief(f.r) + ' (want exit 1)');
        const msg = rel + ': carrier *SL{SpixiP1} ' + f.before + ' → 0';
        if (!f.r.out.includes(msg)) p.push('the message lacks "' + msg + '": ' + f.r.out.slice(0, 220));
      }
      row('the carrier *SL{SpixiP1} folded to `0` in packaged chat.html (in scope) and in spixi.bundle.js (out of scope) → --check --lean-css exits 1 and names `*SL{SpixiP1}` with both counts', p);
    }

    /* ===================== 5c · a packaged file missing ===================== */
    {
      const p = [];
      for (const [rel, msg] of [['spixi.chat-pattern.css', 'spixi.chat-pattern.css: MISSING from the package'], ['chat.html', 'chat.html: MISSING from the package'], ['spixi.icons.js', 'spixi.icons.js: committed but MISSING from the package']]) {
        const r = withFile(leanPkg, rel, (_, q) => { unlinkSync(q); return null; }, () => cli(['--check', leanPkg, '--lean-css']));
        if (r.bad) { p.push(r.bad); continue; }
        if (r.r.code !== 1) p.push(rel + ' deleted: ' + brief(r.r) + ' (want exit 1)');
        else if (!r.r.out.includes(msg)) p.push(rel + ' deleted: the message lacks "' + msg + '": ' + r.r.out.slice(0, 200));
        else if (problemLines(r.r).length < 1 || problemLines(r.r).some((l) => !l.includes(rel))) p.push(rel + ' deleted: every problem line must name ' + rel + ' (got ' + J(problemLines(r.r)).slice(0, 160) + ')');   // in-scope files are reported by the scope loop AND by the committed-but-missing loop (2 lines): both name the file
      }
      if (!existsSync(pjoin(leanPkg, 'chat.html')) || !existsSync(pjoin(leanPkg, 'spixi.icons.js'))) p.push('the package was not restored after the deletes');
      row('a packaged file deleted → --check --lean-css exits 1: an in-scope .css and an in-scope shell → "MISSING from the package", an out-of-scope script → "committed but MISSING from the package" (only that file named)', p);
    }

    /* ===================== 5d · stray files ===================== */
    {
      const p = [];
      const strays = ['extra.css', 'extra.html', 'sub/extra.js'];
      const made = [];
      try {
        for (const s of strays) { putText(pjoin(leanPkg, s), s.endsWith('.js') ? 'var a;\n' : '/* x */\n'); made.push(s); }
        const r = cli(['--check', leanPkg, '--lean-css']);
        if (r.code !== 1) p.push('strays added: ' + brief(r) + ' (want exit 1)');
        for (const s of strays) if (!r.out.includes(s + ': in the package but NOT in the committed tree')) p.push('the stray ' + s + ' is not named ("in the package but NOT in the committed tree")');
        if (problemLines(r).length !== strays.length) p.push('want ' + strays.length + ' problem lines, got ' + problemLines(r).length);
      } finally {
        for (const s of made) { try { unlinkSync(pjoin(leanPkg, s)); } catch (_) { /* gone */ } }
        try { rmSync(pjoin(leanPkg, 'sub'), { recursive: true, force: true }); } catch (_) { /* gone */ }
      }
      row('stray files in the package (extra.css, extra.html, sub/extra.js) → --check --lean-css exits 1 and names each as "in the package but NOT in the committed tree"', p);
    }

    /* ===================== 5e · a package is checked with the flags it was built with ===================== */
    {
      const p = [];
      const a = cli(['--check', leanPkg]);
      if (a.code !== 1 || !a.out.includes('chat.html: packaged ≠ committed')) p.push('no flag on the LEAN package: ' + brief(a) + ' (want exit 1 naming chat.html "packaged ≠ committed")');
      const b = cli(['--check', plainPkg, '--lean-css']);
      if (b.code !== 1 || !b.out.includes('chat.html: packaged ≠ lean(committed)')) p.push('--lean-css on the NO-FLAG package: ' + brief(b) + ' (want exit 1 naming chat.html "packaged ≠ lean(committed)")');
      const c = cli(['--check', plainPkg], { SPIXI_PACKAGED_LEAN: 'css' });
      if (c.code !== 1 || !c.out.includes('chat.html: packaged ≠ lean(committed)')) p.push('env css on the NO-FLAG package: ' + brief(c) + ' (want exit 1)');
      if (cli(['--check', leanPkg, '--lean-css']).code !== 0) p.push('the lean package no longer passes with its own flag after the rows above (a package was not restored)');
      row('a package is checked with the flags it was built with: no flag on the lean package, --lean-css (and env css) on the no-flag package → exit 1, the shell named', p);
    }

    /* ===================== 5f · the OFF-mode --check (no flag) ===================== */
    {
      const p = [];
      const run = () => cli(['--check', plainPkg]);
      let r = withFile(plainPkg, 'index.html', (_, q) => { unlinkSync(q); return null; }, run);
      if (r.r.code !== 1 || !r.r.out.includes('index.html: committed but MISSING from the package')) p.push('no flag, index.html deleted: ' + brief(r.r) + ' (want exit 1 "index.html: committed but MISSING from the package")');
      const n = text(plainPkg, 'chat.html').split('*SL{SpixiP1}').length - 1;
      if (n < 1) p.push('plain chat.html holds no *SL{SpixiP1}');
      r = withFile(plainPkg, 'chat.html', (t, q) => { writeFileSync(q, t.split('*SL{SpixiP1}').join('0'), 'utf8'); return null; }, run);
      if (r.r.code !== 1 || !r.r.out.includes('chat.html: carrier *SL{SpixiP1} ' + n + ' → 0')) p.push('no flag, carrier folded: ' + brief(r.r) + ' (want exit 1 "chat.html: carrier *SL{SpixiP1} ' + n + ' → 0")');
      r = withFile(plainPkg, 'spixi.tokens.css', (_, q) => { writeFileSync(q, text(COMMITTED, 'spixi.tokens.css'), 'utf8'); return null; }, run);
      if (r.r.code !== 1 || !r.r.out.includes('spixi.tokens.css: packaged ≠ strip(committed)')) p.push('no flag, committed tokens.css put back: ' + brief(r.r) + ' (want exit 1 "spixi.tokens.css: packaged ≠ strip(committed)")');
      r = withFile(plainPkg, 'spixi.bundle.js', (t, q) => { const k = t.indexOf('\n', t.indexOf('\n', 4000) + 1); if (k < 0) return 'spixi.bundle.js has no newline to lose'; writeFileSync(q, t.slice(0, k) + t.slice(k + 1), 'utf8'); return null; }, run);
      if (r.bad) p.push(r.bad);
      else if (r.r.code !== 1 || !/spixi\.bundle\.js: line invariant — /.test(r.r.out)) p.push('no flag, a newline lost in spixi.bundle.js: ' + brief(r.r) + ' (want exit 1 "spixi.bundle.js: line invariant — …")');
      if (run().code !== 0) p.push('the no-flag package no longer passes after the rows above (a package was not restored)');
      row('the OFF-mode --check (no flag) fails closed too: a deleted shell ("committed but MISSING"), a folded carrier (named with counts), the unstripped tokens.css, a newline lost in spixi.bundle.js ("line invariant")', p);
    }

    /* ===================== 6 · env and the allowlist ===================== */
    {
      const p = [];
      const a = cli(['--check', leanPkg], { SPIXI_PACKAGED_LEAN: 'css' });
      if (a.code !== 0 || !/GATE 1 OK/.test(a.stdout) || !a.stdout.includes('lean css')) p.push('--check, no flag, env css, lean package: ' + brief(a) + ' (want exit 0, GATE 1 OK, "lean css")');
      const b = cli(['--check', leanPkg], { SPIXI_PACKAGED_LEAN: 'bogus' });
      if (b.code !== 2 || !b.out.includes('SPIXI_PACKAGED_LEAN')) p.push('env bogus: ' + brief(b) + ' (want exit 2 naming SPIXI_PACKAGED_LEAN)');
      const c = cli(['--check', leanPkg, '--lean-css'], { SPIXI_PACKAGED_LEAN: 'js' });
      if (c.code !== 0 || !/lean mode css \(from the flags\)/.test(c.stdout) || /lean mode css,js/.test(c.stdout)) p.push('an explicit --lean-css must win over env js: ' + brief(c));
      const imp = (env) => {
        const e = { ...process.env }; delete e.SPIXI_PACKAGED_LEAN; delete e.SPIXI_PACKAGED_FROM; Object.assign(e, env);
        const r = spawnSync(process.execPath, ['--input-type=module', '-e', 'import * as m from ' + J(pathToFileURL(CLI).href) + '; console.log(JSON.stringify(m.STRIP_ALLOWLIST));'], { cwd: tmp, env: e, encoding: 'utf8', timeout: 60000 });
        try { return JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch (_) { return 'unreadable: ' + ((r.stdout || '') + (r.stderr || '')).slice(0, 150); }
      };
      const off = imp({});
      if (J(off) !== J(['spixi.tokens.css'])) p.push('importer, no env: STRIP_ALLOWLIST = ' + J(off) + ' (want ["spixi.tokens.css"])');
      const js = imp({ SPIXI_PACKAGED_LEAN: 'js' });
      if (J(js) !== J(['spixi.tokens.css'])) p.push('importer, env js: STRIP_ALLOWLIST = ' + J(js) + ' (want ["spixi.tokens.css"])');
      const top = sheets.slice().sort();
      if (top.length < 3) p.push('fewer than 3 stylesheets on disk');
      for (const env of ['css', 'css,js']) {
        const got = imp({ SPIXI_PACKAGED_LEAN: env });
        if (!Array.isArray(got) || J(got.slice().sort()) !== J(top)) p.push('importer, env ' + env + ': STRIP_ALLOWLIST = ' + J(got) + ' (want every *.css: ' + J(top) + ')');
        else if (got[0] !== 'spixi.tokens.css') p.push('importer, env ' + env + ': spixi.tokens.css is not first');
      }
      row('env SPIXI_PACKAGED_LEAN: --check with no flag + env css on the lean package → GATE 1 OK; env bogus → exit 2; an explicit flag beats the env; an importer sees ["spixi.tokens.css"] with no env / env js and all ' + top.length + ' *.css with env css and css,js', p);
    }

    /* ===================== 7 · CLI edges ===================== */
    {
      const p = [];
      const o1 = pjoin(tmp, 'edge-out1');
      const a = cli(['--lean-cs', '--out', o1]);
      if (a.code !== 2 || !a.out.includes('--lean-cs')) p.push('unknown flag --lean-cs: ' + brief(a) + ' (want exit 2 naming --lean-cs)');
      if (walk(o1).length) p.push('the unknown flag still wrote ' + walk(o1).length + ' file(s)');
      const b = cli([]);
      if (b.code !== 2) p.push('no argument: ' + brief(b) + ' (want exit 2)');
      const c = cli(['--out', '--lean-css']);
      if (c.code !== 2) p.push('--out without a value: ' + brief(c) + ' (want exit 2)');
      const d = cli(['--lean-css']);
      if (d.code !== 2) p.push('--lean-css alone: ' + brief(d) + ' (want exit 2)');
      const o2 = pjoin(tmp, 'edge-out2');
      mkdirSync(o2);
      const r = cli(['--out', o2, '--lean-css']);
      const lines = r.stdout.split('\n').filter((l) => /^ {2}✓ /.test(l));
      const present = walk(o2);
      if (r.code !== 0) p.push('--out --lean-css: ' + brief(r));
      if (lines.length !== present.length) p.push('printed ' + lines.length + ' ✓ lines, ' + present.length + ' files are present');
      const named = lines.map((l) => /^ {2}✓ (\S+) → /.exec(l)).map((m) => (m ? m[1] : '?')).sort();
      if (J(named) !== J(present)) p.push('the ✓ lines name ' + J(named).slice(0, 80) + ' but the files present are ' + J(present).slice(0, 80));
      if (J(present) !== J(shipped)) p.push('files written ≠ every html + css of the committed tree (' + present.length + ' vs ' + shipped.length + '): ' + J(present.filter((x) => !shipped.includes(x)).concat(shipped.filter((x) => !present.includes(x)))).slice(0, 120));
      if (!new RegExp(' ' + present.length + ' file\\(s\\) written').test(r.stdout)) p.push('the final line does not say "' + present.length + ' file(s) written"');
      for (const f of present) if (/\.strip-tmp-/.test(f)) p.push('temp leftover ' + f);
      if (present.length < 18) p.push('only ' + present.length + ' files written (vacuous)');
      row('CLI edges: --lean-cs → exit 2 naming it (nothing written), no argument / `--out` without a value / `--lean-css` alone → exit 2, and `--out --lean-css` into an empty dir prints one ✓ line per file with ' + present.length + ' files really there (every html + css, no temp leftover, nothing else)', p);
    }

    /* ===================== 8 · fail closed, nothing half-written ===================== */
    {
      const p = [];
      const base = pjoin(COMMITTED, 'spixi.base.css'), last = pjoin(COMMITTED, 'wallet_sent.html');
      const orig = { base: readRaw(base), last: readRaw(last) };
      const cases = [
        ['unterminated /* appended to spixi.base.css', 'spixi.base.css', () => appendFileSync(base, '\n/* never closed\n.zz { color: red; }\n'), true],
        ['a string with a line break (`content: "abc }` and no closing quote) appended to spixi.base.css', 'spixi.base.css', () => appendFileSync(base, '\n.zz { content: "abc }\n'), true],
        ['a NUL appended to spixi.base.css', 'spixi.base.css', () => appendFileSync(base, '\n.zz{}' + NUL + '\n'), true],
        ['an unterminated comment in the first style body of wallet_sent.html (the LAST file)', 'wallet_sent.html', () => { const t = orig.last.toString('utf8'); const k = t.indexOf('</style>'); if (k < 0) throw new Error('no </style> in wallet_sent.html'); writeFileSync(last, t.slice(0, k) + '\n/* never closed\n' + t.slice(k), 'utf8'); }, false],
      ];
      try {
        for (const [what, file, apply, existing] of cases) {
          const out = pjoin(tmp, 'fc-out-' + p.length + '-' + file);
          rmSync(out, { recursive: true, force: true });
          if (existing) mkdirSync(out);
          try { apply(); } catch (e) { p.push(what + ': mutation did not apply — ' + e.message); continue; }
          const r = cli(['--out', out, '--lean-css']);
          if (r.code !== 1) p.push(what + ': ' + brief(r) + ' (want exit 1)');
          else if (!r.out.includes(file)) p.push(what + ': the message does not name ' + file + ': ' + r.out.trim().slice(0, 160));
          const left = walk(out);
          if (left.length) p.push(what + ': ' + left.length + ' file(s) were written (' + left.slice(0, 3).join(', ') + ') — must be none');
          writeFileSync(base, orig.base); writeFileSync(last, orig.last);
        }
      } finally { writeFileSync(base, orig.base); writeFileSync(last, orig.last); }
      const ok0 = cli(['--out', pjoin(tmp, 'fc-ok'), '--lean-css']);
      if (ok0.code !== 0) p.push('after the restore the clean tree no longer strips: ' + brief(ok0));
      row('fail closed: unterminated `/*`, a string with a line break (`content: "abc }`), a NUL in spixi.base.css, and an unterminated comment in the LAST shell → --out --lean-css exits 1, names the file, and the out dir holds no file at all', p);
    }

    /* ===================== 9 · the corpus ===================== */
    {
      const p = [];
      const { default: cases } = await import(pathToFileURL(pjoin(base, 'scripts/pins-perflean/corpus/cases.mjs')).href);
      let ran = 0, thrown = 0, idem = 0, checked = 0, same = 0, changed = 0;
      for (const c of cases) {
        if (c.kind !== 'css' && c.kind !== 'html') continue;
        const run = (input) => (c.kind === 'css' ? stripCssLean(input, { file: c.id }) : leanHtml(input, { css: c.css !== false, js: c.js !== false, file: c.id }));
        let out = null, err = null;
        try { out = run(c.input); } catch (e) { err = e; }
        ran++;
        if (c.throws) {
          thrown++;
          if (!err) p.push(c.id + ': expected a throw /' + c.throws + '/, got ' + J(String(out).slice(0, 60)));
          else if (!new RegExp(c.throws).test(err.message)) p.push(c.id + ': threw, but not /' + c.throws + '/: ' + err.message.slice(0, 90));
          continue;
        }
        if (err) { p.push(c.id + ': threw ' + err.message.slice(0, 90)); continue; }
        if (out !== c.expect) p.push(c.id + ': got ' + J(out).slice(0, 80) + ' — expected ' + J(c.expect).slice(0, 80));
        try { if (run(out) !== out) p.push(c.id + ': not idempotent'); else idem++; } catch (e) { p.push(c.id + ': the output does not strip again: ' + e.message.slice(0, 80)); }
        // the exact post-conditions of the rule (B-7), independent of the scanner: nothing but removable comments and their own white space went
        if (out === c.input) same++; else changed++;
        try { if (c.kind === 'css') checkCssStrip(c.input, out, c.id); else checkLeanHtml(c.input, out, c.id, { css: c.css !== false, js: c.js !== false }); checked++; } catch (e) { p.push(c.id + ': the post-condition rejects the strip: ' + e.message.slice(0, 120)); }
      }
      if (ran < 20) p.push('only ' + ran + ' css + html cases ran (need ≥ 20)');
      if (thrown < 5 || idem < 10) p.push('vacuous mix: ' + thrown + ' throwing and ' + idem + ' idempotent cases');
      if (same < 10 || changed < 10) p.push('vacuous mix: ' + same + ' cases the strip leaves unchanged, ' + changed + ' it changes (need ≥ 10 of each)');
      row('the corpus: all ' + ran + ' css + html cases of corpus/cases.mjs give their expected output (' + idem + ', each idempotent) or throw the expected message (' + thrown + '); ' + same + ' of them unchanged by the strip, ' + changed + ' changed; every one of the ' + checked + ' outputs also passes the exact post-condition (checkCssStrip / checkLeanHtml)', p);
    }

    /* ===================== 9b · the value rule, executed on small inputs ===================== */
    {
      const p = [];
      let nT = 0;
      const T = (what, input, want) => {
        nT++;
        let got;
        try { got = stripCssLean(input, { file: 'f1.css' }); } catch (e) { p.push(what + ': threw ' + e.message.slice(0, 80)); return; }
        if (got !== want) p.push(what + ': got ' + J(got) + ' — want ' + J(want));
        try { if (stripCssLean(got, { file: 'f1.css' }) !== got) p.push(what + ': not idempotent'); } catch (e) { p.push(what + ': the output does not strip again: ' + e.message.slice(0, 60)); }
        try { checkCssStrip(input, got, 'f1.css'); } catch (e) { p.push(what + ': the post-condition rejects the strip: ' + e.message.slice(0, 80)); }
      };
      // (b) only at a statement boundary: after anything else the comment stays (this is why the old "token glue" throw cannot fire any more)
      T('a comment between two tokens of a value (the old glue case)', '.a{margin:1px/**/solid}', '.a{margin:1px/**/solid}');
      T('a comment in a selector list', '.a, /* c */ .b { }', '.a, /* c */ .b { }');
      T('a comment before a `{`', '.a /* c */ { color: red }', '.a /* c */ { color: red }');
      T('a comment between a value and its `;`', '.a { color: red /* c */; }', '.a { color: red /* c */; }');
      T('a comment at a boundary (after `{`, after `;`, after `}`, at the start) goes', '/* s */ .a { /* c */ color: red; /* d */ } /* e */ .b {}', ' .a {  color: red;  }  .b {}');
      T('comments at the boundaries of an @media block go', '@media (x) { /* c */ .a {} /* d */ }', '@media (x) {  .a {}  }');
      // (a) the value of a custom property: every comment stays
      T('a comment in a custom-property value stays, one after the `;` goes', '.a{ --x: 1px /* c */; color: red; /* gone */ }', '.a{ --x: 1px /* c */; color: red;  }');
      T('a comment right after the `:` of a custom property', '.a{--x:/* c */1}', '.a{--x:/* c */1}');
      T('a comment closing a custom-property value at `}` (no `;`)', '.a{--x:1/**/}', '.a{--x:1/**/}');
      T('a `;` inside parentheses does not end the custom-property value', '.a{--x: f(1; /* c */ 2) /* d */; /* gone */ }', '.a{--x: f(1; /* c */ 2) /* d */;  }');
      // the white-space pass touches NOTHING of a kept statement / value
      // (round 1, B-1 / B-2: a line WITHOUT a removed comment is never touched — no trim, no squeeze; the removed comment at the end goes with its own line)
      T('trailing blanks and blank lines inside a custom-property value stay; a comment line after them goes', '.a{\n  --x: 1px   /* c */   \n\n\n\n  2px;   \n\n\n\n  color: red;   \n}\n/* gone */\n', '.a{\n  --x: 1px   /* c */   \n\n\n\n  2px;   \n\n\n\n  color: red;   \n}\n');
      T('the same custom-property block with no removable comment at all is not changed by one byte', '.a{\n  --x: 1px   /* c */   \n\n\n\n  2px;   \n\n\n\n  color: red;   \n}', '.a{\n  --x: 1px   /* c */   \n\n\n\n  2px;   \n\n\n\n  color: red;   \n}');
      T('trailing blanks and blank lines inside a selector list with a kept comment stay', '.a,   /* c */   \n\n\n\n  .b {   \n  color: red;   \n}', '.a,   /* c */   \n\n\n\n  .b {   \n  color: red;   \n}');
      // a comment inside a string or url() is not a comment; nothing else changes
      T('`/*` inside a string and a url() is no comment', '.a{content:"/* x */";background:url(a/*b*/c)} /* gone */', '.a{content:"/* x */";background:url(a/*b*/c)}');
      row('the value rule on small inputs (' + nT + '): a comment inside a declaration value, a selector list, before a `{` or before a `;` stays byte for byte (so `1px/**/solid` is no longer refused); one at a boundary goes; EVERY comment inside a custom-property value stays; the white-space pass touches no character of a kept statement or value', p);
    }

    /* ===================== 10 · stripCssComments is unchanged; spixi.tokens.css by flag ===================== */
    {
      const p = [];
      const mod = await import(pathToFileURL(CLI).href);
      const t = text(COMMITTED, 'spixi.tokens.css');
      if (typeof mod.stripCssComments !== 'function') p.push('the copy exports no stripCssComments');
      else {
        if (h.stripCssComments(t) !== mod.stripCssComments(t)) p.push('h.stripCssComments(spixi.tokens.css) ≠ the copy\'s stripCssComments');
        for (const f of sheets) if (h.stripCssComments(text(COMMITTED, f)) !== mod.stripCssComments(text(COMMITTED, f))) p.push('h.stripCssComments ≠ the copy\'s on ' + f);
      }
      const old = h.stripCssComments(t);                                     // today's strip (the suite's own copy of the function)
      const neu = stripCssLean(t, { file: 'spixi.tokens.css' });             // the lean rule
      if (old === neu) p.push('today\'s strip and the lean strip of spixi.tokens.css are equal — the two rules are not told apart (vacuous)');
      /* one switch per change (#1478): NO flag and --lean-js ALONE pack tokens.css as today; --lean-css (with or without js) packs the lean rule */
      const jsOut = pjoin(tmp, 'tokens-js-out');
      const jr = cli(['--out', jsOut, '--lean-js']);
      if (jr.code !== 0) p.push('--out --lean-js ' + brief(jr));
      else if (!existsSync(pjoin(jsOut, 'spixi.tokens.css'))) p.push('--out --lean-js wrote no spixi.tokens.css');
      else if (text(jsOut, 'spixi.tokens.css') !== old) p.push('--lean-js ALONE: spixi.tokens.css ≠ today\'s strip of the committed file');
      if (text(plainPkg, 'spixi.tokens.css') !== old) p.push('no flag: the packaged spixi.tokens.css ≠ today\'s strip of the committed file');
      if (existsSync(pjoin(jsOut, 'spixi.tokens.css')) && text(jsOut, 'spixi.tokens.css') !== text(plainPkg, 'spixi.tokens.css')) p.push('--lean-js alone and no flag pack different spixi.tokens.css bytes');
      if (text(leanPkg, 'spixi.tokens.css') !== neu) p.push('--lean-css: the packaged spixi.tokens.css ≠ stripCssLean(committed)');
      if (text(leanPkg, 'spixi.tokens.css') === old) p.push('--lean-css packed today\'s strip of spixi.tokens.css, not the lean rule');
      // the same by the scope object (in-process): off, js, css, css+js; and the flag-off path needs the injected strip
      for (const [fl, want, name] of [[{}, old, 'off'], [{ js: true }, old, 'js'], [{ css: true }, neu, 'css'], [{ css: true, js: true }, neu, 'css,js']]) {
        try {
          const sc = leanScope(fl, { legacyTokensStrip: mod.stripCssComments });
          const o = sc.transform('spixi.tokens.css', t);
          if (o !== want) p.push('leanScope(' + name + ').transform(spixi.tokens.css) is ' + (o === old ? 'today\'s strip' : o === neu ? 'the lean strip' : 'neither') + ' (want ' + (want === old ? 'today\'s strip' : 'the lean strip') + ')');
          let m = null; try { sc.check('spixi.tokens.css', t, want); } catch (e) { m = e.message; }
          if (m) p.push('leanScope(' + name + ').check rejects the right bytes: ' + m.slice(0, 90));
          if (!fl.css) { m = null; try { sc.check('spixi.tokens.css', t, neu); } catch (e) { m = e.message; } if (!m) p.push('leanScope(' + name + ').check accepts the LEAN bytes while lean CSS is off'); }
        } catch (e) { p.push('leanScope(' + name + '): ' + e.message.slice(0, 90)); }
      }
      let thrownOff = null; try { leanScope({ js: true }).transform('spixi.tokens.css', t); } catch (e) { thrownOff = e.message; }
      if (!thrownOff) p.push('leanScope({ js }) with no legacyTokensStrip packed spixi.tokens.css instead of throwing');
      row('stripCssComments is unchanged (the suite\'s h.stripCssComments = the copy\'s export on all ' + sheets.length + ' sheets); spixi.tokens.css is today\'s strip byte for byte with NO flag and with --lean-js ALONE (CLI and leanScope), and the lean rule — a different text — with --lean-css and with css,js', p);
    }

    /* ===================== 11 · checkCssStrip / checkLeanHtml THEMSELVES (review B-6, B-7) ===================== */
    {
      const p = [];
      const thr = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };
      const KEPT = 'a kept comment was removed or changed', WS = 'white space changed that does not belong to a removed comment', LIT = 'the text outside comments and their white space changed', SURV = 'a removable comment survived or a comment was added', LOST = 'the output lost text that is not a comment';
      const cssBad = [      // [what, source, a WRONG output, the reason the checker must give]
        ['a licence comment removed', '/*! MIT */\n.a{}', '\n.a{}', KEPT],
        ['a licence comment reworded', '/* Copyright X */\n.a{}', '/* Copyright Y */\n.a{}', KEPT],
        ['a comment inside a custom-property value removed', ':root { --k: 1px /* c */ 2px; }', ':root { --k: 1px  2px; }', KEPT],
        ['a non-boundary comment (after `)`) removed', '.a { margin: var(--gap) /* outer */ auto; }', '.a { margin: var(--gap)  auto; }', KEPT],
        ['a non-boundary comment (after `:`) removed', '.a { box-shadow: /* ring */ var(--ring), var(--shadow); }', '.a { box-shadow:  var(--ring), var(--shadow); }', KEPT],
        ['a multi-line comment that spans lines with content removed', '.a { /* x\n y */ color: red }', '.a {  color: red }', KEPT],
        ['a descendant space removed (`.a .b` → `.a.b`)', '.a .b{}', '.a.b{}', WS],
        ['a value space removed (`1px 2px` → `1px2px`)', '.a{margin:1px 2px}', '.a{margin:1px2px}', WS],
        ['a space removed that does not touch the removed comment', '.a{} \n/* c */.b{}', '.a{}\n.b{}', WS],
        ['a space added', '.a{color:red}', '.a{color: red}', WS],
        ['the blanks at the end of a line without a comment trimmed', '.a \n.b{}', '.a\n.b{}', WS],
        ['the blanks of a line without a comment trimmed, a comment far below', '.a{}   \n.b{} /* c */\n', '.a{}\n.b{}\n', WS],
        ['a blank-line run squeezed beside a comment', '.a{}\n\n\n\n.b{} /* c */', '.a{}\n\n.b{}', WS],
        ['the leading blank lines removed', '\n\n.a{} /* c */', '.a{}', WS],
        ['a line of only U+00A0 blanked (a token deleted)', '.a' + NBSP + '\n.b{} /* c */', '.a\n.b{}', WS],
        ['a line break rewritten (CRLF stays CRLF)', '.a{}\n.b{}', '.a{}\r\n.b{}', WS],
        ['the space that ends a hex escape trimmed', '.a\\3A \n.b{}', '.a\\3A\n.b{}', LIT],
        ['the hex-escape trim next to a removed comment', '.a\\3A \n.b{}/* c */', '.a\\3A\n.b{}', LIT],
        ['a declaration deleted', '.a{color:red;margin:0}', '.a{color:red}', LIT],
        ['a rule deleted', '.a{}\n.b{}', '.a{}\n', LOST],
        ['a removable comment left in', '.a{} /* c */\n.b{}', '.a{} /* c */\n.b{}', SURV],
        ['a removable comment added', '.a{}\n.b{}', '.a{}\n/* c */\n.b{}', SURV],
      ];
      let nBad = 0, nRight = 0;
      for (const [what, src, bad, why] of cssBad) {
        let right; try { right = stripCssLean(src, { file: 'w.css' }); } catch (e) { p.push(what + ': stripCssLean threw ' + e.message.slice(0, 60)); continue; }
        if (bad === right) { p.push(what + ': the wrong output equals the right one (vacuous)'); continue; }
        nBad++;
        const m = thr(() => checkCssStrip(src, bad, 'w.css'));
        if (m === null) p.push('checkCssStrip ACCEPTED a wrong output (' + what + '): ' + J(bad));
        else if (!m.includes(why)) p.push(what + ': checkCssStrip threw for another reason than "' + why + '": ' + m.slice(0, 90));
        nRight++;
        const m2 = thr(() => checkCssStrip(src, right, 'w.css'));
        if (m2 !== null) p.push('checkCssStrip REJECTED the right output of (' + what + '): ' + m2.slice(0, 90));
      }
      const htmlBad = [
        ['a licence comment removed inside <style>', '<style>/*! MIT */.a{}</style>', '<style>.a{}</style>', KEPT],
        ['`.a .b` → `.a.b` inside <style>', '<style>.a .b{} /* c */</style>', '<style>.a.b{}</style>', WS],
        ['a removable comment left in <style>', '<style>.a{} /* c */</style>', '<style>.a{} /* c */</style>', SURV],
        ['the markup changed (`<p>x</p>` → `<p>y</p>`)', '<p>x</p><style>.a{} /* c */</style>', '<p>y</p><style>.a{}</style>', 'markup changed'],
        ['an x-template <style> body stripped', '<style type="text/x-template">.a{} /* keep */</style>', '<style type="text/x-template">.a{}</style>', 'an out-of-scope body changed'],
        ['a <style> body with a spaced type stripped (not CSS)', '<style type=" text/css">.a{} /* keep */</style>', '<style type=" text/css">.a{}</style>', 'an out-of-scope body changed'],
        ['a <script> body with type=" " stripped (a data block)', '<script type=" ">var a; // c\n</script>', '<script type=" ">var a;\n</script>', 'an out-of-scope body changed'],
        ['a script body stripped while js is off', '<script>var a; // c\n</script>', '<script>var a;\n</script>', 'an out-of-scope body changed'],
      ];
      for (const [what, src, bad, why] of htmlBad) {
        let right; try { right = leanHtml(src, { css: true, js: false, file: 'w.html' }); } catch (e) { p.push(what + ': leanHtml threw ' + e.message.slice(0, 60)); continue; }
        if (bad === right) { p.push(what + ': the wrong output equals the right one (vacuous)'); continue; }
        nBad++;
        const m = thr(() => checkLeanHtml(src, bad, 'w.html', { css: true, js: false }));
        if (m === null) p.push('checkLeanHtml ACCEPTED a wrong output (' + what + '): ' + J(bad));
        else if (!m.includes(why)) p.push(what + ': checkLeanHtml threw for another reason than "' + why + '": ' + m.slice(0, 90));
        nRight++;
        const m2 = thr(() => checkLeanHtml(src, right, 'w.html', { css: true, js: false }));
        if (m2 !== null) p.push('checkLeanHtml REJECTED the right output of (' + what + '): ' + m2.slice(0, 90));
      }
      // the changed-body case of a JS pair: with js on, a classic script body must equal its transform
      const jsSrc = '<script>var a; // c\n</script>';
      if (thr(() => checkLeanHtml(jsSrc, '<script>var a; // c\n</script>', 'w.html', { css: true, js: true })) === null) p.push('checkLeanHtml accepted a classic script body that was not stripped while js is on');
      if (thr(() => checkLeanHtml(jsSrc, leanHtml(jsSrc, { css: true, js: true }), 'w.html', { css: true, js: true })) !== null) p.push('checkLeanHtml rejected the right script output with js on');
      if (nBad < 25) p.push('only ' + nBad + ' wrong outputs were tried (need ≥ 25)');
      row('the post-conditions themselves: checkCssStrip rejects ' + cssBad.length + ' wrong outputs and checkLeanHtml ' + htmlBad.length + ' (each for its own reason: a kept licence / custom-property / non-boundary / spans-lines comment removed or reworded, `.a .b` → `.a.b`, `1px 2px` → `1px2px`, white space changed away from a comment, a trimmed hex escape, a changed line break, a deleted declaration, a removable comment left in, changed markup, an out-of-scope body changed) and accepts the right output of each of the same sources (' + nRight + ' pairs)', p);
    }

    /* ===================== 12 · the boundary and the keep rules, executed (B-3, B-4, the survivors) ===================== */
    {
      const p = [];
      let nT = 0;
      const T = (what, input, want) => {
        nT++;
        let got;
        try { got = stripCssLean(input, { file: 'b.css' }); } catch (e) { p.push(what + ': threw ' + e.message.slice(0, 80)); return; }
        if (got !== want) p.push(what + ': got ' + J(got) + ' — want ' + J(want));
        try { if (stripCssLean(got, { file: 'b.css' }) !== got) p.push(what + ': not idempotent'); checkCssStrip(input, got, 'b.css'); } catch (e) { p.push(what + ': ' + e.message.slice(0, 80)); }
      };
      const TH = (what, input, re) => {
        nT++;
        let m = null; try { stripCssLean(input, { file: 'b.css' }); } catch (e) { m = e.message; }
        if (m === null) p.push(what + ': did not throw'); else if (!re.test(m)) p.push(what + ': threw, but not ' + re + ': ' + m.slice(0, 90));
      };
      // `)` and `:` are not boundaries: a comment after them is inside a declaration value
      T('after a `)` (var()) — not a boundary', '.a { margin: var(--gap) /* outer */ auto; }', '.a { margin: var(--gap) /* outer */ auto; }');
      T('after a `:` — not a boundary', '.a { box-shadow: /* ring */ var(--ring), var(--shadow); }', '.a { box-shadow: /* ring */ var(--ring), var(--shadow); }');
      T('after a `,` — not a boundary', '.a { box-shadow: var(--a), /* c */ var(--b); }', '.a { box-shadow: var(--a), /* c */ var(--b); }');
      // B-3: bracket depth > 0 is no boundary, whatever stands before the comment
      T('B-3: after a `;` inside parentheses', '#t { width: if(media(width > 1px): 10px; /* c */ else: 20px); }', '#t { width: if(media(width > 1px): 10px; /* c */ else: 20px); }');
      T('B-3: after a `{` inside a var() fallback', '#t { width: var(--nope, { /* c */ }); }', '#t { width: var(--nope, { /* c */ }); }');
      T('B-3: after a `{` inside square brackets', '.a[x="1"] { /* gone */ color: red } [y={ /* c */ }] {}', '.a[x="1"] {  color: red } [y={ /* c */ }] {}');
      T('B-3 + a boundary comment after the parenthesised one goes', '#t { width: f(1; /* c */ 2); /* gone */ }', '#t { width: f(1; /* c */ 2);  }');
      // B-4a: an escaped `{` `;` `}` is a name character, never a boundary
      T('B-4a: after an escaped `{`', '.a\\{/* c */b { color: red }', '.a\\{/* c */b { color: red }');
      T('B-4a: after an escaped `;`', '.a\\;/* c */b { color: red }', '.a\\;/* c */b { color: red }');
      T('B-4a: after an escaped `}`', '.a\\}/* c */b { color: red }', '.a\\}/* c */b { color: red }');
      T('B-4a: after a hex escape', '.a\\3A /* c */b { color: red }', '.a\\3A /* c */b { color: red }');
      // B-4b: refusals
      TH('B-4b: an escaped name right before `(` (`\\75rl(`)', '.a { background: \\75rl(x;/*y); } /* z */ .b { color: red }', /an escaped name right before "\("/);
      TH('B-4b: the same with a quoted argument', '.a { background: \\75rl("x"); }', /an escaped name right before "\("/);
      TH('an escape at the start of a statement', '.a{} \\2d\\2d x { }', /an escape at the start of a statement/);
      TH('`-` + an escape at the start of a statement', '.a{ -\\-x: 1 /* c */ }', /an escape at the start of a statement/);
      // the custom-property keep rule on its own: after the `}` that closes a block INSIDE the value the bracket depth is 0 and the previous character is `}` (a boundary by the other rules)
      T('a custom-property value: a comment after a block closed inside the value stays', ':root { --x: { a: b } /* c */ ; }', ':root { --x: { a: b } /* c */ ; }');
      T('a custom-property value: ... and one after the next `;` goes', ':root { --x: { a: b; } /* c */ 1px; /* gone */ }', ':root { --x: { a: b; } /* c */ 1px;  }');
      // a licence word keeps the comment AND its statement (no white-space change, nothing removed beside it)
      T('a licence comment inside a statement keeps the statement', '.a { color: /* (c) MIT */ red; }  /* gone */', '.a { color: /* (c) MIT */ red; }');
      T('a licence comment at a boundary stays, its neighbours go', '.a { /* gone */ x: 1; /* Copyright X */ y: 2; /* gone */ }', '.a {  x: 1; /* Copyright X */ y: 2;  }');
      T('a source URL comment stays', '/* see https://example.com/x */\n.a{} /* gone */', '/* see https://example.com/x */\n.a{}');
      T('an attribution comment stays (`@author`, `adapted from`, `ported from`, `stackoverflow`)', '/* @author X */\n/* adapted from Y */\n/* ported from Z */\n/* stackoverflow.com/q/1 */\n.a{}', '/* @author X */\n/* adapted from Y */\n/* ported from Z */\n/* stackoverflow.com/q/1 */\n.a{}');
      T('a carrier comment stays', '/* *SL{Foo} */\n.a{ /* gone */ }', '/* *SL{Foo} */\n.a{  }');
      for (const w of ['https://x', '@author', 'adapted from', 'ported from', 'stackoverflow', '*SL{K}', '(c) MIT', 'Copyright', 'SIL OFL']) {
        nT++;
        if (keepReason('/* ' + w + ' */') === null) p.push('keepReason does not keep "' + w + '"');
      }
      if (keepReason('/* plain note */') !== null) p.push('keepReason keeps a plain comment');
      row('the boundary and the keep rules on small inputs (' + nT + '): a comment after `)` `:` `,` stays; one inside parentheses / brackets stays after a `;` or `{` (B-3); after an escaped `{` `;` `}` or a hex escape it stays (B-4a); an escaped name before `(` and an escape at a statement start are REFUSED (B-4b); a licence / carrier / URL / attribution comment keeps its statement', p);
    }

    /* ===================== 13 · the white-space rule, executed (B-1, B-2, the four spans-lines shapes) ===================== */
    {
      const p = [];
      let nT = 0;
      const T = (what, input, want) => {
        nT++;
        let got;
        try { got = stripCssLean(input, { file: 'w.css' }); } catch (e) { p.push(what + ': threw ' + e.message.slice(0, 80)); return; }
        if (got !== want) p.push(what + ': got ' + J(got) + ' — want ' + J(want));
        try { if (stripCssLean(got, { file: 'w.css' }) !== got) p.push(what + ': not idempotent'); checkCssStrip(input, got, 'w.css'); } catch (e) { p.push(what + ': ' + e.message.slice(0, 80)); }
      };
      // B-1: a line without a removed comment is never touched
      T('B-1: a line of only U+00A0 stays (it is content, not a blank)', '.a' + NBSP + '\n' + NBSP + '\n.b{color:red}\n/* c */\n', '.a' + NBSP + '\n' + NBSP + '\n.b{color:red}\n');
      T('B-1: the space that ends a hex escape at a line end stays', '.a\\3A \n.b { color: red } /* c */', '.a\\3A \n.b { color: red }');
      T('B-1: an escaped space at a line end stays', '.a\\ \n{ color: red; }', '.a\\ \n{ color: red; }');
      // B-2
      T('B-2: a var() declaration without a comment keeps its interior white space and blank lines', '.a {\n  margin: var(--g)   \n\n\n\n   auto;   \n}\n/* c */', '.a {\n  margin: var(--g)   \n\n\n\n   auto;   \n}\n');
      // a line without a comment: no trim, no squeeze, no leading-line removal
      T('a line without a comment keeps its trailing blanks; five blank lines stay five', '.a {   \n\n\n\n  color: red;   \n}\n\n\n\n/* c */\n.b{}', '.a {   \n\n\n\n  color: red;   \n}\n\n\n\n.b{}');
      T('leading blank lines of a sheet stay', '\n\n  \n.a{} /* c */', '\n\n  \n.a{}');
      T('a sheet with no comment is not changed at all', '  \n.a {  }   \n\n\n\n.b{}\t\n', '  \n.a {  }   \n\n\n\n.b{}\t\n');
      // (b) (c) (d)
      T('(b) a comment alone on its line takes the line with ITS OWN terminator', '.a{}\n   /* c */   \n.b{}', '.a{}\n.b{}');
      T('(b) the blank lines around that line stay', '.a{}\n\n/* c */\n\n.b{}', '.a{}\n\n\n.b{}');
      T('(b) the last line of the text has no terminator: only its characters go', '.a{}\n   /* c */   ', '.a{}\n');
      T('(b) a sheet that is one comment becomes empty', '/* c */', '');
      T('(b) two comments alone on one line take it', '/* a */ /* b */\n.a { x: 1 }', '.a { x: 1 }');
      T('(c) a comment at the end of a line with content: it and the blanks around it go', '.a { color: red;   /* c */   \n}', '.a { color: red;\n}');
      T('(c) two comments at the end of a line', '.a { color: red;\t/* c */ /* d */  \n}', '.a { color: red;\n}');
      T('(d) a comment in the middle of a line: only its bytes go', '.a { color: red; /* c */ /* d */ x: y }', '.a { color: red;   x: y }');
      T('(d) one comment after `{`', '.a { /* c */ color: red }', '.a {  color: red }');
      // LF / CRLF / CR / FF stay as written
      T('CRLF stays CRLF', 'a {\r\n  /* c */\r\n  color: red; /* d */\r\n}\r\n', 'a {\r\n  color: red;\r\n}\r\n');
      T('a lone CR line end stays CR', '.a{}\r/* c */\r.b{}', '.a{}\r.b{}');
      T('a form feed line end stays FF', '.a{}\f/* c */\f.b{}', '.a{}\f.b{}');
      T('a multi-line comment that owns its lines takes them (LF)', '.a{}\n  /* x\n   y */  \n.b{}', '.a{}\n.b{}');
      T('a multi-line comment that owns its lines takes them (CRLF)', '.a{}\r\n/* x\r\n y */\r\n.b{}', '.a{}\r\n.b{}');
      // the four spans-lines shapes (lead's decision after round 1)
      T('spans-lines 1: content before AND after → the comment is KEPT', '.a { /* x\n y */ color: red }', '.a { /* x\n y */ color: red }');
      T('spans-lines 1 (CRLF): kept', '.a { /* x\r\n y */ color: red }', '.a { /* x\r\n y */ color: red }');
      T('spans-lines 2: blanks before + content after → only its bytes go', '.a {\n  /* x\n y */ color: red }', '.a {\n   color: red }');
      T('spans-lines 3: content before + blanks after → it and the blanks go', '.a { /* x\n y */\n  color: red }', '.a {\n  color: red }');
      T('spans-lines 4: it owns its lines → the lines go', '.a {\n  /* x\n y */\n  color: red }', '.a {\n  color: red }');
      T('spans-lines: the single-line comments around a kept multi-line one go (bytes only)', '.a { /* a */ /* x\n y */ /* b */ color: red }', '.a {  /* x\n y */  color: red }');
      T('spans-lines: two multi-line comments on one joined line with no content before them both go', '.a {\n /* x\n y */ /* z\n w */ color: red }', '.a {\n   color: red }');
      T('spans-lines: a joined line of blanks and comments only goes whole, with its terminator', '.a {\n /* x\n y */ /* z */\n color: red }', '.a {\n color: red }');
      T('spans-lines: a licence comment on the joined line counts as content, the second multi-line comment is kept', '.a { /* Copyright\n x */ /* y\n z */ color: red }', '.a { /* Copyright\n x */ /* y\n z */ color: red }');
      row('the white-space rule on small inputs (' + nT + '): only a removed comment and the white space that belonged to it change — a line of only U+00A0, a hex-escape space at a line end, a var() declaration, blank-line runs, trailing blanks and leading lines of a line without a comment are untouched; (b) (c) (d) with exact outputs; LF / CRLF / CR / FF stay; the four spans-lines shapes', p);
    }

    /* ===================== 14 · the HTML walk, executed ===================== */
    {
      const p = [];
      let nT = 0;
      const H = (what, html, want, opts = {}) => {
        nT++;
        const o = { css: true, js: true, ...opts };
        let got;
        try { got = leanHtml(html, { ...o, file: 'w.html' }); } catch (e) { p.push(what + ': threw ' + e.message.slice(0, 80)); return; }
        if (got !== want) p.push(what + ': got ' + J(got) + ' — want ' + J(want));
        try { if (leanHtml(got, { ...o, file: 'w.html' }) !== got) p.push(what + ': not idempotent'); checkLeanHtml(html, got, 'w.html', o); } catch (e) { p.push(what + ': ' + e.message.slice(0, 90)); }
      };
      const HT = (what, html, re) => {
        nT++;
        let m = null; try { leanHtml(html, { css: true, js: true, file: 'w.html' }); } catch (e) { m = e.message; }
        if (m === null) p.push(what + ': did not throw'); else if (!re.test(m)) p.push(what + ': threw, but not ' + re + ': ' + m.slice(0, 100));
      };
      // <script type> (B-5b)
      H('script, no type: classic JS, stripped', '<script>var a; // c\n</script>', '<script>var a;\n</script>');
      H('script type="": classic JS, stripped', '<script type="">var a; // c\n</script>', '<script type="">var a;\n</script>');
      H('script type=" ": a data block, untouched', '<script type=" ">var a; // c\n</script>', '<script type=" ">var a; // c\n</script>');
      H('script type="\\t\\n": a data block, untouched', '<script type="\t\n">var a; // c\n</script>', '<script type="\t\n">var a; // c\n</script>');
      H('script type="TEXT/JavaScript": a JavaScript MIME essence (ASCII case-insensitive), stripped', '<script type="TEXT/JavaScript">var a; // c\n</script>', '<script type="TEXT/JavaScript">var a;\n</script>');
      H('script type=" application/javascript\\n": trimmed, stripped', '<script type=" application/javascript\n">var a; // c\n</script>', '<script type=" application/javascript\n">var a;\n</script>');
      H('script type="text/javascript;charset=utf-8": not an essence, untouched', '<script type="text/javascript;charset=utf-8">var a; // c\n</script>', '<script type="text/javascript;charset=utf-8">var a; // c\n</script>');
      H('script type="module" / "text/plain": untouched', '<script type="module">var a; // c\n</script><script type="text/plain">var a; // c\n</script>', '<script type="module">var a; // c\n</script><script type="text/plain">var a; // c\n</script>');
      H('script with src: untouched', '<script src="a.js">var a; // c\n</script>', '<script src="a.js">var a; // c\n</script>');
      // <style type> (B-5c)
      H('style, no type: CSS', '<style>.a{} /* c */</style>', '<style>.a{}</style>');
      H('style type="": CSS', '<style type="">.a{} /* c */</style>', '<style type="">.a{}</style>');
      H('style type="text/css": CSS', '<style type="text/css">.a{} /* c */</style>', '<style type="text/css">.a{}</style>');
      H('style type="TEXT/CSS": CSS (ASCII case-insensitive)', '<style type="TEXT/CSS">.a{} /* c */</style>', '<style type="TEXT/CSS">.a{}</style>');
      H('style type=" text/css" (NOT trimmed): untouched', '<style type=" text/css">.a{} /* c */</style>', '<style type=" text/css">.a{} /* c */</style>');
      H('style type="text/css " (NOT trimmed): untouched', '<style type="text/css ">.a{} /* c */</style>', '<style type="text/css ">.a{} /* c */</style>');
      H('style type="text/x-template": untouched', '<style type="text/x-template">.a{} /* keep me */</style>', '<style type="text/x-template">.a{} /* keep me */</style>');
      H('style type="text/less": untouched', '<style type="text/less">.a{} /* c */</style>', '<style type="text/less">.a{} /* c */</style>');
      // foreign content is a STACK (B-5a)
      HT('a <style> inside <svg>', '<svg><style>/* x */</style></svg>', /<style> inside <svg>/);
      HT('nested svg stays foreign after the inner </svg>', '<svg><svg></svg><style>/* c */ .a{}</style></svg>', /<style> inside <svg>/);
      HT('<math><svg></svg> stays foreign (math is still open)', '<math><svg></svg><style>/* c */.a{}</style></math>', /<style> inside <svg>/);
      HT('a wrong end tag: `</math>` while <svg> is the innermost', '<svg></math><style>/* c */ .a{}</style></svg>', /<\/math> while <svg> is the innermost open foreign element/);
      HT('a wrong end tag: `</svg>` while <math> is the innermost', '<svg><math></svg><style>.a{}</style>', /<\/svg> while <math> is the innermost open foreign element/);
      HT('<title> inside <svg>', '<svg><title>x</title></svg>', /<title> inside <svg>/);
      HT('<textarea> inside <svg>', '<svg><textarea></textarea></svg>', /<textarea> inside <svg>/);
      HT('<script> inside <svg>', '<svg><script>// c\n</script></svg>', /<script> inside <svg>/);
      H('both svg closed: the <style> after them is HTML', '<svg><svg></svg></svg><style>/* c */ .a{}</style>', '<svg><svg></svg></svg><style> .a{}</style>');
      H('a stray </svg> with nothing open is ignored', '</svg><style>/* c */ .a{}</style>', '</svg><style> .a{}</style>');
      H('a self-closing <svg/> opens nothing', '<svg/><style>.a{} /* c */</style>', '<svg/><style>.a{}</style>');
      // <select> / <frameset> (B-5d)
      HT('a <style> while a <select> is open', '<select><style>/* c */ .a{}</style></select>', /<style> while a <select> is open/);
      HT('a <script> while a <select> is open', '<select><script>// c\n</script></select>', /<script> while a <select> is open/);
      H('after </select> a <style> is fine', '<select></select><style>.a{} /* c */</style>', '<select></select><style>.a{}</style>');
      H('after </select> a <script> is fine', '<select><option>x</select><script>var a; // c\n</script>', '<select><option>x</select><script>var a;\n</script>');
      HT('a <script> while a <frameset> is open', '<frameset><script>// c\n</script>', /<script> while a <frameset> is open/);
      HT('a <style> after a closed <frameset> (it is not counted down)', '<frameset></frameset><style>.a{} /* c */</style>', /<style> while a <frameset> is open/);
      // HTML comments: `--!>` ends one
      H('`--!>` ends an HTML comment: the <style> after it is real', '<!-- a --!><style>.a{} /* c */</style>', '<!-- a --!><style>.a{}</style>');
      H('`--!>` then a later `-->` comment', '<!-- a --!><style>.a{} /* c */</style><!-- b -->', '<!-- a --!><style>.a{}</style><!-- b -->');
      H('a <style> INSIDE a comment is not touched', '<!-- a <style>.a{} /* c */</style> --><style>.b{} /* d */</style>', '<!-- a <style>.a{} /* c */</style> --><style>.b{}</style>');
      H('the abrupt comments `<!-->` and `<!--->`', '<!--><style>.a{} /* c */</style><!---><style>.b{} /* d */</style>', '<!--><style>.a{}</style><!---><style>.b{}</style>');
      // refusals: raw text the walk does not model
      for (const tag of ['iframe', 'xmp', 'noembed', 'noframes', 'noscript']) HT('a <' + tag + '> element', '<' + tag + '><style>/* c */</style></' + tag + '>', new RegExp('<' + tag + '> element'));
      HT('a <plaintext> element', '<plaintext>', /<plaintext> element/);
      // U+0130 (B-8): accepted, ASCII-only lower-casing
      H('U+0130 in the text: accepted, the <style> after it is stripped', '<p>' + I_DOT + '</p><style>.a{} /* c */</style>', '<p>' + I_DOT + '</p><style>.a{}</style>');
      H('U+0130 and upper-case tag names', '<P>' + I_DOT + '</P><STYLE TYPE="text/css">.a{} /* c */</STYLE>', '<P>' + I_DOT + '</P><STYLE TYPE="text/css">.a{}</STYLE>');
      H('U+0130 in an attribute value before the <style>', '<div title="' + I_DOT + '"></div><style>.a{} /* c */</style><script>var a; // c\n</script>', '<div title="' + I_DOT + '"></div><style>.a{}</style><script>var a;\n</script>');
      row('the HTML walk on small inputs (' + nT + '): the exact `type` rules of <script> (absent / empty / " " / MIME) and <style> (absent / empty / text/css, ASCII case-insensitive, never trimmed), foreign content as a stack (nested svg, a wrong end tag refused), <select> / <frameset>, `--!>` ends a comment, <iframe> <xmp> … refused, U+0130 accepted, x-template untouched', p);
    }
    /* ===================== 15–20 · review round 2: block CONTEXTS, CDO / CDC, slash-star, empty sheets, the survivors ===================== */
    const CR_ = String.fromCharCode(13);
    const thrOf = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };
    /* a table helper: input → exact output, idempotent, and the exact post-condition accepts it */
    const mkT = (p, file) => {
      const o = { n: 0 };
      o.T = (what, input, want) => {
        o.n++;
        let got;
        try { got = stripCssLean(input, { file }); } catch (e) { p.push(what + ': threw ' + e.message.slice(0, 80)); return; }
        if (got !== want) p.push(what + ': got ' + J(got) + ' — want ' + J(want));
        try { if (stripCssLean(got, { file }) !== got) p.push(what + ': not idempotent'); checkCssStrip(input, got, file); } catch (e) { p.push(what + ': ' + e.message.slice(0, 90)); }
      };
      o.TH = (what, input, re) => {
        o.n++;
        const m = thrOf(() => stripCssLean(input, { file }));
        if (m === null) p.push(what + ': did not throw'); else if (!re.test(m)) p.push(what + ': threw, but not ' + re + ': ' + m.slice(0, 90));
      };
      return o;
    };
    const keepsSame = (t, what, input) => t.T(what, input, input);

    /* ---- 15 · a VALUE block keeps every comment inside it (r2 B-1) ---- */
    {
      const p = [];
      const t = mkT(p, 'ctx.css');
      keepsSame(t, '@property initial-value: {a; /* c */ b}', '@property --p { syntax: "*"; inherits: false; initial-value: {a; /* c */ b}; }');
      keepsSame(t, '@property initial-value, the multi-line form', '@property --p {\n  syntax: "*";\n  inherits: false;\n  initial-value: {\n    a;\n    /* c */\n    b\n  };\n}\n');
      keepsSame(t, 'a declaration with a block value', '.a{ color: {var(--x); /* c */ red}; }');
      keepsSame(t, '… inside @media', '@media (x) { .a{ color: {var(--x); /* c */ red}; } }');
      keepsSame(t, '… directly in @page', '@page { color: {var(--x); /* c */ red}; }');
      keepsSame(t, '@function … result', '@function --f() { result: {a; /* c */ b}; }');
      keepsSame(t, 'a block value after var()', '.a{ color: var(--x) {a; /* c */ b}; }');
      keepsSame(t, 'a nested rule with a colon: `&:hover {`', '.a { &:hover { /* c */ color: red } }');
      keepsSame(t, 'a nested rule `&:hover {` with nothing but the comment', '.a { &:hover { /* c */ } }');
      keepsSame(t, 'the multi-line nested rule', '.a {\n  &:hover {\n    /* c */\n    color: red;\n  }\n}\n');
      keepsSame(t, 'a nested rule `b:hover {` after a declaration', '.a { color: red; b:c { /* c */ } }');
      keepsSame(t, 'a descendant nested rule `& b:hover {`', '.a { & b:hover { /* c */ } }');
      keepsSame(t, 'an unknown at-rule is a declaration list: `a:hover {` inside it', '@foo { a:hover { /* c */ color: red } }');
      keepsSame(t, 'a grouping at-rule INSIDE a style rule is a declaration list', '.a { @media (x) { b:hover { /* c */ color: red } } }');
      keepsSame(t, 'depth 2 inside a value block (a `{` inside the value block)', '.a{ color: { x { /* c */ } /* d */ y }; }');
      keepsSame(t, 'a `:` after a kept value and before the `{`', '.a { color: red /* k */ ; b: c(d:e) { /* c */ } }');
      keepsSame(t, 'a `:` before a parenthesis, then the `{`', '.a { b: (c:d) { /* c */ x } }');
      t.T('after the value block nothing is a boundary until the `;`', '.a{ color: {a} /* c */ ; b: c; /* d */ }', '.a{ color: {a} /* c */ ; b: c;  }');
      t.T('the comments around a nested rule with a colon go when they are outside it', '.a { &:hover { color: red; /* c */ } } /* gone */', '.a { &:hover { color: red; /* c */ } }');
      t.T('… and after a `b:c {` block', '.a { color: red; b:c { /* c */ } } /* gone */', '.a { color: red; b:c { /* c */ } }');
      t.T('… and after a grouping at-rule inside a style rule', '.a { color: red; @media (x) { b:hover { /* c */ } } /* gone */ }', '.a { color: red; @media (x) { b:hover { /* c */ } }  }');
      t.T('a nested `@property` value block keeps depth-2 braces; the outside goes', '@property --p { initial-value: { a { /* c */ } b }; /* gone */ }', '@property --p { initial-value: { a { /* c */ } b };  }');
      row('value blocks keep EVERY comment inside them, at any depth (' + t.n + ' inputs): `@property … initial-value: {a; /* c */ b}` (also multi-line), `color: {…}`, in @media / @page, `@function … result`, `var(--x) {…}`, a nested rule with a colon (`&:hover {`, `b:c {`, `& b:hover {`), an unknown at-rule, a grouping at-rule inside a style rule; after the value block nothing is a boundary until the `;`', p);
    }

    /* ---- 16 · the RULES context still strips (r2 B-1) ---- */
    {
      const p = [];
      const t = mkT(p, 'ctx.css');
      t.T('a top-level `a:hover {`', 'a:hover { /* c */ }', 'a:hover {  }');
      t.T('`a:hover {` inside @media (a `:` in its parentheses is no ambiguity)', '@media (min-width: 1px) { a:hover { /* c */ color: red } }', '@media (min-width: 1px) { a:hover {  color: red } }');
      t.T('@supports (a:b) { .c { … } }', '@supports (a:b) { .c { /* d */ color: red } }', '@supports (a:b) { .c {  color: red } }');
      t.T('@keyframes and its keyframe blocks', '@keyframes x { /* a */ from { /* c */ opacity: 0 } 50% { opacity: .5; /* d */ } }', '@keyframes x {  from {  opacity: 0 } 50% { opacity: .5;  } }');
      t.T('@font-face', '@font-face { /* a */ src: url(x) /* c */; }', '@font-face {  src: url(x) /* c */; }');
      t.T('@page :first (the `:` is in a prelude that is an at-rule)', '@page :first { /* c */ margin: 0 }', '@page :first {  margin: 0 }');
      t.T('`a::before {`', 'a::before { /* c */ content: "x" }', 'a::before {  content: "x" }');
      t.T('a selector with an escaped / quoted colon', '[a\\:b], [x="a:b"] { /* c */ color: red }', '[a\\:b], [x="a:b"] {  color: red }');
      t.T('a nested rule WITHOUT a colon: `& > b {`', '.a { & > b { /* c */ color: red } }', '.a { & > b {  color: red } }');
      t.T('a nested rule `& > b {` with nothing but the comment', '.a { & > b { /* c */ } }', '.a { & > b {  } }');
      t.T('a nested @media', '.a { @media (x) { /* c */ color: red } }', '.a { @media (x) {  color: red } }');
      t.T('@-moz-document (a vendor prefix is a grouping at-rule)', '@-moz-document url-prefix() { a:hover { /* c */ color: red } }', '@-moz-document url-prefix() { a:hover {  color: red } }');
      t.T('@layer a, b; and the other statement at-rules', '@layer a, b; /* c */\n@import url(x.css); /* d */\n@namespace svg url(x); /* e */\n.a{}', '@layer a, b;\n@import url(x.css);\n@namespace svg url(x);\n.a{}');
      t.T('the grouping names in upper case', '@MEDIA (x) { a:hover { /* c */ } }', '@MEDIA (x) { a:hover {  } }');
      t.T('@container / @layer / @starting-style / @document: each a grouping at-rule', '@container (min-width: 1px) { a:hover { /* c */ } }\n@layer x { a:hover { /* c */ } }\n@starting-style { a:hover { /* c */ } }\n@document url(x) { a:hover { /* c */ } }', '@container (min-width: 1px) { a:hover {  } }\n@layer x { a:hover {  } }\n@starting-style { a:hover {  } }\n@document url(x) { a:hover {  } }');
      // #46 r3 B-1: `@scope` is NOT a grouping at-rule for the strip — Chromium accepts a bare declaration directly in it and
      // keeps a `{}` value there as text, comments included; its block is a declaration list ('decls')
      t.T('r3 B-1: a `{}` value directly in @scope keeps its comment', '@scope (.a) { color: {var(--x); /* c */ red}; }', '@scope (.a) { color: {var(--x); /* c */ red}; }');
      t.T('r3 B-1: @scope without a prelude, upper case, with `to`', '@scope { color: {var(--x); /* c */ red}; }\n@SCOPE (.a) { color: {var(--x); /* c */ red}; }\n@scope (.a) to (.b) { margin: {var(--x); /* c */ 1px}; }', '@scope { color: {var(--x); /* c */ red}; }\n@SCOPE (.a) { color: {var(--x); /* c */ red}; }\n@scope (.a) to (.b) { margin: {var(--x); /* c */ 1px}; }');
      t.T('r3 B-1: @scope inside @media', '@media screen { @scope (.a) { margin: {var(--x); /* c */ 1px}; } }', '@media screen { @scope (.a) { margin: {var(--x); /* c */ 1px}; } }');
      t.T('r3 B-1: a rule with a `:` in its selector inside @scope is ambiguous there: kept', '@scope (.a) { b:hover { /* c */ } }', '@scope (.a) { b:hover { /* c */ } }');
      t.T('r3 B-1: a comment at a boundary directly in @scope, and in a rule without a colon, still goes', '@scope (.a) { /* x */ .b { color: red; /* y */ } }', '@scope (.a) {  .b { color: red;  } }');
      // #46 r3 B-2: `@charset` counts only as the very first bytes of a sheet — a removed comment before it would move it there
      t.TH('r3 B-2: a comment before @charset', '/* Spixi theme */\n@charset "windows-1252";\n.a::before { content: "x"; }\n', /`@charset` rule that is not at the very start/);
      t.TH('r3 B-2: a comment that touches @charset', '/* c */@charset "utf-8";', /`@charset` rule that is not at the very start/);
      t.TH('r3 B-2: @charset after a line break or in another case, not at offset 0', '\n@CHARSET "utf-8";\n/* c */', /`@charset` rule that is not at the very start/);
      t.T('r3 B-2: @charset at offset 0 stays first; a later comment goes', '@charset "utf-8";\n/* c */\n.a { color: red; }\n', '@charset "utf-8";\n.a { color: red; }\n');
      t.T('r3 B-2: the word in a string is content', '.a { content: "@charset"; /* c */ }', '.a { content: "@charset";  }');
      t.T('a vendor-prefixed @keyframes', '@-webkit-keyframes x { from { /* c */ opacity: 0 } }', '@-webkit-keyframes x { from {  opacity: 0 } }');
      t.T('@counter-style and @font-feature-values', '@counter-style x { /* c */ system: cyclic; }\n@font-feature-values X { @styleset { /* c */ a: 1 } }', '@counter-style x {  system: cyclic; }\n@font-feature-values X { @styleset {  a: 1 } }');
      t.T('an unknown at-rule holds declarations: a `.x {` inside it has no colon and strips', '@unknown { .x { /* c */ } }', '@unknown { .x {  } }');
      // a `{` inside brackets (kept by the bracket depth) must not leave a stray context behind: the rules after it still strip
      t.T('a `{` inside [ ] at the top level, then `a:hover {`', '[y={ /* c */ }] { } a:hover { /* d */ }', '[y={ /* c */ }] { } a:hover {  }');
      t.T('a `{` inside ( ) in a declaration list, then `c:hover {`', '.a{ b( { /* c */ } ) } c:hover { /* d */ }', '.a{ b( { /* c */ } ) } c:hover {  }');
      t.T('two levels of `{` inside ( ), then `c:hover {`', '.a{ f( { x { /* c */ } } ) } c:hover { /* d */ }', '.a{ f( { x { /* c */ } } ) } c:hover {  }');
      // the ambiguity test itself
      t.T('an at-rule statement with a colon is no ambiguity: `@foo x:y {`', '.a { @foo x:y { /* c */ } }', '.a { @foo x:y {  } }');
      t.T('a colon INSIDE parentheses is no ambiguity: `b(c:d) {`', '.a { b(c:d) { /* c */ x: y } }', '.a { b(c:d) {  x: y } }');
      row('the rules context still strips (' + t.n + ' inputs): a top-level `a:hover {`, `a:hover {` inside @media / @supports / @-moz-document, @keyframes, @font-face, `@page :first`, `a::before`, an escaped or quoted colon in a selector, `& > b {`, a nested @media, `@layer a, b;` and the other statement at-rules, every grouping at-rule in any case, @counter-style, an unknown at-rule; and the two non-ambiguities (an at-rule statement, a colon inside parentheses)', p);
    }

    /* ---- 17 · custom-property names and the survivors of the round-2 mutation run (CSS) ---- */
    {
      const p = [];
      const t = mkT(p, 'surv.css');
      keepsSame(t, 'S1: a custom property after another declaration, with a block value', '.a{ color: red; --x: { a; /* c */ b }; }');
      keepsSame(t, 'S1: the custom property is the first declaration', '.a{ --x: { a; /* c */ b }; }');
      t.T('a custom property, then a custom property with a block value, comments around them', '.a{ --x: 1; /* c */ --y: { a; /* d */ b }; /* e */ }', '.a{ --x: 1;  --y: { a; /* d */ b };  }');
      // in the RULES context only the custom-property rule keeps these (no ambiguity test there)
      t.T('S1: a custom property with a block value after a rule at the top level', '.a{} --x: { a; /* c */ b }; .b{ /* e */ }', '.a{} --x: { a; /* c */ b }; .b{  }');
      t.T('S1: … the second declaration at the top level', '.a{} --x: 1; --y: { a; /* c */ b }; /* e */ .b{}', '.a{} --x: 1; --y: { a; /* c */ b };  .b{}');
      t.T('S1: … at the start of the sheet', '--x: { a; /* c */ b }; /* d */\n.a{}', '--x: { a; /* c */ b };\n.a{}');
      keepsSame(t, 'S1: … inside a grouping at-rule, after a rule', '@media (x) { .a{} --y: { a; /* c */ b } /* f */ }');
      keepsSame(t, 'S2: a closer that does not match is a plain token (the `(` stays open)', '.a{ b: (c } d: e; /* c */ }');
      keepsSame(t, 'S3: `#url(` is no url token (`#` starts a name)', '.a{ b: #url(/*); /* c */ x: y }');
      keepsSame(t, 'S3: `@url(` is no url token', '.a{ b: @url(/*); /* c */ x: y }');
      keepsSame(t, 'S4: a quoted url( inside a function keeps the bracket open', '.a{ b: f( url("x") ; /* c */ ) }');
      t.T('S5: a string with `\\` + CRLF is ONE string; the comment after it goes (double quotes)', '.a::after{ content: "a\\' + CR_ + '\nb"; } /* c */', '.a::after{ content: "a\\' + CR_ + '\nb"; }');
      t.T('S5: … single quotes, with a comment inside the rule', '.a{ content: \'a\\' + CR_ + '\nb\'; /* c */ x: y }', '.a{ content: \'a\\' + CR_ + '\nb\';  x: y }');
      t.T('S5: … a comment after the string and a second string', '.a::before { content: "a\\' + CR_ + '\nb"; /* c */ quotes: "x" "y"; }', '.a::before { content: "a\\' + CR_ + '\nb";  quotes: "x" "y"; }');
      // r2 B-6: a custom-property name is `--` + name characters, then (white space / comments), then `:`
      keepsSame(t, 'B-6: `--x y:hover {` is no custom property but a nested rule with a colon', '.a { --x y:hover { color: red; /* c */ } }');
      keepsSame(t, 'B-6: a comment inside the name', '.a{ --/* n */x: { a; /* c */ b }; }');
      t.T('B-6: white space and a comment between the name and the `:`', '.a{ --x /* n */ : 1 /* c */ 2; /* d */ }', '.a{ --x /* n */ : 1 /* c */ 2;  }');
      t.T('B-6: `--x{` has no colon: a normal block, the comment goes', '.a{ --x{ a; /* c */ } }', '.a{ --x{ a;  } }');
      t.T('B-6: `-- x:` (a space after the dashes) is no custom property: a comment after its `;` goes', '.a{ -- x: 1; /* c */ }', '.a{ -- x: 1;  }');
      row('custom-property names and the survivors of the round-2 mutation run (' + t.n + ' inputs): a `--x: {…}` after another declaration (S1), a closer that does not match (S2), `#url(` / `@url(` (S3), a quoted `url(` inside a function (S4), a string with `\\` + CRLF (S5), the name rules of B-6', p);
    }

    /* ---- 18 · points 2–5 of round 2: CDO / CDC, the slash-star keep, empty sheets, the checker's string view ---- */
    {
      const p = [];
      const t = mkT(p, 'r2.css');
      // CDO / CDC (B-3)
      t.TH('a CDO token', '.a{} <!-- .b{}', /CDO \/ CDC token/);
      t.TH('a CDC token', '.a{} --> .b{}', /CDO \/ CDC token/);
      t.TH('a CDC token at the start of the sheet', '--> .a { /* c */ }', /CDO \/ CDC token/);
      t.TH('a CDO that hides a url( from the other reader', ".a{ --x:<!--url(/*) 'a */) ; /* c */ ' ; --y: 1; } '", /CDO \/ CDC token/);
      t.T('`<!--` inside a string is no token', '.a{content:"<!--"} /* c */', '.a{content:"<!--"}');
      t.T('`<!-- -->` inside a comment is no token', '/* <!-- --> */ .a{} /* c */', ' .a{}');
      t.T('`<!--` inside a url() is no token', '.a{background:url(<!--)} /* c */', '.a{background:url(<!--)}');
      // would-join-slash-star (B-4): kept, not refused
      const reasons = [];
      const run = (input) => stripCssLean(input, { file: 'r2.css', onKept: (k) => reasons.push(k.reason) });
      const sameAs = (what, input, want, wantReasons) => {
        t.n++; reasons.length = 0;
        let got; try { got = run(input); } catch (e) { p.push(what + ': threw ' + e.message.slice(0, 80)); return; }
        if (got !== want) p.push(what + ': got ' + J(got) + ' — want ' + J(want));
        if (J(reasons) !== J(wantReasons)) p.push(what + ': kept reasons ' + J(reasons) + ' — want ' + J(wantReasons));
        try { checkCssStrip(input, got, 'r2.css'); } catch (e) { p.push(what + ': the post-condition rejects it: ' + e.message.slice(0, 80)); }
      };
      sameAs('a removable comment between a kept comment and `*` is KEPT (no throw)', '/* licence MIT *//* reset */* { box-sizing: border-box }', '/* licence MIT *//* reset */* { box-sizing: border-box }', ['licence:licence', 'value:would-join-slash-star']);
      sameAs('a run of two removable comments between a kept comment and `*` is kept whole', '/*! x *//* a *//* b */*{}', '/*! x *//* a *//* b */*{}', ['licence:/*!', 'value:would-join-slash-star', 'value:would-join-slash-star']);
      sameAs('white space between them: no join, the comment goes', '/*! x */ /* a */* {}', '/*! x */ * {}', ['licence:/*!']);
      sameAs('no kept comment before it: the comments go', '.a{} /* a *//* b */ * {}', '.a{}  * {}', []);
      sameAs('a `*` after a comment that starts a line goes', '.a{}\n/* a */* {}', '.a{}\n* {}', []);
      // empty sheets (B-4 / point 4)
      t.T('a sheet of only comments strips to nothing', '/* a */\n/* b */\n', '');
      t.T('a sheet that is one comment strips to nothing', '/* a */', '');
      t.T('a sheet of white space is not changed', '   \n', '   \n');
      t.T('the empty sheet', '', '');
      const sc = leanScope({ css: true });
      const chk = (what, src, out, want) => {
        t.n++;
        const m = thrOf(() => sc.check('x.css', src, out));
        if (want === null ? m !== null : (m === null || !m.includes(want))) p.push('leanScope.check(' + what + '): ' + (m === null ? 'did not throw' : 'threw ' + m.slice(0, 80)) + (want === null ? ' (want no throw)' : ' (want "' + want + '")'));
      };
      chk('comments only → nothing', '/* a */\n/* b */\n', '', null);
      chk('one comment → nothing', '/* a */', '', null);
      chk('white space and comments → nothing', ' \n/* a */ \t\n', '', null);
      chk('a rule and a comment → nothing', '.a{} /* c */', '', 'stripped to nothing');
      chk('a rule → nothing', '.a{}', '', 'stripped to nothing');
      chk('a licence comment → nothing is still a lost notice', '/*! MIT */', '', 'a kept comment was removed or changed');   // the allowance does not bypass the checker
      const html = sc.check.bind(sc);
      t.n++;
      if (thrOf(() => html('x.html', '<p>x</p>', '')) === null) p.push('leanScope.check accepted a shell stripped to nothing');
      // the exact checker reads `\` + CRLF in a string as ONE string (the regex view, r2 B-5)
      for (const q of ['"', "'"]) {
        t.n++;
        const src = '.a{ content: ' + q + 'a\\' + CR_ + '\nb' + q + '; } /* c */';
        let out = null; try { out = stripCssLean(src, { file: 'r2.css' }); } catch (e) { p.push('stripCssLean threw on a string with `\\` + CRLF (' + q + '): ' + e.message.slice(0, 90)); continue; }
        const m = thrOf(() => checkCssStrip(src, out, 'r2.css'));
        if (m !== null) p.push('checkCssStrip rejects the right output of a string with `\\` + CRLF (' + q + '): ' + m.slice(0, 90));
      }
      row('round 2 points 2–5 (' + t.n + ' checks): CDO / CDC refused outside strings / url() / comments and accepted inside them (B-3); a removable comment that would join `/` and `*` is KEPT with the reason `value:would-join-slash-star`, not refused, and a comment that does not touch the kept one still goes (B-4); a sheet of only comments strips to nothing but a rule must not (leanScope.check); the checker reads a string with `\\` + CRLF as one string (B-5)', p);
    }

    /* ---- 19 · checkCssStrip on WRONG outputs for the round-2 rules ---- */
    {
      const p = [];
      const KEPT = 'a kept comment was removed or changed';
      const forms = [
        ['@property initial-value', '@property --p { syntax: "*"; inherits: false; initial-value: {a; /* c */ b}; }'],
        ['the multi-line @property', '@property --p {\n  syntax: "*";\n  initial-value: {\n    a;\n    /* c */\n    b\n  };\n}\n'],
        ['a declaration with a block value', '.a{ color: {var(--x); /* c */ red}; }'],
        ['… inside @media', '@media (x) { .a{ color: {var(--x); /* c */ red}; } }'],
        ['… in @page', '@page { color: {var(--x); /* c */ red}; }'],
        ['@function result', '@function --f() { result: {a; /* c */ b}; }'],
        ['var(--x) { … }', '.a{ color: var(--x) {a; /* c */ b}; }'],
        ['a comment after a value block', '.a{ color: {a} /* c */ ; b: c; }'],
        ['`&:hover {`', '.a { &:hover { /* c */ color: red } }'],
        ['`&:hover {` with only the comment', '.a { &:hover { /* c */ } }'],
        ['`b:c {` after a declaration', '.a { color: red; b:c { /* c */ } }'],
        ['an unknown at-rule', '@foo { a:hover { /* c */ color: red } }'],
        ['a grouping at-rule inside a style rule', '.a { @media (x) { b:hover { /* c */ color: red } } }'],
        ['depth 2 in a value block', '.a{ color: { x { /* c */ } y }; }'],
      ];
      let n = 0;
      for (const [what, src] of forms) {
        const right = stripCssLean(src, { file: 'w.css' });
        const bad = src.replace('/* c */', '');
        n++;
        if (bad === src || bad === right) { p.push(what + ': the wrong output is the source or the right output (vacuous)'); continue; }
        const m = thrOf(() => checkCssStrip(src, bad, 'w.css'));
        if (m === null) p.push('checkCssStrip ACCEPTED the output with the value-block comment removed (' + what + ')');
        else if (!m.includes(KEPT)) p.push(what + ': rejected for another reason: ' + m.slice(0, 90));
        const m2 = thrOf(() => checkCssStrip(src, right, 'w.css'));
        if (m2 !== null) p.push('checkCssStrip REJECTED the right output (' + what + '): ' + m2.slice(0, 90));
      }
      // a would-join-slash-star comment removed (the run stays as the kept comment ends it)
      for (const [what, src, bad] of [
        ['one comment', '/* licence MIT *//* reset */* { box-sizing: border-box }', '/* licence MIT */* { box-sizing: border-box }'],
        ['a run of two', '/*! x *//* a *//* b */*{}', '/*! x */*{}'],
        ['the first of a run of two', '/*! x *//* a *//* b */*{}', '/*! x *//* b */*{}'],
      ]) {
        n++;
        const m = thrOf(() => checkCssStrip(src, bad, 'w.css'));
        if (m === null) p.push('checkCssStrip ACCEPTED the removal of a would-join-slash-star comment (' + what + ')');
        else if (!m.includes(KEPT)) p.push(what + ': rejected for another reason: ' + m.slice(0, 90));
        const m2 = thrOf(() => checkCssStrip(src, stripCssLean(src, { file: 'w.css' }), 'w.css'));
        if (m2 !== null) p.push('checkCssStrip REJECTED the right output (' + what + '): ' + m2.slice(0, 90));
      }
      // the rules context: a comment that MAY go must go (a removable comment left in is a wrong output)
      for (const [what, src] of [['a top-level `a:hover {`', 'a:hover { /* c */ }'], ['@media … a:hover', '@media (min-width: 1px) { a:hover { /* c */ color: red } }'], ['`& > b {`', '.a { & > b { /* c */ color: red } }'], ['@keyframes', '@keyframes x { from { /* c */ opacity: 0 } }']]) {
        n++;
        const m = thrOf(() => checkCssStrip(src, src, 'w.css'));
        if (m === null) p.push('checkCssStrip ACCEPTED an output that left a removable comment in (' + what + ')');
        else if (!m.includes('a removable comment survived')) p.push(what + ': rejected for another reason: ' + m.slice(0, 90));
      }
      if (n < 20) p.push('only ' + n + ' wrong outputs tried');
      row('checkCssStrip on wrong outputs for the round-2 rules (' + n + '): the comment removed from each value-block form (every B-1 form), from a would-join-slash-star run → "a kept comment was removed"; a removable comment of the rules context left in → "a removable comment survived"; the right output is accepted', p);
    }

    /* ---- 20 · the HTML walk, round 2: integration points; the survivors (6) (7) (8) ---- */
    {
      const p = [];
      let nT = 0;
      const H = (what, html, want) => {
        nT++;
        const o = { css: true, js: true };
        let got;
        try { got = leanHtml(html, { ...o, file: 'w.html' }); } catch (e) { p.push(what + ': threw ' + e.message.slice(0, 80)); return; }
        if (got !== want) p.push(what + ': got ' + J(got) + ' — want ' + J(want));
        try { if (leanHtml(got, { ...o, file: 'w.html' }) !== got) p.push(what + ': not idempotent'); checkLeanHtml(html, got, 'w.html', o); } catch (e) { p.push(what + ': ' + e.message.slice(0, 90)); }
      };
      const HT = (what, html) => {
        nT++;
        const m = thrOf(() => leanHtml(html, { css: true, js: true, file: 'w.html' }));
        if (m === null) p.push(what + ': did not throw'); else if (!/after an integration point inside <svg> \/ <math>/.test(m)) p.push(what + ': threw, but not the integration-point refusal: ' + m.slice(0, 100));
      };
      // r2 B-2
      for (const name of ['foreignObject', 'FOREIGNOBJECT', 'desc', 'DESC']) HT('<' + name + '> inside <svg>, closed, then a <style>', '<svg><' + name + '></' + name + '></svg><style>/* c */ .a{}</style>');
      HT('a self-closing <foreignObject/>', '<svg><foreignObject/></svg><style>/* c */ .a{}</style>');
      for (const name of ['mi', 'mo', 'mn', 'ms', 'mtext', 'annotation-xml']) HT('<' + name + '> inside <math>, closed, then a <script>', '<math><' + name + '></' + name + '></math><script>var a; // c\n</script>');
      HT('the refusal also holds when the <svg> is closed by a stray end tag inside the integration point', '<!doctype html><body><svg><foreignObject><div></svg></div></foreignObject><style>/* <!-- */ .a{color:red} /* --> */</style></svg><p class=a>x</p>');
      HT('the first integration point decides: a plain <g> then <desc>', '<svg><g></g><desc></desc></svg><style>/* c */ .a{}</style>');
      H('no integration point: <svg><g/><path/> and <math><mfrac> are fine', '<svg><g/><path/></svg><math><mfrac></mfrac></math><style>/* c */ .a{}</style>', '<svg><g/><path/></svg><math><mfrac></mfrac></math><style> .a{}</style>');
      H('the same tag names OUTSIDE foreign content are plain HTML', '<mi></mi><desc></desc><style>/* c */ .a{}</style>', '<mi></mi><desc></desc><style> .a{}</style>');
      H('a body BEFORE the integration point is stripped', '<style>/* c */ .a{}</style><svg><desc></desc></svg>', '<style> .a{}</style><svg><desc></desc></svg>');
      H('a script BEFORE the integration point is stripped', '<script>var a; // c\n</script><math><mi></mi></math><p>x</p>', '<script>var a;\n</script><math><mi></mi></math><p>x</p>');
      H('words that look like integration points in the text are text', '<p>desc mi foreignObject</p><style>/* c */ .a{}</style>', '<p>desc mi foreignObject</p><style> .a{}</style>');
      // survivors of the round-2 mutation run — nothing but this row sees (6) and (7): the HTML post-condition walks both sides alike
      H('S6: a single-quoted attribute value holds `> <style>`: it is text', "<a title='> <style>/* c */ a{} </style>'>x</a>", "<a title='> <style>/* c */ a{} </style>'>x</a>");
      H('S6: … and a real <script> after it is still found', "<a title='> <script>// c\n</script>'>x</a><script>var a; // c\n</script>", "<a title='> <script>// c\n</script>'>x</a><script>var a;\n</script>");
      H('S7: `src=""` is an external script (a body is not inline JS): untouched', '<script src="">/* c */ x()</script>', '<script src="">/* c */ x()</script>');
      H('S7: … with a type', '<script src="" type="text/javascript">// c\nx()</script>', '<script src="" type="text/javascript">// c\nx()</script>');
      H('S8: type="application/x-javascript" is JavaScript: stripped', '<script type="application/x-javascript">/* c */ x()\n</script>', '<script type="application/x-javascript"> x()\n</script>');
      H('S8: … in any case', '<script type="Application/X-JavaScript">var a; // c\n</script>', '<script type="Application/X-JavaScript">var a;\n</script>');
      row('the HTML walk, round 2 (' + nT + '): once an integration-point start tag (foreignObject, desc, mi, mo, mn, ms, mtext, annotation-xml; any case) is seen inside <svg> / <math>, every later <style> / <script> is refused — also after the <svg> / <math> is closed; before it, outside foreign content, and in text nothing changes; and the survivors: a single-quoted attribute value (S6), `src=""` (S7), `application/x-javascript` (S8)', p);
    }

    console.log('  [P-06 b-css] ' + nCli + ' CLI calls, ' + Math.round((Date.now() - t0) / 100) / 10 + ' s');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
