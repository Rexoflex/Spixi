/* ==== walktools · C — the walk parser: item 3 (the per-page rows of an older page and the first-page rule of history-seed-kNN) of
 * scripts/device/adb-walk-parse.ps1 (contract docs/contract-walktools.md I-3 + I-3a, mechanisms § 3).
 *
 * LIMITS (#1735, stated in the FIRST version). Pure node: CI has no PowerShell step, so every key is a SOURCE pin on the parser script
 * (statements and blocks held by exact text or SHA-256, whole-line comments and blank lines dropped) plus the BEHAVIOUR of the pieces that
 * can be run in JavaScript (the regexes extracted from the script text, PowerShell `\A` -> `^`, `\z` -> `$`; the mode word reader). A source pin
 * does NOT prove that PowerShell runs the statements in the order they are written, that a row has the number the log holds, or that the
 * summary of a run is byte-equal before / after; that is the job of the BY-HAND pin scripts/pins-walktools/c-parser-run.mjs (needs pwsh; it
 * runs the parser on the synthetic run folders in fixtures/ and compares rows). Nothing here ran on Windows PowerShell 5.1 or on a phone.
 * What stays UNCAUGHT: a change to an OLD function that this batch did not touch is held only by d (the SHA-256 of each old function's
 * statements, the changed ones named: New-Def, Get-DataRow, X-SeedFirstPage, Invoke-Main); a change INSIDE those four old functions outside the lines
 * the keys name is not held (c-parser-run.mjs catches an effect on the rows, not a change that has none); a whole-line comment, a blank line and
 * the indentation are not code and are not caught; a redefinition of a name elsewhere; the legend text of the summary.
 *   a linePatterns — the five line definitions in $script:L (Gram = $true, anchored at the message start by $script:Cm, `(?=\s|$)` after the fixed
 *                    words) with the EXACT words `shell older insert` · `shell older frames` · `chat loadmore in` · `chat older read` ·
 *                    `chat older push`; the regexes run in JavaScript: they match their own line and none of the neighbours (`chat load` does not
 *                    match `chat loadmore in`; `chat read` is not `chat older read`)
 *   b optionalRows — the 17 rows of one page in their order, ALL `New-Def ... $false` (no value = n/a with the reason, never "no data"); names start
 *                    with `page <k> `; history = pages 1..3, history-seed-kNN = page 1 behind the pages gate (X-SeedPagesGate through X-PageGate);
 *                    the new rows are APPENDED after the old ones (the closing `) + $script:...PageDefs`)
 *   c oldBlocks    — the old defs blocks hold by SHA-256 as they are at the base (2026-11-22, work/walktools @ 338d30f4): the defs from OpenDefs to the
 *                    new block, the step table (with the one appended token removed), HistorySeedDefs (the same), MemDefs
 *   d oldFunctions — every function of the base but the four named is byte-identical by SHA-256 of its statements; the seven new functions exist once
 *   e firstPage    — X-SeedFirstPage: branch 1 (`chat loadmore in` -> the first `chat load` at or after it; none after = missing, no fall-through) THEN
 *                    branch 2 (a `shell send loadmore` line AND as many `chat load` lines as send lines -> the first `chat load` of the window, no stamp compare; another number = missing, review round 1 M1) THEN branch 3 (missing with
 *                    the reason); the old rule (`chat load` after the SEND line) is gone; a JavaScript MIRROR of the rule documents nine cases (it is not read from the
 *                    script: only the source order above and c-parser-run.mjs r4 / r5 / r6 prove the script itself)
 *   f modeWord     — the reader of `mode=` (Get-WordTok) accepts only [a-z]{1,16} (run in JavaScript on ten words), X-PageTok maps the word `insert`
 *                    (ordinal) to 1 and any other word to 0, an unreadable word to missing; the row's aggregate note is `insert in n of m` (new Agg kind
 *                    `insertmode`), the old `spare` note text is unchanged
 *   g pairing      — page k = the k-th line of its kind ($hits[$K - 1]); C# loadmore in -> push = the K-th push stamp minus the K-th loadmore stamp;
 *                    either absent / fewer than K = missing; no raw line goes into a row (the tail only passes through Get-Tok / Get-WordTok); the page
 *                    note of the legend is printed only when a page row has a value (a run without the new lines prints none)
 *   h pageCounts   — review round 1 (M2): a page row of kind K has a value only when the K lines and the page requests (`shell send loadmore` lines) are
 *                    equal in number (C# kinds read / push: the `chat loadmore in` lines too when they exist); else n/a `<n> "<kind>" lines for <m> page requests (cannot pair)`
 *   i pairOrder    — review round 1 (M2): `C# loadmore in -> push` needs both counts equal to the page requests, push K not before loadmore K, and push K before loadmore K+1
 * Deliberate breaks (#802): the builder's report, one one-token mutation per key in a full copy. */
import { createHash } from 'node:crypto';

