/* ==== walktools · B — the screen map of scripts/device/adb-walk.ps1 gets its second form, `sets`, for screens.chat and screens.viewer ONLY
 * (contract docs/contract-walktools.md § 3 interface I-2; mechanism docs/walktools-mechanisms.md § 2). A screen is EITHER { probes, minMatch } (today)
 * OR { sets: [ { name: light|dark, probes, minMatch } ] }; it passes when AT LEAST ONE set passes; the notes name the set that passed.
 *
 * LIMITS (#1735, stated in the first version). Pure node: the twin and CI have no PowerShell, so every key is a SOURCE pin on adb-walk.ps1 (the
 * statements of the functions, comments and blank lines dropped; a line is compared as its trimmed text) plus the BEHAVIOUR of what can run in
 * JavaScript: the two regexes are cut out of the script text (PowerShell `\A` -> `^`, `\z` -> `$`) and the validator RULES are re-implemented here
 * (specGap) and run on scripts/device/a52s.json and on the proposed values of the mechanisms doc. A statement pin does NOT prove that PowerShell runs
 * the statements in that order; nothing here ran on Windows PowerShell 5.1, on System.Drawing or on a phone. The real functions run on PowerShell 7
 * BY HAND: `node scripts/pins-walktools/b-screens-run.mjs` (needs pwsh; parse gate, the old form byte-equal to the base, every sets case, the load-time
 * usage errors). If the script text and specGap drift apart, the by-hand run is the arbiter. NOT caught: a change to a helper the new functions call
 * (Get-Field, Test-IsInt, Test-OnScreen), a line moved between two places with the same neighbours, a redefinition of a function name later in the file
 * (names ignore case) — k8 counts the definitions.
 *   k1 reader      — Get-ScreenGap holds the sets reader: the `sets` key is found by presence (Test-HasField), 1 or 2 sets, the name regex ^(light|dark)$ (case
 *                    sensitive), unique names, a key with both forms (sets + probes / minMatch) is a gap, every set goes through Get-ProbeListGap
 *   k2 onlyChatViewer — only chat and viewer may hold sets: a gap in Get-ScreenGap AND a usage error at load time, BEFORE the first Exit-Usage of the
 *                    timing block and before any adb command; accountScrolled keeps its own rule (it reads probes / minMatch, never sets)
 *   k3 decision    — Test-Screen -> Test-Probes -> Get-ProbeVerdict -> Test-ProbeSetPixels; the arithmetic lives ONLY in the pure function (no System.Drawing
 *                    there); a screen passes when AT LEAST ONE set passes; none passing = every set's count in the note, no number of a single set
 *   k4 oldForm     — the old form: Get-ProbeListGap holds the old checks in the old order with the old texts; Get-ScreenGap passes 'screens.<name>' as the label,
 *                    so the old texts are byte-equal; the old verdict keeps the old note and result shape
 *   k5 notes       — review round 1 (M3): the REP notes of a walk never name the passing set (a rep note is cut at 120 characters; the success note ate the
 *                    room of a failure note); the set that passed is named in the calibrate entry ("ok (set light)", `sets`, `set` in probeDetail); the
 *                    failure text of a pre-check is shorter for the sets form (Get-PreCheckText; the old words stay byte for byte); the two calibrate notes
 *                    (chat: 3 pill probes + the Aa glyph; viewer only after the chat check) come ONLY when the map holds sets; the header says all of it
 *   k6 noNewInput  — no new adb command shape: the four allowlist functions are held by SHA-256 of their statements, the new functions send nothing
 *                    (no Invoke-Shell / Invoke-Adb / input) and no verb word of the safety list appears in them
 *   k7 realMap     — scripts/device/a52s.json parses; every screen is valid under the rules (re-implemented in JS); only chat and viewer MAY hold sets; the
 *                    VALUES are not pinned (the operator block fills them); the proposed values of the mechanisms doc are valid; the rule texts reject what
 *                    they must (both forms, unknown / duplicate name, 5 sets, sets on another screen)
 *   k8 definitions — each new function is defined exactly once
 * ★ walktools2 re-base (2026-11-23; after a look at the diff, #1596 / #1634): screens.home may hold sets too (k2 gapRule / usageBlock, k7 specGap / noSetsOutsideChatViewer / rejectOtherScreen + acceptHomeSets); k6 allowlistFrozen = the base + the ONE `$script:WatchEventsCmd,` line of Initialize-Allowlist.
 * Deliberate breaks (#802): the builder's report, one one-token mutation per key in a full copy of the tree (run with a scratch runner). */
