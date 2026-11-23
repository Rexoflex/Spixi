/* ==== perfb1toggle · B — the walk side: `-Flags` of scripts/device/adb-walk.ps1 + the state line in adb-walk-parse.ps1.
 *
 * Pure node: CI has no PowerShell step, so these are SOURCE pins on the two scripts plus the BEHAVIOUR of the regexes that
 * are extracted from the script text and run in a JavaScript RegExp (PowerShell `\A` -> `^`, `\z` -> `$`; JS `$` without the
 * m flag is the end of the input, like `\z`). What they cannot prove (a fake-adb dry run on PowerShell 7.4.6 did; nothing
 * ran on a phone or on Windows PowerShell 5.1) is said in the builder's report, not here.
 *   ALLOW    — Initialize-Allowlist holds exactly ONE shape with `--es perfb1flags`; it ends with the exact CANON regex and `\z`
 *   FILTER   — the phone-side filter (LogRe) has ONE new alternative: the exact state line; the other [FLAGS] lines, the
 *              stored line and every near miss do not pass; the old alternatives still pass; no single quote in the pattern
 *   GUARD    — the perfb1flags command is built in ONE function, called from ONE place, only under `if ($script:FlagsAsked)`;
 *              FlagsAsked is set only inside the -Flags block, after the anchored check and the -Calibrate refusal
 *   VALID    — the -Flags check is `-cnotmatch` with `\A...\z` (case-sensitive, no newline tolerance); the extracted regex
 *              accepts the 16 legal values and refuses the near misses; both call forms reach it (`[string[]]`, `-join ','`)
 *   POLL     — the two new polls are exact strings in the style of PollCmd, count only (`grep -c`), both in PipedCmds
 *   PARSER   — the parser's state regex is anchored (`^...\z`), case-sensitive and the same text as the driver's; the state
 *              is re-built from the four captures; no raw line is appended to any output
 *   STOP     — the six stop codes: fixed texts in the driver and the parser; the "not stored" reason is the contract's
 *   WITHHOLD — (fix round) the parser judges the switch state BEFORE the rows and, when asked + a problem, empties reps and
 *              memory entries (every metric row = "no data", no number in summary.md / summary.csv); the driver ends the run
 *              when a coldstart rep's log shows a different state (the rep is recorded, then Stop-Flags 'state-differs';
 *              Invoke-Step still rethrows ADBWALK-STOP)
 *   FROZEN   — (fix round 2) the SHA-256 of the WHOLE text of every function / block that carries a -Flags rule (driver:
 *              Invoke-FlagsSetup, Update-FlagsLogged, Assert-FlagsPid, Get-FlagStates, Stop-Flags, Invoke-LogPull, Save-Log,
 *              Reset-AppToChats, Exit-Usage + the run.json `flags` lines, the mem-phase pid guard, the FlagsStopAfter act line,
 *              the main -Flags block; parser: Get-FlagsStatus, Read-FlagStates, the `$withheld` pair, the Problem -> RESULT /
 *              exit-code block). One key per body, so a red line names the body that changed. The body is brace-matched by a
 *              PowerShell-aware matcher (skips '...', "...", here-strings, <# #> and # comments); CRLF is read as LF. COMMENTS
 *              AND WHITESPACE ARE PART OF THE HASH: a comment edit inside a frozen body also needs a re-base of its hash here.
 *              R4-A: the two scripts of the adb walk are held WHOLE (file:<script>): the SHA-256 of the file text with CRLF read as LF
 *              (a CRLF checkout gives the same hash; neither file starts with a UTF-8 BOM). They stay exactly as the last #46 reader read
 *              them (the practice of batch `tooling`, DECISIONS 1523: files are delivered with their SHA-256): ANY edit, a comment too,
 *              needs a re-base of the file hash here after a look at the diff (ruling 1596 lets a batch re-base a pin for what it adds),
 *              so a stale second copy of a function, a scope-qualified or aliased definition, a dot-source line or any added line cannot
 *              stay green. The body keys say WHICH body changed, the file keys say THAT something did. R4-B: noDoubleNames:<script>.
 *              R3-1: each frozen function must also be defined exactly ONCE in its file (oneDefinition:<name>; PowerShell runs the
 *              LAST definition) and no alias / `function:` line may name it (noAlias:<name>).
 *              A red key is not always a bug: a deliberate change of a frozen body = re-base after the #46 look at the diff.
 *   SAFE     — no `input text` / uninstall / `pm clear` in the code of either script; a pulled flags log passes the pull-target
 *              rule; both scripts are ASCII only (L173)
 * filewalk (2026-11-16): the two whole-file hashes and logPullSites 9 → 13 re-based after a look at the diff (five opt-in steps, DECISIONS #1666–#1667)
 * filewalk #46 round 1 (2026-11-16): the two whole-file hashes re-based again after a look at the diff (driver: Invoke-FileReset / Invoke-FileShot / Get-DevSeedAddress / Wait-FilePull, two mirror polls; parser: stamp2 guard `-le`); logPullSites stays 13, every frozen body key stayed green
 * filewalk #46 round 2 (2026-11-16): the two whole-file hashes re-based again after a look at the diff (driver: Save-FileRepPid / Get-ScrollBase, Invoke-FileReset with the stored pid, cal-reset sweep; the step-end Halted guards were only pinned (b-walk-steps b19), not changed; parser: X-ScrollW needs two scroll lines from stamp2 on); logPullSites stays 13, every frozen body key stayed green
 * filewalk #46 round 3 (2026-11-16): the parser hash re-based again after a look at the diff (X-LongW: the same two-scroll-line rule as X-ScrollW); the driver hash is unchanged; logPullSites stays 13, every frozen body key stayed green
 * photo1a (2026-11-17): the two whole-file hashes and logPullSites 13 → 15 re-based after a look at the diff (the opt-in steps open-seed + mem-photos, -SeedIndex, five parser rows; two new Invoke-LogPull sites); every frozen body key stayed green
 * 2026-11-17 (photo1a, review round 1, scope C-walk): the two whole-file hashes re-based again after a look at the diff (driver: the warm-up open, the pid-less halt, the neutral restart lines, the <seed-index k> label, the sweep at the end of open-seed; parser: the lower bound of Get-SeedIndexes); logPullSites stays 15, every frozen body key stayed green (Reset-AppToChats and Invoke-LogPull untouched)
 * 2026-11-18 (fixb3, scope C-walk): the two whole-file hashes (2fc646d6... -> a39d8dc2... (the lead added one EnsureHome line to Invoke-HistorySeedRestart before the push, as open-seed), 319d7f18... -> 1314d8e1...) and logPullSites 15 -> 16 re-based after a look at the diff (item 3: the scrolled-hub swipe + check in Invoke-DownloadsRep, cal-17s and the way back in -Calibrate; item 4: -HistorySeed, the step history-seed-kNN with ONE new Invoke-LogPull site, its parser rows); every frozen body key stayed green (Reset-AppToChats and Invoke-LogPull untouched)
 * 2026-11-17 (photo1a, review round 2, scope C-walk): the two whole-file hashes re-based again after a look at the diff (driver: the (pid, index) warm key, the open-seed mask loop first); every frozen body key stayed green
 * 2026-11-18 (fixb3, review round 1, scope C-walk): the two whole-file hashes re-based again after a look at the diff (driver a39d8dc2... -> 3e407de2...: cal-17s kept only while screens.accountScrolled is not set, the load-time refusal of a weak accountScrolled, the estimate of downloads, `pages` in run.json, -HistorySeed last in the param block, the sweep counter 2..4 digits, comments; parser 1314d8e1... -> cf42f078...: X-SeedPage, Pages in the rep context); logPullSites stays 16, every frozen body key stayed green
 * 2026-11-18 (fixb3, review round 2, scope C-walk): the two whole-file hashes re-based again after a look at the diff (driver 3e407de2... -> eca79886...: Invoke-CalAccountScroll in a try / finally, the new Clear-CalAccountPng called at the end of Clear-FileStepPngs, Clear-FileStepPngs at the end of Invoke-HistorySeedStep, the load-time usage error of a present but invalid screens.accountScrolled, the one-row-offset limit in the headers and the calibrate note; parser cf42f078... -> 826f74d1...: X-SeedFirstPage, the SendLoadMore line definition, the legend and header text); logPullSites stays 16, every frozen body key stayed green
 * 2026-11-18 (fixb3, review round 3, scope C-walk): the two whole-file hashes re-based again after a look at the diff (driver eca79886... -> acd8ed6e...: the swipe note of Invoke-CalAccountScroll names the gap of a PRESENT but invalid swipes.accountDownloads; parser 826f74d1... -> 4a80770b...: X-SeedPagesGate / X-SeedGated, every row of history-seed-kNN behind pages >= 1, the legend and header text); logPullSites stays 16, every frozen body key stayed green
 * 2026-11-22 (fixb3, operator block; after a look at the diff, #1596): the driver hash re-based again (acd8ed6e... -> 44ebb3b9...): the -HistorySeed
 *   state variable is renamed $script:HistorySeed -> $script:HistSeedIdx in six lines (a typed script parameter IS the script-scope variable; the
 *   first walk run stopped at the run.json line). No other byte changed; the parser is unchanged.
 * Deliberate breaks (#802): see the builder's report of batch perfb1toggle item 2. */
