/* ==== perflean P-09 (pins-a) — the carrier gate and the line invariant, executed (docs/contract-perflean.md § 3.1 / § 3.2) ====
 *
 * Why the gates exist. C# replaces every `*SL{key}` of a shell, line by line, on the device (SpixiLocalization.localizeHtml). A transform
 * inside the build (a minifier, a fold) that turns `'*SL{SpixiP1}' === '1'` into `false` ships a shell that is wrong on the device only,
 * and "committed ≡ fresh build" cannot see it because the fresh build folds too. The three external scripts are cited by device logs
 * by line (spixi.bundle.js:47), so they must keep every line on its line. scripts/lib/lean-gates.mjs holds the two invariants as pure
 * functions; scripts/build-shells.mjs runs them as the "P-09" gates (a normal build HOLDS every write until they pass).
 *
 * These pins are BEHAVIOUR (#771 / #798): nothing here reads source text. Part A executes the library on the REAL shipped files, in
 * memory. Part B copies what the build needs into os.tmpdir() (scripts/build-shells.mjs, scripts/lib, src, Spixi/Resources/Raw/html;
 * ~25 MB, never the working tree) and runs the REAL build-shells.mjs there with spawnSync — once clean, then with the three recipes
 * of the builder's proof applied to the COPY. A recipe that does not find its target makes its row FAIL ("mutation did not apply"):
 * a mutation that did not apply proves nothing. The copy is deleted in `finally`.
 *
 * Rows (A1–B4: 13, B5–B8 and S1–S9 below: 13 more, S10–S13 of review round 2: 4 more; every title starts "★ perflean P-09"):
 *  A1  carrierDiff on the committed chat.html: the carrier SpixiP1 folded away → exactly ONE entry, named with both counts; untouched → [].
 *  A2  carrierDiff edge cases: a carrier ADDED is reported; a carrier in a block, line or HTML comment counts (raw text); two on one
 *      line both count; `*SL{` without a `}` on the same line is not a carrier.
 *  A3  lineInvariant on the committed spixi.bundle.js with JS_LINE_ANCHORS: identical → []; a comment tail cut inside a line (newline kept)
 *      → []; blanks stripped or added → [] (subsequence skips spaces and tabs in both texts).
 *  A4  a lost newline: after line 30000 → the line-count problem AND the moved end anchor (and nothing else); before line 47 → the P1
 *      anchor `line 47 → 46` (+ the count and the two later anchors).
 *  A5  text ADDED to one line → `line 100: text added or moved`; two lines SWAPPED (count unchanged) → both lines named; both only with
 *      subsequence:true (with it off the library says [] — the option is what catches them).
 *  A6  anchors: one on two lines of the source → "not unique in the source (lines a and b)"; one missing from both / from the output → reported.
 *  A7  every anchor of JS_LINE_ANCHORS (files from EXTERNAL_JS) sits on exactly ONE line of its committed file; the P1 anchor is line 47.
 *  A8  inlineHtml's onSource hook: the entry first, then every inlined css / js (existing files), and no output byte changes.
 *  B1  the real `build-shells.mjs --check` on an untouched copy: exit 0, last line `P-09 gates ✓`, shells ≥ 18, carriers > 0 (read out).
 *  B1b positive control of every "writes nothing" below: a NORMAL build whose gates pass really writes (a source marker reaches
 *      Raw/html/chat.html), and a carrier added to an INLINED css (components/button.css) is summed with its shell, not flagged.
 *  B2  recipe 1 (carrier fold after the inlineHtml call): a NORMAL build exits 1, names `*SL{SpixiP1}` on ≥ 18 shells and writes NOTHING
 *      (Raw/html hashed before / after); `--check` exits 1 too; a fold inside the external spixi.bundle.js is named as well.
 *  B3  recipe 2 (a newline lost in spixi.bundle.js, in the EXTERNALS loop): `--check` exits 1 naming spixi.bundle.js, the line count and the end
 *      anchor; a NORMAL build writes nothing; joining lines 10 and 11 → the P1 anchor `line 47 → 46`; text added to line 6 of spixi.icons.js
 *      → `line 6: text added or moved` (the build's own subsequence: true).
 *  B4  vacuity: the inlineHtml hook off → exit 1 "compares nothing"; the gate block skipped → `--check` exit 1 "stopped before the P-09
 *      carrier gate", a NORMAL build exit 1 "held … NOT written" with nothing written.
 *  B5  the flag-font artifact has its own rule: a carrier in fonts/TwemojiCountryFlags.js is named `0 → 1` (NORMAL build exit 1, nothing written).
 *  B6  an artifact handed to the writer with no accounting rule fails (`no carrier accounting rule for this artifact`).
 *  B7  a shell inlined but never handed to the writer is named (`inlined but never handed to the writer — not compared`).
 *  B8  a carrier added to each of the three external stylesheets is named; B1 also needs ≥ 7 files compared (3 scripts + 3 stylesheets + the flag font);
 *      B2 also pins the failure text "No generated artifact was written (images/ are plain copies, made before the gates)" (#46 r1 C-10).
 * Part C (#46 r1 C-2 / C-4 / C-8 / C-9, #1478 — the release script and the pixel gate as BLACK BOXES: `node scripts/strip-release.mjs …` is spawned on a SMALL temp
 * tree (a copy of the script, scripts/lib and Raw/html with six of the 18 shells); each package is built once, the broken variants are copies of it; every row's
 * title starts "★ perflean P-09 strip-release" except the pixel gate's):
 *  S1  --check (lean): one byte changed in js/html5-qrcode.min.js (outside the lean scope) → exit 1 naming it, "not in the lean css,js scope".
 *  S2  --check: the three external scripts as DIRECTORIES → "not a regular file", "0 of 3 external scripts compared", no success line (lean and no flag; in-scope
 *      files as directories are named, no crash).
 *  S3  the count guard: one external script missing → `compared NOTHING … 2 of 3`.
 *  S4  --out (lean) pre-flight: a directory in place of a target → exit 1 REFUSED, nothing replaced / left / created (a link target too, where links can be made).
 *  S5  --out inside the source folder → refused; a sibling of the project folder Spixi/ with the same name prefix, and a folder under Spixi/obj, are fine (leanfollow R2 / r1S-4: a sibling of Raw/html and Resources/Raw-sibling are inside Resources and refused; round 2 r2S-2: Spixi/Resources-sibling is inside the project folder outside obj and bin and refused); out == the source folder (lean): refused WITHOUT --in-place (nothing written), exit 0
 *      + GATE 1 OK WITH --in-place; a no-flag --out into a copy's own source folder → (leanfollow R2, was: exit 0, 1 file written, #46 r2 C-3) refused WITHOUT --in-place, exit 0 with 1 file written WITH it.
 *  S6  --out two phases with a fault injected into fs (a --import preload patches writeFileSync / renameSync of the child): phase 1 → nothing changed, own temp
 *      files and made folders gone; phase 2 → "THE OUT FOLDER IS NOT CONSISTENT: 3 of N …", no target deleted.
 *  S7  CLI edges: --out + --check, one-dash / stray words, --lean-j, no arguments → exit 2 (single-mode calls only: the combined modes are S12); where the env SPIXI_PACKAGED_LEAN is read.
 *  S8  one switch per change: spixi.tokens.css of a --lean-js package = the no-flag (old) strip byte for byte; of a --lean-css package = stripCssLean(source).
 *  S9  the pixel gate refuses A = B (exit 2) BEFORE it imports Playwright (PLAYWRIGHT_MODULE unset).
 *  S10 (#46 r2 C-1) a FAULTY TRANSFORM — a loader hook rewrites lean-strip.mjs on load so `transform` returns a wrong output for one shell: the in-build post-conditions
 *      (`scope.check`, the only caller) refuse it — exit 1, nothing written, the shell named.
 *  S11 the phase-1 READ-BACK — a --import preload truncates one temp write: exit 1 with the PHASE-1 text, nothing replaced.
 *  S12 (#46 r2 C-3) one mode per call, each value flag once: the table of two-modes / twice-flag calls → exit 2 with the exact reason and nothing written; the single modes work.
 *  S13 (#46 r2 C-8) package entries that are not regular files — dangling link, link loop, link to a directory, FIFO out of scope (js/fifo.js) with and without lean flags, FIFO in
 *      place of spixi.tokens.css: a GATE 1 problem, never opened, no hang (20 s timeout = fail). The FIFO cases are SKIPPED visibly on Windows (no mkfifo).
 * Run time: ~15 s for parts A + B and ~30 s for part C on this machine (the lean calls take 1–4 s each; the load of the machine moves it).
 *
 * Deliberate breaks (project rule #802) — each in a full copy of the tree, one token; the failed rows (the pins-a report of batch perflean
 * holds the failure texts):
 *   lean-gates.mjs:  carrierDiff returns [] → A1 A2 B2 · CARRIER_RE never matches → A1 A2 B1 B1b B2 · lineInvariant without the line-count
 *     check → A4 B3 · without the anchor loop → A4 A6 B3 · without the subsequence block → A5 B3 · anchor `second` detection off → A6 ·
 *     missing-in-output branch off → A6 · blank skipping off → A3 · an anchor moved to a string on 5 lines → A7 B1 B1b.
 *   build-shells.mjs: `if (gateProblems.length)` → `if (false && …)` → B2 B3 B4 · `let holdWrites = !CHECK` → `= false` → B2 B3 B4 · held writes never
 *     flushed → B1b · `subsequence: true` → false → B3 · gate compares built with built → B2 · `shells !== n` check off → B4 · an external's
 *     carriers not compared → B2 B3 · only the entry summed (not the inlined files) → B1b · the P-09 exit handler of a normal build off → B4.
 *   inline.mjs:      the entry not reported → A8 B1 B1b B2 · css not reported → A8 B1b · js not reported → A8 · hook adds a byte → A8 B1 B4.
 *   (#46 r1, pins round) rows B5–B8 / S1–S9: each mutant of the review's table and of the kill list of the pins round fails the row named in the batch report.
 *   Survivors (a mutation no row caught): see the report — `carriers === 0` and the `jsCompared` guard of build-shells.mjs (unreachable
 *   while a carrier exists and the three externals are built).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync as readRaw, writeFileSync, mkdtempSync, mkdirSync, cpSync, rmSync, readdirSync as readDir, statSync, existsSync, symlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join as pjoin, resolve as presolve, dirname as pdirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function (h) {
  const { ok } = h;
  const HTML = 'Spixi/Resources/Raw/html';
  /* ★ the COMMITTED tree. Inside a packaged run (scripts/smoke-packaged.mjs) h.root is the already stripped COPY and SPIXI_PACKAGED_FROM names
   * the ORIGINAL tree's Raw/html: everything this pin reads, copies or imports as "committed" comes from `base` (the original tree, the
   * tree the build gates are about). No env → base = h.root. An env that does not name a usable tree FAILS the row — no silent fallback. */
  let base = h.root;
  if (process.env.SPIXI_PACKAGED_FROM) {
    const from = presolve(process.env.SPIXI_PACKAGED_FROM);
    const cand = presolve(from, '..', '..', '..', '..');
    if (pjoin(cand, 'Spixi', 'Resources', 'Raw', 'html') !== from || !existsSync(pjoin(cand, 'scripts', 'strip-release.mjs'))) {
      ok(false, '★ perflean P-09 the committed tree cannot be resolved: SPIXI_PACKAGED_FROM=' + JSON.stringify(process.env.SPIXI_PACKAGED_FROM) + ' is not <tree>/' + HTML + ' of a tree that holds scripts/strip-release.mjs');
      return;
    }
    base = cand;
  }
  const lib = await import(pathToFileURL(pjoin(base, 'scripts/lib/lean-gates.mjs')).href);
  const { carrierCounts, carrierDiff, formatCarrierDiff, lineInvariant, EXTERNAL_JS, JS_LINE_ANCHORS } = lib;
  const read = (rel) => readRaw(pjoin(base, rel), 'utf8');   // exact bytes: line numbers are the point here, no CRLF normalising
  const J = JSON.stringify;
  /* a row = a list of problems; empty = green. The title leads, the first problems follow (the runner prints 400 chars of a failure). */
  const row = (title, problems) => ok(problems.length === 0, '★ perflean P-09 ' + title + (problems.length ? ' — ' + problems.slice(0, 4).join(' | ') + (problems.length > 4 ? ' | … +' + (problems.length - 4) : '') : ''));
  const same = (a, b) => J(a) === J(b);

  /* ===================== A · the library, on the real shipped files ===================== */
  const chat = read(HTML + '/chat.html');
  const bundleName = EXTERNAL_JS.find((f) => f === 'spixi.bundle.js');
  const bundle = read(HTML + '/' + bundleName);
  const bAnchors = JS_LINE_ANCHORS[bundleName] || [];
  const P1 = bAnchors.find((a) => a.includes('[P1]'));
  const lines = bundle.split('\n');
  const lineOf = (arr, needle) => { const at = []; arr.forEach((l, i) => { if (l.includes(needle)) at.push(i + 1); }); return at; };
  const opts = { anchors: bAnchors, subsequence: true };

  // A1
  {
    const p = [];
    const nP1 = chat.split('*SL{SpixiP1}').length - 1;
    if (nP1 < 1) p.push('chat.html no longer holds *SL{SpixiP1} — the fold has nothing to fold');
    if (carrierCounts(chat).size < 2) p.push('chat.html holds fewer than 2 distinct carriers (vacuous)');
    const folded = chat.split('*SL{SpixiP1}').join('0');
    const d = carrierDiff(chat, folded);
    if (!same(d, [{ carrier: 'SpixiP1', src: nP1, out: 0 }])) p.push('fold → ' + J(d) + ' (want exactly one entry SpixiP1 ' + nP1 + '→0)');
    const f = formatCarrierDiff('chat.html', d);
    if (f !== 'chat.html: carrier *SL{SpixiP1} ' + nP1 + ' → 0') p.push('format → ' + J(f));
    const u = carrierDiff(chat, chat.slice());
    if (!same(u, [])) p.push('untouched copy → ' + J(u) + ' (want [])');
    if (formatCarrierDiff('x', []) !== '') p.push('formatCarrierDiff of [] is not ""');
    row('carrierDiff on the committed chat.html: the folded *SL{SpixiP1} is named with both counts, an untouched copy is []', p);
  }
  // A2
  {
    const p = [];
    const added = carrierDiff(chat, chat.replace('\n', ' *SL{ZzAdded}\n'));
    if (!same(added, [{ carrier: 'ZzAdded', src: 0, out: 1 }])) p.push('added carrier → ' + J(added));
    const cm = carrierDiff('', '/* *SL{Kc} */\n// *SL{Kc}\n<!-- *SL{Kc} -->\n');
    if (!same(cm, [{ carrier: 'Kc', src: 0, out: 3 }])) p.push('carriers in 3 comment styles → ' + J(cm) + ' (want Kc 0→3)');
    const two = carrierCounts('a *SL{A} b *SL{A} c *SL{B}');
    if (two.get('A') !== 2 || two.get('B') !== 1 || two.size !== 2) p.push('two on one line → ' + J([...two]));
    const d2 = carrierDiff('x *SL{A}', 'x *SL{A} *SL{A}');
    if (!same(d2, [{ carrier: 'A', src: 1, out: 2 }])) p.push('second carrier on a line → ' + J(d2));
    for (const t of ['*SL{abc', '*SL{abc\n}', 'SL{abc}', '*SL abc}', '*SL{ab\rc}']) {
      if (carrierCounts(t).size !== 0) p.push('is not a carrier but counted: ' + J(t));
    }
    row('carrierDiff edge cases: an ADDED carrier is reported, a carrier in a comment counts, two on one line both count, `*SL{` without `}` on the line is none', p);
  }
  // A3
  {
    const p = [];
    if (bAnchors.length < 3 || !P1) p.push('JS_LINE_ANCHORS has no usable anchors for ' + bundleName);
    const id = lineInvariant(bundle, bundle.slice(), opts);
    if (!same(id, [])) p.push('identical text → ' + J(id));
    const idx = lines.findIndex((l) => /\S[ \t]+\/\/ \S/.test(l) && !bAnchors.some((a) => l.includes(a)));
    if (idx < 0) p.push('no line with a // tail in the bundle — the comment-cut case is vacuous');
    else {
      const cut = lines.slice(); cut[idx] = cut[idx].replace(/[ \t]*\/\/ .*$/, '');
      if (cut[idx] === lines[idx]) p.push('the comment cut changed nothing at line ' + (idx + 1));
      const r = lineInvariant(bundle, cut.join('\n'), opts);
      if (!same(r, [])) p.push('comment tail cut at line ' + (idx + 1) + ' → ' + J(r));
    }
    const blanks = lines.map((l) => l.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '')).join('\n');
    if (blanks === bundle) p.push('the blank-strip changed nothing');
    const rb = lineInvariant(bundle, blanks, opts);
    if (!same(rb, [])) p.push('indent/trailing-blank strip → ' + J(rb.slice(0, 3)));
    const indented = lines.map((l) => '        ' + l + '\t').join('\n');   // spaces and tabs are skipped in BOTH texts (contract § 3.1): added blanks are tolerated
    const ri = lineInvariant(bundle, indented, opts);
    if (!same(ri, [])) p.push('indent + trailing tab added to every line → ' + J(ri.slice(0, 3)));
    row('lineInvariant on the committed spixi.bundle.js: identical → [], a comment tail cut inside a line → [], blanks stripped or added → [] (subsequence: true)', p);
  }
  // A4
  {
    const p = [];
    const join2 = (i0) => { const L = lines.slice(); L.splice(i0, 2, L[i0] + L[i0 + 1]); return L.join('\n'); };   // joins 1-based lines i0+1 and i0+2
    const anchorAt = (a) => lineOf(lines, a);
    const msg = (a, n) => 'anchor ' + J(a) + ': line ' + n + ' → ' + (n - 1);
    const [mid, end] = [bAnchors[1], bAnchors[2]];
    const [pl, ml, el] = [anchorAt(P1)[0], anchorAt(mid)[0], anchorAt(end)[0]];
    if (pl !== 47) p.push('the P1 anchor is on line ' + pl + ', not 47');
    if (!(ml > 100 && ml < 30000 && el > 30001)) p.push('the middle / end anchors are not placed around line 30000 (' + ml + ', ' + el + ') — the case is vacuous');
    // after line 30000, subsequence off: exactly the count and the end anchor
    const a1 = lineInvariant(bundle, join2(29999), { anchors: bAnchors, subsequence: false });
    const w1 = ['line count ' + lines.length + ' → ' + (lines.length - 1), msg(end, el)];
    if (!same(a1, w1)) p.push('newline lost after line 30000 → ' + J(a1) + ' (want ' + J(w1) + ')');
    const a1s = lineInvariant(bundle, join2(29999), opts);
    if (!w1.every((x) => a1s.includes(x))) p.push('same, subsequence on → ' + J(a1s.slice(0, 3)));
    // before line 47 (lines 10 and 11 joined)
    const a2 = lineInvariant(bundle, join2(9), { anchors: bAnchors, subsequence: false });
    const w2 = ['line count ' + lines.length + ' → ' + (lines.length - 1), msg(P1, 47), msg(mid, ml), msg(end, el)];
    if (!same(a2, w2)) p.push('newline lost before line 47 → ' + J(a2) + ' (want ' + J(w2) + ')');
    row('lineInvariant: a lost newline after line 30000 → line count AND the moved end anchor; before line 47 → the P1 anchor `line 47 → 46`', p);
  }
  // A5
  {
    const p = [];
    const withLine = (i, text) => { const L = lines.slice(); L[i] = text; return L; };
    const added = withLine(99, lines[99] + ' zz').join('\n');
    if (lines[99].trim() === '') p.push('line 100 is blank — pick another');
    const r1 = lineInvariant(bundle, added, opts);
    if (!same(r1, ['line 100: text added or moved'])) p.push('text added to line 100 → ' + J(r1));
    const r1o = lineInvariant(bundle, added, { anchors: bAnchors, subsequence: false });
    if (!same(r1o, [])) p.push('text added, subsequence off → ' + J(r1o) + ' (the option must be what catches it)');
    // two long, different lines side by side, no anchor on them
    let i = 1000;
    while (i < lines.length - 1 && !(lines[i].length >= 60 && lines[i + 1].length >= 60 && lines[i] !== lines[i + 1] && lines[i].trim()[0] !== lines[i + 1].trim()[0]
      && ![lines[i], lines[i + 1]].some((l) => bAnchors.some((a) => l.includes(a))))) i++;
    if (i >= lines.length - 1) p.push('no pair of long lines to swap');
    else {
      const L = lines.slice(); [L[i], L[i + 1]] = [L[i + 1], L[i]];
      const r2 = lineInvariant(bundle, L.join('\n'), opts);
      const w2 = ['line ' + (i + 1) + ': text added or moved', 'line ' + (i + 2) + ': text added or moved'];
      if (!same(r2, w2)) p.push('lines ' + (i + 1) + '/' + (i + 2) + ' swapped → ' + J(r2) + ' (want ' + J(w2) + ')');
      const r2o = lineInvariant(bundle, L.join('\n'), { anchors: bAnchors, subsequence: false });
      if (!same(r2o, [])) p.push('swap, subsequence off → ' + J(r2o));
    }
    row('lineInvariant (subsequence): text ADDED to line 100 → `line 100: text added or moved`; two swapped lines (same count) → both named', p);
  }
  // A6
  {
    const p = [];
    const many = lineOf(lines, 'console.warn(');
    if (many.length < 2) p.push('console.warn( is on <2 lines — the not-unique case is vacuous');
    const r = lineInvariant(bundle, bundle, { anchors: ['console.warn('] });
    if (!(r.length === 1 && r[0] === 'anchor "console.warn(": not unique in the source (lines ' + many[0] + ' and ' + many[1] + ')')) p.push('anchor on several lines → ' + J(r));
    const r2 = lineInvariant(bundle, bundle, { anchors: ['zz-this-is-not-in-the-file-zz'] });
    if (!same(r2, ['anchor "zz-this-is-not-in-the-file-zz": line missing → missing'])) p.push('anchor in neither → ' + J(r2));
    const r3 = lineInvariant(bundle, bundle.replace(P1, ''), { anchors: [P1] });
    if (!same(r3, ['anchor ' + J(P1) + ': line 47 → missing'])) p.push('anchor lost from the output → ' + J(r3));
    row('lineInvariant anchors: one that sits on two lines of the source is "not unique in the source (lines a and b)"; a missing one is reported', p);
  }
  // A7
  {
    const p = [];
    let n = 0;
    for (const f of EXTERNAL_JS) {
      const anchors = JS_LINE_ANCHORS[f];
      if (!anchors || !anchors.length) { p.push(f + ' has no anchors in JS_LINE_ANCHORS'); continue; }
      const L = read(HTML + '/' + f).split('\n');
      for (const a of anchors) {
        n++;
        const at = lineOf(L, a);
        if (at.length !== 1) p.push(f + ' anchor ' + J(a) + ' is on ' + at.length + ' lines' + (at.length ? ' (' + at.slice(0, 3).join(', ') + ')' : ''));
      }
    }
    if (n < 5) p.push('only ' + n + ' anchors examined');
    if (lineOf(lines, P1)[0] !== 47) p.push('P1 anchor on line ' + lineOf(lines, P1)[0] + ' of ' + bundleName + ', not 47');
    for (const f of Object.keys(JS_LINE_ANCHORS)) if (!EXTERNAL_JS.includes(f)) p.push('JS_LINE_ANCHORS names ' + f + ', which is not in EXTERNAL_JS');
    row('every JS_LINE_ANCHORS anchor of the three external scripts is on exactly ONE line of the committed file; the P1 anchor is line 47', p);
  }

  // A8 — the onSource hook that feeds the carrier gate (contract § 3.2): what it reports is what the gate sums
  {
    const p = [];
    const { inlineHtml } = await import(pathToFileURL(pjoin(base, 'scripts/lib/inline.mjs')).href);
    const entry = pjoin(base, 'src/shells/chat.html');
    const seen = [];
    const withHook = inlineHtml(entry, { device: true, strict: true, external: new Map(), onSource: (abs, kind) => seen.push([abs, kind]) });
    const without = inlineHtml(entry, { device: true, strict: true, external: new Map() });
    if (withHook !== without) p.push('the hook changed the output');
    if (!seen.length || seen[0][1] !== 'entry' || seen[0][0] !== entry) p.push('the first report is not the entry template: ' + J(seen[0]));
    const kinds = (k) => seen.filter((x) => x[1] === k).length;
    if (seen.filter((x) => x[1] === 'entry').length !== 1) p.push('"entry" reported ' + kinds('entry') + ' times');
    if (kinds('css') < 1) p.push('no inlined css reported');
    if (kinds('js') < 1) p.push('no inlined js reported');
    for (const [abs, k] of seen) if (!['entry', 'css', 'js'].includes(k) || !statSync(abs).isFile()) p.push('bad report ' + J([abs, k]));
    // every inlined file is accounted for: its text is in the output (a sample of the first line of each js / css)
    for (const [abs, k] of seen) if (k !== 'entry' && !withHook.includes(read(abs.slice(base.length + 1)).split('\n').find((l) => l.trim().length > 20 && !l.includes('</') ).trim().slice(0, 40))) p.push(abs.slice(base.length + 1) + ' reported, but its text is not in the output');
    row('inlineHtml onSource hook: reports the entry template first, then every inlined css / js (existing files), and changes no output byte', p);
  }

  /* ===================== B · the real build gate, in a temp copy ===================== */
  const tmp = mkdtempSync(pjoin(tmpdir(), 'pin-p09-'));
  try {
    for (const rel of ['scripts/build-shells.mjs', 'scripts/lib', 'src', HTML]) {
      mkdirSync(pjoin(tmp, rel, '..'), { recursive: true });
      cpSync(pjoin(base, rel), pjoin(tmp, rel), { recursive: true, preserveTimestamps: true });   // mtimes kept: the build warns when a component is newer than the bundle
    }
    const SH = 'scripts/build-shells.mjs', INL = 'scripts/lib/inline.mjs', CHAT_SRC = 'src/shells/chat.html', BTN_CSS = 'src/styles/components/button.css';
    const orig = { [SH]: readRaw(pjoin(tmp, SH), 'utf8'), [INL]: readRaw(pjoin(tmp, INL), 'utf8'), [CHAT_SRC]: readRaw(pjoin(tmp, CHAT_SRC), 'utf8'), [BTN_CSS]: readRaw(pjoin(tmp, BTN_CSS), 'utf8') };
    let pristine = null;   // hash of the copy's Raw/html as copied; a break that lets a NORMAL build write must not poison the next row
    const restore = () => {
      for (const k of Object.keys(orig)) writeFileSync(pjoin(tmp, k), orig[k]);
      if (pristine !== null && hashHtml() !== pristine) { rmSync(pjoin(tmp, HTML), { recursive: true, force: true }); cpSync(pjoin(base, HTML), pjoin(tmp, HTML), { recursive: true, preserveTimestamps: true }); }
    };
    /* apply a text mutation to the copy; returns null when applied, else why not (the row then FAILS) */
    const mutate = (rel, fn) => {
      const text = orig[rel], out = fn(text);
      if (out == null || out === text) return 'mutation did not apply to ' + rel + ' (its target text was not found) — the break proves nothing';
      writeFileSync(pjoin(tmp, rel), out);
      return null;
    };
    const afterLine = (needle, add) => (text) => {
      const L = text.split('\n'); const at = L.findIndex((l) => l.includes(needle));
      if (at < 0 || L.filter((l) => l.includes(needle)).length !== 1) return null;
      L.splice(at + 1, 0, add); return L.join('\n');
    };
    const build = (args) => {
      const env = { ...process.env }; delete env.SPIXI_PACKAGED_FROM; delete env.SPIXI_PACKAGED_LEAN;   // the build under test must not see a packaged run
      const r = spawnSync(process.execPath, [SH, ...args], { cwd: tmp, encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024, env });
      return { code: r.status, stdout: r.stdout || '', out: (r.stdout || '') + (r.stderr || ''), signal: r.signal, err: r.error && r.error.message };
    };
    const hashHtml = () => {
      const h2 = createHash('sha256'); const walk = (d) => {
        for (const e of readDir(pjoin(tmp, d), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
          const rel = d + '/' + e.name;
          if (e.isDirectory()) walk(rel); else { h2.update(rel + '\0'); h2.update(readRaw(pjoin(tmp, rel))); h2.update('\0'); }
        }
      }; walk(HTML); return h2.digest('hex');
    };
    pristine = hashHtml();
    const brief = (r) => 'exit ' + r.code + (r.err ? ' (' + r.err + ')' : '') + ': ' + r.out.trim().split('\n').slice(-1)[0].slice(0, 90);

    // B1
    {
      const p = [];
      restore();
      const r = build(['--check']);
      const last = r.stdout.trim().split('\n').pop();   // the --check success line goes to stdout; warnings go to stderr
      const m = /P-09 gates ✓ \(carriers: (\d+) shells \+ (\d+) files, (\d+) carriers/.exec(last);
      if (r.code !== 0) p.push('--check on an untouched copy ' + brief(r));
      else if (!m) p.push('last line has no "P-09 gates ✓ (carriers: …" — ' + last.slice(0, 120));
      else {
        if (+m[1] < 18) p.push('only ' + m[1] + ' shells compared (want ≥ 18)');
        if (!(+m[3] > 0)) p.push('carriers compared: ' + m[3]);
        if (+m[2] < 7) p.push('only ' + m[2] + ' files compared (want ≥ 7: the three external scripts, the three external stylesheets, the flag font)');
      }
      row('build-shells --check on an untouched copy: exit 0, last line "P-09 gates ✓" with shells ≥ 18 and carriers > 0' + (m ? ' (' + m[1] + ' shells, ' + m[3] + ' carriers)' : ''), p);
    }
    // B1b — the positive control of the "writes NOTHING" claims below: a gated NORMAL build that passes really does write
    {
      const p = [];
      restore();
      const MARK = '<!-- p09-pin-marker -->';
      writeFileSync(pjoin(tmp, CHAT_SRC), orig[CHAT_SRC] + '\n' + MARK + '\n');
      writeFileSync(pjoin(tmp, BTN_CSS), orig[BTN_CSS] + '\n/* *SL{ZzInlined} */\n');   // a carrier in a css the shells INLINE: the gate must sum it with its shell
      const h0 = hashHtml();
      const r = build([]);
      const inl = readDir(pjoin(tmp, HTML)).filter((f) => f.endsWith('.html') && readRaw(pjoin(tmp, HTML, f), 'utf8').includes('*SL{ZzInlined}')).length;
      if (inl < 1) p.push('no built shell holds the carrier of the inlined button.css (the case is vacuous)');
      const written = readRaw(pjoin(tmp, HTML, 'chat.html'), 'utf8').includes(MARK);
      if (r.code !== 0) p.push('NORMAL build of a clean (marked) source ' + brief(r));
      if (!written) p.push('the passing NORMAL build did not write the marked source into Raw/html/chat.html (the held writes were never flushed)');
      if (r.code === 0 && !/P-09 gates/.test(r.out)) p.push('no P-09 line in a passing build');
      if (h0 === hashHtml()) p.push('Raw/html did not change at all');
      row('a NORMAL build whose gates pass WRITES its artifacts (a source marker reaches Raw/html/chat.html; a carrier added to an INLINED css is summed with its shell, not flagged) — so "nothing written" below means the hold, not a build that writes nothing', p);
    }
    // B2
    {
      const p = [];
      restore();
      const bad = mutate(SH, afterLine('let html = inlineHtml(', "  html = html.split(\"if('*SL{SpixiP1}'==='1')\").join('if(false)');"));
      if (bad) p.push(bad);
      else {
        const h0 = hashHtml();
        const r = build([]);
        const h1 = hashHtml();
        if (r.code !== 1) p.push('NORMAL build with the fold: ' + brief(r) + ' (want exit 1)');
        if (!r.out.includes('*SL{SpixiP1}')) p.push('the message does not name *SL{SpixiP1}');
        if (!r.out.includes('No generated artifact was written (images/ are plain copies, made before the gates).')) p.push('the failure text must say what is NOT written and what is (#46 r1 C-10): `No generated artifact was written (images/ are plain copies, made before the gates).`');
        if (h0 !== h1) p.push('an artifact CHANGED on disk although the gate failed (Raw/html hash moved)');
        const shellsNamed = (r.out.match(/\.html: carrier \*SL\{SpixiP1\} \d+ → 0/g) || []).length;
        if (shellsNamed < 18) p.push('only ' + shellsNamed + ' shells named for the fold (want ≥ 18)');
        const c = build(['--check']);
        if (c.code !== 1 || !c.out.includes('carrier *SL{SpixiP1}')) p.push('--check with the fold: ' + brief(c) + ' (want exit 1 naming the carrier)');
      }
      restore();
      const bad2 = mutate(SH, afterLine("let body = readFileSync(abs, 'utf8');", "    if (e.out === 'spixi.bundle.js') body = body.split('*SL{SpixiP1}').join('0');"));
      if (bad2) p.push(bad2);
      else {
        const c = build(['--check']);
        if (c.code !== 1 || !/spixi\.bundle\.js: carrier \*SL\{SpixiP1\} 2 → 0/.test(c.out)) p.push('fold inside the external spixi.bundle.js: ' + brief(c) + ' — want `spixi.bundle.js: carrier *SL{SpixiP1} 2 → 0`');
      }
      row('recipe 1, a carrier fold in the build pipeline: a NORMAL build exits 1, names *SL{SpixiP1}, writes NOTHING (Raw/html hash unchanged); --check exits 1 too; a fold inside the external spixi.bundle.js is named as well', p);
    }
    // B3
    {
      const p = [];
      const lose = (a) => afterLine("let body = readFileSync(abs, 'utf8');",
        "    if (e.out === 'spixi.bundle.js') { const L = body.split('\\n'); L.splice(" + a + ", 2, L[" + a + "] + L[" + (a + 1) + "]); body = L.join('\\n'); }");
      restore();
      let bad = mutate(SH, lose(29999));
      if (bad) p.push(bad);
      else {
        const r = build(['--check']);
        const o = r.out;
        if (r.code !== 1) p.push('--check after newline lost at 30000: ' + brief(r) + ' (want exit 1)');
        if (!/spixi\.bundle\.js: line count \d+ → \d+/.test(o)) p.push('no "spixi.bundle.js: line count a → b" in the message');
        if (!/spixi\.bundle\.js: anchor "function mountEncPassPage[^\n]*: line \d+ → \d+/.test(o)) p.push('the end anchor is not named');
        const h0 = hashHtml(); const n = build([]); const h1 = hashHtml();
        if (n.code !== 1 || h0 !== h1) p.push('NORMAL build with the lost newline: exit ' + n.code + ', artifacts ' + (h0 === h1 ? 'unchanged' : 'CHANGED'));
      }
      restore();
      bad = mutate(SH, lose(9));
      if (bad) p.push(bad);
      else {
        const r = build(['--check']);
        if (r.code !== 1 || !r.out.includes('spixi.bundle.js: anchor "console.warn(\'[P1] \' + body);": line 47 → 46')) p.push('lines 10+11 joined: ' + brief(r) + ' — want the P1 anchor `line 47 → 46`');
      }
      restore();
      bad = mutate(SH, afterLine("let body = readFileSync(abs, 'utf8');", "    if (e.out === 'spixi.icons.js') { const L = body.split('\\n'); L[5] += ' zz'; body = L.join('\\n'); }"));
      if (bad) p.push(bad);
      else {
        const r = build(['--check']);
        if (r.code !== 1 || !r.out.includes('spixi.icons.js: line 6: text added or moved')) p.push('text added to line 6 of spixi.icons.js: ' + brief(r) + ' — want `spixi.icons.js: line 6: text added or moved`');
      }
      row('recipe 2, a newline lost in spixi.bundle.js: --check exits 1 naming the file, the line count and the moved anchors (P1: `line 47 → 46`); a NORMAL build writes nothing; text added to a line of spixi.icons.js → `line 6: text added or moved`', p);
    }
    // B4
    {
      const p = [];
      restore();
      let bad = mutate(INL, (t) => (t.includes("typeof opts.onSource === 'function'") ? t.replace("typeof opts.onSource === 'function'", 'false') : null));
      if (bad) p.push(bad);
      else {
        const r = build(['--check']);
        if (r.code !== 1 || !r.out.includes('compares nothing')) p.push('hook off: ' + brief(r) + ' (want exit 1 "compares nothing")');
      }
      restore();
      bad = mutate(SH, (t) => { const k = '\n{\n  const gateProblems = [];'; return t.split(k).length === 2 ? t.replace(k, '\nif (false) {\n  const gateProblems = [];') : null; });
      if (bad) p.push(bad);
      else {
        const r = build(['--check']);
        if (r.code !== 1 || !r.out.includes('stopped before the P-09')) p.push('gate block skipped: ' + brief(r) + ' (want exit 1 "stopped before the P-09 …")');
      }
      restore();
      bad = mutate(SH, (t) => { const k = '\n{\n  const gateProblems = [];'; return t.split(k).length === 2 ? t.replace(k, '\nif (false) {\n  const gateProblems = [];') : null; });
      if (bad) p.push(bad);
      else {
        const h0 = hashHtml(); const r = build([]); const h1 = hashHtml();
        if (r.code !== 1 || !r.out.includes('held for the P-09 gates and NOT written') || h0 !== h1) p.push('gate block skipped, NORMAL build: ' + brief(r) + (h0 === h1 ? '' : ' — artifacts CHANGED') + ' (want exit 1, nothing written, "held … NOT written")');
      }
      row('vacuity: the inlineHtml hook off → exit 1 "compares nothing"; the gate block skipped → --check exit 1 "stopped before the P-09 carrier gate", a NORMAL build exit 1 with nothing written', p);
    }
    // B5 — the carrier rule of the flag-font artifact (#46 r1 C-3: a mutant that dropped it survived)
    {
      const p = [];
      restore();
      const bad = mutate(SH, (t) => { const k = 'writeFileSync(FLAG_FONT_OUT, payload);'; return t.split(k).length === 2 ? t.replace(k, "writeFileSync(FLAG_FONT_OUT, payload + '/* *SL{ZzFlagFont} */\\n');") : null; });
      if (bad) p.push(bad);
      else {
        const h0 = hashHtml(); const r = build([]); const h1 = hashHtml();
        if (r.code !== 1 || !r.out.includes('fonts/TwemojiCountryFlags.js: carrier *SL{ZzFlagFont} 0 → 1')) p.push('a carrier in the flag-font payload: ' + brief(r) + ' — want exit 1 naming `fonts/TwemojiCountryFlags.js: carrier *SL{ZzFlagFont} 0 → 1` (the artifact has NO carrier by rule)');
        if (h0 !== h1) p.push('an artifact CHANGED on disk although the gate failed');
        const c = build(['--check']);
        if (c.code !== 1 || !c.out.includes('fonts/TwemojiCountryFlags.js: carrier *SL{ZzFlagFont} 0 → 1')) p.push('--check: ' + brief(c));
      }
      row('the flag-font artifact has a rule of its own: a carrier in fonts/TwemojiCountryFlags.js is named `carrier *SL{…} 0 → 1` (NORMAL build exit 1, nothing written; --check exit 1)', p);
    }
    // B6 — an artifact with no accounting rule is a failure
    {
      const p = [];
      restore();
      const bad = mutate(SH, afterLine('writeFileSync(FLAG_FONT_OUT, payload);', "  writeFileSync(join(OUT_DIR, 'zz-extra.txt'), 'plain');"));
      if (bad) p.push(bad);
      else {
        const h0 = hashHtml(); const r = build([]); const h1 = hashHtml();
        if (r.code !== 1 || !r.out.includes('zz-extra.txt: no carrier accounting rule for this artifact')) p.push('an artifact nobody accounts for: ' + brief(r) + ' — want exit 1 naming `zz-extra.txt: no carrier accounting rule for this artifact`');
        if (h0 !== h1 || existsSync(pjoin(tmp, HTML, 'zz-extra.txt'))) p.push('the unaccounted artifact (or another) reached the disk');
        const c = build(['--check']);
        if (c.code !== 1 || !c.out.includes('zz-extra.txt: no carrier accounting rule')) p.push('--check: ' + brief(c));
      }
      row('an artifact handed to the writer with NO carrier accounting rule fails the gate (`no carrier accounting rule for this artifact`): NORMAL build exit 1 and nothing written; --check exit 1', p);
    }
    // B7 — a shell that was inlined but never written
    {
      const p = [];
      restore();
      const bad = mutate(SH, (t) => { const k = '  writeFileSync(outPath, html);\n  n++;'; return t.split(k).length === 2 ? t.replace(k, "  if (s.out !== 'chat.html') writeFileSync(outPath, html);\n  n++;") : null; });
      if (bad) p.push(bad);
      else {
        const h0 = hashHtml(); const r = build([]); const h1 = hashHtml();
        if (r.code !== 1 || !r.out.includes('chat.html: inlined but never handed to the writer — not compared')) p.push('a shell inlined but never written: ' + brief(r) + ' — want exit 1 naming `chat.html: inlined but never handed to the writer — not compared`');
        if (h0 !== h1) p.push('an artifact CHANGED on disk although the gate failed');
      }
      row('a shell that was inlined but never handed to the writer is named (`chat.html: inlined but never handed to the writer — not compared`), exit 1, nothing written', p);
    }
    // B8 — the carriers of the three css externals are accounted too
    {
      const p = [];
      for (const css of ['spixi.tokens.css', 'spixi.base.css', 'spixi.chat-pattern.css']) {
        restore();
        const bad = mutate(SH, (t) => { const k = 'if (e.css) body = inlineFonts(body, dirname(abs));'; return t.split(k).length === 2 ? t.replace(k, k + "\n    if (e.out === '" + css + "') body += '\\n/* *SL{ZzCss} */\\n';") : null; });
        if (bad) { p.push(bad); continue; }
        const h0 = hashHtml(); const r = build([]); const h1 = hashHtml();
        if (r.code !== 1 || !r.out.includes(css + ': carrier *SL{ZzCss} 0 → 1')) p.push(css + ': a carrier added to the external stylesheet: ' + brief(r) + ' — want exit 1 naming `' + css + ': carrier *SL{ZzCss} 0 → 1`');
        if (h0 !== h1) p.push(css + ': an artifact CHANGED on disk although the gate failed');
      }
      restore();
      row('the three external stylesheets are accounted: a carrier added to spixi.tokens.css / spixi.base.css / spixi.chat-pattern.css by the build is named `carrier *SL{…} 0 → 1`, NORMAL build exit 1, nothing written', p);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  /* ===================== C · scripts/strip-release.mjs and scripts/pixel-gate.mjs as black boxes (#46 r1 C-2 / C-4 / C-8 / C-9, #1478) =====================
   * The release script is run as a process on small temp trees: a COPY of scripts/strip-release.mjs + scripts/lib + Raw/html (its source folder is the
   * copy's Raw/html, so a "package" is another copy of Raw/html that the script strips). Each package is built ONCE and the broken variants are copies of it. */
  const tmpC = mkdtempSync(pjoin(tmpdir(), 'pin-sr-'));
  try {
    const SR = 'scripts/strip-release.mjs';
    const mkTree = (name) => {
      const t = pjoin(tmpC, name);
      mkdirSync(pjoin(t, 'scripts'), { recursive: true });
      cpSync(pjoin(base, SR), pjoin(t, SR));
      cpSync(pjoin(base, 'scripts/lib'), pjoin(t, 'scripts/lib'), { recursive: true });
      mkdirSync(pjoin(t, HTML, '..'), { recursive: true });
      // a SMALL source folder: every non-shell file (the three external scripts, the stylesheets, js/, fonts/, img/) and six of the small shells — a lean run
      // transforms every shell it finds, and the 18 real ones cost seconds per call (every row below spawns the script)
      const KEEP_HTML = ['app_details.html', 'app_new.html', 'empty_detail.html', 'lock.html', 'scan.html', 'wallet_sent.html'];
      const htmlAbs = pjoin(base, HTML);
      cpSync(htmlAbs, pjoin(t, HTML), { recursive: true, filter: (src) => !(pdirname(src) === htmlAbs && src.endsWith('.html') && !KEEP_HTML.includes(src.slice(htmlAbs.length + 1))) });
      return { root: t, script: pjoin(t, SR), raw: pjoin(t, HTML) };
    };
    const cenv = (extra) => { const e = { ...process.env }; delete e.SPIXI_PACKAGED_FROM; delete e.SPIXI_PACKAGED_LEAN; return { ...e, ...(extra || {}) }; };   // the script under test must not see a packaged run
    const sr = (tree, args, extra, node, timeout) => {
      const r = spawnSync(process.execPath, [...(node || []), tree.script, ...args], { cwd: tmpC, encoding: 'utf8', timeout: timeout || 120000, maxBuffer: 64 * 1024 * 1024, env: cenv(extra) });
      return { code: r.status, signal: r.signal, stdout: r.stdout || '', stderr: r.stderr || '', out: (r.stdout || '') + (r.stderr || ''), err: r.error && r.error.message };
    };
    const brief2 = (r) => 'exit ' + r.code + (r.signal ? ' ' + r.signal : '') + (r.err ? ' (' + r.err + ')' : '') + ': ' + (r.stderr.trim().split('\n').pop() || r.stdout.trim().split('\n').pop() || '').slice(0, 110);
    const copyDir = (a, b) => cpSync(a, b, { recursive: true });
    const T1 = mkTree('t1');
    const setup = [];                                 // a package that could not be made is reported by the first row that needs it
    const pkg = (name, flags) => {
      const dir = pjoin(tmpC, 'pkg-' + name);
      copyDir(T1.raw, dir);                            // the package = a copy of the committed folder, then the strip's output over it (smoke-packaged strips its copy in place the same way)
      const r = sr(T1, ['--out', dir, ...flags]);
      if (r.code !== 0) setup.push('package ' + name + ' (' + flags.join(' ') + '): ' + brief2(r));
      return { dir, r };
    };
    const variant = (dir, name) => { const v = pjoin(tmpC, 'v-' + name); copyDir(dir, v); return v; };
    const filesUnder = (d) => { const out = []; const w = (x, pre) => { for (const e of readDir(x, { withFileTypes: true })) { if (e.isDirectory()) w(pjoin(x, e.name), pre + e.name + '/'); else out.push(pre + e.name); } }; if (existsSync(d)) w(d, ''); return out.sort(); };
    const rdS = (f) => { try { return readRaw(f, 'utf8'); } catch (_) { return '(unreadable: deleted?)'; } };   // a deleted file is a failed row, not a crash of the pin
    const EXT = ['spixi.bundle.js', 'spixi.strings.js', 'spixi.icons.js'];
    const Pboth = pkg('both', ['--lean-css', '--lean-js']);
    const Pcss = pkg('css', ['--lean-css']);
    const Pnone = pkg('none', []);
    const rowS = (title, problems) => row('strip-release ' + title, [...problems, ...setup.splice(0)]);

    // S1 — C-2 / C-3: a changed file OUTSIDE the lean scope is a GATE 1 failure
    {
      const p = [];
      const ctl = sr(T1, ['--check', Pboth.dir, '--lean-css', '--lean-js']);
      if (ctl.code !== 0 || !/GATE 1 OK — lean css,js: .* the 3 external scripts keep their lines/.test(ctl.stdout)) p.push('the untouched both-flags package: ' + brief2(ctl) + ' (want exit 0, "the 3 external scripts keep their lines")');
      const v = variant(Pboth.dir, 'oos');
      const f = pjoin(v, 'js/html5-qrcode.min.js');
      if (!existsSync(f)) p.push('js/html5-qrcode.min.js is not a shipped file any more — pick another out-of-scope file');
      else {
        const b = readRaw(f); const i = b.findIndex((c) => c >= 0x61 && c <= 0x7a); const nb = Buffer.from(b); nb[i] -= 32;   // ONE byte: a lower-case letter becomes upper case
        writeFileSync(f, nb);
        if (Buffer.compare(b, nb) === 0 || nb.length !== b.length) p.push('the one-byte change did not apply');
        const r = sr(T1, ['--check', v, '--lean-css', '--lean-js']);
        if (r.code !== 1 || !/js\/html5-qrcode\.min\.js: packaged ≠ committed \(not in the lean css,js scope\)/.test(r.stderr)) p.push('one byte changed in js/html5-qrcode.min.js: ' + brief2(r) + ' — want exit 1 and `js/html5-qrcode.min.js: packaged ≠ committed (not in the lean css,js scope)`');
        if (/GATE 1 OK/.test(r.out)) p.push('GATE 1 OK was printed for a changed out-of-scope file');
      }
      rowS('--check (lean): ONE byte changed in js/html5-qrcode.min.js of a both-flags package (a file outside the lean scope) → exit 1 naming the file and "not in the lean css,js scope"; the untouched package passes ("the 3 external scripts keep their lines")', p);
    }

    // S2 — C-2: a directory where a shipped file belongs is not "there"
    {
      const p = [];
      const ctl = sr(T1, ['--check', Pcss.dir, '--lean-css']);
      if (ctl.code !== 0 || !/the 3 external scripts keep their lines/.test(ctl.stdout)) p.push('the untouched css package: ' + brief2(ctl));
      const v = variant(Pcss.dir, 'dirs');
      for (const f of EXT) { rmSync(pjoin(v, f)); mkdirSync(pjoin(v, f)); }
      const r = sr(T1, ['--check', v, '--lean-css']);
      if (r.code !== 1) p.push('the three scripts as directories (lean): ' + brief2(r) + ' (want exit 1)');
      for (const f of EXT) if (!r.stderr.includes(f + ': committed but MISSING from the package (a directory or another kind of entry has its name, not a regular file)')) p.push('lean: no "not a regular file" line for ' + f);
      if (!/0 of 3 external scripts compared/.test(r.stderr)) p.push('lean: no "0 of 3 external scripts compared"');
      for (const f of EXT) if (!r.stderr.includes(f + ': line invariant compared NOTHING')) p.push('lean: no "compared NOTHING" line for ' + f);
      if (/external scripts keep their lines/.test(r.out)) p.push('lean: the success text "external scripts keep their lines" was printed');
      // an IN-SCOPE file that is a directory: the (a) loop says so (it used to hand the directory to readFileSync)
      const v2 = variant(Pcss.dir, 'dirs2');
      for (const f of ['spixi.tokens.css', 'app_new.html']) { rmSync(pjoin(v2, f)); mkdirSync(pjoin(v2, f)); }
      const r2 = sr(T1, ['--check', v2, '--lean-css']);
      if (r2.code !== 1 || !r2.stderr.includes('spixi.tokens.css: MISSING from the package (a directory or another kind of entry has its name, not a regular file)') || !r2.stderr.includes('app_new.html: MISSING from the package (a directory or another kind of entry has its name, not a regular file)') || /EISDIR|at .*\.mjs:\d+/.test(r2.stderr)) p.push('in-scope files as directories: ' + brief2(r2) + ' — want exit 1 and `MISSING from the package (a directory or another kind of entry has its name, not a regular file)` for each, no crash');
      // the no-flag package
      const nctl = sr(T1, ['--check', Pnone.dir]);
      if (nctl.code !== 0) p.push('the untouched no-flag package: ' + brief2(nctl));
      const n1 = variant(Pnone.dir, 'nf1');
      rmSync(pjoin(n1, 'spixi.bundle.js')); mkdirSync(pjoin(n1, 'spixi.bundle.js'));
      const nr = sr(T1, ['--check', n1]);
      if (nr.code !== 1 || !nr.stderr.includes('spixi.bundle.js: in the package, but NOT a regular file')) p.push('no-flag: the bundle as a directory: ' + brief2(nr) + ' — want exit 1 and `spixi.bundle.js: in the package, but NOT a regular file`');
      if (!/2 of 3 external scripts compared/.test(nr.stderr)) p.push('no-flag: no "2 of 3 external scripts compared"');
      const n3 = variant(Pnone.dir, 'nf3');
      for (const f of EXT) { rmSync(pjoin(n3, f)); mkdirSync(pjoin(n3, f)); }
      const nr3 = sr(T1, ['--check', n3]);
      if (nr3.code !== 1 || !/0 of 3 external scripts compared/.test(nr3.stderr) || /keep their lines|GATE 1 OK/.test(nr3.out)) p.push('no-flag: three directories: ' + brief2(nr3));
      rowS('--check (C-2): spixi.bundle.js / strings / icons as DIRECTORIES in a css package → exit 1, each "not a regular file", "0 of 3 external scripts compared", and "external scripts keep their lines" is NOT printed (an in-scope file as a directory is named, no crash); the bundle as a directory in a no-flag package → exit 1 "NOT a regular file" and "2 of 3"; the untouched packages pass', p);
    }

    // S3 — C-2: the count guard
    {
      const p = [];
      for (const [name, flags, pk] of [['css', ['--lean-css'], Pcss.dir], ['none', [], Pnone.dir]]) {
        const v = variant(pk, 'miss-' + name);
        rmSync(pjoin(v, 'spixi.icons.js'));
        const r = sr(T1, ['--check', v, ...flags]);
        if (r.code !== 1 || !r.stderr.includes('spixi.icons.js: line invariant compared NOTHING') || !/2 of 3 external scripts compared/.test(r.stderr)) p.push('[' + (flags.join(' ') || 'no flag') + '] spixi.icons.js missing: ' + brief2(r) + ' — want a `spixi.icons.js: line invariant compared NOTHING … 2 of 3 external scripts compared` line');
        if (/the 3 external scripts keep their lines|GATE 1 OK/.test(r.out)) p.push('[' + (flags.join(' ') || 'no flag') + '] a success line for 2 of 3 scripts');
      }
      rowS('--check (C-2) the count guard: one external script missing from the package → a `line invariant compared NOTHING … 2 of 3 external scripts compared` line, exit 1, no success line (lean css and no flag)', p);
    }

    // S4 — C-4: the pre-flight of the lean --out
    {
      const p = [];
      const names = (Pcss.r.stdout.match(/^ {2}✓ (\S+) → /gm) || []).map((l) => l.slice(4).split(' ')[0]);
      if (names.length < 9 || !names.includes('wallet_sent.html') || !names.includes('app_details.html')) p.push('the css package lists ' + names.length + ' targets (setup)');
      const o = pjoin(tmpC, 'o-dir');
      mkdirSync(pjoin(o, 'wallet_sent.html'), { recursive: true });
      writeFileSync(pjoin(o, 'app_details.html'), 'OLD');
      writeFileSync(pjoin(o, 'unrelated.txt'), 'KEEP');
      const before = filesUnder(o).join('|');
      const r = sr(T1, ['--out', o, '--lean-css']);
      if (r.code !== 1 || !r.stderr.includes('strip-release: REFUSED') || !r.stderr.includes('wallet_sent.html: the target is a directory') || !r.stderr.includes('nothing was written')) p.push('a target that is a directory: ' + brief2(r) + ' — want exit 1, REFUSED, `wallet_sent.html: the target is a directory`, `nothing was written`');
      if (rdS(pjoin(o, 'app_details.html')) !== 'OLD') p.push('app_details.html was REPLACED although the run was refused');
      if (rdS(pjoin(o, 'unrelated.txt')) !== 'KEEP') p.push('an unrelated file changed');
      if (!statSync(pjoin(o, 'wallet_sent.html')).isDirectory()) p.push('the directory at wallet_sent.html is gone');
      const after = filesUnder(o);
      if (after.some((x) => x.includes('.strip-tmp-'))) p.push('a .strip-tmp- file is left: ' + after.filter((x) => x.includes('.strip-tmp-')).join(', '));
      if (readDir(o).sort().join('|') !== ['app_details.html', 'unrelated.txt', 'wallet_sent.html'].join('|') || filesUnder(o).join('|') !== before) p.push('the out folder changed: ' + readDir(o).join(','));
      // a target that is a link (where the platform can make one)
      const ol = pjoin(tmpC, 'o-link'); mkdirSync(ol);
      const ext = pjoin(tmpC, 'outside.txt'); writeFileSync(ext, 'EXT');
      let linked = true;
      try { symlinkSync(ext, pjoin(ol, 'app_details.html')); } catch (_) { linked = false; }
      if (linked) {
        const rl = sr(T1, ['--out', ol, '--lean-css']);
        if (rl.code !== 1 || !rl.stderr.includes('app_details.html: the target is a link') || rdS(ext) !== 'EXT') p.push('a target that is a link: ' + brief2(rl) + ' — want exit 1, `the target is a link`, the file behind it untouched');
      }
      rowS('--out (lean, C-4) PRE-FLIGHT: an out folder that holds wallet_sent.html/ as a DIRECTORY and app_details.html with the text OLD → exit 1 "REFUSED … the target is a directory … nothing was written", app_details.html still OLD, no .strip-tmp- file anywhere, an unrelated file survives; and (where links can be made) a target that is a link is refused too', p);
    }

    // S5 — C-4: the out folder inside the source folder
    {
      const p = [];
      const T2 = mkTree('t2');
      const sub = pjoin(T2.raw, 'sub');
      const r = sr(T2, ['--out', sub, '--lean-css']);
      if (r.code !== 1 || !/inside the source folder/.test(r.stderr) || !r.stderr.includes('nothing was written')) p.push('an out folder inside the source folder: ' + brief2(r) + ' — want exit 1, "inside the source folder", "nothing was written"');
      if (existsSync(sub)) p.push('the refused out folder was created: ' + sub);
      // #46 r3 B-4: a folder whose NAME starts with `..` is inside too (`..` counts only as a whole path segment)
      for (const nm of ['..lean', '...', '..a' + '/b']) {
        const dd = pjoin(T2.raw, nm);
        const rd = sr(T2, ['--out', dd, '--lean-css']);
        if (rd.code !== 1 || !/inside the source folder/.test(rd.stderr) || !rd.stderr.includes('nothing was written')) p.push('an out folder named "' + nm + '" inside the source folder: ' + brief2(rd) + ' — want exit 1, "inside the source folder", "nothing was written"');
        if (existsSync(pjoin(T2.raw, nm.split('/')[0]))) p.push('the refused out folder "' + nm + '" was created inside the source folder');
      }
      // #46 r4 B-2: a LINK inside the source folder that points out of it — the real path is outside, the path as written is inside
      {
        const outside = pjoin(T2.root, 'r4b2-outside');
        const lnk = pjoin(T2.raw, 'r4b2-lnk');
        let made = false;
        try { mkdirSync(outside, { recursive: true }); symlinkSync(outside, lnk, 'junction'); made = true; } catch (e) { console.log('  note: S5 r4 B-2 — no link could be made here (' + (e && e.code) + '): the case is SKIPPED on this machine'); }
        if (made) {
          const rl = sr(T2, ['--out', lnk, '--lean-css']);
          if (rl.code !== 1 || !/inside the source folder/.test(rl.stderr) || !rl.stderr.includes('nothing was written')) p.push('an out folder that is a LINK inside the source folder (it points outside): ' + brief2(rl) + ' — want exit 1, "inside the source folder", "nothing was written"');
          if (filesUnder(outside).length) p.push('the refused run wrote ' + filesUnder(outside).length + ' file(s) through the link');
          const rl2 = sr(T2, ['--out', pjoin(lnk, 'deeper'), '--lean-css']);
          if (rl2.code !== 1 || !/inside the source folder/.test(rl2.stderr)) p.push('an out folder UNDER a link inside the source folder: ' + brief2(rl2) + ' — want exit 1, "inside the source folder"');
          try { rmSync(lnk, { recursive: true, force: true }); } catch (_) { /* reported next */ }
          if (existsSync(lnk)) p.push('the test link could not be removed: ' + lnk);
          if (!existsSync(outside)) p.push('removing the test link removed its target folder');
        }
      }
      // leanfollow R2: the rule now covers Resources/Raw, not only Raw/html. A sibling of Raw/html is a folder INSIDE Raw: refused. A sibling of Raw that only SHARES the name prefix is not inside it.
      const sibHtml = T2.raw + '-sibling';
      const rh = sr(T2, ['--out', sibHtml, '--lean-css']);
      if (rh.code !== 1 || !rh.stderr.includes('nothing was written') || existsSync(sibHtml)) p.push('a sibling of the source folder inside Resources/Raw (html-sibling): ' + brief2(rh) + ' (want exit 1, nothing written: it is inside the asset folder)');
      // leanfollow round 1 (r1S-4): the rule covers the WHOLE Spixi/Resources folder now, so Resources/Raw-sibling (was: exit 0) is refused; the sibling that only SHARES the name prefix
      // is now a sibling of Resources (Spixi/Resources-sibling), not inside it
      const sibRaw = pdirname(T2.raw) + '-sibling', rr = sr(T2, ['--out', sibRaw, '--lean-css']);
      if (rr.code !== 1 || !rr.stderr.includes('nothing was written') || existsSync(sibRaw)) p.push('Resources/Raw-sibling (inside Resources): ' + brief2(rr) + ' (want exit 1, nothing written: r1S-4)');
      // leanfollow round 2 (r2S-2): the project folder Spixi/ is refused outside obj and bin, so the old allowed neighbour Spixi/Resources-sibling (was: exit 0) is now refused (old -> new:
      // Spixi/Resources-sibling exit 0 -> exit 1 'the project folder'); the allowed neighbours are a sibling of the project folder (Spixi-sibling, shares its name prefix) and a folder under Spixi/obj
      const rps = pdirname(pdirname(T2.raw)) + '-sibling', rpr = sr(T2, ['--out', rps, '--lean-css']);
      if (rpr.code !== 1 || !rpr.stderr.includes('the project folder') || existsSync(rps)) p.push('Spixi/Resources-sibling (inside the project folder, outside obj and bin): ' + brief2(rpr) + ' (want exit 1 "the project folder", nothing written: r2S-2)');
      for (const sib of [pdirname(pdirname(pdirname(T2.raw))) + '-sibling', pjoin(pdirname(pdirname(pdirname(T2.raw))), 'obj', 'Resources-sibling')]) {   // a sibling of the project folder that only SHARES its name prefix; a folder under Spixi/obj
        const rs = sr(T2, ['--out', sib, '--lean-css']);
        if (rs.code !== 0 || !existsSync(pjoin(sib, 'wallet_sent.html'))) p.push('an allowed folder ' + sib.slice(sib.indexOf('t2')) + ': ' + brief2(rs) + ' (want exit 0 — outside the project folder, or under obj)');
      }
      // out == the source folder itself (#46 r2 S-2): a lean strip in place needs --in-place — refused without it, the folder untouched
      const snap = (d) => filesUnder(d).map((f) => f + ':' + createHash('sha256').update(readRaw(pjoin(d, f))).digest('hex').slice(0, 12)).join('|');
      const before = snap(T2.raw);
      const same = sr(T2, ['--out', T2.raw, '--lean-css']);
      if (same.code !== 1 || !same.stderr.includes('REFUSED — the out folder ') || !same.stderr.includes('is the source folder; a lean strip in place needs --in-place; nothing was written')) p.push('out == the source folder, no --in-place: ' + brief2(same) + ' — want exit 1 "REFUSED — the out folder … is the source folder; a lean strip in place needs --in-place; nothing was written"');
      if (snap(T2.raw) !== before) p.push('the refused in-place run CHANGED the source folder');
      const inpl = sr(T2, ['--out', T2.raw, '--lean-css', '--in-place']);
      if (inpl.code !== 0 || /REFUSED/.test(inpl.out) || snap(T2.raw) === before) p.push('out == the source folder with --in-place: ' + brief2(inpl) + ' (want exit 0 and the folder stripped)');
      const g1 = sr(T1, ['--check', T2.raw, '--lean-css']);
      if (g1.code !== 0 || !/GATE 1 OK — lean css/.test(g1.stdout)) p.push('GATE 1 on the in-place package: ' + brief2(g1) + ' (want exit 0 "GATE 1 OK")');
      // a NO-FLAG --out into the source folder of a copy: before leanfollow R2 exit 0 with one file; now it is refused like the lean one (the same function), and allowed with --in-place (exit 0, one file, the tokens file stripped)
      const T3 = mkTree('t3');
      const before3 = snap(T3.raw);
      const nf0 = sr(T3, ['--out', T3.raw]);
      if (nf0.code !== 1 || !nf0.stderr.includes('is the source folder; a strip in place needs --in-place; nothing was written') || snap(T3.raw) !== before3) p.push('a no-flag --out into the source folder of a copy, no --in-place: ' + brief2(nf0) + ' (want exit 1 "is the source folder; a strip in place needs --in-place; nothing was written" and the folder untouched)');
      const nf = sr(T3, ['--out', T3.raw, '--in-place']);
      if (nf.code !== 0 || !/1 file\(s\) written/.test(nf.stdout) || /REFUSED/.test(nf.out) || readRaw(pjoin(T3.raw, 'spixi.tokens.css'), 'utf8') === readRaw(pjoin(T1.raw, 'spixi.tokens.css'), 'utf8')) p.push('a no-flag --out --in-place into the source folder of a copy: ' + brief2(nf) + ' (want exit 0, "1 file(s) written", the tokens file stripped)');
      rowS('--out (lean, C-4 / r2 S-2): an out folder INSIDE the source folder (a copy of Raw/html, its own script; also one named `..lean`, `...` or `..a/b`, #46 r3 B-4; also a link inside it that points outside, #46 r4 B-2) → exit 1 "inside the source folder … nothing was written" and nothing created; a sibling of the project folder Spixi that shares only its name prefix, and a folder under Spixi/obj, are fine; Spixi/Resources-sibling is refused (r2S-2), a sibling of Raw/html and Resources/Raw-sibling (inside Resources) are refused (leanfollow R2, r1S-4); out == the source folder → exit 1 "REFUSED … needs --in-place … nothing was written" (the folder untouched), exit 0 with --in-place and GATE 1 OK on the result; a NO-FLAG --out into the source folder of a copy → exit 1 without --in-place, exit 0 with it, 1 file', p);
    }

    // S6 — C-4: the two phases, with a fault injected into fs (a preload patches writeFileSync / renameSync of the child process only)
    {
      const p = [];
      const inject = pjoin(tmpC, 'inject.mjs');
      writeFileSync(inject, [
        "import fs from 'node:fs'; import { syncBuiltinESMExports } from 'node:module';",
        "const mode = process.env.SR_FAULT, n = Number(process.env.SR_FAULT_N); let c = 0;",
        "const boom = () => Object.assign(new Error('ENOSPC: no space left on device (injected)'), { code: 'ENOSPC' });",
        "if (mode === 'write') { const w = fs.writeFileSync; fs.writeFileSync = function (p, ...a) { if (String(p).includes('.strip-tmp-') && ++c === n) throw boom(); return w.call(this, p, ...a); }; }",
        "if (mode === 'rename') { const r = fs.renameSync; fs.renameSync = function (a, ...b) { if (String(a).includes('.strip-tmp-') && ++c === n) throw boom(); return r.call(this, a, ...b); }; }",
        "syncBuiltinESMExports();",
      ].join('\n') + '\n');
      const node = ['--import', pathToFileURL(inject).href];
      const names = (Pcss.r.stdout.match(/^ {2}✓ (\S+) → /gm) || []).map((l) => l.slice(4).split(' ')[0]);
      const tmps = (d) => filesUnder(d).filter((x) => x.includes('.strip-tmp-'));
      // (c) phase 1: the 4th temp file cannot be written
      const o1 = pjoin(tmpC, 'f-write'); mkdirSync(o1);
      writeFileSync(pjoin(o1, 'app_details.html'), 'OLD1'); writeFileSync(pjoin(o1, 'chat.html'), 'OLD2'); writeFileSync(pjoin(o1, 'unrelated.txt'), 'KEEP');
      const r1 = sr(T1, ['--out', o1, '--lean-css'], { SR_FAULT: 'write', SR_FAULT_N: '4' }, node);
      if (r1.code !== 1 || !/WRITE FAILED — ENOSPC/.test(r1.stderr) || !r1.stderr.includes('nothing in the out folder was changed')) p.push('phase 1 fault: ' + brief2(r1) + ' — want exit 1, "WRITE FAILED — ENOSPC", "nothing in the out folder was changed"');
      if (rdS(pjoin(o1, 'app_details.html')) !== 'OLD1' || rdS(pjoin(o1, 'chat.html')) !== 'OLD2' || rdS(pjoin(o1, 'unrelated.txt')) !== 'KEEP') p.push('phase 1 fault: a file that existed before the run was deleted or changed');
      if (tmps(o1).length || readDir(o1).sort().join('|') !== 'app_details.html|chat.html|unrelated.txt') p.push('phase 1 fault: the out folder is not as it was: ' + readDir(o1).join(','));
      // … into an out folder the run would CREATE: it is gone again
      const o2 = pjoin(tmpC, 'f-new');
      const r2 = sr(T1, ['--out', o2, '--lean-css'], { SR_FAULT: 'write', SR_FAULT_N: '3' }, node);
      if (r2.code !== 1 || !r2.stderr.includes('WRITE FAILED') || existsSync(o2)) p.push('phase 1 fault into a new folder: ' + brief2(r2) + (existsSync(o2) ? ' — the folder the run made is still there: ' + filesUnder(o2).join(',') : ''));
      // (d) phase 2: the 4th rename fails — every target existed before
      const o3 = pjoin(tmpC, 'f-rename'); mkdirSync(o3);
      for (const f of names) writeFileSync(pjoin(o3, f), 'OLD ' + f);
      writeFileSync(pjoin(o3, 'unrelated.txt'), 'KEEP');
      const r3 = sr(T1, ['--out', o3, '--lean-css'], { SR_FAULT: 'rename', SR_FAULT_N: '4' }, node);
      if (r3.code !== 1 || !r3.stderr.includes('WRITE FAILED in the rename phase') || !r3.stderr.includes('THE OUT FOLDER IS NOT CONSISTENT: 3 of ' + names.length + ' target(s) were already replaced') || !r3.stderr.includes('no target was deleted')) p.push('phase 2 fault: ' + brief2(r3) + ' — want exit 1, "WRITE FAILED in the rename phase", "THE OUT FOLDER IS NOT CONSISTENT: 3 of ' + names.length + ' target(s) were already replaced", "no target was deleted"');
      const missing = names.filter((f) => !existsSync(pjoin(o3, f)));
      if (missing.length) p.push('phase 2 fault: a target was DELETED: ' + missing.slice(0, 3).join(', '));
      else {
        const replaced = names.filter((f) => readRaw(pjoin(o3, f), 'utf8') !== 'OLD ' + f);
        if (replaced.join('|') !== names.slice(0, 3).join('|')) p.push('phase 2 fault: replaced = ' + replaced.join(',') + ' (want the first three of the plan: ' + names.slice(0, 3).join(',') + ')');
      }
      if (tmps(o3).length) p.push('phase 2 fault: a temp file is left: ' + tmps(o3).join(', '));
      if (rdS(pjoin(o3, 'unrelated.txt')) !== 'KEEP') p.push('phase 2 fault: the unrelated file changed');
      rowS('--out (lean, C-4) the TWO PHASES with a fault injected into fs: a temp file that cannot be written (4th write) → exit 1 "WRITE FAILED", every file that existed before is still there with its old content, no .strip-tmp- left, a folder the run made is gone again; a rename that fails (4th) → exit 1 "THE OUT FOLDER IS NOT CONSISTENT: 3 of N target(s) were already replaced … no target was deleted", the other targets still hold their old content, no temp left', p);
    }

    // S7 — C-8: the CLI edges (exit 2, nothing written) and where the env is read
    {
      const p = [];
      const X = pjoin(tmpC, 'x-out'), Y = Pboth.dir;
      for (const env of [undefined, { SPIXI_PACKAGED_LEAN: 'css,js' }]) {
        for (const extra of [[], ['--lean-css']]) {
          const r = sr(T1, ['--out', X, '--check', Y, ...extra], env);
          if (r.code !== 2 || !r.stderr.includes('--out and --check cannot be given together')) p.push('--out + --check' + (extra.length ? ' ' + extra[0] : '') + (env ? ' with the env' : '') + ': ' + brief2(r) + ' — want exit 2 "--out and --check cannot be given together"');
          if (existsSync(X)) p.push('--out + --check wrote ' + X);
        }
      }
      const rev = sr(T1, ['--check', Y, '--out', X, '--lean-css']);
      if (rev.code !== 2 || existsSync(X)) p.push('--check … --out (the other order): ' + brief2(rev));
      for (const [bad, re] of [['-lean-css', /unexpected argument "-lean-css"/], ['lean-css', /unexpected argument "lean-css"/], ['x', /unexpected argument "x"/]]) {
        const r = sr(T1, ['--check', Y, bad]);
        if (r.code !== 2 || !re.test(r.stderr) || /GATE 1/.test(r.out)) p.push('`' + bad + '`: ' + brief2(r) + ' — want exit 2 and ' + re);
      }
      const r2 = sr(T1, ['--stats', 'lean-css']); if (r2.code !== 2 || !/unexpected argument/.test(r2.stderr)) p.push('--stats lean-css: ' + brief2(r2));
      const lj = sr(T1, ['--out', X, '--lean-j']);
      if (lj.code !== 2 || !/unknown flag --lean-j/.test(lj.stderr) || existsSync(X)) p.push('--lean-j: ' + brief2(lj) + ' — want exit 2 "unknown flag --lean-j" and nothing written');
      const none = sr(T1, []);
      if (none.code !== 2 || !/one of --out <dir>/.test(none.stderr)) p.push('no arguments: ' + brief2(none) + ' (want exit 2 "one of --out <dir> …")');
      const only = sr(T1, ['--lean-css']);
      if (only.code !== 2) p.push('a lean flag alone: ' + brief2(only) + ' (want exit 2)');
      // where the env is read: --check only, with no flag, no --stats, no --stdout
      const envOn = { SPIXI_PACKAGED_LEAN: 'css,js' };
      const s0 = sr(T1, ['--stats']), s1 = sr(T1, ['--stats'], envOn);
      if (s0.code !== 0 || s1.code !== s0.code || s1.stdout !== s0.stdout || s1.stderr !== s0.stderr || /lean/.test(s1.stdout)) p.push('--stats with the env differs from the same without it: ' + brief2(s1) + ' (the env is read only for a --check run)');
      const t0 = sr(T1, ['--stdout', 'spixi.tokens.css']), t1 = sr(T1, ['--stdout', 'spixi.tokens.css'], envOn);
      if (t0.code !== 0 || t1.code !== 0 || t1.stdout !== t0.stdout || t1.stdout.length === 0 || /lean/.test(t1.stderr)) p.push('--stdout with the env differs: ' + brief2(t1));
      const o = pjoin(tmpC, 'env-out');
      const wo = sr(T1, ['--out', o], envOn);
      if (wo.code !== 0 || readDir(o).join('|') !== 'spixi.tokens.css' || !/1 file\(s\) written/.test(wo.stdout)) p.push('--out with the env set (no --check): ' + brief2(wo) + ' wrote ' + (existsSync(o) ? readDir(o).length : 0) + ' file(s) (want the no-flag output: spixi.tokens.css only)');
      const e1 = sr(T1, ['--check', Y], envOn);
      if (e1.code !== 0 || !/lean mode css,js \(from SPIXI_PACKAGED_LEAN\)/.test(e1.stdout)) p.push('--check with the env (the in-suite GATE 1): ' + brief2(e1) + ' — want exit 0 and "lean mode css,js (from SPIXI_PACKAGED_LEAN)"');
      const e0 = sr(T1, ['--check', Y]);
      if (e0.code !== 1) p.push('--check of a lean package with no env and no flag must fail (it is not a no-flag package): ' + brief2(e0));
      const ef = sr(T1, ['--check', Y, '--lean-css', '--lean-js'], { SPIXI_PACKAGED_LEAN: 'js' });
      if (ef.code !== 0 || !/lean mode css,js \(from the flags\)/.test(ef.stdout)) p.push('flags win over the env: ' + brief2(ef));
      const eb = sr(T1, ['--check', Y], { SPIXI_PACKAGED_LEAN: 'bogus' }), es = sr(T1, ['--stats'], { SPIXI_PACKAGED_LEAN: 'bogus' });
      if (eb.code !== 2 || !/SPIXI_PACKAGED_LEAN must be/.test(eb.stderr) || es.code !== 0) p.push('a bad env value: --check ' + brief2(eb) + ' · --stats ' + brief2(es) + ' (want exit 2 for --check, the env not read for --stats)');
      rowS('CLI (C-8): --out together with --check (either order, with a lean flag, with the env) → exit 2 "cannot be given together" and nothing written; `-lean-css`, `lean-css` and a stray word → exit 2 "unexpected argument"; --lean-j → exit 2 "unknown flag"; no arguments and a lean flag alone → exit 2; the env SPIXI_PACKAGED_LEAN is read ONLY by a --check run with no flag, no --stats, no --stdout (the output of --stats / --stdout / --out is the same with and without it; --check reads it; a flag wins; a bad value is exit 2 for --check only)', p);
    }

    // S8 — #1478 one switch per change: spixi.tokens.css follows lean CSS only
    {
      const p = [];
      const PJs = pkg('js', ['--lean-js']);
      const TK = 'spixi.tokens.css';
      const src = readRaw(pjoin(T1.raw, TK), 'utf8');
      const { stripCssComments } = await import(pathToFileURL(pjoin(base, 'scripts/strip-release.mjs')).href);
      const { stripCssLean } = await import(pathToFileURL(pjoin(base, 'scripts/lib/lean-strip.mjs')).href);
      const old = stripCssComments(src), lean = stripCssLean(src, { file: TK });
      if (old === lean || old === src) p.push('setup: the old strip, the lean strip and the source are not three different texts for ' + TK);
      const js = readRaw(pjoin(PJs.dir, TK), 'utf8'), none = readRaw(pjoin(Pnone.dir, TK), 'utf8'), css = readRaw(pjoin(Pcss.dir, TK), 'utf8');
      if (js !== none) p.push('--lean-js: ' + TK + ' is NOT byte-identical to the no-flag package (' + js.length + ' vs ' + none.length + ' chars)');
      if (js !== old || none !== old) p.push('--lean-js / no flag: ' + TK + ' is not the OLD tokens strip');
      if (css === none) p.push('--lean-css: ' + TK + ' equals the old strip (the lean rule did not apply)');
      if (css !== lean) p.push('--lean-css: ' + TK + ' is not stripCssLean(source)');
      const cp = 'spixi.chat-pattern.css';
      if (readRaw(pjoin(PJs.dir, cp), 'utf8') !== readRaw(pjoin(T1.raw, cp), 'utf8')) p.push('--lean-js changed ' + cp + ' (a css file outside the js scope)');
      if (readRaw(pjoin(Pcss.dir, cp), 'utf8') !== stripCssLean(readRaw(pjoin(T1.raw, cp), 'utf8'), { file: cp })) p.push('--lean-css: ' + cp + ' is not stripCssLean(source)');
      const st = sr(T1, ['--stdout', TK, '--lean-js']);
      if (st.code !== 0 || st.stdout !== old) p.push('--lean-js --stdout ' + TK + ' is not the old strip: ' + brief2(st));
      rowS('one switch per change (#1478): spixi.tokens.css of a --lean-js package is byte-identical to the no-flag package and is the OLD tokens strip (also via --stdout), spixi.chat-pattern.css is untouched; of a --lean-css package it differs and equals stripCssLean(source)', p);
    }

    // S9 — C-9: the pixel gate refuses A = B before it needs a browser
    {
      const p = [];
      const PG = pjoin(base, 'scripts/pixel-gate.mjs');
      const html = pjoin(base, HTML);
      const env = cenv(); delete env.PLAYWRIGHT_MODULE;
      const run = (args, e) => { const r = spawnSync(process.execPath, [PG, ...args], { cwd: tmpC, encoding: 'utf8', timeout: 60000, env: e || env }); return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), err: r.error && r.error.message }; };
      const a = run(['--b', html]);
      if (a.code !== 2 || !/A and B are the same directory/.test(a.out)) p.push('--b = the default A: exit ' + a.code + ' ' + a.out.trim().split('\n')[0].slice(0, 120) + ' — want exit 2 "A and B are the same directory"');
      const b = run(['--a', html, '--b', html + '/']);
      if (b.code !== 2 || !/same directory/.test(b.out)) p.push('--b with a trailing slash: exit ' + b.code);
      // B a different folder that holds the same shells: past the refusal (the next stop is the missing browser)
      const L = pjoin(tmpC, 'pg-links'); mkdirSync(L);
      let linked = true;
      for (const f of readDir(html).filter((x) => x.endsWith('.html'))) { try { symlinkSync(pjoin(html, f), pjoin(L, f)); } catch (_) { linked = false; break; } }
      if (linked) {
        const c = run(['--a', html, '--b', L], { ...env, PLAYWRIGHT_MODULE: pjoin(tmpC, 'no-such-playwright.mjs') });
        if (c.code !== 2 || /same directory/.test(c.out) || !/Playwright not found/.test(c.out)) p.push('control, B a different folder: exit ' + c.code + ' ' + c.out.trim().split('\n')[0].slice(0, 120) + ' — want exit 2 "Playwright not found" (no A = B refusal)');
        const d = pjoin(tmpC, 'pg-dirlink');
        let dl = true; try { symlinkSync(html, d); } catch (_) { dl = false; }
        if (dl) {
          const e = run(['--a', html, '--b', d]);
          if (e.code !== 2 || !/same directory/.test(e.out)) p.push('B = a symlink to A: exit ' + e.code + ' ' + e.out.trim().split('\n')[0].slice(0, 100));
        }
      }
      rowS('pixel gate (C-9): `pixel-gate.mjs --b <A>` (also with a trailing slash, and B a symlink to A) → exit 2 "A and B are the same directory" BEFORE the browser is needed (PLAYWRIGHT_MODULE unset); with B a different folder the run passes that refusal (and stops at "Playwright not found")', p);
    }

    // S10 — #46 r2 C-1: the ONLY call of the in-build post-conditions (`scope.check(rel, src, out)`) — a FAULTY TRANSFORM is injected into the child
    // by a loader hook that rewrites scripts/lib/lean-strip.mjs ON LOAD (no product change): transform() returns a wrong output for scan.html
    {
      const p = [];
      const head = '    transform(rel, text, onKept) {';
      const leanSrc = readRaw(pjoin(base, 'scripts/lib/lean-strip.mjs'), 'utf8');
      if (leanSrc.split(head).length !== 2) p.push('the fault hook no longer fits lean-strip.mjs: update the row (the head text of `transform(` — ' + J(head) + ' — is not found exactly once)');
      else {
        const dir = pjoin(tmpC, 'fault-hook');
        mkdirSync(dir);
        writeFileSync(pjoin(dir, 'fault-hook.mjs'), [
          '// the transform returns a WRONG output for scan.html: the first carrier *SL{ becomes *SX{ (scope.check must catch it)',
          'export async function load(url, context, next) {',
          '  const r = await next(url, context);',
          "  if (!url.endsWith('/scripts/lib/lean-strip.mjs')) return r;",
          '  const src = String(r.source);',
          "  const head = " + J(head) + ';',
          "  if (src.split(head).length !== 2) throw new Error('fault-hook: the transform head was not found exactly once');",
          "  const out = src.replace(head, '    transform(rel, text, onKept) { const __o = scope.__realTransform(rel, text, onKept); return rel === \"scan.html\" ? __o.replace(\"*SL{\", \"*SX{\") : __o; },\\n    __realTransform(rel, text, onKept) {');",
          '  return { ...r, source: out, shortCircuit: true };',
          '}',
        ].join('\n') + '\n');
        writeFileSync(pjoin(dir, 'fault-preload.mjs'), "import { register } from 'node:module';\nregister(new URL('./fault-hook.mjs', import.meta.url));\n");
        const node = ['--import', pathToFileURL(pjoin(dir, 'fault-preload.mjs')).href];
        const o = pjoin(tmpC, 'f-transform'); mkdirSync(o);
        const r = sr(T1, ['--out', o, '--lean-css', '--lean-js'], undefined, node);
        if (r.code !== 1 || !/strip-release: FAILED — lean-strip: scan\.html: carrier \*SL\{/.test(r.stderr) || !r.stderr.includes('nothing was written')) p.push('--out with a faulty transform: ' + brief2(r) + ' — want exit 1, `strip-release: FAILED — lean-strip: scan.html: carrier *SL{…`, `nothing was written` (the post-condition scope.check is the only call that sees a wrong output)');
        if (filesUnder(o).length) p.push('--out with a faulty transform wrote ' + filesUnder(o).length + ' file(s): ' + filesUnder(o).slice(0, 3).join(', '));
        const c = sr(T1, ['--check', Pboth.dir, '--lean-css', '--lean-js'], undefined, node);
        if (c.code !== 1 || !c.stderr.includes('scan.html: the strip of the committed file failed — lean-strip: scan.html: carrier *SL{')) p.push('--check with a faulty transform: ' + brief2(c) + ' — want exit 1 and `scan.html: the strip of the committed file failed — lean-strip: scan.html: carrier *SL{…`');
        const ok0 = sr(T1, ['--check', Pboth.dir, '--lean-css', '--lean-js']);
        if (ok0.code !== 0) p.push('control: the same --check without the hook: ' + brief2(ok0));
      }
      rowS('--out / --check (r2 C-1): a FAULTY TRANSFORM injected by a loader hook (scan.html comes out with a carrier changed) → `--out` exits 1 "FAILED — lean-strip: scan.html: carrier …", "nothing was written", 0 files in the out folder; `--check` of a good both-flags package exits 1 "the strip of the committed file failed" — the in-build post-conditions (scope.check) are the only call that sees it', p);
    }

    // S11 — the phase-1 READ-BACK: one temp write comes out short
    {
      const p = [];
      const pre = pjoin(tmpC, 'truncate-preload.mjs');
      writeFileSync(pre, [
        "import fs from 'node:fs';",
        "import { syncBuiltinESMExports } from 'node:module';",
        'const w = fs.writeFileSync;',
        'fs.writeFileSync = function (p, d, o) { if (/scan\\.html\\.strip-tmp-/.test(String(p))) d = String(d).slice(0, -100); return w.call(this, p, d, o); };',
        'syncBuiltinESMExports();',
      ].join('\n') + '\n');
      const o = pjoin(tmpC, 'f-short'); mkdirSync(o);
      writeFileSync(pjoin(o, 'scan.html'), 'OLD'); writeFileSync(pjoin(o, 'unrelated.txt'), 'KEEP');
      const r = sr(T1, ['--out', o, '--lean-css'], undefined, ['--import', pathToFileURL(pre).href]);
      if (r.code !== 1 || !/WRITE FAILED — SHORT WRITE on .*scan\.html\.strip-tmp-/.test(r.stderr) || !r.stderr.includes('nothing in the out folder was changed')) p.push('a short temp write: ' + brief2(r) + ' — want exit 1, the PHASE-1 text `WRITE FAILED — SHORT WRITE on …scan.html.strip-tmp-…` and `nothing in the out folder was changed`');
      if (/rename phase|NOT CONSISTENT/.test(r.stderr)) p.push('the failure surfaced only in the rename phase (the phase-1 read-back is gone): ' + r.stderr.trim().split('\n').pop().slice(0, 120));
      if (rdS(pjoin(o, 'scan.html')) !== 'OLD' || rdS(pjoin(o, 'unrelated.txt')) !== 'KEEP' || readDir(o).sort().join('|') !== 'scan.html|unrelated.txt') p.push('the out folder is not as it was: ' + readDir(o).join(','));
      rowS('--out (lean) PHASE-1 READ-BACK: one temp file is written 100 characters short → exit 1 with the phase-1 text "WRITE FAILED — SHORT WRITE on …", "nothing in the out folder was changed", NOT the rename-phase text; the old files are intact, no temp left', p);
    }

    // S12 — #46 r2 C-3: ONE mode, each value flag once (exit 2, nothing written); the single modes still work
    {
      const p = [];
      const X = pjoin(tmpC, 'm-a'), X2 = pjoin(tmpC, 'm-b'), Y = Pnone.dir;
      const ONE = /give exactly one of --out \/ --check \/ --stats \/ --stdout \(got /;
      const TWICE = (f) => new RegExp(f + ' given 2 times \\(each of --out / --check / --stdout at most once\\)');
      const INPL = /--in-place is valid only together with --out <dir>(?!\s+and)/;   // leanfollow R2: with no --out it is a usage error (the other-folder case is r1S-6, below)
      const table = [
        [['--check', Y, '--stats'], ONE], [['--check', Y, '--stdout', 'spixi.tokens.css'], ONE], [['--stats', '--stdout', 'spixi.tokens.css'], ONE], [['--stats', '--check', Y], ONE],
        [['--stats', '--stats'], ONE], [['--check', Y, '--check', Y], TWICE('--check')], [['--out', X, '--out', X2], TWICE('--out')], [['--stdout', 'spixi.tokens.css', '--stdout', 'spixi.tokens.css'], TWICE('--stdout')],
        [['--in-place'], INPL], [['--in-place', '--lean-css'], INPL], [['--check', Y, '--in-place', '--lean-css'], INPL], [['--stats', '--in-place', '--lean-js'], INPL],
        [['--out', X, '--out', X2, '--lean-css'], TWICE('--out')], [['--check', Y, '--lean-css', '--stats'], ONE],
      ];
      for (const [args, re] of table) {
        const r = sr(T1, args);
        if (r.code !== 2 || !re.test(r.stderr) || r.stdout.trim() !== '') p.push('`' + args.map((a) => (a.length > 40 ? '…' + a.slice(-12) : a)).join(' ') + '`: ' + brief2(r) + ' — want exit 2 and ' + re);
      }
      if (existsSync(X) || existsSync(X2)) p.push('a refused call wrote an out folder');
      const st = sr(T1, ['--stats']), sd = sr(T1, ['--stdout', 'spixi.tokens.css']), no = sr(T1, []);
      if (st.code !== 0 || !/strip-release --stats: /.test(st.stdout)) p.push('--stats alone: ' + brief2(st));
      if (sd.code !== 0 || sd.stdout.length < 1000) p.push('--stdout spixi.tokens.css alone: ' + brief2(sd));
      if (no.code !== 2 || !/one of --out <dir>/.test(no.stderr)) p.push('no arguments: ' + brief2(no));
      const ok1 = sr(T1, ['--check', Y]); if (ok1.code !== 0) p.push('--check alone: ' + brief2(ok1));
      // leanfollow round 1 (r1S-6; was: exit 0 "valid with any --out"): --in-place with an out folder that is NOT the source folder is a usage error, plain and lean, nothing written
      for (const fl of [[], ['--lean-css']]) {
        const okIn = sr(T1, ['--out', X, '--in-place', ...fl]);
        if (okIn.code !== 2 || !/--in-place is valid only when --out is the source folder Spixi\/Resources\/Raw\/html/.test(okIn.stderr) || existsSync(X)) p.push('--out <outside> --in-place' + (fl.length ? ' --lean-css' : '') + ': ' + brief2(okIn) + ' (want exit 2 "--in-place is valid only when --out is the source folder …", nothing written)');
      }
      rowS('one mode, each value once (r2 C-3): `--check X --stats`, `--check X --stdout F`, `--stats --stdout F`, `--stats --check X`, `--stats --stats`, `--check A --check B`, `--out A --out B`, `--stdout F --stdout F`, `--in-place` without --out / with a lean flag but no --out / with --check / with --stats → each exit 2 with its own text and nothing written; `--out <outside> --in-place` (plain and --lean-css: not the source folder) → exit 2 "--in-place is valid only when --out is the source folder" (leanfollow r1S-6); --stats, --stdout F, --check X alone work; no arguments → exit 2 "one of"', p);
    }

    // S13 — #46 r2 C-8: entries of the package that are not regular files are a GATE 1 problem, never opened (no hang)
    {
      const p = [], skipped = [];
      const fifo = (f) => { if (process.platform === 'win32') return false; try { return spawnSync('mkfifo', [f], { stdio: 'ignore' }).status === 0; } catch (_) { return false; } };
      const lnk = (t, at) => { try { symlinkSync(t, at); return true; } catch (_) { return false; } };
      const gone = (f) => { try { rmSync(f, { recursive: true, force: true }); } catch (_) { /* best effort */ } };
      const HEAD = (flags) => flags.length ? 'GATE 1 FAILED (lean ' + flags.map((x) => x.slice(7)).join(',') + ') — the package holds entries that are not regular files (never opened)' : 'GATE 1 FAILED — the package holds entries that are not regular files (never opened)';
      for (const [flags, pk, label] of [[[], Pnone.dir, 'no flag'], [['--lean-css'], Pcss.dir, 'lean css'], [['--lean-css', '--lean-js'], Pboth.dir, 'lean css,js']]) {
        const v = variant(pk, 'ent-' + label.replace(/\W/g, ''));
        const probe = (what, re, mk, rel) => {
          if (!mk()) { skipped.push(label + ': ' + what + (process.platform === 'win32' && /FIFO/.test(what) ? ' (no mkfifo on win32)' : ' (cannot be made here)')); return; }
          const r = sr(T1, ['--check', v, ...flags], undefined, undefined, 20000);
          if (r.err || r.signal) p.push('[' + label + '] ' + what + ': the run was KILLED / timed out (a hang?): ' + brief2(r));
          else if (r.code !== 1 || !r.stderr.includes(HEAD(flags)) || !re.test(r.stderr)) p.push('[' + label + '] ' + what + ': ' + brief2(r) + ' — want exit 1, `' + HEAD(flags) + '` and ' + re);
          if (/GATE 1 OK/.test(r.out)) p.push('[' + label + '] ' + what + ': GATE 1 OK was printed');
          gone(pjoin(v, rel));
        };
        probe('a dangling link', /dangling\.js: a dangling link \(ENOENT\)/, () => lnk('no-such-target', pjoin(v, 'dangling.js')), 'dangling.js');
        probe('a link loop', /loop\.js: a link loop \(ELOOP\)/, () => lnk('loop.js', pjoin(v, 'loop.js')), 'loop.js');
        probe('a link to a directory', /dirlink\.js: a link to a directory/, () => lnk('js', pjoin(v, 'dirlink.js')), 'dirlink.js');
        probe('a FIFO outside the scope (js/fifo.js)', /js\/fifo\.js: not a regular file \(a FIFO\)/, () => fifo(pjoin(v, 'js', 'fifo.js')), 'js/fifo.js');
        if (flags.length <= 1) {   // a FIFO in place of the stylesheet that is always in scope
          const t = pjoin(v, 'spixi.tokens.css'), keep = readRaw(t);
          probe('a FIFO in place of spixi.tokens.css', /spixi\.tokens\.css: not a regular file \(a FIFO\)/, () => { gone(t); return fifo(t); }, 'spixi.tokens.css');
          writeFileSync(t, keep);
        }
      }
      for (const x of skipped) console.log('  ~ SKIPPED (strip-release package entries): ' + x);
      rowS('--check (r2 C-8): a dangling link, a link loop, a link to a directory, a FIFO out of scope (js/fifo.js) and a FIFO in place of spixi.tokens.css → exit 1 "GATE 1 FAILED — the package holds entries that are not regular files (never opened)" + one line each, with no flag and with lean flags, NO HANG (a 20 s timeout is a failure)' + (skipped.length ? ' [SKIPPED on this platform: ' + skipped.join('; ') + ']' : ''), p);
    }
  } finally {
    rmSync(tmpC, { recursive: true, force: true });
  }
}