import { createHash } from 'node:crypto';

const sha = (x) => createHash('sha256').update(x).digest('hex');
const code = (t) => t.replace(/<#[\s\S]*?#>/g, '').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');   // block + whole-line comments
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
const js = (re) => new RegExp(re.replace(/\\A/g, '^').replace(/\\z/g, '$'));

export const ALLOWLIST_FN_SHA = {   // held unchanged: this batch sends no new command shape (the hashes of the statements of the base, 338d30f4)
  'Initialize-Allowlist': 'b083355a9f0ab001d9766e4096b381e8c7237e2e58c1796f2bb8f327c10026ab',
  'Test-ShellAllowed': '1645be543b1068a00d68c9ad40ca27a9ea225a66684e84b687764f21f22f58f5',
  'Assert-AdbCommand': '6907f808b2b25b6d46feb2973ad67a10649c48b724df88a17ebb69cf548e3ca6',
  'Get-LogPullCmd': '11401bdd230fe9d0245955048f6d99162e4a75fb17b2646b4f8d89fb7dcc56e1',
};
export const NEW_FNS = ['Test-HasField', 'Get-ProbeListGap', 'Get-ScreenProbeSets', 'Test-ProbeSetPixels', 'Get-ProbeVerdict', 'Get-PreCheckText'];

export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/\r\n/g, '\n');
  const DRV = raw('scripts/device/adb-walk.ps1');
  const D = code(DRV);
  const fn = (n) => fnPS(D, n);
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const has = (t, s) => t.includes(s);
  const idx = (t, s) => t.indexOf(s);

  /* ── k1 · the reader ── */
  const gap = fn('Get-ScreenGap');
  const k1 = {
    found: gap.length > 0 && fn('Get-ProbeListGap').length > 0 && fn('Test-HasField').length > 0,
    presence: has(gap, "if (Test-HasField $scr 'sets') {") && has(fn('Test-HasField'), '$null -ne $Obj.PSObject.Properties[$Name]'),
    count: has(gap, "if ($sets.Count -lt 1 -or $sets.Count -gt 2) { return ('screens.' + $Name + '.sets must be a list of 1 or 2 sets') }"),
    isList: has(gap, "$rawSets = $scr.PSObject.Properties['sets'].Value") && has(gap, "if ($rawSets -isnot [System.Array]) { return ('screens.' + $Name + '.sets must be a list of 1 or 2 sets') }") && has(gap, '$sets = @($rawSets)'),
    nameRegex: has(gap, "$sn -cnotmatch '\\A(light|dark)\\z'"),
    unique: has(gap, '$seen.ContainsKey($sn)') && has(gap, '$seen[$sn] = $true'),
    bothForms: has(gap, "(Test-HasField $scr 'probes') -or (Test-HasField $scr 'minMatch')"),
    eachSet: has(gap, "Get-ProbeListGap ('screens.' + $Name + '.sets[' + $sn + ']') @(Get-Field $st 'probes') (Get-Field $st 'minMatch')"),
    gapNotUsage: !/Exit-Usage/.test(gap),   // invalid chat / viewer = a gap ("no data"), as every invalid screen today
  };
  ok(F(k1).length === 0,
    '★ walktools B (k1 reader): Get-ScreenGap reads the `sets` form — the key by presence (Test-HasField), a list of 1 or 2 sets (null and an object are invalid), the case-sensitive name ^(light|dark)$, unique names, a key with both forms (sets + probes / minMatch) is a gap, every set goes through Get-ProbeListGap with the label screens.<name>.sets[<set>]; an invalid screen stays a GAP (no data), never a usage error there — failing: ' + JSON.stringify(F(k1)));

  /* ── k2 · only chat and viewer ── */
  const iBlock = idx(D, "$scrAll = Get-Field $script:Cfg 'screens'");
  const iTiming = idx(D, "$timing = Get-Field $script:Cfg 'timing'");
  const blockText = iBlock < 0 ? '' : D.slice(iBlock, idx(D, "foreach ($scrName in @('home', 'chat', 'chatinfo', 'viewer', 'downloads')) {"));
  const asRule = (() => { const i = idx(D, "if (-not (Get-ScreenGap 'accountScrolled') -and -not (Get-TapGap 'accountDownloads')) {"); return i < 0 ? '' : D.slice(i, iTiming); })();
  const k2 = {
    // ★ walktools2 re-base (2026-11-23): the screens that may hold sets are home, chat and viewer (item 3: the dark home); the rule is the same, the list is the old one + `home` first; every other screen is still a gap / a usage error
    gapRule: has(gap, "@('home', 'chat', 'viewer') -cnotcontains $Name") && has(gap, 'may not use sets (only home, chat and viewer)'),
    usageBlock: has(blockText, "(Test-HasField (Get-Field $scrAll $scrKey) 'sets') -and (@('home', 'chat', 'viewer') -cnotcontains $scrKey)") && has(blockText, 'Exit-Usage') && has(blockText, 'only screens.home, screens.chat and screens.viewer may use sets'),
    beforeTheLimitsAndTiming: iBlock > 0 && iBlock < iTiming && iBlock < idx(D, "foreach ($scrName in @('home', 'chat', 'chatinfo', 'viewer', 'downloads')) {"),
    loopsOverEveryScreenKey: has(blockText, '$scrAll.PSObject.Properties.Name'),
    accountScrolledKeepsOldForm: asRule.length > 0 && has(asRule, "Get-Field $asScr 'probes'") && has(asRule, "Get-Field $asScr 'minMatch'") && !/sets/.test(asRule),
    accountScrolledInvalidIsUsage: has(D, "if ($null -ne (Get-Field (Get-Field $script:Cfg 'screens') 'accountScrolled') -and (Get-ScreenGap 'accountScrolled')) { Exit-Usage"),
  };
  ok(F(k2).length === 0,
    '★ walktools B (k2 onlyChatViewer): ONLY screens.home, screens.chat and screens.viewer may hold sets (walktools2 re-base: home added) — Get-ScreenGap makes any other screen with sets a gap, and the load block loops over EVERY key of screens and makes sets on another screen a usage error (before the 16-probe limits and the timing block, so before any adb command); accountScrolled keeps its old form (its load-time rule reads probes / minMatch only) and a present-but-invalid accountScrolled is still a usage error — failing: ' + JSON.stringify(F(k2)));

  /* ── k3 · the decision ── */
  const tProbes = fn('Test-Probes'), tScreen = fn('Test-Screen'), verdict = fn('Get-ProbeVerdict'), pure = fn('Test-ProbeSetPixels');
  const k3 = {
    chain: has(tScreen, '$pr = Test-Probes $Png $Name') && has(tProbes, '$o = Get-ProbeVerdict $sets $lists') && has(verdict, 'Test-ProbeSetPixels'),
    pngReadStays: has(tProbes, '$bmp.GetPixel([int](Get-Field $pr \'x\'), [int](Get-Field $pr \'y\'))') && has(tProbes, 'System.Drawing.Bitmap($ms)') && has(tProbes, 'ReadAllBytes($Path)'),
    pureHasNoDrawing: pure.length > 0 && !/System\.Drawing|GetPixel|Bitmap/.test(pure),
    arithmeticOnlyInPure: !has(tProbes, '[math]::Abs') && !has(verdict, '[math]::Abs') && countOf(pure, '[math]::Abs') === 3 && countOf(pure, '-le $tol') === 3 && has(pure, '$r.Ok = ($r.Matched -ge $Min)'),
    anySetPasses: has(verdict, 'if ($res.Ok -and -not $v.Ok) { $v.Ok = $true; $v.Set = $Sets[$k].Name;') && has(verdict, 'for ($k = 0; $k -lt $Sets.Count; $k++) {'),
    noneNamesEverySet: has(verdict, "$parts.Add($Sets[$k].Name + ' ' + $res.Matched + '/' + $res.Of + ' (' + $min + ')')") && has(verdict, "$v.Note = 'no set matches: ' + ($parts -join ', ')"),
    noNumberWhenNone: has(verdict, '$v.Matched = $null; $v.Of = $null;'),
    screenCarriesSet: has(tScreen, "return @{ Ok = $true; Note = ''; Set = $pr.Set }") && has(tScreen, "return @{ Ok = $false; Note = $pr.Note; Sets = [int]$pr.Sets.Count }"),
    failedReadIsNoData: has(tProbes, "$o.Note = 'cannot read PNG'") && has(tProbes, '$o.Ok = $false'),
  };
  ok(F(k3).length === 0,
    '★ walktools B (k3 decision): Test-Screen -> Test-Probes (reads the pixels of every probe of every set from the PNG, as before) -> Get-ProbeVerdict -> Test-ProbeSetPixels (the pure decision: the three-channel tolerance arithmetic lives ONLY there, no System.Drawing); a screen passes when AT LEAST ONE set passes (the first passing set in file order is named); when none passes the note names EVERY set\'s count in the compact form "no set matches: light 2/4 (4), dark 0/4 (4)" and Matched / Of stay $null (no number of a set that was not the one); a failed PNG read is "cannot read PNG" — failing: ' + JSON.stringify(F(k3)));

  /* ── k4 · the old form ── */
  const listGap = fn('Get-ProbeListGap');
  const oldTexts = [" not calibrated (no probes)'", "' probe ' + $i + ' is invalid'", "' probe ' + $i + ' is off the screen or tol is not 0..255'", " not calibrated (placeholder probe)'", "'.minMatch is not 1..' + $probes.Count"];
  const orderIdx = [
    idx(listGap, '$probes.Count -eq 0'), idx(listGap, '-cnotmatch'), idx(listGap, 'is off the screen or tol is not 0..255'),
    idx(listGap, '$placeholder -eq $probes.Count'), idx(listGap, '.minMatch is not 1..'),
  ];
  const oldVerdict = idx(verdict, 'if (-not $Sets[0].IsSets) {');
  const k4 = {
    texts: oldTexts.every((s) => has(listGap, s)),
    order: orderIdx.every((v, i) => v > 0 && (i === 0 || v > orderIdx[i - 1])),
    hexRegex: has(listGap, "$rgb -cnotmatch '^#[0-9A-Fa-f]{6}\\z'"),
    oldLabel: has(gap, "return (Get-ProbeListGap ('screens.' + $Name) @(Get-Field $scr 'probes') (Get-Field $scr 'minMatch'))"),
    placeholderRule: has(listGap, "if ($x -eq 0 -and $y -eq 0 -and $rgb -eq '#000000') { $placeholder++ }"),
    oldVerdict: oldVerdict > 0 && has(verdict, "if (-not $v.Ok) { $v.Note = 'probes ' + $v.Matched + ' of ' + $v.Of + ' match (minMatch ' + [int]$Sets[0].Min + ')' }"),
    oldFormList: has(fn('Get-ScreenProbeSets'), "$list.Add(@{ Name = ''; Probes = @(Get-Field $Scr 'probes'); Min = (Get-Field $Scr 'minMatch'); IsSets = $false })"),
    stepGapUntouched: has(D, "if ($kind -eq 'screen') { $gap = Get-ScreenGap $name }") && has(D, "if ($Step -eq 'downloads') { $need = @($need) + @('swipe:accountDownloads', 'screen:accountScrolled') }"),
  };
  ok(F(k4).length === 0,
    '★ walktools B (k4 oldForm): the old form is unchanged in behaviour — Get-ProbeListGap holds the old checks in the old order (no probes · each probe: integers, "#RRGGBB" case-insensitive hex, on the screen, tol 0..255 · placeholder · minMatch 1..n) with the old texts, Get-ScreenGap hands it the label screens.<name> (so every old text is byte-equal), Get-ProbeVerdict gives the old "probes m of n match (minMatch k)" note for the old form, and Get-StepGap reads the gaps as before — failing: ' + JSON.stringify(F(k4)));

  /* ── k5 · where the set is named ── */
  const calSrc = D;
  const calFn = fn('Invoke-Calibrate');
  const noteChat = (/\$cal\.notes\.Add\('(chat sets: [^']*)'\)/.exec(calFn) || [])[1] || '';
  const noteView = (/\$cal\.notes\.Add\('(viewer is checked only[^']*)'\)/.exec(calFn) || [])[1] || '';
  const safe = (s) => s.length > 0 && s.length <= 120 && /^[A-Za-z0-9 _.,:=\/()%+-]+$/.test(s);   // Get-SafeNote's alphabet and cap
  const pre = fn('Invoke-PreCheck'), pct = fn('Get-PreCheckText');
  const k5 = {
    noRepSuccessNote: ['Invoke-ShotCheck', 'Invoke-PreCheck', 'Invoke-FileShot'].every((n) => fn(n).length > 0 && !/Add-Note[^\n]*\$chk\.Set|check: set |pre-check: set /.test(fn(n))),
    preCheckText: has(pre, 'throw (Get-PreCheckText $Expect $chk $left)') && has(pct, "if ($Chk.Sets -gt 0) { return ('ADBWALK-NOSCREEN: ' + $Expect + ' check failed: ' + ($Chk.Note -replace '^no set matches: ', '') + $Left) }") && has(pct, "return ('ADBWALK-NOSCREEN: before the input the ' + $Expect + ' screen check failed: ' + $Chk.Note + $Left)"),
    screenCarriesSets: has(tScreen, 'Sets = [int]$pr.Sets.Count'),
    calibrateEntry: has(calSrc, "if ($pr.Ok) { if ($pr.Set) { $e['probes'] = 'ok (set ' + $pr.Set + ')' } else { $e['probes'] = 'ok' } } else { $e['probes'] = $pr.Note }") && has(calSrc, "if ($pr.Sets.Count -gt 0) { $e['sets'] = $pr.Sets }"),
    detailHasSet: has(verdict, "$d['set'] = $Sets[$k].Name"),
    calibrateNotesOnlyWithSets: has(calFn, "if ((Test-HasField (Get-Field (Get-Field $script:Cfg 'screens') 'chat') 'sets') -or (Test-HasField (Get-Field (Get-Field $script:Cfg 'screens') 'viewer') 'sets')) {") && countOf(calFn, '$cal.notes.Add(') >= 2 && calFn.indexOf('chat sets: ') > calFn.indexOf("if ((Test-HasField (Get-Field (Get-Field $script:Cfg 'screens') 'chat') 'sets')"),
    calibrateNoteChat: /Aa glyph/.test(noteChat) && /3 pill probes/.test(noteChat) && safe(noteChat),
    calibrateNoteViewer: /only after the chat check passes/.test(noteView) && /fill the chat sets before the calibrate that reads the viewer/.test(noteView) && safe(noteView),
    header: has(DRV, 'Batch walktools (item 2) - the screen map has a second form, ONLY for screens.chat and screens.viewer') && has(DRV, '"sets": [ { "name": "light" | "dark", "probes": [ ... ], "minMatch": n }, ... ]') && has(DRV.replace(/\s+/g, ' '), 'sets on any other screen is a usage error before any adb command') && has(DRV, 'screen probes or, for chat and viewer, probe sets; the package is pinned below'),
    headerRound1: (() => { const H = DRV.slice(0, DRV.indexOf('Inputs: a52s.json')).replace(/\s+/g, ' '); return has(H, 'THREE probes inside the pill of the composer AND ONE probe on the "Aa" glyph of the message field') && has(H, 'a chat-only chrome feature') && has(H, 'The viewer is calibrated only AFTER the chat check passes') && has(H, 'the chat sets must be in the map BEFORE the calibrate that reads the viewer') && has(H, 'no set matches: light 2/4 (4), dark 0/4 (4)') && has(H, 'the rep notes of a walk do NOT name the passing set') && has(H, 'must be a list of 1 or 2 sets'); })(),
  };
  ok(F(k5).length === 0,
    '★ walktools B (k5 notes): the REP notes of a walk never name the passing set (no Add-Note of $chk.Set in Invoke-ShotCheck / Invoke-PreCheck / Invoke-FileShot: a rep note is cut at 120 characters and the success note ate the room of a failure note); the pre-check failure text of the sets form is the shorter Get-PreCheckText (the old words stay byte for byte, the sets form keeps both counts inside 120 after "restart proven before this rep"); the set that passed is named in the calibrate entry ("ok (set light)", a `sets` line per set, the set of each probe in probeDetail); the two calibrate notes (chat: 3 pill probes + the Aa glyph; viewer only after the chat check) are added ONLY when the map holds sets and sit inside the 120-character alphabet of Get-SafeNote; the header help text says all of it — failing: ' + JSON.stringify(F(k5)));

  /* ── k6 · no new input ── */
  const newBody = NEW_FNS.map(fn).join('\n') + '\n' + tProbes + '\n' + tScreen;
  const shaFn = (n) => sha(lines(fn(n)).join('\n'));
  const k6 = {
    // ★ walktools2 re-base (2026-11-23): Test-ShellAllowed, Assert-AdbCommand and Get-LogPullCmd stay byte-identical to the base; Initialize-Allowlist = the base + exactly ONE statement, `$script:WatchEventsCmd,` (once): without that line its statements hash to the base value again (the exact string of the command is held by pins-walktools2/b-coldwatch k1)
    allowlistFrozen: Object.entries(ALLOWLIST_FN_SHA).every(([n, s]) => fn(n).length > 0 && (n === 'Initialize-Allowlist'
      ? (() => { const st = lines(fn(n)); return st.filter((l) => l === '$script:WatchEventsCmd,').length === 1 && sha(st.filter((l) => l !== '$script:WatchEventsCmd,').join('\n')) === s; })()
      : shaFn(n) === s)),
    newFunctionsSendNothing: NEW_FNS.every((n) => fn(n).length > 0) && !/Invoke-(Shell|ShellReq|Adb|CalInput|Back)|Assert-AdbCommand|Start-Process|adb\b/.test(newBody),
    noVerbWords: !/input text|input tap|input swipe|keyevent|pm clear|uninstall|reboot|rm -r|\bsu\b|am start|force-stop|settings put/i.test(newBody),
    noNewVerbInUsageBlock: !/Invoke-(Shell|Adb)/.test(blockText),
  };
  ok(F(k6).length === 0,
    '★ walktools B (k6 noNewInput): NO new adb command shape and no typed input (walktools2 re-base: Initialize-Allowlist = the base + the ONE PipedCmds line `$script:WatchEventsCmd,`) — Initialize-Allowlist, Test-ShellAllowed, Assert-AdbCommand and Get-LogPullCmd are byte-identical to the base (SHA-256 of their statements); the five new functions plus Test-Probes / Test-Screen send nothing (no Invoke-Shell / Invoke-Adb / Invoke-CalInput) and hold no verb word of the safety list; the load-time block sends nothing — failing: ' + JSON.stringify(F(k6)));

  /* ── k7 · the real map under the rules (re-implemented in JS) ── */
  const hexRe = js((/-cnotmatch '(\^#\[0-9A-Fa-f\]\{6\}\\z)'/.exec(listGap) || [])[1] || '(?!)');
  const nameRe = js((/\$sn -cnotmatch '([^']+)'/.exec(gap) || [])[1] || '(?!)');
  const isInt = (v) => typeof v === 'number' && Number.isInteger(v);
  const W = 1080, H = 2400;
  const listGap2 = (label, probes, min) => {
    if (!Array.isArray(probes) || probes.length === 0) return label + ' not calibrated (no probes)';
    let i = 0, ph = 0;
    for (const p of probes) {
      i++;
      if (!p || !isInt(p.x) || !isInt(p.y) || !isInt(p.tol) || typeof p.rgb !== 'string' || !hexRe.test(p.rgb)) return label + ' probe ' + i + ' is invalid';
      if (p.x < 0 || p.y < 0 || p.x > W - 1 || p.y > H - 1 || p.tol < 0 || p.tol > 255) return label + ' probe ' + i + ' is off the screen or tol is not 0..255';
      if (p.x === 0 && p.y === 0 && p.rgb === '#000000') ph++;
    }
    if (ph === probes.length) return label + ' not calibrated (placeholder probe)';
    if (!isInt(min) || min < 1 || min > probes.length) return label + '.minMatch is not 1..' + probes.length;
    return '';
  };
  const specGap = (name, scr) => {
    if (scr == null) return 'a52s.json has no screens.' + name;
    if (Object.prototype.hasOwnProperty.call(scr, 'sets')) {
      if (!['home', 'chat', 'viewer'].includes(name)) return 'may not use sets';   // ★ walktools2 re-base (2026-11-23): + home
      if ('probes' in scr || 'minMatch' in scr) return 'one form only';
      if (!Array.isArray(scr.sets)) return 'must be a list of 1 or 2 sets';   // null and an object: review round 1 NIT
      const sets = scr.sets;
      if (sets.length < 1 || sets.length > 2) return 'must be a list of 1 or 2 sets';
      const seen = new Set();
      for (const s of sets) {
        const sn = s && typeof s.name === 'string' ? s.name : '';
        if (!nameRe.test(sn)) return 'name is not light or dark';
        if (seen.has(sn)) return 'twice';
        seen.add(sn);
        const g = listGap2('screens.' + name + '.sets[' + sn + ']', s.probes, s.minMatch);
        if (g) return g;
      }
      return '';
    }
    return listGap2('screens.' + name, scr.probes, scr.minMatch);
  };
  let map = null; try { map = JSON.parse(raw('scripts/device/a52s.json')); } catch { map = null; }
  const screens = (map && map.screens) || {};
  const P = (x, y, rgb, tol) => ({ x, y, rgb, tol });
  const pill = [380, 560, 760];
  const chatL = { name: 'light', probes: pill.map((x) => P(x, 2278, '#FFFFFF', 2)), minMatch: 3 };
  const chatD = { name: 'dark', probes: pill.map((x) => P(x, 2278, '#1E2023', 2)), minMatch: 3 };
  const vpts = [[540, 2240], [380, 2278], [760, 2278], [600, 230]];
  const vset = (name, cols) => ({ name, probes: vpts.map(([x, y], i) => P(x, y, cols[i], 3)), minMatch: 4 });
  const viewL = vset('light', ['#646565', '#4F5050', '#4F5050', '#4C4E4F']);
  const viewD = vset('dark', ['#2F3031', '#131415', '#131415', '#111213']);
  const k7 = {
    parses: map !== null && map.schema === 1 && typeof screens === 'object',
    everyScreenValid: ['home', 'chat', 'chatinfo', 'viewer', 'accountScrolled', 'downloads'].every((n) => screens[n] === undefined || specGap(n, screens[n]) === ''),
    noSetsOutsideChatViewer: Object.entries(screens).every(([n, s]) => ['home', 'chat', 'viewer'].includes(n) || !('sets' in s)),   // ★ walktools2 re-base (2026-11-23): home, chat and viewer may hold sets (the key keeps its name)
    accountScrolledOldForm: screens.accountScrolled === undefined || ('probes' in screens.accountScrolled && !('sets' in screens.accountScrolled)),
    noBothForms: Object.values(screens).every((s) => !('sets' in s) || (!('probes' in s) && !('minMatch' in s))),
    proposedChatValid: specGap('chat', { sets: [chatL, chatD] }) === '' && specGap('chat', { sets: [chatL] }) === '',
    proposedViewerValid: specGap('viewer', { sets: [viewL, viewD] }) === '',
    rejectBoth: specGap('chat', { sets: [chatL], probes: chatL.probes }) !== '' && specGap('chat', { sets: [chatL], minMatch: 3 }) !== '',
    rejectName: specGap('chat', { sets: [{ ...chatL, name: 'sepia' }] }) !== '' && specGap('chat', { sets: [{ ...chatL, name: 'Light' }] }) !== '' && specGap('chat', { sets: [{ probes: chatL.probes, minMatch: 3 }] }) !== '',
    rejectDuplicate: specGap('chat', { sets: [chatL, { ...chatL }] }) !== '',
    rejectFive: specGap('chat', { sets: [chatL, chatD, chatL] }) !== '' && specGap('chat', { sets: [] }) !== '',
    rejectNullObject: specGap('chat', { sets: null }) === 'must be a list of 1 or 2 sets' && specGap('viewer', { sets: chatL }) === 'must be a list of 1 or 2 sets' && specGap('chat', { sets: 'light' }) === 'must be a list of 1 or 2 sets',
    // ★ walktools2 re-base (2026-11-23): home is no longer an `other screen` (the three left still are); the home sets are accepted by the line below
    acceptHomeSets: specGap('home', { sets: [chatL, chatD] }) === '',
    rejectOtherScreen: ['chatinfo', 'accountScrolled', 'downloads'].every((n) => specGap(n, { sets: [chatL] }) === 'may not use sets'),
    rejectBadSet: specGap('chat', { sets: [{ ...chatL, minMatch: 4 }] }) === 'screens.chat.sets[light].minMatch is not 1..3' && specGap('chat', { sets: [{ ...chatL, probes: [P(5000, 1, '#FFFFFF', 2)] }] }).includes('off the screen'),
    oldFormTexts: specGap('chat', { probes: [P(1, 1, 'red', 2)], minMatch: 1 }) === 'screens.chat probe 1 is invalid' && specGap('chat', { probes: [P(1, 1, '#FFFFFF', 2)], minMatch: 2 }) === 'screens.chat.minMatch is not 1..1',
  };
  ok(F(k7).length === 0,
    '★ walktools B (k7 realMap): scripts/device/a52s.json parses and every screen in it is valid under the rules of Get-ScreenGap (re-implemented in JavaScript with the hex and name regexes cut out of the script text); only home, chat and viewer may hold sets (walktools2 re-base), accountScrolled stays in the old form, no screen holds both forms; the proposed chat / viewer sets of the mechanisms doc are valid; both forms, an unknown / wrong-case / missing / duplicate name, 5 and 0 sets, sets on any other screen and a bad set are all rejected with the old and the new texts — the VALUES of the map are NOT pinned (the operator block fills them) — failing: ' + JSON.stringify(F(k7)));

  /* ── k8 · each new function once ── */
  const defs = (n) => (D.match(new RegExp('^function ' + n.replace(/-/g, '\\-') + '\\b', 'gmi')) || []).length;
  const k8 = Object.fromEntries(NEW_FNS.concat(['Get-ScreenGap', 'Test-Probes', 'Test-Screen']).map((n) => [n + ' once', defs(n) === 1]));
  ok(F(k8).length === 0,
    '★ walktools B (k8 definitions): Test-HasField, Get-ProbeListGap, Get-ScreenProbeSets, Test-ProbeSetPixels, Get-ProbeVerdict, Get-ScreenGap, Test-Probes and Test-Screen are each defined exactly ONCE (a later definition of the same name, names ignore case, would replace the one the other keys read) — failing: ' + JSON.stringify(F(k8)));
}
