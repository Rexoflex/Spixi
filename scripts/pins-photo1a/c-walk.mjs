/* ==== photo1a · C — the walk side: the opt-in step `open-seed` (+ `-SeedIndex`) and `mem-photos` of scripts/device/adb-walk.ps1, and
 * their rows in scripts/device/adb-walk-parse.ps1 (contract docs/contract-photo1a.md § 3.2).
 *
 * Pure node: CI has no PowerShell step, so these are SOURCE pins on the two scripts plus the BEHAVIOUR of the regexes that are
 * extracted from the script text and run in a JavaScript RegExp (PowerShell `\A` -> `^`, `\z` -> `$`). What they cannot prove (a
 * fake-adb dry run on PowerShell 7.4.6 did: the command sequence of the old steps, the new steps, the refusals, the masks) is said
 * in the builder's report, not here. Nothing ran on a phone or on Windows PowerShell 5.1.
 * 2026-11-18 (fixb3, scope C-walk; re-based after a look at the diff): c6 tableUses 5 -> 7 ($script:OpenSeedAddr: the history-seed rep and the -HistorySeed block), c11 haltSetters 3 -> 4 (the unproven restart of a history-seed rep), c15 sweepFrozen (Clear-FileStepPngs 081b8903... -> 89d28c9e...: the third pattern for the history-seed reset PNG; round 2 (m2 b): 89d28c9e... -> 918f3c91...: + the last statement `Clear-CalAccountPng`, which deletes cal-17s-account-scrolled.png once screens.accountScrolled is set; the three patterns are unchanged), c8 oldRows: the statements are first taken through pins-fixb3/c-walk stripText (this batch's parts out), the frozen SHAs of this pin are UNCHANGED.
 *   c1 paramRefusal — `-SeedIndex` is `[string[]]` (a `-File` comma list reaches `[int[]]` as ONE number 0,50,51 -> 05051), split and
 *                     checked by the script: 1 to 8 values, each `\A[0-9]{1,2}\z`, 0..55, no repeat, not with -Calibrate / -Flags,
 *                     only with open-seed in -Steps; every refusal is an Exit-Usage BEFORE the allowlist, the lock and any adb command;
 *                     `$script:SeedIdx` is assigned only after the last check
 *   c2 derivedAddress — the address of a rep is `Get-DevSeedAddress $K` (derived, never read from a file, never typed): the only
 *                     `--es fa` command of the new step holds `$addr`; no Get-Seed / Read-JsonFile / Get-Content / walk.local in the
 *                     new functions; Get-DevSeedAddress itself is byte-identical (its statements); the derived address passes the
 *                     fa shape of the allowlist
 *   c3 restartBeforeCold — the cold rep of every index starts with the PROVEN restart (Invoke-FileReset): one call site, only for the
 *                     cold rep, before the rep's first input; not proven = Halted + throw (the later reps are skipped); from the intent
 *                     on any failure runs the proven restart (not after ADBWALK-STOP); the pid is stored before the first input
 *   c4 allowlistDelta — exactly ONE new allowlist entry: the count poll `... | grep -c -e P1..chat.media` (FramePoll + PipedCmds);
 *                     ShellAllow is a frozen copy of the base (no new verb, no new shape); the new functions send only logcat -c, the
 *                     fa start, BACK
 *   c5 filter       — $script:LogRe is unchanged (529 chars, the base SHA-256) and passes the three new [P1] chat lines; near misses fail
 *   c6 masks        — Protect-Text masks the derived addresses as `<seed-index k>` (k = the dev-seed index; was `<seed k>` before fix round 1), the table is filled before the
 *                     first adb command; the address is in no text of the new functions but the fa command; run.json gets only integers
 *   c7 parserRows   — the rows of § 3.2 per index (names, units, required flags, extractors), warm n = Repeats, `cold ` rows n = 1;
 *                     every new-line row is NOT required (n/a on a build without the line: never "no data", never exit 2), the three
 *                     old rows stay required; the line regexes read the three new lines and the chat-shell line (`paint=30ms`)
 *   c8 oldRows      — the old steps are byte-identical: the statements of both scripts (comments and blank lines dropped), minus
 *                     exactly the statements of this batch, hash to the base value; the old step table and the AllSteps prefix are the same
 *   c9 memPhotosLast — AllSteps ends `open-seed, mem-photos` whatever the order in -Steps; Invoke-MemPhase 'photos' runs from the walk
 *                     loop; the parser knows meminfo-photos-(app|renderer).txt and the `mem-photos` table entry
 *   (fix round 1, review of 2026-11-17: one key per finding; a one-token break of each turns exactly that key red)
 *   c10 warmupAfterRestart (F1) — a recorded warm rep is never the first open of a new process: the unrecorded warm-up open
 *   c11 haltNoPid (F2)         — no app pid before the planned restart = Halted + HaltNote, as Invoke-FileReset does
 *   c12 maskLabel (F3)         — the open-seed addresses are masked as `<seed-index k>`, the list masks as `<seed i>` (two namespaces)
 *   c13 seedIndexLower (F4)    — the parser's Get-SeedIndexes refuses a negative number (behaviour of the extracted condition)
 *   c14 neutralRestartLine (F5) — a line of the step's own before each restart; Reset-AppToChats is the frozen function
 *   c15 sweepAtEnd (F6)        — Invoke-OpenSeedStep ends with Clear-FileStepPngs; the sweep pattern covers every PNG name of the step
 * Deliberate breaks (#802): see the builder's report of batch photo1a (item B3) and of the fix round 1, one per key. */
