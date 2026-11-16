#!/usr/bin/env node
/* ==== perflean MSBuild harness — the Release packaging targets of Spixi/Spixi.csproj, EVALUATED by MSBuild itself.
 *
 * Session Speed lean (perflean), P-06 / P-07 (contract docs/contract-perflean.md § 3.5). A lead-machine check, NOT a
 * smoke pin: it needs `dotnet` (the .NET SDK, no workload, no restore, no network).
 *
 * WHAT IT DOES. It reads the REAL Spixi/Spixi.csproj text and takes out, verbatim and by name, the pieces that decide
 * which web files a Release build packs: the PropertyGroup that defaults SpixiStripHtml, the PropertyGroup that
 * defaults the three lean properties, the targets SpixiStoreReleaseGate (optional), SpixiLeanGuard,
 * SpixiStripReleaseHtml and SpixiLeanReleaseHtml (plus any other Spixi* target hooked BeforeTargets=PrepareForBuild),
 * and the wholesale `MauiAsset Include="Resources\Raw\**"` line. A piece that is not found = exit 2. It writes them,
 * in file order (BeforeTargets run in file order), into a bare <Project> (no Sdk attribute: nothing to restore) in a
 * temp tree laid out like the repo:
 *     <tmp>/Spixi/Harness.proj · <tmp>/Spixi/Resources/Raw/** (a copy of the tree's) · <tmp>/scripts/strip-release.mjs
 * with a stub PrepareForBuild and a Build target that writes every final MauiAsset as `LogicalName|FullPath`, one per
 * line. Then it runs `dotnet msbuild` once per scenario and checks the final item list.
 *
 * MODES of the script the targets call:
 *   --fake (default)  a stand-in strip-release.mjs written below: the CLI of contract § 3.3 just far enough (no flag:
 *                     spixi.tokens.css; --lean-css: every top-level *.html + every *.css; --lean-js: every top-level
 *                     *.html + the three external js files); content = the source + one marker line naming the flags
 *                     and the run, so the harness can tell WHICH copy was packaged. Env switches make it fail, write
 *                     nothing, ignore the lean flags (an old script), write a subfolder file, or write a file no
 *                     asset carries.
 *   --real            the tree's real scripts/strip-release.mjs (+ every relative import, transitively) and the real
 *                     Raw/html; after each passing build it assembles the packaged html folder from the final
 *                     MauiAsset list and runs `strip-release.mjs --check <that folder> <flags>` = GATE 1 on what
 *                     MSBuild would pack. Run it after builder-s1's script is integrated.
 * usage: node scripts/pins-perflean/msbuild-harness/run.mjs [--fake|--real] [--csproj <file>] [--only <id,id>] [--keep]
 *   --csproj  read another csproj text (a mutated copy, for the deliberate breaks) instead of Spixi/Spixi.csproj
 * Exit: 0 every scenario held · 1 a scenario missed · 2 usage / a piece not found / no dotnet.
 * Node built-ins only. */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, readdirSync, statSync, cpSync, symlinkSync } from 'node:fs';
import { join, dirname, sep, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const REAL = argv.includes('--real');
if (REAL && argv.includes('--fake')) { console.error('msbuild-harness: --fake and --real exclude each other'); process.exit(2); }
const KEEP = argv.includes('--keep');
const CSPROJ = resolve(opt('--csproj') || join(REPO, 'Spixi', 'Spixi.csproj'));
const ONLY = opt('--only') ? opt('--only').split(',') : null;
const die = (m) => { console.error('msbuild-harness: ' + m); process.exit(2); };

/* ---------- 1 · take the pieces out of the real csproj, verbatim ---------- */
const csText = readFileSync(CSPROJ, 'utf8').replace(/^\uFEFF/, '');
const comments = [...csText.matchAll(/<!--[\s\S]*?-->/g)].map((m) => [m.index, m.index + m[0].length]);
const inComment = (i) => comments.some(([a, b]) => i >= a && i < b);
const live = (re) => [...csText.matchAll(re)].filter((m) => !inComment(m.index));
const targets = live(/<Target\s+Name="([^"]+)"[^>]*>/g).map((m) => {
  const end = csText.indexOf('</Target>', m.index);
  if (end < 0) die('target ' + m[1] + ' has no </Target>');
  return { name: m[1], at: m.index, end: end + '</Target>'.length, head: m[0], text: csText.slice(m.index, end + '</Target>'.length) };
});
const inTarget = (i) => targets.some((t) => i >= t.at && i < t.end);
const targetNamed = (n, required) => {
  const t = targets.filter((x) => x.name === n);
  if (t.length > 1) die('target ' + n + ' is defined ' + t.length + ' times');
  if (!t.length && required) die('target ' + n + ' not found in ' + CSPROJ);
  return t[0] || null;
};
const groupSetting = (prop) => {
  const g = live(/<PropertyGroup\s*>([\s\S]*?)<\/PropertyGroup>/g).filter((m) => !inTarget(m.index) && new RegExp('<' + prop + '[\\s>]').test(m[1]));
  if (g.length !== 1) die('expected ONE top-level PropertyGroup that sets ' + prop + ', found ' + g.length);
  return { name: 'PropertyGroup(' + (/^SpixiLean/.test(prop) ? 'SpixiLean*' : prop) + ')', at: g[0].index, text: g[0][0] };
};
const pieces = new Map();
const addPiece = (p) => { if (p) pieces.set(p.at, p); };
addPiece(groupSetting('SpixiStripHtml'));
for (const p of ['SpixiLeanCss', 'SpixiLeanCssFull', 'SpixiLeanJs']) addPiece(groupSetting(p));
addPiece(targetNamed('SpixiStoreReleaseGate', false));
for (const n of ['SpixiLeanGuard', 'SpixiLeanStaleGuard', 'SpixiStripReleaseHtml', 'SpixiLeanReleaseHtml']) addPiece(targetNamed(n, true));
for (const t of targets) if (/^Spixi/.test(t.name) && /BeforeTargets="[^"]*\bPrepareForBuild\b/.test(t.head)) addPiece(t);
/* the app-id lines of the first PropertyGroup: the BASE <ApplicationId>com.ixilabs.spixi</ApplicationId> (#46 perflean r4 B-1: the guard tests the evaluated ApplicationId, so the
 * harness must decide it the way the csproj does, and see a changed base line), the SpixiDevCoexist default in Debug, and the three lines that test it, VERBATIM: the guard
 * reads SpixiDevCoexist, and the store gate reads it and DefineConstants */
{
  const DEV = ['<ApplicationId>', '<SpixiDevCoexist Condition=', '<ApplicationId Condition="\'$(SpixiDevCoexist)\'', '<ApplicationTitle Condition="\'$(SpixiDevCoexist)\'', '<DefineConstants Condition="\'$(SpixiDevCoexist)\''];
  const lines = DEV.map((head) => {
    const m = live(new RegExp('^[ \\t]*' + head.replace(/[$()[\]\\.*+?^{}|]/g, '\\$&') + '.*$', 'gm'));
    if (m.length !== 1) die('expected ONE live line that starts with ' + head + ', found ' + m.length);
    return m[0];
  });
  if (!lines.every((m, i) => i === 0 || lines[i - 1].index < m.index)) die('the five app-id lines (the base ApplicationId, the SpixiDevCoexist default and the three that test it) are not in order');
  addPiece({ name: 'PropertyGroup(ApplicationId + SpixiDevCoexist lines)', at: lines[0].index, text: '<PropertyGroup>\n' + lines.map((m) => m[0].replace(/^\s*/, '\t\t')).join('\n') + '\n\t</PropertyGroup>' });
}
const ordered = [...pieces.values()].sort((a, b) => a.at - b.at);
const include = live(/<MauiAsset Include="Resources\\Raw\\\*\*"[^>]*\/>/g);
if (include.length !== 1) die('expected ONE wholesale `MauiAsset Include="Resources\\Raw\\**"` line, found ' + include.length);
const INCLUDE_LINE = include[0][0];

/* ---------- 2 · the temp tree ---------- */
const TMP = mkdtempSync(join(tmpdir(), 'spixi-msbuild-harness-'));
const SPIXI = join(TMP, 'Spixi');
const RAW = join(SPIXI, 'Resources', 'Raw');
mkdirSync(join(TMP, 'scripts'), { recursive: true });
cpSync(join(REPO, 'Spixi', 'Resources', 'Raw'), RAW, { recursive: true });
const OBJ_REL = 'obj/Release/net10.0-android/';
const STRIP_DIR = join(SPIXI, OBJ_REL, 'spixi-strip', 'html') + sep;
const LEAN_DIR = join(SPIXI, OBJ_REL, 'spixi-lean', 'html') + sep;
const CALL_LOG = join(TMP, 'calls.jsonl');
const STAMP = join(SPIXI, OBJ_REL, 'spixi-lean.stamp');   // the lean stamp of #46 perflean D-1 (SpixiLeanGuard / SpixiLeanReleaseHtml / SpixiLeanStaleGuard)
const stampNow = () => (existsSync(STAMP) ? readFileSync(STAMP, 'utf8') : null);
const canon = (css, js) => 'css=' + css + ' js=' + js;   // the stamp text for the EVALUATED switches
const EXTERNAL_JS = ['spixi.bundle.js', 'spixi.strings.js', 'spixi.icons.js'];

