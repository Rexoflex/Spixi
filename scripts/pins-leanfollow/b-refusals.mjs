/* ==== leanfollow item 2 — the two packaging refusals (review round 5 of Speed lean, r5B-1 and r5B-2), widened in review round 1 (r1C-1, r1C-2, r1S-1, r1S-2, r1S-4, r1S-6, r1S-8) and round 2 (r2S-1, r2S-2, r2S-7, r2C-3, r2C-4, r2C-5, r2C-8) and round 3 (r3S-1, r3S-4 to r3S-7, r3C-2 to r3C-5: row 17 freezes the one-mode scenario sets, rows 19 and 20 are new; the Windows rename retry and the OneDrive ReparsePoint note are UNPROVEN on Windows).
 *
 * ROUND 2 (rows 1 2 4 5 changed, 15 to 18 new): the script also refuses an out folder inside the project folder Spixi/ unless it is under Spixi/obj or Spixi/bin (r2S-2; the MAUI default items embed every .css of the project
 *   folder: read from the upstream targets, NOT proven by a MAUI build) — row 1/2/4 gain 7 'project' folders; row 5 now allows only a folder outside Spixi/ and folders under obj or bin (the old near-miss neighbours moved:
 *   Spixi/Resources-sibling, ResourcesX/x, Platforms-sibling, PlatformsX/x -> Spixi/obj/Resources-sibling, obj/ResourcesX/x, bin/PlatformsX/x; Spixi/Resources-sibling is refused by the packed test, the other three are 'project' rows).
 *   Row 15: a HARD link at the out file is replaced, never written through. Row 16: the stamp-link Error. Row 17: the harness scenario ids and its FAILED: block (source). Row 18: outPreflight on a synthetic list, run.
 *
 * ROUND 6 (L-1, r5C-1): (L-1) mkTree copies its small Raw/html from the ORIGINAL committed folder named by SPIXI_PACKAGED_FROM when that is set and is a folder (smoke-packaged runs this pin in a copy whose spixi.tokens.css is already stripped, so rows 4 and 15 saw "not stripped" / "not the committed bytes"), else from Spixi/Resources/Raw/html of the tree; row 5 compares with that same source.
 *   (r5C-1) the project-folder rule (r2S-2) is now decided THROUGH A LINK: row 3 and row 4 (--in-place) gain an INBOUND link (outside the project folder, points to Spixi/Other) and an OUTBOUND link (inside Spixi/Other, points outside the project folder), each as `--out <link>` and `--out <link>/x`;
 *   row 21 gains `<link>/Spixi/Other/x`. The rule cut down to the as-written view only, or to the real view only, now turns a row red (see the DELIBERATE BREAKS, round 6).
 *
 * WHAT IT PINS
 *   The script rule (BEHAVIOUR: the real scripts/strip-release.mjs is run, in a scratch tree that holds a copy of the script, scripts/lib and a small Spixi/Resources/Raw/html, plus
 *   Resources/Fonts, Resources/Images, Platforms/Android/Assets and Raw/html/sub with a file each). Every --out of the plain strip and of the lean strip (--lean-css) refuses
 *   Spixi/Resources (the WHOLE folder: Raw, Fonts, Images, AppIcon, Splash) and Spixi/Platforms and anything under them, exit 1, nothing written anywhere in the scratch tree (rows 1, 2: 22 folders, 15 of Resources / Platforms and, from round 2, 7 of the rest of the project folder;
 *   the refusal text uses the sentence of its folder: "the asset folder" for Raw, "the packed folder" for the rest, "inside the source folder" for Raw/html/sub).
 *   Row 3: LINKS. A link inside Raw that points outside; a link OUTSIDE that points INTO Raw/lang, Raw, Raw/html/sub, Resources/Fonts, Platforms (`--out <link>` and `--out <link>/x`), and Raw/HTML where the file system
 *   ignores letter case. Row 4: the ONE exception (the out folder IS Raw/html and --in-place: exit 0, stripped; without --in-place: refused) and its BOUNDARY: every refused case of row 1 and every inbound link,
 *   run again WITH --in-place, plain and lean, each exit 1 REFUSED and the tree unchanged (50 calls). Row 5: the allowed folders (since round 2: outside Spixi/ — a folder beside the tree, Spixi-sibling/x — or under Spixi/obj or Spixi/bin: obj itself, bin/x,
 *   obj/Resources-sibling, obj/ResourcesX/x, bin/PlatformsX/x, obj/spixi-strip/html). Row 6: --in-place with any out folder that is not the source folder is a usage error, exit 2, plain and lean (r1S-6); with no --out it is exit 2 too.
 *   Row 7 (SOURCE): ONE function outFolderRefusal used by both --out paths, exiting with its code; ONE outPreflight, called by both writes. Row 11: the PRE-FLIGHT of the plain write too (r1S-2): <out>/spixi.tokens.css a link
 *   to a new file in Resources/Raw or to the committed stylesheet, a directory in its place, an out folder that is a file, a file on the way: exit 1, no uncaught throw, nothing written. Row 12: a DANGLING link as the out
 *   folder or a parent: a refusal text, not a throw (r1S-8).
 *   Rows 8 / 9 / 10 / 13 / 14 (SOURCE ROWS: the text of Spixi/Spixi.csproj, comments stripped, read as XML elements): R1 is the FIRST element of SpixiLeanReleaseHtml (the park twin); SpixiLeanGuard holds the R2 Error
 *   for Resources\Raw and, directly after it, the packed-folder Error (Resources or Platforms, joined by `or`); SpixiLeanReleaseHtml holds the same two Conditions as belts before RemoveDir, and the two LINK Errors
 *   (Exists + GetAttributes(...).ToString().Contains(`ReparsePoint`) for spixi-lean and spixi-lean\html) after them, before RemoveDir.
 *
 * ITS LIMITS (project rule 1735: stated in the first version)
 *   - (review round 4) A link planted inside obj or bin that points into the project folder (outside Resources / Platforms) is not refused — the exception is granted when any view says the folder is under obj or bin (a stricter test refused every build of a checkout reached through a linked folder, review round 4); a link into Resources/Raw, Resources or Platforms is still refused. Recorded, not fixed: a linked checkout with a link inside Raw that points outside (r4S-2, as at the base for the lean path); a write that fails after its temp file was created can leave a partial temp (r4S-5); r4S-8.
 *   - The csproj rows read TEXT. They prove the elements, their order and their Conditions; they do not run MSBuild. The harness (scripts/pins-perflean/msbuild-harness/run.mjs; it needs dotnet and is run by the
 *     lead, not by the suite) proves that MSBuild accepts the Conditions and fires them, in the real order (scenarios r1late, rawiop*, packed*, packedbelt*, rawnearmiss, platnearmiss, rawiopbelt, linklean, linkhtml,
 *     iopbylink, rawiopoff). The tokens-only target SpixiStripReleaseHtml is not edited; its bytes are held by pins-perflean/d-package row 3.
 *   - The out folder tests use the file system of the machine that runs the pin. The script decides "inside / same" by FOUR tests: (a) the REAL path (links followed), (b) the path AS WRITTEN (the lexical test, which
 *     includes the lexical "same": a path that is written as the folder itself), (c) device + inode of the out folder, (d) device + inode of every PARENT of the out folder. On Linux a link OUTSIDE that points into
 *     the packed folders (row 3, the inbound class) is held by (a) AND by (c) / (d) at the same time: switching off only one of them leaves every case red-free (proven: the real-path test off alone, the inode tests off
 *     alone), switching off both turns rows 3 and 4 red. The case-insensitive spelling Raw/HTML (macOS, Windows) is the only case where a folder has two names without a link: on a case-sensitive file system that
 *     case is SKIPPED (printed). A bind mount or a mount of the same folder under another path is not made here.
 *   - The link rows need symlink rights (not on a plain Windows account): without them the link cases are SKIPPED (printed).
 *   - "Nothing written" = the file list of the scratch tree (folders, files, sizes, SHA-256, links as links) is equal before and after. A write to a folder OUTSIDE the scratch tree is not looked for, except through the
 *     link targets, which live inside the scratch tree.
 *   - A refusal of the folder ABOVE the project folder (the repo root) is not pinned: it is outside the rule (Spixi/ itself is refused since round 2 and pinned: row 1 'Spixi itself'). The Raw/html exception is pinned for the folder as `Raw/html`; a link or a case spelling that
 *     is a second name for Raw/html is NOT run through --in-place here (it is the same folder, the exception allows it).
 *   - The pre-flight checks the state before the write; a link planted between the check and the write (a race) is not covered.
 *   - (r2C-5) On this Linux machine the four 'same / inside' tests overlap: the S6 / S7 / S8 style 'same' cases (an out folder written as the folder itself, with a trailing dot, with `..` segments) and the `..`-segment rule are
 *     also caught by the inode walk of the parents, so switching the lexical test or the `..` rule off alone does not turn a row red here; they are real on a file system without inode numbers (Windows exFAT / network drives: the
 *     script then relies on the real path and the lexical test, and a letter-case twin of a folder there is a limit the script head states). Row 15 needs hard links (SKIPPED without them). Row 17 reads the harness text, it does not run it.
 *
 * DELIBERATE BREAKS (project rule 802; each run with `node scripts/run-pins.mjs --root <scratch tree> pins-leanfollow/b-refusals`, ONE edit in the scratch copy, exact failing rows):
 *   script (scripts/strip-release.mjs): the Raw test of outFolderRefusal off -> rows 1 2 4; the Resources test off -> 1 2 3 4; the Platforms test off -> 1 2 3 4; the exception removed (always refuse the source folder) -> 4;
 *   the exception widened to Raw itself -> 4; widened to inside Raw/html -> 4; the lexical "inside" test off -> 3; the real-path test off AND the inode tests off -> 3 4 (each alone: no row, see the limits);
 *   the in-place usage error (exit 2) off -> 6; the call sites exit with a fixed 1 instead of why.code -> 6 7; the plain call of outFolderRefusal removed -> 1 3 4 6 12; the lean call removed -> 2 3 4 6 12;
 *   the plain pre-flight call removed -> 7 11; the lean pre-flight call removed -> 7 11 (r2C-8: the lean call is the second outPreflight call, so row 7 counts it too); the "a file on the way" test off -> 11; the link / non-regular target test off -> 11; the dangling-link test off -> 12.
 *   round 2: the plain write through the link (temp + rename replaced by a direct writeFileSync) -> 15; the project-folder test off -> 1 2 4 (and 5 stays green); `if (st && !st.isFile())` of outPreflight set to `if (false)` -> 11 18; the sub-link test of outPreflight off -> 18;
 *   round 4: the exception made strict again (a real-path-and-as-written `under` test) -> 20 21 (and the harness linked-tmp run); renameRetry replaced by a bare renameSync -> 20; the `made` flag removed -> 20; ContinueOnError="true" on any lean Error -> 19;
 *   a name added to or removed from FAKE_ONLY / REAL_ONLY, the FAILED print commented out -> 17.
 *   a harness scenario id removed (r1late, linklean, hardlinkoff) or its FAILED: print removed -> 17; the stamp-link Error removed -> 16.
 *   round 6 (r5C-1, L-1): in the project-folder rule of outFolderRefusal (`const proj = join(root, 'Spixi'), at = standing(proj);`): `at` taken from the path AS WRITTEN only (`relative(resolve(proj), outAbs)`) -> 3 4 21 (the INBOUND link cases and <link>/Spixi/Other/x; the outbound cases stay refused);
 *     `at` taken from the REAL path only (`relative(realOf(proj), outReal)`) -> 3 4 (the OUTBOUND link cases; row 21 stays green: the real path of <link>/Spixi/Other/x is inside); `at = 'outside'` (the rule removed) -> 1 2 3 4 21;
 *     mkTree reading Spixi/Resources/Raw/html of the tree instead of SPIXI_PACKAGED_FROM, in a packaged run (a copy with the stylesheet already stripped, SPIXI_PACKAGED_FROM = the committed folder) -> 4 15.
 *   csproj: R1 removed -> 8; the guard R2 Error removed -> 9 13; the belt R2 removed -> 10 13; the belt Condition changed (OrdinalIgnoreCase -> Ordinal) -> 10 13; the guard packed Error removed -> 13; its Platforms half removed -> 13;
 *   the packed belt removed -> 13 14; a link Error removed (either) -> 14; the first link Error moved after RemoveDir -> 14; a link Condition changed (ReparsePoint -> Hidden) -> 14. */
