#!/usr/bin/env node
/**
 * smoke-packaged.mjs — GATE 2 of the comment-strip fork (Session N; strip-release.mjs
 * carries gate 1 and the rationale). Runs the WHOLE smoke suite over a PACKAGED tree —
 * i.e. what a Release build ships after strip-release.mjs — at least once per release.
 *
 * Why a separate runner: ~4 000 pins read the COMMITTED artifacts under
 * Spixi/Resources/Raw/html (55 sources do so directly), and after the fork those are no
 * longer what ships. Gate 1 proves the strip was deterministic; only running the suite
 * over the stripped tree proves it was HARMLESS — a pin that reads prose out of an
 * allowlisted stylesheet, or a shell that depends on a comment surviving, is found here
 * and nowhere else.
 *
 * What it does, in a FULL copy (never the working tree, never cp -al):
 *   1. copies the repo (minus .git and node_modules) into a temp dir, symlinks node_modules
 *   2. runs the copy's strip-release.mjs --out over its own Raw/html  (the package)
 *   3. runs THIS tree's strip-release.mjs --check against it            (gate 1, standalone)
 *   4. runs the copy's smoke-test.mjs with SPIXI_PACKAGED_FROM=<this Raw/html>, which
 *      makes the in-suite artifact gate ask gate 1's question instead of build-shells'
 *   5. prints the copy's verdict line and exits with its status
 *
 * USAGE   node scripts/smoke-packaged.mjs [--keep]     (--keep leaves the temp copy for inspection)
 *         node scripts/smoke-packaged.mjs [--lean-css] [--lean-js] [--keep]
 *         ★ perflean (docs/contract-perflean.md § 3.4): a LEAN run strips the copy with the
 *         flags, runs GATE 1 with the flags, re-checks each Session F row that is red by design
 *         on its own (built ≡ the shipped transform of its source), runs the parser cross-check
 *         (scripts/pins-perflean/x-parser-crosscheck.mjs), then the suite with SPIXI_PACKAGED_FROM
 *         and SPIXI_PACKAGED_LEAN. Some rows are red BY DESIGN on a lean package; the run passes
 *         only when the red rows are exactly the expected ones of
 *         scripts/pins-perflean/lean-expected-reds.json (per active flag, plus its list "copy" =
 *         the rows that are red in EVERY packaged copy because the copy is not a git work tree)
 *         plus the 2 KNOWN — judged by the row lists (judgeLean: the suite's summary must be a
 *         whole line in its own format and agree with the rows) AND by the suite process
 *         (leanVerdict: its exit status must fit that summary; a signal or a spawn error fails),
 *         not by the exit status alone (a lean run exits 1 by design). The lean run also links
 *         the Ixian-Core sibling (root/../Ixian-Core, when it is there) next to the copy: three
 *         rows read Core files and are red in a copy without it. At the end it removes its three
 *         links one by one (the link, never through it) BEFORE the recursive delete of the temp
 *         folder; a link that cannot be removed leaves the folder in place, names it, exit 1.
 *         No lean flag = the run below, unchanged.
 * Takes as long as the suite (~5 min in the container). Record the verdict in DECISIONS
 * with the release it covers.
 */