const sha = (x) => createHash('sha256').update(x).digest('hex');
const code = (t) => t.replace(/<#[\s\S]*?#>/g, '').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');   // block + whole-line comments
const count = (t, s) => t.split(s).length - 1;
const psMatch = (t, from) => {   // the first {...} at/after `from`; skips '..' (''), ".." (` and ""), here-strings, <# #>, #
  const o = t.indexOf('{', from); if (o < 0) return null;
  let d = 0, k = o;
  while (k < t.length) {
    const c = t[k], n = t[k + 1];
    if (c === '<' && n === '#') { const e = t.indexOf('#>', k + 2); if (e < 0) return null; k = e + 2; continue; }
    if (c === '#') { const e = t.indexOf('\n', k); if (e < 0) return null; k = e; continue; }
    if (c === '@' && (n === "'" || n === '"') && /^[ \t]*\n/.test(t.slice(k + 2, k + 6))) { const e = t.indexOf('\n' + n + '@', k + 2); if (e < 0) return null; k = e + 3; continue; }
    if (c === "'") { k++; while (k < t.length) { if (t[k] === "'") { if (t[k + 1] === "'") { k += 2; continue; } break; } k++; } k++; continue; }
    if (c === '"') { k++; while (k < t.length) { if (t[k] === '`') { k += 2; continue; } if (t[k] === '"') { if (t[k + 1] === '"') { k += 2; continue; } break; } k++; } k++; continue; }
    if (c === '`') { k += 2; continue; }
    if (c === '{') d++; else if (c === '}' && --d === 0) return t.slice(o, k + 1);
    k++;
  }
  return null;
};
const lines = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean);
const fnNames = (t) => [...t.matchAll(/^function ([A-Za-z]+-[A-Za-z0-9]+)\b/gm)].map((m) => m[1]);
const fnPS = (t, name) => { const m = new RegExp('^function ' + name.replace(/-/g, '\\-') + '\\b', 'm').exec(t); return m ? (psMatch(t, m.index) || '') : ''; };
const fnStm = (t, n) => lines(fnPS(t, n));
const js = (re) => new RegExp(re.replace(/\\A/g, '^').replace(/\\z/g, '$'));
// the text of a `$script:X = @(` ... `\n)` table (to the first line that is only `)` or starts with `) `), start line included, closing line excluded
const tableText = (t, start) => { const i = t.indexOf(start); if (i < 0) return ''; const e = t.slice(i).search(/\n\)/); return e < 0 ? '' : t.slice(i, i + e); };

// ── the frozen base values: SHA-256 of the statements of the BASE script (work/walktools @ 338d30f4, scripts/device/adb-walk-parse.ps1) ──
const BASE = {
  openDefs: '4963f8804453a84175cca8f7f38a6b4cf529b3924c9487b6b905f975f7492f24',      // from `$script:OpenDefs = @(` to the line before `$script:StepTable` (base) / before the walktools block (now)
  stepTable: 'd748391268cefde74a30a567d952826160ff3fcff718458d49ddcadd82b5b6cc',    // the step table block `{...}`, the appended token ` + $script:HistoryPageDefs` removed
  seedDefs: '165d5f386cfadad852f8da6c500ec5fd858c8e875f12509a6b551cb6724dcac8',      // `$script:HistorySeedDefs = @(` ... the last def (closing `)` not included)
  memDefs: '4dfc7535da65f65697805770e8da1f44c36799e077165312f543621d7dbca5ca',
  fns: 'c270a0183b0d44c86577d463364b14047809b38bd3e1e04088aaff8721714f12',                // SHA-256 of the sorted `name:sha` lines of every base function but CHANGED_FNS
  fnCount: 68,
};
export const CHANGED_FNS = ['New-Def', 'Get-DataRow', 'X-SeedFirstPage', 'Invoke-Main'];
export const NEW_FNS = ['Get-WordTok', 'X-PageGate', 'Get-NoPair', 'X-PageTok', 'X-PagePush', 'X-Page', 'New-PageDefs'];   // review round 1: + Get-NoPair
export const _h = { sha, code, lines, fnPS, fnStm, fnNames, psMatch, tableText };

