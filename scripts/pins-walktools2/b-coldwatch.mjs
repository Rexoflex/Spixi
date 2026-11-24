/* ==== walktools2 · B — the cold start watch (item 2: the opt-in step coldstart-watch of scripts/device/adb-walk.ps1 and its parser rows in
 * adb-walk-parse.ps1; contract I-2 + the I-2 parser rows) and the sets form of screens.home in the script (item 3, contract I-3 script side).
 *
 * LIMITS (#1735, stated in the FIRST version). Pure node: CI has no PowerShell step, so every key is a SOURCE pin on the two scripts (whole-line
 * comments, block comments and blank lines dropped; a line is compared as its trimmed text; function bodies are cut by brace matching) plus the
 * BEHAVIOUR of what can run in JavaScript: the phone-side pattern and the parser's event regexes are cut out of the script text and run as
 * JavaScript regexes (ERE `[],]` -> `[\],]`, PowerShell `\z` -> `$`). A source pin does NOT prove that PowerShell runs the statements in this order,
 * that the phone's toybox grep cuts a line the way a JavaScript regex does, or that a row has the right count: that is the job of the BY-HAND
 * runner scripts/pins-walktools2/b-coldwatch-run.mjs (pwsh 7.4.6 + a fake adb + GNU grep). Nothing here ran on Windows PowerShell 5.1 or on a
 * phone. NOT caught: a change inside a helper the new functions call (Invoke-Shell, Invoke-Adb, Read-Stamp, Get-Pids, Test-AppFront, Get-LogRaw,
 * Convert-T0, Convert-LineStamp, New-Row) — the walk pins of other batches hold those; a line moved between two places with the same neighbours;
 * a redefinition of a name later in the file beyond what k9 counts.
 *   k1 allowlist   — the ONE new command shape: $script:WatchEventRe and $script:WatchEventsCmd are EXACT whole strings (held here), the command is
 *                    in PipedCmds exactly once (a whole-string match, never a regex), ShellAllow and the four checking functions are unchanged
 *                    (SHA-256 of the base 462ba3e4); in JavaScript the pattern lets through only times, pids, the priority letter, the six am_*
 *                    tags and killinfo, the pinned package, digits and , [ ] - (no message, no reason, no other package, no sub-process)
 *   k2 optIn       — coldstart-watch is the LAST entry of AllSteps and in OptInSteps; the DefaultSteps rule is unchanged (so it is never a
 *                    default); Invoke-Walk and Invoke-RepBody dispatch it; no home check before a rep ($false)
 *   k3 refusals    — with -Calibrate and with -Flags the step is a usage error (Exit-Usage) placed BEFORE the map is read (before any adb
 *                    command); -Repeats stays 1..50 (the phone block runs -Repeats 50)
 *   k4 noInput     — the step sends no input, no screencap, no BACK (no input / screencap / keyevent / Save-Shot / Invoke-ShotCheck /
 *                    Invoke-Back / Assert-AppFront in the three new functions); the order of a rep: force-stop, idle, logcat -c (once), the stamp +
 *                    am start -W, pidof, the fixed wait, the stamp + pidof, Test-AppFront, the evidence; after the start nothing throws
 *   k5 evidence    — a start that is not proven saves (1) the events pull, (2) the app log by Get-LogPullCmd of the validated pid, each pulled
 *                    to its fixed name and rm -f; a failed pull = the rep is an error; grep's exit 1 is not a failure
 *   k6 parserRows  — the step table entry; the five row names; an event counts only when its own time is in [t0, stamp2 + 60 s] and its pid is
 *                    the pid of the start (no pid: the package); an am_proc_start of the start is required; a rep that cannot be read makes
 *                    EVERY row "no data"; the facts line is built from numbers and fixed words (Get-WatchRep never sees a raw line; the app-log
 *                    reader keeps a count, a stamp and a shape word); the parser's regexes accept exactly what the phone cut lets through
 *   k7 homeSets    — screens.home may hold sets (Get-ScreenGap and the load-time rule: home, chat, viewer); the calibrate adds one home note only
 *                    when home holds sets; the old-form path (Get-ProbeListGap, Get-ScreenProbeSets, Test-ProbeSetPixels, Get-ProbeVerdict,
 *                    Test-Probes, Test-Screen) is byte-identical to the base by SHA-256
 *   k8 runJson     — the fixed wait is an integer constant written to run.json as coldstartWatch.waitSec only in a run that asked for the step;
 *                    the rep's watch object is copied by Complete-Rep only when the rep has one; the time estimate counts the step
 *   k9 definitions — each new function is defined exactly once in its script (names ignore case)
 * #46 round 1 (fixer-b, 2026-11-23): k4, k5, k6, k9 changed; k10–k13 new.
 *   k10 pidofRead  — F-1 (driver): a pidof answer counts only through Test-WatchPidof (no timeout, no stderr text, exit 0 with pids of
 *                    digits, exit 1 with no output); the first pidof is read ONCE more, then the rep is an error; the pidof after the
 *                    wait is checked the same way; pidInAfter = P among the pids after the wait (F-2)
 *   k11 finally    — F-4: everything after the start is in ONE try / finally; the finally saves the evidence once (the $saved flag is set
 *                    before each call) unless proven, its own error a note; Write-WalkLog, Invoke-Adb, Invoke-Shell, Invoke-Native,
 *                    Invoke-Step are byte-identical to the base (no old behaviour changed: the guard is inside the step)
 *   k12 classRules — F-1 / F-2 / F-3 (parser): with no pid read the pids of the package's am_proc_start in the window are the start's pids
 *                    (their am_* events and killinfo count); an end needs proof (P not among the pids after the wait, or an am_proc_died
 *                    / am_kill / killinfo of a pid of the start); an end event overrides "alive"; no pid + no end event, and P among two
 *                    pids in front, = no data; the watch facts must agree (samePid / pidInAfter / pidsAfter)
 *   k13 factsLines — F-6: a facts line only for a start that run.json does not mark proven; a no-data line = "rep N: no data (<word>)"
 *                    where every word is a fixed literal (or a fixed status / file state)
 *   LIMITS of round 1 (F-5, recorded): every key here is a SOURCE pin; the parser's classes and the driver's try / finally RUN only in the
 *   by-hand runner (fake adb on pwsh 7.4.6, Ctrl+C = SIGINT on Linux); nothing ran on Windows PowerShell 5.1 or a phone.
 * Deliberate breaks (#802): the builder's report, one one-token mutation per key in a full copy of the tree. */