const FAKE = `/* msbuild-harness FAKE strip-release.mjs — the CLI of contract § 3.3, just far enough to drive the csproj targets. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const RAW = join(here, '..', 'Spixi', 'Resources', 'Raw', 'html');
const args = process.argv.slice(2);
if (process.env.SPIXI_FAKE_LOG) appendFileSync(process.env.SPIXI_FAKE_LOG, JSON.stringify(args) + '\\n');
let out = null; const flags = new Set();
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') out = args[++i];
  else if (args[i] === '--lean-css' || args[i] === '--lean-js') flags.add(args[i]);
  else { console.error('fake strip-release: unknown argument ' + args[i]); process.exit(2); }
}
if (!out) { console.error('fake strip-release: --out missing'); process.exit(2); }
const css = flags.has('--lean-css'), js = flags.has('--lean-js'), lean = css || js;
if (lean && process.env.SPIXI_FAKE_FAIL) { console.error('fake strip-release: forced failure (SPIXI_FAKE_FAIL)'); process.exit(1); }
mkdirSync(out, { recursive: true });
if (lean && process.env.SPIXI_FAKE_EMPTY) { console.log('fake strip-release: wrote nothing (SPIXI_FAKE_EMPTY)'); process.exit(0); }
const walk = (d, pre = '') => readdirSync(d).flatMap((n) => statSync(join(d, n)).isDirectory() ? walk(join(d, n), pre + n + '/') : [pre + n]);
const all = walk(RAW);
let files = ['spixi.tokens.css'];
if (lean && !process.env.SPIXI_FAKE_IGNOREFLAGS) {
  files = all.filter((f) => !f.includes('/') && f.endsWith('.html'));
  if (css) files.push(...all.filter((f) => f.endsWith('.css')));
  if (js) files.push('spixi.bundle.js', 'spixi.strings.js', 'spixi.icons.js');
  if (process.env.SPIXI_FAKE_SUBDIR) files.push('js/html5-qrcode.min.js');
}
const tag = [css ? 'css' : '', js ? 'js' : ''].filter(Boolean).join(',') || 'none';
const marker = '\\n/* HARNESS-FAKE flags=' + tag + ' run=' + (process.env.SPIXI_FAKE_NONCE || '?') + ' */\\n';
const write = (rel, body) => { const d = join(out, rel); mkdirSync(dirname(d), { recursive: true }); writeFileSync(d, body); console.log('fake strip-release: wrote ' + rel); };
for (const f of [...new Set(files)]) write(f, readFileSync(join(RAW, f), 'utf8') + marker);
if (lean && process.env.SPIXI_FAKE_ORPHAN) write('js/not-an-asset.js', 'orphan' + marker);
console.log('fake strip-release: ' + (files.length + (lean && process.env.SPIXI_FAKE_ORPHAN ? 1 : 0)) + ' file(s) written to ' + resolve(out));
`;
const LATE_DEV = join(TMP, 'late-dev.targets'), LATE_OTHER = join(TMP, 'late-other.targets');
writeFileSync(LATE_DEV, '<Project><PropertyGroup><SpixiDevCoexist>true</SpixiDevCoexist></PropertyGroup></Project>\n');
writeFileSync(LATE_OTHER, '<Project><PropertyGroup><Harness_Unrelated>1</Harness_Unrelated></PropertyGroup></Project>\n');
const MARK = (tag, run) => '\n/* HARNESS-FAKE flags=' + tag + ' run=' + run + ' */\n';

