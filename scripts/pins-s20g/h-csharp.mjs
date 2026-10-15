/* ==== S20G F-1 + P0 — the MAUI-bound call sites of the S20G C# (flag SpixiFlags.S20G, P30) ====
 * The pure rules are EXECUTED in the C# harness (scripts/csh/S20GRestoreTests.cs: keepStash / keepPrevious, the dated name
 * + collision suffix, the empty stash, StashBusy, needsReplaceConfirm, the wipe pattern, closeChatOnAccount, the flag
 * line). The harness cannot compile MAUI pages, so this module pins their call sites on comment-stripped C#:
 *   account  — HomePage.onSettings: after the "already open" early return and BEFORE every presentation path (the warm
 *              claim, the parked re-present, both pushPageLoaded branches), `if (S20GRules.closeChatOnAccount(SpixiFlags.S20G))
 *              { closeChatOverlays(true); }`; closeChatOverlays(bool anyWidth = false) keeps the wide-only belt for every
 *              other caller (the only `true` call is this one); onOverlayClosed(SingleChatPage) treats a close made for the
 *              Account as "the chats list is not on screen" (no rating prompt, no chats probe) AFTER the #902 line;
 *   ask      — LaunchPage ixian:restore: — the replace question sits AFTER the W14 wallet guard and the password parse,
 *              behind SpixiFlags.S20G && !restoreReplaceConfirmed && needsReplaceConfirm, FENCED (A-1), and returns;
 *              confirmReplaceThenRestore awaits the 4-argument displaySpixiAlert with the 3 new keys + global-dialog-cancel
 *              (a null task = Cancel), Cancel releases the overlay and returns BEFORE any restore, the restore runs fenced;
 *              onSelectFile re-arms the question;
 *   keep     — restoreAccountFile: keepPrev = SpixiFlags.S20G; a leftover stash is kept BEFORE apply, apply(…, keepPrev, …),
 *              the kept list is renamed AFTER the `!= Done` guard and BEFORE the prefs; keepPreviousContacts logs fixed
 *              words + a count only and its catch the exception TYPE only (no path, no address);
 *   wipe     — wipeEverything deletes every S20GRules.keptFolders folder, each under its own try, type-only log, after the
 *              restore-scratch loop, NOT behind the flag;
 *   flag     — SpixiFlags: key flagS20G, default 1, effectiveFlag, the S20GRules.flagLine log;
 *   lang     — the 3 keys (+ #46 r1 intro-restore-stashbusy-text) exist in all 14 lang files, en-us = the C# ?? fallbacks
 *              verbatim.
 * #46 r1: order — `fromSettings = true` comes BEFORE the close call (NIT); A-N1 — confirmReplaceThenRestore's WHOLE body is
 *   one try / catch with a type-only log; A-3 — the ask passes Config.walletFile (no question while a wallet file is on
 *   disk; executed in csh a3_…); A-1 — a leftover the keep could not move → chooseStash (a fresh stash), and a StashBusy
 *   (unreachable on that path) logs "nothing was moved" + its own text, never "rolled back" / the free-space text;
 *   A-2 — restore-previous/ excluded from every Android backup list and flagged excluded on iOS / Mac (#if-guarded) at
 *   both keep points; the wipe also removes the empty parent; A-4 — DevPage ixian:devflash:s20g:<0|1> (the s20size rules)
 *   + its own push setFlagsDevS20G, and on the BUILT dev.html the switch row appears with the push and sends the verb.
 * DELIBERATE BREAKS (S20G home report): ① the onSettings close call deleted → account fails. ② the confirm moved above the
 *   W14 guard → ask fails. ③ keepPreviousContacts after Done moved below applyRestorePrefs → keep fails. ④ the wipe loop
 *   wrapped in `if (SpixiFlags.S20G)` → wipe fails. ⑤ intro-restore-replace-confirm removed from ja-jp.txt → lang fails.
 *   #46 r1 (fix report): ⑥ `fromSettings = true;` moved below the close call → account fails (order). ⑦ the outer try of
 *   confirmReplaceThenRestore removed → ask fails (fence). ⑧ the chooseStash line deleted → keep fails. ⑨ the restore-previous
 *   exclude dropped from device-transfer → backup fails. ⑩ dev.html setFlagsDevS20G's row push removed → dev fails. */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, join } = h;
  const rd = (f) => stripCode(readFileSync(join(root, f), 'utf8'));
  const body = (t, sig) => {
    const i = t.indexOf(sig); if (i < 0) return '';
    const o = t.indexOf('{', i); let d = 0;
    for (let k = o; k >= 0 && k < t.length; k++) { if (t[k] === '{') d++; else if (t[k] === '}' && --d === 0) return t.slice(o, k + 1); }
    return '';
  };
  const HP = rd('Spixi/Pages/Home/HomePage.xaml.cs');
  const LP = rd('Spixi/Pages/Launch/LaunchPage.xaml.cs');
  const SP = rd('Spixi/Pages/Settings/SettingsPage.xaml.cs');
  const SF = rd('Spixi/Utils/SpixiFlags.cs');

  /* account */
  const onS = body(HP, 'public void onSettings(object sender, EventArgs e)');
  const CLOSE = 'if (S20GRules.closeChatOnAccount(SpixiFlags.S20G))';
  const iClose = onS.indexOf(CLOSE);
  const iEarly = onS.indexOf('SpixiContentPage.getOverlayPages().Exists(p => p is SettingsPage)');
  const firstOf = (...needles) => Math.min(...needles.map((n) => { const i = onS.indexOf(n); return i < 0 ? Infinity : i; }));
  const helper = body(HP, 'private void closeChatOverlays(bool anyWidth = false)');
  const closed = HP.slice(HP.indexOf('else if (overlay is SingleChatPage)'), HP.indexOf('else if (overlay is AppDetailsPage)', HP.indexOf('else if (overlay is SingleChatPage)')));
  const a = {
    found: onS.length > 0 && helper.length > 0 && closed.length > 0,
    call: iClose > iEarly && iEarly >= 0 && /if \(S20GRules\.closeChatOnAccount\(SpixiFlags\.S20G\)\)\s*\{\s*closeChatOverlays\(true\);\s*\}/.test(onS),
    beforePresent: iClose >= 0 && iClose < firstOf('claimWarmingOverlay<SettingsPage>()', 'getParkedOverlay()', 'pushPageLoaded(new SettingsPage('),
    belt: /^\{\s*if \(!rightContent\.IsVisible && !anyWidth\)\s*\{\s*return;\s*\}/.test(helper),
    oneAnyWidthCall: (HP.match(/closeChatOverlays\(true\)/g) || []).length === 1,
    order: onS.indexOf('fromSettings = true;') > iEarly && onS.indexOf('fromSettings = true;') < iClose,   // #46 r1 NIT
    noRating: /bool chatsListOnScreen = currentTab == "tab1" && !homeShellTakeoverOpen;\s*if \(SpixiFlags\.S20G && fromSettings\)\s*\{\s*chatsListOnScreen = false;\s*\}/.test(closed),
  };
  ok(Object.values(a).every(Boolean),
    '★ S20G F-1: opening Account closes the open conversation first (both branches: the rail pane and the phone path), before every presentation path, behind the S20G flag — a chat under Account no longer counts as displayed (no read receipt, the unread count rises); every other caller keeps the wide-only belt — ' + JSON.stringify(a));

  /* ask */
  const nav = body(LP, 'private void onNavigating(object sender, WebNavigatingEventArgs e)');
  const rBranch = nav.slice(nav.indexOf('verb.StartsWith("ixian:restore:", StringComparison.Ordinal)'), nav.indexOf('verb.StartsWith("ixian:proceed:", StringComparison.Ordinal)'));
  const ASK = 'if (SpixiFlags.S20G && !restoreReplaceConfirmed && S20GRules.needsReplaceConfirm(Config.spixiUserFolder, Config.walletFile))';
  const iAsk = rBranch.indexOf(ASK);
  const askBlock = iAsk >= 0 ? body(rBranch.slice(iAsk), ASK) : '';
  const conf = body(LP, 'private async void confirmReplaceThenRestore(string password)');
  const iCancel = conf.indexOf('if (!replace)');
  const cancelBlock = iCancel >= 0 ? body(conf.slice(iCancel), 'if (!replace)') : '';
  const sel = body(LP, 'private async void onSelectFile()');
  /* #46 r1 (A-N1): `{ try { … } catch (Exception ex) { <type-only log>; <overlay release> } }` — nothing outside the try */
  const fence = (() => {
    const m = /^\{\s*try\s*/.exec(conf); if (!m) return false;
    const t0 = conf.indexOf('{', m[0].length - 1);
    const tb = body(conf.slice(t0), '{');
    const after = conf.slice(t0 + tb.length);
    const mc = /^\s*catch \(Exception ex\)\s*/.exec(after); if (!mc) return false;
    const cb = body(after.slice(mc[0].length), '{');
    const rest = after.slice(mc[0].length + cb.length);
    return /^\s*\}$/.test(rest) && /Logging\.warn\("\[RESTORE\][^"]*\(" \+ ex\.GetType\(\)\.Name \+ "\)"\);/.test(cb) && !/ex\.Message|ex\.ToString|password/.test(cb)
      && /removeLoadingOverlay/.test(cb) && tb.indexOf('displaySpixiAlert(') > 0 && tb.indexOf('onRestore(password)') > 0;
  })();
  const k = {
    found: rBranch.length > 0 && conf.length > 0 && sel.length > 0,
    afterGuard: iAsk > rBranch.indexOf('IxianHandler.getWalletList().Count > 0') && rBranch.indexOf('IxianHandler.getWalletList().Count > 0') >= 0
      && iAsk > rBranch.indexOf('string password = split[1];'),
    beforeRestore: iAsk >= 0 && iAsk < rBranch.lastIndexOf('runFencedVerb("ixian:restore:", () =>') && iAsk < rBranch.lastIndexOf('if(!onRestore(password))'),
    fencedAndReturns: /^\{\s*runFencedVerb\("ixian:restore:", \(\) => confirmReplaceThenRestore\(password\)\);\s*return;\s*\}$/.test(askBlock),
    alert: /Task<bool> ask = displaySpixiAlert\(\s*SpixiLocalization\._SL\("intro-restore-replace-title"\) \?\? "[^"]+",\s*SpixiLocalization\._SL\("intro-restore-replace-text"\) \?\? "[^"]+",\s*SpixiLocalization\._SL\("intro-restore-replace-confirm"\) \?\? "Restore",\s*SpixiLocalization\._SL\("global-dialog-cancel"\) \?\? "Cancel"\);\s*replace = ask != null && await ask;/.test(conf),
    cancel: /removeLoadingOverlay/.test(cancelBlock) && /return;\s*\}$/.test(cancelBlock) && !/onRestore/.test(cancelBlock)
      && iCancel < conf.indexOf('onRestore(password)') && conf.indexOf('runFencedVerb("ixian:restore:", () =>') > iCancel,
    fence,
    rearm: /restoreReplaceConfirmed = false;/.test(sel) && (LP.match(/restoreReplaceConfirmed = true;/g) || []).length === 1 && conf.indexOf('restoreReplaceConfirmed = true;') > iCancel,
  };
  ok(Object.values(k).every(Boolean),
    '★ S20G P0 (2): the restore ASKS FIRST when the device still holds contacts and no wallet is loaded — after the W14 guard, fenced (A-1), the native two-button alert awaited (null = Cancel), Cancel changes nothing and releases the overlay, a new file re-arms the question — ' + JSON.stringify(k));

  /* keep */
  const rest = body(LP, 'private RestoreOutcome restoreAccountFile(string source_path, string pass)');
  const iApply = rest.indexOf('var moveResult = RestoreMoves.apply(moves, stashDir, keepPrev, out string? moveFail);');
  const iGuard = rest.indexOf('if (moveResult != RestoreMoves.Result.Done)');
  const guardEnd = iGuard >= 0 ? iGuard + body(rest.slice(iGuard), 'if (moveResult != RestoreMoves.Result.Done)').length : -1;
  const iPrefs = rest.indexOf('applyRestorePrefs(pass);');
  const KEEP = /if \(keepPrev\)\s*\{\s*keepPreviousContacts\(stashDir\);(?:[^\n]*\s*\}|\s*string usual = stashDir;\s*stashDir = S20GRules\.chooseStash\(Config\.spixiUserFolder, usual, DateTime\.Now\);)/g;
  const keeps = [...rest.matchAll(KEEP)].map((m) => m.index);
  const kpc = body(LP, 'private static void keepPreviousContacts(string stashDir)');
  const kpcCatch = kpc.indexOf('catch (Exception ex)') >= 0 ? body(kpc.slice(kpc.indexOf('catch (Exception ex)')), 'catch (Exception ex)') : '';
  const logs = [...kpc.matchAll(/Logging\.\w+\(([^;]*)\);/g)].map((m) => m[1]);
  const p = {
    found: rest.length > 0 && kpc.length > 0,
    flag: /bool keepPrev = SpixiFlags\.S20G;/.test(rest),
    keptBefore: keeps.length === 2 && keeps[0] < iApply && iApply >= 0,
    keptAfterDone: keeps.length === 2 && keeps[1] > guardEnd && guardEnd > iApply && keeps[1] < iPrefs,
    pure: /string\? kept = RestoreMoves\.keepPrevious\(stashDir, Config\.spixiUserFolder, DateTime\.Now, out int contacts\);/.test(kpc),
    fixedLog: logs.length === 2 && logs[0] === '"[RESTORE] kept the previous contact list (" + contacts + " items)"'
      && /^"\[RESTORE\][^"]*\(" \+ ex\.GetType\(\)\.Name \+ "\)"$/.test(logs[1]) && /ex\.GetType\(\)\.Name/.test(kpcCatch)
      && !/ex\.Message|ex\.ToString|\+ kept\b|stashDir|spixiUserFolder/.test(logs.join(' ')),
    noDelete: !/Directory\.Delete\([^)]*stashDir/.test(rest + kpc),
    /* #46 r1 (A-1): the fresh stash is chosen right after the first keep and BEFORE apply */
    fresh: /keepPreviousContacts\(stashDir\);\s*string usual = stashDir;\s*stashDir = S20GRules\.chooseStash\(Config\.spixiUserFolder, usual, DateTime\.Now\);\s*if \(stashDir != usual\)\s*\{\s*Logging\.warn\("\[RESTORE\] [^"]+"\);\s*\}\s*\}\s*var moveResult = RestoreMoves\.apply\(moves, stashDir, keepPrev, out string\? moveFail\);/.test(rest),
  };
  /* #46 r1 (A-1): StashBusy — its own words + text, before the "rolled back" log, FailedReported */
  const guardBody = iGuard >= 0 ? body(rest.slice(iGuard), 'if (moveResult != RestoreMoves.Result.Done)') : '';
  const iBusy = guardBody.indexOf('if (moveFail == RestoreMoves.StashBusy)');
  const busy = iBusy >= 0 ? body(guardBody.slice(iBusy), 'if (moveFail == RestoreMoves.StashBusy)') : '';
  p.stashBusy = busy.length > 0 && iBusy < guardBody.indexOf('were rolled back') && /nothing was moved/.test(busy) && !/rolled back/.test(busy)
    && /_SL\("intro-restore-stashbusy-text"\)/.test(busy) && !/intro-restore-account-failed-text|free space/.test(busy)
    && /removeLoadingOverlay/.test(busy) && /return RestoreOutcome\.FailedReported;\s*\}$/.test(busy);
  /* #46 r1 (A-2): iOS / Mac flag the one parent excluded from backup — #if-guarded, type-only — at both keep points */
  const exb = body(LP, 'private static void excludeKeptFromBackup()');
  p.appleExcluded = /^\{\s*#if IOS \|\| MACCATALYST\s*try\s*\{\s*string dir = Path\.Combine\(Config\.spixiUserFolder, S20GRules\.KeptParent\);[\s\S]*Foundation\.NSUrl url = Foundation\.NSUrl\.FromFilename\(dir\);\s*if \(!url\.SetResource\(Foundation\.NSUrl\.IsExcludedFromBackupKey, Foundation\.NSNumber\.FromBoolean\(true\), out Foundation\.NSError err\)[\s\S]*catch \(Exception e\)\s*\{\s*Logging\.warn\("[^"]*\(" \+ e\.GetType\(\)\.Name \+ "\)"\);\s*\}\s*#endif\s*\}$/.test(exb)
    && /\}\s*excludeKeptFromBackup\(\);\s*\}$/.test(kpc)
    && /var moveResult = RestoreMoves\.apply\(moves, stashDir, keepPrev, out string\? moveFail\);\s*if \(keepPrev\)\s*\{\s*excludeKeptFromBackup\(\);[^\n]*\s*\}/.test(rest);
  ok(Object.values(p).every(Boolean),
    '★ S20G P0 (1): restoreAccountFile keeps the contact list it replaces — a leftover stash is kept first, apply parks without deleting (keepStash = the S20G flag), the rename runs only AFTER Done and before the prefs (all or nothing unchanged), the log line is fixed words + a count, a failure logs the exception TYPE and deletes nothing — ' + JSON.stringify(p));

  /* wipe */
  const wipe = body(SP, 'private void wipeEverything()');
  const iScratch = wipe.indexOf('new[] { "tmp_zip", LaunchPage.RestoreStashFolder }');
  const LOOP = /foreach \(string keptDir in S20GRules\.keptFolders\(Config\.spixiUserFolder\)\)\s*\{\s*try \{ Directory\.Delete\(keptDir, true\); \} catch \(Exception ex\) \{ Logging\.error\("wipe: kept contact list threw: " \+ ex\.GetType\(\)\.Name\); \}\s*\}/;
  const mL = LOOP.exec(wipe);
  const before = mL ? wipe.slice(Math.max(0, mL.index - 200), mL.index) : '';
  const w = {
    loop: !!mL && mL.index > iScratch && iScratch >= 0 && mL.index > wipe.indexOf('IxianHandler.shutdown()'),
    notFlagged: !!mL && !/S20G/.test(before.slice(before.lastIndexOf('}') + 1)),
    /* #46 r1 (A-2): then the one parent, only when empty (non-recursive) */
    parent: !!mL && /^\s*try \{ string kp = Path\.Combine\(Config\.spixiUserFolder, S20GRules\.KeptParent\); if \(Directory\.Exists\(kp\) && !Directory\.EnumerateFileSystemEntries\(kp\)\.Any\(\)\) \{ Directory\.Delete\(kp, false\); \} \} catch \(Exception ex\) \{ Logging\.error\("wipe: kept parent threw: " \+ ex\.GetType\(\)\.Name\); \}/.test(wipe.slice(mL.index + mL[0].length)),
  };
  ok(Object.values(w).every(Boolean),
    '★ S20G P0 (3): delete account deletes every kept contact list (restore-previous/<stamp> + a fresh stash, exact names; then the empty parent), each under its own try with a type-only log, after the shutdown — and NOT behind the flag (a list kept while it was on must not outlive the account) — ' + JSON.stringify(w));

  /* flag */
  const f = {
    key: /public const string S20GKey = "flagS20G";/.test(SF),
    read: /sg = Preferences\.Default\.Get\(S20GKey, 1\);/.test(SF) && /int sp = 1, mg = 1, sb = 1, sm = 1, fs = 1, sg = 1;/.test(SF),
    effective: /S20G = S16PassRules\.effectiveFlag\(dev, sg\);\s*Logging\.info\(S20GRules\.flagLine\(S20G\)\);/.test(SF),
    defaultOn: /public static bool S20G \{ get; private set; \} = true;/.test(SF),
  };
  ok(Object.values(f).every(Boolean),
    '★ S20G: ONE flag for all the S20G C# — pref flagS20G (absent = ON), the S16 rule (a stored 0 acts only in dev mode), `[FLAGS] s20g=<0|1>` logged once per start — ' + JSON.stringify(f));

  /* lang */
  const langDir = join(root, 'Spixi/Resources/Raw/lang');
  const files = readdirSync(langDir).filter((x) => /^[a-z]{2}-[a-z]{2}\.txt$/.test(x));
  const val = (t, key) => ((t.match(new RegExp('^' + key + ' = (.+)$', 'm')) || [])[1] || '').trim();
  const KEYS = ['intro-restore-replace-title', 'intro-restore-replace-text', 'intro-restore-replace-confirm', 'intro-restore-stashbusy-text'];
  const missing = [];
  for (const x of files) { const t = readFileSync(join(langDir, x), 'utf8'); for (const key of KEYS) if (!val(t, key)) missing.push(x + ':' + key); }
  const en = readFileSync(join(langDir, 'en-us.txt'), 'utf8');
  const fb = (key) => (((conf + rest).match(new RegExp('_SL\\("' + key + '"\\) \\?\\? "([^"]+)"')) || [])[1] || '');
  const l = {
    files: files.length,
    missing,
    enEqualsFallback: KEYS.every((key) => val(en, key) && val(en, key) === fb(key)),
    cancelKey: /^global-dialog-cancel = Cancel$/m.test(en),
  };
  ok(files.length === 14 && missing.length === 0 && l.enEqualsFallback && l.cancelKey,
    '★ S20G P0 (2): the replace question\'s 3 keys (+ #46 r1 the stash-busy text) exist in all 14 lang files (English until the translators\' pass) and the C# ?? fallbacks equal en-us.txt verbatim; Cancel reuses global-dialog-cancel — ' + JSON.stringify(l));
  /* backup — #46 r1 (A-2): restore-previous/ is excluded from every Android list (≤11 · 12+ cloud · 12+ transfer) */
  const xml = (f) => readFileSync(join(root, 'Spixi/Platforms/Android/Resources/xml', f), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const listOf = (x, sec) => { const m = x.match(new RegExp('<' + sec + '>([\\s\\S]*?)</' + sec + '>')); return m ? [...m[1].matchAll(/<exclude domain="(\w+)" path="([^"]+)"\s*\/>/g)].map((y) => y[1] + ':' + y[2]) : []; };
  const der = xml('data_extraction_rules.xml');
  const lists = [listOf(xml('backup_rules.xml'), 'full-backup-content'), listOf(der, 'cloud-backup'), listOf(der, 'device-transfer')];
  const parentName = (readFileSync(join(root, 'Spixi/Utils/RestoreMoves.cs'), 'utf8').match(/public const string KeptParent = "([^"]+)";/) || [])[1];
  ok(parentName === 'restore-previous' && lists.every((x) => x.length > 0 && x.includes('file:Documents/Spixi/' + parentName)),
    '★ S20G #46 r1 (A-2): the kept contact lists (ONE fixed parent `' + parentName + '`, read from S20GRules.KeptParent) are excluded from the Android backup in all three lists — ' + JSON.stringify(lists.map((x) => x.includes('file:Documents/Spixi/' + parentName))));

  /* dev — #46 r1 (A-4): the S20G dev switch, like s20size (P29) */
  const DV = rd('Spixi/Pages/Dev/DevPage.xaml.cs');
  const iS = DV.indexOf('current_url.StartsWith("ixian:devflash:s20g:", StringComparison.Ordinal)');
  const iG = DV.indexOf('current_url.StartsWith("ixian:devflash:", StringComparison.Ordinal)');
  const vb = iS < 0 ? '' : body(DV.slice(iS), 'current_url.StartsWith("ixian:devflash:s20g:"');
  const pf = body(DV, 'private void pushFlagsDev()');
  const dv = {
    branch: iS > 0 && iG > 0 && iS < iG
      && /if \(Preferences\.Default\.Get\("devMode", false\)\s*&& S16PassRules\.parseFlagTail\(current_url\.Substring\("ixian:devflash:s20g:"\.Length\), out int value\)\)\s*\{\s*Preferences\.Default\.Set\(SpixiFlags\.S20GKey, value\);\s*\}/.test(vb)
      && /pushFlagsDev\(\);\s*\}$/.test(vb),
    push: /sg = Preferences\.Default\.Get\(SpixiFlags\.S20GKey, 1\);/.test(pf) && /Utils\.sendUiCommand\(this, "window\.setFlagsDevS20G", sg == 0 \? "0" : "1"\);/.test(pf),
  };
  let s = null;
  try {
    const { aKit } = await import('../pins-s11/a-kit.mjs');
    const K = aKit(h);
    s = await K.boot('dev.html', { wait: 900 });
    const { W, d, push } = s;
    push('setFlagsDev', '1,1,1,1');
    const before = !!d.querySelector('[data-flag="s20g"]');
    push('setFlagsDevS20G', 'x');
    const junk = !!d.querySelector('[data-flag="s20g"]');
    push('setFlagsDevS20G', '0');
    const sw = d.querySelector('[data-flag="s20g"]');
    dv.row = !before && !junk && !!sw && sw.getAttribute('aria-checked') === 'false' && sw.getAttribute('role') === 'switch';
    s.sent.length = 0;
    if (sw) sw.dispatchEvent(new W.MouseEvent('click', { bubbles: true }));
    dv.verb = s.sent.includes('ixian:devflash:s20g:1') && !!sw && sw.getAttribute('aria-checked') === 'true';
    dv.noErr = K.noErr(s.errs);
  } catch (e) { dv.threw = e.message; } finally { if (s) s.close(); }
  ok(dv.branch && dv.push && dv.row && dv.verb && dv.noErr,
    '★ S20G #46 r1 (A-4): Developer › Release flags carries the S20G switch — DevPage ixian:devflash:s20g:<0|1> (dev mode + the exact tail, before the generic devflash branch, echo) + its own push setFlagsDevS20G; the BUILT dev.html shows the row only after that push and a tap sends the verb — ' + JSON.stringify(dv));
}
