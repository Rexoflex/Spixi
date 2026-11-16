/* ==== perflean P-07 (pins-c) — the lean JS strip, EXECUTED (docs/contract-perflean.md § 3.3, lean-strip.mjs stripJsComments) ====
 *
 * What is under test. `node scripts/strip-release.mjs --out <dir> --lean-js` removes the comments of the three external scripts
 * (spixi.bundle.js / spixi.strings.js / spixi.icons.js — EVERY newline kept: device logs cite them by line, `spixi.bundle.js:47`
 * is the [P1] log line) and of every inline classic <script> of every shell, with a hand-written scanner (no parser). The
 * promise: comments go, nothing else changes; what the scanner cannot decide, it refuses (throws) — the Release build stops.
 *
 * These rows are BEHAVIOUR (#771 / #798): nothing here reads source text of the code under test. The CLI runs in a TEMP COPY
 * (os.tmpdir(): scripts/strip-release.mjs, scripts/lib, Spixi/Resources/Raw/html; ~25 MB; never the working tree), deleted in
 * `finally`. The independent oracles are V8 (`vm.Script` compile, `vm.runInNewContext`, real stack traces of a real execution of
 * the files in a JSDOM window), JSDOM's own HTML parser, and per-line text checks written here. No acorn, no parser package.
 * A mutation that does not apply FAILS its row (a break that did not apply proves nothing).
 *
 * Rows (17; every title starts "★ perflean P-07"; the numbers C1 … C17 name the rows, they are not the order of the run; when the
 * lean package cannot be made, C1 is replaced by one row that says so and C2 … C8, C15 are not run):
 *  C1  the lean JS package (--out into a copy of the committed html dir) passes `--check … --lean-js` (exit 0, "GATE 1 OK",
 *      22 files in scope); with NO flag `--out` writes only spixi.tokens.css, a no-flag package passes the no-flag `--check`, and its
 *      three external scripts are byte-identical to committed (off = today).
 *  C2  lines hold, per EXTERNAL_JS file: line count equal; lineInvariant(..., { anchors, subsequence }) is []; and an OWN check for
 *      EVERY line: packaged line (spaces / tabs removed) is a subsequence of the committed line; line 47 holds the [P1] warn.
 *  C3  the three files EXECUTED (committed and packaged, two fresh JSDOM windows, no network, closed after): SpixiStrings and
 *      SpixiIcons.ICONS deep-equal as JSON (no string literal moved), window.Spixi: same keys, same typeof / length / name,
 *      same constants; and the line V8 reports is the same: the [P1] warn (line 47), every export that throws on (null, null)
 *      (its frames in spixi.bundle.js, many deep past line 30000), the icons warn, a throw inside spixi.strings.js.
 *  C4  only comments went away, independent view: JSDOM parses every committed and every packaged shell once; scripts in order,
 *      same count; classic ones = strip(committed text) and compile with vm.Script; every other script byte-identical; every
 *      <style> and the document outside script bodies unchanged; a synthetic shell with a JSON / src / classic script exercises
 *      the comparator, and a tampered copy is caught (the comparator is not vacuous).
 *  C5  nothing removable is left, nothing kept is lost: strip(packaged) === packaged (externals keepLines, inline not); no `//`
 *      line survives outside a notice run; per line the carriers and licence words are the same in both texts; the qrcode-generator
 *      banner (run of `//` lines around "Copyright (c) 2009 Kazuhiko Arase") is on the same lines, byte for byte; every kept
 *      comment of jsKeptComments(committed) is in the package on its line; carrierDiff([]) for EVERY shipped html / css / js.
 *  C6  the size claim: the packaged bundle is ≥ 30 % smaller in bytes.
 *  C7  deliberate breaks of the PACKAGE, `--check … --lean-js`: (a) newline lost after line 30000, (b) newline lost before line 47,
 *      (c) text moved to the next line (count kept), and (g) the NO-FLAG `--check` on a no-flag package with (a) and (b).
 *  C8  deliberate breaks of the PACKAGE: (d) the committed spixi.icons.js put back, (e) one character of a string of
 *      spixi.strings.js, (f) a carrier folded in a shell's inline script — each named; restored; the clean package passes again.
 *  C9  the hostile-input corpus, every `js` case: exact `expect` or the `throws` message; idempotent; compiles when the input
 *      compiles (vm.Script); keepLines true keeps the line count. Fails below 60 cases. Plus the build post-conditions
 *      (checkJsStrip) are run on 4 bad deletion-only outputs and must refuse each (uncompilable, text added, not idempotent,
 *      a newline lost in an external file).
 *  C10 executed equivalence on ≥ 25 small programs of our own, both keepLines: vm.runInNewContext(input) ≡ (strip(input)).
 *  C11 fail closed: an unterminated `/*`, a `<!--` line, an unterminated string appended to a copy of spixi.icons.js → `--out`
 *      exits 1, names spixi.icons.js and the empty out directory holds NO file.
 *  C12 the keep words with LITERALS (review S-4; no call of keepReason): the carrier, every licence word, a URL and the four attribution
 *      words stay byte for byte in a block, a line comment and a `//` run; a plain comment goes; the reason names.
 *  C13 the witnesses of review round 1 (corpus cases js-r1-*: A-1 raw U+2028 / U+2029, A-2 ASI after return / break / continue /
 *      debugger / a label, A-3 lone CR, A-6 extends, and the scanner mutations the first pins let live): RUN in V8, same result
 *      before / after in BOTH keepLines modes; every refusal in both modes; checkJsStrip accepts every output.
 *  C14 checkJsStrip called directly with WRONG outputs (review S-2): a deleted code line, a changed literal, a lost line break, a trimmed
 *      or lost kept comment, an extra comment → refused, each with its own message; the right outputs pass (first-token exemption too).
 *  C15 review S-4 on the real bundle: every `// … http(s)://` comment line, the Stack Overflow line and the 16-line banner are in the
 *      package byte for byte on their own lines (the pin's own walk).
 *  C16 rule K by reason (review round 2, r3 A-2): a comment in the tail of a weak slash, and a `//` line right after a tail line with
 *      its run, is kept and reported as `after-uncertain-slash` by jsKeptComments AND the onKept hook; one before the weak slash, after a
 *      strong slash, or after a blank line is removed and reported by nothing.
 *  C17 THE NET TEST (review round 2, r3 A-3): three mutants of the weak decision (always regex / always division / alternating), built
 *      from the library's source text; every non-throwing js corpus case, every C10 snippet and every HOSTILE rule-H case (corpus
 *      `netH`) in both keepLines modes: each mutant THROWS or V8 runs its output to the source's result; the real strip refuses every
 *      hostile case BY RULE H; every `mustKeep` substring (corpus) is in every non-throwing output, real and mutant; guards: ≥ 300 runs
 *      per mutant, ≥ 20 throws of the two fixed mutants, ≥ 7 hostile cases, ≥ 4 cases with mustKeep, ≥ 6 rule-H throws per hostile case.
 *  (the module time is a printed NOTE, not a row: a wall-clock budget is flaky under load — review A-5)
 * Order of execution: C9, C10, C12, C13, C14, C16, C17 first (they need no package), then C11, C1 … C8 (C15 after C5). If the lean package cannot be made (C1 fails), the rows
 * that need it are NOT run and one row says so.
 *
 * Deliberate breaks of the CODE (project rule #802) — one-token mutations of scripts/lib/lean-strip.mjs / strip-release.mjs in a scratch
 * copy, each run with `node scripts/run-pins.mjs pins-perflean/c-js`; the failed rows (the C-number of the list above):
 *   regex after `)` of `if` read as division → C9 · regex after `(` / `=` read as division → C1 C9 C10 C11 (the package cannot be made) ·
 *   division after `)` / a name read as regex → C1 C9 C10 C11 · `}` inside `${ }` closes the substitution early → C9 C10 ·
 *   block comment between two tokens replaced by nothing (glue) → C9 C10 · keepLines drops the newlines of a block comment → C1 C9 C10
 *   C11 · the `//` run rule off → C5 C9 · the carrier keep rule off → C1 C9 C11 · `\'` ends a string → C1 C9 C10 C11 · vm.Script
 *   post-condition removed → C9 (checkJsStrip on an uncompilable deletion) · … and one char dropped after each comment → C1 C9 C10 C11 ·
 *   line invariant out of the always-on gates → C7 · leanHtml strips a script with `src` / a JSON-type script → C4 (the synthetic shell:
 *   the real shells hold neither a src body nor a non-JS script) · leanHtml skips the last inline script → C4 · a line comment eats its
 *   newline → C1 C9 · the `<!--` refusal removed → C9 C11 · trailing-space trim inside a template literal → C10 (the corpus does not
 *   catch it). The full table with the failure texts is in the report of pins-c of batch perflean.
 * Review round 3 (fix X6): the leading-zero refusal off → C9 · the trim at a tail line's end / at the end of the input back → C9 (+ C17
 *   mustKeep) · the `//` run after a tail line off → C9 C13 C16 C17 · each rule-H arm off (`${` / backtick / unclosed `/*` / `\`) → C9 C13
 *   C17 (C17: the real strip does not refuse the hostile case, and a mutant changes the V8 result) · the `\` arm only before LF → C9 C17 ·
 *   the `${` arm only for the innermost frame → C9 C17 · rule K off → C9 C13 C15 C16 C17 · `let` in a single-statement position read as
 *   a declaration again → C9 · `case x:` taken for a label → C9 · `0_1` read → C9.
 */
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { readFileSync as readRaw, writeFileSync, mkdtempSync, mkdirSync, cpSync, rmSync, readdirSync as readDir, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pjoin, resolve as presolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function (h) {
  const { ok, JSDOM, VirtualConsole } = h;
  const T0 = Date.now();
  const HTML = 'Spixi/Resources/Raw/html';
  const J = JSON.stringify;
  /* ★ the COMMITTED tree. Inside a packaged run (scripts/smoke-packaged.mjs) h.root is the already stripped COPY and SPIXI_PACKAGED_FROM names
   * the ORIGINAL tree's Raw/html: everything this pin reads, copies or imports as "committed" comes from `base`. No env → base = h.root.
   * An env that does not name a usable tree FAILS the row — no silent fallback to the stripped copy. */
  let base = h.root;
  if (process.env.SPIXI_PACKAGED_FROM) {
    const from = presolve(process.env.SPIXI_PACKAGED_FROM);
    const cand = presolve(from, '..', '..', '..', '..');
    if (pjoin(cand, 'Spixi', 'Resources', 'Raw', 'html') !== from || !existsSync(pjoin(cand, 'scripts', 'strip-release.mjs'))) {
      ok(false, '★ perflean P-07 the committed tree cannot be resolved: SPIXI_PACKAGED_FROM=' + J(process.env.SPIXI_PACKAGED_FROM) + ' is not <tree>/' + HTML + ' of a tree that holds scripts/strip-release.mjs');
      return;
    }
    base = cand;
  }
  const url = (rel) => pathToFileURL(pjoin(base, rel)).href;
  const gates = await import(url('scripts/lib/lean-gates.mjs'));
  const lean = await import(url('scripts/lib/lean-strip.mjs'));
  const { lineInvariant, carrierDiff, carrierCounts, EXTERNAL_JS, JS_LINE_ANCHORS } = gates;
  const { stripJsComments, jsKeptComments, keepReason, checkJsStrip } = lean;
  const read = (rel) => readRaw(pjoin(base, HTML, rel), 'utf8');         // exact bytes: line numbers are the point, no CRLF normalising
  const row = (title, problems, info) => ok(problems.length === 0, '★ perflean P-07 ' + title + (info ? ' [' + info + ']' : '') + (problems.length ? ' — ' + problems.slice(0, 4).join(' | ') + (problems.length > 4 ? ' | … +' + (problems.length - 4) : '') : ''));
  const lc = (s) => s.split('\n');
  const listAll = (dir) => { const o = []; const w = (d, pre) => { for (const x of readDir(d).sort()) { const q = pjoin(d, x); if (statSync(q).isDirectory()) w(q, pre + x + '/'); else o.push(pre + x); } }; if (existsSync(dir)) w(dir, ''); return o; };
  const shipped = listAll(pjoin(base, HTML)).filter((f) => /\.(html|css|js)$/.test(f));
  const shells = shipped.filter((f) => f.endsWith('.html'));
  const BUNDLE = EXTERNAL_JS.find((f) => /bundle/.test(f));
  const STRINGS = EXTERNAL_JS.find((f) => /strings/.test(f));
  const ICONS = EXTERNAL_JS.find((f) => /icons/.test(f));
  const committed = Object.fromEntries(EXTERNAL_JS.map((f) => [f, read(f)]));
  const P1_LINE = "console.warn('[P1] ' + body);";
  const nl = (s, k) => { let at = -1; for (let i = 0; i < k; i++) { at = s.indexOf('\n', at + 1); if (at < 0) return -1; } return at; };   // offset of the k-th newline (1-based)

  /* ===================== C9 · the corpus ===================== */
  {
    const p = [];
    const { default: cases } = await import(url('scripts/pins-perflean/corpus/cases.mjs'));
    const js = cases.filter((c) => c.kind === 'js');
    let ran = 0, threw = 0, compiled = 0, skipped = 0, linesKept = 0;
    const compiles = (s) => { try { new vm.Script(s); return true; } catch (e) { return false; } };
    for (const c of js) {
      const keepLines = c.keepLines !== false;
      let out, err = null;
      try { out = stripJsComments(c.input, { keepLines, file: c.id }); } catch (e) { err = e; }
      ran++;
      if (c.throws !== undefined) {
        if (!err) { p.push(c.id + ': did not throw (want /' + c.throws + '/)'); continue; }
        if (!new RegExp(c.throws).test(err.message)) p.push(c.id + ': threw ' + J(err.message.slice(0, 90)) + ' (want /' + c.throws + '/)');
        threw++;
        continue;
      }
      if (err) { p.push(c.id + ': threw ' + J(err.message.slice(0, 90))); continue; }
      if (out !== c.expect) p.push(c.id + ': got ' + J(out) + ' want ' + J(c.expect));
      let again; try { again = stripJsComments(out, { keepLines }); } catch (e) { again = 'THROWS ' + e.message; }
      if (again !== out) p.push(c.id + ': not idempotent');
      if (compiles(c.input)) { compiled++; if (!compiles(out)) p.push(c.id + ': the input compiles, the output does not: ' + J(out.slice(0, 60))); }
      else skipped++;
      if (keepLines) { linesKept++; if (lc(out).length !== lc(c.input).length) p.push(c.id + ': keepLines — ' + lc(c.input).length + ' lines → ' + lc(out).length); }
    }
    // the post-conditions of the build, executed on bad outputs they must refuse (each is a deletion-only text, so only the named condition can catch it)
  {
    const src = 'var a = 1; /* c */ var b = 2;';
    const tries = [
      ['a good strip passes', src, 'var a = 1;  var b = 2;', { keepLines: true, external: false }, null],
      ['uncompilable output', src, 'var a = 1; var = 2;', { keepLines: true, external: false }, /does not compile/],
      ['text added', src, 'var a = 1; var b = 22;', { keepLines: true, external: false }, /ADDED or MOVED/],
      ['not idempotent (a comment left)', src, src, { keepLines: true, external: false }, /not idempotent/],
      ['a newline lost in an external file', 'a();\n/* c */\nb();', 'a();\nb();', { keepLines: true, external: true }, /line invariant/],
    ];
    for (const [what, i, o, opts, want] of tries) {
      let err = null;
      try { checkJsStrip(i, o, 'probe.js', opts); } catch (e) { err = e; }
      if (want === null ? err : !(err && want.test(err.message))) p.push('checkJsStrip — ' + what + ': ' + (err ? 'threw ' + J(err.message.slice(0, 80)) : 'did not throw'));
    }
  }
  if (ran < 60) p.push('only ' + ran + ' js cases ran (want ≥ 60)');
    row('corpus (every js case): exact output or refusal, idempotent, compiles, line count kept; the build post-conditions refuse 4 bad outputs', p,
      ran + ' js cases, ' + threw + ' refusals, ' + compiled + ' compiled, ' + skipped + ' with an input that does not compile (compile check skipped), ' + linesKept + ' line counts held');
  }

  /* ===================== C10 · executed equivalence on small programs ===================== */
  let NET_PROGS = [];      // the snippets of this row, for the net test (C17)
  {
    const p = [];
    const BT = '`';
    const S = (s) => s.replace(/§/g, BT);
    /* rule K (review round 2): a comment in the tail of a WEAK slash (after `)` `}` `++` `--` or a name + line break) is KEPT, so a snippet whose only comments sit after such a slash would be left unchanged.
     * Every snippet therefore holds a removable comment BEFORE its first weak slash (or on another line): the "strip changed nothing" guard below stays on. */
    const REFUSED = new Set();                       // ids that the strip may refuse (listed in the title); none expected
    const progs = [
      ['str-comment-markers', "var s = 'a/*b*/c'; /* x */ s + \"//d\" // t"],
      ['re-class-quotes', 'var r = /["\'\\/]+/g; /* c */ \'a"b\\\'c/d\'.replace(r, \'#\') // t'],
      ['re-after-if-paren', "var n = 0; /* b */ if (true) /x/.test('x') && n++; /* c */ n // t"],
      ['div-chain', 'var a = 100, b = 5, c = 2; /* d */ a / b / c // t'],
      ['tpl-nested', S('var x = 3; §a${ §b${ x /* c */ + 1 }c§ }d§ // t')],
      ['str-slashes', 'var u = "http://x/*y*/z"; /* real */ u'],
      ['asi-multiline-comment', 'var a = 1\n/* multi\nline */\nvar b = 2\na + b'],
      ['asi-comment-newline-prefix-inc', 'var a = 1, b = 2\na /* \n */ ++b\n[a, b]'],
      ['postfix-div', 'var a = 4, b = 2; /* x */ a++ / b // c'],
      ['div-after-comment', 'var a = 8, b = 2; var x = a /* c */ / b; x'],
      ['getter', 'var o = { get g() { return 6 / 3; /* c */ }, /* x */ k: 1 }; o.g + o.k // t'],
      ['label', 'var n = 0; lbl: for (var i = 0; i < 3; i++) { /* c */ for (;;) { n++; continue lbl; } } n // t'],
      ['return-regex-test', "function f(s) { return /^a+$/.test(s); } /* c */ [f('aa'), f('ab')] // t"],
      ['arrow-regex', "var f = (s) => /b+/.exec(s)[0]; /* c */ f('abbc') // t"],
      ['object-div-in-parens', 'var r = ({ a: 6 }.a /* c */ / 2); r // t'],
      ['iife-div', '/* x */ (function () { return 10 })() / 2 // c'],
      ['re-class-slash', "/[//]/.test('/') /* c */ // d"],
      ['re-in-map-callback', '[1, 2].map(function (x) { return /\\d/.test(String(x)) /* c */ }) // t'],
      ['div-chain-comment-middle', 'var a = 8, b = 2, c = 2; a /* c */ /b/ c'],
      ['div-after-paren-then-comment', 'var a = 6; /* x */ (a) / 2 /* c */ / 3 // t'],
      ['div-after-bracket', 'var a = [8]; a[0] / 2 /* c */'],
      ['tpl-comment-like-content', S('§// not /* a */ comment§ + 1 // real')],
      ['tpl-close-brace-string-in-subst', S("var t = §a${ '}' /* c */ }b§; t")],
      ['tpl-object-in-subst', S('var t = §${ ({ a: 1 }).a /* c */ }§; t')],
      ['re-escaped-slash-source', '/a\\/b/.source /* c */'],
      ['str-escapes', "var s = 'it\\'s // not' + \"q\\\"/* no */\"; /* c */ s"],
      ['str-line-continuation', "var s = 'ab\\\n// not'; /* c */ s"],
      ['return-newline-comment', 'function f() { return /* \n */ 5 } f()'],
      ['glue-minus-minus', 'var a = 5; var b = a/**/-/**/-a; b'],
      ['glue-keywords', 'var f = function/**/(a) { return a }; typeof/**/f'],
      ['glue-in', '("a"/**/in/**/{ a: 1 })'],
      ['unicode-string', "var s = 'é/*x*/ü'; s /* c */"],
      ['tpl-regex-in-subst', S('§${ /\\//.source /* c */ }§')],
      ['fexpr-div', 'var x = (function () {} /* c */ / 2); x'],
      ['class-private-static-regex', 'class A { static #x = /re*/g; static get s() { return A.#x.source /* c */ } } A.s // t'],
      ['optional-chain-nullish-div', 'var o = null; (o?.a ?? 7) /* c */ / 7'],
      ['typeof-void-regex', 'typeof /x/ /* c */ + void /y/'],
      ['keyword-properties-div', 'var o = { return: 9, typeof: 3 }; o.return /* c */ / o.typeof'],
      ['numeric-separator-div', 'var a = 1_000 /* c */ / 4; a'],
      ['named-group-regex', "/(?<y>\\d{4})/u.exec('x2024') /* c */ .groups.y"],
      ['eof-line-comment', '1 + 1 // end'],
      ['leading-block-comment', "/* head */ 'x'.length"],
      ['crlf', 'var a = 1; // c\r\nvar b = 2; /* x\r\n y */ a + b'],
      ['comment-runs', 'var x = 1; /* a */ /* b */ // c\n/* d */ x'],
      ['else-regex', "var r; if (false) r = 1; else /z/.test('z') /* c */"],
      ['for-body-regex-free', 'var n = 0; for (var i = 0; i < 4; i++) /* c */ n += i / 2; n'],
      ['method-then-comment', 'var o = { m() { return 1 / 2; } /* c */, n: 2 }; o.m() + o.n'],
      ['obj-literal-arg-div', 'Math.max({ valueOf() { return 4 } } /* c */ / 2, 1)'],
      ['switch-case-regex', "var r; switch (1) { case 1: r = /a*/.test('b'); /* c */ break; default: r = 0 } r"],
      ['arrow-regex-chain', "var t = (s) => /^\\s*$/.test(s) /* c */ ? 'blank' : 'text'; [t(' '), t('x')]"],
      ['block-comment-two-lines-in-expr', 'var a = 1 +\n/* c\n */ 2; a'],
      ['tpl-multiline-keeps-content', S('var t = §a  \n\n  b§; /* c */ t')],
      ['tpl-trailing-spaces-after-comment', S('var q = 1 /* c */, t = §x   \n  y  \n§; t')],
      ['tpl-subst-trailing-spaces', S('var q = 1 /* c */, t = §${ q }   \nz§; t')],
      ['tpl-object-direct-in-subst', S('var t = §${ { a: 1 }.a /* c */ }-§; t')],
      ['tpl-nested-objects-direct', S('var t = §${ { a: { b: 2 } }.a.b /* c */ }§; t')],
      ['division-then-regex-line', 'var a = 6; var b = a / 2; /* c */\nvar r = /x/g; [b, String(r)]'],
    ];
    NET_PROGS = progs.map(([id, src]) => ['prog:' + id, src]);
    const ser = (v) => { try { return typeof v === 'object' && v !== null ? 'obj:' + J(v, (k, x) => (typeof x === 'number' && !Number.isFinite(x) ? 'num:' + x : x === undefined ? 'undef' : x instanceof RegExp ? String(x) : x)) : typeof v + ':' + String(v); } catch (e) { return 'unserialisable'; } };
    const run = (code) => { try { return ser(vm.runInNewContext(code, Object.create(null), { timeout: 2000 })); } catch (e) { return 'THROW ' + (e && e.name) + ': ' + (e && e.message); } };
    let compared = 0, refused = [];
    for (const [id, src] of progs) {
      const want = run(src);
      if (/^THROW/.test(want)) { p.push(id + ': the INPUT itself fails in V8 (' + want.slice(0, 70) + ') — fix the snippet'); continue; }
      for (const keepLines of [true, false]) {
        let out;
        try { out = stripJsComments(src, { keepLines, file: id }); } catch (e) { if (!REFUSED.has(id)) { refused.push(id); p.push(id + ' keepLines ' + keepLines + ': the strip REFUSED valid JavaScript: ' + e.message.slice(0, 110)); } continue; }
        if (out === src) p.push(id + ': the strip changed nothing — the snippet has no removable comment');
        const got = run(out);
        compared++;
        if (got !== want) p.push(id + ' keepLines ' + keepLines + ': RESULT DIFFERS ' + want.slice(0, 40) + ' vs ' + got.slice(0, 60) + ' (out ' + J(out.slice(0, 70)) + ')');
      }
    }
    if (progs.length < 25) p.push('only ' + progs.length + ' programs');
    row('executed equivalence on ' + progs.length + ' programs, both keepLines; refused: ' + (REFUSED.size ? [...REFUSED].join(', ') : 'none'), p, compared + ' runs compared');
  }


  /* ===================== C12 · the keep words, pinned with literals (review S-4) ===================== */
  /* The keep rule is `keepReason` (lean-strip.mjs). This row does NOT call it: it gives the STRIP literal comments and reads
   * what came out, so a change of the word lists is seen here, never hidden behind a shared call. Every word sits in a
   * block comment and in a line comment, both keepLines modes: the comment must stay byte for byte; a plain comment must go. */
  {
    const p = [];
    const KEEP = {
      carrier: ['*SL{X}'],
      'licence words': ['@license', '@licence', '@preserve', '@copyright', 'Copyright (c) 2020', '© 2020', 'SPDX-License-Identifier: MIT', 'License', 'licence', 'vendored',
        'OFL', 'CC-BY', 'CC0', 'MIT', 'Apache', 'BSD'],
      url: ['http://x.example/a', 'https://x.example/a', 'HTTPS://X.EXAMPLE/A'],
      'attribution words': ['@author A', 'adapted from B', 'ported from C', 'stackoverflow', 'StackOverflow question 18729405'],
    };
    const PLAIN = ['plain note', 'LIMIT', 'the author said'];
    let words = 0;
    for (const keepLines of [true, false]) {
      for (const [kind, list] of Object.entries(KEEP)) for (const w of list) {
        words++;
        const b = 'var a = 1; /* see ' + w + ' here */ var b = 2;', l = 'var a = 1; // see ' + w + ' here\nvar b = 2;';
        for (const [form, src] of [['block', b], ['line', l]]) {
          let out; try { out = stripJsComments(src, { keepLines }); } catch (e) { p.push(kind + ' ' + J(w) + ' ' + form + ': threw ' + e.message.slice(0, 80)); continue; }
          if (out !== src) p.push(kind + ' ' + J(w) + ' ' + form + ' keepLines ' + keepLines + ': not kept byte for byte: ' + J(out));
        }
      }
      for (const w of PLAIN) {
        const src = 'var a = 1; /* ' + w + ' */ var b = 2; // ' + w + '\nvar c = 3;';
        let out; try { out = stripJsComments(src, { keepLines }); } catch (e) { p.push('plain ' + J(w) + ': threw ' + e.message.slice(0, 80)); continue; }
        if (out.includes(w)) p.push('plain ' + J(w) + ' keepLines ' + keepLines + ': a comment with no keep word survived: ' + J(out));
        if (!out.includes('var c = 3;') || !out.includes('var b = 2;')) p.push('plain ' + J(w) + ': code was lost: ' + J(out));
      }
    }
    // `/*!` and a run of `//` lines where only ONE line holds the word: the whole run stays (one comment for the keep rule)
    for (const [what, src] of [['/*! block', '/*! x */ var a = 1;'], ['run, word in the last line', '// plain\n// ported from X\nvar a = 1;'], ['run, word in the first line', '// see https://x.example/a\n// plain\nvar a = 1;'], ['run, word in the middle', 'a(); // plain\n// @author Z\n// plain\nvar a = 1;']]) {
      const out = stripJsComments(src, { keepLines: true });
      if (out !== src) p.push(what + ': not kept byte for byte: ' + J(out));
    }
    // the reason strings the statistics use (lean-strip.mjs header): a URL = source-url, the four words = attribution:<word>
    const reasonOf = (c) => { const k = jsKeptComments('x(); /* ' + c + ' */'); return k.length === 1 ? k[0].reason : 'none/' + k.length; };
    for (const [c, want] of [['see http://x.example/a', 'source-url'], ['see https://x.example/a', 'source-url'], ['@author A', 'attribution:@author'], ['adapted from B', 'attribution:adapted from'],
      ['ported from C', 'attribution:ported from'], ['via StackOverflow', 'attribution:stackoverflow'], ['plain note', 'none/0']]) {
      const got = reasonOf(c);
      if (got !== want) p.push('reason of ' + J(c) + ': ' + J(got) + ' (want ' + J(want) + ')');
    }
    row('the keep words, with literals: the carrier, every licence word, a URL (http / https) and @author / adapted from / ported from / stackoverflow stay byte for byte (block, line, run); a plain comment goes; the reason names', p, words + ' words x 2 forms x 2 modes');
  }

  /* ===================== C13 · the witnesses of review round 1, executed in V8 (both keepLines modes) ===================== */
  /* Every corpus case js-r1-*: the input and its strip are RUN in a fresh V8 context and must give the same result, in BOTH keepLines
   * modes (the corpus row checks the exact text of one mode); a refusal case must be refused in BOTH modes; and the build
   * post-conditions (checkJsStrip) must accept every output. Programs: the raw U+2028 / U+2029 of a string (A-1), the ASI forms of
   * return / break / continue / debugger / label (A-2), CR (A-3), `extends` (A-6) and the mutations the first pins let live. */
  {
    const p = [];
    const { default: cases } = await import(url('scripts/pins-perflean/corpus/cases.mjs'));
    const w = cases.filter((c) => c.kind === 'js' && /^js-r[12]-/.test(c.id));
    const ser = (v) => { try { return typeof v === 'object' && v !== null ? 'obj:' + J(v) : typeof v + ':' + String(v); } catch (e) { return 'unserialisable'; } };
    const run = (code) => { try { return ser(vm.runInNewContext(code, Object.create(null), { timeout: 2000 })); } catch (e) { return 'THROW ' + (e && e.name) + ': ' + (e && e.message); } };
    let compared = 0, refused = 0, exact = 0;
    for (const c of w) {
      const isRun = !/^js-r1-s4-/.test(c.id);     // the s4 cases are exact-text cases (their snippets call undefined functions)
      for (const keepLines of [true, false]) {
        let out, err = null;
        try { out = stripJsComments(c.input, { keepLines, file: c.id }); } catch (e) { err = e; }
        if (c.throws !== undefined) {
          refused++;
          if (!err) p.push(c.id + ' keepLines ' + keepLines + ': NOT refused (want /' + c.throws + '/) — got ' + J(out.slice(0, 60)));
          else if (!new RegExp(c.throws).test(err.message)) p.push(c.id + ' keepLines ' + keepLines + ': refused with ' + J(err.message.slice(0, 90)) + ' (want /' + c.throws + '/)');
          continue;
        }
        if (err) { p.push(c.id + ' keepLines ' + keepLines + ': the strip REFUSED valid JavaScript: ' + err.message.slice(0, 110)); continue; }
        try { checkJsStrip(c.input, out, c.id, { keepLines, external: false }); } catch (e) { p.push(c.id + ' keepLines ' + keepLines + ': the post-conditions refuse the output: ' + e.message.slice(0, 110)); }
        if (keepLines && lc(out).length !== lc(c.input).length) p.push(c.id + ': keepLines — ' + lc(c.input).length + ' lines → ' + lc(out).length);
        if (keepLines === (c.keepLines !== false) && out !== c.expect) p.push(c.id + ': got ' + J(out) + ' want ' + J(c.expect));
        if (keepLines === (c.keepLines !== false)) exact++;
        if (!isRun) continue;
        const want = run(c.input);
        if (/^THROW/.test(want)) { p.push(c.id + ': the INPUT itself fails in V8 (' + want.slice(0, 70) + ') — fix the snippet'); continue; }
        const got = run(out);
        compared++;
        if (got !== want) p.push(c.id + ' keepLines ' + keepLines + ': RESULT DIFFERS ' + want.slice(0, 40) + ' vs ' + got.slice(0, 60) + ' (out ' + J(out.slice(0, 70)) + ')');
      }
    }
    // the one fact that V8 decides, not the scanner: a raw U+2028 ENDS a line comment (so `x = 2` after it is CODE, and the result is 2, not 1)
    const LS = String.fromCharCode(0x2028);
    if (run('var x = 1 // note' + LS + 'x = 2\nx') !== 'number:2') p.push('premise: V8 does not end a line comment at U+2028 any more (' + run('var x = 1 // note' + LS + 'x = 2\nx') + ')');
    if (w.length < 40) p.push('only ' + w.length + ' js-r1-* cases (want ≥ 40)');
    if (refused < 14) p.push('only ' + refused + ' refusal checks (want ≥ 14)');
    row('review round 1 witnesses (corpus js-r1-*), run in V8: same result before / after the strip in both keepLines modes, refusals in both modes, the build post-conditions accept every output', p,
      w.length + ' cases, ' + compared + ' runs compared, ' + refused + ' refusals, ' + exact + ' exact texts');
  }

  /* ===================== C14 · the post-conditions on WRONG outputs (review S-2) ===================== */
  /* checkJsStrip is called directly with outputs that a buggy emit path could make. Each wrong output is a deletion of text or white space,
   * compiles and is idempotent, so only the token / line-break / kept-comment post-condition (sameJsCode) can refuse it. */
  {
    const p = [];
    const KL = { keepLines: true, external: false }, NK = { keepLines: false, external: false };
    const pay = 'function pay(a) {\n  if (!valid(a)) return; // guard\n  send(a);\n}\n';
    const tries = [
      ['the right strip passes (pay)', pay, 'function pay(a) {\n  if (!valid(a)) return;\n  send(a);\n}\n', KL, null],
      ['the right strip passes (pay, an external file: line invariant on)', pay, 'function pay(a) {\n  if (!valid(a)) return;\n  send(a);\n}\n', { keepLines: true, external: true }, null],
      ['the right strip passes (a leading comment line of an inline body: the first token may lose its line break)', '// lead\nvar a = 1;\n', 'var a = 1;\n', NK, null],
      ['the right strip passes (a kept comment and a removed one)', '/* MIT   \n x */ a(); /* c */\nb();', '/* MIT   \n x */ a();\nb();', KL, null],
      ['a code line deleted (the `if` line is empty)', pay, 'function pay(a) {\n\n  send(a);\n}\n', KL, /post-condition: (code token \d+ changed|\d+ code tokens in the source)/],
      ['a code line deleted (an external file: the line is a subsequence, so the line invariant is blind)', pay, 'function pay(a) {\n\n  send(a);\n}\n', { keepLines: true, external: true }, /post-condition: (code token \d+ changed|\d+ code tokens in the source)/],
      ['the last code token lost', 'a(); b(); // c\n', 'a(); b\n', KL, /post-condition: (code token \d+ changed|\d+ code tokens in the source)/],
      ['a string literal changed (a blank removed from it)', 'var s = "a b"; // c\nuse(s);\n', 'var s = "ab";\nuse(s);\n', KL, /post-condition: code token \d+ changed \(string/],
      ['a number changed', 'var n = 10; // c\nuse(n);\n', 'var n = 1;\nuse(n);\n', KL, /post-condition: code token \d+ changed \(num/],
      ['a template literal changed', 'var t = `a  b`; // c\nuse(t);\n', 'var t = `a b`;\nuse(t);\n', KL, /post-condition: code token \d+ changed \(template/],
      ['a regular expression changed', 'var r = /a b/; // c\nuse(r);\n', 'var r = /ab/;\nuse(r);\n', KL, /post-condition: code token \d+ changed \(regex/],
      ['a line break before a token lost (`return /* why⏎ */ 1` → `return 1`)', 'function f() {\n  return /* why\n  */ 1;\n}\n', 'function f() {\n  return 1;\n}\n', NK, /post-condition: the line break before code token \d+ "1" was lost/],
      ['a line break before a token lost (a line comment: `return // c⏎ 1` → `return 1`)', 'function f() { return // c\n 1 }\n', 'function f() { return 1 }\n', KL, /post-condition: the line break before code token \d+ "1" was lost/],
      ['a kept comment trimmed (blanks inside it)', '/*! keep   \n  me */\nvar a = 1; // c\n', '/*! keep\n  me */\nvar a = 1;\n', KL, /post-condition: a kept comment is not in the output byte for byte/],
      ['a kept comment lost', '/* MIT */ a(); /* c */\n', 'a();\n', KL, /post-condition: 1 kept comments in the source, 0 comments in the output/],
      ['an extra comment left (a plain line joins a kept run)', '// MIT\n\n// plain\nx();\n', '// MIT\n// plain\nx();\n', KL, /post-condition: 1 kept comments in the source, 2 comments in the output/],
    ];
    for (const [what, i, o, opts, want] of tries) {
      let err = null;
      try { checkJsStrip(i, o, 'probe.js', opts); } catch (e) { err = e; }
      if (want === null ? err : !(err && want.test(err.message))) p.push(what + ': ' + (err ? 'threw ' + J(err.message.slice(0, 120)) : 'did not throw'));
    }
    row('checkJsStrip on wrong outputs (S-2): a code line deleted, a literal changed, a line break lost, a kept comment trimmed or lost, an extra comment left → refused, each with its own message; the right outputs pass', p, tries.length + ' outputs');
  }


  /* ===================== C16 · rule K by reason (review round 2) ===================== */
  /* A comment that starts in the tail of a WEAK slash (the reading of the `/` after `)` `}` `++` `--` or after a name + a line break is
   * not fixed by the grammar) is KEPT, reported through the strip's own kept list with the reason `after-uncertain-slash`; a comment
   * BEFORE the weak slash, or after a STRONG slash, is removed and reported by nothing. Read through jsKeptComments AND the `onKept`
   * hook of the strip (the two must agree), and in the text of the output. */
  {
    const p = [];
    const K = 'after-uncertain-slash';
    const tries = [   // [what, source, [kept comments], [removed comments]]
      ['after `)` + slash', 'var x = f(a) / b /* k1 */ / 1; /* k2 */ x', ['/* k1 */', '/* k2 */'], []],
      ['after `)` + slash, a line comment', 'var x = f(a) / b // k1\nx', ['// k1'], []],
      ['after `}` of a block + slash', 'if (o) {}\n/x/.test("x") /* k1 */\n/* gone */ o', ['/* k1 */'], ['/* gone */']],
      ['after a name + line break + slash', 'var x = a\n/ b /* k1 */ / g; x', ['/* k1 */'], []],
      ['after `++` + slash', 'x = a++ / 2 /* k1 */; x', ['/* k1 */'], []],
      ['after `--` + slash', 'x = a-- / 2 /* k1 */; x', ['/* k1 */'], []],
      ['several comments in one tail', 'x = f(a) / 2 /* k1 */ /* k2 */ // k3\ny', ['/* k1 */', '/* k2 */', '// k3'], []],
      ['a comment BEFORE the weak slash goes', 'x = /* gone */ (a) / 2 /* k1 */; x', ['/* k1 */'], ['/* gone */']],
      ['a comment before the weak slash, same line, only it', 'x = /* gone */ (a) / 2;\nx', [], ['/* gone */']],
      ['after a STRONG slash (a name on the same line) goes', 'x = a / 2 /* gone */; x', [], ['/* gone */']],
      ['after a STRONG regex goes', 'x = (/y/) /* gone */; x', [], ['/* gone */']],
      ['the next line of a tail is outside it', 'x = f(a) / 2;\n/* gone */ x // gone2', [], ['/* gone */', '// gone2']],
      ['the `//` line right after a tail line and its run (r3 A-2)', 'x = f(a) / 2\n  // k1\n// k2\ny', ['// k1\n// k2'], []],
      ['a `//` line after a blank line after a tail goes (r3 A-2)', 'x = f(a) / 2\n\n// gone\ny', [], ['// gone']],
    ];
    for (const [what, src, keptWant, goneWant] of tries) {
      for (const keepLines of [true, false]) {
        const viaHook = [];
        let out, kc;
        try { out = stripJsComments(src, { keepLines, onKept: (k) => viaHook.push(k) }); kc = jsKeptComments(src); } catch (e) { p.push(what + ': threw ' + e.message.slice(0, 80)); continue; }
        const tailKept = kc.filter((k) => k.reason === K).map((k) => k.text);
        const hookKept = viaHook.filter((k) => k.reason === K).map((k) => k.text);
        // a kept `//` run reports one text: split what the want list holds by what the output holds
        for (const c of keptWant) { if (!out.includes(c)) p.push(what + ' keepLines ' + keepLines + ': ' + J(c) + ' was removed'); if (!kc.some((k) => k.reason === K && k.text.includes(c)) || !viaHook.some((k) => k.reason === K && k.text.includes(c))) p.push(what + ': ' + J(c) + ' is not reported with the reason ' + K + ' (list ' + J(tailKept) + ', hook ' + J(hookKept) + ')'); }
        for (const c of goneWant) { if (out.includes(c)) p.push(what + ' keepLines ' + keepLines + ': ' + J(c) + ' survived'); if (kc.concat(viaHook).some((k) => k.text.includes(c))) p.push(what + ': ' + J(c) + ' is reported as a kept comment'); }
        if (tailKept.length !== keptWant.length || hookKept.length !== keptWant.length) p.push(what + ' keepLines ' + keepLines + ': ' + tailKept.length + ' / ' + hookKept.length + ' ' + K + ' comments reported, want ' + keptWant.length);
        if (kc.some((k) => k.reason !== K)) p.push(what + ': a comment is kept for another reason: ' + J(kc.map((k) => k.reason)));
      }
    }
    row('rule K by reason: a comment after a weak slash (`)` `}` `++` `--`, a name + line break) is kept and reported as ' + K + ' (list and hook); one before it or after a strong slash is not', p, tries.length + ' inputs x 2 modes');
  }

  /* ===================== C17 · THE NET TEST: a wrong weak reading cannot change behaviour (review round 2) ===================== */
  /* The one line that decides a WEAK slash is `asRegex = regexAllowed(i);   // ← THE WEAK DECISION` in lean-strip.mjs. Three MUTANT copies of the
   * module are built in memory from the source text of the tree under test (the decision replaced by `true`, by `false`, by an alternation)
   * and loaded from a temp folder (with the copy of lean-gates.mjs they import). For EVERY non-throwing corpus case and EVERY snippet of the
   * executed-equivalence row (both keepLines modes), a mutant must THROW or return an output that V8 runs to the SAME result as the source.
   * This is the net's claim as behaviour: rule K keeps every comment of a tail and rule H refuses what could carry a literal across the
   * line, so no reading of a weak slash can change what the program does. A red case is a HOLE IN THE NET, not a row to weaken. */
  {
    const p = [];
    const { default: cases } = await import(url('scripts/pins-perflean/corpus/cases.mjs'));
    const srcText = readRaw(pjoin(base, 'scripts/lib/lean-strip.mjs'), 'utf8');
    const WEAK = /asRegex = regexAllowed\(i\);(\s*\/\/ ← THE WEAK DECISION)/g;
    const found = srcText.match(WEAK) || [];
    if (found.length !== 1) { row('THE NET TEST: the weak-decision line was not found exactly once (' + found.length + ' times): update the row', ['lean-strip.mjs has ' + found.length + ' matches of "asRegex = regexAllowed(i);   // ← THE WEAK DECISION"']); }
    else {
      const dir = mkdtempSync(pjoin(tmpdir(), 'pin-net-'));
      try {
        writeFileSync(pjoin(dir, 'lean-gates.mjs'), readRaw(pjoin(base, 'scripts/lib/lean-gates.mjs'), 'utf8'));
        const mutants = {};
        for (const [name, expr] of [['always-regex', 'asRegex = true;'], ['always-division', 'asRegex = false;'], ['alternating', 'asRegex = (slashes.weak % 2 === 1);']]) {
          const file = pjoin(dir, 'lean-strip.' + name + '.mjs');
          writeFileSync(file, srcText.replace(WEAK, () => expr + '   // MUTANT'));
          mutants[name] = await import(pathToFileURL(file).href);
        }
        const ser = (v) => { try { return typeof v === 'object' && v !== null ? 'obj:' + J(v, (k, x) => (typeof x === 'number' && !Number.isFinite(x) ? 'num:' + x : x instanceof RegExp ? String(x) : x)) : typeof v + ':' + String(v); } catch (e) { return 'unserialisable'; } };
        const run = (code) => { try { return ser(vm.runInNewContext(code, Object.create(null), { timeout: 2000 })); } catch (e) { return 'THROW ' + (e && e.name) + ': ' + (e && e.message); } };
        // review r3 A-3: [id, input, mustKeep, hostile]. HOSTILE (corpus `netH`): the real strip refuses it by rule H; with the rule-H arm
        // removed a mutant of the weak decision changes the V8 result (the witness of the arm). mustKeep (corpus `mustKeep`): exact
        // substrings (true comments with a keep word, their trailing blanks) that EVERY non-throwing output, real and mutant, must hold.
        const RULE_H = /whose reading the grammar does not fix/;
        const inputs = cases.filter((c) => c.kind === 'js' && (c.throws === undefined || c.netH)).map((c) => [c.id, c.input, c.mustKeep || [], !!c.netH]).concat(NET_PROGS.map(([id, src]) => [id, src, [], false]));
        const hostile = inputs.filter((x) => x[3]).length, withKeep = inputs.filter((x) => x[2].length).length;
        const real = { ran: 0, threw: 0, equal: 0, byCheck: 0 };
        const per = Object.fromEntries(Object.keys(mutants).map((k) => [k, { ran: 0, threw: 0, ruleH: 0, equal: 0, differs: 0, checkRefused: 0, sameOutput: 0 }]));
        let hole = 0, lost = 0, realH = 0;
        const REAL_CHECK = checkJsStrip;
        const keepCheck = (who, id, keepLines, out, mustKeep) => { for (const k of mustKeep) if (!out.includes(k)) { lost++; if (lost <= 4) p.push('A KEPT COMMENT LOST: ' + who + ' keepLines ' + keepLines + ' on ' + id + ': ' + J(k) + ' is not in the output ' + J(out.slice(0, 160))); } };
        for (const [id, src, mustKeep, isHostile] of inputs) {
          const want = run(src);
          for (const keepLines of [true, false]) {
            // the REAL strip: a hostile input is refused by rule H; any other keeps every mustKeep substring
            let rout = null, rerr = null;
            try { rout = stripJsComments(src, { keepLines, file: id }); } catch (e) { rerr = e; }
            if (isHostile) { if (rerr && RULE_H.test(rerr.message)) realH++; else p.push('the real strip does not refuse the hostile input ' + id + ' by rule H (keepLines ' + keepLines + '): ' + (rerr ? J(rerr.message.slice(0, 90)) : 'no throw')); }
            else if (rout !== null) keepCheck('the real strip', id, keepLines, rout, mustKeep);
            for (const [name, M] of Object.entries(mutants)) {
              const st = per[name];
              st.ran++;
              let out;
              try { out = M.stripJsComments(src, { keepLines, file: id }); } catch (e) { st.threw++; if (RULE_H.test(e.message)) st.ruleH++; continue; }
              keepCheck('mutant ' + name, id, keepLines, out, mustKeep);
              const got = run(out);
              if (got === want) { st.equal++; if (out === src) st.sameOutput++; }
              else {
                st.differs++;
                let refused = false; try { REAL_CHECK(src, out, id, { keepLines, external: false }); } catch (e) { refused = true; }
                if (refused) st.checkRefused++;
                hole++;
                if (hole <= 6) p.push('HOLE IN THE NET: mutant ' + name + ' keepLines ' + keepLines + ' on ' + id + ': V8 result ' + want.slice(0, 40) + ' → ' + got.slice(0, 40) + (refused ? ' (the real checkJsStrip refuses it, but the strip itself returned it)' : ' (the real checkJsStrip ACCEPTS it)') + ' input ' + J(src.slice(0, 120)));
              }
            }
          }
        }
        for (const [name, st] of Object.entries(per)) if (st.ran < 300) p.push('mutant ' + name + ' ran only ' + st.ran + ' times (want ≥ 300)');
        const tot = Object.values(per).reduce((a, s2) => ({ ran: a.ran + s2.ran, threw: a.threw + s2.threw, equal: a.equal + s2.equal }), { ran: 0, threw: 0, equal: 0 });
        // the net must be real: the always-regex / always-division mutants DO get refused on code with weak slashes (a net that never fires proves nothing)
        if (per['always-regex'].threw + per['always-division'].threw < 20) p.push('the mutants threw only ' + (per['always-regex'].threw + per['always-division'].threw) + ' times — the net is not exercised');
        // review r3 A-3: rule H must be exercised too — at least every mutant on every hostile input in both modes refuses by rule H
        const ruleH = Object.values(per).reduce((a, s2) => a + s2.ruleH, 0);
        if (hostile < 7) p.push('only ' + hostile + ' hostile rule-H inputs (corpus netH; want ≥ 7)');
        if (withKeep < 4) p.push('only ' + withKeep + ' inputs with mustKeep (want ≥ 4)');
        if (ruleH < 6 * hostile) p.push('only ' + ruleH + ' mutant throws are rule-H refusals (want ≥ ' + (6 * hostile) + ' = 3 mutants x 2 modes x ' + hostile + ' hostile inputs)');
        console.log('  note: net test ' + inputs.length + ' inputs (' + hostile + ' hostile, ' + withKeep + ' with mustKeep) x 2 modes x 3 mutants = ' + tot.ran + ' runs: ' + tot.threw + ' threw (' + ruleH + ' by rule H), ' + tot.equal + ' equal in V8, ' + hole + ' different, ' + lost + ' kept comments lost; real strip ' + realH + ' rule-H refusals; ' + J(per));
        row('THE NET TEST: with the weak decision replaced by true / false / an alternation, every non-throwing corpus case, every executed-equivalence snippet and every hostile rule-H input (both keepLines modes) THROWS or runs in V8 to the same result as the source; the real strip refuses each hostile input by rule H; every mustKeep comment is in every output', p,
          inputs.length + ' inputs (' + hostile + ' hostile, ' + withKeep + ' with mustKeep), ' + tot.ran + ' runs: ' + tot.threw + ' threw (' + ruleH + ' rule H), ' + tot.equal + ' equal, ' + hole + ' different, ' + lost + ' lost');
      } finally { rmSync(dir, { recursive: true, force: true }); }
    }
  }

  /* ───────── the temp tree: scripts/strip-release.mjs + scripts/lib + the committed html dir ───────── */
  const tmp = mkdtempSync(pjoin(tmpdir(), 'pin-p07-'));
  try {
    const tree = pjoin(tmp, 'tree');
    for (const rel of ['scripts/strip-release.mjs', 'scripts/lib', HTML]) {
      mkdirSync(pjoin(tree, rel, '..'), { recursive: true });
      cpSync(pjoin(base, rel), pjoin(tree, rel), { recursive: true });
    }
    const env = { ...process.env }; delete env.SPIXI_PACKAGED_LEAN; delete env.SPIXI_PACKAGED_FROM;          // a developer shell (or a packaged run) must not change what the CLI does
    const cli = (args) => {
      const r = spawnSync(process.execPath, ['scripts/strip-release.mjs', ...args], { cwd: tree, encoding: 'utf8', timeout: 180000, maxBuffer: 256 * 1024 * 1024, env });
      return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), stdout: r.stdout || '', err: r.error && r.error.message };
    };
    const brief = (r) => 'exit ' + r.code + (r.err ? ' (' + r.err + ')' : '') + ': ' + r.out.trim().split('\n').slice(-1)[0].slice(0, 110);
    const pkgJs = pjoin(tmp, 'pkg-js'), pkgOff = pjoin(tmp, 'pkg-off');
    cpSync(pjoin(tree, HTML), pkgJs, { recursive: true });
    cpSync(pjoin(tree, HTML), pkgOff, { recursive: true });
    const pk = (rel) => readRaw(pjoin(pkgJs, rel), 'utf8');

    /* ===================== C11 · fail closed ===================== */
    {
      const p = [];
      const iconsCopy = pjoin(tree, HTML, ICONS);
      const orig = readRaw(iconsCopy, 'utf8');
      const cases = [['an unterminated block comment', '\n/* never closed\nvar a = 1;\n'], ['a `<!--` line', '\n<!-- x\nvar a = 1;\n'], ['an unterminated string', "\nvar s = 'abc\nx';\n"]];
      try {
        for (const [what, add] of cases) {
          writeFileSync(iconsCopy, orig + add);
          const out = mkdtempSync(pjoin(tmp, 'fc-'));
          const r = cli(['--out', out, '--lean-js']);
          const left = listAll(out);
          if (r.code !== 1) p.push(what + ': ' + brief(r) + ' (want exit 1)');
          if (!r.out.includes(ICONS)) p.push(what + ': the message does not name ' + ICONS + ': ' + r.out.trim().split('\n').slice(-2).join(' / ').slice(0, 120));
          if (left.length) p.push(what + ': the out directory holds ' + left.length + ' file(s): ' + left.slice(0, 2).join(','));
        }
      } finally { writeFileSync(iconsCopy, orig); }
      const ctl = cli(['--out', mkdtempSync(pjoin(tmp, 'fc-')), '--lean-js']);
      if (ctl.code !== 0) p.push('positive control (the unchanged copy): ' + brief(ctl));
      row('fail closed: unterminated `/*`, `<!--`, unterminated string in a copy of icons → exit 1, file named, out dir empty', p);
    }
    /* ===================== C1 · GATE 1 on the lean package; off = today ===================== */
    let jsOutOk = false;
    {
      const p = [];
      const o = cli(['--out', pkgJs, '--lean-js']);
      jsOutOk = o.code === 0;
      if (o.code !== 0) p.push('--out --lean-js ' + brief(o));
      const written = (o.out.match(/^ {2}✓ /gm) || []).length;
      if (written !== 22) p.push('--out wrote ' + written + ' files (want 22)');
      const c = cli(['--check', pkgJs, '--lean-js']);
      if (c.code !== 0 || !c.out.includes('GATE 1 OK')) p.push('--check --lean-js ' + brief(c));
      if (!/for 22 file\(s\) in scope/.test(c.out)) p.push('GATE 1 line does not say "22 file(s) in scope": ' + c.out.trim().split('\n').pop().slice(0, 120));
      // off = today: no flag, --out into an EMPTY directory writes one file; a no-flag package passes the no-flag --check
      const emptyOut = pjoin(tmp, 'off-out');
      const oo = cli(['--out', emptyOut]);
      const files = listAll(emptyOut);
      if (oo.code !== 0 || files.join(',') !== 'spixi.tokens.css') p.push('no-flag --out wrote [' + files.join(',') + '] (want only spixi.tokens.css) ' + brief(oo));
      if (files.includes('spixi.tokens.css')) cpSync(pjoin(emptyOut, 'spixi.tokens.css'), pjoin(pkgOff, 'spixi.tokens.css'));
      const co = cli(['--check', pkgOff]);
      if (co.code !== 0 || !/GATE 1 OK/.test(co.out) || /lean mode/.test(co.out)) p.push('no-flag --check of a no-flag package ' + brief(co));
      for (const f of EXTERNAL_JS) if (!readRaw(pjoin(pkgOff, f)).equals(readRaw(pjoin(base, HTML, f)))) p.push('no-flag package: ' + f + ' differs from committed');
      for (const f of shells) if (!readRaw(pjoin(pkgOff, f)).equals(readRaw(pjoin(base, HTML, f)))) p.push('no-flag package: ' + f + ' differs from committed');
      // and the lean flag really changes the three files (the no-flag equality above is not vacuous)
      for (const f of EXTERNAL_JS) if (jsOutOk && pk(f) === committed[f]) p.push('lean package: ' + f + ' is identical to committed (nothing was stripped)');
      row('the lean JS package passes `--check … --lean-js` (GATE 1 OK, 22 files); no flag = today (only spixi.tokens.css written, externals + shells byte-identical)', p, written + ' files written');
    }
    if (!jsOutOk) {   // nothing below can run without a package: fail loud, once
      row('the lean package could not be made — the rows that need it are NOT run', ['--out --lean-js failed']);
      return;
    }

    /* ===================== C2 · lines hold ===================== */
    const lineProblems = [];
    {
      const p = [];
      let info = [];
      for (const f of EXTERNAL_JS) {
        const a = committed[f], b = pk(f);
        if (a === b) { p.push(f + ': unchanged'); continue; }
        const la = lc(a), lb = lc(b);
        if (la.length !== lb.length) p.push(f + ': line count ' + la.length + ' → ' + lb.length);
        const inv = lineInvariant(a, b, { anchors: JS_LINE_ANCHORS[f], subsequence: true });
        if (inv.length) p.push(f + ': lineInvariant ' + J(inv.slice(0, 2)));
        if (!JS_LINE_ANCHORS[f] || !JS_LINE_ANCHORS[f].length) p.push(f + ': no anchors');
        let bad = 0, first = 0;
        for (let i = 0; i < Math.min(la.length, lb.length); i++) {
          const x = la[i].replace(/[ \t]/g, ''), y = lb[i].replace(/[ \t]/g, '');
          let k = 0;
          for (let j = 0; j < y.length; j++) { k = x.indexOf(y[j], k); if (k < 0) break; k++; }
          if (k < 0) { bad++; if (!first) first = i + 1; }
        }
        if (bad) p.push(f + ': ' + bad + ' line(s) not a subsequence of the committed line (first: ' + first + ')');
        info.push(f.replace('spixi.', '').replace('.js', '') + ' ' + la.length + ' lines');
      }
      const lb = lc(pk(BUNDLE));
      if (!lb[46] || !lb[46].includes(P1_LINE)) p.push('line 47 of the packaged bundle is ' + J((lb[46] || '').slice(0, 60)) + ', not the [P1] warn');
      if (lc(committed[BUNDLE])[46].includes(P1_LINE) === false) p.push('the committed bundle no longer has the [P1] warn on line 47 (the pin\'s premise)');
      lineProblems.push(...p);
      row('lines hold: same line count, lineInvariant [], every packaged line a subsequence of its committed line, line 47 = the [P1] warn', p, info.join(', '));
    }

    /* ===================== C3 · the files executed, committed against packaged ===================== */
    {
      const p = [];
      const order = EXTERNAL_JS.slice().reverse();        // icons, strings, bundle: the bundle needs SpixiIcons first
      const ser = (v) => { try { return J(v, (k, x) => (typeof x === 'function' ? '[fn ' + x.name + '/' + x.length + ']' : x instanceof Object && Object.prototype.toString.call(x) === '[object RegExp]' ? String(x) : typeof x === 'number' && !Number.isFinite(x) ? 'num:' + x : x)); } catch (e) { return '[unserialisable ' + typeof v + ']'; } };
      const probe = (dirOf) => {
        const dom = new JSDOM('<!doctype html><html data-p1><head></head><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/', virtualConsole: new VirtualConsole() });
        const w = dom.window;
        const R = { errors: [] };
        try {
          for (const f of order) w.eval(readRaw(pjoin(dirOf, f), 'utf8') + '\n//# sourceURL=' + f);
          const S = w.SpixiStrings, I = w.SpixiIcons, X = w.Spixi;
          const frames = (stack, file) => String(stack).split('\n').map((l) => new RegExp(file.replace(/\./g, '\\.') + ':(\\d+):').exec(l)).filter(Boolean).map((m) => +m[1]);
          R.strings = ser({ enUS: S.enUS, locales: S.locales });
          R.stringsKeys = Object.keys(S).map((k) => k + ':' + typeof S[k]).join(',');
          R.stringsGet = ser(['en-us', 'de-de', 'xx-yy', 'pseudo'].map((c) => { const d = S.get(c); return c === 'pseudo' ? String(d.hello) : d; }));
          R.icons = ser(I.ICONS);
          R.iconsKeys = Object.keys(I).map((k) => k + ':' + typeof I[k]).join(',');
          R.spixiKeys = Object.keys(X).join(',');
          R.spixiTypes = Object.keys(X).map((k) => k + ':' + typeof X[k] + (typeof X[k] === 'function' ? '/' + X[k].length + '/' + X[k].name : '')).join(',');
          R.spixiConst = ser(Object.fromEntries(Object.keys(X).filter((k) => typeof X[k] !== 'function').map((k) => [k, X[k]])));
          // the [P1] warn: install a catcher, call p1Log with a valid line; document has data-p1
          const warns = [];
          const savedWarn = w.console.warn;
          w.console.warn = function () { warns.push(new Error('probe').stack); };
          X.p1Log('abc_d=1');
          R.p1 = warns.map((s) => frames(s, BUNDLE).join(','));
          // the icons warn (an unknown icon name) and a throw inside spixi.strings.js (a Symbol is not a string)
          warns.length = 0;
          try { I.icon('no-such-icon-zz'); } catch (e) { R.errors.push('icon: ' + e.message); }
          R.iconWarn = warns.map((s) => frames(s, ICONS).join(','));
          w.console.warn = savedWarn;
          try { S.get(w.Symbol('x')); R.strThrow = 'no throw'; } catch (e) { R.strThrow = e.name + ':' + frames(e.stack, STRINGS).join(','); }
          // every export called with (null, null): the error it throws and the lines of its frames in the bundle
          R.thrown = {};
          for (const k of Object.keys(X)) {
            if (typeof X[k] !== 'function') continue;
            try { X[k](null, null); R.thrown[k] = 'ok'; } catch (e) { R.thrown[k] = (e && e.name) + '|' + (e && e.message) + '|' + frames(e && e.stack, BUNDLE).join(','); }
          }
        } catch (e) { R.errors.push('probe failed: ' + (e && e.stack || e)); }
        finally { try { w.close(); } catch (e) { /* ignore */ } }
        return R;
      };
      const A = probe(pjoin(base, HTML)), B = probe(pkgJs);
      for (const e of [...A.errors, ...B.errors]) p.push(e);
      for (const k of ['strings', 'stringsKeys', 'stringsGet', 'icons', 'iconsKeys', 'spixiKeys', 'spixiTypes', 'spixiConst', 'p1', 'iconWarn', 'strThrow']) {
        if (J(A[k]) !== J(B[k])) p.push(k + ' differs: ' + J(A[k]).slice(0, 70) + ' vs ' + J(B[k]).slice(0, 70));
      }
      const tk = Object.keys(A.thrown || {});
      const diffs = tk.filter((k) => A.thrown[k] !== (B.thrown || {})[k]);
      if (diffs.length) p.push(diffs.length + ' export(s) behave differently on (null, null), first ' + diffs[0] + ': ' + J(A.thrown[diffs[0]]) + ' vs ' + J((B.thrown || {})[diffs[0]]));
      if (Object.keys(B.thrown || {}).length !== tk.length) p.push('export count differs');
      // premises: the probe is not vacuous
      const lineSet = (R) => Object.values(R.thrown || {}).filter((v) => v !== 'ok').flatMap((v) => v.split('|')[2].split(',').filter(Boolean).map(Number));
      const la = lineSet(A);
      const thrownN = Object.values(A.thrown || {}).filter((v) => v !== 'ok').length;
      if (thrownN < 50) p.push('only ' + thrownN + ' exports threw on (null, null) — the line proof is too thin');
      if (!la.some((n) => n > 30000)) p.push('no thrown frame deeper than line 30000 (max ' + Math.max(0, ...la) + ')');
      if (A.p1 && A.p1.join('|') !== '47') p.push('the [P1] warn is reported at line(s) ' + J(A.p1) + ' in the COMMITTED bundle (premise: 47)');
      if (B.p1 && B.p1.join('|') !== '47') p.push('the [P1] warn is reported at line(s) ' + J(B.p1) + ' in the PACKAGED bundle (want 47)');
      if (!A.iconWarn || !A.iconWarn.length || !/\d/.test(A.iconWarn[0])) p.push('no icons warn line captured');
      if (!/:\d+/.test(A.strThrow || '')) p.push('no throw line captured inside spixi.strings.js (' + A.strThrow + ')');
      const nStr = (() => { try { return Object.keys(JSON.parse(A.strings).locales).length; } catch (e) { return 0; } })();
      if (nStr < 10) p.push('only ' + nStr + ' locales compared');
      row('executed in two JSDOM windows: strings / icons / exports equal, and V8 reports the same lines (P1 warn, icons warn, strings throw, every throwing export)', p,
        nStr + ' locales, ' + Object.keys(A.thrown || {}).length + ' exports, ' + thrownN + ' thrown, deepest frame line ' + Math.max(0, ...la));
    }

    /* ===================== C4 · inline scripts: an independent view with JSDOM ===================== */
    const JS_TYPE = /^(?:text|application)\/(?:x-)?(?:javascript|ecmascript|jscript|livescript)(?:1\.[0-5])?$/;
    const view = (html) => {
      const dom = new JSDOM(html, { virtualConsole: new VirtualConsole() });          // runScripts unset: nothing runs, nothing loads
      const doc = dom.window.document;
      const scripts = [], styles = [];
      const collect = (r) => { for (const el of r.querySelectorAll('script, style, template')) { if (el.localName === 'template') collect(el.content); else if (el.localName === 'script') scripts.push({ el, text: el.textContent, type: el.getAttribute('type'), src: el.hasAttribute('src') }); else styles.push(el.textContent); } };
      collect(doc);
      for (const s of scripts) s.el.textContent = '';
      const skeleton = (doc.doctype ? doc.doctype.name : '') + '\n' + doc.documentElement.outerHTML;
      dom.window.close();
      return { scripts: scripts.map(({ text, type, src }) => ({ text, type, src })), styles, skeleton };
    };
    const compare = (name, c, q, stats, p) => {
      if (c.scripts.length !== q.scripts.length) { p.push(name + ': ' + c.scripts.length + ' scripts → ' + q.scripts.length); return; }
      if (c.styles.length !== q.styles.length || c.styles.some((s, i) => s !== q.styles[i])) p.push(name + ': a <style> changed');
      if (c.skeleton !== q.skeleton) p.push(name + ': the document outside script bodies changed');
      c.scripts.forEach((s, i) => {
        const t = q.scripts[i];
        if (s.type !== t.type || s.src !== t.src) { p.push(name + ' script ' + i + ': attributes changed'); return; }
        const classic = !s.src && (s.type === null || s.type.trim() === '' || JS_TYPE.test(s.type.trim().toLowerCase()));
        if (!classic) { stats.other++; if (s.text !== t.text) p.push(name + ' script ' + i + ' (' + (s.src ? 'src' : s.type) + '): body changed'); return; }
        stats.classic++;
        if (t.text !== stripJsComments(s.text, { keepLines: false })) p.push(name + ' script ' + i + ': packaged ≠ strip(committed)');
        try { new vm.Script(t.text, { filename: name + '#' + i }); } catch (e) { p.push(name + ' script ' + i + ' does not compile: ' + e.message); }
        stats.bytes0 += s.text.length; stats.bytes1 += t.text.length;
        if (t.text.length > s.text.length) p.push(name + ' script ' + i + ' GREW');
      });
    };
    {
      const p = [];
      const stats = { classic: 0, other: 0, bytes0: 0, bytes1: 0 };
      let nShells = 0;
      for (const f of shells) {
        compare(f, view(read(f)), view(pk(f)), stats, p);
        nShells++;
      }
      if (nShells < 10 || stats.classic < 50) p.push('compared only ' + nShells + ' shells / ' + stats.classic + ' classic scripts — vacuous');
      if (stats.bytes1 >= stats.bytes0) p.push('inline scripts did not shrink (' + stats.bytes0 + ' → ' + stats.bytes1 + ')');
      // the comparator itself: a synthetic shell with a JSON script, a src script with a body, a module and a classic script
      const syn = '<!doctype html><html><head><style>.a{ /* css */ color:red }</style><script type="application/json">{"a":"//","b":"/* x */"} /* not js */</script>'
        + '<script src="x.js">// body of a src script</script><script type="module">// m\nimport a from "b";</script>'
        + '<script>var s = "/* k */"; // c\n/* d */ f(s);</script></head><body><p>hi</p></body></html>';
      const synOut = lean.leanHtml(syn, { js: true });
      const sstats = { classic: 0, other: 0, bytes0: 0, bytes1: 0 }, sp = [];
      compare('synthetic', view(syn), view(synOut), sstats, sp);
      if (sp.length) p.push('synthetic shell: ' + sp.slice(0, 2).join(' | '));
      if (sstats.classic !== 1 || sstats.other !== 3) p.push('synthetic shell: classic ' + sstats.classic + ' (want 1), other ' + sstats.other + ' (want 3)');
      for (const [what, bad] of [['JSON body', synOut.replace('"b":"/* x */"', '"b":"/* y */"')], ['JSON comment', synOut.replace('/* not js */', '')], ['src body', synOut.replace('body of a src script', 'BODY of a src script')], ['classic body', synOut.replace('f(s);', 'f(s) ;')], ['style', synOut.replace('color:red', 'color:blue')], ['markup', synOut.replace('<p>hi</p>', '<p>ho</p>')]]) {
        const tp = [];
        if (bad === synOut) { p.push('comparator self-test: the tamper "' + what + '" did not apply'); continue; }
        compare('tampered', view(syn), view(bad), { classic: 0, other: 0, bytes0: 0, bytes1: 0 }, tp);
        if (!tp.length) p.push('comparator self-test: a tampered ' + what + ' was NOT caught');
      }
      row('inline scripts via JSDOM: classic = strip(committed) and compiles, others byte-identical, styles + document unchanged; the comparator catches 6 tampers', p,
        nShells + ' shells, ' + stats.classic + ' classic inline scripts ' + stats.bytes0 + ' → ' + stats.bytes1 + ' chars, ' + stats.other + ' other scripts');
    }

    /* ===================== C5 · nothing removable left, nothing kept lost ===================== */
    {
      const p = [];
      const NOTICE = /copyright|licen[cs]e|spdx-license-identifier|@preserve|©|\*SL\{|https?:\/\/|@author|adapted from|ported from|stackoverflow/gi;   // the pin's OWN word list: a line may not lose or gain one (review S-4: URLs and attribution words are kept too)
      let kept = 0;
      for (const f of EXTERNAL_JS) {
        const a = committed[f], b = pk(f);
        if (stripJsComments(b, { keepLines: true }) !== b) p.push(f + ': the strip is not idempotent');
        const la = lc(a), lb = lc(b);
        let bad = 0, first = 0;
        for (let i = 0; i < la.length && i < lb.length; i++) {
          const x = (la[i].match(NOTICE) || []).join('|').toLowerCase(), y = (lb[i].match(NOTICE) || []).join('|').toLowerCase();
          if (x !== y) { bad++; if (!first) first = i + 1; }
        }
        if (bad) p.push(f + ': ' + bad + ' line(s) lost or gained a carrier / licence word (first: ' + first + ')');
        // an own scan: a packaged line that starts with `//` must sit in a run of `//` lines (committed) that holds a notice word
        const isSl = (s) => /^[ \t]*\/\//.test(s);
        for (let i = 0; i < lb.length; i++) {
          if (!isSl(lb[i])) continue;
          let s = i, e = i;
          while (s > 0 && isSl(la[s - 1])) s--;
          while (e < la.length - 1 && isSl(la[e + 1])) e++;
          const run = la.slice(s, e + 1).join('\n');
          if (!keepReason(run)) { p.push(f + ':' + (i + 1) + ': a // comment line survived outside any kept run (no licence word, carrier, URL or attribution word): ' + J(lb[i].slice(0, 50))); break; }
          if (la[i] !== lb[i]) { p.push(f + ':' + (i + 1) + ': a line of a kept // run was changed'); break; }
        }
        // every kept comment of the library is in the package ON ITS LINE
        for (const k of jsKeptComments(a, { file: f })) {
          kept++;
          let at = -1, ok1 = false;
          while ((at = b.indexOf(k.text, at + 1)) >= 0) { let line = 1; for (let q = b.indexOf('\n'); q >= 0 && q < at; q = b.indexOf('\n', q + 1)) line++; if (line === k.line) { ok1 = true; break; } }
          if (!ok1) p.push(f + ':' + k.line + ': kept comment missing or on another line: ' + J(k.text.slice(0, 50)));
        }
      }
      // the qrcode-generator banner: the run of adjacent `//` lines around "Copyright (c) 2009 Kazuhiko Arase"
      const la = lc(committed[BUNDLE]), lb = lc(pk(BUNDLE));
      const at = la.findIndex((l) => l.includes('Copyright (c) 2009 Kazuhiko Arase'));
      let bannerInfo = 'banner NOT FOUND';
      if (at < 0) p.push('the committed bundle has no "Copyright (c) 2009 Kazuhiko Arase" line (premise)');
      else {
        let s = at, e = at;
        while (s > 0 && /^[ \t]*\/\//.test(la[s - 1])) s--;
        while (e < la.length - 1 && /^[ \t]*\/\//.test(la[e + 1])) e++;
        const run = la.slice(s, e + 1);
        if (run.length < 3 || !run.some((l) => l.includes('Licensed under the MIT license'))) p.push('the banner run is ' + run.length + ' line(s) and has no "Licensed under the MIT license" (premise)');
        for (let i = s; i <= e; i++) if (lb[i] !== la[i]) { p.push('banner line ' + (i + 1) + ' differs or moved: ' + J((lb[i] || '').slice(0, 60))); break; }
        if (lb.length !== la.length) p.push('banner: the line count moved');
        bannerInfo = 'banner lines ' + (s + 1) + '–' + (e + 1);
      }
      // carriers: every shipped file, committed against packaged
      let carriers = 0, files = 0;
      for (const f of shipped) {
        files++;
        const a = read(f), b = existsSync(pjoin(pkgJs, f)) ? pk(f) : null;
        if (b === null) { p.push(f + ': missing from the package'); continue; }
        const d = carrierDiff(a, b);
        if (d.length) p.push(f + ': carrierDiff ' + J(d.slice(0, 2)));
        for (const n of carrierCounts(a).values()) carriers += n;
      }
      const sl = (s) => (s.match(/\*SL\{SpixiP1\}/g) || []).length;
      if (sl(committed[BUNDLE]) < 2 || sl(pk(BUNDLE)) !== sl(committed[BUNDLE])) p.push('*SL{SpixiP1} in the bundle: ' + sl(committed[BUNDLE]) + ' → ' + sl(pk(BUNDLE)) + ' (premise: 2 → 2)');
      // inline scripts are idempotent too
      let inl = 0;
      for (const f of shells) for (const s of view(pk(f)).scripts) { if (s.src || !(s.type === null || JS_TYPE.test((s.type || '').trim().toLowerCase()))) continue; inl++; if (stripJsComments(s.text, { keepLines: false }) !== s.text) { p.push(f + ': an inline script is not idempotent'); break; } }
      row('nothing removable left, nothing kept lost: idempotent (3 files + ' + inl + ' inline scripts), carriers / licence words per line, kept comments + qrcode banner on their lines, carrierDiff [] everywhere', p,
        kept + ' kept comments, ' + bannerInfo + ', ' + files + ' files, ' + carriers + ' carriers');
    }

    /* ===================== C15 · review S-4: the URL and attribution comments of the bundle stay ===================== */
    /* The pin's OWN walk (lines that start with `//`), no keepReason: every comment line of the committed bundle that holds a URL is
     * in the package byte for byte on its line; the Stack Overflow line inside the vendored qrcode-generator and the 16-line banner too. */
    {
      const p = [];
      const la = lc(committed[BUNDLE]), lb = lc(pk(BUNDLE));
      let urlLines = 0;
      for (let i = 0; i < la.length; i++) {
        if (!/^[ \t]*\/\//.test(la[i]) || !/https?:\/\//i.test(la[i])) continue;
        urlLines++;
        if (lb[i] !== la[i]) { p.push('line ' + (i + 1) + ': a // comment with a URL changed or moved: ' + J(la[i].slice(0, 70)) + ' → ' + J((lb[i] || '').slice(0, 70))); break; }
      }
      if (urlLines < 5) p.push('only ' + urlLines + ' // lines with a URL in the committed bundle (premise ≥ 5)');
      const so = la.findIndex((l) => l.includes('stackoverflow.com/questions/18729405'));
      if (so < 0) p.push('premise: the committed bundle has no "stackoverflow.com/questions/18729405" line');
      else {
        if (!/^[ \t]*\/\/ http:\/\/stackoverflow\.com\/questions\/18729405\//.test(la[so])) p.push('premise: line ' + (so + 1) + ' is not a `// http://stackoverflow.com/…` comment line: ' + J(la[so].slice(0, 60)));
        if (lb[so] !== la[so]) p.push('the Stack Overflow comment (line ' + (so + 1) + ') is not in the package byte for byte on its line: ' + J((lb[so] || '').slice(0, 90)));
      }
      const count = (ls, w) => ls.filter((l) => l.includes(w)).length;
      if (count(lb, 'stackoverflow.com') !== count(la, 'stackoverflow.com')) p.push('"stackoverflow.com" on ' + count(la, 'stackoverflow.com') + ' lines → ' + count(lb, 'stackoverflow.com'));
      const bn = la.findIndex((l) => l.includes('Copyright (c) 2009 Kazuhiko Arase'));
      let s = bn, e = bn;
      if (bn < 0) p.push('premise: no "Copyright (c) 2009 Kazuhiko Arase" line');
      else {
        while (s > 0 && /^[ \t]*\/\//.test(la[s - 1])) s--;
        while (e < la.length - 1 && /^[ \t]*\/\//.test(la[e + 1])) e++;
        if (e - s + 1 !== 16) p.push('premise: the banner run is ' + (e - s + 1) + ' lines (want 16)');
        for (let i = s; i <= e; i++) if (lb[i] !== la[i]) { p.push('banner line ' + (i + 1) + ' differs: ' + J((lb[i] || '').slice(0, 70))); break; }
      }
      const tabInfo = [];
      const units = { [BUNDLE]: 0, [STRINGS]: 0, [ICONS]: 0 };
      for (const f of EXTERNAL_JS) units[f] = jsKeptComments(pk(f), { file: f }).length;
      if (units[BUNDLE] !== 32 || units[STRINGS] !== 2 || units[ICONS] !== 1) p.push('kept units of the package: bundle ' + units[BUNDLE] + ', strings ' + units[STRINGS] + ', icons ' + units[ICONS] + ' (want 32 / 2 / 1 — a change needs a look, not a silent re-base)');
      // review round 2: the two `tabler` comments (keepReason keeps the word, any case), the comment kept by rule K (a tail), and the icons.js one — each found by its text, byte for byte on its line
      for (const [file, needle, why] of [[BUNDLE, '/* tabler "backspace"', 'tabler (block comment)'], [BUNDLE, '; // tabler check', 'tabler (line comment)'], [BUNDLE, '// blocks per ms', 'rule K: a comment after `(cur - c0) / elapsed`'], [ICONS, 'filled Tabler set', 'tabler (spixi.icons.js)']]) {
        const x = lc(committed[file]), y = lc(pk(file));
        const at = x.map((l, i) => l.includes(needle) ? i : -1).filter((i) => i >= 0);
        if (at.length !== 1) { p.push(why + ': ' + at.length + ' lines hold ' + J(needle) + ' in the committed ' + file + ' (premise: 1)'); continue; }
        if (y[at[0]] !== x[at[0]]) p.push(why + ': line ' + (at[0] + 1) + ' of the package differs: ' + J((y[at[0]] || '').slice(0, 90)));
        else tabInfo.push(file.replace('spixi.', '').replace('.js', '') + ':' + (at[0] + 1));
      }
      row('S-4: every `// … http(s)://` comment line of the bundle, the Stack Overflow line inside the qrcode-generator and its 16-line banner are in the package byte for byte on their lines', p,
        urlLines + ' URL comment lines, Stack Overflow line ' + (so + 1) + ', banner ' + (s + 1) + '–' + (e + 1) + ', kept units ' + units[BUNDLE] + ' / ' + units[STRINGS] + ' / ' + units[ICONS] + ', byte for byte: ' + tabInfo.join(' '));
    }

    /* ===================== C6 · the size claim ===================== */
    {
      const p = [];
      const a = Buffer.byteLength(committed[BUNDLE], 'utf8'), b = Buffer.byteLength(pk(BUNDLE), 'utf8');
      const pct = Math.round((1 - b / a) * 1000) / 10;
      if (!(b <= a * 0.7)) p.push('the packaged bundle is only ' + pct + ' % smaller (' + a + ' → ' + b + ', want ≥ 30 %)');
      row('the size claim is real: the packaged bundle is at least 30 % smaller in bytes', p, a + ' → ' + b + ' bytes, −' + pct + ' %');
    }

    /* ===================== C7 / C8 · deliberate breaks of the PACKAGE ===================== */
    const tamper = (dir, rel, fn, argv, why) => {       // write a changed file, run, restore the exact bytes
      const file = pjoin(dir, rel);
      const orig = readRaw(file, 'utf8');
      const next = fn(orig);
      if (next == null || next === orig) return { skipped: 'mutation did not apply to ' + rel + (why ? ' (' + why + ')' : '') + ' — the break proves nothing' };
      try { writeFileSync(file, next); return cli(argv); }
      finally { writeFileSync(file, orig); if (readRaw(file, 'utf8') !== orig) throw new Error('could not restore ' + rel); }
    };
    const expect = (p, label, r, texts) => {
      if (r.skipped) { p.push(label + ': ' + r.skipped); return; }
      if (r.code !== 1) p.push(label + ': ' + brief(r) + ' (want exit 1)');
      for (const t of texts) if (!r.out.includes(t)) p.push(label + ': the message lacks ' + J(t));
    };
    const bundleLines = lc(committed[BUNDLE]);
    const anchorLine = (a) => bundleLines.findIndex((l) => l.includes(a)) + 1;
    const mid = 30000;
    const endAnchors = (JS_LINE_ANCHORS[BUNDLE] || []).filter((a) => anchorLine(a) > mid + 1);
    const joinAfter = (k) => (t) => { const at = nl(t, k); return at < 0 ? null : t.slice(0, at) + t.slice(at + 1); };      // remove the newline that ends line k
    const N = bundleLines.length;
    {
      const p = [];
      // (a) a newline lost after line 30000
      if (!endAnchors.length) p.push('no anchor after line 30000 (premise)');
      const ra = tamper(pkgJs, BUNDLE, joinAfter(mid), ['--check', pkgJs, '--lean-js']);
      expect(p, '(a) newline lost after line 30000', ra, ['line count ' + N + ' → ' + (N - 1), ...endAnchors.map((a) => 'anchor ' + J(a) + ': line ' + anchorLine(a) + ' → ' + (anchorLine(a) - 1))]);
      if (!ra.skipped && ra.out.includes('anchor ' + J(P1_LINE) + ': line')) p.push('(a): the P1 anchor (line 47, before the break) was named although it did not move');
      // (b) a newline lost before line 47
      const rb = tamper(pkgJs, BUNDLE, joinAfter(10), ['--check', pkgJs, '--lean-js']);
      expect(p, '(b) newline lost before line 47', rb, ['line count ' + N + ' → ' + (N - 1), 'anchor ' + J(P1_LINE) + ': line 47 → 46']);
      // (c) same line count, text moved to the next line
      let K = 0;
      const pl = lc(pk(BUNDLE));
      for (let i = 1500; i < 3000 && !K; i++) if (/;\s*$/.test(pl[i]) && /\S.{8,}/.test(pl[i + 1]) && !(JS_LINE_ANCHORS[BUNDLE] || []).some((a) => pl[i].includes(a) || pl[i + 1].includes(a))) K = i + 1;   // 1-based line that ends with ';'
      if (!K) p.push('(c): no line to move a ";" from (premise)');
      else {
        const rc = tamper(pkgJs, BUNDLE, (t) => { const L = lc(t); L[K - 1] = L[K - 1].replace(/;(\s*)$/, '$1'); L[K] = ';' + L[K]; return L.join('\n'); }, ['--check', pkgJs, '--lean-js']);
        expect(p, '(c) ";" moved from line ' + K + ' to ' + (K + 1), rc, ['packaged ≠ lean(committed)', 'line ' + (K + 1) + ': text added or moved']);
        if (!rc.skipped && /line count/.test(rc.out)) p.push('(c): the line count changed — the case is not "count kept"');
      }
      // (g) the NO-FLAG check of a no-flag package: the line invariant is always on
      const off = tamper(pkgOff, BUNDLE, joinAfter(mid), ['--check', pkgOff]);
      expect(p, '(g) no flag, newline lost after line 30000', off, ['line count ' + N + ' → ' + (N - 1), ...endAnchors.map((a) => 'anchor ' + J(a) + ': line ' + anchorLine(a) + ' → ' + (anchorLine(a) - 1))]);
      const off2 = tamper(pkgOff, BUNDLE, joinAfter(10), ['--check', pkgOff]);
      expect(p, '(g) no flag, newline lost before line 47', off2, ['line count ' + N + ' → ' + (N - 1), 'anchor ' + J(P1_LINE) + ': line 47 → 46']);
      row('breaks of the package: (a) newline lost after line 30000, (b) before line 47, (c) text moved with the count kept, (g) (a) and (b) on a no-flag package', p);
    }
    {
      const p = [];
      // (d) the committed spixi.icons.js put back into the lean package
      const rd = tamper(pkgJs, ICONS, () => committed[ICONS], ['--check', pkgJs, '--lean-js']);
      expect(p, '(d) committed spixi.icons.js put back', rd, [ICONS + ': packaged ≠ lean(committed)']);
      // (e) one character inside a string literal of spixi.strings.js
      const re = tamper(pkgJs, STRINGS, (t) => { const k = t.indexOf('"about":"About"'); return k < 0 ? null : t.slice(0, k) + '"about":"Abouu"' + t.slice(k + '"about":"About"'.length); }, ['--check', pkgJs, '--lean-js'], 'the string "about":"About"');
      expect(p, '(e) one character of a string of spixi.strings.js', re, [STRINGS + ': packaged ≠ lean(committed)']);
      // (f) a carrier folded in a shell's inline script
      const SL = "'*SL{SpixiP1}'";
      const fold = shells.find((f) => { const t = pk(f); const at = t.indexOf(SL); return at >= 0 && t.lastIndexOf('<script', at) > t.lastIndexOf('</script', at); });
      if (!fold) p.push('(f): no shell has \'*SL{SpixiP1}\' inside an inline script (premise)');
      else {
        const n0 = (pk(fold).match(/\*SL\{SpixiP1\}/g) || []).length;
        const rf = tamper(pkgJs, fold, (t) => t.replace(SL, "'1'"), ['--check', pkgJs, '--lean-js']);
        expect(p, '(f) carrier folded in ' + fold, rf, [fold + ': carrier *SL{SpixiP1} ' + n0 + ' → ' + (n0 - 1)]);
      }
      // every file is back as it was: the package passes again (the breaks above restored their bytes)
      const c1 = cli(['--check', pkgJs, '--lean-js']);
      if (c1.code !== 0 || !c1.out.includes('GATE 1 OK')) p.push('positive control after the breaks (lean): ' + brief(c1));
      const c2 = cli(['--check', pkgOff]);
      if (c2.code !== 0 || !c2.out.includes('GATE 1 OK')) p.push('positive control after the breaks (no flag): ' + brief(c2));
      row('breaks of the package: (d) committed icons put back, (e) one string character, (f) carrier folded in a shell; restored, both packages pass again', p);
    }

  } finally {
    rmSync(tmp, { recursive: true, force: true });
    // review A-5: the time is a NOTE, never a row (a wall-clock budget was red in 13 of 15 runs beside other readers; CI machines are slower still)
    console.log('  note: pins-perflean/c-js module time ' + (Math.round((Date.now() - T0) / 100) / 10) + ' s (no row depends on it)');
  }
}