export function oldBlocks(par) {   // the four held old blocks of a parser text, as statement-list hashes
  const P = code(par);
  const iOpen = P.indexOf('$script:OpenDefs = @(');
  // code() dropped whole-line comments, so the new block is found by its first statement instead
  const nb = P.indexOf('$script:PageRows = @(');
  const iEnd = [nb, P.indexOf('$script:StepTable = [ordered]@{')].filter((i) => i > iOpen).sort((a, b) => a - b)[0];
  const openDefs = iOpen < 0 || iEnd === undefined ? '' : P.slice(iOpen, iEnd);
  const iStep = P.indexOf('$script:StepTable = [ordered]@{');
  const stepBlock = iStep < 0 ? '' : (psMatch(P, iStep) || '').replace(' + $script:HistoryPageDefs', '');
  const seed = tableText(P, '$script:HistorySeedDefs = @(');
  const mem = tableText(P, '$script:MemDefs = @(');
  return { openDefs: sha(lines(openDefs).join('\n')), stepTable: sha(lines(stepBlock).join('\n')), seedDefs: sha(lines(seed).join('\n')), memDefs: sha(lines(mem).join('\n')) };
}
export function oldFnHash(par) {
  const P = code(par);
  const names = fnNames(P).filter((n) => !CHANGED_FNS.includes(n) && !NEW_FNS.includes(n));
  const rows = names.map((n) => n + ':' + sha(fnStm(P, n).join('\n'))).sort();
  return { hash: sha(rows.join('\n')), n: names.length, all: fnNames(P).length };
}