import { createHash } from 'node:crypto';
import { stripText as fixb3Strip } from '../pins-fixb3/c-walk.mjs';   // fixb3 (2026-11-18): c8 first takes this batch's parts out (its own re-base: the old statements are compared as before)

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
const fnPS = (t, name) => { const m = new RegExp('^function ' + name.replace(/-/g, '\\-') + '\\b', 'm').exec(t); return m ? (psMatch(t, m.index) || '') : ''; };
const fnWhole = (t, name) => { const m = new RegExp('^function ' + name.replace(/-/g, '\\-') + '\\b', 'm').exec(t); if (!m) return ''; const b = psMatch(t, m.index); return b ? t.slice(m.index, t.indexOf(b, m.index) + b.length) : ''; };
const lines = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean);
const lit = (t, lhs) => { const i = t.indexOf(lhs); if (i < 0) return null; const m = /^\s*(?:New-Rx\s+)?'((?:[^']|'')*)'/.exec(t.slice(i + lhs.length)); return m ? m[1].replace(/''/g, "'") : null; };
const js = (re) => new RegExp(re.replace(/\\A/g, '^').replace(/\\z/g, '$'));
const listItems = (t, start) => { const a = t.indexOf(start); if (a < 0) return []; const s = a + start.length; const e = t.indexOf('\n    )', s); return t.slice(s, e).split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.replace(/,$/, '')); };
const psList = (t, lhs) => { const i = t.indexOf(lhs); if (i < 0) return null; const o = t.indexOf('@(', i); const e = t.indexOf(')', o); return (o < 0 || e < 0) ? null : [...t.slice(o, e).matchAll(/'([^']*)'/g)].map((m) => m[1]); };

// The statements of a script as the "view" c8 hashes: comments dropped, trimmed, blank lines dropped.
export const view = (t) => lines(code(t));
// What this batch ADDED to the driver (removed before hashing) and the lines it CHANGED (kept in the new form; the base value was built from them).
export const NEW_DRV_FNS = ['Invoke-OpenSeedRestart', 'Invoke-OpenSeedRep', 'Invoke-OpenSeedWarmup', 'Invoke-OpenSeedOne', 'Invoke-OpenSeedStep'];   // Warmup: fix round 1 (F1)
export const ADDED_DRV = [   // single driver lines this batch added (found by their start / shape, so a mutated added line is still removed: c8 is about the OLD statements)
  /^\[[A-Za-z\[\]]+\]\$SeedIndex$/,
  '$script:SeedIdx = @()',
  '$script:OpenSeedAddr = @{}',
  "$script:OpenSeedWarmKey = ''",   // fix round 1 / 2 (F1): two script-level state lines (the ones inside the new functions leave with them)
  '$script:OpenSeedSkipIdx = $false',
  "$t = [regex]::Replace($t, '<seed-index ",   // fix round 1 (F3): Get-SafeNote turns the new label into words, like `<seed k>`
  'chatmedia = (',
  "$script:FramePoll['chatmedia']",
  "elseif ($Step -eq 'open-seed')",
  "elseif ($kind -eq 'seedidx')",
  'if ($script:SeedIdx.Count -gt 0) { $doc',
  "elseif ($s -eq 'open-seed') { $sum",
  "elseif ($s -eq 'mem-photos') { $sum",
  "elseif ($s -eq 'open-seed') { Invoke-OpenSeedStep",
  "elseif ($s -eq 'mem-photos') { Invoke-MemPhase",
];
export const SEEDBLOCK_START = "if ($PSBoundParameters.ContainsKey('SeedIndex')) {";
export const NEW_PAR_FNS = ['Test-OpenSeedName', 'Get-TokMs', 'X-TokenMs', 'New-OpenSeedDefs', 'Get-SeedIndexes'];
export const ADDED_PAR = [
  'if (Test-OpenSeedName $Name)',
  'ChatOnloadMain = @{',
  'ChatRead = @{',
  'ChatMedia = @{',
  'ChatBatch = @{',
  'ChatShell = @{',
  '$script:OpenSeedWarmDefs =',
  '$script:OpenSeedColdDefs =',
  "'mem-photos' = @{ Kind = 'mem'",
  "'open-seed' = @{ Kind = 'open-seed'",
];
export const PAR_OPENSEED_BLOCK_START = "if ($def.Kind -eq 'open-seed') {";
export const DRV_MASK_BLOCK_START = 'foreach ($sk in @($script:OpenSeedAddr.Keys)) {';
export const PAR_ROUTE_BLOCK_START = 'if (Test-OpenSeedName $k) {';
export const ADDED_PAR_LEGEND = ["'open-seed' = '- open-seed k=<k>", "'mem-photos' = '- mem-photos: "];

const cutBlock = (t, start) => { const i = t.indexOf(start); if (i < 0) return t + '\n#MISSING ' + start; const b = psMatch(t, i); return b ? t.slice(0, i) + t.slice(t.indexOf(b, i) + b.length) : t; };
const hit = (l, a) => (a instanceof RegExp ? a.test(l) : l.startsWith(a));
// The changed lines go back to their base form (the added token is cut by shape, so the line is judged by c8 only as far as it is OLD).
const backDrv = (l) => {
  if (l === '[string[]]$Flags,') return '[string[]]$Flags';
  if (l.startsWith("'scroll-files', 'scroll-voice'") || l.startsWith('$script:OptInSteps = ')) return l.replace(/, '(?:open-seed|mem-photos)'/g, '');
  if (l.includes('shot-(scroll-files|scroll-voice|scroll-photos|viewer|downloads')) return l.replace('|downloads|open-seed)-', '|downloads)-');
  return l;
};
const backPar = (l) => {
  if (l.startsWith('$alt = ')) return "$alt = $keys.ToArray() -join '|'";
  if (l.startsWith('$re = ')) return l.replace('(home|end|trim|photos)', '(home|end|trim)');
  if (l.startsWith('if ((-not $steps.Contains($step))')) return 'if (-not $steps.Contains($step)) { continue }';
  if (l.startsWith("foreach ($known in @('home', 'end', 'trim'")) return "foreach ($known in @('home', 'end', 'trim')) {";
  return l;
};
export function oldView(drv, par) {
  // Driver: cut the new functions, the seed-index block and the mask loop, drop the added single lines, put the changed lines back.
  let d = code(drv);
  for (const n of NEW_DRV_FNS) { const w = fnWhole(d, n); d = w ? d.replace(w, '') : d + '\n#MISSING ' + n; }
  d = cutBlock(d, SEEDBLOCK_START);
  d = cutBlock(d, DRV_MASK_BLOCK_START);
  const dl = lines(d);
  for (const a of ADDED_DRV) { const j = dl.findIndex((l) => hit(l, a)); if (j >= 0) dl.splice(j, 1); else dl.push('#MISSING ' + a); }
  // Parser: the same (whitespace runs are one space and a trailing comma is dropped: the tables are column-aligned).
  let p = code(par);
  p = cutBlock(p, PAR_ROUTE_BLOCK_START);
  for (const n of NEW_PAR_FNS) { const w = fnWhole(p, n); p = w ? p.replace(w, '') : p + '\n#MISSING ' + n; }
  p = cutBlock(p, PAR_OPENSEED_BLOCK_START);
  const pl = lines(p).map((l) => l.replace(/\s+/g, ' ').replace(/,$/, ''));
  for (const a of ADDED_PAR) { const j = pl.findIndex((l) => hit(l, a)); if (j >= 0) pl.splice(j, 1); else pl.push('#MISSING ' + a); }
  for (const pre of ADDED_PAR_LEGEND) { const j = pl.findIndex((l) => l.startsWith(pre)); if (j >= 0) pl.splice(j, 1); else pl.push('#MISSING ' + pre); }
  return { drv: dl.filter((l) => !l.startsWith('$script:LogRe = ')).map(backDrv), par: pl.map(backPar) };
}

// ── the frozen base values: SHA-256 of the statements of the BASE scripts (scripts/device/ before batch photo1a: comments and blank
//    lines dropped, parser table whitespace folded) — `oldView` of the new scripts must give the same bytes ──
// re-based walktools (item 2): the driver statements moved by the probe `sets` form of screens.chat / screens.viewer: Get-ScreenGap restructured into
// Get-ProbeListGap + Get-ScreenGap, Test-Probes now reads the pixels and calls Get-ProbeVerdict, the Test-Screen return carries Set / Sets, the pre-check failure text (Get-PreCheckText; the `check: set` success notes of the first version were removed in review round 1), the calibrate lines (note, `ok (set x)`, `sets`),
// the load block (sets only on chat / viewer, the limit per set), and the new functions Test-HasField / Get-ScreenProbeSets / Test-ProbeSetPixels /
// Get-ProbeVerdict (they are not photo1a's, so they stay in the view). 8b69267a235d... -> e656d3fad141... (round 2: `1 or 2 sets`, compact counts, Get-PreCheckText strips the prefix; round 1 value 27f71088107...) (review round 1: + Get-PreCheckText, `sets must be a list`, the compact failure note; Invoke-ShotCheck / Invoke-FileShot are pre-batch text again) (the view of the base scripts 338d30f4, cut the same way, still gives the old value: checked).
// ★ walktools2 re-base (2026-11-23; after a look at the diff, #1596 / #1634): + exactly the statements of walktools2 (the step coldstart-watch, the home `sets` lines; see pins-fixb3/c-walk BASE_DRV_VIEW_SHA); e656d3fad141... -> 9b5c41ccdc47...
// ★ walktools2 re-base, #46 round 1: only coldstart-watch statements changed; driver 9b5c41cc... -> b41ec367..., parser a813c8e4... -> 4ea57874...
const BASE_DRV_VIEW_SHA = 'b41ec3678054bc466986455114d7d3a854d968c7adb985c370bbcbf4436d2aa2';
// re-based walktools (item 3): the parser statements moved by the per-page rows (five $script:L line defs, Get-WordTok, X-PageGate / X-PageTok / X-PagePush / X-Page,
// $script:PageRows, New-PageDefs, the two page-def tables, New-Def `$Arg`, the `history` table closing `) + $script:HistoryPageDefs }`, Get-DataRow `& $Def.Extract $c $Def.Arg`
// + the insertmode note, the page legend line). X-SeedFirstPage, the seed legend and the HistorySeedDefs table are cut by the fixb3 strip (held there). 5c661b38be58... -> 987c149fb699... (review round 1: + Get-NoPair, the count guards of X-PageTok / X-PagePush)
// ★ walktools2 re-base (2026-11-23): + exactly the added statements of the step coldstart-watch (no parser statement was removed); 987c149fb699... -> a813c8e4ed49...
const BASE_PAR_VIEW_SHA = '4ea57874174f55b6c1bd7d7a5a6e14c9bd563650e6ee2798dd298195073e38d9';
const BASE_DEVADDR_SHA = '62dc3e08437c570d9f286f89de3f4e8399c650650981945999b51a6d46b8a00e';
const BASE_LOGRE_SHA = 'a22d2dbaa96566788330114cca740fed5851d4ba7dafe55b115fea6195bfde3b';
export const baseShas = { BASE_DRV_VIEW_SHA, BASE_PAR_VIEW_SHA, BASE_DEVADDR_SHA };

export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/\r\n/g, '\n');   // a CRLF checkout reads as LF
  const DRV = raw('scripts/device/adb-walk.ps1');
  const PAR = raw('scripts/device/adb-walk-parse.ps1');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const D = code(DRV), P = code(PAR);
  const fnD = (n) => fnPS(D, n);
  const fnP = (n) => fnPS(P, n);
  const stm = (body) => lines(body);
  const W = (l) => l.replace(/\s+/g, ' ').trim();
  const NEWS = NEW_DRV_FNS.map(fnD);
  const newBody = NEWS.join('\n');

  /* ── c1 · -SeedIndex: the refusals ── */
  const blockStart = D.indexOf(SEEDBLOCK_START);
  const seedBlock = blockStart < 0 ? '' : (psMatch(D, blockStart) || '');
  const sb = stm(seedBlock);
  const paramBlock = (() => { const i = D.indexOf('param('); return i < 0 ? '' : D.slice(i, D.indexOf('\n)', i)); })();
  const digitRe = (/\$seedTrim -cnotmatch '([^']*)'/.exec(seedBlock) || [])[1] || '';
  const dJs = digitRe ? js(digitRe) : /(?!)/;
  const usageIdx = (needle) => sb.findIndex((l) => l.includes(needle) && l.includes('Exit-Usage'));
  const lastUsage = Math.max(...sb.map((l, i) => (l.includes('Exit-Usage') ? i : -1)));
  const exitFn = stm(fnD('Exit-Usage')).join('\n');
  const mainAt = (s) => D.indexOf(s);
  const c1 = {
    found: seedBlock.length > 0 && paramBlock.length > 0,
    stringArray: /\[string\[\]\]\$SeedIndex\b/.test(paramBlock) && !/\[int\[?\]?\]?\$SeedIndex/.test(D) && count(D, '$SeedIndex') === 2,
    noCalibrate: sb[1] === "if ($Calibrate) { Exit-Usage '-SeedIndex cannot be used with -Calibrate' }",
    splitText: sb.includes("$seedText = (@($SeedIndex) | ForEach-Object { [string]$_ }) -join ','") && sb.includes("$seedParts = @($seedText -split ',')"),
    countOneToEight: sb.some((l) => l.startsWith('if ($seedParts.Count -lt 1 -or $seedParts.Count -gt 8) { Exit-Usage ')),
    digitsRegex: digitRe === '\\A[0-9]{1,2}\\z' && /\$seedTrim -cnotmatch '[^']*' \) ?\{ Exit-Usage|\$seedTrim -cnotmatch '[^']*'\) \{ Exit-Usage/.test(sb.join('\n')),
    digitsBehaviour: ['0', '5', '07', '55', '99'].every((v) => dJs.test(v)) && ['', ' 5', '5 ', '-1', '+5', '1.5', '123', 'a', '0x1', '5\n', '５', '5,5'].every((v) => !dJs.test(v)),
    range: sb.includes("if ($seedNum -lt 0 -or $seedNum -gt 55) { Exit-Usage '-SeedIndex takes only whole numbers 0..55 (the dev-seed index, 0 = Seed 01)' }"),
    parseInvariant: sb.includes('$seedNum = [int]::Parse($seedTrim, $script:Inv)'),
    noRepeat: sb.includes("if ($seedCheck.Contains($seedNum)) { Exit-Usage '-SeedIndex names an index twice' }"),
    needsStep: sb.includes("if ($script:StepsReq -notcontains 'open-seed') { Exit-Usage '-SeedIndex needs the step open-seed in -Steps' }"),
    noFlags: sb.some((l) => l.startsWith('if ($script:FlagsAsked) { Exit-Usage ') && l.includes('cannot be combined with -Flags')),
    assignedLast: sb.indexOf('$script:SeedIdx = @($seedCheck.ToArray())') > lastUsage && lastUsage > 0 && count(D, '$script:SeedIdx =') === 2 && usageIdx('twice') > 0,
    exitOne: exitFn.includes('exit 1'),
    beforeAdb: blockStart > mainAt("if ($KillRenderer) { $script:StepsReq = @($script:StepsReq) + @('killrenderer') }") && mainAt("if ($KillRenderer)") > 0
      && blockStart < mainAt('\nInitialize-Allowlist\n') && blockStart < mainAt('$ok = $false\ntry {') && blockStart < D.lastIndexOf('Invoke-Preflight') && blockStart < mainAt('Enter-Lock\n'),
    afterFlagsBlock: blockStart > mainAt("if ($PSBoundParameters.ContainsKey('Flags')) {") && mainAt("if ($PSBoundParameters.ContainsKey('Flags')) {") > 0,
  };
  ok(F(c1).length === 0,
    '★ photo1a walk (c1 paramRefusal): `-SeedIndex` is a `[string[]]` (a -File comma list is ONE token for [int[]]), split on "," and checked by the script: 1 to 8 values, each exactly `\\A[0-9]{1,2}\\z`, 0..55, no repeat; refused with -Calibrate, with -Flags and without open-seed in -Steps; every refusal is an Exit-Usage (exit 1) before Initialize-Allowlist, the lock, the pre-flight and any adb command; $script:SeedIdx is assigned only after the last check — failing: ' + JSON.stringify(F(c1)));

  /* ── c2 · the address is derived by the script ── */
  const repFn = fnD('Invoke-OpenSeedRep');
  const rep = stm(repFn);
  const FA_CMD = "$r = Invoke-ShellReq ($script:StampCmd + '; am start -n ' + $script:Comp + ' --es fa ' + $addr)";
  const devAddr = stm(fnD('Get-DevSeedAddress')).join('\n');
  const allowFn = fnD('Initialize-Allowlist');
  const faAllow = (/'\^am start -n ' \+ \$ce \+ ' --es fa ([^']*)'/.exec(allowFn) || [])[1] || '';
  const faJs = faAllow ? new RegExp('^am start -n com\\.x\\/y --es fa ' + faAllow.replace(/\\z$/, '') + '$') : /(?!)/;
  // the derived addresses (node mirror of SDevSeed.addressFor / Get-DevSeedAddress), only to prove the allowlist shape accepts them
  const b58 = (b) => { const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'; let n = BigInt('0x' + (Buffer.from(b).toString('hex') || '0')); let s = ''; while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; } let z = 0; while (z < b.length && b[z] === 0) z++; return '1'.repeat(z) + s; };
  const addrOf = (i) => { const raw33 = Buffer.concat([Buffer.from([0]), createHash('sha256').update('spixi-dev-seed:' + i).digest()]); const ck = createHash('sha512').update(createHash('sha512').update(raw33).digest()).digest().subarray(0, 3); return b58(Buffer.concat([raw33, ck])); };
  const c2 = {
    found: rep.length > 0 && devAddr.length > 0,
    firstStatement: rep[1] === '$addr = Get-DevSeedAddress $K',
    storedForMask: rep[2] === '$script:OpenSeedAddr[[string]$K] = $addr',
    faCommand: count(rep.join('\n'), FA_CMD) === 1 && count(newBody, '--es fa') === 1 && count(newBody, 'am start') === 1,
    addrUses: count(repFn, '$addr') === 3,
    noFileRead: !/Get-Seed\b|Read-JsonFile|Get-Content|ReadAllText|walk\.local|\$script:Seeds|Get-Field|\$script:FileSeed|\$script:ImageSeed|ConvertFrom-Json|Test-Path/.test(newBody),
    noTypedInput: !/input\s+text/i.test(D) && !/input\s+text/i.test(P) && !/\bRead-Host\b|\$args\b|\$env:/.test(newBody),
    deriveSite: D.includes('foreach ($seedNum in $script:SeedIdx) { $script:OpenSeedAddr[[string]$seedNum] = Get-DevSeedAddress $seedNum }'),
    devAddrUntouched: sha(devAddr) === baseShas.BASE_DEVADDR_SHA,
    shapeAccepts: faAllow.length > 0 && [0, 1, 50, 51, 52, 55].every((i) => faJs.test('am start -n com.x/y --es fa ' + addrOf(i))) && !faJs.test('am start -n com.x/y --es fa ' + addrOf(3) + ' ; rm') && !faJs.test('am start -n com.x/y --es fa 0OIl'),
  };
  ok(F(c2).length === 0,
    '★ photo1a walk (c2 derivedAddress): the address of an open-seed rep is `Get-DevSeedAddress $K` — derived by the script, never read from walk.local.json or any file, never typed (no `input text`, no Read-Host / env); the new step has exactly ONE `--es fa` command and `$addr` is used three times in the rep (assign, mask table, the command); Get-DevSeedAddress is byte-identical to the base (SHA-256 of its statements); every derived address of the index range passes the fa shape of the allowlist — failing: ' + JSON.stringify(F(c2)));

  /* ── c3 · a proven restart before each cold rep; fail closed ── */
  const one = stm(fnD('Invoke-OpenSeedOne'));
  const restart = stm(fnD('Invoke-OpenSeedRestart'));
  const step = stm(fnD('Invoke-OpenSeedStep'));
  const INPUT = /Invoke-ShellReq|Invoke-Shell\b|Invoke-BackReq|Invoke-Back\b|Get-TapText|Get-SwipeText|Invoke-Adb|Invoke-CalInput|\binput |am start/;
  const tryAt = rep.indexOf('try {');
  const REP_SEQ = [FA_CMD, '$am = Read-AmOutput ($r.StdOut + "`n" + $r.StdErr)', 'Add-AmResult $Rec $am', 'Set-RepStamp $Rec $r.StdOut', "if ($am.Error) { throw ('ADBWALK-REP: am: ' + $am.Error) }",
    "Wait-Ms $script:Tm['chatSettleMs'] 'chatSettleMs'", "if (-not (Invoke-FileShotCheck $Rec 'chat')) {", 'Invoke-LogPull $Rec', "throw 'ADBWALK-NOSCREEN: the chat screen check failed: no BACK'", '}',
    "Wait-FilePull $Rec 'chatmedia' 0", 'Invoke-LogPull $Rec', 'Invoke-BackReq', "Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'", '} catch {',
    "if (-not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:')) { [void](Invoke-FileReset $Rec 'open-seed: a failed rep after the intent') }", 'throw', '}', '}'];
  // Fix round 1: the lines of F1 / F5 (a flag, a neutral Say-Log) leave the rep, `if (-not $Warmup) { Invoke-LogPull $Rec }` and the block form of the
  // catch fold back to the base lines, so c3 keeps judging the OLD sequence; c10 / c14 own the new lines.
  const CATCH_BLOCK = ["if (-not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:')) {", "[void](Invoke-FileReset $Rec 'open-seed: a failed rep after the intent')", '}'];
  const repOld = (() => {
    const drop = (l) => /^\$script:OpenSeedWarmKey = /.test(l) || /^Say-Log '  open-seed: a failed rep, /.test(l);
    const a = rep.filter((l) => !drop(l)).map((l) => (l === 'if (-not $Warmup) { Invoke-LogPull $Rec }' ? 'Invoke-LogPull $Rec' : l));
    for (let i = 0; i + 3 <= a.length; i++) if (CATCH_BLOCK.every((l, j) => a[i + j] === l)) { a.splice(i, 3, "if (-not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:')) { [void](Invoke-FileReset $Rec 'open-seed: a failed rep after the intent') }"); break; }
    return a;
  })();
  const seqAt = (() => { for (let i = 0; i + REP_SEQ.length <= repOld.length; i++) if (REP_SEQ.every((l, j) => repOld[i + j] === l)) return i; return -1; })();
  // the base lines of the planned restart, in this order, not contiguous: F2 (the halt block of the pid line) and F5 / F1 (a neutral line, a flag) sit between them
  const RESTART_SEQ = ['if (-not (Invoke-EnsureHome)) { throw \'X\' }'.replace("'X'", "'ADBWALK-NOSCREEN: foreign window in front (the app did not come back)'"),
    'if (-not (Save-FileRepPid)) {', "throw 'ADBWALK-REP: cannot read the app pid before the restart: no restart, no input'", '}',
    "if (-not (Invoke-FileReset $Rec ('open-seed k=' + $K + ': the restart before the cold rep'))) {", "throw 'ADBWALK-REP: no restart proof, so no further input'", '}',
    '$script:FileResetOk = $false; $script:NeedRecover = $false; $script:LastFailed = $false', "Add-Note $Rec 'restart proven before this rep'"];
  const inOrder = (arr, seq) => { let at = -1; for (const l of seq) { const j = arr.indexOf(l, at + 1); if (j < 0) return false; at = j; } return true; };
  const restartAt = restart.indexOf(RESTART_SEQ[0]);
  const coldCall = step.findIndex((l) => l.startsWith('Invoke-OpenSeedOne (New-Rep (') && l.endsWith('$true 1'));
  const forWarm = step.indexOf('for ($i = 1; $i -le $script:RepeatsN; $i++) {');
  const iRestartCall = one.findIndex((l) => l.startsWith('if ($Cold) { Invoke-OpenSeedRestart $Rec $K }'));
  const iRepCall = one.indexOf('Invoke-OpenSeedRep $Rec $K');
  const WARM_CALL = 'if ((-not $Cold) -and (Save-FileRepPid) -and ($script:OpenSeedWarmKey -cne ($script:FileRepPid + \':\' + $K))) { Invoke-OpenSeedWarmup $Rec $K }';
  const iTry = one.indexOf('try {');
  const wf = fnD('Wait-FilePull');
  const c3 = {
    found: rep.length > 0 && one.length > 0 && restart.length > 0 && step.length > 0,
    oneCallSite: count(D, 'Invoke-OpenSeedRestart $Rec $K') === 1 && count(D, 'Invoke-OpenSeedRestart') === 2 && iRestartCall > iTry && iTry > 0,
    onlyCold: one[iRestartCall] === 'if ($Cold) { Invoke-OpenSeedRestart $Rec $K }' && one[iRestartCall + 1] === "elseif (-not (Invoke-EnsureHome)) { throw 'ADBWALK-NOSCREEN: foreign window in front (the app did not come back)' }" && iRepCall > iRestartCall + 1 && one.slice(iRestartCall + 2, iRepCall).every((l) => /^if \(\(-not \$Cold\) -and .*Invoke-OpenSeedWarmup \$Rec \$K \}$/.test(l)),   // the exact call is c10's
    haltedSkipsFirst: one[1] === 'if ($script:Halted) {' && one[2] === "$Rec.status = 'skipped'" && one[3] === 'Add-Note $Rec $script:HaltNote' && one[4] === '} else {' && one.indexOf('try {') === 5,
    stopRethrown: one.includes("if ($msg.StartsWith('ADBWALK-STOP:')) { throw }") && one.includes("elseif ($msg.StartsWith('ADBWALK-NOSCREEN:')) { $Rec.status = 'no-screen' }") && one.includes("else { $Rec.status = 'error' }") && one[one.length - 2] === 'Complete-Rep $Rec $Of',
    restartSteps: restartAt === 1 && inOrder(restart, RESTART_SEQ) && restart[restart.length - 2] === "Add-Note $Rec 'restart proven before this rep'",
    coldFirst: coldCall >= 0 && forWarm > coldCall && count(step.join('\n'), '$true 1') === 1 && count(step.join('\n'), '$false $script:RepeatsN') === 1 && step[forWarm + 1].startsWith('Invoke-OpenSeedOne (New-Rep (') && step[forWarm + 1].endsWith('$false $script:RepeatsN)'.replace(')', '')),
    /* review round 3 m-3: the 2-digit index $nn the step name is built from (open-seed-k03 …) */
    perIndex: step.includes('foreach ($k in $script:SeedIdx) {') && step.some((l) => l.includes("'open-seed-k' + $nn + '-cold'")) && step.includes("$nn = ([int]$k).ToString('00', $script:Inv)")
      /* review round 4 m-3: the index is USED — the cold and the warm rep names are built from $nn (not $k) */
      && step.includes("Invoke-OpenSeedOne (New-Rep ('open-seed-k' + $nn + '-cold') 1) ([int]$k) $true 1") && step.includes("Invoke-OpenSeedOne (New-Rep ('open-seed-k' + $nn) $i) ([int]$k) $false $script:RepeatsN"),
    pidBeforeInput: rep[3] === "if (-not (Save-FileRepPid)) { throw 'ADBWALK-REP: cannot read the app pid before the intent: no input' }" && rep[4] === "[void](Invoke-ShellReq 'logcat -c')" && rep[5] === 'try {' && rep.slice(0, 5).filter((l) => INPUT.test(l)).length === 1,
    faIsFirstInputInTry: tryAt === 5 && rep[6] === FA_CMD,
    repSequence: seqAt === 6,
    resetOnFail: repOld.includes("if (-not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:')) { [void](Invoke-FileReset $Rec 'open-seed: a failed rep after the intent') }") && count(newBody, 'Invoke-FileReset') === 2,
    waitBound: D.includes('$script:FilePullWaitMs = 4000') && wf.includes('Wait-LogCount $Key $script:FilePullWaitMs $Above') && count(newBody, "Wait-FilePull $Rec 'chatmedia' 0") === 1,
    stepGap: step[1] === "$gap = Get-StepGap 'open-seed'" && step[2] === 'if ($gap) {',
  };
  ok(F(c3).length === 0,
    '★ photo1a walk (c3 restartBeforeCold): per index the COLD rep starts with the proven restart (Invoke-OpenSeedRestart -> Invoke-FileReset: pid stored before, new single pid after, our focus, a home check) — one call site, only for the cold rep, before the rep\'s first input; not proven = the run is Halted (the later reps are skipped) and the rep throws; the pid is stored and `logcat -c` is the only thing before the fa intent, which is the first statement of the try; from the intent on any failure (not ADBWALK-STOP) runs the proven restart; the media wait is the bounded 4 s count poll — failing: ' + JSON.stringify(F(c3)));

  /* ── c4 · the allowlist delta: exactly one new entry ── */
  const BASE_PIPED = [
    '$script:PollCmd', '$script:LoadPollCmd', "$script:FramePoll['apps']", "$script:FramePoll['wallet']", "$script:FramePoll['account']", "$script:FramePoll['chats']", "$script:FramePoll['settings']",
    "$script:FramePoll['settingsclosed']", "$script:FramePoll['flagsstored']", "$script:FramePoll['flagsstate']", "$script:FramePoll['viewimage']", "$script:FramePoll['overlayopen']",
    "$script:FramePoll['loaddownloads']", "$script:FramePoll['subscreenopen']", "$script:FramePoll['subscreenclose']", "$script:FramePoll['scrolllines']", "$script:FramePoll['overlayclose']",
    "'dumpsys window | grep -e mCurrentFocus='",
    "'dumpsys window | grep -e mDreamingLockscreen= -e isKeyguardShowing= -e mShowingLockscreen= -e mKeyguardShowing= -e mCurrentFocus='",
    "'dumpsys activity activities | grep -e mKeyguardShowing='", "'dumpsys power | grep -e mWakefulness='",
    "('dumpsys package ' + $script:Pkg + ' | grep -e versionName= -e versionCode= -e lastUpdateTime=')", "'dumpsys display | grep -i -e framerate'", "'ps -A | grep -e sandboxed'", "'dumpsys wifi | grep -e Wi-Fi.is'",
  ];
  const BASE_ALLOW = [
    "'^date \\+%m-%dT%H:%M:%S\\.%N\\z'", "('^am force-stop ' + $pe + '\\z')", "('^am start -W -n ' + $ce + '\\z')", "('^am start -n ' + $ce + '\\z')",
    "('^am start -n ' + $ce + ' --es fa [1-9A-HJ-NP-Za-km-z]{30,60}\\z')", "('^am start -n ' + $ce + ' --es perfb1flags warmidle=[01],sparerearm=[01],sparekeep=[01],noemptydetail=[01]\\z')",
    "('^am send-trim-memory ' + $pe + ' RUNNING_LOW\\z')", "'^logcat -c\\z'", "'^logcat -G 16M\\z'", "'^input tap [0-9]{1,5} [0-9]{1,5}\\z'",
    "'^input swipe [0-9]{1,5} [0-9]{1,5} [0-9]{1,5} [0-9]{1,5} [0-9]{1,5}\\z'", "'^input keyevent (3|4|KEYCODE_WAKEUP)\\z'", "'^wm dismiss-keyguard\\z'", "'^wm size\\z'", "'^wm density\\z'",
    "'^getprop ro\\.(product\\.model|build\\.version\\.release|build\\.version\\.sdk)\\z'", "'^dumpsys battery\\z'", "'^dumpsys activity activities\\z'",
    "'^dumpsys activity services [A-Za-z0-9_]+(\\.[A-Za-z0-9_]+)+\\z'", "('^dumpsys package ' + $pe + '\\z')", "'^dumpsys meminfo [0-9]{1,9}\\z'", "('^pm path ' + $pe + '\\z')",
    "('^cmd package resolve-activity --brief -c android\\.intent\\.category\\.LAUNCHER ' + $pe + '\\z')", "'^settings get global (stay_on_while_plugged_in|zen_mode)\\z'",
    "'^settings put global stay_on_while_plugged_in ([0-9]|1[0-5])\\z'", "'^svc power stayon usb\\z'", "'^svc wifi (enable|disable)\\z'", "'^screencap -p /data/local/tmp/adbwalk-shot\\.png\\z'",
    "'^rm -f /data/local/tmp/adbwalk-(shot\\.png|log\\.txt)\\z'", "('^pidof ' + $pe + '\\z')", "'^kill [0-9]{1,9}\\z'",
  ];
  const pipedNow = listItems(allowFn, '$script:PipedCmds = @('), allowNow = listItems(allowFn, '$script:ShellAllow = @(');
  const fpBlock = (() => { const i = D.indexOf('$script:FramePoll = @{'); const e = D.indexOf('\n}', i); return i < 0 ? '' : D.slice(i, e); })();
  const fpNow = fpBlock.split('\n').map((l) => l.trim()).filter((l) => /^\w+ = \(/.test(l));
  const NEW_FP = "chatmedia = ($script:LogCmd + ' | grep -c -e P1..chat.media')";
  const shellCalls = [...newBody.matchAll(/Invoke-(?:ShellReq|Shell|Adb)\b[^\n]*/g)].map((m) => m[0]);
  const ALLOWED_HELPERS = ['Add-AmResult', 'Add-Note', 'Clear-FileStepPngs', 'Complete-Rep', 'Get-DevSeedAddress', 'Get-ErrText', 'Get-StepGap', 'Invoke-BackReq', 'Invoke-EnsureHome', 'Invoke-FileReset', 'Invoke-FileShotCheck', 'Invoke-LogPull', 'Invoke-OpenSeedOne', 'Invoke-OpenSeedRep', 'Invoke-OpenSeedRestart', 'Invoke-OpenSeedWarmup', 'Invoke-ShellReq', 'New-Rep', 'Read-AmOutput', 'Save-FileRepPid', 'Say-Log', 'Set-RepStamp', 'Wait-FilePull', 'Wait-Ms'];
  const c4 = {
    found: allowFn.length > 0 && pipedNow.length > 0 && fpBlock.length > 0,
    // ★ walktools2 re-base (2026-11-23): the base list + the chatmedia poll + exactly ONE more string, `$script:WatchEventsCmd` (the events pull of coldstart-watch; each once; the exact command is held by pins-walktools2/b-coldwatch k1)
    pipedDelta: pipedNow.filter((l) => l !== "$script:FramePoll['chatmedia']" && l !== '$script:WatchEventsCmd').join('\n') === BASE_PIPED.join('\n') && pipedNow.filter((l) => l === "$script:FramePoll['chatmedia']").length === 1 && pipedNow.filter((l) => l === '$script:WatchEventsCmd').length === 1 && pipedNow.length === BASE_PIPED.length + 2,
    framePollDelta: fpNow.filter((l) => l.startsWith('chatmedia =')).join('\n') === NEW_FP && fpNow.length === 16 && count(fpBlock, 'chatmedia') === 1,
    countOnly: !NEW_FP.includes('grep -E') && !NEW_FP.includes('>') && !NEW_FP.includes(';') && D.includes("$script:LogCmd = 'logcat -d -v threadtime -s DOTNET:I'"),
    shellAllowFrozen: allowNow.join('\n') === BASE_ALLOW.join('\n') && allowNow.length === 31,
    newFnSends: JSON.stringify(shellCalls) === JSON.stringify(["Invoke-ShellReq 'logcat -c')", "Invoke-ShellReq ($script:StampCmd + '; am start -n ' + $script:Comp + ' --es fa ' + $addr)"]),
    newFnHelpers: [...new Set([...newBody.matchAll(/\b(?:Invoke|Wait|Get|Set|Add|Save|Read|Complete|New|Test|Say|Write|Send|Start|Stop|Enter|Exit|Out|Remove|Clear|Reset)-[A-Za-z]+/g)].map((m) => m[0]))].sort().every((h) => ALLOWED_HELPERS.includes(h)),   // a SUBSET of the allowed names (fix round 1: dropping a helper is no finding, adding one is)
    newFnNoPipe: !/\|/.test(newBody.replace(/\|\|/g, '')),
    noOtherVerb: !/(?<!\$)\bam (?!start -n)/.test(newBody) && !/screencap|\bpull\b|\bpush\b|\brm\b|install|\bpm\b|svc |settings |wm |dumpsys|getprop/.test(newBody),
  };
  ok(F(c4).length === 0,
    '★ photo1a walk (c4 allowlistDelta): the ONLY new allowlist entry is the count poll `logcat -d -v threadtime -s DOTNET:I | grep -c -e P1..chat.media` (FramePoll key chatmedia + its PipedCmds line; a count only, no line leaves the phone); PipedCmds = the frozen base list + that one; ShellAllow is a frozen copy of the base (31 entries: no new verb, no new shape — the fa start of the file steps is reused); the new functions send only `logcat -c`, the fa start and BACK (through the existing helpers; fix round 1 added only Say-Log, Clear-FileStepPngs and the warm-up function, no adb command) — failing: ' + JSON.stringify(F(c4)));

  /* ── c5 · the phone-side filter ── */
  const logRe = lit(D, '$script:LogRe =') || '';
  const full = logRe ? js(logRe) : /(?!)/;
  const stamp = '05-20 12:00:00.123 4242 4243 I DOTNET  : 05-20 12:00:00.1234|info|7: ';
  const NEW3 = ['[P1] chat onload-main ms=12', '[P1] chat read rows=51 passes=1 ms=9', '[P1] chat media thumbs=48 hit=48 pre=0 voice=0 vpre=0 held=1 q=0'];
  const OLD = ['[P1] open singlechatpage present ms=310', '[P1] frames open-singlechatpage n=22 drop=1 max=34', '[CDPERF] chat attach spare=1 tap=5ms', '[CDPERF] chat batch n=51 json=12345 t=80',
    '[WEBVIEW] WARNING [CDPERF] chat-shell n=51 batch=1 burst=3ms paint=30ms glass=45ms (file:///android_asset/html/chat.html:7467)', '[P1] shell scroll chat ms=520 n=31 drop=2 max=41'];
  const MISS = ['[P1] chat media thumbs=48 hit=48 pre=0 voice=0 vpre=0 held=1 q=0 a=1 b=2 c=3 d=4 e=5 f=6 g=7 h=8', '[P1] chat MEDIA thumbs=48', '[P1] chat media thumbs=48;', '[P1] chat media thumbs=' + '9'.repeat(40),
    '[P1] chat media thumbs=48 (file:///etc/passwd:1)', '[P1] chat media\tthumbs=48', '[FLAGS] photo1a mediaafterpaint=1 fewerchecks=1 thumbstore=1 voicestore=1'];
  const c5 = {
    found: logRe.length > 0,
    sameAsBase: logRe.length === 529 && sha(logRe) === BASE_LOGRE_SHA,
    newLinesPass: NEW3.every((m) => full.test(stamp + m)),
    oldLinesPass: OLD.every((m) => full.test(stamp + m)),
    nearMissesFail: MISS.every((m) => !full.test(stamp + m)),
    noQuote: !logRe.includes("'"),
  };
  ok(F(c5).length === 0,
    '★ photo1a walk (c5 filter): $script:LogRe is byte-identical to the base (529 chars, SHA-256) and passes the three new lines (`[P1] chat onload-main ms=`, `[P1] chat read rows= passes= ms=`, `[P1] chat media thumbs= hit= pre= voice= vpre= held= q=`) and the old lines the new rows read (chat batch, chat-shell with a WEBVIEW prefix); near misses (17 tokens, upper case, `;`, a 40-digit token, a foreign file tail, a TAB) and the `[FLAGS] photo1a` line stay refused (the walk does not read it) — failing: ' + JSON.stringify(F(c5)));

  /* ── c6 · the masks ── */
  const prot = stm(fnD('Protect-Text'));
  const pAt = prot.indexOf('foreach ($sk in @($script:OpenSeedAddr.Keys)) {');
  const outFns = ['Say', 'Say-Log', 'Write-WalkLog', 'Add-Note', 'Get-SafeNote', 'Write-RawFile', 'Write-JsonFile'];
  const c6 = {
    found: prot.length > 0 && pAt > 0,
    maskLoop: prot.slice(pAt, pAt + 4).join('\n').replace("'<seed-index ' + $sk", "'<LABEL> ' + $sk").replace("'<seed ' + $sk", "'<LABEL> ' + $sk") === ["foreach ($sk in @($script:OpenSeedAddr.Keys)) {", '$sa = [string]$script:OpenSeedAddr[$sk]', "if ($sa) { $t = $t.Replace($sa, '<LABEL> ' + $sk + '>') }", '}'].join('\n'),   // the label itself is c12's (fix round 1)
    // (round 2: the ORDER of the two mask loops is c12's: sameAddressBoth)
    tableUses: count(D, '$script:OpenSeedAddr') === 7 &&   // fixb3 item 4: + the mask entry of a history-seed rep (Invoke-HistorySeedRep) and the one filled before any adb command (-HistorySeed block)
      count(D, '$script:OpenSeedAddr = @{}') === 1,
    filledBeforeAdb: D.indexOf('foreach ($seedNum in $script:SeedIdx) { $script:OpenSeedAddr[') > 0 && D.indexOf('foreach ($seedNum in $script:SeedIdx) { $script:OpenSeedAddr[') < D.indexOf('\nInitialize-Allowlist\n'),
    writersMask: ['Get-Cut', 'Get-SafeNote', 'ConvertTo-MaskedObject', 'Write-WalkLog', 'Say', 'Write-TextFile', 'Add-Note'].every((n) => fnD(n).includes('Protect-Text')) && count(D, 'Protect-Text') === 9,
    addrOnlyInCommand: newBody.split('\n').filter((l) => l.includes('$addr')).length === 3 && !newBody.split('\n').some((l) => l.includes('$addr') && /Say|Add-Note|Write-WalkLog|throw|Write-Host|Out-File/.test(l)),
    runJsonIntegers: D.includes("if ($script:SeedIdx.Count -gt 0) { $doc['seedIndex'] = [int[]]$script:SeedIdx }"),
    noNewSeedsAdd: count(D, '$script:Seeds.Add(') === 4,
    noNewLocalKey: JSON.stringify([...D.matchAll(/Get-Field \$lj ([^\s)]+)\)/g)].map((m) => m[1])) === JSON.stringify(["'seedAddresses'", "'imageChatAddress'", '$fileKey']),
  };
  ok(F(c6).length === 0,
    '★ photo1a walk (c6 masks): Protect-Text (the one function every console line, walk.log line, note and file text passes) masks the derived address of each index as `<seed-index k>` (k = the dev-seed index; fix round 1 F3: its own label, c12) in a loop after the seed-list loop; the table is filled in the main block, before the allowlist and any adb command, and in the rep; the address stands in no text of the new functions but the fa command; run.json holds only the integers (seedIndex); no new Seeds.Add, no new walk.local.json key — failing: ' + JSON.stringify(F(c6)));

  /* ── c7 · the parser rows ── */
  const openDefs = fnP('New-OpenSeedDefs');
  const defRows = [...openDefs.matchAll(/\(New-Def \(\$Prefix \+ '([^']*)'\) '([^']*)' \$(true|false) 'log' \{ param\(\$c\) ([^}]*) \}( '[a-z]+')?\)/g)].map((m) => [m[1], m[2], m[3] === 'true', m[4].trim(), (m[5] || '').trim()]);
  const ROWS = [
    ['intent -> present', 'ms', true, 'X-Delta $c $script:L.Present', ''], ['present ms=', 'ms', true, "X-Token $c $script:L.Present 'ms'", ''], ['attach spare=', '0/1', true, 'X-Spare $c', "'spare'"],
    ['onload-main ms=', 'ms', false, "X-Token $c $script:L.ChatOnloadMain 'ms'", ''], ['read ms=', 'ms', false, "X-Token $c $script:L.ChatRead 'ms'", ''], ['read passes', 'count', false, "X-Token $c $script:L.ChatRead 'passes'", ''],
    ['read rows', 'count', false, "X-Token $c $script:L.ChatRead 'rows'", ''], ['batch json=', 'chars', false, "X-Token $c $script:L.ChatBatch 'json'", ''],
    ['shell paint=', 'ms', false, "X-TokenMs $c $script:L.ChatShell 'paint'", ''], ['shell glass=', 'ms', false, "X-TokenMs $c $script:L.ChatShell 'glass'", ''],
    ['media thumbs', 'count', false, "X-Token $c $script:L.ChatMedia 'thumbs'", ''], ['media hit', 'count', false, "X-Token $c $script:L.ChatMedia 'hit'", ''], ['media pre', 'count', false, "X-Token $c $script:L.ChatMedia 'pre'", ''],
    ['media voice', 'count', false, "X-Token $c $script:L.ChatMedia 'voice'", ''], ['media vpre', 'count', false, "X-Token $c $script:L.ChatMedia 'vpre'", ''],
  ];
  const ln = (name) => { const m = new RegExp('^\\s*' + name + '\\s*= @\\{ Gram = \\$true; Label = \'[^\']*\';\\s*Rx = \\(New-Rx \\(\\$script:Cm \\+ \'((?:[^\']|\'\')*)\'\\)\\) \\}', 'm').exec(P); return m ? m[1] : ''; };
  const CM = (/\$script:Cm = '([^']*)'/.exec(P) || [])[1] || '';
  const lre = (name) => { const s = ln(name); return s ? new RegExp(CM + s.replace(/''/g, "'")) : /(?!)/; };
  const tokRe = (/function Get-Tok \{[\s\S]*?\[regex\]::Match\(\$Tail, ('(?:[^']|'')*') \+ \[regex\]::Escape\(\$Key\) \+ ('(?:[^']|'')*')\)/.exec(P) || []);
  const mkTok = (pre, post, key) => (tail) => { const m = new RegExp(pre + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + post).exec(tail); return m ? Number(m[1]) : null; };
  const unq = (s) => (s || "''").slice(1, -1).replace(/''/g, "'");
  const msRe = (/function Get-TokMs \{[\s\S]*?\[regex\]::Match\(\$Tail, ('(?:[^']|'')*') \+ \[regex\]::Escape\(\$Key\) \+ ('(?:[^']|'')*')\)/.exec(P) || []);
  const tok = (key, tail) => mkTok(unq(tokRe[1]), unq(tokRe[2]), key)(tail);
  const tokMs = (key, tail) => mkTok(unq(msRe[1]), unq(msRe[2]), key)(tail);
  const MEDIA_TAIL = ' thumbs=48 hit=47 pre=3 voice=2 vpre=7 held=1 q=0';
  const SHELL_TAIL = ' n=51 batch=1 burst=3ms paint=30ms glass=45ms (file:///android_asset/html/chat.html:7467)';
  const stepTable = (() => { const i = P.indexOf('$script:StepTable = [ordered]@{'); return i < 0 ? '' : P.slice(i, P.indexOf('\n}\n', i)); })();
  const oldTableKeys = 'coldstart,chat-intent,chat-tap,scroll,resume,resume-long,mem-home,mem-end,mem-trim,network,killrenderer,chatinfo,tab-apps,tab-wallet,tab-account,history,resume-now,resume-3s,scroll-image,scroll-files,scroll-voice,scroll-photos,viewer,downloads'.split(',');
  const tableKeys = [...stepTable.matchAll(/^    '([a-z0-9-]+)'\s*= @\{ Kind/gm)].map((m) => m[1]);
  const main = stm(fnP('Invoke-Main')).join('\n');
  const osBlock = (() => { const i = main.indexOf(PAR_OPENSEED_BLOCK_START); return i < 0 ? '' : main.slice(i, i + 3200); })();
  const getDataRow = stm(fnP('Get-DataRow')).join('\n');
  const c7 = {
    found: openDefs.length > 0 && defRows.length > 0,
    rowsExact: JSON.stringify(defRows.map((r) => r.slice(0, 3))) === JSON.stringify(ROWS.map((r) => r.slice(0, 3))) && defRows.length === 15,
    extractorsExact: JSON.stringify(defRows.map((r) => [r[3], r[4]])) === JSON.stringify(ROWS.map((r) => [r[3], r[4]])),
    newRowsNotRequired: defRows.slice(3).every((r) => r[2] === false) && defRows.slice(3).length === 12,
    oldRowsRequired: defRows.slice(0, 3).every((r) => r[2] === true),
    coldPrefix: P.includes("$script:OpenSeedWarmDefs = New-OpenSeedDefs ''") && P.includes("$script:OpenSeedColdDefs = New-OpenSeedDefs 'cold '"),
    // ★ walktools2 re-base (2026-11-23): the step table = the old keys + open-seed + exactly ONE more entry, `coldstart-watch` (last)
    tableEntries: tableKeys.join() === [...oldTableKeys.slice(0, 9), 'mem-photos', ...oldTableKeys.slice(9), 'open-seed', 'coldstart-watch'].join() && (P.match(/^ {4}'open-seed'\s*= @\{ Kind = 'open-seed' \}/gm) || []).length === 1 && (P.match(/^ {4}'mem-photos'\s*= @\{ Kind = 'mem'; Phase = 'photos' \}/gm) || []).length === 1,
    perIndexRows: osBlock.includes("$nnK = ([int]$seedK).ToString('00', $script:Inv)") && osBlock.includes("$sk = 'open-seed-k' + $nnK") && stm(fnP('X-TokenMs')).join('\n').includes('$v = Get-TokMs $hits[0].Tail $Key') && osBlock.includes("$labelK = 'open-seed k=' + ([int]$seedK).ToString($script:Inv)") && osBlock.includes('foreach ($cold in @($false, $true)) {')
      && osBlock.includes("$countK = $repeats") && osBlock.includes("if ($cold) { $sk = $sk + '-cold'; $countK = 1; $defsK = $script:OpenSeedColdDefs }") && osBlock.includes('$defsK = $script:OpenSeedWarmDefs')
      && osBlock.includes('foreach ($dK in $defsK) { $rows.Add((Get-DataRow $labelK $dK $ctxK.ToArray())) }'),
    repCtxCount: P.includes("if ((-not $steps.Contains($step)) -and (-not ((Test-OpenSeedName $step) -and $steps.Contains('open-seed')))) { continue }") && P.includes("$alt = ($keys.ToArray() -join '|') + '|open-seed-k(?:[0-4][0-9]|5[0-5])(?:-cold)?'"),
    noSeedIndexNoData: osBlock.includes('if ($seedIdx.Count -eq 0) {') && osBlock.includes("$rows.Add((New-Row $step 'seed chats' '' $script:NoData $script:NoData $script:NoData '' $osNote '' 'nodata'))"),
    seedIndexRead: stm(fnP('Get-SeedIndexes')).join('\n').includes('if (($out.Count -lt 1) -or ($out.Count -gt 8)) { return @() }') && stm(fnP('Get-SeedIndexes')).join('\n').includes('($n -gt 55)'),
    stepNames: P.includes("'\\Aopen-seed-k(?:[0-4][0-9]|5[0-5])(?:-cold)?\\z'") && P.includes("|open-seed-k(?:[0-4][0-9]|5[0-5])(?:-cold)?'"),
    // re-based walktools (item 3): Get-DataRow now calls `& $Def.Extract $c $Def.Arg` (the per-page rows' argument) and has the `insertmode` aggregate note; the optional / required
    // counting lines did not move. c26d0e68d492... -> 32c14cccf64b...
    optionalNotCounted: sha(getDataRow) === '32c14cccf64b37a1851d611926aef23ad0bf5a354f5fb6001acd8288291024bb',
    mediaLine: lre('ChatMedia').test('Info|1: [P1] chat media thumbs=48') && !lre('ChatMedia').test('Info|1: [P1] chat mediax thumbs=48') && lre('ChatMedia').test('Info|1: [WEBVIEW] LOG [P1] chat media thumbs=1'),
    readLine: lre('ChatRead').test('Info|1: [P1] chat read rows=51 passes=1 ms=9') && !lre('ChatRead').test('Info|1: [P1] chat load n=5') && lre('ChatOnloadMain').test('Info|1: [P1] chat onload-main ms=12') && !lre('ChatOnloadMain').test('Info|1: [CDPERF] chat onload t=3'),
    shellLine: lre('ChatShell').test('Info|1: [WEBVIEW] WARNING [CDPERF] chat-shell n=51 batch=1 burst=3ms paint=30ms glass=45ms') && !lre('ChatShell').test('Info|1: [CDPERF] chat-shell rtt n=5 med=3ms') && !lre('ChatShell').test('Info|1: [CDPERF] chat-shell parse pre=3ms') && lre('ChatBatch').test('Info|1: [CDPERF] chat batch n=51 json=12345 t=80'),
    tokens: tok('thumbs', MEDIA_TAIL) === 48 && tok('hit', MEDIA_TAIL) === 47 && tok('pre', MEDIA_TAIL) === 3 && tok('vpre', MEDIA_TAIL) === 7 && tok('voice', MEDIA_TAIL) === 2 && tok('pre', ' vpre=7') === null && tok('ms', ' ms=9x') === null,
    tokensMs: tokMs('paint', SHELL_TAIL) === 30 && tokMs('glass', SHELL_TAIL) === 45 && tokMs('burst', SHELL_TAIL) === 3 && tokMs('paint', ' paint=30') === null && tokMs('paint', ' xpaint=30ms') === null,
  };
  ok(F(c7).length === 0,
    '★ photo1a walk (c7 parserRows): per index k of run.json seedIndex the rows `open-seed k=<k>` of contract § 3.2 — intent -> present · present ms= · attach spare= (required, the old lines) and onload-main ms= · read ms= / passes / rows · batch json= · shell paint= / glass= (chat-shell, `…ms` tokens) · media thumbs / hit / pre / voice / vpre (all NOT required: n/a on a build without the line, never "no data", never exit 2) — warm rows n = Repeats from open-seed-kNN, the same rows prefixed `cold ` n = 1 from open-seed-kNN-cold; no seedIndex = one "no data" row; the line regexes read the three new lines and the chat-shell line and refuse the near misses; the old table entries keep their place — failing: ' + JSON.stringify(F(c7)));

  /* ── c8 · the old steps and old rows are byte-identical ── */
  const s3 = fixb3Strip(DRV, PAR);   // fixb3: the statements of the batch after photo1a, without fixb3 (pins-fixb3/c-walk o1 guards that step)
  const ov = oldView(s3.drv, s3.par);
  const drvSha = sha(ov.drv.join('\n')), parSha = sha(ov.par.join('\n'));
  const allSteps = psList(D, '$script:AllSteps = ') || [], optIn = psList(D, '$script:OptInSteps = ') || [];
  const BASE23 = ['coldstart', 'mem-home', 'chat-intent', 'chat-tap', 'scroll', 'resume', 'resume-long', 'network', 'mem-end', 'mem-trim', 'resume-now', 'resume-3s', 'chatinfo', 'tab-apps', 'tab-wallet', 'tab-account', 'history', 'scroll-image', 'scroll-files', 'scroll-voice', 'scroll-photos', 'viewer', 'downloads'];
  const c8 = {
    found: ov.drv.length > 1000 && ov.par.length > 500,
    driverStatements: drvSha === baseShas.BASE_DRV_VIEW_SHA,
    parserStatements: parSha === baseShas.BASE_PAR_VIEW_SHA,
    noMissingAdded: !ov.drv.some((l) => l.startsWith('#MISSING')) && !ov.par.some((l) => l.startsWith('#MISSING')),
    allStepsPrefix: allSteps.slice(0, 23).join() === BASE23.join() && allSteps.length === 26,   // ★ walktools2 re-base (2026-11-23): 25 -> 26 names: the first 23 and open-seed, mem-photos unchanged, + `coldstart-watch` last (c9)
    optInPrefix: optIn.slice(0, 6).join() === 'scroll-image,scroll-files,scroll-voice,scroll-photos,viewer,downloads' && optIn.length === 9,   // ★ walktools2 re-base (2026-11-23): 8 -> 9 (+ coldstart-watch last)
    pngRegexNew: D.includes("$f.Name -cmatch '^shot-(scroll-files|scroll-voice|scroll-photos|viewer|downloads|open-seed)-[A-Za-z0-9-]{1,40}\\.png\\z'"),
    defaultStepsRule: D.includes('$script:DefaultSteps = @($script:AllSteps | Where-Object { $script:OptInSteps -cnotcontains $_ })'),
    oldRoutes: ['Invoke-RepBody', 'Invoke-Step', 'Invoke-FileReset', 'Reset-AppToChats', 'Save-FileRepPid', 'Invoke-MemPhase'].every((n) => fnD(n).length > 0),
  };
  ok(F(c8).length === 0,
    '★ photo1a walk (c8 oldRows): the old steps and the old rows are byte-identical — the statements of adb-walk.ps1 and adb-walk-parse.ps1 (comments and blank lines dropped), minus exactly the statements this batch added (five driver functions, the -SeedIndex block, the mask loop of Protect-Text, 15 single lines; five parser functions, the open-seed rows block, the route block of Get-StepDef, 10 single lines, two legend lines), hash to the SHA-256 of the statements of the base scripts (but for the `$script:LogRe` line, which c5 owns; the nine changed lines are put back to their base form by shape first; their new form is pinned by c1/c7/c8/c9); the first 23 AllSteps and the first 6 OptInSteps are unchanged; the fake-adb dry run showed the command sequence of the old steps identical (608 adb calls) and a byte-identical summary.csv — failing: ' + JSON.stringify(F(c8)) + ' got drv=' + drvSha.slice(0, 16) + ' par=' + parSha.slice(0, 16));

  /* ── c9 · mem-photos runs last ── */
  const walkLoop = fnD('Invoke-Walk');
  const typed = ['mem-photos', 'open-seed', 'mem-home', 'coldstart', 'viewer'];   // any typed order: -Steps keeps the AllSteps order
  const order = allSteps.filter((s) => typed.includes(s));
  const memFn = stm(fnD('Invoke-MemPhase')).join('\n');
  const c9 = {
    found: allSteps.length > 0 && walkLoop.length > 0,
    // ★ walktools2 re-base (2026-11-23): mem-photos is still the LAST photo1a step (after open-seed); the one name after it is the opt-in coldstart-watch of walktools2, last in AllSteps and in OptInSteps
    lastTwo: allSteps.slice(-3).join() === 'open-seed,mem-photos,coldstart-watch' && optIn.slice(-3).join() === 'open-seed,mem-photos,coldstart-watch',
    typedOrderLost: D.includes('else { $script:StepsReq = @($script:AllSteps | Where-Object { $want -contains $_ }) }') && order.join() === 'coldstart,mem-home,viewer,open-seed,mem-photos',
    memHomeBeforeChat: allSteps.indexOf('mem-home') === 1 && allSteps.indexOf('mem-home') < allSteps.indexOf('chat-intent') && allSteps.indexOf('mem-home') < allSteps.indexOf('open-seed'),
    walkBranches: walkLoop.includes("elseif ($s -eq 'open-seed') { Invoke-OpenSeedStep }") && walkLoop.includes("elseif ($s -eq 'mem-photos') { Invoke-MemPhase 'photos' }") && count(walkLoop, "Invoke-MemPhase 'photos'") === 1,
    memFilesFromPhase: memFn.includes("$appFile = 'meminfo-' + $Phase + '-app.txt'") && memFn.includes("$rFile = 'meminfo-' + $Phase + '-renderer.txt'") && memFn.includes("$line = '[mem-' + $Phase + '] ' + $rec.status"),
    parserTable: /^ {4}'mem-photos'\s*= @\{ Kind = 'mem'; Phase = 'photos' \}/m.test(P) && P.includes('meminfo-(home|end|trim|photos)-(app|renderer)\\.txt'),
    parserFiles: P.includes("foreach ($known in @('home', 'end', 'trim', 'photos')) {"),
    parserLegend: /^\s*'mem-photos'\s*= '- mem-photos: /m.test(P),
    estimate: stm(fnD('Get-EstimateSec')).includes("elseif ($s -eq 'mem-photos') { $sum += $t['memQuietSec'] + 6 }"),
  };
  ok(F(c9).length === 0,
    '★ photo1a walk (c9 memPhotosLast): `mem-photos` is the LAST photo1a step of AllSteps (after open-seed; walktools2 re-base: only the opt-in `coldstart-watch` comes after it, last in AllSteps and OptInSteps) and opt-in; the order typed in -Steps is lost (AllSteps order wins), so mem-home runs 2nd — before every chat step — and mem-photos last; the walk loop runs `Invoke-MemPhase \'photos\'` (files meminfo-photos-app.txt / -renderer.txt from the phase name, one row set like mem-end); the parser has the table entry, the file-name rule, the Files-section phase and a legend line — failing: ' + JSON.stringify(F(c9)));

  /* ═══ fix round 1 (the reader's findings of 2026-11-17, scope C-walk): one key per finding ═══ */
  const SQ = String.fromCharCode(39);
  const warm = stm(fnD('Invoke-OpenSeedWarmup'));
  const idxTrue = rep.findIndex((l) => l === "$script:OpenSeedWarmKey = $script:FileRepPid + ':' + $K");
  const backAt = rep.indexOf("Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'");
  const catchAt = rep.indexOf('} catch {');
  const idxFalseCatch = rep.indexOf("$script:OpenSeedWarmKey = ''");
  const idxResetCall = rep.indexOf("[void](Invoke-FileReset $Rec 'open-seed: a failed rep after the intent')");
  const resetOkAt = restart.indexOf('$script:FileResetOk = $false; $script:NeedRecover = $false; $script:LastFailed = $false');
  const dLines = lines(D);
  const nLine = (s) => dLines.filter((l) => l === s).length;

  /* ── c10 · F1: a recorded warm rep is never the first open of a new process ── */
  const c10 = {
    found: warm.length > 0 && rep.length > 0 && one.length > 0,
    stateLines: nLine("$script:OpenSeedWarmKey = ''") === 4 && nLine("$script:OpenSeedWarmKey = $script:FileRepPid + ':' + $K") === 1 && nLine('$script:OpenSeedSkipIdx = $false') === 2 && nLine('$script:OpenSeedSkipIdx = $true') === 1,
    trueOnlyAfterBack: idxTrue > 0 && idxTrue === backAt + 1 && idxTrue < catchAt && rep[backAt - 1] === 'Invoke-BackReq' && rep[backAt - 2] === 'if (-not $Warmup) { Invoke-LogPull $Rec }',
    falseAfterPlannedRestart: resetOkAt > 0 && restart[resetOkAt + 1] === "$script:OpenSeedWarmKey = ''" && restart[resetOkAt + 2] === "Add-Note $Rec 'restart proven before this rep'",
    falseBeforeCatchRestart: catchAt > 0 && idxFalseCatch > catchAt && idxResetCall > idxFalseCatch && rep[idxFalseCatch - 1] === "if (-not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:')) {",
    callOnce: count(one.join('\n'), WARM_CALL) === 1 && one.indexOf(WARM_CALL) === iRepCall - 1 && one.indexOf(WARM_CALL) > iRestartCall + 1 && count(D, 'Invoke-OpenSeedWarmup') === 2,
    warmParam: D.includes('function Invoke-OpenSeedRep($Rec, [int]$K, [bool]$Warmup = $false) {') && rep.filter((l) => l === 'if (-not $Warmup) { Invoke-LogPull $Rec }').length === 2 && !rep.includes('Invoke-LogPull $Rec')
      && rep.includes("Wait-FilePull $Rec 'chatmedia' 0") && (newBody.match(/Invoke-OpenSeedRep \$\w+ \$K \$true/g) || []).length === 1 && count(newBody, 'Invoke-OpenSeedRep $Rec $K\n') === 1,
    warmupNoRow: warm[1] === "$w = New-Rep ($Rec.step + '-warmup') 0" && warm.includes('Invoke-OpenSeedRep $w $K $true') && !/Complete-Rep|Invoke-LogPull|\$script:Reps|Save-RunJson|Invoke-Back|Invoke-Shell/.test(warm.join('\n')),
    warmupFailsClosed: warm.includes("Add-Note $Rec 'warm-up open failed, rest of index skipped'") && warm.includes("if ($msg.StartsWith('ADBWALK-STOP:')) { throw }") && warm.indexOf('$script:OpenSeedSkipIdx = $true') > 0 && warm.indexOf('$script:OpenSeedSkipIdx = $true') < warm.findIndex((l) => l.startsWith("throw 'ADBWALK-SKIP: "))
      && warm[warm.length - 2] === "Add-Note $Rec 'warm-up open before this rep'",
    skipRest: one[iTry + 1] === "if ($script:OpenSeedSkipIdx) { throw 'ADBWALK-SKIP: the warm-up open of this index failed, rep skipped' }" && one.includes("if ($msg.StartsWith('ADBWALK-SKIP:')) { $Rec.status = 'skipped' }")
      && step[step.indexOf('foreach ($k in $script:SeedIdx) {') + 1] === '$script:OpenSeedSkipIdx = $false',
    // round 2: the pair (app pid, index) of the last successful open decides, not a flag; reset at each index start
    pairAtIndexStart: step[step.indexOf('foreach ($k in $script:SeedIdx) {') + 2] === "$script:OpenSeedWarmKey = ''",
    pidReadBeforeDecision: one.indexOf(WARM_CALL) > 0 && WARM_CALL.indexOf('(Save-FileRepPid)') < WARM_CALL.indexOf('-cne') && WARM_CALL.includes("$script:FileRepPid + ':' + $K"),
    pidNoneNoWarmup: WARM_CALL.indexOf('(Save-FileRepPid) -and') > 0,   // no pid: no warm-up, the rep throws its own "cannot read the app pid" (no input)
  };
  ok(F(c10).length === 0,
    '★ photo1a walk (c10 warmupAfterRestart, F1): a recorded warm rep is never the first open of a NEW app process — `$script:OpenSeedWarmKey` ("<app pid>:<index>" of the last successful open) is emptied at each index start, after the planned restart and after the proven restart of a failed rep, and set only after a rep that ended with BACK; a warm rep whose pid (read before the decision) or index differs from the key (the app died and was relaunched, a restart, a cold rep that failed) first runs `Invoke-OpenSeedWarmup` (ONE unrecorded open: the same intent via Invoke-OpenSeedRep with `$Warmup`, the chat check, the media wait, BACK; no log pull, no row, a scratch record); a failed warm-up has run the proven restart again (Invoke-FileReset in the rep) and sets `$script:OpenSeedSkipIdx`: the rest of the index is skipped (ADBWALK-SKIP), the flag is reset per index; the clean-run command sequence is unchanged — failing: ' + JSON.stringify(F(c10)));

  /* ── c11 · F2: no pid before the planned restart = the run halts ── */
  const frStm = stm(fnD('Invoke-FileReset')).join('\n');
  const haltNoteFR = (/\$script:HaltNote = '([^']*)'/.exec(frStm) || [])[1] || '';
  const sp = restart.indexOf('if (-not (Save-FileRepPid)) {');
  const blk = sp < 0 ? [] : restart.slice(sp, restart.indexOf('}', sp) + 1);
  const IOCMD = /Invoke-ShellReq|Invoke-Shell\b|Invoke-BackReq|Invoke-Back\b|Get-TapText|Get-SwipeText|Invoke-Adb|Reset-AppToChats|Invoke-FileReset/;
  const c11 = {
    found: sp > 0 && blk.length === 7,
    afterEnsureHome: sp === restart.indexOf(RESTART_SEQ[0]) + 1,
    halts: blk[1] === '$script:Halted = $true' && frStm.includes('$script:Halted = $true\n$script:HaltNote = ' + SQ + haltNoteFR + SQ),
    sameNoteAsFileReset: blk[2] === '$script:HaltNote = ' + SQ + haltNoteFR + SQ && haltNoteFR === 'run stopped: an app restart was not proven (no further input)',
    noteAndLine: (blk[3] || '').startsWith("Add-Note $Rec 'restart not proven: ") && (blk[4] || '').startsWith("Say-Log '  restart NOT proven ("),
    stillThrows: blk[5] === "throw 'ADBWALK-REP: cannot read the app pid before the restart: no restart, no input'" && blk[6] === '}',
    noInput: !blk.some((l) => IOCMD.test(l)),
    beforeRestart: sp < restart.findIndex((l) => l.startsWith('if (-not (Invoke-FileReset')),
    haltedSkips: one[1] === 'if ($script:Halted) {' && one[3] === 'Add-Note $Rec $script:HaltNote',
    haltSetters: nLine('$script:Halted = $true') === 4,   // fixb3 item 4: + the unproven restart of a history-seed rep (pins-fixb3/c-walk h2)
  };
  ok(F(c11).length === 0,
    '★ photo1a walk (c11 haltNoPid, F2): when the app pid cannot be read before the planned restart (none or several) the restart is NOT proven and the run HALTS exactly as Invoke-FileReset does — `$script:Halted = $true` and the same `$script:HaltNote` text (so the warm reps and every later index are skipped with that note, no further input), a note and a console line, then the old throw; no adb command in that branch — failing: ' + JSON.stringify(F(c11)));

  /* ── c12 · F3: two mask namespaces ── */
  const protAll = prot.join('\n');
  const listLbl = /\.Replace\(\[string\]\$s, '([^']*)' \+ \$i \+ '([^']*)'\)/.exec(protAll) || [];
  const osLbl = /\.Replace\(\$sa, '([^']*)' \+ \$sk \+ '([^']*)'\)/.exec(protAll) || [];
  const osFirst = protAll.indexOf('$sa') >= 0 && protAll.indexOf('$sa') < protAll.indexOf('[string]$s,');
  const maskSim = (text, seeds, os) => {   // the two loops of Protect-Text, in the order of the source
    let x = text;
    const listLoop = () => seeds.forEach((s, i) => { if (s) x = x.split(s).join(listLbl[1] + i + listLbl[2]); });
    const osLoop = () => { for (const k of Object.keys(os)) if (os[k]) x = x.split(os[k]).join(osLbl[1] + k + osLbl[2]); };
    if (osFirst) { osLoop(); listLoop(); } else { listLoop(); osLoop(); }
    return x;
  };
  const seeds10 = Array.from({ length: 11 }, (_, i) => (i === 10 ? 'LISTADDRESSTEN' : 'LISTADDR' + i + 'XXXXXXXX'));
  const sn = stm(fnD('Get-SafeNote')).join('\n');
  const snRe = [...sn.matchAll(/\[regex\]::Replace\(\$t, '([^']*)', '([^']*)'\)/g)].map((m) => [new RegExp(m[1], 'g'), m[2]]);
  const safe = (x) => snRe.reduce((a, [re, r]) => a.replace(re, r), x);
  const c12 = {
    found: listLbl.length > 0 && osLbl.length > 0 && snRe.length >= 2,
    labels: osLbl[1] === '<seed-index ' && osLbl[2] === '>' && listLbl[1] === '<seed ' && listLbl[2] === '>' && count(D, "'<seed-index '") === 1 && count(D, "'<seed ' + $sk") === 0,
    distinct: maskSim('LISTADDRESSTEN OSADDRESSTEN', seeds10, { 10: 'OSADDRESSTEN' }) === '<seed 10> <seed-index 10>' && maskSim('OSADDRESSTEN', seeds10, { 10: 'OSADDRESSTEN' }) === '<seed-index 10>',
    sameAddressBoth: osFirst && maskSim('LISTADDRESSTEN', seeds10, { 10: 'LISTADDRESSTEN' }) === '<seed-index 10>' && maskSim('LISTADDR3XXXXXXXX', seeds10, { 5: 'LISTADDR3XXXXXXXX' }) === '<seed-index 5>',   // round 2: an address in both lists gets the dev-seed label
    oldRunsSame: maskSim('LISTADDRESSTEN OSADDRESSTEN', seeds10, {}) === '<seed 10> OSADDRESSTEN' && maskSim('LISTADDR3XXXXXXXX x', seeds10, {}) === '<seed 3> x',
    listLoopKept: protAll.includes("if ($s) { $t = $t.Replace([string]$s, '<seed ' + $i + '>') }"),
    safeNoteWords: safe('<seed-index 5> and <seed 5> and <seed-index 12>') === 'seed-index 5 and seed 5 and seed-index 12' && /^[A-Za-z0-9 _.,:=\/()%+-]*$/.test(safe('x <seed-index 55> y')) && safe('<seed-index 123>') === '?seed-index 123?',
    noRawLeak: !/\$sk\b/.test(D.replace(/foreach \(\$sk in[^\n]*\n[^\n]*\n[^\n]*\n\s*\}/, '')),
  };
  ok(F(c12).length === 0,
    '★ photo1a walk (c12 maskLabel, F3): the derived open-seed addresses are masked as `<seed-index k>` (k = the dev-seed INDEX) and the addresses of the walk.local.json list as `<seed i>` (i = the list POSITION): one label never means two chats; Get-SafeNote turns the new label into words like the old one (`seed-index k`, no `<` in a note); with an empty table (every old run) the output is the old one — failing: ' + JSON.stringify(F(c12)));

  /* ── c13 · F4: the parser refuses a negative seedIndex ── */
  const gsi = stm(fnP('Get-SeedIndexes'));
  const cond = gsi.find((l) => l.startsWith('if (($null -eq $n)')) || '';
  const condJs = cond.replace(/^if \(/, '(').replace(/ \{ return @\(\) \}$/, '').replace(/\$null -eq \$n/g, 'n === null').replace(/\$n -ne \[Math\]::Floor\(\$n\)/g, 'n !== Math.floor(n)').replace(/\$n -lt (\d+)/g, 'n < $1').replace(/\$n -gt (\d+)/g, 'n > $1').replace(/ -or /g, ' || ');
  let refuses = () => null;   // no readable condition: every check below is false (red), never a crash
  try { const f = new Function('n', 'return ' + condJs); refuses = (n) => { try { return f(n); } catch { return null; } }; } catch { /* the flags below say it */ }
  const c13 = {
    found: gsi.length > 0 && cond.length > 0,
    translated: !/\$/.test(condJs) && !/\s-(?:or|eq|ne|lt|gt)\s/.test(condJs),
    refusesNegative: [-1, -2, -55, -100].every((n) => refuses(n) === true),
    refusesOthers: [null, 1.5, 56, 99, 1000].every((n) => refuses(n) === true),
    accepts: [0, 1, 7, 50, 55].every((n) => refuses(n) === false),
    insideLoop: gsi.indexOf('foreach ($v in @($raw)) {') > 0 && gsi.indexOf(cond) === gsi.indexOf('$n = Get-Num $v') + 1 && gsi[gsi.indexOf(cond)].endsWith('{ return @() }'),
    countAndRepeat: gsi.includes('if (($out.Count -lt 1) -or ($out.Count -gt 8)) { return @() }') && gsi.includes('if ($out.Contains([int]$n)) { return @() }'),
  };
  ok(F(c13).length === 0,
    '★ photo1a walk (c13 seedIndexLower, F4): the parser takes run.json seedIndex as 1 to 8 distinct whole numbers 0..55 — the condition of `Get-SeedIndexes` (translated and run in JavaScript) refuses a negative number, a fraction, a null and 56+, accepts 0, 1, 7, 50, 55; a refused value = no index = the "no data" row, as for the other bad values — failing: ' + JSON.stringify(F(c13)));

  /* ── c14 · F5: a neutral line of the step's own before each restart; the frozen helper is not touched ── */
  const neutR = restart.findIndex((l) => l.startsWith("Say-Log ('  open-seed k=' + $K + ': planned restart before the cold rep ("));
  const neutC = rep.findIndex((l) => l.startsWith("Say-Log '  open-seed: a failed rep, the app is restarted ("));
  const reset0 = fnPS(raw('scripts/device/adb-walk.ps1'), 'Reset-AppToChats');
  const c14 = {
    found: neutR > 0 && neutC > 0,
    plannedFirst: neutR > sp && neutR === restart.findIndex((l) => l.startsWith('if (-not (Invoke-FileReset')) - 1,
    failedRepFirst: neutC > catchAt && neutC === idxResetCall - 1,
    sayLog: (restart[neutR] || '').includes('no tab rep ran') && (rep[neutC] || '').includes('no tab rep ran') && !/failed tab rep/.test((restart[neutR] || '') + (rep[neutC] || '')),
    twoResets: count(newBody, 'Invoke-FileReset') === 2 && count(newBody, 'planned restart before the cold rep') === 1 && count(newBody, 'a failed rep, the app is restarted') === 1,
    helperFrozen: reset0.length > 0 && sha(reset0) === '263b18a8fbda3c320933ce9c54a6723f29b1addf8d7c5b8a419f5ec415f2eba0' && reset0.includes('tab step: the app was restarted after a failed tab rep'),
    noOtherCaller: !/Reset-AppToChats/.test(newBody),
  };
  ok(F(c14).length === 0,
    '★ photo1a walk (c14 neutralRestartLine, F5): both restarts of the open-seed step (the planned one before the cold rep, the one after a failed rep) print a line of the step\'s own FIRST (`open-seed …: … the "tab step" line below is the shared helper text, no tab rep ran`), then call Invoke-FileReset; Reset-AppToChats (the frozen helper with the "tab step … failed tab rep" text, whole-body SHA-256 of the perfb1toggle pin) is not edited and not called by the new functions — failing: ' + JSON.stringify(F(c14)));

  /* ── c15 · F6: no PNG of the step stays in the run folder ── */
  const sweepFn = fnD('Clear-FileStepPngs');
  const sweepRe = (/-cmatch '(\^shot-\([^']*\)-\[A-Za-z0-9-\]\{1,40\}\\\.png\\z)'/.exec(sweepFn) || [])[1] || '';
  const sj = sweepRe ? js(sweepRe) : /(?!)/;
  const c15 = {
    found: step.length > 0 && sweepFn.length > 0,
    lastStatement: step[step.length - 2] === 'Clear-FileStepPngs' && step[step.length - 3] === 'if ($script:NeedRecover -and -not $script:Halted) { [void](Invoke-EnsureHome) }' && count(step.join('\n'), 'Clear-FileStepPngs') === 1,
    afterEveryIndex: step.indexOf('Clear-FileStepPngs') > step.lastIndexOf('}', step.indexOf('Clear-FileStepPngs') - 1) - 99 && step.indexOf('Clear-FileStepPngs') > step.indexOf('foreach ($k in $script:SeedIdx) {'),
    sweepCoversNames: ['shot-open-seed-k05-cold-01.png', 'shot-open-seed-k05-01.png', 'shot-open-seed-k05-cold-01-pre.png', 'shot-open-seed-k05-cold-reset-01.png', 'shot-open-seed-k55-warmup-00.png', 'shot-open-seed-k05-warmup-reset-01.png', 'shot-open-seed-k05-02.png'].every((n) => sj.test(n)),
    sweepRefuses: ['shot-open-seed-k05.txt', 'shot-chat-intent-01.png', 'android-walk-open-seed-k05-01.txt', 'shot-open-seed-' + 'k'.repeat(41) + '.png', 'xshot-open-seed-k05-01.png'].every((n) => !sj.test(n)),
    sweepFrozen: fnSha(DRV, 'Clear-FileStepPngs') === '918f3c9130fcf47d6586f33f7b7cc69ddeb3f26fd6086df6d16db5964ad973dd',   // fixb3 item 4: + `-or $f.Name -cmatch '^shot-history-seed-k[0-9]{2}-reset-[0-9]{2,4}\\.png\\z'` (081b8903... -> 89d28c9e...; review round 1 n4: the counter is 2..4 digits); review round 2 (m2 b): 89d28c9e... -> 918f3c91... (+ the last statement `Clear-CalAccountPng`)
    mainFinallyKept: D.includes('try { Clear-FileStepPngs } catch { }') && count(D, 'Clear-FileStepPngs') >= 5,
  };
  ok(F(c15).length === 0,
    '★ photo1a walk (c15 sweepAtEnd, F6): Invoke-OpenSeedStep ends with `Clear-FileStepPngs` (after the one bounded recovery; the main finally still sweeps too), like the file steps; the sweep pattern (the function is unchanged: statement SHA-256) matches every PNG name the step can make — the rep, the `-pre`, the restart home check `-cold-reset-NN` / `-warmup-reset-NN`, the warm-up `-warmup-00` — and no log or foreign file — failing: ' + JSON.stringify(F(c15)));
}

// helper for the builder's generation of the frozen values (not used by the pin): the SHA-256 of a function's statements in a script text.
export const fnSha = (text, name) => sha(lines(fnPS(code(text.replace(/\r\n/g, '\n')), name)).join('\n'));
