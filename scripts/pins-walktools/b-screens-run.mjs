#!/usr/bin/env node
/* ==== walktools · B (BY HAND) — runs the REAL functions of scripts/device/adb-walk.ps1 on PowerShell 7 and prints PASS / FAIL per case.
 *
 *   node scripts/pins-walktools/b-screens-run.mjs [--pwsh /usr/local/bin/pwsh] [--old <adb-walk.ps1 of the base>] [--new <adb-walk.ps1 to test>]
 *
 * NEEDS pwsh (PowerShell 7). It is NOT part of the node smoke (the twin has no pwsh): the in-smoke pin is b-screens.mjs (source text only).
 * Exit code 0 = every case PASS, 1 = a FAIL, 2 = no pwsh / no base file.
 *
 * What it does. A pwsh harness parses the script (the parse gate: 0 errors), takes the screen functions out of it BY AST (Get-Field,
 * Test-HasField, Test-IsInt, Test-OnScreen, Get-ProbeListGap, Get-ScreenGap, Get-ScreenProbeSets, Test-ProbeSetPixels, Get-ProbeVerdict,
 * Test-Probes, Test-Screen, Get-PngSize) and runs them on map objects read from JSON. The ONE test-time patch: in the text of Test-Probes
 * the line `New-Object System.Drawing.Bitmap($ms)` becomes a stub bitmap (System.Drawing does not work on Linux) whose GetPixel reads a
 * { "x,y": "#RRGGBB" } image of the case; Initialize-Drawing is a stub too. So the PNG BYTES are never decoded here; everything after the
 * pixel read (the pure decision, the sets, the notes, the result of Test-Screen) is the real code.
 *   group 1 (OLD FORM, parity): the six real screens of scripts/device/a52s.json and a set of broken old-form maps run through the script of the
 *     BASE (git 338d30f4, or --old) and through this tree: the gap text, the Test-Probes result and the Test-Screen result must be equal.
 *   group 2 (SETS): the validator (valid / both forms / unknown name / duplicate / 5 sets / sets on another screen / accountScrolled) and the
 *     decision (light passes / dark passes / none passes / the proposed values of docs/walktools-mechanisms.md section 2 against the pixels listed
 *     there: home #F9FAFB at the pill points FAILS the chat sets, the pill #FFFFFF passes, dark #1E2023 passes the dark set, the viewer values).
 *   group 3 (LOAD TIME): the real script, started on a copy with a modified a52s.json: sets on another screen / accountScrolled with sets is a
 *     usage error that names the screen and sends no adb command (the run ends before any adb call: the output holds no adb text).
 * NOT proven here: Windows PowerShell 5.1; the PNG decode (System.Drawing) and a real phone; the exception path of the pixel read after the
 * first probe (the old code kept a partial Matched count there, the new code gives 0: a read failure is "cannot read PNG", never a number). */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const PWSH = arg('--pwsh', 'pwsh');
const NEW = arg('--new', join(root, 'scripts', 'device', 'adb-walk.ps1'));   // --new <file>: run a mutated copy (a deliberate break)
const tmp = mkdtempSync(join(tmpdir(), 'walktools-b-'));
const cleanup = () => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* by hand tool */ } };