export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/\r\n/g, '\n');
  const PAR = raw('scripts/device/adb-walk-parse.ps1');
  const P = code(PAR);
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const fnP = (n) => fnPS(P, n);
  const stm = (n) => fnStm(P, n).slice(1, -1);   // the statements of a function (the outer braces dropped)

  /* ── a · the five line definitions ── */
  const Cm = (/^\$script:Cm = '([^']*)'/m.exec(P) || [])[1] || '';
  const defLine = (key) => (P.split('\n').find((l) => new RegExp('^\\s*' + key + '\\s+= @\\{').test(l)) || '').trim();
  const WORDS = { OlderInsert: 'shell older insert', OlderFrames: 'shell older frames', LoadMoreIn: 'chat loadmore in', OlderRead: 'chat older read', OlderPush: 'chat older push' };
  const rxOf = (key) => { const m = /New-Rx \(\$script:Cm \+ '([^']*)'\)/.exec(defLine(key)); return m ? js(Cm + m[1]) : /(?!)/; };
  const exactDef = (key, words) => /^\w+\s+= @\{ Gram = \$true;\s+Label = '([^']*)';\s+Rx = \(New-Rx \(\$script:Cm \+ '([^']*)'\)\) \}$/.test(defLine(key))
    && (() => { const m = /Label = '([^']*)';\s+Rx = \(New-Rx \(\$script:Cm \+ '([^']*)'\)\)/.exec(defLine(key)); return m[1] === words && m[2] === '\\[P1\\] ' + words + '(?=\\s|$)'; })();
  const msg = (rest) => 'info|1: ' + rest;
  const wv = (rest) => msg('[WEBVIEW] WARNING [P1] ' + rest + ' (file:///android_asset/html/spixi.bundle.js:47)');
  const R = Object.fromEntries(Object.keys(WORDS).map((k) => [k, rxOf(k)]));
  const loadRx = (() => { const m = /New-Rx \(\$script:Cm \+ '([^']*)'\)/.exec(defLine('Load')); return m ? js(Cm + m[1]) : /(?!)/; })();
  const readRx = (() => { const m = /New-Rx \(\$script:Cm \+ '([^']*)'\)/.exec(defLine('ChatRead')); return m ? js(Cm + m[1]) : /(?!)/; })();
  const a = {
    cm: Cm.length > 0,
    exactWords: Object.entries(WORDS).every(([k, w]) => exactDef(k, w)),
    oneEach: Object.keys(WORDS).every((k) => P.split('\n').filter((l) => new RegExp('^\\s*' + k + '\\s+= @\\{').test(l)).length === 1),
    ownLine: R.OlderInsert.test(wv('shell older insert rows=5 mode=insert build=3 swap=1 fix=0 fade=2 ms=9')) && R.OlderFrames.test(wv('shell older frames n=36 max=34'))
      && R.LoadMoreIn.test(msg('[P1] chat loadmore in')) && R.OlderRead.test(msg('[P1] chat older read passes=1 window=100 ms=12 flush=0'))
      && R.OlderPush.test(msg('[P1] chat older push n=50 json=20480 build=7')),
    noNeighbour: !loadRx.test(msg('[P1] chat loadmore in')) && !R.LoadMoreIn.test(msg('[P1] chat load last-in-window=1 type=4 local=1')) && !readRx.test(msg('[P1] chat older read passes=1'))
      && !R.OlderRead.test(msg('[P1] chat read ms=3 passes=1')) && !R.OlderInsert.test(wv('shell older insertx rows=5')) && !R.OlderPush.test(msg('[CDPERF] chat older push n=1'))
      && !R.OlderInsert.test(msg('prefix [P1] shell older insert rows=5')),
    gram: Object.keys(WORDS).every((k) => /Gram = \$true;/.test(defLine(k))),
  };
  ok(F(a).length === 0,
    '★ walktools parser (a linePatterns): the five per-page lines are defined in $script:L with Gram = $true and the EXACT words `shell older insert`, `shell older frames`, `chat loadmore in`, `chat older read`, `chat older push` (anchored at the message start by $script:Cm, `(?=\\s|$)` after the fixed words); the regexes extracted from the script match their own line and none of the neighbouring lines (`chat load` is not `chat loadmore in`, `chat read` is not `chat older read`) — failing: ' + JSON.stringify(F(a)));

  /* ── b · the 17 optional rows of a page ── */
  const specSrc = P.slice(P.indexOf('$script:PageRows = @('), P.indexOf('function New-PageDefs'));
  const specRows = [...specSrc.matchAll(/@\{ N = '([^']*)';\s+U = '([^']*)';\s+Line = '([^']*)';\s+Key = '([^']*)';\s+T = '([^']*)'; Agg = '([^']*)' \}/g)].map((m) => ({ N: m[1], U: m[2], Line: m[3], Key: m[4], T: m[5], Agg: m[6] }));
  const NAMES = ['insert rows', 'insert mode=insert', 'insert build=', 'insert swap=', 'insert fix=', 'insert fade=', 'insert ms=', 'frames n', 'frames max', 'C# loadmore in -> push', 'read passes', 'read window', 'read ms=', 'read flush', 'push n', 'push json=', 'push build='];
  const mkFn = stm('New-PageDefs');
  const stepLines = P.slice(P.indexOf('$script:StepTable = [ordered]@{'), P.indexOf("'open-seed'   = @{ Kind = 'open-seed' }"));
  const histIdx = stepLines.indexOf("'history'     = @{");
  const histEnd = stepLines.indexOf("'resume-now'");
  const histBlock = histIdx >= 0 && histEnd > histIdx ? stepLines.slice(histIdx, histEnd) : '';
  const seedTbl = P.slice(P.indexOf('$script:HistorySeedDefs = @('), P.indexOf('$script:MemDefs = @('));
  const b = {
    found: specRows.length === 17,
    names: specRows.map((r) => r.N).join('|') === NAMES.join('|'),
    units: specRows.map((r) => r.U).join('|') === ['count', '0/1', 'ms', 'ms', 'ms', 'ms', 'ms', 'count', 'ms', 'ms', 'count', 'count', 'ms', 'value', 'count', 'chars', 'ms'].join('|'),
    lines: specRows.map((r) => r.Line + '.' + r.Key).join('|') === ['OlderInsert.rows', 'OlderInsert.mode', 'OlderInsert.build', 'OlderInsert.swap', 'OlderInsert.fix', 'OlderInsert.fade', 'OlderInsert.ms', 'OlderFrames.n', 'OlderFrames.max', 'OlderPush.', 'OlderRead.passes', 'OlderRead.window', 'OlderRead.ms', 'OlderRead.flush', 'OlderPush.n', 'OlderPush.json', 'OlderPush.build'].join('|'),
    allOptional: mkFn.some((l) => /\(New-Def \('page ' \+ \$k\.ToString\(\$script:Inv\) \+ ' ' \+ \$sp\.N\) \$sp\.U \$false 'log' \{ param\(\$c, \$a\) X-Page \$c \$a \} \$sp\.Agg \$arg\)/.test(l)) && !mkFn.some((l) => /\$true/.test(l)),
    namePrefix: mkFn.some((l) => l.includes("'page ' + $k.ToString($script:Inv) + ' ' + $sp.N")),
    pagesLoop: mkFn.includes('for ($k = 1; $k -le $Pages; $k++) {'),
    historyThree: P.includes('$script:HistoryPageDefs = New-PageDefs 3 $false'),
    seedOne: P.includes('$script:HistorySeedPageDefs = New-PageDefs 1 $true'),
    blockBeforeTable: P.indexOf('$script:HistoryPageDefs = New-PageDefs') > 0 && P.indexOf('$script:HistoryPageDefs = New-PageDefs') < P.indexOf('$script:StepTable = [ordered]@{') && P.indexOf('$script:HistorySeedPageDefs = New-PageDefs') < P.indexOf('$script:StepTable = [ordered]@{'),
    appendedHistory: histBlock.trimEnd().endsWith(') + $script:HistoryPageDefs }'),
    appendedSeed: seedTbl.trimEnd().endsWith(') + $script:HistorySeedPageDefs'),
    seedGate: stm('X-PageGate').join('|') === ['param($C, [bool]$Seed)', 'if (-not $Seed) { return $null }', 'return (X-SeedPagesGate $C)'].join('|') && stm('X-PageTok').indexOf('$g = X-PageGate $C $Seed') > 0 && stm('X-PagePush').indexOf('$g = X-PageGate $C $Seed') > 0,
    gateFirst: (() => { const t = stm('X-PageTok'); return t.indexOf('$g = X-PageGate $C $Seed') < t.indexOf('$r = Test-Ready $C'); })(),
    missingNotNoData: !stm('X-PageTok').concat(stm('X-PagePush')).some((l) => /New-Res 'missing' \$null \$script:NoData/.test(l)),
  };
  ok(F(b).length === 0,
    '★ walktools parser (b optionalRows): the 17 rows of one page (insert rows / mode=insert / build / swap / fix / fade / ms=, frames n / max, C# loadmore in -> push, read passes / window / ms= / flush, push n / json= / build=) are defined in this order with these units, ALL as `New-Def ... $false` (a line that is absent = n/a with the reason, never "no data", so the RESULT of a run on a build without the lines does not change), named `page <k> <row>`; history gets pages 1..3 and history-seed-kNN page 1 behind the pages gate (the gate runs first); the new rows are APPENDED after the old rows of both steps — failing: ' + JSON.stringify(F(b)));

  /* ── c · the old defs blocks, as at the base ── */
  const ob = oldBlocks(PAR);
  const c = { openDefs: ob.openDefs === BASE.openDefs, stepTable: ob.stepTable === BASE.stepTable, seedDefs: ob.seedDefs === BASE.seedDefs, memDefs: ob.memDefs === BASE.memDefs };
  ok(F(c).length === 0,
    '★ walktools parser (c oldBlocks): every OLD def stays byte-identical in text and order (SHA-256 of the statements as at the base): the defs from $script:OpenDefs (the open rows, the scroll and long-task defs, the chat scroll defs, the open-seed defs) to the new block, the step table (the one appended token removed), $script:HistorySeedDefs (the first-page row keeps its old def line; only the extractor changed) and $script:MemDefs — failing: ' + JSON.stringify(F(c)));

  /* ── d · every old function but the named ones ── */
  const of = oldFnHash(PAR);
  const allNames = fnNames(P);
  const d = {
    hash: of.hash === BASE.fns,
    count: of.n === BASE.fnCount && allNames.length === BASE.fnCount + CHANGED_FNS.length + NEW_FNS.length,
    changedExist: CHANGED_FNS.every((n) => allNames.filter((x) => x === n).length === 1),
    newOnce: NEW_FNS.every((n) => allNames.filter((x) => x === n).length === 1),
  };
  ok(F(d).length === 0,
    '★ walktools parser (d oldFunctions): every function of the base parser except New-Def, Get-DataRow, X-SeedFirstPage and Invoke-Main is byte-identical (SHA-256 of its statements, comments dropped; ' + BASE.fnCount + ' functions) and the seven new functions (Get-WordTok, X-PageGate, Get-NoPair, X-PageTok, X-PagePush, X-Page, New-PageDefs) exist once each — failing: ' + JSON.stringify(F(d)));

  /* ── e · the first-page rule: three branches in order ── */
  const fp = stm('X-SeedFirstPage');
  const at = (s) => fp.findIndex((l) => l === s);
  const iLoads = at('$loads = (Get-Hits $C $script:L.Load).Items'), iCs = at('$csharp = (Get-Hits $C $script:L.LoadMoreIn).Items');
  const iB1 = at('if ($csharp.Count -gt 0) {'), iB1cmp = at('if ($ld.Stamp -ge $csharp[0].Stamp) { return (New-Res \'value\' (($ld.Stamp - $C.T0).Ticks / 10000.0) \'\') }');
  const iReq = at('$req = (Get-Hits $C $script:L.SendLoadMore).Items'), iB2 = at('if ($req.Count -gt 0) {');
  const iB2z = fp.findIndex((l) => l.startsWith("if ($loads.Count -eq 0) { return (New-Res 'missing' $null ($C.Label + ': no \"' + $script:L.Load.Label + '\" line in the window although"));
  const iB2n = at("if ($loads.Count -ne $req.Count) { return (New-Res 'missing' $null ($C.Label + ': ' + $loads.Count.ToString($script:Inv) + ' chat load lines for ' + $req.Count.ToString($script:Inv) + ' page requests in the window (cannot pair; ' + $C.LogName + ')')) }");
  const iB2v = at("return (New-Res 'value' (($loads[0].Stamp - $C.T0).Ticks / 10000.0) '')");
  const last = fp[fp.length - 1] || '';   // the last statement
  // the rule in JavaScript: a log = [{ k: 'load' | 'csharp' | 'send', t }]; the result = the load stamp, or null (missing)
  const rule = (log) => {
    const loads = log.filter((e) => e.k === 'load'), cs = log.filter((e) => e.k === 'csharp'), req = log.filter((e) => e.k === 'send');
    if (cs.length > 0) { for (const l of loads) if (l.t >= cs[0].t) return l.t; return null; }
    if (req.length > 0) return (loads.length > 0 && loads.length === req.length) ? loads[0].t : null;
    return null;
  };
  const L = (k, t) => ({ k, t });
  const e = {
    found: fp.length > 8,
    order: iLoads > 0 && iCs > iLoads && iB1 > iCs && iB1cmp > iB1 && iReq > iB1cmp && iB2 > iReq && iB2z > iB2 && iB2n > iB2z && iB2v > iB2n && fp.length - 1 > iB2v && last.startsWith('return (New-Res \'missing\' $null ($C.Label + \': no "\' + $script:L.LoadMoreIn.Label'),
    noFallThrough: (() => { const body = fp.slice(iB1, iReq); return body.some((l) => l.startsWith("return (New-Res 'missing' $null ($C.Label + ': no \"' + $script:L.Load.Label + '\" line after the first \"' + $script:L.LoadMoreIn.Label")); })(),
    // review round 1 (M1): branch 2 takes the load of the window ONLY when the number of loads equals the number of send lines (one answer per request)
    branch2Equal: iB2n > 0 && iB2v === iB2n + 1 && !fp.slice(iB2).some((l) => /\$loads\.Count -(eq|ge|gt) \$req\.Count/.test(l)),
    branch2NoCompare: !fp.slice(iB2, fp.length).some((l) => /Stamp -ge/.test(l)),
    oldRuleGone: !fp.some((l) => /Stamp -ge \$req\[0\]\.Stamp/.test(l)) && !fp.some((l) => /\$req\[0\]\.Stamp/.test(l)),
    sevenCases: rule([L('load', 1), L('csharp', 2), L('load', 3)]) === 3                  // the C# pair: the early load is not the page
      && rule([L('load', 3), L('send', 4)]) === 3                                          // no C# line, the send line AFTER the load (the 2026-11-22 shape): the load
      && rule([L('send', 1), L('load', 2)]) === 2                                          // the send line before the load
      && rule([L('csharp', 5), L('load', 3)]) === null                                     // a C# line, no load after it: missing, NOT the send branch
      && rule([L('csharp', 2), L('send', 3)]) === null                                     // a C# line, no load at all
      && rule([L('load', 3)]) === null                                                     // no proof of a request: missing
      && rule([L('send', 3)]) === null                                                     // a request, no load: missing
      && rule([L('load', 1), L('load', 3), L('send', 4)]) === null                         // a stray load next to ONE request (2 loads, 1 send): cannot pair
      && rule([L('load', 1), L('send', 2), L('load', 3), L('send', 4)]) === 1,             // equal counts: the first load of the window
  };
  ok(F(e).length === 0,
    '★ walktools parser (e firstPage): first swipe -> 1st page of history-seed-kNN (#1827 (3), contract I-3a) = the first `[P1] chat load` AT OR AFTER the first `[P1] chat loadmore in` line when that C# line is in the window (none after it = missing, no fall-through); ELSE the first `[P1] chat load` line of the window when a `[P1] shell send loadmore` line is there (the proof of the request: its stamp is NOT an order, no stamp compare in that branch); ELSE missing with the reason — the three branches in this order in X-SeedFirstPage (branch 2 only when the number of loads equals the number of send lines: a stray load cannot be told from the page, `<n> chat load lines for <m> page requests in the window (cannot pair)`), the old rule (a load after the SEND line) gone (source order only; the behaviour of the script on the seed fixtures is c-parser-run.mjs r4 / r5 / r6; a JavaScript mirror of the rule documents nine cases) — failing: ' + JSON.stringify(F(e)));

  /* ── f · the mode word and the note ── */
  const wt = stm('Get-WordTok');
  const wtLine = wt.find((l) => l.startsWith('$m = [regex]::Match($Tail,')) || '';
  // the regex of the reader, built from the two string literals of the script line (before and after [regex]::Escape($Key)), run in JavaScript
  const wtLits = [...wtLine.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1]);
  const wordOf = (tail, key) => { if (wtLits.length !== 2 || !wtLine.includes('[regex]::Escape($Key)')) return null; const m = new RegExp(wtLits[0] + key + wtLits[1]).exec(tail); return m ? m[1] : null; };
  const tok = stm('X-PageTok');
  const iMode = tok.indexOf("if ($Kind -eq 'mode') {");
  const getDataRow = fnStm(P, 'Get-DataRow');
  const iIm = getDataRow.indexOf("if ($Def.Agg -eq 'insertmode') {");
  const f = {
    found: wt.length > 3 && wtLine.length > 0,
    pattern: wtLits.length === 2 && wtLits[0] === '(?<![A-Za-z0-9_])' && wtLits[1] === '=([a-z]{1,16})(?![A-Za-z0-9_.])',
    acceptsWords: wordOf(' rows=5 mode=insert build=3', 'mode') === 'insert' && wordOf(' mode=full', 'mode') === 'full' && wordOf(' mode=hybrid x=1', 'mode') === 'hybrid' && wordOf(' mode=a', 'mode') === 'a' && wordOf(' mode=abcdefghijklmnop', 'mode') === 'abcdefghijklmnop',
    rejectsOthers: wordOf(' mode=abcdefghijklmnopq', 'mode') === null && wordOf(' mode=Insert', 'mode') === null && wordOf(' mode=insert2', 'mode') === null && wordOf(' mode=', 'mode') === null && wordOf(' mode=in.sert', 'mode') === null && wordOf(' xmode=insert', 'mode') === null,
    insertIsOne: iMode > 0 && tok[iMode + 1] === '$w = Get-WordTok $tail $Key' && tok[iMode + 2] === "if ($null -eq $w) { return (Get-MissingTok $C $LineDef $Key) }" && tok[iMode + 3] === "if (Test-Same $w 'insert') { return (New-Res 'value' 1.0 '') }" && tok[iMode + 4] === "return (New-Res 'value' 0.0 '')",
    noteNew: iIm > 0 && getDataRow[iIm + 3] === "$notes.Add('insert in ' + $k.ToString($script:Inv) + ' of ' + $arr.Length.ToString($script:Inv))" && getDataRow[iIm + 2] === 'foreach ($v in $arr) { if ($v -eq 1) { $k++ } }',
    spareKept: getDataRow.includes("$notes.Add('spare=1 in ' + $k.ToString($script:Inv) + ' of ' + $arr.Length.ToString($script:Inv))") && getDataRow.includes("if ($Def.Agg -eq 'spare') {"),
    aggKind: specRows.filter((r) => r.Agg === 'insertmode').map((r) => r.N).join() === 'insert mode=insert' && specRows.filter((r) => r.Agg !== 'stats' && r.Agg !== 'insertmode').length === 0,
  };
  ok(F(f).length === 0,
    '★ walktools parser (f modeWord): the reader of `mode=` (Get-WordTok) takes only [a-z]{1,16} followed by a boundary (run in JavaScript: `insert` `full` and a 16-letter word pass; a 17-letter word, a capital, a digit or a dot after it, an empty value, `xmode=` do not); X-PageTok gives 1 for the word `insert` (ordinal compare) and 0 for any other readable word, missing for an unreadable one; the row `insert mode=insert` has the new Agg kind `insertmode` and its note reads `insert in n of m`, the old `spare=1 in n of m` text is unchanged — failing: ' + JSON.stringify(F(f)));

  /* ── g · page k, the pairing, no raw line ── */
  const pg = stm('X-PagePush');
  const iPush = pg.findIndex((l) => l.startsWith('$ms = ($push[$K - 1].Stamp - $ins[$K - 1].Stamp).Ticks / 10000.0'));
  const newFns = ['X-PageGate', 'Get-NoPair', 'X-PageTok', 'X-PagePush', 'X-Page', 'New-PageDefs', 'Get-WordTok'].map((n) => stm(n).join('\n')).join('\n');
  const mainSrc = fnP('Invoke-Main');
  const g = {
    nth: tok.includes('$tail = $hits[$K - 1].Tail') && tok.includes('if ($hits.Count -lt $K) { return (Get-MissingCount $C $LineDef $hits.Count $K) }') && tok.includes('if ($hits.Count -eq 0) { return (Get-MissingLine $C $LineDef) }'),
    pairIndex: iPush > 0 && pg[iPush] === '$ms = ($push[$K - 1].Stamp - $ins[$K - 1].Stamp).Ticks / 10000.0',
    pairBoth: pg.includes('if ($ins.Count -lt $K) { return (Get-MissingCount $C $script:L.LoadMoreIn $ins.Count $K) }')
      && pg.includes('if ($ins.Count -eq 0) { return (Get-MissingLine $C $script:L.LoadMoreIn) }') && pg.includes('if ($push.Count -eq 0) { return (Get-MissingLine $C $script:L.OlderPush) }'),
    negativeRefused: pg.some((l) => l.startsWith('if ($ms -lt 0) { return (New-Res \'missing\' $null')),
    noRawLine: !/\.Msg\b/.test(newFns) && count(newFns, '.Tail') === 1 && newFns.includes('$tail = $hits[$K - 1].Tail') && count(newFns, '$tail') === 3,
    legendGated: mainSrc.includes('$pageNote = $false') && mainSrc.includes("if (($r.Kind -eq 'data') -and $r.Metric.StartsWith('page ', [StringComparison]::Ordinal)) { $pageNote = $true }") && mainSrc.includes('if ($pageNote) {'),
    dataArg: P.includes('$r = & $Def.Extract $c $Def.Arg') && !P.includes('$r = & $Def.Extract $c\n'),
  };
  ok(F(g).length === 0,
    '★ walktools parser (g pairing): page k is the k-th line of its kind in the rep window ($hits[$K - 1]; fewer than K lines = missing with the reason, none = missing with the "no line" reason); C# loadmore in -> push = the K-th `chat older push` stamp minus the K-th `chat loadmore in` stamp (either line absent or fewer than K = missing; a negative time is refused); no raw log line reaches a row (the tail goes only through Get-Tok / Get-WordTok); the summary note of the page rows is printed only when a page row has a value (a run without the new lines prints none) — failing: ' + JSON.stringify(F(g)));

  /* ── h · review round 1 (M2): a page row of kind K has a value only when the K lines and the page requests are equal in number ── */
  const iZero = tok.indexOf('if ($hits.Count -eq 0) { return (Get-MissingLine $C $LineDef) }');
  const iReqN = tok.indexOf('$reqN = ((Get-Hits $C $script:L.SendLoadMore).Items).Count');
  const iNe = tok.indexOf('if ($hits.Count -ne $reqN) { return (Get-NoPair $C $LineDef $hits.Count $reqN) }');
  const iCsK = tok.indexOf('if ((Test-Same $LineDef.Label $script:L.OlderRead.Label) -or (Test-Same $LineDef.Label $script:L.OlderPush.Label)) {');
  const iLtK = tok.indexOf('if ($hits.Count -lt $K) { return (Get-MissingCount $C $LineDef $hits.Count $K) }');
  const nop = stm('Get-NoPair');
  const hh = {
    found: iZero > 0 && iReqN > 0 && iNe > 0 && iCsK > 0 && iLtK > 0,
    order: iZero < iReqN && iReqN < iNe && iNe < iCsK && iCsK < iLtK,
    equalCount: tok[iNe] === 'if ($hits.Count -ne $reqN) { return (Get-NoPair $C $LineDef $hits.Count $reqN) }' && tok[iReqN] === '$reqN = ((Get-Hits $C $script:L.SendLoadMore).Items).Count',
    csharpKinds: tok[iCsK + 1] === '$inN = ((Get-Hits $C $script:L.LoadMoreIn).Items).Count' && tok[iCsK + 2] === 'if (($inN -gt 0) -and ($inN -ne $reqN)) { return (Get-NoPair $C $script:L.LoadMoreIn $inN $reqN) }',
    reasonText: nop.length === 2 && nop[0] === 'param($C, $LineDef, [int]$N, [int]$M)' && nop[1].startsWith("return (New-Res 'missing' $null ($C.Label + ': ' + $N.ToString($script:Inv) + ' \"' + $LineDef.Label + '\" lines for ' + $M.ToString($script:Inv) + ' page requests (cannot pair) in ' + $C.LogName))"),
    stillOptional: !tok.some((l) => /NoData/.test(l)),
  };
  ok(F(hh).length === 0,
    '★ walktools parser (h pageCounts, review round 1 M2): a page row of kind K (insert, frames, read, push) has a value ONLY when the number of lines of that kind in the window equals the number of page requests (`[P1] shell send loadmore` lines), for the C# kinds read / push also the number of `chat loadmore in` lines when that line exists; otherwise missing (n/a) with `<n> "<kind>" lines for <m> page requests (cannot pair)`; the checks come after the "no line" check and before the K-th pick, so a lost or an extra line cannot shift a later page — failing: ' + JSON.stringify(F(hh)));

  /* ── i · review round 1 (M2): the C# time pairs only when both counts equal the page requests and the K-th push belongs to the K-th loadmore ── */
  const iPi = pg.indexOf('$reqN = ((Get-Hits $C $script:L.SendLoadMore).Items).Count');
  const iPins = pg.indexOf('if ($ins.Count -ne $reqN) { return (Get-NoPair $C $script:L.LoadMoreIn $ins.Count $reqN) }');
  const iPpush = pg.indexOf('if ($push.Count -ne $reqN) { return (Get-NoPair $C $script:L.OlderPush $push.Count $reqN) }');
  const iMs = pg.findIndex((l) => l.startsWith('$ms = ($push[$K - 1].Stamp'));
  const iNeg = pg.findIndex((l) => l.startsWith('if ($ms -lt 0) {'));
  const iNext = pg.findIndex((l) => l.startsWith('if (($K -lt $ins.Count) -and ($push[$K - 1].Stamp -ge $ins[$K].Stamp)) { return (New-Res \'missing\' $null ('));
  const ii = {
    found: iPi > 0 && iPins > iPi && iPpush > iPins && iMs > iPpush,
    counts: iPi > 0 && iPins > iPi && iPpush > iPins,
    notBefore: iNeg > iMs && pg[iNeg].startsWith("if ($ms -lt 0) { return (New-Res 'missing' $null"),
    beforeNext: iNext > iNeg && iNext < pg.length - 1 && pg[iNext].includes("is not before the next"),
    valueLast: pg[pg.length - 1] === "return (New-Res 'value' $ms '')",
  };
  ok(F(ii).length === 0,
    '★ walktools parser (i pairOrder, review round 1 M2): `C# loadmore in -> push` of page K has a value only when the number of `chat loadmore in` lines AND of `chat older push` lines both equal the number of page requests, the K-th push is not before the K-th loadmore (`$ms -lt 0` refused) and, when a (K+1)-th loadmore exists, the K-th push is before it (`$push[$K - 1].Stamp -ge $ins[$K].Stamp` refused); otherwise missing (n/a) with the reason; the value is returned last — failing: ' + JSON.stringify(F(ii)));
}
