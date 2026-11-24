/* ==== fixb3 · C — the walk side: item 3 (`downloads` gets a scroll step) and item 4 (`-HistorySeed <k>` for the step `history`) of
 * scripts/device/adb-walk.ps1 and scripts/device/adb-walk-parse.ps1 (contract docs/contract-fixb3.md § 3.3, mechanisms § 3 + § 4).
 *
 * LIMITS (#1735, stated in the first version). Pure node: CI has no PowerShell step, so every key is a SOURCE pin on the two scripts
 * (the exact statement sequences, comments and blank lines dropped) plus the BEHAVIOUR of the pieces that can be run in JavaScript
 * (the regexes extracted from the script text, PowerShell `\A` -> `^`, `\z` -> `$`; the swipe numbers; the gap order). A statement
 * pin does NOT prove that PowerShell runs the statements in that order, and nothing here ran on Windows PowerShell 5.1 or on a phone.
 * The builder ran no fake-adb dry run (no PowerShell 7 on the build host: NuGet was unreachable and a binary download was refused),
 * so the order / behaviour keys d1 d3 h2 h3 are statement-order pins only. The dry-run helper is therefore NOT part of this batch.
 * What stays UNCAUGHT even with n1 and m1 (review round 1 m1, round 2 m1: m1 holds every ADDED single line of an old function by its exact text, count and
 * the two neighbouring statements, and the -HistorySeed usage block, the parser legend block and the HistorySeedDefs table whole by SHA-256; what m1
 * does NOT catch: a change inside an OLD line that the batch did not touch is o1's job (statements), a line moved
 * between two places with the same neighbouring statements, and anything that depends on running PowerShell). Review round 3 (n1) corrected this text: a
 * trailing comment on a statement line and the spaces INSIDE a line ARE caught (a line is compared as its trimmed text: code() drops only whole-line
 * comments, <# #> blocks and blank lines, and the indentation is trimmed), so such an edit turns the key red; what is NOT code and so NOT caught is a
 * whole-line comment, a blank line and the indentation (they cannot change what PowerShell runs). Not caught: a change to a helper the new functions CALL (only Invoke-FileShot, Invoke-FileReset and the
 * four allowlist functions are held by hash; the other helpers are held as old statements by o1, which proves them unchanged, not correct); a
 * redefinition of a variable or function name elsewhere (names ignore case); whether PowerShell parses and runs the statements as the text reads
 * (no PowerShell here; the tree-sitter parse check finds gross syntax only); everything on Windows PowerShell 5.1 and on the phone. n1 names the
 * function that moved; a deliberate edit of a new function re-bases its hash after a look at the diff.
 *   d1 downloadsOrder  — the rep: ... the Account tab's gates -> a focus check -> ONE swipe swipes.accountDownloads -> scrollSettleMs -> the
 *                        check `accountScrolled` (a failure throws before any further input) -> logcat -c -> focus check -> stamp + the
 *                        ONE tap accountDownloads; swipe and tap are inside the try (a failure = the proven restart)
 *   d2 fourKeys        — Get-StepGap 'downloads' names the four keys (the old seven in their old order, the two new appended); one of the
 *                        four absent = a gap, read in Invoke-Step before any input
 *   d3 calibrate       — (round 3 n3: a swipes.accountDownloads that is PRESENT but invalid adds its gap text to the swipe note) cal-17s (after the swipe): kept ONLY while screens.accountScrolled is not set (review round 1 M1: a pass deletes it
 *                        first of all, `confirmed, not kept`; a fail deletes it); the tap and cal-17 only when the check passes AND
 *                        taps.accountDownloads is set; the way back without the tap; the fixed default swipe is valid
 *   d4 pngDeleted      — the check goes through Invoke-FileShot (PNG deleted in a finally, never recorded in the rep); the sweep pattern
 *                        matches its names (and the reset PNG of history-seed), no kept name; round 2: Invoke-HistorySeedStep ends with
 *                        Clear-FileStepPngs (NIT 5), and Clear-FileStepPngs ends with Clear-CalAccountPng, which deletes cal-17s-account-scrolled.png
 *                        when screens.accountScrolled is set and keeps it while the key is absent (m2 b)
 *   h1 usage           — -HistorySeed: [string[]], ONE number 0..55; usage errors before any adb command (-Flags, -Calibrate, no history in
 *                        -Steps, 56, -1, "5,6", text)
 *   h2 address         — the address is Get-DevSeedAddress k (derived, masked), one proven restart per rep before the intent
 *   h3 onePage         — the swipes stop at ONE counted page request or historyMaxSwipes; zero = a note, and run.json carries `pages` = the integer count (the parser: no data unless pages >= 1)
 *   h4 parserRows      — history-seed-kNN: the rows of history (page rows for the FIRST page), its name routes, run.json historySeed
 *   h4c zeroPages      — review round 1 m3 + round 3 m1: EVERY row of history-seed-kNN is "no data" unless the rep's `pages` (run.json) is a whole number >= 1
 *                        (the gate X-SeedPagesGate: the two page rows through X-SeedPage, the six others through X-SeedGated)
 *   d3 (round 2, m2 a) finallyDeletes — the checks of cal-17s run in a try whose finally deletes the picture whenever the key is set and a Path is left
 *   d5 (round 2) limitStated + invalidKeyUsage — the one-row-offset limit and the advice (one probe on a feature that does not repeat: text only, not enforced) in the
 *                        two headers and the calibrate note; a PRESENT but invalid screens.accountScrolled is a load-time usage error (only an ABSENT key keeps cal-17s)
 *   h4d firstPage      — REWRITTEN walktools (item 3, contract I-3a; the rule of review round 2 NIT 2 is gone): first swipe -> 1st page of history-seed-kNN = (1) the first `chat load` at or after the first
 *                        `[P1] chat loadmore in` line (C#), when that line is in the window (none after it = no data, no fall-through); else (2) the first `chat load` of the window when a `[P1] shell send loadmore`
 *                        line is there AND the number of `chat load` lines equals the number of send lines (unequal = no data, "cannot pair"; no load = no data) (its stamp is not an order); else (3) no data
 *   m1 addedLines      — review round 2 m1: the added single lines and blocks held by their exact text / SHA-256 (see above)
 *   (d2 realFileGap and d5 realFileInert read the REAL scripts/device/a52s.json: when the operator block commits the hub keys to it they turn red BY DESIGN —
 *    re-base them after the map commit, the same tripwire as filewalk b6, #1674; review round 3 n2)
 *   d5 hubProbes       — review round 1 m4: load-time refusal when both accountScrolled and taps.accountDownloads are set and the probes
 *                        do not pin the scroll position (minMatch < probes, or no probe within 60 px in y of the tap)
 *   n1 newBodies       — review round 1 m1: each new function (6 driver, 6 parser) frozen by SHA-256 of its statement list, one definition
 *   o1 oldStatements   — the statements of both scripts minus exactly the statements of this batch hash to the base (the c8 method of photo1a)
 *   o2 logRe           — $script:LogRe byte-identical to the base
 *   o3 allowlist       — no new adb command shape: the allowlist functions are byte-identical; every command the new code sends passes it
 * 2026-11-22 (walktools, re-base pass; after a look at the diff, #1596 / #1634): the walk scripts changed in items 2 (probe `sets`, adb-walk.ps1) and 3 (per-page rows + the first-page rule, adb-walk-parse.ps1): d4 (BASE_FN_SHA Invoke-FileShot), h4d REWRITTEN to the
 *   I-3a rule, h4 / h4c (the table cuts end at the new closings; X-SeedPagesGate 3 -> 4 references), m1 (legend hash; defsClosing added), n1 (X-SeedFirstPage), o1 (both statement hashes); the exported cutParen takes the closing, stripText cuts the HistorySeedDefs table at its own closing.
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
const fnPS = (t, name) => { const m = new RegExp('^function ' + name.replace(/-/g, '\\-') + '\\b', 'm').exec(t); return m ? (psMatch(t, m.index) || '') : ''; };
const fnWhole = (t, name) => { const m = new RegExp('^function ' + name.replace(/-/g, '\\-') + '\\b', 'm').exec(t); if (!m) return ''; const b = psMatch(t, m.index); return b ? t.slice(m.index, t.indexOf(b, m.index) + b.length) : ''; };
const lines = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean);
const js = (re) => new RegExp(re.replace(/\\A/g, '^').replace(/\\z/g, '$'));
const psList = (t, lhs) => { const i = t.indexOf(lhs); if (i < 0) return null; const o = t.indexOf('@(', i); const e = t.indexOf(')', o); return (o < 0 || e < 0) ? null : [...t.slice(o, e).matchAll(/'([^']*)'/g)].map((m) => m[1]); };
const fnStm = (t, n) => lines(fnPS(t, n));
const cutBlock = (t, start) => { const i = t.indexOf(start); if (i < 0) return t + '\n#MISSING ' + start; const b = psMatch(t, i); return b ? t.slice(0, i) + t.slice(t.indexOf(b, i) + b.length) : t; };
// re-based walktools (item 3): the table closing is now `) + $script:HistorySeedPageDefs` (the page rows are appended), so the closing is a parameter: the cut ends at
// the closing line that is really the table's own (the first one after `start`); a closing that is not found is #MISSING, never "cut nothing" / "cut to the next table".
const cutParen = (t, start, close = '\n)\n') => { const i = t.indexOf(start); if (i < 0) return t + '\n#MISSING ' + start; const e = t.indexOf(close, i); return e < 0 ? t + '\n#MISSING closing ' + JSON.stringify(close) : t.slice(0, i) + t.slice(e + close.length); };
export const SEED_DEFS_CLOSE = '\n) + $script:HistorySeedPageDefs\n';   // walktools (item 3): the closing line of $script:HistorySeedDefs (the old closing was `)`)
export const HIST_DEFS_CLOSE = ') + $script:HistoryPageDefs }';          // walktools (item 3): the closing of the `history` entry of the step table (the old closing was `) }`)
const hit = (l, a) => (a instanceof RegExp ? a.test(l) : l.startsWith(a));

// ── what this batch ADDED (removed before hashing) and the two lines it CHANGED (put back to the base form) ──
export const NEW_DRV_FNS = ['Invoke-HistorySeedStep', 'Invoke-HistorySeedRestart', 'Invoke-HistorySeedRep', 'Invoke-CalAccountScroll', 'Invoke-CalHubBack', 'Clear-CalAccountPng'];
export const DRV_BLOCKS = ["if ($PSBoundParameters.ContainsKey('HistorySeed')) {", "if (-not (Get-ScreenGap 'accountScrolled') -and -not (Get-TapGap 'accountDownloads')) {"];   // the -HistorySeed usage block; the load-time refusal of a weak accountScrolled (review round 1 m4)
export const ADDED_DRV = [   // single driver lines (found by their start, so a mutated added line is still removed: o1 is about the OLD statements)
  '[string[]]$HistorySeed',
  '$script:HistSeedIdx = -1',
  "$script:HistorySeedStep = ''",
  "$script:CalHubSwipe = ",
  '$script:CalHubReady = $false',
  "if ($Step -eq 'downloads') { $need = @($need)",
  "if ($Step -cmatch '\\Ahistory-seed-k",
  "if ($script:HistSeedIdx -ge 0) { $doc['historySeed']",
  "if ($Rec.ContainsKey('pages')) { $out['pages']",   // review round 1 m3: the page count of a history-seed rep reaches run.json
  "elseif ($s -cmatch '\\Ahistory-seed-k",
  "elseif ($s -eq 'history' -and $script:HistSeedIdx -ge 0) { $sum",
  "elseif ($s -eq 'history' -and $script:HistSeedIdx -ge 0) { Invoke-HistorySeedStep }",
  'elseif (-not (Invoke-CalAccountScroll $Cal))',
  'elseif (-not $script:CalHubReady)',
  "if (@(Get-Field (Get-Field (Get-Field $script:Cfg 'screens') 'accountScrolled')",
  "if ($null -ne (Get-Field (Get-Field $script:Cfg 'screens') 'accountScrolled')",   // review round 2 m2: a present but invalid key is a usage error
  'Clear-CalAccountPng',   // review round 2 m2: the call at the end of Clear-FileStepPngs
];
const backDrv = (l) => {
  if (l.trim() === '[string[]]$SeedIndex,') return '[string[]]$SeedIndex';   // review round 1 n5: -HistorySeed is the LAST parameter, so the SeedIndex line carries a comma now
  if (l.trim().startsWith("elseif ($s -eq 'downloads') { $sum += $n * ((3 * $t['scrollSettleMs'] + 3 * $t['tabSettleMs']) / 1000 + 19) }")) return l.replace("(3 * $t['scrollSettleMs'] + 3 * $t['tabSettleMs']) / 1000 + 19)", "(2 * $t['scrollSettleMs'] + 3 * $t['tabSettleMs']) / 1000 + 16)");   // review round 1 n2: the swipe + settle + check (~3 s) in the estimate
  if (l.trim().startsWith("foreach ($tn in @('tabAccount', 'tabChats'))")) return l.replace("'tabAccount', 'tabChats'", "'tabAccount', 'accountDownloads', 'tabChats'");
  if (l.includes("-cmatch '^cal-reset-[0-9]{2,4}\\.png\\z' -or $f.Name -cmatch '^shot-history-seed-k")) return l.replace(/ -or \$f\.Name -cmatch '\^shot-history-seed-k[^']*'/, '');
  return l;
};
export const NEW_PAR_FNS = ['Test-HistorySeedName', 'Get-HistorySeedIndex', 'X-SeedPagesGate', 'X-SeedPage', 'X-SeedGated', 'X-SeedFirstPage'];   // round 3 (m1): the gate + the wrapper of the other rows
export const ADDED_PAR = [
  'SendLoadMore = @{',   // review round 2 NIT 2: the line def of `[P1] shell send loadmore`
  'if (Test-HistorySeedName $Name) { return $Name }',
  "$alt = $alt + '|history-seed-k",
  'if (Test-HistorySeedName $k) { return @{',
  '$histSeedK = Get-HistorySeedIndex $m',
  "if (($histSeedK -ge 0) -and $steps.Contains('history'))",
  'Pages = $null',   // review round 1 m3: the page count of a rep in the context, read from run.json
  "$pg = Get-Num (Get-Prop $Entry 'pages')",
  'if (($null -ne $pg) -and (($pg -gt 1000)',
  '$c.Pages = $pg',
];
export const PAR_BLOCKS = ['if ($histSeedK -ge 0) {'];

// The text of both scripts WITHOUT this batch: its added parts removed, its two changed lines put back to the base form. Indentation and
// everything else of the old statements is kept (comments are dropped by code()), so an OLDER pin (photo1a c8) can run its own removal on it.
export function stripText(drv, par) {
  let d = code(drv);
  for (const n of NEW_DRV_FNS) { const w = fnWhole(d, n); d = w ? d.replace(w, '') : d + '\n#MISSING ' + n; }
  for (const b of DRV_BLOCKS) d = cutBlock(d, b);
  // the inserted block of Invoke-DownloadsRep: everything between the `settings` gate and `logcat -c` (the anchors are OLD statements)
  const DL = fnWhole(d, 'Invoke-DownloadsRep');
  const a1 = DL.indexOf("if (-not (Wait-LogCount 'settings' $to)) { throw 'ADBWALK-REP: the account settings page did not show (no frames line): no further input' }\n");
  const a1e = a1 < 0 ? -1 : a1 + DL.slice(a1).indexOf('\n') + 1;
  const a2 = DL.indexOf("[void](Invoke-ShellReq 'logcat -c')\n        Assert-AppFront\n        $r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'accountDownloads'))");
  d = (a1 < 0 || a2 < a1e) ? d + '\n#MISSING downloads block' : d.replace(DL, DL.slice(0, a1e) + DL.slice(a2));
  const dl = d.split('\n');
  for (const a of ADDED_DRV) { const j = dl.findIndex((l) => hit(l.trim(), a)); if (j >= 0) dl.splice(j, 1); else dl.push('#MISSING ' + a); }
  let p = code(par);
  for (const n of NEW_PAR_FNS) { const w = fnWhole(p, n); p = w ? p.replace(w, '') : p + '\n#MISSING ' + n; }
  for (const b of PAR_BLOCKS) p = cutBlock(p, b);
  p = cutParen(p, '$script:HistorySeedDefs = @(', SEED_DEFS_CLOSE);
  const pl = p.split('\n');
  for (const a of ADDED_PAR) { const j = pl.findIndex((l) => hit(l.trim(), a)); if (j >= 0) pl.splice(j, 1); else pl.push('#MISSING ' + a); }
  return { drv: dl.map(backDrv).join('\n'), par: pl.join('\n') };
}
// What o1 hashes leaves out the pieces that o2 / o3 (and h2 / d4) freeze separately and exactly (the log filter and the four allowlist
// functions), so that a break of one of those turns ONLY its own key red.
export const O1_EXCLUDED_FNS = ['Initialize-Allowlist', 'Test-ShellAllowed', 'Assert-AdbCommand', 'Get-LogPullCmd'];
export const exclView = (dText) => { let d = dText; for (const n of O1_EXCLUDED_FNS) { const w = fnWhole(d, n); d = w ? d.replace(w, '') : d + '\n#MISSING ' + n; } return lines(d).filter((l) => !l.startsWith('$script:LogRe = ')); };
export function oldView(drv, par) { const t = stripText(drv, par); return { drv: exclView(t.drv), par: lines(t.par) }; }

// ── the frozen base values: SHA-256 of the statements of the BASE scripts (work/fixb3 @ 14ae57f2: comments and blank lines dropped) ──
// re-based walktools (items 2 + 3; after a look at the diff, #1596 / #1634). The view of the BASE scripts (338d30f4) with the previous code of this pin still gives a5d38ee1... / 6278daa7... (checked);
// the new values are the view of the merged tree = base + exactly the statements of walktools: driver (item 2) Test-HasField, Get-ProbeListGap (the old Get-ScreenGap checks, the same texts, with a label),
// Get-ScreenGap (the `sets` branch), Get-ScreenProbeSets, Test-ProbeSetPixels, Get-ProbeVerdict, Test-Probes, the Test-Screen return, Get-PreCheckText, the calibrate lines (no `check: set` note lines: removed in review round 1), the load block;
// parser (item 3) five $script:L line defs, Get-WordTok, X-PageGate / X-PageTok / X-PagePush / X-Page, $script:PageRows, New-PageDefs + the two page-def tables, New-Def `$Arg`, the `history` table closing
// `) + $script:HistoryPageDefs }`, Get-DataRow `& $Def.Extract $c $Def.Arg` + the insertmode note, the page legend line. (X-SeedFirstPage, the seed legend and HistorySeedDefs are cut by stripText: n1 / m1 hold them.)
// driver a5d38ee1c0d1... -> e14bc9974205... (round 1: dfa45ee27fc4...; round 2: `1 or 2 sets`, compact counts, Get-PreCheckText strips `no set matches: `); parser 6278daa717a5... -> c253da66335a... (review round 1 of walktools: + Get-PreCheckText, `sets must be a list`, compact failure note, Get-NoPair, the count guards of X-PageTok / X-PagePush; Invoke-FileShot / Invoke-ShotCheck are pre-batch text again)
// ★ walktools2 re-base (2026-11-23; after a look at the diff, #1596 / #1634): the view of the merged tree = the walktools value + exactly the statements of walktools2 — driver: coldstart-watch at the end of AllSteps / OptInSteps (two lines),
// $script:WatchWaitSec / WatchEventRe / WatchEventsCmd, Save-WatchPull, Save-WatchEvidence, Invoke-ColdWatchRep, the run.json / Complete-Rep / Invoke-RepBody / Get-EstimateSec / Invoke-Walk lines of the step, the usage refusals (-Calibrate, -Flags), the home `sets` lines (Get-ScreenGap, the load block, the calibrate note);
// parser: only ADDED statements (the StepTable entry, the Watch* regexes and helpers, Get-WatchRep, Get-WatchRows, the Invoke-Main branch, the facts block, the legend line, the events file line); no statement of the walktools view was removed or changed except the five lines above (the two list lines and the two `sets` rules).
// ★ walktools2 re-base, #46 round 1: only coldstart-watch statements changed; driver 1c137bf8... -> 7c649eaa..., parser 3e41f3db... -> 7ffb0711...
// driver e14bc9974205... -> 1c137bf8a027...; parser c253da66335a... -> 3e41f3db4310...  (the view of the base scripts 462ba3e4 with this pin's code still gives e14bc997... / c253da66..., checked)
const BASE_DRV_VIEW_SHA = '7c649eaad0758e78a3c07f4ae54e791ef7f0d010c175f4dd08bb5db0e4486aad';
const BASE_PAR_VIEW_SHA = '7ffb0711d4c9c10fc77514693bc9c300fd547e9b04b1eeaea6660285dfbda4a7';
const BASE_DEVADDR_SHA = '62dc3e08437c570d9f286f89de3f4e8399c650650981945999b51a6d46b8a00e';
// re-based walktools (item 3): `legend` d910369342b7... -> 7b9085e25805... (review round 1: + the equal-counts clause of branch 2) — the history-seed-kNN legend line of Invoke-Main states the NEW first-page rule (C# `chat loadmore in` pair, else the first chat load of the window when a send line is there, else no data)
// instead of "after the first shell send loadmore line"; the rest of the line (pages gate, the rows of history) is the same text. `defs` is unchanged (165d5f38...): the cut now ends at the table's new closing (see defsBlock), the closing is held by defsClosing.
const HELD_BLOCKS = { usage: '3179a74a115e7f90fd751db739449a626cefc0ffd0b4bb68eb8abb71aa7a5557', legend: '7b9085e25805ec7bb636942fa42b235fdb45257488dbe08d556741041c8f22ba', defs: '165d5f386cfadad852f8da6c500ec5fd858c8e875f12509a6b551cb6724dcac8' };   // m1: SHA-256 of the statements of the added blocks (round 2)
const BASE_LOGRE_SHA = 'a22d2dbaa96566788330114cca740fed5851d4ba7dafe55b115fea6195bfde3b';
// walktools (item 2): Invoke-FileShot is byte-identical to its pre-batch text again (review round 1: the success note was dropped), so its value is the ORIGINAL base value d83c6fa80965 (an interim re-base to e36ce6b8c6c3 was undone).
const BASE_FN_SHA = { 'Initialize-Allowlist': 'b083355a9f0ab001d9766e4096b381e8c7237e2e58c1796f2bb8f327c10026ab', 'Test-ShellAllowed': '1645be543b1068a00d68c9ad40ca27a9ea225a66684e84b687764f21f22f58f5', 'Assert-AdbCommand': '6907f808b2b25b6d46feb2973ad67a10649c48b724df88a17ebb69cf548e3ca6', 'Get-LogPullCmd': '11401bdd230fe9d0245955048f6d99162e4a75fb17b2646b4f8d89fb7dcc56e1', 'Invoke-FileShot': 'd83c6fa809657089c4cc0891fba848ba7a1723d272fd7bea907a3ddaf27a15a9', 'Invoke-FileReset': '19fbc7f9194ae92b1a852445769781b5c83db461f803130a840c4fd767ec0e1c' };
const fnSha = (t, n) => sha(fnStm(code(t), n).join('\n'));
export const _h = { sha, code, lines, fnPS, fnStm, fnSha };

export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/\r\n/g, '\n');
  const DRV = raw('scripts/device/adb-walk.ps1');
  const PAR = raw('scripts/device/adb-walk-parse.ps1');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const D = code(DRV), P = code(PAR);
  const fnD = (n) => fnPS(D, n);
  const fnP = (n) => fnPS(P, n);
  const stm = (body) => lines(body);
  const idx = (arr, pred) => arr.findIndex(pred);

  /* ── d1 · the downloads rep: swipe -> check -> tap ── */
  const dlFn = fnD('Invoke-DownloadsRep');
  const dl = stm(dlFn);
  const SETTINGS = "if (-not (Wait-LogCount 'settings' $to)) { throw 'ADBWALK-REP: the account settings page did not show (no frames line): no further input' }";
  const SWIPE = "[void](Invoke-ShellReq (Get-SwipeText 'accountDownloads'))";
  const SETTLE = "Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'";
  const CHECK = "if (-not (Invoke-FileShot $Rec 'accountScrolled' ('shot-' + $Rec.step + '-' + (Get-Nn $Rec.rep) + '-scrolled.png'))) { throw 'ADBWALK-NOSCREEN: the scrolled Account hub check failed: no tap' }";
  const TAP = "$r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'accountDownloads'))";
  const iSet = dl.indexOf(SETTINGS), iTry = dl.indexOf('try {'), iCatch = dl.indexOf('} catch {');
  const iSwipe = dl.indexOf(SWIPE), iCheck = dl.indexOf(CHECK), iTap = dl.indexOf(TAP), iTab = dl.indexOf("[void](Invoke-ShellReq (Get-TapText 'tabAccount'))");
  const d1 = {
    found: dl.length > 0 && iSet > 0,
    sequence: iSet > 0 && dl[iSet + 1] === 'Assert-AppFront' && dl[iSet + 2] === SWIPE && dl[iSet + 3] === SETTLE && dl[iSet + 4] === CHECK
      && dl[iSet + 5] === "[void](Invoke-ShellReq 'logcat -c')" && dl[iSet + 6] === 'Assert-AppFront' && dl[iSet + 7] === TAP,
    oneSwipe: count(dlFn, "Get-SwipeText 'accountDownloads'") === 1 && count(dlFn, 'Get-SwipeText') === 3,   // + the two old chatNewer / chatOlder
    oneTap: count(dlFn, "Get-TapText 'accountDownloads'") === 1 && count(dlFn, 'Invoke-FileShot ') === 1,
    insideTry: iTab > iTry && iTry > 0 && iSwipe > iTab && iCheck > iSwipe && iTap > iCheck && iTap < iCatch,
    checkThrowsBeforeTap: iCheck > 0 && dl[iCheck].endsWith("{ throw 'ADBWALK-NOSCREEN: the scrolled Account hub check failed: no tap' }") && !dl.slice(iCheck + 1, iTap).some((l) => /Invoke-ShellReq \(Get-TapText/.test(l)),
    inputsBeforeCheck: dl.slice(iTry, iCheck).filter((l) => /Invoke-ShellReq|Invoke-Shell\b|Invoke-BackReq|Get-TapText|Get-SwipeText/.test(l)).join('|') === ["[void](Invoke-ShellReq (Get-TapText 'tabAccount'))", SWIPE].join('|'),
    catchRestarts: dl.slice(iCatch).join('\n') === ['} catch {', "if (-not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:')) { [void](Invoke-FileReset $Rec 'downloads: a failed rep after the Account tap') }", 'throw', '}', '}'].join('\n'),
    focusBeforeSwipe: dl[iSet + 1] === 'Assert-AppFront',
    walkRoutes: D.includes("elseif ($s -eq 'downloads') { Invoke-DownloadsRep $Rec }"),
    estimate: stm(fnD('Get-EstimateSec')).includes("elseif ($s -eq 'downloads') { $sum += $n * ((3 * $t['scrollSettleMs'] + 3 * $t['tabSettleMs']) / 1000 + 19) }"),   // review round 1 n2: the swipe + settle + check (~3 s) are in the estimate
  };
  ok(F(d1).length === 0,
    '★ fixb3 walk (d1 downloadsOrder): in the downloads rep, inside the try (a failure = Invoke-FileReset, the proven restart), the order after the Account tab gates is: focus check -> ONE swipe swipes.accountDownloads -> scrollSettleMs -> the screen check accountScrolled whose failure THROWS (no tap command can follow) -> logcat -c -> focus check -> the ONE tap accountDownloads (stamp = t0); the only inputs before the check are the tabAccount tap and the swipe — failing: ' + JSON.stringify(F(d1)));

  /* ── d2 · the four keys gate the step ── */
  const gapFn = stm(fnD('Get-StepGap'));
  const dlNeedLine = gapFn.find((l) => l.startsWith("elseif ($Step -eq 'downloads') { $need = ")) || '';
  const oldNeed = [...dlNeedLine.matchAll(/'([a-zA-Z]+:[A-Za-z]*)'/g)].map((m) => m[1]);
  const addLine = gapFn.find((l) => l.startsWith("if ($Step -eq 'downloads') { $need = @($need)")) || '';
  const addNeed = [...addLine.matchAll(/'([a-zA-Z]+:[A-Za-z]*)'/g)].map((m) => m[1]);
  const need = oldNeed.concat(addNeed);
  // a node mirror of the gap loop: the first key that is absent names the gap (the message texts are read from the script)
  const MSG = { tap: (n) => 'a52s.json has no taps.' + n, swipe: (n) => 'a52s.json has no swipes.' + n, screen: (n) => 'a52s.json has no screens.' + n };
  const gapOf = (cfg) => { for (const n of need) { const [k, name] = n.split(':'); const grp = { tap: 'taps', swipe: 'swipes', screen: 'screens' }[k]; if (grp && !(cfg[grp] && cfg[grp][name])) return MSG[k](name); } return ''; };
  const full = { taps: { tabAccount: 1, accountDownloads: 1, tabChats: 1 }, swipes: { chatOlder: 1, chatNewer: 1, accountDownloads: 1 }, screens: { home: 1, downloads: 1, accountScrolled: 1 } };
  const without = (g, k) => { const c = JSON.parse(JSON.stringify(full)); delete c[g][k]; return c; };
  const stepFn = stm(fnD('Invoke-Step'));
  const iGap = stepFn.indexOf('$gap = Get-StepGap $Step'), iSkip = stepFn.indexOf('elseif ($gap) { $skip = $gap }'), iBody = stepFn.indexOf('Invoke-RepBody $rec');
  const d2 = {
    found: dlNeedLine.length > 0 && addLine.length > 0,
    oldSevenKept: oldNeed.join() === 'tap:tabAccount,tap:accountDownloads,tap:tabChats,swipe:chatOlder,swipe:chatNewer,screen:home,screen:downloads',
    twoAppended: addNeed.join() === 'swipe:accountDownloads,screen:accountScrolled' && gapFn.indexOf(addLine) > gapFn.indexOf(dlNeedLine) && gapFn.indexOf(addLine) < gapFn.findIndex((l) => l.startsWith('foreach ($n in $need) {')),
    allFour: ['swipe:accountDownloads', 'screen:accountScrolled', 'tap:accountDownloads', 'screen:downloads'].every((k) => need.includes(k)),
    fullMapNoGap: gapOf(full) === '',
    eachOneAbsent: gapOf(without('swipes', 'accountDownloads')) === 'a52s.json has no swipes.accountDownloads' && gapOf(without('screens', 'accountScrolled')) === 'a52s.json has no screens.accountScrolled'
      && gapOf(without('taps', 'accountDownloads')) === 'a52s.json has no taps.accountDownloads' && gapOf(without('screens', 'downloads')) === 'a52s.json has no screens.downloads',
    // review round 3 (n2): reads the REAL map: red BY DESIGN once the operator block commits taps.accountDownloads to a52s.json; re-base after the map commit (as filewalk b6, #1674)
    realFileGap: (() => { try { const A = JSON.parse(readFileSync(join(root, 'scripts/device/a52s.json'), 'utf8')); return gapOf(A) === ''; } catch { return false; } })(),   // re-based after the map commits of 2026-11-22 (three hub keys, then screens.downloads from the proof calibrate): no gap
    gapBeforeInput: iGap >= 0 && iSkip > iGap && iBody > iSkip && stepFn.slice(0, iBody).filter((l) => /Invoke-Shell|Invoke-Adb/.test(l)).length === 0,
    gapWalkStep: D.includes('$gap = Get-StepGap $Step') && fnD('Get-StepGap').includes("if ($gap) { return $gap }"),
  };
  ok(F(d2).length === 0,
    '★ fixb3 walk (d2 fourKeys): Get-StepGap `downloads` needs the old seven keys in their old order and, appended, swipe:accountDownloads and screen:accountScrolled — so all four of swipes.accountDownloads, screens.accountScrolled, taps.accountDownloads, screens.downloads are needed; any ONE absent names that key (a node mirror of the loop over the extracted list), the real a52s.json (none of the four) gives the old first gap — realFileGap reads the REAL a52s.json and turns red BY DESIGN when the operator block commits the hub keys to it: re-base it after the map commit (the same tripwire as filewalk b6, #1674); Invoke-Step reads the gap before Invoke-RepBody and sends nothing for a gap — failing: ' + JSON.stringify(F(d2)));

  /* ── d3 · -Calibrate ── */
  const scrollFn = stm(fnD('Invoke-CalAccountScroll'));
  const backFn = stm(fnD('Invoke-CalHubBack'));
  const calFn = stm(fnD('Invoke-CalFileTaps'));
  const iCalTab = calFn.indexOf("$r = Invoke-Shell (Get-TapText 'tabAccount')");
  const iScr = calFn.findIndex((l) => l.startsWith('elseif (-not (Invoke-CalAccountScroll $Cal))'));
  const iRdy = calFn.findIndex((l) => l.startsWith('elseif (-not $script:CalHubReady)'));
  const iCalTap = calFn.findIndex((l) => l.includes("(Get-TapText 'accountDownloads') 'cal-17 accountDownloads'"));
  const iSet17 = calFn.indexOf("elseif (-not (Wait-LogCount 'settings' $to $bs)) { $why = 'no SettingsPage frames line' }");
  const swDef = (/\$script:CalHubSwipe = 'input swipe (\d+) (\d+) (\d+) (\d+) (\d+)'/.exec(D) || []).slice(1).map(Number);
  const allowSw = (/'\^input swipe ([^']*)'/.exec(fnD('Initialize-Allowlist')) || [])[1] || '';
  const swJs = allowSw ? new RegExp('^input swipe ' + allowSw.replace(/\\z$/, '') + '$') : /(?!)/;
  const [sx1, sy1, sx2, sy2, sms] = swDef;
  const rdyAt = scrollFn.map((l, i) => (l.includes('$script:CalHubReady = $true') ? i : -1)).filter((i) => i >= 0);
  const d3 = {
    found: scrollFn.length > 0 && backFn.length > 0 && calFn.length > 0,
    noTapKeyNotNeeded: calFn.includes("foreach ($tn in @('tabAccount', 'tabChats')) { if (-not $gapDl) { $gapDl = Get-TapGap $tn } }"),
    chainOrder: iCalTab > 0 && iSet17 > iCalTab && iScr === iSet17 + 1 && iRdy === iScr + 1 && iCalTap === iRdy + 1,
    oneAccountTap: count(fnD('Invoke-CalFileTaps'), "Get-TapText 'accountDownloads'") === 1 && count(fnD('Invoke-CalFileTaps'), 'Invoke-CalAccountScroll') === 1,
    guardBranch: calFn[iRdy] === "elseif (-not $script:CalHubReady) { $gateOk = $true; $why = Invoke-CalHubBack $Cal $to $bcl $bc }",
    readyFalseFirst: scrollFn[1] === '$script:CalHubReady = $false' && scrollFn.slice(1, scrollFn.indexOf('Save-CalShot ' + "'cal-17s-account-scrolled.png' 'accountScrolled' $Cal")).filter((l) => /CalHubReady = \$true/.test(l)).length === 0,
    readyOnlyWhenBoth: rdyAt.length === 1 && scrollFn.slice(rdyAt[0] - 3, rdyAt[0] + 1).join('\n') === ["} elseif (Test-CalShotScreen $s17s 'accountScrolled') {", "Remove-CalShot $Cal $s17s 'confirmed, not kept'",
      "if (Get-TapGap 'accountDownloads') { $Cal.notes.Add('no tap on Downloads: ' + (Get-TapGap 'accountDownloads') + ' (cal-17s was deleted because screens.accountScrolled is set: read the point from the picture of the first calibrate, or make a calibrate run with screens.accountScrolled removed from a52s.json)') }", 'else { $script:CalHubReady = $true }'].join('\n'),
    // M1 (review round 1): cal-17s is kept ONLY while screens.accountScrolled is not set: a pass AND a fail delete it; the pass branch deletes it before anything else
    keptWhileAbsent: count(fnD('Invoke-CalAccountScroll'), 'Remove-CalShot') === 3 && count(fnD('Invoke-CalAccountScroll'), "Save-CalShot 'cal-17s-account-scrolled.png' 'accountScrolled' $Cal") === 1
      && (() => { const a = scrollFn.indexOf("if (Get-ScreenGap 'accountScrolled') {"), b = scrollFn.indexOf("} elseif (Test-CalShotScreen $s17s 'accountScrolled') {"); return a > 0 && b > a && !/Remove-CalShot/.test(scrollFn.slice(a, b).join('\n')) && /^\$Cal\.notes\.Add\('cal-17s kept: ' \+ \(Get-ScreenGap 'accountScrolled'\)/.test(scrollFn[a + 1]); })(),
    // review round 2 (m2): the checks run inside a try whose finally deletes the picture whenever the key is set (an exception / Ctrl+C in the probe read must not leave it)
    finallyDeletes: (() => {
      const tr = scrollFn.indexOf('try {'), fi = scrollFn.indexOf('} finally {'), save = scrollFn.findIndex((l) => l.startsWith('Save-CalShot ' + "'cal-17s-account-scrolled.png'"));
      const nullCheck = scrollFn.findIndex((l) => l.startsWith('if (-not $s17s -or -not $s17s.Path) {'));
      const clean = "if (-not (Get-ScreenGap 'accountScrolled') -and $s17s.Path) { Remove-CalShot $Cal $s17s 'cleanup after an error: the key is set, the picture is never kept' }";
      const probe = scrollFn.findIndex((l) => l.includes("Test-CalShotScreen $s17s 'accountScrolled'"));
      const cond = (/^if \((.*)\) \{ Remove-CalShot/.exec(clean) || [])[1] || '';
      const f = new Function('gap', 'path', 'return ' + cond.replace(/-not \(Get-ScreenGap 'accountScrolled'\)/g, '!gap').replace(/\$s17s\.Path/g, 'path').replace(/ -and /g, ' && '));
      return count(fnD('Invoke-CalAccountScroll'), 'try {') === 1 && count(fnD('Invoke-CalAccountScroll'), '} finally {') === 1 && tr > save && nullCheck > save && nullCheck < tr && tr === nullCheck + 1 && scrollFn[tr + 1] === "if (Get-ScreenGap 'accountScrolled') {"
        && probe > tr && probe < fi && scrollFn[fi + 1] === clean && scrollFn.slice(fi + 2).join('|') === '}|return $true|}'
        && !!f('', 'x.png') === true && !!f('a52s.json has no screens.accountScrolled', 'x.png') === false && !!f('', null) === false && !!f('', '') === false;   // key set + a Path -> deleted; key absent -> kept; no Path (already deleted) -> nothing
    })(),
    passDeleted: (() => { const b = scrollFn.indexOf("} elseif (Test-CalShotScreen $s17s 'accountScrolled') {"); const e = scrollFn.indexOf('} else {', b); return b > 0 && e > b && scrollFn[b + 1] === "Remove-CalShot $Cal $s17s 'confirmed, not kept'" && scrollFn.slice(b + 2, e).filter((l) => /Remove-CalShot/.test(l)).length === 0 && scrollFn[e + 1] === "Remove-CalShot $Cal $s17s 'not the scrolled Account hub'"; })(),
    swipeSentFirst: scrollFn.indexOf("if (-not (Invoke-CalInput $Cal $cmd 'cal-17s swipe')) { return $false }") > 0 && scrollFn.indexOf("Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'") > scrollFn.indexOf("if (-not (Invoke-CalInput $Cal $cmd 'cal-17s swipe')) { return $false }")
      && scrollFn.includes("if (-not (Get-SwipeGap 'accountDownloads')) { $cmd = Get-SwipeText 'accountDownloads'; $src = 'swipes.accountDownloads of a52s.json' }") && scrollFn.includes("$cmd = $script:CalHubSwipe"),
    printed: scrollFn.some((l) => l.startsWith("$Cal.notes.Add('cal-17s swipe (' + $src + '): ' + $cmd)")) && scrollFn.some((l) => l.startsWith("Say-Log ('  cal-17s swipe (' + $src + '): ' + $cmd)")),
    wayBack: backFn.includes("if (-not (Invoke-CalInput $Cal (Get-TapText 'tabChats') 'cal-18 tabChats')) { $why = 'tabChats not sent' }") && backFn.some((l) => l.includes("Wait-LogCount 'settingsclosed'")) && backFn.some((l) => l.includes("Wait-LogCount 'chats'")),
    // the failure after the Account tap still restarts the app, proven (the old tail)
    failureRestarts: calFn.includes("[void](Invoke-CalReset $Cal ('cal-17 failed (' + $why + ')'))") && calFn.indexOf("[void](Invoke-CalReset $Cal ('cal-17 failed (' + $why + ')'))") > iCalTap,
    // review round 3 (n3): a swipes.accountDownloads that is PRESENT but invalid still sends the fixed default, and the note says why (the gap text of Get-SwipeGap); an ABSENT key keeps the old note
    invalidSwipeNote: (() => {
      const l = scrollFn.findIndex((x) => x.startsWith("if (-not (Get-SwipeGap 'accountDownloads')) { $cmd = Get-SwipeText"));
      const e = scrollFn[l + 1] || '';
      const m = /^elseif \(\$null -ne \(Get-Field \(Get-Field \$script:Cfg 'swipes'\) 'accountDownloads'\)\) \{ \$src = 'the fixed calibrate default; swipes\.accountDownloads of a52s\.json is present but unusable \(' \+ \(Get-SwipeGap 'accountDownloads'\) \+ '\)' \}$/.exec(e);
      // the mirror of the three-way choice: valid -> the key; present + invalid -> the default AND the gap text; absent -> the default only
      const pick = (present, gap) => (gap === '' ? 'key' : (present ? 'default+gap' : 'default'));
      return l > 0 && !!m && scrollFn[l + 2].startsWith("$Cal.notes.Add('cal-17s swipe (' + $src") && !/\$cmd = /.test(e) && pick(true, 'swipes.accountDownloads is off the screen') === 'default+gap' && pick(false, 'a52s.json has no swipes.accountDownloads') === 'default' && pick(true, '') === 'key';
    })(),
    defaultValid: swDef.length === 5 && swJs.test('input swipe ' + swDef.join(' ')) && sx1 === sx2 && Math.hypot(sx2 - sx1, sy2 - sy1) >= 200 && sms >= 100 && sms <= 2000 && [sx1, sy1, sx2, sy2].every((v) => v >= 0 && v <= 2399) && sx1 <= 1079
      && sy1 - sy2 >= 1400 && sy1 < 2177 && sy2 > 200 && sms <= 200,   // starts above the bottom bar (CSS 774 = px 2177), travels >= 500 CSS px, a fast fling (150 ms): it ends at the bottom of the hub, not by speed
  };
  ok(F(d3).length === 0,
    '★ fixb3 walk (d3 calibrate): -Calibrate sends ONE swipe after the Account tab gates (the map key, else the fixed default `input swipe 540 2000 540 400 150`, printed in calibrate.json and walk.log), takes cal-17s (KEPT ONLY while screens.accountScrolled is not set; once the key is set it is deleted at once, after a pass (`confirmed, not kept`, before anything else) and after a fail), sets CalHubReady only when screens.accountScrolled has no gap AND passes AND taps.accountDownloads has no gap, and the accountDownloads tap (+ cal-17) is behind that guard in the elseif chain; without it the way back is tabChats + the two frames lines; the entry gate no longer needs taps.accountDownloads; a failure still ends in Invoke-CalReset; a swipes.accountDownloads that is PRESENT but invalid still sends the fixed default and the swipe note adds its gap text (Get-SwipeGap; an absent key: the default only) — failing: ' + JSON.stringify(F(d3)));

  /* ── d4 · the check's PNG is deleted ── */
  const fsFn = fnD('Invoke-FileShot');
  const sweepFn = stm(fnD('Clear-FileStepPngs')).join('\n');
  const swRes = [...sweepFn.matchAll(/-cmatch '([^']*)'/g)].map((m) => m[1]);
  const sw = swRes.map(js);
  const matchesAny = (n) => sw.some((r) => r.test(n));
  const d4 = {
    found: fsFn.length > 0 && swRes.length === 3,
    viaFileShot: count(dlFn, "Invoke-FileShot $Rec 'accountScrolled'") === 1 && !/Save-Shot|Save-CalShot|Invoke-ShotCheck|Invoke-PreCheck|Test-Screen|screencap|Invoke-FileShotCheck \$Rec 'accountScrolled'/.test(dlFn.replace("Invoke-FilePreCheck $Rec 'home'", '').replace("Invoke-FileShotCheck $Rec 'downloads'", '')),
    deletedInFinally: fsFn.includes('} finally {') && fsFn.indexOf('Remove-LocalFile $local') > fsFn.indexOf('} finally {') && fsFn.indexOf('Test-Screen $local $Expect') < fsFn.indexOf('} finally {') && !/\$Rec\['shot'\]|\$Rec\['shotPre'\]/.test(fsFn)
      && fnSha(DRV, 'Invoke-FileShot') === BASE_FN_SHA['Invoke-FileShot'],
    notRecorded: !/\$Rec\['shot'\]|\$Rec\['shotPre'\]/.test(dlFn),
    sweepMatchesCheck: ['shot-downloads-01-scrolled.png', 'shot-downloads-12-scrolled.png', 'shot-downloads-99-scrolled.png'].every(matchesAny),
    sweepMatchesReset: ['shot-history-seed-k55-reset-01.png', 'shot-history-seed-k00-reset-12.png', 'shot-history-seed-k55-reset-0123.png', 'shot-history-seed-k55-reset-123.png'].every(matchesAny),   // n4: the reset counter is 2..4 digits, as cal-reset-NN
    sweepKeepsKept: ['shot-history-seed-k55-01.png', 'shot-history-seed-k55-01-pre.png', 'shot-history-01.png', 'shot-history-seed-k5-reset-01.png', 'shot-history-seed-k55-reset-1.png', 'shot-history-seed-k55-reset-12345.png', 'shot-history-seed-k55-reset-01.png.bak', 'xshot-history-seed-k55-reset-01.png', 'cal-17s-account-scrolled.png'].every((n) => !matchesAny(n)),
    sweepOldNames: ['shot-viewer-01.png', 'shot-downloads-02-pre.png', 'shot-open-seed-k05-cold-reset-01.png', 'cal-reset-01.png'].every(matchesAny),
    sweepCallSites: count(D, 'Clear-FileStepPngs') === 7 && D.includes('try { Clear-FileStepPngs } catch { }'),
    // review round 2 (NIT 5): the history-seed step ends with the sweep, after its bounded recovery (as open-seed and the file steps)
    historySeedSweeps: (() => { const s = stm(fnD('Invoke-HistorySeedStep')); return s[s.length - 2] === 'Clear-FileStepPngs' && s[s.length - 3] === 'if ($script:NeedRecover -and -not $script:Halted) { [void](Invoke-EnsureHome) }' && s[s.length - 1] === '}' && count(fnD('Invoke-HistorySeedStep'), 'Clear-FileStepPngs') === 1; })(),
    // review round 2 (m2): the sweep also deletes cal-17s when screens.accountScrolled is set (and keeps it while the key is absent)
    calPngSweep: (() => {
      const hs = stm(fnD('Clear-CalAccountPng'));
      const re = (/-cmatch '([^']*)'/.exec(hs.join('\n')) || [])[1] || '';
      const rj = re ? js(re) : /(?!)/;
      const guard = hs.indexOf("if (Get-ScreenGap 'accountScrolled') { return }"), loop = hs.findIndex((l) => l.startsWith('foreach ($f in '));
      const sweepsAfter = stm(fnD('Clear-FileStepPngs'));
      const del = (name, gap) => (gap === '' && rj.test(name));   // the mirror: guard returns on a gap, else the anchored name test
      return hs[1] === "if (-not $script:RunDir -or -not (Test-Path -LiteralPath $script:RunDir)) { return }" && guard === 2 && loop === 3 && re === '^cal-17s-account-scrolled\\.png\\z' && hs.some((l) => l === 'if (Remove-LocalFile $f.FullName) { Write-WalkLog (' + "'sweep: ' + $f.Name + ' deleted') }")
        && del('cal-17s-account-scrolled.png', '') === true && del('cal-17s-account-scrolled.png', 'a52s.json has no screens.accountScrolled') === false
        && ['cal-17-downloads.png', 'cal-17s-account-scrolled.png.bak', 'xcal-17s-account-scrolled.png', 'cal-17s-account-scrolled.PNG', 'cal-17a-home-before.png', 'cal-17s-account-scrolled.png\n'].every((n) => !del(n, ''))
        && sweepsAfter[sweepsAfter.length - 2] === 'Clear-CalAccountPng' && sweepsAfter[sweepsAfter.length - 3] === '}' && count(D, 'Clear-CalAccountPng') === 2 && count(D, '\nfunction Clear-CalAccountPng') === 1;
    })(),
    calPng: scrollFn.includes("Save-CalShot 'cal-17s-account-scrolled.png' 'accountScrolled' $Cal") && /^cal-17s-account-scrolled\.png$/.test('cal-17s-account-scrolled.png') && /^(shot|android-walk|cal)-[A-Za-z0-9-]{1,60}\.(png|txt)$/.test('cal-17s-account-scrolled.png'),
  };
  ok(F(d4).length === 0,
    '★ fixb3 walk (d4 pngDeleted): the scrolled-hub check of downloads goes ONLY through Invoke-FileShot (unchanged: focus, screencap, focus, probes, the PNG deleted in a finally, never recorded in the rep); its names `shot-downloads-NN-scrolled.png` and the reset PNG of history-seed (`shot-history-seed-kNN-reset-NN.png`) match the sweep patterns of Clear-FileStepPngs (extracted and run), the kept shots of history-seed and cal-17s do not — failing: ' + JSON.stringify(F(d4)));

  /* ── h1 · -HistorySeed: the refusals ── */
  const hsStart = D.indexOf("if ($PSBoundParameters.ContainsKey('HistorySeed')) {");
  const hsBlock = hsStart < 0 ? '' : (psMatch(D, hsStart) || '');
  const hb = stm(hsBlock);
  const paramBlock = (() => { const i = D.indexOf('param('); return i < 0 ? '' : D.slice(i, D.indexOf('\n)', i)); })();
  const histRe = (/\$histText -cnotmatch '([^']*)'/.exec(hsBlock) || [])[1] || '';
  const hJs = histRe ? js(histRe) : /(?!)/;
  const refused = (v) => { const t = Array.isArray(v) ? v.join(',') : String(v); if (!hJs.test(t)) return true; const n = parseInt(t, 10); return n < 0 || n > 55; };
  const lastUsage = Math.max(...hb.map((l, i) => (l.includes('Exit-Usage') ? i : -1)));
  const at = (s) => D.indexOf(s);
  const h1 = {
    found: hsBlock.length > 0 && paramBlock.length > 0,
    paramLast: (() => { const pl = stm(paramBlock); return pl[pl.length - 1] === '[string[]]$HistorySeed' && pl[pl.length - 2] === '[string[]]$SeedIndex,'; })(),   // review round 1 n5: -HistorySeed is the LAST parameter
    stringArray: /\[string\[\]\]\$HistorySeed\b/.test(paramBlock) && !/\[int\[?\]?\]?\$HistorySeed/.test(D) && count(D, '$HistorySeed') === 2,
    noCalibrate: hb[1] === "if ($Calibrate) { Exit-Usage '-HistorySeed cannot be used with -Calibrate' }",
    oneNumberRegex: histRe === '\\A[0-9]{1,2}\\z' && hb.includes("$histText = (@($HistorySeed) | ForEach-Object { [string]$_ }) -join ','"),
    behaviour: ['0', '5', '07', '55'].every((v) => !refused(v)) && ['56', '99', '-1', '5,6', ['5', '6'], 'abc', '', ' 5', '5 ', '1.5', '123', '0x1', '５', '5\n'].every(refused),
    range: hb.includes("if ($histNum -lt 0 -or $histNum -gt 55) { Exit-Usage '-HistorySeed takes ONE whole number 0..55 (the dev-seed index, 0 = Seed 01, 55 = Seed 56)' }") && hb.includes('$histNum = [int]::Parse($histText, $script:Inv)'),
    needsHistory: hb.some((l) => l === "if ($want -notcontains 'history') { Exit-Usage '-HistorySeed needs the step history named in -Steps' }"),
    noFlags: hb.some((l) => l.startsWith('if ($script:FlagsAsked) { Exit-Usage ') && l.includes('-HistorySeed cannot be combined with -Flags')),
    assignedLast: hb.indexOf('$script:HistSeedIdx = $histNum') > lastUsage && lastUsage > 0 && count(D, '$script:HistSeedIdx = ') === 2 && hb.includes("$script:HistorySeedStep = 'history-seed-k' + $histNum.ToString('00', $script:Inv)"),
    exitOne: stm(fnD('Exit-Usage')).join('\n').includes('exit 1'),
    beforeAdb: hsStart > at("if ($KillRenderer) { $script:StepsReq = @($script:StepsReq) + @('killrenderer') }") && at("if ($KillRenderer)") > 0
      && hsStart < at('\nInitialize-Allowlist\n') && hsStart < at('$ok = $false\ntry {') && hsStart < D.lastIndexOf('Invoke-Preflight') && hsStart < at('Enter-Lock\n'),
    afterFlagsAndSeedIndex: hsStart > at("if ($PSBoundParameters.ContainsKey('Flags')) {") && hsStart > at("if ($PSBoundParameters.ContainsKey('SeedIndex')) {") && at("if ($PSBoundParameters.ContainsKey('Flags')) {") > 0,
    wantIsExplicitList: D.includes('$want = New-Object System.Collections.Generic.List[string]') && D.indexOf('$want = New-Object') < hsStart,
  };
  ok(F(h1).length === 0,
    '★ fixb3 walk (h1 usage): `-HistorySeed` is a `[string[]]` (a -File comma list is joined and refused), exactly `\\A[0-9]{1,2}\\z` then 0..55; refused (Exit-Usage, exit 1) with -Calibrate, with -Flags, without `history` named in -Steps, and for 56, -1, "5,6", text, a blank, a fraction; the block stands after the -Flags and -SeedIndex blocks and before Initialize-Allowlist, the lock, the pre-flight and any adb command; $script:HistSeedIdx is assigned only after the last check (behaviour of the extracted regex run in JavaScript) — failing: ' + JSON.stringify(F(h1)));

  /* ── h2 · the address is derived; one proven restart per rep ── */
  const repFnT = fnD('Invoke-HistorySeedRep');
  const rep = stm(repFnT);
  const rst = stm(fnD('Invoke-HistorySeedRestart'));
  const newBody = ['Invoke-HistorySeedStep', 'Invoke-HistorySeedRestart', 'Invoke-HistorySeedRep'].map(fnD).join('\n');
  const devAddr = stm(fnD('Get-DevSeedAddress')).join('\n');
  const FA = "$r = Invoke-ShellReq ('am start -n ' + $script:Comp + ' --es fa ' + $addr)";
  const iRst = rep.indexOf('Invoke-HistorySeedRestart $Rec $K'), iLc = rep.indexOf("[void](Invoke-ShellReq 'logcat -c')"), iFa = rep.indexOf(FA);
  const h2 = {
    found: rep.length > 0 && rst.length > 0,
    derived: rep[1] === '$K = $script:HistSeedIdx' && rep[2] === '$addr = Get-DevSeedAddress $K' && rep[3] === '$script:OpenSeedAddr[[string]$K] = $addr',
    faOnce: iFa > 0 && count(newBody, '--es fa') === 1 && count(newBody, 'am start') === 1 && count(repFnT, '$addr') === 3,
    noFileRead: !/Get-Seed\b|Read-JsonFile|Get-Content|ReadAllText|walk\.local|\$script:Seeds|Get-Field|\$script:FileSeed|\$script:ImageSeed|ConvertFrom-Json|Test-Path/.test(newBody),
    noTypedInput: !/input\s+text/i.test(D) && !/\bRead-Host\b|\$args\b|\$env:/.test(newBody),
    devAddrUntouched: sha(devAddr) === BASE_DEVADDR_SHA,
    oneRestartPerRep: iRst === 4 && count(repFnT, 'Invoke-HistorySeedRestart') === 1 && count(D, 'Invoke-HistorySeedRestart') === 2 && count(newBody, 'Invoke-FileReset') === 1 && iRst < iLc && iLc < iFa && rep[iLc + 1] === FA,
    restartProvenOrHalt: rst[1] === "if (-not (Invoke-EnsureHome)) { throw 'ADBWALK-NOSCREEN: foreign window in front (the app did not come back)' }" && rst[2] === 'if (-not (Save-FileRepPid)) {' && rst[3] === '$script:Halted = $true' && rst.some((l) => l.startsWith("$script:HaltNote = 'run stopped: an app restart was not proven (no further input)'")) && rst.includes("throw 'ADBWALK-REP: no restart proof, so no further input'")
      && rst.indexOf('if (-not (Save-FileRepPid)) {') < rst.findIndex((l) => l.startsWith('if (-not (Invoke-FileReset $Rec (')),
    // review round 1 (m1): the THREE throws of the restart in their order, and the no-pid branch ends in its throw (no restart, no input)
    throwsInOrder: rst.filter((l) => /\bthrow\b/.test(l)).map((l) => (/throw '([^']*)'/.exec(l) || [])[1]).join('|') === ['ADBWALK-NOSCREEN: foreign window in front (the app did not come back)', 'ADBWALK-REP: cannot read the app pid before the restart: no restart, no input', 'ADBWALK-REP: no restart proof, so no further input'].join('|'),
    noPidThrowsLast: (() => { const a = rst.indexOf('if (-not (Save-FileRepPid)) {'); const e = a < 0 ? -1 : rst.indexOf('}', a); return a > 0 && e > a && rst[e - 1] === "throw 'ADBWALK-REP: cannot read the app pid before the restart: no restart, no input'" && rst.slice(a, e).filter((l) => /\breturn\b|\bcontinue\b|\bbreak\b/.test(l)).length === 0; })(),
    noInputBeforeRestart: !rep.slice(0, iRst).some((l) => /Invoke-Shell|Invoke-Back|Get-TapText|Get-SwipeText|am start/.test(l)),
    checkAndSwipes: rep.includes("Invoke-PreCheck $Rec 'chat'") && rep.indexOf("Invoke-PreCheck $Rec 'chat'") > iFa && rep.indexOf("Invoke-PreCheck $Rec 'chat'") < rep.findIndex((l) => l.includes("Get-SwipeText 'historyOlder'")),
    maskedLike: D.includes("$t = $t.Replace($sa, '<seed-index ' + $sk + '>')") || /\.Replace\(\$sa, '<seed-index ' \+ \$sk \+ '>'\)/.test(stm(fnD('Protect-Text')).join('\n')),
    stepRoutes: stm(fnD('Invoke-RepBody')).includes("elseif ($s -cmatch '\\Ahistory-seed-k[0-9]{2}\\z') { Invoke-HistorySeedRep $Rec }") && stm(fnD('Invoke-Walk')).some((l) => l === "elseif ($s -eq 'history' -and $script:HistSeedIdx -ge 0) { Invoke-HistorySeedStep }")
      && stm(fnD('Invoke-Walk')).indexOf("elseif ($s -eq 'history' -and $script:HistSeedIdx -ge 0) { Invoke-HistorySeedStep }") < stm(fnD('Invoke-Walk')).indexOf("elseif ($s -eq 'history') {"),
    stepNeeds: fnD('Get-StepGap').includes("$need = @('swipe:historyOlder', 'screen:chat', 'screen:home', 'count:historyMaxSwipes')"),
    runJson: D.includes("if ($script:HistSeedIdx -ge 0) { $doc['historySeed'] = [int]$script:HistSeedIdx }"),
  };
  ok(F(h2).length === 0,
    '★ fixb3 walk (h2 address): the address of a history-seed rep is `Get-DevSeedAddress $K` — derived by the script (never read from a file, never typed), stored in the mask table (`<seed-index k>`), used in the ONE `--es fa` command; Get-DevSeedAddress is byte-identical to the base; each rep starts with ONE proven restart (the app brought to Chats as open-seed does, then the pid read before -> Invoke-FileReset, not proven = Halted + HaltNote + throw) before `logcat -c` and the intent, with no input before it; the chat check follows the intent and precedes the swipes — failing: ' + JSON.stringify(F(h2)));

  /* ── h3 · one page request ends the swipes ── */
  const loopAt = rep.indexOf("while ($sw -lt $script:Tm['historyMaxSwipes']) {");
  const h3 = {
    found: loopAt > 0,
    countBefore: rep.indexOf('$c0 = Get-LoadMoreCount') > 0 && rep.indexOf('$c0 = Get-LoadMoreCount') < loopAt && rep[rep.indexOf('$c0 = Get-LoadMoreCount') + 1] === "if ($null -eq $c0) { throw 'ADBWALK-REP: cannot count the page requests in the phone log' }",
    stopAtOne: rep.includes('if ($got -ge 1) { break }') && !/\$got -ge [2-9]/.test(repFnT) && rep.includes('$got = $c - $c0'),
    t0FirstSwipe: rep.indexOf("$r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'historyOlder'))") === rep.indexOf('if ($sw -eq 0) {') + 1 && rep.includes('Set-RepStamp $Rec $r.StdOut') && count(repFnT, 'Set-RepStamp') === 1,
    boundedByMax: loopAt > 0 && rep.includes("Wait-Ms $script:Tm['historySwipeMs'] 'historySwipeMs'") && count(repFnT, 'while (') === 1,
    zeroIsNote: rep.includes("if ($got -lt 1) { Add-Note $Rec ('no page request after ' + $sw + ' swipes: a chat with no older page cannot measure this') }") && !/throw[^\n]*no page request/.test(repFnT),
    thenAsHistory: rep.slice(rep.findIndex((l) => l.startsWith('if ($got -lt 1)')) + 1).join('|') === ["Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'", "Invoke-ShotCheck $Rec 'chat'", 'Invoke-LogPull $Rec', 'Invoke-BackReq', "Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs'", '}'].join('|'),
    swipesRecorded: rep.includes("$Rec['swipes'] = $sw") && !rep.some((l) => /^\$k\b/.test(l)) && count(repFnT, '$K = ') === 1 && !/\$k\s*(=|\+\+)/.test(repFnT.replace('$K = $script:HistSeedIdx', '')),   // n3: PowerShell names ignore case, so a swipe counter `$k` would overwrite the index `$K`
    pagesRecorded: rep[rep.findIndex((l) => l.startsWith('if ($got -lt 1)')) - 1] === "$Rec['pages'] = [int]$got" && rep[rep.findIndex((l) => l.startsWith('if ($got -lt 1)')) - 2] === '}' && count(repFnT, "$Rec['pages']") === 1
      && stm(fnD('Complete-Rep')).includes("if ($Rec.ContainsKey('pages')) { $out['pages'] = [int]$Rec['pages'] }") && stm(fnD('Complete-Rep')).indexOf("if ($Rec.ContainsKey('pages')) { $out['pages'] = [int]$Rec['pages'] }") > stm(fnD('Complete-Rep')).findIndex((l) => l.startsWith("foreach ($k in @('t0', 'stamp2'")) && stm(fnD('Complete-Rep')).indexOf("if ($Rec.ContainsKey('pages')) { $out['pages'] = [int]$Rec['pages'] }") < stm(fnD('Complete-Rep')).findIndex((l) => l.startsWith("$out['note']")),
    oldHistoryKept: stm(fnD('Invoke-HistoryRep')).includes('if ($got -ge 3) { break }') && stm(fnD('Invoke-HistoryRep')).includes("Invoke-OpenSeedChat ($Rec.rep + 4)"),
  };
  ok(F(h3).length === 0,
    '★ fixb3 walk (h3 onePage): a history-seed rep counts the page requests (Get-LoadMoreCount before the first swipe), takes t0 at the FIRST swipe, stops at `$got -ge 1` or historyMaxSwipes; no page request = a note only, with `pages` = 0 recorded in run.json (the rep still settles, checks the chat, pulls the log and goes BACK; the parser then says "no data" for the page rows: zero pages is never a measurement); the old history rep (3 pages, seed chat k+4) is unchanged — failing: ' + JSON.stringify(F(h3)));

  /* ── h4 · the parser rows ── */
  const nameRe = (/'(\\Ahistory-seed-k[^']*)'/.exec(fnP('Test-HistorySeedName')) || [])[1] || '';
  const nJs = nameRe ? js(nameRe) : /(?!)/;
  // re-based walktools (item 3): both tables now close with the page rows appended (`) + $script:HistorySeedPageDefs`, `) + $script:HistoryPageDefs }`); the cut ends at THAT closing, so the
  // block is still exactly the old head + the eight old seed rows / the old rows of history (a cut at `\n)\n` would run on into $script:MemDefs; a cut at `) }` into resume-now). The closing itself is held by m1 (defsClosing).
  const defsBlock = (() => { const i = P.indexOf('$script:HistorySeedDefs = @('); const e = i < 0 ? -1 : P.indexOf(SEED_DEFS_CLOSE, i); return e < 0 ? '' : P.slice(i, e); })();
  const defsRows = [...defsBlock.matchAll(/\(New-Def '([^']*)' '([^']*)' \$(true|false) '([a-z]*)' \{ param\(\$c\) ([^}]*) \}\)/g)].map((m) => [m[1], m[2], m[3] === 'true', m[4], m[5].trim()]);
  const histBlock = (() => { const i = P.indexOf("'history'     = @{ Kind = 'reps'; Reps = 'repeats'; Defs = @("); const e = i < 0 ? -1 : P.indexOf(HIST_DEFS_CLOSE, i); return e < 0 ? '' : P.slice(i, e); })();
  const histRows = [...histBlock.matchAll(/\(New-Def '([^']*)' '([^']*)' \$(true|false) '([a-z]*)' \{ param\(\$c\) ([^}]*) \}\)/g)].map((m) => [m[1], m[2], m[3] === 'true', m[4], m[5].trim()]);
  const refsOf = (b) => [...b.matchAll(/^\s*\$script:(\w+),?$/gm)].map((m) => m[1]);
  const gsi = stm(fnP('Get-HistorySeedIndex')).join('\n');
  const gsiCond = (/if \((\(\$null -eq \$n\)[^\n]*)\) \{ return -1 \}/.exec(gsi) || [])[1] || '';
  const condJs = gsiCond.replace(/\$null -eq \$n/g, 'n === null').replace(/\$n -ne \[Math\]::Floor\(\$n\)/g, 'n !== Math.floor(n)').replace(/\$n -lt (\d+)/g, 'n < $1').replace(/\$n -gt (\d+)/g, 'n > $1').replace(/ -or /g, ' || ');
  let refusesIdx = () => null;
  try { const f = new Function('n', 'return ' + condJs); refusesIdx = (n) => { try { return f(n); } catch { return null; } }; } catch { /* the flags say it */ }
  const keyFn = stm(fnP('Get-StepKey')).join('\n'), defFn = stm(fnP('Get-StepDef')).join('\n'), safeFn = stm(fnP('Test-SafeName')).join('\n');
  const mainP = stm(fnP('Invoke-Main'));
  const h4 = {
    found: defsRows.length > 0 && nameRe.length > 0,
    nameBehaviour: ['history-seed-k00', 'history-seed-k05', 'history-seed-k55', 'history-seed-k49'].every((n) => nJs.test(n)) && ['history-seed-k56', 'history-seed-k5', 'history-seed-k005', 'History-seed-k05', 'history-seed-k05-cold', 'xhistory-seed-k05', 'history-seed-k05x', 'history', 'open-seed-k05', 'history-seed-k05\n'].every((n) => !nJs.test(n)),
  };
  const SEED_NAMES = defsRows.map((r) => r[0]).join('|');
  const HIST_NAMES = histRows.map((r) => r[0]).join('|');
  const h4b = {
    names: SEED_NAMES === 'older pages loaded|first swipe -> 1st page|scroll max gap (max)|scroll drops (sum)|scroll frames n (sum)|long tasks|longest long task|swipes',
    // round 3 (m1): the five scroll / long-task rows are no longer shared with history (the old defs have no gate): the seed table repeats each by name, unit, flag and
    // source, and its extract is the gate wrapper around the SAME old extractor call; history still takes the five shared defs
    refs: refsOf(defsBlock).length === 0 && refsOf(histBlock).join() === 'ScrollGapDef,ScrollDropDef,ScrollFramesDef,LongCountDef,LongMaxDef',
    sameAsOldDefs: (() => {
      const base = (v) => { const m = new RegExp("\\$script:" + v + " = \\(New-Def '([^']*)' '([^']*)' \\$(true|false) '([a-z]*)' \\{ param\\(\\$c\\) (X-\\w+) \\$c '(\\w+)' \\}\\)").exec(P); return m ? [m[1], m[2], m[3] === 'true', m[4], "X-SeedGated $c '" + m[5] + "' '" + m[6] + "'"] : null; };
      const want = ['ScrollGapDef', 'ScrollDropDef', 'ScrollFramesDef', 'LongCountDef', 'LongMaxDef'].map(base);
      return want.every((w) => w !== null) && want.every((w, i) => JSON.stringify(defsRows[2 + i]) === JSON.stringify(w));
    })(),
    required: defsRows.length === 8 && defsRows.slice(0, 3).every((r) => r[2] === true) && defsRows[7][2] === true && defsRows[5][2] === false && defsRows[6][2] === false && histRows.every((r) => r[2] === true),   // the long-task rows stay optional as in history
    pageRowsFirstPage: defsRows.length === 8 && histRows.length === 3 && defsRows[0][4] === "X-SeedPage $c 'count'" && defsRows[1][4] === "X-SeedPage $c 'first'" && defsRows[7][4] === "X-SeedGated $c 'X-Field' 'swipes'" && histRows[0][4] === 'X-Count $c $script:L.Load 3' && histRows[1][4] === 'X-NthDelta $c $script:L.Load 3' && histRows[2][4] === "X-Field $c 'swipes'",
    historyRowsKept: HIST_NAMES === 'older pages loaded|first swipe -> 3rd page|swipes',
    routes: keyFn.includes('if (Test-HistorySeedName $Name) { return $Name }') && defFn.includes("if (Test-HistorySeedName $k) { return @{ Kind = 'reps'; Reps = 'repeats'; Defs = $script:HistorySeedDefs } }") && safeFn.includes("$alt = $alt + '|history-seed-k(?:[0-4][0-9]|5[0-5])'"),
    stepsReplaced: mainP.includes('$histSeedK = Get-HistorySeedIndex $m') && mainP.includes("if (($histSeedK -ge 0) -and $steps.Contains('history')) { $steps[$steps.IndexOf('history')] = 'history-seed-k' + $histSeedK.ToString('00', $script:Inv) }")
      && mainP.indexOf('$histSeedK = Get-HistorySeedIndex $m') > mainP.indexOf('$steps = New-Object System.Collections.Generic.List[string]') && mainP.indexOf('$histSeedK = Get-HistorySeedIndex $m') < mainP.indexOf('$reps = New-Object System.Collections.Generic.List[object]'),
    indexBehaviour: gsiCond.length > 0 && [null, -1, 56, 1.5, 100].every((n) => refusesIdx(n) === true) && [0, 5, 55].every((n) => refusesIdx(n) === false) && gsi.includes("Get-Num (Get-Prop $M 'historySeed')"),
    legend: mainP.some((l) => l.startsWith("[void]$md.Append('- history-seed-k'")),
  };
  // review round 1 (m3): zero pages is no data. The driver's `pages` (run.json) must be a whole number >= 1 for the two page rows; the parse of
  // the field and the gate are mirrored in JavaScript from the extracted conditions.
  const spFn = stm(fnP('X-SeedPage')), rcFn = stm(fnP('New-RepCtx')), gtFn = stm(fnP('X-SeedPagesGate')), sgFn = stm(fnP('X-SeedGated'));
  const gateCond = (/if \((\(\$null -eq \$C\.Pages\)[^\n]*)\) \{ return \(New-Res 'missing'/.exec(gtFn.join('\n')) || [])[1] || '';
  const parseCond = (/if \((\(\$null -ne \$pg\)[^\n]*)\) \{ \$pg = \$null \}/.exec(rcFn.join('\n')) || [])[1] || '';
  const toJs = (s, v) => s.replace(/\$null -eq \$C\.Pages/g, v + ' === null').replace(/\$C\.Pages -lt (\d+)/g, v + ' < $1').replace(/\$null -ne \$pg/g, v + ' !== null').replace(/\$pg -gt (\d+)/g, v + ' > $1').replace(/\$pg -ne \[Math\]::Floor\(\$pg\)/g, v + ' !== Math.floor(' + v + ')').replace(/ -or /g, ' || ').replace(/ -and /g, ' && ');
  let gateRefuses = () => null, parseNulls = () => null;
  try { const f = new Function('n', 'return ' + toJs(gateCond, 'n')); gateRefuses = (n) => { try { return f(n); } catch { return null; } }; } catch { /* the flags say it */ }
  try { const f = new Function('n', 'return ' + toJs(parseCond, 'n')); parseNulls = (n) => { try { return f(n); } catch { return null; } }; } catch { /* the flags say it */ }
  // round 3 (m1): the gate is ONE function (X-SeedPagesGate: $null = the rep counts, else the "missing" result with the reason); the two page rows go through X-SeedPage and
  // the six others through X-SeedGated, which runs the old extractor only behind the gate; a node mirror of the eight rows: a rep with pages 0 / missing is missing in EVERY row
  const rowGated = (r) => /^X-SeedPage \$c '(count|first)'$/.test(r[4]) || /^X-SeedGated \$c 'X-(Scroll|Long|Field)' '\w+'$/.test(r[4]);
  const mirrorRow = (pages) => defsRows.map((r) => (rowGated(r) && gateRefuses(pages) ? 'missing' : 'value'));
  const h4c = {
    found: spFn.length > 0 && gtFn.length > 0 && sgFn.length > 0 && gateCond.length > 0 && parseCond.length > 0,
    gateFn: gtFn[1] === 'param($C)' && gtFn[2] === "if (-not $C.Usable) { return (New-Res 'missing' $null $C.Why) }" && gtFn[3].startsWith('if (($null -eq $C.Pages) -or ($C.Pages -lt 1)) { return (New-Res ' + "'missing'") && gtFn[4] === 'return $null' && gtFn.length === 6,
    pageFirst: spFn[1] === 'param($C, [string]$Kind)' && spFn[2] === '$g = X-SeedPagesGate $C' && spFn[3] === 'if ($null -ne $g) { return $g }' && spFn[4] === "if ($Kind -eq 'count') { return (X-Count $C $script:L.Load 1) }" && spFn[5] === 'return (X-SeedFirstPage $C)',
    wrapperFirst: sgFn[1] === 'param($C, [string]$Fn, [string]$Arg)' && sgFn[2] === '$g = X-SeedPagesGate $C' && sgFn[3] === 'if ($null -ne $g) { return $g }' && sgFn[4] === 'return (& $Fn $C $Arg)' && sgFn.length === 6,
    gateBehaviour: [null, 0, -1].every((n) => gateRefuses(n) === true) && [1, 2, 7].every((n) => gateRefuses(n) === false),
    everyRowGated: defsRows.length === 8 && defsRows.every(rowGated) && mirrorRow(0).every((x) => x === 'missing') && mirrorRow(null).every((x) => x === 'missing') && mirrorRow(1).every((x) => x === 'value'),
    parseBehaviour: [1.5, 1001, 5000].every((n) => parseNulls(n) === true) && [0, 1, 2, 1000].every((n) => parseNulls(n) === false) && rcFn.includes("$pg = Get-Num (Get-Prop $Entry 'pages')") && rcFn.includes('$c.Pages = $pg'),
    ctxHasPages: stm(fnP('New-Ctx')).includes('Pages = $null'),
    // re-based walktools (item 3): X-SeedPagesGate 3 -> 4 references: + `return (X-SeedPagesGate $C)` in X-PageGate (the optional page rows of history-seed ask the SAME gate; whether they do is held by pins-walktools/c-parser seedGate)
    onlySeedRows: count(P, 'X-SeedPagesGate') === 4 && stm(fnP('X-PageGate')).includes('return (X-SeedPagesGate $C)') && (P.match(/X-SeedPage\b/g) || []).length === 3 && count(P, 'X-SeedGated') === 7 && !/X-SeedPage|X-SeedGated|X-SeedPagesGate/.test(histBlock),   // the gate: its definition + the two wrappers + X-PageGate (walktools); the page rows: the definition + 2 rows; the others: the definition + 6 rows; the old history rows use none
  };
  // REWRITTEN walktools (item 3, contract I-3a, #1827 (3)): the rule of review round 2 NIT 2 ("the first `chat load` AFTER the first `shell send loadmore` line") is gone — it
  // excluded the very load it should find (the shell's console line reaches the C# log AFTER the C# answer: real run 20261122-1350, chat load 13:51:31.7693, send line 13:51:31.8216).
  // The NEW rule, three branches IN THIS ORDER (X-SeedFirstPage): (1) the window holds a `[P1] chat loadmore in` line (C#): the first `chat load` line AT OR AFTER the first such line
  // (an exact pair, both C# lines; none after it = no data, NO fall-through to branch 2); (2) else the window holds a `[P1] shell send loadmore` line: the first `chat load` line of the
  // WINDOW, but ONLY when the number of `chat load` lines equals the number of send lines (review round 1: a stray load would silently become "1st page"; unequal = no data, "<n> chat load lines for <m>
  // page requests in the window (cannot pair; ...)"; no load at all = no data) — the send line's stamp is NOT compared; (3) else no data (no request proven). Minus t0. The conditions are extracted and the three
  // branches are mirrored in JavaScript with the extracted operators / indices, on thirteen cases (one is the shape of the real run).
  const sfp = stm(fnP('X-SeedFirstPage'));
  const SFP_WANT = ['{', 'param($C)', '$r = Test-Ready $C', 'if ($null -ne $r) { return $r }', '$loads = (Get-Hits $C $script:L.Load).Items', '$csharp = (Get-Hits $C $script:L.LoadMoreIn).Items', 'if ($csharp.Count -gt 0) {',
    'foreach ($ld in $loads) {', "if ($ld.Stamp -ge $csharp[0].Stamp) { return (New-Res 'value' (($ld.Stamp - $C.T0).Ticks / 10000.0) '') }", '}',
    "return (New-Res 'missing' $null ($C.Label + ': no \"' + $script:L.Load.Label + '\" line after the first \"' + $script:L.LoadMoreIn.Label + '\" line in ' + $C.LogName))", '}',
    '$req = (Get-Hits $C $script:L.SendLoadMore).Items', 'if ($req.Count -gt 0) {',
    "if ($loads.Count -eq 0) { return (New-Res 'missing' $null ($C.Label + ': no \"' + $script:L.Load.Label + '\" line in the window although a \"' + $script:L.SendLoadMore.Label + '\" line is there, in ' + $C.LogName)) }",
    "if ($loads.Count -ne $req.Count) { return (New-Res 'missing' $null ($C.Label + ': ' + $loads.Count.ToString($script:Inv) + ' chat load lines for ' + $req.Count.ToString($script:Inv) + ' page requests in the window (cannot pair; ' + $C.LogName + ')')) }",
    "return (New-Res 'value' (($loads[0].Stamp - $C.T0).Ticks / 10000.0) '')", '}',
    "return (New-Res 'missing' $null ($C.Label + ': no \"' + $script:L.LoadMoreIn.Label + '\" line and no \"' + $script:L.SendLoadMore.Label + '\" line (no page request is proven) in ' + $C.LogName))", '}'];
  const cmpM = /^if \(\$ld\.Stamp -(ge|gt) \$csharp\[(\d+)\]\.Stamp\) \{ return \(New-Res 'value' \(\(\$ld\.Stamp - \$C\.T0\)\.Ticks \/ 10000\.0\) ''\) \}$/.exec(sfp[8] || '') || [];   // branch 1: the compare and the reference index
  const c1M = /^if \(\$csharp\.Count -(gt|ge|eq) (\d+)\) \{$/.exec(sfp[6] || '') || [];                                                                                                          // branch 1: the condition
  const c2M = /^if \(\$req\.Count -(gt|ge|eq) (\d+)\) \{$/.exec(sfp[13] || '') || [];                                                                                                            // branch 2: the condition
  const b2M = /^if \(\$loads\.Count -(gt|ge|eq|lt) (\d+)\) \{ return \(New-Res 'missing' \$null /.exec(sfp[14] || '') || [];                                                              // branch 2: no load at all = no data
  const b3M = /^if \(\$loads\.Count -(ne|gt|lt) \$req\.Count\) \{ return \(New-Res 'missing' \$null /.exec(sfp[15] || '') || [];                                                           // branch 2: the counts must be EQUAL
  const b4M = /^return \(New-Res 'value' \(\(\$loads\[(\d+)\]\.Stamp - \$C\.T0\)\.Ticks \/ 10000\.0\) ''\)$/.exec(sfp[16] || '') || [];                                                   // branch 2: which load
  const opJs = (op, a, n) => (op === 'gt' ? a > n : op === 'ge' ? a >= n : op === 'eq' ? a === n : op === 'lt' ? a < n : op === 'ne' ? a !== n : null);
  const mirrorFirst = (evs, t0) => {   // evs in window order: { k: 'cs' (C# loadmore in) | 'req' (shell send loadmore) | 'load' (C# chat load), t }
    const cs = evs.filter((e) => e.k === 'cs'), req = evs.filter((e) => e.k === 'req'), loads = evs.filter((e) => e.k === 'load');
    if (opJs(c1M[1], cs.length, Number(c1M[2]))) {
      for (const ld of loads) { if (cmpM[1] === 'ge' ? ld.t >= cs[Number(cmpM[2])].t : ld.t > cs[Number(cmpM[2])].t) return ld.t - t0; }
      return 'missing: no load after the C# line';
    }
    if (opJs(c2M[1], req.length, Number(c2M[2]))) {
      if (opJs(b2M[1], loads.length, Number(b2M[2]))) return 'missing: no load although a send line';
      if (opJs(b3M[1], loads.length, req.length)) return 'missing: cannot pair';
      return loads[Number(b4M[1])].t - t0;
    }
    return 'missing: no page request proven';
  };
  const lmRe = (/SendLoadMore = @\{ Gram = \$true; Label = 'shell send loadmore';\s+Rx = \(New-Rx \(\$script:Cm \+ '([^']*)'\)\) \}/.exec(P) || [])[1] || '';
  const csRe = (/LoadMoreIn\s+= @\{ Gram = \$true; Label = 'chat loadmore in';\s+Rx = \(New-Rx \(\$script:Cm \+ '([^']*)'\)\) \}/.exec(P) || [])[1] || '';
  const CmJs = /^[A-Za-z]{1,10}\|[0-9]{1,6}: (?:\[WEBVIEW\] [A-Z]{1,12} )?/;
  const lmJs = lmRe ? new RegExp(CmJs.source.replace(/^\^/, '^') + lmRe) : /(?!)/;
  const csJs = csRe ? new RegExp(CmJs.source.replace(/^\^/, '^') + csRe) : /(?!)/;
  const h4d = {
    found: sfp.length > 0 && cmpM.length > 0 && c1M.length > 0 && c2M.length > 0 && b2M.length > 0 && b3M.length > 0 && b4M.length > 0,
    statements: sfp.length === SFP_WANT.length && sfp.every((l, n) => l === SFP_WANT[n]),
    oldRuleGone: !sfp.some((l) => /\$req\[\d+\]\.Stamp/.test(l)) && !sfp.some((l) => /\$ld\.Stamp -(ge|gt) \$req/.test(l)),   // the stamp of the send line is NOT an order: no compare against it
    behaviour: cmpM[1] === 'ge' && cmpM[2] === '0' && c1M[1] === 'gt' && c1M[2] === '0' && c2M[1] === 'gt' && c2M[2] === '0' && b2M[1] === 'eq' && b2M[2] === '0' && b3M[1] === 'ne' && b4M[1] === '0'
      && mirrorFirst([{ k: 'load', t: 31769 }, { k: 'req', t: 31821 }], 20787) === 10982                                             // (2) the shape of run 20261122-1350: the C# load stamp is BEFORE the send line's stamp -> still the first swipe's page
      && mirrorFirst([{ k: 'req', t: 10 }, { k: 'req', t: 15 }, { k: 'load', t: 20 }, { k: 'load', t: 30 }], 0) === 20              // (2) equal counts (2 / 2): the FIRST load of the window, not a later one
      && mirrorFirst([{ k: 'load', t: 5 }, { k: 'req', t: 10 }], 0) === 5                                                            // (2) the send line's stamp is not an order: a load before it counts
      && mirrorFirst([{ k: 'load', t: 5 }, { k: 'req', t: 10 }, { k: 'load', t: 20 }], 0) === 'missing: cannot pair'                 // (2) a stray load (2 loads, 1 request) is not "1st page": no data
      && mirrorFirst([{ k: 'req', t: 10 }, { k: 'req', t: 15 }, { k: 'load', t: 20 }], 0) === 'missing: cannot pair'                 // (2) a lost load (1 load, 2 requests): no data
      && mirrorFirst([{ k: 'req', t: 10 }], 0) === 'missing: no load although a send line'                                          // (2) a send line and no load = no data
      && mirrorFirst([{ k: 'cs', t: 200 }, { k: 'load', t: 230 }], 50) === 180                                                       // (1) the exact pair
      && mirrorFirst([{ k: 'load', t: 100 }, { k: 'cs', t: 200 }, { k: 'load', t: 350 }], 50) === 300                               // (1) a load BEFORE the C# line is not the page
      && mirrorFirst([{ k: 'cs', t: 200 }, { k: 'load', t: 200 }], 0) === 200                                                        // (1) the same stamp counts as at-or-after
      && mirrorFirst([{ k: 'cs', t: 200 }, { k: 'cs', t: 300 }, { k: 'load', t: 250 }, { k: 'load', t: 400 }], 0) === 250            // (1) the FIRST C# line is the reference, the first load after it
      && mirrorFirst([{ k: 'req', t: 5 }, { k: 'load', t: 6 }, { k: 'cs', t: 10 }, { k: 'load', t: 12 }], 0) === 12                  // (1) before (2): with the C# line present the load before it is not taken
      && mirrorFirst([{ k: 'load', t: 100 }, { k: 'cs', t: 200 }, { k: 'req', t: 210 }], 0) === 'missing: no load after the C# line' // (1) none after it = no data: NO fall-through to the send line
      && mirrorFirst([{ k: 'load', t: 100 }], 50) === 'missing: no page request proven' && mirrorFirst([], 0) === 'missing: no page request proven',   // (3) no request line of either kind = no data
    lineDef: lmRe.length > 0 && lmJs.test('I|123: [P1] shell send loadmore dt=3') && lmJs.test('I|123: [WEBVIEW] LOG [P1] shell send loadmore') && !lmJs.test('I|123: [P1] shell send loadmorex') && !lmJs.test('I|123: [P1] shell send chat n=1') && !lmJs.test('I|123: [P1] chat load n=1') && !lmJs.test('1I|123: [P1] shell send loadmore'),
    lineDefCs: csRe.length > 0 && csJs.test('I|123: [P1] chat loadmore in') && csJs.test('I|123: [P1] chat loadmore in n=3') && !csJs.test('I|123: [P1] chat loadmore inx') && !csJs.test('I|123: [P1] chat loadmore out') && !csJs.test('I|123: [P1] chat load n=1') && !csJs.test('1I|123: [P1] chat loadmore in'),
    oldRowsNotUsing: !/X-SeedFirstPage/.test(histBlock) && count(P, 'X-SeedFirstPage') === 2 && count(P, 'SendLoadMore') >= 4,
  };
  ok(F(h4d).length === 0,
    '★ fixb3 walk (h4d firstPage) [REWRITTEN walktools item 3, contract I-3a: the fixb3 rule "the first chat load AFTER the first shell send loadmore line" is replaced]: first swipe -> 1st page of history-seed-kNN is the stamp of ONE `[P1] chat load` line minus t0, chosen by three branches IN THIS ORDER (X-SeedFirstPage): (1) the window holds a `[P1] chat loadmore in` line (C#): the first `chat load` line AT OR AFTER the first such line (an exact pair of two C# lines; none after it = "no data" with the reason, NO fall-through to (2)); (2) else the window holds a `[P1] shell send loadmore` line: the first `chat load` line of the WINDOW, but ONLY when the number of `chat load` lines equals the number of send lines (review round 1: a stray or a lost load = "no data", "<n> chat load lines for <m> page requests in the window (cannot pair; ...)"; no load at all = "no data") — the send line is only the proof that a page was asked for, its stamp is NOT compared (the shell console line reaches the C# log after the C# answer, so the old "after the send line" excluded the very load; the open of the chat loads before t0, outside the window); (3) else "no data" with the reason (no request is proven); the function is held statement by statement, no compare against the send line is left, the conditions / operators / indices are extracted and the three branches are mirrored in JavaScript with them on thirteen cases (one has the shape of the real run); both line definitions are anchored like the others; the old history rows do not use it. LIMITS (#1735): a source pin plus a JavaScript mirror of the branches — it does not run PowerShell and does not prove the order the statements RUN in; that is proven by hand on pwsh 7.4.6 by scripts/pins-walktools/c-parser-run.mjs (r4 pair, r5 send line only, r6 none), not in CI; the `[P1] chat loadmore in` line is written by C# (batch histcs) — a build without it takes branch (2); nothing ran on Windows PowerShell 5.1 or on a phone — failing: ' + JSON.stringify(F(h4d)));
  ok(F(h4c).length === 0,
    '★ fixb3 walk (h4c zeroPages): EVERY row of history-seed-kNN (review round 3 m1: the two page rows through X-SeedPage, the scroll, long-task and swipes rows through X-SeedGated) is "no data" (missing + the reason) unless the rep carries `pages` >= 1 in run.json, through ONE gate function X-SeedPagesGate — a rep whose driver counted ZERO page requests, or has no / a non-integer `pages` (New-RepCtx reads a whole number 0..1000, else $null), is never a measurement in any row (it may have hit historyMaxSwipes and would skew a median), whatever a stray `chat load` line says; the gate and the parse conditions are extracted and run in JavaScript, and a node mirror of the eight rows checks that pages 0 / missing gives missing in all of them; the old history rows do not use it — failing: ' + JSON.stringify(F(h4c)));
  ok(F(h4).length === 0 && F(h4b).length === 0,
    '★ fixb3 walk (h4 parserRows): history-seed-kNN (name run through its anchored regex: k00..k55 only) is a rep step of the parser with the rows of history — older pages loaded, first swipe -> page, the five scroll / long-task rows, swipes (the same names, units, required flags and old extractors, each behind the pages gate) — the two page rows ask for the FIRST page request (history asks for three; a dev-seed chat has ONE older page); run.json historySeed (one whole number 0..55) replaces `history` in the requested steps of the parser; the file-name rule and Get-StepKey / Get-StepDef route the name; the old history rows are unchanged — failing: ' + JSON.stringify(F(h4)) + JSON.stringify(F(h4b)));

  /* ── d5 · review round 1 (m4): the load-time refusal of a weak screens.accountScrolled ── */
  const hubStart = D.indexOf("if (-not (Get-ScreenGap 'accountScrolled') -and -not (Get-TapGap 'accountDownloads')) {");
  const hubBlock = hubStart < 0 ? '' : (psMatch(D, hubStart) || '');
  const hubSt = stm(hubBlock);
  const nearPx = Number((/-le (\d+)\) \{ \$asNear\+\+ \}/.exec(hubBlock) || [])[1]);
  const hubRefuses = (cfg) => {   // a node mirror of the block (valid keys assumed: Get-ScreenGap / Get-TapGap are the old gap checks)
    const scr = cfg.screens && cfg.screens.accountScrolled, tap = cfg.taps && cfg.taps.accountDownloads;
    if (!scr || !tap) return false;
    const near = scr.probes.filter((p) => Math.abs(p.y - tap.y) <= nearPx).length;
    return scr.minMatch < scr.probes.length || near < 1;
  };
  const mk = (ys, minMatch, tapY = 1500, withTap = true) => ({ taps: withTap ? { accountDownloads: { x: 540, y: tapY } } : {}, screens: { accountScrolled: { probes: ys.map((y) => ({ x: 100, y, rgb: '#FFFFFF', tol: 10 })), minMatch } } });
  const d5 = {
    found: hubBlock.length > 0 && nearPx > 0,
    blockText: hubSt.join('\n') === ['{',
      "$asScr = Get-Field (Get-Field $script:Cfg 'screens') 'accountScrolled'", "$asProbes = @(Get-Field $asScr 'probes')", "$asTapY = [int](Get-Field (Get-Field (Get-Field $script:Cfg 'taps') 'accountDownloads') 'y')", '$asNear = 0',
      "foreach ($asPr in $asProbes) { if ([Math]::Abs([int](Get-Field $asPr 'y') - $asTapY) -le 60) { $asNear++ } }",
      "if ([int](Get-Field $asScr 'minMatch') -lt $asProbes.Count) { Exit-Usage 'a52s.json screens.accountScrolled.minMatch must equal the number of probes (every probe must match: the tap on Downloads is safe only when the probes pin the scroll position)' }",
      "if ($asNear -lt 1) { Exit-Usage 'a52s.json screens.accountScrolled has no probe within 60 px (in y) of taps.accountDownloads: put one probe ON the Downloads row (its icon) and one on a row edge' }", '}'].join('\n'),
    beforeAdb: hubStart > D.indexOf("a52s.json device.width/height must be 1..10000") && D.indexOf("a52s.json device.width/height must be 1..10000") > 0 && hubStart < D.indexOf('\nInitialize-Allowlist\n') && hubStart < D.indexOf('$ok = $false\ntry {') && hubStart < D.lastIndexOf('Invoke-Preflight') && hubStart < D.indexOf('Enter-Lock\n'),
    behaviour: nearPx === 60 && hubRefuses(mk([1500, 1300], 1)) === true && hubRefuses(mk([1500, 1300], 2)) === false && hubRefuses(mk([1300, 1700], 2)) === true && hubRefuses(mk([1440, 1300], 2)) === false && hubRefuses(mk([1439, 1300], 2)) === true && hubRefuses(mk([1560, 1300], 2)) === false && hubRefuses(mk([1561, 1300], 2)) === true
      && hubRefuses(mk([1300], 1, 1500, false)) === false && hubRefuses({ taps: {}, screens: {} }) === false,
    // review round 3 (n2): reads the REAL map: red BY DESIGN once the operator block commits screens.accountScrolled to a52s.json; re-base after the map commit (as filewalk b6, #1674)
    realFileInert: (() => { try { const A = JSON.parse(readFileSync(join(root, 'scripts/device/a52s.json'), 'utf8')); return hubRefuses(A) === false && !!(A.screens && A.screens.accountScrolled) && !!(A.taps && A.taps.accountDownloads); } catch { return false; } })(),   // re-based after the map commit of 2026-11-22: the REAL map now holds both hub keys and passes the load-time rule
    textsNameIt: /at least one probe ON the Downloads row \(its icon\) at the y of\s+taps\.accountDownloads, at least one on a row edge,\s+and minMatch = the number of probes/.test(DRV) && DRV.includes("set at least one probe ON the Downloads row (its icon) at the y of taps.accountDownloads, at least one on a row edge, and minMatch = the number of probes, because the tap follows ONE fixed swipe; the load-time rule cannot see a fling that stops short by a whole row, so also put one probe on a feature that does not repeat: the end of the hub or its last row (text only, not enforced)); no tap on Downloads')") && /refuses a map with\s+both keys set where no probe is within 60 px/.test(DRV),
    // review round 2 (NIT 1): the one-row-offset limit is stated in the walk header, the calibrate header and the calibrate note, and the extra probe is TEXT only (the block above is unchanged: no new refusal)
    limitStated: (() => { const w = DRV.replace(/\s+/g, ' '); return count(w, 'cannot see a fling that stops short by a whole row') === 3 && count(w, 'does not repeat') === 3 && count(w, 'not enforced') >= 3 && w.includes('put ONE more probe on a feature that does not repeat (the end of the hub or its last row)') && w.includes('also put ONE probe on a feature that does not repeat, the end of the hub or its last row (text only, not enforced)'); })(),
    // review round 2 (m2): a PRESENT but invalid screens.accountScrolled is a usage error at load time (after the device size, before the hub block, the allowlist and any adb command); an absent key is not
    invalidKeyUsage: (() => {
      const line = "if ($null -ne (Get-Field (Get-Field $script:Cfg 'screens') 'accountScrolled') -and (Get-ScreenGap 'accountScrolled')) { Exit-Usage ('a52s.json screens.accountScrolled is invalid (' + (Get-ScreenGap 'accountScrolled') + '): fix it, or remove the key (only an absent key keeps the calibrate picture)') }";
      const L = D.split('\n').map((l) => l.trim()), at = L.indexOf(line);
      const usage = (present, gap) => present && gap !== '';   // the mirror of the condition: present AND (gap non-empty) -> Exit-Usage
      return at > 0 && count(D, 'screens.accountScrolled is invalid') === 1 && L.indexOf("if ($script:W -lt 1 -or $script:H -lt 1 -or $script:W -gt 10000 -or $script:H -gt 10000) { Exit-Usage 'a52s.json device.width/height must be 1..10000' }") === at - 1
        && L[at + 1] === "if (-not (Get-ScreenGap 'accountScrolled') -and -not (Get-TapGap 'accountDownloads')) {" && D.indexOf(line) < D.indexOf('\nInitialize-Allowlist\n') && D.indexOf(line) < D.indexOf('$ok = $false\ntry {') && D.indexOf(line) < D.indexOf('Enter-Lock\n')
        && usage(true, 'screens.accountScrolled probe 1 is invalid') === true && usage(true, 'screens.accountScrolled.minMatch is not 1..2') === true && usage(false, 'a52s.json has no screens.accountScrolled') === false && usage(true, '') === false
        && stm(fnD('Exit-Usage')).join('\n').includes('exit 1');
    })(),
  };
  ok(F(d5).length === 0,
    '★ fixb3 walk (d5 hubProbes): [review round 2: a present but invalid screens.accountScrolled is a load-time usage error, and the one-row-offset limit with the "one probe on a feature that does not repeat" advice is stated in three places] the tap on Downloads follows ONE fixed swipe, so it is safe only when the probes of screens.accountScrolled pin the scroll position: when BOTH screens.accountScrolled and taps.accountDownloads are set the driver refuses at load time (Exit-Usage, before the allowlist, the lock, the pre-flight and any adb command) unless minMatch = the number of probes and at least one probe has a y within 60 px of taps.accountDownloads (the block is frozen statement by statement; a node mirror with extracted threshold: 60 ok, 61 refused; one key alone or the real a52s.json never refuses — realFileInert reads the REAL a52s.json and turns red BY DESIGN when the operator block commits screens.accountScrolled to it: re-base it after the map commit, as filewalk b6, #1674); the header and the calibrate note say it — failing: ' + JSON.stringify(F(d5)));

  /* ── m1 · review round 2 (m1): the ADDED single lines of old functions and the added blocks are held by their EXACT text ── */
  // o1 removes the added lines by their START (so that a mutated added line still turns only its own key red); this key holds each of them by the
  // exact trimmed text, its number of occurrences, and the SHA-256 of the two statements around it (a moved line changes its context).
  const HELD = {
    drv: [
    ["[string[]]$HistorySeed", ["5844618caabc25b7"]],
    ["$script:HistSeedIdx = -1", ["b8217b09e50647e3"]],
    ["$script:HistorySeedStep = ''", ["21ff2ca24b381945"]],
    ["$script:CalHubSwipe = 'input swipe 540 2000 540 400 150'", ["820aa6c84588e30c"]],
    ["$script:CalHubReady = $false", ["91a82bad67cc069c","f476acb2286b2a82"]],
    ["if ($Step -eq 'downloads') { $need = @($need) + @('swipe:accountDownloads', 'screen:accountScrolled') }", ["0bb4dbe2a7db52d0"]],
    ["if ($Step -cmatch '\\Ahistory-seed-k[0-9]{2}\\z') { $need = @('swipe:historyOlder', 'screen:chat', 'screen:home', 'count:historyMaxSwipes') }", ["cfcac9668ba400e2"]],
    // ★ walktools2 re-base (2026-11-23): the next statement of each of these two lines is now a walktools2 line (run.json `coldstartWatch`, Complete-Rep `watch`), so only the context hash moved: b1a4af7313989c81 -> 45258ac138bd83a3, 60cb44e5e84656c9 -> 3985427942170052 (the line text and the count are unchanged)
    ["if ($script:HistSeedIdx -ge 0) { $doc['historySeed'] = [int]$script:HistSeedIdx }", ["45258ac138bd83a3"]],
    ["if ($Rec.ContainsKey('pages')) { $out['pages'] = [int]$Rec['pages'] }", ["3985427942170052"]],
    ["elseif ($s -cmatch '\\Ahistory-seed-k[0-9]{2}\\z') { Invoke-HistorySeedRep $Rec }", ["0f2ffb21cc558130"]],
    ["elseif ($s -eq 'history' -and $script:HistSeedIdx -ge 0) { $sum += $n * ($t['coldStartSettleSec'] + 12 + ($t['chatSettleMs'] + $t['scrollSettleMs'] + $t['backSettleMs']) / 1000 + 6 * ($t['historySwipeMs'] / 1000 + 1) + 8) }", ["ad5d21add9db57c6"]],
    ["elseif ($s -eq 'history' -and $script:HistSeedIdx -ge 0) { Invoke-HistorySeedStep }", ["3e9e2795431fd87b"]],
    ["elseif (-not (Invoke-CalAccountScroll $Cal)) { $why = 'the accountDownloads swipe was not sent' }", ["98b07241b9db1513"]],
    ["elseif (-not $script:CalHubReady) { $gateOk = $true; $why = Invoke-CalHubBack $Cal $to $bcl $bc }", ["46b8992a40305efd"]],
    ["if (@(Get-Field (Get-Field (Get-Field $script:Cfg 'screens') 'accountScrolled') 'probes').Count -gt 16) { Exit-Usage 'a52s.json screens.accountScrolled has more than 16 probes' }", ["67cf3bfcee068036"]],
    ["if ($null -ne (Get-Field (Get-Field $script:Cfg 'screens') 'accountScrolled') -and (Get-ScreenGap 'accountScrolled')) { Exit-Usage ('a52s.json screens.accountScrolled is invalid (' + (Get-ScreenGap 'accountScrolled') + '): fix it, or remove the key (only an absent key keeps the calibrate picture)') }", ["d3aac8d73831a151"]],
    ["Clear-CalAccountPng", ["dc805d1d3aa2d873"]],
    ["[string[]]$SeedIndex,", ["f620d2e069b85e11"]],
    ["elseif ($s -eq 'downloads') { $sum += $n * ((3 * $t['scrollSettleMs'] + 3 * $t['tabSettleMs']) / 1000 + 19) }", ["1b71578c364cd419"]],
    ["foreach ($tn in @('tabAccount', 'tabChats')) { if (-not $gapDl) { $gapDl = Get-TapGap $tn } }", ["4e0c6040229d4f9b"]],
    ["if ($f.Name -cmatch '^shot-(scroll-files|scroll-voice|scroll-photos|viewer|downloads|open-seed)-[A-Za-z0-9-]{1,40}\\.png\\z' -or $f.Name -cmatch '^cal-reset-[0-9]{2,4}\\.png\\z' -or $f.Name -cmatch '^shot-history-seed-k[0-9]{2}-reset-[0-9]{2,4}\\.png\\z') {", ["10103f7a92d8c2ff"]],
    ],
    par: [
    ["SendLoadMore = @{ Gram = $true; Label = 'shell send loadmore';             Rx = (New-Rx ($script:Cm + '\\[P1\\] shell send loadmore(?=\\s|$)')) }", ["10dc745acadda8a1"]],
    ["if (Test-HistorySeedName $Name) { return $Name }", ["8f1c9b107d2e568a"]],
    ["$alt = $alt + '|history-seed-k(?:[0-4][0-9]|5[0-5])'", ["d3728d33b5a8bdf7"]],
    ["if (Test-HistorySeedName $k) { return @{ Kind = 'reps'; Reps = 'repeats'; Defs = $script:HistorySeedDefs } }", ["6fa54f8805e728cf"]],
    ["$histSeedK = Get-HistorySeedIndex $m", ["4ca6164c8dcea7d7"]],
    ["if (($histSeedK -ge 0) -and $steps.Contains('history')) { $steps[$steps.IndexOf('history')] = 'history-seed-k' + $histSeedK.ToString('00', $script:Inv) }", ["7a91814c41896d4c"]],
    ["Pages = $null", ["f93f5b01fef51496"]],
    ["$pg = Get-Num (Get-Prop $Entry 'pages')", ["ea2cd5151e6753ee"]],
    ["if (($null -ne $pg) -and (($pg -gt 1000) -or ($pg -ne [Math]::Floor($pg)))) { $pg = $null }", ["d484c5ef9030df10"]],
    ["$c.Pages = $pg", ["214507788b84ad9a"]],
    ],
  };
  const ctxOf = (L, i) => sha((L[i - 1] || '') + '\n' + (L[i + 1] || '')).slice(0, 16);
  const heldOk = (L, table) => {
    const bad = [];
    for (const [line, ctxs] of table) {
      const at = L.map((l, i) => (l === line ? i : -1)).filter((i) => i >= 0);
      if (at.length !== ctxs.length || at.map((i) => ctxOf(L, i)).sort().join() !== [...ctxs].sort().join()) bad.push(line.slice(0, 60) + (at.length !== ctxs.length ? ' [x' + at.length + ']' : ' [moved]'));
    }
    return bad;
  };
  const LD = lines(D), LP = lines(P);
  const usageSha = sha(stm(hsBlock).join('\n'));
  const legendBlock = (() => { const i = P.indexOf('if ($histSeedK -ge 0) {'); return i < 0 ? '' : (psMatch(P, i) || ''); })();
  const defsBlockSt = defsBlock.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
  const m1 = {
    found: LD.length > 1000 && LP.length > 500 && hsBlock.length > 0 && legendBlock.length > 0 && defsBlock.length > 0,
    driverLines: heldOk(LD, HELD.drv).length === 0,
    parserLines: heldOk(LP, HELD.par).length === 0,
    usageBlock: usageSha === HELD_BLOCKS.usage,
    legendBlock: sha(stm(legendBlock).join('\n')) === HELD_BLOCKS.legend,
    defsBlock: sha(defsBlockSt) === HELD_BLOCKS.defs,
    // walktools (item 3): the table closing, held by its exact text: the closing line of $script:HistorySeedDefs is `) + $script:HistorySeedPageDefs` (once), and the `history` entry closes with `) + $script:HistoryPageDefs }` (once)
    defsClosing: count(P, SEED_DEFS_CLOSE) === 1 && count(P, HIST_DEFS_CLOSE) === 1 && P.indexOf(SEED_DEFS_CLOSE) > P.indexOf('$script:HistorySeedDefs = @(') && P.indexOf(HIST_DEFS_CLOSE) > P.indexOf("'history'     = @{ Kind = 'reps'")
      && P.includes('$script:HistorySeedPageDefs = New-PageDefs 1 $true') && P.includes('$script:HistoryPageDefs = New-PageDefs 3 $false'),
  };
  ok(F(m1).length === 0,
    '★ fixb3 walk (m1 addedLines): every line this batch ADDED to (or changed in) an old function or a table — 21 driver lines, 10 parser lines — is held by its EXACT trimmed text, its number of occurrences and the SHA-256 of the statement before and after it (a changed, deleted, duplicated or moved line turns this key red), and the added blocks are held whole by the SHA-256 of their statements: the -HistorySeed usage block (the refusals; an inserted `$script:FlagsAsked = ...` or `$Calibrate = $false` changes it; the screens.accountScrolled hub-probe block is held by d5), the parser legend block and the HistorySeedDefs table. LIMITS (#1735): a line is compared as its trimmed text (spaces inside a line and a trailing comment ARE part of it, so such an edit is caught; only whole-line comments, blank lines and the indentation are not code); the context is the two neighbouring statements, so a line moved between two places with the same neighbours is not seen; an added line is not run (no PowerShell here), so a statement-identical line can still behave differently if a name it uses is redefined elsewhere (names ignore case); nothing ran on Windows PowerShell 5.1 or on a phone — failing: ' + JSON.stringify(F(m1)) + ' ' + JSON.stringify(heldOk(LD, HELD.drv).concat(heldOk(LP, HELD.par))) + ' usage=' + usageSha + ' legend=' + sha(stm(legendBlock).join('\n')) + ' defs=' + sha(defsBlockSt));

  /* ── n1 · review round 1 (m1): the new functions are frozen statement by statement ── */
  // re-based walktools (item 3): X-SeedFirstPage b5701ebe6ea0... -> c843188a690f... (branch 2 needs equal counts of chat load and send lines) (rewritten to the three-branch rule of contract I-3a; the rule itself is asserted by h4d, this key holds the text).
  const NEW_FN_SHA = {
    drv: { 'Invoke-HistorySeedStep': 'ce29888a8297cc6be5250dfc907df9e95105dbc15c3ca010b6ec2e469e2d66d5', 'Invoke-HistorySeedRestart': '9122a8497d85179a693af138db808b0ea11e416178ae30ecc6a257effbdec49a', 'Invoke-HistorySeedRep': '714bc2323e1669ed71abb277e40452b89f87f19ba634ab4adce3839585aae670', 'Invoke-CalAccountScroll': '7d23c29b22f5aa2ab1ea7a1b926b55ee869c5632aab185746fcc54515a9db0bc', 'Invoke-CalHubBack': '11c9c1d3c33d1e83d3145690052f96ec5fa539c20baa7aa9e11983e8e6fc526d', 'Clear-CalAccountPng': '4c71ea1e053a9a3a3259ac0dadb06e5af8303c23dea5a8eeeee1023bcefedda2' },
    par: { 'Test-HistorySeedName': 'dc58c9c80c0dd9d0809aad7b6c8e38926b957730040da91ae6d7ea080cbd6653', 'Get-HistorySeedIndex': '34696f786f00556a174e6ed8426dc67893f7a419837c6d33a80c5cad291fc163', 'X-SeedPagesGate': '8af99715aca7d0da38994997d836f99283af22705c9d79654af5361af5768e46', 'X-SeedPage': '5f0a539648bbea8ed8e8875bc30a415a0d1c57bffc38b8f473619ca92fedafce', 'X-SeedGated': '7bc362b1df5f20064135cd47dde41631e1eb1284c12b47801670e9702ac81783', 'X-SeedFirstPage': 'c843188a690f4c8f5d22647d7752480448959e2ff97b343dd0338b9bc9e3d6c1' },
  };
  const n1 = { found: Object.keys(NEW_FN_SHA.drv).every((n) => fnD(n).length > 0) && Object.keys(NEW_FN_SHA.par).every((n) => fnP(n).length > 0) };
  for (const [n, s] of Object.entries(NEW_FN_SHA.drv)) n1[n] = fnSha(DRV, n) === s && count(D, '\nfunction ' + n + ' ') + count(D, '\nfunction ' + n + '(') === 1;
  for (const [n, s] of Object.entries(NEW_FN_SHA.par)) n1[n] = fnSha(PAR, n) === s && count(P, '\nfunction ' + n + ' ') + count(P, '\nfunction ' + n + '(') === 1;
  ok(F(n1).length === 0,
    '★ fixb3 walk (n1 newBodies): the statement list (comments and blank lines dropped, each line trimmed) of EACH new function — driver: Invoke-HistorySeedStep, Invoke-HistorySeedRestart, Invoke-HistorySeedRep, Invoke-CalAccountScroll, Invoke-CalHubBack, Clear-CalAccountPng; parser: Test-HistorySeedName, Get-HistorySeedIndex, X-SeedPagesGate, X-SeedPage, X-SeedGated, X-SeedFirstPage — hashes to its frozen SHA-256 and each name is defined exactly ONCE (PowerShell would take the LAST definition of a name defined twice); an inserted, removed or changed statement turns exactly the key of that function red (a deliberate edit re-bases its hash after a look at the diff). LIMITS (#1735): a trailing comment on a statement line and the spaces inside a line ARE part of the compared text (so such an edit is caught; review round 3 n1 corrected this: only whole-line comments, blank lines and the indentation are dropped); the helpers the functions CALL are held only where another key says so (Invoke-FileShot / Invoke-FileReset / the allowlist by BASE_FN_SHA; Invoke-EnsureHome, Save-FileRepPid, Get-LoadMoreCount, Invoke-ShotCheck, Remove-CalShot and the rest are held by o1 as old statements only); the pin does not run PowerShell, so a statement-identical function can still behave differently if a variable or a function it uses is redefined elsewhere with the same name (names ignore case); no run on Windows PowerShell 5.1 or on a phone — failing (the function that moved): ' + JSON.stringify(F(n1)));

  /* ── o1 · the old statements are byte-identical ── */
  const ov = oldView(DRV, PAR);
  const drvSha = sha(ov.drv.join('\n')), parSha = sha(ov.par.join('\n'));
  const allSteps = psList(D, '$script:AllSteps = ') || [];
  const o1 = {
    found: ov.drv.length > 1000 && ov.par.length > 500,
    driverStatements: drvSha === BASE_DRV_VIEW_SHA,
    parserStatements: parSha === BASE_PAR_VIEW_SHA,
    noMissingAdded: !ov.drv.some((l) => l.startsWith('#MISSING')) && !ov.par.some((l) => l.startsWith('#MISSING')),
    // ★ walktools2 re-base (2026-11-23): AllSteps holds 26 names now (the opt-in coldstart-watch is the new last one; the first five and the no-history-seed rule are unchanged)
    stepsUnchanged: allSteps.length === 26 && allSteps.slice(0, 5).join() === 'coldstart,mem-home,chat-intent,chat-tap,scroll' && !allSteps.some((s) => s.startsWith('history-seed')),
    oldHistoryBranch: stm(fnD('Invoke-Walk')).includes("elseif ($s -eq 'history') {") && stm(fnD('Invoke-Walk')).includes("Invoke-Step 'history' $script:RepeatsN $true"),
  };
  ok(F(o1).length === 0,
    '★ fixb3 walk (o1 oldStatements): the statements of adb-walk.ps1 and adb-walk-parse.ps1 (comments and blank lines dropped), minus exactly the statements of this batch (six driver functions, the -HistorySeed block, the block inserted into Invoke-DownloadsRep between its `settings` gate and `logcat -c`, 17 single driver lines; six parser functions, the legend block, the HistorySeedDefs block, 10 single parser lines; m1 holds each of these lines by its exact text) with the two changed driver lines put back (the `tabAccount` / `accountDownloads` / `tabChats` list, the sweep line), (the driver view also leaves out the log filter line and the four allowlist functions: o2 / o3 freeze them exactly, so a break there turns only its own key red) hash to the SHA-256 of the statements of the base scripts (work/fixb3 @ 14ae57f2) — so without the new options every old step sends the same commands (the dry run: ' + 'same adb command list and a byte-identical summary.csv) — failing: ' + JSON.stringify(F(o1)) + ' got drv=' + drvSha.slice(0, 16) + ' par=' + parSha.slice(0, 16));

  /* ── o2 · the log filter ── */
  const logRe = (/\$script:LogRe = '((?:[^']|'')*)'/.exec(D) || [])[1] || '';
  const o2 = { found: logRe.length > 0, sameAsBase: logRe.length === 529 && sha(logRe) === BASE_LOGRE_SHA, one: count(D, '$script:LogRe = ') === 1 };
  ok(F(o2).length === 0, '★ fixb3 walk (o2 logRe): $script:LogRe is byte-identical to the base (529 chars, SHA-256) — the log filter on the phone is unchanged; the new reps pull through Invoke-LogPull as before — failing: ' + JSON.stringify(F(o2)));

  /* ── o3 · no new adb command shape ── */
  const allowFn = fnD('Initialize-Allowlist');
  const shellAllowBlock = (() => { const i = allowFn.indexOf('$script:ShellAllow = @('); if (i < 0) return ''; const e = allowFn.indexOf('\n    )', i); return allowFn.slice(i, e < 0 ? undefined : e); })();
  const PE = 'com\\.ixilabs\\.spixi\\.dev', CE = PE + '/[A-Za-z0-9_.]+';
  const allowRes = shellAllowBlock.split('\n').slice(1).map((l) => l.trim().replace(/,$/, '')).filter((l) => l.length > 0 && !l.startsWith('#')).map((l) => {
    const t = l.replace(/^\(/, '').replace(/\)$/, '');
    return t.split(' + ').map((x) => (x === '$ce' ? CE : x === '$pe' ? PE : /^'.*'$/.test(x) ? x.slice(1, -1).replace(/''/g, "'") : '\u0000BAD' + x)).join('');
  });
  const shapeJs = (s) => new RegExp(s.replace(/\\A/g, '^').replace(/\\z/g, '$'));
  const sampleAddr = '1' + 'A'.repeat(40);
  const allowJsList = allowRes.map(shapeJs);
  const passes = (c) => c.split(';').every((p) => allowJsList.some((r) => r.test(p.trim())));
  const faRe = allowRes.find((r) => r.includes('--es fa')) || '';
  const o3 = {
    found: allowFn.length > 0,
    // ★ walktools2 re-base (2026-11-23): Test-ShellAllowed, Assert-AdbCommand and Get-LogPullCmd stay byte-identical to the base; Initialize-Allowlist = the base + exactly ONE statement, `$script:WatchEventsCmd,` (once): without that line its statements hash to the base value again (the exact string of the command is held by pins-walktools2/b-coldwatch k1)
    allowlistFrozen: ['Test-ShellAllowed', 'Assert-AdbCommand', 'Get-LogPullCmd'].every((n) => fnSha(DRV, n) === BASE_FN_SHA[n])
      && (() => { const st = fnStm(code(DRV), 'Initialize-Allowlist'); return st.filter((l) => l === '$script:WatchEventsCmd,').length === 1 && sha(st.filter((l) => l !== '$script:WatchEventsCmd,').join('\n')) === BASE_FN_SHA['Initialize-Allowlist']; })(),
    newCommandsOnlyKnown: (() => {
      const cmds = [...(newBody + fnD('Invoke-CalAccountScroll') + fnD('Invoke-CalHubBack')).matchAll(/Invoke-(?:Shell|ShellReq|CalInput)[^\n]*?\(?'((?:am|input|logcat|date)[^']*)'/g)].map((m) => m[1]);
      return cmds.length > 0 && cmds.every((c) => !/^(am force-stop|pm |rm |kill|input text|settings)/.test(c));
    })(),
    noNewVerbs: !/input text|pm clear|uninstall|reboot|rm -r|\bsu\b/i.test(newBody + fnD('Invoke-CalAccountScroll') + fnD('Invoke-CalHubBack')),
    framePollSame: count(D, 'chatmedia = (') === 1 && count(D, "$script:LoadPollCmd = $script:LogCmd + ' | grep -c -e P1..shell.send.loadmore'") === 1,
    samplesPass: allowJsList.length > 10 && !allowRes.some((r) => r.includes('\u0000BAD')) && ['logcat -c', 'input swipe 540 2000 540 400 150', 'input tap 540 1100', 'input keyevent 4', 'date +%m-%dT%H:%M:%S.%N; input swipe 540 700 540 1900 150'].every((c) => passes(c)) && faRe.length > 0 && passes('am start -n com.ixilabs.spixi.dev/crc64.MainActivity --es fa ' + sampleAddr),
    refusesText: !passes('input text 1234') && !passes('pm clear com.ixilabs.spixi.dev') && !passes('input swipe 540 2000 540 400'),
  };
  ok(F(o3).length === 0,
    '★ fixb3 walk (o3 allowlist): NO new adb command shape — Initialize-Allowlist, Test-ShellAllowed, Assert-AdbCommand and Get-LogPullCmd are byte-identical to the base (SHA-256 of their statements), the shapes the new code sends (logcat -c, the stamped / plain input swipe and tap, BACK, the fa intent with a derived address, the existing loadmore count poll) pass the extracted allowlist run in JavaScript, and `input text`, `pm clear` and a short swipe are refused — failing: ' + JSON.stringify(F(o3)));
  /* ── p1 · operator block 2026-11-22: no script-scope variable has the name of a script parameter ── */
  // The first walk run of the operator block stopped at once ("driver failure: RuntimeException (line 1348)"): the script parameter
  // `[string[]]$HistorySeed` IS the script-scope variable `$script:HistorySeed`, so `$script:HistorySeed = -1` kept the [string[]] type
  // (@('-1')); `@('-1') -ge 0` compares as text with the culture rules (the hyphen is ignored: '1' -ge '0' = true), so the run.json line
  // took the int cast of an array. The state variable is now `$script:HistSeedIdx` (an untyped int). This key reads the param blocks of
  // both scripts and refuses any `$script:<parameter name>` (names ignore case) and any top-level assignment `$<parameter name> =`.
  // LIMITS (#1735): it does not run PowerShell; `Set-Variable -Scope Script` and `Get-Variable` are not read (neither script uses them).
  const paramNames = (t) => { const i = t.indexOf('\nparam('); if (i < 0) return []; const e = t.indexOf('\n)\n', i); return [...t.slice(i, e < 0 ? undefined : e).matchAll(/^\s*\[[A-Za-z.]+(?:\[\])?\]\s*\$([A-Za-z_][A-Za-z0-9_]*)/gm)].map((m) => m[1]); };
  const shadows = (raw, txt) => paramNames(raw).filter((n) => new RegExp('\\$script:' + n + '(?![A-Za-z0-9_])', 'i').test(txt) || new RegExp('^\\$' + n + '\\s*=', 'im').test(txt));
  const p1 = {
    driverParams: paramNames(DRV).join() === 'Serial,Apk,Steps,Repeats,Calibrate,KillRenderer,Flags,SeedIndex,HistorySeed',
    parserParams: paramNames(PAR).join() === 'RunDir',
    driverNoShadow: shadows(DRV, D).length === 0,
    parserNoShadow: shadows(PAR, P).length === 0,
    stateUntyped: count(D, '$script:HistSeedIdx = -1') === 1 && count(D, '$script:HistSeedIdx = $histNum') === 1 && count(D, '$script:HistSeedIdx = ') === 2,
    oldBugRed: shadows(DRV, D.split('$script:HistSeedIdx').join('$script:HistorySeed')).join() === 'HistorySeed' && shadows(DRV, D + '\n$Flags = 1\n').join() === 'Flags',
  };
  ok(F(p1).length === 0,
    '★ fixb3 walk (p1 paramShadow): no script-scope variable of adb-walk.ps1 or adb-walk-parse.ps1 has the name of a script parameter (names ignore case) — a typed parameter IS the script-scope variable, so `$script:HistorySeed = -1` kept [string[]] and the first walk of 2026-11-22 stopped at the run.json line; the -HistorySeed state is `$script:HistSeedIdx`, assigned exactly twice (-1, then the checked number); the old spelling and a top-level `$Flags = 1` turn the key red (self-test) — failing: ' + JSON.stringify(F(p1)));
}
