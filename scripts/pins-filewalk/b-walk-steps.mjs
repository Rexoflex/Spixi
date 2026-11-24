/* ==== filewalk item T — the WALK STEPS pin: the five opt-in steps of scripts/device/adb-walk.ps1 (scroll-files, scroll-voice,
 * scroll-photos, viewer, downloads) and their rows in scripts/device/adb-walk-parse.ps1 (docs/contract-filewalk.md § 3.2-3.4).
 *
 * Pure node (CI has no PowerShell step): SOURCE pins on the two scripts and on a52s.json, plus the BEHAVIOUR that can be read from the
 * text (the default step list computed from the two arrays, the allowlist compared with a FROZEN copy of the base list, the filter
 * regex run in a JavaScript RegExp, the gap messages of Get-StepGap simulated over the real a52s.json with and without the four keys,
 * the sweep patterns run on names, the derived dev-seed addresses). Statement sequences are compared as EXACT statements (comments
 * dropped, whitespace trimmed), so a one-token change of a guard is red. What it cannot prove (the fake-adb dry run on PowerShell
 * 7.4.6 did; nothing ran on a phone or on Windows PowerShell 5.1) is said in the builder's report, not here. The old walk pin
 * (pins-perfb1toggle/b-walk) still holds the frozen -Flags bodies and, whole, the two scripts: any edit of a script is red THERE
 * (re-base after a look at the diff, #1596); the keys below say WHAT about the new steps broke.
 * One `ok` per key, so a red line names the key:
 *   b1  steps          — the five steps are in AllSteps after scroll-image, in contract order, OPT-IN (not in DefaultSteps; the default
 *                        list computed from the two arrays = the 17 old steps)
 *   b2  allowlist      — the ONLY new allowlist entries are the five count polls (`<LogCmd> | grep -c -e <fixed token>`, exact strings); the
 *                        rest of PipedCmds / ShellAllow / FramePoll = a frozen copy of the base; $script:LogRe byte-identical to the base,
 *                        and the log lines the parser reads still pass it
 *   b3  noNewIo        — no `input text`, no new file path on the phone, no pm clear / uninstall, the adb verbs and input kinds unchanged;
 *                        the new functions send only logcat -c, the stamped fa start / taps / swipes / BACK
 *   b4  localKeys      — the three new local keys: the imageChatAddress shape (base58, 30-60, \A..\z, case-sensitive), appended to the
 *                        list the masks read ($script:Seeds), never printed raw
 *   b5  gaps           — a missing a52s key is a gap: Get-StepGap names taps.photoTile, taps.accountDownloads, screens.viewer,
 *                        screens.downloads (simulated); a missing local key names the key; the gap is read before any input
 *   b6  a52sCalibrated — a52s.json is byte-identical to the calibrated file (SHA-256): the operator block of 2026-11-17 added
 *                        taps.photoTile and screens.viewer (calibrate runs 20261117-1728 / -1732; proven 4 / 4 on cal-15 in 20261117-1739);
 *                        taps.accountDownloads and screens.downloads stay ABSENT (the Downloads row is below the first screen of the
 *                        Account hub at the phone's viewport, a render of the built shell: one tap cannot reach it), so the real
 *                        file gives `viewer` no gap and `downloads` the gap taps.accountDownloads. A later edit re-bases THIS key
 *                        (a52s.json is not in pins-perfb1toggle/b-walk)
 *   b7  failClosed     — a failed gate of `downloads` (and of `viewer`) sends no second input: Invoke-FileReset (a proven restart, no tap)
 *                        is the first and only action of the catch block; the gate counts exactly one send line and at least one frames
 *                        line; the order after the gate (Downloads check, scroll base, chatNewer / chatOlder, pull wait, pull, BACK, Chats tap)
 *   b8  noAccountShot  — no screenshot call (any call form) between the tabAccount tap and the accountDownloads gate pass (walk + calibrate)
 *   b9  pngDeleted     — Invoke-FileShot takes the PNG before its try, probes it inside, deletes it in a FINALLY; never recorded in the rep
 *   b10 parserRows     — the row names / units / required flags of contract § 3.4 exist exactly; a step absent from run.json adds no row;
 *                        the windowed rows read stamp2 (refused when <= t0); X-ScrollW and X-LongW need two scroll lines from stamp2 on (twoLine, longTwoLine);
 *                        the old X-Scroll is untouched; the driver stamps t0 before the first input and stamp2 before the first swipe / BACK
 *   b11 ps51           — both scripts and a52s.json are ASCII only, and no PowerShell 7-only syntax
 *   b12 shotRoutes     — the five steps (and the restart proof) take a screenshot ONLY through Invoke-FileShot (via its two wrappers or
 *                        in Invoke-FileReset), never by Save-Shot / Test-Screen / screencap / Invoke-ShotCheck / Invoke-PreCheck
 *   b13 fileReset      — a restart goes ONLY through Invoke-FileReset: stored pid, Reset-AppToChats, pid after, then a fresh home shot;
 *                        proven = FileResetOk, not proven = Halted + HaltNote (no further input); -Calibrate uses Invoke-CalReset
 *   b14 tapsInTry      — the tabAccount / photoTile tap command is the first statement of the try (a catch always runs the restart)
 *   b15 pngSweep       — Clear-FileStepPngs: the two anchored patterns (shot-<step>-*.png of the five steps; cal-reset-NN.png), five call
 *                        sites (end of each new step, main finally, right after Invoke-CalFileTaps)
 *   b16 seedAddr       — fileChatAddress / voiceChatAddress / photoChatAddress must EQUAL the derived address of Seed 54 / 55 / 56,
 *                        imageChatAddress one of Seed 51-53 (base58 derivation compared with six test vectors)
 *   b17 filePull       — Wait-FilePull is bounded (<= 4000 ms) and stands directly before each new log pull
 *   b18 ge0            — X-FirstNonNeg / X-SendLine take the first value >= 0 (`($v -ge 0)`): -1 = no tap seen = no value
 *   b19 stepEndGuards  — the two step-end `-not $script:Halted` guards (Invoke-Walk's file branch, Invoke-ViewerStep), exact statements;
 *                        no EnsureHome / Back after a halt
 *   b20 calGuards      — CalSkip12 assigned from $skip12 (last statement of Invoke-CalNewTaps) and its early `return` in
 *                        Invoke-CalFileTaps; the `return` after a failed cal-17a home check
 *   b21 repPid         — Save-FileRepPid exact; it runs before the first tap of each viewer / downloads rep and before cal-15 / cal-17
 *                        (a failed read = no tap); Invoke-FileReset compares with the STORED pid and shoots only after the proof
 *   b22 shotCallers    — whole file: the only callers of Save-Shot / `screencap` are a named list; the commands each function of the five
 *                        steps calls are a FROZEN list (a new helper called from a rep is red until reviewed)
 *   b23 scrollBase     — Get-ScrollBase is read before the stamp2 command; the pull waits for `($sbase + 1)` (bounded); chat steps swipe
 *                        chatOlder first, downloads chatNewer first
 *   b24 scriptBytes    — SHA-256 of the RAW BYTES of adb-walk.ps1 and of adb-walk-parse.ps1 (no stripping, no white-space change): any byte
 *                        change turns it red; re-base only after a look at the diff (DECISIONS 1596) and re-run b1-b23. Diagnostics
 *                        only: raw per-function hashes and the script-level remainder name where the bytes moved
 * photo1a (2026-11-17), re-based after a look at the diff (DECISIONS 1596 / 1634): b1 + b10 (the two new opt-in steps open-seed, mem-photos at the END of AllSteps / OptInSteps; the legend rows), b2 (one new PipedCmds entry: the chatmedia count poll; ShellAllow unchanged), b15 (the step-name regex takes open-seed), b21 (Save-FileRepPid sites 5 → 7), b24 (the two raw hashes + the diagnostics of the five changed driver functions and Invoke-Main of the parser).
 * 2026-11-17 (photo1a, review round 1, scope C-walk; re-based after a look at the diff, DECISIONS 1596): b15 (call sites 5 -> 6: Clear-FileStepPngs at the end of Invoke-OpenSeedStep), b24 (the two raw hashes and the two script-level remainders; the per-function diagnostics of the old functions did not move).
 * 2026-11-17 (photo1a, review round 2, scope C-walk; after a look at the diff): b21 pidVarUses ($script:FileRepPid 5 -> 7, Save-FileRepPid 7 -> 8: the warm key and its decision in open-seed), b24 re-based again (the two raw hashes and the driver remainder; the parser is unchanged; no old function moved).
 * 2026-11-18 (fixb3, scope C-walk; re-based after a look at the diff, DECISIONS 1596 / 1739 (3)): the downloads rep gets ONE swipe + the scrolled-hub check before the tap: b3 newFnTaps (+ the swipe key), b7 inputsToGate (3 -> 4 inputs, the swipe second), b8 twoShotCalls / noneBetween / firstAfterGate / noneAfterShotCheck (two -> three screenshots: the scrolled-hub check is the only one between the Account tap and the gate; this REPLACES the old rule `no screenshot on the Account screen`), b12 fileShotCallers (3 -> 4 Invoke-FileShot callers), b22 callSets (Invoke-DownloadsRep also calls Get-Nn, Invoke-FileShot), b23 downloadsFirstChatNewer (3 swipes, the chatNewer swipe still first of the two old ones); -HistorySeed: b15 regexExact (the sweep line has a third pattern), b21 pidVarUses (Save-FileRepPid 8 -> 9); b24 re-based (raw hashes 2fc646d6... -> a39d8dc2... (the lead added one EnsureHome line to Invoke-HistorySeedRestart before the push, as open-seed), 319d7f18... -> 1314d8e1..., and the diagnostic constants of the moved functions); b20 skip12Assign stays green (the new state variable stands above CalSkip12).
 * 2026-11-18 (fixb3, review round 1, scope C-walk; after a look at the diff): b8 (m2: exactly ONE Invoke-CalAccountScroll call between the tabAccount tap and the gate of Invoke-CalFileTaps, and exactly ONE Save-CalShot (cal-17s) in the bodies of Invoke-CalAccountScroll + Invoke-CalHubBack, none in the way back), b15 (the history-seed reset counter is 2..4 digits), b24 re-based again (raw hashes a39d8dc2... -> 3e407de2..., 1314d8e1... -> cf42f078...; the moved functions: Clear-FileStepPngs, Invoke-DownloadsRep and Invoke-CalFileTaps (comments), Complete-Rep (`pages`), Get-EstimateSec (the downloads estimate), parser New-Ctx / New-RepCtx / Invoke-Main (Pages, the legend)).
 * 2026-11-18 (fixb3, review round 2, scope C-walk; after a look at the diff, #1596): b15 callSites 6 -> 7 (Invoke-HistorySeedStep ends with Clear-FileStepPngs, NIT 5), b22 callSets Clear-FileStepPngs + Clear-CalAccountPng (m2 b: the sweep deletes cal-17s-account-scrolled.png once screens.accountScrolled is set), b24: the two whole-file hashes, the script-level hashes of both scripts, Clear-FileStepPngs and the parser Invoke-Main (the legend text) re-based (the other function hashes are unchanged).
 * 2026-11-18 (fixb3, review round 3, scope C-walk; after a look at the diff, #1596): b24 re-based again (driver eca79886... -> acd8ed6e...: the swipe note of Invoke-CalAccountScroll adds the gap text of a present but invalid swipes.accountDownloads; parser 826f74d1... -> 4a80770b...: X-SeedPagesGate / X-SeedGated, every row of history-seed-kNN gated on pages >= 1; moved: the script-level remainders of both files and Invoke-Main (legend))
 * 2026-11-22 (fixb3, operator block; after a look at the diff, #1596): the driver hash re-based again (acd8ed6e... -> 44ebb3b9...): the -HistorySeed
 *   state variable is renamed $script:HistorySeed -> $script:HistSeedIdx in six lines (a typed script parameter IS the script-scope variable; the
 *   first walk run stopped at the run.json line). No other byte changed; the parser is unchanged.
 * Deliberate breaks (#802, the filewalk pins report): one-token mutations in a full copy of the tree, each red for the named key(s). */