import { createHash } from 'node:crypto';
export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/\r\n/g, '\n');   // a CRLF checkout reads as LF
  const DRV = raw('scripts/device/adb-walk.ps1');
  const PAR = raw('scripts/device/adb-walk-parse.ps1');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  // PowerShell: drop the block comments and the whole-line `#` comments (a '#' inside a string stays: only whole lines go).
  const code = (t) => t.replace(/<#[\s\S]*?#>/g, '').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const D = code(DRV), P = code(PAR);
  const count = (t, s) => t.split(s).length - 1;
  const fn = (t, name) => {   // the brace-matched body of `function <name>`
    const i = t.indexOf('function ' + name); if (i < 0) return '';
    const o = t.indexOf('{', i); let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const lit = (t, lhs) => {   // the single-quoted literal assigned to `lhs` (a PowerShell '' is one quote)
    const i = t.indexOf(lhs); if (i < 0) return null;
    const m = /^\s*(?:New-Rx\s+)?'((?:[^']|'')*)'/.exec(t.slice(i + lhs.length)); return m ? m[1].replace(/''/g, "'") : null;
  };
  const js = (re) => new RegExp(re.replace(/\\A/g, '^').replace(/\\z/g, '$'));

  const NAMES = ['warmidle', 'sparerearm', 'sparekeep', 'noemptydetail'];
  const CANON_RE = 'warmidle=[01],sparerearm=[01],sparekeep=[01],noemptydetail=[01]';
  const legal = [];
  for (let i = 0; i < 16; i++) legal.push(NAMES.map((n, k) => n + '=' + ((i >> (3 - k)) & 1)).join(','));

  /* ── ALLOW ── */
  const allow = fn(D, 'Initialize-Allowlist');
  const lines = allow.split('\n').filter((l) => l.includes('perfb1flags'));
  const al = {
    found: allow.length > 0,
    one: lines.length === 1 && count(allow, '--es perfb1flags') === 1,
    exact: lines.length === 1 && lines[0].trim() === "('^am start -n ' + $ce + ' --es perfb1flags " + CANON_RE + "\\z'),",
    noOtherFamily: count(D, '--es perfb1flags') === 2,   // the allowlist line + the one builder (GUARD)
    anchored: lines.length === 1 && lines[0].includes('^am start -n') && lines[0].includes('\\z'),
    notW: !/am start -W -n ' \+ \$ce \+ ' --es perfb1flags/.test(allow),
  };
  ok(F(al).length === 0,
    '★ perfb1toggle B: the allowlist holds exactly ONE `--es perfb1flags` shape (am start -n <component> --es perfb1flags <CANON regex> \\z) and the script names `--es perfb1flags` in two places only (that line + the one builder) — failing: ' + JSON.stringify(F(al)));

  /* ── FILTER ── */
  const logRe = lit(D, '$script:LogRe =') || '';
  // split the alternatives of the group that follows the Core stamp prefix (depth-aware; \( and [...] are not groups)
  const gStart = logRe.indexOf(': (');
  const alts = []; let cur = '', dep = 0, cls = false;
  const inner = logRe.slice(gStart + 3, logRe.length - 1);
  for (let k = 0; k < inner.length; k++) {
    const c = inner[k];
    if (c === '\\') { cur += c + inner[++k]; continue; }
    if (cls) { cur += c; if (c === ']') cls = false; continue; }
    if (c === '[') { cls = true; cur += c; continue; }
    if (c === '(') dep++; if (c === ')') dep--;
    if (c === '|' && dep === 0) { alts.push(cur); cur = ''; continue; }
    cur += c;
  }
  alts.push(cur);
  const flagAlts = alts.filter((a) => a.includes('FLAGS'));
  const STATE_ALT = '\\[FLAGS\\] warmidle=[01] sparerearm=[01] sparekeep=[01] noemptydetail=[01]$';
  const stamp = '05-20 12:00:00.123 4242 4243 I DOTNET  : 05-20 12:00:00.1234|info|7: ';
  const full = js(logRe.replace(/\)$/, ')'));   // `$` ends are already JS-compatible
  const pass = (msg) => full.test(stamp + msg);
  const acceptL = [
    '[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1', '[FLAGS] warmidle=0 sparerearm=0 sparekeep=1 noemptydetail=0',
    'Starting Spixi spixi-0.9.22 (xcore-0.9.8k)', '[P1] boot hold ms=1236 why=dropped', 'Received Hello: Node version 6',
  ];
  const rejectL = [
    '[FLAGS] securepass=1 mediagate=1', '[FLAGS] perfb1 extra stored', '[FLAGS] warmidle=2 sparerearm=1 sparekeep=0 noemptydetail=1',
    '[FLAGS] warmidle=1 sparerearm=2 sparekeep=0 noemptydetail=1', '[FLAGS] warmidle=1 sparerearm=1 sparekeep=2 noemptydetail=1', '[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=2',
    '[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1 x', '[FLAGS] warmidle=1 sparerearm=1 sparekeep=0',
    '[FLAGS] sparerearm=1 warmidle=1 sparekeep=0 noemptydetail=1', '[FLAGS] warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=1',
    '[flags] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1', 'x [FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1',
    '[FLAGS] warmidle=1  sparerearm=1 sparekeep=0 noemptydetail=1', '[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1 ',
    '[WEBVIEW] INFO [FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1', '[FLAGS]', '[FLAGS] ',
  ];
  const wrongPrefix = '[FLAGS] warmidle=1 sparerearm=1 sparekeep=0 noemptydetail=1';
  const fl = {
    found: logRe.length > 100 && gStart > 0,
    oneNewAlt: flagAlts.length === 1 && flagAlts[0] === STATE_ALT && alts.length === 5,
    noQuote: !logRe.includes("'"),
    stillAfterStamp: logRe.startsWith('^[0-9]{2}-[0-9]{2} [0-9:.]{12} +[0-9]+ +[0-9]+ [A-Z] DOTNET *: ') && gStart > 0 && logRe.endsWith(')'),
    accept: acceptL.every(pass),
    reject: rejectL.every((m) => !pass(m)),
    needsStamp: !full.test(wrongPrefix) && !full.test('05-20 12:00:00.123 4242 4243 I DOTNET  : ' + wrongPrefix),
    notWholeFamily: !/\\\[FLAGS\\\]\s*\[/.test(logRe) && !/FLAGS\\\]\s*[^ ]*\.\*/.test(logRe),
  };
  ok(F(fl).length === 0,
    '★ perfb1toggle B: the phone-side filter (LogRe) gets ONE new alternative = the exact state line `[FLAGS] warmidle=[01] sparerearm=[01] sparekeep=[01] noemptydetail=[01]$` after the Core stamp prefix; the other [FLAGS] lines, the stored line and every near miss are refused; the four old alternatives still pass; no single quote — failing: ' + JSON.stringify(F(fl)) + ' alts=' + alts.length);

  /* ── GUARD ── */
  const setup = fn(D, 'Invoke-FlagsSetup');
  const builders = D.split('\n').filter((l) => l.includes('--es perfb1flags') && !l.includes('^am start'));
  const mainFlags = (() => { const i = D.indexOf("if ($PSBoundParameters.ContainsKey('Flags'))"); if (i < 0) return ''; const o = D.indexOf('{', i); let d = 0; for (let k = o; k < D.length; k++) { if (D[k] === '{') d++; else if (D[k] === '}' && --d === 0) return D.slice(o, k + 1); } return ''; })();
  const gd = {
    found: setup.length > 0 && mainFlags.length > 0,
    oneBuilder: builders.length === 1 && setup.includes(builders[0].trim()) && count(D, 'function Invoke-FlagsSetup') === 1,
    oneCall: count(D, 'Invoke-FlagsSetup') === 2 && /if \(\$script:FlagsAsked\) \{ Invoke-FlagsSetup \}/.test(fn(D, 'Invoke-Walk')),
    selfGuard: /^\{\s*# ?[^\n]*\n[\s\S]*?if \(-not \$script:FlagsAsked\) \{ return \}/.test(setup) || /\{\s*if \(-not \$script:FlagsAsked\) \{ return \}/.test(setup),
    builderIsAsked: /--es perfb1flags ' \+ \$script:FlagsAsked\)/.test(setup),
    setOnlyInBlock: count(D, '$script:FlagsAsked = ') === 2 && mainFlags.includes('$script:FlagsAsked = $flagsText') && /\$script:FlagsAsked = ''/.test(D),
    afterChecks: mainFlags.indexOf("Exit-Usage '-Flags cannot be used with -Calibrate'") > 0 && mainFlags.indexOf('-cnotmatch') > mainFlags.indexOf('-Calibrate') && mainFlags.indexOf('$script:FlagsAsked = $flagsText') > mainFlags.indexOf('-cnotmatch'),
    beforeAdb: D.indexOf("if ($PSBoundParameters.ContainsKey('Flags'))") > 0 && D.indexOf("if ($PSBoundParameters.ContainsKey('Flags'))") < D.indexOf('Initialize-Allowlist\n') && D.indexOf("if ($PSBoundParameters.ContainsKey('Flags'))") < D.indexOf('Invoke-Preflight\n    if'),
    noOtherExtra: D.split('\n').filter((l) => l.includes("' --es ") && !l.includes('^am start')).every((l) => /' --es (fa|perfb1flags) '/.test(l)),   // only the old `fa` starts + this one
  };
  ok(F(gd).length === 0,
    '★ perfb1toggle B: the `--es perfb1flags` start is built in ONE function (Invoke-FlagsSetup), called from ONE place under `if ($script:FlagsAsked)`; FlagsAsked is set only in the -Flags block, after the -Calibrate refusal and the anchored check, before the allowlist and any adb call — no extra without -Flags — failing: ' + JSON.stringify(F(gd)));

  /* ── VALID ── */
  const vRe = (() => { const m = /\$flagsText -cnotmatch '([^']*)'/.exec(mainFlags); return m ? m[1] : ''; })();
  const vJs = vRe ? js(vRe) : /(?!)/;
  const goodV = legal;
  const badV = [
    'sparerearm=1,warmidle=1,sparekeep=0,noemptydetail=1', 'warmidle=2,sparerearm=1,sparekeep=0,noemptydetail=1', 'warmidle=1,sparerearm=1,sparekeep=0',
    'WARMIDLE=1,SPARERearm=1,sparekeep=0,noemptydetail=1', 'warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=1,', ',warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=1',
    'warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=1\n', 'warmidle=1, sparerearm=1,sparekeep=0,noemptydetail=1', ' warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=1',
    'warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=1,warmidle=1', 'warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=1;x', '', 'warmidle=11,sparerearm=1,sparekeep=0,noemptydetail=1',
    'warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=\u0661', 'warmidle=1,sparerearm=1,sparekeep=0,noemptydetail=1\n,x',
  ];
  const vl = {
    found: vRe.length > 0,
    anchoredCase: vRe.startsWith('\\A') && vRe.endsWith('\\z') && !/\(\?i\)/.test(vRe) && mainFlags.includes('-cnotmatch') && !/-notmatch|-inotmatch/.test(mainFlags),
    canonText: vRe === '\\A' + CANON_RE + '\\z',
    accepts16: goodV.length === 16 && goodV.every((v) => vJs.test(v)),
    refuses: badV.every((v) => !vJs.test(v)),
    bothForms: /\[string\[\]\]\$Flags/.test(D) && /\$flagsText = \(\$Flags -join ','\)/.test(mainFlags),
    calibrate: /if \(\$Calibrate\) \{ Exit-Usage '-Flags cannot be used with -Calibrate' \}/.test(mainFlags),
  };
  ok(F(vl).length === 0,
    '★ perfb1toggle B: the -Flags check is `-cnotmatch` with `\\A…\\z` = exactly CANON (16 legal values pass; wrong order, a 2, three entries, upper case, a trailing comma, a space, a newline, a doubled entry, a non-ASCII digit are usage errors); an array of four is joined with `,`; -Flags with -Calibrate is a usage error — failing: ' + JSON.stringify(F(vl)));

  /* ── POLL ── */
  const pcs = D.split('\n').filter((l) => /^\s*flags(stored|state) = /.test(l)).map((l) => l.trim());
  const piped = fn(D, 'Initialize-Allowlist');
  const pl = {
    stored: pcs.includes("flagsstored = ($script:LogCmd + ' | grep -c -e FLAGS..perfb1.extra.stored')"),
    state: pcs.includes("flagsstate = ($script:LogCmd + ' | grep -c -e FLAGS..warmidle=')"),
    two: pcs.length === 2,
    countOnly: pcs.every((l) => l.includes(' | grep -c -e ') && !l.includes('grep -E') && !l.includes('>')),
    piped: piped.includes("$script:FramePoll['flagsstored']") && piped.includes("$script:FramePoll['flagsstate']"),
    used: /Wait-LogCount 'flagsstored' \(\$script:FlagsStoredWaitSec \* 1000\)/.test(setup) && /Wait-LogCount 'flagsstate' \(\$script:FlagsStateWaitSec \* 1000\)/.test(setup),
    limits: /\$script:FlagsStoredWaitSec = 30\b/.test(D) && /\$script:FlagsStateWaitSec = 45\b/.test(D) && /\$script:FlagsStoreSettleMs = 2000\b/.test(D),
    order: ['am force-stop', "'logcat -c'", '--es perfb1flags', "Wait-LogCount 'flagsstored'", 'Wait-Ms $script:FlagsStoreSettleMs', 'am force-stop', "'logcat -c'", 'am start -W -n', "Wait-LogCount 'flagsstate'", 'Save-Log $script:FlagsPull'].every((tok, i, a) => {
      let from = 0; for (let j = 0; j <= i; j++) { const at = setup.indexOf(a[j], from); if (at < 0) return false; from = at + 1; } return true;
    }),
  };
  ok(F(pl).length === 0,
    '★ perfb1toggle B: the two new polls are exact count-only strings (`… | grep -c -e FLAGS..perfb1.extra.stored` / `… -e FLAGS..warmidle=`, 30 s / 45 s limits), both in PipedCmds; the setup runs force-stop · logcat -c · extra start · stored poll · 2 s settle · force-stop · logcat -c · cold start -W · state poll · ONE pull in this order — failing: ' + JSON.stringify(F(pl)));

  /* ── PARSER ── */
  const pRe = lit(P, '$script:RxFlagState =') || '';
  const dRe = lit(D, '$script:FlagLineRe =') || '';
  const rd = fn(P, 'Read-FlagStates');
  const pj = pRe ? new RegExp(pRe.replace(/\\z/g, '$')) : /(?!)/;
  const line = (m) => '05-20 12:00:00.123 4242 4243 I DOTNET  : 05-20 12:00:00.1234|info|7: ' + m;
  const mm = pj.exec(line('[FLAGS] warmidle=1 sparerearm=0 sparekeep=1 noemptydetail=0'));
  const pr = {
    found: pRe.length > 0 && rd.length > 0,
    anchored: pRe.startsWith('^') && pRe.endsWith('\\z') && !/\(\?i\)/.test(pRe) && !/IgnoreCase/.test(P),
    sameAsDriver: pRe === dRe && pRe.length > 0,
    captures: !!mm && mm.slice(1).join('') === '1010',
    rejects: ['[FLAGS] securepass=1 mediagate=1', '[FLAGS] perfb1 extra stored', '[FLAGS] warmidle=2 sparerearm=0 sparekeep=1 noemptydetail=0', '[FLAGS] warmidle=1 sparerearm=0 sparekeep=1 noemptydetail=0 x', '[FLAGS] warmidle=1 sparerearm=0 sparekeep=1 noemptydetail=0\n']
      .every((m) => !pj.test(line(m))) && !pj.test('[FLAGS] warmidle=1 sparerearm=0 sparekeep=1 noemptydetail=0'),
    rebuilt: /\$lines\.Add\('warmidle=' \+ \$mm\.Groups\[1\]\.Value \+ ' sparerearm=' \+ \$mm\.Groups\[2\]\.Value \+ ' sparekeep=' \+ \$mm\.Groups\[3\]\.Value \+ ' noemptydetail=' \+ \$mm\.Groups\[4\]\.Value\)/.test(rd),
    noRawLine: count(rd, '$lines.Add(') === 1 && !/\$lines\.Add\(\$line/.test(rd) && !/Write-Host|\$md\.Append|\.Substring\(/.test(rd),
    summaryFromState: (() => { const ap = P.split('\n').filter((l) => l.includes("Switch state")); return ap.length >= 5 && ap.every((l) => !/\$line\b|\$ln\b|\$res\b|\$mm\b|\$r\.Msg|\.Msg\b/.test(l)); })(),
    flagsPullFixedName: /\$script:FlagsPullName = 'android-walk-flags-00\.txt'/.test(P) && /\$script:FlagsPull = 'android-walk-flags-00\.txt'/.test(D),
    csvUntouched: !/\$csv\.Append\([^\n]*(fs\.|Flags)/.test(P),
  };
  ok(F(pr).length === 0,
    '★ perfb1toggle B: the parser finds the state line with an ANCHORED, case-sensitive regex (the same text as the driver\'s), re-builds the state from the four captures and copies no raw line (summary.md Switch-state lines are built from $fs fields only); summary.csv code does not read the flags — failing: ' + JSON.stringify(F(pr)));

  /* ── STOP ── */
  const stopWords = (t, lhs) => { const i = t.indexOf(lhs); if (i < 0) return {}; const b = t.slice(i, t.indexOf('}', i)); return Object.fromEntries([...b.matchAll(/'([a-z-]+)' = '((?:[^']|'')*)'/g)].map((m) => [m[1], m[2]])); };
  const dw = stopWords(D, '$script:FlagsStopText = @{'), pw = stopWords(P, '$script:FlagsStopWords = [ordered]@{');
  const CODES = ['start-failed', 'not-stored', 'no-state-line', 'pull-failed', 'state-differs', 'unproven-process'];
  const sp = {
    driverCodes: Object.keys(dw).join(',') === CODES.join(','),
    parserCodes: Object.keys(pw).join(',') === CODES.join(','),
    reason: dw['not-stored'] === 'the app did not store the switch state (Developer mode off, or the build on the phone does not have this batch)' && pw['not-stored'] === dw['not-stored'],
    usedOnce: CODES.every((c) => count(D, "Stop-Flags '" + c + "'") >= 1) && count(D, 'Stop-Walk $text') === 1,
    safeChars: Object.values(dw).every((t) => /^[A-Za-z0-9 _.,:=\/()%+-]+$/.test(t)),
    stopsRun: /function Stop-Flags[\s\S]*?\$script:FlagsOk = \$false[\s\S]*?\$script:FlagsStop = \$Code[\s\S]*?Stop-Walk \$text/.test(D),
    exitCodes: /3 no run\.json, 4 the switch state/.test(DRV) && /\$exitCode = 4/.test(P) && count(P, '$exitCode = 4') === 2,
    runJson: /\$doc\['flags'\] = \$flg/.test(fn(D, 'Save-RunJson')) && /asked = \$null; logged = 'not read'; ok = \$true/.test(fn(D, 'Save-RunJson')),
  };
  ok(F(sp).length === 0,
    '★ perfb1toggle B: the six stop codes have fixed texts in the driver and the parser (the "not stored" reason is the contract\'s); a stop sets FlagsOk false + flags.stop and ends in Stop-Walk (exit 1, no step); the parser exits 4 for a state that differs; run.json always gets a `flags` object — failing: ' + JSON.stringify(F(sp)));

  /* ── WITHHOLD ── */
  const main = fn(P, 'Invoke-Main');
  const iFs = main.indexOf('$fs = Get-FlagsStatus $m $reps $runPath');
  const iWh = main.indexOf("$withheld = (($fs.Mode -eq 'asked') -and ($fs.Problem -ne ''))");
  const iCl = main.indexOf('if ($withheld) { $reps.Clear(); $memEntries.Clear() }');
  const iT0 = main.indexOf('$t0s = New-Object');
  const iRows = main.indexOf('$rows = New-Object');
  const upd = fn(D, 'Update-FlagsLogged');
  const iUc = upd.indexOf('Complete-Rep $Rec $script:RepeatsN'), iUs = upd.indexOf("Stop-Flags 'state-differs'"), iUf = upd.indexOf('if ($script:FlagsAsked)');
  const stepB = fn(D, 'Invoke-Step');
  const wh = {
    found: main.length > 0 && upd.length > 0 && stepB.length > 0,
    statusFirst: count(main, 'Get-FlagsStatus') === 1 && iFs > 0 && iFs < iT0 && iFs < iRows,
    emptied: iWh > iFs && iCl > iWh && iCl < iT0 && iCl < iRows,
    mdLine: /if \(\$withheld\) \{ \[void\]\$md\.Append\('- Numbers withheld: /.test(main),
    stopNotes: /if \(\$st\.Stop -ne ''\) \{[^}]*\$st\.Problem = 'nodata'/.test(fn(P, 'Get-FlagsStatus')),
    repStops: iUf > 0 && iUc > iUf && iUs > iUc && count(upd, 'Stop-Flags') === 2 && count(upd, "Stop-Flags 'state-differs'") === 1 && count(upd, "Stop-Flags 'no-state-line'") === 1 && count(upd, "$Rec.status = 'error'") === 2 && count(upd, 'Complete-Rep $Rec $script:RepeatsN') === 2,
    calledAfterPull: /Invoke-LogPull \$Rec\s+Update-FlagsLogged \$Rec/.test(fn(D, 'Invoke-ColdstartRep')),
    stopRethrown: stepB.indexOf("if ($msg.StartsWith('ADBWALK-STOP:')) { throw }") > 0 && stepB.indexOf("if ($msg.StartsWith('ADBWALK-STOP:')) { throw }") < stepB.indexOf("ADBWALK-SKIP:"),
    noFlagsOnlyRecords: /if \(\$script:FlagsAsked\) \{\s*foreach/.test(upd),
  };
  ok(F(wh).length === 0,
    '★ perfb1toggle B: in a run with flags.asked whose state is not proven or differs the parser withholds EVERY number (the status is computed before the rows; reps and memory entries are emptied; "Numbers withheld" line; a driver stop code also counts as not proven); in the driver a coldstart rep whose log shows a different state is recorded as an error and then Stop-Flags (rethrown by Invoke-Step as ADBWALK-STOP), only with -Flags — failing: ' + JSON.stringify(F(wh)));

  /* ── COMPARE (fix round 1: the comparisons that decide "no number" are held by exact text) ── */
  const upd2 = fn(D, 'Update-FlagsLogged'), gfs = fn(D, 'Get-FlagStates'), pgf = fn(P, 'Get-FlagsStatus');
  const iOk = setup.indexOf('$script:FlagsOk = $true');
  const cp = {
    usageBody: /\$flagsText -cnotmatch '[^']*'\) \{\s*Exit-Usage '-Flags must be exactly[^']*'\s*\}/.test(mainFlags),
    okFalse: /\}\s*\$script:FlagsAsked = \$flagsText\s*\$script:FlagsAskedState = [^\n]*\n[^\n]*\n\s*\$script:FlagsOk = \$false\s*$/.test(mainFlags.replace(/\}$/, '')) || mainFlags.includes('$script:FlagsOk = $false'),
    okFalseOnce: count(mainFlags, '$script:FlagsOk = $false') === 1 && count(mainFlags, '$script:FlagsOk = $true') === 0,
    noStateStop: count(setup, "if ($states.Count -eq 0) { Stop-Flags 'no-state-line' }") === 1,
    setupCompare: count(setup, "if (-not (Test-Ordinal $st $script:FlagsAskedState)) { $script:FlagsLogged = $st; Stop-Flags 'state-differs' }") === 1,
    compareBeforeOk: iOk > setup.indexOf("Stop-Flags 'state-differs'") && setup.indexOf("Stop-Flags 'state-differs'") > setup.indexOf("if ($states.Count -eq 0) { Stop-Flags 'no-state-line' }") && count(setup, '$script:FlagsOk = $true') === 1,
    elseAdopt: /Exit-Usage '-Flags must be exactly[^']*'\s*\}\s*else \{\s*(#[^\n]*\n\s*)?\$script:FlagsAsked = \$flagsText\s*\$script:FlagsAskedState = [^\n]*\n\s*(#[^\n]*\n\s*)?\$script:FlagsOk = \$false\s*\}\s*\}$/.test(mainFlags),
    updCompare: count(upd2, 'if (-not (Test-Ordinal $st $script:FlagsAskedState)) {') === 1,
    rebuilt: count(gfs, "$out.Add('warmidle=' + ") === 1 && count(gfs, '$out.Add($line') === 0 && count(gfs, '$out.Add(') === 1,
    parserCompare: count(pgf, "if (($st.Mode -eq 'asked') -and ($firstBad -eq '') -and (-not (Test-Same $ln $st.Asked))) { $firstBad = $ln }") === 1,
    parserDiffers: count(pgf, "if ($firstBad -ne '') { $st.Problem = 'differs'; $st.Logged = $firstBad; return $st }") === 1,
    parserNoLine: count(pgf, "if (($null -eq $pullRes) -or ($pullRes.Lines.Count -eq 0)) {") === 1,
    exit4: /if \(\$fs\.Problem -eq 'differs'\) \{[^}]*\$exitCode = 4/.test(main) && /elseif \(\$fs\.Problem -eq 'nodata'\) \{[\s\S]*?\$exitCode = 2/.test(main),
  };
  ok(F(cp).length === 0,
    '★ perfb1toggle B: the comparisons that decide "no number" are held by exact source text — the usage error inside the -cnotmatch check, FlagsOk false in the -Flags block (and never true there), the setup: no-state-line stop, the asked-vs-logged compare with Stop-Flags state-differs BEFORE FlagsOk = true, Update-FlagsLogged compare, the driver rebuilds the state from captures only, the parser compare / differs -> exit 4 / no-line -> nodata -> exit 2 — failing: ' + JSON.stringify(F(cp)));

  /* ── PROCESS (fix round 1: the state is proven per app process; unreadable / unknown-stop / mixed / extra start) ── */
  const asrt = fn(D, 'Assert-FlagsPid'), reset = fn(D, 'Reset-AppToChats'), lpull = fn(D, 'Invoke-LogPull'), mem = fn(D, 'Invoke-MemPhase'), sl = fn(D, 'Save-Log');
  const noLineBranch = /if \(\$states\.Count -eq 0\) \{[\s\S]*?if \(\$script:FlagsAsked\) \{[\s\S]*?\$Rec\.status = 'error'[\s\S]*?Complete-Rep[\s\S]*?Stop-Flags 'no-state-line'[\s\S]*?\}\s*return\s*\}/.test(upd2);
  const pr2 = {
    logPullSites: count(D, 'Invoke-LogPull $Rec') === 16,
    pidGuard: asrt.includes('if ($script:LastPullPid -and $script:FlagsPid -and (Test-Ordinal $script:LastPullPid $script:FlagsPid)) { return }') && asrt.includes("Stop-Flags 'unproven-process'") && asrt.includes("$Rec.status = 'error'"),
    pullGuard: lpull.includes("if ($script:FlagsAsked -and $Rec.step -cne 'coldstart') { Assert-FlagsPid $Rec }"),
    pidSaved: sl.includes("$script:LastPullPid = [string]$ids[0]") && count(D, '$script:FlagsPid = $script:LastPullPid') === 2,
    coldNoLine: noLineBranch,
    resetStops: /am start -W -n[\s\S]*if \(\$script:FlagsAsked\) \{ Stop-Flags 'unproven-process' \}\s*\}$/.test(reset),
    memGuard: mem.includes('if ($script:FlagsAsked -and -not (Test-Ordinal ([string]$f.AppPid) $script:FlagsPid))') && mem.includes('if ($script:FlagsStopAfter) { Stop-Flags $script:FlagsStopAfter }'),
    unprovenWords: dw['unproven-process'] === 'the app process changed after the switch state was proven (a restart inside the run): the state of the new process is not proven' && pw['unproven-process'] === dw['unproven-process'],
    parserCold: pgf.includes("if ($f.Cold -and ($res.Lines.Count -eq 0)) { $coldNone = $true }") && pgf.includes("if ($unread -or $coldNone) {"),
    parserUnread: pgf.includes("if (($res.State -ne 'ok') -and ($res.State -ne 'missing')) { $unread = $true }"),
    unknownStop: pgf.includes("if ($null -ne $stopRaw) {") && pgf.includes("$st.Stop = 'the driver stopped the run (an unknown stop code)'") && !/\$st\.Stop = \[string\]\$stopRaw|\$st\.Stop = \$stopRaw/.test(pgf),
    mixed: pgf.includes('elseif ($distinct.Count -gt 1) { $st.Mixed = @($distinct.ToArray() | Select-Object -First 4) }') && main.includes("- Switch state: mixed (no -Flags; the logs of this run hold more than one state: "),
    legend: P.includes('and the exact state line `[FLAGS] warmidle= sparerearm= sparekeep= noemptydetail=`)'),
    extraStart: /^\{[\s\S]*?\[void\]\(Invoke-ShellReq \('am force-stop ' \+ \$script:Pkg\)\)\s*\[void\]\(Invoke-ShellReq 'logcat -c'\)\s*\$r = Invoke-Shell \('am start -n '/.test(setup.replace(/^\{\s*(#[^\n]*\n\s*)*/, '{\n').replace(/Say-Log \([^\n]*\n/, '')) || setup.indexOf("am force-stop") < setup.indexOf('--es perfb1flags'),
    notDelivered: setup.includes("if ($amNote.Contains('intent not delivered')) { Stop-Flags 'start-failed' }") && setup.includes("a stored line was seen") && !setup.includes('the app stored the switch state'),
  };
  ok(F(pr2).length === 0,
    '★ perfb1toggle B: in a -Flags run every number comes from the app process whose own state line was read (coldstart rep without a state line -> no-state-line; any other pull / memory phase from another pid and a Reset-AppToChats restart -> unproven-process); the parser withholds on a coldstart log without the line, an unreadable log and ANY flags.stop (unknown code = fixed words); free mode names a mixed state; the legend names the state line; the extra start is preceded by a force-stop and an "intent not delivered" note stops with start-failed — failing: ' + JSON.stringify(F(pr2)));

  /* ── FROZEN (fix round 2): whole bodies by SHA-256 ── */
  const sha = (x) => createHash('sha256').update(x).digest('hex');
  const LF = (t) => t.replace(/\r\n/g, '\n');
  const DN = LF(DRV), PN = LF(PAR);
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
  const fnPS = (t, name) => { const m = new RegExp('^function ' + name.replace(/-/g, '\\-') + '\\b', 'm').exec(t); return m ? psMatch(t, m.index) : null; };
  const blk = (t, from, to, incl = true) => { const i = t.indexOf(from); if (i < 0 || t.indexOf(from, i + 1) >= 0) return null; const j = t.indexOf(to, i + from.length); if (j < 0) return null; return t.slice(i, incl ? j + to.length : j); };
  const blkBrace = (t, m) => { const i = t.indexOf(m); if (i < 0 || t.indexOf(m, i + 1) >= 0) return null; const b = psMatch(t, i); return b === null ? null : t.slice(i, t.indexOf(b, i) + b.length); };
  // matcher self-test: braces inside strings / comments / here-strings do not count; the end is the real one
  const mt = psMatch("function X {\n  $a = '}{' ; $b = \"`}\" + \"{\"; # } {\n  <# } #>\n  if ($x) { 1 }\n}\nfunction Y {", 0);
  const frozen = [
    ['D', 'fn:Invoke-FlagsSetup', fnPS(DN, 'Invoke-FlagsSetup'), 'deb5eb653017abcef39d48ffca4f4cbb52a615512b54065f104d3f0e2ba88c01'],
    ['D', 'fn:Update-FlagsLogged', fnPS(DN, 'Update-FlagsLogged'), '62aa45e6a3b92b78610f9d927a2489e0fb3b5b509221258f09ef2289c7200028'],
    ['D', 'fn:Assert-FlagsPid', fnPS(DN, 'Assert-FlagsPid'), '330b7fbc92b3ae806495c69e9fd1fbfc1fd26e6ad15dc023a427cced30e24dcc'],
    ['D', 'fn:Get-FlagStates', fnPS(DN, 'Get-FlagStates'), '3448c724b89e89edda0aeac3479e75acaa06ddd2548249c025c3287e06dc1c0c'],
    ['D', 'fn:Stop-Flags', fnPS(DN, 'Stop-Flags'), '83d7a9fc925db7f41d2f36390a98e0caa6be045ac728e502e4d6bb180164538d'],
    ['D', 'fn:Invoke-LogPull', fnPS(DN, 'Invoke-LogPull'), 'd250e7a1d62b5f68459b8e771801d198f4dbe3035b1f6cb3174d713f31dbb03d'],
    ['D', 'fn:Save-Log', fnPS(DN, 'Save-Log'), '3ea208b857f31931f16a4fb7346c4dbd06ef607b181e77f5b160a1b4354fb7f3'],
    ['D', 'fn:Reset-AppToChats', fnPS(DN, 'Reset-AppToChats'), '263b18a8fbda3c320933ce9c54a6723f29b1addf8d7c5b8a419f5ec415f2eba0'],
    ['D', 'fn:Exit-Usage', fnPS(DN, 'Exit-Usage'), '712e2daab59aa497a139430b7e24f3e649f618828ac9d811fea1e2d8790cbcbc'],
    ['D', 'block:run-json-flags', blk(DN, '    $flg = [ordered]@{', "$doc['flags'] = $flg"), '5320a9406242208b4caca50fe7ec92c67b29270c3783ed1ee276975d0599ca94'],
    ['D', 'block:mem-pid-guard', blk(DN, 'if ($script:FlagsAsked -and -not (Test-Ordinal ([string]$f.AppPid)', "changed after the switch state was proven'\n            }"), 'e9ea0652002d55ebffa6e6dc9a6a9d54f13ecf6695b74c6fdfe16a82e9b2b7eb'],
    ['D', 'block:mem-stop-after', blk(DN, 'if ($script:FlagsStopAfter) { Stop-Flags', '$script:FlagsStopAfter }'), '8cd948ee0d062b73201aa244916fbd10107d182ff4aefa029a9015caafb7e2bf'],
    ['D', 'block:main-flags', blkBrace(DN, "if ($PSBoundParameters.ContainsKey('Flags'))"), 'cb6e4c4cc4e346d39c7587a42316a44f5bd569ee0db6e9ce21114339199b1a40'],
    ['P', 'fn:Get-FlagsStatus', fnPS(PN, 'Get-FlagsStatus'), 'c7cd620fd7110b59a47f861d4992256eb75032b8a0cbcba41fc59daf09d5d409'],
    ['P', 'fn:Read-FlagStates', fnPS(PN, 'Read-FlagStates'), '0201061d55c360ad908557c4f981dc1cd4136aae2e01d25df3d06a7ffd1499af'],
    ['P', 'block:withheld-pair', blk(PN, '$withheld = ', '$memEntries.Clear() }'), '6b3046104e3f357d27a6a4e41f3083c6b91f4ac2dea3e6b9e7b32caa4a8bb857'],
    ['P', 'block:problem-map', blk(PN, "if ($fs.Problem -eq 'differs') {\n        $result", '    # --- summary.csv', false), 'bd0ee8f937b1a56c79e981fea5b4754c2b55921558975bcef39c254f55daf3f1'],
  ];
  const fz = {};
  fz.matcher = mt === "{\n  $a = '}{' ; $b = \"`}\" + \"{\"; # } {\n  <# } #>\n  if ($x) { 1 }\n}";
  for (const [, key, body, want] of frozen) fz[key] = body !== null && sha(body) === want;
  // R4-A: the two scripts WHOLE. R4-B: no function / filter / workflow name is defined twice in a script (comment-stripped text,
  // case-insensitive, optional scope prefix).
  // re-based walktools (item 2): adb-walk.ps1 — the probe `sets` form of screens.chat / screens.viewer (Get-ProbeListGap, Get-ScreenGap,
  // Get-ScreenProbeSets, Test-ProbeSetPixels, Get-ProbeVerdict, Test-Probes, Test-Screen, the set notes, the calibrate lines, the load block);
  // the body keys above (the -Flags functions) did not move. 44ebb3b9ea1b… -> 161e786a9db5… (review round 1: 9502953e1b56… -> 161e786a9db5…; round 2: -> 074f7f0e65d1…)
  fz['file:adb-walk.ps1'] = sha(DN) === '074f7f0e65d1326f68e4aedacb75d4c459627c5fd6ed126c2495c261bbafa6e0';
  // re-based walktools (item 3): adb-walk-parse.ps1 — the first-page rule X-SeedFirstPage (I-3a), the per-page rows (L entries, Get-WordTok,
  // X-PageGate / X-PageTok / X-PagePush / X-Page, New-PageDefs, New-Def $Arg, the insertmode note, two legend lines). 4a80770bf20b… -> e502ac2b6003… (review round 1: 873d647b6c7c… -> that)
  fz['file:adb-walk-parse.ps1'] = sha(PN) === 'e502ac2b6003b4981e044aa9e01dfceb2f54d3f247d4d23ec2ebf9275c10b002';
  for (const [sn, txt] of [['adb-walk.ps1', D], ['adb-walk-parse.ps1', P]]) {
    const seen = new Map();
    for (const m of txt.matchAll(/(?:^|[^\w-])(?:function|filter|workflow)\s+(?:(?:global|script|local|private):)?([\w-]+)/gi)) { const k = m[1].toLowerCase(); seen.set(k, (seen.get(k) || 0) + 1); }
    fz['noDoubleNames:' + sn] = seen.size > 0 && [...seen.values()].every((n) => n === 1);
  }
  // R3-1: PowerShell runs the definition that is in scope LAST, so a frozen function must be defined exactly ONCE in its file
  // (any indent, any letter case, `function` / `filter`), and no alias / function: drive line may name it.
  const nameRe = (n) => n.replace(/[-.]/g, '\\$&');
  for (const [w, key] of frozen.map((r) => [r[0], r[1]])) {
    if (!key.startsWith('fn:')) continue;
    const name = key.slice(3), txt = w === 'D' ? D : P;
    const defs = txt.match(new RegExp('(?:^|[^\\w-])(?:function|filter|workflow)\\s+(?:(?:global|script|local|private):)?' + nameRe(name) + '(?![\\w-])', 'gi')) || [];
    fz['oneDefinition:' + name] = defs.length === 1;
    const named = txt.split('\n').filter((l) => new RegExp('(?<![\\w-])' + nameRe(name) + '(?![\\w-])', 'i').test(l));
    fz['noAlias:' + name] = !named.some((l) => /(?<![\w-])(set-alias|new-alias|sal|nal)(?![\w-])/i.test(l) || /function:|alias:/i.test(l));
  }
  ok(F(fz).length === 0,
    '★ perfb1toggle B: every function / block that carries a -Flags rule is frozen by the SHA-256 of its WHOLE text (comments and whitespace included: a comment edit also needs a re-base) — one key per body, a red key names the body that changed — failing: ' + JSON.stringify(F(fz)));

  /* ── SAFE ── */
  const pullRe = /\^\(shot\|android-walk\|cal\)-\[A-Za-z0-9-\]\{1,60\}\\\.\(png\|txt\)\\z/;
  const inputRules = [...allow.matchAll(/'\^input ([a-z]+)/g)].map((m) => m[1]);
  const sf = {
    noInputText: !/input\s+text/i.test(D) && !/input\s+text/i.test(P),
    inputKinds: inputRules.join(',') === 'tap,swipe,keyevent',
    noUninstall: !/\buninstall\b/.test(D + P) && !/pm clear|pm\s+clear/.test(D + P),
    pullTarget: pullRe.test(D) && /^(shot|android-walk|cal)-[A-Za-z0-9-]{1,60}\.(png|txt)$/.test('android-walk-flags-00.txt'),
    ascii: !/[^\x00-\x7F]/.test(DRV) && !/[^\x00-\x7F]/.test(PAR),
    noPs7: !/\?\?|\?\.|\s\?\s[^\n]*\s:\s|-Parallel|&&/.test(code(DRV).replace(/'[^']*'/g, "''")) && !/-Parallel/.test(P),
  };
  ok(F(sf).length === 0,
    '★ perfb1toggle B: no `input text` (allowed input kinds stay tap, swipe, keyevent), no uninstall / pm clear in either script; the flags log name passes the pull-target rule; both scripts are ASCII only and use no PowerShell 7-only syntax — failing: ' + JSON.stringify(F(sf)));
}