import { mkdtempSync, rmSync, symlinkSync, existsSync, cpSync, mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const keep = process.argv.includes('--keep');
// ★ perflean: a lean run takes its own path (leanGate2, below) and exits; without a lean flag the code after this line runs as before
const LEAN_FLAGS = ['--lean-css', '--lean-js'].filter((f) => process.argv.includes(f));
if (LEAN_FLAGS.length || process.argv.slice(2).some((a) => a.startsWith('--lean'))) process.exit(leanArgsProblem(process.argv.slice(2)) ? 2 : await leanGate2());
const tmp = mkdtempSync(join(tmpdir(), 'spixi-packaged-'));
const copy = join(tmp, 'Spixi');
const q = JSON.stringify;

try {
  console.log('smoke-packaged: copying the tree → ' + copy);
  // Node's own copy, so the same script runs on Damir's PC (no tar/mkdir -p in cmd)
  mkdirSync(copy, { recursive: true });
  // #46 auditor B: obj/ bin/ local-nuget/ _to_delete/ are excluded too — hundreds of MB per run on the PC otherwise
  cpSync(root, copy, { recursive: true, filter: (p) => !/[\\/](?:\.git|node_modules|obj|bin|local-nuget|_to_delete)(?:[\\/]|$)/.test(p.slice(root.length)) });
  if (existsSync(join(root, 'node_modules'))) symlinkSync(join(root, 'node_modules'), join(copy, 'node_modules'), 'junction');
  /* ★★ 2026-09-07 (Damir, iOS walk R) — local-nuget/ IS SYMLINKED BACK IN, and leaving it out
     had made GATE 2 UNPASSABLE since Session R added gate 22. That gate hashes the committed
     RocksDB.0.0.42.nupkg; the exclusion above deleted the file from the package, so the pin
     took its else-branch and reported "gate 22 premise: … nothing to verify without it" — a
     RED that says nothing about the packaged tree and everything about the copy.
     ⚠ The exclusion's stated reason does not hold for this folder: obj/ and bin/ are the
     hundreds of megabytes, local-nuget/ is ~1 MB. It was swept up with them.
     A symlink, not a copy, for the same reason node_modules gets one: nothing in the suite
     writes here, and the bytes gate 22 hashes must be the COMMITTED bytes.
     ★ This is the second gate found dead in one afternoon. The first was strip-release's
     main-module guard. Both were written in the container and never run on a Mac; neither
     had a pin asserting it could run at all. */
  if (existsSync(join(root, 'local-nuget'))) symlinkSync(join(root, 'local-nuget'), join(copy, 'local-nuget'), 'junction');

  const copyRaw = join(copy, 'Spixi', 'Resources', 'Raw', 'html');
  console.log('smoke-packaged: stripping the copy in place (the package)');
  execSync(q(process.execPath) + ' ' + q(join(copy, 'scripts', 'strip-release.mjs')) + ' --out ' + q(copyRaw), { stdio: 'inherit' });

  console.log('smoke-packaged: GATE 1 from the committed tree');
  execSync(q(process.execPath) + ' ' + q(join(root, 'scripts', 'strip-release.mjs')) + ' --check ' + q(copyRaw), { stdio: 'inherit' });

  console.log('smoke-packaged: GATE 2 — the suite over the packaged tree (this takes as long as the suite)');
  const r = spawnSync(process.execPath, [join(copy, 'scripts', 'smoke-test.mjs')], {
    cwd: copy,
    env: { ...process.env, SPIXI_PACKAGED_FROM: join(root, 'Spixi', 'Resources', 'Raw', 'html') },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const lines = (r.stdout || '').trim().split('\n');
  const reds = lines.filter((l) => /✗/.test(l));
  console.log(reds.map((l) => '  ' + l.slice(0, 220)).join('\n'));
  const verdict = lines.reverse().find((l) => /BASELINE OK|smoke test CLEAN/.test(l));
  console.log('smoke-packaged: ' + (verdict || '(no verdict line — see FAILED below)'));
  if (r.stderr && r.status !== 0) console.error(r.stderr.trim().split('\n').slice(-12).join('\n'));
  if (r.status !== 0) { console.error('smoke-packaged: GATE 2 FAILED — the packaged tree does not pass the suite'); process.exit(1); }
  console.log('smoke-packaged: GATE 2 OK — the packaged tree passes the suite');
} finally {
  if (keep) console.log('smoke-packaged: copy kept at ' + tmp);
  else rmSync(tmp, { recursive: true, force: true });
}

/* ═══════════════════════ ★ perflean — GATE 2 over a LEAN package ═══════════════════════ */

// (an import declaration is hoisted: these three are bound before the branch at the top runs)
import { lstatSync, unlinkSync, rmdirSync } from 'node:fs';

/** #46 r2 C-5: a lean run takes exactly --lean-css / --lean-js and --keep; any other `--lean…` (a typo such as
 *  --lean-jss, which ran css only) or any other argument in a lean run is a usage error — reported BEFORE anything is
 *  copied. → true when the run must stop with exit 2 (the line is printed here). */
function leanArgsProblem(argv) {
  const bad = argv.filter((a) => !(a === '--lean-css' || a === '--lean-js' || a === '--keep'));
  if (!bad.length) return false;
  console.error('smoke-packaged: unknown argument(s) in a lean run: ' + bad.map((a) => JSON.stringify(a)).join(' ') + '\nusage: node scripts/smoke-packaged.mjs [--lean-css] [--lean-js] [--keep]');
  return true;
}

/** The KNOWN pre-existers of the copy's suite, read from its source (the array literal at its end). */
function knownPreexisters(smokeSrc) {
  const a = smokeSrc.indexOf('const KNOWN_PREEXISTERS = [');
  const b = a < 0 ? -1 : smokeSrc.indexOf('];', a);
  if (a < 0 || b < 0) throw new Error('smoke-packaged: KNOWN_PREEXISTERS not found in smoke-test.mjs');
  const body = smokeSrc.slice(a, b).replace(/\/\*[\s\S]*?\*\//g, '');
  return [...body.matchAll(/'((?:\\.|[^'\\])*)'/g)].map((m) => m[1].replace(/\\(.)/g, '$1'));
}

/** Judge a lean suite run by its row lists. → { ok, lines[], passes, byDesign, known, summary }
 *
 *  ★ #46 r1 C-1 — THE SUMMARY IS A WHOLE LINE IN THE SUITE'S OWN FORMAT (scripts/smoke-test.mjs, its last lines), never
 *  a phrase anywhere in the output: three always-green row labels hold "BASELINE OK" (smoke-test.mjs:20269, 30579, 31234),
 *  so a test of the whole stdout judged a suite that died after the last listed row as finished. The suite ends in
 *  exactly one of four ways, each printed after its last row and followed only by process.exit:
 *    'baseline'  the LAST non-empty stdout line is  `BASELINE OK — <n> pass / the <k> KNOWN pre-exister(s): …`  (exit 0)
 *    'clean'     the LAST non-empty stdout line is exactly  `smoke test CLEAN`                                (exit 0)
 *    'failed'    stderr holds the line  `FAILED:`  exactly once, after an empty line (the '\nFAILED:\n' block)     (exit 1)
 *    'absent'    no FAILED block, and a stderr line that starts  `KNOWN pre-exister(s) ABSENT — `  after an empty line (exit 1)
 *  A row line (`  ✓ …` / `  ✗ …`) can never be one of them. The summary must also AGREE with the rows: 'baseline' →
 *  the ✓ count is <n> and no ✗ row outside the KNOWN set; 'clean' → no ✗ row; 'failed' → every ✗ row outside the KNOWN
 *  set is a line of the FAILED block; 'absent' → no ✗ row outside the KNOWN set. What this proves: the suite reached the
 *  summary code after its LAST registration (the summary is printed only there), and the summary belongs to these rows.
 *  The exit status, the signal and a spawn error of the suite process are judged by leanVerdict (below). */
function judgeLean({ stdout, stderr, known, expected, flags }) {
  const out = String(stdout || '').split('\n');
  const reds = out.filter((l) => /^\s*✗ /.test(l)).map((l) => l.replace(/^\s*✗ /, ''));
  const passes = out.filter((l) => /^\s*✓ /.test(l)).length;
  // failures the suite pushes without a row (a PAGE ERROR, …) are listed only in its FAILED block
  const err = String(stderr || '').split('\n');
  const fbAll = [];
  for (let k = 0; k < err.length; k++) if (err[k] === 'FAILED:' && (k === 0 || err[k - 1] === '')) fbAll.push(k);
  const fb = fbAll.length === 1 ? fbAll[0] : -1;
  let ab = -1;
  for (let k = fb >= 0 ? fb + 1 : 0; k < err.length && ab < 0; k++) if (err[k].startsWith('KNOWN pre-exister(s) ABSENT — ') && (k === 0 || err[k - 1] === '')) ab = k;
  let last = out.length - 1;
  while (last >= 0 && out[last].trim() === '') last--;
  const tail = last >= 0 ? out[last] : '';
  const bm = /^BASELINE OK — (\d+) pass \/ the (\d+) KNOWN pre-exister\(s\): /.exec(tail);
  const outSum = bm ? 'baseline' : tail === 'smoke test CLEAN' ? 'clean' : null;
  const errSum = fb >= 0 ? 'failed' : ab >= 0 ? 'absent' : null;
  // #46 r2 C-6: the block is EVERY non-empty line from `FAILED:` to the end of stderr (smoke-test.mjs prints nothing
  // after it but its own trailer: an empty line, `KNOWN pre-exister(s) ABSENT — silently fixed? Update KNOWN_PREEXISTERS:`
  // and `  ~ <name>` lines, then process.exit). A trailer line is matched by its fixed start; any other line after the
  // ABSENT header is an UNKNOWN line → not ok. Before, the block ended at the first empty line, so a row-less failure
  // printed after an empty line was never judged.
  const block = [], unknownTail = [];
  const from = fb >= 0 ? fb + 1 : ab >= 0 ? ab : err.length;
  let inAbsent = false;
  for (let k = from; k < err.length; k++) {
    const l = err[k];
    if (l === '') continue;
    if (k === ab) { inAbsent = true; continue; }
    if (inAbsent) { if (!l.startsWith('  ~ ')) unknownTail.push(l); continue; }
    block.push(l);
  }
  const extra = block.filter((b) => !reds.some((r) => r.startsWith(b) || b.startsWith(r)));
  const lines = [];
  let ok = true;
  let summary = null;
  if (fbAll.length > 1) { ok = false; lines.push('the suite\'s FAILED: line appears ' + fbAll.length + ' times in stderr — not one summary'); }
  else if (outSum && errSum) { ok = false; lines.push('two summaries: stdout ends with "' + tail.slice(0, 60) + '" and stderr holds the ' + errSum + ' block'); }
  else summary = outSum || errSum;
  if (!summary && ok) { ok = false; lines.push('the suite did not reach its summary (crashed?) — stderr tail: ' + err.slice(-6).join(' · ')); }
  const knownRows = reds.filter((r) => known.some((k) => r.includes(k)));
  const otherReds = reds.filter((r) => !knownRows.includes(r));
  if (summary === 'baseline' && (Number(bm[1]) !== passes || otherReds.length)) { ok = false; lines.push('the BASELINE OK line does not belong to these rows: it says ' + bm[1] + ' pass, the run shows ' + passes + ' ✓ rows and ' + otherReds.length + ' red row(s) outside the KNOWN set'); }
  if (summary === 'clean' && reds.length) { ok = false; lines.push('"smoke test CLEAN" with ' + reds.length + ' red row(s)'); }
  if (summary === 'absent' && otherReds.length) { ok = false; lines.push('the ABSENT block without a FAILED block, but ' + otherReds.length + ' red row(s) outside the KNOWN set'); }
  if (unknownTail.length) { ok = false; lines.push('unknown line(s) after the suite\'s ABSENT block (' + unknownTail.length + '): ' + unknownTail[0].slice(0, 160)); }
  if (summary === 'failed') { const miss = otherReds.filter((r) => !block.includes(r)); if (miss.length) { ok = false; lines.push('the FAILED block does not list ' + miss.length + ' red row(s) of this run (not its summary?): ' + miss[0].slice(0, 160)); } }
  const missingKnown = known.filter((k) => !reds.some((r) => r.includes(k)));
  const entries = [];
  for (const f of ['copy', ...flags]) for (const e of expected[f] || []) if (!entries.some((x) => x.match === e.match)) entries.push({ ...e, flag: f, hits: 0 });
  const unexpected = [];
  const byDesign = [];
  for (const r of [...otherReds, ...extra]) {
    const m = entries.filter((e) => r.startsWith(e.match));
    if (m.length === 1) { m[0].hits++; byDesign.push('[' + m[0].flag + '] ' + r.slice(0, 200) + '  — ' + m[0].reason); }
    else unexpected.push((m.length > 1 ? '(matches ' + m.length + ' expected entries) ' : '') + r.slice(0, 220));
  }
  const stale = entries.filter((e) => e.hits !== (e.count || 1));
  lines.push('red by design (' + byDesign.length + '):'); for (const x of byDesign) lines.push('  ✗ ' + x);
  lines.push('the KNOWN pre-existers (' + knownRows.length + '):'); for (const x of knownRows) lines.push('  ✗ ' + x.slice(0, 200));
  if (unexpected.length) { ok = false; lines.push('UNEXPECTED red (' + unexpected.length + '):'); for (const x of unexpected) lines.push('  ✗ ' + x); }
  if (stale.length) { ok = false; lines.push('EXPECTED but not red the expected number of times (' + stale.length + '):'); for (const e of stale) lines.push('  ~ [' + e.flag + '] ' + e.match + ' (red ' + e.hits + ', expected ' + (e.count || 1) + ')'); }
  if (missingKnown.length) { ok = false; lines.push('KNOWN pre-exister(s) ABSENT:'); for (const k of missingKnown) lines.push('  ~ ' + k); }
  return { ok, lines, passes, byDesign: byDesign.length, known: knownRows.length, summary };
}

/** The DECISION of the lean GATE 2 (#46 r1 C-1), pure: no I/O, no name from outside (a pin cuts it out of this file).
 *  judge = judgeLean's result · fBad = the number of Session F copies ≢ the shipped transform · xcStatus = the exit
 *  status of the parser cross-check · suite = { status, signal, error } of the suite's spawnSync.
 *  → { ok, fails: [reason, …] }. The suite's own exits are 0 (BASELINE OK / CLEAN) and 1 (the FAILED or ABSENT block —
 *  the normal end of a lean run, whose listed rows are red BY DESIGN); an uncaught throw exits 1 as well, which is why the
 *  summary of judgeLean decides between "red rows" and "crash", and the status must AGREE with it. Any other status, a
 *  signal (killed, out of memory, maxBuffer) or a spawn error is a failure whatever the rows say. */
function leanVerdict({ judge, fBad, xcStatus, suite }) {
  const fails = [];
  const s = suite || {};
  const j = judge || {};
  if (j.ok !== true) fails.push('the red rows are not the expected set, or the suite did not reach its summary');
  if (fBad !== 0) fails.push((Number.isInteger(fBad) ? fBad : String(fBad)) + ' Session F copy(ies) ≢ the shipped transform of the source');
  if (xcStatus !== 0) fails.push('the parser cross-check failed (exit status ' + String(xcStatus) + ')');
  if (s.error) fails.push('the suite process failed: ' + String(s.error && s.error.message ? s.error.message : s.error));
  if (s.signal) fails.push('the suite was stopped by the signal ' + String(s.signal));
  const want = j.summary === 'baseline' || j.summary === 'clean' ? 0 : j.summary === 'failed' || j.summary === 'absent' ? 1 : null;
  if (s.status !== 0 && s.status !== 1) fails.push('the suite exited with status ' + String(s.status) + ' (its own exits are 0 and 1)');
  else if (want !== null && s.status !== want) fails.push('the suite exited with status ' + s.status + ', but its summary "' + j.summary + '" exits ' + want);
  return { ok: fails.length === 0, fails };
}

/** Remove the links the lean run made (node_modules, local-nuget, the Ixian-Core sibling): the LINK itself, never
 *  through it. A path that is no longer a link is left alone and reported. → the paths that are still there. */
function removeLinks(paths) {
  const stuck = [];
  for (const p of paths) {
    let st;
    try { st = lstatSync(p); } catch (e) { if (e && e.code === 'ENOENT') continue; stuck.push(p + ' (' + (e && e.code) + ')'); continue; }
    if (!st.isSymbolicLink()) { stuck.push(p + ' (not a link any more — left alone)'); continue; }   // a Windows junction is a link to lstat too
    try { unlinkSync(p); }                                       // POSIX symlink; on Windows libuv removes a directory link / junction here
    catch (e1) { try { rmdirSync(p); } catch (e2) { stuck.push(p + ' (' + (e2 && e2.code ? e2.code : e1 && e1.code) + ')'); continue; } }   // rmdir of a junction removes the junction, not its target
    try { lstatSync(p); stuck.push(p + ' (still there after the unlink)'); } catch (e) { if (!e || e.code !== 'ENOENT') stuck.push(p + ' (' + (e && e.code) + ')'); }
  }
  return stuck;
}

async function leanGate2() {
  const flagsArg = LEAN_FLAGS;
  const flags = flagsArg.map((f) => f.replace('--lean-', ''));
  const label = flags.join(',');
  const tmp = mkdtempSync(join(tmpdir(), 'spixi-packaged-'));
  const copy = join(tmp, 'Spixi');
  const rootRaw = join(root, 'Spixi', 'Resources', 'Raw', 'html');
  const fa = flagsArg.map((f) => ' ' + f).join('');
  const links = [];
  // #46 r1 (S / C "not proven"): every link is recorded BEFORE it is made, and removed by itself before the temp folder
  const link = (target, at) => { links.push(at); symlinkSync(target, at, 'junction'); };
  let verdict = null;   // set ONLY by leanVerdict; the exit code is computed from it in ONE place below
  try {
    console.log('smoke-packaged: LEAN ' + label + ' — copying the tree → ' + copy);
    mkdirSync(copy, { recursive: true });
    cpSync(root, copy, { recursive: true, filter: (p) => !/[\\/](?:\.git|node_modules|obj|bin|local-nuget|_to_delete)(?:[\\/]|$)/.test(p.slice(root.length)) });
    if (existsSync(join(root, 'node_modules'))) link(join(root, 'node_modules'), join(copy, 'node_modules'));
    if (existsSync(join(root, 'local-nuget'))) link(join(root, 'local-nuget'), join(copy, 'local-nuget'));
    // the Ixian-Core sibling (a link, never a copy: nothing in the suite writes there). Three rows read Core files through
    // root/../Ixian-Core (#1101 F-1b, A10, S14) and are red in a copy without it — in the plain run above too.
    if (existsSync(join(root, '..', 'Ixian-Core'))) link(join(root, '..', 'Ixian-Core'), join(tmp, 'Ixian-Core'));
    const copyRaw = join(copy, 'Spixi', 'Resources', 'Raw', 'html');

    console.log('smoke-packaged: stripping the copy in place with' + fa + ' (the package)');
    execSync(JSON.stringify(process.execPath) + ' ' + JSON.stringify(join(copy, 'scripts', 'strip-release.mjs')) + ' --out ' + JSON.stringify(copyRaw) + ' --in-place' + fa, { stdio: 'inherit' });   // the temp COPY, stripped in place (#46 r2 S-2)

    console.log('smoke-packaged: GATE 1 from the committed tree with' + fa);
    execSync(JSON.stringify(process.execPath) + ' ' + JSON.stringify(join(root, 'scripts', 'strip-release.mjs')) + ' --check ' + JSON.stringify(copyRaw) + fa, { stdio: 'inherit' });

    // the Session F rows (smoke-test.mjs, the COPIES table): built ≡ the SHIPPED transform of the source
    console.log('smoke-packaged: the Session F copies, re-checked with the shipped transform');
    const L = await import(new URL('./lib/lean-strip.mjs', import.meta.url));
    const COPIES = [
      ['src/styles/tokens.css', 'spixi.tokens.css', 'css'],
      ['src/styles/chat-pattern.css', 'spixi.chat-pattern.css', 'css'],
      ['src/components/icons.iife.js', 'spixi.icons.js', 'js'],
      ['src/demo/spixi.iife.js', 'spixi.bundle.js', 'js'],
      ['src/demo/strings.iife.js', 'spixi.strings.js', 'js'],
    ];
    let fBad = 0;
    for (const [src, built, kind] of COPIES) {
      if (!flags.includes(kind)) continue;
      const s = readFileSync(join(root, src), 'utf8'), b = readFileSync(join(copyRaw, built), 'utf8');
      let same = false, why = '';
      try { same = (kind === 'js' ? L.stripJsComments(s, { keepLines: true, file: built }) : L.stripCssLean(s, { file: built })) === b; } catch (e) { why = ' — ' + e.message; }
      if (!same) fBad++;
      console.log((same ? '  ✓ ' : '  ✗ ') + 'lean Session F: the BUILT ' + built + ' ≡ ' + (kind === 'js' ? 'stripJsComments(' + src.split('/').pop() + ', { keepLines: true })' : 'stripCssLean(' + src.split('/').pop() + ')') + why);
    }

    console.log('smoke-packaged: the parser cross-check (acorn + jsdom) over the package');
    const xc = spawnSync(process.execPath, [join(root, 'scripts', 'pins-perflean', 'x-parser-crosscheck.mjs'), '--committed', rootRaw, '--packaged', copyRaw, ...flagsArg], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    process.stdout.write(xc.stdout || '');
    if (xc.stderr) process.stderr.write(xc.stderr);

    console.log('smoke-packaged: GATE 2 — the suite over the LEAN package (SPIXI_PACKAGED_LEAN=' + label + '; this takes as long as the suite)');
    const r = spawnSync(process.execPath, [join(copy, 'scripts', 'smoke-test.mjs')], {
      cwd: copy,
      env: { ...process.env, SPIXI_PACKAGED_FROM: rootRaw, SPIXI_PACKAGED_LEAN: label },
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const expected = JSON.parse(readFileSync(join(root, 'scripts', 'pins-perflean', 'lean-expected-reds.json'), 'utf8'));
    const known = knownPreexisters(readFileSync(join(copy, 'scripts', 'smoke-test.mjs'), 'utf8'));
    const j = judgeLean({ stdout: r.stdout, stderr: r.stderr, known, expected, flags });
    console.log(j.lines.join('\n'));
    const v = leanVerdict({ judge: j, fBad, xcStatus: xc.status, suite: { status: r.status, signal: r.signal, error: r.error } });
    verdict = v;
    if (!v.ok) console.error('smoke-packaged: GATE 2 FAILED (lean ' + label + ') — ' + v.fails.join(' · '));
    else console.log('smoke-packaged: GATE 2 OK (lean ' + label + ') — ' + j.passes + ' pass · ' + j.byDesign + ' red by design (listed) · the ' + j.known + ' KNOWN · suite exit ' + r.status + ' (' + j.summary + ')');
  } catch (e) {
    console.error('smoke-packaged: GATE 2 FAILED (lean ' + label + ') — ' + String(e && e.message ? e.message : e).split('\n')[0]);
  }
  // #46 r2 S-3: the three links go in EVERY path (also with --keep, a failed run, the catch path) — the link itself,
  // never through it; only then the temp folder (unless --keep, or a link could not be removed)
  const stuck = removeLinks(links);
  if (stuck.length) console.error('smoke-packaged: a link could not be removed — ' + stuck.join(' · ') + '\nsmoke-packaged: the temp folder is NOT deleted (a recursive delete could reach the real tree through the link); remove it by hand: ' + tmp);
  else if (keep) console.log('smoke-packaged: copy kept at ' + tmp + ' (the links to node_modules, local-nuget and Ixian-Core were removed; the kept copy holds files only)');
  else rmSync(tmp, { recursive: true, force: true });
  // #46 r2 C-5: the ONE place that computes the exit code of a lean run
  const code = verdict && verdict.ok === true && stuck.length === 0 ? 0 : 1;
  return code;
}