import { spawnSync } from 'node:child_process';
import { readFileSync as readRaw, writeFileSync, mkdtempSync, mkdirSync, cpSync, rmSync, readdirSync as readDir, statSync, lstatSync, existsSync, symlinkSync } from 'node:fs';
import * as fsLink from 'node:fs';
import { realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join as pjoin, dirname as pdirname, resolve as presolve } from 'node:path';

/* round 6 (L-1): the source of the small Raw/html of every scratch tree. smoke-packaged sets SPIXI_PACKAGED_FROM to the ORIGINAL committed folder and runs the suite in a copy whose stylesheet is already stripped; read at module start (children get an env without it, see `env` below) */
const PKG_FROM = (() => { const v = process.env.SPIXI_PACKAGED_FROM; try { return v && statSync(v).isDirectory() ? presolve(v) : null; } catch (_) { return null; } })();

export default async function (h) {
  const { ok, root } = h;
  const T = '★ leanfollow packaging refusals';
  const SR = 'scripts/strip-release.mjs';
  const HTML = 'Spixi/Resources/Raw/html';
  const SRC_HTML = PKG_FROM || pjoin(root, HTML);   // round 6 (L-1): the committed html folder the scratch trees are copied from
  const tmp = mkdtempSync(pjoin(tmpdir(), 'spixi-b-refusals-'));
  process.on('exit', () => { try { rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* best effort */ } });
  const row = (n, title, problems) => ok(problems.length === 0, T + ' (' + n + ') ' + title + (problems.length ? ' — ' + problems.slice(0, 4).join(' | ') + (problems.length > 4 ? ' | … +' + (problems.length - 4) : '') : ''));
  /* comment-stripped source (line-based: block comments that START a line, whole-line // comments, trailing // after a space): rows 17 and 20 read code, not comments (r3C-4, r4C-5) */
  const codeOf = (text) => { let inBlock = false; const out = []; for (const l of text.split('\n')) { const t = l.trim(); if (inBlock) { if (t.includes('*/')) inBlock = false; continue; } if (t.startsWith('/*')) { if (!t.includes('*/')) inBlock = true; continue; } if (t.startsWith('//')) continue; out.push(l.replace(/\s\/\/.*$/, '')); } return out.join('\n'); };   // LIMIT: a block comment that starts mid-line is not cut (a regex or glob string holding `/*` would swallow code in a whole-text cut)
  const sha = (f) => createHash('sha256').update(readRaw(f)).digest('hex').slice(0, 12);
  let linkOk = true;
  try { mkdirSync(pjoin(tmp, 'probe-target')); symlinkSync(pjoin(tmp, 'probe-target'), pjoin(tmp, 'probe-link'), 'junction'); } catch (e) { linkOk = false; console.log('  note: ' + T + ' — no link could be made here (' + (e && e.code) + '): every link case is SKIPPED on this machine'); }

  /* ---------- the scratch tree: the script, scripts/lib, a SMALL Raw/html (the non-shell files and two small shells), Raw/lang with a file ---------- */
  const KEEP_HTML = ['lock.html', 'scan.html'];
  let made = 0;
  const mkTree = () => {
    const t = pjoin(tmp, 't' + (++made));
    mkdirSync(pjoin(t, 'scripts'), { recursive: true });
    cpSync(pjoin(root, SR), pjoin(t, SR));
    cpSync(pjoin(root, 'scripts/lib'), pjoin(t, 'scripts/lib'), { recursive: true });
    const src = SRC_HTML;
    cpSync(src, pjoin(t, HTML), { recursive: true, filter: (p) => !(pdirname(p) === src && p.endsWith('.html') && !KEEP_HTML.includes(p.slice(src.length + 1))) });
    mkdirSync(pjoin(t, 'Spixi/Resources/Raw/lang'), { recursive: true });
    writeFileSync(pjoin(t, 'Spixi/Resources/Raw/lang/en.txt'), 'a language file\n');
    // round 1 (r1S-4): the other folders the build packs, with a file each, so a write there shows in the snapshot; and a sub folder of Raw/html
    for (const [d, fl] of [['Spixi/Resources/Fonts', 'f.txt'], ['Spixi/Resources/Images', 'i.txt'], ['Spixi/Platforms/Android/Assets', 'a.txt'], [HTML + '/sub', 's.txt']]) { mkdirSync(pjoin(t, d), { recursive: true }); writeFileSync(pjoin(t, d, fl), 'a file\n'); }
    return { dir: t, raw: pjoin(t, 'Spixi/Resources/Raw'), html: pjoin(t, HTML), script: pjoin(t, SR) };
  };
  const env = (() => { const e = { ...process.env }; delete e.SPIXI_PACKAGED_FROM; delete e.SPIXI_PACKAGED_LEAN; return e; })();
  const run = (t, args) => {
    const r = spawnSync(process.execPath, [t.script, ...args], { cwd: tmp, encoding: 'utf8', timeout: 120000, maxBuffer: 64 << 20, env });
    return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '', out: (r.stdout || '') + (r.stderr || ''), err: r.error && r.error.message };
  };
  const brief = (r) => 'exit ' + r.code + (r.err ? ' (' + r.err + ')' : '') + ': ' + ((r.stderr.trim().split('\n').pop() || r.stdout.trim().split('\n').pop() || '').slice(0, 130));
  /* the whole scratch tree as one list: every folder and every file with its size and hash ("nothing written" = this list is equal) */
  const snap = (d) => {
    const out = [];
    const walk = (x, pre) => {
      for (const e of readDir(x).sort()) {
        const q = pjoin(x, e), st = lstatSync(q);
        if (st.isSymbolicLink()) out.push(pre + e + ' -> link');
        else if (st.isDirectory()) { out.push(pre + e + '/'); walk(q, pre + e + '/'); }
        else out.push(pre + e + ' ' + st.size + ' ' + sha(q));
      }
    };
    walk(d, '');
    return out.join('\n');
  };
  const diffNote = (a, b) => { const A = new Set(a.split('\n')), B = new Set(b.split('\n')); return [...[...B].filter((x) => !A.has(x)).map((x) => '+' + x), ...[...A].filter((x) => !B.has(x)).map((x) => '-' + x)].slice(0, 3).join(' '); };
  const PLAIN = [], LEAN = ['--lean-css'];

  /* one refused call: exit 1, the text says REFUSED and names the folder, nothing written in the tree */
  const KIND = { asset: 'the asset folder ', packed: 'the packed folder ', source: 'inside the source folder ', project: 'the project folder ' };   // which sentence of the refusal: Raw / the rest of Resources and Platforms / inside Raw/html
  const refusedCall = (t, outArg, flags, expectName, problems, label, extra = [], kind = null) => {
    const before = snap(t.dir);
    const r = run(t, ['--out', outArg, ...flags, ...extra]);
    const after = snap(t.dir);
    if (r.code !== 1) problems.push(label + ': ' + brief(r) + ' (want exit 1)');
    else if (!/strip-release: REFUSED — the out folder /.test(r.stderr) || !r.stderr.includes(expectName)) problems.push(label + ': the refusal does not say REFUSED and name the folder: ' + JSON.stringify(r.stderr.trim().slice(0, 160)));
    else if (!r.stderr.includes('nothing was written')) problems.push(label + ': the refusal does not say "nothing was written"');
    else if (kind && !r.stderr.includes(KIND[kind])) problems.push(label + ': the refusal does not use the sentence "' + KIND[kind].trim() + '": ' + JSON.stringify(r.stderr.trim().slice(0, 150)));
    if (after !== before) problems.push(label + ': the tree changed (' + diffNote(before, after) + ')');
  };

  /* the refused folders, as written on the command line (relative to nothing: absolute paths of the scratch tree) */
  const refusedList = (t) => [
    ['Raw/lang/x', pjoin(t.raw, 'lang', 'x'), 'asset'],
    ['Raw/x', pjoin(t.raw, 'x'), 'asset'],
    ['Raw itself', t.raw, 'asset'],
    ['Raw/html/../lean2', pjoin(t.raw, 'html', '..', 'lean2'), 'asset'],
    ['Raw/html-sibling', t.html + '-sibling', 'asset'],
    ['Raw/html/sub (inside the source folder)', pjoin(t.html, 'sub'), 'source'],
    ['Raw/html/sub/x (deeper inside the source folder)', pjoin(t.html, 'sub', 'x'), 'source'],
    ['Raw/lang (an existing folder with a file)', pjoin(t.raw, 'lang'), 'asset'],
    // round 1 (r1S-4): the whole Resources folder and Platforms, which the MAUI default globs pack as well
    ['Resources/Raw-sibling (inside Resources, not Raw)', t.raw + '-sibling', 'packed'],
    ['Resources/Fonts/x', pjoin(t.dir, 'Spixi/Resources/Fonts/x'), 'packed'],
    ['Resources/Images (an existing folder with a file)', pjoin(t.dir, 'Spixi/Resources/Images'), 'packed'],
    ['Resources itself', pjoin(t.dir, 'Spixi/Resources'), 'packed'],
    ['Platforms itself', pjoin(t.dir, 'Spixi/Platforms'), 'packed'],
    ['Platforms/Android/Assets/x', pjoin(t.dir, 'Spixi/Platforms/Android/Assets/x'), 'packed'],
    ['Platforms/Android/Resources/y (a folder that does not exist yet)', pjoin(t.dir, 'Spixi/Platforms/Android/Resources/y'), 'packed'],
    // round 2 (r2S-2): the rest of the project folder (the MAUI default items embed every .css there; read from upstream, not proven by a MAUI build): refused unless under Spixi/obj or Spixi/bin
    ['Spixi itself (the project folder)', pjoin(t.dir, 'Spixi'), 'project'],
    ['Spixi/Other/x (a folder of the project, not obj or bin)', pjoin(t.dir, 'Spixi/Other/x'), 'project'],
    ['Spixi/ResourcesX/x (shares the name prefix of Resources)', pjoin(t.dir, 'Spixi/ResourcesX/x'), 'project'],
    ['Spixi/PlatformsX/x (shares the name prefix of Platforms)', pjoin(t.dir, 'Spixi/PlatformsX/x'), 'project'],
    ['Spixi/objX/x (shares the name prefix of obj)', pjoin(t.dir, 'Spixi/objX/x'), 'project'],
    ['Spixi/binX (shares the name prefix of bin)', pjoin(t.dir, 'Spixi/binX'), 'project'],
    ['Spixi/spixi-strip/html (the legacy empty-IntermediateOutputPath spelling)', pjoin(t.dir, 'Spixi/spixi-strip/html'), 'project'],
  ];
  /* the links of round 1 (r1C-1): a link OUTSIDE the packed folders that points INTO them — the path as written is outside, the real path is inside; the lexical test cannot see it,
   * the real-path test (and, on a file system that can show it, the inode test) does. Each is used as `--out <link>` and `--out <link>/x`. Made once per tree (links need rights on Windows: [] then). */
  const inboundLinks = (t) => {
    if (!linkOk) return [];
    const out = [];
    for (const [name, target, what] of [['in-lang', pjoin(t.raw, 'lang'), 'Raw/lang'], ['in-raw', t.raw, 'Raw itself'], ['in-htmlsub', pjoin(t.html, 'sub'), 'Raw/html/sub'], ['in-fonts', pjoin(t.dir, 'Spixi/Resources/Fonts'), 'Resources/Fonts'], ['in-plat', pjoin(t.dir, 'Spixi/Platforms'), 'Platforms']]) {
      const l = pjoin(t.dir, name);
      if (!existsSync(l)) symlinkSync(target, l, 'junction');
      out.push(['a link outside that points into ' + what + ' (--out <link>)', l], ['a link outside that points into ' + what + ' (--out <link>/x)', pjoin(l, 'x')]);
    }
    return out;
  };

  /* round 6 (r5C-1): the project-folder rule THROUGH A LINK. INBOUND: a link OUTSIDE the project folder that points to Spixi/Other (a project folder that is not obj / bin / Resources / Platforms): as written outside, real path inside.
   * OUTBOUND: a link INSIDE Spixi/Other that points to a folder outside the project folder: as written inside, real path outside. Each as `--out <link>` and `--out <link>/x`; every case is REFUSED (kind 'project'). Spixi/Other gets a file (a write there shows in the snapshot). */
  const tmpLinked = (() => { try { return realpathSync(tmp) !== tmp; } catch (_) { return false; } })();
  const projectLinks = (t) => {
    if (!linkOk) return [];
    const other = pjoin(t.dir, 'Spixi/Other'), away = pjoin(t.dir, 'away-target');
    mkdirSync(other, { recursive: true }); mkdirSync(away, { recursive: true });
    if (!existsSync(pjoin(other, 'o.txt'))) writeFileSync(pjoin(other, 'o.txt'), 'a file\n');
    if (!existsSync(pjoin(away, 'a.txt'))) writeFileSync(pjoin(away, 'a.txt'), 'a file\n');
    const inb = pjoin(t.dir, 'in-other'), outb = pjoin(other, 'out-link');
    if (!existsSync(inb)) symlinkSync(other, inb, 'junction');
    if (!existsSync(outb)) symlinkSync(away, outb, 'junction');
    // LIMIT (as r4S-2): when the temp folder is itself reached through a linked parent, the path as written is not inside the REAL project folder, so the outbound class cannot be told from a plain outside folder: those two cases are SKIPPED then (printed in row 3)
    return [['a link outside the project folder that points into Spixi/Other (--out <link>)', inb, 'project'], ['a link outside the project folder that points into Spixi/Other (--out <link>/x)', pjoin(inb, 'x'), 'project'],
      ...(tmpLinked ? [] : [['a link inside Spixi/Other that points outside the project folder (--out <link>)', outb, 'project'], ['a link inside Spixi/Other that points outside the project folder (--out <link>/x)', pjoin(outb, 'x'), 'project']])];
  };

  /* row 1 / row 2: every refused folder, plain and lean */
  for (const [n, flags, what] of [[1, PLAIN, 'plain'], [2, LEAN, 'lean (--lean-css)']]) {
    const t = mkTree();
    const problems = [];
    for (const [label, p, kind] of refusedList(t)) refusedCall(t, p, flags, presolve(p), problems, what + ' --out ' + label, [], kind);
    row(n, what + ' --out into Spixi/Resources (the whole folder), Spixi/Platforms or the rest of the project folder Spixi/ outside obj and bin, or anything under them (' + refusedList(t).length + ' folders: Raw/lang/x, Raw/x, Raw itself, Raw/html/../lean2, Raw/html-sibling, Raw/html/sub(/x), Raw/lang, Resources/Raw-sibling, Resources/Fonts/x, Resources/Images, Resources itself, Platforms itself, Platforms/Android/Assets/x, Platforms/Android/Resources/y) → exit 1, REFUSED, the folder named, "nothing was written", the scratch tree unchanged', problems);
  }

  /* row 3: LINKS. (a) a link inside Raw that points outside (the real path is outside, the path as written is inside) and a folder under it; (b) round 1 (r1C-1): a link OUTSIDE that points INTO the packed
   * folders (the path as written is outside, the real path inside), `--out <link>` and `--out <link>/x`; and Raw/HTML on a case-insensitive file system */
  {
    const problems = [];
    if (tmpLinked) console.log('  note: ' + T + ' (3) — the temp folder is reached through a linked parent: case (a), a link inside Raw that points outside, and (round 6) the two OUTBOUND project-folder link cases are SKIPPED (r4S-2: recorded, not fixed; as at the base for the lean path)');
    if (linkOk) {
      for (const [what, flags] of [['plain', PLAIN], ['lean (--lean-css)', LEAN]]) {
        if (!tmpLinked) {
        const t = mkTree();
        const outside = pjoin(t.dir, 'outside');
        mkdirSync(outside);
        symlinkSync(outside, pjoin(t.raw, 'lnk'), 'junction');
        refusedCall(t, pjoin(t.raw, 'lnk'), flags, pjoin(t.raw, 'lnk'), problems, what + ' --out <a link inside Raw that points outside>');
        refusedCall(t, pjoin(t.raw, 'lnk', 'deeper'), flags, pjoin(t.raw, 'lnk', 'deeper'), problems, what + ' --out <a folder under that link>');
        if (readDir(outside).length) problems.push(what + ': a refused run wrote ' + readDir(outside).length + ' entr(y/ies) through the link');
        }
        // (b) inbound links: the tree is the same before and after (a link is a 'name -> link' entry in the snapshot); nothing new appears under any target
        const t2 = mkTree();
        for (const [label, p] of inboundLinks(t2)) refusedCall(t2, p, flags, p, problems, what + ' --out <' + label + '>');
        // (c) round 6 (r5C-1): the project-folder rule through a link, inbound (the real path is inside the project folder) and outbound (the path as written is inside it)
        for (const [label, p, kind] of projectLinks(t2)) refusedCall(t2, p, flags, p, problems, what + ' --out <' + label + '>', [], kind);
      }
    }
    // Raw/HTML names the source folder on a file system that ignores letter case (macOS, Windows): the same folder under another spelling
    const ci = mkTree();
    mkdirSync(pjoin(ci.raw, 'ci-probe'));
    const caseBlind = existsSync(pjoin(ci.raw, 'CI-PROBE'));
    if (!caseBlind) console.log('  note: ' + T + ' (3) — this file system is case-sensitive: the case Raw/HTML is SKIPPED (there Raw/HTML is another, new folder inside Raw, refused by row 1 like Raw/x)');
    else for (const [what, flags] of [['plain', PLAIN], ['lean (--lean-css)', LEAN]]) refusedCall(ci, pjoin(ci.raw, 'HTML'), flags, pjoin(ci.raw, 'HTML'), problems, what + ' --out Raw/HTML (the source folder, another spelling, no --in-place)');
    row(3, 'LINKS: a link inside Raw that points outside (and a folder under it), and — round 1, r1C-1 — a link OUTSIDE that points INTO Raw/lang, Raw, Raw/html/sub, Resources/Fonts, Platforms (as `--out <link>` and `--out <link>/x`: only the real-path test sees them), plus — round 6, r5C-1 — the project-folder rule through a link: a link OUTSIDE the project folder that points to Spixi/Other, and a link INSIDE Spixi/Other that points outside the project folder (each as `--out <link>` and `--out <link>/x`, REFUSED with the sentence of the project folder), plus Raw/HTML where the file system ignores letter case (' + (linkOk ? 'links run' : 'links SKIPPED') + ', case ' + (caseBlind ? 'run' : 'SKIPPED: case-sensitive') + '): plain and lean → exit 1, the folder named, nothing written (the tree equal before and after), nothing written through a link', problems);
  }

  /* row 4: the ONE exception, and its BOUNDARY (round 1, r1C-2). (a) Raw/html without --in-place is refused; with it, allowed (the folder is stripped). (b) --in-place opens NOTHING else: EVERY refused case of row 1 and
   * every link case of row 3, run again WITH --in-place, plain and lean → exit 1 REFUSED (not exit 2, not exit 0), the tree unchanged. So widening the exception to Raw itself or to Raw/html/sub is caught. */
  {
    const problems = [];
    let nCases = 0;
    for (const [what, flags] of [['plain', PLAIN], ['lean (--lean-css)', LEAN]]) {
      const t = mkTree();
      // without --in-place: refused, the source folder untouched
      const before = snap(t.dir);
      const r0 = run(t, ['--out', t.html, ...flags]);
      if (r0.code !== 1 || !r0.stderr.includes('is the source folder') || !r0.stderr.includes('needs --in-place') || !r0.stderr.includes('nothing was written')) problems.push(what + ' --out Raw/html without --in-place: ' + brief(r0) + ' (want exit 1 "is the source folder … needs --in-place … nothing was written")');
      if (snap(t.dir) !== before) problems.push(what + ' --out Raw/html without --in-place changed the tree (' + diffNote(before, snap(t.dir)) + ')');
      // with --in-place: allowed, exit 0, the source stylesheet is stripped
      const tok = pjoin(t.html, 'spixi.tokens.css');
      const sha0 = sha(tok), size0 = statSync(tok).size;
      const r1 = run(t, ['--out', t.html, '--in-place', ...flags]);
      if (r1.code !== 0 || /REFUSED/.test(r1.out)) problems.push(what + ' --out Raw/html --in-place: ' + brief(r1) + ' (want exit 0)');
      else if (sha(tok) === sha0 || statSync(tok).size >= size0) problems.push(what + ' --out Raw/html --in-place: exit 0 but spixi.tokens.css was not stripped (' + size0 + ' → ' + statSync(tok).size + ' bytes)');
      // (b) the boundary: every refused case and every inbound link with --in-place
      const t2 = mkTree();
      for (const [label, p, kind] of [...refusedList(t2), ...inboundLinks(t2), ...projectLinks(t2)]) { nCases++; refusedCall(t2, p, flags, p, problems, what + ' --out ' + label + ' --in-place', ['--in-place'], kind || null); }
    }
    row(4, 'the ONE exception and its BOUNDARY: --out Raw/html is refused without --in-place ("is the source folder … needs --in-place", nothing written) and allowed with it (exit 0, spixi.tokens.css stripped), plain and lean; and EVERY refused case of row 1 and every inbound link of row 3 and the four project-folder link cases of round 6 (inbound and outbound, `<link>` and `<link>/x`) run WITH --in-place (' + nCases + ' calls) → exit 1 REFUSED each, the tree unchanged — widening the exception to Raw itself or to Raw/html/sub fails here', problems);
  }

  /* row 5: a folder outside Resources and Platforms is allowed (plain and lean), also the neighbours that only share a name prefix */
  {
    const problems = [];
    for (const [what, flags] of [['plain', PLAIN], ['lean (--lean-css)', LEAN]]) {
      const t = mkTree();
      for (const [label, p] of [['a folder beside the tree', pjoin(t.dir, 'out-' + what.slice(0, 2))], ['Spixi-sibling (beside the project folder, shares its name prefix)', pjoin(t.dir, 'Spixi-sibling/x')], ['Spixi/obj itself', pjoin(t.dir, 'Spixi/obj')], ['Spixi/bin/x', pjoin(t.dir, 'Spixi/bin/x')], ['Spixi/obj/Resources-sibling (shares the name prefix of Resources, under obj)', pjoin(t.dir, 'Spixi/obj/Resources-sibling')], ['Spixi/obj/ResourcesX/x', pjoin(t.dir, 'Spixi/obj/ResourcesX/x')], ['Spixi/bin/PlatformsX/x', pjoin(t.dir, 'Spixi/bin/PlatformsX/x')], ['Spixi/obj/spixi-strip/html (what the build passes)', pjoin(t.dir, 'Spixi/obj/spixi-strip/html')]]) {
        const r = run(t, ['--out', p, ...flags]);
        if (r.code !== 0 || /REFUSED/.test(r.out) || !existsSync(pjoin(p, 'spixi.tokens.css'))) problems.push(what + ' --out ' + label + ': ' + brief(r) + ' (want exit 0 and spixi.tokens.css written there)');
      }
      // and the source folder is the same as before (the allowed runs wrote only into the out folders)
      const tok = pjoin(t.html, 'spixi.tokens.css');
      if (sha(tok) !== sha(pjoin(SRC_HTML, 'spixi.tokens.css'))) problems.push(what + ': the source spixi.tokens.css changed by a run with another out folder');
    }
    row(5, 'allowed: --out outside the project folder Spixi/ (a folder beside the tree, Spixi-sibling/x) or under Spixi/obj or Spixi/bin (obj itself, bin/x, obj/Resources-sibling, obj/ResourcesX/x, bin/PlatformsX/x, obj/spixi-strip/html), plain and lean → exit 0, the file written there, the source folder untouched', problems);
  }

  /* row 6: --in-place is for the source folder only (r1S-6: any other out folder is a usage error, exit 2) and never alone */
  {
    const problems = [];
    const t = mkTree();
    const INPL = /--in-place is valid only together with --out <dir>/;
    const INPL2 = /--in-place is valid only when --out is the source folder Spixi\/Resources\/Raw\/html/;
    for (const [what, flags] of [['plain', PLAIN], ['lean (--lean-css)', LEAN]]) {
      const out1 = pjoin(t.dir, 'inplace-out-' + what.slice(0, 2));
      const before = snap(t.dir);
      const a = run(t, ['--out', out1, '--in-place', ...flags]);
      if (a.code !== 2 || !INPL2.test(a.stderr) || !a.stderr.includes('nothing was written') || existsSync(out1) || snap(t.dir) !== before) problems.push(what + ' --out <outside> --in-place: ' + brief(a) + ' (want exit 2 "--in-place is valid only when --out is the source folder …", nothing created)');
    }
    for (const [label, args] of [['--in-place alone', ['--in-place']], ['--in-place --lean-css', ['--in-place', '--lean-css']], ['--check <dir> --in-place', ['--check', t.html, '--in-place']], ['--stats --in-place', ['--stats', '--in-place']], ['--stdout f --in-place', ['--stdout', 'spixi.tokens.css', '--in-place']]]) {
      const r = run(t, args);
      if (r.code !== 2 || !INPL.test(r.stderr)) problems.push(label + ': ' + brief(r) + ' (want exit 2, "--in-place is valid only together with --out <dir>")');
    }
    row(6, '--in-place: with an out folder that is NOT the source folder → exit 2 (usage), plain and lean, nothing created; with no --out → exit 2 (alone, with a lean flag, with --check, --stats, --stdout)', problems);
  }

  /* row 7 (source): ONE function, used by both --out paths */
  {
    const problems = [];
    const src = readRaw(pjoin(root, SR), 'utf8');
    const defs = [...src.matchAll(/^(?:export\s+)?function\s+outFolderRefusal\s*\(/gm)];
    if (defs.length !== 1) problems.push('outFolderRefusal is defined ' + defs.length + ' times, want once');
    const calls = [...src.matchAll(/(?<!function\s+)\boutFolderRefusal\s*\(\s*outDir\s*,/g)];
    if (calls.length !== 2) problems.push('outFolderRefusal(outDir, …) is called ' + calls.length + ' times, want 2 (the plain --out path and the lean --out path)');
    const plainAt = src.indexOf("console.error('strip-release: --out needs a directory')"), mk = src.indexOf('mkdirSync(outAbs, { recursive: true });');
    const plainCall = calls.map((m) => m.index).find((i) => i > plainAt && i < mk);
    if (plainAt < 0 || mk < 0 || plainCall === undefined) problems.push('the plain path does not call outFolderRefusal between its "--out needs a directory" check and its mkdirSync');
    const leanAt = src.indexOf('function leanCli('), leanOut = src.indexOf('const outDir = val(\'--out\');', leanAt), leanPlan = src.indexOf('const plan = [];', leanAt);
    const leanCall = calls.map((m) => m.index).find((i) => i > leanOut && i < leanPlan);
    if (leanAt < 0 || leanOut < 0 || leanPlan < 0 || leanCall === undefined) problems.push('the lean path does not call outFolderRefusal between its --out value and its plan (before anything is transformed or written)');
    if (calls.some((m) => !/inPlace:\s*args\.includes\('--in-place'\)/.test(src.slice(m.index, m.index + 120)))) problems.push('a call does not pass inPlace: args.includes(\'--in-place\')');
    // round 1: both calls exit with the code the function returns (1 refused, 2 usage), not a hard-coded 1
    if (!/console\.error\(why\.text\);\s*process\.exit\(why\.code\)/.test(src) || !/die\(why\.code,\s*why\.text\)/.test(src)) problems.push('a call site does not exit with why.code (the plain path: console.error(why.text); process.exit(why.code); the lean path: die(why.code, why.text))');
    // round 1 (r1S-2): ONE pre-flight too, called by both writes (the plain one before its mkdirSync, the lean one before its first temp file)
    const pdefs = [...src.matchAll(/^(?:export\s+)?function\s+outPreflight\s*\(/gm)], pcalls = [...src.matchAll(/(?<!function\s+)\boutPreflight\s*\(/g)];
    if (pdefs.length !== 1 || pcalls.length !== 2) problems.push('outPreflight is defined ' + pdefs.length + ' times and called ' + pcalls.length + ' times, want 1 and 2 (the plain write and the lean write)');
    else {
      const plainPre = pcalls[0].index, leanPre = pcalls[1].index, mk2 = src.indexOf('mkdirSync(outAbs, { recursive: true });');
      if (!(plainAt > 0 && plainCall < plainPre && plainPre < mk2)) problems.push('the plain pre-flight is not between the outFolderRefusal call and the mkdirSync of the plain write');
      if (!(leanPre > leanCall && leanPre < src.indexOf("const tag = '.strip-tmp-'"))) problems.push('the lean pre-flight is not after its outFolderRefusal call and before its first temp file');
    }
    row(7, 'ONE function outFolderRefusal(outDir, { inPlace }) used by BOTH --out paths: defined once; the plain path calls it between the "--out needs a directory" check and its mkdirSync; the lean path between its --out value and its plan; both pass --in-place and exit with why.code; ONE outPreflight, called by both writes (source text, see the limits)', problems);
  }

  /* row 11 (r1S-2): the PRE-FLIGHT of the plain write too. A target that is a LINK (a write would go through it — into a new asset in Resources/Raw, or over the committed stylesheet), a directory, an out folder that is
   * a file, a file on the way: exit 1 "REFUSED — the out folder cannot take this package", no throw, nothing written (tree equal), the committed stylesheet byte-equal. Plain AND lean. */
  {
    const problems = [];
    const preCall = (t, outArg, flags, want, problems2, label) => {
      const before = snap(t.dir);
      const r = run(t, ['--out', outArg, ...flags]);
      if (r.code !== 1 || !r.stderr.includes('REFUSED — the out folder cannot take this package') || !want.test(r.stderr) || !r.stderr.includes('nothing was written')) problems2.push(label + ': ' + brief(r) + ' (want exit 1, "REFUSED — the out folder cannot take this package", ' + want + ', "nothing was written")');
      if (/^\s+at .*:\d+:\d+\)?$/m.test(r.stderr) || /node:internal|\bError: [A-Z]+:/.test(r.stderr)) problems2.push(label + ': an uncaught throw, not a refusal: ' + JSON.stringify(r.stderr.trim().slice(0, 120)));
      if (snap(t.dir) !== before) problems2.push(label + ': the tree changed (' + diffNote(before, snap(t.dir)) + ')');
    };
    for (const [what, flags] of [['plain', PLAIN], ['lean (--lean-css)', LEAN]]) {
      const t = mkTree();
      const committed = pjoin(t.html, 'spixi.tokens.css'), sha0 = sha(committed), fresh = pjoin(t.raw, 'lang', 'new-asset.css');
      if (linkOk) {
        const o1 = pjoin(t.dir, 'o-link-new'), o2 = pjoin(t.dir, 'o-link-committed');
        mkdirSync(o1); mkdirSync(o2);
        symlinkSync(fresh, pjoin(o1, 'spixi.tokens.css'), 'junction');       // a link to a NEW file in Resources/Raw: a write would create an asset
        symlinkSync(committed, pjoin(o2, 'spixi.tokens.css'), 'junction');   // a link to the committed stylesheet: a write would replace it
        preCall(t, o1, flags, /spixi\.tokens\.css: the target is a link/, problems, what + ' <out>/spixi.tokens.css is a link to a NEW file in Resources/Raw');
        if (existsSync(fresh)) problems.push(what + ': the refused run created ' + fresh + ' through the link (a new asset)');
        preCall(t, o2, flags, /spixi\.tokens\.css: the target is a link/, problems, what + ' <out>/spixi.tokens.css is a link to the committed stylesheet');
        if (sha(committed) !== sha0) problems.push(what + ': the committed spixi.tokens.css was REPLACED through the link');
      }
      const o3 = pjoin(t.dir, 'o-dir-target'); mkdirSync(pjoin(o3, 'spixi.tokens.css'), { recursive: true });
      preCall(t, o3, flags, /spixi\.tokens\.css: the target is a directory/, problems, what + ' <out>/spixi.tokens.css is a directory');
      const o4 = pjoin(t.dir, 'o-file'); writeFileSync(o4, 'not a folder\n');
      preCall(t, o4, flags, /the out folder is not a directory/, problems, what + ' --out <a regular file>');
      preCall(t, pjoin(o4, 'x'), flags, /is not a directory \(on the way to the out folder\)/, problems, what + ' --out <a regular file>/x (a file on the way)');
    }
    row(11, 'the PRE-FLIGHT of the plain --out too (and the lean one, same function): <out>/spixi.tokens.css a link to a NEW file in Resources/Raw (no asset created) or to the committed stylesheet (not replaced), a directory in its place, an out folder that is a file, a file on the way → exit 1 "REFUSED — the out folder cannot take this package", no uncaught throw, nothing written, plain and lean (' + (linkOk ? 'links run' : 'links SKIPPED') + ')', problems);
  }

  /* row 12 (r1S-8): a DANGLING link as the out folder or as a parent is a refusal text, not an uncaught throw (and a dangling link whose target would be inside Resources/Raw is refused too: mkdir through it would create it) */
  {
    const problems = [];
    if (linkOk) for (const [what, flags] of [['plain', PLAIN], ['lean (--lean-css)', LEAN]]) {
      const t = mkTree();
      const gone = pjoin(t.dir, 'gone-target'), toRaw = pjoin(t.raw, 'newdir');
      symlinkSync(gone, pjoin(t.dir, 'dang-out'), 'junction');
      symlinkSync(toRaw, pjoin(t.dir, 'dang-raw'), 'junction');
      for (const [label, p] of [['--out <a dangling link>', pjoin(t.dir, 'dang-out')], ['--out <a dangling link>/x (a parent)', pjoin(t.dir, 'dang-out', 'x')], ['--out <a dangling link to a folder of Resources/Raw that does not exist yet>', pjoin(t.dir, 'dang-raw')], ['--out <that link>/x', pjoin(t.dir, 'dang-raw', 'x')]]) {
        const before = snap(t.dir);
        const r = run(t, ['--out', p, ...flags]);
        if (r.code !== 1 || !/strip-release: REFUSED — the out folder .* has a link on its way \(.*\) that points to nothing/.test(r.stderr) || !r.stderr.includes('nothing was written')) problems.push(what + ' ' + label + ': ' + brief(r) + ' (want exit 1, "REFUSED — … has a link on its way (…) that points to nothing … nothing was written")');
        if (/node:internal|\bError: [A-Z]+:|^\s+at .*:\d+:\d+\)?$/m.test(r.stderr)) problems.push(what + ' ' + label + ': an uncaught throw: ' + JSON.stringify(r.stderr.trim().slice(0, 120)));
        if (snap(t.dir) !== before || existsSync(gone) || existsSync(toRaw)) problems.push(what + ' ' + label + ': something was created (' + diffNote(before, snap(t.dir)) + ')');
      }
    }
    row(12, 'a DANGLING link as the out folder or as a parent (also one whose target would be a new folder of Resources/Raw) → exit 1 "REFUSED — … has a link on its way … that points to nothing", no uncaught throw, nothing created, plain and lean (' + (linkOk ? 'links run' : 'links SKIPPED') + ')', problems);
  }

  /* ---------- the csproj rows (source text read as XML elements; comments stripped first) ---------- */
  const csRaw = readRaw(pjoin(root, 'Spixi/Spixi.csproj'), 'utf8').replace(/^﻿/, '');
  const cs = csRaw.replace(/<!--[\s\S]*?-->/g, '');
  const ATTR = /([\w.]+)="([^"]*)"/g;
  const targetBody = (name) => { const m = new RegExp('<Target\\b[^>]*\\bName="' + name + '"[^>]*>([\\s\\S]*?)<\\/Target>').exec(cs); return m ? m[1] : null; };
  /* the child elements of a target body in order: { tag, attrs, at } for self-closing and open tags of the first level and the Errors */
  const elements = (body) => {
    const out = [];
    let depth = 0;
    for (const m of body.matchAll(/<(\/?)([A-Za-z_][\w.]*)((?:\s+[\w.]+="[^"]*")*)\s*(\/?)>/g)) {
      if (m[1]) { depth--; continue; }
      if (depth === 0) out.push({ tag: m[2], attrs: Object.fromEntries([...m[3].matchAll(ATTR)].map((x) => [x[1], x[2]])), at: m.index });
      if (!m[4]) depth++;
    }
    return out;
  };
  const errors = (els) => els.filter((e) => e.tag === 'Error');
  const guard = targetBody('SpixiLeanGuard'), lean = targetBody('SpixiLeanReleaseHtml');
  const gEls = guard ? elements(guard) : [], lEls = lean ? elements(lean) : [];
  /* the exact Conditions and the park text (hard-coded; the text is checked for its content, not byte for byte) */
  const R1_COND = "'$(SpixiLeanJs)' != 'false'";
  const R2_COND = '$([MSBuild]::NormalizeDirectory(`$(MSBuildProjectDirectory)`, `$(IntermediateOutputPath)`).StartsWith(`$([MSBuild]::NormalizeDirectory(`$(MSBuildProjectDirectory)`, `Resources`, `Raw`))`, System.StringComparison.OrdinalIgnoreCase))';
  const IOP_COND = "'$(IntermediateOutputPath.Trim())' == '' or '$([MSBuild]::NormalizeDirectory(`$(MSBuildProjectDirectory)`, `$(IntermediateOutputPath)`))' == '$([MSBuild]::NormalizeDirectory(`$(MSBuildProjectDirectory)`))'";

  /* row 8: R1 — the FIRST element of SpixiLeanReleaseHtml is the park Error, before the IntermediateOutputPath belt and RemoveDir */
  {
    const problems = [];
    if (!lean) problems.push('SpixiLeanReleaseHtml not found');
    else {
      const first = lEls[0];
      if (!first || first.tag !== 'Error' || first.attrs.Condition !== R1_COND) problems.push('the FIRST element of SpixiLeanReleaseHtml is ' + (first ? '<' + first.tag + ' Condition=' + JSON.stringify(first.attrs.Condition) + '>' : '(none)') + ', want <Error Condition="' + R1_COND + '">');
      const t = first && first.attrs.Text || '';
      for (const need of ["SpixiLeanJs='$(SpixiLeanJs)'", 'PARKED', 'DECISIONS 1583', 'P-07', 'reached the lean target']) if (!t.includes(need)) problems.push('the R1 text lacks ' + JSON.stringify(need));
      const iopBelt = errors(lEls).find((e) => e.attrs.Condition === IOP_COND), removeDir = lEls.find((e) => e.tag === 'RemoveDir'), exec = lEls.find((e) => e.tag === 'Exec');
      if (!iopBelt || !removeDir || !exec) problems.push('the IntermediateOutputPath belt, the RemoveDir or the Exec of SpixiLeanReleaseHtml is missing');
      else if (!(first && first.at < iopBelt.at && first.at < removeDir.at && first.at < exec.at)) problems.push('R1 does not come before the IntermediateOutputPath belt, the RemoveDir and the Exec');
      if (errors(lEls).filter((e) => e.attrs.Condition === R1_COND).length !== 1) problems.push('R1 is not there exactly once');
    }
    if (!guard || errors(gEls).filter((e) => e.attrs.Condition === R1_COND).length !== 1) problems.push('the guard\'s own park Error (' + R1_COND + ') is not there exactly once: R1 is its twin, it never replaces it');
    row(8, 'R1 (the park twice): the FIRST element of SpixiLeanReleaseHtml is <Error Condition="\'$(SpixiLeanJs)\' != \'false\'"> with the park text (P-07, DECISIONS 1583), before the IntermediateOutputPath belt, the RemoveDir and the Exec; the guard keeps its own', problems);
  }

  /* row 9: R2 in the guard — after the existing IntermediateOutputPath Error, before the stamp PropertyGroup */
  {
    const problems = [];
    const es = errors(gEls);
    const iopAt = es.findIndex((e) => e.attrs.Condition === IOP_COND);
    const r2 = es.filter((e) => e.attrs.Condition === R2_COND);
    if (iopAt < 0) problems.push('the guard\'s IntermediateOutputPath Error is missing');
    if (r2.length !== 1) problems.push('the guard holds the R2 Error ' + r2.length + ' times, want once');
    else {
      if (iopAt >= 0 && es[iopAt + 1] !== r2[0]) problems.push('the R2 Error does not directly follow the existing IntermediateOutputPath Error');
      const pg = gEls.find((e) => e.tag === 'PropertyGroup');
      if (!pg || !(r2[0].at < pg.at)) problems.push('the R2 Error is not before the stamp PropertyGroup');
      const t = r2[0].attrs.Text || '';
      for (const need of ["IntermediateOutputPath='$(IntermediateOutputPath)'", 'Resources\\Raw', 'refusing a lean build']) if (!t.includes(need)) problems.push('the R2 text of the guard lacks ' + JSON.stringify(need));
    }
    row(9, 'R2 in SpixiLeanGuard: one Error with the StartsWith / OrdinalIgnoreCase Condition on the normalized IntermediateOutputPath against the normalized Resources\\Raw, directly after the existing IntermediateOutputPath Error and before the stamp PropertyGroup', problems);
  }

  /* row 10: R2 belt in SpixiLeanReleaseHtml — the same Condition, before RemoveDir */
  {
    const problems = [];
    const r2 = errors(lEls).filter((e) => e.attrs.Condition === R2_COND);
    const removeDir = lEls.find((e) => e.tag === 'RemoveDir'), iopBelt = errors(lEls).find((e) => e.attrs.Condition === IOP_COND);
    if (r2.length !== 1) problems.push('SpixiLeanReleaseHtml holds the R2 belt ' + r2.length + ' times, want once');
    else {
      if (!removeDir || !(r2[0].at < removeDir.at)) problems.push('the R2 belt is not before the RemoveDir');
      if (!iopBelt || !(iopBelt.at < r2[0].at)) problems.push('the R2 belt does not come after the existing IntermediateOutputPath belt');
      const t = r2[0].attrs.Text || '';
      for (const need of ["IntermediateOutputPath='$(IntermediateOutputPath)'", 'Resources\\Raw', 'at target time']) if (!t.includes(need)) problems.push('the R2 belt text lacks ' + JSON.stringify(need));
    }
    row(10, 'R2 belt in SpixiLeanReleaseHtml: the same Condition (the one constant above) as the guard, after the existing IntermediateOutputPath belt and before the RemoveDir', problems);
  }

  /* row 13 (r1S-4): the packed-folder Error — the guard holds ONE Error whose Condition is the two StartsWith tests (Resources, Platforms) joined by `or`, directly after the Raw Error; the lean target holds the same Condition as a belt
   * after its Raw belt and before RemoveDir */
  {
    const problems = [];
    const sw = (dir) => '$([MSBuild]::NormalizeDirectory(`$(MSBuildProjectDirectory)`, `$(IntermediateOutputPath)`).StartsWith(`$([MSBuild]::NormalizeDirectory(`$(MSBuildProjectDirectory)`' + (dir ? ', `' + dir + '`' : '') + '))`, System.StringComparison.OrdinalIgnoreCase))';
    const PACKED_COND = sw('Resources') + ' or ' + sw('Platforms') + ' or (' + sw('') + ' and !' + sw('obj') + ' and !' + sw('bin') + ')';
    const gs = errors(gEls), ls = errors(lEls);
    const g = gs.filter((e) => e.attrs.Condition === PACKED_COND), l = ls.filter((e) => e.attrs.Condition === PACKED_COND);
    const gRaw = gs.find((e) => e.attrs.Condition === R2_COND), lRaw = ls.find((e) => e.attrs.Condition === R2_COND);
    const removeDir = lEls.find((e) => e.tag === 'RemoveDir');
    if (g.length !== 1) problems.push('the guard holds the packed-folder Error ' + g.length + ' times, want once');
    else {
      if (!gRaw || gs[gs.indexOf(gRaw) + 1] !== g[0]) problems.push('the guard\'s packed-folder Error does not directly follow the Raw Error');
      const pg = gEls.find((e) => e.tag === 'PropertyGroup');
      if (!pg || !(g[0].at < pg.at)) problems.push('the guard\'s packed-folder Error is not before the stamp PropertyGroup');
      const t = g[0].attrs.Text || '';
      for (const need of ["IntermediateOutputPath='$(IntermediateOutputPath)'", 'packed folder Resources or Platforms', 'refusing a lean build']) if (!t.includes(need)) problems.push('the guard\'s packed-folder text lacks ' + JSON.stringify(need));
    }
    if (l.length !== 1) problems.push('SpixiLeanReleaseHtml holds the packed-folder belt ' + l.length + ' times, want once');
    else {
      if (!lRaw || ls[ls.indexOf(lRaw) + 1] !== l[0]) problems.push('the packed-folder belt does not directly follow the Raw belt');
      if (!removeDir || !(l[0].at < removeDir.at)) problems.push('the packed-folder belt is not before the RemoveDir');
      const t = l[0].attrs.Text || '';
      for (const need of ["IntermediateOutputPath='$(IntermediateOutputPath)'", 'packed folder Resources or Platforms', 'at target time']) if (!t.includes(need)) problems.push('the packed-folder belt text lacks ' + JSON.stringify(need));
    }
    row(13, 'packed folders (r1S-4): ONE Error in SpixiLeanGuard (Resources or Platforms, StartsWith / OrdinalIgnoreCase joined by `or`) directly after the Raw Error and before the stamp PropertyGroup; the same Condition as a belt in SpixiLeanReleaseHtml directly after the Raw belt and before RemoveDir; both texts name the packed folders', problems);
  }

  /* row 14 (r1S-1): the LINK Errors of the lean target — two Errors, before RemoveDir and after the folder belts: Exists(path) and GetAttributes(path).ToString().Contains(ReparsePoint) for spixi-lean and for spixi-lean\html */
  {
    const problems = [];
    const np = (...parts) => '$([MSBuild]::NormalizePath(' + ['$(MSBuildProjectDirectory)', '$(IntermediateOutputPath)', ...parts].map((x) => '`' + x + '`').join(', ') + '))';
    const LINK = (...parts) => "Exists('" + np(...parts) + "') and $([System.IO.File]::GetAttributes(`" + np(...parts) + '`).ToString().Contains(`ReparsePoint`))';
    const ls = errors(lEls), removeDir = lEls.find((e) => e.tag === 'RemoveDir');
    const packedBelt = ls.filter((e) => /packed folder Resources or Platforms.*at target time/.test(e.attrs.Text || ''))[0];
    for (const [name, cond, need] of [['spixi-lean', LINK('spixi-lean'), 'the folder spixi-lean under'], ['spixi-lean\\html', LINK('spixi-lean', 'html'), 'the folder spixi-lean\\html under']]) {
      const m = ls.filter((e) => e.attrs.Condition === cond);
      if (m.length !== 1) { problems.push('the link Error for ' + name + ' is there ' + m.length + ' times, want once (Condition ' + cond.slice(0, 60) + '…)'); continue; }
      if (!removeDir || !(m[0].at < removeDir.at)) problems.push('the link Error for ' + name + ' is not before the RemoveDir');
      if (!packedBelt || !(packedBelt.at < m[0].at)) problems.push('the link Error for ' + name + ' does not come after the folder belts');
      const t = m[0].attrs.Text || '';
      for (const w of [need, 'is a link', 'RemoveDir would follow it']) if (!t.includes(w)) problems.push('the link text for ' + name + ' lacks ' + JSON.stringify(w));
    }
    // and the tokens-only target is not touched: no ReparsePoint test in it
    const strip = targetBody('SpixiStripReleaseHtml') || '';
    if (/ReparsePoint/.test(strip)) problems.push('SpixiStripReleaseHtml holds a ReparsePoint test: that target must not be edited');
    row(14, 'link Errors (r1S-1): SpixiLeanReleaseHtml refuses a link at spixi-lean and at spixi-lean\\html (Exists + GetAttributes(...).ToString().Contains(`ReparsePoint`), the path without a trailing separator) after the folder belts and BEFORE the RemoveDir; SpixiStripReleaseHtml has none (not edited)', problems);
  }

  /* row 15 (r2S-1): a HARD link at <out>/spixi.tokens.css (to the committed stylesheet, a second name for the same inode: lstat shows a regular file, the pre-flight cannot see it): the write must REPLACE the name
   * (temp file 'wx' + read back + rename), never write through it. Plain AND lean: exit 0, the committed stylesheet byte-equal, <out>/spixi.tokens.css a NEW file (another inode) with the stripped bytes. */
  {
    const problems = [];
    const { linkSync } = fsLink;
    let hardOk = true;
    for (const [what, flags] of [['plain', PLAIN], ['lean (--lean-css)', LEAN]]) {
      const t = mkTree();
      const committed = pjoin(t.html, 'spixi.tokens.css'), sha0 = sha(committed), ino0 = lstatSync(committed).ino;
      const o = pjoin(t.dir, 'o-hard-' + what.slice(0, 2)); mkdirSync(o);
      try { linkSync(committed, pjoin(o, 'spixi.tokens.css')); } catch (e) { hardOk = false; console.log('  note: ' + T + ' (15) — no hard link could be made here (' + (e && e.code) + '): SKIPPED'); break; }
      const r = run(t, ['--out', o, ...flags]);
      if (r.code !== 0) problems.push(what + ': ' + brief(r) + ' (want exit 0)');
      if (sha(committed) !== sha0) problems.push(what + ': the COMMITTED spixi.tokens.css was rewritten through the hard link');
      const w = pjoin(o, 'spixi.tokens.css');
      if (!existsSync(w)) problems.push(what + ': <out>/spixi.tokens.css is missing');
      else {
        if (lstatSync(w).ino === ino0 && ino0) problems.push(what + ': <out>/spixi.tokens.css is still the SAME inode as the committed file (written through the link)');
        if (sha(w) === sha0) problems.push(what + ': <out>/spixi.tokens.css holds the committed bytes (not stripped)');
      }
      if (readDir(o).some((n) => n.includes('.strip-tmp-'))) problems.push(what + ': a temp file is left in the out folder');
    }
    row(15, 'a HARD link at <out>/spixi.tokens.css to the committed stylesheet (r2S-1): plain and lean replace the name by a temp file renamed over it → exit 0, the committed file byte-equal, the out file another inode with the stripped bytes, no temp left (' + (hardOk ? 'hard links run' : 'hard links SKIPPED') + ')', problems);
  }

  /* row 16 (r2S-7, SOURCE ROW on the csproj): a link at spixi-lean.stamp is refused by SpixiLeanGuard BEFORE the stamp is read (ReadLinesFromFile) or written (WriteLinesToFile); same Condition shape as the row 14 link Errors */
  {
    const problems = [];
    const np = (...parts) => '$([MSBuild]::NormalizePath(' + ['$(MSBuildProjectDirectory)', '$(IntermediateOutputPath)', ...parts].map((x) => '`' + x + '`').join(', ') + '))';
    const cond = "Exists('" + np('spixi-lean.stamp') + "') and $([System.IO.File]::GetAttributes(`" + np('spixi-lean.stamp') + '`).ToString().Contains(`ReparsePoint`))';
    const gBody = targetBody('SpixiLeanGuard') || '';
    const ge = elements(gBody), m = ge.filter((e) => e.tag === 'Error' && e.attrs.Condition === cond);
    const read = ge.find((e) => e.tag === 'ReadLinesFromFile'), write = (targetBody('SpixiLeanReleaseHtml') || '').indexOf('WriteLinesToFile');
    if (m.length !== 1) problems.push('SpixiLeanGuard holds the stamp-link Error ' + m.length + ' times, want once');
    else {
      if (read && !(m[0].at < read.at)) problems.push('the stamp-link Error is not before the ReadLinesFromFile of the stamp');
      for (const w of ['the stamp file spixi-lean.stamp', 'is a link']) if (!(m[0].attrs.Text || '').includes(w)) problems.push('the stamp-link text lacks ' + JSON.stringify(w));
    }
    if (!read) problems.push('no ReadLinesFromFile in SpixiLeanGuard: the stamp-read anchor of this row is gone');
    if (write < 0) problems.push('no WriteLinesToFile in SpixiLeanReleaseHtml: the stamp-write anchor of this row is gone');
    row(16, 'the stamp-link Error (r2S-7): SpixiLeanGuard refuses a link at spixi-lean.stamp (Exists + GetAttributes(...).ToString().Contains(`ReparsePoint`)) before it reads the stamp (the write is in the lean target, after the guard)', problems);
  }

  /* row 17 (r2C-3): the harness scenarios and its FAILED block, frozen by SOURCE (the harness needs dotnet and is not run here; this row only holds that the scenarios named in the limits and the CI annotation block still exist) */
  {
    const problems = [];
    const hs = readRaw(pjoin(root, 'scripts/pins-perflean/msbuild-harness/run.mjs'), 'utf8');
    for (const id of ['r1late', 'linklean', 'linkhtml', 'iopbylink', 'rawiop', 'rawiopcase', 'rawiopdetour', 'rawiopself', 'rawiopbelt', 'rawiopoff', 'packedfonts', 'packedresself', 'packedresdetour', 'packedrawneighbour', 'packedplat', 'packedplatcase', 'packedprojx', 'packedprojother', 'packedbeltres', 'packedbeltplat', 'rawnearmiss', 'platnearmiss', 'stamplink', 'hardlinkoff', 'offemptyiopreal']) {
      const n = hs.split("'" + id + "'").length - 1;   // the id as a quoted string: id: 'x', iopUnder('x', beltScenario('x', or a list entry
      if (n < 1) problems.push('the harness has no scenario ' + id);
    }
    // the FAILED: block: after the summary, an empty line, `FAILED:`, one line per MISS row (and a die prints it too): the CI annotation step publishes the lines after it
    // r3C-4: the prints are matched OUTSIDE comments (block comments, whole-line // comments and trailing // comments after a space are cut first): a commented-out print does not count
    const code = codeOf(hs);
    if (!code.includes("argv.includes('--linked')")) problems.push('the harness has no --linked mode (the linked-checkout run, r4S-9)');
    if (!/if \(miss\) \{ console\.log\('\\nFAILED:'\); for \(const r of rows\) if \(r\[1\] === 'MISS'\) console\.log\(/.test(code)) problems.push('the harness does not print the FAILED: block (an empty line, FAILED:, a line per MISS row) after its summary');
    if (!/console\.error\('\\nFAILED:\\nmsbuild-harness: ' \+ m\)/.test(code)) problems.push('the harness die() does not print its reason after a FAILED: line');
    // r3C-4: the scenarios that run in ONE mode only, frozen by id (the harness itself dies when they differ from its FAKE_ONLY / REAL_ONLY lists; this row holds the lists and the die)
    const FREEZE_FAKE = ['dup', 'emptyafterboth', 'failkeepsstamp', 'failnostamp', 'offemptyiop', 'oldscript', 'orphan', 'packedbeltplat', 'packedbeltres', 'rawiopbelt', 'scriptempty', 'scriptfail', 'subdir'];
    const FREEZE_REAL = ['hardlinkoff', 'iopbylink', 'offemptyiopreal', 'rawiopoff'];
    const listOf = (n) => { const m = new RegExp('const ' + n + " = \\[([^\\]]*)\\]").exec(code); return m ? [...m[1].matchAll(/'([\w]+)'/g)].map((x) => x[1]).sort().join(',') : null; };
    if (listOf('FAKE_ONLY') !== [...FREEZE_FAKE].sort().join(',')) problems.push('the harness FAKE_ONLY list (' + listOf('FAKE_ONLY') + ') is not the frozen fake-only set');
    if (listOf('REAL_ONLY') !== [...FREEZE_REAL].sort().join(',')) problems.push('the harness REAL_ONLY list (' + listOf('REAL_ONLY') + ') is not the frozen real-only set');
    if (!/SCENARIOS\.filter\(\(s\) => s\.fake && s\.real\)/.test(code) || !/marked both fake and real/.test(code)) problems.push('the harness does not refuse a scenario marked both fake and real');
    if (!/SCENARIOS\.filter\(\(s\) => s\.fake\)\.map/.test(code) || !/SCENARIOS\.filter\(\(s\) => s\.real\)\.map/.test(code) || !/one-mode scenario sets changed/.test(code)) problems.push('the harness does not compare the computed one-mode sets with FAKE_ONLY / REAL_ONLY');
    row(17, 'the harness scenarios of the packaging refusals (r1late, link*, rawiop*, packed*, near-miss, stamplink, hardlinkoff, offemptyiopreal) and its FAILED: block still exist (SOURCE; the harness itself is not run here, see the limits)', problems);
  }

  /* row 18 (r2C-4): outPreflight on a SYNTHETIC list, run for real (its source text is cut out of the script and compiled; the script runs its CLI on import, so it cannot be imported): a name in a sub folder that is a link into
   * Raw (a write would go through it), a sub that is a file, a target that is a directory, a clean list. */
  {
    const problems = [];
    const src = readRaw(pjoin(root, SR), 'utf8');
    const at = src.indexOf('export function outPreflight('), end = src.indexOf('\n}\n', at);
    if (at < 0 || end < 0) problems.push('outPreflight is not found in the script (the cut-out of this row)');
    else {
      const code = src.slice(at, end + 3).replace(/^export\s+/, '');
      const fn = new Function('lstatSync', 'statSync', 'existsSync', 'dirname', 'join', code + '\nreturn outPreflight;')(lstatSync, statSync, existsSync, pdirname, pjoin);
      const t = mkTree(), o = pjoin(t.dir, 'pf-out'); mkdirSync(o);
      const clean = fn(o, ['sub/x.css', 'spixi.tokens.css']);
      if (clean.length) problems.push('a clean out folder gave problems: ' + clean[0]);
      writeFileSync(pjoin(o, 'asfile'), 'x\n');
      const f1 = fn(o, ['asfile/x.css']);
      if (!f1.some((p) => /asfile\/x\.css.*is not a real directory/.test(p))) problems.push('a sub that is a FILE was not reported: ' + JSON.stringify(f1));
      mkdirSync(pjoin(o, 'adir', 'spixi.tokens.css'), { recursive: true });
      const f2 = fn(o, ['adir/spixi.tokens.css']);
      if (!f2.some((p) => /the target is a directory/.test(p))) problems.push('a target that is a DIRECTORY was not reported: ' + JSON.stringify(f2));
      if (linkOk) {
        symlinkSync(t.raw, pjoin(o, 'sub'), 'junction');
        const f3 = fn(o, ['sub/x.css']);
        if (!f3.some((p) => /sub\/x\.css.*is not a real directory/.test(p))) problems.push('a sub that is a LINK into Resources/Raw was not reported: ' + JSON.stringify(f3));
      }
    }
    row(18, 'outPreflight run on a synthetic list (r2C-4): a clean list gives nothing; a sub that is a file, a target that is a directory, a sub that is a link into Resources/Raw (' + (linkOk ? 'link case runs' : 'link case SKIPPED') + ') are each reported', problems);
  }

  /* row 19 (r3C-5): NO Error of SpixiLeanGuard / SpixiLeanReleaseHtml carries ContinueOnError (an Error with ContinueOnError="true" logs and goes on: the refusal would be a warning) — the rows 8 to 16 above find the Errors, this row covers every one */
  {
    const problems = [];
    const all = [...errors(gEls), ...errors(lEls)];
    if (all.length < 15) problems.push('only ' + all.length + ' Error elements found in the two lean targets (the anchor of this row is gone)');
    for (const e of all) if ('ContinueOnError' in e.attrs) problems.push('an Error carries ContinueOnError: ' + JSON.stringify((e.attrs.Text || '').slice(0, 70)));
    // r4C-3: an independent scan of the raw start tags (single or double quoted attributes, attribute names without case): the count must equal the parsed count, and none may name ContinueOnError
    const raw = [...((targetBody('SpixiLeanGuard') || '') + (targetBody('SpixiLeanReleaseHtml') || '')).matchAll(/<Error\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi)].map((m) => m[0]);
    if (raw.length !== all.length) problems.push('the raw scan finds ' + raw.length + ' <Error start tags, the element parser ' + all.length + ' (an Error the parser skips could hide a ContinueOnError)');
    for (const t of raw) if (/\bContinueOnError\s*=/i.test(t)) problems.push('a raw <Error start tag names ContinueOnError: ' + JSON.stringify(t.slice(0, 70)));
    row(19, 'no Error of SpixiLeanGuard or SpixiLeanReleaseHtml carries ContinueOnError (' + all.length + ' Errors read), so every refusal of rows 8 to 16 fails the build', problems);
  }

  /* row 20 (r3S-1, r3S-4, r3S-5, r3S-6; SOURCE): the obj / bin exception is the round-2 form (a stricter real-path-and-as-written test refused every build of a linked checkout, review round 4; its regression is row 21); the renames of both writes go through renameRetry (win32: 5 tries, 100 ms, EPERM / EACCES / EBUSY; UNPROVEN on Windows); the plain catch unlinks only a temp this run made; idOf reads BigInt dev + ino. The behaviour of r3S-1 is rows 3 / 4 (links) */
  {
    const problems = [];
    const src = codeOf(readRaw(pjoin(root, SR), 'utf8'));
    if (!/at !== 'outside' && standing\(join\(proj, 'obj'\)\) === 'outside' && standing\(join\(proj, 'bin'\)\) === 'outside'/.test(src) || /const under =/.test(src)) problems.push('the obj / bin exception is not the round-2 form (any view says under obj or bin)');
    const bare = [...src.matchAll(/(?<![\w.])renameSync\(/g)].length;
    if (bare !== 1) problems.push('renameSync( is called ' + bare + ' times, want once (inside renameRetry)');
    if ([...src.matchAll(/\brenameRetry\(/g)].length !== 3) problems.push('renameRetry is not defined once and called twice (plain and lean)');
    if (!/process\.platform !== 'win32' \|\| n >= 5 \|\| !e \|\| !\['EPERM', 'EACCES', 'EBUSY'\]\.includes\(e\.code\)/.test(src) || !/Atomics\.wait\(.*, 0, 100\)/.test(src)) problems.push('renameRetry is not 5 tries, 100 ms, for EPERM / EACCES / EBUSY on win32');
    if (!/let made = false;/.test(src) || !/made = true;\s*\n\s*if \(readFileSync\(tmpName/.test(src) || !/if \(made\) \{ try \{ unlinkSync\(tmpName\)/.test(src)) problems.push('the plain catch does not unlink only a temp this run created');
    if (!/statSync\(q, \{ bigint: true \}\)/.test(src)) problems.push('idOf does not read BigInt dev + ino');
    row(20, 'source (comment-stripped): the round-2 obj / bin exception; renameRetry (win32, 5 x 100 ms) on both writes; the plain catch unlinks only its own temp; idOf with BigInt (unproven on Windows, see the limits)', problems);
  }

  /* row 21 (r4S-9): the LINKED CHECKOUT class. `root` of the script is the REAL path (import.meta.url); MSBuild writes --out with the WRITTEN spelling, so a checkout reached through a linked folder (macOS /var -> /private/var, a symlinked home,
   * a Windows junction) must still accept the default obj spelling and still refuse Resources/Raw. The scratch tree is reached through a symlink: --out <link>/Spixi/obj/Release/net10.0-android/spixi-strip/html/. → exit 0 (plain and lean),
   * --out <link>/Spixi/Resources/Raw/x → exit 1. A stricter obj / bin test (real path AND path as written) turns this row red. Needs symlinks (SKIPPED without them). */
  {
    const problems = [];
    if (linkOk) for (const [what, flags] of [['plain', PLAIN], ['lean (--lean-css)', LEAN]]) {
      const t = mkTree();
      const lk = pjoin(tmp, 'linked-checkout-' + what.slice(0, 2));
      symlinkSync(t.dir, lk, 'junction');
      const ok1 = run(t, ['--out', lk + '/Spixi/obj/Release/net10.0-android/spixi-strip/html/.', ...flags]);
      if (ok1.code !== 0 || !existsSync(pjoin(t.dir, 'Spixi/obj/Release/net10.0-android/spixi-strip/html/spixi.tokens.css'))) problems.push(what + ' --out <link>/Spixi/obj/…/spixi-strip/html/.: ' + brief(ok1) + ' (want exit 0 and the file written)');
      // round 6 (r5C-1): the project-folder rule through the linked checkout too (the path as written is outside the project folder, the real path inside)
      for (const rel of ['/Spixi/Resources/Raw/x', '/Spixi/Other/x']) {
        const before = snap(t.dir);
        const bad = run(t, ['--out', lk + rel, ...flags]);
        if (bad.code !== 1 || !bad.stderr.includes('REFUSED') || snap(t.dir) !== before) problems.push(what + ' --out <link>' + rel + ': ' + brief(bad) + ' (want exit 1 REFUSED, tree unchanged)');
      }
    }
    row(21, 'a checkout reached through a LINKED folder (r4S-9): --out <link>/Spixi/obj/Release/net10.0-android/spixi-strip/html/. → exit 0 and <link>/Spixi/Resources/Raw/x and (round 6) <link>/Spixi/Other/x → exit 1 REFUSED, plain and lean (' + (linkOk ? 'links run' : 'links SKIPPED') + ')', problems);
  }
}
