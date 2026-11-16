/* ==== perflean unit D — the lean packaging switches of Spixi/Spixi.csproj, EVALUATED (P-06 / P-07, contract perflean § 3.5).
 *
 * The always-on twin of scripts/pins-perflean/msbuild-harness/run.mjs. The harness runs REAL MSBuild (needs dotnet, run by
 * the lead, not part of the smoke or of CI). This pin needs no dotnet: it reads the csproj as TEXT (XML comments stripped
 * first: the comments name the same targets) and EVALUATES it with a small evaluator copied in shape from
 * scripts/pins-s15/d-build.mjs (expand / evalCond / the file-order PropertyGroup walk, command-line properties win), extended
 * for what these targets use: `==` `!=` `and` `or` `!` parentheses `'$(X)'`, `$(X.Trim())`, `$(X.Contains('…'))`, the two
 * path functions `$([MSBuild]::NormalizeDirectory(…))` / `NormalizePath(…)` (arguments in '…' or `…`; modelled as Linux
 * Path.Combine + GetFullPath: an empty part is skipped, a rooted part restarts, `.` / `..` resolve; the project folder is
 * /p/Spixi), `Exists(…)` OF THE STAMP ONLY (a model disk of stamp files), the target Condition / DependsOnTargets /
 * BeforeTargets, the Error Conditions, the PropertyGroups INSIDE the targets, ReadLinesFromFile (lines trimmed, empty lines
 * dropped, joined with `;` — probed with dotnet msbuild 10.0.115) and WriteLinesToFile (recorded). Any syntax the evaluator
 * does not know THROWS (a pin failure), never reads as false. Conditions that need MSBuild items or other files (`@(…)`,
 * `Exists(…)` of anything but the stamp, the `_SpixiLean…` counts of the swap) are NOT evaluated; the structural belt
 * (rows 7–8) pins them by exact text and position.
 *
 * `==` / `!=` FOLLOW MSBUILD, not plain string equality. Verified with `dotnet msbuild` 10.0.115 (Linux), probes of fixer-f3
 * (perflean): a bare <Project> with one <Target> and one `<Message Condition="'$(V)' == 'X'" …/>` per value pair, the value
 * passed both as `-p:V=<value>` and as a project property (same result each time); one call:
 *   dotnet msbuild p.proj -nologo -v:m -t:P -p:V0=true -p:V1=yes …
 * the rule, in this order:
 *   1 BOTH operands boolean-looking → compared AS BOOLEANS. Boolean-looking (any letter case): true, yes, on = TRUE;
 *     false, no, off = FALSE; ONE leading `!` negates (!false = !no = !off = TRUE, !true = !yes = !on = FALSE).
 *     NOT boolean-looking: '' (empty), ' true' / 'true ' (a space), '!!true', '! true', '!', 'y', 'tru', 1, 0.
 *   2 else BOTH operands numbers → compared as numbers: decimal with an optional sign and point (1 == 1.0 == 01 == +1,
 *     .5 == 0.5, 1. == 1, -1 == -1.0) or hex (0x10 == 0X10 == 16). Not numbers: '1e0' (≠ '1'), '1,000' (≠ '1000').
 *   3 else ordinal, case-insensitive string equality (Release == release; tru == tru; '' == '').
 *   probe table (== 'true' · == 'false' · != 'true'): true/TRUE/True/yes/YES/on/On/!false/!no  T · f · f
 *     no/off/false/FALSE/!true/!yes/!on  f · T · T     1/0/tru/2/''/' true'/'true '/'y'/'!'  f · f · T
 *     and 'yes' == 'on', 'no' == 'off', '!false' == '!no' are TRUE; '1' == 'true', 'yes' == '1', '!1' == 'false' are false.
 *   So for these switches: true / yes / on (any case, or a negated false word) = ON, false / no / off = OFF, and every
 *   other value — '1', '2', 'tru', an EMPTY `-p:<name>=` (a global property: the default `false` cannot replace it) — is
 *   refused by the guard's "is not true or false" Error (also observed in the msbuild harness, scenarios yesjs / nojs / typojs).
 *   The evaluator below implements rules 1–3 (rule 2 only for the two verified number shapes; any other shape is a string).
 *
 * #46 perflean round 1 (fix-builder X4) — what the rows now also hold: D-1 the STAMP (<obj>/spixi-lean.stamp: written by a
 * passing lean build with the EVALUATED switches; a different stamp stops a lean build in the guard, any stamp stops an
 * all-off build in SpixiLeanStaleGuard; both before node) · S-3 a store build (SpixiStoreRelease) refuses every lean switch ·
 * D-4 no lean target and no lean Error in a design-time build (DesignTimeBuild) · D-5 an IntermediateOutputPath that is
 * empty, white space or the project folder after normalization (., ./, obj/../) is refused · D-2 a STRUCTURAL BELT the
 * evaluator cannot give: the exact open tag of each lean target, the exact ordered element list of each lean target (every
 * element with its full attribute set and its text; an added ContinueOnError / Inputs / Outputs, a changed Condition, an
 * extra task = red), no Import / UsingTask beside the lean blocks and only the known Import in the file, and no MSBuild file
 * of the tree (Directory.Build.props / .targets / .rsp, Directory.Packages.props, *.props, *.targets, *.rsp, *.user) and of
 * the folders above it that sets a lean property.
 *
 * THE MATRICES (row 6): A = Configuration {Debug, Release} × SpixiStripHtml {unset, false, true} × SpixiLeanCss {unset, false,
 * true, True, 1, on, OFF, ''} × SpixiLeanJs {unset, false, true, yes, no, tru, 2, !false} × SpixiLeanCssFull {unset, true, no}
 * × SpixiStoreRelease {unset, true, 1, 'true '} × SpixiDevCoexist {unset, true, yes, false, 1, 'true '}; C = Configuration ×
 * SpixiStripHtml × SpixiLeanCss {unset, true, 1} × SpixiLeanJs {unset, true, no} × SpixiLeanCssFull {unset, true} ×
 * SpixiStoreRelease {unset, true} × SpixiDevCoexist {unset, true} × DesignTimeBuild {unset, true} × IntermediateOutputPath
 * {obj/…/, '', ' ', '.', 'obj/../', '/elsewhere/obj/'}; both with no stamp; B = Configuration × SpixiStripHtml × SpixiLeanCss
 * {unset, true, yes, 1} × SpixiLeanJs {unset, true, no, tru} × SpixiLeanCssFull {unset, true} × SpixiStoreRelease {unset, true}
 * × SpixiDevCoexist {unset, true} × DesignTimeBuild {unset, true} × IntermediateOutputPath {obj/…/, '.', ''} × the stamp
 * {css+js, css, js, 'garbage', empty file — each in THIS obj folder —, a stamp in another obj folder}. Each build runs the
 * targets that hook PrepareForBuild in FILE order the way MSBuild does (Condition first; then DependsOnTargets; then the
 * body; the first Error stops the build), and its outcome is compared with an independent written-out rule of the batch
 * (the `spec` function below: word lists and a table of the IntermediateOutputPath values, not the evaluator).
 * Rule of the batch pinned in rows 1–2: all three properties off = today's packaging: the guard and the lean target do not
 * run, the stale guard runs and only reads (no stamp = nothing), and the tokens-only target is as before (row 3: three
 * hard-coded lines + its element list = a "nothing moved" belt; the expected text was copied from the csproj the builder
 * delivered, not derived from it).
 *
 * WHAT THIS PIN CANNOT PROVE: it does not run MSBuild. It does not prove that `NormalizeDirectory` on Windows, `RemoveDir`,
 * the glob, `MatchOnMetadata`, `@(…->Count())`, the `Subtract` function, ReadLinesFromFile / WriteLinesToFile on a real
 * disk behave as the targets assume, that the Windows quoting trap is really avoided, that no asset is doubled or lost, or
 * that the run-time Errors fire; the harness (run.mjs, fake and --real modes, with dotnet) proves those on Linux. Item /
 * disk conditions are checked as TEXT in a fixed order, not executed. A file above the repo folder that MSBuild imports
 * (Directory.Build.* of a parent folder) is checked only where the pin runs. An environment variable is never checked
 * (MSBuild reads one as a property; that is accepted dial 9 of the brief) — the store refusal (S-3) covers the store build.
 *
 * Deliberate breaks (project rule #802, run by pins-d in scratch copies; each failed the row named): see the report table in
 * the perflean batch status; the list is M1 RemoveDir removed · M1b RemoveDir after Exec · M2 lean Condition and→or ·
 * M3 DirectorySeparatorChar dropped · M4 guard SpixiStripHtml Error removed / Condition false · M5 SpixiLeanJs default true ·
 * M6 MatchOnMetadata dropped · M7 the "." before &quot; dropped · M8 SpixiLeanCssFull Error removed · M9 js must-write
 * Condition flipped · M10 orphan Error removed · M11 removed-count Error removed · M12 lean before strip · M12b strip dropped
 * from DependsOnTargets · M13 --lean-js→--lean-j · M14 guard Condition narrowed · M15 tokens-only Condition changed ·
 * M16 a later PropertyGroup sets SpixiLeanCss true · M17 SpixiLeanHtmlDir at body level · M18 empty-IntermediateOutputPath
 * Error removed. fixer-f3 (the MSBuild boolean rule + the guard's IntermediateOutputPath Error): F1 the guard's
 * IntermediateOutputPath Error removed · F2 that Error moved FIRST in the guard · F3 the model treats `yes` as not-true.
 * fix-builder X4 (#46 round 1): the kill table of the batch report (the reviewer's 9 survivors + the new mechanisms).
 * fix-builder X4 (#46 round 2): r2 S-1 a lean build must be a DEV build (`'$(SpixiDevCoexist)' != 'true'` = the negation of the app-id test
 * of the csproj) and a set SpixiStoreRelease / SpixiDevCoexist that is not a boolean word is refused (rows 4–8); r2 D-1 the belt OUTSIDE the
 * lean targets (row 11: no spixi-lean / .stamp elsewhere, the assignment sites of every watched property, no TreatAsLocalProperty; row 3:
 * the FULL text of the tokens-only block and of the store gate); r2 D-3 the folders above the repo fail only on a file that sets or passes
 * a watched property; r2 D-5 the evaluator unescapes %XX and lets a target-level PropertyGroup override a global property (both probed with
 * dotnet msbuild 10.0.115). Kill table in the batch report.
 * fix-builder X5 (#46 round 3, r3B-3 / r3S-1): a lean package is ANDROID only before the ruling of the lean defaults. SpixiDevCoexist=true
 * moves the app id only when TargetFramework contains -android (Spixi.csproj line 41), so on iOS, Mac Catalyst and Windows the dev-build
 * test alone let a lean package carry the production id. The guard has ONE more Error, `!$(TargetFramework.Contains('-android'))`, after the
 * dev-build Error and before the strip Error. The model: TargetFramework is a global like the others (R and D carry net10.0-android; the matrices
 * A, B, C start from it; the matrix E varies it over {unset, '', android, android35.0, ios, maccatalyst, windows}); the rule `spec` knows the
 * cause 'not-android'; row 7 pins the Condition in the list and as the negation of the app-id test; row 8 pins the element in the belt.
 * fix-builder X5 (#46 round 4, r4 B-1): the guard tests the FINAL SpixiDevCoexist / TargetFramework at target time, but the app id is decided when the
 * project file is read. The guard has ONE more Error, `'$(ApplicationId)' != 'com.ixilabs.spixi.dev'` (the guarantee itself), after the Android Error.
 * The model: ApplicationId is evaluated from the csproj's own lines (WATCH), a global ApplicationId wins, and `LateDev` = a SpixiDevCoexist set by a file
 * imported AFTER the body (.csproj.user, Directory.Build.targets): it changes the final value the guard sees, not the app id (matrix F: Configuration ×
 * LateDev × SpixiDevCoexist × ApplicationId × TargetFramework × SpixiStoreRelease …); the invariant is "no lean build whose ApplicationId is not
 * com.ixilabs.spixi.dev"; the rule `spec` derives the id by its own table; row 7 pins the Condition; row 8 the element; row 11 also scans the tree for a file
 * that sets SpixiDevCoexist or ApplicationId.
 * fix-builder X5 (the PARK of P-07, Damir 2026-11-15, DECISIONS 1583 / 1589): SpixiLeanJs on is refused by the guard (`'$(SpixiLeanJs)' != 'false'`), right after the
 * CssFull Error: the cause 'js-parked' stands between 'full' and 'store-word' in the order of `spec`, the invariant is "every lean build is css-only, Android, dev id",
 * rows 4 / 5 hold the js / both builds as refusals, row 7 pins the Condition, row 8 the element. The JS strip code, its pins (rows 12–29) and the script flag stay.
 * KNOWN DIFFERENCES of the evaluator from MSBuild (each on the safe side or on input no row uses): a `\` in a path is a plain character
 * here (MSBuild on Linux reads `obj\..\` as a path; the model does not refuse it, MSBuild does); white space that .NET and JavaScript
 * trim differently (U+00A0, U+2028 at the ends of a stamp line); `Exists(…)` of any file but the stamp is not evaluated; items, the swap
 * counts and task failures are not modelled (the harness proves those).
 *
 * ROWS 12–29 — the JUDGE, the VERDICT and the WIRING of the lean GATE 2 (scripts/smoke-packaged.mjs: knownPreexisters + judgeLean + leanVerdict + removeLinks + leanGate2, and the file
 * scripts/pins-perflean/lean-expected-reds.json that feeds it). Not about the csproj: about the verdict of a 45-minute run.
 * smoke-packaged.mjs runs on import, so the two functions are cut out of its SOURCE TEXT (head to the closing brace at column 0)
 * and built with `new Function` over a Proxy scope that records every free name (only ECMAScript built-ins are allowed: a function
 * that starts to use an outer name FAILS here). Each row feeds synthetic suite output (✓ / ✗ rows, the FAILED: block, the
 * BASELINE OK summary) and asserts the verdict. Packaged-run aware like pins-perflean/a-gates: with SPIXI_PACKAGED_FROM set
 * the script, the JSON and the anchor files are read from the COMMITTED tree it names.
 * THE REAL SHAPE of a lean run (scripts/smoke-test.mjs, its last lines): every row is printed on stdout (`  ✓ …` / `  ✗ …`); the end is ONE of
 * `BASELINE OK — <n> pass / the <k> KNOWN pre-exister(s): …` (stdout, last line, exit 0) · `smoke test CLEAN` (stdout, last line, exit 0) · `FAILED:` after an
 * empty line + one failure per line (stderr, exit 1) · `KNOWN pre-exister(s) ABSENT — …` after an empty line (stderr, exit 1). A lean run ends in the FAILED
 * block (its by-design rows are red); BASELINE OK exists only with no expected entry. The synthetic streams of rows 12–29 are built in that shape.
 * (#46 r2) The FAILED block runs to the END of stderr (a row-less failure after an empty line is judged); the ABSENT header and its `  ~ ` lines are a trailer; any other line after the header is not ok.
 *   12 the exact expected set passes (real JSON, both flags; the real FAILED-block shape; the BASELINE end only with nothing expected) · 13 an unexpected red row fails (and an
 *   ambiguous prefix) · 14 an expected entry not red the expected number of times fails (per entry, and `count`) · 15 a KNOWN
 *   pre-exister not red fails · 16 flag scoping (copy always, css / js per flag) · 17 no summary and no FAILED block = a crash ·
 *   18 a failure only in the stderr FAILED block is judged (also after an empty line; the ABSENT trailer; an unknown line after it) · 19 the JSON file (shape, reasons, no prefix overlap, every match
 *   anchored in a real row of smoke-test.mjs or scripts/pins-*) · 20 knownPreexisters (two strings, real rows, parser).
 *   (#46 r1 C-1 / C-3, rows 21–27:) 21 the crash that keeps the REAL labels (the three row labels of smoke-test.mjs that hold `BASELINE OK`) · 22 the normal
 *   end of a lean run, byDesign = the entries of copy + css + js · 23 line anchoring (`x FAILED:`, no empty line, twice, a ✓ row that spells the summary, a row after it,
 *   count / KNOWN / FAILED-block agreement, both streams, `includes` ≠ `startsWith`) · 24 leanVerdict (pure; every input alone) · 25 removeLinks (a link goes, its
 *   target stays; a real directory is left alone) · 26 leanGate2 WIRING by behaviour: a fake tree around the REAL smoke-packaged.mjs (fake strip-release / lean-strip /
 *   cross-check / suite that log ONE JSON line per call — args compared as arrays, so a path with spaces is fine) — the calls and their order, the flags, `--in-place` in the
 *   copy's --out call, the suite env, each failure exit, a stuck link; the "suite killed by a signal" case is SKIPPED visibly on win32 (no signal there) · 27 a STRUCTURAL BELT (text):
 *   removeLinks once at function level after the try / catch, then stuck / keep / rmSync, the verdict's inputs, ONE code line, ONE return.
 *   (#46 r2, rows 28–29, same fake tree:) 28 smoke-packaged argument errors (exit 2, nothing started, no spixi-packaged-* folder) · 29 --keep and the exit code (the copy is kept,
 *   its three links are gone, the exit code does not depend on --keep, a stuck link wins over --keep).
 * Deliberate breaks of rows 12–29 (#802): see the batch report (the table: break → rows that failed). */
import { EXTERNAL_JS } from '../lib/lean-gates.mjs';
import { resolve as presolve, posix as pposix, dirname as pdirname } from 'node:path';
import { createHash } from 'node:crypto';