import { createHash } from 'node:crypto';

const sha = (x) => createHash('sha256').update(x).digest('hex');
const code = (t) => t.replace(/<#[\s\S]*?#>/g, '').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
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
const lines = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean);
const countOf = (t, s) => t.split(s).length - 1;
const defs = (t, n) => (t.match(new RegExp('^function ' + n.replace(/-/g, '\\-') + '\\b', 'gmi')) || []).length;

const PKG = 'com.ixilabs.spixi.dev';
export const EXPECT_RE = "^[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3} +[0-9]+ +[0-9]+ [A-Z] ((am_proc_start|am_proc_died|am_kill|am_crash|am_anr|am_wtf) *: \\[[0-9]+(,[0-9]+)*,com\\.ixilabs\\.spixi\\.dev(,-?[0-9]+)*[],]|killinfo *: \\[-?[0-9]+(,-?[0-9]+)*)";
// The two statements as they stand in the script (PowerShell single-quoted text: '' is one quote).
const RE_LINE = "$script:WatchEventRe = '" + EXPECT_RE + "'";
const CMD_LINE = "$script:WatchEventsCmd = 'logcat -d -b events -v threadtime | grep -o -E ''' + $script:WatchEventRe + ''' > /data/local/tmp/adbwalk-log.txt'";
const TAGS = ['am_proc_start', 'am_proc_died', 'am_kill', 'am_crash', 'am_anr', 'am_wtf'];
// SHA-256 of the statements (trimmed, non-empty lines of the brace-matched body, comments dropped) at the base 462ba3e4.
export const BASE_SHA = {
  'Test-ShellAllowed': '1645be543b1068a00d68c9ad40ca27a9ea225a66684e84b687764f21f22f58f5',
  'Assert-AdbCommand': '6907f808b2b25b6d46feb2973ad67a10649c48b724df88a17ebb69cf548e3ca6',
  'Get-LogPullCmd': '11401bdd230fe9d0245955048f6d99162e4a75fb17b2646b4f8d89fb7dcc56e1',
  'Test-LocalPullTarget': '5e7530be71bd6891ea4d8af5d4b29c9db88a428e96e7b5bb193c411053b07668',
  'Get-ProbeListGap': 'e5db3016960b5301a4b7345af5d6f7db400cee84a8d31a0f8565b78a38da0f91',
  'Get-ScreenProbeSets': '305364d6d5b368fc4ee2670bcfac7883a6a2e2491dde083ac7e67de2ff9b6a50',
  'Test-ProbeSetPixels': '249ee6fe150956b3b21b3ddc49e042a960e8c30a8a852181310ce6b6879e2787',
  'Get-ProbeVerdict': '95bf9fce8024d72dbec7a1a53a349dcdf3f8c3ed94599cf9d9c15b486206a0f6',
  'Test-Probes': 'dd97b4235cf4d52c7c22ab5e94c6a94607a02c9e43c8ea354809970a4e89b479',
  'Test-Screen': 'ba9060834ff25eb664f50c417e4f1223054601412f2be4ff0af604c3be6b05c1',
  // #46 r1 F-4: the helpers the evidence path runs through, unchanged (the IO guard is inside the step, not in Write-WalkLog).
  'Write-WalkLog': '1352485527d7abe50925b89bc8e28655afc6ac53b137ab53219a979db73bade7',
  'Invoke-Adb': '26ebdb1571a56ae72fc9f41d5734289e58133606343ba7e2d3dcd1c0a005cc6b',
  'Invoke-Shell': '230317a31a80074614ca379d9008dfe2fd7a69a50c11fcab2d2399d535f8ab68',
  'Invoke-Native': '8035c3abf03d78f481c73f2f668dd784385f9500c08e0b5f31cd76528d96ce79',
  'Invoke-Step': 'ab3737adde301dd7386aeb0aa101a6608c825e824239e693e74f6652ad369fe7',
};
export const BASE_SHELLALLOW_SHA = '53c4fb4d544ce2eac75e82193b0f9d11dcb19f07c344631a5771cebc9777ee7b';   // the $script:ShellAllow = @( ... ) block of Initialize-Allowlist at the base
export const NEW_WALK_FNS = ['Save-WatchPull', 'Save-WatchEvidence', 'Test-WatchPidof', 'Invoke-ColdWatchRep'];
export const NEW_PARSE_FNS = ['Get-WatchFileName', 'Get-WatchNumList', 'Read-WatchEvents', 'Get-WatchShape', 'Read-WatchAppLog', 'Format-WatchSec', 'Get-WatchRep', 'Get-WatchRows'];

// the phone-side cut in JavaScript: ERE -> JS (a `]` first in a bracket is a literal in ERE, an empty class in JS)
export const toJs = (re) => new RegExp(re.replace('[],]', '[\\],]'));
const psRx = (re) => new RegExp(re.replace(/\\z/g, '$'));