const probe = spawnSync(PWSH, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'], { encoding: 'utf8' });
if (probe.error || probe.status !== 0) { console.log('b-screens-run: this tool NEEDS pwsh (PowerShell 7); "' + PWSH + '" did not run. Pass --pwsh <path>.'); cleanup(); process.exit(2); }
console.log('pwsh ' + probe.stdout.trim());

// the script of the BASE (before this batch)
let OLD = arg('--old', '');
if (!OLD) {
  const g = spawnSync('git', ['-C', root, 'show', '338d30f4:scripts/device/adb-walk.ps1'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (g.status !== 0) { console.log('b-screens-run: cannot read the base script (git show 338d30f4:...). Pass --old <adb-walk.ps1 of the base>.'); cleanup(); process.exit(2); }
  OLD = join(tmp, 'adb-walk-base.ps1');
  writeFileSync(OLD, g.stdout);
}

// ───────────────────────────────────────────── the pwsh harness (written to the temp folder)
const HARNESS = String.raw`param([string]$Script, [string]$CasesFile, [string]$OutFile)
$ErrorActionPreference = 'Stop'
$script:W = 1080
$script:H = 2400
$tokens = $null; $errs = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Script, [ref]$tokens, [ref]$errs)
$out = [ordered]@{ parseErrors = @($errs).Count; loaded = @(); cases = @() }
$want = @('Get-Field', 'Test-HasField', 'Test-IsInt', 'Test-OnScreen', 'Get-ProbeListGap', 'Get-ScreenGap', 'Get-ScreenProbeSets', 'Test-ProbeSetPixels', 'Get-ProbeVerdict', 'Test-Probes', 'Test-Screen', 'Get-PngSize', 'Get-SafeNote', 'Get-ErrText', 'Get-PreCheckText')
$fns = $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)
foreach ($f in $fns) {
    if ($want -contains $f.Name) {
        $txt = $f.Extent.Text
        if ($f.Name -eq 'Test-Probes') {
            $patched = $txt.Replace('New-Object System.Drawing.Bitmap($ms)', '$script:StubBmp')
            if ($patched -eq $txt) { throw 'the bitmap line of Test-Probes was not found' }
            $txt = $patched
        }
        Invoke-Expression $txt
        $out.loaded += $f.Name
    }
}
function Initialize-Drawing { return [bool]$script:DrawingOk }
function Protect-Text([string]$Text) { if ($null -eq $Text) { return '' }; return $Text }   # the real one masks serials / seeds / paths: not needed for lengths
function Write-FakePng([string]$Path, [int]$w, [int]$h) {
    $b = New-Object byte[] 64
    $sig = @(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82)
    for ($i = 0; $i -lt 16; $i++) { $b[$i] = $sig[$i] }
    $b[16] = [byte](($w -shr 24) -band 255); $b[17] = [byte](($w -shr 16) -band 255); $b[18] = [byte](($w -shr 8) -band 255); $b[19] = [byte]($w -band 255)
    $b[20] = [byte](($h -shr 24) -band 255); $b[21] = [byte](($h -shr 16) -band 255); $b[22] = [byte](($h -shr 8) -band 255); $b[23] = [byte]($h -band 255)
    [System.IO.File]::WriteAllBytes($Path, $b)
}
$cases = Get-Content -Raw -LiteralPath $CasesFile | ConvertFrom-Json
$png = Join-Path ([System.IO.Path]::GetTempPath()) ('walktools-b-' + [guid]::NewGuid().ToString('N') + '.png')
try {
    foreach ($c in $cases) {
        $r = [ordered]@{ id = $c.id }
        $script:Cfg = [pscustomobject]@{ screens = $c.screens }
        $r['gap'] = [string](Get-ScreenGap $c.screen)
        if ($c.PSObject.Properties['image']) {
            $script:Image = $c.image
            $script:DrawingOk = -not ($c.PSObject.Properties['noDrawing'] -and $c.noDrawing)
            $script:StubBmp = New-Object psobject
            $script:StubBmp | Add-Member -MemberType ScriptMethod -Name GetPixel -Value {
                param($x, $y)
                $p = $script:Image.PSObject.Properties[[string]$x + ',' + [string]$y]
                if ($script:Image.PSObject.Properties['throw']) { throw 'stub: pixel read failed' }
                if ($p) { $hex = [string]$p.Value } else { $hex = [string]$script:Image.default }
                return [pscustomobject]@{ R = [Convert]::ToInt32($hex.Substring(1, 2), 16); G = [Convert]::ToInt32($hex.Substring(3, 2), 16); B = [Convert]::ToInt32($hex.Substring(5, 2), 16) }
            }
            $script:StubBmp | Add-Member -MemberType ScriptMethod -Name Dispose -Value { }
            $pw = 1080; $ph = 2400
            if ($c.PSObject.Properties['pngW']) { $pw = [int]$c.pngW }
            Write-FakePng $png $pw $ph
            $pr = Test-Probes $png $c.screen
            $r['probes'] = [ordered]@{ ok = [bool]$pr.Ok; note = [string]$pr.Note; matched = $pr.Matched; of = $pr.Of; set = [string]$pr.Set; sets = $pr.Sets; detail = $pr.Detail }
            $sc = Test-Screen $png $c.screen
            $r['screen'] = [ordered]@{ ok = [bool]$sc.Ok; note = [string]$sc.Note; set = [string]$sc.Set; sets = $sc.Sets }
            # the rep note a failed check leaves, as Complete-Rep writes it: the notes of the rep joined by ', ' and cut by Get-SafeNote (120)
            if ($c.PSObject.Properties['rep'] -and (Get-Command Get-PreCheckText -ErrorAction SilentlyContinue)) {
                $parts = @($c.rep.prefix)
                if ($c.rep.kind -eq 'pre') {
                    $left = ' (PNG deleted)'
                    if ($c.rep.PSObject.Properties['left']) { $left = [string]$c.rep.left }
                    $txt = Get-PreCheckText $c.screen $sc $left
                    $parts += @(Get-ErrText ([pscustomobject]@{ Exception = (New-Object System.Exception($txt)) }))
                } else { $parts += @([string]$sc.Note) }
                $full = $parts -join ', '
                $safe = Get-SafeNote $full
                $r['rep'] = [ordered]@{ full = $full; fullLen = $full.Length; note = $safe; len = $safe.Length }
            }
        }
        $out.cases += $r
    }
} finally { if (Test-Path -LiteralPath $png) { Remove-Item -LiteralPath $png -Force } }
$json = ConvertTo-Json -InputObject $out -Depth 10
[System.IO.File]::WriteAllText($OutFile, $json)
`;
const harnessPath = join(tmp, 'harness.ps1');
writeFileSync(harnessPath, HARNESS);

// ───────────────────────────────────────────── the cases
const REAL = JSON.parse(readFileSync(join(root, 'scripts', 'device', 'a52s.json'), 'utf8'));
const P = (x, y, rgb, tol = 2) => ({ x, y, rgb, tol });
const img = (pts, color, extra = {}) => ({ ...Object.fromEntries(pts.map(([x, y]) => [x + ',' + y, color])), default: '#808080', ...extra });
const pill = [[380, 2278], [560, 2278], [760, 2278]];
const CHAT_L = { name: 'light', probes: pill.map(([x, y]) => P(x, y, '#FFFFFF', 2)), minMatch: 3 };
const CHAT_D = { name: 'dark', probes: pill.map(([x, y]) => P(x, y, '#1E2023', 2)), minMatch: 3 };
const VIEW_PTS = [[540, 2240], [380, 2278], [760, 2278], [600, 230]];
const viewSet = (name, cols) => ({ name, probes: VIEW_PTS.map(([x, y], i) => P(x, y, cols[i], 3)), minMatch: 4 });
const VIEW_L = viewSet('light', ['#646565', '#4F5050', '#4F5050', '#4C4E4F']);
const VIEW_D = viewSet('dark', ['#2F3031', '#131415', '#131415', '#111213']);
const viewImg = (cols) => Object.fromEntries(VIEW_PTS.map(([x, y], i) => [x + ',' + y, cols[i]]).concat([['default', '#808080']]));
const withScreens = (over) => ({ ...REAL.screens, ...over });
const chatMap = (chat) => withScreens({ chat });
const viewerMap = (viewer) => withScreens({ viewer });

const cases = [];
const add = (c) => { cases.push(c); return c.id; };

// group 1: the old form, run on the base and on this tree
const OLDIDS = [];
for (const [name, scr] of Object.entries(REAL.screens)) {
  const pts = scr.probes.map((p) => [p.x, p.y]);
  const exact = Object.fromEntries(scr.probes.map((p) => [p.x + ',' + p.y, p.rgb]).concat([['default', '#808080']]));
  const off = { ...exact }; const p0 = scr.probes[0]; const r = parseInt(p0.rgb.slice(1, 3), 16);
  off[p0.x + ',' + p0.y] = '#' + (r + p0.tol + 1 > 255 ? r - p0.tol - 1 : r + p0.tol + 1).toString(16).padStart(2, '0').toUpperCase() + p0.rgb.slice(3);
  OLDIDS.push(add({ id: 'old/' + name + '/exact', screen: name, screens: REAL.screens, image: exact }));
  OLDIDS.push(add({ id: 'old/' + name + '/one-probe-off-by-tol+1', screen: name, screens: REAL.screens, image: off }));
  OLDIDS.push(add({ id: 'old/' + name + '/all-gray', screen: name, screens: REAL.screens, image: { default: '#808080' } }));
  if (pts.length) OLDIDS.push(add({ id: 'old/' + name + '/size-mismatch', screen: name, screens: REAL.screens, image: exact, pngW: 1000 }));
}
const oc = REAL.screens.chat;
const bad = (id, chat) => OLDIDS.push(add({ id: 'old/gap/' + id, screen: 'chat', screens: chatMap(chat) }));
bad('x-is-text', { probes: [{ ...oc.probes[0], x: 'a' }, oc.probes[1]], minMatch: 2 });
bad('rgb-not-hex', { probes: [{ ...oc.probes[0], rgb: 'red' }, oc.probes[1]], minMatch: 2 });
bad('rgb-lowercase-ok', { probes: [{ ...oc.probes[0], rgb: '#0e7a55' }, oc.probes[1]], minMatch: 2 });
bad('tol-300', { probes: [{ ...oc.probes[0], tol: 300 }, oc.probes[1]], minMatch: 2 });
bad('x-off-screen', { probes: [{ ...oc.probes[0], x: 5000 }, oc.probes[1]], minMatch: 2 });
bad('placeholder', { probes: [{ x: 0, y: 0, rgb: '#000000', tol: 0 }], minMatch: 1 });
bad('minMatch-0', { probes: oc.probes, minMatch: 0 });
bad('minMatch-3-of-2', { probes: oc.probes, minMatch: 3 });
bad('minMatch-absent', { probes: oc.probes });
bad('probes-empty', { probes: [], minMatch: 1 });
bad('no-probes-key', { minMatch: 1 });
OLDIDS.push(add({ id: 'old/gap/screen-absent', screen: 'nosuch', screens: REAL.screens }));
OLDIDS.push(add({ id: 'old/chat/cannot-read-png', screen: 'chat', screens: REAL.screens, image: img([[954, 2278], [1030, 2278]], '#0E7A55'), noDrawing: true }));
OLDIDS.push(add({ id: 'old/chat/pixel-read-throws', screen: 'chat', screens: REAL.screens, image: img([[954, 2278], [1030, 2278]], '#0E7A55', { throw: true }) }));

// group 2: the sets form (this tree only)
const NEWIDS = [];
const nc = (id, c, expect) => { add({ id, ...c }); NEWIDS.push([id, expect]); };
const both = chatMap({ sets: [CHAT_L, CHAT_D] });
nc('sets/validator/light+dark valid', { screen: 'chat', screens: both }, (r) => r.gap === '');
nc('sets/validator/one set valid', { screen: 'chat', screens: chatMap({ sets: [CHAT_L] }) }, (r) => r.gap === '');
nc('sets/validator/viewer valid', { screen: 'viewer', screens: viewerMap({ sets: [VIEW_L, VIEW_D] }) }, (r) => r.gap === '');
nc('sets/validator/both forms: sets + probes', { screen: 'chat', screens: chatMap({ sets: [CHAT_L], probes: oc.probes }) }, (r) => /one form only/.test(r.gap));
nc('sets/validator/both forms: sets + minMatch', { screen: 'chat', screens: chatMap({ sets: [CHAT_L], minMatch: 2 }) }, (r) => /one form only/.test(r.gap));
nc('sets/validator/unknown set name', { screen: 'chat', screens: chatMap({ sets: [{ ...CHAT_L, name: 'sepia' }] }) }, (r) => /not light or dark/.test(r.gap));
nc('sets/validator/name Light (case) refused', { screen: 'chat', screens: chatMap({ sets: [{ ...CHAT_L, name: 'Light' }] }) }, (r) => /not light or dark/.test(r.gap));
nc('sets/validator/name missing', { screen: 'chat', screens: chatMap({ sets: [{ probes: CHAT_L.probes, minMatch: 3 }] }) }, (r) => /not light or dark/.test(r.gap));
nc('sets/validator/duplicate name', { screen: 'chat', screens: chatMap({ sets: [CHAT_L, { ...CHAT_L }] }) }, (r) => /twice/.test(r.gap));
nc('sets/validator/3 sets (names cannot be unique)', { screen: 'chat', screens: chatMap({ sets: [CHAT_L, CHAT_D, CHAT_L] }) }, (r) => r.gap === 'screens.chat.sets must be a list of 1 or 2 sets');
nc('sets/validator/0 sets', { screen: 'chat', screens: chatMap({ sets: [] }) }, (r) => r.gap === 'screens.chat.sets must be a list of 1 or 2 sets');
nc('sets/validator/sets null', { screen: 'chat', screens: chatMap({ sets: null }) }, (r) => r.gap === 'screens.chat.sets must be a list of 1 or 2 sets');
nc('sets/validator/sets is an object', { screen: 'chat', screens: chatMap({ sets: CHAT_L }) }, (r) => r.gap === 'screens.chat.sets must be a list of 1 or 2 sets');
nc('sets/validator/sets is a string', { screen: 'viewer', screens: viewerMap({ sets: 'light' }) }, (r) => r.gap === 'screens.viewer.sets must be a list of 1 or 2 sets');
nc('sets/validator/sets null on home -> may not use sets', { screen: 'home', screens: withScreens({ home: { sets: null } }) }, (r) => /may not use sets/.test(r.gap));
nc('sets/validator/set with a bad probe', { screen: 'chat', screens: chatMap({ sets: [CHAT_L, { ...CHAT_D, probes: [CHAT_D.probes[0], { ...CHAT_D.probes[1], rgb: 'nope' }, CHAT_D.probes[2]] }] }) }, (r) => r.gap === 'screens.chat.sets[dark] probe 2 is invalid');
nc('sets/validator/set minMatch above its probes', { screen: 'chat', screens: chatMap({ sets: [{ ...CHAT_L, minMatch: 4 }] }) }, (r) => r.gap === 'screens.chat.sets[light].minMatch is not 1..3');
nc('sets/validator/set with no probes', { screen: 'chat', screens: chatMap({ sets: [{ name: 'light', probes: [], minMatch: 1 }] }) }, (r) => r.gap === 'screens.chat.sets[light] not calibrated (no probes)');
nc('sets/validator/set placeholder', { screen: 'chat', screens: chatMap({ sets: [{ name: 'light', probes: [{ x: 0, y: 0, rgb: '#000000', tol: 0 }], minMatch: 1 }] }) }, (r) => /placeholder/.test(r.gap));
nc('sets/validator/set probe off the screen', { screen: 'chat', screens: chatMap({ sets: [{ ...CHAT_L, probes: [P(5000, 10, '#FFFFFF'), ...CHAT_L.probes.slice(1)] }] }) }, (r) => /off the screen/.test(r.gap));
nc('sets/validator/sets on home (another screen)', { screen: 'home', screens: withScreens({ home: { sets: [CHAT_L] } }) }, (r) => /may not use sets/.test(r.gap));
nc('sets/validator/sets on downloads', { screen: 'downloads', screens: withScreens({ downloads: { sets: [CHAT_L] } }) }, (r) => /may not use sets/.test(r.gap));
nc('sets/validator/accountScrolled with sets', { screen: 'accountScrolled', screens: withScreens({ accountScrolled: { sets: [CHAT_L] } }) }, (r) => /may not use sets/.test(r.gap));
nc('sets/validator/accountScrolled old form still valid', { screen: 'accountScrolled', screens: REAL.screens }, (r) => r.gap === '');

const CH = chatMap({ sets: [CHAT_L, CHAT_D] });
nc('sets/decision/chat pill #FFFFFF -> light passes', { screen: 'chat', screens: CH, image: img(pill, '#FFFFFF') }, (r) => r.probes.ok && r.probes.set === 'light' && r.probes.matched === 3 && r.probes.of === 3 && r.screen.ok && r.screen.set === 'light' && r.screen.note === '');
nc('sets/decision/chat pill #1E2023 (dark) -> dark passes', { screen: 'chat', screens: CH, image: img(pill, '#1E2023') }, (r) => r.probes.ok && r.probes.set === 'dark' && r.screen.ok && r.screen.set === 'dark');
nc('sets/decision/home #F9FAFB at the pill points FAILS the chat sets', { screen: 'chat', screens: CH, image: img(pill, '#F9FAFB') }, (r) => !r.probes.ok && !r.screen.ok && r.probes.set === '' && r.probes.matched === null && r.probes.of === null && r.probes.note === 'no set matches: light 0/3 (3), dark 0/3 (3)' && r.screen.sets === 2 && r.probes.sets.length === 2);
nc('sets/decision/home #F9FAFB fails with the LIGHT set alone', { screen: 'chat', screens: chatMap({ sets: [CHAT_L] }), image: img(pill, '#F9FAFB') }, (r) => !r.screen.ok);
nc('sets/decision/chat info #F9FAFB (dark home #0F1113) fails', { screen: 'chat', screens: CH, image: img(pill, '#0F1113') }, (r) => !r.screen.ok);
nc('sets/decision/#FDFDFD (diff 2, tol 2) passes light', { screen: 'chat', screens: CH, image: img(pill, '#FDFDFD') }, (r) => r.screen.ok && r.screen.set === 'light');
nc('sets/decision/#FCFCFC (diff 3, tol 2) fails', { screen: 'chat', screens: CH, image: img(pill, '#FCFCFC') }, (r) => !r.screen.ok);
nc('sets/decision/2 of 3 light points -> fails, the note says 2 of 3', { screen: 'chat', screens: CH, image: img(pill.slice(0, 2), '#FFFFFF') }, (r) => !r.screen.ok && r.probes.note === 'no set matches: light 2/3 (3), dark 0/3 (3)');
nc('sets/decision/minMatch 2 of 3 passes with 2', { screen: 'chat', screens: chatMap({ sets: [{ ...CHAT_L, minMatch: 2 }] }), image: img(pill.slice(0, 2), '#FFFFFF') }, (r) => r.screen.ok && r.probes.matched === 2 && r.probes.of === 3);
nc('sets/decision/viewer light values -> viewer light passes', { screen: 'viewer', screens: viewerMap({ sets: [VIEW_L, VIEW_D] }), image: viewImg(['#646565', '#4F5050', '#4F5050', '#4C4E4F']) }, (r) => r.screen.ok && r.screen.set === 'light' && r.probes.matched === 4);
nc('sets/decision/viewer dark values -> viewer dark passes', { screen: 'viewer', screens: viewerMap({ sets: [VIEW_L, VIEW_D] }), image: viewImg(['#2F3031', '#131415', '#131415', '#111213']) }, (r) => r.screen.ok && r.screen.set === 'dark');
nc('sets/decision/viewer light values FAIL the chat sets', { screen: 'chat', screens: withScreens({ chat: { sets: [CHAT_L, CHAT_D] }, viewer: { sets: [VIEW_L, VIEW_D] } }), image: viewImg(['#646565', '#4F5050', '#4F5050', '#4C4E4F']) }, (r) => !r.screen.ok);
nc('sets/decision/chat pill (#FFFFFF) FAILS the viewer sets', { screen: 'viewer', screens: viewerMap({ sets: [VIEW_L, VIEW_D] }), image: img(VIEW_PTS, '#FFFFFF') }, (r) => !r.screen.ok);
nc('sets/decision/viewer without the close button fails', { screen: 'viewer', screens: viewerMap({ sets: [VIEW_L, VIEW_D] }), image: viewImg(['#808080', '#4F5050', '#4F5050', '#4C4E4F']) }, (r) => !r.screen.ok && r.probes.note === 'no set matches: light 3/4 (4), dark 0/4 (4)');
nc('sets/decision/probeDetail carries the set of each probe', { screen: 'chat', screens: CH, image: img(pill, '#FFFFFF') }, (r) => r.probes.detail.length === 6 && r.probes.detail.filter((d) => d.set === 'light').length === 3 && r.probes.detail.filter((d) => d.set === 'dark').length === 3 && r.probes.sets.length === 2 && r.probes.sets[0].ok === true && r.probes.sets[1].ok === false);
nc('sets/decision/cannot read PNG (no System.Drawing) -> fail, no number', { screen: 'chat', screens: CH, image: img(pill, '#FFFFFF'), noDrawing: true }, (r) => !r.screen.ok && r.probes.note === 'cannot read PNG' && r.probes.matched === null);
nc('sets/decision/pixel read throws -> cannot read PNG, no number', { screen: 'chat', screens: CH, image: img(pill, '#FFFFFF', { throw: true }) }, (r) => !r.screen.ok && r.probes.note === 'cannot read PNG' && r.probes.matched === null);
nc('sets/decision/wrong PNG size fails before any probe', { screen: 'chat', screens: CH, image: img(pill, '#FFFFFF'), pngW: 1000 }, (r) => !r.screen.ok && /^screenshot is 1000x2400, a52s.json wants 1080x2400$/.test(r.screen.note));

// the failure notes of a rep (Complete-Rep: the notes joined by ', ', cut at 120 by Get-SafeNote), computed with the real Get-PreCheckText / Get-ErrText / Get-SafeNote
const RESTART = ['PNG deleted (home check)', 'restart proven before this rep'];   // the two notes a -HistorySeed rep holds before its chat pre-check (Invoke-FileReset home check, Invoke-HistorySeedRestart)
const NOPAGE = 'no page request after 12 swipes: a chat with no older page cannot measure this';   // the note of Invoke-HistorySeedRep before its last shot check
const repCase = (id, c, expect) => { add({ id, ...c }); NEWIDS.push([id, expect]); };
const CHAT4_L = { ...CHAT_L, probes: [...CHAT_L.probes, P(100, 2278, '#222222', 2)], minMatch: 4 };   // 3 pill probes + the Aa glyph
const CHAT4_D = { ...CHAT_D, probes: [...CHAT_D.probes, P(100, 2278, '#DDDDDD', 2)], minMatch: 4 };
const chat4 = chatMap({ sets: [CHAT4_L, CHAT4_D] });
const REAL_PREFIX = 'PNG deleted (home check), restart proven before this rep, ';
repCase('sets/rep note/-HistorySeed chat pre-check, two sets of 4 probes, REAL prefix: 118 chars, BOTH counts and the tail kept', { screen: 'chat', screens: chat4, image: img(pill.slice(0, 2), '#FFFFFF'), rep: { kind: 'pre', prefix: RESTART } },
  (r) => (console.log('      INFO  -HistorySeed chat pre-check: ' + r.rep.fullLen + ' -> ' + r.rep.len + ' chars (limit 120): ' + r.rep.note), true) && r.rep.fullLen === 118 && r.rep.len === 118 && r.rep.note === r.rep.full && r.rep.note === REAL_PREFIX + 'chat check failed: light 2/4 (4), dark 0/4 (4) (PNG deleted)');
repCase('sets/rep note/chat pre-check, 0/4 and 0/4: counts and tail kept', { screen: 'chat', screens: chat4, image: img(pill, '#F9FAFB'), rep: { kind: 'pre', prefix: RESTART } }, (r) => r.rep.len <= 120 && r.rep.note === r.rep.full && /light 0\/4 \(4\), dark 0\/4 \(4\) \(PNG deleted\)$/.test(r.rep.note));
repCase('sets/rep note/tail "(local file not deleted)": 129 -> cut at 120, the COUNTS stay whole, the end of the tail is cut', { screen: 'chat', screens: chat4, image: img(pill.slice(0, 2), '#FFFFFF'), rep: { kind: 'pre', prefix: RESTART, left: ' (local file not deleted)' } }, (r) => (console.log('      INFO  longer tail: ' + r.rep.fullLen + ' -> ' + r.rep.len + ': ' + r.rep.note), true) && r.rep.fullLen === 129 && r.rep.len === 120 && r.rep.note.includes('light 2/4 (4), dark 0/4 (4)') && r.rep.note.endsWith(' (local file not'));
repCase('sets/rep note/chat check after the swipes (REAL prefix + shot check), both counts kept', { screen: 'chat', screens: chat4, image: img(pill.slice(0, 2), '#FFFFFF'), rep: { kind: 'shot', prefix: RESTART } }, (r) => r.rep.len <= 120 && r.rep.note === r.rep.full && /light 2\/4 \(4\), dark 0\/4 \(4\)/.test(r.rep.note));
repCase('sets/rep note/viewer: Invoke-FileShot writes "viewer check failed: " + the note = 21 + n characters, within the 80 of the parser summary too', { screen: 'viewer', screens: viewerMap({ sets: [VIEW_L, VIEW_D] }), image: img(VIEW_PTS, '#FFFFFF'), rep: { kind: 'shot', prefix: [] } }, (r) => 'viewer check failed: '.length + r.rep.len <= 80 && r.rep.note === 'no set matches: light 0/4 (4), dark 0/4 (4)');
// the worst realistic combination is NOT asserted (the old note "no page request ..." is 78 characters and comes first): it is printed
repCase('sets/rep note/INFO worst case: restart note + no-page note + failed shot check (counts may be cut at 120)', { screen: 'chat', screens: chatMap({ sets: [CHAT_L, CHAT_D] }), image: img(pill.slice(0, 2), '#FFFFFF'), rep: { kind: 'shot', prefix: [...RESTART, NOPAGE] } }, (r) => { console.log('      INFO  full ' + r.rep.fullLen + ' chars -> kept ' + r.rep.len + ': ' + r.rep.note); return r.rep.len <= 120; });
// the old form: the note texts are the old ones, byte for byte
repCase('old form/rep note: the pre-check text keeps the old words and the old note', { screen: 'chat', screens: REAL.screens, image: { default: '#808080' }, rep: { kind: 'pre', prefix: RESTART } }, (r) => r.rep.full === REAL_PREFIX + 'before the input the chat screen check failed: probes 0 of 2 match (minMatch 2) (PNG deleted)' && r.screen.sets === 0);

// ───────────────────────────────────────────── run
function runHarness(script, label) {
  const casesFile = join(tmp, 'cases.json');
  writeFileSync(casesFile, JSON.stringify(cases));
  const outFile = join(tmp, 'out-' + label + '.json');
  const r = spawnSync(PWSH, ['-NoProfile', '-NonInteractive', '-File', harnessPath, '-Script', script, '-CasesFile', casesFile, '-OutFile', outFile], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) { console.log('FAIL  harness (' + label + ') exited ' + r.status + '\n' + (r.stdout || '') + (r.stderr || '')); return null; }
  return JSON.parse(readFileSync(outFile, 'utf8'));
}
let fails = 0;
const say = (okk, text) => { if (!okk) fails++; console.log((okk ? 'PASS  ' : 'FAIL  ') + text); };

const newRes = runHarness(NEW, 'new');
const oldRes = runHarness(OLD, 'old');
if (!newRes || !oldRes) { cleanup(); process.exit(1); }
say(newRes.parseErrors === 0, 'parse gate: the new adb-walk.ps1 parses with 0 errors (Parser.ParseFile)');
say(oldRes.parseErrors === 0, 'parse gate: the base adb-walk.ps1 parses with 0 errors');
say(['Get-ScreenGap', 'Get-ProbeListGap', 'Get-ScreenProbeSets', 'Test-ProbeSetPixels', 'Get-ProbeVerdict', 'Test-Probes', 'Test-Screen', 'Test-HasField'].every((n) => newRes.loaded.includes(n)), 'the new script holds the eight screen functions: ' + newRes.loaded.join(' '));

const byId = (res) => Object.fromEntries(res.cases.map((c) => [c.id, c]));
const N = byId(newRes), O = byId(oldRes);
// group 1: parity. Compare by value; the old script has no Set / Sets, so those fields are not compared; Detail is compared in full.
const norm = (c) => JSON.stringify({ gap: c.gap, probes: c.probes && { ok: c.probes.ok, note: c.probes.note, matched: c.probes.matched, of: c.probes.of, detail: c.probes.detail }, screen: c.screen && { ok: c.screen.ok, note: c.screen.note } });
for (const id of OLDIDS) {
  const same = norm(N[id]) === norm(O[id]);
  say(same, id + (same ? '' : '\n      base: ' + norm(O[id]) + '\n      new : ' + norm(N[id])));
}
// the read-throws case may differ in `matched` only when the throw is AFTER the first probe; here it is the first: equal above.
// group 2: the sets form
for (const [id, expect] of NEWIDS) {
  let okk = false; try { okk = !!expect(N[id]); } catch { okk = false; }
  say(okk, id + (okk ? '' : '\n      got: ' + JSON.stringify(N[id])));
}

// group 3: the real script at load time (usage errors before any adb command)
function runScript(screens, label) {
  const dir = mkdtempSync(join(tmp, 'run-'));
  copyFileSync(NEW, join(dir, 'adb-walk.ps1'));
  const map = JSON.parse(readFileSync(join(root, 'scripts', 'device', 'a52s.json'), 'utf8'));
  map.screens = screens;
  writeFileSync(join(dir, 'a52s.json'), JSON.stringify(map));
  const r = spawnSync(PWSH, ['-NoProfile', '-NonInteractive', '-File', join(dir, 'adb-walk.ps1'), '-Steps', 'coldstart'], { encoding: 'utf8', timeout: 60000, cwd: dir });
  return { status: r.status, text: (r.stdout || '') + (r.stderr || '') };
}
const usage = (label, screens, re) => {
  const r = runScript(screens, label);
  const okk = r.status === 1 && re.test(r.text) && !/adb (devices|start-server)|Starting adb|pre-flight/i.test(r.text);
  say(okk, 'load time: ' + label + (okk ? '' : '\n      exit ' + r.status + ': ' + r.text.slice(0, 400)));
};
usage('sets on home -> usage error naming screens.home', withScreens({ home: { sets: [CHAT_L] } }), /adb-walk: a52s\.json screens\.home has sets: only screens\.chat and screens\.viewer may use sets/);
usage('sets on downloads -> usage error', withScreens({ downloads: { sets: [CHAT_L] } }), /screens\.downloads has sets/);
usage('accountScrolled with sets -> usage error', withScreens({ accountScrolled: { sets: [CHAT_L] } }), /screens\.accountScrolled has sets/);
usage('a set of chat with 17 probes -> usage error', chatMap({ sets: [{ name: 'light', probes: Array.from({ length: 17 }, (_, i) => P(10 + i, 20, '#FFFFFF')), minMatch: 1 }] }), /screens\.chat has a set with more than 16 probes/);
{
  const r = runScript(chatMap({ sets: [CHAT_L, CHAT_D] }), 'valid');
  const okk = !/screens\.[A-Za-z]+ has sets|a52s\.json screens\./.test(r.text);
  say(okk, 'load time: valid sets on chat pass the map checks (no screens usage error)' + (okk ? '' : '\n      ' + r.text.slice(0, 400)));
}
{
  const r = runScript(REAL.screens, 'old map');
  const okk = !/screens\.[A-Za-z]+ has sets|a52s\.json screens\./.test(r.text);
  say(okk, 'load time: the real old-form map passes the map checks (no screens usage error)' + (okk ? '' : '\n      ' + r.text.slice(0, 400)));
}

console.log(fails === 0 ? '\nALL PASS (' + cases.length + ' harness cases + the load-time runs)' : '\n' + fails + ' FAIL');
cleanup();
process.exit(fails === 0 ? 0 : 1);
