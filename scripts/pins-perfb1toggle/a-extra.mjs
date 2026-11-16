/* ==== perfb1toggle (#1595) · A — the app side: the adb walk sets the four switches of batch 1a by ONE launch intent extra.
 *
 * The contract (docs/contract-perfb1toggle.md § 3): the string extra `perfb1flags` on the dev build's launcher activity;
 * the CANON `warmidle=<0|1>,sparerearm=<0|1>,sparekeep=<0|1>,noemptydetail=<0|1>` (51 characters) or nothing is stored;
 * dev mode on at the moment of the store; ONE fixed line `[FLAGS] perfb1 extra stored`; the switches act at the NEXT start.
 * The pure rule and the REAL SpixiFlags.storePerfB1Extra run in the C# harness (scripts/csh/PerfB1ExtraTests.cs: the 16
 * legal values, dev mode off, every refusal class, one line only on success, a throwing read fails closed, the running
 * flags do not move). ⚠ The cloud cannot compile the Android arm (MainActivity.cs compiles only in Damir's Android build),
 * so these are SOURCE pins on purpose (L189: pin whole bodies, count every mention). Comments are masked first (the
 * e-image-seed mask: comments → spaces, newlines kept, strings kept), so a commented-out line never counts.
 *   1 RULES GUARD — Spixi/Utils/PerfB1ExtraRules.cs is WHOLLY inside `#if SPIXI_DEV_COEXIST … #endif` (directives are read with
 *                   any whitespace but a line end before and after `#` — C# also takes VT, FF and the Unicode space
 *                   separators there); no .cs file under Spixi/ #defines or #undefs the symbol; and the three files of the
 *                   batch hold only plain directive lines (no whitespace right after `#`, no whitespace but space / tab);
 *                   and the RAW bytes of EVERY .cs file under Spixi/ (read with node's own fs, not the CRLF-normalising
 *                   helper) hold none of U+0085, U+2028, U+2029, VT, FF or a lone CR (key plainLineEnds), because for C#
 *                   a line — and a `//` comment — also ends at U+0085 / U+2028 / U+2029 / a lone CR, which this `\n` mask
 *                   cannot see, and the tree-wide counts (keyNames, treeReads) use the same mask;
 *   2 RULES PURE  — no MAUI / Android / Core / file / log / Regex; the two constants exact; the names come from
 *                   PerfB1Rules.DevSwitchNames (no switch name as text in the file); dev mode off refuses first;
 *   3 STORE       — SpixiFlags.storePerfB1Extra (and `PerfB1DevKeys[` only at its two known writers, tree-wide): inside `#if SPIXI_DEV_COEXIST`; reads devMode BEFORE the rule and before
 *                   any Set; stores only through PerfB1DevKeys[i]; exactly ONE `Logging.` call, its argument the constant,
 *                   after the loop; the catch logs nothing; no flag of the running process changes; init untouched;
 *   4 READER      — MainActivity.readPerfB1Extra: the whole body frozen (an intent marked LaunchedFromHistory is never read;
 *                   one GetStringExtra through the constant, inside try / catch (Exception) that does nothing); inside
 *                   `#if SPIXI_DEV_COEXIST`; tree-wide: GetStringExtra, ExtraName and the literal `perfb1flags` each at its
 *                   one known site, no ToUri anywhere (it would carry every extra into a string);
 *   5 CALL SITES  — OnCreate ends `handleNotificationIntent(Intent);` + the guarded `if (bundle == null) { readPerfB1Extra(Intent); }`
 *                   (a fresh creation only: a re-created activity gets the same launch intent again); OnNewIntent is the
 *                   base call, the existing fa call (inline on the main thread: MainThread.BeginInvokeOnMainThread runs
 *                   inline there, so the legacy fa read runs BEFORE the new read on both paths; the new catch guards only
 *                   the new read), then the guarded `readPerfB1Extra(intent);`; every mention counted. These two bodies are
 *                   the only places besides the reader where the launch intent with the extra is in hand, so they are also
 *                   held WHOLE by SHA-256 (onCreateBody, onNewIntentBody: comments, #if lines and whitespace as they are);
 *                   a later batch that edits OnCreate or OnNewIntent re-bases the hash after a look at the diff (#1596);
 *   6 FA PATH     — the body of handleNotificationIntent is byte-identical to the base a964790 (SHA-256 of the raw text);
 *   7 NO ECHO     — the new code concatenates, formats or interpolates nothing, opens no file, writes no other log, posts
 *                   no navigation or restart; the value is only measured, indexed, null-checked and handed on;
 *   8 HARNESS     — csh.csproj compiles PerfB1ExtraRules.cs (with SPIXI_DEV_COEXIST) and PerfB1ExtraTests holds its tests
 *                   (names, not assertions: the CSH count is the gate).
 * Deliberate breaks: the perfb1toggle builder-app report. */