export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/\r\n/g, '\n');
  const DRV = raw('scripts/device/adb-walk.ps1');
  const PRS = raw('scripts/device/adb-walk-parse.ps1');
  const D = code(DRV), P = code(PRS);
  const fn = (n) => fnPS(D, n), pfn = (n) => fnPS(P, n);
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const has = (t, s) => t.includes(s);
  const shaFn = (n) => sha(lines(fn(n)).join('\n'));
  const DL = lines(D);

  /* ── k1 · the one new command shape ── */
  const allow = fn('Initialize-Allowlist');
  const piped = (() => { const i = allow.indexOf('$script:PipedCmds = @('); return i < 0 ? '' : allow.slice(i, allow.indexOf('$pe = ', i)); })();
  const shellAllow = (() => { const i = allow.indexOf('$script:ShellAllow = @('); return i < 0 ? '' : allow.slice(i); })();
  const reOfScript = (() => { const l = DL.find((x) => x.startsWith('$script:WatchEventRe = ')); return l ? l.slice("$script:WatchEventRe = '".length, -1).replace(/''/g, "'") : ''; })();
  const jsRe = reOfScript ? toJs(reOfScript) : /(?!)/;
  const cut = (line) => { const m = jsRe.exec(line); return m ? m[0] : null; };
  const L = (tag, body) => '12-01 10:01:03.400  1500  1600 I ' + tag.padEnd(8) + ': ' + body;
  const hostile = [
    [L('am_crash', '[0,4302,' + PKG + ',948485700,java.lang.IllegalStateException,the secret message,Foo.java,12,0]'), '12-01 10:01:03.400  1500  1600 I am_crash: [0,4302,' + PKG + ',948485700,'],
    [L('am_kill', '[0,4302,' + PKG + ',0,stop ' + PKG + ' due to from pid 1234]'), '12-01 10:01:03.400  1500  1600 I am_kill : [0,4302,' + PKG + ',0,'],
    [L('am_anr', '[0,4302,' + PKG + ',1,Input dispatching timed out]'), '12-01 10:01:03.400  1500  1600 I am_anr  : [0,4302,' + PKG + ',1,'],
    [L('am_wtf', '[0,4302,' + PKG + ',1,Tag,the message]'), '12-01 10:01:03.400  1500  1600 I am_wtf  : [0,4302,' + PKG + ',1,'],
    [L('am_proc_start', '[0,4302,10345,' + PKG + ',pre-top-activity,{' + PKG + '/x.MainActivity}]'), '12-01 10:01:03.400  1500  1600 I am_proc_start: [0,4302,10345,' + PKG + ','],
    [L('am_proc_died', '[0,4302,' + PKG + ',0,2,5]'), '12-01 10:01:03.400  1500  1600 I am_proc_died: [0,4302,' + PKG + ',0,2,5]'],
    [L('killinfo', '[4302,10345,0,0,123456,2,7000]'), '12-01 10:01:03.400  1500  1600 I killinfo: [4302,10345,0,0,123456,2,7000'],
    [L('am_kill', '[0,4400,com.ixilabs.spixi,0,stop]'), null],
    [L('am_kill', '[0,4401,' + PKG + ':remote,0,empty]'), null],
    [L('am_kill', '[0,4402,' + PKG + '.evil,0,empty]'), null],
    [L('am_kill', '[0,4403,com.other.app,0,stop]'), null],
    [L('am_focused_activity', '[0,' + PKG + '/x,reason]'), null],
    ['12-01 10:01:03.400  4302  4320 I DOTNET  : 12-01 10:01:03.4000|info|1: [P1] boot hold ms=1', null],
    [L('killinfo', '[4302,x,secret]'), '12-01 10:01:03.400  1500  1600 I killinfo: [4302'],
  ];
  const cutBad = hostile.filter(([l, want]) => cut(l) !== want).map(([l]) => l.slice(0, 60));
  const strip = (s) => s.replace(/\b(am_proc_start|am_proc_died|am_kill|am_crash|am_anr|am_wtf|killinfo)\b/g, '').replace(new RegExp(PKG.replace(/\./g, '\\.'), 'g'), '');
  const k1 = {
    reExact: DL.filter((x) => x === RE_LINE).length === 1 && reOfScript === EXPECT_RE,
    cmdExact: DL.filter((x) => x === CMD_LINE).length === 1,
    oneAssignEach: countOf(D, '$script:WatchEventRe =') === 1 && countOf(D, '$script:WatchEventsCmd =') === 1,
    inPipedOnce: countOf(piped, '$script:WatchEventsCmd,') === 1,
    usedOnly: countOf(fn('Save-WatchEvidence'), '$script:WatchEventsCmd') === 1 && countOf(D, '$script:WatchEventsCmd') === 3,   // the assignment, PipedCmds, Save-WatchEvidence
    shellSafe: !/['$`]/.test(EXPECT_RE) && EXPECT_RE.includes(PKG.replace(/\./g, '\\.')),
    shellAllowFrozen: sha(lines(shellAllow).join('\n')) === BASE_SHELLALLOW_SHA,
    checkersFrozen: ['Test-ShellAllowed', 'Assert-AdbCommand', 'Get-LogPullCmd', 'Test-LocalPullTarget'].every((n) => fn(n).length > 0 && shaFn(n) === BASE_SHA[n]),
    cutJs: cutBad.length === 0,
    alphabetOnly: hostile.map(([l]) => cut(l)).filter(Boolean).every((s) => /^[0-9 :.,\[\]\-]*[A-Z][0-9 :.,\[\]\-]*$/.test(strip(s))),
  };
  ok(F(k1).length === 0,
    '★ walktools2 B (k1 allowlist): the ONE new command shape is the exact whole string logcat -d -b events -v threadtime | grep -o -E \'<the held pattern>\' > /data/local/tmp/adbwalk-log.txt, in PipedCmds once and used only by Save-WatchEvidence; the pattern holds no quote, $ or backtick and names the pinned package; ShellAllow, Test-ShellAllowed, Assert-AdbCommand, Get-LogPullCmd and Test-LocalPullTarget are byte-identical to the base; run in JavaScript the pattern lets through only times, pids, one priority letter, the six am_* tags / killinfo, the pinned package and numeric fields (a crash message, a kill reason, another package, a sub-process, a DOTNET line do not pass) — failing: ' + JSON.stringify(F(k1)) + ' ' + JSON.stringify(cutBad));

  /* ── k2 · opt-in ── */
  const listOf = (prefix) => { const i = D.indexOf(prefix); if (i < 0) return null; const e = D.indexOf(')', i); return [...D.slice(i, e).matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]); };
  const all = listOf('$script:AllSteps = @(') || [], optIn = listOf('$script:OptInSteps = @(') || [];
  const k2 = {
    lastOfAll: all[all.length - 1] === 'coldstart-watch' && all.filter((s) => s === 'coldstart-watch').length === 1,
    inOptIn: optIn[optIn.length - 1] === 'coldstart-watch',
    defaultRule: DL.filter((l) => l.startsWith('$script:DefaultSteps =')).join('|') === '$script:DefaultSteps = @($script:AllSteps | Where-Object { $script:OptInSteps -cnotcontains $_ })',
    walkDispatch: has(fn('Invoke-Walk'), "elseif ($s -eq 'coldstart-watch') { Invoke-Step 'coldstart-watch' $script:RepeatsN $false }"),
    repDispatch: has(fn('Invoke-RepBody'), "elseif ($s -eq 'coldstart-watch') { Invoke-ColdWatchRep $Rec }"),
    noGap: !has(fn('Get-StepGap'), 'coldstart-watch'),
  };
  ok(F(k2).length === 0,
    '★ walktools2 B (k2 optIn): coldstart-watch is the LAST entry of AllSteps and of OptInSteps, the DefaultSteps rule (AllSteps minus OptInSteps) is unchanged, so the step runs only when named in -Steps; Invoke-Walk runs it with Invoke-Step and no home check ($false), Invoke-RepBody calls Invoke-ColdWatchRep; it needs no map key (no Get-StepGap entry) — failing: ' + JSON.stringify(F(k2)));

  /* ── k3 · the refusals before any adb command ── */
  const iBlock = D.indexOf("if ($want -contains 'coldstart-watch') {");
  const block = iBlock < 0 ? '' : psMatch(D, iBlock) || '';
  const k3 = {
    calibrate: has(block, "if ($Calibrate) { Exit-Usage 'the step coldstart-watch cannot be used with -Calibrate' }"),
    flags: has(block, "if ($script:FlagsAsked) { Exit-Usage 'the step coldstart-watch cannot be combined with -Flags (every rep restarts the app: the new process has no proven switch state)' }"),
    afterStepsAndFlags: iBlock > D.indexOf('if ($KillRenderer) { $script:StepsReq =') && iBlock > D.indexOf("$script:FlagsAsked = $flagsText"),
    beforeMapAndAdb: iBlock > 0 && iBlock < D.indexOf("$cfgPath = Join-Path $PSScriptRoot 'a52s.json'") && iBlock < D.indexOf('    Invoke-Preflight\n'),
    repeats50: DL.filter((l) => l === "if ($Repeats -lt 1 -or $Repeats -gt 50) { Exit-Usage '-Repeats must be 1..50' }").length === 1,
    blockSendsNothing: block.length > 0 && !/Invoke-(Shell|Adb)/.test(block),
  };
  ok(F(k3).length === 0,
    '★ walktools2 B (k3 refusals): -Steps coldstart-watch with -Calibrate and with -Flags is a usage error (Exit-Usage), checked after -Steps and -Flags are read and BEFORE a52s.json is read, so before any adb command; -Repeats stays 1..50 (the phone block runs -Repeats 50) — failing: ' + JSON.stringify(F(k3)));

  /* ── k4 · no input; the order of a rep ── */
  const rep = fn('Invoke-ColdWatchRep'), ev = fn('Save-WatchEvidence'), pull = fn('Save-WatchPull');
  const three = rep + '\n' + ev + '\n' + pull + '\n' + fn('Test-WatchPidof');
  const at = (s) => rep.indexOf(s);
  const order = [
    "[void](Invoke-ShellReq ('am force-stop ' + $script:Pkg))",
    "Wait-Sec $script:Tm['coldStartIdleSec'] 'coldStartIdleSec'",
    "[void](Invoke-ShellReq 'logcat -c')",
    "$r = Invoke-Shell ($script:StampCmd + '; am start -W -n ' + $script:Comp) 60",
    "$p = Invoke-Shell ('pidof ' + $script:Pkg)",
    "Wait-Sec $script:WatchWaitSec 'coldstart-watch fixed wait'",
    "$r2 = Invoke-Shell ($script:StampCmd + '; pidof ' + $script:Pkg)",
    "$w['front'] = [bool](Test-AppFront)",
    "$w['proven'] = [bool]($w['samePid'] -and $w['front'])",
    'Save-WatchEvidence $Rec',
  ].map(at);
  const afterStart = rep.slice(at("$r = Invoke-Shell ($script:StampCmd + '; am start -W -n ' + $script:Comp) 60"));
  const k4 = {
    noInput: rep.length > 0 && !/input |screencap|keyevent|Save-Shot|Invoke-ShotCheck|Invoke-Back|Assert-AppFront|Invoke-CalInput|Get-TapText|Get-SwipeText/.test(three),
    order: order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])),
    oneClear: countOf(rep, "'logcat -c'") === 1 && countOf(three, 'logcat -c') === 1,
    noThrowAfterStart: !/Invoke-ShellReq|throw|Set-RepStamp/.test(afterStart),
    proofRule: has(rep, "$w['samePid'] = [bool]($w.Contains('pid') -and $after.Count -eq 1 -and (Test-Ordinal ([string]$after[0]) ([string]$w['pid'])))") && has(rep, 'if ($ids.Count -eq 1) { $w[\'pid\'] = [int]$ids[0] }'),
    evidenceOnlyWhenNotProven: has(rep, "if (-not $w['proven']) {") && countOf(rep, 'Save-WatchEvidence') === 2 && rep.indexOf('Save-WatchEvidence $Rec') > rep.indexOf("if (-not $w['proven']) {") && has(rep, "if ((-not $saved) -and (-not $w['proven'])) {"),
  };
  ok(F(k4).length === 0,
    '★ walktools2 B (k4 noInput): the three new driver functions send no input, no screencap, no BACK and no key; a rep is force-stop, coldStartIdleSec, ONE logcat -c, the stamp + am start -W, pidof at once (one pid = P), the FIXED wait, the stamp + pidof, Test-AppFront, proven = one pid after the wait AND it is P AND in front; the evidence is saved only when not proven; after the start nothing throws (no Invoke-ShellReq, throw or Set-RepStamp), so the evidence is never skipped by an error — failing: ' + JSON.stringify(F(k4)));

  /* ── k5 · the evidence ── */
  const k5 = {
    names: has(ev, "$evName = 'android-walk-coldstart-watch-' + $nn + '-events.txt'") && has(ev, "$lgName = 'android-walk-coldstart-watch-' + $nn + '.txt'"),
    eventsFirst: ev.indexOf('Save-WatchPull $script:WatchEventsCmd $evName') > 0 && ev.indexOf('Save-WatchPull $script:WatchEventsCmd $evName') < ev.indexOf("Save-WatchPull (Get-LogPullCmd ([string]$w['pid'])) $lgName"),
    pidOnlyWhenRead: has(ev, "if ($w.Contains('pid')) {") && has(ev, "$w['logPull'] = 'nopid'"),
    failIsError: has(ev, "if ($w['eventsPull'] -ne 'ok' -or $w['logPull'] -eq 'failed') { $Rec.status = 'error' }"),
    pullShape: has(pull, '$w = Invoke-Shell $Cmd') && has(pull, 'if ($w.TimedOut -or ($w.ExitCode -ne 0 -and -not ($w.ExitCode -eq 1 -and [string]::IsNullOrWhiteSpace([string]$w.StdErr)))) {') && !has(pull, '$w.ExitCode -ne 1') && pull.indexOf("$r = Invoke-Adb -AdbArgs @('pull', $script:PhoneLog, $local) -TimeoutSec 120") < pull.lastIndexOf("[void](Invoke-Shell ('rm -f ' + $script:PhoneLog))") && countOf(pull, "rm -f ' + $script:PhoneLog") === 2,
    neverOverwrites: has(pull, "if (Test-Path -LiteralPath $local) { return ($LocalName + ' exists already') }"),
  };
  ok(F(k5).length === 0,
    '★ walktools2 B (k5 evidence): a start that is not proven saves (1) the events pull to android-walk-coldstart-watch-NN-events.txt, THEN (2) the app log by Get-LogPullCmd of the validated pid to android-walk-coldstart-watch-NN.txt (no pid read: logPull nopid, no pull); each is written on the phone, pulled, then rm -f (also after a failed write); grep exit 1 (no line) is no failure only with an empty stderr (F-7); an existing local file is never overwritten; a failed pull makes the rep an error — failing: ' + JSON.stringify(F(k5)));

  /* ── k6 · the parser rows ── */
  const wr = pfn('Get-WatchRep'), rows = pfn('Get-WatchRows'), rev = pfn('Read-WatchEvents'), rapp = pfn('Read-WatchAppLog');
  const amRe = (() => { const l = lines(P).find((x) => x.startsWith('$script:RxWatchAm = New-Rx ')); return l ? l.slice("$script:RxWatchAm = New-Rx '".length, -1) : ''; })();
  const killRe = (() => { const l = lines(P).find((x) => x.startsWith('$script:RxWatchKill = New-Rx ')); return l ? l.slice("$script:RxWatchKill = New-Rx '".length, -1) : ''; })();
  const parserTakes = hostile.map(([l]) => cut(l)).filter(Boolean).every((s) => (amRe && psRx(amRe).test(s)) || (killRe && psRx(killRe).test(s)));
  const tagsInParser = (/\((am_proc_start\|[^)]*)\)/.exec(amRe) || [])[1] || '';
  const k6 = {
    table: lines(P).includes("'coldstart-watch' = @{ Kind = 'coldwatch' }"),
    main: has(pfn('Invoke-Main'), "if ($def.Kind -eq 'coldwatch') {") && has(pfn('Invoke-Main'), '$wr = Get-WatchRows $m $reps $t0s $t0Why $repeats $runPath'),
    fiveRows: ["@{ N = 'starts'; C = 'all' }", "@{ N = $frontName; C = 'front' }", "@{ N = 'ends with no kill'; C = 'nokill' }", "@{ N = 'ends with a kill'; C = 'kill' }", "@{ N = 'not in front, process alive'; C = 'alive' }"].every((s) => has(rows, s)) && has(rows, "$frontName = 'in front after ' + ([long]$waitRaw).ToString($script:Inv) + ' s'"),
    timeWindow: has(wr, '$upper = $t2.AddSeconds($script:WatchAfterSec)') && has(wr, 'if (($dt -lt $T0) -or ($dt -gt $upper)) { continue }') && lines(P).includes('$script:WatchAfterSec = 60'),
    pidFilter: has(wr, 'if ($null -ne $pidV) { $ours.Add($pidV) }') && has(wr, 'foreach ($x in $inWin) { if ($ours.Contains([long]$x.Pid)) { $mine.Add($x) } }'),
    procStartRequired: has(wr, "if (-not $started) { $o.Why = $label + ': no am_proc_start of this start in ' + $expEv; $o.Word = 'no am_proc_start of the start'; return $o }"),
    killRule: has(wr, "if ((Test-Same $x.Tag 'am_kill') -or (Test-Same $x.Tag 'killinfo')) { $kill = $true }"),
    anyRepNoData: has(rows, '$rows.Add((New-Row $script:WatchStep $sp.N \'\' $script:NoData $script:NoData $script:NoData \'count\' $note \'run.json\' \'nodata\'))') && has(rows, "if ($res.Class -eq '') { $why.Add($res.Why);"),
    noRawLine: !/\$line|\.Msg\b/.test(wr + rows) && !/Msg\s*=/.test(rapp) && has(rapp, '$shape = Get-WatchShape ($line.Substring($m.Index + $m.Length))') && has(pfn('Invoke-Main'), "foreach ($wf in $watchFacts) { [void]$md.Append('- ' + (Format-MdCell ([string]$wf)) + \"`n\") }"),
    shapeWordsFixed: (pfn('Get-WatchShape').match(/return '([^']*)'/g) || []).length === 9,
    parserTakesThePhoneCut: parserTakes,
    sameTags: tagsInParser === TAGS.join('|') && amRe.includes(PKG.replace(/\./g, '\\.')),
  };
  ok(F(k6).length === 0,
    '★ walktools2 B (k6 parserRows): the step table entry and the Invoke-Main branch; the five COUNT rows starts / in front after <n> s / ends with no kill / ends with a kill / not in front, process alive; an event counts only when its own time is in [t0, stamp2 + 60 s] and its pid is the pid of the start (no pid: a pid of an am_proc_start of the package in the window); an am_proc_start of the start is required; a kill = am_kill or killinfo; any rep that cannot be read makes every row "no data"; Get-WatchRep and Get-WatchRows never touch a raw line, the app-log reader keeps a count, a stamp and a fixed shape word; the parser regexes take every line the phone cut lets through and name the same six tags and the package — failing: ' + JSON.stringify(F(k6)));

  /* ── k7 · screens.home in the sets form ── */
  const gap = fn('Get-ScreenGap'), cal = fn('Invoke-Calibrate');
  const homeNote = (/\$cal\.notes\.Add\('(home sets: [^']*)'\)/.exec(cal) || [])[1] || '';
  const k7 = {
    gapRule: has(gap, "if (@('home', 'chat', 'viewer') -cnotcontains $Name) { return ('screens.' + $Name + ' may not use sets (only home, chat and viewer)') }") && !has(gap, "@('chat', 'viewer')"),
    loadRule: has(D, "if ((Test-HasField (Get-Field $scrAll $scrKey) 'sets') -and (@('home', 'chat', 'viewer') -cnotcontains $scrKey)) { Exit-Usage ('a52s.json screens.' + $scrKey + ' has sets: only screens.home, screens.chat and screens.viewer may use sets') }"),
    limitLoopHasHome: has(D, "foreach ($scrName in @('home', 'chat', 'chatinfo', 'viewer', 'downloads')) {"),
    homeNoteOnlyWithSets: has(cal, "if (Test-HasField (Get-Field (Get-Field $script:Cfg 'screens') 'home') 'sets') {") && homeNote.length > 0 && homeNote.length <= 120 && /^[A-Za-z0-9 _.,:=\/()%+-]+$/.test(homeNote) && /ok \(set light\)/.test(homeNote),
    chatViewerNotesKept: has(cal, "if ((Test-HasField (Get-Field (Get-Field $script:Cfg 'screens') 'chat') 'sets') -or (Test-HasField (Get-Field (Get-Field $script:Cfg 'screens') 'viewer') 'sets')) {"),
    oldFormFrozen: ['Get-ProbeListGap', 'Get-ScreenProbeSets', 'Test-ProbeSetPixels', 'Get-ProbeVerdict', 'Test-Probes', 'Test-Screen'].every((n) => fn(n).length > 0 && shaFn(n) === BASE_SHA[n]),
    header: has(DRV.replace(/\s+/g, ' '), 'Batch walktools2 (item 3): screens.home may take the sets form too'),
  };
  ok(F(k7).length === 0,
    '★ walktools2 B (k7 homeSets): screens.home may hold the sets form (Get-ScreenGap and the load-time rule name home, chat and viewer; every other screen with sets is still a gap / a usage error; the 16-probe limit loop covers home), the calibrate adds ONE home note only when home holds sets (inside the 120-character alphabet of Get-SafeNote) and keeps the chat / viewer notes; the old-form path Get-ProbeListGap / Get-ScreenProbeSets / Test-ProbeSetPixels / Get-ProbeVerdict / Test-Probes / Test-Screen is byte-identical to the base (SHA-256), so a home in the old form keeps its behaviour and its notes — failing: ' + JSON.stringify(F(k7)));

  /* ── k8 · run.json ── */
  const k8 = {
    waitConstant: DL.filter((l) => /^\$script:WatchWaitSec = /.test(l)).join('|') === '$script:WatchWaitSec = 10',
    runJson: has(fn('Save-RunJson'), "if ($script:StepsReq -contains 'coldstart-watch') { $doc['coldstartWatch'] = [ordered]@{ waitSec = [int]$script:WatchWaitSec } }"),
    repCopy: has(fn('Complete-Rep'), "if ($Rec.ContainsKey('watch')) { $out['watch'] = $Rec['watch'] }"),
    estimate: has(fn('Get-EstimateSec'), "elseif ($s -eq 'coldstart-watch') { $sum += $n * ($t['coldStartIdleSec'] + $script:WatchWaitSec + 8) }"),
    parserReadsWait: has(rows, "$waitRaw = Get-Num (Get-Prop (Get-Prop $Manifest 'coldstartWatch') 'waitSec')"),
  };
  ok(F(k8).length === 0,
    '★ walktools2 B (k8 runJson): the fixed wait is ONE integer constant ($script:WatchWaitSec = 10), written to run.json as coldstartWatch.waitSec only when the step was asked (an old run.json is unchanged) and read by the parser for the row name; Complete-Rep copies the watch object only for a rep that has one; Get-EstimateSec counts the step — failing: ' + JSON.stringify(F(k8)));

  /* ── k9 · definitions ── */
  const k9 = Object.fromEntries(NEW_WALK_FNS.map((n) => ['walk ' + n, defs(D, n) === 1]).concat(NEW_PARSE_FNS.map((n) => ['parse ' + n, defs(P, n) === 1])));
  const k9ok = F(k9).length === 0;
  ok(k9ok,
    '★ walktools2 B (k9 definitions): Save-WatchPull, Save-WatchEvidence, Invoke-ColdWatchRep (adb-walk.ps1) and Get-WatchFileName, Get-WatchNumList, Read-WatchEvents, Get-WatchShape, Read-WatchAppLog, Format-WatchSec, Get-WatchRep, Get-WatchRows (adb-walk-parse.ps1) are each defined exactly ONCE (names ignore case) — failing: ' + JSON.stringify(F(k9)));

  /* ── k10 · F-1: a pidof answer is read before it counts ── */
  const tp = fn('Test-WatchPidof');
  const tpL = lines(tp);
  const pidofCalls = countOf(rep, "Invoke-Shell ('pidof ' + $script:Pkg)");
  const k10 = {
    reader: tpL.includes('if ($R.TimedOut -or -not [string]::IsNullOrWhiteSpace([string]$R.StdErr)) { return $false }') && tpL.includes("if ($R.ExitCode -eq 1) { return ($t -eq '') }") && tpL.includes("if ($R.ExitCode -eq 0) { return ($t -cmatch '^[0-9]{1,9}([ \\t]+[0-9]{1,9})*\\z') }") && tpL[tpL.length - 2] === 'return $false',
    stampSkipped: tpL.includes('if ($Stamped) {') && tpL.includes('$i = $t.IndexOf([char]10)') && tpL.includes('if ($i -lt 0) { $t = \'\' } else { $t = Get-Clean $t.Substring($i + 1) }'),
    retryOnce: pidofCalls === 2 && /\$p = Invoke-Shell \('pidof ' \+ \$script:Pkg\)\n\s*if \(-not \(Test-WatchPidof \$p \$false\)\) \{\n[^\n]*Add-Note[^\n]*\n\s*\$p = Invoke-Shell \('pidof ' \+ \$script:Pkg\)\n\s*\}\n\s*\$pOk = Test-WatchPidof \$p \$false\n\s*if \(-not \$pOk\) \{ Add-Note [^\n]*\$bad = \$true \}/.test(rep),
    idsOnlyWhenRead: has(rep, 'if ($pOk) { $ids = @(Get-Pids $p.StdOut) }') && countOf(rep, 'Get-Pids $p.StdOut') === 1,
    afterRead: has(rep, 'if (Test-WatchPidof $r2 $true) { $after = @(Get-Pids $r2.StdOut) }') && /else \{ Add-Note \$Rec \('pidof after the wait failed[^\n]*\$bad = \$true \}/.test(rep) && countOf(rep, 'Get-Pids $r2.StdOut') === 1,
    pidInAfter: has(rep, "$w['pidInAfter'] = [bool]($w.Contains('pid') -and (@($after) -ccontains ([string]$w['pid'])))") && rep.indexOf("$w['pidInAfter']") < rep.indexOf("$w['front'] = [bool](Test-AppFront)"),
  };
  ok(F(k10).length === 0,
    '★ walktools2 B (k10 pidofRead, #46 r1 F-1 / F-2): a pidof answer counts only through Test-WatchPidof (no timeout, no stderr text, exit 0 with pids of digits only, exit 1 with no output, any other exit = not readable; the stamp line of stamp2 is skipped); the pidof right after the start is read ONCE more when it cannot be read, then the rep is an error and no pid is taken from it; the pidof after the wait is read the same way (else an error); pidInAfter = the pid of the start is among the pids after the wait, set before the focus check — failing: ' + JSON.stringify(F(k10)));

  /* ── k11 · F-4: the evidence survives an error after the start ── */
  const iTry = rep.indexOf('    try {\n'), iFin = rep.indexOf('    } finally {\n');
  const finBody = iFin < 0 ? '' : psMatch(rep, iFin + 6) || '';
  const k11 = {
    oneTry: countOf(rep, '    try {\n') === 1 && countOf(rep, '    } finally {\n') === 1,
    tryAfterClearBeforeStart: iTry > rep.indexOf("[void](Invoke-ShellReq 'logcat -c')") && iTry < rep.indexOf("$r = Invoke-Shell ($script:StampCmd + '; am start -W -n ' + $script:Comp) 60") && iFin > rep.indexOf('Save-WatchEvidence $Rec'),
    flagBeforeCall: /\$saved = \$true\n\s*Save-WatchEvidence \$Rec\n/.test(rep) && has(rep, '$saved = $false'),
    finallyOnce: has(finBody, "if ((-not $saved) -and (-not $w['proven'])) {") && /\$saved = \$true\n\s*\$Rec\.status = 'error'\n\s*try \{ Save-WatchEvidence \$Rec \} catch \{ Add-Note \$Rec \('evidence after an error: ' \+ \$_\.Exception\.GetType\(\)\.Name\) \}/.test(finBody),
    finallySendsNothingElse: !/Invoke-(Shell|Adb)|throw|Wait-/.test(finBody),
    helpersFrozen: ['Write-WalkLog', 'Invoke-Adb', 'Invoke-Shell', 'Invoke-Native', 'Invoke-Step'].every((n) => fn(n).length > 0 && shaFn(n) === BASE_SHA[n]),
  };
  ok(F(k11).length === 0,
    '★ walktools2 B (k11 finally, #46 r1 F-4): everything after the start (from am start -W to the evidence) sits in ONE try / finally that begins after logcat -c; the try path sets $saved before Save-WatchEvidence, the finally saves the evidence ONCE when it was not saved and the start is not proven (the rep an error, its own error a note, nothing else sent); Write-WalkLog, Invoke-Adb, Invoke-Shell, Invoke-Native and Invoke-Step are byte-identical to the base (no old behaviour changed) — failing: ' + JSON.stringify(F(k11)));

  /* ── k12 · F-1 / F-2 / F-3: the classes need proof ── */
  const k12 = {
    noPidPids: has(wr, "else { foreach ($x in $inWin) { if ($x.Pkg -and (Test-Same $x.Tag 'am_proc_start') -and (-not $ours.Contains([long]$x.Pid))) { $ours.Add([long]$x.Pid) } } }"),
    killinfoByPid: !/\$e\.Pkg\) \{ continue \}|-not \$x\.Pkg/.test(wr) && has(wr, "if ((Test-Same $x.Tag 'am_kill') -or (Test-Same $x.Tag 'killinfo')) { $kill = $true }"),
    endRule: has(wr, '$ended = $died -or $kill') && has(wr, "if (Test-Same $x.Tag 'am_proc_died') { $died = $true }"),
    withPid: has(wr, "if ((-not $inAfter) -or $ended) { if ($kill) { $o.Class = 'kill' } else { $o.Class = 'nokill' } }") && has(wr, "elseif (-not $front) { $o.Class = 'alive' }") && has(wr, "$o.Word = 'more than one pid after the wait, in front'; return $o }"),
    noPid: has(wr, "elseif ($ended) { if ($kill) { $o.Class = 'kill' } else { $o.Class = 'nokill' } }") && has(wr, "$o.Word = 'no pid at the start, one pid in front after the wait'; return $o }") && has(wr, "$o.Word = 'no pid at the start, no end event'; return $o }") && countOf(wr, "$o.Class = 'nokill'") === 2 && countOf(wr, "$o.Class = 'alive'") === 1,
    valueRead: has(wr, "$inAfter = ((Get-Prop $w 'pidInAfter') -is [bool]) -and ((Get-Prop $w 'pidInAfter') -eq $true)"),
    nAfterRange: has(wr, "-or ($nAfter -ne [Math]::Floor($nAfter)) -or ($nAfter -lt 0) -or ($nAfter -gt 99)) { $o.Why = $label + ': watch facts are not readable'"),
    noPidOnePid: has(wr, "elseif (($nAfter -eq 1) -and $front) { $o.Why = $label + ': no pid right after the start, one pid after the wait and our app in front, no end event'"),
    factsAgree: has(wr, "if (($same -and (($null -eq $pidV) -or (-not $inAfter) -or ($nAfter -ne 1))) -or ($inAfter -and (($null -eq $pidV) -or ($nAfter -lt 1)))) {") && has(wr, "((Get-Prop $w 'pidInAfter') -isnot [bool])"),
  };
  ok(F(k12).length === 0,
    '★ walktools2 B (k12 classRules, #46 r1 F-1 / F-2 / F-3): with no pid read the pids named by an am_proc_start of the package in the window are the start\'s pids, and their am_* events AND their killinfo count; an end = P not among the pids after the wait, or an am_proc_died / am_kill / killinfo of a pid of the start (it overrides "alive"); a kill = am_kill or killinfo; no pid read and no end event = no data (two fixed reasons), P among more pids with the app in front = no data; samePid, pidInAfter and pidsAfter must agree, pidInAfter must be a bool — failing: ' + JSON.stringify(F(k12)));

  /* ── k13 · F-6: facts lines ── */
  const words = [...wr.matchAll(/\$o\.Word = ('[^']*'(?: \+ \$[A-Za-z.]+)?)/g)].map((m) => m[1]);
  const wordRe = /^'[a-z0-9_ ,-]+'( \+ \$(st|ev\.State|app\.State))?$/;
  const k13 = {
    rowsLine: has(rows, "if ($res.Class -eq '') { $why.Add($res.Why); if ($res.Line) { $facts.Add('rep ' + $res.Rep + ': no data (' + $res.Word + ')') }; continue }") && !has(rows, "$res.Why + ' (no data)'"),
    lineRule: has(wr, "Line = (-not (($wp -is [bool]) -and ($wp -eq $true)))") && wr.indexOf('$wp = Get-Prop $w \'proven\'') < wr.indexOf("$status = [string](Get-Prop $Entry 'status')"),
    fixedWords: words.length >= 15 && words.length === countOf(wr, '$o.Word =') && words.every((x) => wordRe.test(x)),
    statusWordsFixed: has(wr, "foreach ($st in @('error', 'skipped', 'no-screen')) { if (Test-Same $status $st) { $o.Word = 'status ' + $st } }"),
  };
  ok(F(k13).length === 0,
    '★ walktools2 B (k13 factsLines, #46 r1 F-6): summary.md gets a facts line only for a start that run.json does not mark proven; a rep with no data gets "rep N: no data (<word>)" where every word is a fixed literal (or "status " + one of error / skipped / no-screen, or a fixed file state), never a note or an adb line — failing: ' + JSON.stringify(F(k13)) + ' ' + JSON.stringify(words.filter((x) => !wordRe.test(x))));
}