if (REAL) {
  /* the real script and everything it imports by a relative path, transitively (scripts/lib/** at least) */
  const seen = new Set();
  const copyMod = (abs) => {
    if (seen.has(abs)) return; seen.add(abs);
    const rel = relative(join(REPO, 'scripts'), abs);
    if (rel.startsWith('..')) die('the real strip-release.mjs imports a file outside scripts/: ' + abs);
    mkdirSync(dirname(join(TMP, 'scripts', rel)), { recursive: true });
    cpSync(abs, join(TMP, 'scripts', rel));
    const src = readFileSync(abs, 'utf8');
    for (const m of src.matchAll(/(?:from\s*|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) copyMod(resolve(dirname(abs), m[1]));
  };
  copyMod(join(REPO, 'scripts', 'strip-release.mjs'));
  if (existsSync(join(REPO, 'scripts', 'lib'))) cpSync(join(REPO, 'scripts', 'lib'), join(TMP, 'scripts', 'lib'), { recursive: true });
  if (existsSync(join(REPO, 'node_modules'))) symlinkSync(join(REPO, 'node_modules'), join(TMP, 'node_modules'), 'junction');
} else {
  writeFileSync(join(TMP, 'scripts', 'strip-release.mjs'), FAKE);
}

const writeProject = (extra = '') => writeFileSync(join(SPIXI, 'Harness.proj'), `<Project DefaultTargets="Build">
	<!-- GENERATED by scripts/pins-perflean/msbuild-harness/run.mjs from ${CSPROJ.replace(/--/g, '- -')}: the pieces below are VERBATIM. -->
	<ItemGroup>
		${INCLUDE_LINE}
${extra}	</ItemGroup>
${ordered.map((p) => '\t' + p.text).join('\n')}
	<!-- r4 B-1: a file imported AFTER the project body, like Spixi.csproj.user (Microsoft.Common.CurrentVersion.targets) or Directory.Build.targets: its properties are final for a target, too late for the app-id lines above -->
	<Import Project="$(HarnessLate)" Condition="'$(HarnessLate)' != '' and Exists('$(HarnessLate)')" />
	<Target Name="PrepareForBuild" />
	<Target Name="Build" DependsOnTargets="PrepareForBuild">
		<WriteLinesToFile File="$(HarnessDump)" Lines="@(MauiAsset->'%(LogicalName)|%(FullPath)')" Overwrite="true" />
		<WriteLinesToFile File="$(HarnessDump).appid" Lines="[$(ApplicationId)]" Overwrite="true" />
	</Target>
</Project>
`);

/* ---------- 3 · the wholesale set W: what `Resources\Raw\**` gives, LogicalName → source ---------- */
const walk = (d, pre = '') => readdirSync(d).flatMap((n) => statSync(join(d, n)).isDirectory() ? walk(join(d, n), pre + n + sep) : [pre + n]);
const W = new Map(walk(RAW).map((rel) => [rel, join(RAW, rel)]));
const H = 'html' + sep;
const htmlRel = (logical) => logical.slice(H.length);
const isTopHtml = (logical) => logical.startsWith(H) && !htmlRel(logical).includes(sep) && logical.endsWith('.html');
const isCss = (logical) => logical.startsWith(H) && logical.endsWith('.css');
const isExtJs = (logical) => logical.startsWith(H) && EXTERNAL_JS.includes(htmlRel(logical));

/* ---------- 4 · one msbuild run ---------- */
let runNo = 0;
const DOTNET = spawnSync('dotnet', ['--version'], { encoding: 'utf8' });
if (DOTNET.status !== 0) die('dotnet not found (' + (DOTNET.error ? DOTNET.error.code : 'status ' + DOTNET.status) + ')');
const msbuild = (props, env = {}) => {
  const run = 'r' + (++runNo);
  const dump = join(TMP, 'dump-' + run + '.txt');
  rmSync(CALL_LOG, { force: true });
  const args = ['msbuild', join(SPIXI, 'Harness.proj'), '-nologo', '-nodeReuse:false', '-noAutoResponse', '-v:n',
    '-p:IntermediateOutputPath=' + OBJ_REL, '-p:HarnessDump=' + dump, ...Object.entries(props).map(([k, v]) => '-p:' + k + '=' + v)];
  /* the caller's shell must not decide a scenario: every variable that MSBuild would read as one of the properties under test is dropped */
  const cleanEnv = { ...process.env }; for (const k of Object.keys(cleanEnv)) if (/^SPIXI_(FAKE_|PACKAGED_LEAN)|^(SpixiLean\w*|SpixiStoreRelease|SpixiStripHtml|SpixiDevCoexist|DesignTimeBuild|IntermediateOutputPath|Configuration)$/i.test(k)) delete cleanEnv[k];
  const r = spawnSync('dotnet', args, { cwd: TMP, encoding: 'utf8', env: { ...cleanEnv, SPIXI_FAKE_LOG: CALL_LOG, SPIXI_FAKE_NONCE: run, ...env }, maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || '');
  const calls = REAL
    ? out.split('\n').map((l) => l.trim()).filter((l) => /^node "[^"]*strip-release\.mjs" --out /.test(l))
    : (existsSync(CALL_LOG) ? readFileSync(CALL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  const items = existsSync(dump) ? readFileSync(dump, 'utf8').split('\n').filter(Boolean).map((l) => { const i = l.indexOf('|'); return { logical: l.slice(0, i), full: l.slice(i + 1) }; }) : null;
  const appId = existsSync(dump + '.appid') ? readFileSync(dump + '.appid', 'utf8').trim() : null;   // "[<ApplicationId>]" as the build left it
  return { run, status: r.status, out, calls, items, args, appId };
};

/* ---------- 5 · the checks ---------- */
const problems = [];
const expectSet = (items, P) => {
  const seen = new Map();
  for (const it of items) seen.set(it.logical, (seen.get(it.logical) || 0) + 1);
  const twice = [...seen].filter(([, n]) => n > 1).map(([k, n]) => k + ' ×' + n);
  const lost = [...W.keys()].filter((k) => !seen.has(k));
  const extra = [...seen.keys()].filter((k) => !W.has(k));
  if (twice.length) P.push('packaged twice: ' + twice.join(', '));
  if (lost.length) P.push('lost: ' + lost.join(', '));
  if (extra.length) P.push('LogicalName not in the wholesale set: ' + extra.join(', '));
};
/* src(logical) → 'raw' | 'strip' | 'lean'; tag = the fake marker the lean copies must carry */
const expectSources = (r, src, tag, P) => {
  const by = new Map(r.items.map((it) => [it.logical, it.full]));
  const counts = { raw: 0, strip: 0, lean: 0 };
  for (const [logical, rawPath] of W) {
    const full = by.get(logical); if (!full) continue;
    const want = src(logical); counts[want]++;
    const path = want === 'raw' ? rawPath : (want === 'strip' ? STRIP_DIR : LEAN_DIR) + htmlRel(logical);
    if (resolve(full) !== resolve(path)) { P.push(logical + ': from ' + relative(TMP, full) + ', want ' + relative(TMP, path)); continue; }
    if (!REAL && want !== 'raw') {
      const body = readFileSync(full, 'utf8'), base = readFileSync(rawPath, 'utf8');
      const mk = MARK(want === 'strip' ? 'none' : tag, r.run);
      if (body !== base + mk) P.push(logical + ': the packaged copy is not THIS run\'s ' + (want === 'strip' ? 'tokens-only' : tag) + ' output (stale or foreign file)');
    }
  }
  return counts;
};
const leanCall = (flags) => REAL ? 'node "' + join(TMP, 'scripts', 'strip-release.mjs') + '" --out "' + LEAN_DIR + '."' + flags.map((f) => ' ' + f).join('')
  : JSON.stringify(['--out', LEAN_DIR + '.', ...flags]);
const stripCall = () => REAL ? 'node "' + join(TMP, 'scripts', 'strip-release.mjs') + '" --out "' + STRIP_DIR + '."' : JSON.stringify(['--out', STRIP_DIR + '.']);
const expectCalls = (r, want, P) => {
  const got = r.calls.map((c) => REAL ? c : JSON.stringify(c));
  if (got.join('\n') !== want.join('\n')) P.push('script calls: got [' + got.join(' · ') + '], want [' + want.join(' · ') + ']');
  /* every command line MSBuild echoes for an Exec that starts node (-v:n prints it): no other node call than the strip-release ones */
  const nodeLines = r.out.split('\n').map((l) => l.trim()).filter((l) => /^node\s/.test(l));
  if (nodeLines.length !== want.length) P.push('node command lines in the log: ' + nodeLines.length + ', want ' + want.length + ' (' + nodeLines.map((l) => l.slice(0, 60)).join(' · ') + ')');
};
const gate1 = (r, flags, P) => {
  if (!REAL) return '';
  const pkg = join(TMP, 'packaged-' + r.run);
  for (const it of r.items) if (it.logical.startsWith(H)) { const d = join(pkg, it.logical); mkdirSync(dirname(d), { recursive: true }); cpSync(it.full, d); }
  const g = spawnSync(process.execPath, [join(TMP, 'scripts', 'strip-release.mjs'), '--check', join(pkg, 'html'), ...flags], { cwd: TMP, encoding: 'utf8', env: Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'SPIXI_PACKAGED_LEAN')) });
  const last = ((g.stdout || '') + (g.stderr || '')).trim().split('\n').slice(-1)[0] || '';
  if (g.status !== 0) P.push('GATE 1 on the MSBuild package (--check' + flags.map((f) => ' ' + f).join('') + ') exit ' + g.status + ': ' + ((g.stdout || '') + (g.stderr || '')).trim().split('\n').slice(-6).join(' | '));
  return ' · GATE 1 (' + (flags.join(' ') || 'no flag') + '): exit ' + g.status + ' "' + last.slice(0, 90) + '"';
};
const leanMessage = (r, props, flags, n, P) => {
  const f = flags.map((x) => ' ' + x).join('');
  const want = 'Spixi: LEAN Release packaging applied (SpixiLeanCss=' + props.css + ', SpixiLeanJs=' + props.js + ', SpixiLeanCssFull=false; strip-release.mjs' + f + ') — ' + n + ' asset(s) swapped from ' + LEAN_DIR;
  if (!r.out.includes(want)) P.push('the lean Message is missing or wrong (want "' + want.slice(0, 120) + '…")');
  if (!r.out.includes('GATE 1: node scripts/strip-release.mjs --check <the DEPLOYED html folder>' + f + ' ') || !r.out.includes('GATE 2: node scripts/smoke-packaged.mjs' + f))
    P.push('the lean Message does not give GATE 1 / GATE 2 with the flags' + f);
  const st = 'Stamp ' + STAMP + " = '" + canon(flags.includes('--lean-css'), flags.includes('--lean-js')) + "': when a lean switch changes, delete Spixi\\obj and Spixi\\bin (and the publish folder) first, or the next build stops.";
  if (!r.out.includes('. A DEV build (SpixiDevCoexist=')) P.push('the lean Message does not name the dev build');
  if (!r.out.includes(st)) P.push('the lean Message does not end with the stamp sentence (want "' + st.slice(0, 140) + '…")');
};

const REL = { Configuration: 'Release' };
/* ★ #46 perflean r2 S-1: until the ruling of the lean defaults a lean build must be a DEV build (SpixiDevCoexist true); every lean scenario of
 * Release passes it (Debug has it by default: the csproj's own line, copied into the harness project verbatim) */
/* ★ #46 perflean r3 B-3 / S-1: until the ruling of the lean defaults a lean package is also ANDROID only (the dev id moves only when TargetFramework contains
 * -android: Spixi.csproj line 41), so every lean scenario that must pass carries an Android TargetFramework; Harness.proj has no TargetFramework of its own */
const ANDROID = 'net10.0-android';
const RDEV = { Configuration: 'Release', SpixiDevCoexist: 'true', TargetFramework: ANDROID };
const fresh = () => rmSync(join(SPIXI, 'obj'), { recursive: true, force: true });
/* a passing lean build: which assets come from the lean dir */
const leanSrc = (css, js, sub = false) => (l) => {
  if (isTopHtml(l)) return 'lean';
  if (css && isCss(l)) return 'lean';
  if (js && isExtJs(l)) return 'lean';
  if (sub && l === H + 'js' + sep + 'html5-qrcode.min.js') return 'lean';
  if (l === H + 'spixi.tokens.css') return 'strip';
  return 'raw';
};
/* in --real mode the lean set is what the real script wrote: read the lean dir, check it is inside the scope */
const realLeanSrc = (css, js, P) => {
  const wrote = existsSync(LEAN_DIR) ? walk(LEAN_DIR).map((rel) => H + rel) : [];
  const scope = (l) => l === H + 'spixi.tokens.css' || isTopHtml(l) || (css && isCss(l)) || (js && isExtJs(l));
  const out = wrote.filter((l) => !scope(l));
  if (out.length) P.push('the real script wrote out-of-scope file(s): ' + out.join(', '));
  if (css) { const miss = [...W.keys()].filter((l) => isCss(l) && !wrote.includes(l)); if (miss.length) P.push('--lean-css did not write: ' + miss.join(', ')); }
  if (js) { const miss = EXTERNAL_JS.map((f) => H + f).filter((l) => !wrote.includes(l)); if (miss.length) P.push('--lean-js did not write: ' + miss.join(', ')); }
  const set = new Set(wrote);
  return (l) => set.has(l) ? 'lean' : (l === H + 'spixi.tokens.css' ? 'strip' : 'raw');
};

const okBuild = (r, P) => { if (r.status !== 0 || !r.items) P.push('build FAILED (exit ' + r.status + '): ' + (r.out.match(/error[^\n]*/g) || []).slice(0, 2).join(' | ')); return r.status === 0 && !!r.items; };
const failBuild = (r, text, P) => {
  if (r.status === 0) P.push('build PASSED, want a failure with "' + text + '"');
  else if (!r.out.includes(text)) P.push('build failed, but without "' + text + '": ' + (r.out.match(/error[^\n]*/g) || ['(no error line)']).slice(0, 2).join(' | '));
  const err = (r.out.match(/error[^\n]*/) || [''])[0];
  return 'FAILS: ' + err.replace(/^.*?error\s*:?\s*/, '').replace(/\s*\[[^\]]*Harness\.proj[^\]]*\]\s*$/, '').slice(0, 110);
};
/* the steps before the build under test: { props, env } = a build that must PASS; a function = a step on the disk (wipe obj, write a stamp, change a source) */
const runPre = (pre, P) => {
  for (const step of pre || []) {
    if (typeof step === 'function') { step(); continue; }
    const pr = msbuild(step.props, step.env);
    if (!okBuild(pr, P)) return false;
  }
  return true;
};
const stampShow = (s) => (s === null ? 'no stamp' : 'stamp "' + s.trimEnd() + '"');

const lean = (id, label, props, opts = {}) => ({
  id, label, fake: !!opts.fakeOnly, after: opts.after,
  run: (P) => {
    fresh();
    if (!runPre(opts.pre, P)) return 'pre-run failed';
    const r = msbuild({ ...RDEV, ...props }, opts.env);
    if (!okBuild(r, P)) return 'build failed';
    const css = opts.on ? opts.on.css : /^true$/i.test(props.SpixiLeanCss || ''), js = opts.on ? opts.on.js : /^true$/i.test(props.SpixiLeanJs || '');
    const flags = [css ? '--lean-css' : '', js ? '--lean-js' : ''].filter(Boolean);
    if (r.appId !== '[com.ixilabs.spixi.dev]') P.push('the evaluated ApplicationId of a lean build is ' + r.appId + ', want [com.ixilabs.spixi.dev]');
    expectSet(r.items, P);
    const src = REAL ? realLeanSrc(css, js, P) : leanSrc(css, js, !!(opts.env || {}).SPIXI_FAKE_SUBDIR);
    const c = expectSources(r, src, [css ? 'css' : '', js ? 'js' : ''].filter(Boolean).join(','), P);
    expectCalls(r, [stripCall(), leanCall(flags)], P);
    leanMessage(r, opts.shown || { css: (opts.env || {}).SpixiLeanCss || props.SpixiLeanCss || 'false', js: (opts.env || {}).SpixiLeanJs || props.SpixiLeanJs || 'false' }, flags, c.lean, P);
    /* D-1: a passing lean build leaves the stamp with the EVALUATED switches (yes / on / True = the text of true) */
    const st = stampNow();
    if (st === null || st.trimEnd() !== canon(css, js)) P.push('the stamp is ' + stampShow(st) + ', want "' + canon(css, js) + '"');
    if (opts.check) opts.check(r, P);
    const jsLean = EXTERNAL_JS.filter((f) => src(H + f) === 'lean').length;
    return 'ok: ' + r.items.length + ' assets, each once · lean ' + c.lean + ' (js ' + jsLean + ', tokens.css from ' + src(H + 'spixi.tokens.css') + ') · strip ' + c.strip + ' · raw ' + c.raw + ' · calls ' + r.calls.length + ' · ' + stampShow(st) + gate1(r, flags, P);
  },
});
const plain = (id, label, props, srcOf, calls, opts = {}) => ({
  id, label, after: opts.after,
  run: (P) => {
    fresh();
    if (!runPre(opts.pre, P)) return 'pre-run failed';
    const st0 = stampNow();
    const r = msbuild(props, opts.env);
    if (!okBuild(r, P)) return 'build failed';
    expectSet(r.items, P);
    const c = expectSources(r, srcOf, 'none', P);
    expectCalls(r, calls(), P);
    if (r.out.includes('LEAN Release packaging applied')) P.push('a lean Message in a build with no lean swap');
    if (/Spixi lean packaging/.test(r.out)) P.push('a lean guard / lean target text appeared in a build with no lean swap');
    if (stampNow() !== st0) P.push('the stamp changed: ' + stampShow(st0) + ' → ' + stampShow(stampNow()) + ' (a build without the lean swap must not touch it)');
    if (calls().length) { const sd = existsSync(STRIP_DIR) ? walk(STRIP_DIR) : []; if (sd.join(',') !== 'spixi.tokens.css') P.push('the no-flag call (today) wrote [' + sd.join(', ') + '], want only spixi.tokens.css'); }
    if (opts.check) opts.check(r, P);
    return 'ok: ' + r.items.length + ' assets, each once · strip ' + c.strip + ' · raw ' + c.raw + ' · calls ' + r.calls.length + ' · ' + stampShow(stampNow()) + (calls().length ? gate1(r, [], P) : '');
  },
});
const refused = (id, label, props, text, calls, opts = {}) => ({
  id, label, fake: !!opts.fakeOnly, after: opts.after,
  run: (P) => {
    fresh();
    if (!runPre(opts.pre, P)) return 'pre-run failed';
    const st0 = stampNow();
    const r = msbuild(props, opts.env);
    const s = failBuild(r, text, P);
    if (calls) expectCalls(r, calls(), P);
    if (r.out.includes('LEAN Release packaging applied')) P.push('the lean success Message appeared in a refused build');
    /* a refused build never writes a stamp and never changes one */
    if (stampNow() !== st0) P.push('the stamp changed in a refused build: ' + stampShow(st0) + ' → ' + stampShow(stampNow()));
    if (opts.check) opts.check(r, P);
    return s + ' · calls ' + r.calls.length + ' · ' + stampShow(stampNow());
  },
});
const TODAY = (l) => (l === H + 'spixi.tokens.css' ? 'strip' : 'raw');
const RAWONLY = () => 'raw';
const CSS = { props: { ...RDEV, SpixiLeanCss: 'true' } };
const NEEDS = 'needs the Release packaging strip';
const NOTBUILT = 'SpixiLeanCssFull (the lean v2 step) is not built in this batch';
const STORE = (css, js) => 'Spixi lean packaging: a store build (SpixiStoreRelease=true) cannot be lean before the ruling of the lean defaults (SpixiLeanCss=' + css + ', SpixiLeanJs=' + js + '). Remove the lean property (a -p: switch, an environment variable, or a props / .user file).';
const IOPTEXT = (v) => "Spixi lean packaging: IntermediateOutputPath='" + v + "' is empty, only white space, or the project folder itself — refusing a lean build (its output directory would be inside the working tree, beside the sources). Leave IntermediateOutputPath to the SDK, or set it to another folder.";
const DEVTEXT = (v, cfg = 'Release') => "Spixi lean packaging: a lean package is allowed only in a dev build before the ruling of the lean defaults, and SpixiDevCoexist is '" + v + "' (Configuration=" + cfg + "). Pass -p:SpixiDevCoexist=true (the package id is com.ixilabs.spixi.dev on Android), or remove the lean property (a -p: switch, an environment variable, or a props / .user file) for a production-id build.";
const TFTEXT = (tf) => "Spixi lean packaging: a lean package is allowed only for Android before the ruling of the lean defaults, and TargetFramework is '" + tf + "': only there SpixiDevCoexist=true moves the app id to com.ixilabs.spixi.dev; an iOS, Mac or Windows package keeps the production id. Build with -f net10.0-android, or remove the lean property (a -p: switch, an environment variable, or a props / .user file).";
const APPIDTEXT = (id, dev, tf) => "Spixi lean packaging: a lean package is allowed only with the dev app id before the ruling of the lean defaults, and ApplicationId is '" + id + "' (SpixiDevCoexist=" + dev + ", TargetFramework=" + tf + "): the id is decided when the project file is read, so a SpixiDevCoexist that is set later (a .csproj.user file, a Directory.Build.targets file) or an ApplicationId on the build line does not give the dev id. Pass -p:SpixiDevCoexist=true -f net10.0-android on the build line, or remove the lean property (a -p: switch, an environment variable, or a props / .user file).";
const noText = (text, what) => (r, P) => { if (r.out.includes(text)) P.push('the ' + what + ' Error text appeared, but another Error must come first / alone'); };
const WORD = (k, v, what, fix) => "Spixi lean packaging: " + k + "='" + v + "' is not true or false, and a lean build needs a clear answer (such a value skips " + what + "). " + fix + ", or remove the property (a -p: switch, an environment variable, or a props / .user file).";
const STOREWORD = (v) => WORD('SpixiStoreRelease', v, 'the store gate', 'Set it to true or false');
const DEVWORD = (v) => WORD('SpixiDevCoexist', v, 'the dev app id', 'Set it to true');
const WIPE_TEXT = 'Delete Spixi\\obj and Spixi\\bin (and the publish folder), then build again; only GATE 1 on the deployed folder proves a package.';
const STALE = () => 'Spixi lean packaging: every lean switch is off, but ' + STAMP + ' exists: a LEAN build ran in this obj folder, and the bin or publish folder can still hold its lean files (a copy by timestamp keeps them). ' + WIPE_TEXT;
const CHANGED = (was, now) => 'Spixi lean packaging: the lean switches changed in this obj folder: ' + STAMP + " says '" + was + "', this build is '" + now + "'. The bin or publish folder can still hold the files of the earlier build (a copy by timestamp keeps them). " + WIPE_TEXT;
const dropStamp = () => rmSync(STAMP, { force: true });
const writeStamp = (text) => () => { mkdirSync(dirname(STAMP), { recursive: true }); writeFileSync(STAMP, text); };
/* ★ THE PARK of P-07 (Damir 2026-11-15, DECISIONS 1583 / 1589): SpixiLeanJs on is refused by the guard right after the typo and CssFull Errors, before the store / dev / Android / app-id / strip / folder / stamp Errors, with NO node call. Every scenario that was a js or css + js lean build is now this refusal; the lean mechanics are proven with css only. */
const PARKTEXT = (v) => 'Spixi lean packaging: SpixiLeanJs (the comment strip of the scripts, P-07) is PARKED in this batch (SpixiLeanJs=' + v + '): its review found a fault that is not fixed, so no build may pack its output (DECISIONS 1583 and 1589). Remove the property (a -p: switch, an environment variable, or a props / .user file); the comment strip of the stylesheets is SpixiLeanCss=true.';
const parked = (id, label, props, v, opts = {}) => refused(id, label, props, PARKTEXT(v), () => [], opts);
const OLDBOTH = writeStamp('css=true js=true\n');   // a stamp left by an older build that was css + js (no build can write one now)
const plantJs = () => { mkdirSync(LEAN_DIR, { recursive: true }); writeFileSync(join(LEAN_DIR, 'spixi.bundle.js'), '/* planted js file of an earlier build */\n'); };
/* the project folder before / after a build: every directory and file below Spixi/ */
const snap = () => {
  const dirs = (d, pre = '') => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? [pre + n, ...dirs(join(d, n), pre + n + '/')] : []));
  return { dirs: dirs(SPIXI), files: walk(SPIXI).map((f) => f.split(sep).join('/')) };
};
const snapDiff = (a, b) => ({
  added: [...b.dirs.filter((d) => !a.dirs.includes(d)), ...b.files.filter((f) => !a.files.includes(f))].sort(),
  gone: [...a.dirs.filter((d) => !b.dirs.includes(d)), ...a.files.filter((f) => !b.files.includes(f))].sort(),
});
/* ★ D-5 (a): a lean build whose IntermediateOutputPath is empty, white space or the project folder after normalization is refused IN THE GUARD,
 * before the tokens-only strip (which has no check of its own) could write spixi-strip/html/ into the project folder: no script call, nothing
 * written or removed there. The all-off twin `offemptyiop` pins the LEGACY behaviour of the untouched tokens-only target. */