import { createHash } from 'node:crypto';
import { readFileSync as readBytes } from 'node:fs';   // #46 r4 R4-4: raw text, CRLF NOT normalised (a lone CR must be seen)
export default async function (h) {
  const { ok, root, readFileSync, readdirSync, existsSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');

  /* comments → spaces (newlines kept); strings and char literals kept (the a-thumb-type / e-image-seed mask) */
  const mask = (t) => {
    const out = t.split('');
    const n = t.length;
    const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
    const str = (i, verbatim, interp) => {
      i++;
      while (i < n) {
        const c = t[i];
        if (verbatim) {
          if (c === '"') { if (t[i + 1] === '"') { i += 2; continue; } return i + 1; }
        } else {
          if (c === '\\') { i += 2; continue; }
          if (c === '"') return i + 1;
          if (c === '\n') return i;
        }
        if (interp && c === '{') { if (t[i + 1] === '{') { i += 2; continue; } i = code(i + 1, true); continue; }
        i++;
      }
      return i;
    };
    const code = (i, hole) => {
      let depth = 0;
      while (i < n) {
        const c = t[i], d = t[i + 1];
        if (c === '/' && d === '/') { let e = t.indexOf('\n', i); if (e < 0) e = n; blank(i, e); i = e; continue; }
        if (c === '/' && d === '*') { let e = t.indexOf('*/', i + 2); e = e < 0 ? n : e + 2; blank(i, e); i = e; continue; }
        if (c === '\'') { const m = /^'(?:\\.[^']*|[^'\\\n])'/.exec(t.slice(i, i + 12)); i += m ? m[0].length : 1; continue; }
        if (c === '"') { i = str(i, false, false); continue; }
        if (c === '@' && d === '"') { i = str(i + 1, true, false); continue; }
        if (c === '$' && d === '"') { i = str(i + 1, false, true); continue; }
        if ((c === '$' && d === '@' || c === '@' && d === '$') && t[i + 2] === '"') { i = str(i + 2, true, true); continue; }
        if (hole) { if (c === '{') depth++; else if (c === '}') { if (depth === 0) return i + 1; depth--; } }
        i++;
      }
      return i;
    };
    code(0, false);
    return out.join('');
  };
  const count = (t, s) => (typeof s === 'string' ? t.split(s).length - 1 : (t.match(s) || []).length);
  /* the brace-matched body after `sig` (on MASKED text): { at, start, end, text } — `at` = the signature's index */
  const span = (t, sig, from = 0) => {
    const at = t.indexOf(sig, from); if (at < 0) return { at: -1, start: -1, end: -1, text: '' };
    const o = t.indexOf('{', at + sig.length); if (o < 0) return { at, start: -1, end: -1, text: '' };
    let d = 0;
    for (let k = o; k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return { at, start: o, end: k + 1, text: t.slice(o, k + 1) }; }
    return { at, start: o, end: -1, text: '' };
  };
  /* the open preprocessor regions at a position (the s14 a1-backup-back helper): a stack of #if conditions */
  const regionsAt = (src, pos) => {
    const st = [];
    for (const m of src.slice(0, pos).matchAll(/^[^\S\r\n]*#[^\S\r\n]*(if|elif|else|endif)\b(.*)$/gm)) {
      if (m[1] === 'if') st.push(m[2].trim());
      else if (m[1] === 'endif') st.pop();
      else { st.pop(); st.push('#' + m[1] + ' ' + m[2].trim()); }
    }
    return st;
  };
  const devOnly = (src, a, b) => a >= 0 && b > a && regionsAt(src, a).join('|') === 'SPIXI_DEV_COEXIST' && regionsAt(src, b).join('|') === 'SPIXI_DEV_COEXIST';
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
    e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
  const TREE = walk('Spixi').map((f) => [f, mask(raw(f))]);
  const inTree = (s) => TREE.filter(([, t]) => t.includes(s)).map(([f]) => f + '×' + count(TREE.find(([g]) => g === f)[1], s)).sort().join(',');

  const RULES_F = 'Spixi/Utils/PerfB1ExtraRules.cs', SF_F = 'Spixi/Utils/SpixiFlags.cs', MA_F = 'Spixi/Platforms/Android/MainActivity.cs';
  const NAMES = ['warmidle', 'sparerearm', 'sparekeep', 'noemptydetail'];
  const RU = existsSync(join(root, RULES_F)) ? mask(raw(RULES_F)) : '';
  const SF = mask(raw(SF_F));
  const MAraw = raw(MA_F), MA = mask(MAraw);

  /* ── 1: RULES GUARD — wholly inside #if SPIXI_DEV_COEXIST (the e-image-seed row 1) ── */
  {
    const lines = RU.split('\n');
    const dir = lines.map((l, k) => [k + 1, l.trim()]).filter(([, l]) => /^#[^\S\r\n]*(if|elif|else|endif)\b/.test(l));
    const firstCode = lines.findIndex((l) => l.trim().length > 0) + 1;
    let lastCode = 0;
    lines.forEach((l, k) => { if (l.trim().length > 0) lastCode = k + 1; });
    let depth = 0, closedAt = 0;
    const early = [];
    /* #46 r2 R2-5: in the batch's three files every directive line is plain — `#` then a letter, and no whitespace but
       space / tab anywhere on the line (VT, FF, NBSP … are legal C# whitespace and would slip past a narrower scan) */
    const unplain = [RULES_F, SF_F, MA_F].flatMap((g) => { const src = g === RULES_F ? RU : g === SF_F ? SF : MA;
      return src.split('\n').map((l, k) => [k + 1, l]).filter(([, l]) => /^[^\S\r\n]*#/.test(l) && (/#\s/.test(l) || /[^\S \t\r\n]/.test(l))).map(([k]) => g + ':' + k); });
    /* #46 r3 R3-3: the RAW text (before any mask; the BOM U+FEFF stays allowed) of the three files holds no other line end */
    const oddEnds = TREE.map(([g]) => g).flatMap((g) => [...readBytes(join(root, g), 'utf8').matchAll(/[\u0085\u2028\u2029\u000B\u000C]|\r(?!\n)/g)]
      .map((m) => g + '@' + m.index + ' U+' + m[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')));
    const defines = TREE.filter(([, t]) => /^[^\S\r\n]*#[^\S\r\n]*(define|undef)[^\S\r\n]+SPIXI_DEV_COEXIST\b/m.test(t)).map(([f]) => f);
    for (const [ln, l] of dir) {
      if (/^#[^\S\r\n]*if\b/.test(l)) depth++;
      else if (/^#[^\S\r\n]*endif\b/.test(l)) { depth--; if (depth === 0) { if (closedAt) early.push(ln); closedAt = ln; } }
      else if (depth === 1) early.push(ln + ' (' + l + ')');
    }
    const g = {
      exists: RU.length > 0,
      opens: dir.length > 0 && dir[0][0] === firstCode && /^#if SPIXI_DEV_COEXIST\s*$/.test(dir[0][1]),
      closesLast: closedAt > 0 && closedAt === lastCode && depth === 0,
      noEarlyClose: early.length === 0,
      noDefine: defines.length === 0,
      plainDirectives: unplain.length === 0,
      plainLineEnds: oddEnds.length === 0,
    };
    ok(F(g).length === 0,
      '★ perfb1toggle A (1) RULES GUARD: ' + RULES_F + ' is WHOLLY inside `#if SPIXI_DEV_COEXIST … #endif` — the first code line is that #if, its #endif the last code line, nothing closes or splits it early (a store build compiles none of it; O-35 refuses the symbol there) — failing: ' + JSON.stringify(F(g)) + ' ' + JSON.stringify({ firstCode, lastCode, closedAt, early, defines, unplain, oddEnds }));
  }

  /* ── 2: RULES PURE ── */
  const parse = span(RU, 'internal static int[]? parse(bool devMode, string? value)');
  {
    const r = {
      pure: RU.length > 0 && !/\busing\b|Microsoft\.Maui|\bAndroid\b|IXICore|Preferences|Logging|\bFile\b|\bDirectory\b|System\.IO|Regex|RegularExpressions|Console|Debug\./.test(RU),
      constants: count(RU, 'internal const string ExtraName = "perfb1flags";') === 1 && count(RU, 'internal const string StoredLine = "[FLAGS] perfb1 extra stored";') === 1
        && count(RU, '"perfb1flags"') === 1 && count(RU, '"[FLAGS] perfb1 extra stored"') === 1,
      namesFromRules: count(RU, 'string[] names = PerfB1Rules.DevSwitchNames;') === 1 && count(parse.text, 'string[] names = PerfB1Rules.DevSwitchNames;') === 1
        && !NAMES.some((n) => RU.includes(n)),
      oneRule: parse.text.length > 0 && count(RU, /\binternal static (?!class\b)/g) === 1 && count(RU, /\bparse\(/g) === 1,
      devModeFirst: /^\{\s*if \(!devMode \|\| value == null\)\s*\{\s*return null;\s*\}\s*string\[\] names = /.test(parse.text),
    };
    ok(F(r).length === 0,
      '★ perfb1toggle A (2) RULES PURE: PerfB1ExtraRules holds ONE rule `parse(devMode, value)` and two constants (ExtraName "perfb1flags", StoredLine "[FLAGS] perfb1 extra stored"); no using, no MAUI / Android / Core type, no Preferences, no log, no file, no Regex; the expected text is built from PerfB1Rules.DevSwitchNames (no switch name as text in the file, so they cannot drift); its first statement refuses dev mode off and null — failing: ' + JSON.stringify(F(r)));
  }

  /* ── 3: STORE (SpixiFlags) ── */
  const SIG_STORE = 'internal static bool storePerfB1Extra(string? value)';
  const st = span(SF, SIG_STORE);
  const B = st.text;
  {
    const iGet = B.indexOf('Preferences.Default.Get("devMode", false)'), iParse = B.indexOf('PerfB1ExtraRules.parse('), iSet = B.indexOf('Preferences.Default.Set(');
    const loop = span(B, 'for (int i = 0; i < PerfB1DevKeys.Length; i++)');
    const iLog = B.indexOf('Logging.info(PerfB1ExtraRules.StoredLine);');
    const props = [...SF.matchAll(/public static bool (\w+) \{ get; private set; \}/g)].map((m) => m[1]);
    const init = span(SF, 'public static void init()').text;
    const perFile = (re) => TREE.map(([g, x]) => [g, count(x, new RegExp(re.source, 'g'))]).filter(([, n]) => n > 0).map(([g, n]) => g + '×' + n).sort().join(',');
    const KEYNAMES = [
      [/\bPerfB1DevKeys\b/, 'Spixi/Pages/Dev/DevPage.xaml.cs×2,Spixi/Pages/Home/HomePage.xaml.cs×1,Spixi/Utils/SpixiFlags.cs×4'],
      [/\bWarmOnIdleKey\b/, 'Spixi/Utils/SpixiFlags.cs×3'], [/\bSpareRearmKey\b/, 'Spixi/Utils/SpixiFlags.cs×3'], [/\bSpareKeepShortSleepKey\b/, 'Spixi/Utils/SpixiFlags.cs×3'], [/\bPhoneNoEmptyDetailKey\b/, 'Spixi/Utils/SpixiFlags.cs×3'],
      [/"flagWarmOnIdle"/, 'Spixi/Utils/SpixiFlags.cs×1'], [/"flagSpareRearm"/, 'Spixi/Utils/SpixiFlags.cs×1'], [/"flagSpareKeepShortSleep"/, 'Spixi/Utils/SpixiFlags.cs×1'], [/"flagPhoneNoEmptyDetail"/, 'Spixi/Utils/SpixiFlags.cs×1'],
    ];
    const s = {
      one: B.length > 0 && count(SF, 'storePerfB1Extra(') === 1 && count(SF, SIG_STORE) === 1,
      guard: devOnly(SF, st.at, st.end),
      devFirst: count(B, 'Preferences.Default.Get(') === 1 && iGet >= 0 && iParse > iGet && iSet > iParse
        && /bool dev = Preferences\.Default\.Get\("devMode", false\);\s*int\[\]\? v = PerfB1ExtraRules\.parse\(dev, value\);\s*if \(v == null \|\| v\.Length != PerfB1DevKeys\.Length\)\s*\{\s*return false;\s*\}/.test(B),
      keysOnly: count(B, 'Preferences.Default.Set(') === 1 && /^\{\s*Preferences\.Default\.Set\(PerfB1DevKeys\[i\], v\[i\]\);\s*\}$/.test(loop.text)
        && !/\.Remove\(|\.Clear\(|SecureStorage/.test(B),
      oneLog: count(B, /\bLogging\./g) === 1 && iLog > loop.end && loop.end > 0 && /Logging\.info\(PerfB1ExtraRules\.StoredLine\);\s*return true;\s*\}\s*catch/.test(B),
      catchSilent: count(B, /\bcatch\b/g) === 1 && /catch \(Exception\)\s*\{\s*return false;\s*\}\s*\}$/.test(B),
      keyWriters: inTree('PerfB1DevKeys[') === 'Spixi/Pages/Dev/DevPage.xaml.cs×1,' + SF_F + '×1',
      /* #46 r2 R2-6: every way to name the four keys, per file, frozen (comments masked, strings kept) — a new writer in
         the foreach form, through a key constant or through the literal changes a count */
      keyNames: KEYNAMES.every(([re, want]) => perFile(re) === want),
      noFlagChange: props.length >= 19 && !props.some((p) => new RegExp('\\b' + p + '\\s*=(?!=)').test(B)) && !/\binit\(|leaveDevMode\(/.test(B)
        && init.length > 0 && !/PerfB1Extra|storePerfB1Extra/.test(init),
    };
    if (F(s).includes('keyNames')) s.keyNamesGot = KEYNAMES.filter(([re, want]) => perFile(re) !== want).map(([re]) => String(re) + ' got ' + perFile(re)).join(' · ');
    ok(F(s).filter((k) => k !== 'keyNamesGot').length === 0,
      '★ perfb1toggle A (3) STORE: SpixiFlags.storePerfB1Extra exists once, inside `#if SPIXI_DEV_COEXIST`; it reads "devMode" (once) BEFORE the rule and before any Set; a refusal returns before the loop; it stores only `Preferences.Default.Set(PerfB1DevKeys[i], v[i])`; exactly ONE `Logging.` call — `Logging.info(PerfB1ExtraRules.StoredLine)` after the loop; the one catch returns false and logs nothing; it assigns no flag of the running process and never calls init / leaveDevMode; init does not name it; PerfB1DevKeys, the four key constants and the four key literals are named per file exactly as frozen — failing: ' + JSON.stringify(F(s).filter((k) => k !== 'keyNamesGot')) + (s.keyNamesGot ? ' ' + s.keyNamesGot : ''));
  }

  /* ── 4: READER (MainActivity) ── */
  const SIG_READ = 'private static void readPerfB1Extra(Intent? intent)';
  const toUri = TREE.filter(([, t]) => /\bToUri\s*\(/i.test(t)).map(([g]) => g);   // \b: SaveFileToUri( is no ToUri call; /i: also the obsolete ToURI() (#46 r4 R4-1)
  const rd = span(MA, SIG_READ);
  {
    const base = { getString: 1, extras: 3 };   // a964790: the fa path's `intent?.Extras != null && intent.Extras.ContainsKey("fa")` + `intent.Extras.GetString("fa")`
    const r = {
      body: /^\{\s*try\s*\{\s*if \(intent == null \|\| \(intent\.Flags & ActivityFlags\.LaunchedFromHistory\) != 0\)\s*\{\s*return;\s*\}\s*string\? value = intent\.GetStringExtra\(PerfB1ExtraRules\.ExtraName\);\s*if \(value != null\)\s*\{\s*SpixiFlags\.storePerfB1Extra\(value\);\s*\}\s*\}\s*catch \(Exception\)\s*\{\s*\}\s*\}$/.test(rd.text),
      guard: count(MA, SIG_READ) === 1 && devOnly(MA, rd.at, rd.end),
      historyGuard: count(MA, 'ActivityFlags.LaunchedFromHistory') === 1 && /^\{\s*try\s*\{\s*if \(intent == null \|\| \(intent\.Flags & ActivityFlags\.LaunchedFromHistory\) != 0\)\s*\{\s*return;\s*\}/.test(rd.text)
        && rd.text.indexOf('LaunchedFromHistory') < rd.text.indexOf('GetStringExtra('),
      treeReads: inTree('GetStringExtra(') === MA_F + '×1' && toUri.length === 0 && inTree('PerfB1ExtraRules.ExtraName') === MA_F + '×1'
        && inTree('perfb1flags') === RULES_F + '×1',
      oneRead: count(MA, 'GetStringExtra(') === 1 && count(rd.text, 'GetStringExtra(') === 1 && count(MA, /\.GetString\(/g) === base.getString
        && count(MA, /\bExtras\b/g) === base.extras && count(MA, /GetBundleExtra|GetParcelableExtra|GetSerializableExtra|GetCharSequenceExtra|GetStringArrayExtra|GetIntExtra|GetBooleanExtra/g) === 0,
      nameByConstant: count(MAraw, 'perfb1flags') === 0 && count(MA, 'PerfB1ExtraRules.') === 1 && count(MA, 'PerfB1ExtraRules.ExtraName') === 1,
      oneHandOff: count(MA, 'SpixiFlags.storePerfB1Extra(') === 1 && count(rd.text, 'SpixiFlags.storePerfB1Extra(value);') === 1,
    };
    ok(F(r).length === 0,
      '★ perfb1toggle A (4) READER: MainActivity.readPerfB1Extra (once, inside `#if SPIXI_DEV_COEXIST`) is exactly `try { if (intent == null || (intent.Flags & ActivityFlags.LaunchedFromHistory) != 0) { return; } string? value = intent.GetStringExtra(PerfB1ExtraRules.ExtraName); if (value != null) { SpixiFlags.storePerfB1Extra(value); } } catch (Exception) { }` — a hostile intent that throws at unparcel does nothing; GetStringExtra appears once in the file, no other extra read is added (the fa path\'s Extras / GetString unchanged); the name `perfb1flags` never appears in the file (only through the constant); tree-wide GetStringExtra and ExtraName only here, the literal only in PerfB1ExtraRules.cs, no ToUri; one hand-off — failing: ' + JSON.stringify(F(r)) + ' ' + JSON.stringify({ gse: inTree('GetStringExtra('), toUri, name: inTree('PerfB1ExtraRules.ExtraName'), lit: inTree('perfb1flags') }));
  }

  /* ── 5: CALL SITES ── */
  {
    const oc = span(MA, 'protected override void OnCreate(Bundle? bundle)');
    const ni = span(MA, 'protected override void OnNewIntent(Intent? intent)');
    const callAt = (b, s) => (b.start < 0 ? -1 : b.start + b.text.indexOf(s));
    const sha = (b) => (b.end > 0 ? createHash('sha256').update(MAraw.slice(b.start, b.end), 'utf8').digest('hex') : 'absent');
    const OC_FROZEN = '92c0f7a92747b22542945288898b3b8ae4eed09bb8e8f8ffd8cb41a11f1cd6f9', NI_FROZEN = '96273af77d8e2cf5c34d26d9c543be2e1cd9500e7b017db80c3388f57d45cd5c';
    const c = {
      onCreateBody: sha(oc) === OC_FROZEN,
      onNewIntentBody: sha(ni) === NI_FROZEN,
      onCreate: /handleNotificationIntent\(Intent\);\s*#if SPIXI_DEV_COEXIST\s*if \(bundle == null\)\s*\{\s*readPerfB1Extra\(Intent\);\s*\}\s*#endif\s*\}$/.test(oc.text)
        && count(oc.text, 'readPerfB1Extra(') === 1 && devOnly(MA, callAt(oc, 'readPerfB1Extra(Intent);'), callAt(oc, 'readPerfB1Extra(Intent);') + 1),
      freshOnly: oc.at >= 0 && count(oc.text, 'if (bundle == null)') === 1 && count(oc.text, 'bundle') === 2
        && oc.text.indexOf('if (bundle == null)') < oc.text.indexOf('readPerfB1Extra(Intent);') && oc.text.indexOf('if (bundle == null)') > oc.text.indexOf('handleNotificationIntent(Intent);'),
      onNewIntent: /^\{\s*base\.OnNewIntent\(intent\);\s*MainThread\.BeginInvokeOnMainThread\(\(\) => handleNotificationIntent\(intent\)\);\s*#if SPIXI_DEV_COEXIST\s*readPerfB1Extra\(intent\);\s*#endif\s*\}$/.test(ni.text)
        && devOnly(MA, callAt(ni, 'readPerfB1Extra(intent);'), callAt(ni, 'readPerfB1Extra(intent);') + 1),
      everyMention: count(MA, 'readPerfB1Extra(') === 3 && inTree('readPerfB1Extra(') === MA_F + '×3'
        && inTree('storePerfB1Extra(') === MA_F + '×1,' + SF_F + '×1',
    };
    ok(F(c).length === 0,
      '★ perfb1toggle A (5) CALL SITES: OnCreate ends with the unchanged `handleNotificationIntent(Intent);` then `#if SPIXI_DEV_COEXIST if (bundle == null) { readPerfB1Extra(Intent); } #endif` (a fresh creation only); OnNewIntent is `base.OnNewIntent(intent);`, the unchanged fa call (inline on the main thread), then `#if SPIXI_DEV_COEXIST readPerfB1Extra(intent); #endif` — store only, no restart, no navigation; readPerfB1Extra is named 3 times in the tree (all MainActivity), storePerfB1Extra twice (its declaration + the reader) — failing: ' + JSON.stringify(F(c)) + ' ' + JSON.stringify({ read: inTree('readPerfB1Extra('), store: inTree('storePerfB1Extra('), onCreate: sha(oc), onNewIntent: sha(ni) }));
  }

  /* ── 6: FA PATH — the body of handleNotificationIntent is byte-identical to the base (a964790) ── */
  {
    const FROZEN = '655d8e53f631fd590594d16f22e5c5980a52e19f3d388f264f942937cd87a3f0';   // a964790, computed from `git show HEAD:Spixi/Platforms/Android/MainActivity.cs` before the edit
    const hn = span(MA, 'void handleNotificationIntent(Intent? intent)');
    const got = hn.end > 0 ? createHash('sha256').update(MAraw.slice(hn.start, hn.end), 'utf8').digest('hex') : 'absent';
    const fa = {
      body: got === FROZEN,
      calls: count(MA, 'handleNotificationIntent(') === 3 && count(MA, 'void handleNotificationIntent(Intent? intent)') === 1,
    };
    ok(F(fa).length === 0,
      '★ perfb1toggle A (6) FA PATH: the body of MainActivity.handleNotificationIntent (comments included) is byte-identical to the base a964790 (SHA-256 ' + FROZEN.slice(0, 12) + '…) and is named three times (its declaration, OnCreate, OnNewIntent), as on the base — failing: ' + JSON.stringify(F(fa)) + ' got=' + got);
  }

  /* ── 7: NO ECHO — the new code never puts the value into a string, a log, a file or a navigation ── */
  {
    const parts = { rules: parse.text, store: B, reader: rd.text };
    const all = Object.values(parts).join('\n');
    const FORMAT = /\$"|\$@"|@\$"|string\.Format|String\.Format|\.Concat\(|StringBuilder|\.ToString\(|\.Substring\(|string\.Join|String\.Join|\+\s*value\b|\bvalue\s*\+(?!\+)/;
    const SINK = /\bFile\.|\bDirectory\.|Stream|\bPath\.|Console\.|\bDebug\.|\bTrace\.|\bLog\.|Android\.Util|sendUiCommand|SecureStorage|Clipboard/;
    const ACT = /StartActivity|\bFinish\(|Recreate\(|Navigation|PushAsync|PopAsync|startingScreen|tryNavigateToChat|handleNotificationIntent|PutExtra|SetIntent|\bExit\(|KillProcess/;
    const valueUse = (t) => [...t.matchAll(/\bvalue\b/g)].map((m) => t.slice(m.index, m.index + 14));
    const n = {
      found: parse.text.length > 0 && B.length > 0 && rd.text.length > 0,
      noFormat: !FORMAT.test(all),
      noSink: !SINK.test(all) && count(all, /\bLogging\./g) === 1,
      noRestartOrNav: !ACT.test(all),
      valueOnlyMeasured: valueUse(parse.text).every((u) => /^value( == null|\.Length|\[)/.test(u)) && valueUse(B).length === 1 && /parse\(dev, value\)/.test(B)
        && valueUse(rd.text).length === 3,
      storedLineOnce: inTree('PerfB1ExtraRules.StoredLine') === SF_F + '×1' && inTree('[FLAGS] perfb1 extra stored') === RULES_F + '×1',
    };
    ok(F(n).length === 0,
      '★ perfb1toggle A (7) NO ECHO (the gate: the launcher activity is exported): the rule, the store and the reader format, concatenate or interpolate nothing, touch no file / stream / console / Android log, post no navigation, restart or new intent; the one `Logging.` call is the store\'s; the value is only null-checked, measured, indexed and handed to the rule; the stored line is used once (SpixiFlags) and written once (the constant) — failing: ' + JSON.stringify(F(n)) + ' ' + JSON.stringify({ rules: valueUse(parse.text), store: valueUse(B).length, reader: valueUse(rd.text).length }));
  }

  /* ── 8: HARNESS ── */
  {
    const CSH = raw('scripts/csh/csh.csproj').replace(/<!--[\s\S]*?-->/g, '');
    const TF = 'scripts/csh/PerfB1ExtraTests.cs';
    const T = existsSync(join(root, TF)) ? mask(raw(TF)) : '';
    const TESTS = ['extra_name_and_stored_line', 'canon_example_is_51_characters_and_parses', 'all_sixteen_legal_values', 'dev_mode_off_refuses_every_legal_value',
      'refuses_null_and_empty', 'refuses_a_wrong_set_of_names', 'refuses_values_other_than_0_or_1', 'refuses_spaces_and_newlines', 'refuses_other_separators',
      'refuses_longer_and_shorter', 'a_51_character_text_one_character_off_is_refused', 'store_with_dev_mode_on_stores_the_four_and_logs_one_line',
      'store_with_dev_mode_off_or_absent_stores_and_logs_nothing', 'store_of_a_refused_value_stores_and_logs_nothing', 'store_with_a_throwing_preference_fails_closed',
      'store_with_a_throw_at_the_third_write_logs_nothing', 'store_acts_at_the_next_start_only'];
    const missing = TESTS.filter((m) => !new RegExp('\\[TestMethod\\]\\s*public void ' + m + '\\(\\)').test(T));
    const hz = {
      compiles: count(CSH, '<Compile Include="../../Spixi/Utils/PerfB1ExtraRules.cs" />') === 1 && count(CSH, '<Compile Include="../../Spixi/Utils/SpixiFlags.cs" />') === 1
        && /<DefineConstants>\$\(DefineConstants\);SPIXI_DEV_COEXIST<\/DefineConstants>/.test(CSH),
      testClass: /\[TestClass\]\s*public class PerfB1ExtraTests/.test(T),
      tests: missing.length === 0 && count(T, /\[TestMethod\]/g) === TESTS.length,
    };
    ok(F(hz).length === 0,
      '★ perfb1toggle A (8) HARNESS: csh.csproj compiles PerfB1ExtraRules.cs and the REAL SpixiFlags.cs with SPIXI_DEV_COEXIST, and PerfB1ExtraTests holds its ' + TESTS.length + ' tests (the 16 legal values, dev mode off, each refusal class, the store: one line on success, nothing on a refusal, fail closed, the next start) — failing: ' + JSON.stringify(F(hz)) + (missing.length ? ' missing: ' + missing.join(',') : ''));
  }
}