import { createHash } from 'node:crypto';
export default async function (h) {
  const { ok, root, readFileSync, join } = h;
  const raw = (f) => readFileSync(join(root, f), 'utf8').replace(/\r\n/g, '\n');   // a CRLF checkout reads as LF
  const DRV = raw('scripts/device/adb-walk.ps1');
  const PAR = raw('scripts/device/adb-walk-parse.ps1');
  const A52 = raw('scripts/device/a52s.json');
  const sha = (x) => createHash('sha256').update(x).digest('hex');
  const F = (o) => Object.entries(o).filter(([, v]) => v !== true).map(([k]) => k);
  const code = (t) => t.replace(/<#[\s\S]*?#>/g, '').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');   // block + whole-line comments
  const D = code(DRV), P = code(PAR);
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
  const fnD = (name) => fnPS(D, name);   // the body without comment lines
  const stm = (body) => body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.replace(/throw '[^']*'/g, "throw 'X'"));
  const lit = (t, lhs) => {   // the single-quoted literal assigned to `lhs` (a PowerShell '' is one quote)
    const i = t.indexOf(lhs); if (i < 0) return null;
    const m = /^\s*(?:New-Rx\s+)?'((?:[^']|'')*)'/.exec(t.slice(i + lhs.length)); return m ? m[1].replace(/''/g, "'") : null;
  };
  const js = (re) => new RegExp(re.replace(/\\A/g, '^').replace(/\\z/g, '$'));
  const psList = (t, lhs) => { const i = t.indexOf(lhs); if (i < 0) return null; const o = t.indexOf('@(', i); const e = t.indexOf(')', o); return (o < 0 || e < 0) ? null : [...t.slice(o, e).matchAll(/'([^']*)'/g)].map((m) => m[1]); };
  const listItems = (t, start) => { const a = t.indexOf(start); if (a < 0) return []; const s = a + start.length; const e = t.indexOf('\n    )', s); return t.slice(s, e).split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.replace(/,$/, '')); };
  const idx = (st, pred) => st.findIndex(pred);
  const NEW5 = ['scroll-files', 'scroll-voice', 'scroll-photos', 'viewer', 'downloads'];
  const WALKTOOLS2 = ['coldstart-watch'];   // ★ walktools2 re-base (2026-11-23): one more opt-in step, LAST in AllSteps / OptInSteps (b1, b10)
  const PHOTO1A = ['open-seed', 'mem-photos'];   // photo1a (2026-11-17): two more opt-in steps at the END of AllSteps / OptInSteps (b1, b10 re-based)
  const BASE17 = ['coldstart', 'mem-home', 'chat-intent', 'chat-tap', 'scroll', 'resume', 'resume-long', 'network', 'mem-end', 'mem-trim', 'resume-now', 'resume-3s', 'chatinfo', 'tab-apps', 'tab-wallet', 'tab-account', 'history'];
  // an input call = anything that sends a tap / swipe / key / start to the phone
  const INPUT = /Invoke-ShellReq|Invoke-Shell\b|Invoke-BackReq|Invoke-Back\b|Get-TapText|Get-SwipeText|Invoke-Adb|Invoke-CalInput|\binput |am start/;
  const SHOT = /^(Invoke-ShotCheck|Invoke-PreCheck|Save-Shot|Save-CalShot|Test-Screen)\b|screencap/;

  /* ── b1 · the five steps are opt-in, after scroll-image ── */
  const all = psList(D, '$script:AllSteps = ') || [], opt = psList(D, '$script:OptInSteps = ') || [];
  const defJs = all.filter((s) => !opt.includes(s));   // what `Where-Object { $script:OptInSteps -cnotcontains $_ }` keeps
  const defLine = D.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('$script:DefaultSteps ='));
  const b1 = {
    found: all.length > 0 && opt.length > 0,
    allOrder: all.join() === [...BASE17, 'scroll-image', ...NEW5, ...PHOTO1A, ...WALKTOOLS2].join(),
    afterScrollImage: all.indexOf('scroll-image') === 17 && NEW5.every((s, i) => all[18 + i] === s),
    optIn: opt.join() === ['scroll-image', ...NEW5, ...PHOTO1A, ...WALKTOOLS2].join(),
    defaultRule: defLine.length === 1 && defLine[0] === '$script:DefaultSteps = @($script:AllSteps | Where-Object { $script:OptInSteps -cnotcontains $_ })',
    defaultList: defJs.join() === BASE17.join() && NEW5.every((s) => !defJs.includes(s)),
    oneAssign: count(D, '$script:DefaultSteps =') === 1 && count(D, '$script:OptInSteps =') === 1 && count(D, '$script:AllSteps =') === 1,
    usedAsDefault: D.includes('if ($want.Count -eq 0) { $script:StepsReq = @($script:DefaultSteps) }'),
    namedKeepOrder: D.includes('else { $script:StepsReq = @($script:AllSteps | Where-Object { $want -contains $_ }) }'),
  };
  ok(F(b1).length === 0,
    '★ filewalk walk steps (b1 steps): scroll-files, scroll-voice, scroll-photos, viewer and downloads are in AllSteps right after scroll-image (contract order) and are OPT-IN — OptInSteps = scroll-image + the five, DefaultSteps = AllSteps minus OptInSteps = the 17 old steps, a named list keeps the AllSteps order — failing: ' + JSON.stringify(F(b1)));

  /* ── b2 · the allowlist: only the five count polls are new; the filter is byte-identical ── */
  // FROZEN copies of the base (efcde241) lists, one line of the script text each (a trailing comma cut)
  const BASE_PIPED = [
    "$script:PollCmd",
    "$script:LoadPollCmd",
    "$script:FramePoll['apps']",
    "$script:FramePoll['wallet']",
    "$script:FramePoll['account']",
    "$script:FramePoll['chats']",
    "$script:FramePoll['settings']",
    "$script:FramePoll['settingsclosed']",
    "$script:FramePoll['flagsstored']",
    "$script:FramePoll['flagsstate']",
    "'dumpsys window | grep -e mCurrentFocus='",
    "'dumpsys window | grep -e mDreamingLockscreen= -e isKeyguardShowing= -e mShowingLockscreen= -e mKeyguardShowing= -e mCurrentFocus='",
    "'dumpsys activity activities | grep -e mKeyguardShowing='",
    "'dumpsys power | grep -e mWakefulness='",
    "('dumpsys package ' + $script:Pkg + ' | grep -e versionName= -e versionCode= -e lastUpdateTime=')",
    "'dumpsys display | grep -i -e framerate'",
    "'ps -A | grep -e sandboxed'",
    "'dumpsys wifi | grep -e Wi-Fi.is'"
  ];
  const BASE_ALLOW = [
    "'^date \\+%m-%dT%H:%M:%S\\.%N\\z'",
    "('^am force-stop ' + $pe + '\\z')",
    "('^am start -W -n ' + $ce + '\\z')",
    "('^am start -n ' + $ce + '\\z')",
    "('^am start -n ' + $ce + ' --es fa [1-9A-HJ-NP-Za-km-z]{30,60}\\z')",
    "('^am start -n ' + $ce + ' --es perfb1flags warmidle=[01],sparerearm=[01],sparekeep=[01],noemptydetail=[01]\\z')",
    "('^am send-trim-memory ' + $pe + ' RUNNING_LOW\\z')",
    "'^logcat -c\\z'",
    "'^logcat -G 16M\\z'",
    "'^input tap [0-9]{1,5} [0-9]{1,5}\\z'",
    "'^input swipe [0-9]{1,5} [0-9]{1,5} [0-9]{1,5} [0-9]{1,5} [0-9]{1,5}\\z'",
    "'^input keyevent (3|4|KEYCODE_WAKEUP)\\z'",
    "'^wm dismiss-keyguard\\z'",
    "'^wm size\\z'",
    "'^wm density\\z'",
    "'^getprop ro\\.(product\\.model|build\\.version\\.release|build\\.version\\.sdk)\\z'",
    "'^dumpsys battery\\z'",
    "'^dumpsys activity activities\\z'",
    "'^dumpsys activity services [A-Za-z0-9_]+(\\.[A-Za-z0-9_]+)+\\z'",
    "('^dumpsys package ' + $pe + '\\z')",
    "'^dumpsys meminfo [0-9]{1,9}\\z'",
    "('^pm path ' + $pe + '\\z')",
    "('^cmd package resolve-activity --brief -c android\\.intent\\.category\\.LAUNCHER ' + $pe + '\\z')",
    "'^settings get global (stay_on_while_plugged_in|zen_mode)\\z'",
    "'^settings put global stay_on_while_plugged_in ([0-9]|1[0-5])\\z'",
    "'^svc power stayon usb\\z'",
    "'^svc wifi (enable|disable)\\z'",
    "'^screencap -p /data/local/tmp/adbwalk-shot\\.png\\z'",
    "'^rm -f /data/local/tmp/adbwalk-(shot\\.png|log\\.txt)\\z'",
    "('^pidof ' + $pe + '\\z')",
    "'^kill [0-9]{1,9}\\z'"
  ];
  const BASE_FP = [
    "apps = ($script:LogCmd + ' | grep -c -e P1..shell.frames-tab-apps')",
    "wallet = ($script:LogCmd + ' | grep -c -e P1..shell.frames-tab-wallet')",
    "account = ($script:LogCmd + ' | grep -c -e P1..shell.frames-tab-account')",
    "chats = ($script:LogCmd + ' | grep -c -e P1..shell.frames-tab-chats')",
    "settings = ($script:LogCmd + ' | grep -c -e P1..frames.open-settingspage')",
    "settingsclosed = ($script:LogCmd + ' | grep -c -e P1..close.settingspage.done')",
    "flagsstored = ($script:LogCmd + ' | grep -c -e FLAGS..perfb1.extra.stored')",
    "flagsstate = ($script:LogCmd + ' | grep -c -e FLAGS..warmidle=')"
  ];
  const allowFn = fnD('Initialize-Allowlist');
  const pipedNow = listItems(allowFn, '$script:PipedCmds = @('), allowNow = listItems(allowFn, '$script:ShellAllow = @(');
  const WATCH_PIPED = ['$script:WatchEventsCmd'];   // ★ walktools2 re-base (2026-11-23): the base + the eight count polls + exactly ONE more PipedCmds string, the events pull of coldstart-watch (exact string held by pins-walktools2/b-coldwatch k1)
  const NEW_PIPED = ['viewimage', 'overlayopen', 'loaddownloads', 'subscreenopen', 'subscreenclose', 'scrolllines', 'overlayclose', 'chatmedia'].map((k) => "$script:FramePoll['" + k + "']");
  const NEW_CMDS = ['P1..shell.send.viewimage', 'P1..shell.frames-overlay-open', 'P1..shell.send.loaddownloads', 'P1..shell.frames-subscreen-open', 'P1..shell.frames-subscreen-close', 'P1..shell.scroll', 'P1..shell.frames-overlay-close', 'P1..chat.media']
    .map((t) => 'logcat -d -v threadtime -s DOTNET:I | grep -c -e ' + t);
  const fpBlock = (() => { const i = D.indexOf('$script:FramePoll = @{'); const e = D.indexOf('\n}', i); return i < 0 ? '' : D.slice(i, e); })();
  const fpNow = fpBlock.split('\n').map((l) => l.trim()).filter((l) => /^\w+ = \(/.test(l));
  const fpNew = fpNow.filter((l) => !BASE_FP.includes(l));
  const fpCmds = fpNew.map((l) => { const m = /^(\w+) = \(\$script:LogCmd \+ ' \| grep -c -e ([^' ]+)'\)$/.exec(l); return m ? 'logcat -d -v threadtime -s DOTNET:I | grep -c -e ' + m[2] : null; });
  const logRe = lit(D, '$script:LogRe =') || '';
  const BASE_LOGRE_SHA = 'a22d2dbaa96566788330114cca740fed5851d4ba7dafe55b115fea6195bfde3b';
  const full = logRe ? js(logRe) : /(?!)/;
  const stamp = '05-20 12:00:00.123 4242 4243 I DOTNET  : 05-20 12:00:00.1234|info|7: ';
  const LINES = [   // every log line the five steps read (contract § 3.3), as the app writes them
    '[P1] open singlechatpage present ms=310', '[P1] frames open-singlechatpage n=22 drop=1 max=34', '[P1] shell scroll chat ms=520 n=31 drop=2 max=41', '[P1] shell longtask chat ms=61',
    '[P1] shell send viewimage dt=9', '[P1] shell overlay-open first=150', '[P1] shell frames-overlay-open n=20 drop=0 max=18', '[P1] shell frames-overlay-close n=15 drop=0 max=17',
    '[P1] shell send loaddownloads dt=13', '[P1] shell subscreen-open first=205', '[P1] shell frames-subscreen-open n=31 drop=1 max=36', '[P1] shell frames-subscreen-close n=12 drop=0 max=20',
    '[P1] shell scroll settings ms=480 n=29 drop=1 max=35'];
  const b2 = {
    found: allowFn.length > 0 && pipedNow.length > 0 && allowNow.length > 0 && fpBlock.length > 0,
    pipedBase: pipedNow.filter((x) => !NEW_PIPED.includes(x) && !WATCH_PIPED.includes(x)).join('\n') === BASE_PIPED.join('\n'),
    pipedFive: NEW_PIPED.concat(WATCH_PIPED).every((x) => pipedNow.filter((y) => y === x).length === 1) && pipedNow.length === BASE_PIPED.length + 9,
    shellAllowSame: allowNow.join('\n') === BASE_ALLOW.join('\n') && allowNow.length === 31,
    framePollBase: BASE_FP.every((l) => fpNow.includes(l)) && fpNow.length === BASE_FP.length + 8,
    fiveExact: fpCmds.join('\n') === NEW_CMDS.join('\n'),
    countOnly: fpNew.length === 8 && fpNew.every((l) => !l.includes('grep -E') && !l.includes('>') && !l.includes(';')) && D.includes("$script:LogCmd = 'logcat -d -v threadtime -s DOTNET:I'"),
    logReSame: logRe.length === 529 && sha(logRe) === BASE_LOGRE_SHA,
    linesPass: LINES.every((m) => full.test(stamp + m)),
    newFnNoPipe: !/\|/.test(fnD('Invoke-FileChatRep') + fnD('Invoke-ViewerRep') + fnD('Invoke-ViewerStep') + fnD('Invoke-DownloadsRep') + fnD('Wait-FileGate')),
  };
  ok(F(b2).length === 0,
    '★ filewalk walk steps (b2 allowlist): the ONLY new allowlist entries are SEVEN count polls: the five gates (`logcat -d -v threadtime -s DOTNET:I | grep -c -e P1..shell.send.viewimage / .frames-overlay-open / .send.loaddownloads / .frames-subscreen-open / .frames-subscreen-close`) and the two mirror waits (`... -e P1..shell.scroll` / `... -e P1..shell.frames-overlay-close`), in FramePoll and PipedCmds; ShellAllow and the rest of PipedCmds / FramePoll = a frozen copy of the base; $script:LogRe is byte-identical to the base (529 chars, SHA-256) and every line the five steps read still passes it — failing: ' + JSON.stringify(F(b2)) + ' fpNew=' + JSON.stringify(fpNew.length));

  /* ── b3 · no `input text`, no new file on the phone, no pm / uninstall ── */
  const NEWFN = ['Set-RepStamp2', 'ConvertTo-Base58', 'Get-DevSeedAddress', 'Clear-FileStepPngs', 'Invoke-FileShot', 'Invoke-FileShotCheck', 'Invoke-FilePreCheck', 'Invoke-FileReset', 'Wait-FilePull', 'Wait-FileGate', 'Invoke-FileChatRep', 'Invoke-ViewerRep', 'Invoke-ViewerStep', 'Invoke-DownloadsRep', 'Test-CalGateShot', 'Invoke-CalReset', 'Invoke-CalFileTaps'];
  const newBody = NEWFN.map(fnD).join('\n');
  const uniq = (a) => [...new Set(a)].sort();
  const BASE_PATHS = ['/data/local/tmp/adbwalk-(shot\\.png', '/data/local/tmp/adbwalk-log.txt', '/data/local/tmp/adbwalk-shot.png', '/data/local/tmp/adbwalk-shot\\.png\\z'];
  const shellLits = uniq([...newBody.matchAll(/'([^'\n]*)'/g)].map((m) => m[1]).filter((s) => /^(; )?(logcat|am |input |date|dumpsys|pm |svc|wm|rm |settings (get|put)|kill|getprop|cmd |screencap|pidof)/.test(s)));
  const b3 = {
    found: newBody.length > 0 && NEWFN.every((n) => fnD(n).length > 0),
    noInputText: !/input\s+text/i.test(D) && !/input\s+text/i.test(P) && !/input\s+text/i.test(newBody),
    inputKinds: uniq([...D.matchAll(/'(?:\^|; )?input\s+([a-z]+)/g)].map((m) => m[1])).join() === 'keyevent,swipe,tap' && [...allowFn.matchAll(/'\^input ([a-z]+)/g)].map((m) => m[1]).join() === 'tap,swipe,keyevent',
    noPmClear: !/\buninstall\b/.test(D + P) && !/pm\s+(clear|uninstall|install|grant|revoke|disable|enable)/.test(D + P) && [...D.matchAll(/\bpm\s+(\w+)/g)].every((m) => m[1] === 'path'),
    adbVerbs: uniq([...D.matchAll(/Test-Ordinal \$verb '([\w-]+)'/g)].map((m) => m[1])).join() === 'devices,install,pull,shell,start-server',
    phonePaths: uniq([...D.matchAll(/\/(?:data|sdcard|storage|mnt)\/[^\s'"|)]*/g)].map((m) => m[0])).join('\n') === BASE_PATHS.join('\n') && D.includes('$script:PhoneFiles = @($script:PhoneShot, $script:PhoneLog)'),
    newFnNoPaths: !/\/(data|sdcard|storage|mnt)\b|screencap|\bpush\b|\bpull\b|install|\brm\b| > /.test(newBody.replace(/Wait-Ms[^\n]*/g, '')),
    newFnShell: shellLits.join('\n') === ['; am start -n ', '; input keyevent 4', 'am start -n ', 'logcat -c', 'pidof '].join('\n'),
    newFnTaps: uniq([...newBody.matchAll(/Get-TapText '(\w+)'/g)].map((m) => m[1])).join() === 'accountDownloads,photoTile,tabAccount,tabChats' && uniq([...newBody.matchAll(/Get-SwipeText '(\w+)'/g)].map((m) => m[1])).join() === 'accountDownloads,chatNewer,chatOlder',
    noCoordinates: !/input (tap|swipe) [0-9]/.test(newBody) && !/\$tap\.x|\$sw\.x1/.test(newBody),
  };
  ok(F(b3).length === 0,
    '★ filewalk walk steps (b3 noNewIo): no `input text` anywhere (input kinds stay tap, swipe, keyevent), no new file path on the phone (the base set of /data/local/tmp names), no pm clear / uninstall (`pm path` only), the adb verbs stay devices, install, pull, shell, start-server; the new functions send only logcat -c, the stamped fa start, taps / swipes by the a52s.json names and one BACK — failing: ' + JSON.stringify(F(b3)) + ' shell=' + JSON.stringify(shellLits));

  /* ── b4 · the three new local keys: the imageChatAddress shape, masked as a seed ── */
  const mainLoc = (() => { const i = D.indexOf('$lj = Read-JsonFile $localJson'); return i < 0 ? '' : D.slice(i, D.indexOf("} catch { Write-Host 'adb-walk: walk.local.json is unreadable", i)); })();
  const imgRe = (/\$img -cmatch '([^']*)'/.exec(mainLoc) || [])[1] || '', seedRe = (/\$str -cmatch '([^']*)'/.exec(mainLoc) || [])[1] || '', fileRe = (/\$fileAddr -cmatch '([^']*)'/.exec(mainLoc) || [])[1] || '';
  const fJs = fileRe ? js(fileRe) : /(?!)/;
  const GOODS = ['yc4GDJ3r7ZVc2qz5VMgZfZDmJVZbtXZGmayyHczDvV9T', '8SVM5jGU5EjLs8zrAnijQAHy9WFp7SyYBjvFBnUZSNTD', 'PM6oQ2NcWVn2RNagKZ58sFy76HJ3zrCJq9uUwkuHSAbZ', 'PzWjeuzaTuyZ9bAaZ2xVrCf1rtACAXgo8c4MkaacXsr7'];
  const BADS = ['0OIl-not-base58', '', 'yc4GDJ3r7ZVc2qz5VMgZfZDmJVZbtXZGmayyHczDvV9T\n', ' yc4GDJ3r7ZVc2qz5VMgZfZDmJVZbtXZGmayyHczDvV9T', 'yc4GDJ3r7ZVc2qz5VMgZfZDmJVZbtXZGmayyHczDvV9T0', 'a'.repeat(29), 'a'.repeat(61), '0'.repeat(44), 'l'.repeat(44), 'yc4GDJ3r7ZVc2qz5VMgZfZDmJVZbtXZGmayyHczDv\u0661T'];
  const maskFn = fnD('Protect-Text');
  const seedUse = D.split('\n').filter((l) => l.includes('$fileAddr'));
  const b4 = {
    found: mainLoc.length > 0 && imgRe.length > 0 && fileRe.length > 0,
    keysExact: mainLoc.includes("foreach ($fileKey in @('fileChatAddress', 'voiceChatAddress', 'photoChatAddress')) {") && count(mainLoc, '$fileKey in') === 1,
    sameShapeAsImage: fileRe === imgRe && fileRe === seedRe && fileRe === '^[1-9A-HJ-NP-Za-km-z]{30,60}\\z' && !/\(\?i\)|-match '/.test(mainLoc),
    caseSensitive: /\$fileAddr -cmatch '/.test(mainLoc) && !/\$fileAddr -(i)?match/.test(mainLoc),
    behaviour: GOODS.every((a) => fJs.test(a)) && BADS.every((a) => !fJs.test(a)),
    readOnlyThree: count(mainLoc, 'Get-Field $lj ') === 3 && mainLoc.includes('$fileAddr = [string](Get-Field $lj $fileKey)'),
    appendedToSeeds: count(mainLoc, '$script:Seeds.Add($fileAddr)') === 1 && count(D, '$script:Seeds.Add(') === 4 && mainLoc.indexOf('$script:Seeds.Add($fileAddr)') > mainLoc.indexOf("$fileAddr -cmatch '") && mainLoc.indexOf('$script:Seeds.Add($fileAddr)') < mainLoc.indexOf('$want = '),
    maskedAsSeed: /for \(\$i = 0; \$i -lt \$script:Seeds\.Count; \$i\+\+\) \{\s*\$s = \$script:Seeds\[\$i\]\s*if \(\$s\) \{ \$t = \$t\.Replace\(\[string\]\$s, '<seed ' \+ \$i \+ '>'\) \}\s*\}/.test(maskFn),
    neverPrinted: seedUse.length >= 2 && seedUse.every((l) => !/Write-Host|Say|Write-WalkLog|Add-Note/.test(l)) && !/FileKeyNote\[\$fileKey\] = [^\n]*\$fileAddr/.test(mainLoc),
    mapExact: D.includes("$script:FileChatKeys = @{ 'scroll-files' = 'fileChatAddress'; 'scroll-voice' = 'voiceChatAddress'; 'scroll-photos' = 'photoChatAddress' }") && D.includes("$script:FileSeed = @{ 'fileChatAddress' = -1; 'voiceChatAddress' = -1; 'photoChatAddress' = -1 }"),
    usedViaGetSeed: fnD('Invoke-FileChatRep').includes('$addr = Get-Seed $script:FileSeed[$script:FileChatKeys[$Rec.step]]') && count(D, '$script:FileSeed[') === 3,
  };
  ok(F(b4).length === 0,
    '★ filewalk walk steps (b4 localKeys): fileChatAddress, voiceChatAddress and photoChatAddress are checked with the SAME case-sensitive shape as imageChatAddress (base58, 30-60 characters, \\A..\\z; the extracted regex accepts the four fixture addresses and refuses near misses), appended to $script:Seeds (the list Protect-Text masks as <seed k>) BEFORE the derived-address compare, read only through Get-Field in that one loop and never printed — failing: ' + JSON.stringify(F(b4)));

  /* ── b5 · a missing key is a gap (no input), simulated over the real a52s.json ── */
  const needOf = (step) => { const m = new RegExp("\\$Step -eq '" + step + "'\\) \\{ \\$need = @\\(([^)]*)\\) \\}").exec(D); return m ? [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]) : null; };
  const stepGapFn = fnD('Get-StepGap'), tapGapFn = fnD('Get-TapGap'), scrGapFn = fnD('Get-ScreenGap');
  const gapOf = (step, cfg, hasImage) => {   // Get-StepGap over the need list read from the script (swipes / counts are present in the real file)
    for (const n of needOf(step) || ['?:missing']) {
      const i = n.indexOf(':'), kind = n.slice(0, i), name = n.slice(i + 1);
      if (kind === 'tap' && !(cfg.taps && cfg.taps[name])) return 'a52s.json has no taps.' + name;
      if (kind === 'screen' && !(cfg.screens && cfg.screens[name])) return 'a52s.json has no screens.' + name;
      if (kind === 'swipe' && !(cfg.swipes && cfg.swipes[name])) return 'a52s.json has no swipes.' + name;
      if ((kind === 'image' || kind === 'vimage') && !hasImage) return 'no image key';
      if (kind === '?') return 'no need list';
    }
    return '';
  };
  let cfgReal = {}; try { cfgReal = JSON.parse(A52); } catch (e) { cfgReal = {}; }
  // b5 simulates over the real file WITHOUT the four new keys, so it stays green after the operator block fills them (b6 is then the key that is re-based)
  const cfg0 = JSON.parse(JSON.stringify(cfgReal)); for (const [g, k] of [['taps', 'photoTile'], ['taps', 'accountDownloads'], ['screens', 'viewer'], ['screens', 'downloads']]) { if (cfg0[g]) delete cfg0[g][k]; }
  const withKeys = (c, drop) => { const o = JSON.parse(JSON.stringify(c)); o.taps.photoTile = { x: 540, y: 900 }; o.taps.accountDownloads = { x: 540, y: 700 }; o.screens.viewer = { probes: [{ x: 10, y: 10, rgb: '#000001', tol: 5 }], minMatch: 1 }; o.screens.downloads = { probes: [{ x: 10, y: 10, rgb: '#000002', tol: 5 }], minMatch: 1 };
    if (drop) { const [g, k] = drop.split('.'); delete o[g][k]; } return o; };
  const b5 = {
    found: stepGapFn.length > 0 && !!needOf('viewer') && !!needOf('downloads'),
    needViewer: (needOf('viewer') || []).join() === 'tap:photoTile,screen:chat,screen:viewer,image:,vimage:',
    needDownloads: (needOf('downloads') || []).join() === 'tap:tabAccount,tap:accountDownloads,tap:tabChats,swipe:chatOlder,swipe:chatNewer,screen:home,screen:downloads',
    needFiles: stepGapFn.includes("elseif ($script:FileChatKeys.ContainsKey($Step)) { $need = @('swipe:chatOlder', 'swipe:chatNewer', 'screen:chat', ('key:' + $script:FileChatKeys[$Step])) }"),
    realFileViewerGap: gapOf('viewer', cfg0, true) === 'a52s.json has no taps.photoTile',
    realFileDownloadsGap: gapOf('downloads', cfg0, true) === 'a52s.json has no taps.accountDownloads',
    allKeysNoGap: gapOf('viewer', withKeys(cfg0), true) === '' && gapOf('downloads', withKeys(cfg0), true) === '',
    photoTile: gapOf('viewer', withKeys(cfg0, 'taps.photoTile'), true) === 'a52s.json has no taps.photoTile',
    screenViewer: gapOf('viewer', withKeys(cfg0, 'screens.viewer'), true) === 'a52s.json has no screens.viewer',
    accountDownloads: gapOf('downloads', withKeys(cfg0, 'taps.accountDownloads'), true) === 'a52s.json has no taps.accountDownloads',
    screenDownloads: gapOf('downloads', withKeys(cfg0, 'screens.downloads'), true) === 'a52s.json has no screens.downloads',
    gapTexts: tapGapFn.includes("if ($null -eq $tap) { return ('a52s.json has no taps.' + $Name) }") && scrGapFn.includes("if ($null -eq $scr) { return ('a52s.json has no screens.' + $Name) }"),
    kinds: stepGapFn.includes("if ($kind -eq 'screen') { $gap = Get-ScreenGap $name }") && stepGapFn.includes("elseif ($kind -eq 'tap') { $gap = Get-TapGap $name }") && stepGapFn.includes("elseif ($kind -eq 'key') {") && stepGapFn.includes('if ($script:FileSeed[$name] -lt 0) {') && stepGapFn.includes("else { $gap = ('walk.local.json has no valid ' + $name + ' (the file seed of batch filewalk)') }") && stepGapFn.includes("elseif ($kind -eq 'vimage') { if (-not $script:ImageViewerOk) {") && stepGapFn.includes('if ($gap) { return $gap }'),
    gapBeforeInput: (() => { const s = fnD('Invoke-Step'); const a = s.indexOf('$gap = Get-StepGap $Step'), b = s.indexOf('elseif ($gap) { $skip = $gap }'), c = s.indexOf('Invoke-RepBody $rec'); return a > 0 && b > a && c > b; })() && fnD('Invoke-ViewerStep').includes("if (-not (Get-StepGap 'viewer') -and -not $script:Halted) {"),
  };
  ok(F(b5).length === 0,
    '★ filewalk walk steps (b5 gaps): a missing a52s.json key is a gap read before any input — Get-StepGap (simulated over the need list of the script and the real a52s.json) names taps.photoTile and screens.viewer for `viewer`, taps.accountDownloads and screens.downloads for `downloads`; a missing local key names fileChatAddress / voiceChatAddress / photoChatAddress; Invoke-Step skips every rep with the gap before Invoke-RepBody — failing: ' + JSON.stringify(F(b5)));

  /* ── b6 · a52s.json: the calibrated file (photoTile + viewer; the two Downloads keys stay absent) ── */
  // ★ fixb3 operator block 2026-11-22 (re-base after the map commit, as planned in #1812 / P86): calibrate-20261122-1324 gave
  // taps.accountDownloads, swipes.accountDownloads and screens.accountScrolled; screens.downloads stays absent until the proof run.
  // Was c69474965f8f28aefa5c49314c36082e935f6a241abee1b9f56701228240f43f (the map of 2026-11-17).
  // ★ walktools operator block 2026-11-23 (#1879; re-based after a look at the diff): screens.chat and screens.viewer in the `sets`
  // form (light / dark, chrome-only probes, minMatch = the probe count); every other key unchanged. Was 898fad40…29ce8 (fixb3).
  // ★ walktools2 re-base (2026-11-23; after a look at the diff, #1596 / #1634): ONLY screens.home moved, to the `sets` form (light = the old three probes byte for byte, minMatch 3; dark = three new probes); every other key and byte unchanged. Was 9e1ece07…ca461.
  const CAL_A52_SHA = 'c1262db563a0ba800e3d5a5a001f204550b325d518384f24a44c0109fb75f38e';
  const b6 = {
    found: !!cfgReal.taps,
    sha: sha(A52) === CAL_A52_SHA,
    tapKeys: Object.keys(cfgReal.taps || {}).join() === 'chatRow1,chatHeader,tabChats,tabApps,tabWallet,tabAccount,photoTile,accountDownloads',
    screenKeys: Object.keys(cfgReal.screens || {}).join() === 'home,chat,chatinfo,viewer,accountScrolled,downloads',
    hasDownloadsKey: !!(cfgReal.screens && cfgReal.screens.downloads),   // fixb3: screens.downloads from the proof calibrate of 2026-11-22
    swipeKeys: Object.keys(cfgReal.swipes || {}).join() === 'chatOlder,chatNewer,historyOlder,accountDownloads',
    realViewerNoGap: gapOf('viewer', cfgReal, true) === '',
    realDownloadsGap: gapOf('downloads', cfgReal, true) === '',
  };
  ok(F(b6).length === 0,
    '★ filewalk walk steps (b6 a52sCalibrated): scripts/device/a52s.json is the calibrated file (SHA-256 c6947496…): taps.photoTile and screens.viewer from the calibrate runs of 2026-11-17, taps.accountDownloads and screens.downloads absent (the Downloads row is below the first screen of the Account hub) — the real file gives `viewer` no gap and `downloads` the gap taps.accountDownloads; a later edit re-bases this key — failing: ' + JSON.stringify(F(b6)));

  /* ── b7 · a failed gate sends no second input: Invoke-FileReset (restart only) first and only ── */
  const matchStm = (x, p) => (typeof p === 'string' ? x === p : p.test(x));
  const seq = (st, from, pats) => { const o = pats.map((p) => idx(st, (x, i) => i > from && matchStm(x, p))); return o.every((v, i) => v > 0 && (i === 0 || v > o[i - 1])); };
  const dl = stm(fnD('Invoke-DownloadsRep')), vw = stm(fnD('Invoke-ViewerRep')), fc = stm(fnD('Invoke-FileChatRep'));
  const TAB = "[void](Invoke-ShellReq (Get-TapText 'tabAccount'))";
  const dTab = idx(dl, (l) => l === TAB);
  const dTry = idx(dl, (l) => l === 'try {');
  const dGate = idx(dl, (l) => l === "if (-not (Wait-FileGate 'loaddownloads' 'subscreenopen' $script:FileGateMs)) {");
  const dCatch = idx(dl, (l) => l === '} catch {');
  const dInputs = dl.slice(Math.min(dTab, dTry), dGate).filter((l) => INPUT.test(l));
  const vTap = idx(vw, (l) => l === "$r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'photoTile'))");
  const vTry = idx(vw, (l) => l === 'try {');
  const vGate = idx(vw, (l) => l === "if (-not (Wait-FileGate 'viewimage' 'overlayopen' $script:FileGateMs)) {");
  const vCatch = idx(vw, (l) => l === '} catch {');
  const gateFn = fnD('Wait-FileGate');
  const calFn = fnD('Invoke-CalFileTaps');
  const fcScreen = idx(fc, (l) => l === "if (-not (Invoke-FileShotCheck $Rec 'chat')) {");
  const b7 = {
    found: dTab > 0 && dTry > 0 && dGate > dTry && dCatch > dGate && vTap > 0 && vTry > 0 && vGate > vTry && vCatch > vGate && fcScreen > 0,
    gateInTry: dTry < dGate && dGate < dCatch && dl[dGate + 1] === "throw 'X'" && dl[dGate + 2] === '}',
    inputsToGate: dInputs.length === 4 && dInputs[0] === TAB && dInputs[1] === "[void](Invoke-ShellReq (Get-SwipeText 'accountDownloads'))" && dInputs[2] === "[void](Invoke-ShellReq 'logcat -c')" && dInputs[3] === "$r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'accountDownloads'))",   // fixb3 item 3: + the ONE swipe swipes.accountDownloads (checked by the scrolled-hub check before the tap: pins-fixb3/c-walk d1)
    orderAfterGate: seq(dl, dGate, [/^if \(-not \(Invoke-FileShotCheck \$Rec 'downloads'\)\) \{ throw 'X' \}$/, '$sbase = Get-ScrollBase $Rec', "$r2 = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'chatNewer'))", "[void](Invoke-ShellReq (Get-SwipeText 'chatOlder'))", "Wait-FilePull $Rec 'scrolllines' ($sbase + 1)", 'Invoke-LogPull $Rec', 'Invoke-BackReq', "[void](Invoke-ShellReq (Get-TapText 'tabChats'))"]),
    catchFirst: dl.slice(dCatch).join('\n') === ['} catch {', "if (-not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:')) { [void](Invoke-FileReset $Rec 'downloads: a failed rep after the Account tap') }", 'throw', '}', '}'].join('\n'),
    oneReset: count(fnD('Invoke-DownloadsRep'), 'Invoke-FileReset') === 1 && count(fnD('Invoke-DownloadsRep'), 'Reset-AppToChats') === 0,
    viewerInputsToGate: vw.slice(vTry + 1, vGate).filter((l) => INPUT.test(l)).length === 1 && vTap === vTry + 1 && vw[vGate + 1] === "throw 'X'",
    viewerCatch: vw.slice(vCatch).join('\n') === ['} catch {', "if (-not ([string]$_.Exception.Message).StartsWith('ADBWALK-STOP:') -and -not (Test-AppFront)) {", "[void](Invoke-FileReset $Rec 'viewer: a foreign window is in front after the tap (the OS chooser?), no input to it')", '}', 'throw', '}', '}'].join('\n'),
    viewerOrder: seq(vw, vGate, [/^if \(-not \(Invoke-FileShotCheck \$Rec 'viewer'\)\) \{ throw 'X' \}$/, /^\$r2 = Invoke-ShellReq \(\$script:StampCmd \+ '; input /, "Wait-FilePull $Rec 'overlayclose' 0", 'Invoke-LogPull $Rec']),
    fileChatNoSwipeOnBadShot: fc[fcScreen + 1] === 'Invoke-LogPull $Rec' && fc[fcScreen + 2] === "throw 'X'" && fc[fcScreen + 3] === '}' && idx(fc, (l) => /Get-SwipeText|Invoke-BackReq/.test(l)) > fcScreen + 3,
    gateOneAndAny: /\(\$a - \$BaseOne\) -gt 1\) \{ Write-WalkLog[^\n]*return \$false \}/.test(gateFn),
    gatePass: gateFn.includes('if ($null -ne $a -and $null -ne $b -and ($a - $BaseOne) -eq 1 -and ($b - $BaseAny) -ge 1) {') && count(gateFn, 'return $true') === 1 && count(gateFn, 'return $false') === 2,
    gateNoTimerFree: gateFn.includes('if ($sw.ElapsedMilliseconds -ge $TimeoutMs) {') && gateFn.includes('Get-LogCount $OneKey') && gateFn.includes('Get-LogCount $AnyKey') && D.includes('$script:FileGateMs = 6000') && count(D, 'Wait-FileGate ') === 4,
    calAccountReset: calFn.includes("[void](Invoke-CalReset $Cal ('cal-17 failed (' + $why + ')'))") && /if \(\$why\) \{[\s\S]*?Invoke-CalReset[\s\S]*?return\s*\}/.test(calFn) && !calFn.includes('Reset-AppToChats'),
  };
  ok(F(b7).length === 0,
    '★ filewalk walk steps (b7 failClosed): in `downloads` only the tabAccount tap, (fixb3 item 3) the ONE accountDownloads swipe, logcat -c and the accountDownloads tap are sent before the gate (count of send loaddownloads = 1 AND frames-subscreen-open >= 1, 6 s), the gate and the screen check throw inside the try, and the catch block is exactly `Invoke-FileReset` (a PROVEN restart, no tap) and `throw` — no second input on the Account screen (then, in order: the Downloads check, `$sbase = Get-ScrollBase`, the chatNewer swipe with stamp2, chatOlder, the pull wait, the pull, BACK, the Chats tap); the same for `viewer` (catch = the proven restart only when a foreign window is in front) and the chat step (a bad chat check sends no swipe / BACK); the gate never passes on a second send line or on a timer; the calibrate failure path uses Invoke-CalReset — failing: ' + JSON.stringify(F(b7)));

  /* ── b8 · no screenshot between the tabAccount tap and the accountDownloads gate (ANY call form) ── */
  const SHOTANY = /\b(Invoke-ShotCheck|Invoke-PreCheck|Invoke-FileShotCheck|Invoke-FilePreCheck|Invoke-FileShot|Save-Shot|Save-CalShot|Test-Screen|Test-CalShotScreen)\b|screencap/;
  const dShots = dl.map((l, i) => [l, i]).filter(([l]) => SHOTANY.test(l)).map(([, i]) => i);
  const dTabIn = Math.min(dTab, dTry);
  const cTab = calFn.indexOf("$r = Invoke-Shell (Get-TapText 'tabAccount')");
  const cGate = calFn.indexOf("Wait-FileGate 'loaddownloads' 'subscreenopen' $script:FileGateMs $bl $bso");
  const cShot17 = calFn.indexOf("Save-CalShot 'cal-17-downloads.png' 'downloads' $Cal");
  const cShot17a = calFn.indexOf("Save-CalShot 'cal-17a-home-before.png' 'home' $Cal");
  const cViewGate = calFn.indexOf("Wait-FileGate 'viewimage' 'overlayopen' $script:FileGateMs $bv $bo");
  const cShot15 = calFn.indexOf("Save-CalShot 'cal-15-viewer.png' 'viewer' $Cal");
  const calBetween = calFn.slice(cTab, cGate);
  const helperBody = [...stm(fnD('Invoke-CalAccountScroll')), ...stm(fnD('Invoke-CalHubBack'))];   // fixb3 review round 1 (m2): cal-17s is taken in the helpers, not in Invoke-CalFileTaps
  const helperShots = helperBody.filter((l) => SHOTANY.test(l) && !/Test-CalShotScreen/.test(l));
  const helperChecks = helperBody.filter((l) => /Test-CalShotScreen/.test(l));
  const b8 = {
    found: dTab > 0 && dGate > dTab && dShots.length > 0 && cTab > 0 && cGate > cTab,
    twoShotCalls: dShots.length === 3 && dl[dShots[0]] === "Invoke-FilePreCheck $Rec 'home'" && /^if \(-not \(Invoke-FileShot \$Rec 'accountScrolled' \('shot-' \+ \$Rec\.step \+ '-' \+ \(Get-Nn \$Rec\.rep\) \+ '-scrolled\.png'\)\)\) \{ throw 'X' \}$/.test(dl[dShots[1]]) && /^if \(-not \(Invoke-FileShotCheck \$Rec 'downloads'\)\) \{ throw 'X' \}$/.test(dl[dShots[2]]),   // fixb3 item 3 (DECISIONS 1739 (3)): the ONE scrolled-hub check between the swipe and the tap
    preBeforeTab: dShots[0] < dTabIn,
    noneBetween: dShots.filter((i) => i > dTabIn && i <= dGate + 2 && i !== dShots[1]).length === 0 && dShots[1] > dTabIn && dShots[1] < dl.findIndex((l) => /Get-TapText 'accountDownloads'/.test(l) && /StampCmd/.test(l)),
    firstAfterGate: dShots.length === 3 && dShots[2] > dGate + 2,
    noneAfterShotCheck: dShots.filter((i) => i > dShots[2]).length === 0,
    calNoneBetween: !SHOTANY.test(calFn.slice(cTab, cGate)) && calBetween.split("\n").filter((l) => /Invoke-CalAccountScroll/.test(l)).length === 1 && calBetween.split("\n").filter((l) => /Invoke-CalHubBack/.test(l)).length === 1,   // fixb3 review round 1 (m2): the ONE helper call between the tabAccount tap and the gate may take the picture (below), and the way-back helper none
    calHelperOneShot: helperShots.length === 1 && /^Save-CalShot 'cal-17s-account-scrolled\.png' 'accountScrolled' \$Cal$/.test(helperShots[0]) && helperChecks.length === 1 && helperChecks[0] === "} elseif (Test-CalShotScreen $s17s 'accountScrolled') {" && !SHOTANY.test(stm(fnD('Invoke-CalHubBack')).join('\n')),   // fixb3 item 3, DECISIONS 1739 (3): exactly ONE Save-CalShot (cal-17s, the scrolled hub) in the two helpers, its probe check, and no screenshot at all in the way back
    calShotAfterGate: cShot17 > cGate && /else \{\s*\$gateOk = \$true/.test(calFn.slice(cGate, cShot17 + 10)),
    calViewerAfterGate: cViewGate > 0 && cShot15 > cViewGate && /if \(\$vOk\) \{[\s\S]*?Save-CalShot 'cal-15-viewer\.png'/.test(calFn),
    calHomeBefore: cShot17a > 0 && cShot17a < cTab,
  };
  ok(F(b8).length === 0,
    '★ filewalk walk steps (b8 noAccountShot): `downloads` takes exactly three screenshots (matched in ANY call form: `$x = Save-Shot`, `[void](Save-Shot)`, Invoke-File*Check ...), the home pre-check BEFORE the tabAccount tap, (fixb3 item 3, DECISIONS 1739 (3)) the scrolled-hub check between the swipe and the accountDownloads tap (and none else before the gate) and the Downloads check AFTER the gate pass; in -Calibrate the fresh home shot cal-17a stands before the tap, no screenshot call stands between the tabAccount tap and the gate in Invoke-CalFileTaps but exactly ONE call of Invoke-CalAccountScroll, whose body takes exactly ONE Save-CalShot (cal-17s, the scrolled hub; the DECISIONS #1739 (3) exception, kept only while screens.accountScrolled is not set) with its probe check, and the way-back helper takes none, and cal-17 / cal-15 are taken only inside the gate-passed branch — failing: ' + JSON.stringify(F(b8)));

  /* ── b9 · Invoke-FileShot: the PNG is deleted in a finally, never recorded ── */
  const shotSt = stm(fnD('Invoke-FileShot'));
  const iSave = idx(shotSt, (l) => l === '$local = Save-Shot $LocalName'), iTryS = idx(shotSt, (l) => l === 'try {'), iScr = idx(shotSt, (l) => l === '$chk = Test-Screen $local $Expect'), iFin = idx(shotSt, (l) => l === '} finally {');
  const iDel = idx(shotSt, (l) => l === "if (Remove-LocalFile $local) { Add-Note $Rec ('PNG deleted (' + $Expect + ' check)') }"), iNot = idx(shotSt, (l) => l === "else { Add-Note $Rec 'PNG not deleted: local file not deleted'; $ok = $false }");
  const fscSt = stm(fnD('Invoke-FileShotCheck')), fpcSt = stm(fnD('Invoke-FilePreCheck'));
  const b9 = {
    found: shotSt.length > 0 && fscSt.length > 0 && fpcSt.length > 0,
    saveBeforeTry: iSave > 0 && iTryS === iSave + 2 && shotSt[iSave + 1] === '$ok = $false',
    screenInTry: iScr > iTryS && iScr < iFin,
    deleteInFinally: iFin > iScr && iDel === iFin + 1 && iNot === iDel + 1 && shotSt[iNot + 1] === '}' && shotSt[iNot + 2] === 'return $ok',
    earlyReturnsSafe: shotSt.map((l, i) => [l, i]).filter(([l]) => /\breturn\b/.test(l)).every(([l, i]) => i < iSave || (i > iTryS && i < iFin) || l === 'return $ok'),
    oneSave: count(fnD('Invoke-FileShot'), 'Save-Shot') === 1 && !/\$Rec\['shot(Pre)?'\]/.test(fnD('Invoke-FileShot') + fnD('Invoke-FileShotCheck') + fnD('Invoke-FilePreCheck')),
    wrappers: count(fnD('Invoke-FileShotCheck'), 'Invoke-FileShot ') === 1 && count(fnD('Invoke-FilePreCheck'), 'Invoke-FileShot ') === 1 && !SHOTANY.test(fscSt.join('\n').replace(/Invoke-FileShot /g, '')) && !SHOTANY.test(fpcSt.join('\n').replace(/Invoke-FileShot /g, '')),
    noKeptRoute: !/\bRemove-RepPng\b|\$Rec\['shot(Pre)?'\] = /.test(newBody),
  };
  ok(F(b9).length === 0,
    '★ filewalk walk steps (b9 pngDeleted): every screenshot of the five steps goes through Invoke-FileShot, which takes the PNG BEFORE its try, probes it inside the try and deletes it in a FINALLY (a probe read that throws leaves no PNG; a file that stays fails the check), never records the file name in the rep (no $Rec[\'shot\'] / [\'shotPre\']); Invoke-FileShotCheck and Invoke-FilePreCheck only wrap it — failing: ' + JSON.stringify(F(b9)));

  /* ── b10 · the parser rows of contract § 3.4; windowed rows read stamp2; the driver stamps t0 and stamp2 ── */
  const W = (l) => l.replace(/\s+/g, ' ').trim();
  const pl = P.split('\n').map((l) => W(l).replace(/,$/, ''));
  const wDefs = {};   // $script:<Name> = (New-Def 'name' 'unit' $bool ...
  for (const m of P.matchAll(/^\$script:(\w+) = \(New-Def '([^']*)' '([^']*)' \$(true|false) /gm)) wDefs[m[1]] = [m[2], m[3], m[4] === 'true'];
  const defsOf = (block) => block.split('\n').map((l) => l.trim().replace(/,$/, '')).map((l) => { let m = /^\(New-Def '([^']*)' '([^']*)' \$(true|false) /.exec(l); if (m) return [m[1], m[2], m[3] === 'true', 'inline']; m = /^\$script:(\w+)$/.exec(l); return m ? [...(wDefs[m[1]] || ['?' + m[1]]), m[1]] : null; }).filter(Boolean);
  const rows3 = (d) => d.map((r) => r.slice(0, 3));
  const refs = (d) => d.map((r) => r[3]).filter((x) => x !== 'inline');
  const between = (t, re, endTok) => { const m = re.exec(t); if (!m) return ''; const s = m.index + m[0].length; return t.slice(s, t.indexOf(endTok, s)); };
  const chatBlock = between(P, /\$script:ChatScrollDefs = @\(\n/, '\n)');
  const viewerBlock = between(P, /^\s*'viewer'\s*= @\{ Kind = 'reps'; Reps = 'repeats'; Defs = @\(\n/m, ') }');
  const dlBlock = between(P, /^\s*'downloads'\s*= @\{ Kind = 'reps'; Reps = 'repeats'; Defs = @\(\n/m, ') }');
  const SCROLLW = [['scroll drops (sum)', 'count', true], ['scroll max gap (max)', 'ms', true], ['scroll frames n (sum)', 'count', true], ['long tasks', 'count', false], ['longest long task', 'ms', false]];
  const ROWS_CHAT = [['intent -> present', 'ms', true], ['present ms=', 'ms', true], ['frames drop', 'count', true], ['frames max gap', 'ms', true], ...SCROLLW];
  const ROWS_VIEWER = [['tap -> viewimage sent dt=', 'ms', true], ['tap -> viewer shown first=', 'ms', true], ['viewer frames drop', 'count', true], ['viewer frames max gap', 'ms', true], ['close frames drop', 'count', true], ['close frames max gap', 'ms', true]];
  const ROWS_DL = [['tap -> loaddownloads sent dt=', 'ms', true], ['tap -> list shown first=', 'ms', true], ['list frames drop', 'count', true], ['list frames max gap', 'ms', true], ...SCROLLW];
  const WREFS = ['ScrollDropWDef', 'ScrollGapWDef', 'ScrollFramesWDef', 'LongCountWDef', 'LongMaxWDef'];   // the windowed defs, by VARIABLE name (the old ScrollDropDef etc. have the same row names)
  const tableKeys = [...P.matchAll(/^    '([a-z0-9-]+)'\s*= @\{ Kind/gm)].map((m) => m[1]);
  const legendBlock = between(P, /\$legendNew = \[ordered\]@\{\n/, '\n    }');
  const hf = fnPS(P, 'Get-HitsFrom'), tr = fnPS(P, 'Test-ReadyT2'), xt = fnPS(P, 'X-TokenW'), xs = fnPS(P, 'X-ScrollW'), xl = fnPS(P, 'X-LongW'), nrc = fnPS(P, 'New-RepCtx');
  const LDEF = [
    "SendViewImage = @{ Gram = $true; Label = 'shell send viewimage'; Rx = (New-Rx ($script:Cm + '\\[P1\\] shell send viewimage(?=\\s)')) }",
    "OverlayOpen = @{ Gram = $true; Label = 'shell overlay-open'; Rx = (New-Rx ($script:Cm + '\\[P1\\] shell overlay-open(?=\\s)')) }",
    "OverlayOpenFr = @{ Gram = $true; Label = 'shell frames-overlay-open'; Rx = (New-Rx ($script:Cm + '\\[P1\\] shell frames-overlay-open(?=\\s)')) }",
    "OverlayCloseFr = @{ Gram = $true; Label = 'shell frames-overlay-close'; Rx = (New-Rx ($script:Cm + '\\[P1\\] shell frames-overlay-close(?=\\s)')) }",
    "SendLoadDl = @{ Gram = $true; Label = 'shell send loaddownloads'; Rx = (New-Rx ($script:Cm + '\\[P1\\] shell send loaddownloads(?=\\s)')) }",
    "SubOpen = @{ Gram = $true; Label = 'shell subscreen-open'; Rx = (New-Rx ($script:Cm + '\\[P1\\] shell subscreen-open(?=\\s)')) }",
    "SubOpenFr = @{ Gram = $true; Label = 'shell frames-subscreen-open'; Rx = (New-Rx ($script:Cm + '\\[P1\\] shell frames-subscreen-open(?=\\s)')) }",
    "Scroll = @{ Gram = $true; Label = 'shell scroll'; Rx = (New-Rx ($script:Cm + '\\[P1\\] shell scroll [a-z_]+(?=\\s|$)')) }",
    "Long = @{ Gram = $true; Label = 'shell longtask'; Rx = (New-Rx ($script:Cm + '\\[P1\\] shell longtask [a-z_]+(?=\\s|$)')) }",
  ];
  const EXTRACT = [   // the extractor of every new row: the close / windowed rows read from stamp2, the open rows from the rep start
    "(New-Def 'tap -> viewimage sent dt=' 'ms' $true 'log' { param($c) X-SendLine $c $script:L.SendViewImage })",
    "(New-Def 'tap -> viewer shown first=' 'ms' $true 'log' { param($c) X-FirstNonNeg $c $script:L.OverlayOpen 'first' })",
    "(New-Def 'viewer frames drop' 'count' $true 'log' { param($c) X-Token $c $script:L.OverlayOpenFr 'drop' })",
    "(New-Def 'viewer frames max gap' 'ms' $true 'log' { param($c) X-Token $c $script:L.OverlayOpenFr 'max' })",
    "(New-Def 'close frames drop' 'count' $true 'log' { param($c) X-TokenW $c $script:L.OverlayCloseFr 'drop' })",
    "(New-Def 'close frames max gap' 'ms' $true 'log' { param($c) X-TokenW $c $script:L.OverlayCloseFr 'max' })",
    "(New-Def 'tap -> loaddownloads sent dt=' 'ms' $true 'log' { param($c) X-SendLine $c $script:L.SendLoadDl })",
    "(New-Def 'tap -> list shown first=' 'ms' $true 'log' { param($c) X-FirstNonNeg $c $script:L.SubOpen 'first' })",
    "(New-Def 'list frames drop' 'count' $true 'log' { param($c) X-Token $c $script:L.SubOpenFr 'drop' })",
    "(New-Def 'list frames max gap' 'ms' $true 'log' { param($c) X-Token $c $script:L.SubOpenFr 'max' })",
    "$script:ScrollDropWDef = (New-Def 'scroll drops (sum)' 'count' $true 'log' { param($c) X-ScrollW $c 'drops' })",
    "$script:ScrollGapWDef = (New-Def 'scroll max gap (max)' 'ms' $true 'log' { param($c) X-ScrollW $c 'gap' })",
    "$script:ScrollFramesWDef = (New-Def 'scroll frames n (sum)' 'count' $true 'log' { param($c) X-ScrollW $c 'frames' })",
    "$script:LongCountWDef = (New-Def 'long tasks' 'count' $false 'log' { param($c) X-LongW $c 'count' })",
    "$script:LongMaxWDef = (New-Def 'longest long task' 'ms' $false 'log' { param($c) X-LongW $c 'longest' })",
  ];
  const drvStamp = (st, first, second) => {   // t0 = the stamp of the first input (only logcat -c before it); stamp2 = the stamp of the first swipe / the BACK, read at once
    const iLog = idx(st, (l) => l === "[void](Invoke-ShellReq 'logcat -c')"), i1 = idx(st, (l) => l === first), i2 = idx(st, (l) => (typeof second === 'string' ? l === second : second.test(l)));
    return iLog >= 0 && i1 > iLog && i2 > i1 && st[i2 + 1] === 'Set-RepStamp2 $Rec $r2.StdOut' && st.slice(0, i1).filter((l) => INPUT.test(l)).length === 1;
  };
  const FA = "$r = Invoke-ShellReq ($script:StampCmd + '; am start -n ' + $script:Comp + ' --es fa ' + $addr)";
  const SW1D = "$r2 = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'chatNewer'))";   // downloads: the list opens at the TOP, chatNewer first (#46 r2)
  const SW1 = "$r2 = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'chatOlder'))";
  const b10 = {
    found: chatBlock.length > 0 && viewerBlock.length > 0 && dlBlock.length > 0 && hf.length > 0 && xt.length > 0,
    chatRows: JSON.stringify(rows3(defsOf(chatBlock))) === JSON.stringify(ROWS_CHAT),
    chatRefs: refs(defsOf(chatBlock)).join() === WREFS.join() && defsOf(chatBlock).filter((r) => r[3] === 'inline').length === 4,
    chatSteps: ['scroll-files', 'scroll-voice', 'scroll-photos'].every((s) => pl.includes("'" + s + "' = @{ Kind = 'reps'; Reps = 'repeats'; Defs = $script:ChatScrollDefs }")),
    viewerRows: JSON.stringify(rows3(defsOf(viewerBlock))) === JSON.stringify(ROWS_VIEWER) && refs(defsOf(viewerBlock)).length === 0,
    downloadsRows: JSON.stringify(rows3(defsOf(dlBlock))) === JSON.stringify(ROWS_DL),
    downloadsRefs: refs(defsOf(dlBlock)).join() === WREFS.join() && defsOf(dlBlock).filter((r) => r[3] === 'inline').length === 4,
    extractors: EXTRACT.every((l) => pl.includes(l)),
    lineDefs: LDEF.every((l) => pl.includes(l)),
    tableTail: tableKeys.slice(-8).join() === 'scroll-image,scroll-files,scroll-voice,scroll-photos,viewer,downloads,open-seed,coldstart-watch',   // ★ walktools2 re-base (2026-11-23): + coldstart-watch, the one new last entry
    oldRowsKept: count(P, 'X-Scroll $c') === 6 && count(P, 'X-Long $c') === 4 && count(P, 'X-Am $c') === 2,   // the counts of the base: the old rows still use the NON-windowed extractors
    absentNoRow: count(P, '$stepList.Add(') === 2 && P.includes('foreach ($s in $steps) { $stepList.Add($s) }') && count(P, '$steps.Add(') === 1 && count(P, 'foreach ($step in $stepList) {') === 1,
    legendOnlyIfInRun: P.includes('if ($stepList.Contains([string]$k)) { [void]$md.Append($legendNew[$k] + "`n") }') && [...legendBlock.matchAll(/^\s*'([a-z-]+)'\s*= '/gm)].map((m) => m[1]).join() === [...NEW5, ...PHOTO1A, ...WALKTOOLS2].join(),
    windowedFrom: hf.includes('foreach ($h in (Get-Hits $C $LineDef).Items) {') && hf.includes('if ($h.Stamp -ge $C.T2) { $hits.Add($h) }'),
    readyT2: tr.includes('$r = Test-Ready $C') && tr.includes("if ($null -eq $C.T2) { return (New-Res 'missing' $null $C.T2Why) }"),
    windowedUse: [xt, xs, xl].every((f) => f.includes('Test-ReadyT2 $C') && !f.includes('Test-Ready $C') && f.includes('Get-HitsFrom $C')) && xs.includes('Get-HitsFrom $C $script:L.Scroll') && xl.includes('Get-HitsFrom $C $script:L.Long') && xt.includes('Get-HitsFrom $C $LineDef'),
    t2Guard: [
      "$s2 = Get-Prop $Entry 'stamp2'",
      "if (($null -eq $s2) -or ([string]$s2 -eq '')) { $c.T2Why = $label + ': no stamp2 in run.json' }",
      "elseif ($null -eq $T0) { $c.T2Why = $label + ': stamp2 needs a readable t0' }",
      '$t2 = Convert-T0 ([string]$s2) $T0 $T0',
      "if (($null -eq $t2) -or ($t2 -le $T0)) { $c.T2Why = $label + ': stamp2 not readable' }",
      'else { $c.T2 = $t2 }',
    ].every((l, i, a) => { const L = nrc.split('\n').map(W); const at = L.indexOf(l); return at >= 0 && (i === 0 || at > L.indexOf(a[i - 1])); }) && P.includes("T2 = $null; T2Why = ''"),
    runJsonStamp2: D.includes("foreach ($k in @('t0', 'stamp2', 'log', 'shot', 'shotPre', 'screen', 'screenOk', 'swipes', 'am')) {") && fnD('Set-RepStamp2').includes("if ($s.T0) { $Rec['stamp2'] = $s.T0 }"),
    stampFiles: drvStamp(fc, FA, SW1) && count(fnD('Invoke-FileChatRep'), "Get-SwipeText 'chatOlder'") === 1,
    stampViewer: drvStamp(vw, "$r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'photoTile'))", /^\$r2 = Invoke-ShellReq \(\$script:StampCmd \+ '; input /) && count(fnD('Invoke-ViewerRep'), '; input ') === 1,
    stampDownloads: dl.includes(SW1D) && dl[dl.indexOf(SW1D) + 1] === 'Set-RepStamp2 $Rec $r2.StdOut' && dl.includes("$r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'accountDownloads'))") && dl[dl.indexOf("$r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'accountDownloads'))") + 1] === 'Set-RepStamp $Rec $r.StdOut' && count(fnD('Invoke-DownloadsRep'), "Get-SwipeText 'chatOlder'") === 1 && count(fnD('Invoke-DownloadsRep'), "Get-SwipeText 'chatNewer'") === 1,
    twoLine: (() => {   // #46 r2 (B2-3): the windowed scroll rows need the lines of BOTH swipes: fewer than two from stamp2 on = no value for that rep
      const x = stm(xs), i = x.indexOf('$hits = (Get-HitsFrom $C $script:L.Scroll).Items');
      return i > 0 && x[i + 1] === `if ($hits.Count -lt 2) { return (New-Res 'missing' $null ($C.Label + ': fewer than two "' + $script:L.Scroll.Label + '" lines from stamp2 on in ' + $C.LogName + ' (the two swipes)')) }`
        && !x.some((l) => /\$hits\.Count -(eq|le|lt 1|gt)/.test(l)) && count(x.join('\n'), '$hits.Count') === 1 && count(P, "X-ScrollW $c '") === 3;
    })(),
    longTwoLine: (() => {   // #46 r3 (B3-4): X-LongW has the same two-line rule (a pull before both swipes' lines = no long-task value)
      const x = stm(xl), i = x.indexOf('if ($null -ne $r) { return $r }');
      return i > 0 && x[i + 1] === `if (((Get-HitsFrom $C $script:L.Scroll).Items).Count -lt 2) { return (New-Res 'missing' $null ($C.Label + ': fewer than two "' + $script:L.Scroll.Label + '" lines from stamp2 on in ' + $C.LogName + ' (the two swipes): no long-task value')) }` && x[i + 2] === '$hits = (Get-HitsFrom $C $script:L.Long).Items' && count(x.join('\n'), '-lt 2') === 1;
    })(),
    oldScrollUntouched: sha(stm(fnPS(P, 'X-Scroll')).join('\n')) === '600a65a23411ac6bac513285bb1b7179e424f63cd49de33a42479c0229ced586' && stm(fnPS(P, 'X-Scroll')).includes('if ($hits.Count -eq 0) { return (Get-MissingLine $C $script:L.Scroll) }') && count(P, "X-Scroll $c '") === 6,
  };
  ok(F(b10).length === 0,
    '★ filewalk walk steps (b10 parserRows): the rows of contract § 3.4 exist with exactly these names, units and required flags (scroll-files|voice|photos: 9 rows, viewer: 6, downloads: 9) and these extractors — the scroll / long-task / close rows are WINDOWED (Get-HitsFrom: line stamp >= stamp2; Test-ReadyT2 refuses a rep without a readable stamp2), the open rows are not; a step that is not in run.json adds no row and no legend line; the windowed rows reference the …WDef variables by name (not the old Scroll/Long defs, which have the same row names) and stamp2 is read by the exact guard (a stamp2 equal to or before t0 is refused: `-le`); X-ScrollW needs at least TWO `shell scroll` lines from stamp2 on (`if ($hits.Count -lt 2)`: the two swipes; X-LongW the same, longTwoLine; fewer = no value for that rep, the row is `no data`), the old X-Scroll is byte-identical (SHA-256 of its statements); the driver writes stamp2 (Complete-Rep key list) and stamps t0 before the first input and stamp2 at the first swipe / the BACK — failing: ' + JSON.stringify(F(b10)) + ' tail=' + tableKeys.slice(-7).join());

  /* ── b11 · ASCII only, no PowerShell 7-only syntax (Windows PowerShell 5.1) ── */
  const strip = (t) => code(t).replace(/'(?:[^'\n]|'')*'/g, "''").replace(/"[^"\n]*"/g, '""');
  const PS7 = /\?\?|\?\.|\?\[|\s\?\s[^\n]*\s:\s|-Parallel|&&|\|\||-AsHashtable|utf8NoBOM|-AsByteStream|Join-String|Test-Json|-LeafBase|-SkipHttpErrorCheck|\$IsWindows|\$IsLinux|\$IsMacOS/;
  const b11 = {
    driverAscii: !/[^\x00-\x7F]/.test(DRV),
    parserAscii: !/[^\x00-\x7F]/.test(PAR),
    a52sAscii: !/[^\x00-\x7F]/.test(A52),
    driverNoPs7: !PS7.test(strip(DRV)),
    parserNoPs7: !PS7.test(strip(PAR)),
    noRequires: !/^\s*#requires\s+-Version\s+([6-9]|1\d)/im.test(DRV + '\n' + PAR),
    stillEnglishUsage: DRV.includes('scroll-files, scroll-voice, scroll-photos') && DRV.includes('fileChatAddress'),
  };
  ok(F(b11).length === 0,
    '★ filewalk walk steps (b11 ps51): adb-walk.ps1, adb-walk-parse.ps1 and a52s.json are ASCII only (L173), and neither uses PowerShell 7-only syntax (?? ?. ternary && || -Parallel -AsHashtable utf8NoBOM -AsByteStream Join-String Test-Json -LeafBase, no #requires 6+) — failing: ' + JSON.stringify(F(b11)));

  /* ── b12 · the new functions take a screenshot ONLY through Invoke-FileShot (and its two wrappers) ── */
  const RAWSHOT = /\b(Invoke-ShotCheck|Invoke-PreCheck|Save-Shot|Save-CalShot|Test-Screen|Test-CalShotScreen)\b|screencap/;
  const ROUTE_FNS = ['Invoke-FileChatRep', 'Invoke-ViewerRep', 'Invoke-ViewerStep', 'Invoke-DownloadsRep', 'Invoke-FileReset', 'Wait-FilePull', 'Wait-FileGate', 'Clear-FileStepPngs', 'Invoke-FileShotCheck', 'Invoke-FilePreCheck'];
  const fileShotCalls = [...D.matchAll(/Invoke-FileShot /g)].length;
  const b12 = {
    found: ROUTE_FNS.every((n) => fnD(n).length > 0),
    noRawShot: ROUTE_FNS.every((n) => stm(fnD(n)).every((l) => !RAWSHOT.test(l))),
    noOldRoutes: !/\bInvoke-ShotCheck\b|\bInvoke-PreCheck\b/.test(newBody),
    fileShotCallers: ['Invoke-FileShotCheck', 'Invoke-FilePreCheck', 'Invoke-FileReset'].every((n) => count(fnD(n), 'Invoke-FileShot ') === 1) && fileShotCalls === 4,   // the three callers (the definition has no space after the name) + fixb3 item 3: the scrolled-hub check in Invoke-DownloadsRep
    saveShotOnlyThere: ['Invoke-FileShot'].every((n) => count(fnD(n), 'Save-Shot') === 1) && ROUTE_FNS.filter((n) => n !== 'Invoke-FileShot').every((n) => count(fnD(n), 'Save-Shot') === 0),
    repsUseWrappers: [['Invoke-FileChatRep', 1], ['Invoke-ViewerRep', 2], ['Invoke-DownloadsRep', 2]].every(([n, c]) => count(fnD(n), 'Invoke-FileShotCheck') + count(fnD(n), 'Invoke-FilePreCheck') === c),
  };
  ok(F(b12).length === 0,
    '★ filewalk walk steps (b12 shotRoutes): scroll-files|voice|photos, viewer and downloads (and the restart proof) take a screenshot ONLY through Invoke-FileShot — directly in Invoke-FileReset or through Invoke-FileShotCheck / Invoke-FilePreCheck — never by Save-Shot, Test-Screen, screencap, Invoke-ShotCheck or Invoke-PreCheck in ANY call form (those two keep a PNG); Save-Shot is called once in Invoke-FileShot, which has exactly three callers — failing: ' + JSON.stringify(F(b12)));

  /* ── b13 · the new steps restart ONLY through Invoke-FileReset, which PROVES the restart or halts ── */
  const rs = stm(fnD('Invoke-FileReset'));
  const PIDL = "(Get-Pids (Invoke-Shell ('pidof ' + $script:Pkg)).StdOut)";
  const rsOrder = ['$before = $script:FileRepPid', 'Reset-AppToChats', '$after = @' + PIDL, "if (-not $before) { $why = 'no app pid was stored before the tap' }", "elseif ($after.Count -ne 1) { $why = 'no single app pid after the restart' }",
    "elseif (Test-Ordinal ([string]$before) ([string]$after[0])) { $why = 'the app pid did not change' }", "elseif (-not (Test-AppFront)) { $why = 'the app is not in front after the restart' }",
    "try { if (-not (Invoke-FileShot $Rec 'home' $name)) { $why = 'the home check after the restart failed' } }", 'if (-not $why) {', '$script:FileResetOk = $true', 'return $true', '$script:Halted = $true',
    "$script:HaltNote = 'run stopped: an app restart was not proven (no further input)'", 'return $false'].map((p) => rs.indexOf(p));
  const b13 = {
    found: rs.length > 0,
    order: rsOrder.every((v, i) => v >= 0 && (i === 0 || v > rsOrder[i - 1])),
    oneEach: count(fnD('Invoke-FileReset'), 'Reset-AppToChats') === 1 && count(fnD('Invoke-FileReset'), '$script:FileResetOk = $true') === 1 && count(fnD('Invoke-FileReset'), '$script:Halted = $true') === 1,
    shotAfterProof: rs.indexOf("elseif (-not (Test-AppFront)) { $why = 'the app is not in front after the restart' }") < rs.findIndex((l) => l.includes('Invoke-FileShot $Rec')) && rs.findIndex((l) => l.includes('Invoke-FileShot $Rec')) < rs.indexOf('if (-not $why) {'),
    nameShapes: rs.includes("$name = 'shot-' + $Rec.step + '-reset-' + $script:FileResetN.ToString('00', $script:Inv) + '.png'") && rs.includes("if ($script:Mode -eq 'calibrate') { $name = 'cal-reset-' + $script:FileResetN.ToString('00', $script:Inv) + '.png' }"),
    noOtherRestart: ['Invoke-FileChatRep', 'Invoke-ViewerRep', 'Invoke-ViewerStep', 'Invoke-DownloadsRep', 'Invoke-CalFileTaps', 'Invoke-CalReset', 'Wait-FilePull'].every((n) => !/Reset-AppToChats|am force-stop|am start -W/.test(fnD(n))),
    calForm: stm(fnD('Invoke-CalReset')).includes('$ok = Invoke-FileReset $rec $Why') && count(calFn, 'Invoke-CalReset') >= 3 && /if \(-not \(Invoke-CalReset \$Cal 'cal-15: a foreign window after the tap'\)\) \{ return \}/.test(calFn),
    clearsRecovery: D.includes('if ($script:FileResetOk) { $script:FileResetOk = $false; $script:NeedRecover = $false; $script:LastFailed = $false }'),
    haltedSkips: fnD('Invoke-Step').includes('if ($script:Halted) { $skip = $script:HaltNote }'),
  };
  ok(F(b13).length === 0,
    '★ filewalk walk steps (b13 fileReset): a restart in the five steps goes ONLY through Invoke-FileReset: the pid STORED before the tap (Save-FileRepPid) · Reset-AppToChats (force-stop + start) · pid after · a stored pid, exactly one app pid after, a different pid · our app in focus · only THEN a fresh home screenshot (never photographed before the proof) · proven = FileResetOk (Complete-Rep clears the recovery flags), not proven = Halted + HaltNote (Invoke-Step skips every later rep: no further input); the calibrate form is Invoke-CalReset — failing: ' + JSON.stringify(F(b13)));

  /* ── b14 · the tabAccount tap and the photoTile tap sit inside the try (a catch always runs the restart) ── */
  const b14 = {
    found: dTry > 0 && vTry > 0,
    downloadsTapFirstInTry: dl[dTry + 1] === TAB && dTab === dTry + 1 && dTab < dCatch,
    oneTabTap: count(fnD('Invoke-DownloadsRep'), "Get-TapText 'tabAccount'") === 1 && count(fnD('Invoke-DownloadsRep'), 'try {') === 1,
    viewerTapFirstInTry: vw[vTry + 1] === "$r = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-TapText 'photoTile'))" && vTap === vTry + 1 && vTap < vCatch,
    onePhotoTap: count(fnD('Invoke-ViewerRep'), "Get-TapText 'photoTile'") === 1 && count(fnD('Invoke-ViewerRep'), 'try {') === 1,
    reopenBeforeTry: vw[vTry - 1] === '$script:ViewerReopen = $true',
  };
  ok(F(b14).length === 0,
    '★ filewalk walk steps (b14 tapsInTry): in `downloads` the tabAccount tap command is the FIRST statement of the try and in `viewer` the photoTile tap command is the first statement of the try (after `$script:ViewerReopen = $true`) — a tap whose command fails or times out after it reached the phone still runs the catch (the proven restart) — failing: ' + JSON.stringify(F(b14)));

  /* ── b15 · no PNG of the five steps stays: the sweep ── */
  const sweep = stm(fnD('Clear-FileStepPngs')).join('\n');
  const SWEEP_RE = (/-cmatch '([^']*)'/.exec(sweep) || [])[1] || '';
  const SWEEP_RE2 = (/-cmatch '[^']*' -or \$f\.Name -cmatch '([^']*)'/.exec(sweep) || [])[1] || '';
  const sj = SWEEP_RE ? js(SWEEP_RE) : /(?!)/, sj2 = SWEEP_RE2 ? js(SWEEP_RE2) : /(?!)/;
  const mainFin = (() => { const i = D.indexOf('} finally {\n    Restore-Phone'); return i < 0 ? '' : D.slice(i, D.indexOf('Exit-Lock', i)); })();
  const walkLoop = fnD('Invoke-Walk');
  const b15 = {
    found: sweep.length > 0 && SWEEP_RE.length > 0,
    regexExact: SWEEP_RE === '^shot-(scroll-files|scroll-voice|scroll-photos|viewer|downloads|open-seed)-[A-Za-z0-9-]{1,40}\\.png\\z' && SWEEP_RE2 === '^cal-reset-[0-9]{2,4}\\.png\\z' && count(sweep, '-cmatch') === 3 && sweep.includes("if ($f.Name -cmatch '" + SWEEP_RE + "' -or $f.Name -cmatch '" + SWEEP_RE2 + "' -or $f.Name -cmatch '^shot-history-seed-k[0-9]{2}-reset-[0-9]{2,4}\\.png\\z') {"),   // fixb3 item 4: + the reset PNG of history-seed (pins-fixb3/c-walk d4)
    calReset: ['cal-reset-01.png', 'cal-reset-12.png', 'cal-reset-0123.png'].every((n) => sj2.test(n)) && ['cal-reset-1.png', 'cal-reset-12345.png', 'cal-reset-01.png.bak', 'cal-reset-01.PNG', 'cal-17-downloads.png', 'cal-16-home-after-viewer.png', 'cal-17a-home-before.png', 'shot-home-reset-01.png'].every((n) => !sj2.test(n)),
    behaviour: ['shot-viewer-01.png', 'shot-downloads-02-pre.png', 'shot-scroll-files-03.png', 'shot-scroll-voice-reset-01.png', 'shot-scroll-photos-01-pre.png'].every((n) => sj.test(n)) && ['shot-scroll-image-01.png', 'shot-scroll-01.png', 'shot-home-01.png', 'cal-17-downloads.png', 'shot-viewer-01.png.bak', 'shot-viewer-01.PNG', 'shot-viewer-../x.png'].every((n) => !sj.test(n)),
    deletes: sweep.includes('if (Remove-LocalFile $f.FullName) { Write-WalkLog (\'sweep: \' + $f.Name + \' deleted\') }') && sweep.includes('Get-ChildItem -LiteralPath $script:RunDir -File'),
    callSites: count(D, 'Clear-FileStepPngs') === 7,   // fixb3 review round 2 (NIT 5): + the end of Invoke-HistorySeedStep
    calSweep: (() => { const c = stm(fnD('Invoke-Calibrate')), i = c.indexOf('Invoke-CalFileTaps $cal'); return i > 0 && c[i + 1] === 'Clear-FileStepPngs' && count(c.join('\n'), 'Clear-FileStepPngs') === 1; })(),
    viewerEnd: (() => { const v = stm(fnD('Invoke-ViewerStep')); return v[v.length - 1] === '}' && v[v.length - 2] === 'Clear-FileStepPngs' && v[v.length - 3] === '$script:ViewerReopen = $false'; })(),
    fileStepsEnd: /elseif \(\$script:FileChatKeys\.ContainsKey\(\$s\) -or \$s -eq 'downloads'\) \{\s*Invoke-Step \$s \$script:RepeatsN \$true\s*if \(\$script:NeedRecover[^\n]*\n\s*Clear-FileStepPngs\s*\}/.test(walkLoop),
    mainFinally: mainFin.includes('Restore-Phone') && /Restore-Phone\s*try \{ Clear-FileStepPngs \} catch \{ \}\s*if \(\$script:WalkStarted\)/.test(mainFin),
  };
  ok(F(b15).length === 0,
    '★ filewalk walk steps (b15 pngSweep): Clear-FileStepPngs deletes every shot-<step>-*.png of the five steps (anchored name regex, the extracted pattern accepts the rep / pre / reset names and refuses the others) and runs at the end of each new step (viewer: last statement of Invoke-ViewerStep; the chat and downloads steps: after Invoke-Step) and in the main finally before Save-RunJson, and in -Calibrate right after Invoke-CalFileTaps and at the end of Invoke-OpenSeedStep (photo1a fix round 1, F6) (6 call sites); a second pattern sweeps the restart checks cal-reset-NN.png (2-4 digits, nothing else of the calibration) — failing: ' + JSON.stringify(F(b15)));

  /* ── b16 · the seed addresses: the keys must EQUAL the derived dev-seed addresses ── */
  const ALPHA = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const portB58 = (bytes) => { const digits = []; for (const b of bytes) { let carry = b; for (let j = 0; j < digits.length; j++) { carry += digits[j] * 256; digits[j] = carry % 58; carry = Math.floor(carry / 58); } while (carry > 0) { digits.push(carry % 58); carry = Math.floor(carry / 58); } } let s = ''; for (const b of bytes) { if (b === 0) s += '1'; else break; } for (let j = digits.length - 1; j >= 0; j--) s += ALPHA[digits[j]]; return s; };
  const portAddr = (i) => { const hh = createHash('sha256').update('spixi-dev-seed:' + i).digest(); const rw = Buffer.alloc(33); hh.copy(rw, 1); const ck = createHash('sha512').update(createHash('sha512').update(rw).digest()).digest(); const all33 = Buffer.alloc(36); rw.copy(all33, 0); ck.copy(all33, 33, 0, 3); return portB58(all33); };
  // test vectors (dev-seed hashes, not secrets), made independently by /home/claude/scratch/addr/seedaddr.py (python bignum base58)
  const VEC = { 50: '12DfFhDLMuZPQZw2AX7cqvpveDab2cPjF1gTNUQkmsrAzcrM5', 51: '19bTdqaF3a6MxpKZwGFJYBi3GMfc5vDwVumLgyjLrHLBxbXq2', 52: '1BsyoTV9w1GvGHFU7Gmq8EUL1S8fswBLh4pmWXhErpQSdwhu9', 53: '1BiwSi8GZ5gd1Ue2yp4a4FXAoSHbQgSEyftFBRmaLAgrKGGRA', 54: '15CBoVxoRubv3q29avcWZ1z1S3gjPeUzXAcNTDpdb4CvmqGA9', 55: '165KFVz7YGB2LM87hPT7qdcMwJN8ABaGvi3juK9aNvEk3XWCU' };
  const gda = stm(fnD('Get-DevSeedAddress')), b58 = stm(fnD('ConvertTo-Base58'));
  const SEEDCS = raw('Spixi/Utils/SDevSeed.cs');
  const b16 = {
    found: gda.length > 0 && b58.length > 0 && mainLoc.length > 0,
    vectors: Object.entries(VEC).every(([i, a]) => portAddr(Number(i)) === a) && VEC[53].length === 49 && fJs.test(VEC[53]),
    formulaText: [
      "$h = $sha256.ComputeHash($script:Utf8.GetBytes('spixi-dev-seed:' + $Index.ToString($script:Inv)))", '$raw = New-Object byte[] 33', '[System.Array]::Copy($h, 0, $raw, 1, 32)',
      '$ck = $sha512.ComputeHash($sha512.ComputeHash($raw))', '$all = New-Object byte[] 36', '[System.Array]::Copy($raw, 0, $all, 0, 33)', '[System.Array]::Copy($ck, 0, $all, 33, 3)', 'return (ConvertTo-Base58 $all)',
    ].every((l) => gda.includes(l)),
    base58Text: ["$alpha = '" + ALPHA + "'", '$carry += $digits[$j] * 256', '$digits[$j] = $carry % 58', '$carry = [math]::Floor($carry / 58)', 'while ($carry -gt 0) { $digits.Add($carry % 58); $carry = [math]::Floor($carry / 58) }', "foreach ($b in $Bytes) { if ($b -eq 0) { [void]$sb.Append('1') } else { break } }", 'for ($j = $digits.Count - 1; $j -ge 0; $j--) { [void]$sb.Append($alpha[$digits[$j]]) }'].every((l) => b58.includes(l)),
    sameSaltAsCs: SEEDCS.includes('private const string Salt = "spixi-dev-seed:";'),
    indexMap: D.includes("$script:FileSeedIndex = @{ 'fileChatAddress' = 53; 'voiceChatAddress' = 54; 'photoChatAddress' = 55 }"),
    keysCompared: ['$script:Seeds.Add($fileAddr)', '$want = Get-DevSeedAddress $script:FileSeedIndex[$fileKey]', 'if (Test-Ordinal $fileAddr $want) { $script:FileSeed[$fileKey] = $script:Seeds.Count - 1 }'].map((p) => mainLoc.indexOf(p)).every((v, i, a) => v >= 0 && (i === 0 || v > a[i - 1])) && count(mainLoc, '$script:FileSeed[$fileKey] =') === 1 && /else \{ \$script:FileKeyNote\[\$fileKey\] = /.test(mainLoc),
    imageRange: mainLoc.includes("foreach ($imgIdx in @(50, 51, 52)) { if (Test-Ordinal ([string]$script:Seeds[$script:ImageSeed]) (Get-DevSeedAddress $imgIdx)) { $script:ImageViewerOk = $true } }") && count(D, '$script:ImageViewerOk = $true') === 1 && D.includes('$script:ImageViewerOk = $false'),
    viewerNeedsIt: stepGapFn.includes("elseif ($kind -eq 'vimage') { if (-not $script:ImageViewerOk) {") && (needOf('viewer') || []).includes('vimage:') && (needOf('scroll-image') || []).join() === 'swipe:chatOlder,swipe:chatNewer,screen:chat,image:',
  };
  ok(F(b16).length === 0,
    '★ filewalk walk steps (b16 seedAddr): Get-DevSeedAddress(i) = base58(0x00 + SHA-256("spixi-dev-seed:" + i) + the first 3 bytes of SHA-512(SHA-512(raw33))) — the same salt as SDevSeed.cs; a literal JS port gives the six test vectors for Seed 51-56 (indexes 50-55; checked against the independent python tool); fileChatAddress / voiceChatAddress / photoChatAddress must EQUAL the address of index 53 / 54 / 55 (compared with Test-Ordinal after the masking add), imageChatAddress must equal one of 50 / 51 / 52 for `viewer` — failing: ' + JSON.stringify(F(b16)));

  /* ── b17 · the mirror wait: bounded, and before each log pull of a new rep ── */
  const wfp = stm(fnD('Wait-FilePull'));
  const waitMs = Number((/\$script:FilePullWaitMs = (\d+)/.exec(D) || [])[1]);
  const pairs = (st, wait) => { const i = idx(st, (l) => l === wait); return i > 0 && st[i + 1] === 'Invoke-LogPull $Rec'; };
  const b17 = {
    found: wfp.length > 0 && waitMs > 0,
    bounded: waitMs >= 1 && waitMs <= 4000 && count(D, '$script:FilePullWaitMs') === 2,
    waitText: wfp.includes("if (-not (Wait-LogCount $Key $script:FilePullWaitMs $Above)) { Add-Note $Rec ('pulled before all ' + $Key + ' lines were in the log') }") && !wfp.some((l) => /Start-Sleep|while|Wait-Ms/.test(l)),
    waitCountBounded: fnD('Wait-LogCount').includes('if ($sw.ElapsedMilliseconds -ge $TimeoutMs) {') && /no frames line[^\n]*\n?[^\n]*return \$false/.test(fnD('Wait-LogCount')),
    chatPair: pairs(fc, "Wait-FilePull $Rec 'scrolllines' ($sbase + 1)"),
    viewerPair: pairs(vw, "Wait-FilePull $Rec 'overlayclose' 0"),
    downloadsPair: pairs(dl, "Wait-FilePull $Rec 'scrolllines' ($sbase + 1)"),
    everyPullCovered: count(newBody, 'Wait-FilePull $Rec') === 3 && count(fnD('Invoke-FileChatRep') + fnD('Invoke-ViewerRep') + fnD('Invoke-DownloadsRep'), 'Invoke-LogPull $Rec') === 4,
  };
  ok(F(b17).length === 0,
    '★ filewalk walk steps (b17 filePull): Wait-FilePull waits at most $script:FilePullWaitMs (<= 4000 ms, one Wait-LogCount poll loop, a note when the lines did not come) and stands directly before the Invoke-LogPull of scroll-files|voice|photos (`$sbase + 1` above the base), viewer (close line) and downloads (`… ($sbase + 1)`); the pull after a failed chat check has no wait — failing: ' + JSON.stringify(F(b17)));

  /* ── b18 · the value rows of the open lines refuse -1 (no tap seen): `($v -ge 0)` ── */
  const GE0 = "if (($null -ne $v) -and ($v -ge 0)) { return (New-Res 'value' ([double]$v) '') }";
  const xf = stm(fnPS(P, 'X-FirstNonNeg')), xsl = stm(fnPS(P, 'X-SendLine'));
  const b18 = {
    found: xf.length > 0 && xsl.length > 0,
    firstNonNeg: count(xf.join('\n'), GE0) === 1 && xf.includes('$v = Get-Tok $h.Tail $Key') && xf.includes('foreach ($h in (Get-Hits $C $LineDef).Items) {'),
    sendLine: count(xsl.join('\n'), GE0) === 1 && xsl.includes("$v = Get-Tok $h.Tail 'dt'") && xsl.includes('foreach ($h in (Get-Hits $C $LineDef).Items) {'),
    noOtherCompare: !/-ge -1|-gt -1|-ge \$null/.test(xf.join('\n') + xsl.join('\n')) && count(xf.join('\n'), '-ge ') === 1 && count(xsl.join('\n'), '-ge ') === 1,
  };
  ok(F(b18).length === 0,
    '★ filewalk walk steps (b18 ge0): X-FirstNonNeg (first= of overlay-open / subscreen-open) and X-SendLine (dt= of send viewimage / loaddownloads) take the first line whose value is >= 0 by the exact statement `($v -ge 0)` — the shell writes -1 when it saw no tap, and that is no value — failing: ' + JSON.stringify(F(b18)));

  /* ── shared for b19..b23: exact statement sequences ── */
  const consec = (st, arr) => { for (let i = 0; i + arr.length <= st.length; i++) if (arr.every((p, k) => matchStm(st[i + k], p))) return i; return -1; };
  const nameSet = (body) => [...new Set([...body.replace(/'(?:[^'\n]|'')*'/g, "''").replace(/"[^"\n]*"/g, '""').matchAll(/(?<![\w$-])([A-Z][a-z]+-[A-Z][A-Za-z0-9]*)(?![\w-])/g)].map((m) => m[1]))].sort();

  /* ── b19 · the two step-end guards: no recovery input (Invoke-EnsureHome / Invoke-Back) after a halt ── */
  const walkSt = stm(fnD('Invoke-Walk'));
  const FBR = "elseif ($script:FileChatKeys.ContainsKey($s) -or $s -eq 'downloads') {";
  const WALKG = 'if ($script:NeedRecover -and -not $script:Halted -and -not (Get-StepGap $s)) { [void](Invoke-EnsureHome) }';
  const wFb = consec(walkSt, [FBR, 'Invoke-Step $s $script:RepeatsN $true', WALKG, 'Clear-FileStepPngs', '}', "elseif ($s -eq 'viewer') { Invoke-ViewerStep }"]);
  const vsSt = stm(fnD('Invoke-ViewerStep'));
  const VHEAD = "if (-not (Get-StepGap 'viewer') -and -not $script:Halted) {";
  const VTAIL = ["Invoke-Step 'viewer' $script:RepeatsN $false", 'if ($opened -and -not $script:Halted) {', 'if ($script:NeedRecover -or $script:ViewerReopen) { [void](Invoke-EnsureHome) }', "elseif (Invoke-Back) { Wait-Ms $script:Tm['backSettleMs'] 'backSettleMs' }",
    "else { Say-Log '  viewer: foreign window in front, BACK not sent'; $script:NeedRecover = $true; $script:LastFailed = $true }", '}', '$script:ViewerReopen = $false', 'Clear-FileStepPngs', '}'];
  const vsHead = vsSt.indexOf(VHEAD), vsTail = consec(vsSt, VTAIL);
  const recov = vsSt.map((l, i) => [l, i]).filter(([l]) => /Invoke-EnsureHome|Invoke-Back\b/.test(l)).map(([, i]) => i);
  const b19 = {
    found: walkSt.length > 0 && vsSt.length > 0,
    walkBranch: wFb >= 0 && count(walkSt.join('\n'), FBR) === 1,   // the branch is exactly: Invoke-Step, the guard, the sweep — no other Invoke-EnsureHome / Invoke-Back in it
    walkGuard: count(fnD('Invoke-Walk'), WALKG) === 1 && wFb >= 0 && walkSt[wFb + 2] === WALKG,
    viewerHead: vsHead > 0 && count(vsSt.join('\n'), VHEAD) === 1 && vsSt.indexOf('Invoke-Step \'viewer\' $script:RepeatsN $false') > vsHead,
    viewerTail: vsTail >= 0 && vsTail + VTAIL.length === vsSt.length && count(vsSt.join('\n'), 'if ($opened -and -not $script:Halted) {') === 1,
    viewerRecoveryOnlyGuarded: recov.length === 3 && recov[0] > vsHead && recov[0] < vsTail && recov[1] > vsTail + 1 && recov[2] > vsTail + 1,
  };
  ok(F(b19).length === 0,
    '★ filewalk walk steps (b19 stepEndGuards): after a halted run (an app restart that was not proven) the two step ends send NO recovery input — in Invoke-Walk the file branch is exactly `Invoke-Step` · `if ($script:NeedRecover -and -not $script:Halted -and -not (Get-StepGap $s)) { [void](Invoke-EnsureHome) }` · `Clear-FileStepPngs`, and Invoke-ViewerStep ends exactly `Invoke-Step \'viewer\' …` · `if ($opened -and -not $script:Halted) { EnsureHome | Invoke-Back | foreign-window note }` · `$script:ViewerReopen = $false` · `Clear-FileStepPngs` (its opening EnsureHome and the two later calls are the only ones, each behind a Halted guard) — failing: ' + JSON.stringify(F(b19)));

  /* ── b20 · -Calibrate: a failed cal-11 / an unconfirmed home sends no later input ── */
  const cnt = stm(fnD('Invoke-CalNewTaps'));
  const cft = stm(fnD('Invoke-CalFileTaps'));
  const SKIPRET = "if ($script:CalSkip12) { $Cal.notes.Add('cal-14..18 not taken: ' + $script:CalSkip12 + ' (no further input)'); return }";
  const skRet = cft.indexOf(SKIPRET);
  const A17 = ["Save-CalShot 'cal-17a-home-before.png' 'home' $Cal", '$s17a = Get-LastCalShot', "if (-not (Test-CalShotScreen $s17a 'home')) {", "if ($s17a -and $s17a.Path) { Remove-CalShot $Cal $s17a 'not home' }",
    "$Cal.notes.Add('cal-17..18 not taken: the home screen was not confirmed right before the tabAccount tap')", 'return', '}'];
  const a17 = consec(cft, A17), tabTap = cft.indexOf("$r = Invoke-Shell (Get-TapText 'tabAccount')");
  const b20 = {
    found: cnt.length > 0 && cft.length > 0,
    skip12Values: ["$skip12 = ''", "$skip12 = 'the home screen was not confirmed before cal-11'", "$skip12 = 'cal-11 did not complete'", "$skip12 = 'the cal-11 screenshot is not a confirmed home screen'"].every((p, i, a) => cnt.indexOf(p) >= 0 && (i === 0 || cnt.indexOf(p) > cnt.indexOf(a[i - 1]))) && cnt.filter((l) => /^\$skip12 = /.test(l)).length === 4,
    skip12Assign: cnt.filter((l) => l === '$script:CalSkip12 = $skip12').length === 1 && cnt[cnt.length - 2] === '$script:CalSkip12 = $skip12' && cnt[cnt.length - 1] === '}' && count(D, '$script:CalSkip12 = ') === 2 && D.includes("$script:CalSkip12 = ''\n$script:TabNames"),
    skip12Return: skRet === 2 && cft[0] === '{' && cft[1] === "$to = 3 * $script:Tm['tabSettleMs']" && /^if \(-not \$script:ImageViewerOk\) \{/.test(cft[3]),
    skip12Once: count(fnD('Invoke-CalFileTaps'), '$script:CalSkip12') === 2,
    homeBefore17: a17 >= 0 && tabTap > a17 + A17.length && cft.slice(a17 + A17.length, tabTap).every((l) => !/Get-TapText 'tabAccount'/.test(l)) && count(fnD('Invoke-CalFileTaps'), "Save-CalShot 'cal-17a-home-before.png'") === 1,
  };
  ok(F(b20).length === 0,
    '★ filewalk walk steps (b20 calGuards): in -Calibrate a failed cal-11 (or a home screen that was not confirmed) leaves `$script:CalSkip12` set from `$skip12` as the LAST statement of Invoke-CalNewTaps (the four `$skip12 = …` values exact), and Invoke-CalFileTaps starts with `if ($script:CalSkip12) { …; return }` before any input or screenshot; the fresh home check cal-17a ends in `return` (after a PNG that is not home is deleted) before the tabAccount tap — failing: ' + JSON.stringify(F(b20)));

  /* ── b21 · the app pid is stored BEFORE the first tap; no pid = no tap; the restart proof compares with the STORED pid ── */
  const spSt = stm(fnD('Save-FileRepPid'));
  const PIDTHROW = "if (-not (Save-FileRepPid)) { throw 'X' }";
  const vPid = vw.indexOf(PIDTHROW), dPid = dl.indexOf(PIDTHROW);
  const rsSt = stm(fnD('Invoke-FileReset'));
  const RSPROOF = ["Say-Log ('  ' + $Why + ': the app is restarted (am force-stop, am start -W)')", '$before = $script:FileRepPid', "$script:FileRepPid = ''", 'Reset-AppToChats', '$after = @' + "(Get-Pids (Invoke-Shell ('pidof ' + $script:Pkg)).StdOut)", "$why = ''",
    "if (-not $before) { $why = 'no app pid was stored before the tap' }", "elseif ($after.Count -ne 1) { $why = 'no single app pid after the restart' }", "elseif (Test-Ordinal ([string]$before) ([string]$after[0])) { $why = 'the app pid did not change' }",
    "elseif (-not (Test-AppFront)) { $why = 'the app is not in front after the restart' }", 'else {', '$script:FileResetN++'];
  const rsAt = consec(rsSt, RSPROOF), rsElse = rsSt.indexOf('else {'), rsShot = rsSt.findIndex((l) => l.includes('Invoke-FileShot $Rec'));
  const CAL15 = ["$bo = Get-LogCount 'overlayopen'", "if ($null -eq $bv -or $null -eq $bo) { $Cal.notes.Add('cal-15 not taken: cannot count the viewer lines in the phone log'); $vOk = $true }",
    "elseif (-not (Save-FileRepPid)) { $Cal.notes.Add('cal-15 not taken: cannot read the app pid before the tap'); $vOk = $true }", "elseif (Invoke-CalInput $Cal (Get-TapText 'photoTile') 'cal-15 tap') {"];
  const CAL17 = ["if (-not (Save-FileRepPid)) { $Cal.notes.Add('cal-17..18 not taken: cannot read the app pid before the tap'); return }", "if (-not (Test-AppFront)) { $Cal.notes.Add('cal-17 tabAccount skipped: foreign window in front'); return }",
    "$why = ''", '$gateOk = $false', "$r = Invoke-Shell (Get-TapText 'tabAccount')"];
  const b21 = {
    found: spSt.length > 0 && rsSt.length > 0 && vPid > 0 && dPid > 0,
    saveText: spSt.join('\n') === ['{', "$script:FileRepPid = ''", "$ids = @(Get-Pids (Invoke-Shell ('pidof ' + $script:Pkg)).StdOut)", "if ($ids.Count -eq 1) { $script:FileRepPid = [string]$ids[0]; return $true }", 'return $false', '}'].join('\n'),
    pidVarUses: count(D, '$script:FileRepPid') === 7 && count(D, 'Save-FileRepPid') === 9,   // fixb3 item 4: + the proven restart of a history-seed rep
    viewerBeforeTap: count(vw.join('\n'), PIDTHROW) === 1 && vw[vPid - 1] === "Invoke-FilePreCheck $Rec 'chat'" && vw[vPid + 1] === 'Assert-AppFront' && vPid < vTry && vTry < vTap && vw.slice(vPid, vTap).filter((l) => INPUT.test(l)).length === 0,
    downloadsBeforeTap: count(dl.join('\n'), PIDTHROW) === 1 && dl[dPid - 1] === "Invoke-FilePreCheck $Rec 'home'" && dl[dPid + 1] === 'Assert-AppFront' && dl[dPid + 2] === 'try {' && dl[dPid + 3] === TAB && dPid < dTab,
    calBeforeTap: consec(cft, CAL15) >= 0 && consec(cft, CAL17) >= 0 && count(fnD('Invoke-CalFileTaps'), 'Save-FileRepPid') === 2,
    resetStoredPid: rsAt >= 0 && count(fnD('Invoke-FileReset'), '$script:FileRepPid') === 2 && !/Get-Pids[^\n]*\$before|\$before\.Count/.test(fnD('Invoke-FileReset')),
    resetNoShotBeforeProof: rsElse === rsAt + RSPROOF.length - 2 && rsShot > rsElse && count(fnD('Invoke-FileReset'), 'Invoke-FileShot ') === 1 && rsSt.slice(0, rsElse).every((l) => !SHOTANY.test(l)),
  };
  ok(F(b21).length === 0,
    '★ filewalk walk steps (b21 repPid): Save-FileRepPid (exactly one app pid, else false) runs right after the pre-check and BEFORE the first tap command of every viewer and downloads rep (a failed read throws: no tap), and before the cal-15 and cal-17 taps (a failed read: the try is not taken); Invoke-FileReset compares the exactly-one pid read after the restart with the STORED pid (no stored pid = not proven) and takes its home screenshot only in the final `else` of the proof chain, after the pid and focus checks — failing: ' + JSON.stringify(F(b21)));

  /* ── b22 · WHO takes a screenshot (whole file) and WHAT the new functions may call ── */
  const allFns = [...D.matchAll(/^function ([\w-]+)/gm)].map((m) => m[1]);
  const noStr = (t) => t.replace(/'(?:[^'\n]|'')*'/g, "''").replace(/"[^"\n]*"/g, '""');
  const CALLS = {   // FROZEN: every Verb-Noun command a function of the five steps (and of the restart proof) calls
    'Invoke-FileChatRep': ['Add-AmResult', 'Assert-AppFront', 'Get-ScrollBase', 'Get-Seed', 'Get-SwipeText', 'Invoke-BackReq', 'Invoke-FileShotCheck', 'Invoke-LogPull', 'Invoke-ShellReq', 'Read-AmOutput', 'Set-RepStamp', 'Set-RepStamp2', 'Wait-FilePull', 'Wait-Ms'],
    'Invoke-ViewerRep': ['Add-Note', 'Assert-AppFront', 'Get-TapText', 'Invoke-EnsureHome', 'Invoke-FilePreCheck', 'Invoke-FileReset', 'Invoke-FileShotCheck', 'Invoke-LogPull', 'Invoke-OpenSeedChat', 'Invoke-ShellReq', 'Save-FileRepPid', 'Set-RepStamp', 'Set-RepStamp2', 'Test-AppFront', 'Wait-FileGate', 'Wait-FilePull', 'Wait-Ms'],
    'Invoke-DownloadsRep': ['Assert-AppFront', 'Get-Nn', 'Get-ScrollBase', 'Get-SwipeText', 'Get-TapText', 'Invoke-BackReq', 'Invoke-FilePreCheck', 'Invoke-FileReset', 'Invoke-FileShot', 'Invoke-FileShotCheck', 'Invoke-LogPull', 'Invoke-ShellReq', 'Save-FileRepPid', 'Set-RepStamp', 'Set-RepStamp2', 'Wait-FileGate', 'Wait-FilePull', 'Wait-LogCount', 'Wait-Ms'],
    'Invoke-ViewerStep': ['Clear-FileStepPngs', 'Get-AdbWhy', 'Get-Seed', 'Get-StepGap', 'Invoke-Back', 'Invoke-EnsureHome', 'Invoke-Shell', 'Invoke-Step', 'Read-AmOutput', 'Say-Log', 'Wait-Ms'],
    'Invoke-FileReset': ['Add-Note', 'Get-Pids', 'Invoke-FileShot', 'Invoke-Shell', 'Reset-AppToChats', 'Say-Log', 'Test-AppFront', 'Test-Ordinal'],
    'Invoke-FileShot': ['Add-Note', 'Remove-LocalFile', 'Save-Shot', 'Test-AppFront', 'Test-Screen'],
    'Invoke-FileShotCheck': ['Get-Nn', 'Invoke-FileShot'],
    'Invoke-FilePreCheck': ['Get-Nn', 'Invoke-FileShot'],
    'Wait-FilePull': ['Add-Note', 'Wait-LogCount'],
    'Get-ScrollBase': ['Add-Note', 'Get-LogCount'],
    'Save-FileRepPid': ['Get-Pids', 'Invoke-Shell'],
    'Clear-FileStepPngs': ['Clear-CalAccountPng', 'Get-ChildItem', 'Remove-LocalFile', 'Say-Log', 'Test-Path', 'Write-WalkLog'],   // fixb3 review round 2 (m2): + the call that deletes cal-17s once screens.accountScrolled is set
  };
  const callDiff = Object.entries(CALLS).filter(([n, want]) => nameSet(fnD(n)).join() !== want.join()).map(([n]) => n);
  const b22 = {
    found: allFns.length > 100 && Object.keys(CALLS).every((n) => fnD(n).length > 0),
    saveShotCallers: allFns.filter((n) => /\bSave-Shot\b/.test(noStr(fnD(n)))).sort().join() === 'Invoke-FileShot,Invoke-PreCheck,Invoke-ShotCheck,Save-CalShot' && count(D, 'Save-Shot') === 5,   // + the definition
    screencapOnly: allFns.filter((n) => /screencap/.test(fnD(n))).join() === 'Initialize-Allowlist,Save-Shot' && count(D, 'screencap') === 2 && /screencap -p ' \+ \$script:PhoneShot/.test(fnD('Save-Shot')),
    noTopLevelShot: !/\bSave-Shot\b|screencap/.test(allFns.reduce((t, n) => t.replace(fnD(n), ''), D).replace(/^function [\w-]+/gm, '').replace(/'(?:[^'\n]|'')*'/g, "''").replace(/^\s*\n/gm, '').replace(/function Save-Shot\(\[string\]\$LocalName\)/, '')),
    callSets: callDiff.length === 0,
    newFnsNoRawShot: ['Invoke-FileChatRep', 'Invoke-ViewerRep', 'Invoke-DownloadsRep', 'Invoke-ViewerStep', 'Invoke-FileReset'].every((n) => !nameSet(fnD(n)).some((c) => /^(Save-Shot|Save-CalShot|Invoke-ShotCheck|Invoke-PreCheck|Test-Screen)$/.test(c))),
  };
  ok(F(b22).length === 0,
    '★ filewalk walk steps (b22 shotCallers): over the WHOLE script the only functions that call Save-Shot are Invoke-FileShot, Invoke-PreCheck, Invoke-ShotCheck and Save-CalShot (4 calls + the definition), `screencap` appears only in the allowlist and in Save-Shot, no top-level statement takes a screenshot; and the commands each function of the five steps (reps, Invoke-ViewerStep, the restart proof, the screen-check wrappers, the pull wait, the pid and scroll-base readers, the sweep) calls are a FROZEN list — a new helper called from a rep (one that could take a screenshot behind the b8 / b12 matches) turns this red until it is reviewed — failing: ' + JSON.stringify(F(b22).concat(callDiff)));

  /* ── b23 · the scroll-line base: read BEFORE the stamp2 command, the pull waits for base + 2 (bounded) ── */
  const gsSt = stm(fnD('Get-ScrollBase'));
  const SO = "$r2 = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'chatOlder'))", SN = "$r2 = Invoke-ShellReq ($script:StampCmd + '; ' + (Get-SwipeText 'chatNewer'))";
  const WT = "Wait-FilePull $Rec 'scrolllines' ($sbase + 1)", SET2 = 'Set-RepStamp2 $Rec $r2.StdOut', WSET = "Wait-Ms $script:Tm['scrollSettleMs'] 'scrollSettleMs'";
  const swipeSeq = (first, second) => ['$sbase = Get-ScrollBase $Rec', 'Assert-AppFront', first, SET2, WSET, 'Assert-AppFront', `[void](Invoke-ShellReq (Get-SwipeText '${second}'))`, WSET, WT, 'Invoke-LogPull $Rec'];
  const b23 = {
    found: gsSt.length > 0,
    baseText: gsSt.join('\n') === ['{', "$c = Get-LogCount 'scrolllines'", "if ($null -eq $c) { Add-Note $Rec 'scroll line count unreadable before the swipes'; return 999999 }", 'return $c', '}'].join('\n'),
    chatOrder: consec(fc, swipeSeq(SO, 'chatNewer')) > fcScreen && count(fnD('Invoke-FileChatRep'), 'Get-ScrollBase') === 1,
    downloadsOrder: consec(dl, swipeSeq(SN, 'chatOlder')) > dGate && count(fnD('Invoke-DownloadsRep'), 'Get-ScrollBase') === 1,
    waitBasePlus2: count(D, "Wait-FilePull $Rec 'scrolllines' ($sbase + 1)") === 2 && count(D, "Wait-FilePull $Rec 'scrolllines'") === 2 && fnD('Wait-LogCount').includes('if ($null -ne $c -and $c -gt $Above) {'),
    baseBeforeStamp2: [fc, dl].every((st) => { const b = idx(st, (l) => l === '$sbase = Get-ScrollBase $Rec'); const s2 = idx(st, (l) => /^\$r2 = Invoke-ShellReq \(\$script:StampCmd/.test(l)); return b > 0 && s2 > b && count(st.join('\n'), '$sbase') === 2; }),
    downloadsFirstChatNewer: (() => { const f = dl.find((l) => /Get-SwipeText/.test(l) && !/Get-SwipeText 'accountDownloads'/.test(l)); return f === SN && dl.filter((l) => /Get-SwipeText/.test(l)).length === 3 && dl.findIndex((l) => /Get-SwipeText 'accountDownloads'/.test(l)) < dl.findIndex((l) => /Get-SwipeText 'chatNewer'/.test(l)) && dl.findIndex((l) => /Get-SwipeText 'chatNewer'/.test(l)) < dl.findIndex((l) => /Get-SwipeText 'chatOlder'/.test(l)); })(),
    chatFirstChatOlder: fc.find((l) => /Get-SwipeText/.test(l)) === SO,
    getCount: count(D, 'Get-ScrollBase') === 3,
  };
  ok(F(b23).length === 0,
    '★ filewalk walk steps (b23 scrollBase): Get-ScrollBase (the count of `shell scroll` lines in the phone log; unreadable = 999999 = the whole bounded wait) is read after the chat / Downloads screen check and BEFORE the stamp2 command, the pull waits for `($sbase + 1)` (Wait-LogCount takes counts ABOVE it: base + 2 = the lines of both swipes, <= FilePullWaitMs) right before Invoke-LogPull; the chat steps swipe chatOlder first, the Downloads list (it opens at the top) chatNewer first — failing: ' + JSON.stringify(F(b23)));

  /* ── b24 · the two walk scripts, byte for byte ── */
  // The GUARD is the SHA-256 of the RAW BYTES of each whole script (no comment stripping, no white-space change). The per-function raw
  // hashes and the script-level remainder are DIAGNOSTIC only (they name where the bytes moved; they are not part of the verdict).
  const rawBuf = (f) => readFileSync(join(root, f));
  const bufD = rawBuf('scripts/device/adb-walk.ps1'), bufP = rawBuf('scripts/device/adb-walk-parse.ps1');
  const shaB = (b) => createHash('sha256').update(b).digest('hex');
  const lat = (b) => Buffer.from(b).toString('latin1'), unl = (t) => Buffer.from(t, 'latin1');
  const spanOf = (t, n) => { const m = new RegExp('^function ' + n.replace(/-/g, '\\-') + '(?![\\w-])', 'm').exec(t); if (!m) return null; const body = psMatch(t, m.index); if (body === null) return null; const o = t.indexOf(body, m.index); return [m.index, o + body.length]; };
  const diag = (buf, names) => { const t = lat(buf); const out = {}; let rem = t; const cuts = []; for (const n of names) { const sp = spanOf(t, n); out[n] = sp ? shaB(unl(t.slice(sp[0], sp[1]))) : 'MISSING'; if (sp) cuts.push(sp); } cuts.sort((a, b) => b[0] - a[0]); for (const [a, b] of cuts) rem = rem.slice(0, a) + rem.slice(b); return { fns: out, rest: shaB(unl(rem)) }; };
  const NEWD = ['Set-RepStamp2', 'ConvertTo-Base58', 'Get-DevSeedAddress', 'Clear-FileStepPngs', 'Invoke-FileShot', 'Invoke-FileShotCheck', 'Invoke-FilePreCheck', 'Invoke-FileReset', 'Save-FileRepPid', 'Get-ScrollBase', 'Wait-FilePull', 'Wait-FileGate',
    'Invoke-FileChatRep', 'Invoke-ViewerRep', 'Invoke-ViewerStep', 'Invoke-DownloadsRep', 'Test-CalGateShot', 'Invoke-CalReset', 'Invoke-CalFileTaps'];
  const CHGD = ['Initialize-Allowlist', 'Get-StepGap', 'Complete-Rep', 'Invoke-RepBody', 'Get-EstimateSec', 'Invoke-Walk', 'Invoke-CalNewTaps', 'Invoke-Calibrate'];
  const OLDD = ['Assert-AppFront', 'Get-LogCount', 'Wait-LogCount', 'Invoke-ShellReq', 'Test-AppFront', 'Invoke-Shell', 'Invoke-Back', 'Invoke-BackReq', 'Invoke-LogPull', 'Invoke-EnsureHome', 'Reset-AppToChats', 'Save-Shot', 'Test-Screen', 'Remove-LocalFile',
    'Get-Pids', 'Test-Ordinal', 'Get-TapText', 'Get-SwipeText', 'Invoke-CalInput', 'Save-CalShot', 'Set-RepStamp', 'Add-Note', 'Invoke-Step', 'Wait-Ms', 'Invoke-OpenSeedChat'];
  const NEWP = ['Get-HitsFrom', 'Test-ReadyT2', 'X-FirstNonNeg', 'X-TokenW', 'X-ScrollW', 'X-LongW'];
  const CHGP = ['New-Ctx', 'New-RepCtx', 'Invoke-Main'];
  const OLDP = ['Get-Hits', 'Test-Ready', 'Get-Tok', 'Get-MissingTok', 'Get-MissingLine', 'X-Scroll', 'X-Long', 'X-Send', 'X-SendLine', 'Convert-T0'];
  const dgD = diag(bufD, [...NEWD, ...CHGD, ...OLDD]), dgP = diag(bufP, [...NEWP, ...CHGP, ...OLDP]);
  // re-based walktools (items 2 + 3; after a look at the diff, #1596): driver 44ebb3b9... -> 9502953e... (item 2: the probe `sets` form: Test-Screen, Invoke-Calibrate, the load block / header;
  // new functions Test-HasField, Get-ProbeListGap, Get-ScreenProbeSets, Test-ProbeSetPixels, Get-ProbeVerdict; Get-ScreenGap / Test-Probes / Invoke-PreCheck (Get-PreCheckText) rewritten; Invoke-FileShot and Invoke-ShotCheck are back to their pre-batch text); parser 4a80770b... -> 873d647b... (item 3: Invoke-Main (two legend
  // lines), the script level (five line defs, Get-WordTok, X-PageGate / X-PageTok / X-PagePush / X-Page, X-SeedFirstPage (I-3a), New-Def, Get-DataRow, the page tables)). The two script-level remainders and the five moved
  // function hashes follow (review rounds 1 + 2 of walktools re-based them again (round 2: only the driver script level moved: Get-ScreenGap `1 or 2 sets`, the compact counts of Get-ProbeVerdict, Get-PreCheckText): success notes dropped, Invoke-FileShot back to its pre-batch text, Get-PreCheckText, Get-NoPair, the equal-counts rule); Get-EstimateSec and Invoke-Walk: the text did not change in this batch - their diagnostic constants were already stale on the base (the diagnostics are not the verdict) and are refreshed.
    // ★ walktools2 re-base (2026-11-23; after a look at the diff, #1596 / #1634): driver 074f7f0e65d1... -> 1ac3bf836ef0..., parser e502ac2b6003... -> 73c8dfa1ca0d... — the diff is the step coldstart-watch (driver: the two list lines, WatchWaitSec / WatchEventRe / WatchEventsCmd, the PipedCmds entry, Save-WatchPull / Save-WatchEvidence / Invoke-ColdWatchRep, the run.json / Complete-Rep / Invoke-RepBody / Get-EstimateSec / Invoke-Walk lines, the usage refusals, the help text, the calibrate note) and the home `sets` form (Get-ScreenGap, the load block); parser: only added code (the StepTable entry, the Watch* regexes and helpers, Get-WatchRep, Get-WatchRows, the Invoke-Main branch + facts block + legend line); moved (diagnostic): driver Initialize-Allowlist, Complete-Rep, Invoke-RepBody, Get-EstimateSec, Invoke-Walk, Invoke-Calibrate + the script level; parser Invoke-Main + the script level.
  // ★ walktools2 re-base, #46 round 1 (2026-11-23): only coldstart-watch code changed (driver Test-WatchPidof, try/finally, pidInAfter: script level; parser Invoke-Main + script level); raw hashes 1ac3bf83... -> 02ef800d..., 73c8dfa1... -> bff0b1dc...
  const B24_DRIVER_SHA = '02ef800d4cbf3034f4edfcccb2ebbcf425f952e20c1a6a7e34f14e4a9167ab20', B24_PARSER_SHA = 'bff0b1dcff42f16d2766c7221232c14e121ff866f6bdf79147a2d94f211fcbe3', B24_DRIVER_REST = '296fc06595ef37ba1ff59aba6e4468363c5cc8f09b0de2019f48a07d0d45946d', B24_PARSER_REST = '856cc85d3ebb9e49f77e2e267c7db5fd17b0b99de7239ff5900796bb32e651da';   // the guard (…_SHA) and the diagnostics
  const B24_DRIVER_FN = {
    "Set-RepStamp2": "b810fbc48072ef35d08d2ad824f4e6b32b4ec4ee9d169ea01ce27580003a56c7",
    "ConvertTo-Base58": "607782670e7e397d660daaca5f441110ec9e8366c0a8d87ecd05073e3977faa9",
    "Get-DevSeedAddress": "63a55df1d170cb1ae768c7357397e92ada7a2750ae1ed9b49ca34fcde562b238",
    "Clear-FileStepPngs": "d3b77fac2cf76256ea01c85c99da9aaa1fe8c2257952f15e84440ac828fc81b0",
    "Invoke-FileShot": "4c7b63d9c74bde808e00c4575175317d0e5803676bd9fac2e6c4c491df350b94",
    "Invoke-FileShotCheck": "a3c8d12dbfcea83a5b7fa56fac20afee557eb1b911e6af0b11ca54c288f4181d",
    "Invoke-FilePreCheck": "f0dae6671306203ae309e7cf1288e90c227bc1f37485b30c31521d8ea711237e",
    "Invoke-FileReset": "558945e5c35a87a4a29cab5c7e9c29964a1b29350506568a51a473092efaa2ed",
    "Save-FileRepPid": "59d790bc03472a70c602ecd45798c5dfd15bcc5f7c6e0d07bf6031f2cba76369",
    "Get-ScrollBase": "dc4a143e3950e330d73593e279431d6571339390d67e89bacaf37d8105720912",
    "Wait-FilePull": "d35d98c4dea67ad2e9774d813faafc76325bc63d49c93cc0715a1273650e4a80",
    "Wait-FileGate": "f7248880cd72bc9f470a0a9a75134ef48df1bd32bb3695a16fe37652970899ef",
    "Invoke-FileChatRep": "ae7321b83edeb3679baaa72ce13f9b77ef9452e4f8142cf08d0b1b00f1dda094",
    "Invoke-ViewerRep": "eb9bb215e424b7960dbac94816a749b5ab5498e270c31b043f6a67c3c09d1407",
    "Invoke-ViewerStep": "1bbfba8a4838c1c056012498974f90d26c95d7d4c9b1f4b1355cd1f021c64c47",
    "Invoke-DownloadsRep": "6d40ae1aaec989b18416d3996b5fcb09f2d4b2e351abcc2cba350df8e693e7a1",
    "Test-CalGateShot": "9c83fa0e99af74c7022972b7777bff0d7857a86ed3660378a0433db945ed55ed",
    "Invoke-CalReset": "2ab8f9c3169234021d24ced742f94944cb6290a6a34fc4b842cf0ce2d1bd2d90",
    "Invoke-CalFileTaps": "f6e50cac81fb22e3c396a018f6c73684856678b5ffc8ceb228032044995d6a64",
    "Initialize-Allowlist": "05d73b0d2fde3ce945fe5bb97edc85dcc3e07eeaf6191b81a0c6ac7b6d730eaf",
    "Get-StepGap": "f273e5567fbb8d75444c09f6fefe1c0faf01e3ae86cb342b6df9826bca87ef68",
    "Complete-Rep": "e64bd3b0bfeb0fdebc166a48a0c3996b8a6d3600bb74d01c0ef7e0134070dc29",
    "Invoke-RepBody": "7ac3df34c9f0e8a1135ef177a1bc7463de1590e8adc9bfa315fb4e94b7ebff53",
    "Get-EstimateSec": "7dd3259cd6355a29dbe0ef8c8452410752473998240ac381a22f7b601d47851f",
    "Invoke-Walk": "41626700cd858e9662043348151a112a31d1d94ac5df2603b8d9cafc1247085a",
    "Invoke-CalNewTaps": "82a90e9586891a4405e24aa9578a48f17c33bd0a7edadae48d5960ca6580f335",
    "Invoke-Calibrate": "68600c6702d3d47c281f89ddd848764afa868a0c353c5bf1a19d0ccff6a63a6a",
    "Assert-AppFront": "2ab25b07f54f84768f166a7285067b238b633ff02a73fc890e6dd4896c6c63f8",
    "Get-LogCount": "d3ae2881a794fb61ffc35947a99bd572a5a6cda2f8bfabc3d5b553f74fc200e8",
    "Wait-LogCount": "8b7129561482fec96bcd5a517a3beb2dbaef1a43df31be29b989640c752ad160",
    "Invoke-ShellReq": "ab20664520e5aaecef672c1f1202377526ed72d41bd8d383f45a114e8b32bdd5",
    "Test-AppFront": "d2c61888e7b149dea38f67751ab77cb8b775a2d4e423409005b72437749623ff",
    "Invoke-Shell": "1ec9f2e3c4968bc929803be7d903788a3a3af1a04b7873eed0b20a9869451cff",
    "Invoke-Back": "12efac405811ee1fd7d72fa02fb47fd4240737e815768f247a3b43f6cbeb9fc5",
    "Invoke-BackReq": "01ab97374cb5ccd8ee48b726181a315c5285d0ff4a3fc9218615e2700af21bf4",
    "Invoke-LogPull": "a9fa54e079be0582ef5fa5fa860aa387fb92b0830000cba906ded2deec0fbb23",
    "Invoke-EnsureHome": "178056bf8cb9a8f356dc7f5774f30ff91105c27b1e55271c4b87dc31c9d07280",
    "Reset-AppToChats": "4e21668694b09105a59583ab9ed453b1d23a84d4d4016d7f9ab8b8210edd7040",
    "Save-Shot": "3afac19c029c18e97eafae013a978ab207a685d81b5a511595cd4babfd5220f5",
    "Test-Screen": "523474b1a567ba33f420ea6f78c289d4d059ccb078864a214058ea7c4b4f870a",
    "Remove-LocalFile": "7b7c11ac7caa6a6051216efacfe48595300c175e1ca5b2a5b2be01a198bde273",
    "Get-Pids": "5ded1679cf3fc964f15d96a02e397c5eea3ceaa5fed2a2305bafb600b8ca6ef0",
    "Test-Ordinal": "bb6dd53b801655a99d612b1d8a7625fa8b263d847b051ec73d41e4d09a624f20",
    "Get-TapText": "e4945fd7190c04e9e28e5bf14cac27f256a178fa971cbffd92d5c9c82ffe0814",
    "Get-SwipeText": "a1bf6bbe9cc82d835ee5f5985dfc2367a7ba46e7a938caf1af31da75a7a8037f",
    "Invoke-CalInput": "4a2730c4271cc108af4feee40960c5a29a6f9cf9b24515a399adda33f1d9ec16",
    "Save-CalShot": "a5377b56fa2b3a40e3d15e245fcbc557830ef1982cbc60b22d1b621f7790539e",
    "Set-RepStamp": "b8b3e923b2e7ee6e60d9477cd0941a7448b049c2207680fd86bbb364842602fe",
    "Add-Note": "4af699402b9d33420507bddbaea1acaa8516021d16dd2da773c8fa70c370935c",
    "Invoke-Step": "a6ecabc1d13dc456017014e1e2515937ff9094b957b55305fbe268c034722966",
    "Wait-Ms": "998e127162500c0adc6f19b7c073b459b19635006618367167894a387140d5b9",
    "Invoke-OpenSeedChat": "22b27ce71221d53f25f0d07830faaaff107ef5b64e1ea3363dc9d86a15bbb1dd"
  }, B24_PARSER_FN = {
    "Get-HitsFrom": "441b787524395bd03d8a6524281d00fdc4b47780fa5e5c3b19a2e37d457e15a3",
    "Test-ReadyT2": "e2b97ef1be964ac364979974e5b10be3f921541e90c825c5e100c8a7db5c75f0",
    "X-FirstNonNeg": "d920f64371d0580c7c4fb0d4357b1b4ca242abb1341e61c5813f0171f1890eb6",
    "X-TokenW": "6d416421fd090d26b1667666762be77cbc7fae464d61c7b08dcf5e15f213df36",
    "X-ScrollW": "348a7c452da4af8d96d418f88bc5907a041db475c75829cfb46fa18b5db6edf0",
    "X-LongW": "ed3d79f0bad44ed63f2b7fba766feb2f9bb6b3d6a378db4c7f0934cc028d0328",
    "New-Ctx": "aa47f939777d49b4c86a96b784fea317c6ed33dbb5aa1340a1e40898eaf630b6",
    "New-RepCtx": "cb832a0d05945c1ea40f885ee5b4b92ad107cff24693e78971e7e23d8fe2ac91",
    "Invoke-Main": "795f70a2bf741a18f4a1191c73954fe0b7360eb9b3cba727d9a81c8d8e4ceb70",
    "Get-Hits": "59e531bfb6a713b9643b8cf057ffd6e8c387a03407bb36e4f27fc5dbfa27436e",
    "Test-Ready": "6113f1d735b818943964016e113a5f8657e9aeb9bc283c37963f7a46eb71cd61",
    "Get-Tok": "095e09a4141a5101c6df2cf550d3983012464626f3e29d9710ca250c34539361",
    "Get-MissingTok": "f1cc7de9dd5ae71b0a5f2729b97e6c119f31b80447293db78776cc6702827611",
    "Get-MissingLine": "c659ba9ae63ec0ace52f84e2d6d4125cd4b9432d15d253bd80150042add7feba",
    "X-Scroll": "432a62ea1cf7260a13ebe7b75fc4e0741484e581563e20eb071b8db2f411bb6f",
    "X-Long": "a46e40e73de43c0244ec011c5bd8880ff73a3b386a61447578fb3a7694c25309",
    "X-Send": "f2d623165cba9e22f592029e21566b0a7b9c78f30aa0c966c3299887a7c7651f",
    "X-SendLine": "7cdab0a7ce3b97758ad438e9fb55b512076729e9d79cc2b1f6e020d701873b77",
    "Convert-T0": "f76a102fe8285d344ead1fb62bca988ab9aa37de14a84596188dfc384b20f725"
  };
  const moved = (got, want) => Object.keys(want).filter((n) => got[n] !== want[n]);
  if (process.env.PIN_DUMP) console.log('DUMPH', JSON.stringify({ d: dgD.fns, p: dgP.fns, rd: dgD.rest, rp: dgP.rest, wd: shaB(bufD), wp: shaB(bufP) }));
  const b24 = {
    driverBytes: shaB(bufD) === B24_DRIVER_SHA,
    parserBytes: shaB(bufP) === B24_PARSER_SHA,
  };
  const diagMoved = moved(dgD.fns, B24_DRIVER_FN).map((n) => 'adb-walk.ps1:' + n).concat(dgD.rest === B24_DRIVER_REST ? [] : ['adb-walk.ps1:<script level>'], moved(dgP.fns, B24_PARSER_FN).map((n) => 'adb-walk-parse.ps1:' + n), dgP.rest === B24_PARSER_REST ? [] : ['adb-walk-parse.ps1:<script level>']);
  ok(F(b24).length === 0,
    '★ filewalk walk steps (b24 scriptBytes): the SHA-256 of the RAW BYTES of scripts/device/adb-walk.ps1 and scripts/device/adb-walk-parse.ps1 (no stripping, no white-space change) equals the frozen value. Any byte change of a walk script turns this red: re-base the two hashes (the constants B24_DRIVER_SHA / B24_PARSER_SHA in this key; the diagnostic constants B24_DRIVER_FN / B24_PARSER_FN / B24_DRIVER_REST / B24_PARSER_REST follow) only after a look at the diff (DECISIONS 1596), and re-run the semantic keys b1-b23. Diagnostic only (not the verdict): the functions whose raw bytes moved, and the script-level remainder — failing: ' + JSON.stringify(F(b24)) + ' got driver=' + shaB(bufD) + ' parser=' + shaB(bufP) + ' moved=' + JSON.stringify(diagMoved));
}
