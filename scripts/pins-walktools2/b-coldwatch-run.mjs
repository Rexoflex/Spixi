#!/usr/bin/env node
/* ==== walktools2 · B (BY HAND) — runs the REAL scripts/device/adb-walk.ps1 and adb-walk-parse.ps1 on PowerShell 7 and prints ok / FAIL per key.
 *
 *   node scripts/pins-walktools2/b-coldwatch-run.mjs [--pwsh /usr/local/bin/pwsh] [--walk <adb-walk.ps1>] [--parser <adb-walk-parse.ps1>] [--base-ref 462ba3e4]
 *
 * NEEDS pwsh (PowerShell 7, tested with 7.4.6 on Linux) and GNU grep. NOT in the smoke (CI has no PowerShell step): the in-smoke pin is
 * b-coldwatch.mjs (source text only). Exit 0 = every key ok, 1 = a FAIL, 2 = no pwsh / no base. Never run on Windows PowerShell 5.1, never on
 * the phone. The fixtures (scripts/pins-walktools2/fixtures/b/) and the fake adb answers are SYNTHETIC (date 12-01, pids 43xx): no line of a
 * real phone. Every run happens in a temp folder; the repo is never written.
 *   g1 parseGate   — both scripts parse with 0 errors (Parser.ParseFile).
 *   g2 allowlist   — the constants block and the allowlist functions taken out of the script BY AST: the events pull is accepted as the ONE
 *                    exact string; near misses are refused (an extra pipe, another package, a changed pattern, another buffer, another file,
 *                    >>, spaces, a non-ASCII character, a chained command); Get-LogPullCmd with a pid of digits is accepted, a pid with a letter
 *                    refused; the two evidence pull targets are accepted, others refused; coldstart-watch is in AllSteps and OptInSteps, NOT in
 *                    DefaultSteps.
 *   g3 phoneCut    — the phone-side pattern run by GNU grep -o -E on synthetic hostile lines: what passes holds only times, pids, the
 *                    priority letter, the six tags / killinfo, the pinned package, digits and , [ ] - ; a crash message, a kill reason,
 *                    another package, a sub-process, a DOTNET line do not pass. (GNU grep stands in for the phone's toybox grep: a LIMIT.)
 *   g4 parserWatch — the parser on fixtures: watch-mixed (front, death with an OLDER am_proc_died + am_kill of the same pid before t0 that
 *                    must not count, kill, alive-not-in-front, no pid) gives starts 5 / front 1 / no kill 2 / kill 1 / alive 1, exit 0, the
 *                    facts lines (numbers and fixed words only, no raw line); watch-lmk (killinfo of the pid, no am_kill) = ends with a kill;
 *                    watch-failpull and watch-noprocstart and a copy with a deleted events file or no waitSec = every row "no data", exit 2.
 *   g5 oldRows     — the base parser (git <base-ref>) and the new one give the SAME summary.csv (and summary.md but the Parsed line) on every
 *                    fixture of scripts/pins-walktools/fixtures and on fixtures/b/old-other-steps; on watch-with-old the old rows are the same.
 *   g6 fakeAdb     — the real driver end to end through the test hook ADBWALK_ADB (a fake adb in node; the ONE test-time patch: the copy's
 *                    $script:WatchWaitSec = 10 becomes 1 and its map has coldStartIdleSec 0, so a run takes seconds): 5 reps (front, death,
 *                    kill, alive, no pid) -> exit 0 and the rows of g4; the trace: per not-proven rep the events pull, its pull and rm -f, then
 *                    the app log pull, all BEFORE the next logcat -c; no input, no screencap; every command an exact allowlisted string;
 *                    run.json coldstartWatch.waitSec and the watch facts. A second run whose events pull fails -> exit 2.
 *   g7 refusals    — the real script: -Steps coldstart-watch with -Calibrate / with -Flags / -Repeats 51 = a usage error and NO adb call (a
 *                    recording fake adb sees nothing); -Repeats 50 passes the argument checks.
 *   g8 homeSets    — screens.home in the sets form (stub bitmap as b-screens-run.mjs; System.Drawing does not work on Linux): valid / invalid
 *                    forms with their texts, light passes, dark passes, neither = the compact note; the OLD form of home equal to the base
 *                    script (gap, Test-Probes, Test-Screen); load time: home sets pass the map checks, sets on chatinfo = usage error, a home
 *                    set of 17 probes = usage error.
 * Deliberate breaks (#802): the builder's report (--walk / --parser <mutated copy>). */
import { spawnSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, copyFileSync, rmSync, existsSync, readdirSync, chmodSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tree = resolve(here, '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const PWSH = opt('--pwsh', 'pwsh');
const WALK = resolve(opt('--walk', join(tree, 'scripts/device/adb-walk.ps1')));
const PARSER = resolve(opt('--parser', join(tree, 'scripts/device/adb-walk-parse.ps1')));
const BASE_REF = opt('--base-ref', '462ba3e4');
const FIX = join(here, 'fixtures', 'b');
const MAP = join(tree, 'scripts/device/a52s.json');

const probe = spawnSync(PWSH, ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'], { encoding: 'utf8' });
if (probe.error || probe.status !== 0) { console.log('b-coldwatch-run: this tool NEEDS pwsh; "' + PWSH + '" did not run. Pass --pwsh <path>.'); process.exit(2); }
console.log('pwsh ' + probe.stdout.trim() + ' · walk ' + WALK + ' · parser ' + PARSER);
const work = mkdtempSync(join(tmpdir(), 'walktools2-b-'));
process.on('exit', () => { try { rmSync(work, { recursive: true, force: true }); } catch { /* by hand tool */ } });
const gitShow = (path) => { const g = spawnSync('git', ['-C', tree, 'show', BASE_REF + ':' + path], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); return g.status === 0 && g.stdout.length > 1000 ? g.stdout : null; };
const baseWalkText = gitShow('scripts/device/adb-walk.ps1');
const baseParseText = gitShow('scripts/device/adb-walk-parse.ps1');
if (!baseWalkText || !baseParseText) { console.log('b-coldwatch-run: cannot read the base scripts (git show ' + BASE_REF + ':...).'); process.exit(2); }
const BASE_WALK = join(work, 'base-adb-walk.ps1'); writeFileSync(BASE_WALK, baseWalkText);
const BASE_PARSER = join(work, 'base-adb-walk-parse.ps1'); writeFileSync(BASE_PARSER, baseParseText);

const results = [];
const ok = (name, cond, detail) => { results.push([name, !!cond]); console.log((cond ? '  ok   ' : '  FAIL ') + name + (cond ? '' : ' — ' + detail)); };
const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
const pw = (args, env = {}, cwd = work) => { const r = spawnSync(PWSH, ['-NoProfile', '-NonInteractive', ...args], { encoding: 'utf8', cwd, env: { ...process.env, ...env }, timeout: 300000, maxBuffer: 64 * 1024 * 1024 }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }; };

// The ONE new allowlist string (the same text as in b-coldwatch.mjs).
const PKG = 'com.ixilabs.spixi.dev';
export const EXPECT_RE = "^[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3} +[0-9]+ +[0-9]+ [A-Z] ((am_proc_start|am_proc_died|am_kill|am_crash|am_anr|am_wtf) *: \\[[0-9]+(,[0-9]+)*,com\\.ixilabs\\.spixi\\.dev(,-?[0-9]+)*[],]|killinfo *: \\[-?[0-9]+(,-?[0-9]+)*)";
export const EXPECT_CMD = "logcat -d -b events -v threadtime | grep -o -E '" + EXPECT_RE + "' > /data/local/tmp/adbwalk-log.txt";

/* ───────────── g1 parse gate */
{
  const gate = (f) => pw(['-Command', "$t=$null;$e=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('" + f.replace(/'/g, "''") + "',[ref]$t,[ref]$e);@($e).Count"]);
  const a = gate(WALK), b = gate(PARSER);
  ok('g1 parseGate', a.out.trim() === '0' && b.out.trim() === '0', 'walk ' + a.out.trim() + ' / parser ' + b.out.trim());
}

/* ───────────── g2 allowlist (constants + functions by AST) */
const HARNESS_A = String.raw`param([string]$Script, [string]$CasesFile, [string]$OutFile, [string]$PullDir)
$ErrorActionPreference = 'Stop'
# (a parameter named RunDir would BE $script:RunDir, which the constants block below sets to '')
$text = [System.IO.File]::ReadAllText($Script)
$i0 = $text.IndexOf('$script:PinnedPackage = ')
$i1 = [regex]::Match($text, '(?m)^function ').Index
if ($i0 -lt 0 -or $i1 -le $i0) { throw 'constants block not found' }
Invoke-Expression $text.Substring($i0, $i1 - $i0)
$tokens = $null; $errs = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($text, [ref]$tokens, [ref]$errs)
$want = @('Get-LogPullCmd', 'Initialize-Allowlist', 'Test-Ordinal', 'Test-ShellAllowed', 'Test-LocalPullTarget', 'Test-ApkName', 'Assert-AdbCommand', 'Stop-Walk')
foreach ($f in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) { if ($want -contains $f.Name) { Invoke-Expression $f.Extent.Text } }
$script:Pkg = $script:PinnedPackage
$script:RunDir = $PullDir
Initialize-Allowlist
$out = [ordered]@{ eventsCmd = [string]$script:WatchEventsCmd; eventRe = [string]$script:WatchEventRe; waitSec = $script:WatchWaitSec; all = @($script:AllSteps); optin = @($script:OptInSteps); def = @($script:DefaultSteps); piped = @($script:PipedCmds | Where-Object { $_ -ceq $script:WatchEventsCmd }).Count; cases = @() }
$cases = Get-Content -Raw -LiteralPath $CasesFile | ConvertFrom-Json
foreach ($c in $cases) {
    $cmd = [string]$c.cmd
    if ($c.kind -eq 'logpull') { $cmd = Get-LogPullCmd ([string]$c.pid) }
    $allowed = $false; $threw = $false
    if ($c.kind -eq 'pull') {
        try { Assert-AdbCommand @('pull', [string]$c.phone, (Join-Path $PullDir ([string]$c.local))) } catch { $threw = $true }
        $allowed = -not $threw
    } else {
        $allowed = [bool](Test-ShellAllowed $cmd)
        try { Assert-AdbCommand @('shell', $cmd) } catch { $threw = $true }
    }
    $out.cases += [ordered]@{ id = $c.id; allowed = $allowed; threw = $threw }
}
[System.IO.File]::WriteAllText($OutFile, (ConvertTo-Json -InputObject $out -Depth 6))
`;
{
  const hp = join(work, 'harness-a.ps1'); writeFileSync(hp, HARNESS_A);
  const rd = join(work, 'rundir-a'); mkdirSync(rd);
  const C = [];
  const add = (id, cmd, expect, kind = 'shell', extra = {}) => C.push({ id, cmd, expect, kind, ...extra });
  add('accept: the events pull, exact', EXPECT_CMD, true);
  add('refuse: an extra pipe at the end', EXPECT_CMD + ' | cat', false);
  add('refuse: an extra pipe in the middle', EXPECT_CMD.replace('| grep', '| cat | grep'), false);
  add('refuse: another package (the store app)', EXPECT_CMD.replace('spixi\\.dev', 'spixi'), false);
  add('refuse: another package (any suffix)', EXPECT_CMD.replace('spixi\\.dev(', 'spixi\\.dev[a-z.]*('), false);
  add('refuse: a changed pattern (no -o)', EXPECT_CMD.replace('grep -o -E', 'grep -E'), false);
  add('refuse: a changed pattern (ms digits 3,4)', EXPECT_CMD.replace('\\.[0-9]{3} ', '\\.[0-9]{3,4} '), false);
  add('refuse: a changed pattern (.* at the end)', EXPECT_CMD.replace(")' >", ").*' >"), false);
  add('refuse: a changed pattern (free text after killinfo)', EXPECT_CMD.replace('killinfo *: ', 'killinfo.*: '), false);
  add('refuse: the main buffer', EXPECT_CMD.replace('-b events', '-b main'), false);
  add('refuse: all buffers', EXPECT_CMD.replace('-b events', '-b all'), false);
  add('refuse: another phone file', EXPECT_CMD.replace('/data/local/tmp/adbwalk-log.txt', '/sdcard/adbwalk-log.txt'), false);
  add('refuse: >> instead of >', EXPECT_CMD.replace("' > /data", "' >> /data"), false);
  add('refuse: a leading space', ' ' + EXPECT_CMD, false);
  add('refuse: a trailing space', EXPECT_CMD + ' ', false);
  add('refuse: a chained rm', EXPECT_CMD + '; rm -f /data/local/tmp/adbwalk-log.txt', false);
  add('refuse: a zero-width space', EXPECT_CMD.replace('events', 'ev​ents'), false);
  add('refuse: Logcat (case)', EXPECT_CMD.replace('logcat', 'Logcat'), false);
  add('accept: Get-LogPullCmd 4302 (digits)', '', true, 'logpull', { pid: '4302' });
  add('refuse: Get-LogPullCmd 43a2 (a pid with a letter)', '', false, 'logpull', { pid: '43a2' });
  add('refuse: Get-LogPullCmd 4302x', '', false, 'logpull', { pid: '4302x' });
  add('refuse: Get-LogPullCmd empty pid', '', false, 'logpull', { pid: '' });
  add('refuse: Get-LogPullCmd 10 digits', '', false, 'logpull', { pid: '1234567890' });
  add('accept: pull of the events file', '', true, 'pull', { phone: '/data/local/tmp/adbwalk-log.txt', local: 'android-walk-coldstart-watch-07-events.txt' });
  add('accept: pull of the app log', '', true, 'pull', { phone: '/data/local/tmp/adbwalk-log.txt', local: 'android-walk-coldstart-watch-07.txt' });
  add('refuse: pull to a .log name', '', false, 'pull', { phone: '/data/local/tmp/adbwalk-log.txt', local: 'android-walk-coldstart-watch-07-events.log' });
  add('refuse: pull of another phone file', '', false, 'pull', { phone: '/data/local/tmp/other.txt', local: 'android-walk-coldstart-watch-07.txt' });
  const cf = join(work, 'cases-a.json'); writeFileSync(cf, JSON.stringify(C));
  const of = join(work, 'out-a.json');
  const r = pw(['-File', hp, '-Script', WALK, '-CasesFile', cf, '-OutFile', of, '-PullDir', rd]);
  let o = null; try { o = JSON.parse(readFileSync(of, 'utf8')); } catch { o = null; }
  if (!o) ok('g2 allowlist', false, 'harness failed: ' + r.out.slice(0, 600));
  else {
    const bad = C.filter((c, i) => { const x = o.cases[i]; return !x || x.allowed !== c.expect || x.threw === c.expect; }).map((c) => c.id);
    const t = {
      exactString: o.eventsCmd === EXPECT_CMD && o.eventRe === EXPECT_RE,
      onceInPiped: o.piped === 1,
      cases: bad.length === 0,
      inAllSteps: o.all[o.all.length - 1] === 'coldstart-watch',
      optIn: o.optin.includes('coldstart-watch'),
      notDefault: !o.def.includes('coldstart-watch') && o.def.length === o.all.length - o.optin.length,
      waitIsInt: o.waitSec === 10,
    };
    ok('g2 allowlist (' + C.length + ' cases)', F(t).length === 0, JSON.stringify(F(t)) + ' ' + JSON.stringify(bad));
  }
}

/* ───────────── g3 the phone-side cut (GNU grep -o -E as a stand-in for toybox grep) */
{
  const L = (tag, body) => '12-01 10:01:03.400  1500  1600 I ' + tag.padEnd(8) + ': ' + body;
  const lines = [
    L('am_crash', '[0,4302,' + PKG + ',948485700,java.lang.IllegalStateException,the secret message,Foo.java,12,0]'),
    L('am_kill', '[0,4302,' + PKG + ',0,stop ' + PKG + ' due to from pid 1234]'),
    L('am_anr', '[0,4302,' + PKG + ',953695812,Input dispatching timed out (reason text)]'),
    L('am_wtf', '[0,4302,' + PKG + ',948485700,Tag,the wtf message]'),
    L('am_proc_start', '[0,4302,10345,' + PKG + ',pre-top-activity,{' + PKG + '/crc64e0b33a801f5f9986.MainActivity}]'),
    L('am_proc_died', '[0,4302,' + PKG + ',0,2,5]'),
    L('killinfo', '[4302,10345,0,0,123456,2,7000,12,34,56,78]'),
    L('am_kill', '[0,4400,com.ixilabs.spixi,0,stop com.ixilabs.spixi]'),
    L('am_kill', '[0,4401,' + PKG + ':remote,0,empty]'),
    L('am_kill', '[0,4402,' + PKG + '.evil,0,empty]'),
    L('am_kill', '[0,4403,com.other.app,0,stop]'),
    L('am_crash', '[0,4302,' + PKG + ',1,x 12-01 10:00:00.000 1 1 I am_kill : [0,1,' + PKG + ',0,injected]'),
    '12-01 10:01:03.400  4302  4320 I DOTNET  : 12-01 10:01:03.4000|info|1: [P1] boot hold ms=1',
    L('am_focused_activity', '[0,' + PKG + '/x,reason]'),
    L('wm_task_created', '[1,2]'),
  ];
  const g = spawnSync('grep', ['-o', '-E', EXPECT_RE], { input: lines.join('\n') + '\n', encoding: 'utf8' });
  const outs = (g.stdout || '').split('\n').filter(Boolean);
  const strip = (s) => s.replace(/\b(am_proc_start|am_proc_died|am_kill|am_crash|am_anr|am_wtf|killinfo)\b/g, '').replace(new RegExp(PKG.replace(/\./g, '\\.'), 'g'), '');
  const alphabet = outs.every((s) => /^[0-9 :.,\[\]\-]*[A-Z][0-9 :.,\[\]\-]*$/.test(strip(s)) && strip(s).replace(/[^A-Z]/g, '').length === 1);
  const want = [
    '12-01 10:01:03.400  1500  1600 I am_crash: [0,4302,' + PKG + ',948485700,',
    '12-01 10:01:03.400  1500  1600 I am_kill : [0,4302,' + PKG + ',0,',
    '12-01 10:01:03.400  1500  1600 I am_anr  : [0,4302,' + PKG + ',953695812,',
    '12-01 10:01:03.400  1500  1600 I am_wtf  : [0,4302,' + PKG + ',948485700,',
    '12-01 10:01:03.400  1500  1600 I am_proc_start: [0,4302,10345,' + PKG + ',',
    '12-01 10:01:03.400  1500  1600 I am_proc_died: [0,4302,' + PKG + ',0,2,5]',
    '12-01 10:01:03.400  1500  1600 I killinfo: [4302,10345,0,0,123456,2,7000,12,34,56,78',
    '12-01 10:01:03.400  1500  1600 I am_crash: [0,4302,' + PKG + ',1,',
  ];
  const t = {
    grepRan: g.status === 0,
    exactOutputs: JSON.stringify(outs) === JSON.stringify(want),
    alphabetOnly: alphabet,
    noMessage: !/secret|message|reason|stop |due to|Exception|injected|java|Foo|remote|evil|other|DOTNET|P1|MainActivity|pre-top/.test(outs.join('\n')),
  };
  ok('g3 phoneCut (GNU grep stands in for toybox)', F(t).length === 0, JSON.stringify(F(t)) + '\n      got: ' + JSON.stringify(outs));
}

/* ───────────── the parser on a fixture copy */
const cache = new Map();
function runParser(parser, fixture, mutate) {
  const dst = mkdtempSync(join(work, 'p-'));
  cpSync(fixture.startsWith('/') ? fixture : join(FIX, fixture), dst, { recursive: true });
  if (mutate) mutate(dst);
  const r = pw(['-File', parser, '-RunDir', dst]);
  const csv = existsSync(join(dst, 'summary.csv')) ? readFileSync(join(dst, 'summary.csv'), 'utf8') : '';
  const md = existsSync(join(dst, 'summary.md')) ? readFileSync(join(dst, 'summary.md'), 'utf8') : '';
  return { code: r.code, out: r.out, csv, md, rows: parseCsv(csv), dir: dst };
}
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  return rows.slice(1).map((r) => ({ step: r[0], metric: r[1], n: r[2], median: r[3], min: r[4], max: r[5], unit: r[6], note: r[7], files: r[8] }));
}
const rowOf = (R, metric) => R.rows.find((r) => r.step === 'coldstart-watch' && r.metric === metric) || { median: '<row missing>', n: '', note: '<row missing>', files: '' };
const normMd = (md) => md.split('\n').filter((l) => !l.startsWith('- Parsed (PC time):')).join('\n');
const WATCH_ROWS = ['starts', 'in front after 10 s', 'ends with no kill', 'ends with a kill', 'not in front, process alive'];
const evidenceLines = (dir) => readdirSync(dir).filter((f) => f.startsWith('android-walk-coldstart-watch-')).flatMap((f) => readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean));
const FACT2 = 'rep 2: ends with no kill; events after the start: am_proc_start +0.2 s, am_proc_died +3.4 s (oom_adj 0, procstate 2); app log: 3 lines, the last a P1 line at +2.9 s';
function checkMixed(R, frontName) {
  const facts = R.md.split('\n').filter((l) => /^- rep [0-9]+: /.test(l));
  const raw = evidenceLines(R.dir);
  return {
    exit0: R.code === 0,
    starts: rowOf(R, 'starts').median === '5' && rowOf(R, 'starts').n === '5',
    front: rowOf(R, frontName).median === '1',
    noKill: rowOf(R, 'ends with no kill').median === '1' && rowOf(R, 'ends with no kill').note === 'reps 2',
    kill: rowOf(R, 'ends with a kill').median === '2' && rowOf(R, 'ends with a kill').note === 'reps 3 5',
    alive: rowOf(R, 'not in front, process alive').median === '1' && rowOf(R, 'not in front, process alive').note === 'reps 4',
    oldRecordNotCounted: facts.some((l) => l === '- ' + FACT2),
    killFacts: facts.some((l) => /^- rep 3: ends with a kill; events after the start: am_proc_start \+0\.3 s, am_kill \+5 s, am_proc_died \+5\.1 s \(oom_adj 905, procstate 19\); app log: 1 lines, the last a Starting Spixi line at \+1 s$/.test(l)),
    aliveFacts: facts.some((l) => /^- rep 4: not in front, process alive; events after the start: am_proc_start \+0\.25 s; app log: 2 lines, the last a CDPERF line at \+4\.5 s$/.test(l)),
    noPidFacts: facts.some((l) => l === '- rep 5: ends with a kill (no single pid right after the start: the events of the pids of the am_proc_start of the package); events after the start: am_proc_start +0.3 s, am_proc_died +1 s (oom_adj 0, procstate 2), killinfo +1.01 s; app log: not pulled (no pid)'),
    fourFacts: facts.length === 4,
    noRawLine: raw.every((l) => !R.md.includes(l) && !R.csv.includes(l)) && !/0\.9\.30|why=none|load=420|10345|10200|4999/.test(R.md + R.csv),
    filesListed: R.md.includes('- `android-walk-coldstart-watch-02-events.txt`') && R.md.includes('- `android-walk-coldstart-watch-02.txt`'),
  };
}

/* ───────────── g4 the parser on the watch fixtures */
{
  const R = runParser(PARSER, 'watch-mixed');
  const t = checkMixed(R, 'in front after 10 s');
  ok('g4a parserWatch mixed (front, death + an OLDER record, kill, alive, no pid)', F(t).length === 0, JSON.stringify(F(t)) + '\n' + R.csv + R.md.split('Cold start watch')[1]);
  const allNoData = (X) => WATCH_ROWS.every((m) => rowOf(X, m).median === 'no data');
  const P = runParser(PARSER, 'watch-failpull');
  const tp = { exit2: P.code === 2, allNoData: allNoData(P), reason: rowOf(P, 'starts').note.startsWith('rep 2: status error'), result: /RESULT: TEST HOOK NO DATA in 5 rows/.test(P.md) };
  ok('g4b parserWatch failed evidence pull -> no data, exit 2', F(tp).length === 0, JSON.stringify(F(tp)) + ' ' + rowOf(P, 'starts').note);
  const N = runParser(PARSER, 'watch-noprocstart');
  const tn = { exit2: N.code === 2, allNoData: allNoData(N), reason: rowOf(N, 'starts').note === 'rep 1: no am_proc_start of this start in android-walk-coldstart-watch-01-events.txt' };
  ok('g4c parserWatch only OLDER records in the events (no am_proc_start of the start) -> no data, exit 2', F(tn).length === 0, JSON.stringify(F(tn)) + ' ' + rowOf(N, 'starts').note);
  const D = runParser(PARSER, 'watch-mixed', (d) => unlinkSync(join(d, 'android-walk-coldstart-watch-03-events.txt')));
  const td = { exit2: D.code === 2, allNoData: allNoData(D), reason: rowOf(D, 'starts').note === 'rep 3: events file android-walk-coldstart-watch-03-events.txt missing', missingListed: D.md.includes('- `android-walk-coldstart-watch-03-events.txt` missing') };
  ok('g4d parserWatch a deleted events file -> no data, exit 2', F(td).length === 0, JSON.stringify(F(td)) + ' ' + rowOf(D, 'starts').note);
  const K = runParser(PARSER, 'watch-lmk');
  const tk = { exit0: K.code === 0, kill: rowOf(K, 'ends with a kill').median === '1' && rowOf(K, 'ends with no kill').median === '0', facts: K.md.includes('- rep 1: ends with a kill; events after the start: am_proc_start +0.2 s, killinfo +6 s, am_proc_died +6.05 s (oom_adj 900, procstate 19); app log: 1 lines, the last a P1 line at +1 s') };
  ok('g4f parserWatch an lmkd kill (killinfo of the pid, no am_kill) -> ends with a kill', F(tk).length === 0, JSON.stringify(F(tk)) + K.md.split('Cold start watch')[1]);
  const W = runParser(PARSER, 'watch-mixed', (d) => { const j = JSON.parse(readFileSync(join(d, 'run.json'), 'utf8')); delete j.coldstartWatch; writeFileSync(join(d, 'run.json'), JSON.stringify(j)); });
  const tw = { exit2: W.code === 2, name: rowOf(W, 'in front after ? s').median === 'no data', reason: rowOf(W, 'starts').note.startsWith('run.json has no valid coldstartWatch.waitSec') };
  ok('g4e parserWatch no coldstartWatch.waitSec -> no data, exit 2', F(tw).length === 0, JSON.stringify(F(tw)));
  const factsOf = (X) => X.md.split('\n').filter((l) => /^- rep [0-9?]+: /.test(l));
  // #46 r1 F-1 (the reviewer's case): no pid read, one pid after the wait, in front, only an am_proc_start -> no data, never "ends".
  const NF = runParser(PARSER, 'watch-nopid-front');
  const tnf = { exit2: NF.code === 2, allNoData: allNoData(NF), reason: rowOf(NF, 'starts').note === 'rep 2: no pid right after the start, one pid after the wait and our app in front, no end event', factLine: JSON.stringify(factsOf(NF)) === JSON.stringify(['- rep 2: no data (no pid at the start, one pid in front after the wait)']) };
  ok('g4g parserWatch F-1: no pid read + one pid in front after the wait + no end event -> no data, exit 2 (not "ends with no kill")', F(tnf).length === 0, JSON.stringify(F(tnf)) + ' ' + rowOf(NF, 'starts').note + ' ' + JSON.stringify(factsOf(NF)));
  // the same rep with an am_proc_start only and NO single pid after the wait: still no data (an end needs an end event of a started pid)
  const NF0 = runParser(PARSER, 'watch-nopid-front', (d) => { const j = JSON.parse(readFileSync(join(d, 'run.json'), 'utf8')); Object.assign(j.reps[1].watch, { pidsAfter: 0, front: false }); writeFileSync(join(d, 'run.json'), JSON.stringify(j)); });
  ok('g4h parserWatch F-1: no pid read + 0 pids after the wait + no end event -> no data, exit 2', NF0.code === 2 && allNoData(NF0) && rowOf(NF0, 'starts').note === 'rep 2: no pid right after the start and no end event of a started pid', rowOf(NF0, 'starts').note);
  // #46 r1 F-2: the races
  const RC = runParser(PARSER, 'watch-race');
  const frc = factsOf(RC);
  const trc = {
    exit0: RC.code === 0,
    noKill: rowOf(RC, 'ends with no kill').median === '3' && rowOf(RC, 'ends with no kill').note === 'reps 1 4 5',
    kill: rowOf(RC, 'ends with a kill').median === '1' && rowOf(RC, 'ends with a kill').note === 'reps 3',
    alive: rowOf(RC, 'not in front, process alive').median === '1' && rowOf(RC, 'not in front, process alive').note === 'reps 2',
    diedOverridesAlive: frc.includes('- rep 1: ends with no kill (the pid of the start was still listed after the wait); events after the start: am_proc_start +0.2 s, am_proc_died +10.05 s (oom_adj 0, procstate 2); app log: 1 lines, the last a Starting Spixi line at +1 s'),
    twoPidsAlive: frc.includes('- rep 2: not in front, process alive; events after the start: am_proc_start +0.2 s; app log: 1 lines, the last a Starting Spixi line at +1 s'),
    noPidDied: frc.includes('- rep 4: ends with no kill (no single pid right after the start: the events of the pids of the am_proc_start of the package); events after the start: am_proc_start +0.2 s, am_proc_died +0.9 s (oom_adj 0, procstate 2); app log: not pulled (no pid)'),
  };
  ok('g4i parserWatch F-2: an am_proc_died of P overrides "alive"; P among two pids = no "ends"; an am_kill of P among two pids = a kill; no pid + an am_proc_died of the started pid = an end', F(trc).length === 0, JSON.stringify(F(trc)) + '\n' + RC.csv + frc.join('\n'));
  const TF = runParser(PARSER, 'watch-twopids-front');
  ok('g4j parserWatch F-2: P and another pid after the wait, in front, no end event -> no data, exit 2', TF.code === 2 && allNoData(TF) && JSON.stringify(factsOf(TF)) === JSON.stringify(['- rep 1: no data (more than one pid after the wait, in front)']), rowOf(TF, 'starts').note + JSON.stringify(factsOf(TF)));
  const DIS = runParser(PARSER, 'watch-race', (d) => { const j = JSON.parse(readFileSync(join(d, 'run.json'), 'utf8')); j.reps[4].watch.pidInAfter = true; delete j.reps[1].watch.pidInAfter; writeFileSync(join(d, 'run.json'), JSON.stringify(j)); });
  ok('g4k parserWatch F-2: pidInAfter missing or against pidsAfter / samePid -> no data, exit 2', DIS.code === 2 && allNoData(DIS) && rowOf(DIS, 'starts').note.startsWith('rep 2: watch facts are not readable'), rowOf(DIS, 'starts').note);
  // #46 r1 F-3: no pid read; killinfo of the started pid = a kill; killinfo of another pid / before t0 does not count
  const KN = runParser(PARSER, 'watch-killinfo-nopid');
  ok('g4l parserWatch F-3: no pid read + killinfo of the started pid -> ends with a kill', KN.code === 0 && rowOf(KN, 'ends with a kill').median === '1' && rowOf(KN, 'ends with no kill').median === '0' && factsOf(KN).join('|') === '- rep 1: ends with a kill (no single pid right after the start: the events of the pids of the am_proc_start of the package); events after the start: am_proc_start +0.2 s, killinfo +5 s; app log: not pulled (no pid)', KN.csv + factsOf(KN).join('|'));
  // #46 r1 F-6: a proven rep with status error = no facts line; a not-proven rep = "rep N: no data (<fixed word>)", never its note
  const PE = runParser(PARSER, 'watch-proven-error');
  const tpe = { exit2: PE.code === 2, allNoData: allNoData(PE), oneLine: JSON.stringify(factsOf(PE)) === JSON.stringify(['- rep 2: no data (status error)']), noNoteInFacts: !/secretword|Error type|exit 255/.test(PE.md.split('Cold start watch')[1].split('\nFiles')[0]) };
  ok('g4m parserWatch F-6: facts lines only for not-proven starts, a no-data line = "rep N: no data (<fixed word>)"', F(tpe).length === 0, JSON.stringify(F(tpe)) + JSON.stringify(factsOf(PE)));
}

/* ───────────── g5 the old rows, base parser vs new parser */
{
  const oldDir = join(tree, 'scripts/pins-walktools/fixtures');
  const names = readdirSync(oldDir).map((n) => join(oldDir, n)).concat([join(FIX, 'old-other-steps')]);
  const bad = [];
  for (const f of names) {
    const B = runParser(BASE_PARSER, f), N = runParser(PARSER, f);
    if (!(B.csv.length > 0 && N.csv === B.csv && normMd(N.md) === normMd(B.md) && N.code === B.code)) bad.push(f.split('/').slice(-1)[0]);
  }
  ok('g5a oldRows: summary.csv and summary.md byte-identical (base ' + BASE_REF + ' vs new) on ' + names.length + ' old run folders', bad.length === 0, JSON.stringify(bad));
  const B = runParser(BASE_PARSER, 'watch-with-old'), N = runParser(PARSER, 'watch-with-old');
  const dropW = (csv) => csv.split('\n').filter((l) => !l.startsWith('coldstart-watch,')).join('\n');
  const t = {
    baseSaysUnknown: B.csv.includes('coldstart-watch,unknown step,'),
    oldRowsSame: dropW(N.csv) === dropW(B.csv),
    watchRows: rowOf(N, 'starts').median === '2' && rowOf(N, 'in front after 10 s').median === '1' && rowOf(N, 'ends with no kill').median === '1',
  };
  ok('g5b oldRows: old steps + coldstart-watch in one run, the old rows equal the base', F(t).length === 0, JSON.stringify(F(t)));
}

/* ───────────── g6 the real driver through the test hook (a fake adb) */
const FAKE = String.raw`
import { readFileSync, writeFileSync, appendFileSync, existsSync, copyFileSync, unlinkSync, readdirSync, renameSync, mkdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
const S = JSON.parse(readFileSync(process.env.FAKEADB_SCENARIO, 'utf8'));
const stF = process.env.FAKEADB_STATE;
const st = existsSync(stF) ? JSON.parse(readFileSync(stF, 'utf8')) : { rep: 0 };
let a = process.argv.slice(2);
appendFileSync(process.env.FAKEADB_TRACE, JSON.stringify(a) + '\n');
if (a[0] === '-s') a = a.slice(2);
const out = (t, code = 0, e = '') => { writeFileSync(stF, JSON.stringify(st)); process.stdout.write(t); if (e) process.stderr.write(e); process.exit(code); };
// #46 r1 F-4: a TRANSIENT IO error of walk.log: the rep's breakLog command turns walk.log into a folder (the driver's next
// AppendAllText throws); the next shell command puts the file back.
const walkLog = () => { const o = join(process.cwd(), 'Claude outputs', 'adbwalk'); const d = existsSync(o) ? readdirSync(o).filter((n) => n.startsWith('hook-')) : []; return d.length === 1 ? join(o, d[0], 'walk.log') : null; };
if (st.broken && a[0] === 'shell') { const wl = walkLog(); if (wl) { rmdirSync(wl); renameSync(wl + '.bak', wl); } st.broken = false; appendFileSync(process.env.FAKEADB_TRACE, JSON.stringify(['LOGBACK']) + '\n'); }
const breakLog = () => { const wl = walkLog(); if (wl && existsSync(wl)) { renameSync(wl, wl + '.bak'); mkdirSync(wl); st.broken = true; appendFileSync(process.env.FAKEADB_TRACE, JSON.stringify(['LOGBROKEN']) + '\n'); } };
const PKG = 'com.ixilabs.spixi.dev';
const COMP = PKG + '/crc64e0b33a801f5f9986.MainActivity';
const phone = S.phoneFile;
if (a[0] === 'start-server') out('');
if (a[0] === 'devices') out('List of devices attached\nFAKESERIAL0001\tdevice\n\n');
if (a[0] === 'pull') { if (existsSync(phone)) { copyFileSync(phone, a[2]); out('1 file pulled'); } out('', 1); }
if (a[0] !== 'shell') out('', 1);
const c = a[1];
const R = S.reps[st.rep - 1] || {};
const rx = (re) => re.test(c);
if (c === 'date +%m-%dT%H:%M:%S.%N; am start -W -n ' + COMP) { st.rep++; st.pidofN = 0; const r = S.reps[st.rep - 1]; out(r.t0 + '\nStarting: Intent { cmp=' + COMP + ' }\nStatus: ok\nLaunchState: COLD\nActivity: ' + COMP + '\nTotalTime: 1234\nWaitTime: 1240\nComplete\n'); }
if (c === 'pidof ' + PKG) { st.pidofN = (st.pidofN || 0) + 1; if (st.rep > 0 && st.pidofN <= (R.pidofFail || 0)) out('', 1, 'error: closed\n'); const p = st.rep === 0 ? [] : R.pidsAtStart; out(p.length ? p.join(' ') + '\n' : '', p.length ? 0 : 1); }
if (c === 'date +%m-%dT%H:%M:%S.%N; pidof ' + PKG) { if (R.breakLog) breakLog(); out(R.stamp2 + '\n' + (R.pidsAfter.length ? R.pidsAfter.join(' ') + '\n' : ''), R.pidsAfter.length ? 0 : 1); }
if (c === 'dumpsys window | grep -e mCurrentFocus=') out(R.front ? 'mCurrentFocus=Window{8db8463 u0 ' + COMP + '}\n' : 'mCurrentFocus=Window{1a2b3c u0 com.android.launcher3/com.android.launcher3.uioverrides.QuickstepLauncher}\n');
if (c.startsWith('logcat -d -b events ')) { if (R.eventsFail) out('', 255); if (R.eventsErr1) out('', 1, 'adb: error: failed to read\n'); writeFileSync(phone, R.events.map((l) => l + '\n').join('')); out(''); }
if (c.startsWith('logcat -d --pid=')) { writeFileSync(phone, R.appLog.map((l) => l + '\n').join('')); out(''); }
if (c.startsWith('rm -f ')) { try { unlinkSync(phone); } catch { } out(''); }
if (c === 'date +%m-%dT%H:%M:%S.%N') out('12-01T09:00:00.000000000\n');
if (c === 'getprop ro.product.model') out('SM-A528B\n');
if (c === 'getprop ro.build.version.release') out('14\n');
if (c === 'getprop ro.build.version.sdk') out('34\n');
if (c === 'dumpsys battery') out('Current Battery Service state:\n  level: 90\n');
if (c === 'pm path ' + PKG) out('package:/data/app/x/base.apk\n');
if (c.startsWith('cmd package resolve-activity')) out('priority=0 preferredOrder=0\n' + COMP + '\n');
if (c.startsWith('dumpsys package ' + PKG + ' | grep')) out('    versionCode=1 minSdk=21\n    versionName=0.0.0-fake\n    lastUpdateTime=2026-12-01 09:00:00\n');
if (c === 'wm size') out('Physical size: 1080x2400\n');
if (c === 'wm density') out('Physical density: 420\n');
if (c === 'dumpsys display | grep -i -e framerate') out('renderFrameRate 120.0\n');
if (c === 'settings get global stay_on_while_plugged_in') out('0\n');
if (c === 'settings get global zen_mode') out('1\n');
if (c === 'dumpsys power | grep -e mWakefulness=') out('  mWakefulness=Awake\n');
if (c.startsWith('dumpsys window | grep -e mDreamingLockscreen=')) out('mDreamingLockscreen=false\n');
if (c === 'dumpsys activity activities | grep -e mKeyguardShowing=') out('mKeyguardShowing=false\n');
if (rx(/^(am force-stop |logcat -c$|logcat -G 16M$|svc power stayon usb$|input keyevent KEYCODE_WAKEUP$|wm dismiss-keyguard$|settings put global stay_on_while_plugged_in )/)) out('');
appendFileSync(process.env.FAKEADB_TRACE, JSON.stringify(['UNKNOWN', c]) + '\n');
out('fake: unknown command\n', 1);
`;
function fakeTree(scenarioReps, patchWait) {
  const root = mkdtempSync(join(work, 'tree-'));
  mkdirSync(join(root, 'scripts', 'device'), { recursive: true });
  let walk = readFileSync(WALK, 'utf8');
  if (patchWait) { const p = walk.replace('$script:WatchWaitSec = 10\n', '$script:WatchWaitSec = 1\n'); if (p === walk) throw new Error('the WatchWaitSec line was not found'); walk = p; }
  writeFileSync(join(root, 'scripts', 'device', 'adb-walk.ps1'), walk);
  copyFileSync(PARSER, join(root, 'scripts', 'device', 'adb-walk-parse.ps1'));
  const map = JSON.parse(readFileSync(MAP, 'utf8')); map.timing.coldStartIdleSec = 0;
  writeFileSync(join(root, 'scripts', 'device', 'a52s.json'), JSON.stringify(map, null, 2));
  const fk = join(root, 'fake-adb.mjs');
  writeFileSync(fk, '#!' + process.execPath + '\n' + FAKE); chmodSync(fk, 0o755);
  const scen = join(root, 'scenario.json'), state = join(root, 'state.json'), trace = join(root, 'trace.jsonl');
  writeFileSync(scen, JSON.stringify({ phoneFile: join(root, 'phone-adbwalk-log.txt'), reps: scenarioReps }));
  writeFileSync(trace, '');
  return { root, env: { ADBWALK_ADB: fk, FAKEADB_SCENARIO: scen, FAKEADB_STATE: state, FAKEADB_TRACE: trace }, trace };
}
function fakeCollect(root, trace, r) {
  const tr = readFileSync(trace, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const outRoot = join(root, 'Claude outputs', 'adbwalk');
  const runs = existsSync(outRoot) ? readdirSync(outRoot).filter((n) => n.startsWith('hook-')) : [];
  const dir = runs.length === 1 ? join(outRoot, runs[0]) : null;
  const csv = dir && existsSync(join(dir, 'summary.csv')) ? readFileSync(join(dir, 'summary.csv'), 'utf8') : '';
  const md = dir && existsSync(join(dir, 'summary.md')) ? readFileSync(join(dir, 'summary.md'), 'utf8') : '';
  const run = dir && existsSync(join(dir, 'run.json')) ? JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8')) : null;
  return { code: r.code, out: r.out, trace: tr, dir, csv, md, rows: parseCsv(csv), run };
}
function fakeRun(scenarioReps, extraArgs = ['-Steps', 'coldstart-watch', '-Repeats', String(scenarioReps.length)], patchWait = true) {
  const T = fakeTree(scenarioReps, patchWait);
  const r = pw(['-File', join(T.root, 'scripts', 'device', 'adb-walk.ps1'), ...extraArgs], T.env, T.root);
  return fakeCollect(T.root, T.trace, r);
}
// #46 r1 F-4: the real driver, Ctrl+C (SIGINT, which pwsh 7 on Linux takes as Ctrl+C) during the fixed wait of rep 1 (the wait NOT patched).
function fakeRunSigint(scenarioReps) {
  const T = fakeTree(scenarioReps, false);
  return new Promise((res) => {
    const c = spawn(PWSH, ['-NoProfile', '-NonInteractive', '-File', join(T.root, 'scripts', 'device', 'adb-walk.ps1'), '-Steps', 'coldstart-watch', '-Repeats', String(scenarioReps.length)], { cwd: T.root, env: { ...process.env, ...T.env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', sent = false;
    c.stdout.on('data', (d) => { out += d; }); c.stderr.on('data', (d) => { out += d; });
    const t0 = Date.now();
    const poll = setInterval(() => {
      const tr = readFileSync(T.trace, 'utf8');
      if (!sent && tr.includes('"pidof ' + PKG + '"')) { sent = true; setTimeout(() => c.kill('SIGINT'), 2500); }
      if (Date.now() - t0 > 120000) { clearInterval(poll); c.kill('SIGKILL'); }
    }, 200);
    c.on('exit', (code) => { clearInterval(poll); res({ ...fakeCollect(T.root, T.trace, { code, out }), sent, ms: Date.now() - t0 }); });
  });
}
function scenarioFromFixture() {
  const j = JSON.parse(readFileSync(join(FIX, 'watch-mixed', 'run.json'), 'utf8'));
  const rd = (n) => (existsSync(join(FIX, 'watch-mixed', n)) ? readFileSync(join(FIX, 'watch-mixed', n), 'utf8').split('\n').filter(Boolean) : []);
  return j.reps.map((r) => ({
    t0: r.t0 + '456789', stamp2: r.stamp2 + '456789',
    pidsAtStart: r.watch.pid ? [r.watch.pid] : [], pidsAfter: r.watch.pidsAfter === 0 ? [] : [r.watch.samePid ? r.watch.pid : 4999],
    front: r.watch.front, events: rd('android-walk-coldstart-watch-' + String(r.rep).padStart(2, '0') + '-events.txt'),
    appLog: rd('android-walk-coldstart-watch-' + String(r.rep).padStart(2, '0') + '.txt'),
  }));
}
{
  const sc = scenarioFromFixture();
  const X = fakeRun(sc);
  const shells = X.trace.map((a) => (a[0] === '-s' ? a.slice(2) : a)).filter((a) => a[0] === 'shell' || a[0] === 'pull' || a[0] === 'UNKNOWN');
  const cmds = shells.map((a) => (a[0] === 'shell' ? a[1] : a.join(' ')));
  const iStart = cmds.map((c, i) => (c.startsWith('date +%m-%dT%H:%M:%S.%N; am start -W') ? i : -1)).filter((i) => i >= 0);
  const iClear = cmds.map((c, i) => (c === 'logcat -c' ? i : -1)).filter((i) => i >= 0);
  const orderOk = [1, 2, 3, 4].every((k) => {   // reps 2..5 (index 1..4) are not proven
    const s = iStart[k], next = iClear.find((i) => i > s) ?? cmds.length;
    const seg = cmds.slice(s, next);
    const ev = seg.indexOf(EXPECT_CMD), pl = seg.findIndex((c, i) => i > ev && c.startsWith('pull /data/local/tmp/adbwalk-log.txt ') && c.endsWith('-events.txt')), rm = seg.findIndex((c, i) => i > pl && c === 'rm -f /data/local/tmp/adbwalk-log.txt');
    const lg = seg.findIndex((c) => c.startsWith('logcat -d --pid='));
    const pidAt = sc[k].pidsAtStart.length === 1;
    return ev > seg.indexOf('date +%m-%dT%H:%M:%S.%N; pidof ' + PKG) && pl > ev && rm > pl && (pidAt ? lg > rm && seg.some((c) => c.startsWith('pull ') && c.endsWith('coldstart-watch-0' + (k + 1) + '.txt')) : lg < 0);
  });
  const frontRepClean = (() => { const s = iStart[0], e = iStart[1]; return !cmds.slice(s, e).some((c) => c.startsWith('logcat -d')); })();
  const w2 = X.run && X.run.reps[1] && X.run.reps[1].watch;
  const t = {
    exit0: X.code === 0,
    noUnknown: !X.trace.some((a) => a[0] === 'UNKNOWN'),
    noInput: !cmds.some((c) => /^input (tap|swipe|text)|keyevent 4|screencap/.test(c)),
    eventsExact: cmds.filter((c) => c.startsWith('logcat -d -b')).every((c) => c === EXPECT_CMD) && cmds.filter((c) => c === EXPECT_CMD).length === 4,
    evidenceBeforeClear: orderOk,
    frontRepNoPull: frontRepClean,
    waitInRunJson: X.run && X.run.coldstartWatch && X.run.coldstartWatch.waitSec === 1,
    watchFacts: !!w2 && w2.pid === 4302 && w2.pidsAfter === 0 && w2.pidInAfter === false && w2.samePid === false && w2.front === false && w2.proven === false && w2.eventsPull === 'ok' && w2.logPull === 'ok' && X.run.reps[1].log === 'android-walk-coldstart-watch-02.txt',
    noPidRep: !!X.run && X.run.reps[4].watch.logPull === 'nopid' && !('pid' in X.run.reps[4].watch) && !('log' in X.run.reps[4]),
    rows: (() => { const R = { rows: X.rows, md: X.md, csv: X.csv, code: X.code, dir: X.dir }; const c = checkMixed(R, 'in front after 1 s'); delete c.filesListed; return F(c).length === 0 || JSON.stringify(F(c)); })(),
  };
  ok('g6a fakeAdb: the real driver, 5 starts (front, death, kill, alive, no pid)', F(t).length === 0, JSON.stringify(F(t)) + '\n' + X.out.slice(-1500));
  const sc2 = sc.slice(0, 2).map((r) => ({ ...r })); sc2[1].eventsFail = true;
  const Y = fakeRun(sc2);
  const r2 = Y.run && Y.run.reps[1];
  const t2 = { exit2: Y.code === 2, repError: !!r2 && r2.status === 'error' && r2.watch.eventsPull === 'failed', noData: Y.rows.filter((r) => r.step === 'coldstart-watch').every((r) => r.median === 'no data'), appLogStillPulled: !!r2 && r2.watch.logPull === 'ok' };
  ok('g6b fakeAdb: a failed events pull -> the rep is an error, every row no data, exit 2', F(t2).length === 0, JSON.stringify(F(t2)) + '\n' + Y.out.slice(-800));
  const cmdsOf = (X) => X.trace.map((a) => (a[0] === '-s' ? a.slice(2) : a)).filter((a) => a[0] === 'shell' || a[0] === 'pull').map((a) => (a[0] === 'shell' ? a[1] : a.join(' ')));
  // #46 r1 F-4: a transient IO error of walk.log right after the stamp2 + pidof of rep 2 (Write-WalkLog throws inside Invoke-Adb): the
  // finally still saves the events and the app log of that start, BEFORE the next logcat -c; the rep is an error; no data, exit 2.
  const sc3 = sc.slice(0, 3).map((r) => ({ ...r })); sc3[1].breakLog = true;
  const Z = fakeRun(sc3);
  const zc = cmdsOf(Z);
  const zStart = zc.map((c, i) => (c.startsWith('date +%m-%dT%H:%M:%S.%N; am start -W') ? i : -1)).filter((i) => i >= 0);
  const zSeg = zc.slice(zStart[1], zc.indexOf('logcat -c', zStart[1]));
  const r3 = Z.run && Z.run.reps[1];
  const t3 = {
    logWasBroken: Z.trace.some((a) => a[0] === 'LOGBROKEN') && Z.trace.some((a) => a[0] === 'LOGBACK'),
    exit2: Z.code === 2,
    repError: !!r3 && r3.status === 'error',
    eventsSaved: !!r3 && r3.watch.eventsPull === 'ok' && r3.watch.events === 'android-walk-coldstart-watch-02-events.txt' && !!Z.dir && existsSync(join(Z.dir, 'android-walk-coldstart-watch-02-events.txt')),
    appLogSaved: !!r3 && r3.watch.logPull === 'ok' && !!Z.dir && existsSync(join(Z.dir, 'android-walk-coldstart-watch-02.txt')),
    beforeNextClear: zSeg.includes(EXPECT_CMD) && zSeg.some((c) => c.startsWith('logcat -d --pid=4302 ')) && zc.indexOf('logcat -c', zStart[1]) > 0,
    onceOnly: zSeg.filter((c) => c === EXPECT_CMD).length === 1,
    nextRepRan: !!Z.run && Z.run.reps.length === 3 && Z.run.reps[2].status === 'ok',
    factLine: Z.md.includes('- rep 2: no data (status error)'),
  };
  ok('g6c fakeAdb F-4: an IO error of walk.log after the start -> the finally saves the evidence once, before the next logcat -c; rep error, exit 2', F(t3).length === 0, JSON.stringify(F(t3)) + '\n' + JSON.stringify(zSeg) + '\n' + Z.out.slice(-1200));
  // #46 r1 F-1 / F-7 / F-2 in the driver: rep 1 the first pidof answers stderr text + exit 1 once (read again: proven, ok); rep 2 twice
  // (the rep is an error, no pid: the events are still saved); rep 3 the events write exits 1 WITH stderr text (= failed, not "no
  // lines"); rep 4 P and another pid after the wait (pidInAfter true, samePid false).
  const sc4 = [{ ...sc[0], pidofFail: 1 }, { ...sc[1], pidofFail: 2 }, { ...sc[2], eventsErr1: true }, { ...sc[3], pidsAfter: [4304, 4399] }];
  const V = fakeRun(sc4);
  const vr = (V.run && V.run.reps) || [];
  const vc = cmdsOf(V);
  const vStart = vc.map((c, i) => (c.startsWith('date +%m-%dT%H:%M:%S.%N; am start -W') ? i : -1)).filter((i) => i >= 0);
  const pidofIn = (k) => vc.slice(vStart[k], vStart[k + 1] ?? vc.length).filter((c) => c === 'pidof ' + PKG).length;
  const t4 = {
    retryOk: vr[0] && vr[0].status === 'ok' && vr[0].watch.proven === true && vr[0].watch.pid === 4301 && /pidof after the start not readable \(exit 1\), read again/.test(vr[0].note) && pidofIn(0) === 2,
    twiceIsError: vr[1] && vr[1].status === 'error' && !('pid' in vr[1].watch) && vr[1].watch.pidsAtStart === 0 && vr[1].watch.eventsPull === 'ok' && vr[1].watch.logPull === 'nopid' && /pidof after the start failed \(exit 1\)/.test(vr[1].note) && pidofIn(1) === 2,
    exit1WithStderrFails: vr[2] && vr[2].status === 'error' && vr[2].watch.eventsPull === 'failed' && /events pull: filtered write failed \(exit 1\)/.test(vr[2].note),
    pidInAfter: vr[3] && vr[3].watch.pidInAfter === true && vr[3].watch.samePid === false && vr[3].watch.pidsAfter === 2 && /more than one pid after the wait/.test(vr[3].note) && vr[0].watch.pidInAfter === true && vr[2].watch.pidInAfter === false,
    exit2: V.code === 2,
  };
  ok('g6e fakeAdb F-1 / F-7 / F-2: a pidof with stderr text is read once more, twice = rep error; exit 1 with stderr on the events write = failed; pidInAfter recorded', F(t4).length === 0, JSON.stringify(F(t4)) + '\n' + JSON.stringify(vr.map((r) => [r.status, r.note, r.watch])));
  // #46 r1 F-4: Ctrl+C in the fixed wait of a start that dies (rep 1 = the death rep of the fixture): the finally of the rep saves the
  // evidence before the driver's own finally restores the phone.
  const Q = await fakeRunSigint([sc[1], sc[0]]);
  const qc = cmdsOf(Q);
  const qDir = Q.dir;
  const t5 = {
    signalSent: Q.sent,
    eventsSaved: qc.includes(EXPECT_CMD) && !!qDir && existsSync(join(qDir, 'android-walk-coldstart-watch-01-events.txt')),
    appLogSaved: qc.some((c) => c.startsWith('logcat -d --pid=4302 ')) && !!qDir && existsSync(join(qDir, 'android-walk-coldstart-watch-01.txt')),
    noSecondStart: qc.filter((c) => c.startsWith('date +%m-%dT%H:%M:%S.%N; am start -W')).length === 1,
    noStamp2: !qc.includes('date +%m-%dT%H:%M:%S.%N; pidof ' + PKG),
  };
  ok('g6d fakeAdb F-4: Ctrl+C (SIGINT, pwsh 7 on Linux) in the fixed wait -> the evidence of that start is still saved', F(t5).length === 0, JSON.stringify(F(t5)) + ' ' + Q.ms + ' ms\n' + JSON.stringify(qc.slice(-12)) + '\n' + Q.out.slice(-800));
}

/* ───────────── g7 the refusals at load time (a recording fake adb must see NO call) */
{
  const one = (args, re) => {
    const X = fakeRun([{ t0: '', stamp2: '', pidsAtStart: [], pidsAfter: [], front: false, events: [], appLog: [] }], args, false);
    return X.code === 1 && re.test(X.out) && X.trace.length === 0;
  };
  const t = {
    calibrate: one(['-Steps', 'coldstart-watch', '-Calibrate'], /adb-walk: the step coldstart-watch cannot be used with -Calibrate/),
    flags: one(['-Steps', 'coldstart-watch', '-Flags', 'warmidle=0,sparerearm=0,sparekeep=0,noemptydetail=0'], /adb-walk: the step coldstart-watch cannot be combined with -Flags/),
    repeats51: one(['-Steps', 'coldstart-watch', '-Repeats', '51'], /adb-walk: -Repeats must be 1\.\.50/),
    calibrateWithOtherSteps: (() => { const X = fakeRun([{ t0: '', stamp2: '', pidsAtStart: [], pidsAfter: [], front: false, events: [], appLog: [] }], ['-Steps', 'coldstart,coldstart-watch', '-Calibrate'], false); return X.code === 1 && X.trace.length === 0; })(),
  };
  // -Repeats 50 in a temp tree (the script reads a52s.json next to itself), stopped right after the argument and map checks by a missing ADBWALK_ADB file.
  const r50 = (() => {
    const root = mkdtempSync(join(work, 'r50-'));
    mkdirSync(join(root, 'scripts', 'device'), { recursive: true });
    copyFileSync(WALK, join(root, 'scripts', 'device', 'adb-walk.ps1'));
    copyFileSync(MAP, join(root, 'scripts', 'device', 'a52s.json'));
    return pw(['-File', join(root, 'scripts', 'device', 'adb-walk.ps1'), '-Steps', 'coldstart-watch', '-Repeats', '50'], { ADBWALK_ADB: join(root, 'no-such-adb') }, root);
  })();
  t.repeats50Passes = r50.code === 1 && /adb-walk: ADBWALK_ADB names no file/.test(r50.out);
  ok('g7 refusals: -Calibrate / -Flags / -Repeats 51 = usage error, no adb call; -Repeats 50 passes the checks', F(t).length === 0, JSON.stringify(F(t)) + ' ' + r50.out.slice(0, 300));
}

/* ───────────── g8 screens.home in the sets form */
const HARNESS_C = String.raw`param([string]$Script, [string]$CasesFile, [string]$OutFile)
$ErrorActionPreference = 'Stop'
$script:W = 1080
$script:H = 2400
$tokens = $null; $errs = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Script, [ref]$tokens, [ref]$errs)
$want = @('Get-Field', 'Test-HasField', 'Test-IsInt', 'Test-OnScreen', 'Get-ProbeListGap', 'Get-ScreenGap', 'Get-ScreenProbeSets', 'Test-ProbeSetPixels', 'Get-ProbeVerdict', 'Test-Probes', 'Test-Screen', 'Get-PngSize')
foreach ($f in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
    if ($want -contains $f.Name) {
        $txt = $f.Extent.Text
        if ($f.Name -eq 'Test-Probes') { $p = $txt.Replace('New-Object System.Drawing.Bitmap($ms)', '$script:StubBmp'); if ($p -eq $txt) { throw 'the bitmap line of Test-Probes was not found' }; $txt = $p }
        Invoke-Expression $txt
    }
}
function Initialize-Drawing { return $true }
function Write-FakePng([string]$Path, [int]$w, [int]$h) {
    $b = New-Object byte[] 64
    $sig = @(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82)
    for ($i = 0; $i -lt 16; $i++) { $b[$i] = $sig[$i] }
    $b[16] = [byte](($w -shr 24) -band 255); $b[17] = [byte](($w -shr 16) -band 255); $b[18] = [byte](($w -shr 8) -band 255); $b[19] = [byte]($w -band 255)
    $b[20] = [byte](($h -shr 24) -band 255); $b[21] = [byte](($h -shr 16) -band 255); $b[22] = [byte](($h -shr 8) -band 255); $b[23] = [byte]($h -band 255)
    [System.IO.File]::WriteAllBytes($Path, $b)
}
$cases = Get-Content -Raw -LiteralPath $CasesFile | ConvertFrom-Json
$png = Join-Path ([System.IO.Path]::GetTempPath()) ('walktools2-c-' + [guid]::NewGuid().ToString('N') + '.png')
$out = @()
try {
    foreach ($c in $cases) {
        $r = [ordered]@{ id = $c.id }
        $script:Cfg = [pscustomobject]@{ screens = $c.screens }
        $r['gap'] = [string](Get-ScreenGap $c.screen)
        if ($c.PSObject.Properties['image']) {
            $script:Image = $c.image
            $script:StubBmp = New-Object psobject
            $script:StubBmp | Add-Member -MemberType ScriptMethod -Name GetPixel -Value { param($x, $y); $p = $script:Image.PSObject.Properties[[string]$x + ',' + [string]$y]; if ($p) { $hex = [string]$p.Value } else { $hex = [string]$script:Image.default }; return [pscustomobject]@{ R = [Convert]::ToInt32($hex.Substring(1, 2), 16); G = [Convert]::ToInt32($hex.Substring(3, 2), 16); B = [Convert]::ToInt32($hex.Substring(5, 2), 16) } }
            $script:StubBmp | Add-Member -MemberType ScriptMethod -Name Dispose -Value { }
            $pw = 1080; if ($c.PSObject.Properties['pngW']) { $pw = [int]$c.pngW }
            Write-FakePng $png $pw 2400
            $pr = Test-Probes $png $c.screen
            $r['probes'] = [ordered]@{ ok = [bool]$pr.Ok; note = [string]$pr.Note; matched = $pr.Matched; of = $pr.Of; set = [string]$pr.Set; detail = $pr.Detail }
            $sc = Test-Screen $png $c.screen
            $r['screen'] = [ordered]@{ ok = [bool]$sc.Ok; note = [string]$sc.Note }
        }
        $out += $r
    }
} finally { if (Test-Path -LiteralPath $png) { Remove-Item -LiteralPath $png -Force } }
[System.IO.File]::WriteAllText($OutFile, (ConvertTo-Json -InputObject $out -Depth 10))
`;
{
  const hp = join(work, 'harness-c.ps1'); writeFileSync(hp, HARNESS_C);
  const CUR = JSON.parse(readFileSync(MAP, 'utf8'));
  const baseMap = JSON.parse(gitShow('scripts/device/a52s.json') || readFileSync(MAP, 'utf8'));
  const oldHome = baseMap.screens.home;                       // the old form of home (the base map)
  const P = (x, y, rgb, tol) => ({ x, y, rgb, tol });
  const LIGHT = { name: 'light', probes: oldHome.probes, minMatch: oldHome.minMatch };   // light = today's three probes
  const DARK = { name: 'dark', probes: oldHome.probes.map((p, i) => P(p.x, p.y, ['#1B2333', '#16181B', '#5B7BE0'][i] || '#101010', p.tol)), minMatch: oldHome.probes.length };
  const scr = (home) => ({ ...baseMap.screens, home });
  const img = (probes) => Object.fromEntries(probes.map((p) => [p.x + ',' + p.y, p.rgb]).concat([['default', '#808080']]));
  const cases = [], expect = [];
  const add = (id, c, fn) => { cases.push({ id, ...c }); expect.push([id, fn]); };
  const HS = scr({ sets: [LIGHT, DARK] });
  add('valid light + dark', { screen: 'home', screens: HS }, (r) => r.gap === '');
  add('valid light only', { screen: 'home', screens: scr({ sets: [LIGHT] }) }, (r) => r.gap === '');
  add('both forms', { screen: 'home', screens: scr({ sets: [LIGHT], probes: oldHome.probes }) }, (r) => r.gap === 'screens.home holds sets and probes / minMatch (one form only)');
  add('3 sets', { screen: 'home', screens: scr({ sets: [LIGHT, DARK, LIGHT] }) }, (r) => r.gap === 'screens.home.sets must be a list of 1 or 2 sets');
  add('a name Dark', { screen: 'home', screens: scr({ sets: [LIGHT, { ...DARK, name: 'Dark' }] }) }, (r) => r.gap === 'screens.home.sets has a set whose name is not light or dark');
  add('duplicate light', { screen: 'home', screens: scr({ sets: [LIGHT, { ...LIGHT }] }) }, (r) => r.gap === 'screens.home.sets has the name light twice');
  add('a bad probe in dark', { screen: 'home', screens: scr({ sets: [LIGHT, { ...DARK, probes: [DARK.probes[0], { ...DARK.probes[1], rgb: 'nope' }, DARK.probes[2]] }] }) }, (r) => r.gap === 'screens.home.sets[dark] probe 2 is invalid');
  add('dark minMatch 4 of 3', { screen: 'home', screens: scr({ sets: [LIGHT, { ...DARK, minMatch: 4 }] }) }, (r) => r.gap === 'screens.home.sets[dark].minMatch is not 1..3');
  add('sets on chatinfo still refused', { screen: 'chatinfo', screens: { ...baseMap.screens, chatinfo: { sets: [LIGHT] } } }, (r) => r.gap === 'screens.chatinfo may not use sets (only home, chat and viewer)');
  add('sets on downloads still refused', { screen: 'downloads', screens: { ...baseMap.screens, downloads: { sets: [LIGHT] } } }, (r) => /may not use sets \(only home, chat and viewer\)/.test(r.gap));
  add('light pixels -> set light passes', { screen: 'home', screens: HS, image: img(LIGHT.probes) }, (r) => r.screen.ok && r.probes.set === 'light' && r.probes.matched === 3);
  add('dark pixels -> set dark passes', { screen: 'home', screens: HS, image: img(DARK.probes) }, (r) => r.screen.ok && r.probes.set === 'dark');
  add('dark pixels with the light set only -> fails', { screen: 'home', screens: scr({ sets: [LIGHT] }), image: img(DARK.probes) }, (r) => !r.screen.ok && r.screen.note === 'no set matches: light 0/3 (3)');
  add('gray -> no set matches, both counts', { screen: 'home', screens: HS, image: { default: '#808080' } }, (r) => !r.screen.ok && r.screen.note === 'no set matches: light 0/3 (3), dark 0/3 (3)' && r.probes.matched === null);
  add('chat pill white fails both home sets', { screen: 'home', screens: HS, image: { default: '#FFFFFF' } }, (r) => !r.screen.ok);
  add('detail names the set of each probe', { screen: 'home', screens: HS, image: img(LIGHT.probes) }, (r) => r.probes.detail.length === 6 && r.probes.detail.filter((d) => d.set === 'dark').length === 3);
  // the old form of home on the base script and on this one: equal
  const OLD = [];
  const off = { ...img(oldHome.probes) }; const p0 = oldHome.probes[0]; off[p0.x + ',' + p0.y] = '#000000';
  for (const [id, c] of [['old exact', { image: img(oldHome.probes) }], ['old one off', { image: off }], ['old gray', { image: { default: '#808080' } }], ['old size', { image: img(oldHome.probes), pngW: 1000 }], ['old minMatch 0', {}, 0]]) {
    const s = id === 'old minMatch 0' ? scr({ ...oldHome, minMatch: 0 }) : baseMap.screens;
    cases.push({ id, screen: 'home', screens: s, ...c }); OLD.push(id);
  }
  const cf = join(work, 'cases-c.json'); writeFileSync(cf, JSON.stringify(cases));
  const run = (script, tag) => { const of = join(work, 'out-c-' + tag + '.json'); const r = pw(['-File', hp, '-Script', script, '-CasesFile', cf, '-OutFile', of]); try { return Object.fromEntries(JSON.parse(readFileSync(of, 'utf8')).map((x) => [x.id, x])); } catch { console.log(r.out.slice(0, 800)); return null; } };
  const N = run(WALK, 'new'), B = run(BASE_WALK, 'base');
  if (!N || !B) ok('g8 homeSets', false, 'harness failed');
  else {
    const bad = expect.filter(([id, fn]) => { try { return !fn(N[id]); } catch { return true; } }).map(([id]) => id + ' ' + JSON.stringify(N[id]));
    const norm = (x) => JSON.stringify({ gap: x.gap, probes: x.probes && { ok: x.probes.ok, note: x.probes.note, matched: x.probes.matched, of: x.probes.of, detail: x.probes.detail }, screen: x.screen });
    const oldBad = OLD.filter((id) => norm(N[id]) !== norm(B[id]));
    const baseRefusedHomeSets = /may not use sets \(only chat and viewer\)/.test(B['valid light + dark'].gap);
    ok('g8a homeSets: the sets form of screens.home (' + expect.length + ' cases) and the old form equal to the base (' + OLD.length + ')', bad.length === 0 && oldBad.length === 0 && baseRefusedHomeSets, JSON.stringify(bad) + ' old: ' + JSON.stringify(oldBad));
  }
  // load time: the real script with a modified map in a temp tree, stopped right after the map checks by a missing ADBWALK_ADB file.
  const load = (screens) => {
    const root = mkdtempSync(join(work, 'load-'));
    mkdirSync(join(root, 'scripts', 'device'), { recursive: true });
    copyFileSync(WALK, join(root, 'scripts', 'device', 'adb-walk.ps1'));
    const m = JSON.parse(readFileSync(MAP, 'utf8')); m.screens = screens;
    writeFileSync(join(root, 'scripts', 'device', 'a52s.json'), JSON.stringify(m));
    return pw(['-File', join(root, 'scripts', 'device', 'adb-walk.ps1'), '-Steps', 'coldstart'], { ADBWALK_ADB: join(root, 'no-such-adb') }, root);
  };
  const a = load(scr({ sets: [LIGHT, DARK] })), b = load({ ...baseMap.screens, chatinfo: { sets: [LIGHT] } });
  const c = load(scr({ sets: [{ name: 'light', probes: Array.from({ length: 17 }, (_, i) => P(10 + i, 20, '#FFFFFF', 2)), minMatch: 1 }] })), d = load(baseMap.screens);
  const e = load(CUR.screens);
  const t = {
    homeSetsPass: a.code === 1 && /ADBWALK_ADB names no file/.test(a.out) && !/a52s\.json screens\./.test(a.out),
    chatinfoRefused: b.code === 1 && /adb-walk: a52s\.json screens\.chatinfo has sets: only screens\.home, screens\.chat and screens\.viewer may use sets/.test(b.out),
    seventeen: c.code === 1 && /a52s\.json screens\.home has a set with more than 16 probes/.test(c.out),
    oldMapPasses: d.code === 1 && /ADBWALK_ADB names no file/.test(d.out),
    repoMapPasses: e.code === 1 && /ADBWALK_ADB names no file/.test(e.out),
  };
  ok('g8b homeSets at load time (home sets pass; sets on chatinfo and a 17-probe home set refused; the base map and the repo map pass)', F(t).length === 0, JSON.stringify(F(t)) + ' ' + a.out.slice(0, 200) + ' | ' + b.out.slice(0, 200));
}

const failed = results.filter((r) => !r[1]);
console.log('\nRESULT pass=' + (results.length - failed.length) + ' fail=' + failed.length);
process.exit(failed.length ? 1 : 0);