const iopRefused = (id, value, props = { SpixiLeanCss: 'true' }) => ({
  id, label: 'Release + ' + Object.entries(props).map(([k, v]) => k + '=' + v).join(' + ') + ' + IntermediateOutputPath=' + JSON.stringify(value) + ': the GUARD refuses before the tokens-only strip; no script call; nothing written or removed in the project folder',
  run: (P) => {
    fresh();
    for (const s of ['spixi-strip', 'spixi-lean', 'spixi-lean.stamp']) rmSync(join(SPIXI, s), { recursive: true, force: true });
    const before = snap();
    const r = msbuild({ ...RDEV, ...props, IntermediateOutputPath: value });
    const texts = [IOPTEXT(value), IOPTEXT(value.trim())];
    const text = texts.find((t) => r.out.includes(t)) || texts[0];
    const summary = failBuild(r, text, P);
    if (r.out.includes('at target time — refusing to empty')) P.push('the lean target\'s own (belt) Error fired: the guard did not stop the build first');
    if (r.calls.length) P.push('script calls: got [' + r.calls.map((c) => (REAL ? c : JSON.stringify(c))).join(' · ') + '], want none (the build must stop before node starts)');
    if (r.out.includes('Release packaging strip applied')) P.push('the tokens-only strip ran (its Message appeared)');
    if (r.out.includes('LEAN Release packaging applied')) P.push('the lean success Message appeared');
    if (r.items) P.push('the Build target ran (an item dump exists) although the build must stop in the guard');
    const d = snapDiff(before, snap());
    if (d.gone.length) P.push('REMOVED from the project folder: ' + d.gone.slice(0, 5).join(', '));
    if (d.added.length) P.push('NEW in the project folder: [' + d.added.join(', ') + '], want nothing');
    const raw = existsSync(RAW) ? walk(RAW).length : 0;
    if (raw !== W.size) P.push('Resources/Raw is not complete: ' + raw + ' files, want ' + W.size);
    for (const s of ['spixi-strip', 'spixi-lean', 'spixi-lean.stamp']) rmSync(join(SPIXI, s), { recursive: true, force: true });
    return summary + ' · calls ' + r.calls.length + ' · new entries in the project folder ' + d.added.length + ' · removed ' + d.gone.length + ' · Resources/Raw ' + raw + '/' + W.size + ' files';
  },
});
const CSS_SRC = [...W.keys()].filter((l) => isCss(l) && l !== H + 'spixi.tokens.css').sort()[0];   // a stylesheet the lean css flag writes (not the tokens-only one)

