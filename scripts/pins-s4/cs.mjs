/**
 * ★ Session 4 pins — Agent CS (#1132: P-1 levers 1 · 2 · 3 · 5 · 11).
 *
 * WHAT IS EXECUTED WHERE. The rules are pure C# in Spixi/Utils/OpenPerfRules.cs and are EXECUTED by scripts/csh
 * (`node scripts/run-csh.mjs`, OpenPerfRulesTests.cs). The call sites are MAUI-bound C# (SpixiContentPage, HomePage)
 * that nothing here can compile or run, so the pins below are SOURCE pins on stripCode'd text, each naming the rule it
 * holds — the honest kind available (#771/#798). Every pin was broken on purpose and seen to fail (report: Agent CS).
 */
export default async function (h) {
  const { ok, root, stripCode, readFileSync, readdirSync, existsSync, join } = h;
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const count = (t, re) => (t.match(re) || []).length;
  /* brace-matched body from `head` (string literals masked, so a "{0}" in a log format cannot miscount) */
  const mask = (t) => t.replace(/@"(?:[^"]|"")*"|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)+'/g, (m) => ' '.repeat(m.length));
  const body = (t, head, from = 0) => {
    const a = t.indexOf(head, from);
    if (a < 0) return '';
    const m = mask(t);
    let d = 0;
    for (let k = m.indexOf('{', a + head.length); k >= 0 && k < m.length; k++) {
      if (m[k] === '{') d++;
      else if (m[k] === '}' && --d === 0) return t.slice(a, k + 1);
    }
    return '';
  };
  const scp = stripCode(rd('Spixi/Utils/SpixiContentPage.cs'));
  const hp = stripCode(rd('Spixi/Pages/Home/HomePage.xaml.cs'));
  const rules = stripCode(rd('Spixi/Utils/OpenPerfRules.cs'));

  /* ══ Lever 1 (A1, #1130): ONE native-WebView lookup — the renderer's .Control, never for a mini-app ══ */
  {
    const helper = body(scp, 'internal static Android.Webkit.WebView? nativeWebViewOf(WebView? wv)');
    const iIf = scp.lastIndexOf('#if ANDROID', scp.indexOf('internal static Android.Webkit.WebView? nativeWebViewOf('));
    const iEnd = scp.indexOf('#endif', iIf);
    const iMini = helper.indexOf('if (wv == null || wv.ClassId == "miniapp")');
    const iDirect = helper.indexOf('if (wv.Handler?.PlatformView is Android.Webkit.WebView direct)');
    const iCtl = helper.indexOf('return (wv.Handler?.PlatformView as global::Spixi.Platforms.Android.Renderers.SpixiWebviewRenderer2)?.Control;');
    const r = {
      helper: helper.length > 0 && iMini >= 0 && /\{\s*return null;\s*\}/.test(helper.slice(iMini, iDirect)) && iDirect > iMini && iCtl > iDirect,
      androidOnly: iIf >= 0 && iEnd > scp.indexOf('internal static Android.Webkit.WebView? nativeWebViewOf(') && iIf < scp.indexOf('internal static Android.Webkit.WebView? nativeWebViewOf('),
      one: count(scp, /nativeWebViewOf\(WebView\? wv\)/g) === 1,
    };
    ok(Object.values(r).every(Boolean),
      '★ S4 lever 1 (A1, #1132): nativeWebViewOf is the ONE Android lookup of the native android.webkit.WebView — a mini-app WebView (ClassId "miniapp", AND-19 / #334) answers null BEFORE any cast, then a direct WebView, then the compat renderer\'s `(PlatformView as SpixiWebviewRenderer2)?.Control` (all 42 walk opens logged pv=spixiwebviewrenderer2, so the direct cast alone was null) — ' + JSON.stringify(r));

    /* both sites use it, and no other C# file casts a platform view to android.webkit.WebView */
    const surf = body(scp, 'internal void applyPageSurfaceColor()');
    const hold = body(scp, 'private static void holdStageUntilDrawn(PreloadOp op)');
    const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
      e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
    const files = walk('Spixi');
    const strays = files.filter((f) => {
      let t = stripCode(rd(f));
      if (f.endsWith('SpixiContentPage.cs')) t = t.replace(helper, '');
      return /PlatformView\s+(is|as)\s+(global::)?Android\.Webkit\.WebView\b/.test(t);
    });
    const r2 = {
      surface: /Android\.Webkit\.WebView\? nativeWebView = nativeWebViewOf\(_webView\);\s*if \(nativeWebView != null && !keepsNativeWebViewTransparent\)\s*\{\s*nativeWebView\.SetBackgroundColor\(Android\.Graphics\.Color\.ParseColor\(pageSurfaceColorString\)\);/.test(surf),
      hold: /try \{ native = nativeWebViewOf\(op\.target\._webView\); \} catch \(Exception\) \{ \}/.test(hold)
        && hold.indexOf('native = nativeWebViewOf(') < hold.indexOf('setHoldGrounds(op, native, true);') && /Spixi\.PresentHold\.start\(native, HoldCapMs, /.test(hold),
      noStray: strays.length === 0 && files.length > 50,   /* ★ S9 A-FLASH C2 re-base (#1205): `surface` — the F1 pass skips the chat's native base (keepsNativeWebViewTransparent), every other page keeps it */
    };
    ok(Object.values(r2).every(Boolean),
      '★ S4 lever 1 (A1): BOTH sites go through it — the F1 surface pass (applyPageSurfaceColor) and the G-1 hold (holdStageUntilDrawn, before the grounds go transparent, the view PresentHold waits on) — and no other `PlatformView is/as Android.Webkit.WebView` exists in any of ' + files.length + ' C# files (strays: ' + (strays.join(', ') || 'none') + ') — ' + JSON.stringify(r2));

    /* the A1 probe keeps its line and gains nat= (grammar executed in scripts/csh: the_new_p1_lines_pass_the_grammar) */
    const probe = body(scp, 'private static void p1HoldProbe(PreloadOp op)');
    ok(/\+ " page=" \+ P1Perf\.kind\(op\.target\)\s*\+ " nat=" \+ \(nativeWebViewOf\(wv\) != null \? "1" : "0"\)\);/.test(probe)
      && /P1Perf\.line\("a1 hold webview="/.test(probe) && /p1HoldProbe\(op\);[^;]*\s*Spixi\.PresentHold\.start\(native,/.test(scp),
      '★ S4 lever 1 (A1): the `[P1] a1 hold …` probe stays (before the hold) and carries `nat=1|0` = nativeWebViewOf found the view the hold drives — 9 tokens; the walk reads `nat=1` + `[CDPERF] chat held … why=vsc frames>=1`');
  }

  /* ══ Lever 2: the wallet latch — force only an unfed document; rows re-pushed when what they render moved ══ */
  {
    const tab = hp.slice(hp.indexOf('if (currentTab == "tab2")'), hp.indexOf('else if (currentTab == "tab3")'));
    const lt = body(hp, 'public void loadTransactions(bool forceRefresh)');
    const iSig = lt.indexOf('long nameSigAtPush = walletNameSignatureNow();');
    const iFiat = lt.indexOf('IxiNumber fiatAtPush = Node.fiatPrice;');
    const iClear = lt.indexOf('"clearPaymentActivity", filterToString(transactionFilter)');
    const iLastRow = lt.lastIndexOf('addPaymentActivity(activityWithTx);');
    const LATCH = 'System.Threading.Interlocked.Exchange(ref txPushedGen, OpenPerfRules.walletLatchAfterBurst(pageLoaded, txGenAtPush));';
    const iLatch = lt.indexOf(LATCH);
    const iGen = lt.indexOf('int txGenAtPush = System.Threading.Volatile.Read(ref txDocGen);');
    const iDone = lt.indexOf('"clearPaymentActivityDone"');
    const r = {
      /* #46 r1 A-N5: the latch is a document GENERATION (OpenPerfRules.walletDocumentFed, executed in scripts/csh) */
      field: /private int txDocGen = 0;\s*private int txPushedGen = OpenPerfRules\.WalletNotFed;\s*private bool txPushedToShell => OpenPerfRules\.walletDocumentFed\(System\.Threading\.Volatile\.Read\(ref txPushedGen\), System\.Threading\.Volatile\.Read\(ref txDocGen\)\);/.test(hp)
        && !/txPushedToShell\s*=[^=>]/.test(hp),
      genBefore: iGen >= 0 && iGen < iClear && count(hp, /ref txPushedGen,/g) === 1,
      tab: /raiseTxDirtyIfRowsStale\(\);\s*loadTransactions\(!txPushedToShell\);/.test(tab) && !/loadTransactions\(true\)/.test(tab),
      filterForces: /transactionFilter = 0;[\s\S]{0,200}?\}\s*loadTransactions\(true\);/.test(body(hp, 'public void filterTransactions(string filter)')),
      readBefore: iSig >= 0 && iFiat >= 0 && iSig < iClear && iFiat < iClear,
      setAfterRows: iLastRow > 0 && iLatch > iLastRow && iDone > iLatch && count(hp, /walletLatchAfterBurst\(/g) === 1
        && lt.indexOf('Interlocked.Exchange(ref txPushedNameSig, nameSigAtPush);') > iLastRow && lt.indexOf('txPushedFiat = fiatAtPush;') > iLastRow,
      p1Line: /P1Perf\.line\("wallet txpush rows=" \+ p1Rows \+ " force=" \+ \(forceRefresh \? "1" : "0"\)/.test(lt),
    };
    ok(Object.values(r).every(Boolean),
      '★ S4 lever 2 (#1132): the Wallet tab entry calls loadTransactions(!txPushedToShell) — a FED document is gated by shouldRefreshTransactions instead of re-pushing every row on every visit (`txpush rows=50 force=1`, 67 ms C# + 2 drops) — filters still force; the names / fiat the rows will render AND the document generation are read BEFORE the burst; the latch is ONE write of walletLatchAfterBurst(pageLoaded, genAtPush) AFTER the last row and before the done push (#340: never latch a burst an unloaded page dropped; #46 r1 A-N5: a burst that straddles a reload latches the OLD generation, so it cannot mark the fresh document fed — executed in scripts/csh); the `[P1] wallet txpush … force=` line stays — ' + JSON.stringify(r));

    /* reset at EVERY site the apps latch resets (derived, not listed) */
    const appsResets = [...hp.matchAll(/(?<!bool )appsPushedToShell = false;/g)].map((m) => m.index);   // the declaration is not a reset
    const BUMP = 'System.Threading.Interlocked.Increment(ref txDocGen);';
    const paired = appsResets.filter((i) => hp.slice(i + 'appsPushedToShell = false;'.length).trimStart().startsWith(BUMP));
    /* ★ S10 F6 (#1254): the wallet pre-push + its [P1] probe READ the generation (once per document) — reads only */
    const s10 = body(hp, 'private void scheduleWalletPrePush(bool fromOnLoad)') + body(hp, 'private void probeFirstWalletVisit()')
      + body(hp, 'private void scheduleAppsPrePush(bool fromOnLoad)') + body(hp, 'private void probeFirstAppsVisit(long entryT0)')   // ★ S11 F re-base (#1262): + the apps twin (reads only; pins-s11/f-wiring)
      + body(hp, 'private void loadApps(bool forceRefresh)');   // ★ S11 A2 re-base (#1263, R1-m2): + the apps burst's two generation reads (pins-s11/f-wiring)
    const s10Reads = count(s10, /System\.Threading\.Volatile\.Read\(ref txDocGen\)/g);
    ok(appsResets.length >= 3 && paired.length === appsResets.length && hp.split(BUMP).length - 1 === appsResets.length
      && count(s10, /ref txDocGen\b/g) === s10Reads
      && count(hp, /ref txDocGen\b/g) === appsResets.length + 2 + s10Reads,
      '★ S4 lever 2: the wallet document generation is bumped at every one of the ' + appsResets.length + ' sites appsPushedToShell resets (onLoaded · reload · reloadShell — a fresh or dying document holds no rows; the onLoaded bump also closes the reload window: a burst that read the generation before the fresh document\'s onload latches an old one), directly beside it, and nowhere else (the only other uses: the fed property\'s read and the burst\'s read) — paired ' + paired.length);

    /* the gate is raised when names or the fiat price moved under rows already pushed — tab entry AND the tick */
    const raise = body(hp, 'private void raiseTxDirtyIfRowsStale()');
    const sig = body(hp, 'private static long walletNameSignatureNow()');
    const r3 = {
      rule: /OpenPerfRules\.walletRowsStale\(txPushedToShell, walletNameSignatureNow\(\),\s*System\.Threading\.Interlocked\.Read\(ref txPushedNameSig\), fiatAtPush != null && Node\.fiatPrice != fiatAtPush\)\)\s*\{\s*UIHelpers\.shouldRefreshTransactions = true;\s*\}/.test(raise),
      fenced: /catch \(Exception ex\)\s*\{\s*Logging\.warn\("wallet rows check failed: " \+ ex\.GetType\(\)\.Name\);/.test(raise),
      names: /lock \(FriendList\.friends\)\s*\{\s*names = FriendList\.friends\.Select\(f => new KeyValuePair<byte\[\]\?, string\?>\(f\.walletAddress\?\.addressNoChecksum, f\.nickname\)\)\.ToList\(\);\s*\}\s*return OpenPerfRules\.walletNameSignature\(names\);/.test(sig),
      tick: /updateContactStatus\(\);\s*raiseTxDirtyIfRowsStale\(\);\s*loadTransactions\(false\);/.test(hp) && count(hp, /raiseTxDirtyIfRowsStale\(\);/g) === 2,
    };
    ok(Object.values(r3).every(Boolean),
      '★ S4 lever 2: the two row inputs no dirty flag carried — contact NAMES (rename / add / delete, Core\'s FriendList) and the FIAT price (Node.updateIxiPrice) — re-raise shouldRefreshTransactions through OpenPerfRules.walletRowsStale (executed in scripts/csh: only when the document HOLDS rows, so no boot-time push) on the tab entry and on the 2 s tick; status / new rows already raise it (Node.addIncomingTransaction · addTransaction · inclusion callbacks · transactionSend) — ' + JSON.stringify(r3));
  }

  /* ══ Lever 11: the post-hide wait — 100 on Windows (#229b), one frame on Android ══ */
  {
    const i0 = scp.indexOf('bool mirrorSlide = op.slideIn;');
    const seg = i0 < 0 ? '' : scp.slice(i0, scp.indexOf('op.target.Dispose();', scp.indexOf('op.hostGrid.Children.Remove(op.stage);', i0)));
    const iHide = seg.indexOf('op.stage.Opacity = 0;\n');
    const iWait = seg.indexOf('await Task.Delay(OpenPerfRules.closeHideWaitMs(');
    const iRemove = seg.indexOf('op.hostGrid.Children.Remove(op.stage);');
    ok(i0 > 0 && iHide >= 0 && iWait > iHide && iRemove > iWait
      && /await Task\.Delay\(OpenPerfRules\.closeHideWaitMs\(\s*Microsoft\.Maui\.Devices\.DeviceInfo\.Platform == Microsoft\.Maui\.Devices\.DevicePlatform\.WinUI,\s*Microsoft\.Maui\.Devices\.DeviceInfo\.Platform == Microsoft\.Maui\.Devices\.DevicePlatform\.Android\)\);/.test(seg)
      && !/await Task\.Delay\(100\);/.test(seg)
      && /if \(windows\)\s*\{\s*return 100;\s*\}\s*return android \? 16 : 100;/.test(body(rules, 'internal static int closeHideWaitMs(bool windows, bool android)')),
      '★ S4 lever 11 (#1132): closeOverlay still HIDES first and removes after the wait (#229b), but the wait is OpenPerfRules.closeHideWaitMs(WinUI, Android) — 100 ms on Windows (the WebView2 teardown flash it exists for), one 60 Hz frame (16 ms) on Android, 100 on iOS / Mac (executed in scripts/csh) — and no literal 100 is left on that path');
  }

  /* ══ Lever 5: a tap TAKES the warming spare; the attach waits for the spare's own onload ══ */
  {
    const push = body(scp, 'public string? pushSpareChat(Action<SingleChatPage> attach, int column, string navKey, int timeoutMs = 4000)');
    const iFirst = push.indexOf('if (!OpenPerfRules.spareMayAttach(op.target is SingleChatPage, spareBooted, SPARE_CLAIM_WARMING))');
    const iLock = push.indexOf('else if (modalOverlayOp != null)');
    const iTake = push.indexOf('activePreload = op;');
    const iWarm = push.indexOf('if (!(op.target is SingleChatPage scp) || !scp.spareShellBooted)', iTake);
    const iDefer = push.indexOf('attachSpareOnBoot(op, attach, timeoutMs);', iWarm);
    const iAttach = push.indexOf('attach((SingleChatPage)op.target);');
    const r = {
      dial: /private const bool SPARE_CLAIM_WARMING = true;/.test(scp) && /private const int SPARE_CLAIM_BOOT_MS = 1000;/.test(scp),
      firstCheck: iFirst > 0 && iLock > iFirst && /bool spareBooted = op\.target is SingleChatPage rscp && rscp\.spareShellBooted;/.test(push)
        && /\)\)\s*\{\s*why = SPARE_WHY_WARMING;\s*\}/.test(push.slice(iFirst, iLock)),
      deferBeforeAttach: iTake > 0 && iWarm > iTake && iDefer > iWarm && /attachSpareOnBoot\(op, attach, timeoutMs\);\s*return null;\s*\}/.test(push) && iAttach > iDefer,
      onePath: count(push, /attachSpareOnBoot\(/g) === 1 && count(scp, /attachSpareOnBoot\(op, attach, timeoutMs\)/g) === 1,
    };
    ok(Object.values(r).every(Boolean),
      '★ S4 lever 5 (#1132): pushSpareChat\'s FIRST check is OpenPerfRules.spareMayAttach(isChat, booted, SPARE_CLAIM_WARMING) (executed in scripts/csh: READY → take; WARMING → take only with the dial, else today\'s `why=warming`), every other refusal (lock · staging · host · z-order) and the take are unchanged, and a spare taken WARMING never reaches attach — it is handed to attachSpareOnBoot and the method returns null (9 `why=warming` opens measured 239 / 323 ms vs 86 / 122 on a ready spare) — ' + JSON.stringify(r));

    const asb = body(scp, 'private void attachSpareOnBoot(PreloadOp op, Action<SingleChatPage> attach, int timeoutMs)');
    const run = body(asb, 'Action run = () =>');
    const iMine = run.indexOf('lock (preloadLock) { mine = activePreload == op && !op.abandoned; }');
    const iBail = run.indexOf('if (!mine)');
    const iAtt = run.indexOf('attach(spare);');
    const iTo = run.indexOf('presentPreload(op, "timeout");');
    const r2 = {
      stillMine: iMine >= 0 && iBail > iMine && /if \(!mine\)\s*\{\s*return;/.test(run) && iAtt > iBail,
      presentOnlyAfterAttach: iTo > iAtt && count(asb, /presentPreload\(/g) === 1 && /Task\.Delay\(timeoutMs\)\.ContinueWith\(_ =>\s*\{\s*presentPreload\(op, "timeout"\);\s*\}\);/.test(run),
      attachThrows: /catch \(Exception ex\)\s*\{\s*Logging\.error\("attachSpareOnBoot: attach failed: " \+ ex\.GetType\(\)\.Name\);\s*abandonSpareClaim\(op, SPARE_WHY_ATTACH\);\s*return;\s*\}/.test(run),
      parkThenRecheck: /SpixiContentPage page = op\.target;\s*Interlocked\.Exchange\(ref page\.spareAttachOnBoot, run\);\s*if \(spare\.spareShellBooted\)\s*\{\s*Interlocked\.Exchange\(ref page\.spareAttachOnBoot, null\)\?\.Invoke\(\);\s*return;\s*\}/.test(asb),
      bootBudget: /Task\.Delay\(SPARE_CLAIM_BOOT_MS\)\.ContinueWith\(_ => MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*if \(Interlocked\.Exchange\(ref page\.spareAttachOnBoot, null\) != null\)\s*\{\s*abandonSpareClaim\(op, "boot"\);/.test(asb),
      noDrop: !/dropSpareChat\(/.test(asb),
    };
    ok(Object.values(r2).every(Boolean),
      '★ S4 lever 5: the parked attach runs ONCE (Interlocked.Exchange on one field) and only while its op is STILL the staging op (a tap elsewhere superseded it → cancelPreload owns the teardown); the present is armed only AFTER attach (the outer timeoutMs — attach → onLoad → armPresentOnPainted keeps the 400 ms backstop), so no unbooted, friend-less document is ever shown; the re-check after parking is a belt (dead while Navigating is main-thread, A-N6); a spare that has not booted in SPARE_CLAIM_BOOT_MS, or whose attach throws, is abandoned — never dropSpareChat (the slot was emptied by the take: used once) — ' + JSON.stringify(r2));

    const nav = body(scp, 'protected void webViewNavigating(object? sender, WebNavigatingEventArgs e)');
    const ab = body(scp, 'private void abandonSpareClaim(PreloadOp op, string why)');
    const iSync = ab.indexOf('activePreload = null;');
    const iCancel = ab.indexOf('cancelPreload(op);');
    const iHost = ab.indexOf('onSpareClaimAbandoned(op.navKey);');
    const homeAb = body(hp, 'protected override void onSpareClaimAbandoned(string navKey)');
    const sweepB = body(scp, 'public static void cancelTakenWarmingSpare(string why)');
    const r3 = {
      hook: /if \(e\.Url != null && e\.Url\.StartsWith\("ixian:onload", StringComparison\.Ordinal\)\)\s*\{\s*Action\? claimed = Interlocked\.Exchange\(ref spareAttachOnBoot, null\);\s*if \(claimed != null\)\s*\{\s*MainThread\.BeginInvokeOnMainThread\(claimed\);/.test(nav),
      syncClear: iSync >= 0 && /lock \(preloadLock\)\s*\{\s*mine = activePreload == op;\s*if \(mine\)\s*\{\s*activePreload = null;/.test(ab) && iCancel > iSync && iHost > iCancel
        && /if \(!mine \|\| op\.navKey == null\)\s*\{\s*return;[^}]*\}\s*P1Perf\.line\(OpenPerfRules\.p1ClaimAbandon\(why\)\);\s*if \(!OpenPerfRules\.takenClaimRetries\(why\)\)\s*\{\s*return;\s*\}\s*try\s*\{\s*onSpareClaimAbandoned\(op\.navKey\);/.test(ab),
      baseNoop: /protected virtual void onSpareClaimAbandoned\(string navKey\)\s*\{\s*\}/.test(scp),
      /* #46 r1 A-N2 · N3: the sweep clears activePreload SYNCHRONOUSLY under the lock (as abandonSpareClaim) and re-runs
         the tap on the cold path only when OpenPerfRules.takenClaimRetries(why) says the tap still stands (executed) */
      sweep: /lock \(preloadLock\)\s*\{\s*if \(!OpenPerfRules\.takenClaimRetries\(why\)\)\s*\{\s*navSeq\+\+;\s*\}\s*op = activePreload;\s*if \(op == null \|\| !\(op\.target is SingleChatPage s\) \|\| s\.friend != null\)\s*\{\s*return;\s*\}\s*op\.abandoned = true;\s*activePreload = null;[^\n]*\s*seq = navSeq;\s*\}\s*Interlocked\.Exchange\(ref op\.target\.spareAttachOnBoot, null\);\s*cancelPreload\(op\);/.test(sweepB)
        && /if \(navKey == null \|\| !OpenPerfRules\.takenClaimRetries\(why\)\)\s*\{\s*return;\s*\}\s*MainThread\.BeginInvokeOnMainThread\(\(\) =>\s*\{\s*bool stands;\s*lock \(preloadLock\)\s*\{\s*stands = OpenPerfRules\.coldRerunStands\(seq, navSeq\);\s*\}\s*if \(!stands\)\s*\{\s*return;\s*\}\s*try\s*\{\s*host\.onSpareClaimAbandoned\(navKey\);/.test(sweepB)
        && /string\? navKey = op\.navKey;\s*SpixiContentPage host = op\.host;/.test(sweepB)
        && /staging\.popPageAsync\(\);\s*\}\s*SpixiContentPage\.cancelTakenWarmingSpare\("close"\);\s*\}$/.test(body(hp, 'private void closeChatOverlays()'))
        && /spareChatOp = null;\s*\}\s*cancelTakenWarmingSpare\(why\);\s*if \(op == null\)/.test(body(scp, 'public static void dropSpareChat(string why)'))
        && count(scp + hp, /cancelTakenWarmingSpare\(/g) === 3,
      homeColdTap: /const string prefix = "chat:";\s*if \(!navKey\.StartsWith\(prefix, StringComparison\.Ordinal\)\)\s*\{\s*return;\s*\}\s*onChat\(new Address\(navKey\.Substring\(prefix\.Length\)\), null\);/.test(homeAb)
        && /string navKey = "chat:" \+ friend\.walletAddress;/.test(hp),
    };
    ok(Object.values(r3).every(Boolean),
      '★ S4 lever 5: the spare\'s own `ixian:onload` (webViewNavigating, after SingleChatPage.onNavigating marked it booted) takes the parked attach and POSTS it; an abandoned claim clears activePreload SYNCHRONOUSLY under the lock before cancelPreload (pushSpareChat\'s attach-throws rule: the cold push must not dedupe against a dead op on the same navKey) and gives the tap back only when it was still ours AND takenClaimRetries(why); HomePage.closeChatOverlays (tab switch · cleardetail · tx detail) also drops a spare taken WARMING — it is friendless until its onload, so the #902 `friend != null` staging drop cannot see it (abandoned first, so a posted attach returns; activePreload cleared synchronously, A-N2) with `close` = no re-run, and so does every dropSpareChat with its own word (theme · language · reload · devmode · lowmem re-run the tap cold; sleep · host · stop do not, A-N3) — HomePage re-runs onChat from its own "chat:<address>" key (empty slot → `spare=0 why=none` → today\'s cold path) — ' + JSON.stringify(r3));

    /* #46 r2 R2-N5: the posted cold re-run stands only while no NEWER navigation happened — the sequence it read under the
       cancel's lock is still navSeq when the post runs. Every navigation that takes the staging slot bumps it under the
       same lock (a pushPageLoaded that is not the warm park · a pushModalLoaded · a spare take), and so does a cancel
       that does not re-run (a leave). SOURCE pins (MAUI-only); the rule itself is csh-executed (coldRerunStands). */
    const r4 = {
      field: /private static long navSeq = 0;/.test(scp) && count(scp, /navSeq\+\+;/g) === 5,
      readUnderLock: /op\.abandoned = true;\s*activePreload = null;[^\n]*\s*seq = navSeq;\s*\}/.test(sweepB),
      take: /activePreload = op;[^\n]*\s*navSeq\+\+;/.test(scp),
      page: /preloadPending = true;\s*if \(!parkOnLoad\)\s*\{\s*navSeq\+\+;/.test(scp),
      modal: /preloadPending = true;\s*navSeq\+\+;\s*lockPreloadPending = target is LockPage;/.test(scp),
      /* #46 r3 R3-N1: the BUSY fallback (a plain modal push — the lock while the slot is taken) bumps it too */
      modalBusy: /if \(preloadPending \|\| activePreload != null\)\s*\{\s*navSeq\+\+;\s*presentPlainModal\(target\);\s*return;\s*\}\s*preloadPending = true;\s*navSeq\+\+;/.test(scp),
      rule: /internal static bool coldRerunStands\(long seqAtCancel, long seqNow\)\s*\{\s*return seqAtCancel == seqNow;\s*\}/.test(rules),
    };
    ok(Object.values(r4).every(Boolean),
      '★ S4 lever 5 (#46 r2 R2-N5): the POSTED cold re-run of a cancelled warming claim cannot supersede a newer tap — it stands only when navSeq (read under preloadLock at the cancel) is unchanged when the post runs; a spare take, a pushPageLoaded (not the warm park), a pushModalLoaded (its busy plain-modal fallback too — #46 r3 R3-N1) and a non-retrying cancel (close · host · stop · sleep — even with no op) bump it under the same lock (SOURCE pins: MAUI-only; coldRerunStands csh-executed) — ' + JSON.stringify(r4));
  }

  /* ══ Lever 5 · #46 r1 C-cs2: the claim's [P1] lines carry fixed words + an integer only ══ */
  {
    const push = body(scp, 'public string? pushSpareChat(Action<SingleChatPage> attach, int column, string navKey, int timeoutMs = 4000)');
    const blocks = [push, body(scp, 'private void attachSpareOnBoot(PreloadOp op, Action<SingleChatPage> attach, int timeoutMs)'),
      body(scp, 'private void abandonSpareClaim(PreloadOp op, string why)'), body(scp, 'public static void cancelTakenWarmingSpare(string why)')];
    const ALLOWED = ['OpenPerfRules.p1ClaimWait(P1Perf.msSince(t0))', 'OpenPerfRules.p1ClaimAbandon(why)'];
    /* every P1Perf.line( argument in the lever-5 bodies, paren-matched (string literals masked) */
    const args = [];
    for (const b of blocks) {
      const m = mask(b);
      for (let i = m.indexOf('P1Perf.line('); i >= 0; i = m.indexOf('P1Perf.line(', i + 1)) {
        let d = 0, k = i + 'P1Perf.line'.length;
        for (; k < m.length; k++) { if (m[k] === '(') d++; else if (m[k] === ')' && --d === 0) break; }
        args.push(b.slice(i + 'P1Perf.line('.length, k));
      }
    }
    const bad = args.filter((a) => !ALLOWED.includes(a.trim()));
    /* the `why` reaching p1ClaimAbandon is a fixed word at every call site: a literal [a-z]+, a SPARE_WHY_* const, or the
       caller's own `why` parameter (dropSpareChat → cancelTakenWarmingSpare; pushSpareChat → dropSpareChat(SPARE_WHY_*)) */
    const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) =>
      e.name === 'obj' || e.name === 'bin' ? [] : e.isDirectory() ? walk(d + '/' + e.name) : (e.name.endsWith('.cs') ? [d + '/' + e.name] : []));
    const all = walk('Spixi').map((f) => stripCode(rd(f))).join('\n');
    const calls = [...all.matchAll(/(?:dropSpareChat|cancelTakenWarmingSpare)\(([^)]*)\)|abandonSpareClaim\(op, ([^)]*)\)/g)]
      .map((m) => (m[1] !== undefined ? m[1] : m[2]).trim())
      .filter((a) => a !== 'string why' && a !== 'PreloadOp op, string why');   // the declarations
    const notWord = calls.filter((a) => !/^"[a-z]{1,12}"$/.test(a) && !/^SPARE_WHY_[A-Z]+$/.test(a) && a !== 'why');
    const consts = [...scp.matchAll(/public const string SPARE_WHY_[A-Z]+ = "([^"]*)";/g)].map((m) => m[1]);
    const r = {
      onlyBuilders: args.length === 3 && bad.length === 0 && !/P1Perf\.line\("spare claim/.test(scp),
      wordsAtSites: calls.length >= 14 && notWord.length === 0,
      constsAreWords: consts.length === 7 && consts.every((w) => /^[a-z]{1,12}$/.test(w)),
      whyParamOnlyPassedThrough: /dropSpareChat\(why\);\s*return why;/.test(push) && /cancelTakenWarmingSpare\(why\);/.test(body(scp, 'public static void dropSpareChat(string why)')),
    };
    ok(Object.values(r).every(Boolean),
      '★ S4 lever 5 (#46 r1 C-cs2): every `[P1]` line the claim path writes (pushSpareChat · attachSpareOnBoot · abandonSpareClaim · cancelTakenWarmingSpare: ' + args.length + ') is built by OpenPerfRules.p1ClaimWait(int ms) / p1ClaimAbandon(why) — executed in scripts/csh: fixed words + an integer, a `why` that is not 1–12 lowercase letters reads `other` — and every one of the ' + calls.length + ' call sites hands `why` a fixed word (a [a-z] literal, a SPARE_WHY_* const, or its own `why` passed through), so no address, name or text can reach the log (bad args: ' + (bad.join(' | ') || 'none') + '; non-word sites: ' + (notWord.join(' | ') || 'none') + ') — ' + JSON.stringify(r));
  }

  /* ══ Lever 3: desktop re-warm — a spare warms BESIDE an open conversation on a wide desktop window ══ */
  {
    const warm = body(scp, 'public bool warmSpareChat(Func<SingleChatPage> make, int column)');
    const gate = warm.slice(0, warm.indexOf('SingleChatPage target;'));
    const iStaging = gate.indexOf('else if (preloadPending) refused = "staging";');
    const iBeside = gate.indexOf('else if (OpenPerfRules.warmBesideOpenChat(besideChatPlacement, activePreload != null && activePreload.target is SingleChatPage))');
    const iChat = gate.indexOf('refused = "chat";');
    const r = {
      placement: /bool besideChatPlacement = spareMayWarmBesideOpenChat\(column\);\s*lock \(preloadLock\)/.test(gate),
      order: iStaging > 0 && iBeside > iStaging && iChat > iBeside && /\)\)\s*\{\s*\}\s*else if \(overlayStack\.Exists\(o => o\.target is SingleChatPage\)/.test(gate.slice(iBeside)),
      otherRefusals: /spareChatOp != null\) refused = "exists";/.test(gate) && /modalOverlayOp != null\) refused = "lock";/.test(gate) && /refused = "host";/.test(gate),
      baseFalse: /protected virtual bool spareMayWarmBesideOpenChat\(int column\)\s*\{\s*return false;\s*\}/.test(scp),
      home: /protected override bool spareMayWarmBesideOpenChat\(int column\)\s*\{\s*return OpenPerfRules\.besideOpenChatPlacement\(isDesktopPlatform\(\), rightContent\.IsVisible, column\);\s*\}/.test(hp)
        && /private static bool isDesktopPlatform\(\)\s*\{\s*return DeviceInfo\.Platform == DevicePlatform\.WinUI \|\| DeviceInfo\.Platform == DevicePlatform\.MacCatalyst;\s*\}/.test(hp),
    };
    ok(Object.values(r).every(Boolean),
      '★ S4 lever 3 (#1132): warmSpareChat keeps every refusal (exists · lock · host · staging · chat · grid · content · race) and relaxes ONLY `chat`, ONLY through OpenPerfRules.warmBesideOpenChat (executed in scripts/csh: never beside a STAGING chat) with a placement the host answers — the base says no; HomePage says desktop (WinUI / Mac) + wide + the chat column (besideOpenChatPlacement, executed) — so narrow phones keep today\'s rule; the spare stays its own WebView, one at most (`exists`), used once — ' + JSON.stringify(r));

    const ovp = body(hp, 'public override void onOverlayPresented(SpixiContentPage overlay)');
    const delay = parseInt((hp.match(/private const int CHAT_SPARE_WARM_AFTER_PRESENT_MS = (\d+);/) || [])[1] || '0', 10);
    ok(/^public override void onOverlayPresented\(SpixiContentPage overlay\)\s*\{\s*if \(overlay is SingleChatPage && isDesktopPlatform\(\) && rightContent\.IsVisible\)\s*\{\s*scheduleChatSpareWarm\(CHAT_SPARE_WARM_AFTER_PRESENT_MS\);\s*\}/.test(ovp)
      && count(hp, /scheduleChatSpareWarm\(/g) === 4 && delay >= 600 && delay <= 1000,
      '★ S4 lever 3: trigger C — when a conversation PRESENTS on a wide desktop window, the next spare is scheduled through the SAME funnel (scheduleChatSpareWarm → CHAT_SPARE_ENABLED → warmChatSpareNow → warmSpareChat) after ' + delay + ' ms — no sooner than 600 (past the present\'s own 600 ms frame window) and no later than 1000 (#46 r1 C-cs1: the spare still has to boot, ~180 ms, before the NEXT switch, or the lever is lost while every pin stays green); scheduleChatSpareWarm has exactly its 3 triggers (A after a close · B after the first flush · C after a desktop present) + its declaration');
  }

  /* ══ the seams are EXECUTED: the csh harness compiles OpenPerfRules.cs and runs a test per rule ══ */
  {
    const proj = rd('scripts/csh/csh.csproj');
    const tests = existsSync(join(root, 'scripts/csh/OpenPerfRulesTests.cs')) ? stripCode(rd('scripts/csh/OpenPerfRulesTests.cs')) : '';
    const fns = [...rules.matchAll(/internal static \w+ (\w+)\(/g)].map((m) => m[1]);   // 13 since #46 r2 R2-N5 (coldRerunStands)
    const untested = fns.filter((f) => !new RegExp('OpenPerfRules\\.' + f + '\\(').test(tests));
    ok(/<Compile Include="\.\.\/\.\.\/Spixi\/Utils\/OpenPerfRules\.cs" \/>/.test(proj) && fns.length === 13 && untested.length === 0 && count(tests, /\[TestMethod\]/g) >= 14
      && !/using Microsoft\.Maui|using IXICore/.test(rules),
      '★ S4 (#1132): scripts/csh compiles the REAL Spixi/Utils/OpenPerfRules.cs (no MAUI, no Core) and OpenPerfRulesTests.cs calls every one of its ' + fns.length + ' rules (' + fns.join(' · ') + '; untested: ' + (untested.join(', ') || 'none') + ') — run `node scripts/run-csh.mjs`');
  }

  /* ══ #1147 (6) close probe (dev-only [P1], SOURCE pin — closeOverlay is MAUI-bound; the grammar is executed in scripts/csh:
     close_probe_lines_pass_the_grammar). Walk #1146: Android chat close 159 / 435 ms with a 16 ms wait — where is the time? ══ */
  {
    const step = body(scp, 'private static void p1CloseStep(string kind, string step, long t0)');
    const co = body(scp, 'private static void closeOverlay(PreloadOp op, bool slideOut = false)');
    const iWait = co.indexOf('await Task.Delay(OpenPerfRules.closeHideWaitMs(');
    const iPosted = co.indexOf('p1CloseStep(p1Kind, "posted", p1T0);');
    const iRemove = co.indexOf('op.hostGrid.Children.Remove(op.stage);');
    const iRemoved = co.indexOf('p1CloseStep(p1Kind, "removed", p1T0);');
    const iDone = co.indexOf('p1CloseDone(p1Kind, p1T0);', iRemove);
    const tests = stripCode(rd('scripts/csh/OpenPerfRulesTests.cs'));
    const r = {
      /* fixed words + an integer only, nothing when the dev set is off */
      line: /^private static void p1CloseStep\(string kind, string step, long t0\)\s*\{\s*if \(!P1Perf\.enabled\)\s*\{\s*return;\s*\}\s*P1Perf\.line\("close " \+ kind \+ " " \+ step \+ " ms=" \+ P1Perf\.msSince\(t0\)\);\s*\}$/.test(step),
      /* every call passes a lower-case literal step and the closeOverlay t0 */
      literals: count(scp, /p1CloseStep\(/g) === 3 && count(scp, /p1CloseStep\(p1Kind, "(posted|removed)", p1T0\);/g) === 2,
      /* posted = right after the posted hide wait; removed = right after the Remove; both before done, from the SAME t0 */
      order: iWait > 0 && iWait < iPosted && iPosted < iRemove && iRemove < iRemoved && iRemoved < iDone,
      adjacent: /DevicePlatform\.Android\)\);\s*p1CloseStep\(p1Kind, "posted", p1T0\);\s*op\.hostGrid\.Children\.Remove\(op\.stage\);\s*p1CloseStep\(p1Kind, "removed", p1T0\);\s*p1CloseDone\(p1Kind, p1T0\);/.test(co),
      t0: /^private static void closeOverlay\(PreloadOp op, bool slideOut = false\)\s*\{\s*long p1T0 = P1Perf\.now\(\);/.test(co),
      grammar: /public void close_probe_lines_pass_the_grammar\(\)/.test(tests),
    };
    ok(Object.values(r).every(Boolean),
      '★ #1147 (6) close probe (dev-only [P1], retired with the set by the P1 grep): closeOverlay stamps `[P1] close <page> posted ms=` right after the posted hide wait and `[P1] close <page> removed ms=` right after the Remove, from the SAME t0 as `done` — fixed words + an integer (grammar executed in scripts/csh) — ' + JSON.stringify(r));
  }
}