export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const raw = readFileSync(join(root, 'Spixi/Spixi.csproj'), 'utf8').replace(/^﻿/, '');
  const cs = raw.replace(/<!--[\s\S]*?-->/g, '');
  const T = '★ perflean P-06/P-07 packaging';

  /* ---------- the evaluator (shape of pins-s15/d-build.mjs) ---------- */
  const PROJ = '/p/Spixi';   // MSBuildProjectDirectory of the model
  const STAMP_NAME = 'spixi-lean.stamp';
  class RuntimeCond extends Error {}   // a condition that needs the real disk or items: not evaluated here (the belt pins its text)
  /* $([MSBuild]::NormalizeDirectory(…)) / NormalizePath(…): Linux Path.Combine + GetFullPath (empty part skipped, rooted part restarts, . / .. resolved) */
  const PFN = /\$\(\[MSBuild\]::(NormalizeDirectory|NormalizePath)\(((?:\s*(?:'[^']*'|`[^`]*`)\s*,?)*)\)\)/g;
  /* MSBuild keeps a property value escaped and unescapes %XX where it uses it (a Condition operand, a task parameter): %74rue = true, %2E = . */
  const unesc = (v) => (v || '').replace(/%([0-9A-Fa-f]{2})/g, (_, x) => String.fromCharCode(parseInt(x, 16)));
  const expandSimple = (s, P) => s
    .replace(/\$\((\w+)\.Contains\('([^']*)'\)\)/g, (_, k, v) => String(unesc(P[k]).includes(v)))
    .replace(/\$\((\w+)\.Trim\(\)\)/g, (_, k) => unesc(P[k]).trim())
    .replace(/\$\((\w+)\)/g, (_, k) => unesc(P[k]));
  const expand = (s, P) => {
    const out = expandSimple(s.replace(PFN, (_, fn, args) => {
      const parts = [...args.matchAll(/'([^']*)'|`([^`]*)`/g)].map((m) => expandSimple(m[1] !== undefined ? m[1] : m[2], P));
      let r = pposix.resolve(...parts.filter((x) => x !== ''));
      if (fn === 'NormalizeDirectory' && !r.endsWith('/')) r += '/';
      return r;
    }), P);
    if (/\$\(/.test(out)) throw new Error('unknown property function in: ' + s);
    return out;
  };
  /* MSBuild's comparison (rules 1–3 of the header, verified with dotnet msbuild 10.0.115) */
  const msBool = (s) => { let v = s.toLowerCase(), neg = false; if (v[0] === '!') { neg = true; v = v.slice(1); } return ['true', 'yes', 'on'].includes(v) ? !neg : ['false', 'no', 'off'].includes(v) ? neg : null; };
  const msNum = (s) => /^[+-]?(\d+\.?\d*|\.\d+)$/.test(s) ? parseFloat(s) : /^0x[0-9a-f]+$/i.test(s) ? parseInt(s.slice(2), 16) : null;
  const msEq = (a, b) => {
    const ba = msBool(a), bb = msBool(b); if (ba !== null && bb !== null) return ba === bb;
    const na = msNum(a), nb = msNum(b); if (na !== null && nb !== null) return na === nb;
    return a.toLowerCase() === b.toLowerCase();
  };
  /* Exists(…): the model disk holds stamp files only; any other path needs the real disk → RuntimeCond */
  const existsOn = (path, P) => { if (pposix.basename(path) !== STAMP_NAME) throw new RuntimeCond('Exists of ' + path); return P.__disk.has(path); };
  const TOKS = new Map();   // expanded condition → its tokens (the matrices repeat the same strings)
  const tokenize = (src, cond) => {
    if (TOKS.has(src)) return TOKS.get(src);
    const toks = [];
    const re = /\s*(?:'([^']*)'|(==|!=)|\b(Exists)\s*\(|(\(|\))|(!)|\b(and|or|true|false)\b)/iy;
    let i = 0;
    while (i < src.length) {
      if (/\s/.test(src[i])) { i++; continue; }
      re.lastIndex = i; const m = re.exec(src);
      if (!m) throw new Error('unknown condition syntax: ' + cond);
      toks.push(m[1] !== undefined ? { s: m[1] } : m[3] ? 'exists(' : (m[2] || m[4] || m[5] || m[6]).toLowerCase()); i = re.lastIndex;
    }
    TOKS.set(src, toks); return toks;
  };
  const evalCond = (cond, P) => {
    const toks = tokenize(expand(cond, P).replace(/&quot;/g, '"'), cond);
    let p = 0;
    const prim = () => {
      const t = toks[p++];
      if (t === '!') return !prim();
      if (t === 'exists(') { const a = toks[p++]; if (!a || a.s === undefined || toks[p++] !== ')') throw new Error('Exists: ' + cond); return existsOn(a.s, P); }
      if (t === '(') { const v = orE(); if (toks[p++] !== ')') throw new Error('paren: ' + cond); return v; }
      if (t === 'true' || t === 'false') return t === 'true';
      if (t && t.s !== undefined) {
        const op = toks[p];
        if (op === '==' || op === '!=') { p++; const r = toks[p++]; if (!r || r.s === undefined) throw new Error('rhs: ' + cond); const eq = msEq(t.s, r.s); return op === '==' ? eq : !eq; }
        if (msBool(t.s) !== null) return msBool(t.s);
      }
      throw new Error('unknown condition term in: ' + cond);
    };
    const andE = () => { let v = prim(); while (toks[p] === 'and') { p++; v = prim() && v; } return v; };
    const orE = () => { let v = andE(); while (toks[p] === 'or') { p++; v = andE() || v; } return v; };
    const v = orE(); if (p !== toks.length) throw new Error('trailing tokens: ' + cond); return v;
  };
  const safe = (f) => { try { return f(); } catch (e) { return 'THROW ' + e.message; } };

  /* top-level project body = everything outside the targets; evaluated PropertyGroups are those that set a watched property */
  const WATCH = ['SpixiDevCoexist', 'ApplicationId', 'DefineConstants', 'SpixiStripHtml', 'SpixiLeanCss', 'SpixiLeanCssFull', 'SpixiLeanJs', 'SpixiStoreRelease', 'DesignTimeBuild', 'IntermediateOutputPath'];
  const body = cs.replace(/<Target\b[\s\S]*?<\/Target>/g, '');
  const GROUPS = [...body.matchAll(/<PropertyGroup(?:\s+Condition="([^"]*)")?\s*>([\s\S]*?)<\/PropertyGroup>/g)]
    .map((g) => ({ cond: g[1], props: [...g[2].matchAll(/<(\w+)(?:\s+Condition="([^"]*)")?\s*>([^<]*)<\/\1>/g)].filter((x) => WATCH.includes(x[1])) })).filter((g) => g.props.length);
  const evaluate = (all) => {
    const { LateDev, ...globals } = all;   // LateDev: SpixiDevCoexist set by a file imported after the body (final for a target, too late for the ApplicationId line)
    const P = { Configuration: 'Debug', IntermediateOutputPath: 'obj/Release/net10.0-android/', MSBuildProjectDirectory: PROJ, ...globals };
    for (const { cond, props } of GROUPS) {
      if (cond && !evalCond(cond, P)) continue;
      for (const [, k, c, v] of props) { if (k in globals) continue; if (c && !evalCond(c, P)) continue; P[k] = expand(v, P); }
    }
    if (LateDev !== undefined && !('SpixiDevCoexist' in globals)) P.SpixiDevCoexist = LateDev;
    return P;
  };

  /* targets, as text */
  const ATTRS = '((?:\\s+[\\w.]+="[^"]*")+)';
  const parseAttrs = (s) => Object.fromEntries([...s.matchAll(/([\w.]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const targets = [...cs.matchAll(new RegExp('<Target\\b' + ATTRS + '\\s*>([\\s\\S]*?)<\\/Target>', 'g'))]
    .map((m) => ({ at: m.index, end: m.index + m[0].length, open: m[0].slice(0, m[0].indexOf('>') + 1), a: parseAttrs(m[1]), body: m[2], text: m[0] }));
  const tgt = (n) => targets.find((t) => t.a.Name === n);
  const BODY_EL = new RegExp('<Error\\b' + ATTRS + '\\s*\\/>|<PropertyGroup\\b[^>]*>([\\s\\S]*?)<\\/PropertyGroup>|<ReadLinesFromFile\\b' + ATTRS + '\\s*>([\\s\\S]*?)<\\/ReadLinesFromFile>|<WriteLinesToFile\\b' + ATTRS + '\\s*\\/>', 'g');
  for (const t of targets) t.els = [...t.body.matchAll(BODY_EL)];   // the evaluated elements of each body, in order (parsed once)
  const list = (s) => (s || '').split(';').map((x) => x.trim()).filter(Boolean);
  const RUNTIME = /@\(|\$\(_SpixiLean(Count|AssetsBefore|AssetsKept|Removed|AssetsAfter)\)/;   // item conditions and the swap counts: not evaluated, the belt pins them
  const TARGET_PROPS = /^(SpixiStripHtmlDir|SpixiStripScript|SpixiLeanHtmlDir|SpixiLeanScript|SpixiLeanFlags|_SpixiLeanStamp|_SpixiLeanState|_SpixiLeanStampWas)$/;
  const RUNTIME_PROPS = /^_SpixiLean(Count|AssetsBefore|AssetsKept|Removed|AssetsAfter)$/;
  const stampPath = (iop) => pposix.resolve(PROJ, ...[iop].filter((x) => x !== ''), STAMP_NAME);   // the obj folder's stamp (for the model disk; the spec does not use it)

  /* one build: the PrepareForBuild hooks in file order (BeforeTargets), MSBuild semantics: Condition, then DependsOnTargets, then the body; first Error stops */
  const causeOf = (text) =>
    /Spixi store-release gate/.test(text) ? 'gate'
    : /SpixiLeanJs \(the comment strip of the scripts, P-07\) is PARKED in this batch/.test(text) ? 'js-parked'
    : /a store build \(SpixiStoreRelease=.*\) cannot be lean before the ruling of the lean defaults/.test(text) ? 'store'
    : /SpixiStoreRelease='.*' is not true or false, and a lean build needs a clear answer/.test(text) ? 'store-word'
    : /SpixiDevCoexist='.*' is not true or false, and a lean build needs a clear answer/.test(text) ? 'dev-word'
    : /a lean package is allowed only in a dev build before the ruling of the lean defaults/.test(text) ? 'dev'
    : /a lean package is allowed only for Android before the ruling of the lean defaults/.test(text) ? 'not-android'
    : /a lean package is allowed only with the dev app id before the ruling of the lean defaults/.test(text) ? 'app-id'
    : /the lean switches changed in this obj folder/.test(text) ? 'stamp'
    : /every lean switch is off, but .*spixi-lean\.stamp exists/.test(text) ? 'stale'
    : /SpixiLeanCss='.*' is not true or false/.test(text) ? 'typo-css'
    : /SpixiLeanJs='.*' is not true or false/.test(text) ? 'typo-js'
    : /SpixiLeanCssFull \(the lean v2 step\) is not built/.test(text) ? 'full'
    : /needs the Release packaging strip/.test(text) ? 'strip'
    : /is empty, only white space, or the project folder itself — refusing a lean build/.test(text) ? 'iop'
    : /the project folder itself at target time — refusing to empty/.test(text) ? 'iop-lean'
    : 'other:' + text.slice(0, 60);
  const build = (globals, disk = new Map()) => {
    const P = evaluate(globals); const evalKeys = Object.keys(P); P.__disk = disk;
    const trace = []; const done = new Set(); const writes = []; let stopped = null;
    const runTarget = (t) => {
      if (stopped || done.has(t.a.Name)) return;
      done.add(t.a.Name);
      if (t.a.Condition && !evalCond(t.a.Condition, P)) { trace.push('skip:' + t.a.Name); return; }
      for (const d of list(t.a.DependsOnTargets)) { const dt = tgt(d); if (!dt) throw new Error('DependsOnTargets names a missing target: ' + d); runTarget(dt); if (stopped) return; }
      trace.push('run:' + t.a.Name);
      for (const m of t.els) {
        if (m[1] !== undefined) {   // Error
          const a = m.a || (m.a = parseAttrs(m[1]));   // parsed once per element
          if (a.Condition === undefined) throw new Error('an Error without a Condition in ' + t.a.Name);
          if (RUNTIME.test(a.Condition)) continue;
          let fire; try { fire = evalCond(a.Condition, P); } catch (e) { if (e instanceof RuntimeCond) continue; throw e; }
          if (fire) { const text = expand(a.Text || '', P); stopped = { target: t.a.Name, cause: causeOf(text), text }; trace.push('error:' + stopped.cause); return; }
        } else if (m[2] !== undefined) {   // PropertyGroup inside the target
          for (const [, k, c, v] of m.props || (m.props = [...m[2].matchAll(/<(\w+)(?:\s+Condition="([^"]*)")?\s*>([^<]*)<\/\1>/g)])) {
            if (RUNTIME_PROPS.test(k)) continue;
            if (!TARGET_PROPS.test(k)) throw new Error('unknown property inside a target: ' + k);
            if (!c || evalCond(c, P)) P[k] = expand(v, P);   // a PropertyGroup INSIDE a target overrides a global property (probed: -p:V=global, target V → the target's value)
          }
        } else if (m[3] !== undefined) {   // ReadLinesFromFile → one property (MSBuild: every line trimmed, empty lines dropped, joined with ;)
          const a = parseAttrs(m[3]);
          const out = /<Output\s+TaskParameter="Lines"\s+PropertyName="(\w+)"\s*\/>/.exec(m[4]);
          if (!out || m[4].replace(out[0], '').trim()) throw new Error('ReadLinesFromFile with an unknown body in ' + t.a.Name);
          if (a.Condition && !evalCond(a.Condition, P)) continue;
          const f = expand(a.File, P);
          P[out[1]] = (P.__disk.get(f) || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join(';');
        } else {   // WriteLinesToFile: recorded
          const a = parseAttrs(m[5]);
          if (a.Condition && !evalCond(a.Condition, P)) continue;
          writes.push({ file: expand(a.File, P), lines: expand(a.Lines, P), overwrite: a.Overwrite });
        }
      }
    };
    for (const t of targets) if (list(t.a.BeforeTargets).includes('PrepareForBuild')) runTarget(t);
    const flags = P.SpixiLeanFlags === undefined ? null : P.SpixiLeanFlags;
    const exec = (() => {   // the Exec command of the lean target with placeholder paths (only when the lean body ran)
      if (!trace.includes('run:SpixiLeanReleaseHtml')) return null;
      const m = /<Exec\s+Command="([^"]*)"/.exec(tgt('SpixiLeanReleaseHtml').body);
      return m ? expand(m[1].replace(/&quot;/g, '"'), { ...P, SpixiLeanScript: 'S', SpixiLeanHtmlDir: 'D/' }) : '(no Exec)';
    })();
    const outcome = stopped ? stopped.cause
      : trace.includes('run:SpixiLeanReleaseHtml') ? 'built:lean:' + [/--lean-css/.test(flags) ? 'css' : '', /--lean-js/.test(flags) ? 'js' : ''].filter(Boolean).join(',')
      : trace.includes('run:SpixiStripReleaseHtml') ? 'built:strip' : 'built:none';
    return { P, evalKeys, trace, stopped, flags, exec, outcome, writes };
  };
  const B = (globals, disk) => safe(() => build(globals, disk));
  const ANDROID = 'net10.0-android';   // #46 r3 B-3: a lean package is Android only; every global set below carries the Android TargetFramework unless a row varies it
  const R = { Configuration: 'Release', TargetFramework: ANDROID }, D = { Configuration: 'Debug', TargetFramework: ANDROID };
  const RD = { ...R, SpixiDevCoexist: 'true' };   // #46 r2 S-1: a lean build is a DEV build (Debug has SpixiDevCoexist true by default)
  const t3 = (b) => (typeof b === 'string' ? b : b.trace.join(' > ') + ' => ' + b.outcome);
  const OWN = stampPath('obj/Release/net10.0-android/');
  const disk1 = (path, text) => new Map([[path, text]]);

  /* ================= row 1 — defaults ================= */
  const LEAN = ['SpixiLeanCss', 'SpixiLeanCssFull', 'SpixiLeanJs'];
  const defaults = {};
  for (const cfg of ['Debug', 'Release']) for (const extra of [{}, { SpixiStoreRelease: 'true' }]) {
    const P = safe(() => evaluate({ Configuration: cfg, ...extra }));
    defaults[cfg + (extra.SpixiStoreRelease ? '+store' : '')] = typeof P === 'string' ? P : LEAN.map((k) => P[k]).join('/');
  }
  const leanEls = [...cs.matchAll(/<(SpixiLeanCss|SpixiLeanCssFull|SpixiLeanJs)(?:\s+Condition="([^"]*)")?\s*>([^<]*)<\/\1>/g)];
  const leanOutside = leanEls.filter((m) => targets.some((t) => m.index >= t.at && m.index < t.end));
  const r1 = {
    defaultsFalse: Object.values(defaults).every((v) => v === 'false/false/false'),
    threeSettings: leanEls.length === 3 && LEAN.every((k) => leanEls.some((m) => m[1] === k)),
    everyLiteralFalse: leanEls.every((m) => m[3] === 'false' && m[2] === `'$(${m[1]})' == ''`),
    noneInTarget: leanOutside.length === 0,
    oneGroup: (() => { const gs = [...body.matchAll(/<PropertyGroup\b[^>]*>([\s\S]*?)<\/PropertyGroup>/g)].filter((g) => /<SpixiLean(Css|CssFull|Js)[\s>]/.test(g[1])); return gs.length === 1 && gs[0][0].indexOf('<SpixiLeanCss ') >= 0 && !/Condition="[^"]*"\s*>\s*<SpixiLean/.test(gs[0][0].slice(0, 80)) && /^<PropertyGroup\s*>/.test(gs[0][0]); })(),
    noTrueAnywhere: !/<SpixiLean(Css|CssFull|Js)\b[^>]*>\s*true\s*</i.test(cs),
  };
  ok(Object.values(r1).every(Boolean),
    T + ' (1) defaults — with no lean property passed SpixiLeanCss / SpixiLeanCssFull / SpixiLeanJs evaluate to false in Debug and Release (also with SpixiStoreRelease): ' + JSON.stringify(defaults) + '; exactly three settings, each literally false under Condition \'$(X)\' == \'\', in ONE unconditioned top-level PropertyGroup, none inside a target, none true anywhere — ' + JSON.stringify(r1));

  /* ================= row 2 — all off = today ================= */
  const off = {
    relOff: B(R), dbgOff: B(D),
    relExplicit: B({ ...R, SpixiLeanCss: 'false', SpixiLeanJs: 'false', SpixiLeanCssFull: 'false' }),
    relStripFalse: B({ ...R, SpixiStripHtml: 'false' }), relStore: B({ ...R, SpixiStoreRelease: 'true' }),
    relOffWords: B({ ...R, SpixiLeanCss: 'no', SpixiLeanJs: 'OFF', SpixiLeanCssFull: '!true' }),   // MSBuild's false words (rule 1)
    relOffEmptyIop: B({ ...R, IntermediateOutputPath: '' }),   // LEGACY: all off + an empty IntermediateOutputPath = the tokens-only target as today (no guard; the stale guard skips its test)
    relOffDtb: B({ ...R, DesignTimeBuild: 'true' }),
    relOffStampElsewhere: B(R, disk1(stampPath('obj/Debug/net10.0-android/'), 'css=true js=true\n')),   // a stamp of ANOTHER obj folder is not read
    /* #46 r3 B-3: all off = today's build on every platform (the Android rule binds only a lean build) */
    relOffIos: B({ Configuration: 'Release', TargetFramework: 'net10.0-ios' }), relOffWin: B({ Configuration: 'Release', SpixiDevCoexist: 'true', TargetFramework: 'net10.0-windows10.0.19041.0' }),
    relOffMac: B({ Configuration: 'Release', TargetFramework: 'net10.0-maccatalyst' }), relOffNoTf: B({ Configuration: 'Release' }),
  };
  const has = (b, x) => typeof b !== 'string' && b.trace.includes(x);
  const REL_OFF = [off.relOff, off.relExplicit, off.relStore, off.relOffWords, off.relOffEmptyIop, off.relOffDtb, off.relOffStampElsewhere, off.relOffIos, off.relOffWin, off.relOffMac, off.relOffNoTf];
  const r2 = {
    relGuardSkipped: REL_OFF.every((b) => has(b, 'skip:SpixiLeanGuard')),
    relLeanSkipped: REL_OFF.every((b) => has(b, 'skip:SpixiLeanReleaseHtml')),
    relStripRuns: REL_OFF.every((b) => has(b, 'run:SpixiStripReleaseHtml') && b.outcome === 'built:strip'),
    staleRunsOnlyReads: [off.relOff, off.relExplicit, off.relStore, off.relOffWords, off.relOffStampElsewhere, off.dbgOff, off.relStripFalse].every((b) => has(b, 'run:SpixiLeanStaleGuard') && b.stopped === null && b.writes.length === 0),
    staleSkipped: has(off.relOffEmptyIop, 'skip:SpixiLeanStaleGuard') && has(off.relOffDtb, 'skip:SpixiLeanStaleGuard'),
    noNewProperty: [...REL_OFF, off.dbgOff, off.relStripFalse].every((b) => typeof b !== 'string' && Object.keys(b.P).every((k) => b.evalKeys.includes(k) || ['__disk', 'SpixiStripHtmlDir', 'SpixiStripScript'].includes(k))),   // the stale guard sets nothing
    dbgGuardSkipped: has(off.dbgOff, 'skip:SpixiLeanGuard') && has(off.dbgOff, 'skip:SpixiLeanReleaseHtml'),
    dbgStripSkipped: has(off.dbgOff, 'skip:SpixiStripReleaseHtml') && off.dbgOff.outcome === 'built:none',
    stripFalseNone: off.relStripFalse.outcome === 'built:none' && has(off.relStripFalse, 'skip:SpixiLeanGuard'),
  };
  ok(Object.values(r2).every(Boolean),
    T + ' (2) all three off = today — Release: ' + t3(off.relOff) + ' · Debug: ' + t3(off.dbgOff) + ' · explicit =false ×3, MSBuild\'s false words (no / OFF / !true), an empty IntermediateOutputPath (legacy), a design-time build, a stamp of another obj folder, SpixiStripHtml=false and a store build behave the same (guard and lean target skipped; SpixiStripReleaseHtml runs in Release, not in Debug); SpixiLeanStaleGuard runs (Debug too) and with no stamp it stops nothing, writes nothing and sets no property; it is skipped for an empty IntermediateOutputPath and in a design-time build — ' + JSON.stringify(r2));

  /* ================= row 3 — the tokens-only target: nothing moved ================= */
  const strip = tgt('SpixiStripReleaseHtml');
  const NOW = {
    open: '<Target Name="SpixiStripReleaseHtml" BeforeTargets="PrepareForBuild" Condition="\'$(SpixiStripHtml)\' == \'true\'">',
    exec: '<Exec Command="node &quot;$(SpixiStripScript)&quot; --out &quot;$(SpixiStripHtmlDir).&quot;" />',
    remove: '<MauiAsset Remove="Resources\\Raw\\html\\spixi.tokens.css" />',
    include: '<MauiAsset Include="$(SpixiStripHtmlDir)spixi.tokens.css" LogicalName="html$([System.IO.Path]::DirectorySeparatorChar)spixi.tokens.css" />',
    dflt: '<SpixiStripHtml Condition="\'$(SpixiStripHtml)\' == \'\' and \'$(Configuration)\' == \'Release\'">true</SpixiStripHtml>',
  };
  const count = (s, sub) => s.split(sub).length - 1;
  const kids = strip ? [...strip.body.matchAll(/<(\w+)\b/g)].map((m) => m[1]).filter((n) => !['SpixiStripHtmlDir', 'SpixiStripScript'].includes(n)).join(',') : '';
  /* r2 D-1 (c): the FULL text (comments included) of the tokens-only block (its comment, its PropertyGroup, the target) and of the store gate,
   * byte for byte as at the base commit — copied here, so a diff names the first line that moved */
  const BASE_STRIP = [
    "\t<!-- ★ Session N — THE RELEASE PACKAGING STRIP (scripts/strip-release.mjs; DECISIONS: the",
    "\t     comment-strip fork). Release only. The committed Raw/html stays readable and every",
    "\t     smoke pin keeps reading it; what SHIPS is the committed tree with the allowlisted",
    "\t     stylesheet(s) comment-stripped (tokens.css: 103 KB → 31 KB). The strip is verified",
    "\t     TWICE per release, or it does not count: GATE 1 `strip-release.mjs` in check mode",
    "\t     (packaged ≡ strip(committed), byte-compare) and GATE 2 `smoke-packaged.mjs` (the",
    "\t     whole suite over the packaged tree). Opt out with -p:SpixiStripHtml=false.",
    "\t     ⚠ Runs BEFORE PrepareForBuild so the item swap precedes MAUI's asset collection;",
    "\t     the swap keeps the LogicalName the wholesale Include above would have produced",
    "\t     (html + native separator + file), so the asset lands at the same path in the app. Fails LOUD if node",
    "\t     or the script is missing — a silent no-strip would still pass gate 1 only because",
    "\t     gate 1 would then also fail, which is the right shape. -->",
    "\t<PropertyGroup>",
    "\t\t<SpixiStripHtml Condition=\"'$(SpixiStripHtml)' == '' and '$(Configuration)' == 'Release'\">true</SpixiStripHtml>",
    "\t</PropertyGroup>",
    "\t<Target Name=\"SpixiStripReleaseHtml\" BeforeTargets=\"PrepareForBuild\" Condition=\"'$(SpixiStripHtml)' == 'true'\">",
    "\t\t<!-- ★ #46 auditor A MAJOR-1: these two are evaluated INSIDE the target, at target time.",
    "\t\t     In the project body $(IntermediateOutputPath) is still EMPTY (the SDK sets it in the",
    "\t\t     bottom-imported targets, TFM-suffixed), so a body-level property would have resolved",
    "\t\t     to Spixi/spixi-strip/html/ — in the working tree, and ONE directory shared by four",
    "\t\t     TFMs writing the same file. Here it is obj/Release/net10.0-<tfm>/spixi-strip/html/. -->",
    "\t\t<PropertyGroup>",
    "\t\t\t<SpixiStripHtmlDir>$([MSBuild]::NormalizeDirectory('$(MSBuildProjectDirectory)', '$(IntermediateOutputPath)', 'spixi-strip', 'html'))</SpixiStripHtmlDir>",
    "\t\t\t<SpixiStripScript>$([MSBuild]::NormalizePath('$(MSBuildProjectDirectory)', '..', 'scripts', 'strip-release.mjs'))</SpixiStripScript>",
    "\t\t</PropertyGroup>",
    "\t\t<!-- ★ break-my-verdict MAJOR-1: NormalizeDirectory always ends in a separator, so on Windows",
    "\t\t     \"…\\html\\\" puts a backslash before the closing quote and CommandLineToArgvW reads it as an",
    "\t\t     ESCAPED quote — node gets `…\\html\"`, mkdirSync throws EINVAL, every Windows Release build",
    "\t\t     fails. The trailing \".\" keeps the quote a quote and resolves to the same directory. -->",
    "\t\t<Exec Command=\"node &quot;$(SpixiStripScript)&quot; --out &quot;$(SpixiStripHtmlDir).&quot;\" />",
    "\t\t<!-- The ItemGroup below REMOVES the source file and includes the stripped one. If the",
    "\t\t     strip produced nothing, that swap ships a build with no spixi.tokens.css. Fail here. -->",
    "\t\t<Error Condition=\"!Exists('$(SpixiStripHtmlDir)spixi.tokens.css')\" Text=\"Spixi: the release strip produced no spixi.tokens.css — refusing to package\" />",
    "\t\t<ItemGroup>",
    "\t\t\t<MauiAsset Remove=\"Resources\\Raw\\html\\spixi.tokens.css\" />",
    "\t\t\t<MauiAsset Include=\"$(SpixiStripHtmlDir)spixi.tokens.css\" LogicalName=\"html$([System.IO.Path]::DirectorySeparatorChar)spixi.tokens.css\" />",
    "\t\t</ItemGroup>",
    "\t\t<Message Importance=\"high\" Text=\"Spixi: Release packaging strip applied (spixi.tokens.css from $(SpixiStripHtmlDir)) — GATE 1: node scripts/strip-release.mjs --check &lt;the DEPLOYED html folder&gt; (never this obj dir, which holds only the allowlist); GATE 2: node scripts/smoke-packaged.mjs\" />",
    "\t</Target>",
  ].join('\n');
  const BASE_GATE = [
    "\t<!-- ★ S15 (O-35, #1293) — THE STORE-RELEASE GATE. Damir: the store build must have SpixiDevCoexist",
    "\t     OFF. That property (above, #732) compiles in SPIXI_DEV_COEXIST: the seed harness, its two",
    "\t     ixian:devseed / devunseed verbs and the WebView-console-to-log forwarder (O-22). A store build",
    "\t     says so with -p:SpixiStoreRelease=true (docs/freeze-checklist-v1.md, row O-35); this target then",
    "\t     REFUSES the build when the configuration is not Release, when SpixiDevCoexist is true, or when",
    "\t     SPIXI_DEV_COEXIST reached DefineConstants by any other road. Evaluated at target time, after",
    "\t     every PropertyGroup. Defined BEFORE SpixiStripReleaseHtml so it runs first on the same hook",
    "\t     (BeforeTargets run in file order) and a refused build never starts the strip. Without",
    "\t     SpixiStoreRelease nothing changes: a dev Release test build may still opt in to SpixiDevCoexist.",
    "\t     Pinned: scripts/pins-s15/d-build.mjs. -->",
    "\t<Target Name=\"SpixiStoreReleaseGate\" BeforeTargets=\"PrepareForBuild\" Condition=\"'$(SpixiStoreRelease)' == 'true'\">",
    "\t\t<Error Condition=\"'$(Configuration)' != 'Release'\" Text=\"Spixi store-release gate (O-35): SpixiStoreRelease=true needs Configuration=Release, this build is $(Configuration). Build the store package with -c Release.\" />",
    "\t\t<Error Condition=\"'$(SpixiDevCoexist)' == 'true'\" Text=\"Spixi store-release gate (O-35): SpixiDevCoexist=true in a store build. It compiles in the dev seed harness, its verbs and the WebView console forwarder. Remove -p:SpixiDevCoexist=true.\" />",
    "\t\t<Error Condition=\"$(DefineConstants.Contains('SPIXI_DEV_COEXIST'))\" Text=\"Spixi store-release gate (O-35): SPIXI_DEV_COEXIST is in DefineConstants in a store build. Remove it.\" />",
    "\t\t<Message Importance=\"high\" Text=\"Spixi store-release gate (O-35): passed - Release, SpixiDevCoexist off, no SPIXI_DEV_COEXIST.\" />",
    "\t</Target>",
  ].join('\n');
  const cutRaw = (head, name) => { const a = raw.indexOf(head); if (a < 0) return null; const t = raw.indexOf('<Target Name="' + name + '"', a); const e = t < 0 ? -1 : raw.indexOf('</Target>', t); return e < 0 ? null : raw.slice(a, e + '</Target>'.length).replace(/\r\n/g, '\n'); };
  const lineDiff = (got, want) => { if (got === null) return 'not found'; const g = got.split('\n'), w = want.split('\n'); for (let i = 0; i < Math.max(g.length, w.length); i++) if (g[i] !== w[i]) return 'line ' + (i + 1) + ': got ' + JSON.stringify((g[i] === undefined ? '(none)' : g[i]).slice(0, 140)) + ', want ' + JSON.stringify((w[i] === undefined ? '(none)' : w[i]).slice(0, 140)); return null; };
  const sha = (t) => createHash('sha256').update(t || '').digest('hex').slice(0, 16);
  const stripText = cutRaw('\t<!-- ★ Session N — THE RELEASE PACKAGING STRIP', 'SpixiStripReleaseHtml'), gateText = cutRaw('\t<!-- ★ S15 (O-35, #1293)', 'SpixiStoreReleaseGate');
  const textDiff = { strip: lineDiff(stripText, BASE_STRIP), gate: lineDiff(gateText, BASE_GATE) };
  const r3 = {
    fullText: textDiff.strip === null && count(raw.replace(/\r\n/g, '\n'), BASE_STRIP) === 1,
    gateFullText: textDiff.gate === null && count(raw.replace(/\r\n/g, '\n'), BASE_GATE) === 1,
    exists: !!strip,
    open: !!strip && strip.open === NOW.open,
    exec: !!strip && count(strip.body, NOW.exec) === 1 && count(strip.body, '<Exec ') === 1,
    swap: !!strip && count(strip.body, NOW.remove) === 1 && count(strip.body, NOW.include) === 1 && strip.body.indexOf(NOW.remove) < strip.body.indexOf(NOW.include),
    dflt: count(cs, NOW.dflt) === 1,
    noLeanWord: !!strip && !/Lean/.test(strip.text),
    elements: kids === 'PropertyGroup,Exec,Error,ItemGroup,MauiAsset,MauiAsset,Message',
  };
  ok(Object.values(r3).every(Boolean),
    T + ' (3) tokens-only target unchanged ("nothing moved" belt, expected text hard-coded from the delivered csproj): opening tag, the Exec command, the Remove + Include swap of spixi.tokens.css, the SpixiStripHtml default and the element list (' + kids + '), no mention of Lean, and the FULL text of the block (' + BASE_STRIP.split('\n').length + ' lines, sha256 ' + sha(stripText) + ') and of the store gate (' + BASE_GATE.split('\n').length + ' lines, sha256 ' + sha(gateText) + ') byte for byte as at the base — ' + (textDiff.strip || textDiff.gate ? 'MOVED: ' + JSON.stringify(textDiff) + ' · ' : '') + JSON.stringify(r3));

  /* ================= row 4 — lean allowed (and the stamp it writes) ================= */
  const lean = {
    css: B({ ...RD, SpixiLeanCss: 'true' }),
    cssCase: B({ ...RD, SpixiLeanCss: 'True' }), cssStripTrue: B({ ...RD, SpixiLeanCss: 'true', SpixiStripHtml: 'true' }),
    jsFalseExplicit: B({ ...RD, SpixiLeanCss: 'true', SpixiLeanJs: 'false' }),
    // MSBuild's true / false words (header rule 1): the same outcome as true / false
    jsOffWords: B({ ...RD, SpixiLeanCss: 'true', SpixiLeanJs: '!true' }), jsOff: B({ ...RD, SpixiLeanCss: 'true', SpixiLeanJs: 'OFF' }),
    cssOnJsNo: B({ ...RD, SpixiLeanCss: 'on', SpixiLeanJs: 'no' }), cssYesFullOff: B({ ...RD, SpixiLeanCss: 'YES', SpixiLeanCssFull: 'off' }),
    dbgStripCss: B({ ...D, SpixiStripHtml: 'true', SpixiLeanCss: 'true' }),   // D-5 (c): the rule is SpixiStripHtml, not the configuration
    iopOutside: B({ ...RD, SpixiLeanCss: 'true', IntermediateOutputPath: '/elsewhere/obj/' }), iopBelow: B({ ...RD, SpixiLeanCss: 'yes', IntermediateOutputPath: 'build/obj' }),
    sameStamp: B({ ...RD, SpixiLeanCss: 'true' }, disk1(OWN, 'css=true js=false\n')), sameStampYes: B({ ...RD, SpixiLeanCss: 'yes' }, disk1(OWN, 'css=true js=false\r\n')),
    otherObjStamp: B({ ...RD, SpixiLeanCss: 'true' }, disk1(stampPath('obj/Debug/net10.0-android/'), 'css=false js=true\n')),
    cssEscaped: B({ ...RD, SpixiLeanCss: '%74rue' }),
    android35: B({ ...RD, TargetFramework: 'net10.0-android35.0', SpixiLeanCss: 'true' }),   // #46 r3 B-3: a platform version suffix is still Android
    devYes: B({ ...R, SpixiDevCoexist: 'yes', SpixiLeanCss: 'true' }), devEscaped: B({ ...R, SpixiDevCoexist: '%74rue', SpixiLeanCss: 'on' }),   // r2 S-1: the app-id test reads yes / %74rue as true, so does the guard
  };
  /* the PARK: every build with SpixiLeanJs on (any boolean word, any combination) is refused in the guard, before the tokens-only strip, with no write */
  const PARKRE = (v) => new RegExp('^Spixi lean packaging: SpixiLeanJs \\(the comment strip of the scripts, P-07\\) is PARKED in this batch \\(SpixiLeanJs=' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\): its review found a fault that is not fixed, so no build may pack its output \\(DECISIONS 1583 and 1589\\)\\. Remove the property \\(a -p: switch, an environment variable, or a props \\/ \\.user file\\); the comment strip of the stylesheets is SpixiLeanCss=true\\.$');
  const parkedBuilds = {
    js: [B({ ...RD, SpixiLeanJs: 'true' }), 'true'], both: [B({ ...RD, SpixiLeanCss: 'true', SpixiLeanJs: 'true' }), 'true'],
    jsYes: [B({ ...RD, SpixiLeanJs: 'yes' }), 'yes'], jsOn: [B({ ...RD, SpixiLeanJs: 'On' }), 'On'], jsNotFalse: [B({ ...RD, SpixiLeanJs: '!false' }), '!false'],
    jsEscaped: [B({ ...RD, SpixiLeanJs: '%74rue' }), 'true'], jsBelow: [B({ ...RD, SpixiLeanJs: 'true', IntermediateOutputPath: 'build/obj' }), 'true'],
    jsDebug: [B({ ...D, SpixiStripHtml: 'true', SpixiLeanJs: 'true' }), 'true'], jsDevEscaped: [B({ ...R, SpixiDevCoexist: '%74rue', SpixiLeanJs: 'true' }), 'true'],
    jsOnStamp: [B({ ...RD, SpixiLeanJs: 'true' }, disk1(OWN, 'css=true js=true\n')), 'true'],   // a stamp of an older css + js build does not change the text: the park comes first
  };
  const orderOf = (b) => typeof b === 'string' ? b : b.trace.filter((x) => /Guard|Strip|Lean/.test(x)).join('>');
  const EXEC = (f) => 'node "S" --out "D/."' + f;
  const ORDER = /run:SpixiLeanGuard>skip:SpixiLeanStaleGuard>run:SpixiStripReleaseHtml>run:SpixiLeanReleaseHtml$/;
  const wrote = (b, path, text) => typeof b !== 'string' && b.writes.length === 1 && b.writes[0].file === path && b.writes[0].lines === text && b.writes[0].overwrite === 'true';
  const r4 = {
    cssOk: lean.css.outcome === 'built:lean:css' && lean.css.flags === ' --lean-css' && lean.css.exec === EXEC(' --lean-css'),
    jsParked: Object.values(parkedBuilds).every(([b, v]) => typeof b !== 'string' && b.stopped && b.stopped.cause === 'js-parked' && b.stopped.target === 'SpixiLeanGuard' && PARKRE(v).test(b.stopped.text) && !b.trace.includes('run:SpixiStripReleaseHtml') && !b.trace.includes('run:SpixiLeanReleaseHtml') && b.writes.length === 0 && b.exec === null),
    noError: Object.values(lean).every((b) => typeof b !== 'string' && b.stopped === null),
    guardRunsThenStripThenLean: ['css', 'cssCase', 'cssStripTrue', 'sameStamp'].every((k) => ORDER.test(orderOf(lean[k]))),
    caseAndFalse: lean.cssCase.outcome === 'built:lean:css' && lean.cssStripTrue.outcome === 'built:lean:css' && lean.jsFalseExplicit.outcome === 'built:lean:css' && lean.jsOffWords.outcome === 'built:lean:css' && lean.jsOff.outcome === 'built:lean:css' && lean.jsOff.flags === ' --lean-css',
    msbuildWords: lean.cssOnJsNo.outcome === 'built:lean:css' && lean.cssOnJsNo.flags === ' --lean-css' && lean.cssYesFullOff.outcome === 'built:lean:css'
      && ORDER.test(orderOf(lean.cssOnJsNo)),
    debugWithStrip: lean.dbgStripCss.outcome === 'built:lean:css',
    iopElsewhere: lean.iopOutside.outcome === 'built:lean:css' && lean.iopBelow.outcome === 'built:lean:css' && wrote(lean.iopOutside, '/elsewhere/obj/' + STAMP_NAME, 'css=true js=false') && wrote(lean.iopBelow, PROJ + '/build/obj/' + STAMP_NAME, 'css=true js=false'),
    /* D-1: the stamp = the EVALUATED switches (true / True / yes / on / !false → "true"), one write, at the obj folder's stamp path, after the swap */
    stampText: wrote(lean.css, OWN, 'css=true js=false') && wrote(lean.cssCase, OWN, 'css=true js=false') && wrote(lean.jsOffWords, OWN, 'css=true js=false')
      && wrote(lean.cssOnJsNo, OWN, 'css=true js=false') && wrote(lean.cssYesFullOff, OWN, 'css=true js=false'),
    androidSuffix: lean.android35.outcome === 'built:lean:css' && lean.android35.flags === ' --lean-css' && wrote(lean.android35, OWN, 'css=true js=false'),
    devWords: lean.devYes.outcome === 'built:lean:css' && lean.devEscaped.outcome === 'built:lean:css',
    escapedSwitch: lean.cssEscaped.outcome === 'built:lean:css' && wrote(lean.cssEscaped, OWN, 'css=true js=false'),   // r2 D-5: %74rue = true (MSBuild unescapes)
    sameStampPasses: lean.sameStamp.outcome === 'built:lean:css' && lean.sameStampYes.outcome === 'built:lean:css' && lean.otherObjStamp.outcome === 'built:lean:css',
  };
  ok(Object.values(r4).every(Boolean),
    T + ' (4) lean allowed — Release + SpixiLeanCss=true (css only; SpixiLeanJs on is PARKED: ' + Object.keys(parkedBuilds).length + ' builds with any js value, alone or with css, refuse with the PARK text in SpixiLeanGuard, before the tokens-only strip, no write): the guard runs and raises no Error, the stale guard is skipped, the lean target runs after the tokens-only strip, flags "' + lean.css.flags + '", Exec "' + lean.css.exec + '" (also True, SpixiStripHtml=true, Debug + SpixiStripHtml=true, an IntermediateOutputPath outside or below the project folder, and MSBuild\'s boolean words: SpixiLeanCss=yes / on, SpixiLeanJs=no / OFF / !true = off = lean css only, SpixiLeanCss=YES + SpixiLeanCssFull=off = lean css); each writes ONE stamp, Overwrite, at <obj>/spixi-lean.stamp with the evaluated switches ("css=true js=false" for true, True, yes, on); a stamp with the same switches (any line ending) or a stamp of another obj folder lets it pass — ' + JSON.stringify(r4));

  /* ================= row 5 — refusals ================= */
  const refuse = (g, cause, textRe, disk) => { const b = B(g, disk); return typeof b !== 'string' && b.stopped && b.stopped.cause === cause && textRe.test(b.stopped.text) && !b.trace.includes('run:SpixiStripReleaseHtml') && !b.trace.includes('run:SpixiLeanReleaseHtml') && b.writes.length === 0 ? 'ok' : 'WRONG ' + t3(b); };
  const NEEDS = /SpixiStripHtml is '.*'.*Configuration=/;
  const WHERE = ' \\(a -p: switch, an environment variable, or a props \\/ \\.user file\\)';
  const IOPRE = (v) => new RegExp('^Spixi lean packaging: IntermediateOutputPath=\'' + v.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '\' is empty, only white space, or the project folder itself — refusing a lean build \\(its output directory would be inside the working tree, beside the sources\\)\\. Leave IntermediateOutputPath to the SDK, or set it to another folder\\.$');
  const WIPE = 'Delete Spixi\\\\obj and Spixi\\\\bin \\(and the publish folder\\), then build again; only GATE 1 on the deployed folder proves a package\\.$';
  const CHANGED = (was, now) => new RegExp('^Spixi lean packaging: the lean switches changed in this obj folder: ' + OWN.replace(/[.\\/]/g, '\\$&') + ' says \'' + was + '\', this build is \'' + now + '\'\\. The bin or publish folder can still hold the files of the earlier build \\(a copy by timestamp keeps them\\)\\. ' + WIPE);
  const STALE = new RegExp('^Spixi lean packaging: every lean switch is off, but ' + OWN.replace(/[.\\/]/g, '\\$&') + ' exists: a LEAN build ran in this obj folder, and the bin or publish folder can still hold its lean files \\(a copy by timestamp keeps them\\)\\. ' + WIPE);
  const DEVRE = (v, cfg) => new RegExp('^Spixi lean packaging: a lean package is allowed only in a dev build before the ruling of the lean defaults, and SpixiDevCoexist is \'' + v + '\' \\(Configuration=' + cfg + '\\)\\. Pass -p:SpixiDevCoexist=true \\(the package id is com\\.ixilabs\\.spixi\\.dev on Android\\), or remove the lean property' + WHERE + ' for a production-id build\\.$');
  const TFRE = (tf) => new RegExp('^Spixi lean packaging: a lean package is allowed only for Android before the ruling of the lean defaults, and TargetFramework is \'' + tf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\': only there SpixiDevCoexist=true moves the app id to com\\.ixilabs\\.spixi\\.dev; an iOS, Mac or Windows package keeps the production id\\. Build with -f net10\\.0-android, or remove the lean property' + WHERE + '\\.$');
  const APPIDRE = (id, dev, tf) => new RegExp('^Spixi lean packaging: a lean package is allowed only with the dev app id before the ruling of the lean defaults, and ApplicationId is \'' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\' \\(SpixiDevCoexist=' + dev + ', TargetFramework=' + tf.replace(/[.]/g, '\\.') + '\\): the id is decided when the project file is read, so a SpixiDevCoexist that is set later \\(a \\.csproj\\.user file, a Directory\\.Build\\.targets file\\) or an ApplicationId on the build line does not give the dev id\\. Pass -p:SpixiDevCoexist=true -f net10\\.0-android on the build line, or remove the lean property' + WHERE + '\\.$');
  const WORDRE = (k, v, what, fix) => new RegExp('^Spixi lean packaging: ' + k + '=\'' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\' is not true or false, and a lean build needs a clear answer \\(such a value skips ' + what + '\\)\\. ' + fix + ', or remove the property' + WHERE + '\\.$');
  const STORE = (css, js) => new RegExp('^Spixi lean packaging: a store build \\(SpixiStoreRelease=true\\) cannot be lean before the ruling of the lean defaults \\(SpixiLeanCss=' + css + ', SpixiLeanJs=' + js + '\\)\\. Remove the lean property' + WHERE + '\\.$');
  const rf = {
    dbgCss: refuse({ ...D, SpixiLeanCss: 'true' }, 'strip', new RegExp('needs the Release packaging strip, but SpixiStripHtml is \'\'.*Configuration=Debug.*A lean switch needs SpixiStripHtml=true, which is on by default only in Release.*remove the lean property' + WHERE + '\\.$')),
    dbgJs: refuse({ ...D, SpixiLeanJs: 'true' }, 'js-parked', PARKRE('true')),   // the PARK comes before the strip text
    dbgCssNeedsStrip: refuse({ ...D, SpixiLeanCss: 'true', SpixiLeanJs: 'false' }, 'strip', NEEDS),
    relStripFalseCss: refuse({ ...RD, SpixiStripHtml: 'false', SpixiLeanCss: 'true' }, 'strip', /SpixiStripHtml is 'false'/),
    relStripFalseJs: refuse({ ...RD, SpixiStripHtml: 'false', SpixiLeanJs: 'true' }, 'js-parked', PARKRE('true')),
    fullAlone: refuse({ ...R, SpixiLeanCssFull: 'true' }, 'full', new RegExp('not built in this batch \\(SpixiLeanCssFull=true\\)\\. Remove the property' + WHERE + '; the comment strip')),
    fullCss: refuse({ ...R, SpixiLeanCssFull: 'true', SpixiLeanCss: 'true' }, 'full', /not built in this batch/),
    fullDebug: refuse({ ...D, SpixiLeanCssFull: 'true' }, 'full', /not built in this batch/),
    typoCss: refuse({ ...R, SpixiLeanCss: '1' }, 'typo-css', new RegExp('SpixiLeanCss=\'1\' is not true or false\\. Set it to true, or remove the property' + WHERE + '\\.$')),
    typoJs: refuse({ ...R, SpixiLeanJs: 'tru' }, 'typo-js', /SpixiLeanJs='tru' is not true or false/),
    typoJsWithCss: refuse({ ...R, SpixiLeanCss: 'true', SpixiLeanJs: 'tru' }, 'typo-js', /SpixiLeanJs='tru'/),
    typoJs2: refuse({ ...R, SpixiLeanJs: '2' }, 'typo-js', /SpixiLeanJs='2' is not true or false/),
    typoCssNotNot: refuse({ ...R, SpixiLeanCss: '!!true' }, 'typo-css', /SpixiLeanCss='!!true' is not true or false/),
    emptyCss: refuse({ ...R, SpixiLeanCss: '' }, 'typo-css', /SpixiLeanCss='' is not true or false/),   // an empty -p:SpixiLeanCss= is a global property: the default false cannot replace it
    fullYes: refuse({ ...R, SpixiLeanCssFull: 'yes' }, 'full', /not built in this batch \(SpixiLeanCssFull=yes\)/),
    /* S-3: a store build is never lean (until the ruling of the lean defaults); the store gate runs first and passes */
    storeCss: refuse({ ...R, SpixiStoreRelease: 'true', SpixiLeanCss: 'true' }, 'store', STORE('true', 'false')),
    storeJs: refuse({ ...R, SpixiStoreRelease: 'true', SpixiLeanJs: 'yes' }, 'js-parked', PARKRE('yes')),   // js + store: the PARK text comes before the store text
    storeBoth: refuse({ ...R, SpixiStoreRelease: 'true', SpixiLeanCss: 'on', SpixiLeanJs: 'true' }, 'js-parked', PARKRE('true')),
    storeTypoFirst: refuse({ ...R, SpixiStoreRelease: 'true', SpixiLeanJs: 'tru' }, 'typo-js', /SpixiLeanJs='tru'/),
    storeDebugCss: refuse({ ...D, SpixiStoreRelease: 'true', SpixiLeanCss: 'true' }, 'gate', /needs Configuration=Release/),
    /* r2 S-1: a lean build must be a DEV build (SpixiDevCoexist true by the app-id test); a set store / dev value that is not a boolean word is refused */
    noDev: refuse({ ...R, SpixiLeanCss: 'true' }, 'dev', DEVRE('', 'Release')),
    noDevFalse: refuse({ ...R, SpixiDevCoexist: 'false', SpixiLeanCss: 'true' }, 'dev', DEVRE('false', 'Release')),
    noDevNo: refuse({ ...R, SpixiDevCoexist: 'no', SpixiLeanCss: 'true' }, 'dev', DEVRE('no', 'Release')),
    noDevDebugExplicit: refuse({ ...D, SpixiDevCoexist: 'false', SpixiStripHtml: 'true', SpixiLeanCss: 'true' }, 'dev', DEVRE('false', 'Debug')),
    devWord1: refuse({ ...R, SpixiDevCoexist: '1', SpixiLeanCss: 'true' }, 'dev-word', WORDRE('SpixiDevCoexist', '1', 'the dev app id', 'Set it to true')),
    devWordSpace: refuse({ ...R, SpixiDevCoexist: 'true ', SpixiLeanCss: 'true' }, 'dev-word', WORDRE('SpixiDevCoexist', 'true ', 'the dev app id', 'Set it to true')),
    devWordEscaped: refuse({ ...R, SpixiDevCoexist: '%31', SpixiLeanCss: 'true' }, 'dev-word', /SpixiDevCoexist='1' is not true or false/),
    storeWord1: refuse({ ...RD, SpixiStoreRelease: '1', SpixiLeanCss: 'true' }, 'store-word', WORDRE('SpixiStoreRelease', '1', 'the store gate', 'Set it to true or false')),
    storeWordSpace: refuse({ ...RD, SpixiStoreRelease: 'true ', SpixiLeanCss: 'true' }, 'store-word', WORDRE('SpixiStoreRelease', 'true ', 'the store gate', 'Set it to true or false')),
    storeWordBeforeDevWord: refuse({ ...R, SpixiStoreRelease: 'tru', SpixiDevCoexist: '1', SpixiLeanCss: 'true' }, 'store-word', /SpixiStoreRelease='tru'/),
    storeBeforeDev: refuse({ ...R, SpixiStoreRelease: 'true', SpixiDevCoexist: 'false', SpixiLeanCss: 'true' }, 'store', STORE('true', 'false')),
    storeDevGate: refuse({ ...RD, SpixiStoreRelease: 'true', SpixiLeanCss: 'true' }, 'gate', /SpixiDevCoexist=true in a store build/),
    /* #46 r3 B-3: a lean package is Android only (the dev id moves only for -android); the Error comes after the dev-build Error and before the strip / folder / stamp Errors */
    tfIos: refuse({ ...RD, TargetFramework: 'net10.0-ios', SpixiLeanCss: 'true' }, 'not-android', TFRE('net10.0-ios')),
    tfMac: refuse({ ...RD, TargetFramework: 'net10.0-maccatalyst', SpixiLeanCss: 'true' }, 'not-android', TFRE('net10.0-maccatalyst')),
    tfWin: refuse({ ...RD, TargetFramework: 'net10.0-windows10.0.19041.0', SpixiLeanCss: 'true' }, 'not-android', TFRE('net10.0-windows10.0.19041.0')),
    tfUnset: refuse({ Configuration: 'Release', SpixiDevCoexist: 'true', SpixiLeanCss: 'true' }, 'not-android', TFRE('')),
    tfEmpty: refuse({ ...RD, TargetFramework: '', SpixiLeanCss: 'true' }, 'not-android', TFRE('')),
    tfDebugIos: refuse({ ...D, TargetFramework: 'net10.0-ios', SpixiStripHtml: 'true', SpixiLeanCss: 'true' }, 'not-android', TFRE('net10.0-ios')),   // Debug is dev by default: still refused on iOS
    tfBeforeStrip: refuse({ ...D, TargetFramework: 'net10.0-ios', SpixiLeanCss: 'true' }, 'not-android', TFRE('net10.0-ios')),   // the strip Error would be next
    tfBeforeIop: refuse({ ...RD, TargetFramework: 'net10.0-ios', SpixiLeanCss: 'true', IntermediateOutputPath: '' }, 'not-android', TFRE('net10.0-ios')),
    tfBeforeStamp: refuse({ ...RD, TargetFramework: 'net10.0-ios', SpixiLeanCss: 'true' }, 'not-android', TFRE('net10.0-ios'), disk1(OWN, 'css=true js=true\n')),
    tfAfterDev: refuse({ ...R, TargetFramework: 'net10.0-ios', SpixiLeanCss: 'true' }, 'dev', DEVRE('', 'Release')),   // the dev rule comes first
    tfAfterDevWord: refuse({ ...R, TargetFramework: 'net10.0-ios', SpixiDevCoexist: '1', SpixiLeanCss: 'true' }, 'dev-word', /SpixiDevCoexist='1'/),
    tfAfterStore: refuse({ ...R, SpixiStoreRelease: 'true', TargetFramework: 'net10.0-ios', SpixiLeanCss: 'true' }, 'store', STORE('true', 'false')),
    tfAfterTypo: refuse({ ...RD, TargetFramework: 'net10.0-ios', SpixiLeanJs: 'tru' }, 'typo-js', /SpixiLeanJs='tru'/),
    /* #46 r4 B-1: the guarantee itself — the evaluated ApplicationId; a late SpixiDevCoexist and a global ApplicationId cannot give the dev id; the Android Error stays first */
    appIdLate: refuse({ Configuration: 'Release', TargetFramework: ANDROID, SpixiLeanCss: 'true', LateDev: 'true' }, 'app-id', APPIDRE('com.ixilabs.spixi', 'true', ANDROID)),
    appIdLateJs: refuse({ Configuration: 'Release', TargetFramework: ANDROID, SpixiLeanCss: 'yes', LateDev: 'yes' }, 'app-id', APPIDRE('com.ixilabs.spixi', 'yes', ANDROID)),
    parkLate: refuse({ Configuration: 'Release', TargetFramework: ANDROID, SpixiLeanJs: 'yes', LateDev: 'yes' }, 'js-parked', PARKRE('yes')),   // the PARK comes before the ApplicationId text
    parkIos: refuse({ ...RD, TargetFramework: 'net10.0-ios', SpixiLeanJs: 'true' }, 'js-parked', PARKRE('true')),
    parkNoDev: refuse({ ...R, SpixiLeanJs: 'true' }, 'js-parked', PARKRE('true')),
    parkAfterFull: refuse({ ...RD, SpixiLeanJs: 'true', SpixiLeanCssFull: 'true' }, 'full', /not built in this batch/),   // CssFull comes first
    parkAfterTypoCss: refuse({ ...RD, SpixiLeanCss: '1', SpixiLeanJs: 'true' }, 'typo-css', /SpixiLeanCss='1'/),
    parkBeforeStoreWord: refuse({ ...RD, SpixiStoreRelease: '1', SpixiLeanJs: 'true' }, 'js-parked', PARKRE('true')),
    parkBeforeIop: refuse({ ...RD, SpixiLeanJs: 'true', IntermediateOutputPath: '' }, 'js-parked', PARKRE('true')),
    parkBeforeStamp: refuse({ ...RD, SpixiLeanJs: 'true' }, 'js-parked', PARKRE('true'), disk1(OWN, 'garbage\n')),
    oldStampCss: refuse({ ...RD, SpixiLeanCss: 'true' }, 'stamp', CHANGED('css=true js=true', 'css=true js=false'), disk1(OWN, 'css=true js=true\n')),   // a stamp of an older css + js build stops a css-only build
    appIdProd: refuse({ ...RD, SpixiLeanCss: 'true', ApplicationId: 'com.ixilabs.spixi' }, 'app-id', APPIDRE('com.ixilabs.spixi', 'true', ANDROID)),
    appIdOther: refuse({ ...RD, SpixiLeanCss: 'true', ApplicationId: 'com.example.other' }, 'app-id', APPIDRE('com.example.other', 'true', ANDROID)),
    appIdIosFirst: refuse({ ...RD, TargetFramework: 'net10.0-ios', SpixiLeanCss: 'true' }, 'not-android', TFRE('net10.0-ios')),
    appIdBeforeStrip: refuse({ ...D, SpixiLeanCss: 'true', ApplicationId: 'com.ixilabs.spixi' }, 'app-id', APPIDRE('com.ixilabs.spixi', 'true', ANDROID)),
    appIdDevOk: (() => { const b = B({ ...RD, SpixiLeanCss: 'true', ApplicationId: 'com.ixilabs.spixi.dev' }); return typeof b !== 'string' && b.outcome === 'built:lean:css' ? 'ok' : 'WRONG ' + t3(b); })(),
    /* D-5 (a): empty, white space, or the project folder after normalization */
    iopEmpty: refuse({ ...RD, SpixiLeanCss: 'true', IntermediateOutputPath: '' }, 'iop', IOPRE('')),
    iopSpace: refuse({ ...RD, SpixiLeanCss: 'true', IntermediateOutputPath: ' ' }, 'iop', IOPRE(' ')),
    iopDot: refuse({ ...RD, SpixiLeanCss: 'true', IntermediateOutputPath: '.' }, 'iop', IOPRE('.')),
    iopDotSlash: refuse({ ...RD, SpixiLeanCss: 'true', IntermediateOutputPath: './' }, 'iop', IOPRE('./')),
    iopObjDotDot: refuse({ ...RD, SpixiLeanCss: 'true', IntermediateOutputPath: 'obj/../' }, 'iop', IOPRE('obj/../')),
    iopEscaped: refuse({ ...RD, SpixiLeanCss: 'true', IntermediateOutputPath: '%2E' }, 'iop', IOPRE('.')),   // r2 D-5: MSBuild unescapes %2E to .
    iopAbsProject: refuse({ ...RD, SpixiLeanCss: 'true', IntermediateOutputPath: PROJ }, 'iop', IOPRE(PROJ)),
    iopEmptyJsYes: refuse({ ...RD, SpixiLeanCss: 'yes', IntermediateOutputPath: '' }, 'iop', /is empty, only white space, or the project folder itself — refusing a lean build/),
    iopEmptyDebug: refuse({ ...D, SpixiLeanCss: 'true', IntermediateOutputPath: '' }, 'strip', /needs the Release packaging strip/),   // the guard's IntermediateOutputPath Error comes after the user's real mistake
    iopEmptyTypo: refuse({ ...R, SpixiLeanJs: 'tru', IntermediateOutputPath: '' }, 'typo-js', /SpixiLeanJs='tru'/),
    /* D-1: the stamp */
    stampOther: refuse({ ...RD, SpixiLeanCss: 'true' }, 'stamp', CHANGED('css=true js=true', 'css=true js=false'), disk1(OWN, 'css=true js=true\n')),
    stampOtherYes: refuse({ ...RD, SpixiLeanCss: 'yes' }, 'stamp', CHANGED('css=false js=true', 'css=true js=false'), disk1(OWN, 'css=false js=true\n')),
    stampGarbage: refuse({ ...RD, SpixiLeanCss: 'true' }, 'stamp', CHANGED('x', 'css=true js=false'), disk1(OWN, '  x  \n\n')),
    stampEmpty: refuse({ ...RD, SpixiLeanCss: 'true' }, 'stamp', CHANGED('', 'css=true js=false'), disk1(OWN, '')),
    stampTwoLines: refuse({ ...RD, SpixiLeanCss: 'true' }, 'stamp', CHANGED('css=true js=false;css=true js=false', 'css=true js=false'), disk1(OWN, 'css=true js=false\ncss=true js=false\n')),
    stale: refuse(R, 'stale', STALE, disk1(OWN, 'css=true js=false\n')),
    staleDebugStampInDebugObj: refuse({ ...D, IntermediateOutputPath: 'obj/Debug/net10.0-android/' }, 'stale', /every lean switch is off, but \/p\/Spixi\/obj\/Debug\/net10\.0-android\/spixi-lean\.stamp exists/, disk1(stampPath('obj/Debug/net10.0-android/'), 'css=true js=false\n')),
    staleStripOff: refuse({ ...R, SpixiStripHtml: 'false' }, 'stale', STALE, disk1(OWN, 'css=false js=true\n')),
    staleFalseWords: refuse({ ...R, SpixiLeanCss: 'no', SpixiLeanJs: 'OFF' }, 'stale', STALE, disk1(OWN, '')),
  };
  const iopStop = safe(() => build({ ...RD, SpixiLeanCss: 'true', IntermediateOutputPath: '' }));
  if (typeof iopStop === 'string' || !iopStop.stopped || iopStop.stopped.target !== 'SpixiLeanGuard') rf.iopStopsInGuard = 'WRONG ' + t3(iopStop) + ' (stopped in ' + (iopStop && iopStop.stopped ? iopStop.stopped.target : '-') + ', want SpixiLeanGuard)';
  const staleStop = safe(() => build(R, disk1(OWN, 'css=true js=true')));
  if (typeof staleStop === 'string' || !staleStop.stopped || staleStop.stopped.target !== 'SpixiLeanStaleGuard' || has(staleStop, 'run:SpixiLeanGuard')) rf.staleStopsInStaleGuard = 'WRONG ' + t3(staleStop);
  const bad = Object.entries(rf).filter(([, v]) => v !== 'ok');
  ok(bad.length === 0,
    T + ' (5) refusals — the guard (or the stale guard) raises its Error and the exact text names the cause and where a property can come from: Debug + a lean property, Release + SpixiStripHtml=false + a lean property, SpixiLeanCssFull=true / yes alone / with css / in Debug, values MSBuild does not read as a boolean (SpixiLeanCss=1 / !!true / an empty -p:SpixiLeanCss=, SpixiLeanJs=tru / 2), a STORE build with any lean switch (S-3; a typo is named first; a Debug store build stops in the store gate), an IntermediateOutputPath that is empty, white space, ., ./, obj/../ or the absolute project folder (D-5; stopped IN THE GUARD, before the tokens-only strip; a Debug or a typo build names that mistake first), a stamp of other switches / with another text / empty / of two lines (D-1), and an all-off build with a stamp in its own obj folder (Release, Debug, SpixiStripHtml=false, the false words; stopped in SpixiLeanStaleGuard); in every one neither the tokens-only strip nor the lean body ran (node never started) and nothing was written — ' + (bad.length ? 'FAILED: ' + JSON.stringify(Object.fromEntries(bad)) : Object.keys(rf).length + ' builds refused as expected'));

  /* ================= row 6 — the matrices against the written-out rule of the batch ================= */
  /* the rule of the batch, written out: a switch value is ON / OFF by MSBuild's word lists (header rule 1, a lookup table
   * here, NOT the evaluator's msBool), anything else is "not a boolean"; an unset switch is off. The IntermediateOutputPath
   * values are classified by a TABLE (not by the evaluator's path model). The stamp is given as a state of THIS obj folder. */
  const ON = new Set(['true', 'yes', 'on', '!false', '!no', '!off']), OFF = new Set(['false', 'no', 'off', '!true', '!yes', '!on']);
  const word = (v) => { const x = String(v === undefined ? 'false' : v).toLowerCase(); return ON.has(x) ? 'on' : OFF.has(x) ? 'off' : 'other'; };
  const IOP_CLASS = { 'obj/Release/net10.0-android/': 'ok', '/elsewhere/obj/': 'ok', '': 'empty', ' ': 'blank', '.': 'project', 'obj/../': 'project' };
  const spec = (g, stamp) => {   // stamp: null = none in this obj folder (a stamp elsewhere = null), else its text
    const cfg = String(g.Configuration).toLowerCase();
    const css = word(g.SpixiLeanCss), js = word(g.SpixiLeanJs), full = word(g.SpixiLeanCssFull);
    const devEarly = g.SpixiDevCoexist !== undefined ? g.SpixiDevCoexist : (cfg === 'debug' ? 'true' : '');   // the csproj's Debug default (line 40): the value the ApplicationId line sees
    const devV = g.SpixiDevCoexist === undefined && g.LateDev !== undefined ? g.LateDev : devEarly;           // the FINAL value the guard sees: a late import wins over the default, a global over both
    const devW = devV === '' ? 'off' : word(devV);
    const storeW = g.SpixiStoreRelease === undefined ? 'off' : word(g.SpixiStoreRelease);
    const stripV = g.SpixiStripHtml !== undefined ? String(g.SpixiStripHtml).toLowerCase() : (cfg === 'release' ? 'true' : '');
    const iop = IOP_CLASS[g.IntermediateOutputPath === undefined ? 'obj/Release/net10.0-android/' : g.IntermediateOutputPath];
    if (iop === undefined) throw new Error('spec: unclassified IntermediateOutputPath ' + JSON.stringify(g.IntermediateOutputPath));
    const dtb = word(g.DesignTimeBuild) === 'on';
    const tf = g.TargetFramework === undefined ? '' : String(g.TargetFramework);
    if (storeW === 'on' && (cfg !== 'release' || devW === 'on')) return 'gate';   // the O-35 store gate (base): Release, no dev build
    const today = stripV === 'true' ? 'built:strip' : 'built:none';
    if (dtb) return today;   // D-4: no lean target, no lean Error in a design-time build (the tokens-only target as at the base)
    if (css === 'off' && js === 'off' && full === 'off') return stamp !== null && iop !== 'empty' && iop !== 'blank' ? 'stale' : today;   // legacy, also with an empty IntermediateOutputPath
    if (css === 'other') return 'typo-css';
    if (js === 'other') return 'typo-js';
    if (full !== 'off') return 'full';
    if (js === 'on') return 'js-parked';   // the PARK of P-07: after the typo / CssFull Errors, before everything else
    if (storeW === 'other') return 'store-word';   // r2 S-1
    if (devW === 'other') return 'dev-word';
    if (storeW === 'on') return 'store';
    if (devW !== 'on') return 'dev';               // r2 S-1: a lean build is a dev build
    if (!tf.includes('-android')) return 'not-android';   // r3 B-3: the dev id moves only for an Android target framework (an unset one included)
    /* r4 B-1: the app id by a TABLE of its own (not the evaluator): a global ApplicationId wins; else the dev id when the EARLY SpixiDevCoexist is on and the target is Android; else the production id */
    const appId = g.ApplicationId !== undefined ? String(g.ApplicationId) : ((devEarly === '' ? 'off' : word(devEarly)) === 'on' && tf.includes('-android') ? 'com.ixilabs.spixi.dev' : 'com.ixilabs.spixi');
    if (appId.toLowerCase() !== 'com.ixilabs.spixi.dev') return 'app-id';
    if (stripV !== 'true') return 'strip';
    if (iop !== 'ok') return 'iop';
    const now = 'css=' + (css === 'on') + ' js=' + (js === 'on');
    if (stamp !== null && stamp.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join(';') !== now) return 'stamp';
    return 'built:lean:' + [css === 'on' ? 'css' : '', js === 'on' ? 'js' : ''].filter(Boolean).join(',');
  };
  const pick = (o, k, vs) => (vs.length ? vs : [undefined]).flatMap((v) => o.map((x) => (v === undefined ? x : { ...x, [k]: v })));
  const mism = [], inv = []; const seen = {};
  const runCase = (g, stampState) => {
    const iopV = g.IntermediateOutputPath === undefined ? 'obj/Release/net10.0-android/' : g.IntermediateOutputPath;
    const here = stampPath(iopV);
    const disk = stampState === null ? new Map() : stampState.elsewhere ? new Map([[stampPath('obj/Debug/other/'), stampState.text]]) : new Map([[here, stampState.text]]);
    const b = B(g, disk), want = spec(g, stampState === null || stampState.elsewhere ? null : stampState.text), tag = JSON.stringify(g) + (stampState ? ' stamp=' + JSON.stringify(stampState) : '');
    if (typeof b === 'string') { mism.push(tag + ' -> ' + b); return; }
    const key = b.outcome.replace(/built:lean:.*/, 'built:lean'); seen[key] = (seen[key] || 0) + 1;
    if (b.outcome !== want) mism.push(tag + ' -> ' + b.outcome + ' (rule: ' + want + ') [' + b.trace.join(' > ') + ']');
    const at = (x) => b.trace.indexOf(x);
    if (b.trace.includes('run:SpixiLeanReleaseHtml') && !(at('run:SpixiLeanGuard') >= 0 && at('run:SpixiLeanGuard') < at('run:SpixiLeanReleaseHtml') && at('run:SpixiStripReleaseHtml') >= 0 && at('run:SpixiStripReleaseHtml') < at('run:SpixiLeanReleaseHtml'))) inv.push(tag + ' lean ran without guard then strip before it');
    if (b.stopped && ['typo-css', 'typo-js', 'full', 'js-parked', 'store-word', 'dev-word', 'store', 'dev', 'not-android', 'app-id', 'strip', 'iop', 'stamp', 'stale'].includes(b.stopped.cause) && (b.trace.includes('run:SpixiStripReleaseHtml') || b.trace.includes('run:SpixiLeanReleaseHtml'))) inv.push(tag + ' node would have started in a build the guard refuses');
    if (b.stopped && b.stopped.cause === 'iop-lean') inv.push(tag + ' the lean target\'s own IntermediateOutputPath belt fired: the tokens-only strip has already written into the project folder');
    if (b.stopped && b.stopped.cause === 'gate' && b.trace.some((x) => /^run:(SpixiLeanGuard|SpixiLeanStaleGuard|SpixiStripReleaseHtml|SpixiLeanReleaseHtml)$/.test(x))) inv.push(tag + ' gate refused but a later target ran');
    /* the stamp: written exactly once by a passing lean build (its obj folder, the evaluated switches), never otherwise */
    const lean2 = b.outcome.startsWith('built:lean');
    const wantStamp = lean2 ? [{ file: here, lines: 'css=' + /css/.test(b.outcome.slice(11)) + ' js=' + /js/.test(b.outcome.slice(11)), overwrite: 'true' }] : [];
    if (JSON.stringify(b.writes) !== JSON.stringify(wantStamp)) inv.push(tag + ' stamp writes ' + JSON.stringify(b.writes) + ', want ' + JSON.stringify(wantStamp));
    if (word(g.DesignTimeBuild) === 'on' && b.trace.some((x) => /^run:SpixiLean/.test(x))) inv.push(tag + ' a lean target ran in a design-time build');
    /* r2 S-1: a lean package only with the dev app id (the csproj's own ApplicationId test, evaluated on the body) */
    if (lean2 && unesc(b.P.ApplicationId || '').toLowerCase() !== 'com.ixilabs.spixi.dev') inv.push(tag + ' a lean build whose ApplicationId is ' + JSON.stringify(b.P.ApplicationId) + ', not com.ixilabs.spixi.dev (the production id)');
    /* r3 B-3: the dev id moves only when the TargetFramework contains -android (the second half of the app-id test, line 41) */
    if (lean2 && /js/.test(b.outcome.slice(11))) inv.push(tag + ' a lean build with the JS strip (P-07 is parked)');
    if (lean2 && !unesc(b.P.TargetFramework || '').includes('-android')) inv.push(tag + ' a lean build that is not an Android build (the production id)');
  };
  /* A — every switch value class, the store / dev values (incl. values that are not boolean words), default folder, no design-time build, no stamp */
  let A = [{ TargetFramework: ANDROID }];
  A = pick(A, 'Configuration', ['Debug', 'Release']);
  A = pick(A, 'SpixiStripHtml', [undefined, 'false', 'true']);
  A = pick(A, 'SpixiLeanCss', [undefined, 'false', 'true', 'True', '1', 'on', 'OFF', '']);
  A = pick(A, 'SpixiLeanJs', [undefined, 'false', 'true', 'yes', 'no', 'tru', '2', '!false']);
  A = pick(A, 'SpixiLeanCssFull', [undefined, 'true', 'no']);
  A = pick(A, 'SpixiStoreRelease', [undefined, 'true', '1', 'true ']);
  A = pick(A, 'SpixiDevCoexist', [undefined, 'true', 'yes', 'false', '1', 'true ']);
  for (const g of A) runCase(g, null);
  /* C — the design-time build × the IntermediateOutputPath values × the store / dev builds, no stamp */
  let C = [{ TargetFramework: ANDROID }];
  C = pick(C, 'Configuration', ['Debug', 'Release']);
  C = pick(C, 'SpixiStripHtml', [undefined, 'false', 'true']);
  C = pick(C, 'SpixiLeanCss', [undefined, 'true', '1']);
  C = pick(C, 'SpixiLeanJs', [undefined, 'true', 'no']);
  C = pick(C, 'SpixiLeanCssFull', [undefined, 'true']);
  C = pick(C, 'SpixiStoreRelease', [undefined, 'true']);
  C = pick(C, 'SpixiDevCoexist', [undefined, 'true']);
  C = pick(C, 'DesignTimeBuild', [undefined, 'true']);
  C = pick(C, 'IntermediateOutputPath', [undefined, '', ' ', '.', 'obj/../', '/elsewhere/obj/']);
  for (const g of C) runCase(g, null);
  /* B — the stamp states */
  let Bm = [{ TargetFramework: ANDROID }];
  Bm = pick(Bm, 'Configuration', ['Debug', 'Release']);
  Bm = pick(Bm, 'SpixiStripHtml', [undefined, 'false', 'true']);
  Bm = pick(Bm, 'SpixiLeanCss', [undefined, 'true', 'yes', '1']);
  Bm = pick(Bm, 'SpixiLeanJs', [undefined, 'true', 'no', 'tru']);
  Bm = pick(Bm, 'SpixiLeanCssFull', [undefined, 'true']);
  Bm = pick(Bm, 'SpixiStoreRelease', [undefined, 'true']);
  Bm = pick(Bm, 'SpixiDevCoexist', [undefined, 'true']);
  Bm = pick(Bm, 'DesignTimeBuild', [undefined, 'true']);
  Bm = pick(Bm, 'IntermediateOutputPath', [undefined, '.', '']);
  const STAMPS = [{ text: 'css=true js=true\n' }, { text: 'css=true js=false\r\n' }, { text: 'css=false js=true' }, { text: 'garbage\n' }, { text: '' }, { text: 'css=true js=true\n', elsewhere: true }];
  for (const g of Bm) for (const s of STAMPS) runCase(g, s);
  /* E — the TargetFramework dimension (r3 B-3), no stamp: unset, empty, Android (with and without a platform version), iOS, Mac Catalyst, Windows */
  let E = [{}];
  E = pick(E, 'Configuration', ['Debug', 'Release']);
  E = pick(E, 'SpixiStripHtml', [undefined, 'true']);
  E = pick(E, 'SpixiLeanCss', [undefined, 'true']);
  E = pick(E, 'SpixiLeanJs', [undefined, 'true', 'tru']);
  E = pick(E, 'SpixiLeanCssFull', [undefined, 'true']);
  E = pick(E, 'SpixiStoreRelease', [undefined, 'true', '1']);
  E = pick(E, 'SpixiDevCoexist', [undefined, 'true', 'false']);
  E = pick(E, 'TargetFramework', [undefined, '', 'net10.0-android', 'net10.0-android35.0', 'net10.0-ios', 'net10.0-maccatalyst', 'net10.0-windows10.0.19041.0']);
  for (const g of E) runCase(g, null);
  /* F — the app id decided at evaluation time (r4 B-1): a late SpixiDevCoexist and a global ApplicationId, against the guard's final values */
  let F = [{}];
  F = pick(F, 'Configuration', ['Debug', 'Release']);
  F = pick(F, 'SpixiStripHtml', [undefined, 'true']);
  F = pick(F, 'SpixiLeanCss', [undefined, 'true']);
  F = pick(F, 'LateDev', [undefined, 'true', 'false']);
  F = pick(F, 'SpixiDevCoexist', [undefined, 'true', 'false']);
  F = pick(F, 'ApplicationId', [undefined, 'com.ixilabs.spixi', 'com.example.other', 'COM.IXILABS.SPIXI.DEV', 'com.ixilabs.spixi.dev']);
  F = pick(F, 'TargetFramework', [undefined, 'net10.0-android', 'net10.0-ios']);
  F = pick(F, 'SpixiStoreRelease', [undefined, 'true']);
  for (const g of F) runCase(g, null);
  const nB = Bm.length * STAMPS.length, nBuilds = A.length + C.length + nB + E.length + F.length;
  ok(mism.length === 0 && inv.length === 0 && A.length === 27648 && C.length === 5184 && nB === 27648 && E.length === 3024 && F.length === 2160 && ['built:lean', 'dev', 'dev-word', 'store-word', 'store', 'not-android', 'app-id', 'stamp', 'stale', 'iop', 'gate'].every((k) => seen[k] > 0),
    T + ' (6) matrices — A ' + A.length + ' builds (Configuration × SpixiStripHtml × SpixiLeanCss × SpixiLeanJs × SpixiLeanCssFull × SpixiStoreRelease {unset, true, 1, \'true \'} × SpixiDevCoexist {unset, true, yes, false, 1, \'true \'}) + C ' + C.length + ' (× DesignTimeBuild × 6 IntermediateOutputPath values) + B ' + nB + ' with a stamp (6 stamp states) + F ' + F.length + ' (Configuration × SpixiStripHtml × SpixiLeanCss × LateDev {unset, true, false: SpixiDevCoexist set by a file imported after the body} × SpixiDevCoexist × a global ApplicationId {unset, production, other, upper-case dev, dev} × TargetFramework × SpixiStoreRelease) + E ' + E.length + ' (Configuration × SpixiStripHtml × SpixiLeanCss × SpixiLeanJs × SpixiLeanCssFull × SpixiStoreRelease × SpixiDevCoexist × TargetFramework {unset, \'\', android, android35.0, ios, maccatalyst, windows}) = ' + nBuilds + ', each equal to the written-out rule (a switch is on / off by MSBuild\'s boolean words true, yes, on / false, no, off in any case or negated with !; the store gate first; a design-time build = today; all off = tokens-only or nothing, or the stale Error when THIS obj folder holds a stamp (not for an empty / white-space IntermediateOutputPath); else the guard refuses a non-boolean lean value / CssFull / a store or dev value that is not a boolean word / a store build / a build that is not a dev build / a build whose TargetFramework is not Android / a build whose evaluated ApplicationId is not the dev id (a late SpixiDevCoexist, a global ApplicationId) / no-strip / an empty, white-space or project-folder IntermediateOutputPath / a stamp of other switches, in that order; else lean); in each the lean body ran only after the guard and the tokens-only strip, node never started in a refused build, the stamp was written once by each passing lean build and by no other build, and every lean build has the dev app id of an Android build; outcomes ' + JSON.stringify(seen) + ' — ' + (mism.length ? mism.length + ' mismatch(es), first: ' + mism.slice(0, 2).join(' || ') : 'no mismatch') + (inv.length ? ' · invariants: ' + inv.length + ', first: ' + inv.slice(0, 2).join(' || ') : ''));

  /* ================= row 7 — the open tags, the order and the hooks in the file ================= */
  const names = ['SpixiStoreReleaseGate', 'SpixiLeanGuard', 'SpixiLeanStaleGuard', 'SpixiStripReleaseHtml', 'SpixiLeanReleaseHtml'];
  const at5 = names.map((n) => targets.findIndex((t) => t.a.Name === n));
  const leanT = tgt('SpixiLeanReleaseHtml'), guardT = tgt('SpixiLeanGuard'), staleT = tgt('SpixiLeanStaleGuard');
  /* the exact open tag of each lean target (every attribute; an added Inputs / Outputs / Returns / KeepDuplicateOutputs = red) — hard-coded from the delivered csproj */
  const OPEN = {
    SpixiLeanGuard: '<Target Name="SpixiLeanGuard" BeforeTargets="PrepareForBuild" Condition="\'$(DesignTimeBuild)\' != \'true\' and (\'$(SpixiLeanCss)\' != \'false\' or \'$(SpixiLeanCssFull)\' != \'false\' or \'$(SpixiLeanJs)\' != \'false\')">',
    SpixiLeanStaleGuard: '<Target Name="SpixiLeanStaleGuard" BeforeTargets="PrepareForBuild" Condition="\'$(DesignTimeBuild)\' != \'true\' and \'$(IntermediateOutputPath.Trim())\' != \'\' and \'$(SpixiLeanCss)\' == \'false\' and \'$(SpixiLeanCssFull)\' == \'false\' and \'$(SpixiLeanJs)\' == \'false\'">',
    SpixiLeanReleaseHtml: '<Target Name="SpixiLeanReleaseHtml" BeforeTargets="PrepareForBuild" DependsOnTargets="SpixiLeanGuard;SpixiStripReleaseHtml" Condition="\'$(DesignTimeBuild)\' != \'true\' and \'$(SpixiStripHtml)\' == \'true\' and (\'$(SpixiLeanCss)\' == \'true\' or \'$(SpixiLeanJs)\' == \'true\')">',
  };
  const IOP_COND = '\'$(IntermediateOutputPath.Trim())\' == \'\' or \'$([MSBuild]::NormalizeDirectory(`$(MSBuildProjectDirectory)`, `$(IntermediateOutputPath)`))\' == \'$([MSBuild]::NormalizeDirectory(`$(MSBuildProjectDirectory)`))\'';
  const DEV_COND = '\'$(SpixiDevCoexist)\' != \'true\'';
  const PARK_COND = '\'$(SpixiLeanJs)\' != \'false\'';   // the PARK of P-07
  const APPID_COND = '\'$(ApplicationId)\' != \'com.ixilabs.spixi.dev\'';   // r4 B-1: the guarantee itself, tested on the id as it was DECIDED (when the project file was read)
  const ANDROID_COND = '!$(TargetFramework.Contains(\'-android\'))';   // r3 B-3: the negation of the second half of the app-id test (csproj line 41), the same expression
  const errorsOf = (t) => (t ? [...t.body.matchAll(new RegExp('<Error\\b' + ATTRS + '\\s*\\/>', 'g'))].map((m) => parseAttrs(m[1])) : []);
  const r7 = {
    allDefinedOnce: names.every((n) => targets.filter((t) => t.a.Name === n).length === 1),
    fileOrder: at5.every((v) => v >= 0) && at5.every((v, i) => i === 0 || at5[i - 1] < v),
    hooks: names.every((n) => tgt(n) && tgt(n).a.BeforeTargets === 'PrepareForBuild'),
    openTags: Object.entries(OPEN).every(([n, o]) => tgt(n) && tgt(n).open === o),
    depends: !!leanT && JSON.stringify(list(leanT.a.DependsOnTargets)) === JSON.stringify(['SpixiLeanGuard', 'SpixiStripReleaseHtml']),
    guardErrors: JSON.stringify(errorsOf(guardT).map((a) => a.Condition)) === JSON.stringify(['\'$(SpixiLeanCss)\' != \'true\' and \'$(SpixiLeanCss)\' != \'false\'', '\'$(SpixiLeanJs)\' != \'true\' and \'$(SpixiLeanJs)\' != \'false\'', '\'$(SpixiLeanCssFull)\' != \'false\'', PARK_COND, '\'$(SpixiStoreRelease)\' != \'\' and \'$(SpixiStoreRelease)\' != \'true\' and \'$(SpixiStoreRelease)\' != \'false\'', '\'$(SpixiDevCoexist)\' != \'\' and \'$(SpixiDevCoexist)\' != \'true\' and \'$(SpixiDevCoexist)\' != \'false\'', '\'$(SpixiStoreRelease)\' == \'true\'', DEV_COND, ANDROID_COND, APPID_COND, '\'$(SpixiStripHtml)\' != \'true\'', IOP_COND, 'Exists(\'$(_SpixiLeanStamp)\') and \'$(_SpixiLeanStampWas)\' != \'$(_SpixiLeanState)\'']),
    storeSameAsGate: !!tgt('SpixiStoreReleaseGate') && tgt('SpixiStoreReleaseGate').a.Condition === '\'$(SpixiStoreRelease)\' == \'true\'' && errorsOf(guardT).filter((a) => a.Condition === '\'$(SpixiStoreRelease)\' == \'true\'').length === 1,
    /* r2 S-1: the dev test of the guard is the NEGATION of the csproj's own app-id test (the same comparison text), so both agree for every spelling */
    devSameAsAppId: (() => { const ids = [...body.matchAll(/<(ApplicationId|ApplicationTitle|DefineConstants) Condition="'\$\(SpixiDevCoexist\)' == 'true'( and [^"]*)?">/g)].length; return ids === 3 && errorsOf(guardT).filter((a) => a.Condition === DEV_COND).length === 1 && errorsOf(tgt('SpixiStoreReleaseGate')).some((a) => a.Condition === '\'$(SpixiDevCoexist)\' == \'true\''); })(),
    /* r3 B-3: the Android test of the guard is the negation of the TargetFramework half of the app-id test: the very expression of the ApplicationId and ApplicationTitle lines */
    androidSameAsAppId: (() => { const ids = [...body.matchAll(/<(ApplicationId|ApplicationTitle) Condition="'\$\(SpixiDevCoexist\)' == 'true' and (\$\(TargetFramework\.Contains\('-android'\)\))">/g)]; return ids.length === 2 && ids.every((m) => '!' + m[2] === ANDROID_COND) && errorsOf(guardT).filter((a) => a.Condition === ANDROID_COND).length === 1; })(),
    appIdLiteralIsTheDevId: (() => { const dev = /<ApplicationId Condition="'\$\(SpixiDevCoexist\)' == 'true' and \$\(TargetFramework\.Contains\('-android'\)\)">([^<]*)<\/ApplicationId>/.exec(body); return !!dev && APPID_COND === '\'$(ApplicationId)\' != \'' + dev[1] + '\'' && errorsOf(guardT).filter((a) => a.Condition === APPID_COND).length === 1; })(),   // the literal of the Error = the id of the dev line
    staleOneError: (() => { const e = errorsOf(staleT); return e.length === 1 && e[0].Condition === 'Exists(\'$([MSBuild]::NormalizePath(`$(MSBuildProjectDirectory)`, `$(IntermediateOutputPath)`, `spixi-lean.stamp`))\')'; })(),
    /* the stamp path is ONE formula: the guard's _SpixiLeanStamp (read, compared, written by the lean target) = the stale guard's Exists argument */
    oneStampFormula: !!guardT && guardT.body.includes('<_SpixiLeanStamp>$([MSBuild]::NormalizePath(\'$(MSBuildProjectDirectory)\', \'$(IntermediateOutputPath)\', \'spixi-lean.stamp\'))</_SpixiLeanStamp>') && count(cs, '<_SpixiLeanStamp>') === 1,
  };
  ok(Object.values(r7).every(Boolean),
    T + ' (7) open tags and order — in the file SpixiStoreReleaseGate < SpixiLeanGuard < SpixiLeanStaleGuard < SpixiStripReleaseHtml < SpixiLeanReleaseHtml (positions ' + at5.join(' < ') + '), all five BeforeTargets="PrepareForBuild", the EXACT open tag of the three lean targets (every attribute: the DesignTimeBuild test, the Conditions, DependsOnTargets="SpixiLeanGuard;SpixiStripReleaseHtml", no Inputs / Outputs), the thirteen guard Error Conditions in order (typo css, typo js, CssFull, SpixiLeanJs on = the PARK of P-07, a store value and a dev value that are not boolean words, the store build with the store gate\'s own Condition text, not a dev build = the negation of the app-id test of the csproj, not Android = the negation of its TargetFramework half, the evaluated ApplicationId is not the dev id (the literal of the dev ApplicationId line), no strip, the IntermediateOutputPath test, the stamp compare), the ONE stale Error, one stamp path formula (the file order is what MSBuild runs; DependsOnTargets alone would hide a moved target) — ' + JSON.stringify(r7));

  /* ================= row 8 — the structural belt: every element of the three lean targets, in order ================= */
  /* Each element = its name, its attributes SORTED by name with their exact values, and its text (property values); a closing
   * tag is "/Name". Hard-coded from the delivered csproj (not derived from it): an added ContinueOnError / Condition change /
   * Inputs / an extra task (Delete, Copy, Exec, CallTarget, MSBuild …) / a reordered Error = red, with the first difference. */
  const elementsOf = (t) => {
    if (!t) return [];
    const out = [];
    for (const m of t.body.matchAll(/<(\/?)([A-Za-z_][\w.]*)((?:\s+[\w.]+="[^"]*")*)\s*(\/?)>|([^<]+)/g)) {
      if (m[5] !== undefined) { const txt = m[5].trim(); if (txt) { if (!out.length) out.push('#text'); out[out.length - 1] += ' = ' + JSON.stringify(txt); } continue; }
      if (m[1]) { out.push('/' + m[2]); continue; }
      const a = [...m[3].matchAll(/([\w.]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]).sort((p, q) => (p[0] < q[0] ? -1 : 1));
      out.push(m[2] + a.map(([k, v]) => ' ' + k + '=' + JSON.stringify(v)).join('') + (m[4] ? ' /' : ''));
    }
    return out;
  };
  const BELT = {
    SpixiLeanGuard: [
      "Error Condition=\"'$(SpixiLeanCss)' != 'true' and '$(SpixiLeanCss)' != 'false'\" Text=\"Spixi lean packaging: SpixiLeanCss='$(SpixiLeanCss)' is not true or false. Set it to true, or remove the property (a -p: switch, an environment variable, or a props / .user file).\" /",
      "Error Condition=\"'$(SpixiLeanJs)' != 'true' and '$(SpixiLeanJs)' != 'false'\" Text=\"Spixi lean packaging: SpixiLeanJs='$(SpixiLeanJs)' is not true or false. Set it to true, or remove the property (a -p: switch, an environment variable, or a props / .user file).\" /",
      "Error Condition=\"'$(SpixiLeanCssFull)' != 'false'\" Text=\"Spixi lean packaging: SpixiLeanCssFull (the lean v2 step) is not built in this batch (SpixiLeanCssFull=$(SpixiLeanCssFull)). Remove the property (a -p: switch, an environment variable, or a props / .user file); the comment strip of the stylesheets is SpixiLeanCss=true.\" /",
      "Error Condition=\"'$(SpixiLeanJs)' != 'false'\" Text=\"Spixi lean packaging: SpixiLeanJs (the comment strip of the scripts, P-07) is PARKED in this batch (SpixiLeanJs=$(SpixiLeanJs)): its review found a fault that is not fixed, so no build may pack its output (DECISIONS 1583 and 1589). Remove the property (a -p: switch, an environment variable, or a props / .user file); the comment strip of the stylesheets is SpixiLeanCss=true.\" /",
      "Error Condition=\"'$(SpixiStoreRelease)' != '' and '$(SpixiStoreRelease)' != 'true' and '$(SpixiStoreRelease)' != 'false'\" Text=\"Spixi lean packaging: SpixiStoreRelease='$(SpixiStoreRelease)' is not true or false, and a lean build needs a clear answer (such a value skips the store gate). Set it to true or false, or remove the property (a -p: switch, an environment variable, or a props / .user file).\" /",
      "Error Condition=\"'$(SpixiDevCoexist)' != '' and '$(SpixiDevCoexist)' != 'true' and '$(SpixiDevCoexist)' != 'false'\" Text=\"Spixi lean packaging: SpixiDevCoexist='$(SpixiDevCoexist)' is not true or false, and a lean build needs a clear answer (such a value skips the dev app id). Set it to true, or remove the property (a -p: switch, an environment variable, or a props / .user file).\" /",
      "Error Condition=\"'$(SpixiStoreRelease)' == 'true'\" Text=\"Spixi lean packaging: a store build (SpixiStoreRelease=$(SpixiStoreRelease)) cannot be lean before the ruling of the lean defaults (SpixiLeanCss=$(SpixiLeanCss), SpixiLeanJs=$(SpixiLeanJs)). Remove the lean property (a -p: switch, an environment variable, or a props / .user file).\" /",
      "Error Condition=\"'$(SpixiDevCoexist)' != 'true'\" Text=\"Spixi lean packaging: a lean package is allowed only in a dev build before the ruling of the lean defaults, and SpixiDevCoexist is '$(SpixiDevCoexist)' (Configuration=$(Configuration)). Pass -p:SpixiDevCoexist=true (the package id is com.ixilabs.spixi.dev on Android), or remove the lean property (a -p: switch, an environment variable, or a props / .user file) for a production-id build.\" /",
      "Error Condition=\"!$(TargetFramework.Contains('-android'))\" Text=\"Spixi lean packaging: a lean package is allowed only for Android before the ruling of the lean defaults, and TargetFramework is '$(TargetFramework)': only there SpixiDevCoexist=true moves the app id to com.ixilabs.spixi.dev; an iOS, Mac or Windows package keeps the production id. Build with -f net10.0-android, or remove the lean property (a -p: switch, an environment variable, or a props / .user file).\" /",
      "Error Condition=\"'$(ApplicationId)' != 'com.ixilabs.spixi.dev'\" Text=\"Spixi lean packaging: a lean package is allowed only with the dev app id before the ruling of the lean defaults, and ApplicationId is '$(ApplicationId)' (SpixiDevCoexist=$(SpixiDevCoexist), TargetFramework=$(TargetFramework)): the id is decided when the project file is read, so a SpixiDevCoexist that is set later (a .csproj.user file, a Directory.Build.targets file) or an ApplicationId on the build line does not give the dev id. Pass -p:SpixiDevCoexist=true -f net10.0-android on the build line, or remove the lean property (a -p: switch, an environment variable, or a props / .user file).\" /",
      "Error Condition=\"'$(SpixiStripHtml)' != 'true'\" Text=\"Spixi lean packaging: SpixiLeanCss=$(SpixiLeanCss) / SpixiLeanJs=$(SpixiLeanJs) needs the Release packaging strip, but SpixiStripHtml is '$(SpixiStripHtml)' (Configuration=$(Configuration)). A lean switch needs SpixiStripHtml=true, which is on by default only in Release: build -c Release without SpixiStripHtml=false, or remove the lean property (a -p: switch, an environment variable, or a props / .user file).\" /",
      "Error Condition=\"'$(IntermediateOutputPath.Trim())' == '' or '$([MSBuild]::NormalizeDirectory(`$(MSBuildProjectDirectory)`, `$(IntermediateOutputPath)`))' == '$([MSBuild]::NormalizeDirectory(`$(MSBuildProjectDirectory)`))'\" Text=\"Spixi lean packaging: IntermediateOutputPath='$(IntermediateOutputPath)' is empty, only white space, or the project folder itself — refusing a lean build (its output directory would be inside the working tree, beside the sources). Leave IntermediateOutputPath to the SDK, or set it to another folder.\" /",
      "PropertyGroup",
      "_SpixiLeanStamp = \"$([MSBuild]::NormalizePath('$(MSBuildProjectDirectory)', '$(IntermediateOutputPath)', 'spixi-lean.stamp'))\"",
      "/_SpixiLeanStamp",
      "_SpixiLeanState = \"css=false\"",
      "/_SpixiLeanState",
      "_SpixiLeanState Condition=\"'$(SpixiLeanCss)' == 'true'\" = \"css=true\"",
      "/_SpixiLeanState",
      "_SpixiLeanState Condition=\"'$(SpixiLeanJs)' == 'true'\" = \"$(_SpixiLeanState) js=true\"",
      "/_SpixiLeanState",
      "_SpixiLeanState Condition=\"'$(SpixiLeanJs)' != 'true'\" = \"$(_SpixiLeanState) js=false\"",
      "/_SpixiLeanState",
      "_SpixiLeanStampWas",
      "/_SpixiLeanStampWas",
      "/PropertyGroup",
      "ReadLinesFromFile Condition=\"Exists('$(_SpixiLeanStamp)')\" File=\"$(_SpixiLeanStamp)\"",
      "Output PropertyName=\"_SpixiLeanStampWas\" TaskParameter=\"Lines\" /",
      "/ReadLinesFromFile",
      "Error Condition=\"Exists('$(_SpixiLeanStamp)') and '$(_SpixiLeanStampWas)' != '$(_SpixiLeanState)'\" Text=\"Spixi lean packaging: the lean switches changed in this obj folder: $(_SpixiLeanStamp) says '$(_SpixiLeanStampWas)', this build is '$(_SpixiLeanState)'. The bin or publish folder can still hold the files of the earlier build (a copy by timestamp keeps them). Delete Spixi\\\\obj and Spixi\\\\bin (and the publish folder), then build again; only GATE 1 on the deployed folder proves a package.\" /",
    ],
    SpixiLeanStaleGuard: [
      "Error Condition=\"Exists('$([MSBuild]::NormalizePath(`$(MSBuildProjectDirectory)`, `$(IntermediateOutputPath)`, `spixi-lean.stamp`))')\" Text=\"Spixi lean packaging: every lean switch is off, but $([MSBuild]::NormalizePath('$(MSBuildProjectDirectory)', '$(IntermediateOutputPath)', 'spixi-lean.stamp')) exists: a LEAN build ran in this obj folder, and the bin or publish folder can still hold its lean files (a copy by timestamp keeps them). Delete Spixi\\\\obj and Spixi\\\\bin (and the publish folder), then build again; only GATE 1 on the deployed folder proves a package.\" /",
    ],
    SpixiLeanReleaseHtml: [
      "Error Condition=\"'$(IntermediateOutputPath.Trim())' == '' or '$([MSBuild]::NormalizeDirectory(`$(MSBuildProjectDirectory)`, `$(IntermediateOutputPath)`))' == '$([MSBuild]::NormalizeDirectory(`$(MSBuildProjectDirectory)`))'\" Text=\"Spixi lean packaging: IntermediateOutputPath='$(IntermediateOutputPath)' is empty, only white space, or the project folder itself at target time — refusing to empty a directory in the working tree\" /",
      "PropertyGroup",
      "SpixiLeanHtmlDir = \"$([MSBuild]::NormalizeDirectory('$(MSBuildProjectDirectory)', '$(IntermediateOutputPath)', 'spixi-lean', 'html'))\"",
      "/SpixiLeanHtmlDir",
      "SpixiLeanScript = \"$([MSBuild]::NormalizePath('$(MSBuildProjectDirectory)', '..', 'scripts', 'strip-release.mjs'))\"",
      "/SpixiLeanScript",
      "SpixiLeanFlags",
      "/SpixiLeanFlags",
      "SpixiLeanFlags Condition=\"'$(SpixiLeanCss)' == 'true'\" = \"$(SpixiLeanFlags) --lean-css\"",
      "/SpixiLeanFlags",
      "SpixiLeanFlags Condition=\"'$(SpixiLeanJs)' == 'true'\" = \"$(SpixiLeanFlags) --lean-js\"",
      "/SpixiLeanFlags",
      "/PropertyGroup",
      "RemoveDir Directories=\"$(SpixiLeanHtmlDir)\" /",
      "Error Condition=\"Exists('$(SpixiLeanHtmlDir)')\" Text=\"Spixi lean packaging: could not empty $(SpixiLeanHtmlDir) — a file of an earlier build could be packaged; refusing\" /",
      "Exec Command=\"node &quot;$(SpixiLeanScript)&quot; --out &quot;$(SpixiLeanHtmlDir).&quot;$(SpixiLeanFlags)\" /",
      "ItemGroup",
      "_SpixiLeanFile Include=\"$(SpixiLeanHtmlDir)**\" /",
      "_SpixiLeanFile LogicalName=\"html$([System.IO.Path]::DirectorySeparatorChar)%(RecursiveDir)%(Filename)%(Extension)\" /",
      "/ItemGroup",
      "Error Condition=\"'@(_SpixiLeanFile)' == ''\" Text=\"Spixi lean packaging: strip-release.mjs$(SpixiLeanFlags) wrote no file into $(SpixiLeanHtmlDir) — refusing to package\" /",
      "ItemGroup",
      "_SpixiLeanOrphan Include=\"@(_SpixiLeanFile)\" /",
      "_SpixiLeanOrphan MatchOnMetadata=\"LogicalName\" Remove=\"@(MauiAsset)\" /",
      "/ItemGroup",
      "Error Condition=\"'@(_SpixiLeanOrphan)' != ''\" Text=\"Spixi lean packaging: strip-release.mjs$(SpixiLeanFlags) wrote file(s) that no MauiAsset carries: @(_SpixiLeanOrphan->'%(LogicalName)', ', ') — refusing to package\" /",
      "ItemGroup",
      "_SpixiLeanMust Condition=\"'$(SpixiLeanCss)' == 'true'\" Include=\"Resources\\\\Raw\\\\html\\\\**\\\\*.css\" /",
      "_SpixiLeanMust Condition=\"'$(SpixiLeanJs)' == 'true'\" Include=\"Resources\\\\Raw\\\\html\\\\spixi.bundle.js;Resources\\\\Raw\\\\html\\\\spixi.strings.js;Resources\\\\Raw\\\\html\\\\spixi.icons.js\" /",
      "_SpixiLeanMust LogicalName=\"html$([System.IO.Path]::DirectorySeparatorChar)%(RecursiveDir)%(Filename)%(Extension)\" /",
      "_SpixiLeanMust MatchOnMetadata=\"LogicalName\" Remove=\"@(_SpixiLeanFile)\" /",
      "/ItemGroup",
      "Error Condition=\"'@(_SpixiLeanMust)' != ''\" Text=\"Spixi lean packaging: strip-release.mjs$(SpixiLeanFlags) did not write @(_SpixiLeanMust->'%(LogicalName)', ', ') (does the script know these flags?) — refusing to package a half-lean build\" /",
      "PropertyGroup",
      "_SpixiLeanCount = \"@(_SpixiLeanFile->Count())\"",
      "/_SpixiLeanCount",
      "_SpixiLeanAssetsBefore = \"@(MauiAsset->Count())\"",
      "/_SpixiLeanAssetsBefore",
      "/PropertyGroup",
      "ItemGroup",
      "MauiAsset MatchOnMetadata=\"LogicalName\" Remove=\"@(_SpixiLeanFile)\" /",
      "/ItemGroup",
      "PropertyGroup",
      "_SpixiLeanAssetsKept = \"@(MauiAsset->Count())\"",
      "/_SpixiLeanAssetsKept",
      "_SpixiLeanRemoved = \"$([MSBuild]::Subtract($(_SpixiLeanAssetsBefore), $(_SpixiLeanAssetsKept)))\"",
      "/_SpixiLeanRemoved",
      "/PropertyGroup",
      "Error Condition=\"'$(_SpixiLeanRemoved)' != '$(_SpixiLeanCount)'\" Text=\"Spixi lean packaging: $(_SpixiLeanCount) lean file(s) replaced $(_SpixiLeanRemoved) MauiAsset item(s) — a LogicalName is carried twice; refusing to package\" /",
      "ItemGroup",
      "MauiAsset Include=\"@(_SpixiLeanFile)\" LogicalName=\"%(_SpixiLeanFile.LogicalName)\" /",
      "/ItemGroup",
      "PropertyGroup",
      "_SpixiLeanAssetsAfter = \"@(MauiAsset->Count())\"",
      "/_SpixiLeanAssetsAfter",
      "/PropertyGroup",
      "Error Condition=\"'$(_SpixiLeanAssetsAfter)' != '$(_SpixiLeanAssetsBefore)'\" Text=\"Spixi lean packaging: $(_SpixiLeanAssetsBefore) MauiAsset item(s) before the swap, $(_SpixiLeanAssetsAfter) after — refusing to package\" /",
      "WriteLinesToFile File=\"$(_SpixiLeanStamp)\" Lines=\"$(_SpixiLeanState)\" Overwrite=\"true\" /",
      "Message Importance=\"high\" Text=\"Spixi: LEAN Release packaging applied (SpixiLeanCss=$(SpixiLeanCss), SpixiLeanJs=$(SpixiLeanJs), SpixiLeanCssFull=$(SpixiLeanCssFull); strip-release.mjs$(SpixiLeanFlags)) — $(_SpixiLeanCount) asset(s) swapped from $(SpixiLeanHtmlDir), every other asset as the tokens-only strip left it. This REPLACES the gate line above: GATE 1: node scripts/strip-release.mjs --check &lt;the DEPLOYED html folder&gt;$(SpixiLeanFlags) (never this obj dir, which holds only the lean files); GATE 2: node scripts/smoke-packaged.mjs$(SpixiLeanFlags). A DEV build (SpixiDevCoexist=$(SpixiDevCoexist)): no lean production-id package before the ruling of the lean defaults. Stamp $(_SpixiLeanStamp) = '$(_SpixiLeanState)': when a lean switch changes, delete Spixi\\\\obj and Spixi\\\\bin (and the publish folder) first, or the next build stops.\" /",
    ],
  };
  const firstDiff = (got, want) => { for (let i = 0; i < Math.max(got.length, want.length); i++) if (got[i] !== want[i]) return '#' + i + ' got ' + JSON.stringify((got[i] || '(none)').slice(0, 160)) + ', want ' + JSON.stringify((want[i] || '(none)').slice(0, 160)); return null; };
  const beltDiff = Object.fromEntries(Object.entries(BELT).map(([n, want]) => [n, firstDiff(elementsOf(tgt(n)), want)]).filter(([, d]) => d));
  const lb = leanT ? leanT.body : '';
  const msg = (/<Message\s+Importance="high"\s+Text="([^"]*)"\s*\/>/.exec(lb) || [])[1] || '';
  const lastErrorAt = [...lb.matchAll(/<Error\b/g)].map((m) => m.index).pop();
  const r8 = {
    belt: Object.keys(beltDiff).length === 0,
    /* the Message names both switch values, the CssFull value, the flags and the swapped count, and starts with the text the walk sheet quotes */
    message: msg.startsWith('Spixi: LEAN Release packaging applied (SpixiLeanCss=$(SpixiLeanCss), SpixiLeanJs=$(SpixiLeanJs), SpixiLeanCssFull=$(SpixiLeanCssFull); strip-release.mjs$(SpixiLeanFlags)) — $(_SpixiLeanCount) asset(s) swapped from $(SpixiLeanHtmlDir)') && msg.includes('Stamp $(_SpixiLeanStamp) = \'$(_SpixiLeanState)\'') && msg.includes('A DEV build (SpixiDevCoexist=$(SpixiDevCoexist))'),
    /* the stamp is written AFTER the last Error of the swap and before the Message: a refused swap leaves no stamp */
    stampAfterChecks: lastErrorAt >= 0 && lb.indexOf('<WriteLinesToFile ') > lastErrorAt && lb.indexOf('<WriteLinesToFile ') < lb.indexOf('<Message ') && count(cs, '<WriteLinesToFile ') === 1 && count(cs, '<ReadLinesFromFile ') === 1,
    /* the Exec is the ONLY Exec of the lean targets, and no lean target calls another target, project or task by name */
    oneExec: count(lb, '<Exec ') === 1 && !/<Exec\b/.test((guardT || {}).body || '') && !/<Exec\b/.test((staleT || {}).body || '') && ![guardT, staleT, leanT].some((t) => t && /<(CallTarget|MSBuild|Delete|Copy|Touch|Move|ItemGroup)\b/.test(t === leanT ? '' : t.body)),
  };
  ok(Object.values(r8).every(Boolean),
    T + ' (8) structural belt — the exact ordered element list of SpixiLeanGuard (' + BELT.SpixiLeanGuard.length + ' entries), SpixiLeanStaleGuard (' + BELT.SpixiLeanStaleGuard.length + ') and SpixiLeanReleaseHtml (' + BELT.SpixiLeanReleaseHtml.length + '): each element with its full attribute set and value, its text and its place (an added ContinueOnError, an Inputs / Outputs, a changed Condition or Text, an extra task = red); the lean Message names SpixiLeanCss, SpixiLeanJs, SpixiLeanCssFull, the flags and the swapped count and the stamp; the stamp is written once, after the last Error of the swap; one Exec, none in the guards, the guards touch no item — ' + (Object.keys(beltDiff).length ? 'FIRST DIFFERENCE: ' + JSON.stringify(beltDiff) + ' · ' : '') + JSON.stringify(r8));

  /* ================= row 9 — the item swap ================= */
  const pos = (s) => lb.indexOf(s);
  const errAt = (cond) => { const m = [...lb.matchAll(new RegExp('<Error\\b' + ATTRS + '\\s*\\/>', 'g'))].filter((x) => parseAttrs(x[1]).Condition === cond); return m.length === 1 ? m[0].index : -1; };
  const EXEC_LEAN = '<Exec Command="node &quot;$(SpixiLeanScript)&quot; --out &quot;$(SpixiLeanHtmlDir).&quot;$(SpixiLeanFlags)" />';
  const REMOVE_DIR = '<RemoveDir Directories="$(SpixiLeanHtmlDir)" />';
  const p7 = {
    iop: errAt(IOP_COND), dir: pos('<SpixiLeanHtmlDir>'), script: pos('<SpixiLeanScript>'), flags: pos('<SpixiLeanFlags>'),
    remove: pos(REMOVE_DIR), exists: errAt('Exists(\'$(SpixiLeanHtmlDir)\')'), exec: pos(EXEC_LEAN),
  };
  const LOGICAL = 'html$([System.IO.Path]::DirectorySeparatorChar)%(RecursiveDir)%(Filename)%(Extension)';
  const WHOLESALE = '<MauiAsset Include="Resources\\Raw\\**" LogicalName="%(RecursiveDir)%(Filename)%(Extension)" />';
  const REMOVE_SWAP = '<MauiAsset Remove="@(_SpixiLeanFile)" MatchOnMetadata="LogicalName" />';
  const INCLUDE_SWAP = '<MauiAsset Include="@(_SpixiLeanFile)" LogicalName="%(_SpixiLeanFile.LogicalName)" />';
  const e = {
    noFile: errAt('\'@(_SpixiLeanFile)\' == \'\''), orphan: errAt('\'@(_SpixiLeanOrphan)\' != \'\''), must: errAt('\'@(_SpixiLeanMust)\' != \'\''),
    removed: errAt('\'$(_SpixiLeanRemoved)\' != \'$(_SpixiLeanCount)\''), after: errAt('\'$(_SpixiLeanAssetsAfter)\' != \'$(_SpixiLeanAssetsBefore)\''),
  };
  const sw = { glob: pos('<_SpixiLeanFile Include="$(SpixiLeanHtmlDir)**" />'), logical: pos('<_SpixiLeanFile LogicalName="' + LOGICAL + '" />'), remove: pos(REMOVE_SWAP), include: pos(INCLUDE_SWAP) };
  const removesInLean = [...lb.matchAll(/<(\w+)\s+Remove="[^"]*"([^>]*)\/>/g)];
  const wholeRe = /<MauiAsset Include="Resources\\Raw\\\*\*"[^>]*\/>/g;
  const wholesale = [...body.matchAll(wholeRe)];
  const outsideBody = body;   // the project body (everything outside every target)
  const r9 = {
    allFound: Object.values(p7).every((v) => v >= 0) && Object.values(e).every((v) => v >= 0) && Object.values(sw).every((v) => v >= 0),
    dirOrder: p7.iop < p7.dir && p7.dir < p7.script && p7.script < p7.flags && p7.flags < p7.remove && p7.remove < p7.exists && p7.exists < p7.exec,
    once: count(lb, REMOVE_DIR) === 1 && count(lb, '<RemoveDir') === 1 && count(lb, '<SpixiLeanHtmlDir>') === 1 && count(lb, '<SpixiLeanScript>') === 1,
    dirShape: /<SpixiLeanHtmlDir>\$\(\[MSBuild\]::NormalizeDirectory\('\$\(MSBuildProjectDirectory\)', '\$\(IntermediateOutputPath\)', 'spixi-lean', 'html'\)\)<\/SpixiLeanHtmlDir>/.test(lb),
    definedInsideOnly: !/SpixiLean(HtmlDir|Script|Flags)/.test(outsideBody) && ![...targets].filter((t) => t !== leanT).some((t) => /SpixiLean(HtmlDir|Script|Flags)/.test(t.text)),
    wholesaleOnce: wholesale.length === 1 && wholesale[0][0] === WHOLESALE,
    sameShapeAsWholesale: LOGICAL === 'html$([System.IO.Path]::DirectorySeparatorChar)' + WHOLESALE.match(/LogicalName="([^"]*)"/)[1],
    globBeforeLogical: sw.glob < sw.logical,
    everyRemoveMatchesOnLogicalName: JSON.stringify(removesInLean.map((m) => m[1]).sort()) === JSON.stringify(['MauiAsset', '_SpixiLeanMust', '_SpixiLeanOrphan']) && removesInLean.every((m) => /MatchOnMetadata="LogicalName"/.test(m[2])),
    removeOnce: count(lb, '<MauiAsset Remove=') === 1 && count(lb, '<MauiAsset Include=') === 1,
    beforeRemove: e.noFile < sw.remove && e.orphan < sw.remove && e.must < sw.remove && e.noFile < e.orphan && e.orphan < e.must,
    removedBetween: sw.remove < e.removed && e.removed < sw.include,
    afterAfterInclude: sw.include < e.after,
    exec_then_glob: p7.exec < sw.glob && sw.logical < e.noFile,
  };
  ok(Object.values(r9).every(Boolean),
    T + ' (9) the directory and the item swap — the IntermediateOutputPath belt Error (the guard\'s test, row 7), SpixiLeanHtmlDir / SpixiLeanScript / SpixiLeanFlags defined INSIDE the lean target (none in the project body, where $(IntermediateOutputPath) is still empty), RemoveDir BEFORE the Exec with the still-exists Error between them; _SpixiLeanFile = glob of $(SpixiLeanHtmlDir)** with LogicalName = html + DirectorySeparatorChar + %(RecursiveDir)%(Filename)%(Extension) (the wholesale MauiAsset Include="Resources\\Raw\\**" LogicalName="%(RecursiveDir)%(Filename)%(Extension)" still exists once); MauiAsset Remove … MatchOnMetadata="LogicalName" (every Remove of the target uses it) BEFORE MauiAsset Include="@(_SpixiLeanFile)"; Errors no-file · orphan · must-write before the Remove, removed-count between Remove and Include, after-count after the Include (positions ' + JSON.stringify({ ...p7, ...e, ...sw }) + ') — ' + JSON.stringify(r9));

  /* ================= row 10 — the must-write list ================= */
  const mustEls = [...lb.matchAll(/<_SpixiLeanMust\s+Condition="([^"]*)"\s+Include="([^"]*)"\s*\/>/g)];
  const mustFor = (css, js) => {
    const P = { SpixiLeanCss: css, SpixiLeanJs: js }, out = [];
    for (const [, c, inc] of mustEls) if (evalCond(c, P)) out.push(...list(inc));
    return out;
  };
  const wantJs = EXTERNAL_JS.map((f) => 'Resources\\Raw\\html\\' + f);
  const wantCss = ['Resources\\Raw\\html\\**\\*.css'];
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const rm = safe(() => ({ ff: mustFor('false', 'false'), tf: mustFor('true', 'false'), ft: mustFor('false', 'true'), tt: mustFor('true', 'true') }));
  const r10 = {
    twoElements: mustEls.length === 2 && count(lb, '<_SpixiLeanMust Condition=') === 2,
    offIsEmpty: typeof rm !== 'string' && eq(rm.ff, []),
    cssIsCssGlob: typeof rm !== 'string' && eq(rm.tf, wantCss),
    jsIsThreeFiles: typeof rm !== 'string' && eq(rm.ft, wantJs),
    bothIsUnion: typeof rm !== 'string' && eq(rm.tt, [...wantCss, ...wantJs]),
    threeFiles: EXTERNAL_JS.length === 3,
    mustLogicalAndRemove: count(lb, '<_SpixiLeanMust LogicalName="' + LOGICAL + '" />') === 1 && count(lb, '<_SpixiLeanMust Remove="@(_SpixiLeanFile)" MatchOnMetadata="LogicalName" />') === 1,
    mustIsLastOfItsGroup: lb.indexOf('<_SpixiLeanMust Remove=') > lb.indexOf('<_SpixiLeanMust LogicalName=') && lb.indexOf('<_SpixiLeanMust LogicalName=') > lb.lastIndexOf('<_SpixiLeanMust Condition='),
  };
  ok(Object.values(r10).every(Boolean),
    T + ' (10) must-write list — evaluated per switch: both off = nothing, SpixiLeanCss alone = the glob Resources\\Raw\\html\\**\\*.css, SpixiLeanJs alone = exactly the three external files, both = the union; the three names equal EXTERNAL_JS of scripts/lib/lean-gates.mjs (' + EXTERNAL_JS.join(', ') + ') — ' + JSON.stringify(typeof rm === 'string' ? rm : { ...r10, lists: rm }));

  /* ================= row 11 — one place, the file is still XML, nothing imported sets a switch ================= */
  const rest = (() => {   // the csproj without the three lean targets and without the lean property group
    let s = cs;
    for (const t of [leanT, guardT, staleT]) if (t) s = s.replace(t.text, '');
    return s.replace(/<PropertyGroup\s*>\s*<SpixiLeanCss\b[\s\S]*?<\/PropertyGroup>/, '');
  })();
  /* r2 D-1 (a): outside the lean blocks nothing may name the lean folder or the stamp (a target that deletes the stamp or empties spixi-lean/ would defeat
   * the stale guard): SpixiLean, spixi-lean, spixilean (any case) and *.stamp are red anywhere else in the csproj (comments stripped) */
  const stray = (rest.match(/.*(spixi-?lean|\.stamp\b).*/gi) || []).map((l) => l.trim().slice(0, 80));
  /* r2 D-1 (b): the properties the lean targets read may be ASSIGNED only at today's sites (element name + line text + its context; an Output
   * PropertyName counts), and no TreatAsLocalProperty: a body-level DesignTimeBuild, a later group that empties SpixiStoreRelease, a second
   * SpixiDevCoexist default, a target that resets IntermediateOutputPath = red. Hard-coded from the delivered csproj. */
  const sitesOf = (cs) => {
    const W = /^(DesignTimeBuild|SpixiStoreRelease|SpixiDevCoexist|SpixiStripHtml|IntermediateOutputPath|_?SpixiLean\w*)$/;
    const tg = [...cs.matchAll(/<Target\b[^>]*Name="([^"]+)"[^>]*>[\s\S]*?<\/Target>/g)].map((m) => ({ n: m[1], a: m.index, b: m.index + m[0].length }));
    const out = [];
    for (const m of cs.matchAll(/<([A-Za-z_][\w.]*)\b([^>]*)>/g)) {
      const pn = /\bPropertyName="([^"]*)"/.exec(m[2]);
      if (!W.test(m[1]) && !(pn && W.test(pn[1]))) continue;
      const t = tg.find((x) => m.index >= x.a && m.index < x.b);
      const groups = [...cs.slice(t ? t.a : 0, m.index).matchAll(/<(?:PropertyGroup|ItemGroup)\b[^>]*>/g)];
      const ls = cs.lastIndexOf('\n', m.index) + 1, le = cs.indexOf('\n', m.index);
      out.push((t ? 'target ' + t.n : 'body') + ' | ' + (groups.length ? groups[groups.length - 1][0] : '(no group)') + ' | ' + cs.slice(ls, le < 0 ? undefined : le).trim());
    }
    return out;
  };
  const SITES = [
    "body | <PropertyGroup> | <SpixiDevCoexist Condition=\"'$(SpixiDevCoexist)' == '' and '$(Configuration)' == 'Debug'\">true</SpixiDevCoexist>",
    "body | <PropertyGroup> | <SpixiLeanCss Condition=\"'$(SpixiLeanCss)' == ''\">false</SpixiLeanCss>",
    "body | <PropertyGroup> | <SpixiLeanCssFull Condition=\"'$(SpixiLeanCssFull)' == ''\">false</SpixiLeanCssFull>",
    "body | <PropertyGroup> | <SpixiLeanJs Condition=\"'$(SpixiLeanJs)' == ''\">false</SpixiLeanJs>",
    "target SpixiLeanGuard | <PropertyGroup> | <_SpixiLeanStamp>$([MSBuild]::NormalizePath('$(MSBuildProjectDirectory)', '$(IntermediateOutputPath)', 'spixi-lean.stamp'))</_SpixiLeanStamp>",
    "target SpixiLeanGuard | <PropertyGroup> | <_SpixiLeanState>css=false</_SpixiLeanState>",
    "target SpixiLeanGuard | <PropertyGroup> | <_SpixiLeanState Condition=\"'$(SpixiLeanCss)' == 'true'\">css=true</_SpixiLeanState>",
    "target SpixiLeanGuard | <PropertyGroup> | <_SpixiLeanState Condition=\"'$(SpixiLeanJs)' == 'true'\">$(_SpixiLeanState) js=true</_SpixiLeanState>",
    "target SpixiLeanGuard | <PropertyGroup> | <_SpixiLeanState Condition=\"'$(SpixiLeanJs)' != 'true'\">$(_SpixiLeanState) js=false</_SpixiLeanState>",
    "target SpixiLeanGuard | <PropertyGroup> | <_SpixiLeanStampWas></_SpixiLeanStampWas>",
    "target SpixiLeanGuard | <PropertyGroup> | <Output TaskParameter=\"Lines\" PropertyName=\"_SpixiLeanStampWas\" />",
    "body | <PropertyGroup> | <SpixiStripHtml Condition=\"'$(SpixiStripHtml)' == '' and '$(Configuration)' == 'Release'\">true</SpixiStripHtml>",
    "target SpixiLeanReleaseHtml | <PropertyGroup> | <SpixiLeanHtmlDir>$([MSBuild]::NormalizeDirectory('$(MSBuildProjectDirectory)', '$(IntermediateOutputPath)', 'spixi-lean', 'html'))</SpixiLeanHtmlDir>",
    "target SpixiLeanReleaseHtml | <PropertyGroup> | <SpixiLeanScript>$([MSBuild]::NormalizePath('$(MSBuildProjectDirectory)', '..', 'scripts', 'strip-release.mjs'))</SpixiLeanScript>",
    "target SpixiLeanReleaseHtml | <PropertyGroup> | <SpixiLeanFlags></SpixiLeanFlags>",
    "target SpixiLeanReleaseHtml | <PropertyGroup> | <SpixiLeanFlags Condition=\"'$(SpixiLeanCss)' == 'true'\">$(SpixiLeanFlags) --lean-css</SpixiLeanFlags>",
    "target SpixiLeanReleaseHtml | <PropertyGroup> | <SpixiLeanFlags Condition=\"'$(SpixiLeanJs)' == 'true'\">$(SpixiLeanFlags) --lean-js</SpixiLeanFlags>",
    "target SpixiLeanReleaseHtml | <ItemGroup> | <_SpixiLeanFile Include=\"$(SpixiLeanHtmlDir)**\" />",
    "target SpixiLeanReleaseHtml | <ItemGroup> | <_SpixiLeanFile LogicalName=\"html$([System.IO.Path]::DirectorySeparatorChar)%(RecursiveDir)%(Filename)%(Extension)\" />",
    "target SpixiLeanReleaseHtml | <ItemGroup> | <_SpixiLeanOrphan Include=\"@(_SpixiLeanFile)\" />",
    "target SpixiLeanReleaseHtml | <ItemGroup> | <_SpixiLeanOrphan Remove=\"@(MauiAsset)\" MatchOnMetadata=\"LogicalName\" />",
    "target SpixiLeanReleaseHtml | <ItemGroup> | <_SpixiLeanMust Condition=\"'$(SpixiLeanCss)' == 'true'\" Include=\"Resources\\Raw\\html\\**\\*.css\" />",
    "target SpixiLeanReleaseHtml | <ItemGroup> | <_SpixiLeanMust Condition=\"'$(SpixiLeanJs)' == 'true'\" Include=\"Resources\\Raw\\html\\spixi.bundle.js;Resources\\Raw\\html\\spixi.strings.js;Resources\\Raw\\html\\spixi.icons.js\" />",
    "target SpixiLeanReleaseHtml | <ItemGroup> | <_SpixiLeanMust LogicalName=\"html$([System.IO.Path]::DirectorySeparatorChar)%(RecursiveDir)%(Filename)%(Extension)\" />",
    "target SpixiLeanReleaseHtml | <ItemGroup> | <_SpixiLeanMust Remove=\"@(_SpixiLeanFile)\" MatchOnMetadata=\"LogicalName\" />",
    "target SpixiLeanReleaseHtml | <PropertyGroup> | <_SpixiLeanCount>@(_SpixiLeanFile->Count())</_SpixiLeanCount>",
    "target SpixiLeanReleaseHtml | <PropertyGroup> | <_SpixiLeanAssetsBefore>@(MauiAsset->Count())</_SpixiLeanAssetsBefore>",
    "target SpixiLeanReleaseHtml | <PropertyGroup> | <_SpixiLeanAssetsKept>@(MauiAsset->Count())</_SpixiLeanAssetsKept>",
    "target SpixiLeanReleaseHtml | <PropertyGroup> | <_SpixiLeanRemoved>$([MSBuild]::Subtract($(_SpixiLeanAssetsBefore), $(_SpixiLeanAssetsKept)))</_SpixiLeanRemoved>",
    "target SpixiLeanReleaseHtml | <PropertyGroup> | <_SpixiLeanAssetsAfter>@(MauiAsset->Count())</_SpixiLeanAssetsAfter>",
  ];
  const sitesNow = sitesOf(cs);
  const siteDiff = { added: sitesNow.filter((x) => !SITES.includes(x)), gone: SITES.filter((x) => !sitesNow.includes(x)) };
  const xml = (() => {   // a small well-formedness check of the whole file: tags balance, attributes are quoted, no stray `<` or bare `&`
    const stack = []; let i = 0; const s = cs.replace(/^<\?[\s\S]*?\?>/, '');
    while ((i = s.indexOf('<', i)) >= 0) {
      const m = /^<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+="[^"]*"|\s+[\w.:-]+='[^']*')*)\s*(\/?)>/.exec(s.slice(i, i + 20000));
      if (!m) return 'unparseable tag at offset ' + i + ': ' + s.slice(i, i + 60).replace(/\s+/g, ' ');
      if (m[1]) { if (stack.pop() !== m[2]) return 'closing </' + m[2] + '> does not match at offset ' + i; }
      else if (!m[4]) stack.push(m[2]);
      i += m[0].length;
    }
    if (stack.length) return 'unclosed: ' + stack.join(',');
    const amp = [...cs.matchAll(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g)].filter((m) => /Lean/.test(cs.slice(Math.max(0, m.index - 600), m.index + 200))).length;
    return amp ? amp + ' bare "&" near a lean block' : 'ok';
  })();
  const dashComments = [...raw.matchAll(/<!--([\s\S]*?)-->/g)].filter((m) => /SpixiLean|perflean/.test(m[1]) || targets.some((t) => (leanT && t === leanT) && m.index >= leanT.at - 0 && m.index < leanT.end)).filter((m) => /--/.test(m[1]) || /-$/.test(m[1])).length;
  const rawTargets = (raw.match(/<Target\b/g) || []).length, rawClose = (raw.match(/<\/Target>/g) || []).length;
  /* Import / UsingTask: none between the lean property group and the end of the lean target; in the whole file only the known Import */
  const leanFrom = cs.search(/<PropertyGroup\s*>\s*<SpixiLeanCss\b/), leanTo = leanT ? leanT.end : -1;
  const imports = [...cs.matchAll(/<Import\b[^>]*>/g)].map((m) => m[0]);
  const IMPORTS = ['<Import Project="..\\..\\Ixian-Core\\IXICore.projitems" Label="Shared" />'];
  /* MSBuild files of the tree (a file walk from root, without node_modules / obj / bin / .git) and of every folder above Spixi/ that set a lean
   * property: MSBuild imports Directory.Build.props / .targets and reads Directory.Build.rsp by itself, a *.user file sits beside the project */
  const MSB = /^(Directory\.(Build|Packages|Solution)\.(props|targets|rsp)|.*\.(props|targets|rsp|user))$/i;
  const SETS = /SpixiLean|SpixiStoreRelease|SpixiDevCoexist|ApplicationId/;   // r4 B-1: a file that sets the dev switch or the app id moves what the app-id lines decide
  const found = [];
  const walkTree = (dir, rel) => {
    let ents; try { ents = h.readdirSync(dir, { withFileTypes: true }); } catch (err) { found.push(rel + ': unreadable (' + err.code + ')'); return; }
    for (const d of ents) {
      if (d.isDirectory()) { if (!['node_modules', 'obj', 'bin', '.git'].includes(d.name)) walkTree(join(dir, d.name), rel + d.name + '/'); continue; }
      if (!d.isFile() || !MSB.test(d.name)) continue;
      const txt = readFileSync(join(dir, d.name), 'utf8');
      if (SETS.test(txt) || /^Directory\.Build\.rsp$/i.test(d.name)) found.push(rel + d.name);
    }
  };
  walkTree(root, '');
  const above = [];
  for (let d = presolve(root, 'Spixi'), up = pdirname(d); up !== d; d = up, up = pdirname(d)) {
    for (const n of ['Directory.Build.props', 'Directory.Build.targets', 'Directory.Build.rsp']) {
      const f = join(up, n); if (!h.existsSync(f) || up === presolve(root)) continue;
      let txt = ''; try { txt = readFileSync(f, 'utf8'); } catch (err) { above.push(f + ': unreadable'); continue; }
      /* r2 D-3: above the repo the folders are the user's: fail only when the file SETS or PASSES a watched property (an element outside an XML
       * comment in a props / targets file; -p: / /p: / -property: with the name in an rsp) */
      const setsIt = /\.rsp$/.test(n)
        ? /(^|\s)[-/](p|property):\S*?\b(SpixiLean\w*|SpixiStoreRelease|SpixiDevCoexist|DesignTimeBuild)\s*=/im.test(txt)
        : /<(SpixiLean\w*|SpixiStoreRelease|SpixiDevCoexist|DesignTimeBuild)\b/.test(txt.replace(/<!--[\s\S]*?-->/g, ''));
      if (setsIt) above.push(f + ' sets or passes a watched property');
    }
  }
  const r11 = {
    singlePlace: stray.length === 0,
    xmlOk: xml === 'ok',
    targetsBalanced: rawTargets === rawClose && rawTargets === targets.length,
    noDoubleDashInLeanComments: dashComments === 0,
    leanTargetsOnce: !!leanT && !!guardT && !!staleT,
    noImportBesideLean: leanFrom >= 0 && leanTo > leanFrom && !/<(Import|UsingTask)\b/.test(cs.slice(leanFrom, leanTo)),
    onlyKnownImports: JSON.stringify(imports) === JSON.stringify(IMPORTS) && !/<UsingTask\b/.test(cs) && !/<ImportGroup\b/.test(cs),
    assignmentSites: siteDiff.added.length === 0 && siteDiff.gone.length === 0,
    noTreatAsLocalProperty: !/TreatAsLocalProperty/i.test(raw),
    noMsbuildFileSetsLean: found.length === 0,
    noParentFileSetsLean: above.length === 0,
  };
  ok(Object.values(r11).every(Boolean),
    T + ' (11) one place, still XML, nothing imported — nothing outside the lean blocks names SpixiLean / spixi-lean / a .stamp file (any case; stray lines: ' + JSON.stringify(stray) + '), the watched properties (DesignTimeBuild, SpixiStoreRelease, SpixiDevCoexist, SpixiStripHtml, IntermediateOutputPath, SpixiLean* / _SpixiLean*) are assigned only at the ' + SITES.length + ' sites of today' + (siteDiff.added.length || siteDiff.gone.length ? ' (NEW: ' + JSON.stringify(siteDiff.added) + ' GONE: ' + JSON.stringify(siteDiff.gone) + ')' : '') + ', no TreatAsLocalProperty, the file parses as tag-balanced XML (' + xml + '; ' + rawTargets + ' <Target> / ' + rawClose + ' </Target>), no "--" inside an XML comment of the lean blocks, no Import / UsingTask beside the lean blocks and only the known Import in the file (' + JSON.stringify(imports) + '), and no Directory.Build.props / .targets / .rsp, Directory.Packages.props, *.props, *.targets, *.rsp or *.user of the tree (or Directory.Build.* above it) sets SpixiLean* / SpixiStoreRelease, and no Directory.Build.rsp exists in the tree, and no Directory.Build.props / .targets / .rsp ABOVE the tree sets or passes a watched property (found: ' + JSON.stringify(found.concat(above)) + ') — ' + JSON.stringify(r11));

  /* ================= rows 12–20 — the JUDGE of the lean GATE 2 (header) ================= */
  {
    const T2 = '★ perflean D lean judge';
    const rowD = (n, title, problems) => ok(problems.length === 0, T2 + ' (' + n + ') ' + title + (problems.length ? ' — ' + problems.slice(0, 4).join(' | ') + (problems.length > 4 ? ' | … +' + (problems.length - 4) : '') : ''));
    let base = root;   // the COMMITTED tree (same rule as pins-perflean/a-gates: an env that names no usable tree FAILS, no silent fallback)
    if (process.env.SPIXI_PACKAGED_FROM) {
      const from = presolve(process.env.SPIXI_PACKAGED_FROM), cand = presolve(from, '..', '..', '..', '..');
      if (join(cand, 'Spixi', 'Resources', 'Raw', 'html') !== from || !h.existsSync(join(cand, 'scripts', 'strip-release.mjs'))) {
        ok(false, T2 + ' (12–20) the committed tree cannot be resolved: SPIXI_PACKAGED_FROM=' + JSON.stringify(process.env.SPIXI_PACKAGED_FROM) + ' is not <tree>/Spixi/Resources/Raw/html of a tree that holds scripts/strip-release.mjs');
        return;
      }
      base = cand;
    }
    const JSON_REL = 'scripts/pins-perflean/lean-expected-reds.json';

    /* ---- the two functions, cut out of the source text of smoke-packaged.mjs ---- */
    const pkgSrc = h.readFileSync(join(base, 'scripts/smoke-packaged.mjs'), 'utf8');
    const cutFn = (src, head) => {
      const a = src.indexOf(head);
      if (a < 0 || (a > 0 && src[a - 1] !== '\n')) throw new Error('"' + head + '" not found at column 0 of scripts/smoke-packaged.mjs');
      const m = /\n\}(?=\n|$)/.exec(src.slice(a));
      if (!m) throw new Error('the closing brace (column 0) of "' + head + '" not found');
      return src.slice(a, a + m.index + 2);
    };
    const free = new Set();   // every name the two functions resolve OUTSIDE their own scope (a Proxy scope outside the functions)
    let KP, JL;
    try {
      const srcK = cutFn(pkgSrc, 'function knownPreexisters('), srcJ = cutFn(pkgSrc, 'function judgeLean(');
      const sandbox = new Proxy({}, { has: (t, k) => { if (typeof k === 'string') free.add(k); return false; } });
      ({ knownPreexisters: KP, judgeLean: JL } = new Function('__sb', 'with (__sb) {\n' + srcK + '\n' + srcJ + '\nreturn { knownPreexisters: knownPreexisters, judgeLean: judgeLean };\n}')(sandbox));
      free.delete('knownPreexisters'); free.delete('judgeLean');
    } catch (e) {
      ok(false, T2 + ' (12–20) the judge cannot be extracted from scripts/smoke-packaged.mjs — ' + e.message);
      return;
    }
    let EXP = null, expErr = '';
    try { EXP = JSON.parse(h.readFileSync(join(base, JSON_REL), 'utf8')); } catch (e) { expErr = e.message; }
    const KNOWN = (() => { try { return KP(h.readFileSync(join(base, 'scripts/smoke-test.mjs'), 'utf8')); } catch (e) { return null; } })();
    const bail = !EXP || typeof EXP !== 'object' || !KNOWN || !(EXP.copy || EXP.css || EXP.js);
    if (bail) {
      rowD('12–19', 'the judge rows need ' + JSON_REL + ' (valid JSON) and the KNOWN list of scripts/smoke-test.mjs', [expErr || (KNOWN ? 'the JSON holds no copy / css / js list' : 'knownPreexisters threw on the real smoke-test.mjs')]);
    }

    /* ---- synthetic suite output, in the suite's own format ---- */
    const ENT = bail ? [] : ['copy', 'css', 'js'].flatMap((f) => (EXP[f] || []).map((e) => ({ ...e, f })));
    const tail = ' — synthetic tail';
    const rowOf = (e) => e.match + tail;
    const expRows = (flags) => ENT.filter((e) => e.f === 'copy' || flags.includes(e.f)).map(rowOf);
    const KROWS = (KNOWN || []).map((k) => k + tail);
    /* o: reds (rows printed ✗), failed (the stderr FAILED: block; default = every red row that is not a KNOWN pre-exister, as the suite prints),
     * summary ('baseline' | 'clean' = the line the suite prints LAST on stdout, in its own format; a lean run never has one: its exit is the
     * FAILED block of stderr, scripts/smoke-test.mjs, the last ~45 lines), crash (no summary, no FAILED block: a stack trace)
     * The real streams: every row is console.log'ed (stdout: `  ✓ label` / `  ✗ label`); the end is ONE of
     *   `\nBASELINE OK — <passes> pass / the <k> KNOWN pre-exister(s): …` (stdout, exit 0) · `\nsmoke test CLEAN` (stdout, exit 0) ·
     *   `\nFAILED:\n<one failure per line>` and / or `\nKNOWN pre-exister(s) ABSENT — …\n  ~ <known>` (stderr, exit 1) */
    const mkRun = (o) => {
      const reds = o.reds || [], passes = o.passes === undefined ? 3 : o.passes;
      let stdout = Array.from({ length: passes }, (_, i) => '  ✓ synthetic pass row ' + i).concat(reds.map((r) => '  ✗ ' + r)).join('\n') + '\n';
      if (o.summary === 'baseline') stdout += '\nBASELINE OK — ' + passes + ' pass / the ' + reds.length + ' KNOWN pre-exister(s): #136 · B3\n';
      else if (o.summary === 'clean') stdout += '\nsmoke test CLEAN\n';
      if (o.crash) return { stdout, stderr: 'file:///x/smoke-test.mjs:1\nTypeError: synthetic crash\n    at synthetic (file:///x/smoke-test.mjs:1:1)' };
      if (o.summary) return { stdout, stderr: '' };
      const failed = o.failed || reds.filter((r) => !(KNOWN || []).some((k) => r.includes(k)));
      const absent = (KNOWN || []).filter((k) => !reds.some((r) => r.includes(k)) && !(o.failed || []).some((r) => r.includes(k)));
      return { stdout, stderr: (failed.length ? '\nFAILED:\n' + failed.join('\n') + '\n' : '') + (absent.length ? '\nKNOWN pre-exister(s) ABSENT — silently fixed? Update KNOWN_PREEXISTERS:\n' + absent.map((k) => '  ~ ' + k).join('\n') + '\n' : '') };
    };
    const judge = (o, flags = ['css', 'js'], expected = EXP, known = KNOWN) => {
      const r = mkRun(o);
      try { return JL({ stdout: r.stdout, stderr: r.stderr, known, expected, flags }); }
      catch (e) { return { ok: 'THROW ' + e.message, lines: [], byDesign: -1, known: -1, passes: -1 }; }
    };
    const has = (j, re) => j.lines.some((l) => re.test(l));
    const P = () => { const p = []; p.need = (c, m) => { if (!c) p.push(m); }; return p; };
    const nameOf = (e) => e.match.slice(0, 40);

    if (!bail) {
      /* ===== row 12 — the exact expected set passes ===== */
      {
        const p = P(), N = ENT.length, all = [...expRows(['css', 'js']), ...KROWS];
        p.need(N >= 1, 'the JSON lists no entry at all');
        const a = judge({ reds: all });                                  // the REAL shape of a lean run: the ✗ rows on stdout, no summary there, the FAILED: block on stderr
        p.need(a.ok === true, 'FAILED-block shape: ok=' + a.ok + ' ' + a.lines.filter((l) => /UNEXPECTED|EXPECTED|ABSENT|did not|summary|FAILED/.test(l)).join(' / '));
        p.need(a.summary === 'failed', 'the real lean shape has the summary "failed": ' + a.summary);
        p.need(a.byDesign === N, 'byDesign ' + a.byDesign + ' != ' + N + ' entries');
        p.need(a.known === 2, 'known ' + a.known + ' != 2');
        p.need(a.passes === 3, 'passes ' + a.passes + ' != 3');
        p.need(a.lines && a.lines[0] === 'red by design (' + N + '):', 'first line: ' + (a.lines && a.lines[0]));
        p.need(!has(a, /^UNEXPECTED|^EXPECTED|^KNOWN pre-exister\(s\) ABSENT|did not reach/), 'a complaint line on the exact set');
        // the other end of the suite: BASELINE OK is printed only when the failures are exactly the KNOWN set — with no expected entry (a lean run always has some)
        const b = judge({ reds: KROWS, summary: 'baseline' }, ['css', 'js'], { copy: [], css: [], js: [] });
        p.need(b.ok === true && b.summary === 'baseline' && b.byDesign === 0 && b.known === 2, 'BASELINE OK shape (KNOWN only, nothing expected): ok=' + b.ok + ' summary=' + b.summary + ' byDesign=' + b.byDesign + ' known=' + b.known);
        const bs = judge({ reds: KROWS, summary: 'baseline' });          // the same end with the real expected list: the entries are not red → the verdict is NOT ok (and says why)
        p.need(bs.ok === false && has(bs, /^EXPECTED but not red/), 'BASELINE OK end with the real expected list must fail (stale entries): ok=' + bs.ok);
        const o = judge({ reds: [...all].reverse() });                   // the verdict does not depend on the order of the rows
        p.need(o.ok === true && o.byDesign === N, 'reversed order: ok=' + o.ok);
        rowD(12, 'the exact expected set passes — flags css+js, every entry of copy + css + js of ' + JSON_REL + ' (' + N + ') red once with a tail, plus the 2 KNOWN: ok, byDesign = ' + N + ', known = 2, in the real FAILED-block shape (summary \'failed\') and reversed order; the BASELINE OK end passes only with no entry expected', p);
      }

      /* ===== row 13 — an unexpected red row fails ===== */
      {
        const p = P(), all = [...expRows(['css', 'js']), ...KROWS], odd = '★ a row nobody expects to be red — synthetic';
        const a = judge({ reds: [...all, odd] });
        p.need(a.ok === false, 'one extra red row: ok=' + a.ok);
        p.need(has(a, /^UNEXPECTED red \(1\):/) && a.lines.some((l) => l.includes(odd)), 'no "UNEXPECTED red (1):" line naming the row: ' + a.lines.slice(0, 6).join(' / '));
        p.need(a.byDesign === ENT.length, 'the by-design count moved: ' + a.byDesign);
        if (ENT.length) {   // a row that is only the START of an entry's match is not "by design" (the entry matches a row that starts with it, not the other way round)
          const short = ENT[0].match.slice(0, Math.max(10, ENT[0].match.length - 5));
          const s = judge({ reds: [...all.filter((r) => r !== rowOf(ENT[0])), short] });
          p.need(s.ok === false && has(s, /^UNEXPECTED red/) && has(s, /EXPECTED but not red/), 'a row shorter than the match: ok=' + s.ok + ' ' + s.lines.join(' / ').slice(0, 160));
        }
        const dup = { copy: [], css: [{ match: '★ aaa', reason: 'synthetic reason of two entries' }, { match: '★ aaa b', reason: 'synthetic reason of two entries' }], js: [] };   // a row that matches TWO entries is unexpected too (it would be counted twice)
        const d = judge({ reds: ['★ aaa b — x', ...KROWS] }, ['css'], dup);
        p.need(d.ok === false && has(d, /^UNEXPECTED red/) && d.lines.some((l) => /matches 2 expected entries/.test(l)), 'a row matching two entries: ok=' + d.ok + ' ' + d.lines.join(' / ').slice(0, 200));
        rowD(13, 'an unexpected red row fails — the exact set plus one red row that matches no entry: ok false and an "UNEXPECTED red (1):" line naming it, by-design count unchanged; a row that is only a SHORTER start of a match is unexpected (and its entry stale); a row matching two entries is unexpected', p);
      }

      /* ===== row 14 — an expected entry not red the expected number of times fails ===== */
      {
        const p = P(), all = [...expRows(['css', 'js']), ...KROWS];
        for (const e of ENT) {
          const a = judge({ reds: all.filter((r) => r !== rowOf(e)) });
          p.need(a.ok === false && a.lines.some((l) => l.startsWith('  ~ [' + e.f + '] ' + e.match) && /red 0, expected 1/.test(l)) && has(a, /^EXPECTED but not red/), 'entry "' + nameOf(e) + '" not red: ok=' + a.ok);
        }
        const twice = judge({ reds: [...all, rowOf(ENT[0])] });   // red TWICE where one is expected: stale too (the number is exact)
        p.need(ENT.length > 0 && twice.ok === false && twice.lines.some((l) => /\(red 2, expected 1\)/.test(l)), 'an entry red twice, no count: ok=' + twice.ok);
        const cnt = { copy: [], css: [{ match: '★ cnt', reason: 'synthetic reason with a count of two', count: 2 }], js: [] };
        const k = (n) => judge({ reds: [...Array.from({ length: n }, (_, i) => '★ cnt row ' + i), ...KROWS] }, ['css'], cnt);
        p.need(k(2).ok === true && k(2).byDesign === 2, '`count: 2` red twice must pass: ok=' + k(2).ok);
        p.need(k(1).ok === false && k(1).lines.some((l) => /\(red 1, expected 2\)/.test(l)), '`count: 2` red once must fail: ok=' + k(1).ok);
        p.need(k(3).ok === false && k(3).lines.some((l) => /\(red 3, expected 2\)/.test(l)), '`count: 2` red three times must fail: ok=' + k(3).ok);
        rowD(14, 'an expected entry NOT red the expected number of times fails — each of the ' + ENT.length + ' entries left out in turn: ok false and a "~ [flag] match (red 0, expected 1)" line under "EXPECTED but not red"; red twice without a count fails; `count: 2` passes at 2 and fails at 1 and at 3', p);
      }

      /* ===== row 15 — a KNOWN pre-exister not red fails ===== */
      {
        const p = P(), all = expRows(['css', 'js']);
        KNOWN.forEach((k, i) => {
          const a = judge({ reds: [...all, ...KROWS.filter((_, j) => j !== i)] });
          p.need(a.ok === false && has(a, /^KNOWN pre-exister\(s\) ABSENT:/) && a.lines.some((l) => l === '  ~ ' + k) && a.known === KNOWN.length - 1, 'KNOWN #' + i + ' not red: ok=' + a.ok + ' known=' + a.known);
        });
        const none = judge({ reds: all });
        p.need(none.ok === false && none.known === 0 && none.lines.filter((l) => /^  ~ /.test(l)).length === KNOWN.length, 'both KNOWN not red: ok=' + none.ok);
        rowD(15, 'a KNOWN pre-exister not red fails — each of the ' + KNOWN.length + ' left out in turn (and both): ok false, a "KNOWN pre-exister(s) ABSENT:" line naming it, known count lowered', p);
      }

      /* ===== row 16 — flag scoping ===== */
      {
        const p = P(), copyE = ENT.filter((e) => e.f === 'copy'), cssE = ENT.filter((e) => e.f === 'css'), jsE = ENT.filter((e) => e.f === 'js');
        p.need(copyE.length > 0 && cssE.length > 0 && jsE.length > 0, 'the JSON needs a copy, a css and a js entry for this row (' + copyE.length + '/' + cssE.length + '/' + jsE.length + ')');
        const css = judge({ reds: [...expRows(['css']), ...KROWS] }, ['css']);              // only css: the js entries are not consulted, not required
        p.need(css.ok === true && css.byDesign === copyE.length + cssE.length && !has(css, /^EXPECTED but not red/), 'flags [css] with copy + css red: ok=' + css.ok + ' byDesign=' + css.byDesign);
        const js = judge({ reds: [...expRows(['js']), ...KROWS] }, ['js']);
        p.need(js.ok === true && js.byDesign === copyE.length + jsE.length, 'flags [js] with copy + js red: ok=' + js.ok + ' byDesign=' + js.byDesign);
        p.need(js.lines.some((l) => l.startsWith('  ✗ [copy] ' + (copyE[0] || { match: '?' }).match)), 'the copy row is listed "by design" under [copy] with flags [js]');
        if (jsE.length) {   // a red row that only a js entry matches, under flags [css]: unexpected
          const x = judge({ reds: [...expRows(['css']), rowOf(jsE[0]), ...KROWS] }, ['css']);
          p.need(x.ok === false && has(x, /^UNEXPECTED red/) && x.lines.some((l) => l.includes(jsE[0].match)), 'flags [css] + a js-only row: ok=' + x.ok);
        }
        if (cssE.length) {
          const y = judge({ reds: [...expRows(['js']), rowOf(cssE[0]), ...KROWS] }, ['js']);
          p.need(y.ok === false && has(y, /^UNEXPECTED red/), 'flags [js] + a css-only row: ok=' + y.ok);
        }
        if (copyE.length) {   // the copy entries are required with ANY flag set
          const miss = judge({ reds: [...expRows(['js']).filter((r) => !copyE.some((e) => r === rowOf(e))), ...KROWS] }, ['js']);
          p.need(miss.ok === false && has(miss, /^EXPECTED but not red/) && miss.lines.some((l) => l.startsWith('  ~ [copy] ')), 'flags [js] without the copy row red: ok=' + miss.ok);
          const missC = judge({ reds: [...expRows(['css']).filter((r) => !copyE.some((e) => r === rowOf(e))), ...KROWS] }, ['css']);
          p.need(missC.ok === false && missC.lines.some((l) => l.startsWith('  ~ [copy] ')), 'flags [css] without the copy row red: ok=' + missC.ok);
        }
        rowD(16, 'flag scoping — flags [css] and [js] alone pass with copy + their own entries red (the other flag\'s entries are not required); a row only the other flag\'s entry matches is UNEXPECTED; the copy entries are required with ANY flag (missing → "~ [copy]"), and listed as [copy] when red', p);
      }

      /* ===== row 17 — a crash ===== */
      {
        const p = P(), all = [...expRows(['css', 'js']), ...KROWS];
        const c = judge({ reds: all, crash: true });                                      // every red row is the expected set, but there is no summary and no FAILED block
        p.need(c.ok === false && has(c, /did not reach its summary/), 'no summary, no FAILED block (full expected set): ok=' + c.ok + ' ' + c.lines.slice(0, 2).join(' / ').slice(0, 160));
        const e = JL({ stdout: '', stderr: '', known: KNOWN, expected: EXP, flags: ['css', 'js'] });
        p.need(e.ok === false && /did not reach its summary/.test(e.lines[0]), 'empty stdout and stderr: ok=' + e.ok);
        const u = JL({ stdout: undefined, stderr: undefined, known: KNOWN, expected: EXP, flags: ['css'] });   // undefined streams (a spawn that gave nothing) do not throw, they fail
        p.need(u.ok === false, 'undefined streams: ok=' + u.ok);
        const s = judge({ reds: KROWS, summary: 'baseline' }, ['css', 'js'], { copy: [], css: [], js: [] });   // the control: a summary in the suite's own shape (the KNOWN only, nothing expected) passes
        p.need(s.ok === true && s.summary === 'baseline', 'control with the BASELINE OK summary: ok=' + s.ok + ' summary=' + s.summary);
        const cl = JL({ stdout: mkRun({ reds: [], summary: 'clean' }).stdout, stderr: '', known: [], expected: { copy: [], css: [], js: [] }, flags: ['css', 'js'] });   // CLEAN = no red row at all (known: [] — the real KNOWN rows would be red)
        p.need(cl.ok === true && cl.summary === 'clean', '"smoke test CLEAN" (last line, no red row) is a summary: ok=' + cl.ok + ' summary=' + cl.summary);
        p.need(c.summary === null && e.summary === null, 'a crash has summary null: ' + c.summary + ' / ' + e.summary);
        rowD(17, 'a crash — the whole expected set red but NO summary and NO FAILED block (a stack trace on stderr), and empty / undefined streams: ok false with "did not reach its summary"; a summary line in the suite\'s own shape (BASELINE OK with the KNOWN only, or "smoke test CLEAN" with no red row) passes — the crash that keeps the real row labels is row 21', p);
      }

      /* ===== row 18 — a failure only in the stderr FAILED block ===== */
      {
        const p = P(), all = [...expRows(['css', 'js']), ...KROWS], pageErr = 'spixi.html PAGE ERROR: synthetic is not defined';
        const a = judge({ reds: all, failed: [...all.filter((r) => !KROWS.includes(r)), pageErr] });   // a PAGE ERROR is pushed to `failures` without a ✗ row
        p.need(a.ok === false && has(a, /^UNEXPECTED red \(1\):/) && a.lines.some((l) => l.includes(pageErr)), 'FAILED-only unexpected: ok=' + a.ok + ' ' + a.lines.join(' / ').slice(0, 200));
        if (ENT.length) {   // an expected entry that shows only in the FAILED block counts as red (the same matching)
          const e = ENT[ENT.length - 1];
          const b = judge({ reds: all.filter((r) => r !== rowOf(e)), failed: [...all.filter((r) => !KROWS.includes(r))] });
          p.need(b.ok === true && b.byDesign === ENT.length, 'an entry only in the FAILED block: ok=' + b.ok + ' byDesign=' + b.byDesign);
        }
        const dupl = judge({ reds: all, failed: [...all.filter((r) => !KROWS.includes(r))] });   // a FAILED line that repeats a ✗ row is NOT counted twice
        p.need(dupl.ok === true && dupl.byDesign === ENT.length, 'FAILED lines repeating ✗ rows are not double-counted: ok=' + dupl.ok + ' byDesign=' + dupl.byDesign);
        // #46 r2 C-6: the FAILED block runs to the END of stderr — a row-less failure printed after an empty line IS judged (before: the block ended at the first empty line and it was never read)
        const base18 = [...all.filter((r) => !KROWS.includes(r))], late = 'spixi.html PAGE ERROR: printed after an empty line';
        const k = judge({ reds: all, failed: base18.concat(['']).concat([late]) });
        p.need(k.ok === false && has(k, /^UNEXPECTED red \(1\):/) && k.lines.some((l) => l.includes(late)), 'a failure after an empty line inside the FAILED block is judged (unexpected): ok=' + k.ok + ' ' + k.lines.join(' / ').slice(0, 200));
        const k2 = judge({ reds: all, failed: base18.concat(['', '']).concat([late]) });   // two empty lines change nothing
        p.need(k2.ok === false && k2.lines.some((l) => l.includes(late)), 'two empty lines before the failure: ok=' + k2.ok);
        // the ABSENT trailer after the FAILED block (the real end of smoke-test.mjs): normal block + trailer is ok, an unknown line after the trailer header is NOT
        const tr = (extra) => { const r = mkRun({ reds: all }); return JL({ stdout: r.stdout, stderr: r.stderr + (extra || ''), known: KNOWN, expected: EXP, flags: ['css', 'js'] }); };
        const ABS = '\nKNOWN pre-exister(s) ABSENT — silently fixed? Update KNOWN_PREEXISTERS:\n  ~ #136 · B3\n';
        const t0 = tr(ABS);
        p.need(t0.ok === true && t0.summary === 'failed', 'FAILED block + the ABSENT trailer is ok (the normal end): ok=' + t0.ok + ' ' + t0.lines.filter((l) => /unknown|UNEXPECTED/.test(l)).join(' / '));
        const t1 = tr(ABS + 'stray line after the trailer\n');
        p.need(t1.ok === false && has(t1, /unknown line\(s\) after the suite's ABSENT block \(1\): stray line after the trailer/), 'an unknown line after the ABSENT trailer is not ok and named: ok=' + t1.ok + ' ' + t1.lines.join(' / ').slice(0, 200));
        const t2 = tr(ABS + '  ~ one more known\n');   // another `  ~ ` line is still a trailer line
        p.need(t2.ok === true, 'a second "  ~ " trailer line is still the trailer: ok=' + t2.ok);
        rowD(18, 'a failure listed ONLY in the stderr FAILED block (no ✗ row: a PAGE ERROR) is judged — unexpected → ok false and the line under "UNEXPECTED red"; an expected entry that appears only there counts as red; lines repeating a ✗ row are not counted twice; the block runs to the END of stderr — a row-less failure after an empty line IS judged (one or two empty lines); the ABSENT trailer after it is ok, an unknown line after the trailer header is not', p);
      }

      /* ===== row 19 — the JSON file itself ===== */
      {
        const p = P(), raw = h.readFileSync(join(base, JSON_REL), 'utf8');
        p.need(EXP && typeof EXP === 'object' && !Array.isArray(EXP), 'the file is not a JSON object');
        const keys = Object.keys(EXP), KEYS = ['copy', 'css', 'js'];
        p.need(keys.every((k) => KEYS.includes(k)) && keys.length > 0, 'keys ' + JSON.stringify(keys) + ' (only copy / css / js)');
        for (const k of keys) p.need(Array.isArray(EXP[k]), 'the value of "' + k + '" is not an array');
        p.need(ENT.length > 0, 'no entry');
        for (const e of ENT) {
          const n = '[' + e.f + '] ' + nameOf(e);
          p.need(e && typeof e === 'object' && Object.keys(e).every((k) => ['match', 'reason', 'count', 'f'].includes(k)), n + ': unknown key ' + Object.keys(e).filter((k) => !['match', 'reason', 'count', 'f'].includes(k)));
          p.need(typeof e.match === 'string' && e.match.trim().length > 0, n + ': empty match');
          p.need(typeof e.reason === 'string' && e.reason.trim().length >= 20, n + ': reason shorter than 20 characters (' + (typeof e.reason === 'string' ? e.reason.trim().length : typeof e.reason) + ')');
          p.need(e.count === undefined || (Number.isInteger(e.count) && e.count >= 1), n + ': count must be an integer >= 1');
        }
        const ms = ENT.map((e) => e.match).filter((m) => typeof m === 'string');
        ms.forEach((a, i) => ms.forEach((b, j) => { if (i !== j && a.length > 0 && b.startsWith(a)) p.need(false, '"' + a.slice(0, 40) + '" is a prefix of (or equal to) "' + b.slice(0, 40) + '" — a row would match both'); }));
        /* every match is anchored in a real row of the suite: smoke-test.mjs or a file under scripts/pins-* (pins-perflean itself is not a source of rows) */
        const files = [];
        const addFile = (rel) => files.push({ rel, text: h.readFileSync(join(base, rel), 'utf8').replace(/\\'/g, "'") });
        addFile('scripts/smoke-test.mjs');
        const walk = (rel) => { for (const d of h.readdirSync(join(base, rel), { withFileTypes: true })) { const r = rel + '/' + d.name; if (d.isDirectory()) walk(r); else if (/\.m?js$/.test(d.name)) addFile(r); } };
        for (const d of h.readdirSync(join(base, 'scripts'), { withFileTypes: true })) if (d.isDirectory() && /^pins-/.test(d.name) && d.name !== 'pins-perflean') walk('scripts/' + d.name);
        p.need(files.length > 1, 'no scripts/pins-* source file found to anchor the matches');
        const SESSION_F = /^(★★ SESSION F: the BUILT )([\w.-]+)( is )(byte-identical to |strip\()([\w.-]+)(\))?$/;   // this row's label is built from a table: 'the BUILT ' + file + ' is ' + (packaged-run-on-list ? 'strip(' + src + ') — the packaged form (Session N gate 2)' : 'byte-identical to ' + src)
        const anchored = (m) => {
          if (files.some((f) => f.text.includes(m))) return true;                         // the text is in a row as written
          const br = /^(.*?\[)[^\]]*(\].*)$/.exec(m);                                      // '★ #711 [built]: …' is '★ #711 [' + label + ']: …' in the source
          if (br) return files.some((f) => f.text.includes(br[1]) && f.text.includes(br[2]));
          const sf = SESSION_F.exec(m);
          if (sf) {   // piece by piece, in ONE file: the label's head, ' is ', the tail the match ends with, both file names; the strip( form also needs the rest of its branch (a `strip(` entry cannot be anchored by the byte-identical text, nor the other way round)
            const tailForm = sf[4] === 'strip(' ? ') — the packaged form (Session N gate 2)' : '';
            return files.some((f) => [sf[1], sf[3], sf[4], sf[2], sf[5], tailForm].every((x) => f.text.includes(x)) && (sf[4] !== 'strip(' || sf[6] === ')'));
          }
          return false;
        };
        for (const e of ENT) if (typeof e.match === 'string' && e.match.length > 0 && !anchored(e.match)) p.need(false, '[' + e.f + '] "' + nameOf(e) + '…" is in no row of smoke-test.mjs or scripts/pins-* (a renamed or deleted row; a label built by concatenation needs its pieces in the source)');
        p.need(raw.length > 0 && /^\{/.test(raw.trim()), 'the file does not start with {');
        rowD(19, 'the expected-reds JSON — valid, only the keys copy / css / js, every entry a non-empty match + a reason of at least 20 characters (+ an optional integer count), no match a prefix of another over the union, and every match anchored in a real row of scripts/smoke-test.mjs or scripts/pins-* (a renamed or deleted row fails HERE, not in a 45-minute run) — ' + ENT.length + ' entries, ' + files.length + ' source files', p);
      }

      /* ===== row 20 — knownPreexisters ===== */
      {
        const p = P(), smokeSrc = h.readFileSync(join(base, 'scripts/smoke-test.mjs'), 'utf8').replace(/\\'/g, "'");
        p.need(Array.isArray(KNOWN) && KNOWN.length === 2 && KNOWN.every((k) => typeof k === 'string' && k.length > 10), 'knownPreexisters returned ' + JSON.stringify(KNOWN).slice(0, 120) + ' (want exactly 2 strings)');
        const a = smokeSrc.indexOf('const KNOWN_PREEXISTERS = ['), b = a < 0 ? -1 : smokeSrc.indexOf('];', a);
        const rest = a < 0 || b < 0 ? '' : smokeSrc.slice(0, a) + smokeSrc.slice(b);   // the file WITHOUT the array: the string must be a real row label elsewhere
        const pinsText = (() => { let t = ''; const w = (rel) => { for (const d of h.readdirSync(join(base, rel), { withFileTypes: true })) { const r = rel + '/' + d.name; if (d.isDirectory()) w(r); else if (/\.m?js$/.test(d.name)) t += h.readFileSync(join(base, r), 'utf8').replace(/\\'/g, "'"); } }; for (const d of h.readdirSync(join(base, 'scripts'), { withFileTypes: true })) if (d.isDirectory() && /^pins-/.test(d.name) && d.name !== 'pins-perflean') w('scripts/' + d.name); return t; })();
        p.need(a >= 0 && b > a, 'the KNOWN_PREEXISTERS array is not in smoke-test.mjs');
        for (const k of KNOWN || []) p.need(rest.includes(k) || pinsText.includes(k), '"' + String(k).slice(0, 50) + '…" is in no row of smoke-test.mjs or scripts/pins-* outside the list itself');
        /* the parser on a synthetic source: the array only, comments dropped, escapes undone, a missing array throws */
        const syn = "const x = ['no'];\nconst KNOWN_PREEXISTERS = [\n  'one \\'q\\' end',\n  /* 'dropped' */ 'two',\n  /* a comment\n   * with 'quotes' */\n  \"not single\".length && 'three',\n];\nconst after = ['nope'];";
        const got = (() => { try { return KP(syn); } catch (e) { return 'THROW ' + e.message; } })();
        p.need(JSON.stringify(got) === JSON.stringify(["one 'q' end", 'two', 'three']), 'the parser on a synthetic source returned ' + JSON.stringify(got));
        const thr = (() => { try { KP('const nothing = [];'); return 'no throw'; } catch (e) { return e.message; } })();
        p.need(/KNOWN_PREEXISTERS not found/.test(thr), 'a source without the array must throw: ' + thr);
        const outer = [...free].filter((n) => !/^(String|Error|Array|Object|JSON|Set|Map|RegExp|Number|Math|Boolean|undefined)$/.test(n));
        p.need(outer.length === 0, 'the judge functions use names from outside themselves: ' + outer.join(', ') + ' (a `new Function` build cannot see them)');
        rowD(20, 'knownPreexisters — returns exactly 2 strings from the real scripts/smoke-test.mjs, each in a real row label outside the list itself; on a synthetic source it reads the array only, drops /* */ comments, undoes \\\' escapes, and throws when the array is missing; both functions use no name from outside (free names seen: ' + [...free].join(',') + ')', p);
      }

      /* ================= rows 21–27 — #46 r1 C-1 / C-3: the END of a lean run judged line by line, the verdict, the links, the wiring ================= */
      {
        const fsm = await import('node:fs'), cpm = await import('node:child_process'), osm = await import('node:os'), pm = await import('node:path');
        const jl = (args) => { try { return JL(args); } catch (e) { return { ok: 'THROW ' + e.message, lines: [], summary: undefined, byDesign: -1, known: -1, passes: -1 }; } };
        const J = JSON.stringify;
        const cutOne = (head) => cutFn(pkgSrc, head);
        const all = [...expRows(['css', 'js']), ...KROWS];
        const NONKNOWN = all.filter((r) => !KROWS.includes(r));
        const cnt = (flags) => ['copy', ...flags].reduce((n, f) => n + (EXP[f] || []).length, 0);
        const STACK = 'file:///x/smoke-test.mjs:1\nTypeError: synthetic crash\n    at synthetic (file:///x/smoke-test.mjs:1:1)';
        /* the REAL row labels that hold the summary words: the rows of smoke-test.mjs whose label (a string literal, or literal pieces joined with the
         * dynamic parts — here "0") contains `BASELINE OK`. Read out of the file, never typed (#46 r1 C-1: three of them, 2026-11-15). */
        const REAL = [];
        h.readFileSync(join(base, 'scripts/smoke-test.mjs'), 'utf8').split('\n').forEach((ln, i) => {
          const t = ln.trim();
          if (!t.startsWith("'★") || !t.includes('BASELINE OK')) return;
          const pieces = [...t.matchAll(/'((?:\\.|[^'\\])*)'/g)].map((m) => m[1].replace(/\\(.)/g, '$1'));
          if (pieces.join('').includes('BASELINE OK')) REAL.push({ line: i + 1, label: pieces.join('0') });
        });
        const rowsOf = (o) => mkRun(o).stdout.replace(/\n+$/, '').split('\n');

        /* ===== row 21 — C-1, the crash that keeps the real labels ===== */
        {
          const p = P();
          p.need(REAL.length >= 3, 'only ' + REAL.length + ' row label(s) of smoke-test.mjs hold "BASELINE OK" (the review found three: 20269, 30579, 31234)');
          p.need(KNOWN && KNOWN.length === 2 && NONKNOWN.length === ENT.length, 'the setup: ' + NONKNOWN.length + ' non-KNOWN rows for ' + ENT.length + ' entries');
          for (const R of REAL) {
            for (const pos of ['last', 'first']) {
              const rows = rowsOf({ reds: all });
              const so = (pos === 'last' ? [...rows, '  ✓ ' + R.label] : ['  ✓ ' + R.label, ...rows]).join('\n') + '\n';
              const c = jl({ stdout: so, stderr: STACK, known: KNOWN, expected: EXP, flags: ['css', 'js'] });
              p.need(c.ok === false && c.summary === null && c.lines.some((l) => /did not reach its summary/.test(l)), 'the real label of line ' + R.line + ' (' + pos + ', a stack trace, no summary): ok=' + c.ok + ' summary=' + c.summary + ' ' + (c.lines[0] || '').slice(0, 100));
              const g = jl({ stdout: so, stderr: mkRun({ reds: all }).stderr, known: KNOWN, expected: EXP, flags: ['css', 'js'] });   // the control: the SAME rows, the real lean end (the FAILED block) → ok
              p.need(g.ok === true && g.summary === 'failed', 'the control with the real label of line ' + R.line + ' (' + pos + ') and the real FAILED block: ok=' + g.ok + ' summary=' + g.summary + ' ' + g.lines.filter((l) => /UNEXP|did not|summary/.test(l)).join(' / ').slice(0, 120));
            }
          }
          rowD(21, 'C-1 the crash that keeps the real labels — stdout holds a ✓ row with each of the ' + REAL.length + ' REAL labels of smoke-test.mjs that contain "BASELINE OK" (lines ' + REAL.map((r) => r.line).join(', ') + '; first and last row) + the whole expected set + the 2 KNOWN as ✗ rows, NO summary, a stack trace on stderr: ok false, summary null, "did not reach its summary"; with the real FAILED block instead the same rows pass', p);
        }

        /* ===== row 22 — the real end of a lean run ===== */
        {
          const p = P();
          for (const flags of [['css', 'js'], ['css'], ['js']]) {
            const reds = [...expRows(flags), ...KROWS];
            const so = [...rowsOf({ reds }), ...REAL.map((R) => '  ✓ ' + R.label)].join('\n') + '\n';
            const r = jl({ stdout: so, stderr: mkRun({ reds }).stderr, known: KNOWN, expected: EXP, flags });
            const n = cnt(flags), tag = '[' + flags.join(',') + '] ';
            p.need(r.ok === true, tag + 'ok=' + r.ok + ' ' + (r.lines || []).filter((l) => /UNEXP|EXPECTED|ABSENT|did not|summary|FAILED/.test(l)).join(' / ').slice(0, 160));
            p.need(r.summary === 'failed', tag + 'summary ' + r.summary + ' (the real end of a lean run is the FAILED block)');
            p.need(r.byDesign === n, tag + 'byDesign ' + r.byDesign + ' != ' + n + ' = the entries of copy + ' + flags.join(' + ') + ' of the JSON');
            p.need(r.known === 2 && r.passes === 3 + REAL.length, tag + 'known ' + r.known + ' passes ' + r.passes);
          }
          p.need(cnt(['css', 'js']) === (EXP.copy || []).length + (EXP.css || []).length + (EXP.js || []).length, 'the count helper');
          const abs = jl({ stdout: ['  ✓ a', '  ✗ ' + KROWS[0]].join('\n') + '\n', stderr: '\nKNOWN pre-exister(s) ABSENT — silently fixed? Update KNOWN_PREEXISTERS:\n  ~ ' + KNOWN[1] + '\n', known: KNOWN, expected: { copy: [], css: [], js: [] }, flags: ['css'] });
          p.need(abs.ok === false && abs.summary === 'absent' && abs.lines.some((l) => l === '  ~ ' + KNOWN[1]), 'the "absent" end (one KNOWN fixed): ok=' + abs.ok + ' summary=' + abs.summary);
          rowD(22, 'the normal end of a lean run in the REAL shape (the expected rows + the 2 KNOWN as ✗ rows on stdout, no summary there, the FAILED block of every red row that is not KNOWN on stderr) with the real labels as ✓ rows: ok true, summary "failed", byDesign = the number of entries of copy + css + js (and copy + css, copy + js for one flag), known 2; the "absent" end is judged "absent" and not ok', p);
        }

        /* ===== row 23 — the summary is a WHOLE LINE; the rows must agree with it ===== */
        {
          const p = P();
          const E0 = { copy: [], css: [], js: [] };
          const mk = mkRun({ reds: all });
          const no = (name, r, re) => p.need(r.ok === false && (!re || r.lines.some((l) => re.test(l))), name + ': ok=' + r.ok + ' summary=' + r.summary + (re ? ' — want a line ' + re : '') + ' ' + (r.lines[0] || '').slice(0, 90));
          const real = (stderr, stdout = mk.stdout, flags = ['css', 'js']) => jl({ stdout, stderr, known: KNOWN, expected: EXP, flags });
          p.need(real(mk.stderr).ok === true, 'the control (the real end) is not ok: ' + real(mk.stderr).ok);
          // the FAILED line: a whole line, after an empty line or at the start
          no('"x FAILED:" is no FAILED line', real(mk.stderr.replace('\nFAILED:\n', '\nx FAILED:\n')), /did not reach its summary/);
          no('"noise" then FAILED: with no empty line before', real('noise' + mk.stderr), /did not reach its summary/);
          p.need(real(mk.stderr.replace(/^\n/, '')).ok === true, 'FAILED: as the very first line of stderr must count (the start of the stream)');
          no('FAILED: twice', real(mk.stderr + mk.stderr), /appears 2 times/);
          no('a FAILED block that lacks one non-KNOWN ✗ row', jl({ stdout: mk.stdout, stderr: mkRun({ reds: all, failed: NONKNOWN.slice(1) }).stderr, known: KNOWN, expected: EXP, flags: ['css', 'js'] }), /FAILED block does not list 1 red row/);
          // the BASELINE line: the LAST non-empty stdout line, in the suite's own format, and its number is the number of ✓ rows
          no('a ✓ ROW that spells the summary, as the only line', jl({ stdout: '  ✓ BASELINE OK — 1 pass / the 2 KNOWN pre-exister(s): x\n', stderr: '', known: KNOWN, expected: E0, flags: ['css'] }), /did not reach its summary/);
          const bl = mkRun({ reds: KROWS, summary: 'baseline' });
          p.need(jl({ stdout: bl.stdout, stderr: '', known: KNOWN, expected: E0, flags: ['css'] }).ok === true, 'the BASELINE control (its own shape) is not ok');
          no('the BASELINE line followed by one more row', jl({ stdout: bl.stdout + '  ✓ one more row\n', stderr: '', known: KNOWN, expected: E0, flags: ['css'] }), /did not reach its summary/);
          const two = '  ✓ one\n' + KROWS.map((r) => '  ✗ ' + r).join('\n') + '\n\nBASELINE OK — ';
          p.need(jl({ stdout: two + '1 pass / the 2 KNOWN pre-exister(s): #136 · B3\n', stderr: '', known: KNOWN, expected: E0, flags: [] }).ok === true, 'BASELINE OK — 1 pass with 1 ✓ row must pass');
          no('BASELINE OK — 2 pass with 1 ✓ row', jl({ stdout: two + '2 pass / the 2 KNOWN pre-exister(s): #136 · B3\n', stderr: '', known: KNOWN, expected: E0, flags: [] }), /does not belong to these rows/);
          no('BASELINE OK with a ✗ row outside the KNOWN set', jl({ stdout: '  ✓ one\n  ✗ an odd row\n' + KROWS.map((r) => '  ✗ ' + r).join('\n') + '\n\nBASELINE OK — 1 pass / the 3 KNOWN pre-exister(s): x\n', stderr: '', known: KNOWN, expected: E0, flags: [] }), /does not belong to these rows/);
          // CLEAN
          p.need(jl({ stdout: '  ✓ a\n\nsmoke test CLEAN\n', stderr: '', known: [], expected: E0, flags: [] }).ok === true, 'smoke test CLEAN with no red row (control)');
          no('smoke test CLEAN as the last line with ✗ rows', jl({ stdout: '  ✓ a\n  ✗ ' + KROWS[0] + '\n  ✗ ' + KROWS[1] + '\n\nsmoke test CLEAN\n', stderr: '', known: KNOWN, expected: E0, flags: [] }), /with 2 red row/);
          no('smoke test CLEAN with a trailing row after it', jl({ stdout: '  ✓ a\n\nsmoke test CLEAN\n  ✓ b\n', stderr: '', known: [], expected: E0, flags: [] }), /did not reach its summary/);
          no('a line "x smoke test CLEAN"', jl({ stdout: '  ✓ a\nx smoke test CLEAN\n', stderr: '', known: [], expected: E0, flags: [] }), /did not reach its summary/);
          // a summary on both streams
          no('BASELINE OK on stdout + a FAILED block on stderr', jl({ stdout: bl.stdout, stderr: '\nFAILED:\nsome row\n', known: KNOWN, expected: E0, flags: ['css'] }), /two summaries/);
          no('smoke test CLEAN on stdout + a FAILED block on stderr', jl({ stdout: '  ✓ a\n\nsmoke test CLEAN\n', stderr: '\nFAILED:\nsome row\n', known: [], expected: E0, flags: [] }), /two summaries/);
          no('BASELINE OK on stdout + an ABSENT block on stderr', jl({ stdout: bl.stdout, stderr: '\nKNOWN pre-exister(s) ABSENT — silently fixed? Update KNOWN_PREEXISTERS:\n  ~ x\n', known: KNOWN, expected: E0, flags: ['css'] }), /two summaries/);
          // the ABSENT block: a whole line after an empty line, with the suite's own words
          const ab = '\nKNOWN pre-exister(s) ABSENT — silently fixed? Update KNOWN_PREEXISTERS:\n  ~ ' + KNOWN[1] + '\n';
          const abRows = '  ✓ a\n  ✗ ' + KROWS[0] + '\n';
          p.need(jl({ stdout: abRows, stderr: ab, known: KNOWN, expected: E0, flags: [] }).summary === 'absent', 'the ABSENT block is the summary "absent"');
          no('"x KNOWN pre-exister(s) ABSENT — " is no ABSENT line', jl({ stdout: abRows, stderr: ab.replace('\nKNOWN', '\nx KNOWN'), known: KNOWN, expected: E0, flags: [] }), /did not reach its summary/);
          no('an ABSENT block with no empty line before it', jl({ stdout: abRows, stderr: 'noise' + ab, known: KNOWN, expected: E0, flags: [] }), /did not reach its summary/);
          no('the ABSENT summary with a ✗ row outside the KNOWN set', jl({ stdout: abRows + '  ✗ an odd row\n', stderr: ab, known: KNOWN, expected: E0, flags: [] }), /ABSENT block without a FAILED block/);
          // `includes` is not `startsWith`: an expected match is the START of a row's label
          if (ENT.length) {
            const e = ENT[0], odd = 'zz prefix ' + rowOf(e);
            const reds = [...all.filter((r) => r !== rowOf(e)), odd];
            const r = judge({ reds });
            p.need(r.ok === false && r.lines.some((l) => l === '  ✗ ' + odd.slice(0, 220)) && r.lines.some((l) => l.startsWith('  ~ [' + e.f + '] ' + e.match)), 'a red row that CONTAINS a match but does not start with it must be UNEXPECTED (and its entry not red): ok=' + r.ok);
            const same = judge({ reds: all.map((x) => (x === rowOf(e) ? 'zz prefix ' + x : x)) });
            p.need(same.ok === false && has(same, /^UNEXPECTED red \(1\):/), 'the same, one row only: ' + same.ok);
          }
          rowD(23, 'C-1 line anchoring — "x FAILED:", "noise" + FAILED: (no empty line), FAILED: twice, a FAILED block short of one red row, a ✓ row that spells BASELINE OK as the only line, the BASELINE line followed by one more row, "BASELINE OK — 2 pass" with 1 ✓ row, one ✗ row outside the KNOWN set under BASELINE, "smoke test CLEAN" with ✗ rows / a row after it / "x " before it, a summary on both streams, the ABSENT line (prefix, no empty line, a ✗ row outside KNOWN) are each NOT ok, their controls are ok, FAILED: as the first line counts; a red row that only CONTAINS a match is UNEXPECTED (startsWith, not includes)', p);
        }

        /* ===== row 24 — leanVerdict (pure) ===== */
        let LV = null;
        const freeV = new Set();
        try {
          const sb = new Proxy({}, { has: (t, k) => { if (typeof k === 'string') freeV.add(k); return false; } });
          LV = new Function('__sb', 'with (__sb) {\n' + cutOne('function leanVerdict(') + '\nreturn leanVerdict;\n}')(sb);
          freeV.delete('leanVerdict');
        } catch (e) { rowD(24, 'leanVerdict cannot be extracted from scripts/smoke-packaged.mjs', [e.message]); }
        if (LV) {
          const p = P();
          const good = () => ({ judge: { ok: true, summary: 'failed' }, fBad: 0, xcStatus: 0, suite: { status: 1 } });
          const v = (o) => { try { return LV(o); } catch (e) { return { ok: 'THROW ' + e.message, fails: [] }; } };
          const g = v(good());
          p.need(g.ok === true && Array.isArray(g.fails) && g.fails.length === 0, 'the good input: ' + J(g));
          const bad = (name, mut, re, nFails = 1) => {
            const o = good(); mut(o); const r = v(o);
            p.need(r.ok === false && r.fails.length >= 1 && re.test(r.fails.join(' | ')) && (nFails === 0 || r.fails.length === nFails), name + ': ' + J(r));
          };
          bad('status 0 with the summary "failed"', (o) => { o.suite.status = 0; }, /exited with status 0, but its summary "failed" exits 1/);
          bad('status 134', (o) => { o.suite.status = 134; }, /status 134/);
          bad('a signal', (o) => { o.suite = { status: null, signal: 'SIGKILL' }; }, /signal SIGKILL/, 0);
          bad('a spawn error', (o) => { o.suite = { status: null, error: new Error('ENOBUFS') }; }, /ENOBUFS/, 0);
          bad('fBad 1', (o) => { o.fBad = 1; }, /1 Session F copy/);
          bad('xcStatus 1', (o) => { o.xcStatus = 1; }, /cross-check failed \(exit status 1\)/);
          bad('xcStatus null', (o) => { o.xcStatus = null; }, /cross-check failed \(exit status null\)/);
          bad('judge.ok false', (o) => { o.judge.ok = false; }, /not the expected set|did not reach/);
          bad('judge undefined', (o) => { o.judge = undefined; }, /not the expected set|did not reach/);
          bad('suite undefined', (o) => { o.suite = undefined; }, /status undefined/);
          bad('summary "baseline" with status 1', (o) => { o.judge.summary = 'baseline'; }, /summary "baseline" exits 0/);
          bad('summary "clean" with status 1', (o) => { o.judge.summary = 'clean'; }, /summary "clean" exits 0/);
          bad('summary "absent" with status 0', (o) => { o.judge.summary = 'absent'; o.suite.status = 0; }, /summary "absent" exits 1/);
          // summary null: the status alone cannot say — judge.ok is what fails (a judge that is ok with no summary is still refused by the status rule only when the status is wrong)
          bad('summary null (the judge says ok anyway)', (o) => { o.judge.summary = null; o.suite.status = 2; }, /status 2/);
          p.need(v({ judge: { ok: true, summary: 'baseline' }, fBad: 0, xcStatus: 0, suite: { status: 0 } }).ok === true, 'baseline + status 0 is ok');
          p.need(v({ judge: { ok: true, summary: 'clean' }, fBad: 0, xcStatus: 0, suite: { status: 0 } }).ok === true, 'clean + status 0 is ok');
          p.need(v({ judge: { ok: true, summary: 'absent' }, fBad: 0, xcStatus: 0, suite: { status: 1 } }).ok === true, 'absent + status 1 is ok');
          // each reason is its own: three failures at once give three reasons
          const three = good(); three.fBad = 2; three.xcStatus = 5; three.suite.status = 0;
          p.need(v(three).fails.length === 3, 'three faults give three reasons: ' + J(v(three).fails));
          // what it may NOT use: no name from outside the function (a pin cuts it out of the file)
          const outer = [...freeV].filter((n) => !/^(String|Error|Number|Array|Object|JSON|undefined)$/.test(n));
          p.need(outer.length === 0, 'leanVerdict uses names from outside itself: ' + outer.join(', '));
          rowD(24, 'C-1 leanVerdict (pure) — the good input is ok; each of these ALONE is not ok, with its own reason: status 0 with the summary "failed", status 134, a signal, a spawn error, fBad 1, xcStatus 1, xcStatus null, judge.ok false, judge undefined, suite undefined, summary "baseline" / "clean" with status 1, "absent" with status 0, status 2; the matching pairs (baseline / clean + 0, absent + 1) are ok; three faults give three reasons; the function uses no outside name', p);
        }

        /* ===== row 25 — removeLinks ===== */
        {
          const p = P();
          const FS3 = { lstatSync: fsm.lstatSync, unlinkSync: fsm.unlinkSync, rmdirSync: fsm.rmdirSync };
          const freeR = new Set();
          let RL = null;
          try {
            const sb = new Proxy({}, { has: (t, k) => { if (typeof k !== 'string') return false; if (k in FS3) return true; freeR.add(k); return false; }, get: (t, k) => (typeof k === 'string' ? FS3[k] : undefined) });
            RL = new Function('__sb', 'with (__sb) {\n' + cutOne('function removeLinks(') + '\nreturn removeLinks;\n}')(sb);
            freeR.delete('removeLinks');
          } catch (e) { p.push('removeLinks cannot be extracted: ' + e.message); }
          if (RL) {
            const T = fsm.mkdtempSync(pm.join(osm.tmpdir(), 'pin-rl-'));
            try {
              const mkTarget = (name) => { const d = pm.join(T, name); fsm.mkdirSync(pm.join(d, 'sub'), { recursive: true }); fsm.writeFileSync(pm.join(d, 'keep.txt'), 'KEEP ' + name); fsm.writeFileSync(pm.join(d, 'sub', 'deep.txt'), 'DEEP'); return d; };
              const intact = (d, name) => { try { return fsm.readFileSync(pm.join(d, 'keep.txt'), 'utf8') === 'KEEP ' + name && fsm.readFileSync(pm.join(d, 'sub', 'deep.txt'), 'utf8') === 'DEEP'; } catch (_) { return false; } };
              const gone = (q) => { try { fsm.lstatSync(q); return false; } catch (e) { return e.code === 'ENOENT'; } };
              const t1 = mkTarget('t1'), t2 = mkTarget('t2'), real = mkTarget('realdir');
              const l1 = pm.join(T, 'l1'), l2 = pm.join(T, 'l2');
              fsm.symlinkSync(t1, l1, 'junction'); fsm.symlinkSync(t2, l2, 'junction');
              const miss = pm.join(T, 'missing');
              const r0 = RL([l1]);
              p.need(Array.isArray(r0) && r0.length === 0, 'a real link: returned ' + J(r0));
              p.need(gone(l1), 'the link is still there');
              p.need(intact(t1, 't1'), 'the TARGET of a removed link lost files (the removal went through the link)');
              const r1 = RL([real]);
              p.need(r1.length === 1 && /not a link any more/.test(r1[0]) && r1[0].startsWith(real), 'a real directory: returned ' + J(r1));
              p.need(intact(real, 'realdir'), 'a path that is a real directory was touched');
              const r2 = RL([miss]);
              p.need(Array.isArray(r2) && r2.length === 0, 'a missing path: returned ' + J(r2));
              const fl = pm.join(T, 'afile.txt'); fsm.writeFileSync(fl, 'F');
              const r3 = RL([l2, real, miss, fl]);
              p.need(r3.length === 2 && r3[0].startsWith(real) && r3[1].startsWith(fl) && gone(l2) && intact(t2, 't2') && intact(real, 'realdir') && fsm.readFileSync(fl, 'utf8') === 'F', 'a list of a link, a directory, a missing path, a file: ' + J(r3));
              p.need(J(RL([])) === '[]', 'an empty list');
              if (process.platform !== 'win32') {
                const dl = pm.join(T, 'dangling'); fsm.symlinkSync(pm.join(T, 'no-such-target'), dl);
                const r4 = RL([dl]);
                p.need(r4.length === 0 && gone(dl), 'a dangling link must be removed: ' + J(r4));
              }
              const outer = [...freeR].filter((n) => !/^(String|Error|Array|Object|JSON|undefined)$/.test(n));
              p.need(outer.length === 0, 'removeLinks uses names from outside itself besides the three fs functions: ' + outer.join(', '));
            } finally { fsm.rmSync(T, { recursive: true, force: true }); }
          }
          rowD(25, 'C-1 removeLinks — in a temp folder a real link is removed and its TARGET folder and the files in it are intact; a path that is a real directory (or a file) is left alone, intact, and reported "not a link any more"; a missing path is fine; a mixed list reports exactly the stuck ones; an empty list is []; a dangling link is removed', p);
        }

        /* ===== rows 26, 28, 29 — leanGate2 by behaviour: ONE fake tree factory around the REAL smoke-packaged.mjs (its `root` is the folder above its own scripts/) =====
         * The fake scripts log ONE JSON object per call (never a space-split line: a path may hold spaces); the pin compares the args as arrays. */
        {
          const D = fsm.mkdtempSync(pm.join(osm.tmpdir(), 'pin-lg2-'));
          const skipped = [];
          const W = (f, text) => { fsm.mkdirSync(pm.dirname(f), { recursive: true }); fsm.writeFileSync(f, text); };
          const nz = (s) => String(s).replace(/\\/g, '/');
          const rp = (s) => { try { return nz(fsm.realpathSync(s)); } catch (_) { return nz(s); } };
          const samePath = (a, b) => nz(a) === nz(b) || rp(a) === rp(b);
          const FAKE = {
            strip: "import { appendFileSync } from 'node:fs';\nappendFileSync(process.env.FAKE_LOG, JSON.stringify({ k: 'strip', script: process.argv[1], args: process.argv.slice(2) }) + '\\n');\nif (process.env.FAKE_STRIP_FAIL && process.argv.includes(process.env.FAKE_STRIP_FAIL)) { console.error('fake strip: failing on purpose'); process.exit(1); }\n",
            lean: "const bad = process.env.FAKE_F === 'bad';\nexport const stripCssLean = (s) => (bad ? s + '!' : s);\nexport const stripJsComments = (s) => (bad ? s + '!' : s);\n",
            xc: "import { appendFileSync } from 'node:fs';\nappendFileSync(process.env.FAKE_LOG, JSON.stringify({ k: 'xc', args: process.argv.slice(2) }) + '\\n');\nconsole.log('fake cross-check');\nprocess.exit(Number(process.env.FAKE_XC || 0));\n",
            suite: [
              "import { readFileSync, appendFileSync, unlinkSync, rmdirSync, mkdirSync } from 'node:fs';",
              "const KNOWN_PREEXISTERS = [",
              "  'fake known pre-exister one',",
              "  'fake known pre-exister two',",
              "];",
              "appendFileSync(process.env.FAKE_LOG, JSON.stringify({ k: 'suite', from: process.env.SPIXI_PACKAGED_FROM || '', lean: process.env.SPIXI_PACKAGED_LEAN }) + '\\n');",
              "const J = JSON.parse(readFileSync(new URL('./pins-perflean/lean-expected-reds.json', import.meta.url), 'utf8'));",
              "const lean = (process.env.SPIXI_PACKAGED_LEAN || '').split(',').filter(Boolean);",
              "const fails = [];",
              "for (let i = 0; i < 3; i++) console.log('  ✓ fake pass row ' + i);",
              "for (const f of ['copy', ...lean]) for (const e of J[f] || []) { const t = e.match + ' — fake tail'; console.log('  ✗ ' + t); fails.push(t); }",
              "for (const k of KNOWN_PREEXISTERS) console.log('  ✗ ' + k + ' — fake tail');",
              "const mode = process.env.FAKE_SUITE || 'real';",
              "if (mode === 'crash') throw new Error('fake suite crash');",
              "if (mode === 'swap') { try { unlinkSync('node_modules'); } catch (e) { rmdirSync('node_modules'); } mkdirSync('node_modules'); }",
              "console.error('\\nFAILED:\\n' + fails.join('\\n'));",
              "if (mode === 'signal') process.kill(process.pid, 'SIGKILL');",
              "process.exit(mode === 'status0' ? 0 : mode === 'status134' ? 134 : 1);",
            ].join('\n') + '\n',
          };
          const SRCS = { 'src/styles/tokens.css': 'a', 'src/styles/chat-pattern.css': 'b', 'src/components/icons.iife.js': 'c', 'src/demo/spixi.iife.js': 'd', 'src/demo/strings.iife.js': 'e' };
          const BUILT = { 'spixi.tokens.css': 'a', 'spixi.chat-pattern.css': 'b', 'spixi.icons.js': 'c', 'spixi.bundle.js': 'd', 'spixi.strings.js': 'e' };
          let n = 0;
          const run = (flags, env = {}) => {
            n++;
            const S = pm.join(D, 's' + n), R = pm.join(S, 'fake'), TM = pm.join(S, 'tmp'), LOG = pm.join(S, 'calls.log');
            fsm.mkdirSync(TM, { recursive: true });
            fsm.copyFileSync(pm.join(base, 'scripts/smoke-packaged.mjs'), (fsm.mkdirSync(pm.join(R, 'scripts'), { recursive: true }), pm.join(R, 'scripts/smoke-packaged.mjs')));
            W(pm.join(R, 'scripts/strip-release.mjs'), FAKE.strip); W(pm.join(R, 'scripts/lib/lean-strip.mjs'), FAKE.lean);
            W(pm.join(R, 'scripts/pins-perflean/x-parser-crosscheck.mjs'), FAKE.xc); W(pm.join(R, 'scripts/smoke-test.mjs'), FAKE.suite);
            fsm.copyFileSync(pm.join(base, 'scripts/pins-perflean/lean-expected-reds.json'), pm.join(R, 'scripts/pins-perflean/lean-expected-reds.json'));
            for (const [f, t] of Object.entries(SRCS)) W(pm.join(R, f), t);
            for (const [f, t] of Object.entries(BUILT)) W(pm.join(R, 'Spixi/Resources/Raw/html', f), t);
            W(pm.join(R, 'node_modules/marker.txt'), 'NM'); W(pm.join(R, 'local-nuget/marker.txt'), 'LN'); W(pm.join(S, 'Ixian-Core/marker.txt'), 'IC');
            const e2 = { ...process.env, ...env, FAKE_LOG: LOG, TMPDIR: TM, TEMP: TM, TMP: TM }; delete e2.SPIXI_PACKAGED_FROM; delete e2.SPIXI_PACKAGED_LEAN;
            const r = cpm.spawnSync(process.execPath, [pm.join(R, 'scripts/smoke-packaged.mjs'), ...flags], { cwd: S, env: e2, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
            let log = ''; try { log = fsm.readFileSync(LOG, 'utf8').replace(/\r/g, ''); } catch (_) { /* no calls */ }
            const rd = (f) => { try { return fsm.readFileSync(f, 'utf8'); } catch (_) { return null; } };
            const calls = log.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (_) { return { k: '?', raw: l }; } });
            return { code: r.status, signal: r.signal, out: r.stdout || '', err: r.stderr || '', calls, tmpLeft: fsm.readdirSync(TM), R, S, TM, markers: [rd(pm.join(R, 'node_modules/marker.txt')), rd(pm.join(R, 'local-nuget/marker.txt')), rd(pm.join(S, 'Ixian-Core/marker.txt'))], rawFrom: pm.join(R, 'Spixi/Resources/Raw/html') };
          };
          const say = (r) => 'exit ' + r.code + (r.signal ? ' ' + r.signal : '') + ' · ' + (r.err.trim().split('\n').pop() || r.out.trim().split('\n').pop() || '').slice(0, 140);
          const both = ['--lean-css', '--lean-js'];
          const bad = (p, name, flags, env, re, extra) => {
            const r = run(flags, env);
            p.need(r.code === 1 && re.test(r.err + '\n' + r.out) && (!extra || extra(r)), name + ': ' + say(r) + ' (want exit 1 and ' + re + ')');
            return r;
          };
          const MARK = ['NM', 'LN', 'IC'];
          try {
            /* ---------- row 26 ---------- */
            {
              const p = P();
              // ---- the good run: every call, in order, with the flags
              const g = run(both);
              p.need(g.code === 0 && /GATE 2 OK \(lean css,js\)/.test(g.out), 'good run: ' + say(g));
              p.need(J(g.calls.map((c) => c.k)) === J(['strip', 'strip', 'xc', 'suite']), 'the calls, in order: strip --out · strip --check · the cross-check · the suite (' + J(g.calls).slice(0, 500) + ')');
              const [co, cc, cx, cs] = g.calls;
              if (co && cc && cx && cs && co.k === 'strip' && cc.k === 'strip') {
                const copyRaw = co.args[1];
                p.need(J(co.args.map((a, i) => (i === 1 ? '<out>' : a))) === J(['--out', '<out>', '--in-place', '--lean-css', '--lean-js']), 'the COPY\'s strip is called with --out <dir> --in-place and both flags (the copy is stripped in place): ' + J(co.args));
                p.need(!nz(co.script).startsWith(nz(g.R)) && nz(co.script).includes('/spixi-packaged-'), 'the package is made by the COPY\'s strip-release (' + co.script + ')');
                p.need(nz(copyRaw).includes('/spixi-packaged-') && nz(copyRaw).endsWith('/Spixi/Resources/Raw/html'), 'the --out folder is the COPY\'s Raw/html: ' + copyRaw);
                p.need(nz(cc.script).startsWith(nz(g.R)) && J(cc.args.map((a, i) => (i === 1 ? '<out>' : a))) === J(['--check', '<out>', '--lean-css', '--lean-js']) && cc.args[1] === copyRaw, 'GATE 1 runs the COMMITTED tree\'s strip-release --check over the folder the strip wrote, with both flags: ' + J(cc));
                p.need(J(cx.args.map((a, i) => (i === 1 || i === 3 ? '<dir>' : a))) === J(['--committed', '<dir>', '--packaged', '<dir>', '--lean-css', '--lean-js']) && samePath(cx.args[1], g.rawFrom) && cx.args[3] === copyRaw, 'the cross-check gets --committed <the committed Raw/html> --packaged <the copy\'s> and the flags: ' + J(cx.args));
                p.need(samePath(cs.from, g.rawFrom) && cs.lean === 'css,js', 'the suite env holds SPIXI_PACKAGED_FROM (the committed Raw/html) and SPIXI_PACKAGED_LEAN=css,js: ' + J(cs) + ' (want from ' + g.rawFrom + ')');
              } else p.push('the first two calls are not two strip calls: ' + J(g.calls).slice(0, 300));
              p.need(g.tmpLeft.length === 0, 'the temp folder is not deleted after a good run: ' + J(g.tmpLeft));
              p.need(J(g.markers) === J(MARK), 'a linked folder lost its content: ' + J(g.markers));
              // ---- single flags: every call carries that flag only
              for (const f of ['css', 'js']) {
                const s = run(['--lean-' + f]);
                const other = f === 'css' ? 'js' : 'css';
                p.need(s.code === 0 && new RegExp('GATE 2 OK \\(lean ' + f + '\\)').test(s.out), '[--lean-' + f + '] good run: ' + say(s));
                const dashes = (c) => (c.args || []).filter((a) => a.startsWith('--'));
                p.need(s.calls.length === 4 && J(dashes(s.calls[0])) === J(['--out', '--in-place', '--lean-' + f]) && J(dashes(s.calls[1])) === J(['--check', '--lean-' + f]) && J(dashes(s.calls[2])) === J(['--committed', '--packaged', '--lean-' + f]) && s.calls[3].lean === f && !J(s.calls).includes('lean-' + other), '[--lean-' + f + '] every call carries that flag only: ' + J(s.calls).slice(0, 400));
              }
              // ---- the wiring mutants of the review, each as a run that must FAIL (exit 1, with its reason)
              bad(p, 'the suite exits 0 although its summary is "failed" (the verdict, the status rule)', both, { FAKE_SUITE: 'status0' }, /exited with status 0, but its summary "failed" exits 1/);
              bad(p, 'the suite exits 134', both, { FAKE_SUITE: 'status134' }, /exited with status 134/);
              if (process.platform === 'win32') skipped.push('row 26 "the suite is killed by a signal": process.kill(pid, "SIGKILL") ends on Windows with status 1 and NO signal (the status-1 path of the FAILED block is covered by the good run)');
              else bad(p, 'the suite is killed by a signal', both, { FAKE_SUITE: 'signal' }, /signal SIGKILL/);
              bad(p, 'the suite crashes (no summary)', both, { FAKE_SUITE: 'crash' }, /did not reach its summary/);
              bad(p, 'the cross-check fails (its status is read)', both, { FAKE_XC: '3' }, /parser cross-check failed \(exit status 3\)/);
              bad(p, 'a Session F copy differs from the shipped transform (the re-check is used)', both, { FAKE_F: 'bad' }, /5 Session F copy/);
              bad(p, 'a single-flag Session F re-check covers its own kind only', ['--lean-js'], { FAKE_F: 'bad' }, /3 Session F copy/);
              bad(p, 'GATE 1 fails (the suite never starts)', both, { FAKE_STRIP_FAIL: '--check' }, /GATE 2 FAILED/, (r) => !r.calls.some((c) => c.k === 'suite') && !r.calls.some((c) => c.k === 'xc'));
              bad(p, 'the strip of the package fails (nothing runs after it)', both, { FAKE_STRIP_FAIL: '--out' }, /GATE 2 FAILED/, (r) => r.calls.length === 1);
              // ---- a link that cannot be removed: the temp folder stays, the run exits 1, the real folders are intact
              const sw = bad(p, 'a link that is no longer a link (node_modules replaced by a directory in the copy)', both, { FAKE_SUITE: 'swap' }, /NOT deleted/, (r) => r.tmpLeft.length === 1);
              p.need(J(sw.markers) === J(MARK), 'after the stuck link a linked folder lost its content: ' + J(sw.markers));
              if (skipped.length) for (const x of skipped) console.log('  ~ SKIPPED (leanGate2 fake tree): ' + x);
              rowD(26, 'C-1 leanGate2 WIRING, by behaviour (a fake tree around the REAL smoke-packaged.mjs: fake strip-release / lean-strip / cross-check / suite that log ONE JSON object per call, args compared as arrays) — a good run exits 0 and makes the four calls in order: the COPY\'s strip --out <dir> --in-place with the flags, the committed tree\'s strip --check with the flags, the cross-check with --committed / --packaged / the flags, the suite with SPIXI_PACKAGED_FROM and SPIXI_PACKAGED_LEAN; one flag = that flag everywhere; each of suite status 0 under "failed", status 134, a signal' + (process.platform === 'win32' ? ' (SKIPPED on win32: no signal there)' : '') + ', a crash, a failing cross-check, a Session F copy that differs, a failing GATE 1 / strip exits 1 with its own reason; a link that stays keeps the temp folder and exits 1, the linked folders intact', p);
            }

            /* ---------- row 28 — the argument errors of a lean run: exit 2 BEFORE anything is copied ---------- */
            {
              const p = P();
              const cases = [
                [['--lean-jss'], '"--lean-jss"', 'a typo of the only flag (no lean flag at all)'],
                [['--lean-css', '--lean-jss'], '"--lean-jss"', 'one good flag + a typo (before: css only ran, the js half was silently skipped)'],
                [['--lean-js', 'foo'], '"foo"', 'a stray word'],
                [['--lean-css=1'], '"--lean-css=1"', 'a flag with a value'],
                [['--keep', '--lean-jss'], '"--lean-jss"', '--keep does not make a typo acceptable'],
                [['--lean-css', '--lean-js', '--other'], '"--other"', 'a third flag beside both lean flags'],
              ];
              for (const [flags, quoted, why] of cases) {
                const r = run(flags);
                p.need(r.code === 2 && r.err.includes('unknown argument(s) in a lean run: ' + quoted) && /usage: node scripts\/smoke-packaged\.mjs \[--lean-css\] \[--lean-js\] \[--keep\]/.test(r.err), why + ' [' + flags.join(' ') + ']: ' + say(r) + ' (want exit 2 naming ' + quoted + ' and the usage line)');
                p.need(r.calls.length === 0 && r.tmpLeft.length === 0 && !/copying the tree/.test(r.out), why + ' [' + flags.join(' ') + ']: nothing may start — calls ' + J(r.calls).slice(0, 120) + ', temp folder ' + J(r.tmpLeft) + ', stdout ' + J(r.out.slice(0, 80)));
              }
              // two bad arguments are both named
              const two = run(['--lean-css', '--lean-jss', 'foo']);
              p.need(two.code === 2 && two.err.includes('"--lean-jss" "foo"'), 'two bad arguments are both named: ' + say(two));
              // the controls: --keep and either lean flag are accepted (the run starts), so the check is not a blanket refusal
              for (const flags of [['--lean-css', '--keep'], ['--keep', '--lean-js']]) {
                const r = run(flags);
                p.need(r.code === 0 && /GATE 2 OK/.test(r.out), 'control [' + flags.join(' ') + '] is accepted: ' + say(r));
              }
              rowD(28, 'C-1 smoke-packaged argument errors (fake tree) — a typo (--lean-jss) alone, beside a good flag (before: css only ran), a stray word, a flag with a value, a typo beside --keep, a third flag: exit 2, the offending argument(s) quoted, the usage line, and NOTHING started (no fake call, no spixi-packaged-* folder in the temp dir, no "copying the tree"); two bad arguments are both named; --keep + one lean flag is accepted', p);
            }

            /* ---------- row 29 — --keep and the exit code ---------- */
            {
              const p = P();
              const kept = (r) => { const m = /copy kept at (.+?) \(the links to node_modules, local-nuget and Ixian-Core were removed; the kept copy holds files only\)/.exec(r.out); return m ? m[1] : null; };
              const isLink = (q) => { try { return fsm.lstatSync(q).isSymbolicLink(); } catch (_) { return false; } };
              const exists = (q) => { try { fsm.lstatSync(q); return true; } catch (_) { return false; } };
              const linksIn = (dir) => { const hits = []; const walk = (d) => { let es = []; try { es = fsm.readdirSync(d, { withFileTypes: true }); } catch (_) { return; } for (const e of es) { const q = pm.join(d, e.name); if (isLink(q)) hits.push(q); else if (e.isDirectory()) walk(q); } }; walk(dir); return hits; };
              const checkKept = (r, label, wantCode) => {
                const k = kept(r);
                p.need(r.code === wantCode, label + ': exit ' + r.code + ' (want ' + wantCode + ') ' + say(r));
                p.need(k !== null && r.tmpLeft.length === 1 && samePath(pm.dirname(k), r.TM) && fsm.existsSync(k), label + ': the "copy kept at" line names the one folder left in the temp dir: ' + J(k) + ' / ' + J(r.tmpLeft));
                if (k) {
                  p.need(!exists(pm.join(k, 'Spixi', 'node_modules')) && !exists(pm.join(k, 'Spixi', 'local-nuget')) && !exists(pm.join(k, 'Ixian-Core')), label + ': the three links are removed from the kept copy (also with --keep)');
                  p.need(linksIn(k).length === 0, label + ': the kept copy holds files only, links found: ' + J(linksIn(k)));
                  p.need(fsm.existsSync(pm.join(k, 'Spixi', 'scripts', 'smoke-packaged.mjs')), label + ': the kept copy holds the copied files');
                }
                p.need(J(r.markers) === J(MARK), label + ': a linked folder lost its content: ' + J(r.markers));
              };
              checkKept(run(['--lean-css', '--lean-js', '--keep']), '--keep, a good run', 0);
              checkKept(run(['--lean-css', '--lean-js', '--keep'], { FAKE_SUITE: 'status134' }), '--keep, the suite exits 134', 1);
              checkKept(run(['--keep', '--lean-js'], { FAKE_SUITE: 'status0' }), '--keep, the suite exits 0 under "failed"', 1);
              checkKept(run(['--lean-css', '--keep'], { FAKE_XC: '3' }), '--keep, the cross-check fails', 1);
              checkKept(run(['--lean-css', '--lean-js', '--keep'], { FAKE_STRIP_FAIL: '--out' }), '--keep, the strip of the package fails (the catch path)', 1);
              // no --keep: the same failing run deletes the temp folder and still exits 1 (the exit code does not depend on --keep)
              const nk = run(both, { FAKE_SUITE: 'status134' });
              p.need(nk.code === 1 && nk.tmpLeft.length === 0 && kept(nk) === null && J(nk.markers) === J(MARK), 'a failing run without --keep: exit 1, the temp folder deleted: ' + say(nk) + ' / ' + J(nk.tmpLeft));
              // --keep with a link that cannot be removed: exit 1, NO "copy kept" line, the temp folder is NOT deleted, the real folders intact
              const ks = run([...both, '--keep'], { FAKE_SUITE: 'swap' });
              p.need(ks.code === 1 && /NOT deleted/.test(ks.err) && kept(ks) === null && ks.tmpLeft.length === 1 && J(ks.markers) === J(MARK), '--keep + a stuck link: ' + say(ks) + ' kept=' + J(kept(ks)) + ' left=' + J(ks.tmpLeft));
              rowD(29, 'C-1 --keep and the exit code (fake tree) — a good run with --keep exits 0; with --keep the suite at 134, the suite at 0 under "failed", a failing cross-check, a failing package strip (the catch path) each exit 1; in every case the temp copy is KEPT (the one folder in the temp dir, named on the "copy kept at" line), the three links are removed from it (no link anywhere in the kept copy), the linked real folders are intact; without --keep a failing run deletes the copy and still exits 1; --keep with a link that cannot be removed exits 1, prints no "copy kept" line and keeps the folder as NOT deleted', p);
            }
          } finally { fsm.rmSync(D, { recursive: true, force: true }); }
        }

        /* ===== row 27 — STRUCTURAL BELT (not behaviour): the order of removeLinks and the recursive delete, the ONE exit code, the ONE return ===== */
        {
          const p = P();
          let src = '';
          try { src = cutOne('async function leanGate2('); } catch (e) { p.push('leanGate2 not found: ' + e.message); }
          const lines = src.split('\n').map((l) => l.replace(/\s\/\/[^\n]*$/, '').replace(/^\s*\/\/.*$/, '')).filter((l) => l.trim() !== '');
          const flat = lines.join('\n').replace(/\s+/g, ' ');
          const at = (re) => lines.findIndex((l) => re.test(l));
          // (1) the links go in EVERY path: ONE call, at function level (indent 2), AFTER the try / catch, before anything is deleted
          const calls = (flat.match(/removeLinks\(/g) || []).length;
          const iCatch = at(/^  \} catch \(e\) \{$/), iStuck = at(/^  const stuck = removeLinks\(links\);$/);
          p.need(calls === 1 && iStuck > 0, 'removeLinks(links) is called exactly once, as `const stuck = removeLinks(links);` at function level (calls ' + calls + ', line ' + iStuck + ')');
          p.need(iCatch > 0 && iStuck > iCatch, 'that call comes AFTER the try / catch (so it also runs in the catch path, with --keep and after a failed run): catch at ' + iCatch + ', call at ' + iStuck);
          // (2) after it: stuck → message only; else keep → message only; else the one recursive delete
          p.need(iStuck > 0 && /^  if \(stuck\.length\) console\.error\(/.test(lines[iStuck + 1] || '') && /^  else if \(keep\) console\.log\(/.test(lines[iStuck + 2] || '') && /^  else rmSync\(tmp, \{ recursive: true, force: true \}\);$/.test(lines[iStuck + 3] || ''), 'after removeLinks: `if (stuck.length)` message · `else if (keep)` message · `else rmSync(tmp, { recursive: true, force: true })` (the three lines right after)');
          p.need((flat.match(/rmSync\(/g) || []).length === 1, 'exactly one rmSync in leanGate2: ' + (flat.match(/rmSync\(/g) || []).length);
          // (3) the verdict: set only by leanVerdict with the judge, fBad, the cross-check status and the suite status / signal / error
          p.need(/const v = leanVerdict\(\{ judge: j, fBad, xcStatus: xc\.status, suite: \{ status: r\.status, signal: r\.signal, error: r\.error \} \}\);/.test(flat), 'leanVerdict is called with the judge, fBad, the cross-check status and the suite status / signal / error');
          p.need((flat.match(/\bverdict = /g) || []).length === 2 && /let verdict = null;/.test(flat) && /verdict = v;/.test(flat), '`verdict` is declared null and assigned once, from v');
          // (4) ONE code line, computed from the verdict and the stuck links; ONE return, the last statement
          const codeLines = lines.filter((l) => /\bcode\b\s*=[^=]/.test(l));
          p.need(codeLines.length === 1 && /^  const code = verdict && verdict\.ok === true && stuck\.length === 0 \? 0 : 1;$/.test(codeLines[0]), 'exactly one line sets the exit code: from verdict.ok === true and stuck.length === 0 (' + J(codeLines) + ')');
          const rets = lines.filter((l) => /\breturn\b/.test(l));
          p.need(rets.length === 1 && /^  return code;$/.test(rets[0]) && /^  return code;$/.test(lines[lines.length - 2] || ''), 'exactly one `return`, `return code;`, the last statement (returns: ' + J(rets) + ')');
          rowD(27, 'C-1 STRUCTURAL BELT (text, not behaviour — rows 26 / 29 cannot see the order of two deletes on Linux, where rmSync never follows a link): inside leanGate2 removeLinks(links) is called once, at function level AFTER the try / catch (every path, also --keep), followed by `if (stuck.length)` / `else if (keep)` / `else rmSync(…)` and the one recursive delete; leanVerdict gets the judge / fBad / the cross-check status / the suite status, signal, error; `verdict` is set only from it; ONE code line from verdict.ok === true and stuck.length === 0; ONE return, `return code;`', p);
        }
      }
    }
  }
}