const SCENARIOS = [
  plain('off', 'Release, all off', { ...REL }, TODAY, () => [stripCall()]),
  plain('offenvlean', 'Release, all off, SPIXI_PACKAGED_LEAN=css,js in the environment (§ 3.3 env must not reach the build)', { ...REL }, TODAY, () => [stripCall()], { env: { SPIXI_PACKAGED_LEAN: 'css,js' } }),
  plain('stripoff', 'Release, SpixiStripHtml=false', { ...REL, SpixiStripHtml: 'false' }, RAWONLY, () => []),
  plain('debug', 'Debug, all off', { Configuration: 'Debug' }, RAWONLY, () => []),
  plain('offexplicit', 'Release, all three =false explicitly', { ...REL, SpixiLeanCss: 'false', SpixiLeanJs: 'false', SpixiLeanCssFull: 'false' }, TODAY, () => [stripCall()]),
  lean('css', 'Release, SpixiLeanCss=true', { SpixiLeanCss: 'true' }),
  parked('js', 'Release + dev + Android + SpixiLeanJs=true: PARKED (P-07), no node call', { ...RDEV, SpixiLeanJs: 'true' }, 'true'),
  parked('both', 'Release + dev + Android + SpixiLeanCss=true + SpixiLeanJs=true: PARKED, no node call (css alone would have been lean)', { ...RDEV, SpixiLeanCss: 'true', SpixiLeanJs: 'true' }, 'true'),
  lean('casetrue', 'Release, SpixiLeanCss=True (case): the stamp text equals the one for true', { SpixiLeanCss: 'True' }, { on: { css: true, js: false } }),
  /* ★ D-1 — THE STAMP. A lean build that passed leaves <obj>/spixi-lean.stamp = the evaluated switches; a later build in the same obj folder with
   * other switches stops BEFORE node (a copy by timestamp would keep the newer files of the earlier build in bin). */
  refused('offafterboth', 'D-1: Release, all off AFTER a css run (same obj): SpixiLeanStaleGuard stops the build before any node call', { ...REL }, STALE(), () => [], { pre: [CSS] }),
  refused('cssafterboth', 'D-1: Release, SpixiLeanCss=true over a stamp "css=true js=true" left by an older css + js build (same obj): the guard compares the stamp and stops before any node call', { ...RDEV, SpixiLeanCss: 'true' }, CHANGED('css=true js=true', 'css=true js=false'), () => [], { pre: [OLDBOTH] }),
  parked('bothaftercss', 'D-1: Release, both AFTER a css-only run (same obj): the PARK text, not the stamp text (the park comes first)', { ...RDEV, SpixiLeanCss: 'true', SpixiLeanJs: 'true' }, 'true', { pre: [CSS] }),
  refused('stripoffafterboth', 'D-1: Release, -p:SpixiStripHtml=false over a stamp "css=true js=true" left by an older build (same obj): the stale guard runs whatever SpixiStripHtml is', { ...REL, SpixiStripHtml: 'false' }, STALE(), () => [], { pre: [OLDBOTH] }),
  lean('cssaftercss', 'D-1: Release, SpixiLeanCss=true AFTER a css run (same obj): the same switches pass', { SpixiLeanCss: 'true' }, { pre: [CSS] }),
  lean('spellings', 'D-1: Release, SpixiLeanCss=yes after =true, =On and =True runs (same obj): MSBuild\'s true words give ONE stamp text, so a new spelling never trips the stamp',
    { SpixiLeanCss: 'yes' }, { on: { css: true, js: false }, pre: [CSS, { props: { ...RDEV, SpixiLeanCss: 'On' } }, { props: { ...RDEV, SpixiLeanCss: 'True' } }] }),
  lean('srcchange', 'D-1: Release, css after a css run with a CHANGED source stylesheet (same obj): passes, and the packaged lean copy holds the new bytes', { SpixiLeanCss: 'true' }, {
    pre: [CSS, () => { writeFileSync(join(RAW, CSS_SRC), readFileSync(join(RAW, CSS_SRC), 'utf8') + '\n.harness-src-change { color: red }\n'); }],
    check: (r, P) => {
      const full = (r.items.find((it) => it.logical === CSS_SRC) || {}).full;
      if (!full || !readFileSync(full, 'utf8').includes('.harness-src-change { color: red }')) P.push(CSS_SRC + ': the packaged copy does not hold the changed source bytes');
    },
    after: () => { const f = join(RAW, CSS_SRC); writeFileSync(f, readFileSync(f, 'utf8').replace('\n.harness-src-change { color: red }\n', '')); },
  }),
  plain('otherconfig', 'D-1: Debug, all off AFTER a Release css run: the Release stamp is in obj/Release/…, the Debug build reads obj/Debug/… and passes', { Configuration: 'Debug', IntermediateOutputPath: 'obj/Debug/net10.0-android/' }, RAWONLY, () => [], { pre: [CSS] }),
  plain('afterwipe', 'D-1: Release, all off AFTER a css run and a wiped obj folder: today\'s package', { ...REL }, TODAY, () => [stripCall()], { pre: [CSS, fresh] }),
  refused('stampcorrupt', 'D-1: Release, SpixiLeanCss=true with a stamp that holds another text (fail closed)', { ...RDEV, SpixiLeanCss: 'true' }, CHANGED('garbage', 'css=true js=false'), () => [], { pre: [writeStamp('garbage\n')] }),
  refused('stampempty', 'D-1: Release, SpixiLeanCss=true with an EMPTY stamp file (fail closed)', { ...RDEV, SpixiLeanCss: 'true' }, CHANGED('', 'css=true js=false'), () => [], { pre: [writeStamp('')] }),
  { id: 'failnostamp', label: 'D-1: the lean call fails in a fresh obj (SPIXI_FAKE_FAIL): no stamp is written; a following all-off build passes', fake: true,
    run: (P) => {
      fresh();
      const r = msbuild({ ...RDEV, SpixiLeanCss: 'true' }, { SPIXI_FAKE_FAIL: '1' });
      const s = failBuild(r, 'exited with code 1', P);
      if (stampNow() !== null) P.push('a failed lean build left ' + stampShow(stampNow()));
      const r2 = msbuild({ ...REL });
      if (okBuild(r2, P)) expectSources(r2, TODAY, 'none', P);
      return s + ' · then all off: exit ' + r2.status + ' · ' + stampShow(stampNow());
    } },
  { id: 'failkeepsstamp', label: 'D-1: css passes, css again with the lean call failing (SPIXI_FAKE_FAIL), css again: the failure does not change the stamp, the third build passes', fake: true,
    run: (P) => {
      fresh();
      if (!okBuild(msbuild({ ...RDEV, SpixiLeanCss: 'true' }), P)) return 'pre-run failed';
      const r = msbuild({ ...RDEV, SpixiLeanCss: 'true' }, { SPIXI_FAKE_FAIL: '1' });
      const s = failBuild(r, 'exited with code 1', P);
      if ((stampNow() || '').trimEnd() !== canon(true, false)) P.push('after the failed build: ' + stampShow(stampNow()));
      const r3 = msbuild({ ...RDEV, SpixiLeanCss: 'true' });
      if (okBuild(r3, P)) expectSources(r3, leanSrc(true, false), 'css', P);
      return s + ' · then css again: exit ' + r3.status + ' · ' + stampShow(stampNow());
    } },
  /* the RemoveDir is still the belt when the stamp is gone but the lean dir is not (a stamp deleted by hand) */
  lean('cssafterbothnostamp', 'RemoveDir belt: Release, SpixiLeanCss=true after a css run whose stamp was deleted by hand and a js file left in the lean folder: no js file of the earlier run ships', { SpixiLeanCss: 'true' }, { pre: [CSS, dropStamp, plantJs] }),
  refused('emptyafterboth', 'RemoveDir belt: writes nothing after a css run whose stamp was deleted by hand', { ...RDEV, SpixiLeanCss: 'true' }, 'wrote no file into', null, { fakeOnly: true, pre: [CSS, dropStamp], env: { SPIXI_FAKE_EMPTY: '1' } }),
  /* ★ S-3 — a store build is never lean before the ruling of the lean defaults: from -p and from the environment, every switch; same Condition text as the store gate */
  refused('storecss', 'S-3: Release + SpixiStoreRelease=true + SpixiLeanCss=true: the store gate passes, the guard refuses; no node call', { ...REL, SpixiStoreRelease: 'true', SpixiLeanCss: 'true' }, STORE('true', 'false'), () => [],
    { check: (r, P) => { if (!r.out.includes('Spixi store-release gate (O-35): passed')) P.push('the store gate did not run first'); } }),
  parked('storejs', 'S-3 + PARK: Release + SpixiStoreRelease=true + SpixiLeanJs=true: the PARK text comes before the store text', { ...REL, SpixiStoreRelease: 'true', SpixiLeanJs: 'true' }, 'true'),
  parked('storeboth', 'S-3 + PARK: Release + SpixiStoreRelease=true + both: the PARK text', { ...REL, SpixiStoreRelease: 'true', SpixiLeanCss: 'true', SpixiLeanJs: 'true' }, 'true'),
  parked('storeenvjs', 'S-3 + PARK: Release + -p:SpixiStoreRelease=true + SpixiLeanJs=true in the ENVIRONMENT: the PARK text', { ...REL, SpixiStoreRelease: 'true' }, 'true', { env: { SpixiLeanJs: 'true' } }),
  refused('storeenvcssonly', 'S-3: Release + -p:SpixiStoreRelease=true + SpixiLeanCss=true in the ENVIRONMENT: the store text', { ...REL, SpixiStoreRelease: 'true' }, STORE('true', 'false'), () => [], { env: { SpixiLeanCss: 'true' } }),
  refused('storeenvstore', 'S-3: Release + SpixiStoreRelease=true in the ENVIRONMENT + -p:SpixiLeanCss=true', { ...REL, SpixiLeanCss: 'true' }, STORE('true', 'false'), () => [], { env: { SpixiStoreRelease: 'true' } }),
  refused('storeyes', 'S-3: Release + SpixiStoreRelease=yes + SpixiLeanCss=true: the gate reads yes as true, so does the guard', { ...REL, SpixiStoreRelease: 'yes', SpixiLeanCss: 'true' }, 'Spixi lean packaging: a store build (SpixiStoreRelease=yes) cannot be lean', () => [],
    { check: (r, P) => { if (!r.out.includes('Spixi store-release gate (O-35): passed')) P.push('the store gate did not run (it reads yes as true)'); } }),
  /* ★ #46 perflean r2 S-1 — a lean build must be a DEV build (SpixiDevCoexist true, the app-id test of the csproj); a set store / dev value that is not a boolean word is refused */
  refused('nodevcss', 'r2 S-1: Release + SpixiLeanCss=true WITHOUT SpixiDevCoexist (the production id): refused, no node call', { ...REL, SpixiLeanCss: 'true' }, DEVTEXT(''), () => []),
  parked('nodevenvjs', 'PARK: Release + SpixiLeanJs=true in the ENVIRONMENT, no SpixiDevCoexist: the PARK text comes before the dev text', { ...REL }, 'true', { env: { SpixiLeanJs: 'true' } }),
  refused('nodevenvcss', 'r2 S-1: Release + SpixiLeanCss=true in the ENVIRONMENT, no SpixiDevCoexist: refused', { ...REL }, DEVTEXT(''), () => [], { env: { SpixiLeanCss: 'true' } }),
  refused('devfalse', 'r2 S-1: Release + SpixiDevCoexist=false + SpixiLeanCss=true: refused', { ...REL, SpixiDevCoexist: 'false', SpixiLeanCss: 'true' }, DEVTEXT('false'), () => []),
  refused('devword1', 'r2 S-1: Release + SpixiDevCoexist=1 + SpixiLeanCss=true: not a boolean word, refused', { ...REL, SpixiDevCoexist: '1', SpixiLeanCss: 'true' }, DEVWORD('1'), () => []),
  refused('devwordspace', "r2 S-1: Release + SpixiDevCoexist='true ' + SpixiLeanCss=true: not a boolean word (MSBuild keeps the space), refused", { ...REL, SpixiDevCoexist: 'true ', SpixiLeanCss: 'true' }, DEVWORD('true '), () => []),
  refused('storeword1', 'r2 S-1: Release + SpixiStoreRelease=1 + dev + SpixiLeanCss=true: the store gate skips 1, the guard refuses it', { ...RDEV, SpixiStoreRelease: '1', SpixiLeanCss: 'true' }, STOREWORD('1'), () => [],
    { check: (r, P) => { if (r.out.includes('Spixi store-release gate (O-35)')) P.push('the store gate ran for SpixiStoreRelease=1'); } }),
  refused('storewordspace', "r2 S-1: Release + SpixiStoreRelease='true ' + dev + SpixiLeanCss=true: refused", { ...RDEV, SpixiStoreRelease: 'true ', SpixiLeanCss: 'true' }, STOREWORD('true '), () => []),
  parked('storewordparked', "PARK: Release + SpixiStoreRelease='true ' + dev + SpixiLeanJs=true: the PARK text comes before the store-word text", { ...RDEV, SpixiStoreRelease: 'true ', SpixiLeanJs: 'true' }, 'true'),
  refused('storedevcss', 'r2 S-1: Release + SpixiStoreRelease=true + SpixiDevCoexist=true + SpixiLeanCss=true: the STORE GATE refuses first (a store build is never a dev build)', { ...RDEV, SpixiStoreRelease: 'true', SpixiLeanCss: 'true' }, 'Spixi store-release gate (O-35): SpixiDevCoexist=true in a store build.', () => []),
  lean('devyes', 'r2 S-1: Release + SpixiDevCoexist=yes + SpixiLeanCss=true: yes is true for the app-id test and for the guard — a lean build', { SpixiDevCoexist: 'yes', SpixiLeanCss: 'true' }),
  plain('nodevoff', 'r2 S-1: Release, no SpixiDevCoexist, all lean off: today\'s package (the dev rule binds only a lean build)', { ...REL, SpixiDevCoexist: '1' }, TODAY, () => [stripCall()]),
  plain('storeoff', 'S-3: Release + SpixiStoreRelease=true, no lean switch: today\'s store build (the gate passes, tokens-only strip)', { ...REL, SpixiStoreRelease: 'true' }, TODAY, () => [stripCall()],
    { check: (r, P) => { if (!r.out.includes('Spixi store-release gate (O-35): passed')) P.push('the store gate Message is missing'); } }),
  refused('storedebugcss', 'Debug + SpixiStoreRelease=true + SpixiLeanCss=true (the store gate refuses FIRST)', { Configuration: 'Debug', SpixiStoreRelease: 'true', SpixiLeanCss: 'true' }, 'SpixiStoreRelease=true needs Configuration=Release', () => []),
  /* ★ #46 perflean r3 B-3 / S-1 — a lean package is ANDROID only before the ruling of the lean defaults: SpixiDevCoexist=true moves the app id only when the
   * TargetFramework contains -android (Spixi.csproj line 41), so on iOS, Mac Catalyst and Windows a dev build keeps the PRODUCTION id. The guard refuses
   * (after the dev-build rule, before the strip rule), with no node call; an unset TargetFramework is refused too. All off = today's build on every platform. */
  refused('tfios', 'r3 B-3: Release + dev + SpixiLeanCss=true + net10.0-ios: refused with the Android-only text, no node call (dev id would not move)', { ...RDEV, TargetFramework: 'net10.0-ios', SpixiLeanCss: 'true' }, TFTEXT('net10.0-ios'), () => [],
    { check: noText(DEVTEXT('true').slice(0, 90), 'dev-build') }),
  refused('tfmac', 'r3 B-3: Release + dev + SpixiLeanCss=true + net10.0-maccatalyst: refused, no node call', { ...RDEV, TargetFramework: 'net10.0-maccatalyst', SpixiLeanCss: 'true' }, TFTEXT('net10.0-maccatalyst'), () => []),
  refused('tfwin', 'r3 B-3: Release + dev + SpixiLeanCss=true + net10.0-windows10.0.19041.0: refused, no node call', { ...RDEV, TargetFramework: 'net10.0-windows10.0.19041.0', SpixiLeanCss: 'true' }, TFTEXT('net10.0-windows10.0.19041.0'), () => []),
  parked('parkios', 'PARK: Release + dev + net10.0-ios + SpixiLeanJs=true: the PARK text comes before the Android text', { ...RDEV, TargetFramework: 'net10.0-ios', SpixiLeanJs: 'true' }, 'true'),
  refused('tfunset', 'r3 B-3: Release + dev + SpixiLeanCss=true + NO TargetFramework at all: refused (the test fails closed on an empty value), no node call', { Configuration: 'Release', SpixiDevCoexist: 'true', SpixiLeanCss: 'true' }, TFTEXT(''), () => []),
  refused('tfempty', "r3 B-3: Release + dev + SpixiLeanCss=true + -p:TargetFramework= (explicitly empty): refused", { ...RDEV, TargetFramework: '', SpixiLeanCss: 'true' }, TFTEXT(''), () => []),
  refused('tfenvios', 'r3 B-3: Release + dev + net10.0-ios + SpixiLeanCss=true in the ENVIRONMENT: refused (an environment variable alone cannot make an iOS package lean)', { ...RDEV, TargetFramework: 'net10.0-ios' }, TFTEXT('net10.0-ios'), () => [], { env: { SpixiLeanCss: 'true' } }),
  refused('tfdebugios', 'r3 B-3: Debug (dev by default) + SpixiStripHtml=true + SpixiLeanCss=true + net10.0-ios: refused with the Android-only text, not the strip text', { Configuration: 'Debug', TargetFramework: 'net10.0-ios', SpixiStripHtml: 'true', SpixiLeanCss: 'true' }, TFTEXT('net10.0-ios'), () => [],
    { check: noText(NEEDS, 'strip') }),
  refused('tforderdev', 'r3 B-3 order: Release + NO SpixiDevCoexist + net10.0-ios + SpixiLeanCss=true: the DEV text comes first', { ...REL, TargetFramework: 'net10.0-ios', SpixiLeanCss: 'true' }, DEVTEXT(''), () => [],
    { check: noText(TFTEXT('net10.0-ios').slice(0, 90), 'Android-only') }),
  refused('tforderstore', 'r3 B-3 order: Release + SpixiStoreRelease=true + net10.0-ios + SpixiLeanCss=true: the STORE text comes first', { ...REL, SpixiStoreRelease: 'true', TargetFramework: 'net10.0-ios', SpixiLeanCss: 'true' }, STORE('true', 'false'), () => [],
    { check: noText(TFTEXT('net10.0-ios').slice(0, 90), 'Android-only') }),
  refused('tfbeforestamp', 'r3 B-3 order: Release + dev + net10.0-ios + SpixiLeanCss=true over a stamp "css=true js=true" of an older build (same obj, a stamp of other switches): the Android-only text comes BEFORE the stamp text', { ...RDEV, TargetFramework: 'net10.0-ios', SpixiLeanCss: 'true' }, TFTEXT('net10.0-ios'), () => [],
    { pre: [OLDBOTH], check: noText('the lean switches changed in this obj folder', 'stamp') }),
  /* ★ #46 perflean r4 B-1 — THE GUARANTEE ITSELF: the guard also tests the EVALUATED ApplicationId (decided when the project file is read). A SpixiDevCoexist set by a file imported
   * AFTER the body (Spixi.csproj.user, Directory.Build.targets) or an ApplicationId on the build line cannot give the dev id; both used to pass the two property tests. */
  refused('lateimport', 'r4 B-1: Release + Android + SpixiLeanCss=true, SpixiDevCoexist=true set by a file IMPORTED AFTER the project body (late .user / Directory.Build.targets): the app id stays com.ixilabs.spixi, refused with the ApplicationId text, no node call', { Configuration: 'Release', TargetFramework: ANDROID, SpixiLeanCss: 'true', HarnessLate: LATE_DEV }, APPIDTEXT('com.ixilabs.spixi', 'true', ANDROID), () => [],
    { check: noText('only in a dev build before the ruling', 'dev-build') }),
  refused('lateimportenv', 'r4 B-1: the same with SpixiLeanCss=true in the ENVIRONMENT', { Configuration: 'Release', TargetFramework: ANDROID, HarnessLate: LATE_DEV }, APPIDTEXT('com.ixilabs.spixi', 'true', ANDROID), () => [], { env: { SpixiLeanCss: 'true' } }),
  parked('parklate', 'PARK: Release + Android + SpixiLeanJs=true + SpixiDevCoexist=true from a late import: the PARK text comes before the ApplicationId text', { Configuration: 'Release', TargetFramework: ANDROID, SpixiLeanJs: 'true', HarnessLate: LATE_DEV }, 'true'),
  refused('appidprod', 'r4 B-1: Release + dev + Android + SpixiLeanCss=true + -p:ApplicationId=com.ixilabs.spixi (the production id on the build line): refused with the ApplicationId text', { ...RDEV, SpixiLeanCss: 'true', ApplicationId: 'com.ixilabs.spixi' }, APPIDTEXT('com.ixilabs.spixi', 'true', ANDROID), () => []),
  refused('appidother', 'r4 B-1: Release + dev + Android + SpixiLeanCss=true + -p:ApplicationId=com.example.other: refused (only the dev id is a lean package)', { ...RDEV, SpixiLeanCss: 'true', ApplicationId: 'com.example.other' }, APPIDTEXT('com.example.other', 'true', ANDROID), () => []),
  refused('appidios', 'r4 B-1 order: Release + dev + iOS + SpixiLeanCss=true: the ANDROID text still comes first (the ApplicationId text is the last word)', { ...RDEV, TargetFramework: 'net10.0-ios', SpixiLeanCss: 'true' }, TFTEXT('net10.0-ios'), () => [],
    { check: noText('only with the dev app id', 'ApplicationId') }),
  lean('appidctl', 'r4 B-1 control: Release + dev + Android on the build line + SpixiLeanCss=true: a lean build whose evaluated ApplicationId is com.ixilabs.spixi.dev (asserted in every lean scenario)', { SpixiLeanCss: 'true' }),
  plain('lateoff', 'r4 B-1 control: Release, all lean switches off + a late-import file that sets SpixiDevCoexist=true: today\'s package (the ApplicationId rule binds only a lean build)', { Configuration: 'Release', TargetFramework: ANDROID, HarnessLate: LATE_DEV }, TODAY, () => [stripCall()]),
  lean('lateunrelated', 'r4 B-1 control: Release + dev + Android + SpixiLeanCss=true + a late-import file that sets an unrelated property: a lean build (a late import alone is not refused)', { SpixiLeanCss: 'true', HarnessLate: LATE_OTHER }),
  plain('tfoffios', 'r3 B-3: Release + net10.0-ios, all lean off: today\'s package (the Android rule binds only a lean build)', { ...REL, TargetFramework: 'net10.0-ios' }, TODAY, () => [stripCall()]),
  plain('tfoffwin', 'r3 B-3: Release + dev + net10.0-windows10.0.19041.0, all lean off: today\'s package', { ...REL, SpixiDevCoexist: 'true', TargetFramework: 'net10.0-windows10.0.19041.0' }, TODAY, () => [stripCall()]),
  plain('tfoffmac', 'r3 B-3: Debug + net10.0-maccatalyst, all lean off: today\'s Debug package (raw)', { Configuration: 'Debug', TargetFramework: 'net10.0-maccatalyst' }, RAWONLY, () => []),
  lean('tfandroidver', 'r3 B-3: Release + dev + SpixiLeanCss=true + net10.0-android35.0 (a platform version suffix): Android, a lean build', { TargetFramework: 'net10.0-android35.0', SpixiLeanCss: 'true' }),
  /* ★ D-4 — a design-time build (Visual Studio's IntelliSense builds) never runs the lean call or a lean Error: the item list is what the tokens-only target alone gives */
  plain('dtbcss', 'D-4: Release + DesignTimeBuild=true + SpixiLeanCss=true: no lean call, no Error, the tokens-only package', { ...REL, DesignTimeBuild: 'true', SpixiLeanCss: 'true' }, TODAY, () => [stripCall()]),
  plain('dtbenvboth', 'D-4: Release + DesignTimeBuild=true + both switches in the ENVIRONMENT', { ...REL, DesignTimeBuild: 'true' }, TODAY, () => [stripCall()], { env: { SpixiLeanCss: 'true', SpixiLeanJs: 'true' } }),
  plain('dtbdebugcss', 'D-4: Debug + DesignTimeBuild=true + SpixiLeanCss=true: no guard Error (IntelliSense keeps working)', { Configuration: 'Debug', DesignTimeBuild: 'true', SpixiLeanCss: 'true' }, RAWONLY, () => []),
  plain('dtbtypo', 'D-4: Release + DesignTimeBuild=true + SpixiLeanJs=tru: no guard Error', { ...REL, DesignTimeBuild: 'true', SpixiLeanJs: 'tru' }, TODAY, () => [stripCall()]),
  plain('dtbstale', 'D-4: Release + DesignTimeBuild=true, all off, AFTER a css run: no stale Error in a design-time build', { ...REL, DesignTimeBuild: 'true' }, TODAY, () => [stripCall()], { pre: [CSS] }),
  plain('dtbchanged', 'D-4: Release + DesignTimeBuild=true + SpixiLeanCss=true over a stamp "css=true js=true": no stamp Error in a design-time build', { ...REL, DesignTimeBuild: 'true', SpixiLeanCss: 'true' }, TODAY, () => [stripCall()], { pre: [OLDBOTH] }),
  refused('debugcss', 'Debug + SpixiLeanCss=true (Android)', { Configuration: 'Debug', TargetFramework: ANDROID, SpixiLeanCss: 'true' }, NEEDS, () => []),
  { id: 'debugstripcss', label: 'D-5 (c): Debug + SpixiStripHtml=true + SpixiLeanCss=true BUILDS lean (the rule is SpixiStripHtml, not the configuration)',
    run: (P) => {
      fresh();
      const DBG = 'obj/Debug/net10.0-android/';
      const r = msbuild({ Configuration: 'Debug', TargetFramework: ANDROID, SpixiStripHtml: 'true', SpixiLeanCss: 'true', IntermediateOutputPath: DBG });
      if (!okBuild(r, P)) return 'build failed';
      expectSet(r.items, P);
      const leanDir = join(SPIXI, DBG, 'spixi-lean', 'html') + sep;
      const n = r.items.filter((it) => resolve(it.full).startsWith(resolve(leanDir) + sep)).length;
      if (!n) P.push('no asset comes from ' + relative(TMP, leanDir));
      if (!r.out.includes('Spixi: LEAN Release packaging applied (SpixiLeanCss=true')) P.push('no lean Message');
      return 'ok: lean ' + n + ' asset(s) from ' + relative(TMP, leanDir);
    } },
  refused('stripoffjs', 'Release + SpixiStripHtml=false + SpixiLeanCss=true', { ...RDEV, SpixiStripHtml: 'false', SpixiLeanCss: 'true' }, NEEDS, () => []),
  parked('parkstripoff', 'PARK: Release + SpixiStripHtml=false + SpixiLeanJs=true: the PARK text comes before the strip text', { ...RDEV, SpixiStripHtml: 'false', SpixiLeanJs: 'true' }, 'true'),
  refused('typojs', 'Release + SpixiLeanJs=tru (not true/false)', { ...RDEV, SpixiLeanJs: 'tru' }, "SpixiLeanJs='tru' is not true or false. Set it to true, or remove the property (a -p: switch, an environment variable, or a props / .user file).", () => []),
  refused('parkfull', 'PARK order: Release + SpixiLeanJs=true + SpixiLeanCssFull=true: the CssFull text comes first', { ...RDEV, SpixiLeanJs: 'true', SpixiLeanCssFull: 'true' }, NOTBUILT, () => []),
  parked('parkdebug', 'PARK: Debug (dev by default) + Android + SpixiLeanJs=true: the PARK text, not the strip text', { Configuration: 'Debug', TargetFramework: ANDROID, SpixiLeanJs: 'true' }, 'true', { check: noText('needs the Release packaging strip', 'strip') }),
  parked('parknodev', 'PARK: Release + Android + SpixiLeanJs=true + no SpixiDevCoexist: the PARK text comes before the dev text', { ...REL, SpixiLeanJs: 'true' }, 'true'),
  /* ★ MSBuild compares two boolean-looking operands AS BOOLEANS: 'yes' / 'on' == 'true' and 'no' / 'off' / '!true' == 'false' in every Condition of the
   * csproj. So `SpixiLeanJs=yes` is NOT refused by the guard ("is not true or false" never fires for it): it is a lean-js build, and `=no` is "off".
   * Pinned as the real behaviour. The lead's decision (perflean fixer-f3): these semantics STAY — the csproj comment above the three properties
   * says so (true / yes / on = on, false / no / off = off, any letter case, every other value stops the build) and scripts/pins-perflean/d-package.mjs
   * models the same rule (its header has the probe table). */
  parked('yesjs', 'PARK: Release + SpixiLeanJs=yes: MSBuild reads yes as true, so it is parked (the text shows the value as given)', { ...RDEV, SpixiLeanJs: 'yes' }, 'yes'),
  parked('onjsenv', 'PARK: Release + SpixiLeanJs=On in the ENVIRONMENT: parked', { ...RDEV }, 'On', { env: { SpixiLeanJs: 'On' } }),
  lean('escapedtrue', 'Release + SpixiLeanCss=%74rue: MSBuild unescapes it to true — a lean-css build (the csproj comment says so)', { SpixiLeanCss: '%74rue' }, { on: { css: true, js: false }, shown: { css: 'true', js: 'false' } }),
  plain('nojs', 'Release + SpixiLeanJs=no: MSBuild reads no as false — NOT refused, today\'s package (guard and lean target skipped)', { ...REL, SpixiLeanJs: 'no' }, TODAY, () => [stripCall()]),
  plain('offjs', 'Release + SpixiLeanJs=OFF and =!true: MSBuild reads both as false — today\'s package (the PARK Error binds only an ON value)', { ...REL, SpixiLeanJs: 'OFF' }, TODAY, () => [stripCall()]),
  plain('notruejs', 'Release + SpixiLeanJs=!true: false — today\'s package', { ...REL, SpixiLeanJs: '!true' }, TODAY, () => [stripCall()]),
  iopRefused('emptyiop', ''),
  iopRefused('spaceiop', ' '),
  iopRefused('dotiop', '.'),
  iopRefused('dotslashiop', './', { SpixiLeanCss: 'true' }),
  iopRefused('objdotdotiop', 'obj/../'),
  { id: 'outsideiop', label: 'D-5 (a): Release + SpixiLeanCss=true + IntermediateOutputPath = a folder OUTSIDE the project folder (absolute): accepted; every lean file, the tokens-only copy and the stamp live there; nothing new in the project folder',
    run: (P) => {
      fresh();
      const OUT = join(TMP, 'elsewhere', 'obj') + sep;
      rmSync(join(TMP, 'elsewhere'), { recursive: true, force: true });
      const before = snap();
      const r = msbuild({ ...RDEV, SpixiLeanCss: 'true', IntermediateOutputPath: OUT });
      if (!okBuild(r, P)) return 'build failed';
      expectSet(r.items, P);
      const from = (d) => r.items.filter((it) => resolve(it.full).startsWith(resolve(OUT, d) + sep)).length;
      const nLean = from('spixi-lean'), nStrip = from('spixi-strip');
      if (!nLean) P.push('no asset from ' + relative(TMP, OUT) + 'spixi-lean/');
      const st = existsSync(join(OUT, 'spixi-lean.stamp')) ? readFileSync(join(OUT, 'spixi-lean.stamp'), 'utf8').trimEnd() : null;
      if (st !== canon(true, false)) P.push('the stamp in the redirected folder is ' + JSON.stringify(st));
      if (r.calls.length !== 2 || !r.calls.every((c) => (REAL ? c : JSON.stringify(c)).includes(OUT.replace(/\\/g, '\\\\')))) P.push('script calls do not both name ' + OUT + ': ' + r.calls.map((c) => (REAL ? c : JSON.stringify(c))).join(' · '));
      const d = snapDiff(before, snap());
      if (d.added.length || d.gone.length) P.push('the project folder changed: +[' + d.added.join(', ') + '] -[' + d.gone.join(', ') + ']');
      rmSync(join(TMP, 'elsewhere'), { recursive: true, force: true });
      return 'ok: lean ' + nLean + ' + tokens-only ' + nStrip + ' asset(s) from ' + relative(TMP, OUT) + ' · stamp there "' + st + '" · project folder unchanged';
    } },
  /* LEGACY behaviour (today's tokens-only target SpixiStripReleaseHtml, untouched by this batch, no lean property): an EMPTY IntermediateOutputPath
   * makes the tokens-only strip write <project dir>/spixi-strip/html/spixi.tokens.css and pack THAT copy; the build passes. Pinned exactly as it is
   * (3 new entries, one call, the stray copy packaged), so a change of the legacy path shows here; the folder is removed afterwards. The stale guard
   * skips its test for an empty IntermediateOutputPath, so it adds nothing here. */
  { id: 'offemptyiop', label: 'LEGACY behaviour — Release, all off, IntermediateOutputPath EMPTY (-p:IntermediateOutputPath=): the untouched tokens-only strip writes spixi-strip/html/ into the project folder and packs that copy; the build passes',
    run: (P) => {
      fresh();
      const STRAY = join(SPIXI, 'spixi-strip');
      rmSync(STRAY, { recursive: true, force: true });
      const before = snap();
      const r = msbuild({ ...REL, IntermediateOutputPath: '' });
      if (!okBuild(r, P)) { rmSync(STRAY, { recursive: true, force: true }); return 'build failed'; }
      const strayDir = STRAY + sep + 'html' + sep;
      expectSet(r.items, P);
      const by = new Map(r.items.map((it) => [it.logical, it.full]));
      let raw = 0;
      for (const [logical, rawPath] of W) {
        const want = logical === H + 'spixi.tokens.css' ? strayDir + 'spixi.tokens.css' : rawPath;
        if (resolve(by.get(logical) || '') !== resolve(want)) P.push(logical + ': from ' + relative(TMP, by.get(logical) || '(none)') + ', want ' + relative(TMP, want)); else if (want === rawPath) raw++;
      }
      const want = REAL ? 'node "' + join(TMP, 'scripts', 'strip-release.mjs') + '" --out "' + strayDir + '."' : JSON.stringify(['--out', strayDir + '.']);
      const got = r.calls.map((c) => (REAL ? c : JSON.stringify(c)));
      if (got.length !== 1 || got[0] !== want) P.push('script calls: got [' + got.join(' · ') + '], want exactly the tokens-only call [' + want + ']');
      if (r.out.includes('LEAN Release packaging applied')) P.push('a lean Message in a build with no lean property');
      if (!r.out.includes('Spixi: Release packaging strip applied (spixi.tokens.css from ' + strayDir + ')')) P.push('the tokens-only Message does not name ' + strayDir);
      if (/Spixi lean packaging/.test(r.out)) P.push('a lean guard / lean target text appeared in an all-off build');
      const d = snapDiff(before, snap());
      if (d.gone.length) P.push('REMOVED from the project folder: ' + d.gone.slice(0, 5).join(', '));
      const wantAdded = ['spixi-strip', 'spixi-strip/html', 'spixi-strip/html/spixi.tokens.css'];
      if (d.added.join(',') !== wantAdded.join(',')) P.push('new in the project folder: [' + d.added.join(', ') + '], want [' + wantAdded.join(', ') + '] (the legacy behaviour moved)');
      const g1 = gate1(r, [], P);
      rmSync(STRAY, { recursive: true, force: true });
      return 'ok (legacy): ' + r.items.length + ' assets, each once · spixi.tokens.css from <project dir>/spixi-strip/html/ · raw ' + raw + ' · calls ' + r.calls.length + ' · new entries in the project folder ' + d.added.length + ': ' + d.added.join(', ') + g1;
    } },
  refused('full', 'Release + SpixiLeanCssFull=true', { ...RDEV, SpixiLeanCssFull: 'true' }, NOTBUILT + ' (SpixiLeanCssFull=true). Remove the property (a -p: switch, an environment variable, or a props / .user file); the comment strip of the stylesheets is SpixiLeanCss=true.', () => []),
  refused('fullcss', 'Release + SpixiLeanCssFull=true + SpixiLeanCss=true', { ...RDEV, SpixiLeanCssFull: 'true', SpixiLeanCss: 'true' }, NOTBUILT, () => []),
  refused('fulldebug', 'Debug + SpixiLeanCssFull=true', { Configuration: 'Debug', SpixiLeanCssFull: 'true' }, NOTBUILT, () => []),
  refused('typo', 'Release + SpixiLeanCss=1 (not true/false)', { ...RDEV, SpixiLeanCss: '1' }, "SpixiLeanCss='1' is not true or false", () => []),
  refused('scriptfail', 'the lean call exits 1 (SPIXI_FAKE_FAIL)', { ...RDEV, SpixiLeanCss: 'true' }, 'exited with code 1', () => [stripCall(), leanCall(['--lean-css'])], { fakeOnly: true, env: { SPIXI_FAKE_FAIL: '1' } }),
  refused('scriptempty', 'the lean call writes nothing (SPIXI_FAKE_EMPTY)', { ...RDEV, SpixiLeanCss: 'true' }, 'wrote no file into', () => [stripCall(), leanCall(['--lean-css'])], { fakeOnly: true, env: { SPIXI_FAKE_EMPTY: '1' } }),
  lean('subdir', 'a lean file in a subfolder: html/js/html5-qrcode.min.js (SPIXI_FAKE_SUBDIR)', { SpixiLeanCss: 'true' }, { fakeOnly: true, env: { SPIXI_FAKE_SUBDIR: '1' } }),
  refused('orphan', 'a lean file no asset carries: html/js/not-an-asset.js (SPIXI_FAKE_ORPHAN)', { ...RDEV, SpixiLeanCss: 'true' }, 'no MauiAsset carries: html' + sep + 'js' + sep + 'not-an-asset.js', null, { fakeOnly: true, env: { SPIXI_FAKE_ORPHAN: '1' } }),
  refused('oldscript', 'the script ignores the lean flags, writes only spixi.tokens.css (SPIXI_FAKE_IGNOREFLAGS)', { ...RDEV, SpixiLeanCss: 'true' }, 'did not write html' + sep + 'spixi.base.css', () => [stripCall(), leanCall(['--lean-css'])], { fakeOnly: true, env: { SPIXI_FAKE_IGNOREFLAGS: '1' } }),
  { id: 'dup', label: 'a LogicalName carried twice before the swap (harness adds a 2nd html/spixi.base.css item)', fake: true,
    run: (P) => {
      fresh(); mkdirSync(join(TMP, 'dup'), { recursive: true }); writeFileSync(join(TMP, 'dup', 'spixi.base.css'), 'dup');
      writeProject('\t\t<MauiAsset Include="..\\dup\\spixi.base.css" LogicalName="html$([System.IO.Path]::DirectorySeparatorChar)spixi.base.css" />\n');
      try { const r = msbuild({ ...RDEV, SpixiLeanCss: 'true' }); const s = failBuild(r, 'is carried twice', P); if (stampNow() !== null) P.push('a refused swap left ' + stampShow(stampNow())); return s; } finally { writeProject(); }
    } },
];

writeProject();
console.log('msbuild-harness: mode ' + (REAL ? 'REAL' : 'FAKE') + ' · dotnet ' + DOTNET.stdout.trim() + ' · csproj ' + CSPROJ + ' · tmp ' + TMP);
console.log('pieces (file order): ' + ordered.map((p) => p.name).join(' → '));
console.log('wholesale include: ' + INCLUDE_LINE + ' → ' + W.size + ' assets');
const rows = [];
let miss = 0;
for (const s of SCENARIOS) {
  if (ONLY && !ONLY.includes(s.id)) continue;
  if (s.fake && REAL) { rows.push([s.id, 'SKIP', s.label, 'fake mode only']); continue; }
  const P = [];
  let detail;
  try { detail = s.run(P); } catch (e) { P.push('THROW ' + (e && e.stack || e)); } finally { if (s.after) s.after(); }
  if (P.length) miss++;
  rows.push([s.id, P.length ? 'MISS' : 'ok', s.label, P.length ? P.join(' ; ') : detail]);
}
console.log('\n| scenario | result | what | key output |\n|---|---|---|---|');
for (const r of rows) console.log('| ' + r.join(' | ') + ' |');
console.log('\nmsbuild-harness: ' + (miss ? miss + ' scenario(s) MISSED' : 'every scenario held') + ' (' + rows.filter((r) => r[1] !== 'SKIP').length + ' run, ' + rows.filter((r) => r[1] === 'SKIP').length + ' skipped)');
if (!KEEP) rmSync(TMP, { recursive: true, force: true }); else console.log('kept: ' + TMP);
process.exit(miss ? 1 : 0);
